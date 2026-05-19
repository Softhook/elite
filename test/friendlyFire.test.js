const { Enemy } = require('../enemy');
const { Player } = require('../player');
require('./jest.setup');
require('../enemyConstants');
require('../enemyUtils');
require('../enemyDamageSystem');
require('../enemyTargeting');
require('../enemyCombat');
require('../enemyStateMachine');
require('../enemyAIBehaviors');
require('../enemyCargo');

// Mock missing globals for test environment
global.DAMAGE_LOG = jest.fn();
global.TARGETING_LOGF = jest.fn();
global.AI_LOG = jest.fn();
global.SHIP_DEFINITIONS = {
    'Sidewinder': { size: 30, baseHull: 100, baseShield: 50, baseThrust: 5, baseTurnRate: 0.05, armament: [] }
};
global.communicationSystem = {
    handlePlayerDamageReaction: jest.fn(),
    handleEnemyDestruction: jest.fn()
};

// Apply mixins
if (typeof applyEnemyUtilityMethods === 'function') applyEnemyUtilityMethods();
if (typeof applyEnemyDamageSystemMethods === 'function') applyEnemyDamageSystemMethods();
if (typeof applyEnemyTargetingMethods === 'function') applyEnemyTargetingMethods();
if (typeof applyEnemyCargoMethods === 'function') applyEnemyCargoMethods();
if (typeof applyEnemyAIBehaviorMethods === 'function') applyEnemyAIBehaviorMethods();
if (typeof applyEnemyCombatMethods === 'function') applyEnemyCombatMethods();
if (typeof applyEnemyStateMachineMethods === 'function') applyEnemyStateMachineMethods();

