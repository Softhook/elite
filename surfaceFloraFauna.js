// ****** surfaceFloraFauna.js ******
// Flora and fauna classes for planetary surface gameplay
//
// ARCHITECTURE:
// - Base classes: SurfaceFlora and SurfaceFauna - common behavior for organic life
// - Multiple specialized classes for variety and alien designs
// - All classes use Draw3D primitives for pseudo-3D rendering
//
// RENDERING:
// - All draw() methods use Draw3D primitives for consistent visual projection
// - Colors vary based on planet economy type for visual diversity
// - Organic, alien designs using creative combinations of primitives
//
// ENTITY TYPES:
// - Flora: AlienTree, CrystalPlant, TentaclePlant, SporeStalk, BubbleBush
// - Fauna: SlitherCreature, FloaterCreature, RollerCreature, StalkCreature

// Validate critical dependencies
if (typeof Draw3D === 'undefined') {
    console.warn('Draw3D not loaded - flora/fauna rendering may fail');
}

/**
 * Base class for all surface flora (plants)
 * Provides common properties for plant-like entities
 */
class SurfaceFlora {
    /**
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} size - Flora size
     * @param {Array} planetColors - Array of planet colors from palette [baseColor, feature1, feature2, feature3]
     */
    constructor(x, y, size, planetColors, seed) {
        this.pos = createVector(x, y);
        this.size = size || 20;
        this.yOffset = 0; // Height offset matching terrain
        this.destroyed = false;
        this.planetColors = planetColors || [];
        this.seed = (typeof seed === 'number') ? seed : Math.random() * 1000;
        this.color = this._getPlanetBasedColor();

        // Health system (compatible with SurfaceObject)
        this.health = 50; // Flora has moderate durability
        this.maxHealth = 50;
        this.isSurface = true; // Mark as surface entity for HUD
    }

    /**
     * Get the vertical height of the flora for HUD/targeting
     * @returns {number} Height in world units
     */
    getHeight() {
        return this.height || 0;
    }

    /**
     * Get color based on planet palette colors with slight variation
     * @returns {p5.Color} Color for this flora
     */
    _getPlanetBasedColor() {
        // Use seed for deterministic selection and variation
        const colorIndex = Math.floor((Math.sin(this.seed * 1.1) * 0.5 + 0.5) * this.planetColors.length);
        const baseCol = this.planetColors[colorIndex] || this.planetColors[0] || color(100, 150, 100);

        // Shift RGB channels slightly for variety using seed-based variation
        const rShift = (Math.sin(this.seed * 2.3) * 0.5 + 0.5) * 40 - 20; // -20 to +20
        const gShift = (Math.sin(this.seed * 3.7) * 0.5 + 0.5) * 30 - 15; // -15 to +15
        const bShift = (Math.sin(this.seed * 4.1) * 0.5 + 0.5) * 30 - 15; // -15 to +15

        const r = constrain(red(baseCol) + rShift, 0, 255);
        const g = constrain(green(baseCol) + gShift, 0, 255);
        const b = constrain(blue(baseCol) + bShift, 0, 255);

        return color(r, g, b);
    }

