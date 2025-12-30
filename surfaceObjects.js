class SurfaceObject {
    constructor(x, y, size) {
        this.pos = createVector(x, y);
        this.size = size || 50;
        this.health = 100;
        this.destroyed = false;
        this.color = color(150, 150, 150);
        this.yOffset = 0;
    }

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

class Building extends SurfaceObject {
    constructor(x, y, size, type, seed = 0) {
        super(x, y, size);
        this.type = type || 'skyscraper';
        this.seed = seed;

        this.color = this._getTypeColor();
        this.height = this._getTypeHeight();
    }

    _getTypeColor() {
        const r = (Math.sin(this.seed) * 0.5 + 0.5) * 50;
        const g = (Math.cos(this.seed * 0.7) * 0.5 + 0.5) * 50;

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

class Turret extends SurfaceObject {
    constructor(x, y, size) {
        super(x, y, size || 40);
        this.range = 1000;
        this.color = color(120, 120, 120);
        this.angle = 0;
        this.cooldown = 0;
        this.id = Math.floor(Math.random() * 10000);
        this.health = 100; // Explicitly set health
        this.maxHealth = 100;
        this.lastHitTime = 0; // For damage flash effect
    }

    update(dt, player, starSystem) {
        // Stop all activity if destroyed
        if (this.destroyed) return;
        if (!player) return;
        this.cooldown -= dt;

        // Height-based detection: turret can only track player if player is ABOVE turret
        // Turret ground height is yOffset, player flight height is altitude
        const turretHeight = this.yOffset || 0;
        const playerHeight = player.altitude || 0;

        // Player must be higher than turret to be detected
        // (relax this slightly for gameplay - if they are close, they should see them)
        if (playerHeight <= turretHeight - 50) { // Allow being slightly below
            // Player is safely below detection
            return;
        }

        // --- COORDINATE FIX ---
        // We must calculate angles based on VISUAL positions as they appear on screen.
        // Surface mode uses an "extruded 2D" projection.
        // X_visual = X_world - Height * sin(extrusion)
        // Y_visual = (Y_world - TerrainZ) - Height * cos(extrusion)

        const extrusionAngle = 0.5; // Must match Draw3D usage in draw()
        const sz = this.size;
        const totalHeadHeight = (sz * 0.2) + (sz * 0.6); // Base + Head Height

        // 1. Calculate Turret VISUAL Position (Muzzle/Head level)
        const extX = totalHeadHeight * Math.sin(extrusionAngle);
        const extY = totalHeadHeight * Math.cos(extrusionAngle);

        // Terrain acts as a Z-offset on Y axis in drawing logic
        const terrainOffset = this.yOffset || 0;

        const turretVisualX = this.pos.x - extX;
        const turretVisualY = (this.pos.y - terrainOffset) - extY;

        // 2. Calculate Player VISUAL Position
        // The player is drawn at their map position (pos.x, pos.y) without terrain offset
        // (Shadow handles terrain indication, ship stays at "Space/Map" level)
        const playerVisualX = player.pos.x;
        const playerVisualY = player.pos.y;

        // 3. Aiming Logic in Visual Space
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
            this.angle += diff * 5 * dt;

            // Normalize angle
            while (this.angle < -Math.PI) this.angle += TWO_PI;
            while (this.angle > Math.PI) this.angle -= TWO_PI;

            // Fire if ready
            if (this.cooldown <= 0 && starSystem) {
                // Pass the calculated visual muzzle position
                this.fire(starSystem, player, turretVisualX, turretVisualY);
                this.cooldown = 2.0;
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

        const proj = new Projectile(
            px,
            py,
            this.angle,
            this,
            15,               // Speed
            5,                // Damage
            color(255, 50, 50),
            'enemy_projectile',
            null,
            120               // Lifespan
        );

        if (starSystem.projectiles) {
            starSystem.projectiles.push(proj);
            // Use ownerType and isSurface to help filtering
            proj.ownerType = 'turret';
            proj.isSurface = true;

            // Projectile altitude for collision purposes
            // This is the logical altitude, which is Turret Base Z + Turret Height
            proj.altitude = (this.yOffset || 0) + (this.size * 0.8);

            if (typeof soundManager !== 'undefined') {
                soundManager.playSound('laser');
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
    }
}

class SurfaceStation extends SurfaceObject {
    constructor(x, y) {
        super(x, y, 200);
        this.health = 5000;
        this.color = color(80, 80, 90);
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const extrusionAngle = 0.1;

        // --- Main Platform ---
        const platH = 20;
        const platDvX = platH * Math.sin(extrusionAngle);
        const platDvY = platH * Math.cos(extrusionAngle);
        const platRx = x - platDvX;
        const platRy = y - platDvY;

        Draw3D.drawCylinder(platRx, platRy, 100, platH, 16, this.color, extrusionAngle, sunAngle);

        // --- Control Tower ---
        const towerH = 120;
        const towerX = platRx - 30; // On platform roof
        const towerY = platRy - 20;

        const towerDvX = towerH * Math.sin(extrusionAngle);
        const towerDvY = towerH * Math.cos(extrusionAngle);
        const towerRx = towerX - towerDvX;
        const towerRy = towerY - towerDvY;

        Draw3D.drawBox3D(towerRx, towerRy, 40, 40, towerH, color(100, 100, 120), extrusionAngle, sunAngle);

        // --- Dome ---
        // Sits on tower roof
        // Dome "Base" = Tower Roof = (towerRx, towerRy)
        // But drawDome takes Center Position.
        // For Dome, extrudes from Base to Tip? Or Tip to Base?
        // drawDome implementation:
        // "Draw base/rim circle at specified position (top of dome, no offset)"
        // "Height offset: starts at 0 (rim) and increases toward tip"
        // Tip = Rim + dv * depthDir.
        // So (x,y) is RIM.
        // We want RIM to be on Tower Roof.

        Draw3D.drawDome(towerRx, towerRy, 30, 8, color(200, 220, 255), extrusionAngle, sunAngle);

        // --- Pads --
        // On Ground? Or Platform? Let's put on Ground for visual footprint extend
        const padH = 10;
        const padDvX = padH * Math.sin(extrusionAngle);
        const padDvY = padH * Math.cos(extrusionAngle);
        const padRy = y - padDvY;
        const padRxLeft = (x - 80) - padDvX;
        const padRxRight = (x + 80) - padDvX;

        Draw3D.drawCylinder(padRxLeft, padRy, 30, padH, 12, color(60), extrusionAngle, sunAngle);
        Draw3D.drawCylinder(padRxRight, padRy, 30, padH, 12, color(60), extrusionAngle, sunAngle);

        // --- Details ---
        // Add some "boxes" on the platform
        const boxH = 15;
        const bx = platRx + 40;
        const by = platRy + 10;
        const bdx = boxH * Math.sin(extrusionAngle);
        const bdy = boxH * Math.cos(extrusionAngle);
        Draw3D.drawBox3D(bx - bdx, by - bdy, 20, 20, boxH, color(40), extrusionAngle, sunAngle);
    }
}

/**
 * Shield Generator - Main mission target
 * The red dot on radar, destroying this is the objective
 */
class ShieldGenerator extends SurfaceObject {
    constructor(x, y) {
        super(x, y, 60);
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
    }
}
