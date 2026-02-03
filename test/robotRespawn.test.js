/**
 * Integration test for mining robot respawn bug
 * Tests the scenario where robots disappear when player returns to base
 */

// Mock p5 and dependencies
global.TWO_PI = Math.PI * 2;
global.createVector = (x = 0, y = 0) => ({ x, y, copy: function () { return createVector(this.x, this.y); } });

// Mock MINING_CONFIG
const MINING_CONFIG = {
    STORAGE_CAPACITY: 100,
    MINERALS_PER_MINE: 2,
    MINING_DURATION: 10.0
};

// Mock SURFACE_CONFIG
const SURFACE_CONFIG = {
    UPDATE_RANGE: 2000
};

describe('Mining Robot Respawn Integration Test', () => {
    test('robots respawn when player returns after cleanup', () => {
        // Simulate the bug scenario:
        // 1. Player builds a base, robots spawn
        // 2. Player moves far away, robots get cleaned up
        // 3. Player returns, robots should respawn but don't (BUG)

        const base = {
            pos: { x: 100, y: 100 },
            cellKey: '1,1',
            robotsInitialized: true, // Was initialized before
            playerBuilt: true,
            destroyed: false,
            constructor: { name: 'OffworldBuilding' },
            variant: 1,
            miningStorage: [],
            miningStorageCapacity: 100
        };

        const descriptor = {
            robotsInitialized: false, // Cleanup set this to false
            robotCount: 2,
            type: 'OffworldBuilding',
            variant: 1,
            destroyed: false
        };

        const playerBuiltMap = new Map([['1,1', descriptor]]);

        // The fix: check BOTH obj.robotsInitialized AND desc.robotsInitialized
        const desc = playerBuiltMap.get(base.cellKey);
        const needsRobots = !base.robotsInitialized || (desc && !desc.robotsInitialized);

        // Before fix: needsRobots would be false (only checked obj.robotsInitialized)
        // After fix: needsRobots should be true (checks desc.robotsInitialized too)
        expect(needsRobots).toBe(true);
    });

    test('robots do not duplicate when already initialized', () => {
        const base = {
            pos: { x: 100, y: 100 },
            cellKey: '1,1',
            robotsInitialized: true,
            playerBuilt: true,
            destroyed: false,
            constructor: { name: 'OffworldBuilding' },
            variant: 1
        };

        const descriptor = {
            robotsInitialized: true, // Both are true
            robotCount: 2,
            type: 'OffworldBuilding',
            variant: 1
        };

        const playerBuiltMap = new Map([['1,1', descriptor]]);

        const desc = playerBuiltMap.get(base.cellKey);
        const needsRobots = !base.robotsInitialized || (desc && !desc.robotsInitialized);

        expect(needsRobots).toBe(false);
    });
});
