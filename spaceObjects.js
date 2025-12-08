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
    orbitalGarden: 260,
    decoyBuoy: 40,
    miningPlatform: 200,
    ancientRelic: 150,
    signalFlare: 60,
    outpost: 200,
    asteroidMiner: 100,
    fuelDepot: 90,
    commDish: 70,
    solarFarm: 150,
    iceCrystal: 120,
    nebulaFragment: 150,
    alienArtifact: 80,
    wreckage: 95,
    observatoryDome: 150,
    hydroponicsBay: 200,
    weaponPlatform: 200,
    shieldGenerator: 180,
    energyCollector: 130,
    quantumGate: 160,
    prison: 220,
    drugLab: 200,
    labourColony: 240,
    undergroundMarket: 250,
    shipyard: 320
};

// Mapping of what each SpaceObject type typically produces and what it will buy
// NOTE: Entries use canonical commodity names defined in `market.js`.
const SPACE_OBJECT_COMMODITIES = {
    miningPlatform: { produces: ['Metals','Minerals'], buys: ['Food','Chemicals','Machinery'] },
    asteroidMiner: { produces: ['Metals','Minerals'], buys: ['Chemicals'] },
    cargoCluster: { produces: ['Textiles','Machinery','Metals'], buys: ['Food','Chemicals'] },
    hydroponicsBay: { produces: ['Food'], buys: ['Metals','Chemicals','Machinery'] },
    orbitalGarden: { produces: ['Food'], buys: ['Chemicals','Machinery'] },
    fuelDepot: { produces: ['Chemicals'], buys: ['Metals','Machinery'] },
    researchArray: { produces: ['Adv Components','Computers'], buys: ['Food','Chemicals'] },
    outpost: { produces: ['Food','Textiles','Machinery','Chemicals'], buys: ['Metals','Adv Components'] },
    solarFarm: { produces: ['Metals','Adv Components'], buys: ['Machinery'] },
    energyCollector: { produces: ['Metals','Adv Components'], buys: ['Chemicals'] },
    observatoryDome: { produces: ['Computers'], buys: ['Chemicals'] },
    ancientRelic: { produces: ['Luxury Goods'], buys: [] },
    alienArtifact: { produces: ['Luxury Goods'], buys: [] },
    satellite: { produces: ['Computers'], buys: ['Metals'] },
    telescope: { produces: ['Computers','Adv Components'], buys: ['Metals'] },
    relay: { produces: ['Computers'], buys: ['Metals'] },
    habitat: { produces: ['Textiles','Food'], buys: ['Machinery','Metals'] },
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
    weaponPlatform: { produces: ['Weapons'], buys: ['Metals','Machinery'] },
    shieldGenerator: { produces: ['Adv Components'], buys: ['Metals'] },
    quantumGate: { produces: ['Adv Components','Computers'], buys: ['Metals'] },
    prison: { produces: ['Slaves'], buys: ['Food','Textiles','Machinery'] },
    drugLab: { produces: ['Narcotics','Medicine'], buys: ['Food','Chemicals'] },
    labourColony: { produces: ['Slaves','Metals','Textiles','Machinery'], buys: ['Food'] },
    undergroundMarket: { produces: [], buys: ['Slaves','Narcotics','Weapons'] },
    shipyard: { produces: [], buys: ['Food','Machinery','Adv Components','Computers'] },
    default: { produces: [], buys: [] }
};

// Animation rate constants for efficient update loop
// Format: [propertyName, rate] - properties with dynamic speeds use null
const ANIM_RATES = [
    ['relayPhase', 0.0001],
    ['habitatWindowPhase', 0.002],
    ['probeBlink', 0.001],
    ['solarSailAngle', 0.00004],
    ['engineGlow', 0.0045],
    ['engineParticlePhase', 0.005],
    ['cargoHatch', 0.0035],
    ['researchArraySweep', 0.00225],
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
    ['artifactPhase', 0.0035],
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
    ['searchlightPhase', 0.002],
    ['barrierPulse', 0.0025],
    ['flowPhase', 0.003],
    ['fanRotation', 0.004],
    ['drillSpin', 0.0005],
    ['conveyorPhase', 0.00035]
];

