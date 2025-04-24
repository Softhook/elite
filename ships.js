// ****** ships.js ******
// Contains ship drawing functions and the global SHIP_DEFINITIONS object.
// MUST be loaded AFTER p5.js but BEFORE player.js, enemy.js, etc.
// MODIFIED FOR EDITOR: Includes vertexData array and updated draw functions.
// VERSION WITH 10+15 NEW SHIP DESIGNS ADDED, Viper/Krait names reverted.

// Enhanced helper function to draw shape from vertex data or layers
function drawShapeFromData(r, vertexDataOrLayers, defaultFillColor, defaultStrokeColor, defaultStrokeW) {
    // Check if we have layers array (multi-layer ship)
    if (Array.isArray(vertexDataOrLayers) && vertexDataOrLayers.length > 0 && 
        vertexDataOrLayers[0].vertexData) {
        
        // Draw multiple layers in forward order (top layer first)
        for (let i = 0; i < vertexDataOrLayers.length; i++) {
            const layer = vertexDataOrLayers[i];
            if (layer.vertexData && layer.vertexData.length > 0) {
                fill(layer.fillColor || defaultFillColor);
                stroke(layer.strokeColor || defaultStrokeColor);
                strokeWeight(layer.strokeW || defaultStrokeW || 1);
                beginShape();
                for (let v of layer.vertexData) {
                    vertex(v.x * r, v.y * r);
                }
                endShape(CLOSE);
            }
        }
    } else {
        // Original single-layer logic remains unchanged
        if (defaultFillColor) fill(defaultFillColor); else noFill();
        if (defaultStrokeColor) { 
            stroke(defaultStrokeColor); 
            strokeWeight(defaultStrokeW || 1); 
        } else { 
            noStroke(); 
        }
        beginShape();
        for (let v of vertexDataOrLayers) {
            vertex(v.x * r, v.y * r);
        }
        endShape(CLOSE);
    }
}

// --- Ship Drawing Functions (Using vertexData) ---

// Original Ships 

