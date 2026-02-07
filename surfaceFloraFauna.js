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
        this.trunkColor = color(
            red(this.color) * 0.5,
            green(this.color) * 0.5,
            blue(this.color) * 0.5
        );
        this.branches = Math.floor(3 + (this.seed % 4));
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const trunkW = this.size * 0.3;
        const trunkH = this.height * 0.6;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + trunkH) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Draw trunk
        Draw3D.drawBox3D(baseX, baseY, trunkW, trunkW, trunkH, this.trunkColor, extrusionAngle, sunAngle, true);

        // Canopy - sits on top of trunk
        const canopyR = this.size * 0.8;

        // LOD 2: Reduced branches (max 2), LOD 3: Full branches
        const branchCount = lodLevel === 2 ? Math.min(2, this.branches) : this.branches;

        for (let i = 0; i < branchCount; i++) {
            const angle = (i / this.branches) * Math.PI * 2;
            const offsetX = Math.cos(angle) * canopyR * 0.3;
            const offsetY = Math.sin(angle) * canopyR * 0.3;
            const blobSize = canopyR * (0.6 + Math.sin(this.seed + i) * 0.2);

            Draw3D.drawPrism(
                baseX + offsetX,
                baseY + offsetY,
                blobSize,
                lodLevel === 2 ? 4 : 6, // Reduce polygon sides at LOD 2
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
        this.crystals = Math.floor(4 + (this.seed % 5));
        this.crystalColor = color(
            red(this.color) + 60,
            green(this.color) + 60,
            blue(this.color) + 60,
            200
        );
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        // Use altitude-corrected projection (baseX/baseY is the visual top)
        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + this.height) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);

        // LOD 2: Central + 2 side crystals, LOD 3: Full crystals
        const crystalCount = lodLevel === 2 ? Math.min(2, this.crystals) : this.crystals;

        for (let i = 0; i < crystalCount; i++) {
            const angle = (i / this.crystals) * Math.PI * 2 + this.seed;
            const radius = this.size * 0.4;
            const cHeight = this.height * (0.7 + Math.sin(this.seed + i * 2) * 0.3);
            const cWidth = this.size * 0.2;

            const cx = baseX + Math.cos(angle) * radius;
            const cy = baseY + Math.sin(angle) * radius;
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
        this.tentacles = Math.floor(5 + (this.seed % 4));
        this.baseColor = color(
            red(this.color) * 0.7,
            green(this.color) * 0.7,
            blue(this.color) * 0.7
        );
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const baseH = this.size * 0.3;
        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + baseH) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Base bulb - baseX/baseY is top of bulb
        Draw3D.drawPrism(baseX, baseY, this.size * 0.5, lodLevel === 2 ? 6 : 8, baseH, this.baseColor, extrusionAngle, sunAngle, true);

        // LOD 2: Reduced tentacles (max 3) with 1 segment, LOD 3: Full tentacles with 3 segments
        const tentacleCount = lodLevel === 2 ? Math.min(3, this.tentacles) : this.tentacles;
        const segmentCount = lodLevel === 2 ? 1 : 3;

        for (let i = 0; i < tentacleCount; i++) {
            const angle = (i / this.tentacles) * Math.PI * 2 + this.seed;

            for (let s = 0; s < segmentCount; s++) {
                const progress = s / 3; // Always use 3 for consistent positioning
                const radius = this.size * (0.3 + progress * 0.6);
                const tx = baseX + Math.cos(angle) * radius;
                const ty = baseY + Math.sin(angle) * radius - progress * this.height * 0.3;
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
        this.sporeColor = color(
            red(this.color) + 80,
            green(this.color) + 80,
            blue(this.color) + 80,
            180
        );
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + this.height) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Thin stalk - baseX/baseY is top of stalk
        const stalkW = this.size * 0.2;
        Draw3D.drawBox3D(baseX, baseY, stalkW, stalkW, this.height, this.color, extrusionAngle, sunAngle, true);

        // Spore cap at top (reduced polygon sides at LOD 2)
        const capH = this.size * 0.4;
        Draw3D.drawPrism(baseX, baseY, this.size * 0.6, lodLevel === 2 ? 6 : 12, capH, this.sporeColor, extrusionAngle, sunAngle, true);

        // LOD 3 only: Small spore clusters floating around cap
        if (lodLevel === 3) {
            for (let i = 0; i < 4; i++) {
                const angle = (i / 4) * Math.PI * 2 + this.seed;
                const dist = this.size * 0.8;
                const sx = baseX + Math.cos(angle) * dist;
                const sy = baseY + Math.sin(angle) * dist * 0.5;
                const sporeSize = this.size * 0.1;

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
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + this.height) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // LOD 2: Max 3 bubbles, LOD 3: Full bubbles
        const bubbleCount = lodLevel === 2 ? Math.min(3, this.bubbles) : this.bubbles;
        const sidesPerBubble = lodLevel === 2 ? 6 : 12;

        for (let i = 0; i < bubbleCount; i++) {
            const angle = (i / this.bubbles) * Math.PI * 2 + this.seed;
            const layer = Math.floor(i / 3);
            const radius = this.size * (0.3 - layer * 0.1);
            const bx = baseX + Math.cos(angle) * radius;
            const by = baseY + Math.sin(angle) * radius;
            const bSize = this.size * (0.4 - layer * 0.1);
            const bHeight = this.height * (0.8 - layer * 0.2);

            const bubbleColor = color(
                red(this.color) + (layer * 20),
                green(this.color) + (layer * 20),
                blue(this.color) + (layer * 20),
                200 - layer * 30
            );

            Draw3D.drawPrism(bx, by, bSize, sidesPerBubble, bHeight, bubbleColor, extrusionAngle, sunAngle, true);
        }
    }
}

