// ****** inputHandlers.js ******
// Keyboard and mouse input handlers extracted from sketch.js.
// Depends on globals: gameStateManager, player, galaxy, uiManager, soundManager,
//   surfaceMode, inputManager, titleScreen, saveSelectionScreen, inventoryScreen,
//   missionOverlay, communicationSystem, GameGlobals, isShipControlState,
//   getActiveInputContext, executeInputAction, INPUT_ACTIONS, INPUT_CONTEXTS,
//   showCriticalError, resetGame, Cargo, p5

// --- Input Handling Functions ---

/**
 * Main keyboard input handler
 */
function keyPressed() {
    // Handle surface mode keys first when in surface mode
    if (handleSurfaceModeKeys()) return false;

    const context = getActiveInputContext();
    const mappedAction = inputManager?.getKeyboardAction(key, keyCode, context);
    if (mappedAction) {
        if (mappedAction === INPUT_ACTIONS.NAV_UP || mappedAction === INPUT_ACTIONS.NAV_DOWN) {
            if (context === INPUT_CONTEXTS.SAVE_SELECTION) {
                saveSelectionScreen?.handleKeyPressed(null, mappedAction === INPUT_ACTIONS.NAV_UP ? UP_ARROW : DOWN_ARROW);
                return false;
            }
            if (context === INPUT_CONTEXTS.GALAXY_MAP) {
                _handleGalaxyMapHopping(0, mappedAction === INPUT_ACTIONS.NAV_UP ? -1 : 1);
                return false;
            }
            if (handleMissionNavigation()) return false;
        }

        if (mappedAction === INPUT_ACTIONS.NAV_LEFT || mappedAction === INPUT_ACTIONS.NAV_RIGHT) {
            if (context === INPUT_CONTEXTS.GALAXY_MAP) {
                _handleGalaxyMapHopping(mappedAction === INPUT_ACTIONS.NAV_LEFT ? -1 : 1, 0);
                return false;
            }
            if (handleDetailScreenNavigation()) return false;
        }

        if (executeInputAction(mappedAction, context)) return false;
    }

    if (handleGameOverInput()) return false;
    if (handleInstructionsInput()) return false;
    if (handleSaveSelectionInput()) return false;
    if (handleSpacebarFiring()) return false;
    if (handleWeaponSwitching()) return false;
    if (handleSingleKeyActions()) return false;
    if (handleMissionNavigation()) return false;
    if (handleDetailScreenNavigation()) return false;
    if (handleGalaxyMapInput()) return false;
    if (handleEscapeKey()) return false;
}

/**
 * Handle surface mode control keys
 * @returns {boolean} True if handled
 */
function handleSurfaceModeKeys() {
    if (!gameStateManager || gameStateManager.currentState !== "SURFACE_MODE") return false;
    if (!surfaceMode) return false;

    return surfaceMode.handleKeyDown(keyCode, key);
}

/**
 * Handle GAME_OVER state input
 * @returns {boolean} True if handled
 */
function handleGameOverInput() {
    if (gameStateManager?.currentState !== "GAME_OVER") return false;

    if (player && (player.destroyed || player.isDying || player.hull <= 0)) {
        // Verify player is actually dead before allowing reset
        if (typeof resetGame === 'function') {
            resetGame();
        } else {
            console.error("resetGame function not found, falling back to reload");
            window.location.reload();
        }
        return false; // Indicate input was handled, prevent default behavior
    }

    // Toggle inventory with “I”
    if (key === 'i' || key === 'I') {
        return handleInventoryToggle();
    }
    return false;
}

/**
 * Handle instructions screen input
 * @returns {boolean} True if handled
 */
function handleInstructionsInput() {
    if (gameStateManager.currentState === "INSTRUCTIONS") {
        titleScreen?.handleKeyPress(keyCode);
        return true;
    }
    return false;
}

/**
 * Handle save selection screen input
 * @returns {boolean} True if handled
 */
function handleSaveSelectionInput() {
    if (gameStateManager.currentState === "SAVE_SELECTION") {
        saveSelectionScreen?.handleKeyPressed(key, keyCode);
        return true;
    }
    return false;
}

/**
 * Handle spacebar firing
 * @returns {boolean} True if handled
 */
function handleSpacebarFiring() {
    if ((key === ' ' || keyCode === 32) && isShipControlState() && player) {
        player.handleFireInput();
        return true;
    }
    return false;
}

/**
 * Handle weapon switching with number keys (1-9)
 * @returns {boolean} True if handled
 */
