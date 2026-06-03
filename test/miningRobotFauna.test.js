/**
 * Mining Robot and Fauna Tests
 * Jest tests for the mining robot and fauna systems including:
 * - Background mining activity
 * - Base destruction and robot count synchronization
 * - Fauna-robot collision interactions
 * - Fauna-base attack behavior
 */

// ============================================
// Mock Dependencies - Must be first
// ============================================

// Global p5 constants
global.TWO_PI = Math.PI * 2;
global.PI = Math.PI;

// Mock p5 Vector
class MockVector {
    constructor(x = 0, y = 0) {
        this.x = x;
        this.y = y;
    }
    set(x, y) {
        this.x = x;
        this.y = y;
    }
    copy() {
        return new MockVector(this.x, this.y);
    }
    add(v) {
        this.x += v.x;
        this.y += v.y;
        return this;
    }
    sub(v) {
        this.x -= v.x;
        this.y -= v.y;
        return this;
    }
    mult(s) {
        this.x *= s;
        this.y *= s;
        return this;
    }
    limit(max) {
        const mag = Math.sqrt(this.x * this.x + this.y * this.y);
        if (mag > max) {
            this.x = (this.x / mag) * max;
            this.y = (this.y / mag) * max;
        }
        return this;
    }
    mag() {
        return Math.sqrt(this.x * this.x + this.y * this.y);
    }
    normalize() {
        const m = this.mag();
        if (m > 0) {
            this.x /= m;
            this.y /= m;
        }
        return this;
    }
    heading() {
        return Math.atan2(this.y, this.x);
    }
    static dist(v1, v2) {
        const dx = v2.x - v1.x;
        const dy = v2.y - v1.y;
        return Math.sqrt(dx * dx + dy * dy);
    }
    static sub(v1, v2) {
        return new MockVector(v1.x - v2.x, v1.y - v2.y);
    }
}

global.createVector = (x = 0, y = 0) => new MockVector(x, y);
global.p5 = { Vector: MockVector };

// Mock p5 functions
global.color = jest.fn((r, g, b, a) => ({ r, g, b, a: a || 255 }));
global.red = jest.fn(c => c?.r || 0);
global.green = jest.fn(c => c?.g || 0);
global.blue = jest.fn(c => c?.b || 0);
global.constrain = jest.fn((val, min, max) => Math.min(Math.max(val, min), max));
global.map = jest.fn((value, start1, stop1, start2, stop2) => {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
});
global.random = jest.fn((a, b) => {
    if (b === undefined) return Math.random() * a;
    return a + Math.random() * (b - a);
});
global.noise = jest.fn(() => 0.5);
global.abs = Math.abs;
global.sin = Math.sin;
global.cos = Math.cos;

// Mock graphics
global.push = jest.fn();
global.pop = jest.fn();
global.translate = jest.fn();
global.rotate = jest.fn();
global.stroke = jest.fn();
global.noStroke = jest.fn();
global.fill = jest.fn();
global.noFill = jest.fn();
global.strokeWeight = jest.fn();
global.rect = jest.fn();
global.ellipse = jest.fn();
global.line = jest.fn();

// Mock SURFACE_CONFIG
global.SURFACE_CONFIG = {
    UPDATE_RANGE: 2000
};

// Mock Draw3D
global.Draw3D = {
    drawBox3D: jest.fn(),
    drawPrism: jest.fn(),
    drawCylinder: jest.fn()
};

// Mock getProjectionHelpers
global.getProjectionHelpers = jest.fn((x, y, alt) => ({
    baseX: x,
    baseY: y,
    extrusionAngle: 0.5
}));

// Load the module being tested
const { MiningRobot, OreSeam, MINING_CONFIG, ROBOT_STATE } = require('../miningRobot.js');
const {
    SurfaceFlora, SurfaceFauna,
    SlitherCreature, FloaterCreature, RollerCreature, StalkCreature
} = require('../surfaceFloraFauna.js');

// ============================================
// Test Helpers
// ============================================

function createMockBase(x = 0, y = 0) {
    return {
        pos: createVector(x, y),
        size: 60,
        destroyed: false,
        playerBuilt: true,
        miningStorage: [],
        miningStorageCapacity: MINING_CONFIG.STORAGE_CAPACITY,
        robotCount: 3,
        cellKey: `${Math.floor(x / 100)},${Math.floor(y / 100)}`,
        takeDamage: jest.fn(function (amount) {
            this.health = (this.health || 1000) - amount;
            if (this.health <= 0) this.destroyed = true;
        })
    };
}

