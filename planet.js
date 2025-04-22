// ****** planet.js ******
// --- Optimized Textured Planet with Buffer-based Rendering ---

class Planet {
    /**
     * Creates a Planet instance with detailed visuals and rings.
     * Uses buffer-based pre-rendering for performance.
     * @param {number} worldX - World coordinate X.
     * @param {number} worldY - World coordinate Y.
     * @param {number} size - Diameter of the planet.
     * @param {p5.Color} color1 - Primary base color object passed from StarSystem.
     * @param {p5.Color} color2 - Secondary color object passed from StarSystem.
     */
    constructor(worldX, worldY, size, color1, color2) {
        this.pos = createVector(worldX, worldY);
        this.size = size;
        let r = size / 2;

        // Store base colors provided by StarSystem
        this.baseColor = color1 || color(random(80, 180), random(80, 180), random(80, 180));
        this.featureColor1 = color2 || lerpColor(this.baseColor, color(random(255)), 0.3);
        // Generate a second feature color deterministically
        let c1r = red(this.baseColor); let c1g = green(this.baseColor); let c1b = blue(this.baseColor);
        this.featureColor2 = color((c1r * 0.8 + random(50)) % 255, (c1g * 0.7 + random(60)) % 255, (c1b * 0.9 + random(40)) % 255);

        this.palette = [this.baseColor, this.featureColor1, this.featureColor2];

        // Deterministic properties using random() (seeded by StarSystem)
        this.featureRand = random(10000); // Offset for noise calculations
        this.noiseScale = random(0.8, 3.5) / r; // Scale for surface noise based on size
        this.noisePersistence = random(0.4, 0.6); // Noise detail factor

        this.hasAtmosphere = random() < 0.4; // Less frequent
        this.atmosphereColor = this.hasAtmosphere ? color(random(150, 220), random(150, 220), random(200, 255), random(5, 15)) : null;

        // --- Rings Restored ---
        this.hasRings = random() < 0.25;
        if (this.hasRings) {
            this.ringAngle = random(-PI / 12, PI / 12); // Keep tilt moderate
            this.ringPerspective = map(abs(this.ringAngle), 0, PI / 6, 0.15, 0.4); // Y-scale factor
            this.ringInnerRad = r * random(1.2, 1.5);
            this.ringOuterRad = this.ringInnerRad * random(1.3, 1.8);
            this.numRingSegments = floor(random(60, 160)); // Reduced for performance
            this.ringColor1 = lerpColor(this.baseColor, color(200), 0.6);
            this.ringColor2 = lerpColor(this.featureColor1, color(150), 0.6);
        }

        this.rotationSpeed = 0; // Not used currently but kept for compatibility
        this.currentRotation = 0;
        this.shadowOffset = null;
        
        // Create and pre-render all the graphical elements
        this.createBuffers();
    }

    /**
     * Creates all the necessary graphics buffers and pre-renders
     * the planet components for efficient drawing
     */
    createBuffers() {
        // Size calculations for buffers
        const bufferSize = Math.ceil(this.size * 1.2); // Make buffer a bit larger
        const ringBufferSize = this.hasRings ? Math.ceil(this.ringOuterRad * 2.2) : 0;
        const atmBufferSize = this.hasAtmosphere ? Math.ceil(this.size * 1.4) : 0;
        
        // --- CHANGE: Always create ONE main planet buffer ---
        this.planetBuffer = createGraphics(bufferSize, bufferSize);
        this.renderPlanetTexture(this.planetBuffer); // Render the full planet texture
        
        // Create rings buffer ONLY if needed
        if (this.hasRings) {
            this.ringsBuffer = createGraphics(ringBufferSize, ringBufferSize);
            this.renderRings();
        }
        
        // Create atmosphere buffer if needed
        if (this.hasAtmosphere) {
            this.atmosphereBuffer = createGraphics(atmBufferSize, atmBufferSize);
            this.renderAtmosphere();
        }
    }
    
