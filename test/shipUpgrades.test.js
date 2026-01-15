/**
 * Ship Upgrades Tests
 * Jest tests for SHIP_UPGRADES definitions: Armor, Engine, Cargo, Hardpoints, Shield, Cloak, Booster.
 */

// Load source files
require('../debug.js');
require('../ships.js');
require('../weapons.js');
require('../shipUpgrades.js');

// ============================================
// SHIP_UPGRADES Definition Tests
// ============================================

describe('SHIP_UPGRADES Definitions', () => {
    test('should have SHIP_UPGRADES array defined', () => {
        expect(SHIP_UPGRADES).toBeDefined();
        expect(Array.isArray(SHIP_UPGRADES)).toBe(true);
    });

    test('should have upgrades for standard types', () => {
        const types = ['armor', 'engine', 'cargo', 'hardpoints', 'shield'];
        for (const type of types) {
            const found = SHIP_UPGRADES.filter(u => u.type === type);
            expect(found.length).toBeGreaterThan(0);
        }
    });

    test('should have 3 levels for each standard type', () => {
        const types = ['armor', 'engine', 'cargo', 'hardpoints', 'shield'];
        for (const type of types) {
            for (let level = 1; level <= 3; level++) {
                const upgrade = SHIP_UPGRADES.find(u => u.type === type && u.level === level);
                expect(upgrade).toBeDefined();
            }
        }
    });

    test('should have price, name, and desc for each upgrade', () => {
        for (const upgrade of SHIP_UPGRADES) {
            expect(upgrade.price).toBeGreaterThan(0);
            expect(typeof upgrade.name).toBe('string');
            expect(upgrade.name.length).toBeGreaterThan(0);
            expect(typeof upgrade.desc).toBe('string');
        }
    });

    test('should have increasing prices for higher levels', () => {
        const types = ['armor', 'engine', 'cargo', 'hardpoints', 'shield'];
        for (const type of types) {
            const lvl1 = SHIP_UPGRADES.find(u => u.type === type && u.level === 1);
            const lvl2 = SHIP_UPGRADES.find(u => u.type === type && u.level === 2);
            const lvl3 = SHIP_UPGRADES.find(u => u.type === type && u.level === 3);

            expect(lvl2.price).toBeGreaterThan(lvl1.price);
            expect(lvl3.price).toBeGreaterThan(lvl2.price);
        }
    });
});

// ============================================
// Armor Upgrade Definition Tests
// ============================================

describe('Armor Upgrades', () => {
    test('should have hullBonus defined for all armor upgrades', () => {
        const armorUpgrades = SHIP_UPGRADES.filter(u => u.type === 'armor');
        for (const upgrade of armorUpgrades) {
            expect(upgrade.hullBonus).toBeGreaterThan(0);
        }
    });

    test('should have increasing hull bonus for higher levels', () => {
        const armor1 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 1);
        const armor2 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 2);
        const armor3 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 3);

        expect(armor2.hullBonus).toBeGreaterThan(armor1.hullBonus);
        expect(armor3.hullBonus).toBeGreaterThan(armor2.hullBonus);
    });
});

// ============================================
// Engine Upgrade Definition Tests
// ============================================

describe('Engine Upgrades', () => {
    test('should have speedMultiplier and thrustMultiplier for all engine upgrades', () => {
        const engineUpgrades = SHIP_UPGRADES.filter(u => u.type === 'engine');
        for (const upgrade of engineUpgrades) {
            expect(upgrade.speedMultiplier).toBeGreaterThan(1);
            expect(upgrade.thrustMultiplier).toBeGreaterThan(1);
        }
    });

    test('should have increasing multipliers for higher levels', () => {
        const engine1 = SHIP_UPGRADES.find(u => u.type === 'engine' && u.level === 1);
        const engine2 = SHIP_UPGRADES.find(u => u.type === 'engine' && u.level === 2);
        const engine3 = SHIP_UPGRADES.find(u => u.type === 'engine' && u.level === 3);

        expect(engine2.speedMultiplier).toBeGreaterThan(engine1.speedMultiplier);
        expect(engine3.speedMultiplier).toBeGreaterThan(engine2.speedMultiplier);
        expect(engine2.thrustMultiplier).toBeGreaterThan(engine1.thrustMultiplier);
        expect(engine3.thrustMultiplier).toBeGreaterThan(engine2.thrustMultiplier);
    });
});

// ============================================
// Cargo Upgrade Definition Tests
// ============================================

