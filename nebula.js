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
        this.effectRadius = radius; // Same as visual radius

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
        switch(this.type) {
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
        // Update nebula particles
        for (let particle of this.particles) {
            // Move particles slowly
            particle.pos.add(particle.velocity);
            
            // Keep particles within nebula bounds
            const distFromCenter = p5.Vector.dist(this.pos, particle.pos);
            if (distFromCenter > this.radius * 0.9) {
                // Push back toward center
                const toCenter = p5.Vector.sub(this.pos, particle.pos);
                toCenter.normalize().mult(0.5);
                particle.velocity.add(toCenter);
            }
            
            // Slowly rotate particles
            particle.angle += 0.01;
        }
    }
    
    draw(screenBounds) {
        // Only draw if in view
        if (!this.isInView(screenBounds)) return;
        
        push();
        
        // Draw main nebula cloud
        noStroke();
        for (let i = 0; i < 5; i++) {
            const alpha = map(i, 0, 4, this.opacity, 20);
            const size = map(i, 0, 4, this.radius * 0.5, this.radius * 2);
            
            fill(this.color[0], this.color[1], this.color[2], alpha);
            ellipse(this.pos.x, this.pos.y, size);
        }
        
        // Draw particles
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
            textSize(16);
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
            this.pos.x + this.radius >= screenBounds.left &&
            this.pos.x - this.radius <= screenBounds.right &&
            this.pos.y + this.radius >= screenBounds.top &&
            this.pos.y - this.radius <= screenBounds.bottom
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
                console.log(`Entity ${entityId} left ${this.type} nebula`);
                
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
            console.log(`Entity ${entityId} entered ${this.type} nebula`);
            
            // Show UI message if it's the player
            if (entity instanceof Player) {
                let message = '';
                switch(this.type) {
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
        switch(this.type) {
            case 'ion':
                // Disable shields
                entity.shieldsDisabled = true;
                entity.inNebula = true;
                break;
                
            case 'radiation':
                // Slowly damage hull
                if (random() < 0.05) {
                    entity.takeDamage(1); // Periodic small damage
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
        
        // Search in enemies
        if (system.enemies) {
            for (let enemy of system.enemies) {
                if (enemy.id === id) return enemy;
            }
        }
        
        return null;
    }

    // Add this new method to Nebula class
    toggleDebug() {
        this.debug = !this.debug;
        console.log(`Nebula ${this.type} debug mode: ${this.debug ? 'ON' : 'OFF'}`);
        return this.debug;
    }
}