function createMockSurfaceMode(options = {}) {
    const base = options.base || createMockBase(100, 100);
    return {
        player: { pos: createVector(0, 0) },
        surfaceObjects: options.surfaceObjects || [base],
        playerBuiltMap: new Map([[base.cellKey, {
            robotCount: base.robotCount,
            miningStorage: base.miningStorage,
            destroyed: false
        }]]),
        _createSurfaceExplosion: jest.fn(),
        _getTerrainHeightAt: jest.fn(() => 0)
    };
}

// ============================================
// MiningRobot Constructor Tests
// ============================================

describe('MiningRobot Deterministic Initialization', () => {
    test('constructor creates deterministic angle from position', () => {
        const oreSeams = new Map();
        const base = createMockBase(100, 100);

        const robot1 = new MiningRobot(50, 75, base, oreSeams);
        const robot2 = new MiningRobot(50, 75, base, oreSeams);

        expect(robot1.angle).toBe(robot2.angle);
        expect(robot1.angle).toBeGreaterThanOrEqual(0);
        expect(robot1.angle).toBeLessThanOrEqual(TWO_PI);
    });

    test('constructor creates deterministic lightTimer from position', () => {
        const oreSeams = new Map();
        const base = createMockBase(100, 100);

        const robot1 = new MiningRobot(50, 75, base, oreSeams);
        const robot2 = new MiningRobot(50, 75, base, oreSeams);

        expect(robot1.lightTimer).toBe(robot2.lightTimer);
    });

    test('different positions produce different angles', () => {
        const oreSeams = new Map();
        const base = createMockBase(100, 100);

        const robot1 = new MiningRobot(50, 75, base, oreSeams);
        const robot2 = new MiningRobot(150, 275, base, oreSeams);

        expect(robot1.angle).not.toBe(robot2.angle);
    });

    test('initializes with correct default values', () => {
        const oreSeams = new Map();
        const base = createMockBase(100, 100);

        const robot = new MiningRobot(50, 75, base, oreSeams);

        expect(robot.health).toBe(50);
        expect(robot.destroyed).toBe(false);
        expect(robot.cargo).toBe(0);
        expect(robot.state).toBe(ROBOT_STATE.IDLE);
    });
});

// ============================================
// MiningRobot Fauna Collision Tests
// ============================================

describe('MiningRobot Fauna Collisions', () => {
    let robot, base, oreSeams;

    beforeEach(() => {
        oreSeams = new Map();
        base = createMockBase(100, 100);
        robot = new MiningRobot(50, 50, base, oreSeams);
    });

    test('checkFaunaCollisions handles null surfaceMode gracefully', () => {
        expect(() => robot.checkFaunaCollisions(null)).not.toThrow();
        expect(() => robot.checkFaunaCollisions(undefined)).not.toThrow();
    });

    test('checkFaunaCollisions handles missing surfaceObjects gracefully', () => {
        const sm = { player: { pos: createVector(0, 0) } };
        expect(() => robot.checkFaunaCollisions(sm)).not.toThrow();
    });

    test('robot takes damage from fauna collision', () => {
        const fauna = new SlitherCreature(50, 50, 15, [color(100, 100, 100)], 12345);
        const sm = createMockSurfaceMode({ surfaceObjects: [fauna] });

        robot.checkFaunaCollisions(sm);

        expect(robot.destroyed).toBe(true);
    });

    test('robot survives when fauna is far away', () => {
        const fauna = new SlitherCreature(500, 500, 15, [color(100, 100, 100)], 12345);
        const sm = createMockSurfaceMode({ surfaceObjects: [fauna] });

        robot.checkFaunaCollisions(sm);

        expect(robot.destroyed).toBe(false);
    });

    test('robot destruction decrements homeBase robotCount', () => {
        const fauna = new SlitherCreature(50, 50, 15, [color(100, 100, 100)], 12345);
        const sm = createMockSurfaceMode({ surfaceObjects: [fauna], base });

        const initialCount = base.robotCount;
        robot.checkFaunaCollisions(sm);

        expect(base.robotCount).toBe(initialCount - 1);
    });

    test('robot destruction syncs to descriptor robotCount', () => {
        const fauna = new SlitherCreature(50, 50, 15, [color(100, 100, 100)], 12345);
        const sm = createMockSurfaceMode({ surfaceObjects: [fauna], base });
        const desc = sm.playerBuiltMap.get(base.cellKey);
        desc.robotCount = 3;

        robot.checkFaunaCollisions(sm);

        expect(desc.robotCount).toBe(2);
    });

    test('destroyed fauna is ignored in collision check', () => {
        const fauna = new SlitherCreature(50, 50, 15, [color(100, 100, 100)], 12345);
        fauna.destroyed = true;
        const sm = createMockSurfaceMode({ surfaceObjects: [fauna] });

        robot.checkFaunaCollisions(sm);

        expect(robot.destroyed).toBe(false);
    });

    test('robot destruction creates explosion effect', () => {
        const fauna = new SlitherCreature(50, 50, 15, [color(100, 100, 100)], 12345);
        const sm = createMockSurfaceMode({ surfaceObjects: [fauna] });

        robot.checkFaunaCollisions(sm);

        expect(sm._createSurfaceExplosion).toHaveBeenCalled();
    });
});

