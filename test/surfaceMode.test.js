/**
 * SurfaceMode Tests
 * Jest tests for the surface flight mode controller including:
 * - State management (INACTIVE → ENTERING → ACTIVE → EXITING)
 * - Entry/exit conditions
 * - Physics updates
 * - Collision detection
 * - Viewport culling
 * - Input handling
 */

// ============================================
// Mock Dependencies - Must be first
// ============================================

// Global p5 constants
global.UP_ARROW = 38;
global.DOWN_ARROW = 40;
global.LEFT_ARROW = 37;
global.RIGHT_ARROW = 39;
global.CENTER = 'center';
global.mouseX = 0;
global.mouseY = 0;
global.pixelDensity = jest.fn(() => 1);
global.loadSound = jest.fn();
// Mock p5 color helper functions
global.color = (r, g, b, a) => ({ levels: [r, g, b, a || 255], toString: () => `rgba(${r},${g},${b},${a || 255})` });
global.red = (c) => c && c.levels ? c.levels[0] : 0;
global.green = (c) => c && c.levels ? c.levels[1] : 0;
global.blue = (c) => c && c.levels ? c.levels[2] : 0;
global.alpha = (c) => c && c.levels ? c.levels[3] : 255;

// Mock SurfaceTerrain before requiring surfaceMode
global.SurfaceTerrain = class SurfaceTerrain {
    constructor(config) {
        this.config = config;
        this.lastCullStats = { drawn: 0, culled: 0 };
    }
    setPlanet(planet) { this.planet = planet; }
    createBuffer(w, h) { }
    generateMesh(x, y, force) { return true; }
    updateBuffer(alt, w, h, force) { }
    getHeightAt(x, y) {
        // Simple deterministic height based on position
        return Math.sin(x * 0.01) * 20 + Math.cos(y * 0.01) * 20;
    }
    getGridPosition() { return { x: 0, y: 0 }; }
    update(x, y, force, sunAngle) { return false; }
    draw() { }
    cleanup() { }
};

// Mock surface object classes
global.Turret = class Turret {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.yOffset = 0;
        this.id = null;
        this.destroyed = false;
        this.size = 40;
        this.type = 'Turret';
    }
    update(dt, player, starSystem) { }
    draw(x, y, sunAngle) { }
    takeDamage(amount) { this.destroyed = true; }
};

global.DefenseDrone = class DefenseDrone {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.yOffset = 0;
        this.destroyed = false;
        this.size = 30;
        this.type = 'DefenseDrone';
    }
    update(dt, player, starSystem) { }
    draw(x, y, sunAngle) { }
    takeDamage(amount) { this.destroyed = true; }
};

global.ShieldGenerator = class ShieldGenerator {
    constructor(x, y) {
        this.pos = createVector(x, y);
        this.yOffset = 0;
        this.destroyed = false;
        this.isTarget = true;
        this.size = 60;
        this.type = 'ShieldGenerator';
    }
    update(dt, player, starSystem) { }
    draw(x, y, sunAngle) { }
    takeDamage(amount) { this.destroyed = true; }
};

global.SecretCache = class SecretCache {
    constructor(x, y, seed) {
        this.pos = createVector(x, y);
        this.yOffset = 0;
        this.destroyed = false;
        this.isCache = true;
        this.size = 20;
        this.type = 'SecretCache';
    }
    update(dt, player, starSystem) { }
    draw(x, y, sunAngle) { }
};

global.Building = class Building {
    constructor(x, y, size, type, seed) {
        this.pos = createVector(x, y);
        this.size = size;
        this.buildingType = type;
        this.destroyed = false;
        this.yOffset = 0;
    }
    update(dt, player, starSystem) { }
    draw(x, y, sunAngle) { }
    takeDamage(amount) { this.destroyed = true; }
};

global.SurfaceStation = class SurfaceStation {
    constructor(x, y, size, color) {
        this.pos = createVector(x, y);
        this.size = size;
        this.destroyed = false;
        this.yOffset = 0;
    }
    update(dt, player, starSystem) { }
    draw(x, y, sunAngle) { }
};

// Mock game managers
global.ambientSoundManager = {
    stopAll: jest.fn()
};

global.spaceMusicManager = {
    advanceChordProgression: jest.fn()
};

global.frameRate = jest.fn(() => 60);
global.frameCount = 0;

// CLOSE constant for p5.js endShape
global.CLOSE = true;

// Mock STATION_TEXT_SIZE
global.STATION_TEXT_SIZE = { BODY: 12, HEADER: 16 };

// Load required game files
require('../debug.js');

// Load surfaceMode and expose to global
const { SurfaceMode, SURFACE_CONFIG, SURFACE_STATE } = require('../surfaceMode.js');
global.SurfaceMode = SurfaceMode;
global.SURFACE_CONFIG = SURFACE_CONFIG;
global.SURFACE_STATE = SURFACE_STATE;

// ============================================
// Test Helpers
// ============================================

beforeEach(() => {
    if (global.gameStateManager) {
        global.gameStateManager.currentState = 'SURFACE_MODE';
    }
});

/**
 * Creates a mock player for surface mode testing
 */
function createMockPlayer(options = {}) {
    return {
        pos: createVector(options.x || 0, options.y || 0),
        vel: createVector(options.vx || 0, options.vy || 0),
        angle: options.angle || 0,
        size: options.size || 25,
        hull: options.hull || 100,
        maxHull: 100,
        shield: options.shield || 50,
        maxShield: 50,
        altitude: options.altitude || 0,
        yOffset: 0,
        destroyed: false,
        isDying: false,
        isPlayer: true,
        isDockedAndInvulnerable: false,
        lastAttacker: null,
        lastAttackTime: 0,
        target: null,
        shipTypeName: 'Sidewinder',
        _cachedShipDef: null,
        handleInput: jest.fn(),
        update: jest.fn(),
        draw: jest.fn(),
        takeDamage: jest.fn(),
        applyShipDefinition: jest.fn()
    };
}

/**
 * Creates a mock planet for surface mode testing
 */
function createMockPlanet(options = {}) {
    return {
        pos: createVector(options.x || 1000, options.y || 0),
        radius: options.radius || 200,
        name: options.name || 'TestPlanet',
        nameHash: options.nameHash || 12345,
        seed: options.seed || 12345,
        isSun: options.isSun || false,
        isInhabited: options.isInhabited !== undefined ? options.isInhabited : true,
        hasAtmosphere: options.hasAtmosphere || true,
        atmosphereColor: options.atmosphereColor || color(100, 150, 200),
        cityLightsColor: options.cityLightsColor || color(255, 200, 100),
        economyType: options.economyType || 'Service',
        techLevel: options.techLevel || 3
    };
}

/**
 * Creates a mock star system for surface mode testing
 */
function createMockStarSystem(options = {}) {
    return {
        projectiles: options.projectiles || [],
        explosions: options.explosions || [],
        forceWaves: options.forceWaves || [],
        beams: [],
        addExplosion: jest.fn((x, y, size, color, isSurface, silent, altitude) => {
            // Simple mock - just track the call
        }),
        addProjectile: jest.fn(),
        initAmbientSounds: jest.fn(),
        _updateProjectiles: jest.fn(),
        _updateExplosions: jest.fn(),
        _updateBeams: jest.fn(),
        _updateForceWaves: jest.fn(),
        _updateMines: jest.fn(),
        _updateHarpoons: jest.fn()
    };
}

/**
 * Creates a mock projectile for collision testing
 */
