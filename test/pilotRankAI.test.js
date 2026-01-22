/**
 * Pilot Rank AI Behavior Tests
 * Tests for rank-based AI behavior modifiers (Rookie, Veteran, Elite)
 */

const { PILOT_RANK, PILOT_RANK_MODIFIERS, getPilotRankModifiers } = require('../pilotRanks.js');

describe('Pilot Rank Modifiers', () => {
    test('should define PILOT_RANK constants', () => {
        expect(PILOT_RANK).toBeDefined();
        expect(PILOT_RANK.ROOKIE).toBe(1);
        expect(PILOT_RANK.VETERAN).toBe(2);
        expect(PILOT_RANK.ELITE).toBe(3);
    });

    test('should define PILOT_RANK_MODIFIERS for all ranks', () => {
        expect(PILOT_RANK_MODIFIERS).toBeDefined();
        expect(PILOT_RANK_MODIFIERS[PILOT_RANK.ROOKIE]).toBeDefined();
        expect(PILOT_RANK_MODIFIERS[PILOT_RANK.VETERAN]).toBeDefined();
        expect(PILOT_RANK_MODIFIERS[PILOT_RANK.ELITE]).toBeDefined();
    });

    test('should have getPilotRankModifiers helper function', () => {
        expect(typeof getPilotRankModifiers).toBe('function');
        const rookieMods = getPilotRankModifiers(PILOT_RANK.ROOKIE);
        expect(rookieMods).toBeDefined();
        expect(rookieMods.canStrafe).toBe(false);
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
    });

    describe('Elite Modifiers', () => {
        let mods;
        beforeEach(() => {
            mods = getPilotRankModifiers(PILOT_RANK.ELITE);
        });

        test('should enable strafing for elites', () => {
            expect(mods.canStrafe).toBe(true);
        });

        test('should have faster reaction time', () => {
            expect(mods.reactionDelayBonus).toBeLessThan(0);
            expect(mods.reactionDelayBonus).toBeCloseTo(-0.15);
        });

        test('should have precise aim tolerance', () => {
            expect(mods.aimToleranceMultiplier).toBeLessThan(1.0);
            expect(mods.aimToleranceMultiplier).toBeCloseTo(0.7);
        });

        test('should flee early (smart survival)', () => {
            expect(mods.fleeHullThreshold).toBeGreaterThan(0.30); // More than veteran
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
    });
});

describe('Rank-Based AI Behavior', () => {
    let system, player, rookieEnemy, veteranEnemy, eliteEnemy;

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
        rookieEnemy = new Enemy(100, 100, 'Viper', AI_ROLE.PIRATE, system);
        rookieEnemy.pilotRank = PILOT_RANK.ROOKIE;

        veteranEnemy = new Enemy(200, 200, 'Viper', AI_ROLE.PIRATE, system);
        veteranEnemy.pilotRank = PILOT_RANK.VETERAN;

        eliteEnemy = new Enemy(300, 300, 'Viper', AI_ROLE.PIRATE, system);
        eliteEnemy.pilotRank = PILOT_RANK.ELITE;

        // Set all enemies to have targets
        [rookieEnemy, veteranEnemy, eliteEnemy].forEach(enemy => {
            enemy.target = player;
            enemy.currentState = AI_STATE.SNIPING;
        });
    });

    describe('Strafe Behavior', () => {
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
        test('rookie should only flee at 15% hull', () => {
            // Ensure maxHull is set
            rookieEnemy.maxHull = 100;
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const fleeThreshold = mods.fleeHullThreshold;

            rookieEnemy.hull = rookieEnemy.maxHull * 0.20; // 20% hull
            expect(rookieEnemy.hull).toBeGreaterThan(rookieEnemy.maxHull * fleeThreshold);

            rookieEnemy.hull = rookieEnemy.maxHull * 0.10; // 10% hull
            expect(rookieEnemy.hull).toBeLessThan(rookieEnemy.maxHull * fleeThreshold);
        });

        test('veteran should flee at 30% hull', () => {
            // Ensure maxHull is set
            veteranEnemy.maxHull = 100;
            const mods = getPilotRankModifiers(veteranEnemy.pilotRank);
            const fleeThreshold = mods.fleeHullThreshold;

            veteranEnemy.hull = veteranEnemy.maxHull * 0.35; // 35% hull
            expect(veteranEnemy.hull).toBeGreaterThan(veteranEnemy.maxHull * fleeThreshold);

            veteranEnemy.hull = veteranEnemy.maxHull * 0.25; // 25% hull
            expect(veteranEnemy.hull).toBeLessThan(veteranEnemy.maxHull * fleeThreshold);
        });

        test('elite should flee at 50% hull', () => {
            // Ensure maxHull is set
            eliteEnemy.maxHull = 100;
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const fleeThreshold = mods.fleeHullThreshold;

            eliteEnemy.hull = eliteEnemy.maxHull * 0.55; // 55% hull
            expect(eliteEnemy.hull).toBeGreaterThan(eliteEnemy.maxHull * fleeThreshold);

            eliteEnemy.hull = eliteEnemy.maxHull * 0.45; // 45% hull
            expect(eliteEnemy.hull).toBeLessThan(eliteEnemy.maxHull * fleeThreshold);
        });
    });

    describe('Reaction Delay', () => {
        test('rookie should have slower reaction delay', () => {
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

        test('elite should have faster reaction delay', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const baseDelay = 0.15;
            const eliteDelay = Math.max(0, baseDelay + mods.reactionDelayBonus);
            expect(eliteDelay).toBeLessThan(baseDelay);
            expect(eliteDelay).toBeCloseTo(0); // 0.15 - 0.15 = 0
        });
    });

    describe('Prediction Accuracy', () => {
        test('rookie should have poor prediction multiplier', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const basePrediction = 0.4;
            const rookiePrediction = basePrediction * mods.predictionMultiplier;
            expect(rookiePrediction).toBeLessThan(basePrediction);
            expect(rookiePrediction).toBeCloseTo(0.08); // 0.4 * 0.2
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
        test('rookie should have wider aim tolerance', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseAim = 0.1;
            const rookieAim = baseAim * mods.aimToleranceMultiplier;
            expect(rookieAim).toBeGreaterThan(baseAim);
            expect(rookieAim).toBeCloseTo(0.15); // 0.1 * 1.5
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
        test('rookie should chase longer (higher threshold)', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseThreshold = 100;
            const rookieThreshold = baseThreshold * mods.pursuitAbandonMultiplier;
            expect(rookieThreshold).toBeGreaterThan(baseThreshold);
            expect(rookieThreshold).toBeCloseTo(200); // 100 * 2.0
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
        test('rookie should engage at closer range', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseDistance = 300;
            const rookieDistance = baseDistance * mods.engageDistanceMultiplier;
            expect(rookieDistance).toBeLessThan(baseDistance);
            expect(rookieDistance).toBeCloseTo(210); // 300 * 0.7
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
        test('rookie should change tactics less frequently', () => {
            const mods = getPilotRankModifiers(rookieEnemy.pilotRank);
            const baseChance = 0.5;
            const rookieChance = baseChance * mods.tacticChangeMultiplier;
            expect(rookieChance).toBeLessThan(baseChance);
            expect(rookieChance).toBeCloseTo(0.2); // 0.5 * 0.4
        });

        test('elite should change tactics more frequently', () => {
            const mods = getPilotRankModifiers(eliteEnemy.pilotRank);
            const baseChance = 0.5;
            const eliteChance = baseChance * mods.tacticChangeMultiplier;
            expect(eliteChance).toBeGreaterThan(baseChance);
            expect(eliteChance).toBeCloseTo(0.75); // 0.5 * 1.5
        });
    });
});
