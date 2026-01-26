// Title screen and instruction page for Elite

// =============================================================================
// CONFIGURATION CONSTANTS
// =============================================================================

const TITLE_SCREEN_CONFIG = {
    // Animation timing
    TITLE_ENTRANCE_SPEED: 0.05,
    AUTHOR_FADE_SPEED: 0.1,
    PROMPT_PULSE_SPEED: 300,

    // Ship scene
    MIN_SHIPS: 4,
    MAX_SHIPS: 10,
    TARGET_UPDATE_INTERVAL: 5000,
    TARGET_UPDATE_VARIANCE: 1000,
    FIRE_COOLDOWN_MIN: 1500,
    FIRE_COOLDOWN_MAX: 4000,

    // Ship movement
    TURN_RATE_MIN: 0.0002,
    TURN_RATE_MAX: 0.001,
    MAX_SPEED_MIN: 0.8,
    MAX_SPEED_MAX: 1.5,
    VELOCITY_MIN: 0.3,
    VELOCITY_MAX: 1.2,
    MOVEMENT_SCALE: 0.05,

    // Screen boundaries
    WRAP_MARGIN: 100,
    EDGE_MARGIN: 150,
    PROJECTILE_MARGIN: 200,

    // Thrust particles
    MAX_THRUST_PARTICLES: 20,
    THRUST_OFFSET: 0.65,
    THRUST_SPAWN_CHANCE: {
        PATROL: 0.2,
        CHASE: 0.3,
        EVADE: 0.5,
        UPDATE: 0.3
    },

    // Extruded text
    TEXT_SAMPLE_FACTOR: 0.15,
    TITLE_GLOW_LAYERS: 5,

    // Default colors
    DEFAULT_BEAM_COLOR: [255, 0, 0, 200],
    DEFAULT_TEXT_COLOR: [0, 180, 255]
};

// =============================================================================
// TITLE SCREEN BEAM CLASS
// =============================================================================

class TitleScreenBeam {
    constructor(start, end, color, width, duration, owner) {
        this.start = start;
        this.end = end;
        this.color = color || TITLE_SCREEN_CONFIG.DEFAULT_BEAM_COLOR;
        this.width = width || 3;
        this.maxDuration = duration || 150;
        this.duration = this.maxDuration;
        this.owner = owner;
    }

    update(deltaTime) {
        this.duration -= deltaTime;
    }

    isExpired() {
        return this.duration <= 0;
    }

    draw() {
        push();
        const alpha = map(this.duration, 0, this.maxDuration, 0, this.color[3] || 200);

        // Main beam
        strokeWeight(this.width);
        stroke(this.color[0], this.color[1], this.color[2], alpha);
        line(this.start.x, this.start.y, this.end.x, this.end.y);

        // Glow effect
        strokeWeight(this.width + 2);
        stroke(this.color[0], this.color[1], this.color[2], alpha * 0.3);
        line(this.start.x, this.start.y, this.end.x, this.end.y);
        pop();
    }
}

// =============================================================================
// GLOBAL EXTRUDED TEXT HELPER
// =============================================================================

/**
 * Draw extruded 3D text at the specified position.
 * Falls back to plain text if dependencies are unavailable.
 */
