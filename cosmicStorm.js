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
        this.debug = false;
        this.affectedEntities = new Set();
        this.lastEffectTime = 0;
        this.effectCount = 0;
    }

    // --- Color and Particle Helpers ---
    getColorByType() {
        switch(this.type) {
            case 'electromagnetic': return [80, 100, 255];
            case 'radiation': return [100, 255, 50];
            case 'gravitational': return [255, 200, 50];
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
            console.log(`${this.type} storm beginning to dissipate`);
        }
        if (this.dissipating) {
            const dissipateProgress = (millis() - this.dissipateStart) / this.dissipateTime;
            this.intensity = map(dissipateProgress, 0, 1, this.intensity, 0);
            if (dissipateProgress >= 1) {
                console.log(`${this.type} storm has completely dissipated`);
                return false;
            }
        }
        this.pos.add(this.velocity);
        this.velocity.rotate(random(-0.1, 0.1));
        for (let particle of this.particles) {
            particle.angle += particle.rotationSpeed;
            particle.pos.x = this.pos.x + cos(particle.angle) * (particle.distFromCenter * particle.spiralFactor);
            particle.pos.y = this.pos.y + sin(particle.angle) * (particle.distFromCenter * particle.spiralFactor);
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
        this.lightningBolts = [];
        const boltCount = floor(random(1, 4) * this.intensity);
        for (let i = 0; i < boltCount; i++) {
            const startAngle = random(TWO_PI);
            const endAngle = startAngle + random(-PI/2, PI/2);
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
            const segments = floor(random(4, 8));
            const points = [start];
            for (let j = 1; j < segments; j++) {
                const t = j / segments;
                const midX = lerp(start.x, end.x, t);
                const midY = lerp(start.y, end.y, t);
                const perpX = -(end.y - start.y);
                const perpY = end.x - start.x;
                const perpLen = sqrt(perpX * perpX + perpY * perpY);
                const jitterAmt = this.radius * 0.15 * (1 - t) * random(0.5, 1.5);
                points.push({
                    x: midX + (perpX / perpLen) * jitterAmt * (random() > 0.5 ? 1 : -1),
                    y: midY + (perpY / perpLen) * jitterAmt * (random() > 0.5 ? 1 : -1)
                });
            }
            points.push(end);
            this.lightningBolts.push(points);
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
        
        // Create a radial gradient
        const outerRadius = this.radius;
        const gradient = ctx.createRadialGradient(
            this.pos.x, this.pos.y, 0,           // Inner circle (center point, radius 0)
            this.pos.x, this.pos.y, outerRadius  // Outer circle
        );
        
        // Add color stops for smooth gradient
        const r = this.color[0];
        const g = this.color[1];
        const b = this.color[2];
        const baseAlpha = 100 * this.intensity / 255; // Convert to 0-1 range for RGBA
        
        // Create smooth gradient that doesn't fully fade out
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${baseAlpha})`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.85})`);
        gradient.addColorStop(0.6, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.65})`);
        gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.45})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, ${baseAlpha * 0.3})`);
        
        // Apply gradient to context
        ctx.fillStyle = gradient;
        
        // Draw circle with the gradient
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, this.radius * 1.5, 0, TWO_PI);
        ctx.fill();
    }

    drawParticles() {
        for (let particle of this.particles) {
            noStroke();
            fill(
                this.color[0],
                this.color[1],
                this.color[2],
                particle.opacity * this.intensity
            );
            ellipse(particle.pos.x, particle.pos.y, particle.size);
        }
    }

    drawLightning() {
        if (this.lightningBolts.length === 0) return;
        for (let bolt of this.lightningBolts) {
            stroke(255, 255, 255, 200);
            strokeWeight(3);
            for (let i = 0; i < bolt.length - 1; i++) {
                line(bolt[i].x, bolt[i].y, bolt[i+1].x, bolt[i+1].y);
            }
            stroke(this.color[0], this.color[1], this.color[2], 100);
            strokeWeight(6);
            for (let i = 0; i < bolt.length - 1; i++) {
                line(bolt[i].x, bolt[i].y, bolt[i+1].x, bolt[i+1].y);
            }
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
        textSize(16);
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
            this.pos.x + this.radius >= screenBounds.left &&
            this.pos.x - this.radius <= screenBounds.right &&
            this.pos.y + this.radius >= screenBounds.top &&
            this.pos.y - this.radius <= screenBounds.bottom
        );
    }

    applyEffects(entity) {
        if (!entity || !entity.pos) return;
        const dist = p5.Vector.dist(entity.pos, this.pos);
        const entityId = entity.id || (entity instanceof Player ? 'player' : Date.now());
        if (dist > this.radius) {
            if (this.affectedEntities.has(entityId)) {
                this.affectedEntities.delete(entityId);
                if (this.type === 'electromagnetic') entity.targetingDisruption = 0;
                if (this.debug) console.log(`Entity ${entityId} left ${this.type} storm`);
            }
            return;
        }
        const effectStrength = map(dist, 0, this.radius, 1, 0) * this.intensity;
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
        switch(this.type) {
            case 'electromagnetic': message = "Warning: Electromagnetic storm disrupting targeting!"; break;
            case 'gravitational': message = "Caution: Gravitational storm affecting navigation!"; break;
            case 'radiation': message = "Alert: Radiation storm causing hull damage!"; break;
        }
        uiManager.addMessage(message, '#ff0000');
    }

    applyTypeEffect(entity, effectStrength, entityId) {
        switch (this.type) {
            case 'electromagnetic':
                entity.targetingDisruption = effectStrength;
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
                    entity.takeDamage(damage);
                    this.effectCount++;
                    if (this.debug) {
                        console.log(`Radiation damage: ${damage.toFixed(1)} to ${entityId}`);
                    }
                }
                break;
        }
    }

    findEntityById(id) {
        if (!window.gameStateManager || !gameStateManager.activeSystem) return null;
        const system = gameStateManager.activeSystem;
        if (id === 'player') return system.player;
        if (system.enemies) {
            for (let enemy of system.enemies) {
                if (enemy.id === id) return enemy;
            }
        }
        return null;
    }

    toggleDebug() {
        this.debug = !this.debug;
        console.log(`Storm ${this.type} debug mode: ${this.debug ? 'ON' : 'OFF'}`);
        return this.debug;
    }
}