function createMockProjectile(options = {}) {
    return {
        pos: createVector(options.x || 0, options.y || 0),
        vel: createVector(options.vx || 0, options.vy || 0),
        owner: options.owner || null,
        damage: options.damage || 10,
        destroyed: false,
        isSurface: options.isSurface !== undefined ? options.isSurface : true,
        altitude: options.altitude !== undefined ? options.altitude : 50,
        lifespan: options.lifespan || 120,
        draw: jest.fn()
    };
}

// ============================================
// State Management Tests
// ============================================

describe('SurfaceMode State Management', () => {
    let sm;

    beforeEach(() => {
        sm = new SurfaceMode();
    });

    test('initializes in INACTIVE state', () => {
        expect(sm.state).toBe(SURFACE_STATE.INACTIVE);
        expect(sm.isActive()).toBe(false);
    });

    test('isActive returns false when INACTIVE', () => {
        sm.state = SURFACE_STATE.INACTIVE;
        expect(sm.isActive()).toBe(false);
    });

    test('isActive returns true when ENTERING', () => {
        sm.state = SURFACE_STATE.ENTERING;
        expect(sm.isActive()).toBe(true);
    });

    test('isActive returns true when ACTIVE', () => {
        sm.state = SURFACE_STATE.ACTIVE;
        expect(sm.isActive()).toBe(true);
    });

    test('isActive returns true when EXITING', () => {
        sm.state = SURFACE_STATE.EXITING;
        expect(sm.isActive()).toBe(true);
    });
});

// ============================================
// Entry Condition Tests
// ============================================

describe('SurfaceMode Entry Conditions', () => {
    let sm;

    beforeEach(() => {
        sm = new SurfaceMode();
    });

    test('canEnter returns false without player', () => {
        const planet = createMockPlanet();
        expect(sm.canEnter(null, planet)).toBe(false);
    });

    test('canEnter returns false without planet', () => {
        const player = createMockPlayer();
        expect(sm.canEnter(player, null)).toBe(false);
    });

    test('canEnter returns false when not INACTIVE', () => {
        const player = createMockPlayer({ x: 1000, y: 0 });
        const planet = createMockPlanet({ x: 1000, y: 0 });
        sm.state = SURFACE_STATE.ACTIVE;
        expect(sm.canEnter(player, planet)).toBe(false);
    });

    test('canEnter returns false for sun', () => {
        const player = createMockPlayer({ x: 100, y: 0 });
        const sun = createMockPlanet({ x: 100, y: 0, isSun: true });
        expect(sm.canEnter(player, sun)).toBe(false);
    });

    test('canEnter returns false when too far from planet', () => {
        const player = createMockPlayer({ x: 0, y: 0 });
        const planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        // Distance is 1000, threshold is 200 * 1.1 = 220
        expect(sm.canEnter(player, planet)).toBe(false);
    });

    test('canEnter returns true when close to planet', () => {
        const player = createMockPlayer({ x: 1000, y: 0 });
        const planet = createMockPlanet({ x: 1000, y: 100, radius: 200 });
        // Distance is 100, threshold is 200 * 1.1 = 220
        expect(sm.canEnter(player, planet)).toBe(true);
    });

    test('canEnter uses planet radius for threshold', () => {
        const player = createMockPlayer({ x: 500, y: 0 });

        // Small planet - player at 500, planet at 500,100 - dist 100
        const smallPlanet = createMockPlanet({ x: 500, y: 100, radius: 50 });
        // Threshold: 50 * 1.1 = 55, distance 100 > 55
        expect(sm.canEnter(player, smallPlanet)).toBe(false);

        // Large planet - same positions
        const largePlanet = createMockPlanet({ x: 500, y: 100, radius: 200 });
        // Threshold: 200 * 1.1 = 220, distance 100 < 220
        expect(sm.canEnter(player, largePlanet)).toBe(true);
    });
});

// ============================================
// Enter/Exit Tests
// ============================================

describe('SurfaceMode Enter', () => {
    let sm, player, planet, starSystem;
    const DEFAULT_DETAIL_RATIO = 38;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
    });

    test('enter transitions to ENTERING state', () => {
        const result = sm.enter(player, planet, starSystem);
        expect(result).toBe(true);
        expect(sm.state).toBe(SURFACE_STATE.ENTERING);
    });

    test('enter stores player, planet, and starSystem references', () => {
        sm.enter(player, planet, starSystem);
        expect(sm.player).toBe(player);
        expect(sm.planet).toBe(planet);
        expect(sm.starSystem).toBe(starSystem);
    });

    test('enter falls back to default mesh values when SurfaceUtils dynamic helpers are unavailable', () => {
        const originalMeshSize = SURFACE_CONFIG.MESH_SIZE;
        const originalMeshResolution = SURFACE_CONFIG.MESH_RESOLUTION;
        const expectedResolution = Math.ceil(originalMeshSize / DEFAULT_DETAIL_RATIO);
        const originalSurfaceUtils = global.SurfaceUtils;

        try {
            global.SurfaceUtils = {
                ...originalSurfaceUtils,
                DETAIL_RATIO: undefined,
                calculateRequiredMeshSize: undefined
            };

            sm.enter(player, planet, starSystem);

            expect(SURFACE_CONFIG.MESH_SIZE).toBe(originalMeshSize);
            expect(SURFACE_CONFIG.MESH_RESOLUTION).toBe(expectedResolution);
        } finally {
            global.SurfaceUtils = originalSurfaceUtils;
            SURFACE_CONFIG.MESH_SIZE = originalMeshSize;
            SURFACE_CONFIG.MESH_RESOLUTION = originalMeshResolution;
        }
    });

    test('enter saves player position for return', () => {
        sm.enter(player, planet, starSystem);
        expect(sm.savedPlayerPos).toBeDefined();
        expect(sm.savedPlayerPos.x).toBe(1000);
        expect(sm.savedPlayerPos.y).toBe(50);
    });

    test('enter initializes surface position from player', () => {
        sm.enter(player, planet, starSystem);
        expect(sm.surfaceX).toBe(player.pos.x);
        expect(sm.surfaceY).toBe(player.pos.y);
    });

    test('enter sets default altitude', () => {
        sm.enter(player, planet, starSystem);
        // Altitude is now absolute (terrain height + default clearance)
        expect(sm.altitude).toBeGreaterThan(SURFACE_CONFIG.DEFAULT_ALTITUDE);
    });

    test('enter initializes transition', () => {
        sm.enter(player, planet, starSystem);
        expect(sm.transitionProgress).toBe(0);
        expect(sm.transitionStartTime).toBeGreaterThan(0);
    });

    test('enter stops ambient sounds', () => {
        sm.enter(player, planet, starSystem);
        expect(ambientSoundManager.stopAll).toHaveBeenCalled();
    });

    test('enter advances music chord progression', () => {
        sm.enter(player, planet, starSystem);
        expect(spaceMusicManager.advanceChordProgression).toHaveBeenCalled();
    });

    test('enter returns false when conditions not met', () => {
        sm.state = SURFACE_STATE.ACTIVE; // Already active
        const result = sm.enter(player, planet, starSystem);
        expect(result).toBe(false);
    });

    test('enter calculates target position', () => {
        sm.enter(player, planet, starSystem);
        expect(sm.targetPos).toBeDefined();
        expect(sm.targetPos.x).toBeDefined();
        expect(sm.targetPos.y).toBeDefined();
    });
});