/**
 * Hexagonal palm tree
 */
class HexPalm extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * (3 + Math.sin(this.seed) * 0.5);
        this.trunkColor = color(
            red(this.color) * 0.6,
            green(this.color) * 0.5,
            blue(this.color) * 0.4
        );
        this.leaves = 6;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + this.height) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Hexagonal Trunk
        const trunkW = this.size * 0.4;
        Draw3D.drawPrism(baseX, baseY, trunkW, 6, this.height, this.trunkColor, extrusionAngle, sunAngle, true);

        // Leaves at top
        const leafLen = this.size * 1.5;
        const leafW = this.size * 0.4;

        for (let i = 0; i < this.leaves; i++) {
            const angle = (i / this.leaves) * Math.PI * 2 + this.seed;
            // Project leaf end based on angle
            const endDist = leafLen;
            const lx = baseX + Math.cos(angle) * endDist * 0.6;
            const ly = baseY + Math.sin(angle) * endDist * 0.6;

            // Simple leaf representation
            Draw3D.drawBox3D(lx, ly, leafW, leafW, this.size * 0.2, this.color, extrusionAngle, sunAngle, true);
        }
    }
}

/**
 * Stacked Pyramid Cactus
 */
class PyramidCactus extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.segments = Math.floor(3 + (this.seed % 3));
        this.height = size * this.segments * 0.8;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        let currentAlt = alt;
        const { extrusionAngle } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt) : { extrusionAngle: 0.5 };

        for (let i = 0; i < this.segments; i++) {
            const segSize = this.size * (1 - i * 0.2);
            const segHeight = this.size * 0.8;

            // Draw from top of segment down
            const { baseX, baseY } =
                typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, currentAlt + segHeight) : { baseX: worldX, baseY: worldY };

            // 4-sided prism (pyramid-like blocks)
            Draw3D.drawPrism(baseX, baseY, segSize, 4, segHeight, this.color, extrusionAngle, sunAngle, true);
            currentAlt += segHeight;
        }
    }
}

/**
 * Luminescent Fungi
 */
