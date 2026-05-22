// ****** mission.js ******

// ═══════════════════════════════════════════════════════════════════════════
// MISSION TYPE CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const MISSION_TYPE = {
    // Standard missions
    DELIVERY_LEGAL: 'Legal delivery',
    DELIVERY_ILLEGAL: 'Illegal delivery',
    SPECIAL_CARGO_SALE: 'Special Cargo Sale',
    BOUNTY_PIRATE: 'Pirate Bounty',
    BOUNTY_POLICE: 'Police Bounty',
    BOUNTY_ALIEN: 'Alien Bounty',
    ASSASSINATION: 'Assassination',
    SABOTAGE: 'Sabotage',
    // Imperial faction missions
    IMPERIAL_ELIMINATION: 'Imperial Elimination',
    IMPERIAL_PATROL: 'Imperial Patrol',
    IMPERIAL_STRIKE: 'Imperial Strike',
    IMPERIAL_SABOTAGE: 'Imperial Sabotage',
    // Separatist faction missions
    SEPARATIST_RAID: 'Separatist Raid',
    SEPARATIST_SUPPLY: 'Separatist Supply',
    SEPARATIST_STRIKE: 'Separatist Strike',
    SEPARATIST_SABOTAGE: 'Separatist Sabotage',
    // Military faction missions
    MILITARY_EXTERMINATION: 'Military Extermination',
    MILITARY_DEFENSE: 'Military Defense',
    MILITARY_STRIKE: 'Military Strike',
    MILITARY_SABOTAGE: 'Military Sabotage'
};

// ═══════════════════════════════════════════════════════════════════════════
// MISSION TYPE CLASSIFICATION SETS
// ═══════════════════════════════════════════════════════════════════════════

const BOUNTY_TYPES = new Set([
    MISSION_TYPE.BOUNTY_PIRATE,
    MISSION_TYPE.BOUNTY_POLICE,
    MISSION_TYPE.BOUNTY_ALIEN
]);

const DELIVERY_TYPES = new Set([
    MISSION_TYPE.DELIVERY_LEGAL,
    MISSION_TYPE.DELIVERY_ILLEGAL
]);

// Faction kill-based missions (target enemies of specific factions)
const FACTION_KILL_TYPES = new Set([
    MISSION_TYPE.IMPERIAL_ELIMINATION,
    MISSION_TYPE.IMPERIAL_STRIKE,
    MISSION_TYPE.SEPARATIST_RAID,
    MISSION_TYPE.SEPARATIST_STRIKE,
    MISSION_TYPE.MILITARY_EXTERMINATION,
    MISSION_TYPE.MILITARY_STRIKE
]);

// Faction patrol/scan missions (target lock counts as scan)
const FACTION_PATROL_TYPES = new Set([
    MISSION_TYPE.IMPERIAL_PATROL,
    MISSION_TYPE.MILITARY_DEFENSE
]);

// Faction sabotage missions (destroy structure)
const FACTION_SABOTAGE_TYPES = new Set([
    MISSION_TYPE.IMPERIAL_SABOTAGE,
    MISSION_TYPE.SEPARATIST_SABOTAGE,
    MISSION_TYPE.MILITARY_SABOTAGE
]);

// Faction delivery/supply missions
const FACTION_DELIVERY_TYPES = new Set([
    MISSION_TYPE.SEPARATIST_SUPPLY
]);

// Combined sets for easier type checking
const ALL_KILL_TYPES = new Set([...BOUNTY_TYPES, ...FACTION_KILL_TYPES]);
const ALL_SABOTAGE_TYPES = new Set([MISSION_TYPE.SABOTAGE, ...FACTION_SABOTAGE_TYPES]);
const ALL_DELIVERY_TYPES = new Set([...DELIVERY_TYPES, ...FACTION_DELIVERY_TYPES]);

// ═══════════════════════════════════════════════════════════════════════════
// MISSION CLASS
// ═══════════════════════════════════════════════════════════════════════════

class Mission {
    // Static ID counter for unique mission identification
    static nextId = 1;

    /**
     * Creates a new Mission instance.
     * @param {Object} data - Configuration object OR loaded save data.
     */
    constructor(data = {}) {
        this._initializeCoreProperties(data);
        this._initializeLocationData(data);
        this._initializeTargetData(data);
        this._initializeCargoData(data);
        this._initializeRewardsAndConstraints(data);
        this._initializeSabotageFields(data);
        this._initializePersistedIds(data);
        this._defineRuntimeRefs();
        this._handleSpecialCases(data);

        MISSION_LOG(`Mission created: ID=${this.id.toString().slice(-5)}, Title=${this.title}, Status=${this.status}`);
    }

    // ═══════════════════════════════════════════════════════════════════════
    // INITIALIZATION METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /** Initialize core identity properties */
    _initializeCoreProperties(data) {
        this.id = data.id || Mission.nextId++;
        this.title = data.title || 'Unknown Mission';
        this.type = data.type || MISSION_TYPE.DELIVERY_LEGAL;
        this.description = data.description || '';
        this.status = data.status || 'Available';
        this.progressCount = data.progressCount || 0;
    }

    /** Initialize location-related data */
    _initializeLocationData(data) {
        // Use nullish coalescing to preserve explicit null (for "anywhere" missions)
        this.originSystem = data.originSystem ?? 'Unknown';
        this.originStation = data.originStation ?? 'Unknown';
        this.destinationSystem = data.destinationSystem ?? null;
        this.destinationStation = data.destinationStation ?? null;
        this.destinationSystemIndex = data.destinationSystemIndex;
        this.spawnSystemIndex = data.spawnSystemIndex ?? data.systemIndex ?? null;
    }

    /** Initialize target-related data (bounty/assassination) */
    _initializeTargetData(data) {
        this.targetCount = data.targetCount || 0;
        this.targetName = data.targetName || null;
        this.targetPilotRank = data.targetPilotRank || null;
        this.targetShipType = data.targetShipType || null;
        this.targetDesc = data.targetDesc || null;
        this.guardCount = data.guardCount || 0;
        this.guardShipType = data.guardShipType || null;
        this.canLeaveSystem = data.canLeaveSystem ?? true;
        this.targetUpgrades = data.targetUpgrades || [];
        this.targetUpgradeDetails = data.targetUpgradeDetails || [];
    }

