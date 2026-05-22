/**
 * Mission Tests
 * Jest tests for Mission and MissionGenerator: creation, lifecycle, progress tracking, and completion.
 * Includes comprehensive faction mission testing.
 */

// Load source files
require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../enemyConstants.js');  // Provides FACTION_MISSION_RANK_MULTIPLIER_PER_LEVEL and other constants
require('../mission.js');
require('../missionGenerator.js');

// ============================================
// Test Helpers
// ============================================

function createMockPlayer(options = {}) {
    return {
        pos: createVector(0, 0),
        credits: options.credits || 5000,
        cargo: options.cargo || [],
        cargoCapacity: options.cargoCapacity || 50,
        activeMission: null,
        wantedLevel: 0,
        eliteScore: options.eliteScore || 100,
        personalRecords: { kills: { total: 0 } },
        playerFaction: options.playerFaction || null,
        isPolice: options.isPolice || false,
        getFactionRank: function (faction) { return options.factionRanks?.[faction] || 0; },
        addCredits(amount) { this.credits += Math.floor(amount); },
        hasCargo(name, qty) {
            const item = this.cargo.find(c => c.name === name);
            if (!item) return false;
            return item.quantity >= qty;
        },
        removeCargo(name, qty) {
            const item = this.cargo.find(c => c.name === name);
            if (!item) return false;
            if (item.quantity < qty) return false;
            item.quantity -= qty;
            if (item.quantity <= 0) {
                this.cargo = this.cargo.filter(c => c.name !== name);
            }
            return true;
        }
    };
}

function createMockSystem(options = {}) {
    return {
        name: options.name || 'Test System',
        index: options.index || 0,
        systemIndex: options.index || 0,
        economyType: options.economyType || 'Industrial',
        securityLevel: options.securityLevel || 'Medium',
        techLevel: options.techLevel || 5,
        connectedSystemIndices: options.connectedSystemIndices || [],
        station: options.station || { name: 'Test Station', pos: createVector(500, 500) },
        planets: options.planets || [
            { name: 'Star', pos: createVector(0, 0), size: 100 },
            { name: 'Planet I', pos: createVector(1000, 0), size: 50 }
        ],
        spaceObjects: options.spaceObjects || [],
        enemies: options.enemies || [],
        enemiesById: new Map()
    };
}

function createMockGalaxy(numSystems = 4) {
    const systems = [];
    for (let i = 0; i < numSystems; i++) {
        const connected = [];
        if (i > 0) connected.push(i - 1);
        if (i < numSystems - 1) connected.push(i + 1);
        if (i + 2 < numSystems) connected.push(i + 2);

        systems.push(createMockSystem({
            name: `System ${i}`,
            index: i,
            economyType: ['Industrial', 'Agricultural', 'Mining', 'Service'][i % 4],
            connectedSystemIndices: connected
        }));
    }
    return {
        systems,
        getSystemByIndex(idx) { return this.systems[idx]; },
        getJumpDistance(from, to) { return Math.abs(to - from); }
    };
}

function createMockSecretStation(factionType) {
    return {
        name: `Secret ${factionType} Base`,
        stationSubtype: `secret_${factionType.toLowerCase()}`,
        pos: createVector(500, 500)
    };
}

// ============================================
// Mission Type Constants Tests
// ============================================

describe('Mission Type Constants', () => {
    test('should define MISSION_TYPE object', () => {
        expect(MISSION_TYPE).toBeDefined();
    });

    test('should have delivery types', () => {
        expect(MISSION_TYPE.DELIVERY_LEGAL).toBe('Legal delivery');
        expect(MISSION_TYPE.DELIVERY_ILLEGAL).toBe('Illegal delivery');
    });

    test('should have special cargo sale type', () => {
        expect(MISSION_TYPE.SPECIAL_CARGO_SALE).toBe('Special Cargo Sale');
    });

    test('should have bounty types', () => {
        expect(MISSION_TYPE.BOUNTY_PIRATE).toBe('Pirate Bounty');
        expect(MISSION_TYPE.BOUNTY_ALIEN).toBe('Alien Bounty');
    });

    test('should have assassination type', () => {
        expect(MISSION_TYPE.ASSASSINATION).toBe('Assassination');
    });

    test('should have sabotage type', () => {
        expect(MISSION_TYPE.SABOTAGE).toBe('Sabotage');
    });

    test('should have bounty police type', () => {
        expect(MISSION_TYPE.BOUNTY_POLICE).toBe('Police Bounty');
    });
});

// ============================================
// Mission Construction Tests
// ============================================

describe('Mission Construction', () => {
    test('should create mission from data object', () => {
        const data = {
            id: 12345,
            title: 'Test Mission',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            reward: 3000,
            originSystemIndex: 0
        };
        const mission = new Mission(data);
        expect(mission).toBeDefined();
        expect(mission.title).toBe('Test Mission');
    });

    test('should set mission ID', () => {
        const data = { id: 99999, title: 'Test', type: MISSION_TYPE.BOUNTY_PIRATE };
        const mission = new Mission(data);
        expect(mission.id).toBe(99999);
    });

    test('should set mission type', () => {
        const data = { id: 1, title: 'Test', type: MISSION_TYPE.DELIVERY_LEGAL };
        const mission = new Mission(data);
        expect(mission.type).toBe(MISSION_TYPE.DELIVERY_LEGAL);
    });

    test('should set reward', () => {
        const data = { id: 1, title: 'Test', type: MISSION_TYPE.BOUNTY_PIRATE, rewardCredits: 5000 };
        const mission = new Mission(data);
        expect(mission.rewardCredits).toBe(5000);
    });

    test('should initialize status as Available', () => {
        const data = { id: 1, title: 'Test', type: MISSION_TYPE.BOUNTY_PIRATE };
        const mission = new Mission(data);
        expect(mission.status).toBe('Available');
    });

    test('should initialize progress to zero', () => {
        const data = { id: 1, title: 'Test', type: MISSION_TYPE.BOUNTY_PIRATE, targetCount: 5 };
        const mission = new Mission(data);
        expect(mission.progressCount).toBe(0);
    });
});

// ============================================
// Mission Activation Tests
// ============================================

describe('Mission Activation', () => {
    let mission;

    beforeEach(() => {
        mission = new Mission({
            id: 1,
            title: 'Test Bounty',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            reward: 3000
        });
    });

    test('should have activate method', () => {
        expect(typeof mission.activate).toBe('function');
    });

    test('should change status to Active', () => {
        mission.activate();
        expect(mission.status).toBe('Active');
    });

    test('should not reactivate completed mission', () => {
        mission.status = 'Completed';
        mission.activate();
        expect(mission.status).toBe('Completed');
    });
});

// ============================================
// Mission Completion Tests
// ============================================

