const { CosmicStorm } = require('../cosmicStorm');
global.CosmicStorm = CosmicStorm;

// Global mocks needed before StarSystem load
global.SHIP_DEFINITIONS = {
    "Sidewinder": { aiRoles: ["PIRATE"] },
    "Krait": { aiRoles: ["PIRATE"] }
};
global.STARFIELD_CONFIG = { WORKER_ENABLED: false };
global.SPAWN_CONFIG = { SPAWN_INTERVAL_MS: 5000, FIXED_LARGE_DESPAWN_RADIUS: 5000 };
global.JUMP_ZONE_CONFIG = { DEFAULT_RADIUS: 1000 };
global.width = 1000;
global.height = 1000;
global.AI_STATE = { GUARDING: 'GUARDING' };
global.WEAPON_UPGRADES = [
    { name: "Pulse Laser", type: "laser" }
];

const { StarSystem } = require('../starSystem');
const Player = require('../player');
const { Enemy } = require('../enemy');

// Mocks
global.createVector = (x, y) => {
    const vec = {
        x, y,
        set: function(nx, ny) { this.x = nx; this.y = ny; return this; },
        add: function(other) { this.x += other.x; this.y += other.y; return this; },
        sub: function(other) { this.x -= other.x; this.y -= other.y; return this; },
        mult: function(n) { this.x *= n; this.y *= n; return this; },
        rotate: function(angle) {
            const cosA = Math.cos(angle);
            const sinA = Math.sin(angle);
            const nx = this.x * cosA - this.y * sinA;
            const ny = this.x * sinA + this.y * cosA;
            this.x = nx;
            this.y = ny;
            return this;
        },
        heading: () => 0,
        normalize: function () { return this; },
        copy: function () {
            return global.createVector(this.x, this.y);
        }
    };
    return vec;
};
global.random = () => 0.5;
global.floor = Math.floor;
global.PI = Math.PI;
global.TWO_PI = Math.PI * 2;
global.cos = Math.cos;
global.sin = Math.sin;
global.sqrt = Math.sqrt;
global.max = Math.max;
global.min = Math.min;
global.abs = Math.abs;
global.lerp = (a, b, t) => a + (b - a) * t;
global.map = (v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a));
global.millis = () => 1000;
global.p5 = {
    Vector: {
        random2D: () => ({ x: 0.1, y: 0.1, mult: function (s) { this.x *= s; this.y *= s; return this; } }),
        dist: (v1, v2) => Math.sqrt(Math.pow(v2.x - v1.x, 2) + Math.pow(v2.y - v1.y, 2)),
        sub: (v1, v2) => ({ x: v1.x - v2.x, y: v1.y - v2.y, normalize: function () { return this; }, mult: function () { return this; } })
    }
};

// Additional Class Mocks for StarSystem deserialization
global.Planet = class Planet { static fromJSON(d) { return d; } };
global.Station = class Station { static fromJSON(d) { return d; } };
global.Nebula = class Nebula { static fromJSON(d) { return d; } };
global.SpaceObject = class SpaceObject { };
global.Asteroid = class Asteroid { static fromJSON(d) { return d; } };
global.Explosion = class Explosion { static fromJSON(d) { return d; } };
global.Harpoon = class Harpoon { static fromJSON(d) { return d; } };
global.Cargo = class Cargo { static fromJSON(d) { return d; } };
global.Mine = class Mine { static fromJSON(d) { return d; } };
const { Projectile } = require('../projectile');
global.Projectile = Projectile;

