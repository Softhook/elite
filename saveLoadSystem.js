// ****** saveLoadSystem.js ******
// Save/Load functionality extracted from sketch.js.
// Handles save data building, validation, atomic storage, and full game state restoration.
// Depends on globals: player, galaxy, gameStateManager, uiManager, soundManager,
//   ambientSoundManager, eventManager, surfaceMode, GameGlobals, globalSessionSeed,
//   saveSelectionScreen, SAVE_KEY_PREFIX, LAST_ACTIVE_SLOT_KEY, SAVE_LOG,
//   showCriticalError, dist, constrain, createVector, randomSeed, noiseSeed

// --- Save/Load Functionality ---

/** Debounce timer for save operations */
let __saveDebounceTimer = null;

/**
 * Validates save payload structure and data integrity
 * @param {Object} payload - The save data payload to validate
 * @returns {{ok: boolean, reason?: string}} Validation result
 */
function __validatePayload(payload) {
    try {
        if (!payload) return { ok: false, reason: 'missing payload' };
        if (!payload.galaxyData) return { ok: false, reason: 'missing galaxyData' };
        if (payload.currentSystemIndex === undefined || payload.currentSystemIndex === null) return { ok: false, reason: 'missing currentSystemIndex' };
        if (!payload.playerData) return { ok: false, reason: 'missing playerData' };
        // Credits must be a finite number and non-negative
        const cr = payload.playerData.credits;
        if (typeof cr !== 'number' || !isFinite(cr) || cr < 0) return { ok: false, reason: 'invalid credits' };
        // Weapons array can be empty but should be defined if saved
        if (payload.playerData.weapons !== undefined && !Array.isArray(payload.playerData.weapons)) return { ok: false, reason: 'invalid weapons array' };
        return { ok: true };
    } catch (e) {
        return { ok: false, reason: 'exception during validation: ' + e?.message };
    }
}

function __buildSaveData() {
    // Build and soft-coerce critical fields to avoid aborting saves on transient state
    // Ensure planets have deterministic save-ready fields before serializing
    try {
        if (galaxy && Array.isArray(galaxy.systems)) {
            galaxy.systems.forEach(sys => {
                if (!sys || !Array.isArray(sys.planets)) return;
                sys.planets.forEach(pl => { try { if (pl && typeof pl.prepareForSave === 'function') pl.prepareForSave(); } catch (e) { /* ignore */ } });
            });
        }
    } catch (e) { /* ignore */ }

    const playerData = player.getSaveData();
    // Normalize credits
    if (!(typeof playerData.credits === 'number' && isFinite(playerData.credits) && playerData.credits >= 0)) {
        playerData.credits = 1000;
    } else {
        playerData.credits = Math.floor(playerData.credits);
    }

    // Capture a minimal docking snapshot so we can restore space-object/station dock state on load
    const dockingState = (() => {
        if (!gameStateManager) return { state: "IN_FLIGHT" };
        const state = gameStateManager.currentState || "IN_FLIGHT";

        // Persist docked space object id when in a space-object docked/menu state
        const isSpaceObjectState = state === "DOCKED_SPACE_OBJECT"
            || state === "VIEWING_SPACE_OBJECT_MARKET"
            || state === "VIEWING_SPACE_OBJECT_REPAIRS"
            || state === "VIEWING_SPACE_OBJECT_SHIPYARD"
            || state === "VIEWING_SPACE_OBJECT_UPGRADES";
        if (isSpaceObjectState && gameStateManager.currentDockedSpaceObject?.id) {
            return {
                state: "DOCKED_SPACE_OBJECT",
                spaceObjectId: gameStateManager.currentDockedSpaceObject.id
            };
        }

        // Persist station docking so we don't drop the player out of menus after reloads
        // Check if docked at a SECRET station (not the main one)
        if (state === "DOCKED") {
            const dockedStation = gameStateManager.currentDockedStation;
            const mainStation = player?.currentSystem?.station;
            const secretStations = player?.currentSystem?.secretStations || [];

            // Check if docked at a secret station
            const secretIndex = secretStations.findIndex(s => s === dockedStation);
            if (secretIndex >= 0 && dockedStation) {
                return {
                    state: "DOCKED",
                    isSecretStation: true,
                    secretStationIndex: secretIndex,
                    stationName: dockedStation.name || null
                };
            }

            // Docked at main station
            if (mainStation) {
                return {
                    state: "DOCKED",
                    isSecretStation: false,
                    stationName: mainStation.name || null
                };
            }
        }

        return { state: "IN_FLIGHT" };
    })();

    // Capture surface/save-at-base metadata when appropriate so loads resume on-planet
    const savedSurface = (() => {
        try {
            if (!gameStateManager) return null;
            const st = gameStateManager.currentState;
            // Check if we are logically on the surface (state is surface mode OR landed flag is true)
            // This is safer than relying only on the state string
            const isSurface = (st === 'SURFACE_MODE' || st === 'VIEWING_BASE') || (surfaceMode && surfaceMode.isLanded);
            if (!isSurface) return null;
            if (!surfaceMode || !surfaceMode.planet) return null;

            const planet = surfaceMode.planet;
            let planetIndex = -1;
            try {
                planetIndex = (player && player.currentSystem && Array.isArray(player.currentSystem.planets))
                    ? player.currentSystem.planets.indexOf(planet)
                    : -1;
            } catch (e) { planetIndex = -1; }

            const baseObj = (typeof uiManager !== 'undefined' && uiManager && uiManager.currentBaseObject) ? uiManager.currentBaseObject : null;

            return {
                state: st,
                planetIndex: planetIndex >= 0 ? planetIndex : null,
                baseId: baseObj ? (baseObj.id || null) : null,
                basePos: baseObj && baseObj.pos ? { x: baseObj.pos.x, y: baseObj.pos.y } : null,
                controlMode: surfaceMode.controlMode || 'SHIP',
                playerPos: player && player.pos ? { x: player.pos.x, y: player.pos.y } : null,
                astronautPos: (surfaceMode.astronaut && surfaceMode.astronaut.pos) ? { x: surfaceMode.astronaut.pos.x, y: surfaceMode.astronaut.pos.y } : null
            };
        } catch (e) {
            return null;
        }
    })();

    return {
        playerData,
        galaxyData: galaxy.getSaveData(),
        currentSystemIndex: galaxy.currentSystemIndex,
        globalSessionSeed: typeof globalSessionSeed !== 'undefined' ? globalSessionSeed : null,
        savedAt: Date.now(),
        version: 2,
        dockingState,
        savedSurface,
        newsManager: GameGlobals.newsManager ? GameGlobals.newsManager.toJSON() : null,
        eventManager: GameGlobals.eventManager ? GameGlobals.eventManager.toJSON() : null
    };
}

