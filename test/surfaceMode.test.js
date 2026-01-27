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
        takeDamage: jest.fn()
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
        addExplosion: jest.fn((x, y, size, color, isSurface) => {
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
        altitude: options.altitude || 50,
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
        expect(sm.altitude).toBe(SURFACE_CONFIG.DEFAULT_ALTITUDE);
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
        const bounds = sm._getViewportBounds();
        const centerX = (bounds.left + bounds.right) / 2;
        const centerY = (bounds.top + bounds.bottom) / 2;
        expect(centerX).toBeCloseTo(player.pos.x, 0);
        expect(centerY).toBeCloseTo(player.pos.y, 0);
    });

    test('_getViewportBounds increases with altitude', () => {
        sm.altitude = SURFACE_CONFIG.MIN_ALTITUDE;
        const lowBounds = sm._getViewportBounds();
        const lowWidth = lowBounds.right - lowBounds.left;

        sm.altitude = SURFACE_CONFIG.MAX_ALTITUDE;
        const highBounds = sm._getViewportBounds();
        const highWidth = highBounds.right - highBounds.left;

        expect(highWidth).toBeGreaterThan(lowWidth);
    });

    test('_getViewportBounds applies padding', () => {
        const boundsNoPad = sm._getViewportBounds(0);
        const boundsPad = sm._getViewportBounds(500);

        const widthNoPad = boundsNoPad.right - boundsNoPad.left;
        const widthPad = boundsPad.right - boundsPad.left;

        expect(widthPad).toBeGreaterThan(widthNoPad);
    });

    test('_getViewportBounds handles null player gracefully', () => {
        sm.player = null;
        const bounds = sm._getViewportBounds();
        expect(bounds).toBeDefined();
        expect(bounds.left).toBe(0);
        expect(bounds.right).toBe(width);
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
        const proj = createMockProjectile({
            x: 100,
            y: 100,
            altitude: -10, // Below terrain (terrain height is ~0 at this pos)
            isSurface: true
        });
        starSystem.projectiles.push(proj);
        sm.surfaceObjects = [];

        sm._checkSurfaceCollisions();

        expect(proj.destroyed).toBe(true);
    });

    test('player projectile hitting surface object deals damage', () => {
        const turret = new Turret(100, 100);
        turret.yOffset = 0;
        sm.surfaceObjects = [turret];

        const proj = createMockProjectile({
            x: 100,
            y: 100,
            altitude: 50,
            owner: player,
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

    test('handleKeyDown T sets altitude input to 1 (ascend)', () => {
        const result = sm.handleKeyDown(84, 't');
        expect(result).toBe(true);
        expect(sm.altitudeInput).toBe(1);
    });

    test('handleKeyDown G sets altitude input to -1 (descend)', () => {
        const result = sm.handleKeyDown(71, 'g');
        expect(result).toBe(true);
        expect(sm.altitudeInput).toBe(-1);
    });

    test('handleKeyUp clears altitude input', () => {
        sm.altitudeInput = 1;
        const result = sm.handleKeyUp(84, 't');
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
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_DURATION / 2;

        sm._updateTransition();

        expect(sm.transitionProgress).toBeCloseTo(0.5, 1);
    });

    test('_updateTransition caps progress at 1', () => {
        sm.enter(player, planet, starSystem);
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_DURATION * 2;

        sm._updateTransition();

        expect(sm.transitionProgress).toBe(1);
    });

    test('ENTERING transitions to ACTIVE when complete', () => {
        sm.enter(player, planet, starSystem);
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_DURATION * 2;
        sm._terrainReady = true;

        sm._updateTransition();

        expect(sm.state).toBe(SURFACE_STATE.ACTIVE);
    });

    test('EXITING calls _completeExit when complete', () => {
        sm.enter(player, planet, starSystem);
        sm.state = SURFACE_STATE.EXITING;
        sm.transitionStartTime = millis() - SURFACE_CONFIG.TRANSITION_DURATION * 2;

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
        expect(bounds.base.y).toBe(200 - 30); // y - yOffset
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

    test('_createSurfaceExplosion applies altitude offset', () => {
        sm._createSurfaceExplosion(100, 200, 50, 15, [255, 100, 50]);

        const call = starSystem.addExplosion.mock.calls[0];
        const [x, y] = call;

        // With altitude 50, visual position should be offset
        expect(x).not.toBe(100);
        expect(y).not.toBe(200);
    });

    test('_createSurfaceExplosion does nothing without starSystem', () => {
        sm.starSystem = null;
        expect(() => {
            sm._createSurfaceExplosion(100, 200, 0, 15, [255, 100, 50]);
        }).not.toThrow();
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
        expect(SURFACE_CONFIG.TRANSITION_DURATION).toBeGreaterThan(0);
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
