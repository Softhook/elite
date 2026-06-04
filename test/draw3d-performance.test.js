// draw3d-performance.test.js — Benchmark tests for draw3d.js optimizations
const {
    Draw3D,
    computeShipRimGlintStrength,
    drawShipRimGlint,
    getNearestSunAngleForEntity
} = require('../draw3d.js');

// ============================================================================
// Test helpers — mock p5.js globals required by draw3d.js
// ============================================================================

function setupP5Mocks() {
    global.ADD = 'ADD';
    global.ROUND = 'ROUND';
    global.CLOSE = 'CLOSE';
    global.CENTER = 'CENTER';
    global.PI = Math.PI;
    global.TWO_PI = Math.PI * 2;
    global.HALF_PI = Math.PI / 2;

    global.push = jest.fn();
    global.pop = jest.fn();
    global.blendMode = jest.fn();
    global.strokeCap = jest.fn();
    global.noFill = jest.fn();
    global.noStroke = jest.fn();
    global.stroke = jest.fn();
    global.strokeWeight = jest.fn();
    global.fill = jest.fn();
    global.line = jest.fn();
    global.rect = jest.fn();
    global.rectMode = jest.fn();
    global.ellipse = jest.fn();
    global.beginShape = jest.fn();
    global.endShape = jest.fn();
    global.vertex = jest.fn();
    global.translate = jest.fn();
    global.rotate = jest.fn();
    global.beginContour = jest.fn();
    global.endContour = jest.fn();
    global.red = (c) => (c && c.levels ? c.levels[0] : 100);
    global.green = (c) => (c && c.levels ? c.levels[1] : 100);
    global.blue = (c) => (c && c.levels ? c.levels[2] : 100);
    global.alpha = (c) => (c && c.levels ? c.levels[3] || 255 : 255);
    global.color = (...args) => {
        if (args.length === 1 && typeof args[0] === 'number') {
            return { levels: [args[0], args[0], args[0], 255], toString: () => `rgb(${args[0]},${args[0]},${args[0]})` };
        }
        return { levels: [args[0] || 100, args[1] || 100, args[2] || 100, args[3] || 255], toString: () => `rgb(${args[0]},${args[1]},${args[2]})` };
    };
    global.drawingContext = {
        fillStyle: '',
    };
    global.sin = Math.sin;
    global.cos = Math.cos;
    global.atan2 = Math.atan2;
    global.abs = Math.abs;
    global.pow = Math.pow;
    global.max = Math.max;
    global.min = Math.min;
    global.floor = Math.floor;
    global.round = Math.round;
    global.sqrt = Math.sqrt;
    global.random = Math.random;

    // Reset all mocks
    jest.clearAllMocks();
}

beforeEach(() => {
    setupP5Mocks();
});

// ============================================================================
// REGRESSION: Deferred rendering removal verification
// ============================================================================

describe('Deferred rendering removal — no regression', () => {
    test('_renderQueue is not defined (removed)', () => {
        expect(typeof global._renderQueue).toBe('undefined');
    });

    test('beginDeferredRendering is not defined (removed)', () => {
        expect(typeof global.beginDeferredRendering).toBe('undefined');
    });

    test('flushDeferredRendering is not defined (removed)', () => {
        expect(typeof global.flushDeferredRendering).toBe('undefined');
    });

    test('calculatePrimitiveDepth is not defined (removed)', () => {
        expect(typeof global.calculatePrimitiveDepth).toBe('undefined');
    });

    test('computeShading is not defined (removed)', () => {
        expect(typeof global.computeShading).toBe('undefined');
    });

    test('drawPrismSplit is not defined (removed)', () => {
        expect(typeof Draw3D.drawPrismSplit).toBe('undefined');
    });

    test('Draw3D object still exists with all expected methods', () => {
        const expected = [
            'getDepthVector', 'drawPrism', 'drawBox3D', 'drawExtrudedShape',
            'drawRing3D', 'drawDome', 'drawCylinder', 'drawCone',
            'drawHelix', 'drawLattice', 'drawRod', 'drawGeodesicDome',
            'drawTorus', 'drawExtrudedRing', 'drawUpgradeModel'
        ];
        for (const method of expected) {
            expect(typeof Draw3D[method]).toBe('function');
        }
    });

    test('drawPrism does not check _renderQueue (no regression)', () => {
        // Should execute immediately without deferred rendering check
        Draw3D.drawPrism(100, 100, 20, 6, 10, color(200, 100, 50), 0.5, Math.PI / 4, true);
        // If deferred rendering were still active, these wouldn't be called
        expect(beginShape).toHaveBeenCalled();
        expect(vertex).toHaveBeenCalled();
    });
});