describe('Mission Completion', () => {
    let mission;
    let player;

    beforeEach(() => {
        mission = new Mission({
            id: 1,
            title: 'Test Bounty',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 3,
            reward: 5000
        });
        mission.status = 'Active';
        mission.progressCount = 3;
        player = createMockPlayer({ credits: 1000 });
    });

    test('should have complete method', () => {
        expect(typeof mission.complete).toBe('function');
    });

    test('should change status to Completed', () => {
        mission.complete(player);
        expect(mission.status).toBe('Completed');
    });

    test('should add reward to player', () => {
        const initialCredits = player.credits;
        mission.complete(player);
        expect(player.credits).toBe(initialCredits + 5000);
    });
});

// ============================================
// Mission Failure Tests
// ============================================

describe('Mission Failure', () => {
    let mission;

    beforeEach(() => {
        mission = new Mission({
            id: 1,
            title: 'Test Mission',
            type: MISSION_TYPE.DELIVERY_LEGAL,
            reward: 3000
        });
        mission.status = 'Active';
    });

    test('should have fail method', () => {
        expect(typeof mission.fail).toBe('function');
    });

    test('should change status to Failed', () => {
        mission.fail();
        expect(mission.status).toBe('Failed');
    });

    test('should support mission abandonment', () => {
        expect(typeof mission.abandon).toBe('function');
        mission.abandon();
        expect(mission.status).toBe('Abandoned');
    });
});

// ============================================
// Mission Progress Tests
// ============================================

describe('Mission Progress', () => {
    test('should have updateProgress method', () => {
        const mission = new Mission({
            id: 1,
            title: 'Test',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5
        });
        expect(typeof mission.updateProgress).toBe('function');

        mission.status = 'Active';
        mission.progressCount = 0;
        mission.updateProgress(1);
        expect(mission.progressCount).toBe(1);
    });

    test('should track bounty kills', () => {
        const mission = new Mission({
            id: 1,
            title: 'Bounty Hunt',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            reward: 5000
        });
        mission.status = 'Active';
        mission.progressCount = 0;

        mission.progressCount += 1;
        expect(mission.progressCount).toBe(1);

        mission.progressCount += 2;
        expect(mission.progressCount).toBe(3);
    });

    test('should check if target reached', () => {
        const mission = new Mission({
            id: 1,
            title: 'Bounty Hunt',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 3,
            reward: 5000
        });
        mission.progressCount = 3;

        expect(mission.progressCount >= mission.targetCount).toBe(true);
    });
});

// ============================================
// Delivery Mission Tests
// ============================================

describe('Delivery Missions', () => {
    test('should store cargo type', () => {
        const mission = new Mission({
            id: 1,
            title: 'Deliver Food',
            type: MISSION_TYPE.DELIVERY_LEGAL,
            cargoType: 'Food',
            cargoQuantity: 10,
            reward: 2000
        });
        expect(mission.cargoType).toBe('Food');
        expect(mission.cargoQuantity).toBe(10);
    });

    test('should store destination', () => {
        const mission = new Mission({
            id: 1,
            title: 'Deliver Food',
            type: MISSION_TYPE.DELIVERY_LEGAL,
            destinationStation: 'Alpha Station',
            destinationSystemIndex: 2,
            reward: 2000
        });
        expect(mission.destinationStation).toBe('Alpha Station');
        expect(mission.destinationSystemIndex).toBe(2);
    });
});

// ============================================
// Assassination Mission Tests
// ============================================

describe('Assassination Missions', () => {
    test('should store target name', () => {
        const mission = new Mission({
            id: 1,
            title: 'Eliminate Target',
            type: MISSION_TYPE.ASSASSINATION,
            targetName: 'Captain Vex',
            targetSystemIndex: 1,
            reward: 10000
        });
        expect(mission.targetName).toBe('Captain Vex');
    });

    test('should store target ship type', () => {
        const mission = new Mission({
            id: 1,
            title: 'Eliminate Target',
            type: MISSION_TYPE.ASSASSINATION,
            targetShipType: 'Anaconda',
            reward: 10000
        });
        expect(mission.targetShipType).toBe('Anaconda');
    });

    test('should track guards', () => {
        const mission = new Mission({
            id: 1,
            title: 'Eliminate Target',
            type: MISSION_TYPE.ASSASSINATION,
            guardCount: 2,
            reward: 10000
        });
        expect(mission.guardCount).toBe(2);
    });

    test('should store target upgrades', () => {
        const mission = new Mission({
            id: 1,
            title: 'Eliminate Target',
            type: MISSION_TYPE.ASSASSINATION,
            targetUpgrades: ['Dark Field', 'Core Dynamics Plates'],
            targetUpgradeDetails: [
                { type: 'cloak', level: 1, name: 'Dark Field' },
                { type: 'armor', level: 2, name: 'Core Dynamics Plates' }
            ],
            reward: 10000
        });
        expect(mission.targetUpgrades).toHaveLength(2);
        expect(mission.targetUpgradeDetails).toHaveLength(2);
        expect(mission.targetUpgradeDetails[0].type).toBe('cloak');
    });

    test('assassination missions should always have at least Veteran rank targets', () => {
        const galaxy = createMockGalaxy(4);
        const originSystem = galaxy.systems[0];
        const station = { name: 'Origin Station' };
        const player = createMockPlayer();

        for (let i = 0; i < 50; i++) {
            const mission = MissionGenerator.createAssassinationMission(originSystem, station, galaxy, player);
            expect(mission.targetPilotRank).toBeGreaterThanOrEqual(2); // PILOT_RANK.VETERAN = 2
        }
    });
});

// ============================================
// Mission Display Tests
// ============================================

describe('Mission Display', () => {
    let mission;

    beforeEach(() => {
        mission = new Mission({
            id: 1,
            title: 'Test Mission',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            reward: 3000,
            description: 'Hunt down pirates'
        });
    });

    test('should have getSummary method', () => {
        expect(typeof mission.getSummary).toBe('function');
    });

    test('should return summary string', () => {
        const summary = mission.getSummary();
        expect(typeof summary).toBe('string');
        expect(summary.length).toBeGreaterThan(0);
    });

    test('should have getDetails method', () => {
        expect(typeof mission.getDetails).toBe('function');
    });

    test('should return details string', () => {
        const details = mission.getDetails();
        expect(typeof details).toBe('string');
    });
});

// ============================================
// Faction Mission Type Constants
// ============================================

describe('Faction Mission Type Constants', () => {
    test('should define Imperial mission types', () => {
        expect(MISSION_TYPE.IMPERIAL_ELIMINATION).toBe('Imperial Elimination');
        expect(MISSION_TYPE.IMPERIAL_PATROL).toBe('Imperial Patrol');
        expect(MISSION_TYPE.IMPERIAL_STRIKE).toBe('Imperial Strike');
        expect(MISSION_TYPE.IMPERIAL_SABOTAGE).toBe('Imperial Sabotage');
    });

    test('should define Separatist mission types', () => {
        expect(MISSION_TYPE.SEPARATIST_RAID).toBe('Separatist Raid');
        expect(MISSION_TYPE.SEPARATIST_SUPPLY).toBe('Separatist Supply');
        expect(MISSION_TYPE.SEPARATIST_STRIKE).toBe('Separatist Strike');
        expect(MISSION_TYPE.SEPARATIST_SABOTAGE).toBe('Separatist Sabotage');
    });

    test('should define Military mission types', () => {
        expect(MISSION_TYPE.MILITARY_EXTERMINATION).toBe('Military Extermination');
        expect(MISSION_TYPE.MILITARY_DEFENSE).toBe('Military Defense');
        expect(MISSION_TYPE.MILITARY_STRIKE).toBe('Military Strike');
        expect(MISSION_TYPE.MILITARY_SABOTAGE).toBe('Military Sabotage');
    });
});

