/**
 * Mission Types Handler Tests
 * Jest tests for the modular mission type handler architecture
 */

// ============================================
// Load source files
// ============================================

// Load base classes first
require('../missionTypes/MissionTypeHandler.js');
require('../missionTypes/MissionTypeRegistry.js');
require('../missionTypes/FactionMissionHandler.js');

// Load Mission class
require('../mission.js');

// Load concrete handlers
require('../missionTypes/DeliveryHandler.js');
require('../missionTypes/BountyHandler.js');
require('../missionTypes/AssassinationHandler.js');
require('../missionTypes/SabotageHandler.js');

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
        isPolice: options.isPolice || false,
        playerFaction: options.playerFaction || null,
        getFactionRank: function (faction) {
            return options.factionRanks?.[faction] || 0;
        },
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
        station: options.station || { name: 'Test Station', pos: createVector(500, 500) },
        planets: options.planets || []
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
// MissionTypeHandler Base Class Tests
// ============================================

describe('MissionTypeHandler Base Class', () => {
    test('should be defined as a class', () => {
        expect(MissionTypeHandler).toBeDefined();
    });

    test('should have static types array', () => {
        expect(Array.isArray(MissionTypeHandler.types)).toBe(true);
    });

    test('should have null requiredFaction by default', () => {
        expect(MissionTypeHandler.requiredFaction).toBe(null);
    });

    test('should have canGenerate method', () => {
        expect(typeof MissionTypeHandler.canGenerate).toBe('function');
    });

    test('should return true from canGenerate when no faction required', () => {
        const context = { player: createMockPlayer() };
        expect(MissionTypeHandler.canGenerate(context)).toBe(true);
    });

    test('should have create method that throws', () => {
        expect(() => MissionTypeHandler.create({})).toThrow();
    });

    test('should have activate method returning true', () => {
        expect(MissionTypeHandler.activate({}, {})).toBe(true);
    });

    test('should have getDisplayColor returning array', () => {
        const color = MissionTypeHandler.getDisplayColor();
        expect(Array.isArray(color)).toBe(true);
        expect(color.length).toBe(3);
    });
});

// ============================================
// MissionTypeRegistry Tests
// ============================================

describe('MissionTypeRegistry', () => {
    test('should be defined as an object', () => {
        expect(MissionTypeRegistry).toBeDefined();
    });

    test('should have register method', () => {
        expect(typeof MissionTypeRegistry.register).toBe('function');
    });

    test('should have getHandler method', () => {
        expect(typeof MissionTypeRegistry.getHandler).toBe('function');
    });

    test('should have getAllTypes method', () => {
        expect(typeof MissionTypeRegistry.getAllTypes).toBe('function');
    });

    test('should have getAllHandlers method', () => {
        expect(typeof MissionTypeRegistry.getAllHandlers).toBe('function');
    });

    test('should have registered handlers', () => {
        const handlers = MissionTypeRegistry.getAllHandlers();
        expect(handlers.length).toBeGreaterThan(0);
    });

    test('should return handler for DELIVERY_LEGAL type', () => {
        const handler = MissionTypeRegistry.getHandler(MISSION_TYPE.DELIVERY_LEGAL);
        expect(handler).toBeDefined();
        expect(handler).toBe(DeliveryHandler);
    });

    test('should return handler for BOUNTY_PIRATE type', () => {
        const handler = MissionTypeRegistry.getHandler(MISSION_TYPE.BOUNTY_PIRATE);
        expect(handler).toBeDefined();
        expect(handler).toBe(BountyHandler);
    });

    test('should return handler for ASSASSINATION type', () => {
        const handler = MissionTypeRegistry.getHandler(MISSION_TYPE.ASSASSINATION);
        expect(handler).toBeDefined();
        expect(handler).toBe(AssassinationHandler);
    });

    test('should return handler for SABOTAGE type', () => {
        const handler = MissionTypeRegistry.getHandler(MISSION_TYPE.SABOTAGE);
        expect(handler).toBeDefined();
        expect(handler).toBe(SabotageHandler);
    });

    test('should return undefined for unknown type', () => {
        const handler = MissionTypeRegistry.getHandler('UNKNOWN_TYPE');
        expect(handler).toBeUndefined();
    });
});

// ============================================
// DeliveryHandler Tests
// ============================================

describe('DeliveryHandler', () => {
    let galaxy, system, station, player;

    beforeEach(() => {
        galaxy = createMockGalaxy(8);
        system = galaxy.systems[0];
        station = system.station;
        player = createMockPlayer();
    });

    test('should be registered for delivery types', () => {
        expect(DeliveryHandler.types).toContain(MISSION_TYPE.DELIVERY_LEGAL);
        expect(DeliveryHandler.types).toContain(MISSION_TYPE.DELIVERY_ILLEGAL);
    });

    test('should have no faction requirement', () => {
        expect(DeliveryHandler.requiredFaction).toBe(null);
    });

    test('should have getObjective method', () => {
        const mission = { cargoType: 'Food', cargoQuantity: 10 };
        const objective = DeliveryHandler.getObjective(mission);
        expect(objective).toContain('Deliver');
        expect(objective).toContain('10t');
        expect(objective).toContain('Food');
    });
});

