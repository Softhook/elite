const {
    WEAPON_UPGRADES,
    getWeaponProjectileCount,
    simulateWeaponPerformance,
    rankWeaponsBySimulation,
    suggestWeaponBalanceChanges
} = require('../weapons');

describe('Weapon Simulation Utilities', () => {
    test('extracts projectile counts from multi-shot weapon types', () => {
        expect(getWeaponProjectileCount('projectile')).toBe(1);
        expect(getWeaponProjectileCount('spread3')).toBe(3);
        expect(getWeaponProjectileCount('straight4')).toBe(4);
    });

    test('simulation accounts for projectile count and spread utility against movement', () => {
        const projectileWeapon = {
            name: 'Single',
            type: 'projectile',
            damage: 10,
            fireRate: 1,
            price: 1000
        };
        const spreadWeapon = {
            name: 'Spread',
            type: 'spread3',
            damage: 10,
            fireRate: 1,
            price: 1000
        };

        const movingTargetOptions = { targetSpeed: 6, engagementRange: 280, aimQuality: 0.78 };
        const singleResult = simulateWeaponPerformance(projectileWeapon, movingTargetOptions);
        const spreadResult = simulateWeaponPerformance(spreadWeapon, movingTargetOptions);

        expect(spreadResult.projectileCount).toBe(3);
        expect(spreadResult.expectedHitsPerShot).toBeGreaterThan(singleResult.expectedHitsPerShot);
        expect(spreadResult.expectedDps).toBeGreaterThan(singleResult.expectedDps);
    });

    test('simulation accounts for missile tracking and utility properties', () => {
        const weakMissile = {
            name: 'Weak Missile',
            type: 'missile',
            damage: 90,
            fireRate: 5,
            price: 1600,
            speed: 4,
            turnRate: 0.05,
            lifespan: 180,
            missileHull: 8
        };
        const guidedMissile = {
            name: 'Guided Missile',
            type: 'missile',
            damage: 90,
            fireRate: 5,
            price: 1600,
            speed: 7,
            turnRate: 0.22,
            lifespan: 400,
            missileHull: 35
        };

        const weakResult = simulateWeaponPerformance(weakMissile, { targetSpeed: 6, engagementRange: 330 });
        const guidedResult = simulateWeaponPerformance(guidedMissile, { targetSpeed: 6, engagementRange: 330 });

        expect(guidedResult.typeUtilityMultiplier).toBeGreaterThan(weakResult.typeUtilityMultiplier);
        expect(guidedResult.expectedDps).toBeGreaterThan(weakResult.expectedDps);
    });

    test('beam sustain multiplier penalizes overheating beam profiles', () => {
        const efficientBeam = {
            name: 'Efficient Beam',
            type: 'beam',
            damage: 5,
            fireRate: 0.12,
            price: 1500,
            maxHeat: 1,
            heatPerShot: 0.06,
            heatDissipation: 0.5,
            heatRecoveryFactor: 0.4
        };
        const hotBeam = {
            name: 'Hot Beam',
            type: 'beam',
            damage: 5,
            fireRate: 0.12,
            price: 1500,
            maxHeat: 1,
            heatPerShot: 0.2,
            heatDissipation: 0.2,
            heatRecoveryFactor: 0.2
        };

        const efficientResult = simulateWeaponPerformance(efficientBeam, { targetSpeed: 4, engagementRange: 300 });
        const hotResult = simulateWeaponPerformance(hotBeam, { targetSpeed: 4, engagementRange: 300 });

        expect(efficientResult.beamSustainMultiplier).toBeGreaterThan(hotResult.beamSustainMultiplier);
        expect(efficientResult.expectedDps).toBeGreaterThan(hotResult.expectedDps);
    });

    test('ranking combines cooldown-adjusted damage and cost efficiency', () => {
        const weapons = [
            { name: 'Cheap', type: 'projectile', damage: 10, fireRate: 0.4, price: 700 },
            { name: 'Expensive', type: 'projectile', damage: 10, fireRate: 0.4, price: 4000 }
        ];

        const ranked = rankWeaponsBySimulation(weapons, { targetSpeed: 4, engagementRange: 300 });
        expect(ranked).toHaveLength(2);
        expect(ranked[0].weapon.name).toBe('Cheap');
        expect(ranked[0].rank).toBe(1);
    });

    test('suggests balance adjustments for outlier weapons', () => {
        const weapons = [
            { name: 'Over', type: 'spread5', damage: 20, fireRate: 0.2, price: 1000 },
            { name: 'Under', type: 'projectile', damage: 5, fireRate: 0.8, price: 3000 },
            { name: 'Mid', type: 'projectile', damage: 8, fireRate: 0.45, price: 1400 }
        ];

        const suggestions = suggestWeaponBalanceChanges(weapons, { tolerance: 0.1, targetSpeed: 4 });
        expect(suggestions.length).toBeGreaterThan(0);

        const overSuggestion = suggestions.find(s => s.name === 'Over');
        expect(overSuggestion).toBeDefined();
        expect(overSuggestion.recommendedPrice).toBeGreaterThan(1000);
        expect(overSuggestion.suggestedDamageMultiplier).toBeLessThan(1);
        expect(overSuggestion.suggestedFireRateMultiplier).toBeGreaterThan(1);
        expect(overSuggestion.recommendedFireRate).toBeGreaterThan(0.2);
    });

    test('verifies rebalanced weapon damage/price/cooldown values from simulation pass', () => {
        const byName = (name) => WEAPON_UPGRADES.find(w => w.name === name);
        const expectedValues = [
            { name: 'Heavy Cannon', damage: 45, fireRate: 1.1, price: 4313 },
            { name: 'Multi-Cannon', damage: 7, fireRate: 0.284, price: 3450 },
            { name: 'Railgun Turret', damage: 40, fireRate: 1.109, price: 6469 },
            { name: 'Twin Pulse', damage: 5, fireRate: 0.333, price: 510 },
            { name: 'Guardian Missile', damage: 73, fireRate: 3.741, price: 1148 },
            { name: 'Harpoon Launcher', damage: 11, fireRate: 1.338, price: 2678 },
            { name: 'Sniper Rail', damage: 29, fireRate: 0.75, price: 3594 },
            { name: 'Burst Blaster', damage: 5, fireRate: 0.213, price: 2875 },
            { name: 'Heavy Mine', damage: 218, fireRate: 5.75, price: 6469 },
            { name: 'Jedi Force', damage: 81, fireRate: 2.3, price: 58363 },
            { name: 'Tangle Projector', damage: 7, fireRate: 0.451, price: 1403 }
        ];

        expectedValues.forEach(({ name, ...expected }) => {
            expect(byName(name)).toMatchObject(expected);
        });
    });
});
