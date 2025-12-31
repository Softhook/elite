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
        this.detectionHeightThreshold = 30; // Height above turret's ground level for detection
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
            [255, 50, 50],    // Color (Red) - Array for consistency
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

/**
 * Surface Pirate Ship - Flying hostile ship on planet surface
 * Patrols the surface and attacks the player
 */
class SurfacePirate extends SurfaceObject {
    constructor(x, y) {
        super(x, y, 35);
        this.health = 150;
        this.maxHealth = 150;
        this.lastHitTime = 0;
        this.isSurface = true; // Mark as surface entity for sound filtering
        
        // Movement
        this.angle = Math.random() * Math.PI * 2;
        this.speed = 0;
        this.maxSpeed = 150;
        this.acceleration = 200;
        this.turnRate = 2.5;
        
        // Combat
        this.range = 800;
        this.cooldown = 0;
        this.fireRate = 1.5; // seconds between shots
        
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
        
        if (dist < this.range) {
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
            if (this.cooldown <= 0 && dist < 600) {
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
        
        // Apply drag
        this.speed *= Math.pow(0.95, dt * 60);
    }
    
    fire(starSystem, player) {
        if (typeof Projectile === 'undefined') return;
        if (!starSystem || !starSystem.projectiles) return;
        
        // Muzzle offset
        const muzzleOffset = 30;
        const px = this.pos.x + Math.cos(this.angle) * muzzleOffset;
        const py = this.pos.y + Math.sin(this.angle) * muzzleOffset;
        
        const proj = new Projectile(
            px,
            py,
            this.angle,
            this,
            12,               // Speed
            8,                // Damage
            [255, 100, 50],   // Color (Orange)
            'enemy_projectile',
            null,
            120               // Lifespan
        );
        
        starSystem.projectiles.push(proj);
        
        // Mark as surface projectile
        proj.isSurface = true;
        proj.ownerType = 'pirate';
        proj.altitude = this.altitude || 0;
        
        // Play laser sound
        if (typeof soundManager !== 'undefined') {
            soundManager.playSound('laser');
        }
    }
    
    takeDamage(amount) {
        this.health -= amount;
        this.lastHitTime = millis();
        console.log(`Surface Pirate took ${amount} damage, health: ${this.health}/${this.maxHealth}`);
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
    }
}