class LuminescentFungi extends SurfaceFlora {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * (1.5 + Math.sin(this.seed) * 0.5);
        this.glowColor = color(
            Math.min(255, red(this.color) + 120),
            Math.min(255, green(this.color) + 120),
            Math.min(255, blue(this.color) + 120),
            240
        );
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + this.height) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Stalk
        const stalkW = this.size * 0.2;
        Draw3D.drawPrism(baseX, baseY, stalkW, 5, this.height, this.color, extrusionAngle, sunAngle, true);

        // Glowing Cap (Dome)
        const capSize = this.size * 0.8;
        // Dome draws from center, so we can just place it at top (baseX, baseY)
        Draw3D.drawDome(baseX, baseY, capSize, 8, this.glowColor, extrusionAngle, sunAngle);
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
        const getVariation = (multiplier) => Math.sin(this.seed * multiplier) * 0.5 + 0.5;

        this.moveSpeed = SurfaceFauna.MOVE_SPEED_MIN + getVariation(1.1) * (SurfaceFauna.MOVE_SPEED_MAX - SurfaceFauna.MOVE_SPEED_MIN);
        this.moveAngle = getVariation(2.3) * Math.PI * 2;
        this.turnSpeed = SurfaceFauna.TURN_SPEED_MIN + getVariation(3.7) * (SurfaceFauna.TURN_SPEED_MAX - SurfaceFauna.TURN_SPEED_MIN);
        this.moveTimer = 0;
        this.moveDuration = SurfaceFauna.MOVE_DURATION_MIN + getVariation(4.1) * (SurfaceFauna.MOVE_DURATION_MAX - SurfaceFauna.MOVE_DURATION_MIN);
        this.pauseDuration = SurfaceFauna.PAUSE_DURATION_MIN + getVariation(5.3) * (SurfaceFauna.PAUSE_DURATION_MAX - SurfaceFauna.PAUSE_DURATION_MIN);
        this.isPaused = false;

        // Animation
        this.animTime = getVariation(6.7) * Math.PI * 2;

        // Combat/Targeting
        this.targetBase = null;
        this.attackCooldown = 0;
        this.attackRate = 2.0; // Seconds between attacks
        this.isSurface = true; // Mark as surface entity for HUD
        this.isFauna = true;   // Mark as fauna for aggressive culling
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
     * Update creature movement and behavior
     * @param {number} dt - Delta time in seconds
     * @param {Object} player - Player reference
     */
    update(dt, player) {
        if (this.destroyed) return;

        // Update height based on terrain
        if (typeof surfaceMode !== 'undefined' && typeof surfaceMode._getTerrainHeightAt === 'function') {
            this.yOffset = surfaceMode._getTerrainHeightAt(this.pos.x, this.pos.y);
        }

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
    }

    /**
     * Update with smooth tail following
     * @override
     */
    update(dt, player) {
        super.update(dt, player);

        if (this.destroyed) return;

        // Smoothly interpolate each segment's angle towards the one in front
        // The head follows moveAngle, each segment follows the previous segment
        const smoothness = 5.0; // Higher = faster following

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

        // Use altitude-corrected projection (baseX/baseY is the visual top)
        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function'
                ? getProjectionHelpers(worldX, worldY, alt + this.height)
                : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);

        // LOD 2: Head + 2 segments, LOD 3: All segments
        const segmentCount = lodLevel === 2 ? Math.min(3, this.segments) : this.segments;
        const polygonSides = lodLevel === 2 ? 6 : 8;

        // Draw segmented body with sine wave motion
        for (let i = 1; i < segmentCount; i++) {
            const progress = i / this.segments;
            const waveOffset = Math.sin(this.animTime + progress * Math.PI * 2) * this.size * 0.2;

            // Use the smoothed angle for this segment
            const segmentAngle = this.segmentAngles[i] || this.moveAngle;

            // Calculate world-space position for this segment using its smooth angle
            const segmentWorldX = worldX - Math.cos(segmentAngle) * i * this.size * 0.3 + Math.sin(segmentAngle) * waveOffset;
            const segmentWorldY = worldY - Math.sin(segmentAngle) * i * this.size * 0.3 - Math.cos(segmentAngle) * waveOffset;

            // Project each segment individually with proper altitude for smooth movement
            const { baseX: sx, baseY: sy } =
                typeof getProjectionHelpers === 'function'
                    ? getProjectionHelpers(segmentWorldX, segmentWorldY, alt + this.height)
                    : { baseX: segmentWorldX, baseY: segmentWorldY };

            const segSize = this.size * (1 - progress * 0.3);
            const segColor = color(
                red(this.color) * (1 - progress * 0.2),
                green(this.color) * (1 - progress * 0.2),
                blue(this.color) * (1 - progress * 0.2)
            );

            Draw3D.drawPrism(sx, sy, segSize, polygonSides, this.height, segColor, extrusionAngle, sunAngle, true);
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
        this.height = this.floatHeight + this.size;
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

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function'
                ? getProjectionHelpers(worldX, worldY, totalAlt)
                : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Bell/dome body - baseX/baseY is already at totalAlt
        const bellColor = color(
            red(this.color),
            green(this.color),
            blue(this.color),
            200
        );
        const bellSides = lodLevel === 2 ? 8 : 12;
        Draw3D.drawPrism(baseX, baseY, this.size, bellSides, this.size * 0.8, bellColor, extrusionAngle, sunAngle, true);

        // LOD 2: 2 tentacles with 1 segment each, LOD 3: Full tentacles with 3 segments
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
        this.height = size * 1.8; // Match the projection height in draw()
        this.moveSpeed *= 0.5; // Slower rolling
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        // Ball sits on ground, its height is basically its size
        const radius = this.size;
        const height = radius * 1.8; // Almost a full sphere projection

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function'
                ? getProjectionHelpers(worldX, worldY, alt)
                : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);

        // Sphere center/top
        const topX = baseX - height * sinE;
        const topY = baseY - height * cosE;

        // Main body sphere (as prism)
        const bodySides = lodLevel === 2 ? 8 : 12;
        Draw3D.drawPrism(topX, topY, this.size, bodySides, height, this.color, extrusionAngle, sunAngle, true);

        // LOD 2: 4 spikes, LOD 3: All spikes
        const spikeCount = lodLevel === 2 ? 0 : this.spikes;
        const rotation = this.animTime;

        // Position spikes around the sphere's visual center (topX, topY)
        // The topX, topY is already the correct visual center of the sphere
        for (let i = 0; i < spikeCount; i++) {
            const angle = (i / this.spikes) * Math.PI * 2 + rotation;
            const sx = topX - 2 + Math.cos(angle) * this.size * 0.8;
            const sy = topY - 6 + Math.sin(angle) * this.size * 0.8;
            const spikeSize = this.size * 0.2;

            const spikeColor = color(
                red(this.color) * 0.7,
                green(this.color) * 0.7,
                blue(this.color) * 0.7
            );

            Draw3D.drawBox3D(sx, sy, spikeSize, spikeSize, this.size * 0.4, spikeColor, extrusionAngle, sunAngle, true);
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
        this.height = this.legLength + this.bodyHeight;
    }

    /**
     * @override
     */
    getHeight() {
        return this.legLength + this.bodyHeight;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function'
                ? getProjectionHelpers(worldX, worldY, alt)
                : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        const sinE = Math.sin(extrusionAngle);
        const cosE = Math.cos(extrusionAngle);

        // LOD 2: 2 legs with single segment, LOD 3: All legs with 2 segments
        const legCount = lodLevel === 2 ? 2 : this.legs;
        const drawLowerLeg = lodLevel === 3;

        for (let i = 0; i < legCount; i++) {
            const angle = (i / this.legs) * Math.PI * 2;
            const legPhase = (i % 2) * Math.PI; // Alternate leg movement
            const legBend = Math.sin(this.animTime * 2 + legPhase) * this.size * 0.2;

            const lx = baseX + Math.cos(angle) * this.size * 0.4;
            const ly = baseY + Math.sin(angle) * this.size * 0.4;
            const legW = this.size * 0.15;

            const legH = this.legLength;
            const lTopX = lx - legH * sinE;
            const lTopY = ly - legH * cosE;

            // Upper leg (always drawn at LOD 2+)
            Draw3D.drawBox3D(
                lTopX + Math.cos(angle) * legBend * 0.5,
                lTopY + Math.sin(angle) * legBend * 0.5,
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
                    lTopX + Math.cos(angle) * legBend,
                    lTopY + Math.sin(angle) * legBend,
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

            const headColor = color(
                red(this.color) + 40,
                green(this.color) + 40,
                blue(this.color) + 40
            );
            Draw3D.drawPrism(hTopX, hTopY, this.size * 0.5, 6, headH, headColor, extrusionAngle, sunAngle, true);
        }
    }
}

