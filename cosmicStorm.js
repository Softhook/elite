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
            ENV_LOG(`${this.type} storm beginning to dissipate`);
        }
        if (this.dissipating) {
            const dissipateProgress = (millis() - this.dissipateStart) / this.dissipateTime;
            this.intensity = map(dissipateProgress, 0, 1, this.intensity, 0);
            if (dissipateProgress >= 1) {
                ENV_LOG(`${this.type} storm has completely dissipated`);
                return false;
            }
        }

        // Follow attached entity if one exists (for weapon-spawned storms)
        if (this.attachedTo) {
            const target = this.attachedTo;
            // Check if target is still valid
            if (target.pos && !target.destroyed &&
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
        this.drawParticles();
        this.drawLightning();
        if (this.debug) this.drawDebug();
        pop();
    }

    drawAura() {
        noStroke();

        // Use Canvas 2D API for efficient radial gradient, just like in Nebula
        const ctx = drawingContext;

        // Create a radial gradient - using larger visual radius for soft fade
        const outerRadius = this.visualRadius;
        const gradient = ctx.createRadialGradient(
            this.pos.x, this.pos.y, 0,           // Inner circle (center point, radius 0)
            this.pos.x, this.pos.y, outerRadius  // Outer circle - visual radius
        );

        // Add color stops for smooth gradient
        const r = this.color[0];
        const g = this.color[1];
        const b = this.color[2];
        const baseAlpha = 100 * this.intensity / 255; // Convert to 0-1 range for RGBA

        // Create smooth gradient that fades to transparent for natural look
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.8})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.55})`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.3})`);
        gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.12})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        // Apply gradient to context
        ctx.fillStyle = gradient;

        // Draw circle with the gradient - using larger visual radius
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.visualRadius * 1.5, 0, TWO_PI);
        ctx.fill();
    }

    drawParticles() {
        const color0 = this.color[0];
        const color1 = this.color[1];
        const color2 = this.color[2];
        const intensity = this.intensity;
        noStroke();
        for (let i = 0, len = this.particles.length; i < len; i++) {
            const particle = this.particles[i];
            fill(color0, color1, color2, particle.opacity * intensity);
            ellipse(particle.pos.x, particle.pos.y, particle.size);
        }
    }

    drawLightning() {
        if (this.lightningBolts.length === 0) return;
        const color0 = this.color[0];
        const color1 = this.color[1];
        const color2 = this.color[2];

        for (let i = 0, len = this.lightningBolts.length; i < len; i++) {
            const bolt = this.lightningBolts[i];

            // Simple jitter for flicker effect
            const jitterAmp = 3 * this.intensity;
            const points = bolt.basePoints.map(p => ({
                x: p.x + random(-jitterAmp, jitterAmp),
                y: p.y + random(-jitterAmp, jitterAmp)
            }));

            // Draw outer glow
            stroke(color0, color1, color2, 150 * bolt.alpha);
            strokeWeight(bolt.thickness * 2);
            noFill();
            beginShape();
            for (let p of points) {
                vertex(p.x, p.y);
            }
            endShape();

            // Draw inner core
            stroke(255, 255, 255, 255 * bolt.alpha);
            strokeWeight(max(1, bolt.thickness * 0.5));
            beginShape();
            for (let p of points) {
                vertex(p.x, p.y);
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
        return (
            this.pos.x + this.visualRadius >= screenBounds.left &&
            this.pos.x - this.visualRadius <= screenBounds.right &&
            this.pos.y + this.visualRadius >= screenBounds.top &&
            this.pos.y - this.visualRadius <= screenBounds.bottom
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
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            radius: this.radius,
            type: this.type,
            velocity: { x: this.velocity.x, y: this.velocity.y },
            intensity: this.intensity,
            maxLifetime: this.maxLifetime,
            lifetime: this.lifetime,
            dissipating: this.dissipating,
            dissipateStart: this.dissipateStart,
            dissipateTime: this.dissipateTime,
            effectRadius: this.effectRadius,
            visualRadius: this.visualRadius,
            lastEffectTime: this.lastEffectTime,
            effectCount: this.effectCount,
            // Weapon properties
            isWeaponSpawned: this.isWeaponSpawned,
            ownerId: this.owner ? (this.owner.id || this.owner.shipTypeName || null) : null,
            attachedToId: this.attachedTo ? (this.attachedTo.id || this.attachedTo.shipTypeName || null) : null
        };
    }

    /**
     * Reconstructs a CosmicStorm from serialized data.
     */
    static fromJSON(data) {
        if (!data) return null;
        // Use default constructor
        const storm = new CosmicStorm(
            data.pos?.x || 0,
            data.pos?.y || 0,
            data.radius || 100,
            data.type || 'electromagnetic'
        );

        // Restore properties
        if (data.velocity) storm.velocity = (typeof createVector === 'function') ? createVector(data.velocity.x, data.velocity.y) : { x: data.velocity.x, y: data.velocity.y, mult: () => { }, rotate: () => { } };
        if (data.intensity !== undefined) storm.intensity = data.intensity;
        if (data.maxLifetime !== undefined) storm.maxLifetime = data.maxLifetime;
        if (data.lifetime !== undefined) storm.lifetime = data.lifetime;

        storm.dissipating = !!data.dissipating;
        if (data.dissipateStart !== undefined) storm.dissipateStart = data.dissipateStart;
        if (data.dissipateTime !== undefined) storm.dissipateTime = data.dissipateTime;

        if (data.effectRadius !== undefined) storm.effectRadius = data.effectRadius;
        if (data.visualRadius !== undefined) storm.visualRadius = data.visualRadius;
        if (data.lastEffectTime !== undefined) storm.lastEffectTime = data.lastEffectTime;
        if (data.effectCount !== undefined) storm.effectCount = data.effectCount;

        // Restore weapon flags (references will be relinked by StarSystem)
        storm.isWeaponSpawned = !!data.isWeaponSpawned;
        storm.ownerId = data.ownerId || null;
        storm._ownerId = data.ownerId || null; // Backup
        storm.attachedToId = data.attachedToId || null;
        storm._attachedToId = data.attachedToId || null; // Backup

        // Re-init particles based on restored intensity/radius
        storm.particles = [];
        storm.initParticles();

        return storm;
    }
}

if (typeof module !== 'undefined') {
    module.exports = { CosmicStorm };
}