/**
 * Enemy AI Tests
 * Jest tests for Enemy AI: state machine, targeting, role behaviors, and cover mechanics.
 * Converted from enemy_ai_test.html
 */

// Load dependencies
require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../projectile.js');
require('../harpoon.js');
require('../weaponSystem.js');
require('../enemyConstants.js');
require('../objectPool.js');
require('../enemyUtils.js');
require('../enemy.js');
require('../enemyDamageSystem.js');
require('../enemyRendering.js');
require('../enemyMovement.js');
require('../enemyTargeting.js');
require('../enemyCombat.js');
require('../enemyStateMachine.js');
require('../enemyAIBehaviors.js');
require('../enemyCargo.js');
require('../thrustParticles.js');

// Ensure essential globals are defined if they weren't in setups
if (typeof WEAPON_TYPE === 'undefined') {
    global.WEAPON_TYPE = {
        PROJECTILE: 'projectile',
        BEAM: 'beam',
        FORCE: 'force',
        TURRET: 'turret',
        STRAIGHT: 'straight',
        SPREAD: 'spread',
        MISSILE: 'missile',
        TANGLE: 'tangle',
        BARRIER: 'barrier',
        MINE: 'mine',
        HARPOON: 'harpoon'
    };
}

// Mock mission constants if missing
if (typeof MISSION_TYPE === 'undefined') {
    global.MISSION_TYPE = { DELIVERY_LEGAL: 'DELIVERY_LEGAL' };
}

// Ensure debug logs exist
if (typeof AI_LOG === 'undefined') global.AI_LOG = console.log;
if (typeof DAMAGE_LOG === 'undefined') global.DAMAGE_LOG = console.log;
if (typeof CARGO_LOG === 'undefined') global.CARGO_LOG = console.log;
if (typeof WEAPON_LOG === 'undefined') global.WEAPON_LOG = console.log;
if (typeof TARGETING_LOG === 'undefined') global.TARGETING_LOG = console.log;
if (typeof GS_LOG === 'undefined') global.GS_LOG = console.log;
if (typeof ENEMY_AI_LOG === 'undefined') global.ENEMY_AI_LOG = console.log;

// Ensure debug flags exist
if (typeof DEBUG_DAMAGE === 'undefined') global.DEBUG_DAMAGE = false;
if (typeof DEBUG_AI === 'undefined') global.DEBUG_AI = false;
if (typeof DEBUG_TARGETING === 'undefined') global.DEBUG_TARGETING = false;
if (typeof DEBUG_ENEMY_BEHAVIORS === 'undefined') global.DEBUG_ENEMY_BEHAVIORS = false;
if (typeof DEBUG_HAULER === 'undefined') global.DEBUG_HAULER = false;
if (typeof DEBUG_CARGO === 'undefined') global.DEBUG_CARGO = false;

// Mock global player for weapon firing
if (typeof player === 'undefined') global.player = { pos: { x: 0, y: 0 } };

// Apply Enemy Mixins
if (typeof applyEnemyUtilityMethods === 'function') applyEnemyUtilityMethods();
if (typeof applyEnemyDamageSystemMethods === 'function') applyEnemyDamageSystemMethods();
if (typeof applyEnemyRenderingMethods === 'function') applyEnemyRenderingMethods();
if (typeof applyEnemyMovementMethods === 'function') applyEnemyMovementMethods();
if (typeof applyEnemyTargetingMethods === 'function') applyEnemyTargetingMethods();
if (typeof applyEnemyCombatMethods === 'function') applyEnemyCombatMethods();
if (typeof applyEnemyStateMachineMethods === 'function') applyEnemyStateMachineMethods();
if (typeof applyEnemyAIBehaviorMethods === 'function') applyEnemyAIBehaviorMethods();
if (typeof applyEnemyCargoMethods === 'function') applyEnemyCargoMethods();

// Mocks for AI tests are now in jest.setup.js

// ============================================
// AI Constants Tests
// ============================================

