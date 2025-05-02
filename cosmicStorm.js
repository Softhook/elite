// ****** cosmicStorm.js ******

class CosmicStorm {
    constructor(x, y, radius, type = 'electromagnetic') {
        this.pos = createVector(x, y);
        this.radius = radius;
        this.type = type;
        this.velocity = p5.Vector.random2D().mult(random(0.3, 0.8));
        this.color = this.getColorByType();
        
        // Storm intensity (affects visual and gameplay)
        this.intensity = random(0.5, 1.0);
        
        // Particles for visual effect
        this.maxParticles = Math.min(radius / 5, 150);
        this.particles = [];
        this.lightningTimer = 0;
        this.lightningDuration = 0;
        this.lightningBolts = [];
        
        // Initialize particles
        this.initParticles();
        
        // Add debug properties
        this.debug = false;
        this.affectedEntities = new Set();
        this.lastEffectTime = 0;
        this.effectCount = 0;
    }
    
    getColorByType() {
        switch(this.type) {
            case 'electromagnetic':
                return [80, 100, 255]; // Blue electric
            case 'radiation':
                return [100, 255, 50]; // Green radiation
            case 'gravitational':
                return [255, 200, 50]; // Yellow/orange gravity
            default:
                return [100, 150, 255]; // Default blue
        }
    }
    
