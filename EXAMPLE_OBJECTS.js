// ****** Example Space Objects Using New Primitives ******
// Copy these into SpaceObjectRenderers in spaceObjects.js to see them in action!

// Example 1: Advanced Research Station
advancedResearchStation: function (obj, size, anim, bob) {
    const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

    // Central hub - smooth cylinder
    Draw3D.drawCylinder(0, bob, size * 0.2, size * 0.6, 16, color(160, 170, 180), obj.angle, sunAngle);

    // Habitat ring - rotating torus
    const rotPhase = obj.bobPhase * 0.001;
    push();
    rotate(rotPhase);
    Draw3D.drawTorus(0, bob, size * 0.6, size * 0.1, 20, 10, color(140, 150, 160), obj.angle, sunAngle);
    pop();

    // Research domes
    for (let i = 0; i < 4; i++) {
        const ang = i * (TWO_PI / 4);
        const dx = Math.cos(ang) * size * 0.6;
        const dy = Math.sin(ang) * size * 0.6;
        Draw3D.drawDome(dx, dy + bob, size * 0.12, 8, color(100, 150, 200, 180), obj.angle, sunAngle);
    }

    // Communication spire with cone tip
    Draw3D.drawRod(0, bob - size * 0.3, 0, bob - size * 0.6, 3, color(180, 180, 190), obj.angle, sunAngle, false);
    Draw3D.drawCone(0, bob - size * 0.6, size * 0.04, size * 0.08, 6, color(200, 180, 160), obj.angle, sunAngle);

    // Solar arrays with lattice frames
    Draw3D.drawLattice(-size * 0.9, bob, size * 0.4, size * 0.2, 3, 2, 2, color(90, 100, 110), obj.angle, sunAngle);
    Draw3D.drawBox3D(-size * 0.9, bob, size * 0.4, size * 0.2, 1, color(40, 70, 120, 150), obj.angle, sunAngle);

    Draw3D.drawLattice(size * 0.9, bob, size * 0.4, size * 0.2, 3, 2, 2, color(90, 100, 110), obj.angle, sunAngle);
    Draw3D.drawBox3D(size * 0.9, bob, size * 0.4, size * 0.2, 1, color(40, 70, 120, 150), obj.angle, sunAngle);
},

// Example 2: Power Generation Station
powerStation: function (obj, size, anim, bob) {
    const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

    // Main reactor core - cylinder with glow
    Draw3D.drawCylinder(0, bob, size * 0.25, size * 0.5, 16, color(100, 120, 140), obj.angle, sunAngle);

    // Cooling helixes around reactor
    for (let i = 0; i < 3; i++) {
        const ang = i * (TWO_PI / 3);
        const dx = Math.cos(ang) * size * 0.3;
        const dy = Math.sin(ang) * size * 0.3;
        Draw3D.drawHelix(dx, dy + bob, size * 0.08, size * 0.6, 2, 8, 2, color(80, 180, 220), obj.angle, sunAngle);
    }

    // Energy collection rings - torus stack
    for (let r = 0; r < 3; r++) {
        const ry = bob - size * 0.15 - r * size * 0.12;
        const phase = obj.bobPhase * 0.002 + r * 1;
        push();
        translate(0, ry);
        rotate(phase);
        Draw3D.drawTorus(0, 0, size * 0.4 - r * size * 0.05, size * 0.04, 16, 8,
            color(120 + r * 20, 140 + r * 15, 160 + r * 10, 180), obj.angle, sunAngle);
        pop();
    }

    // Support struts - rods
    for (let s = 0; s < 6; s++) {
        const sang = s * (TWO_PI / 6);
        const sx = Math.cos(sang) * size * 0.2;
        const sy = Math.sin(sang) * size * 0.2;
        Draw3D.drawRod(sx, sy + bob - size * 0.25, sx * 2, sy * 2 + bob + size * 0.25,
            2, color(140, 140, 150), obj.angle, sunAngle, false);
    }

    // Geodesic shield dome
    Draw3D.drawGeodesicDome(0, bob, size * 0.5, 2, color(80, 160, 200, 100), obj.angle, sunAngle);
},

