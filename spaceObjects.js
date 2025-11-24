// ****** spaceObjects.js ******
// Simple SpaceObject implementation for decorative satellites and telescopes
// Designed to be lightweight: small update() to rotate/oscillate, and draw() using p5 primitives

// Size map for each object type
const sizeMap = {
    satellite: 60,
    telescope: 100,
    relay: 120,
    habitat: 140,
    debris: 150,
    probe: 50,
    beacon: 40,
    solarSail: 320,
    engineArray: 150,
    cargoCluster: 200,
    researchArray: 176,
    orbitalGarden: 200,
    decoyBuoy: 40,
    miningPlatform: 200,
    ancientRelic: 200,
    signalFlare: 60,
    spaceStation: 200,
    asteroidMiner: 140,
    fuelDepot: 90,
    commDish: 70,
    solarFarm: 100,
    iceCrystal: 120,
    nebulaFragment: 150,
    alienArtifact: 80,
    wreckage: 95,
    observatoryDome: 85,
    hydroponicsBay: 105,
    weaponPlatform: 200,
    shieldGenerator: 75,
    energyCollector: 130,
    quantumGate: 160
};

// Static renderers for each object type to replace the monolithic draw() switch
const SpaceObjectRenderers = {
    satellite: function(obj, size, anim, bob) {
        noStroke();
        // central bus (vertical bob only — remove sideways shift)
        fill(190, 190, 210);
        rect(0, bob, size * 0.6, size * 0.42, 4);
        // subtle underside shadow
        fill(0, 0, 0, 30);
        ellipse(0, size * 0.28 + bob, size * 0.5, size * 0.12);
        // solar panels
        fill(30, 80, 160);
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
        // small rivets/fasteners along bus edge (decorative)
        fill(160, 170, 180);
        for (let r = -2; r <= 2; r++) ellipse(-size * 0.18 + r * 8, -size * 0.06 + bob, 3, 3);
        noStroke();
        // antenna dish
        fill(120);
        ellipse(size * 0.28, -size * 0.12 + bob, size * 0.22, size * 0.14);
        // small nav light with flashing
        const flash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.1);
        fill(255, 90, 80, 255 * flash);
        ellipse(-size * 0.18, -size * 0.18 + bob, 4, 4);
        // additional decorative flashing lights on panels
        fill(255, 255, 100, 200 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.08 + 1)));
        ellipse(-size * 0.78 + size * 0.32, bob - size * 0.08, 3, 3);
        fill(100, 255, 100, 200 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.08 + 2)));
        ellipse(size * 0.78 - size * 0.32, bob + size * 0.08, 3, 3);
        // slow-moving antenna extension
        push();
        rotate(Math.sin(obj.bobPhase * 0.002) * 0.1);
        stroke(120, 130, 140);
        strokeWeight(1);
        line(size * 0.28, -size * 0.12 + bob, size * 0.4, -size * 0.2 + bob);
        noStroke();
        fill(140, 150, 160);
        ellipse(size * 0.4, -size * 0.2 + bob, 4, 4);
        pop();
    },

    telescope: function(obj, size, anim, bob) {
        // Redesigned telescope: sleek cylindrical body with deployable dish, solar arrays, and instrument boom
        noStroke();
        // Main cylindrical body (sleek and metallic)
        fill(180, 190, 200);
        rect(0, bob, size * 0.12, size * 0.8, 4);
        // Top cap
        fill(160, 170, 180);
        ellipse(0, -size * 0.4 + bob, size * 0.14, size * 0.08);
        // Bottom base
        fill(140, 150, 160);
        ellipse(0, size * 0.4 + bob, size * 0.16, size * 0.1);

        // Deployable parabolic dish (large and segmented)
        push();
        translate(0, -size * 0.32 + bob);
        // subtle scanning tilt
        rotate(0.1 + Math.sin(anim ? anim.telescopeTilt : 0) * 0.04);
        // Dish segments (hexagonal pattern for realism)
        fill(220, 230, 240);
        for (let seg = 0; seg < 6; seg++) {
            const ang = seg * (TWO_PI / 6);
            push();
            rotate(ang);
            ellipse(size * 0.08, 0, size * 0.18, size * 0.12);
            pop();
        }
        // Central feed horn
        fill(100, 110, 120);
        ellipse(0, 0, size * 0.06, size * 0.04);
        // tiny star-tracker LED and sensor window
        fill(80, 220, 200, 200);
        ellipse(size * 0.04, -size * 0.02, 3, 3);
        // Support struts for dish
        stroke(120, 130, 140, 150); strokeWeight(1);
        for (let s = 0; s < 3; s++) {
            const sang = s * (TWO_PI / 3);
            line(0, 0, Math.cos(sang) * size * 0.12, Math.sin(sang) * size * 0.08);
        }
        noStroke();
        pop();

        // Solar arrays (extendable panels)
        fill(40, 70, 120);
        rect(-size * 0.5, bob - size * 0.1, size * 0.4, size * 0.06, 2);
        rect(size * 0.5, bob - size * 0.1, size * 0.4, size * 0.06, 2);
        // Panel details (grid lines)
        stroke(30, 50, 100, 180); strokeWeight(0.8);
        for (let p = -2; p <= 2; p++) {
            const px = p * (size * 0.08);
            line(-size * 0.5 + px, bob - size * 0.13, -size * 0.5 + px, bob - size * 0.07);
            line(size * 0.5 + px, bob - size * 0.13, size * 0.5 + px, bob - size * 0.07);
        }
        noStroke();

        // Instrument boom (extendable arm with sensors)
        stroke(130, 140, 150); strokeWeight(2);
        line(size * 0.08, bob, size * 0.35, bob - size * 0.15);
        noStroke();
        // Sensors on boom
        fill(200, 210, 220);
        ellipse(size * 0.35, bob - size * 0.15, size * 0.08, size * 0.06);
        fill(255, 100, 100);
        ellipse(size * 0.35, bob - size * 0.15, 4, 4); // indicator light

        // Antennas (small dishes or rods)
        fill(120, 130, 140);
        ellipse(-size * 0.08, -size * 0.2 + bob, size * 0.06, size * 0.04);
        ellipse(size * 0.08, -size * 0.2 + bob, size * 0.06, size * 0.04);
        // small sensor decal
        fill(160, 180, 200, 180);
        rect(0, -size * 0.08 + bob, size * 0.06, size * 0.02, 2);
        // Antenna rods
        stroke(100, 110, 120); strokeWeight(1.5);
        line(-size * 0.08, -size * 0.22 + bob, -size * 0.08, -size * 0.32 + bob);
        line(size * 0.08, -size * 0.22 + bob, size * 0.08, -size * 0.32 + bob);
        noStroke();

        // Cooling fins or radiators
        fill(160, 170, 180, 150);
        rect(-size * 0.04, bob + size * 0.1, size * 0.02, size * 0.3, 1);
        rect(size * 0.04, bob + size * 0.1, size * 0.02, size * 0.3, 1);

        // Flashing lights: status lights on body
        const flash1 = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.12);
        fill(255, 255, 0, 255 * flash1);
        ellipse(-size * 0.05, -size * 0.3 + bob, 3, 3);
        const flash2 = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.12 + 1);
        fill(0, 255, 255, 255 * flash2);
        ellipse(size * 0.05, -size * 0.3 + bob, 3, 3);
        // Slow-moving secondary boom
        push();
        rotate(Math.sin(obj.bobPhase * 0.001) * 0.05);
        stroke(130, 140, 150); strokeWeight(1.5);
        line(-size * 0.08, bob, -size * 0.25, bob - size * 0.1);
        noStroke();
        fill(180, 190, 200);
        ellipse(-size * 0.25, bob - size * 0.1, 5, 5);
        pop();
    },

    relay: function(obj, size, anim, bob) {
        // cluster of antennae on a small hub
        noFill();
        stroke(200);
        strokeWeight(1.5);
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * TWO_PI + (anim ? anim.relayPhase : 0) + obj.bobPhase * 0.06 * (i%2?1:-1);
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
        // rotating decorative pips (low-cost visual motion)
        for (let p = 0; p < 4; p++) {
            const a = anim ? anim.relayPhase + p * (TWO_PI / 4) : p * (TWO_PI / 4);
            const lx = Math.cos(a) * (size * 0.46);
            const ly = Math.sin(a) * (size * 0.14);
            fill(200, 220, 240, 200);
            ellipse(lx, ly, 4, 3);
        }
        // Flashing status lights on hub
        const flash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.15);
        fill(255, 255, 0, 255 * flash);
        ellipse(-size * 0.1, -size * 0.08, 3, 3);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.15 + 1)));
        ellipse(size * 0.1, -size * 0.08, 3, 3);
        // Slow-moving auxiliary antenna
        push();
        rotate(Math.sin(obj.bobPhase * 0.003) * 0.2);
        stroke(180, 190, 200);
        strokeWeight(1);
        line(0, 0, size * 0.4, -size * 0.2);
        noStroke();
        fill(160, 170, 180);
        ellipse(size * 0.4, -size * 0.2, 6, 4);
        pop();
        // Decorative rings around hub
        noFill();
        stroke(150, 160, 170, 100);
        strokeWeight(0.5);
        ellipse(0, 0, size * 0.5, size * 0.35);
        ellipse(0, 0, size * 0.6, size * 0.42);
        noStroke();
    },

    commDish: function(obj, size, anim, bob) {
        // Dedicated communication dish renderer: detailed parabolic reflector, feed horn, struts, swivel base and signal sweep
        noStroke();

        // Base pedestal
        fill(110, 120, 130);
        rect(0, bob + size * 0.18, size * 0.18, size * 0.12, 6);
        // Pedestal flange
        fill(90, 95, 100);
        ellipse(0, bob + size * 0.25, size * 0.28, size * 0.06);

        // Swivel ring (rotating base)
        push();
        rotate(anim ? anim.commDishSweep : 0);
        stroke(120, 130, 140);
        strokeWeight(1.2);
        noFill();
        ellipse(0, bob + size * 0.12, size * 0.22, size * 0.1);
        noStroke();

        // Parabolic reflector (slightly offset to imply depth)
        push();
        translate(0, bob - size * 0.06);
        // main dish surface
        fill(220, 230, 240);
        arc(0, 0, size * 0.6, size * 0.6, -PI, 0, CHORD);
        // inner segmentation lines for detail
        stroke(180, 190, 200, 160); strokeWeight(0.6);
        for (let s = 1; s <= 5; s++) {
            const r = (s / 5) * (size * 0.28);
            line(-r, Math.sqrt(Math.max(0, (size * 0.28) * (size * 0.28) - r * r)) * -0.3,
                 r, Math.sqrt(Math.max(0, (size * 0.28) * (size * 0.28) - r * r)) * -0.3);
        }
        noStroke();

        // Support struts to feed horn
        stroke(140, 150, 160); strokeWeight(1.2);
        for (let st = -1; st <= 1; st += 2) {
            line(0, 0, st * size * 0.12, -size * 0.14);
        }
        noStroke();

        // Feed horn / receiver (animated tilt)
        push();
        translate(0, -size * 0.14);
        rotate(anim ? anim.commDishTilt : 0);
        fill(70, 80, 90);
        rect(0, 0, size * 0.06, size * 0.1, 2);
        fill(200, 210, 220);
        ellipse(0, -size * 0.06, size * 0.04, size * 0.03);
        pop();

        // Specular highlight on rim
        fill(255, 255, 240, 50);
        beginShape();
        vertex(-size * 0.18, -size * 0.06);
        vertex(-size * 0.05, -size * 0.12);
        vertex(size * 0.05, -size * 0.12);
        vertex(size * 0.18, -size * 0.06);
        endShape(CLOSE);

        // Translucent signal sweep cone (animated)
        const sweep = (anim ? anim.commDishSweep : 0);
        push();
        rotate(sweep * 0.6);
        noStroke();
        fill(100, 180, 240, 28);
        beginShape();
        vertex(0, -size * 0.14);
        vertex(Math.cos(-0.32) * size * 1.4, Math.sin(-0.32) * size * 1.4);
        vertex(Math.cos(0.32) * size * 1.4, Math.sin(0.32) * size * 1.4);
        endShape(CLOSE);
        pop();

        // Small status lights on mast
        fill(255, 120, 120, 220);
        ellipse(-size * 0.06, bob + size * 0.02, 3, 3);
        fill(120, 255, 160, 220);
        ellipse(size * 0.06, bob + size * 0.02, 3, 3);

        pop(); // end swivel
    },

    habitat: function(obj, size, anim, bob) {
        // Cylindrical habitat module with rounded end-caps and curved windows
        noStroke();
        const cylW = size * 0.9;
        const cylH = size * 0.6;
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
            const flick = 0.5 + 0.5 * Math.sin(anim ? (anim.habitatWindowPhase + i * 0.6) : obj.bobPhase);
            fill(30, Math.floor(110 + 90 * flick), Math.floor(180 + 40 * flick), Math.floor(160 * (0.6 + 0.4 * flick)));
            rect(wx, wy, size * 0.10, size * 0.18, 4);
            // frame
            stroke(20, 40, 60, 160); strokeWeight(0.7); noFill(); rect(wx, wy, size * 0.10, size * 0.18, 4); noStroke();
        }
        // small external lifeboat pods
        fill(140, 130, 120);
        rect(-size * 0.5, -size * 0.06 + bob, size * 0.12, size * 0.06, 3);
        rect(size * 0.5, -size * 0.06 + bob, size * 0.12, size * 0.06, 3);
        // docking ring (thinner) to match new proportions
        stroke(120); strokeWeight(1.4); noFill(); ellipse(0, 0 + bob, cylW * 0.98, cylH * 0.88);
        // small clamp hints
        for (let c = -1; c <= 1; c++) {
            const cx = c * cylW * 0.34;
            stroke(100); strokeWeight(1); line(cx - 6, cylH * 0.18 + bob, cx + 6, cylH * 0.18 + bob);
        }
        noStroke();
        // Flashing navigation lights
        const navFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2);
        fill(255, 0, 0, 255 * navFlash);
        ellipse(-size * 0.45, -size * 0.1 + bob, 4, 4);
        fill(0, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2 + 1)));
        ellipse(size * 0.45, -size * 0.1 + bob, 4, 4);
        // Slow-moving solar panel extension
        push();
        rotate(Math.sin(obj.bobPhase * 0.002) * 0.1);
        fill(40, 80, 160);
        rect(size * 0.55, bob, size * 0.2, size * 0.08, 2);
        stroke(20, 40, 90, 150);
        strokeWeight(0.5);
        for (let g = 0; g < 3; g++) {
            line(size * 0.55 + g * (size * 0.2 / 3), bob - size * 0.04, size * 0.55 + g * (size * 0.2 / 3), bob + size * 0.04);
        }
        noStroke();
        pop();
        // Decorative insignia on body
        fill(200, 210, 220, 150);
        ellipse(0, -size * 0.15 + bob, size * 0.1, size * 0.06);
    },

    debris: function(obj, size, anim, bob) {
        // irregular scrap - draw persistent shards (each has own rotation)
        noStroke();
        fill(140, 120, 110);
        if (obj._shards && obj._shards.length) {
            for (let i = 0; i < obj._shards.length; i++) {
                const sh = obj._shards[i];
                push();
                translate(sh.rx, sh.ry);
                rotate(sh.angle + Math.sin(obj.bobPhase * 0.002) * 0.03);
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
            // subtle drifting dust puffs (low cost — only few ellipses)
            fill(180, 160, 140, 60);
            for (let d = 0; d < 3; d++) {
                const da = obj.bobPhase * 0.001 + d * 2.1;
                ellipse(Math.cos(da) * size * 0.32, Math.sin(da) * size * 0.12 + bob * 0.08, 6, 3);
            }
            // Flashing hazard lights on larger shards
            const hazardFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25);
            fill(255, 0, 0, 200 * hazardFlash);
            ellipse(0, -size * 0.1 + bob, 4, 4);
            fill(255, 255, 0, 200 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + 1)));
            ellipse(size * 0.1, size * 0.1 + bob, 3, 3);
            // Slow-moving glowing particles
            for (let p = 0; p < 2; p++) {
                const pa = obj.bobPhase * 0.003 + p * 3.14;
                const pr = size * 0.2;
                fill(200, 150, 100, 100 + 50 * Math.sin(pa));
                ellipse(Math.cos(pa) * pr, Math.sin(pa) * pr + bob * 0.05, 2, 2);
            }
        }
    },

    probe: function(obj, size, anim, bob) {
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
        const blink = 0.5 + 0.5 * Math.sin(anim ? anim.probeBlink : obj.bobPhase * 0.1);
        fill(255, 140, 80, 220 * blink);
        ellipse(0, -size * 0.42 + bob, 5 * (1 + blink), 5 * (1 + blink));
        // tiny heat/engine trail (cheap translucent ellipse)
        fill(120, 180, 255, 40);
        ellipse(0, size * 0.48 + bob, size * 0.28, size * 0.08);
        // Flashing status lights
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18);
        fill(0, 255, 0, 255 * statusFlash);
        ellipse(-size * 0.06, size * 0.1 + bob, 3, 3);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18 + 1)));
        ellipse(size * 0.06, size * 0.1 + bob, 3, 3);
        // Slow-moving antenna deployment
        push();
        rotate(Math.sin(obj.bobPhase * 0.004) * 0.15);
        stroke(150, 160, 170);
        strokeWeight(1);
        line(0, -size * 0.3 + bob, size * 0.2, -size * 0.4 + bob);
        noStroke();
        fill(180, 190, 200);
        ellipse(size * 0.2, -size * 0.4 + bob, 4, 4);
        pop();
        // Decorative sensor bands
        stroke(120, 130, 140, 150);
        strokeWeight(0.5);
        for (let b = 0; b < 3; b++) {
            const by = -size * 0.2 + b * (size * 0.15) + bob;
            line(-size * 0.08, by, size * 0.08, by);
        }
        noStroke();
    },

    beacon: function(obj, size, anim, bob) {
        // small floating beacon with pulsing light
        noStroke();
        fill(100);
        rect(0, 6 + bob, size * 0.18, size * 0.5, 3);
        // light (stronger pulse)
        const pulse = (Math.sin(obj.bobPhase * 1.6) + 1) * 0.5;
        const glow = 0.5 + 0.5 * pulse;
        noStroke();
        fill(255, 220, 60, 160 * glow);
        ellipse(0, -size * 0.12 + bob, size * 0.42 * (0.9 + 0.4 * pulse));
        // small ring / halo
        stroke(200, 200, 80, 90); strokeWeight(1.2); noFill(); ellipse(0, 0 + bob, size * (0.8 + pulse * 0.6), size * (0.6 + pulse * 0.4)); noStroke();
        // rotating indicator (low cost)
        push();
        rotate(obj.bobPhase * 0.002);
        stroke(255, 220, 60, 120); strokeWeight(1);
        line(0, -size * 0.5 + bob, 0, -size * 0.7 + bob);
        noStroke();
        pop();
        // Flashing auxiliary lights
        const auxFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(0, 255, 255, 255 * auxFlash);
        ellipse(-size * 0.08, size * 0.1 + bob, 3, 3);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.08, size * 0.1 + bob, 3, 3);
        // Slow-moving antenna array
        push();
        rotate(Math.sin(obj.bobPhase * 0.005) * 0.3);
        stroke(120, 130, 140);
        strokeWeight(0.8);
        for (let a = 0; a < 3; a++) {
            const aa = a * (TWO_PI / 3);
            line(0, bob, Math.cos(aa) * size * 0.15, Math.sin(aa) * size * 0.15 + bob);
        }
        noStroke();
        fill(140, 150, 160);
        ellipse(0, bob - size * 0.05, 4, 4);
        pop();
        // Decorative base details
        fill(80, 80, 90);
        rect(-size * 0.05, size * 0.3 + bob, size * 0.1, size * 0.08, 2);
    },

    spaceStation: function(obj, size, anim, bob) {
        // Massive space station: central hub with multiple modules, solar arrays, antennas, docking ports, and operational details
        noStroke();
        // Central hub (large cylindrical core)
        fill(180, 190, 200);
        rect(0, bob, size * 0.15, size * 0.8, 8);
        // Hub end caps
        fill(160, 170, 180);
        ellipse(0, -size * 0.4 + bob, size * 0.18, size * 0.12);
        ellipse(0, size * 0.4 + bob, size * 0.18, size * 0.12);

        // Multiple radial modules (habitation, research, cargo)
        for (let m = 0; m < 6; m++) {
            const ang = m * (TWO_PI / 6);
            push();
            rotate(ang);
            translate(size * 0.25, bob);
            // Module body
            fill(170, 180, 190);
            rect(0, 0, size * 0.2, size * 0.12, 4);
            // Windows/lights
            fill(255, 255, 200, 180);
            for (let w = -1; w <= 1; w++) {
                rect(w * (size * 0.04), 0, size * 0.02, size * 0.08, 2);
            }
            // Connecting corridor
            stroke(150, 160, 170);
            strokeWeight(2);
            line(-size * 0.1, 0, 0, 0);
            noStroke();
            pop();
        }

        // Large solar arrays (extendable panels)
        fill(50, 80, 130);
        rect(-size * 0.8, bob - size * 0.1, size * 0.6, size * 0.08, 3);
        rect(size * 0.8, bob - size * 0.1, size * 0.6, size * 0.08, 3);
        rect(0, bob - size * 0.8, size * 0.08, size * 0.6, 3);
        rect(0, bob + size * 0.8, size * 0.08, size * 0.6, 3);
        // Panel grid lines
        stroke(40, 60, 100, 150);
        strokeWeight(0.8);
        for (let g = -3; g <= 3; g++) {
            const gx = g * (size * 0.1);
            line(-size * 0.8 + gx, bob - size * 0.14, -size * 0.8 + gx, bob - size * 0.06);
            line(size * 0.8 + gx, bob - size * 0.14, size * 0.8 + gx, bob - size * 0.06);
            line(-size * 0.04, bob - size * 0.8 + gx, size * 0.04, bob - size * 0.8 + gx);
            line(-size * 0.04, bob + size * 0.8 + gx, size * 0.04, bob + size * 0.8 + gx);
        }
        noStroke();

        // Communication antennas and dishes
        fill(120, 130, 140);
        for (let a = 0; a < 4; a++) {
            const aang = a * (TWO_PI / 4) + (anim ? anim.stationAntenna : 0);
            const ax = Math.cos(aang) * size * 0.35;
            const ay = Math.sin(aang) * size * 0.35 + bob;
            ellipse(ax, ay, size * 0.08, size * 0.06);
            // Antenna rods
            stroke(100, 110, 120);
            strokeWeight(1.5);
            line(ax, ay - size * 0.03, ax, ay - size * 0.08);
            line(ax - size * 0.02, ay - size * 0.03, ax - size * 0.02, ay - size * 0.08);
            noStroke();
        }

        // Docking ports (extended arms with lights)
        for (let d = 0; d < 3; d++) {
            const dang = d * (TWO_PI / 3) + Math.PI / 6;
            push();
            rotate(dang);
            translate(size * 0.4, bob);
            // Docking arm
            fill(140, 150, 160);
            rect(0, 0, size * 0.15, size * 0.06, 3);
            // Docking lights
            fill(0, 255, 0, 200);
            ellipse(-size * 0.05, 0, 4, 4);
            fill(255, 0, 0, 200);
            ellipse(size * 0.05, 0, 4, 4);
            pop();
        }

        // Central radar/comms dome
        fill(200, 210, 220);
        ellipse(0, -size * 0.3 + bob, size * 0.12, size * 0.08);
        // Dome windows
        fill(255, 255, 255, 150);
        ellipse(0, -size * 0.3 + bob, size * 0.08, size * 0.05);

        // External cargo pods
        for (let p = 0; p < 2; p++) {
            const pang = p * Math.PI + (anim ? anim.stationPods : 0);
            const px = Math.cos(pang) * size * 0.5;
            const py = Math.sin(pang) * size * 0.3 + bob;
            fill(120, 110, 100);
            ellipse(px, py, size * 0.1, size * 0.08);
        }

        // Flashing navigation and status lights
        const navFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(255, 255, 0, 255 * navFlash);
        ellipse(-size * 0.2, -size * 0.4 + bob, 5, 5);
        fill(0, 255, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.2, -size * 0.4 + bob, 5, 5);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 2)));
        ellipse(0, size * 0.5 + bob, 5, 5);

        // Slow-moving rotating antenna array
        push();
        rotate(Math.sin(obj.bobPhase * 0.002) * 0.3);
        stroke(130, 140, 150);
        strokeWeight(1.5);
        for (let ra = 0; ra < 3; ra++) {
            const raa = ra * (TWO_PI / 3);
            line(0, bob - size * 0.2, Math.cos(raa) * size * 0.25, Math.sin(raa) * size * 0.25 + bob - size * 0.2);
        }
        noStroke();
        fill(150, 160, 170);
        ellipse(0, bob - size * 0.2, 6, 6);
        pop();

        // Heat radiators
        fill(160, 170, 180, 150);
        rect(-size * 0.08, bob + size * 0.15, size * 0.04, size * 0.4, 1);
        rect(size * 0.08, bob + size * 0.15, size * 0.04, size * 0.4, 1);
    },

    observatoryDome: function(obj, size, anim, bob) {
        // Enhanced observatory dome: massive transparent dome with advanced telescope arrays, multiple observation decks, research modules, and extensive instrumentation
        noStroke();

        // Main support structure (hexagonal base with multiple levels)
        fill(120, 130, 140);
        beginShape();
        for (let h = 0; h < 6; h++) {
            const hx = Math.cos(h * TWO_PI / 6) * size * 0.5;
            const hy = Math.sin(h * TWO_PI / 6) * size * 0.5 + bob;
            vertex(hx, hy);
        }
        endShape(CLOSE);

        // Secondary support rings
        fill(100, 110, 120);
        ellipse(0, bob, size * 0.9, size * 0.15);
        ellipse(0, bob - size * 0.1, size * 0.8, size * 0.12);
        ellipse(0, bob - size * 0.2, size * 0.7, size * 0.1);

        // Central support pillar with elevator shaft
        fill(140, 150, 160);
        rect(0, bob - size * 0.25, size * 0.1, size * 0.5, 4);
        // Elevator car
        fill(180, 190, 200);
        rect(0, bob - size * 0.15 + Math.sin(anim ? anim.domeRotation : 0) * 2, size * 0.06, size * 0.04, 2);

        // Massive observation dome (multi-layered transparent structure)
        fill(220, 240, 255, 100);
        ellipse(0, bob - size * 0.45, size * 0.8, size * 0.4);
        // Inner dome layer
        fill(200, 235, 250, 80);
        ellipse(0, bob - size * 0.45, size * 0.7, size * 0.35);
        // Dome frame (complex truss structure)
        stroke(90, 100, 110, 180);
        strokeWeight(2);
        noFill();
        ellipse(0, bob - size * 0.45, size * 0.82, size * 0.42);
        // Internal support ribs
        for (let r = 0; r < 8; r++) {
            const ra = r * TWO_PI / 8;
            const rx1 = Math.cos(ra) * size * 0.35;
            const ry1 = Math.sin(ra) * size * 0.18 - size * 0.45 + bob;
            const rx2 = Math.cos(ra) * size * 0.38;
            const ry2 = Math.sin(ra) * size * 0.2 - size * 0.45 + bob;
            line(rx1, ry1, rx2, ry2);
        }
        noStroke();

        // Primary telescope assembly (rotating main telescope)
        push();
        translate(0, bob - size * 0.45);
        rotate(anim ? anim.telescopeSweep : 0);
        // Main telescope tube
        fill(60, 70, 80);
        rect(0, 0, size * 0.12, size * 0.35, 3);
        // Telescope mirror/lens housing
        fill(30, 40, 50);
        ellipse(0, -size * 0.2, size * 0.08, size * 0.06);
        // Focusing mechanism rings
        stroke(100, 110, 120);
        strokeWeight(1);
        for (let f = 0; f < 3; f++) {
            const fy = -size * 0.12 + f * size * 0.04;
            line(-size * 0.04, fy, size * 0.04, fy);
        }
        noStroke();
        // Counterweight arm
        fill(80, 90, 100);
        rect(size * 0.08, size * 0.1, size * 0.06, size * 0.02, 1);
        pop();

        // Secondary telescope arrays (fixed position)
        for (let s = 0; s < 3; s++) {
            const sa = s * TWO_PI / 3;
            push();
            rotate(sa);
            translate(size * 0.25, bob - size * 0.3);
            // Secondary telescope housing
            fill(70, 80, 90);
            rect(0, 0, size * 0.08, size * 0.2, 2);
            // Lens assembly
            fill(40, 50, 60);
            ellipse(0, -size * 0.12, size * 0.05, size * 0.04);
            pop();
        }

        // Research modules attached to base
        for (let m = 0; m < 4; m++) {
            const ma = m * TWO_PI / 4;
            push();
            rotate(ma);
            translate(size * 0.4, bob - size * 0.05);
            // Module housing
            fill(160, 170, 180);
            rect(0, 0, size * 0.12, size * 0.08, 3);
            // Instrument ports
            fill(100, 120, 140);
            ellipse(-size * 0.03, 0, size * 0.02, size * 0.02);
            ellipse(size * 0.03, 0, size * 0.02, size * 0.02);
            // Data cable connections
            stroke(120, 130, 140);
            strokeWeight(1);
            line(-size * 0.06, 0, -size * 0.08, -size * 0.02);
            line(size * 0.06, 0, size * 0.08, -size * 0.02);
            noStroke();
            pop();
        }

        // Observation decks (multiple levels)
        for (let d = 0; d < 2; d++) {
            const dy = bob - size * 0.35 + d * size * 0.1;
            fill(180, 190, 200, 150);
            ellipse(0, dy, size * 0.5, size * 0.08);
            // Deck railing
            stroke(140, 150, 160);
            strokeWeight(1);
            noFill();
            ellipse(0, dy, size * 0.52, size * 0.1);
            noStroke();
        }

        // Solar power arrays (large panels)
        fill(30, 60, 100);
        rect(-size * 0.6, bob + size * 0.1, size * 0.35, size * 0.06, 2);
        rect(size * 0.6, bob + size * 0.1, size * 0.35, size * 0.06, 2);
        // Panel details and wiring
        stroke(20, 40, 80, 180);
        strokeWeight(0.8);
        for (let pd = -3; pd <= 3; pd++) {
            const pdx = pd * (size * 0.05);
            line(-size * 0.6 + pdx, bob + size * 0.07, -size * 0.6 + pdx, bob + size * 0.13);
            line(size * 0.6 + pdx, bob + size * 0.07, size * 0.6 + pdx, bob + size * 0.13);
        }
        noStroke();

        // Communication arrays and antennae
        fill(100, 110, 120);
        ellipse(-size * 0.3, bob - size * 0.2, size * 0.1, size * 0.06);
        ellipse(size * 0.3, bob - size * 0.2, size * 0.1, size * 0.06);
        // Antenna masts
        stroke(80, 90, 100);
        strokeWeight(1.5);
        line(-size * 0.3, bob - size * 0.23, -size * 0.3, bob - size * 0.3);
        line(size * 0.3, bob - size * 0.23, size * 0.3, bob - size * 0.3);
        // Satellite dishes
        fill(120, 130, 140);
        ellipse(-size * 0.3, bob - size * 0.25, size * 0.04, size * 0.03);
        ellipse(size * 0.3, bob - size * 0.25, size * 0.04, size * 0.03);
        noStroke();

        // Atmospheric sensors and weather instruments
        for (let w = 0; w < 6; w++) {
            const wa = w * TWO_PI / 6;
            const wx = Math.cos(wa) * size * 0.45;
            const wy = Math.sin(wa) * size * 0.45 + bob - size * 0.1;
            fill(140, 150, 160);
            ellipse(wx, wy, size * 0.03, size * 0.02);
        }

        // Cooling systems and vents
        fill(120, 130, 140, 150);
        rect(-size * 0.08, bob + size * 0.15, size * 0.04, size * 0.25, 1);
        rect(size * 0.08, bob + size * 0.15, size * 0.04, size * 0.25, 1);
        // Heat exchanger fins
        stroke(100, 110, 120, 120);
        strokeWeight(0.6);
        for (let f = 0; f < 5; f++) {
            const fy = bob + size * 0.18 + f * size * 0.04;
            line(-size * 0.06, fy, size * 0.06, fy);
        }
        noStroke();

        // Advanced lighting and status indicators
        const obsFlash1 = 0.5 + 0.5 * Math.sin((anim ? anim.observationLights : 0));
        const obsFlash2 = 0.5 + 0.5 * Math.sin((anim ? anim.observationLights : 0) + 1);
        const obsFlash3 = 0.5 + 0.5 * Math.sin((anim ? anim.observationLights : 0) + 2);
        fill(255, 255, 150, 255 * obsFlash1);
        ellipse(-size * 0.2, bob - size * 0.4, 5, 5);
        fill(150, 255, 255, 255 * obsFlash2);
        ellipse(size * 0.2, bob - size * 0.4, 5, 5);
        fill(255, 150, 255, 255 * obsFlash3);
        ellipse(0, bob + size * 0.25, 5, 5);

        // Research drone bay
        fill(160, 170, 180);
        rect(0, bob + size * 0.2, size * 0.15, size * 0.06, 3);
        // Bay doors (animated)
        const doorOpen = Math.sin(anim ? anim.domeRotation : 0) * 0.3;
        fill(140, 150, 160);
        rect(-size * 0.08 + doorOpen * size * 0.04, bob + size * 0.2, size * 0.06, size * 0.04, 1);
        rect(size * 0.08 - doorOpen * size * 0.04, bob + size * 0.2, size * 0.06, size * 0.04, 1);

        // Orbital positioning thrusters
        for (let t = 0; t < 4; t++) {
            const ta = t * TWO_PI / 4 + Math.PI / 4;
            const tx = Math.cos(ta) * size * 0.55;
            const ty = Math.sin(ta) * size * 0.55 + bob;
            fill(100, 110, 120);
            ellipse(tx, ty, size * 0.04, size * 0.03);
        }

        // Slow-moving calibration arm
        push();
        rotate(Math.sin((anim ? anim.telescopeSweep : 0) * 0.5) * 0.3);
        stroke(120, 130, 140);
        strokeWeight(1.5);
        line(0, bob - size * 0.35, size * 0.25, bob - size * 0.45);
        noStroke();
        fill(140, 150, 160);
        ellipse(size * 0.25, bob - size * 0.45, 6, 6);
        pop();
    },

    weaponPlatform: function(obj, size, anim, bob) {
        // Enhanced weapon platform: heavily armored battle station with multiple weapon systems, defense arrays, command center, and tactical systems
        noStroke();

        // Main armored hull (multi-layered defensive structure)
        fill(60, 60, 70);
        rect(0, bob, size * 0.8, size * 0.5, 10);
        // Armor plating layers
        fill(50, 50, 60);
        rect(0, bob - size * 0.15, size * 0.7, size * 0.08, 6);
        rect(0, bob + size * 0.15, size * 0.7, size * 0.08, 6);
        // Reinforced corners
        fill(40, 40, 50);
        for (let c = 0; c < 4; c++) {
            const cx = (c % 2 === 0 ? -1 : 1) * size * 0.35;
            const cy = (c < 2 ? -1 : 1) * size * 0.2 + bob;
            ellipse(cx, cy, size * 0.1, size * 0.08);
        }

        // Primary turret systems (heavy rotating cannons)
        for (let t = 0; t < 4; t++) {
            const tang = t * (TWO_PI / 4) + (anim ? anim.turretRotation : 0);
            push();
            rotate(tang);
            translate(size * 0.3, bob);
            // Turret base and armor
            fill(70, 70, 80);
            ellipse(0, 0, size * 0.15, size * 0.1);
            // Main gun barrels (dual cannons)
            fill(25, 25, 35);
            rect(-size * 0.03, -size * 0.12, size * 0.06, size * 0.15, 2);
            rect(size * 0.03, -size * 0.12, size * 0.06, size * 0.15, 2);
            // Gun mantlet
            fill(50, 50, 60);
            ellipse(0, -size * 0.08, size * 0.08, size * 0.06);
            // Targeting systems
            fill(255, 0, 0, 180);
            ellipse(0, -size * 0.06, size * 0.03, size * 0.03);
            // Coaxial machine gun
            fill(35, 35, 45);
            rect(0, -size * 0.04, size * 0.02, size * 0.08, 1);
            pop();
        }

        // Missile launch systems (vertical launch tubes)
        for (let m = 0; m < 8; m++) {
            const mang = m * (TWO_PI / 8);
            const mx = Math.cos(mang) * size * 0.4;
            const my = Math.sin(mang) * size * 0.4 + bob;
            // Launch tube housing
            fill(55, 55, 65);
            rect(mx, my, size * 0.05, size * 0.1, 3);
            // Missile visible in tube
            fill(150, 30, 30);
            ellipse(mx, my - size * 0.05, size * 0.04, size * 0.03);
            // Launch rail details
            stroke(40, 40, 50);
            strokeWeight(0.8);
            line(mx - size * 0.02, my - size * 0.05, mx - size * 0.02, my + size * 0.05);
            line(mx + size * 0.02, my - size * 0.05, mx + size * 0.02, my + size * 0.05);
            noStroke();
        }

        // Defense shield generators (pulsing energy domes) — enhanced visuals
        for (let s = 0; s < 4; s++) {
            const sang = s * (TWO_PI / 4) + Math.PI / 4;
            const sx = Math.cos(sang) * size * 0.25;
            const sy = Math.sin(sang) * size * 0.25 + bob - size * 0.2;

            // Physical generator housing (dome + emitter)
            fill(110, 130, 150);
            ellipse(sx, sy, size * 0.14, size * 0.1);
            fill(80, 95, 110);
            ellipse(sx, sy + size * 0.02, size * 0.06, size * 0.04);

            // Emitter arms
            stroke(140, 160, 180); strokeWeight(1);
            for (let ea = -1; ea <= 1; ea += 2) line(sx, sy + size * 0.01, sx + ea * size * 0.12, sy - size * 0.08);
            noStroke();

            // Pulsing shield visualization (concentric translucent rings)
            const basePhase = (anim ? anim.defensePulse : obj.bobPhase * 0.006) + s * 0.9;
            const sp = 0.6 + 0.4 * Math.sin(basePhase);
            for (let r = 0; r < 3; r++) {
                const rr = size * (0.16 + r * 0.06) * sp;
                fill(100, 170, 230, 36 * (1 - r * 0.18) * (1 + 0.4 * Math.sin(basePhase + r)));
                ellipse(sx, sy, rr, rr * 0.6);
            }

            // Generator frame and glow edge
            stroke(120, 140, 160, 200); strokeWeight(1.2);
            noFill();
            ellipse(sx, sy, size * 0.16, size * 0.11);
            stroke(160, 200, 255, 90); strokeWeight(0.8);
            ellipse(sx, sy, size * 0.2 * sp, size * 0.12 * sp);
            noStroke();
        }

        // Advanced radar and targeting array
        push();
        translate(0, bob - size * 0.25);
        rotate(anim ? anim.weaponCharge : 0);
        // Main radar dish
        fill(100, 110, 120);
        ellipse(0, 0, size * 0.2, size * 0.12);
        // Radar emitter
        fill(80, 90, 100);
        ellipse(0, -size * 0.08, size * 0.08, size * 0.06);
        // Scanning beams (animated spokes)
        stroke(150, 200, 255, 120);
        strokeWeight(1.2);
        for (let r = 0; r < 12; r++) {
            const rang = r * (TWO_PI / 12) + (anim ? anim.weaponCharge : 0) * 2;
            const rx = Math.cos(rang) * size * 0.09;
            const ry = Math.sin(rang) * size * 0.05;
            line(0, 0, rx, ry);
        }
        noStroke();
        pop();

        // Point defense turrets (smaller anti-missile systems)
        for (let p = 0; p < 6; p++) {
            const pang = p * (TWO_PI / 6);
            const px = Math.cos(pang) * size * 0.35;
            const py = Math.sin(pang) * size * 0.35 + bob + size * 0.1;
            fill(65, 65, 75);
            ellipse(px, py, size * 0.06, size * 0.04);
            // Defense gun
            fill(30, 30, 40);
            rect(px, py - size * 0.03, size * 0.02, size * 0.05, 1);
        }

        // Command and control center
        fill(80, 85, 90);
        rect(0, bob - size * 0.1, size * 0.3, size * 0.15, 4);
        // Viewports
        fill(150, 180, 200, 120);
        for (let v = -1; v <= 1; v++) {
            ellipse(v * size * 0.08, bob - size * 0.1, size * 0.04, size * 0.03);
        }
        // Antenna array on command center
        fill(100, 110, 120);
        rect(0, bob - size * 0.18, size * 0.06, size * 0.04, 2);

        // External armor reinforcement plates
        fill(70, 70, 80, 160);
        for (let a = 0; a < 12; a++) {
            const aang = a * (TWO_PI / 12);
            const ax = Math.cos(aang) * size * 0.32;
            const ay = Math.sin(aang) * size * 0.32 + bob;
            ellipse(ax, ay, size * 0.08, size * 0.05);
        }

        // Power conduits and energy transfer systems
        stroke(180, 120, 80, 140);
        strokeWeight(2.5);
        for (let c = 0; c < 4; c++) {
            const cx = (c - 1.5) * size * 0.12;
            line(cx, bob - size * 0.25, cx, bob + size * 0.25);
        }
        noStroke();

        // Weapon charging capacitors (glowing when active)
        const chargeLevel = 0.5 + 0.5 * Math.sin(anim ? anim.weaponCharge : 0);
        for (let cap = 0; cap < 4; cap++) {
            const ca = cap * (TWO_PI / 4) + Math.PI / 4;
            const cax = Math.cos(ca) * size * 0.2;
            const cay = Math.sin(ca) * size * 0.2 + bob;
            fill(200, 150, 100, 100 + 100 * chargeLevel);
            ellipse(cax, cay, size * 0.05 * (0.8 + 0.4 * chargeLevel), size * 0.04 * (0.8 + 0.4 * chargeLevel));
        }

        // Tactical status lights and indicators
        const weaponFlash1 = 0.5 + 0.5 * Math.sin((anim ? anim.turretRotation : 0) * 2);
        const weaponFlash2 = 0.5 + 0.5 * Math.sin((anim ? anim.turretRotation : 0) * 2 + 1);
        const weaponFlash3 = 0.5 + 0.5 * Math.sin((anim ? anim.turretRotation : 0) * 2 + 2);
        fill(255, 0, 0, 255 * weaponFlash1);
        ellipse(-size * 0.3, bob - size * 0.22, 5, 5);
        fill(255, 255, 0, 255 * weaponFlash2);
        ellipse(size * 0.3, bob - size * 0.22, 5, 5);
        fill(0, 255, 0, 255 * weaponFlash3);
        ellipse(0, bob + size * 0.28, 5, 5);

        // Maintenance and repair drones
        for (let d = 0; d < 2; d++) {
            const da = (anim ? anim.defensePulse : 0) + d * Math.PI;
            const dr = size * 0.45;
            const dx = Math.cos(da) * dr * 0.8;
            const dy = Math.sin(da) * dr * 0.4 + bob;
            fill(100, 100, 110);
            ellipse(dx, dy, 10, 8);
            // Repair arm
            stroke(80, 80, 90, 150);
            strokeWeight(0.8);
            line(dx, dy, dx + Math.cos(da) * 8, dy + Math.sin(da) * 8);
            noStroke();
        }

        // Heat dissipation systems
        fill(130, 140, 150, 160);
        rect(-size * 0.06, bob + size * 0.18, size * 0.04, size * 0.2, 1);
        rect(size * 0.06, bob + size * 0.18, size * 0.04, size * 0.2, 1);
        // Cooling fins
        stroke(110, 120, 130, 130);
        strokeWeight(0.6);
        for (let f = 0; f < 6; f++) {
            const fy = bob + size * 0.2 + f * size * 0.03;
            line(-size * 0.04, fy, size * 0.04, fy);
        }
        noStroke();

        // Orbital maneuvering thrusters
        for (let t = 0; t < 8; t++) {
            const ta = t * (TWO_PI / 8);
            const tx = Math.cos(ta) * size * 0.42;
            const ty = Math.sin(ta) * size * 0.42 + bob;
            fill(90, 100, 110);
            ellipse(tx, ty, size * 0.04, size * 0.03);
            // Thruster glow
            fill(150, 200, 255, 80);
            ellipse(tx, ty + size * 0.02, size * 0.03, size * 0.02);
        }

        // Slow-moving targeting scanner arm
        push();
        rotate(Math.sin((anim ? anim.weaponCharge : 0) * 0.8) * 0.4);
        stroke(110, 120, 130);
        strokeWeight(1.5);
        line(0, bob - size * 0.2, size * 0.28, bob - size * 0.3);
        noStroke();
        fill(120, 130, 140);
        ellipse(size * 0.28, bob - size * 0.3, 6, 6);
        pop();
    },

    default: function(obj, size, anim, bob) {
        // fallback simple marker
        fill(200, 200, 200);
        ellipse(0, 0 + bob, size * 0.6, size * 0.6);
    },

    shieldGenerator: function(obj, size, anim, bob) {
        // Standalone shield generator: visible dome, emitter pylons, pulsing energy field and protective ring
        noStroke();
        // Main housing
        fill(110, 125, 140);
        ellipse(0, bob, size * 0.36, size * 0.22);
        fill(80, 95, 110);
        ellipse(0, bob + size * 0.06, size * 0.16, size * 0.08);

        // Emitter pylons around base
        stroke(140, 160, 180); strokeWeight(1);
        for (let p = 0; p < 4; p++) {
            const pa = p * (TWO_PI / 4) + obj.bobPhase * 0.001;
            const px = Math.cos(pa) * size * 0.28;
            const py = Math.sin(pa) * size * 0.12 + bob;
            line(px, py, px * 0.8, py - size * 0.12);
            fill(130, 150, 170);
            noStroke(); ellipse(px, py, size * 0.06, size * 0.04);
        }

        // Pulsing shield visualization (concentric faded rings)
        const phase = (anim ? anim.shieldPulse : obj.bobPhase * 0.004);
        const pulse = 0.6 + 0.45 * Math.sin(phase);
        noStroke();
        for (let r = 0; r < 4; r++) {
            const alpha = 36 * Math.max(0, 1 - r * 0.22) * (0.6 + 0.4 * Math.sin(phase + r * 0.6));
            fill(80, 160, 240, alpha);
            ellipse(0, bob, size * (0.5 + r * 0.18) * pulse, size * (0.32 + r * 0.12) * pulse);
        }

        // Protective shimmer ring (subtle rotating highlight)
        stroke(160, 200, 255, 120); strokeWeight(0.8);
        const ringAng = Math.sin(phase * 0.8) * 0.35;
        push(); rotate(ringAng);
        noFill(); ellipse(0, bob, size * 0.72 * (0.9 + 0.05 * Math.sin(phase)), size * 0.48 * (0.9 + 0.05 * Math.sin(phase)));
        pop();
        noStroke();

        // Status lights and small emitter glow
        fill(255, 120, 140, 200); ellipse(-size * 0.18, bob - size * 0.02, 4, 3);
        fill(120, 255, 180, 200); ellipse(size * 0.18, bob - size * 0.02, 4, 3);
    },

    solarSail: function(obj, size, anim, bob) {
        // huge reflective sails with extra structural and visual detail
        noStroke();
        // central bus (core electronics and strut anchor)
        fill(160, 160, 180);
        rect(0, bob, size * 0.18, size * 0.12, 3);

        // sails: draw each panel with grid lines, struts and a specular sheen
        push();
        const sailAngle = anim ? (anim.solarSailAngle + Math.sin(obj.bobPhase * 0.002) * anim.solarSailFlutter) : 0;
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
        // faint frayed filaments for realism (very subtle)
        stroke(230, 230, 240, 30); strokeWeight(0.6);
        for (let f = -1; f <= 1; f += 2) line(f * size * 0.2, -size * 0.12 + bob, f * size * 0.92, -size * 0.02 + bob);
        noStroke();
        pop();

        // thin reflective edge and a small reflection streak
        stroke(255, 255, 220, 80); strokeWeight(0.6);
        line(-size * 0.4, -size * 0.2 + bob, -size * 0.65, -size * 0.05 + bob);
        line(size * 0.4, -size * 0.2 + bob, size * 0.65, -size * 0.05 + bob);
        noStroke();

        // small sensor pod that slowly orbits the sail tethered by a thin line
        push();
        const podAng = (anim ? anim.solarSailAngle : 0) * 4 + obj.bobPhase * 0.002;
        const podR = size * 0.58;
        stroke(120, 120, 130, 120); strokeWeight(0.8);
        line(0, bob, Math.cos(podAng) * podR * 0.9, Math.sin(podAng) * podR * 0.35 + bob * 0.12);
        noStroke(); fill(220, 230, 240);
        ellipse(Math.cos(podAng) * podR * 0.9, Math.sin(podAng) * podR * 0.35 + bob * 0.12, 6, 6);
        pop();

        // Flashing navigation lights on bus
        const navFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2);
        fill(255, 0, 0, 255 * navFlash);
        ellipse(-size * 0.08, bob - size * 0.04, 3, 3);
        fill(0, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2 + 1)));
        ellipse(size * 0.08, bob - size * 0.04, 3, 3);
        // Slow-moving secondary sensor arm
        push();
        rotate(Math.sin(obj.bobPhase * 0.003) * 0.1);
        stroke(130, 140, 150);
        strokeWeight(1);
        line(0, bob, -size * 0.3, bob - size * 0.1);
        noStroke();
        fill(200, 210, 220);
        ellipse(-size * 0.3, bob - size * 0.1, 5, 5);
        pop();
    },

    engineArray: function(obj, size, anim, bob) {
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
            const g = 0.5 + 0.45 * Math.sin((anim ? anim.engineGlow : 0.3) + i * 0.6 + obj.bobPhase * 0.015);
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
            const shimmer = Math.sin(obj.bobPhase * 0.005 + i);
            line(nx - 6, ny + 6 + shimmer * 2, nx + 6, ny + 18 + shimmer * 4);
            noStroke();
        }

        // low-cost circular heat rings for extra depth
        noFill(); stroke(100, 170, 255, 30); strokeWeight(0.6);
        ellipse(0, size * 0.36 + bob, size * 0.9, size * 0.5);
        noStroke();

        // Flashing status indicators on platform
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25);
        fill(255, 255, 0, 255 * statusFlash);
        ellipse(-size * 0.3, bob - size * 0.02, 3, 3);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + 1)));
        ellipse(size * 0.3, bob - size * 0.02, 3, 3);
        // Slow-moving cooling vane rotation
        push();
        rotate(Math.sin(obj.bobPhase * 0.004) * 0.2);
        fill(120, 130, 140, 150);
        rect(-size * 0.05, bob + size * 0.1, size * 0.1, size * 0.25, 1);
        pop();

        pop();
    },

    cargoCluster: function(obj, size, anim, bob) {
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
                // small sticker/label for variety
                fill(40, 40, 60, 200);
                rect(x + cw * 0.22, y + ch * 0.18, cw * 0.22, ch * 0.28, 2);
            }
        }
        // small helper drones that orbit the cluster
        if (obj._drones && obj._drones.length) {
            for (let di = 0; di < obj._drones.length; di++) {
                const d = obj._drones[di];
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
        // Flashing warning lights on containers
        const warnFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(255, 0, 0, 255 * warnFlash);
        ellipse(-size * 0.2, bob - ch * 0.3, 3, 3);
        fill(255, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.2, bob - ch * 0.3, 3, 3);
        // Slow-moving crane arm
        push();
        rotate(Math.sin(obj.bobPhase * 0.002) * 0.15);
        stroke(100, 110, 120);
        strokeWeight(1.5);
        line(0, bob - ch * 0.5, size * 0.25, bob - ch * 0.7);
        noStroke();
        fill(120, 130, 140);
        ellipse(size * 0.25, bob - ch * 0.7, 5, 5);
        pop();
    },

    researchArray: function(obj, size, anim, bob) {
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
        // central pulsing indicator
        const pulse = 0.5 + 0.5 * Math.sin(anim ? anim.researchPing : 0);
        fill(100, 200, 230, 120 * pulse);
        ellipse(0, -size * 0.06 + bob, 8 * pulse, 4 * pulse);
        noStroke();
        // Flashing status lights on platform
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35);
        fill(255, 0, 0, 255 * statusFlash);
        ellipse(-size * 0.15, bob + size * 0.08, 3, 3);
        fill(0, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35 + 1)));
        ellipse(size * 0.15, bob + size * 0.08, 3, 3);
        // Slow-moving auxiliary dish
        push();
        rotate(Math.sin(obj.bobPhase * 0.003) * 0.2);
        fill(210, 220, 230);
        ellipse(size * 0.25, bob - size * 0.1, size * 0.15, size * 0.1);
        noStroke();
        pop();
    },

    orbitalGarden: function(obj, size, anim, bob) {
        // Simplified orbital garden: terraced rings, central planter, rotating shade, and gentle pollinators
        push();
        noStroke();

        const phase = (anim ? anim.pollinatorPhase : 0) + obj.bobPhase * 0.001;
        // base shadow / platform
        fill(18, 28, 18, 220);
        ellipse(0, size * 0.16 + bob, size * 0.92, size * 0.22);

        // terraced planting rings (clean, readable layers)
        const ringColors = [ [50,120,70], [60,140,80], [80,170,100] ];
        for (let r = 0; r < 3; r++) {
            const rScale = 0.78 - r * 0.18;
            const ry = -size * 0.02 + bob + r * (size * 0.04);
            fill(ringColors[r][0], ringColors[r][1], ringColors[r][2], 220 - r * 30);
            ellipse(0, ry, size * rScale, size * (0.22 - r * 0.03));
            // subtle ring rim
            stroke(20, 40, 24, 120); strokeWeight(0.6);
            noFill(); ellipse(0, ry, size * rScale * 0.98, size * (0.22 - r * 0.03) * 0.98);
            noStroke();
        }

        // central planter and stylized tree
        const centerY = -size * 0.06 + bob;
        fill(90, 150, 100);
        ellipse(0, centerY, size * 0.28, size * 0.12);
        // trunk
        fill(110, 68, 38);
        rect(0, centerY - size * 0.05, size * 0.04, size * 0.10, 3);
        // canopy
        fill(60, 190, 90, 230);
        ellipse(0, centerY - size * 0.18, size * 0.22, size * 0.14);

        // rotating thin shade ring above garden (soft, slow)
        push();
        translate(0, centerY - size * 0.04);
        rotate(anim ? anim.gardenShadeAngle : 0);
        stroke(12, 24, 20, 160); strokeWeight(2);
        noFill();
        ellipse(0, 0, size * 0.72, size * 0.72);
        noStroke();
        pop();

        // gentle pollinators / motes orbiting in layered paths
        for (let p = 0; p < 5; p++) {
            const a = phase + p * 1.25;
            const r = size * (0.28 + p * 0.06);
            const x = Math.cos(a) * r * 0.5;
            const y = Math.sin(a) * r * 0.26 + bob * 0.02;
            fill(255, 220, 130, 200 - p * 30);
            ellipse(x, y, 3 + (p % 2), 2 + (p % 2));
        }

        // subtle central glow layers (adds warmth without visual clutter)
        for (let g = 0; g < 3; g++) {
            fill(100, 200, 150, 36 - g * 8);
            ellipse(0, centerY + size * 0.02, size * (0.38 + g * 0.18), size * (0.18 + g * 0.08));
        }

        // small service bots (simple oscillation) — minimal and tidy
        for (let b = 0; b < 2; b++) {
            const bx = Math.sin(obj.bobPhase * 0.003 + b) * (size * 0.18);
            const by = size * 0.24 + bob * 0.06 - b * (size * 0.03);
            fill(200, 180, 140);
            rect(bx, by, 10, 6, 2);
        }

        pop();
    },

    decoyBuoy: function(obj, size, anim, bob) {
        // small, cheap decoy that pulses and emits short-lived flares
        noStroke();
        fill(140, 160, 220);
        ellipse(0, bob, size * 0.5, size * 0.5);
        const dp = (Math.sin(anim ? anim.decoyPulse : obj.bobPhase * 0.8) + 1) * 0.5;
        fill(255, 140, 60, 160 * dp);
        ellipse(0, bob - size * 0.06, size * (0.2 + dp * 0.6), size * (0.2 + dp * 0.6));
        // small outward puffs
        for (let p = 0; p < 3; p++) {
            const pa = obj.bobPhase * 0.01 + p * 1.5 + (anim ? anim.decoyPulse : 0);
            const pr = size * (0.28 + p * 0.12) * dp;
            fill(255, 180, 120, 60 * dp);
            ellipse(Math.cos(pa) * pr, Math.sin(pa) * pr + bob - size * 0.06, 6 + p * 3 * dp, 2 + p * 1.5 * dp);
        }
        // Flashing warning lights
        const warnFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.5);
        fill(255, 0, 0, 255 * warnFlash);
        ellipse(-size * 0.15, bob + size * 0.1, 3, 3);
        fill(255, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.5 + 1)));
        ellipse(size * 0.15, bob + size * 0.1, 3, 3);
        // Slow-moving antenna
        push();
        rotate(Math.sin(obj.bobPhase * 0.006) * 0.3);
        stroke(120, 130, 140);
        strokeWeight(0.8);
        line(0, bob, 0, bob - size * 0.2);
        noStroke();
        fill(160, 170, 180);
        ellipse(0, bob - size * 0.2, 4, 4);
        pop();
    },

    miningPlatform: function(obj, size, anim, bob) {
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
            rotate(ang + Math.sin(obj.bobPhase * 0.001 + a) * 0.02);
            // arm shaft
            stroke(120); strokeWeight(3);
            line(size * 0.12, size * 0.02 + bob, size * 0.48, size * 0.18 + bob);
            // joint
            noStroke(); fill(100); ellipse(size * 0.48, size * 0.18 + bob, size * 0.08, size * 0.06);
            // drill head (rotating)
            push(); translate(size * 0.48, size * 0.18 + bob);
            const spin = (anim ? anim.miningSpin : 0) + (obj.bobPhase * 0.002) + a * 0.8;
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
        const boxOffset = (Math.sin(obj.bobPhase * 0.01) + 1) * 0.5;
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
        const warn = 0.6 + 0.4 * Math.sin(obj.bobPhase * 0.004);
        fill(255, 120, 100, 200 * warn);
        ellipse(-size * 0.08, -size * 0.28 + bob, 6, 6);
        ellipse(size * 0.08, -size * 0.28 + bob, 6, 6);

        // Additional flashing status lights
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.45);
        fill(0, 255, 0, 255 * statusFlash);
        ellipse(-size * 0.25, bob + size * 0.05, 3, 3);
        fill(0, 255, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.45 + 1)));
        ellipse(size * 0.25, bob + size * 0.05, 3, 3);
        // Slow-moving inspection drone
        push();
        rotate(Math.sin(obj.bobPhase * 0.003) * 0.2);
        fill(180, 160, 140);
        ellipse(size * 0.35, bob - size * 0.1, 8, 6);
        stroke(120, 100, 80, 150);
        strokeWeight(0.6);
        line(size * 0.35, bob - size * 0.1, size * 0.4, bob - size * 0.15);
        noStroke();
        pop();

        pop();
    },

    ancientRelic: function(obj, size, anim, bob) {
        // monolith with glowing runes and drifting micro-fragments
        noStroke();
        fill(40, 50, 60); rect(0, bob, size * 0.46, size * 0.88, 6);
        const rp = (Math.sin(anim ? anim.relicPulse : obj.bobPhase * 0.001) + 1) * 0.5;
        // rune lines
        stroke(60, 200, 220, 160 * rp); strokeWeight(1.2);
        line(-size * 0.12, -size * 0.3 + bob, size * 0.12, -size * 0.12 + bob);
        line(-size * 0.12, size * 0.12 + bob, size * 0.12, size * 0.32 + bob);
        noStroke();
        // tiny levitating shards
        fill(100, 120, 140);
        for (let s = 0; s < 4; s++) ellipse(Math.cos(obj.bobPhase * 0.002 + s) * size * 0.28, Math.sin(obj.bobPhase * 0.002 + s * 1.3) * size * 0.12 + bob, 6, 6);
        // subtle emissive halo that breathes
        const relicGlow = 0.6 + 0.4 * Math.sin(anim ? anim.relicPulse : obj.bobPhase * 0.001);
        noFill(); stroke(60, 200, 220, 90 * relicGlow); strokeWeight(2 * relicGlow);
        ellipse(0, bob, size * (0.6 + relicGlow * 0.4), size * (0.6 + relicGlow * 0.4));
        noStroke();
        // Flashing energy nodes
        const nodeFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.55);
        fill(100, 220, 255, 255 * nodeFlash);
        ellipse(-size * 0.1, -size * 0.2 + bob, 4, 4);
        fill(255, 100, 220, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.55 + 1)));
        ellipse(size * 0.1, size * 0.2 + bob, 4, 4);
        // Slow-moving orbiting particle
        push();
        rotate(Math.sin(obj.bobPhase * 0.004) * 0.5);
        fill(150, 200, 250, 150);
        ellipse(size * 0.25, bob, 3, 3);
        pop();
    },

    signalFlare: function(obj, size, anim, bob) {
        // calm, aesthetic signal flare: soft core, slow breathing halo, and gentle drifting motes
        noStroke();
        const phase = (anim ? anim.flarePhase : obj.bobPhase * 0.008);
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
        // Flashing auxiliary beacons
        const auxFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.6);
        fill(255, 100, 100, 255 * auxFlash);
        ellipse(-size * 0.15, bob + size * 0.1, 3, 3);
        fill(100, 255, 100, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.6 + 1)));
        ellipse(size * 0.15, bob + size * 0.1, 3, 3);
        // Slow-moving support strut
        push();
        rotate(Math.sin(obj.bobPhase * 0.005) * 0.15);
        stroke(200, 180, 140, 120);
        strokeWeight(0.8);
        line(0, bob + size * 0.15, size * 0.2, bob + size * 0.25);
        noStroke();
        fill(220, 200, 180);
        ellipse(size * 0.2, bob + size * 0.25, 4, 4);
        pop();
    }
};

