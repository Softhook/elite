// ****** ships.js ******
// Contains ship drawing functions and the global SHIP_DEFINITIONS object.
// MUST be loaded AFTER p5.js but BEFORE player.js, enemy.js, etc.
// MODIFIED FOR EDITOR: Includes vertexData array and updated draw functions.
// VERSION WITH 10+15 NEW SHIP DESIGNS ADDED, Viper/Krait names reverted.

// Helper function to draw shape from vertex data
function drawShapeFromData(r, vertexData, fillCol, strokeCol, strokeWeightVal) {
    if (fillCol) fill(fillCol); else noFill();
    if (strokeCol) { stroke(strokeCol); strokeWeight(strokeWeightVal || 1); } else { noStroke(); }
    beginShape();
    for (let v of vertexData) {
        vertex(v.x * r, v.y * r);
    }
    endShape(CLOSE);
}

// --- Ship Drawing Functions (Using vertexData) ---

// Original Ships 

function drawACAB(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ACAB;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSidewinder(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Sidewinder;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawCobraMkIII(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.CobraMkIII;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawViper(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Viper;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawPython(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Python;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawAnaconda(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Anaconda;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawAdder(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Adder;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawKrait(s, thrusting = false) { 
     let r = s / 2; let def = SHIP_DEFINITIONS.Krait; 
     drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawThargoid(s, thrusting = false) { // (Original Thargoid)
    let r = s / 2;
    let baseHue = (frameCount * 0.5) % 360; colorMode(HSB, 360, 100, 100, 100);
    fill(baseHue, 80, 70, 80); stroke( (baseHue + 40) % 360, 90, 90, 90); strokeWeight(2);
    beginShape();
    for (let i = 0; i < 8; i++) {
        let angle1 = map(i, 0, 8, 0, TWO_PI); let angle2 = map(i + 0.5, 0, 8, 0, TWO_PI);
        let outerR = r * 1.1; let innerR = r * 0.6;
        vertex(cos(angle1) * outerR, sin(angle1) * outerR); vertex(cos(angle2) * innerR, sin(angle2) * innerR);
    } endShape(CLOSE);
    colorMode(RGB, 255); fill(0, 255, 150, map(sin(frameCount * 0.1), -1, 1, 50, 150)); noStroke();
    ellipse(0, 0, r*0.5, r*0.5);
}

function drawAspExplorer(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.AspExplorer;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawType6Transporter(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Type6Transporter;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawType9Heavy(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Type9Heavy;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawFederalAssaultShip(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.FederalAssaultShip;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialCourier(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialCourier;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawDiamondbackExplorer(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.DiamondbackExplorer;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawFerDeLance(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.FerDeLance;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawKeelback(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Keelback;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawVulture(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Vulture;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialClipper(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialClipper;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawShardInterceptor(s, thrusting = false) { // Alien 1
    let r = s / 2; let def = SHIP_DEFINITIONS.ShardInterceptor;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawBioFrigate(s, thrusting = false) { // Alien 2
    let r = s / 2; let def = SHIP_DEFINITIONS.BioFrigate;
    // Organic colors
    fill(def.fillColor[0] + sin(frameCount*0.8)*20, def.fillColor[1] + cos(frameCount*0.6)*15, def.fillColor[2]);
    stroke(def.strokeColor[0], def.strokeColor[1] + sin(frameCount*0.5)*10, def.strokeColor[2]);
    strokeWeight(def.strokeW);
    // Draw with curves? For simplicity, use vertex data but imagine curves
    beginShape();
    curveVertex(def.vertexData[def.vertexData.length-1].x * r, def.vertexData[def.vertexData.length-1].y * r); // Repeat last for curve start
    for (let v of def.vertexData) { curveVertex(v.x * r, v.y * r); }
    curveVertex(def.vertexData[0].x * r, def.vertexData[0].y * r); // Repeat first for curve end
    curveVertex(def.vertexData[1].x * r, def.vertexData[1].y * r); // Repeat second for curve end
    endShape(CLOSE);
    // Pulsating bio-luminescent glow
    //if (thrusting) { fill(100, 255, 150, 100 + sin(frameCount*2)*50); noStroke(); ellipse(-r*0.9, 0, r*0.6, r*0.4); }
}

function drawGeometricDrone(s, thrusting = false) { // Alien 3
    let r = s / 2; let def = SHIP_DEFINITIONS.GeometricDrone;
    // Sharp geometric look
    push(); // Use push/pop for rotation
    rotate(frameCount * 0.3); // Slow constant rotation
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}

function drawMuleFreighter(s, thrusting = false) { // Small Transporter
    let r = s / 2; let def = SHIP_DEFINITIONS.MuleFreighter;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawProspectorMiner(s, thrusting = false) { // Miner
    let r = s / 2; let def = SHIP_DEFINITIONS.ProspectorMiner;
    // Main body
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
    // Add simple "mining arms" representation
    stroke(100, 100, 110); strokeWeight(2); fill(150, 150, 160);
    rect(r * 0.5, r * 0.4, r * 0.4, r * 0.2); // Top arm base
    rect(r * 0.5, -r * 0.6, r * 0.4, r * 0.2); // Bottom arm base
    ellipse(r*0.9, r*0.5, r*0.1, r*0.1); // Top claw endpoint
    ellipse(r*0.9, -r*0.5, r*0.1, r*0.1); // Bottom claw endpoint
}

function drawGnatInterceptor(s, thrusting = false) { // Light Fighter 1
    let r = s / 2; let def = SHIP_DEFINITIONS.GnatInterceptor;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawWaspAssault(s, thrusting = false) { // Light Fighter 2
    let r = s / 2; let def = SHIP_DEFINITIONS.WaspAssault;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawGladiusFighter(s, thrusting = false) { // Medium Fighter
    let r = s / 2; let def = SHIP_DEFINITIONS.GladiusFighter;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawCenturionGunship(s, thrusting = false) { // Heavy Fighter
    let r = s / 2; let def = SHIP_DEFINITIONS.CenturionGunship;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawPathfinderSurvey(s, thrusting = false) { // Explorer 1
    let r = s / 2; let def = SHIP_DEFINITIONS.PathfinderSurvey;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
    // Implied Sensor dish
    noFill(); stroke(180, 180, 220); strokeWeight(1); arc(r*0.8, 0, r*0.4, r*0.8, -90, 90);
}

function drawNomadVoyager(s, thrusting = false) { // Explorer 2
    let r = s / 2; let def = SHIP_DEFINITIONS.NomadVoyager;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawStarlinerCruiser(s, thrusting = false) { // Trader/Passenger
    let r = s / 2; let def = SHIP_DEFINITIONS.StarlinerCruiser;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawJackalMultirole(s, thrusting = false) { // Multi-role
    let r = s / 2; let def = SHIP_DEFINITIONS.JackalMultirole;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawMantaHauler(s, thrusting = false) { // Unique 1
    let r = s / 2; let def = SHIP_DEFINITIONS.MantaHauler;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawHammerheadCorvette(s, thrusting = false) { // Unique 2
    let r = s / 2; let def = SHIP_DEFINITIONS.HammerheadCorvette;
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}


// --- End Ship Drawing Functions ---


// --- Global Ship Definitions Object ---
// Stores base stats AND VERTEX DATA for each ship type.
const SHIP_DEFINITIONS = {
    "ACAB": {
        name: "ACAB", role: "Police", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRateDegrees: 3.0, baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 22,
        armament: ["Twin Pulse"], // Police with targeting turret
        costCategory: "Low", description: "Standard Police.",
        drawFunction: drawACAB, vertexData: [ { x: 0.8969, y: 0.0000 }, { x: 0.1469, y: 0.4929 }, { x: -0.6673, y: 0.6286 }, { x: -0.6031, y: 0.0000 }, { x: -0.6673, y: -0.6286 }, { x: 0.1469, y: -0.4929 } ],
        fillColor: [100, 150, 200],
        strokeColor: [151, 181, 196],
        strokeW: 1.00,
        typicalCargo: [],
        price: 2700
    },
    "Adder": {
        name: "Adder", role: "Trader/Explorer", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRateDegrees: 3.0, baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 22,
        armament: ["Pulse Laser"], // Basic defensive setup
        costCategory: "Low", description: "Affordable entry-level freighter or explorer.",
        drawFunction: drawAdder, vertexData: [ { x: 0.8, y: 0 }, { x: 0.2, y: 0.8 }, { x: -0.9, y: 0.7 }, { x: -0.7, y: 0 }, { x: -0.9, y: -0.9 }, { x: 0.1, y: -0.7 } ],
        fillColor: [160, 160, 140], strokeColor: [200, 200, 180], strokeW: 1,
        typicalCargo: ["Food", "Textiles", "Minerals"],
        price: 2700
    },
    "Anaconda": {
        name: "Anaconda", role: "Heavy Combat/Multi", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRateDegrees: 1.2, baseHull: 400, baseShield: 350, shieldRecharge: 0.7, cargoCapacity: 150,
        armament: ["Force Blaster"],
        costCategory: "Very High", description: "A mobile fortress, the pinnacle of conventional design.",
        drawFunction: drawAnaconda, vertexData: [ { x: 1.2, y: 0 }, { x: 0.9, y: 0.3 }, { x: -0.9, y: 0.4 }, { x: -1.1, y: 0.2 }, { x: -1.1, y: -0.2 }, { x: -0.9, y: -0.4 }, { x: 0.9, y: -0.3 } ],
        fillColor: [80, 90, 100], strokeColor: [150, 160, 170], strokeW: 2.5,
        typicalCargo: ["Luxury Goods", "Adv Components", "Metals", "Machinery"],
        price: 12000
    },
    "AspExplorer": {
        name: "Asp Explorer", role: "Explorer/Multi-Role", sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRateDegrees: 3.2, baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 80,
        armament: ["Beam Laser", "Twin Pulse"], // Utility-focused
        costCategory: "Medium-High", description: "Iconic explorer with excellent visibility and jump range.",
        drawFunction: drawAspExplorer, vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.4127, y: 0.5133 }, { x: -0.4250, y: 0.8750 }, { x: -0.9000, y: 0.3000 }, { x: -0.9000, y: -0.3000 }, { x: -0.4250, y: -0.8750 }, { x: 0.4127, y: -0.5133 } ],
        fillColor: [200, 180, 80],
        strokeColor: [100, 90, 40],
        strokeW: 1.50,
        typicalCargo: ["Minerals", "Medicine", "Computers"],
        price: 8250
    },
    "BioFrigate": { // NEW - Alien 2
        name: "Bio-Frigate (Alien)", role: "Alien Cruiser", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.0, baseThrust: 0.1, baseTurnRateDegrees: 2.0, baseHull: 500, baseShield: 150, shieldRecharge: 2.5, // Hull tanky, weak shields?
        armament: ["Force Blaster", "Disruptor"], // Alien tech weapons
        costCategory: "N/A", description: "Large, organic alien vessel. Slow but durable.",
        drawFunction: drawBioFrigate, vertexData: [ {x:1.0, y:0}, {x:0.6, y:0.6}, {x:0.1, y:0.8}, {x:-0.5, y:0.7}, {x:-0.9, y:0.2}, {x:-1.0, y:0}, {x:-0.9, y:-0.2}, {x:-0.5, y:-0.7}, {x:0.1, y:-0.8}, {x:0.6, y:-0.6} ],
        fillColor: [80, 140, 100], strokeColor: [40, 80, 50], strokeW: 2.5, // Murky green
        typicalCargo: ["Metals", "Chemicals", "Adv Components"],
        price: 20000
    },
    "CenturionGunship": { // NEW - Heavy Fighter
        name: "Centurion Gunship", role: "Heavy Fighter", sizeCategory: "Large", size: 72,
        baseMaxSpeed: 4.8, baseThrust: 0.13, baseTurnRateDegrees: 2.6, baseHull: 320, baseShield: 220, shieldRecharge: 1.0, cargoCapacity: 20,
        armament: ["Heavy Cannon", "Quad Pulse", "Beam Laser"], // Balanced heavy firepower
        costCategory: "High", description: "Slow, heavily armed and armored gun platform.",
        drawFunction: drawCenturionGunship, vertexData: [ { x: 0.8000, y: 0.0000 }, { x: 0.7000, y: 0.4000 }, { x: 0.0000, y: 0.5048 }, { x: 0.3967, y: 0.6548 }, { x: 0.3896, y: 0.8786 }, { x: -0.7000, y: 0.9000 }, { x: -1.0000, y: 0.6000 }, { x: -1.0000, y: -0.6000 }, { x: -0.7000, y: -0.9000 }, { x: 0.3896, y: -0.8786 }, { x: 0.3967, y: -0.6548 }, { x: 0.0000, y: -0.5048 }, { x: 0.7000, y: -0.4000 } ],
        fillColor: [100, 105, 115],
        strokeColor: [160, 165, 175],
        strokeW: 2.20,
        typicalCargo: ["Weapons", "Metals", "Machinery"],
        price: 15360
    },
    "CobraMkIII": {
        name: "Cobra Mk III", role: "Multi-Role", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRateDegrees: 3.5, baseHull: 120, baseShield: 100, shieldRecharge: 1.2, cargoCapacity: 44,
        armament: ["Multi-Cannon", "Twin Pulse"], // Versatile loadout
        costCategory: "Medium", description: "The legendary jack-of-all-trades.",
        drawFunction: drawCobraMkIII, 
        vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.3000, y: 0.5270 }, { x: -0.5045, y: 0.5634 }, { x: -0.5000, y: 0.2000 }, { x: -0.7734, y: 0.1770 }, { x: -0.7734, y: -0.1770 }, { x: -0.5000, y: -0.2000 }, { x: -0.5045, y: -0.5634 }, { x: 0.3000, y: -0.5270 } ],
        fillColor: [100, 150, 200],
        strokeColor: [200, 220, 255],
        strokeW: 1.50,
        typicalCargo: ["Food"],
        price: 7200
    },
    "DiamondbackExplorer": {
        name: "Diamondback Explorer", role: "Explorer/Light Combat", sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRateDegrees: 3.0, baseHull: 130, baseShield: 100, shieldRecharge: 1.1, cargoCapacity: 40,
        armament: ["Beam Laser", "Double Shot"], // Explorer with some punch
        costCategory: "Medium", description: "Utilitarian explorer known for good heat management.",
        drawFunction: drawDiamondbackExplorer, vertexData: [ { x: 1.0, y: 0 }, { x: 0.2, y: 0.4 }, { x: -0.5, y: 0.9 }, { x: -0.9, y: 0.5 }, { x: -0.8, y: 0 }, { x: -0.9, y: -0.5 }, { x: -0.5, y: -0.9 }, { x: 0.2, y: -0.4 } ],
        fillColor: [100, 110, 90], strokeColor: [160, 170, 150], strokeW: 1.5,
        typicalCargo: ["Minerals", "Metals", "Adv Components"],
        price: 6500
    },
    "FederalAssaultShip": {
        name: "Federal Assault Ship", role: "Heavy Fighter", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 5.0, baseThrust: 0.12, baseTurnRateDegrees: 2.5, baseHull: 300, baseShield: 200, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Heavy Cannon", "Multi-Cannon", "Railgun Turret"], // Military arsenal
        costCategory: "High", description: "Federation military vessel. Tough hull, good firepower.",
        drawFunction: drawFederalAssaultShip, vertexData: [ { x: 0.9, y: 0 }, { x: 0.7, y: 0.5 }, { x: -0.2, y: 0.6 }, { x: -0.8, y: 0.8 }, { x: -1.0, y: 0.4 }, { x: -1.0, y: -0.4 }, { x: -0.8, y: -0.8 }, { x: -0.2, y: -0.6 }, { x: 0.7, y: -0.5 } ],
        fillColor: [110, 120, 130], strokeColor: [180, 190, 200], strokeW: 2,
        typicalCargo: ["Weapons", "Metals", "Adv Components"],
        price: 15000
    },
     "FerDeLance": {
        name: "Fer-de-Lance", role: "Heavy Combat", sizeCategory: "Large", size: 65,
        baseMaxSpeed: 6.5, baseThrust: 0.11, baseTurnRateDegrees: 3.0, baseHull: 180, baseShield: 350, shieldRecharge: 1.8, cargoCapacity: 24,
        armament: ["Sniper Rail", "Force Blaster", "Pulse Array"], // Luxury combat loadout
        costCategory: "Very High", description: "Luxury high-performance combat ship.",
        drawFunction: drawFerDeLance, vertexData: [ { x: 1.1, y: 0 }, { x: 0.2, y: 0.5 }, { x: -0.6, y: 0.6 }, { x: -0.9, y: 0.2 }, { x: -0.9, y: -0.2 }, { x: -0.6, y: -0.6 }, { x: 0.2, y: -0.5 } ],
        fillColor: [60, 65, 70], strokeColor: [140, 150, 160], strokeW: 2,
        typicalCargo: ["Luxury Goods", "Weapons", "Narcotics"],
        price: 11700
    },
    "GeometricDrone": { // NEW - Alien 3
        name: "Geometric Drone (Alien)", role: "Alien Scout?", sizeCategory: "Tiny", size: 15,
        baseMaxSpeed: 9.0, baseThrust: 0.2, baseTurnRateDegrees: 8.0, baseHull: 20, baseShield: 40, shieldRecharge: 1.5, cargoCapacity: 0,
        armament: ["Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Small, fast, rotating alien drone. Unknown purpose.",
        drawFunction: drawGeometricDrone, vertexData: [ {x:1,y:0}, {x:0.5,y:0.87}, {x:-0.5,y:0.87}, {x:-1,y:0}, {x:-0.5,y:-0.87}, {x:0.5,y:-0.87} ], // Regular Hexagon
        fillColor: [50, 50, 60], strokeColor: [200, 200, 255], strokeW: 1.0, // Dark metallic, light stroke
        typicalCargo: ["Chemicals", "Adv Components"],
        price: 1800
    },
    "GladiusFighter": { // NEW - Medium Fighter
        name: "Gladius Fighter", role: "Medium Fighter", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRateDegrees: 4.0, baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 6,
        armament: ["Burst Blaster", "Twin Pulse"], // Fast attack loadout
        costCategory: "Medium", description: "Balanced space superiority fighter. Agile and well-armed.",
        drawFunction: drawGladiusFighter, vertexData: [ {x:1.1, y:0}, {x:0.3, y:0.4}, {x:-0.2, y:0.7}, {x:-0.9, y:0.5}, {x:-1.0, y:0}, {x:-0.9, y:-0.5}, {x:-0.2, y:-0.7}, {x:0.3, y:-0.4} ],
        fillColor: [190, 195, 200], strokeColor: [120, 125, 140], strokeW: 1.5, // Light grey / medium grey
        typicalCargo: ["Weapons", "Computers"],
        price: 7000
    },
    "GnatInterceptor": { // NEW - Light Fighter 1
        name: "Gnat Interceptor", role: "Light Interceptor", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 9.5, baseThrust: 0.22, baseTurnRateDegrees: 6.0, baseHull: 30, baseShield: 30, shieldRecharge: 1.2, cargoCapacity: 0,
        armament: ["Pulse Laser"], // Fast single weapon
        costCategory: "Very Low", description: "Extremely fast and small, but fragile interceptor.",
        drawFunction: drawGnatInterceptor, vertexData: [ {x:1.1, y:0}, {x:-0.8, y:0.4}, {x:-1.0, y:0}, {x:-0.8, y:-0.4} ], // Very simple dart
        fillColor: [200, 60, 60], strokeColor: [255, 150, 150], strokeW: 0.8, // Red
        typicalCargo: [],
        price: 8850
    },
    "HammerheadCorvette": { // NEW - Unique 2
        name: "Hammerhead Corvette", role: "Corvette/Patrol", sizeCategory: "Large", size: 80,
        baseMaxSpeed: 4.0, baseThrust: 0.09, baseTurnRateDegrees: 2.3, baseHull: 350, baseShield: 280, shieldRecharge: 1.0, cargoCapacity: 60,
        armament: ["Heavy Cannon", "Railgun Turret", "Wide Scatter"], // Military loadout
        costCategory: "High", description: "Distinctive forward 'hammerhead' module, likely housing sensors or weapons.",
        drawFunction: drawHammerheadCorvette, vertexData: [ {x:1.1, y:0.4}, {x:0.8, y:0.9}, {x:0.4, y:0.9}, {x:0.1, y:0.4}, {x:-1.0, y:0.3}, {x:-1.0, y:-0.3}, {x:0.1, y:-0.4}, {x:0.4, y:-0.9}, {x:0.8, y:-0.9}, {x:1.1, y:-0.4} ],
        fillColor: [70, 100, 130], strokeColor: [150, 180, 210], strokeW: 2.0, // Blue-grey
        typicalCargo: ["Metals", "Weapons", "Luxury Goods"],
        price: 14000
    },
    "ImperialClipper": {
        name: "Imperial Clipper", role: "Multi-Role/Trader", sizeCategory: "Large", size: 95,
        baseMaxSpeed: 7.0, baseThrust: 0.10, baseTurnRateDegrees: 1.5, baseHull: 180, baseShield: 180, shieldRecharge: 1.4, cargoCapacity: 180,
        armament: ["Arc Projector", "Mini-Turret", "Beam Laser"], // Elegant, balanced
        costCategory: "High", description: "Elegant and fast Imperial ship, excels in straight lines.",
        drawFunction: drawImperialClipper, vertexData: [ { x: 1.1, y: 0 }, { x: 0.7, y: 0.2 }, { x: 0.1, y: 0.9 }, { x: -0.8, y: 0.8 }, { x: -1.0, y: 0.4 }, { x: -1.0, y: -0.4 }, { x: -0.8, y: -0.8 }, { x: 0.1, y: -0.9 }, { x: 0.7, y: -0.2 } ],
        fillColor: [220, 225, 230], strokeColor: [100, 150, 200], strokeW: 1.5,
        typicalCargo: ["Luxury Goods", "Medicine", "Textiles"],
        price: 12600
    },
    "ImperialCourier": {
        name: "Imperial Courier", role: "Light Fighter/Multi", sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.8, baseThrust: 0.16, baseTurnRateDegrees: 4.3, baseHull: 70, baseShield: 150, shieldRecharge: 1.7, cargoCapacity: 12,
        armament: ["Pulse Array", "Beam Laser"], // Elegant, refined
        costCategory: "Medium", description: "Fast, sleek Imperial ship with strong shields for its size.",
        drawFunction: drawImperialCourier, vertexData: [ { x: 1.0, y: 0 }, { x: 0.4, y: 0.3 }, { x: -0.5, y: 0.5 }, { x: -0.9, y: 0.4 }, { x: -1.0, y: 0 }, { x: -0.9, y: -0.4 }, { x: -0.5, y: -0.5 }, { x: 0.4, y: -0.3 } ],
        fillColor: [210, 215, 220], strokeColor: [80, 130, 180], strokeW: 1,
        typicalCargo: ["Luxury Goods", "Medicine"],
        price: 5460
    },
    "JackalMultirole": { // NEW - Multi-role
        name: "Jackal Multirole", role: "Multi-Role", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRateDegrees: 3.6, baseHull: 140, baseShield: 160, shieldRecharge: 1.2, cargoCapacity: 60,
        armament: ["Multi-Cannon", "Railgun Turret"], // Versatile
        costCategory: "Medium", description: "Adaptable, angular multi-purpose vessel.",
        drawFunction: drawJackalMultirole, vertexData: [ {x:1.0, y:0}, {x:0.5, y:0.5}, {x:-0.2, y:0.8}, {x:-0.8, y:0.6}, {x:-1.0, y:0.3}, {x:-1.0, y:-0.3}, {x:-0.8, y:-0.6}, {x:-0.2, y:-0.8}, {x:0.5, y:-0.5} ],
        fillColor: [170, 160, 150], strokeColor: [90, 80, 70], strokeW: 1.5, // Sandy grey
        typicalCargo: ["Machinery", "Metals", "Food"],
        price: 8120
    },
    "Keelback": {
        name: "Keelback", role: "Combat Trader", sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRateDegrees: 2.5, baseHull: 180, baseShield: 90, shieldRecharge: 0.9, cargoCapacity: 50,
        armament: ["Double Shot", "Twin Pulse"], // Combat trader
        costCategory: "Low-Medium", description: "A Type-6 variant retrofitted for combat, can carry a fighter.",
        drawFunction: drawKeelback, vertexData: [ { x: 0.7, y: 0 }, { x: 0.5, y: 0.6 }, { x: -0.2, y: 0.7 }, { x: -0.8, y: 0.9 }, { x: -1.0, y: 0.7 }, { x: -1.0, y: -0.7 }, { x: -0.8, y: -0.9 }, { x: -0.2, y: -0.7 }, { x: 0.5, y: -0.6 } ],
        fillColor: [180, 150, 80], strokeColor: [100, 80, 40], strokeW: 1.5,
        typicalCargo: ["Minerals", "Metals", "Machinery"],
        price: 7200
    },
    "Krait": { 
        name: "Krait", role: "Multi-Role/Fighter", sizeCategory: "Medium", size: 60,
        baseMaxSpeed: 6.2, baseThrust: 0.11, baseTurnRateDegrees: 3.8, baseHull: 160, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 82,
        armament: ["Mini-Turret"], // Combat focused Pirate
        costCategory: "High", description: "A popular multi-role ship, capable in combat and can launch fighters.",
        drawFunction: drawKrait, // Uses the same draw function
         vertexData: [ { x: 1, y: 0 }, { x: 0.6, y: 0.5 }, { x: -0.4, y: 0.6 }, { x: -0.9, y: 0.4 }, { x: -0.9, y: -0.4 }, { x: -0.4, y: -0.6 }, { x: 0.6, y: -0.5 } ],
        fillColor: [100, 120, 100], strokeColor: [140, 160, 140], strokeW: 1.5,
        typicalCargo: ["Food"],
        price: 6000
    },
    "MantaHauler": { // NEW - Unique 1
        name: "Manta Hauler", role: "Wide Cargo Hauler", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRateDegrees: 1.6, baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 300,
        armament: ["Mini-Turret", "Double Shot"], // Defensive
        costCategory: "Medium-High", description: "Extremely wide cargo ship, resembling a manta ray.",
        drawFunction: drawMantaHauler, vertexData: [ {x:0.8, y:0}, {x:0.2, y:0.3}, {x:-0.6, y:0.9}, {x:-0.9, y:0.7}, {x:-1.0, y:0}, {x:-0.9, y:-0.7}, {x:-0.6, y:-0.9}, {x:0.2, y:-0.3} ],
        fillColor: [60, 80, 90], strokeColor: [130, 160, 180], strokeW: 2.0, // Dark blue/teal
        typicalCargo: ["Minerals", "Metals", "Machinery", "Food", "Textiles"],
        price: 8750
    },
    "MuleFreighter": { // NEW - Small Transporter
        name: "Mule Freighter", role: "Local Transport", sizeCategory: "Small", size: 25,
        baseMaxSpeed: 3.8, baseThrust: 0.05, baseTurnRateDegrees: 2.8, baseHull: 70, baseShield: 40, shieldRecharge: 0.8, cargoCapacity: 30,
        armament: ["N/A"], // Basic defense
        costCategory: "Very Low", description: "Slow, cheap, boxy short-range cargo shuttle.",
        drawFunction: drawMuleFreighter, vertexData: [ {x:0.6, y:0.7}, {x:-0.8, y:0.8}, {x:-1.0, y:0.4}, {x:-1.0, y:-0.5}, {x:-0.7, y:-0.9}, {x:0.6, y:-0.8} ], // Asymmetric block
        fillColor: [140, 130, 120], strokeColor: [80, 75, 70], strokeW: 1.2, // Brownish grey
        typicalCargo: ["Food", "Machinery", "Metals"],
        price: 2660
    },
    "NomadVoyager": { // NEW - Explorer 2
        name: "Nomad Voyager", role: "Deep Space Explorer", sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 5.2, baseThrust: 0.07, baseTurnRateDegrees: 2.9, baseHull: 180, baseShield: 220, shieldRecharge: 1.5, cargoCapacity: 70,
        armament: ["Beam Laser", "Mini-Turret"], // Long range exploration
        costCategory: "High", description: "Self-sufficient long-range vessel built for endurance.",
        drawFunction: drawNomadVoyager, vertexData: [ {x:0.9, y:0}, {x:0.7, y:0.5}, {x:0.1, y:0.8}, {x:-0.8, y:0.7}, {x:-1.1, y:0}, {x:-0.8, y:-0.7}, {x:0.1, y:-0.8}, {x:0.7, y:-0.5} ], // Rounded, pod-like
        fillColor: [200, 200, 190], strokeColor: [100, 100, 90], strokeW: 1.5, // Off-white / beige
        typicalCargo: ["Minerals", "Food", "Medicine"],
        price: 9360
    },
    "PathfinderSurvey": { // NEW - Explorer 1
        name: "Pathfinder Survey", role: "Long Range Scanner", sizeCategory: "Medium", size: 62,
        baseMaxSpeed: 5.0, baseThrust: 0.06, baseTurnRateDegrees: 2.5, baseHull: 120, baseShield: 150, shieldRecharge: 1.2, cargoCapacity: 50,
        armament: ["Beam Laser", "Scatter Beam"], // Scanning/scientific
        costCategory: "Medium", description: "Designed for exploration and detailed surface scanning.",
        drawFunction: drawPathfinderSurvey, vertexData: [ {x:1.2, y:0}, {x:0.8, y:0.2}, {x:-0.5, y:0.5}, {x:-1.0, y:0.3}, {x:-1.0, y:-0.3}, {x:-0.5, y:-0.5}, {x:0.8, y:-0.2} ], // Long nose
        fillColor: [130, 160, 170], strokeColor: [200, 230, 240], strokeW: 1.2, // Teal / Light Blue-grey
        typicalCargo: ["Food", "Minerals", "Metals", "Adv Components"],
        price: 6000
    },
    "ProspectorMiner": { // NEW - Miner
        name: "Prospector Miner", role: "Mining Vessel", sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 3.5, baseThrust: 0.08, baseTurnRateDegrees: 2.2, baseHull: 200, baseShield: 80, shieldRecharge: 0.9, cargoCapacity: 80, // Includes refinery space
        armament: ["Beam Laser", "Pulse Laser"], // Mining tools
        costCategory: "Medium", description: "Dedicated mining ship with processing capabilities.",
        drawFunction: drawProspectorMiner, vertexData: [ {x:0.6, y:0}, {x:0.4, y:0.8}, {x:-0.4, y:0.9}, {x:-0.9, y:0.6}, {x:-1.0, y:-0.3}, {x:-0.9, y:-0.6}, {x:-0.4, y:-0.9}, {x:0.4, y:-0.8} ], // Bulky, functional
        fillColor: [180, 170, 160], strokeColor: [100, 95, 90], strokeW: 1.8, // Industrial grey/brown
        typicalCargo: ["Minerals", "Metals"],
        price: 7000
    },
    "Python": {
        name: "Python", role: "Heavy Multi/Trader", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRateDegrees: 2.2, baseHull: 280, baseShield: 250, shieldRecharge: 0.9, cargoCapacity: 220,
        armament: ["Heavy Cannon", "Arc Projector", "Mini-Turret"], // Versatile heavy combat
        costCategory: "High", description: "Versatile heavy multi-role. Good trader, capable fighter.",
        drawFunction: drawPython, vertexData: [ { x: 0.8, y: 0 }, { x: 0.6, y: 0.7 }, { x: -0.6, y: 0.9 }, { x: -1.0, y: 0.6 }, { x: -1.0, y: -0.6 }, { x: -0.6, y: -0.9 }, { x: 0.6, y: -0.7 } ],
        fillColor: [140, 140, 150], strokeColor: [180, 180, 190], strokeW: 2,
        typicalCargo: ["Luxury Goods", "Medicine", "Metals", "Chemicals"],
        price: 12600
    },
    "ShardInterceptor": { // NEW - Alien 1
        name: "Shard Interceptor (Alien)", role: "Alien Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 8.5, baseThrust: 0.18, baseTurnRateDegrees: 5.0, baseHull: 50, baseShield: 100, shieldRecharge: 1.8, // Crystalline structure?
        armament: ["Disruptor", "Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Fast alien fighter composed of sharp, crystalline structures.",
        drawFunction: drawShardInterceptor, vertexData: [ {x:1.1, y:0}, {x:-0.2, y:0.2}, {x:-0.8, y:0.8}, {x:-1.0, y:0.1}, {x:-1.0, y:-0.1}, {x:-0.8, y:-0.8}, {x:-0.2, y:-0.2} ], // Asymmetric shards
        fillColor: [180, 180, 240], strokeColor: [240, 240, 255], strokeW: 1.0, // Set in draw func: Blue/Purple/White
        typicalCargo: [],
        price: 9000
    },
    "Sidewinder": {
        name: "Sidewinder", role: "Starter", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRateDegrees: 4.0, baseHull: 50, baseShield: 50, shieldRecharge: 1.0, cargoCapacity: 10,
        armament: ["Pulse Laser"], // Starter weapon
        costCategory: "N/A", description: "Cheap, agile starter ship.",
        drawFunction: drawSidewinder, vertexData: [ { x: 0.9, y: 0 }, { x: -0.7, y: 0.8 }, { x: -0.9, y: 0 }, { x: -0.7, y: -0.8 } ],
        fillColor: [180, 100, 20], strokeColor: [220, 150, 50], strokeW: 1,
        typicalCargo: ["Food"],
        price: 2500
    },
    "StarlinerCruiser": { // NEW - Trader/Passenger
        name: "Starliner Cruiser", role: "Passenger Transport", sizeCategory: "Large", size: 105,
        baseMaxSpeed: 5.5, baseThrust: 0.07, baseTurnRateDegrees: 1.4, baseHull: 200, baseShield: 250, shieldRecharge: 1.1, cargoCapacity: 100, // Less cargo, more cabins assumed
        armament: ["Mini-Turret", "Twin Pulse"], // Defensive passenger ship
        costCategory: "High", description: "Long, sleek vessel designed primarily for passenger comfort.",
        drawFunction: drawStarlinerCruiser, vertexData: [ {x:1.2, y:0}, {x:1.0, y:0.2}, {x:-0.9, y:0.3}, {x:-1.1, y:0.1}, {x:-1.1, y:-0.1}, {x:-0.9, y:-0.3}, {x:1.0, y:-0.2} ], // Elongated
        fillColor: [230, 230, 235], strokeColor: [180, 180, 200], strokeW: 1.5, // White/Silver
        typicalCargo: ["Luxury Goods", "Food", "Medicine"],
        price: 11000
    },
    "Thargoid": { // (Original Thargoid)
        name: "Thargoid Interceptor", role: "Alien Combat", sizeCategory: "Large", size: 60,
        baseMaxSpeed: 8.0, baseThrust: 0.20, baseTurnRateDegrees: 6.0, baseHull: 200, baseShield: 300, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"], // Alien arsenal
        costCategory: "N/A", description: "Hostile alien vessel. Highly dangerous.",
        drawFunction: drawThargoid, vertexData: [], // Not editable via vertex data in this setup
        typicalCargo: ["Chemicals", "Adv Components", "Narcotics"],
        price: 16000
    },
    "Type6Transporter": {
        name: "Type-6 Transporter", role: "Trader", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.2, baseThrust: 0.06, baseTurnRateDegrees: 2.0, baseHull: 100, baseShield: 60, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"], // Basic trader defense
        costCategory: "Low-Medium", description: "Dedicated Lakon transport vessel. Boxy but efficient.",
        drawFunction: drawType6Transporter, vertexData: [ { x: 0.7, y: 0.3 }, { x: 0.7, y: 0.7 }, { x: -0.8, y: 0.8 }, { x: -1.0, y: 0.6 }, { x: -1.0, y: -0.6 }, { x: -0.8, y: -0.8 }, { x: 0.7, y: -0.7 }, { x: 0.7, y: -0.3 } ],
        fillColor: [210, 160, 70], strokeColor: [120, 90, 40], strokeW: 1.5,
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery"],
        price: 4200
    },
     "Type9Heavy": {
        name: "Type-9 Heavy", role: "Heavy Trader", sizeCategory: "Very Large", size: 110,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRateDegrees: 0.8, baseHull: 450, baseShield: 250, shieldRecharge: 0.6, cargoCapacity: 500,
        armament: ["Mini-Turret", "Double Shot", "Twin Pulse"], // Defensive cargo hauler
        costCategory: "High", description: "The quintessential Lakon heavy cargo hauler. Slow and massive.",
        drawFunction: drawType9Heavy, vertexData: [ { x: 0.6, y: 0.2 }, { x: 0.7, y: 0.8 }, { x: -0.8, y: 0.9 }, { x: -1.0, y: 0.8 }, { x: -1.0, y: -0.8 }, { x: -0.8, y: -0.9 }, { x: 0.7, y: -0.8 }, { x: 0.6, y: -0.2 } ],
        fillColor: [190, 140, 60], strokeColor: [110, 80, 30], strokeW: 2.5,
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery", "Chemicals", "Computers"],
        price: 50250
    },
    "Viper": { 
        name: "Viper", role: "Fighter", sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRateDegrees: 4.5, baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 4,
        armament: ["Multi-Cannon", "Twin Pulse"], // Fast fighter
        costCategory: "Medium", description: "Fast, agile police and bounty hunter interceptor.",
        drawFunction: drawViper, // Uses the same draw function
        vertexData: [ { x: 1.1, y: 0 }, { x: -0.6, y: 0.5 }, { x: -1, y: 0.3 }, { x: -1, y: -0.3 }, { x: -0.6, y: -0.5 } ],
        fillColor: [210, 210, 220], strokeColor: [100, 100, 150], strokeW: 1,
        typicalCargo: ["Weapons", "Narcotics"],
        price: 6000
    },
     "Vulture": {
        name: "Vulture", role: "Heavy Fighter", sizeCategory: "Small", size: 38,
        baseMaxSpeed: 5.5, baseThrust: 0.14, baseTurnRateDegrees: 5.5, baseHull: 150, baseShield: 250, shieldRecharge: 1.6, cargoCapacity: 8,
        armament: ["Heavy Cannon", "Burst Blaster"], // Aggressive fighter
        costCategory: "Medium-High", description: "Agile heavy fighter with powerful hardpoints but power-hungry.",
        drawFunction: drawVulture, vertexData: [ { x: 0.8, y: 0 }, { x: 0.4, y: 0.7 }, { x: -0.7, y: 0.8 }, { x: -1.0, y: 0.2 }, { x: -1.0, y: -0.2 }, { x: -0.7, y: -0.8 }, { x: 0.4, y: -0.7 } ],
        fillColor: [80, 90, 80], strokeColor: [150, 160, 150], strokeW: 1.5,
        typicalCargo: ["Weapons", "Narcotics", "Slaves"],
        price: 8250
    },
    "WaspAssault": { // NEW - Light Fighter 2
        name: "Wasp Assault Craft", role: "Assault Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRateDegrees: 5.2, baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 2,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Aggressive fighter with forward-swept wings.",
        drawFunction: drawWaspAssault, vertexData: [ { x: 0.9000, y: 0.0000 }, { x: -0.1473, y: 0.3081 }, { x: -0.3146, y: 0.9825 }, { x: -0.5494, y: 0.9822 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.5494, y: -0.9822 }, { x: -0.3146, y: -0.9825 }, { x: -0.1473, y: -0.3081 } ],
        fillColor: [210, 190, 80],
        strokeColor: [120, 100, 30],
        strokeW: 1.00,
        typicalCargo: ["Weapons", "Computers"],
        price: 8000
    },
};
// --- End Ship Definitions ---

console.log(`ships.js (Editor Version with ${Object.keys(SHIP_DEFINITIONS).length} ships) loaded and SHIP_DEFINITIONS created.`); // Updated log