function handleWeaponSwitching() {
    if (!isShipControlState() || !player) return false;

    const numKey = parseInt(key);
    if (isNaN(numKey) || numKey < 1 || numKey > 9) return false;

    const weaponIndex = numKey - 1;
    if (Array.isArray(player.weapons) && weaponIndex < player.weapons.length) {
        if (player.switchToWeapon(weaponIndex)) {
            WEAPON_LOG(`Switched to weapon: ${player.currentWeapon.name}`);
            soundManager?.playSound('click');
        }
    }
    return true;
}

/**
 * Handle single-key action shortcuts
 * @returns {boolean} True if handled
 */
function handleSingleKeyActions() {
    const keyLower = key.toLowerCase();

    switch (keyLower) {
        case 'i':
            return handleInventoryToggle();
        case 'm':
            return handleMapToggle();
        case 'n':
            return handleMissionOverlayToggle();
        case 'b':
            return handleSecretBaseNavigation();
        case 'l':
            return handleWantedToggle();
        case 'h':
        case 'j':
            return handleAutopilot(keyLower);
        case '.':
            return handleMinimapZoomIn();
        case ',':
            return handleMinimapZoomOut();
        case 'c':
            return handleCloakActivation();
        case 'r':
            return player?.trySpeedBurst();
        case 'x':
            return handleSurfaceDescent();
    }
    return false;
}

/**
 * Handle Galaxy Map input (selection with Space/Enter)
 * @returns {boolean} True if handled
 */
function handleGalaxyMapInput() {
    if (gameStateManager.currentState !== "GALAXY_MAP") return false;
    const keyLower = key.toLowerCase();

    if (keyCode === ENTER || keyCode === 32) { // 32 is Space
        _handleGalaxyMapSelection();
        return true;
    }

    if (keyLower === 'm') {
        const targetIdx = uiManager.galaxyMap.gamepadSelectedIndex;
        if (targetIdx !== -1) {
            const systems = galaxy.getSystemDataForMap ? galaxy.getSystemDataForMap() : [];
            const sysData = systems[targetIdx];
            const isCurrent = (targetIdx === galaxy.currentSystemIndex);
            
            if (sysData && (sysData.visited || isCurrent)) {
                if (uiManager.marketOverlaySystemIndex === targetIdx) {
                    uiManager.marketOverlaySystemIndex = -1;
                    soundManager?.playSound('click_off');
                } else {
                    uiManager.marketOverlaySystemIndex = targetIdx;
                    soundManager?.playSound('click');
                }
            } else {
                uiManager.addMessage("Market data unavailable.", [255, 150, 150]);
                soundManager?.playSound('error');
            }
        }
        return true;
    }

    // Keyboard hopping
    let dx = 0, dy = 0;
    if (keyCode === UP_ARROW || keyLower === 'w') dy = -1;
    else if (keyCode === DOWN_ARROW || keyLower === 's') dy = 1;
    else if (keyCode === LEFT_ARROW || keyLower === 'a') dx = -1;
    else if (keyCode === RIGHT_ARROW || keyLower === 'd') dx = 1;

    if (dx !== 0 || dy !== 0) {
        _handleGalaxyMapHopping(dx, dy);
        return true;
    }

    return false;
}

/**
 * Common logic for hopping between systems on the galaxy map
 */
function _handleGalaxyMapHopping(dx, dy) {
    if (!uiManager?.galaxyMap || !galaxy?.systems) return;

    const currentIndex = uiManager.galaxyMap.gamepadSelectedIndex;
    const currentSys = galaxy.systems[currentIndex];

    if (currentSys && currentSys.connectedSystemIndices && currentSys.galaxyPos) {
        let bestMatch = -1;
        let bestScore = Infinity;

        for (const connIdx of currentSys.connectedSystemIndices) {
            const connSys = galaxy.systems[connIdx];
            if (!connSys || !connSys.galaxyPos) continue;

            const vx = connSys.galaxyPos.x - currentSys.galaxyPos.x;
            const vy = connSys.galaxyPos.y - currentSys.galaxyPos.y;

            // Dot product tells us if it's in the direction pressed
            const dot = (vx * dx) + (vy * dy);

            if (dot > 0) {
                const distSq = vx * vx + vy * vy;
                const distance = Math.sqrt(distSq);
                const angle = Math.acos(constrain(dot / distance, -1, 1)); // radians deviation

                // Penalize angles heavily so it prefers straight lines in the pressed direction
                const score = distance * (1 + angle * 10);

                if (score < bestScore) {
                    bestScore = score;
                    bestMatch = connIdx;
                }
            }
        }

        if (bestMatch !== -1) {
            uiManager.galaxyMap.gamepadSelectedIndex = bestMatch;
            soundManager?.playSound('click');
        }
    }
}

