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
    constructor(worldX, worldY, size, color1, color2, systemName = "Unknown", planetIndex = 0, options = {}) {
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

        // Apply properties from options if provided
        this.economyType = options.economyType || null;
        this.techLevel = (typeof options.techLevel === 'number') ? options.techLevel : null;

        // --- Visual Variations by Economy ---
        if (this.economyType) {
            if (["Industrial", "Refinery", "Mining"].includes(this.economyType)) {
                // Polluted/Smoggy look
                this.hasAtmosphere = true;
                this.atmosphereColor = color(random(100, 140), random(90, 110), random(60, 90), random(100, 160)); // Brownish smog
                this.noisePersistence = random(0.7, 0.9); // Rugged/messy surface
            } else if (["Post Human", "Offworld"].includes(this.economyType)) {
                // High-tech terraforming / Cosmopolitan
                this.hasAtmosphere = true;
                // Cleaner, maybe slightly unnatural atmosphere colors (gentle cyan/purple hint)
                if (random() < 0.3) {
                    this.atmosphereColor = color(180, 220, 255, 120);
                } else if (!this.atmosphereColor) {
                    // Ensure we have a color if we forced atmosphere on (and it was previously null)
                    this.atmosphereColor = color(150, 200, 255, 100);
                }
                this.noiseScale *= 0.8; // Smoother surface (advanced terraforming)
            }
        }

        // --- Inhabited Planet Properties ---
        if (typeof options.isInhabited === 'boolean') {
            this.isInhabited = options.isInhabited;
        } else {
            this.isInhabited = random() < 0.3; // Default 30%
        }

        this.cityLightsColor = color(255, 240, 180, 200); // Default warm yellow/amber lights (may be changed based on pattern type)

        if (typeof options.cityLightsDensity === 'number') {
            this.cityLightsDensity = options.cityLightsDensity;
        } else {
            this.cityLightsDensity = random(0.3, 0.8);
        }

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
        // (Now performed AFTER economy/tech properties are set, so suffixes like "Hab" are accurate)
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
        return `${root} ${suffix} ${romanNum}`.trim();
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

        const { primaryColor, secondaryColor, accentColor } = this._getCivilizationColors(patternType);
        this.cityLightsColor = primaryColor;

        const primR = red(primaryColor), primG = green(primaryColor), primB = blue(primaryColor);
        const secR = red(secondaryColor), secG = green(secondaryColor), secB = blue(secondaryColor);
        const accR = red(accentColor), accG = green(accentColor), accB = blue(accentColor);

        const bandHeight = Math.max(2, Math.ceil(240 / this.size));
        const densityBase = this.cityLightsDensity * 0.5;

        // Render layers
        this._renderCitySprawl(pg, r, bufferCenter, this.noiseScale, this.featureRand, primR, primG, primB);
        const cityHubs = this._generateCityHubs(r);
        this._renderCityHubs(pg, r, bufferCenter, cityHubs, bandHeight, this.noiseScale, this.featureRand, primR, primG, primB, secR, secG, secB, accR, accG, accB, densityBase);
        this._renderGridOverlay(pg, r, bufferCenter, this.featureRand, bandHeight, primR, primG, primB, secR, secG, secB);
        this._renderTransportLines(pg, r, bufferCenter, cityHubs, bandHeight, secR, secG, secB);


        // --- MEG-STRUCTURES & SPECIAL FEATURES ---
        // Only render mega-structures if tech level is sufficient and NOT a "grimy" industrial world
        // Low Tech = techLevel < 3 (1 or 2)
        // Industrial-types = Mining, Industrial, Refinery (regardless of tech level, usually don't have fancy rings/arcologies)
        const isLowTech = (typeof this.techLevel === 'number' && this.techLevel < 3);
        const isIndustrial = ["Mining", "Industrial", "Refinery"].includes(this.economyType);

        if (!isLowTech && !isIndustrial) {
            // 1. ORBITAL RING / SPACE ELEVATOR
            this._renderMegaStructureOrbitalRing(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 2. AGRICULTURAL PATTERNS
            this._renderMegaStructureAgricultural(pg, r, bufferCenter, this.featureRand, bandHeight, primR, primG, primB, secR, secG, secB);

            // 3. RADIAL CITY PATTERNS
            this._renderMegaStructureRadialCities(pg, r, bufferCenter, cityHubs, bandHeight, primR, primG, primB, secR, secG, secB, accR, accG, accB);

            // 4. ARCOLOGIES
            this._renderMegaStructureArcologies(pg, r, bufferCenter, this.featureRand, bandHeight, accR, accG, accB);

            // 5. INDUSTRIAL ZONES
            this._renderMegaStructureIndustrial(pg, r, bufferCenter, this.featureRand, bandHeight, primR, primG, primB);

            // 6. TERRAFORMING/ATMOSPHERIC PROCESSORS
            this._renderMegaStructureProcessors(pg, r, bufferCenter, this.featureRand, bandHeight, secR, secG, secB, accR, accG, accB);


            // 7. SOLAR COLLECTOR ARRAYS
            this._renderMegaStructureSolarCollectors(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 8. ORBITAL DEFENSE PLATFORMS
            this._renderMegaStructureDefensePlatforms(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 9. MASS DRIVER / RAILGUN ARRAYS
            this._renderMegaStructureRailguns(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 10. FUSION POWER ARRAYS
            this._renderMegaStructureFusionArrays(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 11. GEODESIC DOME CLUSTERS
            this._renderMegaStructureDomes(pg, r, bufferCenter, this.featureRand, bandHeight);


            // 12. QUANTUM COMMUNICATION RELAYS
            this._renderMegaStructureRelays(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 13. MINING EXTRACTION FACILITIES
            this._renderMegaStructureMines(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 14. ANTIMATTER CONTAINMENT FACILITIES
            this._renderMegaStructureAntimatter(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 15. ORBITAL SHIPYARD FACILITIES
            this._renderMegaStructureShipyards(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 16. ATMOSPHERIC SCRUBBERS / TERRAFORMING TOWERS
            this._renderMegaStructureScrubbers(pg, r, bufferCenter, this.featureRand, bandHeight);


            // 17. GEOTHERMAL POWER TAPS
            this._renderMegaStructureGeothermal(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 18. PARTICLE SUPERCOLLIDER RINGS
            this._renderMegaStructureColliders(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 19. MEGACITY DATA CENTERS / AI CORES
            this._renderMegaStructureDataCenters(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 20. SPACEPORT HUB COMPLEXES
            this._renderMegaStructureSpaceports(pg, r, bufferCenter, this.featureRand, bandHeight);

            // 21. ARCOLOGY MEGA-CLUSTERS
            this._renderMegaStructureArcologyClusters(pg, r, bufferCenter, this.featureRand, bandHeight);
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

    // --- Internal Rendering Helpers for renderCityLights ---

    /**
     * Helper to render a feature at a specific local coordinate with spherical projection and limb fading.
     * @param {p5.Graphics} pg - Graphics context
     * @param {number} r - Planet radius
     * @param {number} bufferCenter - Center of the buffer
     * @param {number} x - Local X coordinate
     * @param {number} y - Local Y coordinate
     * @param {function} drawFn - Function to perform the actual drawing (receives limbFactor and size multiplier)
     * @param {boolean} useSphericalProjection - Whether to apply spherical projection (default: true)
     */
    _renderFeatureAtLocation(pg, r, bufferCenter, x, y, drawFn, useSphericalProjection = true) {
        if (x * x + y * y > r * r * 0.95) return; // Skip if too close to or beyond the edge

        const limbFactor = this._getLimbFactor(x, y);
        if (limbFactor < 0.15) return; // Skip if on the far limb

        pg.push();
        pg.translate(bufferCenter + x, bufferCenter + y);
        if (useSphericalProjection) {
            this._applySphericalProjection(pg, x, y, limbFactor);
        }

        drawFn(limbFactor);
        pg.pop();
    }

    /**
     * Helper to render multiple instances of a feature distributed across the planet surface.
     * @param {p5.Graphics} pg - Graphics context
     * @param {number} r - Planet radius
     * @param {number} bufferCenter - Center of the buffer
     * @param {number} featureRand - Random seed for this planet
     * @param {object} params - Distribution parameters (chance, countMin, countMax, distMin, distMax)
     * @param {function} drawFn - Function to perform the actual drawing
     */
    _renderDistributedFeatures(pg, r, bufferCenter, featureRand, params, drawFn) {
        const { chance = 0.7, countMin = 2, countMax = 5, distMin = 0.3, distMax = 0.8, seedOffset = 0 } = params;

        if ((featureRand * (seedOffset + 13.37)) % 1 > chance) return;

        const count = Math.floor(random(countMin, countMax + 1));
        for (let i = 0; i < count; i++) {
            const angle = random(TWO_PI);
            const dist = random(r * distMin, r * distMax);
            const x = Math.cos(angle) * dist;
            const y = Math.sin(angle) * dist;

            this._renderFeatureAtLocation(pg, r, bufferCenter, x, y, (limbFactor) => {
                drawFn(limbFactor, i, angle, dist);
            });
        }
    }

    _applySphericalProjection(pg, x, y, limbFactor) {
        const radAngle = Math.atan2(y, x);
        pg.rotate(radAngle);
        pg.scale(limbFactor, 1.0);
        pg.rotate(-radAngle);
    }

    _getCivilizationColors(patternType) {
        // --- Economy Overrides ---
        if (this.economyType === "Post Human") {
            // Neon Cyberpunk colors (Cyan / Magenta / Deep Blue)
            // Giving it a very synthetic, high-tech look
            return {
                primaryColor: color(0, 255, 255, 200),
                secondaryColor: color(255, 0, 220, 180),
                accentColor: color(50, 100, 255, 220)
            };
        } else if (["Mining", "Industrial", "Refinery"].includes(this.economyType)) {
            // Industrial / Dirty (Sodium Orange / Amber / Dim Yellow)
            return {
                primaryColor: color(255, 140, 20, 200),
                secondaryColor: color(200, 80, 20, 180),
                accentColor: color(255, 200, 50, 160)
            };
        } else if (["Military", "Offworld", "Service"].includes(this.economyType)) {
            // Precise / Cold (Cool White / Ice Blue)
            return {
                primaryColor: color(220, 235, 255, 210),
                secondaryColor: color(150, 200, 255, 180),
                accentColor: color(100, 150, 255, 220)
            };
        }

        let pCol, sCol, aCol;
        switch (patternType) {
            case 0: pCol = color(255, 240, 180, 180); sCol = color(255, 220, 140, 160); aCol = color(255, 200, 100, 200); break;
            case 1: pCol = color(220, 240, 255, 170); sCol = color(180, 200, 255, 150); aCol = color(150, 180, 255, 190); break;
            case 2: pCol = color(255, 220, 160, 180); sCol = color(255, 200, 130, 160); aCol = color(255, 180, 100, 200); break;
            case 3: pCol = color(220, 255, 220, 170); sCol = color(180, 245, 190, 150); aCol = color(140, 255, 160, 190); break;
            case 4: pCol = color(240, 200, 255, 170); sCol = color(200, 150, 255, 150); aCol = color(180, 120, 255, 190); break;
            case 5: pCol = color(180, 240, 255, 170); sCol = color(140, 220, 255, 150); aCol = color(100, 200, 255, 190); break;
            default: pCol = color(255, 240, 180, 180); sCol = color(255, 220, 140, 160); aCol = color(255, 200, 100, 200);
        }
        return { primaryColor: pCol, secondaryColor: sCol, accentColor: aCol };
    }

    _renderCitySprawl(pg, r, bufferCenter, noiseScale, featureRand, primR, primG, primB) {
        const faintBandHeight = Math.max(2, Math.ceil(3 * random(10)));
        const faintDotSize = faintBandHeight * 0.5;
        for (let y = -r; y < r; y += faintBandHeight) {
            const ySq = y * y;
            const bandRSq = r * r - ySq;
            if (bandRSq <= 0) continue;
            const bandR = Math.sqrt(bandRSq);
            for (let x = -bandR; x < bandR; x += faintBandHeight) {
                const nx = x / r, ny = y / r;
                const inside = nx * nx + ny * ny;
                if (inside > 1) continue;
                const nzUnit = Math.sqrt(Math.max(0, 1 - inside));
                const sampleMultiplier = Math.max(0.0005, (r * noiseScale) * 0.8);
                const bNX = nx * sampleMultiplier + featureRand * 0.001;
                const bNY = ny * sampleMultiplier + featureRand * 0.002;
                const bNZ = nzUnit * sampleMultiplier + featureRand * 0.003;
                const baseNoise = pg.noise(bNX, bNY, bNZ);
                const detailNoise = pg.noise(bNX * 2.5, bNY * 2.5, bNZ * 2.0);
                let combinedNoise = baseNoise * 0.62 + detailNoise * 0.38;
                combinedNoise = Math.min(1, Math.max(0, Math.pow(combinedNoise, 1.25)));
                const limbFactor = Math.pow(nzUnit, 0.9);
                if (combinedNoise > 0.2) {
                    const faintAlpha = Math.max(8, Math.round(36 * limbFactor));
                    const fd = Math.max(1, Math.round(faintDotSize * Math.max(0.35, limbFactor)));
                    pg.noStroke(); pg.fill(primR, primG, primB, faintAlpha);
                    pg.ellipse(bufferCenter + x, bufferCenter + y, fd, fd);
                }
            }
        }
    }

    _generateCityHubs(r) {
        const cityHubs = [];
        const numHubs = Math.floor(r / 80) + Math.floor(random(2, 5));
        for (let i = 0; i < numHubs; i++) {
            const hubAngle = (i / numHubs) * TWO_PI + random(-0.3, 0.3);
            const hubDist = random(r * 0.3, r * 0.85);
            const hubSize = random(r * 0.1, r * 0.25);
            cityHubs.push({
                x: Math.cos(hubAngle) * hubDist,
                y: Math.sin(hubAngle) * hubDist,
                sizeSq: hubSize * hubSize,
                size: hubSize,
                density: random(0.6, 1.0)
            });
        }
        return cityHubs;
    }

    _renderCityHubs(pg, r, bufferCenter, cityHubs, bandHeight, noiseScale, featureRand, primR, primG, primB, secR, secG, secB, accR, accG, accB, densityBase) {
        const rSq = r * r;
        for (let y = -r; y < r; y += bandHeight) {
            const ySq = y * y;
            const bandRSq = rSq - ySq;
            if (bandRSq <= 0) continue;
            const bandR = Math.sqrt(bandRSq);
            for (let x = -bandR; x < bandR; x += bandHeight) {
                const nx = x / r, ny = y / r;
                const inside = nx * nx + ny * ny;
                if (inside > 1) continue;
                const nzUnit = Math.sqrt(Math.max(0, 1 - inside));
                const sampleMultiplier = Math.max(0.0005, (r * noiseScale) * 0.8);
                const sNX = nx * sampleMultiplier + featureRand * 0.001;
                const sNY = ny * sampleMultiplier + featureRand * 0.002;
                const sNZ = nzUnit * sampleMultiplier + featureRand * 0.004;
                const baseNoise = pg.noise(sNX, sNY, sNZ);
                const detailNoise = pg.noise(sNX * 2.2, sNY * 2.2, sNZ * 1.8);
                let combinedNoise = (baseNoise * 0.56) + (detailNoise * 0.44);
                combinedNoise = Math.min(1, Math.max(0, Math.pow(combinedNoise, 1.35)));
                let hubInfluence = 0;
                for (let h = 0; h < cityHubs.length; h++) {
                    const hub = cityHubs[h];
                    const dx = x - hub.x, dy = y - hub.y;
                    const hubDistSq = dx * dx + dy * dy;
                    if (hubDistSq < hub.sizeSq) hubInfluence += hub.density * (1 - Math.sqrt(hubDistSq) / hub.size);
                }
                hubInfluence = Math.min(hubInfluence, 0.8);
                const densityThreshold = 1 - (densityBase + hubInfluence);
                const limbFactor = Math.pow(nzUnit, 0.9);
                const brightnessMul = Math.max(0.22, limbFactor);
                if (combinedNoise > densityThreshold) {
                    const brightness = 70 + ((combinedNoise + hubInfluence - densityThreshold) / (1.5 - densityThreshold)) * 130;
                    const isNearHub = hubInfluence > 0.2;
                    const adjBrightness = brightness * brightnessMul;
                    const structureType = (combinedNoise * 10 + baseNoise * 5) % 1;
                    const worldX = bufferCenter + x, worldY = bufferCenter + y;
                    if (structureType < 0.25) {
                        pg.noStroke(); pg.fill(primR, primG, primB, Math.min(255, Math.round(adjBrightness * 0.8)));
                        const dotSize = Math.max(1, (isNearHub ? bandHeight * 0.7 : bandHeight * 0.4) * brightnessMul);
                        pg.ellipse(worldX, worldY, dotSize, dotSize);
                    } else if (structureType < 0.5) {
                        const lineAngle = (Math.atan2(y, x) + baseNoise * Math.PI) % TWO_PI;
                        pg.stroke(secR, secG, secB, Math.min(255, Math.round(adjBrightness * 0.9)));
                        pg.strokeWeight(bandHeight * 0.4 * brightnessMul);
                        const halfLen = ((isNearHub ? bandHeight * 2 : bandHeight * 1.2) * brightnessMul) * 0.5;
                        pg.line(worldX - Math.cos(lineAngle) * halfLen, worldY - Math.sin(lineAngle) * halfLen, worldX + Math.cos(lineAngle) * halfLen, worldY + Math.sin(lineAngle) * halfLen);
                    } else if (structureType < 0.7) {
                        pg.noStroke(); pg.fill(primR, primG, primB, Math.min(255, Math.round(adjBrightness * 0.7)));
                        const blockSize = Math.max(1, (isNearHub ? bandHeight * 1.2 : bandHeight * 0.8) * brightnessMul);
                        pg.rect(worldX - blockSize * 0.5, worldY - blockSize * 0.5, blockSize, blockSize);
                        if (isNearHub && random() > 0.5) {
                            pg.fill(secR, secG, secB, Math.min(255, Math.round(adjBrightness * 0.9)));
                            pg.rect(worldX - blockSize * 0.3, worldY - blockSize * 0.3, blockSize * 0.6, blockSize * 0.6);
                        }
                    } else {
                        pg.noStroke();
                        const scatterSize = Math.max(1, bandHeight * 0.3 * brightnessMul);
                        for (let i = 0; i < 3; i++) {
                            const ox = random(-bandHeight, bandHeight) * brightnessMul, oy = random(-bandHeight, bandHeight) * brightnessMul;
                            pg.fill(primR, primG, primB, Math.max(8, Math.round(adjBrightness * (1 - 0.6 * Math.sqrt(ox * ox + oy * oy) / (bandHeight * 1.4)))));
                            pg.ellipse(worldX + ox, worldY + oy, scatterSize, scatterSize);
                        }
                    }
                    if (isNearHub && hubInfluence > 0.5 && random() > 0.8) {
                        const pSize = Math.max(2, bandHeight * random(2, 4) * brightnessMul);
                        const bAlpha = Math.max(10, Math.round(adjBrightness * 0.8));
                        pg.noFill(); pg.stroke(secR, secG, secB, bAlpha); pg.strokeWeight(bandHeight * 0.3 * brightnessMul);
                        pg.ellipse(worldX, worldY, pSize * 0.7, pSize * 0.7); pg.strokeWeight(bandHeight * 0.2 * brightnessMul); pg.ellipse(worldX, worldY, pSize, pSize);
                    }
                }
            }
        }
    }

    _renderGridOverlay(pg, r, bufferCenter, featureRand, bandHeight, primR, primG, primB, secR, secG, secB) {
        const gridAngle = ((featureRand * 13.37) % TWO_PI) + (this.currentRotation || 0) * 0.12;
        const baseSpacing = Math.max(8, Math.floor(r * map(this.cityLightsDensity || 0.5, 0.25, 0.9, 0.18, 0.06)));
        const spacing = Math.max(6, Math.round(baseSpacing));
        const segStep = Math.max(4, Math.round(spacing * 0.35));
        const noiseJitter = Math.max(0.5, spacing * 0.22);
        const nScale = this.noiseScale || 0.01;

        pg.push();
        pg.translate(bufferCenter, bufferCenter);
        pg.rotate(gridAngle);
        pg.stroke(primR, primG, primB, 160);
        pg.strokeWeight(Math.max(0.6, bandHeight * 0.35));
        const safeR = r * 0.85;

        for (let gx = -safeR; gx <= safeR; gx += spacing) {
            const halfChord = Math.sqrt(Math.max(0, safeR * safeR - gx * gx));
            if (halfChord < 5) continue;
            const lineDistNorm = Math.abs(gx) / r;
            for (let yy = -halfChord; yy <= halfChord; yy += segStep) {
                const yNorm = yy / r;
                const curveDisp = lineDistNorm * (1 - yNorm * yNorm) * r * 0.3;
                const x = gx + Math.sign(gx) * curveDisp;
                const nx = x / r, ny = yNorm;
                const inside = nx * nx + ny * ny;
                if (inside > 1) continue;
                const nzUnit = Math.sqrt(Math.max(0, 1 - inside));
                if (nzUnit < 0.15) continue;
                const sMul = Math.max(0.0006, (r * nScale) * 0.9);
                const sNX = nx * sMul + featureRand * 0.002 + 7.13, sNY = ny * sMul + featureRand * 0.003 + 9.71, sNZ = nzUnit * sMul + featureRand * 0.004 + 1.41;
                const visibility = Math.pow(pg.noise(sNX * 2.2, sNY * 2.2, sNZ * 1.6) * 0.7 + pg.noise(sNX * 6.0, sNY * 6.0, sNZ * 4.2) * 0.3, 1.25);
                const limbFactor = Math.pow(nzUnit, 0.85);
                if (visibility > (0.35 + (0.45 * (1 - (this.cityLightsDensity || 0.5)))) * (0.6 + 0.4 * limbFactor)) {
                    const jitter = (pg.noise(sNX * 1.5, sNY * 1.5) - 0.5) * ((pg.noise(sNX * 6.0, sNY * 6.0, sNZ * 4.2) - 0.5) * noiseJitter) * (1 - limbFactor);
                    const sYN = (yy - segStep * 0.45) / r, eYN = (yy + segStep * 0.45) / r;
                    const sX = gx + Math.sign(gx || 1) * (lineDistNorm * (1 - sYN * sYN) * r * 0.3) + jitter;
                    const eX = gx + Math.sign(gx || 1) * (lineDistNorm * (1 - eYN * eYN) * r * 0.3) + jitter;
                    if ((sX * sX + (yy - segStep * 0.45) * (yy - segStep * 0.45)) <= safeR * safeR && (eX * eX + (yy + segStep * 0.45) * (yy + segStep * 0.45)) <= safeR * safeR) {
                        pg.line(sX, yy - segStep * 0.45, eX, yy + segStep * 0.45);
                    }
                }
            }
        }
        pg.stroke(secR, secG, secB, 120); pg.strokeWeight(Math.max(0.35, bandHeight * 0.22)); pg.rotate(PI / 2.3);
        for (let gx = -safeR; gx <= safeR; gx += Math.round(spacing * 1.4)) {
            const halfChord = Math.sqrt(Math.max(0, safeR * safeR - gx * gx));
            if (halfChord < 5) continue;
            const lineDistNorm = Math.abs(gx) / r;
            for (let yy = -halfChord; yy <= halfChord; yy += Math.max(3, Math.round(segStep * 0.9))) {
                const yNorm = yy / r;
                const x = gx + Math.sign(gx) * (lineDistNorm * (1 - yNorm * yNorm) * r * 0.3);
                const nx = x / r, ny = yNorm;
                const inside = nx * nx + ny * ny;
                if (inside > 1) continue;
                const nzUnit = Math.sqrt(Math.max(0, 1 - inside));
                if (nzUnit < 0.2) continue;
                const sMul = Math.max(0.0006, (r * nScale) * 0.9);
                const sNX = nx * sMul + featureRand * 0.005 + 3.21, sNY = ny * sMul + featureRand * 0.006 + 4.19, sNZ = nzUnit * sMul + featureRand * 0.007 + 2.17;
                if (pg.noise(sNX * 2.6, sNY * 2.6, sNZ * 1.9) > 0.48 * (0.7 + 0.3 * Math.pow(nzUnit, 0.9))) {
                    const jitter = (pg.noise(sNX * 1.3, sNY * 1.3) - 0.5) * noiseJitter * 0.6 * (1 - Math.pow(nzUnit, 0.9));
                    const sYN = (yy - segStep * 0.3) / r, eYN = (yy + segStep * 0.3) / r;
                    const sX = gx + Math.sign(gx || 1) * (lineDistNorm * (1 - sYN * sYN) * r * 0.3) + jitter;
                    const eX = gx + Math.sign(gx || 1) * (lineDistNorm * (1 - eYN * eYN) * r * 0.3) + jitter;
                    if ((sX * sX + (yy - segStep * 0.3) * (yy - segStep * 0.3)) <= safeR * safeR && (eX * eX + (yy + segStep * 0.3) * (yy + segStep * 0.3)) <= safeR * safeR) {
                        pg.line(sX, yy - segStep * 0.3, eX, yy + segStep * 0.3);
                    }
                }
            }
        }
        pg.pop();
    }

    _renderTransportLines(pg, r, bufferCenter, cityHubs, bandHeight, secR, secG, secB) {
        pg.noFill();
        const maxHubDist = r * 0.7;
        for (let i = 0; i < cityHubs.length; i++) {
            for (let j = i + 1; j < cityHubs.length; j++) {
                const h1 = cityHubs[i], h2 = cityHubs[j];
                const dx = h2.x - h1.x, dy = h2.y - h1.y;
                const hubDist = Math.sqrt(dx * dx + dy * dy);
                if (hubDist < maxHubDist) {
                    const avgLimb = (this._getLimbFactor(h1.x, h1.y) + this._getLimbFactor(h2.x, h2.y)) * 0.5;
                    if (avgLimb < 0.2) continue;
                    pg.stroke(secR, secG, secB, Math.round((150 - (hubDist / maxHubDist) * 80) * avgLimb));
                    pg.strokeWeight(bandHeight * 0.6 * avgLimb);
                    this._drawCurvedLine(pg, h1.x, h1.y, h2.x, h2.y, bufferCenter, r);
                }
            }
        }
    }

    _renderMegaStructureOrbitalRing(pg, r, bufferCenter, featureRand, bandHeight) {
        if ((featureRand * 31.41) % 1 > 0.85) {
            const ringAngle = (featureRand * 17.3) % TWO_PI;
            const ringRadius = r * random(1.08, 1.15);
            const ringThickness = Math.max(1, bandHeight * 0.5);
            pg.push(); pg.translate(bufferCenter, bufferCenter); pg.rotate(ringAngle); pg.noFill(); pg.stroke(200, 60, 50, 180); pg.strokeWeight(ringThickness);
            const segCount = Math.floor(120 + random(40));
            for (let seg = 0; seg < segCount; seg++) {
                const sA = (seg / segCount) * TWO_PI, nA = ((seg + 0.7) / segCount) * TWO_PI;
                const x1 = Math.cos(sA) * ringRadius, y1 = Math.sin(sA) * ringRadius * 0.3;
                if (y1 < r * 0.2) pg.line(x1, y1, Math.cos(nA) * ringRadius, Math.sin(nA) * ringRadius * 0.3);
            }
            pg.pop();
            const tethers = Math.floor(random(3, 6));
            for (let t = 0; t < tethers; t++) {
                const tA = ringAngle + (t / tethers) * TWO_PI, sx = Math.cos(tA) * r * 0.9, sy = Math.sin(tA) * r * 0.9, ox = Math.cos(tA) * ringRadius, oy = Math.sin(tA) * ringRadius * 0.3;
                this._renderFeatureAtLocation(pg, r, bufferCenter, sx, sy, (limbFactor) => {
                    pg.stroke(255, 80, 60, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.8, bandHeight * 0.35));
                    pg.line(0, 0, ox - sx, oy - sy);
                    pg.noStroke(); pg.fill(255, 100, 80, Math.round(220 * limbFactor)); pg.ellipse(0, 0, bandHeight, bandHeight);
                    pg.fill(255, 60, 40, Math.round(100 * limbFactor)); pg.ellipse(0, 0, bandHeight * 2, bandHeight * 2);
                }, false); // No spherical projection for tether base
            }
        }
    }

    _renderMegaStructureAgricultural(pg, r, bufferCenter, featureRand, bandHeight, primR, primG, primB, secR, secG, secB) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 1.0, countMin: 2, countMax: 4, distMin: 0.4, distMax: 0.85, seedOffset: 23.7
        }, (limbFactor, i, angle, dist, fx, fy) => {
            const fType = Math.floor(random(3)), fScale = random(r * 0.08, r * 0.15) * Math.max(0.3, limbFactor), fSp = fScale * 0.3;
            if (fType === 0) {
                const nC = Math.floor(random(4, 8));
                for (let c = 0; c < nC; c++) {
                    const cR = (c + 1) * fSp * Math.max(0.3, limbFactor);
                    pg.noFill(); pg.stroke(primR, primG, primB, Math.round((25 + c * 5) * limbFactor)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.15 * limbFactor)); pg.ellipse(0, 0, cR * 2, cR * 2);
                    const nD = Math.floor(cR * 0.5);
                    for (let d = 0; d < nD; d++) {
                        const dA = (d / nD) * TWO_PI, dx = Math.cos(dA) * cR, dy = Math.sin(dA) * cR, dL = this._getLimbFactor(fx + dx, fy + dy);
                        pg.noStroke(); pg.fill(secR, secG, secB, Math.round(40 * dL)); pg.ellipse(dx, dy, bandHeight * 0.2 * dL, bandHeight * 0.2 * dL);
                    }
                }
            } else if (fType === 1) {
                const hS = fSp * 0.6, hR = 8, hC = 8;
                for (let row = -hR; row < hR; row++) for (let col = -hC; col < hC; col++) {
                    const xOff = col * hS * 1.5, yOff = row * hS * Math.sqrt(3) + (col % 2) * hS * Math.sqrt(3) * 0.5, cL = this._getLimbFactor(fx + xOff, fy + yOff);
                    if (cL < 0.1) continue;
                    const sHS = hS * Math.max(0.2, cL); pg.noFill(); pg.stroke(primR, primG, primB, Math.round(35 * cL)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.12 * cL));
                    pg.beginShape(); for (let h = 0; h < 6; h++) pg.vertex(xOff + Math.cos((h / 6) * TWO_PI) * sHS, yOff + Math.sin((h / 6) * TWO_PI) * sHS); pg.endShape(CLOSE);
                }
            } else {
                const gS = fSp * 0.8, gC = 10;
                for (let gx = -gC; gx < gC; gx++) for (let gy = -gC; gy < gC; gy++) {
                    const rx = gx * gS, ry = gy * gS, cL = this._getLimbFactor(fx + rx, fy + ry);
                    if (cL < 0.1) continue;
                    const cS = Math.max(0.2, cL), sGS = gS * 0.8 * cS;
                    pg.stroke(primR, primG, primB, Math.round(30 * cL)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.15 * cL)); pg.noFill(); pg.rect(rx - sGS * 0.5, ry - sGS * 0.5, sGS, sGS);
                    if ((gx + gy) % 2 === 0) { pg.noStroke(); pg.fill(secR, secG, secB, Math.round(45 * cL)); pg.ellipse(rx, ry, bandHeight * 0.25 * cL, bandHeight * 0.25 * cL); }
                }
            }
        });
    }

    _renderMegaStructureRadialCities(pg, r, bufferCenter, cityHubs, bandHeight, primR, primG, primB, secR, secG, secB, accR, accG, accB) {
        const nRC = Math.min(cityHubs.length, Math.floor(random(1, 3)));
        for (let rc = 0; rc < nRC; rc++) {
            const hub = cityHubs[rc];
            this._renderFeatureAtLocation(pg, r, bufferCenter, hub.x, hub.y, (limbFactor, x, y) => {
                const nS = Math.floor(random(6, 12)), sL = hub.size * random(0.8, 1.2) * Math.max(0.4, limbFactor);
                for (let sp = 0; sp < nS; sp++) {
                    const sA = (sp / nS) * TWO_PI, sex = Math.cos(sA) * sL, sey = Math.sin(sA) * sL;
                    const aL = (limbFactor + this._getLimbFactor(x + sex, y + sey)) * 0.5;
                    pg.stroke(primR, primG, primB, Math.round(140 * aL)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.4 * aL));
                    this._drawCurvedLine(pg, 0, 0, sex, sey, bufferCenter + x, r);
                    const nSeg = Math.floor(random(4, 8));
                    for (let seg = 1; seg < nSeg; seg++) {
                        const t = seg / nSeg, sx = Math.cos(sA) * sL * t, sy = Math.sin(sA) * sL * t, sLimb = this._getLimbFactor(x + sx, y + sy);
                        if (sLimb < 0.15) continue;
                        const pA = sA + PI / 2, pL = bandHeight * random(1, 3) * sLimb;
                        pg.stroke(secR, secG, secB, Math.round(100 * sLimb)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.25 * sLimb));
                        pg.line(sx - Math.cos(pA) * pL, sy - Math.sin(pA) * pL, sx + Math.cos(pA) * pL, sy + Math.sin(pA) * pL);
                        pg.noStroke(); pg.fill(accR, accG, accB, Math.round(160 * sLimb)); pg.ellipse(sx, sy, bandHeight * 0.6 * sLimb, bandHeight * 0.6 * sLimb);
                    }
                }
                const nR = Math.floor(random(2, 4));
                for (let ring = 1; ring <= nR; ring++) {
                    const rR = (ring / nR) * sL; pg.noFill(); pg.stroke(secR, secG, secB, Math.round(80 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.3 * limbFactor)); pg.ellipse(0, 0, rR * 2, rR * 2);
                }
            });
        }
    }

    _renderMegaStructureArcologies(pg, r, bufferCenter, featureRand, bandHeight, accR, accG, accB) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 1.0, countMin: 1, countMax: 3, distMin: 0.3, distMax: 0.8, seedOffset: 7.3
        }, (limbFactor) => {
            const gS = bandHeight * random(2.5, 4) * Math.max(0.3, limbFactor); pg.noStroke();
            for (let g = 3; g > 0; g--) { pg.fill(accR, accG, accB, Math.round((60 / g) * limbFactor)); pg.ellipse(0, 0, gS * (g / 3), gS * (g / 3)); }
            pg.fill(accR, accG, accB, Math.round(220 * limbFactor)); pg.ellipse(0, 0, bandHeight * 1.2 * Math.max(0.3, limbFactor), bandHeight * 1.2 * Math.max(0.3, limbFactor));
            pg.stroke(255, 255, 255, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * Math.max(0.3, limbFactor))); const cS = bandHeight * 1.5 * Math.max(0.3, limbFactor); pg.line(-cS, 0, cS, 0); pg.line(0, -cS, 0, cS);
        });
    }

    _renderMegaStructureIndustrial(pg, r, bufferCenter, featureRand, bandHeight, primR, primG, primB) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 1.0, countMin: 2, countMax: 4, distMin: 0.4, distMax: 0.85, seedOffset: 13.1
        }, (limbFactor, i, angle, dist, ix, iy) => {
            const iS = random(r * 0.04, r * 0.08) * Math.max(0.3, limbFactor), gS = Math.max(1, bandHeight * 0.8 * Math.max(0.3, limbFactor)), gE = Math.floor(iS / gS);
            for (let gx = -gE; gx <= gE; gx++) for (let gy = -gE; gy <= gE; gy++) {
                const px = gx * gS, py = gy * gS, pL = this._getLimbFactor(ix + px, iy + py);
                if (pL < 0.1) continue;
                pg.noStroke(); pg.fill(primR, primG, primB, Math.round(150 * pL)); pg.ellipse(px, py, bandHeight * 0.5 * pL, bandHeight * 0.5 * pL);
            }
        });
    }

    _renderMegaStructureProcessors(pg, r, bufferCenter, featureRand, bandHeight, secR, secG, secB, accR, accG, accB) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.7, countMin: 2, countMax: 4, distMin: 0.6, distMax: 0.9, seedOffset: 53.7
        }, (limbFactor) => {
            const pS = Math.max(0.25, limbFactor), bPS = bandHeight * random(2, 3) * pS;
            pg.push(); pg.rotate(PI / 4); pg.noFill(); pg.stroke(accR, accG, accB, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * pS)); pg.rect(-bPS / 2, -bPS / 2, bPS, bPS); pg.pop();
            pg.noStroke(); pg.fill(255, 255, 255, Math.round(200 * limbFactor)); pg.ellipse(0, 0, bandHeight * 0.7 * pS, bandHeight * 0.7 * pS);
            for (let el = 0; el < 4; el++) { const eA = (el / 4) * TWO_PI, eL = bPS * 1.2; pg.stroke(secR, secG, secB, Math.round(140 * limbFactor)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.2 * pS)); pg.line(0, 0, Math.cos(eA) * eL, Math.sin(eA) * eL); }
        });
    }

    _renderMegaStructureSolarCollectors(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.7, countMin: 2, countMax: 4, distMin: 0.3, distMax: 0.7, seedOffset: 47.3
        }, (limbFactor, i, angle, dist) => {
            const scS = random(0.8, 1.2);
            const pS = bandHeight * random(7, 11) * scS;
            pg.noFill(); pg.stroke(255, 180, 40, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * scS));
            for (let arm = 0; arm < 3; arm++) {
                const aSA = (arm / 3) * TWO_PI; pg.beginShape();
                for (let p = 0; p < 5; p++) {
                    const t = p / 4, ang = aSA + t * 2.0, d = pS * (0.2 + t * 0.8); pg.vertex(Math.cos(ang) * d, Math.sin(ang) * d);
                    if (p > 0) {
                        pg.push(); pg.translate(Math.cos(ang) * d, Math.sin(ang) * d); pg.rotate(ang); pg.fill(255, 200, 50, Math.round(120 * limbFactor)); pg.noStroke();
                        pg.rect(-bandHeight * 0.5 * scS, -bandHeight * 0.3 * scS, bandHeight * scS, bandHeight * 0.6 * scS); pg.pop();
                    }
                }
                pg.endShape();
            }
            pg.stroke(255, 220, 100, Math.round(200 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * scS)); pg.noFill(); pg.beginShape();
            for (let j = 0; j < 3; j++) pg.vertex(Math.cos((j / 3) * TWO_PI - PI / 6) * pS * 0.3, Math.sin((j / 3) * TWO_PI - PI / 6) * pS * 0.3); pg.endShape(CLOSE);
            pg.noStroke(); pg.fill(255, 255, 220, Math.round(150 * limbFactor)); pg.ellipse(0, 0, pS * 0.15, pS * 0.15);
        });
    }

    _renderMegaStructureDefensePlatforms(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.75, countMin: 2, countMax: 4, distMin: 0.4, distMax: 0.8, seedOffset: 61.9
        }, (limbFactor) => {
            const dS = random(0.8, 1.2), dfS = bandHeight * random(8, 12) * dS;
            pg.stroke(0, 200, 255, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * dS)); pg.noFill();
            pg.beginShape(); for (let t = 0; t < 3; t++) { const tA = (t / 3) * TWO_PI - PI / 2; pg.vertex(Math.cos(tA) * dfS, Math.sin(tA) * dfS); pg.line(0, 0, Math.cos(tA) * dfS, Math.sin(tA) * dfS); } pg.endShape(CLOSE);
            pg.noStroke(); for (let wt = 0; wt < 3; wt++) {
                const wA = (wt / 3) * TWO_PI - PI / 2, wx = Math.cos(wA) * dfS, wy = Math.sin(wA) * dfS;
                pg.fill(30, 80, 150, Math.round(180 * limbFactor)); pg.ellipse(wx, wy, bandHeight * 0.8 * dS, bandHeight * 0.8 * dS);
                pg.fill(255, 50, 50, Math.round(160 * limbFactor)); pg.ellipse(wx, wy, bandHeight * 0.4 * dS, bandHeight * 0.4 * dS);
            }
            pg.fill(200, 240, 255, Math.round(180 * limbFactor)); pg.ellipse(0, 0, dfS * 0.25, dfS * 0.25);
            pg.stroke(255, 80, 80, Math.round(120 * limbFactor)); pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * dS)); pg.line(0, 0, Math.cos((featureRand * 10) % TWO_PI) * dfS * 2, Math.sin((featureRand * 10) % TWO_PI) * dfS * 2);
        });
    }

    _renderMegaStructureRailguns(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.78, countMin: 2, countMax: 3, distMin: 0.4, distMax: 0.75, seedOffset: 73.1
        }, (limbFactor, i, angle) => {
            const rS = random(0.8, 1.2), rLen = bandHeight * random(12, 18) * rS, rW = bandHeight * 1.5 * rS;
            pg.push(); pg.rotate(angle + PI); pg.stroke(140, 80, 200, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.5, rW * 0.3)); pg.line(0, -rW * 0.5, rLen, -rW * 0.5); pg.line(0, rW * 0.5, rLen, rW * 0.5);
            pg.stroke(0, 220, 255, Math.round(140 * limbFactor)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.2 * rS)); for (let ring = 1; ring <= 6; ring++) pg.line(rLen * (ring / 7), -rW * 0.8, rLen * (ring / 7), rW * 0.8); pg.pop();
            pg.noStroke(); pg.fill(120, 60, 180, Math.round(150 * limbFactor)); pg.beginShape(); for (let j = 0; j < 6; j++) pg.vertex(Math.cos((j / 6) * TWO_PI) * bandHeight * 2.5 * rS, Math.sin((j / 6) * TWO_PI) * bandHeight * 2.5 * rS); pg.endShape(CLOSE);
            pg.fill(200, 180, 255, Math.round(180 * limbFactor)); pg.rect(-bandHeight * rS, -bandHeight * rS, bandHeight * 2 * rS, bandHeight * 2 * rS);
        });
    }

    _renderMegaStructureFusionArrays(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.72, countMin: 2, countMax: 3, distMin: 0.3, distMax: 0.65, seedOffset: 83.7
        }, (limbFactor) => {
            const fS = random(0.8, 1.2), fuS = bandHeight * random(8, 12) * fS;
            pg.noFill(); pg.stroke(255, 120, 20, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.6, bandHeight * 0.3 * fS)); pg.beginShape();
            for (let i = 0; i <= 30; i++) { const t = (i / 30) * TWO_PI; pg.vertex(Math.cos(t) * fuS, Math.sin(t) * Math.cos(t) * fuS * 0.6); } pg.endShape(CLOSE);
            pg.stroke(255, 180, 50, Math.round(160 * limbFactor)); pg.push(); pg.rotate(PI / 2); pg.beginShape();
            for (let i = 0; i <= 30; i++) { const t = (i / 30) * TWO_PI; pg.vertex(Math.cos(t) * fuS * 0.8, Math.sin(t) * Math.cos(t) * fuS * 0.5); } pg.endShape(CLOSE); pg.pop();
            pg.noStroke(); pg.fill(200, 220, 255, Math.round(100 * limbFactor)); pg.ellipse(0, 0, fuS * 0.5, fuS * 0.5); pg.fill(255, 255, 255, Math.round(200 * limbFactor)); pg.ellipse(0, 0, fuS * 0.15, fuS * 0.15);
        });
    }

    _renderMegaStructureDomes(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.68, countMin: 2, countMax: 5, distMin: 0.25, distMax: 0.7, seedOffset: 91.3
        }, (limbFactor) => {
            const bS = random(0.8, 1.2), cS = bandHeight * random(10, 16) * bS, mDR = cS * 0.45;
            pg.stroke(80, 220, 120, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * bS)); pg.noFill(); pg.ellipse(0, 0, mDR * 2, mDR * 2);
            pg.stroke(100, 255, 150, Math.round(120 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * bS));
            for (let h = 0; h < 6; h++) { const hA = (h / 6) * TWO_PI, nA = ((h + 1) / 6) * TWO_PI; pg.line(Math.cos(hA) * mDR * 0.5, Math.sin(hA) * mDR * 0.5, Math.cos(hA) * mDR, Math.sin(hA) * mDR); pg.line(Math.cos(hA) * mDR * 0.5, Math.sin(hA) * mDR * 0.5, Math.cos(nA) * mDR * 0.5, Math.sin(nA) * mDR * 0.5); }
            pg.noStroke(); pg.fill(50, 180, 90, Math.round(100 * limbFactor)); pg.ellipse(0, 0, mDR * 1.6, mDR * 1.6); pg.fill(200, 255, 220, Math.round(180 * limbFactor)); pg.ellipse(0, 0, mDR * 0.35, mDR * 0.35);
            const sR = mDR * 0.5, sDist = mDR * 1.3;
            for (let sd = 0; sd < 4; sd++) {
                const sdA = (sd / 4) * TWO_PI + PI / 4, sdx = Math.cos(sdA) * sDist, sdy = Math.sin(sdA) * sDist;
                pg.stroke(60, 200, 160, Math.round(150 * limbFactor)); pg.strokeWeight(Math.max(0.6, bandHeight * 0.35 * bS)); pg.noFill(); pg.ellipse(sdx, sdy, sR * 2, sR * 2);
                pg.noStroke(); pg.fill(70, 190, 130, Math.round(120 * limbFactor)); pg.ellipse(sdx, sdy, sR * 1.5, sR * 1.5);
                const cols = [[100, 180, 255], [40, 160, 60], [255, 220, 100], [180, 220, 200]];
                pg.fill(cols[sd][0], cols[sd][1], cols[sd][2], Math.round(150 * limbFactor)); pg.ellipse(sdx, sdy, sR * 0.6, sR * 0.6);
                pg.stroke(180, 220, 190, Math.round(130 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.25 * bS)); pg.line(Math.cos(sdA) * mDR, Math.sin(sdA) * mDR, sdx - Math.cos(sdA) * sR, sdy - Math.sin(sdA) * sR);
            }
            pg.noStroke(); pg.fill(255, 230, 100, Math.round(160 * limbFactor)); pg.ellipse(0, -mDR * 0.3, bandHeight * bS, bandHeight * 0.5 * bS); pg.ellipse(mDR * 0.4, -mDR * 0.1, bandHeight * 0.6 * bS, bandHeight * 0.3 * bS); pg.ellipse(-mDR * 0.4, -mDR * 0.1, bandHeight * 0.6 * bS, bandHeight * 0.3 * bS);
        });
    }

    _renderMegaStructureRelays(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.78, countMin: 2, countMax: 4, distMin: 0.35, distMax: 0.75, seedOffset: 67.7
        }, (limbFactor) => {
            const qrScale = random(0.8, 1.2);
            const qrHeight = bandHeight * random(10, 16) * qrScale;
            const qrBase = bandHeight * 3 * qrScale;
            pg.stroke(40, 100, 200, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * qrScale)); pg.line(0, 0, 0, -qrHeight * 0.6);
            pg.stroke(80, 80, 220, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.6, bandHeight * 0.4 * qrScale)); pg.line(0, -qrHeight * 0.5, 0, -qrHeight);
            pg.noFill(); pg.stroke(0, 255, 255, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.7, bandHeight * 0.4 * qrScale)); pg.arc(0, -qrHeight, bandHeight * 5 * qrScale, bandHeight * 3.5 * qrScale, PI, TWO_PI);
            pg.stroke(200, 220, 255, Math.round(150 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.25 * qrScale)); pg.arc(-bandHeight * 2 * qrScale, -qrHeight * 0.7, bandHeight * 2 * qrScale, bandHeight * 1.5 * qrScale, PI, TWO_PI); pg.arc(bandHeight * 2 * qrScale, -qrHeight * 0.7, bandHeight * 2 * qrScale, bandHeight * 1.5 * qrScale, PI, TWO_PI);
            pg.stroke(180, 100, 255, Math.round(120 * limbFactor)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.15 * qrScale)); pg.line(0, -qrHeight, 0, -qrHeight - bandHeight * 6 * qrScale); pg.line(0, -qrHeight, -bandHeight * 3 * qrScale, -qrHeight - bandHeight * 5 * qrScale); pg.line(0, -qrHeight, bandHeight * 3 * qrScale, -qrHeight - bandHeight * 5 * qrScale);
            pg.noFill(); pg.stroke(100, 255, 255, Math.round(80 * limbFactor)); pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * qrScale)); for (let w = 1; w <= 4; w++) pg.arc(0, -qrHeight, bandHeight * w * 2 * qrScale, bandHeight * w * 1.4 * qrScale, PI + 0.3, TWO_PI - 0.3);
            pg.noStroke(); pg.fill(60, 100, 180, Math.round(160 * limbFactor)); pg.ellipse(0, 0, qrBase * 2, qrBase * 1.5); pg.fill(100, 140, 220, Math.round(180 * limbFactor)); pg.ellipse(0, 0, qrBase * 1.4, qrBase * 1.0); pg.fill(150, 180, 255, Math.round(200 * limbFactor)); pg.ellipse(0, 0, qrBase * 0.8, qrBase * 0.6);
        });
    }

    _renderMegaStructureMines(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.7, countMin: 2, countMax: 5, distMin: 0.4, distMax: 0.8, seedOffset: 79.1
        }, (limbFactor) => {
            const mnScale = random(0.8, 1.2), mnSize = bandHeight * random(10, 15) * mnScale;
            pg.noFill(); pg.stroke(140, 100, 40, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * mnScale)); pg.beginShape();
            for (let i = 0; i < 8; i++) { const angle = (i / 8) * TWO_PI; const d = mnSize * (1.0 + random(-0.2, 0.2)); pg.vertex(Math.cos(angle) * d, Math.sin(angle) * d); } pg.endShape(CLOSE);
            pg.stroke(220, 120, 40, Math.round(150 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * mnScale)); for (let arm = 0; arm < 3; arm++) { const angle = (arm / 3) * TWO_PI; pg.line(0, 0, Math.cos(angle) * mnSize * 1.2, Math.sin(angle) * mnSize * 1.2); }
            pg.noStroke(); pg.fill(60, 40, 20, Math.round(180 * limbFactor)); pg.ellipse(0, 0, mnSize * 0.7, mnSize * 0.7); pg.fill(255, 100, 30, Math.round(150 * limbFactor)); pg.ellipse(0, 0, mnSize * 0.25, mnSize * 0.25);
            for (let pf = 0; pf < 6; pf++) {
                const pfAngle = (pf / 6) * TWO_PI + random(0.5); const pfDist = mnSize * random(1.1, 1.4); const pfX = Math.cos(pfAngle) * pfDist, pfY = Math.sin(pfAngle) * pfDist;
                pg.fill(200, 180, 120, Math.round(180 * limbFactor)); pg.rect(pfX, pfY, bandHeight * 0.8 * mnScale, bandHeight * 0.6 * mnScale);
                if (pf % 2 === 0) { pg.fill(255, 50, 50, Math.round(200 * limbFactor)); pg.ellipse(pfX, pfY, bandHeight * 0.3 * mnScale, bandHeight * 0.3 * mnScale); }
            }
        });
    }

    _renderMegaStructureAntimatter(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.78, countMin: 2, countMax: 3, distMin: 0.3, distMax: 0.65, seedOffset: 97.3
        }, (limbFactor) => {
            const amScale = random(0.8, 1.2), amSize = bandHeight * random(8, 12) * amScale;
            pg.noFill(); pg.stroke(255, 30, 180, Math.round(120 * limbFactor)); pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * amScale));
            pg.beginShape(); for (let i = 0; i < 6; i++) { const a = (i / 6) * TWO_PI; pg.vertex(Math.cos(a) * amSize * 2.0, Math.sin(a) * amSize * 2.0); } pg.endShape(CLOSE);
            pg.stroke(0, 255, 255, Math.round(150 * limbFactor)); pg.strokeWeight(Math.max(0.6, bandHeight * 0.35 * amScale)); pg.push(); pg.rotate(PI / 4); pg.rect(-amSize * 1.2, -amSize * 1.2, amSize * 2.4, amSize * 2.4); pg.pop();
            pg.noStroke(); pg.fill(255, 240, 255, Math.round(200 * limbFactor)); pg.ellipse(0, 0, amSize * 0.4, amSize * 0.4); pg.fill(255, 200, 255, Math.round(150 * limbFactor)); pg.ellipse(0, 0, amSize * 0.6, amSize * 0.6);
            for (let w = 0; w < 6; w++) { const wA = (w / 6) * TWO_PI; const wx = Math.cos(wA) * amSize * 2.0, wy = Math.sin(wA) * amSize * 2.0; pg.fill(w % 2 === 0 ? color(255, 50, 50, Math.round(180 * limbFactor)) : color(255, 220, 50, Math.round(160 * limbFactor))); pg.ellipse(wx, wy, bandHeight * 0.6 * amScale, bandHeight * 0.6 * amScale); }
        });
    }

    _renderMegaStructureShipyards(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.74, countMin: 1, countMax: 3, distMin: 0.4, distMax: 0.8, seedOffset: 103.7
        }, (limbFactor) => {
            const syScale = random(0.8, 1.2), syWidth = bandHeight * random(14, 20) * syScale, syHeight = bandHeight * random(6, 9) * syScale;
            pg.stroke(100, 140, 180, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.8, bandHeight * 0.5 * syScale)); pg.noFill(); pg.rect(-syWidth / 2, -syHeight / 2, syWidth, syHeight);
            pg.stroke(140, 170, 210, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.6, bandHeight * 0.35 * syScale)); pg.rect(-syWidth / 2.3, -syHeight / 2.3, syWidth / 1.15, syHeight / 1.15);
            const numBays = 4;
            for (let bay = 0; bay < numBays; bay++) {
                const bayX = -syWidth / 2 + (bay + 0.5) * (syWidth / numBays); pg.stroke(120, 160, 200, Math.round(140 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.3 * syScale)); pg.line(bayX, -syHeight / 2, bayX, syHeight / 2);
                pg.noStroke(); pg.fill(160, 170, 180, Math.round(150 * limbFactor)); const shipLen = syHeight * 0.7, shipW = (syWidth / numBays) * 0.4; pg.ellipse(bayX, 0, shipW, shipLen);
                if (random() > 0.5) { pg.fill(255, 150, 50, Math.round(200 * limbFactor)); pg.ellipse(bayX + random(-shipW / 3, shipW / 3), random(-shipLen / 3, shipLen / 3), bandHeight * 0.4 * syScale, bandHeight * 0.4 * syScale); }
            }
            pg.noStroke(); pg.fill(220, 240, 255, Math.round(180 * limbFactor)); for (let wl = 0; wl < 15; wl++) pg.ellipse(random(-syWidth / 2.2, syWidth / 2.2), random(-syHeight / 2.2, syHeight / 2.2), bandHeight * 0.4 * syScale, bandHeight * 0.4 * syScale);
            pg.fill(255, 220, 50, Math.round(180 * limbFactor)); pg.ellipse(-syWidth / 2, -syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale); pg.ellipse(syWidth / 2, -syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale); pg.ellipse(-syWidth / 2, syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale); pg.ellipse(syWidth / 2, syHeight / 2, bandHeight * 0.6 * syScale, bandHeight * 0.6 * syScale);
            pg.stroke(80, 110, 150, Math.round(150 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.25 * syScale)); const craneLen = bandHeight * 4 * syScale; pg.line(-syWidth / 2, 0, -syWidth / 2 - craneLen, -craneLen * 0.4); pg.line(syWidth / 2, 0, syWidth / 2 + craneLen, -craneLen * 0.4);
            pg.noStroke(); pg.fill(255, 140, 40, Math.round(200 * limbFactor)); pg.ellipse(-syWidth / 2 - craneLen, -craneLen * 0.4, bandHeight * 0.5 * syScale, bandHeight * 0.5 * syScale); pg.ellipse(syWidth / 2 + craneLen, -craneLen * 0.4, bandHeight * 0.5 * syScale, bandHeight * 0.5 * syScale);
        });
    }

    _renderMegaStructureScrubbers(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.74, countMin: 4, countMax: 7, distMin: 0.3, distMax: 0.8, seedOffset: 109.1
        }, (limbFactor) => {
            const asScale = random(0.8, 1.2), asHeight = bandHeight * random(3, 5) * asScale, asWidth = bandHeight * 0.8 * asScale;
            pg.stroke(0, 180, 180, Math.round(180 * limbFactor)); pg.strokeWeight(Math.max(0.5, asWidth)); pg.line(0, 0, 0, -asHeight);
            pg.stroke(50, 220, 200, Math.round(150 * limbFactor)); pg.strokeWeight(Math.max(0.3, bandHeight * 0.2 * asScale)); const vaneSpread = bandHeight * 1.5 * asScale; pg.line(-vaneSpread, -asHeight, vaneSpread, -asHeight); pg.line(-vaneSpread * 0.6, -asHeight * 0.7, vaneSpread * 0.6, -asHeight * 0.7);
            pg.noStroke(); pg.fill(100, 255, 220, Math.round(120 * limbFactor)); pg.ellipse(0, -asHeight * 1.2, bandHeight * 2 * asScale, bandHeight * 4 * asScale); pg.fill(0, 150, 160, Math.round(100 * limbFactor)); pg.ellipse(0, 0, bandHeight * 1.5 * asScale, bandHeight * 1.5 * asScale);
        });
    }

    _renderMegaStructureGeothermal(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.78, countMin: 3, countMax: 5, distMin: 0.4, distMax: 0.8, seedOffset: 113.9
        }, (limbFactor) => {
            const gtScale = random(0.8, 1.2), gtSize = bandHeight * random(2, 4) * gtScale;
            pg.noFill(); pg.stroke(200, 50, 20, Math.round(150 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.25 * gtScale));
            for (let i = 0; i < 3; i++) { const angle = (i / 3) * TWO_PI + random(0.5); pg.beginShape(); pg.vertex(0, 0); pg.vertex(Math.cos(angle) * gtSize * 1.5, Math.sin(angle) * gtSize * 1.5); pg.vertex(Math.cos(angle + 0.2) * gtSize * 2.5, Math.sin(angle + 0.2) * gtSize * 2.5); pg.endShape(); }
            pg.noStroke(); pg.fill(255, 100, 30, Math.round(180 * limbFactor)); pg.ellipse(0, 0, gtSize * 1.0, gtSize * 1.0);
            pg.stroke(180, 80, 40, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * gtScale)); for (let ep = 0; ep < 3; ep++) { const epAngle = (ep / 3) * TWO_PI + PI / 2; pg.line(Math.cos(epAngle) * gtSize * 0.2, Math.sin(epAngle) * gtSize * 0.2, Math.cos(epAngle) * gtSize * 1.8, Math.sin(epAngle) * gtSize * 1.8); }
            pg.noStroke(); pg.fill(255, 150, 100, Math.round(120 * limbFactor)); for (let sv = 0; sv < 3; sv++) { const svAngle = random(0, TWO_PI); const svDist = gtSize * random(0.8, 1.5); pg.ellipse(Math.cos(svAngle) * svDist, Math.sin(svAngle) * svDist, bandHeight * 0.5 * gtScale, bandHeight * 0.5 * gtScale); }
        });
    }

    _renderMegaStructureColliders(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.88, countMin: 1, countMax: 2, distMin: 0.3, distMax: 0.6, seedOffset: 127.3
        }, (limbFactor) => {
            const pcRadius = bandHeight * random(4, 6) * random(0.8, 1.2);
            pg.noFill(); pg.stroke(255, 50, 150, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.6, bandHeight * 0.35)); pg.beginShape();
            for (let i = 0; i < 8; i++) { const a = (i / 8) * TWO_PI; pg.vertex(Math.cos(a) * pcRadius, Math.sin(a) * pcRadius); } pg.endShape(CLOSE);
            pg.stroke(255, 100, 180, Math.round(140 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.2)); pg.beginShape();
            for (let i = 0; i < 8; i++) { const a = (i / 8) * TWO_PI; pg.vertex(Math.cos(a) * pcRadius * 0.8, Math.sin(a) * pcRadius * 0.8); } pg.endShape(CLOSE);
            pg.noStroke(); pg.fill(255, 150, 200, Math.round(180 * limbFactor)); for (let d = 0; d < 8; d++) { const dA = (d / 8) * TWO_PI; pg.ellipse(Math.cos(dA) * pcRadius, Math.sin(dA) * pcRadius, bandHeight * 0.6, bandHeight * 0.6); }
            pg.fill(255, 80, 180, Math.round(150 * limbFactor)); pg.ellipse(0, 0, pcRadius * 0.4, pcRadius * 0.4);
        });
    }

    _renderMegaStructureDataCenters(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.76, countMin: 3, countMax: 5, distMin: 0.35, distMax: 0.75, seedOffset: 131.7
        }, (limbFactor) => {
            const dcScale = random(0.8, 1.2), dcWidth = bandHeight * random(2, 4) * dcScale, dcHeight = bandHeight * random(1.5, 2.5) * dcScale;
            pg.stroke(200, 220, 255, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.25 * dcScale)); pg.noFill(); pg.rect(-dcWidth / 2, -dcHeight / 2, dcWidth, dcHeight);
            pg.noStroke(); pg.fill(220, 240, 255, Math.round(180 * limbFactor));
            for (let row = 0; row < 3; row++) for (let col = 0; col < 5; col++) if (random() > 0.3) { pg.ellipse(-dcWidth / 2.5 + col * (dcWidth / 6), -dcHeight / 2.5 + row * (dcHeight / 4), bandHeight * 0.2 * dcScale, bandHeight * 0.2 * dcScale); }
            pg.stroke(180, 200, 240, Math.round(140 * limbFactor)); pg.strokeWeight(Math.max(0.4, bandHeight * 0.2 * dcScale)); pg.line(0, -dcHeight / 2, 0, -dcHeight / 2 - bandHeight * 1.5 * dcScale);
            pg.stroke(150, 200, 255, Math.round(100 * limbFactor)); pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * dcScale)); pg.line(0, -dcHeight / 2 - bandHeight * 1.5 * dcScale, 0, -dcHeight / 2 - bandHeight * 4 * dcScale);
        });
    }

    _renderMegaStructureSpaceports(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.72, countMin: 2, countMax: 4, distMin: 0.4, distMax: 0.8, seedOffset: 137.9
        }, (limbFactor) => {
            const spSize = bandHeight * random(2.5, 4) * random(0.8, 1.2);
            pg.noStroke(); pg.fill(255, 250, 230, Math.round(200 * limbFactor)); pg.ellipse(0, 0, spSize, spSize);
            pg.stroke(255, 240, 200, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.3));
            for (let pad = 0; pad < 6; pad++) {
                const pA = (pad / 6) * TWO_PI, pD = spSize * 1.2, pX = Math.cos(pA) * pD, pY = Math.sin(pA) * pD;
                pg.line(Math.cos(pA) * spSize * 0.5, Math.sin(pA) * spSize * 0.5, pX, pY);
                pg.noStroke(); pg.fill(255, 245, 210, Math.round(180 * limbFactor)); pg.ellipse(pX, pY, bandHeight * 0.8, bandHeight * 0.8);
                pg.stroke(255, 240, 200, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.3));
            }
            pg.noStroke(); pg.fill(255, 230, 100, Math.round(220 * limbFactor)); pg.ellipse(0, 0, bandHeight * 0.5, bandHeight * 0.5);
        });
    }

    _renderMegaStructureArcologyClusters(pg, r, bufferCenter, featureRand, bandHeight) {
        this._renderDistributedFeatures(pg, r, bufferCenter, featureRand, {
            chance: 0.82, countMin: 2, countMax: 3, distMin: 0.35, distMax: 0.7, seedOffset: 143.1
        }, (limbFactor) => {
            const clScale = random(0.8, 1.2), colorHue = (featureRand * 97) % 360;
            const clR = Math.floor(128 + 127 * Math.sin(colorHue * PI / 180)), clG = Math.floor(128 + 127 * Math.sin((colorHue + 120) * PI / 180)), clB = Math.floor(128 + 127 * Math.sin((colorHue + 240) * PI / 180));
            const numTowers = Math.floor(random(4, 8)), clusterRadius = bandHeight * random(3, 5) * clScale;
            for (let t = 0; t < numTowers; t++) {
                const tA = (t / numTowers) * TWO_PI + random(-0.2, 0.2), tD = random(clusterRadius * 0.3, clusterRadius * 0.9), tX = Math.cos(tA) * tD, tY = Math.sin(tA) * tD, tH = bandHeight * random(1.5, 3) * clScale;
                pg.stroke(clR, clG, clB, Math.round(160 * limbFactor)); pg.strokeWeight(Math.max(0.5, bandHeight * 0.4 * clScale)); pg.line(tX, tY, tX, tY - tH);
                pg.noStroke(); pg.fill(clR, clG, clB, Math.round(180 * limbFactor)); pg.ellipse(tX, tY - tH, bandHeight * 0.5 * clScale, bandHeight * 0.5 * clScale);
            }
            pg.stroke(clR, clG, clB, Math.round(100 * limbFactor)); pg.strokeWeight(Math.max(0.2, bandHeight * 0.1 * clScale));
            for (let s = 0; s < 5; s++) { const s1A = random(TWO_PI), s2A = s1A + random(1, 2.5), s1D = random(clusterRadius * 0.3, clusterRadius * 0.8), s2D = random(clusterRadius * 0.3, clusterRadius * 0.8); pg.line(Math.cos(s1A) * s1D, Math.sin(s1A) * s1D - bandHeight * clScale, Math.cos(s2A) * s2D, Math.sin(s2A) * s2D - bandHeight * clScale); }
            pg.noStroke(); pg.fill(clR, clG, clB, Math.round(90 * limbFactor)); pg.ellipse(0, 0, clusterRadius * 1.5, clusterRadius * 1.5);
        });
    }
} // End of Planet Class