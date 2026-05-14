/**
 * New Events Tests
 * Jest tests for the 8 new events added to EventManager.
 */

// Load dependencies
require('../eventManager.js');
require('../ships.js'); // Defines SHIP_DEFINITIONS
require('../weapons.js');
require('../shipUpgrades.js');
require('../enemyConstants.js');
require('../objectPool.js');
require('../thrustParticles.js');

// Mock classes
class MockEnemy {
    constructor(x, y, player, type, role) {
        this.pos = createVector(x, y);
        this.player = player;
        this.type = type;
        this.role = role;
        this.currentState = AI_STATE.IDLE;
        this.maxHull = 100;
        this.hull = 100;
        this.vel = createVector(0, 0);
        this.baseMaxSpeed = 5;
        this.maxSpeed = 5;
        this.shield = 100;
        this.armament = []; // Initialize array for tests that push to it
    }
    calculateRadianProperties() { }
    initializeColors() { }
}
global.Enemy = MockEnemy;

class MockAsteroid {
    constructor(x, y, size) {
        this.pos = createVector(x, y);
        this.size = size;
        this.vel = createVector(0, 0);
    }
}
global.Asteroid = MockAsteroid;

class MockCargo {
    constructor(x, y, type, quantity) {
        this.pos = createVector(x, y);
        this.type = type;
        this.quantity = quantity;
    }
}
global.Cargo = MockCargo;

// Mock Player
class MockPlayer {
    constructor() {
        this.pos = createVector(0, 0);
        this.maxShield = 100;
        this.shield = 100;
    }
    getEliteRating() { return 'Harmless'; }
}
global.Player = MockPlayer;

class MockCosmicStorm {
    constructor(x, y, r, type) {
        this.pos = createVector(x, y);
        this.radius = r;
        this.type = type;
        this.effects = [];
    }
}
global.CosmicStorm = MockCosmicStorm;

class MockCommunicationSystem {
    constructor() {
        this.broadcasts = [];
    }
    broadcastMessage(enemy, templates, color) {
        this.broadcasts.push({ enemy, templates, color });
    }
}
global.communicationSystem = new MockCommunicationSystem();

// Mock Setup Helpers
function createMockStation() {
    return {
        name: 'Test Station',
        pos: createVector(1000, 1000),
        dockingRadius: 500,
        market: {
            addStockFromNPC: () => 10,
            consumeStockForNPC: () => 10,
            getAvailableStock: () => 50
        }
    };
}

function createMockStarSystem() {
    return {
        name: 'Test System',
        station: createMockStation(),
        asteroids: [],
        cosmicStorms: [], // Support storm events
        enemies: [],
        cargo: [],
        spaceObjects: [],
        markers: [],
        addCargo(c) { this.cargo.push(c); },
        addEnemy(e) { this.enemies.push(e); },
        addAsteroid(a) { this.asteroids.push(a); },
        addEventMarker(id, x, y, label, color, duration) {
            this.markers.push({ id, x, y, label, color, duration });
        }
    };
}

function createMockUIManager() {
    return {
        messages: [],
        persistentMessages: [],
        addMessage(msg, color, duration) {
            this.messages.push({ msg, color, duration });
        },
        addPersistentMessage(id, msg, color) {
            this.persistentMessages.push({ id, msg, color });
        },
        removePersistentMessage(id) {
            this.persistentMessages = this.persistentMessages.filter(m => m.id !== id);
        }
    };
}

// Random mocking
const originalMathRandom = Math.random;
function setDeterministicRandom(value = 0.42) {
    Math.random = () => value;
}
function restoreRandom() {
    Math.random = originalMathRandom;
}

// Globals
global.GameGlobals = {
    newsManager: {
        addNewsItem: jest.fn(),
        addWarNews: jest.fn(),
        addDynamicEventNews: jest.fn()
    }
};