function drawExtrudedText(str, cx, cy, fontSize, depth, angle = 0, colorRGB = TITLE_SCREEN_CONFIG.DEFAULT_TEXT_COLOR) {
    // Prefer active titleScreen instance if available
    if (typeof titleScreen !== 'undefined' && titleScreen?.drawExtrudedText) {
        return titleScreen.drawExtrudedText(str, cx, cy, fontSize, depth, angle, colorRGB);
    }

    // Fallback: draw plain text if dependencies are missing
    if (!font?.textToPoints || typeof drawExtrudedPolyOptimized !== 'function') {
        _drawPlainText(str, cx, cy, fontSize, colorRGB);
        return;
    }

    // Sample points and build layer cache
    const pts = font.textToPoints(str, 0, 0, fontSize, { sampleFactor: TITLE_SCREEN_CONFIG.TEXT_SAMPLE_FACTOR });
    if (!pts || pts.length < 3) {
        _drawPlainText(str, cx, cy, fontSize, colorRGB);
        return;
    }

    const layerCache = TitleScreen.prototype.buildLayerCacheFromPoints?.call(null, pts, colorRGB);
    if (!layerCache) {
        _drawPlainText(str, cx, cy, fontSize, colorRGB);
        return;
    }

    // Draw using extrusion helper
    push();
    translate(cx, cy);
    try {
        drawExtrudedPolyOptimized(1, layerCache, depth, angle, -PI / 4, 0, 'sides');
        drawExtrudedPolyOptimized(1, layerCache, depth, angle, -PI / 4, 0, 'top');
        noFill();
        stroke(0, 100, 200);
        strokeWeight(1);
        beginShape();
        for (const v of layerCache.vertexData) vertex(v.x, v.y);
        endShape(CLOSE);
    } catch (e) {
        pop();
        _drawPlainText(str, cx, cy, fontSize, colorRGB);
        return;
    }
    pop();
}

/**
 * Helper to draw plain fallback text
 */
function _drawPlainText(str, cx, cy, fontSize, colorRGB) {
    push();
    if (typeof font !== 'undefined') textFont(font);
    textSize(fontSize);
    fill(colorRGB[0], colorRGB[1], colorRGB[2]);
    textAlign(CENTER, CENTER);
    text(str, cx, cy);
    pop();
}

// Expose globally
if (typeof window !== 'undefined') {
    window.drawExtrudedText = drawExtrudedText;
}

// =============================================================================
// TITLE SCREEN CLASS
// =============================================================================

class TitleScreen {
    constructor() {
        this.titleY = -100; // Start off-screen
        this.authorAlpha = 0;
        this.displayShips = [];
        this.projectiles = [];
        this.beams = [];
        this.waitingForFullscreen = false;
        this.instructionScrollY = height * 0.12;

        this.setupDynamicScene();
    }

    // -------------------------------------------------------------------------
    // SCENE SETUP
    // -------------------------------------------------------------------------

    setupDynamicScene() {
        this.displayShips = [];
        this.projectiles = [];
        this.beams = [];

        const shipTypes = this._getAvailableShipTypes();
        if (shipTypes.length === 0) {
            console.warn("TitleScreen: No suitable ships with weapons found for display.");
            return;
        }

        const numShips = floor(random(TITLE_SCREEN_CONFIG.MIN_SHIPS, TITLE_SCREEN_CONFIG.MAX_SHIPS + 1));
        const usedTypes = [];

        for (let i = 0; i < numShips; i++) {
            const shipType = this._selectShipType(i, shipTypes, usedTypes);
            if (!shipType) continue;

            usedTypes.push(shipType);
            const ship = this._createDisplayShip(i, shipType);
            if (ship) this.displayShips.push(ship);
        }

        this._assignChaseTargets();
    }

    _getAvailableShipTypes() {
        return Object.keys(SHIP_DEFINITIONS).filter(key => {
            const def = SHIP_DEFINITIONS[key];
            return typeof def.drawFunction === 'function' &&
                def.armament?.length > 0;
        });
    }

    _selectShipType(index, available, used) {
        // Prefer specific ships for first slots
        if (index === 0 && available.includes("CobraMkIII")) return "CobraMkIII";
        if (index === 1 && available.includes("Viper")) return "Viper";

        // Pick unused type if possible
        const unused = available.filter(t => !used.includes(t));
        return unused.length > 0 ? random(unused) : random(available);
    }