// ============================================
// Faction Mission Classification Sets
// ============================================

describe('Faction Mission Classification Sets', () => {
    test('should define FACTION_KILL_TYPES set', () => {
        expect(FACTION_KILL_TYPES).toBeDefined();
        expect(FACTION_KILL_TYPES instanceof Set).toBe(true);
    });

    test('should include kill missions in FACTION_KILL_TYPES', () => {
        expect(FACTION_KILL_TYPES.has(MISSION_TYPE.IMPERIAL_ELIMINATION)).toBe(true);
        expect(FACTION_KILL_TYPES.has(MISSION_TYPE.IMPERIAL_STRIKE)).toBe(true);
        expect(FACTION_KILL_TYPES.has(MISSION_TYPE.SEPARATIST_RAID)).toBe(true);
        expect(FACTION_KILL_TYPES.has(MISSION_TYPE.SEPARATIST_STRIKE)).toBe(true);
        expect(FACTION_KILL_TYPES.has(MISSION_TYPE.MILITARY_EXTERMINATION)).toBe(true);
        expect(FACTION_KILL_TYPES.has(MISSION_TYPE.MILITARY_STRIKE)).toBe(true);
    });

    test('should define FACTION_PATROL_TYPES set', () => {
        expect(FACTION_PATROL_TYPES).toBeDefined();
        expect(FACTION_PATROL_TYPES instanceof Set).toBe(true);
    });

    test('should include patrol missions in FACTION_PATROL_TYPES', () => {
        expect(FACTION_PATROL_TYPES.has(MISSION_TYPE.IMPERIAL_PATROL)).toBe(true);
        expect(FACTION_PATROL_TYPES.has(MISSION_TYPE.MILITARY_DEFENSE)).toBe(true);
    });

    test('should define FACTION_SABOTAGE_TYPES set', () => {
        expect(FACTION_SABOTAGE_TYPES).toBeDefined();
        expect(FACTION_SABOTAGE_TYPES instanceof Set).toBe(true);
    });

    test('should include sabotage missions in FACTION_SABOTAGE_TYPES', () => {
        expect(FACTION_SABOTAGE_TYPES.has(MISSION_TYPE.IMPERIAL_SABOTAGE)).toBe(true);
        expect(FACTION_SABOTAGE_TYPES.has(MISSION_TYPE.SEPARATIST_SABOTAGE)).toBe(true);
        expect(FACTION_SABOTAGE_TYPES.has(MISSION_TYPE.MILITARY_SABOTAGE)).toBe(true);
    });

    test('should define FACTION_DELIVERY_TYPES set', () => {
        expect(FACTION_DELIVERY_TYPES).toBeDefined();
        expect(FACTION_DELIVERY_TYPES instanceof Set).toBe(true);
    });

    test('should include supply missions in FACTION_DELIVERY_TYPES', () => {
        expect(FACTION_DELIVERY_TYPES.has(MISSION_TYPE.SEPARATIST_SUPPLY)).toBe(true);
    });

    test('should define combined type sets', () => {
        expect(ALL_KILL_TYPES).toBeDefined();
        expect(ALL_SABOTAGE_TYPES).toBeDefined();
        expect(ALL_DELIVERY_TYPES).toBeDefined();
    });

    test('ALL_KILL_TYPES should include both bounty and faction kills', () => {
        expect(ALL_KILL_TYPES.has(MISSION_TYPE.BOUNTY_PIRATE)).toBe(true);
        expect(ALL_KILL_TYPES.has(MISSION_TYPE.IMPERIAL_ELIMINATION)).toBe(true);
    });

    test('ALL_SABOTAGE_TYPES should include regular and faction sabotage', () => {
        expect(ALL_SABOTAGE_TYPES.has(MISSION_TYPE.SABOTAGE)).toBe(true);
        expect(ALL_SABOTAGE_TYPES.has(MISSION_TYPE.IMPERIAL_SABOTAGE)).toBe(true);
    });
});

// ============================================
// Faction Kill Mission Tests
// ============================================

describe('Faction Kill Missions', () => {
    test('should create Imperial Elimination mission', () => {
        const mission = new Mission({
            id: 100,
            title: 'Imperial Order: Eliminate 3 Separatist Vessels',
            type: MISSION_TYPE.IMPERIAL_ELIMINATION,
            targetCount: 3,
            rewardCredits: 5000,
            requiredFaction: 'IMPERIAL'
        });
        expect(mission.type).toBe(MISSION_TYPE.IMPERIAL_ELIMINATION);
        expect(mission.targetCount).toBe(3);
        expect(FACTION_KILL_TYPES.has(mission.type)).toBe(true);
    });

    test('should track kill progress for faction missions', () => {
        const mission = new Mission({
            id: 101,
            title: 'Separatist Raid',
            type: MISSION_TYPE.SEPARATIST_RAID,
            targetCount: 2,
            rewardCredits: 4000
        });
        mission.status = 'Active';
        mission.progressCount = 0;

        mission.progressCount += 1;
        expect(mission.progressCount).toBe(1);

        mission.progressCount += 1;
        expect(mission.progressCount).toBe(2);
        expect(mission.progressCount >= mission.targetCount).toBe(true);
    });

    test('should complete Military Extermination when target met', () => {
        const mission = new Mission({
            id: 102,
            title: 'Military Extermination',
            type: MISSION_TYPE.MILITARY_EXTERMINATION,
            targetCount: 3,
            rewardCredits: 6000
        });
        mission.status = 'Active';
        mission.progressCount = 3;

        const player = createMockPlayer({ credits: 1000 });
        mission.complete(player);

        expect(mission.status).toBe('Completed');
        expect(player.credits).toBe(7000);
    });

    test('should check isCompletable for faction kill missions', () => {
        const mission = new Mission({
            id: 103,
            title: 'Imperial Strike',
            type: MISSION_TYPE.IMPERIAL_STRIKE,
            targetCount: 4,
            rewardCredits: 8000
        });
        mission.status = 'Active';
        mission.progressCount = 2;

        expect(mission.isCompletable()).toBe(false);

        mission.progressCount = 4;
        expect(mission.isCompletable()).toBe(true);
    });
});

// ============================================
// Faction Patrol Mission Tests
// ============================================

