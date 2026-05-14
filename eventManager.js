// ****** EventManager.js ******
// Handles random events, spawning, and probability management

class EventManager {
    constructor() {
        this.starSystem = null;
        this.player = null;
        this.uiManager = null;

        // Initialize ship groups dynamically from SHIP_DEFINITIONS
        this.shipGroups = {
            POLICE: [],
            PIRATE: [],
            TRADER: [], // Maps to HAULER/TRANSPORT
            ALIEN: [],
            MINER: [],
            MILITARY: [], // Maps to COMBAT/MILITARY
            BOUNTY_HUNTER: [],
            GUARD: [],   // Ships specifically designed for guard role
            SEPARATIST: [],
            IMPERIAL: []
        };

        // We initialize groups and events immediately, but SHIP_DEFINITIONS might not be fully populated 
        // if this runs too early. However, in the current load order, ships.js is before sketch.js/eventManager.
        this._initializeShipGroups();
        this._initializeEvents();

        this.activeEvents = []; // Track active persistent events { id, expires, type }
        this.eventDurationMultiplier = 1; // Standard duration (was 8)
        // Global multiplier applied to ad-hoc/event-spawned cargo quantities
        this.cargoQuantityMultiplier = 10;

        // War state tracking - affects NPC spawn distribution
        this.activeWarState = {
            isActive: false,
            intensity: 'PEACE',    // 'PEACE', 'SKIRMISH', 'FULL_WAR'
            factions: null,        // 'SEPARATIST_VS_IMPERIAL', 'ALIEN_VS_MILITARY'
            expires: 0,
            spawnModifiers: null   // Faction spawn percentage overrides
        };

        // Crisis state tracking - plague and famine events that affect connected systems
        this.activeCrisisState = {
            plague: null,  // { originSystemIndex, expires, priceMultiplier }
            famine: null   // { originSystemIndex, expires, priceMultiplier }
        };

        this.allowIdleStabilizeEventTypes = new Set(['DISTRESS_SIGNAL']);
        this.stabilizeHostileRoles = new Set([
            AI_ROLE.PIRATE,
            AI_ROLE.ALIEN,
            AI_ROLE.BOUNTY_HUNTER,
            AI_ROLE.COMBAT
        ]);
        this.stabilizePatrolRoles = new Set([AI_ROLE.POLICE, AI_ROLE.GUARD, AI_ROLE.HAULER, AI_ROLE.MISSIONARY]);
    }

    _initializeShipGroups() {
        if (typeof SHIP_DEFINITIONS === 'undefined') {
            console.warn("EventManager: SHIP_DEFINITIONS not found during initialization. Ship groups will be empty.");
            return;
        }

        for (const [key, def] of Object.entries(SHIP_DEFINITIONS)) {
            if (!def.aiRoles) continue;

            // Role-based grouping (from aiRoles)
            if (def.aiRoles.includes("POLICE")) this.shipGroups.POLICE.push(key);
            if (def.aiRoles.includes("PIRATE")) this.shipGroups.PIRATE.push(key);
            if (def.aiRoles.includes("HAULER") || def.aiRoles.includes("TRANSPORT") || def.aiRoles.includes("TRADER")) this.shipGroups.TRADER.push(key);
            if (def.aiRoles.includes("ALIEN")) this.shipGroups.ALIEN.push(key);
            if (def.aiRoles.includes("MINER")) this.shipGroups.MINER.push(key);
            if (def.aiRoles.includes("COMBAT")) this.shipGroups.MILITARY.push(key);
            if (def.aiRoles.includes("BOUNTY_HUNTER")) this.shipGroups.BOUNTY_HUNTER.push(key);
            if (def.aiRoles.includes("GUARD")) this.shipGroups.GUARD.push(key);

            // Faction-based grouping (from faction property)
            if (def.faction === "SEPARATIST") this.shipGroups.SEPARATIST.push(key);
            if (def.faction === "IMPERIAL") this.shipGroups.IMPERIAL.push(key);
        }

        // Fallbacks to ensure lists aren't empty
        if (this.shipGroups.POLICE.length === 0) this.shipGroups.POLICE.push('ViperPol');
        if (this.shipGroups.PIRATE.length === 0) this.shipGroups.PIRATE.push('Sidewinder');
        if (this.shipGroups.TRADER.length === 0) this.shipGroups.TRADER.push('Type6Transporter');
        if (this.shipGroups.ALIEN.length === 0) this.shipGroups.ALIEN.push('Thargoid');
        if (this.shipGroups.MILITARY.length === 0) this.shipGroups.MILITARY.push('Viper');
        if (this.shipGroups.BOUNTY_HUNTER.length === 0) this.shipGroups.BOUNTY_HUNTER.push('ViperBH');
        if (this.shipGroups.GUARD.length === 0) this.shipGroups.GUARD.push('Viper');
        if (this.shipGroups.SEPARATIST.length === 0) this.shipGroups.SEPARATIST.push('Sidewinder');
        if (this.shipGroups.IMPERIAL.length === 0) this.shipGroups.IMPERIAL.push('Viper');

        console.log("EventManager: Ship groups initialized.", this.shipGroups);
    }