    /**
     * Get projection helpers with fallback
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} alt - Base altitude
     * @param {number} height - Additional height offset
     * @returns {Object} Projection data {extrusionAngle, baseX, baseY}
     */
    _getProjection(worldX, worldY, alt, height = 0) {
        return typeof getProjectionHelpers === 'function'
            ? getProjectionHelpers(worldX, worldY, alt + height)
            : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };
    }

    /**
     * Get deterministic variation based on seed
     * @param {number} multiplier - Seed multiplier for variation
     * @returns {number} Value between 0 and 1
     */
    _getSeededVariation(multiplier) {
        return Math.sin(this.seed * multiplier) * 0.5 + 0.5;
    }

    /**
     * Generate array of angles with pre-calculated sin/cos
     * @param {number} count - Number of angles to generate
     * @param {number} offset - Angle offset in radians
     * @returns {Array} Array of {cos, sin} objects
     */
    _generateAngles(count, offset = 0) {
        const angles = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + offset;
            angles.push({
                cos: Math.cos(angle),
                sin: Math.sin(angle)
            });
        }
        return angles;
    }

    /**
     * Get LOD-adjusted count
     * @param {number} fullCount - Full detail count
     * @param {number} lod2Count - LOD 2 count
     * @param {number} lodLevel - Current LOD level
     * @returns {number} Adjusted count
     */
    _getLODCount(fullCount, lod2Count, lodLevel) {
        return lodLevel === 2 ? Math.min(lod2Count, fullCount) : fullCount;
    }

    /**
     * Create darkened version of color
     * @param {p5.Color} baseColor - Base color
     * @param {number} factor - Darkening factor (0-1)
     * @returns {p5.Color} Darkened color
     */
    _getDarkenedColor(baseColor, factor = 0.5) {
        return color(
            red(baseColor) * factor,
            green(baseColor) * factor,
            blue(baseColor) * factor
        );
    }

    /**
     * Create brightened version of color
     * @param {p5.Color} baseColor - Base color
     * @param {number} amount - Amount to add to each channel
     * @param {number} alpha - Alpha value (0-255)
     * @returns {p5.Color} Brightened color
     */
    _getBrightenedColor(baseColor, amount, alpha = 255) {
        return color(
            red(baseColor) + amount,
            green(baseColor) + amount,
            blue(baseColor) + amount,
            alpha
        );
    }

    update(dt, player) {
        // Flora is static
    }

    /**
     * Draw flora - override in subclasses
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} sunAngle - Sun angle for lighting
     * @param {number} alt - Altitude above terrain
     * @param {number} lodLevel - Level of detail (3=full, 2=medium, 1=low, 0=skip)
     */
    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Base implementation - override in subclasses
    }

    /**
     * Apply damage to flora
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0 && !this.destroyed) {
            this.destroyed = true;
            if (typeof surfaceMode !== 'undefined' && this.cellKey) {
                surfaceMode.registerDestruction(this.cellKey);
            }
            this.onDestroy();
        }
    }

    /**
     * Called when flora is destroyed
     */
    onDestroy() {
        // Flora doesn't drop anything or create explosions
    }

    /**
     * Check collision with projectile (compatible with surface object system)
     * @param {Object} projectile - Projectile to check
     * @returns {boolean} True if collision detected
     */
    checkCollision(projectile) {
        return false; // Use default radius-based collision in surfaceMode
    }
}

/**
 * Alien tree with organic branching structure
 */
class AlienTree extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * (2.5 + Math.sin(this.seed) * 0.5);

        // Pre-calculate colors
        this.trunkColor = this._getDarkenedColor(this.color, 0.5);

        // Pre-calculate branch angles and blob sizes
        this.branches = Math.floor(3 + (this.seed % 4));
        this.branchAngles = this._generateAngles(this.branches);
        this.blobSizes = [];
        const canopyR = this.size * 0.8;
        for (let i = 0; i < this.branches; i++) {
            this.blobSizes[i] = canopyR * (0.6 + Math.sin(this.seed + i) * 0.2);
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const trunkW = this.size * 0.3;
        const trunkH = this.height * 0.6;

        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, trunkH);

        // Draw trunk
        Draw3D.drawBox3D(baseX, baseY, trunkW, trunkW, trunkH, this.trunkColor, extrusionAngle, sunAngle, true);

        // Canopy - sits on top of trunk
        const canopyR = this.size * 0.8;
        const branchCount = this._getLODCount(this.branches, 2, lodLevel);
        const polygonSides = lodLevel === 2 ? 4 : 6;

        for (let i = 0; i < branchCount; i++) {
            const { cos, sin } = this.branchAngles[i];
            const offsetX = cos * canopyR * 0.3;
            const offsetY = sin * canopyR * 0.3;

            Draw3D.drawPrism(
                baseX + offsetX,
                baseY + offsetY,
                this.blobSizes[i],
                polygonSides,
                this.size * 0.4,
                this.color,
                extrusionAngle,
                sunAngle,
                true
            );
        }
    }
}

/**
 * Crystal-like plant formation
 */
