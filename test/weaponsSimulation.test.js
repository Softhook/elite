const {
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
    });
});
