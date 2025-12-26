// ****** nebula.js ******

class Nebula {
    constructor(x, y, radius, type = 'ion') {
        this.pos = createVector(x, y);
        this.radius = radius;
        this.type = type;
        this.color = this.getColorByType();
        this.opacity = 120;
        this.particleCount = Math.min(radius / 10, 100);
        this.particles = [];

        // Initialize particles
        this.initParticles();

        // Effect settings
        this.shieldDisruptionFactor = 1.0; // Complete shield disruption
        this.effectRadius = radius; // Gameplay effects apply at original radius
        this.visualRadius = radius * 1.43; // Visual extends beyond effect for soft fade warning halo

        // Add debug properties
        this.debug = false;
        this.affectedEntities = new Set();
        this.lastEffectTime = 0;
    }

    initParticles() {
        for (let i = 0; i < this.particleCount; i++) {
            const angle = random(TWO_PI);
            const dist = random(this.radius * 0.2, this.radius * 0.9);
            const pos = createVector(
                this.pos.x + cos(angle) * dist,
                this.pos.y + sin(angle) * dist
            );

            this.particles.push({
                pos: pos,
                velocity: p5.Vector.random2D().mult(random(0.1, 0.3)),
                size: random(2, 10),
                opacity: random(50, 200),
                angle: random(TWO_PI)
            });
        }
    }

    getColorByType() {
        switch (this.type) {
            case 'ion':
                return [100, 150, 255]; // Blue-ish
            case 'radiation':
                return [150, 255, 100]; // Green-ish
            case 'emp':
                return [180, 100, 255]; // Purple-ish
            default:
                return [150, 150, 255]; // Default blue
        }
    }

    update() {
        // Frame-rate independent time scaling
        const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;

        // Update nebula particles
        const posX = this.pos.x;
        const posY = this.pos.y;
        const maxDist = this.radius * 0.9;
        for (let i = 0, len = this.particles.length; i < len; i++) {
            const particle = this.particles[i];
            // Move particles slowly (frame-rate independent)
            particle.pos.add(p5.Vector.mult(particle.velocity, timeScale));

            // Keep particles within nebula bounds
            const dx = particle.pos.x - posX;
            const dy = particle.pos.y - posY;
            const distFromCenterSq = dx * dx + dy * dy;
            const maxDistSq = maxDist * maxDist;
            if (distFromCenterSq > maxDistSq) {
                // Push back toward center
                const distFromCenter = Math.sqrt(distFromCenterSq);
                const toCenterX = (posX - particle.pos.x) / distFromCenter * 0.5 * timeScale;
                const toCenterY = (posY - particle.pos.y) / distFromCenter * 0.5 * timeScale;
                particle.velocity.x += toCenterX;
                particle.velocity.y += toCenterY;
            }

            // Slowly rotate particles (frame-rate independent)
            particle.angle += 0.01 * timeScale;
        }
    }

    draw(screenBounds) {
        // Only draw if in view
        if (!this.isInView(screenBounds)) return;

        push();

        // Use Canvas 2D API for efficient radial gradient
        const ctx = drawingContext;

        // Use 'screen' blending so overlaps get denser without turning solid/muddy
        ctx.save();
        const prevOp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'screen';

        // Create a radial gradient - using larger visual radius for soft fade
        const outerRadius = this.visualRadius;
        const gradient = ctx.createRadialGradient(
            this.pos.x, this.pos.y, 0,           // Inner circle (center point, radius 0)
            this.pos.x, this.pos.y, outerRadius  // Outer circle (same center, visual radius)
        );

        // Add color stops for smooth gradient
        const r = this.color[0];
        const g = this.color[1];
        const b = this.color[2];

        // Start with high opacity in center, fade to transparent at edge for natural look
        const baseAlpha = this.opacity / 255; // typically ~0.47
        const a0 = baseAlpha * 0.9;
        const a1 = baseAlpha * 0.75;
        const a2 = baseAlpha * 0.55;
        const a3 = baseAlpha * 0.35;
        const a4 = baseAlpha * 0.15;
        gradient.addColorStop(0, `rgba(${r}, ${g}, ${b}, ${a0})`);
        gradient.addColorStop(0.3, `rgba(${r}, ${g}, ${b}, ${a1})`);
        gradient.addColorStop(0.5, `rgba(${r}, ${g}, ${b}, ${a2})`);
        gradient.addColorStop(0.7, `rgba(${r}, ${g}, ${b}, ${a3})`);
        gradient.addColorStop(0.85, `rgba(${r}, ${g}, ${b}, ${a4})`);
        gradient.addColorStop(1, `rgba(${r}, ${g}, ${b}, 0)`);

        // Apply gradient to context
        ctx.fillStyle = gradient;

        // Draw circle with the gradient - using the visual radius for soft edge
        ctx.beginPath();
        ctx.arc(this.pos.x, this.pos.y, outerRadius, 0, TWO_PI);
        ctx.fill();

        // Draw particles with additive blending too
        for (let particle of this.particles) {
            push();
            translate(particle.pos.x, particle.pos.y);
            rotate(particle.angle);

            fill(this.color[0], this.color[1], this.color[2], particle.opacity);
            noStroke();
            ellipse(0, 0, particle.size);

            // Add glow for some particles
            if (particle.size > 5) {
                fill(this.color[0], this.color[1], this.color[2], particle.opacity * 0.3);
                ellipse(0, 0, particle.size * 2);
            }

            pop();
        }

        // Restore compositing
        ctx.globalCompositeOperation = prevOp;
        ctx.restore();

        // Add debug visualization if enabled
        if (this.debug) {
            // Draw effect boundary
            strokeWeight(2);
            stroke(255, 255, 0, 100);
            noFill();
            ellipse(this.pos.x, this.pos.y, this.effectRadius * 2);

            // Draw debug text
            fill(255);
            noStroke();
            textSize(STATION_TEXT_SIZE.SMALL);
            textAlign(CENTER);
            text(`${this.type} nebula`, this.pos.x, this.pos.y - this.radius - 20);
            text(`Affected: ${this.affectedEntities.size}`, this.pos.x, this.pos.y - this.radius - 40);

            // Draw connection lines to affected entities
            stroke(255, 255, 0, 100);
            strokeWeight(1);
            for (let entityId of this.affectedEntities) {
                let entity = this.findEntityById(entityId);
                if (entity && entity.pos) {
                    line(this.pos.x, this.pos.y, entity.pos.x, entity.pos.y);
                }
            }
        }

        pop();
    }