class CrystalPlant extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * (1.5 + Math.sin(this.seed) * 0.3);

        // Pre-calculate colors and angles
        this.crystals = Math.floor(4 + (this.seed % 5));
        this.crystalColor = this._getBrightenedColor(this.color, 60, 200);
        this.crystalAngles = this._generateAngles(this.crystals, this.seed);

        // Pre-calculate crystal heights
        this.crystalHeights = [];
        for (let i = 0; i < this.crystals; i++) {
            this.crystalHeights[i] = this.height * (0.7 + Math.sin(this.seed + i * 2) * 0.3);
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, this.height);
        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);
        const crystalCount = this._getLODCount(this.crystals, 2, lodLevel);
        const radius = this.size * 0.4;
        const cWidth = this.size * 0.2;

        for (let i = 0; i < crystalCount; i++) {
            const { cos, sin } = this.crystalAngles[i];
            const cHeight = this.crystalHeights[i];

            const cx = baseX + cos * radius;
            const cy = baseY + sin * radius;
            const cTopX = cx - cHeight * sinE;
            const cTopY = cy - cHeight * cosE;

            Draw3D.drawBox3D(cTopX, cTopY, cWidth, cWidth, cHeight, this.crystalColor, extrusionAngle, sunAngle, true);
        }

        // Central crystal (always drawn at LOD 2+)
        const centralTopX = baseX - this.height * sinE;
        const centralTopY = baseY - this.height * cosE;
        Draw3D.drawBox3D(centralTopX, centralTopY, this.size * 0.3, this.size * 0.3, this.height, this.color, extrusionAngle, sunAngle, true);
    }
}

/**
 * Tentacle-like plant with writhing appendages
 */
class TentaclePlant extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * (1.2 + Math.sin(this.seed) * 0.2);

        // Pre-calculate colors and angles
        this.tentacles = Math.floor(5 + (this.seed % 4));
        this.baseColor = this._getDarkenedColor(this.color, 0.7);
        this.tentacleAngles = this._generateAngles(this.tentacles, this.seed);
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const baseH = this.size * 0.3;
        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, baseH);
        const polygonSides = lodLevel === 2 ? 6 : 8;

        // Base bulb
        Draw3D.drawPrism(baseX, baseY, this.size * 0.5, polygonSides, baseH, this.baseColor, extrusionAngle, sunAngle, true);

        const tentacleCount = this._getLODCount(this.tentacles, 3, lodLevel);
        const segmentCount = lodLevel === 2 ? 1 : 3;

        for (let i = 0; i < tentacleCount; i++) {
            const { cos, sin } = this.tentacleAngles[i];

            for (let s = 0; s < segmentCount; s++) {
                const progress = s / 3;
                const radius = this.size * (0.3 + progress * 0.6);
                const tx = baseX + cos * radius;
                const ty = baseY + sin * radius - progress * this.height * 0.3;
                const tWidth = this.size * 0.15 * (1 - progress * 0.5);
                const tHeight = this.height * 0.3;

                Draw3D.drawBox3D(tx, ty, tWidth, tWidth, tHeight, this.color, extrusionAngle, sunAngle, true);
            }
        }
    }
}

/**
 * Spore-emitting stalk plant
 */
class SporeStalk extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * (2 + Math.sin(this.seed) * 0.4);

        // Pre-calculate colors and angles
        this.sporeColor = this._getBrightenedColor(this.color, 80, 180);
        this.sporeAngles = this._generateAngles(4, this.seed);
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, this.height);
        const stalkW = this.size * 0.2;
        const capH = this.size * 0.4;
        const capSides = lodLevel === 2 ? 6 : 12;

        // Thin stalk
        Draw3D.drawBox3D(baseX, baseY, stalkW, stalkW, this.height, this.color, extrusionAngle, sunAngle, true);

        // Spore cap at top
        Draw3D.drawPrism(baseX, baseY, this.size * 0.6, capSides, capH, this.sporeColor, extrusionAngle, sunAngle, true);

        // LOD 3 only: Small spore clusters
        if (lodLevel === 3) {
            const dist = this.size * 0.8;
            const sporeSize = this.size * 0.1;

            for (let i = 0; i < 4; i++) {
                const { cos, sin } = this.sporeAngles[i];
                const sx = baseX + cos * dist;
                const sy = baseY + sin * dist * 0.5;

                Draw3D.drawPrism(sx, sy, sporeSize, 6, sporeSize * 0.5, this.sporeColor, extrusionAngle, sunAngle, true);
            }
        }
    }
}

/**
 * Bubble-like bush formation
 */
