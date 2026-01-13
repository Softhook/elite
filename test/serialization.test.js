// Mock Player class to avoid complex dependencies
class MockPlayer {
    constructor(shipType) {
        this.shipTypeName = shipType;
        this.pos = createVector(0, 0);
    }
}
const { Enemy } = require('../enemy');
// const { Player } = require('../player'); // REMOVE REAL DEPENDENCY
const Player = MockPlayer; // Use mock
const { Projectile } = require('../projectile');
const { Cargo } = require('../cargo');
const { Asteroid } = require('../asteroid');
const { NewsManager, NEWS_PRIORITY, NEWS_CATEGORY } = require('../newsManager');
const { EventManager } = require('../eventManager');

// Mock dependencies
// Enemy requires AI_ROLE and AI_STATE, usually in enemyConstants.js
require('../enemyConstants'); // Should load globals like AI_ROLE
require('../objectPool.js'); // Needed for ThrustManager
require('../thrustParticles.js'); // Needed for ThrustManager used in Enemy constructor
require('../ships.js'); // Defines SHIP_DEFINITIONS
require('../weapons.js'); // Defines WEAPON_DEFINITIONS (implicit dependency)
require('../shipUpgrades.js'); // Defines SHIP_UPGRADES (implicit dependency)

// Mock p5 global functions if not already provided by jest.setup.js

// Mock p5 global functions if not already provided by jest.setup.js
// but jest.setup.js should have them.

