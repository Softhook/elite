// ****** commodityDefinitions.js ******
// Centralized commodity definitions - single source of truth for all commodity-related data

/**
 * Complete commodity definitions with base prices, legal status, and base stock levels.
 * This is the single source of truth for commodity data used throughout the game.
 */
const COMMODITY_DEFINITIONS = [
    // Name, Base Buy, Base Sell, Base Stock, Legal Status
    { name: 'Food', baseBuy: 10, baseSell: 8, baseStock: 480, isLegal: true },
    { name: 'Textiles', baseBuy: 15, baseSell: 12, baseStock: 360, isLegal: true },
    { name: 'Machinery', baseBuy: 100, baseSell: 90, baseStock: 120, isLegal: true },
    { name: 'Metals', baseBuy: 50, baseSell: 40, baseStock: 260, isLegal: true },
    { name: 'Minerals', baseBuy: 40, baseSell: 30, baseStock: 240, isLegal: true },
    { name: 'Chemicals', baseBuy: 70, baseSell: 60, baseStock: 140, isLegal: true },
    { name: 'Computers', baseBuy: 200, baseSell: 180, baseStock: 90, isLegal: true },
    { name: 'Medicine', baseBuy: 120, baseSell: 105, baseStock: 110, isLegal: true },
    { name: 'Adv Components', baseBuy: 280, baseSell: 250, baseStock: 60, isLegal: true },
    { name: 'Luxury Goods', baseBuy: 320, baseSell: 290, baseStock: 40, isLegal: true },
    { name: 'Narcotics', baseBuy: 700, baseSell: 620, baseStock: 30, isLegal: false },
    { name: 'Weapons', baseBuy: 760, baseSell: 680, baseStock: 55, isLegal: false },
    { name: 'Slaves', baseBuy: 800, baseSell: 720, baseStock: 18, isLegal: false },
];

/**
 * Default base stock level for commodities (fallback value).
 */
const DEFAULT_BASE_STOCK = 120;

/**
 * Get commodity definition by name.
 * @param {string} name - The commodity name
 * @returns {Object|null} The commodity definition or null if not found
 */
function getCommodityDefinition(name) {
    return COMMODITY_DEFINITIONS.find(c => c.name === name) || null;
}

/**
 * Get base buy price for a commodity.
 * @param {string} name - The commodity name
 * @returns {number} The base buy price, or 50 as fallback
 */
function getCommodityBaseBuyPrice(name) {
    const def = getCommodityDefinition(name);
    return def ? def.baseBuy : 50;
}

/**
 * Get base sell price for a commodity.
 * @param {string} name - The commodity name
 * @returns {number} The base sell price, or 40 as fallback
 */
function getCommodityBaseSellPrice(name) {
    const def = getCommodityDefinition(name);
    return def ? def.baseSell : 40;
}

/**
 * Get base stock level for a commodity.
 * @param {string} name - The commodity name
 * @returns {number} The base stock level
 */
function getCommodityBaseStock(name) {
    const def = getCommodityDefinition(name);
    return def ? def.baseStock : DEFAULT_BASE_STOCK;
}

/**
 * Get all commodity names.
 * @returns {Array<string>} Array of commodity names
 */
function getAllCommodityNames() {
    return COMMODITY_DEFINITIONS.map(c => c.name);
}

/**
 * Get all legal commodities.
 * @returns {Array<string>} Array of legal commodity names
 */
function getLegalCommodities() {
    return COMMODITY_DEFINITIONS.filter(c => c.isLegal).map(c => c.name);
}

/**
 * Get all illegal commodities.
 * @returns {Array<string>} Array of illegal commodity names
 */
function getIllegalCommodities() {
    return COMMODITY_DEFINITIONS.filter(c => !c.isLegal).map(c => c.name);
}

/**
 * Check if a commodity is legal.
 * @param {string} name - The commodity name
 * @returns {boolean} True if legal, false otherwise
 */
function isCommodityLegal(name) {
    const def = getCommodityDefinition(name);
    return def ? def.isLegal : true;
}
