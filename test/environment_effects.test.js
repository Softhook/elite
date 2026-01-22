
// --- Global Mocks Setup ---
// These must be defined BEFORE requiring game modules

global.createVector = (x, y) => ({
    x: x || 0,
    y: y || 0,
    add: function (v) { this.x += v.x; this.y += v.y; return this; },
    sub: function (v) { this.x -= v.x; this.y -= v.y; return this; },
    mult: function (n) { this.x *= n; this.y *= n; return this; },
    div: function (n) { this.x /= n; this.y /= n; return this; },
    normalize: function () {
        const m = Math.sqrt(this.x * this.x + this.y * this.y);
        if (m > 0) this.div(m);
        return this;
    },
    mag: function () { return Math.sqrt(this.x * this.x + this.y * this.y); },
    copy: function () { return global.createVector(this.x, this.y); },
    dist: function (v) { return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)); },
    heading: function () { return Math.atan2(this.y, this.x); },
    rotate: function (angle) {
        const newHeading = this.heading() + angle;
        const mag = this.mag();
        this.x = Math.cos(newHeading) * mag;
        this.y = Math.sin(newHeading) * mag;
        return this;
    }
});

global.dist = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
global.random = (min, max) => {
    if (typeof min === 'undefined') return Math.random();
    if (typeof max === 'undefined') return Math.random() * min;
    return Math.random() * (max - min) + min;
};
global.floor = Math.floor;
global.PI = Math.PI;
global.TWO_PI = Math.PI * 2;
global.cos = Math.cos;
global.sin = Math.sin;
global.atan2 = Math.atan2;
global.sqrt = Math.sqrt;
global.max = Math.max;
global.min = Math.min;
global.abs = Math.abs;
global.radians = (deg) => deg * (Math.PI / 180);
global.deltaTime = 16;
global.millis = () => Date.now();

// FIX: Add mult to p5.Vector static methods
global.p5 = {
    Vector: {
        sub: (v1, v2) => global.createVector(v1.x - v2.x, v1.y - v2.y),
        dist: (v1, v2) => global.dist(v1.x, v1.y, v2.x, v2.y),
        mult: (v, n) => global.createVector(v.x * n, v.y * n),
        random2D: () => global.createVector(Math.random() - 0.5, Math.random() - 0.5).normalize()
    }
};
global.color = () => ({});

// Global Game Configuration Mocks
global.STARFIELD_CONFIG = { WORKER_ENABLED: false };
global.SPAWN_CONFIG = { SPAWN_INTERVAL_MS: 5000, FIXED_LARGE_DESPAWN_RADIUS: 5000 };
global.JUMP_ZONE_CONFIG = { DEFAULT_RADIUS: 1000 };
global.WEAPON_UPGRADES = [
    { name: "Pulse Laser", type: "laser", damage: 10 },
    { name: "Burst Laser", type: "laser", damage: 15 }
];

global.SHIP_DEFINITIONS = {
    "Sidewinder": {
        baseHull: 100,
        baseShield: 100,
        size: 10,
        aiRoles: ["PIRATE"],
        baseMaxSpeed: 10,
        baseThrust: 10,
        baseTurnRate: 0.1
    },
    "Krait": {
        baseHull: 200,
        baseShield: 200,
        size: 20,
        aiRoles: ["PIRATE"],
        baseMaxSpeed: 10,
        baseThrust: 10,
        baseTurnRate: 0.1
    },
    "KraitMKI": {
        baseHull: 200,
        baseShield: 200,
        size: 20,
        aiRoles: ["PIRATE"],
        baseMaxSpeed: 10,
        baseThrust: 10,
        baseTurnRate: 0.1
    }
};

// Additional required globals for Enemy/StarSystem
global.width = 2000;
global.height = 2000;
global.AI_STATE = { IDLE: 'IDLE', ATTACKING: 'ATTACKING' };
global.AI_ROLE = { PIRATE: 'PIRATE' };
global.WEAPON_TYPE = { PROJECTILE: 'projectile' };
global.TARGET_SCORE_INVALID = -9999;
global.SHIELD_RECHARGE_RATE_MULTIPLIER = 1;
global.TARGET_SCORE_DISTANCE_PENALTY_MULT = 1;
global.TARGET_SCORE_DISTANCE_PENALTY_CAP = 100;