describe('Cargo Upgrades', () => {
    test('should have cargoBonus for all cargo upgrades', () => {
        const cargoUpgrades = SHIP_UPGRADES.filter(u => u.type === 'cargo');
        for (const upgrade of cargoUpgrades) {
            expect(upgrade.cargoBonus).toBeGreaterThan(0);
        }
    });

    test('should have increasing bonuses for higher levels', () => {
        const cargo1 = SHIP_UPGRADES.find(u => u.type === 'cargo' && u.level === 1);
        const cargo2 = SHIP_UPGRADES.find(u => u.type === 'cargo' && u.level === 2);
        const cargo3 = SHIP_UPGRADES.find(u => u.type === 'cargo' && u.level === 3);

        expect(cargo2.cargoBonus).toBeGreaterThan(cargo1.cargoBonus);
        expect(cargo3.cargoBonus).toBeGreaterThan(cargo2.cargoBonus);
    });
});

// ============================================
// Hardpoint Upgrade Definition Tests
// ============================================

describe('Hardpoint Upgrades', () => {
    test('should have bonusSlots for all hardpoint upgrades', () => {
        const hpUpgrades = SHIP_UPGRADES.filter(u => u.type === 'hardpoints');
        for (const upgrade of hpUpgrades) {
            expect(upgrade.bonusSlots).toBeGreaterThan(0);
        }
    });

    test('should have increasing bonusSlots for higher levels', () => {
        const hp1 = SHIP_UPGRADES.find(u => u.type === 'hardpoints' && u.level === 1);
        const hp2 = SHIP_UPGRADES.find(u => u.type === 'hardpoints' && u.level === 2);
        const hp3 = SHIP_UPGRADES.find(u => u.type === 'hardpoints' && u.level === 3);

        expect(hp2.bonusSlots).toBeGreaterThan(hp1.bonusSlots);
        expect(hp3.bonusSlots).toBeGreaterThan(hp2.bonusSlots);
    });
});

// ============================================
// Shield Upgrade Definition Tests
// ============================================

describe('Shield Upgrades', () => {
    test('should have shieldBonus for all shield upgrades', () => {
        const shieldUpgrades = SHIP_UPGRADES.filter(u => u.type === 'shield');
        for (const upgrade of shieldUpgrades) {
            expect(upgrade.shieldBonus).toBeGreaterThan(0);
        }
    });

    test('should have increasing bonuses for higher levels', () => {
        const shield1 = SHIP_UPGRADES.find(u => u.type === 'shield' && u.level === 1);
        const shield2 = SHIP_UPGRADES.find(u => u.type === 'shield' && u.level === 2);
        const shield3 = SHIP_UPGRADES.find(u => u.type === 'shield' && u.level === 3);

        expect(shield2.shieldBonus).toBeGreaterThan(shield1.shieldBonus);
        expect(shield3.shieldBonus).toBeGreaterThan(shield2.shieldBonus);
    });
});

// ============================================
// Cloak Upgrade Definition Tests
// ============================================

describe('Cloak Upgrades', () => {
    test('should have cloak upgrades defined', () => {
        const cloakUpgrades = SHIP_UPGRADES.filter(u => u.type === 'cloak');
        expect(cloakUpgrades.length).toBeGreaterThan(0);
    });

    test('should have cloakDuration for all cloak upgrades', () => {
        const cloakUpgrades = SHIP_UPGRADES.filter(u => u.type === 'cloak');
        for (const upgrade of cloakUpgrades) {
            expect(upgrade.cloakDuration).toBeGreaterThan(0);
        }
    });

    test('should have cooldown for all cloak upgrades', () => {
        const cloakUpgrades = SHIP_UPGRADES.filter(u => u.type === 'cloak');
        for (const upgrade of cloakUpgrades) {
            expect(upgrade.cloakCooldown).toBeGreaterThan(0);
        }
    });
});

// ============================================
// Booster Upgrade Definition Tests
// ============================================

describe('Booster Upgrades', () => {
    test('should have booster upgrades defined', () => {
        const boosterUpgrades = SHIP_UPGRADES.filter(u => u.type === 'booster');
        expect(boosterUpgrades.length).toBeGreaterThan(0);
    });

    test('should have boostMultiplier for all booster upgrades', () => {
        const boosterUpgrades = SHIP_UPGRADES.filter(u => u.type === 'booster');
        for (const upgrade of boosterUpgrades) {
            expect(upgrade.boostMultiplier).toBeGreaterThan(1);
        }
    });

    test('should have boostDuration and boostCooldown for all booster upgrades', () => {
        const boosterUpgrades = SHIP_UPGRADES.filter(u => u.type === 'booster');
        for (const upgrade of boosterUpgrades) {
            expect(upgrade.boostDuration).toBeGreaterThan(0);
            expect(upgrade.boostCooldown).toBeGreaterThan(0);
        }
    });

    test('should have decreasing cooldown for higher levels', () => {
        const booster1 = SHIP_UPGRADES.find(u => u.type === 'booster' && u.level === 1);
        const booster2 = SHIP_UPGRADES.find(u => u.type === 'booster' && u.level === 2);
        const booster3 = SHIP_UPGRADES.find(u => u.type === 'booster' && u.level === 3);

        expect(booster2.boostCooldown).toBeLessThan(booster1.boostCooldown);
        expect(booster3.boostCooldown).toBeLessThan(booster2.boostCooldown);
    });
});

