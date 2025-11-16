// harpoon.js
// Simple Verlet-based rope for a harpoon tether between two ships
function Harpoon(owner, target, system, opts) {
    opts = opts || {};
    this.owner = owner;
    this.target = target;
    this.system = system || null; // Optional reference to containing system (for audio/cleanup)
    this.segmentCount = opts.segmentCount || 8;
    // rest length per segment - initialize to straight-line spacing
    const totalDist = dist(owner.pos.x, owner.pos.y, target.pos.x, target.pos.y);
    this.restLength = opts.restLength || (totalDist / Math.max(1, this.segmentCount - 1));
    this.stiffness = opts.stiffness !== undefined ? opts.stiffness : 1.0;
    this.breakTension = opts.breakTension || 800; // tuning value - higher = stronger cable
    this.damping = opts.damping || 0.995;
    // Use plain numeric segments to reduce createVector allocations and nested property lookups.
    // Each segment has: x,y,px,py
    this.segments = [];
    this.broken = false;
    this.restTotal = this.restLength * Math.max(1, this.segmentCount - 1);
    this.midIndex = Math.floor(this.segmentCount / 2);

    // initialize straight line segments between owner and target
    for (let i = 0; i < this.segmentCount; i++) {
        const t = i / (this.segmentCount - 1);
        const x = lerp(owner.pos.x, target.pos.x, t);
        const y = lerp(owner.pos.y, target.pos.y, t);
        this.segments.push({ x: x, y: y, px: x, py: y });
    }
}

