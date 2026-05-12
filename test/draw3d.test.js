const { computeShipRimGlintStrength, drawShipRimGlint } = require('../draw3d.js');

describe('draw3d rim glint', () => {
    beforeEach(() => {
        global.ADD = 'ADD';
        global.ROUND = 'ROUND';
        global.blendMode = jest.fn();
        global.strokeCap = jest.fn();
        global.line = jest.fn();
    });

    test('only keeps rim glint on edges closely aligned with the sun direction', () => {
        expect(computeShipRimGlintStrength(1)).toBeCloseTo(1, 5);
        expect(computeShipRimGlintStrength(0.95)).toBeGreaterThan(0.5);
        expect(computeShipRimGlintStrength(0.85)).toBeLessThan(0.5);
        expect(computeShipRimGlintStrength(-0.95)).toBe(0);
        expect(computeShipRimGlintStrength(0)).toBe(0);
    });

    test('draws only the edge nearest the sun direction', () => {
        const layerCache = {
            fillRGB: { r: 100, g: 120, b: 140 },
            vertexData: [
                { x: -1, y: -1 },
                { x: 1, y: -1 },
                { x: 1, y: 1 },
                { x: -1, y: 1 }
            ],
            edges: [
                { v1: { x: -1, y: -1 }, v2: { x: 1, y: -1 }, dx: 2, dy: 0, faceAngle: -Math.PI / 2 },
                { v1: { x: 1, y: -1 }, v2: { x: 1, y: 1 }, dx: 0, dy: 2, faceAngle: 0 },
                { v1: { x: 1, y: 1 }, v2: { x: -1, y: 1 }, dx: -2, dy: 0, faceAngle: Math.PI / 2 },
                { v1: { x: -1, y: 1 }, v2: { x: -1, y: -1 }, dx: 0, dy: -2, faceAngle: Math.PI }
            ]
        };

        drawShipRimGlint(layerCache, 10, 0);

        expect(line).toHaveBeenCalledTimes(1);
        expect(line).toHaveBeenCalledWith(10.35, -10, 10.35, 10);
    });
});