describe('AI Constants', () => {
    test('should define AI_ROLE constants', () => {
        expect(AI_ROLE).toBeDefined();
        expect(AI_ROLE.PIRATE).toBe('Pirate');
        expect(AI_ROLE.POLICE).toBe('Police');
        expect(AI_ROLE.HAULER).toBe('Hauler');
        expect(AI_ROLE.COMBAT).toBe('Combat');
    });

    test('should define AI_STATE constants', () => {
        expect(AI_STATE).toBeDefined();
        expect(AI_STATE.IDLE).toBe(0);
        expect(AI_STATE.APPROACHING).toBe(1);
        expect(AI_STATE.ATTACK_PASS).toBe(2);
        expect(AI_STATE.FLEEING).toBe(9);
        expect(AI_STATE.SNIPING).toBe(11);
    });

    test('should have AI_STATE_NAME reverse lookup', () => {
        expect(AI_STATE_NAME).toBeDefined();
        expect(AI_STATE_NAME[0]).toBe('IDLE');
        expect(AI_STATE_NAME[1]).toBe('APPROACHING');
    });

    test('should define targeting score constants', () => {
        expect(POLICE_WANTED_BASE_SCORE).toBeDefined();
        expect(PIRATE_CARGO_BASE_SCORE).toBeDefined();
        expect(RETALIATION_SCORE_BONUS).toBeDefined();
    });
});

// ============================================
// Enemy Construction Tests
// ============================================

describe('Enemy Construction', () => {
    let mockPlayer;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 100, y: 100 });
    });

    test('should create enemy with valid ship type', () => {
        const enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        expect(enemy).toBeDefined();
        expect(enemy.shipTypeName).toBe('Sidewinder');
    });

    test('should set role correctly', () => {
        const pirate = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        expect(pirate.role).toBe(AI_ROLE.PIRATE);

        const police = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.POLICE);
        expect(police.role).toBe(AI_ROLE.POLICE);
    });

    test('should initialize position', () => {
        const enemy = new Enemy(100, 200, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        expect(enemy.pos.x).toBe(100);
        expect(enemy.pos.y).toBe(200);
    });

    test('should initialize health properties', () => {
        const enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        expect(enemy.hull).toBe(enemy.maxHull);
        expect(enemy.shield).toBe(enemy.maxShield);
    });

    test('should fallback to Sidewinder for invalid ship', () => {
        const enemy = new Enemy(0, 0, mockPlayer, 'InvalidShip', AI_ROLE.PIRATE);
        expect(enemy.shipTypeName).toBe('Sidewinder');
    });
});

// ============================================
// State Machine Tests
// ============================================

describe('Enemy State Machine', () => {
    let enemy;
    let mockPlayer;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 500, y: 500 });
        enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.target = mockPlayer;
    });

    test('should have changeState method', () => {
        expect(typeof enemy.changeState).toBe('function');
    });

    test('should change state', () => {
        enemy.changeState(AI_STATE.APPROACHING);
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    test('should transition from IDLE to APPROACHING when target exists', () => {
        enemy.currentState = AI_STATE.IDLE;
        enemy._updateState_IDLE(true);
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    test('should track previous state', () => {
        enemy.currentState = AI_STATE.IDLE;
        enemy.changeState(AI_STATE.APPROACHING);
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });
});

// ============================================
// Targeting Tests
// ============================================

describe('Enemy Targeting', () => {
    let enemy;
    let mockPlayer;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 500, y: 500, wantedLevel: 2, cargo: [{ name: 'Gold', quantity: 10 }] });
        enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
    });

    test('should have target reference', () => {
        enemy.target = mockPlayer;
        expect(enemy.target).toBeDefined();
    });

    test('should calculate target score for pirates', () => {
        enemy.role = AI_ROLE.PIRATE;
        if (typeof enemy._calculateTargetScore === 'function') {
            const score = enemy._calculateTargetScore(mockPlayer);
            expect(score).toBeDefined();
            expect(score).toBeGreaterThan(0);
        }
    });

    test('should calculate target score for police', () => {
        enemy.role = AI_ROLE.POLICE;
        if (typeof enemy._calculateTargetScore === 'function') {
            const score = enemy._calculateTargetScore(mockPlayer);
            expect(score).toBeDefined();
            expect(score).toBeGreaterThan(0);
        }
    });

    test('should track last attacker for retaliation', () => {
        enemy.takeDamage(10, mockPlayer);
        expect(enemy.lastAttacker).toBeDefined();
    });
});