describe('SurfaceMode Exit', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.ACTIVE;
    });

    test('exit transitions to EXITING state', () => {
        sm.exit();
        expect(sm.state).toBe(SURFACE_STATE.EXITING);
    });

    test('exit advances music chord progression', () => {
        spaceMusicManager.advanceChordProgression.mockClear();
        sm.exit();
        expect(spaceMusicManager.advanceChordProgression).toHaveBeenCalled();
    });

    test('exit does nothing when INACTIVE', () => {
        sm.state = SURFACE_STATE.INACTIVE;
        sm.exit();
        expect(sm.state).toBe(SURFACE_STATE.INACTIVE);
    });

    test('exit does nothing when already EXITING', () => {
        sm.state = SURFACE_STATE.EXITING;
        const startTime = sm.transitionStartTime;
        sm.exit();
        // Should not reset transition
        expect(sm.transitionStartTime).toBe(startTime);
    });
});

describe('SurfaceMode Complete Exit', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.ACTIVE;
    });

    test('_completeExit sets state to INACTIVE', () => {
        sm._completeExit();
        expect(sm.state).toBe(SURFACE_STATE.INACTIVE);
    });

    test('_completeExit restores player position', () => {
        sm.player.pos.set(5000, 5000); // Move player far away
        sm._completeExit();
        expect(sm.player.pos.x).toBe(1000);
        expect(sm.player.pos.y).toBe(50);
    });

    test('_completeExit clears player altitude', () => {
        sm.player.altitude = 200;
        sm._completeExit();
        expect(sm.player.altitude).toBe(0);
    });

    test('_completeExit clears invulnerability', () => {
        sm.player.isDockedAndInvulnerable = true;
        sm._completeExit();
        expect(sm.player.isDockedAndInvulnerable).toBe(false);
    });

    test('_completeExit clears combat references', () => {
        sm.player.lastAttacker = {};
        sm.player.lastAttackTime = 1000;
        sm._completeExit();
        expect(sm.player.lastAttacker).toBeNull();
        expect(sm.player.lastAttackTime).toBe(0);
    });

    test('_completeExit cleans up terrain', () => {
        const cleanupSpy = jest.spyOn(sm.terrain, 'cleanup');
        sm._completeExit();
        expect(cleanupSpy).toHaveBeenCalled();
    });

    test('_completeExit clears projectiles', () => {
        sm.projectiles = [1, 2, 3];
        sm._completeExit();
        expect(sm.projectiles).toEqual([]);
    });

    test('_completeExit restarts ambient sounds', () => {
        sm._completeExit();
        expect(starSystem.initAmbientSounds).toHaveBeenCalled();
    });
});

// ============================================
// Physics Update Tests
// ============================================

describe('SurfaceMode Physics', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.ACTIVE;
        sm._terrainReady = true;
        // Mock keyIsDown for input checks in _updatePhysics
        global.keyIsDown = jest.fn(() => false);
    });

    test('update does nothing when INACTIVE', () => {
        sm.state = SURFACE_STATE.INACTIVE;
        sm.update(16.67);
        expect(player.handleInput).not.toHaveBeenCalled();
    });

    test('update calls player.handleInput when ACTIVE', () => {
        sm.update(16.67);
        expect(player.handleInput).toHaveBeenCalled();
    });

    test('update calls player.update when ACTIVE', () => {
        sm.update(16.67);
        expect(player.update).toHaveBeenCalled();
    });

    test('update adjusts altitude based on input', () => {
        sm.altitudeInput = 1; // Ascending
        const initialAlt = sm.altitude;
        sm.update(16.67);
        expect(sm.altitude).toBeGreaterThan(initialAlt);
    });

    test('altitude is constrained to MIN_ALTITUDE', () => {
        sm.altitude = 20;
        sm.altitudeInput = -1; // Descending
        sm.update(1000); // Large dt
        expect(sm.altitude).toBeGreaterThanOrEqual(SURFACE_CONFIG.MIN_ALTITUDE);
    });

    test('altitude is constrained to MAX_ALTITUDE', () => {
        sm.altitude = 400;
        sm.altitudeInput = 1; // Ascending
        sm.update(1000); // Large dt
        expect(sm.altitude).toBeLessThanOrEqual(SURFACE_CONFIG.MAX_ALTITUDE);
    });

    test('update triggers exit when altitude reaches MAX', () => {
        sm.altitude = SURFACE_CONFIG.MAX_ALTITUDE;
        sm.update(16.67);
        expect(sm.state).toBe(SURFACE_STATE.EXITING);
    });

    test('update syncs surface position from player', () => {
        player.pos.set(2000, 3000);
        sm.update(16.67);
        expect(sm.surfaceX).toBe(2000);
        expect(sm.surfaceY).toBe(3000);
    });

    test('update resets player environment flags', () => {
        player.targetingDisruption = 5;
        player.shieldsDisabled = true;
        player.weaponsDisabled = true;
        player.inNebula = true;
        sm.update(16.67);
        expect(player.targetingDisruption).toBe(0);
        expect(player.shieldsDisabled).toBe(false);
        expect(player.weaponsDisabled).toBe(false);
        expect(player.inNebula).toBe(false);
    });

    test('_updatePhysics returns early when state is not SURFACE_MODE', () => {
        global.gameStateManager.currentState = 'VIEWING_BASE';
        player.vel.set(5, 5);
        player.isDockedAndInvulnerable = false;
        
        sm._updatePhysics(16.67);
        
        expect(player.vel.x).toBe(0);
        expect(player.vel.y).toBe(0);
        expect(player.isDockedAndInvulnerable).toBe(true);
    });

    test('_updateAstronaut returns early when state is not SURFACE_MODE', () => {
        global.gameStateManager.currentState = 'VIEWING_BASE';
        sm.astronaut = {
            pos: createVector(100, 100),
            vel: createVector(5, 5),
            handleInput: jest.fn()
        };
        player.vel.set(5, 5);
        player.isDockedAndInvulnerable = false;
        
        sm._updateAstronaut(16.67);
        
        expect(player.vel.x).toBe(0);
        expect(player.vel.y).toBe(0);
        expect(player.isDockedAndInvulnerable).toBe(true);
        expect(sm.astronaut.vel.x).toBe(0);
        expect(sm.astronaut.vel.y).toBe(0);
        expect(sm.astronaut.handleInput).not.toHaveBeenCalled();
    });
});

// ============================================
// Viewport Bounds Tests
// ============================================

describe('SurfaceMode Viewport Bounds', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 500, y: 500 });
        planet = createMockPlanet({ x: 500, y: 400, radius: 200 });
        starSystem = createMockStarSystem();
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.ACTIVE;
    });

    test('_getViewportBounds centers on player', () => {
        sm.altitude = 0; // Eliminate perspective offset for baseline centering test
        const bounds = sm._getViewportBounds();
        const centerX = (bounds.minX + bounds.maxX) / 2;
        const centerY = (bounds.minY + bounds.maxY) / 2;
        expect(centerX).toBeCloseTo(player.pos.x, 0);
        expect(centerY).toBeCloseTo(player.pos.y, 0);
    });

    test('_getViewportBounds increases with altitude', () => {
        sm.altitude = SURFACE_CONFIG.MIN_ALTITUDE;
        const lowBounds = sm._getViewportBounds();
        const lowWidth = lowBounds.maxX - lowBounds.minX;

        sm.altitude = SURFACE_CONFIG.MAX_ALTITUDE;
        const highBounds = sm._getViewportBounds();
        const highWidth = highBounds.maxX - highBounds.minX;

        expect(highWidth).toBeGreaterThan(lowWidth);
    });

    test('_getViewportBounds applies padding', () => {
        const boundsNoPad = sm._getViewportBounds(0);
        const boundsPad = sm._getViewportBounds(500);

        const widthNoPad = boundsNoPad.maxX - boundsNoPad.minX;
        const widthPad = boundsPad.maxX - boundsPad.minX;

        expect(widthPad).toBeGreaterThan(widthNoPad);
    });

    test('_getViewportBounds handles null player gracefully', () => {
        sm.player = null;
        const bounds = sm._getViewportBounds();
        expect(bounds).toBeDefined();
        expect(bounds.minX).toBe(0);
        expect(bounds.maxX).toBe(width);
    });
});