class BubbleBush extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * (0.8 + Math.sin(this.seed) * 0.2);
        this.bubbles = Math.floor(6 + (this.seed % 5));

        // Pre-calculate bubble colors for each layer (0, 1, 2)
        this.bubbleColors = [0, 1, 2].map(layer =>
            color(
                red(this.color) + (layer * 20),
                green(this.color) + (layer * 20),
                blue(this.color) + (layer * 20),
                200 - layer * 30
            )
        );

        // Pre-calculate bubble angles
        this.bubbleAngles = this._generateAngles(this.bubbles, this.seed);
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, this.height);
        const bubbleCount = this._getLODCount(this.bubbles, 3, lodLevel);
        const sidesPerBubble = lodLevel === 2 ? 6 : 12;

        for (let i = 0; i < bubbleCount; i++) {
            const { cos, sin } = this.bubbleAngles[i];
            const layer = Math.min(Math.floor(i / 3), 2); // Clamp to 0-2
            const radius = this.size * (0.3 - layer * 0.1);
            const bx = baseX + cos * radius;
            const by = baseY + sin * radius;
            const bSize = this.size * (0.4 - layer * 0.1);
            const bHeight = this.height * (0.8 - layer * 0.2);

            Draw3D.drawPrism(bx, by, bSize, sidesPerBubble, bHeight, this.bubbleColors[layer], extrusionAngle, sunAngle, true);
        }
    }
}

/**
 * Base class for all surface fauna (creatures)
 * Provides common properties and movement behavior
 */
class SurfaceFauna {
    // Movement configuration constants
    static MOVE_SPEED_MIN = 5;
    static MOVE_SPEED_MAX = 15;
    static TURN_SPEED_MIN = 0.5;
    static TURN_SPEED_MAX = 1.0;
    static MOVE_DURATION_MIN = 2;
    static MOVE_DURATION_MAX = 5;
    static PAUSE_DURATION_MIN = 1;
    static PAUSE_DURATION_MAX = 3;

    // Attack behavior constants
    static ATTACK_SPEED_MULTIPLIER = 1.5;   // Speed multiplier when pursuing base
    static BASE_DETECTION_RANGE = 300;       // Max distance to detect player bases (reduced for less aggression)
    static BASE_ABANDON_RANGE = 600;         // Distance at which fauna abandons pursuit
    static ATTACK_DAMAGE = 5;                // Damage per attack
    static BASE_SEARCH_INTERVAL = 2.0;       // Seconds between base searches

    /**
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} size - Fauna size
     * @param {Array} planetColors - Array of planet colors from palette [baseColor, feature1, feature2, feature3]
     */
    constructor(x, y, size, planetColors, seed) {
        this.pos = createVector(x, y);
        this.size = size || 15;
        this.yOffset = 0; // Height offset matching terrain
        this.destroyed = false;
        this.planetColors = planetColors || [];
        this.seed = (typeof seed === 'number') ? seed : Math.random() * 1000;
        this.color = this._getPlanetBasedColor();

        // Health system (compatible with SurfaceObject)
        this.health = 30; // Fauna is very fragile (more fragile than flora)
        this.maxHealth = 30;

        // Movement - use seed for deterministic variation
        this.moveSpeed = SurfaceFauna.MOVE_SPEED_MIN + this._getSeededVariation(1.1) * (SurfaceFauna.MOVE_SPEED_MAX - SurfaceFauna.MOVE_SPEED_MIN);
        this.moveAngle = this._getSeededVariation(2.3) * Math.PI * 2;
        this.turnSpeed = SurfaceFauna.TURN_SPEED_MIN + this._getSeededVariation(3.7) * (SurfaceFauna.TURN_SPEED_MAX - SurfaceFauna.TURN_SPEED_MIN);
        this.moveTimer = 0;
        this.moveDuration = SurfaceFauna.MOVE_DURATION_MIN + this._getSeededVariation(4.1) * (SurfaceFauna.MOVE_DURATION_MAX - SurfaceFauna.MOVE_DURATION_MIN);
        this.pauseDuration = SurfaceFauna.PAUSE_DURATION_MIN + this._getSeededVariation(5.3) * (SurfaceFauna.PAUSE_DURATION_MAX - SurfaceFauna.PAUSE_DURATION_MIN);
        this.isPaused = false;

        // Animation
        this.animTime = this._getSeededVariation(6.7) * Math.PI * 2;

        // Combat/Targeting
        this.targetBase = null;
        this.attackCooldown = 0;
        this.attackRate = 2.0; // Seconds between attacks
        this.isSurface = true; // Mark as surface entity for HUD
    }

    /**
     * Get the vertical height of the fauna for HUD/targeting
     * @returns {number} Height in world units
     */
    getHeight() {
        return this.height || this.size;
    }

