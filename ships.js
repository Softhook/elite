// ****** ships.js ******
// Contains ship drawing functions and the global SHIP_DEFINITIONS object.
// MUST be loaded AFTER p5.js but BEFORE player.js, enemy.js, etc.
// MODIFIED FOR EDITOR: Includes vertexData array and updated draw functions.

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
function drawSidewinder(s, thrusting = false) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.Sidewinder; // Get definition
    drawShapeFromData(r, def.vertexData, color(180, 100, 20), color(220, 150, 50), 1);
    if (thrusting) { fill(255, 200, 0); noStroke(); ellipse(-r, 0, r*0.5, r*0.3); }
}

function drawCobraMkIII(s, thrusting = false) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.CobraMkIII;
    drawShapeFromData(r, def.vertexData, color(100, 150, 200), color(200, 220, 255), 1.5);
    if (thrusting) { fill(255, 255, 100); noStroke(); ellipse(-r*0.9, r*0.15, r*0.4, r*0.2); ellipse(-r*0.9, -r*0.15, r*0.4, r*0.2); }
}

function drawViper(s, thrusting = false) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.Viper;
    drawShapeFromData(r, def.vertexData, color(210, 210, 220), color(100, 100, 150), 1);
    if (thrusting) { fill(100, 200, 255); noStroke(); ellipse(-r*0.9, 0, r*0.7, r*0.3); }
}

function drawPython(s, thrusting = false) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.Python;
    drawShapeFromData(r, def.vertexData, color(140, 140, 150), color(180, 180, 190), 2);
    if (thrusting) { fill(255, 150, 50); noStroke(); ellipse(-r*0.95, r*0.5, r*0.3, r*0.2); ellipse(-r*0.95, -r*0.5, r*0.3, r*0.2); }
}

function drawAnaconda(s, thrusting = false) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.Anaconda;
    drawShapeFromData(r, def.vertexData, color(80, 90, 100), color(150, 160, 170), 2.5);
     if (thrusting) { fill(200, 100, 255); noStroke(); ellipse(-r, 0, r*0.6, r*0.4); }
}

function drawAdder(s, thrusting = false) {
    let r = s / 2;
    let def = SHIP_DEFINITIONS.Adder;
    drawShapeFromData(r, def.vertexData, color(160, 160, 140), color(200, 200, 180), 1);
    if (thrusting) { fill(200, 200, 180); noStroke(); ellipse(-r*0.8, -r*0.1, r*0.4, r*0.3); }
}

function drawKrait(s, thrusting = false) {
     let r = s / 2;
     let def = SHIP_DEFINITIONS.Krait;
     drawShapeFromData(r, def.vertexData, color(100, 120, 100), color(140, 160, 140), 1);
    if (thrusting) { fill(180, 180, 100); noStroke(); ellipse(-r*0.7, r*0.3, r*0.3, r*0.2); ellipse(-r*0.7, -r*0.3, r*0.3, r*0.2); }
}

function drawThargoid(s, thrusting = false) { // Thrusting might not apply visually
    let r = s / 2;
    let def = SHIP_DEFINITIONS.Thargoid;
    // Original Thargoid draw function is more complex than just vertex data,
    // We'll keep it as is for now, but editing its shape directly won't work with the current editor setup.
    // You could add vertexData for an *editable* base shape if desired.
    let baseHue = (frameCount * 0.5) % 360;
    colorMode(HSB, 360, 100, 100, 100);
    fill(baseHue, 80, 70, 80);
    stroke( (baseHue + 40) % 360, 90, 90, 90);
    strokeWeight(2);
    beginShape();
    for (let i = 0; i < 8; i++) {
        let angle1 = map(i, 0, 8, 0, TWO_PI);
        let angle2 = map(i + 0.5, 0, 8, 0, TWO_PI);
        let outerR = r * 1.1;
        let innerR = r * 0.6;
        vertex(cos(angle1) * outerR, sin(angle1) * outerR);
        vertex(cos(angle2) * innerR, sin(angle2) * innerR);
    }
    endShape(CLOSE);
    colorMode(RGB, 255);
    fill(0, 255, 150, map(sin(frameCount * 0.1), -1, 1, 50, 150));
    noStroke();
    ellipse(0, 0, r*0.5, r*0.5);
}
// --- End Ship Drawing Functions ---


