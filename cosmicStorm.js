// ****** cosmicStorm.js ******

class CosmicStorm {
    constructor(x, y, radius, type = 'electromagnetic') {
        this.pos = createVector(x, y);
        this.radius = radius;
        this.type = type;
        this.velocity = p5.Vector.random2D().mult(random(0.3, 0.8));
        this.color = this.getColorByType();
        this.intensity = random(0.5, 1.0);
        this.maxLifetime = random(30000, 90000); // 30-90 seconds
        this.lifetime = this.maxLifetime;
        this.dissipating = false;
        this.dissipateTime = 10000; // 10 seconds to fade out
        this.dissipateStart = 0;
        this.maxParticles = Math.min(radius / 5, 150);
        this.particles = [];
        this.lightningTimer = 0;
        this.lightningDuration = 0;
        this.lightningBolts = [];
        this.initParticles();
        this.effectRadius = radius; // Gameplay effects apply at original radius
        this.visualRadius = radius * 1.43; // Visual extends beyond effect for soft fade warning halo
        this.debug = false;
        this.affectedEntities = new Set();
        this.lastEffectTime = 0;
        this.effectCount = 0;

        // Weapon-spawned storm properties (set externally when created by storm weapon)
        this.isWeaponSpawned = false;  // True for weapon-deployed mini-storms
        this.owner = null;              // Entity that fired the storm weapon
        this.attachedTo = null;         // Entity to follow (storm moves with this entity)
    }

    // --- Color and Particle Helpers ---
    getColorByType() {
        switch (this.type) {
            case 'electromagnetic': return [80, 100, 255];
            case 'radiation': return [100, 255, 50];
            case 'gravitational': return [255, 200, 50];
            case 'ion': return [180, 100, 255];  // Purple for ion storms
            default: return [100, 150, 255];
        }
    }

    initParticles() {
        const particleCount = floor(this.maxParticles * this.intensity);
        for (let i = 0; i < particleCount; i++) {
            const angle = random(TWO_PI);
            const dist = random(this.radius * 0.1, this.radius * 0.9);
            this.particles.push({
                pos: createVector(
                    this.pos.x + cos(angle) * dist,
                    this.pos.y + sin(angle) * dist
                ),
                velocity: p5.Vector.random2D().mult(random(0.5, 1.5)),
                size: random(2, 8),
                opacity: random(100, 200),
                angle,
                distFromCenter: dist,
                rotationSpeed: random(0.005, 0.02) * (random() > 0.5 ? 1 : -1),
                spiralFactor: random(0.9, 1.1)
            });
        }
    }

    // --- Update and Lightning Logic ---
    update() {
        this.lifetime -= deltaTime;
        if (!this.dissipating && this.lifetime <= 0) {
            this.dissipating = true;
            this.dissipateStart = millis();
            // Store initial intensity to avoid recursive degradation issues
            this.dissipateStartIntensity = this.intensity;
            ENV_LOG(`${this.type} storm beginning to dissipate`);
        }
        if (this.dissipating) {
            // Safeguard against division by zero
            const dTime = (this.dissipateTime > 0) ? this.dissipateTime : 1000;
            const dissipateProgress = (millis() - this.dissipateStart) / dTime;

            // Use stored start intensity instead of self-referential this.intensity
            const startInt = (this.dissipateStartIntensity !== undefined) ? this.dissipateStartIntensity : 1.0;
            
            // Constrain to prevent extrapolation outside [0, startInt] in case of negative/huge dissipateProgress on load
            const rawIntensity = map(dissipateProgress, 0, 1, startInt, 0);
            this.intensity = Math.max(0, Math.min(startInt, Number.isFinite(rawIntensity) ? rawIntensity : 0));

            if (dissipateProgress >= 1) {
                ENV_LOG(`${this.type} storm has completely dissipated`);
                return false;
            }
        }

        // Follow attached entity if one exists (for weapon-spawned storms)
        if (this.attachedTo) {
            const target = this.attachedTo;
            // Check if target is still valid and has finite coordinates
            if (target.pos && Number.isFinite(target.pos.x) && Number.isFinite(target.pos.y) && !target.destroyed &&
                (typeof target.isDestroyed !== 'function' || !target.isDestroyed())) {
                // Move storm to follow attached entity
                this.pos.set(target.pos.x, target.pos.y);
                // Update particle positions relative to new center
                const posX = this.pos.x;
                const posY = this.pos.y;
                for (let i = 0, len = this.particles.length; i < len; i++) {
                    const particle = this.particles[i];
                    const dist = particle.distFromCenter * particle.spiralFactor;
                    particle.pos.set(
                        posX + cos(particle.angle) * dist,
                        posY + sin(particle.angle) * dist
                    );
                }
                // Skip normal movement since we're attached
            } else {
                // Target died or became invalid - detach and stay in place
                this.attachedTo = null;
                ENV_LOG(`Storm detached - target destroyed`);
            }
        } else {
            // Normal storm drift movement (only if not attached)
            // Frame-rate independent storm movement
            const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;
            this.pos.add(p5.Vector.mult(this.velocity, timeScale));
            this.velocity.rotate(random(-0.1, 0.1) * timeScale);
        }

        // Update particles (rotation and spiral)
        const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;
        const posX = this.pos.x;
        const posY = this.pos.y;
        for (let i = 0, len = this.particles.length; i < len; i++) {
            const particle = this.particles[i];
            particle.angle += particle.rotationSpeed * timeScale;
            const distSpiral = particle.distFromCenter * particle.spiralFactor;
            particle.pos.x = posX + cos(particle.angle) * distSpiral;
            particle.pos.y = posY + sin(particle.angle) * distSpiral;
            if (random() < 0.01) {
                particle.spiralFactor = constrain(
                    particle.spiralFactor + random(-0.05, 0.05),
                    0.7, 1.3
                );
            }
        }
        if (this.type === 'electromagnetic') this.updateLightning();
        return true;
    }

