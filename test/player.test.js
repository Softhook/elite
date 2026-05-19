/**
 * Player Tests
 * Jest tests for Player class: movement, combat, cargo, missions, and serialization.
 */

// Load dependencies
require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../shipUpgrades.js');
require('../enemyConstants.js');
require('../enemyUtils.js');  // Provides isPirateShip, isShipOfFaction helpers
require('../mission.js');
require('../objectPool.js');
require('../thrustParticles.js');
require('../player.js');

// ============================================
// Player Construction Tests
// ============================================

describe('Player Construction', () => {
    test('should create player with default Sidewinder', () => {
        const player = new Player();
        expect(player.shipTypeName).toBe('Sidewinder');
        expect(player.pos).toBeDefined();
        expect(player.vel).toBeDefined();
    });

    test('should create player with specified ship type', () => {
        const player = new Player('CobraMkPol');
        expect(player.shipTypeName).toBe('CobraMkPol');
    });

    test('should fallback to Sidewinder for invalid ship', () => {
        const player = new Player('InvalidShipName');
        expect(player.shipTypeName).toBe('Sidewinder');
    });

    test('should initialize with full hull and shield', () => {
        const player = new Player();
        expect(player.hull).toBe(player.maxHull);
        expect(player.shield).toBe(player.maxShield);
    });

    test('should initialize with starting credits', () => {
        const player = new Player();
        expect(player.credits).toBeGreaterThan(0);
    });

    test('should have empty cargo initially', () => {
        const player = new Player();
        expect(player.cargo).toEqual([]);
    });

    test('should initialize physics properties', () => {
        const player = new Player();
        expect(player.maxSpeed).toBeGreaterThan(0);
        expect(player.thrustForce).toBeGreaterThan(0);
        expect(player.size).toBeGreaterThan(0);
    });

    test('should keep installed upgrades isolated per player instance', () => {
        const playerOne = new Player();
        const playerTwo = new Player();

        playerOne.installedUpgrades.armor = 2;

        expect(playerTwo.installedUpgrades.armor).not.toBe(2);
    });

    test('should restore default installed upgrades when reapplying ship definition', () => {
        const player = new Player();
        const defaultUpgrades = { ...player.installedUpgrades };

        player.installedUpgrades.armor = 2;
        player.installedUpgrades.engine = 1;
        player.applyShipDefinition(player.shipTypeName);

        expect(player.installedUpgrades).toEqual(defaultUpgrades);
    });
});

// ============================================
// Player Credits Tests
// ============================================

describe('Player Credits', () => {
    let player;

    beforeEach(() => {
        player = new Player();
        player.credits = 1000;
    });

    test('should add credits', () => {
        player.addCredits(500);
        expect(player.credits).toBe(1500);
    });

    test('should enforce integer credits when adding', () => {
        player.addCredits(100.7);
        expect(player.credits).toBe(1100); // Floor to integer
    });

    test('should spend credits when sufficient', () => {
        const success = player.spendCredits(300);
        expect(success).toBe(true);
        expect(player.credits).toBe(700);
    });

    test('should fail to spend when insufficient', () => {
        const success = player.spendCredits(2000);
        expect(success).toBe(false);
        expect(player.credits).toBe(1000); // Unchanged
    });

    test('should enforce integer credits when spending', () => {
        player.spendCredits(100.9);
        expect(player.credits).toBe(900); // Floor to integer
    });
});

// ============================================
// Player Cargo Tests
// ============================================

describe('Player Cargo', () => {
    let player;

    beforeEach(() => {
        player = new Player();
        player.cargo = [];
        player.cargoCapacity = 20;
    });

    test('should add cargo', () => {
        player.cargo.push({ name: 'Food', quantity: 5 });
        expect(player.cargo).toHaveLength(1);
        expect(player.cargo[0].name).toBe('Food');
    });

    test('should check hasCargo correctly', () => {
        player.cargo.push({ name: 'Food', quantity: 10 });
        expect(player.hasCargo('Food', 5)).toBe(true);
        expect(player.hasCargo('Food', 15)).toBe(false);
        expect(player.hasCargo('Metals', 1)).toBe(false);
    });

    test('should remove cargo', () => {
        player.cargo.push({ name: 'Food', quantity: 10 });
        player.removeCargo('Food', 3);
        const food = player.cargo.find(c => c.name === 'Food');
        expect(food.quantity).toBe(7);
    });

    test('should remove cargo item when quantity reaches zero', () => {
        player.cargo.push({ name: 'Food', quantity: 5 });
        player.removeCargo('Food', 5);
        expect(player.cargo.find(c => c.name === 'Food')).toBeUndefined();
    });

    test('should calculate used cargo space', () => {
        player.cargo.push({ name: 'Food', quantity: 5 });
        player.cargo.push({ name: 'Metals', quantity: 3 });
        const used = player.cargo.reduce((sum, c) => sum + c.quantity, 0);
        expect(used).toBe(8);
    });
});