/**
 * Common logic for selecting a galaxy map node (gamepad or keyboard)
 */
function _handleGalaxyMapSelection() {
    if (!uiManager?.galaxyMap || !galaxy) return;

    const targetIdx = uiManager.galaxyMap.gamepadSelectedIndex;
    if (targetIdx === -1) return;

    if (targetIdx === galaxy.currentSystemIndex) {
        uiManager.lockedDestinationIndex = -1;
        soundManager?.playSound('click_off');
    } else {
        const reachable = galaxy.getReachableSystems ? galaxy.getReachableSystems() : [];
        if (reachable.includes(targetIdx)) {
            uiManager.lockedDestinationIndex = targetIdx;
            soundManager?.playSound('click');
        } else {
            uiManager.addMessage("Route unavailable.", [255, 150, 150]);
            soundManager?.playSound('error');
        }
    }
}

/**
 * Handle mission list navigation with Up/Down arrows when viewing missions
 * @returns {boolean} True if handled
 */
function handleMissionNavigation() {
    if (!gameStateManager || gameStateManager.currentState !== "VIEWING_MISSIONS") return false;

    // Only react to Up/Down arrow keys
    if (!(keyCode === UP_ARROW || keyCode === DOWN_ARROW)) return false;

    const missions = gameStateManager.currentStationMissions || [];
    if (!Array.isArray(missions) || missions.length === 0) return false;

    let idx = (typeof gameStateManager.selectedMissionIndex === 'number') ? gameStateManager.selectedMissionIndex : -1;

    // If nothing selected, start at 0 on Down or last on Up
    if (idx === -1) {
        idx = (keyCode === DOWN_ARROW) ? 0 : (missions.length - 1);
    } else {
        if (keyCode === DOWN_ARROW) idx = Math.min(missions.length - 1, idx + 1);
        else if (keyCode === UP_ARROW) idx = Math.max(0, idx - 1);
    }

    gameStateManager.selectedMissionIndex = idx;
    soundManager?.playSound('click');
    return true;
}

/**
 * Handle ship/weapon detail screen navigation with left/right arrow keys
 * @returns {boolean} True if handled
 */
function handleDetailScreenNavigation() {
    if (!gameStateManager || !uiManager) return false;

    const state = gameStateManager.currentState;
    if (state !== "VIEWING_SHIP_DETAIL" && state !== "VIEWING_WEAPON_DETAIL") return false;

    // Only react to Left/Right arrow keys
    if (!(keyCode === LEFT_ARROW || keyCode === RIGHT_ARROW)) return false;

    const stationMenus = uiManager.stationMenus;
    if (!stationMenus) return false;

    // Handle ship detail navigation
    if (state === "VIEWING_SHIP_DETAIL") {
        const shipList = stationMenus.availableShipsList;
        if (!Array.isArray(shipList) || shipList.length === 0) return false;

        let idx = stationMenus.currentShipIndex;

        if (keyCode === LEFT_ARROW && idx > 0) {
            stationMenus.currentShipIndex--;
            stationMenus.selectedShipForDetail = shipList[stationMenus.currentShipIndex];
            soundManager?.playSound('click');
            return true;
        } else if (keyCode === RIGHT_ARROW && idx < shipList.length - 1) {
            stationMenus.currentShipIndex++;
            stationMenus.selectedShipForDetail = shipList[stationMenus.currentShipIndex];
            soundManager?.playSound('click');
            return true;
        }
    }

    // Handle weapon detail navigation
    if (state === "VIEWING_WEAPON_DETAIL") {
        const weaponList = stationMenus.availableWeaponsList;
        if (!Array.isArray(weaponList) || weaponList.length === 0) return false;

        let idx = stationMenus.currentWeaponIndex;

        if (keyCode === LEFT_ARROW && idx > 0) {
            stationMenus.currentWeaponIndex--;
            stationMenus.selectedWeaponForDetail = weaponList[stationMenus.currentWeaponIndex];
            soundManager?.playSound('click');
            return true;
        } else if (keyCode === RIGHT_ARROW && idx < weaponList.length - 1) {
            stationMenus.currentWeaponIndex++;
            stationMenus.selectedWeaponForDetail = weaponList[stationMenus.currentWeaponIndex];
            soundManager?.playSound('click');
            return true;
        }
    }

    return false;
}

