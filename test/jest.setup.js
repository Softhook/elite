/**
 * Jest Setup File
 * Provides mocks for p5.js functions and browser globals needed by the game code
 */

// ============================================
// p5.js Mock Functions
// ============================================

global.p5 = {
    Vector: {
        random2D: () => {
            const angle = Math.random() * Math.PI * 2;
            return global.createVector(Math.cos(angle), Math.sin(angle));
        },
        mult: (v, n) => {
            // Static mult: returns new vector v * n
            return global.createVector(v.x * n, v.y * n);
        },
        sub: (v1, v2) => {
            return global.createVector(v1.x - v2.x, v1.y - v2.y);
        },
        add: (v1, v2) => {
            return global.createVector(v1.x + v2.x, v1.y + v2.y);
        },
        fromAngle: (angle, length = 1) => {
            return global.createVector(Math.cos(angle) * length, Math.sin(angle) * length);
        }
    }
};

global.createVector = (x = 0, y = 0) => ({
    x,
    y,
    copy: function () { return createVector(this.x, this.y); },
    add: function (v, y2) {
        // Handle both add(vector) and add(x, y) forms (SharedPhysics uses the latter)
        if (typeof v === 'number') {
            this.x += v;
            this.y += (y2 !== undefined ? y2 : 0);
        } else {
            this.x += v.x;
            this.y += v.y;
        }
        return this;
    },
    sub: function (v) { this.x -= v.x; this.y -= v.y; return this; },
    mult: function (n) { this.x *= n; this.y *= n; return this; },
    div: function (n) { this.x /= n; this.y /= n; return this; },
    mag: function () { return Math.sqrt(this.x * this.x + this.y * this.y); },
    magSq: function () { return this.x * this.x + this.y * this.y; },
    normalize: function () {
        const m = this.mag();
        if (m > 0) { this.x /= m; this.y /= m; }
        return this;
    },
    setMag: function (len) { this.normalize(); this.mult(len); return this; },
    limit: function (max) {
        const m = this.mag();
        if (m > max) { this.setMag(max); }
        return this;
    },
    heading: function () { return Math.atan2(this.y, this.x); },
    rotate: function (angle) {
        const cos = Math.cos(angle);
        const sin = Math.sin(angle);
        const nx = this.x * cos - this.y * sin;
        const ny = this.x * sin + this.y * cos;
        this.x = nx;
        this.y = ny;
        return this;
    },
    dist: function (v) {
        const dx = this.x - v.x;
        const dy = this.y - v.y;
        return Math.sqrt(dx * dx + dy * dy);
    },
    dot: function (v) {
        return this.x * v.x + this.y * v.y;
    },
    set: function (x, y) { this.x = x; this.y = y; return this; }
});

// Random function (p5.js style)
global.random = (a, b) => {
    if (Array.isArray(a)) {
        return a[Math.floor(Math.random() * a.length)];
    }
    if (b === undefined) {
        if (a === undefined) return Math.random();
        return Math.random() * a;
    }
    return a + Math.random() * (b - a);
};

// Math constants
global.PI = Math.PI;
global.TWO_PI = Math.PI * 2;
global.HALF_PI = Math.PI / 2;

// Trig functions
global.sin = Math.sin;
global.cos = Math.cos;
global.tan = Math.tan;
global.atan2 = Math.atan2;
global.radians = (deg) => deg * Math.PI / 180;
global.degrees = (rad) => rad * 180 / Math.PI;

// Math utilities
global.floor = Math.floor;
global.ceil = Math.ceil;
global.round = Math.round;
global.abs = Math.abs;
global.min = Math.min;
global.max = Math.max;
global.sqrt = Math.sqrt;
global.pow = Math.pow;
global.sq = (x) => x * x;
global.square = (x) => x * x;
global.constrain = (val, low, high) => Math.max(low, Math.min(high, val));
global.map = (value, start1, stop1, start2, stop2) => {
    return start2 + (stop2 - start2) * ((value - start1) / (stop1 - start1));
};
global.dist = (x1, y1, x2, y2) => {
    const dx = x2 - x1;
    const dy = y2 - y1;
    return Math.sqrt(dx * dx + dy * dy);
};
global.lerp = (start, stop, amt) => start + (stop - start) * amt;

// Canvas dimensions (defaults)
global.width = 1920;
global.height = 1080;

// Global player mock
global.player = null;

// Frame timing
global.deltaTime = 16.67; // ~60fps
global.millis = () => Date.now();
global.frameCount = 0;