// ============================================
// Logic Tests (Player Upgrade Application)
// ============================================

const Player = require('../player.js');

describe('Player Upgrade Logic', () => {
    let player;

    beforeEach(() => {
        // Mock p5 globals needed for Player
        global.createVector = jest.fn((x, y) => ({ x: x || 0, y: y || 0, mult: jest.fn(), add: jest.fn() }));
        global.color = jest.fn();

        player = new Player('Sidewinder');
    });

    describe('Armor Application', () => {
        let baseHull;
        beforeEach(() => { baseHull = player.maxHull; });

        test('should increase maxHull and current hull when applying armor level 1', () => {
            const armor1 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 1);
            player.applyUpgrade('armor', 1);
            expect(player.maxHull).toBe(baseHull + armor1.hullBonus);
            expect(player.hull).toBe(baseHull + armor1.hullBonus);
        });

        test('should maintain damage relative to new max when upgrading', () => {
            const armor1 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 1);
            const armor2 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 2);

            player.applyUpgrade('armor', 1);
            player.hull = 10; // Damaged

            player.applyUpgrade('armor', 2);
            // Hull should increase by difference in bonuses
            const expectedHull = 10 + (armor2.hullBonus - armor1.hullBonus);
            expect(player.hull).toBe(expectedHull);
        });

        test('should handle downgrading correctly', () => {
            const armor1 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 1);
            player.applyUpgrade('armor', 2);
            player.applyUpgrade('armor', 1);
            expect(player.maxHull).toBe(baseHull + armor1.hullBonus);
            expect(player.installedUpgrades.armor).toBe(1);
        });
    });

    describe('Engine Application', () => {
        let baseSpeed, baseThrust;
        beforeEach(() => {
            baseSpeed = player.baseMaxSpeed;
            baseThrust = player.thrustForce;
        });

        test('should increase speed and thrust', () => {
            const engine1 = SHIP_UPGRADES.find(u => u.type === 'engine' && u.level === 1);
            player.applyUpgrade('engine', 1);

            expect(Math.abs(player.baseMaxSpeed - baseSpeed * engine1.speedMultiplier)).toBeLessThan(0.1);
            expect(Math.abs(player.thrustForce - baseThrust * engine1.thrustMultiplier)).toBeLessThan(0.001);
        });
    });

    describe('Hardpoints Application', () => {
        let baseSlots;
        beforeEach(() => { baseSlots = player.maxWeapons; });

        test('should increase weapon slots', () => {
            const hp1 = SHIP_UPGRADES.find(u => u.type === 'hardpoints' && u.level === 1);
            player.applyUpgrade('hardpoints', 1);
            expect(player.maxWeapons).toBe(baseSlots + hp1.bonusSlots);
            expect(player.weapons.length).toBe(baseSlots + hp1.bonusSlots);
        });
    });

    describe('Cargo Application', () => {
        let baseCargo;
        beforeEach(() => { baseCargo = player.cargoCapacity; });

        test('should increase cargo capacity', () => {
            const cargo1 = SHIP_UPGRADES.find(u => u.type === 'cargo' && u.level === 1);
            player.applyUpgrade('cargo', 1);
            expect(player.cargoCapacity).toBe(baseCargo + cargo1.cargoBonus);
        });
    });

    describe('Shield Application', () => {
        let baseShield;
        beforeEach(() => { baseShield = player.maxShield; });

        test('should increase maxShield', () => {
            const shield1 = SHIP_UPGRADES.find(u => u.type === 'shield' && u.level === 1);
            player.applyUpgrade('shield', 1);
            expect(player.maxShield).toBe(baseShield + shield1.shieldBonus);
        });
    });

    describe('Serialization', () => {
        test('should save and load installed upgrades', () => {
            player.applyUpgrade('armor', 2);
            player.applyUpgrade('engine', 1);

            const data = player.getSaveData();
            // Restore
            const player2 = new Player('Sidewinder');
            player2.loadSaveData(data);

            expect(player2.installedUpgrades.armor).toBe(2);
            expect(player2.installedUpgrades.engine).toBe(1);

            // Stats should be re-applied on load
            const armor2 = SHIP_UPGRADES.find(u => u.type === 'armor' && u.level === 2);
            expect(player2.maxHull).toBe(player.maxHull);
        });
    });
});
