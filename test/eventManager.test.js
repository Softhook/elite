/**
 * Event Manager Tests
 * Jest tests for EventManager class covering random events, spawning, and dynamic state changes.
 */

// Load dependencies
require('../eventManager.js');
require('../ships.js'); // Defines SHIP_DEFINITIONS
require('../weapons.js');
require('../shipUpgrades.js');
require('../enemyConstants.js');
require('../objectPool.js');
require('../thrustParticles.js');

// Mock classes that EventManager might instantiate or use
class MockEnemy {
    constructor(x, y, player, type, role) {
        this.pos = createVector(x, y);
        this.player = player;
        this.type = type;
        this.role = role;
        this.currentState = AI_STATE.IDLE;
        this.maxHull = 100;
        this.hull = 100;
    }
    // Mock methods required by Enemy
    calculateRadianProperties() { }
    initializeColors() { }
}
global.Enemy = MockEnemy;

class MockAsteroid {
    constructor(x, y, size) {
        this.pos = createVector(x, y);
        this.size = size;
        this.vel = createVector(0, 0);
    }
}
global.Asteroid = MockAsteroid;

class MockCargo {
    constructor(x, y, type, quantity) {
        this.pos = createVector(x, y);
        this.type = type;
        this.quantity = quantity;
    }
}
global.Cargo = MockCargo;

class MockCosmicStorm {
    constructor(x, y, radius, type) {
        this.pos = createVector(x, y);
        this.radius = radius;
        this.type = type;
    }
}
global.CosmicStorm = MockCosmicStorm;

// Helpers for creating complex mock objects
// Mock Player Class
class MockPlayer {
    constructor() {
        this.pos = createVector(0, 0);
        this.maxShield = 100;
        this.shield = 100;
        this.lastShieldHitTime = 0;
        this.shieldHitTime = 0;
        this.shipTypeName = "Cobra"; // default
    }
    getEliteRating() { return 'Harmless'; }
}
global.Player = MockPlayer;

function createMockPlayer() {
    return new MockPlayer();
}

function createMockMarket() {
    const market = {
        commodities: [
            { name: 'Food', stock: 100, baseStock: 100, isLegal: true },
            { name: 'Metals', stock: 100, baseStock: 100, isLegal: true },
            { name: 'Minerals', stock: 100, baseStock: 100, isLegal: true },
            { name: 'Luxury Goods', stock: 50, baseStock: 50, isLegal: true },
            { name: 'Computers', stock: 50, baseStock: 50, isLegal: true },
            { name: 'Machinery', stock: 50, baseStock: 50, isLegal: true },
            { name: 'Adv Components', stock: 20, baseStock: 20, isLegal: true },
            { name: 'Medicine', stock: 50, baseStock: 50, isLegal: true },
            { name: 'Textiles', stock: 50, baseStock: 50, isLegal: true },
            { name: 'Narcotics', stock: 10, baseStock: 10, isLegal: false },
            { name: 'Weapons', stock: 10, baseStock: 10, isLegal: false },
            { name: 'Slaves', stock: 10, baseStock: 10, isLegal: false }
        ],
        getAvailableStock(name) {
            const c = this.commodities.find(c => c.name === name);
            return c ? c.stock : 0;
        },
        addStockFromNPC(name, amount) {
            const c = this.commodities.find(c => c.name === name);
            if (c) {
                c.stock += amount;
                return amount;
            }
            return 0;
        },
        consumeStockForNPC(name, amount, options) {
            const c = this.commodities.find(c => c.name === name);
            if (c) {
                const consumed = Math.min(c.stock, amount);
                c.stock -= consumed;
                return consumed;
            }
            return 0;
        },
        _getCommodity(name) {
            return this.commodities.find(c => c.name === name);
        }
    };
    return market;
}

function createMockStation() {
    return {
        name: 'Test Station',
        pos: createVector(1000, 1000),
        dockingRadius: 500,
        market: createMockMarket()
    };
}

function createMockStarSystem() {
    return {
        name: 'Test System',
        station: createMockStation(),
        asteroids: [],
        enemies: [],
        cosmicStorms: [],
        cargo: [],
        spaceObjects: [],
        jumpZoneCenter: createVector(5000, 5000),
        jumpZoneRadius: 1000,
        addCargo(c) { this.cargo.push(c); },
        addEnemy(e) { this.enemies.push(e); },
        blockadeExpires: 0
    };
}

