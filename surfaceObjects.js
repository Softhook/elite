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

            // Antennas on top tier
            const antH = 30;
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
        this.range = 1000;
        this.id = Math.floor(Math.random() * 10000);
    }

    update(dt, player, starSystem) {
        if (!player) return;
        this.cooldown -= dt;

        // World distance check (including altitude)
        const dx = player.pos.x - this.pos.x;
        const dy = player.pos.y - this.pos.y;
        // In our 2D projection, the 'up' direction is effectively screen-Y
        // But for gameplay distance, altitude is the Z.
        const d = Math.sqrt(dx * dx + dy * dy);

        if (d < this.range) {
            // Aiming angle (ground plane) - Shortest path interpolation
            const targetAngle = atan2(dy, dx);
            let diff = targetAngle - this.angle;
            while (diff < -PI) diff += TWO_PI;
            while (diff > PI) diff -= TWO_PI;

            // Smoother, frame-rate independent rotation
            this.angle += diff * 5 * dt;
            // Normalize angle to keep it within [-PI, PI] range
            while (this.angle < -PI) this.angle += TWO_PI;
            while (this.angle > PI) this.angle -= TWO_PI;

            // Fire if ready AND player is not too high
            if (this.cooldown <= 0 && starSystem && (player.altitude < 400)) {
                this.fire(starSystem, player);
                this.cooldown = 2.0;
            }

            // [DEBUG] Log aiming info throttled to once per second
            if (this._lastLogTime === undefined) this._lastLogTime = 0;
            if (millis() - this._lastLogTime > 1000) {
                console.log(`Turret [${this.id}] targeting player: targetAngle=${targetAngle.toFixed(2)}, currentAngle=${this.angle.toFixed(2)}, diff=${diff.toFixed(2)}`);
                this._lastLogTime = millis();
            }
        }
    }

    fire(starSystem, player) {
        if (typeof Projectile === 'undefined') return;

        // Muzzle position in world coords
        const muzzleX = this.pos.x + 40 * Math.cos(this.angle);
        const muzzleY = this.pos.y + 40 * Math.sin(this.angle);

        const proj = new Projectile(
            muzzleX,
            muzzleY,
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
            // CRITICAL: Set projectile altitude to muzzle height relative to planet
            // This ensures it's visible in 3D and hits correct collision zones
            proj.altitude = (this.yOffset || 0) + 20;

            if (typeof soundManager !== 'undefined') {
                soundManager.playSound('laser');
            }
            // Visual muzzle flash - tag as isSurface
            if (starSystem.addExplosion) {
                starSystem.addExplosion(muzzleX, muzzleY, 5, [255, 100, 50], true);
            }
        }
    }

    onDestroy() {
        // Create large surface explosion
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.starSystem) {
            surfaceMode.starSystem.addExplosion(this.pos.x, this.pos.y, this.size * 2, [255, 100, 50], true);
        }
    }

    draw(x, y, sunAngle = -Math.PI / 4) {
        const sz = this.size;
        const extrusionAngle = 0.1;

        const baseH = sz * 0.2;
        const headH = sz * 0.6;

        // --- BASE ---
        // Calculate Base Roof Pos
        const baseDvX = baseH * Math.sin(extrusionAngle);
        const baseDvY = baseH * Math.cos(extrusionAngle);
        const baseRx = x - baseDvX;
        const baseRy = y - baseDvY;

        Draw3D.drawCylinder(baseRx, baseRy, sz / 2, baseH, 12, color(60), extrusionAngle, sunAngle);

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

        Draw3D.drawExtrudedShape(corners, headH, this.color, extrusionAngle, sunAngle);

        // -- DUAL BARRELS --
        const barrelLen = sz * 0.8;
        const barrelW = sz * 0.15;
        const barrelGap = sz * 0.2;

        const drawBarrel = (offset) => {
            const bx = headRx + (hw + barrelLen / 2) * c + (offset * -s);
            const by = headRy + (hw + barrelLen / 2) * s + (offset * c);

            // Barrels extrude along the same depth vector
            const bdvX = 10 * Math.sin(extrusionAngle);
            const bdvY = 10 * Math.cos(extrusionAngle);
            const brx = bx - bdvX;
            const bry = by - bdvY;

            const barrelCol = color(40);
            Draw3D.drawBox3D(brx, bry, barrelLen, barrelW, 10, barrelCol, extrusionAngle, sunAngle, this.angle);
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