    updateLightning() {
        this.lightningTimer -= deltaTime;
        if (this.lightningTimer <= 0) {
            this.lightningTimer = random(500, 2000) / this.intensity;
            this.lightningDuration = random(100, 300);
            this.generateLightning();
        } else if (this.lightningDuration > 0) {
            this.lightningDuration -= deltaTime;
            if (this.lightningDuration <= 0) this.lightningBolts = [];
        }
    }

    generateLightning() {
        // Create bolt objects with metadata for simpler rendering
        this.lightningBolts = [];
        const boltCount = floor(random(1, 3) * this.intensity);
        for (let i = 0; i < boltCount; i++) {
            const startAngle = random(TWO_PI);
            const endAngle = startAngle + random(-PI / 2, PI / 2);
            const startDist = this.radius * random(0.1, 0.4);
            const endDist = this.radius * random(0.6, 0.9);
            const start = {
                x: this.pos.x + cos(startAngle) * startDist,
                y: this.pos.y + sin(startAngle) * startDist
            };
            const end = {
                x: this.pos.x + cos(endAngle) * endDist,
                y: this.pos.y + sin(endAngle) * endDist
            };
            const segments = floor(random(3, 6));
            const basePoints = [start];
            for (let j = 1; j < segments; j++) {
                const t = j / segments;
                const midX = lerp(start.x, end.x, t);
                const midY = lerp(start.y, end.y, t);
                const perpX = -(end.y - start.y);
                const perpY = end.x - start.x;
                const perpLen = max(0.0001, sqrt(perpX * perpX + perpY * perpY));
                const jitterAmt = this.radius * 0.08 * (1 - t) * random(0.5, 1.2);
                basePoints.push({
                    x: midX + (perpX / perpLen) * jitterAmt * (random() > 0.5 ? 1 : -1),
                    y: midY + (perpY / perpLen) * jitterAmt * (random() > 0.5 ? 1 : -1)
                });
            }
            basePoints.push(end);

            this.lightningBolts.push({
                basePoints,
                thickness: random(2, 5) * this.intensity,
                alpha: random(0.8, 1.0)
            });
        }
    }

    // --- Drawing ---
    draw(screenBounds) {
        if (!this.isInView(screenBounds)) return;
        push();
        this.drawAura();
        this.drawCoreGlowWaves();
        this.drawFilaments();
        this.drawParticles();
        this.drawLightning();
        this.drawDischarges();
        if (this.debug) this.drawDebug();
        pop();
    }

