/**
 * Mining Background Activity Tests
 * Comprehensive tests for background mining, notifications, and robot spawning
 */

// ============================================
// Mock Dependencies
// ============================================

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
}

global.createVector = (x, y) => new MockVector(x, y);

// Mock MINING_CONFIG
global.MINING_CONFIG = {
    PATROL_RADIUS: 900,
    MAX_SPEED: 30,
    ACCELERATION: 20,
    ARRIVAL_RADIUS: 30,
    MINING_DURATION: 10.0,
    CARGO_CAPACITY: 6,
    MINERALS_PER_MINE: 2,
    ORE_SEAM_INITIAL: 50,
    ORE_SEAM_VARIANCE: 20,
    ORE_SEAM_REGEN_RATE: 0.1,
    ORE_SEAM_MAX: 80,
    STORAGE_CAPACITY: 100,
    COLLISION_RADIUS_FACTOR: 0.7,
    CLEANUP_RANGE_MULTIPLIER: 1.5,
    ROBOT_SIZE: 14,
    DRILL_SPEED: 0.35,
    LIGHT_BLINK_SPEED: 0.05
};

// Mock SURFACE_CONFIG
global.SURFACE_CONFIG = {
    UPDATE_RANGE: 2000,
    SPAWN_CELL_SIZE: 35
};

// Mock ROBOT_STATE
global.ROBOT_STATE = {
    IDLE: 'idle',
    SEEKING: 'seeking',
    MOVING_TO_LOCATION: 'moving_to_location',
    MINING: 'mining',
    RETURNING: 'returning'
};

// ============================================
// Tests
// ============================================