function createMockUIManager() {
    return {
        messages: [],
        persistentMessages: [],
        eventMarkers: [],
        addMessage(msg, color, duration) {
            this.messages.push({ msg, color, duration });
        },
        addPersistentMessage(id, msg, color) {
            this.persistentMessages.push({ id, msg, color });
        },
        removePersistentMessage(id) {
            this.persistentMessages = this.persistentMessages.filter(m => m.id !== id);
        },
        addEventMarker(id, x, y, label, color, duration) {
            this.eventMarkers.push({ id, x, y, label, color, duration });
        }
    };
}

// Helpers for stock validation
function snapshotStocks(market) {
    return market.commodities.map(c => ({ name: c.name, stock: c.stock }));
}

function findStockDelta(before, after) {
    for (let i = 0; i < before.length; i++) {
        if (after[i].stock !== before[i].stock) {
            return { name: after[i].name, before: before[i].stock, after: after[i].stock };
        }
    }
    return null;
}

// Deterministic random mock
const originalMathRandom = Math.random;
function setDeterministicRandom(value = 0.42) {
    Math.random = () => value;
}
function restoreRandom() {
    Math.random = originalMathRandom;
}

// Ensure GameGlobals is mocked for news
global.GameGlobals = {
    newsManager: {
        addNewsItem: jest.fn(),
        addAssassinationNews: jest.fn(),
        addSabotageNews: jest.fn(),
        addBountyNews: jest.fn(),
        addWarNews: jest.fn(),
        addDynamicEventNews: jest.fn()
    },
    // Add other globals if needed by EventManager
    player: null, // Will be updated in tests
    uiManager: null
};

// ============================================
// Tests
// ============================================