// ============================================
// BountyHandler Tests
// ============================================

describe('BountyHandler', () => {
    let galaxy, system, station, player;

    beforeEach(() => {
        galaxy = createMockGalaxy(8);
        system = galaxy.systems[0];
        station = system.station;
        player = createMockPlayer();
    });

    test('should be registered for bounty types', () => {
        expect(BountyHandler.types).toContain(MISSION_TYPE.BOUNTY_PIRATE);
        expect(BountyHandler.types).toContain(MISSION_TYPE.BOUNTY_POLICE);
        expect(BountyHandler.types).toContain(MISSION_TYPE.BOUNTY_ALIEN);
    });

    test('should create pirate bounty mission', () => {
        const context = {
            originSystem: system,
            originStation: station,
            galaxy: galaxy,
            player: player,
            subtype: MISSION_TYPE.BOUNTY_PIRATE
        };
        const mission = BountyHandler.create(context);
        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.BOUNTY_PIRATE);
        expect(mission.targetCount).toBeGreaterThan(0);
    });

    test('should create alien bounty mission', () => {
        const context = {
            originSystem: system,
            originStation: station,
            galaxy: galaxy,
            player: player,
            subtype: MISSION_TYPE.BOUNTY_ALIEN
        };
        const mission = BountyHandler.create(context);
        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.BOUNTY_ALIEN);
    });
});

// ============================================
// AssassinationHandler Tests
// ============================================

describe('AssassinationHandler', () => {
    let galaxy, system, station, player;

    beforeEach(() => {
        galaxy = createMockGalaxy(8);
        system = galaxy.systems[0];
        station = system.station;
        player = createMockPlayer();
    });

    test('should be registered for assassination type', () => {
        expect(AssassinationHandler.types).toContain(MISSION_TYPE.ASSASSINATION);
    });

    test('should create assassination mission', () => {
        const context = {
            originSystem: system,
            originStation: station,
            galaxy: galaxy,
            player: player
        };
        const mission = AssassinationHandler.create(context);
        expect(mission).toBeDefined();
        expect(mission.type).toBe(MISSION_TYPE.ASSASSINATION);
        expect(mission.targetName).toBeDefined();
        expect(mission.targetShipType).toBeDefined();
    });

    test('should have UPGRADE_CONFIG defined', () => {
        expect(AssassinationHandler.UPGRADE_CONFIG).toBeDefined();
        expect(AssassinationHandler.UPGRADE_CONFIG.armor).toBeDefined();
        expect(AssassinationHandler.UPGRADE_CONFIG.cloak).toBeDefined();
        expect(AssassinationHandler.UPGRADE_CONFIG.shield).toBeDefined();
    });

    test('should have _selectTargetUpgrades method', () => {
        expect(typeof AssassinationHandler._selectTargetUpgrades).toBe('function');
    });

    test('should return upgrade selection with valid structure', () => {
        const result = AssassinationHandler._selectTargetUpgrades();
        expect(result).toBeDefined();
        expect(Array.isArray(result.upgrades)).toBe(true);
        expect(Array.isArray(result.upgradeDetails)).toBe(true);
        expect(Array.isArray(result.warnings)).toBe(true);
        expect(typeof result.totalBonusReward).toBe('number');
    });

    test('should create mission with targetUpgrades array', () => {
        const context = {
            originSystem: system,
            originStation: station,
            galaxy: galaxy,
            player: player
        };
        const mission = AssassinationHandler.create(context);
        expect(mission).toBeDefined();
        expect(Array.isArray(mission.targetUpgrades)).toBe(true);
        expect(Array.isArray(mission.targetUpgradeDetails)).toBe(true);
    });

    test('should have _applyUpgradesToEnemy method', () => {
        expect(typeof AssassinationHandler._applyUpgradesToEnemy).toBe('function');
    });

    test('cloak upgrade should have highest reward multiplier', () => {
        const cloakConfig = AssassinationHandler.UPGRADE_CONFIG.cloak;
        const armorConfig = AssassinationHandler.UPGRADE_CONFIG.armor;
        expect(cloakConfig.rewardPerLevel).toBeGreaterThan(armorConfig.rewardPerLevel);
    });

    test('cloak upgrade should have lowest chance', () => {
        const cloakConfig = AssassinationHandler.UPGRADE_CONFIG.cloak;
        const armorConfig = AssassinationHandler.UPGRADE_CONFIG.armor;
        expect(cloakConfig.chance).toBeLessThan(armorConfig.chance);
    });

    test('should have getObjective referencing target name', () => {
        const mission = { targetName: 'Captain Vex' };
        const objective = AssassinationHandler.getObjective(mission);
        expect(objective).toContain('Eliminate');
        expect(objective).toContain('Captain Vex');
    });

    test('should show upgrade details in getSupplementalDetails', () => {
        const mission = {
            targetName: 'Test Target',
            targetShipType: 'Krait',
            targetUpgradeDetails: [
                { type: 'armor', level: 2, name: 'Core Dynamics Reactive Plates' }
            ]
        };
        const details = AssassinationHandler.getSupplementalDetails(mission);
        expect(details).toContain('Ship Upgrades');
        expect(details).toContain('Armor');
    });

    test('should show stealth warning for cloaked targets', () => {
        const mission = {
            targetName: 'Test Target',
            targetShipType: 'Krait',
            targetUpgradeDetails: [
                { type: 'cloak', level: 1, name: 'Stealth Field Mark I' }
            ]
        };
        const details = AssassinationHandler.getSupplementalDetails(mission);
        expect(details).toContain('STEALTH');
    });

    test('should increase reward for upgraded targets', () => {
        // Force upgrades by mocking Math.random
        const originalRandom = Math.random;
        Math.random = () => 0.01; // Force all upgrade checks to pass

        const context = {
            originSystem: system,
            originStation: station,
            galaxy: galaxy,
            player: player
        };

        const mission = AssassinationHandler.create(context);

        Math.random = originalRandom;

        // Should have upgrades and increased reward
        expect(mission.targetUpgrades.length).toBeGreaterThan(0);
        expect(mission.rewardCredits).toBeGreaterThan(3000); // Base reward
    });
});

