// ****** spaceObjects.js ******
// Definitions and renderers for various space objects in the game
// Designed to be lightweight: small update() to rotate/oscillate, and draw() using p5 primitives

// Define which space object types are dockable by the player
// These are larger installations where the player can trade limited commodities
const DOCKABLE_SPACE_OBJECT_TYPES = [
    'miningPlatform',
    'outpost',
    'cargoCluster',
    'hydroponicsBay',
    'orbitalGarden',
    'researchArray',
    'fuelDepot',
    'habitat',
    'observatoryDome',
    'weaponPlatform',
    'prison',
    'drugLab',
    'labourColony',
    'undergroundMarket',
    'shipyard'
];

// Size map for each object type
const sizeMap = {
    satellite: 60,
    telescope: 100,
    relay: 120,
    habitat: 140,
    debris: 150,
    probe: 50,
    beacon: 40,
    solarSail: 150,
    engineArray: 150,
    cargoCluster: 200,
    researchArray: 176,
    orbitalGarden: 210,
    decoyBuoy: 40,
    miningPlatform: 210,
    ancientRelic: 150,
    signalFlare: 60,
    outpost: 200,
    asteroidMiner: 100,
    fuelDepot: 180,
    commDish: 70,
    solarFarm: 150,
    iceCrystal: 120,
    nebulaFragment: 150,
    alienArtifact: 80,
    wreckage: 95,
    observatoryDome: 120,
    hydroponicsBay: 180,
    weaponPlatform: 220,
    shieldGenerator: 180,
    energyCollector: 130,
    quantumGate: 200,
    prison: 220,
    drugLab: 200,
    labourColony: 240,
    undergroundMarket: 250,
    shipyard: 320
};

// Mapping of what each SpaceObject type typically produces and what it will buy
// NOTE: Entries use canonical commodity names defined in `market.js`.
const SPACE_OBJECT_COMMODITIES = {
    miningPlatform: { produces: ['Metals', 'Minerals'], buys: ['Food', 'Chemicals', 'Machinery'] },
    asteroidMiner: { produces: ['Metals', 'Minerals'], buys: ['Chemicals'] },
    cargoCluster: { produces: ['Textiles', 'Machinery', 'Metals'], buys: ['Food', 'Chemicals'] },
    hydroponicsBay: { produces: ['Food'], buys: ['Metals', 'Chemicals', 'Machinery'] },
    orbitalGarden: { produces: ['Food'], buys: ['Chemicals', 'Machinery'] },
    fuelDepot: { produces: ['Chemicals'], buys: ['Metals', 'Machinery'] },
    researchArray: { produces: ['Adv Components', 'Computers'], buys: ['Food', 'Chemicals'] },
    outpost: { produces: ['Food', 'Textiles', 'Machinery', 'Chemicals'], buys: ['Metals', 'Adv Components'] },
    solarFarm: { produces: ['Metals', 'Adv Components'], buys: ['Machinery'] },
    energyCollector: { produces: ['Metals', 'Adv Components'], buys: ['Chemicals'] },
    observatoryDome: { produces: ['Computers'], buys: ['Chemicals'] },
    ancientRelic: { produces: ['Luxury Goods'], buys: [] },
    alienArtifact: { produces: ['Luxury Goods'], buys: [] },
    satellite: { produces: ['Computers'], buys: ['Metals'] },
    telescope: { produces: ['Computers', 'Adv Components'], buys: ['Metals'] },
    relay: { produces: ['Computers'], buys: ['Metals'] },
    habitat: { produces: ['Textiles', 'Food'], buys: ['Machinery', 'Metals'] },
    debris: { produces: ['Metals'], buys: [] },
    probe: { produces: ['Computers'], buys: [] },
    beacon: { produces: ['Metals'], buys: [] },
    solarSail: { produces: ['Adv Components'], buys: ['Metals'] },
    engineArray: { produces: ['Machinery'], buys: ['Metals'] },
    decoyBuoy: { produces: ['Metals'], buys: [] },
    signalFlare: { produces: ['Textiles'], buys: [] },
    commDish: { produces: ['Computers'], buys: ['Metals'] },
    iceCrystal: { produces: ['Minerals'], buys: ['Food'] },
    nebulaFragment: { produces: [], buys: [] },
    wreckage: { produces: ['Metals'], buys: [] },
    weaponPlatform: { produces: ['Weapons'], buys: ['Metals', 'Machinery'] },
    shieldGenerator: { produces: ['Adv Components'], buys: ['Metals'] },
    quantumGate: { produces: ['Adv Components', 'Computers'], buys: ['Metals'] },
    prison: { produces: ['Slaves'], buys: ['Food', 'Textiles', 'Machinery'] },
    drugLab: { produces: ['Narcotics', 'Medicine'], buys: ['Food', 'Chemicals'] },
    labourColony: { produces: ['Slaves', 'Metals', 'Textiles', 'Machinery'], buys: ['Food'] },
    undergroundMarket: { produces: [], buys: ['Slaves', 'Narcotics', 'Weapons'] },
    shipyard: { produces: [], buys: ['Food', 'Machinery', 'Adv Components', 'Computers'] },
    default: { produces: [], buys: [] }
};

// Animation rate constants for efficient update loop
// Format: [propertyName, rate] - properties with dynamic speeds use null
const ANIM_RATES = [
    ['relayPhase', 0.0001],
    ['habitatWindowPhase', 0.002],
    ['probeBlink', 0.001],
    ['solarSailAngle', 0.00004],
    ['engineGlow', 0.001],
    ['engineParticlePhase', 0.0001],
    ['cargoHatch', 0.0035],
    ['researchArraySweep', 0.00025],
    ['researchPing', 0.003],
    ['gardenBreeze', 0.00175],
    ['gardenShadeAngle', 0.00012],
    ['hydroponicSpin', 0.00025],
    ['hydroponicCycle', 0.002],
    ['lightPhase', 0.004],
    ['armPhase', 0.003],
    ['nutrientFlow', 0.0025],
    ['pollinatorPhase', 0.0011],
    ['decoyPulse', 0.002],
    ['miningSpin', 0.002],
    ['relicPulse', 0.00225],
    ['artifactPhase', 0.0015],
    ['flarePhase', 0.003],
    ['stationLights', 0.004],
    ['dockingRing', 0.001],
    ['solarArray', 0.0002],
    ['commDishSweep', 0.0005],
    ['commDishTilt', 0.0012],
    ['shieldPulse', 0.0032],
    ['domeRotation', 0.0003],
    ['telescopeSweep', 0.002],
    ['observationLights', 0.0035],
    ['turretRotation', 0.0005],
    ['weaponCharge', 0.001],
    ['defensePulse', 0.0015],
    ['trackerPhase', 0.0012],
    ['wiringPulse', 0.0035],
    ['collectorSpin', 0.0003],
    ['fuelPulse', 0.003],
    ['hosePhase', 0.004],
    ['nebulaPhase', 0.008],
    ['gatePhase', 0.01],
    ['searchlightPhase', 0.0006],
    ['barrierPulse', 0.0025],
    ['flowPhase', 0.003],
    ['fanRotation', 0.004],
    ['drillSpin', 0.0005],
    ['conveyorPhase', 0.00035]
];

// Static renderers for each object type to replace the monolithic draw() switch
// NOTE: Draw3D object is now in draw3d.js (loaded before this file)