// Mock uiManager
global.uiManager = { addMessage: jest.fn() };

// Stubbing classes to prevent load errors
global.Planet = class Planet { };
global.Station = class Station { };
global.SpaceObject = class SpaceObject {
    distanceTo(other) {
        if (!other || !other.pos) return Infinity;
        return global.dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
    }
};
global.Asteroid = class Asteroid { };
global.Explosion = class Explosion { };
global.Harpoon = class Harpoon { };
global.Cargo = class Cargo { };
global.Mine = class Mine { };
global.Projectile = class Projectile { };
global.Beam = class Beam { };
global.ForceWave = class ForceWave { };

// FIX: Stateful SpatialHash
global.SpatialHash = class SpatialHash {
    constructor(cellSize) { this.cellSize = cellSize; this.items = []; }
    insert(entity) { this.items.push(entity); }
    insertAll(entities) { if (entities) entities.forEach(e => this.insert(e)); }
    remove(entity) { const idx = this.items.indexOf(entity); if (idx > -1) this.items.splice(idx, 1); }
    removeAll(entities) { if (entities) entities.forEach(e => this.remove(e)); }
    update(entity) { }
    query(range) { return this.items || []; }
    getNearby(x, y, range) { return this.items || []; }
    clear() { this.items = []; }
};

// Requires must come AFTER globals are set
const { CosmicStorm } = require('../cosmicStorm');
const { Nebula } = require('../nebula');
const { StarSystem } = require('../starSystem');
const Player = require('../player');

// Require Enemy mixins BEFORE the main Enemy class
require('../enemyUtils');
require('../enemyTargeting');
require('../enemyMovement');
require('../enemyCombat');
require('../enemyAIBehaviors');
require('../enemyCargo');
require('../enemyDamageSystem');
require('../enemyRendering');
require('../enemyStateMachine');

const { Enemy } = require('../enemy');

// IMPORTANT: Set globals for instanceof checks inside game logic
global.Player = Player;
global.Enemy = Enemy;