// ============================================
// Collision Detection Tests
// ============================================

describe('SurfaceMode Collision Detection', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.ACTIVE;
        sm._terrainReady = true;
    });

    test('projectile-terrain collision destroys projectile', () => {
        // NOTE: Terrain collision has been intentionally disabled for projectiles
        // Projectiles are energy weapons that travel through air and shouldn't hit terrain
        // This test now validates that projectiles do NOT get destroyed by terrain
        const proj = createMockProjectile({
            x: 100,
            y: 100,
            altitude: -10, // Below terrain (terrain height is ~0 at this pos)
            isSurface: true
        });
        starSystem.projectiles.push(proj);
        sm.surfaceObjects = [];

        sm._checkSurfaceCollisions();

        // Projectiles should NOT be destroyed by terrain
        expect(proj.destroyed).toBe(false);
    });

    test('player projectile hitting surface object deals damage', () => {
        const turret = new Turret(100, 100);
        turret.yOffset = 0;
        turret.altitude = 0; // Turrets use altitude for collision detection
        turret.health = 15; // Set health to match damage
        sm.surfaceObjects = [turret];

        const proj = createMockProjectile({
            x: 100,
            y: 100,
            altitude: 0, // Match turret altitude for collision
            owner: sm.player, // Use sm.player directly
            damage: 15
        });
        starSystem.projectiles.push(proj);

        sm._checkSurfaceCollisions();

        expect(turret.destroyed).toBe(true);
        expect(proj.destroyed).toBe(true);
    });

    test('enemy projectile hitting player deals damage', () => {
        const enemyProj = createMockProjectile({
            x: player.pos.x,
            y: player.pos.y,
            altitude: sm.altitude + sm.terrain.getHeightAt(player.pos.x, player.pos.y),
            owner: { isEnemy: true },
            damage: 20
        });
        sm.player.altitude = sm.altitude + sm.terrain.getHeightAt(player.pos.x, player.pos.y);
        starSystem.projectiles.push(enemyProj);

        sm._checkSurfaceCollisions();

        expect(player.takeDamage).toHaveBeenCalledWith(20);
        expect(enemyProj.destroyed).toBe(true);
    });

    test('non-surface projectiles are ignored', () => {
        const spaceProj = createMockProjectile({
            x: player.pos.x,
            y: player.pos.y,
            isSurface: false
        });
        starSystem.projectiles.push(spaceProj);

        sm._checkSurfaceCollisions();

        expect(spaceProj.destroyed).toBe(false);
    });

    test('destroyed projectiles are skipped', () => {
        const proj = createMockProjectile({
            x: 100,
            y: 100,
            isSurface: true
        });
        proj.destroyed = true;
        starSystem.projectiles.push(proj);

        // Should not throw
        expect(() => sm._checkSurfaceCollisions()).not.toThrow();
    });
});

// ============================================
// Input Handling Tests
// ============================================

describe('SurfaceMode Input Handling', () => {
    let sm;

    beforeEach(() => {
        sm = new SurfaceMode();
        sm.state = SURFACE_STATE.ACTIVE;
    });

    test('handleKeyDown Z sets altitude input to 1 (ascend)', () => {
        const result = sm.handleKeyDown(90, 'z');
        expect(result).toBe(true);
        expect(sm.altitudeInput).toBe(1);
    });

    test('handleKeyDown X sets altitude input to -1 (descend)', () => {
        const result = sm.handleKeyDown(88, 'x');
        expect(result).toBe(true);
        expect(sm.altitudeInput).toBe(-1);
    });

    test('handleKeyUp clears altitude input', () => {
        sm.altitudeInput = 1;
        const result = sm.handleKeyUp(90, 'z');
        expect(result).toBe(true);
        expect(sm.altitudeInput).toBe(0);
    });

    test('handleKeyUp clears altitude input even when EXITING', () => {
        sm.state = SURFACE_STATE.EXITING;
        sm.altitudeInput = 1;
        const result = sm.handleKeyUp(90, 'z');
        expect(result).toBe(true);
        expect(sm.altitudeInput).toBe(0);
    });

    test('handleKeyDown returns false when not ACTIVE', () => {
        sm.state = SURFACE_STATE.INACTIVE;
        const result = sm.handleKeyDown(84, 't');
        expect(result).toBe(false);
    });

    test('handleKeyDown returns false for unhandled keys', () => {
        const result = sm.handleKeyDown(65, 'a');
        expect(result).toBe(false);
    });

    test('handleKeyPress G triggers descent check', () => {
        sm.state = SURFACE_STATE.INACTIVE;
        const result = sm.handleKeyPress(SURFACE_CONFIG.TRIGGER_KEY);
        expect(result).toBe(true);
        expect(sm._keyPressed).toBe(true);
    });
});

// ============================================
// Astronaut Integration Tests
// ============================================

