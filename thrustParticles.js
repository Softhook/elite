/**
 * ThrustParticle class creates and manages particle effects for ship engines.
 * Creates a dynamic, responsive exhaust trail that follows ships when thrusting.
 */
class ThrustParticle {
    constructor(x, y, angle, shipSize, baseColor = [255, 120, 30]) {
        // Create vectors just once at construction time
        this.pos = createVector(0, 0);
        this.vel = createVector(0, 0);
        
        // Initialize with default values
        this.size = 1;
        this.baseColor = [255, 120, 30];
        this.currentColor = [...this.baseColor, 255];
        this.maxLife = 20;
        this.life = this.maxLife;
        this.shrinkRate = 0.95;
        
        // If we have parameters, initialize with them
        if (x !== undefined) {
            this.reset(x, y, angle, shipSize, baseColor);
        }
    }
    
    // Add reset method for object pooling
    reset(x, y, angle, shipSize, baseColor = [255, 120, 30]) {
        // Position is relative to ship's exhaust point
        this.pos.set(x, y);
        
        // Create velocity vector pointing opposite to ship's direction
        const speed = random(0.5, 2.5);
        const spreadAngle = angle + PI + random(-0.2, 0.2);
        this.vel.set(cos(spreadAngle), sin(spreadAngle)).mult(speed);
        
        // Size based on ship size but with variation
        this.size = random(shipSize * 0.05, shipSize * 0.15);
        
        // Color properties
        this.baseColor = baseColor;
        this.currentColor = [...baseColor, 255]; // Add alpha
        
        // Particle lifetime properties
        this.maxLife = random(15, 30);
        this.life = this.maxLife;
        
        // Shrink rate
        this.shrinkRate = random(0.92, 0.97);
        
        return this;
    }
    
    update() {
        // Update position
        this.pos.add(this.vel);
        
        // Apply drag
        this.vel.mult(0.96);
        
        // Reduce life
        this.life--;
        
        // Shrink particle
        this.size *= this.shrinkRate;
        
        // Update color alpha based on remaining life
        const alpha = map(this.life, 0, this.maxLife, 0, 255);
        this.currentColor[3] = alpha;
        
        // Transition color from yellow/orange core to red/smoke as it ages
        if (this.life < this.maxLife * 0.6) {
            // Gradually shift to darker red/grey
            this.currentColor[0] = map(this.life, 0, this.maxLife * 0.6, 80, this.baseColor[0]);
            this.currentColor[1] = map(this.life, 0, this.maxLife * 0.6, 80, this.baseColor[1]);
            this.currentColor[2] = map(this.life, 0, this.maxLife * 0.6, 80, this.baseColor[2]);
        }
    }
    
    draw() {
        noStroke();
        fill(this.currentColor[0], this.currentColor[1], this.currentColor[2], this.currentColor[3]);
        ellipse(this.pos.x, this.pos.y, this.size, this.size);
    }
    
    isDead() {
        return this.life <= 0 || this.size < 0.5;
    }
}

/**
 * ThrustManager handles particle creation and management for ship engines.
 * Uses object pooling for better performance.
 */
class ThrustManager {
    constructor() {
        // Add backward compatibility properties
        this.particles = new Set();
        this.maxParticles = 500;
        
        // Initialize particle pool with reasonable sizes
        this.particlePool = new ObjectPool(ThrustParticle, 100, this.maxParticles, "ThrustParticle");
    }
    
    createThrust(shipPos, shipAngle, shipSize, thrustCount = 2) {
        // Create multiple particles per frame when thrusting
        for (let i = 0; i < thrustCount; i++) {
            // Calculate spawn position at ship's rear
            const offset = -shipSize * 0.5;
            const spawnPoint = p5.Vector.fromAngle(shipAngle).mult(offset);
            
            // Determine color based on ship type/size
            let baseColor = [255, 120, 30]; // Default orange
            
            if (shipSize > 60) {
                baseColor = [200, 180, 255]; // Bluish for large ships
            } 
            else if (shipSize < 30) {
                baseColor = [255, 80, 30]; // More red for small ships
            }
            
            // Get a particle from the pool
            const particle = this.particlePool.get(
                shipPos.x + spawnPoint.x,
                shipPos.y + spawnPoint.y,
                shipAngle,
                shipSize,
                baseColor
            );
            
            // Maintain backward compatibility with particles set
            if (particle) {
                this.particles.add(particle);
            }
        }
    }
    
    update() {
        // Use a temporary array since we'll be modifying while iterating
        const activeParticles = Array.from(this.particlePool.active);
        
        for (const particle of activeParticles) {
            particle.update();
            
            // Return dead particles to the pool
            if (particle.isDead()) {
                this.particlePool.release(particle);
                this.particles.delete(particle); // For backward compatibility
            }
        }
    }
    
    draw() {
        // Draw all active particles
        for (const particle of this.particlePool.active) {
            particle.draw();
        }
    }
    
    // Add method to get stats about the pool
    getPoolStats() {
        return this.particlePool ? this.particlePool.getStats() : null;
    }
}