/**
 * Hopping creature
 */
class HopperCreature extends SurfaceFauna {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * 1.5;
        this.jumpPhase = 0;
        this.moveSpeed *= 0.4; // Slower hopping
    }

    update(dt, player) {
        super.update(dt, player);
        if (!this.isPaused) {
            this.jumpPhase += dt * 5.0; // Slower jump animation
        } else {
            this.jumpPhase = 0;
        }
    }

    getHeight() {
        const jumpH = !this.isPaused ? Math.abs(Math.sin(this.jumpPhase)) * this.size : 0;
        return this.height + jumpH;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const jumpH = !this.isPaused ? Math.abs(Math.sin(this.jumpPhase)) * this.size : 0;
        const totalAlt = alt + jumpH;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, totalAlt + this.height) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Body (egg shape)
        Draw3D.drawPrism(baseX, baseY, this.size * 0.8, 8, this.height * 0.8, this.color, extrusionAngle, sunAngle, true);

        // Simple legs
        if (lodLevel >= 2) {
            const legLen = this.size * 1.0;
            const angleOff = Math.PI / 4;
            for (let i = 0; i < 2; i++) {
                // Left and Right legs
                const angle = (i === 0 ? -angleOff : angleOff) + this.moveAngle;
                const lx = baseX + Math.cos(angle) * legLen * 0.8;
                const ly = baseY + Math.sin(angle) * legLen * 0.8;

                Draw3D.drawBox3D(lx, ly, this.size * 0.3, this.size * 0.3, this.size * 0.8, this.color, extrusionAngle, sunAngle, true);
            }
        }
    }
}

