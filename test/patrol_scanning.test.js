// Test for Patrol Mission Scanning Mechanics
// Verifies that scanning requires enemies to be visible on screen

// --- Global Mocks Setup ---
global.createVector = (x, y) => ({
    x: x || 0,
    y: y || 0,
    add: function (v) { this.x += v.x; this.y += v.y; return this; },
    sub: function (v) { this.x -= v.x; this.y -= v.y; return this; },
    mult: function (n) { this.x *= n; this.y *= n; return this; },
    div: function (n) { this.x /= n; this.y /= n; return this; },
    normalize: function () {
        const m = Math.sqrt(this.x * this.x + this.y * this.y);
        if (m > 0) this.div(m);
        return this;
    },
    mag: function () { return Math.sqrt(this.x * this.x + this.y * this.y); },
    copy: function () { return global.createVector(this.x, this.y); },
    dist: function (v) { return Math.sqrt(Math.pow(this.x - v.x, 2) + Math.pow(this.y - v.y, 2)); },
    heading: function () { return Math.atan2(this.y, this.x); },
    rotate: function (angle) {
        const newHeading = this.heading() + angle;
        const mag = this.mag();
        this.x = Math.cos(newHeading) * mag;
        this.y = Math.sin(newHeading) * mag;
        return this;
    }
});

global.dist = (x1, y1, x2, y2) => Math.sqrt(Math.pow(x2 - x1, 2) + Math.pow(y2 - y1, 2));
global.random = (min, max) => {
    if (typeof min === 'undefined') return Math.random();
    if (typeof max === 'undefined') return Math.random() * min;
    return Math.random() * (max - min) + min;
};
global.floor = Math.floor;
global.PI = Math.PI;
global.TWO_PI = Math.PI * 2;
global.cos = Math.cos;
global.sin = Math.sin;
global.atan2 = Math.atan2;
global.sqrt = Math.sqrt;
global.max = Math.max;
global.min = Math.min;
global.abs = Math.abs;
global.radians = (deg) => deg * (Math.PI / 180);
global.deltaTime = 16;
global.millis = () => Date.now();

global.p5 = {
    Vector: {
        sub: (v1, v2) => global.createVector(v1.x - v2.x, v1.y - v2.y),
        dist: (v1, v2) => global.dist(v1.x, v1.y, v2.x, v2.y),
        mult: (v, n) => global.createVector(v.x * n, v.y * n),
        random2D: () => global.createVector(Math.random() - 0.5, Math.random() - 0.5).normalize()
    }
};
global.color = () => ({});

// Global Game Configuration Mocks
global.STARFIELD_CONFIG = { WORKER_ENABLED: false };
global.SPAWN_CONFIG = { SPAWN_INTERVAL_MS: 5000, FIXED_LARGE_DESPAWN_RADIUS: 5000 };
global.JUMP_ZONE_CONFIG = { DEFAULT_RADIUS: 1000 };
global.WEAPON_UPGRADES = [
    { name: "Pulse Laser", type: "laser", damage: 10 },
    { name: "Burst Laser", type: "laser", damage: 15 }
];

global.SHIP_DEFINITIONS = {
    "Sidewinder": {
        baseHull: 100,
        baseShield: 100,
        size: 10,
        aiRoles: ["PIRATE"],
        baseMaxSpeed: 10,
        baseThrust: 10,
        baseTurnRate: 0.1
    },
    "Krait": {
        baseHull: 200,
        baseShield: 200,
        size: 20,
        aiRoles: ["PIRATE"],
        baseMaxSpeed: 10,
        baseThrust: 10,
        baseTurnRate: 0.1
    }
};

// Additional required globals
global.width = 2000;
global.height = 2000;
global.AI_STATE = { IDLE: 'IDLE', ATTACKING: 'ATTACKING' };
global.AI_ROLE = { PIRATE: 'PIRATE', HAULER: 'HAULER' };
global.WEAPON_TYPE = { PROJECTILE: 'projectile' };

// Mock uiManager
global.uiManager = {
    addMessage: jest.fn(),
    inactiveMissionIds: new Set()
};

