// ****** pilotRanks.js ******
// Pilot Rank System - Defines experience levels for enemy pilots
// Provides visual badge/medal drawing and rank generation utilities

// ═══════════════════════════════════════════════════════════════════════════
// PILOT RANK CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Pilot rank enumeration - represents skill/experience level
 */
const PILOT_RANK = {
    ROOKIE: 1,
    TRAINED: 2,
    VETERAN: 3,
    ACE: 4,
    ELITE: 5
};

/**
 * Pilot rank definitions with visual properties
 * Each rank has a name, colors, and medal/badge styling
 */
const PILOT_RANK_DEFS = {
    [PILOT_RANK.ROOKIE]: {
        name: 'Rookie',
        color: [150, 150, 150],         // Gray text
        badgeColor: null,                // No badge for rookies
        iconColor: null,
        symbol: '',                      // No symbol for rookies
        description: 'Inexperienced pilot'
    },
    [PILOT_RANK.TRAINED]: {
        name: 'Trained',
        color: [192, 192, 192],         // Silver text
        badgeColor: [180, 180, 190],    // Silver badge
        iconColor: [200, 200, 210],     // Silver icon
        symbol: '★',                    // Single star
        description: 'Competent pilot with basic training'
    },
    [PILOT_RANK.VETERAN]: {
        name: 'Veteran',
        color: [255, 215, 0],           // Gold text
        badgeColor: [220, 180, 50],     // Gold badge
        iconColor: [255, 200, 50],      // Gold icon
        symbol: '★★',                   // Double star
        description: 'Experienced combat pilot'
    },
    [PILOT_RANK.ACE]: {
        name: 'Ace',
        color: [255, 100, 100],         // Red-gold text
        badgeColor: [200, 60, 60],      // Red badge
        iconColor: [255, 180, 50],      // Gold icon accent
        symbol: '★★★',                  // Triple star
        description: 'Elite combat ace with many kills'
    },
    [PILOT_RANK.ELITE]: {
        name: 'Elite',
        color: [180, 100, 255],         // Purple text
        badgeColor: [140, 60, 180],     // Purple badge
        iconColor: [255, 215, 0],       // Gold icon accent
        symbol: '◆★★★',                // Diamond + triple star
        description: 'Legendary pilot of exceptional skill'
    }
};

// ═══════════════════════════════════════════════════════════════════════════
// RANK GENERATION
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Generates a pilot rank with weighted distribution.
 * Higher tech levels and certain roles increase chance of higher ranks.
 * 
 * @param {string} role - AI role (e.g., AI_ROLE.PIRATE)
 * @param {string} securityLevel - System security level
 * @param {number} techLevel - System tech level (1-10)
 * @returns {number} Pilot rank value
 */
function generatePilotRank(role, securityLevel, techLevel) {
    // Base probability weights for each rank
    // Default distribution: 30% Rookie, 35% Trained, 22% Veteran, 10% Ace, 3% Elite
    let weights = [30, 35, 22, 10, 3];

    // Adjust weights based on role
    if (typeof AI_ROLE !== 'undefined') {
        if (role === AI_ROLE.POLICE || role === AI_ROLE.GUARD) {
            // Police/Guards are better trained: fewer rookies, more trained/veteran
            weights = [15, 40, 30, 12, 3];
        } else if (role === AI_ROLE.BOUNTY_HUNTER) {
            // Bounty hunters must be competent: no rookies, mostly veteran+
            weights = [0, 20, 45, 25, 10];
        } else if (role === AI_ROLE.ALIEN) {
            // Aliens are unpredictable: flat distribution
            weights = [20, 20, 25, 20, 15];
        } else if (role === AI_ROLE.MILITARY) {
            // Military are well-trained
            weights = [10, 35, 35, 15, 5];
        }
    }

    // Adjust weights based on tech level (higher tech = better training)
    if (typeof techLevel === 'number' && techLevel > 0) {
        // Shift distribution toward higher ranks at higher tech levels
        const techBonus = Math.min(techLevel, 10) / 10; // 0 to 1
        // Reduce rookie chance, increase veteran+ chance
        weights[0] = Math.max(0, weights[0] * (1 - techBonus * 0.5));
        weights[2] += techBonus * 5;
        weights[3] += techBonus * 3;
        weights[4] += techBonus * 2;
    }

    // Adjust weights based on security level
    if (securityLevel === 'Anarchy') {
        // Anarchy: more rookies (desperate pilots) and more elites (outlaws)
        weights[0] += 10;
        weights[4] += 2;
    } else if (securityLevel === 'High') {
        // High security: better trained pilots
        weights[0] = Math.max(0, weights[0] - 10);
        weights[1] += 5;
        weights[2] += 5;
    }

    // Normalize weights
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return PILOT_RANK.TRAINED; // Fallback

    // Generate random value and pick rank
    const roll = Math.random() * total;
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (roll < cumulative) {
            return i + 1; // Ranks are 1-indexed
        }
    }

    return PILOT_RANK.TRAINED; // Fallback
}

