class EventManager {
    constructor() {
        this.starSystem = null;
        this.player = null;
        this.uiManager = null;

        this.pirateGangNames = [
            "Void Reavers", "Cygnus Marauders", "Nebula Nomads",
            "Quantum Corsairs", "Kygan Syndicate", "Synapse Ghosts", "Solar Scourge"
        ];

        // Globally available constants (ensure these are defined elsewhere)
        // AI_ROLE, AI_STATE, SHIP_DEFINITIONS, gameStateManager
        // p5.js functions: random, floor, lerp, cos, sin, TWO_PI, frameCount

        this.events = [
            {
                type: "ASTEROID_CLUSTER",
                probabilityPerFrame: 0.00005,
                minCooldownFrames: 5 * 60 * 60, // 5 minutes
                warningDurationFrames: 300,     // 5 seconds
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "WARNING: Asteroid cluster detected!",
                    color: "orange",
                    consoleLog: "EventManager: Asteroid cluster warning issued."
                },
                spawnConfig: {
                    entityType: 'asteroid',
                    minEntities: 15,
                    maxEntities: 25, // No rank scaling for asteroids in this example
                    useRankFactorForCount: false, // Asteroids don't scale with rank here
                    spawnRadiusMin: 1600,
                    spawnRadiusMax: 2000,
                    clusterSpreadRadius: 500, // How spread out asteroids are from base point
                    asteroidSizeMin: 25,
                    asteroidSizeMax: 75,
                }
            },
            {
                type: "ALIEN_RAID",
                probabilityPerFrame: 0.00003,
                minCooldownFrames: 10 * 60 * 60, // 10 minutes
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "DANGER: Unidentified alien vessels detected!",
                    color: "magenta",
                    consoleLog: "EventManager: Alien raid warning issued."
                },
                spawnConfig: {
                    entityType: 'enemy',
                    minEntities: 2,
                    maxEntities: 5,
                    useRankFactorForCount: true, // Aliens scale with rank
                    shipSelection: {
                        strategy: 'randomFromList',
                        shipList: ["Thargoid", "GeometricDrone", "BioFrigate"], // Ensure these are valid ALIEN role ships
                        fallbackShip: "BioFrigate" // Ensure this is a valid ALIEN role ship
                    },
                    aiRole: AI_ROLE.ALIEN,
                    spawnRadiusMin: 1800,
                    spawnRadiusMax: 2200,
                    spawnAngleSpreadFactor: 0.3, // Max random offset for spawn angle
                    positionRandomnessFactor: 0, // No additional randomness on radius
                    // additionalEnemySetup: (enemy, player, system) => { /* Alien specific setup if needed */ }
                }
            },
            {
                type: "PIRATE_SWARM",
                probabilityPerFrame: 0.00005,
                minCooldownFrames: 8 * 60 * 60, // 8 minutes
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    messageGenerator: () => `DANGER: ${random(this.pirateGangNames)} pirates detected!`,
                    color: "red",
                    consoleLogGenerator: (gangName) => `EventManager: ${gangName} pirate swarm warning issued.`
                },
                spawnConfig: {
                    entityType: 'enemy',
                    minEntities: 3,
                    maxEntities: 10,
                    useRankFactorForCount: true,
                    shipSelection: {
                        strategy: 'scaledList',
                        shipList: ["Sidewinder", "KraitMKI", "KraitMKII", "Viper", "GladiusFighter"], // Ensure these are PIRATE role ships
                        fallbackShip: "Sidewinder"
                    },
                    aiRole: AI_ROLE.PIRATE,
                    spawnRadiusMin: 1600,
                    spawnRadiusMax: 2000,
                    spawnAngleSpreadFactor: 0.2,
                    positionRandomnessFactor: 0,
                    additionalEnemySetup: (enemy, player) => {
                        enemy.currentState = AI_STATE.APPROACHING;
                        enemy.target = player;
                    }
                }
            },
            {
                type: "BOUNTY_HUNTER_AMBUSH",
                probabilityPerFrame: 0.00002,
                minCooldownFrames: 12 * 60 * 60, // 12 minutes
                warningDurationFrames: 500,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "WARNING: Bounty hunter contracts activated!",
                    color: "orange",
                    consoleLog: "EventManager: Bounty Hunter ambush warning issued."
                },
                spawnConfig: {
                    entityType: 'enemy',
                    minEntities: 0,
                    maxEntities: 3,
                    useRankFactorForCount: true,
                    shipSelection: {
                        strategy: 'filteredRandomFromList',
                        potentialShipList: ["Viper", "GladiusFighter", "GnatInterceptor", "HummingBird", "WaspAssault", "FerDeLance", "ShardInterceptor"],
                        filterAiRole: AI_ROLE.BOUNTY_HUNTER,
                        fallbackShip: "Viper" // Must be a valid BOUNTY_HUNTER ship
                    },
                    aiRole: AI_ROLE.BOUNTY_HUNTER,
                    spawnRadiusMin: 1700,
                    spawnRadiusMax: 2300,
                    spawnAngleSpreadFactor: 0.15, // Used for angleOffset calculation: (i - (num - 1) / 2) * factor
                    positionRandomnessFactor: 200, // Max random offset for radius
                    // Enemy constructor should handle initial state and target for BOUNTY_HUNTER
                }
            },
            {
                type: "COMET",
                probabilityPerFrame: 0.00001,
                minCooldownFrames: 20 * 60 * 60, // 20 minutes
                warningDurationFrames: 600,     // 10 seconds
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "WARNING: Massive comet approaching!",
                    color: "yellow",
                    consoleLog: "EventManager: Comet warning issued."
                },
                spawnConfig: {
                    entityType: 'asteroid',
                    isComet: true,
                    minEntities: 1,
                    maxEntities: 1,
                    useRankFactorForCount: false,
                    spawnRadiusMin: 2000,
                    spawnRadiusMax: 2500,
                    clusterSpreadRadius: 0,
                    asteroidSizeMin: 150,
                    asteroidSizeMax: 200,
                    speed: 8 // towards player
                }
            },
            {
                type: "METEOR_SHOWER",
                probabilityPerFrame: 0.00004,
                minCooldownFrames: 12 * 60 * 60, // 12 minutes
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "WARNING: Meteor shower detected!",
                    color: "orange",
                    consoleLog: "EventManager: Meteor shower warning issued."
                },
                spawnConfig: {
                    entityType: 'asteroid',
                    minEntities: 20,
                    maxEntities: 40,
                    useRankFactorForCount: false,
                    spawnRadiusMin: 1800,
                    spawnRadiusMax: 2200,
                    clusterSpreadRadius: 800,
                    asteroidSizeMin: 10,
                    asteroidSizeMax: 40,
                }
            },
            {
                type: "COSMIC_STORM",
                probabilityPerFrame: 0.00002,
                minCooldownFrames: 25 * 60 * 60, // 25 minutes
                warningDurationFrames: 600,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "ALERT: Cosmic storm forming!",
                    color: "cyan",
                    consoleLog: "EventManager: Cosmic storm warning issued."
                },
                spawnConfig: {
                    entityType: 'cosmicStorm',
                    minEntities: 1,
                    maxEntities: 1,
                    useRankFactorForCount: false,
                    spawnRadiusMin: 1000,
                    spawnRadiusMax: 1500,
                    radius: 800,
                    type: 'electromagnetic'
                }
            },
            {
                type: "DISTRESS_SIGNAL",
                probabilityPerFrame: 0.00003,
                minCooldownFrames: 15 * 60 * 60, // 15 minutes
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "DISTRESS: Ship in need of assistance!",
                    color: "red",
                    consoleLog: "EventManager: Distress signal warning issued."
                },
                spawnConfig: {
                    entityType: 'enemy',
                    minEntities: 1,
                    maxEntities: 1,
                    useRankFactorForCount: false,
                    shipSelection: {
                        strategy: 'randomFromList',
                        shipList: ["Viper", "CobraMKIII"],
                        fallbackShip: "Viper"
                    },
                    aiRole: AI_ROLE.POLICE,
                    spawnRadiusMin: 1600,
                    spawnRadiusMax: 2000,
                    spawnAngleSpreadFactor: 0,
                    positionRandomnessFactor: 0,
                    additionalEnemySetup: (enemy, player) => {
                        enemy.currentState = AI_STATE.IDLE; // Friendly, not attacking
                        enemy.hull = enemy.maxHull * 0.3; // Damaged
                    }
                }
            },
            {
                type: "TRADER_CONVOY",
                probabilityPerFrame: 0.000025,
                minCooldownFrames: 18 * 60 * 60, // 18 minutes
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "TRADE: Merchant convoy approaching!",
                    color: "green",
                    consoleLog: "EventManager: Trader convoy warning issued."
                },
                spawnConfig: {
                    entityType: 'enemy',
                    minEntities: 2,
                    maxEntities: 5,
                    useRankFactorForCount: false,
                    shipSelection: {
                        strategy: 'randomFromList',
                        shipList: ["CobraMKIII", "Python", "Type6"],
                        fallbackShip: "CobraMKIII"
                    },
                    aiRole: AI_ROLE.HAULER,
                    spawnRadiusMin: 1800,
                    spawnRadiusMax: 2200,
                    spawnAngleSpreadFactor: 0.3,
                    positionRandomnessFactor: 100,
                    additionalEnemySetup: (enemy, player) => {
                        enemy.currentState = AI_STATE.IDLE; // Not hostile
                    }
                }
            },
            {
                type: "NAVAL_PATROL",
                probabilityPerFrame: 0.00002,
                minCooldownFrames: 20 * 60 * 60, // 20 minutes
                warningDurationFrames: 400,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "PATROL: Naval forces detected!",
                    color: "blue",
                    consoleLog: "EventManager: Naval patrol warning issued."
                },
                spawnConfig: {
                    entityType: 'enemy',
                    minEntities: 3,
                    maxEntities: 6,
                    useRankFactorForCount: true,
                    shipSelection: {
                        strategy: 'randomFromList',
                        shipList: ["Viper", "GladiusFighter", "FederalCorvette"],
                        fallbackShip: "Viper"
                    },
                    aiRole: AI_ROLE.POLICE,
                    spawnRadiusMin: 1700,
                    spawnRadiusMax: 2100,
                    spawnAngleSpreadFactor: 0.2,
                    positionRandomnessFactor: 150,
                    additionalEnemySetup: (enemy, player) => {
                        enemy.currentState = AI_STATE.PATROLLING;
                    }
                }
            },
            {
                type: "ALIEN_ARTIFACT",
                probabilityPerFrame: 0.000005,
                minCooldownFrames: 30 * 60 * 60, // 30 minutes
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                warningConfig: {
                    message: "ANOMALY: Unknown artifact detected!",
                    color: "magenta",
                    consoleLog: "EventManager: Alien artifact warning issued."
                },
                spawnConfig: {
                    entityType: 'cargo',
                    minEntities: 1,
                    maxEntities: 1,
                    useRankFactorForCount: false,
                    spawnRadiusMin: 1500,
                    spawnRadiusMax: 2000,
                    cargoType: 'Alien Artifact',
                    quantity: 1
                }
            }
        ];
    }

    // New events added below

    initializeReferences(starSystem, player, uiManager) {
        this.starSystem = starSystem;
        this.player = player;
        this.uiManager = uiManager;
    }

    update() {
        if (!this.starSystem || !this.player || !this.uiManager || gameStateManager.currentState !== "IN_FLIGHT") {
            return;
        }

        for (let i = 0, len = this.events.length; i < len; i++) {
            const event = this.events[i];
            if (event.isWarningActive) {
                if (frameCount >= event.eventTriggerFrame) {
                    this.executeConfiguredEvent(event.type);
                    event.isWarningActive = false;
                    event.lastTriggeredFrame = frameCount;
                }
            } else {
                if (frameCount < event.lastTriggeredFrame + event.minCooldownFrames) {
                    continue;
                }
                if (random() < event.probabilityPerFrame) {
                    this.initiateEventWarning(event.type);
                }
            }
        }
    }

    initiateEventWarning(eventType) {
        const event = this.events.find(e => e.type === eventType);
        if (!event || event.isWarningActive) return;

        event.isWarningActive = true;
        event.eventTriggerFrame = frameCount + event.warningDurationFrames;

        let message = event.warningConfig.message;
        if (typeof event.warningConfig.messageGenerator === 'function') {
            message = event.warningConfig.messageGenerator();
        }

        if (this.uiManager) {
            const warningDurationMillis = (event.warningDurationFrames / 60) * 1000;
            this.uiManager.addMessage(message, event.warningConfig.color, warningDurationMillis);
        }

        let consoleMsg = event.warningConfig.consoleLog;
        if (typeof event.warningConfig.consoleLogGenerator === 'function') {
            // Pass relevant data if the generator needs it, e.g., the dynamic part of the message
            const dynamicPart = message.substring(message.indexOf(":") + 2); // Example to get gang name
            consoleMsg = event.warningConfig.consoleLogGenerator(dynamicPart);
        }
        EVENT_LOG(`${consoleMsg} Event will trigger in ${event.warningDurationFrames} frames.`);
    }

    executeConfiguredEvent(eventType) {
        const event = this.events.find(e => e.type === eventType);
        if (!event) {
            console.error(`EventManager: Event type ${eventType} not found for execution.`);
            return;
        }

        if (!this.starSystem || !this.player || !this.player.pos) {
            console.error(`EventManager: Cannot execute ${eventType} - missing system/player references.`);
            return;
        }

        if (event.spawnConfig) {
            if (event.spawnConfig.entityType === 'asteroid') {
                this._executeAsteroidSpawn(event);
            } else if (event.spawnConfig.entityType === 'enemy') {
                this._executeEnemySpawn(event);
            } else if (event.spawnConfig.entityType === 'cosmicStorm') {
                this._executeCosmicStormSpawn(event);
            } else if (event.spawnConfig.entityType === 'cargo') {
                this._executeCargoSpawn(event);
            } else {
                console.warn(`EventManager: Unknown entityType '${event.spawnConfig.entityType}' for event ${eventType}.`);
            }
        } else {
            console.warn(`EventManager: No spawnConfig for event type ${eventType}. If it's not a spawn event, implement custom execution.`);
        }
    }

    _getEliteRankFactor() {
        const eliteRankings = [
            "Harmless", "Mostly Harmless", "Poor", "Average", "Above Average",
            "Competent", "Dangerous", "Deadly", "Elite"
        ];
        const playerRankIndex = eliteRankings.indexOf(this.player.getEliteRating());
        const maxRankIndex = eliteRankings.length - 1;
        const validPlayerRankIndex = playerRankIndex === -1 ? 0 : playerRankIndex;
        return Math.min(validPlayerRankIndex / maxRankIndex, 1);
    }

    _calculateNumberOfEntities(min, max, useRankFactor, rankFactor) {
        if (useRankFactor) {
            return floor(lerp(min, max, rankFactor) + 0.5);
        }
        return floor(random(min, max)); // If not using rank factor, pick random in range
    }

    _selectShipType(selectionConfig, rankFactor) {
        let shipTypeToSpawn;
        let availableShips;

        if (!SHIP_DEFINITIONS) {
            console.error("SHIP_DEFINITIONS is not available.");
            return selectionConfig.fallbackShip || null;
        }
        if (!AI_ROLE && (selectionConfig.strategy === 'filteredRandomFromList' || selectionConfig.filterAiRole)) {
             console.error("AI_ROLE is not available for ship filtering.");
             return selectionConfig.fallbackShip || null;
        }


        switch (selectionConfig.strategy) {
            case 'scaledList':
                const shipTypeIndex = floor(rankFactor * (selectionConfig.shipList.length - 1));
                shipTypeToSpawn = selectionConfig.shipList[shipTypeIndex];
                if (!SHIP_DEFINITIONS[shipTypeToSpawn]) {
                    console.warn(`EventManager: Selected ship ${shipTypeToSpawn} (scaledList) not in SHIP_DEFINITIONS. Falling back to ${selectionConfig.fallbackShip}.`);
                    shipTypeToSpawn = selectionConfig.fallbackShip;
                }
                break;
            case 'randomFromList':
                availableShips = selectionConfig.shipList.filter(name => SHIP_DEFINITIONS[name]);
                if (availableShips.length > 0) {
                    shipTypeToSpawn = random(availableShips);
                } else {
                    console.warn(`EventManager: No valid ships in list for randomFromList. Falling back to ${selectionConfig.fallbackShip}.`);
                    shipTypeToSpawn = selectionConfig.fallbackShip;
                }
                break;
            case 'filteredRandomFromList':
                availableShips = selectionConfig.potentialShipList.filter(name => {
                    const def = SHIP_DEFINITIONS[name];
                    return def && def.aiRoles && def.aiRoles.includes(selectionConfig.filterAiRole);
                });
                if (availableShips.length > 0) {
                    shipTypeToSpawn = random(availableShips);
                } else {
                    console.warn(`EventManager: No valid ships from potential list for role ${selectionConfig.filterAiRole}. Trying fallback ${selectionConfig.fallbackShip}.`);
                    const fallbackDef = SHIP_DEFINITIONS[selectionConfig.fallbackShip];
                    if (fallbackDef && fallbackDef.aiRoles && fallbackDef.aiRoles.includes(selectionConfig.filterAiRole)) {
                        shipTypeToSpawn = selectionConfig.fallbackShip;
                    } else {
                        console.error(`EventManager: Fallback ship ${selectionConfig.fallbackShip} not suitable or not found for role ${selectionConfig.filterAiRole}. Cannot select ship.`);
                        return null;
                    }
                }
                break;
            default:
                console.error(`EventManager: Unknown ship selection strategy: ${selectionConfig.strategy}. Using fallback ${selectionConfig.fallbackShip}.`);
                shipTypeToSpawn = selectionConfig.fallbackShip;
        }
        
        if (!SHIP_DEFINITIONS[shipTypeToSpawn]) {
            console.error(`EventManager: Final selected ship type ${shipTypeToSpawn} is not defined in SHIP_DEFINITIONS. Cannot spawn.`);
            return null;
        }
        return shipTypeToSpawn;
    }

    _executeAsteroidSpawn(event) {
        const config = event.spawnConfig;
        const rankFactor = config.useRankFactorForCount ? this._getEliteRankFactor() : 0; // Rank factor is 0 if not used for count
        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, rankFactor);

        const clusterSpawnRadiusFromPlayer = random(config.spawnRadiusMin, config.spawnRadiusMax);
        const clusterAngleWithPlayer = random(TWO_PI);

        const baseSpawnX = this.player.pos.x + cos(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;
        const baseSpawnY = this.player.pos.y + sin(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;

        EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} asteroids near (${baseSpawnX.toFixed(0)}, ${baseSpawnY.toFixed(0)})`);

        for (let i = 0; i < numToSpawn; i++) {
            const offsetX = random(-config.clusterSpreadRadius, config.clusterSpreadRadius);
            const offsetY = random(-config.clusterSpreadRadius, config.clusterSpreadRadius);
            const asteroidSize = random(config.asteroidSizeMin, config.asteroidSizeMax);
            
            const asteroid = new Asteroid(baseSpawnX + offsetX, baseSpawnY + offsetY, asteroidSize);
            
            // Special comet setup
            if (config.isComet && asteroid) {
                asteroid.isComet = true;
                // Set velocity towards player
                const angleToPlayer = atan2(this.player.pos.y - asteroid.pos.y, this.player.pos.x - asteroid.pos.x);
                asteroid.vel = p5.Vector.fromAngle(angleToPlayer).mult(config.speed || 5);
            }
            
            this.starSystem.asteroids.push(asteroid);
        }
    }

    _executeEnemySpawn(event) {
        const config = event.spawnConfig;
        const rankFactor = this._getEliteRankFactor(); // Always get for ship selection, even if not for count

        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, rankFactor);
        if (numToSpawn <= 0) {
            EVENT_LOG(`EventManager: Calculated 0 enemies to spawn for ${event.type}. Skipping.`);
            return;
        }

        const shipTypeToSpawn = this._selectShipType(config.shipSelection, rankFactor);
        if (!shipTypeToSpawn) {
            console.error(`EventManager: Could not select a ship type for ${event.type}. Aborting spawn.`);
            return;
        }

        const baseSpawnRadius = random(config.spawnRadiusMin, config.spawnRadiusMax);
        const baseSpawnAngle = random(TWO_PI);

        EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} ${shipTypeToSpawn}(s) near the player. Player rank factor: ${rankFactor.toFixed(2)}`);

        for (let i = 0; i < numToSpawn; i++) {
            let currentSpawnAngle = baseSpawnAngle;
            let currentSpawnRadius = baseSpawnRadius;

            // Angle spread logic (consistent with original Pirate and Bounty Hunter)
            if (config.spawnAngleSpreadFactor !== 0) {
                 // For PirateSwarm-like spread (random offset)
                if (event.type === "PIRATE_SWARM" || event.type === "ALIEN_RAID") { // Alien raid also uses this simpler spread
                    currentSpawnAngle += random(-config.spawnAngleSpreadFactor, config.spawnAngleSpreadFactor);
                } 
                // For BountyHunter-like distinct angle offset
                else if (event.type === "BOUNTY_HUNTER_AMBUSH" && numToSpawn > 1) { 
                    const angleOffset = (i - (numToSpawn - 1) / 2) * config.spawnAngleSpreadFactor;
                    currentSpawnAngle += angleOffset;
                }
            }
            
            // Position randomness on radius (consistent with original Bounty Hunter)
            if (config.positionRandomnessFactor !== 0) {
                currentSpawnRadius += random(-config.positionRandomnessFactor, config.positionRandomnessFactor);
            }

            const offsetX = cos(currentSpawnAngle) * currentSpawnRadius;
            const offsetY = sin(currentSpawnAngle) * currentSpawnRadius;
            
            const spawnX = this.player.pos.x + offsetX;
            const spawnY = this.player.pos.y + offsetY;

            const newEnemy = new Enemy(
                spawnX,
                spawnY,
                this.player,
                shipTypeToSpawn,
                config.aiRole
            );

            newEnemy.currentSystem = this.starSystem;
            if (typeof newEnemy.calculateRadianProperties === 'function') {
                newEnemy.calculateRadianProperties();
            }
            if (typeof newEnemy.initializeColors === 'function') {
                newEnemy.initializeColors();
            }

            if (typeof config.additionalEnemySetup === 'function') {
                config.additionalEnemySetup(newEnemy, this.player, this.starSystem);
            }
            
            this.starSystem.addEnemy(newEnemy);
        }
    }

    _executeCosmicStormSpawn(event) {
        const config = event.spawnConfig;
        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, 0);

        const spawnRadius = random(config.spawnRadiusMin, config.spawnRadiusMax);
        const spawnAngle = random(TWO_PI);

        const spawnX = this.player.pos.x + cos(spawnAngle) * spawnRadius;
        const spawnY = this.player.pos.y + sin(spawnAngle) * spawnRadius;

        EVENT_LOG(`EventManager: Spawning ${event.type}: cosmic storm at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);

        for (let i = 0; i < numToSpawn; i++) {
            const storm = new CosmicStorm(spawnX, spawnY, config.radius || 500, config.type || 'electromagnetic');
            this.starSystem.cosmicStorms.push(storm);
        }
    }

    _executeCargoSpawn(event) {
        const config = event.spawnConfig;
        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, 0);

        const spawnRadius = random(config.spawnRadiusMin, config.spawnRadiusMax);
        const spawnAngle = random(TWO_PI);

        const spawnX = this.player.pos.x + cos(spawnAngle) * spawnRadius;
        const spawnY = this.player.pos.y + sin(spawnAngle) * spawnRadius;

        EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} cargo at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);

        for (let i = 0; i < numToSpawn; i++) {
            const cargo = new Cargo(spawnX, spawnY, config.cargoType || 'Unknown', config.quantity || 1);
            this.starSystem.addCargo(cargo);
        }
    }
}