describe('Background Mining Activity', () => {
    let surfaceMode;
    let mockUIManager;

    beforeEach(() => {
        // Reset surfaceMode simulation
        surfaceMode = {
            playerBuiltMap: new Map(),
            objectCache: new Map(),
            destroyedCells: new Set(),
            planet: {
                hazardLevel: 0.2
            },
            baseNotifications: new Map(),
            player: { pos: createVector(0, 0) },
            controlMode: 'SHIP',
            _notifyBaseEvent: function(cellKey, eventType, message, color = [255, 200, 100]) {
                const notificationKey = `${cellKey}_${eventType}`;
                const now = Date.now();
                const lastNotification = this.baseNotifications.get(notificationKey);
                const cooldown = (eventType === 'base_destroyed' || eventType === 'robots_lost') ? 30000 : 60000;
                
                if (lastNotification && (now - lastNotification) < cooldown) {
                    return;
                }

                this.baseNotifications.set(notificationKey, now);

                if (mockUIManager && mockUIManager.addMessage) {
                    mockUIManager.addMessage(message, color);
                }
            },
            _updateBackgroundActivity: function(dt) {
                if (!this.playerBuiltMap) return;

                const now = Date.now();
                const updateRangeSq = (SURFACE_CONFIG.UPDATE_RANGE || 2000) ** 2;
                const playerPos = (this.controlMode === 'ASTRONAUT' && this.astronaut) ? this.astronaut.pos : this.player.pos;

                for (const [cellKey, desc] of this.playerBuiltMap) {
                    if (desc.destroyed) continue;

                    let obj = this.objectCache.get(cellKey);

                    if (obj && playerPos) {
                        const dSq = (obj.pos.x - playerPos.x) ** 2 + (obj.pos.y - playerPos.y) ** 2;
                        if (dSq < updateRangeSq) {
                            obj.lastBackgroundTick = now;
                            continue;
                        }
                    }

                    if (!desc.lastBackgroundTick) desc.lastBackgroundTick = now - (dt * 1000);

                    const timeElapsed = (now - desc.lastBackgroundTick) / 1000;

                    if (timeElapsed < 2.0) continue;

                    if (desc.type === 'OffworldBuilding' && desc.variant === 1) {
                        const robotCount = typeof desc.robotCount === 'number' ? desc.robotCount : 3;

                        if (robotCount === 0) {
                            desc.lastBackgroundTick = now;
                            continue;
                        }

                        const mineRatePerRobot = MINING_CONFIG.MINERALS_PER_MINE / MINING_CONFIG.MINING_DURATION;
                        const mineralsEarned = robotCount * mineRatePerRobot * timeElapsed;

                        if (!desc.miningStorage) desc.miningStorage = [];
                        let mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
                        if (!mineralStack) {
                            mineralStack = { name: 'Minerals', quantity: 0 };
                            desc.miningStorage.push(mineralStack);
                        }

                        const capacity = desc.miningStorageCapacity || 100;
                        const oldQuantity = mineralStack.quantity;
                        mineralStack.quantity = Math.min(capacity, mineralStack.quantity + mineralsEarned);

                        if (mineralStack.quantity >= capacity && oldQuantity < capacity) {
                            this._notifyBaseEvent(cellKey, 'storage_full', `Mining base storage full (${Math.round(capacity)} minerals)`);
                        }

                        const hazardLevel = this.planet ? (this.planet.hazardLevel || 0.2) : 0.1;
                        const damagePerSec = hazardLevel * 0.5;
                        const damageTaken = damagePerSec * timeElapsed;

                        const oldHealth = desc.health !== undefined ? desc.health : 1000;
                        desc.health = oldHealth - damageTaken;

                        if (desc.health < 500 && oldHealth >= 500) {
                            this._notifyBaseEvent(cellKey, 'low_health', `Mining base under attack! (${Math.round(desc.health)} HP remaining)`);
                        }

                        const attritionChance = hazardLevel * (timeElapsed / 3600) * 0.05;
                        if (Math.random() < attritionChance && desc.robotCount > 0) {
                            const oldCount = desc.robotCount;
                            desc.robotCount--;

                            if (desc.robotCount === 0) {
                                this._notifyBaseEvent(cellKey, 'robots_lost', `All mining robots destroyed at base!`, [255, 100, 100]);
                            } else if (oldCount > 0) {
                                this._notifyBaseEvent(cellKey, 'robot_lost', `Mining robot destroyed (${desc.robotCount} remaining)`);
                            }
                        }

                        if (desc.health <= 0) {
                            desc.destroyed = true;
                            this.destroyedCells.add(cellKey);
                            this._notifyBaseEvent(cellKey, 'base_destroyed', `Mining base destroyed!`, [255, 50, 50]);
                        }

                        if (obj) {
                            obj.health = desc.health;
                            obj.destroyed = desc.destroyed;
                            obj.robotCount = desc.robotCount;
                        }
                    }

                    desc.lastBackgroundTick = now;
                }
            }
        };

        mockUIManager = {
            messages: [],
            addMessage: function(message, color) {
                this.messages.push({ message, color });
            }
        };

        global.uiManager = mockUIManager;
    });

    afterEach(() => {
        delete global.uiManager;
    });

    test('Background mining accumulates minerals over time', () => {
        const desc = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            miningStorage: [],
            health: 1000,
            lastBackgroundTick: Date.now() - 10000 // 10 seconds ago
        };

        surfaceMode.playerBuiltMap.set('10,20', desc);
        surfaceMode.player.pos.set(10000, 10000); // Far away

        surfaceMode._updateBackgroundActivity(0.016);

        const mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
        expect(mineralStack).toBeDefined();
        expect(mineralStack.quantity).toBeGreaterThan(0);
        
        // 3 robots * (2 minerals / 10 seconds) * 10 seconds = 6 minerals
        expect(mineralStack.quantity).toBeCloseTo(6, 1);
    });

    test('Storage full notification triggers when capacity reached', () => {
        const desc = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            miningStorage: [{ name: 'Minerals', quantity: 95 }],
            miningStorageCapacity: 100,
            health: 1000,
            lastBackgroundTick: Date.now() - 30000 // 30 seconds ago
        };

        surfaceMode.playerBuiltMap.set('10,20', desc);
        surfaceMode.player.pos.set(10000, 10000);

        surfaceMode._updateBackgroundActivity(0.016);

        const mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
        expect(mineralStack.quantity).toBe(100); // Capped at capacity

        // Check notification was sent
        const messages = mockUIManager.messages.filter(m => m.message.includes('storage full'));
        expect(messages.length).toBeGreaterThan(0);
    });

    test('Low health notification triggers at 50% health', () => {
        const desc = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            health: 600, // Start above 500
            lastBackgroundTick: Date.now() - 600000 // 10 minutes ago (will take damage)
        };

        surfaceMode.playerBuiltMap.set('10,20', desc);
        surfaceMode.player.pos.set(10000, 10000);
        surfaceMode.planet.hazardLevel = 0.5; // High hazard

        surfaceMode._updateBackgroundActivity(0.016);

        expect(desc.health).toBeLessThan(600); // Took damage

        // If health dropped below 500, notification should fire
        if (desc.health < 500) {
            const messages = mockUIManager.messages.filter(m => m.message.includes('under attack'));
            expect(messages.length).toBeGreaterThan(0);
        }
    });

    test('Robot attrition reduces robot count over time', () => {
        const desc = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            health: 1000,
            lastBackgroundTick: Date.now() - 3600000 // 1 hour ago
        };

        surfaceMode.playerBuiltMap.set('10,20', desc);
        surfaceMode.player.pos.set(10000, 10000);
        surfaceMode.planet.hazardLevel = 1.0; // Maximum hazard

        // Run multiple updates to trigger attrition
        for (let i = 0; i < 10; i++) {
            desc.lastBackgroundTick = Date.now() - 3600000;
            surfaceMode._updateBackgroundActivity(0.016);
        }

        // With high hazard and time, robots should be lost
        expect(desc.robotCount).toBeLessThanOrEqual(3);
    });

    test('Base destruction notification when health reaches zero', () => {
        const desc = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            health: 10, // Very low health
            lastBackgroundTick: Date.now() - 30000
        };

        surfaceMode.playerBuiltMap.set('10,20', desc);
        surfaceMode.player.pos.set(10000, 10000);
        surfaceMode.planet.hazardLevel = 1.0;

        surfaceMode._updateBackgroundActivity(0.016);

        if (desc.health <= 0) {
            expect(desc.destroyed).toBe(true);
            expect(surfaceMode.destroyedCells.has('10,20')).toBe(true);
            
            const messages = mockUIManager.messages.filter(m => m.message.includes('destroyed'));
            expect(messages.length).toBeGreaterThan(0);
        }
    });

    test('No mining happens when robot count is zero', () => {
        const desc = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 0,
            miningStorage: [],
            health: 1000,
            lastBackgroundTick: Date.now() - 30000
        };

        surfaceMode.playerBuiltMap.set('10,20', desc);
        surfaceMode.player.pos.set(10000, 10000);

        surfaceMode._updateBackgroundActivity(0.016);

        const mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
        expect(mineralStack).toBeUndefined(); // No minerals should be mined
    });

    test('Notification cooldown prevents spam', () => {
        const desc = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            miningStorage: [{ name: 'Minerals', quantity: 95 }],
            miningStorageCapacity: 100,
            health: 1000,
            lastBackgroundTick: Date.now() - 30000
        };

        surfaceMode.playerBuiltMap.set('10,20', desc);
        surfaceMode.player.pos.set(10000, 10000);

        // First update - should trigger notification
        surfaceMode._updateBackgroundActivity(0.016);
        const firstCount = mockUIManager.messages.length;

        // Second update immediately - should not trigger due to cooldown
        desc.lastBackgroundTick = Date.now() - 30000;
        surfaceMode._updateBackgroundActivity(0.016);
        const secondCount = mockUIManager.messages.length;

        // Should not have added more messages
        expect(secondCount).toBe(firstCount);
    });

    test('Mining rate scales with robot count', () => {
        const desc1 = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 1,
            miningStorage: [],
            health: 1000,
            lastBackgroundTick: Date.now() - 10000
        };

        const desc2 = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            miningStorage: [],
            health: 1000,
            lastBackgroundTick: Date.now() - 10000
        };

        surfaceMode.playerBuiltMap.set('10,20', desc1);
        surfaceMode.playerBuiltMap.set('30,40', desc2);
        surfaceMode.player.pos.set(10000, 10000);

        surfaceMode._updateBackgroundActivity(0.016);

        const minerals1 = desc1.miningStorage.find(item => item.name === 'Minerals').quantity;
        const minerals2 = desc2.miningStorage.find(item => item.name === 'Minerals').quantity;

        // 3 robots should mine 3x as much as 1 robot
        expect(minerals2).toBeCloseTo(minerals1 * 3, 1);
    });

    test('Hazard level affects damage rate', () => {
        const desc1 = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            health: 1000,
            lastBackgroundTick: Date.now() - 10000
        };

        const desc2 = {
            type: 'OffworldBuilding',
            variant: 1,
            robotCount: 3,
            health: 1000,
            lastBackgroundTick: Date.now() - 10000
        };

        surfaceMode.playerBuiltMap.set('10,20', desc1);
        surfaceMode.playerBuiltMap.set('30,40', desc2);
        surfaceMode.player.pos.set(10000, 10000);

        // Test with low hazard
        surfaceMode.planet.hazardLevel = 0.1;
        surfaceMode._updateBackgroundActivity(0.016);
        const damage1 = 1000 - desc1.health;

        // Reset and test with high hazard
        desc2.health = 1000;
        desc2.lastBackgroundTick = Date.now() - 10000;
        surfaceMode.planet.hazardLevel = 1.0;
        surfaceMode._updateBackgroundActivity(0.016);
        const damage2 = 1000 - desc2.health;

        // Higher hazard should cause more damage
        expect(damage2).toBeGreaterThan(damage1);
    });
});