function __atomicStoreToSlot(slotIndex) {
    const saveKey = SAVE_KEY_PREFIX + slotIndex;
    const backupKey = saveKey + '_bak';

    const saveData = __buildSaveData();

    // Validate before saving
    const validation = __validatePayload(saveData);
    if (!validation.ok) {
        console.error('Save validation failed:', validation.reason);
        return false;
    }

    const dataString = JSON.stringify(saveData);

    // Backup the current save if it exists
    try {
        const previous = localStorage.getItem(saveKey);
        if (previous) {
            localStorage.setItem(backupKey, previous);
        }
    } catch (e) {
        console.warn('Failed to create backup for save key', saveKey, e);
    }

    // Write the new save
    try {
        localStorage.setItem(saveKey, dataString);
        return true;
    } catch (e) {
        console.error('Failed to write save:', e);
        return false;
    }
}

function saveGame() {
    try {
        // Prevent saves during GAME_OVER state
        if (gameStateManager && gameStateManager.currentState === "GAME_OVER") {
            console.warn("Save blocked: Cannot save during GAME_OVER state");
            return;
        }

        // Prevent saves if player is dead or dying
        if (player && (player.destroyed || player.isDying || player.hull <= 0)) {
            console.warn("Save blocked: Player is dead or dying");
            return;
        }

        if (typeof (Storage) === "undefined") {
            console.warn("localStorage is not supported. Game cannot be saved.");
            return;
        }

        // Clear any pending save and schedule a new one
        if (__saveDebounceTimer) {
            clearTimeout(__saveDebounceTimer);
        }

        __saveDebounceTimer = setTimeout(() => {
            __saveDebounceTimer = null;

            const currentSlotIndex = (window.activeSaveSlotIndex !== undefined ? window.activeSaveSlotIndex : 0);
            const ok = __atomicStoreToSlot(currentSlotIndex);

            if (!ok) {
                console.error('Save aborted: validation failed. Your last known-good backup was preserved.');
                return;
            }

            localStorage.setItem(LAST_ACTIVE_SLOT_KEY, String(currentSlotIndex));
            SAVE_LOG(`Game saved to slot ${currentSlotIndex + 1} (Key: ${SAVE_KEY_PREFIX + currentSlotIndex})`);

            // Refresh previews after a successful write
            if (typeof saveSelectionScreen !== 'undefined' && saveSelectionScreen && typeof saveSelectionScreen.loadAllSavePreviews === 'function') {
                saveSelectionScreen.loadAllSavePreviews();
            } else if (window.saveScreen && typeof window.saveScreen.loadAllSavePreviews === 'function') {
                window.saveScreen.loadAllSavePreviews();
            }
        }, 300); // Small debounce to batch rapid saves

    } catch (e) {
        console.error("Error scheduling save:", e);
    }
}