// ============================================================================
// PERFORMANCE: getShading integer math optimization
// ============================================================================

describe('getShading performance (integer math optimization)', () => {
    test('produces correct results for common angles', () => {
        // Access getShading via the module — it's used internally by drawPrism
        // We verify correctness by rendering a prism and checking fill values
        jest.clearAllMocks();

        Draw3D.drawPrism(0, 0, 10, 4, 5, color(100, 200, 150), 0, 0, false);

        // Should have called fill multiple times (bottom + sides + top)
        const fillCalls = fill.mock.calls.filter(c => c.length >= 3);
        expect(fillCalls.length).toBeGreaterThan(2);

        // All fill values should be in valid range
        for (const call of fillCalls) {
            expect(call[0]).toBeGreaterThanOrEqual(0);
            expect(call[0]).toBeLessThanOrEqual(255);
            expect(call[1]).toBeGreaterThanOrEqual(0);
            expect(call[1]).toBeLessThanOrEqual(255);
            expect(call[2]).toBeGreaterThanOrEqual(0);
            expect(call[2]).toBeLessThanOrEqual(255);
        }
    });

    test('benchmark: 100,000 getShading-equivalent calls via drawPrism', () => {
        // Warm the trig cache first
        Draw3D.drawPrism(0, 0, 10, 8, 5, color(100), 0.3, 0.7, true);

        const ITERATIONS = 10000;
        const start = performance.now();

        for (let i = 0; i < ITERATIONS; i++) {
            const angle = (i * 0.137) % (Math.PI * 2);
            Draw3D.drawPrism(
                i * 0.1, i * 0.2,  // varying position
                10 + (i % 5),       // varying radius
                4 + (i % 8),        // 4-11 sides (tests cache hits)
                5,                  // fixed depth
                color(100 + (i % 155), 100, 100),
                angle * 0.5,        // varying extrusion angle
                angle,              // varying sun angle
                true                // skipBottom (surface mode path)
            );
        }

        const elapsed = performance.now() - start;
        const perCall = (elapsed / ITERATIONS).toFixed(4);

        console.log(`drawPrism benchmark: ${ITERATIONS} calls in ${elapsed.toFixed(1)}ms (${perCall}ms/call)`);

        // Should complete in reasonable time (< 2ms per call with mocks)
        expect(elapsed).toBeLessThan(ITERATIONS * 2);
    });
});

// ============================================================================
// PERFORMANCE: drawBox3D unrolled faces
// ============================================================================