describe('Friendly Fire & Faction Collision Tests', () => {
    let mockSystem;
    let mockPlayer;

    const createEnemy = (role, faction, x = 0, y = 0) => {
        const enemy = new Enemy(x, y, null, 'Sidewinder', role);
        enemy.faction = faction;
        enemy.isTargetValid = (t) => t && !t.destroyed;
        // Mock getSystem to return our mockSystem
        enemy.currentSystem = mockSystem;
        enemy.getSystem = () => mockSystem;
        return enemy;
    };

    beforeEach(() => {
        mockPlayer = createMockPlayer({
            x: 0,
            y: 0,
            faction: 'IMPERIAL'
        });
        mockPlayer.playerFaction = 'IMPERIAL';

        mockSystem = createMockSystem({
            player: mockPlayer
        });

        // Global millis mock
        global.millis = () => Date.now();
    });

    test('Enemy should ignore player from the same faction in _shouldIgnoreAttacker', () => {
        const imperialShip = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL');

        // After the fix, it should return true
        const shouldIgnore = imperialShip._shouldIgnoreAttacker(mockPlayer);
        expect(shouldIgnore).toBe(true);
    });

    test('Imperial guard should ignore a player from the same faction even if they hit the principal', () => {
        const principal = createEnemy(AI_ROLE.HAULER, 'IMPERIAL');
        const guard = createEnemy(AI_ROLE.GUARD, 'IMPERIAL');

        // principal takes damage from player, but ignores it because same faction
        principal.takeDamage(10, mockPlayer, mockSystem);

        // Principal's lastAttacker should be undefined if _shouldIgnoreAttacker returned true
        expect(principal.lastAttacker).toBeFalsy();

        // Guard evaluates player
        const score = guard.evaluateTargetScore(mockPlayer, mockSystem);
        expect(score).toBeLessThanOrEqual(0);
    });

    test('Imperial ship should NOT target same-faction player after a hit', () => {
        const imperialShip = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 100, 0);

        // Simulate hit
        imperialShip.takeDamage(10, mockPlayer, mockSystem);

        // Check if recorded as attacker
        expect(imperialShip.lastAttacker).toBeFalsy();

        // Tageting score should be negative due to same-faction penalty and no attacker bonus
        const score = imperialShip.evaluateTargetScore(mockPlayer, mockSystem);
        expect(score).toBeLessThanOrEqual(0);
    });

    test('Imperial ship SHOULD target non-faction player after a hit', () => {
        const imperialShip = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 100, 0);
        const rebelPlayer = createMockPlayer({ x: 0, y: 0, faction: 'SEPARATIST' });
        rebelPlayer.playerFaction = 'SEPARATIST';
        rebelPlayer.isPlayer = true;

        // Simulate hit
        imperialShip.takeDamage(10, rebelPlayer, mockSystem);

        // Should be recorded as attacker
        expect(imperialShip.lastAttacker).toBe(rebelPlayer);

        // Targeting score should be positive
        const score = imperialShip.evaluateTargetScore(rebelPlayer, mockSystem);
        expect(score).toBeGreaterThan(0);
    });

    test('player bodyguard never targets fellow bodyguard even when principal is docked', () => {
        const guard1 = createEnemy(AI_ROLE.GUARD, 'IMPERIAL');
        const guard2 = createEnemy(AI_ROLE.GUARD, 'IMPERIAL');

        // Both guards share the same player as principal
        guard1.principal = mockPlayer;
        guard2.principal = mockPlayer;

        // Override isTargetValid so principal appears docked/invalid (simulates docked player)
        const origIsTargetValid1 = guard1.isTargetValid;
        guard1.isTargetValid = (t) => {
            if (t === mockPlayer) return false; // principal is docked
            return origIsTargetValid1.call(guard1, t);
        };

        // guard1 should still refuse to target guard2 (fellow bodyguard)
        const score = guard1.evaluateTargetScore(guard2, mockSystem);
        expect(score).toBeLessThanOrEqual(0);
        guard1.isTargetValid = origIsTargetValid1;
    });

    test('player bodyguard never targets the player principal even when principal is docked', () => {
        const guard = createEnemy(AI_ROLE.GUARD, 'IMPERIAL');
        guard.principal = mockPlayer;

        // Override isTargetValid so principal appears docked/invalid
        const origIsTargetValid = guard.isTargetValid;
        guard.isTargetValid = (t) => {
            if (t === mockPlayer) return false; // principal is docked
            return origIsTargetValid.call(guard, t);
        };

        // guard should still refuse to target the player
        const score = guard.evaluateTargetScore(mockPlayer, mockSystem);
        expect(score).toBeLessThanOrEqual(0);
        guard.isTargetValid = origIsTargetValid;
    });

    test('Imperial ship SHOULD target same-faction player if they are WANTED', () => {
        const imperialShip = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 100, 0);

        // Mark player as wanted in the mock system
        mockSystem.isPlayerWanted = () => true;

        // Simulate hit
        imperialShip.takeDamage(10, mockPlayer, mockSystem);

        // Should NOW be recorded as attacker
        expect(imperialShip.lastAttacker).toBe(mockPlayer);

        // Targeting score should be improved compared to clean player
        const score = imperialShip.evaluateTargetScore(mockPlayer, mockSystem);
        expect(score).toBeGreaterThan(-100);
    });

    describe('Cognitive retaliation delay scheduling', () => {
        beforeEach(() => {
            jest.useFakeTimers();
        });

        afterEach(() => {
            jest.useRealTimers();
        });

        test('should keep first delayed response window under sustained hits while using latest attacker context', () => {
            const defender = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 100, 0);
            const attackerA = createMockPlayer({ x: 0, y: 0, faction: 'SEPARATIST' });
            const attackerB = createMockPlayer({ x: 10, y: 0, faction: 'SEPARATIST' });

            attackerA.playerFaction = 'SEPARATIST';
            attackerB.playerFaction = 'SEPARATIST';
            attackerA.isPlayer = true;
            attackerB.isPlayer = true;

            // Force delayed retaliation behavior independent of rank fixture setup.
            defender._getRankModifiers = () => ({ reactionDelayBonus: 0.70 });
            defender._handleTargetingAfterHit = jest.fn();

            defender.takeDamage(1, attackerA, mockSystem);

            // A second hit before the first delay expires should update context,
            // not push the retaliation deadline outward.
            jest.advanceTimersByTime(300);
            defender.takeDamage(1, attackerB, mockSystem);

            jest.advanceTimersByTime(399);
            expect(defender._handleTargetingAfterHit).not.toHaveBeenCalled();

            jest.advanceTimersByTime(1);
            expect(defender._handleTargetingAfterHit).toHaveBeenCalledTimes(1);
            expect(defender._handleTargetingAfterHit).toHaveBeenCalledWith(attackerB, mockSystem);
        });
    });
});
