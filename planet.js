// ****** planet.js ******
// --- V8 - Textured Planet, Rings Drawn Between Halves ---

class Planet {
    /**
     * Creates a Planet instance with detailed visuals and rings.
     * Uses split-drawing method for rings.
     * Compatible with StarSystem calling: new Planet(x, y, size, color1, color2)
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
        this.featureColor2 = color( (c1r * 0.8 + random(50)) % 255, (c1g * 0.7 + random(60)) % 255, (c1b * 0.9 + random(40)) % 255);

        this.palette = [this.baseColor, this.featureColor1, this.featureColor2];

        // Deterministic properties using random() (seeded by StarSystem)
        this.featureRand = random(10000); // Offset for noise calculations
        this.noiseScale = random(0.8, 3.5) / r; // Scale for surface noise based on size
        this.noisePersistence = random(0.4, 0.6); // Noise detail factor

        this.hasAtmosphere = random() < 0.4; // Less frequent
        this.atmosphereColor = this.hasAtmosphere ? color(random(150, 220), random(150, 220), random(200, 255), random(5, 15)) : null; // Very subtle base color

        // --- Rings Restored ---
        this.hasRings = random() < 0.25;
        if (this.hasRings) {
            this.ringAngle = random(-PI / 6, PI / 6); // Keep tilt relatively moderate
            this.ringPerspective = map(abs(this.ringAngle), 0, PI / 6, 0.15, 0.4); // Y-scale factor
            this.ringInnerRad = r * random(1.2, 1.5);
            this.ringOuterRad = this.ringInnerRad * random(1.3, 1.8);
            this.numRingSegments = floor(random(60, 160)); // Density
            this.ringColor1 = lerpColor(this.baseColor, color(200), 0.6);
            this.ringColor2 = lerpColor(this.featureColor1, color(150), 0.6);
        }
        // --- End Rings Restored ---

        // Stop rotation for all planets.
        this.rotationSpeed = 0;
        this.currentRotation = 0;

        // Initialize shadowOffset to null. It will be set later.
        this.shadowOffset = null;
    }

    // Call this method once you know the sun's position.
    computeShadowOffset(sunPos) {
        if (sunPos && sunPos instanceof p5.Vector) {
            let toSun = p5.Vector.sub(sunPos, this.pos);
            toSun.normalize();
            // Compute the shadow offset once.
            this.shadowOffset = toSun.mult(-this.size * 0.15);
        } else {
            // Fallback default
            this.shadowOffset = createVector(this.size * -0.075, this.size * 0.075);
        }
    }

    // Add a static method that creates the sun (at 0,0)
    static createSun() {
        let sunSize = 400;  // Adjust as needed
        let sunColor1 = color(255, 255, 100);  // Bright yellow
        let sunColor2 = color(255, 200, 100);
        let sun = new Planet(0, 0, sunSize, sunColor1, sunColor2);
        sun.isSun = true; // Mark this planet as the sun.
        return sun;
    }

    draw(sunPos) {
        push();
        translate(this.pos.x, this.pos.y);

        // 1. Atmosphere (Drawn first, behind everything)
        // Rotates independently of the main drawing order trick
        if (this.hasAtmosphere && this.atmosphereColor) {
            push();
            rotate(this.currentRotation); // Rotate atmosphere with planet conceptually
            noStroke();
            for (let i = 5; i > 0; i--) {
                let atmSizeFactor = 1.0 + i * 0.04;
                let atmAlpha = alpha(this.atmosphereColor) * (1.0 - i * 0.15);
                fill(red(this.atmosphereColor), green(this.atmosphereColor), blue(this.atmosphereColor), atmAlpha);
                ellipse(0, 0, this.size * atmSizeFactor, this.size * atmSizeFactor);
            }
            pop();
        }

        // 2. Draw BOTTOM half of the planet
        this.drawPlanetHalf(false); // isTopHalf = false

        // 3. Draw the FULL ring system (if it has rings)
        // This will draw on top of the bottom half of the planet
        if (this.hasRings) {
            this.drawFullRings();
        }

        // 4. Draw TOP half of the planet
        // This will draw on top of the rings and the bottom half, completing the illusion
        this.drawPlanetHalf(true); // isTopHalf = true

        // 5. Shading (Apply last, relative to view)
        // Re-orient shadow so that it faces away from the sun if sunPos is provided.
        if (!this.isSun) {
            noStroke();
            fill(0, 0, 0, 55);
            // Ensure shadowOffset is computed only once.
            if (!this.shadowOffset) {
                // Compute once if it hasn't been set.
                if (sunPos && sunPos instanceof p5.Vector) {
                    let toSun = p5.Vector.sub(sunPos, this.pos);
                    toSun.normalize();
                    this.shadowOffset = toSun.mult(-this.size * 0.15);
                } else {
                    this.shadowOffset = createVector(this.size * -0.075, this.size * 0.075);
                }
            }
            ellipse(this.shadowOffset.x, this.shadowOffset.y, this.size * 1.05, this.size * 1.05);
        }

        pop(); // Restore overall matrix
    }

    /** Helper function to draw the top or bottom half of the textured planet */
    drawPlanetHalf(isTopHalf) {
        push(); // Isolate this half's drawing and rotation
        rotate(this.currentRotation); // Apply visual rotation

        let r = this.size / 2;
        noStroke();
        noiseDetail(4, this.noisePersistence);

        const bandHeight = 4; // Drawing resolution
        let yStart = isTopHalf ? -r : 0; // Start Y for top or bottom half
        let yEnd = isTopHalf ? 0 : r;   // End Y for top or bottom half

        // Loop through vertical bands for the specified half
        for (let y = yStart; y < yEnd; y += bandHeight) {
            let bandR = sqrt(max(0, r * r - y * y)); // Width (radius) of the planet slice at this Y
             if (bandR <= 0) continue;

            // Loop horizontally across the band
            for (let x = -bandR; x < bandR; x += bandHeight) {
                // Calculate noise coordinates (texture fixed to surface)
                let angle = atan2(y, x);
                let distFromCenter = dist(0, 0, x, y);
                let noiseX = (cos(angle) * distFromCenter) * this.noiseScale + this.featureRand;
                let noiseY = (sin(angle) * distFromCenter) * this.noiseScale + this.featureRand;
                let noiseZ = this.featureRand * 0.1;

                // Determine color from noise and palette
                let n = noise(noiseX, noiseY, noiseZ);
                let paletteIndex = floor(n * (this.palette.length - 1));
                let lerpFactor = (n * (this.palette.length - 1)) % 1;
                let col1 = this.palette[paletteIndex];
                let col2 = this.palette[min(paletteIndex + 1, this.palette.length - 1)];
                let bandColor = lerpColor(col1, col2, lerpFactor);

                fill(bandColor);
                rect(x, y, bandHeight, bandHeight); // Draw texture segment
            }
        }
        noiseDetail(4, 0.5); // Reset noise detail
        pop(); // Restore from this half's rotation
    }


    /** Helper function to draw the complete ring system using dense ellipses */
    drawFullRings() {
        push(); // Isolate ring transformations
        rotate(this.ringAngle); // Apply the fixed ring tilt

        noFill();
        strokeWeight(1); // Thin segments for density

        // Loop through ring segments from inner to outer radius
        for (let i = 0; i < this.numRingSegments; i++) {
            let segmentProgress = i / this.numRingSegments;
            let currentRad = lerp(this.ringInnerRad, this.ringOuterRad, segmentProgress);

            // Determine color and alpha using noise for variation
            let noiseVal = noise(segmentProgress * 5 + this.featureRand, this.featureRand + 10);
            let segmentColor = lerpColor(this.ringColor1, this.ringColor2, noiseVal);
            let segmentAlpha = lerp(80, 180, noise(segmentProgress * 3 + this.featureRand + 20));
            stroke(red(segmentColor), green(segmentColor), blue(segmentColor), segmentAlpha);

            // Draw a full ellipse, squashed vertically by perspective
            ellipse(0, 0, currentRad * 2, currentRad * 2 * this.ringPerspective);
        }

        pop(); // Restore matrix (removes ring rotation)
    }

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
        return p;
    }

} // End of Planet Class