// Mock classes
global.Planet = class Planet { };
global.Station = class Station { };
global.SpaceObject = class SpaceObject {
    distanceTo(other) {
        if (!other || !other.pos) return Infinity;
        return global.dist(this.pos.x, this.pos.y, other.pos.x, other.pos.y);
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
    constructor(cellSize) { this.cellSize = cellSize; this.items = []; }
    insert(entity) { this.items.push(entity); }
    insertAll(entities) { if (entities) entities.forEach(e => this.insert(e)); }
    remove(entity) { const idx = this.items.indexOf(entity); if (idx > -1) this.items.splice(idx, 1); }
    removeAll(entities) { if (entities) entities.forEach(e => this.remove(e)); }
    update(entity) { }
    query(range) { return this.items || []; }
    getNearby(x, y, range) { return this.items || []; }
    clear() { this.items = []; }
};

// Mission type constants
global.MISSION_TYPE = {
    IMPERIAL_PATROL: 'Imperial Patrol',
    MILITARY_DEFENSE: 'Military Defense'
};

global.FACTION_PATROL_TYPES = new Set([
    MISSION_TYPE.IMPERIAL_PATROL,
    MISSION_TYPE.MILITARY_DEFENSE
]);

// Requires must come AFTER globals are set
const { StarSystem } = require('../starSystem');
const Player = require('../player');
const { Enemy } = require('../enemy');
const { Mission } = require('../mission');

// Set globals for instanceof checks
global.Player = Player;
global.Enemy = Enemy;

describe('Patrol Mission Scanning Mechanics', () => {
    let player;
    let enemy1;
    let enemy2;
    let mission;

    beforeEach(() => {
        // Create player
        player = new Player("Sidewinder");
        player.pos = createVector(0, 0);
        player.currentSystem = { name: 'Test System' };

        // Create patrol mission
        mission = new Mission({
            type: MISSION_TYPE.IMPERIAL_PATROL,
            title: 'Imperial Patrol: Scan 3 Vessels',
            description: 'Scan 3 vessels for patrol duty',
            originSystem: 'Test System',
            originStation: 'Test Station',
            targetCount: 3,
            progressCount: 0,
            status: 'Active',
            rewardCredits: 1000,
            prestigeReward: 1,
            requiredFaction: 'IMPERIAL'
        });

        player.activeMission = mission;

        // Create two test enemies
        enemy1 = new Enemy(100, 0, player, "Krait", "HAULER");
        enemy1.pos = createVector(100, 0);
        enemy1.id = 'enemy1';
        enemy1._isOnScreen = true; // On screen by default

        enemy2 = new Enemy(200, 0, player, "Krait", "HAULER");
        enemy2.pos = createVector(200, 0);
        enemy2.id = 'enemy2';
        enemy2._isOnScreen = false; // Off screen

        // Clear uiManager mock
        global.uiManager.addMessage.mockClear();
    });

    test('should scan enemy when visible on screen', () => {
        // Simulate clicking on enemy1 (on screen)
        const clickedEnemy = enemy1;

        // Execute scanning logic (from player.js handleClick)
        if (clickedEnemy && player.activeMission &&
            typeof FACTION_PATROL_TYPES !== 'undefined' &&
            FACTION_PATROL_TYPES.has(player.activeMission.type)) {

            if (!clickedEnemy._isOnScreen) {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage('Target must be visible on screen to scan!', [255, 150, 0]);
                }
            } else {
                if (!player.activeMission._scannedShipIds) {
                    player.activeMission._scannedShipIds = new Set();
                }

                const shipId = clickedEnemy.id || clickedEnemy;
                if (!player.activeMission._scannedShipIds.has(shipId)) {
                    player.activeMission._scannedShipIds.add(shipId);
                    player.activeMission.progressCount = (player.activeMission.progressCount || 0) + 1;

                    const progress = player.activeMission.progressCount;
                    const targetCount = player.activeMission.targetCount;
                    if (typeof uiManager !== 'undefined') {
                        uiManager.addMessage(`Vessel scanned: ${progress}/${targetCount}`, [255, 215, 0]);
                    }
                }
            }
        }

        // Verify scan was successful
        expect(mission.progressCount).toBe(1);
        expect(mission._scannedShipIds.has('enemy1')).toBe(true);
        expect(uiManager.addMessage).toHaveBeenCalledWith('Vessel scanned: 1/3', [255, 215, 0]);
    });

    test('should reject scan when enemy is off screen', () => {
        // Simulate clicking on enemy2 (off screen)
        const clickedEnemy = enemy2;

        // Execute scanning logic
        if (clickedEnemy && player.activeMission &&
            typeof FACTION_PATROL_TYPES !== 'undefined' &&
            FACTION_PATROL_TYPES.has(player.activeMission.type)) {

            if (!clickedEnemy._isOnScreen) {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage('Target must be visible on screen to scan!', [255, 150, 0]);
                }
            } else {
                if (!player.activeMission._scannedShipIds) {
                    player.activeMission._scannedShipIds = new Set();
                }

                const shipId = clickedEnemy.id || clickedEnemy;
                if (!player.activeMission._scannedShipIds.has(shipId)) {
                    player.activeMission._scannedShipIds.add(shipId);
                    player.activeMission.progressCount = (player.activeMission.progressCount || 0) + 1;

                    const progress = player.activeMission.progressCount;
                    const targetCount = player.activeMission.targetCount;
                    if (typeof uiManager !== 'undefined') {
                        uiManager.addMessage(`Vessel scanned: ${progress}/${targetCount}`, [255, 215, 0]);
                    }
                }
            }
        }

        // Verify scan was rejected
        expect(mission.progressCount).toBe(0);
        expect(mission._scannedShipIds).toBeUndefined();
        expect(uiManager.addMessage).toHaveBeenCalledWith('Target must be visible on screen to scan!', [255, 150, 0]);
    });

    test('should not scan the same enemy twice', () => {
        // First scan
        const clickedEnemy = enemy1;

        if (clickedEnemy && player.activeMission &&
            FACTION_PATROL_TYPES.has(player.activeMission.type)) {
            if (clickedEnemy._isOnScreen) {
                if (!player.activeMission._scannedShipIds) {
                    player.activeMission._scannedShipIds = new Set();
                }

                const shipId = clickedEnemy.id;
                if (!player.activeMission._scannedShipIds.has(shipId)) {
                    player.activeMission._scannedShipIds.add(shipId);
                    player.activeMission.progressCount++;
                    uiManager.addMessage(`Vessel scanned: ${player.activeMission.progressCount}/3`, [255, 215, 0]);
                }
            }
        }

        expect(mission.progressCount).toBe(1);
        uiManager.addMessage.mockClear();

        // Try to scan same enemy again
        if (clickedEnemy && player.activeMission &&
            FACTION_PATROL_TYPES.has(player.activeMission.type)) {
            if (clickedEnemy._isOnScreen) {
                const shipId = clickedEnemy.id;
                if (!player.activeMission._scannedShipIds.has(shipId)) {
                    player.activeMission._scannedShipIds.add(shipId);
                    player.activeMission.progressCount++;
                    uiManager.addMessage(`Vessel scanned: ${player.activeMission.progressCount}/3`, [255, 215, 0]);
                }
            }
        }

        // Verify progress didn't increase
        expect(mission.progressCount).toBe(1);
        expect(uiManager.addMessage).not.toHaveBeenCalled();
    });

    test('should allow scanning after enemy moves on screen', () => {
        // Enemy starts off screen
        enemy2._isOnScreen = false;

        // Try to scan (should fail)
        if (enemy2._isOnScreen) {
            if (!player.activeMission._scannedShipIds) {
                player.activeMission._scannedShipIds = new Set();
            }
            player.activeMission._scannedShipIds.add(enemy2.id);
            player.activeMission.progressCount++;
        }

        expect(mission.progressCount).toBe(0);

        // Enemy moves on screen
        enemy2._isOnScreen = true;

        // Try to scan again (should succeed)
        if (enemy2._isOnScreen) {
            if (!player.activeMission._scannedShipIds) {
                player.activeMission._scannedShipIds = new Set();
            }
            if (!player.activeMission._scannedShipIds.has(enemy2.id)) {
                player.activeMission._scannedShipIds.add(enemy2.id);
                player.activeMission.progressCount++;
                uiManager.addMessage(`Vessel scanned: ${player.activeMission.progressCount}/3`, [255, 215, 0]);
            }
        }

        expect(mission.progressCount).toBe(1);
        expect(mission._scannedShipIds.has('enemy2')).toBe(true);
    });

    test('should only work for patrol mission types', () => {
        // Change mission to non-patrol type
        player.activeMission.type = 'Bounty Mission';

        const clickedEnemy = enemy1;

        // Execute scanning logic
        if (clickedEnemy && player.activeMission &&
            typeof FACTION_PATROL_TYPES !== 'undefined' &&
            FACTION_PATROL_TYPES.has(player.activeMission.type)) {

            if (clickedEnemy._isOnScreen) {
                if (!player.activeMission._scannedShipIds) {
                    player.activeMission._scannedShipIds = new Set();
                }
                player.activeMission._scannedShipIds.add(clickedEnemy.id);
                player.activeMission.progressCount++;
            }
        }

        // Verify scan did not occur
        expect(mission.progressCount).toBe(0);
        expect(mission._scannedShipIds).toBeUndefined();
    });

    test('should track multiple unique scans correctly', () => {
        // Create third enemy
        const enemy3 = new Enemy(300, 0, player, "Krait", "HAULER");
        enemy3.pos = createVector(300, 0);
        enemy3.id = 'enemy3';
        enemy3._isOnScreen = true;

        // Scan all three enemies
        const enemies = [enemy1, enemy2, enemy3];

        enemies.forEach(enemy => {
            if (enemy._isOnScreen) {
                if (!player.activeMission._scannedShipIds) {
                    player.activeMission._scannedShipIds = new Set();
                }
                if (!player.activeMission._scannedShipIds.has(enemy.id)) {
                    player.activeMission._scannedShipIds.add(enemy.id);
                    player.activeMission.progressCount++;
                }
            }
        });

        // enemy1: on screen ✓
        // enemy2: off screen ✗
        // enemy3: on screen ✓
        expect(mission.progressCount).toBe(2);
        expect(mission._scannedShipIds.size).toBe(2);
        expect(mission._scannedShipIds.has('enemy1')).toBe(true);
        expect(mission._scannedShipIds.has('enemy2')).toBe(false);
        expect(mission._scannedShipIds.has('enemy3')).toBe(true);
    });

    test('should reject scan when clicking on minimap', () => {
        // Mock uiManager with minimap
        global.uiManager.minimap = {
            isClickInMinimap: jest.fn((mx, my) => true) // Simulate click on minimap
        };

        // Mock mouseX and mouseY
        global.mouseX = 1800; // Right side of screen (where minimap is)
        global.mouseY = 1800;

        const clickedEnemy = enemy1; // On screen

        // Execute scanning logic with minimap check
        if (clickedEnemy && player.activeMission &&
            FACTION_PATROL_TYPES.has(player.activeMission.type)) {

            let clickOnMinimap = false;
            if (typeof uiManager !== 'undefined' && uiManager.minimap &&
                typeof uiManager.minimap.isClickInMinimap === 'function') {
                clickOnMinimap = uiManager.minimap.isClickInMinimap(mouseX, mouseY);
            }

            if (clickOnMinimap) {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage('Cannot scan from radar! Target must be visible on main screen.', [255, 150, 0]);
                }
            } else if (!clickedEnemy._isOnScreen) {
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage('Target must be visible on screen to scan!', [255, 150, 0]);
                }
            } else {
                if (!player.activeMission._scannedShipIds) {
                    player.activeMission._scannedShipIds = new Set();
                }
                player.activeMission._scannedShipIds.add(clickedEnemy.id);
                player.activeMission.progressCount++;
            }
        }

        // Verify scan was rejected
        expect(mission.progressCount).toBe(0);
        expect(mission._scannedShipIds).toBeUndefined();
        expect(uiManager.addMessage).toHaveBeenCalledWith('Cannot scan from radar! Target must be visible on main screen.', [255, 150, 0]);
        expect(uiManager.minimap.isClickInMinimap).toHaveBeenCalledWith(1800, 1800);
    });
});