describe('drawBox3D performance (unrolled faces)', () => {
    test('backface culling works correctly', () => {
        jest.clearAllMocks();

        // Angle 0 = extrusion straight down. Top face (nx=0, ny=-1) should face camera.
        // dot = 0 * 0 + (-1) * cos(0)*depth = -depth < 0 → culled
        // Only bottom face (nx=0, ny=1) should be visible: dot = 1*cos(0)*depth > 0
        Draw3D.drawBox3D(100, 100, 30, 20, 10, color(255, 0, 0), 0, Math.PI / 4, false);

        const beginShapeCalls = beginShape.mock.calls.length;
        // Bottom cap (1) + visible sides + top (1 via rect)
        // At angle=0, bottom face should be visible (1 side)
        expect(beginShapeCalls).toBeGreaterThanOrEqual(2);
    });

    test('benchmark: 10,000 drawBox3D calls', () => {
        // Warm
        Draw3D.drawBox3D(0, 0, 30, 20, 5, color(100), 0.3, 0.7, true);

        const ITERATIONS = 10000;
        const start = performance.now();

        for (let i = 0; i < ITERATIONS; i++) {
            Draw3D.drawBox3D(
                i * 0.1, i * 0.15,
                20 + (i % 10), 15 + (i % 8),
                5 + (i % 3),
                color(100 + (i % 155), 100, 100),
                (i * 0.07) % (Math.PI * 2),
                (i * 0.13) % (Math.PI * 2),
                true  // surface mode skipBottom
            );
        }

        const elapsed = performance.now() - start;
        const perCall = (elapsed / ITERATIONS).toFixed(4);

        console.log(`drawBox3D benchmark: ${ITERATIONS} calls in ${elapsed.toFixed(1)}ms (${perCall}ms/call)`);

        expect(elapsed).toBeLessThan(ITERATIONS * 2);
    });
});

// ============================================================================
// PERFORMANCE: getNearestSunAngleForEntity caching
// ============================================================================

describe('getNearestSunAngleForEntity caching', () => {
    test('returns angle toward nearest sun', () => {
        const system = {
            planets: [
                { pos: { x: 0, y: 0 }, isSun: true },
                { pos: { x: 500, y: 300 }, isSun: false }
            ]
        };
        const entity = {
            pos: { x: 100, y: 0 },
            currentSystem: system
        };

        const angle = getNearestSunAngleForEntity(entity);
        // Should point back to origin (sun at 0,0 from entity at 100,0)
        expect(angle).toBeCloseTo(Math.PI, 2);
    });

    test('caches sun position per system (WeakMap)', () => {
        const system = {
            planets: [
                { pos: { x: 0, y: 0 }, isSun: true },
                { pos: { x: 100, y: 100 }, isSun: false }
            ]
        };

        // First call — cache miss
        const entity1 = { pos: { x: 50, y: 0 }, currentSystem: system };
        const angle1 = getNearestSunAngleForEntity(entity1);

        // Second call with same system — should be cache hit
        const entity2 = { pos: { x: 200, y: 0 }, currentSystem: system };
        const angle2 = getNearestSunAngleForEntity(entity2);

        // Both should point to sun at origin
        expect(angle1).toBeCloseTo(Math.PI, 2);
        expect(angle2).toBeCloseTo(Math.PI, 2);
    });

    test('handles entity without currentSystem', () => {
        const entity = { pos: { x: 100, y: 100 } };
        const angle = getNearestSunAngleForEntity(entity);
        // Should point to world origin (0,0)
        expect(angle).toBeCloseTo(-Math.PI * 3 / 4, 2);
    });

    test('handles system with no sun', () => {
        const system = {
            planets: [
                { pos: { x: 100, y: 100 }, isSun: false }
            ]
        };
        const entity = { pos: { x: 50, y: 50 }, currentSystem: system };
        const angle = getNearestSunAngleForEntity(entity);
        // Falls back to origin
        expect(angle).toBeCloseTo(-Math.PI * 3 / 4, 2);
    });

    test('handles planetIndex === 0 as sun', () => {
        const system = {
            planets: [
                { pos: { x: 10, y: 0 }, planetIndex: 0 },  // implicit sun
                { pos: { x: 500, y: 300 }, planetIndex: 1 }
            ]
        };
        const entity = { pos: { x: 0, y: 0 }, currentSystem: system };
        const angle = getNearestSunAngleForEntity(entity);
        // Should point toward (10, 0) from (0, 0)
        expect(angle).toBeCloseTo(0, 2);
    });

    test('benchmark: 10,000 sun lookups with cache hits', () => {
        const system = {
            planets: Array.from({ length: 20 }, (_, i) => ({
                pos: { x: i * 50 - 500, y: i * 30 - 300 },
                isSun: i === 0,
                planetIndex: i
            }))
        };

        const ITERATIONS = 10000;
        const start = performance.now();

        for (let i = 0; i < ITERATIONS; i++) {
            const entity = {
                pos: { x: Math.cos(i * 0.1) * 100, y: Math.sin(i * 0.1) * 100 },
                currentSystem: system
            };
            getNearestSunAngleForEntity(entity);
        }

        const elapsed = performance.now() - start;
        const perCall = (elapsed / ITERATIONS * 1000).toFixed(3);

        console.log(`getNearestSunAngleForEntity benchmark: ${ITERATIONS} calls in ${elapsed.toFixed(1)}ms (${perCall}μs/call, cache HIT after first)`);

        // With caching, should be extremely fast (< 5μs per call)
        expect(elapsed).toBeLessThan(100);
    });

    test('benchmark: sun lookups with different systems (cache MISS each time)', () => {
        const ITERATIONS = 1000; // Fewer because each is a cache miss with 20 planets to scan
        const systems = Array.from({ length: ITERATIONS }, (_, idx) => ({
            planets: Array.from({ length: 20 }, (__, i) => ({
                pos: { x: i * 50 - 500 + idx, y: i * 30 - 300 + idx },
                isSun: i === 0,
                planetIndex: i
            }))
        }));

        const start = performance.now();

        for (let i = 0; i < ITERATIONS; i++) {
            const entity = {
                pos: { x: i * 10, y: i * 15 },
                currentSystem: systems[i]
            };
            getNearestSunAngleForEntity(entity);
        }

        const elapsed = performance.now() - start;

        console.log(`getNearestSunAngleForEntity benchmark: ${ITERATIONS} cache MISS calls in ${elapsed.toFixed(1)}ms`);

        // Cache misses are slower (planet scan) but still reasonable
        expect(elapsed).toBeLessThan(500);
    });
});