// Color function mock
global.color = (r, g, b, a = 255) => {
    // Handle array input (e.g. color([255, 0, 0]))
    if (Array.isArray(r)) {
        a = r[3] !== undefined ? r[3] : 255;
        b = r[2];
        g = r[1];
        r = r[0];
    }
    // Handle single grayscale (e.g. color(100))
    if (g === undefined && b === undefined) {
        g = r;
        b = r;
    }

    return {
        levels: [r, g, b, a],
        setRed: function (v) { this.levels[0] = v; },
        setGreen: function (v) { this.levels[1] = v; },
        setBlue: function (v) { this.levels[2] = v; },
        setAlpha: function (v) { this.levels[3] = v; },
        toString: function () { return `rgba(${this.levels[0]},${this.levels[1]},${this.levels[2]},${this.levels[3] / 255})`; }
    };
};

// p5.js Drawing functions (empty mocks)
global.fill = jest.fn();
global.noFill = jest.fn();
global.stroke = jest.fn();
global.noStroke = jest.fn();
global.strokeWeight = jest.fn();
global.ellipse = jest.fn();
global.circle = jest.fn();
global.line = jest.fn();
global.rect = jest.fn();
global.triangle = jest.fn();
global.arc = jest.fn();
global.point = jest.fn();
global.quad = jest.fn();
global.beginShape = jest.fn();
global.endShape = jest.fn();
global.vertex = jest.fn();
global.push = jest.fn();
global.pop = jest.fn();
global.translate = jest.fn();
global.rotate = jest.fn();
global.scale = jest.fn();
global.textAlign = jest.fn();
global.textSize = jest.fn();
global.text = jest.fn();
global.image = jest.fn();
global.background = jest.fn();
global.clear = jest.fn();

// Noise function mock
global.noise = (x, y = 0, z = 0) => {
    // Simple deterministic pseudo-noise for testing
    const n = Math.sin(x * 12.9898 + y * 78.233 + z * 37.719) * 43758.5453;
    return n - Math.floor(n);
};

// ============================================
// Browser Globals
// ============================================

// Console is already available in Node.js, but ensure it has expected methods
if (!global.console) {
    global.console = {
        log: jest.fn(),
        warn: jest.fn(),
        error: jest.fn(),
        debug: jest.fn()
    };
}

// ============================================
// Game Constants - Load from source files
// ============================================

// Mission types enum
global.MISSION_TYPE = {
    DELIVERY_LEGAL: 'DELIVERY_LEGAL',
    DELIVERY_ILLEGAL: 'DELIVERY_ILLEGAL',
    BOUNTY_PIRATE: 'BOUNTY_PIRATE',
    BOUNTY_POLICE: 'BOUNTY_POLICE',
    BOUNTY_ALIEN: 'BOUNTY_ALIEN',
    ASSASSINATION: 'ASSASSINATION',
    SABOTAGE: 'SABOTAGE',
    IMPERIAL_ELIMINATION: 'IMPERIAL_ELIMINATION',
    IMPERIAL_SUPPLY: 'IMPERIAL_SUPPLY',
    IMPERIAL_STRIKE: 'IMPERIAL_STRIKE',
    SEPARATIST_RAID: 'SEPARATIST_RAID',
    SEPARATIST_SABOTAGE: 'SEPARATIST_SABOTAGE',
    SEPARATIST_STRIKE: 'SEPARATIST_STRIKE',
    MILITARY_PATROL: 'MILITARY_PATROL',
    MILITARY_DEFENSE: 'MILITARY_DEFENSE',
    MILITARY_STRIKE: 'MILITARY_STRIKE'
};

// Mission type sets
global.BOUNTY_TYPES = new Set([
    MISSION_TYPE.BOUNTY_PIRATE,
    MISSION_TYPE.BOUNTY_POLICE,
    MISSION_TYPE.BOUNTY_ALIEN
]);

global.DELIVERY_TYPES = new Set([
    MISSION_TYPE.DELIVERY_LEGAL,
    MISSION_TYPE.DELIVERY_ILLEGAL
]);

global.FACTION_KILL_TYPES = new Set([
    MISSION_TYPE.IMPERIAL_ELIMINATION,
    MISSION_TYPE.SEPARATIST_RAID
]);

global.FACTION_DELIVERY_TYPES = new Set([
    MISSION_TYPE.IMPERIAL_SUPPLY
]);

global.FACTION_SABOTAGE_TYPES = new Set([
    MISSION_TYPE.SEPARATIST_SABOTAGE
]);

global.FACTION_PATROL_TYPES = new Set([
    MISSION_TYPE.MILITARY_PATROL,
    MISSION_TYPE.MILITARY_DEFENSE
]);

// AI Roles
global.AI_ROLE = {
    PIRATE: 'PIRATE',
    POLICE: 'POLICE',
    HAULER: 'HAULER',
    COMBAT: 'COMBAT',
    GUARD: 'GUARD',
    TRANSPORT: 'TRANSPORT',
    MINER: 'MINER',
    ALIEN: 'ALIEN',
    BOUNTY_HUNTER: 'BOUNTY_HUNTER'
};