    drawCoreGlowWaves() {
        if (!this.color) return;
        const r = this.color[0], g = this.color[1], b = this.color[2];
        const intensity = this.intensity;
        const now = millis();
        push();
        noFill();
        blendMode(ADD);
        
        // Render concentric pulsing/expanding energy ripple waves
        const wavePeriod = 2500; // ms per wave cycle
        for (let i = 0; i < 2; i++) {
            const timeOffset = i * (wavePeriod / 2);
            const cycleProgress = ((now + timeOffset) % wavePeriod) / wavePeriod; // 0 to 1
            const waveRadius = this.radius * 0.08 + (this.radius * 1.35 * cycleProgress);
            const alpha = 85 * (1 - cycleProgress) * intensity;
            
            if (alpha > 1) {
                stroke(r, g, b, alpha);
                strokeWeight(1.4 + (1 - cycleProgress) * 2.2);
                ellipse(this.pos.x, this.pos.y, waveRadius * 2);
            }
        }
        pop();
    }

    drawFilaments() {
        if (!this.color) return;
        const r = this.color[0], g = this.color[1], b = this.color[2];
        const intensity = this.intensity;
        
        push();
        noFill();
        stroke(r, g, b, 125 * intensity);
        strokeWeight(1);
        blendMode(ADD);
        
        let filamentCount = 0;
        const maxFilaments = 18;
        const maxDistSq = 55 * 55; // 55px max connection distance
        
        // Loop and check distances, drawing a jittery line representing magnetic force lines
        for (let i = 0; i < this.particles.length && filamentCount < maxFilaments; i += 3) {
            const p1 = this.particles[i];
            if (!p1 || !p1.pos) continue;
            
            for (let j = i + 1; j < this.particles.length && filamentCount < maxFilaments; j += 5) {
                const p2 = this.particles[j];
                if (!p2 || !p2.pos) continue;
                
                const dx = p2.pos.x - p1.pos.x;
                const dy = p2.pos.y - p1.pos.y;
                const distSq = dx * dx + dy * dy;
                
                if (distSq < maxDistSq) {
                    beginShape();
                    const segments = 3;
                    vertex(p1.pos.x, p1.pos.y);
                    for (let s = 1; s < segments; s++) {
                        const t = s / segments;
                        const mx = lerp(p1.pos.x, p2.pos.x, t);
                        const my = lerp(p1.pos.y, p2.pos.y, t);
                        // Add electric wiggle
                        const rx = mx + random(-2.5, 2.5);
                        const ry = my + random(-2.5, 2.5);
                        vertex(rx, ry);
                    }
                    vertex(p2.pos.x, p2.pos.y);
                    endShape();
                    filamentCount++;
                }
            }
        }
        pop();
    }

    drawDischarges() {
        if (!this.color || this.affectedEntities.size === 0) return;
        
        const r = this.color[0], g = this.color[1], b = this.color[2];
        const intensity = this.intensity;
        
        push();
        blendMode(ADD);
        
        for (let entityId of this.affectedEntities) {
            const entity = this.findEntityById(entityId);
            if (!entity || !entity.pos || entity.destroyed) continue;
            
            // Random chance to arc, creating a natural electrical flicker
            if (random() < 0.12 * intensity) {
                // Main arc (colored glow)
                stroke(r, g, b, 200 * intensity);
                strokeWeight(2.5);
                noFill();
                
                const start = this.pos;
                const end = entity.pos;
                const dist = p5.Vector.dist(start, end);
                
                // Segment count scales with distance
                const segments = Math.max(4, Math.floor(dist / 35));
                const points = [start];
                
                for (let i = 1; i < segments; i++) {
                    const t = i / segments;
                    const mx = lerp(start.x, end.x, t);
                    const my = lerp(start.y, end.y, t);
                    
                    // Perpendicular offset for lightning wiggles
                    const perpX = -(end.y - start.y);
                    const perpY = end.x - start.x;
                    const perpLen = Math.max(1, Math.sqrt(perpX * perpX + perpY * perpY));
                    const jitter = random(-20, 20) * (1 - t * 0.3); // Less jitter near ship
                    
                    points.push({
                        x: mx + (perpX / perpLen) * jitter,
                        y: my + (perpY / perpLen) * jitter
                    });
                }
                points.push(end);
                
                // Draw Outer Glow Arc
                beginShape();
                for (let p of points) {
                    vertex(p.x, p.y);
                }
                endShape();
                
                // Draw Inner White Core Arc
                stroke(255, 255, 255, 230 * intensity);
                strokeWeight(1.0);
                beginShape();
                for (let p of points) {
                    vertex(p.x, p.y);
                }
                endShape();
            }
        }
        pop();
    }

