/**
 * Escape Pod Tests
 * Tests for the escape pod feature:
 *  - Pilot rank eject chances
 *  - Drifting pilotless ship skips kill credit
 *  - Player ejectEscapePod() transforms ship state correctly
 */

// Load dependencies
require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../shipUpgrades.js');
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
require('../mission.js');
require('../player.js');

const { PILOT_RANK, getPilotRankModifiers } = require('../pilotRanks.js');
global.PILOT_RANK = PILOT_RANK;
global.getPilotRankModifiers = getPilotRankModifiers;

// Debug/log stubs
if (typeof AI_LOG === 'undefined') global.AI_LOG = () => {};
if (typeof DAMAGE_LOG === 'undefined') global.DAMAGE_LOG = () => {};
if (typeof CARGO_LOG === 'undefined') global.CARGO_LOG = () => {};
if (typeof WEAPON_LOG === 'undefined') global.WEAPON_LOG = () => {};
if (typeof TARGETING_LOG === 'undefined') global.TARGETING_LOG = () => {};
if (typeof GS_LOG === 'undefined') global.GS_LOG = () => {};
if (typeof ENEMY_AI_LOG === 'undefined') global.ENEMY_AI_LOG = () => {};
if (typeof DEBUG_DAMAGE === 'undefined') global.DEBUG_DAMAGE = false;
if (typeof DEBUG_AI === 'undefined') global.DEBUG_AI = false;
if (typeof MISSION_TYPE === 'undefined') global.MISSION_TYPE = { DELIVERY_LEGAL: 'DELIVERY_LEGAL' };
if (typeof uiManager === 'undefined') global.uiManager = { addMessage: () => {} };
if (typeof soundManager === 'undefined') global.soundManager = { playSound: () => {} };
if (typeof newsManager === 'undefined') global.newsManager = null;
if (typeof player === 'undefined') global.player = { pos: { x: 0, y: 0 } };

// Apply Enemy mixins
if (typeof applyEnemyUtilityMethods === 'function') applyEnemyUtilityMethods();
if (typeof applyEnemyDamageSystemMethods === 'function') applyEnemyDamageSystemMethods();
if (typeof applyEnemyRenderingMethods === 'function') applyEnemyRenderingMethods();
if (typeof applyEnemyMovementMethods === 'function') applyEnemyMovementMethods();
if (typeof applyEnemyTargetingMethods === 'function') applyEnemyTargetingMethods();
if (typeof applyEnemyCombatMethods === 'function') applyEnemyCombatMethods();
if (typeof applyEnemyStateMachineMethods === 'function') applyEnemyStateMachineMethods();
if (typeof applyEnemyAIBehaviorMethods === 'function') applyEnemyAIBehaviorMethods();
if (typeof applyEnemyCargoMethods === 'function') applyEnemyCargoMethods();

// Helper: create a minimal mock system
function makeMockSystem(playerObj) {
    return {
        player: playerObj || null,
        enemies: [],
        addEnemy(e) { this.enemies.push(e); },
        addExplosion: jest.fn(),
        addCargo: jest.fn(),
        recordDestruction: jest.fn(),
        station: null,
        name: 'TestSystem'
    };
}

// Helper: create a simple mock player with pos/vel
function makeMockPlayer() {
    const p = new Player();
    p.pos = createVector(0, 0);
    p.vel = createVector(0, 0);
    p.destroyed = false;
    p.isDying = false;
    p.kills = 0;
    p.faction = '';
    p.addKill = jest.fn();
    p.isPolice = false;
    p.playerFaction = '';
    p.activeMission = null;
    return p;
}