/**
 * Toggle inventory screen
 */
function handleInventoryToggle() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        const opening = !gameStateManager.showingInventory;
        gameStateManager.showingInventory = opening;
        soundManager?.playSound(opening ? 'mapOpen' : 'mapClose');
        return true;
    }
    return false;
}

/**
 * Toggle galaxy map
 */
function handleMapToggle() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        // Store the previous state so we can return to it
        gameStateManager._previousState = state;
        gameStateManager.setState("GALAXY_MAP");
        soundManager?.playSound('mapOpen');
    } else if (state === "GALAXY_MAP") {
        // Return to the previous state (surface mode or in-flight)
        const returnState = gameStateManager._previousState || "IN_FLIGHT";
        gameStateManager.setState(returnState);
        gameStateManager._previousState = null;
        soundManager?.playSound('mapClose');
    }
    return true;
}

/**
 * Toggle mission overlay with 'N' key
 */
function handleMissionOverlayToggle() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        if (gameStateManager.toggleMissionOverlay()) {
            soundManager?.playSound('click');
            return true;
        }
    }
    return false;
}

/**
 * Toggle secret base navigation
 * Only available for Imperial, Separatist, or Military faction members
 */
function handleSecretBaseNavigation() {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player) return false;

    // Only Imperial, Separatist, or Military faction members have access to secret bases
    const allowedFactions = ['IMPERIAL', 'SEPARATIST', 'MILITARY'];
    const playerFaction = player.playerFaction;
    if (!playerFaction || !allowedFactions.includes(playerFaction)) {
        return false;
    }

    const wasActive = player.showSecretBaseNavigation;
    player.showSecretBaseNavigation = !wasActive;

    if (player.showSecretBaseNavigation) {
        showSecretBaseStatus();
        soundManager?.playSound('click');
    } else {
        player._cachedNavigation = null;
        uiManager?.addMessage("Secret Base Navigation: DEACTIVATED", [150, 150, 150]);
        soundManager?.playSound('click');
    }
    return true;
}

/**
 * Show secret base detection status
 */
function showSecretBaseStatus() {
    if (!player.currentSystem?.secretStations?.length) {
        uiManager?.addMessage("No Secret Base detected in this system", [255, 100, 100]);
        player.showSecretBaseNavigation = false;
        return;
    }

    const anyDiscovered = player.currentSystem.secretStations.some(s => s.discovered);
    player._cachedNavigation = null;

    if (anyDiscovered) {
        uiManager?.addMessage("Secret Base Navigation: ACTIVATED", [0, 255, 255]);
    } else {
        uiManager?.addMessage("Secret Base Detector: ACTIVATED - Base detected but not yet discovered", [0, 200, 200]);
    }
}

/**
 * Toggle wanted status
 */
function handleWantedToggle() {
    if (!player?.currentSystem) return false;

    const currentSystem = player.currentSystem;
    const isCurrentlyWanted = currentSystem.playerWanted || false;
    const securityLevel = typeof currentSystem.securityLevel === 'string'
        ? currentSystem.securityLevel.toLowerCase()
        : '';

    if (!isCurrentlyWanted && securityLevel === 'anarchy') {
        uiManager?.addMessage(`No legal authority operates in ${currentSystem.name}.`, 'lightblue');
        GS_LOG(`Wanted status toggle skipped in ${currentSystem.name}: Anarchy system.`);
        return true;
    }

    currentSystem.playerWanted = !isCurrentlyWanted;
    currentSystem.policeAlertSent = !isCurrentlyWanted;
    GS_LOG(`Player wanted status in ${currentSystem.name}: ${!isCurrentlyWanted}`);

    if (!isCurrentlyWanted) {
        uiManager?.addMessage(`WANTED in ${currentSystem.name} system!`, 'crimson');
        GS_LOG(`ALERT: Police alert issued in ${currentSystem.name}!`);
    } else {
        uiManager?.addMessage(`Legal status cleared in ${currentSystem.name}`, 'lightgreen');
        GS_LOG(`NOTICE: Police alert cleared in ${currentSystem.name}.`);
    }
    return true;
}

/**
 * Handle autopilot key logic for 'h' (station) and 'j' (jump zone/cycle)
 * J key cycles through: station → jumpzone → secretbase (if discovered)
 * @param {string} autopilotKey - The pressed key, already lowercased
 */
