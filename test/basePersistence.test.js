/**
 * Base Persistence Tests
 * Verifies the fixes for player-built structures disappearing.
 */

// Mock p5 globals
global.createVector = (x = 0, y = 0) => ({
    x, y,
    copy: function () { return global.createVector(this.x, this.y); },
    dist: function (v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); },
    mag: function () { return Math.sqrt(this.x * this.x + this.y * this.y); },
    set: function (nx, ny) { this.x = nx; this.y = ny; return this; }
});
global.millis = () => Date.now();
global.noise = jest.fn(() => 0.5);
global.p5 = { Vector: { dist: (v1, v2) => Math.sqrt((v1.x - v2.x) ** 2 + (v1.y - v2.y) ** 2) } };
global.color = (r, g, b) => ({ levels: [r, g, b, 255] });
global.width = 1920;
global.height = 1080;
global.frameCount = 0;

// Mock SURFACE_CONFIG
global.SURFACE_CONFIG = {
    MESH_SIZE: 4200,
    MESH_RESOLUTION: 120,
    SPAWN_CELL_SIZE: 35,
    DEFAULT_ALTITUDE: 100,
    MIN_ALTITUDE: 20,
    MAX_ALTITUDE: 400,
    HIGH_TERRAIN_THRESHOLD: 300
};

// Mock classes used in SurfaceMode
global.OffworldBuilding = class {
    constructor(x, y, size, seed) {
        this.pos = { x, y };
        this.size = size || 40;
        this.seed = seed || 0;
        this.type = 'OffworldBuilding';
        this.destroyed = false;
    }
};

global.Building = class {
    constructor(x, y, size, type, seed) {
        this.pos = { x, y };
        this.size = size;
        this.buildingType = type;
        this.seed = seed;
        this.type = 'Building';
    }
};

global.SurfaceObject = class {
    constructor(x, y, size) {
        this.pos = { x, y };
        this.size = size || 40;
        this.type = 'SurfaceObject';
    }
};

global.SurfaceStation = class {
    constructor(x, y, size, color) {
        this.pos = { x, y };
        this.size = size;
        this.type = 'SurfaceStation';
    }
};

global.Turret = class {
    constructor(x, y) {
        this.pos = { x, y };
        this.type = 'Turret';
    }
};

global.DefenseDrone = class {
    constructor(x, y) {
        this.pos = { x, y };
        this.type = 'DefenseDrone';
    }
};

global.SecretCache = class {
    constructor(x, y, seed) {
        this.pos = { x, y };
        this.type = 'SecretCache';
    }
};

global.SurfaceTerrain = class {
    constructor() {
        this.config = global.SURFACE_CONFIG;
    }
    setPlanet() { }
    getHeightAt() { return 0; }
    createBuffer() { }
    cleanup() { }
    getGridPosition() { return { x: 0, y: 0 }; }
};

// Mock sound/music/UI
global.ambientSoundManager = { stopAll: jest.fn() };
global.spaceMusicManager = { advanceChordProgression: jest.fn() };
global.uiManager = { addMessage: jest.fn() };
global.soundManager = { playSound: jest.fn() };
global.gameStateManager = { setState: jest.fn() };
global.saveGame = jest.fn();

const { SurfaceMode, SURFACE_STATE } = require('../surfaceMode.js');

describe('Base Persistence', () => {
    let sm;
    let mockPlayer;
    let mockPlanet;
    let mockStarSystem;

    beforeEach(() => {
        sm = new SurfaceMode();
        mockPlayer = {
            pos: global.createVector(0, 0),
            angle: 0,
            vel: { mag: () => 0 },
            copy: function () { return this; }
        };
        mockPlanet = {
            name: 'Test',
            destroyedSurfaceObjects: [],
            playerBuiltSurfaceObjects: [],
            isInhabited: false,
            featureRand: 123,
            cityLightsColor: [255, 255, 255],
            economyType: 'Service',
            techLevel: 3,
            currentRotation: 0,
            pos: { x: 1000, y: 0 }
        };
        mockStarSystem = { initAmbientSounds: jest.fn() };
    });

    test('SurfaceMode.enter indexes playerBuiltMap using SPAWN_CELL_SIZE (35)', () => {
        mockPlanet.playerBuiltSurfaceObjects = [
            { x: 35, y: 35, type: 'OffworldBuilding' }, // Should be index (1, 1)
            { x: 70, y: 0, type: 'OffworldBuilding' }   // Should be index (2, 0)
        ];

        sm.enter(mockPlayer, mockPlanet, mockStarSystem, { force: true });

        expect(sm.playerBuiltMap.has('1,1')).toBe(true);
        expect(sm.playerBuiltMap.has('2,0')).toBe(true);
        expect(sm.playerBuiltMap.has('0,0')).toBe(false);

        // Verify that it handles fractional positions correctly with floor
        sm.playerBuiltMap.clear();
        mockPlanet.playerBuiltSurfaceObjects = [
            { x: 34.9, y: 34.9, type: 'OffworldBuilding' } // floor(34.9/35) = 0
        ];
        sm.enter(mockPlayer, mockPlanet, mockStarSystem, { force: true });
        expect(sm.playerBuiltMap.has('0,0')).toBe(true);
    });

    test('Building a structure clears destroyedCells flag', () => {
        sm.enter(mockPlayer, mockPlanet, mockStarSystem, { force: true });
        const cellKey = '5,5';
        sm.destroyedCells.add(cellKey);
        sm.planet.destroyedSurfaceObjects = [cellKey];

        // Set up astronaut state to build at approx (5, 5)
        // bx/by are calculated from astronaut.pos + distance 80
        // bx = 100 + 80 = 180. 180 / 35 = 5.14 -> floor = 5.
        // by = 175. 175 / 35 = 5. floor = 5.
        sm.astronaut = {
            pos: global.createVector(100, 175),
            facingAngle: 0
        };
        sm.surfaceObjects = [];

        sm._attemptBuildHabUnit();

        expect(sm.destroyedCells.has(cellKey)).toBe(false);
        expect(sm.planet.destroyedSurfaceObjects.indexOf(cellKey)).toBe(-1);
    });

    test('_spawnObjects does not overwrite player-built structures on inhabited planets', () => {
        mockPlanet.isInhabited = true;
        sm.enter(mockPlayer, mockPlanet, mockStarSystem, { force: true });

        const cellKey = '0,0';
        const playerDesc = { x: 0, y: 0, type: 'OffworldBuilding', playerBuilt: true };
        sm.playerBuiltMap.set(cellKey, playerDesc);

        // Noise returns 0.9 -> Settlement zone.
        global.noise.mockReturnValue(0.9);

        sm._spawnObjects(0, 0);

        const objectsAt00 = sm.surfaceObjects.filter(o => {
            const cx = Math.floor(o.pos.x / 35);
            const cy = Math.floor(o.pos.y / 35);
            return cx === 0 && cy === 0;
        });

        expect(objectsAt00.length).toBe(1);
        expect(objectsAt00[0].playerBuilt).toBe(true);
        expect(objectsAt00[0].type).toBe('OffworldBuilding');
    });
});