    /** Initialize cargo-related data (delivery) */
    _initializeCargoData(data) {
        this.cargoType = data.cargoType || null;
        this.cargoQuantity = data.cargoQuantity || 0;
    }

    /** Initialize rewards and constraints */
    _initializeRewardsAndConstraints(data) {
        this.rewardCredits = data.rewardCredits || data.reward || 0;
        this.prestigeReward = data.prestigeReward || 0;
        this.requiredFaction = data.requiredFaction || null;
        this.isIllegal = data.isIllegal || false;
        this.requiredRep = data.requiredRep || 0;
        this.timeLimit = (typeof data.timeLimit === 'number') ? data.timeLimit : null;
        this.activatedAt = data.activatedAt || null;
    }

    /** Initialize sabotage-specific fields */
    _initializeSabotageFields(data) {
        this.offeringFaction = data.offeringFaction || null;
        this.targetFaction = data.targetFaction || null;
        this.targetObjectType = data.targetObjectType || null;
        this.targetObjectId = data.targetObjectId || null;
        this.targetPlanetName = data.targetPlanetName || null;
    }

    /** Initialize persisted IDs for runtime linking */
    _initializePersistedIds(data) {
        this._targetEnemyId = data._targetEnemyId || null;
        this._guardIds = data._guardIds || [];
    }

    /** Define non-enumerable runtime reference properties */
    _defineRuntimeRefs() {
        Object.defineProperties(this, {
            _targetEnemyRef: { value: null, writable: true, enumerable: false, configurable: true },
            _guardRefs: { value: [], writable: true, enumerable: false, configurable: true },
            _targetObjectRef: { value: null, writable: true, enumerable: false, configurable: true },
            _nextGalaxySearchTime: { value: 0, writable: true, enumerable: false, configurable: true },
            _lastUpdateTime: { value: 0, writable: true, enumerable: false, configurable: true }
        });
    }

