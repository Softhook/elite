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
// PERFORMANCE CACHING
// ═══════════════════════════════════════════════════════════════════════════

/**
 * Cache for pre-rendered rank icons to avoid procedural drawing overhead every frame.
 * Keyed by "rank_size" (e.g., "3_20")
 */
const RankIconCache = {};

/**
 * Renders a rank icon into an offscreen buffer.
 * @private
 */
function _renderIconToBuffer(rank, size) {
    if (typeof createGraphics !== 'function') return null;

    const width = getPilotRankIconWidth(rank, size);
    const height = size * 1.5; // Extra height for Elite wings/stars

    const pg = createGraphics(Math.ceil(width), Math.ceil(height));
    pg.clear();

    // Inject procedural drawing into the buffer
    // We override global p5 functions with those of the graphics object
    const originalPush = push, originalPop = pop, originalFill = fill, originalNoStroke = noStroke;
    const originalBeginShape = beginShape, originalEndShape = endShape, originalVertex = vertex;
    const originalCos = cos, originalSin = sin, originalHalfPi = HALF_PI, originalTwoPi = TWO_PI;
    const originalStroke = stroke, originalStrokeWeight = strokeWeight, originalNoFill = noFill;

    // Use a simpler approach: explicitly pass the 'pg' context if possible, 
    // but our existing drawing functions use global p5 state.
    // The safest way in p5 without rewriting every helper is to use pg.push() etc.
    // However, I'll rewrite the core drawing calls to be context-aware or just use pg's context locally.

    pg.push();

    // Call the graphic helper with pg as context
    // We need to slightly adjust our helpers to take a p5 context if we want to avoid global namespace issues,
    // but in p5.js sketches, the global functions usually work on the current context or we can call them on pg.
    // To make this robust, I'll update the private helpers to accept an optional 'ctx' argument.

    _drawRankIconGraphic(rank, width / 2, height / 2, size, pg);

    pg.pop();

    return pg;
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
 * Draws the rank icon (stars/wings) centered at x,y
 * @param {Object} [ctx] - Optional p5 graphics context
 */
function _drawRankIconGraphic(rank, x, y, size, ctx) {
    const def = PILOT_RANK_DEFS[rank];
    if (!def) return;

    const f = (ctx && ctx.fill) ? ctx.fill.bind(ctx) : fill;
    const ns = (ctx && ctx.noStroke) ? ctx.noStroke.bind(ctx) : noStroke;

    f(def.iconColor[0], def.iconColor[1], def.iconColor[2]);
    ns();

    const starR = size * 0.4;

    if (rank === PILOT_RANK.TRAINED) {
        // One star
        _drawStar(x, y, starR, ctx);
    } else if (rank === PILOT_RANK.VETERAN) {
        // Two stars
        _drawStar(x - starR * 0.8, y, starR, ctx);
        _drawStar(x + starR * 0.8, y, starR, ctx);
    } else if (rank === PILOT_RANK.ACE) {
        // Three stars
        _drawStar(x - starR * 1.5, y + starR * 0.2, starR * 0.9, ctx);
        _drawStar(x, y - starR * 0.2, starR * 1.25, ctx); // Center slightly larger/up
        _drawStar(x + starR * 1.5, y + starR * 0.2, starR * 0.9, ctx);
    } else if (rank === PILOT_RANK.ELITE) {
        // Elite Icon + Flanker Stars
        _drawEliteIcon(x, y, starR * 1.3, def.iconColor, ctx);
        _drawStar(x - starR * 2.2, y + starR * 0.3, starR * 0.6, ctx);
        _drawStar(x + starR * 2.2, y + starR * 0.3, starR * 0.6, ctx);
    }
}

/**
 * Internal helper to draw a star shape
 */
function _drawStar(x, y, r, ctx) {
    const bs = (ctx && ctx.beginShape) ? ctx.beginShape.bind(ctx) : beginShape;
    const es = (ctx && ctx.endShape) ? ctx.endShape.bind(ctx) : endShape;
    const v = (ctx && ctx.vertex) ? ctx.vertex.bind(ctx) : vertex;

    const angleStep = TWO_PI / 5;
    bs();
    for (let i = 0; i < 5; i++) {
        const a = i * angleStep - HALF_PI;
        const sx = x + cos(a) * r;
        const sy = y + sin(a) * r;
        v(sx, sy);
        const a2 = (i + 0.5) * angleStep - HALF_PI;
        const sx2 = x + cos(a2) * r * 0.45;
        const sy2 = y + sin(a2) * r * 0.45;
        v(sx2, sy2);
    }
    es(CLOSE);
}

/**
 * Internal helper to draw Elite rank icon
 */
function _drawEliteIcon(x, y, r, iconColor, ctx) {
    const f = (ctx && ctx.fill) ? ctx.fill.bind(ctx) : fill;
    const bs = (ctx && ctx.beginShape) ? ctx.beginShape.bind(ctx) : beginShape;
    const es = (ctx && ctx.endShape) ? ctx.endShape.bind(ctx) : endShape;
    const v = (ctx && ctx.vertex) ? ctx.vertex.bind(ctx) : vertex;
    const s = (ctx && ctx.stroke) ? ctx.stroke.bind(ctx) : stroke;
    const sw = (ctx && ctx.strokeWeight) ? ctx.strokeWeight.bind(ctx) : strokeWeight;
    const nf = (ctx && ctx.noFill) ? ctx.noFill.bind(ctx) : noFill;
    const ns = (ctx && ctx.noStroke) ? ctx.noStroke.bind(ctx) : noStroke;

    if (iconColor) {
        f(iconColor[0], iconColor[1], iconColor[2], 60);
        _drawStar(x, y, r * 1.8, ctx);
        f(iconColor[0], iconColor[1], iconColor[2]);
    }

    bs();
    v(x, y - r);
    v(x + r * 0.8, y);
    v(x, y + r);
    v(x - r * 0.8, y);
    es(CLOSE);

    nf();
    sw(1.5);
    if (iconColor) s(iconColor[0], iconColor[1], iconColor[2], 255);

    bs();
    v(x - r * 0.8, y - r * 0.1);
    v(x - r * 2.0, y - r * 0.6);
    v(x - r * 2.5, y + r * 0.2);
    v(x - r * 0.8, y + r * 0.4);
    es();

    bs();
    v(x + r * 0.8, y - r * 0.1);
    v(x + r * 2.0, y - r * 0.6);
    v(x + r * 2.5, y + r * 0.2);
    v(x + r * 0.8, y + r * 0.4);
    es();

    ns();
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

    const widthNeeded = getPilotRankIconWidth(rank, size);

    // Check Cache
    const cacheKey = `${rank}_${size}`;
    if (!RankIconCache[cacheKey]) {
        RankIconCache[cacheKey] = _renderIconToBuffer(rank, size);
    }

    const cachedImg = RankIconCache[cacheKey];
    if (cachedImg) {
        imageMode(CORNER);
        // We center the image around the requested Y
        image(cachedImg, x, y - cachedImg.height / 2);
    } else {
        // Fallback to procedural if buffer creation failed
        push();
        _drawRankIconGraphic(rank, x + widthNeeded / 2, y, size);
        pop();
    }

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
        drawPilotRankIndicator
    };
}