/**
 * Gliding/Flying creature
 */
class GliderCreature extends SurfaceFauna {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.moveSpeed *= 0.5; // Reduced from 1.5
        this.height = size * 5;
    }

    getHeight() {
        return this.height;
    }

    update(dt, player) {
        super.update(dt, player);
        this.height = this.size * 5 + Math.sin(this.animTime) * this.size * 2;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const totalAlt = alt + this.height;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, totalAlt) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Flat wide body (Triangle wings)
        const wingSpan = this.size * 3.0;
        Draw3D.drawPrism(baseX, baseY, wingSpan * 0.5, 3, this.size * 0.2, this.color, extrusionAngle, sunAngle, true);

        // Tail
        Draw3D.drawBox3D(baseX - Math.cos(this.moveAngle) * this.size, baseY - Math.sin(this.moveAngle) * this.size, this.size * 0.2, this.size * 0.2, this.size, this.color, extrusionAngle, sunAngle, true);
    }
}

/**
 * Hexapod Beetle
 */
class HexapodCreature extends SurfaceFauna {
    constructor(x, y, size, planetColors, seed) {
        super(x, y, size, planetColors, seed);
        this.height = size * 0.6;
        this.moveSpeed *= 0.4; // Slower scuttling
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function' ? getProjectionHelpers(worldX, worldY, alt + this.height) : { extrusionAngle: 0.5, baseX: worldX, baseY: worldY };

        // Carapace
        Draw3D.drawPrism(baseX, baseY, this.size, 6, this.height, this.color, extrusionAngle, sunAngle, true);

        // Legs
        if (lodLevel >= 2) {
            const legLen = this.size * 1.5;
            const rotation = this.animTime * 3; // Slower leg animation
            for (let i = 0; i < 6; i++) {
                const angle = (i / 6) * Math.PI * 2;
                const legMove = Math.sin(rotation + i) * 0.2;
                const lx = baseX + Math.cos(angle + legMove) * legLen * 0.8;
                const ly = baseY + Math.sin(angle + legMove) * legLen * 0.8;

                Draw3D.drawBox3D(lx, ly, this.size * 0.2, this.size * 0.2, this.size * 0.3, this.color, extrusionAngle, sunAngle, true);
            }
        }
    }
}

// Make available globally
if (typeof window !== 'undefined') {
    window.SurfaceFlora = SurfaceFlora;
    window.SurfaceFauna = SurfaceFauna;
    window.AlienTree = AlienTree;
    window.CrystalPlant = CrystalPlant;
    window.TentaclePlant = TentaclePlant;
    window.SporeStalk = SporeStalk;
    window.BubbleBush = BubbleBush;
    window.SlitherCreature = SlitherCreature;
    window.FloaterCreature = FloaterCreature;
    window.RollerCreature = RollerCreature;
    window.StalkCreature = StalkCreature;
    window.HexPalm = HexPalm;
    window.PyramidCactus = PyramidCactus;
    window.LuminescentFungi = LuminescentFungi;
    window.HopperCreature = HopperCreature;
    window.GliderCreature = GliderCreature;
    window.HexapodCreature = HexapodCreature;
}

// Module exports for testing
if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        SurfaceFlora, SurfaceFauna,
        AlienTree, CrystalPlant, TentaclePlant, SporeStalk, BubbleBush,
        SlitherCreature, FloaterCreature, RollerCreature, StalkCreature,
        HexPalm, PyramidCactus, LuminescentFungi,
        HopperCreature, GliderCreature, HexapodCreature
    };
}