// --- Global Ship Definitions Object ---
// Stores base stats AND VERTEX DATA for each ship type.
const SHIP_DEFINITIONS = {
    "Sidewinder": {
        name: "Sidewinder", role: "Starter", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRateDegrees: 4.0,
        baseHull: 50, baseShield: 50, shieldRecharge: 1.0, cargoCapacity: 10,
        armament: "1 Small Fwd", costCategory: "N/A",
        description: "Cheap, agile starter ship.",
        drawFunction: drawSidewinder,
        // Extracted vertex data (multipliers for r)
        vertexData: [
            { x: 0.9, y: 0 },
            { x: -0.7, y: 0.8 },
            { x: -0.9, y: 0 },
            { x: -0.7, y: -0.8 }
        ],
        fillColor: [180, 100, 20], // Store original colors
        strokeColor: [220, 150, 50],
        strokeW: 1
    },
    "CobraMkIII": {
        name: "Cobra Mk III", role: "Multi-Role", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRateDegrees: 3.5,
        baseHull: 120, baseShield: 100, shieldRecharge: 1.2, cargoCapacity: 44,
        armament: "2 Med Fwd, 2 Small Fwd/Turret?", costCategory: "Medium",
        description: "The legendary jack-of-all-trades.",
        drawFunction: drawCobraMkIII,
        vertexData: [
            { x: 1, y: 0 },
            { x: 0.3, y: 0.6 },
            { x: -0.8, y: 0.7 },
            { x: -0.5, y: 0.2 },
            { x: -1, y: 0.25 },
            { x: -1, y: -0.25 },
            { x: -0.5, y: -0.2 },
            { x: -0.8, y: -0.7 },
            { x: 0.3, y: -0.6 }
        ],
        fillColor: [100, 150, 200],
        strokeColor: [200, 220, 255],
        strokeW: 1.5
    },
    "Viper": {
        name: "Viper", role: "Fighter", sizeCategory: "Medium", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRateDegrees: 4.5,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 4,
        armament: "2 Med Fwd, 2 Small Fwd", costCategory: "Medium",
        description: "Fast, agile police and bounty hunter interceptor.",
        drawFunction: drawViper,
        vertexData: [
            { x: 1.1, y: 0 },
            { x: -0.6, y: 0.5 },
            { x: -1, y: 0.3 },
            { x: -1, y: -0.3 },
            { x: -0.6, y: -0.5 }
        ],
        fillColor: [210, 210, 220],
        strokeColor: [100, 100, 150],
        strokeW: 1
    },
     "Adder": {
        name: "Adder", role: "Trader/Explorer", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRateDegrees: 3.0,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 22,
        armament: "1 Med Fwd, 2 Small Util?", costCategory: "Low",
        description: "Affordable entry-level freighter or explorer.",
        drawFunction: drawAdder,
        vertexData: [
            { x: 0.8, y: 0 },
            { x: 0.2, y: 0.8 },
            { x: -0.9, y: 0.7 },
            { x: -0.7, y: 0 },
            { x: -0.9, y: -0.9 },
            { x: 0.1, y: -0.7 }
        ],
        fillColor: [160, 160, 140],
        strokeColor: [200, 200, 180],
        strokeW: 1
    },
     "Krait": {
        name: "Krait", role: "Light Fighter", sizeCategory: "Small", size: 22,
        baseMaxSpeed: 6.5, baseThrust: 0.12, baseTurnRateDegrees: 4.2,
        baseHull: 40, baseShield: 40, shieldRecharge: 1.3, cargoCapacity: 4,
        armament: "2 Small Fwd?", costCategory: "Very Low",
        description: "Cheap, fast, fragile fighter often used by pirates.",
        drawFunction: drawKrait,
         vertexData: [
            { x: 1, y: 0 },
            { x: 0.2, y: 0.6 },
            { x: -0.8, y: 0.6 },
            { x: -0.8, y: -0.6 },
            { x: 0.2, y: -0.6 }
        ],
        fillColor: [100, 120, 100],
        strokeColor: [140, 160, 140],
        strokeW: 1
    },
    "Python": {
        name: "Python", role: "Heavy Multi/Trader", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRateDegrees: 1.8,
        baseHull: 250, baseShield: 200, shieldRecharge: 0.8, cargoCapacity: 200,
        armament: "2 Large Fwd, 3 Med Fwd/Turret", costCategory: "High",
        description: "Slow, tough, heavily armed freighter.",
        drawFunction: drawPython,
         vertexData: [
            { x: 0.6, y: 0 },
            { x: 0.4, y: 0.8 },
            { x: -0.8, y: 0.9 },
            { x: -1, y: 0.7 },
            { x: -1, y: -0.7 },
            { x: -0.8, y: -0.9 },
            { x: 0.4, y: -0.8 }
        ],
        fillColor: [140, 140, 150],
        strokeColor: [180, 180, 190],
        strokeW: 2
    },
    "Anaconda": {
        name: "Anaconda", role: "Heavy Combat/Multi", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRateDegrees: 1.2,
        baseHull: 400, baseShield: 350, shieldRecharge: 0.7, cargoCapacity: 150,
        armament: "Huge Fwd, Lrg Fwd, Med Fwd, Smalls, Turrets...", costCategory: "Very High",
        description: "A mobile fortress, the pinnacle of conventional design.",
        drawFunction: drawAnaconda,
         vertexData: [
            { x: 1.2, y: 0 },
            { x: 0.9, y: 0.3 },
            { x: -0.9, y: 0.4 },
            { x: -1.1, y: 0.2 },
            { x: -1.1, y: -0.2 },
            { x: -0.9, y: -0.4 },
            { x: 0.9, y: -0.3 }
        ],
        fillColor: [80, 90, 100],
        strokeColor: [150, 160, 170],
        strokeW: 2.5
    },
    "Thargoid": { // Alien ship - NOTE: Editing this shape via vertexData won't work as its draw function is complex
        name: "Thargoid Interceptor", role: "Alien Combat", sizeCategory: "Large", size: 60,
        baseMaxSpeed: 8.0, baseThrust: 0.20, baseTurnRateDegrees: 6.0, // DEGREES (Very high!)
        baseHull: 200, baseShield: 300, shieldRecharge: 2.0, cargoCapacity: 0, // Assume unique shield/hull props later
        armament: "Alien tech", costCategory: "N/A",
        description: "Hostile alien vessel. Highly dangerous.",
        drawFunction: drawThargoid,
        vertexData: [], // Empty or define a base shape if you want to make it editable
        // No fill/stroke defined here as it's dynamic
    }
    // Add definitions for Type-6, Asp Explorer, etc. here later following the same pattern
};
// --- End Ship Definitions ---

console.log("ships.js (Editor Version) loaded and SHIP_DEFINITIONS created.");