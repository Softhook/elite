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
            // debris is now much larger for visibility and presence in systems
            debris: 140,
            probe: 28,
            beacon: 46
        };
        this.size = sizeMap[type] || 48;
        // Collision footprint: use visual radius so collision matches what is seen
        this.collisionRadius = Math.max(6, (this.size / 2));
        // Animation state: per-instance animated properties (panels, windows, shards, etc.)
        this._anim = {};
        // unique id used by debris RNG and other persistent behaviors
        this.id = 'spaceobj_' + (Date.now() % 100000) + '_' + Math.floor(Math.random() * 10000);
        // Satellite solar panel angle (disabled animation for satellites)
        this._anim.panelAngle = 0;
        this._anim.panelSpeed = 0;
        // Telescope dish small tilt/scan
        this._anim.telescopeTilt = Math.random() * 0.06 - 0.03;
        this._anim.telescopeSpeed = (Math.random() * 0.00008 + 0.00002);
        // Relay antennae phase
        this._anim.relayPhase = Math.random() * TWO_PI;
        // Habitat window flicker / internal lights
        this._anim.habitatWindowPhase = Math.random() * TWO_PI;
        // Probe small blink
        this._anim.probeBlink = Math.random() * TWO_PI;
        // Debris: create persistent shards so they animate consistently
        if (this.type === 'debris') {
            this._shards = [];
            // deterministic simple RNG seeded from id
            let seed = 0;
            for (let i = 0; i < this.id.length; i++) seed = (seed * 31 + this.id.charCodeAt(i)) & 0xffffffff;
            let rnd = (seed >>> 0) % 233280;
            const rndf = (scale = 1) => { rnd = (rnd * 9301 + 49297) % 233280; return (rnd / 233280) * scale; };
            const shardCount = Math.max(5, 4 + Math.floor(this.size / 30));
            for (let s = 0; s < shardCount; s++) {
                const ang = rndf(TWO_PI);
                const dist = this.size * (0.18 + rndf(0.6));
                const rx = Math.cos(ang) * dist;
                const ry = Math.sin(ang) * dist;
                const verts = 3 + Math.floor(rndf(4));
                const rr = (this.size * 0.12) * (0.6 + rndf(1.2));
                const spin = (rndf(0.002) - 0.001) * (0.5 + rndf(1));
                this._shards.push({ rx, ry, baseAng: ang, angle: rndf(TWO_PI), spin, verts, rrScale: 0.6 + rndf(1.2) });
            }
        }
        this.angle = 0;
        // Much slower rotation so they don't look like tiny spinning toys
        // Much slower rotations for subtle motion
        const rotMap = {
            telescope: 0.00015,
            satellite: 0.00045,
            relay: 0.0004,
            habitat: 0.00012,
            // make debris spin much slower so large chunks feel massive
            debris: 0.00008,
            probe: 0.0012,
            beacon: 0.00025
        };
        this.rotationSpeed = rotMap[type] || 0.001;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.destroyed = false;
        this._drift = { x: (Math.random() - 0.5) * 0.06, y: (Math.random() - 0.5) * 0.06 };
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
        // advance per-type animations (cache anim ref)
        const anim = this._anim;
        if (anim) {
            if (typeof anim.panelAngle === 'number') anim.panelAngle += (anim.panelSpeed || 0) * dt;
            if (typeof anim.telescopeTilt === 'number') anim.telescopeTilt += (anim.telescopeSpeed || 0) * dt;
            if (typeof anim.relayPhase === 'number') anim.relayPhase += 0.0012 * dt;
            if (typeof anim.habitatWindowPhase === 'number') anim.habitatWindowPhase += 0.004 * dt;
            if (typeof anim.probeBlink === 'number') anim.probeBlink += 0.02 * dt;
        }
        if (this._shards && this._shards.length) {
            for (let i = 0; i < this._shards.length; i++) this._shards[i].angle += this._shards[i].spin * dt;
        }
    }

    draw() {
        if (!this.pos || this.destroyed) return;
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle);
        rectMode(CENTER);

        // cache size/anim locally for a small speedup and clarity
        const size = this.size;
        const anim = this._anim;
        // subtle bob when drawing
        const bob = Math.sin(this.bobPhase) * Math.min(6, size * 0.06);

        switch (this.type) {
            case 'satellite':
                noStroke();
                // central bus (vertical bob only — remove sideways shift)
                fill(190, 190, 210);
                rect(0, bob, size * 0.6, size * 0.42, 4);
                // solar panels
                fill(30, 80, 160);
                // solar panels (static)
                rect(-size * 0.78, bob, size * 0.64, size * 0.22, 3);
                rect(size * 0.78, bob, size * 0.64, size * 0.22, 3);
                // solar panel grid lines
                stroke(20, 40, 90, 180);
                strokeWeight(1);
                for (let g = -2; g <= 2; g++) {
                    const gx = g * (size * 0.64 / 6);
                    line(-size * 0.78 - size * 0.32, gx + bob, -size * 0.78 + size * 0.32, gx + bob);
                    line(size * 0.78 - size * 0.32, gx + bob, size * 0.78 + size * 0.32, gx + bob);
                }
                noStroke();
                // antenna dish
                fill(120);
                ellipse(size * 0.28, -size * 0.12 + bob, size * 0.22, size * 0.14);
                // small nav light
                fill(255, 90, 80);
                ellipse(-size * 0.18, -size * 0.18 + bob, 4, 4);
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
                // subtle scanning motion via telescopeTilt
                rotate(0.15 + Math.sin(anim ? anim.telescopeTilt : 0) * 0.06);
                ellipse(0, 0, size * 1.25, size * 0.9);
                // rings
                noFill(); stroke(200); strokeWeight(1);
                for (let r = 1; r <= 3; r++) ellipse(0, 0, size * (1.25 - r * 0.18), size * (0.9 - r * 0.12));
                pop();
                // Secondary mirror/support
                fill(120);
                ellipse(size * 0.12, -size * 0.18 + bob, size * 0.22, size * 0.14);
                // support struts
                stroke(120); strokeWeight(1.2);
                line(-size * 0.25, size * 0.1 + bob, -size * 0.05, -size * 0.05 + bob);
                line(size * 0.25, size * 0.1 + bob, size * 0.05, -size * 0.05 + bob);
                noStroke();
                // base platform with panel detail
                fill(90);
                rect(0, size * 0.42, size * 0.8, size * 0.18, 3);
                stroke(60); strokeWeight(0.7);
                line(-size * 0.36, size * 0.42, size * 0.36, size * 0.42);
                noStroke();
                break;

            case 'relay':
                // cluster of antennae on a small hub
                noFill();
                stroke(200);
                strokeWeight(1.5);
                for (let i = 0; i < 5; i++) {
                    const a = (i / 5) * TWO_PI + (anim ? anim.relayPhase : 0) + this.bobPhase * 0.06 * (i%2?1:-1);
                    const lx = Math.cos(a) * (size * 0.6);
                    const ly = Math.sin(a) * (size * 0.3);
                    line(0, 0, lx, ly);
                    fill(200);
                    noStroke();
                    ellipse(lx, ly, size * 0.12, size * 0.08);
                }
                // hub with small panel decals
                fill(170);
                noStroke();
                ellipse(0, 0, size * 0.36, size * 0.26);
                fill(100, 120, 150);
                rect(-size * 0.06, 0, size * 0.08, size * 0.04, 2);
                rect(size * 0.06, 0, size * 0.08, size * 0.04, 2);
                break;

            case 'habitat':
                // Cylindrical habitat module with rounded end-caps and curved windows
                noStroke();
                const cylW = this.size * 0.9;
                const cylH = this.size * 0.6;
                // main body (slightly darker center to imply curvature)
                fill(175, 165, 155);
                rect(0, 0 + bob, cylW, cylH, cylH * 0.35);
                // end caps to sell the cylinder shape
                fill(185, 175, 165);
                ellipse(0, -cylH * 0.5 + bob, cylW, cylH * 0.36);
                ellipse(0, cylH * 0.5 + bob, cylW, cylH * 0.36);
                // subtle highlight arc across the top
                noFill(); stroke(220, 220, 230, 80); strokeWeight(1.2);
                arc(0, -cylH * 0.5 + bob + 2, cylW * 0.92, cylH * 0.28, PI, TWO_PI);
                noStroke();
                // windows (curved, with frames) — animated internal light flicker
                const winCount = 5;
                const winSpacing = cylW / (winCount + 1);
                for (let i = 0; i < winCount; i++) {
                    const wx = -cylW * 0.5 + winSpacing * (i + 1);
                    const wy = -size * 0.05 + bob;
                    const flick = 0.5 + 0.5 * Math.sin(anim ? (anim.habitatWindowPhase + i * 0.6) : this.bobPhase);
                    fill(30, Math.floor(110 + 90 * flick), Math.floor(180 + 40 * flick), Math.floor(160 * (0.6 + 0.4 * flick)));
                    rect(wx, wy, size * 0.10, size * 0.18, 4);
                    // frame
                    stroke(20, 40, 60, 160); strokeWeight(0.7); noFill(); rect(wx, wy, size * 0.10, size * 0.18, 4); noStroke();
                }
                // docking ring (thinner) to match new proportions
                stroke(120); strokeWeight(1.4); noFill(); ellipse(0, 0 + bob, cylW * 0.98, cylH * 0.88);
                // small clamp hints
                for (let c = -1; c <= 1; c++) {
                    const cx = c * cylW * 0.34;
                    stroke(100); strokeWeight(1); line(cx - 6, cylH * 0.18 + bob, cx + 6, cylH * 0.18 + bob);
                }
                noStroke();
                break;

            case 'debris':
                // irregular scrap - draw persistent shards (each has own rotation)
                noStroke();
                fill(140, 120, 110);
                if (this._shards && this._shards.length) {
                    for (let i = 0; i < this._shards.length; i++) {
                        const sh = this._shards[i];
                        push();
                        translate(sh.rx, sh.ry);
                        rotate(sh.angle + Math.sin(this.bobPhase * 0.002) * 0.03);
                        beginShape();
                        for (let v = 0; v < sh.verts; v++) {
                            const a = v * (TWO_PI / sh.verts) + (v % 2 ? 0.2 : -0.15);
                            const rr = sh.rrScale * (size * 0.12) * (0.6 + (v % 3) * 0.15);
                            vertex(Math.cos(a) * rr, Math.sin(a) * rr);
                        }
                        endShape(CLOSE);
                        // edge scratch
                        stroke(180, 160, 140, 200); strokeWeight(0.6);
                        line(-size * 0.12, -size * 0.06, size * 0.12, size * 0.06);
                        noStroke();
                        pop();
                    }
                }
                break;

            case 'probe':
                // small slender probe with a pointed front and tiny solar stub
                noStroke();
                fill(200, 200, 220);
                // body
                rect(0, 0 + bob, size * 0.18, size * 0.9, 3);
                // nose cone
                fill(170);
                triangle(0 - size * 0.09, -size * 0.45 + bob, 0 + size * 0.09, -size * 0.45 + bob, 0, -size * 0.62 + bob);
                // small solar panel with grid
                fill(30, 80, 160);
                rect(0, size * 0.28 + bob, size * 0.36, size * 0.08, 2);
                stroke(20,40,90,160); strokeWeight(0.6);
                for (let l = -1; l <= 1; l++) line(-size*0.16, size * 0.28 + bob + l * 3, size*0.16, size * 0.28 + bob + l * 3);
                noStroke();
                // small blinking nav light
                const blink = 0.5 + 0.5 * Math.sin(anim ? anim.probeBlink : this.bobPhase * 0.1);
                fill(255, 140, 80, 220 * blink);
                ellipse(0, -size * 0.42 + bob, 5 * (1 + blink), 5 * (1 + blink));
                break;

            case 'beacon':
                // small floating beacon with pulsing light
                noStroke();
                fill(100);
                rect(0, 6 + bob, size * 0.18, size * 0.5, 3);
                // light (stronger pulse)
                const pulse = (Math.sin(this.bobPhase * 1.6) + 1) * 0.5;
                const glow = 0.5 + 0.5 * pulse;
                noStroke();
                fill(255, 220, 60, 160 * glow);
                ellipse(0, -size * 0.12 + bob, size * 0.42 * (0.9 + 0.4 * pulse));
                // small ring / halo
                stroke(200, 200, 80, 90); strokeWeight(1.2); noFill(); ellipse(0, 0 + bob, size * (0.8 + pulse * 0.6), size * (0.6 + pulse * 0.4)); noStroke();
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
            // match asteroid health bar colors: red background, green foreground
            fill(255, 0, 0);
            rect(barX, barY, barW, barH);
            fill(0, 255, 0);
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
        if (!target || !target.pos) return false;
        const dx = this.pos.x - target.pos.x;
        const dy = this.pos.y - target.pos.y;
        const rA = (typeof this.collisionRadius === 'number') ? this.collisionRadius : (this.size / 2);
        const rB = (typeof target.collisionRadius === 'number') ? target.collisionRadius : (typeof target.size === 'number' ? (target.size / 2) : 0);
        const rSum = rA + rB;
        if (rSum <= 0) return false;
        return (dx * dx + dy * dy) < (rSum * rSum);
    }
}

// Export for environments that expect global registration
if (typeof window !== 'undefined') window.SpaceObject = SpaceObject;