    _createDisplayShip(index, shipType) {
        const shipDef = SHIP_DEFINITIONS[shipType];
        if (!shipDef) return null;

        const weapon = this._getShipWeapon(shipDef);
        const cfg = TITLE_SCREEN_CONFIG;

        return {
            id: `title_ship_${index}_${shipType}`,
            type: shipType,
            def: shipDef,
            pos: createVector(random(width * 0.1, width * 0.9), random(height * 0.1, height * 0.7)),
            vel: p5.Vector.random2D().mult(random(cfg.VELOCITY_MIN, cfg.VELOCITY_MAX)),
            angle: random(TWO_PI),
            targetAngle: random(TWO_PI),
            turnRate: random(cfg.TURN_RATE_MIN, cfg.TURN_RATE_MAX),
            maxSpeed: random(cfg.MAX_SPEED_MIN, cfg.MAX_SPEED_MAX),
            scale: shipDef.size > 60 ? 1.5 : 2.0,
            fireCooldown: random(cfg.FIRE_COOLDOWN_MIN, cfg.FIRE_COOLDOWN_MAX),
            weapon: weapon,
            color: shipDef.color || [200, 200, 200],
            behavior: random(['patrol', 'chase', 'evade']),
            target: null,
            targetUpdateTime: 0,
            isThrusting: false,
            thrustParticles: []
        };
    }

    _getShipWeapon(shipDef) {
        const weaponName = shipDef.armament?.[0] || "PulseLaser";
        return WEAPON_UPGRADES.find(w => w.name === weaponName) || WEAPON_UPGRADES[0] || null;
    }

    _assignChaseTargets() {
        const chasers = this.displayShips.filter(s => s.behavior === 'chase');
        for (const ship of chasers) {
            const targets = this.displayShips.filter(s => s !== ship);
            if (targets.length > 0) ship.target = random(targets);
        }
    }

    // -------------------------------------------------------------------------
    // UPDATE LOOP
    // -------------------------------------------------------------------------

    update(deltaTime) {
        if (gameStateManager.currentState !== "TITLE_SCREEN") return;

        this._animateTitle(deltaTime);
        this._updateShips(deltaTime);
        this._updateProjectiles(deltaTime);
        this._updateBeams(deltaTime);
    }

    _animateTitle(deltaTime) {
        const cfg = TITLE_SCREEN_CONFIG;

        // Animate title entrance
        if (this.titleY < height * 0.4) {
            this.titleY += deltaTime * cfg.TITLE_ENTRANCE_SPEED;
        } else {
            this.titleY = height * 0.4;
        }

        // Fade in author credit
        if (this.titleY >= height * 0.15 && this.authorAlpha < 255) {
            this.authorAlpha = min(255, this.authorAlpha + deltaTime * cfg.AUTHOR_FADE_SPEED);
        }
    }

    _updateShips(deltaTime) {
        const cfg = TITLE_SCREEN_CONFIG;

        for (const ship of this.displayShips) {
            // Update target selection periodically
            ship.targetUpdateTime -= deltaTime;
            if (ship.targetUpdateTime <= 0) {
                this._updateShipTarget(ship);
                ship.targetUpdateTime = cfg.TARGET_UPDATE_INTERVAL + random(-cfg.TARGET_UPDATE_VARIANCE, cfg.TARGET_UPDATE_VARIANCE);
            }

            // Update movement based on behavior
            this._updateShipBehavior(ship, deltaTime);

            // Update position with screen wrap
            ship.pos.add(p5.Vector.mult(ship.vel, deltaTime * cfg.MOVEMENT_SCALE));
            this._wrapShipPosition(ship);

            // Handle shooting
            ship.fireCooldown -= deltaTime;
            if (ship.fireCooldown <= 0 && ship.weapon) {
                this._fireWeapon(ship);
                ship.fireCooldown = random(cfg.FIRE_COOLDOWN_MIN, cfg.FIRE_COOLDOWN_MAX);
            }

            // Update thrust particles
            this._updateThrustParticles(ship, deltaTime);
        }
    }

    _updateShipBehavior(ship, deltaTime) {
        switch (ship.behavior) {
            case 'chase':
                this._updateChaseShip(ship, deltaTime);
                break;
            case 'evade':
                this._updateEvadeShip(ship, deltaTime);
                break;
            default:
                this._updatePatrolShip(ship, deltaTime);
        }
    }

    _wrapShipPosition(ship) {
        const margin = TITLE_SCREEN_CONFIG.WRAP_MARGIN;
        if (ship.pos.x < -margin) ship.pos.x = width + margin;
        if (ship.pos.x > width + margin) ship.pos.x = -margin;
        if (ship.pos.y < -margin) ship.pos.y = height + margin;
        if (ship.pos.y > height + margin) ship.pos.y = -margin;
    }

