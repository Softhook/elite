/**
 * Test Harness - Lightweight testing framework for Elite game
 * Provides Jest/Mocha-like API: describe, it, expect
 * Runs in browser without external dependencies
 */

class TestHarness {
    constructor() {
        this.suites = [];
        this.currentSuite = null;
        this.results = {
            passed: 0,
            failed: 0,
            skipped: 0,
            total: 0
        };
        this.logs = [];
    }

    /**
     * Define a test suite
     */
    describe(name, fn) {
        const suite = {
            name,
            tests: [],
            beforeEach: null,
            afterEach: null,
            beforeAll: null,
            afterAll: null
        };
        this.suites.push(suite);
        this.currentSuite = suite;
        fn();
        this.currentSuite = null;
    }

    /**
     * Define a test case
     */
    it(name, fn) {
        if (!this.currentSuite) {
            throw new Error('it() must be called within describe()');
        }
        this.currentSuite.tests.push({ name, fn, skip: false });
    }

    /**
     * Skip a test case
     */
    xit(name, fn) {
        if (!this.currentSuite) {
            throw new Error('xit() must be called within describe()');
        }
        this.currentSuite.tests.push({ name, fn, skip: true });
    }

    /**
     * Setup before each test in suite
     */
    beforeEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeEach = fn;
        }
    }

    /**
     * Cleanup after each test in suite
     */
    afterEach(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterEach = fn;
        }
    }

    /**
     * Setup before all tests in suite
     */
    beforeAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.beforeAll = fn;
        }
    }

    /**
     * Cleanup after all tests in suite
     */
    afterAll(fn) {
        if (this.currentSuite) {
            this.currentSuite.afterAll = fn;
        }
    }

    /**
     * Create an expectation
     */
    expect(actual) {
        return new Expectation(actual);
    }

    /**
     * Run all test suites
     */
    async run() {
        this.results = { passed: 0, failed: 0, skipped: 0, total: 0 };
        this.logs = [];

        for (const suite of this.suites) {
            this.log(`\n📦 ${suite.name}`, 'suite');

            if (suite.beforeAll) {
                try {
                    await suite.beforeAll();
                } catch (e) {
                    this.log(`  ❌ beforeAll failed: ${e.message}`, 'error');
                }
            }

            for (const test of suite.tests) {
                this.results.total++;

                if (test.skip) {
                    this.results.skipped++;
                    this.log(`  ⏭️ ${test.name} (skipped)`, 'skip');
                    continue;
                }

                try {
                    if (suite.beforeEach) await suite.beforeEach();
                    await test.fn();
                    if (suite.afterEach) await suite.afterEach();

                    this.results.passed++;
                    this.log(`  ✅ ${test.name}`, 'pass');
                } catch (e) {
                    this.results.failed++;
                    this.log(`  ❌ ${test.name}`, 'fail');
                    this.log(`     ${e.message}`, 'error');
                }
            }

            if (suite.afterAll) {
                try {
                    await suite.afterAll();
                } catch (e) {
                    this.log(`  ❌ afterAll failed: ${e.message}`, 'error');
                }
            }
        }

        this.logSummary();
        return this.results;
    }

    log(message, type = 'info') {
        this.logs.push({ message, type });
    }

    logSummary() {
        this.log('\n' + '='.repeat(50), 'divider');
        this.log(`📊 Results: ${this.results.passed} passed, ${this.results.failed} failed, ${this.results.skipped} skipped`, 'summary');
    }

    /**
     * Render results to DOM
     */
    renderToDOM(containerId = 'test-results') {
        let container = document.getElementById(containerId);
        if (!container) {
            container = document.createElement('div');
            container.id = containerId;
            document.body.appendChild(container);
        }

        const styles = {
            suite: 'color: #64b5f6; font-weight: bold; font-size: 14px;',
            pass: 'color: #81c784;',
            fail: 'color: #e57373; font-weight: bold;',
            skip: 'color: #ffb74d;',
            error: 'color: #e57373; font-size: 12px; margin-left: 20px;',
            summary: 'font-weight: bold; font-size: 14px; margin-top: 10px;',
            divider: 'color: #666;',
            info: 'color: #ccc;'
        };

        let html = '<pre style="background: #1e1e1e; color: #d4d4d4; padding: 16px; border-radius: 8px; font-family: monospace; line-height: 1.6;">';

        for (const log of this.logs) {
            const style = styles[log.type] || styles.info;
            html += `<span style="${style}">${this.escapeHtml(log.message)}</span>\n`;
        }

        html += '</pre>';

        // Add summary banner
        const bannerColor = this.results.failed > 0 ? '#c62828' : '#2e7d32';
        html = `<div style="background: ${bannerColor}; color: white; padding: 12px 16px; border-radius: 8px 8px 0 0; font-weight: bold;">
            ${this.results.failed > 0 ? '❌ TESTS FAILED' : '✅ ALL TESTS PASSED'}
            — ${this.results.passed}/${this.results.total} passed
        </div>` + html;

        container.innerHTML = html;
    }

    escapeHtml(text) {
        const div = document.createElement('div');
        div.textContent = text;
        return div.innerHTML;
    }
}

