// ****** colorConstants.js ******
// Centralized color definitions for factions, roles, and UI elements
// All colors are in RGB format: [r, g, b] or [r, g, b, alpha]

/**
 * Faction Colors
 * Used for both galaxy map system nodes and minimap ship indicators
 * 
 * Color Design:
 * - IMPERIAL: Purple
 * - SEPARATIST: Olive Green
 * - MILITARY: Gray
 * - ALIEN: Green
 * - POLICE: Blue
 */
const FACTION_COLORS = {
    IMPERIAL: [160, 80, 220],       // Purple
    SEPARATIST: [140, 150, 60],     // Olive Green
    MILITARY: [150, 150, 155],      // Gray
    ALIEN: [50, 220, 80],           // Green
    POLICE: [60, 140, 255],         // Blue
    POSTHUMAN: [0, 255, 255],       // Cyan
};

/**
 * AI Role Colors
 * Used primarily for minimap ship indicators when faction is not specified
 * 
 * Color Design:
 * - POLICE: Blue
 * - PIRATE: Bright Red  
 * - ALIEN: Green
 * - Commercial (Hauler/Transport/Repair): Yellow/Orange/Ochre spectrum
 * - MILITARY: Gray
 * - IMPERIAL: Purple
 * - SEPARATIST: Olive Green
 */
const ROLE_COLORS = {
    POLICE: [60, 140, 255],         // Blue
    PIRATE: [255, 50, 50],          // Bright Red
    ALIEN: [50, 220, 80],           // Green
    MILITARY: [150, 150, 155],      // Gray
    IMPERIAL: [160, 80, 220],       // Purple
    SEPARATIST: [140, 150, 60],     // Olive Green
    // Commercial ships: Yellow/Orange/Brown spectrum (spread out)
    HAULER: [255, 210, 60],         // Bright Yellow
    TRANSPORT: [255, 150, 80],      // Light Orange
    REPAIR: [180, 220, 140],        // Light Green-Yellow (distinct from browns)
    MINER: [160, 120, 80],          // Dark Brown
    // Combat-adjacent roles
    BOUNTY_HUNTER: [255, 80, 180],  // Magenta-Pink (distinct from orange)
    GUARD: [220, 200, 120],         // Light Khaki/Cream
    COMBAT: [200, 60, 100]          // Dark Pink/Maroon (distinct from pirate red)
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
