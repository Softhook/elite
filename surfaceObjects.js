// ****** surfaceObjects.js ******
// Surface object classes for planetary surface gameplay
//
// ARCHITECTURE:
// - Base class: SurfaceObject - common behavior for all surface entities
// - 17 specialized classes: Buildings, defenses, caches, stations
// - All classes use unified projection helpers from surfaceObjectUtils.js
//
// RENDERING:
// - All draw() methods use getProjectionHelpers() for consistent visual projection
// - Objects are rendered with pseudo-3D extrusion using Draw3D primitives
// - Visual coordinates account for altitude offset and extrusion angle
//
// ENTITY TYPES:
// - Defense: Turret, DefenseDrone, ShieldGenerator
// - Structures: ImperialBuilding, SeparatistBuilding, MilitaryBuilding, etc.
// - Commerce: SurfaceStation, various economy-specific buildings
// - Special: SecretCache (uninhabited planets)

// Validate critical dependencies
if (typeof Draw3D === 'undefined') {
    console.warn('Draw3D not loaded - surface object rendering may fail');
}

/**
 * Base class for all surface objects (buildings, defenses, stations)
 * Provides common properties and methods for surface entities
 */
class SurfaceObject {
    /**
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate  
     * @param {number} size - Object size/radius
     */
    constructor(x, y, size) {
        this.pos = createVector(x, y);
        this.size = size || 50;
        this.health = 100;
        this.maxHealth = 100;
        this.destroyed = false;
        this.color = color(150, 150, 150);
        this.yOffset = 0; // Height offset matching terrain (altitude semantics)
        this.isSurface = true; // Mark as surface entity for HUD and filtering
    }

    // Aliases for HUD compatibility
    get hull() { return this.health; }
    get maxHull() { return this.maxHealth; }
    isDestroyed() { return this.destroyed; }

    /**
     * Get the vertical height of the object for HUD/targeting
     * @returns {number} Height in world units
     */
    getHeight() {
        return this.height || 0;
    }

    /**
     * Get friendly display name for UI
     * @returns {string} Human-readable object name
     */
    getDisplayName() {
        if (this.displayName) return this.displayName;
        if (this.type) return this.type;
        if (this.constructor && this.constructor.name) return this.constructor.name;
        return 'Surface Object';
    }

    /**
     * Update object state (override in subclasses)
     * @param {number} dt - Delta time in seconds
     * @param {Object} player - Player reference
     */
    update(dt, player) {
    }

    /**
     * Draw object using Draw3D primitives (override in subclasses)
     * Uses getProjectionHelpers() from surfaceObjectUtils.js for consistent projection
     * @param {number} worldX - World X coordinate
     * @param {number} worldY - World Y coordinate
     * @param {number} sunAngle - Lighting angle in radians
     * @param {number} alt - Total altitude (ground altitude + entity altitude)
     * @param {number} lodLevel - Level of detail (3=full, 2=simplified)
     */
    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Base implementation - individual objects handle projection
    }

    /**
     * Check collision with projectile
     * @param {Object} projectile - Projectile to check
     * @returns {boolean} True if collision detected
     */
    checkCollision(projectile) {
        return false;
    }

    /**
     * Apply damage to object
     * @param {number} amount - Damage amount
     */
    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0 && !this.destroyed) {
            this.destroyed = true;

            // Create explosion at object position
            if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
                const alt = this.altitude || (this.yOffset || 0);
                surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, alt, this.size * 1.5);
            }

            if (typeof surfaceMode !== 'undefined' && this.cellKey) {
                surfaceMode.registerDestruction(this.cellKey);
            }
            this.onDestroy();
        }
    }

    /**
     * Apply drag/tangle effect to surface object (for DefenseDrone and other moving objects)
     * @param {number} duration - Duration of the effect in seconds
     * @param {number} dragMultiplier - Drag multiplier (higher = more drag)
     * @param {number} rotationBlockMultiplier - Rotation blocking (lower = more blocked)
     */
    applyDragEffect(duration, dragMultiplier, rotationBlockMultiplier) {
        // Only apply to objects that can move (drones)
        // Turrets are stationary and don't need drag effects
        if (this.type === 'Defense Drone') {
            this.dragEffect = {
                endTime: millis() + duration * 1000,
                dragMultiplier: dragMultiplier || 10.0,
                rotationBlockMultiplier: rotationBlockMultiplier || 0.1
            };
        }
    }

    onDestroy() {
    }
}

/**
 * SecretCache - Hidden treasure cache on uninhabited planets
 * Visual: Box with cross on top (treasure chest aesthetic)
 * Drops credits when destroyed
 */
class SecretCache extends SurfaceObject {
    constructor(x, y, seed = 0) {
        super(x, y, 30);
        this.type = "Secret Cache";
        this.seed = seed;
        this.health = 50;
        this.maxHealth = 50;
        this.isCache = true; // For compass marker identification

        // Random loot value based on seed
        this.lootValue = 500 + Math.floor((Math.sin(seed * 12.345) * 0.5 + 0.5) * 1500);

        // Weathered green/brown colors
        const variation = (Math.sin(seed) * 0.5 + 0.5) * 30;
        this.color = color(60 + variation, 80 + variation, 50);
        this.crossColor = color(180, 160, 100); // Gold/brass cross
        this.height = 30 * 0.6; // Box height
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        const sz = this.size;

        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }

        // Box base
        const boxH = sz * 0.6;
        const boxDvX = boxH * Math.sin(extrusionAngle);
        const boxDvY = boxH * Math.cos(extrusionAngle);
        const topX = baseX - boxDvX;
        const topY = baseY - boxDvY;

        Draw3D.drawBox3D(topX, topY, sz, sz * 0.8, boxH, this.color, extrusionAngle, sunAngle);

        // Cross on top - vertical beam
        const crossH = sz * 0.5;
        const crossW = sz * 0.12;
        const crossDvX = crossH * Math.sin(extrusionAngle);
        const crossDvY = crossH * Math.cos(extrusionAngle);
        const crossBaseX = topX - crossDvX;
        const crossBaseY = topY - crossDvY;

        Draw3D.drawBox3D(crossBaseX, crossBaseY, crossW, crossW, crossH, this.crossColor, extrusionAngle, sunAngle);

        // LOD 3 only: Detailed cross horizontal beam
        // LOD 2: Skip purely decorative horizontal arm if performance needed, 
        // but for Cache keeping it is better for identification. 
        // We'll simplify the arm rendering instead.
        const armH = sz * 0.08;
        const armW = sz * 0.35;
        const armOffsetY = crossH * 0.6; // Position on vertical beam
        const armDvX = armOffsetY * Math.sin(extrusionAngle);
        const armDvY = armOffsetY * Math.cos(extrusionAngle);
        const armX = crossBaseX - armDvX;
        const armY = crossBaseY - armDvY;

        Draw3D.drawBox3D(armX, armY, armW, crossW, armH, this.crossColor, extrusionAngle, sunAngle);
    }

    onDestroy() {
        // Create explosion using centralized surface mode API
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 1.5, [180, 160, 100]);
        }

        // Award credits to player
        if (typeof player !== 'undefined' && player) {
            player.credits += this.lootValue;
            console.log(`Secret Cache opened! Found ${this.lootValue} credits!`);

            // Play cargo collected sound
            if (typeof soundManager !== 'undefined' && typeof soundManager.playSound === 'function') {
                soundManager.playSound('pickupCoin');
            }

            // Show message to player
            if (typeof showMessage === 'function') {
                showMessage(`Secret cache discovered! +${this.lootValue} Cr`, [100, 255, 100]);
            }
        }
    }
}



class Building extends SurfaceObject {
    constructor(x, y, size, type, seed = 0, customColor = null) {
        super(x, y, size);
        this.type = type || 'skyscraper';
        this.seed = seed;

        // Friendly display name for generic building types
        if (!this.displayName && this.type) {
            this.displayName = this.type.charAt(0).toUpperCase() + this.type.slice(1);
        }

        this.color = this._getTypeColor(customColor);
        this.height = this._getTypeHeight();

        // Use type-specific max health
        if (this.type === 'factory') {
            this.maxHealth = 400;
            this.health = 400;
        } else if (this.type === 'silo') {
            this.maxHealth = 200;
            this.health = 200;
        } else {
            this.maxHealth = 100;
            this.health = 100;
        }
    }

    _getTypeColor(customBase) {
        const r = (Math.sin(this.seed) * 0.5 + 0.5) * 50;
        const g = (Math.cos(this.seed * 0.7) * 0.5 + 0.5) * 50;
        // If custom base color is provided (from planet civ), use it with variation
        if (customBase) {
            const baseR = red(customBase);
            const baseG = green(customBase);
            const baseB = blue(customBase);
            // Add variation but keep tone
            return color(
                Math.min(255, baseR + r - 25),
                Math.min(255, baseG + g - 25),
                Math.min(255, baseB + r - 25)
            );
        }

        switch (this.type) {
            case 'skyscraper': return color(60 + r, 70 + g, 90 + r);
            case 'factory': return color(80 + r, 70 + g, 60 + r);
            case 'silo': return color(180 + r, 180 + g, 190 + r);
            default: return color(100, 100, 100);
        }
    }

