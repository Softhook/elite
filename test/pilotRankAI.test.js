/**
 * Pilot Rank AI Behavior Tests
 * Tests for rank-based AI behavior modifiers (Green, Rookie, Veteran, Elite)
 *
 * CRITICAL NOTES ON IMPLEMENTATION VS ASSUMPTIONS:
 * - reactionDelayBonus: ONLY affects SNIPING strafe reaction timing, not general combat reactions
 * - scanInterval: Capped by global 0.5s off-screen throttle; rank multiplier not fully honored
 * - canStrafe, decisionIntervalMultiplier: Only affect SNIPING state, not global behavior
 * - moveSpeedMultiplier, turnSpeedMultiplier: Applied globally at construction
 * - Most other modifiers (aim, flee, pursuit, engagement) work globally as intended
 */

const { PILOT_RANK, PILOT_RANK_MODIFIERS, getPilotRankModifiers } = require('../pilotRanks.js');

describe('Pilot Rank Modifiers', () => {
    test('should define PILOT_RANK constants with correct values', () => {
        expect(PILOT_RANK).toBeDefined();
        expect(PILOT_RANK.GREEN).toBe(1);
        expect(PILOT_RANK.ROOKIE).toBe(2);
        expect(PILOT_RANK.VETERAN).toBe(3);
        expect(PILOT_RANK.ELITE).toBe(4);
    });

    test('should define PILOT_RANK_MODIFIERS for all four ranks', () => {
        expect(PILOT_RANK_MODIFIERS).toBeDefined();
        expect(PILOT_RANK_MODIFIERS[PILOT_RANK.GREEN]).toBeDefined();
        expect(PILOT_RANK_MODIFIERS[PILOT_RANK.ROOKIE]).toBeDefined();
        expect(PILOT_RANK_MODIFIERS[PILOT_RANK.VETERAN]).toBeDefined();
        expect(PILOT_RANK_MODIFIERS[PILOT_RANK.ELITE]).toBeDefined();
    });

    test('should have getPilotRankModifiers helper function', () => {
        expect(typeof getPilotRankModifiers).toBe('function');
        const greenMods = getPilotRankModifiers(PILOT_RANK.GREEN);
        expect(greenMods).toBeDefined();
        expect(greenMods.canStrafe).toBe(false);
        const rookieMods = getPilotRankModifiers(PILOT_RANK.ROOKIE);
        expect(rookieMods).toBeDefined();
        expect(rookieMods.canStrafe).toBe(false);
    });

    describe('Green Modifiers', () => {
        let mods;
        beforeEach(() => {
            mods = getPilotRankModifiers(PILOT_RANK.GREEN);
        });

        test('should be the most inexperienced pilots', () => {
            expect(mods).toBeDefined();
        });

        test('should disable strafing (no lateral movement in SNIPING)', () => {
            expect(mods.canStrafe).toBe(false);
        });

        test('should have very slow reaction time in SNIPING strafe', () => {
            expect(mods.reactionDelayBonus).toBeGreaterThan(0);
            expect(mods.reactionDelayBonus).toBeCloseTo(0.70); // +700ms
        });

        test('should have extremely poor aim tolerance', () => {
            expect(mods.aimToleranceMultiplier).toBeGreaterThan(1.0);
            expect(mods.aimToleranceMultiplier).toBeCloseTo(2.3); // Widest firing cone
        });

        test('should flee only at critical 8% hull (reckless)', () => {
            expect(mods.fleeHullThreshold).toBeLessThan(0.15);
            expect(mods.fleeHullThreshold).toBeCloseTo(0.08);
        });

        test('should rarely adapt tactics', () => {
            expect(mods.tacticChangeMultiplier).toBeLessThan(1.0);
            expect(mods.tacticChangeMultiplier).toBeCloseTo(0.20);
        });

        test('should have no target prediction (fire at current position)', () => {
            expect(mods.predictionMultiplier).toBeLessThan(1.0);
            expect(mods.predictionMultiplier).toBeCloseTo(0.0);
        });

        test('should pursue targets suicidally (high multiplier)', () => {
            expect(mods.pursuitAbandonMultiplier).toBeGreaterThan(1.0);
            expect(mods.pursuitAbandonMultiplier).toBeCloseTo(2.7);
        });

        test('should engage at dangerously close range', () => {
            expect(mods.engageDistanceMultiplier).toBeLessThan(1.0);
            expect(mods.engageDistanceMultiplier).toBeCloseTo(0.55);
        });

        test('should have weak detection range', () => {
            expect(mods.detectionRangeMultiplier).toBeLessThan(1.0);
            expect(mods.detectionRangeMultiplier).toBeCloseTo(0.6);
        });

        test('should be much slower and less agile', () => {
            expect(mods.moveSpeedMultiplier).toBeLessThan(1.0);
            expect(mods.moveSpeedMultiplier).toBeCloseTo(0.92);
            expect(mods.turnSpeedMultiplier).toBeLessThan(1.0);
            expect(mods.turnSpeedMultiplier).toBeCloseTo(0.90);
        });

        test('should have poor weapon discipline', () => {
            expect(mods.fireDisciplineChance).toBeLessThan(1.0);
            expect(mods.fireDisciplineChance).toBeCloseTo(0.72); // Hesitates 28%
        });

        test('should never use cover', () => {
            expect(mods.useCover).toBe(false);
        });

        test('should have zero obstacle avoidance', () => {
            expect(mods.obstacleAvoidanceStrength).toBe(0.0);
        });
    });

    describe('Rookie Modifiers', () => {
        let mods;
        beforeEach(() => {
            mods = getPilotRankModifiers(PILOT_RANK.ROOKIE);
        });

        test('should disable strafing for rookies', () => {
            expect(mods.canStrafe).toBe(false);
        });

        test('should have slower reaction time', () => {
            expect(mods.reactionDelayBonus).toBeGreaterThan(0);
            expect(mods.reactionDelayBonus).toBeCloseTo(0.35);
        });

        test('should have poor aim tolerance', () => {
            expect(mods.aimToleranceMultiplier).toBeGreaterThan(1.0);
            expect(mods.aimToleranceMultiplier).toBeCloseTo(1.5);
        });

        test('should flee at very low hull', () => {
            expect(mods.fleeHullThreshold).toBeLessThan(0.30); // Less than veteran
            expect(mods.fleeHullThreshold).toBeCloseTo(0.15);
        });

        test('should be less adaptable tactically', () => {
            expect(mods.tacticChangeMultiplier).toBeLessThan(1.0);
            expect(mods.tacticChangeMultiplier).toBeCloseTo(0.4);
        });

        test('should have poor target prediction', () => {
            expect(mods.predictionMultiplier).toBeLessThan(1.0);
            expect(mods.predictionMultiplier).toBeCloseTo(0.2);
        });

        test('should pursue targets suicidally', () => {
            expect(mods.pursuitAbandonMultiplier).toBeGreaterThan(1.0);
            expect(mods.pursuitAbandonMultiplier).toBeCloseTo(2.0);
        });

        test('should engage at close range', () => {
            expect(mods.engageDistanceMultiplier).toBeLessThan(1.0);
            expect(mods.engageDistanceMultiplier).toBeCloseTo(0.7);
        });
    });

    describe('Veteran Modifiers', () => {
        let mods;
        beforeEach(() => {
            mods = getPilotRankModifiers(PILOT_RANK.VETERAN);
        });

        test('should be baseline (all multipliers = 1.0)', () => {
            expect(mods.canStrafe).toBe(true);
            expect(mods.reactionDelayBonus).toBe(0);
            expect(mods.aimToleranceMultiplier).toBe(1.0);
            expect(mods.fleeHullThreshold).toBeCloseTo(0.30);
            expect(mods.tacticChangeMultiplier).toBe(1.0);
            expect(mods.predictionMultiplier).toBe(1.0);
            expect(mods.pursuitAbandonMultiplier).toBe(1.0);
            expect(mods.engageDistanceMultiplier).toBe(1.0);
        });

        test('should have standard speed and turning', () => {
            expect(mods.moveSpeedMultiplier).toBeCloseTo(1.04); // Slightly faster
            expect(mods.turnSpeedMultiplier).toBeCloseTo(1.05); // Slightly faster turning
        });

        test('should have standard detection range', () => {
            expect(mods.detectionRangeMultiplier).toBe(1.0);
        });

        test('should have standard weapon switching and discipline', () => {
            expect(mods.weaponSwitchMinInterval).toBeCloseTo(0.6);
            expect(mods.fireDisciplineChance).toBe(1.0);
        });

        test('should use cover and have standard avoidance', () => {
            expect(mods.useCover).toBe(true);
            expect(mods.obstacleAvoidanceStrength).toBe(1.0);
        });
    });

    describe('Elite Modifiers', () => {
        let mods;
        beforeEach(() => {
            mods = getPilotRankModifiers(PILOT_RANK.ELITE);
        });

        test('should enable dynamic movement (strafing in SNIPING)', () => {
            expect(mods.canStrafe).toBe(true);
        });

        test('should have faster reaction time in SNIPING strafe', () => {
            expect(mods.reactionDelayBonus).toBeLessThan(0);
            expect(mods.reactionDelayBonus).toBeCloseTo(-0.15); // 150ms faster
        });

        test('should have precise aim tolerance', () => {
            expect(mods.aimToleranceMultiplier).toBeLessThan(1.0);
            expect(mods.aimToleranceMultiplier).toBeCloseTo(0.7);
        });

        test('should flee early (smart survival at 50% hull)', () => {
            expect(mods.fleeHullThreshold).toBeGreaterThan(0.30);
            expect(mods.fleeHullThreshold).toBeCloseTo(0.50);
        });

        test('should be highly adaptable tactically', () => {
            expect(mods.tacticChangeMultiplier).toBeGreaterThan(1.0);
            expect(mods.tacticChangeMultiplier).toBeCloseTo(1.5);
        });

        test('should have excellent target prediction', () => {
            expect(mods.predictionMultiplier).toBeGreaterThan(1.0);
            expect(mods.predictionMultiplier).toBeCloseTo(1.3);
        });

        test('should disengage from bad fights tactically', () => {
            expect(mods.pursuitAbandonMultiplier).toBeLessThan(1.0);
            expect(mods.pursuitAbandonMultiplier).toBeCloseTo(0.6);
        });

        test('should maintain safe engagement distance', () => {
            expect(mods.engageDistanceMultiplier).toBeGreaterThan(1.0);
            expect(mods.engageDistanceMultiplier).toBeCloseTo(1.3);
        });

        test('should have superior speed and turning', () => {
            expect(mods.moveSpeedMultiplier).toBeGreaterThan(1.0);
            expect(mods.moveSpeedMultiplier).toBeCloseTo(1.08); // 8% faster
            expect(mods.turnSpeedMultiplier).toBeGreaterThan(1.0);
            expect(mods.turnSpeedMultiplier).toBeCloseTo(1.10); // 10% faster turning
        });

        test('should have excellent sensor range', () => {
            expect(mods.detectionRangeMultiplier).toBeGreaterThan(1.0);
            expect(mods.detectionRangeMultiplier).toBeCloseTo(1.5); // 50% wider detection
        });

        test('should have rapid weapon switching and perfect discipline', () => {
            expect(mods.weaponSwitchMinInterval).toBeLessThan(0.6);
            expect(mods.weaponSwitchMinInterval).toBeCloseTo(0.25); // 4x faster
            expect(mods.fireDisciplineChance).toBe(1.0);
        });

        test('should use cover and have superior obstacle avoidance', () => {
            expect(mods.useCover).toBe(true);
            expect(mods.obstacleAvoidanceStrength).toBeGreaterThan(1.0);
            expect(mods.obstacleAvoidanceStrength).toBeCloseTo(1.15);
        });

        test('should be much more aggressive in retaliation', () => {
            expect(mods.retaliationAggressionMultiplier).toBeGreaterThan(1.0);
            expect(mods.retaliationAggressionMultiplier).toBeCloseTo(1.2);
        });

        test('should make faster tactical decisions (SNIPING-scoped)', () => {
            expect(mods.decisionIntervalMultiplier).toBeLessThan(1.0);
            expect(mods.decisionIntervalMultiplier).toBeCloseTo(0.75);
        });
    });
});

