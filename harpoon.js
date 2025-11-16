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
    this.lifetime = opts.lifetime || 80000; // ms
    this.age = 0;
    this.damping = opts.damping || 0.995;
    // parameters for pull behaviour (spring-damper)
    this.springK = opts.springK || 60; // spring stiffness (force per pixel)
    this.pullDamping = opts.pullDamping || 12; // damper coefficient (reduces oscillation)
    this.maxPull = opts.maxPull || 200; // maximum force applied to anchors
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
    this.age += (dtMs || deltaTime || 16);

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
    const approxTension = maxStretch * 200; // tuning scalar
    if (approxTension > this.breakTension) {
        this.break();
        return;
    }

    if (this.age > this.lifetime) {
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

            // Spring-damper: F = k * stretch - c * (relativeVelocityAlongRope)
            const k = this.springK;
            const c = this.pullDamping;
            const maxF = this.maxPull;

            const relVx = (this.target.vel ? this.target.vel.x : 0) - (this.owner.vel ? this.owner.vel.x : 0);
            const relVy = (this.target.vel ? this.target.vel.y : 0) - (this.owner.vel ? this.owner.vel.y : 0);
            const relVelAlong = relVx * nx + relVy * ny;

            const springForce = k * stretch;
            const dampingForce = c * relVelAlong;
            let totalForce = springForce - dampingForce;
            if (totalForce < 0) totalForce = 0;
            totalForce = Math.min(totalForce, maxF);

            // apply by mass if available (accelerations), otherwise assume mass=1
            const ownerMass = (this.owner.mass !== undefined) ? this.owner.mass : ((this.owner.size !== undefined) ? Math.max(1, this.owner.size*this.owner.size) : 1);
            const targetMass = (this.target.mass !== undefined) ? this.target.mass : ((this.target.size !== undefined) ? Math.max(1, this.target.size*this.target.size) : 1);

            const ownerAcc = totalForce / ownerMass;
            const targetAcc = totalForce / targetMass;

            // integrate acceleration to velocity using real dt (seconds)
            if (this.owner.vel) {
                this.owner.vel.x += nx * ownerAcc * dt;
                this.owner.vel.y += ny * ownerAcc * dt;
            }
            if (this.target.vel) {
                this.target.vel.x -= nx * targetAcc * dt;
                this.target.vel.y -= ny * targetAcc * dt;
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