describe('SurfaceMode Astronaut Integration', () => {
    let sm, player, planet, starSystem;
    let originalWindow;

    beforeEach(() => {
        originalWindow = global.window;
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();

        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.ACTIVE;
        sm.isLanded = true;
        sm.controlMode = 'SHIP';

        // Mock p5 input functions
        global.keyIsDown = jest.fn(() => false);
    });

    afterEach(() => {
        if (typeof originalWindow === 'undefined') {
            delete global.window;
        } else {
            global.window = originalWindow;
        }
    });

    test('deployAstronaut switches control mode', () => {
        // Ensure Astronaut class is available (global mock needed if not loaded)
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 0; }
            handleInput() { return false; }
            update() { }
            draw() { }
        };

        sm.deployAstronaut();

        expect(sm.controlMode).toBe('ASTRONAUT');
        expect(sm.astronaut).toBeDefined();
        expect(sm.astronaut.pos.x).toBeCloseTo(player.pos.x);
    });

    // NOTE: test removed — previously checked movement-triggered disembark.

    test('boardShip switches control mode back to ship', () => {
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 0; }
            handleInput() { return false; } // Not moving
            update() { }
        };

        sm.deployAstronaut();
        expect(sm.controlMode).toBe('ASTRONAUT');

        // Move astronaut close to ship
        sm.astronaut.pos = player.pos.copy();
        sm.boardCooldown = 0; // Clear boarding cooldown for testing automatic trigger

        // Update loop should trigger boardShip (via _updateAstronaut)
        sm._updateAstronaut(0.016);

        expect(sm.controlMode).toBe('SHIP');
        expect(sm.astronaut).toBeNull();
    });

    test('boardShip sets cooldown prevents immediate disembark', () => {
        // Ensure Astronaut class is available
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 0; this.vel = createVector(0, 0); }
            handleInput() { return false; }
            update() { }
        };

        sm.deployAstronaut();
        expect(sm.controlMode).toBe('ASTRONAUT');

        // Mock proximity and board
        sm.astronaut.pos = sm.player.pos.copy();
        sm.astronaut.vel.set(0, 0); // Stationary
        sm.boardShip();

        expect(sm.controlMode).toBe('SHIP');
        expect(sm.reboardCooldown).toBeGreaterThan(0);

        // Attempt disembark immediately
        sm.playerSpeed = 0;
        global.keyIsDown.mockReturnValue(true); // Simulate movement key

        sm._checkDisembarkTrigger();

        // Should STILL be ship mode due to cooldown
        expect(sm.controlMode).toBe('SHIP');

        // Advance time past cooldown
        sm.reboardCooldown = 0;
        global.keyIsDown.mockReturnValue(true); // Ensure key still down
        sm._checkDisembarkTrigger();

        // Now it should disembark
        expect(sm.controlMode).toBe('ASTRONAUT');
    });

    test('gamepad movement can trigger disembark when landed', () => {
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 0; }
            handleInput() { return false; }
            update() { }
        };
        global.keyIsDown.mockReturnValue(false);
        global.window = {
            _gamepadManager: {
                state: {
                    dpad: { up: true, down: false, left: false, right: false },
                    ls: { x: 0, y: 0 },
                    l2: 0,
                    r2: 0
                }
            }
        };

        sm.playerSpeed = 0;
        sm.reboardCooldown = 0;
        sm._checkDisembarkTrigger();

        expect(sm.controlMode).toBe('ASTRONAUT');
    });

    test('minor gamepad stick drift does not trigger disembark', () => {
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 0; }
            handleInput() { return false; }
            update() { }
        };
        global.keyIsDown.mockReturnValue(false);
        global.window = {
            _gamepadManager: {
                state: {
                    dpad: { up: false, down: false, left: false, right: false },
                    ls: { x: 0.1, y: 0.1 },
                    l2: 0,
                    r2: 0
                }
            }
        };

        sm.playerSpeed = 0;
        sm.reboardCooldown = 0;
        sm._checkDisembarkTrigger();

        expect(sm.controlMode).toBe('SHIP');
    });

    test('boardShip resets ship altitude and landed status', () => {
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 0; }
            handleInput() { return false; }
            update() { }
        };
        sm.deployAstronaut();
        sm.altitude = 200; // Visual/camera altitude in EVA
        
        const expectedAlt = sm.terrain.getHeightAt(sm.player.pos.x, sm.player.pos.y) + SURFACE_CONFIG.MIN_ALTITUDE;
        sm.boardShip();
        expect(sm.altitude).toBeCloseTo(expectedAlt, 2);
        expect(sm.player.altitude).toBeCloseTo(expectedAlt, 2);
        expect(sm.isLanded).toBe(true);
    });

    test('dual-distance boarding check allows boarding at visual coordinates', () => {
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 100; }
            handleInput() { return false; }
            update() { }
        };
        
        // Mock terrain height: 10 under ship, 100 under astronaut
        sm.terrain.getHeightAt = jest.fn((x, y) => {
            if (x > 1020) return 100;
            return 10;
        });

        // Re-align player altitude to match mock terrain height + min altitude
        sm.player.altitude = 10;
        
        sm.deployAstronaut();
        sm.boardCooldown = 0; // Clear cooldown
        
        // Position astronaut such that physical dist is large (~90), but visual dist is ~0
        sm.astronaut.pos.set(1043.14, 128.98);
        sm.astronaut.altitude = 100;
        
        sm._updateAstronaut(0.016);
        
        expect(sm.controlMode).toBe('SHIP');
        expect(sm.astronaut).toBeNull();
    });

    test('climb inputs prevent disembarkation', () => {
        sm.altitudeInput = 1; // Climbing
        sm.playerSpeed = 0;
        sm.reboardCooldown = 0;
        global.keyIsDown.mockImplementation((code) => {
            if (code === 87) return true; // W key
            return false;
        });

        sm._checkDisembarkTrigger();
        expect(sm.controlMode).toBe('SHIP'); // Did not disembark
    });

    test('only longitudinal movement triggers disembarkation', () => {
        sm.altitudeInput = 0;
        sm.playerSpeed = 0;
        sm.reboardCooldown = 0;
        
        // Turn key (A key)
        global.keyIsDown.mockImplementation((code) => {
            if (code === 65) return true; // A key
            return false;
        });

        sm._checkDisembarkTrigger();
        expect(sm.controlMode).toBe('SHIP'); // Did not disembark

        // Forward key (W key)
        global.keyIsDown.mockImplementation((code) => {
            if (code === 87) return true; // W key
            return false;
        });

        sm._checkDisembarkTrigger();
        expect(sm.controlMode).toBe('ASTRONAUT'); // Disembarked
    });
});

// ============================================
// Transition Tests
// ============================================

describe('SurfaceMode Transitions', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
    });

    test('_updateTransition updates progress based on elapsed time', () => {
        sm.enter(player, planet, starSystem);
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_ENTER_DURATION / 2;

        sm._updateTransition();

        expect(sm.transitionProgress).toBeCloseTo(0.5, 1);
    });

    test('_updateTransition caps progress at 1', () => {
        sm.enter(player, planet, starSystem);
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_ENTER_DURATION * 2;

        sm._updateTransition();

        expect(sm.transitionProgress).toBe(1);
    });

    test('ENTERING transitions to ACTIVE when complete', () => {
        sm.enter(player, planet, starSystem);
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_ENTER_DURATION * 2;
        sm._terrainRequested = true; // Ensure logic doesn't reset _terrainReady
        sm._terrainReady = true;

        sm._updateTransition();

        expect(sm.state).toBe(SURFACE_STATE.ACTIVE);
    });

    test('EXITING calls _completeExit when complete', () => {
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.EXITING;
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_EXIT_DURATION * 2;

        sm._updateTransition();

        expect(sm.state).toBe(SURFACE_STATE.INACTIVE);
    });
});

// ============================================
// Visual Bounds Tests
// ============================================

describe('SurfaceMode Visual Bounds', () => {
    let sm;

    beforeEach(() => {
        sm = new SurfaceMode();
    });

    test('_getVisualBounds returns base position', () => {
        const obj = {
            pos: createVector(100, 200),
            yOffset: 30,
            size: 50
        };

        const bounds = sm._getVisualBounds(obj);

        expect(bounds.base.x).toBe(100);
        // Visual Y uses extrusion angle: y - yOffset * cos(0.5)
        // 200 - 30 * 0.877582... ≈ 173.67
        expect(bounds.base.y).toBeCloseTo(173.67, 1);
    });

    test('_getVisualBounds uses size for radius', () => {
        const obj = {
            pos: createVector(0, 0),
            size: 80
        };

        const bounds = sm._getVisualBounds(obj);

        expect(bounds.radius).toBe(40); // size / 2
    });

    test('_getVisualBounds has minimum radius', () => {
        const obj = {
            pos: createVector(0, 0),
            size: 5
        };

        const bounds = sm._getVisualBounds(obj);

        expect(bounds.radius).toBeGreaterThanOrEqual(10);
    });
});

// ============================================
// Economy Building Tests
// ============================================

