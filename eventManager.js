// ****** EventManager.js ******
// Handles random events, spawning, and probability management

class EventManager {
    constructor() {
        this.starSystem = null;
        this.player = null;
        this.uiManager = null;

        this.pirateGangNames = [
            "Void Reavers", "Cygnus Marauders", "Nebula Nomads",
            "Quantum Corsairs", "Kygan Syndicate", "Synapse Ghosts", "Solar Scourge"
        ];

        // Initialize ship groups dynamically from SHIP_DEFINITIONS
        this.shipGroups = {
            POLICE: [],
            PIRATE: [],
            TRADER: [], // Maps to HAULER/TRANSPORT
            ALIEN: [],
            MINER: [],
            MILITARY: [], // Maps to COMBAT/MILITARY
            BOUNTY_HUNTER: []
        };

        // We initialize groups and events immediately, but SHIP_DEFINITIONS might not be fully populated 
        // if this runs too early. However, in the current load order, ships.js is before sketch.js/eventManager.
        this._initializeShipGroups();
        this._initializeEvents();
        
        this.activeEvents = []; // Track active persistent events { id, expires, type }
    }

    _initializeShipGroups() {
        if (typeof SHIP_DEFINITIONS === 'undefined') {
            console.warn("EventManager: SHIP_DEFINITIONS not found during initialization. Ship groups will be empty.");
            return;
        }

        for (const [key, def] of Object.entries(SHIP_DEFINITIONS)) {
            if (!def.aiRoles) continue;

            if (def.aiRoles.includes("POLICE")) this.shipGroups.POLICE.push(key);
            if (def.aiRoles.includes("PIRATE")) this.shipGroups.PIRATE.push(key);
            if (def.aiRoles.includes("HAULER") || def.aiRoles.includes("TRANSPORT") || def.aiRoles.includes("TRADER")) this.shipGroups.TRADER.push(key);
            if (def.aiRoles.includes("ALIEN")) this.shipGroups.ALIEN.push(key);
            if (def.aiRoles.includes("MINER")) this.shipGroups.MINER.push(key);
            if (def.aiRoles.includes("MILITARY") || def.aiRoles.includes("COMBAT")) this.shipGroups.MILITARY.push(key);
            if (def.aiRoles.includes("BOUNTY_HUNTER")) this.shipGroups.BOUNTY_HUNTER.push(key);
        }

        // Fallbacks to ensure lists aren't empty
        if (this.shipGroups.POLICE.length === 0) this.shipGroups.POLICE.push('Viper');
        if (this.shipGroups.PIRATE.length === 0) this.shipGroups.PIRATE.push('Sidewinder');
        if (this.shipGroups.TRADER.length === 0) this.shipGroups.TRADER.push('Type6Transporter');
        if (this.shipGroups.ALIEN.length === 0) this.shipGroups.ALIEN.push('Thargoid');
        if (this.shipGroups.MILITARY.length === 0) this.shipGroups.MILITARY.push('Viper');
        if (this.shipGroups.BOUNTY_HUNTER.length === 0) this.shipGroups.BOUNTY_HUNTER.push('Viper');

        console.log("EventManager: Ship groups initialized.", this.shipGroups);
    }

