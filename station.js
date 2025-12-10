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
        this.animSpeed = random(0.1, 0.5);
        this.isSecret = isSecret;
        this.stationSubtype = stationSubtype;
        this.discovered = !isSecret; // Only discovered if not secret
        
        // Storage locker - station-specific cargo storage
        this.storage = []; // Array of {name: string, quantity: number}
        // Pre-generate crate field (positions/styles) for richer decoration (cheap per-frame)
        this.crateField = null;
        this._generateCrates();
    }

    /**
     * Pre-generate a field of crate specs for use in decoration.
     * Creates many small crate variations clustered around arm/ring areas.
     * Runs once in constructor to avoid allocations per-frame.
     * @private
     */
    _generateCrates() {
        if (this.crateField) return;
        const preferredTypes = ['industrial', 'mining', 'refinery', 'standard', 'agricultural'];
        // Only generate for types that benefit visually; still keep array for others but small
        const count = preferredTypes.includes(this.stationType) ? 60 : 20;
        this.crateField = [];
        for (let i = 0; i < count; i++) {
            // cluster around one of the main arms or rings
            const arm = Math.floor(random(0, 4));
            const armBase = arm * PI/2;
            const ang = armBase + random(-0.28, 0.28) + random(-0.1, 0.1);
            // radius slightly outside the habitation modules
            const radius = random(0.40, 0.52);
            const x = cos(ang) * this.size * radius;
            const y = sin(ang) * this.size * radius;

            // crate visual properties
            const s = random(this.size * 0.008, this.size * 0.034);
            const rot = random(-PI/6, PI/6);
            const strokeW = random([0.5,1,1.5,2,3]); // occasional thicker lines
            const shading = random() < 0.42; // some crates have shading pattern
            // color by station type with small variance
            let r, g, b;
            switch (this.stationType) {
                case 'industrial': r=160; g=140; b=120; break;
                case 'mining': r=170; g=120; b=70; break;
                case 'refinery': r=200; g=120; b=80; break;
                case 'agricultural': r=120; g=180; b=100; break;
                default: r=180; g=180; b=200;
            }
            r += random(-20, 20);
            g += random(-20, 20);
            b += random(-20, 20);
            
            let colObj;
            try {
                colObj = color(r, g, b);
            } catch (e) {
                colObj = [r, g, b]; // Fallback if p5 not ready
            }

            this.crateField.push({ x, y, s, rot, strokeW, shading, colObj, arm });
        }
    }

    /**
     * Draw the pre-generated crate field. Cheap to execute; uses simple rects and optional shading.
     * @private
     */
    _drawCrates() {
        if (!this.crateField || this.crateField.length === 0) return;
        // Draw crates grouped by simple loops
        for (let i = 0; i < this.crateField.length; i++) {
            const c = this.crateField[i];
            push();
            translate(c.x, c.y);
            const rot = c.rot + sin(this.lightTimer * 0.5 + i) * 0.02;
            rotate(rot);
            
            let col = c.colObj;
            if (Array.isArray(col)) {
                 // Just in case it was created before p5 was ready
                 try { col = color(col[0], col[1], col[2]); c.colObj = col; } catch(e) {}
            }
            
            const depth = c.s * 0.5;
            
            this._drawBox3D(0, 0, c.s, c.s * 0.9, depth, col, rot);
            pop();
        }
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
        
        // Calculate sun angle in local station space for shading
        // Sun is at (0,0). Vector to sun is -this.pos
        // We want the angle of this vector relative to the station's current rotation
        const sunVecAngle = atan2(-this.pos.y, -this.pos.x);
        this._localSunAngle = sunVecAngle - this.angle;

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
        
        // Walker robots for non-military stations (varied by type)
        if (this.stationType !== 'military') {
            let robotConfigs = [];
            
            switch (this.stationType) {
                case 'tourism':
                    robotConfigs = [0, 1, 2, 3]; // All types
                    break;
                case 'industrial':
                    robotConfigs = [0, 0, 2]; // Two maintenance, one cargo
                    break;
                case 'mining':
                    robotConfigs = [2, 2]; // Two cargo bots
                    break;
                case 'agricultural':
                    robotConfigs = [1]; // One utility bot
                    break;
                case 'standard':
                    robotConfigs = [0, 3]; // Maintenance and repair
                    break;
                case 'imperial':
                    robotConfigs = [];
                    break;
                case 'posthuman':
                    robotConfigs = [1, 1, 1, 1]; // Four utility bots
                    break;
                case 'alien':
                    robotConfigs = [];
                    break;
                case 'refinery':
                    robotConfigs = [2]; // One cargo bot
                    break;
                case 'separatist':
                    robotConfigs = [0, 1]; // Maintenance and utility
                    break;
                default:
                    robotConfigs = [0]; // Default one maintenance bot
                    break;
            }
            
            for (let i = 0; i < robotConfigs.length; i++) {
                push();
                rotate(i * PI / 2);
                // Calculate position along the arm
                const phase = (this.lightTimer * 0.03 + i * PI / 2) % (2 * PI);
                const armLength = 0.42; // from 0 to -0.42 (closer to edge)
                const yPos = -map(sin(phase), -1, 1, 0, armLength) * this.size;
                const xSide = cos(phase) > 0 ? -1 : 1; // left or right side
                const xOffset = xSide * this.size * 0.025; // offset from center
                translate(xOffset, yPos);
                this._drawWalkerRobot(0, 0, 1, robotConfigs[i]);
                pop();
            }
        }
        
        // subtle glint and small rotating glyphs for visual polish (drawn in station space)
        this._drawGlint(this.size*0.02, -this.size*0.18, 0.9);
        // Skip rotating glyph/star pattern for military stations
        if (this.stationType !== 'military') this._drawRotatingGlyphs(this.size*0.0, -this.size*0.16, 0.6);
        pop();
    }

    // --- Drawing helpers ---

    /**
     * Calculates the local offset vector for 3D depth effect.
     * Optimized to avoid object allocation.
     * @param {number} depth - The depth magnitude (pixels)
     * @param {number} extraRotation - Additional rotation applied to the context
     * @returns {{x: number, y: number}} The local offset vector
     * @private
     */
    _getDepthVector(depth, extraRotation = 0) {
        const theta = this.angle + extraRotation;
        // v = (0, depth) rotated by -theta
        // x = depth * sin(theta)
        // y = depth * cos(theta)
        return {
            x: depth * Math.sin(theta),
            y: depth * Math.cos(theta)
        };
    }

    /**
     * Draws a 3D-style prism (extruded polygon).
     * Optimized to avoid array allocations.
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} r - Radius
     * @param {number} sides - Number of sides
     * @param {number} depth - Depth (thickness)
     * @param {p5.Color} col - Base color
     * @param {number} extraRotation - Additional rotation applied to the context
     * @private
     */
    _drawPrism(x, y, r, sides, depth, col, extraRotation = 0) {
        const dv = this._getDepthVector(depth, extraRotation);
        const angleStep = TWO_PI / sides;
        const lightAngle = (this._localSunAngle || 0) - extraRotation;
        
        strokeWeight(1);
        
        // Draw Bottom Cap
        fill(red(col)*0.5, green(col)*0.5, blue(col)*0.5);
        stroke(red(col)*0.4, green(col)*0.4, blue(col)*0.4);
        beginShape();
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep - PI/2;
            vertex(x + Math.cos(ang) * r + dv.x, y + Math.sin(ang) * r + dv.y);
        }
        endShape(CLOSE);

        // Draw sides
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep - PI/2;
            const nextAng = (i + 1) * angleStep - PI/2;
            
            // Face normal angle
            const faceAngle = (i + 0.5) * angleStep - PI/2;
            
            // Back-face culling
            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;
            
            if (dot > 0.001) {
                const vx = x + Math.cos(ang) * r;
                const vy = y + Math.sin(ang) * r;
                const nvx = x + Math.cos(nextAng) * r;
                const nvy = y + Math.sin(nextAng) * r;
                
                const diff = faceAngle - lightAngle;
                const b = map(Math.cos(diff), -1, 1, 0.4, 0.9);
                
                fill(red(col)*b, green(col)*b, blue(col)*b);
                stroke(red(col)*b*0.8, green(col)*b*0.8, blue(col)*b*0.8);

                beginShape();
                vertex(vx + dv.x, vy + dv.y);
                vertex(nvx + dv.x, nvy + dv.y);
                vertex(nvx, nvy);
                vertex(vx, vy);
                endShape(CLOSE);
            }
        }

        // Draw Top
        fill(col);
        stroke(red(col)*0.8, green(col)*0.8, blue(col)*0.8);
        beginShape();
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep - PI/2;
            vertex(x + Math.cos(ang) * r, y + Math.sin(ang) * r);
        }
        endShape(CLOSE);
    }

    /**
     * Draws a 3D-style box.
     * Optimized to avoid array allocations.
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {number} depth - Depth (thickness)
     * @param {p5.Color} col - Base color
     * @param {number} extraRotation - Additional rotation applied to the context
     * @private
     */
    _drawBox3D(x, y, w, h, depth, col, extraRotation = 0) {
        const dv = this._getDepthVector(depth, extraRotation);
        const hw = w/2;
        const hh = h/2;
        
        const faceAngles = [-PI/2, 0, PI/2, PI]; 
        const lightAngle = (this._localSunAngle || 0) - extraRotation;
        
        strokeWeight(1);

        // Draw Bottom Cap
        fill(red(col)*0.5, green(col)*0.5, blue(col)*0.5);
        stroke(red(col)*0.4, green(col)*0.4, blue(col)*0.4);
        beginShape();
        vertex(x - hw + dv.x, y - hh + dv.y);
        vertex(x + hw + dv.x, y - hh + dv.y);
        vertex(x + hw + dv.x, y + hh + dv.y);
        vertex(x - hw + dv.x, y + hh + dv.y);
        endShape(CLOSE);

        for (let i = 0; i < 4; i++) {
            // Back-face culling
            const nx = Math.cos(faceAngles[i]);
            const ny = Math.sin(faceAngles[i]);
            const dot = nx * dv.x + ny * dv.y;

            if (dot > 0.001) {
                const diff = faceAngles[i] - lightAngle;
                const b = map(Math.cos(diff), -1, 1, 0.4, 0.9);
                
                fill(red(col)*b, green(col)*b, blue(col)*b);
                stroke(red(col)*b*0.8, green(col)*b*0.8, blue(col)*b*0.8);

                beginShape();
                let x1, y1, x2, y2;
                if (i === 0) { // Top: TL -> TR
                    x1 = x - hw; y1 = y - hh; x2 = x + hw; y2 = y - hh;
                } else if (i === 1) { // Right: TR -> BR
                    x1 = x + hw; y1 = y - hh; x2 = x + hw; y2 = y + hh;
                } else if (i === 2) { // Bottom: BR -> BL
                    x1 = x + hw; y1 = y + hh; x2 = x - hw; y2 = y + hh;
                } else { // Left: BL -> TL
                    x1 = x - hw; y1 = y + hh; x2 = x - hw; y2 = y - hh;
                }
                
                vertex(x1 + dv.x, y1 + dv.y);
                vertex(x2 + dv.x, y2 + dv.y);
                vertex(x2, y2);
                vertex(x1, y1);
                endShape(CLOSE);
            }
        }
        
        fill(col);
        stroke(red(col)*0.8, green(col)*0.8, blue(col)*0.8);
        rectMode(CENTER);
        rect(x, y, w, h);
    }

    /**
     * Draws an extruded custom shape.
     * Optimized.
     * @param {Array<{x:number, y:number}>} vertices - Array of vertices
     * @param {number} depth - Depth (thickness)
     * @param {p5.Color} col - Base color
     * @param {number} extraRotation - Additional rotation applied to the context
     * @param {boolean} cull - Whether to enable back-face culling (default: true)
     * @private
     */
    _drawExtrudedShape(vertices, depth, col, extraRotation = 0, cull = true) {
        const dv = this._getDepthVector(depth, extraRotation);
        const lightAngle = (this._localSunAngle || 0) - extraRotation;
        
        strokeWeight(1);
        const len = vertices.length;

        // Draw Bottom Cap
        fill(red(col)*0.5, green(col)*0.5, blue(col)*0.5);
        stroke(red(col)*0.4, green(col)*0.4, blue(col)*0.4);
        beginShape();
        for (let i = 0; i < len; i++) {
            vertex(vertices[i].x + dv.x, vertices[i].y + dv.y);
        }
        endShape(CLOSE);
        
        for (let i = 0; i < len; i++) {
            const next = (i + 1) % len;
            const v1 = vertices[i];
            const v2 = vertices[next];

            // Calculate normal angle
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            // Normal is (-dy, dx)
            const faceAngle = Math.atan2(dx, -dy);
            
            // Back-face culling
            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;

            if (!cull || dot > 0.001) {
                const diff = faceAngle - lightAngle;
                const b = map(Math.cos(diff), -1, 1, 0.4, 0.9);
                
                fill(red(col)*b, green(col)*b, blue(col)*b);
                stroke(red(col)*b*0.8, green(col)*b*0.8, blue(col)*b*0.8);

                beginShape();
                vertex(v1.x + dv.x, v1.y + dv.y);
                vertex(v2.x + dv.x, v2.y + dv.y);
                vertex(v2.x, v2.y);
                vertex(v1.x, v1.y);
                endShape(CLOSE);
            }
        }
        
        // Top
        fill(col);
        stroke(red(col)*0.8, green(col)*0.8, blue(col)*0.8);
        beginShape();
        for (let i = 0; i < len; i++) {
            vertex(vertices[i].x, vertices[i].y);
        }
        endShape(CLOSE);
    }

    /**
     * Draws a 3D-style ring (extruded annulus).
     * Optimized.
     * @param {number} x - Center X
     * @param {number} y - Center Y
     * @param {number} rOuter - Outer Radius
     * @param {number} rInner - Inner Radius
     * @param {number} sides - Number of segments
     * @param {number} depth - Depth (thickness)
     * @param {p5.Color} col - Base color
     * @param {number} extraRotation - Additional rotation applied to the context
     * @private
     */
    _drawRing3D(x, y, rOuter, rInner, sides, depth, col, extraRotation = 0) {
        const dv = this._getDepthVector(depth, extraRotation);
        const angleStep = TWO_PI / sides;
        const lightAngle = (this._localSunAngle || 0) - extraRotation;
        
        strokeWeight(1);

        // Draw Bottom Cap
        fill(red(col)*0.5, green(col)*0.5, blue(col)*0.5);
        stroke(red(col)*0.4, green(col)*0.4, blue(col)*0.4);
        beginShape();
        // Outer loop
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep;
            vertex(x + Math.cos(ang) * rOuter + dv.x, y + Math.sin(ang) * rOuter + dv.y);
        }
        // Inner loop (contour)
        beginContour();
        for (let i = sides - 1; i >= 0; i--) {
            const ang = i * angleStep;
            vertex(x + Math.cos(ang) * rInner + dv.x, y + Math.sin(ang) * rInner + dv.y);
        }
        endContour();
        endShape(CLOSE);
        
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep;
            const nextAng = (i + 1) * angleStep;
            
            const c = Math.cos(ang);
            const s = Math.sin(ang);
            const nc = Math.cos(nextAng);
            const ns = Math.sin(nextAng);
            
            const ox1 = x + c * rOuter;
            const oy1 = y + s * rOuter;
            const ox2 = x + nc * rOuter;
            const oy2 = y + ns * rOuter;
            
            const ix1 = x + c * rInner;
            const iy1 = y + s * rInner;
            const ix2 = x + nc * rInner;
            const iy2 = y + ns * rInner;
            
            // Outer face
            const faceAngle = (i + 0.5) * angleStep;
            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;

            if (dot > 0.001) {
                const diff = faceAngle - lightAngle;
                const b = map(Math.cos(diff), -1, 1, 0.4, 0.9);
                
                fill(red(col)*b, green(col)*b, blue(col)*b);
                stroke(red(col)*b*0.8, green(col)*b*0.8, blue(col)*b*0.8);

                beginShape();
                vertex(ox1 + dv.x, oy1 + dv.y);
                vertex(ox2 + dv.x, oy2 + dv.y);
                vertex(ox2, oy2);
                vertex(ox1, oy1);
                endShape(CLOSE);
            }
            
            // Inner face
            const innerFaceAngle = faceAngle + PI;
            const nxIn = Math.cos(innerFaceAngle);
            const nyIn = Math.sin(innerFaceAngle);
            const dotIn = nxIn * dv.x + nyIn * dv.y;

            if (dotIn > 0.001) {
                const diffInner = innerFaceAngle - lightAngle;
                const bInner = map(Math.cos(diffInner), -1, 1, 0.4, 0.9);
                
                fill(red(col)*bInner, green(col)*bInner, blue(col)*bInner);
                stroke(red(col)*bInner*0.8, green(col)*bInner*0.8, blue(col)*bInner*0.8);

                beginShape();
                vertex(ix1 + dv.x, iy1 + dv.y);
                vertex(ix2 + dv.x, iy2 + dv.y);
                vertex(ix2, iy2);
                vertex(ix1, iy1);
                endShape(CLOSE);
            }
        }
        
        // Top
        fill(col);
        stroke(red(col)*0.8, green(col)*0.8, blue(col)*0.8);
        beginShape();
        // Outer loop
        for (let i = 0; i < sides; i++) {
            const ang = i * angleStep;
            vertex(x + Math.cos(ang) * rOuter, y + Math.sin(ang) * rOuter);
        }
        // Inner loop (contour)
        beginContour();
        for (let i = sides - 1; i >= 0; i--) {
            const ang = i * angleStep;
            vertex(x + Math.cos(ang) * rInner, y + Math.sin(ang) * rInner);
        }
        endContour();
        endShape(CLOSE);
    }

    /**
     * Draws a 3D-style extruded ring defined by arbitrary outer and inner vertices.
     * @param {Array<{x:number, y:number}>} outerVerts - Outer vertices
     * @param {Array<{x:number, y:number}>} innerVerts - Inner vertices (must match length of outer)
     * @param {number} depth - Depth
     * @param {p5.Color} col - Color
     * @param {number} extraRotation - Extra rotation
     * @private
     */
    _drawExtrudedRing(outerVerts, innerVerts, depth, col, extraRotation = 0) {
        const dv = this._getDepthVector(depth, extraRotation);
        const lightAngle = (this._localSunAngle || 0) - extraRotation;
        strokeWeight(1);
        
        const len = outerVerts.length;

        // Draw Bottom Cap
        fill(red(col)*0.5, green(col)*0.5, blue(col)*0.5);
        stroke(red(col)*0.4, green(col)*0.4, blue(col)*0.4);
        beginShape();
        for (let v of outerVerts) vertex(v.x + dv.x, v.y + dv.y);
        beginContour();
        for (let i = len - 1; i >= 0; i--) {
            vertex(innerVerts[i].x + dv.x, innerVerts[i].y + dv.y);
        }
        endContour();
        endShape(CLOSE);
        
        // Draw sides
        for (let i = 0; i < len; i++) {
            const next = (i + 1) % len;
            
            // Outer face
            const v1 = outerVerts[i];
            const v2 = outerVerts[next];
            const dx = v2.x - v1.x;
            const dy = v2.y - v1.y;
            const faceAngle = Math.atan2(dx, -dy);
            
            const nx = Math.cos(faceAngle);
            const ny = Math.sin(faceAngle);
            const dot = nx * dv.x + ny * dv.y;
            
            if (dot > 0.001) {
                const diff = faceAngle - lightAngle;
                const b = map(Math.cos(diff), -1, 1, 0.4, 0.9);
                fill(red(col)*b, green(col)*b, blue(col)*b);
                stroke(red(col)*b*0.8, green(col)*b*0.8, blue(col)*b*0.8);
                beginShape();
                vertex(v1.x + dv.x, v1.y + dv.y);
                vertex(v2.x + dv.x, v2.y + dv.y);
                vertex(v2.x, v2.y);
                vertex(v1.x, v1.y);
                endShape(CLOSE);
            }
            
            // Inner face
            const iv1 = innerVerts[i];
            const iv2 = innerVerts[next];
            const idx = iv2.x - iv1.x;
            const idy = iv2.y - iv1.y;
            const innerFaceAngle = Math.atan2(idx, -idy) + PI;
            
            const inx = Math.cos(innerFaceAngle);
            const iny = Math.sin(innerFaceAngle);
            const idot = inx * dv.x + iny * dv.y;
            
            if (idot > 0.001) {
                const diff = innerFaceAngle - lightAngle;
                const b = map(Math.cos(diff), -1, 1, 0.4, 0.9);
                fill(red(col)*b, green(col)*b, blue(col)*b);
                stroke(red(col)*b*0.8, green(col)*b*0.8, blue(col)*b*0.8);
                beginShape();
                vertex(iv1.x + dv.x, iv1.y + dv.y);
                vertex(iv2.x + dv.x, iv2.y + dv.y);
                vertex(iv2.x, iv2.y);
                vertex(iv1.x, iv1.y);
                endShape(CLOSE);
            }
        }
        
        // Top cap
        fill(col);
        stroke(red(col)*0.8, green(col)*0.8, blue(col)*0.8);
        beginShape();
        for (let v of outerVerts) vertex(v.x, v.y);
        beginContour();
        for (let i = len - 1; i >= 0; i--) {
            vertex(innerVerts[i].x, innerVerts[i].y);
        }
        endContour();
        endShape(CLOSE);
    }

    /**
     * Draws the central hub of the station.
     * @private
     */
    _drawCentralHub() {
        // Main hub structure - 3D Prism
        this._drawPrism(0, 0, this.size * 0.125, 8, 20, color(100, 100, 120));
        
        // Hub details - airlock/docking ports
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * PI / 4);
            this._drawBox3D(-5, -this.size * 0.13, 10, 5, 5, color(60, 60, 80), i * PI / 4);
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
            
            // Main arm structure - Extruded Shape
            const armVerts = [
                {x: -this.size * 0.08, y: 0},
                {x: -this.size * 0.04, y: -this.size * 0.45},
                {x: this.size * 0.04, y: -this.size * 0.45},
                {x: this.size * 0.08, y: 0}
            ];
            this._drawExtrudedShape(armVerts, 15, color(150, 150, 170), i * PI / 2, false);
            
            // Structural reinforcements along arm
            stroke(100, 100, 120);
            for (let j = 1; j < 5; j++) {
                let y = -j * this.size * 0.09;
                line(-this.size * 0.07 + j*0.005, y, this.size * 0.07 - j*0.005, y);
            }
            
            // Connection to outer ring
            // Original: rect(-this.size * 0.06, -this.size * 0.47, this.size * 0.12, this.size * 0.04, 3);
            // Center: (0, -0.45)
            this._drawBox3D(0, -this.size * 0.45, this.size * 0.12, this.size * 0.04, 15, color(120, 120, 140), i * PI / 2);

            // Draw station name on the last arm for identification (skip for military/alien)
            if (i === 3 && this.stationType !== 'military' && this.stationType !== 'alien') {
                push();
                // position the text along the arm (between hub and outer ring)
                translate(0, -this.size * 0.22);
                // rotate the text to line up with the arm (90 degrees)
                rotate(-PI/2);
                // Use global font if available so the name matches the UI
                if (typeof font !== 'undefined' && font) {
                    try { textFont(font); } catch (e) {}
                }
                textStyle(NORMAL);
                textAlign(CENTER, CENTER);
                const ts = constrain(this.size * 0.045, 10, 26);
                textSize(ts);
                noStroke();
                // subtle drop shadow
                fill(10, 10, 20, 200);
                text(this.name, 2, 2);
                // bright main text
                fill(240, 240, 220);
                text(this.name, 0, 0);
                pop();
            }

            // Draw a small station-specific slogan on the second arm (i === 1).
            // Skip for heavily stylized stations like military/alien.
            if (i === 1 && this.stationType !== 'military' && this.stationType !== 'alien') {
                const slogan = this._getStationSlogan();
                if (slogan) {
                    push();
                    translate(0, -this.size * 0.22);
                    rotate(-PI/2);
                    if (typeof font !== 'undefined' && font) {
                        try { textFont(font); } catch (e) {}
                    }
                    textStyle(NORMAL);
                    textAlign(CENTER, CENTER);
                    const ts2 = constrain(this.size * 0.03, 8, 18);
                    textSize(ts2);
                    noStroke();
                    fill(0);
                    text(slogan, 0, 0);
                    pop();
                }
            }


            
            pop();
        }
    }

    /**
     * Returns a short, station-specific slogan for rendering on the second arm.
     * @private
     */
    _getStationSlogan() {
        const map = {
            separatist: 'Freedom for All',
            industrial: 'Powering Industry',
            mining: 'Ore For All',
            tourism: 'Dreams Above',
            agricultural: 'The Conquest of Bread',
            refinery: 'Fuel the Future',
            posthuman: 'More than Flesh',
            imperial: 'The Emperor Commands',
            service: 'Cheap labour available',
            standard: 'Welcome Aboard'
        };
        return map[this.stationType] || '';
    }

    /**
     * Draws the inner and outer rings of the station.
     * @private
     */
    _drawRings() {
        // Draw a solid ring structure
        // Outer radius: 0.475, Inner radius: 0.45
        this._drawRing3D(0, 0, this.size * 0.475, this.size * 0.45, 24, 15, color(200, 200, 220));
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
            // Uneven spacing for more asymmetrical appearance
            const baseAngle = i * TWO_PI / 16 + sin(i * 0.8) * 0.08 + (i % 3 === 0 ? sin(i * 1.3) * 0.04 : 0);
            rotate(baseAngle);

            const outerY = -this.size * 0.48;
            if (i % 4 === 0) {
                // Reinforced docking bay with curved canopy
                push();
                translate(0, outerY + this.size * 0.01);
                
                // base platform
                this._drawBox3D(0, -this.size * 0.02, this.size * 0.11, this.size * 0.05, 15, color(200, 200, 200), baseAngle);
                
                // curved canopy
                // Approximate ellipse with 8 vertices
                const canopyVerts = [];
                const cw = this.size * 0.045; // half width
                const ch = this.size * 0.02; // half height
                for(let k=0; k<8; k++) {
                    const ang = k * TWO_PI / 8;
                    canopyVerts.push({x: cos(ang)*cw, y: -this.size * 0.005 + sin(ang)*ch});
                }
                this._drawExtrudedShape(canopyVerts, 5, color(50, 50, 50), baseAngle);

                // subtle stripe - 3D
                this._drawBox3D(0, -this.size * 0.006, this.size * 0.04, this.size * 0.008, 6, color(200, 95, 10), baseAngle);
                pop();
            } else {
                // Sleek habitation pod
                push();
                translate(0, outerY);
                rotate(-0.06 + (i % 3) * 0.02);
                
                // pod body - extruded
                const podVerts = [
                    {x: -this.size * 0.045, y: -this.size * 0.01},
                    {x: -this.size * 0.03, y: -this.size * 0.035},
                    {x: this.size * 0.03, y: -this.size * 0.035},
                    {x: this.size * 0.045, y: -this.size * 0.01},
                    {x: this.size * 0.03, y: this.size * 0.02},
                    {x: -this.size * 0.03, y: this.size * 0.02}
                ];
                this._drawExtrudedShape(podVerts, 10, color(100, 100, 100), baseAngle - 0.06 + (i % 3) * 0.02);

                // glowing window stripe - 3D
                const winCol = color(255, 230, 140, 140 + sin(this.lightTimer*2 + i) * 60);
                this._drawBox3D(-this.size * 0.02 + this.size * 0.02, -this.size * 0.008, this.size * 0.04, this.size * 0.008, 2, winCol, baseAngle - 0.06 + (i % 3) * 0.02);
                pop();
            }

            // small accent light to tie into running-lights rhythm - 3D
            const lightCol = color(255, 200, 120, 160 + sin(this.lightTimer*2 + i) * 80);
            this._drawPrism(0, -this.size * 0.475, 1.6, 6, 2, lightCol, baseAngle);

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
        // Center: (0, -0.45)
        this._drawBox3D(0, -this.size * 0.45, this.size * 0.12, this.size * 0.06, 20, color(80, 80, 100), index * TWO_PI / 16);
        
        // Docking bay lighting (alternating red/green) - 3D
        const lightCol = sin(this.lightTimer*2 + index) > 0 ? color(0, 200, 0) : color(200, 0, 0);
        this._drawBox3D(0, -this.size * 0.45, this.size * 0.06, this.size * 0.02, 2, lightCol, index * TWO_PI / 16);
    }

    /**
     * Draws a residential module with animated windows.
     * @param {number} index - Module index for animation timing
     * @private
     */
    _drawResidentialModule(index) {
        // Regular habitation modules
        // Center: (0, -0.45)
        this._drawBox3D(0, -this.size * 0.45, this.size * 0.08, this.size * 0.04, 15, this.color, index * TWO_PI / 16);
        
        // Windows with subtle animation - 3D
        const winCol = color(200, 200, 100, 150 + sin(this.lightTimer + index)*50);
        for (let w = 0; w < 3; w++) {
            this._drawBox3D(-this.size * 0.03 + w * this.size * 0.03, -this.size * 0.45, this.size * 0.02, this.size * 0.01, 2, winCol, index * TWO_PI / 16);
        }
    }

    /**
     * Draws a single solar panel with optional grid lines.
     * @param {p5.Color} panelColor - The color of the solar panel
     * @param {p5.Color} mountColor - The color of the panel mount
     * @param {p5.Color} gridColor - The color of the grid lines
     * @param {number} extraRotation - Additional rotation applied to the context
     * @private
     */
    _drawSingleSolarPanel(panelColor, mountColor, gridColor, extraRotation = 0) {
        // Panel mount
        this._drawBox3D(0, this.size * 0.14, this.size * 0.04, this.size * 0.04, 10, mountColor, extraRotation);
        
        // Panel
        this._drawBox3D(0, this.size * 0.21, this.size * 0.3, this.size * 0.1, 5, panelColor, extraRotation);
        
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
        const bodyCol = color(220);
        this._drawBox3D(0, s * 0.4, s * 0.66, s * 1.0, s * 0.3, bodyCol, 0);

        // backpack
        const packCol = color(190);
        this._drawBox3D(-s * 0.34, s * 0.25, s * 0.22, s * 0.6, s * 0.2, packCol, 0);

        // helmet
        const helmetCol = color(245);
        this._drawPrism(0, -s * 0.6, s * 0.45, 8, s * 0.4, helmetCol, 0);
        
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
        const bodyVerts = [
            {x: -s * 0.9, y: s * 0.2},
            {x: s * 0.9, y: s * 0.0},
            {x: -s * 0.9, y: -s * 0.2}
        ];
        this._drawExtrudedShape(bodyVerts, s * 0.2, color(200), 0);

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
        const col = color(150, 110, 70);
        this._drawBox3D(0, 0, s, s, s * 0.5, col, 0);
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
        const col = color(140);
        this._drawBox3D(0, -this.size*0.03, this.size*0.02, this.size*0.06, this.size*0.02, col, 0);
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
        const col = color(160,120,80);
        this._drawBox3D(0, 0, this.size*0.04, this.size*0.04, this.size*0.02, col, 0);
        pop();
    }

    _drawMiniCommsArray(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const col = color(120);
        this._drawBox3D(0, 0, this.size*0.04, this.size*0.06, this.size*0.01, col, 0);
        pop();
    }

    _drawSolarArraySpinner(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const rot = this.lightTimer * 0.05 * this.animSpeed + this.animationOffset*0.1;
        rotate(rot);
        const col = color(30,60,120);
        this._drawBox3D(0, 0, this.size*0.12, this.size*0.02, this.size*0.005, col, rot);
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

    // --- New lightweight decorations (low CPU) ---
    _drawGlint(x = 0, y = 0, scale = 1, hueShift = 0) {
        push(); translate(x, y);
        noStroke();
        const pulse = 0.6 + 0.4 * sin(this.lightTimer * 2 + this.animationOffset);
        const s = this.size * 0.02 * scale * pulse;
        fill(255, 255, 220, 80 + 80 * pulse);
        ellipse(0, 0, s * 1.6, s * 0.9);
        // small sharp highlight
        fill(255, 255, 255, 180);
        ellipse(s * 0.18, -s * 0.08, s * 0.25, s * 0.12);
        pop();
    }

    _drawOrbitingCubes(count = 3, radius = 0.34, scale = 0.6) {
        // Very small number of cubes orbiting, cheap to draw
        for (let i = 0; i < count; i++) {
            push();
            const ang = this.lightTimer * 0.12 + i * TWO_PI / count;
            rotate(ang);
            translate(0, -this.size * radius + sin(this.lightTimer * 0.9 + i) * 3);
            push();
            const s = this.size * 0.02 * scale;
            const rot = ang * 2 + i;
            rotate(rot);
            const col = color(160, 140, 120);
            this._drawBox3D(0, 0, s, s, s * 0.6, col, rot);
            pop();
            pop();
        }
    }

    _drawPulsingBeacon(x = 0, y = 0, scale = 1, c = null) {
        push(); translate(x, y);
        noFill();
        const pulse = 0.6 + 0.4 * sin(this.lightTimer * 3 + this.animationOffset);
        const base = this.size * 0.03 * scale;
        const col = c || color(255, 200, 120);
        stroke(red(col), green(col), blue(col), 40 + 80 * pulse);
        strokeWeight(2);
        ellipse(0, 0, base * (1 + pulse * 1.6), base * (1 + pulse * 0.9));
        // central core
        noStroke();
        fill(red(col), green(col), blue(col), 120 + 80 * pulse);
        ellipse(0, 0, base * 0.4, base * 0.4);
        pop();
    }

    _drawRotatingGlyphs(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        noFill(); stroke(180, 220, 255, 90);
        strokeWeight(1);
        const r = this.size * 0.06 * scale;
        rotate(this.lightTimer * 0.06 + this.animationOffset * 0.2);
        for (let i = 0; i < 6; i++) {
            push(); rotate(i * TWO_PI / 6 + i * 0.03);
            line(r * 0.2, 0, r * 0.9, 0);
            pop();
        }
        pop();
    }

    _drawCometTrail(angleOffset = 0, radius = 0.5) {
        // Subtle comet: single head with a short faded-dot tail along the ring
        push();
        const ang = this.lightTimer * 0.12 + angleOffset;
        // compute head position on ring
        const rx = cos(ang) * this.size * radius;
        const ry = sin(ang) * this.size * radius;
        // draw short tail of small faded dots behind the head
        const tailLen = 4;
        for (let t = 0; t < tailLen; t++) {
            const f = t / tailLen; // 0..1 further back
            const a = lerp(160, 20, f); // alpha fades
            const s = lerp(this.size * 0.018, this.size * 0.006, f);
            // position slightly further along the ring for tail
            const ta = ang - f * 0.12;
            const tx = cos(ta) * this.size * radius;
            const ty = sin(ta) * this.size * radius;
            noStroke();
            fill(255, 220, 160, a);
            ellipse(tx, ty, s, s * 0.6);
        }
        // head
        noStroke();
        fill(255, 230, 180, 220);
        ellipse(rx, ry, this.size * 0.02, this.size * 0.01);
        pop();
    }

    _drawOrbitalGlow(alpha = 30) {
        push();
        noStroke();
        fill(200, 220, 255, alpha);
        const r = this.size * 0.55;
        ellipse(0, 0, r, r * 0.42);
        pop();
    }

    _drawFloatBanner(x = 0, y = 0, textScale = 1) {
        push(); translate(x, y);
        noStroke(); fill(220,160,60,120);
        rect(-this.size*0.04, -this.size*0.02, this.size*0.08, this.size*0.03, 3);
        pop();
    }

    // --- Tourism-specific attractions ---
    _drawFerrisWheel(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.08 * scale;
        // Central hub
        fill(200, 200, 200);
        stroke(100, 100, 100);
        ellipse(0, 0, s * 0.3, s * 0.3);
        // Rotating wheel
        rotate(this.lightTimer * 0.1 + this.animationOffset * 0.2);
        noFill();
        stroke(150, 150, 150);
        ellipse(0, 0, s * 2, s * 2);
        // Spokes and cabins
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * TWO_PI / 8);
            stroke(120, 120, 120);
            line(0, 0, 0, s);
            // Cabin
            fill(255, 200, 100, 180);
            noStroke();
            ellipse(0, s, s * 0.25, s * 0.15);
            pop();
        }
        pop();
    }

    _drawCarousel(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.06 * scale;
        // Base
        fill(180, 120, 80);
        stroke(100, 80, 60);
        ellipse(0, 0, s * 0.4, s * 0.4);
        // Rotating platform
        rotate(this.lightTimer * 0.15 + this.animationOffset * 0.3);
        noFill();
        stroke(200, 150, 100);
        ellipse(0, 0, s * 1.8, s * 1.8);
        // Horses
        for (let i = 0; i < 6; i++) {
            push();
            rotate(i * TWO_PI / 6);
            translate(0, s * 0.9);
            // Simple horse shape
            fill(255, 220, 180);
            noStroke();
            ellipse(0, 0, s * 0.2, s * 0.15);
            // Pole
            stroke(150, 100, 50);
            line(0, s * 0.075, 0, s * 0.3);
            pop();
        }
        pop();
    }

    _drawSpaceSlide(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.05 * scale;
        // Slide structure
        fill(100, 200, 255, 150);
        stroke(50, 150, 200);
        strokeWeight(2);
        beginShape();
        vertex(-s * 0.5, -s * 0.2);
        bezierVertex(-s * 0.3, -s * 0.5, s * 0.3, -s * 0.5, s * 0.5, -s * 0.2);
        vertex(s * 0.5, s * 0.2);
        vertex(-s * 0.5, s * 0.2);
        endShape(CLOSE);
        // Slide path
        noFill();
        stroke(255, 255, 255, 200);
        strokeWeight(3);
        bezier(-s * 0.4, -s * 0.1, -s * 0.2, -s * 0.4, s * 0.2, -s * 0.4, s * 0.4, -s * 0.1);
        // Sliding figure
        const slidePos = (sin(this.lightTimer * 0.8 + this.animationOffset) + 1) * 0.5; // 0 to 1
        const slideX = lerp(-s * 0.4, s * 0.4, slidePos);
        const slideY = bezierPoint(-s * 0.1, -s * 0.4, -s * 0.4, -s * 0.1, slidePos);
        fill(255, 100, 100);
        noStroke();
        ellipse(slideX, slideY, s * 0.1, s * 0.1);
        pop();
    }

    _drawRollerCoasterTrack(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.04 * scale;
        noFill();
        stroke(200, 200, 200);
        strokeWeight(2);
        // Track loop
        beginShape();
        for (let i = 0; i <= 20; i++) {
            const angle = i * TWO_PI / 20;
            const radius = s * (1 + 0.3 * sin(angle * 2));
            vertex(cos(angle) * radius, sin(angle) * radius);
        }
        endShape();
        // Supports
        stroke(150, 150, 150);
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2);
            line(0, 0, 0, s * 1.5);
            pop();
        }
        // Moving cart
        const cartAngle = this.lightTimer * 0.2 + this.animationOffset;
        const cartRadius = s * (1 + 0.3 * sin(cartAngle * 2));
        const cartX = cos(cartAngle) * cartRadius;
        const cartY = sin(cartAngle) * cartRadius;
        fill(255, 0, 0);
        noStroke();
        ellipse(cartX, cartY, s * 0.15, s * 0.1);
        pop();
    }

    _drawObservationDeck(x = 0, y = 0, scale = 1) {
        push(); translate(x, y);
        const s = this.size * 0.06 * scale;
        // Deck platform
        fill(180, 180, 200, 150);
        stroke(120, 120, 140);
        ellipse(0, 0, s * 1.5, s * 0.8);
        // Windows
        fill(100, 150, 200, 120);
        noStroke();
        for (let i = 0; i < 6; i++) {
            push();
            rotate(i * TWO_PI / 6);
            ellipse(0, s * 0.3, s * 0.2, s * 0.15);
            pop();
        }
        // Telescope
        stroke(100, 100, 100);
        line(0, -s * 0.2, 0, -s * 0.5);
        fill(50, 50, 50);
        ellipse(0, -s * 0.5, s * 0.1, s * 0.1);
        pop();
    }

    // --- Walker robot for stations (non-military) ---
    _drawWalkerRobot(x = 0, y = 0, scale = 1, style = 0) {
        push(); translate(x, y);
        const s = this.size * 0.015 * scale;
        
        switch (style % 4) {
            case 0: // Boxy maintenance bot
                // Main body
                this._drawBox3D(0, 0, s * 1.2, s * 1.2, s * 0.6, color(120, 120, 120), 0);
                // Head
                this._drawBox3D(0, -s * 0.65, s * 0.8, s * 0.3, s * 0.4, color(100, 100, 100), 0);
                // Eyes (flat)
                fill(0, 255, 0, 200); noStroke();
                ellipse(-s * 0.2, -s * 0.7, s * 0.15, s * 0.15);
                ellipse(s * 0.2, -s * 0.7, s * 0.15, s * 0.15);
                // Feet/Tracks
                this._drawBox3D(0, s * 0.5, s * 1.4, s * 0.2, s * 0.7, color(80, 80, 80), 0);
                // Antenna
                stroke(150, 150, 150);
                line(0, -s * 0.8, 0, -s * 1.1);
                fill(255, 255, 0, 180); noStroke();
                ellipse(0, -s * 1.1, s * 0.1, s * 0.1);
                break;
                
            case 1: // Tall utility bot
                // Body
                this._drawBox3D(0, 0, s * 0.8, s * 1.6, s * 0.5, color(110, 110, 130), 0);
                // Head
                this._drawBox3D(0, -s * 0.85, s * 0.6, s * 0.3, s * 0.4, color(90, 90, 110), 0);
                // Eye
                fill(255, 100, 100, 200); noStroke();
                ellipse(0, -s * 0.9, s * 0.12, s * 0.12);
                // Base
                this._drawBox3D(0, s * 0.675, s, s * 0.15, s * 0.6, color(60, 60, 80), 0);
                // Antenna
                stroke(130, 130, 150);
                line(0, -s * 1.0, 0, -s * 1.3);
                fill(100, 200, 255, 180); noStroke();
                ellipse(0, -s * 1.3, s * 0.08, s * 0.08);
                break;
                
            case 2: // Wide cargo bot
                // Body
                this._drawBox3D(0, 0, s * 1.6, s, s * 0.8, color(130, 120, 100), 0);
                // Head
                this._drawBox3D(0, -s * 0.55, s * 1.2, s * 0.3, s * 0.6, color(110, 100, 80), 0);
                // Eyes
                fill(255, 255, 100, 200); noStroke();
                ellipse(-s * 0.3, -s * 0.6, s * 0.1, s * 0.1);
                ellipse(s * 0.3, -s * 0.6, s * 0.1, s * 0.1);
                // Base
                this._drawBox3D(0, s * 0.425, s * 1.8, s * 0.25, s * 0.9, color(70, 60, 50), 0);
                // Antenna
                stroke(120, 110, 90);
                line(0, -s * 0.7, 0, -s * 0.9);
                fill(255, 150, 0, 180); noStroke();
                ellipse(0, -s * 0.9, s * 0.12, s * 0.12);
                break;
                
            case 3: // Compact repair bot
                // Body
                this._drawBox3D(0, 0, s, s, s * 0.5, color(100, 120, 140), 0);
                // Head
                this._drawBox3D(0, -s * 0.575, s * 0.7, s * 0.25, s * 0.4, color(80, 100, 120), 0);
                // Eye
                fill(0, 255, 255, 200); noStroke();
                ellipse(0, -s * 0.6, s * 0.14, s * 0.14);
                // Base
                this._drawBox3D(0, s * 0.39, s * 1.2, s * 0.18, s * 0.6, color(50, 70, 90), 0);
                // Antennas
                stroke(90, 110, 130);
                line(-s * 0.2, -s * 0.7, -s * 0.2, -s * 0.9);
                line(s * 0.2, -s * 0.7, s * 0.2, -s * 0.9);
                fill(255, 0, 255, 180); noStroke();
                ellipse(-s * 0.2, -s * 0.9, s * 0.06, s * 0.06);
                ellipse(s * 0.2, -s * 0.9, s * 0.06, s * 0.06);
                break;
        }
        
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
            this._drawSingleSolarPanel(color(20, 30, 100), color(120, 120, 140), color(150, 150, 170), i * PI + PI/4);
            pop();
        }
        // Extra panels for separatist (if any)
        for (let angle of extraAngles) {
            push();
            rotate(angle);
            this._drawSingleSolarPanel(color(20, 30, 100), color(120, 120, 140), color(150, 150, 170), angle);
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
                // 3D light - small cylinder
                this._drawPrism(0, -this.size * radius, size/2, 6, 2, c, i * TWO_PI / count);
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
        // Use 32 sides to match light count and align better with 16 modules
        this._drawRing3D(0, 0, this.size * 0.475, this.size * 0.45, 32, 15, color(200, 200, 220));
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
        // Main hub structure - armored (12 sides)
        this._drawPrism(0, 0, this.size * 0.14, 12, 25, color(80, 90, 100));
        
        // Additional armor plates
        for (let i = 0; i < 8; i++) {
            push();
            rotate(i * PI / 4);
            const plateVerts = [
                {x: -this.size * 0.09, y: -this.size * 0.06},
                {x: -this.size * 0.04, y: -this.size * 0.14},
                {x: this.size * 0.04, y: -this.size * 0.14},
                {x: this.size * 0.09, y: -this.size * 0.06}
            ];
            this._drawExtrudedShape(plateVerts, 10, color(60, 70, 80), i * PI / 4);
            pop();
        }
        
        // Command center
        this._drawPrism(0, 0, this.size * 0.075, 8, 30, color(50, 60, 70));
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
            const armVerts = [
                {x: -this.size * 0.09, y: 0},
                {x: -this.size * 0.06, y: -this.size * 0.15},
                {x: -this.size * 0.05, y: -this.size * 0.45},
                {x: this.size * 0.05, y: -this.size * 0.45},
                {x: this.size * 0.06, y: -this.size * 0.15},
                {x: this.size * 0.09, y: 0}
            ];
            this._drawExtrudedShape(armVerts, 20, color(100, 110, 130), i * PI / 2, false);
            
            // Defense turrets along arm
            for (let j = 1; j < 4; j++) {
                let y = -j * this.size * 0.12;
                
                // Turret base - reduced depth
                this._drawPrism(0, y, this.size * 0.025, 6, 8, color(70, 80, 100), i * PI / 2);
                
                // Turret gun - reduced depth
                this._drawBox3D(0, y - this.size * 0.02, this.size * 0.02, this.size * 0.04, 10, color(40, 50, 70), i * PI / 2);
            }
            
            // Connection to outer ring - reinforced
            this._drawBox3D(0, -this.size * 0.445, this.size * 0.14, this.size * 0.05, 20, color(90, 100, 120), i * PI / 2);
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
                this._drawBox3D(0, -this.size * 0.48, this.size * 0.12, this.size * 0.06, 15, color(60, 70, 90), i * TWO_PI / 16);
                
                // Warning lights - 3D
                const lightCol = sin(this.lightTimer*3 + i) > 0 ? color(255, 50, 0) : color(255, 200, 0);
                this._drawBox3D(-this.size * 0.04 + this.size * 0.04, -this.size * 0.46, this.size * 0.08, this.size * 0.02, 2, lightCol, i * TWO_PI / 16);
            } else if (i % 2 === 0) {
                // Weapon modules
                // Vary height slightly for greeble effect
                const h = this.size * 0.04 + (i % 3 === 0 ? 0.01 : 0) * this.size;
                this._drawBox3D(0, -this.size * 0.47, this.size * 0.1, h, 10, color(70, 80, 100), i * TWO_PI / 16);
                
                // Weapon barrel
                this._drawBox3D(0, -this.size * 0.49, this.size * 0.02, this.size * 0.06, 5, color(50, 60, 80), i * TWO_PI / 16);
            } else {
                // Standard modules
                // Vary height for greeble effect
                const h = this.size * 0.04 + (i % 3 !== 0 ? 0.015 : -0.005) * this.size;
                this._drawBox3D(0, -this.size * 0.47, this.size * 0.08, h, 10, this.color, i * TWO_PI / 16);
                
                // Armored windows - 3D
                const winCol = color(100, 150, 200, 150 + sin(this.lightTimer + i)*50);
                for (let w = 0; w < 2; w++) {
                    this._drawBox3D(-this.size * 0.025 + w * this.size * 0.03, -this.size * 0.465, this.size * 0.015, this.size * 0.01, 2, winCol, i * TWO_PI / 16);
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
            this._drawBox3D(0, this.size * 0.15, this.size * 0.06, this.size * 0.06, 15, color(80, 90, 110), i * PI / 2 + PI / 6);
            
            // Main cannon
            this._drawBox3D(0, this.size * 0.19, this.size * 0.04, this.size * 0.14, 10, color(60, 70, 90), i * PI / 2 + PI / 6);
            
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
        // Move to center of ring (ring is 0.45 to 0.475)
        const r = -s * 0.4625;
        const lt = this.lightTimer;
        for (let i = 0; i < 32; i++) {
            push();
            rotate(i * step);
            
            // Military uses yellow lights
            let lightCol;
            if (i % 8 === 0) {
                lightCol = color(255, 255, 0, 120 + sin(lt * 2 + i) * 100); // Bright yellow
            } else if (i % 4 === 0) {
                lightCol = color(255, 255, 100, 120 + sin(lt * 2.5 + i) * 100); // Light yellow
            } else if (i % 2 === 0) {
                lightCol = color(200, 200, 0, 80 + sin(lt * 3 + i * 0.5) * 80); // Dark yellow
            }
            
            if (lightCol) {
                this._drawPrism(0, r, 1.75, 6, 2, lightCol, i * step);
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
        // Slightly pulsating core
        let pulseSize = this.size * (0.3 + sin(this.lightTimer) * 0.02);
        
        // Generate vertices for irregular octagonal shape
        const vertices = [];
        for (let i = 0; i < 8; i++) {
            let angle = i * TWO_PI / 8;
            let radius = pulseSize * (1 + (i % 2 === 0 ? 0.1 : -0.1));
            vertices.push({x: cos(angle) * radius, y: sin(angle) * radius});
        }
        
        this._drawExtrudedShape(vertices, 25, color(40, 180, 140));
        
        // Inner energy pattern
        push();
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
            const rot = i * TWO_PI / 5 + sin(i) * 0.2;
            rotate(rot);
            
            // Curved, organic arm structure approximated as polygon
            const armVerts = [
                {x: -this.size * 0.05, y: 0},
                {x: -this.size * 0.07, y: -this.size * 0.2},
                {x: -this.size * 0.04, y: -this.size * 0.35},
                {x: -this.size * 0.05, y: -this.size * 0.45},
                {x: this.size * 0.05, y: -this.size * 0.45},
                {x: this.size * 0.04, y: -this.size * 0.35},
                {x: this.size * 0.07, y: -this.size * 0.2},
                {x: this.size * 0.05, y: 0}
            ];
            
            this._drawExtrudedShape(armVerts, 15, color(60, 200, 160), rot);
            
            // Organic nodules along arm
            for (let j = 1; j < 4; j++) {
                let y = -j * this.size * 0.11;
                let size = this.size * 0.04 * (1 + sin(this.lightTimer * 2 * 0.55 + j + this.animationOffset) * 0.2);
                this._drawPrism(0, y, size/2, 6, 10, color(30, 160, 120), rot);
            }
            
            // Connection to outer zone - organic shape
            const connVerts = [
                {x: -this.size * 0.05, y: -this.size * 0.45},
                {x: -this.size * 0.07, y: -this.size * 0.48},
                {x: this.size * 0.07, y: -this.size * 0.48},
                {x: this.size * 0.05, y: -this.size * 0.45}
            ];
            this._drawExtrudedShape(connVerts, 12, color(50, 190, 150), rot);
            pop();
        }
    }
    
    /**
     * Draws alien ring structures.
     * @private
     */
    _drawAlienRings() {
        // Outer ring - not a perfect circle, slightly undulating
        const ringVerts = [];
        const innerRingVerts = [];
        const steps = 60;
        for (let i = 0; i < steps; i++) {
            let angle = i * TWO_PI / steps;
            let radius = this.size * (0.48 + sin(angle * 5 + this.lightTimer) * 0.02);
            let innerRadius = radius - this.size * 0.04;
            ringVerts.push({x: cos(angle) * radius, y: sin(angle) * radius});
            innerRingVerts.push({x: cos(angle) * innerRadius, y: sin(angle) * innerRadius});
        }
        
        this._drawExtrudedRing(ringVerts, innerRingVerts, 10, color(100, 240, 200));
        
        // Inner energy field
        push();
        stroke(60, 220, 180, 100);
        strokeWeight(4);
        noFill();
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
            const rot = i * TWO_PI / 15 + sin(i * 0.5) * 0.1;
            rotate(rot);
            
            if (i % 5 === 0) {
                // Transport portals at specific points
                this._drawPrism(0, -this.size * 0.48, this.size * 0.04, 8, 10, color(20, 120, 100), rot);
                
                // Portal energy - keep 2D glow
                fill(100, 255, 200, 150 + sin(this.lightTimer * 3 * 0.55 + i + this.animationOffset) * 100);
                noStroke();
                ellipse(0, -this.size * 0.48, this.size * 0.05 * (1 + sin(this.lightTimer * 2 * 0.55 + this.animationOffset) * 0.2), this.size * 0.05 * (1 + sin(this.lightTimer * 2 * 0.55 + this.animationOffset) * 0.2));
            } else {
                // Organic pods
                const podVerts = [];
                for (let j = 0; j < 8; j++) {
                    let angle = j * TWO_PI / 8;
                    let rx = this.size * 0.04 * (1 + (j % 2 === 0 ? 0.2 : -0.1));
                    let ry = this.size * 0.035 * (1 + (j % 2 === 0 ? -0.1 : 0.2));
                    podVerts.push({x: cos(angle) * rx, y: sin(angle) * ry - this.size * 0.48});
                }
                this._drawExtrudedShape(podVerts, 12, color(50, 180, 140), rot);
                
                // Bioluminescent spots - 3D
                const spotCol = color(120, 255, 220, 180 + sin(this.lightTimer + i*2) * 75);
                for (let w = 0; w < 2; w++) {
                    let x = (w - 0.5) * this.size * 0.02;
                    let y = -this.size * 0.48;
                    let size = this.size * 0.01 * (1 + sin(this.lightTimer * 3 * 0.55 + i + w + this.animationOffset) * 0.3);
                    this._drawPrism(x, y, size/2, 6, 2, spotCol, rot);
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
            const rot = i * TWO_PI / 3 + PI/6;
            rotate(rot);
            
            // Energy field generator
            this._drawPrism(0, this.size * 0.15, this.size * 0.03, 6, 15, color(40, 170, 130), rot);
            
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
            let lightCol;
            if (i % 5 === 0) {
                lightCol = color(0, 255, 200, 80 + sin(lt * 2.5 + i) * 120); // Teal
            } else if (i % 3 === 0) {
                lightCol = color(180, 100, 255, 80 + sin(lt * 3 + i * 0.7) * 120); // Purple
            } else if (i % 2 === 0) {
                lightCol = color(100, 255, 150, 80 + sin(lt * 1.5 + i * 0.4) * 120); // Green
            }
            
            if (lightCol) {
                this._drawPrism(0, r, sz/2, 6, 2, lightCol, i * baseStep + sin(i * 0.2) * 0.1);
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
                this._drawPrism(0, -this.size * 0.48, this.size * 0.065, 8, 15, color(120, 200, 120), i * TWO_PI / 16);
                
                // Glow can remain 2D as it's light
                fill(180, 255, 180, 80 + 40 * sin(this.lightTimer + i));
                noStroke();
                ellipse(0, -this.size * 0.48, this.size * 0.09, this.size * 0.05);
            } else {
                // Standard modules with green windows
                this._drawBox3D(0, -this.size * 0.45, this.size * 0.08, this.size * 0.04, 15, this.color, i * TWO_PI / 16);
                
                // Windows - 3D
                const winCol = color(180, 255, 180, 120 + 40 * sin(this.lightTimer + i));
                this._drawBox3D(0, -this.size * 0.45, this.size * 0.04, this.size * 0.015, 2, winCol, i * TWO_PI / 16);
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

        // Yellow/green running lights - 3D
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            const lightCol = color(180, 255, 100, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Green-yellow
            this._drawPrism(0, -this.size * 0.475, 1.5, 6, 2, lightCol, i * TWO_PI / 24);
            pop();
        }
        // agricultural crate clusters (planter boxes, pollinator crates)
        if (this.stationType === 'agricultural') this._drawCrates();
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
            
            // Module
            this._drawBox3D(0, -this.size * 0.4475, this.size * 0.09, this.size * 0.045, 15, this.color, i * TWO_PI / 16);

            // Smokestack
            if (i % 4 === 0) {
                this._drawBox3D(0, -this.size * 0.49, this.size * 0.02, this.size * 0.04, 25, color(80, 80, 80), i * TWO_PI / 16);
                
                // Smokestack top cap - 3D
                this._drawPrism(0, -this.size * 0.53, this.size * 0.015, 8, 2, color(60, 60, 60), i * TWO_PI / 16);
                
                // smoke puff (keep 2D)
                noStroke();
                fill(180, 180, 180, 80 + 40 * sin(this.lightTimer + i));
                ellipse(0, -this.size * 0.53 - 5, this.size * 0.03, this.size * 0.01);
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
        // Industrial-specific orbiting scrap
        if (this.stationType === 'industrial') this._drawOrbitingCubes(3, 0.32, 0.6);
        this._drawMaintenanceArm(this.size*0.09, this.size*0.08, 1.8, 1);
        this._drawDockingPylon(-this.size*0.08, -this.size*0.06);

        // Orange/white running lights - 3D
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            const lightCol = color(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            this._drawPrism(0, -this.size * 0.475, 1.5, 6, 2, lightCol, i * TWO_PI / 24);
            pop();
        }
        // industrial crate field
        if (this.stationType === 'industrial') this._drawCrates();
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
                this._drawBox3D(0, -this.size * 0.445, this.size * 0.12, this.size * 0.07, 20, color(180, 140, 80), i * TWO_PI / 16);
            } else {
                // Rugged module
                this._drawBox3D(0, -this.size * 0.4475, this.size * 0.09, this.size * 0.045, 15, this.color, i * TWO_PI / 16);
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
        // Mining-specific pulsing beacon to indicate loading points
        if (this.stationType === 'mining') this._drawPulsingBeacon(0, -this.size*0.42, 0.9, color(255,180,80));
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
        // mining crate field
        if (this.stationType === 'mining') this._drawCrates();
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
                // Large dome
                this._drawPrism(0, -this.size * 0.48, this.size * 0.065, 12, 15, color(220, 180, 255, 180), i * TWO_PI / 16);
            } else {
                // Standard module
                this._drawBox3D(0, -this.size * 0.45, this.size * 0.08, this.size * 0.04, 15, this.color, i * TWO_PI / 16);
                
                fill(255, 200, 255, 120 + 40 * sin(this.lightTimer + i));
                noStroke();
                rectMode(CENTER);
                rect(0, -this.size * 0.45, this.size * 0.04, this.size * 0.015, 1);
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

        // Tourism attractions positioned on the station
        // Ferris wheel on the first arm
        push();
        rotate(0);
        // Base platform on the arm
        this._drawBox3D(0, -this.size * 0.39, this.size * 0.12, this.size * 0.06, 10, color(150, 150, 170), 0);
        translate(0, -this.size * 0.35);
        this._drawFerrisWheel(0, 0, 0.8);
        pop();

        // Carousel on the second arm
        push();
        rotate(PI / 2);
        // Base platform on the arm
        this._drawBox3D(0, -this.size * 0.39, this.size * 0.12, this.size * 0.06, 10, color(150, 150, 170), PI / 2);
        translate(0, -this.size * 0.35);
        this._drawCarousel(0, 0, 0.7);
        pop();

        // Space slide on the third arm
        push();
        rotate(PI);
        // Base platform on the arm
        this._drawBox3D(0, -this.size * 0.39, this.size * 0.12, this.size * 0.06, 10, color(150, 150, 170), PI);
        translate(0, -this.size * 0.35);
        this._drawSpaceSlide(0, 0, 0.9);
        pop();

        // Roller coaster track on the fourth arm
        push();
        rotate(3 * PI / 2);
        // Base platform on the arm
        this._drawBox3D(0, -this.size * 0.39, this.size * 0.12, this.size * 0.06, 10, color(150, 150, 170), 3 * PI / 2);
        translate(0, -this.size * 0.35);
        this._drawRollerCoasterTrack(0, 0, 0.6);
        pop();

        // Observation deck near the hub
        this._drawObservationDeck(this.size * 0.15, -this.size * 0.1, 0.8);

        // Additional slides around the ring
        for (let i = 0; i < 4; i++) {
            push();
            rotate(i * PI / 2 + PI / 4);
            // Small platform extending from the ring
            this._drawBox3D(0, -this.size * 0.51, this.size * 0.08, this.size * 0.03, 5, color(150, 150, 170), i * PI / 2 + PI / 4);
            translate(0, -this.size * 0.52);
            this._drawSpaceSlide(0, 0, 0.5);
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
        // Tanks, pipes and clustered refinery decorations
        for (let i = 0; i < 16; i++) {
            push();
            rotate(i * TWO_PI / 16);
            // main module body
            this._drawBox3D(0, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 15, this.color, i * TWO_PI / 16);

            // clustered tanks at cardinal points with connecting pipes
            if (i % 4 === 0) {
                // tank cluster
                push();
                translate(0, -this.size * 0.51);
                fill(200, 90, 60);
                stroke(160, 70, 40);
                // vertical tanks
                for (let t = -1; t <= 1; t++) {
                    push();
                    translate(t * this.size * 0.02, 0);
                    // Use prism for cylindrical tanks
                    this._drawPrism(0, -this.size * 0.03, this.size * 0.01, 8, 20, color(200, 90, 60), i * TWO_PI / 16);
                    // tank cap - 3D
                    this._drawPrism(0, -this.size * 0.06, this.size * 0.01, 8, 2, color(220, 100, 70), i * TWO_PI / 16);
                    pop();
                }
                // short pipe connecting tanks to module
                stroke(140, 60, 30);
                strokeWeight(2);
                line(-this.size * 0.03, this.size * 0.01, this.size * 0.03, this.size * 0.01);
                pop();

                // short vent / stack with faint smoke puffs
                push();
                translate(this.size * 0.035, -this.size * 0.52);
                this._drawBox3D(0, -this.size * 0.015, this.size * 0.012, this.size * 0.03, 10, color(90, 90, 90), i * TWO_PI / 16);
                // smoke puff
                noStroke();
                fill(180, 180, 180, 40 + 40 * sin(this.lightTimer * 3 + i));
                ellipse(0, -this.size * 0.06 + sin(this.lightTimer * 2 + i) * 2, this.size * 0.02, this.size * 0.01);
                pop();
            }

            pop();
        }

        // Pipes along arms (subtle lines) and additional solar arrays for utility
        for (let a = 0; a < 4; a++) {
            push();
            rotate(a * PI / 2);
            // simple pipe running along arm
            stroke(140, 80, 50);
            strokeWeight(1.5);
            line(-this.size * 0.03, -this.size * 0.05, -this.size * 0.03, -this.size * 0.42);
            // small maintenance arm near the pipe
            this._drawMaintenanceArm(-this.size*0.02, -this.size*0.24, 1.6, 0.9);
            pop();
        }

        this._drawSolarPanels();

        // Activity indicators: scanner beams, floating light balls and a cargo tug
        this._drawScannerBeam(-this.size*0.05, -this.size*0.02, 1.1);
        this._drawFloatingLightBall(this.size*0.07, -this.size*0.03, 1.0);
        this._drawCargoTug(-this.size*0.09, -this.size*0.28, 0.9);

        // Running lights (red/orange) around perimeter - 3D
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            let lightCol = color(255, 80, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Red
            if (i % 3 === 0) lightCol = color(255, 180, 80, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Orange
            this._drawPrism(0, -this.size * 0.475, 1.5, 6, 2, lightCol, i * TWO_PI / 24);
            pop();
        }

        // Subtle activity: small comet trail and orbital glow for active refineries
        if (this.stationType === 'refinery') {
            this._drawCometTrail(this.animationOffset * 0.5, 0.48);
            this._drawOrbitalGlow(26);
            // clustered crates and small orbiting tanks for visual richness
            this._drawCrates();
            this._drawOrbitingCubes(2, 0.34, 0.45);
            // pulsing processing beacon near the hub
            push();
            translate(this.size * 0.08, -this.size * 0.06);
            this._drawPulsingBeacon(0, 0, 0.6, color(255,160,100));
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
            
            this._drawBox3D(0, -this.size * 0.47, this.size * 0.08, this.size * 0.04, 15, this.color, i * TWO_PI / 16);
            
            // Windows - 3D
            const winCol = color(200, 255, 255, 120 + 40 * sin(this.lightTimer + i));
            this._drawBox3D(-this.size * 0.02 + this.size * 0.02, -this.size * 0.465, this.size * 0.04, this.size * 0.015, 2, winCol, i * TWO_PI / 16);
            pop();
        }
        this._drawSolarPanels();
        // Blue/white running lights - 3D
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            let lightCol = color(100, 200, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Blue
            if (i % 3 === 0) lightCol = color(255, 255, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // White
            this._drawPrism(0, -this.size * 0.475, 1.5, 6, 2, lightCol, i * TWO_PI / 24);
            pop();
        }

        // Futuristic rotating mini-rings and holo billboards
        this._drawRotatingMiniRing(-this.size*0.06, -this.size*0.04, 0.7);
        this._drawHoloBillboard(this.size*0.1, -this.size*0.28, 0.8, 0.4);

        // --- Post-Human extras: filaments, drones, holo-arcs, and soft glows ---
        // fiber-optic filaments near the hub (subtle glowing lines)
        push();
        stroke(120, 220, 255, 60);
        strokeWeight(1);
        for (let f = 0; f < 8; f++) {
            const a = f * TWO_PI / 8 + this.lightTimer * 0.02;
            const r1 = this.size * 0.08;
            const r2 = this.size * (0.18 + 0.02 * sin(this.lightTimer + f));
            line(cos(a) * r1, sin(a) * r1, cos(a) * r2, sin(a) * r2);
        }
        pop();

        // small repair/detail drones orbiting the hub
        for (let d = 0; d < 3; d++) {
            push();
            const ang = this.lightTimer * (0.12 + d*0.02) + d * TWO_PI / 3 + this.animationOffset * 0.1;
            rotate(ang);
            translate(0, -this.size * (0.22 + 0.03 * d));
            this._drawRepairDrone(0, 0, 1 - d*0.12);
            pop();
        }

        // holographic arc panels intentionally removed (visual cleanup)

        // Additional rotating mini-ring and a subtle beacon for posthuman tech
        this._drawRotatingMiniRing(this.size*0.08, -this.size*0.06, 0.5);
        this._drawPulsingBeacon(-this.size*0.08, -this.size*0.02, 0.5, color(140,220,255));

        // Orbiting micro-spheres for a 'nanofabricator' effect
        this._drawOrbitingCubes(4, 0.28, 0.25);

        // small maintenance arm and comms array cluster
        this._drawMaintenanceArm(this.size*0.06, -this.size*0.12, 1.1, 0.9);
        this._drawMiniCommsArray(-this.size*0.04, -this.size*0.14, 0.9);

        // tiny shuttle and translucent crate cluster for added life
        push();
        rotate(this.animationOffset * -0.15 - this.lightTimer * 0.14);
        translate(this.size * 0.12, -this.size * 0.36 + sin(this.lightTimer * 0.8 + this.animationOffset * 0.4) * 3);
        this._drawTinyShuttle(0, 0, 0.6);
        pop();

        if (this.stationType === 'posthuman') {
            // crates and floating blobby lights removed for cleaner posthuman aesthetic
        }
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
            
            this._drawBox3D(0, -this.size * 0.47, this.size * 0.09, this.size * 0.045, 15, this.color, i * TWO_PI / 16);
            
            if (i % 4 === 0) {
                this._drawBox3D(0, -this.size * 0.51, this.size * 0.02, this.size * 0.06, 20, color(255, 220, 100), i * TWO_PI / 16);
            }
            pop();
        }
        this._drawSolarPanels();
        // Regal pennants and a ceremonial shuttle
        for (let i = 0; i < 6; i++) {
            push();
            rotate(i * TWO_PI / 6 + this.lightTimer * 0.05);
            translate(0, -this.size * 0.52);
            
            // Pennant - 3D
            const pennantVerts = [
                {x: 0, y: 0},
                {x: -this.size * 0.02, y: this.size * 0.04},
                {x: this.size * 0.02, y: this.size * 0.04}
            ];
            this._drawExtrudedShape(pennantVerts, 2, color(255, 220, 100, 200), i * TWO_PI / 6 + this.lightTimer * 0.05);
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

        // Gold/white running lights - 3D
        noStroke();
        for (let i = 0; i < 24; i++) {
            push();
            rotate(i * TWO_PI / 24);
            let lightCol = color(255, 220, 100, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // Gold
            if (i % 3 === 0) lightCol = color(255, 255, 255, 100 + sin(this.lightTimer*2 + i*0.3) * 100); // White
            this._drawPrism(0, -this.size * 0.475, 1.5, 6, 2, lightCol, i * TWO_PI / 24);
            pop();
        }
        // refinery crate field (smaller accretion near tanks)
        if (this.stationType === 'refinery') this._drawCrates();
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

        // Additional asymmetrical visual elements for separatists
        // Asymmetrical antenna tower on one side
        push();
        rotate(PI / 6); // Offset from cardinal direction
        translate(0, -this.size * 0.35);
        this._drawAntennaArray(0, 0, 1.2);
        // Add a small platform below
        this._drawBox3D(0, this.size * 0.05, this.size * 0.04, this.size * 0.03, 10, color(150, 120, 100), PI / 6);
        pop();

        // Floating separatist banner/flags on the opposite side
        push();
        rotate(-PI / 4);
        translate(0, -this.size * 0.4);
        this._drawFloatBanner(0, 0, 1.1);
        // Add a small pennant - 3D
        const pennantVerts = [
            {x: 0, y: 0},
            {x: -this.size * 0.015, y: this.size * 0.03},
            {x: this.size * 0.015, y: this.size * 0.03}
        ];
        this._drawExtrudedShape(pennantVerts, 2, color(255, 100, 50, 180), -PI / 4);
        pop();

        // Asymmetrical extension arm with extra modules
        push();
        rotate(PI * 5/6); // Another offset angle
        translate(0, -this.size * 0.42);
        // Extra small module
        this._drawBox3D(0, -this.size * 0.02, this.size * 0.05, this.size * 0.04, 10, color(180, 120, 80), PI * 5/6);
        // Add a small antenna on top
        stroke(100, 100, 100);
        strokeWeight(1);
        line(0, -this.size * 0.02, 0, -this.size * 0.05);
        // Antenna light - 3D
        this._drawPrism(0, -this.size * 0.05, this.size * 0.004, 6, 2, color(255, 200, 100, 150), PI * 5/6);
        pop();

        // Orbiting separatist drones (asymmetrical count)
        for (let i = 0; i < 3; i++) {
            push();
            const angle = this.lightTimer * 0.08 + i * TWO_PI / 3 + this.animationOffset * 0.2;
            rotate(angle);
            translate(0, -this.size * 0.38 + sin(this.lightTimer * 0.7 + i) * 2);
            this._drawServiceBot(0, 0, 0.8);
            pop();
        }

        // Unique separatist beacon on one arm
        push();
        rotate(PI * 3/4);
        translate(0, -this.size * 0.3);
        this._drawPulsingBeacon(0, 0, 0.7, color(255, 150, 50));
        pop();

        // Asymmetrical cargo pods hanging from arms
        push();
        rotate(PI / 3);
        translate(this.size * 0.08, -this.size * 0.25);
        this._drawCargoSwing(0, 0, 1.2);
        pop();
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
        // standard station gets a lighter crate field for around modules
        if (this.stationType === 'standard') this._drawCrates();
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