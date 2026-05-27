global.STARFIELD_CONFIG = { WORKER_ENABLED: false };
global.SPAWN_CONFIG = { SPAWN_INTERVAL_MS: 5000, FIXED_LARGE_DESPAWN_RADIUS: 5000 };
global.JUMP_ZONE_CONFIG = { DEFAULT_RADIUS: 1000 };

require('./jest.setup');
require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../shipUpgrades.js');
require('../enemyConstants.js');
require('../mission.js');
require('../objectPool.js');
require('../thrustParticles.js');
require('../player.js');

const { Enemy } = require('../enemy');
require('../enemyUtils');
require('../enemyDamageSystem');
require('../enemyTargeting');
require('../enemyAIBehaviors');
require('../enemyCargo');

const { StarSystem } = require('../starSystem');
const { MissionGenerator } = require('../missionGenerator');
const { Mission } = require('../mission');
const { EventManager } = require('../eventManager');
const { NewsManager } = require('../newsManager');

if (typeof applyEnemyUtilityMethods === 'function') applyEnemyUtilityMethods();
if (typeof applyEnemyDamageSystemMethods === 'function') applyEnemyDamageSystemMethods();
if (typeof applyEnemyTargetingMethods === 'function') applyEnemyTargetingMethods();
if (typeof applyEnemyCargoMethods === 'function') applyEnemyCargoMethods();
if (typeof applyEnemyAIBehaviorMethods === 'function') applyEnemyAIBehaviorMethods();