// ============================================
// MiningRobot takeDamage Tests
// ============================================

describe('MiningRobot takeDamage', () => {
    let robot, base, oreSeams;

    beforeEach(() => {
        oreSeams = new Map();
        base = createMockBase(100, 100);
        robot = new MiningRobot(50, 50, base, oreSeams);
    });

    test('takeDamage reduces health', () => {
        const sm = createMockSurfaceMode({ base });
        robot.takeDamage(20, sm);
        expect(robot.health).toBe(30);
    });

    test('takeDamage destroys robot when health reaches zero', () => {
        const sm = createMockSurfaceMode({ base });
        robot.takeDamage(50, sm);

        expect(robot.destroyed).toBe(true);
        expect(robot.health).toBe(0);
    });

    test('takeDamage does nothing on already destroyed robot', () => {
        const sm = createMockSurfaceMode({ base });
        robot.destroyed = true;
        robot.takeDamage(50, sm);

        expect(robot.health).toBe(50); // unchanged
    });
});

// ============================================
// OreSeam Tests
// ============================================

describe('OreSeam', () => {
    test('extract returns correct amount of ore', () => {
        const base = createMockBase(100, 100);
        const seam = new OreSeam(0, 0, base);
        seam.oreAmount = 50;

        const extracted = seam.extract(10);

        expect(extracted).toBe(10);
        expect(seam.oreAmount).toBe(40);
    });

    test('extract returns remaining ore when requested more than available', () => {
        const base = createMockBase(100, 100);
        const seam = new OreSeam(0, 0, base);
        seam.oreAmount = 5;

        const extracted = seam.extract(10);

        expect(extracted).toBe(5);
        expect(seam.depleted).toBe(true);
    });

    test('hasOre returns false when depleted', () => {
        const base = createMockBase(100, 100);
        const seam = new OreSeam(0, 0, base);
        seam.depleted = true;

        expect(seam.hasOre()).toBe(false);
    });

    test('regenerate increases ore amount', () => {
        const base = createMockBase(100, 100);
        const seam = new OreSeam(0, 0, base);
        seam.oreAmount = 10;

        seam.regenerate(10); // 10 seconds

        expect(seam.oreAmount).toBeGreaterThan(10);
    });

    test('regenerate does not exceed max ore', () => {
        const base = createMockBase(100, 100);
        const seam = new OreSeam(0, 0, base);
        seam.oreAmount = seam.maxOre - 1;

        seam.regenerate(1000);

        expect(seam.oreAmount).toBe(seam.maxOre);
    });

    test('regenerate reactivates depleted seam', () => {
        const base = createMockBase(100, 100);
        const seam = new OreSeam(0, 0, base);
        seam.depleted = true;
        seam.oreAmount = MINING_CONFIG.MINERALS_PER_MINE + 1;

        seam.regenerate(0);

        expect(seam.depleted).toBe(false);
    });
});

// ============================================
// MiningRobot Cargo and Deposit Tests
// ============================================