describe('Serialization Tests', () => {

    // ============================================
    // Enemy Serialization Tests
    // ============================================
    describe('Enemy Serialization', () => {
        let enemy;
        let mockPlayer;

        beforeEach(() => {
            // Setup minimal mock player
            mockPlayer = new Player('Sidewinder');
            mockPlayer.pos = createVector(0, 0);

            enemy = new Enemy(150, 250, mockPlayer, 'Viper', AI_ROLE.PIRATE);
            enemy.hull = 60;
            enemy.shield = 20;
            enemy.currentState = AI_STATE.APPROACHING;
        });

        test('should serialize position', () => {
            const json = enemy.toJSON();
            expect(json.pos.x).toBe(150);
            expect(json.pos.y).toBe(250);
        });

        test('should serialize ship type', () => {
            const json = enemy.toJSON();
            expect(json.shipTypeName).toBe('Viper');
        });

        test('should serialize role', () => {
            const json = enemy.toJSON();
            expect(json.role).toBe(AI_ROLE.PIRATE);
        });

        test('should serialize health', () => {
            const json = enemy.toJSON();
            expect(json.hull).toBe(60);
            expect(json.shield).toBe(20);
        });

        test('should serialize state', () => {
            const json = enemy.toJSON();
            expect(json.currentState).toBe(AI_STATE.APPROACHING);
        });

        test('should deserialize position', () => {
            const json = enemy.toJSON();
            const restored = Enemy.fromJSON(json);
            expect(restored.pos.x).toBe(150);
            expect(restored.pos.y).toBe(250);
        });

        test('should deserialize role', () => {
            const json = enemy.toJSON();
            const restored = Enemy.fromJSON(json);
            expect(restored.role).toBe(AI_ROLE.PIRATE);
        });

        test('should round-trip all properties', () => {
            const json = enemy.toJSON();
            const restored = Enemy.fromJSON(json);

            expect(restored.shipTypeName).toBe(enemy.shipTypeName);
            expect(restored.role).toBe(enemy.role);
            expect(restored.hull).toBe(enemy.hull);
            expect(restored.currentState).toBe(enemy.currentState);
        });

        test('should safe-serialize with circular references', () => {
            // Simulate circular reference (e.g., enemy targeting itself or player that references enemy)
            enemy.bountyTarget = enemy; // Self-reference

            // toJSON should handle or ignore this without crashing
            const json = enemy.toJSON();
            expect(json).toBeDefined();
            // bountyTarget is likely not serialized or is stripped/handled safely
            expect(json.bountyTarget).toBeUndefined();
        });
    });

    // ============================================
    // Projectile Serialization Tests
    // ============================================
    describe('Projectile Serialization', () => {
        let projectile;

        beforeEach(() => {
            projectile = new Projectile(100, 200, Math.PI / 4, null, 8, 15);
            projectile.lifespan = 60;
        });

        test('should have toJSON method', () => {
            expect(typeof projectile.toJSON).toBe('function');
        });

        test('should serialize position', () => {
            const json = projectile.toJSON();
            expect(json.pos.x).toBe(100);
            expect(json.pos.y).toBe(200);
        });

        test('should serialize angle', () => {
            const json = projectile.toJSON();
            expect(json.angle).toBeCloseTo(Math.PI / 4, 3);
        });

        test('should serialize damage', () => {
            const json = projectile.toJSON();
            expect(json.damage).toBe(15);
        });

        test('should have static fromJSON method', () => {
            expect(typeof Projectile.fromJSON).toBe('function');
        });

        test('should round-trip projectile', () => {
            const json = projectile.toJSON();
            const restored = Projectile.fromJSON(json);

            expect(restored.pos.x).toBe(100);
            expect(restored.damage).toBe(15);
            expect(restored.lifespan).toBe(60);
        });
    });

    // ============================================
    // Cargo Serialization Tests
    // ============================================
    describe('Cargo Serialization', () => {
        let cargo;

        beforeEach(() => {
            // Creating cargo with specific type and quantity
            // LEGAL_CARGO and ILLEGAL_CARGO depend on commodityDefinitions being loaded
            // We use explicit string here to be safe
            cargo = new Cargo(300, 400, 'Luxury Goods', 3);
        });

        test('should have toJSON method', () => {
            expect(typeof cargo.toJSON).toBe('function');
        });

        test('should serialize position', () => {
            const json = cargo.toJSON();
            expect(json.pos.x).toBe(300);
            expect(json.pos.y).toBe(400);
        });

        test('should serialize type', () => {
            const json = cargo.toJSON();
            expect(json.type).toBe('Luxury Goods');
        });

        test('should serialize quantity', () => {
            const json = cargo.toJSON();
            expect(json.quantity).toBe(3);
        });

        test('should have static fromJSON method', () => {
            expect(typeof Cargo.fromJSON).toBe('function');
        });

        test('should round-trip cargo', () => {
            const json = cargo.toJSON();
            const restored = Cargo.fromJSON(json);

            expect(restored.pos.x).toBe(300);
            expect(restored.type).toBe('Luxury Goods');
            expect(restored.quantity).toBe(3);
        });
    });

    // ============================================
    // Asteroid Serialization Tests
    // ============================================
    describe('Asteroid Serialization', () => {
        let asteroid;

        beforeEach(() => {
            asteroid = new Asteroid(500, 600, 50);
            asteroid.health = 75;
        });

        test('should have toJSON method', () => {
            expect(typeof asteroid.toJSON).toBe('function');
        });

        test('should serialize position', () => {
            const json = asteroid.toJSON();
            expect(json.pos.x).toBe(500);
            expect(json.pos.y).toBe(600);
        });

        test('should serialize health', () => {
            const json = asteroid.toJSON();
            expect(json.health).toBe(75);
        });

        test('should serialize size properties', () => {
            const json = asteroid.toJSON();
            expect(json.size).toBeDefined();
            expect(json.maxRadius).toBeDefined();
        });

        test('should have static fromJSON method', () => {
            expect(typeof Asteroid.fromJSON).toBe('function');
        });

        test('should round-trip asteroid', () => {
            const json = asteroid.toJSON();
            const restored = Asteroid.fromJSON(json);

            expect(restored.pos.x).toBe(500);
            expect(restored.health).toBe(75);
            expect(restored.size).toBe(asteroid.size);
        });
    });

    // ============================================
    // NewsManager Persistence Tests
    // ============================================
    describe('NewsManager Persistence', () => {
        let newsMgr;

        beforeEach(() => {
            newsMgr = new NewsManager();
        });

        test('should serialize empty manager', () => {
            const json = newsMgr.toJSON();
            expect(json.newsItems).toBeDefined();
            // It might initialize with items if _addInitialNews does so. 
            // The code shows `_addInitialNews` is empty content "No initial news".
            expect(json.newsItems.length).toBe(0);
            expect(json.recentNewsHashes).toBeDefined();
        });

        test('should persist news items', () => {
            // Add manual news item
            const newsItem = {
                headline: "Test Headline",
                body: "Test Body",
                source: "Test Source",
                sourceColor: [255, 255, 255],
                category: NEWS_CATEGORY.LOCAL_EVENT,
                priority: NEWS_PRIORITY.HIGH
            };
            // Manually add since _addNews implies internal logic we might not want to fully invoke if it uses external randoms
            // But we can poke it into the array:
            newsMgr.newsItems.push(newsItem);
            expect(newsMgr.newsItems.length).toBe(1);

            const json = newsMgr.toJSON();

            const restored = new NewsManager();
            restored.fromJSON(json);

            expect(restored.newsItems.length).toBe(1);
            expect(restored.newsItems[0].headline).toBe("Test Headline");
            expect(restored.newsItems[0].body).toBe("Test Body");
        });

        test('should persist read status', () => {
            const newsItem = {
                headline: "Read News",
                body: "Body",
                source: "Source",
                category: NEWS_CATEGORY.LOCAL_EVENT,
                priority: 1,
                read: true
            };
            newsMgr.newsItems.push(newsItem);

            const json = newsMgr.toJSON();

            const restored = new NewsManager();
            restored.fromJSON(json);

            expect(restored.newsItems[0].read).toBe(true);
        });

        test('should persist timers', () => {
            newsMgr.lastCombatReportTime = 12345;
            newsMgr.lastGalaxyNewsTime = 67890;
            newsMgr.lastHeroReportTime = 54321;

            const json = newsMgr.toJSON();

            const restored = new NewsManager();
            restored.fromJSON(json);

            expect(restored.lastCombatReportTime).toBe(12345);
            expect(restored.lastGalaxyNewsTime).toBe(67890);
            expect(restored.lastHeroReportTime).toBe(54321);
        });

        test('should persist deduplication hashes', () => {
            newsMgr.recentNewsHashes.add("hash1");
            newsMgr.recentNewsHashes.add("hash2");

            const json = newsMgr.toJSON();

            const restored = new NewsManager();
            restored.fromJSON(json);

            expect(restored.recentNewsHashes.has("hash1")).toBe(true);
            expect(restored.recentNewsHashes.has("hash2")).toBe(true);
            expect(restored.recentNewsHashes.size).toBe(2);
        });
    });

    // ============================================
    // EventManager Persistence Tests
    // ============================================
    describe('EventManager Persistence', () => {
        let eventMgr;

        beforeEach(() => {
            eventMgr = new EventManager();
        });

        test('should serialize basic state', () => {
            const json = eventMgr.toJSON();
            expect(json).toBeDefined();
        });

        test('should persist active war state', () => {
            eventMgr.activeWarState = {
                isActive: true,
                intensity: 'SKIRMISH',
                factions: 'SEPARATIST_VS_IMPERIAL',
                expires: 100000,
                spawnModifiers: { SEPARATIST: 1.5 }
            };

            const json = eventMgr.toJSON();

            const restored = new EventManager();
            restored.fromJSON(json);

            expect(restored.activeWarState.isActive).toBe(true);
            expect(restored.activeWarState.intensity).toBe('SKIRMISH');
            expect(restored.activeWarState.factions).toBe('SEPARATIST_VS_IMPERIAL');
            expect(restored.activeWarState.expires).toBe(100000);
        });

        test('should persist active crisis state', () => {
            eventMgr.activeCrisisState = {
                plague: { originSystemIndex: 5, expires: 200000, priceMultiplier: 3.0 },
                famine: null
            };

            const json = eventMgr.toJSON();

            const restored = new EventManager();
            restored.fromJSON(json);

            expect(restored.activeCrisisState.plague).toBeDefined();
            expect(restored.activeCrisisState.plague.originSystemIndex).toBe(5);
            expect(restored.activeCrisisState.plague.priceMultiplier).toBe(3.0);
            expect(restored.activeCrisisState.famine).toBeNull();
        });
    });
});