// Static renderers for each object type to replace the monolithic draw() switch
const SpaceObjectRenderers = {
    satellite: function(obj, size, anim, bob) {
        noStroke();
        
        // 3D layered solar panels with perspective depth
        // Left panel (back layer - darker, smaller)
        push();
        translate(-size * 0.78, bob);
        // Back layer (darker/further)
        fill(20, 60, 120);
        rect(-size * 0.02, size * 0.02, size * 0.64, size * 0.22, 3);
        // Front layer
        fill(30, 80, 160);
        rect(0, 0, size * 0.64, size * 0.22, 3);
        // Panel cell grid with depth shading
        stroke(20, 40, 90, 180);
        strokeWeight(1);
        for (let g = -2; g <= 2; g++) {
            const gx = g * (size * 0.64 / 6);
            line(-size * 0.32, gx, size * 0.32, gx);
        }
        // Highlight edge for 3D effect
        stroke(50, 120, 200, 150);
        strokeWeight(1.5);
        line(-size * 0.32, -size * 0.11, size * 0.32, -size * 0.11);
        noStroke();
        pop();
        
        // Right panel (symmetric)
        push();
        translate(size * 0.78, bob);
        fill(20, 60, 120);
        rect(size * 0.02, size * 0.02, size * 0.64, size * 0.22, 3);
        fill(30, 80, 160);
        rect(0, 0, size * 0.64, size * 0.22, 3);
        stroke(20, 40, 90, 180);
        strokeWeight(1);
        for (let g = -2; g <= 2; g++) {
            const gx = g * (size * 0.64 / 6);
            line(-size * 0.32, gx, size * 0.32, gx);
        }
        stroke(50, 120, 200, 150);
        strokeWeight(1.5);
        line(-size * 0.32, -size * 0.11, size * 0.32, -size * 0.11);
        noStroke();
        pop();
        
        // central bus with 3D depth shading
        // Shadow layer (back face)
        fill(150, 150, 170);
        rect(size * 0.02, bob + size * 0.02, size * 0.6, size * 0.42, 4);
        // Main face
        fill(190, 190, 210);
        rect(0, bob, size * 0.6, size * 0.42, 4);
        // Top edge highlight
        fill(220, 220, 230);
        rect(0, bob - size * 0.19, size * 0.58, size * 0.04, 2);
        
        // subtle underside shadow
        fill(0, 0, 0, 30);
        ellipse(0, size * 0.28 + bob, size * 0.5, size * 0.12);
        
        // small rivets/fasteners along bus edge (decorative)
        fill(160, 170, 180);
        for (let r = -2; r <= 2; r++) ellipse(-size * 0.18 + r * 8, -size * 0.06 + bob, 3, 3);
        noStroke();
        
        // antenna dish with 3D perspective
        // Dish shadow
        fill(90, 90, 100);
        ellipse(size * 0.28 + size * 0.01, -size * 0.12 + bob + size * 0.01, size * 0.22, size * 0.14);
        // Main dish
        fill(120);
        ellipse(size * 0.28, -size * 0.12 + bob, size * 0.22, size * 0.14);
        // Dish highlight
        fill(160, 160, 170);
        ellipse(size * 0.28 - size * 0.04, -size * 0.12 + bob - size * 0.02, size * 0.08, size * 0.05);
        
        // small nav light with flashing
        const flash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.1);
        fill(255, 90, 80, 255 * flash);
        ellipse(-size * 0.18, -size * 0.18 + bob, 4, 4);
        // glow around nav light
        fill(255, 120, 100, 80 * flash);
        ellipse(-size * 0.18, -size * 0.18 + bob, 8, 8);
        
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

    fuelDepot: function(obj, size, anim, bob) {
        // Central fuel depot: clustered tanks, manifold glow, fueling hoses, and service drones
        noStroke();

        // platform shadow/base
        fill(24, 28, 32);
        ellipse(0, size * 0.18 + bob, size * 0.88, size * 0.26);

        // tanks (three vertical tanks)
        const tankW = size * 0.22;
        const tankH = size * 0.44;
        for (let i = -1; i <= 1; i++) {
            push();
            translate(i * (tankW * 1.25), -size * 0.05 + bob);
            // tank body
            fill(120, 130, 140);
            rect(0, 0, tankW, tankH, 6);
            // top and bottom caps
            fill(150, 160, 170);
            ellipse(0, -tankH * 0.5, tankW * 0.9, tankW * 0.45);
            ellipse(0, tankH * 0.5, tankW * 0.9, tankW * 0.35);
            // inspection window / gauge
            fill(18, 100, 160, 200);
            rect(0, -tankH * 0.08, tankW * 0.28, tankH * 0.36, 3);
            // small status lights
            const flash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18 + i);
            fill(255 * (1 - flash), 255 * flash, 80, 220);
            ellipse(-tankW * 0.25, -tankH * 0.25, 4, 4);
            ellipse(tankW * 0.25, tankH * 0.25, 3, 3);
            pop();
        }

        // manifold pipe connecting tanks
        stroke(90, 90, 100);
        strokeWeight(3);
        line(-tankW * 1.25, -size * 0.15 + bob, 0, -size * 0.15 + bob);
        line(tankW * 1.25, -size * 0.15 + bob, 0, -size * 0.15 + bob);
        noStroke();

        // glowing manifold indicator
        const phase = (anim && typeof anim.fuelPulse === 'number') ? anim.fuelPulse : obj.bobPhase;
        const glow = 0.6 + 0.4 * Math.sin(phase * 0.006);
        fill(80, 200, 220, 80 + 80 * glow);
        ellipse(0, -size * 0.15 + bob, size * 0.36 * (0.9 + 0.1 * glow), size * 0.12 * (0.9 + 0.1 * glow));

        // fueling hoses with animated flow particles (bezier paths)
        for (let h = -1; h <= 1; h += 2) {
            const hx = h * (tankW * 1.05);
            const hy = -size * 0.15 + bob;
            const tx = hx + h * (size * 0.7);
            const ty = hy + size * 0.18;
            // hose curve
            stroke(60, 120, 140, 180);
            strokeWeight(2);
            noFill();
            bezier(hx, hy, hx + h * (size * 0.18), hy + size * 0.08, tx - h * (size * 0.12), ty - size * 0.06, tx, ty);
            noStroke();
            // animated flow dots along hose
            const hosePhase = (anim && typeof anim.hosePhase === 'number') ? anim.hosePhase : obj.bobPhase;
            for (let p = 0; p < 4; p++) {
                const t = ( (hosePhase * 0.004) + p * 0.24 ) % 1;
                const bx = bezierPoint(hx, hx + h * (size * 0.18), tx - h * (size * 0.12), tx, t);
                const by = bezierPoint(hy, hy + size * 0.08, ty - size * 0.06, ty, t);
                fill(80, 200, 255, 180 - p * 30);
                ellipse(bx, by, 3, 2);
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
            fill(220, 200, 160);
            ellipse(dx, dy, 6, 4);
            stroke(200, 180, 140, 120);
            strokeWeight(0.6);
            line(dx, dy, dx - Math.cos(fd.ang) * 6, dy - Math.sin(fd.ang) * 4);
            noStroke();
        }

        // landing/warning lights and small markers
        const warn = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.28);
        fill(255, 100, 60, 220 * warn);
        ellipse(0, size * 0.38 + bob, 6, 4);
        fill(255, 255, 0, 180 * warn);
        ellipse(-size * 0.18, size * 0.36 + bob, 4, 3);
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
        // Enhanced relay with 3D antenna array and depth perspective
        const relayPhase = (anim ? anim.relayPhase : 0) + obj.bobPhase * 0.06;
        
        // Draw antennae with depth layers (back ones darker/smaller)
        for (let i = 0; i < 5; i++) {
            const a = (i / 5) * TWO_PI + relayPhase * (i%2?1:-1);
            const lx = Math.cos(a) * (size * 0.6);
            const ly = Math.sin(a) * (size * 0.3);
            
            // Determine depth layer (back vs front)
            const depth = Math.sin(a + relayPhase * 0.5);
            const isBack = depth < 0;
            
            // Antenna arm with depth
            stroke(isBack ? 160 : 200);
            strokeWeight(isBack ? 1 : 1.5);
            line(0, 0, lx, ly);
            noStroke();
            
            // Dish with depth shading
            // Shadow layer
            if (!isBack) {
                fill(160, 160, 170);
                ellipse(lx + size * 0.005, ly + size * 0.005, size * 0.12, size * 0.08);
            }
            // Main dish
            fill(isBack ? 180 : 200);
            ellipse(lx, ly, size * 0.12, size * 0.08);
            // Dish highlight
            if (!isBack) {
                fill(230, 230, 240);
                ellipse(lx - size * 0.02, ly - size * 0.01, size * 0.04, size * 0.03);
            }
        }
        
        // hub with depth layers and small panel decals
        // Shadow
        fill(140, 140, 150);
        ellipse(size * 0.01, size * 0.01, size * 0.36, size * 0.26);
        // Main hub
        fill(170);
        ellipse(0, 0, size * 0.36, size * 0.26);
        // Top highlight
        fill(200, 200, 210);
        ellipse(-size * 0.04, -size * 0.04, size * 0.18, size * 0.13);
        
        // Panel decals with depth
        fill(80, 100, 130);
        rect(-size * 0.06 + size * 0.005, size * 0.005, size * 0.08, size * 0.04, 2);
        fill(100, 120, 150);
        rect(-size * 0.06, 0, size * 0.08, size * 0.04, 2);
        fill(80, 100, 130);
        rect(size * 0.06 + size * 0.005, size * 0.005, size * 0.08, size * 0.04, 2);
        fill(100, 120, 150);
        rect(size * 0.06, 0, size * 0.08, size * 0.04, 2);
        
        // rotating decorative pips with depth (low-cost visual motion)
        for (let p = 0; p < 4; p++) {
            const a = relayPhase + p * (TWO_PI / 4);
            const lx = Math.cos(a) * (size * 0.46);
            const ly = Math.sin(a) * (size * 0.14);
            const depth = Math.sin(a);
            const isBack = depth < 0;
            fill(isBack ? 180 : 200, isBack ? 200 : 220, isBack ? 220 : 240, isBack ? 150 : 200);
            ellipse(lx, ly, isBack ? 3 : 4, isBack ? 2 : 3);
        }
        
        // Flashing status lights with glows
        const flash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.15);
        fill(255, 255, 0, 80 * flash);
        ellipse(-size * 0.1, -size * 0.08, 6, 6);
        fill(255, 255, 0, 255 * flash);
        ellipse(-size * 0.1, -size * 0.08, 3, 3);
        fill(255, 0, 255, 80 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.15 + 1)));
        ellipse(size * 0.1, -size * 0.08, 6, 6);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.15 + 1)));
        ellipse(size * 0.1, -size * 0.08, 3, 3);
        
        // Slow-moving auxiliary antenna with depth
        push();
        rotate(Math.sin(obj.bobPhase * 0.003) * 0.2);
        stroke(160, 170, 180);
        strokeWeight(1.5);
        line(0, 0, size * 0.4, -size * 0.2);
        stroke(200, 210, 220);
        strokeWeight(1);
        line(0, 0, size * 0.38, -size * 0.19);
        noStroke();
        fill(140, 150, 160);
        ellipse(size * 0.4 + 1, -size * 0.2 + 1, 6, 4);
        fill(160, 170, 180);
        ellipse(size * 0.4, -size * 0.2, 6, 4);
        pop();
        
        // Decorative concentric rings with perspective
        noFill();
        stroke(130, 140, 150, 80);
        strokeWeight(0.8);
        ellipse(0, 0, size * 0.5, size * 0.35);
        stroke(140, 150, 160, 60);
        strokeWeight(0.5);
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
        pop(); // close swivel push() opened earlier
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
        // Enhanced 3D debris with tumbling motion and depth
        noStroke();
        if (obj._shards && obj._shards.length) {
            for (let i = 0; i < obj._shards.length; i++) {
                const sh = obj._shards[i];
                push();
                translate(sh.rx, sh.ry);
                
                // 3D tumbling rotation (combine slow rotation with bobPhase)
                const tumbleAngle = sh.angle + Math.sin(obj.bobPhase * 0.002) * 0.03;
                rotate(tumbleAngle);
                
                // Draw shadow layer (back face - darker and offset)
                fill(100, 90, 80);
                push();
                translate(size * 0.01, size * 0.01);
                beginShape();
                for (let v = 0; v < sh.verts; v++) {
                    const a = v * (TWO_PI / sh.verts) + (v % 2 ? 0.2 : -0.15);
                    const rr = sh.rrScale * (size * 0.12) * (0.6 + (v % 3) * 0.15);
                    vertex(Math.cos(a) * rr, Math.sin(a) * rr);
                }
                endShape(CLOSE);
                pop();
                
                // Main shard body
                fill(140, 120, 110);
                beginShape();
                for (let v = 0; v < sh.verts; v++) {
                    const a = v * (TWO_PI / sh.verts) + (v % 2 ? 0.2 : -0.15);
                    const rr = sh.rrScale * (size * 0.12) * (0.6 + (v % 3) * 0.15);
                    vertex(Math.cos(a) * rr, Math.sin(a) * rr);
                }
                endShape(CLOSE);
                
                // Highlight edge for 3D depth
                fill(180, 160, 140);
                beginShape();
                for (let v = 0; v < sh.verts; v++) {
                    const a = v * (TWO_PI / sh.verts) + (v % 2 ? 0.2 : -0.15);
                    const rr = sh.rrScale * (size * 0.08) * (0.5 + (v % 3) * 0.12);
                    vertex(Math.cos(a) * rr, Math.sin(a) * rr);
                }
                endShape(CLOSE);
                
                // edge scratch with depth
                stroke(200, 180, 160, 150);
                strokeWeight(1);
                line(-size * 0.12, -size * 0.06, size * 0.12, size * 0.06);
                stroke(140, 120, 100, 100);
                strokeWeight(0.6);
                line(-size * 0.12 + 1, -size * 0.06 + 1, size * 0.12 + 1, size * 0.06 + 1);
                noStroke();
                pop();
            }
            
            // Enhanced drifting dust puffs with depth layers
            for (let d = 0; d < 3; d++) {
                const da = obj.bobPhase * 0.001 + d * 2.1;
                const dx = Math.cos(da) * size * 0.32;
                const dy = Math.sin(da) * size * 0.12 + bob * 0.08;
                // Back layer
                fill(160, 140, 120, 40);
                ellipse(dx + 2, dy + 1, 8, 4);
                // Front layer
                fill(180, 160, 140, 60);
                ellipse(dx, dy, 6, 3);
            }
            
            // Flashing hazard lights with glows
            const hazardFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25);
            fill(255, 0, 0, 80 * hazardFlash);
            ellipse(0, -size * 0.1 + bob, 8, 8);
            fill(255, 0, 0, 200 * hazardFlash);
            ellipse(0, -size * 0.1 + bob, 4, 4);
            fill(255, 255, 0, 80 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + 1)));
            ellipse(size * 0.1, size * 0.1 + bob, 6, 6);
            fill(255, 255, 0, 200 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.25 + 1)));
            ellipse(size * 0.1, size * 0.1 + bob, 3, 3);
            
            // Slow-moving glowing particles with motion trails
            for (let p = 0; p < 2; p++) {
                const pa = obj.bobPhase * 0.003 + p * 3.14;
                const pr = size * 0.2;
                const px = Math.cos(pa) * pr;
                const py = Math.sin(pa) * pr + bob * 0.05;
                // Trail
                fill(200, 150, 100, 50 + 30 * Math.sin(pa));
                for (let t = 1; t <= 3; t++) {
                    const tx = Math.cos(pa - t * 0.1) * pr;
                    const ty = Math.sin(pa - t * 0.1) * pr + bob * 0.05;
                    ellipse(tx, ty, 3 - t * 0.5, 3 - t * 0.5);
                }
                // Particle
                fill(220, 170, 120, 120 + 80 * Math.sin(pa));
                ellipse(px, py, 2.5, 2.5);
            }
        }
    },

    probe: function(obj, size, anim, bob) {
        // Enhanced probe with 3D depth layers
        noStroke();
        
        // Body with depth shading (back face darker)
        fill(180, 180, 200);
        rect(size * 0.01, bob + size * 0.01, size * 0.18, size * 0.9, 3);
        // Front face
        fill(200, 200, 220);
        rect(0, bob, size * 0.18, size * 0.9, 3);
        // Top highlight edge for 3D feel
        fill(230, 230, 250);
        rect(0, bob - size * 0.44, size * 0.16, size * 0.04, 2);
        
        // nose cone with depth gradient
        fill(150, 150, 170);
        triangle(0 - size * 0.09, -size * 0.45 + bob, 0 + size * 0.09, -size * 0.45 + bob, 0, -size * 0.62 + bob);
        fill(190, 190, 210);
        triangle(0 - size * 0.06, -size * 0.45 + bob, 0 + size * 0.06, -size * 0.45 + bob, 0, -size * 0.58 + bob);
        
        // small solar panel with depth layers
        // Back layer
        fill(20, 60, 120);
        rect(size * 0.01, size * 0.28 + bob + size * 0.01, size * 0.36, size * 0.08, 2);
        // Front layer
        fill(30, 80, 160);
        rect(0, size * 0.28 + bob, size * 0.36, size * 0.08, 2);
        stroke(20,40,90,160); strokeWeight(0.6);
        for (let l = -1; l <= 1; l++) line(-size*0.16, size * 0.28 + bob + l * 3, size*0.16, size * 0.28 + bob + l * 3);
        noStroke();
        
        // small blinking nav light with volumetric glow
        const blink = 0.5 + 0.5 * Math.sin(anim ? anim.probeBlink : obj.bobPhase * 0.1);
        fill(255, 140, 80, 80 * blink);
        ellipse(0, -size * 0.42 + bob, 12 * (1 + blink * 0.5), 12 * (1 + blink * 0.5));
        fill(255, 140, 80, 220 * blink);
        ellipse(0, -size * 0.42 + bob, 5 * (1 + blink), 5 * (1 + blink));
        
        // Enhanced engine trail with perspective cone
        fill(100, 160, 235, 30);
        ellipse(0, size * 0.52 + bob, size * 0.36, size * 0.12);
        fill(120, 180, 255, 50);
        ellipse(0, size * 0.48 + bob, size * 0.28, size * 0.08);
        fill(140, 200, 255, 70);
        ellipse(0, size * 0.45 + bob, size * 0.20, size * 0.05);
        
        // Flashing status lights with glows
        const statusFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18);
        fill(0, 255, 0, 60 * statusFlash);
        ellipse(-size * 0.06, size * 0.1 + bob, 6, 6);
        fill(0, 255, 0, 255 * statusFlash);
        ellipse(-size * 0.06, size * 0.1 + bob, 3, 3);
        fill(255, 0, 255, 60 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.18 + 1)));
        ellipse(size * 0.06, size * 0.1 + bob, 6, 6);
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
        
        // Decorative sensor bands with depth
        stroke(120, 130, 140, 150);
        strokeWeight(0.5);
        for (let b = 0; b < 3; b++) {
            const by = -size * 0.2 + b * (size * 0.15) + bob;
            line(-size * 0.08, by, size * 0.08, by);
        }
        // Highlight on left side
        stroke(160, 170, 180, 100);
        for (let b = 0; b < 3; b++) {
            const by = -size * 0.2 + b * (size * 0.15) + bob - 1;
            line(-size * 0.08, by, size * 0.08, by);
        }
        noStroke();
    },

    beacon: function(obj, size, anim, bob) {
        // Enhanced beacon with volumetric 3D light cone and depth
        noStroke();
        
        // Body with depth layers
        fill(80, 80, 90);
        rect(size * 0.01, 6 + bob + size * 0.01, size * 0.18, size * 0.5, 3);
        fill(100, 100, 110);
        rect(0, 6 + bob, size * 0.18, size * 0.5, 3);
        // Top highlight
        fill(130, 130, 140);
        rect(0, -size * 0.18 + bob, size * 0.16, size * 0.04, 2);
        
        // Volumetric light cone with multiple layers
        const pulse = (Math.sin(obj.bobPhase * 1.6) + 1) * 0.5;
        const glow = 0.5 + 0.5 * pulse;
        
        // Outer glow layers (fade out with distance)
        for (let i = 3; i >= 0; i--) {
            const layerSize = size * (0.6 + i * 0.3) * (0.9 + 0.4 * pulse);
            fill(255, 220, 60, (40 - i * 8) * glow);
            ellipse(0, -size * 0.12 + bob, layerSize, layerSize * 0.7);
        }
        
        // Core light
        fill(255, 240, 100, 220 * glow);
        ellipse(0, -size * 0.12 + bob, size * 0.42 * (0.9 + 0.4 * pulse));
        fill(255, 255, 180, 255 * glow);
        ellipse(0, -size * 0.12 + bob, size * 0.2 * (0.9 + 0.4 * pulse));
        
        // Rotating light beam cone (3D perspective)
        push();
        rotate(obj.bobPhase * 0.002);
        // Beam cone with gradient
        fill(255, 220, 60, 50 * glow);
        beginShape();
        vertex(0, -size * 0.12 + bob);
        vertex(-size * 0.15, -size * 0.7 + bob);
        vertex(size * 0.15, -size * 0.7 + bob);
        endShape(CLOSE);
        // Beam core line
        stroke(255, 240, 120, 180 * glow);
        strokeWeight(2);
        line(0, -size * 0.12 + bob, 0, -size * 0.7 + bob);
        noStroke();
        pop();
        
        // Rotating halo rings
        noFill();
        stroke(220, 200, 80, 70 * glow);
        strokeWeight(1.5);
        ellipse(0, 0 + bob, size * (0.9 + pulse * 0.6), size * (0.65 + pulse * 0.4));
        stroke(200, 180, 60, 50 * glow);
        strokeWeight(1);
        ellipse(0, 0 + bob, size * (1.1 + pulse * 0.8), size * (0.8 + pulse * 0.5));
        noStroke();
        
        // Flashing auxiliary lights with glows
        const auxFlash = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3);
        fill(0, 255, 255, 80 * auxFlash);
        ellipse(-size * 0.08, size * 0.1 + bob, 6, 6);
        fill(0, 255, 255, 255 * auxFlash);
        ellipse(-size * 0.08, size * 0.1 + bob, 3, 3);
        fill(255, 0, 255, 80 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.08, size * 0.1 + bob, 6, 6);
        fill(255, 0, 255, 255 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.3 + 1)));
        ellipse(size * 0.08, size * 0.1 + bob, 3, 3);
        
        // Slow-moving antenna array with depth
        push();
        rotate(Math.sin(obj.bobPhase * 0.005) * 0.3);
        stroke(100, 110, 120);
        strokeWeight(1.2);
        for (let a = 0; a < 3; a++) {
            const aa = a * (TWO_PI / 3);
            line(0, bob, Math.cos(aa) * size * 0.15, Math.sin(aa) * size * 0.15 + bob);
        }
        stroke(140, 150, 160);
        strokeWeight(0.8);
        for (let a = 0; a < 3; a++) {
            const aa = a * (TWO_PI / 3);
            line(0, bob - size * 0.02, Math.cos(aa) * size * 0.12, Math.sin(aa) * size * 0.12 + bob - size * 0.02);
        }
        noStroke();
        fill(160, 170, 180);
        ellipse(0, bob - size * 0.05, 5, 5);
        fill(140, 150, 160);
        ellipse(0, bob - size * 0.03, 3, 3);
        pop();
        
        // Decorative base with depth
        fill(60, 60, 70);
        rect(-size * 0.05 + size * 0.005, size * 0.3 + bob + size * 0.005, size * 0.1, size * 0.08, 2);
        fill(80, 80, 90);
        rect(-size * 0.05, size * 0.3 + bob, size * 0.1, size * 0.08, 2);
    },

    outpost: function(obj, size, anim, bob) {
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

    undergroundMarket: function(obj, size, anim, bob) {
        // Dark, low-profile black market hub with neon signage and covered cargo crates
        noStroke();
        // base platform shadow
        fill(10, 12, 14);
        ellipse(0, size * 0.2 + bob, size * 0.9, size * 0.24);

        // main low-slung structure
        fill(30, 30, 38);
        rect(0, bob, size * 0.7, size * 0.28, 6);

        // covered cargo crates / cages
        fill(50, 40, 38);
        for (let i = -1; i <= 1; i++) {
            rect(i * size * 0.22, bob + size * 0.06, size * 0.24, size * 0.16, 3);
            stroke(18, 18, 20, 120); strokeWeight(1);
            line(i * size * 0.22 - size * 0.12, bob + size * 0.06 - size * 0.06, i * size * 0.22 + size * 0.12, bob + size * 0.06 - size * 0.06);
            noStroke();
        }

        // neon signage strips (animated pulse)
        const pulse = 0.6 + 0.4 * Math.sin(anim ? (anim.marketPulse || 0) : obj.bobPhase * 0.02);
        // red 'off' neon
        fill(160, 24, 24, 160 * pulse);
        rect(-size * 0.18, bob - size * 0.08, size * 0.36, 6, 2);
        // cyan accent
        fill(24, 180, 200, 140 * (0.6 + 0.4 * Math.cos(obj.bobPhase * 0.02)));
        rect(size * 0.18, bob - size * 0.08, size * 0.28, 4, 2);

        // silhouette figures near entrances (tiny human shapes)
        fill(12, 12, 12);
        for (let s = -1; s <= 1; s++) {
            const sx = s * size * 0.26;
            const sy = bob + size * 0.14;
            ellipse(sx, sy - 6, 6, 6);
            rect(sx, sy - 0, 3, 6, 1);
        }

        // small security drone(s)
        fill(90, 90, 100);
        ellipse(size * 0.38, bob - size * 0.02, 8, 6);
        stroke(80, 160, 200, 80); strokeWeight(0.8);
        line(size * 0.38, bob - size * 0.02, size * 0.48, bob - size * 0.06);
        noStroke();

        // faint glow under structure for atmosphere
        fill(24, 40, 50, 28);
        ellipse(0, bob + size * 0.36, size * 0.8, size * 0.12);
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
        rotate((anim ? anim.researchArraySweep : 0) * 0.04);
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
        // Polished orbital garden: add glass dome, small reflective pond, richer plant variety, soft rim lighting and layered particles
        push();
        noStroke();

        const phase = (anim ? anim.pollinatorPhase : 0) + obj.bobPhase * 0.001;

        // Platform shadow (soft, multi-layer)
        fill(8, 18, 12, 200);
        ellipse(0, size * 0.18 + bob, size * 0.92, size * 0.22);
        fill(10, 16, 12, 100);
        ellipse(0, size * 0.20 + bob, size * 0.7, size * 0.12);

        // Terraced planting rings with smoother gradients
        const rings = [ {c:[50,120,70]}, {c:[70,160,90]}, {c:[100,190,120]} ];
        for (let r = 0; r < rings.length; r++) {
            const rScale = 0.78 - r * 0.18;
            const ry = -size * 0.02 + bob + r * (size * 0.04);
            for (let g = 0; g < 5; g++) {
                const t = g / 5;
                const alpha = 180 * (1 - t) * (1 - r * 0.12);
                fill(rings[r].c[0], rings[r].c[1], rings[r].c[2], alpha);
                ellipse(0, ry + t * 2, size * rScale * (1 - t * 0.05), size * (0.22 - r * 0.03) * (1 - t * 0.14));
            }
            stroke(24, 46, 28, 90); strokeWeight(0.6); noFill();
            ellipse(0, ry, size * rScale * 0.98, size * (0.22 - r * 0.03) * 0.98);
            noStroke();
        }

        // plant clusters initialization (more variety) — cached per object
        if (!obj._gardenPlants) {
            obj._gardenPlants = [];
            const seed = (obj.id || Math.floor(Math.random() * 10000));
            for (let i = 0; i < 16; i++) {
                const ang = (i / 16) * TWO_PI + (seed % 11) * 0.09;
                const ring = Math.floor(Math.random() * 3);
                const rad = size * (0.16 + ring * 0.14 + Math.random() * 0.08);
                const type = Math.floor(Math.random() * 3);
                obj._gardenPlants.push({ ang: ang, rad: rad, sz: 4 + Math.random() * 8, sway: Math.random() * 0.9, type: type });
            }
        }

        // central pond (reflective) and small fountain ripple
        const centerY = -size * 0.06 + bob;
        fill(24, 48, 58);
        ellipse(0, centerY + size * 0.02, size * 0.18, size * 0.08);
        fill(120, 190, 220, 20);
        ellipse(0, centerY + size * 0.02, size * 0.12 + Math.sin(phase * 0.9) * 1.6, size * 0.05 + Math.cos(phase * 0.9) * 1.2);

        // sculpted tree: layered canopy with highlight
        fill(90, 150, 96);
        ellipse(0, centerY - size * 0.16, size * 0.26, size * 0.14);
        fill(56, 206, 110, 220);
        ellipse(0, centerY - size * 0.14, size * 0.18, size * 0.10);
        fill(120, 78, 46);
        rect(0, centerY - size * 0.05, size * 0.035, size * 0.10, 3);
        // bright specular on canopy
        fill(255,255,240,24);
        ellipse(-size*0.04, centerY - size*0.17, size*0.12, size*0.05);

        // delicate vines and stonework paths
        for (let v = 0; v < 5; v++) {
            const va = v * (TWO_PI / 5) + Math.sin(obj.bobPhase * 0.0009 + v) * 0.06;
            const vx1 = Math.cos(va) * size * 0.42;
            const vy1 = Math.sin(va) * size * 0.18 + bob * 0.02;
            const vx2 = Math.cos(va + 0.18) * size * 0.22;
            const vy2 = Math.sin(va + 0.18) * size * 0.12 + bob * 0.01;
            stroke(36, 80, 44, 110); strokeWeight(0.6); noFill();
            bezier(vx1, vy1, vx1 * 0.6, vy1 * 0.8, vx2 * 0.85, vy2 * 0.85, vx2, vy2);
            noStroke();
        }

        // rotating shade ring (thin glass-like band) above garden
        push();
        translate(0, centerY - size * 0.04);
        rotate((anim ? anim.gardenShadeAngle : 0) + Math.sin(obj.bobPhase * 0.0012) * 0.02);
        fill(12, 20, 14, 36);
        ellipse(0, 0, size * 0.72, size * 0.72);
        stroke(18, 36, 28, 60); strokeWeight(0.6); noFill(); ellipse(0, 0, size * 0.72, size * 0.72); noStroke();
        pop();

        // draw plants — different types for variety
        for (let i = 0; i < obj._gardenPlants.length; i++) {
            const p = obj._gardenPlants[i];
            const sway = Math.sin(phase * 0.9 + p.sway) * 2.5;
            const px = Math.cos(p.ang) * p.rad * 0.52;
            const py = Math.sin(p.ang) * p.rad * 0.28 + bob * 0.02;
            push(); translate(px + Math.sin((obj.bobPhase * 0.002) + i) * 1.2, py);
            rotate(Math.sin(i * 0.9 + p.sway) * 0.5 + sway * 0.01);
            if (p.type === 0) {
                // broad leaf cluster
                fill(60, 150, 90, 220);
                ellipse(0, 0, p.sz * 1.0, p.sz * 0.6);
                fill(40, 120, 70, 180); ellipse(-p.sz*0.3, -p.sz*0.15, p.sz*0.5, p.sz*0.3);
            } else if (p.type === 1) {
                // spire flowers
                fill(220, 190, 110, 230); ellipse(0, -p.sz*0.4, p.sz*0.3, p.sz*0.5);
                fill(60,160,90,200); ellipse(0, 0, p.sz*0.6, p.sz*0.4);
            } else {
                // fern-like fractal
                fill(70, 170, 100, 220);
                for (let f = 0; f < 3; f++) ellipse(-f*2 + f*2, f*2 - 2, p.sz*0.6 - f*1.8, p.sz*0.28);
            }
            pop();
        }

        // small path lights (dim, warmer)
        for (let r = 0; r < 3; r++) {
            const pts = 6 + r * 2;
            const rScale = 0.78 - r * 0.18;
            const ry = -size * 0.02 + bob + r * (size * 0.04);
            for (let pi = 0; pi < pts; pi++) {
                const a = (pi / pts) * TWO_PI + (obj.bobPhase * 0.0009 * (r + 1));
                const lx = Math.cos(a) * size * rScale * 0.48;
                const ly = Math.sin(a) * size * (0.22 - r * 0.03) * 0.28 + ry;
                fill(240, 200, 140, 60);
                ellipse(lx, ly, 2.2, 2.2);
            }
        }

        // refined pollinators / motes — layered glows and soft trails
        for (let m = 0; m < 8; m++) {
            const a = phase * (0.9 + m * 0.05) + m * 0.9;
            const r = size * (0.2 + (m % 3) * 0.05);
            const x = Math.cos(a) * r * 0.5;
            const y = Math.sin(a) * r * 0.26 + bob * 0.01 + Math.sin(a * 0.6) * 0.6;
            fill(255, 230, 140, 140 - m * 10);
            ellipse(x, y, 3 + (m % 2), 2.5 + (m % 2));
            fill(255, 200, 120, 40);
            ellipse(x - Math.cos(a) * 3, y - Math.sin(a) * 1.6, 1.8, 1.0);
        }

        // subtle central ambient glow layers
        for (let g = 0; g < 3; g++) {
            fill(100, 200, 150, 26 - g * 6);
            ellipse(0, centerY + size * 0.02, size * (0.36 + g * 0.16), size * (0.16 + g * 0.06));
        }

        // small maintenance bots (minimal visibility)
        for (let b = 0; b < 2; b++) {
            const bx = Math.sin(obj.bobPhase * 0.003 + b * 0.9) * (size * 0.14);
            const by = size * 0.24 + bob * 0.06 - b * (size * 0.02);
            fill(200, 190, 160);
            rect(bx, by, 8, 5, 1.5);
            fill(0, 0, 0, 24);
            ellipse(bx, by + 4, 10, 3);
        }

        // translucent glass dome overlay (very subtle)
        push();
        translate(0, centerY - size * 0.12);
        fill(210, 235, 255, 22);
        ellipse(0, 0, size * 0.9, size * 0.5);
        stroke(200,225,245,30); strokeWeight(0.8); noFill(); ellipse(0, 0, size * 0.9, size * 0.5); noStroke();
        pop();

        pop();
    },

    hydroponicsBay: function(obj, size, anim, bob) {
        // Hydroponics Bay: rows of grow trays, overhead LED arrays, nutrient pipes and a maintenance arm
        push();
        noStroke();

        // translucent dome/top shield
        fill(200, 235, 250, 80);
        ellipse(0, -size * 0.18 + bob, size * 0.9, size * 0.42);
        fill(180, 210, 230, 60);
        ellipse(0, -size * 0.18 + bob, size * 0.78, size * 0.36);

        // platform base shadow
        fill(20, 30, 24, 220);
        ellipse(0, size * 0.22 + bob, size * 0.9, size * 0.22);

        // grow tray rows
        const rows = 3;
        const trayW = size * 0.7;
        const trayH = size * 0.12;
        for (let r = 0; r < rows; r++) {
            const ry = -size * 0.04 + bob + r * (trayH + 6);
            // tray body
            fill(40, 60, 50);
            rect(0, ry, trayW, trayH, 4);
            // nutrient channel
            fill(30, 90, 110);
            rect(-trayW * 0.36, ry + trayH * 0.18, trayW * 0.18, trayH * 0.22, 2);
            rect(trayW * 0.36, ry + trayH * 0.18, trayW * 0.18, trayH * 0.22, 2);
            // plants (stylized leaves) with small sway from hydroponicCycle
            for (let p = -2; p <= 2; p++) {
                const px = p * (trayW * 0.18);
                const sway = Math.sin((anim ? anim.hydroponicCycle : obj.bobPhase) * 0.9 + p) * 2;
                fill(80, 200, 120, 240);
                ellipse(px, ry - trayH * 0.12 + sway, trayH * 0.48, trayH * 0.7);
                fill(40, 120, 70, 200);
                ellipse(px, ry - trayH * 0.12 + sway + 2, trayH * 0.2, trayH * 0.3);
            }
            // tray separators / rails
            stroke(16, 24, 20, 160); strokeWeight(0.8);
            line(-trayW * 0.5, ry + trayH * 0.45, trayW * 0.5, ry + trayH * 0.45);
            noStroke();
        }

        // overhead LED grow light bars (animated intensity)
        const lightPhase = (anim ? anim.lightPhase : obj.bobPhase * 0.5);
        for (let l = -1; l <= 1; l++) {
            const lx = l * (size * 0.28);
            const ly = -size * 0.28 + bob;
            // support rod
            stroke(110, 120, 110); strokeWeight(1);
            line(lx, ly - 6, lx, ly + size * 0.18);
            noStroke();
            // light bar with pulsing pink/blue spectrum mix
            const intensity = 0.6 + 0.4 * Math.sin(lightPhase * (1 + l * 0.12) + l);
            fill(220 * intensity, 120 * intensity, 200 * intensity, 160 * intensity);
            rect(lx, ly + size * 0.06, size * 0.36, 6, 3);
        }

        // central reservoir / nutrient tank
        fill(40, 80, 100);
        rect(0, size * 0.36 + bob, size * 0.32, size * 0.12, 4);
        fill(80, 180, 200, 160);
        rect(0, size * 0.36 + bob, size * 0.24, size * 0.06, 2);

        // nutrient pipes and animated flow indicators
        stroke(90, 120, 110); strokeWeight(1.6);
        line(-size * 0.18, size * 0.36 + bob, -size * 0.36, -size * 0.02 + bob);
        line(size * 0.18, size * 0.36 + bob, size * 0.36, -size * 0.02 + bob);
        noStroke();
        // flowing droplets along pipes (cheap animation)
        const nf = (anim ? anim.nutrientFlow : obj.bobPhase * 0.002);
        fill(100, 200, 220, 200);
        ellipse(-size * 0.26 + Math.sin(nf) * 6, size * 0.18 + bob, 4, 3);
        ellipse(size * 0.26 + Math.cos(nf * 1.3) * 6, size * 0.18 + bob, 4, 3);

        // maintenance arm that reaches across trays
        push();
        translate(-size * 0.34, -size * 0.06 + bob);
        rotate(Math.sin(anim ? anim.armPhase : obj.bobPhase * 0.002) * 0.45);
        stroke(140, 150, 140); strokeWeight(2);
        line(0, 0, size * 0.5, 0);
        noStroke();
        fill(160, 160, 170);
        ellipse(size * 0.5, 0, 6, 6);
        pop();

        // small status lights and indicators around bay
        const status = 0.5 + 0.5 * Math.sin(obj.bobPhase * 0.28);
        fill(255, 200, 80, 200 * status);
        ellipse(-size * 0.4, -size * 0.18 + bob, 4, 3);
        fill(120, 220, 180, 200 * (0.5 + 0.5 * Math.sin(obj.bobPhase * 0.22)));
        ellipse(size * 0.4, -size * 0.18 + bob, 4, 3);

        // small service bot docks at edges
        fill(200, 180, 140);
        rect(-size * 0.5, size * 0.34 + bob, 10, 6, 2);
        rect(size * 0.5, size * 0.34 + bob, 10, 6, 2);

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
            const spin = (anim ? anim.miningSpin : 0) + (obj.bobPhase * 0.002) + a * 0.2;
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

    alienArtifact: function(obj, size, anim, bob) {
        // Amorphous alien artifact blob: layered lobes, pulsing core, drifting motes and subtle glyphs
        noStroke();
        const phase = (typeof anim.artifactPhase === 'number') ? anim.artifactPhase : obj.bobPhase;
        const jitter = (typeof anim.artifactJitter === 'number') ? anim.artifactJitter : 0.4;

        // Base multi-layered lobes (give it an organic, shifting silhouette)
        for (let i = 0; i < 5; i++) {
            const lPhase = phase * (0.9 + i * 0.06) + i * 1.3;
            const lx = Math.cos(lPhase) * size * 0.06 * (1 + i * 0.08) + Math.sin(phase * 0.7 + i) * jitter * 2;
            const ly = Math.sin(lPhase * 1.1) * size * 0.04 * (1 + i * 0.06) + bob * (0.06 + i * 0.02);
            const lw = size * (0.9 - i * 0.12) * (0.88 + 0.06 * Math.sin(phase * (1 + i * 0.2)));
            const lh = size * (0.6 - i * 0.08);
            fill(40 + i * 18, 120 + i * 18, 160 + i * 10, 140 - i * 18);
            ellipse(lx, ly, lw, lh);
        }

        // Subtle translucent veins reaching out from the core
        stroke(140, 210, 240, 110);
        strokeWeight(1);
        for (let v = 0; v < 6; v++) {
            const a = v * (TWO_PI / 6) + phase * 0.7;
            const vx = Math.cos(a) * size * 0.22;
            const vy = Math.sin(a) * size * 0.14 + bob * 0.03;
            line( Math.cos(phase * 0.2) * (size * 0.02), bob * 0.01, vx, vy );
        }
        noStroke();

        // Pulsing inner core
        const corePulse = 0.6 + 0.6 * Math.sin(phase * 1.6);
        fill(200, 255, 245, 220 * corePulse);
        ellipse(0, bob * 0.04, size * 0.28 * (0.8 + 0.2 * Math.sin(phase * 1.7)), size * 0.18 * (0.8 + 0.2 * Math.sin(phase * 1.7)));

        // Drifting motes and micro-particles for atmosphere
        for (let p = 0; p < 4; p++) {
            const pa = phase * (0.6 + p * 0.12) + p * 1.9;
            const pr = size * (0.38 + p * 0.06);
            fill(120, 200, 240, 60 + p * 10);
            ellipse(Math.cos(pa) * pr * 0.6, Math.sin(pa) * pr * 0.34 + bob * 0.12, 3 + (p % 2), 2 + (p % 2));
        }

        // Tiny rotating glyphs that subtly orbit the blob (give alien feel)
        push();
        rotate(phase * 0.18);
        fill(220, 255, 230, 150);
        for (let g = 0; g < 3; g++) {
            const ga = g * (TWO_PI / 3);
            const gx = Math.cos(ga) * size * 0.32;
            const gy = Math.sin(ga) * size * 0.18 + bob * 0.02;
            ellipse(gx, gy, 6, 4);
            // small rotated ticks
            push(); translate(gx, gy); rotate(phase * 0.6 + g); fill(180, 240, 255, 120); rect(0, -2, 6, 1, 1); pop();
        }
        pop();
    },
    signalFlare: function(obj, size, anim, bob) {
        // colourful signal flare: multi-layered glows, rotating streaks, chromatic shells and orbiting motes
        noStroke();
        const phase = (anim ? anim.flarePhase : obj.bobPhase * 0.008);

        // Base pulse and color cycling
        const pulse = 0.6 + 0.45 * Math.sin(phase * 1.4);
        const hueA = 0.5 + 0.5 * Math.sin(phase * 0.9);
        const hueB = 0.5 + 0.5 * Math.sin(phase * 1.3 + 2.1);
        // Build two RGB blends without colorMode changes
        const col1 = [220, Math.floor(120 + 110 * hueA), Math.floor(200 + 40 * hueB)];
        const col2 = [Math.floor(180 + 60 * hueB), Math.floor(200 * hueA), 120];

        // Central core (bright, slightly chromatic)
        fill(col1[0], col1[1], col1[2], Math.floor(220 * pulse));
        ellipse(0, bob, size * 0.5 * (0.9 + pulse * 0.25), size * 0.36 * (0.9 + pulse * 0.25));

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
        translate( Math.sin(phase * 0.9) * 1.5, Math.cos(phase * 1.1) * 1.2 );
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
            fill(mr, mg, mb, 120 + Math.round(80 * Math.sin(phase * 2 + i)));
            ellipse(mx, my, m.sz * (0.9 + 0.3 * Math.sin(phase * 3 + i)), m.sz * 0.7);
            // small halo for glow
            fill(mr, mg, mb, 24);
            ellipse(mx, my, m.sz * 4, m.sz * 2);
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

    asteroidMiner: function(obj, size, anim, bob) {
        // Upgraded compact asteroid miner: articulated drills, extractor beam, moving conveyor, hazard lights and service drone
        push();
        noStroke();

        // base skid with subtle rim and scuff marks
        fill(50, 50, 58);
        ellipse(0, bob + size * 0.20, size * 0.88, size * 0.38);
        fill(30, 30, 36, 80);
        ellipse(0, bob + size * 0.28, size * 0.6, size * 0.10);

        // main hull / tower
        push();
        fill(120, 118, 120);
        rect(0, -size * 0.06 + bob, size * 0.26, size * 0.52, 5);
        // armored plating panels
        fill(100, 98, 100);
        rect(0, -size * 0.06 + bob, size * 0.26, size * 0.08, 4);
        // grated intake vents
        fill(60, 60, 66);
        rect(0, size * 0.12 + bob, size * 0.18, size * 0.06, 3);
        pop();

        // Drill array: three articulated arms with rotating drill heads
        for (let a = 0; a < 3; a++) {
            const side = a - 1; // -1,0,1
            const baseAng = -PI / 3 + a * (PI / 3);
            push();
            // subtle arm sweep motion
            rotate(baseAng + Math.sin(obj.bobPhase * 0.0015 + a) * 0.03);
            // arm shaft
            stroke(120); strokeWeight(3);
            line(size * 0.14, size * 0.02 + bob, size * 0.54, size * 0.18 + bob);
            noStroke();
            // arm joint
            fill(95);
            ellipse(size * 0.54, size * 0.18 + bob, size * 0.09, size * 0.07);

            // drill head assembly
            push(); translate(size * 0.54, size * 0.18 + bob);
            // spinning mandrel
            const spin = (anim ? anim.miningSpin : 0) + obj.bobPhase * 0.003 + a * 0.6;
            rotate(spin);
            fill(120, 110, 90);
            rect(0, 0, size * 0.14, size * 0.05, 3);
            // drill bit layers (concentric triangles)
            for (let d = 0; d < 3; d++) {
                push(); rotate(d * 0.8);
                fill(160 - d * 20, 140 - d * 18, 110 - d * 12);
                triangle(size * (0.08 + d * 0.02), 0, size * (0.16 + d * 0.02), -size * 0.04, size * (0.16 + d * 0.02), size * 0.04);
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
        fill(40);
        rect(0, beltY, size * 0.66, size * 0.12, 4);
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
            fill(red(oreHue), green(oreHue), blue(oreHue));
            ellipse(ox, beltY - size * 0.02, size * 0.06, size * 0.04);
        }
        pop();

        // hanging ore sacks and storage bins
        for (let s = -2; s <= 2; s++) {
            const sx = s * (size * 0.22);
            const sy = size * 0.46 + bob;
            fill(85, 60, 50);
            ellipse(sx, sy, size * 0.14, size * 0.16);
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
        // drone body
        fill(210, 200, 170);
        ellipse(ddx, ddy, 8, 6);
        // drone tether/arm
        stroke(160, 140, 120, 160); strokeWeight(0.6);
        line(ddx, ddy, ddx - Math.cos(obj._minerDrone.ang) * 8, ddy - Math.sin(obj._minerDrone.ang) * 8);
        noStroke();
        // drone nav light
        fill(255, 120, 80, 220);
        ellipse(ddx - 4, ddy - 2, 3, 3);

        pop();
    },

    energyCollector: function(obj, size, anim, bob) {
        // enhanced energy collector: rotating coils, pulsing core, flashing indicator lights
        noStroke();

        // base dish
        fill(24, 32, 48);
        ellipse(0, bob, size * 0.94, size * 0.36);

        // rotating coil layers (two layers with different speeds)
        const spin = (anim && typeof anim.collectorSpin === 'number') ? anim.collectorSpin : (obj.bobPhase * 0.0006);
        for (let layer = 0; layer < 2; layer++) {
            const layerCount = 6 + layer * 2;
            const layerRadius = size * (0.30 + layer * 0.06);
            const alphaBase = 120 - layer * 30;
            for (let i = 0; i < layerCount; i++) {
                const a = i * (TWO_PI / layerCount) + spin * (1 + layer * 0.4) + obj.bobPhase * (0.0004 + layer * 0.0002);
                const rx = Math.cos(a) * layerRadius;
                const ry = Math.sin(a) * (size * 0.12) + bob;
                // coil highlight with a slight radial stretch and additive glow
                fill(90, 200, 240, alphaBase + 40 * Math.sin(obj.bobPhase * 0.01 + i));
                ellipse(rx, ry, size * (0.10 - layer * 0.02), size * (0.06 - layer * 0.01));
            }
        }

        // central pulsing core with inner ring
        const pulse = 0.65 + 0.35 * Math.sin(obj.bobPhase * 0.014);
        push();
        // subtle rotation for core rings
        rotate(spin * 0.06);
        fill(100, 230, 255, 200 * pulse);
        ellipse(0, bob - size * 0.02, size * 0.30 * (0.85 + pulse * 0.35), size * 0.18 * (0.85 + pulse * 0.35));
        // inner glow halo
        fill(80, 180, 220, 60 * pulse);
        ellipse(0, bob - size * 0.02, size * 0.54 * (0.9 + pulse * 0.2), size * 0.30 * (0.9 + pulse * 0.2));
        pop();

        // flashing indicator lights around the rim
        if (anim && typeof anim.lightPhase === 'number') {
            const lights = 8;
            for (let i = 0; i < lights; i++) {
                const a = i * (TWO_PI / lights) + obj.bobPhase * 0.0003;
                const lx = Math.cos(a) * size * 0.46;
                const ly = Math.sin(a) * (size * 0.14) + bob;
                const flash = 0.5 + 0.5 * Math.sin(anim.lightPhase + i * 0.7 + obj.bobPhase * 0.003);
                // outer LED
                fill(180, 255, 200, 180 * flash);
                ellipse(lx, ly, 3 + flash * 2, 3 + flash * 1.2);
                // small halo
                fill(140, 220, 255, 30 * flash);
                ellipse(lx, ly, 8 + flash * 6, 4 + flash * 3);
            }
        }

        // small drifting particles/emissions to convey energy flow
        for (let p = 0; p < 4; p++) {
            const angle = obj.bobPhase * 0.001 + p * 1.3;
            const pr = size * (0.12 + 0.06 * p);
            const px = Math.cos(angle * (0.7 + p * 0.3)) * pr * 0.9;
            const py = Math.sin(angle * (0.9 + p * 0.2)) * pr * 0.4 + bob * 0.25;
            fill(140, 220, 255, 30 + 40 * Math.sin(obj.bobPhase * 0.01 + p));
            ellipse(px, py, 2 + p * 0.6, 2 + p * 0.3);
        }
    },

    iceCrystal: function(obj, size, anim, bob) {
        // crystalline shards with subtle translucency and drifting micro-shards
        noStroke();
        // main crystal cluster
        fill(200, 235, 255, 220);
        for (let s = 0; s < 5; s++) {
            const ang = s * (TWO_PI / 5) + obj.bobPhase * 0.002;
            const len = size * (0.35 + s * 0.08);
            push(); rotate(ang);
            beginShape();
            vertex(0, -len * 0.6 + bob);
            vertex(len * 0.08, -len * 0.12 + bob);
            vertex(0, len * 0.5 + bob);
            vertex(-len * 0.08, -len * 0.12 + bob);
            endShape(CLOSE);
            pop();
        }

        // tiny drifting shards
        fill(180, 220, 255, 120);
        for (let i = 0; i < 3; i++) ellipse(Math.cos(obj.bobPhase * 0.002 + i) * size * 0.4, Math.sin(obj.bobPhase * 0.003 + i) * size * 0.18 + bob * 0.08, 4, 3);
    },

    nebulaFragment: function(obj, size, anim, bob) {
        // richer nebula fragment: layered soft glows, drifting wisps and tiny glowing motes
        noStroke();
        const phase = (anim && typeof anim.nebulaPhase === 'number') ? anim.nebulaPhase : obj.bobPhase * 0.008;
        const t = (Math.sin(phase) + 1) * 0.5;

        // core layered glow (multiple concentric ellipses for a radial gradient feel)
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
            ellipse(ox, oy, w, h);
        }

        // layered chromatic shell to give shimmering edges
        push();
        translate(Math.sin(phase * 0.9) * 1.2, Math.cos(phase * 1.1) * 0.8);
        fill(accent.r, accent.g, accent.b, 36 + 48 * (0.5 + 0.5 * Math.sin(phase * 1.2)));
        ellipse(0, bob * 0.02, size * 0.95, size * 0.55);
        translate(-Math.sin(phase * 0.9) * 2.4, -Math.cos(phase * 1.1) * 1.6);
        fill(cyan.r, cyan.g, cyan.b, 22 + 34 * (0.5 + 0.5 * Math.cos(phase * 1.4)));
        ellipse(0, bob * 0.02, size * 0.98, size * 0.58);
        pop();

        // drifting wisps (soft elongated ellipses rotated around the core)
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

        // initialize small glowing motes if needed
        if (!obj._nebulaMotes) {
            obj._nebulaMotes = [];
            const moteCount = 4 + Math.floor(size / 120);
            for (let m = 0; m < moteCount; m++) {
                obj._nebulaMotes.push({ ang: Math.random() * TWO_PI, dist: size * (0.28 + Math.random() * 0.6), speed: 0.004 + Math.random() * 0.006, sz: 1 + Math.random() * 3, col: (m % 3) });
            }
        }

        // draw motes with soft halo
        for (let mi = 0; mi < obj._nebulaMotes.length; mi++) {
            const m = obj._nebulaMotes[mi];
            m.ang += m.speed * (0.9 + Math.sin(phase * 0.6 + mi) * 0.12);
            m.dist += Math.sin(phase * 0.3 + mi) * 0.2;
            const mx = Math.cos(m.ang) * m.dist * 0.6;
            const my = Math.sin(m.ang) * m.dist * 0.28 + bob * 0.12;
            let mr = 220, mg = 190, mb = 160;
            if (m.col === 1) { mr = 180; mg = 230; mb = 255; }
            if (m.col === 2) { mr = 255; mg = 150; mb = 220; }
            fill(mr, mg, mb, 120 + Math.floor(60 * Math.sin(phase * 2 + mi)));
            ellipse(mx, my, m.sz * (0.9 + 0.6 * Math.sin(phase * 3 + mi)), m.sz * 0.8);
            fill(mr, mg, mb, 28);
            ellipse(mx, my, m.sz * 4, m.sz * 2);
        }

        // tiny sparkles for depth
        for (let s = 0; s < 3; s++) {
            const sa = phase * (0.6 + s * 0.3) + s * 1.7;
            const sr = size * (0.18 + s * 0.14);
            const sx = Math.cos(sa) * sr * 0.6;
            const sy = Math.sin(sa) * sr * 0.38 + bob * 0.02;
            fill(255, 255, 255, 140 - s * 30);
            ellipse(sx, sy, 2.5 - s * 0.6, 2.5 - s * 0.6);
        }
    },

    wreckage: function(obj, size, anim, bob) {
        // larger broken hull plates and twisted beams
        noStroke();
        fill(120, 110, 100);
        // main plate
        rect(0, bob, size * 0.6, size * 0.28, 4);
        // scattered panels
        fill(90, 80, 80);
        rect(-size * 0.22, bob - size * 0.12, size * 0.2, size * 0.08, 2);
        rect(size * 0.28, bob + size * 0.1, size * 0.18, size * 0.06, 2);
        // small sparks/puffs
        fill(255, 180, 140, 120);
        ellipse(size * 0.36, bob - size * 0.06, 6, 3);
    },

    solarFarm: function(obj, size, anim, bob) {
        // enhanced solar farm: tilting tracker panels, central collector and maintenance drones
        const a = anim || obj._anim || {};
        noStroke();
        // floating frame / base
        fill(32, 38, 50);
        rect(0, bob + size * 0.02, size * 0.95, size * 0.26, 4);

        // central collector tower
        fill(120, 130, 140);
        rect(0, bob - size * 0.06, size * 0.12, size * 0.32, 4);
        fill(200, 220, 240, 60);
        ellipse(0, bob - size * 0.22, size * 0.14, size * 0.08);

        // panels: draw rows with small tilts and slight stagger
        const rows = 2;
        const cols = 5;
        const panelW = size * 0.16;
        const panelH = size * 0.08;
        const tiltBase = (typeof a.panelTiltAngle === 'number') ? a.panelTiltAngle : 0;
        const tiltSpeed = (typeof a.panelTiltSpeed === 'number') ? a.panelTiltSpeed : 0.00005;
        // animate tracker phase a bit here too
        const trackPhase = (typeof a.trackerPhase === 'number') ? a.trackerPhase : obj.bobPhase * 0.001;
        for (let r = 0; r < rows; r++) {
            const yOff = bob - size * 0.06 + r * (panelH + 6);
            for (let c = 0; c < cols; c++) {
                const x = (c - (cols - 1) / 2) * (panelW + 8);
                // per-panel micro-tilt follows tracker + gentle bob
                const per = (c / cols) + r * 0.13;
                const tilt = tiltBase + Math.sin(trackPhase * (0.9 + per * 0.2) + per * 1.7) * (0.14 + r * 0.02);
                push();
                translate(x, yOff);
                rotate(tilt);
                // panel body
                fill(18, 58, 130);
                rect(0, 0, panelW, panelH, 2);
                // grid lines
                stroke(12, 30, 70, 160); strokeWeight(0.6);
                for (let g = -2; g <= 2; g++) {
                    const gx = (g / 2) * panelW * 0.9;
                    line(-panelW * 0.46, gx, panelW * 0.46, gx);
                }
                noStroke();
                // specular sheen
                fill(255, 255, 240, 28);
                beginShape();
                vertex(-panelW * 0.36, -panelH * 0.2);
                vertex(-panelW * 0.06, -panelH * 0.3);
                vertex(panelW * 0.36, -panelH * 0.05);
                endShape(CLOSE);
                pop();
            }
        }

        // wiring bus and pulse glow
        const pulse = 0.6 + 0.4 * Math.sin((a.wiringPulse || obj.bobPhase) * 0.006);
        fill(90, 200, 255, 80 + 80 * pulse);
        rect(0, bob + size * 0.12, size * 0.5, size * 0.04, 2);
        // small power node
        fill(120, 220, 255, 160);
        ellipse(-size * 0.18, bob + size * 0.12, 6, 4);
        ellipse(size * 0.18, bob + size * 0.12, 5, 3);

        // maintenance drones: lazy init and simple orbit
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
            // tether line
            stroke(120, 140, 150, 120); strokeWeight(0.6);
            line(0, bob - size * 0.06, dx, dy - 2);
            noStroke();
            // drone body
            fill(240, 230, 200);
            ellipse(dx, dy, 6, 4);
            // status light
            fill(100, 220, 160, 220);
            ellipse(dx + 3, dy - 1, 2, 2);
        }

        // subtle shadow under the farm
        fill(0, 0, 0, 40);
        ellipse(0, bob + size * 0.22, size * 0.9, size * 0.18);
    },

    prison: function(obj, size, anim, bob) {
        // Prison station: fortified security compound with cell blocks, guard towers, secure perimeter and searchlights
        noStroke();

        // Base platform shadow
        fill(12, 12, 16, 220);
        ellipse(0, size * 0.22 + bob, size * 0.95, size * 0.28);

        // Main security compound (reinforced rectangular core)
        fill(40, 40, 45);
        rect(0, bob, size * 0.9, size * 0.5, 8);
        // Reinforced plating
        fill(30, 30, 35);
        rect(0, bob - size * 0.15, size * 0.85, size * 0.08, 4);
        rect(0, bob + size * 0.15, size * 0.85, size * 0.08, 4);

        // Cell block modules (4 wings)
        for (let wing = 0; wing < 4; wing++) {
            const wangle = wing * (TWO_PI / 4);
            push();
            rotate(wangle);
            translate(size * 0.35, bob);
            // Wing housing
            fill(50, 50, 55);
            rect(0, 0, size * 0.25, size * 0.12, 4);
            // Small barred windows
            fill(100, 80, 60, 150);
            for (let w = -2; w <= 2; w++) {
                rect(w * (size * 0.04), 0, size * 0.02, size * 0.08, 1);
                // Window bars
                stroke(60, 60, 65);
                strokeWeight(0.5);
                line(w * (size * 0.04) - size * 0.008, -size * 0.02, w * (size * 0.04) - size * 0.008, size * 0.02);
                line(w * (size * 0.04), -size * 0.02, w * (size * 0.04), size * 0.02);
                line(w * (size * 0.04) + size * 0.008, -size * 0.02, w * (size * 0.04) + size * 0.008, size * 0.02);
                noStroke();
            }
            pop();
        }

        // Guard towers (corner positions)
        for (let t = 0; t < 4; t++) {
            const tangle = t * (TWO_PI / 4) + Math.PI / 4;
            const tx = Math.cos(tangle) * size * 0.42;
            const ty = Math.sin(tangle) * size * 0.42 + bob;
            // Tower base
            fill(45, 45, 50);
            rect(tx, ty, size * 0.1, size * 0.15, 3);
            // Tower top
            fill(55, 55, 60);
            rect(tx, ty - size * 0.08, size * 0.12, size * 0.04, 2);
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
        fill(60, 60, 70);
        rect(0, bob - size * 0.05, size * 0.2, size * 0.15, 4);
        // Command windows
        fill(150, 150, 200, 120);
        for (let w = -1; w <= 1; w++) {
            rect(w * (size * 0.05), bob - size * 0.05, size * 0.025, size * 0.06, 1);
        }

        // Antenna array on command center
        fill(70, 70, 80);
        rect(0, bob - size * 0.13, size * 0.05, size * 0.03, 2);
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
            fill(80, 80, 90);
            ellipse(dx, dy, 8, 6);
            fill(255, 0, 0, 200);
            ellipse(dx + 2, dy, 2, 2);
        }
    },

    drugLab: function(obj, size, anim, bob) {
        // Drug lab: clandestine facility with chemical tanks, distillation columns, ventilation and warning signs
        noStroke();

        // Platform shadow
        fill(16, 20, 16, 200);
        ellipse(0, size * 0.2 + bob, size * 0.88, size * 0.26);

        // Main facility housing (darker, industrial)
        fill(55, 60, 55);
        rect(0, bob, size * 0.7, size * 0.45, 6);
        // Worn paneling
        fill(45, 50, 45);
        rect(0, bob - size * 0.12, size * 0.65, size * 0.08, 3);
        rect(0, bob + size * 0.12, size * 0.65, size * 0.08, 3);

        // Chemical storage tanks (3 large tanks)
        for (let t = -1; t <= 1; t++) {
            const tx = t * (size * 0.28);
            const ty = bob - size * 0.08;
            // Tank body
            fill(70, 75, 65);
            rect(tx, ty, size * 0.18, size * 0.35, 5);
            // Tank top
            fill(80, 85, 75);
            ellipse(tx, ty - size * 0.175, size * 0.16, size * 0.08);
            // Liquid level indicator
            fill(100, 180, 140, 120);
            rect(tx, ty + size * 0.04, size * 0.12, size * 0.16, 2);
            // Hazard markings
            stroke(255, 200, 0, 180);
            strokeWeight(2);
            noFill();
            rect(tx, ty, size * 0.18, size * 0.35, 5);
            noStroke();
        }

        // Distillation columns with condenser coils
        for (let c = 0; c < 2; c++) {
            const cx = (c - 0.5) * (size * 0.6);
            const cy = bob + size * 0.2;
            // Column body
            fill(60, 65, 60);
            rect(cx, cy, size * 0.08, size * 0.25, 3);
            // Coil wrapping (spiral effect with lines)
            stroke(80, 85, 80, 120);
            strokeWeight(1.2);
            for (let s = 0; s < 5; s++) {
                const sy = cy - size * 0.1 + s * (size * 0.05);
                line(cx - size * 0.05, sy, cx + size * 0.05, sy);
            }
            noStroke();
            // Outlet valve
            fill(90, 95, 90);
            ellipse(cx, cy + size * 0.14, size * 0.06, size * 0.04);
        }

        // Piping network with animated flow
        stroke(65, 70, 65);
        strokeWeight(2.5);
        line(-size * 0.3, bob - size * 0.05, size * 0.3, bob - size * 0.05);
        line(-size * 0.15, bob - size * 0.05, -size * 0.15, bob + size * 0.15);
        line(size * 0.15, bob - size * 0.05, size * 0.15, bob + size * 0.15);
        noStroke();
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
            fill(50, 55, 50);
            ellipse(vx, vy, size * 0.12, size * 0.12);
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
            fill(65, 70, 65);
            rect(ex, ey, size * 0.08, size * 0.05, 2);
            // Emissions (layered translucent ellipses)
            for (let p = 0; p < 3; p++) {
                const py = ey - size * 0.05 - p * size * 0.08;
                const phase = obj.bobPhase * 0.003 + e + p * 0.5;
                fill(120, 200, 140, 60 - p * 15);
                ellipse(ex + Math.sin(phase) * 3, py, size * 0.1 + p * size * 0.04, size * 0.06 + p * size * 0.02);
            }
        }

        // Hazard warning signs
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
        fill(80, 85, 80);
        rect(botX, botY, 10, 6, 2);
        fill(100, 200, 150, 150);
        ellipse(botX + 3, botY, 2, 2);
    },

    labourColony: function(obj, size, anim, bob) {
        // Labour colony: industrial complex with worker modules, mining equipment, processing facilities and transport rails
        noStroke();

        // Base platform with industrial grid
        fill(30, 30, 35, 220);
        ellipse(0, size * 0.25 + bob, size * 1.0, size * 0.3);
        // Grid pattern
        stroke(40, 40, 45, 100);
        strokeWeight(0.8);
        for (let g = -4; g <= 4; g++) {
            line(g * (size * 0.12), bob + size * 0.1, g * (size * 0.12), bob + size * 0.4);
        }
        noStroke();

        // Central processing facility (large industrial structure)
        fill(50, 50, 55);
        rect(0, bob, size * 0.6, size * 0.4, 8);
        // Processing windows
        fill(200, 150, 100, 120);
        for (let w = -2; w <= 2; w++) {
            rect(w * (size * 0.1), bob, size * 0.06, size * 0.25, 2);
        }

        // Worker habitation modules (rows of small units)
        for (let row = 0; row < 2; row++) {
            for (let col = -3; col <= 3; col++) {
                const mx = col * (size * 0.14);
                const my = bob - size * 0.25 + row * (size * 0.08);
                // Module housing
                fill(60, 60, 65);
                rect(mx, my, size * 0.12, size * 0.06, 2);
                // Small window
                fill(150, 150, 180, 100);
                rect(mx, my, size * 0.04, size * 0.04, 1);
            }
        }

        // Mining drill rigs (2 large drilling platforms)
        for (let d = 0; d < 2; d++) {
            const dx = (d - 0.5) * (size * 0.7);
            const dy = bob + size * 0.15;
            // Drill platform
            fill(45, 45, 50);
            rect(dx, dy, size * 0.18, size * 0.12, 4);
            // Drill arm
            push();
            translate(dx, dy - size * 0.06);
            const drillAngle = Math.sin(obj.bobPhase * 0.002 + d) * 0.15;
            rotate(drillAngle);
            stroke(55, 55, 60);
            strokeWeight(3);
            line(0, 0, 0, size * 0.25);
            noStroke();
            // Drill head
            fill(70, 70, 75);
            ellipse(0, size * 0.25, size * 0.08, size * 0.06);
            // Rotating drill bit
            const drillSpin = (anim && anim.drillSpin) ? anim.drillSpin : obj.bobPhase * 0.006;
            push();
            translate(0, size * 0.25);
            rotate(drillSpin + d * Math.PI);
            fill(90, 90, 95);
            for (let b = 0; b < 4; b++) {
                const ba = b * (TWO_PI / 4);
                triangle(0, 0, Math.cos(ba) * size * 0.04, Math.sin(ba) * size * 0.04,
                         Math.cos(ba + 0.3) * size * 0.04, Math.sin(ba + 0.3) * size * 0.04);
            }
            pop();
            pop();
        }

        // Ore processing conveyors with moving ore chunks
        fill(40, 40, 45);
        rect(-size * 0.25, bob + size * 0.28, size * 0.5, size * 0.08, 3);
        rect(size * 0.25, bob + size * 0.28, size * 0.5, size * 0.08, 3);
        // Moving ore on conveyors
        const conveyorPhase = (anim && anim.conveyorPhase) ? anim.conveyorPhase : obj.bobPhase * 0.004;
        for (let c = 0; c < 2; c++) {
            const cx = (c - 0.5) * (size * 0.5);
            for (let o = 0; o < 4; o++) {
                const ox = cx + lerp(-size * 0.25, size * 0.25, (conveyorPhase + o * 0.25) % 1);
                fill(120, 90, 70);
                ellipse(ox, bob + size * 0.28, size * 0.05, size * 0.04);
            }
        }

        // Transport rail system (monorail)
        stroke(60, 60, 65);
        strokeWeight(2);
        line(-size * 0.5, bob - size * 0.15, size * 0.5, bob - size * 0.15);
        noStroke();
        // Rail support pillars
        for (let p = -2; p <= 2; p++) {
            const px = p * (size * 0.25);
            fill(50, 50, 55);
            rect(px, bob - size * 0.08, size * 0.04, size * 0.15, 1);
        }
        // Transport pod moving along rail
        const podPos = Math.sin(obj.bobPhase * 0.003) * (size * 0.45);
        fill(70, 70, 80);
        rect(podPos, bob - size * 0.15, size * 0.15, size * 0.08, 3);
        fill(100, 120, 140, 120);
        rect(podPos, bob - size * 0.15, size * 0.06, size * 0.06, 1);

        // Smokestacks with emissions
        for (let s = 0; s < 3; s++) {
            const sx = (s - 1) * (size * 0.22);
            const sy = bob - size * 0.35;
            // Stack structure
            fill(55, 55, 60);
            rect(sx, sy + size * 0.1, size * 0.06, size * 0.2, 2);
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
            fill(65, 65, 70);
            rect(gx, gy, size * 0.12, size * 0.1, 3);
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

    quantumGate: function(obj, size, anim, bob) {
        // Enhanced quantum gate: multi-ring shimmer, rotating glyphs, teleport arcs and particle jets
        const phase = (anim && anim.gatePhase) ? anim.gatePhase : obj.bobPhase * 0.01;
        const spin = obj.bobPhase * 0.0025;
        const pulse = 0.6 + 0.45 * Math.sin(phase * 1.8);

        // central chromatic core (colour shifts subtly)
        noStroke();
        const rC = Math.floor(200 + 55 * Math.sin(phase * 1.1));
        const gC = Math.floor(120 + 90 * Math.sin(phase * 1.5 + 1.2));
        const bC = Math.floor(220 + 20 * Math.sin(phase * 0.9 + 2.3));
        fill(rC, gC, bC, Math.floor(200 * pulse));
        ellipse(0, bob, size * 0.28 * (0.8 + pulse * 0.35), size * 0.28 * (0.8 + pulse * 0.35));

        // layered shimmer rings (soft strokes)
        for (let ring = 0; ring < 3; ring++) {
            const t = ring / 3;
            stroke(Math.floor(lerp(rC, 120, t)), Math.floor(lerp(gC, 200, t)), Math.floor(lerp(bC, 255, t)), Math.floor(90 * (1 - t) * (1 + 0.6 * pulse)));
            strokeWeight(1 + ring);
            noFill();
            const s = size * (0.6 + ring * 0.18) * (0.95 + 0.06 * Math.sin(phase * (1.2 + ring * 0.4)));
            ellipse(0, bob, s, s);
        }

        // rotating glyphs/icons along the main ring
        noStroke();
        const glyphCount = 10;
        for (let i = 0; i < glyphCount; i++) {
            const ga = spin + i * (TWO_PI / glyphCount);
            const gr = size * 0.48;
            const gx = Math.cos(ga) * gr;
            const gy = Math.sin(ga) * gr * 0.9 + bob * 0.02;
            push();
            translate(gx, gy);
            rotate(ga + phase * 0.5);
            const gw = 4 + 2 * Math.sin(phase * 2 + i);
            fill(255, 255, 255, 180);
            beginShape();
            vertex(-gw, -gw * 0.6);
            vertex(0, -gw * 1.4);
            vertex(gw, -gw * 0.6);
            vertex(0, gw * 1.1);
            endShape(CLOSE);
            pop();
        }

        // teleport arcs: curved energy strands that sweep across the gate
        strokeWeight(1.2);
        for (let a = 0; a < 6; a++) {
            const startAng = spin * 0.8 + a * (TWO_PI / 6) + Math.sin(phase * (0.7 + a * 0.14)) * 0.2;
            const arcLen = 0.8 + 0.2 * Math.sin(phase * 1.3 + a);
            const rIn = size * 0.28;
            const rOut = size * 0.66;
            const steps = 10;
            beginShape();
            for (let s = 0; s <= steps; s++) {
                const v = s / steps;
                const ang = startAng + v * arcLen;
                const rad = lerp(rIn, rOut, v);
                const x = Math.cos(ang) * rad;
                const y = Math.sin(ang) * rad * 0.92 + bob * 0.02 * Math.sin(phase + a);
                const alpha = Math.floor(180 * (1 - v) * (0.6 + 0.4 * Math.sin(phase * 1.2 + a)));
                stroke(Math.floor(lerp(rC, 180, v)), Math.floor(lerp(gC, 220, v)), Math.floor(lerp(bC, 255, v)), alpha);
                if (s === 0) vertex(x, y); else vertex(x, y);
            }
            endShape();
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
        noStroke();
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
            fill(pr, pg, pb, Math.floor(160 * fade * pulse));
            ellipse(px, py, p.sz * (0.8 + fade * 1.2), p.sz * 0.6);
            fill(pr, pg, pb, Math.floor(30 * fade));
            ellipse(px, py, p.sz * 4, p.sz * 2.4);
        }
    },

    // ==========================================================================
    // SHIPYARD - Large orbital shipbuilding facility with construction bays,
    // cranes, welding sparks, and docked ship frames
    // ==========================================================================
    shipyard: function(obj, size, anim, bob) {
        // Animation phases
        const phase = (anim && anim.shipyardPhase) ? anim.shipyardPhase : obj.bobPhase * 0.0015;
        const cranePhase = (anim && anim.cranePhase) ? anim.cranePhase : obj.bobPhase * 0.0008;
        // Slow down weld animation so sparks are less frantic
        const weldPhase = (anim && anim.weldPhase) ? anim.weldPhase : obj.bobPhase * 0.00005;
        const dockingPulse = 0.7 + 0.3 * Math.sin(phase * 2);

        // Main shipyard hull - large industrial hexagonal structure
        push();
        translate(0, bob);

        // Background scaffolding/lattice
        stroke(60, 80, 100, 120);
        strokeWeight(1);
        for (let i = 0; i < 8; i++) {
            const ang = (TWO_PI / 8) * i + phase * 0.02;
            const r1 = size * 0.3;
            const r2 = size * 0.48;
            line(Math.cos(ang) * r1, Math.sin(ang) * r1,
                 Math.cos(ang) * r2, Math.sin(ang) * r2);
        }

        // Main central hub - industrial gray with blue accents
        noStroke();
        fill(50, 55, 70);
        beginShape();
        for (let i = 0; i < 6; i++) {
            const ang = (TWO_PI / 6) * i - PI/6;
            vertex(Math.cos(ang) * size * 0.28, Math.sin(ang) * size * 0.28);
        }
        endShape(CLOSE);

        // Hub inner detail
        fill(70, 80, 100);
        ellipse(0, 0, size * 0.18, size * 0.18);
        fill(40, 50, 65);
        ellipse(0, 0, size * 0.12, size * 0.12);

        // Beveled inner plate for the hex hub (adds perceived depth)
        push();
        fill(90, 100, 115);
        stroke(120, 130, 145); strokeWeight(0.8);
        beginShape();
        for (let i = 0; i < 6; i++) {
            const ang = (TWO_PI / 6) * i - PI/6;
            vertex(Math.cos(ang) * size * 0.22, Math.sin(ang) * size * 0.22);
        }
        endShape(CLOSE);
        // inner darker inset
        fill(60, 70, 85);
        beginShape();
        for (let i = 0; i < 6; i++) {
            const ang = (TWO_PI / 6) * i - PI/6;
            vertex(Math.cos(ang) * size * 0.14, Math.sin(ang) * size * 0.14);
        }
        endShape(CLOSE);
        noStroke();
        pop();

        // Glowing core
        const coreGlow = 150 + 80 * Math.sin(phase * 3);
        fill(100, 180, 255, coreGlow);
        ellipse(0, 0, size * 0.06, size * 0.06);

        // Hub plating seams and rivets for extra detail
        stroke(60, 70, 80, 160); strokeWeight(0.6);
        for (let s = 0; s < 6; s++) {
            const sa = s * (TWO_PI / 6);
            const sx = Math.cos(sa) * size * 0.18;
            const sy = Math.sin(sa) * size * 0.18;
            line(0, 0, sx, sy);
        }
        // small rivets around the hub rim
        for (let r = 0; r < 8; r++) {
            const ra = r * (TWO_PI / 8) + phase * 0.02;
            fill(120, 130, 140);
            noStroke();
            ellipse(Math.cos(ra) * size * 0.26, Math.sin(ra) * size * 0.26, 2, 2);
        }
        noStroke();

        // Four construction bays extending from center (enlarged for visibility)
        for (let bay = 0; bay < 4; bay++) {
            push();
            const bayAng = (TWO_PI / 4) * bay + PI/4;
            rotate(bayAng);
            translate(size * 0.44, 0);

            // Bay structure - larger, more detailed arms
            fill(52, 58, 74);
            stroke(78, 88, 110);
            strokeWeight(1.2);
            rectMode(CENTER);
            rect(0, 0, size * 0.42, size * 0.18, 3);

            // Bay interior glow (construction activity) - larger and more saturated
            const bayGlow = 110 + 60 * Math.sin(phase * 2 + bay * 1.5);
            noStroke();
            fill(255, 210, 120, bayGlow);
            rect(0, 0, size * 0.34, size * 0.12, 2);

            // Ship frame under construction (larger, with hull detail)
            push();
            translate(-size * 0.02, 0);
            fill(36, 42, 52);
            // hull outline
            beginShape();
            vertex(-size * 0.18, -size * 0.05);
            vertex(size * 0.16, -size * 0.02);
            vertex(size * 0.16, size * 0.02);
            vertex(-size * 0.18, size * 0.05);
            endShape(CLOSE);
            // cockpit / bridge
            fill(90, 110, 130);
            ellipse(size * 0.06, 0, size * 0.06, size * 0.04);
            // plating seams
            stroke(60, 70, 80); strokeWeight(0.6);
            line(-size * 0.08, -size * 0.04, size * 0.08, -size * 0.02);
            line(-size * 0.08, size * 0.04, size * 0.08, size * 0.02);
            noStroke();
            pop();

            // Construction crane arm (thicker and more visible)
            const craneSway = Math.sin(cranePhase + bay * 2) * 0.22;
            push();
            translate(size * 0.06, -size * 0.06);
            rotate(craneSway);
            stroke(92, 104, 124);
            strokeWeight(3);
            line(0, 0, 0, -size * 0.12);
            line(0, -size * 0.12, size * 0.09, -size * 0.12);
            // Crane hook & cable
            stroke(140, 150, 170);
            strokeWeight(1.6);
            line(size * 0.08, -size * 0.12, size * 0.08, -size * 0.04);
            // heavy hook
            noStroke(); fill(120, 130, 150);
            rect(size * 0.08, -size * 0.03, size * 0.03, size * 0.03, 2);
            pop();

            // Larger welding sparks and directional streaks (animated)
            if (Math.sin(weldPhase * 6 + bay * 2.2) > 0.3) {
                noStroke();
                for (let s = 0; s < 8; s++) {
                    const sparkAng = -0.6 + Math.random() * 1.2; // biased outward
                    const sparkDist = Math.random() * size * 0.06;
                    const sparkX = size * 0.02 + Math.cos(sparkAng) * sparkDist;
                    const sparkY = Math.sin(sparkAng) * sparkDist;
                    // streak
                    fill(255, 220 + Math.random() * 35, 120, 220);
                    ellipse(sparkX, sparkY, 3 + Math.random() * 3, 2 + Math.random() * 2);
                    // small trail line
                    stroke(255, 200, 120, 140); strokeWeight(0.8);
                    line(sparkX - 3, sparkY - 1, sparkX + 3, sparkY + 1);
                    noStroke();
                }
                // Bright weld point
                fill(255, 255, 220, 240);
                ellipse(size * 0.02, 0, 6, 6);
                // small glow halo
                fill(255, 200, 120, 80);
                ellipse(size * 0.02, 0, 14, 8);
            }

            // Gantry that traverses the bay (large visible movement)
            push();
            const gantryPos = (Math.sin(phase * 0.6 + bay) * 0.45 + 0.5) * (size * 0.16);
            translate(-size * 0.08 + gantryPos, -size * 0.02);
            fill(120, 125, 140);
            rect(0, 0, size * 0.12, size * 0.04, 2);
            // support wheels/tracks
            fill(90, 95, 110);
            ellipse(-size * 0.05, size * 0.02, 4, 3);
            ellipse(size * 0.05, size * 0.02, 4, 3);
            pop();

            pop();
        }

        // External docking arms (2 large ones for finished ships)
        for (let arm = 0; arm < 2; arm++) {
            push();
            const armAng = (arm === 0) ? -PI/2 : PI/2;
            rotate(armAng + Math.sin(phase + arm) * 0.02);
            translate(0, -size * 0.44);

            // Docking arm structure
            stroke(70, 80, 100);
            strokeWeight(3);
            line(0, 0, 0, -size * 0.1);

            // Docking clamps
            noStroke();
            fill(60, 70, 85);
            rect(-size * 0.04, -size * 0.11, size * 0.08, size * 0.03, 1);

            // Docking lights
            const dockLight = (Math.sin(phase * 4 + arm * PI) > 0) ? 255 : 80;
            fill(100, 255, 100, dockLight);
            ellipse(-size * 0.03, -size * 0.115, 3, 3);
            ellipse(size * 0.03, -size * 0.115, 3, 3);

            pop();
        }

        // Rotating warning beacons on corners
        for (let b = 0; b < 4; b++) {
            const beaconAng = (TWO_PI / 4) * b;
            const beaconX = Math.cos(beaconAng) * size * 0.52;
            const beaconY = Math.sin(beaconAng) * size * 0.52;
            const beaconFlash = Math.sin(phase * 6 + b * 1.5) > 0.5;
            fill(beaconFlash ? color(255, 100, 50, 220) : color(100, 40, 20, 150));
            noStroke();
            ellipse(beaconX, beaconY, 6, 6);
            if (beaconFlash) {
                fill(255, 150, 80, 60);
                ellipse(beaconX, beaconY, 14, 14);
            }
        }

        // Solar panel arrays on sides
        for (let panel = 0; panel < 2; panel++) {
            push();
            const panelAng = (panel === 0) ? 0 : PI;
            rotate(panelAng);
            translate(size * 0.46, 0);

            // Panel arm
            stroke(80, 90, 100);
            strokeWeight(2);
            line(0, 0, size * 0.08, 0);

            // Solar panels
            noStroke();
            fill(30, 40, 80);
            rect(size * 0.1, -size * 0.06, size * 0.06, size * 0.12, 1);
            // Panel grid lines
            stroke(50, 70, 120, 150);
            strokeWeight(0.5);
            for (let g = 0; g < 4; g++) {
                const gy = -size * 0.05 + g * size * 0.03;
                line(size * 0.08, gy, size * 0.15, gy);
            }
            // Panel reflection
            noStroke();
            fill(100, 150, 255, 40);
            rect(size * 0.1, -size * 0.04, size * 0.05, size * 0.04);

            pop();
        }

        // Central control tower
        fill(65, 70, 85);
        stroke(90, 100, 120);
        strokeWeight(1);
        beginShape();
        vertex(-size * 0.04, -size * 0.08);
        vertex(size * 0.04, -size * 0.08);
        vertex(size * 0.03, -size * 0.16);
        vertex(-size * 0.03, -size * 0.16);
        endShape(CLOSE);

        // Control tower windows
        noStroke();
        fill(150, 200, 255, 180 * dockingPulse);
        rect(-size * 0.02, -size * 0.14, size * 0.04, size * 0.02, 1);

        // Antenna array on top
        stroke(100, 110, 130);
        strokeWeight(1);
        line(0, -size * 0.16, 0, -size * 0.22);
        line(-size * 0.02, -size * 0.2, size * 0.02, -size * 0.2);

        // Communication dish
        noFill();
        stroke(90, 100, 120);
        strokeWeight(1.5);
        arc(0, -size * 0.22, size * 0.04, size * 0.02, PI, TWO_PI);

        pop();

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

        noStroke();
        for (const p of obj._shipyardParticles) {
            p.ang += p.speed;
            const px = Math.cos(p.ang) * p.dist;
            const py = Math.sin(p.ang) * p.dist + bob * 0.6;

            if (p.type === 'drone') {
                // Draw a small maintenance drone with rotors and a blinking light
                push();
                translate(px, py);
                // drone body orientation slightly faces orbit direction
                const orient = Math.atan2(py, px) + Math.PI / 2 + (Math.sin(p.ang * 2) * 0.15);
                rotate(orient);
                // body
                fill(180, 185, 190);
                rect(0, 0, p.sz * 2.2, p.sz * 1.0, 2);
                // left/right rotor hubs
                fill(120, 125, 130);
                ellipse(-p.sz * 0.9, 0, p.sz * 0.8, p.sz * 0.4);
                ellipse(p.sz * 0.9, 0, p.sz * 0.8, p.sz * 0.4);
                // rotor blades (very thin lines)
                stroke(80, 80, 90, 160); strokeWeight(0.8);
                line(-p.sz * 0.9 - 6, 0, -p.sz * 0.9 + 6, 0);
                line(p.sz * 0.9 - 6, 0, p.sz * 0.9 + 6, 0);
                noStroke();
                // thruster glow behind
                fill(100, 180, 255, 90);
                ellipse(0, p.sz * 0.9, p.sz * 1.4, p.sz * 0.7);
                // blinking nav light
                const blink = 0.5 + 0.5 * Math.sin(phase * 3 + p.ang * 4);
                fill(255, 100, 100, 200 * blink);
                ellipse(0, -p.sz * 0.15, 3, 3);
                pop();

            } else if (p.type === 'spark') {
                const intensity = 160 + Math.sin(weldPhase * 6 + p.ang * 2) * 100;
                // glow behind spark
                fill(255, 200, 120, Math.min(170, intensity * 0.6));
                ellipse(px, py, p.sz * 3.2, p.sz * 2.2);
                // core
                fill(255, 230, 160, Math.min(255, intensity));
                ellipse(px, py, p.sz * 1.6, p.sz * 1.2);
                // short motion streak for dynamism
                stroke(255, 200, 120, 160); strokeWeight(0.8);
                line(px - Math.cos(p.ang) * 4, py - Math.sin(p.ang) * 2, px + Math.cos(p.ang) * 2, py + Math.sin(p.ang) * 1);
                noStroke();

            } else {
                fill(80, 90, 100, 120);
                ellipse(px, py, p.sz, p.sz);
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
        // Slow rotation and gentle bobbing
        const dt = (typeof deltaTime === 'number') ? deltaTime : 16;
        this.angle += this.rotationSpeed * dt;
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
