/**
 * ThrustParticle class creates and manages particle effects for ship engines.
 * Creates a dynamic, responsive exhaust trail that follows ships when thrusting.
 */
class ThrustParticle {
    constructor(x, y, angle, shipSize, baseColor = [255, 120, 30]) {
        // Position is relative to ship's exhaust point
        this.pos = createVector(x, y);
        
        // Create velocity vector pointing opposite to ship's direction
        // with some randomization for spread
        const speed = random(0.5, 2.5);
        // Angle is in radians, add PI to reverse direction and small random spread
        const spreadAngle = angle + PI + random(-0.2, 0.2);
        // Ensure this is actually radians
        // These are small radian values (~11 degrees) for random spread
        this.vel = p5.Vector.fromAngle(spreadAngle).mult(speed);
        
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
 */
class ThrustManager {
    constructor() {
        this.particles = [];
        this.maxParticles = 100; // Adjust based on performance needs
    }
    
    createThrust(shipPos, shipAngle, shipSize, thrustCount = 2) {
        // Create multiple particles per frame when thrusting
        for (let i = 0; i < thrustCount; i++) {
            // Calculate spawn position at ship's rear
            const offset = -shipSize * 0.5; // Negative offset to place at rear
            const spawnPoint = p5.Vector.fromAngle(shipAngle).mult(offset);
            
            // Determine color based on ship type/size (can be customized)
            let baseColor = [255, 120, 30]; // Default orange
            
            // Larger ships have more blue-ish thrust
            if (shipSize > 60) {
                baseColor = [200, 180, 255]; // Bluish for large ships
            } 
            // Small ships more reddish
            else if (shipSize < 30) {
                baseColor = [255, 80, 30]; // More red for small ships
            }
            
            // Create the particle
            const particle = new ThrustParticle(
                shipPos.x + spawnPoint.x,
                shipPos.y + spawnPoint.y,
                shipAngle,
                shipSize,
                baseColor
            );
            
            this.particles.push(particle);
            
            // Limit maximum particles
            if (this.particles.length > this.maxParticles) {
                this.particles.shift(); // Remove oldest particle
            }
        }
    }
    
    update() {
        // Update all particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            this.particles[i].update();
            
            // Remove dead particles
            if (this.particles[i].isDead()) {
                this.particles.splice(i, 1);
            }
        }
    }
    
    draw() {
        // Draw all particles
        for (const particle of this.particles) {
            particle.draw();
        }
    }
}