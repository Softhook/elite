/**
 * Enemy AI Environmental Hazard Awareness Tests
 *
 * Validates that enemy pilots react to nebulae and cosmic storms
 * proportionally to their pilot rank / environmentAwareness modifier.
 *
 * Behaviour rules under test:
 *   1. All ranks have environmental awareness; lower ranks react probabilistically.
 *   2. Veteran pilots (awareness 1.0) always escape dangerous zones and retreat
 *      to a nearby EMP nebula when hull drops to < 15 %.
 *   3. Elite pilots (awareness 1.5) retreat to EMP nebula at < 25 % hull and
 *      immediately begin approaching a target that is inside a dangerous zone.
 */

// --- Globals required before any game module is loaded ---

global.createVector = (x, y) => {
    const v = {
        x: x || 0,
        y: y || 0,
        set(nx, ny) { this.x = nx || 0; this.y = ny || 0; return this; },
        add(o) { this.x += o.x; this.y += o.y; return this; },
        sub(o) { this.x -= o.x; this.y -= o.y; return this; },
        mult(n) { this.x *= n; this.y *= n; return this; },
        div(n) { this.x /= n; this.y /= n; return this; },
        normalize() {
            const m = Math.sqrt(this.x * this.x + this.y * this.y);
            if (m > 0) this.div(m);
            return this;
        },
        mag() { return Math.sqrt(this.x * this.x + this.y * this.y); },
        magSq() { return this.x * this.x + this.y * this.y; },
        copy() { return global.createVector(this.x, this.y); },
        dist(o) { return Math.hypot(this.x - o.x, this.y - o.y); },
        heading() { return Math.atan2(this.y, this.x); },
        rotate(a) {
            const h = this.heading() + a, m = this.mag();
            this.x = Math.cos(h) * m; this.y = Math.sin(h) * m;
            return this;
        },
        setMag(m) { this.normalize().mult(m); return this; },
    };
    return v;
};

global.p5 = {
    Vector: {
        sub: (a, b) => global.createVector(a.x - b.x, a.y - b.y),
        add: (a, b) => global.createVector(a.x + b.x, a.y + b.y),
        dist: (a, b) => Math.hypot(a.x - b.x, a.y - b.y),
        mult: (v, n) => global.createVector(v.x * n, v.y * n),
        random2D: () => global.createVector(Math.random() - 0.5, Math.random() - 0.5).normalize(),
    },
};

global.dist = (x1, y1, x2, y2) => Math.hypot(x2 - x1, y2 - y1);
global.random = (a, b) => {
    if (Array.isArray(a)) return a[Math.floor(Math.random() * a.length)];
    if (b === undefined) return (a === undefined) ? Math.random() : Math.random() * a;
    return a + Math.random() * (b - a);
};

global.floor = Math.floor;
global.PI = Math.PI;
global.TWO_PI = Math.PI * 2;
global.HALF_PI = Math.PI / 2;
global.QUARTER_PI = Math.PI / 4;
global.cos = Math.cos;
global.sin = Math.sin;
global.atan2 = Math.atan2;
global.sqrt = Math.sqrt;
global.max = Math.max;
global.min = Math.min;
global.abs = Math.abs;
global.radians = (d) => d * (Math.PI / 180);
global.deltaTime = 16;
global.millis = () => Date.now();
global.FRAME_TIME_BASELINE_MS = 16.666;
global.PREDICTION_FPS_BASELINE = 60;
global.ROTATION_THRESHOLD_RAD = 0.02;
global.STRAFE_THRUST_MULTIPLIER = 0.5;
global.REVERSE_THRUST_MULTIPLIER = 0.3;
global.DESPAWN_DISTANCE_MULTIPLIER = 1.2;
global.JUMP_FADE_OUT_DURATION = 1.0;
global.JUMP_FADE_IN_DURATION = 1.0;
global.DRAG_EFFECT_DEFAULT_DURATION = 3.0;
global.DRAG_EFFECT_DEFAULT_MULTIPLIER = 2.0;
global.DRAG_CONSECUTIVE_HIT_MULT = 1.5;
global.DEFAULT_DELTA_SECONDS = 0.016;
global.OFF_SCREEN_PREDICTION_FACTOR = 0.5;
global.OFF_SCREEN_OPTIMAL_RANGE_FACTOR = 0.8;