// Example 3: Communication Hub
commHub: function (obj, size, anim, bob) {
    const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

    // Central tower - tapered cylinders
    Draw3D.drawCylinder(0, bob + size * 0.1, size * 0.15, size * 0.3, 12, color(140, 145, 150), obj.angle, sunAngle);
    Draw3D.drawCylinder(0, bob - size * 0.1, size * 0.12, size * 0.2, 12, color(150, 155, 160), obj.angle, sunAngle);
    Draw3D.drawCylinder(0, bob - size * 0.25, size * 0.09, size * 0.15, 10, color(160, 165, 170), obj.angle, sunAngle);

    // Top antenna spire - cone
    Draw3D.drawCone(0, bob - size * 0.35, size * 0.06, size * 0.15, 8, color(180, 170, 160), obj.angle, sunAngle);

    // Antenna array - rods in circle
    for (let a = 0; a < 8; a++) {
        const aang = a * (TWO_PI / 8);
        const ax = Math.cos(aang) * size * 0.35;
        const ay = Math.sin(aang) * size * 0.35;
        Draw3D.drawRod(ax, ay + bob - size * 0.12, ax * 1.3, ay * 1.3 + bob - size * 0.25,
            2, color(120, 130, 140), obj.angle, sunAngle, true);
    }

    // Signal dishes - domes on sides
    for (let d = 0; d < 4; d++) {
        const dang = d * (TWO_PI / 4) + PI / 4;
        const dx = Math.cos(dang) * size * 0.25;
        const dy = Math.sin(dang) * size * 0.25;
        // Inverted dome for dish shape
        Draw3D.drawDome(dx, dy + bob, size * 0.08, 8, color(200, 210, 220), obj.angle, sunAngle, true);
    }

    // Base platform with lattice
    Draw3D.drawLattice(0, bob + size * 0.3, size * 0.6, size * 0.6, 4, 4, 2, color(100, 110, 120), obj.angle, sunAngle);
},

// Example 4: Alien Structure (showcasing all primitives)
alienMonolith: function (obj, size, anim, bob) {
    const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
    const pulse = Math.sin(obj.bobPhase * 0.003) * 0.5 + 0.5;

    // Base - torus platform
    Draw3D.drawTorus(0, bob + size * 0.3, size * 0.4, size * 0.08, 16, 10,
        color(80 + pulse * 40, 40, 80 + pulse * 80), obj.angle, sunAngle);

    // Main structure - stacked cylinders with different radii
    Draw3D.drawCylinder(0, bob + size * 0.15, size * 0.2, size * 0.2, 12,
        color(60 + pulse * 30, 30, 90 + pulse * 60), obj.angle, sunAngle);
    Draw3D.drawCylinder(0, bob - size * 0.05, size * 0.18, size * 0.25, 12,
        color(70 + pulse * 40, 35, 100 + pulse * 70), obj.angle, sunAngle);

    // Energy dome at top
    Draw3D.drawGeodesicDome(0, bob - size * 0.22, size * 0.22, 2,
        color(100 + pulse * 100, 50 + pulse * 100, 150 + pulse * 100, 180), obj.angle, sunAngle);

    // Helical energy streams
    for (let h = 0; h < 3; h++) {
        const hang = h * (TWO_PI / 3);
        const hx = Math.cos(hang) * size * 0.25;
        const hy = Math.sin(hang) * size * 0.25;
        Draw3D.drawHelix(hx, hy + bob, size * 0.06, size * 0.5, 2, 6, 2,
            color(120 + pulse * 80, 60 + pulse * 80, 180 + pulse * 60, 150), obj.angle, sunAngle);
    }

    // Floating rings
    for (let r = 0; r < 2; r++) {
        const ry = bob - size * 0.35 + r * size * 0.12;
        const rphase = obj.bobPhase * 0.001 + r * PI;
        push();
        translate(0, ry);
        rotate(rphase);
        Draw3D.drawTorus(0, 0, size * 0.35, size * 0.04, 12, 8,
            color(140 + pulse * 60, 80 + pulse * 80, 200 + pulse * 40, 200), obj.angle, sunAngle);
        pop();
    }

    // Top spike
    Draw3D.drawCone(0, bob - size * 0.42, size * 0.05, size * 0.12, 6,
        color(160 + pulse * 80, 120 + pulse * 100, 220 + pulse * 30), obj.angle, sunAngle);

    // Energy tendrils - rods with glowing tips
    for (let t = 0; t < 6; t++) {
        const tang = t * (TWO_PI / 6);
        const phase = obj.bobPhase * 0.004 + t;
        const tx = Math.cos(tang + phase) * size * 0.4;
        const ty = Math.sin(tang + phase) * size * 0.4;
        Draw3D.drawRod(0, bob - size * 0.3, tx, ty + bob - size * 0.1,
            1.5, color(180 + pulse * 60, 140 + pulse * 100, 255, 200), obj.angle, sunAngle, true);
    }
}
