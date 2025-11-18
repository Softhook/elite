// ****** station.js ******

/**
 * Represents a space station in the game.
 * Handles rendering, market interactions, and ship purchasing.
 */
class Station {
    /**
     * Creates a new station instance.
     * @param {number} worldX - The X coordinate in world space
     * @param {number} worldY - The Y coordinate in world space
     * @param {string} systemType - The economy type of the system
     * @param {string} name - The name of the station (defaults to "Station")
     * @param {boolean} isSecret - Whether this is a secret station
     * @param {string|null} stationSubtype - Subtype for secret stations (e.g., 'secret_military')
     */
    constructor(worldX, worldY, systemType, name = "Station", isSecret = false, stationSubtype = null) {
        this.pos = createVector(worldX, worldY);
        this.name = name;
        this.systemType = systemType;
        this.market = new Market(systemType);
        this.market.systemName = name.replace(" Hub", "");
        this.size = 600;
        // dockingRadius should be the visual radius (half the size) plus a small margin
        this.dockingRadius = this.size * 0.5 + Math.max(10, this.size * 0.05);
        this._setStationAppearance();
        this.angle = 0;
        this.rotationSpeed = 0.0015;
        this.lightTimer = random(TWO_PI);
        // Per-station animation offset and speed to desynchronize and vary motion
        this.animationOffset = random(TWO_PI);
        this.animSpeed = random(0.85, 1.15);
        this.isSecret = isSecret;
        this.stationSubtype = stationSubtype;
        this.discovered = !isSecret; // Only discovered if not secret
        
        // Storage locker - station-specific cargo storage
        this.storage = []; // Array of {name: string, quantity: number}
    }

    /**
     * Configures the station's appearance based on the system type.
     * @private
     */
    _setStationAppearance() {
        // Reset rotation speed to default; preserve any size already set (e.g. by constructor/save)
        this.rotationSpeed = 0.0015;
        
        switch (this.systemType) {
            case "Military":
                this.color = color(100, 120, 140); // Military grey-blue
                this.stationType = "military";
                break;
            case "Alien":
                this.color = color(80, 220, 170); // Alien teal
                this.stationType = "alien";
                this.rotationSpeed = 0.002; // Slightly faster rotation
                //this.size = 180; // Slightly larger
                break;
            case "Agricultural":
                this.color = color(120, 180, 100); // Agricultural green
                this.stationType = "agricultural";
                this.rotationSpeed = 0.0012; // Slightly slower rotation
                break;
            case "Industrial":
                this.color = color(160, 140, 120); // Industrial bronze-brown
                this.stationType = "industrial";
                break;
            case "Mining":
                this.color = color(160, 130, 90); // Mining rust/copper
                this.stationType = "mining";
                //this.size = 170; // Slightly larger
                break;
            case "Tourism":
                this.color = color(200, 160, 220); // Tourism lavender
                this.stationType = "tourism";
                break;
            case "Refinery":
                this.color = color(200, 80, 50); // Refinery orange-red
                this.stationType = "refinery";
                break;
            case "Post Human":
                this.color = color(100, 180, 230); // Post Human light blue
                this.stationType = "posthuman";
                break;
            case "Imperial":
                this.color = color(220, 190, 90); // Imperial gold
                this.stationType = "imperial";
                this.rotationSpeed = 0.001; // Slower, more stately rotation
                break;
            case "Separatist":
                this.color = color(200, 100, 0); // Separatist orange
                this.stationType = "separatist";
                break;
            default:
                this.color = color(180, 180, 200); // Standard silver-grey
                this.stationType = "standard";
                break;
        }
        
        // Update docking radius to match visual radius (half size) plus a margin
        this.dockingRadius = this.size * 0.5 + Math.max(10, this.size * 0.05);
    }

    /**
     * Updates the station's economy type and refreshes appearance and market.
     * Used when the system's economy type changes after creation.
     * @param {string} newEconomyType - The new economy type to apply
     */
    updateEconomyType(newEconomyType) {
        this.systemType = newEconomyType;
        this._setStationAppearance();
        
        // Update market to match new economy
        if (this.market) {
            if (typeof this.market.setEconomyType === 'function') {
                this.market.setEconomyType(newEconomyType);
            } else {
                this.market.systemType = newEconomyType;
                this.market.updatePrices();
            }
        }
    }

    /**
     * Returns the market associated with this station.
     * @returns {Market} The station's market
     */
    getMarket() { return this.market; }

    /**
     * Main draw method for the station. Calls helper methods to draw individual components.
     * Draws the station relative to its world position.
     */
    draw() {
        // Update animation values
        this.angle += this.rotationSpeed;
        // Slow, frame-rate independent timer with per-station speed variation.
        // Do NOT modulo here — keep a continuously increasing timer to avoid
        // discontinuities when wrapping, which causes jittery resets.
        this.lightTimer += 0.0012 * (typeof deltaTime !== 'undefined' ? deltaTime : 16) * this.animSpeed;
        
        push();
        translate(this.pos.x, this.pos.y);
        rotate(this.angle); // Apply rotation to the entire station
        
        // Select the appropriate drawing method based on station type
        switch (this.stationType) {
            case "military": this._drawMilitaryStation(); break;
            case "alien": this._drawAlienStation(); break;
            case "agricultural": this._drawAgriculturalStation(); break;
            case "industrial": this._drawIndustrialStation(); break;
            case "mining": this._drawMiningStation(); break;
            case "tourism": this._drawTourismStation(); break;
            case "refinery": this._drawRefineryStation(); break;
            case "posthuman": this._drawPostHumanStation(); break;
            case "imperial": this._drawImperialStation(); break;
            case "separatist": this._drawSeparatistStation(); break;
            default: this._drawStandardStation(); break;
        }
        
        pop();
    }