/**
 * Expectation class for assertions
 */
class Expectation {
    constructor(actual) {
        this.actual = actual;
        this.negated = false;
    }

    get not() {
        this.negated = true;
        return this;
    }

    _assert(condition, message) {
        const result = this.negated ? !condition : condition;
        if (!result) {
            throw new Error(message);
        }
    }

    toBe(expected) {
        this._assert(
            this.actual === expected,
            `Expected ${JSON.stringify(this.actual)} ${this.negated ? 'not ' : ''}to be ${JSON.stringify(expected)}`
        );
    }

    toEqual(expected) {
        const isEqual = this._deepEqual(this.actual, expected);
        this._assert(
            isEqual,
            `Expected ${JSON.stringify(this.actual)} ${this.negated ? 'not ' : ''}to equal ${JSON.stringify(expected)}`
        );
    }

    toBeCloseTo(expected, precision = 2) {
        const factor = Math.pow(10, precision);
        const isClose = Math.round(this.actual * factor) === Math.round(expected * factor);
        this._assert(
            isClose,
            `Expected ${this.actual} ${this.negated ? 'not ' : ''}to be close to ${expected}`
        );
    }

    toBeTruthy() {
        this._assert(
            !!this.actual,
            `Expected ${JSON.stringify(this.actual)} ${this.negated ? 'not ' : ''}to be truthy`
        );
    }

    toBeFalsy() {
        this._assert(
            !this.actual,
            `Expected ${JSON.stringify(this.actual)} ${this.negated ? 'not ' : ''}to be falsy`
        );
    }

    toBeNull() {
        this._assert(
            this.actual === null,
            `Expected ${JSON.stringify(this.actual)} ${this.negated ? 'not ' : ''}to be null`
        );
    }

    toBeUndefined() {
        this._assert(
            this.actual === undefined,
            `Expected ${JSON.stringify(this.actual)} ${this.negated ? 'not ' : ''}to be undefined`
        );
    }

    toBeDefined() {
        this._assert(
            this.actual !== undefined,
            `Expected value ${this.negated ? 'not ' : ''}to be defined`
        );
    }

    toBeGreaterThan(expected) {
        this._assert(
            this.actual > expected,
            `Expected ${this.actual} ${this.negated ? 'not ' : ''}to be greater than ${expected}`
        );
    }

    toBeGreaterThanOrEqual(expected) {
        this._assert(
            this.actual >= expected,
            `Expected ${this.actual} ${this.negated ? 'not ' : ''}to be >= ${expected}`
        );
    }

    toBeLessThan(expected) {
        this._assert(
            this.actual < expected,
            `Expected ${this.actual} ${this.negated ? 'not ' : ''}to be less than ${expected}`
        );
    }

    toBeLessThanOrEqual(expected) {
        this._assert(
            this.actual <= expected,
            `Expected ${this.actual} ${this.negated ? 'not ' : ''}to be <= ${expected}`
        );
    }

    toContain(item) {
        let contains = false;
        if (typeof this.actual === 'string') {
            contains = this.actual.includes(item);
        } else if (Array.isArray(this.actual)) {
            contains = this.actual.includes(item);
        }
        this._assert(
            contains,
            `Expected ${JSON.stringify(this.actual)} ${this.negated ? 'not ' : ''}to contain ${JSON.stringify(item)}`
        );
    }

    toHaveLength(expected) {
        const length = this.actual?.length;
        this._assert(
            length === expected,
            `Expected length ${length} ${this.negated ? 'not ' : ''}to be ${expected}`
        );
    }

    toHaveProperty(prop, value) {
        const hasProp = this.actual && prop in this.actual;
        if (value !== undefined) {
            this._assert(
                hasProp && this.actual[prop] === value,
                `Expected property '${prop}' ${this.negated ? 'not ' : ''}to be ${JSON.stringify(value)}`
            );
        } else {
            this._assert(
                hasProp,
                `Expected object ${this.negated ? 'not ' : ''}to have property '${prop}'`
            );
        }
    }

    toBeInstanceOf(expected) {
        this._assert(
            this.actual instanceof expected,
            `Expected ${this.actual?.constructor?.name} ${this.negated ? 'not ' : ''}to be instance of ${expected.name}`
        );
    }