global.color = () => ({});
global.uiManager = { addMessage: jest.fn() };
global.width = 2000;
global.height = 2000;

global.STARFIELD_CONFIG = { WORKER_ENABLED: false };
global.SPAWN_CONFIG = { SPAWN_INTERVAL_MS: 5000, FIXED_LARGE_DESPAWN_RADIUS: 5000 };
global.JUMP_ZONE_CONFIG = { DEFAULT_RADIUS: 1000 };
global.WEAPON_UPGRADES = [
    { name: 'Pulse Laser', type: 'laser', damage: 10 },
];

global.SHIP_DEFINITIONS = {
    Sidewinder: {
        baseHull: 100, baseShield: 100, size: 10,
        aiRoles: ['PIRATE'], baseMaxSpeed: 10, baseThrust: 10, baseTurnRate: 0.1,
    },
    Krait: {
        baseHull: 200, baseShield: 200, size: 20,
        aiRoles: ['PIRATE'], baseMaxSpeed: 10, baseThrust: 10, baseTurnRate: 0.1,
    },
};

global.AI_STATE = {
    IDLE: 'IDLE', ATTACKING: 'ATTACKING', TRADING: 'TRADING',
    DOCKING: 'DOCKING', DOCKING_APPROACH: 'DOCKING_APPROACH',
    PATROLLING: 'PATROLLING', APPROACHING: 'APPROACHING',
    ATTACK_PASS: 'ATTACK_PASS', REPOSITIONING: 'REPOSITIONING',
    SNIPING: 'SNIPING', COLLECTING_CARGO: 'COLLECTING_CARGO',
    TRANSPORTING: 'TRANSPORTING', GUARDING: 'GUARDING',
    LEAVING_SYSTEM: 'LEAVING_SYSTEM', FLEEING: 'FLEEING',
};

global.AI_ROLE = {
    PIRATE: 'PIRATE', POLICE: 'POLICE', HAULER: 'HAULER', TRANSPORT: 'TRANSPORT',
    MINER: 'MINER', MISSIONARY: 'MISSIONARY', GUARD: 'GUARD',
    BOUNTY_HUNTER: 'BOUNTY_HUNTER', ALIEN: 'ALIEN', COMBAT: 'COMBAT',
};

global.WEAPON_TYPE = {
    PROJECTILE: 'projectile', BEAM: 'beam', TURRET: 'turret', MISSILE: 'missile',
};

global.TARGET_SCORE_INVALID = -Infinity;
global.TARGET_SCORE_BASE_WANTED = 100;
global.TARGET_SCORE_WANTED_PIRATE_BONUS = 20;
global.TARGET_SCORE_PIRATE_CARGO_BASE = 30;
global.TARGET_SCORE_PIRATE_CARGO_MULT = 1.5;
global.TARGET_SCORE_PIRATE_PREY_HAULER = 40;
global.TARGET_SCORE_RETALIATION_PIRATE = 60;
global.TARGET_SCORE_RETALIATION_HAULER = 40;
global.TARGET_SCORE_DISTANCE_PENALTY_MULT = 0.15;
global.TARGET_SCORE_DISTANCE_PENALTY_CAP = 150;
global.TARGET_SCORE_ALLY_ENGAGED_PENALTY = 25;
global.TARGET_SCORE_ALLY_ENGAGED_CAP = 75;
global.TARGET_SCORE_PROXIMITY_BONUS_MAX = 30;
global.TARGET_SCORE_PROXIMITY_THRESHOLD = 300;
global.TARGET_SCORE_HULL_DAMAGE_MAX_BONUS = 20;
global.TARGET_SCORE_HULL_DAMAGE_MULT = 20;
global.TARGET_SCORE_COMBAT_VS_ALIEN_BONUS = 500;
global.TARGET_SCORE_COMBAT_RIVALRY_BONUS = 500;
global.TARGET_SCORE_COMBAT_STANDARD_ENGAGE = 100;
global.TARGET_SCORE_COMBAT_LOW_PRIORITY = 0;
global.TARGET_SCORE_SAME_FACTION_PENALTY = 200;
global.TARGET_SCORE_BOUNTY_CONTRACT = 1000;
global.TARGET_SCORE_CURRENT_TARGET_BONUS = 200;
global.MAX_TARGETING_RADIUS = 3000;
global.DEFAULT_SCAN_INTERVAL = 2;
global.GUARD_ENGAGEMENT_LOCK_DURATION = 5;
global.SHIELD_RECHARGE_RATE_MULTIPLIER = 1;