class SpaceObject {
    constructor(x, y, type = 'satellite') {
        this.pos = (typeof createVector === 'function') ? createVector(x, y) : { x: x, y: y };
        this.type = type; // 'satellite' | 'telescope' | 'relay' | 'habitat' | 'debris' | 'probe' | 'beacon'

        this.size = sizeMap[type] || 48;
        // Collision footprint: use visual radius so collision matches what is seen
        this.collisionRadius = Math.max(6, (this.size / 2));
        // Cache renderer for performance
        this.renderer = SpaceObjectRenderers[this.type] || SpaceObjectRenderers.default;
        // Animation state: initialized per-instance animated properties
        this._anim = {};
        const anim = this._anim;

        // Initialize animation properties based on type
        switch (this.type) {
            case 'satellite':
                // Satellite solar panel angle (disabled animation for satellites)
                anim.panelAngle = 0;
                anim.panelSpeed = 0;
                break;
            case 'telescope':
                // Telescope dish small tilt/scan
                anim.telescopeTilt = Math.random() * 0.06 - 0.03;
                anim.telescopeSpeed = (Math.random() * 0.00004 + 0.00001);
                break;
            case 'relay':
                // Relay antennae phase
                anim.relayPhase = Math.random() * TWO_PI;
                break;
            case 'habitat':
                // Habitat window flicker / internal lights
                anim.habitatWindowPhase = Math.random() * TWO_PI;
                break;
            case 'probe':
                // Probe small blink
                anim.probeBlink = Math.random() * TWO_PI;
                break;
            case 'solarSail':
                // New-type animation seeds
                anim.solarSailAngle = Math.random() * 0.02 - 0.01;
                anim.solarSailFlutter = Math.random() * 0.06;
                break;
            case 'engineArray':
                anim.engineGlow = Math.random() * 0.8;
                anim.engineParticlePhase = Math.random() * TWO_PI;
                break;
            case 'cargoCluster':
                anim.cargoHatch = Math.random() * TWO_PI;
                break;
            case 'researchArray':
                anim.researchArraySweep = Math.random() * TWO_PI;
                anim.researchPing = Math.random() * TWO_PI;
                break;
            case 'orbitalGarden':
                anim.gardenBreeze = Math.random() * TWO_PI;
                // additional slow animated params for the redesigned garden
                anim.gardenShadeAngle = Math.random() * 0.02 - 0.01;
                anim.hydroponicSpin = Math.random() * 0.0005;
                anim.pollinatorPhase = Math.random() * TWO_PI;
                break;
            case 'decoyBuoy':
                anim.decoyPulse = Math.random() * TWO_PI;
                break;
            case 'miningPlatform':
                anim.miningSpin = Math.random() * TWO_PI;
                break;
            case 'ancientRelic':
                anim.relicPulse = Math.random() * TWO_PI;
                break;
            case 'signalFlare':
                anim.flarePhase = Math.random() * TWO_PI;
                break;
            case 'commDish':
                anim.commDishSweep = Math.random() * TWO_PI;
                anim.commDishTilt = Math.random() * 0.02 - 0.01;
                break;
            case 'spaceStation':
                anim.stationLights = Math.random() * TWO_PI;
                anim.dockingRing = Math.random() * TWO_PI;
                anim.solarArray = Math.random() * TWO_PI;
                break;
            case 'observatoryDome':
                anim.domeRotation = Math.random() * TWO_PI;
                anim.telescopeSweep = Math.random() * TWO_PI;
                anim.observationLights = Math.random() * TWO_PI;
                break;
            case 'weaponPlatform':
                anim.turretRotation = Math.random() * TWO_PI;
                anim.weaponCharge = Math.random() * TWO_PI;
                anim.defensePulse = Math.random() * TWO_PI;
                break;
            case 'shieldGenerator':
                anim.shieldPulse = Math.random() * TWO_PI;
                break;
        }
        // unique id used by debris RNG and other persistent behaviors
        this.id = 'spaceobj_' + (Date.now() % 100000) + '_' + Math.floor(Math.random() * 10000);
        this.angle = 0;
        // Much slower rotation so they don't look like tiny spinning toys
        // Much slower rotations for subtle motion
        const rotMap = {
            telescope: 0.000075,
            satellite: 0.000225,
            relay: 0.0002,
            habitat: 0.00006,
            // make debris spin much slower so large chunks feel massive
            debris: 0.00004,
            probe: 0.0003,
            beacon: 0.000125,
            // New types rotation speeds (subtle)
            solarSail: 0.00003,
            engineArray: 0.00045,
            cargoCluster: 0.0001,
            researchArray: 0.00009,
            orbitalGarden: 0.00007,
            decoyBuoy: 0.00015,
            miningPlatform: 0.000045,
            ancientRelic: 0.000025,
            signalFlare: 0.0003,
            spaceStation: 0.00002,
            asteroidMiner: 0.000035,
            fuelDepot: 0.00005,
            commDish: 0.00008,
            solarFarm: 0.00004,
            iceCrystal: 0.00006,
            nebulaFragment: 0.00002,
            alienArtifact: 0.00003,
            wreckage: 0.00004,
            observatoryDome: 0.00005,
            hydroponicsBay: 0.00006,
            weaponPlatform: 0.00004,
            shieldGenerator: 0.00007,
            energyCollector: 0.00005,
            quantumGate: 0.00002
        };
        this.rotationSpeed = rotMap[type] || 0.001;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.bobAmp = Math.min(6, this.size * 0.06); // Precompute bob amplitude
        this.destroyed = false;
        this._drift = { x: (Math.random() - 0.5) * 0.06, y: (Math.random() - 0.5) * 0.06 };
        // Health properties (treat like a lightweight asteroid)
        this.maxHealth = Math.max(30, Math.floor(this.size * 1.8));
        this.health = this.maxHealth;

        // Initialize type-specific data structures
        this._initTypeSpecificData();
    }

