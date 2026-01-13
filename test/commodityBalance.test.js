/**
 * Commodity Balance Tests
 * Jest tests for analyzing commodity price distribution and trading viability.
 * Ensures economy balance between high-value and low-value goods.
 */

require('../commodityDefinitions.js');
const { Market } = require('../market.js'); // Assuming market.js exports the class

// Market might need global p5 functions if it uses random() or similar
// checking market.js... usually it relies on Math.random or passed in RNG?
// Logic in market.js seems simple enough, but let's be safe.
// jest.setup.js should cover p5 globals if needed.

describe('Commodity Balance', () => {

    describe('Price Balance Validation', () => {

        test('should have no commodity more than 100x the minimum', () => {
            const market = new Market('Industrial');
            const commodities = market.getPrices();

            // Filter out baseBuy of 0 if any (unlikely but safe)
            const prices = commodities.map(c => c.baseBuy).filter(p => p > 0);

            expect(prices.length).toBeGreaterThan(0);

            const maxPrice = Math.max(...prices);
            const minPrice = Math.min(...prices);
            const ratio = maxPrice / minPrice;

            // 100x is a reasonable upper bound for gameplay balance (illegal goods premium)
            // If this fails, it means economy curve is too steep
            expect(ratio).toBeLessThan(100);
        });

        test('should have reasonable profit margins for all goods', () => {
            const market = new Market('Industrial');
            const commodities = market.getPrices();

            commodities.forEach(c => {
                const marginPercent = ((c.baseBuy - c.baseSell) / c.baseBuy * 100);
                // All goods should have 5-30% margin
                expect(marginPercent).toBeGreaterThan(5);
                expect(marginPercent).toBeLessThan(30);
            });
        });

        test('should ensure low-value goods are still viable for trading', () => {
            const market = new Market('Industrial');
            const commodities = market.getPrices();

            // Low-value goods (Food, Textiles, etc.) should have reasonable absolute margins
            const lowValueGoods = ['Food', 'Textiles', 'Minerals'];

            lowValueGoods.forEach(name => {
                const commodity = commodities.find(c => c.name === name);
                // Only test if the commodity exists in this economy
                if (commodity) {
                    const margin = commodity.baseBuy - commodity.baseSell;
                    // Even low-value goods should have at least 2 credits margin
                    expect(margin).toBeGreaterThan(1);
                }
            });
        });

        test('should define legal vs illegal goods distinctly', () => {
            const market = new Market('Industrial');
            const commodities = market.getPrices();

            const illegal = commodities.filter(c => !c.isLegal);
            const legal = commodities.filter(c => c.isLegal);

            expect(illegal.length).toBeGreaterThan(0);
            expect(legal.length).toBeGreaterThan(0);

            // Generally illegal goods should be more expensive/profitable
            const avgLegalPrice = legal.reduce((sum, c) => sum + c.baseBuy, 0) / legal.length;
            const avgIllegalPrice = illegal.reduce((sum, c) => sum + c.baseBuy, 0) / illegal.length;

            expect(avgIllegalPrice).toBeGreaterThan(avgLegalPrice);
        });
    });

});
