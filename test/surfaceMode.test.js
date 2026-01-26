const { SurfaceMode } = require('../surfaceMode');

// Controllable time mock
let currentTime = 1000;
global.millis = jest.fn(() => currentTime);

// Global mocks
global.noise = jest.fn(() => 0.5);
global.showMessage = jest.fn();

// Mock dependencies
global.SurfaceTerrain = jest.fn().mockImplementation(() => ({
    setPlanet: jest.fn(),
    createBuffer: jest.fn(),
    getHeightAt: jest.fn().mockReturnValue(0),
    generateMesh: jest.fn().mockReturnValue(true),
    updateBuffer: jest.fn(),
    draw: jest.fn(),
    cleanup: jest.fn(),
    getGridPosition: jest.fn().mockReturnValue({ x: 0, y: 0 })
}));

global.createVector = (x = 0, y = 0) => ({
    x, y,
    copy: function () { return global.createVector(this.x, this.y); },
    add: function (v) { this.x += v.x; this.y += v.y; return this; },
    sub: function (v) { this.x -= v.x; this.y -= v.y; return this; },
    mult: function (n) { this.x *= n; this.y *= n; return this; },
    mag: function () { return Math.sqrt(this.x * this.x + this.y * this.y); },
    dist: function (v) { return Math.sqrt((this.x - v.x) ** 2 + (this.y - v.y) ** 2); },
    set: function (nx, ny) { this.x = nx; this.y = ny; return this; }
});

global.color = jest.fn(() => ({ levels: [0, 0, 0, 255] }));
global.push = jest.fn();
global.pop = jest.fn();
global.translate = jest.fn();
global.rotate = jest.fn();
global.scale = jest.fn();
global.fill = jest.fn();
global.noStroke = jest.fn();
global.stroke = jest.fn();
global.rect = jest.fn();
global.ellipse = jest.fn();
global.map = jest.fn((v, a, b, c, d) => c + (d - c) * ((v - a) / (b - a)));
global.PI = Math.PI;
global.TWO_PI = Math.PI * 2;
global.width = 800;
global.height = 600;

// Mock for surface objects
global.Turret = jest.fn().mockImplementation((x, y) => ({
    pos: global.createVector(x, y),
    size: 40,
    destroyed: false,
    takeDamage: jest.fn(),
    type: 'Turret'
}));
global.SecretCache = jest.fn();
global.Building = jest.fn();
global.DefenseDrone = jest.fn();
global.ShieldGenerator = jest.fn();

describe('SurfaceMode Baseline', () => {
    let surfaceMode;
    let mockPlayer;
    let mockPlanet;
    let mockStarSystem;

    beforeEach(() => {
        currentTime = 1000;
        surfaceMode = new SurfaceMode();

        mockPlayer = global.createMockPlayer({
            x: 0, y: 0,
            hull: 100,
            altitude: 100
        });
        mockPlayer.angle = 0;

        mockPlanet = {
            palette: [global.color(), global.color()],
            featureRand: 123,
            pos: global.createVector(1000, 1000),
            radius: 5000,
            name: "Test Planet",
            isInhabited: true,
            techLevel: 3,
            economyType: 'Service'
        };

        mockStarSystem = {
            projectiles: [],
            enemies: [],
            addExplosion: jest.fn()
        };

        global.SURFACE_CONFIG = {
            MESH_RESOLUTION: 10,
            MESH_SIZE: 1000,
            TRANSITION_DURATION: 2000
        };
    });

    test('Initial state is inactive', () => {
        expect(surfaceMode.state).toBe('inactive');
    });

    test('Can enter surface mode', () => {
        surfaceMode.enter(mockPlayer, mockPlanet, mockStarSystem);
        expect(surfaceMode.state).toBe('entering');
        expect(surfaceMode.planet).toBe(mockPlanet);
    });

    test('Can update during transition', () => {
        surfaceMode.enter(mockPlayer, mockPlanet, mockStarSystem);
        currentTime += 1000;
        surfaceMode.update(0.016);
        expect(surfaceMode.transitionProgress).toBe(0.5);
    });

    describe('Spawning', () => {
        beforeEach(() => {
            surfaceMode.enter(mockPlayer, mockPlanet, mockStarSystem);
        });

        test('_spawnObjects populates surfaceObjects in debug mode', () => {
            surfaceMode.debugMode = true;
            surfaceMode._spawnObjects(0, 0);
            expect(surfaceMode.surfaceObjects.length).toBe(1);
            expect(surfaceMode.surfaceObjects[0].id).toBe("DEBUG_TURRET");
        });
    });

    describe('Collisions', () => {
        beforeEach(() => {
            surfaceMode.enter(mockPlayer, mockPlanet, mockStarSystem);
            surfaceMode.state = 'active';
            surfaceMode.surfaceObjects = [
                new global.Turret(100, 100)
            ];
        });

        test('Player projectile hits surface object', () => {
            const turret = surfaceMode.surfaceObjects[0];
            const proj = {
                pos: global.createVector(100, 100),
                owner: mockPlayer,
                isSurface: true,
                destroyed: false,
                damage: 20,
                altitude: 10
            };
            mockStarSystem.projectiles.push(proj);

            surfaceMode._checkSurfaceCollisions();

            expect(turret.takeDamage).toHaveBeenCalledWith(20);
            expect(proj.destroyed).toBe(true);
        });

        test('Projectile hits ground', () => {
            // Mock terrain height at hit point
            surfaceMode._getTerrainHeightAt = jest.fn(() => 50);

            const proj = {
                pos: global.createVector(200, 200),
                owner: mockPlayer,
                isSurface: true,
                destroyed: false,
                altitude: 40 // Below ground height
            };
            mockStarSystem.projectiles.push(proj);

            surfaceMode._checkSurfaceCollisions();

            expect(proj.destroyed).toBe(true);
            expect(mockStarSystem.addExplosion).toHaveBeenCalled();
        });

        test('Enemy projectile hits player', () => {
            const enemyProj = {
                pos: global.createVector(0, 0), // Player is at 0,0
                owner: { id: 'enemy' },
                isSurface: true,
                destroyed: false,
                damage: 10,
                altitude: 100 // Player is at 100
            };
            mockStarSystem.projectiles.push(enemyProj);

            // Mock player takeDamage
            mockPlayer.takeDamage = jest.fn();
            surfaceMode.player = mockPlayer;

            surfaceMode._checkSurfaceCollisions();

            expect(mockPlayer.takeDamage).toHaveBeenCalledWith(10);
            expect(enemyProj.destroyed).toBe(true);
        });
    });

    test('Can exit surface mode', () => {
        surfaceMode.enter(mockPlayer, mockPlanet, mockStarSystem);
        surfaceMode.state = 'active';
        surfaceMode.exit();
        expect(surfaceMode.state).toBe('exiting');

        // Complete exit
        currentTime += 2500;
        surfaceMode.update(0.016);
        expect(surfaceMode.state).toBe('inactive');
    });
});
