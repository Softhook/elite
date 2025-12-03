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

        // Mark as sun when planetIndex === 0 to ensure consistent sun rendering
        this.isSun = !!(planetIndex === 0);

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
        
        // Set baseColor as average of the three feature colors
        const avgBaseR = Math.floor((red(this.featureColor1) + red(this.featureColor2) + red(this.featureColor3)) / 3);
        const avgBaseG = Math.floor((green(this.featureColor1) + green(this.featureColor2) + green(this.featureColor3)) / 3);
        const avgBaseB = Math.floor((blue(this.featureColor1) + blue(this.featureColor2) + blue(this.featureColor3)) / 3);
        this.baseColor = color(avgBaseR, avgBaseG, avgBaseB);
        
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
        let sunSize = 1200;  // Much larger sun size
        let sunColor1 = color(255, 250, 200);  // Very bright white-yellow
        let sunColor2 = color(255, 220, 100);
        let sun = new Planet(0, 0, sunSize, sunColor1, sunColor2, systemName, 0);
        // Mark this as the sun and tune visuals for a stellar appearance
        sun.isSun = true;
        sun.isInhabited = false;
        // Stronger, brighter halo
        sun.hasAtmosphere = true;
        sun.atmosphereColor = color(255, 210, 120, 200);
        // Ensure the sun never has rings
        sun.hasRings = false;
        sun.ringsBuffer = null;
        // Make feature colors much closer to base to reduce contrast
        sun.featureColor1 = lerpColor(sun.baseColor, color(255, 230, 160), 0.12);
        sun.featureColor2 = lerpColor(sun.baseColor, color(255, 210, 120), 0.08);
        sun.featureColor3 = lerpColor(sun.baseColor, color(255, 240, 200), 0.06);
        sun.palette = [sun.baseColor, sun.featureColor1, sun.featureColor2, sun.featureColor3];
        // Reduce noise/detail for a smoother stellar surface
        sun.noiseScale = 0.0005;
        sun.noisePersistence = 0.3;
        sun.rotationSpeed = 0.0005;
        return sun;
    }
    
    /**
     * Creates all the necessary graphics buffers and pre-renders
     * the planet components for efficient drawing
     */
    createBuffers() {
        if (this.buffersCreated) return;
        
        // Increase buffer size for suns to avoid clipping and ensure gradients cover the canvas
        const baseFactor = this.isSun ? 1.6 : 1.2;
        const bufferSize = Math.ceil(this.size * baseFactor);
        const ringBufferSize = this.hasRings ? Math.ceil(this.ringOuterRad * 2.2) : 0;
        
        // For inhabited planets with atmosphere, we need a larger buffer to contain the city glow
        let atmBufferSizeFactor = 1.0 + (5 * 0.04);
        if (this.isInhabited) {
            // Ensure atmosphere buffer is big enough to contain the city glow (which is r * 2.1)
            atmBufferSizeFactor = Math.max(atmBufferSizeFactor, 2.1);
        }
        if (this.isSun) {
                // Reduce sun halo size: use a smaller buffer factor
            atmBufferSizeFactor = Math.max(atmBufferSizeFactor, 4.5);
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

        // Special-case: render a smooth radial gradient for suns (less contrasting)
        if (this.isSun) {
            const ctx = pg.drawingContext;
            const cx = bufferCenter, cy = bufferCenter;
            // Make outer radius large enough to reach buffer edges (avoid hard boundaries)
            const outerR = Math.max(1, Math.max(r, Math.round(Math.max(pg.width, pg.height) * 0.5)));
            const bc = this.baseColor;
            const fc = this.featureColor1 || bc;
            const c0 = `rgba(${Math.round(red(bc))},${Math.round(green(bc))},${Math.round(blue(bc))},1)`;
            const c1 = `rgba(${Math.round(red(fc))},${Math.round(green(fc))},${Math.round(blue(fc))},0.95)`;
            const c2 = `rgba(${Math.round(red(fc))},${Math.round(green(fc))},${Math.round(blue(fc))},0)`;
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, outerR);
            grad.addColorStop(0, c0);
            grad.addColorStop(0.45, c1);
            grad.addColorStop(1, c2);

            // Ensure smoothing is enabled and draw gradient to fill the buffer
            ctx.imageSmoothingEnabled = true;
            const prevOp = ctx.globalCompositeOperation;
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, pg.width, pg.height);
            ctx.globalCompositeOperation = prevOp;
            return;
        }

        // Increase octaves/persistence for richer, more dramatic detail
        pg.noiseDetail(6, this.noisePersistence);
        
        // Skip drawing the solid base circle; the textured bands will fill the planet
        
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
                
                // Antialiasing at the planet edge for smooth transition to background
                const edgeWidth = 5; // pixels over which to fade alpha
                if (distFromCenter > r - edgeWidth) {
                    const alphaFactor = Math.max(0, (r - distFromCenter) / edgeWidth);
                    bandColor = color(red(bandColor), green(bandColor), blue(bandColor), alpha(bandColor) * alphaFactor);
                }
                
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

        // Sun gets an additive, strong halo using canvas gradients
        if (this.isSun) {
            const ctx = pg.drawingContext;
            const cx = bufferCenter, cy = bufferCenter;
            const maxR = Math.max(pg.width, pg.height) * 0.5;
            const a = (typeof alpha === 'function') ? alpha(this.atmosphereColor) / 255 : 0.65;
            const sr = Math.round(red(this.atmosphereColor));
            const sg = Math.round(green(this.atmosphereColor));
            const sb = Math.round(blue(this.atmosphereColor));
            
            // Create a smooth multi-stop gradient for soft halo edges
            const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, maxR);
            grad.addColorStop(0, `rgba(${sr},${sg},${sb},${Math.min(1, a)})`);
            grad.addColorStop(0.15, `rgba(${sr},${sg},${sb},${Math.min(1, a * 0.85)})`);
            grad.addColorStop(0.3, `rgba(${sr},${sg},${sb},${Math.max(0, a * 0.6)})`);
            grad.addColorStop(0.5, `rgba(${sr},${sg},${sb},${Math.max(0, a * 0.35)})`);
            grad.addColorStop(0.7, `rgba(${sr},${sg},${sb},${Math.max(0, a * 0.15)})`);
            grad.addColorStop(0.85, `rgba(${sr},${sg},${sb},${Math.max(0, a * 0.05)})`);
            grad.addColorStop(1.0, `rgba(${sr},${sg},${sb},0)`);

            // Use additive blending for a bright halo
            const prevOp = ctx.globalCompositeOperation;
            ctx.globalCompositeOperation = 'lighter';
            ctx.fillStyle = grad;
            ctx.fillRect(0, 0, pg.width, pg.height);
            ctx.globalCompositeOperation = prevOp;
            return;
        }
        
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

        // Choose a civilization pattern type (0-5) based on featureRand for more variety
        const patternType = Math.floor((this.featureRand * 122.27) % 6);

        // Set colors based on civilization type to add variety
        let primaryColor, secondaryColor, accentColor;
        switch (patternType) {
            case 0: // Warm/amber - standard Earth-like
                primaryColor = color(255, 240, 180, 180);
                secondaryColor = color(255, 220, 140, 160);
                accentColor = color(255, 200, 100, 200);
                break;
            case 1: // Cooler/blueish - advanced tech
                primaryColor = color(220, 240, 255, 170);
                secondaryColor = color(180, 200, 255, 150);
                accentColor = color(150, 180, 255, 190);
                break;
            case 2: // Warm/reddish - older civilization
                primaryColor = color(255, 220, 160, 180);
                secondaryColor = color(255, 200, 130, 160);
                accentColor = color(255, 180, 100, 200);
                break;
            case 3: // Greenish tint - alien/bio-tech
                primaryColor = color(220, 255, 220, 170);
                secondaryColor = color(180, 245, 190, 150);
                accentColor = color(140, 255, 160, 190);
                break;
            case 4: // Purple/violet - exotic civilization
                primaryColor = color(240, 200, 255, 170);
                secondaryColor = color(200, 150, 255, 150);
                accentColor = color(180, 120, 255, 190);
                break;
            case 5: // Cyan/teal - aquatic or fusion-based
                primaryColor = color(180, 240, 255, 170);
                secondaryColor = color(140, 220, 255, 150);
                accentColor = color(100, 200, 255, 190);
                break;
        }

        this.cityLightsColor = primaryColor; // Update the main color
        
        // Cache color components for inner loop performance
        const primR = red(primaryColor), primG = green(primaryColor), primB = blue(primaryColor);
        const secR = red(secondaryColor), secG = green(secondaryColor), secB = blue(secondaryColor);
        const accR = red(accentColor), accG = green(accentColor), accB = blue(accentColor);


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
                
                // Spherical sampling so the faint sprawl wraps and fades at the limb
                const nx = x / r;
                const ny = y / r;
                const inside = nx * nx + ny * ny;
                if (inside > 1) continue;
                const nzUnit = Math.sqrt(Math.max(0, 1 - inside));
                const sampleMultiplier = Math.max(0.0005, (this.radius * noiseScale) * 0.8);
                const bNX = nx * sampleMultiplier + featureRand * 0.001;
                const bNY = ny * sampleMultiplier + featureRand * 0.002;
                const bNZ = nzUnit * sampleMultiplier + featureRand * 0.003;

                const baseNoise = pg.noise(bNX, bNY, bNZ);
                const detailNoise = pg.noise(bNX * 2.5, bNY * 2.5, bNZ * 2.0);
                let combinedNoise = baseNoise * 0.62 + detailNoise * 0.38;
                combinedNoise = Math.min(1, Math.max(0, Math.pow(combinedNoise, 1.25)));

                // Fade faint noise toward the limb
                const limbFactor = Math.pow(nzUnit, 0.9);
                if (combinedNoise > 0.2) {
                    const faintAlpha = Math.max(8, Math.round(36 * limbFactor));
                    const fo = Math.max(0.35, limbFactor);
                    const fd = Math.max(1, Math.round(faintDotSize * fo));
                    pg.noStroke();
                    pg.fill(primR, primG, primB, faintAlpha);
                    pg.ellipse(worldX, worldY, fd, fd);
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
                
                // Spherical sampling: sample noise on unit-sphere to wrap features and compress at limb
                const nx = x / r;
                const ny = y / r;
                const inside = nx * nx + ny * ny;
                if (inside > 1) continue;
                const nzUnit = Math.sqrt(Math.max(0, 1 - inside));
                const sampleMultiplier = Math.max(0.0005, (this.radius * noiseScale) * 0.8);
                const sNX = nx * sampleMultiplier + featureRand * 0.001;
                const sNY = ny * sampleMultiplier + featureRand * 0.002;
                const sNZ = nzUnit * sampleMultiplier + featureRand * 0.004;

                // Blend different noise octaves sampled in 3D for natural wrapping
                const baseNoise = pg.noise(sNX, sNY, sNZ);
                const detailNoise = pg.noise(sNX * 2.2, sNY * 2.2, sNZ * 1.8);
                let combinedNoise = (baseNoise * 0.56) + (detailNoise * 0.44);
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

                // Limb attenuation so city lights wrap with the sphere
                const limbFactor = Math.pow(nzUnit, 0.9);
                const brightnessMul = Math.max(0.22, limbFactor);
                
                // Generate various city light elements based on the noise values
                if (combinedNoise > densityThreshold) {
                    // Brightness varies with noise and hub influence
                    const brightnessFactor = (combinedNoise + hubInfluence - densityThreshold) / (1.5 - densityThreshold);
                    const brightness = 70 + brightnessFactor * 130;
                    const isNearHub = hubInfluence > 0.2;
                    const adjBrightness = brightness * brightnessMul;
                    
                    // Structure type based on noise and pattern type
                    const structureType = (combinedNoise * 10 + baseNoise * 5) % 1;
                    
                    // Draw different structural elements based on pattern and noise
                    if (structureType < 0.25) {
                        // Small point lights (buildings) - scale by limb foreshortening
                        pg.noStroke();
                        pg.fill(primR, primG, primB, Math.min(255, Math.round(adjBrightness * 0.8)));
                        const rawDot = isNearHub ? bandHeight * 0.7 : bandHeight * 0.4;
                        const dotSize = Math.max(1, rawDot * brightnessMul);
                        pg.ellipse(worldX, worldY, dotSize, dotSize);
                    } 
                    else if (structureType < 0.5) {
                        // Short line segments (roads/connections)
                        const lineAngle = (angle + baseNoise * Math.PI) % TWO_PI_CONST;
                        pg.stroke(secR, secG, secB, Math.min(255, Math.round(adjBrightness * 0.9)));
                        pg.strokeWeight(bandHeight * 0.4 * brightnessMul);
                        const lineLength = (isNearHub ? bandHeight * 2 : bandHeight * 1.2) * brightnessMul;
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
                        pg.fill(primR, primG, primB, Math.min(255, Math.round(adjBrightness * 0.7)));
                        const rawBlock = isNearHub ? bandHeight * 1.2 : bandHeight * 0.8;
                        const blockSize = Math.max(1, rawBlock * brightnessMul);
                        const halfBlock = blockSize * 0.5;
                        pg.rect(worldX - halfBlock, worldY - halfBlock, blockSize, blockSize);
                        
                        // Add interior detail to blocks
                        if (isNearHub && random() > 0.5) {
                            const innerSize = blockSize * 0.6;
                            const innerOffset = blockSize * 0.3;
                            pg.fill(secR, secG, secB, Math.min(255, Math.round(adjBrightness * 0.9)));
                            pg.rect(worldX - innerOffset, worldY - innerOffset, innerSize, innerSize);
                        }
                    } 
                    else {
                        // Scattered points (suburbs/outskirts)
                        pg.noStroke();
                        const scatterSize = Math.max(1, bandHeight * 0.3 * brightnessMul);
                        const maxDist = bandHeight * 1.4;
                        for (let i = 0; i < 3; i++) {
                            const offsetX = random(-bandHeight, bandHeight) * brightnessMul;
                            const offsetY = random(-bandHeight, bandHeight) * brightnessMul;
                            const offsetDistSq = offsetX * offsetX + offsetY * offsetY;
                            const offsetDist = Math.sqrt(offsetDistSq);
                            const scatterBrightness = adjBrightness * (1 - 0.6 * offsetDist / maxDist);
                            pg.fill(primR, primG, primB, Math.max(8, Math.round(scatterBrightness)));
                            pg.ellipse(worldX + offsetX, worldY + offsetY, scatterSize, scatterSize);
                        }
                    }
                    
                    // Add hub-specific detailed structures
                    if (isNearHub && hubInfluence > 0.5 && random() > 0.8) {
                        // Major city centers - add geometric patterns
                        const patternSize = Math.max(2, bandHeight * random(2, 4) * brightnessMul);
                        const halfPattern = patternSize * 0.5;
                        const brightAlpha = Math.max(10, Math.round(adjBrightness * 0.8));
                        
                        if (patternType === 0 || patternType === 2) {
                            // Concentric circles for warm/traditional civilizations
                            pg.noFill();
                            pg.stroke(secR, secG, secB, brightAlpha);
                            pg.strokeWeight(bandHeight * 0.3 * brightnessMul);
                            pg.ellipse(worldX, worldY, patternSize * 0.7, patternSize * 0.7);
                            pg.strokeWeight(bandHeight * 0.2 * brightnessMul);
                            pg.ellipse(worldX, worldY, patternSize, patternSize);
                        } else {
                            // Grid/angular patterns for cooler/advanced civilizations
                            pg.stroke(secR, secG, secB, brightAlpha);
                            pg.strokeWeight(bandHeight * 0.3 * brightnessMul);
                            const x1 = worldX - halfPattern, y1 = worldY - halfPattern;
                            const x2 = worldX + halfPattern, y2 = worldY + halfPattern;
                            pg.line(x1, y1, x2, y2);
                            pg.line(x2, y1, x1, y2);
                        }
                    }
                }
            }
        }
        
        // Angular high-tech grid overlay (jagged, noise-driven, sphere-aware)
        // This creates a semi-regular angular grid that is broken/jagged by noise
        // so it looks like advanced circuitry/transport lines wrapping the globe.
        (function() {
            const gridAngle = ((featureRand * 13.37) % TWO_PI_CONST) + this.currentRotation * 0.12;
            const baseSpacing = Math.max(8, Math.floor(r * map(this.cityLightsDensity, 0.25, 0.9, 0.18, 0.06)));
            const spacing = Math.max(6, Math.round(baseSpacing));
            const segStep = Math.max(4, Math.round(spacing * 0.35));
            const noiseJitter = Math.max(0.5, spacing * 0.22);

            pg.push();
            pg.translate(bufferCenter, bufferCenter);
            pg.rotate(gridAngle);

            // Primary grid lines
            pg.stroke(primR, primG, primB, 180);
            pg.strokeWeight(Math.max(0.6, bandHeight * 0.35));

            for (let gx = -r - spacing; gx <= r + spacing; gx += spacing) {
                // Draw this line as broken segments using noise to decide visible pieces
                let draw = false;
                for (let yy = -r; yy <= r; yy += segStep) {
                    // Compute world sample coordinates (undo translate/rotation by using the local coords gx,yy)
                    const x = gx;
                    const y = yy;
                    const inside = (x * x + y * y) / (r * r);
                    if (inside > 1) continue; // skip outside disc

                    // Spherical sampling so grid wraps and fades at the limb
                    const nx = x / r;
                    const ny = y / r;
                    const nzUnit = Math.sqrt(Math.max(0, 1 - (nx * nx + ny * ny)));
                    const sampleMultiplier = Math.max(0.0006, (this.radius * noiseScale) * 0.9);
                    const sNX = nx * sampleMultiplier + featureRand * 0.002 + 7.13;
                    const sNY = ny * sampleMultiplier + featureRand * 0.003 + 9.71;
                    const sNZ = nzUnit * sampleMultiplier + featureRand * 0.004 + 1.41;

                    // Noise controls visibility and jagged offset
                    const nVal = pg.noise(sNX * 2.2, sNY * 2.2, sNZ * 1.6);
                    const nDetail = pg.noise(sNX * 6.0, sNY * 6.0, sNZ * 4.2);
                    const visibility = Math.pow(nVal * 0.7 + nDetail * 0.3, 1.25);

                    // Limb fade so grid disappears at edges
                    const limbFactor = Math.pow(nzUnit, 0.85);
                    const threshold = 0.35 + (0.45 * (1 - this.cityLightsDensity));

                    if (visibility > threshold * (0.6 + 0.4 * limbFactor)) {
                        // Draw a curved, jagged segment as a short polyline so it follows
                        // the sphere curvature. We sample multiple points along the
                        // short segment and apply per-point noise jitter + a bend
                        // that increases toward the limb.
                        const segHalf = Math.max(1, segStep * 0.45);
                        const steps = Math.max(3, Math.round(segStep / 2));
                        const baseJitter = (nDetail - 0.5) * noiseJitter;
                        const curveScale = spacing * 0.28; // how strongly the line bends toward center

                        pg.noFill();
                        pg.beginShape();
                        for (let sI = 0; sI < steps; sI++) {
                            const t = steps === 1 ? 0 : sI / (steps - 1);
                            const sPos = -segHalf + t * (2 * segHalf);

                            // Per-point noise to jitter the line
                            const pNoise = pg.noise(sNX + sPos * 0.02, sNY + sPos * 0.02, sNZ + t * 0.01);
                            const jitter = (pNoise - 0.5) * baseJitter * (1 - limbFactor);

                            // Local point before curvature
                            let px = x + jitter;
                            let py = y + sPos;

                            // Skip points outside the disc
                            const insideP = (px * px + py * py) / (r * r);
                            if (insideP > 1) continue;

                            // Compute sphere-normal at this point and bend toward center
                            const nxP = px / r;
                            const nyP = py / r;
                            const nzP = Math.sqrt(Math.max(0, 1 - (nxP * nxP + nyP * nyP)));
                            // Apply a perpendicular inward offset that increases toward the limb
                            // This produces a visible arc as lines approach the edge.
                            const limbBias = Math.pow(1 - nzP, 1.8);
                            const bendAmount = curveScale * limbBias;
                            const side = (px === 0) ? 1 : Math.sign(px);
                            px -= side * bendAmount;
                            // Slightly move the point inward on Y as well to keep smooth projection
                            py *= (1 - Math.min(0.35, bendAmount / Math.max(1, r)));

                            pg.vertex(px, py);
                        }
                        pg.endShape();
                    }
                }
            }

            // Secondary angular cross-grid for a circuitry look
            pg.stroke(secR, secG, secB, 140);
            pg.strokeWeight(Math.max(0.35, bandHeight * 0.22));
            const crossAngle = gridAngle + PI / 2.3;
            pg.rotate(crossAngle - gridAngle);
            for (let gx = -r - spacing; gx <= r + spacing; gx += Math.round(spacing * 1.4)) {
                for (let yy = -r; yy <= r; yy += Math.max(3, Math.round(segStep * 0.9))) {
                    const x = gx;
                    const y = yy;
                    const inside = (x * x + y * y) / (r * r);
                    if (inside > 1) continue;

                    const nx = x / r;
                    const ny = y / r;
                    const nzUnit = Math.sqrt(Math.max(0, 1 - (nx * nx + ny * ny)));
                    const sampleMultiplier = Math.max(0.0006, (this.radius * noiseScale) * 0.9);
                    const sNX = nx * sampleMultiplier + featureRand * 0.005 + 3.21;
                    const sNY = ny * sampleMultiplier + featureRand * 0.006 + 4.19;
                    const sNZ = nzUnit * sampleMultiplier + featureRand * 0.007 + 2.17;

                    const nVal = pg.noise(sNX * 2.6, sNY * 2.6, sNZ * 1.9);
                    const limbFactor = Math.pow(nzUnit, 0.9);
                    if (nVal > 0.48 * (0.7 + 0.3 * limbFactor)) {
                        const len = Math.max(1, segStep * 0.6);
                        const steps2 = Math.max(3, Math.round(len / 1.2));
                        const curveScale2 = spacing * 0.22;

                        pg.noFill();
                        pg.beginShape();
                        for (let si = 0; si < steps2; si++) {
                            const tt = steps2 === 1 ? 0 : si / (steps2 - 1);
                            const sPos = -len + tt * (2 * len);
                            const pNoise = pg.noise(sNX * 1.2 + sPos * 0.02, sNY * 1.2 + sPos * 0.02);
                            const jitter = (pNoise - 0.5) * noiseJitter * 0.6 * (1 - limbFactor);

                            let px = x + jitter;
                            let py = y + sPos;
                            const insideP = (px * px + py * py) / (r * r);
                            if (insideP > 1) continue;

                            const nxP = px / r;
                            const nyP = py / r;
                            const nzP = Math.sqrt(Math.max(0, 1 - (nxP * nxP + nyP * nyP)));
                            // Perpendicular inward offset for visible curvature on cross-grid
                            const limbBias2 = Math.pow(1 - nzP, 1.7);
                            const bendAmount2 = curveScale2 * limbBias2;
                            const side2 = (px === 0) ? 1 : Math.sign(px);
                            px -= side2 * bendAmount2;
                            py *= (1 - Math.min(0.3, bendAmount2 / Math.max(1, r)));

                            pg.vertex(px, py);
                        }
                        pg.endShape();
                    }
                }
            }

            pg.pop();
        }).call(this);

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
        
        // --- MEGA-STRUCTURES AND SPECIAL FEATURES ---
        // These are large-scale civilization features visible from space
        
        // 1. ORBITAL RING / SPACE ELEVATOR (rare mega-structure)
        if ((featureRand * 31.41) % 1 > 0.85) {
            const ringAngle = (featureRand * 17.3) % TWO_PI_CONST;
            const ringRadius = r * random(1.08, 1.15); // Just outside planet surface
            const ringThickness = Math.max(1, bandHeight * 0.5);
            const segmentCount = Math.floor(120 + random(40));
            
            pg.push();
            pg.translate(bufferCenter, bufferCenter);
            pg.rotate(ringAngle);
            pg.noFill();
            pg.stroke(accR, accG, accB, 160);
            pg.strokeWeight(ringThickness);
            
            // Draw segmented orbital ring with gaps
            for (let seg = 0; seg < segmentCount; seg++) {
                const segAngle = (seg / segmentCount) * TWO_PI_CONST;
                const nextAngle = ((seg + 0.7) / segmentCount) * TWO_PI_CONST; // 70% segment, 30% gap
                const x1 = Math.cos(segAngle) * ringRadius;
                const y1 = Math.sin(segAngle) * ringRadius * 0.3; // Perspective
                const x2 = Math.cos(nextAngle) * ringRadius;
                const y2 = Math.sin(nextAngle) * ringRadius * 0.3;
                
                // Only draw if segment is on the visible side
                if (y1 < r * 0.2) {
                    pg.line(x1, y1, x2, y2);
                }
            }
            pg.pop();
            
            // Add connection points (space elevator tethers)
            const tethers = Math.floor(random(3, 6));
            for (let t = 0; t < tethers; t++) {
                const tetherAngle = ringAngle + (t / tethers) * TWO_PI_CONST;
                const surfaceX = Math.cos(tetherAngle) * r * 0.9;
                const surfaceY = Math.sin(tetherAngle) * r * 0.9;
                const orbitX = Math.cos(tetherAngle) * ringRadius;
                const orbitY = Math.sin(tetherAngle) * ringRadius * 0.3;
                
                pg.stroke(primR, primG, primB, 120);
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.25));
                pg.line(bufferCenter + surfaceX, bufferCenter + surfaceY, 
                       bufferCenter + orbitX, bufferCenter + orbitY);
                
                // Bright point at tether base
                pg.noStroke();
                pg.fill(accR, accG, accB, 200);
                pg.ellipse(bufferCenter + surfaceX, bufferCenter + surfaceY, 
                          bandHeight * 0.8, bandHeight * 0.8);
            }
        }
        
        // 2. AGRICULTURAL PATTERNS (visible geometric farms)
        const numFarmRegions = Math.floor(random(2, 5));
        for (let fr = 0; fr < numFarmRegions; fr++) {
            const farmAngle = (featureRand * (fr + 1) * 23.7) % TWO_PI_CONST;
            const farmDist = random(r * 0.4, r * 0.85);
            const farmCenterX = Math.cos(farmAngle) * farmDist;
            const farmCenterY = Math.sin(farmAngle) * farmDist;
            
            // Check if within planet bounds
            const farmDistSq = farmCenterX * farmCenterX + farmCenterY * farmCenterY;
            if (farmDistSq > r * r * 0.9) continue;
            
            const farmType = Math.floor((featureRand * (fr + 5) * 11.1) % 3);
            const farmScale = random(r * 0.08, r * 0.15);
            const farmSpacing = farmScale * 0.3;
            
            pg.push();
            pg.translate(bufferCenter + farmCenterX, bufferCenter + farmCenterY);
            
            if (farmType === 0) {
                // Circular irrigation patterns (center pivot)
                const numCircles = Math.floor(random(4, 8));
                for (let c = 0; c < numCircles; c++) {
                    const circRad = (c + 1) * farmSpacing;
                    pg.noFill();
                    pg.stroke(primR, primG, primB, 25 + c * 5);
                    pg.strokeWeight(Math.max(0.3, bandHeight * 0.15));
                    pg.ellipse(0, 0, circRad * 2, circRad * 2);
                    
                    // Add small dots around circle
                    const dotsOnCircle = Math.floor(circRad * 0.5);
                    for (let d = 0; d < dotsOnCircle; d++) {
                        const dotAngle = (d / dotsOnCircle) * TWO_PI_CONST;
                        const dx = Math.cos(dotAngle) * circRad;
                        const dy = Math.sin(dotAngle) * circRad;
                        pg.noStroke();
                        pg.fill(secR, secG, secB, 40);
                        pg.ellipse(dx, dy, bandHeight * 0.2, bandHeight * 0.2);
                    }
                }
            } else if (farmType === 1) {
                // Hexagonal grid pattern
                const hexSize = farmSpacing * 0.6;
                const hexRows = 8;
                const hexCols = 8;
                pg.noFill();
                pg.stroke(primR, primG, primB, 35);
                pg.strokeWeight(Math.max(0.3, bandHeight * 0.12));
                
                for (let row = -hexRows; row < hexRows; row++) {
                    for (let col = -hexCols; col < hexCols; col++) {
                        const xOff = col * hexSize * 1.5;
                        const yOff = row * hexSize * Math.sqrt(3) + (col % 2) * hexSize * Math.sqrt(3) * 0.5;
                        
                        // Draw hexagon
                        pg.beginShape();
                        for (let h = 0; h < 6; h++) {
                            const hAngle = (h / 6) * TWO_PI_CONST;
                            const hx = xOff + Math.cos(hAngle) * hexSize;
                            const hy = yOff + Math.sin(hAngle) * hexSize;
                            pg.vertex(hx, hy);
                        }
                        pg.endShape(CLOSE);
                    }
                }
            } else {
                // Rectangular field grid
                const gridSize = farmSpacing * 0.8;
                const gridCount = 10;
                pg.stroke(primR, primG, primB, 30);
                pg.strokeWeight(Math.max(0.3, bandHeight * 0.15));
                
                for (let gx = -gridCount; gx < gridCount; gx++) {
                    for (let gy = -gridCount; gy < gridCount; gy++) {
                        const rx = gx * gridSize;
                        const ry = gy * gridSize;
                        const halfGrid = gridSize * 0.4;
                        
                        pg.noFill();
                        pg.rect(rx - halfGrid, ry - halfGrid, gridSize * 0.8, gridSize * 0.8);
                        
                        // Small bright dot at center
                        if ((gx + gy) % 2 === 0) {
                            pg.noStroke();
                            pg.fill(secR, secG, secB, 45);
                            pg.ellipse(rx, ry, bandHeight * 0.25, bandHeight * 0.25);
                        }
                    }
                }
            }
            pg.pop();
        }
        
        // 3. RADIAL CITY PATTERNS (spoke-wheel cities)
        const numRadialCities = Math.floor(random(1, 3));
        for (let rc = 0; rc < numRadialCities; rc++) {
            // Pick a hub as the center
            if (rc >= cityHubs.length) break;
            const hub = cityHubs[rc];
            
            const numSpokes = Math.floor(random(6, 12));
            const spokeLength = hub.size * random(0.8, 1.2);
            
            for (let sp = 0; sp < numSpokes; sp++) {
                const spokeAngle = (sp / numSpokes) * TWO_PI_CONST;
                const spokeEndX = hub.x + Math.cos(spokeAngle) * spokeLength;
                const spokeEndY = hub.y + Math.sin(spokeAngle) * spokeLength;
                
                // Draw main spoke
                pg.stroke(primR, primG, primB, 140);
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.4));
                pg.line(bufferCenter + hub.x, bufferCenter + hub.y,
                       bufferCenter + spokeEndX, bufferCenter + spokeEndY);
                
                // Add development along spoke
                const segmentsAlongSpoke = Math.floor(random(4, 8));
                for (let seg = 1; seg < segmentsAlongSpoke; seg++) {
                    const t = seg / segmentsAlongSpoke;
                    const segX = hub.x + Math.cos(spokeAngle) * spokeLength * t;
                    const segY = hub.y + Math.sin(spokeAngle) * spokeLength * t;
                    
                    // Perpendicular development
                    const perpAngle = spokeAngle + PI / 2;
                    const perpLen = bandHeight * random(1, 3);
                    
                    pg.stroke(secR, secG, secB, 100);
                    pg.strokeWeight(Math.max(0.3, bandHeight * 0.25));
                    pg.line(
                        bufferCenter + segX - Math.cos(perpAngle) * perpLen,
                        bufferCenter + segY - Math.sin(perpAngle) * perpLen,
                        bufferCenter + segX + Math.cos(perpAngle) * perpLen,
                        bufferCenter + segY + Math.sin(perpAngle) * perpLen
                    );
                    
                    // Bright node at intersection
                    pg.noStroke();
                    pg.fill(accR, accG, accB, 160);
                    pg.ellipse(bufferCenter + segX, bufferCenter + segY, 
                              bandHeight * 0.6, bandHeight * 0.6);
                }
            }
            
            // Ring roads around the radial city
            const numRings = Math.floor(random(2, 4));
            for (let ring = 1; ring <= numRings; ring++) {
                const ringRad = (ring / numRings) * spokeLength;
                pg.noFill();
                pg.stroke(secR, secG, secB, 80);
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.3));
                pg.ellipse(bufferCenter + hub.x, bufferCenter + hub.y,
                          ringRad * 2, ringRad * 2);
            }
        }
        
        // 4. ARCOLOGIES (super-tall mega-buildings)
        const numArcologies = Math.floor(random(1, 4));
        for (let arc = 0; arc < numArcologies; arc++) {
            const arcAngle = (featureRand * (arc + 7) * 19.3) % TWO_PI_CONST;
            const arcDist = random(r * 0.3, r * 0.8);
            const arcX = Math.cos(arcAngle) * arcDist;
            const arcY = Math.sin(arcAngle) * arcDist;
            
            // Check bounds
            if (arcX * arcX + arcY * arcY > r * r * 0.9) continue;
            
            // Draw bright glow for arcology
            pg.push();
            pg.translate(bufferCenter + arcX, bufferCenter + arcY);
            
            // Outer glow
            const glowSize = bandHeight * random(2.5, 4);
            pg.noStroke();
            for (let g = 3; g > 0; g--) {
                const gSize = glowSize * (g / 3);
                const gAlpha = 60 / g;
                pg.fill(accR, accG, accB, gAlpha);
                pg.ellipse(0, 0, gSize, gSize);
            }
            
            // Bright core
            pg.fill(accR, accG, accB, 220);
            pg.ellipse(0, 0, bandHeight * 1.2, bandHeight * 1.2);
            
            // Cross-pattern indicating structure
            pg.stroke(255, 255, 255, 180);
            pg.strokeWeight(Math.max(0.4, bandHeight * 0.2));
            const crossSize = bandHeight * 1.5;
            pg.line(-crossSize, 0, crossSize, 0);
            pg.line(0, -crossSize, 0, crossSize);
            
            pg.pop();
        }
        
        // 5. INDUSTRIAL ZONES (uniform bright patches)
        const numIndustrial = Math.floor(random(2, 5));
        for (let ind = 0; ind < numIndustrial; ind++) {
            const indAngle = (featureRand * (ind + 13) * 27.1) % TWO_PI_CONST;
            const indDist = random(r * 0.4, r * 0.85);
            const indX = Math.cos(indAngle) * indDist;
            const indY = Math.sin(indAngle) * indDist;
            
            if (indX * indX + indY * indY > r * r * 0.9) continue;
            
            const indSize = random(r * 0.04, r * 0.08);
            const indGridSpacing = Math.max(1, bandHeight * 0.8);
            
            pg.push();
            pg.translate(bufferCenter + indX, bufferCenter + indY);
            
            // Uniform grid of bright lights
            const gridExtent = Math.floor(indSize / indGridSpacing);
            for (let gx = -gridExtent; gx <= gridExtent; gx++) {
                for (let gy = -gridExtent; gy <= gridExtent; gy++) {
                    const px = gx * indGridSpacing;
                    const py = gy * indGridSpacing;
                    
                    // Uniform brightness for industrial look
                    pg.noStroke();
                    pg.fill(primR, primG, primB, 150);
                    pg.ellipse(px, py, bandHeight * 0.5, bandHeight * 0.5);
                }
            }
            pg.pop();
        }
        
   
        // 6. TERRAFORMING/ATMOSPHERIC PROCESSORS (distinct geometric stations)
        if ((featureRand * 53.7) % 1 > 0.7) {
            const numProcessors = Math.floor(random(2, 5));
            for (let proc = 0; proc < numProcessors; proc++) {
                const procAngle = (proc / numProcessors) * TWO_PI_CONST + random(-0.3, 0.3);
                const procDist = random(r * 0.6, r * 0.9);
                const procX = Math.cos(procAngle) * procDist;
                const procY = Math.sin(procAngle) * procDist;
                
                if (procX * procX + procY * procY > r * r) continue;
                
                pg.push();
                pg.translate(bufferCenter + procX, bufferCenter + procY);
                
                // Draw processor as geometric structure
                const procSize = bandHeight * random(2, 3);
                
                // Rotating square/diamond
                pg.push();
                pg.rotate(PI / 4);
                pg.noFill();
                pg.stroke(accR, accG, accB, 180);
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.3));
                pg.rect(-procSize / 2, -procSize / 2, procSize, procSize);
                pg.pop();
                
                // Center bright point
                pg.noStroke();
                pg.fill(255, 255, 255, 200);
                pg.ellipse(0, 0, bandHeight * 0.7, bandHeight * 0.7);
                
                // Energy lines radiating out
                const numEnergyLines = 4;
                for (let el = 0; el < numEnergyLines; el++) {
                    const elAngle = (el / numEnergyLines) * TWO_PI_CONST;
                    const elLen = procSize * 1.2;
                    pg.stroke(secR, secG, secB, 140);
                    pg.strokeWeight(Math.max(0.3, bandHeight * 0.2));
                    pg.line(0, 0,
                           Math.cos(elAngle) * elLen,
                           Math.sin(elAngle) * elLen);
                }
                
                pg.pop();
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
     * Draw a planet with rings using canvas clipping for proper layering.
     * The back portion of the ring (behind the planet) is clipped out,
     * then the full planet is drawn on top.
     */
    drawRingedPlanet() {
        const ctx = drawingContext;
        const bufferW = this.planetBuffer.width;
        const halfW = bufferW * 0.5;
        const ringsSize = this.ringsBuffer.width;
        const halfRings = ringsSize * 0.5;
        
        // Calculate the ring ellipse parameters for clipping
        // The ring is drawn rotated by ringAngle with perspective squashing
        const cosA = Math.cos(this.ringAngle);
        const sinA = Math.sin(this.ringAngle);
        
        // Use a slightly smaller clip radius to account for anti-aliasing at the planet edge.
        // The planet texture fades out over ~5 pixels (edgeWidth in renderPlanetTexture),
        // so we extend the ring underneath by using a smaller exclusion radius.
        const clipRadius = this.radius - 4;
        
        // --- Step 1: Draw the back portion of the rings (clipped to exclude front) ---
        ctx.save();
        
        // Create a clipping path that excludes the planet circle
        // We draw the back half of the ring area, then subtract the planet
        ctx.beginPath();
        
        // First, draw a large rectangle covering everything
        ctx.rect(-ringsSize, -ringsSize, ringsSize * 2, ringsSize * 2);
        
        // Then cut out the planet circle using counter-clockwise winding (creates a hole)
        // Use clipRadius (slightly smaller) so rings extend under the anti-aliased edge
        ctx.arc(0, 0, clipRadius, 0, TWO_PI, true);
        
        ctx.clip('evenodd');
        
        // Now draw the back portion of the rings (bottom half in rotated space)
        // We need another clip to only show the back half
        ctx.save();
        ctx.beginPath();
        
        // Create a half-plane clip for the back of the ring
        // The ring is tilted by ringAngle, so "back" is below the tilt axis
        // We rotate our clip region to match the ring's tilt
        ctx.rotate(this.ringAngle);
        // Clip to only the bottom half (y > 0 in rotated space = back of ring)
        ctx.rect(-ringsSize, 0, ringsSize * 2, ringsSize);
        ctx.clip();
        
        // Undo the rotation to draw the ring buffer normally
        ctx.rotate(-this.ringAngle);
        
        // Draw the rings (only the back portion will show due to clipping)
        image(this.ringsBuffer, -halfRings, -halfRings);
        
        ctx.restore();
        ctx.restore();
        
        // --- Step 2: Draw the full planet on top ---
        image(this.planetBuffer, -halfW, -halfW);
        
        // --- Step 3: Draw the front portion of the rings on top of the planet ---
        ctx.save();
        
        // Clip to only the front half of the ring (top half in rotated space)
        ctx.beginPath();
        ctx.rotate(this.ringAngle);
        // Clip to only the top half (y < 0 in rotated space = front of ring)
        ctx.rect(-ringsSize, -ringsSize, ringsSize * 2, ringsSize);
        ctx.clip();
        ctx.rotate(-this.ringAngle);
        
        // Draw the rings (only the front portion will show)
        image(this.ringsBuffer, -halfRings, -halfRings);
        
        ctx.restore();
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
            planetIndex: this.planetIndex,
            isSun: !!this.isSun
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

        // Ensure isSun flag is respected when restoring (fall back to planetIndex===0)
        p.isSun = (typeof data.isSun !== 'undefined') ? !!data.isSun : !!(p.planetIndex === 0);

        // Rebuild palette so rendered textures use restored feature colors
        p.palette = [p.baseColor, p.featureColor1, p.featureColor2, p.featureColor3];

        return p;
    }
} // End of Planet Class