global.Planet = class Planet { };
global.Station = class Station { };
global.SpaceObject = class SpaceObject {
    distanceTo(o) {
        if (!o || !o.pos) return Infinity;
        return global.dist(this.pos.x, this.pos.y, o.pos.x, o.pos.y);
    }
};
global.Asteroid = class Asteroid { };
global.Explosion = class Explosion { };
global.Harpoon = class Harpoon { };
global.Cargo = class Cargo { };
global.Mine = class Mine { };
global.Projectile = class Projectile { };
global.Beam = class Beam { };
global.ForceWave = class ForceWave { };

global.SpatialHash = class SpatialHash {
    constructor(cs) { this.items = []; }
    insert(e) { this.items.push(e); }
    insertAll(es) { if (es) es.forEach(e => this.insert(e)); }
    remove(e) { const i = this.items.indexOf(e); if (i > -1) this.items.splice(i, 1); }
    removeAll(es) { if (es) es.forEach(e => this.remove(e)); }
    update() { }
    query() { return this.items || []; }
    getNearby() { return this.items || []; }
    clear() { this.items = []; }
};

// Load game modules
const { Nebula } = require('../nebula');
const { CosmicStorm } = require('../cosmicStorm');
const { StarSystem } = require('../starSystem');
const Player = require('../player');

require('../enemyUtils');
require('../enemyTargeting');
require('../enemyMovement');
require('../enemyCombat');
require('../enemyAIBehaviors');
require('../enemyCargo');
require('../enemyDamageSystem');
require('../enemyRendering');
require('../enemyStateMachine');

const { Enemy } = require('../enemy');
const { PILOT_RANK, getPilotRankModifiers } = require('../pilotRanks');

global.Player = Player;
global.Enemy = Enemy;
global.PILOT_RANK = PILOT_RANK;
global.getPilotRankModifiers = getPilotRankModifiers;

// ─────────────────────────────────────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────────────────────────────────────

/** Force a specific pilot rank onto an enemy and clear rank-modifier cache. */
function setRank(enemy, rank) {
    enemy.pilotRank = rank;
    enemy._cachedRankMods = undefined; // invalidate cache
}

/** Create a minimal mock system with empty arrays. */
function makeSystem(overrides = {}) {
    return {
        nebulae: [],
        cosmicStorms: [],
        enemies: [],
        asteroids: [],
        player: null,
        spaceObjects: [],
        spatialHash: null,
        ...overrides,
    };
}

/** Create a mock target at position (px, py). */
function makeTarget(px, py) {
    return {
        pos: createVector(px, py),
        vel: createVector(0, 0),
        hull: 100, maxHull: 100,
        shield: 100, maxShield: 100,
        destroyed: false,
        id: 'mock-target',
    };
}

// ─────────────────────────────────────────────────────────────────────────────
// Pilot rank environmentAwareness modifier tests
// ─────────────────────────────────────────────────────────────────────────────