describe('Rank-Based AI Behavior', () => {
    let system, player, greenEnemy, rookieEnemy, veteranEnemy, eliteEnemy;

    beforeEach(() => {
        // Create mock system
        system = {
            enemies: [],
            stations: [],
            asteroids: [],
            projectiles: [],
            jumpZoneCenter: { x: 5000, y: 5000 }
        };

        // Create mock player
        player = {
            pos: { x: 500, y: 500 },
            vel: { x: 0, y: 0 },
            angle: 0,
            size: 20,
            hull: 100,
            maxHull: 100,
            shield: 100,
            maxShield: 100,
            wantedLevel: 3,
            isDestroyed: false
        };

        // Create enemies with different ranks
        greenEnemy = new Enemy(50, 50, 'Viper', AI_ROLE.PIRATE, system);
        greenEnemy.pilotRank = PILOT_RANK.GREEN;

        rookieEnemy = new Enemy(100, 100, 'Viper', AI_ROLE.PIRATE, system);
        rookieEnemy.pilotRank = PILOT_RANK.ROOKIE;

        veteranEnemy = new Enemy(200, 200, 'Viper', AI_ROLE.PIRATE, system);
        veteranEnemy.pilotRank = PILOT_RANK.VETERAN;

        eliteEnemy = new Enemy(300, 300, 'Viper', AI_ROLE.PIRATE, system);
        eliteEnemy.pilotRank = PILOT_RANK.ELITE;

        // Set all enemies to have targets
        [greenEnemy, rookieEnemy, veteranEnemy, eliteEnemy].forEach(enemy => {
            enemy.target = player;
            enemy.currentState = AI_STATE.SNIPING;
        });
    });

    describe('Strafe Behavior (SNIPING-Scoped)', () => {
        test('green pilots should not strafe in SNIPING state', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            expect(mods.canStrafe).toBe(false);
        });

        test('rookies should not strafe in SNIPING state', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            expect(mods.canStrafe).toBe(false);
        });

        test('veterans should strafe in SNIPING state', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            expect(mods.canStrafe).toBe(true);
        });

        test('elites should strafe in SNIPING state', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            expect(mods.canStrafe).toBe(true);
        });
    });

    describe('Flee Threshold Behavior', () => {
        test('green pilots should only flee at 8% hull (extremely reckless)', () => {
            greenEnemy.maxHull = 100;
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            const fleeThreshold = mods.fleeHullThreshold;

            greenEnemy.hull = greenEnemy.maxHull * 0.10; // 10% hull
            expect(greenEnemy.hull).toBeGreaterThan(greenEnemy.maxHull * fleeThreshold);

            greenEnemy.hull = greenEnemy.maxHull * 0.05; // 5% hull
            expect(greenEnemy.hull).toBeLessThan(greenEnemy.maxHull * fleeThreshold);
        });

        test('rookie should only flee at 15% hull', () => {
            rookieEnemy.maxHull = 100;
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const fleeThreshold = mods.fleeHullThreshold;

            rookieEnemy.hull = rookieEnemy.maxHull * 0.20; // 20% hull
            expect(rookieEnemy.hull).toBeGreaterThan(rookieEnemy.maxHull * fleeThreshold);

            rookieEnemy.hull = rookieEnemy.maxHull * 0.10; // 10% hull
            expect(rookieEnemy.hull).toBeLessThan(rookieEnemy.maxHull * fleeThreshold);
        });

        test('veteran should flee at 30% hull (balanced)', () => {
            veteranEnemy.maxHull = 100;
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const fleeThreshold = mods.fleeHullThreshold;

            veteranEnemy.hull = veteranEnemy.maxHull * 0.35; // 35% hull
            expect(veteranEnemy.hull).toBeGreaterThan(veteranEnemy.maxHull * fleeThreshold);

            veteranEnemy.hull = veteranEnemy.maxHull * 0.25; // 25% hull
            expect(veteranEnemy.hull).toBeLessThan(veteranEnemy.maxHull * fleeThreshold);
        });

        test('elite should flee at 50% hull (smart survival)', () => {
            eliteEnemy.maxHull = 100;
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const fleeThreshold = mods.fleeHullThreshold;

            eliteEnemy.hull = eliteEnemy.maxHull * 0.55; // 55% hull
            expect(eliteEnemy.hull).toBeGreaterThan(eliteEnemy.maxHull * fleeThreshold);

            eliteEnemy.hull = eliteEnemy.maxHull * 0.45; // 45% hull
            expect(eliteEnemy.hull).toBeLessThan(eliteEnemy.maxHull * fleeThreshold);
        });
    });

    describe('Reaction Delay (SNIPING Strafe Timing)', () => {
        test('green should have extreme reaction delay in SNIPING strafe', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            const baseDelay = 0.15;
            const greenDelay = Math.max(0, baseDelay + mods.reactionDelayBonus);
            expect(greenDelay).toBeGreaterThan(baseDelay);
            expect(greenDelay).toBeCloseTo(0.85); // 0.15 + 0.70
        });

        test('rookie should have slower reaction delay in SNIPING strafe', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseDelay = 0.15;
            const rookieDelay = Math.max(0, baseDelay + mods.reactionDelayBonus);
            expect(rookieDelay).toBeGreaterThan(baseDelay);
            expect(rookieDelay).toBeCloseTo(0.50); // 0.15 + 0.35
        });

        test('veteran should have baseline reaction delay', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const baseDelay = 0.15;
            const veteranDelay = Math.max(0, baseDelay + mods.reactionDelayBonus);
            expect(veteranDelay).toBeCloseTo(baseDelay);
        });

        test('elite should have faster reaction delay in SNIPING strafe', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const baseDelay = 0.15;
            const eliteDelay = Math.max(0, baseDelay + mods.reactionDelayBonus);
            expect(eliteDelay).toBeLessThan(baseDelay);
            expect(eliteDelay).toBeCloseTo(0); // 0.15 - 0.15 = 0
        });
    });

    describe('Prediction Accuracy', () => {
        test('green should have zero target prediction', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            const basePrediction = 0.4;
            const greenPrediction = basePrediction * mods.predictionMultiplier;
            expect(greenPrediction).toBe(0); // No lead at all
        });

        test('rookie should have poor prediction multiplier', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const basePrediction = 0.4;
            const rookiePrediction = basePrediction * mods.predictionMultiplier;
            expect(rookiePrediction).toBeLessThan(basePrediction);
            expect(rookiePrediction).toBeCloseTo(0.08); // 0.4 * 0.2
        });

        test('veteran should have baseline prediction', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const basePrediction = 0.4;
            const vetPrediction = basePrediction * mods.predictionMultiplier;
            expect(vetPrediction).toBeCloseTo(basePrediction);
        });

        test('elite should have enhanced prediction multiplier', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const basePrediction = 0.4;
            const elitePrediction = basePrediction * mods.predictionMultiplier;
            expect(elitePrediction).toBeGreaterThan(basePrediction);
            expect(elitePrediction).toBeCloseTo(0.52); // 0.4 * 1.3
        });
    });

    describe('Aim Tolerance', () => {
        test('green should have extremely wide aim tolerance', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            const baseAim = 0.1;
            const greenAim = baseAim * mods.aimToleranceMultiplier;
            expect(greenAim).toBeGreaterThan(baseAim);
            expect(greenAim).toBeCloseTo(0.23); // 0.1 * 2.3 - spray and pray
        });

        test('rookie should have wider aim tolerance', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseAim = 0.1;
            const rookieAim = baseAim * mods.aimToleranceMultiplier;
            expect(rookieAim).toBeGreaterThan(baseAim);
            expect(rookieAim).toBeCloseTo(0.15); // 0.1 * 1.5
        });

        test('veteran should have baseline aim tolerance', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const baseAim = 0.1;
            const vetAim = baseAim * mods.aimToleranceMultiplier;
            expect(vetAim).toBeCloseTo(baseAim);
        });

        test('elite should have tighter aim tolerance', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const baseAim = 0.1;
            const eliteAim = baseAim * mods.aimToleranceMultiplier;
            expect(eliteAim).toBeLessThan(baseAim);
            expect(eliteAim).toBeCloseTo(0.07); // 0.1 * 0.7
        });
    });

    describe('Pursuit Abandon Threshold', () => {
        test('green should chase suicidally (highest threshold)', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            const baseThreshold = 100;
            const greenThreshold = baseThreshold * mods.pursuitAbandonMultiplier;
            expect(greenThreshold).toBeGreaterThan(baseThreshold);
            expect(greenThreshold).toBeCloseTo(270); // 100 * 2.7
        });

        test('rookie should chase longer (higher threshold)', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseThreshold = 100;
            const rookieThreshold = baseThreshold * mods.pursuitAbandonMultiplier;
            expect(rookieThreshold).toBeGreaterThan(baseThreshold);
            expect(rookieThreshold).toBeCloseTo(200); // 100 * 2.0
        });

        test('veteran should have baseline pursuit abandon threshold', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const baseThreshold = 100;
            const vetThreshold = baseThreshold * mods.pursuitAbandonMultiplier;
            expect(vetThreshold).toBeCloseTo(baseThreshold);
        });

        test('elite should disengage earlier (lower threshold)', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const baseThreshold = 100;
            const eliteThreshold = baseThreshold * mods.pursuitAbandonMultiplier;
            expect(eliteThreshold).toBeLessThan(baseThreshold);
            expect(eliteThreshold).toBeCloseTo(60); // 100 * 0.6
        });
    });

    describe('Engage Distance', () => {
        test('green should engage at dangerously close range', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            const baseDistance = 300;
            const greenDistance = baseDistance * mods.engageDistanceMultiplier;
            expect(greenDistance).toBeLessThan(baseDistance);
            expect(greenDistance).toBeCloseTo(165); // 300 * 0.55
        });

        test('rookie should engage at closer range', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseDistance = 300;
            const rookieDistance = baseDistance * mods.engageDistanceMultiplier;
            expect(rookieDistance).toBeLessThan(baseDistance);
            expect(rookieDistance).toBeCloseTo(210); // 300 * 0.7
        });

        test('veteran should have baseline engage distance', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const baseDistance = 300;
            const vetDistance = baseDistance * mods.engageDistanceMultiplier;
            expect(vetDistance).toBeCloseTo(baseDistance);
        });

        test('elite should maintain safer distance', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const baseDistance = 300;
            const eliteDistance = baseDistance * mods.engageDistanceMultiplier;
            expect(eliteDistance).toBeGreaterThan(baseDistance);
            expect(eliteDistance).toBeCloseTo(390); // 300 * 1.3
        });
    });

    describe('Tactic Change Frequency', () => {
        test('green should rarely change tactics', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            const baseChance = 0.5;
            const greenChance = baseChance * mods.tacticChangeMultiplier;
            expect(greenChance).toBeLessThan(baseChance);
            expect(greenChance).toBeCloseTo(0.10); // 0.5 * 0.20
        });

        test('rookie should change tactics less frequently', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseChance = 0.5;
            const rookieChance = baseChance * mods.tacticChangeMultiplier;
            expect(rookieChance).toBeLessThan(baseChance);
            expect(rookieChance).toBeCloseTo(0.2); // 0.5 * 0.4
        });

        test('veteran should have baseline tactic change frequency', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const baseChance = 0.5;
            const vetChance = baseChance * mods.tacticChangeMultiplier;
            expect(vetChance).toBeCloseTo(baseChance);
        });

        test('elite should change tactics more frequently', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const baseChance = 0.5;
            const eliteChance = baseChance * mods.tacticChangeMultiplier;
            expect(eliteChance).toBeGreaterThan(baseChance);
            expect(eliteChance).toBeCloseTo(0.75); // 0.5 * 1.5
        });
    });

    describe('Speed and Agility', () => {
        test('green pilots should be slower and less agile', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            expect(mods.moveSpeedMultiplier).toBeCloseTo(0.92);
            expect(mods.turnSpeedMultiplier).toBeCloseTo(0.90);
        });

        test('rookie pilots should be slower and less agile', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            expect(mods.moveSpeedMultiplier).toBeLessThan(1.0);
            expect(mods.turnSpeedMultiplier).toBeLessThan(1.0);
        });

        test('veteran pilots should have baseline speed and agility', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            expect(mods.moveSpeedMultiplier).toBeGreaterThan(1.0);
            expect(mods.turnSpeedMultiplier).toBeGreaterThan(1.0);
        });

        test('elite pilots should be faster and more agile', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            expect(mods.moveSpeedMultiplier).toBeCloseTo(1.08);
            expect(mods.turnSpeedMultiplier).toBeCloseTo(1.10);
        });
    });

    describe('Detection Range', () => {
        test('green pilots should have reduced awareness', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            expect(mods.detectionRangeMultiplier).toBeLessThan(1.0);
            expect(mods.detectionRangeMultiplier).toBeCloseTo(0.6);
        });

        test('elite pilots should have superior awareness', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            expect(mods.detectionRangeMultiplier).toBeGreaterThan(1.0);
            expect(mods.detectionRangeMultiplier).toBeCloseTo(1.5);
        });
    });

    describe('Weapon Discipline and Switching', () => {
        test('green should hesitate before firing and switch slowly', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            expect(mods.fireDisciplineChance).toBeLessThan(1.0);
            expect(mods.fireDisciplineChance).toBeCloseTo(0.72); // Hesitates 28%
            expect(mods.weaponSwitchMinInterval).toBeGreaterThan(0.6);
        });

        test('elite should commit immediately to fire and switch rapidly', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            expect(mods.fireDisciplineChance).toBe(1.0); // Never hesitates
            expect(mods.weaponSwitchMinInterval).toBeLessThan(0.6);
            expect(mods.weaponSwitchMinInterval).toBeCloseTo(0.25);
        });
    });

    describe('Tactical Features', () => {
        test('green should not use cover and ignore obstacles', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            expect(mods.useCover).toBe(false);
            expect(mods.obstacleAvoidanceStrength).toBe(0.0);
        });

        test('veteran should use cover with standard avoidance', () => {
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            expect(mods.useCover).toBe(true);
            expect(mods.obstacleAvoidanceStrength).toBe(1.0);
        });

        test('elite should use cover with superior avoidance', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            expect(mods.useCover).toBe(true);
            expect(mods.obstacleAvoidanceStrength).toBeGreaterThan(1.0);
            expect(mods.obstacleAvoidanceStrength).toBeCloseTo(1.15);
        });
    });

    describe('Retaliation and Aggression', () => {
        test('elite should be more aggressive in retaliation', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            expect(mods.retaliationAggressionMultiplier).toBeGreaterThan(1.0);
            expect(mods.retaliationAggressionMultiplier).toBeCloseTo(1.2);
        });

        test('green should be less aggressive in retaliation', () => {
            const mods = getPilotRankModifiers(greenEnemy.pilotRank);
            expect(mods.retaliationAggressionMultiplier).toBeLessThan(1.0);
            expect(mods.retaliationAggressionMultiplier).toBeCloseTo(0.75);
        });
    });
});