function drawACAB(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ACAB;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSidewinder(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Sidewinder;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawCobraMkIII(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.CobraMkIII;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawViper(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Viper;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawPython(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Python;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawAnaconda(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Anaconda;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawAdder(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Adder;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawKraitMKI(s, thrusting = false) { 
     let r = s / 2; let def = SHIP_DEFINITIONS.KraitMKI; 
     drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawKraitMKII(s, thrusting = false) { 
    let r = s / 2; let def = SHIP_DEFINITIONS.KraitMKII; 
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawThargoid(s, thrusting = false) { // (Original Thargoid)
    let r = s / 2;
    let baseHue = (frameCount * 0.5) % 360; colorMode(HSB, 360, 100, 100, 100);
    fill(baseHue, 80, 70, 80); stroke( (baseHue + 40) % 360, 90, 90, 90); strokeWeight(2);
    beginShape();
    for (let i = 0; i < 8; i++) {
        let angle1 = map(i, 0, 8, 0, TWO_PI); // Using TWO_PI (radians)
        let angle2 = map(i + 0.5, 0, 8, 0, TWO_PI);
        let outerR = r * 1.1; let innerR = r * 0.6;
        vertex(cos(angle1) * outerR, sin(angle1) * outerR); vertex(cos(angle2) * innerR, sin(angle2) * innerR);
    } endShape(CLOSE);
    colorMode(RGB, 255); fill(0, 255, 150, map(sin(frameCount * 0.1), -1, 1, 50, 150)); noStroke();
    ellipse(0, 0, r*0.5, r*0.5);
}

function drawAspExplorer(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.AspExplorer;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawType6Transporter(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Type6Transporter;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawType9Heavy(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Type9Heavy;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawFederalAssaultShip(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.FederalAssaultShip;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialCourier(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialCourier;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawDiamondbackExplorer(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.DiamondbackExplorer;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawFerDeLance(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.FerDeLance;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawKeelback(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Keelback;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawVulture(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Vulture;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialClipper(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialClipper;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawShardInterceptor(s, thrusting = false) { // Alien 1
    let r = s / 2; let def = SHIP_DEFINITIONS.ShardInterceptor;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawBioFrigate(s, thrusting = false) { // Alien 2
    let r = s / 2; let def = SHIP_DEFINITIONS.BioFrigate;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawGeometricDrone(s, thrusting = false) { // Alien 3
    let r = s / 2; let def = SHIP_DEFINITIONS.GeometricDrone;
    // Sharp geometric look
    push(); // Use push/pop for rotation
    rotate(frameCount * 0.3); // Assuming radians
    drawShapeFromData(r, def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}

function drawMuleFreighter(s, thrusting = false) { // Small Transporter
    let r = s / 2; let def = SHIP_DEFINITIONS.MuleFreighter;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
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
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawWaspAssault(s, thrusting = false) { // Light Fighter 2
    let r = s / 2; let def = SHIP_DEFINITIONS.WaspAssault;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawGladiusFighter(s, thrusting = false) { // Medium Fighter
    let r = s / 2; let def = SHIP_DEFINITIONS.GladiusFighter;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawCenturionGunship(s, thrusting = false) { // Heavy Fighter
    let r = s / 2; let def = SHIP_DEFINITIONS.CenturionGunship;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawPathfinderSurvey(s, thrusting = false) { // Explorer 1
    let r = s / 2; let def = SHIP_DEFINITIONS.PathfinderSurvey;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
    // Implied Sensor dish
    noFill(); stroke(180, 180, 220); strokeWeight(1); arc(r*0.8, 0, r*0.4, r*0.8, -90, 90);
}

function drawNomadVoyager(s, thrusting = false) { // Explorer 2
    let r = s / 2; let def = SHIP_DEFINITIONS.NomadVoyager;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawStarlinerCruiser(s, thrusting = false) { // Trader/Passenger
    let r = s / 2; let def = SHIP_DEFINITIONS.StarlinerCruiser;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawJackalMultirole(s, thrusting = false) { // Multi-role
    let r = s / 2; let def = SHIP_DEFINITIONS.JackalMultirole;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

function drawMantaHauler(s, thrusting = false) { // Unique 1
    let r = s / 2; let def = SHIP_DEFINITIONS.MantaHauler;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawHammerheadCorvette(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HammerheadCorvette;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}


// --- End Ship Drawing Functions ---


// --- Global Ship Definitions Object ---
// Stores base stats AND VERTEX DATA for each ship type.
const SHIP_DEFINITIONS = {
    "ACAB": {
        name: "ACAB", role: "Police", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 12,
        armament: ["Twin Pulse"],
        costCategory: "Low", description: "Standard Police.",
        drawFunction: drawACAB, vertexData: [ { x: 0.8969, y: 0.0000 }, { x: 0.1469, y: 0.4929 }, { x: -0.6673, y: 0.6286 }, { x: -0.6031, y: 0.0000 }, { x: -0.6673, y: -0.6286 }, { x: 0.1469, y: -0.4929 } ],
        fillColor: [100, 150, 200],
        strokeColor: [151, 181, 196],
        strokeW: 1.00,
        typicalCargo: [],
        price: 2700,
        aiRoles: ["POLICE"]
    },
    "Adder": {
        name: "Adder", role: "Trader/Explorer", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 22,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "Affordable entry-level freighter or explorer.",
        drawFunction: drawAdder, vertexData: [ { x: 0.8, y: 0 }, { x: 0.2, y: 0.8 }, { x: -0.9, y: 0.7 }, { x: -0.7, y: 0 }, { x: -0.9, y: -0.9 }, { x: 0.1, y: -0.7 } ],
        fillColor: [160, 160, 140], strokeColor: [200, 200, 180], strokeW: 1,
        typicalCargo: ["Food", "Textiles", "Minerals"],
        price: 2700,
        aiRoles: ["HAULER"]
    },
    "Anaconda": {
        name: "Anaconda", role: "Heavy Combat/Multi", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRate: 0.02094,
        baseHull: 400, baseShield: 350, shieldRecharge: 0.7, cargoCapacity: 150,
        armament: ["Force Blaster"],
        costCategory: "Very High", description: "A mobile fortress, the pinnacle of conventional design.",
        drawFunction: drawAnaconda, vertexData: [ { x: 1.2, y: 0 }, { x: 0.9, y: 0.3 }, { x: -0.9, y: 0.4 }, { x: -1.1, y: 0.2 }, { x: -1.1, y: -0.2 }, { x: -0.9, y: -0.4 }, { x: 0.9, y: -0.3 } ],
        fillColor: [80, 90, 100], strokeColor: [150, 160, 170], strokeW: 2.5,
        typicalCargo: ["Luxury Goods", "Adv Components", "Metals", "Machinery","Minerals"],
        price: 12000,
        aiRoles: ["HAULER", "MILITARY"]
    },
    "AspExplorer": {
        name: "Asp Explorer", role: "Explorer/Multi-Role", sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRate: 0.05585,
        baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 80,
        armament: ["Beam Laser", "Twin Pulse"],
        costCategory: "Medium-High", description: "Iconic explorer with excellent visibility and jump range.",
        drawFunction: drawAspExplorer, vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.4127, y: 0.5133 }, { x: -0.4250, y: 0.8750 }, { x: -0.9000, y: 0.3000 }, { x: -0.9000, y: -0.3000 }, { x: -0.4250, y: -0.8750 }, { x: 0.4127, y: -0.5133 } ],
        fillColor: [200, 180, 80],
        strokeColor: [100, 90, 40],
        strokeW: 1.50,
        typicalCargo: ["Minerals","Minerals","Minerals","Minerals", "Medicine", "Computers"],
        price: 8250,
        aiRoles: ["EXPLORER"]
    },
    "BioFrigate": {
        name: "Bio-Frigate (Alien)", role: "Alien Cruiser", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.0, baseThrust: 0.1, baseTurnRate: 0.03491,
        baseHull: 500, baseShield: 150, shieldRecharge: 2.5,
        armament: ["Force Blaster", "Disruptor"],
        costCategory: "N/A", description: "Large, organic alien vessel. Slow but durable.",
        drawFunction: drawBioFrigate,
        
        fillColor: [80, 140, 100],
        strokeColor: [40, 80, 50],
        strokeW: 2.50,
        
        vertexLayers: [
            {
                vertexData: [ { x: 0.9619, y: 0.0000 }, { x: 0.5195, y: 0.6500 }, { x: 0.1625, y: 0.7625 }, { x: -0.1625, y: 0.7625 }, { x: -0.5195, y: 0.6500 }, { x: -0.7517, y: 0.4402 }, { x: -0.9000, y: 0.2000 }, { x: -0.9619, y: 0.0000 }, { x: -0.9000, y: -0.2000 }, { x: -0.7517, y: -0.4402 }, { x: -0.5386, y: -0.6424 }, { x: -0.1701, y: -0.7854 }, { x: 0.1701, y: -0.7854 }, { x: 0.5386, y: -0.6424 } ],
                fillColor: [80, 140, 100],
                strokeColor: [40, 80, 50],
                strokeW: 2.50
            },
            {
                vertexData: [ { x: 0.0000, y: -0.5162 }, { x: 0.3110, y: -0.1819 }, { x: 0.9574, y: 0.0000 }, { x: 0.3110, y: 0.1819 }, { x: 0.0000, y: 0.5162 }, { x: -0.3857, y: 0.0000 } ],
                fillColor: [230, 61, 120],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],

        typicalCargo: ["Metals", "Chemicals", "Adv Components"],
        price: 20000,
        aiRoles: ["ALIEN"]
    },
    "CenturionGunship": {
        name: "Centurion Gunship", role: "Heavy Fighter", sizeCategory: "Large", size: 72,
        baseMaxSpeed: 4.8, baseThrust: 0.13, baseTurnRate: 0.04538,
        baseHull: 320, baseShield: 220, shieldRecharge: 1.0, cargoCapacity: 20,
        armament: ["Heavy Cannon", "Quad Pulse", "Beam Laser"], // Balanced heavy firepower
        costCategory: "High", description: "Slow, heavily armed and armored gun platform.",
        drawFunction: drawCenturionGunship, vertexData: [ { x: 0.8000, y: 0.0000 }, { x: 0.7000, y: 0.4000 }, { x: 0.0000, y: 0.5048 }, { x: 0.3967, y: 0.6548 }, { x: 0.3896, y: 0.8786 }, { x: -0.7000, y: 0.9000 }, { x: -1.0000, y: 0.6000 }, { x: -1.0000, y: -0.6000 }, { x: -0.7000, y: -0.9000 }, { x: 0.3896, y: -0.8786 }, { x: 0.3967, y: -0.6548 }, { x: 0.0000, y: -0.5048 }, { x: 0.7000, y: -0.4000 } ],
        fillColor: [100, 105, 115],
        strokeColor: [160, 165, 175],
        strokeW: 2.20,
        typicalCargo: ["Weapons", "Metals", "Machinery"],
        price: 15360,
        aiRoles: ["MILITARY"]
    },
    "CobraMkIII": {
        name: "Cobra Mk III", role: "Multi-Role", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRate: 0.06109,
        baseHull: 120, baseShield: 100, shieldRecharge: 1.2, cargoCapacity: 44,
        armament: ["Multi-Cannon", "Twin Pulse"], // Versatile loadout
        costCategory: "Medium", description: "The legendary jack-of-all-trades.",
        drawFunction: drawCobraMkIII, 
        vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.3000, y: 0.5270 }, { x: -0.5045, y: 0.5634 }, { x: -0.5000, y: 0.2000 }, { x: -0.7734, y: 0.1770 }, { x: -0.7734, y: -0.1770 }, { x: -0.5000, y: -0.2000 }, { x: -0.5045, y: -0.5634 }, { x: 0.3000, y: -0.5270 } ],
        fillColor: [100, 150, 200],
        strokeColor: [200, 220, 255],
        strokeW: 1.50,
        typicalCargo: ["Food"],
        price: 7200,
        aiRoles: ["POLICE", "HAULER"]
    },
    "DiamondbackExplorer": {
        name: "Diamondback Explorer", role: "Explorer/Light Combat", sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.05236,
        baseHull: 130, baseShield: 100, shieldRecharge: 1.1, cargoCapacity: 40,
        armament: ["Beam Laser", "Double Shot"], // Explorer with some punch
        costCategory: "Medium", description: "Utilitarian explorer known for good heat management.",
        drawFunction: drawDiamondbackExplorer, vertexData: [ { x: 1.0, y: 0 }, { x: 0.2, y: 0.4 }, { x: -0.5, y: 0.9 }, { x: -0.9, y: 0.5 }, { x: -0.8, y: 0 }, { x: -0.9, y: -0.5 }, { x: -0.5, y: -0.9 }, { x: 0.2, y: -0.4 } ],
        fillColor: [100, 110, 90], strokeColor: [160, 170, 150], strokeW: 1.5,
        typicalCargo: ["Minerals", "Metals", "Adv Components"],
        price: 6500,
        aiRoles: ["EXPLORER"]
    },
    "FederalAssaultShip": {
        name: "Federal Assault Ship", role: "Heavy Fighter", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 5.0, baseThrust: 0.12, baseTurnRate: 0.04363,
        baseHull: 300, baseShield: 200, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Heavy Cannon", "Multi-Cannon", "Railgun Turret"], // Military arsenal
        costCategory: "High", description: "Federation military vessel. Tough hull, good firepower.",
        drawFunction: drawFederalAssaultShip, 
        
        fillColor: [110, 120, 130],
        strokeColor: [180, 190, 200],
        strokeW: 2.00,
        
        vertexLayers: [
            {
                vertexData: [ { x: 0.9000, y: 0.0000 }, { x: 0.7000, y: 0.5000 }, { x: -0.2000, y: 0.6000 }, { x: -0.8000, y: 0.8000 }, { x: -1.0000, y: 0.4000 }, { x: -1.0000, y: -0.4000 }, { x: -0.8000, y: -0.8000 }, { x: -0.2000, y: -0.6000 }, { x: 0.7000, y: -0.5000 } ],
                fillColor: [110, 120, 130],
                strokeColor: [180, 190, 200],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: -0.7567, y: -0.3486 }, { x: 0.7567, y: -0.3486 }, { x: -0.6661, y: -0.5037 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                vertexData: [ { x: -0.7339, y: 0.3453 }, { x: 0.7405, y: 0.3453 }, { x: -0.6367, y: 0.4955 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            }
        ],

        typicalCargo: ["Computers","Computers","Computers","Weapons", "Metals", "Adv Components"],
        price: 15000,
        aiRoles: ["MILITARY"]
    },
    "FerDeLance": {
        name: "Fer-de-Lance", role: "Heavy Combat", sizeCategory: "Large", size: 65,
        baseMaxSpeed: 6.5, baseThrust: 0.11, baseTurnRate: 0.05236,
        baseHull: 180, baseShield: 350, shieldRecharge: 1.8, cargoCapacity: 24,
        armament: ["Sniper Rail", "Force Blaster", "Pulse Array"],
        costCategory: "Very High", description: "Luxury high-performance combat ship.",
        drawFunction: drawFerDeLance, 
        // Original vertex data (for backward compatibility)
        vertexData: [ { x: 1.1, y: 0 }, { x: 0.2, y: 0.5 }, { x: -0.6, y: 0.6 }, 
                    { x: -0.9, y: 0.2 }, { x: -0.9, y: -0.2 }, { x: -0.6, y: -0.6 }, 
                    { x: 0.2, y: -0.5 } ],
        // Add the new multi-layer format
        vertexLayers: [
            {
                // Main hull (Layer 1)
                vertexData: [ { x: 1.1000, y: 0.0000 }, { x: 0.2000, y: 0.5000 }, 
                            { x: -0.6000, y: 0.6000 }, { x: -0.9000, y: 0.2000 }, 
                            { x: -0.9000, y: -0.2000 }, { x: -0.6000, y: -0.6000 }, 
                            { x: 0.2000, y: -0.5000 } ],
                fillColor: [60, 65, 70],
                strokeColor: [140, 150, 160],
                strokeW: 2.00
            },
            {
                // Detail triangle 1 (Layer 2)
                vertexData: [ { x: -0.8998, y: -0.2009 }, { x: 0.0000, y: -0.2431 }, 
                            { x: -0.6013, y: -0.5970 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                // Detail triangle 2 (Layer 3)
                vertexData: [ { x: -0.8995, y: 0.2035 }, { x: -0.6020, y: 0.5957 }, 
                            { x: 0.0000, y: 0.3052 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                // Detail triangle 3 (Layer 4)
                vertexData: [ { x: 0.5349, y: 0.0000 }, { x: 0.2360, y: 0.1505 }, 
                            { x: 0.2360, y: -0.1505 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            }
        ],
        fillColor: [60, 65, 70], strokeColor: [140, 150, 160], strokeW: 2,
        typicalCargo: ["Computers","Computers","Computers","Computers","Luxury Goods", "Weapons", "Narcotics"],
        price: 11700,
        aiRoles: ["MILITARY"]
    },
    "GeometricDrone": {
        name: "Geometric Drone (Alien)", role: "Alien Scout?", sizeCategory: "Tiny", size: 15,
        baseMaxSpeed: 9.0, baseThrust: 0.2, baseTurnRate: 0.13963,
        baseHull: 20, baseShield: 40, shieldRecharge: 1.5, cargoCapacity: 0,
        armament: ["Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Small, fast, rotating alien drone. Unknown purpose.",
        drawFunction: drawGeometricDrone, vertexData: [ {x:1,y:0}, {x:0.5,y:0.87}, {x:-0.5,y:0.87}, {x:-1,y:0}, {x:-0.5,y:-0.87}, {x:0.5,y:-0.87} ], // Regular Hexagon
        fillColor: [50, 50, 60], strokeColor: [200, 200, 255], strokeW: 1.0, // Dark metallic, light stroke
        typicalCargo: [],
        price: 1800,
        aiRoles: ["ALIEN"]
    },
    "GladiusFighter": {
        name: "Gladius Fighter", role: "Medium Fighter", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Twin Pulse"], // Fast attack loadout
        costCategory: "Medium", description: "Balanced space superiority fighter. Agile and well-armed.",
        drawFunction: drawGladiusFighter, vertexData: [ {x:1.1, y:0}, {x:0.3, y:0.4}, {x:-0.2, y:0.7}, {x:-0.9, y:0.5}, {x:-1.0, y:0}, {x:-0.9, y:-0.5}, {x:-0.2, y:-0.7}, {x:0.3, y:-0.4} ],
        fillColor: [190, 195, 200], strokeColor: [120, 125, 140], strokeW: 1.5, // Light grey / medium grey
        typicalCargo: ["Computers"],
        price: 7000,
        aiRoles: ["MILITARY"]
    },
    "GnatInterceptor": { // NEW - Light Fighter 1
        name: "Gnat Interceptor", role: "Light Interceptor", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 9.5, baseThrust: 0.22, baseTurnRate: 0.10472,
        baseHull: 30, baseShield: 30, shieldRecharge: 1.2, cargoCapacity: 0,
        armament: ["Pulse Laser"], // Fast single weapon
        costCategory: "Very Low", description: "Extremely fast and small, but fragile interceptor.",
        drawFunction: drawGnatInterceptor, vertexData: [ {x:1.1, y:0}, {x:-0.8, y:0.4}, {x:-1.0, y:0}, {x:-0.8, y:-0.4} ], // Very simple dart
        fillColor: [200, 60, 60], strokeColor: [255, 150, 150], strokeW: 0.8, // Red
        typicalCargo: [],
        price: 8850,
        aiRoles: ["MILITARY"]
    },
    "HammerheadCorvette": { // NEW - Unique 2
        name: "Hammerhead Corvette", role: "Corvette/Patrol", sizeCategory: "Large", size: 80,
        baseMaxSpeed: 4.0, baseThrust: 0.09, baseTurnRate: 0.04014,
        baseHull: 350, baseShield: 280, shieldRecharge: 1.0, cargoCapacity: 60,
        armament: ["Heavy Cannon", "Railgun Turret", "Wide Scatter"], // Military loadout
        costCategory: "High", description: "Distinctive forward 'hammerhead' module, likely housing sensors or weapons.",
        drawFunction: drawHammerheadCorvette, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.8888, y: 0.3500 }, { x: 0.5937, y: 0.4670 }, { x: 0.4300, y: 0.7285 }, { x: 0.1520, y: 0.8587 }, { x: -0.1612, y: 0.5488 }, { x: -0.9161, y: 0.4670 }, { x: -0.9159, y: 0.3625 }, { x: -0.5436, y: 0.1330 }, { x: -0.5436, y: -0.1330 }, { x: -0.9159, y: -0.3625 }, { x: -0.9202, y: -0.4650 }, { x: -0.1612, y: -0.5488 }, { x: 0.1520, y: -0.8587 }, { x: 0.4300, y: -0.7285 }, { x: 0.5978, y: -0.4650 }, { x: 0.8888, y: -0.3500 }, { x: 0.9388, y: 0.0000 } ],
                fillColor: [70, 100, 130],
                strokeColor: [150, 180, 210],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: 0.1514, y: -0.7686 }, { x: 0.3629, y: -0.6314 }, { x: 0.0000, y: -0.4986 }, { x: 0.0000, y: -0.4986 } ],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 0.10
            },
            {
                vertexData: [ { x: 0.0000, y: 0.4871 }, { x: 0.0000, y: 0.4871 }, { x: 0.3957, y: 0.6086 }, { x: 0.1714, y: 0.7857 } ],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 0.10
            },
            {
                vertexData: [ { x: 0.3390, y: 0.2149 }, { x: 0.5773, y: 0.2548 }, { x: 0.7510, y: 0.0000 }, { x: 0.5773, y: -0.2548 }, { x: 0.3390, y: -0.2149 } ],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],

        fillColor: [70, 100, 130],
        strokeColor: [150, 180, 210],
        strokeW: 2.00, // Blue-grey
        typicalCargo: ["Machinery", "Metals", "Food","Metals", "Weapons"],
        price: 14000,
        aiRoles: ["MILITARY"]
    },
    "ImperialClipper": {
        name: "Imperial Clipper", role: "Multi-Role/Trader", sizeCategory: "Large", size: 95,
        baseMaxSpeed: 7.0, baseThrust: 0.10, baseTurnRate: 0.02618,
        baseHull: 180, baseShield: 180, shieldRecharge: 1.4, cargoCapacity: 180,
        armament: ["Arc Projector", "Mini-Turret", "Beam Laser"], // Elegant, balanced
        costCategory: "High", description: "Elegant and fast Imperial ship, excels in straight lines.",
        drawFunction: drawImperialClipper, vertexData: [ { x: 1.1, y: 0 }, { x: 0.7, y: 0.2 }, { x: 0.1, y: 0.9 }, { x: -0.8, y: 0.8 }, { x: -1.0, y: 0.4 }, { x: -1.0, y: -0.4 }, { x: -0.8, y: -0.8 }, { x: 0.1, y: -0.9 }, { x: 0.7, y: -0.2 } ],
        fillColor: [220, 225, 230], strokeColor: [100, 150, 200], strokeW: 1.5,
        typicalCargo: ["Luxury Goods", "Medicine", "Textiles", "Textiles", "Textiles"],
        price: 12600,
        aiRoles: ["HAULER"]
    },
    "ImperialCourier": {
        name: "Imperial Courier", role: "Light Fighter/Multi", sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.8, baseThrust: 0.16, baseTurnRate: 0.07505,
        baseHull: 70, baseShield: 150, shieldRecharge: 1.7, cargoCapacity: 12,
        armament: ["Pulse Array", "Beam Laser"], // Elegant, refined
        costCategory: "Medium", description: "Fast, sleek Imperial ship with strong shields for its size.",
        drawFunction: drawImperialCourier, vertexData: [ { x: 1.0, y: 0 }, { x: 0.4, y: 0.3 }, { x: -0.5, y: 0.5 }, { x: -0.9, y: 0.4 }, { x: -1.0, y: 0 }, { x: -0.9, y: -0.4 }, { x: -0.5, y: -0.5 }, { x: 0.4, y: -0.3 } ],
        fillColor: [210, 215, 220], strokeColor: [80, 130, 180], strokeW: 1,
        typicalCargo: ["Luxury Goods", "Medicine"],
        price: 5460,
        aiRoles: ["MILITARY"]
    },
    "JackalMultirole": { // NEW - Multi-role
        name: "Jackal Multirole", role: "Multi-Role", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRate: 0.06283,
        baseHull: 140, baseShield: 160, shieldRecharge: 1.2, cargoCapacity: 60,
        armament: ["Multi-Cannon", "Railgun Turret"], // Versatile
        costCategory: "Medium", description: "Adaptable, angular multi-purpose vessel.",
        drawFunction: drawJackalMultirole, vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.5000, y: 0.5000 }, { x: -0.2000, y: 0.8000 }, { x: -0.8000, y: 0.6000 }, { x: -0.4103, y: 0.1697 }, { x: -0.4103, y: -0.1697 }, { x: -0.8000, y: -0.6000 }, { x: -0.2000, y: -0.8000 }, { x: 0.5000, y: -0.5000 } ],
        fillColor: [170, 160, 150],
        strokeColor: [90, 80, 70],
        strokeW: 1.50, // Sandy grey
        typicalCargo: ["Machinery", "Metals", "Food"],
        price: 8120,
        aiRoles: ["HAULER","MILITARY"]
    },
    "Keelback": {
        name: "Keelback", role: "Combat Trader", sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.04363,
        baseHull: 180, baseShield: 90, shieldRecharge: 0.9, cargoCapacity: 50,
        armament: ["Twin Pulse", "Railgun Turret"], // Combat trader
        costCategory: "Medium", description: "A Type-6 variant retrofitted for combat, can carry a fighter.",
        drawFunction: drawKeelback, vertexData: [ { x: 0.6302, y: 0.0000 }, { x: 0.5000, y: 0.5114 }, { x: -0.2000, y: 0.6114 }, { x: -0.8000, y: 0.8114 }, { x: -1.0033, y: 0.5917 }, { x: -0.5571, y: 0.2745 }, { x: -0.7905, y: 0.1373 }, { x: -0.7839, y: -0.1373 }, { x: -0.5571, y: -0.2745 }, { x: -1.0033, y: -0.5917 }, { x: -0.8000, y: -0.8114 }, { x: -0.2000, y: -0.6114 }, { x: 0.5000, y: -0.5114 } ],
        fillColor: [180, 150, 80],
        strokeColor: [100, 80, 40],
        strokeW: 1.50,
        typicalCargo: ["Minerals", "Metals", "Machinery"],
        price: 7200,
        aiRoles: ["HAULER"]
    },
    "KraitMKI": { 
        name: "Krait MKI", role: "Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 6.2, baseThrust: 0.15, baseTurnRate: 0.06632,
        baseHull: 60, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 15,
        armament: ["Pulse Laser"],
        costCategory: "High", description: "Fighter popular with pirates.",
        drawFunction: drawKraitMKI,
        vertexData: [ { x: 0.4629, y: 0.0000 }, { x: 0.1200, y: 0.4186 }, { x: -0.6914, y: 0.4186 }, { x: -0.6914, y: -0.4071 }, { x: 0.1200, y: -0.4071 } ],
        fillColor: [100, 120, 100],
        strokeColor: [140, 160, 140],
        strokeW: 1.50,
        typicalCargo: [],
        price: 6000,
        aiRoles: ["PIRATE"]
    },

    "KraitMKII": { 
        name: "Krait MKII", role: "Multi-Role/Fighter", sizeCategory: "Medium", size: 60,
        baseMaxSpeed: 5.2, baseThrust: 0.11, baseTurnRate: 0.04014,
        baseHull: 100, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 82,
        armament: ["Mini-Turret"], // Combat focused Pirate
        costCategory: "High", description: "Multi-role ship, popular with pirates.",
        drawFunction: drawKraitMKII, // Uses the same draw function
         vertexData: [ { x: 1, y: 0 }, { x: 0.6, y: 0.5 }, { x: -0.4, y: 0.6 }, { x: -0.9, y: 0.4 }, { x: -0.9, y: -0.4 }, { x: -0.4, y: -0.6 }, { x: 0.6, y: -0.5 } ],
        fillColor: [100, 120, 100], strokeColor: [140, 160, 140], strokeW: 1.5,
        typicalCargo: ["Food","Minerals"],
        price: 6000,
        aiRoles: ["PIRATE"]
    },
    "MantaHauler": { // NEW - Unique 1
        name: "Manta Hauler", role: "Wide Cargo Hauler", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRate: 0.02793,
        baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 300,
        armament: ["Mini-Turret", "Force Blaster"], // Defensive
        costCategory: "Medium-High", description: "Extremely wide cargo ship, resembling a manta ray.",
        drawFunction: drawMantaHauler, vertexData: [ {x:0.8, y:0}, {x:0.2, y:0.3}, {x:-0.6, y:0.9}, {x:-0.9, y:0.7}, {x:-1.0, y:0}, {x:-0.9, y:-0.7}, {x:-0.6, y:-0.9}, {x:0.2, y:-0.3} ],
        fillColor: [60, 80, 90], strokeColor: [130, 160, 180], strokeW: 2.0, // Dark blue/teal
        typicalCargo: ["Minerals", "Metals", "Machinery", "Food", "Textiles"],
        price: 8750,
        aiRoles: ["HAULER"]
    },
    "MuleFreighter": { // NEW - Small Transporter
        name: "Mule Freighter", role: "Local Transport", sizeCategory: "Small", size: 25,
        baseMaxSpeed: 3.8, baseThrust: 0.05, baseTurnRate: 0.04887,
        baseHull: 70, baseShield: 0, shieldRecharge: 0.8, cargoCapacity: 20,
        armament: [],
        costCategory: "Very Low", description: "Slow, cheap, boxy short-range cargo shuttle.",
        drawFunction: drawMuleFreighter, vertexData: [ {x:0.6, y:0.7}, {x:-0.8, y:0.8}, {x:-1.0, y:0.4}, {x:-1.0, y:-0.5}, {x:-0.7, y:-0.9}, {x:0.6, y:-0.8} ], // Asymmetric block
        fillColor: [140, 130, 120], strokeColor: [80, 75, 70], strokeW: 1.2, // Brownish grey
        typicalCargo: ["Food", "Machinery", "Metals"],
        price: 2660,
        aiRoles: ["TRANSPORT"]
    },
    "NomadVoyager": { 
        name: "Nomad Voyager", role: "Deep Space Explorer", sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 5.2, baseThrust: 0.07, baseTurnRate: 0.05061,
        baseHull: 180, baseShield: 220, shieldRecharge: 1.5, cargoCapacity: 70,
        armament: ["Beam Laser", "Mini-Turret"], // Long range exploration
        costCategory: "High", description: "Self-sufficient long-range vessel built for endurance.",
        drawFunction: drawNomadVoyager, vertexData: [ {x:0.9, y:0}, {x:0.7, y:0.5}, {x:0.1, y:0.8}, {x:-0.8, y:0.7}, {x:-1.1, y:0}, {x:-0.8, y:-0.7}, {x:0.1, y:-0.8}, {x:0.7, y:-0.5} ], // Rounded, pod-like
        fillColor: [200, 200, 190], strokeColor: [100, 100, 90], strokeW: 1.5, // Off-white / beige
        typicalCargo: ["Minerals", "Food", "Medicine"],
        price: 9360,
        aiRoles: ["EXPLORER"]
    },
    "PathfinderSurvey": {
        name: "Pathfinder Survey", role: "Long Range Scanner", sizeCategory: "Medium", size: 62,
        baseMaxSpeed: 5.0, baseThrust: 0.06, baseTurnRate: 0.04363,
        baseHull: 120, baseShield: 150, shieldRecharge: 1.2, cargoCapacity: 50,
        armament: [],
        costCategory: "Medium", description: "Designed for exploration and detailed surface scanning.",
        drawFunction: drawPathfinderSurvey, 
        
        vertexLayers: [
            {
                vertexData: [ { x: 1.2000, y: 0.0000 }, { x: 0.8000, y: 0.2000 }, { x: -0.5000, y: 0.5000 }, { x: -1.0000, y: 0.3000 }, { x: -1.0000, y: -0.3000 }, { x: -0.5000, y: -0.5000 }, { x: 0.8000, y: -0.2000 } ],
                fillColor: [130, 160, 170],
                strokeColor: [200, 230, 240],
                strokeW: 1.20
            },
            {
                vertexData: [ { x: -0.1751, y: -0.5092 }, { x: -0.1751, y: 0.5092 }, { x: 0.0000, y: 0.7714 }, { x: 0.0000, y: -0.7714 } ],
                fillColor: [30, 77, 46],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        
        fillColor: [130, 160, 170], strokeColor: [200, 230, 240], strokeW: 1.2, // Teal / Light Blue-grey
        typicalCargo: ["Food","Food", "Minerals","Minerals", "Metals"],
        price: 6000,
        aiRoles: ["EXPLORER"]
    },
    "ProspectorMiner": { // NEW - Miner
        name: "Prospector Miner", role: "Mining Vessel", sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 3.5, baseThrust: 0.08, baseTurnRate: 0.03840,
        baseHull: 200, baseShield: 80, shieldRecharge: 0.9, cargoCapacity: 40, // Includes refinery space
        armament: [],
        costCategory: "Medium", description: "Dedicated mining ship with processing capabilities.",
        drawFunction: drawProspectorMiner, vertexData: [ {x:0.6, y:0}, {x:0.4, y:0.8}, {x:-0.4, y:0.9}, {x:-0.9, y:0.6}, {x:-1.0, y:-0.3}, {x:-0.9, y:-0.6}, {x:-0.4, y:-0.9}, {x:0.4, y:-0.8} ], // Bulky, functional
        fillColor: [180, 170, 160], strokeColor: [100, 95, 90], strokeW: 1.8, // Industrial grey/brown
        typicalCargo: ["Minerals"],
        price: 7000,
        aiRoles: ["TRANSPORT"]
    },
    "Python": {
        name: "Python", role: "Heavy Multi/Trader", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.03840,
        baseHull: 280, baseShield: 250, shieldRecharge: 0.9, cargoCapacity: 220,
        armament: ["Heavy Cannon", "Arc Projector", "Mini-Turret"], // Versatile heavy combat
        costCategory: "High", description: "Versatile heavy multi-role. Good trader, capable fighter.",
        drawFunction: drawPython,         
        vertexLayers: [
            {
                vertexData: [ { x: 0.8000, y: 0.0000 }, { x: 0.6000, y: 0.7000 }, { x: -0.6000, y: 0.9000 }, { x: -1.0000, y: 0.6000 }, { x: -1.0000, y: -0.6000 }, { x: -0.6000, y: -0.9000 }, { x: 0.6000, y: -0.7000 } ],
                fillColor: [140, 140, 150],
                strokeColor: [180, 180, 190],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: 0.6686, y: 0.0000 }, { x: 0.0000, y: 0.3646 }, { x: 0.0000, y: -0.3646 } ],
                fillColor: [234, 26, 26],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [140, 140, 150], strokeColor: [180, 180, 190], strokeW: 2,
        typicalCargo: ["Luxury Goods", "Medicine", "Metals", "Chemicals","Medicine", "Metals", "Chemicals"],
        price: 12600,
        aiRoles: ["HAULER"]
    },
    "ShardInterceptor": { // NEW - Alien 1
        name: "Shard Interceptor (Alien)", role: "Alien Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 8.5, baseThrust: 0.18, baseTurnRate: 0.08727,
        baseHull: 50, baseShield: 100, shieldRecharge: 1.8, // Crystalline structure?
        armament: ["Disruptor", "Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Fast alien fighter composed of sharp, crystalline structures.",
        drawFunction: drawShardInterceptor, vertexData: [ { x: 1.0831, y: 0.0000 }, { x: 0.4335, y: 0.2433 }, { x: -0.1945, y: 0.1331 }, { x: -0.7955, y: 0.8065 }, { x: -1.2651, y: 0.4935 }, { x: -0.7083, y: 0.0000 }, { x: -1.2651, y: -0.4935 }, { x: -0.7955, y: -0.8065 }, { x: -0.1945, y: -0.1331 }, { x: 0.4335, y: -0.2433 } ],
        fillColor: [180, 180, 240],
        strokeColor: [240, 240, 255],
        strokeW: 1.00, // Set in draw func: Blue/Purple/White
        typicalCargo: [],
        price: 9000,
        aiRoles: ["ALIEN"]
    },
    "Sidewinder": {
        name: "Sidewinder", role: "Starter", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.06981,
        baseHull: 50, baseShield: 50, shieldRecharge: 1.0, cargoCapacity: 10,
        armament: ["Pulse Laser"], // Starter weapon
        costCategory: "N/A", description: "Cheap, agile starter ship.",
        drawFunction: drawSidewinder, vertexData: [ { x: 0.9, y: 0 }, { x: -0.7, y: 0.8 }, { x: -0.9, y: 0 }, { x: -0.7, y: -0.8 } ],
        fillColor: [180, 100, 20], strokeColor: [220, 150, 50], strokeW: 1,
        typicalCargo: ["Food"],
        price: 2500,
        aiRoles: ["PIRATE"]
    },
    "StarlinerCruiser": {
        name: "Starliner Cruiser", role: "Passenger Transport", sizeCategory: "Large", size: 105,
        baseMaxSpeed: 5.5, baseThrust: 0.07, baseTurnRate: 0.02443,
        baseHull: 200, baseShield: 250, shieldRecharge: 1.1, cargoCapacity: 100, // Less cargo, more cabins assumed
        armament: ["Mini-Turret", "Force Blaster"], // Defensive passenger ship
        costCategory: "High", description: "Long, sleek vessel designed for passenger comfort.",
        drawFunction: drawStarlinerCruiser, vertexData: [ {x:1.2, y:0}, {x:1.0, y:0.2}, {x:-0.9, y:0.3}, {x:-1.1, y:0.1}, {x:-1.1, y:-0.1}, {x:-0.9, y:-0.3}, {x:1.0, y:-0.2} ], // Elongated
        fillColor: [230, 230, 235], strokeColor: [180, 180, 200], strokeW: 1.5, // White/Silver
        typicalCargo: ["Luxury Goods", "Food", "Medicine","Food", "Medicine"],
        price: 11000,
        aiRoles: ["HAULER"]
    },
    "Thargoid": { 
        name: "Thargoid Interceptor", role: "Alien Combat", sizeCategory: "Large", size: 60,
        baseMaxSpeed: 8.0, baseThrust: 0.20, baseTurnRate: 0.10472,
        baseHull: 200, baseShield: 300, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"], // Alien arsenal
        costCategory: "N/A", description: "Hostile alien vessel. Highly dangerous.",
        drawFunction: drawThargoid, vertexData: [], // Not editable via vertex data in this setup
        typicalCargo: ["Chemicals", "Weapons", "Narcotics"],
        price: 16000,
        aiRoles: ["ALIEN"]
    },
    "Type6Transporter": {
        name: "Type-6 Transporter", role: "Trader", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.2, baseThrust: 0.06, baseTurnRate: 0.03491,
        baseHull: 100, baseShield: 60, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"], // Basic trader defense
        costCategory: "Low-Medium", description: "Dedicated Lakon transport vessel. Boxy but efficient.",
        drawFunction: drawType6Transporter, vertexData: [ { x: 0.7, y: 0.3 }, { x: 0.7, y: 0.7 }, { x: -0.8, y: 0.8 }, { x: -1.0, y: 0.6 }, { x: -1.0, y: -0.6 }, { x: -0.8, y: -0.8 }, { x: 0.7, y: -0.7 }, { x: 0.7, y: -0.3 } ],
        fillColor: [210, 160, 70], strokeColor: [120, 90, 40], strokeW: 1.5,
        typicalCargo: ["Food","Textiles", "Minerals", "Metals", "Machinery"],
        price: 4200,
        aiRoles: ["HAULER"]
    },
     "Type9Heavy": {
        name: "Type-9 Heavy", role: "Heavy Trader", sizeCategory: "Very Large", size: 110,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRate: 0.01396,
        baseHull: 450, baseShield: 250, shieldRecharge: 0.6, cargoCapacity: 500,
        armament: ["Mini-Turret", "Force Blaster"], // Defensive cargo hauler
        costCategory: "High", description: "The quintessential Lakon heavy cargo hauler. Slow and massive.",
        drawFunction: drawType9Heavy, vertexData: [ { x: 0.8208, y: 0.2000 }, { x: 0.7000, y: 0.8000 }, { x: -0.8000, y: 0.9000 }, { x: -1.0000, y: 0.8000 }, { x: -1.0000, y: -0.8000 }, { x: -0.8000, y: -0.9000 }, { x: 0.7000, y: -0.8000 }, { x: 0.8208, y: -0.2000 } ],
        fillColor: [190, 140, 60],
        strokeColor: [110, 80, 30],
        strokeW: 2.50,
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery", "Chemicals", "Computers"],
        price: 50250,
        aiRoles: ["HAULER"]
    },
    "Viper": { 
        name: "Viper", role: "Fighter", sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRate: 0.07854,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Multi-Cannon", "Twin Pulse"], // Fast fighter
        costCategory: "Medium", description: "Fast, agile police and bounty hunter interceptor.",
        drawFunction: drawViper,
        vertexData: [ { x: 1.1, y: 0 }, { x: -0.6, y: 0.5 }, { x: -1, y: 0.3 }, { x: -1, y: -0.3 }, { x: -0.6, y: -0.5 } ],
        fillColor: [210, 210, 220], strokeColor: [100, 100, 150], strokeW: 1,
        typicalCargo: ["Weapons", "Narcotics"],
        price: 6000,
        aiRoles: ["MILITARY"]
    },
     "Vulture": {
        name: "Vulture", role: "Heavy Fighter", sizeCategory: "Small", size: 38,
        baseMaxSpeed: 5.5, baseThrust: 0.14, baseTurnRate: 0.09599,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.6, cargoCapacity: 15,
        armament: ["Heavy Cannon", "Burst Blaster"], // Aggressive fighter
        costCategory: "Medium-High", description: "Agile heavy fighter with powerful hardpoints but power-hungry.",
        drawFunction: drawVulture, vertexData: [ { x: 0.8001, y: 0.0951 }, { x: -0.1201, y: 0.3805 }, { x: -0.2033, y: 1.0132 }, { x: -0.7000, y: 1.1822 }, { x: -0.7456, y: 0.4692 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.7456, y: -0.4692 }, { x: -0.7000, y: -1.1822 }, { x: -0.2033, y: -1.0132 }, { x: -0.1201, y: -0.3805 }, { x: 0.8001, y: -0.0951 } ],
        fillColor: [210, 4, 4],
        strokeColor: [138, 138, 138],
        strokeW: 1.50,
        typicalCargo: ["Weapons", "Narcotics", "Slaves"],
        price: 8250,
        aiRoles: ["MILITARY"]
    },
    "WaspAssault": {
        name: "Wasp Assault Craft", role: "Assault Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Aggressive, agile fighter with forward-swept wings.",
        drawFunction: drawWaspAssault, vertexData: [ { x: 0.9000, y: 0.0000 }, { x: -0.1473, y: 0.3081 }, { x: -0.3146, y: 0.9825 }, { x: -0.5494, y: 0.9822 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.5494, y: -0.9822 }, { x: -0.3146, y: -0.9825 }, { x: -0.1473, y: -0.3081 } ],
        fillColor: [210, 190, 80],
        strokeColor: [120, 100, 30],
        strokeW: 1.00,
        typicalCargo: ["Computers"],
        price: 8000,
        aiRoles: ["MILITARY"]
    },
};
// --- End Ship Definitions ---

console.log(`ships.js (Editor Version with ${Object.keys(SHIP_DEFINITIONS).length} ships) loaded and SHIP_DEFINITIONS created.`); // Updated log