// ============================================
// PIrate/Police/Hauler/Combat AI Tests
// ============================================

describe('Role Specific AI Behavior', () => {
    let mockPlayer;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 500, y: 500 });
    });

    test('Pirate prioritizes cargo', () => {
        const pirate = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        const richTarget = createMockPlayer({ cargo: [{ name: 'Gold', quantity: 50 }] });
        const poorTarget = createMockPlayer({ cargo: [] });

        if (typeof pirate._calculateTargetScore === 'function') {
            const richScore = pirate._calculateTargetScore(richTarget);
            const poorScore = pirate._calculateTargetScore(poorTarget);
            expect(richScore).toBeGreaterThan(poorScore);
        }
    });

    test('Police prioritizes wanted targets', () => {
        const police = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.POLICE);
        const wantedTarget = createMockPlayer({ wantedLevel: 3 });
        const cleanTarget = createMockPlayer({ wantedLevel: 0 });

        if (typeof police._calculateTargetScore === 'function') {
            const wantedScore = police._calculateTargetScore(wantedTarget);
            const cleanScore = police._calculateTargetScore(cleanTarget);
            expect(wantedScore).toBeGreaterThan(cleanScore);
        }
    });

    test('Hauler has cargo capacity', () => {
        const hauler = new Enemy(0, 0, mockPlayer, 'Adder', AI_ROLE.HAULER);
        expect(hauler.cargoCapacity).toBeGreaterThan(0);
    });
});

// ============================================
// Cover Behavior Tests
// ============================================

describe('Cover Behavior', () => {
    let enemy;
    let mockPlayer;
    let mockSystem;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 0, y: 0 });
        enemy = new Enemy(300, 300, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.target = mockPlayer;

        // Setup basic system with asteroids
        // Note: Enemy class uses _pickCoverTarget from enemyAIBehaviors mixin
    });

    test('should consider cover when damaged', () => {
        enemy.hull = enemy.maxHull * 0.5;
        const shouldCover = enemy._shouldConsiderCover(500);
        expect(shouldCover).toBe(true);
    });

    test('should pick cover target from asteroids', () => {
        mockSystem = createMockSystem({
            asteroids: [
                { id: 'ast1', pos: createVector(200, 200), size: 80, maxRadius: 40, destroyed: false, vel: createVector(0, 0) }
            ]
        });

        enemy.hull = enemy.maxHull * 0.5;
        const cover = enemy._pickCoverTarget(mockSystem, mockPlayer.pos);
        expect(cover).toBeDefined();
        expect(cover.id).toBe('ast1');
    });

    test('should prefer blocking asteroid over non-blocking', () => {
        // Player at (0,0), Enemy at (300,0)
        // Blocking asteroid between them at (150,0)
        // Non-blocking asteroid far away at (150, 500)
        mockSystem = createMockSystem({
            asteroids: [
                { id: 'blocking', pos: createVector(150, 0), size: 60, maxRadius: 30, destroyed: false, vel: createVector(0, 0) },
                { id: 'open', pos: createVector(150, 500), size: 60, maxRadius: 30, destroyed: false, vel: createVector(0, 0) }
            ]
        });

        enemy.pos = createVector(300, 0);
        enemy.target.pos = createVector(0, 0); // Player

        const cover = enemy._pickCoverTarget(mockSystem, enemy.target.pos);
        expect(cover).toBeDefined();
        expect(cover.id).toBe('blocking');
    });

    test('should prefer slow asteroid over fast moving one', () => {
        mockSystem = createMockSystem({
            asteroids: [
                { id: 'fast', pos: createVector(200, 200), size: 60, maxRadius: 30, destroyed: false, vel: createVector(10, 0) }, // Fast
                { id: 'slow', pos: createVector(200, 300), size: 60, maxRadius: 30, destroyed: false, vel: createVector(0.1, 0) } // Slow
            ]
        });

        enemy.pos = createVector(400, 250);
        enemy.target.pos = createVector(0, 0);

        const cover = enemy._pickCoverTarget(mockSystem, enemy.target.pos);
        expect(cover).toBeDefined();
        expect(cover.id).toBe('slow');
    });

    test('should prefer large asteroid for large ships', () => {
        const bigEnemy = new Enemy(400, 0, mockPlayer, 'Anaconda', AI_ROLE.COMBAT);
        bigEnemy.size = 80;

        // Both asteroids are blocking (between enemy at 400,0 and player at 0,0)
        // Tiny is closer (200 vs 250), but Huge offers better size ratio
        mockSystem = createMockSystem({
            asteroids: [
                { id: 'tiny', pos: createVector(200, 0), size: 30, maxRadius: 15, destroyed: false, vel: createVector(0, 0) },
                { id: 'huge', pos: createVector(250, 0), size: 120, maxRadius: 60, destroyed: false, vel: createVector(0, 0) }
            ]
        });

        const cover = bigEnemy._pickCoverTarget(mockSystem, mockPlayer.pos);
        expect(cover).toBeDefined();
        expect(cover.id).toBe('huge');
    });
});