function handleAutopilot(autopilotKey) {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player || player.destroyed) {
        return false;
    }

    if (autopilotKey === 'h') {
        UI_LOG("H key detected - cycle planets autopilot");
        if (typeof player.cycleAutopilotPlanet === 'function') {
            try { player.cycleAutopilotPlanet(); } catch (e) {
                console.error('cycleAutopilotPlanet error', e);
                uiManager?.addMessage("No planet autopilot available", [255, 150, 100]);
            }
        } else {
            uiManager?.addMessage("No planet autopilot available", [255, 150, 100]);
        }
    } else if (autopilotKey === 'j') {
        UI_LOG("J key detected - cycle system service targets");
        if (typeof player.cycleAutopilotService === 'function') {
            try { player.cycleAutopilotService(); } catch (e) {
                console.error('cycleAutopilotService error', e);
                uiManager?.addMessage("Autopilot error: Service data unavailable", [255, 150, 100]);
            }
        } else {
            uiManager?.addMessage("No service autopilot available", [255, 150, 100]);
        }
    }
    return true;
}

/**
 * Handle minimap zoom out (',' key)
 */
function handleMinimapZoomOut() {
    const state = gameStateManager.currentState;
    if ((state === "IN_FLIGHT" || state === "SURFACE_MODE") && uiManager) {
        uiManager.cycleOutMinimapZoom();
        return true;
    }
    return false;
}

/**
 * Handle minimap zoom in ('.' key)
 */
function handleMinimapZoomIn() {
    const state = gameStateManager.currentState;
    if ((state === "IN_FLIGHT" || state === "SURFACE_MODE") && uiManager) {
        uiManager.cycleInMinimapZoom();
        return true;
    }
    return false;
}

/**
 * Handle cloak activation ('C' key)
 */
function handleCloakActivation() {
    // Allow cloak in both IN_FLIGHT and SURFACE_MODE states
    const validStates = ["IN_FLIGHT", "SURFACE_MODE"];
    if (!validStates.includes(gameStateManager.currentState) || !player || player.destroyed) {
        return false;
    }

    // Don't allow cloak while docked
    if (player.isDockedAndInvulnerable) {
        return false;
    }

    if (typeof player.activateCloak === 'function') {
        player.activateCloak();
        return true;
    }
    return false;
}

/**
 * Handle surface descent ('F' key) - enter planetary surface mode
 * @returns {boolean} True if handled
 */
function handleSurfaceDescent() {
    if (gameStateManager.currentState !== "IN_FLIGHT" || !player) return false;
    if (!surfaceMode) return false;

    const currentSystem = galaxy?.getCurrentSystem();
    if (!currentSystem?.planets) return false;

    // Check for planet proximity and trigger descent
    for (const planet of currentSystem.planets) {
        if (surfaceMode.canEnter(player, planet)) {
            if (surfaceMode.enter(player, planet, currentSystem)) {
                uiManager?.addMessage(`Descending to ${planet.name} surface...`, [100, 200, 255]);
                soundManager?.playSound('uiTransition');
                return true;
            }
        }
    }

    // Not near any planet
    uiManager?.addMessage("No planet in range for surface descent", [255, 150, 100]);
    return false;
}

/**
 * Handle ESC key to exit map/docked state
 */
function handleEscapeKey() {
    if (keyCode !== ESCAPE) return false;

    if (gameStateManager.currentState === "GALAXY_MAP") {
        gameStateManager.setState("IN_FLIGHT");
        soundManager?.playSound('mapClose');
    } else if (gameStateManager.currentState === "DOCKED") {
        gameStateManager.setState("IN_FLIGHT");
        soundManager?.playSound('click_off');
    }
    return true;
}

function keyReleased() {
    // Handle surface mode key releases
    if (gameStateManager?.currentState === "SURFACE_MODE" &&
        surfaceMode) {
        surfaceMode.handleKeyUp(keyCode, key);
    }
    return true;
}

// --- Mouse Input Handling ---

/**
 * Main mouse press handler
 */
function mousePressed() {
    if (handleGameOverClick()) return;
    if (handleTitleScreenClick()) return;
    if (handleSaveSelectionClick()) return;
    if (handleMarketButtonPress()) return;
    if (handleInventoryClick()) return;
    if (handleGeneralUIClick()) return;

    // Handle surface mode UI clicks (e.g. Befriend button)
    if (handleSurfaceModeClick()) return;

    if (handleInFlightTargeting()) return;
}