describe('Faction Patrol Missions', () => {
    test('should create Imperial Patrol mission', () => {
        const mission = new Mission({
            id: 200,
            title: 'Imperial Patrol: Scan 4 Vessels',
            type: MISSION_TYPE.IMPERIAL_PATROL,
            targetCount: 4,
            rewardCredits: 2000,
            requiredFaction: 'IMPERIAL'
        });
        expect(mission.type).toBe(MISSION_TYPE.IMPERIAL_PATROL);
        expect(mission.targetCount).toBe(4);
        expect(FACTION_PATROL_TYPES.has(mission.type)).toBe(true);
    });

    test('should create Military Defense mission', () => {
        const mission = new Mission({
            id: 201,
            title: 'Military Defense: Scan 3 Vessels',
            type: MISSION_TYPE.MILITARY_DEFENSE,
            targetCount: 3,
            rewardCredits: 1800
        });
        expect(mission.type).toBe(MISSION_TYPE.MILITARY_DEFENSE);
        expect(FACTION_PATROL_TYPES.has(mission.type)).toBe(true);
    });
});

// ============================================
// Faction Sabotage Mission Tests
// ============================================

describe('Faction Sabotage Missions', () => {
    test('should create Imperial Sabotage mission', () => {
        const mission = new Mission({
            id: 300,
            title: 'Imperial Sabotage: Destroy Comm Relay',
            type: MISSION_TYPE.IMPERIAL_SABOTAGE,
            rewardCredits: 8000,
            targetObjectType: 'Comm Relay',
            destinationSystem: 'Rebel System'
        });
        expect(mission.type).toBe(MISSION_TYPE.IMPERIAL_SABOTAGE);
        expect(FACTION_SABOTAGE_TYPES.has(mission.type)).toBe(true);
    });

    test('should complete faction sabotage when target destroyed', () => {
        const mission = new Mission({
            id: 301,
            title: 'Separatist Sabotage',
            type: MISSION_TYPE.SEPARATIST_SABOTAGE,
            rewardCredits: 7500,
            targetObjectType: 'Supply Depot'
        });
        mission.status = 'Active';
        mission.progressCount = 1;

        const player = createMockPlayer({ credits: 500 });
        mission.complete(player);

        expect(mission.status).toBe('Completed');
        expect(player.credits).toBe(8000);
    });

    test('should generate backstory for faction sabotage missions', () => {
        const mission = new Mission({
            id: 302,
            title: 'Military Sabotage',
            type: MISSION_TYPE.MILITARY_SABOTAGE,
            targetObjectType: 'Alien Artifact',
            offeringFaction: 'Military Command'
        });

        expect(mission.description).toBeTruthy();
        expect(mission.description.length).toBeGreaterThan(0);
    });
});

// ============================================
// Faction Delivery/Supply Mission Tests
// ============================================

describe('Faction Delivery Missions', () => {
    test('should create Separatist Supply mission', () => {
        const mission = new Mission({
            id: 400,
            title: 'Separatist Supply Run',
            type: MISSION_TYPE.SEPARATIST_SUPPLY,
            cargoType: 'Weapons',
            cargoQuantity: 10,
            rewardCredits: 5000,
            destinationSystem: 'Rebel Base'
        });
        expect(mission.type).toBe(MISSION_TYPE.SEPARATIST_SUPPLY);
        expect(mission.cargoType).toBe('Weapons');
        expect(FACTION_DELIVERY_TYPES.has(mission.type)).toBe(true);
    });

    test('should store cargo requirements', () => {
        const mission = new Mission({
            id: 401,
            title: 'Supply Mission',
            type: MISSION_TYPE.SEPARATIST_SUPPLY,
            cargoType: 'Medical Supplies',
            cargoQuantity: 15,
            rewardCredits: 4000
        });
        expect(mission.cargoType).toBe('Medical Supplies');
        expect(mission.cargoQuantity).toBe(15);
    });
});

// ============================================
// Faction Kill Mission Location Tests
// ============================================

describe('Faction Kill Mission Locations', () => {
    test('IMPERIAL_ELIMINATION should allow completion anywhere', () => {
        const mission = new Mission({
            id: 600,
            title: 'Imperial Order: Eliminate 3 Separatist Vessels',
            type: MISSION_TYPE.IMPERIAL_ELIMINATION,
            targetCount: 3,
            rewardCredits: 5000,
            destinationSystem: null,
            destinationStation: null
        });
        expect(mission.destinationSystem).toBeNull();
        expect(FACTION_KILL_TYPES.has(mission.type)).toBe(true);
    });

    test('SEPARATIST_RAID should allow completion anywhere', () => {
        const mission = new Mission({
            id: 601,
            title: 'Freedom Strike: Destroy 2 Imperial Ships',
            type: MISSION_TYPE.SEPARATIST_RAID,
            targetCount: 2,
            rewardCredits: 4000,
            destinationSystem: null,
            destinationStation: null
        });
        expect(mission.destinationSystem).toBeNull();
        expect(FACTION_KILL_TYPES.has(mission.type)).toBe(true);
    });

    test('IMPERIAL_STRIKE should specify destination system', () => {
        const mission = new Mission({
            id: 603,
            title: 'Imperial Strike: Assault Rebel Sector',
            type: MISSION_TYPE.IMPERIAL_STRIKE,
            targetCount: 4,
            rewardCredits: 8000,
            destinationSystem: 'Rebel Sector'
        });
        expect(mission.destinationSystem).toBe('Rebel Sector');
        expect(FACTION_KILL_TYPES.has(mission.type)).toBe(true);
    });
});

// ============================================
// Mission Serialization Tests
// ============================================

describe('Mission Serialization', () => {
    test('should have toJSON method', () => {
        const mission = new Mission({
            id: 1,
            title: 'Test Mission',
            type: MISSION_TYPE.BOUNTY_PIRATE
        });
        expect(typeof mission.toJSON).toBe('function');
    });

    test('should serialize basic properties', () => {
        const mission = new Mission({
            id: 12345,
            title: 'Test Bounty',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            rewardCredits: 3000
        });
        const json = mission.toJSON();
        expect(json.id).toBe(12345);
        expect(json.title).toBe('Test Bounty');
        expect(json.type).toBe(MISSION_TYPE.BOUNTY_PIRATE);
    });

    test('should serialize target upgrades', () => {
        const mission = new Mission({
            id: 1,
            title: 'Assassination',
            type: MISSION_TYPE.ASSASSINATION,
            targetUpgrades: ['Stealth Field Mark I'],
            targetUpgradeDetails: [{ type: 'cloak', level: 1, name: 'Stealth Field Mark I' }]
        });
        const json = mission.toJSON();
        expect(json.targetUpgrades).toEqual(['Stealth Field Mark I']);
        expect(json.targetUpgradeDetails).toEqual([{ type: 'cloak', level: 1, name: 'Stealth Field Mark I' }]);
    });

    test('should round-trip serialization', () => {
        const mission = new Mission({
            id: 999,
            title: 'Round Trip Test',
            type: MISSION_TYPE.ASSASSINATION,
            targetName: 'Captain Vex',
            targetUpgrades: ['Shadow Matrix'],
            targetUpgradeDetails: [{ type: 'cloak', level: 2, name: 'Shadow Matrix' }],
            rewardCredits: 10000
        });
        mission.status = 'Active';
        mission.progressCount = 1;

        const json = mission.toJSON();
        const restored = Mission.fromJSON(json);

        expect(restored.id).toBe(999);
        expect(restored.status).toBe('Active');
        expect(restored.progressCount).toBe(1);
        expect(restored.targetName).toBe('Captain Vex');
        expect(restored.targetUpgrades).toEqual(['Shadow Matrix']);
    });

    test('should serialize faction mission properties', () => {
        const mission = new Mission({
            id: 1000,
            title: 'Imperial Patrol',
            type: MISSION_TYPE.IMPERIAL_PATROL,
            requiredFaction: 'IMPERIAL',
            prestigeReward: 3,
            rewardCredits: 2000
        });

        const json = mission.toJSON();
        expect(json.requiredFaction).toBe('IMPERIAL');
        expect(json.prestigeReward).toBe(3);
    });
});