    drawAura() {
        noStroke();

        // Use Canvas 2D API for efficient radial gradient, just like in Nebula
        const ctx = drawingContext;

        // Create a radial gradient - using larger visual radius for soft fade
        const outerRadius = Number.isFinite(this.visualRadius) && this.visualRadius > 0 ? this.visualRadius : 100;
        
        // Ensure position coords are valid numbers before calling native canvas API
        const px = Number.isFinite(this.pos.x) ? this.pos.x : 0;
        const py = Number.isFinite(this.pos.y) ? this.pos.y : 0;
        
        const gradient = ctx.createRadialGradient(
            px, py, 0,           // Inner circle (center point, radius 0)
            px, py, outerRadius  // Outer circle - visual radius
        );

        // Add color stops for smooth gradient
        const r = Number.isFinite(this.color?.[0]) ? this.color[0] : 100;
        const g = Number.isFinite(this.color?.[1]) ? this.color[1] : 150;
        const b = Number.isFinite(this.color?.[2]) ? this.color[2] : 255;
        const intensity = Number.isFinite(this.intensity) ? this.intensity : 1.0;
        const baseAlpha = 100 * intensity / 255; // Convert to 0-1 range for RGBA

        // Create smooth gradient that fades to transparent for natural look
        // FIX: Ensure alpha is finite and clamped between 0 and 1 to prevent canvas crashes
        let safeAlpha = Number.isFinite(baseAlpha) ? baseAlpha : 0;
        safeAlpha = Math.max(0, Math.min(1, safeAlpha));

        try {
            gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${safeAlpha})`);
            gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${safeAlpha * 0.8})`);
            gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${safeAlpha * 0.55})`);
            gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${safeAlpha * 0.3})`);
            gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${safeAlpha * 0.12})`);
            gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);
        } catch (e) {
            console.error("Error adding color stop to gradient:", e, safeAlpha);
        }

        // Apply gradient to context
        ctx.fillStyle = gradient;

        // Draw circle with the gradient - using larger visual radius
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.visualRadius * 1.5, 0, TWO_PI);
        ctx.fill();
    }

    drawParticles() {
        const color0 = Number.isFinite(this.color?.[0]) ? this.color[0] : 100;
        const color1 = Number.isFinite(this.color?.[1]) ? this.color[1] : 150;
        const color2 = Number.isFinite(this.color?.[2]) ? this.color[2] : 255;
        const intensity = Number.isFinite(this.intensity) ? this.intensity : 1.0;
        noStroke();
        for (let i = 0, len = this.particles.length; i < len; i++) {
            const particle = this.particles[i];
            if (!particle || !particle.pos || !Number.isFinite(particle.pos.x) || !Number.isFinite(particle.pos.y)) continue;
            fill(color0, color1, color2, (Number.isFinite(particle.opacity) ? particle.opacity : 150) * intensity);
            ellipse(particle.pos.x, particle.pos.y, Number.isFinite(particle.size) ? particle.size : 4);
        }
    }

    drawLightning() {
        if (this.lightningBolts.length === 0) return;
        const color0 = Number.isFinite(this.color?.[0]) ? this.color[0] : 100;
        const color1 = Number.isFinite(this.color?.[1]) ? this.color[1] : 150;
        const color2 = Number.isFinite(this.color?.[2]) ? this.color[2] : 255;
        const intensity = Number.isFinite(this.intensity) ? this.intensity : 1.0;

        for (let i = 0, len = this.lightningBolts.length; i < len; i++) {
            const bolt = this.lightningBolts[i];
            if (!bolt || !Array.isArray(bolt.basePoints)) continue;

            // Simple jitter for flicker effect
            const jitterAmp = 3 * intensity;
            const points = bolt.basePoints.map(p => ({
                x: p.x + random(-jitterAmp, jitterAmp),
                y: p.y + random(-jitterAmp, jitterAmp)
            }));

            // Draw outer glow
            stroke(color0, color1, color2, 150 * (Number.isFinite(bolt.alpha) ? bolt.alpha : 1.0));
            strokeWeight(Math.max(1, (Number.isFinite(bolt.thickness) ? bolt.thickness : 3) * 2));
            noFill();
            beginShape();
            for (let p of points) {
                if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                    vertex(p.x, p.y);
                }
            }
            endShape();

            // Draw inner core
            stroke(255, 255, 255, 255 * (Number.isFinite(bolt.alpha) ? bolt.alpha : 1.0));
            strokeWeight(max(1, (Number.isFinite(bolt.thickness) ? bolt.thickness : 3) * 0.5));
            beginShape();
            for (let p of points) {
                if (p && Number.isFinite(p.x) && Number.isFinite(p.y)) {
                    vertex(p.x, p.y);
                }
            }
            endShape();
        }
    }

    drawDebug() {
        // Draw effect boundary
        strokeWeight(2);
        stroke(255, 0, 0, 100);
        noFill();
        ellipse(this.pos.x, this.pos.y, this.radius * 2);
        // Draw direction vector
        stroke(255, 0, 0);
        line(
            this.pos.x,
            this.pos.y,
            this.pos.x + this.velocity.x * 50,
            this.pos.y + this.velocity.y * 50
        );
        // Draw debug text
        fill(255);
        noStroke();
        textSize(STATION_TEXT_SIZE.SMALL);
        textAlign(CENTER);
        text(`${this.type} storm`, this.pos.x, this.pos.y - this.radius - 20);
        text(`Effects: ${this.effectCount}`, this.pos.x, this.pos.y - this.radius - 40);
        text(`Affected: ${this.affectedEntities.size}`, this.pos.x, this.pos.y - this.radius - 60);
        // Draw connection lines to affected entities
        stroke(255, 0, 0, 100);
        strokeWeight(1);
        for (let entityId of this.affectedEntities) {
            const entity = this.findEntityById(entityId);
            if (entity && entity.pos) {
                line(this.pos.x, this.pos.y, entity.pos.x, entity.pos.y);
            }
        }
    }

    // --- Utility and Effects ---
    isInView(screenBounds) {
        if (!screenBounds) return true;
        const left = Number.isFinite(screenBounds.left) ? screenBounds.left : -Infinity;
        const right = Number.isFinite(screenBounds.right) ? screenBounds.right : Infinity;
        const top = Number.isFinite(screenBounds.top) ? screenBounds.top : -Infinity;
        const bottom = Number.isFinite(screenBounds.bottom) ? screenBounds.bottom : Infinity;
        const vRadius = Number.isFinite(this.visualRadius) && this.visualRadius > 0 ? this.visualRadius : 100;
        
        return (
            this.pos.x + vRadius >= left &&
            this.pos.x - vRadius <= right &&
            this.pos.y + vRadius >= top &&
            this.pos.y - vRadius <= bottom
        );
    }

    applyEffects(entity) {
        if (!entity || !entity.pos) return;
        const dist = p5.Vector.dist(entity.pos, this.pos);
        const entityId = entity.id || (entity instanceof Player ? 'player' : Date.now());
        if (dist > this.effectRadius) {
            // [CRITICAL REVIEW]
            // We NO LONGER need explicit cleanup here because Player/Enemy reset their 
            // storm flags (targetingDisruption, shieldsDisabled) every frame in their update().
            // This robustly handles teleporting out, overlapping storms, and edge cases.
            if (this.affectedEntities.has(entityId)) {
                this.affectedEntities.delete(entityId);
            }
            return;
        }
        const effectStrength = map(dist, 0, this.effectRadius, 1, 0) * this.intensity;
        if (!this.affectedEntities.has(entityId)) {
            this.affectedEntities.add(entityId);
            if (this.debug) console.log(`Entity ${entityId} entered ${this.type} storm`);
            if (entity instanceof Player) this.showStormMessage();
        }
        this.applyTypeEffect(entity, effectStrength, entityId);
        if (this.debug && entity instanceof Player) {
            entity.stormEffect = { type: this.type, strength: effectStrength };
        }
    }

    showStormMessage() {
        if (typeof uiManager === 'undefined') return;
        let message = '';
        switch (this.type) {
            case 'electromagnetic': message = "Warning: Electromagnetic storm disrupting targeting!"; break;
            case 'gravitational': message = "Caution: Gravitational storm affecting navigation!"; break;
            case 'radiation': message = "Alert: Radiation storm causing hull damage!"; break;
            case 'ion': message = "Warning: Ion storm disabling shields!"; break;
        }
        uiManager.addMessage(message, '#ff0000');
    }

    applyTypeEffect(entity, effectStrength, entityId) {
        // Skip applying effects to the storm's owner (for weapon-spawned storms)
        if (this.isWeaponSpawned && this.owner && entity === this.owner) {
            return;
        }

        // Skip applying effects to faction allies (for weapon-spawned storms)
        if (this.isWeaponSpawned && this.owner && this.owner.faction && entity.faction) {
            if (this.owner.faction === entity.faction) {
                return; // Same faction - no friendly fire
            }
        }

        switch (this.type) {
            case 'electromagnetic':
                // Use Math.max to prevent weaker storms from overriding stronger ones
                entity.targetingDisruption = Math.max(entity.targetingDisruption || 0, effectStrength);
                entity.weaponsDisabled = true; // EMP disables weapons
                if (this.debug && entity instanceof Player) {
                    console.log(`Targeting disruption: ${effectStrength.toFixed(2)}`);
                }
                break;
            case 'gravitational':
                const pull = p5.Vector.sub(this.pos, entity.pos);
                pull.normalize().mult(effectStrength * 0.2);
                entity.vel.add(pull);
                if (this.debug && random() < 0.05) {
                    console.log(`Gravitational pull: ${effectStrength.toFixed(2)}`);
                }
                break;
            case 'radiation':
                if (random() < 0.03 * effectStrength) {
                    const damage = random(1, 3) * effectStrength;
                    // Try to provide a system reference for consistent targeting behavior
                    const activeSystem = (window.gameStateManager && gameStateManager.activeSystem) ? gameStateManager.activeSystem : null;
                    if (typeof entity.takeDamage === 'function') {
                        // Pass storm owner as attacker if available (for kill credit)
                        const attacker = (this.isWeaponSpawned && this.owner) ? this.owner : null;
                        entity.takeDamage(damage, attacker, activeSystem);
                    }
                    this.effectCount++;
                    if (this.debug) {
                        console.log(`Radiation damage: ${damage.toFixed(1)} to ${entityId}`);
                    }
                }
                break;
            case 'ion':
                // Ion storms drain shields continuously rather than instant disable
                entity.shieldsDisabled = true;
                // Drain shields over time instead of instantly zeroing
                if (entity.shield > 0 && typeof entity.maxShield !== 'undefined') {
                    const drainRate = effectStrength * 0.1; // Drain 10% of max shield per effect tick at full strength
                    const drainAmount = (entity.maxShield || 100) * drainRate * (typeof deltaTime === 'number' ? deltaTime / 1000 : 0.016);
                    entity.shield = Math.max(0, entity.shield - drainAmount);
                }
                if (this.debug && entity instanceof Player) {
                    console.log(`Ion storm draining shields for ${entityId}, shields: ${entity.shield?.toFixed(1)}`);
                }
                break;
        }
    }

    findEntityById(id) {
        if (!window.gameStateManager || !gameStateManager.activeSystem) return null;
        const system = gameStateManager.activeSystem;
        if (id === 'player') return system.player;
        // Use O(1) Map lookup if available, fallback to O(n) array search
        return system.enemiesById?.get(id)
            || system.enemies?.find(e => e?.id === id)
            || null;
    }

    toggleDebug() {
        this.debug = !this.debug;
        console.log(`Storm ${this.type} debug mode: ${this.debug ? 'ON' : 'OFF'}`);
        return this.debug;
    }

    /**
     * Serializes the storm to a JSON-safe object.
     */
    toJSON() {
        const data = {
            pos: { x: this.pos.x, y: this.pos.y },
            radius: this.radius,
            type: this.type,
            velocity: { x: this.velocity.x, y: this.velocity.y },
            intensity: this.intensity,
            maxLifetime: this.maxLifetime,
            lifetime: this.lifetime,
            dissipating: this.dissipating,
            dissipateTime: this.dissipateTime,
            effectRadius: this.effectRadius,
            visualRadius: this.visualRadius,
            maxParticles: this.maxParticles,
            lastEffectTime: this.lastEffectTime,
            effectCount: this.effectCount,
            // Weapon properties
            isWeaponSpawned: this.isWeaponSpawned,
            ownerId: this.owner ? (this.owner.id || this.owner.shipTypeName || null) : null,
            attachedToId: this.attachedTo ? (this.attachedTo.id || this.attachedTo.shipTypeName || null) : null
        };

        if (this.dissipating) {
            // Save time-independent elapsed duration of dissipation
            data.dissipateElapsed = millis() - this.dissipateStart;
            data.dissipateStartIntensity = this.dissipateStartIntensity !== undefined ? this.dissipateStartIntensity : this.intensity;
        } else {
            data.dissipateStart = this.dissipateStart;
        }

        return data;
    }

    /**
     * Reconstructs a CosmicStorm from serialized data.
     */
    static fromJSON(data) {
        if (!data) return null;
        
        // Coerce inputs defensively to ensure they are finite numbers and valid types
        const rx = Number.isFinite(data.pos?.x) ? data.pos.x : 0;
        const ry = Number.isFinite(data.pos?.y) ? data.pos.y : 0;
        const rad = Number(data.radius);
        const safeRadius = (Number.isFinite(rad) && rad > 0) ? rad : 100;
        const type = data.type || 'electromagnetic';

        // Use constructor
        const storm = new CosmicStorm(rx, ry, safeRadius, type);

        // Restore properties with strict type and validity validation
        if (data.velocity && Number.isFinite(data.velocity.x) && Number.isFinite(data.velocity.y)) {
            storm.velocity = (typeof createVector === 'function') ? createVector(data.velocity.x, data.velocity.y) : { x: data.velocity.x, y: data.velocity.y, mult: () => { }, rotate: () => { } };
        } else {
            storm.velocity = (typeof createVector === 'function') ? createVector(0, 0) : { x: 0, y: 0, mult: () => { }, rotate: () => { } };
        }

        const intensity = Number(data.intensity);
        if (Number.isFinite(intensity) && intensity >= 0) storm.intensity = intensity;

        const maxLifetime = Number(data.maxLifetime);
        if (Number.isFinite(maxLifetime) && maxLifetime > 0) storm.maxLifetime = maxLifetime;

        const lifetime = Number(data.lifetime);
        if (Number.isFinite(lifetime)) storm.lifetime = lifetime;

        storm.dissipating = !!data.dissipating;
        
        const dissipateTime = Number(data.dissipateTime);
        if (Number.isFinite(dissipateTime) && dissipateTime > 0) storm.dissipateTime = dissipateTime;

        if (storm.dissipating) {
            // Restore dissipation start using current millis and the elapsed time since it began
            const elapsed = Number(data.dissipateElapsed) || 0;
            storm.dissipateStart = millis() - elapsed;
            
            const startInt = Number(data.dissipateStartIntensity);
            storm.dissipateStartIntensity = Number.isFinite(startInt) ? startInt : storm.intensity;
        } else {
            const dissipateStart = Number(data.dissipateStart);
            if (Number.isFinite(dissipateStart)) storm.dissipateStart = dissipateStart;
        }

        const effectRadius = Number(data.effectRadius);
        storm.effectRadius = (Number.isFinite(effectRadius) && effectRadius > 0) ? effectRadius : safeRadius;

        const visualRadius = Number(data.visualRadius);
        storm.visualRadius = (Number.isFinite(visualRadius) && visualRadius > 0) ? visualRadius : safeRadius * 1.43;

        const maxParticles = Number(data.maxParticles);
        if (Number.isFinite(maxParticles) && maxParticles > 0) storm.maxParticles = maxParticles;

        const lastEffectTime = Number(data.lastEffectTime);
        if (Number.isFinite(lastEffectTime)) storm.lastEffectTime = lastEffectTime;

        const effectCount = Number(data.effectCount);
        if (Number.isFinite(effectCount)) storm.effectCount = effectCount;

        // Restore weapon flags (references will be relinked by StarSystem)
        storm.isWeaponSpawned = !!data.isWeaponSpawned;
        storm.ownerId = data.ownerId || null;
        storm._ownerId = data.ownerId || null; // Backup
        storm.attachedToId = data.attachedToId || null;
        storm._attachedToId = data.attachedToId || null; // Backup

        // Re-init particles based on restored intensity/radius/maxParticles
        storm.particles = [];
        storm.initParticles();

        return storm;
    }
}

if (typeof module !== 'undefined') {
    module.exports = { CosmicStorm };
}