    // --- Drawing helpers ---
    /**
     * Draws the central hub of the station.
     * @private
     */
    _drawCentralHub() {
        // Main hub structure
        fill(100, 100, 120);
        stroke(180, 180, 200);
        strokeWeight(2);
        ellipse(0, 0, this.size * 0.25, this.size * 0.25);
        
        // Hub details - airlock/docking ports
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * PI / 4);
            fill(60, 60, 80);
            rect(-5, -this.size * 0.13, 10, 5, 2);
            pop();
        }
    }

    /**
     * Draws the four main arms connecting the hub to the outer ring.
     * @private
     */
    _drawMainArms() {
        strokeWeight(1);
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2);
            
            // Main arm structure
            fill(150, 150, 170);
            stroke(180, 180, 200);
            beginShape();
            vertex(-this.size * 0.08, 0);
            vertex(-this.size * 0.04, -this.size * 0.45);
            vertex(this.size * 0.04, -this.size * 0.45);
            vertex(this.size * 0.08, 0);
            endShape(CLOSE);
            
            // Structural reinforcements along arm
            stroke(100, 100, 120);
            for (let j = 1; j < 5; j++) {
                let y = -j * this.size * 0.09;
                line(-this.size * 0.07 + j*0.005, y, this.size * 0.07 - j*0.005, y);
            }
            
            // Connection to outer ring
            fill(120, 120, 140);
            rect(-this.size * 0.06, -this.size * 0.47, this.size * 0.12, this.size * 0.04, 3);
            pop();
        }
    }

    /**
     * Draws the inner and outer rings of the station.
     * @private
     */
    _drawRings() {
        // Outer ring (wheel)
        noFill();
        stroke(200, 200, 220);
        strokeWeight(3);
        ellipse(0, 0, this.size * 0.95, this.size * 0.95);
        
        // Inner ring structure
        strokeWeight(1);
        ellipse(0, 0, this.size * 0.9, this.size * 0.9);
    }

    /**
     * Draws the habitation modules positioned around the outer ring.
     * @private
     */
    _drawHabitationModules() {
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            
            if (i % 4 === 0) {
                this._drawDockingBay(i);
            } else {
                this._drawResidentialModule(i);
            }
            pop();
        }
    }

    /**
     * Draws separatist-specific habitation modules with angular pods,
     * hanging solar fins and pennants to give a distinct silhouette.
     * @private
     */
    _drawSeparatistHabitationModules() {
        // Sleeker separatist modules: low-profile pods with angled fins
        for (let i = 0; i < 16; i++) {
            push();
            // small alternating offset for a handcrafted look
            const baseAngle = i * TWO_PI / 16 + (i % 2 === 0 ? -0.02 : 0.02);
            rotate(baseAngle);

            const outerY = -this.size * 0.48;
            if (i % 4 === 0) {
                // Reinforced docking bay with curved canopy
                push();
                translate(0, outerY + this.size * 0.01);
                fill(200, 200, 200);
                stroke(110, 75, 40);
                strokeWeight(1.5);
                // base platform
                rect(-this.size * 0.055, -this.size * 0.02, this.size * 0.11, this.size * 0.05, 4);
                // curved canopy
               fill(50, 50, 50);
                noStroke();
                ellipse(0, -this.size * 0.005, this.size * 0.09, this.size * 0.04);
                // subtle stripe
                fill(200, 95, 10);
                rect(-this.size * 0.02, -this.size * 0.01, this.size * 0.04, this.size * 0.008, 2);
                pop();
            } else {
                // Sleek habitation pod
                push();
                translate(0, outerY);
                rotate(-0.06 + (i % 3) * 0.02);
                // pod body
                fill(100, 100, 100);
                stroke(110, 70, 40);
                strokeWeight(1);
                beginShape();
                vertex(-this.size * 0.045, -this.size * 0.01);
                bezierVertex(-this.size * 0.03, -this.size * 0.035, this.size * 0.03, -this.size * 0.035, this.size * 0.045, -this.size * 0.01);
                vertex(this.size * 0.03, this.size * 0.02);
                vertex(-this.size * 0.03, this.size * 0.02);
                endShape(CLOSE);

                // glowing window stripe
                noStroke();
                fill(255, 230, 140, 140 + sin(this.lightTimer*2 + i) * 60);
                rect(-this.size * 0.02, -this.size * 0.008, this.size * 0.04, this.size * 0.008, 2);
                pop();
            }

            // small accent light to tie into running-lights rhythm
            noStroke();
            fill(255, 200, 120, 160 + sin(this.lightTimer*2 + i) * 80);
            ellipse(0, -this.size * 0.475, 3.2, 3.2);

            pop();
        }
    }

    /**
     * Draws a docking bay module with status lights.
     * @param {number} index - Module index for animation timing
     * @private
     */
    _drawDockingBay(index) {
        // Docking bays at cardinal points
        fill(80, 80, 100);
        stroke(100, 100, 120);
        rect(-this.size * 0.06, -this.size * 0.48, this.size * 0.12, this.size * 0.06, 2);
        
        // Docking bay lighting (alternating red/green)
        fill(sin(this.lightTimer*2 + index) > 0 ? color(0, 200, 0) : color(200, 0, 0));
        noStroke();
        rect(-this.size * 0.03, -this.size * 0.46, this.size * 0.06, this.size * 0.02, 2);
    }

    /**
     * Draws a residential module with animated windows.
     * @param {number} index - Module index for animation timing
     * @private
     */
    _drawResidentialModule(index) {
        // Regular habitation modules
        fill(this.color);
        stroke(150, 150, 170);
        rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 2);
        
        // Windows with subtle animation
        fill(200, 200, 100, 150 + sin(this.lightTimer + index)*50);
        noStroke();
        for (let w = 0; w < 3; w++) {
            rect(-this.size * 0.03 + w * this.size * 0.03, -this.size * 0.465, this.size * 0.02, this.size * 0.01, 1);
        }
    }

    /**
     * Draws a single solar panel with optional grid lines.
     * @param {p5.Color} panelColor - The color of the solar panel
     * @param {p5.Color} mountColor - The color of the panel mount
     * @param {p5.Color} gridColor - The color of the grid lines
     * @private
     */
    _drawSingleSolarPanel(panelColor, mountColor, gridColor) {
        // Panel mount
        fill(mountColor);
        rect(-this.size * 0.02, this.size * 0.12, this.size * 0.04, this.size * 0.04);
        // Panel
        fill(panelColor);
        stroke(gridColor);
        rect(-this.size * 0.15, this.size * 0.16, this.size * 0.3, this.size * 0.1);
        // Panel grid lines
        stroke(gridColor, 100);
        strokeWeight(1);
        for (let j = 0; j < 5; j++) {
            let x = -this.size * 0.15 + j * this.size * 0.075;
            line(x, this.size * 0.16, x, this.size * 0.26);
        }
        for (let j = 0; j < 3; j++) {
            let y = this.size * 0.16 + j * this.size * 0.05;
            line(-this.size * 0.15, y, this.size * 0.15, y);
        }
    }

    /**
     * Small decorative astronaut figure used around domes and modules.
     * Drawn relative to current translation.
     * @private
     */
    _drawTinyAstronaut(x = 0, y = 0, scale = 1) {
        push();
        translate(x, y);
        const s = this.size * 0.02 * scale;

        // tether / shadow
        stroke(120, 120, 120, 120);
        strokeWeight(1);
        line(0, s * 0.6, 0, s * 1.6);

        // body pack
        fill(220);
        stroke(80);
        rect(-s * 0.33, -s * 0.1, s * 0.66, s * 1.0, s * 0.08);

        // backpack
        fill(190);
        rect(-s * 0.45, -s * 0.05, s * 0.22, s * 0.6, s * 0.06);

        // helmet
        fill(245);
        stroke(60);
        ellipse(0, -s * 0.6, s * 0.9, s * 0.9);
        // visor
        noStroke();
        fill(20, 100, 160, 220);
        ellipse(0, -s * 0.6, s * 0.52, s * 0.36);

        // small arm accents
        stroke(80);
        strokeWeight(1);
        line(-s * 0.33, s * 0.1, -s * 0.7, s * 0.2);
        line(s * 0.33, s * 0.1, s * 0.7, s * 0.2);

        pop();
    }

    /**
     * Small decorative shuttle drawn at current translation.
     * @private
     */
    _drawTinyShuttle(x = 0, y = 0, scale = 1) {
        push();
        translate(x, y);
        const s = this.size * 0.03 * scale;

        // body
        fill(200);
        stroke(60);
        beginShape();
        vertex(-s * 0.9, s * 0.2);
        vertex(s * 0.9, s * 0.0);
        vertex(-s * 0.9, -s * 0.2);
        endShape(CLOSE);

        // cockpit
        noStroke();
        fill(30, 110, 180, 220);
        ellipse(-s * 0.3, 0, s * 0.5, s * 0.35);

        // thruster flame
        fill(255, 140, 30, 200);
        beginShape();
        vertex(s * 0.9, 0);
        vertex(s * 1.3, s * 0.12);
        vertex(s * 1.3, -s * 0.12);
        endShape(CLOSE);

        pop();
    }

    /**
     * Small floating cargo crate used for industrial/mining decoration.
     * @private
     */
    _drawFloatingCrate(x = 0, y = 0, scale = 1) {
        push();
        translate(x, y);
        const s = this.size * 0.03 * scale;
        fill(150, 110, 70);
        stroke(80, 60, 40);
        rect(-s * 0.5, -s * 0.5, s, s, 2);
        // strap lines
        stroke(60, 40, 30);
        line(-s * 0.2, -s * 0.5, -s * 0.2, s * 0.5);
        line(s * 0.2, -s * 0.5, s * 0.2, s * 0.5);
        pop();
    }

    // --- Additional decorative elements (20 new helpers) ---
    _drawAntennaArray(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.02 * scale;
        stroke(180); strokeWeight(1);
        for (let i = -1; i <= 1; i++) {
            line(i * s * 0.8, 0, i * s * 0.8, -s * (1.6 + sin(this.lightTimer * 0.6 + i) * 0.2));
            ellipse(i * s * 0.8, -s * (1.6 + sin(this.lightTimer * 0.6 + i) * 0.2), s * 0.18, s * 0.18);
        }
        pop();
    }

    _drawSatelliteDish(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.035 * scale;
        stroke(90); fill(60);
        arc(0, 0, s * 1.6, s * 1.6, -PI/3, PI/3, CHORD);
        // slowly nodding mount
        rotate(sin(this.lightTimer * 0.3 + this.animationOffset) * 0.08);
        rect(-s * 0.08, s * 0.3, s * 0.16, s * 0.4, 2);
        pop();
    }

    _drawServiceBot(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.018 * scale;
        // bobbing
        translate(0, sin(this.lightTimer * 0.9 + this.animationOffset) * 2);
        fill(200); stroke(80);
        ellipse(0, 0, s * 1.2, s * 1.2);
        rect(-s * 0.25, s * 0.5, s * 0.5, s * 0.2, 2);
        pop();
    }

    _drawMaintenanceArm(x = 0, y = 0, length = 1, scale = 1) {
        push(); translate(x, y);
        stroke(90); strokeWeight(2);
        const s = this.size * 0.02 * scale;
        const ang = sin(this.lightTimer * 0.5 + this.animationOffset) * 0.6;
        rotate(ang);
        line(0, 0, 0, -s * length * 3);
        ellipse(0, -s * length * 3, s * 0.4, s * 0.4);
        pop();
    }

    _drawCargoTug(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.03 * scale;
        translate(sin(this.lightTimer * 0.7 + this.animationOffset) * 2, 0);
        fill(180); stroke(70);
        rect(-s * 0.7, -s * 0.25, s * 1.2, s * 0.5, 2);
        fill(30,100,180); noStroke(); ellipse(-s * 0.4, 0, s * 0.35, s * 0.25);
        pop();
    }

    _drawSignalBeacon(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.02 * scale;
        fill(255, 220, 120, 80 + sin(this.lightTimer * 0.8 + this.animationOffset) * 80);
        ellipse(0, 0, s * 0.6, s * 0.6);
        pop();
    }

    _drawFloatingLightBall(x = 0, y = 0, scale = 1) {
        push(); translate(x, y + sin(this.lightTimer * 0.6 + this.animationOffset) * 3);
        noStroke(); fill(120, 200, 255, 120);
        ellipse(0, 0, this.size * 0.02 * scale, this.size * 0.02 * scale);
        pop();
    }

    _drawHoloBillboard(x = 0, y = 0, w = 1, h = 0.5) {
        push(); translate(x, y);
        const sw = this.size * 0.06 * w, sh = this.size * 0.035 * h;
        noStroke(); fill(180,120,255,120 + sin(this.lightTimer * 0.7 + this.animationOffset) * 40);
        rect(-sw/2, -sh/2, sw, sh, 3);
        pop();
    }

    _drawRepairDrone(x = 0, y = 0, scale = 1) {
        push(); translate(x, y + sin(this.lightTimer * 1.1 + this.animationOffset) * 2);
        const s = this.size * 0.015 * scale;
        fill(220); stroke(80);
        ellipse(0, 0, s * 1.1, s * 1.1);
        line(0, s * 0.6, 0, s * 1.2);
        pop();
    }

    _drawScannerBeam(x = 0, y = 0, length = 1) {
        push(); translate(x, y);
        stroke(80,200,255,80);
        strokeWeight(2);
        const ang = sin(this.lightTimer * 0.6 + this.animationOffset) * 0.6;
        rotate(ang);
        line(0, 0, 0, -this.size * 0.18 * length);
        pop();
    }

    _drawRotatingMiniRing(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        noFill(); stroke(200,180,100,120);
        const r = this.size * 0.06 * scale;
        ellipse(0, 0, r, r);
        rotate(this.lightTimer * 0.08 + this.animationOffset * 0.2);
        stroke(220); line(-r*0.5,0,r*0.5,0);
        pop();
    }

    _drawDockingPylon(x = 0, y = 0) {
        push(); translate(x, y);
        stroke(100); fill(140);
        rect(-this.size*0.01, 0, this.size*0.02, -this.size*0.06, 2);
        pop();
    }

    _drawTetheredNet(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        stroke(120,90,60,120);
        const s = this.size * 0.045 * scale;
        for (let i = 0; i < 5; i++) line(-s/2 + i*(s/5), -s/2, -s/2 + i*(s/5), s/2);
        pop();
    }

    _drawCargoSwing(x = 0, y = 0, swing = 1) {
        push(); translate(x, y + sin(this.lightTimer * 0.9 + this.animationOffset) * 4 * swing);
        stroke(90); fill(160,120,80);
        rect(-this.size*0.02, -this.size*0.02, this.size*0.04, this.size*0.04, 2);
        pop();
    }

    _drawMiniCommsArray(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        stroke(150); fill(120);
        rect(-this.size*0.02, -this.size*0.03, this.size*0.04, this.size*0.06, 2);
        pop();
    }

    _drawSolarArraySpinner(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        rotate(this.lightTimer * 0.05 * this.animSpeed + this.animationOffset*0.1);
        stroke(80); fill(30,60,120);
        rect(-this.size*0.06, -this.size*0.01, this.size*0.12, this.size*0.02, 2);
        pop();
    }

    _drawBeaconRing(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        noFill(); stroke(255,200,60,60 + sin(this.lightTimer*0.6 + this.animationOffset)*60);
        ellipse(0,0,this.size*0.12*scale,this.size*0.12*scale);
        pop();
    }

    _drawMaintenancePod(x = 0, y = 0, scale = 1) {
        push(); translate(x, y + sin(this.lightTimer*0.85 + this.animationOffset)*3);
        fill(200); stroke(90);
        ellipse(0,0,this.size*0.03*scale,this.size*0.02*scale);
        pop();
    }

    _drawFloatBanner(x = 0, y = 0, textScale = 1) {
        push(); translate(x, y);
        noStroke(); fill(220,160,60,120);
        rect(-this.size*0.04, -this.size*0.02, this.size*0.08, this.size*0.03, 3);
        pop();
    }

    _drawTrafficSwarm(count = 6, radius = 0.36) {
        for (let i = 0; i < count; i++) {
            push();
            const phase = this.animationOffset * 0.3 + i * TWO_PI / count;
            rotate(phase + this.lightTimer * 0.08 + i * 0.02);
            translate(0, -this.size * radius + sin(this.lightTimer * 0.9 + i) * 3);
            this._drawTinyShuttle(0,0,0.35 + (i%2)*0.1);
            pop();
        }
    }

    /**
     * Draws solar panels extending from the hub.
     * @private
     */
    _drawSolarPanels(extraAngles = []) {
        // Standard panels at 45° and 225°
        for (let i = 0; i < 2; i++) {
            push();
            rotate(i * PI + PI/4);
            this._drawSingleSolarPanel(color(20, 30, 100), color(120, 120, 140), color(150, 150, 170));
            pop();
        }
        // Extra panels for separatist (if any)
        for (let angle of extraAngles) {
            push();
            rotate(angle);
            this._drawSingleSolarPanel(color(20, 30, 100), color(120, 120, 140), color(150, 150, 170));
            pop();
        }
    }

    /**
     * Draws animated running lights around the station's perimeter.
     * @private
     */
    _drawRunningLights(lightFn, count = 24, radius = 0.475, size = 3) {
        noStroke();
        for (let i = 0; i < count; i++) {
            push();
            rotate(i * TWO_PI / count);
            let c = lightFn(i, this.lightTimer);
            if (c) {
                fill(c);
                ellipse(0, -this.size * radius, size, size);
            }
            pop();
        }
    }

    /**
     * Draws the standard running lights for the station.
     * @private
     */
    _drawStandardRunningLights() {
        this._drawRunningLights((i, t) => {
            if (i % 8 === 0) return color(255, 30, 30, 100 + sin(t*3 + i) * 100); // Red
            if (i % 8 === 4) return color(30, 30, 255, 100 + sin(t*3 + i + PI) * 100); // Blue
            if (i % 2 === 0) return color(255, 255, 100, 100 + sin(t*2 + i*0.3) * 100); // Yellow
            return null;
        });
    }

    /**
     * Draws a military station with defensive structures and armored design.
     * @private
     */
    _drawMilitaryStation() {
        // Draw the modified central hub
        this._drawMilitaryCentralHub();
        // Draw modified main arms
        this._drawMilitaryArms();
        // Draw rings with defense systems
        this._drawRings();
        // Draw military modules
        this._drawMilitaryModules();
        // Draw weapon turrets instead of solar panels
        this._drawWeaponTurrets();
        // Draw military running lights
        // Add antennas, repair drones and traffic
        this._drawAntennaArray(-this.size*0.08, -this.size*0.02, 1);
        this._drawRepairDrone(this.size*0.06, -this.size*0.05, 0.9);
        this._drawTrafficSwarm(4, 0.42);
        this._drawMilitaryLights();
    }
    
    /**
     * Draws a fortified central hub for the military station.
     * @private
     */
    _drawMilitaryCentralHub() {
        // Main hub structure - armored
        fill(80, 90, 100);
        stroke(120, 130, 150);
        strokeWeight(2);
        ellipse(0, 0, this.size * 0.28, this.size * 0.28);
        
        // Additional armor plates
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * PI / 4);
            fill(60, 70, 80);
            stroke(100, 110, 130);
            strokeWeight(1);
            beginShape();
            vertex(-this.size * 0.09, -this.size * 0.06);
            vertex(-this.size * 0.04, -this.size * 0.14);
            vertex(this.size * 0.04, -this.size * 0.14);
            vertex(this.size * 0.09, -this.size * 0.06);
            endShape(CLOSE);
            pop();
        }
        
        // Command center
        fill(50, 60, 70);
        stroke(100, 110, 130);
        strokeWeight(1);
        ellipse(0, 0, this.size * 0.15, this.size * 0.15);
    }
    
    /**
     * Draws military-style arms with defensive capabilities.
     * @private
     */
    _drawMilitaryArms() {
        strokeWeight(1);
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2);
            
            // Main arm structure - more angular, armored look
            fill(100, 110, 130);
            stroke(130, 140, 160);
            beginShape();
            vertex(-this.size * 0.09, 0);
            vertex(-this.size * 0.06, -this.size * 0.15);
            vertex(-this.size * 0.05, -this.size * 0.45);
            vertex(this.size * 0.05, -this.size * 0.45);
            vertex(this.size * 0.06, -this.size * 0.15);
            vertex(this.size * 0.09, 0);
            endShape(CLOSE);
            
            // Defense turrets along arm
            for (let j = 1; j < 4; j++) {
                let y = -j * this.size * 0.12;
                
                // Turret base
                fill(70, 80, 100);
                stroke(90, 100, 120);
                ellipse(0, y, this.size * 0.05, this.size * 0.05);
                
                // Turret gun
                fill(40, 50, 70);
                rect(-this.size * 0.01, y - this.size * 0.04, this.size * 0.02, this.size * 0.04);
            }
            
            // Connection to outer ring - reinforced
            fill(90, 100, 120);
            stroke(120, 130, 150);
            rect(-this.size * 0.07, -this.size * 0.47, this.size * 0.14, this.size * 0.05, 2);
            pop();
        }
    }
    
    /**
     * Draws military station modules with weapons and defensive structures.
     * @private
     */
    _drawMilitaryModules() {
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            
            if (i % 4 === 0) {
                // Launch bays at cardinal points
                fill(60, 70, 90);
                stroke(80, 90, 110);
                rect(-this.size * 0.06, -this.size * 0.48, this.size * 0.12, this.size * 0.06, 2);
                
                // Warning lights
                fill(sin(this.lightTimer*3 + i) > 0 ? color(255, 50, 0) : color(255, 200, 0));
                noStroke();
                rect(-this.size * 0.04, -this.size * 0.46, this.size * 0.08, this.size * 0.02, 1);
            } else if (i % 2 === 0) {
                // Weapon modules
                fill(70, 80, 100);
                stroke(100, 110, 130);
                rect(-this.size * 0.05, -this.size * 0.47, this.size * 0.1, this.size * 0.04, 2);
                
                // Weapon barrel
                fill(50, 60, 80);
                rect(-this.size * 0.01, -this.size * 0.49, this.size * 0.02, this.size * 0.06, 1);
            } else {
                // Standard modules
                fill(this.color);
                stroke(120, 130, 150);
                rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 1);
                
                // Armored windows
                fill(100, 150, 200, 150 + sin(this.lightTimer + i)*50);
                noStroke();
                for (let w = 0; w < 2; w++) {
                    rect(-this.size * 0.025 + w * this.size * 0.03, -this.size * 0.465, this.size * 0.015, this.size * 0.01, 1);
                }
            }
            pop();
        }
    }
    
    /**
     * Draws weapon turrets for military stations.
     * @private
     */
    _drawWeaponTurrets() {
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2 + PI / 6);
            
            // Turret mount
            fill(80, 90, 110);
            stroke(100, 110, 130);
            rect(-this.size * 0.03, this.size * 0.12, this.size * 0.06, this.size * 0.06);
            
            // Main cannon
            fill(60, 70, 90);
            stroke(100, 110, 130);
            rect(-this.size * 0.02, this.size * 0.12, this.size * 0.04, this.size * 0.14, 1);
            
            // Cannon details
            stroke(120, 130, 150, 150);
            strokeWeight(1);
            for (let j = 0; j < 3; j++) {
                let y = this.size * 0.14 + j * this.size * 0.03;
                line(-this.size * 0.02, y, this.size * 0.02, y);
            }
            pop();
        }
    }
    
    /**
     * Draws military station running lights.
     * @private
     */
    _drawMilitaryLights() {
        noStroke();
        const step = TWO_PI / 32;
        const s = this.size;
        const r = -s * 0.475;
        const lt = this.lightTimer;
        for (let i = 0; i < 32; i++) {
            push();
            rotate(i * step);
            
            // Military uses yellow lights
            if (i % 8 === 0) {
                fill(255, 255, 0, 120 + sin(lt * 2 + i) * 100); // Bright yellow
                ellipse(0, r, 3.5, 3.5);
            } else if (i % 4 === 0) {
                fill(255, 255, 100, 120 + sin(lt * 2.5 + i) * 100); // Light yellow
                ellipse(0, r, 3.5, 3.5);
            } else if (i % 2 === 0) {
                fill(200, 200, 0, 80 + sin(lt * 3 + i * 0.5) * 80); // Dark yellow
                ellipse(0, r, 3.5, 3.5);
            }
            
            pop();
        }
    }
    
    /**
     * Draws an alien station with organic, non-standard design.
     * @private
     */
    _drawAlienStation() {
        this._drawAlienCore();
        this._drawAlienStructures();
        this._drawAlienRings();
        this._drawAlienModules();
        this._drawEnergyFields();
        this._drawAlienLights();
        // Alien ambient decorations: floating light balls and rotating mini rings
        this._drawFloatingLightBall(-this.size*0.12, -this.size*0.05, 1.1);
        this._drawFloatingLightBall(this.size*0.14, -this.size*0.08, 0.9);
        this._drawRotatingMiniRing(0, this.size*0.18, 0.7);
    }
    
    /**
     * Draws the alien station's central core.
     * @private
     */
    _drawAlienCore() {
        // Main core - non-circular, more organic
        push();
        fill(40, 180, 140);
        stroke(60, 220, 180);
        strokeWeight(2);
        
        // Slightly pulsating core
        let pulseSize = this.size * (0.3 + sin(this.lightTimer) * 0.02);
        
        // Draw an irregular, somewhat octagonal shape
        beginShape();
        for (let i = 0; i < 8; i++) {
            let angle = i * TWO_PI / 8;
            let radius = pulseSize * (1 + (i % 2 === 0 ? 0.1 : -0.1));
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        
        // Inner energy pattern
        noFill();
        stroke(120, 255, 200, 150 + sin(this.lightTimer * 2 * 0.55 + this.animationOffset) * 100);
        strokeWeight(1.5);
        beginShape();
        for (let i = 0; i < 12; i++) {
            let angle = i * TWO_PI / 12 + this.lightTimer;
            let radius = pulseSize * 0.6 * (1 + sin(i + this.lightTimer * 3 * 0.55 + this.animationOffset) * 0.2);
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        pop();
    }
    
    /**
     * Draws alien structural extensions.
     * @private
     */
    _drawAlienStructures() {
        strokeWeight(1.5);
        // Draw 5 asymmetric arms instead of 4 symmetric ones
        for (let i = 0; i < 5; i++) {
            push();
            // Non-uniform rotation
            rotate(i * TWO_PI / 5 + sin(i) * 0.2);
            
            // Curved, organic arm structure
            fill(60, 200, 160, 220);
            stroke(100, 240, 200);
            beginShape();
            vertex(-this.size * 0.05, 0);
            bezierVertex(
                -this.size * 0.08, -this.size * 0.2,
                -this.size * 0.03, -this.size * 0.35,
                -this.size * 0.05, -this.size * 0.45
            );
            vertex(this.size * 0.05, -this.size * 0.45);
            bezierVertex(
                this.size * 0.03, -this.size * 0.35,
                this.size * 0.08, -this.size * 0.2,
                this.size * 0.05, 0
            );
            endShape(CLOSE);
            
            // Organic nodules along arm
            fill(30, 160, 120);
            stroke(80, 220, 180);
            for (let j = 1; j < 4; j++) {
                let y = -j * this.size * 0.11;
                let size = this.size * 0.04 * (1 + sin(this.lightTimer * 2 * 0.55 + j + this.animationOffset) * 0.2);
                ellipse(0, y, size, size);
            }
            
            // Connection to outer zone - organic shape
            fill(50, 190, 150);
            stroke(90, 230, 190);
            beginShape();
            vertex(-this.size * 0.05, -this.size * 0.45);
            vertex(-this.size * 0.07, -this.size * 0.48);
            vertex(this.size * 0.07, -this.size * 0.48);
            vertex(this.size * 0.05, -this.size * 0.45);
            endShape(CLOSE);
            pop();
        }
    }
    
    /**
     * Draws alien ring structures.
     * @private
     */
    _drawAlienRings() {
        // Outer ring - not a perfect circle, slightly undulating
        push();
        noFill();
        stroke(100, 240, 200);
        strokeWeight(2.5);
        
        beginShape();
        for (let i = 0; i < 60; i++) {
            let angle = i * TWO_PI / 60;
            let radius = this.size * (0.48 + sin(angle * 5 + this.lightTimer) * 0.02);
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        
        // Inner energy field
        stroke(60, 220, 180, 100);
        strokeWeight(4);
        beginShape();
        for (let i = 0; i < 40; i++) {
            let angle = i * TWO_PI / 40 - (this.lightTimer * 0.5 * 0.55 + this.animationOffset * 0.15);
            let radius = this.size * (0.4 + sin(angle * 4 + this.lightTimer * 2 * 0.55 + this.animationOffset) * 0.02);
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape(CLOSE);
        pop();
    }
    
    /**
     * Draws alien modules with organic appearances.
     * @private
     */
    _drawAlienModules() {
        for (let i = 0; i < 15; i++) {
            push();
            // Non-uniform spacing
            rotate(i * TWO_PI / 15 + sin(i * 0.5) * 0.1);
            
            if (i % 5 === 0) {
                // Transport portals at specific points
                fill(20, 120, 100);
                stroke(60, 200, 160);
                ellipse(0, -this.size * 0.48, this.size * 0.08, this.size * 0.08);
                
                // Portal energy
                fill(100, 255, 200, 150 + sin(this.lightTimer * 3 * 0.55 + i + this.animationOffset) * 100);
                noStroke();
                ellipse(0, -this.size * 0.48, this.size * 0.05 * (1 + sin(this.lightTimer * 2 * 0.55 + this.animationOffset) * 0.2), this.size * 0.05 * (1 + sin(this.lightTimer * 2 * 0.55 + this.animationOffset) * 0.2));
            } else {
                // Organic pods
                fill(50, 180, 140);
                stroke(80, 220, 170);
                beginShape();
                for (let j = 0; j < 8; j++) {
                    let angle = j * TWO_PI / 8;
                    let rx = this.size * 0.04 * (1 + (j % 2 === 0 ? 0.2 : -0.1));
                    let ry = this.size * 0.035 * (1 + (j % 2 === 0 ? -0.1 : 0.2));
                    vertex(cos(angle) * rx, sin(angle) * ry - this.size * 0.48);
                }
                endShape(CLOSE);
                
                // Bioluminescent spots
                fill(120, 255, 220, 180 + sin(this.lightTimer + i*2) * 75);
                noStroke();
                for (let w = 0; w < 2; w++) {
                    let x = (w - 0.5) * this.size * 0.02;
                    let y = -this.size * 0.48;
                    let size = this.size * 0.01 * (1 + sin(this.lightTimer * 3 * 0.55 + i + w + this.animationOffset) * 0.3);
                    ellipse(x, y, size, size);
                }
            }
            pop();
        }
    }
    
    /**
     * Draws alien energy fields that replace solar panels.
     * @private
     */
    _drawEnergyFields() {
        for (let i = 0; i < 3; i++) {
            push();
            rotate(i * TWO_PI / 3 + PI/6);
            
            // Energy field generator
            fill(40, 170, 130);
            stroke(90, 230, 190);
            ellipse(0, this.size * 0.15, this.size * 0.06, this.size * 0.06);
            
            // Energy field - pulsating
            fill(100, 255, 200, 40 + sin(this.lightTimer * 2 * 0.55 + this.animationOffset) * 30);
            stroke(120, 255, 220, 100 + sin(this.lightTimer) * 50);
            beginShape();
            for (let j = 0; j < 24; j++) {
                let angle = j * TWO_PI / 24 + this.lightTimer;
                let radius = this.size * (0.15 + sin(j * 3 + this.lightTimer * 4 * 0.55 + this.animationOffset) * 0.03);
                vertex(cos(angle) * radius, sin(angle) * radius + this.size * 0.15);
            }
            endShape(CLOSE);
            
            // Energy tendrils
            stroke(80, 220, 180, 150);
            strokeWeight(1);
            for (let j = 0; j < 8; j++) {
                let angle = j * TWO_PI / 8 + (this.lightTimer * 0.5 * 0.55 + this.animationOffset * 0.12);
                let x1 = cos(angle) * this.size * 0.05;
                let y1 = sin(angle) * this.size * 0.05 + this.size * 0.15;
                let x2 = cos(angle) * this.size * 0.14;
                let y2 = sin(angle) * this.size * 0.14 + this.size * 0.15;
                line(x1, y1, x2, y2);
            }
            pop();
        }
    }
    
    /**
     * Draws alien station lights with unique patterns and colors.
     * @private
     */
    _drawAlienLights() {
        noStroke();
        const baseStep = TWO_PI / 30;
        const s = this.size;
        const r = -s * 0.49;
        const lt = this.lightTimer;
        for (let i = 0; i < 30; i++) {
            push();
            rotate(i * baseStep + sin(i * 0.2) * 0.1);
            
            // Alien uses teal, purple and green lights
            // Pulsating light size
            const sz = 2 + sin(lt * 3 + i) * 1;
            if (i % 5 === 0) {
                fill(0, 255, 200, 80 + sin(lt * 2.5 + i) * 120); // Teal
                ellipse(0, r, sz, sz);
            } else if (i % 3 === 0) {
                fill(180, 100, 255, 80 + sin(lt * 3 + i * 0.7) * 120); // Purple
                ellipse(0, r, sz, sz);
            } else if (i % 2 === 0) {
                fill(100, 255, 150, 80 + sin(lt * 1.5 + i * 0.4) * 120); // Green
                ellipse(0, r, sz, sz);
            }
            
            pop();
        }
    }

    /**
     * Serializes the station to a JSON object for saving.
     * @returns {Object} JSON representation of the station
     */
    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            name: this.name,
            systemType: this.systemType,
            stationType: this.stationType,
            size: this.size,
            dockingRadius: this.dockingRadius,
            color: this.color ? this.color.toString() : null, // p5.Color to string
            angle: this.angle,
            rotationSpeed: this.rotationSpeed,
            market: this.market && typeof this.market.toJSON === 'function'
                ? this.market.toJSON()
                : null,
            isSecret: this.isSecret || false,
            stationSubtype: this.stationSubtype || null,
            discovered: this.discovered || false,
            storage: this.storage || []
        };
    }

    /**
     * Creates a station instance from a saved JSON object.
     * @param {Object} data - The serialized station data
     * @returns {Station} A new station instance
     * @static
     */
    static fromJSON(data) {
        const s = new Station(
            data.pos.x, data.pos.y,
            data.systemType || data.market?.type || "Unknown",
            data.name,
            data.isSecret || false,
            data.stationSubtype || null
        );
        s.size = data.size;
        s.dockingRadius = data.dockingRadius;
        if (data.stationType) s.stationType = data.stationType;
        if (data.color && typeof color === "function") {
            try { s.color = color(data.color); } catch {}
        }
        s.angle = data.angle;
        s.rotationSpeed = data.rotationSpeed;
        if (data.market && typeof Market?.fromJSON === "function") {
            s.market = Market.fromJSON(data.market, s.systemType);
        }
        s.discovered = data.discovered || false;
        s.storage = Array.isArray(data.storage) ? data.storage : [];
        return s;
    }

    /**
     * Handles ship purchase transactions.
     * @param {Object} player - The player making the purchase
     * @param {Object} area - Information about the ship being purchased
     */
    purchaseShip(player, area) {
        if (player.credits >= area.price) {
            player.spendCredits(area.price);
            player.applyShipDefinition(area.shipType);
            if (typeof saveGame === 'function') saveGame();
            alert(`You bought a ${area.shipType}!`);
        }
    }

    /**
     * Draws an agricultural station with greenhouses and domes.
     * @private
     */
    _drawAgriculturalStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Greenhouse domes on modules
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            if (i % 4 === 0) {
                // Large greenhouse domes at cardinal points
                fill(120, 200, 120, 180);
                stroke(80, 160, 80);
                ellipse(0, -this.size * 0.48, this.size * 0.13, this.size * 0.08);
                fill(180, 255, 180, 80 + 40 * sin(this.lightTimer + i));
                ellipse(0, -this.size * 0.48, this.size * 0.09, this.size * 0.05);
            } else {
                // Standard modules with green windows
                fill(this.color);
                stroke(100, 180, 100);
                rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 2);
                fill(180, 255, 180, 120 + 40 * sin(this.lightTimer + i));
                noStroke();
                rect(-this.size * 0.02, -this.size * 0.465, this.size * 0.04, this.size * 0.015, 1);
            }
            pop();
        }
        this._drawSolarPanels();
        // pollinator drones for the greenhouses (slower and with offset)
        for (let i = 0; i < 3; i++) {
            push();
            const phase = this.animationOffset * 0.4 + i * 0.08;
            rotate(i * TWO_PI / 3 + phase + this.lightTimer * 0.12);
            translate(0, -this.size * 0.44 + sin(this.lightTimer * 0.9 + this.animationOffset + i * 0.5) * 3);
            this._drawTinyShuttle(0, 0, 0.5);
            pop();
        }

        // Tethered nets, cargo swings and maintenance pods
        this._drawTetheredNet(this.size*0.05, -this.size*0.46, 0.8);
        this._drawCargoSwing(-this.size*0.07, -this.size*0.4, 0.9);
        this._drawMaintenancePod(this.size*0.08, -this.size*0.44, 0.9);

        // Yellow/green running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(180, 255, 100, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Green-yellow
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws an industrial station with smokestacks and extra modules.
     * @private
     */
    _drawIndustrialStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Industrial modules with smokestacks
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(120, 100, 80);
            rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 2);
            // Smokestack
            if (i % 4 === 0) {
                fill(80, 80, 80);
                rect(-this.size * 0.01, -this.size * 0.51, this.size * 0.02, this.size * 0.04, 1);
                fill(180, 180, 180, 80 + 40 * sin(this.lightTimer + i));
                ellipse(0, -this.size * 0.53, this.size * 0.03, this.size * 0.01);
            }
            pop();
        }
        this._drawSolarPanels();
        // Floating crates and a service shuttle with varied timing
        for (let i = 0; i < 3; i++) {
            push();
            const phase = this.animationOffset * 0.6 + i * 0.2;
            rotate(i * TWO_PI / 3 + phase + this.lightTimer * 0.12);
            translate(this.size * 0.06 * (i - 1), -this.size * 0.28 + sin(this.lightTimer * 0.9 + this.animationOffset + i * 0.4) * 4);
            this._drawFloatingCrate(0, 0, 0.9 - i * 0.15);
            pop();
        }
        push();
        rotate(this.animationOffset * -0.2 + this.lightTimer * 0.14);
        translate(-this.size * 0.15, -this.size * 0.22 + sin(this.lightTimer * 0.7 + this.animationOffset) * 3);
        this._drawTinyShuttle(0, 0, 0.8);
        pop();

        // Maintenance arms and dock pylons
        this._drawMaintenanceArm(this.size*0.09, this.size*0.08, 1.8, 1);
        this._drawDockingPylon(-this.size*0.08, -this.size*0.06);

        // Orange/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a mining station with ore containers and rugged modules.
     * @private
     */
    _drawMiningStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Mining containers and rugged modules
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            if (i % 4 === 0) {
                // Large ore container
                fill(180, 140, 80);
                stroke(120, 80, 40);
                rect(-this.size * 0.06, -this.size * 0.48, this.size * 0.12, this.size * 0.07, 2);
            } else {
                // Rugged module
                fill(this.color);
                stroke(120, 100, 80);
                rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 2);
            }
            pop();
        }
        // No solar panels, instead draw mining cranes
        for (let i = 0; i < 2; i++) {
            push();
            rotate(i * PI + PI/4);
            stroke(120, 100, 80);
            strokeWeight(3);
            line(0, this.size * 0.12, 0, this.size * 0.28);
            strokeWeight(1);
            line(0, this.size * 0.28, this.size * 0.08, this.size * 0.32);
            pop();
        }
        // Mining drones and floating ore crates with slower, varied rhythms
        for (let i = 0; i < 2; i++) {
            push();
            const phase = this.animationOffset * (i ? 0.6 : -0.3);
            rotate(i * PI + phase + this.lightTimer * 0.14);
            translate(0, -this.size * 0.38 + sin(this.lightTimer * 0.9 + this.animationOffset + i * 0.5) * 4);
            this._drawTinyShuttle(0, 0, 0.7);
            pop();
        }
        for (let i = 0; i < 2; i++) {
            push();
            const phase = this.animationOffset * 0.25 + i * 0.2;
            rotate(i * PI / 2 + phase + this.lightTimer * 0.18);
            translate(this.size * (i ? 0.12 : -0.12), -this.size * 0.45 + sin(this.lightTimer * 0.9 + this.animationOffset + i * 0.6) * 3);
            this._drawFloatingCrate(0, 0, 1);
            pop();
        }

        // Mining laser swings and maintenance pods
        this._drawScannerBeam(0, -this.size*0.02, 1.2);
        this._drawMaintenancePod(-this.size*0.06, -this.size*0.04, 1);
        // Red/yellow running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            if (i % 3 === 0) fill(255, 80, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Red
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a tourism station with domes and purple lights.
     * @private
     */
    _drawTourismStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Domes and windows
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            if (i % 4 === 0) {
                fill(220, 180, 255, 180);
                stroke(180, 120, 220);
                ellipse(0, -this.size * 0.48, this.size * 0.13, this.size * 0.08);
            } else {
                fill(this.color);
                stroke(180, 120, 220);
                rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 2);
                fill(255, 200, 255, 120 + 40 * sin(this.lightTimer + i));
                noStroke();
                rect(-this.size * 0.02, -this.size * 0.465, this.size * 0.04, this.size * 0.015, 1);
            }
            pop();
        }
        //this._drawSolarPanels();

        // Decorative shuttles and tourists with slower, desynced motion
        for (let i = 0; i < 3; i++) {
            push();
            const phase = this.animationOffset * 0.5 + i * 0.05;
            rotate(i * TWO_PI / 3 + phase + this.lightTimer * 0.12);
            translate(-this.size * 0.02, -this.size * 0.42 + sin(this.lightTimer + this.animationOffset + i * 0.7) * (3 + 0.8 * i));
            this._drawTinyShuttle(0, 0, 0.6 + i * 0.08);
            pop();
        }
        for (let i = 0; i < 4; i++) {
            push();
            const phase = 0.5 + i * 0.12;
            rotate(i * TWO_PI / 4 + phase + this.animationOffset * 0.2);
            translate(0, -this.size * 0.51 + sin(this.lightTimer + this.animationOffset + i * 0.6) * 3);
            this._drawTinyAstronaut(0, 0, 0.45);
            pop();
        }

        // Holographic billboards and float banners
        this._drawHoloBillboard(this.size*0.08, -this.size*0.32, 0.9, 0.5);
        this._drawFloatBanner(-this.size*0.09, -this.size*0.34, 1);
        // Purple/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(200, 160, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Purple
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a refinery station with tanks and red lights.
     * @private
     */
    _drawRefineryStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Tanks and pipes
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(180, 80, 50);
            rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 2);
            if (i % 4 === 0) {
                fill(200, 80, 50);
                ellipse(0, -this.size * 0.51, this.size * 0.06, this.size * 0.06);
                stroke(180, 80, 50);
                line(0, -this.size * 0.51, 0, -this.size * 0.47);
            }
            pop();
        }
        this._drawSolarPanels();
        // Red/orange running lights
        // Scanner beams and floating light balls for refinery activity
        this._drawScannerBeam(-this.size*0.05, -this.size*0.02, 1.1);
        this._drawFloatingLightBall(this.size*0.07, -this.size*0.03, 1.0);
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 80, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Red
            if (i % 3 === 0) fill(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }

    /**
     * Draws a posthuman station with blue/white lights and sleek modules.
     * @private
     */
    _drawPostHumanStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Sleek modules
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(100, 180, 230);
            rect(-this.size * 0.04, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 6);
            fill(200, 255, 255, 120 + 40 * sin(this.lightTimer + i));
            noStroke();
            rect(-this.size * 0.02, -this.size * 0.465, this.size * 0.04, this.size * 0.015, 3);
            pop();
        }
        this._drawSolarPanels();
        // Blue/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(100, 200, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Blue
            if (i % 3 === 0) fill(255, 255, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // White
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }

        // Futuristic rotating mini-rings and holo billboards
        this._drawRotatingMiniRing(-this.size*0.06, -this.size*0.04, 0.7);
        this._drawHoloBillboard(this.size*0.1, -this.size*0.28, 0.8, 0.4);
    }

    /**
     * Draws an imperial station with gold and stately features.
     * @private
     */
    _drawImperialStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        // Gold modules and banners
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            fill(this.color);
            stroke(180, 160, 60);
            rect(-this.size * 0.045, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 4);
            if (i % 4 === 0) {
                fill(255, 220, 100);
                rect(-this.size * 0.01, -this.size * 0.51, this.size * 0.02, this.size * 0.06, 2);
            }
            pop();
        }
        this._drawSolarPanels();
        // Regal pennants and a ceremonial shuttle
        for (let i = 0; i < 6; i++) {
            push();
            rotate(i * TWO_PI / 6 + this.lightTimer * 0.05);
            translate(0, -this.size * 0.52);
            fill(255, 220, 100, 200);
            noStroke();
            beginShape();
            vertex(0, 0);
            vertex(-this.size * 0.02, this.size * 0.04);
            vertex(this.size * 0.02, this.size * 0.04);
            endShape(CLOSE);
            pop();
        }
        push();
        rotate(this.animationOffset * -0.25 - this.lightTimer * 0.14);
        translate(this.size * 0.12, -this.size * 0.36 + sin(this.lightTimer * 0.8 + this.animationOffset * 0.4) * 3);
        this._drawTinyShuttle(0, 0, 0.7);
        pop();

        // Beacon ring and mini comms arrays
        this._drawBeaconRing(this.size*0.0, -this.size*0.02, 0.9);
        this._drawMiniCommsArray(this.size*0.06, -this.size*0.1, 1);

        // Gold/white running lights
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            fill(255, 220, 100, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Gold
            if (i % 3 === 0) fill(255, 255, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // White
            ellipse(0, -this.size * 0.475, 3, 3);
            pop();
        }
    }
    
    /**
     * Draws a separatist station with extra solar panels and unique features.
     * @private
     */
    _drawSeparatistStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        //this._drawHabitationModules();
        // Draw standard panels plus two extra at 135° and 315°
        this._drawSolarPanels([PI * 3/4, PI * 7/4]);
        // Use a separate habitation layout for separatists
        this._drawSeparatistHabitationModules();

        // Draw running lights aligned to the separatist modules
        const separatistLightFn = (i, t) => {
            if (i % 8 === 0) return color(255, 30, 30, 100 + sin(t*3 + i) * 100);
            if (i % 8 === 4) return color(30, 30, 255, 100 + sin(t*3 + i + PI) * 100);
            if (i % 2 === 0) return color(255, 255, 100, 100 + sin(t*2 + i*0.3) * 100);
            return null;
        };
        this._drawRunningLights(separatistLightFn, 16, 0.48, 3);
        // Extra comms and rotor spinners for the separatists
        this._drawMiniCommsArray(-this.size*0.06, -this.size*0.04, 1);
        this._drawSolarArraySpinner(this.size*0.06, -this.size*0.03, 0.9);
    }

    /**
     * Draws the standard (default) station with all standard features.
     * @private
     */
    _drawStandardStation() {
        this._drawCentralHub();
        this._drawMainArms();
        this._drawRings();
        this._drawHabitationModules();
        this._drawSolarPanels();
        // small shuttle and astronaut for life, slowed and desynced
        push();
        rotate(this.animationOffset * 0.2 + this.lightTimer * 0.18);
        translate(-this.size * 0.12, -this.size * 0.36 + sin(this.lightTimer * 0.9 + this.animationOffset) * 3);
        this._drawTinyShuttle(0, 0, 0.7);
        pop();
        push();
        rotate(this.animationOffset * -0.15 - this.lightTimer * 0.18);
        translate(this.size * 0.08, -this.size * 0.5 + sin(this.lightTimer * 0.8 + this.animationOffset * 0.5) * 3);
        this._drawTinyAstronaut(0, 0, 0.5);
        pop();

        this._drawStandardRunningLights();

        // Small comms arrays and solar spinners
        this._drawMiniCommsArray(-this.size*0.09, -this.size*0.04);
        this._drawSolarArraySpinner(this.size*0.09, -this.size*0.02, 1);
        // Busy little traffic
        this._drawTrafficSwarm(5, 0.38);
    }
}

window.Station = Station;