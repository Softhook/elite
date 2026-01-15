// Mock p5 globals first
global.window = global; // Fix for spawnConfig assigning to window
global.color = jest.fn((r, g, b, a) => ({ r, g, b, a }));
global.createVector = jest.fn((x, y) => ({ x: x || 0, y: y || 0, mult: jest.fn() }));
global.Draw3D = {
    drawPrism: jest.fn(),
    drawBox3D: jest.fn(),
    drawCylinder: jest.fn(),
    drawDome: jest.fn(),
    drawCone: jest.fn(),
    drawExtrudedShape: jest.fn()
};
global.push = jest.fn();
global.pop = jest.fn();
global.noFill = jest.fn();
global.stroke = jest.fn();
global.strokeWeight = jest.fn();
global.ellipse = jest.fn();

const { PROBABILITIES, SECURITY_MODIFIERS, getProbabilities } = require('../spawnConfig');
const { SHIP_DEFINITIONS } = require('../ships');

describe('Spawn Configuration Validation', () => {

    describe('Probability Configuration', () => {
        test('Probabilities sum to ~100%', () => {
            for (const [economy, roles] of Object.entries(PROBABILITIES)) {
                let total = 0;
                for (const prob of Object.values(roles)) {
                    total += prob;
                }
                const percent = Math.round(total * 100);
                // Allow +/- 1% tolerance
                expect(percent).toBeGreaterThanOrEqual(99);
                expect(percent).toBeLessThanOrEqual(101);
            }
        });

        test('Security Modifiers sum to ~100%', () => {
            for (const [level, roles] of Object.entries(SECURITY_MODIFIERS)) {
                let total = 0;
                for (const prob of Object.values(roles)) {
                    total += prob;
                }
                const percent = Math.round(total * 100);
                expect(percent).toBeGreaterThanOrEqual(99);
                expect(percent).toBeLessThanOrEqual(101);
            }
        });
    });

    describe('Ship Role Arrays', () => {
        let roleArrays;

        beforeAll(() => {
            // Logic mirrored from starSystem.js / HTML test
            roleArrays = {
                POLICE_SHIPS: [], PIRATE_SHIPS: [], HAULER_SHIPS: [], TRANSPORT_SHIPS: [],
                MILITARY_SHIPS: [], ALIEN_SHIPS: [], BOUNTY_HUNTER_SHIPS: [], GUARD_SHIPS: [],
                IMPERIAL_SHIPS: [], SEPARATIST_SHIPS: [], COMBAT_SHIPS: [], MINER_SHIPS: [],
                REPAIR_SHIPS: [], MISSIONARY_SHIPS: [], HEALER_SHIPS: [],
                IMPERIAL_HAULERS: [], SEPARATIST_HAULERS: [], MILITARY_HAULERS: []
            };

            for (const [shipKey, shipData] of Object.entries(SHIP_DEFINITIONS)) {
                if (!shipData.aiRoles || !Array.isArray(shipData.aiRoles)) continue;

                for (const role of shipData.aiRoles) {
                    const arrayKey = `${role}_SHIPS`;
                    if (roleArrays[arrayKey]) {
                        roleArrays[arrayKey].push(shipKey);
                    }
                }

                // Faction-specific arrays
                if (shipData.faction) {
                    if (shipData.aiRoles.includes('COMBAT')) {
                        if (shipData.faction === 'IMPERIAL' && !roleArrays.IMPERIAL_SHIPS.includes(shipKey)) roleArrays.IMPERIAL_SHIPS.push(shipKey);
                        if (shipData.faction === 'SEPARATIST' && !roleArrays.SEPARATIST_SHIPS.includes(shipKey)) roleArrays.SEPARATIST_SHIPS.push(shipKey);
                        if (shipData.faction === 'MILITARY' && !roleArrays.MILITARY_SHIPS.includes(shipKey)) roleArrays.MILITARY_SHIPS.push(shipKey);
                    }
                    if (shipData.aiRoles.includes('HAULER')) {
                        if (shipData.faction === 'IMPERIAL') roleArrays.IMPERIAL_HAULERS.push(shipKey);
                        if (shipData.faction === 'SEPARATIST') roleArrays.SEPARATIST_HAULERS.push(shipKey);
                        if (shipData.faction === 'MILITARY') roleArrays.MILITARY_HAULERS.push(shipKey);
                    }
                }
            }
        });

        test('Role to Ship Mapping Verification', () => {
            const roleTests = [
                { roleKey: 'COMBAT', arrays: ['COMBAT_SHIPS', 'MILITARY_SHIPS'] },
                { roleKey: 'FACTION_COMBAT', arrays: ['SEPARATIST_SHIPS', 'IMPERIAL_SHIPS'] },
                { roleKey: 'RIVAL_COMBAT', arrays: ['SEPARATIST_SHIPS', 'IMPERIAL_SHIPS', 'PIRATE_SHIPS'] },
                { roleKey: 'PIRATE', arrays: ['PIRATE_SHIPS'] },
                { roleKey: 'POLICE', arrays: ['POLICE_SHIPS'] },
                { roleKey: 'HAULER', arrays: ['HAULER_SHIPS', 'MILITARY_HAULERS'] },
                { roleKey: 'FACTION_HAULER', arrays: ['SEPARATIST_HAULERS', 'IMPERIAL_HAULERS', 'HAULER_SHIPS'] },
                { roleKey: 'MINER', arrays: ['MINER_SHIPS'] },
                { roleKey: 'TRANSPORT', arrays: ['TRANSPORT_SHIPS'] },
                { roleKey: 'ALIEN', arrays: ['ALIEN_SHIPS'] },
                { roleKey: 'HEALER', arrays: ['HEALER_SHIPS'] },
                { roleKey: 'MISSIONARY', arrays: ['MISSIONARY_SHIPS'] }
            ];

            for (const testConfig of roleTests) {
                let totalShips = 0;
                for (const arrayName of testConfig.arrays) {
                    totalShips += roleArrays[arrayName].length;
                }
                // Verify we have at least one ship definition for every role type
                expect(totalShips).toBeGreaterThan(0);
            }
        });
    });

    describe('Security Slot Resolution', () => {
        test('SECURITY_SLOT should be resolved to POLICE/PIRATE', () => {
            const economies = Object.keys(PROBABILITIES);
            const securityLevels = ['HIGH', 'MEDIUM', 'LOW', 'ANARCHY'];

            economies.forEach(economy => {
                const baseProbs = PROBABILITIES[economy];
                if (baseProbs.SECURITY_SLOT > 0) {
                    securityLevels.forEach(security => {
                        const resolved = getProbabilities(economy, security);

                        // Should have removed the slot
                        expect(resolved.SECURITY_SLOT).toBeUndefined();

                        // Should have added police and pirate probabilities
                        // Assuming non-zero distribution in SECURITY_MODIFIERS
                        if (SECURITY_MODIFIERS[security].POLICE > 0) {
                            expect(resolved.POLICE).toBeGreaterThan(0);
                        }
                        if (SECURITY_MODIFIERS[security].PIRATE > 0) {
                            expect(resolved.PIRATE).toBeGreaterThan(0);
                        }
                    });
                }
            });
        });
    });
});