    /**
     * Get color based on planet palette colors with slight variation
     * @returns {p5.Color} Color for this fauna
     */
    _getPlanetBasedColor() {
        // Use seed for deterministic selection and variation
        // Fauna tends to use different colors than flora for variety
        const colorIndex = Math.floor((Math.sin(this.seed * 5.3) * 0.5 + 0.5) * this.planetColors.length);
        const baseCol = this.planetColors[colorIndex] || this.planetColors[0] || color(100, 100, 120);

        // Shift RGB channels differently than flora for more variety
        const rShift = (Math.sin(this.seed * 6.7) * 0.5 + 0.5) * 50 - 25; // -25 to +25
        const gShift = (Math.sin(this.seed * 7.1) * 0.5 + 0.5) * 40 - 20; // -20 to +20
        const bShift = (Math.sin(this.seed * 8.3) * 0.5 + 0.5) * 40 - 20; // -20 to +20

        const r = constrain(red(baseCol) + rShift, 0, 255);
        const g = constrain(green(baseCol) + gShift, 0, 255);
        const b = constrain(blue(baseCol) + bShift, 0, 255);

        return color(r, g, b);
    }

    /**
     * Get projection helpers with fallback
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} alt - Base altitude
     * @param {number} height - Additional height offset
     * @returns {Object} Projection data {extrusionAngle, baseX, baseY}
     */
    _getProjection(worldX, worldY, alt, height = 0) {
        return typeof getProjectionHelpers === 'function'
            ? getProjectionHelpers(worldX, worldY, alt + height)
            : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };
    }

    /**
     * Get deterministic variation based on seed
     * @param {number} multiplier - Seed multiplier for variation
     * @returns {number} Value between 0 and 1
     */
    _getSeededVariation(multiplier) {
        return Math.sin(this.seed * multiplier) * 0.5 + 0.5;
    }

    /**
     * Generate array of angles with pre-calculated sin/cos
     * @param {number} count - Number of angles to generate
     * @param {number} offset - Angle offset in radians
     * @returns {Array} Array of {cos, sin} objects
     */
    _generateAngles(count, offset = 0) {
        const angles = [];
        for (let i = 0; i < count; i++) {
            const angle = (i / count) * Math.PI * 2 + offset;
            angles.push({
                cos: Math.cos(angle),
                sin: Math.sin(angle)
            });
        }
        return angles;
    }

    /**
     * Get LOD-adjusted count
     * @param {number} fullCount - Full detail count
     * @param {number} lod2Count - LOD 2 count
     * @param {number} lodLevel - Current LOD level
     * @returns {number} Adjusted count
     */
    _getLODCount(fullCount, lod2Count, lodLevel) {
        return lodLevel === 2 ? Math.min(lod2Count, fullCount) : fullCount;
    }

    /**
     * Create darkened version of color
     * @param {p5.Color} baseColor - Base color
     * @param {number} factor - Darkening factor (0-1)
     * @returns {p5.Color} Darkened color
     */
    _getDarkenedColor(baseColor, factor = 0.5) {
        return color(
            red(baseColor) * factor,
            green(baseColor) * factor,
            blue(baseColor) * factor
        );
    }

    /**
     * Create brightened version of color
     * @param {p5.Color} baseColor - Base color
     * @param {number} amount - Amount to add to each channel
     * @param {number} alpha - Alpha value (0-255)
     * @returns {p5.Color} Brightened color
     */
    _getBrightenedColor(baseColor, amount, alpha = 255) {
        return color(
            red(baseColor) + amount,
            green(baseColor) + amount,
            blue(baseColor) + amount,
            alpha
        );
    }

    /**
     * Update creature movement and behavior
     * @param {number} dt - Delta time in seconds
     * @param {Object} player - Player reference
     */
    update(dt, player) {
        if (this.destroyed) return;

        this.animTime += dt * 2;
        this.moveTimer += dt;

        // Reduce attack cooldown
        if (this.attackCooldown > 0) {
            this.attackCooldown -= dt;
        }

        // Periodically look for player bases to attack
        const searchInterval = SurfaceFauna.BASE_SEARCH_INTERVAL;
        if (Math.floor(this.moveTimer / searchInterval) !== Math.floor((this.moveTimer - dt) / searchInterval) && !this.targetBase) {
            this._findNearestBase();
        }

        if (this.targetBase) {
            this._updateAttackBehavior(dt);
        } else {
            this._updateWanderBehavior(dt);
        }
    }

    /**
     * Wander randomly when no target
     * @private
     */
    _updateWanderBehavior(dt) {
        if (this.isPaused) {
            if (this.moveTimer >= this.pauseDuration) {
                this.isPaused = false;
                this.moveTimer = 0;
                // Use seeded variation instead of Math.random() for determinism
                const turnVariation = Math.sin(this.seed * 7.3 + this.pos.x * 0.01 + this.pos.y * 0.01) * 0.5;
                this.moveAngle += turnVariation * Math.PI;
            }
        } else {
            if (this.moveTimer >= this.moveDuration) {
                this.isPaused = true;
                this.moveTimer = 0;
            } else {
                this.pos.x += Math.cos(this.moveAngle) * this.moveSpeed * dt;
                this.pos.y += Math.sin(this.moveAngle) * this.moveSpeed * dt;
                // Use seeded variation for gradual direction changes
                const wanderVariation = Math.sin(this.seed * 11.7 + this.animTime * 0.5) * 0.5;
                this.moveAngle += wanderVariation * this.turnSpeed * dt;
            }
        }
    }

    /**
     * Seek and attack target base
     * @private
     */
    _updateAttackBehavior(dt) {
        if (!this.targetBase || this.targetBase.destroyed) {
            this.targetBase = null;
            return;
        }

        const dist = p5.Vector.dist(this.pos, this.targetBase.pos);
        const attackRange = (this.targetBase.size || 50) + this.size;

        if (dist > attackRange * 0.8) {
            // Move towards base
            const angleToBase = Math.atan2(this.targetBase.pos.y - this.pos.y, this.targetBase.pos.x - this.pos.x);
            this.moveAngle = angleToBase;
            this.pos.x += Math.cos(this.moveAngle) * this.moveSpeed * SurfaceFauna.ATTACK_SPEED_MULTIPLIER * dt;
            this.pos.y += Math.sin(this.moveAngle) * this.moveSpeed * SurfaceFauna.ATTACK_SPEED_MULTIPLIER * dt;
        } else {
            // At base - attack!
            if (this.attackCooldown <= 0) {
                this.attackCooldown = this.attackRate;
                if (typeof this.targetBase.takeDamage === 'function') {
                    this.targetBase.takeDamage(SurfaceFauna.ATTACK_DAMAGE);
                }
            }
        }

        // Lose interest if too far or base destroyed
        if (dist > SurfaceFauna.BASE_ABANDON_RANGE) {
            this.targetBase = null;
        }
    }

    /**
     * Find nearest player-built base in surfaceMode.surfaceObjects
     * @private
     */
    _findNearestBase() {
        if (typeof surfaceMode === 'undefined' || !surfaceMode || !surfaceMode.surfaceObjects) return;
        if (!Array.isArray(surfaceMode.surfaceObjects) || surfaceMode.surfaceObjects.length === 0) return;

        let nearest = null;
        let minDist = SurfaceFauna.BASE_DETECTION_RANGE;

        for (const obj of surfaceMode.surfaceObjects) {
            if (!obj || obj.destroyed || !obj.playerBuilt) continue;

            const d = p5.Vector.dist(this.pos, obj.pos);
            if (d < minDist) {
                minDist = d;
                nearest = obj;
            }
        }

        this.targetBase = nearest;
    }

    /**
     * Draw fauna - override in subclasses
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} sunAngle - Sun angle for lighting
     * @param {number} alt - Altitude above terrain
     * @param {number} lodLevel - Level of detail (3=full, 2=medium, 1=low, 0=skip)
     */
    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Base implementation - override in subclasses
    }

    /**
     * Apply damage to fauna
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0 && !this.destroyed) {
            this.destroyed = true;
            if (typeof surfaceMode !== 'undefined' && this.cellKey) {
                surfaceMode.registerDestruction(this.cellKey);
            }
            this.onDestroy();
        }
    }

    /**
     * Called when fauna is destroyed
     */
    onDestroy() {
        // Fauna doesn't drop anything or create explosions
    }

    /**
     * Check collision with projectile (compatible with surface object system)
     * @param {Object} projectile - Projectile to check
     * @returns {boolean} True if collision detected
     */
    checkCollision(projectile) {
        return false; // Use default radius-based collision in surfaceMode
    }
}