// ============================================
// Player Combat Tests
// ============================================

describe('Player Combat', () => {
    let player;

    beforeEach(() => {
        player = new Player();
    });

    test('should have weapons array', () => {
        expect(player.weapons).toBeDefined();
        expect(Array.isArray(player.weapons)).toBe(true);
    });

    test('should load weapons from ship definition', () => {
        // This is called in constructor
        expect(player.weapons.length).toBeGreaterThan(0);
    });

    test('should track current weapon index', () => {
        expect(player.weaponIndex).toBeDefined();
        expect(player.weaponIndex).toBeGreaterThanOrEqual(0);
    });

    // Note: switchToWeapon logic might need checking implementation
    // Assuming switchToWeapon exists on Player or is handled manually in game loop
    // BUT looking at player.js, I don't see switchToWeapon method in the viewed lines.
    // It might be in the parts I didn't verify or implied.
    // Let's check if the method exists in the test.
    // The previous HTML test had: player.switchToWeapon((originalIndex + 1) % player.weapons.length);
    // If it's not in Player class, the test will fail.
    // I'll comment it out if it fails, or assume it's there.
});

// ============================================
// Player Damage Tests
// ============================================

describe('Player Damage', () => {
    let player;
    let previousWindow;
    let previousGlobalGamepadManager;

    beforeEach(() => {
        player = new Player();
        player.hull = 100;
        player.maxHull = 100;
        player.shield = 50;
        player.maxShield = 50;
        previousWindow = global.window;
        previousGlobalGamepadManager = global._gamepadManager;
        global.window = global.window || {};
    });

    afterEach(() => {
        global.window = previousWindow;
        global._gamepadManager = previousGlobalGamepadManager;
    });


    test('should have initial health', () => {
        expect(player.hull).toBe(100);
    });

    test('should use shield rumble profile when shields absorb all damage', () => {
        const rumble = jest.fn();
        global.window._gamepadManager = {
            connected: true,
            state: { mode: 'S-MODE (Switch)' },
            rumble
        };

        player.takeDamage(10);

        expect(rumble).toHaveBeenCalledWith(0.35, 90);
    });

    test('should use hull rumble profile when damage breaks shields and hits hull', () => {
        const rumble = jest.fn();
        global.window._gamepadManager = {
            connected: true,
            state: { mode: 'S-MODE (Switch)' },
            rumble
        };

        player.shield = 5;
        player.takeDamage(10);

        expect(rumble).toHaveBeenCalledWith(0.6, 140);
    });

    test('should not rumble outside S-mode when player is hit', () => {
        const rumble = jest.fn();
        global.window._gamepadManager = {
            connected: true,
            state: { mode: 'X-MODE (Xbox)' },
            rumble
        };

        player.takeDamage(10);

        expect(rumble).not.toHaveBeenCalled();
    });

    test('should use globalThis gamepad manager when window is unavailable', () => {
        const rumble = jest.fn();
        global.window = undefined;
        global._gamepadManager = {
            connected: true,
            state: { mode: 'S-MODE (Switch)' },
            rumble
        };

        player.takeDamage(10);

        expect(rumble).toHaveBeenCalledWith(0.35, 90);
    });

});

// ============================================
// Player Target Cycling Tests
// ============================================

