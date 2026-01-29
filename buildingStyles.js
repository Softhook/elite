// ****** buildingStyles.js ******
// Data-driven building style definitions for surface mode
// Replaces 10 building subclasses with configuration objects

/**
 * Building style configuration
 * Each style defines colors, health, and variant renderer functions
 */
const BUILDING_STYLES = {
    IMPERIAL: {
        type: "Imperial Structure",
        maxHealth: 300,
        heightMultiplier: [2, 5], // min, max
        variantSeedMultiplier: 7.89,
        variantCount: 5,
        colors: {
            primary: [200, 170, 80],  // Gold
            accent: [160, 80, 220],    // Purple
            stone: [220, 215, 200]     // White marble
        }
    },

    SEPARATIST: {
        type: "Separatist Outpost",
        maxHealth: 250,
        heightMultiplier: [0.8, 2.3],
        variantSeedMultiplier: 5.67,
        variantCount: 5,
        colors: {
            primary: [120, 80, 50],   // Rust brown
            accent: [180, 100, 40],   // Orange
            metal: [90, 85, 80]       // Scrap metal
        }
    },

    MILITARY: {
        type: "Military Installation",
        maxHealth: 350,
        heightMultiplier: [1.5, 4],
        variantSeedMultiplier: 3.14,
        variantCount: 5,
        colors: {
            primary: [70, 80, 60],    // Olive drab
            accent: [50, 50, 50],     // Dark gray
            metal: [80, 80, 85]       // Steel
        }
    },

    POSTHUMAN: {
        type: "Posthuman Structure",
        maxHealth: 400,
        heightMultiplier: [2, 5],
        variantSeedMultiplier: 9.99,
        variantCount: 5,
        colors: {
            primary: [0, 200, 220],   // Cyan
            accent: [180, 50, 200],   // Magenta
            glow: [100, 255, 255]     // Bright cyan glow
        }
    },

    OFFWORLD: {
        type: "Offworld Colony",
        maxHealth: 280,
        heightMultiplier: [1, 3.5],
        variantSeedMultiplier: 4.56,
        variantCount: 5,
        colors: {
            primary: [180, 180, 190],  // Silver
            accent: [100, 150, 200],   // Blue
            metal: [160, 165, 170]     // Aluminum
        }
    },

    MINING: {
        type: "Mining Facility",
        maxHealth: 300,
        heightMultiplier: [1.2, 4],
        variantSeedMultiplier: 6.28,
        variantCount: 5,
        colors: {
            primary: [180, 150, 50],   // Yellow machinery
            accent: [200, 100, 30],    // Orange
            metal: [100, 100, 105]     // Industrial metal
        }
    },

    INDUSTRIAL: {
        type: "Industrial Complex",
        maxHealth: 320,
        heightMultiplier: [1.5, 4],
        variantSeedMultiplier: 2.71,
        variantCount: 5,
        colors: {
            primary: [120, 120, 140],  // Industrial gray
            accent: [200, 80, 40],     // Warning orange
            metal: [90, 90, 95]        // Dark metal
        }
    },

    REFINERY: {
        type: "Refinery",
        maxHealth: 280,
        heightMultiplier: [2, 5],
        variantSeedMultiplier: 8.31,
        variantCount: 5,
        colors: {
            primary: [150, 140, 130],  // Concrete
            accent: [200, 160, 40],    // Industrial yellow
            metal: [110, 100, 95]      // Weathered metal
        }
    },

    AGRICULTURAL: {
        type: "Agricultural Facility",
        maxHealth: 200,
        heightMultiplier: [0.8, 2.5],
        variantSeedMultiplier: 1.23,
        variantCount: 5,
        colors: {
            primary: [160, 120, 80],   // Wood
            accent: [100, 180, 80],    // Green (plants)
            metal: [180, 170, 160]     // Light metal
        }
    },

    SERVICE: {
        type: "Service Building",
        maxHealth: 250,
        heightMultiplier: [1, 3],
        variantSeedMultiplier: 5.55,
        variantCount: 5,
        colors: {
            primary: [140, 150, 160],  // Neutral gray
            accent: [80, 150, 200],    // Blue signage
            metal: [120, 125, 130]     // Standard metal
        }
    }
};

/**
 * Get a building style configuration by faction or type
 * @param {string} styleKey - Key from BUILDING_STYLES enum
 * @returns {Object} Building style configuration
 */
function getBuildingStyle(styleKey) {
    return BUILDING_STYLES[styleKey] || BUILDING_STYLES.SERVICE;
}

// Make available globally
if (typeof window !== 'undefined') {
    window.BUILDING_STYLES = BUILDING_STYLES;
    window.getBuildingStyle = getBuildingStyle;
}

// For Node.js (testing)
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { BUILDING_STYLES, getBuildingStyle };
}

console.log("buildingStyles.js loaded");