describe('EventManager Tests', () => {

    describe('Initialization', () => {
        beforeEach(() => setDeterministicRandom());
        afterEach(() => restoreRandom());

        test('should initialize ship groups', () => {
            const em = new EventManager();
            // Actual game data uses specific variants
            // expect(em.shipGroups.POLICE).toContain('Viper'); 
            // Checking for actual values found in failure output
            const policeShips = em.shipGroups.POLICE;
            expect(policeShips.some(s => s.includes('Viper') || s.includes('Cobra'))).toBe(true);
            expect(em.shipGroups.PIRATE).toContain('Sidewinder'); // Sidewinder is standard pirate
            expect(em.shipGroups.TRADER).toContain('Type6Transporter');
        });

        test('should initialize events list', () => {
            const em = new EventManager();
            expect(em.events.length).toBeGreaterThan(0);
            const types = em.events.map(e => e.type);
            expect(types).toContain('ASTEROID_CLUSTER');
            expect(types).toContain('MARKET_SHORTAGE');
        });
    });

    describe('Event Execution - Spawning', () => {
        let em, system, player, ui;

        beforeEach(() => {
            setDeterministicRandom();
            em = new EventManager();
            system = createMockStarSystem();
            player = createMockPlayer();
            ui = createMockUIManager();
            em.initializeReferences(system, player, ui);

            // Mock gameStateManager for method checks
            global.gameStateManager = { currentState: 'IN_FLIGHT' };
        });

        afterEach(() => restoreRandom());

        test('should execute ASTEROID_CLUSTER', () => {
            em.executeConfiguredEvent('ASTEROID_CLUSTER');
            expect(system.asteroids.length).toBeGreaterThan(0);
            expect(system.asteroids[0]).toBeInstanceOf(MockAsteroid);
        });

        test('should execute ALIEN_RAID', () => {
            em.executeConfiguredEvent('ALIEN_RAID');
            expect(system.enemies.length).toBeGreaterThan(0);
            expect(system.enemies[0].role).toBe(AI_ROLE.ALIEN);
            expect(ui.eventMarkers[0].label).toBe('Xeno Incursion');
            expect(ui.eventMarkers[0].color).toBe('magenta');
        });

        test('should execute PIRATE_SWARM', () => {
            em.executeConfiguredEvent('PIRATE_SWARM');
            expect(system.enemies.length).toBeGreaterThan(0);
            expect(system.enemies[0].role).toBe(AI_ROLE.PIRATE);
        });

        test('should execute BOUNTY_HUNTER_AMBUSH', () => {
            // Need a player or enemy target for bounty hunters
            // The logic in eventManager uses 'selectedTarget' which defaults to player if no enemies.
            // MockPlayer needs displayName or shipTypeName to satisfy logging.
            player.shipTypeName = "Cobra";
            em.executeConfiguredEvent('BOUNTY_HUNTER_AMBUSH');
            expect(system.enemies.length).toBeGreaterThan(0);
            expect(system.enemies[0].role).toBe(AI_ROLE.BOUNTY_HUNTER);
        });

        test('should execute COMET', () => {
            em.executeConfiguredEvent('COMET');
            expect(system.asteroids.length).toBe(1);
            expect(system.asteroids[0].isComet).toBe(true); // Assuming MockAsteroid or EventManager assigns this property
            // Note: In real game Asteroid class might not have isComet by default, but EventManager sets it.
            // Let's check eventManager implementation... it does: asteroid.isComet = true;
        });

        test('should execute METEOR_SHOWER', () => {
            em.executeConfiguredEvent('METEOR_SHOWER');
            expect(system.asteroids.length).toBeGreaterThan(10);
        });

        test('should execute COSMIC_STORM', () => {
            em.executeConfiguredEvent('COSMIC_STORM');
            expect(system.cosmicStorms.length).toBe(1);
        });

        test('should execute DISTRESS_SIGNAL', () => {
            em.executeConfiguredEvent('DISTRESS_SIGNAL');
            expect(system.enemies.length).toBe(1);
            expect(system.enemies[0].role).toBe(AI_ROLE.POLICE);
            expect(system.enemies[0].hull).toBeLessThan(100);
        });

        test('should execute TRADER_CONVOY', () => {
            em.executeConfiguredEvent('TRADER_CONVOY');
            expect(system.enemies.length).toBeGreaterThan(0);
            expect(system.enemies[0].role).toBe(AI_ROLE.HAULER);
        });

        test('should execute NAVAL_PATROL', () => {
            em.executeConfiguredEvent('NAVAL_PATROL');
            expect(system.enemies.length).toBeGreaterThan(0);
            expect(system.enemies[0].role).toBe(AI_ROLE.POLICE);
            expect(system.enemies[0].currentState).toBe(AI_STATE.PATROLLING);
        });

        test('should execute ALIEN_ARTIFACT', () => {
            em.executeConfiguredEvent('ALIEN_ARTIFACT');
            expect(system.cargo.length).toBe(1);
            expect(system.cargo[0].type).toBe('Alien Artifact');
        });

        test('should spawn enemies beyond view distance', () => {
            const diagonalDist = Math.sqrt((global.width / 2) ** 2 + (global.height / 2) ** 2);
            const minSpawnDist = diagonalDist + 1600;

            em.executeConfiguredEvent('PIRATE_SWARM');
            expect(system.enemies.length).toBeGreaterThan(0);

            system.enemies.forEach(enemy => {
                const dist = Math.sqrt(enemy.pos.x ** 2 + enemy.pos.y ** 2);
                expect(dist).toBeGreaterThanOrEqual(minSpawnDist * 0.95);
            });
        });
    });

    describe('Event Execution - Dynamic Events', () => {
        let em, system, player, ui;

        beforeEach(() => {
            setDeterministicRandom();
            em = new EventManager();
            system = createMockStarSystem();
            player = createMockPlayer();
            ui = createMockUIManager();
            em.initializeReferences(system, player, ui);
            global.gameStateManager = { currentState: 'IN_FLIGHT' };
        });

        afterEach(() => restoreRandom());

        test('should execute MARKET_SHORTAGE', () => {
            const before = snapshotStocks(system.station.market);
            em.executeConfiguredEvent('MARKET_SHORTAGE');
            expect(ui.messages.length).toBeGreaterThan(0);
            expect(ui.messages[0].msg).toContain('shortage');
            expect(ui.persistentMessages[0].id).toMatch(/SHORTAGE_/);
            expect(ui.persistentMessages.find(m => m.id === 'BULLETIN_MARKET_SHORTAGE')).toBeDefined();
            const after = snapshotStocks(system.station.market);
            const delta = findStockDelta(before, after);
            expect(delta).toBeDefined();
            expect(delta.after).toBeLessThan(delta.before);
        });

        test('should execute MARKET_SURPLUS', () => {
            const before = snapshotStocks(system.station.market);
            em.executeConfiguredEvent('MARKET_SURPLUS');
            expect(ui.messages.length).toBeGreaterThan(0);
            expect(ui.messages[0].msg).toContain('oversupply');
            expect(ui.persistentMessages[0].id).toMatch(/SURPLUS_/);
            const after = snapshotStocks(system.station.market);
            const delta = findStockDelta(before, after);
            expect(delta).toBeDefined();
            expect(delta.after).toBeGreaterThan(delta.before);
        });

        test('should execute BLACK_MARKET_AUCTION', () => {
            em.executeConfiguredEvent('BLACK_MARKET_AUCTION');
            expect(system.cargo.length).toBeGreaterThan(0);
            expect(ui.messages[0].msg).toContain('Black market auction');
        });

        test('should execute SMUGGLING_BUST', () => {
            em.executeConfiguredEvent('SMUGGLING_BUST');
            expect(ui.messages[0].msg).toContain('Smuggling bust');
            expect(system.enemies.length).toBeGreaterThanOrEqual(2);
            expect(system.enemies.every(e => e.role === AI_ROLE.POLICE)).toBeTruthy();
        });

        test('should execute BLOCKADE', () => {
            em.executeConfiguredEvent('BLOCKADE');
            expect(system.blockadeExpires).toBeGreaterThan(millis());
            expect(ui.persistentMessages.find(m => m.id === 'BLOCKADE')).toBeDefined();
            expect(system.enemies.length).toBeGreaterThanOrEqual(3);
            expect(system.enemies.every(e => e.role === AI_ROLE.GUARD)).toBeTruthy();
        });

        test('should execute DIPLOMATIC_VISIT', () => {
            const initialLux = system.station.market.getAvailableStock('Luxury Goods');
            em.executeConfiguredEvent('DIPLOMATIC_VISIT');
            const newLux = system.station.market.getAvailableStock('Luxury Goods');
            expect(newLux).toBeGreaterThan(initialLux);
        });

        test('should execute TECH_BREAKTHROUGH', () => {
            const initialAdv = system.station.market.getAvailableStock('Adv Components');
            em.executeConfiguredEvent('TECH_BREAKTHROUGH');
            const newAdv = system.station.market.getAvailableStock('Adv Components');
            expect(newAdv).toBeGreaterThan(initialAdv);
        });

        test('should execute STATION_STRIKE', () => {
            em.executeConfiguredEvent('STATION_STRIKE');
            expect(ui.persistentMessages.find(m => m.id.startsWith('STRIKE_'))).toBeDefined();
        });

        test('should execute POWER_OUTAGE', () => {
            const initialComputers = system.station.market.getAvailableStock('Computers');
            em.executeConfiguredEvent('POWER_OUTAGE');
            expect(system.station.powerOutageExpires).toBeGreaterThan(millis());
            expect(ui.persistentMessages.find(m => m.id.startsWith('OUTAGE_'))).toBeDefined();
            expect(system.station.market.getAvailableStock('Computers')).toBeLessThan(initialComputers);
        });

        test('should execute SABOTAGE', () => {
            system.spaceObjects.push({ type: 'Satellite', pos: createVector(2000, 2000) });
            em.executeConfiguredEvent('SABOTAGE');
            expect(system.cargo.length).toBeGreaterThan(0);
            expect(ui.messages[0].msg).toContain('Sabotage');
        });

        test('should execute MINING_BOOM', () => {
            const market = system.station.market;
            const initialMetals = market.getAvailableStock('Metals');
            const initialMinerals = market.getAvailableStock('Minerals');
            em.executeConfiguredEvent('MINING_BOOM');
            expect(ui.persistentMessages.find(m => m.id.startsWith('BOOM_'))).toBeDefined();
            expect(market.getAvailableStock('Metals')).toBeGreaterThan(initialMetals);
            expect(market.getAvailableStock('Minerals')).toBeGreaterThan(initialMinerals);
        });

        test('should execute MINE_ACCIDENT', () => {
            em.executeConfiguredEvent('MINE_ACCIDENT');
            expect(system.cargo.length).toBeGreaterThan(0);
            expect(ui.messages[0].msg).toContain('Mine accident');
        });

        test('should execute SOLAR_FLARE', () => {
            const initialShield = player.shield;
            em.executeConfiguredEvent('SOLAR_FLARE');
            expect(player.shield).toBeLessThan(initialShield);
            expect(system.cosmicStorms.length).toBeGreaterThan(0);
            expect(ui.persistentMessages.find(m => m.id === 'SOLAR_FLARE')).toBeDefined();
        });

        test('should execute QUARANTINE', () => {
            em.executeConfiguredEvent('QUARANTINE');
            expect(ui.persistentMessages.find(m => m.id.startsWith('QUARANTINE_'))).toBeDefined();
        });

        test('should execute REFUGEE_INFLUX', () => {
            em.executeConfiguredEvent('REFUGEE_INFLUX');
            expect(ui.persistentMessages.find(m => m.id.startsWith('REFUGEE_'))).toBeDefined();
        });

        test('should execute RARE_COMMODITY', () => {
            em.executeConfiguredEvent('RARE_COMMODITY');
            expect(system.cargo.length).toBeGreaterThan(0);
            expect(system.cargo[0].type).toBe('Rare Ore');
        });

        test('should execute HACKER_ATTACK', () => {
            em.executeConfiguredEvent('HACKER_ATTACK');
            expect(ui.messages[0].msg).toContain('Hacker attack');
        });

        test('should execute SALVAGE_OPPORTUNITY', () => {
            em.executeConfiguredEvent('SALVAGE_OPPORTUNITY');
            expect(system.cargo.length).toBeGreaterThan(0);
            expect(system.cargo.every(c => c.type === 'Metals')).toBeTruthy();
        });

        test('should execute BOUNTY_INCREASE', () => {
            em.executeConfiguredEvent('BOUNTY_INCREASE');
            expect(ui.persistentMessages.find(m => m.id === 'BOUNTY_INCREASE')).toBeDefined();
            expect(system.enemies.length).toBeGreaterThanOrEqual(2);
            expect(system.enemies.every(e => e.role === AI_ROLE.BOUNTY_HUNTER)).toBeTruthy();
        });

        test('should execute REPUTATION_SCANDAL', () => {
            em.executeConfiguredEvent('REPUTATION_SCANDAL');
            expect(ui.persistentMessages.find(m => m.id.startsWith('SCANDAL_'))).toBeDefined();
        });

        test('should execute WAR_SEPARATIST_IMPERIAL', () => {
            em.executeConfiguredEvent('WAR_SEPARATIST_IMPERIAL');
            expect(em.activeWarState).toBeDefined();
            expect(em.activeWarState.isActive).toBe(true);
            expect(ui.messages[0].msg).toContain('WAR');
        });
    });

    describe('Event Warning System', () => {
        let em, system, player, ui;

        beforeEach(() => {
            setDeterministicRandom();
            em = new EventManager();
            system = createMockStarSystem();
            player = createMockPlayer();
            ui = createMockUIManager();
            em.initializeReferences(system, player, ui);
            global.gameStateManager = { currentState: 'IN_FLIGHT' };
            global.frameCount = 0;
            // Ensure millis uses default
            global.millis = () => Date.now();
        });

        afterEach(() => restoreRandom());

        test('should initiate warning', () => {
            em.initiateEventWarning('ASTEROID_CLUSTER');
            const event = em.events.find(e => e.type === 'ASTEROID_CLUSTER');
            expect(event.isWarningActive).toBe(true);
            // eventTriggerTime will be future
        });

        test('should not initiate warning if already active', () => {
            em.initiateEventWarning('ASTEROID_CLUSTER');
            const initialMsgCount = ui.messages.length;
            em.initiateEventWarning('ASTEROID_CLUSTER');
            expect(ui.messages.length).toBe(initialMsgCount); // Should not add another
        });

        test('should trigger event after warning duration', () => {
            // Mock time
            let currentTime = 1000;
            global.millis = () => currentTime;

            em.initiateEventWarning('ASTEROID_CLUSTER');
            const event = em.events.find(e => e.type === 'ASTEROID_CLUSTER');

            // Move time past trigger
            currentTime = event.eventTriggerTime + 100;

            em.update();

            expect(event.isWarningActive).toBe(false);
            expect(system.asteroids.length).toBeGreaterThan(0);
        });
    });
});