describe('Living Galaxy Integrations', () => {
    let system;
    let player;
    let eventMgr;
    let newsMgr;

    beforeEach(() => {
        // Mock randomSeed function
        global.randomSeed = jest.fn();

        // Instantiate real NewsManager and EventManager, set them on globals
        newsMgr = new NewsManager();
        global.newsManager = newsMgr;
        
        // Also associate GameGlobals.newsManager
        global.GameGlobals = {
            newsManager: newsMgr
        };
        
        eventMgr = new EventManager();
        global.eventManager = eventMgr;

        // Mock galaxy
        global.galaxy = {
            currentSystemIndex: 0,
            systems: [],
            getJumpDistance: (a, b) => 1
        };

        player = new Player();
        player.pos = createVector(0, 0);

        system = new StarSystem("Artemis");
        system.systemIndex = 0;
        global.galaxy.systems.push(system);
    });

    afterEach(() => {
        delete global.randomSeed;
        delete global.newsManager;
        delete global.eventManager;
        delete global.galaxy;
        delete global.GameGlobals;
            jest.restoreAllMocks();
    });

    describe('Deterministic Resident NPC Roster', () => {
        test('generates exactly 12 resident NPCs deterministically', () => {
            const systemA1 = new StarSystem("Sol");
            systemA1.systemIndex = 1;
            systemA1.initStaticElements(12345);

            const systemA2 = new StarSystem("Sol");
            systemA2.systemIndex = 1;
            systemA2.initStaticElements(12345);

            const systemB = new StarSystem("Sol");
            systemB.systemIndex = 2;
            systemB.initStaticElements(67890);

            expect(systemA1.residentNPCs).toHaveLength(12);
            expect(systemA2.residentNPCs).toHaveLength(12);

            // A1 and A2 should be identical because of same seed
            for (let i = 0; i < 12; i++) {
                expect(systemA1.residentNPCs[i].name).toBe(systemA2.residentNPCs[i].name);
                expect(systemA1.residentNPCs[i].role).toBe(systemA2.residentNPCs[i].role);
                expect(systemA1.residentNPCs[i].shipType).toBe(systemA2.residentNPCs[i].shipType);
            }

            // systemB should have a different roster due to different seed
            let differenceFound = false;
            for (let i = 0; i < 12; i++) {
                if (systemA1.residentNPCs[i].name !== systemB.residentNPCs[i].name) {
                    differenceFound = true;
                    break;
                }
            }
            expect(differenceFound).toBe(true);
        });
    });

    describe('Faction Influence Tracking & Dynamic Shifts', () => {
        test('initializes faction influence based on economy', () => {
            const impSystem = new StarSystem("Imperial Capital");
            impSystem.systemIndex = 1;
            impSystem.economyType = "Imperial";
            impSystem.initStaticElements(100);
            expect(impSystem.factionInfluence.Imperial).toBe(0.70);
            expect(impSystem.factionInfluence.Separatist).toBe(0.10);

            const sepSystem = new StarSystem("Separatist Outpost");
            sepSystem.systemIndex = 2;
            sepSystem.economyType = "Separatist";
            sepSystem.initStaticElements(200);
            expect(sepSystem.factionInfluence.Separatist).toBe(0.70);
            expect(sepSystem.factionInfluence.Imperial).toBe(0.10);

            const milSystem = new StarSystem("Military Garrison");
            milSystem.systemIndex = 3;
            milSystem.economyType = "Military";
            milSystem.initStaticElements(300);
            expect(milSystem.factionInfluence.Military).toBe(0.70);

            const indSystem = new StarSystem("Independent Mining");
            indSystem.systemIndex = 4;
            indSystem.economyType = "Mining";
            indSystem.initStaticElements(400);
            // Independent systems still distribute full influence across all factions.
            expect(indSystem.factionInfluence.Imperial).toBeGreaterThanOrEqual(0);
            expect(indSystem.factionInfluence.Separatist).toBeGreaterThanOrEqual(0);
            expect(indSystem.factionInfluence.Military).toBeGreaterThanOrEqual(0);
            expect(indSystem.factionInfluence.Imperial + indSystem.factionInfluence.Separatist + indSystem.factionInfluence.Military).toBeCloseTo(1, 2);
        });

        test('adjusts faction influence on enemy destruction', () => {
            system.factionInfluence = { Imperial: 0.50, Separatist: 0.20, Military: 0.30 };
            system.combatStats = {
                pirates: 0,
                police: 0,
                aliens: 0,
                military: 0,
                separatists: 0,
                total: 0,
                pilotKills: new Map(),
                recentDeaths: [],
                lastReportTime: 0
            };

            const enemy = new Enemy(0, 0, player, 'Sidewinder', AI_ROLE.COMBAT);
            enemy.faction = 'IMPERIAL';
            enemy.isNotoriousPirate = false;

            system.recordDestruction(enemy);

            // Imperial influence drops by 0.05, Separatist increases by 0.02
            // After normalization, other factions are re-scaled so total = 1.0
            expect(system.factionInfluence.Imperial).toBe(0.44);
            expect(system.factionInfluence.Separatist).toBe(0.24);
            // Verify total still sums to 1.0 after adjustments
            const total = system.factionInfluence.Imperial + system.factionInfluence.Separatist + system.factionInfluence.Military;
            expect(total).toBeCloseTo(1.0, 2);
        });

        test('triggers news reports on significant faction influence shifts', () => {
            const spy = jest.spyOn(newsMgr, 'addFactionInfluenceNews');
            system.factionInfluence = { Imperial: 0.50, Separatist: 0.20, Military: 0.30 };

            // Adjusting by a significant amount (>= 0.05) triggers news
            system.adjustFactionInfluence('Imperial', -0.05);

            expect(spy).toHaveBeenCalledWith('Artemis', 'Imperial', 'decrease', 0.45);
            
            // Adjusting by a small amount (< 0.05) does not trigger news
            spy.mockClear();
            system.adjustFactionInfluence('Separatist', 0.02);
            expect(spy).not.toHaveBeenCalled();

            spy.mockRestore();
        });
    });

    describe('Crisis Spawning & Crisis Missions', () => {
        test('adjusts ship spawn distribution in crisis affected systems', () => {
            const originalRandom = global.random;

            // Set up famine crisis on our system
            eventMgr.activeCrisisState = {
                famine: {
                    originSystemIndex: 0,
                    expires: Date.now() + 100000,
                    priceMultiplier: 2.0
                }
            };
            // Mock getAffectedSystemsForCrisis to return our system
            eventMgr.getAffectedSystemsForCrisis = jest.fn().mockReturnValue([0]);

            // Override random to guarantee certain branches are tested
            // Under famine, we roll random() in _selectShipForEconomy:
            // r < 0.45 -> Hauler
            // r < 0.80 -> Pirate
            // r >= 0.80 -> Police
            
            // Test Hauler roll
            global.random = jest.fn().mockReturnValue(0.2);
            let selection = system._selectShipForEconomy('Industrial', 'Medium');
            expect(selection.role).toBe(AI_ROLE.HAULER);

            // Test Pirate roll
            global.random = jest.fn().mockReturnValue(0.6);
            selection = system._selectShipForEconomy('Industrial', 'Medium');
            expect(selection.role).toBe(AI_ROLE.PIRATE);

            // Test Police roll
            global.random = jest.fn().mockReturnValue(0.9);
            selection = system._selectShipForEconomy('Industrial', 'Medium');
            expect(selection.role).toBe(AI_ROLE.POLICE);

            // Restore global.random from test harness.
            global.random = originalRandom;
        });

        test('generates famine relief and plague relief missions', () => {
            // Set up destinations
            const destSystem = new StarSystem("Oasis");
            destSystem.systemIndex = 1;
            
            const destStation = { name: "Oasis Port", market: { commodities: [] } };
            destSystem.planets = [{ name: "Oasis Prime", stations: [destStation] }];
            global.galaxy.systems.push(destSystem);

            // Mock findNearbyDestination to return our destination system/station
            const originalFindNearbyDestination = MissionGenerator.findNearbyDestination;
            const originalGetCargoValue = MissionGenerator.getCargoValue;
            const originalGetAlienSystemBonus = MissionGenerator.getAlienSystemBonus;
            MissionGenerator.findNearbyDestination = jest.fn().mockReturnValue({
                system: destSystem,
                station: destStation
            });
            MissionGenerator.getCargoValue = jest.fn().mockReturnValue(100);
            MissionGenerator.getAlienSystemBonus = jest.fn().mockReturnValue(0);

            const originalRandom = global.random;
            global.random = jest.fn((a, b) => {
                if (Array.isArray(a)) return a[0];
                if (b === undefined) {
                    if (a === undefined) return 0.5;
                    return a * 0.5;
                }
                return a + (b - a) * 0.5;
            });

            // Baseline (no crisis) for reward comparison
            eventMgr.activeCrisisState = null;
            const baselineMission = MissionGenerator.createLegalDelivery(system, { name: "Artemis Station" }, global.galaxy, player);
            expect(baselineMission).toBeDefined();

            // 1. Famine Crisis
            eventMgr.activeCrisisState = {
                famine: {
                    originSystemIndex: 1,
                    expires: Date.now() + 100000,
                    priceMultiplier: 2.0
                }
            };
            eventMgr.getAffectedSystemsForCrisis = jest.fn().mockImplementation((type) => {
                if (type === 'famine') return [1];
                return [];
            });

            let mission = MissionGenerator.createLegalDelivery(system, { name: "Artemis Station" }, global.galaxy, player);
            expect(mission).toBeDefined();
            expect(mission.cargoType).toBe('Food');
            expect(mission.title).toContain('Famine Relief');
            expect(mission.description).toContain('suffering a catastrophic famine');
            expect(mission.rewardCredits).toBe(Math.floor(baselineMission.rewardCredits * 1.8));

            // 2. Plague Crisis
            eventMgr.activeCrisisState = {
                plague: {
                    originSystemIndex: 1,
                    expires: Date.now() + 100000,
                    priceMultiplier: 2.0
                }
            };
            eventMgr.getAffectedSystemsForCrisis = jest.fn().mockImplementation((type) => {
                if (type === 'plague') return [1];
                return [];
            });

            mission = MissionGenerator.createLegalDelivery(system, { name: "Artemis Station" }, global.galaxy, player);
            expect(mission).toBeDefined();
            expect(mission.cargoType).toBe('Medicine');
            expect(mission.title).toContain('Medical Relief');
            expect(mission.description).toContain('plague outbreak has been declared');
            expect(mission.rewardCredits).toBe(Math.floor(baselineMission.rewardCredits * 1.8));

            // Restore mock
            MissionGenerator.findNearbyDestination = originalFindNearbyDestination;
            MissionGenerator.getCargoValue = originalGetCargoValue;
            MissionGenerator.getAlienSystemBonus = originalGetAlienSystemBonus;
            global.random = originalRandom;
        });
    });
});
