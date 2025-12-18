// ****** mission.js ******

// Define Mission Types using a constant object for better readability and safety
const MISSION_TYPE = {
    DELIVERY_LEGAL: 'Legal delivery',
    DELIVERY_ILLEGAL: 'Illegal delivery',
    BOUNTY_PIRATE: 'Bounty',
    BOUNTY_POLICE: 'Bounty',
    BOUNTY_ALIEN: 'Alien Bounty',
    ASSASSINATION: 'Assassination',
    SABOTAGE: 'Sabotage'
};

// Type classification helpers for cleaner conditional logic
const BOUNTY_TYPES = new Set([MISSION_TYPE.BOUNTY_PIRATE, MISSION_TYPE.BOUNTY_POLICE, MISSION_TYPE.BOUNTY_ALIEN]);
const DELIVERY_TYPES = new Set([MISSION_TYPE.DELIVERY_LEGAL, MISSION_TYPE.DELIVERY_ILLEGAL]);

class Mission {
    // ═══════════════════════════════════════════════════════════════════════════
    // STATIC MEMBERS
    // ═══════════════════════════════════════════════════════════════════════════
    static nextId = 1;

    // ═══════════════════════════════════════════════════════════════════════════
    // CONSTRUCTOR
    // ═══════════════════════════════════════════════════════════════════════════
    /**
     * Represents an available or active mission.
     * @param {object} data - Configuration object OR loaded save data object.
     */
    constructor(data = {}) {
        // Core identity
        this.id = data.id || Mission.nextId++;
        this.title = data.title || 'Unknown Mission';
        this.type = data.type || MISSION_TYPE.DELIVERY_LEGAL;
        this.description = data.description || '';
        this.status = data.status || 'Available';
        this.progressCount = data.progressCount || 0;

        // Location data
        this.originSystem = data.originSystem || 'Unknown';
        this.originStation = data.originStation || 'Unknown';
        this.destinationSystem = data.destinationSystem || 'Unknown';
        this.destinationStation = data.destinationStation || 'Unknown';
        this.destinationSystemIndex = data.destinationSystemIndex;
        this.spawnSystemIndex = data.spawnSystemIndex ?? data.systemIndex ?? null;

        // Target data (bounty/assassination)
        this.targetCount = data.targetCount || 0;
        this.targetName = data.targetName || null;
        this.targetShipType = data.targetShipType || null;
        this.guardCount = data.guardCount || 0;
        this.guardShipType = data.guardShipType || null;
        this.canLeaveSystem = data.canLeaveSystem ?? true;

        // Cargo data (delivery)
        this.cargoType = data.cargoType || null;
        this.cargoQuantity = data.cargoQuantity || 0;

        // Rewards & constraints
        this.rewardCredits = data.rewardCredits || data.reward || 0;
        this.isIllegal = data.isIllegal || false;
        this.requiredRep = data.requiredRep || 0;
        this.timeLimit = (typeof data.timeLimit === 'number') ? data.timeLimit : null;
        this.activatedAt = data.activatedAt || null;

        // Sabotage-specific fields
        this.offeringFaction = data.offeringFaction || null;
        this.targetFaction = data.targetFaction || null;
        this.targetObjectType = data.targetObjectType || null;
        this.targetObjectId = data.targetObjectId || null;
        this.targetPlanetName = data.targetPlanetName || null;

        // Persisted IDs for runtime linking
        this._targetEnemyId = data._targetEnemyId || null;
        this._guardIds = data._guardIds || [];

        // Non-enumerable runtime references (not serialized)
        this._defineRuntimeRefs();

        // Generate sabotage backstory if needed
        if (this.type === MISSION_TYPE.SABOTAGE) {
            if (!data.description || data.description === 'No description provided.') {
                this.description = this._generateSabotageBackstory();
            }
            if (data.rewardCredits == null) {
                this.rewardCredits = 100000;
            }
        }

        MISSION_LOG(`Mission created: ID=${this.id.toString().slice(-5)}, Title=${this.title}, Status=${this.status}`);
    }

