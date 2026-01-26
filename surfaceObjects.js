class SurfaceObject {
    constructor(x, y, size) {
        this.pos = createVector(x, y);
        this.size = size || 50;
        this.health = 100;
        this.maxHealth = 100;
        this.destroyed = false;
        this.color = color(150, 150, 150);
        this.yOffset = 0;
    }

    // Aliases for HUD compatibility
    get hull() { return this.health; }
    get maxHull() { return this.maxHealth; }

    update(dt, player) {
    }

    // Draw using Draw3D primitives
    // x, y: Screen coordinates
    // sunAngle: Lighting angle
    draw(x, y, sunAngle) {
        // Base implementation
    }

    checkCollision(projectile) {
        return false;
    }

    takeDamage(amount) {
        this.health -= amount;
        if (this.health <= 0) {
            this.destroyed = true;
            this.onDestroy();
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
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const sz = this.size;
        const extrusionAngle = 0.5;

        // Box base
        const boxH = sz * 0.6;
        const boxDvX = boxH * Math.sin(extrusionAngle);
        const boxDvY = boxH * Math.cos(extrusionAngle);
        const boxX = x - boxDvX;
        const boxY = y - boxDvY;

        Draw3D.drawBox3D(boxX, boxY, sz, sz * 0.8, boxH, this.color, extrusionAngle, sunAngle);

        // Cross on top - vertical beam
        const crossH = sz * 0.5;
        const crossW = sz * 0.12;
        const crossDvX = crossH * Math.sin(extrusionAngle);
        const crossDvY = crossH * Math.cos(extrusionAngle);
        const crossBaseX = boxX - crossDvX;
        const crossBaseY = boxY - crossDvY;

        Draw3D.drawBox3D(crossBaseX, crossBaseY, crossW, crossW, crossH, this.crossColor, extrusionAngle, sunAngle);

        // Cross horizontal beam
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
        // Create explosion
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            const visualY = this.pos.y - (this.yOffset || 0);
            surfaceMode.starSystem.addExplosion(this.pos.x, visualY, this.size * 1.5, [180, 160, 100], true);
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

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.1;
        const dvX = this.height * Math.sin(extrusionAngle);
        const dvY = this.height * Math.cos(extrusionAngle);
        const rx = x - dvX;
        const ry = y - dvY;

        // Base Structure
        Draw3D.drawBox3D(rx, ry, this.size, this.size, this.height, this.color, extrusionAngle, sunAngle);

        // Neon Details (Windows/Pipes)
        if (this.type === 'skyscraper') {
            const neonColor = color(0, 200, 255, 150);
            for (let i = 0.2; i < 0.9; i += 0.2) {
                const wh = this.height * i;
                const wrx = x - (wh * Math.sin(extrusionAngle));
                const wry = y - (wh * Math.cos(extrusionAngle));
                Draw3D.drawBox3D(wrx, wry, this.size * 1.05, this.size * 0.1, 5, neonColor, extrusionAngle, sunAngle);
            }
        }

        // Tiered levels for non-silos
        if (this.type === 'skyscraper' || this.type === 'factory') {
            const tierH = this.height * 0.4;
            const trx = rx - (tierH * Math.sin(extrusionAngle));
            const try_ = ry - (tierH * Math.cos(extrusionAngle));
            Draw3D.drawBox3D(trx, try_, this.size * 0.6, this.size * 0.6, tierH, lerpColor(this.color, color(255), 0.1), extrusionAngle, sunAngle);

            // Antennas on top tier (start from tier roof)
            const antH = 30;
            const arx = trx - (tierH * Math.sin(extrusionAngle));
            const ary = try_ - (tierH * Math.cos(extrusionAngle));
            Draw3D.drawCylinder(arx, ary, 2, antH, 6, color(200), extrusionAngle, sunAngle);
        }

        if (this.type === 'silo') {
            Draw3D.drawCylinder(rx, ry, this.size / 2, this.height, 12, this.color, extrusionAngle, sunAngle);
            // Red warning light
            const lightH = 10;
            const lrx = rx - (lightH * Math.sin(extrusionAngle));
            const lry = ry - (lightH * Math.cos(extrusionAngle));
            Draw3D.drawDome(lrx, lry, 10, 4, color(255, 0, 0), extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        // Create large surface explosion
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y, this.size * 1.5, [255, 150, 50], true);
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
        this.variant = Math.floor((Math.sin(seed * 7.89) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (2 + (Math.sin(seed) * 0.5 + 0.5) * 3);
        this.maxHealth = 300;
        this.health = 300;

        // Imperial colors: gold, white, purple
        this.primaryColor = color(200, 170, 80);  // Gold
        this.accentColor = color(160, 80, 220);    // purple
        this.stoneColor = color(220, 215, 200);   // White marble
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // OBELISK - Tall tapered column with gold cap
            const baseH = this.height * 0.8;
            const capH = this.height * 0.2;
            const baseDv = baseH * Math.cos(extrusionAngle);

            // Main marble column
            Draw3D.drawBox3D(x, y - baseDv, sz * 0.4, sz * 0.4, baseH, this.stoneColor, extrusionAngle, sunAngle);
            // Gold pyramid cap
            const capY = y - baseDv - capH * Math.cos(extrusionAngle);
            Draw3D.drawCone(x, capY, sz * 0.35, capH, 4, this.primaryColor, extrusionAngle, sunAngle);
            // Crimson banner
            Draw3D.drawBox3D(x, y - baseDv * 0.5, sz * 0.5, sz * 0.05, baseH * 0.3, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // PALACE - Wide base with central dome
            const baseH = this.height * 0.4;
            const domeR = sz * 0.5;
            const baseDv = baseH * Math.cos(extrusionAngle);

            // Wide marble base
            Draw3D.drawBox3D(x, y - baseDv, sz * 1.2, sz * 0.8, baseH, this.stoneColor, extrusionAngle, sunAngle);
            // Central gold dome
            const domeY = y - baseDv - domeR * 0.6;
            Draw3D.drawDome(x, domeY, domeR, 8, this.primaryColor, extrusionAngle, sunAngle);
            // Corner columns
            for (let i = -1; i <= 1; i += 2) {
                Draw3D.drawCylinder(x + i * sz * 0.5, y - baseDv + sz * 0.3, sz * 0.08, baseH * 0.8, 8, this.stoneColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 2) {
            // SPIRE - Tall tower with red glow
            const spireH = this.height;
            const spireDv = spireH * Math.cos(extrusionAngle);

            // Main spire cone
            Draw3D.drawCone(x, y - spireDv, sz * 0.3, spireH, 6, this.stoneColor, extrusionAngle, sunAngle);
            // Gold ring midway
            Draw3D.drawCylinder(x, y - spireDv * 0.5, sz * 0.35, sz * 0.1, 8, this.primaryColor, extrusionAngle, sunAngle);
            // purple light at tip
            Draw3D.drawDome(x, y - spireDv - sz * 0.1, sz * 0.1, 6, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // TRIUMPHAL ARCH - Grand archway
            const archH = this.height * 0.7;
            const archDv = archH * Math.cos(extrusionAngle);

            // Left pillar
            Draw3D.drawBox3D(x - sz * 0.4, y - archDv, sz * 0.3, sz * 0.3, archH, this.stoneColor, extrusionAngle, sunAngle);
            // Right pillar
            Draw3D.drawBox3D(x + sz * 0.4, y - archDv, sz * 0.3, sz * 0.3, archH, this.stoneColor, extrusionAngle, sunAngle);
            // Top beam
            Draw3D.drawBox3D(x, y - archDv - sz * 0.15, sz * 1.1, sz * 0.35, sz * 0.2, this.primaryColor, extrusionAngle, sunAngle);
            // Eagle decoration
            Draw3D.drawCone(x, y - archDv - sz * 0.4, sz * 0.15, sz * 0.25, 4, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // SENATE HALL - Long columned building
            const hallH = this.height * 0.5;
            const hallDv = hallH * Math.cos(extrusionAngle);

            // Main hall body
            Draw3D.drawBox3D(x, y - hallDv, sz * 1.5, sz * 0.6, hallH, this.stoneColor, extrusionAngle, sunAngle);
            // Row of columns
            for (let i = -2; i <= 2; i++) {
                Draw3D.drawCylinder(x + i * sz * 0.3, y - hallDv + sz * 0.35, sz * 0.06, hallH * 0.9, 8, this.stoneColor, extrusionAngle, sunAngle);
            }
            // Triangular pediment
            Draw3D.drawCone(x, y - hallDv - sz * 0.2, sz * 0.7, sz * 0.3, 3, this.primaryColor, extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 2, [200, 170, 80], true);
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
        this.variant = Math.floor((Math.sin(seed * 5.67) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (0.8 + (Math.sin(seed) * 0.5 + 0.5) * 1.5);
        this.maxHealth = 250;
        this.health = 250;

        // Separatist colors: rust, brown, orange
        this.primaryColor = color(120, 80, 50);   // Rust brown
        this.accentColor = color(180, 100, 40);   // Orange
        this.metalColor = color(90, 85, 80);      // Scrap metal
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // BUNKER - Low, fortified
            const baseH = this.height * 0.5;
            const baseDv = baseH * Math.cos(extrusionAngle);

            // Main bunker structure
            Draw3D.drawBox3D(x, y - baseDv, sz * 1.3, sz * 0.9, baseH, this.metalColor, extrusionAngle, sunAngle);
            // Firing slits
            Draw3D.drawBox3D(x + sz * 0.3, y - baseDv * 0.5, sz * 0.4, sz * 0.1, baseH * 0.4, this.primaryColor, extrusionAngle, sunAngle);
            Draw3D.drawBox3D(x - sz * 0.3, y - baseDv * 0.5, sz * 0.4, sz * 0.1, baseH * 0.4, this.primaryColor, extrusionAngle, sunAngle);
            // Periscope slit
            Draw3D.drawBox3D(x, y - baseDv - sz * 0.1, sz * 0.6, sz * 0.08, sz * 0.1, color(20), extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // WATCHTOWER - Tall scrap tower
            const towerH = this.height;
            const towerDv = towerH * Math.cos(extrusionAngle);
            const legW = sz * 0.15;

            // Four support legs
            for (let i = -1; i <= 1; i += 2) {
                for (let j = -1; j <= 1; j += 2) {
                    Draw3D.drawBox3D(x + i * sz * 0.25, y + j * sz * 0.25 - towerDv * 0.5, legW, legW, towerH * 0.8, this.metalColor, extrusionAngle, sunAngle);
                }
            }
            // Observation platform
            Draw3D.drawBox3D(x, y - towerDv, sz * 0.8, sz * 0.8, sz * 0.15, this.primaryColor, extrusionAngle, sunAngle);
            // Searchlight
            Draw3D.drawCylinder(x, y - towerDv - sz * 0.2, sz * 0.1, sz * 0.15, 6, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 2) {
            // BARRICADE - Wall with spikes
            const wallH = this.height * 0.6;
            const wallDv = wallH * Math.cos(extrusionAngle);

            // Main wall
            Draw3D.drawBox3D(x, y - wallDv, sz * 1.5, sz * 0.3, wallH, this.primaryColor, extrusionAngle, sunAngle);
            // Defensive spikes
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawCone(x + i * sz * 0.4, y - wallDv - sz * 0.2, sz * 0.08, sz * 0.4, 4, this.metalColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // SCRAP SHELTER - Makeshift curved roof
            const shelterH = this.height * 0.5;
            const shelterDv = shelterH * Math.cos(extrusionAngle);

            // Left wall
            Draw3D.drawBox3D(x - sz * 0.4, y - shelterDv, sz * 0.15, sz * 0.6, shelterH, this.metalColor, extrusionAngle, sunAngle);
            // Right wall
            Draw3D.drawBox3D(x + sz * 0.4, y - shelterDv, sz * 0.15, sz * 0.6, shelterH, this.metalColor, extrusionAngle, sunAngle);
            // Corrugated roof
            Draw3D.drawBox3D(x, y - shelterDv - sz * 0.15, sz * 1.0, sz * 0.7, sz * 0.1, this.primaryColor, extrusionAngle, sunAngle);
            // Tarp patch
            Draw3D.drawBox3D(x + sz * 0.2, y - shelterDv - sz * 0.2, sz * 0.3, sz * 0.3, sz * 0.02, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // FUEL DEPOT - Drums and tanks
            const depotH = this.height * 0.4;
            const depotDv = depotH * Math.cos(extrusionAngle);

            // Fuel drums
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawCylinder(x + i * sz * 0.35, y - depotDv, sz * 0.18, depotH, 8, this.primaryColor, extrusionAngle, sunAngle);
            }
            // Warning stripe
            Draw3D.drawBox3D(x, y - depotDv * 0.5, sz * 1.2, sz * 0.08, sz * 0.05, this.accentColor, extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 1.8, [180, 100, 40], true);
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
        this.variant = Math.floor((Math.sin(seed * 3.14) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (1.5 + (Math.sin(seed) * 0.5 + 0.5) * 1);
        this.maxHealth = 400;
        this.health = 400;

        // Military colors: olive, gray, black
        this.primaryColor = color(70, 80, 60);    // Olive drab
        this.accentColor = color(50, 50, 50);     // Dark gray
        this.metalColor = color(100, 100, 105);   // Steel
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // HANGAR - Large arched structure
            const hangarH = this.height * 0.7;
            const hangarDv = hangarH * Math.cos(extrusionAngle);

            // Main hangar body
            Draw3D.drawBox3D(x, y - hangarDv, sz * 1.8, sz * 1.2, hangarH, this.primaryColor, extrusionAngle, sunAngle);
            // Arched roof section
            Draw3D.drawDome(x, y - hangarDv - sz * 0.1, sz * 0.8, 6, this.accentColor, extrusionAngle, sunAngle);
            // Door markings
            Draw3D.drawBox3D(x, y - hangarDv * 0.4, sz * 0.8, sz * 0.05, hangarH * 0.5, color(180, 180, 40), extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // BARRACKS - Modular blocks
            const blockH = this.height * 0.4;
            const blockDv = blockH * Math.cos(extrusionAngle);

            // Multiple barracks blocks
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawBox3D(x + i * sz * 0.5, y - blockDv, sz * 0.45, sz * 0.7, blockH, this.primaryColor, extrusionAngle, sunAngle);
            }
            // Command antenna
            Draw3D.drawCylinder(x, y - blockDv - sz * 0.3, sz * 0.05, sz * 0.5, 6, this.metalColor, extrusionAngle, sunAngle);

        } else if (this.variant === 2) {
            // RADAR ARRAY - Dish on tower
            const towerH = this.height * 0.6;
            const towerDv = towerH * Math.cos(extrusionAngle);

            // Support tower
            Draw3D.drawBox3D(x, y - towerDv, sz * 0.4, sz * 0.4, towerH, this.accentColor, extrusionAngle, sunAngle);
            // Rotating dish (inverted dome)
            Draw3D.drawDome(x, y - towerDv - sz * 0.2, sz * 0.6, 8, this.metalColor, extrusionAngle, sunAngle, true);
            // Central receiver
            Draw3D.drawCylinder(x, y - towerDv - sz * 0.4, sz * 0.08, sz * 0.3, 6, color(255, 50, 50), extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // BUNKER - Reinforced underground entrance
            const bunkerH = this.height * 0.4;
            const bunkerDv = bunkerH * Math.cos(extrusionAngle);

            // Heavy sloped entrance
            Draw3D.drawBox3D(x, y - bunkerDv, sz * 1.2, sz * 0.8, bunkerH, this.primaryColor, extrusionAngle, sunAngle);
            // Blast door
            Draw3D.drawBox3D(x, y - bunkerDv * 0.5, sz * 0.5, sz * 0.6, bunkerH * 0.7, this.metalColor, extrusionAngle, sunAngle);
            // Left perimeter wall
            Draw3D.drawBox3D(x - sz * 0.8, y - bunkerDv * 0.3, sz * 0.1, sz * 0.6, bunkerH * 0.5, this.accentColor, extrusionAngle, sunAngle);
            // Right perimeter wall
            Draw3D.drawBox3D(x + sz * 0.8, y - bunkerDv * 0.3, sz * 0.1, sz * 0.6, bunkerH * 0.5, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // TANK DEPOT - Vehicle storage
            const depotH = this.height * 0.5;
            const depotDv = depotH * Math.cos(extrusionAngle);

            // Main depot building
            Draw3D.drawBox3D(x, y - depotDv, sz * 1.5, sz * 1.0, depotH, this.primaryColor, extrusionAngle, sunAngle);
            // Left fuel tank
            Draw3D.drawCylinder(x - sz * 0.5, y - depotDv * 0.5, sz * 0.15, depotH * 0.6, 8, this.accentColor, extrusionAngle, sunAngle);
            // Right fuel tank
            Draw3D.drawCylinder(x + sz * 0.5, y - depotDv * 0.5, sz * 0.15, depotH * 0.6, 8, this.accentColor, extrusionAngle, sunAngle);
            // Ramp
            Draw3D.drawBox3D(x, y - depotDv * 0.2 + sz * 0.4, sz * 0.6, sz * 0.8, depotH * 0.2, this.metalColor, extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 2, [100, 150, 80], true);
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
        this.variant = Math.floor((Math.sin(seed * 9.99) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (2 + (Math.sin(seed) * 0.5 + 0.5) * 2);
        this.maxHealth = 500;
        this.health = 500;
        this.pulsePhase = seed; // For animations

        // PostHuman colors: cyan, magenta, purple
        this.primaryColor = color(0, 200, 220);   // Cyan
        this.accentColor = color(180, 50, 200);   // Magenta
        this.darkColor = color(30, 20, 50);       // Dark purple
    }

    update(dt, player) {
        this.pulsePhase += dt * 2;
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;
        const pulse = (Math.sin(this.pulsePhase) * 0.5 + 0.5);

        if (this.variant === 0) {
            // MONOLITH - Perfect black rectangle with glowing edges
            const monolithH = this.height;
            const monolithDv = monolithH * Math.cos(extrusionAngle);

            // Main dark slab
            Draw3D.drawBox3D(x, y - monolithDv, sz * 0.4, sz * 0.15, monolithH, this.darkColor, extrusionAngle, sunAngle);
            // Glowing edge lines
            const glowColor = lerpColor(this.primaryColor, this.accentColor, pulse);
            Draw3D.drawBox3D(x, y - monolithDv, sz * 0.42, sz * 0.02, monolithH, glowColor, extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // FLOATING CUBE - Rotated cube with energy field
            const cubeH = this.height * 0.5;
            const cubeDv = cubeH * Math.cos(extrusionAngle);

            // Main rotating cube
            push();
            translate(x, y - cubeDv);
            rotate(this.pulsePhase * 0.1);
            Draw3D.drawBox3D(0, 0, sz * 0.6, sz * 0.6, cubeH, this.darkColor, extrusionAngle, sunAngle);
            pop();
            // Energy ring below
            const ringColor = lerpColor(this.primaryColor, color(255), pulse * 0.3);
            Draw3D.drawCylinder(x, y, sz * 0.5, sz * 0.05, 12, ringColor, extrusionAngle, sunAngle);

        } else if (this.variant === 2) {
            // CRYSTAL SPIRE - Angular crystalline tower
            const spireH = this.height;
            const spireDv = spireH * Math.cos(extrusionAngle);

            // Main crystal shard
            Draw3D.drawCone(x, y - spireDv, sz * 0.25, spireH, 5, this.primaryColor, extrusionAngle, sunAngle);
            // Secondary crystal
            Draw3D.drawCone(x + sz * 0.15, y - spireDv * 0.7, sz * 0.15, spireH * 0.6, 5, this.accentColor, extrusionAngle, sunAngle);
            // Tertiary crystal
            Draw3D.drawCone(x - sz * 0.12, y - spireDv * 0.8, sz * 0.12, spireH * 0.5, 5, this.primaryColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // DATA OBELISK - Hexagonal pylon with data streams
            const pylonH = this.height * 0.8;
            const pylonDv = pylonH * Math.cos(extrusionAngle);

            // Main hexagonal pylon
            Draw3D.drawCylinder(x, y - pylonDv, sz * 0.3, pylonH, 6, this.darkColor, extrusionAngle, sunAngle);
            // Animated data rings
            for (let i = 0; i < 3; i++) {
                const ringY = y - pylonDv * (0.3 + i * 0.25);
                const ringPulse = (Math.sin(this.pulsePhase + i * 2) * 0.5 + 0.5);
                Draw3D.drawCylinder(x, ringY, sz * 0.35, sz * 0.03, 6, lerpColor(this.primaryColor, this.accentColor, ringPulse), extrusionAngle, sunAngle);
            }

        } else {
            // SINGULARITY WELL - Concentric rings descending
            const wellH = this.height * 0.4;
            const wellDv = wellH * Math.cos(extrusionAngle);

            // Outer containment ring
            Draw3D.drawCylinder(x, y - wellDv, sz * 0.7, wellH, 12, this.darkColor, extrusionAngle, sunAngle);
            // Inner event horizon (inverted dome)
            const holeColor = lerpColor(this.accentColor, color(0), pulse * 0.5);
            Draw3D.drawDome(x, y - wellDv - sz * 0.1, sz * 0.4, 8, holeColor, extrusionAngle, sunAngle, true);
            // Central energy beam
            Draw3D.drawCylinder(x, y - wellDv - sz * 0.3, sz * 0.05, sz * 0.4, 4, this.primaryColor, extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 2.5, [0, 200, 220], true);
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 1.5, [180, 50, 200], true);
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
        this.variant = Math.floor((Math.sin(seed * 4.56) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (1 + (Math.sin(seed) * 0.5 + 0.5) * 1.5);
        this.maxHealth = 200;
        this.health = 200;

        // Offworld colors: silver, blue, white
        this.primaryColor = color(180, 180, 190);  // Silver
        this.accentColor = color(100, 150, 200);   // Blue
        this.glassColor = color(200, 220, 255, 180); // Translucent
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // BIODOME - Large geodesic dome
            const domeR = sz * 0.7;

            // Base ring
            Draw3D.drawCylinder(x, y, domeR * 1.1, sz * 0.15, 12, this.primaryColor, extrusionAngle, sunAngle);
            // Main glass dome
            Draw3D.drawDome(x, y - sz * 0.1, domeR, 10, this.glassColor, extrusionAngle, sunAngle);
            // Airlock entrance
            Draw3D.drawBox3D(x + sz * 0.6, y, sz * 0.25, sz * 0.3, sz * 0.4, this.primaryColor, extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // HAB UNIT - Modular cylinder pods
            const podH = this.height * 0.4;
            const podDv = podH * Math.cos(extrusionAngle);

            // Main hab cylinder
            Draw3D.drawCylinder(x, y - podDv, sz * 0.4, podH, 10, this.primaryColor, extrusionAngle, sunAngle);
            // Connected side pod
            Draw3D.drawCylinder(x + sz * 0.5, y - podDv * 0.5, sz * 0.25, podH * 0.6, 10, this.primaryColor, extrusionAngle, sunAngle);
            // Blue window ring
            Draw3D.drawCylinder(x, y - podDv - sz * 0.1, sz * 0.42, sz * 0.08, 10, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 2) {
            // LANDING PAD - Flat platform with lights
            const padH = sz * 0.1;
            const padDv = padH * Math.cos(extrusionAngle);

            // Main platform
            Draw3D.drawCylinder(x, y - padDv, sz * 0.9, padH, 8, this.primaryColor, extrusionAngle, sunAngle);
            // Landing circle markings
            Draw3D.drawCylinder(x, y - padDv - sz * 0.02, sz * 0.5, sz * 0.02, 12, this.accentColor, extrusionAngle, sunAngle);
            // Corner lights
            for (let i = 0; i < 4; i++) {
                const ang = i * Math.PI / 2;
                Draw3D.drawCylinder(x + Math.cos(ang) * sz * 0.7, y + Math.sin(ang) * sz * 0.7 - padDv, sz * 0.05, sz * 0.3, 6, color(255, 200, 50), extrusionAngle, sunAngle);
            }

        } else if (this.variant === 3) {
            // COMMS ARRAY - Satellite dishes
            const baseH = sz * 0.3;
            const baseDv = baseH * Math.cos(extrusionAngle);

            // Base building
            Draw3D.drawBox3D(x, y - baseDv, sz * 0.8, sz * 0.6, baseH, this.primaryColor, extrusionAngle, sunAngle);
            // Small dish
            Draw3D.drawDome(x - sz * 0.25, y - baseDv - sz * 0.1, sz * 0.25, 8, this.accentColor, extrusionAngle, sunAngle, true);
            // Large dish
            Draw3D.drawDome(x + sz * 0.25, y - baseDv - sz * 0.15, sz * 0.3, 8, this.accentColor, extrusionAngle, sunAngle, true);

        } else {
            // SOLAR FARM - Array of solar panels
            const panelH = sz * 0.1;
            const panelDv = panelH * Math.cos(extrusionAngle);

            // Support structure
            Draw3D.drawBox3D(x, y - panelDv, sz * 1.2, sz * 0.8, panelH, this.primaryColor, extrusionAngle, sunAngle);
            // Solar panels (blue glass)
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawBox3D(x + i * sz * 0.35, y - panelDv - sz * 0.08, sz * 0.3, sz * 0.5, sz * 0.02, this.accentColor, extrusionAngle, sunAngle);
            }
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 1.8, [180, 180, 220], true);
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
        this.variant = Math.floor((Math.sin(seed * 6.28) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (1.5 + (Math.sin(seed) * 0.5 + 0.5) * 2);
        this.maxHealth = 350;
        this.health = 350;

        // Mining colors: yellow, orange, brown
        this.primaryColor = color(180, 150, 50);   // Yellow machinery
        this.accentColor = color(200, 100, 30);    // Orange
        this.structureColor = color(100, 80, 60);  // Brown
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // DRILL RIG - Tall drilling tower
            const towerH = this.height;
            const towerDv = towerH * Math.cos(extrusionAngle);
            const legW = sz * 0.1;

            // Lattice tower legs
            for (let i = -1; i <= 1; i += 2) {
                for (let j = -1; j <= 1; j += 2) {
                    Draw3D.drawBox3D(x + i * sz * 0.2, y + j * sz * 0.2 - towerDv * 0.5, legW, legW, towerH, this.structureColor, extrusionAngle, sunAngle);
                }
            }
            // Drill head (inverted cone)
            Draw3D.drawCone(x, y, sz * 0.2, sz * 0.4, 6, this.primaryColor, extrusionAngle + Math.PI, sunAngle);
            // Top platform
            Draw3D.drawBox3D(x, y - towerDv, sz * 0.6, sz * 0.6, sz * 0.1, this.primaryColor, extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // ORE SILO - Large cylindrical storage
            const siloH = this.height * 0.8;
            const siloDv = siloH * Math.cos(extrusionAngle);

            // Main silo cylinder
            Draw3D.drawCylinder(x, y - siloDv, sz * 0.5, siloH, 12, this.structureColor, extrusionAngle, sunAngle);
            // Conical top
            Draw3D.drawCone(x, y - siloDv - sz * 0.2, sz * 0.55, sz * 0.4, 12, this.accentColor, extrusionAngle, sunAngle);
            // Warning stripes
            Draw3D.drawCylinder(x, y - siloDv * 0.5, sz * 0.52, sz * 0.1, 12, this.primaryColor, extrusionAngle, sunAngle);

        } else if (this.variant === 2) {
            // CONVEYOR - Angled transport belt
            const convH = this.height * 0.5;
            const convDv = convH * Math.cos(extrusionAngle);

            // Lower support column
            Draw3D.drawBox3D(x - sz * 0.3, y - convDv * 0.3, sz * 0.15, sz * 0.15, convH * 0.5, this.structureColor, extrusionAngle, sunAngle);
            // Upper support column
            Draw3D.drawBox3D(x + sz * 0.3, y - convDv, sz * 0.15, sz * 0.15, convH, this.structureColor, extrusionAngle, sunAngle);
            // Conveyor belt
            Draw3D.drawBox3D(x, y - convDv * 0.6, sz * 0.9, sz * 0.25, sz * 0.08, this.primaryColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // EXCAVATOR - Crane with bucket
            const baseH = sz * 0.3;
            const baseDv = baseH * Math.cos(extrusionAngle);

            // Base platform
            Draw3D.drawBox3D(x, y - baseDv, sz * 0.8, sz * 0.6, baseH, this.structureColor, extrusionAngle, sunAngle);
            // Crane arm
            Draw3D.drawBox3D(x + sz * 0.3, y - baseDv - sz * 0.3, sz * 0.15, sz * 0.8, sz * 0.12, this.primaryColor, extrusionAngle, sunAngle);
            // Bucket
            Draw3D.drawBox3D(x + sz * 0.6, y - baseDv - sz * 0.15, sz * 0.25, sz * 0.2, sz * 0.2, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // CRUSHER - Ore processing
            const crushH = this.height * 0.5;
            const crushDv = crushH * Math.cos(extrusionAngle);

            // Main hopper
            Draw3D.drawBox3D(x, y - crushDv, sz * 0.8, sz * 0.6, crushH, this.structureColor, extrusionAngle, sunAngle);
            // Input chute
            Draw3D.drawCone(x, y - crushDv - sz * 0.2, sz * 0.35, sz * 0.3, 4, this.primaryColor, extrusionAngle, sunAngle);
            // Left output pipe
            Draw3D.drawCylinder(x - sz * 0.5, y - crushDv * 0.3, sz * 0.1, sz * 0.4, 8, this.accentColor, extrusionAngle, sunAngle);
            // Right output pipe
            Draw3D.drawCylinder(x + sz * 0.5, y - crushDv * 0.3, sz * 0.1, sz * 0.4, 8, this.accentColor, extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 2, [200, 150, 50], true);
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
        this.variant = Math.floor((Math.sin(seed * 2.71) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (1.2 + (Math.sin(seed) * 0.5 + 0.5) * 1.8);
        this.maxHealth = 400;
        this.health = 400;

        // Industrial colors: dark gray, red, black
        this.primaryColor = color(80, 75, 70);     // Dark gray
        this.accentColor = color(150, 40, 30);     // Red
        this.metalColor = color(60, 60, 65);       // Black metal
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // FACTORY - Large building with smokestack
            const factH = this.height * 0.5;
            const factDv = factH * Math.cos(extrusionAngle);

            // Main factory building
            Draw3D.drawBox3D(x, y - factDv, sz * 1.4, sz * 0.8, factH, this.primaryColor, extrusionAngle, sunAngle);
            // Tall smokestack
            const stackH = this.height * 0.8;
            Draw3D.drawCylinder(x + sz * 0.4, y - stackH * Math.cos(extrusionAngle), sz * 0.15, stackH, 8, this.metalColor, extrusionAngle, sunAngle);
            // Red warning tip
            Draw3D.drawCylinder(x + sz * 0.4, y - stackH * Math.cos(extrusionAngle) - sz * 0.1, sz * 0.17, sz * 0.1, 8, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // STORAGE TANKS - Cylindrical tanks
            const tankH = this.height * 0.6;
            const tankDv = tankH * Math.cos(extrusionAngle);

            // Left storage tank
            Draw3D.drawCylinder(x - sz * 0.25, y - tankDv, sz * 0.35, tankH, 10, this.primaryColor, extrusionAngle, sunAngle);
            // Right storage tank
            Draw3D.drawCylinder(x + sz * 0.25, y - tankDv, sz * 0.35, tankH, 10, this.primaryColor, extrusionAngle, sunAngle);
            // Connecting pipe
            Draw3D.drawCylinder(x, y - tankDv * 0.5, sz * 0.08, sz * 0.5, 6, this.metalColor, extrusionAngle + Math.PI / 2, sunAngle);

        } else if (this.variant === 2) {
            // PIPE NETWORK - Complex pipe junction
            const pipeH = this.height * 0.4;
            const pipeDv = pipeH * Math.cos(extrusionAngle);

            // Left vertical pipe
            Draw3D.drawCylinder(x - sz * 0.2, y - pipeDv, sz * 0.1, pipeH, 8, this.metalColor, extrusionAngle, sunAngle);
            // Right vertical pipe
            Draw3D.drawCylinder(x + sz * 0.2, y - pipeDv, sz * 0.1, pipeH, 8, this.metalColor, extrusionAngle, sunAngle);
            // Junction box
            Draw3D.drawBox3D(x, y - pipeDv * 0.6, sz * 0.5, sz * 0.3, sz * 0.25, this.primaryColor, extrusionAngle, sunAngle);
            // Valve wheel
            Draw3D.drawCylinder(x, y - pipeDv * 0.6 - sz * 0.15, sz * 0.12, sz * 0.05, 8, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // ASSEMBLY HALL - Long modular building
            const hallH = this.height * 0.4;
            const hallDv = hallH * Math.cos(extrusionAngle);

            // Main hall structure
            Draw3D.drawBox3D(x, y - hallDv, sz * 1.6, sz * 0.6, hallH, this.primaryColor, extrusionAngle, sunAngle);
            // Modular roof sections
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawBox3D(x + i * sz * 0.45, y - hallDv - sz * 0.05, sz * 0.3, sz * 0.5, sz * 0.08, this.metalColor, extrusionAngle, sunAngle);
            }
            // Loading dock
            Draw3D.drawBox3D(x + sz * 0.7, y - hallDv * 0.3, sz * 0.3, sz * 0.4, hallH * 0.5, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // POWER PLANT - Cooling towers
            const towerH = this.height * 0.7;
            const towerDv = towerH * Math.cos(extrusionAngle);

            // Main building
            Draw3D.drawBox3D(x, y - towerDv * 0.3, sz * 0.8, sz * 0.6, towerH * 0.4, this.primaryColor, extrusionAngle, sunAngle);
            // Left cooling tower
            Draw3D.drawCylinder(x - sz * 0.4, y - towerDv, sz * 0.3, towerH, 8, this.metalColor, extrusionAngle, sunAngle);
            // Right cooling tower
            Draw3D.drawCylinder(x + sz * 0.4, y - towerDv, sz * 0.3, towerH, 8, this.metalColor, extrusionAngle, sunAngle);
            // Steam vents
            Draw3D.drawCylinder(x - sz * 0.4, y - towerDv - sz * 0.1, sz * 0.35, sz * 0.08, 8, color(200, 200, 200, 150), extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 2, [150, 80, 50], true);
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
        this.variant = Math.floor((Math.sin(seed * 1.41) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (2 + (Math.sin(seed) * 0.5 + 0.5) * 2);
        this.maxHealth = 300;
        this.health = 300;

        // Refinery colors: chrome, orange, yellow
        this.primaryColor = color(160, 160, 170);  // Chrome
        this.accentColor = color(220, 120, 30);    // Orange
        this.pipeColor = color(140, 140, 145);     // Lighter chrome
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // DISTILLATION TOWER - Tall segmented column
            const towerH = this.height;
            const towerDv = towerH * Math.cos(extrusionAngle);

            // Main column
            Draw3D.drawCylinder(x, y - towerDv, sz * 0.3, towerH, 10, this.primaryColor, extrusionAngle, sunAngle);
            // Segment rings
            for (let i = 0.2; i < 0.9; i += 0.2) {
                Draw3D.drawCylinder(x, y - towerDv * i, sz * 0.35, sz * 0.08, 10, this.accentColor, extrusionAngle, sunAngle);
            }

        } else if (this.variant === 1) {
            // SPHERICAL TANK - Large spherical storage
            const tankR = sz * 0.5;

            // Support legs
            for (let i = 0; i < 4; i++) {
                const ang = i * Math.PI / 2 + Math.PI / 4;
                Draw3D.drawCylinder(x + Math.cos(ang) * sz * 0.35, y + Math.sin(ang) * sz * 0.35, sz * 0.06, sz * 0.4, 6, this.pipeColor, extrusionAngle, sunAngle);
            }
            // Upper hemisphere
            Draw3D.drawDome(x, y - sz * 0.4, tankR, 8, this.primaryColor, extrusionAngle, sunAngle);
            // Lower hemisphere (inverted)
            Draw3D.drawDome(x, y - sz * 0.4, tankR * 0.95, 8, this.primaryColor, extrusionAngle, sunAngle, true);

        } else if (this.variant === 2) {
            // CRACKING UNIT - Box with pipes
            const unitH = this.height * 0.5;
            const unitDv = unitH * Math.cos(extrusionAngle);

            // Main processing box
            Draw3D.drawBox3D(x, y - unitDv, sz * 0.8, sz * 0.6, unitH, this.primaryColor, extrusionAngle, sunAngle);
            // Left exhaust stack
            Draw3D.drawCylinder(x - sz * 0.25, y - unitDv - sz * 0.2, sz * 0.08, sz * 0.4, 8, this.pipeColor, extrusionAngle, sunAngle);
            // Right exhaust stack
            Draw3D.drawCylinder(x + sz * 0.25, y - unitDv - sz * 0.2, sz * 0.08, sz * 0.4, 8, this.pipeColor, extrusionAngle, sunAngle);
            // Flame tip
            Draw3D.drawCone(x - sz * 0.25, y - unitDv - sz * 0.6, sz * 0.06, sz * 0.15, 6, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // FLARE STACK - Tall stack with burning flare
            const flareH = this.height * 0.9;
            const flareDv = flareH * Math.cos(extrusionAngle);

            // Base platform
            Draw3D.drawBox3D(x, y - flareDv * 0.1, sz * 0.5, sz * 0.5, sz * 0.15, this.primaryColor, extrusionAngle, sunAngle);
            // Tall stack
            Draw3D.drawCylinder(x, y - flareDv, sz * 0.1, flareH, 8, this.pipeColor, extrusionAngle, sunAngle);
            // Burning flare (orange cone)
            Draw3D.drawCone(x, y - flareDv - sz * 0.2, sz * 0.2, sz * 0.4, 6, this.accentColor, extrusionAngle, sunAngle);

        } else {
            // PUMP STATION - Low building with valves
            const pumpH = this.height * 0.3;
            const pumpDv = pumpH * Math.cos(extrusionAngle);

            // Main building
            Draw3D.drawBox3D(x, y - pumpDv, sz * 1.0, sz * 0.6, pumpH, this.primaryColor, extrusionAngle, sunAngle);
            // Valve wheels
            for (let i = -1; i <= 1; i++) {
                Draw3D.drawCylinder(x + i * sz * 0.3, y - pumpDv - sz * 0.1, sz * 0.12, sz * 0.06, 8, this.accentColor, extrusionAngle, sunAngle);
            }
            // Horizontal pipes
            Draw3D.drawCylinder(x, y - pumpDv * 0.5 + sz * 0.3, sz * 0.12, sz * 0.8, 8, this.pipeColor, extrusionAngle + Math.PI / 2, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 2.5, [220, 150, 50], true);
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
        this.variant = Math.floor((Math.sin(seed * 8.76) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (0.8 + (Math.sin(seed) * 0.5 + 0.5) * 1);
        this.maxHealth = 150;
        this.health = 150;

        // Agricultural colors: green, brown, tan
        this.primaryColor = color(100, 140, 80);   // Green
        this.accentColor = color(120, 90, 60);     // Brown
        this.glassColor = color(180, 220, 180, 150); // Green-tinted glass
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // GREENHOUSE - Arched glass structure
            const baseH = sz * 0.15;
            const baseDv = baseH * Math.cos(extrusionAngle);

            // Foundation
            Draw3D.drawBox3D(x, y - baseDv, sz * 1.2, sz * 0.8, baseH, this.accentColor, extrusionAngle, sunAngle);
            // Glass dome
            Draw3D.drawDome(x, y - baseDv - sz * 0.1, sz * 0.55, 8, this.glassColor, extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // GRAIN SILO - Tall cylindrical storage
            const siloH = this.height;
            const siloDv = siloH * Math.cos(extrusionAngle);

            // Main silo cylinder
            Draw3D.drawCylinder(x, y - siloDv, sz * 0.35, siloH, 10, this.accentColor, extrusionAngle, sunAngle);
            // Domed top
            Draw3D.drawDome(x, y - siloDv - sz * 0.1, sz * 0.38, 8, this.primaryColor, extrusionAngle, sunAngle);

        } else if (this.variant === 2) {
            // WATER TOWER - Elevated tank
            const towerH = this.height * 0.6;
            const towerDv = towerH * Math.cos(extrusionAngle);

            // Support column
            Draw3D.drawCylinder(x, y - towerDv * 0.5, sz * 0.12, towerH * 0.7, 8, this.accentColor, extrusionAngle, sunAngle);
            // Water tank
            Draw3D.drawCylinder(x, y - towerDv, sz * 0.4, sz * 0.35, 10, this.primaryColor, extrusionAngle, sunAngle);
            // Conical roof
            Draw3D.drawCone(x, y - towerDv - sz * 0.2, sz * 0.45, sz * 0.25, 8, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // BARN - Classic agricultural building
            const barnH = this.height * 0.6;
            const barnDv = barnH * Math.cos(extrusionAngle);

            // Main structure
            Draw3D.drawBox3D(x, y - barnDv, sz * 1.0, sz * 0.7, barnH, this.accentColor, extrusionAngle, sunAngle);
            // Peaked roof
            Draw3D.drawCone(x, y - barnDv - sz * 0.15, sz * 0.55, sz * 0.35, 4, this.primaryColor, extrusionAngle, sunAngle);
            // Barn door
            Draw3D.drawBox3D(x, y - barnDv * 0.3, sz * 0.25, sz * 0.02, barnH * 0.6, color(80, 60, 40), extrusionAngle, sunAngle);

        } else {
            // WINDMILL - Power generation
            const millH = this.height * 0.8;
            const millDv = millH * Math.cos(extrusionAngle);

            // Tower
            Draw3D.drawCylinder(x, y - millDv, sz * 0.2, millH, 8, this.accentColor, extrusionAngle, sunAngle);
            // Hub
            Draw3D.drawCylinder(x, y - millDv - sz * 0.15, sz * 0.15, sz * 0.2, 8, this.primaryColor, extrusionAngle, sunAngle);
            // Blades (simplified as box)
            Draw3D.drawBox3D(x, y - millDv - sz * 0.25, sz * 0.08, sz * 0.6, sz * 0.05, color(220, 220, 220), extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 1.5, [100, 180, 80], true);
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
        this.variant = Math.floor((Math.sin(seed * 3.33) * 0.5 + 0.5) * 5); // 5 variants
        this.height = size * (1.5 + (Math.sin(seed) * 0.5 + 0.5) * 1.5);
        this.maxHealth = 180;
        this.health = 180;

        // Service colors: blue, white, yellow
        this.primaryColor = color(80, 120, 180);   // Blue
        this.accentColor = color(220, 220, 230);   // White
        this.lightColor = color(255, 220, 100);    // Yellow
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.15;
        const sz = this.size;

        if (this.variant === 0) {
            // COMM TOWER - Tall antenna spire
            const towerH = this.height;
            const towerDv = towerH * Math.cos(extrusionAngle);

            // Base building
            Draw3D.drawBox3D(x, y - sz * 0.2, sz * 0.5, sz * 0.5, sz * 0.4, this.primaryColor, extrusionAngle, sunAngle);
            // Antenna mast
            Draw3D.drawCylinder(x, y - towerDv, sz * 0.06, towerH * 0.8, 6, this.accentColor, extrusionAngle, sunAngle);
            // Satellite dish
            Draw3D.drawDome(x, y - towerDv * 0.5, sz * 0.25, 6, this.accentColor, extrusionAngle, sunAngle, true);
            // Red warning light
            Draw3D.drawDome(x, y - towerDv - sz * 0.1, sz * 0.08, 6, color(255, 50, 50), extrusionAngle, sunAngle);

        } else if (this.variant === 1) {
            // SHOP/COMMERCIAL - Low building with signs
            const shopH = this.height * 0.4;
            const shopDv = shopH * Math.cos(extrusionAngle);

            // Main building
            Draw3D.drawBox3D(x, y - shopDv, sz * 1.0, sz * 0.7, shopH, this.primaryColor, extrusionAngle, sunAngle);
            // Sign on front
            Draw3D.drawBox3D(x, y - shopDv - sz * 0.05, sz * 0.8, sz * 0.02, sz * 0.2, this.lightColor, extrusionAngle, sunAngle);
            // Awning
            Draw3D.drawBox3D(x, y - shopDv * 0.3, sz * 1.1, sz * 0.25, sz * 0.05, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 2) {
            // PARKING STRUCTURE - Multi-level
            const levelH = sz * 0.25;

            // Parking levels
            for (let i = 0; i < 3; i++) {
                Draw3D.drawBox3D(x, y - levelH * (i + 0.5) * Math.cos(extrusionAngle), sz * 1.2, sz * 0.8, levelH, this.primaryColor, extrusionAngle, sunAngle);
            }
            // Stairwell tower
            Draw3D.drawBox3D(x + sz * 0.5, y - levelH * 1.5, sz * 0.2, sz * 0.3, levelH * 3, this.accentColor, extrusionAngle, sunAngle);

        } else if (this.variant === 3) {
            // HOTEL - Tall residential building
            const hotelH = this.height * 0.8;
            const hotelDv = hotelH * Math.cos(extrusionAngle);

            // Main tower
            Draw3D.drawBox3D(x, y - hotelDv, sz * 0.7, sz * 0.5, hotelH, this.primaryColor, extrusionAngle, sunAngle);
            // Balconies
            for (let i = 0; i < 4; i++) {
                const balY = y - hotelDv * (0.3 + i * 0.2);
                Draw3D.drawBox3D(x + sz * 0.35, balY, sz * 0.15, sz * 0.4, sz * 0.03, this.accentColor, extrusionAngle, sunAngle);
            }
            // Rooftop sign
            Draw3D.drawBox3D(x, y - hotelDv - sz * 0.1, sz * 0.5, sz * 0.05, sz * 0.15, this.lightColor, extrusionAngle, sunAngle);

        } else {
            // MEDICAL CENTER - Low with cross symbol
            const medH = this.height * 0.45;
            const medDv = medH * Math.cos(extrusionAngle);

            // Main building
            Draw3D.drawBox3D(x, y - medDv, sz * 1.2, sz * 0.8, medH, this.accentColor, extrusionAngle, sunAngle);
            // Red cross horizontal
            Draw3D.drawBox3D(x, y - medDv - sz * 0.05, sz * 0.3, sz * 0.1, sz * 0.05, color(200, 50, 50), extrusionAngle, sunAngle);
            // Red cross vertical
            Draw3D.drawBox3D(x, y - medDv - sz * 0.05, sz * 0.1, sz * 0.3, sz * 0.05, color(200, 50, 50), extrusionAngle, sunAngle);
            // Entrance canopy
            Draw3D.drawBox3D(x, y - medDv * 0.2 + sz * 0.3, sz * 0.4, sz * 0.3, sz * 0.1, this.primaryColor, extrusionAngle, sunAngle);
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y - (this.yOffset || 0), this.size * 1.5, [100, 150, 220], true);
        }
    }
}


class Turret extends SurfaceObject {
    constructor(x, y, size) {
        super(x, y, size || 40);

        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.TURRET : {};

        this.range = config.RANGE || 1000;
        this.detectionHeightThreshold = config.DETECTION_HEIGHT_THRESHOLD || 30; // Height above turret's ground level for detection
        this.color = color(120, 120, 120);
        this.angle = 0;
        this.cooldown = 0;
        this.id = Math.floor(Math.random() * 10000);
        this.health = config.HEALTH || 100; // Explicitly set health
        this.maxHealth = config.HEALTH || 100;
        this.lastHitTime = 0; // For damage flash effect
        this.isSurface = true; // Mark as surface entity for sound filtering
    }

    update(dt, player, starSystem) {
        // Stop all activity if destroyed
        if (this.destroyed) return;
        if (!player) return;
        this.cooldown -= dt;

        // Height-based detection for trench run gameplay:
        // - Players can hide in valleys (below turret's line of sight) when hugging terrain
        // - Players are detected when they emerge on high ground or increase altitude
        // - Players flying high (radar alt > 50) are detected even in valleys

        const turretGroundHeight = this.yOffset || 0; // Terrain height at turret position
        const playerAbsoluteAltitude = player.altitude || 0; // Player's absolute altitude (includes terrain)

        // Detection threshold: turret's horizon line based on its ground height
        const turretHorizon = turretGroundHeight + this.detectionHeightThreshold;

        // Check if player is below turret's horizon
        if (playerAbsoluteAltitude < turretHorizon) {
            // Check if player has high radar altitude (flying high even in valley)
            const playerRadarAlt = typeof surfaceMode !== 'undefined' && surfaceMode ? surfaceMode.altitude : 100;
            if (playerRadarAlt <= 50) {
                // Player is hugging terrain (low radar alt) and below horizon - hidden
                return;
            }
            // Player is flying high (radar alt > 50), even if in a valley - continue to detection
        }

        // Calculate turret aiming based on visual positions
        // Surface mode uses an isometric projection with extrusion angle
        const extrusionAngle = 0.5; // Must match Draw3D usage in draw()
        const sz = this.size;
        const totalHeadHeight = (sz * 0.2) + (sz * 0.6); // Base + Head Height

        // Calculate turret visual position (at muzzle/head level)
        const extX = totalHeadHeight * Math.sin(extrusionAngle);
        const extY = totalHeadHeight * Math.cos(extrusionAngle);
        const terrainOffset = this.yOffset || 0;

        const turretVisualX = this.pos.x - extX;
        const turretVisualY = (this.pos.y - terrainOffset) - extY;

        // Player position (drawn at map position without terrain offset)
        const playerVisualX = player.pos.x;
        const playerVisualY = player.pos.y;

        // Calculate aiming angle in visual space
        const dx = playerVisualX - turretVisualX;
        const dy = playerVisualY - turretVisualY;
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < this.range) {
            // Aim towards player's visual position
            const targetAngle = Math.atan2(dy, dx);
            let diff = targetAngle - this.angle;

            // Normalize
            const TWO_PI = Math.PI * 2;
            while (diff < -Math.PI) diff += TWO_PI;
            while (diff > Math.PI) diff -= TWO_PI;

            // Smoother, frame-rate independent rotation
            const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.TURRET : {};
            const turnSpeedVal = config.TURN_SPEED || 5;
            this.angle += diff * turnSpeedVal * dt;

            // Normalize angle
            while (this.angle < -Math.PI) this.angle += TWO_PI;
            while (this.angle > Math.PI) this.angle -= TWO_PI;

            // Fire if ready
            if (this.cooldown <= 0 && starSystem) {
                // Pass the calculated visual muzzle position
                this.fire(starSystem, player, turretVisualX, turretVisualY);
                const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.TURRET : {};
                this.cooldown = config.FIRE_RATE || 2.0;
            }
        }
    }

    fire(starSystem, player, visualX, visualY) {
        if (typeof Projectile === 'undefined') return;

        // Muzzle position in world coords (Visual)
        // If not passed (called from elsewhere?), recalculate
        let muzzleX, muzzleY;

        if (visualX === undefined || visualY === undefined) {
            const extrusionAngle = 0.5;
            const sz = this.size;
            const totalH = (sz * 0.8);
            const extX = totalH * Math.sin(extrusionAngle);
            const extY = totalH * Math.cos(extrusionAngle);
            const terrainOffset = this.yOffset || 0;

            muzzleX = (this.pos.x - extX);
            muzzleY = ((this.pos.y - terrainOffset) - extY);
        } else {
            muzzleX = visualX;
            muzzleY = visualY;
        }

        // Apply rotation to extend from center of head to barrel tip
        const muzzleOffset = 40;
        const px = muzzleX + muzzleOffset * Math.cos(this.angle);
        const py = muzzleY + muzzleOffset * Math.sin(this.angle);

        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.TURRET : {};

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

            // Projectile altitude for collision purposes
            // This is the logical altitude, which is Turret Base Z + Turret Height
            proj.altitude = (this.yOffset || 0) + (this.size * 0.8);

            if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player && player.pos) {
                soundManager.playWorldSound('laser', px, py, player.pos, this);
            }
            // Visual muzzle flash - tag as isSurface
            if (starSystem.addExplosion) {
                starSystem.addExplosion(px, py, 5, [255, 100, 50], true);
            }
        }
    }

    onDestroy() {
        // Create large surface explosion at visual position (pos.y - yOffset matches draw position)
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            const visualY = this.pos.y - (this.yOffset || 0);
            surfaceMode.starSystem.addExplosion(this.pos.x, visualY, this.size * 2, [255, 100, 50], true);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = millis(); // Flash effect trigger
        console.log(`Turret [${this.id}] took ${amount} damage, health now: ${this.health}/${this.maxHealth}`);
        if (this.health <= 0) {
            this.destroyed = true;
            this.onDestroy();
        }
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const sz = this.size;
        // Use larger extrusion angle for more solid 3D appearance
        const extrusionAngle = 0.5;

        const baseH = sz * 0.2;
        const headH = sz * 0.6;

        // Damage flash effect - flash white when recently hit
        let damageFlash = false;
        if (this.lastHitTime && millis() - this.lastHitTime < 150) {
            damageFlash = true;
        }

        // Health-based color tinting (damaged turrets look redder)
        const healthRatio = this.health / this.maxHealth;
        const damageColor = damageFlash ? color(255, 255, 255) :
            lerpColor(color(255, 50, 50), color(60), healthRatio);

        // --- BASE ---
        // Calculate Base Roof Pos
        const baseDvX = baseH * Math.sin(extrusionAngle);
        const baseDvY = baseH * Math.cos(extrusionAngle);
        const baseRx = x - baseDvX;
        const baseRy = y - baseDvY;

        Draw3D.drawCylinder(baseRx, baseRy, sz / 2, baseH, 12, damageFlash ? color(255) : color(60), extrusionAngle, sunAngle);

        // --- HEAD ---
        // Head sits on Base Roof
        // Head Base = Base Roof = (baseRx, baseRy)
        // Head Roof = Head Base - Head Vector
        const headDvX = headH * Math.sin(extrusionAngle);
        const headDvY = headH * Math.cos(extrusionAngle);

        // We need to pass EXTUDED SHAPE vertices for the "Front" (Roof) face.
        // But drawExtrudedShape takes vertices of the Front face.
        // So we calculate corners relative to (0,0) then translate to Head Roof position.

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

        // Head Base Pos = (baseRx, baseRy)
        // Head Roof Pos = (baseRx - headDvX, baseRy - headDvY)
        const headRx = baseRx - headDvX;
        const headRy = baseRy - headDvY;

        const corners = [];
        for (let p of local) {
            const rx = (p.x * c - p.y * s) + headRx;
            const ry = (p.x * s + p.y * c) + headRy;
            corners.push({ x: rx, y: ry });
        }

        Draw3D.drawExtrudedShape(corners, headH, damageFlash ? color(255) : damageColor, extrusionAngle, sunAngle);

        // -- DUAL BARRELS --
        const barrelLen = sz * 0.8;
        const barrelW = sz * 0.15;
        const barrelGap = sz * 0.2;

        const drawBarrel = (offset) => {
            push();
            translate(headRx, headRy);
            rotate(this.angle);

            const compAngle = extrusionAngle - this.angle;

            // Barrels sit relative to the rotated head
            // Local X (Forward) = hw + barrelLen/2
            // Local Y (Side) = offset
            const lx = hw + barrelLen / 2;
            const ly = offset;

            // Compensate for extrusion shift relative to head center? 
            // In original code: brx = bx - bdvX. 
            // Local DV = 10 * sin(compAngle).
            // We apply offset to Local Pos. 

            const ldvX = 10 * Math.sin(compAngle);
            const ldvY = 10 * Math.cos(compAngle);

            const lrx = lx - ldvX;
            const lry = ly - ldvY;

            const barrelCol = color(40);
            Draw3D.drawBox3D(lrx, lry, barrelLen, barrelW, 10, barrelCol, compAngle, sunAngle);
            pop();
        };

        drawBarrel(barrelGap);
        drawBarrel(-barrelGap);

        // --- Health Bar ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            push();
            rectMode(CORNER);
            let healthPercent = this.health / this.maxHealth;
            let barW = sz * 0.9;
            let barH = 5;
            let barX = x - barW / 2;
            let barY = y + 15;

            noStroke();
            fill(HEALTH_BAR_COLORS.BG);
            rect(barX, barY, barW, barH);
            fill(HEALTH_BAR_COLORS.FILL);
            rect(barX, barY, barW * healthPercent, barH);
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

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.1;
        const now = millis();

        // Derive component colors from base color for consistency
        const headColor = lerpColor(this.color, color(220), 0.3);
        const lightColor = lerpColor(this.color, color(255, 255, 200), 0.8);

        // --- Central Core Tower ---
        const coreH = 140;
        const coreDvX = coreH * Math.sin(extrusionAngle);
        const coreDvY = coreH * Math.cos(extrusionAngle);
        const coreRx = x - coreDvX;
        const coreRy = y - coreDvY;

        // Base structure (hexagonal feel)
        Draw3D.drawCylinder(coreRx, coreRy, 60, coreH, 8, this.color, extrusionAngle, sunAngle);

        // --- Command Center (Head) ---
        // Wider section at top
        const headH = 40;
        const headDvX = headH * Math.sin(extrusionAngle);
        const headDvY = headH * Math.cos(extrusionAngle);
        const headRx = coreRx - headDvX; // Stack on top
        const headRy = coreRy - headDvY;

        // Draw head on top of core
        Draw3D.drawCylinder(headRx, headRy, 90, headH, 16, headColor, extrusionAngle, sunAngle);

        // --- Windows/Lights ---
        // Simple ring of lights on the head
        noFill();
        stroke(lightColor);
        strokeWeight(2);
        ellipse(headRx - headDvX, headRy - headDvY, 100, 30); // Top of head ring

        // --- Rotating Radar Dish ---
        const radarH = 30;
        const radarDvX = radarH * Math.sin(extrusionAngle);
        const radarDvY = radarH * Math.cos(extrusionAngle);
        const radarBaseX = headRx - headDvX;
        const radarBaseY = headRy - headDvY;

        push();
        translate(radarBaseX, radarBaseY);
        const radarAngle = now * 0.001;
        rotate(radarAngle);

        // Dish support
        fill(60); noStroke();
        rect(-5, -5, 10, 20);

        // Dish
        fill(200); stroke(100); strokeWeight(1);
        ellipse(0, -15, 60, 20); // The dish
        pop();

        // --- Landing Pads / Extensions ---
        // 4 arms extending out from the base of the core tower
        for (let i = 0; i < 4; i++) {
            const angle = i * Math.PI / 2 + Math.PI / 4;
            const dist = 90;
            const armW = 40;
            const armL = 100;

            // Position arms at base of core (coreRx/coreRy position, not ground)
            const ax = coreRx + Math.cos(angle) * dist;
            const ay = coreRy + Math.sin(angle) * dist;

            // Draw arms below the upper prism
            const armH = 20;
            Draw3D.drawBox3D(ax, ay, armW, armL, armH, color(70, 75, 80), extrusionAngle, sunAngle);

            // Landing lights on top of pads
            if ((now % 2000) < 1000) {
                const lightX = ax - armH * Math.sin(extrusionAngle);
                const lightY = ay - armH * Math.cos(extrusionAngle);
                fill(255, 0, 0); noStroke();
                ellipse(lightX, lightY, 5, 3);
            }
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
        if (this.health <= 0) {
            this.destroyed = true;
            this.onDestroy();
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            const visualY = this.pos.y - (this.yOffset || 0);
            // Big explosion for the generator
            surfaceMode.starSystem.addExplosion(this.pos.x, visualY, this.size * 3, [100, 200, 255], true);
            surfaceMode.starSystem.addExplosion(this.pos.x, visualY, this.size * 2, [255, 255, 255], true);
        }
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const sz = this.size;
        const extrusionAngle = 0.5;

        // Damage flash
        let flashColor = null;
        if (this.lastHitTime && millis() - this.lastHitTime < 150) {
            flashColor = color(255, 255, 255);
        }

        // Health-based color tint
        const healthRatio = this.health / this.maxHealth;
        const baseColor = lerpColor(color(255, 50, 50), color(80, 100, 120), healthRatio);

        // Base platform
        const baseH = sz * 0.3;
        const baseDv = baseH * Math.cos(extrusionAngle);
        Draw3D.drawCylinder(x, y - baseDv, sz * 0.8, baseH, 8, flashColor || color(60, 70, 80), extrusionAngle, sunAngle);

        // Central pillar
        const pillarH = sz * 0.6;
        const pillarDv = pillarH * Math.cos(extrusionAngle);
        Draw3D.drawCylinder(x, y - baseDv - pillarDv, sz * 0.25, pillarH, 6, flashColor || color(40, 50, 60), extrusionAngle, sunAngle);

        // Energy dome (pulsing)
        const domeY = y - baseDv - pillarDv;
        const pulseScale = 1 + Math.sin(this.pulsePhase) * 0.1;
        const domeColor = flashColor || lerpColor(color(50, 150, 255, 180), color(100, 200, 255, 220), (Math.sin(this.pulsePhase) + 1) / 2);
        Draw3D.drawDome(x, domeY, sz * 0.4 * pulseScale, 8, domeColor, extrusionAngle, sunAngle);

        // Energy ring around base
        const ringPulse = (Math.sin(this.pulsePhase * 2) + 1) / 2;
        const ringSize = sz * 0.9 + ringPulse * 10;
        push();
        noFill();
        stroke(50, 150, 255, 100 + ringPulse * 50);
        strokeWeight(2);
        ellipse(x, y, ringSize, ringSize * 0.4);
        pop();

        // --- Health Bar ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            push();
            rectMode(CORNER);
            let healthPercent = this.health / this.maxHealth;
            let barW = sz * 0.9;
            let barH = 6;
            let barX = x - barW / 2;
            let barY = y + 15;

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
        this.cooldown = 0;
        this.fireRate = config.FIRE_RATE || 1.5; // seconds between shots

        // AI state
        this.patrolTarget = createVector(x + Math.random() * 1000 - 500, y + Math.random() * 1000 - 500);
        this.chasePlayer = false;

        // Visual
        this.color = color(180, 50, 50); // Pirate red
    }

    update(dt, player, starSystem) {
        if (this.destroyed) return;
        if (!player) return;

        this.cooldown -= dt;

        // Check if player is in range
        const dx = player.pos.x - this.pos.x;
        const dy = player.pos.y - this.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq);

        // Detection logic:
        // 1. Must be within range (reduced to 600 for fairer gameplay)
        // 2. Player must be above a certain altitude (50 units above terrain) to be detected
        //    This allows players to fly "under the radar" by hugging the terrain

        const config = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.DRONE : {};
        const detectionAltitude = config.DETECTION_ALTITUDE || 50;

        const playerHeightAboveGround = (player.altitude || 0) - (this.yOffset || 0);
        const isDetected = dist < this.range && playerHeightAboveGround > detectionAltitude;

        if (isDetected) {
            this.chasePlayer = true;

            // Aim at player
            const targetAngle = Math.atan2(dy, dx);
            let angleDiff = targetAngle - this.angle;

            // Normalize angle difference
            while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
            while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

            // Turn towards player
            const turnSpeed = this.turnRate * dt;
            if (Math.abs(angleDiff) < turnSpeed) {
                this.angle = targetAngle;
            } else {
                this.angle += Math.sign(angleDiff) * turnSpeed;
            }

            // Accelerate towards player
            this.speed = Math.min(this.maxSpeed, this.speed + this.acceleration * dt);

            // Fire at player if ready and close enough
            if (this.cooldown <= 0 && dist < this.range) {
                this.fire(starSystem, player);
                this.cooldown = this.fireRate;
            }
        } else {
            this.chasePlayer = false;

            // Patrol behavior - move to patrol target
            const pdx = this.patrolTarget.x - this.pos.x;
            const pdy = this.patrolTarget.y - this.pos.y;
            const pdist = Math.sqrt(pdx * pdx + pdy * pdy);

            if (pdist < 50) {
                // Reached patrol point, pick new one
                this.patrolTarget.set(
                    this.pos.x + Math.random() * 2000 - 1000,
                    this.pos.y + Math.random() * 2000 - 1000
                );
            } else {
                // Move towards patrol target
                const targetAngle = Math.atan2(pdy, pdx);
                let angleDiff = targetAngle - this.angle;

                while (angleDiff < -Math.PI) angleDiff += Math.PI * 2;
                while (angleDiff > Math.PI) angleDiff -= Math.PI * 2;

                const turnSpeed = this.turnRate * 0.5 * dt;
                if (Math.abs(angleDiff) < turnSpeed) {
                    this.angle = targetAngle;
                } else {
                    this.angle += Math.sign(angleDiff) * turnSpeed;
                }

                // Slower speed during patrol
                this.speed = Math.min(this.maxSpeed * 0.5, this.speed + this.acceleration * 0.5 * dt);
            }
        }

        // Apply movement
        this.pos.x += Math.cos(this.angle) * this.speed * dt;
        this.pos.y += Math.sin(this.angle) * this.speed * dt;

        // Update yOffset and altitude based on terrain
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.terrain) {
            const terrainHeight = surfaceMode.terrain.getHeightAt(this.pos.x, this.pos.y);
            this.yOffset = terrainHeight;
            this.altitude = terrainHeight + this.flyingHeight;
        }

        // Apply drag
        this.speed *= Math.pow(0.95, dt * 60);
    }

    fire(starSystem, player) {
        if (typeof Projectile === 'undefined') return;
        if (!starSystem || !starSystem.projectiles) return;

        // Calculate visual muzzle position matching the draw() method
        // The ship is drawn at (pos.x, pos.y - yOffset) with extrusion applied
        const extrusionAngle = 0.5;
        const sz = this.size;
        const bodyH = sz * 0.4;

        // Visual base position (same as passed to draw)
        const visualX = this.pos.x;
        const visualY = this.pos.y - (this.yOffset || 0);

        // Extrusion offset for the 3D visual effect
        const extDvX = bodyH * Math.sin(extrusionAngle);
        const extDvY = bodyH * Math.cos(extrusionAngle);

        // Muzzle is at front of ship (angle direction) from the extruded center
        const muzzleOffset = sz * 0.5; // Match the front vertex position
        const muzzleX = visualX - extDvX + Math.cos(this.angle) * muzzleOffset;
        const muzzleY = visualY - extDvY + Math.sin(this.angle) * muzzleOffset;

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
        proj.altitude = this.altitude; // Pirate's flying altitude

        // Set target altitude for terrain-aware trajectory
        // Projectile will descend/ascend toward player's altitude
        proj.startAltitude = this.altitude;
        proj.targetAltitude = player.altitude || 0;

        // Play laser sound with proper world positioning
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player && player.pos) {
            soundManager.playWorldSound('laser', muzzleX, muzzleY, player.pos, this);
        }
    }

    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = millis();
        console.log(`Defense Drone took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
        if (this.health <= 0) {
            this.destroyed = true;
            this.onDestroy();
        }
    }

    onDestroy() {
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            const visualY = this.pos.y - (this.yOffset || 0);
            surfaceMode.starSystem.addExplosion(this.pos.x, visualY, this.size * 2, [255, 150, 50], true);
        }
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.5;

        // Damage flash
        let flashColor = null;
        if (this.lastHitTime && millis() - this.lastHitTime < 150) {
            flashColor = color(255, 255, 255);
        }

        // Health-based color
        const healthRatio = this.health / this.maxHealth;
        const shipColor = flashColor || lerpColor(color(255, 50, 50), this.color, healthRatio);

        // Simple ship body
        const sz = this.size;
        const bodyH = sz * 0.4;

        push();
        translate(x, y);
        rotate(this.angle);

        // Main body
        const bodyverts = [
            { x: -sz * 0.3, y: -sz * 0.2 },
            { x: sz * 0.5, y: 0 },
            { x: -sz * 0.3, y: sz * 0.2 }
        ];

        // Apply extrusion
        const compAngle = extrusionAngle - this.angle;
        const dvX = bodyH * Math.sin(compAngle);
        const dvY = bodyH * Math.cos(compAngle);

        const extrudedVerts = bodyverts.map(v => ({
            x: v.x - dvX,
            y: v.y - dvY
        }));

        Draw3D.drawExtrudedShape(extrudedVerts, bodyH, shipColor, compAngle, sunAngle);

        // Engine glow (if moving)
        if (this.speed > 10) {
            const glowAlpha = map(this.speed, 0, this.maxSpeed, 50, 200);
            fill(255, 150, 0, glowAlpha);
            noStroke();
            ellipse(-sz * 0.3, 0, sz * 0.2, sz * 0.15);
        }

        pop();

        // --- Health Bar ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            push();
            rectMode(CORNER);
            let healthPercent = this.health / this.maxHealth;
            let barW = sz * 0.9;
            let barH = 4;
            let barX = x - barW / 2;
            let barY = y + sz * 0.3 + 5;

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
        SurfaceStation
    };
    global.Turret = Turret;
}