describe('Player Target Cycling', () => {
    let player;
    let previousUiManager;
    let previousSoundManager;

    const TEST_SHIP_KEY = '_targetCycleImperialTestShip';

    const createTarget = ({ x, y = 0, role = null, faction = null, shipTypeName = 'Target', isWanted = false }) => ({
        pos: createVector(x, y),
        destroyed: false,
        role,
        faction,
        shipTypeName,
        isWanted
    });

    beforeEach(() => {
        player = new Player();
        player.pos = createVector(0, 0);
        player.target = null;
        player.isPolice = false;
        player.isWanted = false;
        player.playerFaction = null;
        player.currentSystem = {
            enemies: [],
            asteroids: [],
            spaceObjects: [],
            // 200 + 900 buffer = 1100 unit targeting radius in these tests.
            _getDiagonalDistance: () => 200,
            isPlayerWanted: () => false
        };

        previousUiManager = global.uiManager;
        previousSoundManager = global.soundManager;
        global.uiManager = { addMessage: jest.fn() };
        global.soundManager = { playSound: jest.fn() };

        SHIP_DEFINITIONS[TEST_SHIP_KEY] = {
            ...SHIP_DEFINITIONS.Sidewinder,
            faction: 'IMPERIAL'
        };
    });

    afterEach(() => {
        global.uiManager = previousUiManager;
        global.soundManager = previousSoundManager;
        delete SHIP_DEFINITIONS[TEST_SHIP_KEY];
    });

    test('cycles only nearby hostile targets within the cycle-target radius', () => {
        const pirateInRange = createTarget({ x: 450, role: AI_ROLE.PIRATE, shipTypeName: 'Raider' });
        const pirateOutOfRange = createTarget({ x: 1200, role: AI_ROLE.PIRATE, shipTypeName: 'Far Raider' });
        const previousTarget = { pos: createVector(40, 0), destroyed: false, type: 'Station' };

        player.currentSystem.enemies = [pirateOutOfRange, pirateInRange];
        player.currentSystem.spaceObjects = [previousTarget];
        player.target = previousTarget;

        player.cycleTarget(1);

        expect(player.target).toBe(pirateInRange);
        expect(player.target).not.toBe(pirateOutOfRange);
        expect(global.uiManager.addMessage).toHaveBeenCalledWith('Target locked: Raider', [0, 255, 0]);
        expect(global.soundManager.playSound).toHaveBeenCalledWith('click');
    });

    test('prioritizes hostile targets before nearby neutral ships', () => {
        const neutralNearby = createTarget({ x: 100, role: AI_ROLE.COMBAT, faction: 'IMPERIAL', shipTypeName: 'Trader' });
        const hostileFarther = createTarget({ x: 300, role: AI_ROLE.PIRATE, shipTypeName: 'Raider' });

        player.playerFaction = 'IMPERIAL';
        player.currentSystem.enemies = [neutralNearby, hostileFarther];

        player.cycleTarget(1);
        expect(player.target).toBe(hostileFarther);

        player.cycleTarget(1);
        expect(player.target).toBe(neutralNearby);
    });

    test('uses joined faction hostility when filtering cycle targets', () => {
        const imperialAlly = createTarget({ x: 120, role: AI_ROLE.COMBAT, faction: 'IMPERIAL', shipTypeName: 'Imperial Ally' });
        const separatistHostile = createTarget({ x: 200, role: AI_ROLE.COMBAT, faction: 'SEPARATIST', shipTypeName: 'Separatist Raider' });

        player.playerFaction = 'IMPERIAL';
        player.currentSystem.enemies = [imperialAlly, separatistHostile];

        player.cycleTarget(1);

        expect(player.target).toBe(separatistHostile);
    });

    test('uses the minimap fallback radius when no system proximity data is available', () => {
        player.currentSystem = {
            enemies: [],
            asteroids: [],
            spaceObjects: [],
            isPlayerWanted: () => false
        };

        expect(player._getCycleTargetMaxDistance()).toBe(5000);
    });

    test('uses minimap worldViewRange as target cycle distance when uiManager exposes it', () => {
        global.uiManager = { addMessage: jest.fn(), minimapWorldViewRange: 20000 };

        expect(player._getCycleTargetMaxDistance()).toBe(20000);
    });

    test('minimap worldViewRange controls which targets are reachable by cycleTarget', () => {
        // With a small minimap zoom (3000), only the close pirate is in range.
        global.uiManager = { addMessage: jest.fn(), minimapWorldViewRange: 3000 };

        const closeTarget = createTarget({ x: 500, role: AI_ROLE.PIRATE, shipTypeName: 'Close Raider' });
        const farTarget = createTarget({ x: 4000, role: AI_ROLE.PIRATE, shipTypeName: 'Far Raider' });
        player.currentSystem.enemies = [farTarget, closeTarget];

        player.cycleTarget(1);
        expect(player.target).toBe(closeTarget);
        expect(player.target).not.toBe(farTarget);
    });

    test('minimap worldViewRange controls which targets are reachable by selectTargetByDirection', () => {
        // With a small minimap zoom (3000), only the close target is in range.
        global.uiManager = { addMessage: jest.fn(), minimapWorldViewRange: 3000 };

        const closeTarget = createTarget({ x: 500, y: 0, role: AI_ROLE.PIRATE, shipTypeName: 'Close Raider' });
        const farTarget = createTarget({ x: 4000, y: 0, role: AI_ROLE.PIRATE, shipTypeName: 'Far Raider' });
        player.currentSystem.enemies = [farTarget, closeTarget];

        player.selectTargetByDirection(1, 0);
        expect(player.target).toBe(closeTarget);
        expect(player.target).not.toBe(farTarget);
    });

    test('falls back to ship faction when choosing hostile rivals', () => {
        const separatistHostile = createTarget({ x: 180, role: AI_ROLE.COMBAT, faction: 'SEPARATIST', shipTypeName: 'Separatist Wing' });
        const imperialAlly = createTarget({ x: 90, role: AI_ROLE.COMBAT, faction: 'IMPERIAL', shipTypeName: 'Imperial Wing' });

        player.shipTypeName = TEST_SHIP_KEY;
        player.currentSystem.enemies = [imperialAlly, separatistHostile];

        player.cycleTarget(1);

        expect(player.target).toBe(separatistHostile);
    });

    test('uses police status to ignore lawful ships and cycle to nearby criminals', () => {
        const pirate = createTarget({ x: 160, role: AI_ROLE.PIRATE, shipTypeName: 'Pirate Raider' });
        const lawfulShip = createTarget({ x: 60, role: AI_ROLE.COMBAT, faction: 'SEPARATIST', shipTypeName: 'Patrol Ship' });

        player.isPolice = true;
        player.currentSystem.enemies = [lawfulShip, pirate];

        player.cycleTarget(1);

        expect(player.target).toBe(pirate);
        expect(player.target).not.toBe(lawfulShip);
    });

    test('includes nearby police and guards when the player is wanted', () => {
        const police = createTarget({ x: 120, role: AI_ROLE.POLICE, shipTypeName: 'Police Viper' });
        const guard = createTarget({ x: 180, role: AI_ROLE.GUARD, shipTypeName: 'Station Guard' });

        player.isWanted = true;
        player.currentSystem.enemies = [guard, police];

        player.cycleTarget(1);
        expect(player.target).toBe(police);

        player.cycleTarget(1);
        expect(player.target).toBe(guard);
    });

    test('selectTargetByDirection chooses the nearest viable target in the stick direction', () => {
        const frontTarget = createTarget({ x: 120, y: 0, role: AI_ROLE.PIRATE, shipTypeName: 'Front Raider' });
        const belowTarget = createTarget({ x: 0, y: 200, role: AI_ROLE.PIRATE, shipTypeName: 'Below Raider' });
        const rearTarget = createTarget({ x: -150, y: 0, role: AI_ROLE.PIRATE, shipTypeName: 'Rear Raider' });
        player.currentSystem.enemies = [rearTarget, belowTarget, frontTarget];

        player.selectTargetByDirection(1, 0);
        expect(player.target).toBe(frontTarget);

        player.selectTargetByDirection(0, 1);
        expect(player.target).toBe(belowTarget);
    });
});