describe('environmentAwareness modifier values', () => {
    test('INCOMPETENT has environmentAwareness 0.1', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.INCOMPETENT);
        expect(mods.environmentAwareness).toBe(0.1);
    });

    test('GREEN has environmentAwareness 0.3', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.GREEN);
        expect(mods.environmentAwareness).toBe(0.3);
    });

    test('ROOKIE has environmentAwareness 0.6', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.ROOKIE);
        expect(mods.environmentAwareness).toBe(0.6);
    });

    test('VETERAN has environmentAwareness 1.0', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.VETERAN);
        expect(mods.environmentAwareness).toBe(1.0);
    });

    test('ELITE has environmentAwareness 1.5', () => {
        const mods = getPilotRankModifiers(PILOT_RANK.ELITE);
        expect(mods.environmentAwareness).toBe(1.5);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// _getEnvHazardInfo
// ─────────────────────────────────────────────────────────────────────────────

describe('_getEnvHazardInfo', () => {
    let player, enemy;

    beforeEach(() => {
        player = new Player('Sidewinder');
        player.pos = createVector(0, 0);
        enemy = new Enemy(0, 0, player, 'Krait', 'PIRATE');
        enemy._envHazardCache = null;
        enemy._envHazardCacheTime = 0;
    });

    test('returns inDangerousZone=false when no hazards are present', () => {
        const system = makeSystem();
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inDangerousZone).toBe(false);
        expect(info.dangerZonePos).toBeNull();
    });

    test('detects radiation nebula at current position', () => {
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inDangerousZone).toBe(true);
        expect(info.dangerZonePos).not.toBeNull();
        expect(info.dangerZoneType).toBe('radiation');
    });

    test('detects ion nebula at current position', () => {
        const neb = new Nebula(0, 0, 300, 'ion');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inDangerousZone).toBe(true);
        expect(info.dangerZoneType).toBe('ion');
    });

    test('EMP nebula does NOT mark inDangerousZone (it is a retreat option)', () => {
        const neb = new Nebula(0, 0, 300, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inDangerousZone).toBe(false);
    });

    test('tracks when ship is inside an EMP nebula', () => {
        const neb = new Nebula(0, 0, 300, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inEmpZone).toBe(true);
    });

    test('locates a nearby EMP nebula for defensive retreat', () => {
        const neb = new Nebula(500, 0, 200, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.nearbyRetreatNebula).toBe(neb);
        expect(info.nearbyRetreatDist).toBeLessThan(1000);
    });

    test('does NOT locate EMP nebula farther than 1200 units away', () => {
        const neb = new Nebula(2500, 0, 200, 'emp'); // edge is at 2500-200=2300 > ENV_MAX_RETREAT_DIST (1200)
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.nearbyRetreatNebula).toBeNull();
    });

    test('detects cosmic storm at current position', () => {
        const storm = new CosmicStorm(0, 0, 400, 'radiation');
        const system = makeSystem({ cosmicStorms: [storm] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inDangerousZone).toBe(true);
        expect(info.dangerZoneType).toBe('storm');
    });

    test('overlapping radiation+ion picks ion as the active danger zone', () => {
        const radiationNeb = new Nebula(0, 0, 300, 'radiation');
        const ionNeb = new Nebula(0, 0, 300, 'ion');
        const system = makeSystem({ nebulae: [radiationNeb, ionNeb] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inDangerousZone).toBe(true);
        expect(info.dangerZoneType).toBe('ion');
    });

    test('overlapping radiation+storm picks storm as the active danger zone', () => {
        const radiationNeb = new Nebula(0, 0, 300, 'radiation');
        const storm = new CosmicStorm(0, 0, 300, 'electromagnetic');
        const system = makeSystem({ nebulae: [radiationNeb], cosmicStorms: [storm] });
        enemy.pos = createVector(0, 0);
        const info = enemy._getEnvHazardInfo(system);
        expect(info.inDangerousZone).toBe(true);
        expect(info.dangerZoneType).toBe('storm');
    });

    test('detects that target is inside a dangerous zone', () => {
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        // Enemy is outside
        enemy.pos = createVector(600, 0);
        // Target is inside the nebula
        const target = makeTarget(0, 0);
        enemy.target = target;
        enemy._envHazardCache = null;
        const info = enemy._getEnvHazardInfo(system);
        expect(info.targetInDangerZone).toBe(true);
    });

    test('tracks EMP zone occupancy for the current target', () => {
        const emp = new Nebula(0, 0, 300, 'emp');
        const system = makeSystem({ nebulae: [emp] });
        enemy.pos = createVector(800, 0);
        enemy.target = makeTarget(0, 0);
        enemy._envHazardCache = null;
        const info = enemy._getEnvHazardInfo(system);
        expect(info.targetInEmpZone).toBe(true);
        expect(info.targetEmpZonePos).toBe(emp.pos);
        expect(info.targetEmpZoneRadius).toBe(300);
    });

    test('caches the result so second call within 1 s returns same object', () => {
        const system = makeSystem();
        const info1 = enemy._getEnvHazardInfo(system);
        // Slightly change environment, but cache should still return the old object
        system.nebulae = [new Nebula(0, 0, 300, 'radiation')];
        const info2 = enemy._getEnvHazardInfo(system);
        expect(info1).toBe(info2); // same object reference = cache hit
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// _updateEnvironmentalBehavior – state-change logic
// ─────────────────────────────────────────────────────────────────────────────

describe('_updateEnvironmentalBehavior state transitions', () => {
    let player, enemy;

    beforeEach(() => {
        player = new Player('Sidewinder');
        player.pos = createVector(0, 0);
        enemy = new Enemy(0, 0, player, 'Krait', 'PIRATE');
        enemy.pos = createVector(0, 0);
        enemy._envHazardCache = null;
        enemy._envHazardCacheTime = 0;
        enemy.currentState = AI_STATE.IDLE;
        enemy.vel = createVector(0, 0);
        enemy.thrustVector = createVector(0, 0);
        // Give the enemy a weapon so changeState(REPOSITIONING/APPROACHING) is not blocked
        enemy.weapons = [{ type: WEAPON_TYPE.PROJECTILE, name: 'Test Weapon', fireRate: 1 }];
        enemy.currentWeapon = enemy.weapons[0];
    });

    // --- Lower ranks: awareness exists but is probabilistic ---

    test('INCOMPETENT can react to ion hazard when roll is favorable', () => {
        setRank(enemy, PILOT_RANK.INCOMPETENT);
        const neb = new Nebula(0, 0, 300, 'ion');
        const system = makeSystem({ nebulae: [neb] });
        enemy.currentState = AI_STATE.IDLE;
        const randomSpy = jest.spyOn(global, 'random').mockReturnValue(0);
        enemy._updateEnvironmentalBehavior(system, true);
        randomSpy.mockRestore();
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
    });

    test('GREEN does NOT use tactical EMP retreat behavior', () => {
        setRank(enemy, PILOT_RANK.GREEN);
        const neb = new Nebula(400, 0, 200, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.05;
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    // --- No target: idle loitering exits hazards, active navigation is not interrupted ---

    test('VETERAN idle in radiation nebula WITHOUT a target repositions out of hazard', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        enemy.currentState = AI_STATE.IDLE;
        // targetExists = false + IDLE state: should not loiter in hazard
        enemy._updateEnvironmentalBehavior(system, false);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
    });

    test('VETERAN navigating in ion nebula WITHOUT a target does NOT get interrupted', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'ion');
        const system = makeSystem({ nebulae: [neb] });
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._updateEnvironmentalBehavior(system, false);
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    test('VETERAN patrolling inside a cosmic storm redirects out of the storm', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const storm = new CosmicStorm(0, 0, 300, 'electromagnetic');
        const system = makeSystem({ cosmicStorms: [storm] });
        enemy.pos = createVector(0, 0); // ship starts inside the storm radius
        enemy.currentState = AI_STATE.PATROLLING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, false);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
        expect(enemy.repositionTarget).not.toBeNull();
    });

    test('VETERAN patrolling inside a radiation nebula is NOT interrupted (may contain stations)', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0); // ship starts inside the nebula radius
        enemy.currentState = AI_STATE.PATROLLING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, false);
        // Stations/jump zones may be inside nebulae; patrol routes legitimately cross them
        expect(enemy.currentState).toBe(AI_STATE.PATROLLING);
    });

    // --- Radiation nebula: slow damage, only escape in combat at hull ≤ 60 % ---

    test('VETERAN in radiation nebula in combat with hull above 60% does NOT escape', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.80; // 80% — above threshold
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    test('VETERAN in radiation nebula in combat with hull at or below 60% escapes', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.55; // 55% — below threshold
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
        expect(enemy.repositionTarget).not.toBeNull();
    });

    test('VETERAN in radiation nebula in combat with hull exactly at 60% boundary escapes', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.60; // exactly at the threshold — should escape (<=)
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
    });

    // --- Ion nebula: disables shields, always escape in combat ---

    test('VETERAN in ion nebula in combat escapes regardless of hull percentage', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'ion');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.90; // 90% — well above radiation threshold
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        // Ion disables shields — escape regardless of hull health
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
    });

    // --- Cosmic storm: always escape in combat ---

    test('VETERAN inside cosmic storm in combat transitions to REPOSITIONING', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const storm = new CosmicStorm(0, 0, 300, 'ion');
        const system = makeSystem({ cosmicStorms: [storm] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.currentState = AI_STATE.IDLE;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
    });

    test('VETERAN does NOT escape if already FLEEING', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'ion');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.currentState = AI_STATE.FLEEING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.FLEEING);
    });

    // --- Veteran: EMP nebula defensive retreat ---

    test('VETERAN with critically low hull retreats to nearby EMP nebula', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(400, 0, 200, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.10; // 10% hull – below 15% threshold
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
        expect(enemy.repositionTarget).not.toBeNull();
    });

    test('VETERAN with hull above threshold does NOT retreat to EMP nebula', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(400, 0, 200, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.50; // 50% hull – above 15% threshold
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        // State should remain APPROACHING (no retreat triggered)
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    // --- Elite: higher retreat threshold ---

    test('ELITE retreats to EMP nebula at 25% hull (higher threshold than Veteran)', () => {
        setRank(enemy, PILOT_RANK.ELITE);
        const neb = new Nebula(400, 0, 200, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.20; // 20% hull – between 15% and 25%
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        // Elite threshold is 25% so 20% should trigger retreat
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
    });

    test('VETERAN does NOT retreat at 20% hull (threshold is 15%)', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(400, 0, 200, 'emp');
        const system = makeSystem({ nebulae: [neb] });
        const target = makeTarget(800, 0);
        enemy.target = target;
        enemy.hull = enemy.maxHull * 0.20; // 20% hull – above Veteran 15% threshold
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        // Veteran threshold is 15%, so 20% should NOT trigger retreat
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    // --- Elite: approach target in dangerous zone ---

    test('ELITE in IDLE approaches a target that is inside a dangerous zone', () => {
        setRank(enemy, PILOT_RANK.ELITE);
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        // Enemy is well outside the nebula
        enemy.pos = createVector(600, 0);
        // Target is inside the radiation nebula
        const target = makeTarget(0, 0);
        enemy.target = target;
        enemy.currentState = AI_STATE.IDLE;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.APPROACHING);
    });

    test('NON-ELITE in IDLE does NOT opportunistically approach target in dangerous zone', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const neb = new Nebula(0, 0, 300, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(600, 0);
        const target = makeTarget(0, 0);
        enemy.target = target;
        enemy.currentState = AI_STATE.IDLE;
        enemy._envHazardCache = null;
        enemy._updateEnvironmentalBehavior(system, true);
        // Veterans do not have the Rule-3 elite tactic
        expect(enemy.currentState).toBe(AI_STATE.IDLE);
    });

    test('VETERAN repositions to hold just outside EMP edge when target is inside EMP', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const emp = new Nebula(0, 0, 300, 'emp');
        const system = makeSystem({ nebulae: [emp] });
        enemy.pos = createVector(700, 0); // outside EMP
        enemy.target = makeTarget(0, 0);  // inside EMP
        enemy.currentState = AI_STATE.APPROACHING;
        enemy._envHazardCache = null;
        const infoBefore = enemy._getEnvHazardInfo(system);
        const expectedHoldDistance = infoBefore.targetEmpZoneRadius + 120;
        enemy._updateEnvironmentalBehavior(system, true);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
        expect(enemy.repositionTarget).not.toBeNull();
        const holdDistance = dist(enemy.repositionTarget.x, enemy.repositionTarget.y, emp.pos.x, emp.pos.y);
        expect(holdDistance).toBeCloseTo(expectedHoldDistance, 3);
    });
});

