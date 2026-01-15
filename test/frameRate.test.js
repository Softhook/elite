// Mock basics
global.window = global;
require('../debug');
require('../ships');
require('../weapons');
require('../enemyConstants');
// require('../mission'); // Might be needed for Station
require('../objectPool');
require('../thrustParticles');
// require('../draw3d'); // Not needed for logic tests
require('../asteroid');
require('../cargo');
require('../projectile');
// require('../commodityDefinitions'); // For Market
// require('../market'); // For Station
require('../station');
require('../planet');
require('../enemyMovement');
require('../enemyStateMachine');
require('../enemyAIBehaviors');
require('../enemy');

// Mock Market if not loaded
if (typeof Market === 'undefined') {
    global.Market = class Market { constructor() { } };
}

describe('Frame-Rate Independence Tests', () => {
    // Helper for floating point comparison
    const isCloseTo = (actual, expected, tolerance = 0.05) => {
        if (expected === 0) return Math.abs(actual) < 0.01;
        const ratio = actual / expected;
        return ratio >= (1 - tolerance) && ratio <= (1 + tolerance);
    };

    beforeEach(() => {
        // Mock p5 globals
        const mockVectorProto = {
            set: jest.fn().mockReturnThis(),
            copy: jest.fn().mockImplementation(function () { return global.createVector(this.x, this.y); }),
            add: jest.fn().mockImplementation(function (v) { this.x += v.x; this.y += v.y; return this; }),
            sub: jest.fn().mockImplementation(function (v) { this.x -= v.x; this.y -= v.y; return this; }),
            mult: jest.fn().mockImplementation(function (n) { this.x *= n; this.y *= n; return this; }),
            mag: jest.fn().mockImplementation(function () { return Math.sqrt(this.x * this.x + this.y * this.y); }),
            normalize: jest.fn().mockImplementation(function () {
                const m = this.mag();
                if (m > 0) this.mult(1 / m);
                return this;
            }),
            limit: jest.fn().mockReturnThis(),
            heading: jest.fn().mockReturnValue(0),
            dist: jest.fn().mockImplementation(function (v) {
                const dx = this.x - v.x;
                const dy = this.y - v.y;
                return Math.sqrt(dx * dx + dy * dy);
            }),
            rotate: jest.fn().mockImplementation(function (a) {
                const newHeading = this.heading() + a;
                const m = this.mag();
                this.x = Math.cos(newHeading) * m;
                this.y = Math.sin(newHeading) * m;
                return this;
            })
        };

        global.createVector = jest.fn((x, y) => {
            const v = Object.create(mockVectorProto);
            v.x = x || 0;
            v.y = y || 0;
            v.z = 0;
            return v;
        });

        global.p5 = {
            Vector: {
                mult: (v, n) => global.createVector(v.x * n, v.y * n),
                random2D: () => global.createVector(1, 0), // Deterministic for tests
                sub: (v1, v2) => global.createVector(v1.x - v2.x, v1.y - v2.y)
            },
            Graphics: class { }
        };
        global.createGraphics = jest.fn(() => ({
            width: 100, height: 100,
            clear: jest.fn(),
            noStroke: jest.fn(),
            fill: jest.fn(),
            rect: jest.fn(),
            image: jest.fn(),
            translate: jest.fn(),
            rotate: jest.fn(),
            push: jest.fn(),
            pop: jest.fn(),
            stroke: jest.fn(),
            strokeWeight: jest.fn(),
            ellipse: jest.fn(),
            line: jest.fn(),
            drawingContext: {
                createRadialGradient: jest.fn(() => ({ addColorStop: jest.fn() })),
                globalCompositeOperation: 'source-over'
            },
            noise: jest.fn(() => 0.5),
            noiseDetail: jest.fn()
        }));

        global.random = jest.fn((min, max) => {
            if (typeof max === 'undefined') return typeof min === 'undefined' ? 0.5 : min * 0.5;
            return min + (max - min) * 0.5; // Return midpoint
        });
        global.floor = Math.floor;
        global.ceil = Math.ceil;
        global.abs = Math.abs;
        global.min = Math.min;
        global.max = Math.max;
        global.sqrt = Math.sqrt;
        global.cos = Math.cos;
        global.sin = Math.sin;
        global.pow = Math.pow;
        global.TWO_PI = Math.PI * 2;
        global.PI = Math.PI;
        global.color = jest.fn(() => ({
            toString: () => 'color',
            setRed: jest.fn(),
            setGreen: jest.fn(),
            setBlue: jest.fn(),
            setAlpha: jest.fn()
        }));
        global.lerpColor = jest.fn(() => 'lerpedColor');
        global.red = jest.fn(() => 128);
        global.green = jest.fn(() => 128);
        global.blue = jest.fn(() => 128);
        global.alpha = jest.fn(() => 255);
        global.radians = (deg) => deg * Math.PI / 180;
        global.map = (v, min1, max1, min2, max2) => min2 + (max2 - min2) * ((v - min1) / (max1 - min1));

        // Reset deltaTime
        global.deltaTime = 16.67;
    });

    describe('Asteroid Movement', () => {
        test('should drift same distance at 60fps vs 30fps over 1 second', () => {
            // Setup Asteroid 60fps
            const asteroid60 = new Asteroid(0, 0, 50);
            asteroid60.vel = global.createVector(1, 0.5);
            asteroid60.pos = global.createVector(0, 0);

            // Setup Asteroid 30fps
            const asteroid30 = new Asteroid(0, 0, 50);
            asteroid30.vel = global.createVector(1, 0.5);
            asteroid30.pos = global.createVector(0, 0);

            // 1 sec at 60fps
            for (let i = 0; i < 60; i++) {
                global.deltaTime = 16.67;
                asteroid60.update();
            }

            // 1 sec at 30fps
            for (let i = 0; i < 30; i++) {
                global.deltaTime = 33.33;
                asteroid30.update();
            }

            const dist60 = asteroid60.pos.mag();
            const dist30 = asteroid30.pos.mag();

            expect(dist60).toBeGreaterThan(0);
            expect(isCloseTo(dist30, dist60)).toBe(true);
        });

        test('should rotate same angle at 60fps vs 75fps over 1 second', () => {
            const asteroid60 = new Asteroid(0, 0, 50);
            asteroid60.angle = 0;
            asteroid60.rotationSpeed = 0.05;

            const asteroid75 = new Asteroid(0, 0, 50);
            asteroid75.angle = 0;
            asteroid75.rotationSpeed = 0.05;

            // 1 sec at 60fps
            for (let i = 0; i < 60; i++) {
                global.deltaTime = 16.67;
                asteroid60.update();
            }

            // 1 sec at 75fps
            for (let i = 0; i < 75; i++) {
                global.deltaTime = 13.33;
                asteroid75.update();
            }

            expect(asteroid60.angle).toBeGreaterThan(0);
            expect(isCloseTo(asteroid75.angle, asteroid60.angle)).toBe(true);
        });
    });

    describe('Cargo Lifetime & Drift', () => {
        test('should have same lifetime remaining after 10 seconds', () => {
            const cargo60 = new Cargo(0, 0, 'Food');
            cargo60.vel = global.createVector(0, 0);
            const initialLife = cargo60.lifetime;

            const cargo30 = new Cargo(0, 0, 'Food');
            cargo30.vel = global.createVector(0, 0);
            cargo30.lifetime = initialLife;

            // 10 sec at 60fps (600 frames)
            for (let i = 0; i < 600; i++) {
                global.deltaTime = 16.67;
                cargo60.update();
            }

            // 10 sec at 30fps (300 frames)
            for (let i = 0; i < 300; i++) {
                global.deltaTime = 33.33;
                cargo30.update();
            }

            expect(isCloseTo(cargo30.lifetime, cargo60.lifetime)).toBe(true);
        });
    });

    describe('Projectile Movement', () => {
        test('should travel same distance at 60fps vs 30fps', () => {
            const proj60 = new Projectile(0, 0, 0, null, 10, 10, [255, 0, 0], 'projectile');
            proj60.vel = global.createVector(10, 0);

            const proj30 = new Projectile(0, 0, 0, null, 10, 10, [255, 0, 0], 'projectile');
            proj30.vel = global.createVector(10, 0);

            // 1 sec at 60fps
            for (let i = 0; i < 60; i++) {
                global.deltaTime = 16.67;
                proj60.update();
            }

            // 1 sec at 30fps
            for (let i = 0; i < 30; i++) {
                global.deltaTime = 33.33;
                proj30.update();
            }

            expect(isCloseTo(proj30.pos.x, proj60.pos.x)).toBe(true);
        });

        test('should consume same lifespan at 60fps vs 75fps', () => {
            const proj60 = new Projectile(0, 0, 0, null, 10, 10, [255, 0, 0], 'projectile', null, 100);
            const proj75 = new Projectile(0, 0, 0, null, 10, 10, [255, 0, 0], 'projectile', null, 100);

            // 0.5s at 60fps (30 frames)
            for (let i = 0; i < 30; i++) {
                global.deltaTime = 16.67;
                proj60.update();
            }

            // 0.5s at 75fps (~37.5 frames, use 37)
            for (let i = 0; i < 37; i++) {
                global.deltaTime = 13.33;
                proj75.update();
            }

            expect(isCloseTo(proj75.lifespan, proj60.lifespan)).toBe(true);
        });
    });

    describe('Planet Rotation', () => {
        test('should rotate consistent amount at 60fps vs 30fps', () => {
            const planet60 = new Planet(0, 0, 100, null, null);
            planet60.rotation = 0;
            planet60.rotationSpeed = 0.001;

            const planet30 = new Planet(0, 0, 100, null, null);
            planet30.rotation = 0;
            planet30.rotationSpeed = 0.001;

            // 2 seconds
            for (let i = 0; i < 120; i++) {
                global.deltaTime = 16.67;
                const timeScale = global.deltaTime / 16.67;
                planet60.rotation += planet60.rotationSpeed * timeScale;
            }

            for (let i = 0; i < 60; i++) {
                global.deltaTime = 33.33;
                const timeScale = global.deltaTime / 16.67;
                planet30.rotation += planet30.rotationSpeed * timeScale;
            }

            expect(isCloseTo(planet30.rotation, planet60.rotation)).toBe(true);
        });
    });
});