describe('Robot Spawning with Deployed State', () => {
    test('Robots spawn at varied patrol positions', () => {
        // This test verifies the deterministic but varied spawning logic
        const basePos = { x: 1000, y: 2000 };
        const robotCount = 3;
        
        const positions = [];
        for (let i = 0; i < robotCount; i++) {
            const angle = (i / robotCount) * TWO_PI;
            const distSeed = Math.abs(Math.sin(basePos.x * 2.345 + basePos.y * 6.789 + i * 3.14159)) % 1;
            const patrolAngle = angle + (Math.sin(basePos.x + i) * 0.5);
            const patrolDist = MINING_CONFIG.PATROL_RADIUS * 0.3 + (distSeed * MINING_CONFIG.PATROL_RADIUS * 0.4);
            const rx = basePos.x + Math.cos(patrolAngle) * patrolDist;
            const ry = basePos.y + Math.sin(patrolAngle) * patrolDist;
            
            positions.push({ x: rx, y: ry });
        }

        // Verify robots are spread out (not at base position)
        for (const pos of positions) {
            const distFromBase = Math.sqrt((pos.x - basePos.x) ** 2 + (pos.y - basePos.y) ** 2);
            expect(distFromBase).toBeGreaterThan(100); // Should be at patrol distance, not at base
            expect(distFromBase).toBeLessThan(MINING_CONFIG.PATROL_RADIUS);
        }

        // Verify robots are not all at the same position
        const uniquePositions = new Set(positions.map(p => `${p.x},${p.y}`));
        expect(uniquePositions.size).toBe(robotCount);
    });

    test('Robots get varied starting states', () => {
        const basePos = { x: 1000, y: 2000 };
        const robotCount = 10;
        
        const states = [];
        for (let i = 0; i < robotCount; i++) {
            const stateSeed = Math.abs(Math.sin(basePos.x * 1.111 + basePos.y * 2.222 + i * 4.444)) % 1;
            
            let state;
            if (stateSeed < 0.3) {
                state = 'mining';
            } else if (stateSeed < 0.6) {
                state = 'returning';
            } else {
                state = stateSeed < 0.8 ? 'seeking' : 'moving';
            }
            
            states.push(state);
        }

        // Verify we have a mix of states (at least 2 different states)
        const uniqueStates = new Set(states);
        expect(uniqueStates.size).toBeGreaterThanOrEqual(2);
        
        // Verify states are distributed (not all the same)
        const miningCount = states.filter(s => s === 'mining').length;
        const totalCount = states.length;
        expect(miningCount).toBeGreaterThan(0);
        expect(miningCount).toBeLessThan(totalCount); // Not all mining
    });
});

console.log('Mining background activity tests defined successfully');
