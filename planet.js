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
     * @param {string} systemName - Name of the star system for generating planet name.
     * @param {number} planetIndex - Index of the planet in the system (0 for sun, 1+ for planets).
     */
    constructor(worldX, worldY, size, color1, color2, systemName = "Unknown", planetIndex = 0) {
        this.pos = createVector(worldX, worldY);
        this.size = size;
        this.radius = size * 0.5; // Cache radius
        this.radiusSq = this.radius * this.radius; // Cache squared radius for distance checks

        // Store base colors provided by StarSystem
        this.baseColor = color1 || color(random(80, 180), random(80, 180), random(80, 180));
        // Choose a more contrasting feature color (prefer complementary direction)
        if (color2) {
            this.featureColor1 = color2;
        } else {
            const c1r = red(this.baseColor), c1g = green(this.baseColor), c1b = blue(this.baseColor);
            // Build a complementary-ish accent color with slight randomness
            const accent = color(
                (255 - c1r + random(-40, 40) + 255) % 255,
                (255 - c1g + random(-40, 40) + 255) % 255,
                (255 - c1b + random(-40, 40) + 255) % 255
            );
            // Lerp strongly toward the accent to increase contrast
            this.featureColor1 = lerpColor(this.baseColor, accent, random(0.6, 1.0));
        }
        // Generate a second feature color that is intentionally different
        const c1r = red(this.baseColor), c1g = green(this.baseColor), c1b = blue(this.baseColor);
        const f1r = red(this.featureColor1), f1g = green(this.featureColor1), f1b = blue(this.featureColor1);
        const avg = (c1r + c1g + c1b) / 3;
        if (avg > 140) {
            // Bright base -> make featureColor2 a much darker accent
            this.featureColor2 = color(
                Math.max(0, Math.floor(f1r * random(0.18, 0.45))),
                Math.max(0, Math.floor(f1g * random(0.18, 0.45))),
                Math.max(0, Math.floor(f1b * random(0.18, 0.45)))
            );
        } else {
            // Dark base -> make featureColor2 a much lighter accent
            this.featureColor2 = color(
                Math.min(255, Math.floor(f1r + random(80, 160))),
                Math.min(255, Math.floor(f1g + random(80, 160))),
                Math.min(255, Math.floor(f1b + random(80, 160)))
            );
        }

        // Add a third, intentionally different accent color for richer palettes
        const f2r = red(this.featureColor2), f2g = green(this.featureColor2), f2b = blue(this.featureColor2);
        const avgR = Math.floor((c1r + f1r + f2r) / 3);
        const avgG = Math.floor((c1g + f1g + f2g) / 3);
        const avgB = Math.floor((c1b + f1b + f2b) / 3);
        // Create a contrasting third color by inverting the channel averages and adding a bias
        const thirdR = Math.min(255, Math.max(0, Math.floor((255 - avgR) * random(0.6, 1.0) + avgG * 0.15)));
        const thirdG = Math.min(255, Math.max(0, Math.floor((255 - avgG) * random(0.6, 1.0) + avgB * 0.15)));
        const thirdB = Math.min(255, Math.max(0, Math.floor((255 - avgB) * random(0.6, 1.0) + avgR * 0.15)));
        this.featureColor3 = color(thirdR, thirdG, thirdB);
        this.palette = [this.baseColor, this.featureColor1, this.featureColor2, this.featureColor3];

        // Deterministic properties using random() (seeded by StarSystem)
        this.featureRand = random(10000); // Offset for noise calculations
        // Amplified noise parameters for more dramatic surface patterns
        this.noiseScale = random(1.5, 6.0) / this.radius; // Scale for surface noise based on size
        this.noisePersistence = random(0.55, 0.9); // Stronger persistence for bolder features

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
            this.ringInnerRad = this.radius * random(1.2, 1.5);
            this.ringOuterRad = this.ringInnerRad * random(1.3, 1.8);
            this.numRingSegments = Math.floor(random(60, 160));
            this.ringColor1 = lerpColor(this.baseColor, color(200), 0.6);
            this.ringColor2 = lerpColor(this.featureColor1, color(150), 0.6);
        }

        // Enable slow rotation for all planets
        this.rotationSpeed = random(0.0002, 0.0008); // Ultra slow rotation speed
        this.currentRotation = 0;

        // Initialize shadowOffset to null. It will be set later.
        this.shadowOffset = null;
        
        // Generate planet name etymologically related to system name
        this.name = this.generatePlanetName(systemName, planetIndex);
        this.systemName = systemName;
        this.planetIndex = planetIndex;
        
        // Flag to track buffer creation status
        this.buffersCreated = false;
    }

    /**
     * Generates a planet name etymologically related to the system name.
     * Uses Latin/Greek roots and Roman numerals for uniqueness.
     * @param {string} systemName - The name of the star system.
     * @param {number} planetIndex - Index of the planet (0 = sun, 1+ = planets).
     * @returns {string} The generated planet name.
     */
    generatePlanetName(systemName, planetIndex) {
        if (planetIndex === 0) return systemName; // Sun keeps system name
        
        // Etymological roots based on system name
        const roots = {
            'Sol': ['Sol', 'Helio', 'Phoeb'],
            'Alpha': ['Prim', 'Prot', 'Arch'],
            'Beta': ['Secund', 'Deut', 'Vice'],
            'Gamma': ['Tert', 'Gamm', 'Tri'],
            'Delta': ['Quart', 'Delt', 'Tet'],
            'Terra': ['Geo', 'Tell', 'Chthon'],
            'Aqua': ['Hydr', 'Aqu', 'Naut'],
            'Nova': ['Nov', 'Kai', 'Ne'],
            'Stella': ['Aster', 'Stell', 'Sid'],
            'Orion': ['Hunt', 'Ori', 'Sagitt'],
            'Ursa': ['Bear', 'Ark', 'Urs'],
            'Draco': ['Drag', 'Drac', 'Serp'],
            'Lyra': ['Lyr', 'Mel', 'Chord'],
            'Vega': ['Veg', 'Luc', 'Bright'],
            'Sirius': ['Sir', 'Can', 'Dog'],
            'Rigel': ['Rig', 'Foot', 'Ped'],
            'Betelgeuse': ['Bet', 'Arm', 'Should'],
            'Altair': ['Alt', 'Eagl', 'Aquil'],
            'Deneb': ['Den', 'Tail', 'Caud'],
            'Polaris': ['Pol', 'North', 'Septentr'],
            'Arcturus': ['Arc', 'Bear', 'Guard'],
            'Spica': ['Spic', 'Ear', 'Spike'],
            'Antares': ['Ant', 'Heart', 'Scorp'],
            'Vulpecula': ['Vulp', 'Fox', 'Little'],
            'Cassiopeia': ['Cass', 'Queen', 'Seat'],
            'Andromeda': ['Andr', 'Woman', 'Chain'],
            'Pegasus': ['Peg', 'Wing', 'Horse'],
            'Perseus': ['Pers', 'Hero', 'Rescuer'],
            'Hercules': ['Herc', 'Strong', 'Lab'],
            'Ulysses': ['Uly', 'Wise', 'Odys'],
            'Achilles': ['Ach', 'Heel', 'Swift'],
            'Odyssey': ['Odys', 'Journey', 'Quest'],
            'Icarus': ['Icar', 'Fly', 'Wax'],
            'Daedalus': ['Daed', 'Craft', 'Maze'],
            'Minos': ['Min', 'King', 'Bull'],
            'Theseus': ['Thes', 'Athen', 'Thread'],
            'Ares': ['Are', 'War', 'Mars'],
            'Aphrodite': ['Aphr', 'Love', 'Venus'],
            'Apollo': ['Apol', 'Light', 'Sun'],
            'Artemis': ['Arte', 'Hunt', 'Moon'],
            'Athena': ['Athe', 'Wise', 'Minerv'],
            'Demeter': ['Dem', 'Earth', 'Corn'],
            'Dionysus': ['Dion', 'Wine', 'Bacchus'],
            'Hades': ['Had', 'Under', 'Pluto'],
            'Hephaestus': ['Heph', 'Forge', 'Vulcan'],
            'Hera': ['Her', 'Queen', 'Jun'],
            'Hermes': ['Herm', 'Mess', 'Merc'],
            'Poseidon': ['Pose', 'Sea', 'Nept'],
            'Zeus': ['Ze', 'Sky', 'Jup']
        };

        // Roman numerals for planet numbering
        const romanNumerals = ['', 'I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII', 'IX', 'X'];
        
        // Get root based on system name
        // If the system name has multiple words (e.g. "Alpha Centauri"),
        // only use the first token for stemming so the second part is ignored.
        const stemName = (typeof systemName === 'string' && systemName.trim().indexOf(' ') !== -1)
            ? systemName.trim().split(/\s+/)[0]
            : systemName;
        // Default root to the stem (first token). If no special root matches,
        // this prevents falling back to the full multi-word system name.
        let root = stemName;
        for (let key in roots) {
            if (stemName.toLowerCase().includes(key.toLowerCase())) {
                const variants = roots[key];
                root = variants[Math.floor(this.featureRand * variants.length) % variants.length];
                break;
            }
        }
        
        // Generate suffix based on planet properties
        let suffix = '';
        if (this.isInhabited) {
            suffix = 'Hab';
        } else if (this.hasRings) {
            suffix = 'Ring';
        } else if (this.hasAtmosphere) {
            suffix = 'Atmos';
        } else {
            const suffixes = ['Prime', 'Secund', 'Tert', 'Major', 'Minor', 'Max', 'Min', 'Cent', 'Orb'];
            suffix = suffixes[Math.floor(this.featureRand * suffixes.length) % suffixes.length];
        }
        
        // Combine root, suffix, and Roman numeral
        const romanNum = romanNumerals[Math.min(planetIndex, romanNumerals.length - 1)];
        return `${root}${suffix} ${romanNum}`.trim();
    }

    // Call this method once you know the sun's position.
    computeShadowOffset(sunPos) {
        if (sunPos && sunPos instanceof p5.Vector) {
            const dx = sunPos.x - this.pos.x;
            const dy = sunPos.y - this.pos.y;
            const len = Math.sqrt(dx * dx + dy * dy) || 1; // Avoid division by zero
            const scale = -this.size * 0.15 / len;
            this.shadowOffset = createVector(dx * scale, dy * scale);
        } else {
            // Fallback default
            this.shadowOffset = createVector(this.size * -0.075, this.size * 0.075);
        }
        
        // Pre-calculate shadow drawing constants
        this._shadowSize = this.size * 1.05;
        this._shadowRadius = this._shadowSize * 0.5;
        this._shadowGradientInner = this._shadowSize * 0.25;
        this._shadowGradientOuter = this._shadowSize * 0.5;
    }

    // Add a static method that creates the sun (at 0,0)
    static createSun(systemName = "Unknown") {
        let sunSize = 400;  // Adjust as needed
        let sunColor1 = color(255, 255, 100);  // Bright yellow
        let sunColor2 = color(255, 200, 100);
        let sun = new Planet(0, 0, sunSize, sunColor1, sunColor2, systemName, 0);
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
        const atmBufferSize = this.hasAtmosphere ? Math.ceil(this.size * atmBufferSizeFactor) : 0;
        
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
        const bufferCenter = pg.width * 0.5;
        const r = this.radius;
        const rSq = this.radiusSq;
        
        // Clear the buffer and set up
        pg.clear();
        pg.noStroke();
        // Increase octaves/persistence for richer, more dramatic detail
        pg.noiseDetail(6, this.noisePersistence);
        
        // Draw a solid base circle first
        pg.fill(this.baseColor);
        pg.ellipse(bufferCenter, bufferCenter, this.size, this.size);
        
        // Set resolution based on planet size
        const bandHeight = Math.max(2, Math.ceil(400 / this.size));
        
        // Cache constants for inner loop
        const noiseScale = this.noiseScale;
        const featureRand = this.featureRand;
        // Larger Z offset to separate octave layers and avoid overly smooth noise
        const noiseZ = featureRand * 0.6;
        const paletteLen = this.palette.length;
        const paletteMaxIdx = paletteLen - 1;
        
        // Loop through vertical bands (full planet)
        for (let y = -r; y < r; y += bandHeight) {
            const ySq = y * y;
            const bandRSq = rSq - ySq;
            if (bandRSq <= 0) continue;
            const bandR = Math.sqrt(bandRSq);
            
            for (let x = -bandR; x < bandR; x += bandHeight) {
                // Optimized distance and angle calculation
                const distSq = x * x + ySq;
                const distFromCenter = Math.sqrt(distSq);
                const angle = Math.atan2(y, x);
                const cosA = Math.cos(angle);
                const sinA = Math.sin(angle);
                
                // Spherical mapping: convert local x,y to normalized sphere coordinates
                const nx = x / r; // -1..1 across the planet surface
                const ny = y / r;
                const inside = nx * nx + ny * ny;
                if (inside > 1) continue; // safety, skip pixels outside the disc

                // z component of the unit sphere (0 at limb, 1 at center)
                const nzUnit = Math.sqrt(Math.max(0, 1 - inside));

                // Use the unit sphere coordinates as 3D inputs to the noise function so
                // patterns wrap naturally around the globe and naturally compress at the limb.
                // The existing `noiseScale` was tuned earlier; invert it into a sample multiplier
                // so larger planets still get reasonable detail. We keep a small featureRand offset
                // to avoid visible seam artifacts.
                const sampleMultiplier = Math.max(0.0005, (this.radius * noiseScale) * 0.8);
                const baseNX = nx * sampleMultiplier + featureRand * 0.001;
                const baseNY = ny * sampleMultiplier + featureRand * 0.002;
                const baseNZ = nzUnit * sampleMultiplier + noiseZ;

                // Combine several noise octaves (FBM) sampled on the sphere
                const n1 = pg.noise(baseNX, baseNY, baseNZ);
                const n2 = pg.noise(baseNX * 2.0, baseNY * 2.0, baseNZ * 1.7);
                const n3 = pg.noise(baseNX * 4.0, baseNY * 4.0, baseNZ * 3.5);
                let n = n1 * 0.55 + n2 * 0.30 + n3 * 0.15;
                n = Math.min(1, Math.max(0, Math.pow(n, 1.3)));
                const nScaled = n * paletteMaxIdx;
                const paletteIndex = Math.floor(nScaled);
                const lerpFactor = nScaled - paletteIndex;
                const col1 = this.palette[paletteIndex];
                const col2 = this.palette[Math.min(paletteIndex + 1, paletteMaxIdx)];
                // Increase color contrast by biasing interpolation away from midtones
                const contrastBias = 2.6; // higher bias pushes values toward palette endpoints
                let cf = ((lerpFactor - 0.5) * contrastBias) + 0.5;
                cf = Math.min(1, Math.max(0, cf));
                let bandColor = lerpColor(col1, col2, cf);

                // Apply subtle limb-based distortion/attenuation so features feel wrapped
                // around a sphere: at the limb (nzUnit -> 0) we slightly desaturate/darken
                // and compress contrast to simulate foreshortening.
                const limbFactor = Math.pow(nzUnit, 0.9); // 1 at center, 0 at edge
                const limbDarken = 0.35 * (1 - limbFactor);
                bandColor = lerpColor(bandColor, color(0, 0, 0), limbDarken);
                
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
        const bufferCenter = pg.width * 0.5;
        
        // Clear buffer
        pg.clear();
        pg.push();
        pg.translate(bufferCenter, bufferCenter);
        pg.rotate(this.ringAngle);
        
        pg.noFill();
        
        // Cache constants for loop
        const numSegs = this.numRingSegments;
        const innerRad = this.ringInnerRad;
        const radRange = this.ringOuterRad - innerRad;
        const perspective = this.ringPerspective;
        const featureRand = this.featureRand;
        const noiseBase1 = featureRand + 10;
        const noiseBase2 = featureRand + 20;
        
        // Draw ring segments
        for (let i = 0; i < numSegs; i++) {
            const segmentProgress = i / numSegs;
            const currentRad = innerRad + radRange * segmentProgress;
            
            // Use noise for color variation
            const noiseFactor1 = segmentProgress * 5 + noiseBase1;
            const noiseVal = pg.noise(noiseFactor1, noiseBase1);
            const segmentColor = lerpColor(this.ringColor1, this.ringColor2, noiseVal);
            
            const noiseFactor2 = segmentProgress * 3 + noiseBase2;
            const segmentAlpha = 80 + 100 * pg.noise(noiseFactor2, noiseBase2);
            
            pg.stroke(red(segmentColor), green(segmentColor), blue(segmentColor), segmentAlpha);
            pg.strokeWeight(1);
            
            // Draw full ellipse with correct perspective
            const diameter = currentRad * 2;
            pg.ellipse(0, 0, diameter, diameter * perspective);
        }
        
        pg.pop();
    }
    
    /**
     * Renders the atmosphere effect to its buffer
     */
    renderAtmosphere() {
        const pg = this.atmosphereBuffer;
        const bufferCenter = pg.width * 0.5;
        
        // Clear buffer first
        pg.clear();
        pg.noStroke();
        
        // Cache color components
        const atmR = red(this.atmosphereColor);
        const atmG = green(this.atmosphereColor);
        const atmB = blue(this.atmosphereColor);
        const baseAlpha = alpha(this.atmosphereColor);
        const size = this.size;
        
        // Draw atmosphere layers from outside in
        for (let i = 5; i > 0; i--) {
            const atmSizeFactor = 1.0 + i * 0.04;
            const atmAlpha = baseAlpha * (1.0 - i * 0.15);
            
            // Calculate diameter for this atmosphere layer
            const layerDiameter = size * atmSizeFactor;
            
            // Draw the atmosphere layer perfectly centered in the buffer
            pg.fill(atmR, atmG, atmB, atmAlpha);
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
        const bufferCenter = pg.width * 0.5;
        const r = this.radius;

        // Clear the buffer
        pg.clear();

        // Set fine noise detail for more detailed structures (amplified)
        pg.noiseDetail(7, 0.45);

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
        
        // Cache color components for inner loop performance
        const primR = red(primaryColor), primG = green(primaryColor), primB = blue(primaryColor);
        const secR = red(secondaryColor), secG = green(secondaryColor), secB = blue(secondaryColor);


        // --- PLANET-WIDE FAINT NOISE TEXTURE ---
        // This covers the whole planet with faint city sprawl
        const faintBandHeight = Math.max(2, Math.ceil(3 * random(10)));
        const faintDotSize = faintBandHeight * 0.5;
        const noiseScale = this.noiseScale;
        const featureRand = this.featureRand;
        
        for (let y = -r; y < r; y += faintBandHeight) {
            const ySq = y * y;
            const bandRSq = r * r - ySq;
            if (bandRSq <= 0) continue;
            const bandR = Math.sqrt(bandRSq);
            
            for (let x = -bandR; x < bandR; x += faintBandHeight) {
                const worldX = bufferCenter + x;
                const worldY = bufferCenter + y;
                const distSq = x * x + ySq;
                const distFromCenter = Math.sqrt(distSq);
                const angle = Math.atan2(y, x);
                
                // Use the same noise logic as city lights, but no hub influence
                const baseNoiseX = distFromCenter * noiseScale * 0.2 + featureRand * 3.1;
                const baseNoiseY = angle * 2 + featureRand * 7.4;
                const detailNoiseX = x * noiseScale * 0.01 + featureRand * 1.3;
                const detailNoiseY = y * noiseScale * 0.07 + featureRand * 7.2;
                const baseNoise = pg.noise(baseNoiseX, baseNoiseY);
                const detailNoise = pg.noise(detailNoiseX, detailNoiseY);
                let combinedNoise = baseNoise * 0.6 + detailNoise * 0.4;
                // Increase contrast for faint textures
                combinedNoise = Math.min(1, Math.max(0, Math.pow(combinedNoise, 1.25)));
                
                // Lower density threshold and increase alpha for visibility
                if (combinedNoise > 0.2) {
                    // Fainter, but more visible dots
                    pg.noStroke();
                    pg.fill(primR, primG, primB, 36);
                    pg.ellipse(worldX, worldY, faintDotSize, faintDotSize);
                }
            }
        }
        // --- END PLANET-WIDE FAINT NOISE TEXTURE ---

        // Smaller resolution for detailed structures
        const bandHeight = Math.max(2, Math.ceil(240 / this.size));

        // Generate civilization hubs - define core city centers
        const cityHubs = [];
        const numHubs = Math.floor(r / 80) + Math.floor(random(2, 5));
        const TWO_PI_CONST = TWO_PI;

        for (let i = 0; i < numHubs; i++) {
            // Distribute hubs across planet's surface with clustering tendencies
            const hubAngle = (i / numHubs) * TWO_PI_CONST + random(-0.3, 0.3);
            // Vary the distance from center but avoid edges
            const hubDist = random(r * 0.3, r * 0.85);
            const hubSize = random(r * 0.1, r * 0.25);
            const hubX = Math.cos(hubAngle) * hubDist;
            const hubY = Math.sin(hubAngle) * hubDist;

            cityHubs.push({
                x: hubX,
                y: hubY,
                sizeSq: hubSize * hubSize, // Pre-calculate squared size
                size: hubSize,
                density: random(0.6, 1.0)
            });
        }
        
        // Cache constants for loops
        const densityBase = this.cityLightsDensity * 0.5;
        const rSq = r * r;
        
        // Draw the base grid/cells of the civilization - cover the planet surface
        for (let y = -r; y < r; y += bandHeight) {
            const ySq = y * y;
            const bandRSq = rSq - ySq;
            if (bandRSq <= 0) continue;
            const bandR = Math.sqrt(bandRSq);
            
            for (let x = -bandR; x < bandR; x += bandHeight) {
                const worldX = bufferCenter + x;
                const worldY = bufferCenter + y;
                const distSq = x * x + ySq;
                const distFromCenter = Math.sqrt(distSq);
                const angle = Math.atan2(y, x);
                
                // Use multiple noise layers for more varied patterns
                const baseNoiseX = distFromCenter * noiseScale * 0.5 + featureRand * 3.1;
                const baseNoiseY = angle * 2 + featureRand * 2.4;
                const detailNoiseX = x * noiseScale * 0.07 + featureRand * 1.3;
                const detailNoiseY = y * noiseScale * 0.07 + featureRand * 7.2;
                
                // Blend different noise patterns to create more organic distribution
                const baseNoise = pg.noise(baseNoiseX, baseNoiseY);
                const detailNoise = pg.noise(detailNoiseX, detailNoiseY);
                let combinedNoise = (baseNoise * 0.55) + (detailNoise * 0.45);
                // Boost and sharpen patterns for dramatic city shapes
                combinedNoise = Math.min(1, Math.max(0, Math.pow(combinedNoise, 1.35)));
                
                // Influence from city hubs (proximity increases light density)
                let hubInfluence = 0;
                for (let h = 0; h < cityHubs.length; h++) {
                    const hub = cityHubs[h];
                    const dx = x - hub.x;
                    const dy = y - hub.y;
                    const hubDistSq = dx * dx + dy * dy;
                    
                    if (hubDistSq < hub.sizeSq) {
                        const hubDist = Math.sqrt(hubDistSq);
                        // Stronger influence closer to hub center with falloff
                        const normalizedDist = hubDist / hub.size;
                        hubInfluence += hub.density * (1 - normalizedDist);
                    }
                }
                hubInfluence = Math.min(hubInfluence, 0.8);
                
                // Light density threshold boosted by hub proximity
                const densityThreshold = 1 - (densityBase + hubInfluence);
                
                // Generate various city light elements based on the noise values
                if (combinedNoise > densityThreshold) {
                    // Brightness varies with noise and hub influence
                    const brightnessFactor = (combinedNoise + hubInfluence - densityThreshold) / (1.5 - densityThreshold);
                    const brightness = 70 + brightnessFactor * 130;
                    const isNearHub = hubInfluence > 0.2;
                    
                    // Structure type based on noise and pattern type
                    const structureType = (combinedNoise * 10 + baseNoise * 5) % 1;
                    
                    // Draw different structural elements based on pattern and noise
                    if (structureType < 0.25) {
                        // Small point lights (buildings)
                        pg.noStroke();
                        pg.fill(primR, primG, primB, brightness * 0.8);
                        const dotSize = isNearHub ? bandHeight * 0.7 : bandHeight * 0.4;
                        pg.ellipse(worldX, worldY, dotSize, dotSize);
                    } 
                    else if (structureType < 0.5) {
                        // Short line segments (roads/connections)
                        const lineAngle = (angle + baseNoise * Math.PI) % TWO_PI_CONST;
                        pg.stroke(secR, secG, secB, brightness * 0.9);
                        pg.strokeWeight(bandHeight * 0.4);
                        const lineLength = isNearHub ? bandHeight * 2 : bandHeight * 1.2;
                        const halfLen = lineLength * 0.5;
                        const cosAngle = Math.cos(lineAngle);
                        const sinAngle = Math.sin(lineAngle);
                        pg.line(
                            worldX - cosAngle * halfLen, 
                            worldY - sinAngle * halfLen,
                            worldX + cosAngle * halfLen, 
                            worldY + sinAngle * halfLen
                        );
                    } 
                    else if (structureType < 0.7) {
                        // Urban blocks/squares
                        pg.noStroke();
                        pg.fill(primR, primG, primB, brightness * 0.7);
                        const blockSize = isNearHub ? bandHeight * 1.2 : bandHeight * 0.8;
                        const halfBlock = blockSize * 0.5;
                        pg.rect(worldX - halfBlock, worldY - halfBlock, blockSize, blockSize);
                        
                        // Add interior detail to blocks
                        if (isNearHub && random() > 0.5) {
                            const innerSize = blockSize * 0.6;
                            const innerOffset = blockSize * 0.3;
                            pg.fill(secR, secG, secB, brightness * 0.9);
                            pg.rect(worldX - innerOffset, worldY - innerOffset, innerSize, innerSize);
                        }
                    } 
                    else {
                        // Scattered points (suburbs/outskirts)
                        pg.noStroke();
                        const scatterSize = bandHeight * 0.3;
                        const maxDist = bandHeight * 1.4;
                        for (let i = 0; i < 3; i++) {
                            const offsetX = random(-bandHeight, bandHeight);
                            const offsetY = random(-bandHeight, bandHeight);
                            const offsetDistSq = offsetX * offsetX + offsetY * offsetY;
                            const offsetDist = Math.sqrt(offsetDistSq);
                            const scatterBrightness = brightness * (1 - 0.6 * offsetDist / maxDist);
                            pg.fill(primR, primG, primB, scatterBrightness);
                            pg.ellipse(worldX + offsetX, worldY + offsetY, scatterSize, scatterSize);
                        }
                    }
                    
                    // Add hub-specific detailed structures
                    if (isNearHub && hubInfluence > 0.5 && random() > 0.8) {
                        // Major city centers - add geometric patterns
                        const patternSize = bandHeight * random(2, 4);
                        const halfPattern = patternSize * 0.5;
                        const brightAlpha = brightness * 0.8;
                        
                        if (patternType === 0 || patternType === 2) {
                            // Concentric circles for warm/traditional civilizations
                            pg.noFill();
                            pg.stroke(secR, secG, secB, brightAlpha);
                            pg.strokeWeight(bandHeight * 0.3);
                            pg.ellipse(worldX, worldY, patternSize * 0.7, patternSize * 0.7);
                            pg.strokeWeight(bandHeight * 0.2);
                            pg.ellipse(worldX, worldY, patternSize, patternSize);
                        } else {
                            // Grid/angular patterns for cooler/advanced civilizations
                            pg.stroke(secR, secG, secB, brightAlpha);
                            pg.strokeWeight(bandHeight * 0.3);
                            const x1 = worldX - halfPattern, y1 = worldY - halfPattern;
                            const x2 = worldX + halfPattern, y2 = worldY + halfPattern;
                            pg.line(x1, y1, x2, y2);
                            pg.line(x2, y1, x1, y2);
                        }
                    }
                }
            }
        }
        
        // Draw connecting transport/highway lines between hubs
        pg.noFill();
        const maxHubDist = r * 0.7;
        for (let i = 0; i < cityHubs.length; i++) {
            for (let j = i + 1; j < cityHubs.length; j++) {
                const hub1 = cityHubs[i];
                const hub2 = cityHubs[j];
                const dx = hub2.x - hub1.x;
                const dy = hub2.y - hub1.y;
                const hubDist = Math.sqrt(dx * dx + dy * dy);
                
                // Only connect reasonably close hubs
                if (hubDist < maxHubDist) {
                    const alpha = 150 - (hubDist / maxHubDist) * 80;
                    pg.stroke(secR, secG, secB, alpha);
                    pg.strokeWeight(bandHeight * 0.6);
                    
                    // Draw slightly curved connections with subtle variations
                    const midX = (hub1.x + hub2.x) * 0.5;
                    const midY = (hub1.y + hub2.y) * 0.5;
                    const perpX = -dy * 0.2;
                    const perpY = dx * 0.2;
                    const randFactor1 = (featureRand * 7.3) % 1 - 0.5;
                    const randFactor2 = (featureRand * 9.1) % 1 - 0.5;
                    const ctrlX = midX + perpX * randFactor1;
                    const ctrlY = midY + perpY * randFactor2;
                    
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
            const halfAtm = atmSize * 0.5;
            
            // Center atmosphere precisely on the planet's center (0,0 in local coordinates)
            image(this.atmosphereBuffer, -halfAtm, -halfAtm);
        }
        
        // Apply planet rotation for planet surface only
        rotate(this.currentRotation);
        
        if (this.hasRings) {
            this.drawRingedPlanet();
        } else {
            // For planets without rings, simply draw the planet buffer
            const bufferSize = this.planetBuffer.width;
            const halfBuffer = bufferSize * 0.5;
            image(this.planetBuffer, -halfBuffer, -halfBuffer);
        }
        
        // Draw city lights before resetting rotation so they rotate with the planet
        if (!this.isSun && this.isInhabited && this.cityLightsBuffer && this.shadowOffset) {
            // Draw the city lights aligned with the planet's current rotation
            drawingContext.save();
            
            // Calculate rotated shadow position based on current planet rotation
            // This ensures the shadow rotation matches the planet's current rotation
            const rotatedShadowX = this.shadowOffset.x * cos(-this.currentRotation) - this.shadowOffset.y * sin(-this.currentRotation);
            const rotatedShadowY = this.shadowOffset.x * sin(-this.currentRotation) + this.shadowOffset.y * cos(-this.currentRotation);
            
            // First, clip to the planet's circular area
            drawingContext.beginPath();
            drawingContext.arc(0, 0, this.radius, 0, TWO_PI);
            drawingContext.clip();

            // Then clip to the shadow area (night side), matching the shadow ellipse
            // Use pre-calculated shadow radius from computeShadowOffset
            drawingContext.beginPath();
            drawingContext.arc(rotatedShadowX, rotatedShadowY, this._shadowRadius, 0, TWO_PI);
            drawingContext.clip();

            // Now draw the city lights (already properly rotated with the planet)
            const bufferSize = this.cityLightsBuffer.width;
            const halfBuffer = bufferSize * 0.5;
            image(this.cityLightsBuffer, -halfBuffer, -halfBuffer);

            // Restore the drawing context
            drawingContext.restore();
        }
        
        // Reset rotation to draw stationary shadow on top
        rotate(-this.currentRotation);
        
        // Draw stationary shadow on top of the planet (semi-transparent to let city lights show through)
        if (!this.isSun && this.shadowOffset) {
            noStroke();
            
            // Use pre-calculated shadow constants
            const shadowSize = this._shadowGradientOuter;
            const innerShadow = this._shadowGradientInner;
            
            // Shadow gradient is more complex for inhabited planets
            if (this.isInhabited) {
                // Base semi-transparent shadow layer
                fill(0, 0, 0, 30);
                ellipse(this.shadowOffset.x, this.shadowOffset.y, this._shadowSize, this._shadowSize);
                
                // Save context before custom gradient
                drawingContext.save();
                
                // Create shadow gradient
                const shadowGradient = drawingContext.createRadialGradient(
                    this.shadowOffset.x, this.shadowOffset.y, innerShadow,
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
                ellipse(this.shadowOffset.x, this.shadowOffset.y, this._shadowSize, this._shadowSize);
            }
        }

        // Draw planet name in the center
        if (this.name && !this.isSun) {
            push();
            // Keep rotation to match planet's rotation
            fill(255, 255, 255, 200); // White text with some transparency
            noStroke();
            textAlign(CENTER, CENTER);
            // Use global font if available so the name matches the UI
            if (typeof font !== 'undefined' && font) {
                textFont(font);
            }
            textSize(18); // Fixed size for all planets
            text(this.name, 0, 0);
            pop();
        }
        
        pop();
    }
    
    /**
     * Draw a planet with rings using the correct layering technique
     */
    drawRingedPlanet() {
        const bufferW = this.planetBuffer.width;
        const bufferH = this.planetBuffer.height;
        const halfW = bufferW * 0.5;
        const halfH = bufferH * 0.5;
        const destX = -halfW;
        const destY = -halfH;
        
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
        const halfRings = ringsSize * 0.5;
        image(this.ringsBuffer, -halfRings, -halfRings);
        
        // 3. Draw the top portion of the planet on top of the rings
        const topHeight = halfH;
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
            baseColor: this.baseColor ? [red(this.baseColor), green(this.baseColor), blue(this.baseColor), alpha(this.baseColor)] : null,
            featureColor1: this.featureColor1 ? [red(this.featureColor1), green(this.featureColor1), blue(this.featureColor1), alpha(this.featureColor1)] : null,
            featureColor2: this.featureColor2 ? [red(this.featureColor2), green(this.featureColor2), blue(this.featureColor2), alpha(this.featureColor2)] : null,
            featureColor3: this.featureColor3 ? [red(this.featureColor3), green(this.featureColor3), blue(this.featureColor3), alpha(this.featureColor3)] : null,
            featureRand: this.featureRand,
            noiseScale: this.noiseScale,
            noisePersistence: this.noisePersistence,
            hasAtmosphere: this.hasAtmosphere,
            atmosphereColor: this.atmosphereColor ? [red(this.atmosphereColor), green(this.atmosphereColor), blue(this.atmosphereColor), alpha(this.atmosphereColor)] : null,
            hasRings: this.hasRings,
            ringAngle: this.ringAngle,
            ringPerspective: this.ringPerspective,
            ringInnerRad: this.ringInnerRad,
            ringOuterRad: this.ringOuterRad,
            numRingSegments: this.numRingSegments,
            ringColor1: this.ringColor1 ? [red(this.ringColor1), green(this.ringColor1), blue(this.ringColor1), alpha(this.ringColor1)] : null,
            ringColor2: this.ringColor2 ? [red(this.ringColor2), green(this.ringColor2), blue(this.ringColor2), alpha(this.ringColor2)] : null,
            rotationSpeed: this.rotationSpeed,
            currentRotation: this.currentRotation,
            isInhabited: this.isInhabited,
            cityLightsColor: this.cityLightsColor ? [red(this.cityLightsColor), green(this.cityLightsColor), blue(this.cityLightsColor), alpha(this.cityLightsColor)] : null,
            cityLightsDensity: this.cityLightsDensity,
            name: this.name,
            systemName: this.systemName,
            planetIndex: this.planetIndex
        };
    }

    static fromJSON(data) {
        // Helper to parse stored color formats (array [r,g,b,a] or string)
        const parseColor = (val) => {
            if (!val) return null;
            if (Array.isArray(val)) {
                // Expect [r,g,b,a]
                return (typeof color === 'function') ? color(val[0], val[1], val[2], val[3]) : null;
            }
            // Fallback: try parsing string via p5 `color()` if available
            return (typeof color === 'function') ? color(val) : null;
        };

        // Parse base/feature colors (supports both old string format and new RGBA arrays)
        let c1 = parseColor(data.baseColor) || undefined;
        let c2 = parseColor(data.featureColor1) || undefined;
        const p = new Planet(data.pos.x, data.pos.y, data.size, c1, c2, data.systemName || "Unknown", data.planetIndex || 0);

        // Restore other colors and properties
        p.featureColor2 = parseColor(data.featureColor2) || p.featureColor2;
        p.featureColor3 = parseColor(data.featureColor3) || p.featureColor3;
        p.featureRand = (typeof data.featureRand !== 'undefined') ? data.featureRand : p.featureRand;
        p.noiseScale = (typeof data.noiseScale !== 'undefined') ? data.noiseScale : p.noiseScale;
        p.noisePersistence = (typeof data.noisePersistence !== 'undefined') ? data.noisePersistence : p.noisePersistence;
        p.hasAtmosphere = !!data.hasAtmosphere;
        p.atmosphereColor = parseColor(data.atmosphereColor) || null;
        p.hasRings = !!data.hasRings;
        p.ringAngle = (typeof data.ringAngle !== 'undefined') ? data.ringAngle : p.ringAngle;
        p.ringPerspective = (typeof data.ringPerspective !== 'undefined') ? data.ringPerspective : p.ringPerspective;
        p.ringInnerRad = (typeof data.ringInnerRad !== 'undefined') ? data.ringInnerRad : p.ringInnerRad;
        p.ringOuterRad = (typeof data.ringOuterRad !== 'undefined') ? data.ringOuterRad : p.ringOuterRad;
        p.numRingSegments = (typeof data.numRingSegments !== 'undefined') ? data.numRingSegments : p.numRingSegments;
        p.ringColor1 = parseColor(data.ringColor1) || p.ringColor1;
        p.ringColor2 = parseColor(data.ringColor2) || p.ringColor2;
        p.rotationSpeed = (typeof data.rotationSpeed !== 'undefined') ? data.rotationSpeed : p.rotationSpeed;
        p.currentRotation = (typeof data.currentRotation !== 'undefined') ? data.currentRotation : p.currentRotation;
        p.isInhabited = !!data.isInhabited;
        p.cityLightsColor = parseColor(data.cityLightsColor) || p.cityLightsColor;
        p.cityLightsDensity = (typeof data.cityLightsDensity !== 'undefined') ? data.cityLightsDensity : p.cityLightsDensity;
        p.name = data.name || p.name; // Use saved name if available

        // Rebuild palette so rendered textures use restored feature colors
        p.palette = [p.baseColor, p.featureColor1, p.featureColor2, p.featureColor3];

        return p;
    }
} // End of Planet Class