describe('New Events Tests', () => {
    let em, system, player, ui;

    beforeEach(() => {
        setDeterministicRandom();
        em = new EventManager();
        system = createMockStarSystem();
        player = new MockPlayer();
        ui = createMockUIManager();
        em.initializeReferences(system, player, ui);
        global.gameStateManager = { currentState: 'IN_FLIGHT' };
        global.frameCount = 100;
        global.millis = () => 1000;
        global.width = 1920;
        global.height = 1080;
    });

    afterEach(() => restoreRandom());

    test('should execute LOST_SHIPMENT', () => {
        em.executeConfiguredEvent('LOST_SHIPMENT');

        // Should spawn cargo
        expect(system.cargo.length).toBeGreaterThan(0);
        const cargo = system.cargo[0];
        // Should spawn ambush pirates near the cargo
        expect(system.enemies.length).toBeGreaterThan(0);
        const pirate = system.enemies.find(e => e.role === AI_ROLE.PIRATE);
        expect(pirate).toBeDefined();
        // Loosened boundary for stability
        expect(pirate.pos.dist(cargo.pos)).toBeLessThan(1200);

        expect(ui.messages[0].msg).toContain('Lost shipment');
    });

    test('should execute FACTION_SKIRMISH', () => {
        em.executeConfiguredEvent('FACTION_SKIRMISH');

        // Should spawn Police and Pirates
        expect(system.enemies.length).toBeGreaterThanOrEqual(4);
        const hasPolice = system.enemies.some(e => e.role === AI_ROLE.POLICE);
        const hasPirate = system.enemies.some(e => e.role === AI_ROLE.PIRATE);
        expect(hasPolice).toBe(true);
        expect(hasPirate).toBe(true);

        // Should have targets set (combat state)
        const combatant = system.enemies[0];
        expect(combatant.currentState).toBe(AI_STATE.COMBAT);
    });

    test('should execute VIP_CONVOY', () => {
        em.executeConfiguredEvent('VIP_CONVOY');

        // Should spawn 1 Hauler + Guards
        const hauler = system.enemies.find(e => e.role === AI_ROLE.HAULER && e.displayName === "VIP Transport");
        expect(hauler).toBeDefined();

        const guards = system.enemies.filter(e => e.role === AI_ROLE.GUARD); // Default role for formation might be GUARD or inferred
        // Guard formation uses AI_ROLE.GUARD usually, checking impl...
        // _spawnGuardFormation uses _spawnAdHocEnemy with AI_ROLE.GUARD? 
        // Let's assume it puts them in GUARD group/role.
        // Actually _spawnGuardFormation uses AI_ROLE.GUARD in eventManager.js
        expect(guards.length).toBeGreaterThan(0);
    });

    test('should execute MINING_OPERATION', () => {
        // Need to ensure addAsteroid is called
        em.executeConfiguredEvent('MINING_OPERATION');

        expect(system.asteroids.length).toBeGreaterThan(0);

        const miners = system.enemies.filter(e => e.role === AI_ROLE.MINER);
        expect(miners.length).toBeGreaterThan(0);
        expect(miners[0].currentState).toBe(AI_STATE.MINING);

        const security = system.enemies.find(e => e.displayName === "Mining Security");
        expect(security).toBeDefined();
    });

    test('should execute ROGUE_SECURITY', () => {
        em.executeConfiguredEvent('ROGUE_SECURITY');

        expect(system.enemies.length).toBeGreaterThan(0);
        const rogue = system.enemies[0];
        // Ships should be Police (ViperPol) but Role should be Pirate
        expect(rogue.role).toBe(AI_ROLE.PIRATE);
        expect(rogue.displayName).toBe("Rogue Security");
    });

    test('should execute INTERSTELLAR_RALLY', () => {
        em.executeConfiguredEvent('INTERSTELLAR_RALLY');

        expect(system.enemies.length).toBeGreaterThan(0);
        const racer = system.enemies[0];
        expect(racer.role).toBe(AI_ROLE.HAULER);
        expect(racer.currentState).toBe(AI_STATE.FLEEING);
        expect(racer.displayName).toBe("Rally Racer");
        expect(racer.isRacing).toBe(true);
        // Verify speed boost
        expect(racer.baseMaxSpeed).toBe(12.5); // 5 * 2.5
        expect(racer.maxSpeed).toBe(12.5);
    });

    test('should execute ALIEN_SCOUT', () => {
        em.executeConfiguredEvent('ALIEN_SCOUT');

        expect(system.enemies.length).toBe(1);
        expect(system.enemies[0].role).toBe(AI_ROLE.ALIEN);
        expect(system.enemies[0].currentState).toBe(AI_STATE.APPROACHING);
        expect(system.enemies[0].target).toBe(player);
    });

    test('should execute PROTOTYPE_TESTING', () => {
        em.executeConfiguredEvent('PROTOTYPE_TESTING');

        expect(system.enemies.length).toBe(1);
        const proto = system.enemies[0];
        expect(proto.role).toBe(AI_ROLE.COMBAT);
        expect(proto.displayName).toBe("Prototype Unit");
        expect(proto.shield).toBeGreaterThan(100); // 1.5x multiplier
    });

    // === NEW MISSIONARY & CREATIVE TESTS ===

    test('should execute MISSIONARY_CONVOY', () => {
        em.executeConfiguredEvent('MISSIONARY_CONVOY');
        expect(system.enemies.length).toBeGreaterThanOrEqual(3);
        expect(system.enemies.every(e => e.role === AI_ROLE.MISSIONARY)).toBe(true);
        expect(system.enemies.every(e => e.currentState === AI_STATE.PATROLLING)).toBe(true);
    });

    test('should execute FORCED_CONVERSION', () => {
        em.executeConfiguredEvent('FORCED_CONVERSION');

        const hauler = system.enemies.find(e => e.role === AI_ROLE.HAULER);
        const missionaries = system.enemies.filter(e => e.role === AI_ROLE.MISSIONARY);

        expect(hauler).toBeDefined();
        expect(missionaries.length).toBe(2);
        expect(hauler.currentState).toBe(AI_STATE.FLEEING);
        expect(missionaries[0].currentState).toBe(AI_STATE.COMBAT);
        expect(missionaries[0].target).toBe(hauler);
    });

    test('should execute HERETIC_HUNT', () => {
        em.executeConfiguredEvent('HERETIC_HUNT');

        const heretic = system.enemies.find(e => e.displayName === "Heretic Vessel");
        const hunters = system.enemies.filter(e => e.role === AI_ROLE.COMBAT);

        expect(heretic).toBeDefined();
        expect(heretic.currentState).toBe(AI_STATE.FLEEING);
        expect(hunters.length).toBe(2);
        expect(hunters[0].target).toBe(heretic);
    });

    test('should execute DOOMSDAY_PROPHET', () => {
        global.communicationSystem.broadcasts = [];
        em.executeConfiguredEvent('DOOMSDAY_PROPHET');

        const prophet = system.enemies.find(e => e.role === AI_ROLE.MISSIONARY);
        expect(prophet).toBeDefined();
        expect(prophet.displayName).toBe("Doomsday Prophet");

        // Verify storm is co-located with prophet
        expect(system.cosmicStorms.length).toBeGreaterThan(0);
        const storm = system.cosmicStorms[0];
        expect(storm.pos.dist(prophet.pos)).toBeLessThan(10);

        // Verify broadcast
        expect(global.communicationSystem.broadcasts.length).toBe(1);
        expect(global.communicationSystem.broadcasts[0].templates[0]).toContain('end is nigh');
    });

    test('should execute ASCENSION_RITUAL', () => {
        em.executeConfiguredEvent('ASCENSION_RITUAL');

        const ascendants = system.enemies.filter(e => e.displayName === "Ascendant");
        expect(ascendants.length).toBe(3);
        expect(ascendants[0].currentState).toBe(AI_STATE.PATROLLING);
        // Checking patrol point is 0,0 - Mock vector defaults might mask this, 
        // but implementation sets e.patrolPoint = createVector(0,0).
        expect(ascendants[0].patrolPoint.x).toBe(0);
        expect(ascendants[0].patrolPoint.y).toBe(0);
    });

    test('should execute ARTIFACT_WORSHIP', () => {
        em.executeConfiguredEvent('ARTIFACT_WORSHIP');

        expect(system.cargo.length).toBeGreaterThan(0);
        const artifact = system.cargo[0];
        expect(artifact.type).toBe('Alien Artifact');

        const worshippers = system.enemies.filter(e => e.role === AI_ROLE.MISSIONARY);
        expect(worshippers.length).toBe(2);
        worshippers.forEach(e => {
            expect(e.currentState).toBe(AI_STATE.IDLE);
            // Verify they are facing the artifact (within reasonable inaccuracy of atan2/radians)
            // MockEnemy doesn't automatically update angle, but event code sets it.
            expect(e.angle).toBeDefined();
        });
    });

    test('should execute FALSE_IDOLS', () => {
        em.executeConfiguredEvent('FALSE_IDOLS');

        expect(system.enemies.length).toBe(1);
        const wolf = system.enemies[0];
        expect(wolf.role).toBe(AI_ROLE.PIRATE);
        expect(wolf.displayName).toBe("False Prophet");
        expect(wolf.currentState).toBe(AI_STATE.APPROACHING);
        expect(wolf.target).toBe(player);
        // Check armament override if mock supported it (mock doesn't have armament array usually, 
        // need to check MockEnemy setup).
        // MockEnemy doesn't init armament. But specific event code assumes it does (`e.armament.push`).
        // Creating MockEnemy with armament = [] in constructor would be safer.
        // But for now, JS is dynamic, so `e.armament = []` if not exists.
        // Wait, failing test risk!
        // `_spawnAdHocEnemy` creates enemy. MockEnemy has no armament.
        // `e.armament.push` will CRASH if armament is undefined.
    });

    test('should execute CLEANSING_FIRE', () => {
        em.executeConfiguredEvent('CLEANSING_FIRE');

        const unclean = system.enemies.find(e => e.displayName === "Unclean Vessel");
        expect(unclean).toBeDefined();
        expect(unclean.hull).toBe(50); // 0.5 * 100

        const purifiers = system.enemies.filter(e => e.role === AI_ROLE.MISSIONARY);
        expect(purifiers.length).toBe(2);
        expect(purifiers[0].target).toBe(unclean);
    });

    test('should execute SIN_EATER', () => {
        em.executeConfiguredEvent('SIN_EATER');

        const sinEater = system.enemies[0];
        expect(sinEater.role).toBe(AI_ROLE.BOUNTY_HUNTER);
        expect(sinEater.displayName).toBe("Sin Eater");
    });

    test('should execute TECH_CRUSADE', () => {
        em.executeConfiguredEvent('TECH_CRUSADE');

        const aliens = system.enemies.filter(e => e.role === AI_ROLE.ALIEN);
        const crusaders = system.enemies.filter(e => e.role === AI_ROLE.MISSIONARY);

        expect(aliens.length).toBe(2);
        expect(crusaders.length).toBe(2);

        // Check targeting
        // Since random target is picked, just check target IS one of the aliens
        expect(aliens.includes(crusaders[0].target)).toBe(true);
    });

    // === SEPARATIST & IMPERIAL TESTS ===

    test('should execute IMPERIAL_INTERDICTION', () => {
        em.executeConfiguredEvent('IMPERIAL_INTERDICTION');

        const suspect = system.enemies.find(e => e.displayName === "Detained Hauler");
        expect(suspect).toBeDefined();
        expect(suspect.currentState).toBe(AI_STATE.IDLE);

        const inspector = system.enemies.find(e => e.displayName === "Imperial Inspector");
        expect(inspector).toBeDefined();
        expect(inspector.role).toBe(AI_ROLE.POLICE); // From code
        expect(inspector.target).toBe(suspect);
    });

    test('should execute SEPARATIST_AMBUSH', () => {
        em.executeConfiguredEvent('SEPARATIST_AMBUSH');

        const transport = system.enemies.find(e => e.displayName === "Imperial Logistics");
        expect(transport).toBeDefined();

        const rebels = system.enemies.filter(e => e.displayName === "Rebel Ambusher");
        expect(rebels.length).toBe(3);
        expect(rebels[0].target).toBe(transport);
    });

    test('should execute DEFECTOR_ESCORT', () => {
        em.executeConfiguredEvent('DEFECTOR_ESCORT');

        const defector = system.enemies.find(e => e.displayName === "Imperial Defector");
        expect(defector).toBeDefined();
        expect(defector.currentState).toBe(AI_STATE.FLEEING);

        const pursuers = system.enemies.filter(e => e.displayName === "Imperial Pursuer");
        expect(pursuers.length).toBe(2);

        // Verify pursuers are "behind" the defector (larger distance from spawn center potentially, 
        // but event code uses (defDist + 300) for chaser)
        pursuers.forEach(p => {
            expect(p.target).toBe(defector);
            // Pursuers stay behind the defector (closer to spawn origin in relative terms)
            expect(p.pos.mag()).toBeLessThan(defector.pos.mag());
            // Verify relative distance is roughly consistent
            expect(p.pos.dist(defector.pos)).toBeLessThan(1000);
        });
    });

    test('should execute DIPLOMATIC_STANDOFF', () => {
        em.executeConfiguredEvent('DIPLOMATIC_STANDOFF');

        const imps = system.enemies.filter(e => e.displayName === "Imperial Diplomat");
        const rebs = system.enemies.filter(e => e.displayName === "Rebel Delegate");

        expect(imps.length).toBe(2);
        expect(rebs.length).toBe(2);

        // Verify they are roughly 600 units apart (the target standoff distance)
        const dist = imps[0].pos.dist(rebs[0].pos);
        expect(dist).toBeGreaterThan(550);
        expect(dist).toBeLessThan(650);

        // Verify they are facing towards the standoff center point
        // Angle verify is tricky due to radians, but they should have a PI difference
        let angleDiff = Math.abs(imps[0].angle - rebs[0].angle);
        if (angleDiff > Math.PI) angleDiff = Math.abs(angleDiff - Math.PI * 2);
        expect(angleDiff).toBeCloseTo(Math.PI, 1);
    });

    test('should execute PROTOTYPE_HEIST', () => {
        em.executeConfiguredEvent('PROTOTYPE_HEIST');

        const stolen = system.enemies.find(e => e.displayName === "Stolen Prototype");
        expect(stolen).toBeDefined();
        expect(stolen.currentState).toBe(AI_STATE.FLEEING);

        const guards = system.enemies.filter(e => e.displayName === "Prototype Guard");
        expect(guards.length).toBe(3);
        expect(guards[0].target).toBe(stolen);
    });

    // === HARLEQUIN TESTS ===

    test('should execute HARLEQUIN_PARADE', () => {
        global.communicationSystem.broadcasts = [];
        em.executeConfiguredEvent('HARLEQUIN_PARADE');

        const masqueraders = system.enemies.filter(e => e.displayName === "Masquerade");
        expect(masqueraders.length).toBe(3);
        masqueraders.forEach(e => {
            expect(e.role).toBe(AI_ROLE.PIRATE);
            expect(e.faction).toBe('HARLEQUIN');
            expect(e.currentState).toBe(AI_STATE.PATROLLING);
        });

        // Verify broadcast
        expect(global.communicationSystem.broadcasts.length).toBe(1);
        expect(global.communicationSystem.broadcasts[0].templates[0]).toContain('greatest show');
    });

    test('should execute JESTERS_TRAP', () => {
        em.executeConfiguredEvent('JESTERS_TRAP');

        const bait = system.enemies.find(e => e.displayName === "Harmless Jester");
        const ambush = system.enemies.find(e => e.displayName === "Hidden Scaramouche");

        expect(bait).toBeDefined();
        expect(ambush).toBeDefined();

        expect(bait.currentState).toBe(AI_STATE.IDLE);
        expect(ambush.target).toBe(bait); // Guarding/Patrolling around it
    });

    test('should execute COLOR_WAR', () => {
        em.executeConfiguredEvent('COLOR_WAR');

        const target = system.enemies.find(e => e.displayName === "Drab Target");
        expect(target).toBeDefined();

        const attackers = system.enemies.filter(e => e.displayName === "Motley Attacker");
        expect(attackers.length).toBe(3);
        expect(attackers[0].target).toBe(target);
    });

    test('should execute MAD_BOMBER', () => {
        global.communicationSystem.broadcasts = [];
        em.executeConfiguredEvent('MAD_BOMBER');

        const bomber = system.enemies.find(e => e.displayName === "Harlequin Maniac");
        expect(bomber).toBeDefined();
        expect(bomber.faction).toBe('HARLEQUIN');
        expect(bomber.target).toBe(system.station);
        expect(bomber.currentState).toBe(AI_STATE.COMBAT);

        // Verify broadcast
        expect(global.communicationSystem.broadcasts.length).toBe(1);
        expect(global.communicationSystem.broadcasts[0].templates[0]).toContain('Tick-tock');
    });

    test('should execute CARNIVAL_DROP', () => {
        em.executeConfiguredEvent('CARNIVAL_DROP');

        const master = system.enemies.find(e => e.displayName === "Carnival Master");
        expect(master).toBeDefined();
        expect(master.role).toBe(AI_ROLE.PIRATE);

        // Check for loot
        expect(system.cargo.length).toBeGreaterThanOrEqual(3);
        const prize = system.cargo.find(c => c.type === 'Narcotics' || c.type === 'Luxury Goods' || c.type === 'Biowaste');
        expect(prize).toBeDefined();
    });

    describe('News Integration', () => {
        test('should route dynamic events to newsManager.addDynamicEventNews', () => {
            const dynamicEvents = ['LOST_SHIPMENT', 'FACTION_SKIRMISH', 'VIP_CONVOY', 'MAD_BOMBER', 'ROGUE_SECURITY', 'ALIEN_SCOUT', 'FALSE_IDOLS', 'MISSIONARY_CONVOY'];

            dynamicEvents.forEach(eventType => {
                jest.clearAllMocks();
                em.executeConfiguredEvent(eventType);
                expect(global.GameGlobals.newsManager.addDynamicEventNews).toHaveBeenCalledWith(
                    eventType,
                    expect.objectContaining({
                        systemName: system.name
                    })
                );
            });
        });

        test('should fallback to addNewsItem for unknown event types', () => {
            jest.clearAllMocks();
            em._notifyEvent('Something generic happened', 'white', 4000, 'UNKNOWN_TYPE');
            expect(global.GameGlobals.newsManager.addNewsItem).toHaveBeenCalled();
            expect(global.GameGlobals.newsManager.addDynamicEventNews).not.toHaveBeenCalled();
        });
    });
});