    /**
     * Renders the FULL planet texture to the specified buffer.
     * Removed the isTopHalf logic and masking.
     * @param {p5.Graphics} pg - The graphics buffer to render to
     */
    renderPlanetTexture(pg) { // Removed isTopHalf parameter
        const bufferCenter = pg.width / 2;
        const r = this.size / 2;
        
        // First clear the buffer and set up
        pg.clear();
        pg.noStroke();
        pg.noiseDetail(4, this.noisePersistence);
        
        // Draw a solid base circle first to prevent transparency issues
        pg.fill(this.baseColor);
        pg.ellipse(bufferCenter, bufferCenter, this.size, this.size);
        
        // --- CHANGE: Always render the full planet ---
        const yStart = -r;
        const yEnd = r;
        
        // Set resolution based on planet size
        const bandHeight = max(2, Math.ceil(4 * (100 / this.size)));
        
        // Loop through vertical bands (full planet)
        for (let y = yStart; y < yEnd; y += bandHeight) {
            const bandR = sqrt(max(0, r * r - y * y));
            if (bandR <= 0) continue;
            
            for (let x = -bandR; x < bandR; x += bandHeight) {
                const angle = atan2(y, x);
                const distFromCenter = dist(0, 0, x, y);
                const noiseX = (cos(angle) * distFromCenter) * this.noiseScale + this.featureRand;
                const noiseY = (sin(angle) * distFromCenter) * this.noiseScale + this.featureRand;
                const noiseZ = this.featureRand * 0.1;
                
                const n = pg.noise(noiseX, noiseY, noiseZ);
                const paletteIndex = floor(n * (this.palette.length - 1));
                const lerpFactor = (n * (this.palette.length - 1)) % 1;
                const col1 = this.palette[paletteIndex];
                const col2 = this.palette[min(paletteIndex + 1, this.palette.length - 1)];
                const bandColor = lerpColor(col1, col2, lerpFactor);
                
                pg.fill(red(bandColor), green(bandColor), blue(bandColor), 255);
                pg.rect(bufferCenter + x, bufferCenter + y, bandHeight, bandHeight);
            }
        }
        
        // --- REMOVED MASKING LOGIC ---
        
        // Reset noise detail 
        pg.noiseDetail(4, 0.5);
    }
    
    /**
     * Renders the ring system to its buffer
     */
    renderRings() {
        const pg = this.ringsBuffer;
        const bufferCenter = pg.width / 2;
        
        // Clear buffer
        pg.clear();
        pg.push();
        pg.translate(bufferCenter, bufferCenter);
        pg.rotate(this.ringAngle);
        
        pg.noFill();
        
        // Draw ring segments from inner to outer radius
        const segmentStep = (this.ringOuterRad - this.ringInnerRad) / this.numRingSegments;
        for (let i = 0; i < this.numRingSegments; i++) {
            const segmentProgress = i / this.numRingSegments;
            const currentRad = lerp(this.ringInnerRad, this.ringOuterRad, segmentProgress);
            
            // Use noise for color variation
            const noiseVal = pg.noise(segmentProgress * 5 + this.featureRand, this.featureRand + 10);
            const segmentColor = lerpColor(this.ringColor1, this.ringColor2, noiseVal);
            const segmentAlpha = lerp(80, 180, pg.noise(segmentProgress * 3 + this.featureRand + 20));
            
            pg.stroke(red(segmentColor), green(segmentColor), blue(segmentColor), segmentAlpha);
            pg.strokeWeight(segmentStep * 0.9); // Slightly thinner for performance
            
            // Draw full ellipse with correct perspective
            pg.ellipse(0, 0, currentRad * 2, currentRad * 2 * this.ringPerspective);
        }
        
        pg.pop();
    }
    
    /**
     * Renders the atmosphere effect to its buffer
     */
    renderAtmosphere() {
        const pg = this.atmosphereBuffer;
        const bufferCenter = pg.width / 2;
        
        // Clear buffer first
        pg.clear();
        pg.noStroke();
        
        // Draw atmosphere layers from outside in
        for (let i = 5; i > 0; i--) {
            const atmSizeFactor = 1.0 + i * 0.04;
            const atmAlpha = alpha(this.atmosphereColor) * (1.0 - i * 0.15);
            
            pg.fill(red(this.atmosphereColor), green(this.atmosphereColor), blue(this.atmosphereColor), atmAlpha);
            pg.ellipse(bufferCenter, bufferCenter, this.size * atmSizeFactor, this.size * atmSizeFactor);
        }
    }
    
    /**
     * Compute shadow offset based on sun position
     */
    computeShadowOffset(sunPos) {
        if (sunPos && sunPos instanceof p5.Vector) {
            const toSun = p5.Vector.sub(sunPos, this.pos);
            toSun.normalize();
            this.shadowOffset = toSun.mult(-this.size * 0.15);
        } else {
            // Fallback default
            this.shadowOffset = createVector(this.size * -0.075, this.size * 0.075);
        }
    }

    /**
     * Static method to create the sun
     */
    static createSun() {
        const sunSize = 400;  // Adjust as needed
        const sunColor1 = color(255, 255, 100);  // Bright yellow
        const sunColor2 = color(255, 200, 100);
        const sun = new Planet(0, 0, sunSize, sunColor1, sunColor2);
        sun.isSun = true; // Mark this planet as the sun
        return sun;
    }