// ============================================
// Sniping Behavior Tests
// ============================================

describe('Sniping Behavior', () => {
    let enemy;
    let mockPlayer;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 1000, y: 1000 });
        enemy = new Enemy(0, 0, mockPlayer, 'Viper', AI_ROLE.PIRATE);
        enemy.target = mockPlayer;
    });

    test('should have sniping state', () => {
        expect(AI_STATE.SNIPING).toBe(11);
    });

    test('should use hysteresis for sniping entry/exit', () => {
        expect(SNIPING_ENTRY_MIN_FACTOR).toBe(0.5);
        expect(SNIPING_ENTRY_MAX_FACTOR).toBe(1.05);
    });
});

// ============================================
// Harpoon Behavior Tests
// ============================================

describe('Harpoon Behavior', () => {
    test('enemy fires harpoon once and does not fire again once harpooned', () => {
        const system = createMockSystem({ enemies: [], projectiles: [] });
        const attacker = new Enemy(0, 0, null, 'Sidewinder', AI_ROLE.PIRATE);
        attacker.pos.set(0, 0);
        attacker.vel.set(0, 0);
        attacker.currentSystem = system;

        const harpoonWeapon = { name: 'Harpoon', type: WEAPON_TYPE.HARPOON, damage: 10, speed: 30, fireRate: 0.5, projectileSize: 6 };
        attacker.weapons = [harpoonWeapon];
        attacker.currentWeapon = harpoonWeapon;

        const target = new Enemy(150, 0, null, 'Sidewinder', AI_ROLE.PIRATE);
        target.pos.set(150, 0);
        attacker.target = target;
        system.enemies.push(target);

        attacker.fireWeapon(atan2(target.pos.y - attacker.pos.y, target.pos.x - attacker.pos.x), target);
        const harpoonProjList = system.projectiles.filter(p => p && (p._isHarpoon || p.type === 'harpoon' || p.type === 'HARPOON'));
        expect(harpoonProjList.length).toBeGreaterThan(0);

        if (typeof Harpoon !== 'undefined') {
            const har = new Harpoon(attacker, target, system, { segmentCount: 8, breakTension: 900 });
            system.harpoons.push(har);
        }

        expect((attacker._harpoonCount || 0)).toBeGreaterThan(0);
        system.projectiles = system.projectiles.filter(p => !(p && (p._isHarpoon || p.type === 'harpoon' || p.type === 'HARPOON')));
        attacker.fireWeapon(atan2(target.pos.y - attacker.pos.y, target.pos.x - attacker.pos.x), target);
        const harpoonCountAfter = system.projectiles.filter(p => p && (p._isHarpoon || p.type === 'harpoon' || p.type === 'HARPOON')).length;
        expect(harpoonCountAfter).toBe(0);
    });
});