    _initTypeSpecificData() {
        // Initialize type-specific data structures only when needed
        if (this.type === 'cargoCluster') {
            this._drones = [];
            const dcount = 2 + Math.floor(this.size / 80);
            for (let di = 0; di < dcount; di++) {
                const ang = Math.random() * TWO_PI;
                const dist = (this.size * 0.5) + Math.random() * (this.size * 0.25);
                this._drones.push({ ang, dist, phase: Math.random() * TWO_PI });
            }
        }

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
                const spin = (rndf(0.001) - 0.0005) * (0.5 + rndf(1));
                this._shards.push({ rx, ry, baseAng: ang, angle: rndf(TWO_PI), spin, verts, rrScale: 0.6 + rndf(1.2) });
            }
        }
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

        // Update animations
        const anim = this._anim;
        // advance per-type animations (cache anim ref)
        if (typeof anim.panelAngle === 'number') anim.panelAngle += (anim.panelSpeed || 0) * dt;
        if (typeof anim.telescopeTilt === 'number') anim.telescopeTilt += (anim.telescopeSpeed || 0) * dt;
        if (typeof anim.relayPhase === 'number') anim.relayPhase += 0.0006 * dt;
        if (typeof anim.habitatWindowPhase === 'number') anim.habitatWindowPhase += 0.002 * dt;
        if (typeof anim.probeBlink === 'number') anim.probeBlink += 0.01 * dt;
        // Advance new-type animation phases for richer motion
        if (typeof anim.solarSailAngle === 'number') anim.solarSailAngle += 0.00004 * dt;
        if (typeof anim.engineGlow === 'number') anim.engineGlow += 0.0045 * dt;
        if (typeof anim.engineParticlePhase === 'number') anim.engineParticlePhase += 0.005 * dt;
        if (typeof anim.cargoHatch === 'number') anim.cargoHatch += 0.0035 * dt;
        if (typeof anim.researchArraySweep === 'number') anim.researchArraySweep += 0.00225 * dt;
        if (typeof anim.researchPing === 'number') anim.researchPing += 0.003 * dt;
        if (typeof anim.gardenBreeze === 'number') anim.gardenBreeze += 0.00175 * dt;
        if (typeof anim.gardenShadeAngle === 'number') anim.gardenShadeAngle += 0.00012 * dt;
        if (typeof anim.hydroponicSpin === 'number') anim.hydroponicSpin += 0.00025 * dt;
        if (typeof anim.pollinatorPhase === 'number') anim.pollinatorPhase += 0.0011 * dt;
        if (typeof anim.decoyPulse === 'number') anim.decoyPulse += 0.006 * dt;
        if (typeof anim.miningSpin === 'number') anim.miningSpin += 0.002 * dt;
        if (typeof anim.relicPulse === 'number') anim.relicPulse += 0.00225 * dt;
        if (typeof anim.flarePhase === 'number') anim.flarePhase += 0.003 * dt;
        if (typeof anim.stationLights === 'number') anim.stationLights += 0.004 * dt;
        if (typeof anim.dockingRing === 'number') anim.dockingRing += 0.001 * dt;
        if (typeof anim.solarArray === 'number') anim.solarArray += 0.0005 * dt;
        if (typeof anim.commDishSweep === 'number') anim.commDishSweep += 0.0025 * dt;
        if (typeof anim.commDishTilt === 'number') anim.commDishTilt += 0.0012 * dt;
        if (typeof anim.shieldPulse === 'number') anim.shieldPulse += 0.0032 * dt;
        if (typeof anim.domeRotation === 'number') anim.domeRotation += 0.0008 * dt;
        if (typeof anim.telescopeSweep === 'number') anim.telescopeSweep += 0.002 * dt;
        if (typeof anim.observationLights === 'number') anim.observationLights += 0.0035 * dt;
        if (typeof anim.turretRotation === 'number') anim.turretRotation += 0.005 * dt;
        if (typeof anim.weaponCharge === 'number') anim.weaponCharge += 0.006 * dt;
        if (typeof anim.defensePulse === 'number') anim.defensePulse += 0.0045 * dt;

        if (this._shards && this._shards.length) {
            for (let i = 0; i < this._shards.length; i++) this._shards[i].angle += this._shards[i].spin * dt;
        }
        // update cargo drones
        if (this._drones && this._drones.length) {
            for (let di = 0; di < this._drones.length; di++) {
                const d = this._drones[di];
                d.ang += 0.00045 * dt * (1 + di * 0.05);
                d.phase += 0.005 * dt;
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
        const bob = Math.sin(this.bobPhase) * this.bobAmp;

        // Use the cached renderer for this type
        this.renderer(this, size, anim, bob);

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
            spaceStation: 'Space Station',
            asteroidMiner: 'Asteroid Miner',
            fuelDepot: 'Fuel Depot',
            commDish: 'Communication Dish',
            solarFarm: 'Solar Farm',
            iceCrystal: 'Ice Crystal',
            nebulaFragment: 'Nebula Fragment',
            alienArtifact: 'Alien Artifact',
            wreckage: 'Wreckage',
            observatoryDome: 'Observatory Dome',
            hydroponicsBay: 'Hydroponics Bay',
            weaponPlatform: 'Weapon Platform',
            shieldGenerator: 'Shield Generator',
            energyCollector: 'Energy Collector',
            quantumGate: 'Quantum Gate'
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
