require('../enemyConstants');
require('../debug');
require('../ships');
require('../weapons');
require('../projectile');
require('../harpoon');
require('../weaponSystem');
require('../objectPool');
require('../thrustParticles');

// Mixins MUST be required before Enemy for correct prototype application
require('../enemyUtils');
require('../enemyDamageSystem');
require('../enemyRendering');
require('../enemyMovement');
require('../enemyTargeting');
require('../enemyCombat');
require('../enemyStateMachine');
require('../enemyAIBehaviors');
require('../enemyCargo');

const { Enemy } = require('../enemy');

describe('AI Targeting & Avoidance Tests', () => {
    let enemy;
    let mockSystem;
    let mockPlayer;

    beforeEach(() => {
        // Mock communicationSystem
        global.communicationSystem = {
            addMessage: jest.fn(),
            handlePlayerDamageReaction: jest.fn(),
            handleEnemyDestroyed: jest.fn(),
            handleTargetAcquired: jest.fn(),
            handleStateChange: jest.fn(),
            handlePlayerDying: jest.fn(),
            maybeSendMissionaryMessage: jest.fn()
        };

        // Mock uiManager
        global.uiManager = {
            addMessage: jest.fn()
        };

        // Mock soundManager
        global.soundManager = {
            playSound: jest.fn(),
            playWorldSound: jest.fn()
        };

        mockPlayer = new global.Player();
        mockPlayer.pos = createVector(0, 0);
        mockPlayer.playerFaction = 'PLAYER';
        mockPlayer.wantedLevel = 0;
        mockPlayer.cargo = [];
        mockPlayer.getCargoAmount = function () { return this.cargo.length; };
        mockPlayer.distanceTo = function (target) {
            return dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
        };
        global.player = mockPlayer;

        mockSystem = {
            asteroids: [],
            enemies: [],
            spaceObjects: [],
            projectiles: [],
            station: { pos: createVector(0, 0), size: 100 },
            player: mockPlayer,
            isPlayerWanted: function () {
                return this.player && this.player.wantedLevel > 0;
            },
            getJumpDistance: () => 1,
            _getDiagonalDistance: () => 1000,
            addProjectile: jest.fn(),
            addExplosion: jest.fn(),
            setPlayerWanted: jest.fn()
        };

        enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.currentSystem = mockSystem;
        // Initialize avoidance timer
        enemy._asteroidAvoidTimer = 0;
    });

    describe('Distance Penalty Constants', () => {
        test('should have expected distance penalty multiplier', () => {
            expect(TARGET_SCORE_DISTANCE_PENALTY_MULT).toBe(0.15);
        });

        test('should have expected distance penalty cap', () => {
            expect(TARGET_SCORE_DISTANCE_PENALTY_CAP).toBe(150);
        });

        test('should have ally engagement penalty constants', () => {
            expect(TARGET_SCORE_ALLY_ENGAGED_PENALTY).toBe(25);
            expect(TARGET_SCORE_ALLY_ENGAGED_CAP).toBe(75);
        });
    });

    describe('Space Object Avoidance', () => {
        test('should detect obstacle in path and adjust target', () => {
            // Create system with obstacle directly in path
            mockSystem.asteroids = [
                { pos: createVector(200, 0), size: 80, maxRadius: 40, destroyed: false, isAsteroid: true }
            ];

            // Target directly past the asteroid
            const targetPos = createVector(400, 0);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            expect(safeTarget).toBeDefined();

            // Safe target should be adjusted away from straight line or set avoidance timer
            const wasAdjusted = (safeTarget.y !== targetPos.y) || enemy._asteroidAvoidTimer > 0;
            expect(wasAdjusted).toBe(true);
        });

        test('should not adjust target when no obstacles', () => {
            // Target in clear space
            const targetPos = createVector(0, 500);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            expect(safeTarget.x).toBe(targetPos.x);
            expect(safeTarget.y).toBe(targetPos.y);
            expect(enemy._asteroidAvoidTimer || 0).toBe(0);
        });

        test('should slow down when obstacle is very close', () => {
            // Position enemy very close to asteroid at (200,0)
            mockSystem.asteroids = [
                { pos: createVector(200, 0), size: 80, maxRadius: 40, destroyed: false, isAsteroid: true }
            ];
            enemy.pos.set(160, 0);
            const targetPos = createVector(400, 0);

            enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Should set avoidance timer for velocity damping
            expect(enemy._asteroidAvoidTimer).toBeGreaterThan(0);
        });

        test('should only avoid obstacles larger than itself', () => {
            // Enemy has size ~25 (Sidewinder default)
            enemy.size = 25;

            // Create asteroids: one smaller (diameter 20), one larger (diameter 100)
            mockSystem.asteroids = [
                { pos: createVector(150, 0), size: 20, maxRadius: 10, destroyed: false }, // Smaller
                { pos: createVector(250, 0), size: 100, maxRadius: 50, destroyed: false } // Larger
            ];

            const targetPos = createVector(400, 0);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Should avoid the larger asteroid at 250 but not the smaller at 150
            // Since the larger asteroid is in the path, target should be adjusted or timer set
            const wasAdjusted = (safeTarget.y !== targetPos.y) || enemy._asteroidAvoidTimer > 0;
            expect(wasAdjusted).toBe(true);
        });

        test('should not avoid obstacle of equal size', () => {
            // Enemy has size 25
            enemy.size = 25;

            // Create asteroid with same size (diameter = 25)
            mockSystem.asteroids = [
                { pos: createVector(200, 0), size: 25, maxRadius: 12.5, destroyed: false }
            ];

            const targetPos = createVector(400, 0);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Should not be adjusted since obstacle is equal size
            expect(safeTarget.x).toBe(targetPos.x);
            expect(safeTarget.y).toBe(targetPos.y);
            expect(enemy._asteroidAvoidTimer || 0).toBe(0);
        });

        test('should not avoid smaller ships', () => {
            // Large enemy ship
            enemy.size = 80;

            // Small enemy ship in path
            const smallEnemy = new Enemy(200, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
            smallEnemy.size = 25;
            mockSystem.enemies = [smallEnemy];

            const targetPos = createVector(400, 0);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Should not avoid smaller ship
            expect(safeTarget.x).toBe(targetPos.x);
            expect(safeTarget.y).toBe(targetPos.y);
            expect(enemy._asteroidAvoidTimer || 0).toBe(0);
        });

        test('should avoid larger ships', () => {
            // Small enemy ship
            enemy.size = 25;
            enemy.pos.set(0, 0);

            // Large enemy ship in path
            const largeEnemy = new Enemy(200, 0, mockPlayer, 'Anaconda', AI_ROLE.COMBAT);
            largeEnemy.size = 80;
            mockSystem.enemies = [largeEnemy];

            const targetPos = createVector(400, 0);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Should avoid larger ship
            const wasAdjusted = (safeTarget.y !== targetPos.y) || enemy._asteroidAvoidTimer > 0;
            expect(wasAdjusted).toBe(true);
        });

        test('should avoid larger space objects', () => {
            // Small ship
            enemy.size = 25;
            enemy.pos.set(0, 0);

            // Large space object in path
            mockSystem.spaceObjects = [
                { pos: createVector(200, 0), size: 100, destroyed: false }
            ];

            const targetPos = createVector(400, 0);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Should avoid larger space object
            const wasAdjusted = (safeTarget.y !== targetPos.y) || enemy._asteroidAvoidTimer > 0;
            expect(wasAdjusted).toBe(true);
        });

        test('should not avoid smaller space objects', () => {
            // Large ship
            enemy.size = 80;
            enemy.pos.set(0, 0);

            // Small space object in path
            mockSystem.spaceObjects = [
                { pos: createVector(200, 0), size: 30, destroyed: false }
            ];

            const targetPos = createVector(400, 0);
            const safeTarget = enemy._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Should not avoid smaller space object
            expect(safeTarget.x).toBe(targetPos.x);
            expect(safeTarget.y).toBe(targetPos.y);
            expect(enemy._asteroidAvoidTimer || 0).toBe(0);
        });
    });

    describe('Transport Role Space Object Exception', () => {
        test('should NOT avoid space objects (can dock with them)', () => {
            const transport = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.TRANSPORT);
            transport.currentSystem = mockSystem;
            transport._asteroidAvoidTimer = 0;

            // Only space object in path
            mockSystem.spaceObjects = [
                { pos: createVector(250, 0), size: 60, maxRadius: 30, destroyed: false, isSpaceObject: true }
            ];

            const targetPos = createVector(300, 0);
            const safeTarget = transport._avoidObstaclesAndAdjustTarget(mockSystem, targetPos);

            // Transports should not be adjusted for space objects
            expect(safeTarget.x).toBe(targetPos.x);
            expect(safeTarget.y).toBe(targetPos.y);
            expect(transport._asteroidAvoidTimer || 0).toBe(0);
        });
    });

    describe('Distance-Aware Target Selection', () => {
        test('should penalize distant targets more heavily', () => {
            // Create characters with different distances
            const pirate1 = new Enemy(100, 0, null, 'Sidewinder', AI_ROLE.PIRATE);
            const pirate2 = new Enemy(300, 0, null, 'Sidewinder', AI_ROLE.PIRATE);
            const pirate3 = new Enemy(600, 0, null, 'Sidewinder', AI_ROLE.PIRATE);

            [pirate1, pirate2, pirate3].forEach(p => {
                p.currentSystem = mockSystem;
                p._getShipFaction = () => 'PIRATE';
                p.distanceTo = (target) => dist(p.pos.x, p.pos.y, target.pos.x, target.pos.y);
            });

            // Use enough cargo to provide a good score but avoid capping if possible
            // Actually, with cargo penalty cap, we might still hit 10 if distance is huge.
            // But 100, 300, 600 should show differences.
            mockPlayer.cargo = new Array(20).fill({ name: 'Gold', quantity: 10 });

            const score100 = pirate1.evaluateTargetScore(mockPlayer, mockSystem);
            const score300 = pirate2.evaluateTargetScore(mockPlayer, mockSystem);
            const score600 = pirate3.evaluateTargetScore(mockPlayer, mockSystem);

            expect(score100).toBeGreaterThan(score300);
            expect(score300).toBeGreaterThan(score600);
        });
    });

    describe('Ally Engagement Penalty', () => {
        test('should allow very close ships to engage despite allies', () => {
            const police1 = new Enemy(50, 0, null, 'Viper', AI_ROLE.POLICE);
            const police2 = new Enemy(100, 0, null, 'Viper', AI_ROLE.POLICE);

            [police1, police2].forEach(p => {
                p.currentSystem = mockSystem;
                p._getShipFaction = () => 'POLICE';
                p.distanceTo = (target) => dist(p.pos.x, p.pos.y, target.pos.x, target.pos.y);
            });

            mockPlayer.wantedLevel = 3;
            mockSystem.enemies = [police1, police2];

            // police1 is already targeting player
            police1.target = mockPlayer;

            // police2 is at 100u - within close engagement distance (200u)
            const score = police2.evaluateTargetScore(mockPlayer, mockSystem);

            expect(score).toBeGreaterThan(0);
        });

        test('should apply full ally penalty for distant ships', () => {
            const police1 = new Enemy(0, 0, null, 'Viper', AI_ROLE.POLICE);
            const police2 = new Enemy(0, 0, null, 'Viper', AI_ROLE.POLICE);
            const police3 = new Enemy(0, 0, null, 'Viper', AI_ROLE.POLICE);
            const police4 = new Enemy(600, 0, null, 'Viper', AI_ROLE.POLICE);

            [police1, police2, police3, police4].forEach(p => {
                p.currentSystem = mockSystem;
                p._getShipFaction = () => 'POLICE';
                p.distanceTo = (target) => dist(p.pos.x, p.pos.y, target.pos.x, target.pos.y);
            });

            mockPlayer.wantedLevel = 3;
            mockSystem.enemies = [police1, police2, police3, police4];

            // 3 allies already targeting player
            police1.target = mockPlayer;
            police2.target = mockPlayer;
            police3.target = mockPlayer;

            const score = police4.evaluateTargetScore(mockPlayer, mockSystem);

            expect(score).toBeLessThan(100); // Should be penalized from base 100 + penalty/distance
        });
    });
});
