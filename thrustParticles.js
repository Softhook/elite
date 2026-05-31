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
        // Frame-rate independent time scaling
        const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;

        // Update position (frame-rate independent)
        this.pos.add(p5.Vector.mult(this.vel, timeScale));

        // Apply drag (frame-rate independent)
        this.vel.mult(Math.pow(0.96, timeScale));

        // Reduce life (frame-rate independent)
        this.life -= timeScale;

        // Shrink particle (frame-rate independent)
        this.size *= Math.pow(this.shrinkRate, timeScale);

        // Update color alpha based on remaining life (inline map math)
        const alpha = Math.max(0, Math.min(255, (this.life / this.maxLife) * 255));
        this.currentColor[3] = alpha;

        // Transition color from yellow/orange core to red/smoke as it ages (inline map math)
        if (this.life < this.maxLife * 0.6) {
            const factor = Math.max(0, Math.min(1, this.life / (this.maxLife * 0.6)));
            this.currentColor[0] = 80 + (this.baseColor[0] - 80) * factor;
            this.currentColor[1] = 80 + (this.baseColor[1] - 80) * factor;
            this.currentColor[2] = 80 + (this.baseColor[2] - 80) * factor;
        }
    }

    draw() {
        const r = this.currentColor[0];
        const g = this.currentColor[1];
        const b = this.currentColor[2];
        const alpha = this.currentColor[3];

        if (alpha <= 1) return; // Completely invisible
        
        // Layer 1: Very wide, soft outer ambient glow
        if (this.size > 2.0 && alpha > 8.5) {
            fill(r, g, b, alpha * 0.12);
            ellipse(this.pos.x, this.pos.y, this.size * 3.5, this.size * 3.5);
        }
        
        // Layer 2: Medium halo glow
        if (this.size > 1.0 && alpha > 3) {
            fill(r, g, b, alpha * 0.35);
            ellipse(this.pos.x, this.pos.y, this.size * 2.0, this.size * 2.0);
        }
        
        // Layer 3: Hot inner core
        fill(r, g, b, alpha * 0.9);
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

    createThrust(shipPos, shipAngle, shipSize, thrustCount = 2, isBoosting = false) {
        // Create multiple particles per frame when thrusting
        for (let i = 0; i < thrustCount; i++) {
            // Calculate spawn position at ship's rear
            // Increased offset to -0.65 to ensure exhaust clears the 3D ship hull
            const offset = -shipSize * 0.65;
            const spawnPoint = p5.Vector.fromAngle(shipAngle).mult(offset);

            // Determine color based on ship type/size/boost
            let baseColor = [255, 120, 30]; // Default orange

            if (isBoosting) {
                // Electric blue / hot cyan / white plasma for boosting engines
                baseColor = random() < 0.45 ? [255, 255, 255] : [0, 160, 255];
            } else if (shipSize > 60) {
                baseColor = [170, 190, 255]; // Bluish for large ships
            } else if (shipSize < 30) {
                baseColor = [255, 70, 20]; // Hot red-orange for small ships
            }

            // Get a particle from the pool
            const particle = this.particlePool.get(
                shipPos.x + spawnPoint.x,
                shipPos.y + spawnPoint.y,
                shipAngle,
                shipSize,
                baseColor
            );

            // Adjust particle properties dynamically for dramatic effects
            if (particle) {
                if (isBoosting) {
                    particle.size *= random(1.5, 2.4); // Much thicker plumes
                    particle.vel.mult(random(1.8, 3.2)); // Expel backward much faster
                    particle.maxLife = random(25, 45); // Longer trail
                    particle.life = particle.maxLife;
                    particle.currentColor = [...baseColor, 255];
                } else {
                    particle.size *= random(1.0, 1.45); // Richer regular plumes
                    particle.maxLife = random(18, 32); // Slightly longer trail
                    particle.life = particle.maxLife;
                }

                // Maintain backward compatibility with particles set
                this.particles.add(particle);
            }
        }
    }

    createLandingDust(x, y, size, count = 30) {
        // Create a circular burst of dust particles around the ship
        for (let i = 0; i < count; i++) {
            // Random angle for the ring position
            const angle = random(TWO_PI);

            // Calculate spawn position at the edge of the ship (create a ring)
            // Use 30-50% of size as radius to create a ring around the hull
            const radius = size * random(0.3, 0.5);
            const spawnX = x + cos(angle) * radius;
            const spawnY = y + sin(angle) * radius;

            // Velocity outward from center
            const speed = random(0.5, 2.0); // Slower, lingering dust

            // Dust color (grey/brown)
            const baseColor = [180 + random(-20, 20), 160 + random(-20, 20), 140 + random(-20, 20)];

            // Get particle from pool
            const particle = this.particlePool.get(
                spawnX,
                spawnY,
                angle,
                size,
                baseColor
            );

            if (particle) {
                // Override velocity to move outward from the ring center
                particle.vel.set(cos(angle), sin(angle)).mult(speed);

                // Longer lifetime for dust to linger (50-100 frames)
                particle.maxLife = random(50, 100);
                particle.life = particle.maxLife;

                // Slower shrink rate for lingering dust cloud effect
                particle.shrinkRate = random(0.98, 0.995);

                // Override size to be appropriate for dust puffs
                particle.size = random(size * 0.15, size * 0.3);

                // Add to active set
                this.particles.add(particle);
            }
        }
    }

    update() {
        const deadParticles = [];
        for (const particle of this.particlePool.active) {
            particle.update();
            if (particle.isDead()) {
                deadParticles.push(particle);
            }
        }

        for (let i = 0, len = deadParticles.length; i < len; i++) {
            const p = deadParticles[i];
            this.particlePool.release(p);
            this.particles.delete(p); // For backward compatibility
        }
    }

    draw() {
        noStroke();
        const ctx = drawingContext;
        if (!ctx) {
            for (const particle of this.particlePool.active) {
                particle.draw();
            }
            return;
        }

        const prevOp = ctx.globalCompositeOperation;
        ctx.globalCompositeOperation = 'screen';

        // Draw all active particles - iterate directly over Set
        for (const particle of this.particlePool.active) {
            particle.draw();
        }

        ctx.globalCompositeOperation = prevOp;
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

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { ThrustParticle, ThrustManager };
    global.ThrustParticle = ThrustParticle;
    global.ThrustManager = ThrustManager;
}