// ═══════════════════════════════════════════════════════════════════════════
// UTILITY FUNCTIONS
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Gets the display name for a pilot rank.
 * @param {number} rank - Pilot rank value
 * @returns {string} Rank name
 */
function getPilotRankName(rank) {
    const def = PILOT_RANK_DEFS[rank];
    return def ? def.name : 'Unknown';
}

/**
 * Gets the symbol/icon string for a pilot rank.
 * Returns empty string for Rookie (rank 1).
 * @param {number} rank - Pilot rank value
 * @returns {string} Symbol string
 */
function getPilotRankSymbol(rank) {
    if (!rank || rank < PILOT_RANK.TRAINED) return ''; // No symbol for rookies
    const def = PILOT_RANK_DEFS[rank];
    return def ? def.symbol : '';
}

/**
 * Gets the color array for a pilot rank.
 * @param {number} rank - Pilot rank value
 * @returns {number[]} RGB color array
 */
function getPilotRankColor(rank) {
    const def = PILOT_RANK_DEFS[rank];
    return def ? def.color : [180, 180, 180];
}

/**
 * Internal helper to draw a star shape
 */
function _drawStar(x, y, r) {
    const angleStep = TWO_PI / 5;
    // Rotate -PI/2 to point up
    beginShape();
    for (let i = 0; i < 5; i++) {
        const a = i * angleStep - HALF_PI;
        const sx = x + cos(a) * r;
        const sy = y + sin(a) * r;
        vertex(sx, sy);
        const a2 = (i + 0.5) * angleStep - HALF_PI;
        const sx2 = x + cos(a2) * r * 0.45; // Slightly deeper points for "richer" stars
        const sy2 = y + sin(a2) * r * 0.45;
        vertex(sx2, sy2);
    }
    endShape(CLOSE);
}

/**
 * Internal helper to draw Elite rank icon (Diamond + Eagle Wings style)
 */
function _drawEliteIcon(x, y, r, iconColor) {
    // Glow effect
    if (iconColor) {
        fill(iconColor[0], iconColor[1], iconColor[2], 60);
        _drawStar(x, y, r * 1.8);
        fill(iconColor[0], iconColor[1], iconColor[2]);
    }

    // Main Diamond center
    beginShape();
    vertex(x, y - r);
    vertex(x + r * 0.8, y);
    vertex(x, y + r);
    vertex(x - r * 0.8, y);
    endShape(CLOSE);

    // Sharp eagle wings
    noFill();
    strokeWeight(1.5);
    if (iconColor) stroke(iconColor[0], iconColor[1], iconColor[2], 255);

    // Left Wing
    beginShape();
    vertex(x - r * 0.8, y - r * 0.1);
    vertex(x - r * 2.0, y - r * 0.6);
    vertex(x - r * 2.5, y + r * 0.2);
    vertex(x - r * 0.8, y + r * 0.4);
    endShape();

    // Right Wing
    beginShape();
    vertex(x + r * 0.8, y - r * 0.1);
    vertex(x + r * 2.0, y - r * 0.6);
    vertex(x + r * 2.5, y + r * 0.2);
    vertex(x + r * 0.8, y + r * 0.4);
    endShape();

    noStroke();
}

/**
 * Draws the rank icon (stars/wings) centered at x,y
 */
