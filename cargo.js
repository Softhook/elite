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

        // Initialize geometry cache if needed (Static property on Cargo class)
        if (!Cargo.geometry) {
            const vertices = [
                { x: -0.6, y: -0.6 },
                { x: 0.6, y: -0.6 },
                { x: 0.6, y: 0.6 },
                { x: -0.6, y: 0.6 }
            ];
            const edges = [];
            for (let i = 0; i < vertices.length; i++) {
                const next = (i + 1) % vertices.length;
                edges.push({
                    v1: vertices[i],
                    v2: vertices[next],
                    dx: vertices[next].x - vertices[i].x,
                    dy: vertices[next].y - vertices[i].y
                });
            }
            Cargo.geometry = { vertices, edges };
        }

        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.rotation);

        // 3D Extrusion Logic
        const depth = this.size * 0.6;
        // Calculate extrusion vector based on rotation to simulate fixed light/view source
        // Matches the logic in ships.js/enemyRendering.js
        const dvx = depth * sin(this.rotation);
        const dvy = depth * cos(this.rotation);

        // Sun angle for shading
        const sunAngle = atan2(-this.pos.y, -this.pos.x);
        const localSunAngle = sunAngle - this.rotation;

        const col = this.color;
        const r = col[0], g = col[1], b = col[2];

        noStroke();

        // Draw Sides
        for (let edge of Cargo.geometry.edges) {
            // Visibility check (Backface Culling)
            if (edge.dx * dvy - edge.dy * dvx < 0) {
                const v1 = edge.v1;
                const v2 = edge.v2;
                
                const fx1 = v1.x * this.size;
                const fy1 = v1.y * this.size;
                const fx2 = v2.x * this.size;
                const fy2 = v2.y * this.size;
                
                const bx1 = fx1 + dvx;
                const by1 = fy1 + dvy;
                const bx2 = fx2 + dvx;
                const by2 = fy2 + dvy;
                
                const faceAngle = Math.atan2(edge.dx, -edge.dy);
                const diff = faceAngle - localSunAngle;
                const shade = 0.5 + (Math.cos(diff) + 1) * 0.25;
                
                fill(r * shade, g * shade, b * shade);
                
                beginShape();
                vertex(bx1, by1);
                vertex(bx2, by2);
                vertex(fx2, fy2);
                vertex(fx1, fy1);
                endShape(CLOSE);
            }
        }

        // Draw Top Face
        fill(r, g, b);
        beginShape();
        for (let v of Cargo.geometry.vertices) {
            vertex(v.x * this.size, v.y * this.size);
        }
        endShape(CLOSE);

        // Details
        stroke(min(255, r * 0.6), min(255, g * 0.6), min(255, b * 0.6));
        strokeWeight(1);
        // Packaging lines
        line(-this.size * 0.4, 0, this.size * 0.4, 0);
        line(0, -this.size * 0.4, 0, this.size * 0.4);
        
        // Rotation mark
        noStroke();
        fill(255, 255, 255, 80);
        triangle(
            -this.size * 0.3, -this.size * 0.3,
            -this.size * 0.5, -this.size * 0.3,
            -this.size * 0.3, -this.size * 0.5
        );

        // Glint
        if (this.lifetime % 60 < 15) {
            fill(255, 255, 255, 180);
            ellipse(this.size * 0.3, -this.size * 0.3, 2, 2);
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