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

    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            vel: { x: this.vel.x, y: this.vel.y },
            size: this.size,
            baseColor: [...this.baseColor],
            currentColor: [...this.currentColor],
            maxLife: this.maxLife,
            life: this.life,
            shrinkRate: this.shrinkRate
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        // Since constructor takes specific args, we create dummy then populate
        const t = new ThrustParticle();

        if (data.pos) t.pos.set(data.pos.x, data.pos.y);
        if (data.vel) t.vel.set(data.vel.x, data.vel.y);

        t.size = data.size || 1;
        t.baseColor = data.baseColor || [255, 120, 30];
        t.currentColor = data.currentColor || [...t.baseColor, 255];
        t.maxLife = data.maxLife || 20;
        t.life = (data.life !== undefined) ? data.life : 20;
        t.shrinkRate = data.shrinkRate || 0.95;

        return t;
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
        this.maxParticles = 1000;

        // Initialize particle pool with reasonable sizes
        this.particlePool = new ObjectPool(ThrustParticle, 100, this.maxParticles, "ThrustParticle");
    }

    createThrust(shipPos, shipAngle, shipSize, thrustCount = 2) {
        // Create multiple particles per frame when thrusting
        for (let i = 0; i < thrustCount; i++) {
            // Calculate spawn position at ship's rear
            // Increased offset to -0.65 to ensure exhaust clears the 3D ship hull
            const offset = -shipSize * 0.65;
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

        for (let i = 0, len = activeParticles.length; i < len; i++) {
            const particle = activeParticles[i];
            particle.update();

            // Return dead particles to the pool
            if (particle.isDead()) {
                this.particlePool.release(particle);
                this.particles.delete(particle); // For backward compatibility
            }
        }
    }

    draw() {
        // Draw all active particles - iterate directly over Set
        for (const particle of this.particlePool.active) {
            particle.draw();
        }
    }

    // Add method to get stats about the pool
    getPoolStats() {
        if (!this.particlePool) return null;

        return {
            activeCount: this.particlePool.active ? this.particlePool.active.size : 0,
            availableCount: this.particlePool.available ? this.particlePool.available.length : 0,
            maxSize: this.maxParticles,
            utilization: this.particlePool.active ?
                (this.particlePool.active.size / this.maxParticles * 100).toFixed(1) + '%' : '0%',
            // Fix these property names:
            created: this.particlePool.totalCreated || 0,
            reused: this.particlePool.totalReused || 0,
            reuseRate: this.particlePool.totalCreated && this.particlePool.totalReused ?
                ((this.particlePool.totalReused / (this.particlePool.totalCreated + this.particlePool.totalReused)) * 100).toFixed(1) + '%' : '0%'
        };
    }
}

/**
// Updated monitoring function
function monitorThrustReuse() {
  console.group("🚀 Thrust Particle Pool Stats");
  
  const playerStats = player?.thrustManager?.getPoolStats();
    PARTICLE_LOG(`Player: ${playerStats?.reused || 0} reused / ${playerStats?.created || 0} created`);
  
  const enemies = player?.currentSystem?.enemies || [];
  let totalActive = 0;
  let totalReused = 0;
  let totalCreated = 0;
  
  enemies.forEach(enemy => {
    if (enemy?.thrustManager) {
      const stats = enemy.thrustManager.getPoolStats();
      if (stats) {
        totalActive += stats.activeCount || 0;
        totalReused += stats.reused || 0;
        totalCreated += stats.created || 0;
      }
    }
  });
  
    PARTICLE_LOG(`Enemies (${enemies.length}): ${totalReused} reused / ${totalCreated} created`);
    PARTICLE_LOG(`Active particles: ${totalActive}`);
  
  console.groupEnd();
}

// Run every 5 seconds
window.thrustMonitor = setInterval(monitorThrustReuse, 5000);
 */