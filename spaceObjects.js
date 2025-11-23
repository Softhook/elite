// ****** spaceObjects.js ******
// Simple SpaceObject implementation for decorative satellites and telescopes
// Designed to be lightweight: small update() to rotate/oscillate, and draw() using p5 primitives

class SpaceObject {
    constructor(x, y, type = 'satellite') {
        this.pos = (typeof createVector === 'function') ? createVector(x, y) : { x: x, y: y };
        this.type = type; // 'satellite' | 'telescope' | 'relay' | 'habitat' | 'debris' | 'probe' | 'beacon'
        // Larger default sizes for better visibility
        const sizeMap = {
            satellite: 54,
            telescope: 96,
            relay: 60,
            habitat: 110,
            debris: 40,
            probe: 28,
            beacon: 46
        };
        this.size = sizeMap[type] || 48;
        this.angle = 0;
        // Much slower rotation so they don't look like tiny spinning toys
        // Much slower rotations for subtle motion
        const rotMap = {
            telescope: 0.00015,
            satellite: 0.00045,
            relay: 0.0004,
            habitat: 0.00012,
            debris: 0.0009,
            probe: 0.0012,
            beacon: 0.00025
        };
        this.rotationSpeed = rotMap[type] || 0.001;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.destroyed = false;
        this._drift = { x: (Math.random() - 0.5) * 0.06, y: (Math.random() - 0.5) * 0.06 };
        this.id = 'spaceobj_' + (Date.now() % 100000) + '_' + Math.floor(Math.random() * 10000);
        // Health properties (treat like a lightweight asteroid)
        this.maxHealth = Math.max(30, Math.floor(this.size * 1.8));
        this.health = this.maxHealth;
    }

    update(system) {
        // Slow rotation and gentle bobbing
        const dt = (typeof deltaTime === 'number') ? deltaTime : 16;
        this.angle += this.rotationSpeed * dt;
        this.bobPhase += 0.0015 * dt;
        if (this.pos && !this.destroyed) {
            this.pos.x += this._drift.x;
            this.pos.y += this._drift.y;
        }
    }

    draw() {
        if (!this.pos || this.destroyed) return;
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);
        rectMode(CENTER);

        // subtle bob when drawing
        const bob = Math.sin(this.bobPhase) * Math.min(6, this.size * 0.06);

        switch (this.type) {
            case 'satellite':
                noStroke();
                // central bus
                fill(190, 190, 210);
                rect(bob, 0, this.size * 0.6, this.size * 0.42, 4);
                // solar panels
                fill(30, 80, 160);
                rect(-this.size * 0.78, 0, this.size * 0.64, this.size * 0.22, 3);
                rect(this.size * 0.78, 0, this.size * 0.64, this.size * 0.22, 3);
                // solar panel grid lines
                stroke(20, 40, 90, 180);
                strokeWeight(1);
                for (let g = -2; g <= 2; g++) {
                    const gx = g * (this.size * 0.64 / 6);
                    line(-this.size * 0.78 - this.size * 0.32, gx, -this.size * 0.78 + this.size * 0.32, gx);
                    line(this.size * 0.78 - this.size * 0.32, gx, this.size * 0.78 + this.size * 0.32, gx);
                }
                noStroke();
                // antenna dish
                fill(120);
                ellipse(bob + this.size * 0.28, -this.size * 0.12, this.size * 0.22, this.size * 0.14);
                // small nav light
                fill(255, 90, 80);
                ellipse(-this.size * 0.18, -this.size * 0.18 + bob, 4, 4);
                break;

            case 'telescope':
                // Taller truss
                noStroke();
                fill(150);
                rect(0, 6 + bob, this.size * 0.14, this.size * 1.05, 2);
                // Large parabolic dish with concentric rings and struts
                push();
                translate(0, -this.size * 0.08 + bob);
                fill(225);
                rotate(0.15);
                ellipse(0, 0, this.size * 1.25, this.size * 0.9);
                // rings
                noFill(); stroke(200); strokeWeight(1);
                for (let r = 1; r <= 3; r++) ellipse(0, 0, this.size * (1.25 - r * 0.18), this.size * (0.9 - r * 0.12));
                pop();
                // Secondary mirror/support
                fill(120);
                ellipse(this.size * 0.12, -this.size * 0.18 + bob, this.size * 0.22, this.size * 0.14);
                // support struts
                stroke(120); strokeWeight(1.2);
                line(-this.size * 0.25, this.size * 0.1 + bob, -this.size * 0.05, -this.size * 0.05 + bob);
                line(this.size * 0.25, this.size * 0.1 + bob, this.size * 0.05, -this.size * 0.05 + bob);
                noStroke();
                // base platform with panel detail
                fill(90);
                rect(0, this.size * 0.42, this.size * 0.8, this.size * 0.18, 3);
                stroke(60); strokeWeight(0.7);
                line(-this.size * 0.36, this.size * 0.42, this.size * 0.36, this.size * 0.42);
                noStroke();
                break;

            case 'relay':
                // cluster of antennae on a small hub
                noFill();
                stroke(200);
                strokeWeight(1.5);
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * TWO_PI + this.bobPhase * 0.1;
                    const lx = Math.cos(a) * (this.size * 0.6);
                    const ly = Math.sin(a) * (this.size * 0.3);
                    line(0, 0, lx, ly);
                    fill(200);
                    noStroke();
                    ellipse(lx, ly, this.size * 0.12, this.size * 0.08);
                }
                // hub with small panel decals
                fill(170);
                noStroke();
                ellipse(0, 0, this.size * 0.36, this.size * 0.26);
                fill(100, 120, 150);
                rect(-this.size * 0.06, 0, this.size * 0.08, this.size * 0.04, 2);
                rect(this.size * 0.06, 0, this.size * 0.08, this.size * 0.04, 2);
                break;