// ============================================
// Mission Progress State Transitions (Advanced)
// ============================================

describe('Mission Progress State Transitions', () => {
    test('should transition to Completable when target reached', () => {
        const mission = new Mission({
            id: 1,
            title: 'Bounty Hunt',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 3,
            rewardCredits: 5000
        });
        mission.status = 'Active';
        mission.progressCount = 0;

        mission.updateProgress(1);
        expect(mission.status).toBe('Active');
        expect(mission.progressCount).toBe(1);

        mission.updateProgress(2);
        expect(mission.status).toBe('Completable');
        expect(mission.progressCount).toBe(3);
    });

    test('should not update progress when not active', () => {
        const mission = new Mission({
            id: 1,
            title: 'Test',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            rewardCredits: 3000
        });
        mission.status = 'Available';
        mission.progressCount = 0;

        mission.updateProgress(2);
        expect(mission.progressCount).toBe(0);
    });

    test('should handle progress exceeding target', () => {
        const mission = new Mission({
            id: 1,
            title: 'Excessive Kills',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 3,
            rewardCredits: 3000
        });
        mission.status = 'Active';
        mission.progressCount = 0;

        mission.updateProgress(5);
        expect(mission.progressCount).toBe(5);
        expect(mission.status).toBe('Completable');
    });
});

// ============================================
// Delivery Mission Activation (Advanced)
// ============================================

describe('Delivery Mission Activation', () => {
    let player, mission;

    beforeEach(() => {
        player = createMockPlayer({ credits: 5000, cargoCapacity: 50, cargo: [] });
        global.player = player; // Make player globally available for activation

        mission = new Mission({
            id: 1,
            title: 'Deliver Food',
            type: MISSION_TYPE.DELIVERY_LEGAL,
            cargoType: 'Food',
            cargoQuantity: 10,
            rewardCredits: 2000
        });
    });

    afterEach(() => {
        delete global.player;
    });

    test('should load cargo on activation', () => {
        const result = mission.activate();
        expect(result).toBe(true);
        expect(mission.status).toBe('Active');
        expect(player.cargo).toHaveLength(1);
        expect(player.cargo[0].name).toBe('Food');
        expect(player.cargo[0].quantity).toBe(10);
    });

    test('should stack cargo with existing items', () => {
        player.cargo = [{ name: 'Food', quantity: 5 }];

        mission.activate();
        expect(player.cargo).toHaveLength(1);
        expect(player.cargo[0].quantity).toBe(15);
    });

    test('should reject activation if insufficient cargo space', () => {
        player.cargoCapacity = 50;
        player.cargo = [{ name: 'Metals', quantity: 45 }]; // 45t used, only 5t free

        const result = mission.activate();
        expect(result).toBe(false);
        expect(mission.status).toBe('Available');
        expect(player.hasCargo('Food', 1)).toBe(false);
    });

    test('should not reactivate delivery mission twice', () => {
        mission.activate();
        expect(player.cargo[0].quantity).toBe(10);

        const result2 = mission.activate();
        expect(result2).toBe(false);
        expect(player.cargo[0].quantity).toBe(10); // Should not double-load
    });

    test('should handle delivery with zero quantity gracefully', () => {
        mission.cargoQuantity = 0;
        const result = mission.activate();
        expect(result).toBe(true); // Should activate but not add cargo
        expect(player.cargo).toHaveLength(0);
    });
});

// ============================================
// Mission Completion Rewards (Advanced)
// ============================================

describe('Mission Completion Rewards', () => {
    test('should add integer credits only', () => {
        const mission = new Mission({
            id: 1,
            title: 'Test',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            rewardCredits: 2500.75 // Non-integer reward
        });
        mission.status = 'Active';
        const player = createMockPlayer({ credits: 1000 });

        mission.complete(player);
        expect(player.credits).toBe(3500); // Should floor to 3500 (1000 + 2500)
    });

    test('should not complete mission without valid player', () => {
        const mission = new Mission({
            id: 1,
            title: 'Test',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            rewardCredits: 5000
        });
        mission.status = 'Active';

        mission.complete(null);
        expect(mission.status).toBe('Active'); // Should remain active
    });

    test('should handle prestige rewards for faction missions', () => {
        const mission = new Mission({
            id: 1,
            title: 'Imperial Elimination',
            type: MISSION_TYPE.IMPERIAL_ELIMINATION,
            rewardCredits: 5000,
            prestigeReward: 3
        });
        expect(mission.prestigeReward).toBe(3);
        expect(mission.getSummary()).toContain('+3★');
    });
});

// ============================================
// Mission Display Logic (Advanced)
// ============================================

describe('Mission Display Logic', () => {
    test('should show progress in summary for active bounty missions', () => {
        const mission = new Mission({
            id: 1,
            title: 'Hunt Pirates',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            rewardCredits: 3000
        });
        mission.status = 'Active';
        mission.progressCount = 2;

        const summary = mission.getSummary();
        expect(summary).toContain('(2/5)');
    });

    test('should not show progress for non-bounty missions', () => {
        const mission = new Mission({
            id: 1,
            title: 'Deliver Cargo',
            type: MISSION_TYPE.DELIVERY_LEGAL,
            rewardCredits: 2000
        });
        mission.status = 'Active';
        mission.progressCount = 1;

        const summary = mission.getSummary();
        expect(summary).not.toContain('(');
    });

    test('should show completion status prefix', () => {
        const mission = new Mission({
            id: 1,
            title: 'Test Mission',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            rewardCredits: 3000
        });
        mission.status = 'Completed';

        const summary = mission.getSummary();
        expect(summary).toContain('[COMPLETED]');
    });

    test('should show failed status prefix', () => {
        const mission = new Mission({
            id: 1,
            title: 'Failed Mission',
            type: MISSION_TYPE.ASSASSINATION,
            rewardCredits: 10000
        });
        mission.status = 'Failed';

        const summary = mission.getSummary();
        expect(summary).toContain('[FAILED]');
    });

    test('should include illegal warning in details', () => {
        const mission = new Mission({
            id: 1,
            title: 'Smuggle Goods',
            type: MISSION_TYPE.DELIVERY_ILLEGAL,
            isIllegal: true,
            rewardCredits: 5000
        });

        const details = mission.getDetails();
        expect(details).toContain('illegal activity');
    });

    test('should show progress for faction kill missions', () => {
        const mission = new Mission({
            id: 1,
            title: 'Imperial Elimination',
            type: MISSION_TYPE.IMPERIAL_ELIMINATION,
            targetCount: 3,
            rewardCredits: 5000
        });
        mission.status = 'Active';
        mission.progressCount = 1;

        const summary = mission.getSummary();
        expect(summary).toContain('(1/3)');
    });

    test('should include progress in details for multi-target missions', () => {
        const mission = new Mission({
            id: 2,
            title: 'Pirate Hunt',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5,
            rewardCredits: 1000
        });
        mission.status = 'Active';
        mission.progressCount = 2;

        const details = mission.getDetails();
        expect(details).toContain('Progress: 2/5');
    });
});