/**
 * Slithering snake-like creature
 */
class SlitherCreature extends SurfaceFauna {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.segments = 6;
        this.height = size * 0.3;
        // Track each segment's angle for smooth following
        this.segmentAngles = new Array(this.segments).fill(this.moveAngle);

        // Pre-calculate segment colors
        this.segmentColors = [];
        for (let i = 0; i < this.segments; i++) {
            const progress = i / this.segments;
            this.segmentColors[i] = this._getDarkenedColor(this.color, 1 - progress * 0.2);
        }
    }

    /**
     * Update with smooth tail following
     * @override
     */
    update(dt, player) {
        super.update(dt, player);

        if (this.destroyed) return;

        // Smoothly interpolate each segment's angle towards the one in front
        const smoothness = 5.0;

        for (let i = this.segments - 1; i >= 0; i--) {
            const targetAngle = i === 0 ? this.moveAngle : this.segmentAngles[i - 1];

            // Calculate shortest angular distance
            let angleDiff = targetAngle - this.segmentAngles[i];
            // Normalize to [-PI, PI]
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;

            // Smoothly interpolate
            this.segmentAngles[i] += angleDiff * smoothness * dt;
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, this.height);
        const segmentCount = this._getLODCount(this.segments, 3, lodLevel);
        const polygonSides = lodLevel === 2 ? 6 : 8;

        // Draw segmented body with sine wave motion
        for (let i = 1; i < segmentCount; i++) {
            const progress = i / this.segments;
            const waveOffset = Math.sin(this.animTime + progress * Math.PI * 2) * this.size * 0.2;
            const segmentAngle = this.segmentAngles[i] || this.moveAngle;

            // Calculate world-space position for this segment
            const segmentWorldX = worldX - Math.cos(segmentAngle) * i * this.size * 0.3 + Math.sin(segmentAngle) * waveOffset;
            const segmentWorldY = worldY - Math.sin(segmentAngle) * i * this.size * 0.3 - Math.cos(segmentAngle) * waveOffset;

            // Project each segment individually
            const { baseX: sx, baseY: sy } = this._getProjection(segmentWorldX, segmentWorldY, alt, this.height);
            const segSize = this.size * (1 - progress * 0.3);

            Draw3D.drawPrism(sx, sy, segSize, polygonSides, this.height, this.segmentColors[i], extrusionAngle, sunAngle, true);
        }

        // Head (drawn last for depth)
        const headSize = this.size * 1.2;
        Draw3D.drawPrism(baseX, baseY, headSize, 6, this.height * 1.5, this.color, extrusionAngle, sunAngle, true);
    }
}