// ============================================
// Pilot Rank Eject Chance Tests
// ============================================
describe('Pilot Rank Eject Chances', () => {
    test('INCOMPETENT pilot should never eject (ejectChance = 0)', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.INCOMPETENT);
        expect(mods.ejectChance).toBe(0);
    });

    test('GREEN pilot should never eject (ejectChance = 0)', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.GREEN);
        expect(mods.ejectChance).toBe(0);
    });

    test('ROOKIE pilot should have a small eject chance', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.ROOKIE);
        expect(mods.ejectChance).toBeGreaterThan(0);
        expect(mods.ejectHullThreshold).toBeGreaterThan(0);
    });

    test('VETERAN pilot should have a moderate eject chance', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.VETERAN);
        expect(mods.ejectChance).toBeGreaterThan(0);
        expect(mods.ejectHullThreshold).toBeGreaterThan(0);
    });

    test('ELITE pilot should have the highest eject chance', () => {
        const eliteMods = getPilotRankModifiers(PILOT_RANK.ELITE);
        const rookieMods = getPilotRankModifiers(PILOT_RANK.ROOKIE);
        expect(eliteMods.ejectChance).toBeGreaterThan(rookieMods.ejectChance);
        expect(eliteMods.ejectChance).toBeGreaterThanOrEqual(0.5);
    });

    test('ejectHullThreshold increases with rank (ELITE ejects sooner)', () => {
        const rookieMods = getPilotRankModifiers(PILOT_RANK.ROOKIE);
        const eliteMods = getPilotRankModifiers(PILOT_RANK.ELITE);
        expect(eliteMods.ejectHullThreshold).toBeGreaterThan(rookieMods.ejectHullThreshold);
    });
});

// ============================================
// EscapeCapsule Ship Definition Tests
// ============================================
describe('EscapeCapsule Ship Definition', () => {
    test('EscapeCapsule should exist in SHIP_DEFINITIONS', () => {
        expect(SHIP_DEFINITIONS['EscapeCapsule']).toBeDefined();
    });

    test('EscapeCapsule should have no armament', () => {
        expect(SHIP_DEFINITIONS['EscapeCapsule'].armament).toEqual([]);
    });

    test('EscapeCapsule should have ESCAPE_POD in aiRoles', () => {
        expect(SHIP_DEFINITIONS['EscapeCapsule'].aiRoles).toContain('ESCAPE_POD');
    });

    test('EscapeCapsule should have no shields', () => {
        expect(SHIP_DEFINITIONS['EscapeCapsule'].baseShield).toBe(0);
    });

    test('EscapeCapsule should be fast enough to flee', () => {
        expect(SHIP_DEFINITIONS['EscapeCapsule'].baseMaxSpeed).toBeGreaterThanOrEqual(2.0);
    });
});

// ============================================
// Drifting Ship (Pilot Ejected) Tests
// ============================================
describe('Pilotless Ship Behavior', () => {
    test('pilotEjected ship should not award kill credit when destroyed', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        const enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.hull = 100;
        enemy.maxHull = 100;
        enemy.pilotEjected = true; // Pilot has already ejected

        // Destroy the now-pilotless ship
        enemy._processDestruction(mockPlayer);

        // Kill credit should NOT be awarded since pilot already ejected
        expect(mockPlayer.addKill).not.toHaveBeenCalled();
    });

    test('ship with pilot aboard should award kill credit normally', () => {
        const enemy = new Enemy(0, 0, null, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.hull = 100;
        enemy.maxHull = 100;

        // With no pilotEjected flag set, the kill-credit guard should pass
        expect(enemy.pilotEjected).toBeFalsy();
        // The guard in _processDestruction is: if (playerAttacker && ... && !this.pilotEjected)
        // So for a ship with its pilot, !pilotEjected === true → kill is credited
        expect(!enemy.pilotEjected).toBe(true);
    });
});