    /** Define non-enumerable runtime reference properties */
    _defineRuntimeRefs() {
        Object.defineProperties(this, {
            _targetEnemyRef: { value: null, writable: true, enumerable: false, configurable: true },
            _guardRefs: { value: [], writable: true, enumerable: false, configurable: true },
            _targetObjectRef: { value: null, writable: true, enumerable: false, configurable: true },
            _nextGalaxySearchTime: { value: 0, writable: true, enumerable: false, configurable: true }
        });
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // ACTIVATION METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Sets the mission status to 'Active'. Called by Player.acceptMission. */
    activate() {
        MISSION_LOG(`>>> Mission.activate() called for: ${this.title}`);

        if (this.status !== 'Available') {
            console.warn(`Mission.activate() called on mission with status ${this.status}. Should be 'Available'.`);
            return false;
        }

        this.status = 'Active';
        this.activatedAt = Date.now();
        MISSION_LOG(`<<< Mission status set to: ${this.status}`);

        // Type-specific activation
        if (DELIVERY_TYPES.has(this.type)) {
            return this._activateDelivery();
        } else if (this.type === MISSION_TYPE.ASSASSINATION) {
            return this._activateAssassination();
        }

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
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Insufficient cargo space! Need ${this.cargoQuantity}t, have ${availableSpace}t available`, [255, 100, 100]);
            }
            this.status = 'Available';
            return false;
        }

        // Add cargo to player
        const existingItem = player.cargo.find(item => item.name === this.cargoType);
        if (existingItem) {
            existingItem.quantity += this.cargoQuantity;
        } else {
            player.cargo.push({ name: this.cargoType, quantity: this.cargoQuantity });
        }

        MISSION_LOG(`Added ${this.cargoQuantity}t ${this.cargoType} to player cargo`);
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage(`Loaded ${this.cargoQuantity}t ${this.cargoType} into cargo hold`);
        }
        return true;
    }

    /** Handle assassination mission target spawning */
    _activateAssassination() {
        if (typeof player === 'undefined' || !player?.currentSystem) return true;
        if (this._targetEnemyRef) return true; // Already spawned

        const sys = player.currentSystem;
        const angle = random(TWO_PI);
        const spawnDist = (sys._getDiagonalDistance?.() || 500) + random(150, 400);
        const spawnX = player.pos.x + cos(angle) * spawnDist;
        const spawnY = player.pos.y + sin(angle) * spawnDist;

        // Spawn main target
        const shipType = this.targetShipType ||
            (typeof PIRATE_SHIP_TYPES !== 'undefined' ? random(PIRATE_SHIP_TYPES) : 'Krait');
        const role = AI_ROLE?.COMBAT ?? 'COMBAT';

        const newEnemy = new Enemy(spawnX, spawnY, player, shipType, role);
        newEnemy.calculateRadianProperties?.();
        newEnemy.initializeColors?.();
        if (this.targetName) newEnemy.displayName = this.targetName;
        newEnemy.isAssassinationTarget = true;
        sys.addEnemy(newEnemy);

        // Spawn guards
        this._spawnGuards(newEnemy, sys, angle, spawnDist);

        // Store references
        this._targetEnemyRef = newEnemy;
        this._targetEnemyId = newEnemy.id;

        MISSION_LOG(`Assassination target spawned: ${newEnemy.displayName || newEnemy.shipTypeName} at (${spawnX.toFixed(0)},${spawnY.toFixed(0)})`);
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage(`Target spotted: ${newEnemy.displayName || newEnemy.shipTypeName}`);
        }
        return true;
    }

    /** Spawn guard NPCs around the assassination target */
    _spawnGuards(target, sys, baseAngle, baseDist) {
        const guardCount = this.guardCount || 1;
        if (guardCount <= 0) return;

        console.log(`Spawning ${guardCount} guards for assassination mission.`);

        for (let g = 0; g < guardCount; g++) {
            const gAngle = baseAngle + (TWO_PI * (g + 1) / (guardCount + 1)) + random(-0.25, 0.25);
            const gDist = baseDist * 0.4 + random(80, 220);
            const gx = target.pos.x + cos(gAngle) * gDist;
            const gy = target.pos.y + sin(gAngle) * gDist;

            const gShip = this.guardShipType ||
                (COMBAT_SHIPS?.length > 0 ? random(COMBAT_SHIPS) :
                    (typeof PIRATE_SHIP_TYPES !== 'undefined' ? random(PIRATE_SHIP_TYPES) : 'Krait'));

            const guardRole = AI_ROLE?.GUARD ?? 'GUARD';
            const guardNPC = new Enemy(gx, gy, player, gShip, guardRole);
            guardNPC.calculateRadianProperties?.();
            guardNPC.initializeColors?.();
            guardNPC.displayName = "Escort";
            guardNPC.isAssassinationGuard = true;
            guardNPC.principal = target;

            try {
                guardNPC.guardFormationOffset = createVector(cos(gAngle) * (80 + g * 30), sin(gAngle) * (80 + g * 30));
            } catch (e) { /* createVector may be unavailable */ }

            sys.addEnemy(guardNPC);
            this._guardRefs.push(guardNPC);
            this._guardIds.push(guardNPC.id);

            MISSION_LOG(`  -> Spawned guard: ${guardNPC.shipTypeName} at (${gx.toFixed(0)},${gy.toFixed(0)})`);
        }

        console.log(`Spawned ${guardCount} guards successfully.`);
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage(`${guardCount} escort(s) detected around the target.`);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // UPDATE & MONITORING
    // ═══════════════════════════════════════════════════════════════════════════

    /** 
     * Throttled update called from Player.update to monitor special mission targets. 
     * Only performs expensive checks once per second instead of every frame.
     */
    update(currentSystem) {
        if (this.status !== 'Active') return;

        // Throttle updates to once per second (1000ms) - mission state rarely changes faster
        const now = (typeof millis === 'function') ? millis() : Date.now();
        if (this._lastUpdateTime && (now - this._lastUpdateTime) < 1000) return;
        this._lastUpdateTime = now;

        this._ensureRuntimeLinked(currentSystem);

        if (this.type === MISSION_TYPE.ASSASSINATION) {
            this._updateAssassination(currentSystem);
        } else if (this.type === MISSION_TYPE.SABOTAGE) {
            this._updateSabotage(currentSystem);
        }
    }

    /** Monitor assassination target state */
    _updateAssassination(currentSystem) {
        const enemy = this._targetEnemyRef;
        if (!enemy) return;

        if (enemy.destroyed) {
            if (typeof player !== 'undefined' && player?.activeMission === this) {
                this.progressCount = Math.max(1, this.progressCount);
                this.complete(player);
                this._cleanupAssassinationRuntime(currentSystem);
                if (player.activeMission === this) player.activeMission = null;
            }
            return;
        }

        // Check if target left the system
        if (enemy.currentSystem && currentSystem && enemy.currentSystem !== currentSystem) {
            this.fail();
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Mission canceled: target ${enemy.displayName || enemy.shipTypeName} left the system.`, [255, 120, 80]);
            }
            this._cleanupAssassinationRuntime(currentSystem);
            if (typeof player !== 'undefined' && player?.activeMission === this) {
                player.activeMission = null;
            }
        }
    }

    /** Monitor sabotage target state */
    _updateSabotage(currentSystem) {
        // Try to link target object if needed
        if (!this._targetObjectRef && this.targetObjectId && currentSystem?.spaceObjects) {
            const so = currentSystem.spaceObjects.find(o => o?.id === this.targetObjectId);
            if (so) this._targetObjectRef = so;
        }

        const targetObj = this._targetObjectRef;

        // Check if target is destroyed
        if (targetObj?.destroyed) {
            if (typeof player !== 'undefined' && player) {
                this.complete(player);
                this._targetObjectRef = null;
                if (player.activeMission === this) player.activeMission = null;
            }
            return;
        }

        // Galaxy-wide search for target if not found locally
        if (!targetObj && this.targetObjectId) {
            const foundObj = this._searchGalaxyForTarget();
            if (foundObj === true) return; // Mission completed (object was destroyed)
            if (foundObj) {
                this._targetObjectRef = foundObj;
            }
        }
    }

    /** Search galaxy for sabotage target object. Returns object, true if completed, or null. */
    _searchGalaxyForTarget() {
        if (typeof galaxy === 'undefined' || !Array.isArray(galaxy.systems)) return null;

        // Early exit: Don't scan all systems if we know the target is in a specific system
        // and the player is not there. Only do full galaxy scan when player reaches target system.
        if (typeof this.spawnSystemIndex === 'number' &&
            typeof player !== 'undefined' && player?.currentSystem?.index !== this.spawnSystemIndex) {
            return null; // Not in target system, skip expensive galaxy-wide search
        }

        for (const sys of galaxy.systems) {
            if (!sys?.spaceObjects) continue;
            const so = sys.spaceObjects.find(o => o?.id === this.targetObjectId);
            if (so) {
                if (so.destroyed) {
                    this.complete(player);
                    this._targetObjectRef = null;
                    if (player?.activeMission === this) player.activeMission = null;
                    return true;
                }
                return so;
            }
        }

        // Object not found anywhere - assume destroyed
        this.complete(player);
        this._targetObjectRef = null;
        if (player?.activeMission === this) player.activeMission = null;
        return true;
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // RUNTIME LINKING
    // ═══════════════════════════════════════════════════════════════════════════

    /** Link runtime enemy and guard objects from saved IDs. Safe to call frequently. */
    _ensureRuntimeLinked(currentSystem) {
        if (!currentSystem) return;

        this._linkTargetEnemy(currentSystem);
        this._linkGuards(currentSystem);
        this._linkSabotageTarget(currentSystem);
    }

    /** Link assassination target enemy reference - uses O(1) Map lookup */
    _linkTargetEnemy(currentSystem) {
        if (this._targetEnemyRef || !this._targetEnemyId) return;

        // Use O(1) Map lookup if available, fallback to O(n) array search
        const found = currentSystem.enemiesById?.get(this._targetEnemyId)
            || currentSystem.enemies?.find(e => e?.id === this._targetEnemyId);
        if (found) this._targetEnemyRef = found;
    }

    /** Link guard enemy references - uses O(1) Map lookup */
    _linkGuards(currentSystem) {
        if (!this._guardIds?.length || this._guardRefs?.length > 0) return;

        for (const gid of this._guardIds) {
            // Use O(1) Map lookup if available, fallback to O(n) array search
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

        // Ensure remote system has spawned objects if needed
        this._ensureRemoteSystemSpawned();

        // Search current system first
        if (currentSystem.spaceObjects) {
            const so = currentSystem.spaceObjects.find(o => o?.id === this.targetObjectId);
            if (so) {
                this._targetObjectRef = so;
                return;
            }
        }

        // Throttled galaxy-wide search
        this._throttledGalaxySearch();

        // Fallback for sabotage missions
        if (this.type === MISSION_TYPE.SABOTAGE && !this._targetObjectRef) {
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
        // Ensure objects are spawned
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

        // Try proximity match
        if (this._tryProximityMatch(currentSystem)) return;

        // Last resort: create mission-specific object
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

        // Determine spawn position
        let sx = 0, sy = 0;
        const planet = currentSystem.planets?.find(p => p?.name === this.targetPlanetName);

        if (typeof player !== 'undefined' && player?.pos) {
            const angle = (typeof random === 'function') ? random(TWO_PI) : (Math.random() * Math.PI * 2);
            const dist = 600 + Math.max(planet?.size || 0, 200, 800);
            sx = player.pos.x + Math.cos(angle) * dist;
            sy = player.pos.y + Math.sin(angle) * dist;
        } else if (planet?.pos) {
            sx = planet.pos.x + 800;
            sy = planet.pos.y + 120;
        }

        const soNew = new SpaceObject(sx, sy, this.targetObjectType || 'satellite');
        soNew.isMissionSpecific = true;
        currentSystem.spaceObjects = currentSystem.spaceObjects || [];
        currentSystem.spaceObjects.push(soNew);

        this.targetObjectId = soNew.id;
        this._targetObjectRef = soNew;

        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage('Mission target established for sabotage operation.');
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // COMPLETION & FAILURE
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Marks the mission as completed, adds reward to player.
     * @param {Player} playerRef - Reference to the player object.
     */
    complete(playerRef) {
        MISSION_LOG(`Mission.complete() called for: ${this.title}`);

        if (!playerRef?.addCredits) {
            console.error("Mission.complete() called without valid player object!");
            return;
        }

        MISSION_LOG(`  -> Granting reward: ${this.rewardCredits} Credits`);
        playerRef.addCredits(this.rewardCredits);
        this.status = 'Completed';

        // Record completion
        this._recordCompletion(playerRef);

        // Generate news
        this._generateCompletionNews(playerRef);

        // Apply illegal consequences
        if (this.isIllegal) {
            this._applyIllegalConsequences(playerRef);
        }

        // Cleanup
        this._cleanupAssassinationRuntime(playerRef.currentSystem);
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
            } else if (this.type === MISSION_TYPE.SABOTAGE) {
                GameGlobals.newsManager.addSabotageNews(this.targetObjectType, this.targetPlanetName, systemName);
            } else if (BOUNTY_TYPES.has(this.type)) {
                const bountyType = this.type === MISSION_TYPE.BOUNTY_PIRATE ? 'pirate' :
                    this.type === MISSION_TYPE.BOUNTY_POLICE ? 'police' : 'alien';
                GameGlobals.newsManager.addBountyNews(bountyType, this.targetCount || this.progressCount || 1, systemName);
            }
        } catch (e) {
            MISSION_LOG('Error generating news:', e);
        }
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
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage('WANTED: Authorities alerted by this assassination!', '#ff4444');
            }
        } else {
            playerRef.isWanted = true;
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage('WANTED: Authorities alerted!', '#ff4444');
            }
        }
    }

    /** Marks the mission as failed. */
    fail() {
        MISSION_LOG(`Mission Failed: ${this.title}`);
        this.status = 'Failed';
        this._cleanupAssassinationRuntime(null);
    }

    /** Cleanup runtime references for assassination mission */
    _cleanupAssassinationRuntime(currentSystem) {
        // Clear guard principals
        if (Array.isArray(this._guardRefs)) {
            for (const guard of this._guardRefs) {
                if (guard) {
                    guard.principal = null;
                    guard.isAssassinationGuard = false;
                }
            }
        }

        // Reset runtime refs
        this._targetEnemyRef = null;
        this._guardRefs = [];
        this._targetEnemyId = null;
        this._guardIds = [];
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // PROGRESS TRACKING
    // ═══════════════════════════════════════════════════════════════════════════

    /**
     * Updates the progress of the mission.
     * @param {number} amount - Amount to increment progress by (default 1).
     */
    updateProgress(amount = 1) {
        if (this.status !== 'Active') return;

        this.progressCount += amount;

        if (this.targetCount > 0 && this.progressCount >= this.targetCount) {
            this.status = 'Completable';
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Mission Objective Updated: ${this.progressCount}/${this.targetCount}`);
            }
        }
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // DISPLAY METHODS
    // ═══════════════════════════════════════════════════════════════════════════

    /** Returns a short summary string for display on the mission board list. */
    getSummary() {
        let statusPrefix = '';
        if (this.status === 'Completed') statusPrefix = '[COMPLETED] ';
        else if (this.status === 'Failed') statusPrefix = '[FAILED] ';

        // Progress info for active bounty missions
        let progressInfo = '';
        if (this.status === 'Active' && BOUNTY_TYPES.has(this.type) && this.progressCount > 0) {
            progressInfo = ` (${this.progressCount}/${this.targetCount})`;
        }

        return `${statusPrefix}${this.title}${progressInfo} - ${this.rewardCredits}cr`;
    }

    /** Returns a detailed multi-line string for the mission details panel. */
    getDetails() {
        let details = `Title: ${this.title}\n--------------------\n`;
        details += `Status: ${this.status}\n\n`;
        details += `Type: ${this.type}\n`;
        details += `Origin: ${this.originStation} (${this.originSystem})\n`;
        details += `Location: ${this._getLocationString()}\n`;
        details += this._getObjectiveString();
        details += this._getRewardString();
        details += this._getDescriptionString();
        details += this._getSupplementalDetails();
        details += this._getWarningsAndMeta();
        details += this._getProgressString();

        return details;
    }

    /** Get location string for details */
    _getLocationString() {
        if (this.type === MISSION_TYPE.SABOTAGE) {
            if (this.targetPlanetName) return `Near ${this.targetPlanetName} in ${this.destinationSystem || 'the target system'}`;
            if (this.destinationSystem) return this.destinationSystem;
        }

        if (this.destinationSystem) {
            return `${this.destinationStation || 'System Wide'} (${this.destinationSystem})`;
        }

        if (BOUNTY_TYPES.has(this.type)) return 'Any System';

        return 'N/A';
    }

    /** Get objective string for details */
    _getObjectiveString() {
        if (DELIVERY_TYPES.has(this.type) && this.cargoType) {
            return `Objective: Deliver ${this.cargoQuantity}t ${this.cargoType}\n`;
        }

        if (BOUNTY_TYPES.has(this.type) && this.targetDesc) {
            return `Objective: ${this.targetDesc}\n`;
        }

        if (this.type === MISSION_TYPE.ASSASSINATION) {
            return this.targetName ?
                `Objective: Eliminate ${this.targetName}\n` :
                `Objective: Eliminate designated target\n`;
        }

        if (this.type === MISSION_TYPE.SABOTAGE) {
            const desc = this.description || '';
            const hasObjective = desc.includes('Sabotage Objective:') ||
                desc.includes('Objective: Destroy') ||
                desc.toLowerCase().includes('destroy');
            if (!hasObjective) {
                return `Objective: Destroy ${this.targetObjectType || 'Strategic Object'}\n`;
            }
        }

        return '';
    }

    /** Get reward string for details */
    _getRewardString() {
        const label = this.type === MISSION_TYPE.SABOTAGE ? 'Reward (High)' : 'Reward';
        return `${label}: ${this.rewardCredits} Credits\n`;
    }

    /** Get description string for details */
    _getDescriptionString() {
        if (!this.description) return '';
        const suffix = this.type === MISSION_TYPE.SABOTAGE ? '\n' : '\n\n';
        return `\n${this.description}${suffix}`;
    }

    /** Get supplemental details based on mission type */
    _getSupplementalDetails() {
        let details = '';

        if (this.type === MISSION_TYPE.ASSASSINATION) {
            if (this.targetName) details += `Named Target: ${this.targetName}\n`;
            if (this.targetShipType) details += `Target Ship: ${this.targetShipType}\n`;
        }

        if (this.type === MISSION_TYPE.SABOTAGE) {
            if (this.offeringFaction) details += `Offered By: ${this.offeringFaction}\n`;
            if (this.targetFaction) details += `Target Faction: ${this.targetFaction}\n`;
        }

        // Cargo info for non-delivery missions
        if (this.cargoType && !DELIVERY_TYPES.has(this.type)) {
            details += `Cargo: ${this.cargoQuantity}t ${this.cargoType}\n`;
        }

        return details;
    }

    /** Get warnings and meta information */
    _getWarningsAndMeta() {
        let details = '';
        if (this.isIllegal) details += `\n!! This mission involves illegal activity.\n`;
        if (this.timeLimit) details += `Time Limit: ${this.timeLimit} seconds\n`;
        if (this.requiredRep) details += `Requires Reputation: ${this.requiredRep}\n`;
        return details;
    }

    /** Get progress string for bounty missions */
    _getProgressString() {
        if (BOUNTY_TYPES.has(this.type) && this.progressCount > 0) {
            return `Progress: ${this.progressCount}/${this.targetCount}\n`;
        }
        return '';
    }

    // ═══════════════════════════════════════════════════════════════════════════
    // BACKSTORY GENERATION
    // ═══════════════════════════════════════════════════════════════════════════

    /** Generate a flavorful backstory for sabotage missions. */
    _generateSabotageBackstory() {
        const offer = this.offeringFaction || 'A local faction';
        const target = this._deriveSabotageTargetFaction(offer);
        const obj = this.targetObjectType || 'strategic installation';
        const planet = this.targetPlanetName ? `close to ${this.targetPlanetName}` : 'in orbit of a nearby planet';

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

    // ═══════════════════════════════════════════════════════════════════════════
    // SERIALIZATION
    // ═══════════════════════════════════════════════════════════════════════════

    /** Serializes the mission to a JSON-compatible object. */
    toJSON() {
        return {
            id: this.id,
            title: this.title,
            type: this.type,
            description: this.description,
            originSystem: this.originSystem,
            originStation: this.originStation,
            destinationSystem: this.destinationSystem,
            destinationStation: this.destinationStation,
            destinationSystemIndex: this.destinationSystemIndex,
            targetCount: this.targetCount,
            targetName: this.targetName,
            targetShipType: this.targetShipType,
            guardCount: this.guardCount,
            guardShipType: this.guardShipType,
            cargoType: this.cargoType,
            cargoQuantity: this.cargoQuantity,
            rewardCredits: this.rewardCredits,
            isIllegal: this.isIllegal,
            requiredRep: this.requiredRep,
            timeLimit: this.timeLimit,
            activatedAt: this.activatedAt,
            canLeaveSystem: this.canLeaveSystem,
            _targetEnemyId: this._targetEnemyId,
            _guardIds: this._guardIds,
            offeringFaction: this.offeringFaction,
            targetFaction: this.targetFaction,
            targetObjectType: this.targetObjectType,
            targetObjectId: this.targetObjectId,
            targetPlanetName: this.targetPlanetName,
            spawnSystemIndex: this.spawnSystemIndex,
            status: this.status,
            progressCount: this.progressCount
        };
    }

    /**
     * Creates a new Mission instance from a JSON object.
     * @param {Object} json - The JSON object to deserialize.
     * @returns {Mission} The rehydrated Mission object.
     */
    static fromJSON(json) {
        return new Mission(json);
    }
} // End of Mission Class