    _getTypeHeight() {
        // Deterministic height based on seed
        const heightVar = (Math.sin(this.seed * 1.321) * 0.5 + 0.5);
        switch (this.type) {
            case 'skyscraper': return this.size * (3 + heightVar * 4);
            case 'factory': return this.size * (1.2 + heightVar * 0.8);
            case 'silo': return this.size * (2 + heightVar * 1);
            default: return this.size;
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        const dvX = this.height * Math.sin(extrusionAngle);
        const dvY = this.height * Math.cos(extrusionAngle);
        const rx = baseX - dvX;
        const ry = baseY - dvY;

        // Base Structure - always drawn
        Draw3D.drawBox3D(rx, ry, sz, sz, this.height, this.color, extrusionAngle, sunAngle);

        // LOD 3 only: Detailed decorations
        if (lodLevel === 3) {
            // Neon Details (Windows/Pipes)
            if (this.type === 'skyscraper') {
                const neonColor = color(0, 200, 255, 150);
                for (let i = 0.2; i < 0.9; i += 0.2) {
                    const wh = this.height * i;
                    const wrx = baseX - (wh * Math.sin(extrusionAngle));
                    const wry = baseY - (wh * Math.cos(extrusionAngle));
                    Draw3D.drawBox3D(wrx, wry, sz * 1.05, sz * 0.1, 5, neonColor, extrusionAngle, sunAngle);
                }
            }

            // Tiered levels for non-silos
            if (this.type === 'skyscraper' || this.type === 'factory') {
                const tierH = this.height * 0.4;
                const tierDvX = tierH * Math.sin(extrusionAngle);
                const tierDvY = tierH * Math.cos(extrusionAngle);
                const trx = rx - tierDvX;
                const try_ = ry - tierDvY;
                Draw3D.drawBox3D(trx, try_, sz * 0.6, sz * 0.6, tierH, lerpColor(this.color, color(255), 0.1), extrusionAngle, sunAngle);

                // Antennas on top tier (start from tier roof)
                const antH = 30;
                const arx = trx - tierDvX;
                const ary = try_ - tierDvY;
                Draw3D.drawCylinder(arx, ary, 2, antH, 6, color(200), extrusionAngle, sunAngle);
            }

            if (this.type === 'silo') {
                Draw3D.drawCylinder(rx, ry, sz / 2, this.height, 12, this.color, extrusionAngle, sunAngle);
                const lightH = 10;
                const lightAngle = extrusionAngle + Math.PI;
                Draw3D.drawDome(rx, ry, 10, 4, color(255, 0, 0), lightAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        // Create large surface explosion using centralized API
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 1.5, [255, 150, 50]);
        }
    }
}

// ============================================================================
// ECONOMY-SPECIFIC BUILDING CLASSES
// Each economy type has unique architectural styles and color palettes
// ============================================================================

/**
 * Imperial buildings - Grand, authoritarian architecture
 * Gold obelisks, domed palaces, spire towers
 */
class ImperialBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Imperial Structure";
        this.seed = seed;
        this.variant = calculateVariant(seed, 7.89, 5);
        this.height = calculateHeight(size, seed, 2, 5);
        this.maxHealth = 300;
        this.health = 300;

        // Imperial colors: gold, white, purple
        this.primaryColor = color(200, 170, 80);  // Gold
        this.accentColor = color(160, 80, 220);    // purple
        this.stoneColor = color(220, 215, 200);   // White marble

        const imperialNames = ["Obelisk", "Palace", "Spire", "Triumphal Arch", "Senate Hall"];
        this.displayName = imperialNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // OBELISK - Tall tapered column with gold cap
            const baseH = this.height * 0.8;
            const capH = this.height * 0.2;
            const baseDvX = baseH * Math.sin(extrusionAngle);
            const baseDvY = baseH * Math.cos(extrusionAngle);
            const topX = baseX - baseDvX;
            const topY = baseY - baseDvY;

            // Main marble column
            Draw3D.drawBox3D(topX, topY, sz * 0.4, sz * 0.4, baseH, this.stoneColor, extrusionAngle, sunAngle);
            // Gold pyramid cap
            const capX = topX - capH * Math.sin(extrusionAngle);
            const capY = topY - capH * Math.cos(extrusionAngle);
            Draw3D.drawCone(capX, capY, sz * 0.35, capH, 4, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Crimson banner
            if (lodLevel === 3) {
                Draw3D.drawBox3D(baseX - baseDvX * 0.5, baseY - baseDvY * 0.5, sz * 0.5, sz * 0.05, baseH * 0.3, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // PALACE - Wide base with central dome
            const baseH = this.height * 0.4;
            const domeR = sz * 0.5;
            const baseDvX = baseH * Math.sin(extrusionAngle);
            const baseDvY = baseH * Math.cos(extrusionAngle);
            const topX = baseX - baseDvX;
            const topY = baseY - baseDvY;

            // Wide marble base
            Draw3D.drawBox3D(topX, topY, sz * 1.2, sz * 0.8, baseH, this.stoneColor, extrusionAngle, sunAngle);
            // Central gold dome
            const domeAngle = extrusionAngle + Math.PI;
            Draw3D.drawDome(topX, topY, domeR, lodLevel === 2 ? 6 : 8, this.primaryColor, domeAngle, sunAngle);

            // LOD 3 only: Corner columns
            if (lodLevel === 3) {
                for (let i = -1; i <= 1; i += 2) {
                    Draw3D.drawCylinder(topX + i * sz * 0.5, topY + sz * 0.3, sz * 0.08, baseH * 0.8, 8, this.stoneColor, extrusionAngle, sunAngle);
                }
            }

        } else if (this.variant === 2) {
            // SPIRE - Tall tower with red glow
            const spireH = this.height;
            const spireDvX = spireH * Math.sin(extrusionAngle);
            const spireDvY = spireH * Math.cos(extrusionAngle);
            const topX = baseX - spireDvX;
            const topY = baseY - spireDvY;

            // Main spire cone
            Draw3D.drawCone(topX, topY, sz * 0.3, spireH, 6, this.stoneColor, extrusionAngle, sunAngle);

            // LOD 3 only: Decoration
            if (lodLevel === 3) {
                // Gold ring midway
                const ringX = baseX - spireDvX * 0.5;
                const ringY = baseY - spireDvY * 0.5;
                Draw3D.drawCylinder(ringX, ringY, sz * 0.35, sz * 0.1, 8, this.primaryColor, extrusionAngle, sunAngle);
                // purple light at tip
                Draw3D.drawDome(topX, topY, sz * 0.1, 6, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // TRIUMPHAL ARCH - Grand archway
            const archH = this.height * 0.7;
            const archDvX = archH * Math.sin(extrusionAngle);
            const archDvY = archH * Math.cos(extrusionAngle);
            const topX = baseX - archDvX;
            const topY = baseY - archDvY;

            // Pillars
            Draw3D.drawBox3D(topX - sz * 0.4, topY, sz * 0.3, sz * 0.3, archH, this.stoneColor, extrusionAngle, sunAngle);
            Draw3D.drawBox3D(topX + sz * 0.4, topY, sz * 0.3, sz * 0.3, archH, this.stoneColor, extrusionAngle, sunAngle);
            // Top beam
            const beamX = topX - (sz * 0.15) * Math.sin(extrusionAngle);
            const beamY = topY - (sz * 0.15) * Math.cos(extrusionAngle);
            Draw3D.drawBox3D(beamX, beamY, sz * 1.1, sz * 0.35, sz * 0.2, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Eagle decoration
            if (lodLevel === 3) {
                const eagleX = beamX - (sz * 0.25) * Math.sin(extrusionAngle);
                const eagleY = beamY - (sz * 0.25) * Math.cos(extrusionAngle);
                Draw3D.drawCone(eagleX, eagleY, sz * 0.15, sz * 0.25, 4, this.accentColor, extrusionAngle, sunAngle);
            }

        } else {
            // SENATE HALL - Long columned building
            const hallH = this.height * 0.5;
            const hallDvX = hallH * Math.sin(extrusionAngle);
            const hallDvY = hallH * Math.cos(extrusionAngle);
            const topX = baseX - hallDvX;
            const topY = baseY - hallDvY;

            // Main hall body
            Draw3D.drawBox3D(topX, topY, sz * 1.5, sz * 0.6, hallH, this.stoneColor, extrusionAngle, sunAngle);

            // LOD 3 only: Row of columns
            if (lodLevel === 3) {
                for (let i = -2; i <= 2; i++) {
                    Draw3D.drawCylinder(topX + i * sz * 0.3, topY + sz * 0.35, sz * 0.06, hallH * 0.9, 8, this.stoneColor, extrusionAngle, sunAngle);
                }
            }
            // Triangular pediment - sits flush on hall top
            Draw3D.drawCone(topX, topY, sz * 0.7, sz * 0.3, 3, this.primaryColor, extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2, [200, 170, 80]);
        }
    }
}

/**
 * Separatist buildings - Rugged, makeshift, defensive
 * Bunkers, watchtowers, barricades
 */
class SeparatistBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Separatist Outpost";
        this.seed = seed;
        this.variant = calculateVariant(seed, 5.67, 5);
        this.height = calculateHeight(size, seed, 0.8, 2.3);
        this.maxHealth = 250;
        this.health = 250;

        // Separatist colors: rust, brown, orange
        this.primaryColor = color(120, 80, 50);   // Rust brown
        this.accentColor = color(180, 100, 40);   // Orange
        this.metalColor = color(90, 85, 80);      // Scrap metal

        const separatistNames = ["Bunker", "Watchtower", "Barricade", "Scrap Shelter", "Fuel Depot"];
        this.displayName = separatistNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // BUNKER - Low, fortified
            const baseH = this.height * 0.5;
            const baseDvX = baseH * Math.sin(extrusionAngle);
            const baseDvY = baseH * Math.cos(extrusionAngle);
            const topX = baseX - baseDvX;
            const topY = baseY - baseDvY;

            // Main bunker structure
            Draw3D.drawBox3D(topX, topY, sz * 1.3, sz * 0.9, baseH, this.metalColor, extrusionAngle, sunAngle);

            // LOD 3 only: Firing slits and periscope
            if (lodLevel === 3) {
                // Firing slits (offset slightly from center toward front)
                Draw3D.drawBox3D(topX + sz * 0.3 + (baseDvX * 0.5), topY + (baseDvY * 0.5), sz * 0.4, sz * 0.1, baseH * 0.4, this.primaryColor, extrusionAngle, sunAngle);
                Draw3D.drawBox3D(topX - sz * 0.3 + (baseDvX * 0.5), topY + (baseDvY * 0.5), sz * 0.4, sz * 0.1, baseH * 0.4, this.primaryColor, extrusionAngle, sunAngle);
                // Periscope slit
                Draw3D.drawBox3D(topX, topY, sz * 0.6, sz * 0.08, sz * 0.1, color(20), extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // WATCHTOWER - Tall scrap tower
            const towerH = this.height;
            const towerDvX = towerH * Math.sin(extrusionAngle);
            const towerDvY = towerH * Math.cos(extrusionAngle);
            const topX = baseX - towerDvX;
            const topY = baseY - towerDvY;
            const legW = sz * 0.15;

            // Observation platform (compute first so we can align legs to its underside)
            const platformH = sz * 0.15;
            const platformDvX = platformH * Math.sin(extrusionAngle);
            const platformDvY = platformH * Math.cos(extrusionAngle);
            const platformTopX = topX;
            const platformTopY = topY;
            const platformUndersideX = platformTopX + platformDvX;
            const platformUndersideY = platformTopY + platformDvY;

            // Four support legs
            const legHeight = towerH * 0.8;
            for (let i = -1; i <= 1; i += 2) {
                for (let j = -1; j <= 1; j += 2) {
                    Draw3D.drawBox3D(platformUndersideX + i * sz * 0.25, platformUndersideY + j * sz * 0.25, legW, legW, legHeight, this.metalColor, extrusionAngle, sunAngle);
                }
            }

            // Observation platform
            Draw3D.drawBox3D(platformTopX, platformTopY, sz * 0.8, sz * 0.8, platformH, this.primaryColor, extrusionAngle, sunAngle);

            if (lodLevel === 3) {
                const lightH = sz * 0.15;
                const lightDvX = lightH * Math.sin(extrusionAngle);
                const lightDvY = lightH * Math.cos(extrusionAngle);
                const lightTopX = platformTopX - lightDvX;
                const lightTopY = platformTopY - lightDvY;
                Draw3D.drawCylinder(lightTopX, lightTopY, sz * 0.1, lightH, 6, this.accentColor, extrusionAngle, sunAngle);
            }
        } else if (this.variant === 2) {
            // BARRICADE - Wall with spikes
            const wallH = this.height * 0.6;
            const wallDvX = wallH * Math.sin(extrusionAngle);
            const wallDvY = wallH * Math.cos(extrusionAngle);
            const topX = baseX - wallDvX;
            const topY = baseY - wallDvY;

            // Main wall
            Draw3D.drawBox3D(topX, topY, sz * 1.5, sz * 0.3, wallH, this.primaryColor, extrusionAngle, sunAngle);

            const spikeAngle = extrusionAngle + Math.PI;
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawCone(topX + i * sz * 0.4, topY, sz * 0.08, sz * 0.4, 4, this.metalColor, spikeAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // SCRAP SHELTER - Makeshift curved roof
            const shelterH = this.height * 0.5;
            const shelterDvX = shelterH * Math.sin(extrusionAngle);
            const shelterDvY = shelterH * Math.cos(extrusionAngle);
            const topX = baseX - shelterDvX;
            const topY = baseY - shelterDvY;

            // Walls
            Draw3D.drawBox3D(topX - sz * 0.4, topY, sz * 0.15, sz * 0.6, shelterH, this.metalColor, extrusionAngle, sunAngle);
            Draw3D.drawBox3D(topX + sz * 0.4, topY, sz * 0.15, sz * 0.6, shelterH, this.metalColor, extrusionAngle, sunAngle);

            // Corrugated roof
            const roofH = sz * 0.1;
            const roofDvX = roofH * Math.sin(extrusionAngle);
            const roofDvY = roofH * Math.cos(extrusionAngle);
            const roofTopX = topX - roofDvX;
            const roofTopY = topY - roofDvY;
            Draw3D.drawBox3D(roofTopX, roofTopY, sz * 1.0, sz * 0.7, roofH, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Tarp patch (sits on roof)
            if (lodLevel === 3) {
                const tarpH = sz * 0.02;
                const tarpDvX = tarpH * Math.sin(extrusionAngle);
                const tarpDvY = tarpH * Math.cos(extrusionAngle);
                const tarpTopX = roofTopX - tarpDvX + sz * 0.2;
                const tarpTopY = roofTopY - tarpDvY;
                Draw3D.drawBox3D(tarpTopX, tarpTopY, sz * 0.3, sz * 0.3, tarpH, this.accentColor, extrusionAngle, sunAngle);
            }

        } else {
            // FUEL DEPOT - Drums and tanks
            const depotH = this.height * 0.4;
            const depotDvX = depotH * Math.sin(extrusionAngle);
            const depotDvY = depotH * Math.cos(extrusionAngle);
            const topX = baseX - depotDvX;
            const topY = baseY - depotDvY;

            // Fuel drums
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawCylinder(topX + i * sz * 0.35, topY, sz * 0.18, depotH, lodLevel === 2 ? 6 : 8, this.primaryColor, extrusionAngle, sunAngle);
            }
            // LOD 3 only: Warning stripe
            if (lodLevel === 3) {
                Draw3D.drawBox3D(baseX - (depotDvX * 0.5), baseY - (depotDvY * 0.5), sz * 1.2, sz * 0.08, sz * 0.05, this.accentColor, extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 1.8, [180, 100, 40]);
        }
    }
}

/**
 * Military buildings - Fortified, angular, functional
 * Hangars, barracks, radar arrays
 */
class MilitaryBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Military Installation";
        this.seed = seed;
        this.variant = calculateVariant(seed, 3.14, 5);
        this.height = calculateHeight(size, seed, 1.5, 2.5);
        this.maxHealth = 400;
        this.health = 400;

        // Military colors: olive, gray, black
        this.primaryColor = color(70, 80, 60);    // Olive drab
        this.accentColor = color(50, 50, 50);     // Dark gray
        this.metalColor = color(100, 100, 105);   // Steel

        const militaryNames = ["Hangar", "Barracks", "Radar Array", "Bunker", "Tank Depot"];
        this.displayName = militaryNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // HANGAR - Large arched structure
            const hangarH = this.height * 0.7;
            const hangarDvX = hangarH * Math.sin(extrusionAngle);
            const hangarDvY = hangarH * Math.cos(extrusionAngle);
            const topX = baseX - hangarDvX;
            const topY = baseY - hangarDvY;

            // Main hangar body (drawBox3D takes top center)
            Draw3D.drawBox3D(topX, topY, sz * 1.8, sz * 1.2, hangarH, this.primaryColor, extrusionAngle, sunAngle);
            // Arched roof section
            Draw3D.drawDome(topX, topY, sz * 0.8, lodLevel === 2 ? 4 : 6, this.accentColor, extrusionAngle + Math.PI, sunAngle);

            // LOD 3 only: Door markings
            if (lodLevel === 3) {
                const doorX = baseX - hangarDvY * 0.4 * Math.sin(extrusionAngle);
                const doorY = baseY - hangarDvY * 0.4 * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(doorX, doorY, sz * 0.8, sz * 0.05, hangarH * 0.5, color(180, 180, 40), extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // BARRACKs - Modular blocks
            const blockH = this.height * 0.4;
            const blockDvX = blockH * Math.sin(extrusionAngle);
            const blockDvY = blockH * Math.cos(extrusionAngle);
            const topX = baseX - blockDvX;
            const topY = baseY - blockDvY;

            // Multiple barracks blocks
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawBox3D(topX + i * sz * 0.5, topY, sz * 0.45, sz * 0.7, blockH, this.primaryColor, extrusionAngle, sunAngle);
            }
            // LOD 3 only: Command antenna (rises from roof)
            if (lodLevel === 3) {
                const antH = sz * 0.5;
                const antDvX = antH * Math.sin(extrusionAngle);
                const antDvY = antH * Math.cos(extrusionAngle);
                Draw3D.drawCylinder(topX - antDvX, topY - antDvY, sz * 0.05, antH, 6, this.metalColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 2) {
            // RADAR ARRAY - Dish on tower
            const towerH = this.height * 0.6;
            const towerDvX = towerH * Math.sin(extrusionAngle);
            const towerDvY = towerH * Math.cos(extrusionAngle);
            const topX = baseX - towerDvX;
            const topY = baseY - towerDvY;

            // Support tower
            Draw3D.drawBox3D(topX, topY, sz * 0.4, sz * 0.4, towerH, this.accentColor, extrusionAngle, sunAngle);
            // Rotating dish
            Draw3D.drawDome(topX, topY, sz * 0.6, lodLevel === 2 ? 6 : 8, this.metalColor, extrusionAngle, sunAngle, true);

            // LOD 3 only: Central receiver
            if (lodLevel === 3) {
                const receiverH = sz * 0.3;
                const receiverDvX = receiverH * Math.sin(extrusionAngle);
                const receiverDvY = receiverH * Math.cos(extrusionAngle);
                Draw3D.drawCylinder(topX - receiverDvX, topY - receiverDvY, sz * 0.08, receiverH, 6, color(255, 50, 50), extrusionAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // BUNKER - Reinforced underground entrance
            const bunkerH = this.height * 0.4;
            const bunkerDvX = bunkerH * Math.sin(extrusionAngle);
            const bunkerDvY = bunkerH * Math.cos(extrusionAngle);
            const topX = baseX - bunkerDvX;
            const topY = baseY - bunkerDvY;

            // Heavy sloped entrance
            Draw3D.drawBox3D(topX, topY, sz * 1.2, sz * 0.8, bunkerH, this.primaryColor, extrusionAngle, sunAngle);
            // Blast door
            const doorX = baseX - (bunkerDvX * 0.5);
            const doorY = baseY - (bunkerDvY * 0.5);
            Draw3D.drawBox3D(doorX, doorY, sz * 0.5, sz * 0.6, bunkerH * 0.7, this.metalColor, extrusionAngle, sunAngle);

            // LOD 3 only: Perimeter walls
            if (lodLevel === 3) {
                const wallH = bunkerH * 0.5;
                const wallDvX = wallH * Math.sin(extrusionAngle);
                const wallDvY = wallH * Math.cos(extrusionAngle);
                // Walls should be placed relative to the base of the bunker, not the top.
                // The bunker's base is at (baseX, baseY).
                // The walls rise from the ground, so their top is at (baseX - wallDvX, baseY - wallDvY)
                const wallTopX = baseX - wallDvX;
                const wallTopY = baseY - wallDvY;

                Draw3D.drawBox3D(wallTopX - sz * 0.8, wallTopY, sz * 0.1, sz * 0.6, wallH, this.accentColor, extrusionAngle, sunAngle);
                Draw3D.drawBox3D(wallTopX + sz * 0.8, wallTopY, sz * 0.1, sz * 0.6, wallH, this.accentColor, extrusionAngle, sunAngle);
            }

        } else {
            // TANK DEPOT - Vehicle storage
            const depotH = this.height * 0.5;
            const depotDvX = depotH * Math.sin(extrusionAngle);
            const depotDvY = depotH * Math.cos(extrusionAngle);
            const topX = baseX - depotDvX;
            const topY = baseY - depotDvY;

            // Main depot building
            Draw3D.drawBox3D(topX, topY, sz * 1.5, sz * 1.0, depotH, this.primaryColor, extrusionAngle, sunAngle);
            // Fuel tanks
            const tankH = depotH * 0.6;
            const tankDvX = tankH * Math.sin(extrusionAngle);
            const tankDvY = tankH * Math.cos(extrusionAngle);
            // Tanks sit on the ground, so their top is at (baseX - tankDvX, baseY - tankDvY)
            const tankTopX_L = baseX - sz * 0.5 - tankDvX;
            const tankTopY_L = baseY - tankDvY;
            const tankTopX_R = baseX + sz * 0.5 - tankDvX;
            const tankTopY_R = baseY - tankDvY;

            Draw3D.drawCylinder(tankTopX_L, tankTopY_L, sz * 0.15, tankH, lodLevel === 2 ? 6 : 8, this.accentColor, extrusionAngle, sunAngle);
            Draw3D.drawCylinder(tankTopX_R, tankTopY_R, sz * 0.15, tankH, lodLevel === 2 ? 6 : 8, this.accentColor, extrusionAngle, sunAngle);

            // LOD 3 only: Ramp
            if (lodLevel === 3) {
                const rampH = depotH * 0.2;
                const rampDvX = rampH * Math.sin(extrusionAngle);
                const rampDvY = rampH * Math.cos(extrusionAngle);
                // Ramp sits on the ground, its top is at (baseX - rampDvX, baseY - rampDvY)
                const rampTopX = baseX - rampDvX;
                const rampTopY = baseY - rampDvY;
                Draw3D.drawBox3D(rampTopX, rampTopY + sz * 0.4, sz * 0.6, sz * 0.8, rampH, this.metalColor, extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2, [100, 150, 80]);
        }
    }
}

/**
 * PostHuman buildings - Alien, crystalline, impossible geometry
 * Monoliths, floating cubes, crystalline spires
 */
class PostHumanBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Posthuman Structure";
        this.seed = seed;
        this.variant = calculateVariant(seed, 9.99, 5);
        this.height = calculateHeight(size, seed, 2, 4);
        this.maxHealth = 500;
        this.health = 500;
        this.pulsePhase = seed; // For animations

        // PostHuman colors: cyan, magenta, purple
        this.primaryColor = color(0, 200, 220);   // Cyan
        this.accentColor = color(180, 50, 200);   // Magenta
        this.darkColor = color(30, 20, 50);       // Dark purple

        const postNames = ["Monolith", "Floating Cube", "Crystal Spire", "Data Obelisk", "Singularity Well"];
        this.displayName = postNames[this.variant] || this.type;
    }

    update(dt, player) {
        this.pulsePhase += dt * 2;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;
        const pulse = (Math.sin(this.pulsePhase) * 0.5 + 0.5);

        if (this.variant === 0) {
            // MONOLITH - Perfect black rectangle with glowing edges
            const monolithH = this.height;
            const monolithDvX = monolithH * Math.sin(extrusionAngle);
            const monolithDvY = monolithH * Math.cos(extrusionAngle);
            const topX = baseX - monolithDvX;
            const topY = baseY - monolithDvY;

            // Main dark slab
            Draw3D.drawBox3D(topX, topY, sz * 0.4, sz * 0.15, monolithH, this.darkColor, extrusionAngle, sunAngle);

            // LOD 3 only: Glowing edge lines
            if (lodLevel === 3) {
                const glowColor = lerpColor(this.primaryColor, this.accentColor, pulse);
                Draw3D.drawBox3D(topX, topY, sz * 0.42, sz * 0.02, monolithH, glowColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // FLOATING CUBE - Rotated cube with energy field
            const cubeH = sz * 0.6;
            const floatAlt = this.height * 0.6 + Math.sin(this.pulsePhase) * 10;
            const cubeDvX = cubeH * Math.sin(extrusionAngle);
            const cubeDvY = cubeH * Math.cos(extrusionAngle);
            const cubeTopX = baseX - (floatAlt + cubeH) * Math.sin(extrusionAngle);
            const cubeTopY = baseY - (floatAlt + cubeH) * Math.cos(extrusionAngle);

            // Main rotating cube (centered on projected top position)
            push();
            translate(cubeTopX, cubeTopY);
            if (lodLevel === 3) {
                rotate(this.pulsePhase * 0.1);
            }
            Draw3D.drawBox3D(0, 0, sz * 0.6, sz * 0.6, cubeH, this.darkColor, extrusionAngle, sunAngle);
            pop();

            // LOD 3 only: Energy ring below
            if (lodLevel === 3) {
                const ringColor = lerpColor(this.primaryColor, color(255), pulse * 0.3);
                Draw3D.drawCylinder(baseX, baseY, sz * 0.5, sz * 0.05, 12, ringColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 2) {
            // CRYSTAL SPIRE - Angular crystalline tower
            const spireH = this.height;
            const spireDvX = spireH * Math.sin(extrusionAngle);
            const spireDvY = spireH * Math.cos(extrusionAngle);
            const topX = baseX - spireDvX;
            const topY = baseY - spireDvY;

            // Main crystal shard
            Draw3D.drawCone(topX, topY, sz * 0.25, spireH, 5, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Secondary/Tertiary crystals
            if (lodLevel === 3) {
                Draw3D.drawCone(baseX - spireDvX * 0.7 + sz * 0.15, baseY - spireDvY * 0.7, sz * 0.15, spireH * 0.6, 5, this.accentColor, extrusionAngle, sunAngle);
                Draw3D.drawCone(baseX - spireDvX * 0.8 - sz * 0.12, baseY - spireDvY * 0.8, sz * 0.12, spireH * 0.5, 5, this.primaryColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // DATA OBELISK - Hexagonal pylon with data streams
            const pylonH = this.height * 0.8;
            const pylonDvX = pylonH * Math.sin(extrusionAngle);
            const pylonDvY = pylonH * Math.cos(extrusionAngle);
            const topX = baseX - pylonDvX;
            const topY = baseY - pylonDvY;

            // Main hexagonal pylon
            Draw3D.drawCylinder(topX, topY, sz * 0.3, pylonH, 6, this.darkColor, extrusionAngle, sunAngle);

            // LOD 3 only: Animated data rings
            if (lodLevel === 3) {
                for (let i = 0; i < 3; i++) {
                    const ringAlt = pylonH * (0.3 + i * 0.25);
                    const ringX = baseX - ringAlt * Math.sin(extrusionAngle);
                    const ringY = baseY - ringAlt * Math.cos(extrusionAngle);
                    const ringPulse = (Math.sin(this.pulsePhase + i * 2) * 0.5 + 0.5);
                    Draw3D.drawCylinder(ringX, ringY, sz * 0.35, sz * 0.03, 6, lerpColor(this.primaryColor, this.accentColor, ringPulse), extrusionAngle, sunAngle);
                }
            }

        } else {
            // SINGULARITY WELL - Concentric rings descending
            const wellH = this.height * 0.4;
            const wellDvX = wellH * Math.sin(extrusionAngle);
            const wellDvY = wellH * Math.cos(extrusionAngle);
            const topX = baseX - wellDvX;
            const topY = baseY - wellDvY;

            // Outer containment ring
            Draw3D.drawCylinder(topX, topY, sz * 0.7, wellH, 12, this.darkColor, extrusionAngle, sunAngle);
            // Inner event horizon (inverted dome)
            const holeColor = lerpColor(this.accentColor, color(0), pulse * 0.5);
            Draw3D.drawDome(topX, topY, sz * 0.4, lodLevel === 2 ? 6 : 8, holeColor, extrusionAngle, sunAngle, true);

            // LOD 3 only: Central energy beam
            if (lodLevel === 3) {
                const beamH = sz * 0.4;
                const beamDvX = beamH * Math.sin(extrusionAngle);
                const beamDvY = beamH * Math.cos(extrusionAngle);
                Draw3D.drawCylinder(topX - beamDvX * 0.5, topY - beamDvY * 0.5, sz * 0.05, beamH, 4, this.primaryColor, extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2.5, [0, 200, 220]);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 1.5, [180, 50, 200]);
        }
    }
}

/**
 * Offworld buildings - Modular, domed, colonial
 * Biodomes, hab units, landing pads
 */
class OffworldBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Offworld Colony";
        this.seed = seed;
        this.variant = calculateVariant(seed, 4.56, 5);
        this.height = calculateHeight(size, seed, 1, 2.5);
        this.maxHealth = 200;
        this.health = 200;

        // Offworld colors: silver, blue, white
        this.primaryColor = color(180, 180, 190);  // Silver
        this.accentColor = color(100, 150, 200);   // Blue
        this.glassColor = color(200, 220, 255, 180); // Translucent

        const offworldNames = ["Biodome", "Hab Unit", "Landing Pad", "Comms Array", "Solar Farm"];
        this.displayName = offworldNames[this.variant] || this.type;

        // Background update tracking
        this.lastBackgroundTick = Date.now();
        this.miningStorage = [];
        this.miningStorageCapacity = 100;

        // Player base identification
        if (this.variant === 1) { // Hab Unit
            this.isPlayerBase = true;
            this.maxHealth = 1000; // Bases are much tougher
            this.health = 1000;
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // BIODOME - Large geodesic dome
            const domeR = sz * 0.7;
            const baseH = sz * 0.15;
            const baseDvX = baseH * Math.sin(extrusionAngle);
            const baseDvY = baseH * Math.cos(extrusionAngle);
            const topX = baseX - baseDvX;
            const topY = baseY - baseDvY;

            // Base ring
            Draw3D.drawCylinder(topX, topY, domeR * 1.1, baseH, 12, this.primaryColor, extrusionAngle, sunAngle);
            // Main glass dome
            const domeAngle = extrusionAngle + Math.PI;
            Draw3D.drawDome(topX, topY, domeR, lodLevel === 2 ? 8 : 10, this.glassColor, domeAngle, sunAngle);

            // LOD 3 only: Airlock entrance
            if (lodLevel === 3) {
                Draw3D.drawBox3D(topX + sz * 0.6, topY, sz * 0.25, sz * 0.3, sz * 0.4, this.primaryColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // HAB UNIT - Modular cylinder pods
            const podH = this.height * 0.4;
            const podDvX = podH * Math.sin(extrusionAngle);
            const podDvY = podH * Math.cos(extrusionAngle);
            const topX = baseX - podDvX;
            const topY = baseY - podDvY;

            // Main hab cylinder
            Draw3D.drawCylinder(topX, topY, sz * 0.4, podH, 10, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Connected side pod and window ring
            if (lodLevel === 3) {
                Draw3D.drawCylinder(baseX - (podDvX * 0.5) + sz * 0.5, baseY - (podDvY * 0.5), sz * 0.25, podH * 0.6, 10, this.primaryColor, extrusionAngle, sunAngle);
                Draw3D.drawCylinder(topX, topY, sz * 0.42, sz * 0.08, 10, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 2) {
            // LANDING PAD - Flat platform with lights
            const padH = sz * 0.1;
            const padDvX = padH * Math.sin(extrusionAngle);
            const padDvY = padH * Math.cos(extrusionAngle);
            const topX = baseX - padDvX;
            const topY = baseY - padDvY;

            // Main platform
            Draw3D.drawCylinder(topX, topY, sz * 0.9, padH, 8, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Markings and lights
            if (lodLevel === 3) {
                Draw3D.drawCylinder(baseX - (padDvX * 1.2), baseY - (padDvY * 1.2), sz * 0.5, sz * 0.02, 12, this.accentColor, extrusionAngle, sunAngle);
                // Corner lights
                for (let i = 0; i < 4; i++) {
                    const ang = i * Math.PI / 2;
                    const lx = baseX + Math.cos(ang) * sz * 0.7 - padDvX;
                    const ly = baseY + Math.sin(ang) * sz * 0.7 - padDvY;
                    Draw3D.drawCylinder(lx, ly, sz * 0.05, sz * 0.3, 6, color(255, 200, 50), extrusionAngle, sunAngle);
                }
            }

        } else if (this.variant === 3) {
            // COMMS ARRAY - Satellite dishes
            const baseH = sz * 0.3;
            const baseDvX = baseH * Math.sin(extrusionAngle);
            const baseDvY = baseH * Math.cos(extrusionAngle);
            const topX = baseX - baseDvX;
            const topY = baseY - baseDvY;

            // Base building
            Draw3D.drawBox3D(topX, topY, sz * 0.8, sz * 0.6, baseH, this.primaryColor, extrusionAngle, sunAngle);
            // Large dish (sits on top of the base building)
            const dishH = sz * 0.3; // Height of the dish itself
            const dishDvX = dishH * Math.sin(extrusionAngle);
            const dishDvY = dishH * Math.cos(extrusionAngle);
            const dishTopX = topX + sz * 0.25 - dishDvX;
            const dishTopY = topY - dishDvY;
            Draw3D.drawDome(dishTopX, dishTopY, sz * 0.3, 8, this.accentColor, extrusionAngle, sunAngle, true);

            // LOD 3 only: Small dish (sits on top of the base building)
            if (lodLevel === 3) {
                const smallDishH = sz * 0.25;
                const smallDishDvX = smallDishH * Math.sin(extrusionAngle);
                const smallDishDvY = smallDishH * Math.cos(extrusionAngle);
                const smallDishTopX = topX - sz * 0.25 - smallDishDvX;
                const smallDishTopY = topY - smallDishDvY;
                Draw3D.drawDome(smallDishTopX, smallDishTopY, sz * 0.25, 8, this.accentColor, extrusionAngle, sunAngle, true);
            }

        } else {
            // SOLAR FARM - Array of solar panels
            const panelH = sz * 0.1;
            const panelDvX = panelH * Math.sin(extrusionAngle);
            const panelDvY = panelH * Math.cos(extrusionAngle);
            const topX = baseX - panelDvX;
            const topY = baseY - panelDvY;

            // Support structure
            Draw3D.drawBox3D(topX, topY, sz * 1.2, sz * 0.8, panelH, this.primaryColor, extrusionAngle, sunAngle);

            // Solar panels
            // LOD 2: Only center panel, LOD 3: All 3
            const startI = lodLevel === 2 ? 0 : -1;
            const endI = lodLevel === 2 ? 0 : 1;
            for (let i = startI; i <= endI; i++) {
                Draw3D.drawBox3D(topX - (sz * 0.08) * Math.sin(extrusionAngle) + i * sz * 0.35, topY - (sz * 0.08) * Math.cos(extrusionAngle), sz * 0.3, sz * 0.5, sz * 0.02, this.accentColor, extrusionAngle, sunAngle);
            }
        }

        // Draw health bar if damaged and is player base
        if (this.isPlayerBase && this.health < this.maxHealth) {
            this._drawHealthBar(baseX, baseY, sz, extrusionAngle, alt);
        }
    }

    /**
     * Draw a floating health bar for the base
     * @private
     */
    _drawHealthBar(baseX, baseY, sz, extrusionAngle, alt) {
        const barW = sz * 1.5;
        const barH = 6;
        const barYOffset = (this.height || sz) + 20; // Above the building

        const dvX = barYOffset * Math.sin(extrusionAngle);
        const dvY = barYOffset * Math.cos(extrusionAngle);

        const bx = baseX - dvX;
        const by = baseY - dvY;

        push();
        translate(bx, by);

        // Background
        fill(0, 150);
        noStroke();
        rectMode(CENTER);
        rect(0, 0, barW, barH);

        // Health
        const hpWidth = (this.health / this.maxHealth) * barW;
        const hpColor = lerpColor(color(255, 50, 50), color(50, 255, 50), this.health / this.maxHealth);
        fill(hpColor);
        rectMode(CORNER);
        rect(-barW / 2, -barH / 2, hpWidth, barH);

        // Label
        fill(255);
        textAlign(CENTER, BOTTOM);
        textSize(12);
        text(this.displayName, 0, -barH);

        pop();
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 1.8, [180, 180, 220]);
        }
    }
}

/**
 * Mining buildings - Heavy industrial, extraction equipment
 * Drill rigs, ore silos, conveyors
 */
class MiningBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Mining Facility";
        this.seed = seed;
        this.variant = calculateVariant(seed, 6.28, 5);
        this.height = calculateHeight(size, seed, 1.5, 3.5);
        this.maxHealth = 350;
        this.health = 350;

        // Mining colors: yellow, orange, brown
        this.primaryColor = color(180, 150, 50);   // Yellow machinery
        this.accentColor = color(200, 100, 30);    // Orange
        this.structureColor = color(100, 80, 60);  // Brown

        const miningNames = ["Drill Rig", "Ore Silo", "Conveyor", "Excavator", "Crusher"];
        this.displayName = miningNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // DRILL RIG - Tall drilling tower
            const towerH = this.height;
            const towerDvX = towerH * Math.sin(extrusionAngle);
            const towerDvY = towerH * Math.cos(extrusionAngle);
            const topX = baseX - towerDvX;
            const topY = baseY - towerDvY;

            // Tower legs
            if (lodLevel === 3) {
                // Detailed Lattice
                const legW = sz * 0.1;
                for (let i = -1; i <= 1; i += 2) {
                    for (let j = -1; j <= 1; j += 2) {
                        const legX = topX + i * sz * 0.2;
                        const legY = topY + j * sz * 0.2;
                        Draw3D.drawBox3D(legX, legY, legW, legW, towerH, this.structureColor, extrusionAngle, sunAngle);
                    }
                }
            } else {
                // Simplified block tower
                Draw3D.drawBox3D(topX, topY, sz * 0.5, sz * 0.5, towerH, this.structureColor, extrusionAngle, sunAngle);
            }

            // Drill head
            Draw3D.drawCone(baseX, baseY, sz * 0.2, sz * 0.4, 6, this.primaryColor, extrusionAngle + Math.PI, sunAngle);

            // LOD 3 only: Top platform
            if (lodLevel === 3) {
                Draw3D.drawBox3D(topX, topY, sz * 0.6, sz * 0.6, sz * 0.1, this.primaryColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // ORE SILO - Large cylindrical storage
            const siloH = this.height * 0.8;
            const siloDvX = siloH * Math.sin(extrusionAngle);
            const siloDvY = siloH * Math.cos(extrusionAngle);
            const topX = baseX - siloDvX;
            const topY = baseY - siloDvY;

            // Main silo cylinder
            Draw3D.drawCylinder(topX, topY, sz * 0.5, siloH, 12, this.structureColor, extrusionAngle, sunAngle);
            // Conical top
            Draw3D.drawCone(topX, topY, sz * 0.55, sz * 0.4, lodLevel === 2 ? 6 : 12, this.accentColor, extrusionAngle, sunAngle);

            // LOD 3 only: Warning stripes
            if (lodLevel === 3) {
                const stripeAlt = siloH * 0.5;
                Draw3D.drawCylinder(baseX - stripeAlt * Math.sin(extrusionAngle), baseY - stripeAlt * Math.cos(extrusionAngle), sz * 0.52, sz * 0.1, 12, this.primaryColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 2) {
            // CONVEYOR - Angled transport belt
            const convH = this.height * 0.5;
            const convDvX = convH * Math.sin(extrusionAngle);
            const convDvY = convH * Math.cos(extrusionAngle);

            // LOD 3 only: Support columns
            if (lodLevel === 3) {
                const lowerAlt = convH * 0.5; // Top of lower support
                const lowerX = baseX - lowerAlt * Math.sin(extrusionAngle) - sz * 0.3;
                const lowerY = baseY - lowerAlt * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(lowerX, lowerY, sz * 0.15, sz * 0.15, lowerAlt, this.structureColor, extrusionAngle, sunAngle);

                const upperAlt = convH; // Top of upper support
                const upperX = baseX - upperAlt * Math.sin(extrusionAngle) + sz * 0.3;
                const upperY = baseY - upperAlt * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(upperX, upperY, sz * 0.15, sz * 0.15, upperAlt, this.structureColor, extrusionAngle, sunAngle);
            }

            // Conveyor belt
            const midAlt = convH * 0.6;
            Draw3D.drawBox3D(baseX - midAlt * Math.sin(extrusionAngle), baseY - midAlt * Math.cos(extrusionAngle), sz * 0.9, sz * 0.25, sz * 0.08, this.primaryColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // EXCAVATOR - Crane with bucket
            const baseH = sz * 0.3;
            const baseDvX = baseH * Math.sin(extrusionAngle);
            const baseDvY = baseH * Math.cos(extrusionAngle);
            const topX = baseX - baseDvX;
            const topY = baseY - baseDvY;

            // Base platform
            Draw3D.drawBox3D(topX, topY, sz * 0.8, sz * 0.6, baseH, this.structureColor, extrusionAngle, sunAngle);
            // Crane arm
            const armDvX = (sz * 0.3) * Math.sin(extrusionAngle);
            const armDvY = (sz * 0.3) * Math.cos(extrusionAngle);
            Draw3D.drawBox3D(topX - armDvX + sz * 0.3, topY - armDvY, sz * 0.15, sz * 0.8, sz * 0.12, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Bucket details
            if (lodLevel === 3) {
                const bucketDvX = (sz * 0.15) * Math.sin(extrusionAngle);
                const bucketDvY = (sz * 0.15) * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(topX - bucketDvX + sz * 0.6, topY - bucketDvY, sz * 0.25, sz * 0.2, sz * 0.2, this.accentColor, extrusionAngle, sunAngle);
            }

        } else {
            // CRUSHER - Ore processing
            const crushH = this.height * 0.5;
            const crushDvX = crushH * Math.sin(extrusionAngle);
            const crushDvY = crushH * Math.cos(extrusionAngle);
            const topX = baseX - crushDvX;
            const topY = baseY - crushDvY;

            // Main hopper
            Draw3D.drawBox3D(topX, topY, sz * 0.8, sz * 0.6, crushH, this.structureColor, extrusionAngle, sunAngle);
            // Input chute - sits flush on hopper top
            Draw3D.drawCone(topX, topY, sz * 0.35, sz * 0.3, 4, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Output pipes
            if (lodLevel === 3) {
                const pipeAlt = crushH * 0.3;
                Draw3D.drawCylinder(baseX - pipeAlt * Math.sin(extrusionAngle) - sz * 0.5, baseY - pipeAlt * Math.cos(extrusionAngle), sz * 0.1, sz * 0.4, 8, this.accentColor, extrusionAngle, sunAngle);
                Draw3D.drawCylinder(baseX - pipeAlt * Math.sin(extrusionAngle) + sz * 0.5, baseY - pipeAlt * Math.cos(extrusionAngle), sz * 0.1, sz * 0.4, 8, this.accentColor, extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2, [200, 150, 50]);
        }
    }
}

/**
 * Industrial buildings - Factories, smokestacks, heavy machinery
 */
class IndustrialBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Industrial Complex";
        this.seed = seed;
        this.variant = calculateVariant(seed, 2.71, 5);
        this.height = calculateHeight(size, seed, 1.2, 3.0);
        this.maxHealth = 400;
        this.health = 400;

        // Industrial colors: dark gray, red, black
        this.primaryColor = color(80, 75, 70);     // Dark gray
        this.accentColor = color(150, 40, 30);     // Red
        this.metalColor = color(60, 60, 65);       // Black metal

        const industrialNames = ["Factory", "Storage Tanks", "Pipe Network", "Assembly Hall", "Power Plant"];
        this.displayName = industrialNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // FACTORY - Large building with smokestack
            const factH = this.height * 0.5;
            const factDvX = factH * Math.sin(extrusionAngle);
            const factDvY = factH * Math.cos(extrusionAngle);
            const factTopX = baseX - factDvX;
            const factTopY = baseY - factDvY;

            // Main factory building
            Draw3D.drawBox3D(factTopX, factTopY, sz * 1.4, sz * 0.8, factH, this.primaryColor, extrusionAngle, sunAngle);
            // Tall smokestack
            const stackH = this.height * 0.8;
            const stackDvX = stackH * Math.sin(extrusionAngle);
            const stackDvY = stackH * Math.cos(extrusionAngle);
            const stackTopX = baseX + sz * 0.4 - stackDvX;
            const stackTopY = baseY - stackDvY;
            Draw3D.drawCylinder(stackTopX, stackTopY, sz * 0.15, stackH, 8, this.metalColor, extrusionAngle, sunAngle);

            // LOD 3 only: Red warning tip
            if (lodLevel === 3) {
                const tipH = sz * 0.1;
                const tipDvX = tipH * Math.sin(extrusionAngle);
                const tipDvY = tipH * Math.cos(extrusionAngle);
                Draw3D.drawCylinder(stackTopX - tipDvX, stackTopY - tipDvY, sz * 0.17, tipH, 8, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // STORAGE TANKS - Cylindrical tanks
            const tankH = this.height * 0.6;
            const tankDvX = tankH * Math.sin(extrusionAngle);
            const tankDvY = tankH * Math.cos(extrusionAngle);
            const tankTopX = baseX - tankDvX;
            const tankTopY = baseY - tankDvY;

            // Left storage tank
            Draw3D.drawCylinder(tankTopX - sz * 0.25, tankTopY, sz * 0.35, tankH, 10, this.primaryColor, extrusionAngle, sunAngle);
            // Right storage tank
            Draw3D.drawCylinder(tankTopX + sz * 0.25, tankTopY, sz * 0.35, tankH, 10, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Connecting pipe
            if (lodLevel === 3) {
                const pipeAlt = tankH * 0.5;
                const pipeX = baseX - pipeAlt * Math.sin(extrusionAngle);
                const pipeY = baseY - pipeAlt * Math.cos(extrusionAngle);
                Draw3D.drawCylinder(pipeX, pipeY, sz * 0.08, sz * 0.5, 6, this.metalColor, extrusionAngle + Math.PI / 2, sunAngle);
            }

        } else if (this.variant === 2) {
            // PIPE NETWORK - Complex pipe junction
            const pipeH = this.height * 0.4;
            const pipeDvX = pipeH * Math.sin(extrusionAngle);
            const pipeDvY = pipeH * Math.cos(extrusionAngle);
            const pipeTopX = baseX - pipeDvX;
            const pipeTopY = baseY - pipeDvY;

            // Pipes
            Draw3D.drawCylinder(pipeTopX - sz * 0.2, pipeTopY, sz * 0.1, pipeH, 8, this.metalColor, extrusionAngle, sunAngle);
            Draw3D.drawCylinder(pipeTopX + sz * 0.2, pipeTopY, sz * 0.1, pipeH, 8, this.metalColor, extrusionAngle, sunAngle);
            // Junction box
            const junctionAlt = pipeH * 0.6;
            const junctionX = baseX - junctionAlt * Math.sin(extrusionAngle);
            const junctionY = baseY - junctionAlt * Math.cos(extrusionAngle);
            Draw3D.drawBox3D(junctionX, junctionY, sz * 0.5, sz * 0.3, sz * 0.25, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Valve wheel
            if (lodLevel === 3) {
                const wheelAlt = junctionAlt + sz * 0.15;
                const wheelX = baseX - wheelAlt * Math.sin(extrusionAngle);
                const wheelY = baseY - wheelAlt * Math.cos(extrusionAngle);
                Draw3D.drawCylinder(wheelX, wheelY, sz * 0.12, sz * 0.05, 8, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // ASSEMBLY HALL - Long modular building
            const hallH = this.height * 0.4;
            const hallDvX = hallH * Math.sin(extrusionAngle);
            const hallDvY = hallH * Math.cos(extrusionAngle);
            const hallTopX = baseX - hallDvX;
            const hallTopY = baseY - hallDvY;

            // Main hall structure
            Draw3D.drawBox3D(hallTopX, hallTopY, sz * 1.6, sz * 0.6, hallH, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Modular roof sections
            if (lodLevel === 3) {
                for (let i = -1; i <= 1; i++) {
                    Draw3D.drawBox3D(hallTopX + i * sz * 0.45, hallTopY, sz * 0.3, sz * 0.5, sz * 0.08, this.metalColor, extrusionAngle, sunAngle);
                }
            }
            // Loading dock
            const dockAlt = hallH * 0.3;
            const dockX = baseX - dockAlt * Math.sin(extrusionAngle) + sz * 0.7;
            const dockY = baseY - dockAlt * Math.cos(extrusionAngle);
            Draw3D.drawBox3D(dockX, dockY, sz * 0.3, sz * 0.4, hallH * 0.5, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // POWER PLANT - Cooling towers
            const towerH = this.height * 0.7;
            const towerDvX = towerH * Math.sin(extrusionAngle);
            const towerDvY = towerH * Math.cos(extrusionAngle);
            const towerTopX = baseX - towerDvX;
            const towerTopY = baseY - towerDvY;

            // Main building
            const buildAlt = towerH * 0.3;
            const buildX = baseX - buildAlt * Math.sin(extrusionAngle);
            const buildY = baseY - buildAlt * Math.cos(extrusionAngle);
            Draw3D.drawBox3D(buildX, buildY, sz * 0.8, sz * 0.6, towerH * 0.4, this.primaryColor, extrusionAngle, sunAngle);
            // Left cooling tower
            Draw3D.drawCylinder(towerTopX - sz * 0.4, towerTopY, sz * 0.3, towerH, 8, this.metalColor, extrusionAngle, sunAngle);
            // Right cooling tower
            Draw3D.drawCylinder(towerTopX + sz * 0.4, towerTopY, sz * 0.3, towerH, 8, this.metalColor, extrusionAngle, sunAngle);

            // LOD 3 only: Steam vents
            if (lodLevel === 3) {
                Draw3D.drawCylinder(towerTopX - sz * 0.4, towerTopY, sz * 0.35, sz * 0.08, 8, color(200, 200, 200, 150), extrusionAngle, sunAngle);
                Draw3D.drawCylinder(towerTopX + sz * 0.4, towerTopY, sz * 0.35, sz * 0.08, 8, color(200, 200, 200, 150), extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2, [150, 80, 50]);
        }
    }
}

/**
 * Refinery buildings - Processing towers, spherical tanks, pipes
 */
class RefineryBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Refinery";
        this.seed = seed;
        this.variant = calculateVariant(seed, 1.41, 5);
        this.height = calculateHeight(size, seed, 2, 4);
        this.maxHealth = 300;
        this.health = 300;

        // Refinery colors: chrome, orange, yellow
        this.primaryColor = color(160, 160, 170);  // Chrome
        this.accentColor = color(220, 120, 30);    // Orange
        this.pipeColor = color(140, 140, 145);     // Lighter chrome

        const refineryNames = ["Distillation Tower", "Spherical Tank", "Cracking Unit", "Flare Stack", "Pump Station"];
        this.displayName = refineryNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // DISTILLATION TOWER - Tall segmented column
            const towerH = this.height;
            const towerDvX = towerH * Math.sin(extrusionAngle);
            const towerDvY = towerH * Math.cos(extrusionAngle);
            const towerTopX = baseX - towerDvX;
            const towerTopY = baseY - towerDvY;

            // Main column
            Draw3D.drawCylinder(towerTopX, towerTopY, sz * 0.3, towerH, 10, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Segment rings
            if (lodLevel === 3) {
                for (let i = 0.2; i < 0.9; i += 0.2) {
                    const ringAlt = towerH * i;
                    const ringX = baseX - ringAlt * Math.sin(extrusionAngle);
                    const ringY = baseY - ringAlt * Math.cos(extrusionAngle);
                    Draw3D.drawCylinder(ringX, ringY, sz * 0.35, sz * 0.08, 10, this.accentColor, extrusionAngle, sunAngle);
                }
            }

        } else if (this.variant === 1) {
            // SPHERICAL TANK - Large spherical storage
            const tankR = sz * 0.5;

            // LOD 3 only: Support legs
            if (lodLevel === 3) {
                for (let i = 0; i < 4; i++) {
                    const ang = i * Math.PI / 2 + Math.PI / 4;
                    const legWorldX = worldX + Math.cos(ang) * sz * 0.35;
                    const legWorldY = worldY + Math.sin(ang) * sz * 0.35;
                    const legVisual = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                        ? { x: surfaceMode._toVisualX(legWorldX, alt), y: surfaceMode._toVisualY(legWorldY, alt) }
                        : { x: legWorldX - alt * Math.sin(extrusionAngle), y: legWorldY - alt * Math.cos(extrusionAngle) };
                    Draw3D.drawCylinder(legVisual.x, legVisual.y, sz * 0.06, sz * 0.4, 6, this.pipeColor, extrusionAngle, sunAngle);
                }
            }
            // Sphere center altitude
            const sphereAlt = sz * 0.4;
            const sphereX = baseX - sphereAlt * Math.sin(extrusionAngle);
            const sphereY = baseY - sphereAlt * Math.cos(extrusionAngle);
            // Both domes need angle + PI to rise correctly from center
            const domeAngle = extrusionAngle + Math.PI;
            // Upper hemisphere
            Draw3D.drawDome(sphereX, sphereY, tankR, lodLevel === 2 ? 6 : 8, this.primaryColor, domeAngle, sunAngle);
            // Lower hemisphere (inverted)
            Draw3D.drawDome(sphereX, sphereY, tankR * 0.95, lodLevel === 2 ? 6 : 8, this.primaryColor, domeAngle, sunAngle, true);

        } else if (this.variant === 2) {
            // CRACKING UNIT - Box with pipes
            const unitH = this.height * 0.5;
            const unitDvX = unitH * Math.sin(extrusionAngle);
            const unitDvY = unitH * Math.cos(extrusionAngle);
            const unitTopX = baseX - unitDvX;
            const unitTopY = baseY - unitDvY;

            // Main processing box
            Draw3D.drawBox3D(unitTopX, unitTopY, sz * 0.8, sz * 0.6, unitH, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Exhaust stacks
            if (lodLevel === 3) {
                // Left exhaust stack
                const stackH = sz * 0.4;
                const stackDvX = stackH * Math.sin(extrusionAngle);
                const stackDvY = stackH * Math.cos(extrusionAngle);
                Draw3D.drawCylinder(unitTopX - sz * 0.25 - stackDvX, unitTopY - stackDvY, sz * 0.08, stackH, 8, this.pipeColor, extrusionAngle, sunAngle);
                // Right exhaust stack
                Draw3D.drawCylinder(unitTopX + sz * 0.25 - stackDvX, unitTopY - stackDvY, sz * 0.08, stackH, 8, this.pipeColor, extrusionAngle, sunAngle);
                // Flame tip on left stack
                const coneAngle = extrusionAngle + Math.PI;
                Draw3D.drawCone(unitTopX - sz * 0.25 - stackDvX, unitTopY - stackDvY, sz * 0.06, sz * 0.15, 6, this.accentColor, coneAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // FLARE STACK - Tall stack with burning flare
            const flareH = this.height * 0.9;
            const flareDvX = flareH * Math.sin(extrusionAngle);
            const flareDvY = flareH * Math.cos(extrusionAngle);
            const flareTopX = baseX - flareDvX;
            const flareTopY = baseY - flareDvY;

            // LOD 3 only: Base platform
            if (lodLevel === 3) {
                const platAlt = flareH * 0.1;
                const platX = baseX - platAlt * Math.sin(extrusionAngle);
                const platY = baseY - platAlt * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(platX, platY, sz * 0.5, sz * 0.5, sz * 0.15, this.primaryColor, extrusionAngle, sunAngle);
            }
            // Tall stack
            Draw3D.drawCylinder(flareTopX, flareTopY, sz * 0.1, flareH, 8, this.pipeColor, extrusionAngle, sunAngle);
            // Burning flare (orange cone) - sits flush on stack top
            Draw3D.drawCone(flareTopX, flareTopY, sz * 0.2, sz * 0.4, 6, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // PUMP STATION - Low building with valves
            const pumpH = this.height * 0.3;
            const pumpDvX = pumpH * Math.sin(extrusionAngle);
            const pumpDvY = pumpH * Math.cos(extrusionAngle);
            const pumpTopX = baseX - pumpDvX;
            const pumpTopY = baseY - pumpDvY;

            // Main building
            Draw3D.drawBox3D(pumpTopX, pumpTopY, sz * 1.0, sz * 0.6, pumpH, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Valves and Pipes
            if (lodLevel === 3) {
                // Valve wheels
                for (let i = -1; i <= 1; i++) {
                    Draw3D.drawCylinder(pumpTopX + i * sz * 0.3, pumpTopY, sz * 0.12, sz * 0.06, 8, this.accentColor, extrusionAngle, sunAngle);
                }
                // Horizontal pipes
                const hPipeAlt = pumpH * 0.5;
                const hPipeX = baseX - hPipeAlt * Math.sin(extrusionAngle);
                const hPipeY = baseY - hPipeAlt * Math.cos(extrusionAngle) + sz * 0.3;
                Draw3D.drawCylinder(hPipeX, hPipeY, sz * 0.12, sz * 0.8, 8, this.pipeColor, extrusionAngle + Math.PI / 2, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2.5, [220, 150, 50]);
        }
    }
}

/**
 * Agricultural buildings - Organic, low-rise, greenhouses
 */
class AgriculturalBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Agricultural Facility";
        this.seed = seed;
        this.variant = calculateVariant(seed, 8.76, 5);
        this.height = calculateHeight(size, seed, 0.8, 1.8);
        this.maxHealth = 150;
        this.health = 150;

        // Agricultural colors: green, brown, tan
        this.primaryColor = color(100, 140, 80);   // Green
        this.accentColor = color(120, 90, 60);     // Brown
        this.glassColor = color(180, 220, 180, 150); // Green-tinted glass

        const agriNames = ["Greenhouse", "Grain Silo", "Water Tower", "Barn", "Windmill"];
        this.displayName = agriNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // GREENHOUSE - Arched glass structure
            const baseH = sz * 0.15;
            const baseDvX = baseH * Math.sin(extrusionAngle);
            const baseDvY = baseH * Math.cos(extrusionAngle);
            const topX = baseX - baseDvX;
            const topY = baseY - baseDvY;

            // Foundation
            Draw3D.drawBox3D(topX, topY, sz * 1.2, sz * 0.8, baseH, this.accentColor, extrusionAngle, sunAngle);
            // Glass dome - sits flush on foundation
            const domeAngle = extrusionAngle + Math.PI;
            Draw3D.drawDome(topX, topY, sz * 0.55, lodLevel === 2 ? 6 : 8, this.glassColor, domeAngle, sunAngle);

        } else if (this.variant === 1) {
            // GRAIN SILO - Tall cylindrical storage
            const siloH = this.height;
            const siloDvX = siloH * Math.sin(extrusionAngle);
            const siloDvY = siloH * Math.cos(extrusionAngle);
            const topX = baseX - siloDvX;
            const topY = baseY - siloDvY;

            // Main silo cylinder
            Draw3D.drawCylinder(topX, topY, sz * 0.35, siloH, 10, this.accentColor, extrusionAngle, sunAngle);
            // Domed top - sits flush on silo cylinder
            const siloDomeAngle = extrusionAngle + Math.PI;
            Draw3D.drawDome(topX, topY, sz * 0.38, lodLevel === 2 ? 6 : 8, this.primaryColor, siloDomeAngle, sunAngle);

        } else if (this.variant === 2) {
            // WATER TOWER - Elevated tank
            const towerH = this.height * 0.6;
            const towerDvX = towerH * Math.sin(extrusionAngle);
            const towerDvY = towerH * Math.cos(extrusionAngle);
            const tankH = sz * 0.35;
            const tankDvX = tankH * Math.sin(extrusionAngle);
            const tankDvY = tankH * Math.cos(extrusionAngle);

            // Support column
            const columnX = baseX - towerDvX * 0.5;
            const columnY = baseY - towerDvY * 0.5;
            Draw3D.drawCylinder(columnX, columnY, sz * 0.12, towerH * 0.7, 8, this.accentColor, extrusionAngle, sunAngle);
            // Water tank
            const topX = baseX - towerDvX;
            const topY = baseY - towerDvY;
            Draw3D.drawCylinder(topX, topY, sz * 0.4, tankH, 10, this.primaryColor, extrusionAngle, sunAngle);

            // Water tower roof cone needs to rise from tank top
            if (lodLevel === 3) {
                const roofX = topX - tankDvX;
                const roofY = topY - tankDvY;
                const roofAngle = extrusionAngle + Math.PI;
                Draw3D.drawCone(roofX, roofY, sz * 0.45, sz * 0.25, 8, this.accentColor, roofAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // BARN - Classic agricultural building
            const barnH = this.height * 0.6;
            const barnDvX = barnH * Math.sin(extrusionAngle);
            const barnDvY = barnH * Math.cos(extrusionAngle);
            const topX = baseX - barnDvX;
            const topY = baseY - barnDvY;

            // Main structure
            Draw3D.drawBox3D(topX, topY, sz * 1.0, sz * 0.7, barnH, this.accentColor, extrusionAngle, sunAngle);
            // Peaked roof cone needs to rise from center of barn roof
            const roofAngle = extrusionAngle + Math.PI;
            Draw3D.drawCone(topX, topY, sz * 0.55, sz * 0.35, 4, this.primaryColor, roofAngle, sunAngle);

            // LOD 3 only: Barn door
            if (lodLevel === 3) {
                Draw3D.drawBox3D(baseX - barnDvX * 0.3, baseY - barnDvY * 0.3, sz * 0.25, sz * 0.02, barnH * 0.6, color(80, 60, 40), extrusionAngle, sunAngle);
            }

        } else {
            // WINDMILL - Power generation
            const millH = this.height * 0.8;
            const millDvX = millH * Math.sin(extrusionAngle);
            const millDvY = millH * Math.cos(extrusionAngle);
            const topX = baseX - millDvX;
            const topY = baseY - millDvY;

            // Tower
            Draw3D.drawCylinder(topX, topY, sz * 0.2, millH, 8, this.accentColor, extrusionAngle, sunAngle);
            // Hub
            const hubX = topX - (sz * 0.15) * Math.sin(extrusionAngle);
            const hubY = topY - (sz * 0.15) * Math.cos(extrusionAngle);
            Draw3D.drawCylinder(hubX, hubY, sz * 0.15, sz * 0.2, 8, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Blades
            if (lodLevel === 3) {
                const bladeX = hubX - (sz * 0.25) * Math.sin(extrusionAngle);
                const bladeY = hubY - (sz * 0.25) * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(bladeX, bladeY, sz * 0.08, sz * 0.6, sz * 0.05, color(220, 220, 220), extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 1.5, [100, 180, 80]);
        }
    }
}

/**
 * Service buildings - Commercial, communications, varied
 */
class ServiceBuilding extends SurfaceObject {
    constructor(x, y, size, seed = 0) {
        super(x, y, size);
        this.type = "Service Structure";
        this.seed = seed;
        this.variant = calculateVariant(seed, 3.33, 5);
        this.height = calculateHeight(size, seed, 1.5, 3.0);
        this.maxHealth = 180;
        this.health = 180;

        // Service colors: blue, white, yellow
        this.primaryColor = color(80, 120, 180);   // Blue
        this.accentColor = color(220, 220, 230);   // White
        this.lightColor = color(255, 220, 100);    // Yellow

        const serviceNames = ["Comm Tower", "Shop", "Parking Structure", "Hotel", "Medical Center"];
        this.displayName = serviceNames[this.variant] || this.type;
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const sz = this.size;

        if (this.variant === 0) {
            // COMM TOWER - Tall antenna spire
            const towerH = this.height;
            const towerDvX = towerH * Math.sin(extrusionAngle);
            const towerDvY = towerH * Math.cos(extrusionAngle);
            const towerTopX = baseX - towerDvX;
            const towerTopY = baseY - towerDvY;

            // Base building
            const baseAlt = sz * 0.2;
            const baseX_offset = baseX - baseAlt * Math.sin(extrusionAngle);
            const baseY_offset = baseY - baseAlt * Math.cos(extrusionAngle);
            Draw3D.drawBox3D(baseX_offset, baseY_offset, sz * 0.4, sz * 0.4, sz * 0.4, this.primaryColor, extrusionAngle, sunAngle);
            // Antenna mast
            Draw3D.drawCylinder(towerTopX, towerTopY, sz * 0.04, towerH, 6, this.accentColor, extrusionAngle, sunAngle);

            // LOD 3 only: Satellite dish and light
            if (lodLevel === 3) {
                // Satellite dish (midway up tower)
                const dishAlt = towerH * 0.5;
                const dishX = baseX - dishAlt * Math.sin(extrusionAngle);
                const dishY = baseY - dishAlt * Math.cos(extrusionAngle);
                Draw3D.drawDome(dishX, dishY, sz * 0.25, 6, this.accentColor, extrusionAngle, sunAngle, true);
                // Red warning light - sits flush on tower top
                const lightAngle = extrusionAngle + Math.PI;
                Draw3D.drawDome(towerTopX, towerTopY, sz * 0.08, 6, color(255, 50, 50), lightAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // SHOP/COMMERCIAL - Low building with signs
            const shopH = this.height * 0.4;
            const shopDvX = shopH * Math.sin(extrusionAngle);
            const shopDvY = shopH * Math.cos(extrusionAngle);
            const shopTopX = baseX - shopDvX;
            const shopTopY = baseY - shopDvY;

            // Main building
            Draw3D.drawBox3D(shopTopX, shopTopY, sz * 1.0, sz * 0.7, shopH, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Sign and Awning
            if (lodLevel === 3) {
                // Sign on front
                Draw3D.drawBox3D(shopTopX, shopTopY, sz * 0.8, sz * 0.02, sz * 0.2, this.lightColor, extrusionAngle, sunAngle);
                // Awning
                const awnAlt = shopH * 0.3;
                const awnX = baseX - awnAlt * Math.sin(extrusionAngle);
                const awnY = baseY - awnAlt * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(awnX, awnY, sz * 1.1, sz * 0.25, sz * 0.05, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 2) {
            // PARKING STRUCTURE - Multi-level
            const levelH = sz * 0.25;

            // Parking levels
            for (let i = 0; i < 3; i++) {
                const levelAlt = levelH * (i + 0.5);
                const levelX = baseX - levelAlt * Math.sin(extrusionAngle);
                const levelY = baseY - levelAlt * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(levelX, levelY, sz * 1.2, sz * 0.8, levelH, this.primaryColor, extrusionAngle, sunAngle);
            }

            // LOD 3 only: Stairwell tower
            if (lodLevel === 3) {
                const towerAlt = levelH * 1.5;
                const towerX = baseX - towerAlt * Math.sin(extrusionAngle) + sz * 0.5;
                const towerY = baseY - towerAlt * Math.cos(extrusionAngle);
                Draw3D.drawBox3D(towerX, towerY, sz * 0.2, sz * 0.3, levelH * 3, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // HOTEL - Tall residential building
            const hotelH = this.height * 0.8;
            const hotelDvX = hotelH * Math.sin(extrusionAngle);
            const hotelDvY = hotelH * Math.cos(extrusionAngle);
            const hotelTopX = baseX - hotelDvX;
            const hotelTopY = baseY - hotelDvY;

            // Main tower
            Draw3D.drawBox3D(hotelTopX, hotelTopY, sz * 0.7, sz * 0.5, hotelH, this.primaryColor, extrusionAngle, sunAngle);

            // LOD 3 only: Balconies and Sign
            if (lodLevel === 3) {
                // Balconies
                for (let i = 0; i < 4; i++) {
                    const balAlt = hotelH * (0.3 + i * 0.2);
                    const balX = baseX - balAlt * Math.sin(extrusionAngle) + sz * 0.35;
                    const balY = baseY - balAlt * Math.cos(extrusionAngle);
                    Draw3D.drawBox3D(balX, balY, sz * 0.15, sz * 0.4, sz * 0.03, this.accentColor, extrusionAngle, sunAngle);
                }
                // Rooftop sign
                Draw3D.drawBox3D(hotelTopX, hotelTopY, sz * 0.5, sz * 0.05, sz * 0.15, this.lightColor, extrusionAngle, sunAngle);
            }

        } else {
            // MEDICAL CENTER - Low with cross symbol
            const medH = this.height * 0.45;
            const medDvX = medH * Math.sin(extrusionAngle);
            const medDvY = medH * Math.cos(extrusionAngle);
            const medTopX = baseX - medDvX;
            const medTopY = baseY - medDvY;

            // Main building
            Draw3D.drawBox3D(medTopX, medTopY, sz * 1.2, sz * 0.8, medH, this.accentColor, extrusionAngle, sunAngle);

            // LOD 3 only: Cross symbols and Canopy
            if (lodLevel === 3) {
                // Red cross horizontal
                Draw3D.drawBox3D(medTopX, medTopY, sz * 0.3, sz * 0.1, sz * 0.05, color(200, 50, 50), extrusionAngle, sunAngle);
                // Red cross vertical
                Draw3D.drawBox3D(medTopX, medTopY, sz * 0.1, sz * 0.3, sz * 0.05, color(200, 50, 50), extrusionAngle, sunAngle);
                // Entrance canopy
                const canAlt = medH * 0.2;
                const canX = baseX - canAlt * Math.sin(extrusionAngle);
                const canY = baseY - canAlt * Math.cos(extrusionAngle) + sz * 0.3;
                Draw3D.drawBox3D(canX, canY, sz * 0.4, sz * 0.3, sz * 0.1, this.primaryColor, extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 1.5, [100, 150, 220]);
        }
    }
}


class Turret extends SurfaceObject {
    constructor(x, y, size) {
        super(x, y, size || 40);

        this.type = "Turret"; // Explicit type for collision detection
        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.TURRET : {};

        this.range = config.RANGE || 1000;
        this.rangeSq = this.range * this.range;
        this.detectionHeightThreshold = config.DETECTION_HEIGHT_THRESHOLD || 50; // Radar altitude threshold for detection
        this.color = color(120, 120, 120);
        this.angle = 0;
        this.cooldown = 0;
        this.id = Math.floor(Math.random() * 10000);
        this.health = config.HEALTH || 100; // Explicitly set health
        this.maxHealth = config.HEALTH || 100;
        this.lastHitTime = 0; // For damage flash effect
        this.isSurface = true; // Mark as surface entity for sound filtering
        this.altitude = 0; // Updated each frame to head/muzzle height for collisions/aiming
    }

    /**
     * @override
     */
    getHeight() {
        return this.size * 0.8; // Turret head height
    }

    update(dt, player, starSystem) {
        // Stop all activity if destroyed
        if (this.destroyed) return;
        if (!player) return;
        this.cooldown -= dt;

        // Stealth detection based on EITHER radar altitude OR absolute altitude
        // - Radar altitude > threshold: Player flying high above terrain (detected)
        // - Absolute altitude very high: Player at high elevation regardless of terrain (detected)
        const turretBaseAltitude = this.yOffset || 0;
        const playerAltitude = player.altitude || 0;
        // Height calculation must match draw() method: baseH (sz * 0.2) + headH (sz * 0.6) = sz * 0.8
        const headHeight = this.size * 0.8;
        this.altitude = turretBaseAltitude + headHeight;

        // Detection threshold: default 50 units of radar altitude
        const detectionThreshold = this.detectionHeightThreshold !== undefined ?
            this.detectionHeightThreshold : 50;

        // Check radar altitude if available from surfaceMode
        let radarDetection = false;
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.altitude !== undefined) {
            const playerRadarAltitude = surfaceMode.radarAltitude !== undefined ?
                surfaceMode.radarAltitude : surfaceMode.altitude;
            radarDetection = playerRadarAltitude > detectionThreshold;
        }

        // Also detect if player has very high absolute altitude (on hilltop)
        // This ensures players on high ground are always visible
        const absoluteDetection = playerAltitude > (turretBaseAltitude + detectionThreshold);

        // Cloak detection: cloaked players cannot be detected
        const playerCloaked = player.isCloaked || false;

        const isDetected = !playerCloaked && (radarDetection || absoluteDetection);

        // Quick range gate using world space (faster than visual math)
        const worldDx = player.pos.x - this.pos.x;
        const worldDy = player.pos.y - this.pos.y;
        const worldDistSq = worldDx * worldDx + worldDy * worldDy;

        // Only rotate and fire if player is detected AND within range
        if (!isDetected || worldDistSq > this.rangeSq) return;

        // Calculate turret aiming based on visual positions (matches drone logic)
        let targetAngle = 0;
        if (typeof surfaceMode !== 'undefined' && surfaceMode) {
            const turretAlt = this.altitude || (this.yOffset || 0);
            const playerAlt = player.altitude || 0;

            let turretVisualX, turretVisualY, playerVisualX, playerVisualY;

            // Use projection helpers if available
            if (surfaceMode._toVisualX && surfaceMode._toVisualY) {
                turretVisualX = surfaceMode._toVisualX(this.pos.x, turretAlt);
                turretVisualY = surfaceMode._toVisualY(this.pos.y, turretAlt);
                playerVisualX = surfaceMode._toVisualX(player.pos.x, playerAlt);
                playerVisualY = surfaceMode._toVisualY(player.pos.y, playerAlt);
            } else {
                // Fallback manual projection using centralized getExtrusionAngle() if available
                const extrusionAngle = (typeof getExtrusionAngle === 'function') ? getExtrusionAngle() : 0.5;
                turretVisualX = this.pos.x - (turretAlt * Math.sin(extrusionAngle));
                turretVisualY = this.pos.y - (turretAlt * Math.cos(extrusionAngle));
                playerVisualX = player.pos.x - (playerAlt * Math.sin(extrusionAngle));
                playerVisualY = player.pos.y - (playerAlt * Math.cos(extrusionAngle));
            }

            const visualDX = playerVisualX - turretVisualX;
            const visualDY = playerVisualY - turretVisualY;
            targetAngle = Math.atan2(visualDY, visualDX);
        } else {
            // Fallback for non-surface mode
            const dx = player.pos.x - this.pos.x;
            const dy = player.pos.y - this.pos.y;
            targetAngle = Math.atan2(dy, dx);
        }
        // Use utility function for smooth rotation
        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.TURRET : {};
        const turnSpeed = config.TURN_SPEED || 5;

        if (typeof smoothRotateTowards === 'function') {
            this.angle = smoothRotateTowards(this.angle, targetAngle, turnSpeed, dt);
        } else {
            // Fallback to manual implementation with inline angle normalization
            let diff = targetAngle - this.angle;
            // Normalize diff to the range [-PI, PI] to get the shortest rotation direction
            const TWO_PI = Math.PI * 2;
            while (diff < -Math.PI) diff += TWO_PI;
            while (diff > Math.PI) diff -= TWO_PI;

            const maxTurn = turnSpeed * dt;
            if (Math.abs(diff) <= maxTurn) {
                this.angle = targetAngle;
            } else {
                this.angle += Math.sign(diff) * maxTurn;
            }
        }

        // Fire if ready
        if (this.cooldown <= 0 && starSystem) {
            this.fire(starSystem, player);
            this.cooldown = config.FIRE_RATE || 2.0;
        }
    }

    fire(starSystem, player) {
        if (typeof Projectile === 'undefined') return;

        // Muzzle position in world coords (ground plane) with a small forward offset
        const muzzleOffset = this.size * 0.6;
        const px = this.pos.x + muzzleOffset * Math.cos(this.angle);
        const py = this.pos.y + muzzleOffset * Math.sin(this.angle);

        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.TURRET : {};
        const muzzleAltitude = this.altitude || (this.yOffset || 0);

        const proj = new Projectile(
            px,
            py,
            this.angle,
            this,
            config.PROJECTILE_SPEED || DEFAULT_WEAPON_CONFIG.TURRET_SPEED,      // Speed
            config.PROJECTILE_DAMAGE || 5,      // Damage
            [255, 50, 50],    // Color (Red) - Array for consistency
            'enemy_projectile',
            null,
            config.PROJECTILE_LIFESPAN || 120   // Lifespan
        );

        if (starSystem.projectiles) {
            starSystem.projectiles.push(proj);
            // Use ownerType and isSurface to help filtering
            proj.ownerType = 'turret';
            proj.isSurface = true;

            // Projectile altitude for collision and rendering purposes
            // This is the logical altitude: Turret Base Altitude + Turret Head Height
            proj.altitude = muzzleAltitude;
            proj.startAltitude = muzzleAltitude;
            proj.targetAltitude = player.altitude || 0;

            if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player && player.pos) {
                // SoundManager handles visual projection internally based on altitude
                soundManager.playWorldSound('laser', px, py, player.pos, this, muzzleAltitude);
            }
            // Visual muzzle flash - calculate visual position via Explosion class
            if (starSystem.addExplosion) {
                starSystem.addExplosion(px, py, 5, [255, 100, 50], true, true, muzzleAltitude);
            }
        }
    }

    onDestroy() {
        // Create large surface explosion using centralized API
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2, [255, 100, 50]);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = millis(); // Flash effect trigger
        console.log(`Turret [${this.id}] took ${amount} damage, health now: ${this.health}/${this.maxHealth}`);
        if (this.health <= 0 && !this.destroyed) {
            this.destroyed = true;

            // Create explosion using centralized surface API
            if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
                const alt = this.altitude || (this.yOffset || 0);
                surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, alt, this.size * 2);
            }

            if (typeof surfaceMode !== 'undefined' && this.cellKey) {
                surfaceMode.registerDestruction(this.cellKey);
            }
            this.onDestroy();
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        const sz = this.size;

        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, visualX, visualY;
        if (typeof getProjectionHelpers === 'function') {
            const helpers = getProjectionHelpers(worldX, worldY, alt);
            extrusionAngle = helpers.extrusionAngle;
            visualX = helpers.baseX;
            visualY = helpers.baseY;
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            visualX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            visualY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }

        const baseH = sz * 0.2;
        const headH = sz * 0.6;

        // Damage flash effect - use utility function
        const damageFlash = (typeof shouldShowDamageFlash === 'function')
            ? shouldShowDamageFlash(this.lastHitTime)
            : (this.lastHitTime && millis() - this.lastHitTime < 150);

        // Health-based color tinting (damaged turrets look redder)
        const healthRatio = this.health / this.maxHealth;
        const damageColor = damageFlash ? color(255, 255, 255) :
            lerpColor(color(255, 50, 50), color(60), healthRatio);

        // --- BASE ---
        // Calculate Base Roof Pos relative to groundVisualY
        const baseDvX = baseH * Math.sin(extrusionAngle);
        const baseDvY = baseH * Math.cos(extrusionAngle);
        const baseRx = visualX - baseDvX;
        const baseRy = visualY - baseDvY;

        Draw3D.drawCylinder(baseRx, baseRy, sz / 2, baseH, lodLevel === 2 ? 8 : 12, damageFlash ? color(255) : color(60), extrusionAngle, sunAngle);

        // --- HEAD ---
        // Head sits on Base Roof
        const headDvX = headH * Math.sin(extrusionAngle);
        const headDvY = headH * Math.cos(extrusionAngle);
        const headRx = baseRx - headDvX; // Stack on top of base roof
        const headRy = baseRy - headDvY; // Stack on top of base roof

        if (lodLevel === 3) {
            // Detailed Extruded Shape
            const headW = sz * 0.8;
            const headL = sz * 0.8;
            const hw = headW / 2;
            const hl = headL / 2;

            // Local corners (centered)
            const local = [
                { x: -hw, y: -hl },
                { x: hw, y: -hl },
                { x: hw, y: hl },
                { x: -hw, y: hl }
            ];

            const c = Math.cos(this.angle);
            const s = Math.sin(this.angle);

            const corners = [];
            for (let p of local) {
                const rx = (p.x * c - p.y * s) + headRx;
                const ry = (p.x * s + p.y * c) + headRy;
                corners.push({ x: rx, y: ry });
            }

            Draw3D.drawExtrudedShape(corners, headH, damageFlash ? color(255) : damageColor, extrusionAngle, sunAngle);
        } else {
            // Simplified Box Head for LOD 2
            // Just draw a rotated box at the center position
            push();
            translate(headRx + headDvX * 0.5, headRy + headDvY * 0.5); // move to center of head volume
            rotate(this.angle);
            Draw3D.drawBox3D(0, 0, sz * 0.8, sz * 0.8, headH, damageFlash ? color(255) : damageColor, extrusionAngle, sunAngle);
            pop();
        }

        // -- DUAL BARRELS --
        const barrelLen = sz * 0.8;
        const barrelW = sz * 0.15;
        const barrelGap = sz * 0.2;

        const drawBarrel = (offset) => {
            push();
            translate(headRx, headRy); // pivot at head top face? No, existing code logic seems to pivot there.
            // Actually existing code translated to headRx, headRy

            rotate(this.angle);

            const compAngle = extrusionAngle - this.angle;

            // Barrels sit relative to the rotated head
            const lx = (sz * 0.4) + barrelLen / 2; // offset from center hw (0.4*sz)
            const ly = offset;

            const ldvX = 10 * Math.sin(compAngle);
            const ldvY = 10 * Math.cos(compAngle);

            const lrx = lx - ldvX;
            const lry = ly - ldvY;

            const barrelCol = color(40);
            Draw3D.drawBox3D(lrx, lry, barrelLen, barrelW, 10, barrelCol, compAngle, sunAngle);
            pop();
        };

        if (lodLevel === 3) {
            drawBarrel(barrelGap);
            drawBarrel(-barrelGap);
        } else {
            // Single combined barrel block for LOD 2
            push();
            translate(headRx, headRy);
            rotate(this.angle);
            const compAngle = extrusionAngle - this.angle;
            const lx = (sz * 0.4) + barrelLen / 2;
            const ldvX = 10 * Math.sin(compAngle);
            const ldvY = 10 * Math.cos(compAngle);
            Draw3D.drawBox3D(lx - ldvX, 0 - ldvY, barrelLen, barrelW * 2.5, 10, color(40), compAngle, sunAngle);
            pop();
        }

        // --- Health Bar ---
        // Show health bar for player bases (always visible) or damaged non-player bases
        const shouldShowHealthBar = (this.isPlayerBase || this.health < this.maxHealth) && this.maxHealth > 0;
        if (shouldShowHealthBar) {
            push();
            rectMode(CORNER);
            let healthPercent = this.health / this.maxHealth;
            let barW = sz * 0.9;
            let barH = 5;
            let barX = visualX - barW / 2;
            // Anchor the bar to the ground visual Y so it follows terrain height correctly
            let barY = visualY + 15;

            noStroke();
            // Use different color for full health vs damaged
            if (healthPercent >= 1.0) {
                // Full health - show green bar
                fill(40, 40, 40, 180);  // Dark background
                rect(barX, barY, barW, barH);
                fill(80, 200, 80);  // Green for full health
                rect(barX, barY, barW * healthPercent, barH);
            } else {
                // Damaged - show red/yellow bar
                fill(HEALTH_BAR_COLORS.BG);
                rect(barX, barY, barW, barH);
                fill(HEALTH_BAR_COLORS.FILL);
                rect(barX, barY, barW * healthPercent, barH);
            }
            pop();
        }
    }
}

class SurfaceStation extends SurfaceObject {
    constructor(x, y, size, customColor = null) {
        super(x, y, size || 100); // Default to smaller size provided by generator
        this.health = 5000;
        this.maxHealth = 5000;
        if (customColor) {
            this.color = customColor;
        } else {
            this.color = color(80, 80, 90);
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }
        const now = millis();

        // Derive component colors from base color for consistency
        const headColor = lerpColor(this.color, color(220), 0.3);

        // --- Ground Base ---
        const baseH = 36;
        const baseDvX = baseH * Math.sin(extrusionAngle);
        const baseDvY = baseH * Math.cos(extrusionAngle);
        const baseTopX = baseX - baseDvX;
        const baseTopY = baseY - baseDvY;
        const baseRadius = 110;
        Draw3D.drawCylinder(baseTopX, baseTopY, baseRadius, baseH, lodLevel === 2 ? 8 : 12, lerpColor(this.color, color(30), 0.1), extrusionAngle, sunAngle);

        // Attach four rectangular hangars/platforms at ground level around the base
        const padW = 60;
        const padL = 140;
        const padH = 18;
        const padDist = baseRadius - padL * 0.35; // place pads near edge of base

        // Always draw pads, they're big structure. Maybe skip lights at LOD 2.
        for (let i = 0; i < 4; i++) {
            const a = i * Math.PI / 2 + Math.PI / 4;
            const padWorldX = worldX + Math.cos(a) * padDist;
            const padWorldY = worldY + Math.sin(a) * padDist;

            // Get ground visual coordinates for this pad position
            const padVisual = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? { x: surfaceMode._toVisualX(padWorldX, alt), y: surfaceMode._toVisualY(padWorldY, alt) }
                : { x: padWorldX - alt * Math.sin(extrusionAngle), y: padWorldY - alt * Math.cos(extrusionAngle) };

            // To rest ON ground, TOP must be shifted up by padH
            const padTopX = padVisual.x - (padH * Math.sin(extrusionAngle));
            const padTopY = padVisual.y - (padH * Math.cos(extrusionAngle));

            Draw3D.drawBox3D(padTopX, padTopY, padW, padL, padH, color(70, 75, 80), extrusionAngle, sunAngle);

            // LOD 3 only: Small approach lights on outer edge of each pad
            if (lodLevel === 3 && (now % 2000) < 1000) {
                fill(255, 180, 60); noStroke();
                ellipse(padTopX + Math.cos(a) * padL * 0.45, padTopY + Math.sin(a) * padL * 0.45, 6, 3);
            }
        }

        // --- Central Core Tower (rises from base) ---
        const coreH = 140;
        const coreDvX = coreH * Math.sin(extrusionAngle);
        const coreDvY = coreH * Math.cos(extrusionAngle);
        const coreTopX = baseTopX - coreDvX;
        const coreTopY = baseTopY - coreDvY;
        Draw3D.drawCylinder(coreTopX, coreTopY, 60, coreH, lodLevel === 2 ? 6 : 8, this.color, extrusionAngle, sunAngle);

        // --- Command Center (Head) ---
        const headH = 40;
        const headDvX = headH * Math.sin(extrusionAngle);
        const headDvY = headH * Math.cos(extrusionAngle);
        const headTopX = coreTopX - headDvX;
        const headTopY = coreTopY - headDvY;
        Draw3D.drawCylinder(headTopX, headTopY, 90, headH, lodLevel === 2 ? 8 : 16, headColor, extrusionAngle, sunAngle);

        // --- Radar Dish (on head roof) ---
        const radarBaseX = headTopX;
        const radarBaseY = headTopY;

        push();
        translate(radarBaseX, radarBaseY);

        if (lodLevel === 3) {
            // Rotating Detailed Radar
            const sweep = now * 0.0007; // slower rotation speed

            // Central mast
            Draw3D.drawCylinder(0, 0, 4, 20, 8, lerpColor(this.color, color(40), 0.15), extrusionAngle, sunAngle);

            // Rotating panels (3 panels evenly spaced)
            for (let i = 0; i < 3; i++) {
                push();
                rotate(sweep + i * (Math.PI * 2 / 3));
                // Offset out from mast
                translate(0, -32);
                // Tilt panel slightly toward viewer for readability
                rotate(-Math.PI / 6);
                Draw3D.drawBox3D(0, 0, 10, 48, 6, color(120, 140, 160), extrusionAngle, sunAngle);
                // Small support strut to mast
                Draw3D.drawRod(0, 6, 0, 32, 3, color(90), extrusionAngle, sunAngle, false);
                pop();
            }

            // Beacon light at mast top
            const mastH = 20;
            const mastDvX = mastH * Math.sin(extrusionAngle);
            const mastDvY = mastH * Math.cos(extrusionAngle);
            noStroke(); fill(255, 200, 80);
            ellipse(-mastDvX, -mastDvY, 6, 4);
        } else {
            // LOD 2: Simple Static Dome
            Draw3D.drawDome(0, 0, 30, 6, color(120, 140, 160), extrusionAngle, sunAngle, true);
        }
        pop();
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode._createSurfaceExplosion) {
            // Use unified explosion creation
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, 0, 80, [100, 100, 120]);
        }
    }
}

/**
 * Shield Generator - Main mission target
 * The red dot on radar, destroying this is the objective
 */
class ShieldGenerator extends SurfaceObject {
    constructor(x, y) {
        super(x, y, 100); // Increased size for better air visibility
        this.health = 500;
        this.maxHealth = 500;
        this.lastHitTime = 0;
        this.isTarget = true; // Marks this as the mission objective
        this.pulsePhase = 0;
    }

    update(dt, player, starSystem) {
        if (this.destroyed) return;
        this.pulsePhase += dt * 3; // Pulsing animation
    }

    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = millis();
        console.log(`Shield Generator took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
        if (this.health <= 0 && !this.destroyed) {
            this.destroyed = true;

            // Destruction handled by onDestroy in this class
            if (typeof surfaceMode !== 'undefined' && this.cellKey) {
                surfaceMode.registerDestruction(this.cellKey);
            }
            this.onDestroy();
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            // Big explosions for the generator using centralized API
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 3, [100, 200, 255]);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2, [255, 255, 255]);
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        const sz = this.size;
        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, baseX, baseY;
        if (typeof getProjectionHelpers === 'function') {
            ({ extrusionAngle, baseX, baseY } = getProjectionHelpers(worldX, worldY, alt));
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            baseX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            baseY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }

        // Damage flash - use utility function
        const damageFlash = (typeof shouldShowDamageFlash === 'function')
            ? shouldShowDamageFlash(this.lastHitTime)
            : (this.lastHitTime && millis() - this.lastHitTime < 150);
        const flashColor = damageFlash ? color(255, 255, 255) : null;

        // Health-based color tint
        const healthRatio = this.health / this.maxHealth;
        const baseColor = lerpColor(color(255, 50, 50), color(80, 100, 120), healthRatio);

        // Base platform
        const baseH = sz * 0.3;
        const baseDvX = baseH * Math.sin(extrusionAngle);
        const baseDvY = baseH * Math.cos(extrusionAngle);
        const baseTopX = baseX - baseDvX;
        const baseTopY = baseY - baseDvY;
        Draw3D.drawCylinder(baseTopX, baseTopY, sz * 0.8, baseH, lodLevel === 2 ? 6 : 8, flashColor || color(60, 70, 80), extrusionAngle, sunAngle);

        // Central pillar
        const pillarH = sz * 0.6;
        const pillarDvX = pillarH * Math.sin(extrusionAngle);
        const pillarDvY = pillarH * Math.cos(extrusionAngle);
        const pillarTopX = baseTopX - pillarDvX;
        const pillarTopY = baseTopY - pillarDvY;
        Draw3D.drawCylinder(pillarTopX, pillarTopY, sz * 0.25, pillarH, lodLevel === 2 ? 4 : 6, flashColor || color(40, 50, 60), extrusionAngle, sunAngle);

        // Energy dome (pulsing)
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
        const domeR = sz * 0.4 * pulseScale;
        const domeColor = flashColor || lerpColor(color(50, 150, 255, 180), color(100, 200, 255, 220), (Math.sin(this.pulsePhase) + 1) / 2);

        // Position dome so it sits flat on top of the pillar/prism beneath.
        const domeAngle = extrusionAngle + Math.PI;
        const domeX = pillarTopX;
        const domeY = pillarTopY;

        // Draw a short pedestal/ring below the dome so the dome sits on it
        if (lodLevel === 3) {
            const pedestalRadius = domeR * 1.2;
            const pedestalHeight = domeR * 0.15;
            const pedestalDvX = pedestalHeight * Math.sin(extrusionAngle);
            const pedestalDvY = pedestalHeight * Math.cos(extrusionAngle);
            const pedestalTopX = domeX - pedestalDvX;
            const pedestalTopY = domeY - pedestalDvY;
            const pedestalColor = lerpColor(baseColor, color(30, 30, 40), 0.6);
            Draw3D.drawCylinder(domeX, domeY, pedestalRadius, pedestalHeight, 12, pedestalColor, extrusionAngle, sunAngle);
            Draw3D.drawDome(pedestalTopX, pedestalTopY, domeR, 8, domeColor, domeAngle, sunAngle);
        } else {
            // Simplified dome direct on pillar, less polys
            Draw3D.drawDome(domeX, domeY, domeR, 6, domeColor, domeAngle, sunAngle);
        }        // --- Health Bar ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            push();
            rectMode(CORNER);
            let healthPercent = this.health / this.maxHealth;
            let barW = sz * 0.9;
            let barH = 6;
            let barX = baseX - barW / 2;
            let barY = baseY + 15;

            noStroke();
            fill(HEALTH_BAR_COLORS.BG);
            rect(barX, barY, barW, barH);
            fill(HEALTH_BAR_COLORS.FILL);
            rect(barX, barY, barW * healthPercent, barH);
            pop();
        }
    }
}

/**
 * Surface Pirate Ship - Flying hostile ship on planet surface
 * Patrols the surface and attacks the player
 */
class DefenseDrone extends SurfaceObject {
    constructor(x, y) {
        super(x, y, 35);
        this.type = "Defense Drone"; // Explicit type name for UI
        // Use config if available, otherwise fallback to defaults
        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.DRONE : {};

        this.health = config.HEALTH || 150;
        this.maxHealth = config.HEALTH || 150;
        this.lastHitTime = 0;
        this.isSurface = true; // Mark as surface entity for sound filtering

        // Flying altitude - pirates fly at this height above terrain
        this.flyingHeight = config.FLYING_HEIGHT || 80; // Units above ground
        this.altitude = 0; // Absolute altitude (terrain + flyingHeight), updated each frame

        // Movement
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0;
        this.maxSpeed = config.MAX_SPEED || 150;
        this.acceleration = config.ACCELERATION || 200;
        this.turnRate = config.TURN_RATE || 2.5;

        // Combat
        this.range = config.DETECTION_RANGE || 600;
        this.rangeSq = this.range * this.range;
        this.cooldown = 0;
        this.fireRate = config.FIRE_RATE || 1.5; // seconds between shots

        // AI state
        this.patrolTarget = createVector(x + Math.random() * 1000 - 500, y + Math.random() * 1000 - 500);
        this.chasePlayer = false;
        this.currentTarget = null; // Current attack target (player, base, or robot)

        // Visual
        this.color = color(180, 50, 50); // Pirate red

        // Terrain height caching (performance optimization)
        this._cachedTerrainHeight = null;
        this._cachedTerrainPos = null;
        this._terrainCacheDistance = 50; // Re-sample if moved more than 50 units
        this._terrainInterpolationSpeed = 5.0; // Units per second for smooth height transitions
    }

    /**
     * Clears any cached terrain data so altitude will be recalculated.
     * Call this from any reset/destroy logic when reusing this instance.
     */
    clearTerrainCache() {
        this._cachedTerrainHeight = null;
        this._cachedTerrainPos = null;
    }

    update(dt, player, starSystem) {
        if (this.destroyed) return;
        if (!player) return;

        this.cooldown -= dt;

        // Check if drag effect is active
        const dragActive = this.dragEffect && millis() < this.dragEffect.endTime;
        const dragMultiplier = dragActive ? this.dragEffect.dragMultiplier : 1.0;
        const rotationBlock = dragActive ? this.dragEffect.rotationBlockMultiplier : 1.0;

        // Check if player is in range
        const dx = player.pos.x - this.pos.x;
        const dy = player.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;

        // Cloak detection: cloaked players cannot be detected
        const playerCloaked = player.isCloaked || false;

        // Simple stealth detection: player detected if at or above drone altitude (and not cloaked)
        // This makes stealth visually intuitive: stay below enemies to hide
        const droneAltitude = this.altitude || (this.yOffset || 0);
        const playerAltitude = player.altitude || 0;


        const isDetected = !playerCloaked && distSq < this.rangeSq && playerAltitude >= droneAltitude;

        // Multi-target selection: player, bases, and robots
        this.currentTarget = null;
        let targetPos = null;
        let minDistSq = Infinity;

        if (isDetected) {
            // Player has highest priority when detected
            this.chasePlayer = true;
            this.currentTarget = player;
            targetPos = player.pos;
            minDistSq = distSq;
        } else {
            // Player not detected - check for alternative targets (bases and robots)
            this.chasePlayer = false;

            // Check for player bases (OffworldBuilding variant 1)
            if (typeof surfaceMode !== 'undefined' && surfaceMode.surfaceObjects) {
                for (const obj of surfaceMode.surfaceObjects) {
                    if (!obj || obj.destroyed) continue;

                    // Check if it's a player base (Hab Unit)
                    const isPlayerBase = (
                        (obj.constructor && obj.constructor.name === 'OffworldBuilding') &&
                        obj.variant === 1 &&
                        obj.isPlayerBase === true
                    );

                    if (!isPlayerBase) continue;

                    // Check distance
                    const baseDx = obj.pos.x - this.pos.x;
                    const baseDy = obj.pos.y - this.pos.y;
                    const baseDistSq = baseDx * baseDx + baseDy * baseDy;

                    if (baseDistSq >= this.rangeSq) continue;

                    // Check altitude (base must be at or above drone altitude)
                    const baseAltitude = obj.altitude || obj.yOffset || 0;
                    if (baseAltitude < droneAltitude) continue;

                    // Found valid target - check if closest
                    if (baseDistSq < minDistSq) {
                        minDistSq = baseDistSq;
                        this.currentTarget = obj;
                        targetPos = obj.pos;
                    }
                }
            }

            // Check for mining robots
            if (typeof surfaceMode !== 'undefined' && surfaceMode.miningRobots) {
                for (const robot of surfaceMode.miningRobots) {
                    if (!robot || robot.destroyed) continue;

                    // Check distance
                    const robotDx = robot.pos.x - this.pos.x;
                    const robotDy = robot.pos.y - this.pos.y;
                    const robotDistSq = robotDx * robotDx + robotDy * robotDy;

                    if (robotDistSq >= this.rangeSq) continue;

                    // Check altitude (robot must be at or above drone altitude)
                    const robotAltitude = robot.altitude || robot.yOffset || 0;
                    if (robotAltitude < droneAltitude) continue;

                    // Found valid target - check if closest
                    if (robotDistSq < minDistSq) {
                        minDistSq = robotDistSq;
                        this.currentTarget = robot;
                        targetPos = robot.pos;
                    }
                }
            }
        }

        // If we have a target (player, base, or robot), engage it
        if (this.currentTarget && targetPos) {
            // Aim at target's VISUAL position (to match visual collision detection)
            let droneVisualX = this.pos.x;
            let droneVisualY = this.pos.y;
            let targetVisualX = targetPos.x;
            let targetVisualY = targetPos.y;

            if (typeof surfaceMode !== 'undefined') {
                const droneAlt = this.altitude || (this.yOffset || 0);
                const targetAlt = this.currentTarget.altitude || this.currentTarget.yOffset || 0;

                // Use the centralized projection methods
                if (surfaceMode._toVisualX && surfaceMode._toVisualY) {
                    droneVisualX = surfaceMode._toVisualX(this.pos.x, droneAlt);
                    droneVisualY = surfaceMode._toVisualY(this.pos.y, droneAlt);
                    targetVisualX = surfaceMode._toVisualX(targetPos.x, targetAlt);
                    targetVisualY = surfaceMode._toVisualY(targetPos.y, targetAlt);
                } else {
                    // Fallback manual projection
                    const extrusionAngle = (typeof getExtrusionAngle === 'function') ? getExtrusionAngle() : 0.5;
                    droneVisualX = this.pos.x - (droneAlt * Math.sin(extrusionAngle));
                    droneVisualY = this.pos.y - (droneAlt * Math.cos(extrusionAngle));
                    targetVisualX = targetPos.x - (targetAlt * Math.sin(extrusionAngle));
                    targetVisualY = targetPos.y - (targetAlt * Math.cos(extrusionAngle));
                }
            }

            const visualDX = targetVisualX - droneVisualX;
            const visualDY = targetVisualY - droneVisualY;
            const targetAngle = Math.atan2(visualDY, visualDX);

            // Use utility function for smooth rotation
            const turnSpeed = this.turnRate * rotationBlock;
            if (typeof smoothRotateTowards === 'function') {
                this.angle = smoothRotateTowards(this.angle, targetAngle, turnSpeed, dt);
            } else {
                // Fallback to manual implementation
                let angleDiff = targetAngle - this.angle;
                const TWO_PI = Math.PI * 2;
                while (angleDiff < -Math.PI) angleDiff += TWO_PI;
                while (angleDiff > Math.PI) angleDiff -= TWO_PI;

                const maxTurn = turnSpeed * dt;
                if (Math.abs(angleDiff) < maxTurn) {
                    this.angle = targetAngle;
                } else {
                    this.angle += Math.sign(angleDiff) * maxTurn;
                }
            }

            // Accelerate towards target
            this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);

            // Fire at target if ready and close enough
            if (this.cooldown <= 0 && minDistSq < this.rangeSq) {
                this.fire(starSystem, this.currentTarget);
                this.cooldown = this.fireRate;
            }
        } else {

            // Patrol behavior - move to patrol target
            const pdx = this.patrolTarget.x - this.pos.x;
            const pdy = this.patrolTarget.y - this.pos.y;
            const pdistSq = pdx * pdx + pdy * pdy;

            if (pdistSq < 2500) { // 50^2
                // Reached patrol point, pick new one
                this.patrolTarget.set(
                    this.pos.x + Math.random() * 2000 - 1000,
                    this.pos.y + Math.random() * 2000 - 1000
                );
            } else {
                // Move towards patrol target
                const targetAngle = Math.atan2(pdy, pdx);

                // Use utility function for smooth rotation
                const turnSpeed = this.turnRate * 0.5 * rotationBlock;
                if (typeof smoothRotateTowards === 'function') {
                    this.angle = smoothRotateTowards(this.angle, targetAngle, turnSpeed, dt);
                } else {
                    // Fallback to manual implementation with inline angle normalization
                    let angleDiff = targetAngle - this.angle;
                    // Normalize angleDiff to the range [-PI, PI] to ensure shortest rotation direction
                    const TWO_PI = Math.PI * 2;
                    while (angleDiff < -Math.PI) angleDiff += TWO_PI;
                    while (angleDiff > Math.PI) angleDiff -= TWO_PI;

                    const maxTurn = turnSpeed * dt;
                    if (Math.abs(angleDiff) < maxTurn) {
                        this.angle = targetAngle;
                    } else {
                        this.angle += Math.sign(angleDiff) * maxTurn;
                    }
                }

                // Slower speed during patrol
                this.speed = Math.min(this.maxSpeed * 0.5, this.speed + this.acceleration * 0.5 * dt);
            }
        }

        // Apply movement
        this.pos.x += Math.cos(this.angle) * this.speed * dt;
        this.pos.y += Math.sin(this.angle) * this.speed * dt;

        // Update yOffset and altitude based on terrain (with caching and smooth interpolation)
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.terrain) {
            // Check if we need to update cached terrain height
            let needsUpdate = !this._cachedTerrainPos;
            if (this._cachedTerrainPos) {
                const dx = this.pos.x - this._cachedTerrainPos.x;
                const dy = this.pos.y - this._cachedTerrainPos.y;
                const distSq = dx * dx + dy * dy;
                needsUpdate = distSq > (this._terrainCacheDistance * this._terrainCacheDistance);
            }

            if (needsUpdate) {
                const terrainHeight = surfaceMode.terrain.getHeightAt(this.pos.x, this.pos.y);
                if (terrainHeight !== null && terrainHeight !== undefined && !isNaN(terrainHeight)) {
                    // Smooth interpolation to prevent jerky movement
                    if (this._cachedTerrainHeight !== null) {
                        const heightDiff = terrainHeight - this._cachedTerrainHeight;
                        const maxChange = this._terrainInterpolationSpeed * dt;
                        if (Math.abs(heightDiff) > maxChange) {
                            // Interpolate gradually
                            this._cachedTerrainHeight += Math.sign(heightDiff) * maxChange;
                        } else {
                            // Close enough, use exact value
                            this._cachedTerrainHeight = terrainHeight;
                        }
                    } else {
                        // First time, set directly
                        this._cachedTerrainHeight = terrainHeight;
                    }
                    this._cachedTerrainPos = { x: this.pos.x, y: this.pos.y };
                }
            }

            // Use cached value
            if (this._cachedTerrainHeight !== null) {
                this.altitude = this._cachedTerrainHeight + this.flyingHeight;
                // yOffset represents terrain height only (for Draw3D ground positioning)
                // altitude is the full height above sea level for collision/aiming
                this.yOffset = this._cachedTerrainHeight;
            }
        }

        // Apply drag (enhanced by tangle effect)
        // Optimize: Math.pow is expensive, use exponential decay formula
        // For dt = 0.016 (60 fps), pow(0.95, dt*60) ≈ 0.95
        // For general case, use exponential decay: e^(ln(0.95) * dt * 60)
        // Which simplifies to: speed *= exp(k * dt) where k = 60 * ln(0.95)
        const dragConstant = 60 * Math.log(0.95) * dragMultiplier; // More precise: -3.0776835 per multiplier
        this.speed *= Math.exp(dragConstant * dt);
    }

    fire(starSystem, target) {
        if (typeof Projectile === 'undefined') return;
        if (!starSystem || !starSystem.projectiles) return;
        if (!target) return;

        // World base position (logical center)
        const muzzleX = this.pos.x + Math.cos(this.angle) * (this.size * 0.5);
        const muzzleY = this.pos.y + Math.sin(this.angle) * (this.size * 0.5);

        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.DRONE : {};

        const proj = new Projectile(
            muzzleX,
            muzzleY,
            this.angle,
            this,
            config.PROJECTILE_SPEED || DEFAULT_WEAPON_CONFIG.DRONE_SPEED,    // Speed
            config.PROJECTILE_DAMAGE || 8,    // Damage
            [255, 100, 50],   // Color (Orange)
            'enemy_projectile',
            null,
            120               // Lifespan
        );

        starSystem.projectiles.push(proj);

        // Mark as surface projectile with proper altitude
        proj.isSurface = true;
        proj.ownerType = 'pirate';
        proj.altitude = this.altitude; // Pirate's flying altitude (Absolute)

        // Set target altitude for terrain-aware trajectory
        // Projectile will descend/ascend toward target's altitude
        proj.startAltitude = this.altitude;
        proj.targetAltitude = target.altitude || target.yOffset || 0;

        // Play laser sound with proper visual world positioning via SoundManager
        if (typeof soundManager !== 'undefined' && typeof surfaceMode !== 'undefined' && surfaceMode.player && surfaceMode.player.pos) {
            soundManager.playWorldSound('laser', muzzleX, muzzleY, surfaceMode.player.pos, this, proj.altitude);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = millis();
        console.log(`Defense Drone took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
        if (this.health <= 0 && !this.destroyed) {
            this.destroyed = true;

            // Destruction handled by onDestroy in this class
            if (typeof surfaceMode !== 'undefined' && this.cellKey) {
                surfaceMode.registerDestruction(this.cellKey);
            }
            this.onDestroy();
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && typeof surfaceMode._createSurfaceExplosion === 'function') {
            const objAlt = this.altitude || (this.yOffset || 0);
            surfaceMode._createSurfaceExplosion(this.pos.x, this.pos.y, objAlt, this.size * 2, [255, 150, 50]);
        }
    }

    draw(worldX, worldY, sunAngle = -Math.PI / 4, alt = 0, lodLevel = 3) {
        if (this.destroyed) return;

        // Use projection helpers when available; fall back to manual calculation in test/Node contexts
        let extrusionAngle, visualX, visualY;
        if (typeof getProjectionHelpers === 'function') {
            const helpers = getProjectionHelpers(worldX, worldY, alt);
            extrusionAngle = helpers.extrusionAngle;
            visualX = helpers.baseX;
            visualY = helpers.baseY;
        } else {
            // Fallback: replicate original projection logic
            extrusionAngle = (typeof surfaceMode !== 'undefined' && surfaceMode._getExtrusionAngle)
                ? surfaceMode._getExtrusionAngle()
                : ((typeof SURFACE_RENDER_CONSTANTS !== 'undefined' && SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE !== undefined)
                    ? SURFACE_RENDER_CONSTANTS.EXTRUSION_ANGLE : 0.5);
            visualX = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualX)
                ? surfaceMode._toVisualX(worldX, alt) : worldX - alt * Math.sin(extrusionAngle);
            visualY = (typeof surfaceMode !== 'undefined' && surfaceMode._toVisualY)
                ? surfaceMode._toVisualY(worldY, alt) : worldY - alt * Math.cos(extrusionAngle);
        }

        // Damage flash effect
        const damageFlash = (typeof shouldShowDamageFlash === 'function')
            ? shouldShowDamageFlash(this.lastHitTime)
            : (this.lastHitTime && millis() - this.lastHitTime < 150);
        const flashColor = damageFlash ? color(255, 255, 255) : null;

        // Health-based color
        const healthRatio = this.health / this.maxHealth;
        const shipColor = flashColor || lerpColor(color(255, 50, 50), this.color, healthRatio);

        const sz = this.size;
        const bodyH = sz * 0.45;

        // Compute hull vertices in world coordinates relative to projected visual center.
        let localVerts;

        if (lodLevel === 3) {
            // Detailed 5-point hull
            localVerts = [
                { x: sz * 0.4, y: 0 },
                { x: -sz * 0.55, y: -sz * 0.25 },
                { x: -sz * 0.2, y: -sz * 0.05 },
                { x: -sz * 0.2, y: sz * 0.05 },
                { x: -sz * 0.55, y: sz * 0.25 }
            ];
        } else {
            // Simplified 3-point triangle hull for LOD 2
            localVerts = [
                { x: sz * 0.4, y: 0 },
                { x: -sz * 0.5, y: -sz * 0.25 },
                { x: -sz * 0.5, y: sz * 0.25 }
            ];
        }

        const c = Math.cos(this.angle);
        const s = Math.sin(this.angle);

        const worldVerts = localVerts.map(p => ({
            x: visualX + (p.x * c - p.y * s), // Draw at visual (projected) center
            y: visualY + (p.x * s + p.y * c)
        }));

        // Ensure consistent winding for the top face
        let area = 0;
        const lenW = worldVerts.length;
        for (let i = 0; i < lenW; i++) {
            const a = worldVerts[i];
            const b = worldVerts[(i + 1) % lenW];
            area += (a.x * b.y - b.x * a.y);
        }
        if (area < 0) worldVerts.reverse();

        // Draw extruded drone body
        Draw3D.drawExtrudedShape(worldVerts, bodyH, shipColor, extrusionAngle, sunAngle);

        // Engine glow - Only at LOD 3
        if (lodLevel === 3 && this.speed > 10) {
            const glowAlpha = map(this.speed, 0, this.maxSpeed, 50, 200);
            const rearLocal = { x: -sz * 0.45, y: 0 };
            const rearVisualX = visualX + (rearLocal.x * c - rearLocal.y * s);
            const rearVisualY = visualY + (rearLocal.x * s + rearLocal.y * c);
            fill(255, 150, 0, glowAlpha);
            noStroke();
            ellipse(rearVisualX, rearVisualY, sz * 0.22, sz * 0.14);
        }

        // --- Health Bar ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            push();
            rectMode(CORNER);
            let healthPercent = this.health / this.maxHealth;
            let barW = sz * 0.9;
            let barH = 4;
            let barX = visualX - barW / 2;
            let barY = visualY + sz * 0.3 + 5;

            noStroke();
            fill(HEALTH_BAR_COLORS.BG);
            rect(barX, barY, barW, barH);
            fill(HEALTH_BAR_COLORS.FILL);
            rect(barX, barY, barW * healthPercent, barH);
            pop();
        }
    }
}

if (typeof module !== 'undefined') {
    module.exports = {
        SurfaceObject,
        SecretCache,
        Building,
        ImperialBuilding,
        SeparatistBuilding,
        MilitaryBuilding,
        PostHumanBuilding,
        OffworldBuilding,
        MiningBuilding,
        IndustrialBuilding,
        RefineryBuilding,
        AgriculturalBuilding,
        ServiceBuilding,
        Turret,
        SurfaceStation,
        ShieldGenerator,
        DefenseDrone
    };
    global.Turret = Turret;
}