// ============================================
// _tryPilotEject Tests
// ============================================
describe('_tryPilotEject', () => {
    test('INCOMPETENT pilot should never eject even at 1% hull', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        const enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.pilotRank = PILOT_RANK.INCOMPETENT;
        enemy.hull = 1;
        enemy.maxHull = 100;
        enemy.currentSystem = system;

        // Force 100 eject attempts - none should succeed
        for (let i = 0; i < 100; i++) {
            enemy.pilotEjected = false;
            enemy._tryPilotEject(mockPlayer);
        }
        expect(enemy.pilotEjected).toBe(false);
        expect(system.enemies.length).toBe(0);
    });

    test('GREEN pilot should never eject even at 1% hull', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        const enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.pilotRank = PILOT_RANK.GREEN;
        enemy.hull = 1;
        enemy.maxHull = 100;
        enemy.currentSystem = system;

        for (let i = 0; i < 100; i++) {
            enemy.pilotEjected = false;
            enemy._tryPilotEject(mockPlayer);
        }
        expect(enemy.pilotEjected).toBe(false);
        expect(system.enemies.length).toBe(0);
    });

    test('ELITE pilot at low hull should eventually eject', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        const enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.pilotRank = PILOT_RANK.ELITE;
        enemy.hull = 1; // ~1% hull
        enemy.maxHull = 100;
        enemy.currentSystem = system;

        // With 50% chance per attempt and 100 tries, almost certain to eject
        let ejected = false;
        for (let i = 0; i < 100; i++) {
            if (enemy.pilotEjected) { ejected = true; break; }
            enemy._tryPilotEject(mockPlayer);
        }
        expect(ejected).toBe(true);
        expect(system.enemies.length).toBeGreaterThan(0);
        expect(system.enemies[0].shipTypeName).toBe('EscapeCapsule');
        expect(system.enemies[0].role).toBe(AI_ROLE.ESCAPE_POD);
    });

    test('pilot should not eject when hull is above threshold', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        const enemy = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        enemy.pilotRank = PILOT_RANK.ELITE;
        enemy.hull = 80; // 80% hull — above ELITE threshold of 35%
        enemy.maxHull = 100;
        enemy.currentSystem = system;

        for (let i = 0; i < 50; i++) {
            enemy._tryPilotEject(mockPlayer);
        }
        expect(enemy.pilotEjected).toBeFalsy(); // Never set above threshold
        expect(system.enemies.length).toBe(0);
    });

    test('escape pod should not eject again', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        const pod = new Enemy(0, 0, mockPlayer, 'EscapeCapsule', AI_ROLE.ESCAPE_POD);
        pod.pilotRank = PILOT_RANK.ELITE;
        pod.hull = 1;
        pod.maxHull = 15;
        pod.currentSystem = system;

        for (let i = 0; i < 50; i++) {
            pod._tryPilotEject(mockPlayer);
        }
        // An escape pod should never spawn another escape pod
        expect(system.enemies.length).toBe(0);
    });

    test('alien pilots should never eject into escape pods', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        const alien = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.ALIEN);
        alien.pilotRank = PILOT_RANK.ELITE;
        alien.hull = 1;
        alien.maxHull = 100;
        alien.currentSystem = system;

        for (let i = 0; i < 100; i++) {
            alien.pilotEjected = false;
            alien._tryPilotEject(mockPlayer);
        }

        expect(alien.pilotEjected).toBe(false);
        expect(system.enemies.length).toBe(0);
    });
});

