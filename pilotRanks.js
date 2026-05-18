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
    GREEN: 1,
    ROOKIE: 2,
    VETERAN: 3,
    ELITE: 4
};

/**
 * Pilot rank definitions with visual properties
 * Each rank has a name, colors, and medal/badge styling
 */
const PILOT_RANK_DEFS = {
    [PILOT_RANK.GREEN]: {
        name: 'Green',
        color: [255],
        badgeColor: null,
        iconColor: null,
        symbol: '',
        description: 'Very inexperienced pilot'
    },
    [PILOT_RANK.ROOKIE]: {
        name: 'Rookie',
        color: [255],
        badgeColor: null,
        iconColor: null,
        symbol: '★',
        description: 'Inexperienced pilot'
    },
    [PILOT_RANK.VETERAN]: {
        name: 'Veteran',
        color: [255],                   // Pure white text
        badgeColor: [255],              // White badge
        iconColor: [255],               // White icon
        symbol: '★★',                    // Two stars
        description: 'Experienced combat pilot'
    },
    [PILOT_RANK.ELITE]: {
        name: 'Elite',
        color: [255],
        badgeColor: [255],
        iconColor: [255],
        symbol: '★★★',                    // Note: Elite rendering handled procedurally with 3 stars
        description: 'Legendary pilot of exceptional skill'
    }
};

/**
 * Pilot rank behavior modifiers for AI differentiation
 * These modifiers create distinct combat feels for each rank:
 * - Green: Very slow reactions, poor awareness, weak tactical decisions
 * - Rookies: Predictable, slow reactions, poor aim, stubborn (no retreat)
 * - Veterans: Balanced baseline behavior
 * - Elites: Sharp reflexes, accurate, tactical retreats, controls engagement range
 */