describe('CosmicStorm Serialization', () => {
    let system;
    let player;
    let enemy;

    beforeEach(() => {
        player = new Player("Sidewinder");
        player.id = "player";
        player.pos = createVector(0, 0);

        system = new StarSystem("Test System");
        system.player = player;

        enemy = new Enemy(100, 100, player, "Krait", "PIRATE");
        enemy.id = "enemy_1";
        system.enemies.push(enemy);
    });

    test('should serialize and deserialize a basic storm', () => {
        const storm = new CosmicStorm(200, 200, 150, 'radiation');
        system.cosmicStorms.push(storm);

        const json = system.toJSON();
        const restoredSystem = StarSystem.fromJSON(json);

        expect(restoredSystem.cosmicStorms).toHaveLength(1);
        const restoredStorm = restoredSystem.cosmicStorms[0];

        expect(restoredStorm).toBeInstanceOf(CosmicStorm);
        expect(restoredStorm.type).toBe('radiation');
        expect(restoredStorm.pos.x).toBe(200);
        expect(restoredStorm.radius).toBe(150);
    });

    test('should preserve weapon properties and references', () => {
        const storm = new CosmicStorm(300, 300, 100, 'ion');
        storm.isWeaponSpawned = true;
        storm.owner = player;
        storm.attachedTo = enemy;

        system.cosmicStorms.push(storm);

        const json = system.toJSON();

        // Deserialize
        const restoredSystem = StarSystem.fromJSON(json);

        // Setup relinking context
        restoredSystem.player = player;
        restoredSystem.enemies = [enemy]; // Manually restore enemy reference for id lookup/relink test if strict serialization didn't happen (but fromJSON restores enemies too)

        // Actually, fromJSON restores enemies, so we should rely on that, but we need to ensure IDs match.
        // In this test environment, reusing the 'enemy' object might be tricky if IDs are generated randomly.
        // Let's force the ID on the restored enemy to match for the test sake if needed, 
        // BUT StarSystem.fromJSON restores enemies from data, so they will have the same IDs as serialized.

        // Call relink
        restoredSystem.relinkReferences(player);

        const restoredStorm = restoredSystem.cosmicStorms[0];

        expect(restoredStorm.isWeaponSpawned).toBe(true);
        expect(restoredStorm.owner).toBeDefined();
        // In the test mock environment, reference equality might differ if player was re-created or just passed in.
        // relinkReferences passes 'player' (our original object).
        expect(restoredStorm.owner).toBe(player);

        expect(restoredStorm.attachedTo).toBeDefined();
        // the attachedTo should be the restored enemy
        const restoredEnemy = restoredSystem.enemies.find(e => e.id === enemy.id);
        expect(restoredStorm.attachedTo).toBe(restoredEnemy);
    });

    test('should rehydrate asteroid and cargo vectors from legacy string coordinates', () => {
        const json = system.toJSON();
        json.asteroids = [{ pos: { x: '120', y: '-45' }, vel: { x: '1.5', y: '0' } }];
        json.cargo = [{ pos: { x: '10', y: '20' }, vel: { x: '0', y: '0' }, type: 'Food', quantity: 1 }];

        const restoredSystem = StarSystem.fromJSON(json);

        expect(typeof restoredSystem.asteroids[0].pos.add).toBe('function');
        expect(typeof restoredSystem.cargo[0].pos.add).toBe('function');
        expect(restoredSystem.asteroids[0].pos.x).toBe(120);
        expect(restoredSystem.cargo[0].pos.y).toBe(20);
    });

    test('should handle dissipating storm time-independent serialization', () => {
        const storm = new CosmicStorm(100, 100, 200, 'gravitational');
        storm.dissipating = true;
        storm.dissipateStart = 500; // millis was 500 when it started
        storm.intensity = 0.5;
        storm.dissipateStartIntensity = 0.8;
        storm.maxParticles = 15;

        // Mock current millis
        global.millis = () => 1000; // 500 ms has elapsed since dissipation started

        const serialized = storm.toJSON();
        expect(serialized.dissipateElapsed).toBe(500);
        expect(serialized.dissipateStartIntensity).toBe(0.8);
        expect(serialized.maxParticles).toBe(15);

        // Deserializing in a new session where millis() is, say, 2000
        global.millis = () => 2000;
        const restored = CosmicStorm.fromJSON(serialized);

        expect(restored.dissipating).toBe(true);
        expect(restored.dissipateStart).toBe(1500); // 2000 - 500 = 1500
        expect(restored.dissipateStartIntensity).toBe(0.8);
        expect(restored.maxParticles).toBe(15);
    });

    test('should validate and sanitize corrupt or legacy storm values safely', () => {
        const corruptData = {
            pos: { x: 'NaN', y: undefined },
            radius: 'invalid',
            effectRadius: NaN,
            visualRadius: null,
            intensity: '1.5',
            velocity: { x: 'abc', y: 0 }
        };

        const restored = CosmicStorm.fromJSON(corruptData);
        expect(restored).not.toBeNull();
        expect(restored.pos.x).toBe(0);
        expect(restored.pos.y).toBe(0);
        expect(restored.radius).toBe(100); // Fallback
        expect(restored.effectRadius).toBe(100); // Re-derived from radius
        expect(restored.visualRadius).toBe(143); // Re-derived from radius * 1.43
        expect(restored.intensity).toBe(1.5); // Parsed correctly
        expect(restored.velocity.x).toBe(0);
    });

    test('should serialize and deserialize projectile stormConfig and relink its owner', () => {
        player.currentWeapon = null;
        const proj = new Projectile(100, 100, 0, player, 5, 0, [255, 255, 255], 'storm');
        proj.stormConfig = {
            type: 'electromagnetic',
            radius: 120,
            duration: 5000,
            owner: player
        };
        proj._isStorm = true;
        system.projectiles.push(proj);

        const json = system.toJSON();
        const restoredSystem = StarSystem.fromJSON(json);
        restoredSystem.player = player;
        restoredSystem.enemies = [enemy];
        restoredSystem.relinkReferences(player);

        expect(restoredSystem.projectiles).toHaveLength(1);
        const restoredProj = restoredSystem.projectiles[0];
        expect(restoredProj.type).toBe('storm');
        expect(restoredProj._isStorm).toBe(true);
        expect(restoredProj.stormConfig).toBeDefined();
        expect(restoredProj.stormConfig.radius).toBe(120);
        expect(restoredProj.stormConfig.owner).toBe(player);
    });
});