    toThrow(expectedMessage) {
        let threw = false;
        let actualMessage = '';
        try {
            this.actual();
        } catch (e) {
            threw = true;
            actualMessage = e.message;
        }

        if (expectedMessage) {
            this._assert(
                threw && actualMessage.includes(expectedMessage),
                `Expected function ${this.negated ? 'not ' : ''}to throw "${expectedMessage}", got "${actualMessage}"`
            );
        } else {
            this._assert(
                threw,
                `Expected function ${this.negated ? 'not ' : ''}to throw`
            );
        }
    }

    toMatch(pattern) {
        const regex = typeof pattern === 'string' ? new RegExp(pattern) : pattern;
        this._assert(
            regex.test(this.actual),
            `Expected "${this.actual}" ${this.negated ? 'not ' : ''}to match ${pattern}`
        );
    }

    _deepEqual(a, b) {
        if (a === b) return true;
        if (typeof a !== typeof b) return false;
        if (a === null || b === null) return a === b;
        if (typeof a !== 'object') return a === b;

        if (Array.isArray(a) !== Array.isArray(b)) return false;

        const keysA = Object.keys(a);
        const keysB = Object.keys(b);
        if (keysA.length !== keysB.length) return false;

        for (const key of keysA) {
            if (!this._deepEqual(a[key], b[key])) return false;
        }
        return true;
    }
}

// ============================================
// Mock p5.js primitives for non-visual tests
// ============================================

class MockVector {
    constructor(x = 0, y = 0, z = 0) {
        this.x = x;
        this.y = y;
        this.z = z;
    }

    set(x, y, z) {
        this.x = x;
        this.y = y ?? this.y;
        this.z = z ?? this.z;
        return this;
    }

    copy() {
        return new MockVector(this.x, this.y, this.z);
    }

    add(v) {
        if (v instanceof MockVector) {
            this.x += v.x;
            this.y += v.y;
            this.z += v.z;
        } else {
            this.x += v;
            this.y += arguments[1] || 0;
            this.z += arguments[2] || 0;
        }
        return this;
    }

    sub(v) {
        if (v instanceof MockVector) {
            this.x -= v.x;
            this.y -= v.y;
            this.z -= v.z;
        } else {
            this.x -= v;
            this.y -= arguments[1] || 0;
            this.z -= arguments[2] || 0;
        }
        return this;
    }

    mult(n) {
        this.x *= n;
        this.y *= n;
        this.z *= n;
        return this;
    }

    div(n) {
        if (n !== 0) {
            this.x /= n;
            this.y /= n;
            this.z /= n;
        }
        return this;
    }

    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y + this.z * this.z);
    }

    magSq() {
        return this.x * this.x + this.y * this.y + this.z * this.z;
    }

    normalize() {
        const m = this.mag();
        if (m > 0) {
            this.div(m);
        }
        return this;
    }

    setMag(len) {
        return this.normalize().mult(len);
    }

    limit(max) {
        const m = this.mag();
        if (m > max) {
            this.setMag(max);
        }
        return this;
    }

    heading() {
        return Math.atan2(this.y, this.x);
    }

    rotate(angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const x = this.x * cos - this.y * sin;
        const y = this.x * sin + this.y * cos;
        this.x = x;
        this.y = y;
        return this;
    }

    dist(v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        const dz = this.z - v.z;
        return Math.sqrt(dx * dx + dy * dy + dz * dz);
    }

    dot(v) {
        return this.x * v.x + this.y * v.y + this.z * v.z;
    }

    static add(v1, v2) {
        return new MockVector(v1.x + v2.x, v1.y + v2.y, v1.z + v2.z);
    }

    static sub(v1, v2) {
        return new MockVector(v1.x - v2.x, v1.y - v2.y, v1.z - v2.z);
    }

    static mult(v, n) {
        return new MockVector(v.x * n, v.y * n, v.z * n);
    }

    static div(v, n) {
        return new MockVector(v.x / n, v.y / n, v.z / n);
    }

    static dist(v1, v2) {
        return v1.dist(v2);
    }

    static fromAngle(angle, length = 1) {
        return new MockVector(Math.cos(angle) * length, Math.sin(angle) * length, 0);
    }
}

/**
 * Setup mock p5 globals for testing
 */
