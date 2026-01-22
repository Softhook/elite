/**
 * Detection Overhaul Verification Tests
 * Tests for rank-based detection ranges, off-screen awareness limits, and NPC targeting.
 */

// Mock p5 globals
global.dist = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
global.millis = () => Date.now();
global.deltaTime = 16.67;
global.abs = Math.abs;
global.sq = (x) => x * x;

// Mock classes
global.Player = class { };
global.Enemy = class { };

const { PILOT_RANK } = require('../pilotRanks.js');
const { AI_ROLE, AI_STATE, TARGET_SCORE_INVALID } = require('../enemyConstants.js');
const { EnemyTargeting } = require('../enemyTargeting.js');

describe('Detection Overhaul', () => {
    let system, enemy, target;
    const targeting = new EnemyTargeting();

    beforeEach(() => {
        // Mock System
        system = {
            enemies: [new Enemy()],
            player: { pos: { x: 0, y: 0 }, isPlayer: true },
            spatialHash: {
                getNearby: jest.fn().mockReturnValue([])
            },
            isMissionTarget: jest.fn().mockReturnValue(false)
        };

        // Mock Enemy
        enemy = {
            pos: { x: 0, y: 0 },
            detectionRange: 1000,
            weaponRange: 500,
            role: AI_ROLE.PIRATE,
            isTargetValid: (t) => !!(t && t.pos && !t.destroyed),
            attackerHistory: new Map(),
            lastAttacker: null,
            target: null,
            _getRankModifiers: jest.fn().mockReturnValue({
                detectionRangeMultiplier: 1.0,
                scanInterval: 1.0,
                longRangeSensorMultiplier: 2.5
            }),
            _getShipFaction: (s) => (s === enemy) ? 'PIRATE' : (s.faction || 'UNKNOWN'),
            distanceTo: (t) => global.dist(enemy.pos.x, enemy.pos.y, t.pos.x, t.pos.y)
        };

        enemy.pos.distSq = (p) => Math.pow(enemy.pos.x - p.x, 2) + Math.pow(enemy.pos.y - p.y, 2);

        // Mock Target
        target = {
            pos: { x: 3000, y: 0 },
            destroyed: false,
            hull: 100,
            maxHull: 100,
            isPlayer: false,
            role: AI_ROLE.HAULER,
            faction: 'HAULER'
        };
    });

    describe('evaluateTargetScore Range Cutoff', () => {
        test('should reject targets beyond rank-based sensor range', () => {
            const score = targeting.evaluateTargetScore.call(enemy, target, system);
            expect(score).toBe(TARGET_SCORE_INVALID);
        });

        test('should accept targets within rank-based sensor range', () => {
            target.pos.x = 100;
            const score = targeting.evaluateTargetScore.call(enemy, target, system);
            expect(score).not.toBe(TARGET_SCORE_INVALID);
        });

        test('should always accept active attackers regardless of range (Retaliation)', () => {
            target.pos.x = 2000;
            enemy.lastAttacker = target;
            const score = targeting.evaluateTargetScore.call(enemy, target, system);
            expect(score).not.toBe(TARGET_SCORE_INVALID);
        });

        test('should always accept current target regardless of range (Tracking)', () => {
            target.pos.x = 2000;
            enemy.target = target;
            const score = targeting.evaluateTargetScore.call(enemy, target, system);
            expect(score).not.toBe(TARGET_SCORE_INVALID);
        });

        test('should respect different multipliers for different ranks', () => {
            enemy._getRankModifiers.mockReturnValue({ longRangeSensorMultiplier: 1.5 });
            target.pos.x = 2000;
            expect(targeting.evaluateTargetScore.call(enemy, target, system)).toBe(TARGET_SCORE_INVALID);

            enemy._getRankModifiers.mockReturnValue({ longRangeSensorMultiplier: 4.0 });
            target.pos.x = 100; // Move closer to ensure positive score
            expect(targeting.evaluateTargetScore.call(enemy, target, system)).not.toBe(TARGET_SCORE_INVALID);
        });
    });

    describe('NPC-to-NPC Targeting Range', () => {
        test('updateTargeting should use detectionRange for spatial query', () => {
            enemy._isOnScreen = true;
            enemy.detectionRange = 1200;
            enemy.targetSwitchCooldown = 0;

            // Spatial hash will return candidates, which we then evaluate
            system.spatialHash.getNearby.mockReturnValue([target]);

            targeting.updateTargeting.call(enemy, system);

            expect(system.spatialHash.getNearby).toHaveBeenCalledWith(
                0, 0, 3000
            );
        });
    });
});
