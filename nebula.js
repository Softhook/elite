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
        if (!entity || !this.contains(entity.pos)) return;
        
        switch(this.type) {
            case 'ion':
                // Disable shields
                entity.shieldsDisabled = true;
                break;
            case 'radiation':
                // Slowly damage hull
                if (random() < 0.05) entity.takeDamage(1); // Periodic small damage
                break;
            case 'emp':
                // Temporarily disable weapons
                entity.weaponsDisabled = true;
                break;
        }
    }
}