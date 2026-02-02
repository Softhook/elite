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
     * @param {string} economyType - Planet economy type for color variation
     */
    constructor(x, y, size, economyType) {
        this.pos = createVector(x, y);
        this.size = size || 20;
        this.yOffset = 0; // Height offset matching terrain
        this.destroyed = false;
        this.economyType = economyType || 'Service';
        this.color = this._getEconomyColor();
        this.seed = Math.random() * 1000;
    }

    /**
     * Get color based on planet economy type
     * @returns {p5.Color} Color for this flora
     */
    _getEconomyColor() {
        switch (this.economyType) {
            case 'Agricultural':
                return color(60 + random(40), 180 + random(40), 80 + random(40)); // Green/yellow
            case 'Mining':
                return color(140 + random(40), 120 + random(40), 100 + random(40)); // Brown/gray
            case 'Industrial':
                return color(100 + random(40), 100 + random(40), 100 + random(40)); // Gray
            case 'Refinery':
                return color(180 + random(40), 140 + random(40), 80 + random(40)); // Orange/brown
            case 'Post Human':
                return color(140 + random(40), 180 + random(60), 220 + random(35)); // Cyan/blue
            case 'Offworld':
                return color(180 + random(40), 100 + random(40), 200 + random(55)); // Purple/magenta
            case 'Military':
                return color(80 + random(40), 120 + random(40), 80 + random(40)); // Dark green
            case 'Service':
            default:
                return color(100 + random(80), 160 + random(60), 120 + random(60)); // Varied green
        }
    }

    update(dt, player) {
        // Flora is static
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        // Base implementation - override in subclasses
    }
}

/**
 * Alien tree with organic branching structure
 */
class AlienTree extends SurfaceFlora {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.height = size * (2.5 + Math.sin(this.seed) * 0.5);
        this.trunkColor = color(
            red(this.color) * 0.5,
            green(this.color) * 0.5,
            blue(this.color) * 0.5
        );
        this.branches = Math.floor(3 + (this.seed % 4));
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;
        
        // Trunk
        const trunkW = this.size * 0.3;
        const trunkH = this.height * 0.6;
        Draw3D.drawBox3D(x, y, trunkW, trunkW, trunkH, this.trunkColor, extrusionAngle, sunAngle);

        // Canopy - organic blob shape using multiple overlapping prisms
        const canopyY = y - trunkH * 0.5;
        const canopyR = this.size * 0.8;
        
        for (let i = 0; i < this.branches; i++) {
            const angle = (i / this.branches) * Math.PI * 2;
            const offsetX = Math.cos(angle) * canopyR * 0.3;
            const offsetY = Math.sin(angle) * canopyR * 0.3;
            const blobSize = canopyR * (0.6 + Math.sin(this.seed + i) * 0.2);
            
            Draw3D.drawPrism(
                x + offsetX, 
                canopyY + offsetY, 
                blobSize, 
                6, 
                this.size * 0.4, 
                this.color, 
                extrusionAngle, 
                sunAngle
            );
        }
    }
}

/**
 * Crystal-like plant formation
 */
class CrystalPlant extends SurfaceFlora {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.height = size * (1.5 + Math.sin(this.seed) * 0.3);
        this.crystals = Math.floor(4 + (this.seed % 5));
        this.crystalColor = color(
            red(this.color) + 60,
            green(this.color) + 60,
            blue(this.color) + 60,
            200
        );
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;

        // Multiple crystal spikes arranged in a cluster
        for (let i = 0; i < this.crystals; i++) {
            const angle = (i / this.crystals) * Math.PI * 2 + this.seed;
            const radius = this.size * 0.4;
            const cx = x + Math.cos(angle) * radius;
            const cy = y + Math.sin(angle) * radius;
            const cHeight = this.height * (0.7 + Math.sin(this.seed + i * 2) * 0.3);
            const cWidth = this.size * 0.2;
            
            // Crystal spike - narrow box tapering upward
            Draw3D.drawBox3D(cx, cy, cWidth, cWidth, cHeight, this.crystalColor, extrusionAngle, sunAngle);
        }

