describe('StarSystem parallax helpers', () => {
    beforeEach(() => {
        jest.resetModules();
        global.SHIP_DEFINITIONS = {};
        global.STARFIELD_CONFIG = { WORKER_ENABLED: false };
    });

    afterEach(() => {
        delete global.SHIP_DEFINITIONS;
        delete global.STARFIELD_CONFIG;
    });

    test('computeParallaxWorldPosition keeps base coordinate when player is at origin', () => {
        const { StarSystem } = require('../starSystem');
        expect(StarSystem.computeParallaxWorldPosition(1200, 0, 0.2)).toBe(1200);
    });

    test('parallax screen shift scales with parallax factor', () => {
        const { StarSystem } = require('../starSystem');
        const base = 800;
        const factor = 0.25;
        const p1 = 100;
        const p2 = 300;

        const w1 = StarSystem.computeParallaxWorldPosition(base, p1, factor);
        const w2 = StarSystem.computeParallaxWorldPosition(base, p2, factor);
        const screen1 = w1 - p1;
        const screen2 = w2 - p2;

        expect(screen2 - screen1).toBeCloseTo(-(p2 - p1) * factor, 6);
    });

    test('near layers shift more than distant layers', () => {
        const { StarSystem } = require('../starSystem');
        const base = 500;
        const p1 = 0;
        const p2 = 400;

        const distantShift = Math.abs(
            (StarSystem.computeParallaxWorldPosition(base, p2, 0.15) - p2) -
            (StarSystem.computeParallaxWorldPosition(base, p1, 0.15) - p1)
        );
        const nearShift = Math.abs(
            (StarSystem.computeParallaxWorldPosition(base, p2, 0.8) - p2) -
            (StarSystem.computeParallaxWorldPosition(base, p1, 0.8) - p1)
        );

        expect(nearShift).toBeGreaterThan(distantShift);
    });

    test('foreground factor above 1 moves faster than baseline starfield', () => {
        const { StarSystem } = require('../starSystem');
        const base = 700;
        const p1 = 50;
        const p2 = 250;
        const foregroundFactor = 1.3;

        const shift = Math.abs(
            (StarSystem.computeParallaxWorldPosition(base, p2, foregroundFactor) - p2) -
            (StarSystem.computeParallaxWorldPosition(base, p1, foregroundFactor) - p1)
        );
        const baselineShift = Math.abs(p2 - p1);

        expect(shift).toBeGreaterThan(baselineShift);
    });
});
