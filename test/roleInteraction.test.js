const { Enemy } = require('../enemy');
const { Player } = require('../player');
require('../debug');
require('../ships');
require('../weapons');
require('../enemyConstants');
require('../projectile');
require('../harpoon');
require('../weaponSystem');
require('../objectPool');
require('../enemyUtils');
require('../enemyDamageSystem');
require('../enemyRendering');
require('../enemyMovement');
require('../enemyTargeting');
require('../enemyCombat');
require('../enemyStateMachine');
require('../enemyAIBehaviors');
require('../enemyCargo');

// Apply mixins
if (typeof applyEnemyUtilityMethods === 'function') applyEnemyUtilityMethods();
if (typeof applyEnemyDamageSystemMethods === 'function') applyEnemyDamageSystemMethods();
if (typeof applyEnemyRenderingMethods === 'function') applyEnemyRenderingMethods();
if (typeof applyEnemyMovementMethods === 'function') applyEnemyMovementMethods();
if (typeof applyEnemyTargetingMethods === 'function') applyEnemyTargetingMethods();
if (typeof applyEnemyCombatMethods === 'function') applyEnemyCombatMethods();
if (typeof applyEnemyStateMachineMethods === 'function') applyEnemyStateMachineMethods();
if (typeof applyEnemyAIBehaviorMethods === 'function') applyEnemyAIBehaviorMethods();
if (typeof applyEnemyCargoMethods === 'function') applyEnemyCargoMethods();