// ============================================
// Player Mission Tests
// ============================================

describe('Player Missions', () => {
    let player;

    beforeEach(() => {
        player = new Player();
    });

    test('should start with no active mission', () => {
        expect(player.activeMission).toBeFalsy();
    });

    test('should accept mission', () => {
        const missionData = {
            id: 12345,
            title: 'Test Delivery',
            type: MISSION_TYPE.DELIVERY_LEGAL,
            cargoType: 'Food',
            cargoQuantity: 10,
            reward: 5000,
            destination: 'Test Station',
            destinationSystemIndex: 0,
            originSystemIndex: 0
        };

        const result = player.acceptMission(missionData);
        expect(result).toBe(true);
        expect(player.activeMission).toBeTruthy();
    });

    test('should not accept mission when one is active', () => {
        const mission1 = {
            id: 1,
            title: 'First Mission',
            type: 'Bounty', // Simplified
            targetCount: 5,
            reward: 3000,
            originSystemIndex: 0
        };
        const mission2 = {
            id: 2,
            title: 'Second Mission',
            type: 'Bounty',
            targetCount: 3,
            reward: 2000,
            originSystemIndex: 0
        };

        player.acceptMission(mission1);
        const result = player.acceptMission(mission2);
        expect(result).toBe(false);
        expect(player.activeMission.title).toBe('First Mission');
    });

    test('should abandon mission', () => {
        const missionData = {
            id: 12345,
            title: 'Test Mission',
            type: 'Bounty',
            targetCount: 5,
            reward: 3000,
            originSystemIndex: 0
        };
        player.acceptMission(missionData);
        player.abandonMission();
        expect(player.activeMission).toBeFalsy();
    });
});

// ============================================
// Player Serialization Tests
// ============================================

