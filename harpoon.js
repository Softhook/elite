// harpoon.js
// Simple Verlet-based rope for a harpoon tether between two ships
function Harpoon(owner, target, opts) {
    opts = opts || {};
    this.owner = owner;
    this.target = target;
    this.segmentCount = opts.segmentCount || 8;
    // rest length per segment - initialize to straight-line spacing
    const totalDist = dist(owner.pos.x, owner.pos.y, target.pos.x, target.pos.y);
    this.restLength = opts.restLength || (totalDist / Math.max(1, this.segmentCount - 1));
    this.stiffness = opts.stiffness !== undefined ? opts.stiffness : 1.0;
    this.breakTension = opts.breakTension || 800; // tuning value - higher = stronger cable
    this.damping = opts.damping || 0.995;
    this.segments = [];
    this.broken = false;

    // initialize straight line segments between owner and target
    for (let i = 0; i < this.segmentCount; i++) {
        const t = i / (this.segmentCount - 1);
        const x = lerp(owner.pos.x, target.pos.x, t);
        const y = lerp(owner.pos.y, target.pos.y, t);
        this.segments.push({ pos: createVector(x, y), prev: createVector(x, y) });
    }
}

Harpoon.prototype.update = function(dtMs) {
    if (this.broken) return;
    const dt = (typeof dtMs === 'number') ? dtMs / 1000 : (deltaTime ? deltaTime / 1000 : 1/60);
    // age/lifetime removed: harpoon persists until broken by tension or explicitly

    // Verlet integration for middle segments
    for (let i = 1; i < this.segmentCount - 1; i++) {
        const s = this.segments[i];
        const vx = (s.pos.x - s.prev.x) * this.damping;
        const vy = (s.pos.y - s.prev.y) * this.damping;
        s.prev.x = s.pos.x;
        s.prev.y = s.pos.y;
        s.pos.x += vx;
        s.pos.y += vy;
    }

    // Anchor endpoints to owner and target
    const first = this.segments[0];
    const last = this.segments[this.segmentCount - 1];
    if (this.owner && this.owner.pos) {
        first.pos.x = this.owner.pos.x;
        first.pos.y = this.owner.pos.y;
    }
    if (this.target && this.target.pos) {
        last.pos.x = this.target.pos.x;
        last.pos.y = this.target.pos.y;
    }

    // Constraint relaxation
    const iterations = 4;
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < this.segmentCount - 1; i++) {
            const a = this.segments[i];
            const b = this.segments[i+1];
            let dx = b.pos.x - a.pos.x;
            let dy = b.pos.y - a.pos.y;
            let d = Math.sqrt(dx*dx + dy*dy) || 0.0001;
            const diff = (d - this.restLength) / d;

            // anchors have invMass = 0
            const invA = (i === 0) ? 0 : 1;
            const invB = (i+1 === this.segmentCount-1) ? 0 : 1;
            const sum = invA + invB;
            if (sum === 0) continue;
            const adjustA = (invA / sum) * this.stiffness;
            const adjustB = (invB / sum) * this.stiffness;

            a.pos.x += dx * diff * adjustA;
            a.pos.y += dy * diff * adjustA;
            b.pos.x -= dx * diff * adjustB;
            b.pos.y -= dy * diff * adjustB;
        }

        // re-anchor
        if (this.owner && this.owner.pos) {
            this.segments[0].pos.x = this.owner.pos.x;
            this.segments[0].pos.y = this.owner.pos.y;
        }
        if (this.target && this.target.pos) {
            this.segments[this.segmentCount-1].pos.x = this.target.pos.x;
            this.segments[this.segmentCount-1].pos.y = this.target.pos.y;
        }
    }

    // tension check - approximate by longest segment stretch
    let maxStretch = 0;
    for (let i = 0; i < this.segmentCount - 1; i++) {
        const a = this.segments[i];
        const b = this.segments[i+1];
        const dx = b.pos.x - a.pos.x;
        const dy = b.pos.y - a.pos.y;
        const d = Math.sqrt(dx*dx + dy*dy);
        maxStretch = Math.max(maxStretch, d - this.restLength);
    }

    // scale approx tension to break threshold units
    // reduce sensitivity to avoid immediate breaking from small numerical/stretch differences
    let approxTension = maxStretch * 50; // tuning scalar (reduced)
    if (maxStretch < 5) approxTension = 0; // ignore very small stretches
    if (approxTension > this.breakTension) {
        this.break();
        return;
    }

    // Apply pulling forces to anchors based on overall rope stretch
    if (this.owner && this.target && this.owner.pos && this.target.pos) {
        const dx = this.target.pos.x - this.owner.pos.x;
        const dy = this.target.pos.y - this.owner.pos.y;
        const dist = Math.sqrt(dx*dx + dy*dy) || 0.0001;
        const restTotal = this.restLength * (this.segmentCount - 1);
        const stretch = dist - restTotal;
        if (stretch > 0.5) {
            const nx = dx / dist;
            const ny = dy / dist;
            // gentler pull: reduce scalar and limit dt scaling to avoid huge impulses on slow frames
            const basePull = Math.min(stretch * 0.12, 100); // reduced from 0.6/400 to 0.12/100
            const dtScale = Math.min(dt / (1/60), 2); // cap dt scaling
            const impulse = basePull * dtScale;
            const maxImpulsePerAxis = 50;
            // apply to velocities if available, but clamp so it's not a sudden huge jump
            if (this.owner.vel) {
                // use ship `size` as a proxy for mass (larger ships are heavier)
                const ownerMass = (this.owner.size && this.owner.size > 0) ? this.owner.size : 1;
                const dvx = (nx * impulse) / ownerMass;
                const dvy = (ny * impulse) / ownerMass;
                this.owner.vel.x += dvx;
                this.owner.vel.y += dvy;
                this.owner.vel.x = Math.max(Math.min(this.owner.vel.x, this.owner.maxVel || maxImpulsePerAxis), -(this.owner.maxVel || maxImpulsePerAxis));
                this.owner.vel.y = Math.max(Math.min(this.owner.vel.y, this.owner.maxVel || maxImpulsePerAxis), -(this.owner.maxVel || maxImpulsePerAxis));
            }
            if (this.target.vel) {
                // use ship `size` as a proxy for mass (larger ships are heavier)
                const targetMass = (this.target.size && this.target.size > 0) ? this.target.size : 1;
                const dvxT = (nx * impulse) / targetMass;
                const dvyT = (ny * impulse) / targetMass;
                this.target.vel.x -= dvxT;
                this.target.vel.y -= dvyT;
                this.target.vel.x = Math.max(Math.min(this.target.vel.x, this.target.maxVel || maxImpulsePerAxis), -(this.target.maxVel || maxImpulsePerAxis));
                this.target.vel.y = Math.max(Math.min(this.target.vel.y, this.target.maxVel || maxImpulsePerAxis), -(this.target.maxVel || maxImpulsePerAxis));
            }
        }
    }
};