describe('off-screen environmental behavior path', () => {
    let player, enemy;

    beforeEach(() => {
        player = new Player('Sidewinder');
        player.pos = createVector(0, 0);
        enemy = new Enemy(0, 0, player, 'Krait', 'PIRATE');
        enemy.pos = createVector(700, 0);
        enemy._isOnScreen = false;
        enemy._envHazardCache = null;
        enemy._envHazardCacheTime = 0;
        enemy.currentState = AI_STATE.APPROACHING;
        enemy.target = makeTarget(0, 0);
        enemy.weapons = [{ type: WEAPON_TYPE.PROJECTILE, name: 'Test Weapon', fireRate: 1 }];
        enemy.currentWeapon = enemy.weapons[0];
    });

    test('off-screen updateCombatAI still applies EMP edge tactic', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const system = makeSystem({ nebulae: [new Nebula(0, 0, 300, 'emp')] });
        enemy.updateCombatAI(system);
        expect(enemy.currentState).toBe(AI_STATE.REPOSITIONING);
    });
});

// ─────────────────────────────────────────────────────────────────────────────
// Movement avoidance: nebulae passable, cosmic storms steered around by Rookie+
// (Stations and jump zones often sit inside nebulae; patrol routes cross them.
//  Storms are free-floating severe hazards with no essential structures inside.)
// ─────────────────────────────────────────────────────────────────────────────