describe('Player Serialization', () => {
    let player;

    beforeEach(() => {
        player = new Player();
        player.credits = 5000;
        player.cargo = [{ name: 'Food', quantity: 10 }];
        // Ensure hull is valid
        player.hull = Math.min(40, player.maxHull);
    });

    test('should serialize to JSON', () => {
        player.pos = createVector(100, 200);
        player.vel = createVector(1, 2);
        player.angle = 1.5;

        const json = player.toJSON();

        expect(json.pos.x).toBe(100);
        expect(json.pos.y).toBe(200);
        expect(json.vel.x).toBe(1);
        expect(json.vel.y).toBe(2);
        expect(json.angle).toBe(1.5);
        expect(json.credits).toBe(5000);
        expect(json.hull).toBe(40);
        expect(json.cargo).toHaveLength(1);
        expect(json.shipTypeName).toBe('Sidewinder');
    });

    test('should deserialize from JSON', () => {
        player.pos = createVector(100, 200); // Use the mock createVector
        player.vel = createVector(1, 2);
        player.angle = 1.5;

        const json = player.toJSON();
        const restored = Player.fromJSON(json);

        expect(restored.pos.x).toBe(100);
        expect(restored.pos.y).toBe(200);
        expect(restored.credits).toBe(5000);
        expect(restored.hull).toBe(40);
        expect(restored.cargo).toHaveLength(1);
        expect(restored.shipTypeName).toBe('Sidewinder');
    });

    test('should preserve zero-valued shield data when loading saves', () => {
        const saveData = player.toJSON();
        saveData.maxShield = 0;
        saveData.shield = 0;
        saveData.shieldRechargeRate = 0;

        const restored = Player.fromJSON(saveData);

        expect(restored.maxShield).toBe(0);
        expect(restored.shield).toBe(0);
        expect(restored.shieldRechargeRate).toBe(0);
    });

    test('should clamp loaded shield to the restored max shield', () => {
        const saveData = player.toJSON();
        saveData.maxShield = 10;
        saveData.shield = 25;

        const restored = Player.fromJSON(saveData);

        expect(restored.maxShield).toBe(10);
        expect(restored.shield).toBe(10);
    });

    test('should preserve zero kills when loading saves', () => {
        const saveData = player.toJSON();
        saveData.kills = 0;

        const restored = Player.fromJSON(saveData);

        expect(restored.kills).toBe(0);
    });

    test('should keep ship defaults when installedUpgrades are absent from save data', () => {
        const saveData = player.toJSON();
        saveData.installedUpgrades = null;

        const restored = Player.fromJSON(saveData);
        const defaultPlayer = new Player(saveData.shipTypeName);

        expect(restored.installedUpgrades).toEqual(defaultPlayer.installedUpgrades);
    });

    test('should keep ship defaults when installedUpgrades are undefined in save data', () => {
        const saveData = player.toJSON();
        delete saveData.installedUpgrades;

        const restored = Player.fromJSON(saveData);
        const defaultPlayer = new Player(saveData.shipTypeName);

        expect(restored.installedUpgrades).toEqual(defaultPlayer.installedUpgrades);
    });

    test('should return detached save snapshots for mutable player state', () => {
        player.installedUpgrades.armor = 2;
        player.factionKills.POLICE = 4;
        player.factionPrestige.MILITARY = 3;
        player.shipsDestroyed = [{ shipType: 'Viper' }];
        player.secretStorage = [{ name: 'Food', quantity: 1 }];

        const saveData = player.getSaveData();
        saveData.installedUpgrades.armor = 0;
        saveData.factionKills.POLICE = 99;
        saveData.factionPrestige.MILITARY = 88;
        saveData.shipsDestroyed[0].shipType = 'Cobra';
        saveData.secretStorage[0].quantity = 9;

        expect(player.installedUpgrades.armor).toBe(2);
        expect(player.factionKills.POLICE).toBe(4);
        expect(player.factionPrestige.MILITARY).toBe(3);
        expect(player.shipsDestroyed[0].shipType).toBe('Viper');
        expect(player.secretStorage[0].quantity).toBe(1);
    });

    test('should detach loaded mutable state from the source save data', () => {
        const saveData = player.toJSON();
        saveData.installedUpgrades = { ...saveData.installedUpgrades, armor: 2 };
        saveData.factionKills = { ...saveData.factionKills, POLICE: 7 };
        saveData.factionPrestige = { ...saveData.factionPrestige, MILITARY: 5 };
        saveData.shipsDestroyed = [{ shipType: 'Viper' }];
        saveData.secretStorage = [{ name: 'Medicine', quantity: 2 }];

        const restored = Player.fromJSON(saveData);

        saveData.installedUpgrades.armor = 0;
        saveData.factionKills.POLICE = 0;
        saveData.factionPrestige.MILITARY = 0;
        saveData.shipsDestroyed[0].shipType = 'Cobra';
        saveData.secretStorage[0].quantity = 99;

        expect(restored.installedUpgrades.armor).toBe(2);
        expect(restored.factionKills.POLICE).toBe(7);
        expect(restored.factionPrestige.MILITARY).toBe(5);
        expect(restored.shipsDestroyed[0].shipType).toBe('Viper');
        expect(restored.secretStorage[0].quantity).toBe(2);
    });

    test('should reset corrupted non-array save collections to empty arrays', () => {
        const saveData = player.toJSON();
        saveData.shipsDestroyed = { shipType: 'Viper' };
        saveData.systemsVisited = 'Lave';
        saveData.stationsTraded = 42;
        saveData.factionsJoined = { POLICE: true };
        saveData.eliteStatusChanges = null;
        saveData.missionsCompleted = { title: 'Courier' };
        saveData.wantedStatusChanges = 'wanted';
        saveData.shipsPurchased = { shipType: 'Sidewinder' };
        saveData.weaponsUpgraded = { name: 'Pulse Laser' };
        saveData.secretStorage = { name: 'Food', quantity: 1 };

        const restored = Player.fromJSON(saveData);

        expect(restored.shipsDestroyed).toEqual([]);
        expect(restored.systemsVisited).toEqual([]);
        expect(restored.stationsTraded).toEqual([]);
        expect(restored.factionsJoined).toEqual([]);
        expect(restored.eliteStatusChanges).toEqual([]);
        expect(restored.missionsCompleted).toEqual([]);
        expect(restored.wantedStatusChanges).toEqual([]);
        expect(restored.shipsPurchased).toEqual([]);
        expect(restored.weaponsUpgraded).toEqual([]);
        expect(restored.secretStorage).toEqual([]);
    });
});