    _initializeEvents() {
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
                    maxEntities: 25,
                    useRankFactorForCount: false,
                    spawnRadiusMin: 1600,
                    spawnRadiusMax: 2000,
                    clusterSpreadRadius: 500,
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
                    useRankFactorForCount: true,
                    shipSelection: {
                        strategy: 'randomFromList',
                        shipList: this.shipGroups.ALIEN,
                        fallbackShip: "Thargoid"
                    },
                    aiRole: AI_ROLE.ALIEN,
                    spawnRadiusMin: 1800,
                    spawnRadiusMax: 2200,
                    spawnAngleSpreadFactor: 0.3,
                    positionRandomnessFactor: 0
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
                        strategy: 'randomFromList', // Changed to randomFromList for broader variety
                        shipList: this.shipGroups.PIRATE,
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
                    minEntities: 1,
                    maxEntities: 3,
                    useRankFactorForCount: true,
                    shipSelection: {
                        strategy: 'randomFromList',
                        shipList: this.shipGroups.BOUNTY_HUNTER,
                        fallbackShip: "Viper"
                    },
                    aiRole: AI_ROLE.BOUNTY_HUNTER,
                    spawnRadiusMin: 1700,
                    spawnRadiusMax: 2300,
                    spawnAngleSpreadFactor: 0.15,
                    positionRandomnessFactor: 200
                }
            },
            {
                type: "COMET",
                probabilityPerFrame: 0.00001,
                minCooldownFrames: 20 * 60 * 60,
                warningDurationFrames: 600,
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
                    spawnRadiusMin: 8000,
                    spawnRadiusMax: 9000,
                    clusterSpreadRadius: 0,
                    asteroidSizeMin: 150,
                    asteroidSizeMax: 200,
                    speed: 8
                }
            },
            {
                type: "METEOR_SHOWER",
                probabilityPerFrame: 0.00004,
                minCooldownFrames: 12 * 60 * 60,
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
                minCooldownFrames: 25 * 60 * 60,
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
                minCooldownFrames: 15 * 60 * 60,
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
                        shipList: this.shipGroups.POLICE,
                        fallbackShip: "Viper"
                    },
                    aiRole: AI_ROLE.POLICE,
                    spawnRadiusMin: 1600,
                    spawnRadiusMax: 2000,
                    spawnAngleSpreadFactor: 0,
                    positionRandomnessFactor: 0,
                    additionalEnemySetup: (enemy, player) => {
                        enemy.currentState = AI_STATE.IDLE;
                        enemy.hull = enemy.maxHull * 0.3; // Damaged
                    }
                }
            },
            {
                type: "TRADER_CONVOY",
                probabilityPerFrame: 0.000025,
                minCooldownFrames: 18 * 60 * 60,
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
                        shipList: this.shipGroups.TRADER,
                        fallbackShip: "Type6Transporter"
                    },
                    aiRole: AI_ROLE.HAULER,
                    spawnRadiusMin: 1800,
                    spawnRadiusMax: 2200,
                    spawnAngleSpreadFactor: 0.3,
                    positionRandomnessFactor: 100,
                    additionalEnemySetup: (enemy, player) => {
                        enemy.currentState = AI_STATE.IDLE;
                    }
                }
            },
            {
                type: "NAVAL_PATROL",
                probabilityPerFrame: 0.00002,
                minCooldownFrames: 20 * 60 * 60,
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
                        shipList: this.shipGroups.MILITARY,
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
                minCooldownFrames: 30 * 60 * 60,
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

        // Add dynamic market/social events
        this._addDynamicEvents();
    }

    _addDynamicEvents() {
        this.events.push(
            { type: "MARKET_SHORTAGE", probabilityPerFrame: 0.00004, minCooldownFrames: 12 * 60 * 60, warningDurationFrames: 240, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "MARKET ALERT: Local shortage detected!", color: "orange", consoleLog: "EventManager: Market shortage warning issued." } },
            { type: "MARKET_SURPLUS", probabilityPerFrame: 0.00003, minCooldownFrames: 12 * 60 * 60, warningDurationFrames: 240, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "MARKET NOTICE: Oversupply affecting prices.", color: "green", consoleLog: "EventManager: Market surplus warning issued." } },
            { type: "BLACK_MARKET_AUCTION", probabilityPerFrame: 0.00001, minCooldownFrames: 30 * 60 * 60, warningDurationFrames: 600, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "UNDERTONE: Black market auction incoming.", color: "purple", consoleLog: "EventManager: Black market auction warning issued." } },
            { type: "SMUGGLING_BUST", probabilityPerFrame: 0.00002, minCooldownFrames: 20 * 60 * 60, warningDurationFrames: 300, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "ENFORCEMENT: Smuggling interdiction underway.", color: "red", consoleLog: "EventManager: Smuggling bust warning issued." } },
            { type: "BLOCKADE", probabilityPerFrame: 0.00001, minCooldownFrames: 40 * 60 * 60, warningDurationFrames: 600, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "BLOCKADE: Trade lanes restricted by military.", color: "blue", consoleLog: "EventManager: Blockade warning issued." } },
            { type: "DIPLOMATIC_VISIT", probabilityPerFrame: 0.00001, minCooldownFrames: 45 * 60 * 60, warningDurationFrames: 400, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "CIVIC: Diplomatic envoy arriving.", color: "teal", consoleLog: "EventManager: Diplomatic visit warning issued." } },
            { type: "TECH_BREAKTHROUGH", probabilityPerFrame: 0.000008, minCooldownFrames: 60 * 60 * 60, warningDurationFrames: 600, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "RESEARCH: New tech prototype surfaced.", color: "magenta", consoleLog: "EventManager: Tech breakthrough warning issued." } },
            { type: "STATION_STRIKE", probabilityPerFrame: 0.000012, minCooldownFrames: 30 * 60 * 60, warningDurationFrames: 300, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "LABOR: Station strike in progress.", color: "orange", consoleLog: "EventManager: Station strike warning issued." } },
            { type: "POWER_OUTAGE", probabilityPerFrame: 0.000015, minCooldownFrames: 25 * 60 * 60, warningDurationFrames: 240, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "ALERT: Station power outage reported.", color: "yellow", consoleLog: "EventManager: Power outage warning issued." } },
            { type: "SABOTAGE", probabilityPerFrame: 0.00001, minCooldownFrames: 40 * 60 * 60, warningDurationFrames: 300, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "SABOTAGE: Infrastructure damage detected.", color: "crimson", consoleLog: "EventManager: Sabotage warning issued." } },
            { type: "MINING_BOOM", probabilityPerFrame: 0.00002, minCooldownFrames: 35 * 60 * 60, warningDurationFrames: 300, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "MINING: High-yield discovery announced.", color: "olive", consoleLog: "EventManager: Mining boom warning issued." } },
            { type: "MINE_ACCIDENT", probabilityPerFrame: 0.00001, minCooldownFrames: 30 * 60 * 60, warningDurationFrames: 240, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "HAZARD: Mining accident - emergency response.", color: "orange", consoleLog: "EventManager: Mine accident warning issued." } },
            { type: "SOLAR_FLARE", probabilityPerFrame: 0.000008, minCooldownFrames: 50 * 60 * 60, warningDurationFrames: 600, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "SPACE WEATHER: Solar flare activity detected.", color: "yellow", consoleLog: "EventManager: Solar flare warning issued." } },
            { type: "QUARANTINE", probabilityPerFrame: 0.000006, minCooldownFrames: 80 * 60 * 60, warningDurationFrames: 600, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "QUARANTINE: Contagion measures in effect.", color: "purple", consoleLog: "EventManager: Quarantine warning issued." } },
            { type: "REFUGEE_INFLUX", probabilityPerFrame: 0.00001, minCooldownFrames: 40 * 60 * 60, warningDurationFrames: 240, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "CIVIC: Refugee influx stresses local services.", color: "brown", consoleLog: "EventManager: Refugee influx warning issued." } },
            { type: "RARE_COMMODITY", probabilityPerFrame: 0.00001, minCooldownFrames: 50 * 60 * 60, warningDurationFrames: 300, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "DISCOVERY: Rare commodity located nearby.", color: "gold", consoleLog: "EventManager: Rare commodity warning issued." }, spawnConfig: { entityType: 'cargo', minEntities: 1, maxEntities: 2, spawnRadiusMin: 1500, spawnRadiusMax: 3000, cargoType: 'Rare Ore', quantity: 1 } },
            { type: "HACKER_ATTACK", probabilityPerFrame: 0.000009, minCooldownFrames: 36 * 60 * 60, warningDurationFrames: 240, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "CYBER: Systems under hacker attack.", color: "purple", consoleLog: "EventManager: Hacker attack warning issued." } },
            { type: "SALVAGE_OPPORTUNITY", probabilityPerFrame: 0.00002, minCooldownFrames: 12 * 60 * 60, warningDurationFrames: 240, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "SALVAGE: Wreckage detected — high-value salvage possible.", color: "silver", consoleLog: "EventManager: Salvage opportunity warning issued." }, spawnConfig: { entityType: 'cargo', minEntities: 1, maxEntities: 3, spawnRadiusMin: 1600, spawnRadiusMax: 3000, cargoType: 'Metals', quantity: 2 } },
            { type: "BOUNTY_INCREASE", probabilityPerFrame: 0.000015, minCooldownFrames: 28 * 60 * 60, warningDurationFrames: 300, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "NOTICE: Bounties increased on wanted criminals.", color: "red", consoleLog: "EventManager: Bounty increase warning issued." } },
            { type: "REPUTATION_SCANDAL", probabilityPerFrame: 0.000007, minCooldownFrames: 40 * 60 * 60, warningDurationFrames: 360, lastTriggeredFrame: -Infinity, isWarningActive: false, eventTriggerFrame: 0, warningConfig: { message: "SCANDAL: Reputation-shifting news is spreading.", color: "pink", consoleLog: "EventManager: Reputation scandal warning issued." } }
        );
    }

    initializeReferences(starSystem, player, uiManager) {
        this.starSystem = starSystem;
        this.player = player;
        this.uiManager = uiManager;
    }

    update() {
        if (!this.starSystem || !this.player || !this.uiManager || gameStateManager.currentState !== "IN_FLIGHT") {
            return;
        }

        this._updateActiveEvents();

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

    _updateActiveEvents() {
        const now = millis();
        for (let i = this.activeEvents.length - 1; i >= 0; i--) {
            const event = this.activeEvents[i];
            if (now >= event.expires) {
                this.uiManager.removePersistentMessage(event.id);
                this.activeEvents.splice(i, 1);
            }
        }
    }

    _addPersistentEvent(id, message, color, durationMs) {
        if (!this.uiManager) return;
        this.uiManager.addPersistentMessage(id, message, color);
        
        const existingIdx = this.activeEvents.findIndex(e => e.id === id);
        if (existingIdx >= 0) {
            this.activeEvents.splice(existingIdx, 1);
        }
        
        this.activeEvents.push({
            id: id,
            expires: millis() + durationMs,
            type: 'PERSISTENT'
        });
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
            const dynamicPart = message.substring(message.indexOf(":") + 2);
            consoleMsg = event.warningConfig.consoleLogGenerator(dynamicPart);
        }
        if (typeof EVENT_LOG === 'function') {
            EVENT_LOG(`${consoleMsg} Event will trigger in ${event.warningDurationFrames} frames.`);
        } else {
            console.log(`${consoleMsg} Event will trigger in ${event.warningDurationFrames} frames.`);
        }
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
            this._executeCustomEvent(eventType);
        }
    }

    _executeCustomEvent(eventType) {
        switch (eventType) {
            case 'MARKET_SHORTAGE': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const commodity = this._pickCommodity(station.market, comm => comm && comm.stock > 1);
                if (!commodity) return;
                const baseline = commodity.baseStock || commodity.stock || 10;
                const request = Math.max(1, Math.round(baseline * random(0.22, 0.45)));
                const removed = station.market.consumeStockForNPC(commodity.name, request, { allowPartial: true });
                if (removed > 0) {
                    const msg = `${station.name}: ${commodity.name} shortage (-${removed} units)`;
                    this._notifyEvent(msg, 'orange');
                    this._addPersistentEvent(`SHORTAGE_${station.name}`, `${station.name}: ${commodity.name} Shortage (High Prices)`, 'orange', 180000);
                }
                break;
            }
            case 'MARKET_SURPLUS': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const commodity = this._pickCommodity(station.market);
                if (!commodity) return;
                const baseline = commodity.baseStock || commodity.stock || 8;
                const grant = Math.max(1, Math.round(baseline * random(0.25, 0.5)));
                const added = station.market.addStockFromNPC(commodity.name, grant);
                if (added > 0) {
                    const msg = `${station.name}: ${commodity.name} oversupply (+${added} units)`;
                    this._notifyEvent(msg, 'green');
                    this._addPersistentEvent(`SURPLUS_${station.name}`, `${station.name}: ${commodity.name} Surplus (Low Prices)`, 'green', 180000);
                }
                break;
            }
            case 'BLACK_MARKET_AUCTION': {
                const types = ['Narcotics', 'Weapons', 'Slaves'];
                const count = floor(random(1, 4));
                const spawnedTypes = new Set();
                for (let i = 0; i < count; i++) {
                    const angle = random(TWO_PI);
                    const r = random(1600, 3000);
                    const x = this.player.pos.x + cos(angle) * r;
                    const y = this.player.pos.y + sin(angle) * r;
                    const t = random(types);
                    spawnedTypes.add(t);
                    const qty = Math.max(1, floor(random(1, 4)));
                    this.starSystem.addCargo(new Cargo(x, y, t, qty));
                }
                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`${systemLabel}: Black market auction seeded ${count} caches (${Array.from(spawnedTypes).join(', ')})`, 'purple');
                break;
            }
            case 'SMUGGLING_BUST': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const illegal = station.market.commodities?.filter(c => c && c.isLegal === false && c.stock > 0) || [];
                let seizedName = null;
                let seizedAmount = 0;
                if (illegal.length) {
                    const chosen = random(illegal);
                    const request = Math.max(1, Math.round((chosen.baseStock || chosen.stock || 10) * random(0.3, 0.6)));
                    seizedAmount = station.market.consumeStockForNPC(chosen.name, request, { allowPartial: true });
                    seizedName = chosen.name;
                }
                const spawnCount = Math.max(2, Math.floor(random(2, 5)));
                const anchor = station.pos || this.player.pos;
                for (let i = 0; i < spawnCount; i++) {
                    const ang = random(TWO_PI);
                    const dist = random(900, 1700);
                    const sx = anchor.x + cos(ang) * dist;
                    const sy = anchor.y + sin(ang) * dist;
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.POLICE, (enemy) => {
                        enemy.currentState = AI_STATE.PATROLLING;
                        enemy.target = null;
                    });
                }
                const seizedText = seizedAmount > 0 && seizedName ? `${seizedAmount} ${seizedName} seized` : 'Contraband routes disrupted';
                this._notifyEvent(`${station.name}: Smuggling bust (${seizedText}; ${spawnCount} patrol ships dispatched)`, 'red');
                break;
            }
            case 'BLOCKADE': {
                const durationMs = 60 * 1000;
                this.starSystem.blockadeExpires = millis() + durationMs;
                const station = this._pickRandomStation();
                const anchor = station?.pos || this.player.pos;
                const anchorName = this._formatStationLabel(station);
                const spawnCount = Math.max(3, Math.floor(random(3, 6)));
                const radius = (station?.dockingRadius || 800) + random(400, 900);
                for (let i = 0; i < spawnCount; i++) {
                    const angle = random(TWO_PI);
                    const dist = radius + random(-150, 150);
                    const sx = anchor.x + cos(angle) * dist;
                    const sy = anchor.y + sin(angle) * dist;
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.GUARD, (enemy) => {
                        enemy.principal = station || this.player;
                        enemy.currentState = AI_STATE.GUARDING;
                    });
                }
                this._notifyEvent(`${anchorName}: Naval blockade established (${spawnCount} gunships)`, 'blue', durationMs);
                this._addPersistentEvent('BLOCKADE', `${anchorName}: Naval Blockade Active`, 'blue', durationMs);
                break;
            }
            case 'DIPLOMATIC_VISIT': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const currentLux = station.market.getAvailableStock ? station.market.getAvailableStock('Luxury Goods') : 0;
                const added = station.market.addStockFromNPC('Luxury Goods', Math.max(5, Math.round((currentLux || 20) * random(0.3, 0.6))));
                this._notifyEvent(`${station.name}: Diplomatic envoy delivers gifts (+${added} Luxury Goods)`, 'teal');
                break;
            }
            case 'TECH_BREAKTHROUGH': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const added = station.market.addStockFromNPC('Adv Components', Math.max(2, Math.round(random(3, 7))));
                this._notifyEvent(`${station.name}: Tech breakthrough (+${added} Adv Components)`, 'magenta');
                break;
            }
            case 'STATION_STRIKE': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const availableFood = station.market.getAvailableStock ? station.market.getAvailableStock('Food') : 0;
                const consumed = station.market.consumeStockForNPC('Food', Math.max(1, Math.round((availableFood || 15) * random(0.2, 0.4))), { allowPartial: true });
                this._notifyEvent(`${station.name}: Strike limits services (-${consumed} Food)`, 'orange');
                this._addPersistentEvent(`STRIKE_${station.name}`, `${station.name}: Station Strike (Services Limited)`, 'orange', 120000);
                break;
            }
            case 'POWER_OUTAGE': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                station.powerOutageExpires = millis() + 45 * 1000;
                const lostComputers = this._drainCommodityByPercent(station.market, 'Computers', 0.25, 0.45);
                const lostMachinery = this._drainCommodityByPercent(station.market, 'Machinery', 0.2, 0.35);
                const lostAdv = this._drainCommodityByPercent(station.market, 'Adv Components', 0.15, 0.3);
                const parts = [];
                if (lostComputers) parts.push(`${lostComputers} Computers`);
                if (lostMachinery) parts.push(`${lostMachinery} Machinery`);
                if (lostAdv) parts.push(`${lostAdv} Adv Components`);
                const summary = parts.length ? parts.join(', ') : 'systems offline';
                this._notifyEvent(`${station.name}: Power outage (${summary})`, 'yellow');
                this._addPersistentEvent(`OUTAGE_${station.name}`, `${station.name}: Power Outage`, 'yellow', 45000);
                break;
            }
            case 'SABOTAGE': {
                const targetObj = this._pickSpaceObject(obj => obj && !obj.destroyed);
                const anchor = targetObj?.pos || this.player.pos;
                const ang = random(TWO_PI);
                const r = random(900, 2200);
                const x = anchor.x + cos(ang) * r;
                const y = anchor.y + sin(ang) * r;
                this.starSystem.addCargo(new Cargo(x, y, 'Metals', Math.max(1, floor(random(2, 8)))));
                const descriptor = targetObj ? `${targetObj.type} near ${targetObj.planetName || 'deep orbit'}` : `${this._formatStationLabel(null)} infrastructure`;
                this._notifyEvent(`Sabotage: ${descriptor} damaged, salvage drifting nearby`, 'crimson');
                break;
            }
            case 'MINING_BOOM': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const metals = station.market.addStockFromNPC('Metals', Math.max(5, Math.floor(random(8, 20))));
                const minerals = station.market.addStockFromNPC('Minerals', Math.max(5, Math.floor(random(8, 20))));
                this._notifyEvent(`${station.name}: Mining boom (+${metals} Metals, +${minerals} Minerals)`, 'olive');
                this._addPersistentEvent(`BOOM_${station.name}`, `${station.name}: Mining Boom (High Supply)`, 'olive', 180000);
                break;
            }
            case 'MINE_ACCIDENT': {
                const ang = random(TWO_PI);
                const r = random(1200, 2200);
                const qty = Math.max(1, floor(random(1, 6)));
                const x = this.player.pos.x + cos(ang) * r;
                const y = this.player.pos.y + sin(ang) * r;
                this.starSystem.addCargo(new Cargo(x, y, 'Metals', qty));
                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`${systemLabel}: Mine accident spilled ${qty} units of ore — salvage beacons deployed`, 'orange');
                break;
            }
            case 'SOLAR_FLARE': {
                const shieldDamage = Math.round(Math.max(15, (this.player.maxShield || 0) * random(0.35, 0.55)));
                if (typeof this.player.shield === 'number') {
                    this.player.shield = Math.max(0, this.player.shield - shieldDamage);
                    this.player.lastShieldHitTime = millis();
                    this.player.shieldHitTime = millis();
                }
                const flareAngle = random(TWO_PI);
                const flareDist = random(900, 1600);
                const fx = this.player.pos.x + cos(flareAngle) * flareDist;
                const fy = this.player.pos.y + sin(flareAngle) * flareDist;
                const storm = new CosmicStorm(fx, fy, random(400, 700), 'solar');
                this.starSystem.cosmicStorms.push(storm);
                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`${systemLabel}: Solar flare scorches shields (-${shieldDamage} shield strength)`, 'yellow');
                this._addPersistentEvent('SOLAR_FLARE', 'WARNING: Solar Flare Activity', 'yellow', 30000);
                break;
            }
            case 'QUARANTINE': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const consumed = station.market.consumeStockForNPC('Food', Math.max(2, Math.round(random(6, 20))), { allowPartial: true });
                this._notifyEvent(`${station.name}: Quarantine enforced (-${consumed} Food)`, 'purple');
                this._addPersistentEvent(`QUARANTINE_${station.name}`, `${station.name}: Quarantine (Food Shortage)`, 'purple', 180000);
                break;
            }
            case 'REFUGEE_INFLUX': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const consumed = station.market.consumeStockForNPC('Food', Math.max(3, Math.round(random(6, 25))), { allowPartial: true });
                this._notifyEvent(`${station.name}: Refugee influx (-${consumed} Food)`, 'brown');
                this._addPersistentEvent(`REFUGEE_${station.name}`, `${station.name}: Refugee Influx (High Demand)`, 'brown', 120000);
                break;
            }
            case 'HACKER_ATTACK': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const computersLost = this._drainCommodityByPercent(station.market, 'Computers', 0.25, 0.5);
                const medsLost = this._drainCommodityByPercent(station.market, 'Medicine', 0.1, 0.25);
                const spawnCount = Math.max(1, Math.floor(random(1, 4)));
                const anchor = station.pos || this.player.pos;
                for (let i = 0; i < spawnCount; i++) {
                    const ang = random(TWO_PI);
                    const dist = random(700, 1400);
                    const sx = anchor.x + cos(ang) * dist;
                    const sy = anchor.y + sin(ang) * dist;
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.PIRATE, (enemy) => {
                        enemy.currentState = AI_STATE.APPROACHING;
                        enemy.target = this.player;
                    });
                }
                const parts = [];
                if (computersLost) parts.push(`${computersLost} Computers fried`);
                if (medsLost) parts.push(`${medsLost} Medicine spoiled`);
                const summary = parts.length ? parts.join(', ') : 'systems glitching';
                this._notifyEvent(`${station.name}: Hacker attack (${summary}; ${spawnCount} hijacked cutters)`, 'purple');
                break;
            }
            case 'BOUNTY_INCREASE': {
                const spawnCount = Math.max(2, Math.floor(random(2, 5)));
                const anchorVec = this.starSystem.jumpZoneCenter || this.player.pos;
                const baseRadius = (this.starSystem.jumpZoneRadius || 600) + random(300, 700);
                for (let i = 0; i < spawnCount; i++) {
                    const angle = random(TWO_PI);
                    const dist = baseRadius + random(-200, 200);
                    const sx = anchorVec.x + cos(angle) * dist;
                    const sy = anchorVec.y + sin(angle) * dist;
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.BOUNTY_HUNTER, (enemy) => {
                        enemy.currentState = AI_STATE.APPROACHING;
                        enemy.target = this.player;
                    });
                }
                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`${systemLabel}: Bounty payouts raised — ${spawnCount} hunter ships inbound`, 'red');
                this._addPersistentEvent('BOUNTY_INCREASE', 'NOTICE: High Bounty Payouts Active', 'red', 180000);
                break;
            }
            case 'REPUTATION_SCANDAL': {
                const station = this._pickStationWithMarket();
                if (!station) return;
                const addedLux = this._addCommodityByPercent(station.market, 'Luxury Goods', 0.25, 0.5);
                const recalledTextiles = this._drainCommodityByPercent(station.market, 'Textiles', 0.15, 0.3);
                const pieces = [];
                if (addedLux) pieces.push(`+${addedLux} Luxury Goods dumped`);
                if (recalledTextiles) pieces.push(`${recalledTextiles} Textiles recalled`);
                const summary = pieces.length ? pieces.join(', ') : 'brand damage ripples';
                this._notifyEvent(`${station.name}: Reputation scandal (${summary})`, 'pink');
                this._addPersistentEvent(`SCANDAL_${station.name}`, `${station.name}: Reputation Scandal (Market Volatility)`, 'pink', 180000);
                break;
            }
            default:
                console.warn(`EventManager: Unknown custom event type ${eventType}.`);
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
        return floor(random(min, max));
    }

    _selectShipType(selectionConfig, rankFactor) {
        let shipTypeToSpawn;
        let availableShips;

        if (!SHIP_DEFINITIONS) {
            console.error("SHIP_DEFINITIONS is not available.");
            return selectionConfig.fallbackShip || null;
        }

        switch (selectionConfig.strategy) {
            case 'scaledList':
                // Note: scaledList expects shipList to be ordered by difficulty
                const shipTypeIndex = floor(rankFactor * (selectionConfig.shipList.length - 1));
                shipTypeToSpawn = selectionConfig.shipList[shipTypeIndex];
                break;
            case 'randomFromList':
                availableShips = selectionConfig.shipList.filter(name => SHIP_DEFINITIONS[name]);
                if (availableShips.length > 0) {
                    shipTypeToSpawn = random(availableShips);
                } else {
                    shipTypeToSpawn = selectionConfig.fallbackShip;
                }
                break;
            case 'filteredRandomFromList':
                // This strategy is less useful now that we pre-filter groups, but kept for compatibility
                availableShips = selectionConfig.potentialShipList.filter(name => {
                    const def = SHIP_DEFINITIONS[name];
                    return def && def.aiRoles && def.aiRoles.includes(selectionConfig.filterAiRole);
                });
                if (availableShips.length > 0) {
                    shipTypeToSpawn = random(availableShips);
                } else {
                    shipTypeToSpawn = selectionConfig.fallbackShip;
                }
                break;
            default:
                shipTypeToSpawn = selectionConfig.fallbackShip;
        }
        
        if (!SHIP_DEFINITIONS[shipTypeToSpawn]) {
            console.warn(`EventManager: Selected ship ${shipTypeToSpawn} invalid. Using fallback ${selectionConfig.fallbackShip}.`);
            shipTypeToSpawn = selectionConfig.fallbackShip;
        }
        return shipTypeToSpawn;
    }

    _executeAsteroidSpawn(event) {
        const config = event.spawnConfig;
        const rankFactor = config.useRankFactorForCount ? this._getEliteRankFactor() : 0;
        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, rankFactor);

        const clusterSpawnRadiusFromPlayer = random(config.spawnRadiusMin, config.spawnRadiusMax);
        const clusterAngleWithPlayer = random(TWO_PI);

        const baseSpawnX = this.player.pos.x + cos(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;
        const baseSpawnY = this.player.pos.y + sin(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} asteroids`);

        for (let i = 0; i < numToSpawn; i++) {
            const offsetX = random(-config.clusterSpreadRadius, config.clusterSpreadRadius);
            const offsetY = random(-config.clusterSpreadRadius, config.clusterSpreadRadius);
            const asteroidSize = random(config.asteroidSizeMin, config.asteroidSizeMax);
            
            const asteroid = new Asteroid(baseSpawnX + offsetX, baseSpawnY + offsetY, asteroidSize);
            
            if (config.isComet && asteroid) {
                asteroid.isComet = true;
                try {
                    const angleToPlayer = atan2(this.player.pos.y - asteroid.pos.y, this.player.pos.x - asteroid.pos.x);
                    const baseOffset = (asteroid.size || 100) * 0.6;
                    const minOffset = 150;
                    const offsetDist = max(minOffset, baseOffset + random(-100, 200));
                    const side = random() < 0.5 ? -1 : 1;
                    const perpAngle = angleToPlayer + (PI / 2) * side;
                    const missPoint = p5.Vector.add(this.player.pos, p5.Vector.fromAngle(perpAngle).mult(offsetDist));
                    const aimAngle = atan2(missPoint.y - asteroid.pos.y, missPoint.x - asteroid.pos.x);
                    asteroid.vel = p5.Vector.fromAngle(aimAngle).mult(config.speed || 5);
                } catch (e) {
                    const angleToPlayer = atan2(this.player.pos.y - asteroid.pos.y, this.player.pos.x - asteroid.pos.x);
                    asteroid.vel = p5.Vector.fromAngle(angleToPlayer).mult(config.speed || 5);
                }
            }
            
            this.starSystem.asteroids.push(asteroid);
        }
    }

    _executeEnemySpawn(event) {
        const config = event.spawnConfig;
        const rankFactor = this._getEliteRankFactor();

        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, rankFactor);
        if (numToSpawn <= 0) return;

        const shipTypeToSpawn = this._selectShipType(config.shipSelection, rankFactor);
        if (!shipTypeToSpawn) return;

        const baseSpawnRadius = random(config.spawnRadiusMin, config.spawnRadiusMax);
        const baseSpawnAngle = random(TWO_PI);

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} ${shipTypeToSpawn}(s)`);

        for (let i = 0; i < numToSpawn; i++) {
            let currentSpawnAngle = baseSpawnAngle;
            let currentSpawnRadius = baseSpawnRadius;

            if (config.spawnAngleSpreadFactor !== 0) {
                if (event.type === "PIRATE_SWARM" || event.type === "ALIEN_RAID") {
                    currentSpawnAngle += random(-config.spawnAngleSpreadFactor, config.spawnAngleSpreadFactor);
                } else if (event.type === "BOUNTY_HUNTER_AMBUSH" && numToSpawn > 1) { 
                    const angleOffset = (i - (numToSpawn - 1) / 2) * config.spawnAngleSpreadFactor;
                    currentSpawnAngle += angleOffset;
                }
            }
            
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
            if (typeof newEnemy.calculateRadianProperties === 'function') newEnemy.calculateRadianProperties();
            if (typeof newEnemy.initializeColors === 'function') newEnemy.initializeColors();

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

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: cosmic storm`);

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

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} cargo`);

        for (let i = 0; i < numToSpawn; i++) {
            const cargo = new Cargo(spawnX, spawnY, config.cargoType || 'Unknown', config.quantity || 1);
            this.starSystem.addCargo(cargo);
        }
    }

    _pickRandomStation() {
        if (!this.starSystem) return null;
        // Only return the main station for events, never secret stations
        return this.starSystem.station || null;
    }

    _selectShipForRole(role) {
        let group = [];
        switch (role) {
            case AI_ROLE.POLICE: group = this.shipGroups.POLICE; break;
            case AI_ROLE.PIRATE: group = this.shipGroups.PIRATE; break;
            case AI_ROLE.HAULER: group = this.shipGroups.TRADER; break;
            case AI_ROLE.BOUNTY_HUNTER: group = this.shipGroups.BOUNTY_HUNTER; break;
            case AI_ROLE.GUARD: group = this.shipGroups.MILITARY; break;
            case AI_ROLE.COMBAT: group = this.shipGroups.MILITARY; break;
            case AI_ROLE.ALIEN: group = this.shipGroups.ALIEN; break;
            default: group = this.shipGroups.PIRATE;
        }
        if (group && group.length > 0) return random(group);
        return 'Sidewinder'; // Ultimate fallback
    }

    _notifyEvent(message, color = 'white', durationMs = 4000) {
        if (!this.uiManager || !message) return;
        this.uiManager.addMessage(message, color, durationMs);
    }

    _pickStationWithMarket() {
        const station = this._pickRandomStation();
        if (station && station.market) return station;
        return null;
    }

    _pickCommodity(market, filterFn) {
        if (!market || !Array.isArray(market.commodities) || market.commodities.length === 0) return null;
        const pool = typeof filterFn === 'function' ? market.commodities.filter(filterFn) : market.commodities.slice();
        if (!pool.length) return null;
        return random(pool);
    }

    _drainCommodityByPercent(market, commodityName, minPercent = 0.15, maxPercent = 0.35) {
        if (!market || typeof market.getAvailableStock !== 'function') return 0;
        const available = market.getAvailableStock(commodityName);
        if (available <= 0) return 0;
        const ratio = Math.min(1, Math.max(0, random(minPercent, maxPercent)));
        const request = Math.max(1, Math.round(available * ratio));
        if (typeof market.consumeStockForNPC !== 'function') return 0;
        return market.consumeStockForNPC(commodityName, request, { allowPartial: true });
    }

    _addCommodityByPercent(market, commodityName, minPercent = 0.15, maxPercent = 0.35) {
        if (!market || typeof market.addStockFromNPC !== 'function') return 0;
        let baseline = 0;
        if (typeof market._getCommodity === 'function') {
            const comm = market._getCommodity(commodityName);
            baseline = comm ? (comm.baseStock || comm.defaultBaseStock || comm.stock || 0) : 0;
        }
        if (!baseline && typeof market.getAvailableStock === 'function') {
            baseline = market.getAvailableStock(commodityName);
        }
        if (baseline <= 0) return 0;
        const ratio = Math.max(0, random(minPercent, maxPercent));
        const grant = Math.max(1, Math.round(baseline * ratio));
        return market.addStockFromNPC(commodityName, grant);
    }

    _pickSpaceObject(predicate) {
        if (!this.starSystem || !Array.isArray(this.starSystem.spaceObjects) || !this.starSystem.spaceObjects.length) return null;
        const pool = typeof predicate === 'function' ? this.starSystem.spaceObjects.filter(predicate) : this.starSystem.spaceObjects.slice();
        if (!pool.length) return null;
        return random(pool);
    }

    _spawnAdHocEnemy(x, y, role, setupFn = null, forcedShip = null) {
        if (!this.starSystem || !this.player) return null;
        const shipType = forcedShip || this._selectShipForRole(role);
        if (!shipType) return null;
        const enemy = new Enemy(x, y, this.player, shipType, role);
        enemy.currentSystem = this.starSystem;
        if (typeof enemy.calculateRadianProperties === 'function') enemy.calculateRadianProperties();
        if (typeof enemy.initializeColors === 'function') enemy.initializeColors();
        if (typeof setupFn === 'function') setupFn(enemy);
        this.starSystem.addEnemy(enemy);
        return enemy;
    }

    _formatStationLabel(station) {
        if (station?.name) return station.name;
        if (this.starSystem?.name) return `${this.starSystem.name} sector`;
        return 'local grid';
    }
}
