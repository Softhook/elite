// ****** colorConstants.js ******
// Centralized color definitions for factions, roles, and UI elements
// All colors are in RGB format: [r, g, b] or [r, g, b, alpha]

/**
 * Faction Colors
 * Used for both galaxy map system nodes and minimap ship indicators
 */
const FACTION_COLORS = {
    IMPERIAL: [255, 235, 180],      // White gold
    SEPARATIST: [128, 128, 0],      // Olive
    MILITARY: [160, 160, 170],      // Neutral gray
    ALIEN: [50, 205, 50],           // Green
    POLICE: [30, 144, 255],         // Dodger Blue
};

/**
 * AI Role Colors
 * Used primarily for minimap ship indicators when faction is not specified
 */
const ROLE_COLORS = {
    POLICE: [30, 144, 255],     // Dodger Blue
    HAULER: [255, 215, 0],      // Gold
    PIRATE: [220, 20, 20],      // Crimson Red
    ALIEN: [0, 255, 150],       // Alien Green
    BOUNTY_HUNTER: [255, 165, 0], // Orange
    TRANSPORT: [100, 180, 255], // Light Blue
    MILITARY: [80, 160, 80],    // Military Green
    IMPERIAL: [200, 50, 50],    // Imperial Red
    SEPARATIST: [50, 80, 200],  // Separatist Blue
    MINER: [180, 140, 100],     // Bronze/Copper
    REPAIR: [100, 255, 200]     // Cyan/Green repair color
};

/**
 * Economy Type Colors
 * Used for galaxy map system nodes
 * Format: [r, g, b, alpha]
 */
const ECONOMY_COLORS = {
    Industrial: [60, 120, 200, 210],        // Blue
    Agricultural: [180, 120, 40, 210],      // Brown/Orange
    Mining: [160, 160, 170, 210],           // Light Grey/Silver
    Refinery: [160, 40, 40, 210],           // Maroon
    "Post Human": [0, 200, 200, 210],       // Cyan
    Tourism: [200, 80, 200, 210],           // Purple/Pink
    Service: [200, 255, 255, 210],          // Light cyan
    Military: [160, 160, 170, 210],         // Neutral gray (matches MILITARY faction)
    Offworld: [100, 180, 100, 210],         // Light Green

    // Faction-based economies
    Separatist: [128, 128, 0, 210],         // Olive (matches faction)
    Imperial: [255, 235, 180, 210],         // White gold (matches faction)
    Alien: [50, 205, 50, 210],              // Green (matches faction)

    Default: [150, 150, 150, 210]           // Default grey if type unknown
};

/**
 * Helper function to get faction color
 * @param {string} factionName - Name of the faction (e.g., 'IMPERIAL', 'SEPARATIST')
 * @returns {Array} RGB color array [r, g, b]
 */
function getFactionColor(factionName) {
    return FACTION_COLORS[factionName] || [150, 150, 150]; // Default gray
}

/**
 * Helper function to get role color
 * @param {string} roleName - Name of the AI role (e.g., 'PIRATE', 'POLICE')
 * @returns {Array} RGB color array [r, g, b]
 */
function getRoleColor(roleName) {
    return ROLE_COLORS[roleName] || [255, 0, 0]; // Default red
}

/**
 * Helper function to get economy color
 * @param {string} economyType - Name of the economy type
 * @returns {Array} RGBA color array [r, g, b, alpha]
 */
function getEconomyColor(economyType) {
    return ECONOMY_COLORS[economyType] || ECONOMY_COLORS.Default;
}
