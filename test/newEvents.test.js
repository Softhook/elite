/**
 * New Events Tests
 * Jest tests for the 8 new events added to EventManager.
 */

// Load dependencies
require('../eventManager.js');
require('../ships.js'); // Defines SHIP_DEFINITIONS
require('../weapons.js');
require('../shipUpgrades.js');
require('../enemyConstants.js');
require('../objectPool.js');
require('../thrustParticles.js');

// Mock classes
class MockEnemy {
    constructor(x, y, player, type, role) {
        this.pos = createVector(x, y);
        this.player = player;
        this.type = type;
        this.role = role;
        this.currentState = AI_STATE.IDLE;
        this.maxHull = 100;
        this.hull = 100;
        this.vel = createVector(0, 0);
        this.baseMaxSpeed = 5;
        this.maxSpeed = 5;
        this.shield = 100;
    }
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

// Mock Player
class MockPlayer {
    constructor() {
        this.pos = createVector(0, 0);
        this.maxShield = 100;
        this.shield = 100;
    }
    getEliteRating() { return 'Harmless'; }
}
global.Player = MockPlayer;

// Mock Setup Helpers
function createMockStation() {
    return {
        name: 'Test Station',
        pos: createVector(1000, 1000),
        dockingRadius: 500,
        market: {
            addStockFromNPC: () => 10,
            consumeStockForNPC: () => 10,
            getAvailableStock: () => 50
        }
    };
}

function createMockStarSystem() {
    return {
        name: 'Test System',
        station: createMockStation(),
        asteroids: [],
        enemies: [],
        cargo: [],
        spaceObjects: [],
        addCargo(c) { this.cargo.push(c); },
        addEnemy(e) { this.enemies.push(e); },
        addAsteroid(a) { this.asteroids.push(a); }
    };
}

function createMockUIManager() {
    return {
        messages: [],
        persistentMessages: [],
        addMessage(msg, color, duration) {
            this.messages.push({ msg, color, duration });
        },
        addPersistentMessage(id, msg, color) {
            this.persistentMessages.push({ id, msg, color });
        },
        removePersistentMessage(id) {
            this.persistentMessages = this.persistentMessages.filter(m => m.id !== id);
        }
    };
}

// Random mocking
const originalMathRandom = Math.random;
function setDeterministicRandom(value = 0.42) {
    Math.random = () => value;
}
function restoreRandom() {
    Math.random = originalMathRandom;
}

// Globals
global.GameGlobals = {
    newsManager: {
        addNewsItem: jest.fn(),
        addWarNews: jest.fn()
    }
};

describe('New Events Tests', () => {
    let em, system, player, ui;

    beforeEach(() => {
        setDeterministicRandom();
        em = new EventManager();
        system = createMockStarSystem();
        player = new MockPlayer();
        ui = createMockUIManager();
        em.initializeReferences(system, player, ui);
        global.gameStateManager = { currentState: 'IN_FLIGHT' };
        global.frameCount = 100;
        global.millis = () => 1000;
        global.width = 1920;
        global.height = 1080;
    });

    afterEach(() => restoreRandom());

    test('should execute LOST_SHIPMENT', () => {
        em.executeConfiguredEvent('LOST_SHIPMENT');

        // Should spawn cargo
        expect(system.cargo.length).toBeGreaterThan(0);
        // Should spawn ambush pirates
        expect(system.enemies.length).toBeGreaterThan(0);
        expect(system.enemies.some(e => e.role === AI_ROLE.PIRATE)).toBe(true);
        expect(ui.messages[0].msg).toContain('Lost shipment');
    });

    test('should execute FACTION_SKIRMISH', () => {
        em.executeConfiguredEvent('FACTION_SKIRMISH');

        // Should spawn Police and Pirates
        expect(system.enemies.length).toBeGreaterThanOrEqual(4);
        const hasPolice = system.enemies.some(e => e.role === AI_ROLE.POLICE);
        const hasPirate = system.enemies.some(e => e.role === AI_ROLE.PIRATE);
        expect(hasPolice).toBe(true);
        expect(hasPirate).toBe(true);

        // Should have targets set (combat state)
        const combatant = system.enemies[0];
        expect(combatant.currentState).toBe(AI_STATE.COMBAT);
    });

    test('should execute VIP_CONVOY', () => {
        em.executeConfiguredEvent('VIP_CONVOY');

        // Should spawn 1 Hauler + Guards
        const hauler = system.enemies.find(e => e.role === AI_ROLE.HAULER && e.displayName === "VIP Transport");
        expect(hauler).toBeDefined();

        const guards = system.enemies.filter(e => e.role === AI_ROLE.GUARD); // Default role for formation might be GUARD or inferred
        // Guard formation uses AI_ROLE.GUARD usually, checking impl...
        // _spawnGuardFormation uses _spawnAdHocEnemy with AI_ROLE.GUARD? 
        // Let's assume it puts them in GUARD group/role.
        // Actually _spawnGuardFormation uses AI_ROLE.GUARD in eventManager.js
        expect(guards.length).toBeGreaterThan(0);
    });

    test('should execute MINING_OPERATION', () => {
        // Need to ensure addAsteroid is called
        em.executeConfiguredEvent('MINING_OPERATION');

        expect(system.asteroids.length).toBeGreaterThan(0);

        const miners = system.enemies.filter(e => e.role === AI_ROLE.MINER);
        expect(miners.length).toBeGreaterThan(0);
        expect(miners[0].currentState).toBe(AI_STATE.MINING);

        const security = system.enemies.find(e => e.displayName === "Mining Security");
        expect(security).toBeDefined();
    });

    test('should execute ROGUE_SECURITY', () => {
        em.executeConfiguredEvent('ROGUE_SECURITY');

        expect(system.enemies.length).toBeGreaterThan(0);
        const rogue = system.enemies[0];
        // Ships should be Police (ViperPol) but Role should be Pirate
        expect(rogue.role).toBe(AI_ROLE.PIRATE);
        expect(rogue.displayName).toBe("Rogue Security");
    });

    test('should execute INTERSTELLAR_RALLY', () => {
        em.executeConfiguredEvent('INTERSTELLAR_RALLY');

        expect(system.enemies.length).toBeGreaterThan(0);
        const racer = system.enemies[0];
        expect(racer.role).toBe(AI_ROLE.HAULER);
        expect(racer.currentState).toBe(AI_STATE.FLEEING);
        expect(racer.displayName).toBe("Rally Racer");
        expect(racer.baseMaxSpeed).toBeGreaterThan(5); // Baseline mock is 5
    });

    test('should execute ALIEN_SCOUT', () => {
        em.executeConfiguredEvent('ALIEN_SCOUT');

        expect(system.enemies.length).toBe(1);
        expect(system.enemies[0].role).toBe(AI_ROLE.ALIEN);
    });

    test('should execute PROTOTYPE_TESTING', () => {
        em.executeConfiguredEvent('PROTOTYPE_TESTING');

        expect(system.enemies.length).toBe(1);
        const proto = system.enemies[0];
        expect(proto.role).toBe(AI_ROLE.COMBAT);
        expect(proto.displayName).toBe("Prototype Unit");
        expect(proto.shield).toBeGreaterThan(100); // 1.5x multiplier
    });
});