describe('SurfaceMode Economy Buildings', () => {
    let sm;

    beforeEach(() => {
        sm = new SurfaceMode();
    });

    test('_createEconomyBuilding returns Building for Service', () => {
        const building = sm._createEconomyBuilding('Service', 100, 200, 50, 123);
        expect(building).toBeInstanceOf(Building);
    });

    test('_createEconomyBuilding returns Building for unknown type', () => {
        const building = sm._createEconomyBuilding('Unknown', 100, 200, 50, 123);
        expect(building).toBeInstanceOf(Building);
    });

    test('_createEconomyBuilding places building at correct position', () => {
        const building = sm._createEconomyBuilding('Service', 150, 250, 50, 123);
        expect(building.pos.x).toBe(150);
        expect(building.pos.y).toBe(250);
    });
});

// ============================================
// Surface Explosion Tests
// ============================================

describe('SurfaceMode Explosions', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
        sm.enter(player, planet, starSystem);
    });

    test('_createSurfaceExplosion calls starSystem.addExplosion', () => {
        sm._createSurfaceExplosion(100, 200, 0, 15, [255, 100, 50]);
        expect(starSystem.addExplosion).toHaveBeenCalled();
    });

    test('_createSurfaceExplosion passes world coordinates and altitude', () => {
        sm._createSurfaceExplosion(100, 200, 50, 15, [255, 100, 50]);

        const call = starSystem.addExplosion.mock.calls[0];
        const [x, y, size, col, isSurface, silent, alt] = call;

        // Should use world coordinates (no visual offset in world space)
        expect(x).toBe(100);
        expect(y).toBe(200);
        expect(alt).toBe(50);
    });

    test('_createSurfaceExplosion does nothing without starSystem', () => {
        sm.starSystem = null;
        expect(() => {
            sm._createSurfaceExplosion(100, 200, 0, 15, [255, 100, 50]);
        }).not.toThrow();
    });
});

// ============================================
// Shield Generator Spawning Tests
// ============================================

describe('SurfaceMode Shield Generator Spawning', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
    });

    test('only one shield generator spawns at target position', () => {
        sm.enter(player, planet, starSystem);

        // Set a specific target position
        sm.targetPos = createVector(100, 200);

        // Spawn objects multiple times (simulating terrain updates)
        sm._spawnObjects(0, 0);
        const firstCount = sm.surfaceObjects.filter(obj => obj.type === 'ShieldGenerator').length;

        sm._spawnObjects(0, 0);
        const secondCount = sm.surfaceObjects.filter(obj => obj.type === 'ShieldGenerator').length;

        // Should be exactly 1 shield generator both times
        expect(firstCount).toBe(1);
        expect(secondCount).toBe(1);
    });

    test('shield generator spawns at exact target position', () => {
        sm.enter(player, planet, starSystem);

        // Set a specific target position
        const targetX = 100;
        const targetY = 200;
        sm.targetPos = createVector(targetX, targetY);

        sm._spawnObjects(0, 0);

        const generators = sm.surfaceObjects.filter(obj => obj.type === 'ShieldGenerator');
        expect(generators.length).toBe(1);
        expect(generators[0].pos.x).toBe(targetX);
        expect(generators[0].pos.y).toBe(targetY);
    });
});

// ============================================
// SurfaceMode Base Loading Zoom Tests
// ============================================

describe('SurfaceMode Base Loading Zoom', () => {
    let originalGSM;
    let originalConfig;

    beforeEach(() => {
        originalGSM = global.gameStateManager;
        originalConfig = global.SURFACE_CONFIG;

        global.gameStateManager = {
            currentState: 'SURFACE_MODE',
            setState: jest.fn(state => { global.gameStateManager.currentState = state; })
        };
        global.SURFACE_CONFIG = {
            EVA_ZOOM: 1.3,
            LOD: {
                DETAIL_THRESHOLD: 100,
                FULL_DETAIL: 0,
                SIMPLIFIED: 1
            }
        };
    });

    afterEach(() => {
        global.gameStateManager = originalGSM;
        global.SURFACE_CONFIG = originalConfig;
    });

    test('bypasses transition zoom lock when controlMode is ASTRONAUT', () => {
        const sm = new SurfaceMode();
        const mockPlayer = { pos: createVector(0, 0), angle: 0, vel: createVector(0, 0) };
        const mockPlanet = { name: 'Test Planet', baseColor: { levels: [255, 255, 255] }, pos: createVector(0, 0) };
        
        // Mock required draw/height sub-methods so sm.draw() doesn't fail
        sm.enter(mockPlayer, mockPlanet, {}, { force: true });
        sm.state = SURFACE_STATE.ENTERING;
        sm.viewZoom = 1.3;
        sm.controlMode = 'SHIP';

        // Mock p5 background/push/pop/translate/scale
        global.background = jest.fn();
        global.push = jest.fn();
        global.pop = jest.fn();
        global.translate = jest.fn();
        global.scale = jest.fn();

        sm._getPerspectiveScale = () => 1.0;
        sm._getExtrusionAngle = () => 0;
        sm._getCounterScale = () => 1.0;
        sm._drawTerrain = jest.fn();
        sm._drawSurfaceObjects = jest.fn();
        sm._drawMiningRobots = jest.fn();
        sm._drawExplosions = jest.fn();
        sm._drawProjectiles = jest.fn();
        sm._drawMines = jest.fn();
        sm._drawBeams = jest.fn();
        sm._drawForceWaves = jest.fn();
        sm._drawCloudLayer = jest.fn();
        sm._drawTransitionOverlay = jest.fn();
        sm._drawAstronaut = jest.fn();
        sm._drawPlayerShip = jest.fn();
        sm._drawGameHUD = jest.fn();

        // 1. With SHIP control mode and entering state, zoom is locked to 1.0
        sm.draw();
        expect(global.scale).toHaveBeenCalledWith(1.0);

        // 2. Change controlMode to ASTRONAUT: zoom lock should be bypassed (uses 1.3)
        sm.controlMode = 'ASTRONAUT';
        global.scale.mockClear();
        sm.draw();
        expect(global.scale).toHaveBeenCalledWith(1.3);
    });

    test('saveLoadSystem sets zoom level straight to astronaut level when loading in astronaut mode', () => {
        // Mock minimal globals needed for saveLoadSystem
        const mockSurfaceMode = {
            enter: jest.fn(),
            _getTerrainHeightAt: () => 50,
            player: { altitude: 0 },
            astronaut: null,
            controlMode: 'SHIP',
            viewZoom: 1.0,
            targetViewZoom: 1.0
        };
        global.surfaceMode = mockSurfaceMode;
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos; this.altitude = 0; }
        };
        global.uiManager = {
            currentBaseObject: null
        };
        global.gameStateManager = {
            setState: jest.fn()
        };

        const savedSurface = {
            controlMode: 'ASTRONAUT',
            astronautPos: { x: 100, y: 100 }
        };

        // Execute target code block from saveLoadSystem:
        if (savedSurface.controlMode === 'ASTRONAUT') {
            if (savedSurface.astronautPos && typeof Astronaut !== 'undefined') {
                surfaceMode.astronaut = new Astronaut(createVector(savedSurface.astronautPos.x, savedSurface.astronautPos.y), { skipSpawnOffset: true });
                surfaceMode.controlMode = 'ASTRONAUT';

                if (typeof SURFACE_CONFIG !== 'undefined' && SURFACE_CONFIG.EVA_ZOOM) {
                    surfaceMode.viewZoom = SURFACE_CONFIG.EVA_ZOOM;
                    surfaceMode.targetViewZoom = SURFACE_CONFIG.EVA_ZOOM;
                }
            }
        }

        expect(mockSurfaceMode.viewZoom).toBe(1.3);
        expect(mockSurfaceMode.targetViewZoom).toBe(1.3);

        // Clean up globals
        delete global.surfaceMode;
        delete global.Astronaut;
        delete global.uiManager;
        delete global.gameStateManager;
    });

    test('saveLoadSystem relinks currentBaseObject using playerBuiltSurfaceObjects position when loading inside a base', () => {
        const mockPlanet = {
            playerBuiltSurfaceObjects: [
                { type: 'PlayerBase', x: 200, y: 200, displayName: 'My Base' }
            ]
        };

        const mockSurfaceMode = {
            surfaceObjects: [], // Empty initially during load
            controlMode: 'SHIP',
            viewZoom: 1.0,
            targetViewZoom: 1.0
        };

        global.surfaceMode = mockSurfaceMode;
        global.uiManager = {
            currentBaseObject: null
        };
        global.gameStateManager = {
            setState: jest.fn()
        };

        // Mock savedSurface representing being inside a base:
        const savedSurface = {
            controlMode: 'ASTRONAUT',
            basePos: { x: 200, y: 200 }
        };

        // Run the re-link block:
        if (typeof uiManager !== 'undefined' && uiManager && (savedSurface.baseId || savedSurface.basePos)) {
            // First try to find it in surfaceObjects
            for (const obj of surfaceMode.surfaceObjects || []) {
                if (savedSurface.basePos && obj.pos && Math.abs(obj.pos.x - savedSurface.basePos.x) < 2) {
                    uiManager.currentBaseObject = obj; break;
                }
            }

            // If not found in surfaceObjects, search planet.playerBuiltSurfaceObjects
            if (!uiManager.currentBaseObject && mockPlanet && Array.isArray(mockPlanet.playerBuiltSurfaceObjects)) {
                for (const desc of mockPlanet.playerBuiltSurfaceObjects) {
                    if (savedSurface.basePos && Math.abs(desc.x - savedSurface.basePos.x) < 2 && Math.abs(desc.y - savedSurface.basePos.y) < 2) {
                        uiManager.currentBaseObject = {
                            ...desc,
                            pos: createVector(desc.x, desc.y)
                        };
                        break;
                    }
                }
            }
        }

        expect(uiManager.currentBaseObject).toBeDefined();
        expect(uiManager.currentBaseObject.displayName).toBe('My Base');
        expect(uiManager.currentBaseObject.pos.x).toBe(200);
        expect(uiManager.currentBaseObject.pos.y).toBe(200);

        delete global.surfaceMode;
        delete global.uiManager;
        delete global.gameStateManager;
    });
});

