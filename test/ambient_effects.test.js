// --- Global Mocks Setup ---
// These must be defined BEFORE requiring game modules

global.createVector = (x, y) => ({
    x: x || 0,
    y: y || 0,
    set: function (x, y) {
        if (typeof x === 'object') {
            this.x = x.x;
            this.y = x.y;
        } else {
            this.x = x || 0;
            this.y = y || 0;
        }
        return this;
    },
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
global.map = (val, start1, stop1, start2, stop2) => {
    return start2 + (stop2 - start2) * ((val - start1) / (stop1 - start1));
};
global.floor = Math.floor;
global.PI = Math.PI;
global.HALF_PI = Math.PI / 2;
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

let mockTime = 1000;
global.millis = () => mockTime;

global.width = 1920;
global.height = 1080;

// Config mockup
global.STARFIELD_CONFIG = {
    WORKER_ENABLED: false,
    BACKGROUND_COLOR: { r: 10, g: 15, b: 40 },
    TILE_SIZE: 768,
    MAX_TILES_PER_FRAME: 3,
    MAX_CACHED_TILES: 64,
    CLEANUP_INTERVAL_MS: 5000,
    AMBIENT_EFFECTS: {
        HAIL: {
            particleCount: 5, // Keep it small for tests
            baseSpeed: 0.15,
            speedScale: 0.85,
            minDepth: 0.1,
            maxDepth: 1.0,
            minSize: 0.6,
            maxSize: 3.5,
            collisionRadiusMultiplier: 1.3,
            minOpacity: 35,
            maxOpacity: 190,
            sparkDuration: 250,
            sparkMaxRadius: 15,
            colors: [[255, 255, 255]]
        },
        EVENTS: {
            spawnChancePerFrame: 0.1, // High chance for testing
            types: {
                comet: 1.0
            }
        }
    }
};

global.SPAWN_CONFIG = { SPAWN_INTERVAL_MS: 5000, FIXED_LARGE_DESPAWN_RADIUS: 5000 };
global.JUMP_ZONE_CONFIG = { DEFAULT_RADIUS: 1000 };
global.SHIP_DEFINITIONS = {
    "Sidewinder": {
        baseHull: 100,
        baseShield: 100,
        size: 10,
        aiRoles: ["PIRATE"],
        baseMaxSpeed: 10,
        baseThrust: 10,
        baseTurnRate: 0.1
    }
};

// Stubs
global.Planet = class Planet { };
global.Station = class Station { };
global.SpaceObject = class SpaceObject { };
global.Asteroid = class Asteroid { };
global.Explosion = class Explosion { };
global.Harpoon = class Harpoon { };
global.Cargo = class Cargo { };
global.Mine = class Mine { };
global.Projectile = class Projectile { };
global.Beam = class Beam { };
global.ForceWave = class ForceWave { };
global.SpatialHash = class SpatialHash {
    constructor() { }
    clear() { }
    insertAll() { }
};

// Require modules
const { StarSystem, AmbientCosmicEvent, MicroAsteroidHail } = require('../starSystem');

describe('Ambient Environmental Effects and Micro-Asteroids', () => {
    let system;
    let mockPlayer;

    beforeEach(() => {
        mockTime = 1000;
        system = new StarSystem("Test System");
        
        mockPlayer = {
            pos: global.createVector(0, 0),
            vel: global.createVector(0, 0),
            shield: 100,
            maxShield: 100,
            size: 30,
            shieldsDisabled: false
        };
        system.player = mockPlayer;
    });

    test('StarSystem initializes environmental effects container properties', () => {
        expect(system.ambientBackgroundEvents).toBeDefined();
        expect(Array.isArray(system.ambientBackgroundEvents)).toBe(true);
        expect(system.microAsteroidHail).toBeInstanceOf(MicroAsteroidHail);
    });

    test('MicroAsteroidHail initializes particles with configuration values', () => {
        const hail = system.microAsteroidHail;
        expect(hail.particles.length).toBe(global.STARFIELD_CONFIG.AMBIENT_EFFECTS.HAIL.particleCount);
        
        const p = hail.particles[0];
        expect(p.depth).toBeGreaterThanOrEqual(0.1);
        expect(p.depth).toBeLessThanOrEqual(1.0);
        expect(p.size).toBeGreaterThanOrEqual(0.6);
        expect(p.size).toBeLessThanOrEqual(3.5);
    });

    test('MicroAsteroid particles update position and wrap boundaries', () => {
        const hail = system.microAsteroidHail;
        const initialP = { ...hail.particles[0] };
        
        // Mock player moving fast
        mockPlayer.vel = global.createVector(10, 5);
        hail.update();
        
        const updatedP = hail.particles[0];
        // If it did not wrap, its position should change based on player velocity and depth
        if (updatedP.depth === initialP.depth && updatedP.color === initialP.color) {
            expect(updatedP.relX).not.toBe(initialP.relX);
            expect(updatedP.relY).not.toBe(initialP.relY);
        }
    });

    test('MicroAsteroid triggers shield spark when colliding with active shields', () => {
        const hail = system.microAsteroidHail;
        
        // Clean out existing particles and create one close to collision point
        hail.particles = [];
        hail.particles.push({
            relX: 10, // Close to player center (0,0)
            relY: 0,
            size: 3,
            opacity: 180,
            depth: 0.9, // Close foreground depth (collidable)
            color: [255, 255, 255],
            driftVx: 0,
            driftVy: 0,
            rotation: 0,
            rotSpeed: 0
        });

        expect(hail.sparks.length).toBe(0);
        
        hail.update();
        
        // It should have collided, triggered a spark, and respawned the particle
        expect(hail.sparks.length).toBe(1);
        expect(hail.sparks[0].isShield).toBe(true); // Hit shield
        expect(hail.sparks[0].color).toEqual([100, 200, 255]); // Cyan
    });

    test('MicroAsteroid triggers hull spark when colliding with depleted shields', () => {
        const hail = system.microAsteroidHail;
        mockPlayer.shield = 0; // Depleted shield
        
        hail.particles = [];
        hail.particles.push({
            relX: 10,
            relY: 0,
            size: 3,
            opacity: 180,
            depth: 0.9,
            color: [255, 255, 255],
            driftVx: 0,
            driftVy: 0,
            rotation: 0,
            rotSpeed: 0
        });

        hail.update();
        
        expect(hail.sparks.length).toBe(1);
        expect(hail.sparks[0].isShield).toBe(false); // Hit hull
        expect(hail.sparks[0].color).toEqual([255, 140, 50]); // Orange
    });

    test('AmbientCosmicEvent updates active status and ends when duration expires', () => {
        const event = new AmbientCosmicEvent('supernova', 100, 100);
        expect(event.active).toBe(true);
        expect(event.duration).toBe(6000);

        // Progress time past duration
        mockTime += 7000;
        event.update(0, 0);
        
        expect(event.active).toBe(false);
    });

    test('AmbientCosmicEvent applies parallax positioning when player moves', () => {
        const event = new AmbientCosmicEvent('comet', 100, 100);
        const originalX = event.x;
        
        // Mock player moving
        event.update(10, 0);
        
        // Position X should shift by parallax factor * player velocity
        expect(event.x).not.toBe(originalX);
        const expectedShift = -10 * (1 - 1.03); // playerVelX * (1 - parallax) = -10 * -0.03 = 0.3
        expect(event.x).toBeCloseTo(originalX + expectedShift);
    });
});