describe('Role & Faction Interaction Tests', () => {
    let mockSystem;
    let mockPlayer;

    // Helper to create enemies
    const createEnemy = (role, faction, x = 0, y = 0) => {
        const shipType = 'Sidewinder'; // Default for tests
        const enemy = new Enemy(x, y, null, shipType, role);
        enemy.faction = faction;
        enemy.isTargetValid = () => true; // Simplify validation
        return enemy;
    };

    // Helper to verify score direction (positive/negative)
    const expectPositiveScore = (score) => {
        expect(score).toBeGreaterThan(0);
    };

    const expectNegativeOrZeroScore = (score) => {
        expect(score).toBeLessThanOrEqual(0);
    };

    beforeEach(() => {
        // Mock Player using shared helper
        mockPlayer = createMockPlayer({
            x: 0,
            y: 0,
            hull: 100,
            isWanted: false
        });

        // Add specific properties needed for these tests if not in shared helper or differ
        mockPlayer.playerFaction = null;
        // mockPlayer.instanceof is not strictly needed if we trust the logic we fixed in enemyTargeting
        // but let's keep it safe if tests rely on it for non-isPlayer checks?
        // Actually earlier analysis showed instanceof was used in enemyTargeting.
        // The shared mockPlayer doesn't have instanceof.
        // We will rely on isPlayer: true which is in the shared mock.

        // Complete mock system using shared helper
        mockSystem = createMockSystem({
            player: mockPlayer,
            station: { pos: global.createVector(0, 0), size: 100 }
        });

        // Ensure constants are available (they should be from require)
        if (typeof AI_ROLE === 'undefined') throw new Error("AI_ROLE undefined");
    });

    describe('Role Hostility Rules', () => {
        test('Pirates should target Haulers with positive score', () => {
            const pirate = createEnemy(AI_ROLE.PIRATE, 'PIRATE');
            const hauler = createEnemy(AI_ROLE.HAULER, null, 100, 0);
            mockSystem.enemies = [hauler];
            mockSystem.player = null; // Remove player to avoid distraction

            const score = pirate.evaluateTargetScore(hauler, mockSystem);
            expectPositiveScore(score);
        });

        test('Pirates should target Transports with positive score', () => {
            const pirate = createEnemy(AI_ROLE.PIRATE, 'PIRATE');
            const transport = createEnemy(AI_ROLE.TRANSPORT, null, 100, 0);
            mockSystem.enemies = [transport];
            mockSystem.player = null;

            const score = pirate.evaluateTargetScore(transport, mockSystem);
            expectPositiveScore(score);
        });

        test('Police should target wanted player', () => {
            const police = createEnemy(AI_ROLE.POLICE, 'POLICE');
            mockPlayer.isWanted = true;
            mockSystem.player = mockPlayer;
            mockSystem.enemies = [];

            const score = police.evaluateTargetScore(mockPlayer, mockSystem);
            expectPositiveScore(score);
        });

        test('Police should NOT target clean player', () => {
            const police = createEnemy(AI_ROLE.POLICE, 'POLICE');
            mockPlayer.isWanted = false;
            mockSystem.player = mockPlayer;
            mockSystem.enemies = [];

            const score = police.evaluateTargetScore(mockPlayer, mockSystem);
            expectNegativeOrZeroScore(score);
        });

        test('Military Combat ships should prioritize Aliens', () => {
            const military = createEnemy(AI_ROLE.COMBAT, 'MILITARY');
            const alien = createEnemy(AI_ROLE.ALIEN, 'ALIEN', 100, 0);
            mockSystem.enemies = [alien];
            mockSystem.player = null;

            const score = military.evaluateTargetScore(alien, mockSystem);
            expect(score).toBeGreaterThan(400);
        });

        test('Imperial Combat ships should prioritize Separatists', () => {
            const imperial = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL');
            const separatist = createEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 100, 0);
            mockSystem.enemies = [separatist];
            mockSystem.player = null;

            const score = imperial.evaluateTargetScore(separatist, mockSystem);
            expect(score).toBeGreaterThan(400);
        });

        test('Separatist Combat ships should prioritize Imperials', () => {
            const separatist = createEnemy(AI_ROLE.COMBAT, 'SEPARATIST');
            const imperial = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 100, 0);
            mockSystem.enemies = [imperial];
            mockSystem.player = null;

            const score = separatist.evaluateTargetScore(imperial, mockSystem);
            expect(score).toBeGreaterThan(400);
        });

        test('Same faction ships should have reduced targeting score', () => {
            const imperial1 = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL');
            const imperial2 = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 100, 0);
            mockSystem.enemies = [imperial2];
            mockSystem.player = null;

            const score = imperial1.evaluateTargetScore(imperial2, mockSystem);
            expectNegativeOrZeroScore(score);
        });

        test('Combat ships coordinate focus fire with faction partners against rival faction targets', () => {
            const wingman = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL');
            const partner = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 40, 0);
            const rival = createEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
            mockSystem.enemies = [wingman, partner, rival];
            mockSystem.player = null;

            partner.target = rival;
            const withPartnerFocus = wingman.evaluateTargetScore(rival, mockSystem);

            partner.target = null;
            const withoutPartnerFocus = wingman.evaluateTargetScore(rival, mockSystem);

            expect(withPartnerFocus).toBeGreaterThan(withoutPartnerFocus);
        });

        test('Combat ships do not coordinate focus fire against same-faction targets', () => {
            const wingman = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL');
            const partner = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 40, 0);
            const allyTarget = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 120, 0);
            mockSystem.enemies = [wingman, partner, allyTarget];
            mockSystem.player = null;

            partner.target = allyTarget;
            const score = wingman.evaluateTargetScore(allyTarget, mockSystem);

            expectNegativeOrZeroScore(score);
        });

        test('Guards should only retaliate (not initiate combat)', () => {
            const guard = createEnemy(AI_ROLE.GUARD, 'IMPERIAL');
            const pirate = createEnemy(AI_ROLE.PIRATE, 'PIRATE', 100, 0);
            guard.principal = null;
            mockSystem.enemies = [pirate];
            mockSystem.player = null;

            const score = guard.evaluateTargetScore(pirate, mockSystem);
            expectNegativeOrZeroScore(score);
        });

        test('Guards should prioritize principal attacker with high score', () => {
            const principal = createEnemy(AI_ROLE.HAULER, 'IMPERIAL');
            const guard = createEnemy(AI_ROLE.GUARD, 'IMPERIAL');
            const attacker = createEnemy(AI_ROLE.PIRATE, 'PIRATE', 100, 0);

            guard.principal = principal;
            principal.lastAttacker = attacker;
            principal.lastAttackTime = global.millis();

            mockSystem.enemies = [principal, attacker];
            mockSystem.player = null;

            const score = guard.evaluateTargetScore(attacker, mockSystem);
            expect(score).toBeGreaterThan(1000); // Should be very high
        });

        test('Aliens should target all non-Alien ships', () => {
            const alien = createEnemy(AI_ROLE.ALIEN, 'ALIEN');
            const hauler = createEnemy(AI_ROLE.HAULER, null, 100, 0);
            const pirate = createEnemy(AI_ROLE.PIRATE, 'PIRATE', 200, 0);
            const otherAlien = createEnemy(AI_ROLE.ALIEN, 'ALIEN', 300, 0);
            mockSystem.enemies = [hauler, pirate, otherAlien];
            mockSystem.player = null;

            const haulerScore = alien.evaluateTargetScore(hauler, mockSystem);
            const pirateScore = alien.evaluateTargetScore(pirate, mockSystem);
            const alienScore = alien.evaluateTargetScore(otherAlien, mockSystem);

            expectPositiveScore(haulerScore);
            expectPositiveScore(pirateScore);
            expectNegativeOrZeroScore(alienScore);
        });

        test('Pirates should target Miners', () => {
            const pirate = createEnemy(AI_ROLE.PIRATE, 'PIRATE');
            const miner = createEnemy(AI_ROLE.MINER, null, 100, 0);
            mockSystem.enemies = [miner];
            mockSystem.player = null;

            const score = pirate.evaluateTargetScore(miner, mockSystem);
            expectPositiveScore(score);
        });

        test('Combat ships should ignore Repair ships (neutral)', () => {
            const combat = createEnemy(AI_ROLE.COMBAT, 'MILITARY');
            const repair = createEnemy(AI_ROLE.REPAIR, null, 100, 0);
            mockSystem.enemies = [repair];
            mockSystem.player = null;

            const score = combat.evaluateTargetScore(repair, mockSystem);
            expectNegativeOrZeroScore(score);
        });
    });

    describe('Faction Hostility Maps', () => {
        test('FACTION_ENEMY_MAP should define Imperial vs Separatist rivalry', () => {
            expect(global.FACTION_ENEMY_MAP).toBeDefined();
            expect(global.FACTION_ENEMY_MAP['IMPERIAL']).toContain('SEPARATIST');
            expect(global.FACTION_ENEMY_MAP['SEPARATIST']).toContain('IMPERIAL');
        });

        test('FACTION_ENEMY_MAP should define Military vs Alien hostility', () => {
            expect(global.FACTION_ENEMY_MAP['MILITARY']).toContain('ALIEN');
        });

        test('ROLE_ENEMY_MAP should define Pirate prey', () => {
            expect(global.ROLE_ENEMY_MAP).toBeDefined();
            expect(global.ROLE_ENEMY_MAP[AI_ROLE.PIRATE]).toContain(AI_ROLE.HAULER);
            expect(global.ROLE_ENEMY_MAP[AI_ROLE.PIRATE]).toContain(AI_ROLE.TRANSPORT);
        });

        test('ROLE_ENEMY_MAP should define Police targets', () => {
            expect(global.ROLE_ENEMY_MAP[AI_ROLE.POLICE]).toContain(AI_ROLE.PIRATE);
            expect(global.ROLE_ENEMY_MAP[AI_ROLE.POLICE]).toContain(AI_ROLE.ALIEN);
        });
    });
});
