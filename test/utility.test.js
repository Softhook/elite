/**
 * Utility Tests
 * Jest tests for core utility classes: ObjectPool, vector utilities, and math helpers.
 */

// Load source files
require('../objectPool.js');

// ============================================
// ObjectPool Tests
// ============================================

describe('ObjectPool', () => {
    class TestObject {
        constructor() {
            this.value = 0;
            this.active = false;
        }
        reset(value) {
            this.value = value;
            this.active = true;
        }
    }

    let pool;

    beforeEach(() => {
        pool = new ObjectPool(TestObject, 5, 10);
    });

    test('should create initial pool of objects', () => {
        const stats = pool.getStats();
        expect(stats.available).toBe(5);
        expect(stats.active).toBe(0);
        expect(stats.total).toBe(5);
    });

    test('should get object from pool', () => {
        const obj = pool.get(42);
        expect(obj).toBeTruthy();
        expect(obj.value).toBe(42);
        expect(obj.active).toBe(true);
    });

    test('should track active objects', () => {
        pool.get(1);
        pool.get(2);
        const stats = pool.getStats();
        expect(stats.active).toBe(2);
        expect(stats.available).toBe(3);
    });

    test('should release objects back to pool', () => {
        const obj = pool.get(1);
        pool.release(obj);
        const stats = pool.getStats();
        expect(stats.active).toBe(0);
        expect(stats.available).toBe(5);
    });

    test('should reuse released objects', () => {
        const obj1 = pool.get(1);
        pool.release(obj1);
        const obj2 = pool.get(2);
        expect(obj2).toBe(obj1); // Same object reused
        expect(obj2.value).toBe(2); // But reset with new value
    });

    test('should grow pool when needed', () => {
        // Exhaust initial pool
        for (let i = 0; i < 5; i++) {
            pool.get(i);
        }
        // Get one more
        const obj = pool.get(99);
        expect(obj).toBeTruthy();
        const stats = pool.getStats();
        expect(stats.active).toBe(6);
    });

    test('should respect max size limit', () => {
        const smallPool = new ObjectPool(TestObject, 2, 3);
        smallPool.get(1);
        smallPool.get(2);
        smallPool.get(3);
        const obj = smallPool.get(4); // Should fail - at max
        expect(obj).toBeNull();
    });

    test('should release all active objects', () => {
        pool.get(1);
        pool.get(2);
        pool.get(3);
        pool.releaseAll();
        const stats = pool.getStats();
        expect(stats.active).toBe(0);
        expect(stats.available).toBe(5);
    });

    test('should track reuse statistics', () => {
        const obj1 = pool.get(1);
        pool.release(obj1);
        pool.get(2);
        const stats = pool.getStats();
        expect(stats.reused).toBeGreaterThan(0);
    });

    test('should not release same object twice', () => {
        const obj = pool.get(1);
        pool.release(obj);
        pool.release(obj); // Second release should be ignored
        const stats = pool.getStats();
        expect(stats.available).toBe(5);
    });
});

// ============================================
// MockVector Tests (validates our mock)
// ============================================

describe('MockVector', () => {
    test('should create vector with components', () => {
        const v = createVector(3, 4);
        expect(v.x).toBe(3);
        expect(v.y).toBe(4);
    });

    test('should calculate magnitude', () => {
        const v = createVector(3, 4);
        expect(v.mag()).toBe(5);
    });

    test('should add vectors', () => {
        const v1 = createVector(1, 2);
        const v2 = createVector(3, 4);
        v1.add(v2);
        expect(v1.x).toBe(4);
        expect(v1.y).toBe(6);
    });

    test('should subtract vectors', () => {
        const v1 = createVector(5, 5);
        const v2 = createVector(2, 3);
        v1.sub(v2);
        expect(v1.x).toBe(3);
        expect(v1.y).toBe(2);
    });

    test('should multiply by scalar', () => {
        const v = createVector(2, 3);
        v.mult(2);
        expect(v.x).toBe(4);
        expect(v.y).toBe(6);
    });

    test('should normalize vector', () => {
        const v = createVector(3, 4);
        v.normalize();
        expect(v.mag()).toBeCloseTo(1, 5);
    });

    test('should copy vector', () => {
        const v1 = createVector(2, 3);
        const v2 = v1.copy();
        expect(v2.x).toBe(2);
        expect(v2.y).toBe(3);
        v2.x = 10;
        expect(v1.x).toBe(2); // Original unchanged
    });

    test('should calculate distance', () => {
        const v1 = createVector(0, 0);
        const v2 = createVector(3, 4);
        expect(v1.dist(v2)).toBe(5);
    });

    test('should calculate heading', () => {
        const v = createVector(1, 0);
        expect(v.heading()).toBe(0);
        const v2 = createVector(0, 1);
        expect(v2.heading()).toBeCloseTo(Math.PI / 2, 5);
    });

    test('should limit magnitude', () => {
        const v = createVector(10, 0);
        v.limit(5);
        expect(v.mag()).toBe(5);
    });

    test('should set magnitude', () => {
        const v = createVector(3, 4);
        v.setMag(10);
        expect(v.mag()).toBeCloseTo(10, 5);
    });
});

