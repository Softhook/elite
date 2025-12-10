/**
 * Cargo class for representing floating cargo containers in space
 * Can be collected by the player for profit
 */
class Cargo {
    constructor(x, y, type, quantity = 1) {
        this.pos = createVector(x, y);
        this.vel = createVector(random(-0.5, 0.5), random(-0.5, 0.5));
        this.type = type || random(LEGAL_CARGO); // Default to random legal cargo
        this.quantity = Math.min(50, Math.max(1, quantity));
        this.size = 8;
        this.rotation = random(TWO_PI);
        this.rotationSpeed = random(-0.01, 0.01);
        this.collected = false;
        // Harpoon/attachment state
        this.attached = false;     // whether currently attached to a ship
        this.attachedTo = null;    // reference to ship collecting it
        this.attachedBy = null;    // string marker, e.g. 'harpoon'
        this.lifetime = 1800; // Exists for 30 seconds (60fps * 30)
        this.color = Cargo.determineColor(this.type);
        // Optional link back to any HUD/minimap event marker created when this cargo was spawned
        this.eventMarkerId = null;
    }

    /**
     * Determines the color of the cargo based on its type.
     * @param {string} type - The cargo type.
     * @returns {Array} RGB color array.
     */
    static determineColor(type) {
        if (ILLEGAL_CARGO.includes(type)) {
            return [200 + random(55), 20 + random(30), 20 + random(30)];
        }
        if (["Food", "Textiles"].includes(type)) {
            return [30 + random(30), 150 + random(50), 30 + random(30)];
        }
        if (["Machinery", "Metals", "Minerals"].includes(type)) {
            return [150 + random(50), 150 + random(50), 150 + random(50)];
        }
        if (["Chemicals", "Medicine"].includes(type)) {
            return [150 + random(50), 150 + random(50), 200 + random(55)];
        }
        if (["Computers", "Adv Components"].includes(type)) {
            return [200 + random(55), 150 + random(50), 30 + random(30)];
        }
        if (["Luxury Goods"].includes(type)) {
            return [200 + random(55), 80 + random(40), 200 + random(55)];
        }
        return [200 + random(55), 200 + random(55), 200 + random(55)];
    }

    update() {
        if (this.collected) return;

        // If attached to a ship (harpooned), pull towards the ship and attempt auto-collection
        if (this.attached && this.attachedTo && this.attachedTo.pos) {
            // defensive check: if owner destroyed, detach
            if (this.attachedTo.destroyed || (typeof this.attachedTo.isDestroyed === 'function' && this.attachedTo.isDestroyed())) {
                this.attached = false;
                this.attachedTo = null;
                this.attachedBy = null;
            } else {
                const dx = this.attachedTo.pos.x - this.pos.x;
                const dy = this.attachedTo.pos.y - this.pos.y;
                const dist = Math.sqrt(dx * dx + dy * dy) || 0.0001;

                // Pull speed: proportional to distance but clamped for stability
                const speed = Math.min(12, 0.12 * dist + 2.0);
                const nx = dx / dist;
                const ny = dy / dist;

                // Move cargo towards ship
                this.pos.x += nx * speed;
                this.pos.y += ny * speed;
                this.vel.x = nx * speed;
                this.vel.y = ny * speed;

                // If close enough, attempt to add to ship's cargo/inventory
                const collectRadius = (this.attachedTo.size || 16) / 2 + 6;
                if (dist <= collectRadius) {
                    // Try to add to owner's cargo if method exists
                    const owner = this.attachedTo;
                    let added = 0;
                    let success = false;
                    try {
                        if (typeof owner.addCargo === 'function') {
                            const res = owner.addCargo(this.type, this.quantity, true);
                            success = !!res && !!res.success;
                            added = (res && res.added) ? res.added : 0;
                        } else {
                            // Fallback: if no addCargo, mark as collected
                            success = true;
                            added = this.quantity;
                        }
                    } catch (e) {
                        success = false;
                        added = 0;
                    }

                    if (success && added > 0) {
                        // Play pickup sound if available
                        try { if (typeof soundManager !== 'undefined') soundManager.playSound && soundManager.playSound('pickupCoin'); } catch (_) { }
                        // If partial add, reduce quantity and remain in world
                        if (added < this.quantity) {
                            this.quantity -= added;
                            this.attached = false;
                            this.attachedTo = null;
                            this.attachedBy = null;
                        } else {
                            this.collected = true;
                            // Remove any HUD/minimap marker associated with this cargo
                            try {
                                if (this.eventMarkerId && typeof uiManager !== 'undefined' && typeof uiManager.removeEventMarker === 'function') {
                                    uiManager.removeEventMarker(this.eventMarkerId);
                                }
                            } catch (e) { }
                        }
                    } else {
                        // Owner couldn't accept cargo (full etc.) - detach and resume drifting
                        this.attached = false;
                        this.attachedTo = null;
                        this.attachedBy = null;
                        // Give a small outward velocity so it doesn't immediately reattach
                        this.vel.x = nx * -2;
                        this.vel.y = ny * -2;
                    }
                }
                // decrement lifetime while being pulled (so cargo won't persist forever)
                this.lifetime--;
                return;
            }
        }

        // Default floating behavior
        this.pos.add(this.vel);
        this.vel.mult(0.98);
        this.rotation = (this.rotation + this.rotationSpeed) % TWO_PI;
        this.lifetime--;
    }

