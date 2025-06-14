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

function drawDestroyer(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.Destroyer;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
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
function drawHummingbird(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HummingBird;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

// --- Draw functions for new Harlequin Ships ---
function drawHarlequinJester(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HarlequinJester;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawHarlequinPierrot(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HarlequinPierrot;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawHarlequinColumbine(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HarlequinColumbine;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawHarlequinPantaloon(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HarlequinPantaloon;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawHarlequinScaramouche(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HarlequinScaramouche;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

// --- Draw functions for new Local Transporters ---
function drawLocalHopper(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.LocalHopper;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawErrandRunner(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ErrandRunner;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSystemShuttle(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SystemShuttle;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawCargoWagon(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.CargoWagon;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

// --- Draw functions for new Pirate Ships ---
function drawPirateCutlass(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.PirateCutlass;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawPirateMarauder(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.PirateMarauder;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawPirateReaver(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.PirateReaver;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawPirateBrigand(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.PirateBrigand;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawPirateInterceptorMKII(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.PirateInterceptorMKII;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

// --- Draw functions for new Separatist Ships ---
function drawSeparatistLiberator(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistLiberator;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSeparatistDefiant(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistDefiant;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSeparatistOutlander(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistOutlander;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSeparatistVanguard(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistVanguard;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSeparatistPartisan(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistPartisan;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSeparatistBulwark(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistBulwark;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSeparatistShadow(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistShadow;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSeparatistSupplyRunner(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SeparatistSupplyRunner;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

// --- Draw functions for new Imperial Ships ---
function drawImperialGuardian(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialGuardian;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialPaladin(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialPaladin;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialLancer(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialLancer;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialJusticar(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialJusticar;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialEnvoy(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialEnvoy;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialSentinel(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialSentinel;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialEagleMkII(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialEagleMkII;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawImperialCutterLite(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ImperialCutterLite;
    drawShapeFromData(r, def.vertexLayers || def.vertexData, color(def.fillColor), color(def.strokeColor), def.strokeW);
}

// --- Draw functions for new Alien Ships ---
function drawObeliskSentinel(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ObeliskSentinel;
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawSpiralWarden(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.SpiralWarden;
    push();
    rotate(frameCount * 0.02); // Subtle spiral animation
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}
function drawTriadProbe(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.TriadProbe;
    push();
    rotate(frameCount * 0.04); // Fast spinning probe
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}
function drawHexaManta(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.HexaManta;
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawFractalRay(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.FractalRay;
    push();
    rotate(sin(frameCount * 0.03) * 0.2); // Subtle fractal shimmer
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}
function drawPetalSpinner(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.PetalSpinner;
    push();
    rotate(frameCount * 0.08); // Fast spinning petals
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}
function drawCrescentMarauder(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.CrescentMarauder;
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawObsidianOrb(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.ObsidianOrb;
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
}
function drawTesseractScout(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.TesseractScout;
    push();
    rotate(frameCount * 0.05); // 4D shifting illusion
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}
function drawLotusCarrier(s, thrusting = false) {
    let r = s / 2; let def = SHIP_DEFINITIONS.LotusCarrier;
    push();
    rotate(sin(frameCount * 0.01) * 0.1); // Gentle petal sway
    drawShapeFromData(r, def.vertexLayers, color(def.fillColor), color(def.strokeColor), def.strokeW);
    pop();
}

// --- End Ship Drawing Functions ---


// --- Global Ship Definitions Object ---
// Stores base stats AND VERTEX DATA for each ship type.
const SHIP_DEFINITIONS = {
    "ACAB": {
        name: "ACAB", role: "Police", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 12,
        armament: ["Tangle Projector","Pulse Laser"],
        costCategory: "Low", description: "Standard Police.",
        drawFunction: drawACAB, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.7821, y: 0.0000 }, { x: 0.0321, y: 0.4929 }, { x: -0.7821, y: 0.6286 }, { x: -0.7179, y: 0.0000 }, { x: -0.7821, y: -0.6286 }, { x: 0.0321, y: -0.4929 } ],
                fillColor: [100, 150, 200],
                strokeColor: [151, 181, 196],
                strokeW: 1.00
            }
        ],
        fillColor: [100, 150, 200],
        strokeColor: [151, 181, 196],
        strokeW: 1.00,
        typicalCargo: [],
        price: 20000,
        aiRoles: ["POLICE"],
        techLevel: 1 // Starter
    },
    "Adder": {
        name: "Adder", role: "Trader/Explorer", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.05236,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.0, cargoCapacity: 30,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "Affordable entry-level freighter or explorer.",
        drawFunction: drawAdder, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.8500, y: 0.0500 }, { x: 0.2500, y: 0.8500 }, { x: -0.8500, y: 0.7500 }, { x: -0.6500, y: 0.0500 }, { x: -0.8500, y: -0.8500 }, { x: 0.1500, y: -0.6500 } ],
                fillColor: [160, 160, 140],
                strokeColor: [200, 200, 180],
                strokeW: 1.00
            }
        ],
        fillColor: [160, 160, 140], strokeColor: [200, 200, 180], strokeW: 1,
        typicalCargo: ["Food", "Textiles", "Minerals"],
        price: 27000,
        aiRoles: ["HAULER"],
        techLevel: 1 // Starter
    },
    "Anaconda": {
        name: "Anaconda", role: "Heavy Combat/Multi", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRate: 0.02094,
        baseHull: 400, baseShield: 350, shieldRecharge: 1, cargoCapacity: 150,
        armament: ["Force Blaster","Guardian Missile","Barrier Field"],
        costCategory: "Very High", description: "A mobile fortress, the pinnacle of conventional design.",
        drawFunction: drawAnaconda, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.1500, y: 0.0000 }, { x: 0.8500, y: 0.3000 }, { x: -0.9500, y: 0.4000 }, { x: -1.1500, y: 0.2000 }, { x: -1.1500, y: -0.2000 }, { x: -0.9500, y: -0.4000 }, { x: 0.8500, y: -0.3000 } ],
                fillColor: [80, 90, 100],
                strokeColor: [150, 160, 170],
                strokeW: 2.50
            }
        ],
        fillColor: [80, 90, 100], strokeColor: [150, 160, 170], strokeW: 2.5,
        typicalCargo: ["Luxury Goods", "Adv Components", "Metals", "Machinery","Minerals"],
        price: 120000,
        aiRoles: ["HAULER", "MILITARY"],
        techLevel: 3 // Mid-tier
    },
    "AspExplorer": {
        name: "Asp Explorer", role: "Explorer/Multi-Role", sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRate: 0.05585,
        baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 80,
        armament: ["Beam Laser", "Twin Pulse"],
        costCategory: "Medium-High", description: "Iconic explorer with excellent visibility and jump range.",
        drawFunction: drawAspExplorer, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.9500, y: 0.0000 }, { x: 0.3627, y: 0.5133 }, { x: -0.4750, y: 0.8750 }, { x: -0.9500, y: 0.3000 }, { x: -0.9500, y: -0.3000 }, { x: -0.4750, y: -0.8750 }, { x: 0.3627, y: -0.5133 } ],
                fillColor: [200, 180, 80],
                strokeColor: [100, 90, 40],
                strokeW: 1.50
            }
        ],
        fillColor: [200, 180, 80],
        strokeColor: [100, 90, 40],
        strokeW: 1.50,
        typicalCargo: ["Minerals","Minerals","Minerals","Minerals", "Medicine", "Computers"],
        price: 82500,
        aiRoles: ["EXPLORER","HAULER"],
        techLevel: 2 // Mid-tier
    },
    "BioFrigate": {
        name: "Bio-Frigate (Alien)", role: "Alien Cruiser", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.0, baseThrust: 0.1, baseTurnRate: 0.03491,
        baseHull: 500, baseShield: 250, shieldRecharge: 2.5,
        armament: ["Force Blaster", "Disruptor","Barrier Field"],
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
        price: 200000,
        aiRoles: ["ALIEN"],
        techLevel: 5 // Alien
    },
    "CenturionGunship": {
        name: "Centurion Gunship", role: "Heavy Fighter", sizeCategory: "Large", size: 72,
        baseMaxSpeed: 4.8, baseThrust: 0.13, baseTurnRate: 0.04538,
        baseHull: 320, baseShield: 220, shieldRecharge: 1.0, cargoCapacity: 20,
        armament: ["Heavy Cannon", "Quad Pulse", "Beam Laser", "Avenger Missile","Heavy Tangle","Barrier Field"], // Balanced heavy firepower
        costCategory: "High", description: "Slow, heavily armed and armored gun platform.",
        drawFunction: drawCenturionGunship, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.9421, y: 0.0000 }, { x: 0.7579, y: 0.4000 }, { x: 0.0865, y: 0.5048 }, { x: 0.4546, y: 0.6548 }, { x: 0.2506, y: 0.8786 }, { x: -0.5596, y: 0.8810 }, { x: -0.9421, y: 0.6000 }, { x: -0.7690, y: 0.0000 }, { x: -0.9421, y: -0.6000 }, { x: -0.5596, y: -0.8810 }, { x: 0.2506, y: -0.8786 }, { x: 0.4546, y: -0.6548 }, { x: 0.0865, y: -0.5048 }, { x: 0.7579, y: -0.4000 } ],
                fillColor: [100, 105, 115],
                strokeColor: [160, 165, 175],
                strokeW: 1.20
            }
        ],
        fillColor: [100, 105, 115],
        strokeColor: [160, 165, 175],
        strokeW: 2.20,
        typicalCargo: ["Weapons", "Metals", "Machinery"],
        price: 30360,
        aiRoles: ["MILITARY"],
        techLevel: 3 // Mid-tier
    },
    "CobraMkIII": {
        name: "Cobra Mk III", role: "Multi-Role", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 6.0, baseThrust: 0.10, baseTurnRate: 0.06109,
        baseHull: 120, baseShield: 100, shieldRecharge: 1, cargoCapacity: 44,
        armament: ["Multi-Cannon", "Twin Pulse"], // Versatile loadout with defense
        costCategory: "Medium", description: "The legendary jack-of-all-trades.",
        drawFunction: drawCobraMkIII, 

        vertexLayers: [
            {
                vertexData: [ { x: 0.8867, y: 0.0000 }, { x: 0.1867, y: 0.5270 }, { x: -0.6178, y: 0.5634 }, { x: -0.6133, y: 0.2000 }, { x: -0.8867, y: 0.1770 }, { x: -0.8867, y: -0.1770 }, { x: -0.6133, y: -0.2000 }, { x: -0.6178, y: -0.5634 }, { x: 0.1867, y: -0.5270 } ],
                fillColor: [100, 150, 200],
                strokeColor: [200, 220, 255],
                strokeW: 1.50
            }
        ],
        fillColor: [100, 150, 200],
        strokeColor: [200, 220, 255],
        strokeW: 1.50,
        typicalCargo: ["Food"],
        price: 30000,
        aiRoles: ["POLICE", "HAULER"],
        techLevel: 2 // Utility
    },
    "DiamondbackExplorer": {
        name: "Diamondback Explorer", role: "Explorer/Light Combat", sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.05236,
        baseHull: 130, baseShield: 100, shieldRecharge: 1.1, cargoCapacity: 40,
        armament: ["Beam Laser", "V Spread"], // Explorer with some punch
        costCategory: "Medium", description: "Utilitarian explorer known for good heat management.",
        drawFunction: drawDiamondbackExplorer, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.9500, y: 0.0000 }, { x: 0.1500, y: 0.4000 }, { x: -0.5500, y: 0.9000 }, { x: -0.9500, y: 0.5000 }, { x: -0.8500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.5500, y: -0.9000 }, { x: 0.1500, y: -0.4000 } ],
                fillColor: [100, 110, 90],
                strokeColor: [160, 170, 150],
                strokeW: 1.50
            }
        ],
        fillColor: [100, 110, 90], strokeColor: [160, 170, 150], strokeW: 1.5,
        typicalCargo: ["Minerals", "Metals", "Adv Components"],
        price: 65000,
        aiRoles: ["EXPLORER","HAULER"],
        techLevel: 3 // Mid-tier
    },
    "Destroyer": {
        name: "Destroyer", role: "Military", sizeCategory: "Large", size: 160,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.02094,
        baseHull: 800, baseShield: 400, shieldRecharge: 10.0, cargoCapacity: 100,
        armament: ["Disruptor","Twin Pulse","Force Blaster", "Avenger Missile","Heavy Tangle","Barrier Field"],
        costCategory: "Low", description: "Standard Police.",
        drawFunction: drawDestroyer,         vertexLayers: [
            {
                vertexData: [ { x: 1.0832, y: 0.0000 }, { x: 1.0832, y: 0.0000 }, { x: -0.9327, y: 1.0053 }, { x: -1.0832, y: 0.0000 }, { x: -0.9327, y: -1.0053 }, { x: 1.0832, y: 0.0000 } ],
                fillColor: [143, 143, 148],
                strokeColor: [180, 180, 200],
                strokeW: 0.50
            },
            {
                vertexData: [ { x: -0.7335, y: 0.6180 }, { x: 0.5918, y: 0.0000 }, { x: -0.7335, y: -0.6180 }, { x: -0.8380, y: 0.0000 } ],
                fillColor: [191, 191, 196],
                strokeColor: [50, 50, 60],
                strokeW: 0.50
            },
            {
                vertexData: [ { x: -0.6159, y: 0.1967 }, { x: -0.2833, y: 0.0000 }, { x: -0.6159, y: -0.1967 } ],
                fillColor: [84, 84, 84],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
         fillColor: [100, 150, 200],
        strokeColor: [151, 181, 196],
        strokeW: 1.00,
        typicalCargo: [],
        price: 900000,
        aiRoles: ["MILITARY"],
        techLevel: 4 // Advanced
    },
    "FederalAssaultShip": {
        name: "Federal Assault Ship", role: "Heavy Fighter", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 5.0, baseThrust: 0.12, baseTurnRate: 0.04363,
        baseHull: 400, baseShield: 300, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Heavy Cannon", "Multi-Cannon", "Railgun Turret", "Avenger Missile","Heavy Tangle","Barrier Field"], // Military arsenal
        costCategory: "High", description: "Federation military vessel. Tough hull, good firepower.",
        drawFunction: drawFederalAssaultShip, 
        
        fillColor: [110, 120, 130],
        strokeColor: [180, 190, 200],
        strokeW: 2.00,
        
        vertexLayers: [
            {
                vertexData: [ { x: 0.9500, y: 0.0000 }, { x: 0.7500, y: 0.5000 }, { x: -0.1500, y: 0.6000 }, { x: -0.7500, y: 0.8000 }, { x: -0.9500, y: 0.4000 }, { x: -0.9500, y: -0.4000 }, { x: -0.7500, y: -0.8000 }, { x: -0.1500, y: -0.6000 }, { x: 0.7500, y: -0.5000 } ],
                fillColor: [110, 120, 130],
                strokeColor: [180, 190, 200],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: -0.7067, y: -0.3486 }, { x: 0.8067, y: -0.3486 }, { x: -0.6161, y: -0.5037 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                vertexData: [ { x: -0.6839, y: 0.3453 }, { x: 0.7905, y: 0.3453 }, { x: -0.5867, y: 0.4955 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            }
        ],

        typicalCargo: ["Computers","Computers","Computers","Weapons", "Metals", "Adv Components"],
        price: 120000,
        aiRoles: ["MILITARY"],
        techLevel: 4 // Advanced
    },
    "FerDeLance": {
        name: "Fer-de-Lance", role: "Heavy Combat", sizeCategory: "Large", size: 65,
        baseMaxSpeed: 6.5, baseThrust: 0.11, baseTurnRate: 0.05236,
        baseHull: 180, baseShield: 350, shieldRecharge: 1.8, cargoCapacity: 24,
        armament: ["Sniper Rail", "Force Blaster", "Triple Pulse","Kalibr Missile","Heavy Tangle","Barrier Field"],
        costCategory: "Very High", description: "Luxury high-performance combat ship.",
        drawFunction: drawFerDeLance, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.1000, y: 0.5000 }, { x: -0.7000, y: 0.6000 }, { x: -1.0000, y: 0.2000 }, { x: -1.0000, y: -0.2000 }, { x: -0.7000, y: -0.6000 }, { x: 0.1000, y: -0.5000 } ],
                fillColor: [60, 65, 70],
                strokeColor: [140, 150, 160],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: -0.9998, y: -0.2009 }, { x: -0.1000, y: -0.2431 }, { x: -0.7013, y: -0.5970 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                vertexData: [ { x: -0.9995, y: 0.2035 }, { x: -0.7020, y: 0.5957 }, { x: -0.1000, y: 0.3052 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            },
            {
                vertexData: [ { x: 0.4349, y: 0.0000 }, { x: 0.1360, y: 0.1505 }, { x: 0.1360, y: -0.1505 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.01
            }
        ],
        fillColor: [60, 65, 70], strokeColor: [140, 150, 160], strokeW: 2,
        typicalCargo: ["Computers","Computers","Computers","Computers","Luxury Goods", "Weapons", "Narcotics"],
        price: 117000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER"],
        techLevel: 4 // Advanced
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
        price: 18000,
        aiRoles: ["ALIEN"],
        techLevel: 5 // Cutting-edge
    },
    "GladiusFighter": {
        name: "Gladius Fighter", role: "Medium Fighter", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 7.0, baseThrust: 0.14, baseTurnRate: 0.06981,
        baseHull: 100, baseShield: 140, shieldRecharge: 1.4, cargoCapacity: 12,
        armament: ["Burst Blaster", "Twin Pulse","Kalibr Missile"], // Fast attack loadout
        costCategory: "Medium", description: "Balanced space superiority fighter. Agile and well-armed.",
        drawFunction: drawGladiusFighter, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.0500, y: 0.0000 }, { x: 0.2500, y: 0.4000 }, { x: -0.2500, y: 0.7000 }, { x: -0.9500, y: 0.5000 }, { x: -1.0500, y: 0.0000 }, { x: -0.9500, y: -0.5000 }, { x: -0.2500, y: -0.7000 }, { x: 0.2500, y: -0.4000 } ],
                fillColor: [190, 195, 200],
                strokeColor: [120, 125, 140],
                strokeW: 1.50
            }
        ],
        fillColor: [190, 195, 200], strokeColor: [120, 125, 140], strokeW: 1.5, // Light grey / medium grey
        typicalCargo: ["Computers"],
        price: 60000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER","GUARD"],
        techLevel: 3 // Mid-tier
    },
    "GnatInterceptor": { // NEW - Light Fighter 1
        name: "Gnat Interceptor", role: "Light Interceptor", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 9.5, baseThrust: 0.22, baseTurnRate: 0.10472,
        baseHull: 30, baseShield: 30, shieldRecharge: 1.2, cargoCapacity: 4,
        armament: ["Pulse Laser"], // Fast single weapon
        costCategory: "Very Low", description: "Extremely fast and small, but fragile interceptor.",
        drawFunction: drawGnatInterceptor, vertexData: [ {x:1.1, y:0}, {x:-0.8, y:0.4}, {x:-1.0, y:0}, {x:-0.8, y:-0.4} ],
        fillColor: [200, 60, 60], strokeColor: [255, 150, 150], strokeW: 0.8,
        typicalCargo: [],
        price: 40000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER"],
        techLevel: 1 // Starter
    },
    "HammerheadCorvette": { // NEW - Unique 2
        name: "Hammerhead Corvette", role: "Corvette/Patrol", sizeCategory: "Large", size: 80,
        baseMaxSpeed: 4.0, baseThrust: 0.09, baseTurnRate: 0.04014,
        baseHull: 350, baseShield: 280, shieldRecharge: 1.0, cargoCapacity: 60,
        armament: ["Heavy Cannon", "Railgun Turret", "Wide Scatter","Kalibr Missile","Heavy Tangle","Barrier Field"], // Military loadout
        costCategory: "High", description: "Distinctive forward 'hammerhead' module, likely housing sensors or weapons.",
        drawFunction: drawHammerheadCorvette, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.8795, y: 0.3500 }, { x: 0.5844, y: 0.4670 }, { x: 0.4207, y: 0.7285 }, { x: 0.1427, y: 0.8587 }, { x: -0.1705, y: 0.5488 }, { x: -0.9254, y: 0.4670 }, { x: -0.9252, y: 0.3625 }, { x: -0.5529, y: 0.1330 }, { x: -0.5529, y: -0.1330 }, { x: -0.9252, y: -0.3625 }, { x: -0.9295, y: -0.4650 }, { x: -0.1705, y: -0.5488 }, { x: 0.1427, y: -0.8587 }, { x: 0.4207, y: -0.7285 }, { x: 0.5885, y: -0.4650 }, { x: 0.8795, y: -0.3500 }, { x: 0.9295, y: 0.0000 } ],
                fillColor: [70, 100, 130],
                strokeColor: [150, 180, 210],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: 0.1421, y: -0.7686 }, { x: 0.3536, y: -0.6314 }, { x: -0.0093, y: -0.4986 }, { x: -0.0093, y: -0.4986 } ],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 0.10
            },
            {
                vertexData: [ { x: -0.0093, y: 0.4871 }, { x: -0.0093, y: 0.4871 }, { x: 0.3864, y: 0.6086 }, { x: 0.1621, y: 0.7857 } ],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 0.10
            },
            {
                vertexData: [ { x: 0.3297, y: 0.2149 }, { x: 0.5680, y: 0.2548 }, { x: 0.7417, y: 0.0000 }, { x: 0.5680, y: -0.2548 }, { x: 0.3297, y: -0.2149 } ],
                fillColor: [180, 180, 80],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],

        fillColor: [70, 100, 130],
        strokeColor: [150, 180, 210],
        strokeW: 2.00, // Blue-grey
        typicalCargo: ["Machinery", "Metals", "Food","Metals", "Weapons"],
        price: 100000,
        aiRoles: ["MILITARY"],
        techLevel: 4 // Advanced
    },
    "ImperialClipper": {
        name: "Imperial Clipper", role: "Multi-Role/Trader", sizeCategory: "Large", size: 95,
        baseMaxSpeed: 7.0, baseThrust: 0.10, baseTurnRate: 0.02618,
        baseHull: 180, baseShield: 180, shieldRecharge: 1.4, cargoCapacity: 180,
        armament: ["V Punch", "Mini-Turret", "Beam Laser","Heavy Tangle"], // Elegant, balanced
        costCategory: "High", description: "Elegant and fast Imperial ship, good shield charging.",
        drawFunction: drawImperialClipper, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.0500, y: 0.0000 }, { x: 0.6500, y: 0.2000 }, { x: 0.0500, y: 0.9000 }, { x: -0.8500, y: 0.8000 }, { x: -1.0500, y: 0.4000 }, { x: -1.0500, y: -0.4000 }, { x: -0.8500, y: -0.8000 }, { x: 0.0500, y: -0.9000 }, { x: 0.6500, y: -0.2000 } ],
                fillColor: [220, 225, 230],
                strokeColor: [100, 150, 200],
                strokeW: 1.50
            },
            {
                vertexData: [ { x: 0.4246, y: 0.0632 }, { x: 0.6612, y: 0.0067 }, { x: 0.4246, y: -0.0499 } ],
                fillColor: [150, 150, 180],
                strokeColor: [50, 50, 60],
                strokeW: 0.50
            }
        ],
        fillColor: [220, 225, 230], strokeColor: [100, 150, 200], strokeW: 1.5,
        typicalCargo: ["Luxury Goods", "Medicine", "Textiles", "Textiles", "Textiles"],
        price: 120000,
        aiRoles: ["IMPERIAL"],
        techLevel: 4 // Advanced
    },
    "ImperialCourier": {
        name: "Imperial Courier", role: "Light Fighter/Multi", sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.8, baseThrust: 0.16, baseTurnRate: 0.07505,
        baseHull: 70, baseShield: 150, shieldRecharge: 1.7, cargoCapacity: 12,
        armament: ["Pulse Array", "Beam Laser"], // Elegant, refined
        costCategory: "Medium", description: "Fast, sleek Imperial ship with good shields for its size.",
        drawFunction: drawImperialCourier, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.4000, y: 0.3000 }, { x: -0.5000, y: 0.5000 }, { x: -0.9000, y: 0.4000 }, { x: -1.0000, y: 0.0000 }, { x: -0.9000, y: -0.4000 }, { x: -0.5000, y: -0.5000 }, { x: 0.4000, y: -0.3000 } ],
                fillColor: [210, 215, 220],
                strokeColor: [80, 130, 180],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 215, 220], strokeColor: [80, 130, 180], strokeW: 1,
        typicalCargo: ["Luxury Goods", "Medicine"],
        price: 50000,
        aiRoles: ["IMPERIAL"],
        techLevel: 2 // Utility
    },
    "JackalMultirole": { // NEW - Multi-role
        name: "Jackal Multirole", role: "Multi-Role", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRate: 0.06283,
        baseHull: 140, baseShield: 160, shieldRecharge: 1.2, cargoCapacity: 60,
        armament: ["Multi-Cannon", "Railgun Turret"], // Versatile
        costCategory: "Medium", description: "Adaptable, angular multi-purpose vessel.",
        drawFunction: drawJackalMultirole, 

        vertexLayers: [
            {
                vertexData: [ { x: 0.9000, y: 0.0000 }, { x: 0.4000, y: 0.5000 }, { x: -0.3000, y: 0.8000 }, { x: -0.9000, y: 0.6000 }, { x: -0.5103, y: 0.1697 }, { x: -0.5103, y: -0.1697 }, { x: -0.9000, y: -0.6000 }, { x: -0.3000, y: -0.8000 }, { x: 0.4000, y: -0.5000 } ],
                fillColor: [170, 160, 150],
                strokeColor: [90, 80, 70],
                strokeW: 1.50
            }
        ],

        fillColor: [170, 160, 150],
        strokeColor: [90, 80, 70],
        strokeW: 1.50, // Sandy grey
        typicalCargo: ["Machinery", "Metals", "Food"],
        price: 40000,
        aiRoles: ["HAULER","MILITARY"],
        techLevel: 2 // Utility
    },
    "Keelback": {
        name: "Keelback", role: "Combat Trader", sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.04363,
        baseHull: 180, baseShield: 90, shieldRecharge: 0.9, cargoCapacity: 50,
        armament: ["Twin Pulse", "Railgun Turret"], // Combat trader
        costCategory: "Medium", description: "A Type-6 variant retrofitted for combat, can carry a fighter.",
        drawFunction: drawKeelback, 
        
        vertexLayers: [
            {
                vertexData: [ { x: 0.8168, y: 0.0000 }, { x: 0.6865, y: 0.5114 }, { x: -0.0134, y: 0.6114 }, { x: -0.6135, y: 0.8114 }, { x: -0.8168, y: 0.5917 }, { x: -0.3705, y: 0.2745 }, { x: -0.6039, y: 0.1373 }, { x: -0.5974, y: -0.1373 }, { x: -0.3705, y: -0.2745 }, { x: -0.8168, y: -0.5917 }, { x: -0.6135, y: -0.8114 }, { x: -0.0134, y: -0.6114 }, { x: 0.6865, y: -0.5114 } ],
                fillColor: [180, 150, 80],
                strokeColor: [100, 80, 40],
                strokeW: 1.50
            }
        ],
        fillColor: [180, 150, 80],
        strokeColor: [100, 80, 40],
        strokeW: 1.50,
        typicalCargo: ["Minerals", "Metals", "Machinery"],
        price: 35000,
        aiRoles: ["HAULER"],
        techLevel: 2 // Utility
    },
    "KraitMKI": { 
        name: "Krait MKI", role: "Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 6.2, baseThrust: 0.15, baseTurnRate: 0.06632,
        baseHull: 60, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 15,
        armament: ["Pulse Laser"],
        costCategory: "High", description: "Fighter popular with pirates.",
        drawFunction: drawKraitMKI,

        vertexLayers: [
            {
                vertexData: [ { x: 0.5772, y: -0.0058 }, { x: 0.2343, y: 0.4129 }, { x: -0.5772, y: 0.4129 }, { x: -0.5772, y: -0.4129 }, { x: 0.2343, y: -0.4129 } ],
                fillColor: [100, 120, 100],
                strokeColor: [140, 160, 140],
                strokeW: 1.50
            }
        ],
        fillColor: [100, 120, 100],
        strokeColor: [140, 160, 140],
        strokeW: 1.50,
        typicalCargo: [],
        price: 9000,
        aiRoles: ["PIRATE"],
        techLevel: 2 // Utility
    },

    "KraitMKII": { 
        name: "Krait MKII", role: "Multi-Role/Fighter", sizeCategory: "Medium", size: 60,
        baseMaxSpeed: 5.2, baseThrust: 0.11, baseTurnRate: 0.04014,
        baseHull: 100, baseShield: 200, shieldRecharge: 1.4, cargoCapacity: 82,
        armament: ["Mini-Turret"], // Combat focused Pirate
        costCategory: "High", description: "Multi-role ship, popular with pirates.",
        drawFunction: drawKraitMKII, 
        
        vertexLayers: [
            {
                vertexData: [ { x: 0.9500, y: 0.0000 }, { x: 0.5500, y: 0.5000 }, { x: -0.4500, y: 0.6000 }, { x: -0.9500, y: 0.4000 }, { x: -0.9500, y: -0.4000 }, { x: -0.4500, y: -0.6000 }, { x: 0.5500, y: -0.5000 } ],
                fillColor: [100, 120, 100],
                strokeColor: [140, 160, 140],
                strokeW: 1.50
            }
        ],
        fillColor: [100, 120, 100], strokeColor: [140, 160, 140], strokeW: 1.5,
        typicalCargo: ["Food","Minerals"],
        price: 20000,
        aiRoles: ["PIRATE"],
        techLevel: 2 // Utility
    },
    "MantaHauler": { // NEW - Unique 1
        name: "Manta Hauler", role: "Wide Cargo Hauler", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRate: 0.02793,
        baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 300,
        armament: ["Mini-Turret", "Force Blaster","Barrier Field"], // Defensive
        costCategory: "Medium-High", description: "Extremely wide cargo ship, resembling a manta ray.",
        drawFunction: drawMantaHauler, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.9000, y: 0.0000 }, { x: 0.3000, y: 0.3000 }, { x: -0.5000, y: 0.9000 }, { x: -0.8000, y: 0.7000 }, { x: -0.9000, y: 0.0000 }, { x: -0.8000, y: -0.7000 }, { x: -0.5000, y: -0.9000 }, { x: 0.3000, y: -0.3000 } ],
                fillColor: [60, 80, 90],
                strokeColor: [130, 160, 180],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: 0.0560, y: 0.1290 }, { x: 0.3195, y: 0.0000 }, { x: 0.0560, y: -0.1290 } ],
                fillColor: [250, 250, 255],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [60, 80, 90], strokeColor: [130, 160, 180], strokeW: 2.0, // Dark blue/teal
        typicalCargo: ["Minerals", "Metals", "Machinery", "Food", "Textiles"],
        price: 80000,
        aiRoles: ["HAULER"],
        techLevel: 3 // Mid-tier
    },
    "MuleFreighter": { // NEW - Small Transporter
        name: "Mule Freighter", role: "Local Transport", sizeCategory: "Small", size: 25,
        baseMaxSpeed: 3.8, baseThrust: 0.05, baseTurnRate: 0.04887,
        baseHull: 70, baseShield: 0, shieldRecharge: 0.8, cargoCapacity: 20,
        armament: [],
        costCategory: "Very Low", description: "Slow, cheap, boxy short-range cargo shuttle.",
        drawFunction: drawMuleFreighter, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.8000, y: 0.7500 }, { x: -0.6000, y: 0.8500 }, { x: -0.8000, y: 0.4500 }, { x: -0.8000, y: -0.4500 }, { x: -0.5000, y: -0.8500 }, { x: 0.8000, y: -0.7500 } ],
                fillColor: [140, 130, 120],
                strokeColor: [80, 75, 70],
                strokeW: 1.20
            }
        ],
        fillColor: [140, 130, 120], strokeColor: [80, 75, 70], strokeW: 1.2, // Brownish grey
        typicalCargo: ["Food", "Machinery", "Metals"],
        price: 2000,
        aiRoles: ["TRANSPORT"],
        techLevel: 1 // Starter
    },
    "NomadVoyager": { 
        name: "Nomad Voyager", role: "Deep Space Explorer", sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 5.2, baseThrust: 0.07, baseTurnRate: 0.05061,
        baseHull: 180, baseShield: 220, shieldRecharge: 1.5, cargoCapacity: 70,
        armament: ["Beam Laser", "Mini-Turret"], // Long range exploration
        costCategory: "High", description: "Self-sufficient long-range vessel built for endurance.",
        drawFunction: drawNomadVoyager, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.0000, y: 0.0000 }, { x: 0.8000, y: 0.5000 }, { x: 0.2000, y: 0.8000 }, { x: -0.7000, y: 0.7000 }, { x: -1.0000, y: 0.0000 }, { x: -0.7000, y: -0.7000 }, { x: 0.2000, y: -0.8000 }, { x: 0.8000, y: -0.5000 } ],
                fillColor: [200, 200, 190],
                strokeColor: [100, 100, 90],
                strokeW: 1.50
            }
        ],
        fillColor: [200, 200, 190], strokeColor: [100, 100, 90], strokeW: 1.5, // Off-white / beige
        typicalCargo: ["Minerals", "Food", "Medicine"],
        price: 93600,
        aiRoles: ["EXPLORER","HAULER"],
        techLevel: 4 // Advanced
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
                vertexData: [ { x: 1.1000, y: 0.0000 }, { x: 0.7000, y: 0.2000 }, { x: -0.6000, y: 0.5000 }, { x: -1.1000, y: 0.3000 }, { x: -1.1000, y: -0.3000 }, { x: -0.6000, y: -0.5000 }, { x: 0.7000, y: -0.2000 } ],
                fillColor: [130, 160, 170],
                strokeColor: [200, 230, 240],
                strokeW: 1.20
            },
            {
                vertexData: [ { x: -0.2751, y: -0.5092 }, { x: -0.2751, y: 0.5092 }, { x: -0.1000, y: 0.7714 }, { x: -0.1000, y: -0.7714 } ],
                fillColor: [30, 77, 46],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        
        fillColor: [130, 160, 170], strokeColor: [200, 230, 240], strokeW: 1.2, // Teal / Light Blue-grey
        typicalCargo: ["Food","Food", "Minerals","Minerals", "Metals"],
        price: 60000,
        aiRoles: ["EXPLORER","HAULER"],
        techLevel: 3 // Mid-tier
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
        price: 8000,
        aiRoles: ["TRANSPORT"],
        techLevel: 2 // Utility
    },
    "Python": {
        name: "Python", role: "Heavy Multi/Trader", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.03840,
        baseHull: 280, baseShield: 250, shieldRecharge: 0.9, cargoCapacity: 220,
        armament: ["Heavy Cannon", "V Punch", "Mini-Turret","Kalibr Missile","Heavy Tangle","Barrier Field"], // Versatile heavy combat
        costCategory: "High", description: "Versatile heavy multi-role. Good trader, capable fighter.",
        drawFunction: drawPython,         
        vertexLayers: [
            {
                vertexData: [ { x: 0.9000, y: 0.0000 }, { x: 0.7000, y: 0.7000 }, { x: -0.5000, y: 0.9000 }, { x: -0.9000, y: 0.6000 }, { x: -0.9000, y: -0.6000 }, { x: -0.5000, y: -0.9000 }, { x: 0.7000, y: -0.7000 } ],
                fillColor: [140, 140, 150],
                strokeColor: [180, 180, 190],
                strokeW: 2.00
            }
        ],
        fillColor: [140, 140, 150], strokeColor: [180, 180, 190], strokeW: 2,
        typicalCargo: ["Luxury Goods", "Medicine", "Metals", "Chemicals","Medicine", "Metals", "Chemicals"],
        price: 126000,
        aiRoles: ["HAULER"],
        techLevel: 4 // Advanced
    },
    "ShardInterceptor": {
        name: "Shard Interceptor", role: "Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 8.5, baseThrust: 0.18, baseTurnRate: 0.08727,
        baseHull: 50, baseShield: 100, shieldRecharge: 1.8, // Crystalline structure?
        armament: ["Disruptor", "Scatter Beam"], // Alien tech
        costCategory: "N/A", description: "Fast fighter incorporating alien technology of crystalline structures.",
        drawFunction: drawShardInterceptor, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.1741, y: 0.0000 }, { x: 0.5245, y: 0.2433 }, { x: -0.1035, y: 0.1331 }, { x: -0.7045, y: 0.8065 }, { x: -1.1741, y: 0.4935 }, { x: -0.6173, y: 0.0000 }, { x: -1.1741, y: -0.4935 }, { x: -0.7045, y: -0.8065 }, { x: -0.1035, y: -0.1331 }, { x: 0.5245, y: -0.2433 } ],
                fillColor: [180, 180, 240],
                strokeColor: [240, 240, 255],
                strokeW: 1.00
            }
        ],
        fillColor: [180, 180, 240],
        strokeColor: [240, 240, 255],
        strokeW: 1.00, // Set in draw func: Blue/Purple/White
        typicalCargo: [],
        price: 90000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER"],
        techLevel: 5
    },
    "Sidewinder": {
        name: "Sidewinder", role: "Starter", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 5.0, baseThrust: 0.08, baseTurnRate: 0.06981,
        baseHull: 50, baseShield: 50, shieldRecharge: 1.0, cargoCapacity: 10,
        armament: ["Pulse Laser","Guardian Missile","Barrier Field"], // Starter weapon
        costCategory: "N/A", description: "Cheap, agile starter ship.",
        drawFunction: drawSidewinder, vertexData: [ { x: 0.9, y: 0 }, { x: -0.7, y: 0.8 }, { x: -0.9, y: 0 }, { x: -0.7, y: -0.8 } ],
        fillColor: [180, 100, 20], strokeColor: [220, 150, 50], strokeW: 1,
        typicalCargo: ["Food"],
        price: 2500,
        aiRoles: ["PIRATE"],
        techLevel: 1 // Starter
    },
    "StarlinerCruiser": {
        name: "Starliner Cruiser", role: "Passenger Transport", sizeCategory: "Large", size: 105,
        baseMaxSpeed: 5.5, baseThrust: 0.07, baseTurnRate: 0.02443,
        baseHull: 200, baseShield: 250, shieldRecharge: 1.1, cargoCapacity: 100, // Less cargo, more cabins assumed
        armament: ["Mini-Turret", "Force Blaster","Halo"], // Defensive passenger ship
        costCategory: "High", description: "Long, sleek vessel designed for passenger comfort.",
        drawFunction: drawStarlinerCruiser, 
        vertexLayers: [
            {
                vertexData: [ { x: 1.1500, y: 0.0000 }, { x: 0.9500, y: 0.2000 }, { x: -0.9500, y: 0.3000 }, { x: -1.1500, y: 0.1000 }, { x: -1.1500, y: -0.1000 }, { x: -0.9500, y: -0.3000 }, { x: 0.9500, y: -0.2000 } ],
                fillColor: [230, 230, 235],
                strokeColor: [180, 180, 200],
                strokeW: 1.50
            }
        ],
        fillColor: [230, 230, 235], strokeColor: [180, 180, 200], strokeW: 1.5, // White/Silver
        typicalCargo: ["Luxury Goods", "Food", "Medicine","Food", "Medicine"],
        price: 110000,
        aiRoles: ["HAULER"],
        techLevel: 4 // Advanced
    },
    "Thargoid": { 
        name: "Thargoid Interceptor", role: "Alien Combat", sizeCategory: "Large", size: 60,
        baseMaxSpeed: 8.0, baseThrust: 0.20, baseTurnRate: 0.10472,
        baseHull: 200, baseShield: 300, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"], // Alien arsenal
        costCategory: "N/A", description: "Hostile alien vessel. Highly dangerous.",
        drawFunction: drawThargoid, vertexData: [], // Not editable via vertex data in this setup
        typicalCargo: ["Chemicals", "Weapons", "Narcotics"],
        price: 9999999,
        aiRoles: ["ALIEN"],
        techLevel: 5 // Alien
    },
    "Type6Transporter": {
        name: "Type-6 Transporter", role: "Trader", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.2, baseThrust: 0.06, baseTurnRate: 0.03491,
        baseHull: 150, baseShield: 60, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"], // Basic trader defense
        costCategory: "Low-Medium", description: "Dedicated Lakon transport vessel. Boxy but efficient.",
        drawFunction: drawType6Transporter, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.8500, y: 0.3000 }, { x: 0.8500, y: 0.7000 }, { x: -0.6500, y: 0.8000 }, { x: -0.8500, y: 0.6000 }, { x: -0.8500, y: -0.6000 }, { x: -0.6500, y: -0.8000 }, { x: 0.8500, y: -0.7000 }, { x: 0.8500, y: -0.3000 } ],
                fillColor: [210, 160, 70],
                strokeColor: [120, 90, 40],
                strokeW: 1.50
            }
        ],
        fillColor: [210, 160, 70], strokeColor: [120, 90, 40], strokeW: 1.5,
        typicalCargo: ["Food","Textiles", "Minerals", "Metals", "Machinery"],
        price: 80000,
        aiRoles: ["HAULER"],
        techLevel: 2 // Utility
    },
     "Type9Heavy": {
        name: "Type-9 Heavy", role: "Heavy Trader", sizeCategory: "Very Large", size: 110,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRate: 0.01396,
        baseHull: 550, baseShield: 250, shieldRecharge: 0.6, cargoCapacity: 500,
        armament: ["Mini-Turret", "Force Blaster"], // Defensive cargo hauler
        costCategory: "High", description: "The quintessential Lakon heavy cargo hauler. Slow and massive.",
        drawFunction: drawType9Heavy, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.9104, y: 0.2000 }, { x: 0.7896, y: 0.8000 }, { x: -0.7104, y: 0.9000 }, { x: -0.9104, y: 0.8000 }, { x: -0.9104, y: -0.8000 }, { x: -0.7104, y: -0.9000 }, { x: 0.7896, y: -0.8000 }, { x: 0.9104, y: -0.2000 } ],
                fillColor: [190, 140, 60],
                strokeColor: [110, 80, 30],
                strokeW: 2.50
            }
        ],
        fillColor: [190, 140, 60],
        strokeColor: [110, 80, 30],
        strokeW: 2.50,
        typicalCargo: ["Food", "Textiles", "Minerals", "Metals", "Machinery", "Chemicals", "Computers"],
        price: 120000,
        aiRoles: ["HAULER"],
        techLevel: 3 // Mid-tier
    },
    "Viper": { 
        name: "Viper", role: "Fighter", sizeCategory: "Small", size: 35,
        baseMaxSpeed: 7.5, baseThrust: 0.15, baseTurnRate: 0.07854,
        baseHull: 80, baseShield: 120, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Multi-Cannon", "Twin Pulse", "Guardian Missile"], // Fast fighter
        costCategory: "Medium", description: "Fast, agile police and bounty hunter interceptor.",
        drawFunction: drawViper,
        vertexLayers: [
            {
                vertexData: [ { x: 1.0500, y: 0.0000 }, { x: -0.6500, y: 0.5000 }, { x: -1.0500, y: 0.3000 }, { x: -1.0500, y: -0.3000 }, { x: -0.6500, y: -0.5000 } ],
                fillColor: [210, 210, 220],
                strokeColor: [100, 100, 150],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 210, 220], strokeColor: [100, 100, 150], strokeW: 1,
        typicalCargo: ["Computers","Weapons", "Narcotics"],
        price: 60000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER", "GUARD"],
        techLevel: 3 // Mid-tier
    },
     "Vulture": {
        name: "Vulture", role: "Heavy Fighter", sizeCategory: "Small", size: 38,
        baseMaxSpeed: 5.5, baseThrust: 0.14, baseTurnRate: 0.09599,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.6, cargoCapacity: 15,
        armament: ["Heavy Cannon", "Burst Blaster", "Loiter Munition"], // Aggressive fighter
        costCategory: "Medium-High", description: "Agile heavy fighter with powerful hardpoints but power-hungry.",
        drawFunction: drawVulture, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.9001, y: 0.0951 }, { x: -0.0202, y: 0.3805 }, { x: -0.1034, y: 1.0132 }, { x: -0.6000, y: 1.1822 }, { x: -0.6457, y: 0.4692 }, { x: -0.9001, y: 0.2000 }, { x: -0.9001, y: -0.2000 }, { x: -0.6457, y: -0.4692 }, { x: -0.6000, y: -1.1822 }, { x: -0.1034, y: -1.0132 }, { x: -0.0202, y: -0.3805 }, { x: 0.9001, y: -0.0951 } ],
                fillColor: [210, 4, 4],
                strokeColor: [138, 138, 138],
                strokeW: 1.50
            }
        ],
        fillColor: [210, 4, 4],
        strokeColor: [138, 138, 138],
        strokeW: 1.50,
        typicalCargo: ["Computers","Computers","Weapons", "Narcotics", "Slaves"],
        price: 40000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER", "GUARD"],
        techLevel: 3 // Mid-tier
    },
    "WaspAssault": {
        name: "Wasp Assault Craft", role: "Assault Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Aggressive, agile fighter with forward-swept wings.",
        drawFunction: drawWaspAssault, 
        vertexLayers: [
            {
                vertexData: [ { x: 0.9500, y: 0.0000 }, { x: -0.0973, y: 0.3081 }, { x: -0.2646, y: 0.9825 }, { x: -0.4994, y: 0.9822 }, { x: -0.9500, y: 0.2000 }, { x: -0.9500, y: -0.2000 }, { x: -0.4994, y: -0.9822 }, { x: -0.2646, y: -0.9825 }, { x: -0.0973, y: -0.3081 } ],
                fillColor: [210, 190, 80],
                strokeColor: [120, 100, 30],
                strokeW: 1.00
            }
        ],
        fillColor: [210, 190, 80],
        strokeColor: [120, 100, 30],
        strokeW: 1.00,
        typicalCargo: ["Computers"],
        price: 50000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER", "GUARD"],
        techLevel: 2 // Utility
    },
    "HummingBird": {
        name: "Humming Bird", role: "Assault Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 7.0, baseThrust: 0.17, baseTurnRate: 0.09076,
        baseHull: 50, baseShield: 60, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Burst Blaster"], // All-out attack fighter
        costCategory: "Low", description: "Agile fighter with forward-swept wings.",
        drawFunction: drawHummingbird, 
        
        vertexLayers: [
            {
                vertexData: [ { x: 0.7893, y: 0.0000 }, { x: -0.2224, y: 0.3805 }, { x: -0.2224, y: 1.0132 }, { x: -0.7107, y: 1.1822 }, { x: -0.4976, y: 0.3415 }, { x: -0.7893, y: 0.2472 }, { x: -0.7893, y: -0.2472 }, { x: -0.4976, y: -0.3415 }, { x: -0.7107, y: -1.1822 }, { x: -0.2224, y: -1.0132 }, { x: -0.2224, y: -0.3805 }, { x: 0.7893, y: 0.0000 } ],
                fillColor: [8, 210, 4],
                strokeColor: [138, 138, 138],
                strokeW: 0.50
            }
        ],

        fillColor: [210, 190, 80],
        strokeColor: [120, 100, 30],
        strokeW: 1.00,
        typicalCargo: ["Computers"],
        price: 40000,
        aiRoles: ["MILITARY","BOUNTY_HUNTER","GUARD"],
        techLevel: 2 // Utility
    },
    "HarlequinJester": {
        name: "Harlequin Jester", role: "Light Fighter", sizeCategory: "Tiny", size: 22,
        baseMaxSpeed: 8.0, baseThrust: 0.18, baseTurnRate: 0.09,
        baseHull: 40, baseShield: 60, shieldRecharge: 1.4, cargoCapacity: 5,
        armament: ["Pulse Laser", "Twin Pulse"],
        costCategory: "Low-Medium", description: "A nimble and brightly colored Harlequin skirmisher.",
        drawFunction: drawHarlequinJester,
        vertexData: [ {x:1,y:0}, {x:-0.5,y:0.6}, {x:-0.2,y:0}, {x:-0.5,y:-0.6} ],
        fillColor: [255, 0, 0], strokeColor: [0, 0, 255], strokeW: 1.2,
        typicalCargo: [], price: 32000, techLevel: 2,
        aiRoles: ["PIRATE", "BOUNTY_HUNTER"]
    },
    "HarlequinPierrot": {
        name: "Harlequin Pierrot", role: "Medium Trader", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 4.5, baseThrust: 0.07, baseTurnRate: 0.04,
        baseHull: 100, baseShield: 80, shieldRecharge: 0.9, cargoCapacity: 80,
        armament: ["Mini-Turret"],
        costCategory: "Medium", description: "A surprisingly capable Harlequin trader, often underestimated.",
        drawFunction: drawHarlequinPierrot,
        vertexData: [ {x:0.8,y:0.5}, {x:-0.8,y:0.5}, {x:-0.8,y:-0.5}, {x:0.8,y:-0.5} ],
        fillColor: [255, 255, 0], strokeColor: [0, 128, 0], strokeW: 1.5,
        typicalCargo: ["Luxury Goods", "Narcotics", "Slaves"], price: 55000, techLevel: 3,
        aiRoles: ["HAULER", "PIRATE"]
    },
    "HarlequinColumbine": {
        name: "Harlequin Columbine", role: "Explorer/Scout", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 6.5, baseThrust: 0.12, baseTurnRate: 0.07,
        baseHull: 60, baseShield: 90, shieldRecharge: 1.6, cargoCapacity: 20,
        armament: ["Beam Laser"],
        costCategory: "Medium", description: "A swift Harlequin scout, adept at slipping past blockades.",
        drawFunction: drawHarlequinColumbine,
        vertexData: [ {x:0.9,y:0}, {x:0,y:0.7}, {x:-0.9,y:0}, {x:0,y:-0.7} ],
        fillColor: [128, 0, 128], strokeColor: [255, 165, 0], strokeW: 1.0,
        typicalCargo: ["Luxury Goods", "Computers"], price: 48000, techLevel: 3,
        aiRoles: ["PIRATE"]
    },
    "HarlequinPantaloon": {
        name: "Harlequin Pantaloon", role: "Heavy Freighter", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 3.0, baseThrust: 0.05, baseTurnRate: 0.025,
        baseHull: 250, baseShield: 150, shieldRecharge: 0.7, cargoCapacity: 250,
        armament: ["Twin Pulse", "Mini-Turret"],
        costCategory: "Medium-High", description: "A surprisingly large and garish Harlequin cargo vessel.",
        drawFunction: drawHarlequinPantaloon,
                vertexLayers: [
            {
                vertexData: [ { x: 1.0000, y: 0.4000 }, { x: 0.5000, y: 0.8000 }, { x: -0.2369, y: 0.9045 }, { x: -1.0000, y: 0.8000 }, { x: -0.9216, y: 0.0000 }, { x: -1.0000, y: -0.8000 }, { x: -0.2369, y: -0.9045 }, { x: 0.5000, y: -0.8000 }, { x: 1.0000, y: -0.4000 } ],
                fillColor: [0, 200, 200],
                strokeColor: [200, 0, 200],
                strokeW: 2.00
            }
        ],
        fillColor: [0, 200, 200], strokeColor: [200, 0, 200], strokeW: 2.0,
        typicalCargo: ["Slaves", "Narcotics", "Weapons"], price: 95000, techLevel: 4,
        aiRoles: ["HAULER", "PIRATE"]
    },
    "HarlequinScaramouche": {
        name: "Harlequin Scaramouche", role: "Multi-Role Combat", sizeCategory: "Medium", size: 55,
        baseMaxSpeed: 5.5, baseThrust: 0.11, baseTurnRate: 0.055,
        baseHull: 150, baseShield: 180, shieldRecharge: 1.3, cargoCapacity: 40,
        armament: ["Multi-Cannon", "Beam Laser", "Railgun Turret", "Loiter Munition", "Barrier Field"],
        costCategory: "High", description: "A versatile and deadly Harlequin ship, adaptable to many combat roles.",
        drawFunction: drawHarlequinScaramouche,
         vertexLayers: [
            {
                vertexData: [ { x: 0.9000, y: 0.0000 }, { x: 0.5499, y: 1.0647 }, { x: 0.0000, y: 0.4255 }, { x: -0.3751, y: 0.6831 }, { x: -0.9000, y: 0.6000 }, { x: -0.9000, y: -0.6000 }, { x: -0.3751, y: -0.6831 }, { x: 0.0000, y: -0.4255 }, { x: 0.5499, y: -1.0647 } ],
                fillColor: [150, 219, 0],
                strokeColor: [255, 255, 255],
                strokeW: 1.50
            }
        ],
        fillColor: [50, 50, 50], strokeColor: [255, 255, 255], strokeW: 1.5,
        typicalCargo: ["Weapons", "Adv Components"], price: 115000, techLevel: 4,
        aiRoles: ["BOUNTY_HUNTER", "PIRATE"]
    },
    "LocalHopper": {
        name: "Local Hopper", role: "Light Transport", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 3.5, baseThrust: 0.04, baseTurnRate: 0.05,
        baseHull: 40, baseShield: 0, shieldRecharge: 0.5, cargoCapacity: 15,
        armament: [],
        costCategory: "Very Low", description: "A very basic, slow, and cheap short-range shuttle.",
        drawFunction: drawLocalHopper,
        vertexData: [ {x:0.6,y:0.6}, {x:-0.6,y:0.6}, {x:-0.6,y:-0.6}, {x:0.6,y:-0.6} ],
        fillColor: [150, 150, 150], strokeColor: [100, 100, 100], strokeW: 1.0,
        typicalCargo: ["Food", "Textiles"], price: 1800, techLevel: 1,
        aiRoles: ["TRANSPORT"]
    },
    "ErrandRunner": {
        name: "Errand Runner", role: "Light Transport", sizeCategory: "Small", size: 24,
        baseMaxSpeed: 4.0, baseThrust: 0.05, baseTurnRate: 0.045,
        baseHull: 50, baseShield: 10, shieldRecharge: 0.6, cargoCapacity: 25,
        armament: [],
        costCategory: "Low", description: "Slightly more capable than a Hopper, used for inter-station deliveries.",
        drawFunction: drawErrandRunner,
        vertexData: [ {x:0.7,y:0.4}, {x:-0.7,y:0.4}, {x:-0.9,y:0}, {x:-0.7,y:-0.4}, {x:0.7,y:-0.4} ],
        fillColor: [130, 140, 150], strokeColor: [80, 90, 100], strokeW: 1.0,
        typicalCargo: ["Machinery", "Medicine"], price: 4500, techLevel: 1,
        aiRoles: ["TRANSPORT", "HAULER"]
    },
    "SystemShuttle": {
        name: "System Shuttle", role: "Medium Transport", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 3.8, baseThrust: 0.06, baseTurnRate: 0.04,
        baseHull: 80, baseShield: 20, shieldRecharge: 0.7, cargoCapacity: 40,
        armament: [],
        costCategory: "Low", description: "A common sight carrying goods within a star system.",
        drawFunction: drawSystemShuttle,
        vertexData: [ {x:0.8,y:0.5}, {x:0.6,y:0.7}, {x:-0.8,y:0.7}, {x:-0.8,y:-0.7}, {x:0.6,y:-0.7}, {x:0.8,y:-0.5} ],
        fillColor: [160, 150, 140], strokeColor: [100, 90, 80], strokeW: 1.2,
        typicalCargo: ["Minerals", "Food", "Machinery"], price: 12000, techLevel: 2,
        aiRoles: ["TRANSPORT", "HAULER"]
    },
    "CargoWagon": {
        name: "Cargo Wagon", role: "Heavy Local Transport", sizeCategory: "Medium", size: 45,
        baseMaxSpeed: 3.0, baseThrust: 0.045, baseTurnRate: 0.03,
        baseHull: 120, baseShield: 30, shieldRecharge: 0.5, cargoCapacity: 120,
        armament: [],
        costCategory: "Low-Medium", description: "Slow but spacious, for bulk local transport. Little more than an engine strapped to containers.",
        drawFunction: drawCargoWagon,
        vertexData: [ {x:1,y:0.6}, {x:0.8,y:0.8}, {x:-0.8,y:0.8}, {x:-1,y:0.6}, {x:-1,y:-0.6}, {x:-0.8,y:-0.8}, {x:0.8,y:-0.8}, {x:1,y:-0.6} ],
        fillColor: [100, 90, 80], strokeColor: [60, 50, 40], strokeW: 1.5,
        typicalCargo: ["Machinery", "Metals", "Chemicals"], price: 22000, techLevel: 2,
        aiRoles: ["TRANSPORT"]
    },
    "PirateCutlass": {
        name: "Pirate Cutlass", role: "Fast Attack Fighter", sizeCategory: "Small", size: 32,
        baseMaxSpeed: 7.2, baseThrust: 0.16, baseTurnRate: 0.08,
        baseHull: 70, baseShield: 90, shieldRecharge: 1.3, cargoCapacity: 10,
        armament: ["Multi-Cannon", "Pulse Laser", "Guardian Missile"],
        costCategory: "Medium", description: "A common, modified fighter favored by pirates for its speed and bite.",
        drawFunction: drawPirateCutlass,
        vertexData: [ {x:1,y:0}, {x:-0.4,y:0.5}, {x:-0.8,y:0.3}, {x:-0.8,y:-0.3}, {x:-0.4,y:-0.5} ],
        fillColor: [80, 20, 20], strokeColor: [150, 100, 100], strokeW: 1.0,
        typicalCargo: ["Adv Components", "Narcotics"], price: 45000, techLevel: 3,
        aiRoles: ["PIRATE", "BOUNTY_HUNTER"]
    },
    "PirateMarauder": {
        name: "Pirate Marauder", role: "Raider/Boarding Craft", sizeCategory: "Medium", size: 48,
        baseMaxSpeed: 5.0, baseThrust: 0.09, baseTurnRate: 0.045,
        baseHull: 150, baseShield: 100, shieldRecharge: 0.8, cargoCapacity: 50,
        armament: ["Heavy Cannon", "Twin Pulse", "Mini-Turret", "Guardian Missile"],
        costCategory: "Medium-High", description: "A heavily armed pirate vessel designed for disabling and looting targets.",
        drawFunction: drawPirateMarauder,
        vertexData: [ {x:0.9,y:0.3}, {x:0.2,y:0.7}, {x:-0.9,y:0.7}, {x:-0.9,y:-0.7}, {x:0.2,y:-0.7}, {x:0.9,y:-0.3} ],
        fillColor: [50, 50, 50], strokeColor: [100, 100, 100], strokeW: 1.5,
        typicalCargo: ["Slaves", "Weapons", "Adv Components"], price: 75000, techLevel: 4,
        aiRoles: ["PIRATE"]
    },
    "PirateReaver": {
        name: "Pirate Reaver", role: "Heavy Pirate Cruiser", sizeCategory: "Large", size: 75,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.03,
        baseHull: 300, baseShield: 200, shieldRecharge: 0.9, cargoCapacity: 100,
        armament: ["Multi-Cannon","Force Blaster", "Mini-Turret", "Railgun Turret", "Guardian Missile"],
        costCategory: "High", description: "A formidable pirate capital ship, often a captured and modified freighter or military vessel.",
        drawFunction: drawPirateReaver,
        vertexData: [ {x:1,y:0.1}, {x:0.5,y:0.6}, {x:-0.5,y:0.8}, {x:-1,y:0.4}, {x:-1,y:-0.4}, {x:-0.5,y:-0.8}, {x:0.5,y:-0.6}, {x:1,y:-0.1} ],
        fillColor: [40, 60, 40], strokeColor: [80, 100, 80], strokeW: 2.0,
        typicalCargo: ["Narcotics", "Slaves", "Weapons"], price: 140000, techLevel: 5,
        aiRoles: ["PIRATE"]
    },
    "PirateBrigand": {
        name: "Pirate Brigand", role: "Fast Cargo Thief", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 6.8, baseThrust: 0.13, baseTurnRate: 0.065,
        baseHull: 60, baseShield: 70, shieldRecharge: 1.1, cargoCapacity: 30,
        armament: ["Pulse Laser", "Mini-Turret"],
        costCategory: "Medium", description: "A swift pirate ship designed for quick raids on unsuspecting haulers.",
        drawFunction: drawPirateBrigand,
        vertexData: [ {x:0.8,y:0}, {x:0.2,y:0.4}, {x:-0.8,y:0.4}, {x:-0.8,y:-0.4}, {x:0.2,y:-0.4} ],
        fillColor: [100, 60, 20], strokeColor: [150, 100, 50], strokeW: 1.0,
        typicalCargo: ["Food", "Textiles", "Minerals"], price: 38000, techLevel: 2,
        aiRoles: ["PIRATE"]
    },
    "PirateInterceptorMKII": {
        name: "Pirate Interceptor MkII", role: "Heavy Interceptor", sizeCategory: "Medium", size: 42,
        baseMaxSpeed: 7.0, baseThrust: 0.15, baseTurnRate: 0.075,
        baseHull: 100, baseShield: 150, shieldRecharge: 1.5, cargoCapacity: 15,
        armament: ["Beam Laser", "Multi-Cannon", "Disruptor"],
        costCategory: "Medium-High", description: "An upgraded pirate interceptor, bristling with stolen tech.",
        drawFunction: drawPirateInterceptorMKII,
        vertexData: [ {x:1.1,y:0}, {x:-0.2,y:0.5}, {x:-0.9,y:0.5}, {x:-0.7,y:0}, {x:-0.9,y:-0.5}, {x:-0.2,y:-0.5} ],
        fillColor: [60, 20, 60], strokeColor: [120, 80, 120], strokeW: 1.3,
        typicalCargo: ["Narcotics", "Weapons"], price: 68000, techLevel: 4,
        aiRoles: ["PIRATE", "BOUNTY_HUNTER"]
    },
    "SeparatistLiberator": {
        name: "Separatist Liberator", role: "Assault Fighter", sizeCategory: "Small", size: 36,
        baseMaxSpeed: 6.5, baseThrust: 0.14, baseTurnRate: 0.07,
        baseHull: 90, baseShield: 110, shieldRecharge: 1.2, cargoCapacity: 12,
        armament: ["Multi-Cannon", "Burst Blaster"],
        costCategory: "Medium", description: "Core fighter of Separatist cells, rugged and reliable.",
        drawFunction: drawSeparatistLiberator,
        vertexData: [ {x:1,y:0}, {x:-0.6,y:0.6}, {x:-1,y:0.2}, {x:-1,y:-0.2}, {x:-0.6,y:-0.6} ],
        fillColor: [100, 40, 40], strokeColor: [160, 100, 100], strokeW: 1.2,
        typicalCargo: ["Weapons", "Food"], price: 52000, techLevel: 3,
        aiRoles: ["SEPARATIST"]
    },
    "SeparatistDefiant": {
        name: "Separatist Defiant", role: "Gunship", sizeCategory: "Medium", size: 58,
        baseMaxSpeed: 4.8, baseThrust: 0.1, baseTurnRate: 0.04,
        baseHull: 250, baseShield: 180, shieldRecharge: 0.9, cargoCapacity: 30,
        armament: ["Heavy Cannon", "Railgun Turret", "Twin Pulse", "Guardian Missile"],
        costCategory: "Medium-High", description: "A heavily armed Separatist gunship, designed to break blockades.",
        drawFunction: drawSeparatistDefiant,
                vertexLayers: [
            {
                vertexData: [ { x: 0.9000, y: 0.4000 }, { x: 0.4000, y: 0.8000 }, { x: -0.7765, y: 0.8000 }, { x: -0.9000, y: 0.4000 }, { x: -0.9000, y: -0.4000 }, { x: -0.7765, y: -0.8000 }, { x: 0.4000, y: -0.8000 }, { x: 0.9000, y: -0.4000 } ],
                fillColor: [70, 70, 70],
                strokeColor: [120, 120, 120],
                strokeW: 1.80
            }
        ],
        fillColor: [70, 70, 70], strokeColor: [120, 120, 120], strokeW: 1.8,
        typicalCargo: ["Weapons", "Chemicals"], price: 90000, techLevel: 4,
        aiRoles: ["SEPARATIST"]
    },
    "SeparatistOutlander": {
        name: "Separatist Outlander", role: "Long-Range Scout/Raider", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.5, baseThrust: 0.09, baseTurnRate: 0.05,
        baseHull: 120, baseShield: 150, shieldRecharge: 1.3, cargoCapacity: 40, // For supplies or loot
        armament: ["Beam Laser", "Mini-Turret"],
        costCategory: "Medium", description: "Separatist vessel for deep space operations and hit-and-run attacks.",
        drawFunction: drawSeparatistOutlander, 
        vertexData: [ {x:1,y:0}, {x:0.3,y:0.3}, {x:-0.2,y:0.7}, {x:-1,y:0.3}, {x:-1,y:-0.3}, {x:-0.2,y:-0.7}, {x:0.3,y:-0.3} ], // Sleek but rugged
        fillColor: [60, 80, 60], strokeColor: [100, 120, 100], strokeW: 1.4, // Olive Drab
        typicalCargo: ["Computers", "Adv Components", "Food"], price: 70000, techLevel: 4,
        aiRoles: ["SEPARATIST", "PIRATE"]
    },
    "SeparatistVanguard": {
        name: "Separatist Vanguard", role: "Heavy Assault Cruiser", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 4.2, baseThrust: 0.08, baseTurnRate: 0.035,
        baseHull: 400, baseShield: 300, shieldRecharge: 1.0, cargoCapacity: 80,
        armament: ["Force Blaster", "Railgun Turret", "Quad Pulse", "Guardian Missile"],
        costCategory: "High", description: "Lead ship in Separatist fleets, heavily armed and armored.",
        drawFunction: drawSeparatistVanguard, 
        vertexData: [ {x:1,y:0.2}, {x:0.6,y:0.7}, {x:-0.6,y:0.9}, {x:-1,y:0.5}, {x:-1,y:-0.5}, {x:-0.6,y:-0.9}, {x:0.6,y:-0.7}, {x:1,y:-0.2} ], // Imposing, angular
        fillColor: [50, 30, 30], strokeColor: [100, 80, 80], strokeW: 2.2, // Dark Brownish Red
        typicalCargo: ["Weapons", "Machinery"], price: 160000, techLevel: 5,
        aiRoles: ["SEPARATIST"]
    },
    "SeparatistPartisan": {
        name: "Separatist Partisan", role: "Light Skirmisher", sizeCategory: "Tiny", size: 20,
        baseMaxSpeed: 7.5, baseThrust: 0.17, baseTurnRate: 0.085,
        baseHull: 35, baseShield: 45, shieldRecharge: 1.1, cargoCapacity: 4,
        armament: ["Pulse Laser"],
        costCategory: "Low", description: "A small, expendable fighter used by Separatist militias.",
        drawFunction: drawSeparatistPartisan, 
        vertexData: [ {x:0.9,y:0}, {x:-0.7,y:0.5}, {x:-0.9,y:0}, {x:-0.7,y:-0.5} ], // Simple dart
        fillColor: [80, 80, 60], strokeColor: [120, 120, 100], strokeW: 0.8, // Muddy Yellow
        typicalCargo: [], price: 28000, techLevel: 2,
        aiRoles: ["SEPARATIST", "GUARD"]
    },
     "SeparatistBulwark": {
        name: "Separatist Bulwark", role: "Mobile Defense Platform", sizeCategory: "Very Large", size: 130,
        baseMaxSpeed: 2.5, baseThrust: 0.04, baseTurnRate: 0.015,
        baseHull: 700, baseShield: 500, shieldRecharge: 0.8, cargoCapacity: 150,
        armament: ["Railgun Turret", "Mini-Turret", "Wide Scatter", "Avenger Missile","Barrier Field"],
        costCategory: "Very High", description: "A heavily fortified Separatist ship, slow but incredibly tough.",
        drawFunction: drawSeparatistBulwark,
        vertexData: [ {x:1,y:0.7}, {x:0.7,y:1}, {x:-0.7,y:1}, {x:-1,y:0.7}, {x:-1,y:-0.7}, {x:-0.7,y:-1}, {x:0.7,y:-1}, {x:1,y:-0.7} ],
        fillColor: [40, 40, 50], strokeColor: [90, 90, 100], strokeW: 3.0,
        typicalCargo: ["Metals", "Machinery"], price: 250000, techLevel: 5,
        aiRoles: ["SEPARATIST"]
    },
    "SeparatistShadow": {
        name: "Separatist Shadow", role: "Stealth Infiltrator", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 6.0, baseThrust: 0.11, baseTurnRate: 0.06,
        baseHull: 50, baseShield: 70, shieldRecharge: 1.2, cargoCapacity: 10,
        armament: ["Pulse Laser", "Disruptor"],
        costCategory: "Medium-High", description: "Separatist ship with basic stealth capabilities, used for infiltration and sabotage.",
        drawFunction: drawSeparatistShadow,
        vertexData: [ {x:1,y:0}, {x:-0.3,y:0.4}, {x:-0.8,y:0.1}, {x:-0.8,y:-0.1}, {x:-0.3,y:-0.4} ],
        fillColor: [30, 30, 30], strokeColor: [70, 70, 70], strokeW: 1.0,
        typicalCargo: ["Adv Components", "Computers"], price: 65000, techLevel: 4,
        aiRoles: ["PIRATE","SEPARATIST"]
    },
    "SeparatistSupplyRunner": {
        name: "Separatist Supply Runner", role: "Armored Transport", sizeCategory: "Medium", size: 52,
        baseMaxSpeed: 4.0, baseThrust: 0.07, baseTurnRate: 0.035,
        baseHull: 180, baseShield: 120, shieldRecharge: 0.8, cargoCapacity: 100,
        armament: ["Twin Pulse", "Mini-Turret"],
        costCategory: "Medium", description: "A Separatist transport designed to get vital supplies through hostile territory.",
        drawFunction: drawSeparatistSupplyRunner,
        vertexData: [ {x:0.9,y:0.6}, {x:0.7,y:0.8}, {x:-0.7,y:0.8}, {x:-0.9,y:0.6}, {x:-0.9,y:-0.6}, {x:-0.7,y:-0.8}, {x:0.7,y:-0.8}, {x:0.9,y:-0.6} ],
        fillColor: [90, 70, 50], strokeColor: [130, 110, 90], strokeW: 1.6,
        typicalCargo: ["Food", "Medicine", "Weapons", "Chemicals"], price: 48000, techLevel: 3,
        aiRoles: ["HAULER","SEPARATIST"]
    },
    "ImperialGuardian": {
        name: "Imperial Guardian", role: "System Patrol Cutter", sizeCategory: "Medium", size: 50,
        baseMaxSpeed: 5.8, baseThrust: 0.1, baseTurnRate: 0.05,
        baseHull: 160, baseShield: 200, shieldRecharge: 1.5, cargoCapacity: 25,
        armament: ["Beam Laser", "Twin Pulse", "Mini-Turret"],
        costCategory: "Medium-High", description: "A common Imperial patrol ship, faster than the ACAB, well-shielded.",
        drawFunction: drawImperialGuardian,
        vertexData: [ {x:1,y:0}, {x:0.5,y:0.4}, {x:-0.5,y:0.7}, {x:-1,y:0.3}, {x:-1,y:-0.3}, {x:-0.5,y:-0.7}, {x:0.5,y:-0.4} ],
        fillColor: [220, 220, 240], strokeColor: [100, 120, 200], strokeW: 1.5,
        typicalCargo: ["Slaves", "Narcotics"], price: 85000, techLevel: 4,
        aiRoles: ["IMPERIAL"]
    },
    "ImperialPaladin": {
        name: "Imperial Paladin", role: "Heavy Assault Frigate", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.5, baseThrust: 0.09, baseTurnRate: 0.038,
        baseHull: 350, baseShield: 400, shieldRecharge: 1.7, cargoCapacity: 70,
        armament: ["Heavy Cannon", "Mini-Turret", "Force Blaster","Heavy Tangle","Halo"],
        costCategory: "High", description: "An Imperial warship known for its powerful shields and broadside capability.",
        drawFunction: drawImperialPaladin,
        vertexLayers: [
            {
                vertexData: [ { x: 0.6888, y: 0.0813 }, { x: 0.2340, y: 0.3191 }, { x: -0.5170, y: 0.3732 }, { x: -0.7275, y: 0.6322 }, { x: -1.0000, y: 0.5000 }, { x: -1.0000, y: -0.5000 }, { x: -0.7275, y: -0.6322 }, { x: -0.5170, y: -0.3732 }, { x: 0.2340, y: -0.3191 }, { x: 0.6888, y: -0.0813 } ],
                fillColor: [240, 240, 250],
                strokeColor: [180, 180, 100],
                strokeW: 2.00
            }
        ],
        fillColor: [240, 240, 250], strokeColor: [180, 180, 100], strokeW: 2.0,
        typicalCargo: ["Weapons", "Luxury Goods"], price: 170000, techLevel: 4,
        aiRoles: ["IMPERIAL"]
    },
    "ImperialLancer": {
        name: "Imperial Lancer", role: "Fast Attack Interceptor", sizeCategory: "Small", size: 34,
        baseMaxSpeed: 8.2, baseThrust: 0.19, baseTurnRate: 0.085,
        baseHull: 70, baseShield: 130, shieldRecharge: 1.6, cargoCapacity: 8,
        armament: ["Twin Pulse", "Sniper Rail"],
        costCategory: "Medium", description: "A high-speed Imperial interceptor designed for surgical strikes.",
        drawFunction: drawImperialLancer,
        vertexData: [ {x:1,y:0}, {x:-0.5,y:0.3}, {x:-1,y:0.1}, {x:-1,y:-0.1}, {x:-0.5,y:-0.3} ],
        fillColor: [200, 210, 230], strokeColor: [80, 100, 180], strokeW: 1.0,
        typicalCargo: [], price: 62000, techLevel: 4,
        aiRoles: ["IMPERIAL", "GUARD"]
    },
    "ImperialJusticar": {
        name: "Imperial Justicar", role: "Heavy Gunboat", sizeCategory: "Medium", size: 62,
        baseMaxSpeed: 5.0, baseThrust: 0.11, baseTurnRate: 0.042,
        baseHull: 280, baseShield: 320, shieldRecharge: 1.4, cargoCapacity: 40,
        armament: ["Quad Pulse", "Railgun Turret", "Beam Laser","Heavy Tangle","Barrier Field"],
        costCategory: "High", description: "A heavily armed Imperial vessel used for enforcing blockades and punitive actions.",
        drawFunction: drawImperialJusticar,
        vertexLayers: [
            {
                vertexData: [ { x: 0.9000, y: 0.5000 }, { x: 0.5000, y: 0.9000 }, { x: -0.5000, y: 0.9000 }, { x: -0.9000, y: 0.5000 }, { x: -0.9000, y: -0.5000 }, { x: -0.5000, y: -0.9000 }, { x: 0.5000, y: -0.9000 }, { x: 0.9000, y: -0.5000 } ],
                fillColor: [180, 190, 210],
                strokeColor: [120, 140, 190],
                strokeW: 1.80
            },
            {
                vertexData: [ { x: -0.7571, y: -0.4875 }, { x: 0.0000, y: -0.3393 }, { x: 0.7571, y: -0.4875 }, { x: -0.3319, y: -0.7334 } ],
                fillColor: [255, 255, 255],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            },
            {
                vertexData: [ { x: -0.3956, y: 0.7037 }, { x: 0.7252, y: 0.4089 }, { x: 0.0000, y: 0.2726 }, { x: -0.7252, y: 0.4089 } ],
                fillColor: [255, 255, 255],
                strokeColor: [50, 50, 60],
                strokeW: 1.00
            }
        ],
        fillColor: [180, 190, 210], strokeColor: [120, 140, 190], strokeW: 1.8,
        typicalCargo: ["Weapons", "Slaves"], price: 125000, techLevel: 4,
        aiRoles: ["IMPERIAL"]
    },
    "ImperialEnvoy": {
        name: "Imperial Envoy", role: "Diplomatic Transport", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 6.0, baseThrust: 0.08, baseTurnRate: 0.03,
        baseHull: 150, baseShield: 250, shieldRecharge: 1.8, cargoCapacity: 50,
        armament: ["Mini-Turret", "Pulse Laser"],
        costCategory: "High", description: "An unarmed or lightly armed Imperial ship for diplomatic missions, fast and well-shielded.",
        drawFunction: drawImperialEnvoy,
        vertexData: [ {x:1.1,y:0}, {x:0.8,y:0.3}, {x:-0.8,y:0.4}, {x:-1.1,y:0}, {x:-0.8,y:-0.4}, {x:0.8,y:-0.3} ],
        fillColor: [250, 250, 255], strokeColor: [200, 180, 120], strokeW: 1.5,
        typicalCargo: ["Luxury Goods"], price: 105000, techLevel: 4,
        aiRoles: ["IMPERIAL"]
    },
    "ImperialSentinel": {
        name: "Imperial Sentinel", role: "Border Patrol Corvette", sizeCategory: "Large", size: 78,
        baseMaxSpeed: 5.2, baseThrust: 0.095, baseTurnRate: 0.04,
        baseHull: 300, baseShield: 350, shieldRecharge: 1.6, cargoCapacity: 60,
        armament: ["Mini-Turret", "Multi-Cannon", "Twin Pulse"],
        costCategory: "High", description: "A dedicated Imperial corvette for long-duration border patrols and customs enforcement.",
        drawFunction: drawImperialSentinel,
        vertexData: [ {x:1,y:0.3}, {x:0.4,y:0.6}, {x:-0.4,y:0.8}, {x:-1,y:0.6}, {x:-1,y:-0.6}, {x:-0.4,y:-0.8}, {x:0.4,y:-0.6}, {x:1,y:-0.3} ],
        fillColor: [210, 215, 225], strokeColor: [90, 110, 170], strokeW: 1.9,
        typicalCargo: ["Adv Components", "Slaves"], price: 145000, techLevel: 5,
        aiRoles: ["IMPERIAL"]
    },
    "ImperialEagleMkII": {
        name: "Imperial Eagle MkII", role: "Superiority Fighter", sizeCategory: "Small", size: 30,
        baseMaxSpeed: 7.8, baseThrust: 0.18, baseTurnRate: 0.092,
        baseHull: 60, baseShield: 140, shieldRecharge: 1.7, cargoCapacity: 6,
        armament: ["Twin Pulse", "Beam Laser"],
        costCategory: "Medium", description: "An upgraded version of the classic Eagle, exclusive to Imperial pilots. Even faster and better shielded.",
        drawFunction: drawImperialEagleMkII,
        vertexData: [ {x:1,y:0}, {x:-0.6,y:0.4}, {x:-0.9,y:0.2}, {x:-0.9,y:-0.2}, {x:-0.6,y:-0.4} ],
        fillColor: [230, 230, 245], strokeColor: [150, 150, 220], strokeW: 1.1,
        typicalCargo: [], price: 58000, techLevel: 3,
        aiRoles: ["IMPERIAL", "GUARD"]
    },
    "ImperialCutterLite": {
        name: "Imperial Cutter Lite", role: "Fast Armed Trader", sizeCategory: "Large", size: 80,
        baseMaxSpeed: 6.5, baseThrust: 0.09, baseTurnRate: 0.028,
        baseHull: 200, baseShield: 280, shieldRecharge: 1.6, cargoCapacity: 150,
        armament: ["Beam Laser", "Twin Pulse", "Mini-Turret"],
        costCategory: "High", description: "A smaller, more agile version of the Cutter, still capable of significant cargo and defense.",
        drawFunction: drawImperialCutterLite,
        vertexData: [ {x:1.1,y:0}, {x:0.7,y:0.25}, {x:0,y:0.7}, {x:-0.9,y:0.6}, {x:-1.1,y:0.3}, {x:-1.1,y:-0.3}, {x:-0.9,y:-0.6}, {x:0,y:-0.7}, {x:0.7,y:-0.25} ],
        fillColor: [225, 230, 240], strokeColor: [120, 160, 210], strokeW: 1.7,
        typicalCargo: ["Luxury Goods", "Adv Components", "Computers"], price: 130000, techLevel: 5,
        aiRoles: ["HAULER", "IMPERIAL"]
    },
        "ObeliskSentinel": {
        name: "Obelisk Sentinel (Alien)", role: "Alien Guardian", sizeCategory: "Medium", size: 40,
        baseMaxSpeed: 6.2, baseThrust: 0.13, baseTurnRate: 0.075,
        baseHull: 120, baseShield: 180, shieldRecharge: 2.0, cargoCapacity: 0,
        armament: ["Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Tall, monolithic alien ship with layered crystal armor.",
        drawFunction: drawObeliskSentinel,
        vertexLayers: [
            {
                vertexData: [ { x: 0.0000, y: 1.1037 }, { x: 0.4791, y: 0.7567 }, { x: 0.4276, y: 0.0000 }, { x: 0.4791, y: -0.7567 }, { x: 0.0000, y: -1.1037 }, { x: -0.4937, y: -0.7636 }, { x: -0.4276, y: 0.0000 }, { x: -0.4937, y: 0.7636 } ],
                fillColor: [60, 255, 180],
                strokeColor: [0, 200, 120],
                strokeW: 2.00
            },
            {
                vertexData: [ { x: 0.9369, y: 0.0000 }, { x: 0.6113, y: -0.1659 }, { x: -0.9369, y: 0.0000 }, { x: 0.6113, y: 0.1659 } ],
                fillColor: [0, 255, 120],
                strokeColor: [0, 180, 90],
                strokeW: 1.00
            }
        ],
        fillColor: [60, 255, 180], strokeColor: [0, 200, 120], strokeW: 2.0,
        typicalCargo: ["Chemicals", "Metals"], price: 120000, aiRoles: ["ALIEN"]
    },
    "SpiralWarden": {
        name: "Spiral Warden (Alien)", role: "Alien Interceptor", sizeCategory: "Small", size: 28,
        baseMaxSpeed: 8.0, baseThrust: 0.19, baseTurnRate: 0.11,
        baseHull: 60, baseShield: 90, shieldRecharge: 1.7, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with spiral, shell-like armor.",
        drawFunction: drawSpiralWarden,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.7,y:0.7}, {x:1.0,y:0.0}, {x:0.7,y:-0.7}, {x:0.0,y:-1.0}, {x:-0.7,y:-0.7}, {x:-1.0,y:0.0}, {x:-0.7,y:0.7} ], fillColor: [180, 255, 220], strokeColor: [0, 200, 180], strokeW: 1.2 },
            { vertexData: [ {x:0.0,y:0.5}, {x:0.35,y:0.35}, {x:0.5,y:0.0}, {x:0.35,y:-0.35}, {x:0.0,y:-0.5}, {x:-0.35,y:-0.35}, {x:-0.5,y:0.0}, {x:-0.35,y:0.35} ], fillColor: [100, 255, 200], strokeColor: [0, 180, 150], strokeW: 0.8 }
        ],
        fillColor: [180, 255, 220], strokeColor: [0, 200, 180], strokeW: 1.2,
        typicalCargo: ["Chemicals"], price: 95000, aiRoles: ["ALIEN"]
    },
    "TriadProbe": {
        name: "Triad Probe (Alien)", role: "Alien Scout", sizeCategory: "Tiny", size: 16,
        baseMaxSpeed: 9.0, baseThrust: 0.25, baseTurnRate: 0.15,
        baseHull: 25, baseShield: 30, shieldRecharge: 1.0, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Three-lobed alien probe, fast and evasive.",
        drawFunction: drawTriadProbe,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.5,y:0.5}, {x:1.0,y:0.0}, {x:0.5,y:-0.5}, {x:0.0,y:-1.0}, {x:-0.5,y:-0.5}, {x:-1.0,y:0.0}, {x:-0.5,y:0.5} ], fillColor: [200, 255, 180], strokeColor: [0, 200, 100], strokeW: 1.0 },
            { vertexData: [ {x:0.0,y:0.3}, {x:0.2,y:0.0}, {x:0.0,y:-0.3}, {x:-0.2,y:0.0} ], fillColor: [255, 255,  100], strokeColor: [200, 200, 0], strokeW: 1.0 }
        ],
       
        fillColor: [200, 255, 180], strokeColor: [0, 200, 100], strokeW: 1.0,
        typicalCargo: [], price: 60000, aiRoles: ["ALIEN"]
    },
    "HexaManta": {
        name: "Hexa-Manta (Alien)", role: "Alien Cruiser", sizeCategory: "Large", size: 70,
        baseMaxSpeed: 6.0, baseThrust: 0.12, baseTurnRate: 0.07,
        baseHull: 220, baseShield: 320, shieldRecharge: 2.2, cargoCapacity: 30,
        armament: ["Disruptor", "Force Blaster"],
        costCategory: "N/A", description: "Wide, six-winged alien ship with layered fins.",
        drawFunction: drawHexaManta,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.8,y:0.6}, {x:1.0,y:0.0}, {x:0.8,y:-0.6}, {x:0.0,y:-1.0}, {x:-0.8,y:-0.6}, {x:-1.0,y:0.0}, {x:-0.8,y:0.6} ], fillColor: [0, 255, 180], strokeColor: [0, 180, 120], strokeW: 2.0 },
            { vertexData: [ {x:0.0,y:0.7}, {x:0.42,y:0.56}, {x:0.7,y:0.0}, {x:0.42,y:-0.56}, {x:0.0,y:-0.7}, {x:-0.42,y:-0.56}, {x:-0.7,y:0.0}, {x:-0.42,y:0.56} ], fillColor: [255, 100, 255], strokeColor: [180, 0, 180], strokeW: 2.0 },
            { vertexData: [ {x:0.0,y:0.3}, {x:0.21,y:0.21}, {x:0.3,y:0.0}, {x:0.21,y:-0.21}, {x:0.0,y:-0.3}, {x:-0.21,y:-0.21}, {x:-0.3,y:0.0}, {x:-0.21,y:0.21} ], fillColor: [255, 255, 255], strokeColor: [180, 0, 180], strokeW: 1.0 }
        ],
        fillColor: [0, 255, 180], strokeColor: [0, 180, 120], strokeW: 2.0,
        typicalCargo: ["Metals", "Chemicals"], price: 180000, aiRoles: ["ALIEN"]
    },
    "FractalRay": {
        name: "Fractal Ray (Alien)", role: "Alien Destroyer", sizeCategory: "Large", size: 85,
        baseMaxSpeed: 7.0, baseThrust: 0.15, baseTurnRate: 0.09,
        baseHull: 260, baseShield: 350, shieldRecharge: 2.5, cargoCapacity: 40,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with fractal, lightning-like arms.",
        drawFunction: drawFractalRay,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.5,y:0.5}, {x:1.0,y:0.0}, {x:0.5,y:-0.5}, {x:0.0,y:-1.0}, {x:-0.5,y:-0.5}, {x:-1.0,y:0.0}, {x:-0.5,y:0.5} ], fillColor: [255, 255, 180], strokeColor: [200, 200, 0], strokeW: 2.0 },
            { vertexData: [ {x:0.0,y:0.3}, {x:0.2,y:0.0}, {x:0.0,y:-0.3}, {x:-0.2,y:0.0} ], fillColor: [255, 255,  100], strokeColor: [200, 200, 0], strokeW: 1.0 }
        ],
        fillColor: [255, 255, 180], strokeColor: [200, 200, 0], strokeW: 2.0,
        typicalCargo: ["Weapons", "Chemicals"], price: 220000, aiRoles: ["ALIEN"]
    },
    "PetalSpinner": {
        name: "Petal Spinner (Alien)", role: "Alien Fighter", sizeCategory: "Small", size: 26,
        baseMaxSpeed: 8.2, baseThrust: 0.21, baseTurnRate: 0.12,
        baseHull: 55, baseShield: 70, shieldRecharge: 1.5, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with spinning, flower-like petals.",
        drawFunction: drawPetalSpinner,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.5,y:0.5}, {x:1.0,y:0.0}, {x:0.5,y:-0.5}, {x:0.0,y:-1.0}, {x:-0.5,y:-0.5}, {x:-1.0,y:0.0}, {x:-0.5,y:0.5} ], fillColor: [255, 180, 255], strokeColor: [180, 0, 180], strokeW: 1.2 },
            { vertexData: [ {x:0.0,y:0.2}, {x:0.1,y:0.0}, {x:0.0,y:-0.2}, {x:-0.1,y:0.0} ], fillColor: [255, 100, 255], strokeColor: [180, 0, 180], strokeW: 0.7 }
        ],
        fillColor: [255, 180, 255], strokeColor: [180, 0, 180], strokeW: 1.2,
        typicalCargo: [], price: 70000, aiRoles: ["ALIEN"]
    },
    "CrescentMarauder": {
        name: "Crescent Marauder (Alien)", role: "Alien Raider", sizeCategory: "Medium", size: 38,
        baseMaxSpeed: 7.5, baseThrust: 0.16, baseTurnRate: 0.10,
        baseHull: 100, baseShield: 120, shieldRecharge: 1.8, cargoCapacity: 10,
        armament: ["Disruptor", "Scatter Beam"],
        costCategory: "N/A", description: "Alien ship with a crescent, blade-like hull.",
        drawFunction: drawCrescentMarauder,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.8,y:0.3}, {x:1.0,y:0.0}, {x:0.8,y:-0.3}, {x:0.0,y:-1.0}, {x:-0.8,y:-0.3}, {x:-1.0,y:0.0}, {x:-0.8,y:0.3} ], fillColor: [180, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.5 },
            { vertexData: [ {x:0.0,y:0.7}, {x:0.56,y:0.21}, {x:0.7,y:0.0}, {x:0.56,y:-0.21}, {x:0.0,y:-0.7}, {x:-0.56,y:-0.21}, {x:-0.7,y:0.0}, {x:-0.56,y:0.21} ], fillColor: [0, 255, 255], strokeColor: [0, 120, 120], strokeW: 0.8 }
        ],
        fillColor: [180, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.5,
        typicalCargo: ["Narcotics", "Chemicals"], price: 110000, aiRoles: ["ALIEN"]
    },
    "ObsidianOrb": {
        name: "Obsidian Orb (Alien)", role: "Alien Tank", sizeCategory: "Large", size: 90,
        baseMaxSpeed: 4.5, baseThrust: 0.09, baseTurnRate: 0.05,
        baseHull: 400, baseShield: 500, shieldRecharge: 3.0, cargoCapacity: 60,
        armament: ["Force Blaster", "Disruptor"],
        costCategory: "N/A", description: "Massive, spherical alien ship with layered armor.",
        drawFunction: drawObsidianOrb,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.7,y:0.7}, {x:1.0,y:0.0}, {x:0.7,y:-0.7}, {x:0.0,y:-1.0}, {x:-0.7,y:-0.7}, {x:-1.0,y:0.0}, {x:-0.7,y:0.7} ], fillColor: [40, 40, 60], strokeColor: [100, 100, 120], strokeW: 3.0 },
            { vertexData: [ {x:0.0,y:0.5}, {x:0.35,y:0.35}, {x:0.5,y:0.0}, {x:0.35,y:-0.35}, {x:0.0,y:-0.5}, {x:-0.35,y:-0.35}, {x:-0.5,y:0.0}, {x:-0.35,y:0.35} ], fillColor: [80, 80, 120], strokeColor: [180, 180, 255], strokeW: 1.5 }
        ],
        fillColor: [40, 40, 60], strokeColor: [100, 100, 120], strokeW: 3.0,
        typicalCargo: ["Metals", "Weapons"], price: 300000, aiRoles: ["ALIEN"]
    },
    "TesseractScout": {
        name: "Tesseract Scout (Alien)", role: "Alien Recon", sizeCategory: "Tiny", size: 18,
        baseMaxSpeed: 10.0, baseThrust: 0.25, baseTurnRate: 0.15,
        baseHull: 25, baseShield: 30, shieldRecharge: 1.0, cargoCapacity: 0,
        armament: ["Scatter Beam"],
        costCategory: "N/A", description: "Alien scout with a shifting, four-dimensional shape.",
        drawFunction: drawTesseractScout,
        vertexLayers: [
            { vertexData: [ {x:1.0,y:1.0}, {x:1.0,y:-1.0}, {x:-1.0,y:-1.0}, {x:-1.0,y:1.0} ], fillColor: [200, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.0 },
            { vertexData: [ {x:0.0,y:0.7}, {x:0.7,y:0.0}, {x:0.0,y:-0.7}, {x:-0.7,y:0.0} ], fillColor: [0, 255, 255], strokeColor: [0, 120, 120], strokeW: 0.7 }
        ],
        fillColor: [200, 255, 255], strokeColor: [0, 180, 180], strokeW: 1.0,
        typicalCargo: [], price: 80000, aiRoles: ["ALIEN"]
    },
    "LotusCarrier": {
        name: "Lotus Carrier (Alien)", role: "Alien Carrier", sizeCategory: "Very Large", size: 120,
        baseMaxSpeed: 3.5, baseThrust: 0.06, baseTurnRate: 0.025,
        baseHull: 800, baseShield: 900, shieldRecharge: 4.0, cargoCapacity: 200,
        armament: ["Force Blaster", "Disruptor", "Scatter Beam", "Halo"],
        costCategory: "N/A", description: "Enormous alien carrier with layered, lotus-like petals.",
        drawFunction: drawLotusCarrier,
        vertexLayers: [
            { vertexData: [ {x:0.0,y:1.0}, {x:0.6,y:0.8}, {x:1.0,y:0.0}, {x:0.6,y:-0.8}, {x:0.0,y:-1.0}, {x:-0.6,y:-0.8}, {x:-1.0,y:0.0}, {x:-0.6,y:0.8} ], fillColor: [255, 200, 255], strokeColor: [180, 0, 180], strokeW: 3.0 },
            { vertexData: [ {x:0.0,y:0.7}, {x:0.42,y:0.56}, {x:0.7,y:0.0}, {x:0.42,y:-0.56}, {x:0.0,y:-0.7}, {x:-0.42,y:-0.56}, {x:-0.7,y:0.0}, {x:-0.42,y:0.56} ], fillColor: [255, 100, 255], strokeColor: [180, 0, 180], strokeW: 2.0 },
            { vertexData: [ {x:0.0,y:0.3}, {x:0.21,y:0.21}, {x:0.3,y:0.0}, {x:0.21,y:-0.21}, {x:0.0,y:-0.3}, {x:-0.21,y:-0.21}, {x:-0.3,y:0.0}, {x:-0.21,y:0.21} ], fillColor: [255, 255, 255], strokeColor: [180, 0, 180], strokeW: 1.0 }
        ],
        fillColor: [255, 200, 255], strokeColor: [180, 0, 180], strokeW: 3.0,
        typicalCargo: ["Luxury Goods", "Chemicals", "Metals"], price: 600000, aiRoles: ["ALIEN"]
    }
};
// --- End Ship Definitions ---

console.log(`ships.js (Editor Version with ${Object.keys(SHIP_DEFINITIONS).length} ships) loaded and SHIP_DEFINITIONS created.`); // Updated log