    // Check if nebula is in view (for culling)
    isInView(screenBounds) {
        return (
            this.pos.x + this.visualRadius >= screenBounds.left &&
            this.pos.x - this.visualRadius <= screenBounds.right &&
            this.pos.y + this.visualRadius >= screenBounds.top &&
            this.pos.y - this.visualRadius <= screenBounds.bottom
        );
    }

    // Check if an entity is within the nebula's effect radius
    contains(entityPos) {
        if (!entityPos) return false;
        return p5.Vector.dist(this.pos, entityPos) <= this.effectRadius;
    }

    // Apply effects to ships within the nebula
    applyEffects(entity) {
        // Get consistent entity ID first
        const entityId = entity instanceof Player ? 'player' : (entity?.id || Date.now());

        if (!entity || !this.contains(entity.pos)) {
            // If entity was previously affected but is now out of range
            if (entity && this.affectedEntities.has(entityId)) {
                this.affectedEntities.delete(entityId);
                if (this.debug || (typeof DEBUG_ENV !== 'undefined' && DEBUG_ENV)) {
                    console.log(`Entity ${entityId} left ${this.type} nebula`);
                }

                // Reset affected status
                if (this.type === 'ion') {
                    entity.shieldsDisabled = false;
                    if (entity instanceof Player) {
                        uiManager.addMessage("Shields back online", "#00ff00");
                    }
                }
                if (this.type === 'emp') {
                    entity.weaponsDisabled = false;
                    if (entity instanceof Player) {
                        uiManager.addMessage("Weapons systems restored", "#00ff00");
                    }
                }
                entity.inNebula = false; // Also reset the general nebula status
            }
            return;
        }

        // Entity is in nebula range - apply effects
        // Log first entry to nebula
        if (!this.affectedEntities.has(entityId)) {
            this.affectedEntities.add(entityId);
            if (this.debug || (typeof DEBUG_ENV !== 'undefined' && DEBUG_ENV)) {
                console.log(`Entity ${entityId} entered ${this.type} nebula`);
            }

            // Show UI message if it's the player
            if (entity instanceof Player) {
                let message = '';
                switch (this.type) {
                    case 'ion': message = "Entering ion nebula: Shields disabled!"; break;
                    case 'radiation': message = "Warning: Radiation nebula! Taking hull damage."; break;
                    case 'emp': message = "Caution: EMP nebula - weapons systems disabled!"; break;
                }
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage(message, '#ff9900');
                }
            }
        }

        // Apply type-specific effects
        switch (this.type) {
            case 'ion':
                // Disable shields
                entity.shieldsDisabled = true;
                entity.shield = 0;
                entity.inNebula = true;
                break;

            case 'radiation':
                // Slowly damage hull
                if (random() < 0.05) {
                    // Provide active system reference if available for correct targeting updates
                    const activeSystem = (window.gameStateManager && gameStateManager.activeSystem) ? gameStateManager.activeSystem : null;
                    if (typeof entity.takeDamage === 'function') {
                        entity.takeDamage(1, null, activeSystem);
                    }
                    if (this.debug && millis() - this.lastEffectTime > 1000) {
                        console.log(`Radiation damage applied to ${entityId}`);
                        this.lastEffectTime = millis();
                    }
                }
                entity.inNebula = true;
                break;

            case 'emp':
                // Temporarily disable weapons
                entity.weaponsDisabled = true;
                entity.inNebula = true;
                break;
        }
    }

    // Helper method to find entity by ID in the system
    findEntityById(id) {
        if (!window.gameStateManager || !gameStateManager.activeSystem) return null;
        const system = gameStateManager.activeSystem;

        if (id === 'player') return system.player;

        // Use O(1) Map lookup if available, fallback to O(n) array search
        return system.enemiesById?.get(id)
            || system.enemies?.find(e => e?.id === id)
            || null;
    }

    // Add this new method to Nebula class
    toggleDebug() {
        this.debug = !this.debug;
        console.log(`Nebula ${this.type} debug mode: ${this.debug ? 'ON' : 'OFF'}`);
        return this.debug;
    }

    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            radius: this.radius,
            type: this.type,
            color: this.color
        };
    }

    static fromJSON(data) {
        return new Nebula(data.pos.x, data.pos.y, data.radius, data.type);
    }
}