// ****** spawnConfig.js ******
// Centralized Spawn Probability Configuration
// Defines spawn chances for different system types and security levels

// Security level modifiers for the SECURITY_SLOT
// This defines who the "Authorities" are in the system.
// High Security = Mostly Police. Anarchy = Mostly Pirates.
const SECURITY_MODIFIERS = {
    "HIGH": {
        "POLICE": 0.83,
        "PIRATE": 0.17
    },
    "MEDIUM": {
        "POLICE": 0.6,
        "PIRATE": 0.4
    },
    "LOW": {
        "POLICE": 0.3,
        "PIRATE": 0.7
    },
    "ANARCHY": {
        "POLICE": 0,
        "PIRATE": 1
    },
    "DEFAULT": {
        "POLICE": 0.5,
        "PIRATE": 0.5
    }
};

const SPAWN_PROBABILITIES = {
    "MILITARY": {
        "COMBAT": 0.4063,
        "SECURITY_SLOT": 0.2074,
        "HAULER": 0.122,
        "PIRATE": 0.0407,
        "ALIEN": 0.1052,
        "TRANSPORT": 0.0564,
        "MINER": 0.0521,
        "MISSIONARY": 0.01
    },
    "ALIEN": {
        "ALIEN": 0.612,
        "SECURITY_SLOT": 0,
        "PIRATE": 0.0732,
        "HAULER": 0,
        "COMBAT": 0.2148,
        "MISSIONARY": 0.1
    },
    "POST HUMAN": {
        "MISSIONARY": 0.4179,
        "HAULER": 0.171,
        "COMBAT": 0.0856,
        "ALIEN": 0.0856,
        "SECURITY_SLOT": 0.19,
        "MINER": 0.05
    },
    "MINING": {
        "MINER": 0.3355,
        "SECURITY_SLOT": 0.1806,
        "HAULER": 0.2602,
        "TRANSPORT": 0.1444,
        "PIRATE": 0.0693,
        "MISSIONARY": 0.01
    },
    "INDUSTRIAL": {
        "MINER": 0.3465,
        "SECURITY_SLOT": 0.1485,
        "HAULER": 0.2772,
        "TRANSPORT": 0.1188,
        "PIRATE": 0.099,
        "MISSIONARY": 0.01
    },
    "REFINERY": {
        "MINER": 0.3465,
        "SECURITY_SLOT": 0.1485,
        "HAULER": 0.2772,
        "TRANSPORT": 0.1188,
        "PIRATE": 0.099,
        "MISSIONARY": 0.01
    },
    "OFFWORLD": {
        "HAULER": 0.2757,
        "SECURITY_SLOT": 0.2365,
        "COMBAT": 0.1257,
        "PIRATE": 0.1578,
        "ALIEN": 0.0415,
        "MINER": 0.0441,
        "MISSIONARY": 0.01,
        "TRANSPORT": 0.1088
    },
    "SEPARATIST": {
        "FACTION_COMBAT": 0.39,
        "SECURITY_SLOT": 0,
        "HEALER": 0.051,
        "FACTION_HAULER": 0.1169,
        "TRANSPORT": 0.1035,
        "RIVAL_COMBAT": 0.1202,
        "PIRATE": 0.1146,
        "MISSIONARY": 0,
        "MINER": 0.05,
        "HAULER": 0.0537
    },
    "IMPERIAL": {
        "FACTION_COMBAT": 0.3938,
        "SECURITY_SLOT": 0.175,
        "FACTION_HAULER": 0.105,
        "TRANSPORT": 0.0894,
        "RIVAL_COMBAT": 0.12,
        "MINER": 0.047,
        "HAULER": 0.0496,
        "HEALER": 0,
        "MISSIONARY": 0.0202
    },
    "STANDARD": {
        "SECURITY_SLOT": 0.4,
        "HAULER": 0.4,
        "PIRATE": 0.2
    }
};



/**
 * Helper to get probabilities for a specific economy and security level.
 * Merges economy-specific rules with security-level authority influence.
 * 
 * @param {string} economy - Economy type string
 * @param {string} security - Security level string
 * @returns {Object} Probability map { ROLE: probability }
 */
function getSpawnProbabilities(economy, security) {
    const econKey = (economy || '').toUpperCase();
    const secKey = (security || '').toUpperCase();

    // 1. Get Base Probabilities from Economy
    let baseProbs = SPAWN_PROBABILITIES[econKey];

    // Handle fallback if economy not found
    if (!baseProbs) {
        return SECURITY_MODIFIERS[secKey] || SECURITY_MODIFIERS['DEFAULT'];
    }

    // Clone to avoid mutating config
    let finalProbs = { ...baseProbs };

    // 2. Resolve "SECURITY_SLOT" if present
    if (finalProbs.SECURITY_SLOT > 0) {
        const securityMix = SECURITY_MODIFIERS[secKey] || SECURITY_MODIFIERS['DEFAULT'];
        const slotWeight = finalProbs.SECURITY_SLOT;
        delete finalProbs.SECURITY_SLOT;

        // Distribute mix weight to security roles (Police/Pirate)
        for (const [role, weight] of Object.entries(securityMix)) {
            finalProbs[role] = (finalProbs[role] || 0) + (weight * slotWeight);
        }
    }

    return finalProbs;
}

// Global export for use in game and tools
window.SpawnConfig = {
    PROBABILITIES: SPAWN_PROBABILITIES,
    SECURITY_MODIFIERS: SECURITY_MODIFIERS,
    getProbabilities: getSpawnProbabilities
};