/**
 * Floating jellyfish-like creature
 */
class FloaterCreature extends SurfaceFauna {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.floatHeight = size * 2;
        this.tentacles = 4;

        // Pre-calculate bell color
        this.bellColor = color(
            red(this.color),
            green(this.color),
            blue(this.color),
            200
        );
    }

    /**
     * @override
     */
    getHeight() {
        return this.floatHeight + this.size;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const floatOffset = Math.sin(this.animTime) * this.size * 0.3;
        const totalAlt = alt + this.floatHeight + floatOffset;
        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, totalAlt, 0);
        const bellSides = lodLevel === 2 ? 8 : 12;

        // Bell/dome body
        Draw3D.drawPrism(baseX, baseY, this.size, bellSides, this.size * 0.8, this.bellColor, extrusionAngle, sunAngle, true);

        const tentacleCount = lodLevel === 2 ? 2 : this.tentacles;
        const segmentCount = lodLevel === 2 ? 1 : 3;

        for (let i = 0; i < tentacleCount; i++) {
            const angle = (i / this.tentacles) * Math.PI * 2 + this.animTime * 0.5;

            for (let s = 0; s < segmentCount; s++) {
                const progress = s / 3;
                const tx = baseX + Math.cos(angle) * this.size * 0.3 * progress;
                const ty = baseY + this.size * 0.5 + progress * this.size * 1.5;
                const tWave = Math.sin(this.animTime * 2 + progress * Math.PI) * this.size * 0.15;
                const tWidth = this.size * 0.1 * (1 - progress * 0.5);

                Draw3D.drawBox3D(
                    tx + Math.sin(angle) * tWave,
                    ty + Math.cos(angle) * tWave,
                    tWidth,
                    tWidth,
                    this.size * 0.5,
                    this.color,
                    extrusionAngle,
                    sunAngle,
                    true
                );
            }
        }
    }
}