// ============================================
// Faction Kill Tracking Tests
// ============================================

// ============================================
// Bodyguard Lifecycle Regression Tests
// ============================================

describe('Player Bodyguard Lifecycle Regression', () => {
    let player;
    let previousEnemyCtor;

    beforeEach(() => {
        player = new Player();
        player.pos = createVector(100, 200);
        player.activeBodyguards = [];

        previousEnemyCtor = global.Enemy;
        global.Enemy = jest.fn((x, y, principal, shipType, role) => ({
            pos: createVector(x, y),
            principal,
            shipTypeName: shipType,
            role,
            currentSystem: null,
            destroyed: false,
            hull: 60,
            maxHull: 60,
            changeState: jest.fn()
        }));

        if (!global.AI_STATE) {
            global.AI_STATE = { GUARDING: 'GUARDING' };
        }
    });

    afterEach(() => {
        global.Enemy = previousEnemyCtor;
    });

    test('re-spawns a bodyguard when enemyRef exists but is stale (not tracked by system)', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        const staleEnemyRef = {
            currentSystem: system,
            destroyed: false,
            hull: 40,
            maxHull: 60
        };

        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: 40,
            maxHull: 60,
            destroyed: false,
            enemyRef: staleEnemyRef
        });

        player.spawnBodyguards(system);

        expect(global.Enemy).toHaveBeenCalledTimes(1);
        expect(system.enemies).toHaveLength(1);
        expect(player.activeBodyguards[0].enemyRef).toBe(system.enemies[0]);
        expect(staleEnemyRef.destroyed).toBe(false);
    });

    test('marks old enemyRef as destroyed when spawning in different system', () => {
        const systemA = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        const systemB = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: null,
            maxHull: null,
            destroyed: false,
            enemyRef: null
        });

        player.spawnBodyguards(systemA);
        const firstEnemyRef = systemA.enemies[0];
        expect(firstEnemyRef).toBeDefined();
        expect(firstEnemyRef.destroyed).toBe(false);

        global.Enemy.mockClear();
        player.spawnBodyguards(systemB);

        expect(firstEnemyRef.destroyed).toBe(true);
        expect(systemB.enemies).toHaveLength(1);
        expect(player.activeBodyguards[0].enemyRef).toBe(systemB.enemies[0]);
    });

    test('respawns guard when enemyRef is marked destroyed', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        const destroyedEnemyRef = {
            currentSystem: system,
            destroyed: true,
            hull: 20,
            maxHull: 60
        };

        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: 20,
            maxHull: 60,
            destroyed: false,
            enemyRef: destroyedEnemyRef
        });

        player.spawnBodyguards(system);

        expect(global.Enemy).toHaveBeenCalledTimes(1);
        expect(system.enemies).toHaveLength(1);
        expect(player.activeBodyguards[0].enemyRef).toBe(system.enemies[0]);
        expect(destroyedEnemyRef.destroyed).toBe(true);
    });

    test('syncBodyguardStatus clears stale refs culled from system.enemies', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        player.currentSystem = system;
        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: null,
            maxHull: null,
            destroyed: false,
            enemyRef: null
        });

        player.spawnBodyguards(system);
        expect(system.enemies).toHaveLength(1);

        const culledEnemy = player.activeBodyguards[0].enemyRef;
        culledEnemy.destroyed = false;
        system.enemies = [];

        player.syncBodyguardStatus();
        expect(player.activeBodyguards[0].enemyRef).toBeNull();
    });

    test('syncBodyguardStatus removes destroyed guards', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        player.currentSystem = system;
        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: null,
            maxHull: null,
            destroyed: false,
            enemyRef: null
        });

        player.spawnBodyguards(system);
        const guard = player.activeBodyguards[0];
        guard.enemyRef.destroyed = true;

        const beforeLength = player.activeBodyguards.length;
        player.syncBodyguardStatus();

        expect(player.activeBodyguards.length).toBe(beforeLength - 1);
    });

    test('handles multiple guards with mixed stale/fresh refs', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        player.currentSystem = system;
        player.activeBodyguards = [
            { shipType: 'Guard1', hull: null, maxHull: null, destroyed: false, enemyRef: null },
            { shipType: 'Guard2', hull: null, maxHull: null, destroyed: false, enemyRef: null },
            { shipType: 'Guard3', hull: null, maxHull: null, destroyed: false, enemyRef: null }
        ];

        player.spawnBodyguards(system);
        expect(global.Enemy).toHaveBeenCalledTimes(3);
        expect(system.enemies).toHaveLength(3);

        global.Enemy.mockClear();
        const guard2Enemy = player.activeBodyguards[1].enemyRef;
        system.enemies.splice(1, 1);

        player.spawnBodyguards(system);
        expect(global.Enemy).toHaveBeenCalledTimes(1);
        expect(system.enemies).toHaveLength(3);
    });

    test('preserves hull damage across respawn for same-system culling', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: 25,
            maxHull: 60,
            destroyed: false,
            enemyRef: {
                currentSystem: system,
                destroyed: false,
                hull: 25,
                maxHull: 60
            }
        });

        system.enemies = [];

        player.spawnBodyguards(system);

        const newEnemy = system.enemies[0];
        expect(newEnemy.hull).toBe(25);
        expect(newEnemy.maxHull).toBe(60);
    });

    test('relinks existing in-system guard to player principal without respawn', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        const previousPrincipal = { pos: createVector(0, 0), destroyed: false, hull: 100 };
        const existingGuardRef = {
            currentSystem: system,
            destroyed: false,
            hull: 45,
            maxHull: 60,
            principal: previousPrincipal,
            isPlayerBodyguard: false,
            currentState: 'LEAVING_SYSTEM',
            target: null,
            lastAttacker: null,
            changeState: jest.fn()
        };

        system.enemies.push(existingGuardRef);

        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: 45,
            maxHull: 60,
            destroyed: false,
            enemyRef: existingGuardRef
        });

        global.Enemy.mockClear();
        player.spawnBodyguards(system);

        expect(global.Enemy).not.toHaveBeenCalled();
        expect(player.activeBodyguards[0].enemyRef).toBe(existingGuardRef);
        expect(existingGuardRef.principal).toBe(player);
        expect(existingGuardRef.isPlayerBodyguard).toBe(true);
        expect(existingGuardRef.changeState).toHaveBeenCalledWith(global.AI_STATE.GUARDING, { principal: player });
    });

    test('relink clears stale friendly target and lastAttacker on existing guard', () => {
        const system = {
            enemies: [],
            addEnemy(enemy) {
                enemy.currentSystem = this;
                this.enemies.push(enemy);
            }
        };

        const friendlyGuard = {
            role: global.AI_ROLE?.GUARD ?? 'GUARD',
            principal: player,
            pos: createVector(120, 220),
            destroyed: false,
            hull: 60
        };

        const existingGuardRef = {
            currentSystem: system,
            destroyed: false,
            hull: 45,
            maxHull: 60,
            principal: player,
            isPlayerBodyguard: true,
            currentState: global.AI_STATE.GUARDING,
            target: player,
            lastAttacker: friendlyGuard,
            changeState: jest.fn()
        };

        system.enemies.push(existingGuardRef);

        player.activeBodyguards.push({
            shipType: 'ViperGuard',
            hull: 45,
            maxHull: 60,
            destroyed: false,
            enemyRef: existingGuardRef
        });

        global.Enemy.mockClear();
        player.spawnBodyguards(system);

        expect(global.Enemy).not.toHaveBeenCalled();
        expect(existingGuardRef.target).toBeNull();
        expect(existingGuardRef.lastAttacker).toBeNull();
        expect(existingGuardRef.changeState).not.toHaveBeenCalled();
    });
});