// ============================================
// Sabotage Mission Backstory (Advanced)
// ============================================

describe('Sabotage Mission Backstory', () => {
    test('should generate backstory for sabotage missions', () => {
        const mission = new Mission({
            id: 1,
            title: 'Destroy Relay',
            type: MISSION_TYPE.SABOTAGE,
            targetObjectType: 'Comm Relay',
            targetPlanetName: 'Hades II',
            offeringFaction: 'Separatist Movement',
            destinationSystem: 'Imperial Sector'
        });

        expect(mission.description).toBeTruthy();
        expect(mission.description.length).toBeGreaterThan(50);
        expect(mission.description).toContain('Comm Relay');
    });

    test('should not override provided description for sabotage', () => {
        const customDesc = 'Custom sabotage description for testing';
        const mission = new Mission({
            id: 1,
            title: 'Sabotage',
            type: MISSION_TYPE.SABOTAGE,
            description: customDesc,
            targetObjectType: 'Beacon',
            rewardCredits: 8000
        });

        expect(mission.description).toBe(customDesc);
    });
});

// ============================================
// Edge Cases and Boundary Conditions
// ============================================

describe('Edge Cases and Boundary Conditions', () => {
    test('should handle mission with null destination (anywhere missions)', () => {
        const mission = new Mission({
            id: 1,
            title: 'Hunt Anywhere',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 3,
            destinationSystem: null,
            destinationStation: null,
            rewardCredits: 3000
        });

        expect(mission.destinationSystem).toBeNull();
        expect(mission.destinationStation).toBeNull();
    });

    test('should preserve explicit null values with nullish coalescing', () => {
        const mission = new Mission({
            destinationSystem: null,
            destinationStation: null
        });

        expect(mission.destinationSystem).toBeNull();
        expect(mission.destinationStation).toBeNull();
    });

    test('should auto-increment mission ID if not provided', () => {
        const startId = Mission.nextId;
        const mission1 = new Mission({ title: 'First' });
        const mission2 = new Mission({ title: 'Second' });

        expect(mission1.id).toBe(startId);
        expect(mission2.id).toBe(startId + 1);
    });

    test('should handle zero reward gracefully', () => {
        const mission = new Mission({
            id: 1,
            title: 'Free Mission',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            rewardCredits: 0
        });
        const player = createMockPlayer({ credits: 1000 });
        mission.status = 'Active';

        mission.complete(player);
        expect(player.credits).toBe(1000);
        expect(mission.status).toBe('Completed');
    });

    test('should handle mission abandonment from any state', () => {
        const mission = new Mission({
            id: 1,
            title: 'Abandoned',
            type: MISSION_TYPE.DELIVERY_LEGAL,
            rewardCredits: 2000
        });

        mission.status = 'Available';
        mission.abandon();
        expect(mission.status).toBe('Abandoned');
    });

    test('should stringify large rewards correctly', () => {
        const mission = new Mission({
            id: 1,
            title: 'Big Reward',
            type: MISSION_TYPE.ASSASSINATION,
            rewardCredits: 999999
        });

        const summary = mission.getSummary();
        expect(summary).toContain('999999cr');
    });
});

// ============================================
// MissionGenerator Core Helper Tests
// ============================================

describe('MissionGenerator Core Helpers', () => {
    test('should have getJumpDistance method', () => {
        expect(typeof MissionGenerator.getJumpDistance).toBe('function');
    });

    test('should calculate jump distance between systems', () => {
        const galaxy = createMockGalaxy(4);
        const origin = galaxy.systems[0];
        const dest = galaxy.systems[2];

        const distance = MissionGenerator.getJumpDistance(origin, dest, galaxy);
        expect(distance).toBe(2);
    });

    test('should return Infinity for invalid systems', () => {
        const galaxy = createMockGalaxy(4);
        const distance = MissionGenerator.getJumpDistance(null, galaxy.systems[0], galaxy);
        expect(distance).toBe(Infinity);
    });

    test('should format jump text correctly', () => {
        expect(MissionGenerator.formatJumpText(1)).toBe('1 jump');
        expect(MissionGenerator.formatJumpText(3)).toBe('3 jumps');
    });

    test('should validate jump distance', () => {
        expect(MissionGenerator.isValidJumpDistance(2)).toBe(true);
        expect(MissionGenerator.isValidJumpDistance(0)).toBe(false);
        expect(MissionGenerator.isValidJumpDistance(Infinity)).toBe(false);
    });

    test('should select combat ship', () => {
        const ship = MissionGenerator.selectCombatShip();
        expect(typeof ship).toBe('string');
        expect(ship.length).toBeGreaterThan(0);
    });

    test('should select guard ship', () => {
        const ship = MissionGenerator.selectGuardShip();
        expect(typeof ship).toBe('string');
        expect(ship.length).toBeGreaterThan(0);
    });

    test('should extract origin data', () => {
        const system = createMockSystem({ name: 'Origin System' });
        system.station = { name: 'Origin Station' };
        const originData = MissionGenerator.getOriginData(system, system.station);

        expect(originData.originSystem).toBe('Origin System');
        expect(originData.originStation).toBe('Origin Station');
    });

    test('should calculate bounty reward', () => {
        const system = createMockSystem({ techLevel: 5, securityLevel: 'Medium' });
        const reward = MissionGenerator.calculateBountyReward(3, 300, system);

        expect(reward).toBeGreaterThan(0);
        expect(reward).toBeGreaterThanOrEqual(100);
    });

    test('should calculate faction reward with rank multiplier', () => {
        const baseReward = 1500;
        const reward = MissionGenerator.calculateFactionReward(baseReward, 5, 1.2, 500, 1500);

        expect(reward).toBeGreaterThan(baseReward);
    });
});

// ============================================
// MissionGenerator Mission Creation Tests
// ============================================

