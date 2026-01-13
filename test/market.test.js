/**
 * Market Tests
 * Jest tests for Market class: buy/sell mechanics, pricing, stock management, and economy types.
 */

// Load source files
require('../commodityDefinitions.js');
require('../market.js');

// ============================================
// Test Helpers
// ============================================

function createMockPlayer(credits = 10000, cargo = [], cargoCapacity = 50) {
    return {
        credits,
        cargo,
        cargoCapacity,
        addCredits(amount) { this.credits += Math.floor(amount); },
        spendCredits(amount) {
            amount = Math.floor(amount);
            if (this.credits >= amount) {
                this.credits -= amount;
                return true;
            }
            return false;
        },
        getCargoAmount() {
            return this.cargo.reduce((sum, item) => sum + (item.quantity || 0), 0);
        },
        addCargo(name, quantity) {
            const existing = this.cargo.find(c => c.name === name);
            if (existing) {
                existing.quantity += quantity;
            } else {
                this.cargo.push({ name, quantity });
            }
        },
        removeCargo(name, quantity) {
            const item = this.cargo.find(c => c.name === name);
            if (item && item.quantity >= quantity) {
                item.quantity -= quantity;
                if (item.quantity <= 0) {
                    this.cargo = this.cargo.filter(c => c.name !== name);
                }
            }
        }
    };
}

// ============================================
// Market Construction Tests
// ============================================

describe('Market Construction', () => {
    test('should create market with economy type', () => {
        const market = new Market('Industrial');
        expect(market).toBeDefined();
        expect(market.systemType).toBe('Industrial');
    });

    test('should create market with default economy', () => {
        const market = new Market('Unknown');
        expect(market).toBeDefined();
    });

    test('should initialize commodities array', () => {
        const market = new Market('Industrial');
        expect(market.commodities).toBeDefined();
        expect(Array.isArray(market.commodities)).toBe(true);
    });

    test('should have different commodities', () => {
        const market = new Market('Industrial');
        const names = market.commodities.map(g => g.name);
        expect(names).toContain('Food');
        expect(names).toContain('Metals');
    });

    test('should set stock based on economy type', () => {
        const industrial = new Market('Industrial');
        const agricultural = new Market('Agricultural');

        const indMetals = industrial.commodities.find(g => g.name === 'Metals');
        const agMetals = agricultural.commodities.find(g => g.name === 'Metals');

        expect(indMetals.stock).toBeDefined();
        expect(agMetals.stock).toBeDefined();
    });
});

// ============================================
// Market Pricing Tests
// ============================================

describe('Market Pricing', () => {
    test('should have buy and sell prices for commodities', () => {
        const market = new Market('Industrial');
        for (const good of market.commodities) {
            expect(good.buyPrice).toBeDefined();
            expect(good.sellPrice).toBeDefined();
        }
    });

    test('should have buy price >= sell price', () => {
        const market = new Market('Industrial');
        for (const good of market.commodities) {
            expect(good.buyPrice).toBeGreaterThanOrEqual(good.sellPrice);
        }
    });

    test('should update prices based on economy', () => {
        const market = new Market('Agricultural');
        market.updatePrices();

        const food = market.commodities.find(g => g.name === 'Food');
        expect(food.buyPrice).toBeDefined();
    });

    test('should vary prices between different economy types', () => {
        const industrial = new Market('Industrial');
        const agricultural = new Market('Agricultural');

        industrial.updatePrices();
        agricultural.updatePrices();

        const indFood = industrial.commodities.find(g => g.name === 'Food');
        const agFood = agricultural.commodities.find(g => g.name === 'Food');

        // Agricultural should have cheaper food (produces it)
        expect(agFood.buyPrice).toBeLessThanOrEqual(indFood.buyPrice);
    });
});

// ============================================
// Market Buy Tests
// ============================================

describe('Market Buying', () => {
    let market;
    let player;

    beforeEach(() => {
        market = new Market('Industrial');
        market.updatePrices();
        player = createMockPlayer(10000, [], 50);

        // Ensure market has stock
        const food = market.commodities.find(g => g.name === 'Food');
        if (food) food.stock = 100;
    });

    test('should have buy method', () => {
        expect(typeof market.buy).toBe('function');
    });

    test('should allow buying when player has credits', () => {
        const result = market.buy('Food', 5, player);
        expect(result).toBe(true);
    });

    test('should deduct credits when buying', () => {
        const initialCredits = player.credits;
        market.buy('Food', 5, player);
        expect(player.credits).toBeLessThan(initialCredits);
    });

    test('should reduce market stock when buying', () => {
        const food = market.commodities.find(g => g.name === 'Food');
        const initialStock = food.stock;
        market.buy('Food', 5, player);
        expect(food.stock).toBe(initialStock - 5);
    });

    test('should fail when insufficient credits', () => {
        player.credits = 1;
        const result = market.buy('Luxury Goods', 100, player);
        expect(result).toBe(false);
    });

    test('should fail when cargo full', () => {
        player.cargoCapacity = 5;
        player.cargo = [{ name: 'Metals', quantity: 5 }];
        const result = market.buy('Food', 1, player);
        expect(result).toBe(false);
    });
});