    /**
     * Draw the planet using pre-rendered buffers
     */
    draw(sunPos) {
        if (!this.planetBuffer) { // Ensure buffer exists
            this.createBuffers();
        }
        
        if (!this.shadowOffset) {
            this.computeShadowOffset(sunPos);
        }
        
        push();
        translate(this.pos.x, this.pos.y);
        
        // Draw atmosphere if present
        if (this.hasAtmosphere && this.atmosphereBuffer) {
            const atmSize = this.atmosphereBuffer.width;
            image(this.atmosphereBuffer, -atmSize/2, -atmSize/2);
        }
        
        const bufferW = this.planetBuffer.width;
        const bufferH = this.planetBuffer.height;
        const bufferCenterX = bufferW / 2;
        const bufferCenterY = bufferH / 2; // Still useful for centering
        const destX = -bufferCenterX; 
        const destY = -bufferCenterY; 
        
        if (this.hasRings) {
            // --- IMPROVED DRAWING LOGIC FOR RING PLANETS ---
            
            // 1. First draw the FULL planet behind everything (as a base layer)
            image(this.planetBuffer, destX, destY);
            
            // 2. Draw the rings on top of that
            const ringsSize = this.ringsBuffer.width;
            image(this.ringsBuffer, -ringsSize/2, -ringsSize/2);
            
            // 3. Draw the top 45% of the planet again, on top of the rings
            // This creates a perfect "mask" effect with no seam
            const topHeight = bufferH * 0.45;
            image(
                this.planetBuffer,
                destX, destY,                   // Destination: top-left corner
                bufferW, topHeight,             // Destination size: full width, 45% height
                0, 0,                           // Source position: start from top-left
                bufferW, topHeight              // Source size: read full width, 45% height
            );
            
        } else {
            // For planets without rings, simply draw the full planet buffer
            image(this.planetBuffer, destX, destY);
        }
        
        // Apply shadow
        if (!this.isSun && this.shadowOffset) {
            noStroke();
            fill(0, 0, 0, 55);
            ellipse(this.shadowOffset.x, this.shadowOffset.y, this.size * 1.05, this.size * 1.05);
        }
        
        pop();
    }

    // Keep toJSON and fromJSON methods
    toJSON() {
        return {
            pos: { x: this.pos.x, y: this.pos.y },
            size: this.size,
            baseColor: this.baseColor ? this.baseColor.toString() : null,
            featureColor1: this.featureColor1 ? this.featureColor1.toString() : null,
            featureColor2: this.featureColor2 ? this.featureColor2.toString() : null,
            featureRand: this.featureRand,
            noiseScale: this.noiseScale,
            noisePersistence: this.noisePersistence,
            hasAtmosphere: this.hasAtmosphere,
            atmosphereColor: this.atmosphereColor ? this.atmosphereColor.toString() : null,
            hasRings: this.hasRings,
            ringAngle: this.ringAngle,
            ringPerspective: this.ringPerspective,
            ringInnerRad: this.ringInnerRad,
            ringOuterRad: this.ringOuterRad,
            numRingSegments: this.numRingSegments,
            ringColor1: this.ringColor1 ? this.ringColor1.toString() : null,
            ringColor2: this.ringColor2 ? this.ringColor2.toString() : null,
            rotationSpeed: this.rotationSpeed,
            currentRotation: this.currentRotation
        };
    }

    static fromJSON(data) {
        // Use baseColor and featureColor1/2 if possible, else fallback to random
        let c1 = data.baseColor && typeof color === "function" ? color(data.baseColor) : undefined;
        let c2 = data.featureColor1 && typeof color === "function" ? color(data.featureColor1) : undefined;
        const p = new Planet(data.pos.x, data.pos.y, data.size, c1, c2);
        p.featureColor2 = data.featureColor2 && typeof color === "function" ? color(data.featureColor2) : p.featureColor2;
        p.featureRand = data.featureRand;
        p.noiseScale = data.noiseScale;
        p.noisePersistence = data.noisePersistence;
        p.hasAtmosphere = data.hasAtmosphere;
        p.atmosphereColor = data.atmosphereColor && typeof color === "function" ? color(data.atmosphereColor) : null;
        p.hasRings = data.hasRings;
        p.ringAngle = data.ringAngle;
        p.ringPerspective = data.ringPerspective;
        p.ringInnerRad = data.ringInnerRad;
        p.ringOuterRad = data.ringOuterRad;
        p.numRingSegments = data.numRingSegments;
        p.ringColor1 = data.ringColor1 && typeof color === "function" ? color(data.ringColor1) : null;
        p.ringColor2 = data.ringColor2 && typeof color === "function" ? color(data.ringColor2) : null;
        p.rotationSpeed = data.rotationSpeed;
        p.currentRotation = data.currentRotation;
        
        // Recreate buffers after loading
        p.createBuffers();
        return p;
    }

    // --- Optional: Update disposeBuffers if you implemented it ---
    disposeBuffers() {
        if (this.planetBuffer) {
            this.planetBuffer.remove();
            this.planetBuffer = null;
        }
        if (this.ringsBuffer) { // Only exists for ringed planets
            this.ringsBuffer.remove();
            this.ringsBuffer = null;
        }
        if (this.atmosphereBuffer) {
            this.atmosphereBuffer.remove();
            this.atmosphereBuffer = null;
        }
        // Reset flag if you use one
        // this.buffersCreated = false; 
    }
}