// ============================================
// SabotageHandler Tests
// ============================================

describe('SabotageHandler', () => {
    let galaxy, system, station, player;

    beforeEach(() => {
        galaxy = createMockGalaxy(8);
        system = galaxy.systems[0];
        station = system.station;
        player = createMockPlayer();
    });

    test('should be registered for sabotage type', () => {
        expect(SabotageHandler.types).toContain(MISSION_TYPE.SABOTAGE);
    });

    test('should have CANONICAL_TYPES array', () => {
        expect(Array.isArray(SabotageHandler.CANONICAL_TYPES)).toBe(true);
        expect(SabotageHandler.CANONICAL_TYPES.length).toBeGreaterThan(0);
    });

    test('should have generateBackstory method', () => {
        expect(typeof SabotageHandler.generateBackstory).toBe('function');
    });
});

// ============================================
// FactionMissionHandler Tests
// ============================================

describe('FactionMissionHandler', () => {
    test('should be defined', () => {
        expect(FactionMissionHandler).toBeDefined();
    });

    test('should extend MissionTypeHandler', () => {
        expect(typeof FactionMissionHandler.canGenerate).toBe('function');
        expect(typeof FactionMissionHandler.activate).toBe('function');
    });

    test('should have getRankRewardMultiplier method', () => {
        expect(typeof FactionMissionHandler.getRankRewardMultiplier).toBe('function');
    });

    test('should block non-faction members', () => {
        class TestFactionHandler extends FactionMissionHandler {
            static requiredFaction = 'IMPERIAL';
        }

        const nonMember = createMockPlayer({ playerFaction: null });
        const context = { player: nonMember };
        expect(TestFactionHandler.canGenerate(context)).toBe(false);
    });

    test('should allow faction members', () => {
        class TestFactionHandler extends FactionMissionHandler {
            static requiredFaction = 'IMPERIAL';
        }

        const member = createMockPlayer({ playerFaction: 'IMPERIAL' });
        const context = { player: member };
        expect(TestFactionHandler.canGenerate(context)).toBe(true);
    });

    test('should check rank requirements', () => {
        class TestRankedHandler extends FactionMissionHandler {
            static requiredFaction = 'MILITARY';
            static minFactionRank = 3;
        }

        const lowRank = createMockPlayer({
            playerFaction: 'MILITARY',
            factionRanks: { MILITARY: 1 }
        });
        expect(TestRankedHandler.canGenerate({ player: lowRank })).toBe(false);

        const highRank = createMockPlayer({
            playerFaction: 'MILITARY',
            factionRanks: { MILITARY: 5 }
        });
        expect(TestRankedHandler.canGenerate({ player: highRank })).toBe(true);
    });
});

// ============================================
// Registry Eligible Handlers Tests
// ============================================

describe('Registry Eligible Handlers', () => {
    test('should return all public handlers for non-faction player', () => {
        const player = createMockPlayer({ playerFaction: null });
        const context = { player };
        const eligible = MissionTypeRegistry.getEligibleHandlers(context);

        // Should include all public handlers
        expect(eligible).toContain(DeliveryHandler);
        expect(eligible).toContain(BountyHandler);
        expect(eligible).toContain(AssassinationHandler);
        expect(eligible).toContain(SabotageHandler);
    });
});