const SpaceObjectRenderers = {
    satellite: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Central bus as a short cylinder (many-sided prism for smooth look)
        Draw3D.drawPrism(0, bob, size * 0.18, 16, size * 0.28, color(200, 200, 220), obj.angle, sunAngle);

        // Slight top cap highlight for readability
        Draw3D.drawBox3D(0, bob - size * 0.08, size * 0.22, size * 0.10, size * 0.02, color(175, 180, 195), obj.angle, sunAngle);

        // Enlarged solar sails: move further out and increase length/height
        const panelW = size * 1.4; // longer panels
        const panelH = size * 0.32; // taller panels
        const panelDepth = size * 0.025;

        // Thin struts connecting bus to panels (minimal, keep silhouette clean)
        Draw3D.drawBox3D(-size * 0.52, bob, size * 0.06, 3, 3, color(110, 110, 120), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.52, bob, size * 0.06, 3, 3, color(110, 110, 120), obj.angle, sunAngle);

        // Left large panel (extruded plate)
        Draw3D.drawBox3D(-size * 1.2, bob, panelW * 0.5, panelH * 0.9, panelDepth, color(28, 70, 150), obj.angle, sunAngle);
        // Add a few bold ribs to sell the panel segmentation
        for (let g = -2; g <= 2; g++) {
            const gy = g * (panelH * 0.25);
            Draw3D.drawBox3D(-size * 1.2, bob + gy, panelW * 0.46, 2, panelDepth * 1.5, color(14, 32, 70, 200), obj.angle, sunAngle);
        }

        // Right large panel
        Draw3D.drawBox3D(size * 1.2, bob, panelW * 0.5, panelH * 0.9, panelDepth, color(28, 70, 150), obj.angle, sunAngle);
        for (let g = -2; g <= 2; g++) {
            const gy = g * (panelH * 0.25);
            Draw3D.drawBox3D(size * 1.2, bob + gy, panelW * 0.46, 2, panelDepth * 1.5, color(14, 32, 70, 200), obj.angle, sunAngle);
        }

        // Keep only a single small nav/status light
        const flash = 0.6 + 0.4 * Math.sin(obj.bobPhase * 0.12);
        Draw3D.drawBox3D(0, -size * 0.12 + bob, 4, 4, 2, color(255, 120, 100, 255 * flash), obj.angle, sunAngle);
    },

    fuelDepot: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // tanks (three vertical tanks)
        const tankW = size * 0.22;
        const tankH = size * 0.44;
        for (let i = -1; i <= 1; i++) {
            const tx = i * (tankW * 1.25);
            const ty = -size * 0.05 + bob;

            // tank body
            Draw3D.drawPrism(tx, ty, tankW * 0.5, 8, tankH, color(120, 130, 140), obj.angle, sunAngle);

            // top and bottom caps
            Draw3D.drawPrism(tx, ty - tankH * 0.5, tankW * 0.45, 8, tankH * 0.1, color(150, 160, 170), obj.angle, sunAngle);
            Draw3D.drawPrism(tx, ty + tankH * 0.5, tankW * 0.45, 8, tankH * 0.1, color(150, 160, 170), obj.angle, sunAngle);

            // inspection window / gauge
            Draw3D.drawBox3D(tx, ty - tankH * 0.08, tankW * 0.28, tankH * 0.36, size * 0.02, color(18, 100, 160, 200), obj.angle, sunAngle);

            // small status lights
            const flash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18 + i);
            Draw3D.drawBox3D(tx - tankW * 0.25, ty - tankH * 0.25, 4, 4, 2, color(255 * (1 - flash), 255 * flash, 80, 220), obj.angle, sunAngle);
            Draw3D.drawBox3D(tx + tankW * 0.25, ty + tankH * 0.25, 3, 3, 2, color(255 * (1 - flash), 255 * flash, 80, 220), obj.angle, sunAngle);
        }

        // manifold pipe connecting tanks
        Draw3D.drawBox3D(0, -size * 0.15 + bob, tankW * 2.5, size * 0.05, size * 0.05, color(90, 90, 100), obj.angle, sunAngle);

        // glowing manifold indicator
        const phase = (anim && typeof anim.fuelPulse === 'number') ? anim.fuelPulse : obj.bobPhase;
        const glow = 0.6 + 0.4 * Math.sin(phase * 0.006);
        Draw3D.drawBox3D(0, -size * 0.15 + bob, size * 0.36 * (0.9 + 0.1 * glow), size * 0.12 * (0.9 + 0.1 * glow), size * 0.05, color(80, 200, 220, 80 + 80 * glow), obj.angle, sunAngle);

        // fueling hoses with animated flow particles (simulated with small boxes)
        for (let h = -1; h <= 1; h += 2) {
            const hx = h * (tankW * 1.05);
            const hy = -size * 0.15 + bob;
            const tx = hx + h * (size * 0.7);
            const ty = hy + size * 0.18;

            // hose curve approximated by segments
            const segments = 8;
            for (let s = 0; s < segments; s++) {
                const t = s / segments;
                const bx = bezierPoint(hx, hx + h * (size * 0.18), tx - h * (size * 0.12), tx, t);
                const by = bezierPoint(hy, hy + size * 0.08, ty - size * 0.06, ty, t);
                Draw3D.drawBox3D(bx, by, 3, 3, 3, color(60, 120, 140, 180), obj.angle, sunAngle);
            }

            // animated flow dots along hose
            const hosePhase = (anim && typeof anim.hosePhase === 'number') ? anim.hosePhase : obj.bobPhase;
            for (let p = 0; p < 4; p++) {
                const t = ((hosePhase * 0.004) + p * 0.24) % 1;
                const bx = bezierPoint(hx, hx + h * (size * 0.18), tx - h * (size * 0.12), tx, t);
                const by = bezierPoint(hy, hy + size * 0.08, ty - size * 0.06, ty, t);
                Draw3D.drawBox3D(bx, by, 3, 2, 3, color(80, 200, 255, 180 - p * 30), obj.angle, sunAngle);
            }
        }

        // small service drones that circle the depot
        if (!obj._fuelDrones) {
            obj._fuelDrones = [];
            for (let d = 0; d < 2; d++) obj._fuelDrones.push({ ang: Math.random() * TWO_PI, dist: size * 0.5, phase: Math.random() * TWO_PI });
        }
        for (let d = 0; d < obj._fuelDrones.length; d++) {
            const fd = obj._fuelDrones[d];
            fd.ang += 0.0025;
            const dx = Math.cos(fd.ang) * fd.dist;
            const dy = Math.sin(fd.ang) * fd.dist * 0.38 + bob * 0.02;
            Draw3D.drawBox3D(dx, dy, 6, 4, 4, color(220, 200, 160), obj.angle, sunAngle);
            // Trail
            Draw3D.drawBox3D(dx - Math.cos(fd.ang) * 6, dy - Math.sin(fd.ang) * 4, 3, 2, 2, color(200, 180, 140, 120), obj.angle, sunAngle);
        }

        // landing/warning lights and small markers
        const warn = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.28);
        Draw3D.drawBox3D(0, size * 0.38 + bob, 6, 4, 4, color(255, 100, 60, 220 * warn), obj.angle, sunAngle);
        Draw3D.drawBox3D(-size * 0.18, size * 0.36 + bob, 4, 3, 3, color(255, 255, 0, 180 * warn), obj.angle, sunAngle);
    },

    telescope: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Main cylindrical body
        Draw3D.drawPrism(0, bob, size * 0.12, 8, size * 0.8, color(180, 190, 200), obj.angle, sunAngle);

        // Top cap
        Draw3D.drawPrism(0, bob - size * 0.4, size * 0.14, 8, size * 0.05, color(160, 170, 180), obj.angle, sunAngle);

        // Bottom base
        Draw3D.drawPrism(0, bob + size * 0.4, size * 0.16, 8, size * 0.1, color(140, 150, 160), obj.angle, sunAngle);

        // Deployable parabolic dish
        push();
        translate(0, bob - size * 0.32);
        const dishAng = 0.1 + Math.sin(anim ? anim.telescopeTilt : 0) * 0.04;
        rotate(dishAng);

        // Dish segments (approximated with a flattened cone/prism or just a ring for now)
        // Let's use a ring for the dish rim and a smaller prism for the center
        Draw3D.drawRing3D(size * 0.08, 0, size * 0.18, size * 0.05, 6, size * 0.05, color(220, 230, 240), obj.angle + (dishAng), sunAngle);
        Draw3D.drawPrism(size * 0.08, 0, size * 0.05, 6, size * 0.05, color(100, 110, 120), obj.angle + (dishAng), sunAngle);

        // Support struts
        for (let s = 0; s < 3; s++) {
            const sang = s * (TWO_PI / 3);
            const dx = Math.cos(sang) * size * 0.12;
            const dy = Math.sin(sang) * size * 0.08;

            // Calculate strut geometry manually
            const len = Math.sqrt(dx * dx + dy * dy);
            const ang = Math.atan2(dy, dx);
            const midX = dx / 2;
            const midY = dy / 2;

            push();
            translate(midX, midY);
            rotate(ang);
            Draw3D.drawBox3D(0, 0, len, 1, 1, color(120, 130, 140, 150), obj.angle + (dishAng + ang), sunAngle);
            pop();
        }

        pop();

        // Solar arrays
        // Left
        Draw3D.drawBox3D(-size * 0.5, bob - size * 0.1, size * 0.4, size * 0.06, size * 0.02, color(40, 70, 120), obj.angle, sunAngle);
        // Right
        Draw3D.drawBox3D(size * 0.5, bob - size * 0.1, size * 0.4, size * 0.06, size * 0.02, color(40, 70, 120), obj.angle, sunAngle);

        // Instrument boom
        push();
        translate(size * 0.2, bob - size * 0.07);
        rotate(PI / 4);
        Draw3D.drawBox3D(0, 0, size * 0.3, size * 0.02, size * 0.02, color(130, 140, 150), obj.angle + (PI / 4), sunAngle);
        pop();

        // Sensors on boom
        Draw3D.drawPrism(size * 0.35, bob - size * 0.15, size * 0.04, 6, size * 0.04, color(200, 210, 220), obj.angle, sunAngle);

        // Antennas
        Draw3D.drawPrism(-size * 0.08, bob - size * 0.2, size * 0.03, 4, size * 0.1, color(120, 130, 140), obj.angle, sunAngle);
        Draw3D.drawPrism(size * 0.08, bob - size * 0.2, size * 0.03, 4, size * 0.1, color(120, 130, 140), obj.angle, sunAngle);

        // Cooling fins
        Draw3D.drawBox3D(-size * 0.04, bob + size * 0.1, size * 0.02, size * 0.3, size * 0.1, color(160, 170, 180, 150), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.04, bob + size * 0.1, size * 0.02, size * 0.3, size * 0.1, color(160, 170, 180, 150), obj.angle, sunAngle);

        // Flashing lights
        const flash1 = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.12);
        Draw3D.drawBox3D(-size * 0.05, -size * 0.3 + bob, 3, 3, 3, color(255, 255, 0, 255 * flash1), obj.angle, sunAngle);
        const flash2 = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.12 + 1);
        Draw3D.drawBox3D(size * 0.05, -size * 0.3 + bob, 3, 3, 3, color(0, 255, 255, 255 * flash2), obj.angle, sunAngle);
    },

    relay: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const relayPhase = (anim ? anim.relayPhase : 0) + obj.bobPhase * 0.06;

        // Add a little bob to the entire relay to feel alive
        const bobOsc = Math.sin(obj.bobPhase * 0.006) * (size * 0.01);

        // Base ring and heavier footprint to ground the object visually
        Draw3D.drawRing3D(0, bob + bobOsc + size * 0.02, size * 0.52, size * 0.06, 12, size * 0.02, color(110, 120, 130), obj.angle, sunAngle);

        // Prepare dish geometry so we can draw back faces first, hub, then front faces
        const dishCount = 4;
        const dishes = [];
        for (let i = 0; i < dishCount; i++) {
            const a = i * (TWO_PI / dishCount) + relayPhase * 0.5;
            const dDist = size * 0.62;
            const lx = Math.cos(a) * dDist;
            const ly = Math.sin(a) * dDist * 0.28;
            const depth = Math.sin(a + relayPhase * 0.2);
            dishes.push({ a, lx, ly, depth, i });
        }

        // Draw back-facing dishes first (so they appear behind the hub)
        for (let dd of dishes) {
            if (dd.depth >= 0) continue;
            const armLen = Math.sqrt(dd.lx * dd.lx + dd.ly * dd.ly);
            const armAng = Math.atan2(dd.ly, dd.lx);
            push();
            translate(dd.lx / 2, bob + bobOsc + dd.ly / 2);
            rotate(armAng);
            Draw3D.drawBox3D(0, 0, armLen, 2, 2, color(130, 135, 140), obj.angle, sunAngle);
            pop();

            // darker, recessed dish plate
            push();
            translate(dd.lx, bob + bobOsc + dd.ly);
            rotate(armAng + PI / 2 + Math.sin(relayPhase * 0.6 + dd.i) * 0.06);
            Draw3D.drawExtrudedShape([
                { x: -size * 0.16, y: -size * 0.06 },
                { x: 0, y: 0 },
                { x: -size * 0.16, y: size * 0.06 }
            ], size * 0.05, color(180, 190, 200, 180), obj.angle, sunAngle, true);
            pop();
        }

        // Hub core (draw after back dishes so it layers on top)
        Draw3D.drawPrism(0, bob + bobOsc, size * 0.22, 6, size * 0.18, color(190, 190, 200), obj.angle, sunAngle);
        Draw3D.drawPrism(0, bob + bobOsc - size * 0.06, size * 0.18, 6, size * 0.06, color(220, 220, 230), obj.angle, sunAngle);

        // Central spire/antenna
        Draw3D.drawPrism(0, bob + bobOsc - size * 0.08, size * 0.04, 6, size * 0.12, color(230, 230, 240), obj.angle, sunAngle);

        // Draw front-facing dishes (so they overlap the hub correctly)
        for (let dd of dishes) {
            if (dd.depth < 0) continue;
            const armLen = Math.sqrt(dd.lx * dd.lx + dd.ly * dd.ly);
            const armAng = Math.atan2(dd.ly, dd.lx);
            push();
            translate(dd.lx / 2, bob + bobOsc + dd.ly / 2);
            rotate(armAng);
            Draw3D.drawBox3D(0, 0, armLen, 2, 2, color(140, 145, 150), obj.angle, sunAngle);
            pop();

            // brighter face dish with slight animated tilt
            push();
            translate(dd.lx, bob + bobOsc + dd.ly);
            rotate(armAng + PI / 2 + Math.sin(relayPhase * 0.6 + dd.i) * 0.06);
            Draw3D.drawExtrudedShape([
                { x: -size * 0.16, y: -size * 0.06 },
                { x: 0, y: 0 },
                { x: -size * 0.16, y: size * 0.06 }
            ], size * 0.05, color(230, 235, 240), obj.angle, sunAngle, true);

            // pulsing receiver dot
            const pulse = 0.6 + 0.4 * Math.sin(relayPhase * 1.8 + dd.i);
            Draw3D.drawBox3D(dd.lx - Math.cos(dd.a) * size * 0.03, bob + bobOsc + dd.ly - Math.sin(dd.a) * size * 0.03, 4 * pulse, 3 * pulse, 2, color(255, 220, 120, 200), obj.angle, sunAngle);
            pop();
        }

        // Larger decorative pips around hub edge (fewer, bolder — reads well at small sizes)
        for (let p = 0; p < 6; p++) {
            const a = p * (TWO_PI / 6) + relayPhase * 0.4;
            const lx = Math.cos(a) * size * 0.43;
            const ly = Math.sin(a) * size * 0.12;
            Draw3D.drawBox3D(lx, ly + bob + bobOsc, 4, 3, 2, color(200, 210, 230), obj.angle, sunAngle);
        }

        // Status lights (central, readable)
        const flash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.15);
        Draw3D.drawBox3D(0, -size * 0.06 + bob + bobOsc, 6, 6, 3, color(255, 200, 80, 200 * flash), obj.angle, sunAngle);
        Draw3D.drawBox3D(0, -size * 0.06 + bob + bobOsc, 3, 3, 3, color(255, 230, 160, 255 * flash), obj.angle, sunAngle);

        // Subtle concentric rings for depth/scale reference with slow pulse
        const ringPulse = 0.85 + 0.15 * Math.sin(obj.bobPhase * 0.008);
        Draw3D.drawRing3D(0, bob + bobOsc, size * 0.5 * ringPulse, size * 0.02, 12, size * 0.01, color(130, 140, 150, 60), obj.angle, sunAngle);
    },

    commDish: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Base pedestal
        Draw3D.drawBox3D(0, bob + size * 0.18, size * 0.18, size * 0.12, size * 0.1, color(110, 120, 130), obj.angle, sunAngle);
        // Pedestal flange
        Draw3D.drawRing3D(0, bob + size * 0.25, size * 0.28, size * 0.06, 12, size * 0.02, color(90, 95, 100), obj.angle, sunAngle);

        // Swivel ring (rotating base)
        push();
        const sweepAng = anim ? anim.commDishSweep : 0;
        rotate(sweepAng);
        stroke(120, 130, 140);
        strokeWeight(1.2);
        noFill();
        ellipse(0, bob + size * 0.12, size * 0.22, size * 0.1);
        noStroke();

        // Parabolic reflector (approximated with a ring and a central prism/cone)
        push();
        translate(0, bob - size * 0.06);

        // Main dish surface (using a large ring for the rim and a smaller one inside)
        Draw3D.drawRing3D(0, 0, size * 0.6, size * 0.1, 12, size * 0.1, color(220, 230, 240), obj.angle + (sweepAng), sunAngle);
        Draw3D.drawRing3D(0, 0, size * 0.4, size * 0.08, 12, size * 0.08, color(200, 210, 220), obj.angle + (sweepAng), sunAngle);
        Draw3D.drawPrism(0, 0, size * 0.2, 8, size * 0.05, color(180, 190, 200), obj.angle + (sweepAng), sunAngle);

        // Support struts to feed horn
        stroke(140, 150, 160); strokeWeight(1.2);
        for (let st = -1; st <= 1; st += 2) {
            const dx = st * size * 0.12;
            const dy = -size * 0.14;
            // Calculate depth offset manually
            const d = size * 0.1;
            const theta = sweepAng; // Local rotation only
            const offX = d * Math.sin(theta);
            const offY = d * Math.cos(theta);

            line(0, 0, dx + offX, dy + offY);
        }
        noStroke();

        // Feed horn / receiver (animated tilt)
        push();
        translate(0, -size * 0.14);
        const tiltAng = anim ? anim.commDishTilt : 0;
        rotate(tiltAng);
        Draw3D.drawBox3D(0, 0, size * 0.06, size * 0.1, size * 0.06, color(70, 80, 90), obj.angle + (sweepAng + tiltAng), sunAngle);
        Draw3D.drawPrism(0, -size * 0.06, size * 0.04, 6, size * 0.02, color(200, 210, 220), obj.angle + (sweepAng + tiltAng), sunAngle);
        pop();

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
        pop();

        // Small status lights on mast
        fill(255, 120, 120, 220);
        ellipse(-size * 0.06, bob + size * 0.02, 3, 3);
        fill(120, 255, 160, 220);
        ellipse(size * 0.06, bob + size * 0.02, 3, 3);

        pop(); // end swivel
    },

    habitat: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const cylW = size * 0.9;
        const cylH = size * 0.6;

        // Main body (cylinder)
        Draw3D.drawPrism(0, bob, cylW * 0.5, 12, cylH, color(175, 165, 155), obj.angle, sunAngle);

        // End caps
        Draw3D.drawPrism(0, bob - cylH * 0.5, cylW * 0.48, 12, cylH * 0.1, color(185, 175, 165), obj.angle, sunAngle);
        Draw3D.drawPrism(0, bob + cylH * 0.5, cylW * 0.48, 12, cylH * 0.1, color(185, 175, 165), obj.angle, sunAngle);

        // Windows
        const winCount = 5;
        const winSpacing = cylW / (winCount + 1);
        for (let i = 0; i < winCount; i++) {
            const wx = -cylW * 0.5 + winSpacing * (i + 1);
            const wy = -size * 0.05 + bob;
            const flick = 0.5 + 0.5 * Math.sin(anim ? (anim.habitatWindowPhase + i * 0.6) : obj.bobPhase);

            // Window frame
            Draw3D.drawBox3D(wx, wy, size * 0.12, size * 0.2, size * 0.02, color(20, 40, 60), obj.angle, sunAngle);

            // Window glass (lit)
            fill(30, Math.floor(110 + 90 * flick), Math.floor(180 + 40 * flick), Math.floor(160 * (0.6 + 0.4 * flick)));
            rect(wx - size * 0.05, wy - size * 0.09, size * 0.10, size * 0.18);
        }

        // Lifeboat pods
        Draw3D.drawBox3D(-size * 0.5, -size * 0.06 + bob, size * 0.12, size * 0.06, size * 0.04, color(140, 130, 120), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.5, -size * 0.06 + bob, size * 0.12, size * 0.06, size * 0.04, color(140, 130, 120), obj.angle, sunAngle);

        // Docking ring
        Draw3D.drawRing3D(0, bob, cylW * 0.55, size * 0.05, 12, size * 0.02, color(120), obj.angle, sunAngle);

        // Flashing navigation lights
        const navFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2);
        fill(255, 0, 0, 255 * navFlash);
        ellipse(-size * 0.45, -size * 0.1 + bob, 4, 4);
        fill(0, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2 + 1)));
        ellipse(size * 0.45, -size * 0.1 + bob, 4, 4);

        // Solar panel extension
        push();
        translate(size * 0.55, bob);
        const panelAng = Math.sin(obj.bobPhase * 0.002) * 0.1;
        rotate(panelAng);
        Draw3D.drawBox3D(size * 0.1, 0, size * 0.2, size * 0.08, size * 0.01, color(40, 80, 160), obj.angle, sunAngle);
        pop();

        // Insignia
        fill(200, 210, 220, 150);
        ellipse(0, -size * 0.15 + bob, size * 0.1, size * 0.06);
    },

    debris: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        if (obj._shards && obj._shards.length) {
            for (let i = 0; i < obj._shards.length; i++) {
                const sh = obj._shards[i];
                push();
                translate(sh.rx, sh.ry);

                // 3D tumbling rotation
                const tumbleAngle = sh.angle + Math.sin(obj.bobPhase * 0.002) * 0.03;
                rotate(tumbleAngle);

                // Draw shard as a prism
                Draw3D.drawPrism(0, 0, size * 0.12 * sh.rrScale, sh.verts, size * 0.05, color(140, 120, 110), obj.angle, sunAngle);

                pop();
            }

            // Dust puffs (keep 2D)
            for (let d = 0; d < 3; d++) {
                const da = obj.bobPhase * 0.001 + d * 2.1;
                const dx = Math.cos(da) * size * 0.32;
                const dy = Math.sin(da) * size * 0.12 + bob * 0.08;
                fill(160, 140, 120, 40);
                ellipse(dx + 2, dy + 1, 8, 4);
                fill(180, 160, 140, 60);
                ellipse(dx, dy, 6, 3);
            }

            // Flashing hazard lights
            const hazardFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25);
            fill(255, 0, 0, 80 * hazardFlash);
            ellipse(0, -size * 0.1 + bob, 8, 8);
            fill(255, 0, 0, 200 * hazardFlash);
            ellipse(0, -size * 0.1 + bob, 4, 4);
            fill(255, 255, 0, 80 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + 1)));
            ellipse(size * 0.1, size * 0.1 + bob, 6, 6);
            fill(255, 255, 0, 200 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + 1)));
            ellipse(size * 0.1, size * 0.1 + bob, 3, 3);

            // Glowing particles
            for (let p = 0; p < 2; p++) {
                const pa = obj.bobPhase * 0.003 + p * 3.14;
                const pr = size * 0.2;
                const px = Math.cos(pa) * pr;
                const py = Math.sin(pa) * pr + bob * 0.05;
                fill(220, 170, 120, 120 + 80 * Math.sin(pa));
                ellipse(px, py, 2.5, 2.5);
            }
        }
    },

    probe: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Body
        Draw3D.drawPrism(0, bob, size * 0.18, 4, size * 0.9, color(200, 200, 220), obj.angle, sunAngle);

        // Top highlight edge
        Draw3D.drawPrism(0, bob - size * 0.45, size * 0.16, 4, size * 0.04, color(230, 230, 250), obj.angle, sunAngle);

        // Nose cone (approximated with stacked prisms)
        Draw3D.drawPrism(0, bob - size * 0.55, size * 0.09, 4, size * 0.15, color(150, 150, 170), obj.angle, sunAngle);
        Draw3D.drawPrism(0, bob - size * 0.65, size * 0.01, 4, size * 0.1, color(190, 190, 210), obj.angle, sunAngle); // Tip

        // Solar panel
        Draw3D.drawBox3D(0, size * 0.28 + bob, size * 0.36, size * 0.08, size * 0.02, color(30, 80, 160), obj.angle, sunAngle);

        // Blinking nav light
        const blink = 0.5 + 0.5 * Math.sin(anim ? anim.probeBlink : obj.bobPhase * 0.1);
        fill(255, 140, 80, 80 * blink);
        ellipse(0, -size * 0.42 + bob, 12 * (1 + blink * 0.5), 12 * (1 + blink * 0.5));
        fill(255, 140, 80, 220 * blink);
        ellipse(0, -size * 0.42 + bob, 5 * (1 + blink), 5 * (1 + blink));

        // Engine trail (keep 2D)
        fill(100, 160, 235, 30);
        ellipse(0, size * 0.52 + bob, size * 0.36, size * 0.12);
        fill(120, 180, 255, 50);
        ellipse(0, size * 0.48 + bob, size * 0.28, size * 0.08);
        fill(140, 200, 255, 70);
        ellipse(0, size * 0.45 + bob, size * 0.20, size * 0.05);

        // Flashing status lights
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18);
        fill(0, 255, 0, 60 * statusFlash);
        ellipse(-size * 0.06, size * 0.1 + bob, 6, 6);
        fill(0, 255, 0, 255 * statusFlash);
        ellipse(-size * 0.06, size * 0.1 + bob, 3, 3);
        fill(255, 0, 255, 60 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18 + 1)));
        ellipse(size * 0.06, size * 0.1 + bob, 6, 6);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18 + 1)));
        ellipse(size * 0.06, size * 0.1 + bob, 3, 3);

        // Antenna deployment
        push();
        rotate(Math.sin(obj.bobPhase * 0.004) * 0.15);
        stroke(150, 160, 170);
        strokeWeight(1);
        line(0, -size * 0.3 + bob, size * 0.2, -size * 0.4 + bob);
        noStroke();
        fill(180, 190, 200);
        ellipse(size * 0.2, -size * 0.4 + bob, 4, 4);
        pop();

        // Sensor bands
        stroke(120, 130, 140, 150);
        strokeWeight(0.5);
        for (let b = 0; b < 3; b++) {
            const by = -size * 0.2 + b * (size * 0.15) + bob;
            line(-size * 0.08, by, size * 0.08, by);
        }
        noStroke();
    },

    beacon: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Main body
        Draw3D.drawBox3D(0, bob + size * 0.15, size * 0.18, size * 0.5, size * 0.18, color(100, 100, 110), obj.angle, sunAngle);

        // Top cap
        Draw3D.drawBox3D(0, bob - size * 0.12, size * 0.16, size * 0.04, size * 0.16, color(130, 130, 140), obj.angle, sunAngle);

        // Volumetric light cone
        const pulse = (Math.sin(obj.bobPhase * 1.6) + 1) * 0.5;
        const glow = 0.5 + 0.5 * pulse;

        // Light source
        fill(255, 240, 100, 220 * glow);
        ellipse(0, bob - size * 0.12, size * 0.42 * (0.9 + 0.4 * pulse) * 0.5, size * 0.42 * (0.9 + 0.4 * pulse) * 0.3);

        // Rotating light beam
        push();
        translate(0, bob - size * 0.12);
        rotate(obj.bobPhase * 0.002);
        // Beam cone
        fill(255, 220, 60, 50 * glow);
        beginShape();
        vertex(0, 0);
        vertex(-size * 0.15, -size * 0.6);
        vertex(size * 0.15, -size * 0.6);
        endShape(CLOSE);
        pop();

        // Rotating halo rings
        noFill();
        stroke(220, 200, 80, 70 * glow);
        strokeWeight(1.5);
        ellipse(0, bob, size * (0.9 + pulse * 0.6), size * (0.65 + pulse * 0.4));
        stroke(200, 180, 60, 50 * glow);
        strokeWeight(1);
        ellipse(0, bob, size * (1.1 + pulse * 0.8), size * (0.8 + pulse * 0.5));
        noStroke();

        // Flashing auxiliary lights
        const auxFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(0, 255, 255, 255 * auxFlash);
        ellipse(-size * 0.08, bob + size * 0.1, 3, 3);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.08, bob + size * 0.1, 3, 3);

        // Antenna array
        push();
        translate(0, bob);
        rotate(Math.sin(obj.bobPhase * 0.005) * 0.3);
        stroke(100, 110, 120);
        strokeWeight(1.2);
        for (let a = 0; a < 3; a++) {
            const aa = a * (TWO_PI / 3);
            const ax = Math.cos(aa) * size * 0.15;
            const ay = Math.sin(aa) * size * 0.15;
            line(0, 0, ax, ay);
        }
        noStroke();
        pop();

        // Base
        Draw3D.drawBox3D(0, bob + size * 0.3, size * 0.1, size * 0.08, size * 0.1, color(80, 80, 90), obj.angle, sunAngle);
    },

    outpost: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Central hub (large cylindrical core)
        Draw3D.drawPrism(0, bob, size * 0.15, 12, size * 0.8, color(180, 190, 200), obj.angle, sunAngle);

        // Hub end caps
        Draw3D.drawPrism(0, bob - size * 0.4, size * 0.18, 12, size * 0.05, color(160, 170, 180), obj.angle, sunAngle);
        Draw3D.drawPrism(0, bob + size * 0.4, size * 0.18, 12, size * 0.05, color(160, 170, 180), obj.angle, sunAngle);

        // Multiple radial modules
        for (let m = 0; m < 6; m++) {
            const ang = m * (TWO_PI / 6);
            const mx = Math.cos(ang) * size * 0.25;
            const my = Math.sin(ang) * size * 0.25 + bob;

            // Connecting corridor
            const cx = Math.cos(ang) * size * 0.15;
            const cy = Math.sin(ang) * size * 0.15 + bob;
            // Draw corridor as a thin box/prism rotated
            push();
            translate(cx, cy);
            rotate(ang);
            Draw3D.drawBox3D(size * 0.05, 0, size * 0.1, size * 0.05, size * 0.05, color(150, 160, 170), obj.angle, sunAngle);
            pop();

            // Module body
            push();
            translate(mx, my);
            rotate(ang);
            Draw3D.drawBox3D(0, 0, size * 0.2, size * 0.12, size * 0.1, color(170, 180, 190), obj.angle, sunAngle);

            // Windows/lights
            fill(255, 255, 200, 180);
            for (let w = -1; w <= 1; w++) {
                rect(w * (size * 0.04), -size * 0.04, size * 0.02, size * 0.08);
            }
            pop();
        }

        // Large solar arrays
        // Left
        Draw3D.drawBox3D(-size * 0.8, bob - size * 0.1, size * 0.6, size * 0.08, size * 0.02, color(50, 80, 130), obj.angle, sunAngle);
        // Right
        Draw3D.drawBox3D(size * 0.8, bob - size * 0.1, size * 0.6, size * 0.08, size * 0.02, color(50, 80, 130), obj.angle, sunAngle);
        // Top
        Draw3D.drawBox3D(0, bob - size * 0.8, size * 0.08, size * 0.6, size * 0.02, color(50, 80, 130), obj.angle, sunAngle);
        // Bottom
        Draw3D.drawBox3D(0, bob + size * 0.8, size * 0.08, size * 0.6, size * 0.02, color(50, 80, 130), obj.angle, sunAngle);

        // Communication antennas
        for (let a = 0; a < 4; a++) {
            const aang = a * (TWO_PI / 4) + (anim ? anim.stationAntenna : 0);
            const ax = Math.cos(aang) * size * 0.35;
            const ay = Math.sin(aang) * size * 0.35 + bob;
            Draw3D.drawPrism(ax, ay, size * 0.04, 6, size * 0.06, color(120, 130, 140), obj.angle, sunAngle);
            // Antenna rods
            stroke(100, 110, 120);
            strokeWeight(1.5);
            line(ax, ay - size * 0.03, ax, ay - size * 0.08);
            noStroke();
        }

        // Docking ports
        for (let d = 0; d < 3; d++) {
            const dang = d * (TWO_PI / 3) + Math.PI / 6;
            const dx = Math.cos(dang) * size * 0.4;
            const dy = Math.sin(dang) * size * 0.4 + bob;

            push();
            translate(dx, dy);
            rotate(dang);
            Draw3D.drawBox3D(0, 0, size * 0.15, size * 0.06, size * 0.04, color(140, 150, 160), obj.angle, sunAngle);
            // Docking lights
            fill(0, 255, 0, 200);
            ellipse(-size * 0.05, 0, 4, 4);
            fill(255, 0, 0, 200);
            ellipse(size * 0.05, 0, 4, 4);
            pop();
        }

        // Central radar/comms dome
        Draw3D.drawPrism(0, bob - size * 0.3, size * 0.06, 8, size * 0.04, color(200, 210, 220), obj.angle, sunAngle);

        // External cargo pods
        for (let p = 0; p < 2; p++) {
            const pang = p * Math.PI + (anim ? anim.stationPods : 0);
            const px = Math.cos(pang) * size * 0.5;
            const py = Math.sin(pang) * size * 0.3 + bob;
            Draw3D.drawPrism(px, py, size * 0.05, 6, size * 0.08, color(120, 110, 100), obj.angle, sunAngle);
        }

        // Flashing lights
        const navFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(255, 255, 0, 255 * navFlash);
        ellipse(-size * 0.2, -size * 0.4 + bob, 5, 5);
        fill(0, 255, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.2, -size * 0.4 + bob, 5, 5);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 2)));
        ellipse(0, size * 0.5 + bob, 5, 5);

        // Heat radiators
        Draw3D.drawBox3D(-size * 0.08, bob + size * 0.15, size * 0.04, size * 0.4, size * 0.1, color(160, 170, 180, 150), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.08, bob + size * 0.15, size * 0.04, size * 0.4, size * 0.1, color(160, 170, 180, 150), obj.angle, sunAngle);
    },

    observatoryDome: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Main support structure (hexagonal base)
        Draw3D.drawPrism(0, bob, size * 0.5, 6, size * 0.2, color(120, 130, 140), obj.angle, sunAngle);

        // Secondary support rings
        Draw3D.drawRing3D(0, bob, size * 0.9, size * 0.15, 12, size * 0.05, color(100, 110, 120), obj.angle, sunAngle);
        Draw3D.drawRing3D(0, bob - size * 0.1, size * 0.8, size * 0.12, 12, size * 0.05, color(100, 110, 120), obj.angle, sunAngle);

        // Central support pillar
        Draw3D.drawBox3D(0, bob - size * 0.25, size * 0.1, size * 0.5, size * 0.1, color(140, 150, 160), obj.angle, sunAngle);

        // Elevator car
        Draw3D.drawBox3D(0, bob - size * 0.15 + Math.sin(anim ? anim.domeRotation : 0) * 2, size * 0.06, size * 0.04, size * 0.06, color(180, 190, 200), obj.angle, sunAngle);

        // Massive observation dome (approximated with a prism/hemisphere)
        Draw3D.drawPrism(0, bob - size * 0.45, size * 0.4, 12, size * 0.2, color(220, 240, 255, 100), obj.angle, sunAngle);

        // Dome frame
        stroke(90, 100, 110, 180);
        strokeWeight(2);
        noFill();
        // Simplified wireframe
        const domeRadius = size * 0.4;
        const domeHeight = size * 0.2;
        const domeY = bob - size * 0.45;
        // ... (wireframe drawing logic if needed, or rely on prism edges)

        // Primary telescope assembly
        push();
        translate(0, bob - size * 0.45);
        const sweepAng = anim ? anim.telescopeSweep : 0;
        rotate(sweepAng);
        Draw3D.drawBox3D(0, 0, size * 0.12, size * 0.35, size * 0.12, color(60, 70, 80), obj.angle, sunAngle);
        Draw3D.drawPrism(0, -size * 0.2, size * 0.04, 8, size * 0.02, color(30, 40, 50), obj.angle, sunAngle);
        pop();

        // Secondary telescope arrays
        for (let s = 0; s < 3; s++) {
            const sa = s * TWO_PI / 3;
            const sx = Math.cos(sa) * size * 0.25;
            const sy = Math.sin(sa) * size * 0.25 + bob - size * 0.3;
            Draw3D.drawBox3D(sx, sy, size * 0.08, size * 0.2, size * 0.08, color(70, 80, 90), obj.angle, sunAngle);
        }

        // Research modules
        for (let m = 0; m < 4; m++) {
            const ma = m * TWO_PI / 4;
            const mx = Math.cos(ma) * size * 0.4;
            const my = Math.sin(ma) * size * 0.4 + bob - size * 0.05;
            Draw3D.drawBox3D(mx, my, size * 0.12, size * 0.08, size * 0.08, color(160, 170, 180), obj.angle, sunAngle);
        }

        // Observation decks
        for (let d = 0; d < 2; d++) {
            const dy = bob - size * 0.35 + d * size * 0.1;
            Draw3D.drawRing3D(0, dy, size * 0.5, size * 0.08, 12, size * 0.02, color(180, 190, 200, 150), obj.angle, sunAngle);
        }

        // Solar power arrays
        Draw3D.drawBox3D(-size * 0.6, bob + size * 0.1, size * 0.35, size * 0.06, size * 0.02, color(30, 60, 100), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.6, bob + size * 0.1, size * 0.35, size * 0.06, size * 0.02, color(30, 60, 100), obj.angle, sunAngle);

        // Communication arrays
        Draw3D.drawPrism(-size * 0.3, bob - size * 0.2, size * 0.05, 6, size * 0.06, color(100, 110, 120), obj.angle, sunAngle);
        Draw3D.drawPrism(size * 0.3, bob - size * 0.2, size * 0.05, 6, size * 0.06, color(100, 110, 120), obj.angle, sunAngle);

        // Atmospheric sensors
        for (let w = 0; w < 6; w++) {
            const wa = w * TWO_PI / 6;
            const wx = Math.cos(wa) * size * 0.45;
            const wy = Math.sin(wa) * size * 0.45 + bob - size * 0.1;
            Draw3D.drawPrism(wx, wy, size * 0.015, 4, size * 0.02, color(140, 150, 160), obj.angle, sunAngle);
        }

        // Cooling systems
        Draw3D.drawBox3D(-size * 0.08, bob + size * 0.15, size * 0.04, size * 0.25, size * 0.04, color(120, 130, 140, 150), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.08, bob + size * 0.15, size * 0.04, size * 0.25, size * 0.04, color(120, 130, 140, 150), obj.angle, sunAngle);

        // Lights
        const obsFlash1 = 0.5 + 0.5 * Math.sin((anim ? anim.observationLights : 0));
        const obsFlash2 = 0.5 + 0.5 * Math.sin((anim ? anim.observationLights : 0) + 1);
        const obsFlash3 = 0.5 + 0.5 * Math.sin((anim ? anim.observationLights : 0) + 2);
        fill(255, 255, 150, 255 * obsFlash1);
        ellipse(-size * 0.2, bob - size * 0.4, 5, 5);
        fill(150, 255, 255, 255 * obsFlash2);
        ellipse(size * 0.2, bob - size * 0.4, 5, 5);
        fill(255, 150, 255, 255 * obsFlash3);
        ellipse(0, bob + size * 0.25, 5, 5);
    },

    weaponPlatform: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Main armored hull
        Draw3D.drawBox3D(0, bob, size * 0.8, size * 0.5, size * 0.2, color(60, 60, 70), obj.angle, sunAngle);

        // Armor plating layers
        Draw3D.drawBox3D(0, bob - size * 0.15, size * 0.7, size * 0.08, size * 0.22, color(50, 50, 60), obj.angle, sunAngle);
        Draw3D.drawBox3D(0, bob + size * 0.15, size * 0.7, size * 0.08, size * 0.22, color(50, 50, 60), obj.angle, sunAngle);

        // Reinforced corners
        for (let c = 0; c < 4; c++) {
            const cx = (c % 2 === 0 ? -1 : 1) * size * 0.35;
            const cy = (c < 2 ? -1 : 1) * size * 0.2 + bob;
            Draw3D.drawPrism(cx, cy, size * 0.05, 6, size * 0.1, color(40, 40, 50), obj.angle, sunAngle);
        }

        // Primary turret systems
        for (let t = 0; t < 4; t++) {
            const tang = t * (TWO_PI / 4) + (anim ? anim.turretRotation : 0);
            const tx = Math.cos(tang) * size * 0.3;
            const ty = Math.sin(tang) * size * 0.3 + bob;

            // Turret base
            Draw3D.drawPrism(tx, ty, size * 0.075, 8, size * 0.05, color(70, 70, 80), obj.angle, sunAngle);

            // Barrels
            push();
            translate(tx, ty);
            rotate(tang);
            Draw3D.drawBox3D(-size * 0.03, -size * 0.06, size * 0.06, size * 0.15, size * 0.02, color(25, 25, 35), obj.angle, sunAngle);
            Draw3D.drawBox3D(size * 0.03, -size * 0.06, size * 0.06, size * 0.15, size * 0.02, color(25, 25, 35), obj.angle, sunAngle);
            pop();
        }

        // Missile launch systems
        for (let m = 0; m < 8; m++) {
            const mang = m * (TWO_PI / 8);
            const mx = Math.cos(mang) * size * 0.4;
            const my = Math.sin(mang) * size * 0.4 + bob;
            Draw3D.drawBox3D(mx, my, size * 0.05, size * 0.1, size * 0.05, color(55, 55, 65), obj.angle, sunAngle);
            // Missile tip
            fill(150, 30, 30);
            ellipse(mx, my - size * 0.05, size * 0.04, size * 0.03);
        }

        // Defense shield generators
        for (let s = 0; s < 4; s++) {
            const sang = s * (TWO_PI / 4) + Math.PI / 4;
            const sx = Math.cos(sang) * size * 0.25;
            const sy = Math.sin(sang) * size * 0.25 + bob - size * 0.2;

            // Generator housing
            Draw3D.drawPrism(sx, sy, size * 0.07, 6, size * 0.05, color(110, 130, 150), obj.angle, sunAngle);

            // Pulsing shield visualization
            const basePhase = (anim ? anim.defensePulse : obj.bobPhase * 0.006) + s * 0.9;
            const sp = 0.6 + 0.4 * Math.sin(basePhase);
            for (let r = 0; r < 3; r++) {
                const rr = size * (0.16 + r * 0.06) * sp;
                fill(100, 170, 230, 36 * (1 - r * 0.18) * (1 + 0.4 * Math.sin(basePhase + r)));
                ellipse(sx, sy, rr, rr * 0.6);
            }
        }

        // Advanced radar and targeting array
        push();
        translate(0, bob - size * 0.25);
        const chargeAng = anim ? anim.weaponCharge : 0;
        rotate(chargeAng);
        Draw3D.drawPrism(0, 0, size * 0.1, 8, size * 0.06, color(100, 110, 120), obj.angle, sunAngle);
        // Scanning beams
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

        // Point defense turrets
        for (let p = 0; p < 6; p++) {
            const pang = p * (TWO_PI / 6);
            const px = Math.cos(pang) * size * 0.35;
            const py = Math.sin(pang) * size * 0.35 + bob + size * 0.1;
            Draw3D.drawBox3D(px, py, size * 0.06, size * 0.04, size * 0.04, color(65, 65, 75), obj.angle, sunAngle);
            // Defense gun
            Draw3D.drawBox3D(px, py - size * 0.03, size * 0.02, size * 0.05, size * 0.02, color(30, 30, 40), obj.angle, sunAngle);
        }

        // Command and control center
        Draw3D.drawBox3D(0, bob - size * 0.1, size * 0.3, size * 0.15, size * 0.1, color(80, 85, 90), obj.angle, sunAngle);
        // Viewports
        fill(150, 180, 200, 120);
        for (let v = -1; v <= 1; v++) {
            ellipse(v * size * 0.08, bob - size * 0.1, size * 0.04, size * 0.03);
        }
        // Antenna array
        Draw3D.drawBox3D(0, bob - size * 0.18, size * 0.06, size * 0.04, size * 0.02, color(100, 110, 120), obj.angle, sunAngle);

        // External armor reinforcement plates
        for (let a = 0; a < 12; a++) {
            const aang = a * (TWO_PI / 12);
            const ax = Math.cos(aang) * size * 0.32;
            const ay = Math.sin(aang) * size * 0.32 + bob;
            Draw3D.drawPrism(ax, ay, size * 0.04, 6, size * 0.02, color(70, 70, 80, 160), obj.angle, sunAngle);
        }

        // Power conduits
        stroke(180, 120, 80, 140);
        strokeWeight(2.5);
        for (let c = 0; c < 4; c++) {
            const cx = (c - 1.5) * size * 0.12;
            line(cx, bob - size * 0.25, cx, bob + size * 0.25);
        }
        noStroke();

        // Weapon charging capacitors
        const chargeLevel = 0.5 + 0.5 * Math.sin(anim ? anim.weaponCharge : 0);
        for (let cap = 0; cap < 4; cap++) {
            const ca = cap * (TWO_PI / 4) + Math.PI / 4;
            const cax = Math.cos(ca) * size * 0.2;
            const cay = Math.sin(ca) * size * 0.2 + bob;
            fill(200, 150, 100, 100 + 100 * chargeLevel);
            ellipse(cax, cay, size * 0.05 * (0.8 + 0.4 * chargeLevel), size * 0.04 * (0.8 + 0.4 * chargeLevel));
        }

        // Tactical status lights
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
        Draw3D.drawBox3D(-size * 0.06, bob + size * 0.18, size * 0.04, size * 0.2, size * 0.04, color(130, 140, 150, 160), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.06, bob + size * 0.18, size * 0.04, size * 0.2, size * 0.04, color(130, 140, 150, 160), obj.angle, sunAngle);

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

    default: function (obj, size, anim, bob) {
        // fallback simple marker
        fill(200, 200, 200);
        ellipse(0, 0 + bob, size * 0.6, size * 0.6);
    },

    shieldGenerator: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Standalone shield generator: visible dome, emitter pylons, pulsing energy field and protective ring
        // Main housing
        Draw3D.drawBox3D(0, bob, size * 0.36, size * 0.22, size * 0.15, color(110, 125, 140), obj.angle, sunAngle);
        Draw3D.drawBox3D(0, bob + size * 0.06, size * 0.16, size * 0.08, size * 0.05, color(80, 95, 110), obj.angle, sunAngle);

        // Emitter pylons around base
        for (let p = 0; p < 4; p++) {
            const pa = p * (TWO_PI / 4) + obj.bobPhase * 0.001;
            const px = Math.cos(pa) * size * 0.28;
            const py = Math.sin(pa) * size * 0.12 + bob;

            // Pylon arm
            push();
            translate(px * 0.9, py - size * 0.06);
            rotate(pa);
            Draw3D.drawBox3D(0, 0, size * 0.1, size * 0.02, size * 0.02, color(140, 160, 180), obj.angle + (pa), sunAngle);
            pop();

            // Emitter tip
            Draw3D.drawBox3D(px, py, size * 0.06, size * 0.04, size * 0.04, color(130, 150, 170), obj.angle, sunAngle);
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

    undergroundMarket: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Dark, low-profile black market hub with neon signage and covered cargo crates
        // base platform shadow


        // main low-slung structure
        Draw3D.drawBox3D(0, bob, size * 0.7, size * 0.28, size * 0.1, color(30, 30, 38), obj.angle, sunAngle);

        // covered cargo crates / cages
        for (let i = -1; i <= 1; i++) {
            const cx = i * size * 0.22;
            const cy = bob + size * 0.06;
            Draw3D.drawBox3D(cx, cy, size * 0.24, size * 0.16, size * 0.08, color(50, 40, 38), obj.angle, sunAngle);

            // Cage bars
            stroke(18, 18, 20, 120); strokeWeight(1);
            line(cx - size * 0.12, cy - size * 0.06, cx + size * 0.12, cy - size * 0.06);
            noStroke();
        }

        // neon signage strips (animated pulse)
        const pulse = 0.6 + 0.4 * Math.sin(anim ? (anim.marketPulse || 0) : obj.bobPhase * 0.02);
        // red 'off' neon
        Draw3D.drawBox3D(-size * 0.18, bob - size * 0.08, size * 0.36, 6, 2, color(160, 24, 24, 160 * pulse), obj.angle, sunAngle);
        // cyan accent
        Draw3D.drawBox3D(size * 0.18, bob - size * 0.08, size * 0.28, 4, 2, color(24, 180, 200, 140 * (0.6 + 0.4 * Math.cos(obj.bobPhase * 0.02))), obj.angle, sunAngle);

        // silhouette figures near entrances (tiny human shapes)
        fill(12, 12, 12);
        for (let s = -1; s <= 1; s++) {
            const sx = s * size * 0.26;
            const sy = bob + size * 0.14;
            ellipse(sx, sy - 6, 6, 6);
            rect(sx, sy - 0, 3, 6, 1);
        }

        // small security drone(s)
        Draw3D.drawBox3D(size * 0.38, bob - size * 0.02, 8, 6, 4, color(90, 90, 100), obj.angle, sunAngle);
        stroke(80, 160, 200, 80); strokeWeight(0.8);
        line(size * 0.38, bob - size * 0.02, size * 0.48, bob - size * 0.06);
        noStroke();


    },

    solarSail: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Central bus
        Draw3D.drawBox3D(0, bob, size * 0.18, size * 0.12, size * 0.1, color(160, 160, 180), obj.angle, sunAngle);

        // Sails
        const sailAngle = anim ? (anim.solarSailAngle + Math.sin(obj.bobPhase * 0.002) * anim.solarSailFlutter) : 0;

        // Left sail
        push();
        rotate(sailAngle);

        // Struts
        // Draw3D.drawPrism(-size * 0.5, bob - size * 0.15, size * 0.02, 4, size * 1.0, color(140, 140, 150), obj.angle + (Math.PI/2), sunAngle);
        // Draw3D.drawPrism(-size * 0.5, bob + size * 0.15, size * 0.02, 4, size * 1.0, color(140, 140, 150), obj.angle + (Math.PI/2), sunAngle);

        // Sail fabric (2D with 3D positioning context)
        fill(245, 245, 255, 230);
        beginShape();
        vertex(-size * 0.12, bob);
        vertex(-size * 0.98, bob - size * 0.34);
        vertex(-size * 0.98, bob + size * 0.34);
        endShape(CLOSE);

        // Grid lines
        stroke(200, 220, 240, 90); strokeWeight(0.5);
        const L0 = { x: -size * 0.12, y: bob };
        const L1 = { x: -size * 0.98, y: bob - size * 0.34 };
        const L2 = { x: -size * 0.98, y: bob + size * 0.34 };
        for (let t = 0.18; t < 1.0; t += 0.18) {
            const ax = L0.x * (1 - t) + L1.x * t; const ay = L0.y * (1 - t) + L1.y * t;
            const bx = L0.x * (1 - t) + L2.x * t; const by = L0.y * (1 - t) + L2.y * t;
            line(ax, ay, bx, by);
        }
        noStroke();
        pop();

        // Right sail
        push();
        rotate(-sailAngle * 1.1);

        // Sail fabric
        fill(245, 245, 255, 230);
        beginShape();
        vertex(size * 0.12, bob);
        vertex(size * 0.98, bob - size * 0.34);
        vertex(size * 0.98, bob + size * 0.34);
        endShape(CLOSE);

        // Grid lines
        stroke(200, 220, 240, 90); strokeWeight(0.5);
        const R0 = { x: size * 0.12, y: bob };
        const R1 = { x: size * 0.98, y: bob - size * 0.34 };
        const R2 = { x: size * 0.98, y: bob + size * 0.34 };
        for (let t = 0.18; t < 1.0; t += 0.18) {
            const ax = R0.x * (1 - t) + R1.x * t; const ay = R0.y * (1 - t) + R1.y * t;
            const bx = R0.x * (1 - t) + R2.x * t; const by = R0.y * (1 - t) + R2.y * t;
            line(ax, ay, bx, by);
        }
        noStroke();
        pop();

        // Sensor pod
        const podAng = (anim ? anim.solarSailAngle : 0) * 4 + obj.bobPhase * 0.002;
        const podR = size * 0.58;
        const px = Math.cos(podAng) * podR * 0.9;
        const py = Math.sin(podAng) * podR * 0.35 + bob * 0.12;
        stroke(120, 120, 130, 120); strokeWeight(0.8);
        line(0, bob, px, py);
        noStroke();
        Draw3D.drawBox3D(px, py, size * 0.05, size * 0.05, size * 0.05, color(220, 230, 240), obj.angle, sunAngle);

        // Nav lights
        const navFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2);
        fill(255, 0, 0, 255 * navFlash);
        ellipse(-size * 0.08, bob - size * 0.04, 3, 3);
        fill(0, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.2 + 1)));
        ellipse(size * 0.08, bob - size * 0.04, 3, 3);
    },

    engineArray: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Platform body
        Draw3D.drawBox3D(0, bob + size * 0.02, size * 0.7, size * 0.28, size * 0.1, color(80, 80, 80), obj.angle, sunAngle);

        // Central pylon
        Draw3D.drawBox3D(0, bob - size * 0.06, size * 0.18, size * 0.46, size * 0.18, color(100, 100, 110), obj.angle, sunAngle);

        // Engines
        for (let i = -1; i <= 1; i++) {
            const nx = i * size * 0.28;
            const ny = size * 0.18 + bob;

            // Mounting arm
            stroke(110); strokeWeight(2);
            line(nx * 0.45, ny - size * 0.08, nx, ny - size * 0.02);
            noStroke();

            // Nozzle housing
            Draw3D.drawPrism(nx, ny, size * 0.09, 8, size * 0.12, color(70, 70, 80), obj.angle, sunAngle);

            // Inner glow
            const g = 0.5 + 0.45 * Math.sin((anim ? anim.engineGlow : 0.3) + i * 0.6 + obj.bobPhase * 0.015);
            fill(60, 150, 240, 160 * g);
            ellipse(nx, ny + size * 0.06, size * 0.09 * g, size * 0.06 * g);

            // Exhaust cone
            for (let e = 0; e < 4; e++) {
                const ex = nx + (e * 6) * (0.6 + i * 0.02);
                const ey = ny + size * 0.18 + e * 8 + (Math.sin(anim ? anim.engineParticlePhase : 0) * 2);
                fill(100, 170, 255, 40 - e * 8);
                ellipse(ex, ey, size * (0.18 + e * 0.12) * g, size * (0.12 + e * 0.1) * g);
            }
        }

        // Heat rings
        noFill(); stroke(100, 170, 255, 30); strokeWeight(0.6);
        ellipse(0, size * 0.36 + bob, size * 0.9, size * 0.3);
        noStroke();

        // Status indicators
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25);
        fill(255, 255, 0, 255 * statusFlash);
        ellipse(-size * 0.3, bob - size * 0.02, 3, 3);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + 1)));
        ellipse(size * 0.3, bob - size * 0.02, 3, 3);

        // Cooling vane
        push();
        translate(0, bob + size * 0.1);
        const vaneAng = Math.sin(obj.bobPhase * 0.004) * 0.2;
        rotate(vaneAng);
        Draw3D.drawBox3D(-size * 0.05, 0, size * 0.1, size * 0.25, size * 0.02, color(120, 130, 140, 150), obj.angle, sunAngle);
        pop();
    },

    cargoCluster: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        const cols = 3;
        const rows = 2;
        const cw = size * 0.28;
        const ch = size * 0.18;
        const cd = size * 0.2;

        for (let r = 0; r < rows; r++) {
            for (let c = 0; c < cols; c++) {
                const x = (c - (cols - 1) / 2) * (cw + 6);
                const y = (r - (rows - 1) / 2) * (ch + 6) + bob;

                // Container body
                Draw3D.drawBox3D(x, y, cd, cw, ch, color(120 + r * 10, 110 + c * 8, 100), obj.angle, sunAngle);

                // Hatch animation
                const hatch = Math.sin((anim ? anim.cargoHatch : 0) + c * 0.7 + r * 1.1) * 6;
                // Hatch lid
                push();
                translate(x, y - ch * 0.5);
                Draw3D.drawBox3D(0, 0, cd * 0.8, cw * 0.8, size * 0.02, color(100, 90, 80), obj.angle, sunAngle);
                pop();

                // Sticker
                fill(40, 40, 60, 200);
                rect(x + cw * 0.22, y + ch * 0.18, cw * 0.22, ch * 0.28, 2);
            }
        }

        // Helper drones
        if (obj._drones && obj._drones.length) {
            for (let di = 0; di < obj._drones.length; di++) {
                const d = obj._drones[di];
                const dx = Math.cos(d.ang) * d.dist;
                const dy = Math.sin(d.ang) * (d.dist * 0.32);
                const w = 6 + Math.sin(d.phase) * 2;

                Draw3D.drawBox3D(dx, dy + bob - ch * 0.2, w, w, w, color(255, 220, 140), obj.angle, sunAngle);

                stroke(255, 200, 120, 120); strokeWeight(0.6);
                line(dx, dy + bob - ch * 0.2, dx - Math.cos(d.ang) * 6, dy + bob - ch * 0.2 - Math.sin(d.ang) * 6);
                noStroke();
            }
        }

        // Warning lights
        const warnFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(255, 0, 0, 255 * warnFlash);
        ellipse(-size * 0.2, bob - ch * 0.3, 3, 3);
        fill(255, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.2, bob - ch * 0.3, 3, 3);

        // Crane arm
        push();
        translate(0, bob - ch * 0.5);
        const craneAng = Math.sin(obj.bobPhase * 0.002) * 0.15;
        rotate(craneAng);
        Draw3D.drawPrism(0, 0, size * 0.02, 4, size * 0.3, color(100, 110, 120), obj.angle + (Math.PI / 2), sunAngle);
        Draw3D.drawBox3D(size * 0.25, -size * 0.2, size * 0.05, size * 0.05, size * 0.05, color(120, 130, 140), obj.angle, sunAngle);
        pop();
    },

    researchArray: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Low platform
        Draw3D.drawBox3D(0, bob, size * 0.38, size * 0.38, size * 0.22, color(200, 200, 200), obj.angle, sunAngle);

        // Sensor mast
        push();
        translate(0, bob - size * 0.06);
        Draw3D.drawBox3D(0, 0, size * 0.08, size * 0.08, size * 0.4, color(140, 140, 140), obj.angle, sunAngle);

        // Rotating ring sensor
        const ringAng = (anim ? anim.researchArraySweep : 0) * 0.04;
        rotate(ringAng);
        // Correct parameter order: (x,y,rOuter,rInner,sides,depth,col,angle,sunAngle)
        Draw3D.drawRing3D(0, -size * 0.14, size * 0.13, size * 0.02, 12, size * 0.02, color(120, 200, 230), obj.angle, sunAngle);
        pop();

        // Precision dishes
        for (let i = 0; i < 3; i++) {
            push();
            const baseAng = -0.9 + i * 0.9;
            const sway = Math.sin((anim ? anim.researchArraySweep : 0) + i * 0.6) * 0.18;
            const totalAng = baseAng + sway;
            rotate(totalAng);
            translate(0, -size * (0.36 + i * 0.05));

            // Dish
            Draw3D.drawPrism(0, 0, size * (0.16 - i * 0.02), 12, size * 0.05, color(235, 235, 235), obj.angle + (Math.PI / 2), sunAngle);
            // Dish rim
            noFill(); stroke(180); strokeWeight(0.9);
            ellipse(0, 0, size * (0.28 - i * 0.04), size * (0.16 - i * 0.03));
            pop();
        }

        // Pulsed conal sweep
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

        // Orbiting data buoys
        for (let b = 0; b < 2; b++) {
            const ba = (anim ? anim.researchArraySweep : 0) * (0.6 + b * 0.4) + b * 1.2;
            const br = size * (0.9 + b * 0.12);
            const bx = Math.cos(ba) * br * 0.6;
            const by = Math.sin(ba) * br * 0.4 + bob * 0.05;
            Draw3D.drawBox3D(bx, by, size * 0.05, size * 0.08, size * 0.05, color(160, 230, 250, 180), obj.angle, sunAngle);
        }

        // Central pulsing indicator
        const pulse = 0.5 + 0.5 * Math.sin(anim ? anim.researchPing : 0);
        fill(100, 200, 230, 120 * pulse);
        ellipse(0, -size * 0.06 + bob, 8 * pulse, 4 * pulse);
        noStroke();

        // Status lights
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35);
        fill(255, 0, 0, 255 * statusFlash);
        ellipse(-size * 0.15, bob + size * 0.08, 3, 3);
        fill(0, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35 + 1)));
        ellipse(size * 0.15, bob + size * 0.08, 3, 3);

        // Auxiliary dish
        push();
        translate(size * 0.25, bob - size * 0.1);
        const auxAng = Math.sin(obj.bobPhase * 0.003) * 0.2;
        rotate(auxAng);
        Draw3D.drawPrism(0, 0, size * 0.07, 8, size * 0.05, color(210, 220, 230), obj.angle + (Math.PI / 2), sunAngle);
        pop();
    },

    orbitalGarden: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Helper to project "height" (z) along the object's rotation axis
        // z > 0 is "up" (towards the top of the station), z < 0 is "down"
        const sin = Math.sin(obj.angle || 0);
        const cos = Math.cos(obj.angle || 0);
        function getPos(z) {
            // "Up" in object space corresponds to moving against the depth vector
            // The depth vector (down) is (sin, cos). So up is (-sin, -cos).
            return {
                x: -z * sin,
                y: bob - z * cos
            };
        }

        // 1. Base Structure (Industrial/Metallic)
        // Stack from bottom up
        // Base Top at z = -0.15s, Depth = 0.15s (Bottom at -0.30s)
        const pBase = getPos(-size * 0.15);
        Draw3D.drawPrism(pBase.x, pBase.y, size * 0.4, 12, size * 0.15, color(50, 55, 60), obj.angle, sunAngle);

        // Ring around base
        const pRing = getPos(-size * 0.20);
        Draw3D.drawRing3D(pRing.x, pRing.y, size * 0.5, size * 0.38, 12, size * 0.05, color(70, 75, 80), obj.angle, sunAngle);

        // 2. The Garden (Inside)
        // Soil Bed: Top at z = -0.10s, Depth = 0.05s (Bottom at -0.15s)
        const pSoil = getPos(-size * 0.10);
        Draw3D.drawPrism(pSoil.x, pSoil.y, size * 0.35, 12, size * 0.05, color(60, 40, 20), obj.angle, sunAngle);

        // Lush Vegetation
        const breeze = (anim ? anim.gardenBreeze : 0) + obj.bobPhase * 0.002;
        const plantCount = 12;

        // Plants stand on the soil (z = -0.10s)
        const soilZ = -size * 0.10;

        for (let i = 0; i < plantCount; i++) {
            const angle = i * (TWO_PI / plantCount) + (i * 1.1);
            const r = size * (0.1 + (i % 3) * 0.08);

            // Calculate plant position on the circular bed
            // We need to rotate this offset by obj.angle to match the station's rotation
            const localX = Math.cos(angle) * r;
            const localY = Math.sin(angle) * r; // Flat circle on the "floor"

            // Rotate (localX, localY) by obj.angle
            // The "floor" plane is perpendicular to the Z axis.
            // In Draw3D's simple projection, the "side" view compresses the Y axis of the floor circle?
            // Draw3D usually draws prisms facing the camera.
            // To place items "on" the prism top face:
            // The prism top face is drawn at screen (px, py).
            // A point (r, angle) on that face:
            // x_screen = px + r * cos(angle)
            // y_screen = py + r * sin(angle) * perspective_foreshortening?
            // Draw3D.drawPrism draws a regular polygon. It doesn't squash it into an ellipse (unless sides is large and we interpret it as such).
            // Actually Draw3D.drawPrism draws a regular polygon at (x,y). It does NOT apply perspective tilt to the face itself, only to the sides (depth).
            // So the "top" face is facing the camera directly (or is a cross-section).
            // If the station is a tower, we are looking at it from the side.
            // So the "floor" is actually a line or a thin ellipse if we had true 3D.
            // But Draw3D style is "top-down 2.5D" where objects are often drawn "standing up" towards the camera?
            // No, `drawPrism` draws a shape at x,y and extrudes it by `depth` in direction `angle`.
            // This implies we are looking "down" at the object, and `depth` is the vertical height (Z).
            // So the "Top" face is the one closest to the camera.
            // So the "Soil" is a flat polygon facing the camera.
            // So plants should be placed on this polygon.

            const px = pSoil.x + Math.cos(angle) * r;
            const py = pSoil.y + Math.sin(angle) * r;

            const sway = Math.sin(breeze + i) * size * 0.02;

            // Trunk
            // Trunks grow "up" (towards camera? or along station axis?)
            // If the station is a tower, trees should grow "out" from the axis? Or "up" along the axis?
            // Usually "gravity" is centrifugal or linear.
            // If it's a tower, gravity is likely "down" (towards base). Trees grow "up" (towards top).
            // So trees should grow along the Z axis (station axis).
            // So we draw the trunk as a prism starting at (px, py) and extruding "up".
            // But `drawPrism` extrudes "down" (depth).
            // So we want the Tree Top at `z_tree_top`.
            // Tree Base is at `soilZ`.
            // Tree Height `trunkH`.
            // Tree Top Z = `soilZ + trunkH`.
            // But wait, if the floor is facing the camera, then "Up" is towards the camera (Z-buffer).
            // But `drawPrism` depth is along screen Y (rotated).
            // This renderer is confusing.
            // Let's look at `satellite`. It draws a central bus and panels.
            // It seems `Draw3D` is "Side View" where `depth` is "Thickness away from camera"?
            // OR `Draw3D` is "Top View" where `depth` is "Height"?
            // `getDepthVector` uses `sin(theta), cos(theta)`.
            // If theta=0, dv=(0, depth).
            // If I draw a rect at 0,0 and another at 0,10.
            // It looks like a tower viewed from slightly above-side.

            // If I want trees to stand UP from the soil (perpendicular to the soil face):
            // Since the soil face is drawn as a flat polygon on screen, "Perpendicular" means "Towards the camera".
            // But we can't draw "towards the camera" easily with this 2D canvas except by draw order.
            // AND `drawPrism` extrudes sideways/downwards.

            // Let's assume the "Soil" face is the ground.
            // Trees should stick out of it.
            // If we use `drawBox3D` or `drawPrism` for trees, they will also be extruded along the station axis.
            // This means trees are "lying down" on the soil?
            // Or is the station axis the "Up" direction?
            // If the station axis is "Up", then the soil face is a cross-section.
            // This means the "Garden" is a slice of the cylinder.
            // If so, we can't see the "floor" as a circle. We see it as a line/ellipse edge-on.
            // BUT `drawPrism` draws a full circle (polygon).
            // This implies the object is viewed "Top Down" (looking down the axis).
            // BUT `orbitalGarden` (and others) rotate.
            // When they rotate, the "depth" vector rotates.
            // This implies the "depth" is the side of the cylinder.
            // So we are looking at the "Top" of the cylinder, and the "Side" is extruded.
            // So the "Soil" is the circular floor we see.
            // So trees should stand up *towards the camera*.
            // To simulate trees standing up towards the camera, we just draw them on top (draw order) and maybe give them a little "height" effect (parallax?).
            // Or we just draw them as blobs on the circle.

            // Let's stick to drawing them as small prisms/boxes on the surface.
            // If I draw a box at (px, py), it sits on the surface.
            // To make it look like a tree, maybe just a small circle (top down view of tree).
            // OR, if we want to simulate the "Cupola" being a dome over it, we are looking into the dome.

            // Trunk (Top down view = dot)
            // Foliage (Top down view = larger circle)

            // Let's try drawing them as simple circles/blobs since we are looking "down" into the garden.

            const trunkH = size * 0.02; // Not height, but thickness/size
            // Draw trunk
            fill(80, 60, 40);
            ellipse(px, py, size * 0.03, size * 0.03);

            // Foliage
            const bushSize = size * (0.08 + (i % 3) * 0.03);
            const gVar = (i * 30) % 50;
            fill(40, 140 + gVar, 60);
            ellipse(px + sway, py + sway * 0.5, bushSize, bushSize);
        }

        // Central Tree (Top down)
        fill(50, 180, 80);
        ellipse(pSoil.x, pSoil.y, size * 0.25, size * 0.25);

        // 3. The Cupola (Glass Dome)
        // Stacked prisms to form a dome shape
        // We need to draw them "above" the soil.
        // "Above" means "closer to camera" in Z-order, but also physically "higher" in the stack if it's a tower.
        // Wait, if `drawPrism` is Top-Down, then "stacking" means drawing smaller concentric shapes?
        // OR does `drawPrism` simulate a long cylinder lying on the screen?
        // If `angle` rotates the depth vector, then it's a cylinder lying on the screen.
        // If `angle=0`, depth is (0, depth). Vertical cylinder.
        // We see the Top Face at (x,y). We see the Side extending to (x, y+depth).
        // So we are looking at the Top Face, and the side goes "down" the screen.
        // So the "Top" face is the "Top" of the station.
        // So if we want to stack things, we should draw the "Bottom" things first (at y+depth), and "Top" things last (at y).
        // My `getPos` logic moves "Up" (negative depth).
        // So `getPos(0)` is the center. `getPos(0.1)` is "higher" (closer to top).
        // So we should draw from Bottom (negative z) to Top (positive z).
        // And we should use the painter's algorithm (draw bottom first).

        // My previous logic:
        // Base at -0.15.
        // Soil at -0.10.
        // Cupola 1 at 0.05.
        // Cupola 2 at 0.15.
        // Cupola 3 at 0.22.

        // This order is correct for Painter's Algorithm if we are looking from the "Top".
        // (The things "higher" up the stack cover the things "lower" down).

        const domeColor = color(200, 240, 255, 40);
        const domeRibColor = color(200, 240, 255, 80);

        // Cupola Layer 1 (Wide)
        // Top at z = 0.05s, Depth = 0.15s (Bottom at -0.10s, meets Soil)
        const pCup1 = getPos(size * 0.05);
        Draw3D.drawPrism(pCup1.x, pCup1.y, size * 0.42, 16, size * 0.15, domeColor, obj.angle, sunAngle);
        Draw3D.drawRing3D(pCup1.x, pCup1.y, size * 0.42, size * 0.41, 16, size * 0.01, domeRibColor, obj.angle, sunAngle);

        // Cupola Layer 2 (Mid)
        // Top at z = 0.15s, Depth = 0.10s (Bottom at 0.05s)
        const pCup2 = getPos(size * 0.15);
        Draw3D.drawPrism(pCup2.x, pCup2.y, size * 0.35, 12, size * 0.10, domeColor, obj.angle, sunAngle);
        Draw3D.drawRing3D(pCup2.x, pCup2.y, size * 0.35, size * 0.34, 12, size * 0.01, domeRibColor, obj.angle, sunAngle);

        // Cupola Layer 3 (Top)
        // Top at z = 0.22s, Depth = 0.07s (Bottom at 0.15s)
        const pCup3 = getPos(size * 0.22);
        Draw3D.drawPrism(pCup3.x, pCup3.y, size * 0.2, 8, size * 0.07, domeColor, obj.angle, sunAngle);

        // 4. External Details
        // Rotating ring around the base (at z = -0.05 approx)
        const ringPhase = (anim ? anim.gardenShadeAngle : 0) + obj.bobPhase * 0.001;
        const pRotRing = getPos(-size * 0.05);
        push();
        // We need to rotate the ring around the center pRotRing
        translate(pRotRing.x, pRotRing.y);
        rotate(ringPhase);
        // Draw ring at 0,0 (relative)
        // Note: DrawRing3D draws at x,y with angle.
        // If we rotate the context, we rotate the whole drawing.
        // But we want the ring to spin around the station axis.
        // Since the station is top-down, spinning is just rotating the polygon.
        // But Draw3D takes `angle` to rotate the depth vector.
        // If we rotate the context, we rotate the depth vector too!
        // We want the depth vector to stay aligned with the station (obj.angle).
        // So we shouldn't rotate the context if we want the 3D extrusion to look consistent.
        // Instead, we should pass `obj.angle + ringPhase` to Draw3D?
        // No, `angle` in Draw3D rotates the extrusion direction.
        // If we change `angle`, the ring will extrude in a different direction than the station.
        // That would look broken.
        // We want the shape to rotate, but the extrusion to stay fixed.
        // Draw3D doesn't support rotating the shape independently of the extrusion easily.
        // `drawRing3D` draws vertices based on `i * angleStep`.
        // We can just add an offset to the vertex angle calculation?
        // Draw3D doesn't expose that.
        // Workaround: Rotate context, but counter-rotate the `angle` param?
        // If we rotate context by `R`, and pass `angle - R`, then `depthVector` direction:
        // `getDepthVector` uses `angle`.
        // `dv` will be calculated based on `angle - R`.
        // Then `dv` is drawn in rotated context.
        // Rotated `dv` = `dv` rotated by `R`.
        // `dv(angle - R)` rotated by `R` = `dv(angle)`.
        // Yes! That works.

        Draw3D.drawRing3D(0, 0, size * 0.65, size * 0.55, 16, size * 0.02, color(100, 120, 140), obj.angle - ringPhase, sunAngle);
        pop();

        // Pollinators
        const pollPhase = (anim ? anim.pollinatorPhase : 0) + obj.bobPhase * 0.002;
        for (let p = 0; p < 5; p++) {
            const pa = pollPhase + p * (TWO_PI / 5);
            const pr = size * 0.5;
            // Orbiting around the "Garden" level (z = 0)
            const pCenter = getPos(0);
            const px = pCenter.x + Math.cos(pa) * pr;
            const py = pCenter.y + Math.sin(pa) * pr;
            fill(255, 255, 100);
            noStroke();
            ellipse(px, py, 3, 3);
        }
    },

    hydroponicsBay: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Helper to project "height" (z) along the object's rotation axis
        const sin = Math.sin(obj.angle || 0);
        const cos = Math.cos(obj.angle || 0);
        function getPos(z) {
            return {
                x: -z * sin,
                y: bob - z * cos
            };
        }

        // 1. Base Platform (Bottom)
        // Z = -0.2
        const pBase = getPos(-size * 0.2);
        Draw3D.drawBox3D(pBase.x, pBase.y, size * 0.8, size * 0.8, size * 0.1, color(50, 60, 55), obj.angle, sunAngle);

        // 2. Central Reservoir (Embedded in base)
        Draw3D.drawBox3D(pBase.x, pBase.y, size * 0.3, size * 0.3, size * 0.12, color(40, 80, 100), obj.angle, sunAngle);

        // 3. Grow Trays (Stacked shelves)
        const rows = 3;
        const trayW = size * 0.6;
        const startZ = -size * 0.08;
        const gapZ = size * 0.12;

        for (let r = 0; r < rows; r++) {
            const z = startZ + r * gapZ;
            const pTray = getPos(z);

            // Tray body
            Draw3D.drawBox3D(pTray.x, pTray.y, trayW, trayW, size * 0.05, color(40, 60, 50), obj.angle, sunAngle);

            // Plants (grid on tray)
            // Draw slightly above tray surface
            const pPlants = getPos(z + size * 0.03);

            for (let px = -1; px <= 1; px++) {
                for (let py = -1; py <= 1; py++) {
                    // Calculate local offsets for the grid
                    const offX = px * (trayW * 0.25);
                    const offY = py * (trayW * 0.25);

                    const sway = Math.sin((anim ? anim.hydroponicCycle : obj.bobPhase) * 0.9 + px + py) * 2;

                    // Draw plant box at the offset position
                    // Note: context is rotated, so (offX, offY) aligns with tray
                    Draw3D.drawBox3D(pTray.x + offX, pTray.y + offY, size * 0.12, size * 0.12, size * 0.08 + sway, color(80, 200, 120), obj.angle, sunAngle);
                }
            }
        }

        // 4. Overhead LED Lights (Top)
        const pLights = getPos(size * 0.28);
        // Frame
        Draw3D.drawBox3D(pLights.x, pLights.y, size * 0.7, size * 0.7, size * 0.04, color(110, 120, 110), obj.angle, sunAngle);
        // Light Emitters
        const lightPhase = (anim ? anim.lightPhase : obj.bobPhase * 0.5);
        const intensity = 0.6 + 0.4 * Math.sin(lightPhase);
        Draw3D.drawBox3D(pLights.x, pLights.y, size * 0.5, size * 0.5, size * 0.02, color(255, 100, 220, 200 * intensity), obj.angle, sunAngle);

        // 5. Translucent Dome (Enclosing everything)
        // Top at Z=0.32, Depth=0.55 (reaching down to -0.23)
        const pDomeTop = getPos(size * 0.32);
        const domeColor = color(200, 235, 250, 60);
        Draw3D.drawPrism(pDomeTop.x, pDomeTop.y, size * 0.55, 8, size * 0.55, domeColor, obj.angle, sunAngle);

        // Dome Ribs
        Draw3D.drawRing3D(pDomeTop.x, pDomeTop.y, size * 0.55, size * 0.53, 8, size * 0.02, color(200, 235, 250, 100), obj.angle, sunAngle);

        // 6. Maintenance Arm (External, attached to base)
        push();
        translate(pBase.x, pBase.y);
        rotate(Math.sin(anim ? anim.armPhase : obj.bobPhase * 0.002) * 0.45);
        stroke(140, 150, 140); strokeWeight(2);
        line(0, 0, size * 0.65, 0);
        noStroke();
        fill(160, 160, 170);
        ellipse(size * 0.65, 0, 8, 8);
        pop();
    },

    decoyBuoy: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // small, cheap decoy that pulses and emits short-lived flares
        // Main body
        Draw3D.drawPrism(0, bob, size * 0.25, 6, size * 0.4, color(140, 160, 220), obj.angle, sunAngle);

        const dp = (Math.sin(anim ? anim.decoyPulse : obj.bobPhase * 0.8) + 1) * 0.5;

        // Pulse glow
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
        const antAng = Math.sin(obj.bobPhase * 0.006) * 0.3;
        rotate(antAng);
        Draw3D.drawBox3D(0, bob - size * 0.1, size * 0.02, size * 0.02, size * 0.2, color(120, 130, 140), obj.angle + (antAng), sunAngle);
        Draw3D.drawBox3D(0, bob - size * 0.2, size * 0.04, size * 0.04, size * 0.04, color(160, 170, 180), obj.angle + (antAng), sunAngle);
        pop();
    },

    miningPlatform: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Initialize mining state with all needed properties
        if (!obj._miningState) {
            obj._miningState = {
                armPhase: Math.random() * TWO_PI,
                dronePhase: Math.random() * TWO_PI,
                dust: [],
                particles: [],
                drones: [],
                laserPhase: Math.random() * TWO_PI
            };
            // Initialize service drones
            for (let d = 0; d < 3; d++) {
                obj._miningState.drones.push({
                    ang: Math.random() * TWO_PI,
                    dist: size * 0.55 + Math.random() * size * 0.1,
                    phase: Math.random() * TWO_PI,
                    speed: 0.002 + Math.random() * 0.002
                });
            }
        }

        // Wide industrial base platform with structural supports
        Draw3D.drawRing3D(0, bob + size * 0.12, size * 0.62, size * 0.22, 24, size * 0.04, color(65, 65, 75), obj.angle, sunAngle);
        // Structural cross-beams
        for (let i = 0; i < 4; i++) {
            const ang = i * (PI / 2);
            const x1 = Math.cos(ang) * size * 0.15;
            const y1 = Math.sin(ang) * size * 0.15 + bob + size * 0.12;
            const x2 = Math.cos(ang) * size * 0.55;
            const y2 = Math.sin(ang) * size * 0.55 + bob + size * 0.12;
            stroke(50, 50, 60, 120);
            strokeWeight(2);
            line(x1, y1, x2, y2);
        }
        noStroke();

        // Top deck with industrial plating
        Draw3D.drawBox3D(0, bob - size * 0.02, size * 0.75, size * 0.52, size * 0.05, color(125, 125, 135), obj.angle, sunAngle);

        // Hazard stripes on deck
        for (let i = -2; i <= 2; i++) {
            const sx = i * (size * 0.14);
            fill(220, 60, 40, 190);
            rect(sx - size * 0.07, bob - size * 0.04, size * 0.14, size * 0.40);
        }

        // Central control tower with more detail
        Draw3D.drawBox3D(0, bob - size * 0.20, size * 0.22, size * 0.26, size * 0.36, color(115, 115, 125), obj.angle, sunAngle);
        // Control tower windows with animated lights
        const windowFlicker = 0.7 + 0.3 * Math.sin(obj.bobPhase * 0.15);
        for (let k = -1; k <= 1; k++) {
            fill(180, 220, 240, 200 * windowFlicker);
            rect(-size * 0.08, bob - size * 0.28 + k * (size * 0.09), size * 0.16, size * 0.05);
        }
        // Communication antenna on top
        Draw3D.drawPrism(0, bob - size * 0.38, size * 0.02, 6, size * 0.08, color(140, 140, 150), obj.angle, sunAngle);

        // Articulated mining arms with hydraulics and rotating drill heads
        obj._miningState.armPhase += 0.016;

        for (let a = 0; a < 4; a++) {
            const baseAng = a * (TWO_PI / 4);
            const armWobble = Math.sin(obj._miningState.armPhase + a * 0.7) * 0.12;
            const ang = baseAng + armWobble;

            push();
            translate(0, bob - size * 0.02);
            rotate(ang);

            // Main arm segment with hydraulics
            const armLen = size * 0.52;
            const armSegment = [
                { x: size * 0.08, y: -size * 0.04 },
                { x: armLen * 0.95, y: -size * 0.16 },
                { x: armLen, y: size * 0.16 }
            ];
            Draw3D.drawExtrudedShape(armSegment, size * 0.05, color(105, 105, 115), obj.angle, sunAngle, true);

            // Hydraulic piston with oscillation
            const piston = Math.sin(obj._miningState.armPhase * 1.8 + a) * (size * 0.025);
            Draw3D.drawBox3D(size * 0.08, piston * 0.6, size * 0.07, size * 0.08, size * 0.05, color(95, 95, 100), obj.angle, sunAngle);
            // Piston rod
            stroke(80, 80, 85);
            strokeWeight(2);
            line(size * 0.08, 0, size * 0.08, piston * 0.6);
            noStroke();

            // Drill housing assembly
            Draw3D.drawBox3D(armLen * 0.98, 0, size * 0.12, size * 0.12, size * 0.05, color(85, 85, 95), obj.angle, sunAngle);

            // Rotating drill head with multiple layers
            push();
            translate(armLen * 1.04, 0);
            const spin = (anim && typeof anim.drillSpin === 'number' ? anim.drillSpin : 0) + obj._miningState.armPhase * 8 + a;
            rotate(spin);

            // Drill core with bits
            Draw3D.drawPrism(0, 0, size * 0.05, 8, size * 0.09, color(155, 135, 105), obj.angle, sunAngle);
            // Drill cutting edges
            for (let d = 0; d < 4; d++) {
                push();
                rotate(d * (PI / 2));
                Draw3D.drawBox3D(size * 0.09, 0, size * 0.03, size * 0.08, size * 0.02, color(180, 160, 120), obj.angle, sunAngle);
                pop();
            }
            // Drill tip glow
            fill(230, 200, 150, 200);
            ellipse(size * 0.10, 0, size * 0.08, size * 0.04);
            pop();

            // Enhanced sparks and ore spray at drill head
            const sprayPhase = obj._miningState.armPhase * 1.2 + a;
            for (let sp = 0; sp < 5; sp++) {
                const r = lerp(size * 0.08, size * 0.18, sp / 5);
                const sa = sprayPhase + sp * 1.5;
                const sx = Math.cos(sa) * (armLen * 1.08);
                const sy = Math.sin(sa) * r * 0.3 + (piston * 0.5);
                const brightness = 210 - sp * 25;
                fill(brightness, brightness * 0.8, brightness * 0.5, 180 - sp * 30);
                ellipse(sx, sy + bob - size * 0.02, 5 + sp * 2.5, 3 + sp * 1.5);
            }

            pop();
        }

        // Extraction laser system (sweeping beam)
        obj._miningState.laserPhase += 0.004;
        const laserAngle = Math.sin(obj._miningState.laserPhase) * 0.35;
        const laserPulse = 0.6 + 0.4 * Math.sin(obj._miningState.laserPhase * 3);

        push();
        rotate(laserAngle);
        // Laser emitter
        Draw3D.drawBox3D(-size * 0.08, -size * 0.08 + bob, size * 0.06, size * 0.06, size * 0.04, color(180, 200, 220), obj.angle, sunAngle);

        // Laser beam
        stroke(140, 200, 255, 160 * laserPulse);
        strokeWeight(2.5);
        line(-size * 0.08, -size * 0.08 + bob, -size * 0.65, -size * 0.58 + bob);
        strokeWeight(1.5);
        stroke(200, 230, 255, 100 * laserPulse);
        line(-size * 0.08, -size * 0.08 + bob, -size * 0.65, -size * 0.58 + bob);
        noStroke();

        // Beam cone glow
        fill(120, 200, 255, 40 * laserPulse);
        beginShape();
        vertex(-size * 0.08, -size * 0.08 + bob);
        vertex(-size * 0.65, -size * 0.58 + bob - 10);
        vertex(-size * 0.60, -size * 0.58 + bob + 10);
        endShape(CLOSE);

        // Beam impact point
        fill(200, 230, 255, 220 * laserPulse);
        ellipse(-size * 0.65, -size * 0.58 + bob, 8 * laserPulse, 5 * laserPulse);
        pop();

        // Enhanced conveyor belt system with ore chunks
        const beltY = size * 0.32 + bob;
        Draw3D.drawBox3D(0, beltY, size * 0.70, size * 0.32, size * 0.04, color(45, 45, 45), obj.angle, sunAngle);

        // Conveyor rollers
        for (let r = -3; r <= 3; r++) {
            const rx = r * (size * 0.12);
            Draw3D.drawPrism(rx, beltY + size * 0.14, size * 0.02, 8, size * 0.04, color(30, 30, 30), obj.angle, sunAngle);
        }

        // Animated ore chunks on belt
        obj._miningState.dronePhase += 0.015;
        const conveyorPhase = (anim && typeof anim.conveyorPhase === 'number' ? anim.conveyorPhase : 0) + obj._miningState.dronePhase * 2;
        for (let o = 0; o < 6; o++) {
            const t = ((conveyorPhase * 0.01) + o * 0.16) % 1;
            const ox = lerp(-size * 0.34, size * 0.34, t);
            const oreType = o % 3;
            const oreColor = oreType === 0 ? color(180, 120, 70) :
                oreType === 1 ? color(160, 100, 50) :
                    color(200, 150, 90);
            Draw3D.drawBox3D(ox, beltY - size * 0.04, size * 0.07, size * 0.05, size * 0.05, oreColor, obj.angle, sunAngle);
        }

        // Belt motion lines
        stroke(35, 35, 35);
        strokeWeight(1);
        for (let i = -5; i <= 5; i++) {
            const lx = i * (size * 0.10) + ((conveyorPhase * 0.02) % (size * 0.10));
            line(lx, beltY - size * 0.16, lx, beltY + size * 0.16);
        }
        noStroke();

        // Ore processing chute with falling particles
        Draw3D.drawBox3D(-size * 0.35, beltY - size * 0.16, size * 0.08, size * 0.12, size * 0.04, color(70, 70, 80), obj.angle, sunAngle);

        // Processing dust
        if (Math.random() < 0.12) {
            obj._miningState.dust.push({
                x: -size * 0.35 + (Math.random() - 0.5) * size * 0.1,
                y: beltY - size * 0.10,
                life: 70 + Math.random() * 90
            });
        }
        for (let i = obj._miningState.dust.length - 1; i >= 0; i--) {
            const d = obj._miningState.dust[i];
            d.life -= 1;
            d.y -= 0.18;
            d.x += (Math.random() - 0.5) * 0.3;
            const alpha = map(d.life, 0, 140, 0, 160);
            fill(170, 150, 130, alpha);
            ellipse(d.x, d.y, 9, 5);
            if (d.life <= 0) obj._miningState.dust.splice(i, 1);
        }

        // Ore storage bins with fill indicators
        for (let s = -2; s <= 2; s++) {
            const sx = s * (size * 0.20);
            const sy = size * 0.48 + bob;

            // Bin structure
            Draw3D.drawBox3D(sx, sy, size * 0.16, size * 0.18, size * 0.16, color(90, 65, 55), obj.angle, sunAngle);

            // Ore pile inside
            const fillLevel = 0.6 + 0.2 * Math.sin(obj.bobPhase * 0.002 + s);
            fill(110, 80, 65);
            ellipse(sx, sy + size * 0.05, size * 0.12, size * 0.08 * fillLevel);

            // Bin lid/cover
            stroke(70, 50, 40, 140);
            strokeWeight(1.5);
            line(sx - size * 0.07, sy - size * 0.09, sx + size * 0.07, sy - size * 0.09);
            noStroke();
        }

        // Falling debris particles near processing area
        if (Math.random() < 0.08) {
            const px = (Math.random() - 0.5) * size * 0.9;
            obj._miningState.particles.push({
                x: px,
                y: size * 0.38 + bob - size * 0.04,
                vy: 0.7 + Math.random() * 1.4,
                life: 45 + Math.random() * 70
            });
        }
        for (let i = obj._miningState.particles.length - 1; i >= 0; i--) {
            const p = obj._miningState.particles[i];
            p.vy += 0.08;
            p.y += p.vy;
            p.life -= 1;
            const alpha = 180 * (p.life / 115);
            fill(150, 120, 90, alpha);
            ellipse(p.x, p.y, 3.5 + Math.random() * 2.5, 2.5 + Math.random() * 2);
            if (p.life <= 0 || p.y > bob + size * 0.6) obj._miningState.particles.splice(i, 1);
        }

        // Orbiting service drones with maintenance arms
        for (let d = 0; d < obj._miningState.drones.length; d++) {
            const drone = obj._miningState.drones[d];
            drone.ang += drone.speed;
            const ddx = Math.cos(drone.ang) * drone.dist;
            const ddy = Math.sin(drone.ang) * (drone.dist * 0.40) + bob * 0.03;

            // Drone body
            Draw3D.drawBox3D(ddx, ddy, 10, 7, 7, color(215, 205, 175), obj.angle, sunAngle);

            // Drone lights
            const droneBlink = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + d * 2);
            fill(100, 255, 200, 255 * droneBlink);
            ellipse(ddx - 3, ddy, 2, 2);
            fill(255, 200, 100, 255 * (1 - droneBlink));
            ellipse(ddx + 3, ddy, 2, 2);

            // Drone tether/connection
            stroke(170, 150, 130, 180);
            strokeWeight(0.8);
            line(ddx, ddy, ddx - Math.cos(drone.ang) * 10, ddy - Math.sin(drone.ang) * 10);

            // Service arm
            const armWave = Math.sin(obj.bobPhase * 0.01 + d) * 6;
            line(ddx, ddy, ddx + armWave, ddy + 8);
            noStroke();

            // Tool at end of arm
            fill(180, 180, 190);
            ellipse(ddx + armWave, ddy + 8, 3, 3);
        }

        // Warning and status lights with varied patterns
        const warn1 = 0.6 + 0.4 * Math.sin(obj.bobPhase * 0.007);
        fill(255, 130, 110, 230 * warn1);
        ellipse(-size * 0.16, -size * 0.32 + bob, 9, 9);
        ellipse(size * 0.16, -size * 0.32 + bob, 9, 9);

        const warn2 = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.008 + 0.5);
        fill(255, 200, 80, 220 * warn2);
        ellipse(-size * 0.32, -size * 0.16 + bob, 6, 6);
        ellipse(size * 0.32, -size * 0.16 + bob, 6, 6);

        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.50);
        fill(0, 255, 120, 255 * statusFlash);
        ellipse(-size * 0.30, bob + size * 0.06, 5, 5);
        fill(0, 220, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.50 + 1.5)));
        ellipse(size * 0.30, bob + size * 0.06, 5, 5);

        // Activity indicator on tower
        const activityPulse = 0.7 + 0.3 * Math.sin(obj.bobPhase * 0.12);
        fill(140, 200, 255, 200 * activityPulse);
        ellipse(0, bob - size * 0.38, 6 * activityPulse, 4 * activityPulse);
    },

    ancientRelic: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        // Redesigned obelisk-style relic with stacked prisms, floating ring and shards
        const pulse = (Math.sin(anim ? anim.relicPulse : obj.bobPhase * 0.001) + 1) * 0.5;

        // Pedestal
        Draw3D.drawPrism(0, bob + size * 0.28, size * 0.36, 12, size * 0.08, color(32, 36, 40), obj.angle, sunAngle);

        // Stacked obelisk segments (tapered)
        const layers = 4;
        for (let L = 0; L < layers; L++) {
            const t = L / layers;
            const r = lerp(size * 0.22, size * 0.08, t);
            const h = lerp(size * 0.22, size * 0.18, t);
            const yOff = bob + (L - (layers / 2 - 0.5)) * (size * 0.12);
            Draw3D.drawPrism(0, yOff - size * 0.06, r, 6, h, color(48, 56, 66), obj.angle, sunAngle);
        }

        // Floating ring encircling the mid-section
        const ringY = bob - size * 0.02 + Math.sin(obj.bobPhase * 0.0015) * size * 0.02;
        Draw3D.drawRing3D(0, ringY, size * 0.42, size * 0.06, 24, size * 0.06, color(60, 180, 200, 120), obj.angle, sunAngle);

        // Levitation shards (extruded shapes, placed in depth around the relic)
        for (let s = 0; s < 6; s++) {
            const a = s * TWO_PI / 6 + obj.bobPhase * 0.002 * (s % 2 ? 1 : -1);
            const distR = size * (0.28 + 0.06 * (s % 3));
            const sx = Math.cos(a) * distR;
            const sy = Math.sin(a) * distR * 0.28 + bob - size * 0.04 + Math.sin(obj.bobPhase * 0.003 + s) * size * 0.02;
            // small shard prism
            Draw3D.drawPrism(sx, sy, size * 0.05, 5, size * 0.12, color(90, 110, 130), obj.angle + (0.2 * s), sunAngle);
        }

        // Glowing rune circuitry projected on surface
        const glow = 0.6 + 0.5 * pulse;
        stroke(60, 200, 220, 160 * glow); strokeWeight(1.4);
        line(-size * 0.14, -size * 0.18 + bob, size * 0.06, -size * 0.06 + bob);
        line(-size * 0.06, size * 0.06 + bob, size * 0.16, size * 0.24 + bob);
        noStroke();

        // Emissive aura
        noFill(); stroke(60, 200, 220, 80 * glow); strokeWeight(2 * glow);
        ellipse(0, bob, size * (0.9 + glow * 0.3), size * (0.6 + glow * 0.2));
        noStroke();

        // Energy nodules
        const nodeFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.55);
        fill(120, 220, 255, 220 * nodeFlash);
        ellipse(-size * 0.12, -size * 0.18 + bob, 5, 5);
        fill(255, 140, 220, 200 * (0.6 + 0.4 * Math.sin(obj.bobPhase * 0.55 + 1)));
        ellipse(size * 0.14, size * 0.16 + bob, 5, 5);
    },

    alienArtifact: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const phase = (typeof anim.artifactPhase === 'number') ? anim.artifactPhase : obj.bobPhase;

        // Central Crystal Cluster
        const crystalColor = color(100, 40, 140);
        const glowColor = color(180, 100, 255);

        // Main crystal (rotating prism)
        Draw3D.drawPrism(0, bob, size * 0.15, 6, size * 0.6, crystalColor, obj.angle + (phase * 0.2), sunAngle);

        // Side crystals (tilted)
        for (let i = 0; i < 3; i++) {
            const ang = i * (TWO_PI / 3) + phase * 0.1;
            const dist = size * 0.15;
            const cx = Math.cos(ang) * dist;
            const cy = Math.sin(ang) * dist + bob;

            // We can't easily tilt prisms with Draw3D, so we just place them around
            Draw3D.drawPrism(cx, cy, size * 0.08, 5, size * 0.4, color(80, 30, 120), obj.angle + (ang), sunAngle);
        }

        // Floating Rings (segmented)
        const ringCount = 2;
        for (let r = 0; r < ringCount; r++) {
            const rRad = size * (0.4 + r * 0.25);
            const rSpeed = (r % 2 === 0 ? 1 : -1) * 0.005;
            const rAng = phase * 50 * rSpeed; // phase is already incrementing

            const segs = 6;
            for (let s = 0; s < segs; s++) {
                const sa = rAng + s * (TWO_PI / segs);
                const sx = Math.cos(sa) * rRad;
                const sy = Math.sin(sa) * (rRad * 0.35) + bob; // Flattened perspective

                Draw3D.drawBox3D(sx, sy, size * 0.1, size * 0.04, size * 0.04, color(140, 100, 180), obj.angle + (sa), sunAngle);
            }
        }

        // Energy Core Pulse
        const pulse = 0.6 + 0.4 * Math.sin(phase * 3);
        fill(red(glowColor), green(glowColor), blue(glowColor), 150 * pulse);
        ellipse(0, bob, size * 0.3, size * 0.3);

        // Lightning arcs
        if (Math.random() < 0.1) {
            stroke(200, 150, 255, 200);
            strokeWeight(2);
            const a1 = Math.random() * TWO_PI;
            const r1 = size * 0.2;
            const a2 = Math.random() * TWO_PI;
            const r2 = size * 0.6;
            line(Math.cos(a1) * r1, Math.sin(a1) * r1 + bob, Math.cos(a2) * r2, Math.sin(a2) * r2 + bob);
            noStroke();
        }
    },
    signalFlare: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const phase = (anim ? anim.flarePhase : obj.bobPhase * 0.008);

        // Base pulse and color cycling
        const pulse = 0.6 + 0.45 * Math.sin(phase * 1.4);
        const hueA = 0.5 + 0.5 * Math.sin(phase * 0.9);
        const hueB = 0.5 + 0.5 * Math.sin(phase * 1.3 + 2.1);
        // Build two RGB blends without colorMode changes
        const col1 = [220, Math.floor(120 + 110 * hueA), Math.floor(200 + 40 * hueB)];
        const col2 = [Math.floor(180 + 60 * hueB), Math.floor(200 * hueA), 120];

        // Central core as a cylindrical prism for a more volumetric flare
        Draw3D.drawPrism(0, bob, size * 0.18, 16, size * 0.6, color(col1[0], col1[1], col1[2], Math.floor(220 * pulse)), obj.angle, sunAngle);

        // Layered colorful halos (soft additive feel)
        for (let i = 0; i < 4; i++) {
            const t = i / 4;
            const s = size * (0.7 + t * 0.8) * (0.85 + pulse * 0.15);
            const alpha = Math.floor(42 * (1 - t) * (1 + 0.6 * pulse));
            const r = Math.floor(lerp(col1[0], col2[0], t));
            const g = Math.floor(lerp(col1[1], col2[1], t));
            const b = Math.floor(lerp(col1[2], col2[2], t));
            fill(r, g, b, alpha);
            ellipse(0, bob, s, s * 0.6);
        }

        // Chromatic shell: slight RGB offsets to simulate shimmering edges
        push();
        translate(Math.sin(phase * 0.9) * 1.5, Math.cos(phase * 1.1) * 1.2);
        fill(255, 120, 160, Math.floor(48 * pulse));
        ellipse(0, bob, size * 0.9 * (0.95 + pulse * 0.08), size * 0.58 * (0.95 + pulse * 0.08));
        translate(-Math.sin(phase * 0.9) * 3.0, -Math.cos(phase * 1.1) * 2.4);
        fill(120, 200, 255, Math.floor(32 * pulse));
        ellipse(0, bob, size * 0.92 * (0.95 + pulse * 0.06), size * 0.60 * (0.95 + pulse * 0.06));
        pop();

        // Rotating streaks / petals for dynamic shape
        push();
        const streaks = 6;
        for (let s = 0; s < streaks; s++) {
            const ang = (phase * 0.8) + s * (TWO_PI / streaks);
            const len = size * (0.9 + 0.2 * Math.sin(phase + s));
            const w = Math.max(2, size * 0.06 * (0.6 + 0.4 * Math.cos(phase * 1.2 + s)));
            push(); rotate(ang);
            noStroke();
            fill(Math.floor(lerp(col1[0], col2[0], s / streaks)), Math.floor(lerp(col1[1], col2[1], s / streaks)), Math.floor(lerp(col1[2], col2[2], s / streaks)), 60);
            beginShape();
            vertex(0, bob - w * 0.5);
            vertex(len * 0.28, bob - w * 0.5);
            vertex(len, bob);
            vertex(len * 0.28, bob + w * 0.5);
            vertex(0, bob + w * 0.5);
            endShape(CLOSE);
            pop();
        }
        pop();

        // Orbiting colourful motes (initialize if needed)
        if (!obj._flares) {
            obj._flares = [];
            const moteCount = 5 + Math.floor(size / 50);
            for (let i = 0; i < moteCount; i++) {
                obj._flares.push({ ang: Math.random() * TWO_PI, dist: size * (0.45 + Math.random() * 0.6), sz: 2 + Math.random() * 4, colIdx: i % 3 });
            }
        }
        for (let i = 0; i < obj._flares.length; i++) {
            const m = obj._flares[i];
            m.ang += 0.006 + 0.002 * i;
            const mx = Math.cos(m.ang) * m.dist * 0.6;
            const my = Math.sin(m.ang) * m.dist * 0.28 + bob * 0.15;
            // pick colour by index
            let mr = 220, mg = 200, mb = 160;
            if (m.colIdx === 1) { mr = 180; mg = 230; mb = 255; }
            if (m.colIdx === 2) { mr = 255; mg = 150; mb = 200; }

            Draw3D.drawBox3D(mx, my, m.sz, m.sz, m.sz, color(mr, mg, mb, 120 + Math.round(80 * Math.sin(phase * 2 + i))), obj.angle, sunAngle);
        }

        // Small auxiliary beacons for readability
        const auxFlash = 0.6 + 0.4 * Math.sin(obj.bobPhase * 0.9 + phase);
        fill(255, 180, 120, 220 * auxFlash);
        ellipse(-size * 0.15, bob + size * 0.12, 3.5, 3.5);
        fill(120, 220, 255, 200 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.9 + 1)));
        ellipse(size * 0.15, bob + size * 0.12, 3.5, 3.5);

        // small support pod/strut for silhouette
        push();
        rotate(Math.sin(obj.bobPhase * 0.005) * 0.12);
        stroke(200, 180, 140, 120); strokeWeight(0.8);
        line(0, bob + size * 0.15, size * 0.22, bob + size * 0.26);
        noStroke();
        fill(220, 200, 180);
        ellipse(size * 0.22, bob + size * 0.26, 4, 4);
        pop();
    },

    asteroidMiner: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Base skid
        Draw3D.drawBox3D(0, bob + size * 0.20, size * 0.88, size * 0.38, size * 0.1, color(50, 50, 58), obj.angle, sunAngle);

        // Main hull / tower
        Draw3D.drawBox3D(0, bob - size * 0.06, size * 0.26, size * 0.52, size * 0.26, color(120, 118, 120), obj.angle, sunAngle);

        // Armored plating panels
        Draw3D.drawBox3D(0, bob - size * 0.06, size * 0.28, size * 0.08, size * 0.28, color(100, 98, 100), obj.angle, sunAngle);

        // Grated intake vents
        Draw3D.drawBox3D(0, bob + size * 0.12, size * 0.18, size * 0.06, size * 0.18, color(60, 60, 66), obj.angle, sunAngle);

        // Drill array: three articulated arms with rotating drill heads
        for (let a = 0; a < 3; a++) {
            const side = a - 1; // -1,0,1
            const baseAng = -PI / 3 + a * (PI / 3);
            push();
            // subtle arm sweep motion
            rotate(baseAng + Math.sin(obj.bobPhase * 0.0015 + a) * 0.03);

            // Arm shaft
            const x1 = size * 0.14, y1 = size * 0.02 + bob;
            const x2 = size * 0.54, y2 = size * 0.18 + bob;
            const mx = (x1 + x2) / 2;
            const my = (y1 + y2) / 2;
            const len = dist(x1, y1, x2, y2);
            const angle = atan2(y2 - y1, x2 - x1);

            push();
            translate(mx, my);
            rotate(angle);
            Draw3D.drawBox3D(0, 0, len, size * 0.05, size * 0.05, color(120, 120, 120), obj.angle, sunAngle);
            pop();

            // Arm joint
            Draw3D.drawBox3D(size * 0.54, size * 0.18 + bob, size * 0.09, size * 0.07, size * 0.06, color(95, 95, 95), obj.angle, sunAngle);

            // Drill head assembly
            push(); translate(size * 0.54, size * 0.18 + bob);
            // spinning mandrel
            const spin = (anim ? anim.miningSpin : 0) + obj.bobPhase * 0.003 + a * 0.6;
            rotate(spin);
            Draw3D.drawBox3D(0, 0, size * 0.14, size * 0.05, size * 0.04, color(120, 110, 90), obj.angle, sunAngle);

            // drill bit layers (concentric triangles)
            for (let d = 0; d < 3; d++) {
                push(); rotate(d * 0.8);
                Draw3D.drawPrism(size * (0.12 + d * 0.02), 0, size * 0.04, 3, size * 0.08, color(160 - d * 20, 140 - d * 18, 110 - d * 12), obj.angle + (-Math.PI / 2), sunAngle);
                pop();
            }
            pop();
            pop();
        }

        // Extraction laser (animated sweeping beam) — slight glow and hit spot
        const beamPhase = (anim && typeof anim.miningSpin === 'number') ? anim.miningSpin : obj.bobPhase * 0.002;
        const beamAngle = Math.sin(beamPhase * 0.8) * 0.25;
        push();
        rotate(beamAngle);
        // beam shaft emitter
        stroke(200, 220, 255, 120); strokeWeight(2);
        line(-size * 0.06, -size * 0.02 + bob, -size * 0.6, -size * 0.5 + bob);
        noStroke();
        // beam core glow (faint)
        fill(100, 180, 255, 28);
        beginShape();
        vertex(-size * 0.06, -size * 0.02 + bob);
        vertex(-size * 0.6, -size * 0.5 + bob - 8);
        vertex(-size * 0.58, -size * 0.5 + bob + 8);
        endShape(CLOSE);
        // beam contact spark
        fill(180, 220, 255, 180);
        ellipse(-size * 0.6, -size * 0.5 + bob, 6, 4);
        pop();

        // Ore chute / conveyor with moving ore pieces
        push();
        const beltY = size * 0.36 + bob;

        // Conveyor belt body
        Draw3D.drawBox3D(0, beltY, size * 0.66, size * 0.12, size * 0.1, color(40), obj.angle, sunAngle);

        // belt segments (visual motion)
        stroke(28, 28, 32); strokeWeight(1);
        const beltPhase = (anim && typeof anim.miningSpin === 'number') ? anim.miningSpin * 6 : obj.bobPhase * 0.015;
        for (let i = -3; i <= 3; i++) {
            const segX = i * (size * 0.12) + (Math.sin(beltPhase + i) * size * 0.02);
            line(segX, beltY - size * 0.06, segX, beltY + size * 0.06);
        }
        noStroke();
        // animated ore chunks traveling along belt
        for (let o = 0; o < 4; o++) {
            const t = ((obj.bobPhase * 0.01) + o * 0.25) % 1;
            const ox = lerp(-size * 0.32, size * 0.32, t);
            const oreHue = (o % 2 === 0) ? color(200, 140, 80) : color(180, 90, 40);

            // Ore chunks as small boxes
            Draw3D.drawBox3D(ox, beltY - size * 0.02, size * 0.06, size * 0.04, size * 0.04, oreHue, obj.angle, sunAngle);
        }
        pop();

        // hanging ore sacks and storage bins
        for (let s = -2; s <= 2; s++) {
            const sx = s * (size * 0.22);
            const sy = size * 0.46 + bob;

            // Storage bins
            Draw3D.drawBox3D(sx, sy, size * 0.14, size * 0.16, size * 0.14, color(85, 60, 50), obj.angle, sunAngle);

            stroke(60, 40, 30, 120); strokeWeight(1);
            line(sx - 6, sy - 8, sx + 6, sy - 8);
            noStroke();
        }

        // Warning & status lights — pulsing and scanning
        const warn = 0.6 + 0.4 * Math.sin(obj.bobPhase * 0.005);
        fill(255, 100, 80, 220 * warn);
        ellipse(-size * 0.10, -size * 0.30 + bob, 6, 6);
        ellipse(size * 0.10, -size * 0.30 + bob, 6, 6);

        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35);
        fill(0, 200, 140, 255 * statusFlash);
        ellipse(-size * 0.28, bob + size * 0.06, 3, 3);
        fill(0, 160, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35 + 1)));
        ellipse(size * 0.28, bob + size * 0.06, 3, 3);

        // small service drone that orbits the miner and has a moving arm
        if (!obj._minerDrone) obj._minerDrone = { ang: Math.random() * TWO_PI, dist: size * 0.48, phase: Math.random() * TWO_PI };
        obj._minerDrone.ang += 0.0045;
        const ddx = Math.cos(obj._minerDrone.ang) * obj._minerDrone.dist;
        const ddy = Math.sin(obj._minerDrone.ang) * (obj._minerDrone.dist * 0.36) + bob * 0.02;

        // Drone body
        Draw3D.drawBox3D(ddx, ddy, 8, 6, 6, color(210, 200, 170), obj.angle, sunAngle);

        // drone tether/arm
        stroke(160, 140, 120, 160); strokeWeight(0.6);
        line(ddx, ddy, ddx - Math.cos(obj._minerDrone.ang) * 8, ddy - Math.sin(obj._minerDrone.ang) * 8);
        noStroke();
        // drone nav light
        fill(255, 120, 80, 220);
        ellipse(ddx - 4, ddy - 2, 3, 3);
    },

    energyCollector: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Base dish
        Draw3D.drawBox3D(0, bob, size * 0.94, size * 0.36, size * 0.1, color(24, 32, 48), obj.angle, sunAngle);

        // Rotating coil layers
        const spin = (anim && typeof anim.collectorSpin === 'number') ? anim.collectorSpin : (obj.bobPhase * 0.0006);
        for (let layer = 0; layer < 2; layer++) {
            const layerCount = 6 + layer * 2;
            const layerRadius = size * (0.30 + layer * 0.06);
            const alphaBase = 120 - layer * 30;
            for (let i = 0; i < layerCount; i++) {
                const a = i * (TWO_PI / layerCount) + spin * (1 + layer * 0.4) + obj.bobPhase * (0.0004 + layer * 0.0002);
                const rx = Math.cos(a) * layerRadius;
                const ry = Math.sin(a) * (size * 0.12) + bob;

                // Coil as a small box
                Draw3D.drawBox3D(rx, ry, size * (0.10 - layer * 0.02), size * (0.06 - layer * 0.01), size * 0.05, color(90, 200, 240, alphaBase + 40 * Math.sin(obj.bobPhase * 0.01 + i)), obj.angle, sunAngle);
            }
        }

        // Central pulsing core
        const pulse = 0.65 + 0.35 * Math.sin(obj.bobPhase * 0.014);
        Draw3D.drawBox3D(0, bob - size * 0.02, size * 0.30 * (0.85 + pulse * 0.35), size * 0.18 * (0.85 + pulse * 0.35), size * 0.2, color(100, 230, 255, 200 * pulse), obj.angle, sunAngle);

        // Flashing indicator lights around the rim
        if (anim && typeof anim.lightPhase === 'number') {
            const lights = 8;
            for (let i = 0; i < lights; i++) {
                const a = i * (TWO_PI / lights) + obj.bobPhase * 0.0003;
                const lx = Math.cos(a) * size * 0.46;
                const ly = Math.sin(a) * (size * 0.14) + bob;
                const flash = 0.5 + 0.5 * Math.sin(anim.lightPhase + i * 0.7 + obj.bobPhase * 0.003);

                // LED as small box
                Draw3D.drawBox3D(lx, ly, 3 + flash * 2, 3 + flash * 1.2, 3, color(180, 255, 200, 180 * flash), obj.angle, sunAngle);
            }
        }

        // Small drifting particles
        for (let p = 0; p < 4; p++) {
            const angle = obj.bobPhase * 0.001 + p * 1.3;
            const pr = size * (0.12 + 0.06 * p);
            const px = Math.cos(angle * (0.7 + p * 0.3)) * pr * 0.9;
            const py = Math.sin(angle * (0.9 + p * 0.2)) * pr * 0.4 + bob * 0.25;

            // Particle as tiny box
            Draw3D.drawBox3D(px, py, 2 + p * 0.6, 2 + p * 0.3, 2, color(140, 220, 255, 30 + 40 * Math.sin(obj.bobPhase * 0.01 + p)), obj.angle, sunAngle);
        }
    },

    iceCrystal: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Main crystal cluster
        for (let s = 0; s < 5; s++) {
            const ang = s * (TWO_PI / 5) + obj.bobPhase * 0.002;
            const len = size * (0.35 + s * 0.08);

            const sx = Math.cos(ang) * size * 0.1;
            const sy = Math.sin(ang) * size * 0.05 + bob;

            // Draw a prism for each shard
            Draw3D.drawPrism(sx, sy, len * 0.2, 4, len, color(200, 235, 255, 220), obj.angle, sunAngle);
        }

        // Tiny drifting shards
        for (let i = 0; i < 3; i++) {
            const sx = Math.cos(obj.bobPhase * 0.002 + i) * size * 0.4;
            const sy = Math.sin(obj.bobPhase * 0.003 + i) * size * 0.18 + bob * 0.08;

            // Tiny shard as a small prism
            Draw3D.drawPrism(sx, sy, 4, 3, 6, color(180, 220, 255, 120), obj.angle, sunAngle);
        }
    },

    nebulaFragment: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const phase = (anim && typeof anim.nebulaPhase === 'number') ? anim.nebulaPhase : obj.bobPhase * 0.008;
        const t = (Math.sin(phase) + 1) * 0.5;

        // Core layered glow
        const base = { r: 110, g: 70, b: 200 };
        const accent = { r: 210, g: 120, b: 240 };
        const cyan = { r: 100, g: 180, b: 220 };
        for (let i = 0; i < 4; i++) {
            const p = i / 3;
            const w = lerp(size * 0.36, size * 1.05, p) * (0.9 + 0.08 * Math.sin(phase * (1 + i * 0.6)));
            const h = w * lerp(0.36, 0.62, p);
            // color blend between base -> accent -> cyan
            const r = Math.floor(lerp(base.r, accent.r, p));
            const g = Math.floor(lerp(base.g, accent.g, p));
            const b = Math.floor(lerp(base.b, accent.b, p));
            const alpha = Math.floor(36 + (100 * (1 - p)) * (0.7 + 0.4 * t));
            fill(r, g, b, alpha);
            // slight offset for parallax look
            const ox = Math.sin(phase * (0.6 + i * 0.2)) * (size * 0.02 * i);
            const oy = Math.cos(phase * (0.7 + i * 0.18)) * (size * 0.01 * i) + bob * (0.04 * i);

            // Use ellipses for the glow as they are billboards
            ellipse(ox, oy, w, h);
        }

        // Layered chromatic shell
        push();
        translate(Math.sin(phase * 0.9) * 1.2, Math.cos(phase * 1.1) * 0.8);
        fill(accent.r, accent.g, accent.b, 36 + 48 * (0.5 + 0.5 * Math.sin(phase * 1.2)));
        ellipse(0, bob * 0.02, size * 0.95, size * 0.55);
        translate(-Math.sin(phase * 0.9) * 2.4, -Math.cos(phase * 1.1) * 1.6);
        fill(cyan.r, cyan.g, cyan.b, 22 + 34 * (0.5 + 0.5 * Math.cos(phase * 1.4)));
        ellipse(0, bob * 0.02, size * 0.98, size * 0.58);
        pop();

        // Drifting wisps
        for (let wisp = 0; wisp < 3; wisp++) {
            const ang = phase * 0.6 + wisp * (TWO_PI / 3);
            push();
            rotate(ang + Math.sin(phase * 0.4 + wisp) * 0.12);
            const ww = size * (0.6 + wisp * 0.28) * (0.8 + 0.12 * Math.sin(phase * (0.7 + wisp * 0.3)));
            const hh = ww * 0.22;
            fill(120 + wisp * 30, 80 + wisp * 20, 200 + wisp * 10, 26 + 36 * (1 - wisp * 0.18));
            ellipse(-size * 0.06, bob - size * 0.06, ww, hh);
            pop();
        }

        // Initialize small glowing motes if needed
        if (!obj._nebulaMotes) {
            obj._nebulaMotes = [];
            const moteCount = 4 + Math.floor(size / 120);
            for (let m = 0; m < moteCount; m++) {
                obj._nebulaMotes.push({ ang: Math.random() * TWO_PI, dist: size * (0.28 + Math.random() * 0.6), speed: 0.004 + Math.random() * 0.006, sz: 1 + Math.random() * 3, col: (m % 3) });
            }
        }

        // Draw motes with soft halo
        for (let mi = 0; mi < obj._nebulaMotes.length; mi++) {
            const m = obj._nebulaMotes[mi];
            m.ang += m.speed * (0.9 + Math.sin(phase * 0.6 + mi) * 0.12);
            m.dist += Math.sin(phase * 0.3 + mi) * 0.2;
            const mx = Math.cos(m.ang) * m.dist * 0.6;
            const my = Math.sin(m.ang) * m.dist * 0.28 + bob * 0.12;
            let mr = 220, mg = 190, mb = 160;
            if (m.col === 1) { mr = 180; mg = 230; mb = 255; }
            if (m.col === 2) { mr = 255; mg = 150; mb = 220; }

            // Mote as small box
            Draw3D.drawBox3D(mx, my, m.sz, m.sz, m.sz, color(mr, mg, mb, 120 + Math.floor(60 * Math.sin(phase * 2 + mi))), obj.angle, sunAngle);
        }

        // Tiny sparkles for depth
        for (let s = 0; s < 3; s++) {
            const sa = phase * (0.6 + s * 0.3) + s * 1.7;
            const sr = size * (0.18 + s * 0.14);
            const sx = Math.cos(sa) * sr * 0.6;
            const sy = Math.sin(sa) * sr * 0.38 + bob * 0.02;

            // Sparkle as tiny box
            Draw3D.drawBox3D(sx, sy, 2.5 - s * 0.6, 2.5 - s * 0.6, 2, color(255, 255, 255, 140 - s * 30), obj.angle, sunAngle);
        }
    },

    wreckage: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Main plate
        Draw3D.drawBox3D(0, bob, size * 0.6, size * 0.28, size * 0.05, color(120, 110, 100), obj.angle, sunAngle);

        // Scattered panels
        Draw3D.drawBox3D(-size * 0.22, bob - size * 0.12, size * 0.2, size * 0.08, size * 0.04, color(90, 80, 80), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.28, bob + size * 0.1, size * 0.18, size * 0.06, size * 0.04, color(90, 80, 80), obj.angle, sunAngle);

        // Small sparks/puffs
        fill(255, 180, 140, 120);
        ellipse(size * 0.36, bob - size * 0.06, 6, 3);
    },

    solarFarm: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const a = anim || obj._anim || {};

        // Floating frame / base
        Draw3D.drawBox3D(0, bob + size * 0.02, size * 0.95, size * 0.26, size * 0.05, color(32, 38, 50), obj.angle, sunAngle);

        // Central collector tower
        Draw3D.drawBox3D(0, bob - size * 0.06, size * 0.12, size * 0.32, size * 0.12, color(120, 130, 140), obj.angle, sunAngle);

        // Collector glow
        fill(200, 220, 240, 60);
        ellipse(0, bob - size * 0.22, size * 0.14, size * 0.08);

        // Panels
        const rows = 2;
        const cols = 5;
        const panelW = size * 0.16;
        const panelH = size * 0.08;
        const tiltBase = (typeof a.panelTiltAngle === 'number') ? a.panelTiltAngle : 0;
        const trackPhase = (typeof a.trackerPhase === 'number') ? a.trackerPhase : obj.bobPhase * 0.001;

        for (let r = 0; r < rows; r++) {
            const yOff = bob - size * 0.06 + r * (panelH * 1.2);
            for (let c = 0; c < cols; c++) {
                const x = (c - (cols - 1) / 2) * (panelW * 1.2);
                const per = (c / cols) + r * 0.13;
                const tilt = tiltBase + Math.sin(trackPhase * (0.9 + per * 0.2) + per * 1.7) * (0.14 + r * 0.02);

                push();
                translate(x, yOff);
                rotate(tilt);

                // Panel body
                Draw3D.drawBox3D(0, 0, panelW, panelH, size * 0.01, color(18, 58, 130), obj.angle, sunAngle);

                // Grid lines
                stroke(12, 30, 70, 160); strokeWeight(0.6);
                for (let g = -2; g <= 2; g++) {
                    const gx = (g / 2) * panelW * 0.9;
                    line(-panelW * 0.46, gx, panelW * 0.46, gx);
                }
                noStroke();

                // Specular sheen
                fill(255, 255, 240, 28);
                beginShape();
                vertex(-panelW * 0.36, -panelH * 0.2);
                vertex(-panelW * 0.06, -panelH * 0.3);
                vertex(panelW * 0.36, -panelH * 0.05);
                endShape(CLOSE);
                pop();
            }
        }

        // Wiring bus and pulse glow
        const pulse = 0.6 + 0.4 * Math.sin((a.wiringPulse || obj.bobPhase) * 0.006);
        Draw3D.drawBox3D(0, bob + size * 0.12, size * 0.5, size * 0.04, size * 0.04, color(90, 200, 255, 80 + 80 * pulse), obj.angle, sunAngle);

        // Small power node
        fill(120, 220, 255, 160);
        ellipse(-size * 0.18, bob + size * 0.12, 6, 4);
        ellipse(size * 0.18, bob + size * 0.12, 5, 3);

        // Maintenance drones
        if (!obj._farmDrones) {
            obj._farmDrones = [];
            const dcount = 2 + Math.floor(size / 120);
            for (let i = 0; i < dcount; i++) obj._farmDrones.push({ ang: Math.random() * TWO_PI, dist: size * (0.36 + Math.random() * 0.2), speed: 0.002 + Math.random() * 0.003, phase: Math.random() * TWO_PI });
        }
        for (let di = 0; di < obj._farmDrones.length; di++) {
            const d = obj._farmDrones[di];
            d.ang += d.speed;
            const dx = Math.cos(d.ang) * d.dist;
            const dy = Math.sin(d.ang) * d.dist * 0.36 + bob * 0.06;

            // Tether line
            stroke(120, 140, 150, 120); strokeWeight(0.6);
            line(0, bob - size * 0.06, dx, dy - 2);
            noStroke();

            // Drone body as small box
            Draw3D.drawBox3D(dx, dy, 6, 4, 4, color(240, 230, 200), obj.angle, sunAngle);

            // Status light
            fill(100, 220, 160, 220);
            ellipse(dx + 3, dy - 1, 2, 2);
        }
    },

    prison: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Base platform shadow
        Draw3D.drawBox3D(0, size * 0.22 + bob, size * 0.95, size * 0.28, size * 0.05, color(12, 12, 16, 220), obj.angle, sunAngle);

        // Main security compound
        Draw3D.drawBox3D(0, bob, size * 0.9, size * 0.5, size * 0.3, color(40, 40, 45), obj.angle, sunAngle);

        // Reinforced plating
        Draw3D.drawBox3D(0, bob - size * 0.15, size * 0.85, size * 0.08, size * 0.32, color(30, 30, 35), obj.angle, sunAngle);
        Draw3D.drawBox3D(0, bob + size * 0.15, size * 0.85, size * 0.08, size * 0.32, color(30, 30, 35), obj.angle, sunAngle);

        // Cell block modules (4 wings)
        for (let wing = 0; wing < 4; wing++) {
            const wangle = wing * (TWO_PI / 4);

            let wx = 0, wy = 0, ww = 0, wh = 0;
            if (wing === 0) { wx = size * 0.35; wy = 0; ww = size * 0.25; wh = size * 0.12; }
            else if (wing === 1) { wx = 0; wy = size * 0.35; ww = size * 0.12; wh = size * 0.25; }
            else if (wing === 2) { wx = -size * 0.35; wy = 0; ww = size * 0.25; wh = size * 0.12; }
            else if (wing === 3) { wx = 0; wy = -size * 0.35; ww = size * 0.12; wh = size * 0.25; }

            Draw3D.drawBox3D(wx, wy + bob, ww, wh, size * 0.1, color(50, 50, 55), obj.angle, sunAngle);
        }

        // Guard towers (corner positions)
        for (let t = 0; t < 4; t++) {
            const tangle = t * (TWO_PI / 4) + Math.PI / 4;
            const tx = Math.cos(tangle) * size * 0.42;
            const ty = Math.sin(tangle) * size * 0.42 + bob;

            // Tower base
            Draw3D.drawBox3D(tx, ty, size * 0.1, size * 0.15, size * 0.2, color(45, 45, 50), obj.angle, sunAngle);

            // Tower top
            Draw3D.drawBox3D(tx, ty - size * 0.08, size * 0.12, size * 0.04, size * 0.12, color(55, 55, 60), obj.angle, sunAngle);

            // Guard light
            fill(200, 180, 100, 180);
            ellipse(tx, ty - size * 0.1, 4, 4);
        }

        // Rotating searchlights
        const searchPhase = (anim && anim.searchlightPhase) ? anim.searchlightPhase : obj.bobPhase * 0.003;
        for (let s = 0; s < 2; s++) {
            const sangle = searchPhase + s * Math.PI;
            push();
            rotate(sangle);
            // Searchlight beam (cone)
            fill(255, 255, 200, 35);
            beginShape();
            vertex(0, bob - size * 0.2);
            vertex(Math.cos(-0.3) * size * 1.2, Math.sin(-0.3) * size * 1.2 + bob);
            vertex(Math.cos(0.3) * size * 1.2, Math.sin(0.3) * size * 1.2 + bob);
            endShape(CLOSE);
            // Searchlight housing
            fill(80, 80, 90);
            ellipse(0, bob - size * 0.2, size * 0.06, size * 0.04);
            pop();
        }

        // Security perimeter fence (energy barrier)
        const barrierPhase = (anim && anim.barrierPulse) ? anim.barrierPulse : obj.bobPhase * 0.004;
        const barrierPulse = 0.5 + 0.5 * Math.sin(barrierPhase);
        stroke(255, 100, 100, 80 + 80 * barrierPulse);
        strokeWeight(1.5);
        noFill();
        rect(0, bob, size * 0.98, size * 0.58, 10);

        // Energy nodes at corners
        noStroke();
        for (let n = 0; n < 4; n++) {
            const nangle = n * (TWO_PI / 4);
            const nx = Math.cos(nangle) * size * 0.48;
            const ny = Math.sin(nangle) * size * 0.28 + bob;
            fill(255, 100, 100, 200 * barrierPulse);
            ellipse(nx, ny, 5, 5);
        }

        // Central command center
        Draw3D.drawBox3D(0, bob - size * 0.05, size * 0.2, size * 0.15, size * 0.1, color(60, 60, 70), obj.angle, sunAngle);

        // Command windows
        for (let w = -1; w <= 1; w++) {
            Draw3D.drawBox3D(w * (size * 0.05), bob - size * 0.05, size * 0.025, size * 0.06, size * 0.02, color(150, 150, 200, 120), obj.angle, sunAngle);
        }

        // Antenna array on command center
        Draw3D.drawBox3D(0, bob - size * 0.13, size * 0.05, size * 0.03, size * 0.1, color(70, 70, 80), obj.angle, sunAngle);
        stroke(80, 80, 90);
        strokeWeight(1);
        line(0, bob - size * 0.14, 0, bob - size * 0.2);
        noStroke();

        // Status and warning lights
        const warnFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.4);
        fill(255, 0, 0, 255 * warnFlash);
        ellipse(-size * 0.4, bob - size * 0.2, 5, 5);
        fill(255, 0, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.4 + 1)));
        ellipse(size * 0.4, bob - size * 0.2, 5, 5);
        fill(255, 255, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.4 + 2)));
        ellipse(0, bob + size * 0.3, 5, 5);

        // Security drones patrolling
        if (!obj._securityDrones) {
            obj._securityDrones = [];
            for (let d = 0; d < 3; d++) {
                obj._securityDrones.push({ ang: d * (TWO_PI / 3), dist: size * 0.5, speed: 0.003 });
            }
        }
        for (let d = 0; d < obj._securityDrones.length; d++) {
            const drone = obj._securityDrones[d];
            drone.ang += drone.speed;
            const dx = Math.cos(drone.ang) * drone.dist;
            const dy = Math.sin(drone.ang) * drone.dist * 0.5 + bob;

            // Drone as small box
            Draw3D.drawBox3D(dx, dy, 8, 6, 4, color(80, 80, 90), obj.angle, sunAngle);

            fill(255, 0, 0, 200);
            ellipse(dx + 2, dy, 2, 2);
        }
    },

    drugLab: function (obj, size, anim, bob) {
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Platform shadow
        Draw3D.drawBox3D(0, size * 0.2 + bob, size * 0.88, size * 0.26, size * 0.05, color(16, 20, 16, 200), obj.angle, sunAngle);

        // Main facility housing
        Draw3D.drawBox3D(0, bob, size * 0.7, size * 0.45, size * 0.25, color(55, 60, 55), obj.angle, sunAngle);

        // Worn paneling
        Draw3D.drawBox3D(0, bob - size * 0.12, size * 0.65, size * 0.08, size * 0.26, color(45, 50, 45), obj.angle, sunAngle);
        Draw3D.drawBox3D(0, bob + size * 0.12, size * 0.65, size * 0.08, size * 0.26, color(45, 50, 45), obj.angle, sunAngle);

        // Chemical storage tanks (3 large tanks)
        for (let t = -1; t <= 1; t++) {
            const tx = t * (size * 0.28);
            const ty = bob - size * 0.08;

            // Tank body as a prism (cylinder approximation)
            Draw3D.drawPrism(tx, ty, size * 0.18, 8, size * 0.35, color(70, 75, 65), obj.angle, sunAngle);

            // Liquid level indicator
            // Draw a small box on the side
            Draw3D.drawBox3D(tx, ty + size * 0.04, size * 0.12, size * 0.16, size * 0.19, color(100, 180, 140, 120), obj.angle, sunAngle);

            // Hazard markings - skip for now or simplify
        }

        // Distillation columns with condenser coils
        for (let c = 0; c < 2; c++) {
            const cx = (c - 0.5) * (size * 0.6);
            const cy = bob + size * 0.2;

            // Column body
            Draw3D.drawPrism(cx, cy, size * 0.08, 6, size * 0.25, color(60, 65, 60), obj.angle, sunAngle);

            // Coil wrapping - skip for now

            // Outlet valve
            fill(90, 95, 90);
            ellipse(cx, cy + size * 0.14, size * 0.06, size * 0.04);
        }

        // Piping network with animated flow
        Draw3D.drawBox3D(0, bob - size * 0.05, size * 0.6, size * 0.02, size * 0.02, color(65, 70, 65), obj.angle, sunAngle);
        Draw3D.drawBox3D(-size * 0.15, bob + size * 0.05, size * 0.02, size * 0.2, size * 0.02, color(65, 70, 65), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.15, bob + size * 0.05, size * 0.02, size * 0.2, size * 0.02, color(65, 70, 65), obj.angle, sunAngle);

        // Flow indicators (glowing particles)
        const flowPhase = (anim && anim.flowPhase) ? anim.flowPhase : obj.bobPhase * 0.005;
        for (let f = 0; f < 3; f++) {
            const fx = lerp(-size * 0.3, size * 0.3, (flowPhase + f * 0.33) % 1);
            fill(100, 200, 150, 180);
            ellipse(fx, bob - size * 0.05, 4, 3);
        }

        // Ventilation fans (rotating)
        const fanPhase = (anim && anim.fanRotation) ? anim.fanRotation : obj.bobPhase * 0.004;
        for (let v = 0; v < 2; v++) {
            const vx = (v - 0.5) * (size * 0.4);
            const vy = bob - size * 0.25;

            // Fan housing
            Draw3D.drawBox3D(vx, vy, size * 0.12, size * 0.12, size * 0.05, color(50, 55, 50), obj.angle, sunAngle);

            // Fan blades
            push();
            translate(vx, vy);
            rotate(fanPhase + v * Math.PI);
            stroke(40, 45, 40);
            strokeWeight(2);
            for (let b = 0; b < 3; b++) {
                const ba = b * (TWO_PI / 3);
                line(0, 0, Math.cos(ba) * size * 0.05, Math.sin(ba) * size * 0.05);
            }
            noStroke();
            pop();
        }

        // Toxic vapor vents with emission particles
        for (let e = 0; e < 2; e++) {
            const ex = (e - 0.5) * (size * 0.5);
            const ey = bob + size * 0.25;

            // Vent cap
            Draw3D.drawBox3D(ex, ey, size * 0.08, size * 0.05, size * 0.05, color(65, 70, 65), obj.angle, sunAngle);

            // Emissions (layered translucent ellipses)
            for (let p = 0; p < 3; p++) {
                const py = ey - size * 0.05 - p * size * 0.08;
                const phase = obj.bobPhase * 0.003 + e + p * 0.5;
                fill(120, 200, 140, 60 - p * 15);
                ellipse(ex + Math.sin(phase) * 3, py, size * 0.1 + p * size * 0.04, size * 0.06 + p * size * 0.02);
            }
        }

        // Hazard warning signs
        // Skip text for now, just draw the sign shape
        fill(255, 200, 0, 200);
        beginShape();
        vertex(-size * 0.35, bob + size * 0.1 - size * 0.04);
        vertex(-size * 0.35 - size * 0.03, bob + size * 0.1 + size * 0.04);
        vertex(-size * 0.35 + size * 0.03, bob + size * 0.1 + size * 0.04);
        endShape(CLOSE);
        fill(0, 0, 0);
        textAlign(CENTER, CENTER);
        textSize(8);
        text('!', -size * 0.35, bob + size * 0.1);

        // Status lights (toxic green glow)
        const toxicFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35);
        fill(100, 255, 100, 255 * toxicFlash);
        ellipse(-size * 0.3, bob - size * 0.2, 4, 4);
        fill(100, 255, 100, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.35 + 1)));
        ellipse(size * 0.3, bob - size * 0.2, 4, 4);

        // Small maintenance bot
        const botX = Math.sin(obj.bobPhase * 0.002) * (size * 0.2);
        const botY = bob + size * 0.3;

        // Bot as small box
        Draw3D.drawBox3D(botX, botY, 10, 6, 4, color(80, 85, 80), obj.angle, sunAngle);

        fill(100, 200, 150, 150);
        ellipse(botX + 3, botY, 2, 2);
    },

    labourColony: function (obj, size, anim, bob) {
        // Labour colony: industrial complex with worker modules, mining equipment, processing facilities and transport rails
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);

        // Base platform with industrial grid
        Draw3D.drawBox3D(0, size * 0.25 + bob, size * 1.0, size * 0.3, size * 0.05, color(30, 30, 35), obj.angle, sunAngle);

        // Central processing facility (large industrial structure)
        Draw3D.drawBox3D(0, bob, size * 0.6, size * 0.4, size * 0.2, color(50, 50, 55), obj.angle, sunAngle);

        // Processing windows
        for (let w = -2; w <= 2; w++) {
            Draw3D.drawBox3D(w * (size * 0.1), bob, size * 0.06, size * 0.25, size * 0.21, color(200, 150, 100), obj.angle, sunAngle);
        }

        // Worker habitation modules (rows of small units)
        for (let row = 0; row < 2; row++) {
            for (let col = -3; col <= 3; col++) {
                const mx = col * (size * 0.14);
                const my = bob - size * 0.25 + row * (size * 0.08);
                // Module housing
                Draw3D.drawBox3D(mx, my, size * 0.12, size * 0.06, size * 0.05, color(60, 60, 65), obj.angle, sunAngle);
                // Small window
                Draw3D.drawBox3D(mx, my, size * 0.04, size * 0.04, size * 0.06, color(150, 150, 180), obj.angle, sunAngle);
            }
        }

        // Mining drill rigs (2 large drilling platforms)
        for (let d = 0; d < 2; d++) {
            const dx = (d - 0.5) * (size * 0.7);
            const dy = bob + size * 0.15;
            // Drill platform
            Draw3D.drawBox3D(dx, dy, size * 0.18, size * 0.12, size * 0.05, color(45, 45, 50), obj.angle, sunAngle);

            // Drill arm
            const drillAngle = Math.sin(obj.bobPhase * 0.002 + d) * 0.15;
            // Approximating rotated arm with a box
            Draw3D.drawBox3D(dx, dy - size * 0.06, size * 0.04, size * 0.25, size * 0.04, color(55, 55, 60), obj.angle + (drillAngle), sunAngle);

            // Drill head
            Draw3D.drawBox3D(dx, dy + size * 0.19, size * 0.08, size * 0.06, size * 0.06, color(70, 70, 75), obj.angle + (drillAngle), sunAngle);

            // Rotating drill bit
            const drillSpin = (anim && anim.drillSpin) ? anim.drillSpin : obj.bobPhase * 0.006;
            Draw3D.drawPrism(dx, dy + size * 0.25, size * 0.04, size * 0.06, 3, color(90, 90, 95), obj.angle + (drillSpin + d * Math.PI), sunAngle);
        }

        // Ore processing conveyors with moving ore chunks
        Draw3D.drawBox3D(-size * 0.25, bob + size * 0.28, size * 0.5, size * 0.08, size * 0.02, color(40, 40, 45), obj.angle, sunAngle);
        Draw3D.drawBox3D(size * 0.25, bob + size * 0.28, size * 0.5, size * 0.08, size * 0.02, color(40, 40, 45), obj.angle, sunAngle);

        // Moving ore on conveyors
        const conveyorPhase = (anim && anim.conveyorPhase) ? anim.conveyorPhase : obj.bobPhase * 0.004;
        for (let c = 0; c < 2; c++) {
            const cx = (c - 0.5) * (size * 0.5);
            for (let o = 0; o < 4; o++) {
                const ox = cx + lerp(-size * 0.25, size * 0.25, (conveyorPhase + o * 0.25) % 1);
                Draw3D.drawBox3D(ox, bob + size * 0.28, size * 0.05, size * 0.04, size * 0.03, color(120, 90, 70), obj.angle, sunAngle);
            }
        }

        // Transport rail system (monorail)
        Draw3D.drawBox3D(0, bob - size * 0.15, size * 1.0, size * 0.02, size * 0.02, color(60, 60, 65), obj.angle, sunAngle);

        // Rail support pillars
        for (let p = -2; p <= 2; p++) {
            const px = p * (size * 0.25);
            Draw3D.drawBox3D(px, bob - size * 0.08, size * 0.04, size * 0.15, size * 0.04, color(50, 50, 55), obj.angle, sunAngle);
        }

        // Transport pod moving along rail
        const podPos = Math.sin(obj.bobPhase * 0.003) * (size * 0.45);
        Draw3D.drawBox3D(podPos, bob - size * 0.15, size * 0.15, size * 0.08, size * 0.06, color(70, 70, 80), obj.angle, sunAngle);
        Draw3D.drawBox3D(podPos, bob - size * 0.15, size * 0.06, size * 0.06, size * 0.07, color(100, 120, 140), obj.angle, sunAngle);

        // Smokestacks with emissions
        for (let s = 0; s < 3; s++) {
            const sx = (s - 1) * (size * 0.22);
            const sy = bob - size * 0.35;
            // Stack structure
            Draw3D.drawBox3D(sx, sy + size * 0.1, size * 0.06, size * 0.2, size * 0.1, color(55, 55, 60), obj.angle, sunAngle);
            // Smoke particles
            for (let p = 0; p < 3; p++) {
                const py = sy - p * size * 0.08;
                const phase = obj.bobPhase * 0.002 + s + p * 0.5;
                fill(80, 80, 85, 100 - p * 25);
                ellipse(sx + Math.sin(phase) * 5, py, size * 0.08 + p * size * 0.03, size * 0.06 + p * size * 0.02);
            }
        }

        // Power generators (glowing energy cores)
        for (let g = 0; g < 2; g++) {
            const gx = (g - 0.5) * (size * 0.4);
            const gy = bob + size * 0.05;
            // Generator housing
            Draw3D.drawBox3D(gx, gy, size * 0.12, size * 0.1, size * 0.08, color(65, 65, 70), obj.angle, sunAngle);
            // Energy core glow
            const glowPhase = obj.bobPhase * 0.005 + g;
            const glow = 0.5 + 0.5 * Math.sin(glowPhase);
            fill(200, 150, 100, 150 * glow);
            ellipse(gx, gy, size * 0.06 * (0.8 + 0.4 * glow), size * 0.05 * (0.8 + 0.4 * glow));
        }

        // Status lights (industrial orange)
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(255, 150, 0, 255 * statusFlash);
        ellipse(-size * 0.45, bob - size * 0.3, 5, 5);
        fill(255, 150, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.45, bob - size * 0.3, 5, 5);
        fill(255, 150, 0, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 2)));
        ellipse(0, bob + size * 0.38, 5, 5);

        // Worker transport shuttles
        if (!obj._workerShuttles) {
            obj._workerShuttles = [];
            for (let w = 0; w < 2; w++) {
                obj._workerShuttles.push({ ang: w * Math.PI, dist: size * 0.5, speed: 0.002 });
            }
        }
        for (let w = 0; w < obj._workerShuttles.length; w++) {
            const shuttle = obj._workerShuttles[w];
            shuttle.ang += shuttle.speed;
            const wx = Math.cos(shuttle.ang) * shuttle.dist;
            const wy = Math.sin(shuttle.ang) * shuttle.dist * 0.4 + bob;
            fill(90, 90, 100);
            ellipse(wx, wy, 10, 6);
            fill(200, 200, 220, 120);
            ellipse(wx + 2, wy, 3, 2);
        }
    },

    quantumGate: function (obj, size, anim, bob) {
        // Enhanced quantum gate: multi-ring shimmer, rotating glyphs, teleport arcs and particle jets
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const phase = (anim && anim.gatePhase) ? anim.gatePhase : obj.bobPhase * 0.01;
        const spin = obj.bobPhase * 0.0025;
        const pulse = 0.6 + 0.45 * Math.sin(phase * 1.8);

        // central chromatic core (colour shifts subtly)
        const rC = Math.floor(200 + 55 * Math.sin(phase * 1.1));
        const gC = Math.floor(120 + 90 * Math.sin(phase * 1.5 + 1.2));
        const bC = Math.floor(220 + 20 * Math.sin(phase * 0.9 + 2.3));

        // Core as a glowing box
        Draw3D.drawBox3D(0, bob, size * 0.28 * (0.8 + pulse * 0.35), size * 0.28 * (0.8 + pulse * 0.35), size * 0.28, color(rC, gC, bC, Math.floor(200 * pulse)), obj.angle + (spin), sunAngle);

        // layered shimmer rings (approximated with rotating flat boxes)
        for (let ring = 0; ring < 3; ring++) {
            const t = ring / 3;
            const col = color(Math.floor(lerp(rC, 120, t)), Math.floor(lerp(gC, 200, t)), Math.floor(lerp(bC, 255, t)), Math.floor(90 * (1 - t) * (1 + 0.6 * pulse)));
            const s = size * (0.6 + ring * 0.18) * (0.95 + 0.06 * Math.sin(phase * (1.2 + ring * 0.4)));

            // Draw a few boxes to simulate a ring
            const segments = 8;
            for (let i = 0; i < segments; i++) {
                const ang = i * (TWO_PI / segments) + spin * (1 + ring * 0.2);
                const rx = Math.cos(ang) * s * 0.5;
                const ry = Math.sin(ang) * s * 0.5 + bob;
                Draw3D.drawBox3D(rx, ry, s * 0.2, s * 0.1, s * 0.05, col, obj.angle + (ang), sunAngle);
            }
        }

        // rotating glyphs/icons along the main ring
        const glyphCount = 10;
        for (let i = 0; i < glyphCount; i++) {
            const ga = spin + i * (TWO_PI / glyphCount);
            const gr = size * 0.48;
            const gx = Math.cos(ga) * gr;
            const gy = Math.sin(ga) * gr * 0.9 + bob * 0.02;

            const gw = 4 + 2 * Math.sin(phase * 2 + i);
            // Glyph as a prism
            Draw3D.drawPrism(gx, gy, gw, gw * 1.5, 3, color(255, 255, 255, 180), obj.angle + (ga + phase * 0.5), sunAngle);
        }

        // teleport arcs: curved energy strands that sweep across the gate
        // Approximating with small boxes
        for (let a = 0; a < 6; a++) {
            const startAng = spin * 0.8 + a * (TWO_PI / 6) + Math.sin(phase * (0.7 + a * 0.14)) * 0.2;
            const arcLen = 0.8 + 0.2 * Math.sin(phase * 1.3 + a);
            const rIn = size * 0.28;
            const rOut = size * 0.66;
            const steps = 5; // Reduced steps for performance

            for (let s = 0; s <= steps; s++) {
                const v = s / steps;
                const ang = startAng + v * arcLen;
                const rad = lerp(rIn, rOut, v);
                const x = Math.cos(ang) * rad;
                const y = Math.sin(ang) * rad * 0.92 + bob * 0.02 * Math.sin(phase + a);
                const alpha = Math.floor(180 * (1 - v) * (0.6 + 0.4 * Math.sin(phase * 1.2 + a)));
                const col = color(Math.floor(lerp(rC, 180, v)), Math.floor(lerp(gC, 220, v)), Math.floor(lerp(bC, 255, v)), alpha);

                Draw3D.drawBox3D(x, y, size * 0.05, size * 0.05, size * 0.05, col, obj.angle + (ang), sunAngle);
            }
        }

        // initialize particle jets if missing
        if (!obj._qParticles) {
            obj._qParticles = [];
            const pcount = 12 + Math.floor(size / 60);
            for (let p = 0; p < pcount; p++) {
                obj._qParticles.push({ ang: Math.random() * TWO_PI, dist: size * (0.4 + Math.random() * 0.6), speed: 0.002 + Math.random() * 0.004, sz: 1 + Math.random() * 3, life: 80 + Math.random() * 140, age: Math.random() * 80 });
            }
        }

        // draw and update particles (small jets and sparks)
        for (let pi = 0; pi < obj._qParticles.length; pi++) {
            const p = obj._qParticles[pi];
            p.age += p.speed * 60;
            // orbit slowly outward and wrap
            p.ang += 0.0015 + 0.0008 * Math.sin(phase + pi);
            p.dist += 0.02 * Math.sin(phase * 0.6 + pi * 0.3);
            if (p.age > p.life) { p.age = 0; p.dist = size * (0.4 + Math.random() * 0.6); }
            const px = Math.cos(p.ang) * p.dist;
            const py = Math.sin(p.ang) * p.dist * 0.9 + bob * 0.03;
            const fade = 1 - (p.age / p.life);
            const pr = Math.floor(lerp(rC, 255, Math.random()));
            const pg = Math.floor(lerp(gC, 150, Math.random()));
            const pb = Math.floor(lerp(bC, 200, Math.random()));

            Draw3D.drawBox3D(px, py, p.sz * (0.8 + fade * 1.2), p.sz * 0.6, p.sz, color(pr, pg, pb, Math.floor(160 * fade * pulse)), obj.angle + (p.ang), sunAngle);
        }
    },

    // ==========================================================================
    // SHIPYARD - Large orbital shipbuilding facility with construction bays,
    // cranes, welding sparks, and docked ship frames
    // ==========================================================================
    shipyard: function (obj, size, anim, bob) {
        // Animation phases
        const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
        const phase = (anim && anim.shipyardPhase) ? anim.shipyardPhase : obj.bobPhase * 0.0015;
        const cranePhase = (anim && anim.cranePhase) ? anim.cranePhase : obj.bobPhase * 0.0008;
        // Slow down weld animation so sparks are less frantic
        const weldPhase = (anim && anim.weldPhase) ? anim.weldPhase : obj.bobPhase * 0.00005;
        const dockingPulse = 0.7 + 0.3 * Math.sin(phase * 2);

        // Main shipyard hull - large industrial hexagonal structure
        // Background scaffolding/lattice - approximated with a large flat prism
        Draw3D.drawPrism(0, bob, size * 0.48, size * 0.48, 8, color(60, 80, 100, 120), obj.angle + (phase * 0.02), sunAngle);

        // Main central hub - industrial gray with blue accents
        Draw3D.drawPrism(0, bob, size * 0.28, size * 0.28, 6, color(50, 55, 70), obj.angle + (-PI / 6), sunAngle);

        // Hub inner detail
        Draw3D.drawBox3D(0, bob, size * 0.18, size * 0.18, size * 0.05, color(70, 80, 100), obj.angle, sunAngle);
        Draw3D.drawBox3D(0, bob, size * 0.12, size * 0.12, size * 0.08, color(40, 50, 65), obj.angle, sunAngle);

        // Beveled inner plate for the hex hub (adds perceived depth)
        Draw3D.drawPrism(0, bob, size * 0.22, size * 0.22, 6, color(90, 100, 115), obj.angle + (-PI / 6), sunAngle);
        // inner darker inset
        Draw3D.drawPrism(0, bob, size * 0.14, size * 0.14, 6, color(60, 70, 85), obj.angle + (-PI / 6), sunAngle);

        // Glowing core
        const coreGlow = 150 + 80 * Math.sin(phase * 3);
        Draw3D.drawBox3D(0, bob, size * 0.06, size * 0.06, size * 0.1, color(100, 180, 255, coreGlow), obj.angle, sunAngle);

        // Four construction bays extending from center (enlarged for visibility)
        for (let bay = 0; bay < 4; bay++) {
            const bayAng = (TWO_PI / 4) * bay + PI / 4;
            const bx = Math.cos(bayAng) * size * 0.44;
            const by = Math.sin(bayAng) * size * 0.44 + bob;

            // Bay structure - larger, more detailed arms
            Draw3D.drawBox3D(bx, by, size * 0.42, size * 0.18, size * 0.1, color(52, 58, 74), obj.angle + (bayAng), sunAngle);

            // Bay interior glow (construction activity) - larger and more saturated
            const bayGlow = 110 + 60 * Math.sin(phase * 2 + bay * 1.5);
            Draw3D.drawBox3D(bx, by, size * 0.34, size * 0.12, size * 0.11, color(255, 210, 120, bayGlow), obj.angle + (bayAng), sunAngle);
            // Ship frame under construction (larger, with hull detail)
            // Approximating ship frame with a box
            const frameX = bx - Math.cos(bayAng) * size * 0.02;
            const frameY = by - Math.sin(bayAng) * size * 0.02;
            Draw3D.drawBox3D(frameX, frameY, size * 0.3, size * 0.1, size * 0.05, color(36, 42, 52), obj.angle + (bayAng), sunAngle);

            // cockpit / bridge
            const cockpitX = frameX + Math.cos(bayAng) * size * 0.06;
            const cockpitY = frameY + Math.sin(bayAng) * size * 0.06;
            Draw3D.drawBox3D(cockpitX, cockpitY, size * 0.06, size * 0.04, size * 0.06, color(90, 110, 130), obj.angle + (bayAng), sunAngle);

            // Construction crane arm (thicker and more visible)
            const craneSway = Math.sin(cranePhase + bay * 2) * 0.22;
            const craneX = bx + Math.cos(bayAng) * size * 0.06;
            const craneY = by + Math.sin(bayAng) * size * 0.06;
            // Crane arm
            Draw3D.drawBox3D(craneX, craneY, size * 0.02, size * 0.12, size * 0.02, color(92, 104, 124), obj.angle + (bayAng + craneSway), sunAngle);

            // Crane hook & cable
            const hookX = craneX + Math.cos(bayAng + craneSway) * size * 0.08;
            const hookY = craneY + Math.sin(bayAng + craneSway) * size * 0.08; // Simplified position
            Draw3D.drawBox3D(hookX, hookY, size * 0.03, size * 0.03, size * 0.03, color(120, 130, 150), obj.angle + (bayAng), sunAngle);

            // Larger welding sparks and directional streaks (animated)
            if (Math.sin(weldPhase * 6 + bay * 2.2) > 0.3) {
                for (let s = 0; s < 4; s++) { // Reduced count for 3D
                    const sparkAng = -0.6 + Math.random() * 1.2; // biased outward
                    const sparkDist = Math.random() * size * 0.06;
                    const sparkX = bx + size * 0.02 + Math.cos(sparkAng) * sparkDist;
                    const sparkY = by + Math.sin(sparkAng) * sparkDist;
                    // streak
                    Draw3D.drawBox3D(sparkX, sparkY, 3 + Math.random() * 3, 2 + Math.random() * 2, 2, color(255, 220 + Math.random() * 35, 120, 220), obj.angle + (sparkAng), sunAngle);
                }
                // Bright weld point
                Draw3D.drawBox3D(bx + size * 0.02, by, 6, 6, 6, color(255, 255, 220, 240), obj.angle, sunAngle);
            }

            // Gantry that traverses the bay (large visible movement)
            const gantryPos = (Math.sin(phase * 0.6 + bay) * 0.45 + 0.5) * (size * 0.16);
            const gantryX = bx - Math.cos(bayAng) * (size * 0.08 - gantryPos);
            const gantryY = by - Math.sin(bayAng) * (size * 0.08 - gantryPos);
            Draw3D.drawBox3D(gantryX, gantryY, size * 0.12, size * 0.04, size * 0.04, color(120, 125, 140), obj.angle + (bayAng), sunAngle);
        }

        // External docking arms (2 large ones for finished ships)
        for (let arm = 0; arm < 2; arm++) {
            const armAng = (arm === 0) ? -PI / 2 : PI / 2;
            const rot = armAng + Math.sin(phase + arm) * 0.02;

            // Position relative to center, rotated
            const armDist = size * 0.44;
            // Original code: translate(0, -size * 0.44) then rotate? No, rotate then translate.
            // "rotate(armAng...); translate(0, -size * 0.44);"
            // So it rotates the coordinate system, then moves UP (negative Y) in that rotated system.

            const finalAng = rot;
            const armX_world = Math.cos(finalAng - PI / 2) * armDist;
            const armY_world = Math.sin(finalAng - PI / 2) * armDist + bob;

            // Docking arm structure
            Draw3D.drawBox3D(armX_world, armY_world, size * 0.05, size * 0.1, size * 0.05, color(70, 80, 100), obj.angle + (finalAng), sunAngle);

            // Docking clamps
            Draw3D.drawBox3D(armX_world, armY_world - size * 0.11, size * 0.08, size * 0.03, size * 0.04, color(60, 70, 85), obj.angle + (finalAng), sunAngle);

            // Docking lights
            const dockLight = (Math.sin(phase * 4 + arm * PI) > 0) ? 255 : 80;
            Draw3D.drawBox3D(armX_world - size * 0.03, armY_world - size * 0.115, 3, 3, 3, color(100, 255, 100, dockLight), obj.angle + (finalAng), sunAngle);
            Draw3D.drawBox3D(armX_world + size * 0.03, armY_world - size * 0.115, 3, 3, 3, color(100, 255, 100, dockLight), obj.angle + (finalAng), sunAngle);
        }

        // Rotating warning beacons on corners
        for (let b = 0; b < 4; b++) {
            const beaconAng = (TWO_PI / 4) * b;
            const beaconX = Math.cos(beaconAng) * size * 0.52;
            const beaconY = Math.sin(beaconAng) * size * 0.52 + bob;
            const beaconFlash = Math.sin(phase * 6 + b * 1.5) > 0.5;
            const col = beaconFlash ? color(255, 100, 50, 220) : color(100, 40, 20, 150);
            Draw3D.drawBox3D(beaconX, beaconY, 6, 6, 6, col, obj.angle, sunAngle);
        }

        // Solar panel arrays on sides
        for (let panel = 0; panel < 2; panel++) {
            const panelAng = (panel === 0) ? 0 : PI;
            const px = Math.cos(panelAng) * size * 0.46;
            const py = Math.sin(panelAng) * size * 0.46 + bob;

            // Panel arm
            Draw3D.drawBox3D(px, py, size * 0.08, size * 0.02, size * 0.02, color(80, 90, 100), obj.angle + (panelAng), sunAngle);

            // Solar panels
            const panelX = px + Math.cos(panelAng) * size * 0.1;
            const panelY = py + Math.sin(panelAng) * size * 0.1;
            Draw3D.drawBox3D(panelX, panelY, size * 0.06, size * 0.12, size * 0.02, color(30, 40, 80), obj.angle + (panelAng), sunAngle);

            // Panel reflection
            Draw3D.drawBox3D(panelX, panelY, size * 0.05, size * 0.04, size * 0.025, color(100, 150, 255, 40), obj.angle + (panelAng), sunAngle);
        }

        // Central control tower
        Draw3D.drawBox3D(0, bob - size * 0.12, size * 0.08, size * 0.16, size * 0.08, color(65, 70, 85), obj.angle, sunAngle);

        // Control tower windows
        Draw3D.drawBox3D(0, bob - size * 0.14, size * 0.04, size * 0.02, size * 0.09, color(150, 200, 255, 180 * dockingPulse), obj.angle, sunAngle);

        // Antenna array on top
        Draw3D.drawBox3D(0, bob - size * 0.19, size * 0.01, size * 0.06, size * 0.01, color(100, 110, 130), obj.angle, sunAngle);
        Draw3D.drawBox3D(0, bob - size * 0.2, size * 0.04, size * 0.01, size * 0.01, color(100, 110, 130), obj.angle, sunAngle);

        // Communication dish
        // Approximating dish with a small box or prism
        Draw3D.drawBox3D(0, bob - size * 0.22, size * 0.04, size * 0.02, size * 0.04, color(90, 100, 120), obj.angle, sunAngle);

        // Ambient particle effects (floating debris/sparks)
        if (!obj._shipyardParticles) {
            obj._shipyardParticles = [];
            // convert ambient blobs into a small squad of maintenance drones plus a few sparks/debris
            const droneCount = 6;
            for (let d = 0; d < droneCount; d++) {
                obj._shipyardParticles.push({
                    type: 'drone',
                    ang: Math.random() * TWO_PI,
                    dist: size * (0.18 + Math.random() * 0.45),
                    // drones orbit slower and predictably
                    speed: 0.0004 + Math.random() * 0.0008,
                    sz: 3 + Math.random() * 3,
                    id: 'drone_' + d
                });
            }
            // a few lingering sparks/debris for atmosphere
            for (let p = 0; p < 4; p++) {
                obj._shipyardParticles.push({
                    type: 'spark',
                    ang: Math.random() * TWO_PI,
                    dist: size * (0.18 + Math.random() * 0.4),
                    speed: 0.001 + Math.random() * 0.0015,
                    sz: 2 + Math.random() * 2
                });
            }
        }

        // Update and draw particles
        for (const p of obj._shipyardParticles) {
            p.ang += p.speed;
            const px = Math.cos(p.ang) * p.dist;
            const py = Math.sin(p.ang) * p.dist + bob * 0.6;

            if (p.type === 'drone') {
                const orient = Math.atan2(py, px) + Math.PI / 2 + (Math.sin(p.ang * 2) * 0.15);
                Draw3D.drawBox3D(px, py, p.sz * 2.2, p.sz * 1.0, p.sz * 0.8, color(180, 185, 190), obj.angle + (orient), sunAngle);
                // Blinking light
                const blink = 0.5 + 0.5 * Math.sin(phase * 3 + p.ang * 4);
                Draw3D.drawBox3D(px, py, 3, 3, 3, color(255, 100, 100, 200 * blink), obj.angle + (orient), sunAngle);
            } else if (p.type === 'spark') {
                const intensity = 160 + Math.sin(weldPhase * 6 + p.ang * 2) * 100;
                Draw3D.drawBox3D(px, py, p.sz * 1.6, p.sz * 1.2, p.sz, color(255, 230, 160, Math.min(255, intensity)), obj.angle, sunAngle);
            } else {
                Draw3D.drawBox3D(px, py, p.sz, p.sz, p.sz, color(80, 90, 100, 120), obj.angle, sunAngle);
            }
        }
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
            case 'solarFarm':
                // Solar farm: gentle panel tilt, tracker phase and maintenance drone seeds
                anim.panelTiltAngle = Math.random() * 0.02 - 0.01;
                anim.panelTiltSpeed = 0.00006 + Math.random() * 0.00004;
                anim.trackerPhase = Math.random() * TWO_PI;
                anim.wiringPulse = Math.random() * TWO_PI;
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
            case 'hydroponicsBay':
                // hydroponics bay animation seeds
                anim.hydroponicCycle = Math.random() * TWO_PI;
                anim.lightPhase = Math.random() * TWO_PI;
                anim.armPhase = Math.random() * TWO_PI;
                anim.nutrientFlow = Math.random() * TWO_PI;
                break;
            case 'fuelDepot':
                // Fuel depot animation seeds for manifold glow and hose flow
                anim.fuelPulse = Math.random() * TWO_PI;
                anim.hosePhase = Math.random() * TWO_PI;
                break;
            case 'decoyBuoy':
                anim.decoyPulse = Math.random() * TWO_PI;
                break;
            case 'miningPlatform':
                anim.miningSpin = Math.random() * TWO_PI;
                break;
            case 'alienArtifact':
                anim.artifactPhase = Math.random() * TWO_PI;
                anim.artifactJitter = Math.random() * 0.6;
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
            case 'outpost':
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
            case 'energyCollector':
                // spinning coils and light phase for flashing LEDs
                anim.collectorSpin = Math.random() * TWO_PI;
                anim.lightPhase = Math.random() * TWO_PI;
                break;
            case 'prison':
                // prison animation: searchlights and barrier pulse
                anim.searchlightPhase = Math.random() * TWO_PI;
                anim.barrierPulse = Math.random() * TWO_PI;
                break;
            case 'drugLab':
                // drug lab animation: flow phase and fan rotation
                anim.flowPhase = Math.random() * TWO_PI;
                anim.fanRotation = Math.random() * TWO_PI;
                break;
            case 'labourColony':
                // labour colony animation: drill spin and conveyor phase
                anim.drillSpin = Math.random() * TWO_PI;
                anim.conveyorPhase = Math.random() * TWO_PI;
                break;
            case 'undergroundMarket':
                // neon pulse and low-activity drones
                anim.marketPulse = Math.random() * TWO_PI;
                anim.lightPhase = Math.random() * TWO_PI;
                break;
            case 'shipyard':
                // shipyard animation: construction phases, crane movement, welding sparks
                anim.shipyardPhase = Math.random() * TWO_PI;
                anim.cranePhase = Math.random() * TWO_PI;
                anim.weldPhase = Math.random() * TWO_PI;
                break;
        }
        // unique id used by debris RNG and other persistent behaviors
        // Attach commodity lists from the centralized mapping so transports can use them
        const _commodityInfo = (typeof SPACE_OBJECT_COMMODITIES !== 'undefined') ? (SPACE_OBJECT_COMMODITIES[this.type] || SPACE_OBJECT_COMMODITIES.default) : null;
        this.produces = (_commodityInfo && Array.isArray(_commodityInfo.produces)) ? _commodityInfo.produces.slice() : [];
        this.buys = (_commodityInfo && Array.isArray(_commodityInfo.buys)) ? _commodityInfo.buys.slice() : [];

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
            outpost: 0.00002,
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
            quantumGate: 0.00002,
            prison: 0.00003,
            drugLab: 0.00006,
            labourColony: 0.00004,
            undergroundMarket: 0.000025,
            shipyard: 0.00002
        };
        this.rotationSpeed = rotMap[type] || 0.001;
        this.bobPhase = Math.random() * Math.PI * 2;
        this.bobAmp = Math.min(6, this.size * 0.06); // Precompute bob amplitude
        this.destroyed = false;
        this._drift = { x: (Math.random() - 0.5) * 0.06, y: (Math.random() - 0.5) * 0.06 };
        // Health properties (treat like a lightweight asteroid)
        this.maxHealth = Math.max(30, Math.floor(this.size * 1.8));
        this.health = this.maxHealth;

        // Docking properties for player interaction
        this.isDockable = DOCKABLE_SPACE_OBJECT_TYPES.includes(type);
        // Docking radius is larger than collision radius to make docking easier
        this.dockingRadius = this.isDockable ? Math.max(this.size * 0.7, this.collisionRadius + 40) : 0;

        // Initialize type-specific data structures
        this._initTypeSpecificData();
    }

    toJSON() {
        return {
            id: this.id,
            type: this.type,
            pos: this.pos ? { x: this.pos.x, y: this.pos.y } : null,
            x: this.pos ? this.pos.x : null,
            y: this.pos ? this.pos.y : null,
            size: this.size,
            destroyed: !!this.destroyed,
            state: this.state || null,
            subtype: this.subtype || null,
            planetIndex: (typeof this.planetIndex !== 'undefined') ? this.planetIndex : null
        };
    }

    static fromJSON(data) {
        try {
            const x = data.x ?? (data.pos && data.pos.x) ?? 0;
            const y = data.y ?? (data.pos && data.pos.y) ?? 0;
            const type = data.type || 'satellite';
            const obj = new SpaceObject(x, y, type);
            if (data.id) obj.id = data.id;
            if (data.size !== undefined && obj.size !== undefined) obj.size = data.size;
            if (data.destroyed) obj.destroyed = true;
            if (data.state !== undefined) obj.state = data.state;
            if (data.subtype !== undefined) obj.subtype = data.subtype;
            if (data.planetIndex !== undefined && data.planetIndex !== null) obj.planetIndex = data.planetIndex;
            return obj;
        } catch (e) {
            console.error('SpaceObject.fromJSON error', e, data);
            return null;
        }
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
        // Oscillating rotation instead of continuous spinning to minimize Z-sorting artifacts
        const dt = (typeof deltaTime === 'number') ? deltaTime : 16;

        // Use bobPhase to drive rotation oscillation
        // Asymmetric range: -20° to +60° (clockwise bias)
        const oscillationPhase = this.bobPhase * this.rotationSpeed * 100;
        const normalizedSin = (Math.sin(oscillationPhase) + 1) / 2; // 0 to 1
        this.angle = normalizedSin * (Math.PI / 3 + Math.PI / 9) - Math.PI / 9; // -20° to +60°

        this.bobPhase += 0.0015 * dt;
        if (this.pos && !this.destroyed) {
            this.pos.x += this._drift.x;
            this.pos.y += this._drift.y;
        }

        // Update animations using efficient loop over rate table
        const anim = this._anim;

        // Handle dynamic-speed properties separately
        if (anim.panelAngle !== undefined) anim.panelAngle += (anim.panelSpeed || 0) * dt;
        if (anim.telescopeTilt !== undefined) anim.telescopeTilt += (anim.telescopeSpeed || 0) * dt;
        if (anim.panelTiltAngle !== undefined) anim.panelTiltAngle += (anim.panelTiltSpeed || 0) * dt;

        // Use rate table for fixed-rate animations (more efficient than multiple typeof checks)
        for (let i = 0, len = ANIM_RATES.length; i < len; i++) {
            const [prop, rate] = ANIM_RATES[i];
            if (anim[prop] !== undefined) {
                anim[prop] += rate * dt;
            }
        }

        // Update debris shards
        if (this._shards) {
            const shards = this._shards;
            for (let i = 0, len = shards.length; i < len; i++) {
                shards[i].angle += shards[i].spin * dt;
            }
        }

        // Update cargo drones
        if (this._drones) {
            const drones = this._drones;
            for (let di = 0, len = drones.length; di < len; di++) {
                const d = drones[di];
                d.ang += 0.00045 * dt * (1 + di * 0.05);
                d.phase += 0.005 * dt;
            }
        }

        // Update ice trail shards positions for subtle drifting
        if (this._trail) {
            const trail = this._trail;
            const bobPhase = this.bobPhase;
            for (let ti = 0, len = trail.length; ti < len; ti++) {
                const s = trail[ti];
                s.rx += Math.cos(bobPhase * 0.002 + s.offset) * 0.02;
                s.ry += Math.sin(bobPhase * 0.003 + s.offset) * 0.03;
            }
        }
    }

    draw() {
        if (!this.pos || this.destroyed) return;

        push();
        translate(this.pos.x, this.pos.y);
        // Use the small render-only sway instead of the full logical `angle` so objects
        // don't visibly spin all the way around and break the 3D look. Fall back to
        // the logical angle if `_renderAngle` is not set.
        rotate(this.angle);
        rectMode(CENTER);

        // cache size/anim locally for a small speedup and clarity
        const size = this.size;
        const anim = this._anim;
        // subtle bob when drawing
        const bob = Math.sin(this.bobPhase) * this.bobAmp;

        // Use the cached renderer for this type
        this.renderer(this, size, anim, bob);

        // --- Draw Player's Target Indicator for this space object ---
        if (typeof player !== 'undefined' && player.target === this) {
            // Draw ship-style reticle (matching enemyRendering.js)
            push();
            noFill();
            stroke(0, 255, 0, 200); // Bright green, semi-transparent
            strokeWeight(2);

            // Circle around the object (using size like ships do)
            ellipse(0, 0, size * 1.6, size * 1.6);

            // Corner brackets (matching ship style)
            const bracketSize = size * 0.3;
            const offset = size * 0.7;
            // Top-left
            line(-offset, -offset, -offset + bracketSize, -offset);
            line(-offset, -offset, -offset, -offset + bracketSize);
            // Top-right
            line(offset, -offset, offset - bracketSize, -offset);
            line(offset, -offset, offset, -offset + bracketSize);
            // Bottom-left
            line(-offset, offset, -offset + bracketSize, offset);
            line(-offset, offset, -offset, offset - bracketSize);
            // Bottom-right
            line(offset, offset, offset - bracketSize, offset);
            line(offset, offset, offset, offset - bracketSize);
            pop();
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

            // Create explosion effect on destruction
            if (system && typeof system.addExplosion === 'function') {
                // Scale explosion size based on object size
                const explosionSize = Math.max(30, this.size * 0.8);
                system.addExplosion(this.pos.x, this.pos.y, explosionSize, [100, 150, 255]);
            }
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
            outpost: 'Outpost',
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
            quantumGate: 'Quantum Gate',
            prison: 'Prison Station',
            drugLab: 'Drug Laboratory',
            labourColony: 'Labour Colony'
            , undergroundMarket: 'Underground Market'
            , shipyard: 'Orbital Shipyard'
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

    /** 
     * Checks if a player can dock at this space object.
     * @param {Player} player - The player object to check.
     * @returns {boolean} True if the player can dock.
     */
    canPlayerDock(player) {
        if (!this.isDockable || this.destroyed || !player?.pos) return false;
        const dx = player.pos.x - this.pos.x;
        const dy = player.pos.y - this.pos.y;
        const distance = Math.sqrt(dx * dx + dy * dy);
        const speed = player.vel ? player.vel.mag() : 0;
        return distance < this.dockingRadius && speed < 0.5;
    }

    /**
     * Returns the commodities this space object trades in.
     * Used when player docks to determine available trades.
     * @returns {Object} Object with 'produces' and 'buys' arrays of commodity names.
     */
    getTradableCommodities() {
        return {
            produces: this.produces || [],
            buys: this.buys || []
        };
    }
}

// Export for environments that expect global registration
if (typeof window !== 'undefined') window.SpaceObject = SpaceObject;
