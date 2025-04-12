// ****** ships.js ******
// Contains ship drawing functions and the global SHIP_DEFINITIONS object.
// MUST be loaded AFTER p5.js but BEFORE player.js, enemy.js, etc.

// --- Ship Drawing Functions ---
// Each function draws the ship centered at (0,0), pointing right (+X), size approx 's' diameter
// Uses p5.js drawing functions. Assumes called within push/pop and translate/rotate.
// IMPORTANT: These rely on p5 globals like fill, stroke, beginShape, vertex, ellipse etc.
// They also rely on angleMode(DEGREES) being set in setup() if using degrees internally.

function drawSidewinder(s, thrusting = false) {
    // Simple wedge shape
    let r = s / 2;
    fill(180, 100, 20); stroke(220, 150, 50); strokeWeight(1); // Orangey-brown
    beginShape();
    vertex(r * 0.9, 0);        // Nose
    vertex(-r * 0.7, r * 0.8); // Back top wing
    vertex(-r * 0.9, 0);        // Tail center indent
    vertex(-r * 0.7, -r * 0.8); // Back bottom wing
    endShape(CLOSE);
    // Engine glow
    if (thrusting) { fill(255, 200, 0); noStroke(); ellipse(-r, 0, r*0.5, r*0.3); }
}

function drawCobraMkIII(s, thrusting = false) {
    // Distinctive wide wedge/diamond
    let r = s / 2;
    fill(100, 150, 200); stroke(200, 220, 255); strokeWeight(1.5); // Bluish-white
    beginShape();
    vertex(r, 0);           // Nose tip
    vertex(r * 0.3, r*0.6);   // Top front edge
    vertex(-r * 0.8, r*0.7);  // Top back corner wing
    vertex(-r * 0.5, r*0.2);  // Engine indent top
    vertex(-r, r*0.25);     // Engine outer top
    vertex(-r, -r*0.25);    // Engine outer bottom
    vertex(-r * 0.5, -r*0.2); // Engine indent bottom
    vertex(-r * 0.8, -r*0.7); // Bottom back corner wing
    vertex(r * 0.3, -r*0.6);  // Bottom front edge
    endShape(CLOSE);
    // Engine glow (dual)
    if (thrusting) { fill(255, 255, 100); noStroke(); ellipse(-r*0.9, r*0.15, r*0.4, r*0.2); ellipse(-r*0.9, -r*0.15, r*0.4, r*0.2); }
}

function drawViper(s, thrusting = false) {
    // Sleek arrowhead
    let r = s / 2;
    fill(210, 210, 220); stroke(100, 100, 150); strokeWeight(1); // Greyish-white / Blue accents
    beginShape();
    vertex(r * 1.1, 0);        // Sharp nose
    vertex(-r * 0.6, r * 0.5); // Back top wing flare
    vertex(-r, r * 0.3);      // Engine housing top back
    vertex(-r, -r * 0.3);     // Engine housing bottom back
    vertex(-r * 0.6, -r * 0.5); // Back bottom wing flare
    endShape(CLOSE);
    // Central strong engine glow
    if (thrusting) { fill(100, 200, 255); noStroke(); ellipse(-r*0.9, 0, r*0.7, r*0.3); }
}

function drawPython(s, thrusting = false) {
    // Bulky freighter
    let r = s / 2;
    fill(140, 140, 150); stroke(180, 180, 190); strokeWeight(2); // Utilitarian grey
    beginShape();
    vertex(r * 0.6, 0);        // Stubby nose
    vertex(r * 0.4, r * 0.8);  // Top front corner
    vertex(-r * 0.8, r * 0.9); // Top back corner
    vertex(-r, r * 0.7);      // Back top bevel
    vertex(-r, -r * 0.7);     // Back bottom bevel
    vertex(-r * 0.8, -r * 0.9); // Bottom back corner
    vertex(r * 0.4, -r * 0.8);  // Bottom front corner
    endShape(CLOSE);
    // Small dual engines
    if (thrusting) { fill(255, 150, 50); noStroke(); ellipse(-r*0.95, r*0.5, r*0.3, r*0.2); ellipse(-r*0.95, -r*0.5, r*0.3, r*0.2); }
}