describe('Environmental Effects Integration', () => {
    let system;
    let player;
    let enemy;

    beforeEach(() => {
        // Setup System
        system = new StarSystem("Test Sector");

        // Mock window for CosmicStorm/Nebula damage context
        global.window = {
            gameStateManager: {
                activeSystem: system
            }
        };

        // Setup Player
        player = new Player("Sidewinder");
        player.pos = createVector(0, 0); // Center
        player.takeDamage = jest.fn();
        system.player = player;

        // Setup Enemy
        enemy = new Enemy(0, 0, player, "Krait", "PIRATE");
        enemy.pos = createVector(100, 0); // Near center
        enemy.takeDamage = jest.fn();
        system.enemies = [enemy];

        // Clear mocks
        global.uiManager.addMessage.mockClear();
    });

    // --- NEBULA TESTS ---

    test('Nebula (Ion) should disable shields inside and reset outside', () => {
        const nebula = new Nebula(0, 0, 200, 'ion');
        system.nebulae = [nebula];

        // 1. Both Entities INSIDE
        system.update();
        expect(player.inNebula).toBe(true);
        expect(player.shieldsDisabled).toBe(true);
        expect(enemy.inNebula).toBe(true);
        expect(enemy.shieldsDisabled).toBe(true);

        // 2. Move Entities OUTSIDE
        player.pos = createVector(500, 500);
        enemy.pos = createVector(500, 600);

        system.update();
        expect(player.inNebula).toBe(false);
        expect(player.shieldsDisabled).toBe(false);
        expect(enemy.inNebula).toBe(false);
        expect(enemy.shieldsDisabled).toBe(false);
    });

    test('Nebula (EMP) should disable weapons inside', () => {
        const nebula = new Nebula(0, 0, 200, 'emp');
        system.nebulae = [nebula];

        system.update();
        expect(player.inNebula).toBe(true);
        expect(player.weaponsDisabled).toBe(true);
        expect(enemy.weaponsDisabled).toBe(true);

        // Verify enemy weapons are actually blocked
        enemy.currentWeapon = { name: "Pulse Laser", type: "laser", fireRate: 0.5 };
        enemy.weapons = [enemy.currentWeapon];

        // Mock WeaponSystem.fire
        global.WeaponSystem = { fire: jest.fn() };

        // Attempt firing
        enemy.fireWeapon();
        expect(global.WeaponSystem.fire).not.toHaveBeenCalled();

        // Attempt secondary firing
        enemy.performSecondaryFiring(system, player);
        expect(global.WeaponSystem.fire).not.toHaveBeenCalled();

        // Attempt proactive barrier
        enemy.weapons = [{ type: 'barrier', fireRate: 5, duration: 5, damageReduction: 0.5 }];
        const activated = enemy.activateBarrierIfNeeded();
        expect(activated).toBe(false);
        expect(enemy.isBarrierActive).toBe(false);
    });

    // --- COSMIC STORM TESTS ---

    test('Storm (Electromagnetic) should disrupt targeting and disable weapons', () => {
        const storm = new CosmicStorm(0, 0, 200, 'electromagnetic');
        system.cosmicStorms = [storm];

        // Inside
        system.update();
        expect(player.targetingDisruption).toBeGreaterThan(0);
        expect(player.weaponsDisabled).toBe(true);
        expect(enemy.targetingDisruption).toBeGreaterThan(0);
        expect(enemy.weaponsDisabled).toBe(true);

        // Outside
        player.pos = createVector(1000, 1000);
        enemy.pos = createVector(1000, 1000);
        system.update();

        expect(player.targetingDisruption).toBe(0);
        expect(player.weaponsDisabled).toBe(false);
        expect(enemy.targetingDisruption).toBe(0);
        expect(enemy.weaponsDisabled).toBe(false);
    });

    test('Storm (Ion) should disable shields', () => {
        const storm = new CosmicStorm(0, 0, 200, 'ion');
        system.cosmicStorms = [storm];

        system.update();
        expect(player.shieldsDisabled).toBe(true);
        expect(enemy.shieldsDisabled).toBe(true);

        // Outside
        player.pos = createVector(1000, 1000);
        enemy.pos = createVector(1000, 1000);
        system.update();

        expect(player.shieldsDisabled).toBe(false);
        expect(enemy.shieldsDisabled).toBe(false);
    });

    test('Storm (Radiation) should damage entities', () => {
        const storm = new CosmicStorm(0, 0, 200, 'radiation');
        system.cosmicStorms = [storm];

        // Mock random to force damage (p < 0.05)
        const originalRandom = global.random;
        global.random = () => 0.001;

        system.update();
        expect(player.takeDamage).toHaveBeenCalled();
        expect(enemy.takeDamage).toHaveBeenCalled();

        global.random = originalRandom;
    });

    test('Storm (Gravitational) should apply force', () => {
        const storm = new CosmicStorm(0, 0, 200, 'gravitational');
        system.cosmicStorms = [storm];

        // Offset to ensure pull vector exists
        player.pos = createVector(100, 0);
        enemy.pos = createVector(100, 0);
        player.vel = createVector(0, 0);
        enemy.vel = createVector(0, 0);

        system.update();

        // Should be pulled towards 0,0 (negative x velocity)
        expect(player.vel.x).toBeLessThan(0);
        expect(enemy.vel.x).toBeLessThan(0);
    });

    // --- OVERLAP & CLEANSING TESTS ---

    test('Multiple Overlapping Effects should persist if one remains', () => {
        const ionStorm = new CosmicStorm(0, 0, 200, 'ion');
        const empStorm = new CosmicStorm(300, 0, 200, 'electromagnetic');

        system.cosmicStorms = [ionStorm, empStorm];

        // 1. Position at (150, 0) - Inside BOTH
        player.pos = createVector(150, 0);
        enemy.pos = createVector(150, 0);

        system.update();
        expect(player.shieldsDisabled).toBe(true);
        expect(player.weaponsDisabled).toBe(true);

        // 2. Move to (400, 0) - Inside EMP only, Outside Ion
        player.pos = createVector(400, 0);
        enemy.pos = createVector(400, 0);

        system.update();
        expect(player.shieldsDisabled).toBe(false); // Should reset
        expect(player.weaponsDisabled).toBe(true);  // Should persist
    });
});