    _initializeEvents() {
        this.events = [
            {
                type: "ASTEROID_CLUSTER",
                probabilityPerFrame: 0.00001,
                minCooldownMs: 5 * 60 * 1000, // 5 minutes
                warningDurationMs: 5000,      // 5 seconds
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
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
                probabilityPerFrame: 0.000007,
                minCooldownMs: 10 * 60 * 1000, // 10 minutes
                warningDurationMs: 5000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
                warningConfig: {
                    message: "[ALIEN] DANGER: Unidentified alien vessels detected!",
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
                probabilityPerFrame: 0.00001,
                minCooldownMs: 8 * 60 * 1000, // 8 minutes
                warningDurationMs: 5000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
                warningConfig: {
                    messageGenerator: () => `DANGER: ${random(PIRATE_GANG_NAMES)} pirates detected!`,
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
                probabilityPerFrame: 0.000005,
                minCooldownMs: 12 * 60 * 1000, // 12 minutes
                warningDurationMs: 8300,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
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
                        fallbackShip: "ViperBH"
                    },
                    aiRole: AI_ROLE.BOUNTY_HUNTER,
                    spawnRadiusMin: 1700,
                    spawnRadiusMax: 2300,
                    spawnAngleSpreadFactor: 0.15,
                    positionRandomnessFactor: 200,
                    additionalEnemySetup: (enemy, player, system) => {
                        // Collect potential bounty targets with weights
                        const potentialTargets = [];

                        // 1. Check for assassination mission targets (highest priority)
                        if (player.activeMission &&
                            player.activeMission.type === MISSION_TYPE?.ASSASSINATION &&
                            player.activeMission._targetEnemyRef &&
                            !player.activeMission._targetEnemyRef.destroyed) {
                            potentialTargets.push({
                                target: player.activeMission._targetEnemyRef,
                                weight: 3
                            });
                        }

                        // 2. Add pirates in system (medium priority)
                        if (system && system.enemies) {
                            for (const e of system.enemies) {
                                if (e && e.role === AI_ROLE.PIRATE && !e.destroyed && e !== enemy) {
                                    potentialTargets.push({ target: e, weight: 2 });
                                }
                            }
                        }

                        // 3. Player is always a potential target (lowest priority)
                        potentialTargets.push({ target: player, weight: 1 });

                        // Weighted random selection
                        const totalWeight = potentialTargets.reduce((sum, t) => sum + t.weight, 0);
                        let roll = random() * totalWeight;
                        let selectedTarget = player; // Default fallback

                        for (const t of potentialTargets) {
                            roll -= t.weight;
                            if (roll <= 0) {
                                selectedTarget = t.target;
                                break;
                            }
                        }

                        enemy.bountyTarget = selectedTarget;
                        enemy.currentState = AI_STATE.APPROACHING;

                        // Log the target assignment
                        const targetName = selectedTarget instanceof Player
                            ? 'Player'
                            : (selectedTarget.displayName || selectedTarget.shipTypeName || 'Unknown');
                        console.log(`Bounty Hunter ${enemy.shipTypeName} assigned target: ${targetName}`);
                    }
                }
            },
            {
                type: "COMET",
                probabilityPerFrame: 0.000002,
                minCooldownMs: 20 * 60 * 1000,
                warningDurationMs: 10000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
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
                    asteroidSizeMin: 400,
                    asteroidSizeMax: 600,
                    speed: 12
                }
            },
            {
                type: "METEOR_SHOWER",
                probabilityPerFrame: 0.000008,
                minCooldownMs: 12 * 60 * 1000,
                warningDurationMs: 5000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
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
                probabilityPerFrame: 0.000005,
                minCooldownMs: 25 * 60 * 1000,
                warningDurationMs: 10000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
                warningConfig: {
                    message: "[STORM] ALERT: Cosmic storm forming!",
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
                probabilityPerFrame: 0.000007,
                minCooldownMs: 15 * 60 * 1000,
                warningDurationMs: 5000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
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
                        fallbackShip: "ViperPol"
                    },
                    aiRole: AI_ROLE.POLICE,
                    spawnRadiusMin: 1600,
                    spawnRadiusMax: 2000,
                    spawnAngleSpreadFactor: 0,
                    positionRandomnessFactor: 0,
                    additionalEnemySetup: (enemy, player) => {
                        enemy.currentState = AI_STATE.IDLE;
                        enemy.hull = enemy.maxHull * 0.3; // Damaged
                        enemy.immobilized = true;
                        if (enemy.vel) enemy.vel.set(0, 0);
                        this._addEventMarkerSafely(`DISTRESS_${enemy.id}`, enemy.pos.x, enemy.pos.y, "Distress Signal", "red", this._extendDurationMs(15 * 60 * 1000));
                    }
                }
            },
            {
                type: "TRADER_CONVOY",
                probabilityPerFrame: 0.000006,
                minCooldownMs: 18 * 60 * 1000,
                warningDurationMs: 5000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
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
                        enemy.currentState = AI_STATE.PATROLLING;
                    }
                }
            },
            {
                type: "NAVAL_PATROL",
                probabilityPerFrame: 0.000005,
                minCooldownMs: 20 * 60 * 1000,
                warningDurationMs: 6600,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
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
                        shipList: this.shipGroups.POLICE,  // Use POLICE ships for POLICE role
                        fallbackShip: "ViperPol"
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
                probabilityPerFrame: 0.000001,
                minCooldownMs: 30 * 60 * 1000,
                warningDurationMs: 5000,
                lastTriggeredTime: -Infinity,
                isWarningActive: false,
                eventTriggerTime: 0,
                warningConfig: {
                    message: "[ALIEN] ANOMALY: Unknown artifact detected!",
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
                },
                newsType: 'ALIEN_ARTIFACT'
            }
        ];

        // Add dynamic market/social events
        this._addDynamicEvents();
    }

    _addDynamicEvents() {
        this.events.push(
            { type: "MARKET_SHORTAGE", probabilityPerFrame: 0.00001, minCooldownMs: 12 * 60 * 1000, warningDurationMs: 4000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "MARKET ALERT: Local shortage detected!", color: "orange", consoleLog: "EventManager: Market shortage warning issued." } },
            { type: "MARKET_SURPLUS", probabilityPerFrame: 0.000007, minCooldownMs: 12 * 60 * 1000, warningDurationMs: 4000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "MARKET NOTICE: Oversupply affecting prices.", color: "green", consoleLog: "EventManager: Market surplus warning issued." } },
            { type: "BLACK_MARKET_AUCTION", probabilityPerFrame: 0.0000025, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "UNDERTONE: Black market auction incoming.", color: "purple", consoleLog: "EventManager: Black market auction warning issued." } },
            { type: "SMUGGLING_BUST", probabilityPerFrame: 0.000005, minCooldownMs: 20 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "ENFORCEMENT: Smuggling interdiction underway.", color: "red", consoleLog: "EventManager: Smuggling bust warning issued." } },
            { type: "BLOCKADE", probabilityPerFrame: 0.0000025, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "BLOCKADE: Trade lanes restricted by military.", color: "blue", consoleLog: "EventManager: Blockade warning issued." } },
            { type: "DIPLOMATIC_VISIT", probabilityPerFrame: 0.0000025, minCooldownMs: 45 * 60 * 1000, warningDurationMs: 6600, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "CIVIC: Diplomatic envoy arriving.", color: "teal", consoleLog: "EventManager: Diplomatic visit warning issued." } },
            { type: "TECH_BREAKTHROUGH", probabilityPerFrame: 0.000002, minCooldownMs: 60 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "RESEARCH: New tech prototype surfaced.", color: "magenta", consoleLog: "EventManager: Tech breakthrough warning issued." } },
            { type: "STATION_STRIKE", probabilityPerFrame: 0.000003, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "LABOR: Station strike in progress.", color: "orange", consoleLog: "EventManager: Station strike warning issued." } },
            { type: "POWER_OUTAGE", probabilityPerFrame: 0.000003, minCooldownMs: 25 * 60 * 1000, warningDurationMs: 4000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "ALERT: Station power outage reported.", color: "yellow", consoleLog: "EventManager: Power outage warning issued." } },
            { type: "SABOTAGE", probabilityPerFrame: 0.0000025, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "SABOTAGE: Infrastructure damage detected.", color: "crimson", consoleLog: "EventManager: Sabotage warning issued." } },
            { type: "MINING_BOOM", probabilityPerFrame: 0.000005, minCooldownMs: 35 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "MINING: High-yield discovery announced.", color: "olive", consoleLog: "EventManager: Mining boom warning issued." } },
            { type: "MINE_ACCIDENT", probabilityPerFrame: 0.0000025, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 4000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "HAZARD: Mining accident - emergency response.", color: "orange", consoleLog: "EventManager: Mine accident warning issued." } },
            { type: "SOLAR_FLARE", probabilityPerFrame: 0.000002, minCooldownMs: 50 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "[STORM] SPACE WEATHER: Solar flare activity detected.", color: "yellow", consoleLog: "EventManager: Solar flare warning issued." } },
            { type: "QUARANTINE", probabilityPerFrame: 0.0000015, minCooldownMs: 80 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "QUARANTINE: Contagion measures in effect.", color: "purple", consoleLog: "EventManager: Quarantine warning issued." } },
            { type: "REFUGEE_INFLUX", probabilityPerFrame: 0.0000025, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 4000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "CIVIC: Refugee influx stresses local services.", color: "brown", consoleLog: "EventManager: Refugee influx warning issued." } },
            { type: "RARE_COMMODITY", probabilityPerFrame: 0.0000025, minCooldownMs: 50 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "DISCOVERY: Rare commodity located nearby.", color: "gold", consoleLog: "EventManager: Rare commodity warning issued." }, spawnConfig: { entityType: 'cargo', minEntities: 1, maxEntities: 2, spawnRadiusMin: 1500, spawnRadiusMax: 3000, cargoType: 'Rare Ore', quantity: 1 } },
            { type: "HACKER_ATTACK", probabilityPerFrame: 0.000002, minCooldownMs: 36 * 60 * 1000, warningDurationMs: 4000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "CYBER: Systems under hacker attack.", color: "purple", consoleLog: "EventManager: Hacker attack warning issued." } },
            { type: "SALVAGE_OPPORTUNITY", probabilityPerFrame: 0.000005, minCooldownMs: 12 * 60 * 1000, warningDurationMs: 4000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "SALVAGE: Wreckage detected — high-value salvage possible.", color: "silver", consoleLog: "EventManager: Salvage opportunity warning issued." }, spawnConfig: { entityType: 'cargo', minEntities: 1, maxEntities: 3, spawnRadiusMin: 1600, spawnRadiusMax: 3000, cargoType: 'Metals', quantity: 2 } },
            { type: "BOUNTY_INCREASE", probabilityPerFrame: 0.000003, minCooldownMs: 28 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "NOTICE: Bounties increased on wanted criminals.", color: "red", consoleLog: "EventManager: Bounty increase warning issued." } },
            { type: "REPUTATION_SCANDAL", probabilityPerFrame: 0.0000015, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 6000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "SCANDAL: Reputation-shifting news is spreading.", color: "pink", consoleLog: "EventManager: Reputation scandal warning issued." } },
            // === War Events ===
            { type: "SKIRMISH_SEPARATIST_IMPERIAL", probabilityPerFrame: 0.000003, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "⚔️ CONFLICT: Separatist and Imperial forces clashing!", color: "orange", consoleLog: "EventManager: Separatist vs Imperial skirmish warning issued." } },
            { type: "SKIRMISH_ALIEN_MILITARY", probabilityPerFrame: 0.0000025, minCooldownMs: 35 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "⚔️ INVASION: Alien forces engaging military!", color: "magenta", consoleLog: "EventManager: Alien vs Military skirmish warning issued." } },
            { type: "WAR_SEPARATIST_IMPERIAL", probabilityPerFrame: 0.000002, minCooldownMs: 60 * 60 * 1000, warningDurationMs: 15000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "🔥 FULL SCALE WAR: Separatist vs Imperial forces!", color: "red", consoleLog: "EventManager: Separatist vs Imperial full war warning issued." } },
            { type: "WAR_ALIEN_MILITARY", probabilityPerFrame: 0.0000015, minCooldownMs: 70 * 60 * 1000, warningDurationMs: 15000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "🔥 FULL SCALE WAR: Alien invasion vs Military!", color: "crimson", consoleLog: "EventManager: Alien vs Military full war warning issued." } },
            // === Crisis Events (affect connected systems) ===
            { type: "PLAGUE", probabilityPerFrame: 0.0000012, minCooldownMs: 80 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "☠️ PLAGUE: Deadly outbreak spreading across systems!", color: "magenta", consoleLog: "EventManager: Plague warning issued." } },
            { type: "FAMINE", probabilityPerFrame: 0.0000012, minCooldownMs: 80 * 60 * 1000, warningDurationMs: 10000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "🍂 FAMINE: Crop failures cause widespread hunger!", color: "orange", consoleLog: "EventManager: Famine warning issued." } },

            // === New Random Events ===
            { type: "LOST_SHIPMENT", probabilityPerFrame: 0.000005, minCooldownMs: 20 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "SIGNAL: Lost cargo shipment beacon detected.", color: "gold", consoleLog: "EventManager: Lost Shipment warning issued." } },
            { type: "FACTION_SKIRMISH", probabilityPerFrame: 0.000005, minCooldownMs: 15 * 60 * 1000, warningDurationMs: 6000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "ALERT: Faction skirmish in progress.", color: "red", consoleLog: "EventManager: Faction skirmish warning issued." } },
            { type: "VIP_CONVOY", probabilityPerFrame: 0.000004, minCooldownMs: 25 * 60 * 1000, warningDurationMs: 8000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "TRAFFIC: Priority VIP convoy passing through.", color: "cyan", consoleLog: "EventManager: VIP Convoy warning issued." } },
            { type: "MINING_OPERATION", probabilityPerFrame: 0.000005, minCooldownMs: 20 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "OPS: Temporary mining operation detected.", color: "yellow", consoleLog: "EventManager: Mining Op warning issued." } },
            { type: "ROGUE_SECURITY", probabilityPerFrame: 0.0000025, minCooldownMs: 25 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "WARNING: Rogue security forces identified.", color: "red", consoleLog: "EventManager: Rogue Security warning issued." }, spawnConfig: { entityType: 'enemy', minEntities: 2, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.POLICE, fallbackShip: "ViperPol" }, aiRole: AI_ROLE.PIRATE, spawnRadiusMin: 1800, spawnRadiusMax: 2200, additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Rogue Security"; } } },
            { type: "INTERSTELLAR_RALLY", probabilityPerFrame: 0.0000025, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "RACE: Interstellar Rally racers entering sector!", color: "cyan", consoleLog: "EventManager: Rally warning issued." }, spawnConfig: { entityType: 'enemy', minEntities: 3, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.TRADER, fallbackShip: "Type6Transporter" }, aiRole: AI_ROLE.HAULER, spawnRadiusMin: 1200, spawnRadiusMax: 1700, additionalEnemySetup: (e, player, system) => { e.baseMaxSpeed *= 2.5; e.maxSpeed *= 2.5; e.currentState = AI_STATE.PATROLLING; e.displayName = "Rally Racer"; e.isRacing = true; e.patrolTargetPos = system?.jumpZoneCenter?.copy ? system.jumpZoneCenter.copy() : (player?.pos?.copy ? player.pos.copy() : null); } } },
            { type: "ALIEN_SCOUT", probabilityPerFrame: 0.0000025, minCooldownMs: 20 * 60 * 1000, warningDurationMs: 6000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "[ALIEN] CONTACT: Unidentified scout vessel.", color: "magenta", consoleLog: "EventManager: Alien Scout warning issued." }, spawnConfig: { entityType: 'enemy', minEntities: 1, maxEntities: 1, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.ALIEN, fallbackShip: "Thargoid" }, aiRole: AI_ROLE.ALIEN, spawnRadiusMin: 2000, spawnRadiusMax: 2500, additionalEnemySetup: (e, player) => { e.currentState = AI_STATE.APPROACHING; e.target = player || null; } } },
            { type: "PROTOTYPE_TESTING", probabilityPerFrame: 0.000002, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 6000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "DETECTED: High-signature prototype vessel.", color: "blue", consoleLog: "EventManager: Prototype warning issued." }, spawnConfig: { entityType: 'enemy', minEntities: 1, maxEntities: 1, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.MILITARY, fallbackShip: "Viper" }, aiRole: AI_ROLE.COMBAT, spawnRadiusMin: 2500, spawnRadiusMax: 3000, additionalEnemySetup: (e) => { e.baseMaxSpeed *= 2.0; e.maxSpeed *= 2.0; e.shield *= 1.5; e.displayName = "Prototype Unit"; e.currentState = AI_STATE.PATROLLING; } } },
            // === Missionary & Creative Events ===
            { type: "MISSIONARY_CONVOY", probabilityPerFrame: 0.000005, minCooldownMs: 25 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "CONVOY: Procession of faithful passing through.", color: "cyan" }, spawnConfig: { entityType: 'enemy', minEntities: 3, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: ["PosthumanMissionary"] }, aiRole: AI_ROLE.MISSIONARY, spawnRadiusMin: 1800, spawnRadiusMax: 2200 } },
            { type: "FORCED_CONVERSION", probabilityPerFrame: 0.000005, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "DISTRESS: Trader under religious siege!", color: "orange" } },
            { type: "HERETIC_HUNT", probabilityPerFrame: 0.000005, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "ALERT: Military purging heretic vessel.", color: "red" } },
            { type: "DOOMSDAY_PROPHET", probabilityPerFrame: 0.0000025, minCooldownMs: 60 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "COMMS: 'The end is nigh! Embrace the void!'", color: "purple" } },
            { type: "ASCENSION_RITUAL", probabilityPerFrame: 0.0000025, minCooldownMs: 45 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "RITUAL: Ascension flight detected on sensors.", color: "cyan" } },
            { type: "ARTIFACT_WORSHIP", probabilityPerFrame: 0.0000025, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "SCAN: Religious activity near unknown artifact.", color: "magenta" } },
            { type: "FALSE_IDOLS", probabilityPerFrame: 0.000005, minCooldownMs: 20 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "WARNING: Missionary vessel broadcasting pirate codes.", color: "red" }, spawnConfig: { entityType: 'enemy', minEntities: 1, maxEntities: 1, shipSelection: { strategy: 'randomFromList', shipList: ["PosthumanMissionary"] }, aiRole: AI_ROLE.PIRATE, spawnRadiusMin: 1500, spawnRadiusMax: 2000, additionalEnemySetup: (enemy) => { const weaponDef = WEAPON_UPGRADES?.find(w => w.name === "Pulse Laser"); if (weaponDef) { if (!enemy.weapons) enemy.weapons = []; if (!enemy.weaponCooldowns) enemy.weaponCooldowns = []; enemy.weapons.push(weaponDef); enemy.weaponCooldowns.push(0); enemy.currentWeapon = weaponDef; enemy.fireRate = weaponDef.fireRate; } enemy.displayName = "False Prophet"; } } },
            { type: "CLEANSING_FIRE", probabilityPerFrame: 0.000005, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "PURGE: Missionaries attacking unclean vessel.", color: "orange" } },
            { type: "SIN_EATER", probabilityPerFrame: 0.000005, minCooldownMs: 25 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "NOTICE: 'Sin Eater' vessel hunting criminals.", color: "red" }, spawnConfig: { entityType: 'enemy', minEntities: 1, maxEntities: 1, shipSelection: { strategy: 'randomFromList', shipList: ["PosthumanMissionary"] }, aiRole: AI_ROLE.BOUNTY_HUNTER, spawnRadiusMin: 1500, spawnRadiusMax: 2000, additionalEnemySetup: (enemy) => { const weaponDef = WEAPON_UPGRADES?.find(w => w.name === "Harpoon Launcher"); if (weaponDef) { if (!enemy.weapons) enemy.weapons = []; if (!enemy.weaponCooldowns) enemy.weaponCooldowns = []; enemy.weapons.push(weaponDef); enemy.weaponCooldowns.push(0); enemy.currentWeapon = weaponDef; enemy.fireRate = weaponDef.fireRate; } enemy.displayName = "Sin Eater"; } } },
            { type: "TECH_CRUSADE", probabilityPerFrame: 0.0000025, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "WAR: Posthumans engaging alien presence.", color: "cyan" } },
            // === Separatist & Imperial Events ===
            { type: "IMPERIAL_INTERDICTION", probabilityPerFrame: 0.000005, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "AUTHORITY: Imperial forces inspecting vessel.", color: "cyan" } },
            { type: "SEPARATIST_AMBUSH", probabilityPerFrame: 0.000005, minCooldownMs: 35 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "AMBUSH: Rebel forces engaging logistics.", color: "orange" } },
            { type: "DEFECTOR_ESCORT", probabilityPerFrame: 0.0000025, minCooldownMs: 45 * 60 * 1000, warningDurationMs: 6000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "ALERT: High-value defector detected.", color: "gold" } },
            { type: "DIPLOMATIC_STANDOFF", probabilityPerFrame: 0.0000025, minCooldownMs: 60 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "POLITICAL: Tense diplomatic standoff in progress.", color: "cyan" } },
            { type: "PROTOTYPE_HEIST", probabilityPerFrame: 0.000002, minCooldownMs: 50 * 60 * 1000, warningDurationMs: 6000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "THEFT: Rebels fleeing with stolen tech!", color: "red" } },
            // === Harlequin Events ===
            { type: "HARLEQUIN_PARADE", probabilityPerFrame: 0.000005, minCooldownMs: 25 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "CIRCUS: Harlequin convoy detected.", color: "white" } },
            { type: "JESTERS_TRAP", probabilityPerFrame: 0.000005, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "CONTACT: Lone fighter drifting nearby.", color: "cyan" } },
            { type: "COLOR_WAR", probabilityPerFrame: 0.000005, minCooldownMs: 30 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "ASSAULT: Harlequins attacking 'drab' vessel.", color: "red" } },
            { type: "MAD_BOMBER", probabilityPerFrame: 0.0000025, minCooldownMs: 40 * 60 * 1000, warningDurationMs: 6000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "THREAT: Maniac threatening station bombardment!", color: "red" } },
            { type: "CARNIVAL_DROP", probabilityPerFrame: 0.000005, minCooldownMs: 20 * 60 * 1000, warningDurationMs: 5000, lastTriggeredTime: -Infinity, isWarningActive: false, eventTriggerTime: 0, warningConfig: { message: "SCAN: Unsanctioned cargo drop detected.", color: "lime" } }
        );
        this.events.push(...this._buildLoreExpansionEvents());

        this.dynamicSpawnNotifyEventTypes = new Set([
            'ROGUE_SECURITY', 'INTERSTELLAR_RALLY', 'ALIEN_SCOUT', 'PROTOTYPE_TESTING',
            'FALSE_IDOLS', 'SIN_EATER', 'MISSIONARY_CONVOY', 'ALIEN_RAID', 'PIRATE_SWARM',
            'BOUNTY_HUNTER_AMBUSH', 'IMPERIAL_TAX_CONVOY', 'SEPARATIST_PRIVATEERS',
            'PILGRIM_ESCORT', 'ALIEN_RELIC_HUNTERS', 'BLACK_OPS_INTERCEPTORS',
            'STATION_EXTORTION_RING', 'IMPERIAL_RETRIBUTION_WING', 'SEPARATIST_SIGNAL_JAMMERS',
            'HARLEQUIN_FLASHMOB', 'MISSIONARY_RECLAMATION_FLEET', 'BORDER_MILITIA_DRILL',
            'ALIEN_BIO_PROSPECTORS', 'DEFENSE_DRONE_SWEEP', 'SHADOW_COURIER'
        ]);

        this.dynamicNewsEventTypes = new Set([
            'LOST_SHIPMENT', 'FACTION_SKIRMISH', 'VIP_CONVOY', 'MINING_OPERATION',
            'FORCED_CONVERSION', 'HERETIC_HUNT', 'DOOMSDAY_PROPHET', 'ASCENSION_RITUAL',
            'ARTIFACT_WORSHIP', 'CLEANSING_FIRE', 'TECH_CRUSADE', 'IMPERIAL_INTERDICTION',
            'SEPARATIST_AMBUSH', 'DEFECTOR_ESCORT', 'DIPLOMATIC_STANDOFF', 'PROTOTYPE_HEIST',
            'HARLEQUIN_PARADE', 'JESTERS_TRAP', 'COLOR_WAR', 'MAD_BOMBER', 'CARNIVAL_DROP',
            'PROTOTYPE_TESTING', 'INTERSTELLAR_RALLY', 'ROGUE_SECURITY', 'ALIEN_SCOUT',
            'FALSE_IDOLS', 'SIN_EATER', 'MISSIONARY_CONVOY', 'ALIEN_ARTIFACT',
            'IMPERIAL_TAX_CONVOY', 'SEPARATIST_PRIVATEERS', 'PILGRIM_ESCORT',
            'ALIEN_RELIC_HUNTERS', 'BLACK_OPS_INTERCEPTORS', 'STATION_EXTORTION_RING',
            'IMPERIAL_RETRIBUTION_WING', 'SEPARATIST_SIGNAL_JAMMERS', 'HARLEQUIN_FLASHMOB',
            'MISSIONARY_RECLAMATION_FLEET', 'BORDER_MILITIA_DRILL', 'ALIEN_BIO_PROSPECTORS',
            'DEFENSE_DRONE_SWEEP', 'SHADOW_COURIER', 'ORBITAL_WRECKFIELD',
            'PILGRIM_OFFERINGS', 'SEPARATIST_ARMS_CACHE', 'ALIEN_RELIC_CACHE',
            'VOID_CHOIR_STORM', 'SUNSPIKE_TURBULENCE'
        ]);
    }

    _buildLoreExpansionEvents() {
        const newEvent = (type, probabilityPerFrame, minCooldownMs, warningDurationMs, warningConfig, spawnConfig) => ({
            type,
            probabilityPerFrame,
            minCooldownMs,
            warningDurationMs,
            lastTriggeredTime: -Infinity,
            isWarningActive: false,
            eventTriggerTime: 0,
            warningConfig,
            spawnConfig
        });

        return [
            newEvent("IMPERIAL_TAX_CONVOY", 0.000003, 40 * 60 * 1000, 5000, { message: "AUTHORITY: Imperial tax convoy sweeping trade lanes.", color: "cyan" }, {
                entityType: 'enemy', minEntities: 2, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.IMPERIAL, fallbackShip: "ImperialCourier" }, aiRole: AI_ROLE.POLICE, spawnRadiusMin: 1600, spawnRadiusMax: 2200,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Tax Frigate"; e.faction = 'IMPERIAL'; }
            }),
            newEvent("SEPARATIST_PRIVATEERS", 0.000003, 38 * 60 * 1000, 5000, { message: "ALERT: Separatist privateers targeting independent shipping.", color: "orange" }, {
                entityType: 'enemy', minEntities: 2, maxEntities: 4, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.SEPARATIST, fallbackShip: "SeparatistPartisan" }, aiRole: AI_ROLE.PIRATE, spawnRadiusMin: 1700, spawnRadiusMax: 2400,
                additionalEnemySetup: (e) => { e.displayName = "Rebel Privateer"; e.faction = 'SEPARATIST'; }
            }),
            newEvent("PILGRIM_ESCORT", 0.0000035, 30 * 60 * 1000, 5000, { message: "CONVOY: Pilgrim procession requests right of passage.", color: "cyan" }, {
                entityType: 'enemy', minEntities: 3, maxEntities: 4, shipSelection: { strategy: 'randomFromList', shipList: ["PosthumanMissionary"], fallbackShip: "PosthumanMissionary" }, aiRole: AI_ROLE.MISSIONARY, spawnRadiusMin: 1500, spawnRadiusMax: 2200,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Pilgrim Convoy"; }
            }),
            newEvent("ALIEN_RELIC_HUNTERS", 0.0000025, 45 * 60 * 1000, 6000, { message: "[ALIEN] ANOMALY: Alien relic hunters entering system.", color: "magenta" }, {
                entityType: 'enemy', minEntities: 1, maxEntities: 2, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.ALIEN, fallbackShip: "Thargoid" }, aiRole: AI_ROLE.ALIEN, spawnRadiusMin: 1800, spawnRadiusMax: 2500,
                additionalEnemySetup: (e) => { e.displayName = "Relic Hunter"; }
            }),
            newEvent("BLACK_OPS_INTERCEPTORS", 0.0000025, 50 * 60 * 1000, 6000, { message: "INTEL: Black-ops interceptors operating without transponders.", color: "red" }, {
                entityType: 'enemy', minEntities: 2, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.BOUNTY_HUNTER, fallbackShip: "ViperBH" }, aiRole: AI_ROLE.BOUNTY_HUNTER, spawnRadiusMin: 1800, spawnRadiusMax: 2400,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.APPROACHING; e.displayName = "Black Ops Interceptor"; }
            }),
            newEvent("STATION_EXTORTION_RING", 0.000003, 35 * 60 * 1000, 5000, { message: "CRIME: Protection racketeers extorting dock traffic.", color: "red" }, {
                entityType: 'enemy', minEntities: 3, maxEntities: 4, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.PIRATE, fallbackShip: "Sidewinder" }, aiRole: AI_ROLE.PIRATE, spawnRadiusMin: 1200, spawnRadiusMax: 1900,
                additionalEnemySetup: (e) => { e.displayName = "Extortionist"; }
            }),
            newEvent("IMPERIAL_RETRIBUTION_WING", 0.000002, 55 * 60 * 1000, 6000, { message: "MILITARY: Imperial retribution wing hunting dissidents.", color: "cyan" }, {
                entityType: 'enemy', minEntities: 2, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.IMPERIAL, fallbackShip: "ImperialLancer" }, aiRole: AI_ROLE.COMBAT, spawnRadiusMin: 1900, spawnRadiusMax: 2600,
                additionalEnemySetup: (e) => { e.displayName = "Imperial Retributor"; e.faction = 'IMPERIAL'; }
            }),
            newEvent("SEPARATIST_SIGNAL_JAMMERS", 0.000002, 45 * 60 * 1000, 6000, { message: "INTERFERENCE: Separatist jamming flotilla detected.", color: "orange" }, {
                entityType: 'enemy', minEntities: 2, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.SEPARATIST, fallbackShip: "SeparatistShadow" }, aiRole: AI_ROLE.COMBAT, spawnRadiusMin: 1800, spawnRadiusMax: 2500,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Signal Jammer"; e.faction = 'SEPARATIST'; }
            }),
            newEvent("HARLEQUIN_FLASHMOB", 0.000003, 30 * 60 * 1000, 5000, { message: "CIRCUS: Harlequin flashmob strobing local traffic lanes.", color: "white" }, {
                entityType: 'enemy', minEntities: 3, maxEntities: 4, shipSelection: { strategy: 'randomFromList', shipList: ["HarlequinPulcinella", "HarlequinPierrot", "HarlequinColumbine"], fallbackShip: "HarlequinPulcinella" }, aiRole: AI_ROLE.PIRATE, spawnRadiusMin: 1300, spawnRadiusMax: 2000,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Flashmob Marauder"; e.faction = 'HARLEQUIN'; }
            }),
            newEvent("MISSIONARY_RECLAMATION_FLEET", 0.0000027, 33 * 60 * 1000, 5000, { message: "SERMON: Reclamation fleet demanding ideological compliance.", color: "purple" }, {
                entityType: 'enemy', minEntities: 2, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: ["PosthumanMissionary"], fallbackShip: "PosthumanMissionary" }, aiRole: AI_ROLE.MISSIONARY, spawnRadiusMin: 1500, spawnRadiusMax: 2100,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Reclamation Missionary"; }
            }),
            newEvent("BORDER_MILITIA_DRILL", 0.0000025, 42 * 60 * 1000, 5000, { message: "EXERCISE: Border militia conducting live-fire drills.", color: "blue" }, {
                entityType: 'enemy', minEntities: 3, maxEntities: 4, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.MILITARY, fallbackShip: "Viper" }, aiRole: AI_ROLE.COMBAT, spawnRadiusMin: 1700, spawnRadiusMax: 2400,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Militia Patrol"; }
            }),
            newEvent("ALIEN_BIO_PROSPECTORS", 0.000002, 48 * 60 * 1000, 6000, { message: "[ALIEN] BIOSCAN: Prospectors sampling local biosignatures.", color: "magenta" }, {
                entityType: 'enemy', minEntities: 1, maxEntities: 2, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.ALIEN, fallbackShip: "BioFrigate" }, aiRole: AI_ROLE.ALIEN, spawnRadiusMin: 1900, spawnRadiusMax: 2600,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Bio Prospector"; }
            }),
            newEvent("DEFENSE_DRONE_SWEEP", 0.000003, 28 * 60 * 1000, 5000, { message: "SECURITY: Autonomous defense drones sweeping traffic lanes.", color: "cyan" }, {
                entityType: 'enemy', minEntities: 2, maxEntities: 3, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.POLICE, fallbackShip: "ViperPol" }, aiRole: AI_ROLE.POLICE, spawnRadiusMin: 1400, spawnRadiusMax: 2100,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.PATROLLING; e.displayName = "Defense Drone"; }
            }),
            newEvent("SHADOW_COURIER", 0.0000025, 40 * 60 * 1000, 5000, { message: "INTEL: Unmarked courier running dark through the sector.", color: "gold" }, {
                entityType: 'enemy', minEntities: 1, maxEntities: 1, shipSelection: { strategy: 'randomFromList', shipList: this.shipGroups.TRADER, fallbackShip: "CobraMkIII" }, aiRole: AI_ROLE.HAULER, spawnRadiusMin: 2000, spawnRadiusMax: 2600,
                additionalEnemySetup: (e) => { e.currentState = AI_STATE.FLEEING; e.displayName = "Shadow Courier"; }
            }),
            newEvent("ORBITAL_WRECKFIELD", 0.000004, 22 * 60 * 1000, 5000, { message: "SALVAGE: Fresh orbital wreckfield shedding valuables.", color: "silver" }, { entityType: 'cargo', minEntities: 2, maxEntities: 4, spawnRadiusMin: 1400, spawnRadiusMax: 2600, cargoType: 'Metals', quantity: 3 }),
            newEvent("PILGRIM_OFFERINGS", 0.0000035, 24 * 60 * 1000, 5000, { message: "RITUAL: Pilgrims jettisoning tribute crates.", color: "gold" }, { entityType: 'cargo', minEntities: 2, maxEntities: 3, spawnRadiusMin: 1300, spawnRadiusMax: 2200, cargoType: 'Luxury Goods', quantity: 2 }),
            newEvent("SEPARATIST_ARMS_CACHE", 0.000003, 30 * 60 * 1000, 5000, { message: "BLACKSITE: Hidden separatist arms cache exposed.", color: "orange" }, { entityType: 'cargo', minEntities: 1, maxEntities: 2, spawnRadiusMin: 1700, spawnRadiusMax: 2600, cargoType: 'Weapons', quantity: 2 }),
            newEvent("ALIEN_RELIC_CACHE", 0.000002, 55 * 60 * 1000, 6000, { message: "[ALIEN] SIGNAL: Relic cache pulse detected.", color: "magenta" }, { entityType: 'cargo', minEntities: 1, maxEntities: 1, spawnRadiusMin: 1900, spawnRadiusMax: 3000, cargoType: 'Alien Artifact', quantity: 1 }),
            newEvent("VOID_CHOIR_STORM", 0.0000017, 60 * 60 * 1000, 8000, { message: "[STORM] ANOMALY: Harmonic void storm forming.", color: "purple" }, { entityType: 'cosmicStorm', minEntities: 1, maxEntities: 1, spawnRadiusMin: 1400, spawnRadiusMax: 2400, radius: 700, type: 'electromagnetic' }),
            newEvent("SUNSPIKE_TURBULENCE", 0.000002, 55 * 60 * 1000, 8000, { message: "[STORM] SPACE WEATHER: Sunspike turbulence front incoming.", color: "yellow" }, { entityType: 'cosmicStorm', minEntities: 1, maxEntities: 1, spawnRadiusMin: 1200, spawnRadiusMax: 2200, radius: 620, type: 'electromagnetic' })
        ];
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

        const now = millis();
        // Calculate timeScale for probability scaling.
        // at 60fps (dt=16.67), timeScale=1. at 30fps (dt=33.33), timeScale=2.
        // We want probability to increase if we check less often (lower FPS).
        const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;

        for (let i = 0, len = this.events.length; i < len; i++) {
            const event = this.events[i];
            if (event.isWarningActive) {
                if (now >= event.eventTriggerTime) {
                    this.executeConfiguredEvent(event.type);
                    event.isWarningActive = false;
                    event.lastTriggeredTime = now;
                }
            } else {
                if (now < event.lastTriggeredTime + event.minCooldownMs) {
                    continue;
                }
                // Scale probability by timeScale so it's consistent across frame rates
                // e.g. at 30fps (timeScale 2), chance is 2x, but checked half as often -> consistent.
                if (random() < event.probabilityPerFrame * timeScale) {
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

        // Check war state expiration
        if (this.activeWarState.isActive && now >= this.activeWarState.expires) {
            this.activeWarState = {
                isActive: false,
                intensity: 'PEACE',
                factions: null,
                expires: 0,
                spawnModifiers: null
            };
            console.log('EventManager: War state ended, returning to peace.');
        }

        // Check crisis state expiration (plague/famine)
        this._updateCrisisState();
    }

    _extendDurationMs(baseMs) {
        const multiplier = this.eventDurationMultiplier || 1;
        return Math.max(baseMs, Math.floor(baseMs * multiplier));
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

    _removePersistentEvent(id) {
        if (!this.uiManager) return;
        this.uiManager.removePersistentMessage(id);

        const existingIdx = this.activeEvents.findIndex(e => e.id === id);
        if (existingIdx >= 0) {
            this.activeEvents.splice(existingIdx, 1);
        }
    }

    initiateEventWarning(eventType) {
        const event = this.events.find(e => e.type === eventType);
        if (!event || event.isWarningActive) return;

        event.isWarningActive = true;
        // Use millis() for trigger time
        event.eventTriggerTime = millis() + event.warningDurationMs;

        let message = event.warningConfig.message;
        if (typeof event.warningConfig.messageGenerator === 'function') {
            message = event.warningConfig.messageGenerator();
        }

        if (this.uiManager) {
            // warningDurationMs is already in milliseconds
            // Strip icon tokens for HUD display as it doesn't support them
            const hudMessage = message.replace(/\[.*?\]\s*/g, '');
            this.uiManager.addMessage(hudMessage, event.warningConfig.color, event.warningDurationMs);
        }

        let consoleMsg = event.warningConfig.consoleLog;
        if (typeof event.warningConfig.consoleLogGenerator === 'function') {
            const dynamicPart = message.substring(message.indexOf(":") + 2);
            consoleMsg = event.warningConfig.consoleLogGenerator(dynamicPart);
        }
        if (typeof EVENT_LOG === 'function') {
            EVENT_LOG(`${consoleMsg} Event will trigger in ${Math.round(event.warningDurationMs / 1000)} seconds.`);
        } else {
            console.log(`${consoleMsg} Event will trigger in ${Math.round(event.warningDurationMs / 1000)} seconds.`);
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

                // Route ALIEN_ARTIFACT to news system if it has newsType
                if (event.newsType) {
                    this._notifyEvent(`[ALIEN] ${this.starSystem?.name || 'Local sector'}: Artifact signature detected`, 'magenta', 4000, event.newsType);
                }
            } else {
                console.warn(`EventManager: Unknown entityType '${event.spawnConfig.entityType}' for event ${eventType}.`);
            }
        } else {
            this._executeCustomEvent(eventType);
        }
    }

    _executeCustomEvent(eventType) {
        // Route to category-specific handlers
        const marketEvents = ['MARKET_SHORTAGE', 'MARKET_SURPLUS', 'BLACK_MARKET_AUCTION'];
        const socialEvents = ['SMUGGLING_BUST', 'BLOCKADE', 'DIPLOMATIC_VISIT', 'TECH_BREAKTHROUGH', 'STATION_STRIKE'];
        const crisisEvents = ['POWER_OUTAGE', 'SABOTAGE', 'MINING_BOOM', 'MINE_ACCIDENT', 'SOLAR_FLARE', 'QUARANTINE', 'REFUGEE_INFLUX', 'HACKER_ATTACK', 'PLAGUE', 'FAMINE'];
        const warEvents = ['SKIRMISH_SEPARATIST_IMPERIAL', 'SKIRMISH_ALIEN_MILITARY', 'WAR_SEPARATIST_IMPERIAL', 'WAR_ALIEN_MILITARY'];
        const miscEvents = ['BOUNTY_INCREASE', 'REPUTATION_SCANDAL'];
        const newEvents = ['LOST_SHIPMENT', 'FACTION_SKIRMISH', 'VIP_CONVOY', 'MINING_OPERATION', 'FORCED_CONVERSION', 'HERETIC_HUNT', 'DOOMSDAY_PROPHET', 'ASCENSION_RITUAL', 'ARTIFACT_WORSHIP', 'CLEANSING_FIRE', 'TECH_CRUSADE', 'IMPERIAL_INTERDICTION', 'SEPARATIST_AMBUSH', 'DEFECTOR_ESCORT', 'DIPLOMATIC_STANDOFF', 'PROTOTYPE_HEIST', 'HARLEQUIN_PARADE', 'JESTERS_TRAP', 'COLOR_WAR', 'MAD_BOMBER', 'CARNIVAL_DROP'];

        if (marketEvents.includes(eventType)) {
            return this._executeMarketEvent(eventType);
        } else if (socialEvents.includes(eventType)) {
            return this._executeSocialEvent(eventType);
        } else if (crisisEvents.includes(eventType)) {
            return this._executeCrisisEvent(eventType);
        } else if (warEvents.includes(eventType)) {
            return this._executeWarEventTrigger(eventType);
        } else if (miscEvents.includes(eventType)) {
            return this._executeMiscEvent(eventType);
        } else if (newEvents.includes(eventType)) {
            return this._executeNewRandomEvent(eventType);
        } else {
            console.warn(`EventManager: Unknown custom event type ${eventType}.`);
        }
    }

    // ============================================
    // Market Event Handlers
    // ============================================

    _executeMarketEvent(eventType) {
        switch (eventType) {
            case 'MARKET_SHORTAGE': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const commodity = this._pickCommodity(station.market, comm => comm && comm.stock > 1);
                if (!commodity) return;

                const baseline = commodity.baseStock || commodity.stock || 10;
                const request = Math.max(1, Math.round(baseline * random(0.55, 0.9)));
                const removed = station.market.consumeStockForNPC(commodity.name, request, { allowPartial: true });

                if (removed > 0) {
                    const msg = `${station.name}: ${commodity.name} shortage (-${removed} units)`;
                    this._notifyEvent(msg, 'orange', 4000, 'MARKET_SHORTAGE', { stationName: station.name, commodity: commodity.name });
                    this._addPersistentEvent(`SHORTAGE_${station.name}`, `${station.name}: ${commodity.name} Shortage (High Prices)`, 'orange', this._extendDurationMs(180000));

                    if (station?.pos) {
                        this._addEventMarkerSafely(`SHORTAGE_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `${commodity.name} Shortage`, 'orange', this._extendDurationMs(180000));
                    }
                }
                break;
            }

            case 'MARKET_SURPLUS': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const commodity = this._pickCommodity(station.market);
                if (!commodity) return;

                const baseline = commodity.baseStock || commodity.stock || 8;
                const grant = Math.max(1, Math.round(baseline * random(0.6, 1.1)));
                const added = station.market.addStockFromNPC(commodity.name, grant);

                if (added > 0) {
                    const msg = `${station.name}: ${commodity.name} oversupply (+${added} units)`;
                    this._notifyEvent(msg, 'green', 4000, 'MARKET_SURPLUS', { stationName: station.name, commodity: commodity.name });
                    this._addPersistentEvent(`SURPLUS_${station.name}`, `${station.name}: ${commodity.name} Surplus (Low Prices)`, 'green', this._extendDurationMs(180000));

                    if (station?.pos) {
                        this._addEventMarkerSafely(`SURPLUS_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `${commodity.name} Surplus`, 'green', this._extendDurationMs(180000));
                    }
                }
                break;
            }

            case 'BLACK_MARKET_AUCTION': {
                const types = ['Narcotics', 'Weapons', 'Slaves'];
                const count = floor(random(2, 6));
                const spawnedTypes = new Set();

                for (let i = 0; i < count; i++) {
                    const angle = random(TWO_PI);
                    const r = random(1600, 3000);
                    const x = this.player.pos.x + cos(angle) * r;
                    const y = this.player.pos.y + sin(angle) * r;
                    const t = random(types);
                    spawnedTypes.add(t);

                    const baseQty = Math.max(1, floor(random(1, 4)));
                    const qty = Math.max(1, Math.floor(baseQty * this.cargoQuantityMultiplier));
                    const markerId = `BLACK_MARKET_${frameCount}_${i}`;
                    const label = `${t} cache`;

                    const cargo = this._spawnCargoWithMarker(x, y, t, qty, markerId, label, 'purple', this._extendDurationMs(180000));
                }

                // Add 2-3 Lurking Pirates near the auction center to provide risk
                const pirateCount = floor(random(2, 4));
                for (let i = 0; i < pirateCount; i++) {
                    const ang = random(TWO_PI);
                    const dist = random(1200, 1800);
                    const px = this.player.pos.x + cos(ang) * dist;
                    const py = this.player.pos.y + sin(ang) * dist;
                    this._spawnAdHocEnemy(px, py, AI_ROLE.PIRATE, (e) => {
                        e.currentState = AI_STATE.PATROLLING;
                        e.displayName = "Auction Lurker";
                    });
                }

                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`${systemLabel}: Black market auction seeded ${count} caches (${Array.from(spawnedTypes).join(', ')})`, 'purple');
                break;
            }
        }
    }

    // ============================================
    // Social/Political Event Handlers
    // ============================================

    _executeSocialEvent(eventType) {
        switch (eventType) {
            case 'SMUGGLING_BUST': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const illegal = station.market.commodities?.filter(c => c && c.isLegal === false && c.stock > 0) || [];
                let seizedName = null;
                let seizedAmount = 0;

                if (illegal.length) {
                    const chosen = random(illegal);
                    const request = Math.max(1, Math.round((chosen.baseStock || chosen.stock || 10) * random(0.5, 0.8)));
                    seizedAmount = station.market.consumeStockForNPC(chosen.name, request, { allowPartial: true });
                    seizedName = chosen.name;
                }

                const spawnCount = Math.max(4, Math.floor(random(4, 8)));
                const anchor = station.pos || this.player.pos;
                this._spawnPolicePatrol(spawnCount, anchor, 'SMUGGLING_BUST');

                const seizedText = seizedAmount > 0 && seizedName ? `${seizedAmount} ${seizedName} seized` : 'Contraband routes disrupted';
                this._notifyEvent(`${station.name}: Smuggling bust (${seizedText}; ${spawnCount} patrol ships dispatched)`, 'red', 4000, 'SMUGGLING_BUST', { stationName: station.name });

                this._addEventMarkerSafely(`SMUGGLE_BUST_${frameCount}`, anchor.x, anchor.y, `Smuggling Bust`, 'red', this._extendDurationMs(60000));
                break;
            }

            case 'BLOCKADE': {
                const durationMs = this._extendDurationMs(60 * 1000);
                this.starSystem.blockadeExpires = millis() + durationMs;

                const station = this._pickRandomStation();
                const anchor = station?.pos || this.player.pos;
                const anchorName = this._formatStationLabel(station);
                const spawnCount = Math.max(5, Math.floor(random(5, 9)));
                const radius = (station?.dockingRadius || 800) + random(400, 900);

                this._spawnGuardFormation(spawnCount, anchor, station || this.player, radius);

                this._notifyEvent(`${anchorName}: Naval blockade established (${spawnCount} gunships)`, 'blue', durationMs);
                this._addPersistentEvent('BLOCKADE', `${anchorName}: Naval Blockade Active`, 'blue', durationMs);

                this._addEventMarkerSafely(`BLOCKADE_${frameCount}`, anchor.x, anchor.y, `Blockade`, 'blue', durationMs);
                break;
            }

            case 'DIPLOMATIC_VISIT': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const currentLux = station.market.getAvailableStock ? station.market.getAvailableStock('Luxury Goods') : 0;
                const added = station.market.addStockFromNPC('Luxury Goods', Math.max(8, Math.round((currentLux || 25) * random(0.8, 1.4))));

                this._notifyEvent(`[STAR] ${station.name}: Diplomatic envoy delivers gifts (+${added} Luxury Goods)`, 'teal');

                if (station?.pos) {
                    this._addEventMarkerSafely(`DIPLOMATIC_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `Diplomatic Visit`, 'teal', this._extendDurationMs(60000));
                }
                break;
            }

            case 'TECH_BREAKTHROUGH': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const added = station.market.addStockFromNPC('Adv Components', Math.max(8, Math.round(random(8, 16))));
                this._notifyEvent(`[STAR] ${station.name}: Tech breakthrough (+${added} Adv Components)`, 'magenta');

                if (station?.pos) {
                    station.techBreakthroughExpires = millis() + this._extendDurationMs(180000);
                    this._addEventMarkerSafely(`TECH_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `Tech Breakthrough`, 'magenta', this._extendDurationMs(180000));
                }
                break;
            }

            case 'STATION_STRIKE': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const availableFood = station.market.getAvailableStock ? station.market.getAvailableStock('Food') : 0;
                const consumed = station.market.consumeStockForNPC('Food', Math.max(3, Math.round((availableFood || 20) * random(0.6, 1))), { allowPartial: true });

                this._notifyEvent(`${station.name}: Strike limits services (-${consumed} Food)`, 'orange');
                if (station) {
                    station.strikeExpires = millis() + this._extendDurationMs(180000);
                    this._addPersistentEvent(`STRIKE_${station.name}`, `${station.name}: Station Strike (Services Limited)`, 'orange', this._extendDurationMs(180000));

                    if (station?.pos) {
                        this._addEventMarkerSafely(`STRIKE_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `Station Strike`, 'orange', this._extendDurationMs(180000));
                    }
                }
                break;
            }
        }
    }

    // ============================================
    // Crisis Event Handlers
    // ============================================

    _executeCrisisEvent(eventType) {
        switch (eventType) {
            case 'POWER_OUTAGE': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const outageDuration = this._extendDurationMs(45 * 1000);
                station.powerOutageExpires = millis() + outageDuration;

                const lostComputers = this._drainCommodityByPercent(station.market, 'Computers', 0.35, 0.6);
                const lostMachinery = this._drainCommodityByPercent(station.market, 'Machinery', 0.3, 0.5);
                const lostAdv = this._drainCommodityByPercent(station.market, 'Adv Components', 0.25, 0.45);

                const parts = [];
                if (lostComputers) parts.push(`${lostComputers} Computers`);
                if (lostMachinery) parts.push(`${lostMachinery} Machinery`);
                if (lostAdv) parts.push(`${lostAdv} Adv Components`);
                const summary = parts.length ? parts.join(', ') : 'systems offline';

                this._notifyEvent(`${station.name}: Power outage (${summary})`, 'yellow');
                this._addPersistentEvent(`OUTAGE_${station.name}`, `${station.name}: Power Outage`, 'yellow', outageDuration);

                if (station?.pos) {
                    this._addEventMarkerSafely(`OUTAGE_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `Power Outage`, 'yellow', outageDuration);
                }
                break;
            }

            case 'SABOTAGE': {
                const targetObj = this._pickSpaceObject(obj => obj && !obj.destroyed);
                const anchor = targetObj?.pos || this.player.pos;
                const ang = random(TWO_PI);
                const r = random(900, 2200);
                const x = anchor.x + cos(ang) * r;
                const y = anchor.y + sin(ang) * r;

                const baseQty = Math.max(1, floor(random(2, 8)));
                const qty = Math.max(1, Math.floor(baseQty * this.cargoQuantityMultiplier));
                const lootTypes = ['Metals', 'Machinery', 'Adv Components', 'Computers'];

                try {
                    const t = random(lootTypes);
                    const c = new Cargo(x, y, t, qty);
                    this.starSystem.addCargo(c);
                    this._addEventMarkerSafely(`SABOTAGE_${frameCount}`, x, y, `Sabotage: ${t}`, 'crimson', this._extendDurationMs(180000));
                } catch (e) {
                    this.starSystem.addCargo(new Cargo(x, y, 'Metals', Math.max(1, floor(random(2, 8)))));
                }

                const descriptor = targetObj ? `${targetObj.type} near ${targetObj.planetName || 'deep orbit'}` : `${this._formatStationLabel(null)} infrastructure`;
                this._notifyEvent(`Sabotage: ${descriptor} damaged, salvage drifting nearby`, 'crimson');
                break;
            }

            case 'MINING_BOOM': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const metals = station.market.addStockFromNPC('Metals', Math.max(15, Math.floor(random(20, 40))));
                const minerals = station.market.addStockFromNPC('Minerals', Math.max(15, Math.floor(random(20, 40))));

                this._notifyEvent(`${station.name}: Mining boom (+${metals} Metals, +${minerals} Minerals)`, 'olive', 4000, 'MINING_BOOM', { stationName: station.name });
                this._addPersistentEvent(`BOOM_${station.name}`, `${station.name}: Mining Boom (High Supply)`, 'olive', this._extendDurationMs(180000));

                if (station?.pos) {
                    this._addEventMarkerSafely(`BOOM_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `Mining Boom`, 'olive', this._extendDurationMs(180000));
                }
                break;
            }

            case 'MINE_ACCIDENT': {
                const ang = random(TWO_PI);
                const r = random(1200, 2200);
                const baseQty = Math.max(1, floor(random(1, 6)));
                const qty = Math.max(1, Math.floor(baseQty * this.cargoQuantityMultiplier));
                const x = this.player.pos.x + cos(ang) * r;
                const y = this.player.pos.y + sin(ang) * r;

                const markerId = `MINE_ACCIDENT_${frameCount}`;
                const label = `Salvage: ${qty} Metals`;
                this._spawnCargoWithMarker(x, y, 'Metals', qty, markerId, label, 'orange', this._extendDurationMs(180000));

                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`${systemLabel}: Mine accident spilled ${qty} units of ore — salvage beacons deployed`, 'orange');
                break;
            }

            case 'SOLAR_FLARE': {
                const shieldDamage = Math.round(Math.max(15, (this.player.maxShield || 0) * random(0.25, 0.45)));
                if (typeof this.player.shield === 'number') {
                    // Safety check: Don't kill player if they are already low
                    if (this.player.shield > 20) {
                        this.player.shield = Math.max(10, this.player.shield - shieldDamage);
                    }
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
                this._notifyEvent(`[STORM] ${systemLabel}: Solar flare scorches shields (-${shieldDamage} shield strength)`, 'yellow');
                this._addPersistentEvent('SOLAR_FLARE', 'WARNING: Solar Flare Activity', 'yellow', this._extendDurationMs(30000));
                break;
            }

            case 'QUARANTINE': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const durationMs = this._extendDurationMs(180000);
                const consumed = station.market.consumeStockForNPC('Food', Math.max(6, Math.round(random(12, 35))), { allowPartial: true });

                // Disable all commodity trading at this station
                station.quarantineExpires = millis() + durationMs;

                this._notifyEvent(`${station.name}: Quarantine enforced (-${consumed} Food; trading suspended!)`, 'purple');
                this._addPersistentEvent(`QUARANTINE_${station.name}`, `${station.name}: Quarantine (Trading Disabled)`, 'purple', durationMs);

                if (station?.pos) {
                    this._addEventMarkerSafely(`QUARANTINE_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `Quarantine`, 'purple', durationMs);
                }
                break;
            }

            case 'REFUGEE_INFLUX': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const durationMs = this._extendDurationMs(60000);
                const consumed = station.market.consumeStockForNPC('Food', Math.max(8, Math.round(random(15, 45))), { allowPartial: true });

                // Triple Food prices at this station
                station.refugeeInfluxExpires = millis() + durationMs;
                station.refugeeInfluxFoodPriceMultiplier = 3.0;

                this._notifyEvent(`${station.name}: Refugee influx (-${consumed} Food; prices tripled!)`, 'brown');
                this._addPersistentEvent(`REFUGEE_${station.name}`, `${station.name}: Refugee Influx (Food Prices ×3)`, 'brown', durationMs);
                break;
            }

            case 'HACKER_ATTACK': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const computersLost = this._drainCommodityByPercent(station.market, 'Computers', 0.45, 0.75);
                const medsLost = this._drainCommodityByPercent(station.market, 'Medicine', 0.2, 0.4);
                const spawnCount = Math.max(2, Math.floor(random(2, 5)));
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

                if (station?.pos) {
                    this._addEventMarkerSafely(`HACKER_${station.name}_${frameCount}`, station.pos.x, station.pos.y, `Hacker Attack`, 'purple', this._extendDurationMs(60000));
                }
                break;
            }

            case 'PLAGUE': {
                // Plague affects Medicine prices in this system and connected systems
                const durationMs = this._extendDurationMs(300000); // 5 minutes base
                const priceMultiplier = random(8, 15); // 8x to 15x price increase for dramatic effect
                const originSystemIndex = typeof galaxy !== 'undefined' ? galaxy.currentSystemIndex : 0;

                this.activeCrisisState.plague = {
                    originSystemIndex: originSystemIndex,
                    expires: millis() + durationMs,
                    priceMultiplier: priceMultiplier
                };

                // Consume Medicine stock at local station to simulate demand
                const station = this._pickStationWithMarket();
                if (station) {
                    const consumed = station.market.consumeStockForNPC('Medicine', Math.max(10, Math.round(random(20, 50))), { allowPartial: true });
                }

                // Spawn emergency haulers bringing supplies
                this._spawnCrisisHaulers(3, 'Medicine');

                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`[FAMINE] ${systemLabel}: PLAGUE outbreak! Medicine prices soaring (×${priceMultiplier.toFixed(1)})`, 'magenta');
                this._addPersistentEvent('PLAGUE_ACTIVE', `☠️ PLAGUE: Medicine ×${priceMultiplier.toFixed(1)} (affects connected systems)`, 'magenta', durationMs);

                // Add news about plague (local + connected systems)
                if (typeof newsManager !== 'undefined' && newsManager.addCrisisNews) {
                    newsManager.addCrisisNews(systemLabel, 'plague', false);

                    // Also add news for connected systems (distant crises)
                    if (typeof galaxy !== 'undefined' && galaxy.systems) {
                        const originSystem = galaxy.systems[originSystemIndex];
                        if (originSystem && originSystem.connectedSystemIndices) {
                            originSystem.connectedSystemIndices.forEach(connIdx => {
                                const connSystem = galaxy.systems[connIdx];
                                if (connSystem && connSystem.name) {
                                    newsManager.addCrisisNews(connSystem.name, 'plague', true);
                                }
                            });
                        }
                    }
                }
                break;
            }

            case 'FAMINE': {
                // Famine affects Food prices in this system and connected systems
                const durationMs = this._extendDurationMs(300000); // 5 minutes base
                const priceMultiplier = random(8, 15); // 8x to 15x price increase for dramatic effect
                const originSystemIndex = typeof galaxy !== 'undefined' ? galaxy.currentSystemIndex : 0;

                this.activeCrisisState.famine = {
                    originSystemIndex: originSystemIndex,
                    expires: millis() + durationMs,
                    priceMultiplier: priceMultiplier
                };

                // Consume Food stock at local station to simulate demand
                const station = this._pickStationWithMarket();
                if (station) {
                    const consumed = station.market.consumeStockForNPC('Food', Math.max(10, Math.round(random(20, 50))), { allowPartial: true });
                }

                // Spawn emergency haulers bringing supplies  
                this._spawnCrisisHaulers(3, 'Food');

                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`[FAMINE] ${systemLabel}: FAMINE! Food prices soaring (×${priceMultiplier.toFixed(1)})`, 'orange');
                this._addPersistentEvent('FAMINE_ACTIVE', `🍂 FAMINE: Food ×${priceMultiplier.toFixed(1)} (affects connected systems)`, 'orange', durationMs);

                // Add news about famine (local + connected systems)
                if (typeof newsManager !== 'undefined' && newsManager.addCrisisNews) {
                    newsManager.addCrisisNews(systemLabel, 'famine', false);

                    // Also add news for connected systems (distant crises)
                    if (typeof galaxy !== 'undefined' && galaxy.systems) {
                        const originSystem = galaxy.systems[originSystemIndex];
                        if (originSystem && originSystem.connectedSystemIndices) {
                            originSystem.connectedSystemIndices.forEach(connIdx => {
                                const connSystem = galaxy.systems[connIdx];
                                if (connSystem && connSystem.name) {
                                    newsManager.addCrisisNews(connSystem.name, 'famine', true);
                                }
                            });
                        }
                    }
                }
                break;
            }
        }
    }

    // ============================================
    // Miscellaneous Event Handlers
    // ============================================

    _executeMiscEvent(eventType) {
        switch (eventType) {
            case 'BOUNTY_INCREASE': {
                const spawnCount = Math.max(4, Math.floor(random(5, 9)));
                const anchorVec = this.starSystem.jumpZoneCenter || this.player.pos;
                const baseRadius = (this.starSystem.jumpZoneRadius || 600) + random(300, 700);

                // Collect available pirates to assign as targets
                const availablePirates = (this.starSystem.enemies || []).filter(
                    e => e && e.role === AI_ROLE.PIRATE && !e.destroyed
                );
                let pirateIndex = 0;

                // Spawn bounty hunters that hunt pirates
                for (let i = 0; i < spawnCount; i++) {
                    const angle = random(TWO_PI);
                    const dist = baseRadius + random(-200, 200);
                    const sx = anchorVec.x + cos(angle) * dist;
                    const sy = anchorVec.y + sin(angle) * dist;
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.BOUNTY_HUNTER, (enemy) => {
                        // Assign a pirate target if available, otherwise null (will fall back to player)
                        if (availablePirates.length > 0) {
                            // Distribute bounty hunters across available pirates
                            enemy.bountyTarget = availablePirates[pirateIndex % availablePirates.length];
                            pirateIndex++;
                        }
                        // Note: if no pirates, bountyTarget stays null and bounty hunter targets player
                        enemy.currentState = AI_STATE.APPROACHING;
                    });
                }

                const systemLabel = this.starSystem?.name || 'Local sector';
                const targetInfo = availablePirates.length > 0
                    ? `hunting ${availablePirates.length} pirates`
                    : 'seeking targets';
                this._notifyEvent(`${systemLabel}: Bounty payouts raised — ${spawnCount} hunter ships ${targetInfo}`, 'red');
                this._addPersistentEvent('BOUNTY_INCREASE', 'NOTICE: High Bounty Payouts Active', 'red', this._extendDurationMs(180000));
                break;
            }

            case 'REPUTATION_SCANDAL': {
                const station = this._pickStationWithMarket();
                if (!station) return;

                const addedLux = this._addCommodityByPercent(station.market, 'Luxury Goods', 0.45, 0.75);
                const recalledTextiles = this._drainCommodityByPercent(station.market, 'Textiles', 0.25, 0.5);

                const pieces = [];
                if (addedLux) pieces.push(`+${addedLux} Luxury Goods dumped`);
                if (recalledTextiles) pieces.push(`${recalledTextiles} Textiles recalled`);
                const summary = pieces.length ? pieces.join(', ') : 'brand damage ripples';

                this._notifyEvent(`${station.name}: Reputation scandal (${summary})`, 'pink');
                this._addPersistentEvent(`SCANDAL_${station.name}`, `${station.name}: Reputation Scandal (Market Volatility)`, 'pink', this._extendDurationMs(180000));
                break;
            }
        }
    }

    // ============================================
    // New Random Event Handlers
    // ============================================

    _executeNewRandomEvent(eventType) {
        switch (eventType) {
            case 'LOST_SHIPMENT': {
                const centerAngle = random(TWO_PI);
                const centerDist = random(1500, 2500);
                const cx = this.player.pos.x + cos(centerAngle) * centerDist;
                const cy = this.player.pos.y + sin(centerAngle) * centerDist;

                // Spawn Cargo Cluster
                const cargoCount = floor(random(3, 6));
                const lootTypes = ['Gold', 'Platinum', 'Luxury Goods', 'Weapons'];
                for (let i = 0; i < cargoCount; i++) {
                    const ang = random(TWO_PI);
                    const dist = random(50, 300); // Tight cluster
                    const type = random(lootTypes);
                    const qty = floor(random(1, 3)) * this.cargoQuantityMultiplier;
                    const markerId = `LOST_LOOT_${frameCount}_${i}`;
                    this._spawnCargoWithMarker(cx + cos(ang) * dist, cy + sin(ang) * dist, type, qty, markerId, 'Lost Cargo', 'gold', this._extendDurationMs(180000));
                }

                // Spawn Pirates (Ambush)
                const pirateCount = floor(random(2, 4));
                for (let i = 0; i < pirateCount; i++) {
                    const ang = random(TWO_PI);
                    const dist = random(400, 800); // Surrounding the loot
                    this._spawnAdHocEnemy(cx + cos(ang) * dist, cy + sin(ang) * dist, AI_ROLE.PIRATE, (e) => {
                        e.currentState = AI_STATE.PATROLLING; // Start patrolling the loot
                        e.target = null;
                        e.displayName = "Ambush Pirate";
                    });
                }

                const systemLabel = this.starSystem?.name || 'Local sector';
                this._notifyEvent(`${systemLabel}: Lost shipment signal detected (High value)`, 'gold', 4000, 'LOST_SHIPMENT');
                break;
            }

            case 'FACTION_SKIRMISH': {
                const angle = random(TWO_PI);
                const dist = random(1200, 2000);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                // Spawn Police Group
                const policeCount = floor(random(2, 4));
                const policeShips = [];
                for (let i = 0; i < policeCount; i++) {
                    const px = cx + random(-200, 200);
                    const py = cy + random(-200, 200);
                    this._spawnAdHocEnemy(px, py, AI_ROLE.POLICE, (e) => {
                        e.currentState = AI_STATE.COMBAT;
                        policeShips.push(e);
                    });
                }

                // Spawn Pirate Group
                const pirateCount = floor(random(2, 4));
                const pirateShips = [];
                for (let i = 0; i < pirateCount; i++) {
                    const px = cx + random(300, 600); // Gap between groups
                    const py = cy + random(-200, 200);
                    this._spawnAdHocEnemy(px, py, AI_ROLE.PIRATE, (e) => {
                        e.currentState = AI_STATE.COMBAT;
                        pirateShips.push(e);
                    });
                }

                // Set mutual targets
                policeShips.forEach(p => { if (pirateShips.length > 0) p.target = random(pirateShips); });
                pirateShips.forEach(p => { if (policeShips.length > 0) p.target = random(policeShips); });

                this._notifyEvent(`ALERT: Faction skirmish detected nearby!`, 'red', 4000, 'FACTION_SKIRMISH');
                this._addEventMarkerSafely(`SKIRMISH_${frameCount}`, cx, cy, "Faction Skirmish", "red", this._extendDurationMs(60000));
                break;
            }

            case 'VIP_CONVOY': {
                const station = this.starSystem.station;
                const spawnAnchor = station || this.player;
                const angle = random(TWO_PI);
                const dist = station ? (station.dockingRadius + 1000) : 2000;

                const cx = spawnAnchor.pos.x + cos(angle) * dist;
                const cy = spawnAnchor.pos.y + sin(angle) * dist;

                // Spawn VIP Trader
                const vip = this._spawnAdHocEnemy(cx, cy, AI_ROLE.HAULER, (e) => {
                    e.displayName = "VIP Transport";
                    e.currentState = AI_STATE.FLEEING; // Moving towards jump/station
                    e.cargo = "Platinum";
                    e.cargoAmount = 50;
                }, 'Type9Heavy'); // Prefer Type9, fallback handled in spawn logic if missing

                if (vip) {
                    // Spawn Escort
                    this._spawnGuardFormation(3, { x: cx, y: cy }, vip, 300);
                    this._notifyEvent(`TRAFFIC: VIP Convoy identified.`, 'cyan', 4000, 'VIP_CONVOY');
                    if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                        this._addEventMarkerSafely(`VIP_${frameCount}`, cx, cy, "VIP Convoy", "cyan", this._extendDurationMs(60000));
                    }
                }
                break;
            }

            case 'MINING_OPERATION': {
                // Reuse Asteroid Spawn logic partially but custom
                const angle = random(TWO_PI);
                const dist = random(2000, 3000);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                // Spawn Asteroids
                for (let i = 0; i < 8; i++) {
                    const ax = cx + random(-400, 400);
                    const ay = cy + random(-400, 400);
                    const r = random(30, 60);
                    if (this.starSystem.addAsteroid) this.starSystem.addAsteroid(new Asteroid(ax, ay, r));
                }

                // Spawn Miners
                const minerCount = floor(random(2, 4));
                for (let i = 0; i < minerCount; i++) {
                    const mx = cx + random(-200, 200);
                    const my = cy + random(-200, 200);
                    this._spawnAdHocEnemy(mx, my, AI_ROLE.MINER, (e) => {
                        e.currentState = AI_STATE.MINING;
                    });
                }

                // Spawn Guard
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.GUARD, (e) => {
                    e.currentState = AI_STATE.PATROLLING;
                    e.displayName = "Mining Security";
                });

                this._notifyEvent(`OPS: Temporary mining operation detected.`, 'yellow', 4000, 'MINING_OPERATION');
                this._addEventMarkerSafely(`MINING_${frameCount}`, cx, cy, "Mining Op", "yellow", this._extendDurationMs(180000));
                break;
            }

            case 'FORCED_CONVERSION': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let trader = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.HAULER, (e) => {
                    e.currentState = AI_STATE.FLEEING;
                    e.displayName = "Harassed Trader";
                    trader = e;
                });

                if (trader) {
                    for (let i = 0; i < 2; i++) {
                        const mx = cx + random(-200, 200);
                        const my = cy + random(-200, 200);
                        this._spawnAdHocEnemy(mx, my, AI_ROLE.MISSIONARY, (e) => {
                            e.target = trader;
                            e.currentState = AI_STATE.COMBAT;
                            e.displayName = "Zealous Missionary";
                        }, 'PosthumanMissionary');
                    }
                    this._notifyEvent(`DISTRESS: Trader under religious siege!`, 'orange', 4000, 'FORCED_CONVERSION');
                    if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                        this._addEventMarkerSafely(`CONVERT_${frameCount}`, cx, cy, "Forced Conversion", "orange", this._extendDurationMs(60000));
                    }
                }
                break;
            }

            case 'HERETIC_HUNT': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let heretic = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.MISSIONARY, (e) => {
                    e.currentState = AI_STATE.FLEEING;
                    e.displayName = "Heretic Vessel";
                    heretic = e;
                }, 'PosthumanMissionary');

                if (heretic) {
                    for (let i = 0; i < 2; i++) {
                        const mx = cx + random(-300, 300);
                        const my = cy + random(-300, 300);
                        this._spawnAdHocEnemy(mx, my, AI_ROLE.COMBAT, (e) => {
                            e.target = heretic;
                            e.currentState = AI_STATE.COMBAT;
                            e.displayName = "Inquisitor";
                        }, 'Viper');
                    }
                    this._notifyEvent(`ALERT: Military purging heretic vessel.`, 'red', 4000, 'HERETIC_HUNT');
                    if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                        this._addEventMarkerSafely(`HERETIC_${frameCount}`, cx, cy, "Heretic Hunt", "red", this._extendDurationMs(60000));
                    }
                }
                break;
            }

            case 'DOOMSDAY_PROPHET': {
                const angle = random(TWO_PI);
                const dist = random(1200, 1800);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                const prophet = this._spawnAdHocEnemy(cx, cy, AI_ROLE.MISSIONARY, (e) => {
                    e.currentState = AI_STATE.IDLE;
                    e.displayName = "Doomsday Prophet";
                    // Initial broadcast
                    if (typeof communicationSystem !== 'undefined') {
                        communicationSystem.broadcastMessage(e, ["{enemyName}: The end is nigh! Embrace the void!"], [180, 100, 255]);
                    }
                }, 'PosthumanMissionary');

                if (this.starSystem.cosmicStorms) {
                    this.starSystem.cosmicStorms.push(new CosmicStorm(cx, cy, 800, 'ION'));
                }

                this._notifyEvent(`COMMS: 'The end is nigh! Embrace the void!'`, 'purple', 4000, 'DOOMSDAY_PROPHET');
                this._addEventMarkerSafely(`PROPHET_${frameCount}`, cx, cy, "Doomsday Prophet", "purple", this._extendDurationMs(60000));
                break;
            }

            case 'ASCENSION_RITUAL': {
                const angle = random(TWO_PI);
                const dist = 3000;
                for (let i = 0; i < 3; i++) {
                    const offsetX = random(-100, 100);
                    const offsetY = random(-100, 100);
                    this._spawnAdHocEnemy(cos(angle) * dist + offsetX, sin(angle) * dist + offsetY, AI_ROLE.MISSIONARY, (e) => {
                        e.currentState = AI_STATE.PATROLLING;
                        e.patrolPoint = createVector(0, 0); // Sun
                        e.displayName = "Ascendant";
                    }, 'PosthumanMissionary');
                }
                this._notifyEvent(`RITUAL: Ascension flight detected.`, 'cyan', 4000, 'ASCENSION_RITUAL');
                this._addEventMarkerSafely(`ASCENSION_${frameCount}`, 0, 0, "Ascension Center", "cyan", this._extendDurationMs(180000));
                break;
            }

            case 'ARTIFACT_WORSHIP': {
                const angle = random(TWO_PI);
                const dist = random(2000, 3000);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                this._spawnCargoWithMarker(cx, cy, 'Alien Artifact', 1, `ARTIFACT_${frameCount}`, 'Relic Worship', 'magenta', this._extendDurationMs(300000));

                for (let i = 0; i < 2; i++) {
                    const a = random(TWO_PI);
                    const d = 200;
                    this._spawnAdHocEnemy(cx + cos(a) * d, cy + sin(a) * d, AI_ROLE.MISSIONARY, (e) => {
                        e.currentState = AI_STATE.IDLE;
                        e.displayName = "Worshipper";
                        e.angle = atan2(cy - e.pos.y, cx - e.pos.x);
                    }, 'PosthumanMissionary');
                }
                this._notifyEvent(`SCAN: Religious activity near unknown artifact.`, 'magenta', 4000, 'ARTIFACT_WORSHIP');
                break;
            }

            case 'CLEANSING_FIRE': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let plagueShip = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.HAULER, (e) => {
                    e.currentState = AI_STATE.FLEEING;
                    e.displayName = "Unclean Vessel";
                    e.hull = e.maxHull * 0.5;
                    plagueShip = e;
                }, 'Type6Transporter');

                if (plagueShip) {
                    for (let i = 0; i < 2; i++) {
                        const mx = cx + random(-200, 200);
                        const my = cy + random(-200, 200);
                        this._spawnAdHocEnemy(mx, my, AI_ROLE.MISSIONARY, (e) => {
                            e.target = plagueShip;
                            e.currentState = AI_STATE.COMBAT;
                            e.displayName = "Purifier";
                        }, 'PosthumanMissionary');
                    }
                    this._notifyEvent(`PURGE: Missionaries attacking unclean vessel.`, 'orange', 4000, 'CLEANSING_FIRE');
                    if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                        this._addEventMarkerSafely(`PURGE_${frameCount}`, cx, cy, "Cleansing Fire", "orange", this._extendDurationMs(60000));
                    }
                }
                break;
            }

            case 'TECH_CRUSADE': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                const aliens = [];
                for (let i = 0; i < 2; i++) {
                    const ax = cx + random(-200, 200);
                    const ay = cy + random(-200, 200);
                    this._spawnAdHocEnemy(ax, ay, AI_ROLE.ALIEN, (e) => {
                        e.currentState = AI_STATE.COMBAT;
                        aliens.push(e);
                    });
                }

                for (let i = 0; i < 2; i++) {
                    const mx = cx + random(-200, 200);
                    const my = cy + random(-200, 200);
                    this._spawnAdHocEnemy(mx, my, AI_ROLE.MISSIONARY, (e) => {
                        if (aliens.length > 0) e.target = random(aliens);
                        e.currentState = AI_STATE.COMBAT;
                        e.displayName = "Crusader";
                    }, 'PosthumanMissionary');
                }
                this._notifyEvent(`WAR: Posthumans engaging alien presence.`, 'cyan', 4000, 'TECH_CRUSADE');
                this._addEventMarkerSafely(`CRUSADE_${frameCount}`, cx, cy, "Tech Crusade", "cyan", this._extendDurationMs(60000));
                break;
            }

            case 'IMPERIAL_INTERDICTION': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let suspect = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.HAULER, (e) => {
                    e.currentState = AI_STATE.IDLE; // Ordered to stop
                    e.displayName = "Detained Hauler";
                    suspect = e;
                }, 'Type6Transporter');

                if (suspect) {
                    // Spawn Inspector circling/near the hauler using angle-aware offset
                    const ix = cx + cos(angle) * 300;
                    const iy = cy + sin(angle) * 300;
                    this._spawnAdHocEnemy(ix, iy, AI_ROLE.POLICE, (e) => {
                        e.target = suspect;
                        e.currentState = AI_STATE.PATROLLING; // Circling
                        e.displayName = "Imperial Inspector";
                    }, 'ImperialEagleMkII');
                    this._notifyEvent(`AUTHORITY: Imperial forces inspecting vessel.`, 'cyan', 4000, 'IMPERIAL_INTERDICTION');
                    if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                        this._addEventMarkerSafely(`INTERDICT_${frameCount}`, cx, cy, "Imperial Interdiction", "cyan", this._extendDurationMs(60000));
                    }
                }
                break;
            }

            case 'SEPARATIST_AMBUSH': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let transport = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.HAULER, (e) => {
                    e.currentState = AI_STATE.FLEEING;
                    e.displayName = "Imperial Logistics";
                    transport = e;
                }, 'ImperialEnvoy'); // Fallback if not exists

                if (transport) {
                    for (let i = 0; i < 3; i++) {
                        // Offset along the direction of travel (angle) for ambushers
                        const spread = random(-200, 200);
                        const sx = cx + cos(angle) * 400 + random(-100, 100);
                        const sy = cy + sin(angle) * 400 + random(-100, 100);
                        this._spawnAdHocEnemy(sx, sy, AI_ROLE.COMBAT, (e) => {
                            e.target = transport;
                            e.currentState = AI_STATE.COMBAT;
                            e.displayName = "Rebel Ambusher";
                        }, 'SeparatistPartisan'); // Fallback
                    }
                    this._notifyEvent(`AMBUSH: Rebel forces engaging logistics.`, 'orange', 4000, 'SEPARATIST_AMBUSH');
                    if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                        this._addEventMarkerSafely(`AMBUSH_${frameCount}`, cx, cy, "Separatist Ambush", "orange", this._extendDurationMs(60000));
                    }
                }
                break;
            }

            case 'DEFECTOR_ESCORT': {
                const angle = random(TWO_PI);
                const dist = random(2000, 3000);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let defector = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.HAULER, (e) => {
                    e.currentState = AI_STATE.FLEEING;
                    e.displayName = "Imperial Defector";
                    defector = e;
                }, 'ImperialCourier');

                if (defector) {
                    for (let i = 0; i < 2; i++) {
                        // Pursuers start BEHIND the defector relative to spawn angle
                        const distanceBehind = 500;
                        const sx = cx - cos(angle) * distanceBehind + random(-100, 100);
                        const sy = cy - sin(angle) * distanceBehind + random(-100, 100);
                        this._spawnAdHocEnemy(sx, sy, AI_ROLE.COMBAT, (e) => {
                            e.target = defector;
                            e.currentState = AI_STATE.COMBAT;
                            e.displayName = "Imperial Pursuer";
                        }, 'Viper');
                    }
                    this._notifyEvent(`ALERT: High-value defector detected.`, 'gold', 4000, 'DEFECTOR_ESCORT');
                    this._addEventMarkerSafely(`DEFECTOR_${frameCount}`, cx, cy, "Defector Chase", "gold", this._extendDurationMs(60000));
                }
                break;
            }

            case 'DIPLOMATIC_STANDOFF': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                // Form a line perpendicular to the standoff vector
                const perpAngle = angle + HALF_PI;
                // Imperials on "one side" (offset by -300 along the standoff vector)
                for (let i = 0; i < 2; i++) {
                    const offset = (i - 0.5) * 200;
                    const sx = cx - cos(angle) * 300 + cos(perpAngle) * offset;
                    const sy = cy - sin(angle) * 300 + sin(perpAngle) * offset;
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.COMBAT, (e) => {
                        e.currentState = AI_STATE.IDLE;
                        e.displayName = "Imperial Diplomat";
                        e.angle = angle; // Facing towards the standoff center
                    }, 'ImperialCourier');
                }

                // Separatists on the "other side" (offset by +300)
                for (let i = 0; i < 2; i++) {
                    const offset = (i - 0.5) * 200;
                    const sx = cx + cos(angle) * 300 + cos(perpAngle) * offset;
                    const sy = cy + sin(angle) * 300 + sin(perpAngle) * offset;
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.COMBAT, (e) => {
                        e.currentState = AI_STATE.IDLE;
                        e.displayName = "Rebel Delegate";
                        e.angle = angle + PI; // Facing back towards the standoff center
                    }, 'SeparatistPartisan');
                }
                this._notifyEvent(`POLITICAL: Tense diplomatic standoff in progress.`, 'cyan', 4000, 'DIPLOMATIC_STANDOFF');
                this._addEventMarkerSafely(`STANDOFF_${frameCount}`, cx, cy, "Diplomatic Standoff", "cyan", this._extendDurationMs(60000));
                break;
            }

            case 'PROTOTYPE_HEIST': {
                const angle = random(TWO_PI);
                const dist = random(2000, 3000);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let stolenShip = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.HAULER, (e) => {
                    e.currentState = AI_STATE.FLEEING;
                    e.displayName = "Stolen Prototype";
                    e.faction = 'SEPARATIST'; // Override faction to ensure guards attack
                    stolenShip = e;
                }, 'ImperialCutterLite');

                if (stolenShip) {
                    for (let i = 0; i < 3; i++) {
                        // Guards start BEHIND the stolen ship relative to spawn direction
                        const distanceBehind = 400 + random(100);
                        const sx = cx - cos(angle) * distanceBehind + random(-50, 50);
                        const sy = cy - sin(angle) * distanceBehind + random(-50, 50);
                        this._spawnAdHocEnemy(sx, sy, AI_ROLE.GUARD, (e) => {
                            e.target = stolenShip;
                            e.currentState = AI_STATE.COMBAT;
                            e.displayName = "Prototype Guard";
                        }, 'ImperialEagleMkII');
                    }
                    this._notifyEvent(`THEFT: Rebels fleeing with stolen tech!`, 'red', 4000, 'PROTOTYPE_HEIST');
                    this._addEventMarkerSafely(`HEIST_${frameCount}`, cx, cy, "Prototype Heist", "red", this._extendDurationMs(60000));
                }
                break;
            }

            case 'HARLEQUIN_PARADE': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                // Parade line following the angle
                const ships = ['HarlequinPulcinella', 'HarlequinPierrot', 'HarlequinColumbine'];
                ships.forEach((shipType, i) => {
                    const sx = cx + cos(angle) * (i * 250);
                    const sy = cy + sin(angle) * (i * 250);
                    this._spawnAdHocEnemy(sx, sy, AI_ROLE.PIRATE, (e) => {
                        e.currentState = AI_STATE.PATROLLING;
                        e.displayName = "Masquerade";
                        e.faction = 'HARLEQUIN';
                        // Initial broadcast from the first ship
                        if (i === 0 && typeof communicationSystem !== 'undefined') {
                            communicationSystem.broadcastMessage(e, ["{enemyName}: Welcome to the greatest show in the sector! Let's add some color!"], [255, 100, 255]);
                        }
                    }, shipType);
                });
                this._notifyEvent(`CIRCUS: Harlequin convoy detected.`, 'white', 4000, 'HARLEQUIN_PARADE');
                this._addEventMarkerSafely(`PARADE_${frameCount}`, cx, cy, "Harlequin Parade", "white", this._extendDurationMs(60000));
                break;
            }

            case 'JESTERS_TRAP': {
                const angle = random(TWO_PI);
                const dist = random(1200, 2000);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let bait = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.PIRATE, (e) => {
                    e.currentState = AI_STATE.IDLE;
                    e.displayName = "Harmless Jester";
                    bait = e;
                }, 'HarlequinJester');

                if (bait) {
                    // The Trap: A powerful Striker hidden nearby
                    const tx = cx + cos(angle + HALF_PI) * 400;
                    const ty = cy + sin(angle + HALF_PI) * 400;
                    this._spawnAdHocEnemy(tx, ty, AI_ROLE.PIRATE, (e) => {
                        e.target = bait; // Guarding the bait? Or waiting for player?
                        // Let's set it to PATROL around the bait
                        e.currentState = AI_STATE.PATROLLING;
                        e.displayName = "Hidden Scaramouche";
                    }, 'HarlequinScaramouche');
                    this._notifyEvent(`CONTACT: Lone fighter drifting nearby.`, 'cyan', 4000, 'JESTERS_TRAP');
                    this._addEventMarkerSafely(`TRAP_${frameCount}`, cx, cy, "Suspicious Jester", "cyan", this._extendDurationMs(60000));
                }
                break;
            }

            case 'COLOR_WAR': {
                const angle = random(TWO_PI);
                const dist = random(1500, 2500);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                let target = null;
                this._spawnAdHocEnemy(cx, cy, AI_ROLE.POLICE, (e) => {
                    e.currentState = AI_STATE.FLEEING;
                    e.displayName = "Drab Target";
                    target = e;
                }, 'ViperPol');

                if (target) {
                    for (let i = 0; i < 3; i++) {
                        const sx = cx + random(200, 400);
                        const sy = cy + random(-200, 200);
                        this._spawnAdHocEnemy(sx, sy, AI_ROLE.PIRATE, (e) => {
                            e.target = target;
                            e.currentState = AI_STATE.COMBAT;
                            e.displayName = "Motley Attacker";
                        }, 'HarlequinMotley');
                    }
                    this._notifyEvent(`ASSAULT: Harlequins attacking 'drab' vessel.`, 'red', 4000, 'COLOR_WAR');
                    this._addEventMarkerSafely(`COLORWAR_${frameCount}`, cx, cy, "Color War", "red", this._extendDurationMs(60000));
                }
                break;
            }

            case 'MAD_BOMBER': {
                // Find a station to target
                const station = this.starSystem.station; // Main station usually
                if (station) {
                    const angle = random(TWO_PI);
                    const dist = 3000; // Far out, incoming
                    const cx = station.pos.x + cos(angle) * dist;
                    const cy = station.pos.y + sin(angle) * dist;

                    this._spawnAdHocEnemy(cx, cy, AI_ROLE.PIRATE, (e) => {
                        e.target = station;
                        e.currentState = AI_STATE.COMBAT;
                        e.displayName = "Harlequin Maniac"; // Rename to Maniac as per HUD logic
                        e.faction = 'HARLEQUIN';
                        // Initial broadcast
                        if (typeof communicationSystem !== 'undefined') {
                            communicationSystem.broadcastMessage(e, ["{enemyName}: Tick-tock! The station's on the clock! Boom goes the dynamite! Hehehee!"], [255, 0, 0]);
                        }
                    }, 'HarlequinZanni');
                    this._notifyEvent(`THREAT: Maniac threatening station bombardment!`, 'red', 4000, 'MAD_BOMBER');
                    this._addEventMarkerSafely(`BOMBER_${frameCount}`, cx, cy, "Mad Bomber", "red", this._extendDurationMs(180000));
                }
                break;
            }

            case 'CARNIVAL_DROP': {
                const angle = random(TWO_PI);
                const dist = random(1000, 1800);
                const cx = this.player.pos.x + cos(angle) * dist;
                const cy = this.player.pos.y + sin(angle) * dist;

                this._spawnAdHocEnemy(cx, cy, AI_ROLE.PIRATE, (e) => {
                    e.currentState = AI_STATE.PATROLLING;
                    e.displayName = "Carnival Master";
                }, 'HarlequinPantaloon');

                // Spawn cargo
                const loot = ['Narcotics', 'Luxury Goods', 'Biowaste'];
                loot.forEach((type, i) => {
                    const lx = cx + random(-200, 200);
                    const ly = cy + random(-200, 200);
                    this._spawnCargoWithMarker(lx, ly, type, floor(random(5, 15)), `PRIZE_${frameCount}_${i}`, `Prize: ${type}`, 'lime', this._extendDurationMs(180000));
                });

                this._notifyEvent(`SCAN: Unsanctioned cargo drop detected.`, 'lime', 4000, 'CARNIVAL_DROP');
                break;
            }
        }
    }

    _executeWarEventTrigger(eventType) {
        switch (eventType) {
            case 'SKIRMISH_SEPARATIST_IMPERIAL':
                this._executeWarEvent('SKIRMISH', 'SEPARATIST_VS_IMPERIAL', this._extendDurationMs(5 * 60 * 1000));
                break;
            case 'SKIRMISH_ALIEN_MILITARY':
                this._executeWarEvent('SKIRMISH', 'ALIEN_VS_MILITARY', this._extendDurationMs(5 * 60 * 1000));
                break;
            case 'WAR_SEPARATIST_IMPERIAL':
                this._executeWarEvent('FULL_WAR', 'SEPARATIST_VS_IMPERIAL', this._extendDurationMs(15 * 60 * 1000));
                break;
            case 'WAR_ALIEN_MILITARY':
                this._executeWarEvent('FULL_WAR', 'ALIEN_VS_MILITARY', this._extendDurationMs(15 * 60 * 1000));
                break;
        }
    }

    // ============================================
    // War State System
    // ============================================


    /**
     * Executes a war event, setting the active war state and spawn modifiers.
     * @param {string} intensity - 'SKIRMISH' or 'FULL_WAR'
     * @param {string} factions - 'SEPARATIST_VS_IMPERIAL' or 'ALIEN_VS_MILITARY'
     * @param {number} durationMs - Duration in milliseconds
     * @private
     */
    _executeWarEvent(intensity, factions, durationMs) {
        // Set spawn modifiers based on factions
        const modifiers = this._getWarSpawnModifiers(factions);

        this.activeWarState = {
            isActive: true,
            intensity: intensity,
            factions: factions,
            expires: millis() + durationMs,
            spawnModifiers: modifiers
        };

        // Add persistent UI message
        const label = intensity === 'FULL_WAR' ? 'FULL SCALE WAR' : 'SKIRMISH';
        const factionLabel = factions === 'SEPARATIST_VS_IMPERIAL'
            ? 'Separatist vs Imperial'
            : 'Alien vs Military';

        const color = intensity === 'FULL_WAR' ? 'red' : 'orange';
        this._addPersistentEvent(
            `WAR_${factions}`,
            `⚔️ ${label}: ${factionLabel}`,
            color,
            durationMs
        );

        // Spawn initial wave of combatants
        this._spawnWarCombatants(intensity, factions);

        const systemLabel = this.starSystem?.name || 'Local sector';
        this._notifyEvent(`${systemLabel}: ${label} erupts — ${factionLabel}!`, color, 6000);

        // Add to news system
        if (typeof GameGlobals !== 'undefined' && GameGlobals.newsManager) {
            GameGlobals.newsManager.addWarNews(intensity, factions, systemLabel);
        }

        console.log(`EventManager: War state activated - ${intensity} (${factions}) for ${durationMs}ms`);
    }

    /**
     * Gets spawn modifiers for war factions.
     * @private
     */
    _getWarSpawnModifiers(factions) {
        switch (factions) {
            case 'SEPARATIST_VS_IMPERIAL':
                return {
                    SEPARATIST: 0.35,  // 35% of spawns
                    IMPERIAL: 0.35,    // 35% of spawns
                    OTHER: 0.30        // Remaining 30% normal mix
                };
            case 'ALIEN_VS_MILITARY':
                return {
                    ALIEN: 0.40,
                    MILITARY: 0.40,
                    OTHER: 0.20
                };
            default:
                return null;
        }
    }

    /**
     * Spawns an initial wave of combatants for war events.
     * @private
     */
    _spawnWarCombatants(intensity, factions) {
        if (!this.starSystem || !this.player) return;

        const baseCount = intensity === 'FULL_WAR' ? 6 : 3;
        const rankFactor = this._getEliteRankFactor();
        const count = Math.floor(baseCount + rankFactor * 4);

        const halfCount = Math.floor(count / 2);

        // Spawn combatants from each faction
        if (factions === 'SEPARATIST_VS_IMPERIAL') {
            for (let i = 0; i < halfCount; i++) {
                this._spawnWarShip(this.shipGroups.SEPARATIST, AI_ROLE.COMBAT);
                this._spawnWarShip(this.shipGroups.IMPERIAL, AI_ROLE.COMBAT);
            }
        } else if (factions === 'ALIEN_VS_MILITARY') {
            for (let i = 0; i < halfCount; i++) {
                this._spawnWarShip(this.shipGroups.ALIEN, AI_ROLE.ALIEN);
                this._spawnWarShip(this.shipGroups.MILITARY, AI_ROLE.COMBAT);
            }
        }
    }

    /**
     * Spawns a single war combatant ship.
     * @private
     */
    _spawnWarShip(shipList, role) {
        if (!shipList || shipList.length === 0) return;

        const shipType = random(shipList);
        const angle = random(TWO_PI);
        const dist = random(1500, 2500);
        const x = this.player.pos.x + cos(angle) * dist;
        const y = this.player.pos.y + sin(angle) * dist;

        this._spawnAdHocEnemy(x, y, role, (enemy) => {
            enemy.currentState = AI_STATE.PATROLLING;
        }, shipType);
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

    /**
     * Gets diagonal screen distance for spawn offset calculations.
     * Ensures event spawns happen beyond the visible screen edge.
     * @returns {number} Diagonal distance from screen center
     * @private
     */
    _getDiagonalDistance() {
        if (this.starSystem && typeof this.starSystem._getDiagonalDistance === 'function') {
            return this.starSystem._getDiagonalDistance();
        }
        // Fallback if starSystem helper not available
        if (typeof width !== 'undefined' && typeof height !== 'undefined') {
            return Math.sqrt((width / 2) ** 2 + (height / 2) ** 2);
        }
        return 600; // Reasonable default for a typical screen
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
            return selectionConfig.fallbackShip;
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

        const clusterSpawnRadiusFromPlayer = this._getDiagonalDistance() + random(config.spawnRadiusMin, config.spawnRadiusMax);
        const clusterAngleWithPlayer = random(TWO_PI);

        const baseSpawnX = this.player.pos.x + cos(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;
        const baseSpawnY = this.player.pos.y + sin(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} asteroids`);

        // Add a single HUD marker for the cluster so player can find it quickly
        try {
            const anchorLabel = this._deriveAnchorLabelForPos(baseSpawnX, baseSpawnY);
            // Convert ASTEROID_CLUSTER -> Asteroid Cluster
            const clusterLabel = event.type.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                this.uiManager.addEventMarker(`${event.type}_CLUSTER_${frameCount}`, baseSpawnX, baseSpawnY, clusterLabel, 'orange', this._extendDurationMs(180000));
            }
            this._notifyEvent(`${this.starSystem?.name || 'Local sector'}: ${event.type.replace(/_/g, ' ')} detected near ${anchorLabel}`, 'orange');
        } catch (e) { }

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
                // Mark the comet on HUD so player knows where to look
                try {
                    const anchorLabel = this._deriveAnchorLabelForPos(asteroid.pos.x, asteroid.pos.y);
                    const label = `Comet`;
                    if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                        this.uiManager.addEventMarker(`COMET_${frameCount}`, asteroid.pos.x, asteroid.pos.y, label, 'yellow', this._extendDurationMs(240000));
                    }
                    this._notifyEvent(`${this.starSystem?.name || 'Local sector'}: Comet detected near ${anchorLabel}`, 'yellow');
                } catch (e) { }
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

        const baseSpawnRadius = this._getDiagonalDistance() + random(config.spawnRadiusMin, config.spawnRadiusMax);
        const baseSpawnAngle = random(TWO_PI);

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} ${shipTypeToSpawn}(s)`);

        // Add event marker for the group location (excluding DISTRESS_SIGNAL which handles its own)
        if (event.type !== 'DISTRESS_SIGNAL') {
            const label = event.type.split('_')
                .map(word => word.charAt(0).toUpperCase() + word.slice(1).toLowerCase())
                .join(' ');
            this._addEventMarkerSafely(`${event.type}_${frameCount}`, baseSpawnRadius * cos(baseSpawnAngle) + this.player.pos.x, baseSpawnRadius * sin(baseSpawnAngle) + this.player.pos.y, label, 'red', this._extendDurationMs(60000));

            // Trigger news for high-level dynamic events that use spawnConfig
            if (this.dynamicSpawnNotifyEventTypes.has(event.type)) {
                let prefix = '';
                if (event.type === 'ALIEN_RAID' || event.type === 'ALIEN_SCOUT') prefix = '[ALIEN] ';
                if (event.type === 'PIRATE_SWARM' || event.type === 'BOUNTY_HUNTER_AMBUSH') prefix = '[SKULL] ';
                this._notifyEvent(`${prefix}${this.starSystem?.name || 'Local sector'}: ${label} detected`, 'orange', 4000, event.type);
            }
        }

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
            newEnemy.isEventEntity = true; // Mark as event entity for persistence
            if (typeof newEnemy.calculateRadianProperties === 'function') newEnemy.calculateRadianProperties();
            if (typeof newEnemy.initializeColors === 'function') newEnemy.initializeColors();

            if (typeof config.additionalEnemySetup === 'function') {
                config.additionalEnemySetup(newEnemy, this.player, this.starSystem);
            }
            this._stabilizeSpawnedEventEnemy(newEnemy, event);

            this.starSystem.addEnemy(newEnemy);
        }
    }

    _stabilizeSpawnedEventEnemy(enemy, event) {
        if (!enemy || enemy.immobilized) return;

        const eventType = event?.type || '';
        if (this.allowIdleStabilizeEventTypes.has(eventType)) return;

        if (this.stabilizeHostileRoles.has(enemy.role) && !enemy.target && this.player) {
            enemy.target = this.player;
        }

        if (enemy.currentState !== AI_STATE.IDLE) return;
        if (this.stabilizeHostileRoles.has(enemy.role)) {
            enemy.currentState = AI_STATE.APPROACHING;
        } else if (this.stabilizePatrolRoles.has(enemy.role)) {
            enemy.currentState = AI_STATE.PATROLLING;
        }
    }

    _executeCosmicStormSpawn(event) {
        const config = event.spawnConfig;
        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, 0);

        // Add storm radius so the edge (not center) spawns beyond view
        const stormRadius = config.radius || 500;
        const spawnRadius = this._getDiagonalDistance() + stormRadius + random(config.spawnRadiusMin, config.spawnRadiusMax);
        const spawnAngle = random(TWO_PI);

        const spawnX = this.player.pos.x + cos(spawnAngle) * spawnRadius;
        const spawnY = this.player.pos.y + sin(spawnAngle) * spawnRadius;

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: cosmic storm`);

        for (let i = 0; i < numToSpawn; i++) {
            const storm = new CosmicStorm(spawnX, spawnY, config.radius || 500, config.type || 'electromagnetic');
            this.starSystem.cosmicStorms.push(storm);
            // Add HUD marker for storm so player can find it
            try {
                const label = `Cosmic Storm`;
                if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                    this.uiManager.addEventMarker(`COSMIC_STORM_${frameCount}_${i}`, spawnX, spawnY, label, 'cyan', this._extendDurationMs(180000));
                }
                this._notifyEvent(`[STORM] ${this.starSystem?.name || 'Local sector'}: Cosmic storm detected near ${this._formatStationLabel(this._pickRandomStation())}`, 'cyan', 4000, event.type);
            } catch (e) { }
        }
    }

    _executeCargoSpawn(event) {
        const config = event.spawnConfig;
        const numToSpawn = this._calculateNumberOfEntities(config.minEntities, config.maxEntities, config.useRankFactorForCount, 0);

        const spawnRadius = this._getDiagonalDistance() + random(config.spawnRadiusMin, config.spawnRadiusMax);
        const spawnAngle = random(TWO_PI);

        const spawnX = this.player.pos.x + cos(spawnAngle) * spawnRadius;
        const spawnY = this.player.pos.y + sin(spawnAngle) * spawnRadius;

        if (typeof EVENT_LOG === 'function') EVENT_LOG(`EventManager: Spawning ${event.type}: ${numToSpawn} cargo`);

        for (let i = 0; i < numToSpawn; i++) {
            // Increase spawned cargo quantity using configurable multiplier.
            const baseQty = config.quantity || 1;
            const multiplier = (typeof config.quantityMultiplier === 'number' && config.quantityMultiplier > 0) ? config.quantityMultiplier : this.cargoQuantityMultiplier;
            const qty = Math.max(1, Math.floor(baseQty * multiplier));
            const cargo = new Cargo(spawnX, spawnY, config.cargoType || 'Unknown', qty);
            // Generate a marker id for this spawned cargo so we can remove it when collected
            try {
                const markerId = `${event.type}_${frameCount}_${i}`;
                cargo.eventMarkerId = markerId;
                this.starSystem.addCargo(cargo);
                // Add an HUD marker + notify player where the cargo appeared
                const anchorLabel = this._deriveAnchorLabelForPos(spawnX, spawnY);
                const label = `${config.cargoType || 'Cargo'}`;
                if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                    this.uiManager.addEventMarker(markerId, spawnX, spawnY, label, 'gold', this._extendDurationMs(180000));
                }
                let prefix = '';
                if (config.cargoType === 'Alien Artifact') prefix = '[ALIEN] ';
                this._notifyEvent(`${prefix}${this.starSystem?.name || 'Local sector'}: ${config.cargoType || 'Cargo'} cache appears near ${anchorLabel}`, 'gold', 4000, event.type);
            } catch (e) {
                // Fallback: if anything goes wrong, still add cargo without marker link
                try { this.starSystem.addCargo(cargo); } catch (err) { }
            }
        }
    }

    _pickRandomStation() {
        if (!this.starSystem) return null;
        // Only return the main station for events, never secret stations
        return this.starSystem.station;
    }

    _selectShipForRole(role) {
        let group = [];
        switch (role) {
            case AI_ROLE.POLICE: group = this.shipGroups.POLICE; break;
            case AI_ROLE.PIRATE: group = this.shipGroups.PIRATE; break;
            case AI_ROLE.HAULER: group = this.shipGroups.TRADER; break;
            case AI_ROLE.BOUNTY_HUNTER: group = this.shipGroups.BOUNTY_HUNTER; break;
            case AI_ROLE.GUARD: group = this.shipGroups.GUARD; break;  // Use GUARD ships for GUARD role
            case AI_ROLE.COMBAT: group = this.shipGroups.MILITARY; break;
            case AI_ROLE.ALIEN: group = this.shipGroups.ALIEN; break;
            default: group = this.shipGroups.PIRATE;
        }
        if (group && group.length > 0) return random(group);
        return 'Sidewinder'; // Ultimate fallback
    }

    _notifyEvent(message, color = 'white', durationMs = 4000, type = 'GENERAL', details = {}) {
        if (!this.uiManager || !message) return;

        // Strip icon tokens for HUD display as it doesn't support them
        const hudMessage = message.replace(/\[.*?\]\s*/g, '');
        this.uiManager.addMessage(hudMessage, color, durationMs);


        if (typeof GameGlobals !== 'undefined' && GameGlobals.newsManager) {
            // Check if this is one of the new dynamic events
            if (this.dynamicNewsEventTypes.has(type)) {
                GameGlobals.newsManager.addDynamicEventNews(type, {
                    systemName: this.starSystem?.name,
                    stationName: details.stationName
                });
            } else {
                // Fallback to legacy reporting
                GameGlobals.newsManager.addNewsItem({
                    type: type,
                    text: message,
                    systemName: this.starSystem?.name || 'Unknown System',
                    stationName: details.stationName || 'Unknown Station',
                    commodity: details.commodity || null
                });
            }
        }
    }

    // ============================================
    // Helper Methods for Event Execution
    // ============================================

    /**
     * Safely adds an event marker with error handling.
     * Eliminates the try-catch duplication across event handlers.
     * @private
     */
    _addEventMarkerSafely(id, x, y, label, color, duration) {
        try {
            if (this.uiManager && typeof this.uiManager.addEventMarker === 'function') {
                this.uiManager.addEventMarker(id, x, y, label, color, duration);
                return true;
            }
        } catch (e) {
            // Silently fail - marker is optional
        }
        return false;
    }

    /**
     * Consumes a commodity from a station market for an event and notifies the player.
     * @private
     */
    _consumeCommodityForEvent(station, commodityName, minPercent, maxPercent, eventType, eventColor = 'orange') {
        if (!station || !station.market) return { consumed: 0, message: null };

        const baseline = this._getCommodityBaseline(station.market, commodityName);
        const request = Math.max(1, Math.round(baseline * random(minPercent, maxPercent)));
        const consumed = station.market.consumeStockForNPC(commodityName, request, { allowPartial: true });

        if (consumed > 0) {
            const message = `${station.name}: ${commodityName} shortage (-${consumed} units)`;
            return { consumed, message, station, commodityName };
        }

        return { consumed: 0, message: null };
    }

    /**
     * Gets the baseline stock for a commodity (for percentage calculations).
     * @private
     */
    _getCommodityBaseline(market, commodityName) {
        if (!market) return 10;

        const available = market.getAvailableStock ? market.getAvailableStock(commodityName) : 0;

        if (typeof market._getCommodity === 'function') {
            const comm = market._getCommodity(commodityName);
            if (comm) {
                return comm.baseStock || comm.defaultBaseStock || comm.stock || available || 10;
            }
        }

        return available || 10;
    }

    /**
     * Spawns a patrol of police ships around a location.
     * Used by SMUGGLING_BUST and similar events.
     * @private
     */
    _spawnPolicePatrol(count, anchor, eventName) {
        const ships = [];
        for (let i = 0; i < count; i++) {
            const ang = random(TWO_PI);
            const dist = random(900, 1700);
            const sx = anchor.x + cos(ang) * dist;
            const sy = anchor.y + sin(ang) * dist;
            const enemy = this._spawnAdHocEnemy(sx, sy, AI_ROLE.POLICE, (e) => {
                e.currentState = AI_STATE.PATROLLING;
                e.target = null;
            });
            if (enemy) ships.push(enemy);
        }
        return ships;
    }

    /**
     * Spawns ships in a defensive guard formation around a location.
     * Used by BLOCKADE event.
     * @private
     */
    _spawnGuardFormation(count, anchor, principal, radius) {
        const ships = [];
        for (let i = 0; i < count; i++) {
            const angle = random(TWO_PI);
            const dist = radius + random(-150, 150);
            const sx = anchor.x + cos(angle) * dist;
            const sy = anchor.y + sin(angle) * dist;
            const enemy = this._spawnAdHocEnemy(sx, sy, AI_ROLE.GUARD, (e) => {
                e.principal = principal;
                e.currentState = AI_STATE.GUARDING;
            });
            if (enemy) ships.push(enemy);
        }
        return ships;
    }

    /**
     * Creates a cargo spawn with event marker tracking.
     * @private
     */
    _spawnCargoWithMarker(x, y, cargoType, quantity, markerId, label, color, duration) {
        try {
            const cargo = new Cargo(x, y, cargoType, quantity);
            cargo.eventMarkerId = markerId;
            this.starSystem.addCargo(cargo);

            this._addEventMarkerSafely(markerId, x, y, label, color, duration);

            return cargo;
        } catch (e) {
            // Fallback: try to add cargo without marker
            try {
                const cargo = new Cargo(x, y, cargoType, quantity);
                this.starSystem.addCargo(cargo);
                return cargo;
            } catch (err) {
                return null;
            }
        }
    }

    // ============================================
    // Utility Methods
    // ============================================

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

    /**
     * Derive a human-friendly anchor label for a world position.
     * Prefers station name if close, then nearest planet, then system name.
     */
    _deriveAnchorLabelForPos(x, y) {
        try {
            if (!this.starSystem) return 'local grid';
            const station = this.starSystem.station;
            if (station && station.pos) {
                const d = dist(x, y, station.pos.x, station.pos.y);
                if (d < 3000) return station.name || this._formatStationLabel(station);
            }
            if (Array.isArray(this.starSystem.planets) && this.starSystem.planets.length) {
                let nearest = null; let nd = Infinity;
                for (let i = 0; i < this.starSystem.planets.length; i++) {
                    const p = this.starSystem.planets[i];
                    if (!p || !p.pos) continue;
                    const dd = dist(x, y, p.pos.x, p.pos.y);
                    if (dd < nd) { nd = dd; nearest = p; }
                }
                if (nearest && nd < 3000) return nearest.name || (`Planet ${nearest.index != null ? nearest.index + 1 : ''}`);
            }
            return this.starSystem.name ? `${this.starSystem.name} sector` : 'local grid';
        } catch (e) {
            return this.starSystem?.name || 'local grid';
        }
    }

    _spawnAdHocEnemy(x, y, role, setupFn = null, forcedShip = null) {
        if (!this.starSystem || !this.player) return null;
        const shipType = forcedShip || this._selectShipForRole(role);
        if (!shipType) return null;
        const enemy = new Enemy(x, y, this.player, shipType, role);
        enemy.currentSystem = this.starSystem;
        enemy.isEventEntity = true; // Mark as event entity for persistence
        if (typeof enemy.calculateRadianProperties === 'function') enemy.calculateRadianProperties();
        if (typeof enemy.initializeColors === 'function') enemy.initializeColors();
        if (typeof setupFn === 'function') setupFn(enemy);
        this.starSystem.addEnemy(enemy);
        return enemy;
    }

    // ============================================
    // Crisis Event Helpers
    // ============================================

    /**
     * Spawns emergency haulers during a crisis event.
     * @param {number} count - Number of haulers to spawn
     * @param {string} cargoType - Type of cargo they carry (Medicine, Food, etc.)
     */
    _spawnCrisisHaulers(count, cargoType) {
        if (!this.starSystem || !this.player) return;

        const jumpZone = this.starSystem.jumpZoneCenter || this.player.pos;
        const baseRadius = (this.starSystem.jumpZoneRadius || 600) + random(200, 500);

        for (let i = 0; i < count; i++) {
            const angle = random(TWO_PI);
            const dist = baseRadius + random(-100, 300);
            const sx = jumpZone.x + cos(angle) * dist;
            const sy = jumpZone.y + sin(angle) * dist;

            this._spawnAdHocEnemy(sx, sy, AI_ROLE.HAULER, (enemy) => {
                enemy.currentState = AI_STATE.TRADING;
                // Give them relevant cargo
                if (enemy.cargoHold) {
                    const qty = Math.max(5, Math.floor(random(10, 25)));
                    enemy.cargoHold.push({ type: cargoType, quantity: qty });
                }
            });
        }
    }

    /**
     * Returns list of system indices affected by a specific crisis type.
     * Includes origin system and all connected systems.
     * @param {string} crisisType - 'plague' or 'famine'
     * @returns {number[]} Array of affected system indices
     */
    getAffectedSystemsForCrisis(crisisType) {
        const crisis = this.activeCrisisState[crisisType];
        if (!crisis || millis() > crisis.expires) return [];

        const affected = [crisis.originSystemIndex];

        // Add connected systems
        if (typeof galaxy !== 'undefined' && galaxy.systems) {
            const originSystem = galaxy.systems[crisis.originSystemIndex];
            if (originSystem && originSystem.connectedSystemIndices) {
                affected.push(...originSystem.connectedSystemIndices);
            }
        }

        return affected;
    }

    /**
     * Returns spawn modifier for haulers during active crisis.
     * @returns {number} Multiplier for hauler spawn probability (1.0 = normal, 1.5 = 50% more, etc.)
     */
    getHaulerSpawnModifier() {
        let modifier = 1.0;

        // Check if current system is affected by plague
        if (this.activeCrisisState.plague && millis() < this.activeCrisisState.plague.expires) {
            const affectedByPlague = this.getAffectedSystemsForCrisis('plague');
            const currentIndex = typeof galaxy !== 'undefined' ? galaxy.currentSystemIndex : 0;
            if (affectedByPlague.includes(currentIndex)) {
                modifier += 0.25; // +25% hauler spawns
            }
        }

        // Check if current system is affected by famine
        if (this.activeCrisisState.famine && millis() < this.activeCrisisState.famine.expires) {
            const affectedByFamine = this.getAffectedSystemsForCrisis('famine');
            const currentIndex = typeof galaxy !== 'undefined' ? galaxy.currentSystemIndex : 0;
            if (affectedByFamine.includes(currentIndex)) {
                modifier += 0.25; // +25% hauler spawns
            }
        }

        return modifier;
    }

    /**
     * Returns the price multiplier for a commodity based on active crises.
     * @param {string} commodityName - Name of the commodity
     * @param {number} systemIndex - Index of the system to check (default: current system)
     * @returns {number} Price multiplier (1.0 = normal)
     */
    getCrisisPriceMultiplier(commodityName, systemIndex = null) {
        if (systemIndex === null && typeof galaxy !== 'undefined') {
            systemIndex = galaxy.currentSystemIndex;
        }

        // Check plague affecting Medicine
        if (commodityName === 'Medicine' && this.activeCrisisState.plague) {
            if (millis() < this.activeCrisisState.plague.expires) {
                const affected = this.getAffectedSystemsForCrisis('plague');
                if (affected.includes(systemIndex)) {
                    return this.activeCrisisState.plague.priceMultiplier;
                }
            }
        }

        // Check famine affecting Food
        if (commodityName === 'Food' && this.activeCrisisState.famine) {
            if (millis() < this.activeCrisisState.famine.expires) {
                const affected = this.getAffectedSystemsForCrisis('famine');
                if (affected.includes(systemIndex)) {
                    return this.activeCrisisState.famine.priceMultiplier;
                }
            }
        }

        return 1.0;
    }

    /**
     * Updates crisis state, expiring ended crises and cleaning up UI.
     * Called from the main update loop.
     */
    _updateCrisisState() {
        const now = millis();

        // Check plague expiration
        if (this.activeCrisisState.plague && now > this.activeCrisisState.plague.expires) {
            this.activeCrisisState.plague = null;
            this._removePersistentEvent('PLAGUE_ACTIVE');
            const systemLabel = this.starSystem?.name || 'Local sector';
            this._notifyEvent(`${systemLabel}: Plague outbreak contained. Medicine prices stabilizing.`, 'green');
        }

        // Check famine expiration
        if (this.activeCrisisState.famine && now > this.activeCrisisState.famine.expires) {
            this.activeCrisisState.famine = null;
            this._removePersistentEvent('FAMINE_ACTIVE');
            const systemLabel = this.starSystem?.name || 'Local sector';
            this._notifyEvent(`${systemLabel}: Famine relief successful. Food prices stabilizing.`, 'green');
        }
    }

    _formatStationLabel(station) {
        if (station?.name) return station.name;
        if (this.starSystem?.name) return `${this.starSystem.name} sector`;
        return 'local grid';
    }

    // -------------------------------------------------------------------------
    // PERSISTENCE
    // -------------------------------------------------------------------------

    toJSON() {
        return {
            activeWarState: this.activeWarState,
            activeCrisisState: this.activeCrisisState,
            // activeEvents (like meteor warnings) are generally transient and don't need saving
            // unless we want to persist specific timers. For simplicity, we skip transient events.
        };
    }

    fromJSON(data) {
        if (!data) return;

        if (data.activeWarState) {
            this.activeWarState = data.activeWarState;
        }

        if (data.activeCrisisState) {
            this.activeCrisisState = data.activeCrisisState;
        }
    }
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { EventManager };
    global.EventManager = EventManager;
}
