// ****** mine.js ******
// Proximity mine weapon class

// Local helper: squared distance between two p5.Vector-like objects
function distSqVec(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return dx * dx + dy * dy;
}

class Mine {
    /**
     * Create a proximity mine
     * @param {number} x - X position
     * @param {number} y - Y position  
     * @param {Object} owner - Ship that dropped the mine
     * @param {number} damage - Damage on explosion
     * @param {number} blastRadius - Explosion radius
     * @param {number} triggerRadius - Proximity detection radius
     * @param {Array} color - RGB color array
     * @param {number} health - Mine health (can be destroyed by weapons)
     */
    constructor(x, y, owner, damage = 80, blastRadius = 150, triggerRadius = 80, color = [255, 100, 0], health = 30) {
        this.pos = createVector(x, y);
        this.owner = owner;
        this.damage = damage;
        this.blastRadius = blastRadius;
        this.triggerRadius = triggerRadius;
        this.color = color;
        this.maxHealth = health;
        this.health = health;
        this.size = 8;
        this.armed = false; // Mine needs time to arm after deployment
        this.armingTime = 1.0; // seconds before mine becomes active
        this.armingTimer = this.armingTime;
        this.destroyed = false;
        this.blinkTimer = 0;
        this.system = null; // Reference to current star system
    }


    /**
     * Update mine state
     * @param {number} dt - Delta time in seconds
     */
    update(dt) {
        if (this.destroyed) return;

        // Arming countdown
        if (!this.armed) {
            this.armingTimer -= dt;
            if (this.armingTimer <= 0) {
                this.armed = true;
            }
        }

        // Blink effect timer
        this.blinkTimer += dt;
    }

    /**
     * Check if a target is in trigger radius
     * @param {Object} target - Target entity to check
     * @return {boolean} Whether target is in range and mine should explode
     */
    shouldExplode(target) {
        if (!this.armed || this.destroyed || !target || !target.pos) return false;
        
        // Don't explode for owner
        if (target === this.owner) return false;

        // Check distance
        const distSq = distSqVec(this.pos, target.pos);
        const triggerDistSq = this.triggerRadius * this.triggerRadius;
        
        return distSq < triggerDistSq;
    }

    /**
     * Explode the mine, dealing damage to nearby entities
     * @param {Object} system - Current star system
     */
    explode(system) {
        if (this.destroyed) return;
        
        this.destroyed = true;

        // Create explosion visual effect
        if (system && system.addExplosion) {
            system.addExplosion(this.pos.x, this.pos.y, this.blastRadius / 10, this.color);
        }

        // Play explosion sound
        if (typeof soundManager !== 'undefined' && typeof player !== 'undefined' && player.pos) {
            soundManager.playWorldSound('explosion', this.pos.x, this.pos.y, player.pos);
        }

        // Damage entities in blast radius
        this.damageNearbyEntities(system);
    }

    /**
     * Apply blast damage to entities in range
     * @param {Object} system - Current star system
     */
    damageNearbyEntities(system) {
        if (!system) return;

        const blastRadiusSq = this.blastRadius * this.blastRadius;
        const isPlayerMine = this.owner instanceof Player;

        // Damage enemies for any mine, but skip the owner to prevent self-damage
        if (system.enemies) {
            for (let enemy of system.enemies) {
                if (!enemy || enemy.destroyed || enemy === this.owner) continue;
                const distSq = distSqVec(this.pos, enemy.pos);
                if (distSq < blastRadiusSq) {
                    const dist = Math.sqrt(distSq);
                    const falloff = 1 - (dist / this.blastRadius);
                    const effectiveDamage = this.damage * Math.max(0.3, falloff);
                    if (typeof enemy.takeDamage === 'function') {
                        enemy.takeDamage(effectiveDamage, this.owner, system);
                    }
                }
            }
        }

        // Damage player only for non-player mines (keep player safe from their own mines)
        if (!isPlayerMine && system.player && !system.player.destroyed) {
            const distSq = distSqVec(this.pos, system.player.pos);
            if (distSq < blastRadiusSq) {
                const dist = Math.sqrt(distSq);
                const falloff = 1 - (dist / this.blastRadius);
                const effectiveDamage = this.damage * Math.max(0.3, falloff);
                if (typeof system.player.takeDamage === 'function') {
                    system.player.takeDamage(effectiveDamage, this.owner, system);
                }
            }
        }

        // Damage asteroids
        if (system.asteroids) {
            for (let asteroid of system.asteroids) {
                if (!asteroid) continue;
                
                const distSq = distSqVec(this.pos, asteroid.pos);
                if (distSq < blastRadiusSq) {
                    const dist = Math.sqrt(distSq);
                    const falloff = 1 - (dist / this.blastRadius);
                    const effectiveDamage = this.damage * Math.max(0.3, falloff);
                    
                    if (typeof asteroid.takeDamage === 'function') {
                        asteroid.takeDamage(effectiveDamage);
                    }
                }
            }
        }
    }

    /**
     * Take damage from weapon fire
     * @param {number} damage - Damage amount
     * @param {Object} attacker - Entity that damaged the mine
     * @param {Object} system - Current star system
     */
    takeDamage(damage, attacker, system) {
        if (this.destroyed) return;

        this.health -= damage;
        
        if (this.health <= 0) {
            // Mine destroyed - explode
            this.explode(system);
        }
    }

    /**
     * Check if mine is destroyed
     * @return {boolean} Whether mine is destroyed
     */
    isDestroyed() {
        return this.destroyed;
    }

    /**
     * Render the mine
     */
    draw() {
        if (this.destroyed) return;

        push();
        translate(this.pos.x, this.pos.y);

        // Visual indication of arming state
        if (!this.armed) {
            // Unarmed - dim and slow blink
            const alpha = 100 + Math.sin(this.blinkTimer * 3) * 50;
            fill(this.color[0], this.color[1], this.color[2], alpha);
            stroke(150, 150, 150);
        } else {
            // Armed - bright with fast blink
            const blinkPhase = Math.sin(this.blinkTimer * 8);
            if (blinkPhase > 0) {
                fill(this.color[0], this.color[1], this.color[2]);
                stroke(255, 200, 0);
            } else {
                fill(this.color[0] * 0.5, this.color[1] * 0.5, this.color[2] * 0.5);
                stroke(200, 150, 0);
            }
        }

        strokeWeight(2);

        // Draw mine body - octagon shape
        beginShape();
        for (let i = 0; i < 8; i++) {
            const angle = (i / 8) * TWO_PI;
            const x = cos(angle) * this.size;
            const y = sin(angle) * this.size;
            vertex(x, y);
        }
        endShape(CLOSE);

        // Draw spikes on armed mines
        if (this.armed) {
            stroke(255, 100, 0);
            strokeWeight(1);
            for (let i = 0; i < 8; i++) {
                const angle = (i / 8) * TWO_PI;
                const x1 = cos(angle) * this.size;
                const y1 = sin(angle) * this.size;
                const x2 = cos(angle) * (this.size + 4);
                const y2 = sin(angle) * (this.size + 4);
                line(x1, y1, x2, y2);
            }
        }

        pop();
    }

    /**
     * Check if mine is off screen for cleanup
     * @param {Object} playerPos - Player position vector
     * @param {number} despawnRadius - Max distance from player
     * @return {boolean} Whether mine is too far from player
     */
    isOffScreen(playerPos, despawnRadius) {
        if (!playerPos) return false;
        const distSq = distSqVec(this.pos, playerPos);
        return distSq > despawnRadius * despawnRadius;
    }
}
