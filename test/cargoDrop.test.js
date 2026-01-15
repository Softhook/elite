const { Enemy } = require('../enemy');
require('../debug');
require('../ships');
require('../weapons');
require('../enemyConstants');
require('../enemyCargo');

// Apply mixins
if (typeof applyEnemyCargoMethods === 'function') applyEnemyCargoMethods();

describe('Cargo Drop Reduction Tests', () => {
    let mockSystem;
    let mockEnemy;

    beforeEach(() => {
        // Mock p5 globals
        global.createVector = jest.fn((x, y) => ({
            x: x || 0,
            y: y || 0,
            add: jest.fn().mockReturnThis(),
            mult: jest.fn().mockReturnThis(),
            copy: jest.fn().mockReturnThis()
        }));
        global.random = jest.fn((min, max) => {
            if (Array.isArray(min)) return min[0];
            if (typeof max === 'undefined') return typeof min === 'undefined' ? 0.5 : min * 0.5;
            return min + (max - min) * 0.5;
        });
        global.floor = Math.floor;
        global.max = Math.max;
        global.min = Math.min;
        global.cos = Math.cos;
        global.sin = Math.sin;
        global.TWO_PI = Math.PI * 2;

        global.p5 = {
            Vector: {
                mult: (v, n) => ({ x: v.x * n, y: v.y * n }),
                random2D: () => ({ x: 1, y: 0, mult: jest.fn().mockReturnThis() })
            }
        };

        // Mock Cargo class
        global.Cargo = class Cargo {
            constructor(x, y, type, quantity) {
                this.type = type;
                this.quantity = quantity;
                this.pos = { x, y };
                this.vel = { x: 0, y: 0 };
            }
        };

        // Mock System
        mockSystem = {
            addCargo: jest.fn().mockReturnValue(true),
            cargo: []
        };

        // Mock Ship Definitions
        global.SHIP_DEFINITIONS = {
            'Sidewinder': { cargoCapacity: 10, typicalCargo: ['Food', 'Textiles'] }
        };

        // Create Enemy
        mockEnemy = new Enemy(0, 0, null, 'Sidewinder', 'PIRATE');
        mockEnemy.getSystem = () => mockSystem;
        mockEnemy.size = 20;
        mockEnemy.pos = global.createVector(0, 0);
        mockEnemy.vel = global.createVector(0, 0);

        // Mock UI Manager
        global.uiManager = { addMessage: jest.fn() };
        global.CARGO_LOG = jest.fn();
    });

    describe('_spawnCargo reduction logic', () => {
        test('should reduce high-value illegal goods to 33%', () => {
            const highValue = ['Narcotics', 'Weapons', 'Slaves'];
            const quantity = 100;

            highValue.forEach(type => {
                mockSystem.addCargo.mockClear();
                mockEnemy._spawnCargo('destruction', { type, quantity });

                // Expect call to addCargo
                const cargoObj = mockSystem.addCargo.mock.calls[0][0];
                expect(cargoObj.type).toBe(type);
                // 100 * 0.33 = 33
                expect(cargoObj.quantity).toBe(33);
            });
        });

        test('should reduce medium-value goods to 50%', () => {
            const mediumValue = ['Luxury Goods', 'Adv Components', 'Computers'];
            const quantity = 100;

            mediumValue.forEach(type => {
                mockSystem.addCargo.mockClear();
                mockEnemy._spawnCargo('destruction', { type, quantity });

                const cargoObj = mockSystem.addCargo.mock.calls[0][0];
                expect(cargoObj.type).toBe(type);
                // 100 * 0.5 = 50
                expect(cargoObj.quantity).toBe(50);
            });
        });

        test('should NOT reduce low-value goods', () => {
            const lowValue = ['Food', 'Textiles', 'Machinery', 'Metals'];
            const quantity = 100;

            lowValue.forEach(type => {
                mockSystem.addCargo.mockClear();
                mockEnemy._spawnCargo('destruction', { type, quantity });

                const cargoObj = mockSystem.addCargo.mock.calls[0][0];
                expect(cargoObj.type).toBe(type);
                expect(cargoObj.quantity).toBe(100);
            });
        });

        test('should never reduce below 1 unit', () => {
            const type = 'Narcotics'; // High value, reduces to 33%
            const quantity = 1;

            mockEnemy._spawnCargo('destruction', { type, quantity });

            const cargoObj = mockSystem.addCargo.mock.calls[0][0];
            expect(cargoObj.quantity).toBe(1);
        });

        test('should NOT reduce if context is not destruction', () => {
            const type = 'Narcotics';
            const quantity = 100;

            // 'jettison' context should not trigger reduction
            mockEnemy._spawnCargo('jettison', { type, quantity });

            const cargoObj = mockSystem.addCargo.mock.calls[0][0];
            expect(cargoObj.quantity).toBe(100);
        });
    });
});