const PILOT_RANK_MODIFIERS = {
    [PILOT_RANK.GREEN]: {
        canStrafe: false,                   // No side thrusters / kiting
        reactionDelayBonus: 0.70,           // +700ms slower reactions
        aimToleranceMultiplier: 2.3,        // Extremely poor accuracy
        fleeHullThreshold: 0.08,            // Flees very late (reckless)
        tacticChangeMultiplier: 0.20,       // Rarely adapts tactics
        predictionMultiplier: 0.0,          // No target lead
        pursuitAbandonMultiplier: 2.7,      // Won't give up chase easily
        engageDistanceMultiplier: 0.55,     // Gets too close
        detectionRangeMultiplier: 0.6,      // Weak awareness
        scanInterval: 3.0,                  // Very slow sensor sweep
        longRangeSensorMultiplier: 1.0,     // Very harsh acquisition cutoff
        decisionIntervalMultiplier: 1.35,   // Slower tactical decision updates
        snipingChanceMultiplier: 0.65,      // Less likely to pick stable sniping tactics
        attackPassDurationMultiplier: 1.2,  // Overcommits once it starts a pass
        targetSwitchCooldownMultiplier: 1.5,// Slower to react to better targets
        targetSwitchScoreMultiplier: 1.4,   // Needs bigger score delta to retarget
        weaponSwitchMinInterval: 2.0,       // Slow weapon adaptation
        useCover: false,                    // Never uses asteroid cover
        obstacleAvoidanceStrength: 0.0,     // Does not steer away from obstacles
        fireDisciplineChance: 0.72,         // Often hesitates even with a valid shot
        abilityDecisionIntervalMultiplier: 1.4, // Slower ability decisions
        abilityTriggerChanceMultiplier: 0.8, // Less confidence using abilities
        retaliationAggressionMultiplier: 0.75 // Less committed retaliation scoring
    },
    [PILOT_RANK.ROOKIE]: {
        canStrafe: false,                   // No side thrusters / kiting
        reactionDelayBonus: 0.35,           // +350ms slower reactions
        aimToleranceMultiplier: 1.5,        // Wider aim tolerance (worse accuracy)
        fleeHullThreshold: 0.15,            // Only flee at 15% hull (stubborn)
        tacticChangeMultiplier: 0.4,        // Less likely to adapt tactics
        predictionMultiplier: 0.2,          // Poor target lead (misses moving targets)
        pursuitAbandonMultiplier: 2.0,      // Won't give up chase easily (suicidal)
        engageDistanceMultiplier: 0.7,      // Gets too close (reckless)
        detectionRangeMultiplier: 0.8,      // Reduced awareness
        scanInterval: 2.0,                  // Lazy sensor sweep
        longRangeSensorMultiplier: 1.5,     // Hard cutoff for acquisition
        decisionIntervalMultiplier: 1.15,   // Slightly slower tactical updates
        snipingChanceMultiplier: 0.85,      // Slightly favors direct attack passes
        attackPassDurationMultiplier: 1.08, // Mildly overcommits in attack passes
        targetSwitchCooldownMultiplier: 1.2,// Slower retargeting cadence
        targetSwitchScoreMultiplier: 1.15,  // Needs better reason to retarget
        weaponSwitchMinInterval: 1.1,
        useCover: true,
        obstacleAvoidanceStrength: 0.9,     // Slightly worse obstacle avoidance
        fireDisciplineChance: 0.86,
        abilityDecisionIntervalMultiplier: 1.15,
        abilityTriggerChanceMultiplier: 0.92,
        retaliationAggressionMultiplier: 0.9
    },
    [PILOT_RANK.VETERAN]: {
        canStrafe: true,
        reactionDelayBonus: 0,
        aimToleranceMultiplier: 1.0,
        fleeHullThreshold: 0.30,
        tacticChangeMultiplier: 1.0,
        predictionMultiplier: 1.0,
        pursuitAbandonMultiplier: 1.0,
        engageDistanceMultiplier: 1.0,
        detectionRangeMultiplier: 1.0,      // Standard awareness
        scanInterval: 1.0,                  // Standard sensor sweep
        longRangeSensorMultiplier: 2.5,     // Baseline cutoff
        decisionIntervalMultiplier: 1.0,
        snipingChanceMultiplier: 1.0,
        attackPassDurationMultiplier: 1.0,
        targetSwitchCooldownMultiplier: 1.0,
        targetSwitchScoreMultiplier: 1.0,
        weaponSwitchMinInterval: 0.6,
        useCover: true,
        obstacleAvoidanceStrength: 1.0,
        fireDisciplineChance: 1.0,
        abilityDecisionIntervalMultiplier: 1.0,
        abilityTriggerChanceMultiplier: 1.0,
        retaliationAggressionMultiplier: 1.0
    },
    [PILOT_RANK.ELITE]: {
        canStrafe: true,
        reactionDelayBonus: -0.15,          // 150ms faster reactions
        aimToleranceMultiplier: 0.7,        // Tighter aim (better accuracy)
        fleeHullThreshold: 0.50,            // Flee earlier (smart survival)
        tacticChangeMultiplier: 1.5,        // More adaptable in combat
        predictionMultiplier: 1.3,          // Better target lead (hits moving targets)
        pursuitAbandonMultiplier: 0.6,      // Gives up bad chases faster (tactical)
        engageDistanceMultiplier: 1.3,      // Maintains safer distance (controls range)
        detectionRangeMultiplier: 1.5,      // Significantly higher awareness
        scanInterval: 0.4,                  // Agile sensor sweep
        longRangeSensorMultiplier: 4.0,     // Massive sensor reach
        decisionIntervalMultiplier: 0.75,   // Faster tactical updates
        snipingChanceMultiplier: 1.2,       // More likely to leverage sniping posture
        attackPassDurationMultiplier: 0.9,  // Commits less, reassesses sooner
        targetSwitchCooldownMultiplier: 0.75,// Faster retargeting
        targetSwitchScoreMultiplier: 0.8,   // Will switch on smaller score edge
        weaponSwitchMinInterval: 0.25,      // Rapid weapon adaptation
        useCover: true,
        obstacleAvoidanceStrength: 1.15,    // Slightly better obstacle anticipation
        fireDisciplineChance: 1.0,
        abilityDecisionIntervalMultiplier: 0.75,
        abilityTriggerChanceMultiplier: 1.15,
        retaliationAggressionMultiplier: 1.2
    }
};

/**
 * Gets behavior modifiers for a given pilot rank
 * @param {number} rank - Pilot rank value (1=Green, 2=Rookie, 3=Veteran, 4=Elite)
 * @returns {Object|null} Modifier object with behavior multipliers, or null if unavailable
 */
function getPilotRankModifiers(rank) {
    if (typeof PILOT_RANK_MODIFIERS === 'undefined') return null;

    // Validate rank exists
    if (!rank || !PILOT_RANK_MODIFIERS[rank]) {
        if (typeof DEBUG_AI !== 'undefined' && DEBUG_AI) {
            console.warn(`[AI] Invalid pilot rank: ${rank}, defaulting to VETERAN`);
        }
        return PILOT_RANK_MODIFIERS[PILOT_RANK.VETERAN];
    }

    return PILOT_RANK_MODIFIERS[rank];
}

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
 * @param {number} [minRank=1] - Minimum rank to allow (default: 1=Green)
 * @returns {number} Pilot rank value
 */