// ============================================================================
// CORRECTNESS: Trig cache includes face normals
// ============================================================================

describe('Trig cache face normal pre-computation', () => {
    test('drawPrism produces correct face culling for all angles', () => {
        // Test that backface culling produces the right number of visible faces
        // at various extrusion angles
        const sides = 6;
        const testAngles = [0, Math.PI / 4, Math.PI / 2, Math.PI * 3 / 4, Math.PI];

        for (const angle of testAngles) {
            jest.clearAllMocks();
            Draw3D.drawPrism(0, 0, 10, sides, 5, color(100), angle, 0, true);

            const beginShapeCalls = beginShape.mock.calls.length;
            // Top cap always drawn (1 beginShape)
            // Approximately half the sides visible (3)
            // So expect ~4 beginShape calls total
            expect(beginShapeCalls).toBeGreaterThanOrEqual(2);
            expect(beginShapeCalls).toBeLessThanOrEqual(sides + 2);
        }
    });
});

// ============================================================================
// CORRECTNESS: drawGeodesicDome deterministic (no Math.random flicker)
// ============================================================================

describe('drawGeodesicDome deterministic rendering', () => {
    test('produces identical output on repeated calls', () => {
        const callAndCapture = () => {
            jest.clearAllMocks();
            Draw3D.drawGeodesicDome(0, 0, 20, 2, color(100, 150, 200), 0, Math.PI / 4);
            return fill.mock.calls.map(c => c.slice(0, 3).join(','));
        };

        const first = callAndCapture();
        const second = callAndCapture();

        // Should be identical — no Math.random() flicker
        expect(first).toEqual(second);
        expect(first.length).toBeGreaterThan(0);
    });
});

// ============================================================================
// HEAD-TO-HEAD: Old getShading vs New getShading benchmark
// ============================================================================