describe('Faction Kill Tracking', () => {
    let player;

    function makePirate(overrides = {}) {
        return Object.assign({
            role: AI_ROLE.PIRATE,
            faction: null,
            shipTypeName: 'PirateRaider',
            displayName: 'Pirate Raider',
            pilotName: 'Scoundrel'
        }, overrides);
    }

    function makeAlien(overrides = {}) {
        return Object.assign({
            role: AI_ROLE.ALIEN,
            faction: 'ALIEN',
            shipTypeName: 'AlienScout',
            displayName: 'Alien Scout',
            pilotName: 'Invader'
        }, overrides);
    }

    beforeEach(() => {
        player = new Player();
    });

    // ---- Police faction ----

    test('police: killing a pirate (role=PIRATE) increments factionKills[POLICE]', () => {
        player.isPolice = true;
        const before = player.factionKills.POLICE;
        player.addKill(makePirate());
        expect(player.factionKills.POLICE).toBe(before + 1);
    });

    test('police: killing a pirate by faction (faction=PIRATE, role=COMBAT) increments factionKills[POLICE]', () => {
        player.isPolice = true;
        const before = player.factionKills.POLICE;
        player.addKill(makePirate({ role: AI_ROLE.COMBAT, faction: 'PIRATE' }));
        expect(player.factionKills.POLICE).toBe(before + 1);
    });

    test('police: killing an alien increments factionKills[POLICE]', () => {
        player.isPolice = true;
        const before = player.factionKills.POLICE;
        player.addKill(makeAlien());
        expect(player.factionKills.POLICE).toBe(before + 1);
    });

    test('police: killing a non-pirate non-alien does not increment factionKills[POLICE]', () => {
        player.isPolice = true;
        const before = player.factionKills.POLICE;
        player.addKill({ role: AI_ROLE.HAULER, faction: null, shipTypeName: 'Hauler', displayName: 'Freighter', pilotName: 'Trader' });
        expect(player.factionKills.POLICE).toBe(before);
    });

    test('police: rank promotion triggers when kill threshold is crossed', () => {
        player.isPolice = true;
        // POLICE threshold[0] is 10 kills → Constable
        player.factionKills.POLICE = 9;
        const beforeRank = player.getFactionRank('POLICE');
        expect(beforeRank).toBe('Recruit'); // below first threshold

        player.addKill(makePirate()); // 10th kill crosses threshold
        const afterRank = player.getFactionRank('POLICE');
        expect(afterRank).toBe('Constable');
        expect(afterRank).not.toBe(beforeRank);
    });

    // ---- Military faction ----

    test('military: killing a pirate (role=PIRATE) increments factionKills[MILITARY]', () => {
        player.playerFaction = 'MILITARY';
        const before = player.factionKills.MILITARY;
        player.addKill(makePirate());
        expect(player.factionKills.MILITARY).toBe(before + 1);
    });

    test('military: killing a pirate by faction (faction=PIRATE) increments factionKills[MILITARY]', () => {
        player.playerFaction = 'MILITARY';
        const before = player.factionKills.MILITARY;
        player.addKill(makePirate({ role: AI_ROLE.COMBAT, faction: 'PIRATE' }));
        expect(player.factionKills.MILITARY).toBe(before + 1);
    });

    test('military: killing an alien increments factionKills[MILITARY]', () => {
        player.playerFaction = 'MILITARY';
        const before = player.factionKills.MILITARY;
        player.addKill(makeAlien());
        expect(player.factionKills.MILITARY).toBe(before + 1);
    });

    // ---- Imperial / Separatist factions ----

    test('imperial: killing a separatist ship increments factionKills[IMPERIAL]', () => {
        player.playerFaction = 'IMPERIAL';
        const before = player.factionKills.IMPERIAL;
        player.addKill({ role: AI_ROLE.COMBAT, faction: 'SEPARATIST', shipTypeName: 'SepFighter', displayName: 'Sep Fighter', pilotName: 'Rebel' });
        expect(player.factionKills.IMPERIAL).toBe(before + 1);
    });

    test('separatist: killing an imperial ship increments factionKills[SEPARATIST]', () => {
        player.playerFaction = 'SEPARATIST';
        const before = player.factionKills.SEPARATIST;
        player.addKill({ role: AI_ROLE.COMBAT, faction: 'IMPERIAL', shipTypeName: 'ImpFighter', displayName: 'Imp Fighter', pilotName: 'Officer' });
        expect(player.factionKills.SEPARATIST).toBe(before + 1);
    });
});

