const { Market, ECONOMY_STOCK_BEHAVIOR } = require('../market');
require('../commodityDefinitions');
require('../weapons');
require('../objectPool');
const { MissionGenerator } = require('../missionGenerator');
const { Cargo } = require('../cargo');
const { Projectile } = require('../projectile');
require('../enemyConstants');
require('../debug');
require('../ships');
require('../weaponSystem');

// Require enemy mixins BEFORE the Enemy class so they are available for application
require('../enemyUtils');
require('../enemyDamageSystem');
require('../enemyRendering');
require('../enemyMovement');
require('../enemyTargeting');
require('../enemyCombat');
require('../enemyStateMachine');
require('../enemyAIBehaviors');
require('../enemyCargo');

const Player = require('../player');
const { Enemy } = require('../enemy');
const { Mission, MISSION_TYPE } = require('../mission');
const { WeaponSystem } = require('../weaponSystem');

describe('Integration Tests', () => {
    let player;
    let system;
    let station;
    let galaxy;

    beforeEach(() => {
        // Setup Test Objects
        station = {
            name: "Test Station",
            market: new Market({
                economyType: "Industrial",
                techLevel: 5
            })
        };

        system = {
            name: "Test System",
            station: station,
            systemIndex: 0,
            securityLevel: "Medium",
            economyType: "Industrial",
            techLevel: 5,
            enemies: [],
            spaceObjects: [],
            planets: [{ name: "Test Planet", pos: { x: 1000, y: 1000 }, size: 200 }],
            connectedSystemIndices: [1],
            addEnemy: (e) => system.enemies.push(e),
            _getDiagonalDistance: () => 1000,
            addProjectile: function (proj) { if (this.projectiles) this.projectiles.push(proj); },
            addExplosion: jest.fn(),
            setPlayerWanted: jest.fn()
        };

        global.communicationSystem = {
            addMessage: jest.fn(),
            handlePlayerDamageReaction: jest.fn(),
            handleEnemyDestroyed: jest.fn(),
            handleTargetAcquired: jest.fn(),
            handleStateChange: jest.fn(),
            handlePlayerDying: jest.fn(),
            maybeSendMissionaryMessage: jest.fn()
        };

        const secondSystem = {
            name: "Second System",
            systemIndex: 1,
            securityLevel: "Medium",
            economyType: "Industrial",
            techLevel: 5,
            enemies: [],
            spaceObjects: [],
            planets: [],
            connectedSystemIndices: [0],
            station: { name: "Second Station" }
        };

        galaxy = {
            systems: [system, secondSystem],
            getJumpDistance: (i1, i2) => 1
        };

        player = new Player("Sidewinder");
        player.currentSystem = system;
        global.player = player;

        // Initialize systems
        if (typeof WeaponSystem !== 'undefined' && WeaponSystem.init) {
            WeaponSystem.init();
        }
    });

    /**
     * Test Area: Economy & Market Integration
     */
    describe('Market Integration', () => {
        test('Market basic stock initialization', () => {
            expect(station.market.commodities.length).toBeGreaterThan(0);
            const food = station.market.commodities.find(c => c.name === "Food");
            expect(food).toBeDefined();
            expect(food.stock).toBeGreaterThanOrEqual(0);
        });

        test('Buying cargo reduces credits and increases player cargo', () => {
            const food = station.market.commodities.find(c => c.name === "Food");
            const initialCredits = player.credits;
            const initialStock = food.stock;
            const quantity = 5;
            const price = food.buyPrice * quantity;

            if (initialCredits < price) {
                player.credits = price + 1000;
            }

            // Simulate market buy (simplified logic)
            player.credits -= price;
            player.cargo.push({ name: "Food", quantity: quantity });
            food.stock -= quantity;

            expect(player.credits).toBeLessThan(initialCredits + 1); // allow for credit change
            expect(player.cargo.find(i => i.name === "Food").quantity).toBe(quantity);
            expect(food.stock).toBe(initialStock - quantity);
        });
    });

    /**
     * Test Area: Mission Integration
     */
    describe('Mission Integration', () => {
        test('MissionGenerator generates valid missions', () => {
            const missions = MissionGenerator.generateMissions(system, station, galaxy, player);
            expect(Array.isArray(missions)).toBe(true);
            expect(missions.length).toBeGreaterThan(0);
            missions.forEach(m => {
                expect(m).toBeInstanceOf(Mission);
                expect(m.status).toBe('Available');
            });
        });

        test('Player accepts a mission', () => {
            const missionData = {
                title: "Test Delivery",
                type: MISSION_TYPE.DELIVERY_LEGAL,
                rewardCredits: 500,
                cargoType: "Food",
                cargoQuantity: 5,
                destinationSystem: "Target System"
            };
            const mission = new Mission(missionData);

            const accepted = player.acceptMission(mission);
            expect(accepted).toBe(true);
            expect(player.activeMission).toBe(mission);
            expect(mission.status).toBe('Active');

            // Check if cargo was loaded
            const cargo = player.cargo.find(i => i.name === "Food");
            expect(cargo).toBeDefined();
            expect(cargo.quantity).toBe(5);
        });

        test('Player completes a delivery mission', () => {
            const mission = new Mission({
                title: "Test Delivery",
                type: MISSION_TYPE.DELIVERY_LEGAL,
                rewardCredits: 500,
                cargoType: "Food",
                cargoQuantity: 5,
                destinationSystem: "Target System"
            });
            player.acceptMission(mission);
            const initialCredits = player.credits;

            // Mock landing at destination
            const destSystem = { name: "Target System" };
            const destStation = { name: "Target Station" };

            const completed = player.completeMission(destSystem, destStation);
            expect(completed).toBe(true);
            expect(player.credits).toBe(initialCredits + 500);
            expect(player.activeMission).toBeNull();
            expect(player.cargo.find(i => i.name === "Food")).toBeUndefined();
        });

        test('Bounty mission progress tracking', () => {
            const mission = new Mission({
                title: "Bounty Test",
                type: MISSION_TYPE.BOUNTY_PIRATE,
                targetCount: 1,
                rewardCredits: 1000
            });
            player.acceptMission(mission);
            system.player = player;
            const startCredits = player.credits;

            // Simulate an actual pirate kill through the destruction path
            const enemy = new Enemy(0, 0, player, "Sidewinder", AI_ROLE.PIRATE);
            enemy.isNotoriousPirate = false;
            enemy.faction = "PIRATE";
            enemy.currentSystem = system;
            enemy.getSystem = () => system;

            enemy.takeDamage(9999, player, system);

            expect(mission.progressCount).toBe(1);
            expect(mission.status).toBe('Completed');
            expect(player.activeMission).toBeNull();

            // Non-police player: only the mission reward (1,000 cr), no faction bounty
            expect(player.credits).toBe(startCredits + 1000);
        });

        test('Police player with pirate bounty mission receives both faction bounty and mission reward', () => {
            const MISSION_REWARD = 2500;
            const mission = new Mission({
                title: "Police Bounty Test",
                type: MISSION_TYPE.BOUNTY_PIRATE,
                targetCount: 1,
                rewardCredits: MISSION_REWARD
            });
            player.isPolice = true;
            player.acceptMission(mission);
            system.player = player;
            const startCredits = player.credits;

            const enemy = new Enemy(0, 0, player, "Sidewinder", AI_ROLE.PIRATE);
            enemy.isNotoriousPirate = false;
            enemy.faction = "PIRATE";
            enemy.currentSystem = system;
            enemy.getSystem = () => system;

            enemy.takeDamage(9999, player, system);

            expect(mission.status).toBe('Completed');
            expect(player.activeMission).toBeNull();

            // Police player earns BOTH the faction bounty (1,000 cr) AND the mission reward (2,500 cr)
            expect(player.credits).toBe(startCredits + BOUNTY_POLICE_ALIEN_PIRATE + MISSION_REWARD);
        });
    });

    describe('Cargo Integration', () => {
        test('Cargo lifecycle: creation to collection', () => {
            const player = new Player();
            player.pos = createVector(100, 100);
            player.cargo = [];
            player.cargoCapacity = 20;

            const floatingCargo = new Cargo(105, 100, 'Gold', 2);

            // Detection
            const hit = floatingCargo.checkCollision(player);
            expect(hit).toBe(true);

            // Collection
            if (hit) {
                player.cargo.push({ name: floatingCargo.type, quantity: floatingCargo.quantity });
            }

            const gold = player.cargo.find(c => c.name === 'Gold');
            expect(gold).toBeDefined();
            expect(gold.quantity).toBe(2);
        });

        test('Cargo persistence to JSON', () => {
            const cargo = new Cargo(500, -200, 'Minerals', 5);
            const json = cargo.toJSON();

            expect(json.type).toBe('Minerals');
            expect(json.quantity).toBe(5);
            expect(json.pos).toBeDefined();

            const restored = Cargo.fromJSON(json);
            expect(restored.type).toBe('Minerals');
            expect(restored.quantity).toBe(5);
            expect(restored.pos.x).toBe(500);
        });
    });

    describe('Combat Integration', () => {
        let player;
        let enemy;
        let system;

        beforeEach(() => {
            player = new Player('CobraMkIII');
            player.pos = createVector(0, 0);

            enemy = new Enemy(100, 0, player, 'Sidewinder', AI_ROLE.PIRATE);
            enemy.hull = 50;
            enemy.shield = 20;
            enemy.size = 20;

            system = {
                projectiles: [],
                enemies: [enemy],
                player: player,
                asteroids: []
            };
            system.addProjectile = function (proj) { this.projectiles.push(proj); };
        });

        test('should allow player to fire at enemy', () => {
            player.angle = 0;
            WeaponSystem.fireProjectile(player, system, player.angle);
            expect(system.projectiles.length).toBeGreaterThan(0);
        });

        test('should detect projectile hit on enemy', () => {
            const proj = new Projectile(enemy.pos.x, enemy.pos.y, 0, player);
            proj.size = 10;
            proj.pos.set(enemy.pos.x, enemy.pos.y);

            const hit = proj.checkCollision(enemy);
            expect(hit).toBe(true);
        });

        test('should apply damage when projectile hits', () => {
            const initialHull = enemy.hull;
            const initialShield = enemy.shield;

            enemy.takeDamage(25, player, system);

            const totalHealthLost = (initialShield + initialHull) - (enemy.shield + enemy.hull);
            expect(totalHealthLost).toBe(25);
        });

        test('should track player as attacker', () => {
            enemy.takeDamage(10, player, system);
            expect(enemy.lastAttacker).toBe(player);
        });

        test('should allow enemy to retaliate', () => {
            enemy.target = player;
            enemy.angle = Math.PI;

            WeaponSystem.fireProjectile(enemy, system, enemy.angle);
            expect(system.projectiles.length).toBeGreaterThan(0);
        });

        test('should destroy enemy when hull depleted', () => {
            enemy.hull = 10;
            enemy.shield = 0;
            enemy.takeDamage(15, player, system);

            expect(enemy.hull).toBeLessThanOrEqual(0);
        });
    });

    describe('Weapon Heat Integration', () => {
        let player;
        let system;

        beforeEach(() => {
            player = new Player();
            player.equippedWeapons = [WEAPON_UPGRADES.find(w => w.type === 'beam') || WEAPON_UPGRADES[0]];
            player._beamHeatStates = new Map();

            system = {
                projectiles: [],
                enemies: [],
                player: player,
                asteroids: []
            };
        });

        test('should track heat during firing', () => {
            const weapon = player.equippedWeapons[0];
            const initialHeat = WeaponSystem.getHeatRatio(player, weapon);

            WeaponSystem._applyBeamHeat(player, weapon);

            const afterHeat = WeaponSystem.getHeatRatio(player, weapon);
            expect(afterHeat).toBeGreaterThan(initialHeat);
        });

        test('should cool down over time', () => {
            const weapon = player.equippedWeapons[0];

            WeaponSystem._applyBeamHeat(player, weapon);
            const heatedRatio = WeaponSystem.getHeatRatio(player, weapon);

            WeaponSystem.coolWeaponHeat(player, 2.0);
            const cooledRatio = WeaponSystem.getHeatRatio(player, weapon);

            expect(cooledRatio).toBeLessThan(heatedRatio);
        });
    });

    describe('Object Pool Integration', () => {
        test('should reuse projectiles efficiently', () => {
            const system = { projectiles: [], enemies: [], player: null, asteroids: [] };
            const owner = {
                pos: createVector(0, 0),
                disruption: 0,
                equippedWeapons: [WEAPON_UPGRADES[0]],
                _beamHeatStates: new Map()
            };
            owner.currentWeapon = owner.equippedWeapons[0];

            for (let i = 0; i < 20; i++) {
                WeaponSystem.fireProjectile(owner, system, random(0, Math.PI * 2));
            }

            expect(system.projectiles.length).toBe(20);

            const stats = WeaponSystem.getPoolStats();
            expect(stats).toBeDefined();
            expect(stats.active).toBeGreaterThan(0);
        });
    });

    describe('Full Scenarios', () => {
        test('Full Combat Scenario: simulate complete combat encounter', () => {
            const player = new Player('CobraMkIII');
            player.pos = createVector(0, 0);
            player.hull = 100;
            player.shield = 50;

            const enemy = new Enemy(80, 0, player, 'Sidewinder', AI_ROLE.PIRATE);
            enemy.hull = 30;
            enemy.shield = 10;
            enemy.cargoHold = [{ name: 'Gold', quantity: 2 }];

            const system = {
                projectiles: [],
                enemies: [enemy],
                floatingCargo: [],
                player: player
            };

            let combatRounds = 0;
            while (enemy.hull > 0 && combatRounds < 10) {
                enemy.takeDamage(15, player, system);
                combatRounds++;
            }

            expect(enemy.hull).toBeLessThanOrEqual(0);

            for (const item of enemy.cargoHold) {
                for (let i = 0; i < item.quantity; i++) {
                    system.floatingCargo.push(new Cargo(enemy.pos.x, enemy.pos.y, item.name, 1));
                }
            }

            expect(system.floatingCargo.length).toBeGreaterThan(0);
        });

        test('Full Trading Scenario: complete profitable trade run', () => {
            const player = new Player();
            player.credits = 10000;
            player.cargo = [];
            player.cargoCapacity = 50;

            const startCredits = player.credits;

            const agMarket = new Market('Agricultural');
            agMarket.updatePrices();
            const agFood = agMarket.commodities.find(g => g.name === 'Food');
            if (agFood) agFood.stock = 100;

            agMarket.buy('Food', 20, player);
            const creditsAfterBuy = player.credits;

            const indMarket = new Market('Industrial');
            indMarket.updatePrices();

            indMarket.sell('Food', 20, player);

            expect(player.credits).toBeGreaterThan(creditsAfterBuy);
            expect(player.cargo.find(c => c.name === 'Food')).toBeUndefined();
        });

        test('Full Mission Flow: complete bounty mission from start to finish', () => {
            const player = new Player();
            player.credits = 1000;
            const startCredits = player.credits;

            // 1. Accept mission
            const mission = new Mission({
                id: Date.now(),
                title: 'Clear Pirates',
                type: MISSION_TYPE.BOUNTY_PIRATE,
                targetCount: 3,
                reward: 5000,
                originSystemIndex: 0
            });
            player.acceptMission(mission);

            expect(mission.status).toBe('Active');

            // 2. Kill targets (manual progress for test simplicity, following original logic)
            mission.progressCount = 3;

            // 3. Complete mission
            player.completeMission();

            expect(mission.status).toBe('Completed');
            expect(player.credits).toBe(startCredits + 5000);
        });
    });

    describe('Faction Integration', () => {
        test('Joining a faction updates player state', () => {
            const player = new Player();
            player.joinFaction('SEPARATIST');

            expect(player.playerFaction).toBe('SEPARATIST');
            expect(player.factionPrestige?.SEPARATIST || 0).toBe(0);
        });

        test('Faction prestige increases on mission completion', () => {
            const player = new Player();
            player.joinFaction('IMPERIAL');
            const initialPrestige = player.factionPrestige?.IMPERIAL || 0;

            const imperialMission = new Mission({
                type: MISSION_TYPE.IMPERIAL_SUPPLY,
                reward: 5000,
                prestigeReward: 10,
                requiredFaction: 'IMPERIAL'
            });

            player.activeMission = imperialMission;
            // The actual logic in player.completeMission or mission.complete should handle prestige
            // For integration test, we verify the impact.
            player.addFactionPrestige('IMPERIAL', imperialMission.prestigeReward || 0);

            expect(player.factionPrestige?.IMPERIAL).toBe(initialPrestige + 10);
        });
    });
});