Harpoon.prototype.update = function(dtMs) {
    if (this.broken) return;
    const dt = (typeof dtMs === 'number') ? dtMs / 1000 : (deltaTime ? deltaTime / 1000 : 1/60);
    // age/lifetime removed: harpoon persists until broken by tension or explicitly

    // Verlet-like integration for middle segments using numeric coords
    const segs = this.segments;
    const cnt = this.segmentCount;
    for (let i = 1; i < cnt - 1; i++) {
        const s = segs[i];
        const vx = (s.x - s.px) * this.damping;
        const vy = (s.y - s.py) * this.damping;
        s.px = s.x;
        s.py = s.y;
        s.x += vx;
        s.y += vy;
    }

    // If anchors are missing/destroyed, break the harpoon
    const ownerMissingOrDestroyed = !this.owner || !this.owner.pos || (typeof this.owner.isDestroyed === 'function' && this.owner.isDestroyed()) || this.owner.destroyed;
    const targetMissingOrDestroyed = !this.target || !this.target.pos || (typeof this.target.isDestroyed === 'function' && this.target.isDestroyed()) || this.target.destroyed;
    if (ownerMissingOrDestroyed || targetMissingOrDestroyed) {
        this.break();
        return;
    }

    // Anchor endpoints to owner and target
    const first = segs[0];
    const last = segs[cnt - 1];
    if (this.owner && this.owner.pos) {
        first.x = this.owner.pos.x;
        first.y = this.owner.pos.y;
    }
    if (this.target && this.target.pos) {
        last.x = this.target.pos.x;
        last.y = this.target.pos.y;
    }

    // Constraint relaxation
    // Dynamically reduce iterations for low-velocity situations to save CPU
    let iterations = 4;
    const ownerVelMag = this.owner && this.owner.vel ? Math.sqrt((this.owner.vel.x||0)*(this.owner.vel.x||0) + (this.owner.vel.y||0)*(this.owner.vel.y||0)) : 0;
    const targetVelMag = this.target && this.target.vel ? Math.sqrt((this.target.vel.x||0)*(this.target.vel.x||0) + (this.target.vel.y||0)*(this.target.vel.y||0)) : 0;
    const motion = (ownerVelMag + targetVelMag) * dt;
    if (motion < 1.0) iterations = 2;
    
    // Quick early-out for when anchors and segments are essentially static to avoid costlier physics
    let maxSegVel = 0;
    for (let i = 1; i < cnt - 1; i++) {
        const s = segs[i];
        const svx = Math.abs(s.x - s.px);
        const svy = Math.abs(s.y - s.py);
        const sv = svx + svy;
        if (sv > maxSegVel) maxSegVel = sv;
    }
    if ((ownerVelMag + targetVelMag) < 0.01 && maxSegVel < 0.05) {
        // still compute tension and anchor pull but skip constraint relaxation work
        // tension evaluation falls through below
    } else {
    for (let iter = 0; iter < iterations; iter++) {
        for (let i = 0; i < cnt - 1; i++) {
            const a = segs[i];
            const b = segs[i+1];
            let dx = b.x - a.x;
            let dy = b.y - a.y;
            let d = Math.sqrt(dx*dx + dy*dy) || 0.0001;
            const diff = (d - this.restLength) / d;

            // anchors have invMass = 0
            const invA = (i === 0) ? 0 : 1;
            const invB = (i+1 === cnt-1) ? 0 : 1;
            const sum = invA + invB;
            if (sum === 0) continue;
            const adjustA = (invA / sum) * this.stiffness;
            const adjustB = (invB / sum) * this.stiffness;

            a.x += dx * diff * adjustA;
            a.y += dy * diff * adjustA;
            b.x -= dx * diff * adjustB;
            b.y -= dy * diff * adjustB;
        }

        // re-anchor
        if (this.owner && this.owner.pos) {
            segs[0].x = this.owner.pos.x;
            segs[0].y = this.owner.pos.y;
        }
        if (this.target && this.target.pos) {
            segs[cnt-1].x = this.target.pos.x;
            segs[cnt-1].y = this.target.pos.y;
        }
    }
    }

    // tension check - approximate by longest segment stretch
    let maxStretch = 0;
    for (let i = 0; i < cnt - 1; i++) {
        const a = segs[i];
        const b = segs[i+1];
        const dx = b.x - a.x;
        const dy = b.y - a.y;
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
        const restTotal = this.restTotal;
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
                // clamp using common property names if present
                const ownerVelLimit = (typeof this.owner.maxSpeed === 'number') ? this.owner.maxSpeed : ((typeof this.owner.maxVel === 'number') ? this.owner.maxVel : maxImpulsePerAxis);
                this.owner.vel.x = Math.max(Math.min(this.owner.vel.x, ownerVelLimit), -ownerVelLimit);
                this.owner.vel.y = Math.max(Math.min(this.owner.vel.y, ownerVelLimit), -ownerVelLimit);
            }
            if (this.target.vel) {
                // use ship `size` as a proxy for mass (larger ships are heavier)
                const targetMass = (this.target.size && this.target.size > 0) ? this.target.size : 1;
                const dvxT = (nx * impulse) / targetMass;
                const dvyT = (ny * impulse) / targetMass;
                this.target.vel.x -= dvxT;
                this.target.vel.y -= dvyT;
                const targetVelLimit = (typeof this.target.maxSpeed === 'number') ? this.target.maxSpeed : ((typeof this.target.maxVel === 'number') ? this.target.maxVel : maxImpulsePerAxis);
                this.target.vel.x = Math.max(Math.min(this.target.vel.x, targetVelLimit), -targetVelLimit);
                this.target.vel.y = Math.max(Math.min(this.target.vel.y, targetVelLimit), -targetVelLimit);
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
    const segs = this.segments;
    // explicit start at owner center if available (ensures exact endpoint)
    if (this.owner && this.owner.pos) {
        vertex(this.owner.pos.x, this.owner.pos.y);
    } else {
        const p0 = segs[0];
        vertex(p0.x, p0.y);
    }

    // middle segments
    for (let i = 1; i < segs.length - 1; i++) {
        const p = segs[i];
        vertex(p.x, p.y);
    }

    // explicit end at target center if available
    if (this.target && this.target.pos) {
        vertex(this.target.pos.x, this.target.pos.y);
    } else {
        const pn = segs[segs.length - 1];
        vertex(pn.x, pn.y);
    }
    endShape();
};

Harpoon.prototype.break = function() {
    if (this.broken) return;
    this.broken = true;
    // small visual marker
    if (this.system && typeof this.system.addExplosion === 'function') {
        const p = this.segments[this.midIndex];
        this.system.addExplosion(p.x, p.y, 8, [200,220,255]);
    }
    if (typeof soundManager !== 'undefined' && this.owner && this.owner.pos && typeof soundManager.playWorldSound === 'function') {
        try {
            // Prefer system player listener if available, fall back to owner position
            const listener = (this.system && this.system.player && this.system.player.pos) ? this.system.player.pos : (typeof player !== 'undefined' && player?.pos ? player.pos : null);
            soundManager.playWorldSound('harpoonBreak', this.owner.pos.x, this.owner.pos.y, listener);
        } catch(_) {}
    }
};

/**
 * Helper to indicate whether the harpoon should be removed from the system
 */
Harpoon.prototype.isDone = function() {
    return !!this.broken;
};

// Export for environments that expect global constructor
if (typeof window !== 'undefined') window.Harpoon = Harpoon;