function _drawRankIconGraphic(rank, x, y, size) {
    const def = PILOT_RANK_DEFS[rank];
    if (!def) return;

    fill(def.iconColor[0], def.iconColor[1], def.iconColor[2]);
    noStroke();

    const starR = size * 0.4;

    if (rank === PILOT_RANK.TRAINED) {
        // One star
        _drawStar(x, y, starR);
    } else if (rank === PILOT_RANK.VETERAN) {
        // Two stars
        _drawStar(x - starR * 0.8, y, starR);
        _drawStar(x + starR * 0.8, y, starR);
    } else if (rank === PILOT_RANK.ACE) {
        // Three stars
        _drawStar(x - starR * 1.5, y + starR * 0.2, starR * 0.9);
        _drawStar(x, y - starR * 0.2, starR * 1.25); // Center slightly larger/up
        _drawStar(x + starR * 1.5, y + starR * 0.2, starR * 0.9);
    } else if (rank === PILOT_RANK.ELITE) {
        // Elite Icon + Flanker Stars
        _drawEliteIcon(x, y, starR * 1.3, def.iconColor);
        _drawStar(x - starR * 2.2, y + starR * 0.3, starR * 0.6);
        _drawStar(x + starR * 2.2, y + starR * 0.3, starR * 0.6);
    }
}

/**
 * Draws a pilot rank badge/medal at the specified position.
 * Does not draw anything for Rookie (rank 1).
 * 
 * @param {number} x - X position (left edge of badge)
 * @param {number} y - Y position (center Y of badge)
 * @param {number} rank - Pilot rank value
 * @param {number} size - Badge size in pixels (default 16)
 * @returns {number} Width of drawn badge (0 if nothing drawn)
 */
function drawPilotBadge(x, y, rank, size = 16) {
    // No badge for rookies or invalid ranks
    if (!rank || rank < PILOT_RANK.TRAINED) return 0;

    const def = PILOT_RANK_DEFS[rank];
    if (!def || !def.badgeColor) return 0;

    // Check if p5.js drawing functions are available
    if (typeof push !== 'function') return 0;

    push();

    const badgeWidth = size * 2.0; // Slightly wider to fit stars
    const badgeHeight = size * 1.2;
    const centerX = x + badgeWidth / 2;
    const centerY = y;

    // Draw badge background (shield/medal shape)
    noStroke();
    fill(def.badgeColor[0], def.badgeColor[1], def.badgeColor[2], 220);

    // Draw rounded rectangle as badge base
    rectMode(CENTER);
    rect(centerX, centerY, badgeWidth, badgeHeight, 3);

    // Draw border/outline
    stroke(def.iconColor[0], def.iconColor[1], def.iconColor[2]);
    strokeWeight(1);
    noFill();
    rect(centerX, centerY, badgeWidth, badgeHeight, 3);

    // Draw procedural rank icon inside badge
    _drawRankIconGraphic(rank, centerX, centerY, size);

    pop();

    return badgeWidth + 4; // Return width including small padding
}

/**
 * Calculates the width needed for a pilot rank icon/indicator.
 * Useful for centering calculations before drawing.
 * 
 * @param {number} rank - Pilot rank value
 * @param {number} size - Base icon size
 * @returns {number} Width in pixels
 */
function getPilotRankIconWidth(rank, size = 12) {
    if (!rank || rank < PILOT_RANK.TRAINED) return 0;

    // Width modifiers based on star count/layout
    if (rank === PILOT_RANK.VETERAN) return size * 1.8;
    if (rank === PILOT_RANK.ACE) return size * 2.5;
    if (rank === PILOT_RANK.ELITE) return size * 3.2;

    return size; // Trained (1 star)
}

/**
 * Draws a compact rank indicator (stars, no badge background).
 * For use in space ship labels where space is limited.
 * Does not draw anything for Rookie (rank 1).
 * 
 * @param {number} x - X position (left edge)
 * @param {number} y - Y position (vertical center roughly)
 * @param {number} rank - Pilot rank value
 * @param {number} size - Icon base size (default 12)
 * @returns {number} Width of drawn indicator
 */
function drawPilotRankIndicator(x, y, rank, size = 12) {
    // No indicator for rookies
    if (!rank || rank < PILOT_RANK.TRAINED) return 0;

    const def = PILOT_RANK_DEFS[rank];
    if (!def) return 0;

    if (typeof push !== 'function') return 0;

    // Calculate generic width needs
    const widthNeeded = getPilotRankIconWidth(rank, size);

    push();
    // Center logic: _drawRankIconGraphic handles centering at (centerX, y)
    _drawRankIconGraphic(rank, x + widthNeeded / 2, y, size);
    pop();

    return widthNeeded;
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        PILOT_RANK,
        PILOT_RANK_DEFS,
        generatePilotRank,
        getPilotRankName,
        getPilotRankSymbol,
        getPilotRankColor,
        drawPilotBadge,
        drawPilotRankIndicator
    };
}