describe('MiningRobot Cargo Operations', () => {
    let robot, base, oreSeams;

    beforeEach(() => {
        oreSeams = new Map();
        base = createMockBase(100, 100);
        robot = new MiningRobot(50, 50, base, oreSeams);
    });

    test('depositCargo adds minerals to base storage', () => {
        robot.cargo = 5;
        robot.depositCargo();

        const minerals = base.miningStorage.find(i => i.name === 'Minerals');
        expect(minerals.quantity).toBe(5);
    });

    test('depositCargo respects storage capacity', () => {
        base.miningStorageCapacity = 10;
        robot.cargo = 20;
        robot.depositCargo();

        const minerals = base.miningStorage.find(i => i.name === 'Minerals');
        expect(minerals.quantity).toBe(10);
    });

    test('depositCargo handles missing homeBase', () => {
        robot.homeBase = null;
        robot.cargo = 5;
        expect(() => robot.depositCargo()).not.toThrow();
    });

    test('depositCargo does nothing with zero cargo', () => {
        robot.cargo = 0;
        robot.depositCargo();
        expect(base.miningStorage.length).toBe(0);
    });

    test('isBaseStorageFull returns true when at capacity', () => {
        base.miningStorage = [{ name: 'Minerals', quantity: 100 }];
        expect(robot.isBaseStorageFull()).toBe(true);
    });

    test('isBaseStorageFull returns false when has space', () => {
        base.miningStorage = [{ name: 'Minerals', quantity: 50 }];
        expect(robot.isBaseStorageFull()).toBe(false);
    });
});

// ============================================
// SurfaceFauna Base Targeting Tests
// ============================================

describe('SurfaceFauna Base Targeting', () => {
    test('fauna detects nearby player base', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        const base = createMockBase(150, 150);

        global.surfaceMode = {
            surfaceObjects: [base]
        };

        fauna._findNearestBase();

        expect(fauna.targetBase).toBe(base);
    });

    test('fauna ignores distant player base', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        const base = createMockBase(2000, 2000);

        global.surfaceMode = {
            surfaceObjects: [base]
        };

        fauna._findNearestBase();

        expect(fauna.targetBase).toBeNull();
    });

    test('fauna ignores non-player-built bases', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        const base = createMockBase(150, 150);
        base.playerBuilt = false;

        global.surfaceMode = {
            surfaceObjects: [base]
        };

        fauna._findNearestBase();

        expect(fauna.targetBase).toBeNull();
    });

    test('fauna ignores destroyed bases', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        const base = createMockBase(150, 150);
        base.destroyed = true;

        global.surfaceMode = {
            surfaceObjects: [base]
        };

        fauna._findNearestBase();

        expect(fauna.targetBase).toBeNull();
    });

    test('fauna handles undefined surfaceMode gracefully', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        global.surfaceMode = undefined;

        expect(() => fauna._findNearestBase()).not.toThrow();
        expect(fauna.targetBase).toBeNull();
    });

    test('fauna handles empty surfaceObjects array', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        global.surfaceMode = { surfaceObjects: [] };

        expect(() => fauna._findNearestBase()).not.toThrow();
        expect(fauna.targetBase).toBeNull();
    });
});

// ============================================
// SurfaceFauna Attack Behavior Tests
// ============================================

describe('SurfaceFauna Attack Behavior', () => {
    let fauna, base;

    beforeEach(() => {
        fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        base = createMockBase(150, 150);
        global.surfaceMode = { surfaceObjects: [base] };
    });

    afterEach(() => {
        global.surfaceMode = undefined;
    });

    test('fauna moves towards targeted base', () => {
        fauna.targetBase = base;
        const initialX = fauna.pos.x;
        const initialY = fauna.pos.y;

        fauna._updateAttackBehavior(0.1);

        // Should have moved closer to base
        const initialDist = Math.sqrt((150 - initialX) ** 2 + (150 - initialY) ** 2);
        const newDist = Math.sqrt((150 - fauna.pos.x) ** 2 + (150 - fauna.pos.y) ** 2);
        expect(newDist).toBeLessThan(initialDist);
    });

    test('fauna attacks base when in range', () => {
        fauna.pos.set(base.pos.x, base.pos.y);
        fauna.targetBase = base;
        fauna.attackCooldown = 0;

        fauna._updateAttackBehavior(0.1);

        expect(base.takeDamage).toHaveBeenCalledWith(SurfaceFauna.ATTACK_DAMAGE);
    });

    test('fauna respects attack cooldown', () => {
        fauna.pos.set(base.pos.x, base.pos.y);
        fauna.targetBase = base;
        fauna.attackCooldown = 1.0; // Still cooling down

        fauna._updateAttackBehavior(0.1);

        expect(base.takeDamage).not.toHaveBeenCalled();
    });

    test('fauna abandons pursuit when too far', () => {
        fauna.pos.set(0, 0);
        base.pos.set(SurfaceFauna.BASE_ABANDON_RANGE + 100, 0);
        fauna.targetBase = base;

        fauna._updateAttackBehavior(0.1);

        expect(fauna.targetBase).toBeNull();
    });

    test('fauna clears target when base is destroyed', () => {
        fauna.targetBase = base;
        base.destroyed = true;

        fauna._updateAttackBehavior(0.1);

        expect(fauna.targetBase).toBeNull();
    });
});