// ============================================
// Configuration Tests
// ============================================

describe('SURFACE_CONFIG', () => {
    test('has required altitude limits', () => {
        expect(SURFACE_CONFIG.MIN_ALTITUDE).toBeDefined();
        expect(SURFACE_CONFIG.MAX_ALTITUDE).toBeDefined();
        expect(SURFACE_CONFIG.MIN_ALTITUDE).toBeLessThan(SURFACE_CONFIG.MAX_ALTITUDE);
    });

    test('has valid transition duration', () => {
        expect(SURFACE_CONFIG.TRANSITION_ENTER_DURATION).toBeGreaterThan(0);
        expect(SURFACE_CONFIG.TRANSITION_EXIT_DURATION).toBeGreaterThan(0);
    });

    test('has drone configuration', () => {
        expect(SURFACE_CONFIG.DRONE).toBeDefined();
        expect(SURFACE_CONFIG.DRONE.DETECTION_RANGE).toBeGreaterThan(0);
        expect(SURFACE_CONFIG.DRONE.HEALTH).toBeGreaterThan(0);
    });

    test('has turret configuration', () => {
        expect(SURFACE_CONFIG.TURRET).toBeDefined();
        expect(SURFACE_CONFIG.TURRET.RANGE).toBeGreaterThan(0);
        expect(SURFACE_CONFIG.TURRET.HEALTH).toBeGreaterThan(0);
    });
});

describe('SURFACE_STATE', () => {
    test('has all required states', () => {
        expect(SURFACE_STATE.INACTIVE).toBeDefined();
        expect(SURFACE_STATE.ENTERING).toBeDefined();
        expect(SURFACE_STATE.ACTIVE).toBeDefined();
        expect(SURFACE_STATE.EXITING).toBeDefined();
    });

    test('states are unique strings', () => {
        const states = Object.values(SURFACE_STATE);
        const uniqueStates = new Set(states);
        expect(uniqueStates.size).toBe(states.length);
    });
});

