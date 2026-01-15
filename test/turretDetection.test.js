const { Turret } = require('../surfaceObjects');

describe('Turret Detection Logic', () => {
    let mockPlayer;
    let mockStarSystem;

    beforeEach(() => {
        // Mock p5 globals
        global.createVector = jest.fn((x, y) => ({
            x: x || 0,
            y: y || 0,
            add: jest.fn().mockReturnThis(),
            mult: jest.fn().mockReturnThis(),
            copy: jest.fn().mockReturnThis()
        }));
        global.color = jest.fn(() => 'color');
        global.lerpColor = jest.fn(() => 'lerpedColor');
        global.millis = jest.fn(() => 1000);
        global.Draw3D = {
            drawBox3D: jest.fn(),
            drawCylinder: jest.fn(),
            drawDome: jest.fn(),
            drawCone: jest.fn(),
            drawExtrudedShape: jest.fn()
        };
        global.push = jest.fn();
        global.pop = jest.fn();
        global.translate = jest.fn();
        global.rotate = jest.fn();
        global.fill = jest.fn();
        global.noStroke = jest.fn();
        global.stroke = jest.fn();
        global.strokeWeight = jest.fn();
        global.ellipse = jest.fn();
        global.rect = jest.fn();
        global.noFill = jest.fn();
        global.map = jest.fn();

        // Setup mock player
        mockPlayer = {
            pos: global.createVector(100, 0), // Default position
            altitude: 0,
            angle: 0,
            vel: { mag: () => 0 },
            size: 25
        };

        // Setup mock star system
        mockStarSystem = {
            projectiles: [],
            addExplosion: jest.fn()
        };

        // Mock surfaceMode global
        global.surfaceMode = {
            altitude: 100 // Default high radar altitude
        };
    });

    test('Turret detects player on hilltop (high absolute altitude)', () => {
        const turret = new Turret(0, 0, 40);
        turret.yOffset = 50; // Turret on low ground
        mockPlayer.altitude = 200; // Player on high ground
        mockPlayer.pos = global.createVector(100, 0); // Within range

        global.surfaceMode.altitude = 30; // Low radar altitude (irrelevant if absolute alt is high)

        turret.update(0.016, mockPlayer, mockStarSystem);

        // Should track: angle should adjust
        expect(turret.angle).not.toBe(0);
    });

    test('Turret does NOT detect player hugging terrain in valley', () => {
        const turret = new Turret(0, 0, 40);
        turret.yOffset = 100; // Turret on high ground
        mockPlayer.altitude = 50; // Player in valley (low absolute altitude)
        mockPlayer.pos = global.createVector(100, 0);

        global.surfaceMode.altitude = 20; // Low radar altitude = hugging terrain

        const initialAngle = turret.angle;
        turret.update(0.016, mockPlayer, mockStarSystem);

        // Should return early, angle unchanged
        expect(turret.angle).toBe(initialAngle);
    });

    test('Turret DOES detect player flying high in valley', () => {
        const turret = new Turret(0, 0, 40);
        turret.yOffset = 200; // Turret on very high ground
        mockPlayer.altitude = 150; // Player in valley
        mockPlayer.pos = global.createVector(100, 0);

        global.surfaceMode.altitude = 100; // High radar altitude = flying high

        turret.update(0.016, mockPlayer, mockStarSystem);

        // Should detect despite low absolute alt
        expect(turret.angle).not.toBe(0);
    });

    test('Radar altitude threshold is 50', () => {
        const turret = new Turret(0, 0, 40);
        turret.yOffset = 100;
        mockPlayer.altitude = 80; // Below turret horizon
        mockPlayer.pos = global.createVector(100, 0);

        // Case 1: Radar alt 50 (Hidden)
        global.surfaceMode.altitude = 50;
        let initialAngle = turret.angle;
        turret.update(0.016, mockPlayer, mockStarSystem);
        expect(turret.angle).toBe(initialAngle);

        // Case 2: Radar alt 51 (Detected)
        global.surfaceMode.altitude = 51;
        // Reset angle or check change
        turret.angle = 0;
        turret.update(0.016, mockPlayer, mockStarSystem);
        expect(turret.angle).not.toBe(0);
    });
});