function loadGame(slotIndex) {
    if (typeof (Storage) !== "undefined") {
        if (slotIndex === undefined || slotIndex === null) {
            console.error("loadGame: slotIndex is undefined. Cannot load.");
            return false;
        }
        const loadKey = SAVE_KEY_PREFIX + slotIndex;

        const tryLoadFromKey = (key) => {
            const str = localStorage.getItem(key);
            if (!str) return { ok: false, reason: 'no data' };
            try {
                const obj = JSON.parse(str);
                // Validate schema
                const schema = __validatePayload(obj);
                if (!schema.ok) {
                    return { ok: false, reason: schema.reason };
                }
                return { ok: true, data: obj };
            } catch (e) {
                return { ok: false, reason: e?.message || 'parse error' };
            }
        };

        const savedDataString = localStorage.getItem(loadKey);
        const backupDataString = localStorage.getItem(loadKey + '_bak');

        if (savedDataString || backupDataString) {
            try {
                let savedData = null;
                // Prefer validated main; if invalid, try backup
                const primary = tryLoadFromKey(loadKey);
                if (!primary.ok) {
                    console.warn(`Primary save validation failed (${primary.reason}). Attempting backup...`);
                    const backup = tryLoadFromKey(loadKey + '_bak');
                    if (!backup.ok) {
                        console.error(`Backup save also invalid: ${backup.reason}`);
                        showCriticalError("Corrupt save: Both primary and backup invalid.");
                        return false;
                    }
                    // Promote backup to primary since primary is corrupt or missing
                    console.log('Promoting backup to primary save slot');
                    try {
                        const bakStr = localStorage.getItem(loadKey + '_bak');
                        if (bakStr) localStorage.setItem(loadKey, bakStr);
                    } catch (e) { /* ignore */ }
                    savedData = backup.data;
                } else {
                    savedData = primary.data;
                }

                // Clean up any existing ambient layers before rebuilding from save data
                if (ambientSoundManager && typeof ambientSoundManager.cleanup === 'function') {
                    ambientSoundManager.cleanup();
                }

                // 1. Restore Global Seed (Critical for correct procedural generation)
                if (savedData.globalSessionSeed !== undefined && savedData.globalSessionSeed !== null) {
                    globalSessionSeed = savedData.globalSessionSeed;
                } else {
                    // Fallback to avoid complete breakage, though positions will likely shift
                    if (typeof globalSessionSeed === 'undefined' || globalSessionSeed === null) {
                        globalSessionSeed = Math.floor(Math.random() * 999999);
                    }
                }

                // 2. Load Galaxy Data First
                if (savedData.galaxyData) {
                    galaxy.loadSaveData(savedData.galaxyData, globalSessionSeed);
                } else {
                    console.error(`No galaxyData found in save file for slot ${slotIndex} (Key: ${loadKey})`);
                    showCriticalError("Corrupt save: Missing galaxy data.");
                    return false;
                }

                // 3. Restore Current System Index
                if (savedData.currentSystemIndex !== undefined) {
                    // Validate index against loaded systems
                    if (galaxy.systems && galaxy.systems.length > 0 &&
                        (savedData.currentSystemIndex < 0 || savedData.currentSystemIndex >= galaxy.systems.length)) {
                        console.error(`Invalid currentSystemIndex (${savedData.currentSystemIndex}) for loaded systems count (${galaxy.systems.length}) in slot ${slotIndex}.`);
                        showCriticalError("Corrupt save: Invalid system index.");
                        return false;
                    }
                    galaxy.currentSystemIndex = savedData.currentSystemIndex;
                } else {
                    if (galaxy.systems && galaxy.systems.length > 0) {
                        console.error(`No currentSystemIndex found in save file for slot ${slotIndex}, but galaxy systems are present!`);
                        showCriticalError("Corrupt save: Missing system index.");
                        return false;
                    }
                }

                // 4. Check if galaxy systems are populated BEFORE loading player
                if (!galaxy.systems || galaxy.systems.length === 0) {
                    showCriticalError("Galaxy systems array is empty AFTER attempting to load galaxy data!");
                    console.error(`Galaxy systems array is empty AFTER attempting to load galaxy data from slot ${slotIndex}.`);
                    return false;
                }

                // 5. Restore Player Data
                if (savedData.playerData) {
                    player.loadSaveData(savedData.playerData);
                } else {
                    console.error(`No playerData found in save file for slot ${slotIndex}.`);
                    showCriticalError("Corrupt save: Missing player data.");
                    return false;
                }

                // 6. Link Player to the (now loaded) Current System
                player.currentSystem = galaxy.getCurrentSystem();

                // 7. Extract docking state early for use in bodyguard spawning and state restoration
                const dockingState = savedData.dockingState;

                if (player.currentSystem) {
                    player.currentSystem.player = player;

                    // Fix for initial station positioning
                    if (player.currentSystem.station && player.currentSystem.station.pos) {
                        const distToStation = dist(player.pos.x, player.pos.y,
                            player.currentSystem.station.pos.x,
                            player.currentSystem.station.pos.y);

                        if (distToStation > 10000 || isNaN(player.pos.x) || isNaN(player.pos.y)) {
                            console.warn("Player position appears invalid or too far from station. Repositioning near station.");
                            player.pos.set(player.currentSystem.station.pos.x + player.currentSystem.station.size + 100,
                                player.currentSystem.station.pos.y);
                            player.vel.set(0, 0);
                        }
                    }

                    if (eventManager) {
                        eventManager.initializeReferences(player.currentSystem, player, uiManager);
                    }

                    // Pre-warm starfield tiles around player position on load
                    if (player.pos && typeof player.currentSystem.prewarmStarfieldTiles === 'function') {
                        player.currentSystem.prewarmStarfieldTiles(player.pos.x, player.pos.y);
                    }

                    // Respawn bodyguards ONLY if loading into IN_FLIGHT state
                    const willRestoreToDocked = dockingState && (
                        dockingState.state === "DOCKED" ||
                        dockingState.state === "DOCKED_SPACE_OBJECT"
                    );

                    if (!willRestoreToDocked && player.activeBodyguards && player.activeBodyguards.length > 0) {
                        console.log(`Respawning ${player.activeBodyguards.length} bodyguards after load (in-flight state)...`);
                        player.spawnBodyguards(player.currentSystem);
                    }
                } else {
                    showCriticalError("CRITICAL: Failed to link player to a valid currentSystem after load!");
                    console.error(`CRITICAL: Failed to link player to a valid currentSystem after load! Index: ${galaxy.currentSystemIndex}, Systems count: ${galaxy.systems ? galaxy.systems.length : 'N/A'}, Slot: ${slotIndex}`);
                    return false;
                }

                // 8. Restore docking state (stations and space objects) if present
                let restoredDockState = false;
                if (gameStateManager && dockingState && player.currentSystem) {
                    // Attempt to restore space-object docking first
                    if (dockingState.state === "DOCKED_SPACE_OBJECT" && dockingState.spaceObjectId) {
                        const so = player.currentSystem.spaceObjects?.find(o => o && !o.destroyed && o.id === dockingState.spaceObjectId);
                        if (so) {
                            gameStateManager.currentDockedSpaceObject = so;
                            gameStateManager.currentDockedStation = null;
                            if (player.vel?.set) player.vel.set(0, 0); else if (player.vel) { player.vel.x = 0; player.vel.y = 0; }
                            player.isDockedAndInvulnerable = true;
                            gameStateManager.setState("DOCKED_SPACE_OBJECT");
                            restoredDockState = true;
                        }
                    }

                    // Restore station docking if applicable and space-object restoration did not run
                    if (!restoredDockState && dockingState.state === "DOCKED") {
                        gameStateManager.currentDockedSpaceObject = null;

                        // Check if we were docked at a secret station
                        let dockedStation = null;
                        if (dockingState.isSecretStation && dockingState.secretStationIndex !== undefined) {
                            const secretStations = player.currentSystem.secretStations || [];
                            if (secretStations[dockingState.secretStationIndex]) {
                                dockedStation = secretStations[dockingState.secretStationIndex];
                                console.log("Restoring dock at SECRET station:", dockedStation.name);
                            }
                        }

                        // Fall back to main station if secret station not found
                        if (!dockedStation && player.currentSystem.station) {
                            dockedStation = player.currentSystem.station;
                            console.log("Restoring dock at MAIN station:", dockedStation.name);
                        }

                        if (dockedStation) {
                            gameStateManager.currentDockedStation = dockedStation;
                            if (dockedStation.pos) {
                                player.pos.set(dockedStation.pos.x, dockedStation.pos.y);
                            }
                            if (player.vel?.set) player.vel.set(0, 0); else if (player.vel) { player.vel.x = 0; player.vel.y = 0; }
                            player.isDockedAndInvulnerable = true;
                            gameStateManager.setState("DOCKED");
                            restoredDockState = true;
                        }
                    }
                }

                // 9. Restore surface mode if saved
                let restoredSurface = false;
                try {
                    const savedSurface = savedData.savedSurface;

                    if (savedSurface && player.currentSystem && Array.isArray(player.currentSystem.planets) && savedSurface.planetIndex !== null && savedSurface.planetIndex !== undefined) {
                        const planet = player.currentSystem.planets[savedSurface.planetIndex];
                        if (planet) {
                            if (savedSurface.playerPos && player && player.pos) {
                                try { player.pos.set(savedSurface.playerPos.x, savedSurface.playerPos.y); } catch (e) { /* ignore */ }
                            }

                            if (surfaceMode) {
                                try {
                                    // Ensure deterministic terrain/object generation by seeding
                                    try {
                                        const seedFromFeature = (typeof planet.featureRand === 'number') ? Math.floor(planet.featureRand * 1000000) : null;
                                        const useSeed = (seedFromFeature !== null) ? seedFromFeature : (typeof planet.seed === 'number' ? planet.seed : Math.floor(Math.random() * 1000000));
                                        if (typeof randomSeed === 'function') {
                                            try { randomSeed(useSeed); } catch (e) { /* ignore */ }
                                        }
                                        if (typeof noiseSeed === 'function') {
                                            try { noiseSeed(useSeed); } catch (e) { /* ignore */ }
                                        }
                                    } catch (e) { /* ignore seeding failures */ }

                                    surfaceMode.enter(player, planet, player.currentSystem, { force: true });

                                    // Place ship low to the surface so restores allow boarding.
                                    try {
                                        const groundH = (typeof surfaceMode._getTerrainHeightAt === 'function') ? surfaceMode._getTerrainHeightAt(player.pos.x, player.pos.y) : null;
                                        if (groundH !== null && typeof SURFACE_CONFIG !== 'undefined') {
                                            surfaceMode.altitude = groundH + (SURFACE_CONFIG.MIN_ALTITUDE || 10);
                                            surfaceMode.player.altitude = surfaceMode.altitude;
                                            surfaceMode.isLanded = true;
                                        }
                                    } catch (e) { /* ignore altitude restore failures */ }

                                    // Restore control mode (ASTRONAUT vs SHIP)
                                    if (savedSurface.controlMode === 'ASTRONAUT') {
                                        if (savedSurface.astronautPos && typeof Astronaut !== 'undefined') {
                                            surfaceMode.astronaut = new Astronaut(createVector(savedSurface.astronautPos.x, savedSurface.astronautPos.y), { skipSpawnOffset: true });
                                            try { surfaceMode.astronaut.altitude = surfaceMode._getTerrainHeightAt(surfaceMode.astronaut.pos.x, surfaceMode.astronaut.pos.y); } catch (e) { /* ignore */ }
                                            surfaceMode.controlMode = 'ASTRONAUT';

                                            if (typeof SURFACE_CONFIG !== 'undefined' && SURFACE_CONFIG.EVA_ZOOM) {
                                                surfaceMode.viewZoom = SURFACE_CONFIG.EVA_ZOOM;
                                                surfaceMode.targetViewZoom = SURFACE_CONFIG.EVA_ZOOM;
                                            }
                                        } else {
                                            surfaceMode.controlMode = 'SHIP';
                                            console.warn('Saved surface state requested ASTRONAUT control but astronautPos is missing. Defaulting to SHIP control.');
                                        }
                                    } else {
                                        surfaceMode.controlMode = 'SHIP';
                                    }

                                    // Attempt to re-link current base object for UI
                                    if (typeof uiManager !== 'undefined' && uiManager && (savedSurface.baseId || savedSurface.basePos)) {
                                        // First try to find it in surfaceObjects (just in case they are already populated)
                                        for (const obj of surfaceMode.surfaceObjects || []) {
                                            if (!obj) continue;
                                            if (savedSurface.baseId && obj.id && obj.id === savedSurface.baseId) {
                                                uiManager.currentBaseObject = obj; break;
                                            }
                                            if (savedSurface.basePos && obj.pos && Math.abs((obj.pos.x || 0) - savedSurface.basePos.x) < 2 && Math.abs((obj.pos.y || 0) - savedSurface.basePos.y) < 2) {
                                                uiManager.currentBaseObject = obj; break;
                                            }
                                        }

                                        // If not found in surfaceObjects, search planet.playerBuiltSurfaceObjects (which is fully loaded)
                                        if (!uiManager.currentBaseObject && planet && Array.isArray(planet.playerBuiltSurfaceObjects)) {
                                            for (const desc of planet.playerBuiltSurfaceObjects) {
                                                if (!desc) continue;
                                                if (savedSurface.basePos && Math.abs((desc.x || 0) - savedSurface.basePos.x) < 2 && Math.abs((desc.y || 0) - savedSurface.basePos.y) < 2) {
                                                    // Reconstruct a temporary base object with position vector so uiManager can use it
                                                    uiManager.currentBaseObject = {
                                                        ...desc,
                                                        pos: createVector(desc.x, desc.y)
                                                    };
                                                    break;
                                                }
                                            }
                                        }
                                    }

                                    // If base object found, open VIEWING_BASE
                                    if (uiManager && uiManager.currentBaseObject) {
                                        if (gameStateManager) {
                                            gameStateManager._returnFromBaseState = 'SURFACE_MODE';
                                            try { gameStateManager.setState('VIEWING_BASE'); } catch (e) { /* ignore */ }
                                        }
                                    }

                                    restoredSurface = true;
                                } catch (e) {
                                    console.warn('Failed to enter surface mode during load:', e);
                                }
                            }
                        }
                    }
                } catch (e) {
                    console.warn('Error while attempting to restore saved surface state:', e);
                }

                if (gameStateManager && !restoredDockState && !restoredSurface) {
                    gameStateManager.currentDockedSpaceObject = null;
                    gameStateManager.currentDockedStation = null;
                    player.isDockedAndInvulnerable = false;
                    gameStateManager.setState("IN_FLIGHT");
                }

                // 10. Restore News and Event Persistence
                if (savedData.newsManager && GameGlobals.newsManager) {
                    GameGlobals.newsManager.fromJSON(savedData.newsManager);
                }

                if (savedData.eventManager && GameGlobals.eventManager) {
                    GameGlobals.eventManager.fromJSON(savedData.eventManager);
                }

                // 11. Ensure economy types are synchronized after loading
                if (galaxy.systems) {
                    galaxy.systems.forEach(system => {
                        if (system && system.economyType) {
                            system.setEconomyType(system.economyType);
                        }
                    });
                }

                // 12. Restore current view and other relevant states
                if (savedData.currentView) {
                    Object.assign(uiManager.currentView, savedData.currentView);
                }

                // 13. Clear any locked jump destination to prevent stale jump targets
                if (uiManager) {
                    uiManager.lockedDestinationIndex = -1;
                }

                // Start a fade-in from black for all immediate successful loads to prevent visual flashes
                if (gameStateManager && gameStateManager.currentState !== "LOADING") {
                    gameStateManager.postLoadFadeState = "FADE_IN";
                    gameStateManager.postLoadFadeOpacity = 1;
                    gameStateManager.postLoadFadeJustStarted = true;
                }

                // Reset camera system to snap immediately on the next update
                if (typeof cameraSystem !== 'undefined') {
                    cameraSystem.reset();
                }

                window.activeSaveSlotIndex = (slotIndex !== undefined ? slotIndex : 0);
                localStorage.setItem(LAST_ACTIVE_SLOT_KEY, slotIndex.toString());
                // Mark the time of a successful load so we can suppress unintended immediate auto-saves
                try { if (typeof window !== 'undefined') { window.__lastLoadTime = Date.now(); } } catch (_) { }
                SAVE_LOG(`Game loaded successfully from slot ${slotIndex + 1} (Key: ${loadKey})`);
                return true;
            } catch (e) {
                console.error(`Error loading game from slot ${slotIndex + 1} (Key: ${loadKey}):`, e);
                localStorage.removeItem(loadKey); // Clear corrupted data
                return false;
            }
        } else {
            // Neither primary nor backup keys exist
            SAVE_LOG(`No saved game found in slot ${slotIndex + 1} (Key: ${loadKey})`);
            return false;
        }
    } else {
        console.warn("localStorage is not supported. Cannot load game.");
        return false;
    }
}