function setupMockP5() {
    if (typeof window !== 'undefined') {
        // Create mock p5 functions
        window.createVector = (x, y, z) => new MockVector(x, y, z);
        window.random = (min, max) => {
            if (max === undefined) {
                if (min === undefined) return Math.random();
                return Math.random() * min;
            }
            return min + Math.random() * (max - min);
        };
        window.floor = Math.floor;
        window.exp = Math.exp;
        window.min = Math.min;
        window.max = Math.max;
        window.abs = Math.abs;
        window.sqrt = Math.sqrt;
        window.pow = Math.pow;
        window.sin = Math.sin;
        window.cos = Math.cos;
        window.tan = Math.tan;
        window.atan2 = Math.atan2;
        window.radians = (deg) => deg * Math.PI / 180;
        window.degrees = (rad) => rad * 180 / Math.PI;
        window.constrain = (n, low, high) => Math.max(low, Math.min(high, n));
        window.map = (value, start1, stop1, start2, stop2) => {
            return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
        };
        window.lerp = (start, stop, amt) => start + (stop - start) * amt;
        window.dist = (x1, y1, x2, y2) => Math.sqrt((x2 - x1) ** 2 + (y2 - y1) ** 2);
        window.noise = () => Math.random(); // Simple noise approximation
        window.noiseSeed = () => { };
        window.randomSeed = () => { };
        window.color = (r, g, b, a) => ({ r, g, b, a: a ?? 255, levels: [r, g, b, a ?? 255] });
        window.red = (c) => c.r || c.levels?.[0] || 0;
        window.green = (c) => c.g || c.levels?.[1] || 0;
        window.blue = (c) => c.b || c.levels?.[2] || 0;
        window.alpha = (c) => c.a || c.levels?.[3] || 255;
        window.lerpColor = (c1, c2, amt) => ({
            r: c1.r + (c2.r - c1.r) * amt,
            g: c1.g + (c2.g - c1.g) * amt,
            b: c1.b + (c2.b - c1.b) * amt,
            a: (c1.a ?? 255) + ((c2.a ?? 255) - (c1.a ?? 255)) * amt
        });
        window.frameCount = 0;
        window.deltaTime = 16.67; // ~60fps
        window.millis = () => performance.now();
        window.width = 800;
        window.height = 600;
        window.PI = Math.PI;
        window.TWO_PI = Math.PI * 2;
        window.HALF_PI = Math.PI / 2;
        window.QUARTER_PI = Math.PI / 4;

        // Drawing stubs (no-op for tests)
        window.push = () => { };
        window.pop = () => { };
        window.translate = () => { };
        window.rotate = () => { };
        window.scale = () => { };
        window.fill = () => { };
        window.stroke = () => { };
        window.noFill = () => { };
        window.noStroke = () => { };
        window.strokeWeight = () => { };
        window.ellipse = () => { };
        window.rect = () => { };
        window.line = () => { };
        window.beginShape = () => { };
        window.endShape = () => { };
        window.vertex = () => { };
        window.text = () => { };
        window.textSize = () => { };
        window.textAlign = () => { };
        window.background = () => { };
        window.clear = () => { };
        window.createCanvas = () => { };
        window.createGraphics = () => ({
            clear: () => { },
            background: () => { },
            push: () => { },
            pop: () => { },
            translate: () => { },
            rotate: () => { },
            fill: () => { },
            stroke: () => { },
            noFill: () => { },
            noStroke: () => { },
            ellipse: () => { },
            rect: () => { },
            line: () => { },
            beginShape: () => { },
            endShape: () => { },
            vertex: () => { }
        });
        window.image = () => { };
        window.angleMode = () => { };
        window.RADIANS = 'radians';
        window.DEGREES = 'degrees';
        window.LEFT = 'left';
        window.RIGHT = 'right';
        window.CENTER = 'center';
        window.TOP = 'top';
        window.BOTTOM = 'bottom';
        window.CLOSE = true;

        // Game-specific mocks
        window.gameStateManager = {
            setState: () => { },
            getState: () => 'GAMEPLAY',
            isState: () => false
        };
        window.soundManager = {
            playSound: () => { },
            playWorldSound: () => { },
            stopAllSounds: () => { }
        };
        window.uiManager = {
            addMessage: () => { }
        };
    }
}

// Global test harness instance
const testHarness = new TestHarness();

// Export convenience functions
function describe(name, fn) { testHarness.describe(name, fn); }
function it(name, fn) { testHarness.it(name, fn); }
function xit(name, fn) { testHarness.xit(name, fn); }
function expect(actual) { return testHarness.expect(actual); }
function beforeEach(fn) { testHarness.beforeEach(fn); }
function afterEach(fn) { testHarness.afterEach(fn); }
function beforeAll(fn) { testHarness.beforeAll(fn); }
function afterAll(fn) { testHarness.afterAll(fn); }

/**
 * Run all tests and render results
 */
async function runTests() {
    setupMockP5();
    await testHarness.run();
    testHarness.renderToDOM();
    return testHarness.results;
}