Harpoon.prototype.draw = function() {
    if (this.broken) return;
    stroke(180, 220, 255);
    strokeWeight(2);
    noFill();
    // Draw as a polyline so the tether reaches exactly to the ship centers
    beginShape();
    // explicit start at owner center if available (ensures exact endpoint)
    if (this.owner && this.owner.pos) {
        vertex(this.owner.pos.x, this.owner.pos.y);
    } else {
        const p0 = this.segments[0].pos;
        vertex(p0.x, p0.y);
    }

    // middle segments
    for (let i = 1; i < this.segments.length - 1; i++) {
        const p = this.segments[i].pos;
        vertex(p.x, p.y);
    }

    // explicit end at target center if available
    if (this.target && this.target.pos) {
        vertex(this.target.pos.x, this.target.pos.y);
    } else {
        const pn = this.segments[this.segments.length - 1].pos;
        vertex(pn.x, pn.y);
    }
    endShape();
};

Harpoon.prototype.break = function() {
    if (this.broken) return;
    this.broken = true;
    // small visual marker
    if (this.system && typeof this.system.addExplosion === 'function') {
        const p = this.segments[Math.floor(this.segments.length/2)].pos;
        this.system.addExplosion(p.x, p.y, 8, [200,220,255]);
    }
    if (typeof soundManager !== 'undefined' && this.owner && this.owner.pos && typeof soundManager.playWorldSound === 'function') {
        try { soundManager.playWorldSound('harpoonBreak', this.owner.pos.x, this.owner.pos.y, player.pos); } catch(_) {}
    }
};

// Export for environments that expect global constructor
if (typeof window !== 'undefined') window.Harpoon = Harpoon;
