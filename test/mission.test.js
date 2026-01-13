/**
 * Mission Tests
 * Jest tests for Mission and MissionGenerator: creation, lifecycle, progress tracking, and completion.
 */

// Load source files
require('../mission.js');

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
            return item && item.quantity >= qty;
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
        station: options.station || { name: 'Test Station', pos: createVector(500, 500) }
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
            targetUpgrades: ['Stealth Field Mark I', 'Core Dynamics Reactive Plates'],
            targetUpgradeDetails: [
                { type: 'cloak', level: 1, name: 'Stealth Field Mark I' },
                { type: 'armor', level: 2, name: 'Core Dynamics Reactive Plates' }
            ],
            reward: 10000
        });
        expect(mission.targetUpgrades).toHaveLength(2);
        expect(mission.targetUpgradeDetails).toHaveLength(2);
        expect(mission.targetUpgradeDetails[0].type).toBe('cloak');
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
});