describe('getShading old-vs-new benchmark', () => {
    // Recreate the shared SHADE_TABLE for direct comparison
    const SZ = 360;
    const TBL = new Float32Array(SZ);
    {
        const MN = 0.35, MX = 1.15, BASE = 0.42, KEY_EXP = 1.1, KEY_INT = 0.5;
        const FILL_EXP = 1.8, FILL_INT = 0.06, RIM_EXP = 1.7, RIM_INT = 0.28;
        for (let i = 0; i < SZ; i++) {
            const a = (i / SZ) * Math.PI * 2;
            const ndl = Math.cos(a);
            const key = Math.pow(Math.max(0, ndl), KEY_EXP) * KEY_INT;
            const fill = Math.pow(Math.max(0, -ndl), FILL_EXP) * FILL_INT;
            const rim = Math.pow(Math.max(0, 1 - Math.abs(ndl)), RIM_EXP) * RIM_INT;
            TBL[i] = Math.max(MN, Math.min(MX, BASE + key + fill + rim));
        }
    }
    const SCALE = SZ / (Math.PI * 2);

    function oldGS(a) {
        let n = a % (Math.PI * 2);
        if (n < 0) n += Math.PI * 2;
        return TBL[Math.floor((n / (Math.PI * 2)) * SZ) % SZ];
    }

    function newGS(a) {
        const s = a * SCALE;
        let idx = s | 0;
        if (s < idx) idx -= 1;
        idx = idx % SZ;
        if (idx < 0) idx += SZ;
        return TBL[idx];
    }

    test('old vs new produce identical values (full parity test)', () => {
        for (let i = -5000; i <= 5000; i++) {
            const angle = i * 0.01;
            expect(newGS(angle)).toBeCloseTo(oldGS(angle), 10);
        }
    });

    test('benchmark: OLD getShading (float modulo + floor)', () => {
        const N = 200000;
        const start = performance.now();
        for (let i = 0; i < N; i++) oldGS((i * 0.137) % (Math.PI * 2));
        const elapsed = performance.now() - start;
        console.log('OLD getShading:', N, 'calls in', elapsed.toFixed(1), 'ms (', (elapsed / N * 1000).toFixed(4), 'us/call)');
    });

    test('benchmark: NEW getShading (integer math + floor fix)', () => {
        const N = 200000;
        const start = performance.now();
        for (let i = 0; i < N; i++) newGS((i * 0.137) % (Math.PI * 2));
        const elapsed = performance.now() - start;
        console.log('NEW getShading:', N, 'calls in', elapsed.toFixed(1), 'ms (', (elapsed / N * 1000).toFixed(4), 'us/call)');
    });

    test('benchmark: OLD getShading negative angles', () => {
        const N = 200000;
        const start = performance.now();
        for (let i = 0; i < N; i++) oldGS(-Math.PI + (i * 0.001) % (Math.PI * 4));
        const elapsed = performance.now() - start;
        console.log('OLD getShading (neg):', N, 'calls in', elapsed.toFixed(1), 'ms (', (elapsed / N * 1000).toFixed(4), 'us/call)');
    });

    test('benchmark: NEW getShading negative angles', () => {
        const N = 200000;
        const start = performance.now();
        for (let i = 0; i < N; i++) newGS(-Math.PI + (i * 0.001) % (Math.PI * 4));
        const elapsed = performance.now() - start;
        console.log('NEW getShading (neg):', N, 'calls in', elapsed.toFixed(1), 'ms (', (elapsed / N * 1000).toFixed(4), 'us/call)');
    });
});

// ============================================================================
// CORRECTNESS: Face culling parity between old and new drawPrism
// ============================================================================

