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
global.createVector = (x, y) => ({ x, y, add: () => { }, sub: () => { }, mult: () => { }, normalize: () => { }, copy: function () { return { x: this.x, y: this.y }; } });
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
global.Projectile = class Projectile { static fromJSON(d) { return d; } };

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
});
