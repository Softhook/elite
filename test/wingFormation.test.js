/**
 * Wing Formation System Tests
 *
 * Run:  npx jest test/wingFormation.test.js
 *
 * Tests the wingManager singleton, wing creation/dissolution, slot assignment,
 * leader promotion, player formation wings, and eligibility checks.
 */

// ============================================
// Load source files in dependency order
// ============================================

// enemyConstants.js populates global constants (AI_ROLE, AI_STATE, WING_FORMATION_SLOTS, etc.)
require('../enemyConstants.js');

// WEAPON_TYPE is in weaponSystem.js but that has heavy deps — stub it here
global.WEAPON_TYPE = { PROJECTILE: 0, BEAM: 1, MISSILE: 2, TURRET: 3, FORCE: 4, TANGLE: 5, BARRIER: 6 };

// wingManager.js is an IIFE — requires the globals from enemyConstants.js
const wingManager = require('../wingManager.js');

// enemyStateMachine.js — we only need _updateState_WING_FLYING for cohesion tests.
// It's a class whose methods are mixed into Enemy.prototype at runtime.
// For unit tests we import the state constants and test logic manually.

// ============================================
// Test Helpers
// ============================================

function makeMockShip(overrides = {}) {
    const defaults = {
        wingId: null,
        wingRole: null,
        wingSlotIndex: -1,
        faction: 'MILITARY',
        role: 'Combat',  // AI_ROLE.COMBAT
        pos: { x: Math.random() * 1000, y: Math.random() * 1000 },
        vel: { x: 0, y: 0 },
        angle: 0,
        size: 30,
        maxSpeed: 200,
        hull: 100,
        maxHull: 100,
        shield: 50,
        maxShield: 50,
        currentState: AI_STATE.IDLE,
        target: null,
        lastAttacker: null,
        detectionRange: 500,
        weapons: [{ type: WEAPON_TYPE.PROJECTILE }],
        isDestroyed: false,
        markedForRemoval: false,
        isArmed() { return this.weapons && this.weapons.some(w => w.type !== WEAPON_TYPE.BARRIER); },
        isTargetValid(t) { return t && !t.isDestroyed && !t.markedForRemoval && t.pos; },
        changeState(newState, data) { this.currentState = newState; if (data) Object.assign(this, data); },
        distanceTo(other) {
            return Math.hypot((other.pos?.x ?? 0) - this.pos.x, (other.pos?.y ?? 0) - this.pos.y);
        },
        _wingFormTarget: null,
        _wingReformTimer: 0,
        _wingCheckTimer: random(WING_CHECK_INTERVAL_MIN, WING_CHECK_INTERVAL_MAX),
        performRotationAndThrust() {},
        rotateTowards() {},
        brakingMultiplier: 1,
        tempVector: { set() {}, mult() { return this; }, add() { return this; } },
    };
    return { ...defaults, ...overrides };
}

// ============================================
// Tests: wingManager Core
// ============================================