function drawAnaconda(s, thrusting = false) {
    // Large capital ship shape
    let r = s / 2;
    fill(80, 90, 100); stroke(150, 160, 170); strokeWeight(2.5); // Dark imposing grey
    beginShape();
    vertex(r * 1.2, 0);       // Front tip
    vertex(r * 0.9, r*0.3);   // Top front bevel
    vertex(-r * 0.9, r*0.4);  // Top mid section flare
    vertex(-r * 1.1, r*0.2);  // Top engine section start
    vertex(-r * 1.1, -r*0.2); // Bottom engine section start
    vertex(-r * 0.9, -r*0.4); // Bottom mid section flare
    vertex(r * 0.9, -r*0.3);  // Bottom front bevel
    endShape(CLOSE);
     // Large central engine glow
    if (thrusting) { fill(200, 100, 255); noStroke(); ellipse(-r, 0, r*0.6, r*0.4); }
}

function drawAdder(s, thrusting = false) {
    // Asymmetric / blocky small ship
    let r = s / 2;
    fill(160, 160, 140); stroke(200, 200, 180); strokeWeight(1); // Beige/utility color
    beginShape();
    vertex(r * 0.8, 0);        // Nose
    vertex(r * 0.2, r * 0.8);  // Top "shoulder"
    vertex(-r * 0.9, r * 0.7); // Back Top corner
    vertex(-r * 0.7, 0);        // Back center indent
    vertex(-r * 0.9, -r * 0.9); // Bottom back corner (lower)
    vertex(r * 0.1, -r * 0.7); // Bottom front corner
    endShape(CLOSE);
    // Simple single engine
    if (thrusting) { fill(200, 200, 180); noStroke(); ellipse(-r*0.8, -r*0.1, r*0.4, r*0.3); }
}

function drawKrait(s, thrusting = false) {
     // Simple blocky fighter
     let r = s / 2;
    fill(100, 120, 100); stroke(140, 160, 140); strokeWeight(1); // Dull Green/Grey
    beginShape();
    vertex(r, 0);           // Nose
    vertex(r*0.2, r*0.6);   // Top Front Bevel
    vertex(-r*0.8, r*0.6);  // Top Back
    vertex(-r*0.8, -r*0.6); // Bottom Back
    vertex(r*0.2, -r*0.6);  // Bottom Front Bevel
    endShape(CLOSE);
    // Dual simple engines
    if (thrusting) { fill(180, 180, 100); noStroke(); ellipse(-r*0.7, r*0.3, r*0.3, r*0.2); ellipse(-r*0.7, -r*0.3, r*0.3, r*0.2); }
}

function drawThargoid(s, thrusting = false) { // Thrusting might not apply visually
    // Iridescent / Organic - Use changing colors based on frameCount
    let r = s / 2;
    let baseHue = (frameCount * 0.5) % 360; // Slowly shift hue over time
    colorMode(HSB, 360, 100, 100, 100); // Use HSB mode for easy hue shifting
    fill(baseHue, 80, 70, 80); // Semi-transparent base color
    stroke( (baseHue + 40) % 360, 90, 90, 90); // Contrasting stroke color
    strokeWeight(2);

    // 8-sided flower/geometric shape
    beginShape();
    for (let i = 0; i < 8; i++) {
        let angle1 = map(i, 0, 8, 0, TWO_PI);       // Angle for outer point ("petal tip")
        let angle2 = map(i + 0.5, 0, 8, 0, TWO_PI); // Angle for inner point (indentation)
        let outerR = r * 1.1; // Radius of outer points
        let innerR = r * 0.6; // Radius of inner points
        vertex(cos(angle1) * outerR, sin(angle1) * outerR); // Add outer vertex
        vertex(cos(angle2) * innerR, sin(angle2) * innerR); // Add inner vertex
    }
    endShape(CLOSE); // Close the shape

    // Reset color mode back to default RGB
    colorMode(RGB, 255);

    // Central pulsating "eye" effect
    fill(0, 255, 150, map(sin(frameCount * 0.1), -1, 1, 50, 150)); // Pulsating alpha (greenish color)
    noStroke();
    ellipse(0, 0, r*0.5, r*0.5); // Draw the central eye
}
// --- End Ship Drawing Functions ---