        // Central crystal
        Draw3D.drawBox3D(x, y, this.size * 0.3, this.size * 0.3, this.height, this.color, extrusionAngle, sunAngle);
    }
}

/**
 * Tentacle-like plant with writhing appendages
 */
class TentaclePlant extends SurfaceFlora {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.height = size * (1.2 + Math.sin(this.seed) * 0.2);
        this.tentacles = Math.floor(5 + (this.seed % 4));
        this.baseColor = color(
            red(this.color) * 0.7,
            green(this.color) * 0.7,
            blue(this.color) * 0.7
        );
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;

        // Base bulb
        Draw3D.drawPrism(x, y, this.size * 0.5, 8, this.size * 0.3, this.baseColor, extrusionAngle, sunAngle);

        // Tentacles reaching outward and upward
        for (let i = 0; i < this.tentacles; i++) {
            const angle = (i / this.tentacles) * Math.PI * 2 + this.seed;
            const segments = 3;
            
            for (let s = 0; s < segments; s++) {
                const progress = s / segments;
                const radius = this.size * (0.3 + progress * 0.6);
                const tx = x + Math.cos(angle) * radius;
                const ty = y + Math.sin(angle) * radius - progress * this.height * 0.3;
                const tWidth = this.size * 0.15 * (1 - progress * 0.5);
                const tHeight = this.height * 0.3;
                
                Draw3D.drawBox3D(tx, ty, tWidth, tWidth, tHeight, this.color, extrusionAngle, sunAngle);
            }
        }
    }
}

/**
 * Spore-emitting stalk plant
 */
class SporeStalk extends SurfaceFlora {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.height = size * (2 + Math.sin(this.seed) * 0.4);
        this.sporeColor = color(
            red(this.color) + 80,
            green(this.color) + 80,
            blue(this.color) + 80,
            180
        );
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;

        // Thin stalk
        const stalkW = this.size * 0.2;
        Draw3D.drawBox3D(x, y, stalkW, stalkW, this.height, this.color, extrusionAngle, sunAngle);

        // Spore cap at top
        const capY = y - this.height * 0.5;
        Draw3D.drawPrism(x, capY, this.size * 0.6, 12, this.size * 0.4, this.sporeColor, extrusionAngle, sunAngle);

        // Small spore clusters floating around
        for (let i = 0; i < 4; i++) {
            const angle = (i / 4) * Math.PI * 2 + this.seed;
            const dist = this.size * 0.8;
            const sx = x + Math.cos(angle) * dist;
            const sy = capY + Math.sin(angle) * dist * 0.5;
            const sporeSize = this.size * 0.1;
            
            Draw3D.drawPrism(sx, sy, sporeSize, 6, sporeSize * 0.5, this.sporeColor, extrusionAngle, sunAngle);
        }
    }
}

/**
 * Bubble-like bush formation
 */
class BubbleBush extends SurfaceFlora {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.height = size * (0.8 + Math.sin(this.seed) * 0.2);
        this.bubbles = Math.floor(6 + (this.seed % 5));
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;

        // Multiple spherical bubbles clustered together
        for (let i = 0; i < this.bubbles; i++) {
            const angle = (i / this.bubbles) * Math.PI * 2 + this.seed;
            const layer = Math.floor(i / 3);
            const radius = this.size * (0.3 - layer * 0.1);
            const bx = x + Math.cos(angle) * radius;
            const by = y + Math.sin(angle) * radius;
            const bSize = this.size * (0.4 - layer * 0.1);
            const bHeight = this.height * (0.8 - layer * 0.2);
            
            const bubbleColor = color(
                red(this.color) + (layer * 20),
                green(this.color) + (layer * 20),
                blue(this.color) + (layer * 20),
                200 - layer * 30
            );
            
            Draw3D.drawPrism(bx, by, bSize, 12, bHeight, bubbleColor, extrusionAngle, sunAngle);
        }
    }
}

/**
 * Base class for all surface fauna (creatures)
 * Provides common properties and movement behavior
 */