// ============================================
// Math Utility Tests
// ============================================

describe('Math Utilities', () => {
    test('constrain should clamp values', () => {
        expect(constrain(5, 0, 10)).toBe(5);
        expect(constrain(-5, 0, 10)).toBe(0);
        expect(constrain(15, 0, 10)).toBe(10);
    });

    test('lerp should interpolate', () => {
        expect(lerp(0, 10, 0.5)).toBe(5);
        expect(lerp(0, 10, 0)).toBe(0);
        expect(lerp(0, 10, 1)).toBe(10);
    });

    test('map should remap values', () => {
        expect(map(5, 0, 10, 0, 100)).toBe(50);
        expect(map(0, 0, 10, 100, 200)).toBe(100);
    });

    test('radians should convert degrees', () => {
        expect(radians(180)).toBeCloseTo(Math.PI, 5);
        expect(radians(90)).toBeCloseTo(Math.PI / 2, 5);
    });

    test('degrees should convert radians', () => {
        expect(degrees(Math.PI)).toBeCloseTo(180, 5);
        expect(degrees(Math.PI / 2)).toBeCloseTo(90, 5);
    });

    test('dist should calculate distance', () => {
        expect(dist(0, 0, 3, 4)).toBe(5);
        expect(dist(1, 1, 4, 5)).toBe(5);
    });

    test('random should return values in range', () => {
        for (let i = 0; i < 20; i++) {
            const r = random(5, 10);
            expect(r).toBeGreaterThanOrEqual(5);
            expect(r).toBeLessThan(10);
        }
    });

    test('floor should round down', () => {
        expect(floor(3.7)).toBe(3);
        expect(floor(-2.3)).toBe(-3);
    });

    test('ceil should round up', () => {
        expect(ceil(3.1)).toBe(4);
        expect(ceil(-2.9)).toBe(-2);
    });

    test('abs should return absolute value', () => {
        expect(abs(-5)).toBe(5);
        expect(abs(5)).toBe(5);
    });

    test('min/max should work', () => {
        expect(min(3, 7)).toBe(3);
        expect(max(3, 7)).toBe(7);
    });

    test('sqrt should calculate square root', () => {
        expect(sqrt(16)).toBe(4);
        expect(sqrt(2)).toBeCloseTo(1.414, 2);
    });
});

// ============================================
// P5 Trig Function Tests
// ============================================

describe('P5 Trig Functions', () => {
    test('sin should work', () => {
        expect(sin(0)).toBe(0);
        expect(sin(Math.PI / 2)).toBeCloseTo(1, 5);
    });

    test('cos should work', () => {
        expect(cos(0)).toBe(1);
        expect(cos(Math.PI)).toBeCloseTo(-1, 5);
    });

    test('atan2 should work', () => {
        expect(atan2(0, 1)).toBe(0);
        expect(atan2(1, 0)).toBeCloseTo(Math.PI / 2, 5);
    });
});

// ============================================
// Constants Tests
// ============================================

describe('Math Constants', () => {
    test('PI should be defined', () => {
        expect(PI).toBeCloseTo(Math.PI, 10);
    });

    test('TWO_PI should be 2*PI', () => {
        expect(TWO_PI).toBeCloseTo(2 * Math.PI, 10);
    });

    test('HALF_PI should be PI/2', () => {
        expect(HALF_PI).toBeCloseTo(Math.PI / 2, 10);
    });
});