describe('MissionGenerator Mission Creation', () => {
    let system, station, galaxy, player;

    beforeEach(() => {
        galaxy = createMockGalaxy(4);
        system = galaxy.systems[0];
        station = system.station;
        player = createMockPlayer();
    });

    test('should have generateMissions method', () => {
        expect(typeof MissionGenerator.generateMissions).toBe('function');
    });

    test('should return empty array for missing arguments', () => {
        const missions = MissionGenerator.generateMissions(null, null, null, null);
        expect(missions).toEqual([]);
    });

    test('should create bounty mission', () => {
        const mission = MissionGenerator.createBountyMission(system, station, galaxy, player);

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.BOUNTY_PIRATE);
        expect(mission.targetCount).toBeGreaterThan(0);
        expect(mission.rewardCredits).toBeGreaterThan(0);
    });

    test('should create cop killer mission', () => {
        const mission = MissionGenerator.createCopKillerMission(system, station, galaxy, player);

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.BOUNTY_POLICE);
        expect(mission.isIllegal).toBe(true);
    });

    test('should create alien bounty mission', () => {
        const mission = MissionGenerator.createAlienBountyMission(system, station, galaxy, player);

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.BOUNTY_ALIEN);
        expect(mission.isIllegal).toBe(false);
    });

    test('should create assassination mission with upgrades and mention them', () => {
        const mission = MissionGenerator.createAssassinationMission(system, station, galaxy, player);

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.ASSASSINATION);
        expect(mission.targetUpgrades).toBeDefined();
        expect(Array.isArray(mission.targetUpgrades)).toBe(true);

        if (mission.targetUpgrades.length > 0) {
            // Check description mentions upgrades
            expect(mission.description).toMatch(/Intel suggests the vessel is equipped with/);
            // Check details mentions upgrades
            const details = mission.getDetails();
            expect(details).toMatch(/Estimated Upgrades:/);
        }
    });

    test('should create standard sabotage mission', () => {
        const mission = MissionGenerator.createSabotageMission(system, station, galaxy, player);

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.SABOTAGE);
        expect(mission.targetObjectId).toBeDefined();
        expect(mission.destinationSystem).toBeDefined();
        // Should have backstory generated
        expect(mission.description).toBeTruthy();
    });

    test('should create special cargo sale missions for non-standard cargo', () => {
        player.cargo = [
            { name: 'Alien Artifact', quantity: 1 },
            { name: 'Rare Ore', quantity: 2 },
            { name: 'Food', quantity: 4 }
        ];

        const missions = MissionGenerator.generateMissions(system, station, galaxy, player);
        const specialSaleMissions = missions.filter(m => m.type === MISSION_TYPE.SPECIAL_CARGO_SALE);

        expect(specialSaleMissions.length).toBe(2);

        const cargoTypes = specialSaleMissions.map(m => m.cargoType);
        expect(cargoTypes).toContain('Alien Artifact');
        expect(cargoTypes).toContain('Rare Ore');
    });

    test('should not create special cargo sale missions for standard market cargo', () => {
        player.cargo = [
            { name: 'Food', quantity: 5 },
            { name: 'Textiles', quantity: 3 },
            { name: 'Narcotics', quantity: 1 }
        ];

        const missions = MissionGenerator.generateMissions(system, station, galaxy, player);
        const specialSaleMissions = missions.filter(m => m.type === MISSION_TYPE.SPECIAL_CARGO_SALE);

        expect(specialSaleMissions.length).toBe(0);
    });
});

// ============================================
// MissionGenerator Destination Finding Tests
// ============================================

describe('MissionGenerator Destination Finding', () => {
    test('should find nearby destination', () => {
        const galaxy = createMockGalaxy(4);
        const origin = galaxy.systems[0];

        const dest = MissionGenerator.findNearbyDestination(origin, galaxy, true, 4);

        expect(dest).not.toBeNull();
        expect(dest.system).toBeDefined();
    });

    test('should return null for isolated system', () => {
        const galaxy = createMockGalaxy(1);
        galaxy.systems[0].connectedSystemIndices = [];

        const dest = MissionGenerator.findNearbyDestination(galaxy.systems[0], galaxy, true, 4);

        expect(dest).toBeNull();
    });
});

// ============================================
// MissionGenerator Faction Mission Tests
// ============================================

describe('MissionGenerator Faction Missions', () => {
    let system, station, galaxy, player;

    beforeEach(() => {
        galaxy = createMockGalaxy(4);
        system = galaxy.systems[0];
        player = createMockPlayer({ playerFaction: 'IMPERIAL' });
    });

    test('should identify station faction from subtype', () => {
        expect(MissionGenerator._getStationFaction('secret_military')).toBe('MILITARY');
        expect(MissionGenerator._getStationFaction('secret_separatist')).toBe('SEPARATIST');
        expect(MissionGenerator._getStationFaction('secret_imperial')).toBe('IMPERIAL');
        expect(MissionGenerator._getStationFaction('secret_police')).toBe('POLICE');
        expect(MissionGenerator._getStationFaction('secret_generic')).toBeNull();
    });

    test('should generate Imperial faction mission', () => {
        station = createMockSecretStation('Imperial');
        player.playerFaction = 'IMPERIAL';

        const context = { originSystem: system, originStation: station, galaxy, player };
        const mission = MissionGenerator._generateFactionMission('IMPERIAL', context);

        expect(mission).toBeDefined();
        expect(mission.type).toMatch(/^Imperial/);
    });

    test('should generate Separatist faction mission', () => {
        station = createMockSecretStation('Separatist');
        player.playerFaction = 'SEPARATIST';

        const context = { originSystem: system, originStation: station, galaxy, player };
        const mission = MissionGenerator._generateFactionMission('SEPARATIST', context);

        expect(mission).toBeDefined();
        expect(mission.type).toMatch(/^Separatist/);
    });

    test('should generate Military faction mission', () => {
        station = createMockSecretStation('Military');
        player.playerFaction = 'MILITARY';

        const context = { originSystem: system, originStation: station, galaxy, player };
        const mission = MissionGenerator._generateFactionMission('MILITARY', context);

        expect(mission).toBeDefined();
        expect(mission.type).toMatch(/^Military/);
    });

    test('should return empty array for non-member at secret base', () => {
        station = createMockSecretStation('Imperial');
        player.playerFaction = 'SEPARATIST'; // Wrong faction

        const missions = MissionGenerator.generateMissions(system, station, galaxy, player);

        expect(missions).toEqual([]);
    });

    test('should generate faction missions for member at secret base', () => {
        station = createMockSecretStation('Imperial');
        player.playerFaction = 'IMPERIAL';

        const missions = MissionGenerator.generateMissions(system, station, galaxy, player);

        expect(missions.length).toBeGreaterThan(0);
        missions.forEach(m => {
            expect(m.type).toMatch(/^Imperial/);
        });
    });

    test('should apply rank multiplier to faction rewards', () => {
        player.getFactionRank = () => 5; // High rank
        station = createMockSecretStation('Imperial');
        player.playerFaction = 'IMPERIAL';

        const context = { originSystem: system, originStation: station, galaxy, player };
        const mission = MissionGenerator._generateFactionMission('IMPERIAL', context);

        expect(mission.rewardCredits).toBeGreaterThan(0);
    });
});

// ============================================
// MissionGenerator Probability Tests
// ============================================