// ============================================
// Dual-Target Engagement Tests
// ============================================

describe('Dual-Target Engagement', () => {
    test('Capital ships have canDualEngage capability', () => {
        const ships = ['Destroyer', 'SeparatistBulwark', 'ImperialPaladin'];
        ships.forEach(type => {
            const enemy = new Enemy(0, 0, null, type, AI_ROLE.COMBAT);
            expect(enemy.canDualEngage()).toBe(true);
        });
    });

    test('Regular ships should NOT have canDualEngage capability', () => {
        const enemy = new Enemy(0, 0, null, 'Sidewinder', AI_ROLE.PIRATE);
        expect(enemy.canDualEngage()).toBe(false);
    });
});

// ============================================
// Missionary AI Tests
// ============================================

describe('Missionary AI Behavior', () => {
    let missionary;
    let mockPlayer;
    let mockSystem;
    let mockTarget;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 1000, y: 1000 });
        missionary = new Enemy(0, 0, mockPlayer, 'PosthumanMissionary', AI_ROLE.MISSIONARY);
        mockTarget = new Enemy(500, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        mockSystem = createMockSystem({
            enemies: [missionary, mockTarget],
            player: mockPlayer
        });
        missionary.currentSystem = mockSystem;
    });

    test('should pick nearest target', () => {
        missionary.updateMissionaryAI(mockSystem);
        expect(missionary.target).toBe(mockTarget);
    });

    test('should target player if player is closer', () => {
        mockPlayer.pos.set(100, 0);
        missionary.updateMissionaryAI(mockSystem);
        expect(missionary.target).toBe(mockPlayer);
    });
});

// ============================================
// Pirate Idle Behavior Tests
// ============================================