    _updateProjectiles(deltaTime) {
        const margin = TITLE_SCREEN_CONFIG.PROJECTILE_MARGIN;

        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            p.update(deltaTime);

            if (p.lifetime <= 0 ||
                p.pos.x < -margin || p.pos.x > width + margin ||
                p.pos.y < -margin || p.pos.y > height + margin) {
                this.projectiles.splice(i, 1);
            }
        }
    }

    _updateBeams(deltaTime) {
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const b = this.beams[i];
            b.update(deltaTime);
            if (b.isExpired()) this.beams.splice(i, 1);
        }
    }

    // -------------------------------------------------------------------------
    // SHIP BEHAVIOR
    // -------------------------------------------------------------------------

    _updateShipTarget(ship) {
        const others = this.displayShips.filter(s => s !== ship);

        if (ship.behavior === 'chase') {
            ship.target = others.length > 0 ? random(others) : null;
        } else if (ship.behavior === 'evade') {
            // Find closest ship to evade
            let closest = null;
            let closestDist = Infinity;

            for (const other of others) {
                const d = p5.Vector.dist(ship.pos, other.pos);
                if (d < closestDist) {
                    closestDist = d;
                    closest = other;
                }
            }
            ship.target = closest;
        }
    }

    _updateChaseShip(ship, deltaTime) {
        ship.isThrusting = false;

        if (!ship.target) {
            this._updatePatrolShip(ship, deltaTime);
            return;
        }

        // Turn toward target
        const toTarget = p5.Vector.sub(ship.target.pos, ship.pos);
        ship.targetAngle = toTarget.heading();
        this._turnTowardTarget(ship, deltaTime);

        // Thrust if facing target
        const angleDiff = this._getAngleDiff(ship);
        if (Math.abs(angleDiff) < 0.5) {
            this._applyThrust(ship, 1.0, 0.01);
            if (random() < TITLE_SCREEN_CONFIG.THRUST_SPAWN_CHANCE.CHASE) {
                this._createThrustParticle(ship);
            }
        }
    }

    _updateEvadeShip(ship, deltaTime) {
        ship.isThrusting = false;

        if (!ship.target) {
            this._updatePatrolShip(ship, deltaTime);
            return;
        }

        // Turn away from target
        const awayFromTarget = p5.Vector.sub(ship.pos, ship.target.pos);
        ship.targetAngle = awayFromTarget.heading();
        this._turnTowardTarget(ship, deltaTime);

        // Thrust if facing away
        const angleDiff = this._getAngleDiff(ship);
        if (Math.abs(angleDiff) < 0.7) {
            this._applyThrust(ship, 1.2, 0.02); // Faster when evading
            if (random() < TITLE_SCREEN_CONFIG.THRUST_SPAWN_CHANCE.EVADE) {
                this._createThrustParticle(ship);
            }
        }

        // Turn toward center if near edge
        this._avoidEdges(ship, 100);
    }

    _updatePatrolShip(ship, deltaTime) {
        this._turnTowardTarget(ship, deltaTime);

        // Pick new target angle occasionally
        const angleDiff = this._getAngleDiff(ship);
        if (Math.abs(angleDiff) < 0.05 || random() < 0.001) {
            ship.targetAngle = random(TWO_PI);
        }

        // Gentle thrust
        this._applyThrust(ship, 1.0, 0.005);
        ship.isThrusting = true;

        if (random() < TITLE_SCREEN_CONFIG.THRUST_SPAWN_CHANCE.PATROL) {
            this._createThrustParticle(ship);
        }

        // Avoid edges
        this._avoidEdges(ship, TITLE_SCREEN_CONFIG.EDGE_MARGIN);
    }

    _turnTowardTarget(ship, deltaTime) {
        let angleDiff = (ship.targetAngle - ship.angle + TWO_PI) % TWO_PI;
        if (angleDiff > PI) angleDiff -= TWO_PI;
        ship.angle += angleDiff * ship.turnRate * deltaTime;
        ship.angle = (ship.angle + TWO_PI) % TWO_PI;
    }

    _getAngleDiff(ship) {
        let diff = (ship.targetAngle - ship.angle + TWO_PI) % TWO_PI;
        if (diff > PI) diff -= TWO_PI;
        return diff;
    }

    _applyThrust(ship, speedMult, lerpFactor) {
        const dir = p5.Vector.fromAngle(ship.angle);
        dir.mult(ship.maxSpeed * speedMult);
        ship.vel.lerp(dir, lerpFactor);
        ship.isThrusting = true;
    }

    _avoidEdges(ship, margin) {
        const { x, y } = ship.pos;
        if (x < margin) ship.targetAngle = 0;
        else if (x > width - margin) ship.targetAngle = PI;
        else if (y < margin) ship.targetAngle = HALF_PI;
        else if (y > height - margin) ship.targetAngle = -HALF_PI;
    }

    // -------------------------------------------------------------------------
    // THRUST PARTICLES
    // -------------------------------------------------------------------------

    _createThrustParticle(ship) {
        if (!ship.thrustParticles) ship.thrustParticles = [];

        const cfg = TITLE_SCREEN_CONFIG;
        const shipSize = ship.def.size * ship.scale;
        const thrustAngle = ship.angle + PI;
        const thrustDist = shipSize * cfg.THRUST_OFFSET;

        ship.thrustParticles.push({
            pos: createVector(
                ship.pos.x + cos(thrustAngle) * thrustDist,
                ship.pos.y + sin(thrustAngle) * thrustDist
            ),
            vel: p5.Vector.fromAngle(thrustAngle + random(-0.2, 0.2)).mult(random(0.5, 2.5)),
            size: random(3, shipSize * 0.3),
            alpha: random(150, 200),
            lifespan: random(20, 40)
        });

        // Limit particles
        while (ship.thrustParticles.length > cfg.MAX_THRUST_PARTICLES) {
            ship.thrustParticles.shift();
        }
    }

    _updateThrustParticles(ship, deltaTime) {
        if (!ship.thrustParticles) ship.thrustParticles = [];

        const timeScale = deltaTime ? (deltaTime / 16.67) : 1;

        for (let i = ship.thrustParticles.length - 1; i >= 0; i--) {
            const p = ship.thrustParticles[i];

            p.pos.add(p5.Vector.mult(p.vel, timeScale));
            p.size *= Math.pow(0.95, timeScale);
            p.alpha -= 5 * timeScale;
            p.lifespan -= timeScale;

            if (p.lifespan <= 0 || p.alpha <= 0 || p.size < 1) {
                ship.thrustParticles.splice(i, 1);
            }
        }

        // Spawn new particles while thrusting
        if (ship.isThrusting && random() < TITLE_SCREEN_CONFIG.THRUST_SPAWN_CHANCE.UPDATE) {
            this._createThrustParticle(ship);
        }
    }

    // -------------------------------------------------------------------------
    // WEAPONS
    // -------------------------------------------------------------------------

    _fireWeapon(ship) {
        if (!ship.weapon || !ship.def) return;

        const weaponDef = ship.weapon;
        const muzzleOffset = (ship.def.size || 30) * ship.scale * 0.5;
        const muzzlePos = createVector(
            ship.pos.x + cos(ship.angle) * muzzleOffset,
            ship.pos.y + sin(ship.angle) * muzzleOffset
        );

        const firedBy = {
            id: ship.id,
            pos: ship.pos.copy(),
            vel: ship.vel.copy(),
            isPlayer: false,
            color: ship.color,
            faction: "TitleScreenDisplay",
            teamId: ship.id,
            type: ship.type,
            angle: ship.angle
        };

        if (weaponDef.type === 'beam') {
            this._fireBeam(muzzlePos, ship, weaponDef, firedBy);
        } else if (weaponDef.type !== 'missile') {
            this._fireProjectile(muzzlePos, ship, weaponDef, firedBy);
        }
    }

    _fireBeam(muzzlePos, ship, weaponDef, firedBy) {
        const endPos = createVector(
            muzzlePos.x + cos(ship.angle) * (weaponDef.range || 1000),
            muzzlePos.y + sin(ship.angle) * (weaponDef.range || 1000)
        );

        const beam = new TitleScreenBeam(
            muzzlePos,
            endPos,
            weaponDef.color || TITLE_SCREEN_CONFIG.DEFAULT_BEAM_COLOR,
            weaponDef.beamWidth || 3,
            weaponDef.beamDuration || 150,
            firedBy
        );
        this.beams.push(beam);
    }

    _fireProjectile(muzzlePos, ship, weaponDef, firedBy) {
        const projectile = new Projectile(
            muzzlePos.x, muzzlePos.y,
            ship.angle,
            firedBy,
            weaponDef.speed || DEFAULT_WEAPON_CONFIG.PROJECTILE_SPEED,
            weaponDef.damage || 10,
            weaponDef.color,
            weaponDef.type,
            null,
            weaponDef.lifespan || 90,
            weaponDef.turnRate || 0,
            weaponDef.speed || DEFAULT_WEAPON_CONFIG.PROJECTILE_SPEED,
            weaponDef.tangleDuration || 5.0,
            weaponDef.dragMultiplier || 10.0,
            weaponDef.rotationBlockMultiplier || 0.1
        );
        this.projectiles.push(projectile);
    }

    // -------------------------------------------------------------------------
    // EXTRUDED TEXT
    // -------------------------------------------------------------------------

    buildLayerCacheFromPoints(points, fillColor) {
        if (!points || points.length < 3) return null;

        // Compute centroid
        let cx = 0, cy = 0;
        for (const p of points) {
            cx += p.x;
            cy += p.y;
        }
        cx /= points.length;
        cy /= points.length;

        // Normalize coordinates relative to centroid
        const vertexData = points.map(p => ({ x: p.x - cx, y: p.y - cy }));

        // Compute x range for t parameters
        let minX = Infinity, maxX = -Infinity;
        for (const v of vertexData) {
            if (v.x < minX) minX = v.x;
            if (v.x > maxX) maxX = v.x;
        }
        let xRange = maxX - minX;
        if (Math.abs(xRange) < 0.0001) xRange = 1;

        // Build edges
        const edges = [];
        for (let i = 0; i < vertexData.length; i++) {
            const next = (i + 1) % vertexData.length;
            const v1 = vertexData[i];
            const v2 = vertexData[next];
            edges.push({
                v1, v2,
                dx: v2.x - v1.x,
                dy: v2.y - v1.y,
                t1: (maxX - v1.x) / xRange,
                t2: (maxX - v2.x) / xRange
            });
        }

        const fillRGB = {
            r: fillColor[0] || 180,
            g: fillColor[1] || 180,
            b: fillColor[2] || 255
        };

        return {
            vertexData,
            minX, maxX, xRange,
            fillRGB,
            strokeRGB: fillRGB,
            strokeW: 1,
            edges
        };
    }

    drawExtrudedText(str, cx, cy, fontSize, depth, angle = 0, colorRGB = TITLE_SCREEN_CONFIG.DEFAULT_TEXT_COLOR) {
        if (!font?.textToPoints || typeof drawExtrudedPolyOptimized !== 'function') {
            _drawPlainText(str, cx, cy, fontSize, colorRGB);
            return;
        }

        const pts = font.textToPoints(str, 0, 0, fontSize, { sampleFactor: TITLE_SCREEN_CONFIG.TEXT_SAMPLE_FACTOR });
        if (!pts || pts.length < 3) {
            _drawPlainText(str, cx, cy, fontSize, colorRGB);
            return;
        }

        const layerCache = this.buildLayerCacheFromPoints(pts, colorRGB);
        if (!layerCache) {
            _drawPlainText(str, cx, cy, fontSize, colorRGB);
            return;
        }

        push();
        translate(cx, cy);
        try {
            drawExtrudedPolyOptimized(1, layerCache, depth, angle, -PI / 4, 0, 'sides');
            drawExtrudedPolyOptimized(1, layerCache, depth, angle, -PI / 4, 0, 'top');
            noFill();
            stroke(0, 100, 200);
            strokeWeight(1);
            beginShape();
            for (const v of layerCache.vertexData) vertex(v.x, v.y);
            endShape(CLOSE);
        } catch (e) {
            pop();
            _drawPlainText(str, cx, cy, fontSize, colorRGB);
            return;
        }
        pop();
    }

    // -------------------------------------------------------------------------
    // DRAWING
    // -------------------------------------------------------------------------

    drawTitleScreen() {
        this._drawBackground();
        this._drawSceneElements();
        this._drawTitle();
        this._drawPrompt("Click to Continue", height * 0.85);
    }

    _drawBackground() {
        const bg = STARFIELD_CONFIG?.BACKGROUND_COLOR || { r: 10, g: 15, b: 40 };
        background(bg.r, bg.g, bg.b);
        sharedStarfield?.draw();
    }

    _drawSceneElements() {
        // Draw projectiles and beams behind ships
        for (const p of this.projectiles) p.draw();
        for (const b of this.beams) b.draw();

        // Draw ships with thrust particles
        for (const ship of this.displayShips) {
            this._drawShip(ship);
            this._drawShipThrustParticles(ship);
        }
    }

    _drawShip(ship) {
        if (!ship.def?.drawFunction) return;

        push();
        translate(ship.pos.x, ship.pos.y);

        // Calculate sun angle for 3D lighting
        const sunAngle = atan2(height / 2 - ship.pos.y, width / 2 - ship.pos.x);
        const localSunAngle = sunAngle - ship.angle;

        rotate(ship.angle);
        scale(ship.scale);
        ship.def.drawFunction(ship.def.size, ship.isThrusting, ship.angle, localSunAngle);
        pop();
    }

    _drawShipThrustParticles(ship) {
        if (!ship.thrustParticles) return;

        for (const p of ship.thrustParticles) {
            push();
            noStroke();
            fill(255, 150 + p.alpha / 2, 50, p.alpha);
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
            pop();
        }
    }

    _drawTitle() {
        push();
        // Draw glow layers
        for (let i = TITLE_SCREEN_CONFIG.TITLE_GLOW_LAYERS; i > 0; i--) {
            const size = 200 + i * 2;
            const depth = 6 + i * 1.5;
            this.drawExtrudedText("SubSpace Elite", width / 2, this.titleY, size, depth, 0, [0, 80 + i * 20, 155]);
        }

        // Author credit
        textFont(font);
        textSize(STATION_TEXT_SIZE.BODY);
        fill(200, 200, 255, this.authorAlpha);
        noStroke();
        textAlign(CENTER, CENTER);
        text("Christian Nold, Easter 2025", width / 2, this.titleY + 120);
        pop();
    }

    _drawPrompt(message, yPos) {
        push();
        textAlign(CENTER, CENTER);
        textSize(STATION_TEXT_SIZE.BIGHEADER);
        const pulse = sin(millis() / TITLE_SCREEN_CONFIG.PROMPT_PULSE_SPEED) * 50 + 200;
        fill(pulse, pulse, 255);
        textFont(font);
        text(message, width / 2, yPos);
        pop();
    }

    // -------------------------------------------------------------------------
    // INSTRUCTION SCREEN
    // -------------------------------------------------------------------------

    drawInstructionScreen() {
        this._drawBackground();

        push();
        textFont(font);

        const startY = this.instructionScrollY;
        const maxContentWidth = min(1000, width * 0.9);
        const gutter = 40;
        const lineHeight = 32;

        // Title
        this.drawExtrudedText("HOW TO PLAY", width / 2, startY + 24, 48, 6, 0, [0, 180, 255]);

        // Layout columns
        const contentTop = startY + 90;
        const colWidth = (maxContentWidth - gutter) / 2;
        const leftX = (width - maxContentWidth) / 2 + 20;
        const rightX = leftX + colWidth + gutter;

        // Left column
        this._drawLeftColumn(leftX, contentTop, lineHeight, maxContentWidth);

        // Right column
        this._drawRightColumn(rightX, contentTop + lineHeight * 3, lineHeight);

        // Start prompt
        this._drawPrompt("Press SPACE or CLICK to Begin", height * 0.85);

        pop();
    }

    _drawLeftColumn(x, y, lineHeight, maxWidth) {
        textAlign(LEFT, TOP);
        textSize(STATION_TEXT_SIZE.BODY);
        fill(200, 200, 255);

        // Intro paragraph
        const intro = "Mashup of SubSpace and Elite. Arcade dogfights meet open-ended world trading and exploration. Explore a procedurally-generated galaxy of a dozen star systems, each with dynamic economies, trading hubs, planetary bodies and faction politics. Pilot 80+ ship types from the starter Sidewinder to heavy traders, outfit dozens of weapons and modules, take assassination missions, trade, smuggle, and fight for freedom or reputation.";
        text(intro, x, y, maxWidth, height);
        y += lineHeight * 3;

        // Controls header
        textSize(STATION_TEXT_SIZE.BIGHEADER);
        fill(0, 180, 255);
        text("CONTROLS:", x, y);
        y += lineHeight;

        // Controls list
        textSize(STATION_TEXT_SIZE.BODY);
        fill(200, 200, 255);
        const controls = [
            "W or UP ARROW - Thrust forward",
            "S or DOWN ARROW - Thrust back",
            "Q or LEFT ARROW - Rotate left",
            "E or RIGHT ARROW - Rotate right",
            "A - Skate left",
            "D - Skate right",
            "R - Speed Boost",
            "HOLD SPACEBAR - Fire weapons",
            "1-9 - Switch weapons",
            "M - Galaxy map",
            "I - Inventory while flying",
            "H and J - AutoPilot to Station or Jump Zone",
            "Mouse to lock missiles and direct beam weapons"
        ];

        for (const ctrl of controls) {
            text(ctrl, x, y);
            y += lineHeight;
        }
    }

    _drawRightColumn(x, y, lineHeight) {
        textSize(STATION_TEXT_SIZE.BIGHEADER);
        fill(0, 180, 255);
        textAlign(LEFT, TOP);
        text("GAMEPLAY:", x, y);
        y += lineHeight;

        textSize(STATION_TEXT_SIZE.BODY);
        fill(200, 200, 255);
        const tips = [
            "• Dock with stations to trade, upgrade, take missions and save game",
            "• Jump between systems by going to the Jumpzone and use the galaxy map",
            "• Join the Separatists and hide in the Ion Nebula to ambush that Imperial Courier",
            "• Become Elite"
        ];

        for (const tip of tips) {
            text(tip, x, y);
            y += lineHeight;
        }
    }

    // -------------------------------------------------------------------------
    // EVENT HANDLERS
    // -------------------------------------------------------------------------

    handleClick() {
        if (gameStateManager.currentState === "TITLE_SCREEN") {
            this._handleTitleScreenClick();
        } else if (gameStateManager.currentState === "INSTRUCTIONS") {
            gameStateManager.setState("SAVE_SELECTION");
        }
    }

    _handleTitleScreenClick() {
        const isFullscreen = typeof fullscreen === 'function'
            ? fullscreen()
            : !!document.fullscreenElement;

        if (isFullscreen) {
            this._proceedToInstructions();
            return;
        }

        // Request fullscreen
        try {
            if (typeof fullscreen === 'function') {
                fullscreen(true);
            } else if (document.documentElement?.requestFullscreen) {
                document.documentElement.requestFullscreen();
            }
            this.waitingForFullscreen = true;
        } catch (e) {
            // Fallback if fullscreen fails
            this._proceedToInstructions();
        }
    }

    _proceedToInstructions() {
        soundManager?.playSound?.('startSound');
        gameStateManager.setState("INSTRUCTIONS");
        this.waitingForFullscreen = false;
    }

    handleKeyPress(keyCode, key) {
        if (gameStateManager.currentState === "INSTRUCTIONS" && (keyCode === 32 || key === ' ')) {
            if (typeof soundManager !== 'undefined') soundManager.playSound('click');
            gameStateManager.setState("SAVE_SELECTION");
        }

        if (keyCode === ESCAPE && gameStateManager.currentState === "INSTRUCTIONS") {
            gameStateManager.setState("TITLE_SCREEN");
        }
    }
}