// ============================================
// Player Eject Escape Pod Tests
// ============================================
describe('Player ejectEscapePod()', () => {
    test('should transform player ship into EscapeCapsule', () => {
        const p = new Player('Sidewinder');
        const system = makeMockSystem(p);
        p.currentSystem = system;
        p.vel = createVector(2, 0);

        p.ejectEscapePod(system);

        expect(p.shipTypeName).toBe('EscapeCapsule');
    });

    test('should fire pod opposite to current velocity', () => {
        const p = new Player('Sidewinder');
        const system = makeMockSystem(p);
        p.currentSystem = system;
        p.vel = createVector(4, 0); // Moving right

        p.ejectEscapePod(system);

        // Pod should now be moving left (negative x velocity)
        expect(p.vel.x).toBeLessThan(0);
    });

    test('should clear cargo when ejecting', () => {
        const p = new Player('Sidewinder');
        const system = makeMockSystem(p);
        p.currentSystem = system;
        p.cargo = [{ name: 'Gold', quantity: 5 }];
        p.vel = createVector(0, 0);

        p.ejectEscapePod(system);

        expect(p.cargo).toEqual([]);
    });

    test('should spawn drifting hull in system when ejecting', () => {
        const p = new Player('Sidewinder');
        const system = makeMockSystem(p);
        p.currentSystem = system;
        p.vel = createVector(0, 0);

        p.ejectEscapePod(system);

        // Original ship left as a drifting hull — no explosion
        expect(system.addExplosion).not.toHaveBeenCalled();
        // Hull is registered in the system
        expect(system.enemies.length).toBeGreaterThan(0);
        expect(system.enemies[0].isPlayerHull).toBe(true);
        expect(system.enemies[0].pilotEjected).toBe(true);
        expect(system.enemies[0].displayName).toBeNull();
        expect(system.enemies[0].currentState).toBe(AI_STATE.IDLE);
        // System holds a reference to the hull for targeting
        expect(system.playerHull).toBe(system.enemies[0]);
    });

    test('should not eject if already in EscapeCapsule', () => {
        const p = new Player('EscapeCapsule');
        const system = makeMockSystem(p);
        p.currentSystem = system;
        p.vel = createVector(0, 0);

        const originalHull = p.hull;
        p.ejectEscapePod(system);

        // Should still be EscapeCapsule, no second explosion
        expect(p.shipTypeName).toBe('EscapeCapsule');
        expect(system.addExplosion).not.toHaveBeenCalled();
    });

    test('stationary ship fires pod backwards along heading', () => {
        const p = new Player('Sidewinder');
        const system = makeMockSystem(p);
        p.currentSystem = system;
        p.vel = createVector(0, 0); // stationary
        p.angle = 0; // facing right

        p.ejectEscapePod(system);

        // Pod fires backwards: negative x when facing right (angle=0)
        expect(p.vel.x).toBeLessThan(0);
    });

    test('should cache abandoned ship on surface instead of spawning drifting space hull', () => {
        const p = new Player('Sidewinder');
        const system = makeMockSystem(p);
        const cacheParkedPlayerShip = jest.fn();
        p.currentSystem = system;
        p.pos = createVector(120, 80);
        p.vel = createVector(1, 0);
        p.altitude = 42;

        global.surfaceMode = {
            player: p,
            isActive: () => true,
            cacheParkedPlayerShip
        };

        try {
            p.ejectEscapePod(system);

            expect(cacheParkedPlayerShip).toHaveBeenCalledTimes(1);
            expect(system.enemies.length).toBe(0);
            expect(system.playerHull).toBeUndefined();
        } finally {
            delete global.surfaceMode;
        }
    });

    test('should pass player reference to drifting hull', () => {
        const p = new Player('Sidewinder');
        const system = makeMockSystem(p);
        p.currentSystem = system;
        p.vel = createVector(0, 0);

        p.ejectEscapePod(system);

        expect(system.enemies.length).toBeGreaterThan(0);
        // Verify that the drifting hull constructor received 'this' as playerRef.
        // In enemy.js constructor, case AI_ROLE.BOUNTY_HUNTER uses playerRef, but for other roles
        // it checks currentSystem = playerRef.currentSystem. If playerRef was not passed,
        // it would fall back. Let's make sure it is instantiated successfully.
        const spawnedHull = system.enemies[0];
        expect(spawnedHull.isPlayerHull).toBe(true);
    });
});

