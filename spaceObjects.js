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
            ,
            // New types
            solarSail: 160,
            engineArray: 92,
            cargoCluster: 120,
            researchArray: 88,
            orbitalGarden: 100,
            decoyBuoy: 42,
            miningPlatform: 130,
            ancientRelic: 150,
            signalFlare: 50
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
        // New-type animation seeds
        this._anim.solarSailAngle = Math.random() * 0.02 - 0.01;
        this._anim.solarSailFlutter = Math.random() * 0.06;
        this._anim.engineGlow = Math.random() * 0.8;
        this._anim.cargoHatch = Math.random() * TWO_PI;
        this._anim.researchArraySweep = Math.random() * TWO_PI;
            this._anim.researchPing = Math.random() * TWO_PI;
        this._anim.gardenBreeze = Math.random() * TWO_PI;
            this._anim.engineParticlePhase = Math.random() * TWO_PI;
        this._anim.decoyPulse = Math.random() * TWO_PI;
        this._anim.miningSpin = Math.random() * TWO_PI;
        this._anim.relicPulse = Math.random() * TWO_PI;
        this._anim.flarePhase = Math.random() * TWO_PI;
        this._anim.iceTrail = Math.random() * TWO_PI;
        // cargo drones (light helpers) for cargoCluster
        if (this.type === 'cargoCluster') {
            this._drones = [];
            const dcount = 2 + Math.floor(this.size / 80);
            for (let di = 0; di < dcount; di++) {
                const ang = Math.random() * TWO_PI;
                const dist = (this.size * 0.5) + Math.random() * (this.size * 0.25);
                this._drones.push({ ang, dist, phase: Math.random() * TWO_PI });
            }
        }
        // (iceComet removed)
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
            ,
            // New types rotation speeds (subtle)
            solarSail: 0.00006,
            engineArray: 0.0009,
            cargoCluster: 0.0002,
            researchArray: 0.00018,
            orbitalGarden: 0.00014,
            decoyBuoy: 0.0003,
            miningPlatform: 0.00009,
            ancientRelic: 0.00005,
            signalFlare: 0.0006
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
            // Advance new-type animation phases for richer motion
            if (typeof anim.solarSailAngle === 'number') anim.solarSailAngle += 0.00008 * dt;
            if (typeof anim.engineGlow === 'number') anim.engineGlow += 0.009 * dt;
            if (typeof anim.engineParticlePhase === 'number') anim.engineParticlePhase += 0.01 * dt;
            if (typeof anim.cargoHatch === 'number') anim.cargoHatch += 0.007 * dt;
            if (typeof anim.researchArraySweep === 'number') anim.researchArraySweep += 0.0045 * dt;
            if (typeof anim.researchPing === 'number') anim.researchPing += 0.006 * dt;
            if (typeof anim.gardenBreeze === 'number') anim.gardenBreeze += 0.0035 * dt;
            if (typeof anim.decoyPulse === 'number') anim.decoyPulse += 0.012 * dt;
            if (typeof anim.miningSpin === 'number') anim.miningSpin += 0.014 * dt;
            if (typeof anim.relicPulse === 'number') anim.relicPulse += 0.0045 * dt;
            if (typeof anim.flarePhase === 'number') anim.flarePhase += 0.006 * dt;
            if (typeof anim.iceTrail === 'number') anim.iceTrail += 0.0035 * dt;
        }
        if (this._shards && this._shards.length) {
            for (let i = 0; i < this._shards.length; i++) this._shards[i].angle += this._shards[i].spin * dt;
        }
        // update cargo drones
        if (this._drones && this._drones.length) {
            for (let di = 0; di < this._drones.length; di++) {
                const d = this._drones[di];
                d.ang += 0.0009 * dt * (1 + di * 0.05);
                d.phase += 0.01 * dt;
            }
        }
        // update ice trail shards positions for subtle drifting
        if (this._trail && this._trail.length) {
            for (let ti = 0; ti < this._trail.length; ti++) {
                const s = this._trail[ti];
                s.rx += Math.cos(this.bobPhase * 0.002 + s.offset) * 0.02;
                s.ry += Math.sin(this.bobPhase * 0.003 + s.offset) * 0.03;
            }
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

            // --- New types ---
            case 'solarSail':
                // huge reflective sails with extra structural and visual detail
                noStroke();
                // central bus (core electronics and strut anchor)
                fill(160, 160, 180);
                rect(0, bob, size * 0.18, size * 0.12, 3);

                // sails: draw each panel with grid lines, struts and a specular sheen
                push();
                const sailAngle = anim ? (anim.solarSailAngle + Math.sin(this.bobPhase * 0.002) * anim.solarSailFlutter) : 0;
                // left sail
                push();
                rotate(sailAngle);
                const L0 = { x: -size * 0.12, y: 0 + bob };
                const L1 = { x: -size * 0.98, y: -size * 0.34 + bob };
                const L2 = { x: -size * 0.98, y: size * 0.34 + bob };
                // base fabric
                fill(245, 245, 255, 230); triangle(L0.x, L0.y, L1.x, L1.y, L2.x, L2.y);
                // subtle grid/crease lines
                stroke(200, 220, 240, 90); strokeWeight(0.5);
                for (let t = 0.18; t < 1.0; t += 0.18) {
                    const ax = L0.x * (1 - t) + L1.x * t; const ay = L0.y * (1 - t) + L1.y * t;
                    const bx = L0.x * (1 - t) + L2.x * t; const by = L0.y * (1 - t) + L2.y * t;
                    line(ax, ay, bx, by);
                }
                // strut lines to bus
                stroke(140); strokeWeight(1.2);
                line(0, bob, L0.x * 0.4, L0.y * 0.95);
                line(0, bob, L1.x * 0.6, L1.y * 0.95);
                noStroke();
                // small patch decals
                fill(220, 230, 240, 140);
                rect(L1.x + size * 0.06, L1.y + size * 0.06, 8, 4, 2);
                pop();

                // right sail (mirrored, with counter-rotation for a natural fold)
                push();
                rotate(-sailAngle * 1.1);
                const R0 = { x: size * 0.12, y: 0 + bob };
                const R1 = { x: size * 0.98, y: -size * 0.34 + bob };
                const R2 = { x: size * 0.98, y: size * 0.34 + bob };
                fill(245, 245, 255, 230); triangle(R0.x, R0.y, R1.x, R1.y, R2.x, R2.y);
                stroke(200, 220, 240, 90); strokeWeight(0.5);
                for (let t = 0.18; t < 1.0; t += 0.18) {
                    const ax = R0.x * (1 - t) + R1.x * t; const ay = R0.y * (1 - t) + R1.y * t;
                    const bx = R0.x * (1 - t) + R2.x * t; const by = R0.y * (1 - t) + R2.y * t;
                    line(ax, ay, bx, by);
                }
                // mirrored struts
                stroke(140); strokeWeight(1.2);
                line(0, bob, R0.x * 0.4, R0.y * 0.95);
                line(0, bob, R1.x * 0.6, R1.y * 0.95);
                noStroke();
                // small patch decals
                fill(220, 230, 240, 140);
                rect(R1.x - size * 0.06 - 8, R1.y + size * 0.06, 8, 4, 2);
                pop();

                // specular sheen: two soft white overlays for a polished reflective look
                push();
                fill(255, 255, 230, 28);
                // angled sheen across both sails
                beginShape();
                vertex(-size * 0.3, -size * 0.28 + bob);
                vertex(-size * 0.9, -size * 0.06 + bob);
                vertex(-size * 0.9, -size * 0.02 + bob);
                vertex(-size * 0.3, size * 0.12 + bob);
                endShape(CLOSE);
                beginShape();
                vertex(size * 0.3, -size * 0.28 + bob);
                vertex(size * 0.9, -size * 0.06 + bob);
                vertex(size * 0.9, -size * 0.02 + bob);
                vertex(size * 0.3, size * 0.12 + bob);
                endShape(CLOSE);
                noStroke();
                pop();

                pop();

                // thin reflective edge and a small reflection streak
                stroke(255, 255, 220, 80); strokeWeight(0.6);
                line(-size * 0.4, -size * 0.2 + bob, -size * 0.65, -size * 0.05 + bob);
                line(size * 0.4, -size * 0.2 + bob, size * 0.65, -size * 0.05 + bob);
                noStroke();

                // small sensor pod that slowly orbits the sail tethered by a thin line
                push();
                const podAng = (anim ? anim.solarSailAngle : 0) * 4 + this.bobPhase * 0.002;
                const podR = size * 0.58;
                stroke(120, 120, 130, 120); strokeWeight(0.8);
                line(0, bob, Math.cos(podAng) * podR * 0.9, Math.sin(podAng) * podR * 0.35 + bob * 0.12);
                noStroke(); fill(220, 230, 240);
                ellipse(Math.cos(podAng) * podR * 0.9, Math.sin(podAng) * podR * 0.35 + bob * 0.12, 6, 6);
                pop();

                break;

            case 'engineArray':
                // Rethought engine array: clustered nozzles on articulated pylons, soft exhaust plumes and heat shimmer
                push();
                // platform body
                noStroke(); fill(80); rect(0, bob + size * 0.02, size * 0.7, size * 0.28, 6);
                // central pylon
                fill(100, 100, 110); rect(0, -size * 0.06 + bob, size * 0.18, size * 0.46, 4);

                // engines (3 nozzle clusters)
                for (let i = -1; i <= 1; i++) {
                    const nx = i * size * 0.28;
                    const ny = size * 0.18 + bob;
                    // mounting arm
                    stroke(110); strokeWeight(2); line(nx * 0.45, ny - size * 0.08, nx, ny - size * 0.02);
                    noStroke();
                    // nozzle housing
                    fill(70, 70, 80); ellipse(nx, ny, size * 0.18, size * 0.12);
                    // inner glow (pulsing)
                    const g = 0.5 + 0.45 * Math.sin((anim ? anim.engineGlow : 0.3) + i * 0.6 + this.bobPhase * 0.015);
                    fill(60, 150, 240, 160 * g);
                    ellipse(nx, ny + 2, size * 0.09 * g, size * 0.16 * g);

                    // soft exhaust cone built from layered translucent ellipses
                    for (let e = 0; e < 4; e++) {
                        const ex = nx + (e * 6) * (0.6 + i * 0.02);
                        const ey = ny + size * 0.18 + e * 8 + (Math.sin(anim ? anim.engineParticlePhase : 0) * 2);
                        fill(100, 170, 255, 40 - e * 8);
                        ellipse(ex, ey, size * (0.18 + e * 0.12) * g, size * (0.22 + e * 0.18) * g);
                    }

                    // faint heat shimmer lines
                    stroke(180, 220, 255, 40); strokeWeight(0.6);
                    const shimmer = Math.sin(this.bobPhase * 0.005 + i);
                    line(nx - 6, ny + 6 + shimmer * 2, nx + 6, ny + 18 + shimmer * 4);
                    noStroke();
                }

                pop();
                break;

            case 'cargoCluster':
                // stacked cargo containers with animated hatch lids
                noStroke();
                const cols = 3;
                const rows = 2;
                const cw = size * 0.28;
                const ch = size * 0.18;
                for (let r = 0; r < rows; r++) {
                    for (let c = 0; c < cols; c++) {
                        const x = (c - (cols - 1) / 2) * (cw + 6);
                        const y = (r - (rows - 1) / 2) * (ch + 6) + bob;
                        fill(120 + r * 10, 110 + c * 8, 100);
                        rect(x, y, cw, ch, 3);
                        // hatch animation
                        const hatch = Math.sin((anim ? anim.cargoHatch : 0) + c * 0.7 + r * 1.1) * 6;
                        stroke(20, 20, 20, 80); strokeWeight(1);
                        line(x - cw * 0.35, y - ch * 0.35, x + cw * 0.35, y - ch * 0.35 + hatch);
                        noStroke();
                    }
                }
                // small helper drones that orbit the cluster
                if (this._drones && this._drones.length) {
                    for (let di = 0; di < this._drones.length; di++) {
                        const d = this._drones[di];
                        const dx = Math.cos(d.ang) * d.dist;
                        const dy = Math.sin(d.ang) * (d.dist * 0.32);
                        const w = 6 + Math.sin(d.phase) * 2;
                        fill(255, 220, 140, 220);
                        noStroke(); ellipse(dx, dy + bob - ch * 0.2, w, w);
                        stroke(255, 200, 120, 120); strokeWeight(0.6);
                        line(dx, dy + bob - ch * 0.2, dx - Math.cos(d.ang) * 6, dy + bob - ch * 0.2 - Math.sin(d.ang) * 6);
                        noStroke();
                    }
                }
                break;

            case 'researchArray':
                // Research array: precision dishes, rotating sensor mast, pulsed conal sweep and orbiting data buoys
                noStroke(); fill(200);
                // low platform
                rect(0, bob, size * 0.38, size * 0.22, 3);
                // sensor mast
                push();
                translate(0, -size * 0.06 + bob);
                fill(140);
                rect(0, 0, size * 0.08, size * 0.4, 3);
                // rotating ring sensor near top
                rotate((anim ? anim.researchArraySweep : 0) * 0.5);
                noFill(); stroke(120, 200, 230, 140); strokeWeight(1.2);
                ellipse(0, -size * 0.14, size * 0.26, size * 0.14);
                pop();

                // array of three precision dishes with articulated mounts
                for (let i = 0; i < 3; i++) {
                    push();
                    const baseAng = -0.9 + i * 0.9;
                    const sway = Math.sin((anim ? anim.researchArraySweep : 0) + i * 0.6) * 0.18;
                    rotate(baseAng + sway);
                    translate(0, -size * (0.36 + i * 0.05));
                    fill(235); ellipse(0, 0, size * (0.32 - i * 0.04), size * (0.22 - i * 0.03));
                    // dish rim and support
                    noFill(); stroke(180); strokeWeight(0.9); ellipse(0, 0, size * (0.28 - i * 0.04), size * (0.16 - i * 0.03));
                    pop();
                }

                // pulsed conal sweep (soft cone rendered as faded triangle)
                const sweep = (anim ? anim.researchArraySweep : 0);
                push();
                noStroke();
                const coneAlpha = 40 + 40 * Math.max(0, Math.sin((anim ? anim.researchPing : 0) * 0.8));
                fill(100, 180, 230, coneAlpha);
                beginShape();
                vertex(0, -size * 0.12 + bob);
                vertex(Math.cos(sweep - 0.18) * size * 1.6, Math.sin(sweep - 0.18) * size * 1.6 + bob);
                vertex(Math.cos(sweep + 0.18) * size * 1.6, Math.sin(sweep + 0.18) * size * 1.6 + bob);
                endShape(CLOSE);
                pop();

                // orbiting data buoys
                for (let b = 0; b < 2; b++) {
                    const ba = (anim ? anim.researchArraySweep : 0) * (0.6 + b * 0.4) + b * 1.2;
                    const br = size * (0.9 + b * 0.12);
                    fill(160, 230, 250, 180);
                    ellipse(Math.cos(ba) * br * 0.6, Math.sin(ba) * br * 0.4 + bob * 0.05, 6, 4);
                }
                noStroke();
                break;

            case 'orbitalGarden':
                // agricultural orbital garden: greenhouse dome with planter rows, trellises, irrigation and tiny bots
                push();
                // glass dome (slightly tinted)
                noStroke();
                fill(200, 235, 245, 140);
                ellipse(0, -size * 0.06 + bob, size * 0.86, size * 0.52);

                // dome pane grid (radial + rings) for greenhouse feel
                stroke(170, 210, 230, 110); strokeWeight(0.9);
                for (let r = 1; r <= 3; r++) {
                    const ry = -size * 0.06 - size * 0.02 + r * (size * 0.08);
                    ellipse(0, ry, size * (0.9 - r * 0.12), size * (0.38 - r * 0.06));
                }
                for (let a = 0; a < 6; a++) {
                    const ang = a * (TWO_PI / 6) + this.bobPhase * 0.0006;
                    const lx = Math.cos(ang) * size * 0.44;
                    const ly = Math.sin(ang) * size * 0.22 - size * 0.06 + bob * 0.02;
                    line(0, -size * 0.06 + bob, lx, ly);
                }
                noStroke();

                // planter base / frame
                fill(90, 80, 70); rect(0, size * 0.22 + bob, size * 0.72, size * 0.16, 6);

                // rows of planted beds (neat agricultural rows)
                const gardenRows = 3;
                for (let r = 0; r < gardenRows; r++) {
                    const ry = -size * 0.06 + (r - 1) * (size * 0.12) + bob * 0.25;
                    // bed soil
                    fill(80, 60, 40); rect(0, ry + size * 0.06, size * 0.64, size * 0.08, 4);
                    // planted rows (small repeated plants)
                    for (let p = -6; p <= 6; p++) {
                        const px = p * (size * 0.05) + Math.sin(this.bobPhase * 0.002 + r * 0.7 + p * 0.1) * 1.6;
                        const sway = Math.sin(this.bobPhase * 0.002 + r * 0.4 + p * 0.2 + (anim ? anim.gardenBreeze : 0)) * 2.2;
                        fill(70, 200 - r * 18, 90 + r * 6);
                        ellipse(px, ry + sway, 6, 10);
                    }

                    // trellis posts + vine arcs for climbing plants
                    stroke(120, 80, 60); strokeWeight(1.2);
                    for (let t = -3; t <= 3; t += 2) {
                        const tx = t * (size * 0.12);
                        line(tx, ry + size * 0.02, tx, ry - size * 0.12);
                        noFill(); stroke(100, 170, 120); strokeWeight(1);
                        beginShape();
                        for (let v = 0; v <= 6; v++) vertex(tx + Math.sin(v * 0.6 + this.bobPhase * 0.0008) * 4, ry - size * 0.12 + v * (size * 0.02));
                        endShape();
                    }
                    noStroke();
                }

                // irrigation pipe with small sprinklers that pulse
                stroke(140); strokeWeight(2);
                line(-size * 0.34, size * 0.18 + bob, size * 0.34, size * 0.18 + bob);
                noStroke();
                for (let s = -2; s <= 2; s++) {
                    const sx = s * (size * 0.16);
                    const sy = size * 0.14 + bob - (Math.sin(this.bobPhase * 0.004 + s) * 0.6);
                    const spray = 0.4 + 0.4 * Math.sin(this.bobPhase * 0.006 + s * 1.4);
                    fill(180, 220, 240, 100 * spray);
                    ellipse(sx, sy - 6, 6 * spray, 6 * spray);
                }

                // tiny agricultural bots that traverse rows (simple oscillation)
                for (let b = 0; b < 2; b++) {
                    const bx = Math.sin(this.bobPhase * 0.004 + b) * (size * 0.18);
                    const by = -size * 0.02 + b * (size * 0.10) + bob * 0.12;
                    fill(200, 180, 140); rect(bx, by, 10, 6, 2);
                    stroke(110, 90, 70, 160); strokeWeight(0.6); line(bx - 6, by + 4, bx + 6, by + 4); noStroke();
                }

                // tiny pollinators/fireflies above crops (slightly warmer yellow)
                for (let f = 0; f < 5; f++) {
                    const fa = this.bobPhase * 0.002 + f * 1.7;
                    const fr = size * 0.2 + Math.sin(this.bobPhase * 0.004 + f) * 6;
                    fill(255, 230, 140, 200 - f * 20); ellipse(Math.cos(fa) * fr * 0.4, Math.sin(fa) * fr * 0.18 - size * 0.04 + bob * 0.1, 3, 3);
                }

                pop();
                break;

            case 'decoyBuoy':
                // small, cheap decoy that pulses and emits short-lived flares
                noStroke();
                fill(140, 160, 220);
                ellipse(0, bob, size * 0.5, size * 0.5);
                const dp = (Math.sin(anim ? anim.decoyPulse : this.bobPhase * 0.8) + 1) * 0.5;
                fill(255, 140, 60, 160 * dp);
                ellipse(0, bob - size * 0.06, size * (0.2 + dp * 0.6), size * (0.2 + dp * 0.6));
                // small outward puffs
                for (let p = 0; p < 3; p++) {
                    const pa = this.bobPhase * 0.01 + p * 1.5 + (anim ? anim.decoyPulse : 0);
                    const pr = size * (0.28 + p * 0.12) * dp;
                    fill(255, 180, 120, 60 * dp);
                    ellipse(Math.cos(pa) * pr, Math.sin(pa) * pr + bob - size * 0.06, 6 + p * 3 * dp, 2 + p * 1.5 * dp);
                }
                break;

            case 'miningPlatform':
                // Redesigned mining platform: central tower, articulated drill arms, conveyor belt and ore sacks
                push();
                // base platform (circular skid) with subtle rim
                noFill(); stroke(90); strokeWeight(2);
                ellipse(0, bob + size * 0.08, size * 0.9, size * 0.5);
                noStroke();

                // central tower
                push();
                fill(110, 110, 120);
                rect(0, -size * 0.06 + bob, size * 0.22, size * 0.6, 6);
                // windows on tower
                fill(200, 220, 240);
                for (let w = -1; w <= 1; w++) {
                    const wy = -size * 0.22 + w * (size * 0.18) + bob * 0.02;
                    rect(0, wy, size * 0.12, size * 0.08, 2);
                }
                pop();

                // articulated drill arms (3), each with a rotating drill head
                for (let a = 0; a < 3; a++) {
                    const ang = -PI / 3 + a * (PI / 3);
                    push();
                    rotate(ang + Math.sin(this.bobPhase * 0.001 + a) * 0.02);
                    // arm shaft
                    stroke(120); strokeWeight(3);
                    line(size * 0.12, size * 0.02 + bob, size * 0.48, size * 0.18 + bob);
                    // joint
                    noStroke(); fill(100); ellipse(size * 0.48, size * 0.18 + bob, size * 0.08, size * 0.06);
                    // drill head (rotating)
                    push(); translate(size * 0.48, size * 0.18 + bob);
                    const spin = (anim ? anim.miningSpin : 0) + (this.bobPhase * 0.002) + a * 0.8;
                    rotate(spin);
                    fill(80, 80, 90);
                    rect(0, 0, size * 0.12, size * 0.04, 2);
                    // drill tip
                    fill(170, 150, 110);
                    triangle(size * 0.08, 0, size * 0.16, -size * 0.03, size * 0.16, size * 0.03);
                    pop();
                    pop();
                }

                // conveyor belt in front of tower with animated boxes
                push();
                const beltY = size * 0.32 + bob;
                fill(50); rect(0, beltY, size * 0.6, size * 0.14, 3);
                // moving boxes — position driven by bobPhase to simulate motion
                const boxOffset = (Math.sin(this.bobPhase * 0.01) + 1) * 0.5;
                for (let b = -2; b <= 2; b++) {
                    const bx = b * (size * 0.12) + (boxOffset * size * 0.18);
                    fill(120, 100, 90);
                    rect(bx, beltY - 0.0, size * 0.08, size * 0.06, 2);
                }
                pop();

                // hanging ore sacks under platform edges
                for (let s = -2; s <= 2; s++) {
                    const sx = s * (size * 0.22);
                    const sy = size * 0.42 + bob;
                    fill(100, 70, 60);
                    ellipse(sx, sy, size * 0.12, size * 0.16);
                    stroke(60, 40, 30, 120); strokeWeight(1);
                    line(sx - 6, sy - 6, sx + 6, sy - 6);
                    noStroke();
                }

                // warning lights on tower — slow blink
                const warn = 0.6 + 0.4 * Math.sin(this.bobPhase * 0.004);
                fill(255, 120, 100, 200 * warn);
                ellipse(-size * 0.08, -size * 0.28 + bob, 6, 6);
                ellipse(size * 0.08, -size * 0.28 + bob, 6, 6);

                // subtle debris/sparks near drills
                for (let p = 0; p < 3; p++) {
                    const px = Math.cos(this.bobPhase * 0.002 + p) * (size * 0.5);
                    const py = Math.sin(this.bobPhase * 0.002 + p * 1.7) * 6 + bob * 0.2 + size * 0.12;
                    fill(220, 180, 120, 90 + p * 20);
                    ellipse(px * 0.1, py * 0.06, 2 + p, 1 + p * 0.4);
                }

                pop();
                break;

            case 'ancientRelic':
                // monolith with glowing runes and drifting micro-fragments
                noStroke();
                fill(40, 50, 60); rect(0, bob, size * 0.46, size * 0.88, 6);
                const rp = (Math.sin(anim ? anim.relicPulse : this.bobPhase * 0.001) + 1) * 0.5;
                // rune lines
                stroke(60, 200, 220, 160 * rp); strokeWeight(1.2);
                line(-size * 0.12, -size * 0.3 + bob, size * 0.12, -size * 0.12 + bob);
                line(-size * 0.12, size * 0.12 + bob, size * 0.12, size * 0.32 + bob);
                noStroke();
                // tiny levitating shards
                fill(100, 120, 140);
                for (let s = 0; s < 4; s++) ellipse(Math.cos(this.bobPhase * 0.002 + s) * size * 0.28, Math.sin(this.bobPhase * 0.002 + s * 1.3) * size * 0.12 + bob, 6, 6);
                // subtle emissive halo that breathes
                const relicGlow = 0.6 + 0.4 * Math.sin(anim ? anim.relicPulse : this.bobPhase * 0.001);
                noFill(); stroke(60, 200, 220, 90 * relicGlow); strokeWeight(2 * relicGlow);
                ellipse(0, bob, size * (0.6 + relicGlow * 0.4), size * (0.6 + relicGlow * 0.4));
                noStroke();
                break;

            case 'signalFlare':
                // calm, aesthetic signal flare: soft core, slow breathing halo, and gentle drifting motes
                noStroke();
                const phase = (anim ? anim.flarePhase : this.bobPhase * 0.008);
                const calm = 0.45 + 0.35 * Math.sin(phase);
                // soft core
                fill(250, 230, 140, 220 * calm);
                ellipse(0, bob, size * 0.42 * (0.9 + calm * 0.4), size * 0.32 * (0.9 + calm * 0.4));
                // subtle inner glow layers
                fill(255, 245, 200, 110 * (1 - calm));
                ellipse(0, bob, size * 0.6 * (0.85 + calm * 0.25), size * 0.42 * (0.85 + calm * 0.25));
                // slow breathing halo (thin, soft ring)
                push();
                stroke(255, 220, 140, 80 * (0.9 + calm * 0.4)); strokeWeight(1.4);
                noFill();
                const haloScale = 1.05 + calm * 0.25;
                ellipse(0, bob, size * (0.9 * haloScale), size * (0.6 * haloScale));
                pop();
                // a few gentle drifting motes to add life
                for (let m = 0; m < 3; m++) {
                    const ma = phase * 0.6 + m * 2.1;
                    const mr = size * (0.28 + m * 0.08) * (0.8 + 0.4 * Math.sin(phase + m));
                    fill(255, 240, 200, 60 + 40 * Math.sin(phase * (0.6 + m * 0.2)));
                    ellipse(Math.cos(ma) * mr * 0.4, Math.sin(ma) * mr * 0.18 + bob * 0.2, 3 + m, 2 + m * 0.6);
                }
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

    /** Human-friendly display name for UI messages */
    getDisplayName() {
        const nameMap = {
            satellite: 'Satellite',
            telescope: 'Telescope',
            relay: 'Relay Array',
            habitat: 'Habitat Module',
            debris: 'Debris',
            probe: 'Probe',
            beacon: 'Beacon',
            solarSail: 'Solar Sail',
            engineArray: 'Engine Array',
            cargoCluster: 'Cargo Cluster',
            researchArray: 'Research Array',
            orbitalGarden: 'Orbital Garden',
            decoyBuoy: 'Decoy Buoy',
            miningPlatform: 'Mining Platform',
            ancientRelic: 'Ancient Relic',
            signalFlare: 'Signal Flare',
            iceComet: 'Ice Comet'
        };
        return nameMap[this.type] || (this.type ? this.type : 'space object');
    }

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
