const {
    SurfaceObject,
    SecretCache,
    Building,
    Turret
} = require('../surfaceObjects');

// Mock Projectile
global.Projectile = jest.fn().mockImplementation(() => ({
    ownerType: '',
    isSurface: false,
    altitude: 0
}));

describe('SurfaceObjects', () => {
    beforeEach(() => {
        // p5 mocks are already in jest.setup.js
        global.Draw3D = {
            drawBox3D: jest.fn(),
            drawCylinder: jest.fn(),
            drawDome: jest.fn(),
            drawCone: jest.fn(),
            drawExtrudedShape: jest.fn()
        };

        global.HEALTH_BAR_COLORS = {
            BG: [200, 0, 0],
            FILL: [0, 200, 0]
        };

        global.CORNER = 'corner';
        global.rectMode = jest.fn();

        global.SURFACE_CONFIG = {
            TURRET: {
                RANGE: 1000,
                DETECTION_HEIGHT_THRESHOLD: 30,
                HEALTH: 150,
                FIRE_RATE: 2.0,
                TURN_SPEED: 5,
                PROJECTILE_SPEED: 15,
                PROJECTILE_DAMAGE: 5,
                PROJECTILE_LIFESPAN: 120
            }
        };

        // Ensure soundManager is mocked with all methods
        global.soundManager = {
            playSound: jest.fn(),
            playWorldSound: jest.fn(),
            playMusic: jest.fn(),
            stopMusic: jest.fn()
        };

        global.player = {
            pos: global.createVector(0, 0),
            credits: 100,
            size: 30,
            altitude: 0
        };

        global.showMessage = jest.fn();
    });

    describe('SurfaceObject Base Class', () => {
        test('Constructor initializes properties correctly', () => {
            const obj = new SurfaceObject(100, 200, 50);
            expect(obj.pos.x).toBe(100);
            expect(obj.pos.y).toBe(200);
            expect(obj.size).toBe(50);
            expect(obj.health).toBe(100);
            expect(obj.destroyed).toBe(false);
        });

        test('takeDamage reduces health and marks destroyed', () => {
            const obj = new SurfaceObject(0, 0, 50);
            obj.takeDamage(40);
            expect(obj.health).toBe(60);
            expect(obj.destroyed).toBe(false);

            obj.takeDamage(70);
            expect(obj.health).toBe(-10);
            expect(obj.destroyed).toBe(true);
        });

        test('checkCollision returns false by default (stub in base class)', () => {
            const obj = new SurfaceObject(0, 0, 50);
            const projectileInside = { pos: global.createVector(10, 10), size: 10 };
            expect(obj.checkCollision(projectileInside)).toBe(false);
        });
    });

    describe('SecretCache', () => {
        test('onDestroy drops credits and shows message', () => {
            const cache = new SecretCache(0, 0);
            const expectedLoot = cache.lootValue;

            cache.onDestroy();

            expect(global.player.credits).toBe(100 + expectedLoot);
            expect(global.showMessage).toHaveBeenCalled();
            expect(global.soundManager.playSound).toHaveBeenCalledWith('pickupCoin');
        });
    });

    describe('Turret', () => {
        test('Turret rotates towards player when in range', () => {
            const turret = new Turret(0, 0, 40);
            const mockPlayer = {
                pos: global.createVector(100, 100),
                altitude: 100,
                size: 20
            };
            const mockStarSystem = {
                projectiles: [],
                addExplosion: jest.fn()
            };

            global.surfaceMode = { altitude: 100 };

            const initialAngle = turret.angle;
            turret.update(0.016, mockPlayer, mockStarSystem);

            expect(turret.angle).not.toBe(initialAngle);
        });

        test('Turret fires when cooldown is ready', () => {
            const turret = new Turret(0, 0, 40);
            const mockPlayer = {
                pos: global.createVector(100, 0),
                altitude: 100,
                size: 20,
                vel: global.createVector(0, 0)
            };
            const mockStarSystem = {
                projectiles: [],
                addExplosion: jest.fn()
            };

            global.surfaceMode = { altitude: 100, starSystem: mockStarSystem };

            turret.cooldown = 0;
            turret.update(0.1, mockPlayer, mockStarSystem);

            expect(mockStarSystem.projectiles.length).toBe(1);
            expect(global.Projectile).toHaveBeenCalled();
            expect(global.soundManager.playWorldSound).toHaveBeenCalled();
        });
    });
});