function generatePilotRank(role, securityLevel, techLevel, minRank = 1) {
    // Base probability weights for each rank
     // Default distribution: 70% Green, 24% Rookie, 5% Veteran, 1% Elite
     let weights = [70, 24, 5, 1];

    // Adjust weights based on role
    if (typeof AI_ROLE !== 'undefined') {
        if (role === AI_ROLE.POLICE || role === AI_ROLE.GUARD) {
            weights = [15, 55, 30, 0];
        } else if (role === AI_ROLE.BOUNTY_HUNTER) {
            weights = [5, 20, 70, 5];
        } else if (role === AI_ROLE.ALIEN) {
            weights = [100, 0, 0, 0];
        } else if (role === AI_ROLE.MILITARY) {
            // Military are well-trained
            weights = [5, 20, 70, 5];
        } else if (role === AI_ROLE.PIRATE || role === AI_ROLE.HAULER) {
            // Pirates and Haulers are slightly less skilled than military
            weights = [40, 35, 20, 5];
        } else if (role === AI_ROLE.TRANSPORT) {
            // Transporters are almost always green pilots
            weights = [95, 5, 0, 0];
        }
    }

    // Zero out weights below minRank
    if (minRank > 1) {
        for (let i = 0; i < minRank - 1; i++) {
            if (i < weights.length) weights[i] = 0;
        }
    }

    // Normalize weights
    const total = weights.reduce((sum, w) => sum + w, 0);
    if (total <= 0) return Math.max(minRank, PILOT_RANK.VETERAN); // Fallback

    // Generate random value and pick rank
    const roll = Math.random() * total;
    let cumulative = 0;
    for (let i = 0; i < weights.length; i++) {
        cumulative += weights[i];
        if (roll < cumulative) {
            return i + 1; // Ranks are 1-indexed
        }
    }

    return Math.max(minRank, PILOT_RANK.VETERAN); // Fallback
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
 * Returns empty string for Green pilots.
 * @param {number} rank - Pilot rank value
 * @returns {string} Symbol string
 */
function getPilotRankSymbol(rank) {
    if (!rank || rank < PILOT_RANK.ROOKIE) return ''; // No symbol for green pilots
    if (rank === PILOT_RANK.ROOKIE) return '★';
    if (rank === PILOT_RANK.VETERAN) return '★★';
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

    if (rank < PILOT_RANK.VETERAN || !def.iconColor) return;

    const f = (ctx && ctx.fill) ? ctx.fill.bind(ctx) : fill;
    const ns = (ctx && ctx.noStroke) ? ctx.noStroke.bind(ctx) : noStroke;

    f(def.iconColor[0], def.iconColor[1], def.iconColor[2]);
    ns();

    const starR = size * 0.4;

    if (rank === PILOT_RANK.VETERAN) {
        // Two stars
        _drawStar(x - starR * 0.75, y, starR, ctx);
        _drawStar(x + starR * 0.75, y, starR, ctx);
    } else if (rank === PILOT_RANK.ELITE) {
        // Three stars
        _drawStar(x, y, starR * 1.2, ctx);
        _drawStar(x - starR * 1.5, y + starR * 0.2, starR * 0.9, ctx);
        _drawStar(x + starR * 1.5, y + starR * 0.2, starR * 0.9, ctx);
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
 * Internal helper to draw a simple ring/circle outline
 */
function _drawRing(x, y, r, ctx) {
    const s = (ctx && ctx.stroke) ? ctx.stroke.bind(ctx) : stroke;
    const sw = (ctx && ctx.strokeWeight) ? ctx.strokeWeight.bind(ctx) : strokeWeight;
    const nf = (ctx && ctx.noFill) ? ctx.noFill.bind(ctx) : noFill;
    const ns = (ctx && ctx.noStroke) ? ctx.noStroke.bind(ctx) : noStroke;
    const f = (ctx && ctx.fill) ? ctx.fill.bind(ctx) : fill;
    const el = (ctx && ctx.ellipse) ? ctx.ellipse.bind(ctx) : ellipse;

    // We use a stroke for the ring. iconColor is usually [255]
    s(255);
    sw(2.5);
    nf();
    el(x, y, r * 2, r * 2);
    ns();
    f(255); // Reset fill for next elements
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
    if (!rank || rank < PILOT_RANK.VETERAN) return 0;

    // Width modifiers based on icon types
    if (rank === PILOT_RANK.VETERAN) return size * 1.8;
    if (rank === PILOT_RANK.ELITE) return size * 2.5;

    return size;
}

/**
 * Draws a compact rank indicator (stars, no badge background).
 * For use in space ship labels where space is limited.
 * Does not draw anything for Green or Rookie ranks.
 * 
 * @param {number} x - X position (left edge)
 * @param {number} y - Y position (vertical center roughly)
 * @param {number} rank - Pilot rank value
 * @param {number} size - Icon base size (default 12)
 * @returns {number} Width of drawn indicator
 */
function drawPilotRankIndicator(x, y, rank, size = 12) {
    // No indicator for rookies
    if (!rank || rank < PILOT_RANK.VETERAN) return 0;

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
        PILOT_RANK_MODIFIERS,
        generatePilotRank,
        getPilotRankName,
        getPilotRankSymbol,
        getPilotRankColor,
        getPilotRankModifiers,
        drawPilotRankIndicator
    };
}
