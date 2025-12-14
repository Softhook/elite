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
};

/**
 * AI Role Colors
 * Used primarily for minimap ship indicators when faction is not specified
 */
const ROLE_COLORS = {
    PIRATE: [220, 20, 20],          // Red
    POLICE: [30, 144, 255],         // Blue (DodgerBlue)
    HAULER: [255, 215, 0],          // Yellow (Gold)
    TRANSPORT: [204, 119, 34],      // Ochre
    MINER: [204, 119, 34],          // Ochre (same as transport - peaceful)
    ALIEN: [50, 205, 50],           // Green (matches ALIEN faction color)
    BOUNTY_HUNTER: [255, 140, 0],   // Bright orange (distinct from pirate red)
    GUARD: [150, 100, 255],         // Purple-blue (distinct from police blue)
    COMBAT: [255, 100, 100],        // Light red
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
