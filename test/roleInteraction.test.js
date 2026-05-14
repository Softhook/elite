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

        test('Combat ships summon idle faction partners to attack a rival target', () => {
            const leader = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
            const idlePartner = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
            const rival = createEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
            leader.isTargetValid = (t) => !!(t && t.pos && !t.destroyed);
            idlePartner.isTargetValid = (t) => !!(t && t.pos && !t.destroyed);
            mockSystem.enemies = [leader, idlePartner, rival];
            mockSystem.player = null;

            expect(idlePartner.target).toBeFalsy();

            const acquired = leader.updateTargeting(mockSystem);
            expect(acquired).toBe(true);
            expect(leader.target).toBe(rival);
            expect(idlePartner.target).toBe(rival);
        });

        test('Combat summon does not overwrite a partner with an existing valid target', () => {
            const leader = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
            const engagedPartner = createEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 60, 0);
            const rival = createEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
            const pirate = createEnemy(AI_ROLE.PIRATE, 'PIRATE', 140, 0);
            leader.isTargetValid = (t) => !!(t && t.pos && !t.destroyed);
            engagedPartner.isTargetValid = (t) => !!(t && t.pos && !t.destroyed);
            mockSystem.enemies = [leader, engagedPartner, rival, pirate];
            mockSystem.player = null;

            engagedPartner.target = pirate;
            leader.updateTargeting(mockSystem);

            expect(engagedPartner.target).toBe(pirate);
        });

        // --- Ally-Summon Behaviour ---
        describe('Ally summon behaviour (_summonFactionAlliesForTarget)', () => {
            // Helpers that use a proper isTargetValid so updateTargeting can run
            const createSummonEnemy = (role, faction, x = 0, y = 0) => {
                const e = createEnemy(role, faction, x, y);
                e.isTargetValid = (t) => !!(t && t.pos && !t.destroyed);
                return e;
            };

            test('non-COMBAT ship does not summon allies when acquiring a target', () => {
                const hauler = createSummonEnemy(AI_ROLE.HAULER, 'IMPERIAL', 0, 0);
                const idleAlly = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                // Give hauler a scoring path so it can acquire a target
                hauler.lastAttacker = rival;
                hauler.lastAttackTime = global.millis();
                mockSystem.enemies = [hauler, idleAlly, rival];
                mockSystem.player = null;

                hauler.updateTargeting(mockSystem);

                // Hauler may or may not acquire a target, but idleAlly must not be summoned
                expect(idleAlly.target).toBeFalsy();
            });

            test('ally beyond summon radius is not summoned', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                // Place partner > COMBAT_ALLY_SUMMON_RADIUS away (1200 px)
                const farPartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 1400, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                mockSystem.enemies = [leader, farPartner, rival];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(farPartner.target).toBeFalsy();
            });

            test('ally within radius IS summoned', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const nearPartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 300, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                mockSystem.enemies = [leader, nearPartner, rival];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(nearPartner.target).toBe(rival);
            });

            test('ally from a different faction is not summoned', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const separatistNearby = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 80, 0);
                const pirate = createSummonEnemy(AI_ROLE.PIRATE, 'PIRATE', 120, 0);
                mockSystem.enemies = [leader, separatistNearby, pirate];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                // Imperial summons pirate target but must not redirect the Separatist
                expect(separatistNearby.target).toBeFalsy();
            });

            test('pirate target triggers summon (shared-threat path)', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const idlePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
                const pirate = createSummonEnemy(AI_ROLE.PIRATE, 'PIRATE', 150, 0);
                mockSystem.enemies = [leader, idlePartner, pirate];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(leader.target).toBe(pirate);
                expect(idlePartner.target).toBe(pirate);
            });

            test('alien target triggers summon for non-military faction (shared-threat path)', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const idlePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
                const alien = createSummonEnemy(AI_ROLE.ALIEN, 'ALIEN', 150, 0);
                mockSystem.enemies = [leader, idlePartner, alien];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(leader.target).toBe(alien);
                expect(idlePartner.target).toBe(alien);
            });

            test('neutral/non-hostile target does not trigger summon', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const idlePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
                // REPAIR ships are neutral - COMBAT role should not score them as targets
                const repair = createSummonEnemy(AI_ROLE.REPAIR, null, 120, 0);
                mockSystem.enemies = [leader, idlePartner, repair];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                // Leader should not have acquired the repair ship as a target
                expect(leader.target).toBeFalsy();
                // And therefore no summon
                expect(idlePartner.target).toBeFalsy();
            });

            test('multiple idle allies are all summoned simultaneously', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const partner1 = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
                const partner2 = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 100, 0);
                const partner3 = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 120, 10);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 200, 0);
                mockSystem.enemies = [leader, partner1, partner2, partner3, rival];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(leader.target).toBe(rival);
                expect(partner1.target).toBe(rival);
                expect(partner2.target).toBe(rival);
                expect(partner3.target).toBe(rival);
            });

            test('summoned ally receives minimum target-switch cooldown', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const idlePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                idlePartner.targetSwitchCooldown = 0;
                mockSystem.enemies = [leader, idlePartner, rival];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(idlePartner.targetSwitchCooldown).toBeGreaterThanOrEqual(global.COMBAT_SUMMON_TARGET_COOLDOWN);
            });

            test('ally with a higher existing cooldown keeps its cooldown after summon', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const idlePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 80, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                const highCooldown = 10;
                idlePartner.targetSwitchCooldown = highCooldown;
                mockSystem.enemies = [leader, idlePartner, rival];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(idlePartner.targetSwitchCooldown).toBe(highCooldown);
            });

            test('ally at exactly COMBAT_ALLY_SUMMON_RADIUS is included (boundary-inclusive)', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const edgePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', global.COMBAT_ALLY_SUMMON_RADIUS, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                mockSystem.enemies = [leader, edgePartner, rival];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(edgePartner.target).toBe(rival);
            });

            test('ally just outside COMBAT_ALLY_SUMMON_RADIUS is excluded', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const outsidePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', global.COMBAT_ALLY_SUMMON_RADIUS + 0.01, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                mockSystem.enemies = [leader, outsidePartner, rival];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(outsidePartner.target).toBeFalsy();
            });

            test('distance sweep simulation: summon uses a hard <= radius cutoff', () => {
                const radius = global.COMBAT_ALLY_SUMMON_RADIUS;
                // Sweep from near to well outside radius (radius + 600) to validate cutoff behavior.
                const sweepMaxDistance = radius + 600;
                for (let distance = 200; distance <= sweepMaxDistance; distance += 200) {
                    const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                    const partner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', distance, 0);
                    const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 100, 0);
                    mockSystem.enemies = [leader, partner, rival];
                    mockSystem.player = null;

                    leader.updateTargeting(mockSystem);

                    if (distance <= radius) {
                        expect(partner.target).toBe(rival);
                    } else {
                        expect(partner.target).toBeFalsy();
                    }
                }
            });

            test('mixed-swarm simulation only redirects eligible allies', () => {
                const radius = global.COMBAT_ALLY_SUMMON_RADIUS;
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 100, 0);
                const decoyTarget = createSummonEnemy(AI_ROLE.PIRATE, 'PIRATE', 50, 50);

                const eligible1 = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 200, 0);
                const eligible2 = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 1000, 0);
                const eligibleAtEdge = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', radius, 0);

                const wrongFaction = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 220, 0);
                const wrongRole = createSummonEnemy(AI_ROLE.HAULER, 'IMPERIAL', 220, 0);
                // Derived offset keeps this test valid if the summon radius is tuned in future.
                const outOfRangeOffset = Math.ceil(radius * 0.2);
                const outOfRange = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', radius + outOfRangeOffset, 0);
                const destroyed = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 220, 0);
                destroyed.destroyed = true;
                const alreadyEngaged = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 220, 0);
                alreadyEngaged.target = decoyTarget; // valid existing target should be preserved

                mockSystem.enemies = [
                    leader,
                    rival,
                    decoyTarget,
                    eligible1,
                    eligible2,
                    eligibleAtEdge,
                    wrongFaction,
                    wrongRole,
                    outOfRange,
                    destroyed,
                    alreadyEngaged
                ];
                mockSystem.player = null;

                leader.updateTargeting(mockSystem);

                expect(eligible1.target).toBe(rival);
                expect(eligible2.target).toBe(rival);
                expect(eligibleAtEdge.target).toBe(rival);

                expect(wrongFaction.target).toBeFalsy();
                expect(wrongRole.target).toBeFalsy();
                expect(outOfRange.target).toBeFalsy();
                expect(destroyed.target).toBeFalsy();
                expect(alreadyEngaged.target).toBe(decoyTarget);
            });

            test('summon call emits ping and communication details when player is nearby', () => {
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const idlePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 160, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                const addSummonPing = jest.fn();
                const emitSummonCall = jest.fn();
                const originalCommunicationSystem = global.communicationSystem;

                try {
                    global.communicationSystem = { emitSummonCall };
                    mockSystem.addSummonPing = addSummonPing;
                    mockSystem.player = createMockPlayer({ x: 100, y: 0 });
                    mockSystem.enemies = [leader, idlePartner, rival];

                    leader.updateTargeting(mockSystem);

                    expect(addSummonPing).toHaveBeenCalledTimes(1);
                    expect(addSummonPing.mock.calls[0][0]).toBe(leader);
                    expect(emitSummonCall).toHaveBeenCalledTimes(1);
                    const [caller, calledTarget, responders] = emitSummonCall.mock.calls[0];
                    expect(caller).toBe(leader);
                    expect(calledTarget).toBe(rival);
                    expect(Array.isArray(responders)).toBe(true);
                    expect(responders).toContain(idlePartner);
                } finally {
                    global.communicationSystem = originalCommunicationSystem;
                }
            });

            test('summoned ally movement is delayed when communicationSystem defines summon response delay', () => {
                jest.useFakeTimers();
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const idlePartner = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 160, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                const emitSummonCall = jest.fn();
                const originalCommunicationSystem = global.communicationSystem;
                const movementDelayMs = 3000;

                try {
                    global.communicationSystem = {
                        emitSummonCall,
                        getSummonMovementResponseDelayMs: () => movementDelayMs
                    };
                    mockSystem.player = createMockPlayer({ x: 100, y: 0 });
                    mockSystem.enemies = [leader, idlePartner, rival];

                    leader.updateTargeting(mockSystem);
                    expect(idlePartner.target).toBeFalsy();

                    jest.advanceTimersByTime(movementDelayMs);
                    expect(idlePartner.target).toBe(rival);
                } finally {
                    global.communicationSystem = originalCommunicationSystem;
                    jest.useRealTimers();
                }
            });

            test('multiple summoned allies can receive staggered movement delays by responder index', () => {
                jest.useFakeTimers();
                const leader = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 0, 0);
                const firstAlly = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 140, 0);
                const secondAlly = createSummonEnemy(AI_ROLE.COMBAT, 'IMPERIAL', 180, 0);
                const rival = createSummonEnemy(AI_ROLE.COMBAT, 'SEPARATIST', 120, 0);
                const emitSummonCall = jest.fn();
                const originalCommunicationSystem = global.communicationSystem;

                try {
                    global.communicationSystem = {
                        emitSummonCall,
                        getSummonMovementResponseDelayMs: (index) => index === 0 ? 1000 : 1600
                    };
                    mockSystem.player = createMockPlayer({ x: 100, y: 0 });
                    mockSystem.enemies = [leader, firstAlly, secondAlly, rival];

                    leader.updateTargeting(mockSystem);
                    expect(firstAlly.target).toBeFalsy();
                    expect(secondAlly.target).toBeFalsy();

                    jest.advanceTimersByTime(1000);
                    expect(firstAlly.target).toBe(rival);
                    expect(secondAlly.target).toBeFalsy();

                    jest.advanceTimersByTime(600);
                    expect(secondAlly.target).toBe(rival);
                } finally {
                    global.communicationSystem = originalCommunicationSystem;
                    jest.useRealTimers();
                }
            });

            test('pirates now summon nearby pirate allies', () => {
                const pirateLeader = createSummonEnemy(AI_ROLE.PIRATE, 'PIRATE', 0, 0);
                const pirateWing = createSummonEnemy(AI_ROLE.PIRATE, 'PIRATE', 100, 0);
                const haulerTarget = createSummonEnemy(AI_ROLE.HAULER, null, 140, 0);
                mockSystem.enemies = [pirateLeader, pirateWing, haulerTarget];
                mockSystem.player = null;

                pirateLeader.updateTargeting(mockSystem);

                expect(pirateLeader.target).toBe(haulerTarget);
                expect(pirateWing.target).toBe(haulerTarget);
            });

            test('police now summon nearby police allies against pirate threats', () => {
                const policeLeader = createSummonEnemy(AI_ROLE.POLICE, 'POLICE', 0, 0);
                const policeWing = createSummonEnemy(AI_ROLE.POLICE, 'POLICE', 110, 0);
                const pirateTarget = createSummonEnemy(AI_ROLE.PIRATE, 'PIRATE', 140, 0);
                mockSystem.player = null;
                mockSystem.enemies = [policeLeader, policeWing, pirateTarget];

                policeLeader._summonFactionAlliesForTarget(mockSystem, pirateTarget);

                expect(policeWing.target).toBe(pirateTarget);
            });
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