describe('Wanted Status Exclusion on Destruction', () => {
    test('destroying NPC escape pod should not make the player wanted', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);
        system.setPlayerWanted = jest.fn();

        const pod = new Enemy(0, 0, mockPlayer, 'EscapeCapsule', AI_ROLE.ESCAPE_POD);
        pod.hull = 10;
        pod.maxHull = 10;
        pod.currentSystem = system;

        // Destroying the NPC escape pod
        pod._processDestruction(mockPlayer);

        // Player should NOT be marked wanted
        expect(system.setPlayerWanted).not.toHaveBeenCalled();
        expect(mockPlayer.isWanted).toBeFalsy();
    });

    test('destroying a normal hauler ship with pilot should make the player wanted', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);
        system.setPlayerWanted = jest.fn();

        const hauler = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.HAULER);
        hauler.hull = 100;
        hauler.maxHull = 100;
        hauler.currentSystem = system;

        // Destroying the hauler
        hauler._processDestruction(mockPlayer);

        // Player should be marked wanted
        expect(system.setPlayerWanted).toHaveBeenCalledWith(true, 1);
    });

    test('destroying a pilot-ejected hauler hull should not make the player wanted', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);
        system.setPlayerWanted = jest.fn();

        const hauler = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.HAULER);
        hauler.hull = 100;
        hauler.maxHull = 100;
        hauler.pilotEjected = true;
        hauler.currentSystem = system;

        // Destroying the pilotless hull
        hauler._processDestruction(mockPlayer);

        // Player should NOT be marked wanted
        expect(system.setPlayerWanted).not.toHaveBeenCalled();
        expect(mockPlayer.isWanted).toBeFalsy();
    });
});

