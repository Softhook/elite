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
        this.atmosphereColor = this.hasAtmosphere ? color(random(150, 220), random(150, 220), random(200, 255), random(25, 50)) : null;

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
     * Helper to compute limb foreshortening factor for a point on the planet surface.
     * Returns 1 at center (fully visible), 0 at edge (on the limb).
     * @param {number} localX - X position relative to planet center
     * @param {number} localY - Y position relative to planet center
     * @returns {number} Limb factor from 0 to 1
     */
    _getLimbFactor(localX, localY) {
        const nx = localX / this.radius;
        const ny = localY / this.radius;
        const inside = nx * nx + ny * ny;
        if (inside > 1) return 0;
        const nzUnit = Math.sqrt(Math.max(0, 1 - inside));
        return Math.pow(nzUnit, 0.9); // 1 at center, 0 at edge
    }

    /**
     * Helper to draw a curved line on the sphere surface.
     * The line curves OUTWARD (away from planet center) to simulate great circle arcs.
     * @param {p5.Graphics} pg - Graphics context
     * @param {number} x1 - Start X (relative to planet center)
     * @param {number} y1 - Start Y
     * @param {number} x2 - End X
     * @param {number} y2 - End Y
     * @param {number} bufferCenter - Buffer center offset
     * @param {number} r - Planet radius
     */
    _drawCurvedLine(pg, x1, y1, x2, y2, bufferCenter, r) {
        // Midpoint of the line
        const midX = (x1 + x2) * 0.5;
        const midY = (y1 + y2) * 0.5;

        // Direction from midpoint toward planet center
        const midDistActual = Math.sqrt(midX * midX + midY * midY);
        if (midDistActual < 0.001) {
            // Line passes through center, draw straight
            pg.line(bufferCenter + x1, bufferCenter + y1, bufferCenter + x2, bufferCenter + y2);
            return;
        }

        // How far is the midpoint from center (0-1)
        const midDistNorm = midDistActual / r;

        // Line length
        const lineLen = Math.sqrt((x2 - x1) * (x2 - x1) + (y2 - y1) * (y2 - y1));

        // DRAMATICALLY VISIBLE curve amount
        // Linear with distance from center, 50% of line length at the edge
        const curveAmount = lineLen * 0.5 * midDistNorm;

        if (curveAmount < 2) {
            // Very small curve, draw straight
            pg.line(bufferCenter + x1, bufferCenter + y1, bufferCenter + x2, bufferCenter + y2);
            return;
        }

        // Control point - displaced AWAY from planet center (outward)
        // This simulates great circle arcs on a sphere viewed from above
        const ctrlX = midX + (midX / midDistActual) * curveAmount;
        const ctrlY = midY + (midY / midDistActual) * curveAmount;

        // Draw as bezier curve
        pg.noFill();
        pg.beginShape();
        pg.vertex(bufferCenter + x1, bufferCenter + y1);
        pg.quadraticVertex(bufferCenter + ctrlX, bufferCenter + ctrlY, bufferCenter + x2, bufferCenter + y2);
        pg.endShape();
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

        // Use Canvas 2D API for smooth radial gradient (matching sun's technique)
        const ctx = pg.drawingContext;
        const cx = bufferCenter, cy = bufferCenter;

        // Atmosphere extends from planet edge outward
        const innerR = this.radius * 0.9;  // Start slightly inside planet surface for blending
        const outerR = this.radius * 1.25;  // Extend outward (25% beyond surface)

        // Get color components
        const atmR = Math.round(red(this.atmosphereColor));
        const atmG = Math.round(green(this.atmosphereColor));
        const atmB = Math.round(blue(this.atmosphereColor));
        const baseAlpha = alpha(this.atmosphereColor) / 255;  // Convert to 0-1 range

        // Create smooth radial gradient from planet surface outward
        const grad = ctx.createRadialGradient(cx, cy, innerR, cx, cy, outerR);
        grad.addColorStop(0, `rgba(${atmR},${atmG},${atmB},${Math.min(1, baseAlpha * 0.9)})`);
        grad.addColorStop(0.2, `rgba(${atmR},${atmG},${atmB},${Math.max(0, baseAlpha * 0.7)})`);
        grad.addColorStop(0.5, `rgba(${atmR},${atmG},${atmB},${Math.max(0, baseAlpha * 0.4)})`);
        grad.addColorStop(0.75, `rgba(${atmR},${atmG},${atmB},${Math.max(0, baseAlpha * 0.15)})`);
        grad.addColorStop(1.0, `rgba(${atmR},${atmG},${atmB},0)`);

        // Draw gradient circle
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, outerR, 0, Math.PI * 2);
        ctx.fill();

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
        // Angular high-tech grid overlay - with TRUE spherical projection
        // Each segment is positioned along a curved arc that follows the sphere surface
        (function () {
            const gridAngle = ((featureRand * 13.37) % TWO_PI_CONST) + this.currentRotation * 0.12;
            const baseSpacing = Math.max(8, Math.floor(r * map(this.cityLightsDensity, 0.25, 0.9, 0.18, 0.06)));
            const spacing = Math.max(6, Math.round(baseSpacing));
            const segStep = Math.max(4, Math.round(spacing * 0.35));
            const noiseJitter = Math.max(0.5, spacing * 0.22);
            const noiseScale = this.noiseScale || 0.01;

            pg.push();
            pg.translate(bufferCenter, bufferCenter);
            pg.rotate(gridAngle);

            // Primary grid lines - following curved arcs on sphere surface
            pg.stroke(primR, primG, primB, 160);
            pg.strokeWeight(Math.max(0.6, bandHeight * 0.35));

            const safeR = r * 0.85;

            // For each grid line at offset gx from center
            for (let gx = -safeR; gx <= safeR; gx += spacing) {
                const halfChord = Math.sqrt(Math.max(0, safeR * safeR - gx * gx));
                if (halfChord < 5) continue;

                // How far this line is from center (0-1)
                const lineDistNorm = Math.abs(gx) / r;

                for (let yy = -halfChord; yy <= halfChord; yy += segStep) {
                    // Original grid position
                    const baseX = gx;
                    const baseY = yy;

                    // Spherical projection: calculate curved x position
                    // As we move along y, the x position curves outward
                    // The further from center (gx), the more curvature
                    const yNorm = baseY / r; // -1 to 1
                    const distFromPolesSq = yNorm * yNorm;
                    // Curve amount: line bows outward, maximum at y=0, minimum at poles
                    const curveDisplacement = lineDistNorm * (1 - distFromPolesSq) * r * 0.3;
                    // Displacement direction: away from center (same sign as gx)
                    const curvedX = baseX + Math.sign(gx) * curveDisplacement;

                    const x = curvedX;
                    const y = baseY;

                    // Spherical sampling for visibility
                    const nx = x / r;
                    const ny = y / r;
                    const nzUnit = Math.sqrt(Math.max(0, 1 - (nx * nx + ny * ny)));
                    if (nzUnit < 0.15) continue;

                    const sampleMultiplier = Math.max(0.0006, (this.radius * noiseScale) * 0.9);
                    const sNX = nx * sampleMultiplier + featureRand * 0.002 + 7.13;
                    const sNY = ny * sampleMultiplier + featureRand * 0.003 + 9.71;
                    const sNZ = nzUnit * sampleMultiplier + featureRand * 0.004 + 1.41;

                    const nVal = pg.noise(sNX * 2.2, sNY * 2.2, sNZ * 1.6);
                    const nDetail = pg.noise(sNX * 6.0, sNY * 6.0, sNZ * 4.2);
                    const visibility = Math.pow(nVal * 0.7 + nDetail * 0.3, 1.25);

                    const limbFactor = Math.pow(nzUnit, 0.85);
                    const threshold = 0.35 + (0.45 * (1 - this.cityLightsDensity));

                    if (visibility > threshold * (0.6 + 0.4 * limbFactor)) {
                        const segHalf = Math.max(1, segStep * 0.45);
                        const baseJitter = (nDetail - 0.5) * noiseJitter;
                        const jitter = (pg.noise(sNX * 1.5, sNY * 1.5) - 0.5) * baseJitter * (1 - limbFactor);

                        // Calculate curved positions for start and end of segment
                        const startYNorm = (y - segHalf) / r;
                        const endYNorm = (y + segHalf) / r;
                        const startCurve = lineDistNorm * (1 - startYNorm * startYNorm) * r * 0.3;
                        const endCurve = lineDistNorm * (1 - endYNorm * endYNorm) * r * 0.3;

                        const startX = baseX + Math.sign(gx || 1) * startCurve + jitter;
                        const startY = y - segHalf;
                        const endX = baseX + Math.sign(gx || 1) * endCurve + jitter;
                        const endY = y + segHalf;

                        if ((startX * startX + startY * startY) > safeR * safeR) continue;
                        if ((endX * endX + endY * endY) > safeR * safeR) continue;

                        pg.line(startX, startY, endX, endY);
                    }
                }
            }

            // Secondary angular cross-grid - also with spherical projection
            pg.stroke(secR, secG, secB, 120);
            pg.strokeWeight(Math.max(0.35, bandHeight * 0.22));
            const crossAngle = gridAngle + PI / 2.3;
            pg.rotate(crossAngle - gridAngle);

            for (let gx = -safeR; gx <= safeR; gx += Math.round(spacing * 1.4)) {
                const halfChord = Math.sqrt(Math.max(0, safeR * safeR - gx * gx));
                if (halfChord < 5) continue;

                const lineDistNorm = Math.abs(gx) / r;

                for (let yy = -halfChord; yy <= halfChord; yy += Math.max(3, Math.round(segStep * 0.9))) {
                    const baseX = gx;
                    const baseY = yy;

                    const yNorm = baseY / r;
                    const curveDisplacement = lineDistNorm * (1 - yNorm * yNorm) * r * 0.3;
                    const curvedX = baseX + Math.sign(gx) * curveDisplacement;

                    const x = curvedX;
                    const y = baseY;

                    const nx = x / r;
                    const ny = y / r;
                    const nzUnit = Math.sqrt(Math.max(0, 1 - (nx * nx + ny * ny)));
                    if (nzUnit < 0.2) continue;

                    const sampleMultiplier = Math.max(0.0006, (this.radius * noiseScale) * 0.9);
                    const sNX = nx * sampleMultiplier + featureRand * 0.005 + 3.21;
                    const sNY = ny * sampleMultiplier + featureRand * 0.006 + 4.19;
                    const sNZ = nzUnit * sampleMultiplier + featureRand * 0.007 + 2.17;

                    const nVal = pg.noise(sNX * 2.6, sNY * 2.6, sNZ * 1.9);
                    const limbFactor = Math.pow(nzUnit, 0.9);

                    if (nVal > 0.48 * (0.7 + 0.3 * limbFactor)) {
                        const len = Math.max(1, segStep * 0.6);
                        const jitter = (pg.noise(sNX * 1.3, sNY * 1.3) - 0.5) * noiseJitter * 0.6 * (1 - limbFactor);

                        const startYNorm = (y - len) / r;
                        const endYNorm = (y + len) / r;
                        const startCurve = lineDistNorm * (1 - startYNorm * startYNorm) * r * 0.3;
                        const endCurve = lineDistNorm * (1 - endYNorm * endYNorm) * r * 0.3;

                        const startX = baseX + Math.sign(gx || 1) * startCurve + jitter;
                        const startY = y - len;
                        const endX = baseX + Math.sign(gx || 1) * endCurve + jitter;
                        const endY = y + len;

                        if ((startX * startX + startY * startY) > safeR * safeR) continue;
                        if ((endX * endX + endY * endY) > safeR * safeR) continue;

                        pg.line(startX, startY, endX, endY);
                    }
                }
            }

            pg.pop();
        }).call(this);


        // Draw connecting transport/highway lines between hubs - with TRUE spherical projection
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
                    // Compute limb factor at both endpoints
                    const hub1Limb = this._getLimbFactor(hub1.x, hub1.y);
                    const hub2Limb = this._getLimbFactor(hub2.x, hub2.y);
                    const avgLimb = (hub1Limb + hub2Limb) * 0.5;
                    if (avgLimb < 0.2) continue; // Skip lines too close to limb

                    const baseAlpha = 150 - (hubDist / maxHubDist) * 80;
                    pg.stroke(secR, secG, secB, Math.round(baseAlpha * avgLimb));
                    pg.strokeWeight(bandHeight * 0.6 * avgLimb);

                    // Draw curved line following sphere surface
                    this._drawCurvedLine(pg, hub1.x, hub1.y, hub2.x, hub2.y, bufferCenter, r);
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
            // Reddish orbital ring to match space elevator tethers
            pg.stroke(200, 60, 50, 180);
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

            // Add connection points (space elevator tethers) - REDDISH COLOR
            const tethers = Math.floor(random(3, 6));
            for (let t = 0; t < tethers; t++) {
                const tetherAngle = ringAngle + (t / tethers) * TWO_PI_CONST;
                const surfaceX = Math.cos(tetherAngle) * r * 0.9;
                const surfaceY = Math.sin(tetherAngle) * r * 0.9;
                const orbitX = Math.cos(tetherAngle) * ringRadius;
                const orbitY = Math.sin(tetherAngle) * ringRadius * 0.3;

                // Reddish space elevator tethers
                pg.stroke(255, 80, 60, 180);
                pg.strokeWeight(Math.max(0.8, bandHeight * 0.35));
                pg.line(bufferCenter + surfaceX, bufferCenter + surfaceY,
                    bufferCenter + orbitX, bufferCenter + orbitY);

                // Bright reddish point at tether base
                pg.noStroke();
                pg.fill(255, 100, 80, 220);
                pg.ellipse(bufferCenter + surfaceX, bufferCenter + surfaceY,
                    bandHeight * 1.0, bandHeight * 1.0);

                // Add glow around tether base
                pg.fill(255, 60, 40, 100);
                pg.ellipse(bufferCenter + surfaceX, bufferCenter + surfaceY,
                    bandHeight * 2.0, bandHeight * 2.0);
            }
        }

        // 2. AGRICULTURAL PATTERNS (visible geometric farms) - with globe curvature
        const numFarmRegions = Math.floor(random(2, 5));
        for (let fr = 0; fr < numFarmRegions; fr++) {
            const farmAngle = (featureRand * (fr + 1) * 23.7) % TWO_PI_CONST;
            const farmDist = random(r * 0.4, r * 0.85);
            const farmCenterX = Math.cos(farmAngle) * farmDist;
            const farmCenterY = Math.sin(farmAngle) * farmDist;

            // Check if within planet bounds
            const farmDistSq = farmCenterX * farmCenterX + farmCenterY * farmCenterY;
            if (farmDistSq > r * r * 0.9) continue;

            // Compute limb factor at farm center for globe curvature
            const farmLimbFactor = this._getLimbFactor(farmCenterX, farmCenterY);
            if (farmLimbFactor < 0.15) continue; // Skip farms too close to limb

            const farmType = Math.floor((featureRand * (fr + 5) * 11.1) % 3);
            const baseFarmScale = random(r * 0.08, r * 0.15);
            // Scale farm size by limb factor so farms shrink at edges
            const farmScale = baseFarmScale * Math.max(0.3, farmLimbFactor);
            const farmSpacing = farmScale * 0.3;
            // Fade alpha based on limb factor
            const farmAlphaScale = Math.max(0.3, farmLimbFactor);

            pg.push();
            pg.translate(bufferCenter + farmCenterX, bufferCenter + farmCenterY);

            if (farmType === 0) {
                // Circular irrigation patterns (center pivot) - with per-element globe curvature
                const numCircles = Math.floor(random(4, 8));
                for (let c = 0; c < numCircles; c++) {
                    const baseCircRad = (c + 1) * farmSpacing;

                    // For the main circle, we'll draw it as individual arc segments
                    // to allow variable curvature, but for simplicity we use farm center limb
                    const circLimb = farmLimbFactor; // Circle stays uniform
                    const circRad = baseCircRad * Math.max(0.3, circLimb);

                    pg.noFill();
                    pg.stroke(primR, primG, primB, Math.round((25 + c * 5) * circLimb));
                    pg.strokeWeight(Math.max(0.3, bandHeight * 0.15 * circLimb));
                    pg.ellipse(0, 0, circRad * 2, circRad * 2);

                    // Add small dots around circle - each with individual limb factor
                    const dotsOnCircle = Math.floor(circRad * 0.5);
                    for (let d = 0; d < dotsOnCircle; d++) {
                        const dotAngle = (d / dotsOnCircle) * TWO_PI_CONST;
                        const dx = Math.cos(dotAngle) * circRad;
                        const dy = Math.sin(dotAngle) * circRad;

                        // Compute limb factor for this specific dot
                        const dotWorldX = farmCenterX + dx;
                        const dotWorldY = farmCenterY + dy;
                        const dotLimb = this._getLimbFactor(dotWorldX, dotWorldY);
                        if (dotLimb < 0.1) continue;

                        pg.noStroke();
                        pg.fill(secR, secG, secB, Math.round(40 * dotLimb));
                        const dotSize = bandHeight * 0.2 * dotLimb;
                        pg.ellipse(dx, dy, dotSize, dotSize);
                    }
                }
            } else if (farmType === 1) {
                // Hexagonal grid pattern - with TRUE spherical perspective distortion
                const hexSize = farmSpacing * 0.6;
                const hexRows = 8;
                const hexCols = 8;
                pg.noFill();

                for (let row = -hexRows; row < hexRows; row++) {
                    for (let col = -hexCols; col < hexCols; col++) {
                        const xOff = col * hexSize * 1.5;
                        const yOff = row * hexSize * Math.sqrt(3) + (col % 2) * hexSize * Math.sqrt(3) * 0.5;

                        // Compute limb factor for hexagon center
                        const cellWorldX = farmCenterX + xOff;
                        const cellWorldY = farmCenterY + yOff;
                        const cellLimb = this._getLimbFactor(cellWorldX, cellWorldY);
                        if (cellLimb < 0.1) continue; // Skip cells too close to limb

                        // Scale hexagon size and alpha based on limb factor
                        const scaledHexSize = hexSize * Math.max(0.2, cellLimb);

                        pg.stroke(primR, primG, primB, Math.round(35 * cellLimb));
                        pg.strokeWeight(Math.max(0.3, bandHeight * 0.12 * cellLimb));

                        // Draw simple hexagon with scaled size
                        pg.beginShape();
                        for (let h = 0; h < 6; h++) {
                            const hAngle = (h / 6) * TWO_PI_CONST;
                            const hx = xOff + Math.cos(hAngle) * scaledHexSize;
                            const hy = yOff + Math.sin(hAngle) * scaledHexSize;
                            pg.vertex(hx, hy);
                        }
                        pg.endShape(CLOSE);
                    }
                }
            } else {
                // Rectangular field grid - with TRUE spherical perspective distortion
                const gridSize = farmSpacing * 0.8;
                const gridCount = 10;

                for (let gx = -gridCount; gx < gridCount; gx++) {
                    for (let gy = -gridCount; gy < gridCount; gy++) {
                        const rx = gx * gridSize;
                        const ry = gy * gridSize;

                        // Compute limb factor for cell center
                        const cellWorldX = farmCenterX + rx;
                        const cellWorldY = farmCenterY + ry;
                        const cellLimb = this._getLimbFactor(cellWorldX, cellWorldY);
                        if (cellLimb < 0.1) continue; // Skip cells too close to limb

                        // Scale cell size and alpha by local limb factor
                        const cellScale = Math.max(0.2, cellLimb);
                        const scaledGridSize = gridSize * 0.8 * cellScale;
                        const halfGrid = scaledGridSize * 0.5;

                        pg.stroke(primR, primG, primB, Math.round(30 * cellLimb));
                        pg.strokeWeight(Math.max(0.3, bandHeight * 0.15 * cellLimb));
                        pg.noFill();
                        pg.rect(rx - halfGrid, ry - halfGrid, scaledGridSize, scaledGridSize);

                        // Small bright dot at center
                        if ((gx + gy) % 2 === 0) {
                            pg.noStroke();
                            pg.fill(secR, secG, secB, Math.round(45 * cellLimb));
                            const dotSize = bandHeight * 0.25 * cellLimb;
                            pg.ellipse(rx, ry, dotSize, dotSize);
                        }
                    }
                }
            }
            pg.pop();
        }

        // 3. RADIAL CITY PATTERNS (spoke-wheel cities) - with globe curvature
        const numRadialCities = Math.floor(random(1, 3));
        for (let rc = 0; rc < numRadialCities; rc++) {
            // Pick a hub as the center
            if (rc >= cityHubs.length) break;
            const hub = cityHubs[rc];

            // Compute limb factor at hub center
            const hubLimbFactor = this._getLimbFactor(hub.x, hub.y);
            if (hubLimbFactor < 0.2) continue; // Skip hubs too close to limb
            const hubAlphaScale = Math.max(0.3, hubLimbFactor);

            const numSpokes = Math.floor(random(6, 12));
            const baseSpokeLength = hub.size * random(0.8, 1.2);
            // Scale spoke length by limb factor
            const spokeLength = baseSpokeLength * Math.max(0.4, hubLimbFactor);

            for (let sp = 0; sp < numSpokes; sp++) {
                const spokeAngle = (sp / numSpokes) * TWO_PI_CONST;
                const spokeEndX = hub.x + Math.cos(spokeAngle) * spokeLength;
                const spokeEndY = hub.y + Math.sin(spokeAngle) * spokeLength;

                // Compute limb factor at spoke end
                const endLimbFactor = this._getLimbFactor(spokeEndX, spokeEndY);
                const avgLimb = (hubLimbFactor + endLimbFactor) * 0.5;

                // Draw main spoke with globe curvature
                pg.stroke(primR, primG, primB, Math.round(140 * avgLimb));
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.4 * avgLimb));
                this._drawCurvedLine(pg, hub.x, hub.y, spokeEndX, spokeEndY, bufferCenter, r);

                // Add development along spoke
                const segmentsAlongSpoke = Math.floor(random(4, 8));
                for (let seg = 1; seg < segmentsAlongSpoke; seg++) {
                    const t = seg / segmentsAlongSpoke;
                    const segX = hub.x + Math.cos(spokeAngle) * spokeLength * t;
                    const segY = hub.y + Math.sin(spokeAngle) * spokeLength * t;

                    // Compute limb factor at this segment
                    const segLimb = this._getLimbFactor(segX, segY);
                    if (segLimb < 0.15) continue;

                    // Perpendicular development - scale by limb factor
                    const perpAngle = spokeAngle + PI / 2;
                    const perpLen = bandHeight * random(1, 3) * segLimb;

                    pg.stroke(secR, secG, secB, Math.round(100 * segLimb));
                    pg.strokeWeight(Math.max(0.3, bandHeight * 0.25 * segLimb));
                    pg.line(
                        bufferCenter + segX - Math.cos(perpAngle) * perpLen,
                        bufferCenter + segY - Math.sin(perpAngle) * perpLen,
                        bufferCenter + segX + Math.cos(perpAngle) * perpLen,
                        bufferCenter + segY + Math.sin(perpAngle) * perpLen
                    );

                    // Bright node at intersection
                    pg.noStroke();
                    pg.fill(accR, accG, accB, Math.round(160 * segLimb));
                    const nodeSize = bandHeight * 0.6 * segLimb;
                    pg.ellipse(bufferCenter + segX, bufferCenter + segY, nodeSize, nodeSize);
                }
            }

            // Ring roads around the radial city
            const numRings = Math.floor(random(2, 4));
            for (let ring = 1; ring <= numRings; ring++) {
                const ringRad = (ring / numRings) * spokeLength;
                pg.noFill();
                pg.stroke(secR, secG, secB, Math.round(80 * hubAlphaScale));
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.3 * hubLimbFactor));
                pg.ellipse(bufferCenter + hub.x, bufferCenter + hub.y,
                    ringRad * 2, ringRad * 2);
            }
        }

        // 4. ARCOLOGIES (super-tall mega-buildings) - with globe curvature
        const numArcologies = Math.floor(random(1, 4));
        for (let arc = 0; arc < numArcologies; arc++) {
            const arcAngle = (featureRand * (arc + 7) * 19.3) % TWO_PI_CONST;
            const arcDist = random(r * 0.3, r * 0.8);
            const arcX = Math.cos(arcAngle) * arcDist;
            const arcY = Math.sin(arcAngle) * arcDist;

            // Check bounds
            if (arcX * arcX + arcY * arcY > r * r * 0.9) continue;

            // Compute limb factor for arcology position
            const arcLimbFactor = this._getLimbFactor(arcX, arcY);
            if (arcLimbFactor < 0.2) continue; // Skip arcologies too close to limb
            const arcScale = Math.max(0.3, arcLimbFactor);

            // Draw bright glow for arcology
            pg.push();
            pg.translate(bufferCenter + arcX, bufferCenter + arcY);

            // Outer glow - scaled by limb factor
            const baseGlowSize = bandHeight * random(2.5, 4);
            const glowSize = baseGlowSize * arcScale;
            pg.noStroke();
            for (let g = 3; g > 0; g--) {
                const gSize = glowSize * (g / 3);
                const gAlpha = Math.round((60 / g) * arcLimbFactor);
                pg.fill(accR, accG, accB, gAlpha);
                pg.ellipse(0, 0, gSize, gSize);
            }

            // Bright core - scaled
            const coreSize = bandHeight * 1.2 * arcScale;
            pg.fill(accR, accG, accB, Math.round(220 * arcLimbFactor));
            pg.ellipse(0, 0, coreSize, coreSize);

            // Cross-pattern indicating structure - scaled
            pg.stroke(255, 255, 255, Math.round(180 * arcLimbFactor));
            pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * arcScale));
            const crossSize = bandHeight * 1.5 * arcScale;
            pg.line(-crossSize, 0, crossSize, 0);
            pg.line(0, -crossSize, 0, crossSize);

            pg.pop();
        }

        // 5. INDUSTRIAL ZONES (uniform bright patches) - with globe curvature
        const numIndustrial = Math.floor(random(2, 5));
        for (let ind = 0; ind < numIndustrial; ind++) {
            const indAngle = (featureRand * (ind + 13) * 27.1) % TWO_PI_CONST;
            const indDist = random(r * 0.4, r * 0.85);
            const indX = Math.cos(indAngle) * indDist;
            const indY = Math.sin(indAngle) * indDist;

            if (indX * indX + indY * indY > r * r * 0.9) continue;

            // Compute limb factor at zone center
            const zoneLimbFactor = this._getLimbFactor(indX, indY);
            if (zoneLimbFactor < 0.2) continue; // Skip zones too close to limb
            const zoneScale = Math.max(0.3, zoneLimbFactor);

            const baseIndSize = random(r * 0.04, r * 0.08);
            const indSize = baseIndSize * zoneScale;
            const indGridSpacing = Math.max(1, bandHeight * 0.8 * zoneScale);

            pg.push();
            pg.translate(bufferCenter + indX, bufferCenter + indY);

            // Uniform grid of bright lights - scaled
            const gridExtent = Math.floor(indSize / indGridSpacing);
            for (let gx = -gridExtent; gx <= gridExtent; gx++) {
                for (let gy = -gridExtent; gy <= gridExtent; gy++) {
                    const px = gx * indGridSpacing;
                    const py = gy * indGridSpacing;

                    // Compute per-point limb factor for more accurate fade
                    const pointWorldX = indX + px;
                    const pointWorldY = indY + py;
                    const pointLimb = this._getLimbFactor(pointWorldX, pointWorldY);
                    if (pointLimb < 0.1) continue;

                    // Brightness and size scaled by local limb factor
                    pg.noStroke();
                    pg.fill(primR, primG, primB, Math.round(150 * pointLimb));
                    const dotSize = bandHeight * 0.5 * pointLimb;
                    pg.ellipse(px, py, dotSize, dotSize);
                }
            }
            pg.pop();
        }


        // 6. TERRAFORMING/ATMOSPHERIC PROCESSORS (distinct geometric stations) - with globe curvature
        if ((featureRand * 53.7) % 1 > 0.7) {
            const numProcessors = Math.floor(random(2, 5));
            for (let proc = 0; proc < numProcessors; proc++) {
                const procAngle = (proc / numProcessors) * TWO_PI_CONST + random(-0.3, 0.3);
                const procDist = random(r * 0.6, r * 0.9);
                const procX = Math.cos(procAngle) * procDist;
                const procY = Math.sin(procAngle) * procDist;

                if (procX * procX + procY * procY > r * r) continue;

                // Compute limb factor for processor position
                const procLimbFactor = this._getLimbFactor(procX, procY);
                if (procLimbFactor < 0.15) continue; // Skip processors too close to limb
                const procScale = Math.max(0.25, procLimbFactor);

                pg.push();
                pg.translate(bufferCenter + procX, bufferCenter + procY);

                // Draw processor as geometric structure - scaled
                const baseProcSize = bandHeight * random(2, 3);
                const procSize = baseProcSize * procScale;

                // Rotating square/diamond - scaled
                pg.push();
                pg.rotate(PI / 4);
                pg.noFill();
                pg.stroke(accR, accG, accB, Math.round(180 * procLimbFactor));
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * procScale));
                pg.rect(-procSize / 2, -procSize / 2, procSize, procSize);
                pg.pop();

                // Center bright point - scaled
                pg.noStroke();
                const centerSize = bandHeight * 0.7 * procScale;
                pg.fill(255, 255, 255, Math.round(200 * procLimbFactor));
                pg.ellipse(0, 0, centerSize, centerSize);

                // Energy lines radiating out - scaled
                const numEnergyLines = 4;
                for (let el = 0; el < numEnergyLines; el++) {
                    const elAngle = (el / numEnergyLines) * TWO_PI_CONST;
                    const elLen = procSize * 1.2;
                    pg.stroke(secR, secG, secB, Math.round(140 * procLimbFactor));
                    pg.strokeWeight(Math.max(0.3, bandHeight * 0.2 * procScale));
                    pg.line(0, 0,
                        Math.cos(elAngle) * elLen,
                        Math.sin(elAngle) * elLen);
                }

                pg.pop();
            }
        }

        // 7. SOLAR COLLECTOR ARRAYS (Dyson Swarm elements) - GOLD/ORANGE/WHITE
        if ((featureRand * 47.3) % 1 > 0.7) {
            const numCollectors = Math.floor(random(2, 5));
            for (let sc = 0; sc < numCollectors; sc++) {
                const scAngle = (sc / numCollectors) * TWO_PI_CONST + (featureRand * 3.14);
                const scDist = random(r * 0.3, r * 0.7);
                const scX = Math.cos(scAngle) * scDist;
                const scY = Math.sin(scAngle) * scDist;

                if (scX * scX + scY * scY > r * r * 0.8) continue;

                const scLimbFactor = this._getLimbFactor(scX, scY);
                if (scLimbFactor < 0.2) continue;
                // [SPHERICAL PROJECTION] Constant scale, limb determines radial squash
                const scScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + scX, bufferCenter + scY);
                // Apply spherical projection: rotate to radial vector, squash radial axis, un-rotate
                const radAngle = Math.atan2(scY, scX);
                pg.rotate(radAngle);
                pg.scale(scLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // SPIRAL ARRAY DESIGN (Non-concentric)
                const panelSize = bandHeight * random(7, 11) * scScale;

                // Spiral arms of collector panels
                pg.noFill();
                pg.stroke(255, 180, 40, Math.round(180 * scLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * scScale));

                for (let arm = 0; arm < 3; arm++) {
                    const armStartAngle = (arm / 3) * TWO_PI_CONST;
                    pg.beginShape();
                    for (let p = 0; p < 5; p++) {
                        const t = p / 4;
                        const angle = armStartAngle + t * 2.0;
                        const dist = panelSize * (0.2 + t * 0.8);
                        pg.vertex(Math.cos(angle) * dist, Math.sin(angle) * dist);

                        // Panel at vertex
                        if (p > 0) {
                            pg.push();
                            pg.translate(Math.cos(angle) * dist, Math.sin(angle) * dist);
                            pg.rotate(angle);
                            pg.fill(255, 200, 50, Math.round(120 * scLimbFactor)); // Increased alpha
                            pg.noStroke();
                            pg.rect(-bandHeight * 0.5 * scScale, -bandHeight * 0.3 * scScale, bandHeight * 1.0 * scScale, bandHeight * 0.6 * scScale);
                            pg.pop();
                        }
                    }
                    pg.endShape();
                }

                // Central node - not a simple circle
                pg.stroke(255, 220, 100, Math.round(200 * scLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * scScale));
                pg.noFill();
                pg.beginShape();
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * TWO_PI_CONST - PI / 6;
                    pg.vertex(Math.cos(angle) * panelSize * 0.3, Math.sin(angle) * panelSize * 0.3);
                }
                pg.endShape(CLOSE);

                // Core glow - very subtle
                pg.noStroke();
                pg.fill(255, 255, 220, Math.round(150 * scLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, panelSize * 0.15, panelSize * 0.15);

                pg.pop();
            }
        }

        // 8. ORBITAL DEFENSE PLATFORMS - CYAN/BLUE/RED/WHITE
        if ((featureRand * 61.9) % 1 > 0.75) {
            const numDefense = Math.floor(random(2, 5));
            for (let df = 0; df < numDefense; df++) {
                const dfAngle = (df / numDefense) * TWO_PI_CONST + random(-0.2, 0.2);
                const dfDist = random(r * 0.4, r * 0.8);
                const dfX = Math.cos(dfAngle) * dfDist;
                const dfY = Math.sin(dfAngle) * dfDist;

                if (dfX * dfX + dfY * dfY > r * r * 0.85) continue;

                const dfLimbFactor = this._getLimbFactor(dfX, dfY);
                if (dfLimbFactor < 0.2) continue;
                const dfScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + dfX, bufferCenter + dfY);
                const radAngle = Math.atan2(dfY, dfX);
                pg.rotate(radAngle);
                pg.scale(dfLimbFactor, 1.0);
                pg.rotate(-radAngle);

                const dfSize = bandHeight * random(8, 12) * dfScale;

                // Skeleton frame (less solid)
                pg.stroke(0, 200, 255, Math.round(160 * dfLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * dfScale));
                pg.noFill();

                // Triangular lattice
                pg.beginShape();
                for (let t = 0; t < 3; t++) {
                    const tAngle = (t / 3) * TWO_PI_CONST - PI / 2;
                    pg.vertex(Math.cos(tAngle) * dfSize, Math.sin(tAngle) * dfSize);
                    // Internal bracing
                    pg.line(0, 0, Math.cos(tAngle) * dfSize, Math.sin(tAngle) * dfSize);
                }
                pg.endShape(CLOSE);

                // Hardpoints/Turrets - smaller dots
                pg.noStroke();
                for (let wt = 0; wt < 3; wt++) {
                    const wtAngle = (wt / 3) * TWO_PI_CONST - PI / 2;
                    const wtX = Math.cos(wtAngle) * dfSize;
                    const wtY = Math.sin(wtAngle) * dfSize;

                    // Turret base
                    pg.fill(30, 80, 150, Math.round(180 * dfLimbFactor)); // Increased alpha
                    pg.ellipse(wtX, wtY, bandHeight * 0.8 * dfScale, bandHeight * 0.8 * dfScale);

                    // Turret glow - subtle red
                    pg.fill(255, 50, 50, Math.round(160 * dfLimbFactor)); // Increased alpha
                    pg.ellipse(wtX, wtY, bandHeight * 0.4 * dfScale, bandHeight * 0.4 * dfScale);
                }

                // Central command
                pg.fill(200, 240, 255, Math.round(180 * dfLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, dfSize * 0.25, dfSize * 0.25);

                // Targeting beams - very faint
                pg.stroke(255, 80, 80, Math.round(120 * dfLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * dfScale));
                const bAngle = (featureRand * 10) % TWO_PI_CONST;
                pg.line(0, 0, Math.cos(bAngle) * dfSize * 2, Math.sin(bAngle) * dfSize * 2);

                pg.pop();
            }
        }

        // 9. MASS DRIVER / RAILGUN ARRAYS - VIOLET/PURPLE/CYAN/WHITE
        if ((featureRand * 73.1) % 1 > 0.78) {
            const numRailguns = Math.floor(random(2, 4));
            for (let rg = 0; rg < numRailguns; rg++) {
                const rgAngle = (featureRand * (rg + 1) * 31.7) % TWO_PI_CONST;
                const rgDist = random(r * 0.4, r * 0.75);
                const rgX = Math.cos(rgAngle) * rgDist;
                const rgY = Math.sin(rgAngle) * rgDist;

                if (rgX * rgX + rgY * rgY > r * r * 0.85) continue;

                const rgLimbFactor = this._getLimbFactor(rgX, rgY);
                if (rgLimbFactor < 0.2) continue;
                const rgScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + rgX, bufferCenter + rgY);
                const radAngle = Math.atan2(rgY, rgX);
                pg.rotate(radAngle);
                pg.scale(rgLimbFactor, 1.0);
                pg.rotate(-radAngle);

                const rgLen = bandHeight * random(12, 18) * rgScale;
                const rgWidth = bandHeight * 1.5 * rgScale;
                const barrelAngle = rgAngle + PI;

                pg.push();
                pg.rotate(barrelAngle);

                // Open frame barrel design
                pg.stroke(140, 80, 200, Math.round(180 * rgLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, rgWidth * 0.3));

                // Top and bottom rails
                pg.line(0, -rgWidth * 0.5, rgLen, -rgWidth * 0.5);
                pg.line(0, rgWidth * 0.5, rgLen, rgWidth * 0.5);

                // Accelerator coils - spaced out
                pg.stroke(0, 220, 255, Math.round(140 * rgLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.3, bandHeight * 0.2 * rgScale));
                for (let ring = 1; ring <= 6; ring++) {
                    const ringX = rgLen * (ring / 7);
                    // Diagonal cross-bracing per segment
                    pg.line(ringX, -rgWidth * 0.8, ringX, rgWidth * 0.8);
                }

                pg.pop();

                // Base power station - Geometric, not just round
                pg.noStroke();
                // Hexagonal base
                pg.fill(120, 60, 180, Math.round(150 * rgLimbFactor)); // Increased alpha
                pg.beginShape();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TWO_PI_CONST;
                    pg.vertex(Math.cos(a) * bandHeight * 2.5 * rgScale, Math.sin(a) * bandHeight * 2.5 * rgScale);
                }
                pg.endShape(CLOSE);

                // Core
                pg.fill(200, 180, 255, Math.round(180 * rgLimbFactor)); // Increased alpha
                pg.rect(-bandHeight * rgScale, -bandHeight * rgScale, bandHeight * 2 * rgScale, bandHeight * 2 * rgScale);

                pg.pop();
            }
        }

        // 10. FUSION POWER ARRAYS - STELLARATOR DESIGN
        if ((featureRand * 83.7) % 1 > 0.72) {
            const numFusion = Math.floor(random(2, 4));
            for (let fu = 0; fu < numFusion; fu++) {
                const fuAngle = (featureRand * (fu + 3) * 17.9) % TWO_PI_CONST;
                const fuDist = random(r * 0.3, r * 0.65);
                const fuX = Math.cos(fuAngle) * fuDist;
                const fuY = Math.sin(fuAngle) * fuDist;

                if (fuX * fuX + fuY * fuY > r * r * 0.8) continue;

                const fuLimbFactor = this._getLimbFactor(fuX, fuY);
                if (fuLimbFactor < 0.2) continue;
                const fuScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + fuX, bufferCenter + fuY);
                const radAngle = Math.atan2(fuY, fuX);
                pg.rotate(radAngle);
                pg.scale(fuLimbFactor, 1.0);
                pg.rotate(-radAngle);

                const fuSize = bandHeight * random(8, 12) * fuScale;

                // Stellarator design: Interlocking twisted loops (figure-8 ish)
                pg.noFill();
                pg.stroke(255, 120, 20, Math.round(160 * fuLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.6, bandHeight * 0.3 * fuScale));

                pg.beginShape();
                for (let i = 0; i <= 30; i++) {
                    const t = (i / 30) * TWO_PI_CONST;
                    // Parametric twisted loop
                    const lx = Math.cos(t) * fuSize;
                    const ly = Math.sin(t) * Math.cos(t) * fuSize * 0.6; // Figure 8-ish
                    pg.vertex(lx, ly);
                }
                pg.endShape(CLOSE);

                // Second interlocking loop
                pg.stroke(255, 180, 50, Math.round(160 * fuLimbFactor)); // Increased alpha
                pg.push();
                pg.rotate(PI / 2);
                pg.beginShape();
                for (let i = 0; i <= 30; i++) {
                    const t = (i / 30) * TWO_PI_CONST;
                    const lx = Math.cos(t) * fuSize * 0.8;
                    const ly = Math.sin(t) * Math.cos(t) * fuSize * 0.5;
                    pg.vertex(lx, ly);
                }
                pg.endShape(CLOSE);
                pg.pop();

                // Central Plasma Node - subtle
                pg.noStroke();
                pg.fill(200, 220, 255, Math.round(100 * fuLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, fuSize * 0.5, fuSize * 0.5);
                pg.fill(255, 255, 255, Math.round(200 * fuLimbFactor)); // Hot center
                pg.ellipse(0, 0, fuSize * 0.15, fuSize * 0.15);

                pg.pop();
            }
        }

        // 11. GEODESIC DOME CLUSTERS - GREEN/BLUE/YELLOW/WHITE
        if ((featureRand * 91.3) % 1 > 0.68) {
            const numDomes = Math.floor(random(2, 5));
            for (let bd = 0; bd < numDomes; bd++) {
                const bdAngle = (featureRand * (bd + 2) * 29.3) % TWO_PI_CONST;
                const bdDist = random(r * 0.25, r * 0.7);
                const bdX = Math.cos(bdAngle) * bdDist;
                const bdY = Math.sin(bdAngle) * bdDist;

                if (bdX * bdX + bdY * bdY > r * r * 0.8) continue;

                const bdLimbFactor = this._getLimbFactor(bdX, bdY);
                if (bdLimbFactor < 0.2) continue;
                const bdScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + bdX, bufferCenter + bdY);
                const radAngle = Math.atan2(bdY, bdX);
                pg.rotate(radAngle);
                pg.scale(bdLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // Cluster of interconnected geodesic domes
                const clusterSize = bandHeight * random(10, 16) * bdScale;

                // Central large dome - bright green outline with hexagonal pattern
                const mainDomeR = clusterSize * 0.45;
                pg.stroke(80, 220, 120, Math.round(160 * bdLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * bdScale));
                pg.noFill();
                pg.ellipse(0, 0, mainDomeR * 2, mainDomeR * 2);

                // Hexagonal glass panels on main dome
                pg.stroke(100, 255, 150, Math.round(120 * bdLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * bdScale));
                for (let h = 0; h < 6; h++) {
                    const hAngle = (h / 6) * TWO_PI_CONST;
                    const nextAngle = ((h + 1) / 6) * TWO_PI_CONST;
                    pg.line(
                        Math.cos(hAngle) * mainDomeR * 0.5, Math.sin(hAngle) * mainDomeR * 0.5,
                        Math.cos(hAngle) * mainDomeR, Math.sin(hAngle) * mainDomeR
                    );
                    pg.line(
                        Math.cos(hAngle) * mainDomeR * 0.5, Math.sin(hAngle) * mainDomeR * 0.5,
                        Math.cos(nextAngle) * mainDomeR * 0.5, Math.sin(nextAngle) * mainDomeR * 0.5
                    );
                }

                // Interior glow - forest green
                pg.noStroke();
                pg.fill(50, 180, 90, Math.round(100 * bdLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, mainDomeR * 1.6, mainDomeR * 1.6);

                // Central atrium - bright white
                pg.fill(200, 255, 220, Math.round(180 * bdLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, mainDomeR * 0.35, mainDomeR * 0.35);

                // 4 smaller satellite domes around the main one
                const satelliteR = mainDomeR * 0.5;
                const satelliteDist = mainDomeR * 1.3;
                for (let sd = 0; sd < 4; sd++) {
                    const sdAngle = (sd / 4) * TWO_PI_CONST + PI / 4;
                    const sdX = Math.cos(sdAngle) * satelliteDist;
                    const sdY = Math.sin(sdAngle) * satelliteDist;

                    // Satellite dome outline - teal
                    pg.stroke(60, 200, 160, Math.round(150 * bdLimbFactor)); // Increased alpha
                    pg.strokeWeight(Math.max(0.6, bandHeight * 0.35 * bdScale));
                    pg.noFill();
                    pg.ellipse(sdX, sdY, satelliteR * 2, satelliteR * 2);

                    // Satellite inner glow
                    pg.noStroke();
                    pg.fill(70, 190, 130, Math.round(120 * bdLimbFactor)); // Increased alpha
                    pg.ellipse(sdX, sdY, satelliteR * 1.5, satelliteR * 1.5);

                    // Satellite core - varies color
                    if (sd === 0) pg.fill(100, 180, 255, Math.round(150 * bdLimbFactor));
                    else if (sd === 1) pg.fill(40, 160, 60, Math.round(150 * bdLimbFactor));
                    else if (sd === 2) pg.fill(255, 220, 100, Math.round(150 * bdLimbFactor));
                    else pg.fill(180, 220, 200, Math.round(150 * bdLimbFactor));
                    pg.ellipse(sdX, sdY, satelliteR * 0.6, satelliteR * 0.6);

                    // Connecting walkway to main dome - white
                    pg.stroke(180, 220, 190, Math.round(130 * bdLimbFactor)); // Increased alpha
                    pg.strokeWeight(Math.max(0.4, bandHeight * 0.25 * bdScale));
                    pg.line(
                        Math.cos(sdAngle) * mainDomeR, Math.sin(sdAngle) * mainDomeR,
                        sdX - Math.cos(sdAngle) * satelliteR, sdY - Math.sin(sdAngle) * satelliteR
                    );
                }

                // Solar collectors on top of main dome - gold
                pg.noStroke();
                pg.fill(255, 230, 100, Math.round(160 * bdLimbFactor)); // Increased alpha
                pg.ellipse(0, -mainDomeR * 0.3, bandHeight * 1.0 * bdScale, bandHeight * 0.5 * bdScale);
                pg.ellipse(mainDomeR * 0.4, -mainDomeR * 0.1, bandHeight * 0.6 * bdScale, bandHeight * 0.3 * bdScale);
                pg.ellipse(-mainDomeR * 0.4, -mainDomeR * 0.1, bandHeight * 0.6 * bdScale, bandHeight * 0.3 * bdScale);

                pg.pop();
            }
        }

        // 12. QUANTUM COMMUNICATION RELAYS - BLUE/PURPLE/WHITE/CYAN
        if ((featureRand * 67.7) % 1 > 0.78) {
            const numRelays = Math.floor(random(2, 4));
            for (let qr = 0; qr < numRelays; qr++) {
                const qrAngle = (featureRand * (qr + 5) * 41.3) % TWO_PI_CONST;
                const qrDist = random(r * 0.35, r * 0.75);
                const qrX = Math.cos(qrAngle) * qrDist;
                const qrY = Math.sin(qrAngle) * qrDist;

                if (qrX * qrX + qrY * qrY > r * r * 0.85) continue;

                const qrLimbFactor = this._getLimbFactor(qrX, qrY);
                if (qrLimbFactor < 0.2) continue;
                const qrScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + qrX, bufferCenter + qrY);
                const radAngle = Math.atan2(qrY, qrX);
                pg.rotate(radAngle);
                pg.scale(qrLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // MUCH LARGER relay complex
                const qrHeight = bandHeight * random(10, 16) * qrScale;
                const qrBase = bandHeight * 3 * qrScale;

                // Main tower structure - gradient blue to purple
                pg.stroke(40, 100, 200, Math.round(180 * qrLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * qrScale));
                pg.line(0, 0, 0, -qrHeight * 0.6);

                pg.stroke(80, 80, 220, Math.round(160 * qrLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.6, bandHeight * 0.4 * qrScale));
                pg.line(0, -qrHeight * 0.5, 0, -qrHeight);

                // Main dish - large cyan parabolic
                pg.noFill();
                pg.stroke(0, 255, 255, Math.round(180 * qrLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.7, bandHeight * 0.4 * qrScale));
                pg.arc(0, -qrHeight, bandHeight * 5 * qrScale, bandHeight * 3.5 * qrScale, PI, TWO_PI);

                // Secondary dishes - smaller, white
                pg.stroke(200, 220, 255, Math.round(150 * qrLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.25 * qrScale));
                pg.arc(-bandHeight * 2 * qrScale, -qrHeight * 0.7, bandHeight * 2 * qrScale, bandHeight * 1.5 * qrScale, PI, TWO_PI);
                pg.arc(bandHeight * 2 * qrScale, -qrHeight * 0.7, bandHeight * 2 * qrScale, bandHeight * 1.5 * qrScale, PI, TWO_PI);

                // Transmission beams - purple laser
                pg.stroke(180, 100, 255, Math.round(120 * qrLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.3, bandHeight * 0.15 * qrScale));
                pg.line(0, -qrHeight, 0, -qrHeight - bandHeight * 6 * qrScale);
                pg.line(0, -qrHeight, -bandHeight * 3 * qrScale, -qrHeight - bandHeight * 5 * qrScale);
                pg.line(0, -qrHeight, bandHeight * 3 * qrScale, -qrHeight - bandHeight * 5 * qrScale);

                // Signal waves - expanding cyan rings
                pg.noFill();
                pg.stroke(100, 255, 255, Math.round(80 * qrLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * qrScale));
                for (let w = 1; w <= 4; w++) {
                    pg.arc(0, -qrHeight, bandHeight * w * 2 * qrScale, bandHeight * w * 1.4 * qrScale, PI + 0.3, TWO_PI - 0.3);
                }

                // Base station complex - multi-level
                pg.noStroke();
                pg.fill(60, 100, 180, Math.round(160 * qrLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, qrBase * 2, qrBase * 1.5);
                pg.fill(100, 140, 220, Math.round(180 * qrLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, qrBase * 1.4, qrBase * 1.0);
                pg.fill(150, 180, 255, Math.round(200 * qrLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, qrBase * 0.8, qrBase * 0.6);

                pg.pop();
            }
        }

        // 13. MINING EXTRACTION FACILITIES - AMBER/BROWN/ORANGE/RED/WHITE
        if ((featureRand * 79.1) % 1 > 0.7) {
            const numMines = Math.floor(random(2, 5));
            for (let mn = 0; mn < numMines; mn++) {
                const mnAngle = (featureRand * (mn + 7) * 23.7) % TWO_PI_CONST;
                const mnDist = random(r * 0.4, r * 0.8);
                const mnX = Math.cos(mnAngle) * mnDist;
                const mnY = Math.sin(mnAngle) * mnDist;

                if (mnX * mnX + mnY * mnY > r * r * 0.85) continue;

                const mnLimbFactor = this._getLimbFactor(mnX, mnY);
                if (mnLimbFactor < 0.2) continue;
                const mnScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + mnX, bufferCenter + mnY);
                const radAngle = Math.atan2(mnY, mnX);
                pg.rotate(radAngle);
                pg.scale(mnLimbFactor, 1.0);
                pg.rotate(-radAngle);

                const mnSize = bandHeight * random(10, 15) * mnScale;

                // Jagged/Irregular Excavation Pit (no longer concentric)
                pg.noFill();
                pg.stroke(140, 100, 40, Math.round(180 * mnLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * mnScale));

                pg.beginShape();
                for (let i = 0; i < 8; i++) {
                    const angle = (i / 8) * TWO_PI_CONST;
                    const d = mnSize * (1.0 + random(-0.2, 0.2)); // Irregularity
                    pg.vertex(Math.cos(angle) * d, Math.sin(angle) * d);
                }
                pg.endShape(CLOSE);

                // Inner extraction arms
                pg.stroke(220, 120, 40, Math.round(150 * mnLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * mnScale));
                for (let arm = 0; arm < 3; arm++) {
                    const angle = (arm / 3) * TWO_PI_CONST;
                    pg.line(0, 0, Math.cos(angle) * mnSize * 1.2, Math.sin(angle) * mnSize * 1.2);
                }

                // Central deep pit - dark gradient
                pg.noStroke();
                pg.fill(60, 40, 20, Math.round(180 * mnLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, mnSize * 0.7, mnSize * 0.7);

                // Magma glow at bottom - red/orange, varied
                pg.fill(255, 100, 30, Math.round(150 * mnLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, mnSize * 0.25, mnSize * 0.25);

                // Processing facilities around irregular edge
                for (let pf = 0; pf < 6; pf++) {
                    const pfAngle = (pf / 6) * TWO_PI_CONST + random(0.5);
                    const pfDist = mnSize * random(1.1, 1.4);
                    const pfX = Math.cos(pfAngle) * pfDist;
                    const pfY = Math.sin(pfAngle) * pfDist;

                    // Facility building
                    pg.fill(200, 180, 120, Math.round(180 * mnLimbFactor)); // Increased alpha
                    pg.rect(pfX, pfY, bandHeight * 0.8 * mnScale, bandHeight * 0.6 * mnScale);

                    // Warning lights - red
                    if (pf % 2 === 0) {
                        pg.fill(255, 50, 50, Math.round(200 * mnLimbFactor)); // Increased alpha
                        pg.ellipse(pfX, pfY, bandHeight * 0.3 * mnScale, bandHeight * 0.3 * mnScale);
                    }
                }

                pg.pop();
            }
        }

        // 14. ANTIMATTER CONTAINMENT FACILITIES - MAGENTA/PINK/CYAN/WHITE
        if ((featureRand * 97.3) % 1 > 0.78) {
            const numAntimatter = Math.floor(random(2, 4));
            for (let am = 0; am < numAntimatter; am++) {
                const amAngle = (featureRand * (am + 11) * 37.9) % TWO_PI_CONST;
                const amDist = random(r * 0.3, r * 0.65);
                const amX = Math.cos(amAngle) * amDist;
                const amY = Math.sin(amAngle) * amDist;

                if (amX * amX + amY * amY > r * r * 0.8) continue;

                const amLimbFactor = this._getLimbFactor(amX, amY);
                if (amLimbFactor < 0.2) continue;
                const amScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + amX, bufferCenter + amY);
                const radAngle = Math.atan2(amY, amX);
                pg.rotate(radAngle);
                pg.scale(amLimbFactor, 1.0);
                pg.rotate(-radAngle);

                const amSize = bandHeight * random(8, 12) * amScale;

                // Geometric Cage Containment (not just spheres)
                pg.noFill();
                pg.stroke(255, 30, 180, Math.round(120 * amLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * amScale));

                // Outer Hexagon Cage
                pg.beginShape();
                for (let i = 0; i < 6; i++) {
                    const a = (i / 6) * TWO_PI_CONST;
                    pg.vertex(Math.cos(a) * amSize * 2.0, Math.sin(a) * amSize * 2.0);
                }
                pg.endShape(CLOSE);

                // Inner Square Cage (rotated)
                pg.stroke(0, 255, 255, Math.round(150 * amLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.6, bandHeight * 0.35 * amScale));
                pg.push();
                pg.rotate(PI / 4);
                pg.rect(-amSize * 1.2, -amSize * 1.2, amSize * 2.4, amSize * 2.4);
                pg.pop();

                // Antimatter core - brilliant white center
                pg.noStroke();
                pg.fill(255, 240, 255, Math.round(200 * amLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, amSize * 0.4, amSize * 0.4);

                // Inner glow - hot white-pink
                pg.fill(255, 200, 255, Math.round(150 * amLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, amSize * 0.6, amSize * 0.6);

                // Warning markers - alternating red and yellow at hex vertices
                for (let w = 0; w < 6; w++) {
                    const wAngle = (w / 6) * TWO_PI_CONST;
                    const wx = Math.cos(wAngle) * amSize * 2.0;
                    const wy = Math.sin(wAngle) * amSize * 2.0;

                    if (w % 2 === 0) {
                        pg.fill(255, 50, 50, Math.round(180 * amLimbFactor)); // Increased alpha
                    } else {
                        pg.fill(255, 220, 50, Math.round(160 * amLimbFactor)); // Increased alpha
                    }
                    pg.ellipse(wx, wy, bandHeight * 0.6 * amScale, bandHeight * 0.6 * amScale);
                }

                pg.pop();
            }
        }

        // 15. ORBITAL SHIPYARD FACILITIES - STEEL BLUE/ORANGE/YELLOW/WHITE
        if ((featureRand * 103.7) % 1 > 0.74) {
            const numShipyards = Math.floor(random(1, 4)); // Slightly more common
            for (let sy = 0; sy < numShipyards; sy++) {
                const syAngle = (featureRand * (sy + 13) * 43.1) % TWO_PI_CONST;
                const syDist = random(r * 0.4, r * 0.8);
                const syX = Math.cos(syAngle) * syDist;
                const syY = Math.sin(syAngle) * syDist;

                if (syX * syX + syY * syY > r * r * 0.85) continue;

                const syLimbFactor = this._getLimbFactor(syX, syY);
                if (syLimbFactor < 0.2) continue;
                const syScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + syX, bufferCenter + syY);
                const radAngle = Math.atan2(syY, syX);
                pg.rotate(radAngle);
                pg.scale(syLimbFactor, 1.0);
                pg.rotate(-radAngle);

                const syWidth = bandHeight * random(14, 20) * syScale;
                const syHeight = bandHeight * random(6, 9) * syScale;

                // Main structural frame - steel blue
                pg.stroke(100, 140, 180, Math.round(180 * syLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * syScale));
                pg.noFill();
                pg.rect(-syWidth / 2, -syHeight / 2, syWidth, syHeight);

                // Inner frame - lighter steel
                pg.stroke(140, 170, 210, Math.round(160 * syLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.6, bandHeight * 0.35 * syScale));
                pg.rect(-syWidth / 2.3, -syHeight / 2.3, syWidth / 1.15, syHeight / 1.15);

                // Drydock bays with ships under construction
                const numBays = 4;
                pg.stroke(120, 160, 200, Math.round(140 * syLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * syScale));
                for (let bay = 0; bay < numBays; bay++) {
                    const bayX = -syWidth / 2 + (bay + 0.5) * (syWidth / numBays);
                    pg.line(bayX, -syHeight / 2, bayX, syHeight / 2);

                    // Ship hull in each bay - grey/silver
                    pg.noStroke();
                    pg.fill(160, 170, 180, Math.round(150 * syLimbFactor)); // Increased alpha
                    const shipLen = syHeight * 0.7;
                    const shipW = (syWidth / numBays) * 0.4;
                    pg.ellipse(bayX, 0, shipW, shipLen);

                    // Ship lights - orange welding (sparking)
                    if (random() > 0.5) {
                        pg.fill(255, 150, 50, Math.round(200 * syLimbFactor)); // Increased alpha
                        pg.ellipse(bayX + random(-shipW / 3, shipW / 3), random(-shipLen / 3, shipLen / 3),
                            bandHeight * 0.4 * syScale, bandHeight * 0.4 * syScale);
                    }
                    pg.stroke(120, 160, 200, Math.round(140 * syLimbFactor)); // Increased alpha
                    pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * syScale));
                }

                // Work lights - bright white-blue dots
                pg.noStroke();
                pg.fill(220, 240, 255, Math.round(180 * syLimbFactor)); // Increased alpha
                for (let wl = 0; wl < 15; wl++) {
                    const wlX = random(-syWidth / 2.2, syWidth / 2.2);
                    const wlY = random(-syHeight / 2.2, syHeight / 2.2);
                    pg.ellipse(wlX, wlY, bandHeight * 0.4 * syScale, bandHeight * 0.4 * syScale);
                }

                // Warning lights - yellow blinking
                pg.fill(255, 220, 50, Math.round(180 * syLimbFactor)); // Increased alpha
                pg.ellipse(-syWidth / 2, -syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale);
                pg.ellipse(syWidth / 2, -syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale);
                pg.ellipse(-syWidth / 2, syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale);
                pg.ellipse(syWidth / 2, syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale);

                // Crane arms extending - dark steel with orange tips
                pg.stroke(80, 110, 150, Math.round(150 * syLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.25 * syScale));
                const craneLen = bandHeight * 4 * syScale;
                pg.line(-syWidth / 2, 0, -syWidth / 2 - craneLen, -craneLen * 0.4);
                pg.line(syWidth / 2, 0, syWidth / 2 + craneLen, -craneLen * 0.4);

                // Crane tips - orange
                pg.noStroke();
                pg.fill(255, 140, 40, Math.round(200 * syLimbFactor)); // Increased alpha
                pg.ellipse(-syWidth / 2 - craneLen, -craneLen * 0.4, bandHeight * 0.5 * syScale, bandHeight * 0.5 * syScale);
                pg.ellipse(syWidth / 2 + craneLen, -craneLen * 0.4, bandHeight * 0.5 * syScale, bandHeight * 0.5 * syScale);

                pg.pop();
            }
        }

        // 16. ATMOSPHERIC SCRUBBERS / TERRAFORMING TOWERS - TEAL
        if ((featureRand * 109.1) % 1 > 0.74) {
            const numScrubbers = Math.floor(random(4, 8));
            for (let as = 0; as < numScrubbers; as++) {
                const asAngle = (featureRand * (as + 17) * 29.7) % TWO_PI_CONST;
                const asDist = random(r * 0.3, r * 0.8);
                const asX = Math.cos(asAngle) * asDist;
                const asY = Math.sin(asAngle) * asDist;

                if (asX * asX + asY * asY > r * r * 0.9) continue;

                const asLimbFactor = this._getLimbFactor(asX, asY);
                if (asLimbFactor < 0.15) continue;
                const asScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + asX, bufferCenter + asY);
                const radAngle = Math.atan2(asY, asX);
                pg.rotate(radAngle);
                pg.scale(asLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // Tower structure - teal
                const asHeight = bandHeight * random(3, 5) * asScale;
                const asWidth = bandHeight * 0.8 * asScale;

                // Main tower
                pg.stroke(0, 180, 180, Math.round(180 * asLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, asWidth));
                pg.line(0, 0, 0, -asHeight);

                // Processing vanes at top
                pg.stroke(50, 220, 200, Math.round(150 * asLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.3, bandHeight * 0.2 * asScale));
                const vaneSpread = bandHeight * 1.5 * asScale;
                pg.line(-vaneSpread, -asHeight, vaneSpread, -asHeight);
                pg.line(-vaneSpread * 0.6, -asHeight * 0.7, vaneSpread * 0.6, -asHeight * 0.7);

                // Emission plume - lighter teal
                pg.noStroke();
                pg.fill(100, 255, 220, Math.round(120 * asLimbFactor)); // Increased alpha
                pg.ellipse(0, -asHeight * 1.2, bandHeight * 2 * asScale, bandHeight * 4 * asScale);

                // Base structure
                pg.fill(0, 150, 160, Math.round(100 * asLimbFactor));
                pg.ellipse(0, 0, bandHeight * 1.5 * asScale, bandHeight * 1.5 * asScale);

                pg.pop();
            }
        }

        // 17. GEOTHERMAL POWER TAPS - DEEP RED/ORANGE
        if ((featureRand * 113.9) % 1 > 0.78) {
            const numGeothermal = Math.floor(random(3, 6));
            for (let gt = 0; gt < numGeothermal; gt++) {
                const gtAngle = (featureRand * (gt + 19) * 31.3) % TWO_PI_CONST;
                const gtDist = random(r * 0.4, r * 0.8);
                const gtX = Math.cos(gtAngle) * gtDist;
                const gtY = Math.sin(gtAngle) * gtDist;

                if (gtX * gtX + gtY * gtY > r * r * 0.9) continue;

                const gtLimbFactor = this._getLimbFactor(gtX, gtY);
                if (gtLimbFactor < 0.2) continue;
                const gtScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + gtX, bufferCenter + gtY);
                const radAngle = Math.atan2(gtY, gtX);
                pg.rotate(radAngle);
                pg.scale(gtLimbFactor, 1.0);
                pg.rotate(-radAngle);

                const gtSize = bandHeight * random(2, 4) * gtScale;

                // Fissure Network (not just a hole)
                pg.noFill();
                pg.stroke(200, 50, 20, Math.round(150 * gtLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.25 * gtScale));

                // Main cracks
                for (let i = 0; i < 3; i++) {
                    const angle = (i / 3) * TWO_PI_CONST + random(0.5);
                    pg.beginShape();
                    pg.vertex(0, 0);
                    pg.vertex(Math.cos(angle) * gtSize * 1.5, Math.sin(angle) * gtSize * 1.5);
                    pg.vertex(Math.cos(angle + 0.2) * gtSize * 2.5, Math.sin(angle + 0.2) * gtSize * 2.5);
                    pg.endShape();
                }

                // Magma glow at center
                pg.noStroke();
                pg.fill(255, 100, 30, Math.round(180 * gtLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, gtSize * 1.0, gtSize * 1.0);

                // Extraction pipes interlaced with fissures
                pg.stroke(180, 80, 40, Math.round(160 * gtLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * gtScale));
                for (let ep = 0; ep < 3; ep++) {
                    const epAngle = (ep / 3) * TWO_PI_CONST + PI / 2;
                    pg.line(
                        Math.cos(epAngle) * gtSize * 0.2, Math.sin(epAngle) * gtSize * 0.2,
                        Math.cos(epAngle) * gtSize * 1.8, Math.sin(epAngle) * gtSize * 1.8
                    );
                }

                // Steam vents - lighter colored
                pg.noStroke();
                pg.fill(255, 150, 100, Math.round(120 * gtLimbFactor)); // Increased alpha
                for (let sv = 0; sv < 3; sv++) {
                    const svAngle = random(0, TWO_PI_CONST);
                    const svDist = gtSize * random(0.8, 1.5);
                    pg.ellipse(
                        Math.cos(svAngle) * svDist, Math.sin(svAngle) * svDist,
                        bandHeight * 0.5 * gtScale, bandHeight * 0.5 * gtScale
                    );
                }

                pg.pop();
            }
        }

        // 18. PARTICLE SUPERCOLLIDER RINGS - HOT PINK/MAGENTA
        if ((featureRand * 127.3) % 1 > 0.88) {
            const numColliders = Math.floor(random(1, 3));
            for (let pc = 0; pc < numColliders; pc++) {
                const pcAngle = (featureRand * (pc + 23) * 47.1) % TWO_PI_CONST;
                const pcDist = random(r * 0.3, r * 0.6);
                const pcX = Math.cos(pcAngle) * pcDist;
                const pcY = Math.sin(pcAngle) * pcDist;

                if (pcX * pcX + pcY * pcY > r * r * 0.75) continue;

                const pcLimbFactor = this._getLimbFactor(pcX, pcY);
                if (pcLimbFactor < 0.25) continue;
                const pcScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + pcX, bufferCenter + pcY);
                const radAngle = Math.atan2(pcY, pcX);
                pg.rotate(radAngle);
                pg.scale(pcLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // Large collider - OCTAGONAL/POLYGONAL design
                const pcRadius = bandHeight * random(4, 6) * pcScale;
                pg.noFill();
                pg.stroke(255, 50, 150, Math.round(160 * pcLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.6, bandHeight * 0.35 * pcScale));

                // Octagonal accelerator path
                pg.beginShape();
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TWO_PI_CONST;
                    pg.vertex(Math.cos(a) * pcRadius, Math.sin(a) * pcRadius);
                }
                pg.endShape(CLOSE);

                // Inner beam tube (smaller polygon)
                pg.stroke(255, 100, 180, Math.round(140 * pcLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * pcScale));
                pg.beginShape();
                for (let i = 0; i < 8; i++) {
                    const a = (i / 8) * TWO_PI_CONST;
                    pg.vertex(Math.cos(a) * pcRadius * 0.8, Math.sin(a) * pcRadius * 0.8);
                }
                pg.endShape(CLOSE);

                // Detector stations at vertices
                pg.noStroke();
                pg.fill(255, 150, 200, Math.round(180 * pcLimbFactor)); // Increased alpha
                for (let d = 0; d < 8; d++) {
                    const dAngle = (d / 8) * TWO_PI_CONST;
                    const dx = Math.cos(dAngle) * pcRadius;
                    const dy = Math.sin(dAngle) * pcRadius;
                    pg.ellipse(dx, dy, bandHeight * 0.6 * pcScale, bandHeight * 0.6 * pcScale);
                }

                // Energy glow at center collision point
                pg.fill(255, 80, 180, Math.round(150 * pcLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, pcRadius * 0.4, pcRadius * 0.4);

                pg.pop();
            }
        }

        // 19. MEGACITY DATA CENTERS / AI CORES - WHITE/COOL BLUE
        if ((featureRand * 131.7) % 1 > 0.76) {
            const numDataCenters = Math.floor(random(3, 6));
            for (let dc = 0; dc < numDataCenters; dc++) {
                const dcAngle = (featureRand * (dc + 29) * 19.3) % TWO_PI_CONST;
                const dcDist = random(r * 0.35, r * 0.75);
                const dcX = Math.cos(dcAngle) * dcDist;
                const dcY = Math.sin(dcAngle) * dcDist;

                if (dcX * dcX + dcY * dcY > r * r * 0.85) continue;

                const dcLimbFactor = this._getLimbFactor(dcX, dcY);
                if (dcLimbFactor < 0.2) continue;
                const dcScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + dcX, bufferCenter + dcY);
                const radAngle = Math.atan2(dcY, dcX);
                pg.rotate(radAngle);
                pg.scale(dcLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // Server block - rectangular with cool lighting

                const dcWidth = bandHeight * random(2, 4) * dcScale;
                const dcHeight = bandHeight * random(1.5, 2.5) * dcScale;

                pg.stroke(200, 220, 255, Math.round(160 * dcLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.25 * dcScale));
                pg.noFill();
                pg.rect(-dcWidth / 2, -dcHeight / 2, dcWidth, dcHeight);

                // Blinking status lights - rows of white-blue dots
                pg.noStroke();
                pg.fill(220, 240, 255, Math.round(180 * dcLimbFactor)); // Increased alpha
                const numRows = 3;
                const numCols = 5;
                for (let row = 0; row < numRows; row++) {
                    for (let col = 0; col < numCols; col++) {
                        if (random() > 0.3) {
                            const lx = -dcWidth / 2.5 + col * (dcWidth / (numCols + 1));
                            const ly = -dcHeight / 2.5 + row * (dcHeight / (numRows + 1));
                            pg.ellipse(lx, ly, bandHeight * 0.2 * dcScale, bandHeight * 0.2 * dcScale);
                        }
                    }
                }

                // Cooling tower on top
                pg.stroke(180, 200, 240, Math.round(140 * dcLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * dcScale));
                pg.line(0, -dcHeight / 2, 0, -dcHeight / 2 - bandHeight * 1.5 * dcScale);

                // Data transmission beam
                pg.stroke(150, 200, 255, Math.round(100 * dcLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * dcScale));
                pg.line(0, -dcHeight / 2 - bandHeight * 1.5 * dcScale, 0, -dcHeight / 2 - bandHeight * 4 * dcScale);

                pg.pop();
            }
        }

        // 20. SPACEPORT HUB COMPLEXES - WARM WHITE/YELLOW
        if ((featureRand * 137.9) % 1 > 0.72) {
            const numSpaceports = Math.floor(random(2, 5));
            for (let sp = 0; sp < numSpaceports; sp++) {
                const spAngle = (featureRand * (sp + 31) * 53.7) % TWO_PI_CONST;
                const spDist = random(r * 0.4, r * 0.8);
                const spX = Math.cos(spAngle) * spDist;
                const spY = Math.sin(spAngle) * spDist;

                if (spX * spX + spY * spY > r * r * 0.9) continue;

                const spLimbFactor = this._getLimbFactor(spX, spY);
                if (spLimbFactor < 0.2) continue;
                const spScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + spX, bufferCenter + spY);
                const radAngle = Math.atan2(spY, spX);
                pg.rotate(radAngle);
                pg.scale(spLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // Central terminal - bright warm white
                const spSize = bandHeight * random(2.5, 4) * spScale;
                pg.noStroke();
                pg.fill(255, 250, 230, Math.round(200 * spLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, spSize, spSize);

                // Landing pads radiating outward
                pg.stroke(255, 240, 200, Math.round(160 * spLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * spScale));
                const numPads = 6;
                for (let pad = 0; pad < numPads; pad++) {
                    const padAngle = (pad / numPads) * TWO_PI_CONST;
                    const padDist = spSize * 1.2;
                    const padX = Math.cos(padAngle) * padDist;
                    const padY = Math.sin(padAngle) * padDist;

                    // Runway line
                    pg.line(Math.cos(padAngle) * spSize * 0.5, Math.sin(padAngle) * spSize * 0.5, padX, padY);

                    // Landing pad circle
                    pg.noStroke();
                    pg.fill(255, 245, 210, Math.round(180 * spLimbFactor)); // Increased alpha
                    pg.ellipse(padX, padY, bandHeight * 0.8 * spScale, bandHeight * 0.8 * spScale);
                    pg.stroke(255, 240, 200, Math.round(160 * spLimbFactor)); // Increased alpha
                    pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * spScale));
                }

                // Beacon lights - bright yellow
                pg.noStroke();
                pg.fill(255, 230, 100, Math.round(220 * spLimbFactor)); // Slightly Increased alpha
                pg.ellipse(0, 0, bandHeight * 0.5 * spScale, bandHeight * 0.5 * spScale);

                pg.pop();
            }
        }

        // 21. ARCOLOGY MEGA-CLUSTERS - MULTI-COLORED (varies per cluster)
        if ((featureRand * 143.1) % 1 > 0.82) {
            const numClusters = Math.floor(random(2, 4));
            for (let cl = 0; cl < numClusters; cl++) {
                const clAngle = (featureRand * (cl + 37) * 61.9) % TWO_PI_CONST;
                const clDist = random(r * 0.35, r * 0.7);
                const clX = Math.cos(clAngle) * clDist;
                const clY = Math.sin(clAngle) * clDist;

                if (clX * clX + clY * clY > r * r * 0.8) continue;

                const clLimbFactor = this._getLimbFactor(clX, clY);
                if (clLimbFactor < 0.25) continue;
                const clScale = random(0.8, 1.2);

                pg.push();
                pg.translate(bufferCenter + clX, bufferCenter + clY);
                const radAngle = Math.atan2(clY, clX);
                pg.rotate(radAngle);
                pg.scale(clLimbFactor, 1.0);
                pg.rotate(-radAngle);

                // Generate cluster color based on position
                const colorHue = (featureRand * (cl + 1) * 97) % 360;
                const clR = Math.floor(128 + 127 * Math.sin(colorHue * PI / 180));
                const clG = Math.floor(128 + 127 * Math.sin((colorHue + 120) * PI / 180));
                const clB = Math.floor(128 + 127 * Math.sin((colorHue + 240) * PI / 180));

                // Multiple interconnected towers
                const numTowers = Math.floor(random(4, 8));
                const clusterRadius = bandHeight * random(3, 5) * clScale;

                for (let t = 0; t < numTowers; t++) {
                    const tAngle = (t / numTowers) * TWO_PI_CONST + random(-0.2, 0.2);
                    const tDist = random(clusterRadius * 0.3, clusterRadius * 0.9);
                    const tX = Math.cos(tAngle) * tDist;
                    const tY = Math.sin(tAngle) * tDist;
                    const tHeight = bandHeight * random(1.5, 3) * clScale;

                    // Tower
                    pg.stroke(clR, clG, clB, Math.round(160 * clLimbFactor)); // Increased alpha
                    pg.strokeWeight(Math.max(0.5, bandHeight * 0.4 * clScale));
                    pg.line(tX, tY, tX, tY - tHeight);

                    // Tower top glow
                    pg.noStroke();
                    pg.fill(clR, clG, clB, Math.round(180 * clLimbFactor)); // Increased alpha
                    pg.ellipse(tX, tY - tHeight, bandHeight * 0.5 * clScale, bandHeight * 0.5 * clScale);
                }

                // Connecting skyways between towers
                pg.stroke(clR, clG, clB, Math.round(100 * clLimbFactor)); // Increased alpha
                pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * clScale));
                for (let s = 0; s < 5; s++) {
                    const s1Angle = random(0, TWO_PI_CONST);
                    const s2Angle = s1Angle + random(1, 2.5);
                    const s1Dist = random(clusterRadius * 0.3, clusterRadius * 0.8);
                    const s2Dist = random(clusterRadius * 0.3, clusterRadius * 0.8);
                    pg.line(
                        Math.cos(s1Angle) * s1Dist, Math.sin(s1Angle) * s1Dist - bandHeight * clScale,
                        Math.cos(s2Angle) * s2Dist, Math.sin(s2Angle) * s2Dist - bandHeight * clScale
                    );
                }

                // Central plaza glow
                pg.noStroke();
                pg.fill(clR, clG, clB, Math.round(90 * clLimbFactor)); // Increased alpha
                pg.ellipse(0, 0, clusterRadius * 1.5, clusterRadius * 1.5);

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
        // For ringed planets, city lights are drawn inside drawRingedPlanet() between planet and front ring
        if (!this.isSun && this.isInhabited && this.cityLightsBuffer && this.shadowOffset && !this.hasRings) {
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



        // Draw stationary shadow on top of the planet and atmosphere
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

        // Draw atmosphere on top of shadow for a glow effect
        if (this.hasAtmosphere && this.atmosphereBuffer) {
            const atmSize = this.atmosphereBuffer.width;
            const halfAtm = atmSize * 0.5;
            image(this.atmosphereBuffer, -halfAtm, -halfAtm);
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

        // --- Step 2.5: Draw city lights on top of planet but BEFORE front ring ---
        if (this.isInhabited && this.cityLightsBuffer && this.shadowOffset) {
            ctx.save();

            // Calculate rotated shadow position based on current planet rotation
            const rotatedShadowX = this.shadowOffset.x * Math.cos(-this.currentRotation) - this.shadowOffset.y * Math.sin(-this.currentRotation);
            const rotatedShadowY = this.shadowOffset.x * Math.sin(-this.currentRotation) + this.shadowOffset.y * Math.cos(-this.currentRotation);

            // Clip to planet circle
            ctx.beginPath();
            ctx.arc(0, 0, this.radius, 0, TWO_PI);
            ctx.clip();

            // Clip to shadow area (night side)
            ctx.beginPath();
            ctx.arc(rotatedShadowX, rotatedShadowY, this._shadowRadius, 0, TWO_PI);
            ctx.clip();

            // Draw city lights
            const lightsSize = this.cityLightsBuffer.width;
            const halfLights = lightsSize * 0.5;
            image(this.cityLightsBuffer, -halfLights, -halfLights);

            ctx.restore();
        }

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