describe('MissionGenerator Probability Calculations', () => {
    test('should adjust probabilities for High security', () => {
        const baseProbs = { legal: 0.45, bounty: 0.35, illegal: 0.15, alienBounty: 0.2, sabotage: 0.06, other: 0.05 };
        const adjusted = MissionGenerator._applySecurityModifiers(baseProbs, 'High');

        expect(adjusted.bounty).toBeLessThan(baseProbs.bounty);
        expect(adjusted.illegal).toBeLessThan(baseProbs.illegal);
        expect(adjusted.legal).toBeGreaterThan(baseProbs.legal);
    });

    test('should adjust probabilities for Anarchy security', () => {
        const baseProbs = { legal: 0.45, bounty: 0.35, illegal: 0.15, alienBounty: 0.2, sabotage: 0.06, other: 0.05 };
        const adjusted = MissionGenerator._applySecurityModifiers(baseProbs, 'Anarchy');

        expect(adjusted.bounty).toBeGreaterThan(baseProbs.bounty);
        expect(adjusted.illegal).toBeGreaterThan(baseProbs.illegal);
        expect(adjusted.legal).toBeLessThan(baseProbs.legal);
    });

    test('should adjust probabilities for Military economy', () => {
        const baseProbs = { legal: 0.45, bounty: 0.35, illegal: 0.15, alienBounty: 0.2, sabotage: 0.06, other: 0.05 };
        const adjusted = MissionGenerator._applyEconomyModifiers(baseProbs, 'Military');

        expect(adjusted.alienBounty).toBeGreaterThan(baseProbs.alienBounty);
    });

    test('should normalize probabilities to sum to ~1', () => {
        const probs = { legal: 0.5, bounty: 0.3, illegal: 0.2, alienBounty: 0.1, sabotage: 0.05, other: 0.02 };
        const normalized = MissionGenerator._normalizeProbabilities(probs);

        const sum = Object.values(normalized).reduce((a, b) => a + b, 0);
        expect(sum).toBeCloseTo(1.0, 5);
    });
});

// ============================================
// MissionGenerator Faction Helper Methods (DRY)
// ============================================

describe('MissionGenerator Faction Helper Methods', () => {
    let system, station, galaxy;

    beforeEach(() => {
        galaxy = createMockGalaxy(4);
        system = galaxy.systems[0];
        station = { name: 'Test Station' };
    });

    test('should create faction kill mission with correct structure', () => {
        const mission = MissionGenerator._createFactionKillMission(
            MISSION_TYPE.IMPERIAL_ELIMINATION,
            'Imperial Order',
            'Separatist',
            system, station, galaxy, 1.0,
            { baseReward: 1500, prestigeReward: 3, targetMin: 2, targetMax: 4 }
        );

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.IMPERIAL_ELIMINATION);
        expect(mission.targetCount).toBeGreaterThanOrEqual(2);
        expect(mission.targetCount).toBeLessThanOrEqual(4);
        expect(mission.prestigeReward).toBe(3);
    });

    test('should create faction patrol mission with correct structure', () => {
        const mission = MissionGenerator._createFactionPatrolMission(
            MISSION_TYPE.IMPERIAL_PATROL,
            'Imperial Patrol',
            system, station, galaxy, 1.0,
            { baseReward: 800, prestigeReward: 1, targetMin: 2, targetMax: 5 }
        );

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.IMPERIAL_PATROL);
        expect(mission.targetCount).toBeGreaterThanOrEqual(2);
        expect(mission.prestigeReward).toBe(1);
    });

    test('should create faction strike mission with destination', () => {
        const mission = MissionGenerator._createFactionStrikeMission(
            MISSION_TYPE.IMPERIAL_STRIKE,
            'Imperial Strike',
            'rebel forces',
            system, station, galaxy, 1.0,
            { baseReward: 3000, prestigeReward: 4, targetMin: 3, targetMax: 6 }
        );

        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.IMPERIAL_STRIKE);
        expect(mission.destinationSystem).toBeDefined();
        expect(mission.prestigeReward).toBe(4);
    });

    test('should create faction sabotage mission', () => {
        const mission = MissionGenerator._createFactionSabotageMission(
            MISSION_TYPE.IMPERIAL_SABOTAGE,
            'Imperial',
            ['Comm Relay', 'Supply Depot'],
            system, station, galaxy, 1.0,
            { baseReward: 4000, prestigeReward: 5 }
        );

        expect(mission).toBeDefined();
        expect(mission.targetObjectType).toBeDefined();
        expect(mission.prestigeReward).toBe(5);
    });

    test('should create faction supply mission', () => {
        const mission = MissionGenerator._createFactionSupplyMission(
            MISSION_TYPE.SEPARATIST_SUPPLY,
            system, station, galaxy, 1.0,
            { baseReward: 600, prestigeReward: 2 }
        );

        expect(mission).toBeDefined();
        expect(mission.cargoType).toBeDefined();
        expect(mission.cargoQuantity).toBeGreaterThan(0);
    });
});

// ============================================
// Mission Completion Logic (Advanced)
// ============================================

describe('Mission Completion Logic (Advanced)', () => {
    let player, system, galaxy;

    beforeEach(() => {
        player = createMockPlayer();
        global.player = player;

        galaxy = createMockGalaxy(4);
        global.galaxy = galaxy;
        system = galaxy.systems[0];
    });

    afterEach(() => {
        delete global.player;
        delete global.galaxy;
    });

    test('should auto-complete sabotage mission when target object is destroyed', () => {
        const mission = new Mission({
            id: 801,
            title: 'Sabotage Reactor',
            type: MISSION_TYPE.SABOTAGE,
            targetObjectId: 'reactor_123',
            rewardCredits: 5000
        });
        mission.status = 'Active';

        // Mock target object in system
        const reactor = { id: 'reactor_123', destroyed: false };
        system.spaceObjects = [reactor];

        // First update: Object exists, not destroyed
        mission.update(system);
        expect(mission.status).toBe('Active');

        // Destroy object
        reactor.destroyed = true;

        // Second update: Object destroyed -> Mission should complete
        // Force update by bypassing throttle
        mission._lastUpdateTime = 0;
        mission.update(system);

        expect(mission.status).toBe('Completed');
        expect(player.credits).toBe(10000); // 5000 initial + 5000 reward
    });

    test('should detect valid kill mission completion state', () => {
        const mission = new Mission({
            id: 802,
            title: 'Kill Pirates',
            type: MISSION_TYPE.BOUNTY_PIRATE,
            targetCount: 5
        });
        mission.status = 'Active';
        mission.progressCount = 4;

        expect(mission.isCompletable()).toBe(false);

        mission.updateProgress(1); // progress -> 5
        expect(mission.isCompletable()).toBe(true);
    });

    test('should auto-complete sabotage if target not found (assumed destroyed)', () => {
        const mission = new Mission({
            id: 803,
            title: 'Destroy Missing Target',
            type: MISSION_TYPE.SABOTAGE,
            targetObjectId: 'ghost_target',
            rewardCredits: 3000
        });
        mission.status = 'Active';
        mission.destinationSystemIndex = system.index;
        system.spaceObjects = []; // Empty system

        // Force update
        mission._lastUpdateTime = 0;
        mission.update(system);

        expect(mission.status).toBe('Completed');
    });
});