// ============================================
// Market Sell Tests
// ============================================

describe('Market Selling', () => {
    let market;
    let player;

    beforeEach(() => {
        market = new Market('Industrial');
        market.updatePrices();
        player = createMockPlayer(1000, [{ name: 'Food', quantity: 20 }], 50);
    });

    test('should have sell method', () => {
        expect(typeof market.sell).toBe('function');
    });

    test('should allow selling cargo player has', () => {
        const result = market.sell('Food', 5, player);
        expect(result).toBe(true);
    });

    test('should add credits when selling', () => {
        const initialCredits = player.credits;
        market.sell('Food', 5, player);
        expect(player.credits).toBeGreaterThan(initialCredits);
    });

    test('should increase market stock when selling', () => {
        const food = market.commodities.find(g => g.name === 'Food');
        const initialStock = food.stock;
        market.sell('Food', 5, player);
        expect(food.stock).toBe(initialStock + 5);
    });

    test('should reduce player cargo when selling', () => {
        market.sell('Food', 5, player);
        const food = player.cargo.find(c => c.name === 'Food');
        expect(food.quantity).toBe(15);
    });

    test('should fail when player lacks cargo', () => {
        player.cargo = [];
        const result = market.sell('Food', 5, player);
        expect(result).toBe(false);
    });

    test('should fail when selling more than owned', () => {
        const result = market.sell('Food', 100, player);
        expect(result).toBe(false);
    });
});

// ============================================
// Market Stock Tests
// ============================================

describe('Market Stock Management', () => {
    let market;

    beforeEach(() => {
        market = new Market('Industrial');
    });

    test('should have getAvailableStock method', () => {
        expect(typeof market.getAvailableStock).toBe('function');
    });

    test('should return stock for commodity', () => {
        const food = market.commodities.find(g => g.name === 'Food');
        food.stock = 50;
        const stock = market.getAvailableStock('Food');
        expect(stock).toBe(50);
    });

    test('should return 0 for unknown commodity', () => {
        const stock = market.getAvailableStock('FakeCommodity');
        expect(stock).toBe(0);
    });

    test('should have addStockFromNPC method', () => {
        expect(typeof market.addStockFromNPC).toBe('function');
    });

    test('should add stock from NPC', () => {
        const food = market.commodities.find(g => g.name === 'Food');
        const initialStock = food.stock;
        market.addStockFromNPC('Food', 10);
        expect(food.stock).toBe(initialStock + 10);
    });

    test('should have consumeStockForNPC method', () => {
        expect(typeof market.consumeStockForNPC).toBe('function');
    });

    test('should consume stock for NPC', () => {
        const food = market.commodities.find(g => g.name === 'Food');
        food.stock = 50;
        market.consumeStockForNPC('Food', 10);
        expect(food.stock).toBe(40);
    });

    test('should not consume stock below zero', () => {
        const food = market.commodities.find(g => g.name === 'Food');
        food.stock = 5;
        const consumed = market.consumeStockForNPC('Food', 10, { allowPartial: true });
        expect(consumed).toBe(5);
        expect(food.stock).toBe(0);
    });
});

// ============================================
// Illegal Goods Tests
// ============================================

describe('Illegal Goods', () => {
    let market;
    let player;

    beforeEach(() => {
        market = new Market('Industrial');
        player = createMockPlayer(10000, [], 50);
    });

    test('should identify illegal goods', () => {
        const narcotics = market.commodities.find(g => g.name === 'Narcotics');
        if (narcotics) {
            expect(narcotics.isLegal).toBe(false);
        }
    });

    test('should allow buying illegal goods if available', () => {
        const weapons = market.commodities.find(g => g.name === 'Weapons');
        if (weapons && weapons.stock > 0) {
            const result = market.buy('Weapons', 1, player);
            expect(result).toBe(true);
            const playerWeapons = player.cargo.find(c => c.name === 'Weapons');
            expect(playerWeapons).toBeDefined();
        }
    });
});

// ============================================
// Dynamic Stock Tests
// ============================================

describe('Dynamic Stock Updates', () => {
    let market;

    beforeEach(() => {
        market = new Market('Agricultural');
    });

    test('should have updateDynamicStock method', () => {
        expect(typeof market.updateDynamicStock).toBe('function');
    });

    test('should update stock over time', () => {
        // This tests the drift mechanic - should not throw
        expect(() => market.updateDynamicStock(100)).not.toThrow();
    });

    test('should have stock trend accumulator', () => {
        expect(market._stockTrendAccumulator).toBeDefined();
    });
});

// ============================================
// Economy Type Tests
// ============================================

