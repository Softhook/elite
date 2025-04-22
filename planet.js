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
            this.ringAngle = random(-PI / 6, PI / 6); // Keep tilt relatively moderate
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
        
        // Create appropriate buffers based on whether planet has rings
        if (this.hasRings) {
            // For ringed planets, we need separate buffers for top/bottom halves
            this.planetBufferTop = createGraphics(bufferSize, bufferSize);
            this.planetBufferBottom = createGraphics(bufferSize, bufferSize);
            this.ringsBuffer = createGraphics(ringBufferSize, ringBufferSize);
            
            // Render planet texture to both halves
            this.renderPlanetTexture(this.planetBufferTop, true);  // Top half
            this.renderPlanetTexture(this.planetBufferBottom, false); // Bottom half
            this.renderRings(); // Render rings
        } else {
            // For normal planets, just one buffer for the whole planet
            this.planetBuffer = createGraphics(bufferSize, bufferSize);
            this.renderPlanetTexture(this.planetBuffer); // Render full planet
        }
        
        // Create atmosphere buffer if needed
        if (this.hasAtmosphere) {
            this.atmosphereBuffer = createGraphics(atmBufferSize, atmBufferSize);
            this.renderAtmosphere();
        }
    }
    
    /**
     * Renders the planet texture to the specified buffer
     * @param {p5.Graphics} pg - The graphics buffer to render to
     * @param {boolean} isTopHalf - If specified, only render that half
     */
    renderPlanetTexture(pg, isTopHalf = null) {
        const bufferCenter = pg.width / 2;
        const r = this.size / 2;
        
        // First clear the buffer and set up
        pg.clear();
        pg.noStroke();
        pg.noiseDetail(4, this.noisePersistence);
        
        // Draw a solid base circle first to prevent transparency issues
        pg.fill(this.baseColor);
        pg.ellipse(bufferCenter, bufferCenter, this.size, this.size);
        
        // Determine y-range based on whether we're rendering half or whole
        let yStart, yEnd;
        if (isTopHalf === true) {
            yStart = -r;
            yEnd = 0;
        } else if (isTopHalf === false) {
            yStart = 0;
            yEnd = r;
        } else {
            // Full planet
            yStart = -r;
            yEnd = r;
        }
        
        // Set resolution based on planet size (bigger planets = bigger bands for efficiency)
        const bandHeight = max(2, Math.ceil(4 * (100 / this.size)));
        
        // Loop through vertical bands
        for (let y = yStart; y < yEnd; y += bandHeight) {
            // Calculate band width at this y position
            const bandR = sqrt(max(0, r * r - y * y));
            if (bandR <= 0) continue;
            
            // Loop through horizontal segments of this band
            for (let x = -bandR; x < bandR; x += bandHeight) {
                // Calculate noise coordinates for consistent texture
                const angle = atan2(y, x);
                const distFromCenter = dist(0, 0, x, y);
                const noiseX = (cos(angle) * distFromCenter) * this.noiseScale + this.featureRand;
                const noiseY = (sin(angle) * distFromCenter) * this.noiseScale + this.featureRand;
                const noiseZ = this.featureRand * 0.1;
                
                // Determine color from noise and palette
                const n = pg.noise(noiseX, noiseY, noiseZ);
                const paletteIndex = floor(n * (this.palette.length - 1));
                const lerpFactor = (n * (this.palette.length - 1)) % 1;
                const col1 = this.palette[paletteIndex];
                const col2 = this.palette[min(paletteIndex + 1, this.palette.length - 1)];
                const bandColor = lerpColor(col1, col2, lerpFactor);
                
                // Ensure full opacity for the texture fill
                pg.fill(red(bandColor), green(bandColor), blue(bandColor), 255);
                
                // Draw texture segment at correct position (center the planet in the buffer)
                pg.rect(bufferCenter + x, bufferCenter + y, bandHeight, bandHeight);
            }
        }
        
        // If rendering half planets, mask out the unused half
        if (isTopHalf === true) {
            // For top half, mask out bottom
            pg.fill(0, 0); // Use transparent fill to create a "hole"
            pg.rect(0, bufferCenter, pg.width, bufferCenter);
        } else if (isTopHalf === false) {
            // For bottom half, mask out top
            pg.fill(0, 0); // Use transparent fill to create a "hole"
            pg.rect(0, 0, pg.width, bufferCenter);
        }
        
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
        // Compute the shadow once
        if (!this.shadowOffset) {
            this.computeShadowOffset(sunPos);
        }
        
        push();
        translate(this.pos.x, this.pos.y);
        
        // Draw atmosphere if present (always behind everything)
        if (this.hasAtmosphere && this.atmosphereBuffer) {
            const atmSize = this.atmosphereBuffer.width;
            image(this.atmosphereBuffer, -atmSize/2, -atmSize/2);
        }
        
        if (this.hasRings) {
            // For planets with rings, follow the correct z-order:
            // 1. Bottom half of planet
            const halfSize = this.planetBufferBottom.width;
            image(this.planetBufferBottom, -halfSize/2, -halfSize/2);
            
            // 2. Rings
            const ringsSize = this.ringsBuffer.width;
            image(this.ringsBuffer, -ringsSize/2, -ringsSize/2);
            
            // 3. Top half of planet
            image(this.planetBufferTop, -halfSize/2, -halfSize/2);
        } else {
            // For planets without rings, simply draw the full planet buffer
            const bufferSize = this.planetBuffer.width;
            image(this.planetBuffer, -bufferSize/2, -bufferSize/2);
        }
        
        // Apply shadow as a simple overlay
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
}