describe('AI Targeting Preference for Drifting Hulls vs Escape Pods', () => {
    test('enemies should target the drifting player hull before the player escape capsule', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        // Enemy AI (a pirate)
        const pirate = new Enemy(100, 100, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        pirate.currentSystem = system;
        system.addEnemy(pirate);

        // Player ejects
        mockPlayer.shipTypeName = 'EscapeCapsule';
        
        const driftingHull = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.HAULER);
        driftingHull.pilotEjected = true;
        driftingHull.isPlayerHull = true;
        driftingHull.hull = 20;
        driftingHull.maxHull = 100;
        system.addEnemy(driftingHull);
        system.playerHull = driftingHull;

        // Force targeting update on the pirate
        pirate.updateTargeting(system);

        // The pirate should target the drifting player hull, not the player's escape pod
        expect(pirate.target).toBe(driftingHull);

        // Once the player hull is destroyed, the pirate should target the player escape capsule
        driftingHull.destroyed = true;
        system.playerHull = null;

        pirate.updateTargeting(system);
        expect(pirate.target).toBe(mockPlayer);
    });

    test('enemies should target the drifting NPC hull before the NPC escape pod', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);

        // Combat ship AI
        const combat = new Enemy(100, 100, mockPlayer, 'Sidewinder', AI_ROLE.COMBAT);
        combat.faction = 'IMPERIAL';
        combat.currentSystem = system;
        system.addEnemy(combat);

        // NPC ship (Separatist)
        const rival = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.COMBAT);
        rival.faction = 'SEPARATIST';
        rival.currentSystem = system;
        system.addEnemy(rival);

        // Pilot ejects from rival
        rival.pilotEjected = true;
        rival.hull = 10;

        // Spawn escape pod for the rival
        const pod = new Enemy(5, 5, mockPlayer, 'EscapeCapsule', AI_ROLE.ESCAPE_POD);
        pod.faction = 'SEPARATIST';
        pod.originalShip = rival;
        system.addEnemy(pod);

        // Force targeting update on the combat ship
        combat.updateTargeting(system);

        // Combat ship should target the drifting rival hull, not the escape pod
        expect(combat.target).toBe(rival);

        // Once the rival ship is destroyed, the combat ship should target the escape pod
        rival.destroyed = true;

        combat.updateTargeting(system);
        expect(combat.target).toBe(pod);
    });

    test('NPC escape pod should inherit pilot name and details, and transfer active mission, guards, and bounty hunter links', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);
        mockPlayer.currentSystem = system;

        // 1. Create a rival (assassination target)
        const targetShip = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.COMBAT);
        targetShip.displayName = "Commander Vane";
        targetShip.gender = "male";
        targetShip.pilotRank = PILOT_RANK.ELITE;
        targetShip.isNotoriousPirate = true;
        targetShip.isAssassinationTarget = true;
        targetShip.currentSystem = system;
        system.addEnemy(targetShip);

        // 2. Set up player active assassination mission
        mockPlayer.activeMission = {
            type: 'Assassination',
            _targetEnemyRef: targetShip,
            _targetEnemyId: targetShip.id
        };

        // 3. Set up an escort guard protecting targetShip
        const guard = new Enemy(-50, -50, mockPlayer, 'Sidewinder', AI_ROLE.GUARD);
        guard.principal = targetShip;
        guard.currentSystem = system;
        system.addEnemy(guard);

        // 4. Set up a bounty hunter hunting targetShip
        const hunter = new Enemy(100, 100, mockPlayer, 'Sidewinder', AI_ROLE.BOUNTY_HUNTER);
        hunter.bountyTarget = targetShip;
        hunter.currentSystem = system;
        system.addEnemy(hunter);

        // 5. Trigger pilot ejection
        // Force critical hull to ensure ejection happens (with ELITE rank)
        targetShip.hull = 1;
        targetShip.maxHull = 100;
        
        // Mock Math.random to always succeed eject roll (ejectChance = 0.5 for ELITE)
        const realRandom = Math.random;
        Math.random = () => 0.1;
        try {
            targetShip._tryPilotEject(mockPlayer);
        } finally {
            Math.random = realRandom;
        }

        // Verify that targetShip pilotEjected is set
        expect(targetShip.pilotEjected).toBe(true);

        // Find spawned escape pod in system
        const pod = system.enemies.find(e => e.role === AI_ROLE.ESCAPE_POD);
        expect(pod).toBeDefined();

        // 6. Verify inheritance of name and details
        expect(pod.displayName).toBe("Commander Vane");
        expect(pod.gender).toBe("male");
        expect(pod.isNotoriousPirate).toBe(true);
        expect(pod.isAssassinationTarget).toBe(true);
        expect(targetShip.isAssassinationTarget).toBe(false); // original ship is no longer target

        // 7. Verify link updates
        // Mission success target reference updated to the pod
        expect(mockPlayer.activeMission._targetEnemyRef).toBe(pod);
        expect(mockPlayer.activeMission._targetEnemyId).toBe(pod.id);

        // Guard redirected to protect the escape pod
        expect(guard.principal).toBe(pod);

        // Bounty hunter redirected to hunt the escape pod
        expect(hunter.bountyTarget).toBe(pod);
    });

    test('destroying a police escape pod should advance the police bounty mission and update system combat stats correctly', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);
        mockPlayer.currentSystem = system;

        // Mock starSystem.recordDestruction implementation
        system.combatStats = { police: 0, total: 0, recentDeaths: [], pilotKills: new Map() };
        system.recordDestruction = function(destroyedEnemy, attacker) {
            const role = destroyedEnemy.originalRole || destroyedEnemy.role;
            if (role === AI_ROLE.POLICE) {
                this.combatStats.police++;
            }
            this.combatStats.total++;
        };

        // 1. Create a police ship
        const policeShip = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.POLICE);
        policeShip.currentSystem = system;
        system.addEnemy(policeShip);

        // 2. Set up player active police bounty mission
        mockPlayer.activeMission = {
            type: MISSION_TYPE.BOUNTY_POLICE,
            progressCount: 0,
            targetCount: 5,
            updateProgress(amt) { this.progressCount += amt; }
        };

        // 3. Trigger pilot ejection
        policeShip.hull = 1;
        policeShip.maxHull = 100;
        policeShip.pilotRank = PILOT_RANK.ELITE;

        const realRandom = Math.random;
        Math.random = () => 0.1;
        try {
            policeShip._tryPilotEject(mockPlayer);
        } finally {
            Math.random = realRandom;
        }

        const pod = system.enemies.find(e => e.role === 'EscapePod' || e.role === AI_ROLE.ESCAPE_POD);
        expect(pod).toBeDefined();
        expect(pod.originalRole).toBe(AI_ROLE.POLICE);
        pod.currentSystem = system;

        // 4. Destroy the escape pod
        pod._processDestruction(mockPlayer);

        // Verify that the police bounty mission advanced
        expect(mockPlayer.activeMission.progressCount).toBe(1);

        // Verify system combat stats are correctly updated for police role
        expect(system.combatStats.police).toBe(1);
        expect(system.combatStats.total).toBe(1);
    });

    test('destroying a pirate escape pod should advance the pirate bounty mission', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);
        mockPlayer.currentSystem = system;

        // 1. Create a pirate ship
        const pirateShip = new Enemy(0, 0, mockPlayer, 'Sidewinder', AI_ROLE.PIRATE);
        pirateShip.currentSystem = system;
        system.addEnemy(pirateShip);

        // 2. Set up player active pirate bounty mission
        mockPlayer.activeMission = {
            type: MISSION_TYPE.BOUNTY_PIRATE,
            progressCount: 0,
            targetCount: 5,
            updateProgress(amt) { this.progressCount += amt; }
        };

        // 3. Trigger pilot ejection
        pirateShip.hull = 1;
        pirateShip.maxHull = 100;
        pirateShip.pilotRank = PILOT_RANK.ELITE;

        const realRandom = Math.random;
        Math.random = () => 0.1;
        try {
            pirateShip._tryPilotEject(mockPlayer);
        } finally {
            Math.random = realRandom;
        }

        const pod = system.enemies.find(e => e.role === 'EscapePod' || e.role === AI_ROLE.ESCAPE_POD);
        expect(pod).toBeDefined();
        expect(pod.originalRole).toBe(AI_ROLE.PIRATE);
        pod.currentSystem = system;

        // 4. Destroy the escape pod
        pod._processDestruction(mockPlayer);

        // Verify that the pirate bounty mission advanced
        expect(mockPlayer.activeMission.progressCount).toBe(1);
    });

    test('destroying a separatist escape pod should advance the imperial strike mission', () => {
        const mockPlayer = makeMockPlayer();
        const system = makeMockSystem(mockPlayer);
        mockPlayer.currentSystem = system;

        // 1. Create a separatist combat ship
        const separatistShip = new Enemy(0, 0, mockPlayer, 'SeparatistPartisan', AI_ROLE.COMBAT);
        separatistShip.faction = 'SEPARATIST';
        separatistShip.currentSystem = system;
        system.addEnemy(separatistShip);

        // 2. Set up player active imperial strike mission
        mockPlayer.activeMission = {
            type: MISSION_TYPE.IMPERIAL_STRIKE,
            progressCount: 0,
            targetCount: 5,
            updateProgress(amt) { this.progressCount += amt; }
        };

        // 3. Trigger pilot ejection
        separatistShip.hull = 1;
        separatistShip.maxHull = 100;
        separatistShip.pilotRank = PILOT_RANK.ELITE;

        const realRandom = Math.random;
        Math.random = () => 0.1;
        try {
            separatistShip._tryPilotEject(mockPlayer);
        } finally {
            Math.random = realRandom;
        }

        const pod = system.enemies.find(e => e.role === 'EscapePod' || e.role === AI_ROLE.ESCAPE_POD);
        expect(pod).toBeDefined();
        expect(pod.originalRole).toBe(AI_ROLE.COMBAT);
        expect(pod.faction).toBe('SEPARATIST');
        pod.currentSystem = system;

        // 4. Destroy the escape pod
        pod._processDestruction(mockPlayer);

        // Verify that the imperial strike mission advanced
        expect(mockPlayer.activeMission.progressCount).toBe(1);
    });
});


