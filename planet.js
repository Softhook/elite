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
     * @param {Object} options - Optional configuration settings.
     */
    constructor(worldX, worldY, size, color1, color2, options = {}) {
        this.pos = createVector(worldX, worldY);
        this.size = size;
        this.radius = size / 2;
        
        // Extract options with defaults
        const {
            ringProbability = 0.25,
            atmosphereProbability = 0.4,
            minRingTilt = -PI/20,
            maxRingTilt = PI/20,
            isSun = false
        } = options;
        
        this.isSun = isSun;

        // Generate color palette
        this.generateColorPalette(color1, color2);
        
        // Deterministic properties using random() (seeded by StarSystem)
        this.featureRand = random(10000);
        this.noiseScale = random(0.8, 3.5) / this.radius;
        this.noisePersistence = random(0.4, 0.6);

        // Atmosphere
        this.generateAtmosphere(atmosphereProbability);
        
        // Rings
        this.generateRings(ringProbability, minRingTilt, maxRingTilt);

        this.rotationSpeed = 0;
        this.currentRotation = 0;
        this.shadowOffset = null;
        
        // Flag to track buffer creation status
        this.buffersCreated = false;
    }
    
    /**
     * Generate the planet's color palette
     */
    generateColorPalette(color1, color2) {
        this.baseColor = color1 || color(random(80, 180), random(80, 180), random(80, 180));
        this.featureColor1 = color2 || lerpColor(this.baseColor, color(random(255)), 0.3);
        
        // Generate a second feature color deterministically
        let c1r = red(this.baseColor);
        let c1g = green(this.baseColor);
        let c1b = blue(this.baseColor);
        this.featureColor2 = color(
            (c1r * 0.8 + random(50)) % 255,
            (c1g * 0.7 + random(60)) % 255,
            (c1b * 0.9 + random(40)) % 255
        );
        
        this.palette = [this.baseColor, this.featureColor1, this.featureColor2];
    }
    
    /**
     * Generate atmosphere parameters
     */
    generateAtmosphere(probability) {
        this.hasAtmosphere = random() < probability;
        this.atmosphereColor = this.hasAtmosphere ? 
            color(random(150, 220), random(150, 220), random(200, 255), random(5, 15)) : null;
    }
    
    /**
     * Generate ring parameters
     */
    generateRings(probability, minTilt, maxTilt) {
        this.hasRings = random() < probability;
        
        if (this.hasRings) {
            this.ringAngle = random(minTilt, maxTilt);
            this.ringPerspective = map(abs(this.ringAngle), 0, PI/6, 0.15, 0.4);
            this.ringInnerRad = this.radius * random(1.2, 1.5);
            this.ringOuterRad = this.ringInnerRad * random(1.3, 1.8);
            this.numRingSegments = floor(random(60, 160));
            this.ringColor1 = lerpColor(this.baseColor, color(200), 0.6);
            this.ringColor2 = lerpColor(this.featureColor1, color(150), 0.6);
        }
    }

    /**
     * Creates all the necessary graphics buffers and pre-renders
     * the planet components for efficient drawing
     */
    createBuffers() {
        if (this.buffersCreated) return;
        
        // Size calculations for buffers
        const bufferSize = Math.ceil(this.size * 1.2);
        const ringBufferSize = this.hasRings ? Math.ceil(this.ringOuterRad * 2.2) : 0;
        const atmBufferSize = this.hasAtmosphere ? Math.ceil(this.size * 1.4) : 0;
        
        // Create main planet buffer
        this.planetBuffer = createGraphics(bufferSize, bufferSize);
        this.renderPlanetTexture(this.planetBuffer);
        
        // Create rings buffer only if needed
        if (this.hasRings) {
            this.ringsBuffer = createGraphics(ringBufferSize, ringBufferSize);
            this.renderRings();
        }
        
        // Create atmosphere buffer if needed
        if (this.hasAtmosphere) {
            this.atmosphereBuffer = createGraphics(atmBufferSize, atmBufferSize);
            this.renderAtmosphere();
        }
        
        this.buffersCreated = true;
    }
    
    /**
     * Frees memory by disposing graphics buffers when leaving a system
     */
    disposeBuffers() {
        if (!this.buffersCreated) return;
        
        if (this.planetBuffer) {
            this.planetBuffer.remove();
            this.planetBuffer = null;
        }
        
        if (this.hasRings && this.ringsBuffer) {
            this.ringsBuffer.remove();
            this.ringsBuffer = null;
        }
        
        if (this.hasAtmosphere && this.atmosphereBuffer) {
            this.atmosphereBuffer.remove();
            this.atmosphereBuffer = null;
        }
        
        this.buffersCreated = false;
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
        pg.noiseDetail(3, this.noisePersistence);
        
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
    static createSun(size = 400) {
        const sunColor1 = color(255, 255, 100);  // Bright yellow
        const sunColor2 = color(255, 200, 100);
        return new Planet(0, 0, size, sunColor1, sunColor2, { isSun: true });
    }

    /**
     * Draw the planet using pre-rendered buffers
     */
    draw(sunPos) {
        // Create buffers on demand when first drawn
        if (!this.buffersCreated) {
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
        
        if (this.hasRings) {
            this.drawRingedPlanet();
        } else {
            // For planets without rings, simply draw the full planet buffer
            const bufferSize = this.planetBuffer.width;
            image(this.planetBuffer, -bufferSize/2, -bufferSize/2);
        }
        
        // Apply shadow
        if (!this.isSun && this.shadowOffset) {
            noStroke();
            fill(0, 0, 0, 55);
            ellipse(this.shadowOffset.x, this.shadowOffset.y, this.size * 1.05, this.size * 1.05);
        }
        
        pop();
    }
    
    /**
     * Draw a planet with rings using the correct layering technique
     */
    drawRingedPlanet() {
        const bufferW = this.planetBuffer.width;
        const bufferH = this.planetBuffer.height;
        const destX = -bufferW/2;
        const destY = -bufferH/2;
        
        // 1. First draw the FULL planet behind everything
        image(this.planetBuffer, destX, destY);
        
        // 2. Draw the rings on top of that
        const ringsSize = this.ringsBuffer.width;
        image(this.ringsBuffer, -ringsSize/2, -ringsSize/2);
        
        // 3. Draw the top portion of the planet on top of the rings
        const topHeight = bufferH * 0.45;
        image(
            this.planetBuffer,
            destX, destY,
            bufferW, topHeight,
            0, 0,
            bufferW, topHeight
        );
    }

    /**
     * Creates a Planet instance from JSON data.
     * @param {Object} data - Serialized planet data.
     * @returns {Planet} New planet instance.
     */
    static fromJSON(data) {
        let c1 = data.baseColor && typeof color === "function" ? color(data.baseColor) : undefined;
        let c2 = data.featureColor1 && typeof color === "function" ? color(data.featureColor1) : undefined;
        
        const p = new Planet(data.pos.x, data.pos.y, data.size, c1, c2);
        
        // Copy all properties from data to the planet
        Object.keys(data).forEach(key => {
            // Skip position and size that were handled in constructor
            if (key === 'pos' || key === 'size') return;
            
            // Handle color objects specially
            if (key.includes('Color') && data[key] && typeof color === "function") {
                p[key] = color(data[key]);
            } else {
                p[key] = data[key];
            }
        });
        
        // Don't create buffers immediately - will be created on first draw
        return p;
    }
}