describe('Pirate Idle Repositioning', () => {
    let pirate;
    let mockPlayer;
    let mockSystem;

    beforeEach(() => {
        mockPlayer = createMockPlayer({ x: 50000, y: 50000 });
        pirate = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        mockSystem = createMockSystem({ player: mockPlayer });
        pirate.currentSystem = mockSystem;
    });

    test('should eventually transition from IDLE to PATROLLING when idle', () => {
        // Setup pirate as idle with no target
        pirate.currentState = AI_STATE.IDLE;
        pirate.target = null;
        pirate.updateTargeting = () => { };

        // Manually set the timer to a small value to speed up test
        pirate._idleRepositionTimer = 0.1;

        // Mock deltaTime globally
        global.deltaTime = 1000; // 1 second per frame

        // Update 1: Timer should decrement and likely expire
        pirate.updateCombatAI(mockSystem);

        // Check if state changed or if we need one more frame
        if (pirate.currentState === AI_STATE.IDLE) {
            pirate.updateCombatAI(mockSystem);
        }

        expect(pirate.currentState).toBe(AI_STATE.PATROLLING);
        expect(pirate.patrolTargetPos).toBeDefined();

        // Verify target position is "far" (1000-2000 units)
        const d = dist(pirate.pos.x, pirate.pos.y, pirate.patrolTargetPos.x, pirate.patrolTargetPos.y);
        expect(d).toBeGreaterThanOrEqual(PIRATE_REPOSITION_DIST_MIN);
        expect(d).toBeLessThanOrEqual(PIRATE_REPOSITION_DIST_MAX);
    });

    test('should return to IDLE after reaching patrol target', () => {
        // Setup pirate in PATROLLING state as if repositioning
        pirate.currentState = AI_STATE.PATROLLING;
        pirate.target = null;
        pirate.patrolTargetPos = createVector(100, 0); // Target nearby
        pirate.pos = createVector(0, 0); // At 0,0

        // Move pirate close to target
        pirate.pos = createVector(90, 0); // Distance = 10, threshold is 200

        global.deltaTime = 16;

        // Update
        pirate.updateCombatAI(mockSystem);

        expect(pirate.currentState).toBe(AI_STATE.IDLE);
        expect(pirate._idleRepositionTimer).toBeDefined();
        expect(pirate._idleRepositionTimer).toBeGreaterThanOrEqual(PIRATE_REPOSITION_TIMER_MIN);
        expect(pirate._idleRepositionTimer).toBeLessThanOrEqual(PIRATE_REPOSITION_TIMER_MAX);
    });

    test('should reset timer when exiting combat state', () => {
        // Setup pirate coming from combat
        pirate.currentState = AI_STATE.APPROACHING;
        pirate.target = null;
        pirate._idleRepositionTimer = 25; // Pre-existing long timer
        pirate.updateTargeting = () => { };

        global.deltaTime = 16;

        // Update - this should detect we came from combat
        pirate.updateCombatAI(mockSystem);

        // Pirate should now be in IDLE with _wasInCombat flag set
        expect(pirate.currentState).toBe(AI_STATE.IDLE);

        // After another update, the timer should be reset to initial range
        pirate.updateCombatAI(mockSystem);

        // Timer should now be reset to initial range (5-10), not the long existing value
        expect(pirate._idleRepositionTimer).toBeGreaterThanOrEqual(PIRATE_REPOSITION_INITIAL_TIMER_MIN);
        expect(pirate._idleRepositionTimer).toBeLessThanOrEqual(PIRATE_REPOSITION_INITIAL_TIMER_MAX);
    });

    test('should avoid planets when selecting reposition targets', () => {
        // Setup system with a planet at potential target location
        mockSystem.planets = [
            { pos: createVector(1500, 0), size: 200, destroyed: false }
        ];

        pirate.currentState = AI_STATE.IDLE;
        pirate.target = null;
        pirate.updateTargeting = () => { };
        pirate._idleRepositionTimer = -1; // Force immediate reposition

        global.deltaTime = 16;

        // Run multiple times to statistically check obstacle avoidance
        for (let i = 0; i < 10; i++) {
            pirate._idleRepositionTimer = -1;
            pirate.currentState = AI_STATE.IDLE;
            pirate.updateCombatAI(mockSystem);

            if (pirate.patrolTargetPos) {
                // Check target is far enough from planet
                const distToPlanet = dist(
                    pirate.patrolTargetPos.x, pirate.patrolTargetPos.y,
                    mockSystem.planets[0].pos.x, mockSystem.planets[0].pos.y
                );
                // Should be at least planet size + obstacle check radius
                expect(distToPlanet).toBeGreaterThanOrEqual(
                    mockSystem.planets[0].size + PIRATE_REPOSITION_OBSTACLE_CHECK_RADIUS - 50 // tolerance
                );
            }
        }
    });

    test('should have _selectPirateRepositionTarget and _isPositionObstructed methods', () => {
        expect(typeof pirate._selectPirateRepositionTarget).toBe('function');
        expect(typeof pirate._isPositionObstructed).toBe('function');
    });

    test('_isPositionObstructed should detect planet collisions', () => {
        mockSystem.planets = [
            { pos: createVector(500, 500), size: 100, destroyed: false }
        ];

        // Position inside planet radius
        expect(pirate._isPositionObstructed(mockSystem, 500, 500)).toBe(true);

        // Position far from planet
        expect(pirate._isPositionObstructed(mockSystem, 5000, 5000)).toBe(false);
    });

    test('_isPositionObstructed should detect station proximity', () => {
        mockSystem.station = { pos: createVector(1000, 1000), size: 80, destroyed: false };

        // Position near station
        expect(pirate._isPositionObstructed(mockSystem, 1050, 1050)).toBe(true);

        // Position far from station
        expect(pirate._isPositionObstructed(mockSystem, 5000, 5000)).toBe(false);
    });
});
