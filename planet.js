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
        this.featureColor2 = color( (c1r * 0.8 + random(50)) % 255, (c1g * 0.7 + random(60)) % 255, (c1b * 0.9 + random(40)) % 255);

        this.palette = [this.baseColor, this.featureColor1, this.featureColor2];

        // Deterministic properties using random() (seeded by StarSystem)
        this.featureRand = random(10000); // Offset for noise calculations
        this.noiseScale = random(0.8, 3.5) / r; // Scale for surface noise based on size
        this.noisePersistence = random(0.4, 0.6); // Noise detail factor

        this.hasAtmosphere = random() < 0.4; // Less frequent
        this.atmosphereColor = this.hasAtmosphere ? color(random(150, 220), random(150, 220), random(200, 255), random(5, 15)) : null;

        // --- Inhabited Planet Properties ---
        this.isInhabited = random() < 0.3; // 30% chance of being inhabited
        this.cityLightsColor = color(255, 240, 180, 200); // Default warm yellow/amber lights (may be changed based on pattern type)
        this.cityLightsDensity = random(0.3, 0.8); // Controls how dense the city lights appear
        this.cityLightsBuffer = null; // Buffer will be created when needed
        // ---
        
        // --- Rings Restored ---
        this.hasRings = random() < 0.25;
        if (this.hasRings) {
            this.ringAngle = random(-PI / 6, PI / 6);
            this.ringPerspective = map(abs(this.ringAngle), 0, PI / 6, 0.15, 0.4);
            this.ringInnerRad = r * random(1.2, 1.5);
            this.ringOuterRad = this.ringInnerRad * random(1.3, 1.8);
            this.numRingSegments = floor(random(60, 160));
            this.ringColor1 = lerpColor(this.baseColor, color(200), 0.6);
            this.ringColor2 = lerpColor(this.featureColor1, color(150), 0.6);
        }

        // Enable slow rotation for all planets
        this.rotationSpeed = random(0.0002, 0.0008); // Ultra slow rotation speed
        this.currentRotation = 0;

        // Initialize shadowOffset to null. It will be set later.
        this.shadowOffset = null;
        
        // Flag to track buffer creation status
        this.buffersCreated = false;
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
    
    /**
     * Creates all the necessary graphics buffers and pre-renders
     * the planet components for efficient drawing
     */
    createBuffers() {
        if (this.buffersCreated) return;
        
        // Size calculations for buffers
        const bufferSize = Math.ceil(this.size * 1.2);
        const ringBufferSize = this.hasRings ? Math.ceil(this.ringOuterRad * 2.2) : 0;
        
        // For inhabited planets with atmosphere, we need a larger buffer to contain the city glow
        let atmBufferSizeFactor = 1.0 + (5 * 0.04);
        if (this.isInhabited) {
            // Ensure atmosphere buffer is big enough to contain the city glow (which is r * 2.1)
            atmBufferSizeFactor = Math.max(atmBufferSizeFactor, 2.1);
        }
        const atmBufferSize = this.hasAtmosphere ? Math.ceil(this.size * atmBufferSizeFactor * 1.2) : 0;
        
        // Create main planet buffer
        this.planetBuffer = createGraphics(bufferSize, bufferSize);
        this.renderPlanetTexture();
        
        // Create rings buffer only if needed
        if (this.hasRings) {
            this.ringsBuffer = createGraphics(ringBufferSize, ringBufferSize);
            this.renderRings();
        }
        
        // Create atmosphere buffer if needed
        if (this.hasAtmosphere) {
            // Make sure atmosphere buffer is large enough for the outermost layer
            // and properly centered on the planet
            this.atmosphereBuffer = createGraphics(atmBufferSize, atmBufferSize);
            this.renderAtmosphere();
        }
        
        // Create city lights buffer for inhabited planets
        if (this.isInhabited && !this.isSun) {
            this.renderCityLights();
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
        
        if (this.isInhabited && this.cityLightsBuffer) {
            this.cityLightsBuffer.remove();
            this.cityLightsBuffer = null;
        }
        
        this.buffersCreated = false;
    }
    
    /**
     * Renders the planet texture to the buffer
     */
    renderPlanetTexture() {
        const pg = this.planetBuffer;
        const bufferCenter = pg.width / 2;
        const r = this.size / 2;
        
        // Clear the buffer and set up
        pg.clear();
        pg.noStroke();
        pg.noiseDetail(3, this.noisePersistence);
        
        // Draw a solid base circle first
        pg.fill(this.baseColor);
        pg.ellipse(bufferCenter, bufferCenter, this.size, this.size);
        
        // Set resolution based on planet size
        const bandHeight = max(2, Math.ceil(4 * (100 / this.size)));
        
        // Loop through vertical bands (full planet)
        for (let y = -r; y < r; y += bandHeight) {
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
                
                pg.fill(bandColor);
                pg.rect(bufferCenter + x, bufferCenter + y, bandHeight, bandHeight);
            }
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
        
        // Draw ring segments
        for (let i = 0; i < this.numRingSegments; i++) {
            const segmentProgress = i / this.numRingSegments;
            const currentRad = lerp(this.ringInnerRad, this.ringOuterRad, segmentProgress);
            
            // Use noise for color variation
            const noiseVal = pg.noise(segmentProgress * 5 + this.featureRand, this.featureRand + 10);
            const segmentColor = lerpColor(this.ringColor1, this.ringColor2, noiseVal);
            const segmentAlpha = lerp(80, 180, pg.noise(segmentProgress * 3 + this.featureRand + 20));
            
            pg.stroke(red(segmentColor), green(segmentColor), blue(segmentColor), segmentAlpha);
            pg.strokeWeight(1);
            
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
            
            // Calculate diameter for this atmosphere layer
            const layerDiameter = this.size * atmSizeFactor;
            
            // Draw the atmosphere layer perfectly centered in the buffer
            pg.fill(red(this.atmosphereColor), green(this.atmosphereColor), blue(this.atmosphereColor), atmAlpha);
            pg.ellipse(bufferCenter, bufferCenter, layerDiameter, layerDiameter);
            
            // Debug outline
            // pg.stroke(255);
            // pg.noFill();
            // pg.ellipse(bufferCenter, bufferCenter, layerDiameter, layerDiameter);
        }
        
        // Debug: Draw center point and buffer edge markers
        // pg.fill(255, 0, 0);
        // pg.ellipse(bufferCenter, bufferCenter, 4, 4);
        // pg.stroke(255, 255, 0);
        // pg.noFill();
        // pg.rect(0, 0, pg.width-1, pg.height-1);
    }

    /**
     * Renders the city lights for inhabited planets with geometric patterns and structures
     */
    renderCityLights() {
        if (!this.isInhabited || this.isSun) return;
        
        // Make city lights buffer same size as planet buffer to avoid mismatches
        const bufferSize = Math.ceil(this.size * 1.2); // Same as planetBuffer size
        const pg = createGraphics(bufferSize, bufferSize);
        const bufferCenter = pg.width / 2;
        const r = this.size / 2;
        
        // Clear the buffer
        pg.clear();
        
        // Set fine noise detail for more detailed structures
        pg.noiseDetail(5, 0.35);
        
        // Choose a civilization pattern type (0-3) based on featureRand
        const patternType = Math.floor((this.featureRand * 122.27) % 4);
        
        // Set colors based on civilization type to add variety
        let primaryColor, secondaryColor;
        switch (patternType) {
            case 0: // Warm/amber - standard
                primaryColor = color(255, 240, 180, 180);
                secondaryColor = color(255, 220, 140, 160);
                break;
            case 1: // Cooler/blueish - advanced tech
                primaryColor = color(220, 240, 255, 170);
                secondaryColor = color(180, 200, 255, 150);
                break;
            case 2: // Warm/reddish - older civilization
                primaryColor = color(255, 220, 160, 180);
                secondaryColor = color(255, 200, 130, 160);
                break;
            case 3: // Greenish tint - alien/unique
                primaryColor = color(220, 255, 220, 170);
                secondaryColor = color(180, 245, 190, 150);
                break;
        }
        
        this.cityLightsColor = primaryColor; // Update the main color
        
        // Smaller resolution for detailed structures
        const bandHeight = max(2, Math.ceil(3 * (80 / this.size)));
        
        // Generate civilization hubs - define core city centers
        const cityHubs = [];
        const numHubs = floor(r / 80) + floor(random(2, 5));
        
        for (let i = 0; i < numHubs; i++) {
            // Distribute hubs across planet's surface with clustering tendencies
            let hubAngle = (i / numHubs) * TWO_PI + random(-0.3, 0.3);
            // Vary the distance from center but avoid edges
            let hubDist = random(r * 0.3, r * 0.85);
            let hubSize = random(r * 0.1, r * 0.25);
            
            cityHubs.push({
                x: cos(hubAngle) * hubDist,
                y: sin(hubAngle) * hubDist,
                size: hubSize,
                density: random(0.6, 1.0)
            });
        }
        
        // Draw the base grid/cells of the civilization - cover the planet surface
        for (let y = -r; y < r; y += bandHeight) {
            const bandR = sqrt(max(0, r * r - y * y));
            if (bandR <= 0) continue;
            
            for (let x = -bandR; x < bandR; x += bandHeight) {
                const worldX = bufferCenter + x;
                const worldY = bufferCenter + y;
                const angle = atan2(y, x);
                const distFromCenter = dist(0, 0, x, y);
                
                // Use multiple noise layers for more varied patterns
                const baseNoiseX = distFromCenter * this.noiseScale * 0.5 + this.featureRand * 3.1;
                const baseNoiseY = angle * 2 + this.featureRand * 2.4;
                const detailNoiseX = x * this.noiseScale * 0.07 + this.featureRand * 1.3;
                const detailNoiseY = y * this.noiseScale * 0.07 + this.featureRand * 7.2;
                
                // Blend different noise patterns to create more organic distribution
                const baseNoise = pg.noise(baseNoiseX, baseNoiseY);
                const detailNoise = pg.noise(detailNoiseX, detailNoiseY);
                const combinedNoise = (baseNoise * 0.6) + (detailNoise * 0.4);
                
                // Influence from city hubs (proximity increases light density)
                let hubInfluence = 0;
                for (const hub of cityHubs) {
                    const hubDist = dist(x, y, hub.x, hub.y);
                    if (hubDist < hub.size) {
                        // Stronger influence closer to hub center with falloff
                        hubInfluence += map(hubDist, 0, hub.size, hub.density, 0);
                    }
                }
                hubInfluence = constrain(hubInfluence, 0, 0.8);
                
                // Light density threshold boosted by hub proximity
                const densityThreshold = 1 - ((this.cityLightsDensity * 0.5) + hubInfluence);
                
                // Generate various city light elements based on the noise values
                if (combinedNoise > densityThreshold) {
                    // Brightness varies with noise and hub influence
                    const brightness = map(combinedNoise + hubInfluence, densityThreshold, 1.5, 70, 200);
                    const isNearHub = hubInfluence > 0.2;
                    
                    // Structure type based on noise and pattern type
                    const structureType = (combinedNoise * 10 + baseNoise * 5) % 1;
                    
                    // Draw different structural elements based on pattern and noise
                    if (structureType < 0.25) {
                        // Small point lights (buildings)
                        pg.noStroke();
                        pg.fill(red(primaryColor), green(primaryColor), blue(primaryColor), brightness * 0.8);
                        const dotSize = isNearHub ? bandHeight * 0.7 : bandHeight * 0.4;
                        pg.ellipse(worldX, worldY, dotSize, dotSize);
                    } 
                    else if (structureType < 0.5) {
                        // Short line segments (roads/connections)
                        const lineAngle = (angle + (baseNoise * PI)) % TWO_PI;
                        pg.stroke(red(secondaryColor), green(secondaryColor), blue(secondaryColor), brightness * 0.9);
                        pg.strokeWeight(bandHeight * 0.4);
                        const lineLength = isNearHub ? bandHeight * 2 : bandHeight * 1.2;
                        pg.line(
                            worldX - cos(lineAngle) * lineLength/2, 
                            worldY - sin(lineAngle) * lineLength/2,
                            worldX + cos(lineAngle) * lineLength/2, 
                            worldY + sin(lineAngle) * lineLength/2
                        );
                    } 
                    else if (structureType < 0.7) {
                        // Urban blocks/squares
                        pg.noStroke();
                        pg.fill(red(primaryColor), green(primaryColor), blue(primaryColor), brightness * 0.7);
                        const blockSize = isNearHub ? bandHeight * 1.2 : bandHeight * 0.8;
                        pg.rect(worldX - blockSize/2, worldY - blockSize/2, blockSize, blockSize);
                        
                        // Add interior detail to blocks
                        if (isNearHub && random() > 0.5) {
                            pg.fill(red(secondaryColor), green(secondaryColor), blue(secondaryColor), brightness * 0.9);
                            pg.rect(worldX - blockSize*0.3, worldY - blockSize*0.3, blockSize*0.6, blockSize*0.6);
                        }
                    } 
                    else {
                        // Scattered points (suburbs/outskirts)
                        pg.noStroke();
                        for (let i = 0; i < 3; i++) {
                            const offsetX = random(-bandHeight, bandHeight);
                            const offsetY = random(-bandHeight, bandHeight);
                            const scatterBrightness = brightness * map(dist(0, 0, offsetX, offsetY), 0, bandHeight*1.4, 1, 0.4);
                            pg.fill(red(primaryColor), green(primaryColor), blue(primaryColor), scatterBrightness);
                            pg.ellipse(worldX + offsetX, worldY + offsetY, bandHeight * 0.3, bandHeight * 0.3);
                        }
                    }
                    
                    // Add hub-specific detailed structures
                    if (isNearHub && hubInfluence > 0.5 && random() > 0.8) {
                        // Major city centers - add geometric patterns
                        const patternSize = bandHeight * random(2, 4);
                        if (patternType === 0 || patternType === 2) {
                            // Concentric circles for warm/traditional civilizations
                            pg.noFill();
                            pg.stroke(red(secondaryColor), green(secondaryColor), blue(secondaryColor), brightness * 0.8);
                            pg.strokeWeight(bandHeight * 0.3);
                            pg.ellipse(worldX, worldY, patternSize * 0.7, patternSize * 0.7);
                            pg.strokeWeight(bandHeight * 0.2);
                            pg.ellipse(worldX, worldY, patternSize, patternSize);
                        } else {
                            // Grid/angular patterns for cooler/advanced civilizations
                            pg.stroke(red(secondaryColor), green(secondaryColor), blue(secondaryColor), brightness * 0.8);
                            pg.strokeWeight(bandHeight * 0.3);
                            pg.line(worldX - patternSize/2, worldY - patternSize/2, worldX + patternSize/2, worldY + patternSize/2);
                            pg.line(worldX + patternSize/2, worldY - patternSize/2, worldX - patternSize/2, worldY + patternSize/2);
                        }
                    }
                }
            }
        }
        
        // Draw connecting transport/highway lines between hubs
        pg.noFill();
        for (let i = 0; i < cityHubs.length; i++) {
            for (let j = i + 1; j < cityHubs.length; j++) {
                const hub1 = cityHubs[i];
                const hub2 = cityHubs[j];
                const hubDist = dist(hub1.x, hub1.y, hub2.x, hub2.y);
                
                // Only connect reasonably close hubs
                if (hubDist < r * 0.7) {
                    const alpha = map(hubDist, 0, r * 0.7, 150, 70);
                    pg.stroke(red(secondaryColor), green(secondaryColor), blue(secondaryColor), alpha);
                    pg.strokeWeight(bandHeight * 0.6);
                    
                    // Draw slightly curved connections with subtle variations
                    const midX = (hub1.x + hub2.x)/2;
                    const midY = (hub1.y + hub2.y)/2;
                    const perpX = -(hub2.y - hub1.y) * 0.2;
                    const perpY = (hub2.x - hub1.x) * 0.2;
                    const ctrlX = midX + perpX * ((this.featureRand * 7.3) % 1 - 0.5);
                    const ctrlY = midY + perpY * ((this.featureRand * 9.1) % 1 - 0.5);
                    
                    pg.beginShape();
                    pg.vertex(bufferCenter + hub1.x, bufferCenter + hub1.y);
                    pg.quadraticVertex(
                        bufferCenter + ctrlX, 
                        bufferCenter + ctrlY, 
                        bufferCenter + hub2.x, 
                        bufferCenter + hub2.y
                    );
                    pg.endShape();
                }
            }
        }
        
        // No global glow - removing this fixes the offset glow issue
        
        // Reset noise detail
        pg.noiseDetail(4, 0.5);
        
        // Store the city lights buffer
        this.cityLightsBuffer = pg;
    }
    
    /**
     * Updates planet rotation over time
     */
    update() {
        // Increment rotation based on rotation speed
        this.currentRotation += this.rotationSpeed;
        
        // Keep rotation within 0 to TWO_PI for efficiency
        if (this.currentRotation > TWO_PI) {
            this.currentRotation -= TWO_PI;
        }
    }

    draw(sunPos) {
        // Create buffers on first draw
        if (!this.buffersCreated) {
            this.createBuffers();
        }
        
        // Compute shadow if needed
        if (!this.shadowOffset) {
            this.computeShadowOffset(sunPos);
        }
        
        push();
        // Translate to planet's position in world space
        translate(this.pos.x, this.pos.y);
        
        // Draw atmosphere if present (behind planet) - atmosphere is stationary and doesn't rotate
        if (this.hasAtmosphere && this.atmosphereBuffer) {
            const atmSize = this.atmosphereBuffer.width;
            
            // Center atmosphere precisely on the planet's center (0,0 in local coordinates)
            image(this.atmosphereBuffer, -atmSize/2, -atmSize/2);
        }
        
        // Apply planet rotation for planet surface only
        rotate(this.currentRotation);
        
        if (this.hasRings) {
            this.drawRingedPlanet();
        } else {
            // For planets without rings, simply draw the planet buffer
            const bufferSize = this.planetBuffer.width;
            image(this.planetBuffer, -bufferSize/2, -bufferSize/2);
        }
        
        // Draw city lights before resetting rotation so they rotate with the planet
        if (!this.isSun && this.isInhabited && this.cityLightsBuffer && this.shadowOffset) {
            // Draw the city lights aligned with the planet's current rotation
            drawingContext.save();
            
            // First, create a gradient transition from day to night side
            // This helps blend city lights into the day side subtly
            const transitionSize = this.size * 0.55;
            const fullShadowSize = this.size * 0.5;
            
            // Create a clipping path for the city lights area, adjusted for rotation
            // Since we're already rotated, we need to account for that in the shadow position
            // Calculate shadow position in current rotated coordinate system
            const rotatedShadowX = this.shadowOffset.x * cos(-this.currentRotation) - this.shadowOffset.y * sin(-this.currentRotation);
            const rotatedShadowY = this.shadowOffset.x * sin(-this.currentRotation) + this.shadowOffset.y * cos(-this.currentRotation);
            
            // Create a clipping path for the city lights area
            drawingContext.beginPath();
            drawingContext.arc(rotatedShadowX, rotatedShadowY, transitionSize, 0, TWO_PI);
            drawingContext.clip();
            
            // Draw the city lights (already properly rotated with the planet)
            const bufferSize = this.cityLightsBuffer.width;
            image(this.cityLightsBuffer, -bufferSize/2, -bufferSize/2);
            
            // Apply gradient on top for smooth transition to day side
            drawingContext.globalCompositeOperation = 'destination-out';
            const transitionGradient = drawingContext.createRadialGradient(
                rotatedShadowX, rotatedShadowY, fullShadowSize,
                rotatedShadowX, rotatedShadowY, transitionSize
            );
            transitionGradient.addColorStop(0, 'rgba(0,0,0,0)'); // No fadeout in shadow
            transitionGradient.addColorStop(1, 'rgba(0,0,0,1)'); // Fully transparent in light
            
            drawingContext.fillStyle = transitionGradient;
            drawingContext.fillRect(-bufferSize, -bufferSize, bufferSize * 2, bufferSize * 2);
            
            // Reset global composition operation and restore context
            drawingContext.globalCompositeOperation = 'source-over';
            drawingContext.restore();
        }
        
        // Reset rotation to draw stationary shadow on top
        rotate(-this.currentRotation);
        
        // Draw stationary shadow on top of the planet (semi-transparent to let city lights show through)
        if (!this.isSun && this.shadowOffset) {
            noStroke();
            
            // Create a gradient shadow effect
            const shadowSize = this.size * 0.525;
            const outerShadowSize = this.size * 0.55;
            
            // Shadow gradient is more complex for inhabited planets
            if (this.isInhabited) {
                // Base semi-transparent shadow layer
                fill(0, 0, 0, 30);
                ellipse(this.shadowOffset.x, this.shadowOffset.y, this.size * 1.05, this.size * 1.05);
                
                // Save context before custom gradient
                drawingContext.save();
                
                // Create shadow gradient
                const shadowGradient = drawingContext.createRadialGradient(
                    this.shadowOffset.x, this.shadowOffset.y, shadowSize * 0.5,
                    this.shadowOffset.x, this.shadowOffset.y, shadowSize
                );
                shadowGradient.addColorStop(0, 'rgba(0,0,0,0.35)');
                shadowGradient.addColorStop(1, 'rgba(0,0,0,0)');
                
                drawingContext.fillStyle = shadowGradient;
                drawingContext.beginPath();
                drawingContext.arc(this.shadowOffset.x, this.shadowOffset.y, shadowSize, 0, TWO_PI);
                drawingContext.fill();
                
                // Restore context after gradient
                drawingContext.restore();
            } else {
                // Simpler shadow for uninhabited planets
                fill(0, 0, 0, 55);
                ellipse(this.shadowOffset.x, this.shadowOffset.y, this.size * 1.05, this.size * 1.05);
            }
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
        
        // 1. Draw the back half of the planet
        const bottomHalf = bufferH * 0.55;
        const bottomY = destY + bufferH * 0.45;
        image(
            this.planetBuffer, 
            destX, bottomY,           // Destination position
            bufferW, bottomHalf,      // Destination size
            0, bufferH * 0.45,        // Source position
            bufferW, bottomHalf       // Source size
        );
        
        // 2. Draw the rings on top
        const ringsSize = this.ringsBuffer.width;
        image(this.ringsBuffer, -ringsSize/2, -ringsSize/2);
        
        // 3. Draw the top portion of the planet on top of the rings
        const topHeight = bufferH * 0.5;
        image(
            this.planetBuffer,
            destX, destY,             // Destination position
            bufferW, topHeight,       // Destination size
            0, 0,                     // Source position
            bufferW, topHeight        // Source size
        );
        
        // City lights are drawn separately after rotation is reset in the main draw method
        // This method only handles the planet textures and rings
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
            currentRotation: this.currentRotation,
            isInhabited: this.isInhabited,
            cityLightsColor: this.cityLightsColor ? this.cityLightsColor.toString() : null,
            cityLightsDensity: this.cityLightsDensity
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
        p.isInhabited = data.isInhabited;
        p.cityLightsColor = data.cityLightsColor && typeof color === "function" ? color(data.cityLightsColor) : null;
        p.cityLightsDensity = data.cityLightsDensity;
        return p;
    }
} // End of Planet Class