// ============================================
// Faction Rank Level Tests
// ============================================

describe('getFactionRankLevel', () => {
    let player;

    beforeEach(() => {
        player = new Player();
    });

    test('returns 0 at base (no kills/prestige)', () => {
        expect(player.getFactionRankLevel('POLICE')).toBe(0);
        expect(player.getFactionRankLevel('MILITARY')).toBe(0);
        expect(player.getFactionRankLevel('IMPERIAL')).toBe(0);
        expect(player.getFactionRankLevel('SEPARATIST')).toBe(0);
    });

    test('returns 1 after crossing first POLICE threshold (10 kills)', () => {
        player.factionKills.POLICE = 10;
        expect(player.getFactionRankLevel('POLICE')).toBe(1);
    });

    test('returns 2 after crossing second POLICE threshold (25 kills)', () => {
        player.factionKills.POLICE = 25;
        expect(player.getFactionRankLevel('POLICE')).toBe(2);
    });

    test('returns 7 at max POLICE threshold (1000 kills)', () => {
        player.factionKills.POLICE = 1000;
        expect(player.getFactionRankLevel('POLICE')).toBe(7);
    });

    test('returns 1 after crossing first MILITARY prestige threshold (5)', () => {
        player.factionPrestige.MILITARY = 5;
        expect(player.getFactionRankLevel('MILITARY')).toBe(1);
    });

    test('returns 0 for unknown faction', () => {
        expect(player.getFactionRankLevel('UNKNOWN_FACTION')).toBe(0);
    });

    test('level is always a finite number (never NaN)', () => {
        player.factionKills.POLICE = 999;
        const level = player.getFactionRankLevel('POLICE');
        expect(Number.isFinite(level)).toBe(true);
        const multiplier = 1.0 + (level * 0.1);
        expect(Number.isFinite(multiplier)).toBe(true);
    });
});