class SurfaceFauna {
    /**
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {number} size - Fauna size
     * @param {string} economyType - Planet economy type for color variation
     */
    constructor(x, y, size, economyType) {
        this.pos = createVector(x, y);
        this.size = size || 15;
        this.yOffset = 0; // Height offset matching terrain
        this.destroyed = false;
        this.economyType = economyType || 'Service';
        this.color = this._getEconomyColor();
        this.seed = Math.random() * 1000;
        
        // Movement
        this.moveSpeed = 5 + Math.random() * 10; // Slow movement
        this.moveAngle = Math.random() * Math.PI * 2;
        this.turnSpeed = 0.5 + Math.random() * 0.5;
        this.moveTimer = 0;
        this.moveDuration = 2 + Math.random() * 3; // Move for 2-5 seconds
        this.pauseDuration = 1 + Math.random() * 2; // Pause for 1-3 seconds
        this.isPaused = false;
        
        // Animation
        this.animTime = Math.random() * Math.PI * 2;
    }

    /**
     * Get color based on planet economy type
     * @returns {p5.Color} Color for this fauna
     */
    _getEconomyColor() {
        switch (this.economyType) {
            case 'Agricultural':
                return color(140 + random(40), 100 + random(40), 60 + random(40)); // Brown/tan
            case 'Mining':
                return color(120 + random(40), 120 + random(40), 130 + random(40)); // Rocky gray
            case 'Industrial':
                return color(80 + random(40), 80 + random(40), 90 + random(40)); // Dark gray
            case 'Refinery':
                return color(160 + random(40), 100 + random(40), 60 + random(40)); // Rusty
            case 'Post Human':
                return color(120 + random(40), 160 + random(40), 200 + random(55)); // Blue
            case 'Offworld':
                return color(160 + random(40), 80 + random(40), 180 + random(55)); // Purple
            case 'Military':
                return color(60 + random(40), 80 + random(40), 60 + random(40)); // Camo green
            case 'Service':
            default:
                return color(120 + random(60), 100 + random(60), 80 + random(60)); // Varied earth tones
        }
    }

    /**
     * Update creature movement
     * @param {number} dt - Delta time in seconds
     */
    update(dt, player) {
        if (this.destroyed) return;

        this.animTime += dt * 2;
        this.moveTimer += dt;

        if (this.isPaused) {
            if (this.moveTimer >= this.pauseDuration) {
                this.isPaused = false;
                this.moveTimer = 0;
                // Random new direction
                this.moveAngle += (Math.random() - 0.5) * Math.PI;
            }
        } else {
            if (this.moveTimer >= this.moveDuration) {
                this.isPaused = true;
                this.moveTimer = 0;
            } else {
                // Move in current direction
                this.pos.x += Math.cos(this.moveAngle) * this.moveSpeed * dt;
                this.pos.y += Math.sin(this.moveAngle) * this.moveSpeed * dt;
                
                // Slight direction variation while moving
                this.moveAngle += (Math.random() - 0.5) * this.turnSpeed * dt;
            }
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        // Base implementation - override in subclasses
    }
}

/**
 * Slithering snake-like creature
 */
class SlitherCreature extends SurfaceFauna {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.segments = 6;
        this.height = size * 0.3;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;

        // Draw segmented body with sine wave motion
        for (let i = 0; i < this.segments; i++) {
            const progress = i / this.segments;
            const waveOffset = Math.sin(this.animTime + progress * Math.PI * 2) * this.size * 0.2;
            const segX = x - Math.cos(this.moveAngle) * i * this.size * 0.3 + Math.sin(this.moveAngle) * waveOffset;
            const segY = y - Math.sin(this.moveAngle) * i * this.size * 0.3 - Math.cos(this.moveAngle) * waveOffset;
            const segSize = this.size * (1 - progress * 0.3);
            
            const segColor = color(
                red(this.color) * (1 - progress * 0.2),
                green(this.color) * (1 - progress * 0.2),
                blue(this.color) * (1 - progress * 0.2)
            );
            
            Draw3D.drawPrism(segX, segY, segSize, 8, this.height, segColor, extrusionAngle, sunAngle);
        }

        // Head
        const headSize = this.size * 1.2;
        Draw3D.drawPrism(x, y, headSize, 6, this.height * 1.5, this.color, extrusionAngle, sunAngle);
    }
}

/**
 * Floating jellyfish-like creature
 */