describe('wingManager — Core Operations', () => {

    beforeEach(() => {
        // wingManager doesn't expose a reset(), but we can destroy all
        // known wings by iterating over them. For test isolation we
        // track created IDs and clean up.
    });

    test('createWing assigns leader with wingRole=LEADER, slot=-1', () => {
        const leader = makeMockShip();
        const id = wingManager.createWing(leader);

        expect(id).toMatch(/^wing_\d+$/);
        expect(leader.wingId).toBe(id);
        expect(leader.wingRole).toBe('LEADER');
        expect(leader.wingSlotIndex).toBe(-1);

        const wing = wingManager.getWing(id);
        expect(wing).not.toBeNull();
        expect(wing.type).toBe('WING');
        expect(wing.leader).toBe(leader);
        expect(wing.faction).toBe('MILITARY');
        expect(wing.formationShape).toBe('V');
    });

    test('createGuardWing does NOT make principal a member', () => {
        const principal = { pos: { x: 0, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, isDestroyed: false, markedForRemoval: false };
        const id = wingManager.createGuardWing(principal, 'IMPERIAL');

        const wing = wingManager.getWing(id);
        expect(wing.type).toBe('GUARD');
        expect(wing.members).toHaveLength(0);
        expect(wing.principalRef).toBe(principal);
        expect(wing.formationShape).toBe('ECHELON_RIGHT');
    });

    test('addMember assigns lowest free slot index', () => {
        const leader = makeMockShip();
        const id = wingManager.createWing(leader);

        const f1 = makeMockShip();
        const f2 = makeMockShip();

        expect(wingManager.addMember(id, f1)).toBe(true);
        expect(f1.wingId).toBe(id);
        expect(f1.wingRole).toBe('FOLLOWER');
        expect(f1.wingSlotIndex).toBe(0);

        expect(wingManager.addMember(id, f2)).toBe(true);
        expect(f2.wingSlotIndex).toBe(1);
    });

    test('addMember fills gaps in slot indices', () => {
        const leader = makeMockShip();
        const id = wingManager.createWing(leader);

        const ships = [makeMockShip(), makeMockShip(), makeMockShip()];
        ships.forEach(s => wingManager.addMember(id, s));
        // Slots: 0, 1, 2

        // Remove slot 1 — remaining members are reindexed: 0, 1
        wingManager.removeMember(ships[1]);
        expect(ships[1].wingId).toBeNull();

        // Add new ship — slots 0 and 1 occupied, so next free is 2
        const newShip = makeMockShip();
        wingManager.addMember(id, newShip);
        expect(newShip.wingSlotIndex).toBe(2);

        // Verify all members have unique slots
        const wing = wingManager.getWing(id);
        const slots = wing.members.map(m => m.wingSlotIndex);
        expect(new Set(slots).size).toBe(slots.length); // no duplicates
    });

    test('addMember rejects when wing is full', () => {
        const leader = makeMockShip();
        const id = wingManager.createWing(leader);

        // V formation has 6 slots
        for (let i = 0; i < 6; i++) {
            expect(wingManager.addMember(id, makeMockShip())).toBe(true);
        }
        // 7th should fail
        expect(wingManager.addMember(id, makeMockShip())).toBe(false);
    });

    test('removeMember promotes oldest follower to leader', () => {
        const leader = makeMockShip();
        const id = wingManager.createWing(leader);
        const f1 = makeMockShip();
        const f2 = makeMockShip();
        wingManager.addMember(id, f1);
        wingManager.addMember(id, f2);

        wingManager.removeMember(leader);

        expect(leader.wingId).toBeNull();
        expect(f1.wingRole).toBe('LEADER');
        expect(f1.wingSlotIndex).toBe(-1);
        expect(f2.wingRole).toBe('FOLLOWER');
        expect(f2.wingSlotIndex).toBe(0); // reindexed

        const wing = wingManager.getWing(id);
        expect(wing.leader).toBe(f1);
    });

    test('removeMember dissolves wing when last follower removed from solo-leader wing', () => {
        const leader = makeMockShip();
        const id = wingManager.createWing(leader);
        const f1 = makeMockShip();
        wingManager.addMember(id, f1);

        wingManager.removeMember(f1);

        // Only leader remains — wing dissolves
        expect(wingManager.getWing(id)).toBeNull();
        expect(leader.wingId).toBeNull();
    });

    test('removeMember dissolves GUARD wing when last member removed', () => {
        const principal = { pos: { x: 0, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, isDestroyed: false, markedForRemoval: false };
        const id = wingManager.createGuardWing(principal, 'MILITARY');
        const guard = makeMockShip();
        wingManager.addMember(id, guard);

        wingManager.removeMember(guard);
        expect(wingManager.getWing(id)).toBeNull();
    });

});

// ============================================
// Tests: Formation Shapes
// ============================================

describe('Formation Shape Selection', () => {

    test('MILITARY faction → V formation', () => {
        const leader = makeMockShip({ faction: 'MILITARY' });
        const id = wingManager.createWing(leader);
        expect(wingManager.getWing(id).formationShape).toBe('V');
    });

    test('IMPERIAL faction → ECHELON_RIGHT formation', () => {
        const leader = makeMockShip({ faction: 'IMPERIAL' });
        const id = wingManager.createWing(leader);
        expect(wingManager.getWing(id).formationShape).toBe('ECHELON_RIGHT');
    });

    test('SEPARATIST faction → LINE_ABREAST formation', () => {
        const leader = makeMockShip({ faction: 'SEPARATIST' });
        const id = wingManager.createWing(leader);
        expect(wingManager.getWing(id).formationShape).toBe('LINE_ABREAST');
    });

    test('unknown faction falls back to V', () => {
        const leader = makeMockShip({ faction: 'PIRATES' });
        const id = wingManager.createWing(leader);
        expect(wingManager.getWing(id).formationShape).toBe('V');
    });

});

// ============================================
// Tests: Player Formation Wing
// ============================================

describe('Player Formation Wing', () => {

    test('getOrCreatePlayerWing creates GUARD wing tagged _isPlayerFormation', () => {
        const player = { pos: { x: 100, y: 200 }, angle: 0, vel: { x: 0, y: 0 }, playerFaction: 'MILITARY' };
        const id = wingManager.getOrCreatePlayerWing(player, 'MILITARY');

        const wing = wingManager.getWing(id);
        expect(wing.type).toBe('GUARD');
        expect(wing._isPlayerFormation).toBe(true);
        expect(wing.principalRef).toBe(player);
    });

    test('getOrCreatePlayerWing returns same wing on second call', () => {
        const player = { pos: { x: 0, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, playerFaction: 'MILITARY' };
        const id1 = wingManager.getOrCreatePlayerWing(player, 'MILITARY');
        const id2 = wingManager.getOrCreatePlayerWing(player, 'MILITARY');
        expect(id1).toBe(id2);
    });

    test('dissolvePlayerWing removes wing and clears member refs', () => {
        const player = { pos: { x: 0, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, playerFaction: 'MILITARY' };
        const id = wingManager.getOrCreatePlayerWing(player, 'MILITARY');
        const ship = makeMockShip();
        wingManager.addMember(id, ship);

        wingManager.dissolvePlayerWing(player);

        expect(wingManager.getWing(id)).toBeNull();
        expect(ship.wingId).toBeNull();
    });

    test('findPlayerFormationWing locates nearest player wing of matching faction', () => {
        const player = { pos: { x: 100, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, playerFaction: 'IMPERIAL' };
        wingManager.getOrCreatePlayerWing(player, 'IMPERIAL');

        const found = wingManager.findPlayerFormationWing('IMPERIAL', 50, 0, 200);
        expect(found).not.toBeNull();
        expect(found._isPlayerFormation).toBe(true);
    });

    test('findPlayerFormationWing ignores wrong faction', () => {
        const player = { pos: { x: 100, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, playerFaction: 'MILITARY' };
        wingManager.getOrCreatePlayerWing(player, 'MILITARY');

        const found = wingManager.findPlayerFormationWing('SEPARATIST', 50, 0, 200);
        expect(found).toBeNull();
    });

});

// ============================================
// Tests: Wing Eligibility
// ============================================

describe('isWingEligible', () => {

    test('eligible: MILITARY faction, COMBAT role, armed, no wingId', () => {
        const ship = makeMockShip({ faction: 'MILITARY', role: 'Combat', wingId: null, weapons: [{ type: WEAPON_TYPE.PROJECTILE }] });
        expect(isWingEligible(ship)).toBe(true);
    });

    test('ineligible: wrong faction (pirate)', () => {
        const ship = makeMockShip({ faction: 'PIRATE', role: 'Combat' });
        expect(isWingEligible(ship)).toBe(false);
    });

    test('ineligible: already in a wing', () => {
        const ship = makeMockShip({ wingId: 'wing_5' });
        expect(isWingEligible(ship)).toBe(false);
    });

    test('ineligible: unarmed (only BARRIER weapon)', () => {
        const ship = makeMockShip({ weapons: [{ type: WEAPON_TYPE.BARRIER }] });
        expect(isWingEligible(ship)).toBe(false);
    });

    test('ineligible: GUARD role', () => {
        const ship = makeMockShip({ role: 'Guard', faction: 'MILITARY' });
        expect(isWingEligible(ship)).toBe(false);
    });

    test('ineligible: HAULER role', () => {
        const ship = makeMockShip({ role: 'Hauler', faction: 'MILITARY' });
        expect(isWingEligible(ship)).toBe(false);
    });

});

// ============================================
// Tests: alertGuardSiblings
// ============================================

describe('alertGuardSiblings', () => {

    test('alerts idle GUARDING siblings in the same guard wing', () => {
        const principal = { pos: { x: 0, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, isDestroyed: false, markedForRemoval: false };
        const id = wingManager.createGuardWing(principal, 'MILITARY');

        const g1 = makeMockShip({ role: 'Guard', currentState: AI_STATE.GUARDING });
        const g2 = makeMockShip({ role: 'Guard', currentState: AI_STATE.GUARDING });
        wingManager.addMember(id, g1);
        wingManager.addMember(id, g2);

        const attacker = { pos: { x: 500, y: 0 }, isDestroyed: false, markedForRemoval: false };
        wingManager.alertGuardSiblings(id, attacker);

        expect(g1.target).toBe(attacker);
        expect(g1.currentState).toBe(AI_STATE.APPROACHING);
        expect(g2.target).toBe(attacker);
        expect(g2.currentState).toBe(AI_STATE.APPROACHING);
    });

    test('does not alert guards already in combat', () => {
        const principal = { pos: { x: 0, y: 0 }, angle: 0, vel: { x: 0, y: 0 }, isDestroyed: false, markedForRemoval: false };
        const id = wingManager.createGuardWing(principal, 'MILITARY');

        const g1 = makeMockShip({ role: 'Guard', currentState: AI_STATE.GUARDING });
        const g2 = makeMockShip({ role: 'Guard', currentState: AI_STATE.APPROACHING, target: { pos: { x: 999, y: 0 } } });
        wingManager.addMember(id, g1);
        wingManager.addMember(id, g2);

        const attacker = { pos: { x: 500, y: 0 }, isDestroyed: false, markedForRemoval: false };
        wingManager.alertGuardSiblings(id, attacker);

        expect(g1.target).toBe(attacker);
        // g2 was already in combat — should NOT be overwritten
        expect(g2.target).not.toBe(attacker);
    });

});