            case 'habitat':
                // Cylindrical habitat module with windows
                noStroke();
                fill(180, 170, 160);
                rect(0, 0 + bob, this.size * 0.9, this.size * 0.6, 8);
                // windows (lit interior)
                fill(40, 120, 200);
                const winCount = 5;
                for (let i = 0; i < winCount; i++) {
                    const wx = -this.size * 0.35 + (i * (this.size * 0.16));
                    rect(wx, -this.size * 0.05 + bob, this.size * 0.12, this.size * 0.16, 3);
                    // window frame
                    stroke(20, 40, 60, 160); strokeWeight(0.8); noFill(); rect(wx, -this.size * 0.05 + bob, this.size * 0.12, this.size * 0.16, 3); noStroke();
                }
                // docking ring with small clamps
                stroke(120); strokeWeight(2); noFill(); ellipse(0, 0 + bob, this.size * 0.96, this.size * 0.66);
                for (let c = -1; c <= 1; c++) {
                    const cx = c * this.size * 0.36;
                    stroke(100); strokeWeight(1.2); line(cx - 6, this.size * 0.1 + bob, cx + 6, this.size * 0.1 + bob);
                }
                noStroke();
                break;

            case 'debris':
                // irregular scrap - randomized shapes for variety with edge highlights
                noStroke();
                fill(140, 120, 110);
                const shards = 4 + Math.floor((this.size % 7));
                for (let s = 0; s < shards; s++) {
                    const ang = s * (TWO_PI / shards) + this.bobPhase * 0.2 + (this.id.charCodeAt ? (this.id.charCodeAt(s % this.id.length) % 7) * 0.02 : 0);
                    const rx = Math.cos(ang) * (this.size * (0.2 + (s % 3) * 0.15));
                    const ry = Math.sin(ang) * (this.size * (0.2 + ((s+1) % 3) * 0.12));
                    push(); translate(rx, ry); rotate(ang * 0.5 + s);
                    rect(0, 0, this.size * 0.26, this.size * 0.12, 2);
                    // edge scratch
                    stroke(180,160,140,200); strokeWeight(0.6); line(-this.size*0.12, -this.size*0.06, this.size*0.12, this.size*0.06); noStroke();
                    pop();
                }
                break;

            case 'probe':
                // small slender probe with a pointed front and tiny solar stub
                noStroke();
                fill(200, 200, 220);
                // body
                rect(0, 0 + bob, this.size * 0.18, this.size * 0.9, 3);
                // nose cone
                fill(170);
                triangle(0 - this.size * 0.09, -this.size * 0.45 + bob, 0 + this.size * 0.09, -this.size * 0.45 + bob, 0, -this.size * 0.62 + bob);
                // small solar panel with grid
                fill(30, 80, 160);
                rect(0, this.size * 0.28 + bob, this.size * 0.36, this.size * 0.08, 2);
                stroke(20,40,90,160); strokeWeight(0.6);
                for (let l = -1; l <= 1; l++) line(-this.size*0.16, this.size * 0.28 + bob + l * 3, this.size*0.16, this.size * 0.28 + bob + l * 3);
                noStroke();
                break;

            case 'beacon':
                // small floating beacon with pulsing light
                noStroke();
                fill(100);
                rect(0, 6 + bob, this.size * 0.18, this.size * 0.5, 3);
                // light (stronger pulse)
                const pulse = (Math.sin(this.bobPhase * 1.6) + 1) * 0.5;
                const glow = 0.5 + 0.5 * pulse;
                noStroke();
                fill(255, 220, 60, 160 * glow);
                ellipse(0, -this.size * 0.12 + bob, this.size * 0.42 * (0.9 + 0.4 * pulse));
                // small ring / halo
                stroke(200, 200, 80, 90); strokeWeight(1.2); noFill(); ellipse(0, 0 + bob, this.size * (0.8 + pulse * 0.6), this.size * (0.6 + pulse * 0.4)); noStroke();
                break;

            default:
                // fallback simple marker
                fill(200, 200, 200);
                ellipse(0, 0 + bob, this.size * 0.6, this.size * 0.6);
                break;
        }

        pop();

        // --- Draw Health Bar (appears when damaged) ---
        if (this.health < this.maxHealth && this.maxHealth > 0) {
            const healthPercent = this.health / this.maxHealth;
            const barW = this.size * 0.7;
            const barH = 5;
            const barX = this.pos.x - barW / 2;
            const barY = this.pos.y - Math.max(20, this.size * 0.6) - 8;

            push();
            noStroke();
            fill(160, 40, 40);
            rect(barX, barY, barW, barH);
            fill(50, 200, 80);
            rect(barX, barY, barW * healthPercent, barH);
            pop();
        }
    }

    /** Apply damage to this SpaceObject */
    takeDamage(amount, attacker = null, system = null) {
        if (this.destroyed || !Number.isFinite(amount) || amount <= 0) return;
        this.health -= Math.max(0, Math.floor(amount));
        // show health bar / take damage feedback handled by draw/update loops
        if (this.health <= 0) {
            this.health = 0;
            this.destroyed = true;
        }
    }

    /** Returns whether this object is destroyed */
    isDestroyed() { return !!this.destroyed; }

    /** Simple circular collision approximation */
    checkCollision(target) {
        if (!target || !target.pos || typeof target.size !== 'number') return false;
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        const rSum = (this.size / 2) + (target.size / 2);
        return (dx * dx + dy * dy) < (rSum * rSum);
    }
}

// Export for environments that expect global registration
if (typeof window !== 'undefined') window.SpaceObject = SpaceObject;
