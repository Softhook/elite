/**
 * Astronaut Tests
 */

// Global mocks
global.createVector = function (x, y) {
    return {
        x: x || 0,
        y: y || 0,
        copy: function () { return global.createVector(this.x, this.y); },
        add: function (v) { this.x += v.x; this.y += v.y; return this; },
        set: function (x, y) { this.x = x; this.y = y; return this; },
        mult: function (n) { this.x *= n; this.y *= n; return this; }
    };
};
global.p5 = {
    Vector: {
        mult: function (v, n) {
            return global.createVector(v.x * n, v.y * n);
        },
        dist: function (v1, v2) {
            const dx = v1.x - v2.x;
            const dy = v1.y - v2.y;
            return Math.sqrt(dx * dx + dy * dy);
        }
    }
};
global.keyIsDown = jest.fn(() => false);
global.deltaTime = 16;
global.color = jest.fn();
global.Draw3D = {
    drawBox3D: jest.fn(),
    drawDome: jest.fn()
};
global.RIGHT_ARROW = 39;
global.LEFT_ARROW = 37;
global.UP_ARROW = 38;
global.DOWN_ARROW = 40;

// Load Astronaut class
require('../astronaut.js');

describe('Astronaut', () => {
    let astronaut;
    let mockSurfaceMode;

    beforeEach(() => {
        astronaut = new Astronaut(createVector(100, 100));
        mockSurfaceMode = {
            starSystem: {
                projectiles: []
            }
        };
    });

    test('initializes with offset from ship position', () => {
        expect(astronaut.pos.x).toBe(130); // 100 + 30 offset
        expect(astronaut.pos.y).toBe(100);
    });

    test('movement input updates velocity (screen-relative)', () => {
        global.keyIsDown.mockReturnValue(false); // Clear inputs
        global.keyIsDown.mockImplementation((k) => k === 87); // W key (Up/North)

        astronaut.handleInput(mockSurfaceMode);

        expect(astronaut.vel.y).toBeLessThan(0); // Should move Up (negative Y)
        expect(astronaut.vel.x).toBe(0); // Should not move horizontally
    });

    test('stops when no input', () => {
        astronaut.vel.set(100, 100);
        global.keyIsDown.mockReturnValue(false);

        astronaut.handleInput(mockSurfaceMode);

        expect(astronaut.vel.x).toBe(0);
        expect(astronaut.vel.y).toBe(0);
    });

    test('grenade throw spawns projectile', () => {
        global.keyIsDown.mockImplementation((k) => k === 32); // Space

        astronaut.throwGrenade(mockSurfaceMode);

        expect(mockSurfaceMode.starSystem.projectiles.length).toBe(1);
        const grenade = mockSurfaceMode.starSystem.projectiles[0];
        expect(grenade.constructor.name).toBe('Grenade');
    });

    test('grenade has cooldown', () => {
        global.keyIsDown.mockImplementation((k) => k === 32); // Space

        astronaut.throwGrenade(mockSurfaceMode);
        expect(mockSurfaceMode.starSystem.projectiles.length).toBe(1);

        astronaut.throwGrenade(mockSurfaceMode);
        expect(mockSurfaceMode.starSystem.projectiles.length).toBe(1); // Still 1

        // Cooldown tick
        astronaut.update(1);
        expect(astronaut.grenadeCooldown).toBeLessThan(60);
    });
});