    /** Handle special initialization cases */
    _handleSpecialCases(data) {
        // Generate sabotage backstory if needed
        if (ALL_SABOTAGE_TYPES.has(this.type)) {
            if (!data.description || data.description === 'No description provided.' || data.description === '') {
                this.description = this._generateSabotageBackstory();
            }
            if (data.rewardCredits == null && this.type === MISSION_TYPE.SABOTAGE) {
                this.rewardCredits = 100000;
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // ACTIVATION METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Activates the mission. Called by Player.acceptMission.
     * @returns {boolean} True if activation succeeded
     */
    activate() {
        MISSION_LOG(`>>> Mission.activate() called for: ${this.title}`);

        if (this.status !== 'Available') {
            console.warn(`Mission.activate() called on mission with status ${this.status}. Should be 'Available'.`);
            return false;
        }

        this.status = 'Active';
        this.activatedAt = Date.now();
        MISSION_LOG(`<<< Mission status set to: ${this.status}`);

        // Type-specific activation using strategy pattern
        return this._executeActivationStrategy();
    }

    /** Execute activation strategy based on mission type */
    _executeActivationStrategy() {
        if (ALL_DELIVERY_TYPES.has(this.type)) {
            return this._activateDelivery();
        }
        if (this.type === MISSION_TYPE.ASSASSINATION) {
            return this._activateAssassination();
        }
        // Bounty, patrol, kill, and sabotage missions don't need special activation
        return true;
    }

    /** Handle delivery mission cargo loading */
    _activateDelivery() {
        if (!this.cargoType || this.cargoQuantity <= 0) return true;
        if (typeof player === 'undefined' || !player) return true;

        const usedSpace = player.cargo.reduce((sum, item) => sum + item.quantity, 0);
        const availableSpace = player.cargoCapacity - usedSpace;

        if (availableSpace < this.cargoQuantity) {
            console.warn(`Not enough cargo space! Need ${this.cargoQuantity}t, have ${availableSpace}t`);
            this._notifyPlayer(`Insufficient cargo space! Need ${this.cargoQuantity}t, have ${availableSpace}t available`, [255, 100, 100]);
            this.status = 'Available';
            return false;
        }

        this._addCargoToPlayer(player);
        return true;
    }

    /** Add cargo to player's hold */
    _addCargoToPlayer(playerRef) {
        const existingItem = playerRef.cargo.find(item => item.name === this.cargoType);
        if (existingItem) {
            existingItem.quantity += this.cargoQuantity;
        } else {
            playerRef.cargo.push({ name: this.cargoType, quantity: this.cargoQuantity });
        }

        MISSION_LOG(`Added ${this.cargoQuantity}t ${this.cargoType} to player cargo`);
        this._notifyPlayer(`Loaded ${this.cargoQuantity}t ${this.cargoType} into cargo hold`);
    }

    /** Handle assassination mission target spawning */
    _activateAssassination() {
        if (typeof player === 'undefined' || !player?.currentSystem) return true;
        if (this._targetEnemyRef) return true; // Already spawned

        const sys = player.currentSystem;
        const spawnData = this._calculateSpawnPosition(sys);

        // Spawn main target
        const newEnemy = this._spawnAssassinationTarget(spawnData, sys);
        if (!newEnemy) return true;

        // Spawn guards
        this._spawnGuards(newEnemy, sys, spawnData.angle, spawnData.distance);

        // Store references
        this._targetEnemyRef = newEnemy;
        this._targetEnemyId = newEnemy.id;

        MISSION_LOG(`Assassination target spawned: ${newEnemy.displayName || newEnemy.shipTypeName}`);
        this._notifyPlayer(`Target spotted: ${newEnemy.displayName || newEnemy.shipTypeName}`);
        return true;
    }

    /** Calculate spawn position for assassination target */
    _calculateSpawnPosition(system) {
        const angle = random(TWO_PI);
        const baseDist = system._getDiagonalDistance?.() || 500;
        const distance = baseDist + random(150, 400);
        return {
            angle,
            distance,
            x: player.pos.x + cos(angle) * distance,
            y: player.pos.y + sin(angle) * distance
        };
    }

    /** Spawn the main assassination target */
    _spawnAssassinationTarget(spawnData, system) {
        const shipType = this.targetShipType ||
            (typeof PIRATE_SHIP_TYPES !== 'undefined' ? random(PIRATE_SHIP_TYPES) : 'Krait');
        const role = AI_ROLE?.COMBAT ?? 'COMBAT';

        const newEnemy = new Enemy(spawnData.x, spawnData.y, player, shipType, role);
        newEnemy.calculateRadianProperties?.();
        newEnemy.initializeColors?.();
        if (this.targetName) newEnemy.displayName = this.targetName;
        newEnemy.isAssassinationTarget = true;

        // Apply mission-specific pilot rank
        if (this.targetPilotRank) {
            newEnemy.pilotRank = this.targetPilotRank;
        }

        // Apply mission-specific upgrades
        if (this.targetUpgrades && Array.isArray(this.targetUpgrades)) {
            newEnemy.applyUpgrades?.(this.targetUpgrades);
        }

        system.addEnemy(newEnemy);

        return newEnemy;
    }

    /** Spawn guard NPCs around the assassination target */
    _spawnGuards(target, sys, baseAngle, baseDist) {
        const guardCount = this.guardCount || 1;
        if (guardCount <= 0) return;

        MISSION_LOG(`Spawning ${guardCount} guards for assassination mission.`);

        for (let g = 0; g < guardCount; g++) {
            const guardData = this._calculateGuardPosition(g, guardCount, target, baseAngle, baseDist);
            const guardNPC = this._createGuardNPC(guardData, target);
            sys.addEnemy(guardNPC);
            this._guardRefs.push(guardNPC);
            this._guardIds.push(guardNPC.id);
            MISSION_LOG(`  -> Spawned guard: ${guardNPC.shipTypeName}`);
        }

        MISSION_LOG(`Spawned ${guardCount} guards successfully.`);
        this._notifyPlayer(`${guardCount} escort(s) detected around the target.`);
    }

    /** Calculate guard spawn position */
    _calculateGuardPosition(index, totalGuards, target, baseAngle, baseDist) {
        const gAngle = baseAngle + (TWO_PI * (index + 1) / (totalGuards + 1)) + random(-0.25, 0.25);
        const gDist = baseDist * 0.4 + random(80, 220);
        return {
            x: target.pos.x + cos(gAngle) * gDist,
            y: target.pos.y + sin(gAngle) * gDist,
            angle: gAngle,
            index
        };
    }

    /** Create a guard NPC */
    _createGuardNPC(guardData, target) {
        const gShip = this.guardShipType ||
            (typeof COMBAT_SHIPS !== 'undefined' && COMBAT_SHIPS.length > 0 ? random(COMBAT_SHIPS) :
                (typeof PIRATE_SHIP_TYPES !== 'undefined' ? random(PIRATE_SHIP_TYPES) : 'Krait'));

        const guardRole = AI_ROLE?.GUARD ?? 'GUARD';
        const guardNPC = new Enemy(guardData.x, guardData.y, player, gShip, guardRole);
        guardNPC.calculateRadianProperties?.();
        guardNPC.initializeColors?.();
        guardNPC.displayName = "Escort";
        guardNPC.isAssassinationGuard = true;
        guardNPC.principal = target;

        try {
            guardNPC.guardFormationOffset = createVector(
                cos(guardData.angle) * (80 + guardData.index * 30),
                sin(guardData.angle) * (80 + guardData.index * 30)
            );
        } catch (e) { /* createVector may be unavailable */ }

        return guardNPC;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UPDATE & MONITORING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Throttled update called from Player.update to monitor mission state.
     * @param {Object} currentSystem - The current star system
     * @param {Object} [playerRef] - Reference to the player (defaults to global player if omitted)
     */
    update(currentSystem, playerRef) {
        if (this.status !== 'Active') return;

        // Throttle updates to once per second (1000ms)
        const now = (typeof millis === 'function') ? millis() : Date.now();
        if (this._lastUpdateTime && (now - this._lastUpdateTime) < 1000) return;
        this._lastUpdateTime = now;

        const pRef = playerRef || (typeof player !== 'undefined' ? player : null);

        this._ensureRuntimeLinked(currentSystem);
        this._executeUpdateStrategy(currentSystem, pRef);
    }

    /** Execute update strategy based on mission type */
    _executeUpdateStrategy(currentSystem, playerRef) {
        if (this.type === MISSION_TYPE.ASSASSINATION) {
            this._updateAssassination(currentSystem);
        } else if (ALL_SABOTAGE_TYPES.has(this.type)) {
            this._updateSabotage(currentSystem, playerRef);
        }
        // Kill/bounty/patrol missions are tracked via event handlers, not polling
    }

    /** Monitor assassination target state */
    _updateAssassination(currentSystem) {
        const enemy = this._targetEnemyRef;
        if (!enemy) return;

        if (enemy.destroyed) {
            this._handleAssassinationComplete(currentSystem);
            return;
        }

        this._checkTargetLeftSystem(enemy, currentSystem);
    }

    /** Handle assassination mission completion */
    _handleAssassinationComplete(currentSystem) {
        if (typeof player === 'undefined' || player?.activeMission !== this) return;

        this.progressCount = Math.max(1, this.progressCount);
        this.complete(player);
        this._cleanupAssassinationRuntime(currentSystem);
        if (player.activeMission === this) player.activeMission = null;
    }

    /** Check if assassination target left the system */
    _checkTargetLeftSystem(enemy, currentSystem) {
        if (enemy.currentSystem && currentSystem && enemy.currentSystem !== currentSystem) {
            this.fail();
            this._notifyPlayer(`Mission canceled: target ${enemy.displayName || enemy.shipTypeName} left the system.`, [255, 120, 80]);
            this._cleanupAssassinationRuntime(currentSystem);
            if (typeof player !== 'undefined' && player?.activeMission === this) {
                player.activeMission = null;
            }
        }
    }

    /** Monitor sabotage target state */
    _updateSabotage(currentSystem, playerRef) {
        this._linkSabotageTarget(currentSystem);

        const targetObj = this._targetObjectRef;
        if (targetObj?.destroyed) {
            this._handleSabotageComplete(playerRef);
            return;
        }

        // Galaxy-wide search for target if not found locally
        if (!targetObj && this.targetObjectId) {
            const foundObj = this._searchGalaxyForTarget(playerRef);
            if (foundObj === true) return; // Mission completed
            if (foundObj) this._targetObjectRef = foundObj;
        }
    }

    /** Handle sabotage mission completion */
    _handleSabotageComplete(playerRef) {
        const p = playerRef || (typeof player !== 'undefined' ? player : null);
        if (!p) return;

        this.complete(p);
        this._targetObjectRef = null;
        if (p.activeMission === this) p.activeMission = null;
    }

    /** Search galaxy for sabotage target object */
    _searchGalaxyForTarget(playerRef) {
        // Use global galaxy or GameGlobals.galaxy
        const gal = (typeof galaxy !== 'undefined' ? galaxy : null) ||
            (typeof GameGlobals !== 'undefined' ? GameGlobals.galaxy : null);

        if (!gal || !Array.isArray(gal.systems)) return null;

        const p = playerRef || (typeof player !== 'undefined' ? player : null);

        // Only scan when player is in target system
        if (typeof this.spawnSystemIndex === 'number' &&
            p && p.currentSystem?.index !== this.spawnSystemIndex) {
            return null;
        }

        for (const sys of gal.systems) {
            if (!sys?.spaceObjects) continue;
            const so = sys.spaceObjects.find(o => o?.id === this.targetObjectId);
            if (so) {
                if (so.destroyed) {
                    this._handleSabotageComplete(p);
                    return true;
                }
                return so;
            }
        }

        // Object not found anywhere - assume destroyed
        this._handleSabotageComplete(p);
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // RUNTIME LINKING
    // ═══════════════════════════════════════════════════════════════════════

    /** Link runtime references from saved IDs */
    _ensureRuntimeLinked(currentSystem) {
        if (!currentSystem) return;

        this._linkTargetEnemy(currentSystem);
        this._linkGuards(currentSystem);
        this._linkSabotageTarget(currentSystem);
    }

    /** Link assassination target enemy reference */
    _linkTargetEnemy(currentSystem) {
        if (this._targetEnemyRef || !this._targetEnemyId) return;

        const found = currentSystem.enemiesById?.get(this._targetEnemyId)
            || currentSystem.enemies?.find(e => e?.id === this._targetEnemyId);
        if (found) this._targetEnemyRef = found;
    }

    /** Link guard enemy references */
    _linkGuards(currentSystem) {
        if (!this._guardIds?.length || this._guardRefs?.length > 0) return;

        for (const gid of this._guardIds) {
            const guard = currentSystem.enemiesById?.get(gid)
                || currentSystem.enemies?.find(e => e?.id === gid);
            if (guard) {
                this._guardRefs.push(guard);
                if (!guard.principal && this._targetEnemyRef) {
                    guard.principal = this._targetEnemyRef;
                }
            }
        }
    }

    /** Link sabotage target SpaceObject reference */
    _linkSabotageTarget(currentSystem) {
        if (this._targetObjectRef || !this.targetObjectId) return;

        this._ensureRemoteSystemSpawned();

        // Search current system first
        if (currentSystem.spaceObjects) {
            const so = currentSystem.spaceObjects.find(o => o?.id === this.targetObjectId);
            if (so) {
                this._targetObjectRef = so;
                return;
            }
        }

        this._throttledGalaxySearch();

        // Fallback for sabotage missions
        if (ALL_SABOTAGE_TYPES.has(this.type) && !this._targetObjectRef) {
            this._sabotageTargetFallback(currentSystem);
        }
    }

    /** Ensure remote system has spawned its space objects */
    _ensureRemoteSystemSpawned() {
        if (typeof galaxy === 'undefined' || typeof this.spawnSystemIndex !== 'number') return;

        const remoteSys = galaxy.systems?.[this.spawnSystemIndex];
        if (!remoteSys) return;

        if ((!remoteSys.spaceObjects?.length) && typeof remoteSys.spawnSpaceObjectsForPlanets === 'function') {
            try { remoteSys.spawnSpaceObjectsForPlanets(); } catch (e) { /* non-fatal */ }
        }
    }

    /** Throttled galaxy-wide search for target object */
    _throttledGalaxySearch() {
        if (typeof galaxy === 'undefined' || !Array.isArray(galaxy.systems)) return;

        const now = (typeof millis === 'function') ? millis() : Date.now();
        if (this._nextGalaxySearchTime && now < this._nextGalaxySearchTime) return;

        for (const sys of galaxy.systems) {
            if (!sys?.spaceObjects) continue;
            const found = sys.spaceObjects.find(o => o?.id === this.targetObjectId);
            if (found) {
                this._targetObjectRef = found;
                this._nextGalaxySearchTime = 0;
                return;
            }
        }

        this._nextGalaxySearchTime = now + 2000;
    }

    /** Sabotage mission fallback: try proximity match or create new target */
    _sabotageTargetFallback(currentSystem) {
        if (typeof currentSystem.spawnSpaceObjectsForPlanets === 'function') {
            try { currentSystem.spawnSpaceObjectsForPlanets(); } catch (e) { /* ignore */ }
        }

        // Re-attempt by ID after spawn
        if (this.targetObjectId && currentSystem.spaceObjects) {
            const so = currentSystem.spaceObjects.find(o => o?.id === this.targetObjectId);
            if (so) {
                this._targetObjectRef = so;
                return;
            }
        }

        if (this._tryProximityMatch(currentSystem)) return;
        this._createMissionTarget(currentSystem);
    }

    /** Try to find target object by proximity to planet */
    _tryProximityMatch(currentSystem) {
        if (!currentSystem.spaceObjects?.length || !this.targetObjectType || !this.targetPlanetName) return false;
        if (!currentSystem.planets) return false;

        const planet = currentSystem.planets.find(p => p?.name === this.targetPlanetName);
        if (!planet?.pos) return false;

        const maxDist = Math.max((planet.size || 0) * 1.2, 600);
        let best = null;
        let bestDist = Infinity;

        for (const so of currentSystem.spaceObjects) {
            if (!so?.pos) continue;

            const dx = so.pos.x - planet.pos.x;
            const dy = so.pos.y - planet.pos.y;
            const d = Math.sqrt(dx * dx + dy * dy);

            if (d > maxDist) continue;

            const nameMatch = so.getDisplayName?.() === this.targetObjectType;
            if (d < bestDist || (nameMatch && !best?.nameMatch)) {
                best = so;
                bestDist = d;
                best.nameMatch = nameMatch;
            }
        }

        if (best) {
            this.targetObjectId = best.id || this.targetObjectId;
            this._targetObjectRef = best;
            return true;
        }
        return false;
    }

    /** Create a new mission-specific SpaceObject as last resort */
    _createMissionTarget(currentSystem) {
        if (typeof SpaceObject !== 'function') return;
        if (typeof currentSystem.index !== 'number') return;
        if (currentSystem.index !== this.spawnSystemIndex && currentSystem.index !== this.destinationSystemIndex) return;

        const spawnPos = this._calculateMissionTargetPosition(currentSystem);
        const soNew = new SpaceObject(spawnPos.x, spawnPos.y, this.targetObjectType || 'satellite');
        soNew.isMissionSpecific = true;
        currentSystem.spaceObjects = currentSystem.spaceObjects || [];
        currentSystem.spaceObjects.push(soNew);

        this.targetObjectId = soNew.id;
        this._targetObjectRef = soNew;

        this._notifyPlayer('Mission target established for sabotage operation.');
    }

    /** Calculate position for mission-created target */
    _calculateMissionTargetPosition(currentSystem) {
        const planet = currentSystem.planets?.find(p => p?.name === this.targetPlanetName);

        if (typeof player !== 'undefined' && player?.pos) {
            const angle = (typeof random === 'function') ? random(TWO_PI) : (Math.random() * Math.PI * 2);
            const dist = 600 + Math.max(planet?.size || 0, 200, 800);
            return {
                x: player.pos.x + Math.cos(angle) * dist,
                y: player.pos.y + Math.sin(angle) * dist
            };
        } else if (planet?.pos) {
            return { x: planet.pos.x + 800, y: planet.pos.y + 120 };
        }
        return { x: 0, y: 0 };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // COMPLETION & FAILURE
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Marks the mission as completed and grants rewards.
     * @param {Player} playerRef - Reference to the player object
     */
    complete(playerRef) {
        MISSION_LOG(`Mission.complete() called for: ${this.title}`);

        if (!playerRef?.addCredits) {
            console.error("Mission.complete() called without valid player object!");
            return;
        }

        // Use shared completion logic to ensure consistency
        this._executeCompletion(playerRef);
        this._cleanupAssassinationRuntime(playerRef.currentSystem);
    }

    /**
     * Shared completion logic for both completion paths.
     * Ensures consistent behavior: credits, prestige, news, illegal consequences.
     * @param {Player} playerRef - Player reference
     * @private
     */
    _executeCompletion(playerRef) {
        MISSION_LOG(`  -> Granting reward: ${this.rewardCredits} Credits`);
        playerRef.addCredits(this.rewardCredits);
        this.status = 'Completed';

        // Award faction prestige if mission has a prestige reward (was missing in old mission.complete())
        if (this.prestigeReward && this.requiredFaction && typeof playerRef.addFactionPrestige === 'function') {
            MISSION_LOG(`   Awarding ${this.prestigeReward} prestige to ${this.requiredFaction}`);
            playerRef.addFactionPrestige(this.requiredFaction, this.prestigeReward);
        }

        // Record completion and UI feedback
        this._recordCompletion(playerRef);

        // Generate news for assassination/sabotage (was missing in player.completeMission())
        this._generateCompletionNews(playerRef);

        // Apply illegal consequences if applicable (was missing in player.completeMission())
        if (this.isIllegal) {
            this._applyIllegalConsequences(playerRef);
        }
    }

    /** Record mission completion in player log and UI */
    _recordCompletion(playerRef) {
        try {
            playerRef.recordMissionCompletion?.(this);

            if (typeof uiManager !== 'undefined' && uiManager) {
                uiManager.inactiveMissionIds = uiManager.inactiveMissionIds || new Set();
                uiManager.inactiveMissionIds.add(this.id);
                uiManager.addMessage(`Mission Complete: ${this.title} | Reward: ${this.rewardCredits}cr`);
            }

            if (typeof saveGame === 'function') saveGame();
        } catch (e) {
            MISSION_LOG('Error recording mission completion:', e);
        }
    }

    /** Generate news for mission completion */
    _generateCompletionNews(playerRef) {
        if (typeof GameGlobals === 'undefined' || !GameGlobals.newsManager) return;

        const systemName = playerRef.currentSystem?.name || this.destinationSystem || 'Unknown';

        try {
            if (this.type === MISSION_TYPE.ASSASSINATION) {
                GameGlobals.newsManager.addAssassinationNews(this.targetName, systemName);
            } else if (ALL_SABOTAGE_TYPES.has(this.type)) {
                GameGlobals.newsManager.addSabotageNews(this.targetObjectType, this.targetPlanetName, systemName);
            } else if (ALL_KILL_TYPES.has(this.type)) {
                const bountyType = this._getBountyTypeForNews();
                GameGlobals.newsManager.addBountyNews(bountyType, this.targetCount || this.progressCount || 1, systemName);
            }
        } catch (e) {
            MISSION_LOG('Error generating news:', e);
        }
    }

    /** Get bounty type string for news generation */
    _getBountyTypeForNews() {
        if (this.type === MISSION_TYPE.BOUNTY_PIRATE) return 'pirate';
        if (this.type === MISSION_TYPE.BOUNTY_POLICE) return 'police';
        if (this.type === MISSION_TYPE.BOUNTY_ALIEN || this.type === MISSION_TYPE.MILITARY_EXTERMINATION) return 'alien';
        if (FACTION_KILL_TYPES.has(this.type)) return 'faction';
        return 'hostile';
    }

    /** Apply consequences for completing illegal missions */
    _applyIllegalConsequences(playerRef) {
        const enemy = this._targetEnemyRef;
        let wantedLevel = 1;

        if (enemy?.role !== undefined) {
            if (enemy.role === (AI_ROLE?.POLICE ?? 'POLICE')) wantedLevel = 3;
            else if (enemy.role === (AI_ROLE?.HAULER ?? 'HAULER')) wantedLevel = 2;
        }

        if (playerRef.currentSystem?.setPlayerWanted) {
            playerRef.currentSystem.setPlayerWanted(true, wantedLevel, 60);
            this._notifyPlayer('WANTED: Authorities alerted by this assassination!', '#ff4444');
        } else {
            playerRef.isWanted = true;
            this._notifyPlayer('WANTED: Authorities alerted!', '#ff4444');
        }
    }

    /** Mark mission as failed */
    fail() {
        MISSION_LOG(`Mission Failed: ${this.title}`);
        this.status = 'Failed';
        this._cleanupAssassinationRuntime(null);
    }

    /**
     * Abandons the mission.
     * @param {Player} playerRef - Reference to the player object
     */
    abandon(playerRef) {
        MISSION_LOG(`Mission Abandoned: ${this.title}`);
        this.status = 'Abandoned';
        this._cleanupAssassinationRuntime(null);

        if (typeof playerRef !== 'undefined' && playerRef?.activeMission === this) {
            playerRef.activeMission = null;
        }

        this._notifyPlayer(`Mission Abandoned: ${this.title}`, [200, 200, 200]);
    }

    /** Cleanup runtime references for assassination mission */
    _cleanupAssassinationRuntime(currentSystem) {
        if (Array.isArray(this._guardRefs)) {
            for (const guard of this._guardRefs) {
                if (guard) {
                    guard.principal = null;
                    guard.isAssassinationGuard = false;
                }
            }
        }

        this._targetEnemyRef = null;
        this._guardRefs = [];
        this._targetEnemyId = null;
        this._guardIds = [];
    }

    // ═══════════════════════════════════════════════════════════════════════
    // PROGRESS TRACKING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Updates the progress of the mission.
     * @param {number} amount - Amount to increment progress by (default 1)
     */
    updateProgress(amount = 1) {
        if (this.status !== 'Active') return;

        this.progressCount += amount;

        if (this.targetCount > 0 && this.progressCount >= this.targetCount) {
            this.status = 'Completable';
            this._notifyPlayer(`Mission Objective Updated: ${this.progressCount}/${this.targetCount}`);
        }
    }

    /**
     * Check if mission is completable (target reached for kill missions, or cargo delivered)
     * @returns {boolean}
     */
    isCompletable() {
        if (ALL_KILL_TYPES.has(this.type) || FACTION_PATROL_TYPES.has(this.type)) {
            return this.progressCount >= this.targetCount;
        }
        return this.status === 'Completable' || this.status === 'Active';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DISPLAY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /** Returns a short summary string for mission board list */
    getSummary() {
        const statusPrefix = this._getStatusPrefix();
        const progressInfo = this._getProgressSuffix();
        const rewardStr = this._formatRewardString();

        return `${statusPrefix}${this.title}${progressInfo} - ${rewardStr}`;
    }

    _getStatusPrefix() {
        if (this.status === 'Completed') return '[COMPLETED] ';
        if (this.status === 'Failed') return '[FAILED] ';
        return '';
    }

    _getProgressSuffix() {
        if (this.status === 'Active' &&
            (ALL_KILL_TYPES.has(this.type) || FACTION_PATROL_TYPES.has(this.type)) &&
            this.targetCount > 0) {
            return ` (${this.progressCount}/${this.targetCount})`;
        }
        return '';
    }

    _formatRewardString() {
        let rewardStr = `${this.rewardCredits}cr`;
        if (this.prestigeReward && this.prestigeReward > 0) {
            rewardStr += ` +${this.prestigeReward}★`;
        }
        return rewardStr;
    }

    /** Returns a detailed multi-line string for the mission details panel */
    getDetails() {
        return [
            `Title: ${this.title}`,
            '--------------------',
            `Status: ${this.status}`,
            '',
            `Type: ${this.type}`,
            `Origin: ${this.originStation} (${this.originSystem})`,
            `Location: ${this._getLocationString()}`,
            this._getObjectiveString(),
            this._getRewardString(),
            this._getDescriptionString(),
            this._getSupplementalDetails(),
            this._getWarningsAndMeta(),
            this._getProgressString()
        ].filter(Boolean).join('\n');
    }

    /** Get location string for details */
    _getLocationString() {
        // Sabotage missions - show planet/system location
        if (ALL_SABOTAGE_TYPES.has(this.type)) {
            if (this.targetPlanetName) return `Near ${this.targetPlanetName} in ${this.destinationSystem || 'the target system'}`;
            if (this.destinationSystem) return this.destinationSystem;
            return 'Target system specified in mission';
        }

        // Strike missions - require specific system
        if (this._isStrikeMission()) {
            if (this.destinationSystem) return `Target: ${this.destinationSystem}`;
            return 'Designated strike zone';
        }

        // Delivery/Supply missions - need station and system
        if (ALL_DELIVERY_TYPES.has(this.type)) {
            if (this.destinationSystem && this.destinationStation) {
                return `${this.destinationStation} (${this.destinationSystem})`;
            }
            if (this.destinationSystem) return this.destinationSystem;
            return 'Destination specified';
        }

        // Bounty/Elimination/Raid/Defense/Patrol - can complete anywhere
        if (ALL_KILL_TYPES.has(this.type) || FACTION_PATROL_TYPES.has(this.type)) {
            return 'Any System';
        }

        // Assassination - target spawns in destination system or local space
        if (this.type === MISSION_TYPE.ASSASSINATION) {
            if (this.destinationSystem) return `Target Location: ${this.destinationSystem}`;
            return 'Target will appear in local space';
        }

        // Fallback for missions with explicit destinations
        if (this.destinationSystem) {
            return `${this.destinationStation || 'System Wide'} (${this.destinationSystem})`;
        }

        return 'N/A';
    }

    _isStrikeMission() {
        return this.type === MISSION_TYPE.IMPERIAL_STRIKE ||
            this.type === MISSION_TYPE.SEPARATIST_STRIKE ||
            this.type === MISSION_TYPE.MILITARY_STRIKE;
    }

    /** Get objective string for details */
    _getObjectiveString() {
        if (ALL_DELIVERY_TYPES.has(this.type) && this.cargoType) {
            return `Objective: Deliver ${this.cargoQuantity}t ${this.cargoType}`;
        }

        if (ALL_KILL_TYPES.has(this.type)) {
            if (this.targetDesc) return `Objective: ${this.targetDesc}`;
            if (this.targetCount) return `Objective: Destroy ${this.targetCount} enemy vessels`;
        }

        if (FACTION_PATROL_TYPES.has(this.type)) {
            if (this.targetDesc) return `Objective: ${this.targetDesc}`;
            if (this.targetCount) return `Objective: Neutralize ${this.targetCount} hostiles`;
        }

        if (ALL_SABOTAGE_TYPES.has(this.type)) {
            if (this.targetObjectType) return `Objective: Destroy ${this.targetObjectType}`;
            return `Objective: Sabotage enemy infrastructure`;
        }

        if (this.type === MISSION_TYPE.ASSASSINATION) {
            return this.targetName ?
                `Objective: Eliminate ${this.targetName}` :
                `Objective: Eliminate designated target`;
        }

        return '';
    }

    /** Get reward string for details */
    _getRewardString() {
        const label = ALL_SABOTAGE_TYPES.has(this.type) ? 'Reward (High)' : 'Reward';
        let rewardStr = `${label}: ${this.rewardCredits} Credits`;

        if (this.prestigeReward && this.prestigeReward > 0) {
            rewardStr += ` + ${this.prestigeReward} Prestige`;
        }

        return rewardStr;
    }

    /** Get description string for details */
    _getDescriptionString() {
        if (!this.description) return '';
        return `\n${this.description}`;
    }

    /** Get supplemental details based on mission type */
    _getSupplementalDetails() {
        const details = [];

        if (this.type === MISSION_TYPE.ASSASSINATION) {
            if (this.targetName) details.push(`Named Target: ${this.targetName}`);
            if (this.targetShipType) details.push(`Target Ship: ${this.targetShipType}`);
            if (this.targetUpgrades && this.targetUpgrades.length > 0) {
                details.push(`Estimated Upgrades: ${this.targetUpgrades.join(', ')}`);
            }
        }

        if (ALL_SABOTAGE_TYPES.has(this.type)) {
            if (this.offeringFaction) details.push(`Offered By: ${this.offeringFaction}`);
            if (this.targetFaction) details.push(`Target Faction: ${this.targetFaction}`);
        }

        // Cargo info for non-delivery missions
        if (this.cargoType && !ALL_DELIVERY_TYPES.has(this.type)) {
            details.push(`Cargo: ${this.cargoQuantity}t ${this.cargoType}`);
        }

        return details.length > 0 ? '\n' + details.join('\n') : '';
    }

    /** Get warnings and meta information */
    _getWarningsAndMeta() {
        const warnings = [];
        if (this.isIllegal) warnings.push(`!! This mission involves illegal activity.`);
        if (this.timeLimit) warnings.push(`Time Limit: ${this.timeLimit} seconds`);
        if (this.requiredRep) warnings.push(`Requires Reputation: ${this.requiredRep}`);
        return warnings.length > 0 ? '\n' + warnings.join('\n') : '';
    }

    /** Get progress string for bounty/patrol missions */
    _getProgressString() {
        if ((ALL_KILL_TYPES.has(this.type) || FACTION_PATROL_TYPES.has(this.type)) && this.targetCount > 0) {
            return `\nProgress: ${this.progressCount}/${this.targetCount}`;
        }
        return '';
    }

    // ═══════════════════════════════════════════════════════════════════════
    // BACKSTORY GENERATION
    // ═══════════════════════════════════════════════════════════════════════

    /** Generate a flavorful backstory for sabotage missions */
    _generateSabotageBackstory() {
        const offer = this.offeringFaction || 'A local faction';
        const target = this._deriveSabotageTargetFaction(offer);
        const obj = this.targetObjectType || 'strategic installation';

        return this._getSabotageReason(offer.toLowerCase(), offer, target, obj);
    }

    /** Derive opposing faction for sabotage missions */
    _deriveSabotageTargetFaction(offer) {
        if (this.targetFaction) return this.targetFaction;

        const offerLower = (offer || '').toLowerCase();
        if (offerLower.includes('separat')) return 'Imperial forces';
        if (offerLower.includes('imper')) return 'Separatist rebels';
        if (offerLower.includes('milit')) return 'Alien incursion';
        return 'a rival faction';
    }

    /** Get faction-specific reason for sabotage */
    _getSabotageReason(offerLower, offer, target, obj) {
        const reasons = {
            'separat': `The ${offer} claims the ${obj} is a forward listening post used by ${target} to track convoy movements and coordinate punitive strikes. Destroying it would blind the occupiers and open a window for daring raids.`,
            'imper': `Agents of the ${offer} have surfaced intelligence that the ${obj} is a covert supply hub funneling weapons to ${target} through the system. Removing it would disrupt their logistics and restore order.`,
            'milit': `Military analysts suspect the ${obj} has been corrupted by alien tech — its emissions are destabilizing local navigation and threatening civilian traffic. ${offer} wants it eliminated before it spreads.`,
            'tourism': `The ${offer} reports the ${obj} is generating hazardous electromagnetic interference that endangers passenger liners and resort shuttles. Removing it would restore safe travel corridors for tourists.`,
            'mining': `The ${offer} claims the ${obj} is disrupting mineral surveys and extraction operations. Its removal would open valuable ore deposits to exploitation.`,
            'refinery': `Engineers from the ${offer} report the ${obj} is contaminating fuel processing routes with unstable emissions. Destroying it would ensure safe refinery operations.`,
            'agricultural': `The ${offer} asserts the ${obj} is broadcasting signals that interfere with agricultural drones and climate control satellites. Its destruction would protect vital food production.`,
            'service': `Representatives of the ${offer} indicate the ${obj} is blocking critical communication frequencies used for emergency services. Eliminating it would restore life-saving communications.`,
            'post human': `The ${offer} considers the ${obj} incompatible with the evolution of human consciousness. Its removal would advance the collective toward transcendence.`,
            'council': `The ${offer} considers the ${obj} incompatible with the evolution of human consciousness. Its removal would advance the collective toward transcendence.`,
            'offworld': `The ${offer} reports the ${obj} is interfering with interstellar trade beacon frequencies. Destroying it would re-establish profitable trade routes.`,
            'trading': `The ${offer} reports the ${obj} is interfering with interstellar trade beacon frequencies. Destroying it would re-establish profitable trade routes.`,
            'xeno': `The ${offer} has determined the ${obj} poses a contamination risk to ongoing xenological research. Its removal is necessary to preserve the integrity of alien artifact studies.`,
            'alien': `The ${offer} has determined the ${obj} poses a contamination risk to ongoing xenological research. Its removal is necessary to preserve the integrity of alien artifact studies.`,
            'consortium': `The ${offer} reports the ${obj} is generating industrial interference that damages manufacturing automation. Its destruction would restore production efficiency.`,
            'industrial': `The ${offer} reports the ${obj} is generating industrial interference that damages manufacturing automation. Its destruction would restore production efficiency.`
        };

        for (const [key, reason] of Object.entries(reasons)) {
            if (offerLower.includes(key)) return reason;
        }

        return `Intelligence suggests the ${obj} is a critical node for ${target}. Removing it would significantly weaken their presence in the region.`;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // UTILITY METHODS
    // ═══════════════════════════════════════════════════════════════════════

    /** Notify player via UI manager if available */
    _notifyPlayer(message, color) {
        if (typeof uiManager !== 'undefined' && uiManager?.addMessage) {
            uiManager.addMessage(message, color);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════════════════════════════════════

    /** Serializes the mission to a JSON-compatible object */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            description: this.description,
            status: this.status,
            progressCount: this.progressCount,
            originSystem: this.originSystem,
            originStation: this.originStation,
            destinationSystem: this.destinationSystem,
            destinationStation: this.destinationStation,
            destinationSystemIndex: this.destinationSystemIndex,
            spawnSystemIndex: this.spawnSystemIndex,
            targetCount: this.targetCount,
            targetName: this.targetName,
            targetShipType: this.targetShipType,
            targetDesc: this.targetDesc,
            targetUpgrades: this.targetUpgrades,
            targetUpgradeDetails: this.targetUpgradeDetails,
            guardCount: this.guardCount,
            guardShipType: this.guardShipType,
            canLeaveSystem: this.canLeaveSystem,
            cargoType: this.cargoType,
            cargoQuantity: this.cargoQuantity,
            rewardCredits: this.rewardCredits,
            prestigeReward: this.prestigeReward,
            requiredFaction: this.requiredFaction,
            isIllegal: this.isIllegal,
            requiredRep: this.requiredRep,
            timeLimit: this.timeLimit,
            activatedAt: this.activatedAt,
            offeringFaction: this.offeringFaction,
            targetFaction: this.targetFaction,
            targetObjectType: this.targetObjectType,
            targetObjectId: this.targetObjectId,
            targetPlanetName: this.targetPlanetName,
            _targetEnemyId: this._targetEnemyId,
            _guardIds: this._guardIds
        };
    }

    /**
     * Creates a new Mission instance from a JSON object.
     * @param {Object} json - The JSON object to deserialize
     * @returns {Mission} The rehydrated Mission object
     */
    static fromJSON(json) {
        return new Mission(json);
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        Mission,
        MISSION_TYPE,
        BOUNTY_TYPES,
        DELIVERY_TYPES,
        FACTION_KILL_TYPES,
        FACTION_PATROL_TYPES,
        FACTION_SABOTAGE_TYPES,
        FACTION_DELIVERY_TYPES,
        ALL_KILL_TYPES,
        ALL_SABOTAGE_TYPES,
        ALL_DELIVERY_TYPES
    };
    global.Mission = Mission;
    global.MISSION_TYPE = MISSION_TYPE;
    global.BOUNTY_TYPES = BOUNTY_TYPES;
    global.DELIVERY_TYPES = DELIVERY_TYPES;
    global.FACTION_KILL_TYPES = FACTION_KILL_TYPES;
    global.FACTION_PATROL_TYPES = FACTION_PATROL_TYPES;
    global.FACTION_SABOTAGE_TYPES = FACTION_SABOTAGE_TYPES;
    global.FACTION_DELIVERY_TYPES = FACTION_DELIVERY_TYPES;
    global.ALL_KILL_TYPES = ALL_KILL_TYPES;
    global.ALL_SABOTAGE_TYPES = ALL_SABOTAGE_TYPES;
    global.ALL_DELIVERY_TYPES = ALL_DELIVERY_TYPES;
}