// --- Global Ship Definitions Object ---
// Stores base stats for each ship type. Turn rates are in DEGREES/frame here.
const SHIP_DEFINITIONS = {
    "Sidewinder": {
        name: "Sidewinder", role: "Starter", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRateDegrees: 4.0, // DEGREES
        baseHull: 50, baseShield: 50, shieldRecharge: 1.0, cargoCapacity: 10,
        armament: "1 Small Fwd", costCategory: "N/A",
        description: "Cheap, agile starter ship.",
        drawFunction: drawSidewinder // Reference to the drawing function
    },
    "CobraMkIII": {
        name: "Cobra Mk III", role: "Multi-Role", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRateDegrees: 3.5, // DEGREES
        baseHull: 120, baseShield: 100, shieldRecharge: 1.2, cargoCapacity: 44,
        armament: "2 Med Fwd, 2 Small Fwd/Turret?", costCategory: "Medium",
        description: "The legendary jack-of-all-trades.",
        drawFunction: drawCobraMkIII
    },
    "Viper": { // Combat variant focus
        name: "Viper", role: "Fighter", sizeCategory: "Medium", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRateDegrees: 4.5, // DEGREES
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 4,
        armament: "2 Med Fwd, 2 Small Fwd", costCategory: "Medium",
        description: "Fast, agile police and bounty hunter interceptor.",
        drawFunction: drawViper
    },
     "Adder": {
        name: "Adder", role: "Trader/Explorer", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRateDegrees: 3.0, // DEGREES
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 22,
        armament: "1 Med Fwd, 2 Small Util?", costCategory: "Low",
        description: "Affordable entry-level freighter or explorer.",
        drawFunction: drawAdder
    },
     "Krait": { // Small, cheap fighter archetype
        name: "Krait", role: "Light Fighter", sizeCategory: "Small", size: 22,
        baseMaxSpeed: 6.5, baseThrust: 0.12, baseTurnRateDegrees: 4.2, // DEGREES
        baseHull: 40, baseShield: 40, shieldRecharge: 1.3, cargoCapacity: 4,
        armament: "2 Small Fwd?", costCategory: "Very Low",
        description: "Cheap, fast, fragile fighter often used by pirates.",
        drawFunction: drawKrait
    },
    "Python": {
        name: "Python", role: "Heavy Multi/Trader", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRateDegrees: 1.8, // DEGREES
        baseHull: 250, baseShield: 200, shieldRecharge: 0.8, cargoCapacity: 200,
        armament: "2 Large Fwd, 3 Med Fwd/Turret", costCategory: "High",
        description: "Slow, tough, heavily armed freighter.",
        drawFunction: drawPython
    },
    "Anaconda": {
        name: "Anaconda", role: "Heavy Combat/Multi", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRateDegrees: 1.2, // DEGREES
        baseHull: 400, baseShield: 350, shieldRecharge: 0.7, cargoCapacity: 150,
        armament: "Huge Fwd, Lrg Fwd, Med Fwd, Smalls, Turrets...", costCategory: "Very High",
        description: "A mobile fortress, the pinnacle of conventional design.",
        drawFunction: drawAnaconda
    },
    "Thargoid": { // Alien ship
        name: "Thargoid Interceptor", role: "Alien Combat", sizeCategory: "Large", size: 60,
        baseMaxSpeed: 8.0, baseThrust: 0.20, baseTurnRateDegrees: 6.0, // DEGREES (Very high!)
        baseHull: 200, baseShield: 300, shieldRecharge: 2.0, cargoCapacity: 0, // Assume unique shield/hull props later
        armament: "Alien tech", costCategory: "N/A",
        description: "Hostile alien vessel. Highly dangerous.",
        drawFunction: drawThargoid
    }
    // Add definitions for Type-6, Asp Explorer, etc. here later
};
// --- End Ship Definitions ---

console.log("ships.js loaded and SHIP_DEFINITIONS created."); // Confirmation log