class FloaterCreature extends SurfaceFauna {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.floatHeight = size * 2;
        this.tentacles = 4;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        // Float above surface with bobbing motion
        const floatOffset = Math.sin(this.animTime) * this.size * 0.3;
        const y = worldY - this.floatHeight - floatOffset;

        // Bell/dome body
        const bellColor = color(
            red(this.color),
            green(this.color),
            blue(this.color),
            200
        );
        Draw3D.drawPrism(x, y, this.size, 12, this.size * 0.8, bellColor, extrusionAngle, sunAngle);

        // Trailing tentacles
        for (let i = 0; i < this.tentacles; i++) {
            const angle = (i / this.tentacles) * Math.PI * 2 + this.animTime * 0.5;
            const segments = 3;
            
            for (let s = 0; s < segments; s++) {
                const progress = s / segments;
                const tx = x + Math.cos(angle) * this.size * 0.3 * progress;
                const ty = y + this.size * 0.5 + progress * this.size * 1.5;
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
                    sunAngle
                );
            }
        }
    }
}

/**
 * Rolling ball-like creature
 */
class RollerCreature extends SurfaceFauna {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.spikes = 8;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;

        // Main body sphere
        Draw3D.drawPrism(x, y, this.size, 12, this.size * 0.8, this.color, extrusionAngle, sunAngle);

        // Rotating spikes
        const rotation = this.animTime;
        for (let i = 0; i < this.spikes; i++) {
            const angle = (i / this.spikes) * Math.PI * 2 + rotation;
            const sx = x + Math.cos(angle) * this.size * 0.8;
            const sy = y + Math.sin(angle) * this.size * 0.8;
            const spikeSize = this.size * 0.2;
            
            const spikeColor = color(
                red(this.color) * 0.7,
                green(this.color) * 0.7,
                blue(this.color) * 0.7
            );
            
            Draw3D.drawBox3D(sx, sy, spikeSize, spikeSize, this.size * 0.4, spikeColor, extrusionAngle, sunAngle);
        }
    }
}

/**
 * Tall stalking creature on long legs
 */
class StalkCreature extends SurfaceFauna {
    constructor(x, y, size, economyType) {
        super(x, y, size, economyType);
        this.bodyHeight = size * 2;
        this.legs = 4;
        this.legLength = size * 1.5;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0) {
        if (this.destroyed) return;

        const extrusionAngle = 0.5;
        const x = worldX;
        const y = worldY;

        // Legs with walking animation
        const walkCycle = Math.sin(this.animTime * 2);
        for (let i = 0; i < this.legs; i++) {
            const angle = (i / this.legs) * Math.PI * 2;
            const legPhase = (i % 2) * Math.PI; // Alternate leg movement
            const legBend = Math.sin(this.animTime * 2 + legPhase) * this.size * 0.2;
            
            const lx = x + Math.cos(angle) * this.size * 0.4;
            const ly = y + Math.sin(angle) * this.size * 0.4;
            const legW = this.size * 0.15;
            
            // Upper leg
            Draw3D.drawBox3D(
                lx + Math.cos(angle) * legBend * 0.5, 
                ly + Math.sin(angle) * legBend * 0.5, 
                legW, 
                legW, 
                this.legLength * 0.6, 
                this.color, 
                extrusionAngle, 
                sunAngle
            );
            
            // Lower leg
            Draw3D.drawBox3D(
                lx + Math.cos(angle) * legBend, 
                ly + Math.sin(angle) * legBend, 
                legW * 0.8, 
                legW * 0.8, 
                this.legLength * 0.4, 
                this.color, 
                extrusionAngle, 
                sunAngle
            );
        }

        // Body elevated on legs
        const bodyY = y - this.legLength;
        Draw3D.drawPrism(x, bodyY, this.size * 0.8, 8, this.bodyHeight, this.color, extrusionAngle, sunAngle);

        // Head/sensory organ
        const headColor = color(
            red(this.color) + 40,
            green(this.color) + 40,
            blue(this.color) + 40
        );
        Draw3D.drawPrism(x, bodyY - this.bodyHeight * 0.5, this.size * 0.5, 6, this.size * 0.6, headColor, extrusionAngle, sunAngle);
    }
}