// Mock Player and Enemy classes for instanceof checks
global.Player = class Player {
    constructor(x = 0, y = 0) {
        this.pos = global.createVector(x, y);
        this.vel = global.createVector(0, 0);
        this.isPlayer = true;
    }
};

global.Enemy = class Enemy {
    constructor(x = 0, y = 0) {
        this.pos = global.createVector(x, y);
        this.vel = global.createVector(0, 0);
        this.isEnemy = true;
    }
};

// AI States
global.AI_STATE = {
    IDLE: 'IDLE',
    PATROLLING: 'PATROLLING',
    APPROACHING: 'APPROACHING',
    ATTACK_PASS: 'ATTACK_PASS',
    REPOSITIONING: 'REPOSITIONING',
    FLEEING: 'FLEEING',
    GUARDING: 'GUARDING',
    TRANSPORTING: 'TRANSPORTING',
    COLLECTING_CARGO: 'COLLECTING_CARGO',
    LEAVING_SYSTEM: 'LEAVING_SYSTEM',
    SNIPING: 'SNIPING'
};

// Pirate Repositioning Constants
global.PIRATE_REPOSITION_ARRIVAL_THRESHOLD = 200;
global.PIRATE_REPOSITION_DIST_MIN = 1000;
global.PIRATE_REPOSITION_DIST_MAX = 2000;
global.PIRATE_REPOSITION_INITIAL_TIMER_MIN = 5;
global.PIRATE_REPOSITION_INITIAL_TIMER_MAX = 10;
global.PIRATE_REPOSITION_TIMER_MIN = 10;
global.PIRATE_REPOSITION_TIMER_MAX = 30;
global.PIRATE_IDLE_DRIFT_DAMPING = 0.98;
global.PIRATE_REPOSITION_OBSTACLE_CHECK_RADIUS = 300;

// Ship types for testing
global.COMBAT_SHIPS = ['Krait', 'Python', 'Anaconda', 'Viper', 'Cobra', 'Asp'];
global.PIRATE_SHIP_TYPES = ['Krait', 'Asp', 'Cobra', 'Python'];
global.POLICE_SHIPS = ['Viper', 'Eagle', 'CobraMK3'];
global.HEAVY_SHIPS = ['Anaconda', 'Python', 'TypeNine'];
global.TRADER_SHIPS = ['TypeSix', 'TypeNine', 'Hauler'];

// Ship upgrades
global.SHIP_UPGRADES = [
    { type: 'armor', level: 1, name: 'Faulcon DeLacy Composite', price: 2500, hullBonus: 40 },
    { type: 'armor', level: 2, name: 'Core Dynamics Reactive Plates', price: 8500, hullBonus: 100 },
    { type: 'armor', level: 3, name: 'Vodel Military Grade', price: 22000, hullBonus: 200 },
    { type: 'engine', level: 1, name: 'Sirius Efficiency Drive', price: 3200, speedMultiplier: 1.15, thrustMultiplier: 1.10 },
    { type: 'engine', level: 2, name: 'Gutamaya Performance Thrusters', price: 12000, speedMultiplier: 1.30, thrustMultiplier: 1.25 },
    { type: 'engine', level: 3, name: 'Achilles Overdrive Injectors', price: 35000, speedMultiplier: 1.50, thrustMultiplier: 1.40 },
    { type: 'shield', level: 1, name: 'Supratech Shield Booster', price: 5000, shieldBonus: 50 },
    { type: 'shield', level: 2, name: 'Aegis Systems Deflector', price: 15000, shieldBonus: 100 },
    { type: 'shield', level: 3, name: 'Prismatic Shield Generator', price: 40000, shieldBonus: 200 },
    { type: 'cloak', level: 1, name: 'Stealth Field Mark I', price: 8000, cloakDuration: 8, cloakCooldown: 45 },
    { type: 'cloak', level: 2, name: 'Shadow Matrix', price: 22000, cloakDuration: 15, cloakCooldown: 35 },
    { type: 'cloak', level: 3, name: 'Phantom Drive', price: 55000, cloakDuration: 25, cloakCooldown: 25 },
    { type: 'booster', level: 1, name: 'Pulse Drive Igniter', price: 4000, boostMultiplier: 2.0, boostDuration: 1.0, boostCooldown: 10.0 },
    { type: 'booster', level: 2, name: 'Turbocharged Injector', price: 12000, boostMultiplier: 2.5, boostDuration: 1.5, boostCooldown: 8.0 },
    { type: 'booster', level: 3, name: 'Nova Drive System', price: 30000, boostMultiplier: 3.0, boostDuration: 2.0, boostCooldown: 6.0 }
];

// Cargo types
global.LEGAL_CARGO = ['Food', 'Textiles', 'Machinery', 'Alloys', 'Minerals', 'Computers', 'Medicine'];
global.ILLEGAL_CARGO = ['Narcotics', 'Firearms', 'Slaves'];

