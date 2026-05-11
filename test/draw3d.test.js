const { computeShipRimGlintStrength, drawShipRimGlint } = require('../draw3d.js');

describe('draw3d rim glint', () => {
    beforeEach(() => {
        global.ADD = 'ADD';
        global.ROUND = 'ROUND';
        global.blendMode = jest.fn();
        global.strokeCap = jest.fn();
        global.line = jest.fn();
    });

    test('keeps rim glint visible for near-tangent edges', () => {
        expect(computeShipRimGlintStrength(0)).toBeCloseTo(1, 5);
        expect(computeShipRimGlintStrength(0.4)).toBeGreaterThan(0.24);
        expect(computeShipRimGlintStrength(0.4)).toBeCloseTo(computeShipRimGlintStrength(-0.4), 5);
        expect(computeShipRimGlintStrength(0.62)).toBeGreaterThan(0.24);
        expect(computeShipRimGlintStrength(0.64)).toBeLessThan(0.24);
        expect(computeShipRimGlintStrength(1)).toBe(0);
    });

    test('draws the tangent edges that match the sun direction', () => {
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

        expect(line).toHaveBeenCalledTimes(2);

        const ys = line.mock.calls
            .map(([, y1, , y2]) => [y1, y2])
            .flat()
            .sort((a, b) => a - b);

        expect(ys[0]).toBeCloseTo(-10.75, 5);
        expect(ys[1]).toBeCloseTo(-10.75, 5);
        expect(ys[2]).toBeCloseTo(10.75, 5);
        expect(ys[3]).toBeCloseTo(10.75, 5);
    });
});