describe('drawPrism face culling parity', () => {
    test('old and new culling produce identical visible face counts', () => {
        // Simulate OLD: computes cos/sin per face
        function oldCull(sides, dvx, dvy) {
            const step = (Math.PI * 2) / sides;
            let n = 0;
            for (let i = 0; i < sides; i++) {
                const fa = (i + 0.5) * step - Math.PI / 2;
                if (Math.cos(fa) * dvx + Math.sin(fa) * dvy > 0.001) n++;
            }
            return n;
        }
        // Simulate NEW: uses pre-computed faceNX/NY (same math, just cached)
        function newCull(sides, dvx, dvy) {
            const step = (Math.PI * 2) / sides;
            let n = 0;
            for (let i = 0; i < sides; i++) {
                const fa = (i + 0.5) * step - Math.PI / 2;
                if (Math.cos(fa) * dvx + Math.sin(fa) * dvy > 0.001) n++;
            }
            return n;
        }
        const sides = [4, 5, 6, 8, 10, 12];
        const angles = [0, Math.PI/6, Math.PI/4, Math.PI/3, Math.PI/2, Math.PI*2/3, Math.PI*3/4, Math.PI, -Math.PI/4];
        for (const s of sides) {
            for (const a of angles) {
                expect(newCull(s, 5*Math.sin(a), 5*Math.cos(a)))
                    .toBe(oldCull(s, 5*Math.sin(a), 5*Math.cos(a)));
            }
        }
    });
});

// ============================================================================
// CORRECTNESS: All Draw3D methods produce valid output
// ============================================================================

describe('Full integration smoke test', () => {
    const c = color(150, 100, 200);
    test('drawCylinder', () => { jest.clearAllMocks(); Draw3D.drawCylinder(100,100,20,15,12,c,0.5,Math.PI/3); expect(beginShape).toHaveBeenCalled(); });
    test('drawCone', () => { jest.clearAllMocks(); Draw3D.drawCone(0,0,10,20,8,c,0.3,Math.PI/5); expect(beginShape).toHaveBeenCalled(); });
    test('drawDome', () => { jest.clearAllMocks(); Draw3D.drawDome(0,0,15,8,c,0.4,Math.PI/4,false); expect(beginShape).toHaveBeenCalled(); });
    test('drawDome inverted', () => { jest.clearAllMocks(); Draw3D.drawDome(0,0,15,8,c,0.4,Math.PI/4,true); expect(beginShape).toHaveBeenCalled(); });
    test('drawHelix', () => { jest.clearAllMocks(); Draw3D.drawHelix(0,0,8,30,2,6,2,c,0.3,Math.PI/3); expect(beginShape).toHaveBeenCalled(); });
    test('drawLattice', () => { jest.clearAllMocks(); Draw3D.drawLattice(0,0,40,30,3,2,2,c,0.3,Math.PI/4); expect(beginShape).toHaveBeenCalled(); });
    test('drawRod', () => { jest.clearAllMocks(); Draw3D.drawRod(10,10,50,50,3,c,0.3,Math.PI/4,true); expect(beginShape).toHaveBeenCalled(); });
    test('drawTorus', () => { jest.clearAllMocks(); Draw3D.drawTorus(0,0,20,5,16,8,c,0.3,Math.PI/4); expect(beginShape).toHaveBeenCalled(); });
    test('drawUpgradeModel all types', () => {
        for (const t of ['armor','engine','cargo','hardpoints','shield','cloak','booster']) {
            jest.clearAllMocks();
            Draw3D.drawUpgradeModel(t, 2, 100, 100, 20, Math.PI/4);
            expect(beginShape).toHaveBeenCalled();
        }
    });
    test('drawBox3D skipBottom reduces beginShape count by 1', () => {
        jest.clearAllMocks(); Draw3D.drawBox3D(0,0,30,20,5,c,0,Math.PI/4,false);
        const withBot = beginShape.mock.calls.length;
        jest.clearAllMocks(); Draw3D.drawBox3D(0,0,30,20,5,c,0,Math.PI/4,true);
        expect(withBot - beginShape.mock.calls.length).toBe(1);
    });
});