// Commodity functions (needed by missionGenerator)
global.getLegalCommodities = () => global.LEGAL_CARGO;
global.getIllegalCommodities = () => global.ILLEGAL_CARGO;

// ============================================
// Debug/Logging Functions
// ============================================

global.MISSION_LOG = jest.fn();
global.CARGO_LOG = jest.fn();
global.MISSION_LOG = jest.fn();
global.CARGO_LOG = jest.fn();
global.AI_LOG = jest.fn();
global.PLAYER_LOG = jest.fn();
global.SAVE_LOG = jest.fn();

// ============================================
// Mock UI Manager
// ============================================

global.uiManager = {
    addMessage: jest.fn(),
    inactiveMissionIds: new Set()
};

global.soundManager = {
    playSound: jest.fn(),
    playWorldSound: jest.fn(),
    playMusic: jest.fn(),
    stopMusic: jest.fn()
};

// ============================================
// Mock GameGlobals
// ============================================

global.GameGlobals = {
    newsManager: {
        addAssassinationNews: jest.fn(),
        addSabotageNews: jest.fn(),
        addBountyNews: jest.fn()
    }
};

// ============================================
// Name Generation Functions
// ============================================

global.NPC_FIRST_NAMES = ['John', 'Jane', 'Marcus', 'Elena', 'Viktor', 'Sarah'];
global.NPC_LAST_NAMES = ['Smith', 'Chen', 'Rodriguez', 'Kowalski', 'Yamamoto'];

global.generateNPCName = () => {
    const first = NPC_FIRST_NAMES[Math.floor(Math.random() * NPC_FIRST_NAMES.length)];
    const last = NPC_LAST_NAMES[Math.floor(Math.random() * NPC_LAST_NAMES.length)];
    return `${first} ${last}`;
};

global.generateHumanEnemyName = generateNPCName;

global.generateGenderedNPCName = () => ({
    name: global.generateNPCName(),
    gender: Math.random() > 0.5 ? 'male' : 'female'
});


// ============================================
// Other Global Mocks
// ============================================

global.surfaceMode = false;
global.EVENT_LOG = jest.fn();
global.gameStateManager = {
    currentState: 'IN_FLIGHT'
};
global.ThrustManager = class ThrustManager {
    constructor() {
        this.particles = new Set();
    }
    createThrust() { }
    update() { }
    draw() { }
};
global.EventManager = class EventManager {
    constructor() { }
    update() { }
};

// ============================================
// Weapon Constants (needed by projectile.js)
// ============================================

global.DEFAULT_WEAPON_CONFIG = {
    PROJECTILE_SPEED: 8,
    PROJECTILE_DAMAGE: 10,
    PROJECTILE_LIFESPAN: 120,
    MISSILE_SPEED: 6,
    MISSILE_LIFESPAN: 180,
    MISSILE_TURN_RATE: 0.08
};

global.DRAG_EFFECT_DEFAULT_DURATION = 5.0;
global.DRAG_EFFECT_DEFAULT_MULTIPLIER = 10.0;
global.WEAPON_LOG = jest.fn();
global.ENV_LOG = jest.fn();


// ============================================
// Helper: Clear all mocks between tests
// ============================================

beforeEach(() => {
    jest.clearAllMocks();
});
// ============================================
// Test Helper Functions
// ============================================

global.createMockPlayer = (options = {}) => {
    return {
        pos: global.createVector(options.x || 0, options.y || 0),
        vel: global.createVector(0, 0),
        size: options.size || 30,
        hull: options.hull || 100,
        maxHull: 100,
        shield: options.shield || 50,
        maxShield: 50,
        wantedLevel: options.wantedLevel || 0,
        cargo: options.cargo || [],
        isPlayer: true,
        faction: options.faction || null,
        constructor: { name: 'Player' },
        getCargoAmount: () => (options.cargo ? options.cargo.length : 0),
        // Mock common methods
        hasUpgrade: () => false,
        getUpgradeLevel: () => 0
    };
};

global.createMockSystem = (options = {}) => {
    return {
        asteroids: options.asteroids || [],
        enemies: options.enemies || [],
        projectiles: options.projectiles || [],
        station: options.station || { pos: global.createVector(500, 500), size: 100 },
        planets: options.planets || [],
        jumpZoneCenter: global.createVector(0, 0),
        player: options.player,
        harpoons: options.harpoons || [],
        // Common methods
        addProjectile: function (p) { this.projectiles.push(p); },
        addExplosion: jest.fn(),
        isPlayerWanted: function () { return this.player ? this.player.wantedLevel > 0 : false; },
        setPlayerWanted: jest.fn(),
        getJumpDistance: () => 100,
        _getDiagonalDistance: () => 1000
    };
};