describe('Economy Types', () => {
    test('should handle Industrial economy', () => {
        const market = new Market('Industrial');
        expect(market.systemType).toBe('Industrial');
    });

    test('should handle Agricultural economy', () => {
        const market = new Market('Agricultural');
        expect(market.systemType).toBe('Agricultural');
    });

    test('should handle Mining economy', () => {
        const market = new Market('Mining');
        expect(market.systemType).toBe('Mining');
    });

    test('should handle Service economy', () => {
        const market = new Market('Service');
        expect(market.systemType).toBe('Service');
    });

    test('should have setEconomyType method', () => {
        const market = new Market('Industrial');
        expect(typeof market.setEconomyType).toBe('function');
    });

    test('should change economy type', () => {
        const market = new Market('Industrial');
        market.setEconomyType('Agricultural');
        expect(market.systemType).toBe('Agricultural');
    });
});

// ============================================
// Market Serialization Tests
// ============================================

describe('Market Serialization', () => {
    let market;

    beforeEach(() => {
        market = new Market('Industrial');
        market.updatePrices();
    });

    test('should have toJSON method', () => {
        expect(typeof market.toJSON).toBe('function');
    });

    test('should serialize to JSON', () => {
        const json = market.toJSON();
        expect(json).toBeDefined();
        expect(json.systemType).toBe('Industrial');
    });

    test('should serialize commodities', () => {
        const json = market.toJSON();
        expect(json.commodities).toBeDefined();
        expect(Array.isArray(json.commodities)).toBe(true);
    });

    test('should have static fromJSON method', () => {
        expect(typeof Market.fromJSON).toBe('function');
    });

    test('should deserialize from JSON', () => {
        const json = market.toJSON();
        const newMarket = Market.fromJSON(json);
        expect(newMarket.systemType).toBe('Industrial');
    });

    test('should round-trip serialization', () => {
        const food = market.commodities.find(g => g.name === 'Food');
        food.stock = 42;

        const json = market.toJSON();
        const restored = Market.fromJSON(json);

        const restoredFood = restored.commodities.find(g => g.name === 'Food');
        expect(restoredFood.stock).toBe(42);
    });
});

// ============================================
// Player Cargo Display Tests
// ============================================

describe('Player Cargo Display', () => {
    let market;
    let player;

    beforeEach(() => {
        market = new Market('Industrial');
        player = createMockPlayer(1000, [{ name: 'Food', quantity: 15 }], 50);
    });

    test('should have updatePlayerCargo method', () => {
        expect(typeof market.updatePlayerCargo).toBe('function');
    });

    test('should update playerStock on goods', () => {
        market.updatePlayerCargo(player.cargo);
        const food = market.commodities.find(g => g.name === 'Food');
        expect(food.playerStock).toBe(15);
    });

    test('should set zero for goods player does not have', () => {
        market.updatePlayerCargo(player.cargo);
        const metals = market.commodities.find(g => g.name === 'Metals');
        expect(metals.playerStock).toBe(0);
    });
});

// ============================================
// Get Prices Tests
// ============================================

describe('Get Prices', () => {
    test('should have getPrices method', () => {
        const market = new Market('Industrial');
        expect(typeof market.getPrices).toBe('function');
    });

    test('should return copy of goods', () => {
        const market = new Market('Industrial');
        const prices = market.getPrices();
        expect(prices).toBeDefined();
        expect(Array.isArray(prices)).toBe(true);
    });

    test('should include all commodities', () => {
        const market = new Market('Industrial');
        const prices = market.getPrices();
        const names = prices.map(p => p.name);
        expect(names).toContain('Food');
        expect(names).toContain('Metals');
    });
});

// ============================================
// Economy Stock Behavior Tests
// ============================================

describe('Economy Stock Behavior', () => {
    test('should have ECONOMY_STOCK_BEHAVIOR constant', () => {
        expect(ECONOMY_STOCK_BEHAVIOR).toBeDefined();
    });

    test('should define behavior for Agricultural', () => {
        expect(ECONOMY_STOCK_BEHAVIOR.Agricultural).toBeDefined();
        expect(ECONOMY_STOCK_BEHAVIOR.Agricultural.replenish).toBeDefined();
        expect(ECONOMY_STOCK_BEHAVIOR.Agricultural.consume).toBeDefined();
    });

    test('should define behavior for Industrial', () => {
        expect(ECONOMY_STOCK_BEHAVIOR.Industrial).toBeDefined();
        expect(ECONOMY_STOCK_BEHAVIOR.Industrial.replenish).toBeDefined();
        expect(ECONOMY_STOCK_BEHAVIOR.Industrial.consume).toBeDefined();
    });

    test('should define behavior for Mining', () => {
        expect(ECONOMY_STOCK_BEHAVIOR.Mining).toBeDefined();
    });

    test('should have default behavior', () => {
        expect(ECONOMY_STOCK_BEHAVIOR.default).toBeDefined();
    });
});