    draw() {
        if (this.collected) return;
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);
        fill(this.color);
        stroke(min(255, this.color[0] * 0.7), min(255, this.color[1] * 0.7), min(255, this.color[2] * 0.7));
        strokeWeight(1);
        // Draw container
        beginShape();
        vertex(-this.size / 1.5, -this.size / 1.5);
        vertex(this.size / 1.5, -this.size / 1.5);
        vertex(this.size / 1.5, this.size / 1.5);
        vertex(-this.size / 1.5, this.size / 1.5);
        endShape(CLOSE);
        // Draw details (packaging lines)
        stroke(min(255, this.color[0] * 0.6), min(255, this.color[1] * 0.6), min(255, this.color[2] * 0.6));
        line(-this.size / 1.5, 0, this.size / 1.5, 0);
        line(0, -this.size / 1.5, 0, this.size / 1.5);
        // Asymmetrical mark for rotation visibility
        fill(255, 255, 255, 120);
        noStroke();
        triangle(
            -this.size / 2.5, -this.size / 2.5,
            -this.size / 1.8, -this.size / 2.5,
            -this.size / 2.5, -this.size / 1.8
        );
        // Glint for valuable content
        if (this.lifetime % 60 < 15) {
            fill(255, 255, 255, 180);
            noStroke();
            ellipse(this.size / 3, -this.size / 3, 2, 2);
        }
        pop();
        // Fading effect when lifetime is low
        if (this.lifetime < 120) {
            const fadeOpacity = map(this.lifetime, 0, 120, 0, 255);
            stroke(255, fadeOpacity);
            strokeWeight(1);
            noFill();
            ellipse(this.pos.x, this.pos.y, this.size * 2, this.size * 2);
        }
    }

    isExpired() {
        return this.lifetime <= 0;
    }

    checkCollision(player) {
        if (!player || !player.pos) return false;
        const dx = this.pos.x - player.pos.x;
        const dy = this.pos.y - player.pos.y;
        const distSq = dx * dx + dy * dy;
        const threshold = player.size / 2 + this.size * 2;
        return distSq < threshold * threshold;
    }

    getValue() {
        const baseValues = {
            'Food': 8, 'Textiles': 12, 'Machinery': 95, 'Metals': 45, 'Minerals': 35,
            'Chemicals': 65, 'Computers': 220, 'Medicine': 140, 'Adv Components': 350,
            'Luxury Goods': 400, 'Narcotics': 300, 'Weapons': 250, 'Slaves': 350
        };
        const baseValue = baseValues[this.type] || 50;
        return Math.floor(baseValue * this.quantity * random(0.8, 1.2));
    }

    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            vel: { x: this.vel.x, y: this.vel.y },
            type: this.type,
            quantity: this.quantity,
            size: this.size,
            rotation: this.rotation,
            attached: !!this.attached,
            attachedBy: this.attachedBy || null,
            lifetime: this.lifetime,
            collected: !!this.collected,
            color: Array.isArray(this.color) ? this.color : (this.color && this.color.levels ? this.color.levels.slice(0, 3) : null)
        };
    }

    static fromJSON(data) {
        if (!data) return null;
        const c = new Cargo((data.pos && data.pos.x) || 0, (data.pos && data.pos.y) || 0, data.type || null, data.quantity || 1);
        if (data.vel) c.vel = createVector(data.vel.x || 0, data.vel.y || 0);
        c.size = data.size || c.size;
        c.rotation = data.rotation || c.rotation;
        c.attached = !!data.attached;
        c.attachedBy = data.attachedBy || null;
        c.lifetime = (typeof data.lifetime === 'number') ? data.lifetime : c.lifetime;
        c.collected = !!data.collected;
        if (Array.isArray(data.color)) c.color = data.color;
        return c;
    }
}