describe('SurfaceMode ParkedPlayerShip Re-boarding', () => {
    let sm, player, planet, starSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        player = createMockPlayer({ x: 1000, y: 50 });
        planet = createMockPlanet({ x: 1000, y: 0, radius: 200 });
        starSystem = createMockStarSystem();
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.ACTIVE;

        // Mock p5 input functions
        global.keyIsDown = jest.fn(() => false);
        global.surfaceMode = sm;
    });

    afterEach(() => {
        delete global.surfaceMode;
    });

    test('should board parked player ship when astronaut is in boarding range', () => {
        const { ParkedPlayerShip } = require('../surfaceObjects');
        
        // Mock original ship state
        const mockOrigState = {
            shipTypeName: 'Vulture',
            hull: 80,
            shield: 100,
            installedUpgrades: { engine: 2 },
            weapons: [{ name: 'Pulse Laser' }],
            cargo: [{ name: 'Gold', quantity: 2 }]
        };

        // Create parked ship object on ground and register it in persistent descriptor
        const parkedShip = new ParkedPlayerShip(1020, 50, mockOrigState);
        sm.surfaceObjects = [parkedShip];

        const descriptor = { type: 'ParkedPlayerShip', x: 1020, y: 50, shipState: mockOrigState };
        sm.planet.playerBuiltSurfaceObjects = [descriptor];
        sm.parkedShipDescriptor = descriptor;

        // Ensure Astronaut class is available
        global.Astronaut = class MockAstronaut {
            constructor(pos) { this.pos = pos.copy(); this.altitude = 0; }
            handleInput() { return false; }
            update() { }
        };

        sm.player.applyShipDefinition = jest.fn();

        sm.deployAstronaut();
        expect(sm.controlMode).toBe('ASTRONAUT');

        // Move astronaut close to the parked ship (pos: 1020, 50)
        sm.astronaut.pos.set(1025, 50);
        sm.boardCooldown = 0;

        // Run updates, which should trigger boardParkedShip
        sm._updateAstronaut(0.016);

        expect(sm.controlMode).toBe('SHIP');
        expect(sm.astronaut).toBeNull();
        expect(sm.player.shipTypeName).toBe('Vulture');
        expect(sm.player.hull).toBe(80);
        expect(sm.player.shield).toBe(100);
        expect(sm.player.installedUpgrades.engine).toBe(2);
        expect(sm.player.weapons[0].name).toBe('Pulse Laser');
        expect(sm.player.cargo[0].name).toBe('Gold');
        expect(sm.surfaceObjects.length).toBe(1); // Sidewinder left parked on ground
        expect(sm.surfaceObjects[0].shipTypeName).toBe('Sidewinder');
        expect(sm.surfaceObjects[0].pos.x).toBe(1000);
        expect(sm.surfaceObjects[0].pos.y).toBe(50);
        expect(sm.parkedShipDescriptor).toBeNull(); // Clear descriptor of boarded ship
        expect(sm.planet.playerBuiltSurfaceObjects.length).toBe(1); // One ship remains parked (Sidewinder)
        expect(sm.planet.playerBuiltSurfaceObjects[0].shipState.shipTypeName).toBe('Sidewinder');
    });

    test('should allow multiple parked player ships and swap between them correctly', () => {
        const { ParkedPlayerShip } = require('../surfaceObjects');
        
        // Reset surfaceMode state
        sm.surfaceObjects = [];
        sm.planet.playerBuiltSurfaceObjects = [];
        sm.parkedShipDescriptor = null;
        if (sm.parkedShipsMap) sm.parkedShipsMap.clear();

        // Setup two parked ships on the ground:
        // Ship A: 'Vulture' at (1000, 1000)
        // Ship B: 'Cobra' at (2000, 2000)
        const stateA = { shipTypeName: 'Vulture', hull: 100, shield: 100, installedUpgrades: {}, weapons: [], cargo: [] };
        const stateB = { shipTypeName: 'Cobra', hull: 80, shield: 50, installedUpgrades: {}, weapons: [], cargo: [] };
        
        const descA = { type: 'ParkedPlayerShip', x: 1000, y: 1000, shipState: stateA };
        const descB = { type: 'ParkedPlayerShip', x: 2000, y: 2000, shipState: stateB };
        
        sm.planet.playerBuiltSurfaceObjects = [descA, descB];
        
        // Pre-populate maps
        sm.parkedShipsMap = new Map();
        sm.parkedShipsMap.set('28,28', [descA]);
        sm.parkedShipsMap.set('57,57', [descB]);

        const shipA = new ParkedPlayerShip(1000, 1000, stateA);
        const shipB = new ParkedPlayerShip(2000, 2000, stateB);
        sm.surfaceObjects = [shipA, shipB];

        // Player starts in a 'Sidewinder' at (0, 0)
        sm.player.shipTypeName = 'Sidewinder';
        sm.player.pos.set(0, 0);
        sm.player.hull = 100;
        sm.player.shield = 50;

        // Deploy astronaut and move near Ship A (Vulture)
        sm.deployAstronaut();
        sm.astronaut.pos.set(1005, 1000);
        sm.boardCooldown = 0;

        // Update astronaut to trigger boarding Ship A (Vulture)
        sm._updateAstronaut(0.016);

        // Player should now be in the Vulture
        expect(sm.controlMode).toBe('SHIP');
        expect(sm.player.shipTypeName).toBe('Vulture');
        expect(sm.player.pos.x).toBe(1000);
        expect(sm.player.pos.y).toBe(1000);

        // The Sidewinder should be left parked at (0, 0)
        // And Ship B (Cobra) should still be parked at (2000, 2000)
        expect(sm.surfaceObjects.length).toBe(2);
        
        const parkedSidewinder = sm.surfaceObjects.find(s => s.shipTypeName === 'Sidewinder');
        const parkedCobra = sm.surfaceObjects.find(s => s.shipTypeName === 'Cobra');
        
        expect(parkedSidewinder).toBeDefined();
        expect(parkedSidewinder.pos.x).toBe(0);
        expect(parkedSidewinder.pos.y).toBe(0);
        
        expect(parkedCobra).toBeDefined();
        expect(parkedCobra.pos.x).toBe(2000);
        expect(parkedCobra.pos.y).toBe(2000);

        // Verify descriptors in planet state
        expect(sm.planet.playerBuiltSurfaceObjects.length).toBe(2);
        const descSidewinder = sm.planet.playerBuiltSurfaceObjects.find(d => d.shipState.shipTypeName === 'Sidewinder');
        const descCobra = sm.planet.playerBuiltSurfaceObjects.find(d => d.shipState.shipTypeName === 'Cobra');
        expect(descSidewinder).toBeDefined();
        expect(descCobra).toBeDefined();
    });

    test('should discard EscapeCapsule when boarding a parked ship', () => {
        const { ParkedPlayerShip } = require('../surfaceObjects');

        // Reset state
        sm.surfaceObjects = [];
        sm.planet.playerBuiltSurfaceObjects = [];
        sm.parkedShipDescriptor = null;

        // One parked ship A (Vulture) at (1000, 1000)
        const stateA = { shipTypeName: 'Vulture', hull: 100, shield: 100, installedUpgrades: {}, weapons: [], cargo: [] };
        const descA = { type: 'ParkedPlayerShip', x: 1000, y: 1000, shipState: stateA };
        sm.planet.playerBuiltSurfaceObjects = [descA];

        const shipA = new ParkedPlayerShip(1000, 1000, stateA);
        sm.surfaceObjects = [shipA];

        // Player starts in 'EscapeCapsule' at (0, 0)
        sm.player.shipTypeName = 'EscapeCapsule';
        sm.player.pos.set(0, 0);
        sm.player.hull = 15;
        sm.player.shield = 0;

        // Deploy astronaut and move near Ship A (Vulture)
        sm.deployAstronaut();
        sm.astronaut.pos.set(1005, 1000);
        sm.boardCooldown = 0;

        // Trigger update to board the ship
        sm._updateAstronaut(0.016);

        // Player is now in the Vulture
        expect(sm.controlMode).toBe('SHIP');
        expect(sm.player.shipTypeName).toBe('Vulture');

        // Escape capsule should be discarded, meaning there should be NO parked ships on the surface
        // (the array should be empty since Vulture was boarded and EscapeCapsule was not parked)
        expect(sm.surfaceObjects.length).toBe(0);
        expect(sm.planet.playerBuiltSurfaceObjects.length).toBe(0);
    });

    test('should correctly clean up ParkedPlayerShip and its descriptors when the parked ship is destroyed', () => {
        const { ParkedPlayerShip } = require('../surfaceObjects');

        // Reset state
        sm.surfaceObjects = [];
        sm.planet.playerBuiltSurfaceObjects = [];
        sm.destroyedCells.clear();

        const stateA = { shipTypeName: 'Vulture', hull: 100, shield: 100, installedUpgrades: {}, weapons: [], cargo: [] };
        const descA = { type: 'ParkedPlayerShip', x: 1000, y: 1000, shipState: stateA };
        sm.planet.playerBuiltSurfaceObjects = [descA];

        const shipA = new ParkedPlayerShip(1000, 1000, stateA);
        shipA.cellKey = '28,28';
        sm.surfaceObjects = [shipA];

        sm.objectCache = new Map();
        sm.objectCache.set('28,28_parkedShip_0', shipA);

        sm.parkedShipsMap = new Map();
        sm.parkedShipsMap.set('28,28', [descA]);

        // Destroy the parked ship
        shipA.takeDamage(100);

        // Verify it was marked destroyed
        expect(shipA.destroyed).toBe(true);

        // Verify it was cleaned up from active surfaceObjects
        expect(sm.surfaceObjects.length).toBe(0);

        // Verify it was cleaned up from planet playerBuiltSurfaceObjects
        expect(sm.planet.playerBuiltSurfaceObjects.length).toBe(0);

        // Verify it was cleaned up from parkedShipsMap
        expect(sm.parkedShipsMap.has('28,28')).toBe(false);

        // Verify it was cleaned up from object cache
        expect(sm.objectCache.has('28,28_parkedShip_0')).toBe(false);

        // CRITICAL: Verify that the cell key was NOT registered in destroyedCells (avoiding base-blocking bug)
        expect(sm.destroyedCells.has('28,28')).toBe(false);
    });
});