// ============================================
// SurfaceFauna Update and Movement Tests
// ============================================

describe('SurfaceFauna Update', () => {
    test('update increments animTime', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        const initialAnimTime = fauna.animTime;

        fauna.update(0.1, null);

        expect(fauna.animTime).toBeGreaterThan(initialAnimTime);
    });

    test('update decrements attackCooldown', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        fauna.attackCooldown = 1.0;

        fauna.update(0.1, null);

        expect(fauna.attackCooldown).toBeCloseTo(0.9, 1);
    });

    test('update does nothing when destroyed', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        fauna.destroyed = true;
        const initialPos = fauna.pos.copy();

        fauna.update(0.1, null);

        expect(fauna.pos.x).toBe(initialPos.x);
        expect(fauna.pos.y).toBe(initialPos.y);
    });
});

// ============================================
// SurfaceFauna takeDamage Tests
// ============================================

describe('SurfaceFauna takeDamage', () => {
    test('takeDamage reduces health', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        fauna.takeDamage(10);
        expect(fauna.health).toBe(20);
    });

    test('takeDamage destroys fauna when health reaches zero', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        fauna.takeDamage(30);
        expect(fauna.destroyed).toBe(true);
    });

    test('takeDamage registers destruction with surfaceMode', () => {
        const fauna = new SlitherCreature(100, 100, 15, [color(100, 100, 100)], 12345);
        fauna.cellKey = 'test_cell';
        global.surfaceMode = { registerDestruction: jest.fn() };

        fauna.takeDamage(30);

        expect(global.surfaceMode.registerDestruction).toHaveBeenCalledWith('test_cell');
    });
});

// ============================================
// SurfaceFlora Tests
// ============================================

describe('SurfaceFlora', () => {
    test('constructor initializes with correct health', () => {
        const flora = new (require('../surfaceFloraFauna.js').AlienTree)(100, 100, 20, [color(100, 100, 100)], 12345);
        expect(flora.health).toBe(50);
        expect(flora.maxHealth).toBe(50);
    });

    test('takeDamage reduces health', () => {
        const flora = new (require('../surfaceFloraFauna.js').AlienTree)(100, 100, 20, [color(100, 100, 100)], 12345);
        flora.takeDamage(20);
        expect(flora.health).toBe(30);
    });

    test('takeDamage destroys flora when health reaches zero', () => {
        const flora = new (require('../surfaceFloraFauna.js').AlienTree)(100, 100, 20, [color(100, 100, 100)], 12345);
        flora.takeDamage(50);
        expect(flora.destroyed).toBe(true);
    });
});

// ============================================
// Configuration Constants Tests
// ============================================

describe('MINING_CONFIG Constants', () => {
    test('has COLLISION_RADIUS_FACTOR', () => {
        expect(MINING_CONFIG.COLLISION_RADIUS_FACTOR).toBeDefined();
        expect(MINING_CONFIG.COLLISION_RADIUS_FACTOR).toBe(0.7);
    });

    test('has CLEANUP_RANGE_MULTIPLIER', () => {
        expect(MINING_CONFIG.CLEANUP_RANGE_MULTIPLIER).toBeDefined();
        expect(MINING_CONFIG.CLEANUP_RANGE_MULTIPLIER).toBe(1.5);
    });
});

describe('SurfaceFauna Constants', () => {
    test('has attack behavior constants', () => {
        expect(SurfaceFauna.ATTACK_SPEED_MULTIPLIER).toBe(1.5);
        expect(SurfaceFauna.BASE_DETECTION_RANGE).toBe(200);
        expect(SurfaceFauna.BASE_ABANDON_RANGE).toBe(500);
        expect(SurfaceFauna.ATTACK_DAMAGE).toBe(5);
        expect(SurfaceFauna.BASE_SEARCH_INTERVAL).toBe(5.0);
    });
});