    initParticles() {
        const particleCount = floor(this.maxParticles * this.intensity);
        
        for (let i = 0; i < particleCount; i++) {
            // Create spiral pattern for particles
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
                angle: angle,
                distFromCenter: dist,
                rotationSpeed: random(0.005, 0.02) * (random() > 0.5 ? 1 : -1),
                spiralFactor: random(0.9, 1.1)
            });
        }
    }
    
    update() {
        // Move the entire storm
        this.pos.add(this.velocity);
        
        // Slightly randomize movement
        this.velocity.rotate(random(-0.1, 0.1));
        
        // Update particles
        for (let particle of this.particles) {
            // Spiral motion
            particle.angle += particle.rotationSpeed;
            
            // Calculate new position based on spiral pattern
            particle.pos.x = this.pos.x + cos(particle.angle) * (particle.distFromCenter * particle.spiralFactor);
            particle.pos.y = this.pos.y + sin(particle.angle) * (particle.distFromCenter * particle.spiralFactor);
            
            // Occasionally change spiral factor for dynamic movement
            if (random() < 0.01) {
                particle.spiralFactor = constrain(
                    particle.spiralFactor + random(-0.05, 0.05),
                    0.7,
                    1.3
                );
            }
        }
        
        // Lightning effect (for electromagnetic storms)
        if (this.type === 'electromagnetic') {
            this.lightningTimer -= deltaTime;
            
            if (this.lightningTimer <= 0) {
                // Generate new lightning
                this.lightningTimer = random(500, 2000) / this.intensity;
                this.lightningDuration = random(100, 300);
                
                // Create lightning bolts
                this.generateLightning();
            } else if (this.lightningDuration > 0) {
                this.lightningDuration -= deltaTime;
                if (this.lightningDuration <= 0) {
                    this.lightningBolts = [];
                }
            }
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
            
            // Create lightning path
            const segments = floor(random(4, 8));
            const points = [start];
            
            for (let j = 1; j < segments; j++) {
                const t = j / segments;
                const midX = lerp(start.x, end.x, t);
                const midY = lerp(start.y, end.y, t);
                
                // Add jaggedness
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
    
    draw(screenBounds) {
        // Only draw if in view
        if (!this.isInView(screenBounds)) return;
        
        push();
        
        // Main storm cloud/aura
        noStroke();
        for (let i = 0; i < 3; i++) {
            fill(
                this.color[0],
                this.color[1],
                this.color[2],
                map(i, 0, 2, 100, 20) * this.intensity
            );
            ellipse(this.pos.x, this.pos.y, this.radius * map(i, 0, 2, 1, 1.5));
        }
        
        // Draw particles
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
        
        // Draw lightning if active
        if (this.lightningBolts.length > 0) {
            for (let bolt of this.lightningBolts) {
                stroke(255, 255, 255, 200);
                strokeWeight(3);
                for (let i = 0; i < bolt.length - 1; i++) {
                    line(bolt[i].x, bolt[i].y, bolt[i+1].x, bolt[i+1].y);
                }
                
                // Glow effect
                stroke(this.color[0], this.color[1], this.color[2], 100);
                strokeWeight(6);
                for (let i = 0; i < bolt.length - 1; i++) {
                    line(bolt[i].x, bolt[i].y, bolt[i+1].x, bolt[i+1].y);
                }
            }
        }
        
        // Add debug visualization if enabled
        if (this.debug) {
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
                let entity = this.findEntityById(entityId);
                if (entity && entity.pos) {
                    line(this.pos.x, this.pos.y, entity.pos.x, entity.pos.y);
                }
            }
        }
        
        pop();
    }
    
    // Check if storm is in view (for culling)
    isInView(screenBounds) {
        return (
            this.pos.x + this.radius >= screenBounds.left &&
            this.pos.x - this.radius <= screenBounds.right &&
            this.pos.y + this.radius >= screenBounds.top &&
            this.pos.y - this.radius <= screenBounds.bottom
        );
    }
    
    // Apply effect to entity based on storm type
    applyEffects(entity) {
        if (!entity || !entity.pos) return;
        
        // Calculate distance from entity to storm center
        const dist = p5.Vector.dist(entity.pos, this.pos);
        const entityId = entity.id || (entity instanceof Player ? 'player' : Date.now());
        
        if (dist > this.radius) {
            // If entity was previously affected but is now out of range, remove from tracking
            if (this.affectedEntities.has(entityId)) {
                this.affectedEntities.delete(entityId);
                
                // Reset effect flags
                if (this.type === 'electromagnetic') entity.targetingDisruption = 0;
                
                if (this.debug) {
                    console.log(`Entity ${entityId} left ${this.type} storm`);
                }
            }
            return;
        }
        
        // Entity is in storm range
        const effectStrength = map(dist, 0, this.radius, 1, 0) * this.intensity;
        
        // Add to affected entities list for debugging
        if (!this.affectedEntities.has(entityId)) {
            this.affectedEntities.add(entityId);
            if (this.debug) {
                console.log(`Entity ${entityId} entered ${this.type} storm`);
            }
            
            // Show UI message if it's the player
            if (entity instanceof Player) {
                let message = '';
                switch(this.type) {
                    case 'electromagnetic': message = "Warning: Electromagnetic storm disrupting targeting!"; break;
                    case 'gravitational': message = "Caution: Gravitational storm affecting navigation!"; break;
                    case 'radiation': message = "Alert: Radiation storm causing hull damage!"; break;
                }
                if (typeof uiManager !== 'undefined') {
                    uiManager.addMessage(message, '#ff0000');
                }
            }
        }
        
        // Apply type-specific effects
        switch (this.type) {
            case 'electromagnetic':
                // Temporarily disrupt targeting systems
                entity.targetingDisruption = effectStrength;
                if (this.debug && entity instanceof Player) {
                    console.log(`Targeting disruption: ${effectStrength.toFixed(2)}`);
                }
                break;
                
            case 'gravitational':
                // Pull ship toward center
                const pull = p5.Vector.sub(this.pos, entity.pos);
                pull.normalize().mult(effectStrength * 0.2);
                entity.vel.add(pull);
                
                if (this.debug && random() < 0.05) {
                    console.log(`Gravitational pull: ${effectStrength.toFixed(2)}`);
                }
                break;
                
            case 'radiation':
                // Damage shields/hull over time
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
        
        // Add visual effect on entity if it's the player and debug is on
        if (this.debug && entity instanceof Player) {
            // In the player.draw() method, we'd implement a way to show these effects
            entity.stormEffect = {
                type: this.type,
                strength: effectStrength
            };
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
    
    // Add this new method
    toggleDebug() {
        this.debug = !this.debug;
        console.log(`Storm ${this.type} debug mode: ${this.debug ? 'ON' : 'OFF'}`);
        return this.debug;
    }
}