describe('movement obstacle avoidance: nebulae passable, storms steered around by Rookie+', () => {
    let player, enemy;

    beforeEach(() => {
        player = new Player('Sidewinder');
        player.pos = createVector(0, 0);
        enemy = new Enemy(0, 0, player, 'Krait', 'PIRATE');
        enemy.vel = createVector(0, 0);
        enemy.thrustVector = createVector(0, 0);
    });

    test('ROOKIE does NOT steer around a radiation nebula in movement path', () => {
        setRank(enemy, PILOT_RANK.ROOKIE);
        // Nebula sits directly between ship and its target
        const neb = new Nebula(300, 0, 200, 'radiation');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const desiredTarget = createVector(600, 0);
        const adjusted = enemy._avoidObstaclesAndAdjustTarget(system, desiredTarget);
        // Target should be unchanged — nebulae are not physical obstacles
        expect(adjusted.x).toBe(desiredTarget.x);
        expect(adjusted.y).toBe(desiredTarget.y);
    });

    test('ELITE does NOT steer around an ion nebula in movement path', () => {
        setRank(enemy, PILOT_RANK.ELITE);
        const neb = new Nebula(300, 0, 200, 'ion');
        const system = makeSystem({ nebulae: [neb] });
        enemy.pos = createVector(0, 0);
        const desiredTarget = createVector(600, 0);
        const adjusted = enemy._avoidObstaclesAndAdjustTarget(system, desiredTarget);
        expect(adjusted.x).toBe(desiredTarget.x);
        expect(adjusted.y).toBe(desiredTarget.y);
    });

    test('VETERAN steers around a cosmic storm directly in movement path', () => {
        setRank(enemy, PILOT_RANK.VETERAN);
        const storm = new CosmicStorm(300, 0, 200, 'radiation');
        const system = makeSystem({ cosmicStorms: [storm] });
        enemy.pos = createVector(0, 0);
        const desiredTarget = createVector(700, 0);
        const adjusted = enemy._avoidObstaclesAndAdjustTarget(system, desiredTarget);
        // Storm is directly in path; movement target should be nudged laterally
        expect(adjusted.y).not.toBe(0);
    });

    test('INCOMPETENT does NOT steer around a cosmic storm (no obstacle avoidance)', () => {
        setRank(enemy, PILOT_RANK.INCOMPETENT);
        const storm = new CosmicStorm(300, 0, 200, 'radiation');
        const system = makeSystem({ cosmicStorms: [storm] });
        enemy.pos = createVector(0, 0);
        const desiredTarget = createVector(700, 0);
        const adjusted = enemy._avoidObstaclesAndAdjustTarget(system, desiredTarget);
        // INCOMPETENT has obstacleAvoidanceStrength = 0, ignores all obstacles including storms
        expect(adjusted.x).toBe(desiredTarget.x);
        expect(adjusted.y).toBe(desiredTarget.y);
    });
});
