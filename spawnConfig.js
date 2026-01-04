// ****** spawnConfig.js ******
// Centralized Spawn Probability Configuration
// Defines spawn chances for different system types and security levels

// Security level modifiers for the SECURITY_SLOT
// This defines who the "Authorities" are in the system.
// High Security = Mostly Police. Anarchy = Mostly Pirates.
const SECURITY_MODIFIERS = {
    "HIGH": {
        "POLICE": 0.9,
        "PIRATE": 0.1
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
        "COMBAT": 0.5,
        "SECURITY_SLOT": 0.2,
        "HAULER": 0.15,
        "PIRATE": 0.05,
        "ALIEN": 0.05,
        "TRANSPORT": 0.05
    },
    "ALIEN": {
        "ALIEN": 0.8,
        "SECURITY_SLOT": 0.05,
        "PIRATE": 0.08,
        "HAULER": 0.07
    },
    "POST HUMAN": {
        "MISSIONARY": 0.6,
        "HAULER": 0.2,
        "COMBAT": 0.1,
        "ALIEN": 0.1
    },
    "MINING": {
        "MINER": 0.35,
        "SECURITY_SLOT": 0.15,
        "HAULER": 0.28,
        "TRANSPORT": 0.12,
        "PIRATE": 0.1
    },
    "INDUSTRIAL": {
        "MINER": 0.35,
        "SECURITY_SLOT": 0.15,
        "HAULER": 0.28,
        "TRANSPORT": 0.12,
        "PIRATE": 0.1
    },
    "REFINERY": {
        "MINER": 0.35,
        "SECURITY_SLOT": 0.15,
        "HAULER": 0.28,
        "TRANSPORT": 0.12,
        "PIRATE": 0.1
    },
    "OFFWORLD": {
        "HAULER": 0.35,
        "SECURITY_SLOT": 0.3,
        "COMBAT": 0.15,
        "PIRATE": 0.2
    },
    "SEPARATIST": {
        "FACTION_COMBAT": 0.4,
        "SECURITY_SLOT": 0.2,
        "HEALER": 0.08,
        "FACTION_HAULER": 0.12,
        "TRANSPORT": 0.05,
        "RIVAL_COMBAT": 0.15
    },
    "IMPERIAL": {
        "FACTION_COMBAT": 0.45,
        "SECURITY_SLOT": 0.2,
        "FACTION_HAULER": 0.12,
        "TRANSPORT": 0.08,
        "RIVAL_COMBAT": 0.15
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