/**
 * Handle surface mode UI interactions
 * @returns {boolean} True if handled
 */
function handleSurfaceModeClick() {
    if (gameStateManager && gameStateManager.currentState === "SURFACE_MODE") {
        if (surfaceMode && surfaceMode.handleMousePressed) {
            if (surfaceMode.handleMousePressed()) return true;
        }
    }
    return false;
}

/**
 * Handle GAME_OVER click-to-reset
 * @returns {boolean} True if handled
 */
function handleGameOverClick() {
    if (gameStateManager?.currentState !== "GAME_OVER") return false;

    console.log("Game over screen clicked, resetting game...");
    // Always allow reset when in GAME_OVER state, regardless of player state
    if (typeof resetGame === 'function') {
        resetGame();
    } else {
        console.error("resetGame function not found, reloading page");
        window.location.reload();
    }
    return true;
}

/**
 * Handle title screen clicks
 * @returns {boolean} True if handled
 */
function handleTitleScreenClick() {
    const state = gameStateManager.currentState;
    if (state === "TITLE_SCREEN" || state === "INSTRUCTIONS") {
        titleScreen?.handleClick();
        return true;
    }
    return false;
}

/**
 * Handle save selection screen clicks
 * @returns {boolean} True if handled
 */
function handleSaveSelectionClick() {
    if (gameStateManager.currentState === "SAVE_SELECTION") {
        saveSelectionScreen?.handleClick(mouseX, mouseY);
        return true;
    }
    return false;
}

/**
 * Handle market button presses
 * @returns {boolean} True if handled
 */
function handleMarketButtonPress() {
    if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
        return uiManager.handleMarketMousePress(
            mouseX, mouseY,
            player.currentSystem?.station?.getMarket(),
            player
        );
    }
    return false;
}

/**
 * Handle inventory clicks
 * @returns {boolean} True if handled
 */
function handleInventoryClick() {
    const state = gameStateManager.currentState;
    if (!gameStateManager.showingInventory || (state !== "IN_FLIGHT" && state !== "SURFACE_MODE")) {
        return false;
    }

    const res = inventoryScreen.handleClick(mouseX, mouseY, player);
    if (res === 'close') {
        gameStateManager.showingInventory = false;
        soundManager?.playSound('mapClose');
        return true;
    }
    if (res?.action === 'jettison') {
        soundManager?.playSound('click');
        handleJettisonFromInventory(res.idx);
        return true;
    }
    return false;
}

/**
 * Handle general UI clicks (map, station services, etc.)
 * @returns {boolean} True if handled
 */
function handleGeneralUIClick() {
    if (!gameStateManager || !player || !uiManager || !galaxy) return false;

    return uiManager.handleMouseClicks(
        mouseX, mouseY,
        gameStateManager.currentState,
        player,
        player.currentSystem?.station?.getMarket(),
        galaxy
    );
}

/**
 * Handle in-flight targeting
 * @returns {boolean} True if handled
 */
function handleInFlightTargeting() {
    const state = gameStateManager.currentState;
    if (state === "IN_FLIGHT" || state === "SURFACE_MODE") {
        player?.handleMousePressedForTargeting();
        return true;
    }
    return false;
}

/**
 * Handles the logic for jettisoning an item from the inventory
 * @param {number} idx - The index of the item in the player's cargo
 */
function handleJettisonFromInventory(idx) {
    const item = player.cargo[idx];
    if (!item) return;

    if (player.removeCargo(item.name, 1)) {
        uiManager?.addMessage(`Jettisoned 1 ${item.name}`);

        const dir = p5.Vector.fromAngle(player.angle + PI);
        const pos = p5.Vector.add(player.pos, dir.copy().mult(player.size * 2.6));
        const cargo = new Cargo(pos.x, pos.y, item.name, 1);
        cargo.vel = dir.mult(1.5);
        player.currentSystem?.addCargo(cargo);
        soundManager?.playSound('click_off');
    } else {
        soundManager?.playSound('error');
    }
}

function mouseReleased() {
    if (gameStateManager.currentState === "VIEWING_MARKET" && uiManager) {
        uiManager.handleMarketMouseRelease();
    }
    return false;
}

function mouseWheel(event) {
    if (uiManager && gameStateManager) {
        if (uiManager.handleMouseWheel(event, gameStateManager.currentState)) {
            return false;
        }
    }
}