/**
 * Rolling ball-like creature
 */
class RollerCreature extends SurfaceFauna {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.spikes = 8;

        // Pre-calculate spike color and angles
        this.spikeColor = this._getDarkenedColor(this.color, 0.7);
        this.spikeAngles = this._generateAngles(this.spikes);
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const radius = this.size;
        const height = radius * 1.8;
        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, 0);
        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);
        const bodySides = lodLevel === 2 ? 8 : 12;

        // Sphere center/top
        const topX = baseX - height * sinE;
        const topY = baseY - height * cosE;

        // Main body sphere
        Draw3D.drawPrism(topX, topY, this.size, bodySides, height, this.color, extrusionAngle, sunAngle, true);

        // LOD 3 only: Spikes
        if (lodLevel === 3) {
            const spikeSize = this.size * 0.2;

            for (let i = 0; i < this.spikes; i++) {
                const { cos, sin } = this.spikeAngles[i];
                const sx = topX - 2 + cos * this.size * 0.8;
                const sy = topY - 6 + sin * this.size * 0.8;

                Draw3D.drawBox3D(sx, sy, spikeSize, spikeSize, this.size * 0.4, this.spikeColor, extrusionAngle, sunAngle, true);
            }
        }
    }
}

/**
 * Tall stalking creature on long legs
 */
class StalkCreature extends SurfaceFauna {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.bodyHeight = size * 2;
        this.legs = 4;
        this.legLength = size * 1.5;

        // Pre-calculate head color and leg angles
        this.headColor = this._getBrightenedColor(this.color, 40);
        this.legAngles = this._generateAngles(this.legs);
    }

    /**
     * @override
     */
    getHeight() {
        return this.legLength + this.bodyHeight;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } = this._getProjection(worldX, worldY, alt, 0);
        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);
        const legCount = this._getLODCount(this.legs, 2, lodLevel);
        const drawLowerLeg = lodLevel === 3;
        const legW = this.size * 0.15;

        for (let i = 0; i < legCount; i++) {
            const { cos, sin } = this.legAngles[i];
            const legPhase = (i % 2) * Math.PI;
            const legBend = Math.sin(this.animTime * 2 + legPhase) * this.size * 0.2;

            const lx = baseX + cos * this.size * 0.4;
            const ly = baseY + sin * this.size * 0.4;
            const legH = this.legLength;
            const lTopX = lx - legH * sinE;
            const lTopY = ly - legH * cosE;

            // Upper leg
            Draw3D.drawBox3D(
                lTopX + cos * legBend * 0.5,
                lTopY + sin * legBend * 0.5,
                legW,
                legW,
                this.legLength * 0.6,
                this.color,
                extrusionAngle,
                sunAngle,
                true
            );

            // Lower leg (LOD 3 only)
            if (drawLowerLeg) {
                Draw3D.drawBox3D(
                    lTopX + cos * legBend,
                    lTopY + sin * legBend,
                    legW * 0.8,
                    legW * 0.8,
                    this.legLength * 0.4,
                    this.color,
                    extrusionAngle,
                    sunAngle,
                    true
                );
            }
        }

        // Body elevated on legs
        const bodyH = this.bodyHeight;
        const totalHeight = this.legLength + bodyH;
        const bTopX = baseX - totalHeight * sinE;
        const bTopY = baseY - totalHeight * cosE;
        const bodySides = lodLevel === 2 ? 6 : 8;

        Draw3D.drawPrism(bTopX, bTopY, this.size * 0.8, bodySides, bodyH, this.color, extrusionAngle, sunAngle, true);

        // Head/sensory organ (LOD 3 only)
        if (lodLevel === 3) {
            const headH = this.size * 0.6;
            const hTopX = bTopX - headH * 0.5 * sinE;
            const hTopY = bTopY - headH * 0.5 * cosE;

            Draw3D.drawPrism(hTopX, hTopY, this.size * 0.5, 6, headH, this.headColor, extrusionAngle, sunAngle, true);
        }
    }
}

// Module exports for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SurfaceFlora, SurfaceFauna,
        AlienTree, CrystalPlant, TentaclePlant, SporeStalk, BubbleBush,
        SlitherCreature, FloaterCreature, RollerCreature, StalkCreature
    };
}
