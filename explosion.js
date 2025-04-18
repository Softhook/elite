/**
 * Explosion class creates particle-based explosions when ships are destroyed.
 * The animation has multiple phases - initial flash, debris ejection, and fading smoke.
 */
class Explosion {
    constructor(x, y, size, baseColor = [255, 160, 30]) {
        this.pos = createVector(x, y);
        this.size = size || 30;
        this.baseColor = baseColor;
        
        // Animation properties
        this.duration = 60; // Frames until complete
        this.currentFrame = 0;
        this.particles = [];
        this.debris = [];
        
        // Create initial explosion particles
        this.generateParticles();
        this.generateDebris();
        
        // Sound effect (if available)
        if (typeof soundManager !== 'undefined' && soundManager?.playExplosion) {
            soundManager.playExplosion(size);
        }
    }
    
    generateParticles() {
        // Create main explosion particles
        const particleCount = floor(this.size / 2) + 15;
        
        for (let i = 0; i < particleCount; i++) {
            // Randomize velocity direction and speed
            const angle = random(TWO_PI);
            const speed = random(1, 4) * (this.size / 30);
            const vel = p5.Vector.fromAngle(angle).mult(speed);
            
            // Randomize particle properties
            this.particles.push({
                pos: this.pos.copy(),
                vel: vel,
                size: random(this.size/5, this.size/2.5),
                color: [...this.baseColor],
                opacity: 255,
                decay: random(3, 6),
                drag: random(0.92, 0.96)
            });
        }
        
        // Add bright core particles
        for (let i = 0; i < particleCount/2; i++) {
            const angle = random(TWO_PI);
            const speed = random(0.5, 3) * (this.size / 30);
            const vel = p5.Vector.fromAngle(angle).mult(speed);
            
            this.particles.push({
                pos: this.pos.copy(),
                vel: vel,
                size: random(this.size/6, this.size/3),
                color: [255, 255, 220], // Bright yellow-white center
                opacity: 255,
                decay: random(5, 10),
                drag: random(0.9, 0.95)
            });
        }
    }
    
    generateDebris() {
        // Create ship debris particles
        const debrisCount = floor(this.size / 8) + 5;
        
        for (let i = 0; i < debrisCount; i++) {
            // Randomize velocity
            const angle = random(TWO_PI);
            const speed = random(2, 7) * (this.size / 30);
            const vel = p5.Vector.fromAngle(angle).mult(speed);
            
            // Create angular debris
            const size = random(3, 8);
            const rotation = random(TWO_PI);
            const rotSpeed = random(-0.2, 0.2);
            
            this.debris.push({
                pos: this.pos.copy(),
                vel: vel,
                size: size,
                rotation: rotation,
                rotSpeed: rotSpeed,
                vertices: this.generateDebrisShape(size),
                color: this.adjustColor([...this.baseColor], -30), // Darker than base
                opacity: 255,
                decay: random(1.5, 3),
                drag: random(0.96, 0.98)
            });
        }
    }
    
    generateDebrisShape(size) {
        // Create random polygon shape for debris
        const vertices = [];
        const pointCount = floor(random(3, 6));
        
        for (let i = 0; i < pointCount; i++) {
            const angle = map(i, 0, pointCount, 0, TWO_PI);
            const radius = size * random(0.5, 1.0);
            vertices.push(createVector(cos(angle) * radius, sin(angle) * radius));
        }
        
        return vertices;
    }
    
    adjustColor(color, amount) {
        // Adjust color brightness while keeping within valid range
        return color.map(c => constrain(c + amount, 0, 255));
    }
    
    update() {
        this.currentFrame++;
        
        // Generate second wave of particles
        if (this.currentFrame === 5) {
            this.generateSecondaryExplosion();
        }
        
        // Update particles
        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            p.pos.add(p.vel);
            p.vel.mult(p.drag);
            p.opacity -= p.decay;
            
            if (p.opacity <= 0) {
                this.particles.splice(i, 1);
            }
        }
        
        // Update debris
        for (let i = this.debris.length - 1; i >= 0; i--) {
            const d = this.debris[i];
            d.pos.add(d.vel);
            d.vel.mult(d.drag);
            d.rotation += d.rotSpeed;
            d.opacity -= d.decay;
            
            if (d.opacity <= 0) {
                this.debris.splice(i, 1);
            }
        }
    }
    
    generateSecondaryExplosion() {
        // Add secondary burst
        const burstCount = floor(this.size / 4) + 8;
        
        for (let i = 0; i < burstCount; i++) {
            const angle = random(TWO_PI);
            const speed = random(3, 6) * (this.size / 30);
            const vel = p5.Vector.fromAngle(angle).mult(speed);
            
            this.particles.push({
                pos: this.pos.copy(),
                vel: vel,
                size: random(this.size/4, this.size/2),
                color: this.adjustColor([...this.baseColor], 50), // Brighter
                opacity: 200,
                decay: random(4, 8),
                drag: random(0.92, 0.96)
            });
        }
    }
    
    draw() {
        push();
        blendMode(ADD); // Makes overlapping particles brighter
        noStroke();
        
        // Draw initial flash
        if (this.currentFrame < 10) {
            const flashOpacity = map(this.currentFrame, 0, 10, 150, 0);
            const flashSize = this.size * map(this.currentFrame, 0, 10, 1.0, 2.0);
            fill(255, 255, 200, flashOpacity);
            ellipse(this.pos.x, this.pos.y, flashSize, flashSize);
        }
        
        // Draw particles
        for (const p of this.particles) {
            fill(p.color[0], p.color[1], p.color[2], p.opacity);
            ellipse(p.pos.x, p.pos.y, p.size, p.size);
        }
        
        // Reset blend mode for debris
        blendMode(BLEND);
        
        // Draw debris
        for (const d of this.debris) {
            push();
            translate(d.pos.x, d.pos.y);
            rotate(d.rotation);
            fill(d.color[0], d.color[1], d.color[2], d.opacity);
            stroke(0, min(d.opacity, 100));
            strokeWeight(1);
            
            beginShape();
            for (const v of d.vertices) {
                vertex(v.x, v.y);
            }
            endShape(CLOSE);
            pop();
        }
        
        pop();
    }
    
    isDone() {
        return this.particles.length === 0 && 
               this.debris.length === 0 && 
               this.currentFrame > 10;
    }
}