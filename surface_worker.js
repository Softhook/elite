// surface_worker.js
// Worker for generating surface terrain bitmaps
// Handles noise generation and rendering to OffscreenCanvas

// Classic Perlin Noise implementation (to match p5.js noise)
const PerlinNoise = (function () {
    const PERLIN_YWRAPB = 4;
    const PERLIN_YWRAP = 1 << PERLIN_YWRAPB;
    const PERLIN_ZWRAPB = 8;
    const PERLIN_ZWRAP = 1 << PERLIN_ZWRAPB;
    const PERLIN_SIZE = 4095;

    let perlin_octaves = 4; // default to medium detail
    let perlin_amp_falloff = 0.5; // 50% reduction/octave

    const scaled_cosine = function (i) {
        return 0.5 * (1.0 - Math.cos(i * Math.PI));
    };

    let perlin; // will be initialized lazily

    // Noise value cache: keyed by unscaled global grid coordinates.
    // When the grid shifts, ~95% of sample points overlap — cache hits avoid
    // expensive 4-octave evaluations. Cleared when planet seed changes.
    let _noiseCache = null;
    let _cacheSeed = undefined;

    function _cacheKey(ggx, ggy) {
        return ggx + ',' + ggy;
    }

    return {
        noise: function (x, y, z) {
            y = y || 0;
            z = z || 0;

            if (perlin == null) {
                perlin = new Float32Array(PERLIN_SIZE + 1);
                for (let i = 0; i < PERLIN_SIZE + 1; i++) {
                    perlin[i] = Math.random();
                }
            }

            if (x < 0) x = -x;
            if (y < 0) y = -y;
            if (z < 0) z = -z;

            let xi = Math.floor(x),
                yi = Math.floor(y),
                zi = Math.floor(z);
            let xf = x - xi;
            let yf = y - yi;
            let zf = z - zi;
            let rxf, ryf;

            let r = 0;
            let ampl = 0.5;

            let n1, n2, n3;

            for (let o = 0; o < perlin_octaves; o++) {
                let of = xi + (yi << PERLIN_YWRAPB) + (zi << PERLIN_ZWRAPB);

                rxf = scaled_cosine(xf);
                ryf = scaled_cosine(yf);

                n1 = perlin[of & PERLIN_SIZE];
                n1 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n1);
                n2 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
                n2 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n2);
                n1 += ryf * (n2 - n1);

                of += PERLIN_ZWRAP;
                n2 = perlin[of & PERLIN_SIZE];
                n2 += rxf * (perlin[(of + 1) & PERLIN_SIZE] - n2);
                n3 = perlin[(of + PERLIN_YWRAP) & PERLIN_SIZE];
                n3 += rxf * (perlin[(of + PERLIN_YWRAP + 1) & PERLIN_SIZE] - n3);
                n2 += ryf * (n3 - n2);

                r += n1 * ampl;
                ampl *= perlin_amp_falloff;
                xi <<= 1;
                xf *= 2;
                yi <<= 1;
                yf *= 2;
                zi <<= 1;
                zf *= 2;

                if (xf >= 1.0) {
                    xi++;
                    xf--;
                }
                if (yf >= 1.0) {
                    yi++;
                    yf--;
                }
                if (zf >= 1.0) {
                    zi++;
                    zf--;
                }
            }
            return r;
        },

        /**
         * Cached noise evaluation. Returns [noiseVal, powResult].
         * When the grid shifts, ~95% of sample points overlap — cache hits
         * skip both the 4-octave Perlin eval AND the Math.pow.
         */
        cachedNoise: function (ggx, ggy, wx, wy, nz) {
            const key = _cacheKey(ggx, ggy);
            if (_noiseCache && _noiseCache.has(key)) {
                return _noiseCache.get(key);
            }
            const noiseVal = this.noise(wx, wy, nz);
            const powVal = Math.pow(noiseVal, 1.3);
            const entry = [noiseVal, powVal];
            if (_noiseCache) _noiseCache.set(key, entry);
            return entry;
        },

        seed: function (val) {
            // Clear noise cache when seed changes (new planet)
            const newSeed = (val || 12345) >>> 0;
            if (newSeed !== _cacheSeed) {
                _noiseCache = new Map();
                _cacheSeed = newSeed;
            }

            // Simple LCG seeding for the Perlin array
            let lcg = newSeed;
            perlin = new Float32Array(PERLIN_SIZE + 1);
            for (let i = 0; i < PERLIN_SIZE + 1; i++) {
                lcg = (lcg * 1664525 + 1013904223) >>> 0;
                perlin[i] = lcg / 4294967296.0;
            }
        }
    };
})();

self.onmessage = function (e) {
    const data = e.data;
    if (!data || data.cmd !== 'generateMesh') return;

    const {
        gridX, gridY, // Grid coordinates of the center
        meshSize, resolution, // Configuration
        planetSeed, planetPalette, // Planet parameters
        sunAngle, extrusionAngle, // Visual parameters
        featureRand, // Terrain random factor
        bufferPixels, marginPixels // Buffer sizing (optional, defaults to 5500/0)
    } = data;

    try {
        // 1. Setup Canvas with configurable buffer size
        // Mesh covers meshSize world units; rendered at pixelScale into the buffer.
        // Margins filled with base terrain colour prevent edge artefacts.
        const bufPx = (bufferPixels && bufferPixels > 0) ? bufferPixels : 5500;
        const margin = (marginPixels !== undefined && marginPixels >= 0) ? marginPixels : 0;
        const innerPx = bufPx - margin * 2;
        const pixelScale = innerPx / meshSize;  // pixels per world unit
        const worldPerPixel = meshSize / innerPx; // world units per pixel (for drawImage)

        const off = new OffscreenCanvas(bufPx, bufPx);
        const ctx = off.getContext('2d', { alpha: true });

        // Seed noise
        PerlinNoise.seed(planetSeed || 12345);

        // 2. Generate Mesh Points
        const cellSize = meshSize / resolution;
        const halfRes = Math.floor(resolution / 2);

        // Constants
        const sampleMultiplier = 0.003;
        const featureOffsetX = (featureRand || 0) * 0.001;
        const featureOffsetY = (featureRand || 0) * 0.002;
        const nz = (featureRand || 0) * 0.6;

        // Prepare palette
        let threeRGB = [];
        if (planetPalette && planetPalette.length) {
            // Palette is passed as array of [r,g,b] arrays
            const srcNames = planetPalette.length >= 4 ?
                [planetPalette[1], planetPalette[2], planetPalette[3]] :
                planetPalette.slice(0, 3);

            // Map to objects and calc luminance
            threeRGB = srcNames.map(c => {
                const r = c[0], g = c[1], b = c[2];
                return { r, g, b, lum: 0.299 * r + 0.587 * g + 0.114 * b };
            });
            // Fill if < 3
            while (threeRGB.length < 3) threeRGB.push(threeRGB[threeRGB.length - 1] || { r: 128, g: 128, b: 128, lum: 0.5 });
            // Sort by luminance
            threeRGB.sort((a, b) => a.lum - b.lum);
        } else {
            threeRGB = [{ r: 50, g: 50, b: 50, lum: 0.2 }, { r: 100, g: 100, b: 100, lum: 0.4 }, { r: 200, g: 200, b: 200, lum: 0.8 }];
        }

        // Generate height map and pre-lit colours.
        // Use flat typed arrays instead of objects to avoid GC pressure
        // and property-access overhead on 5,776 grid points.
        const heights = [];
        const numPoints = resolution + 1;
        const colorR = new Float64Array(numPoints * numPoints);
        const colorG = new Float64Array(numPoints * numPoints);
        const colorB = new Float64Array(numPoints * numPoints);

        for (let gy = 0; gy < numPoints; gy++) {
            heights[gy] = new Float64Array(numPoints);

            const globalGY = gridY + (gy - halfRes);
            const worldY = globalGY * cellSize;
            const ny = worldY * sampleMultiplier + featureOffsetY;
            const rowBase = gy * numPoints;

            for (let gx = 0; gx < numPoints; gx++) {
                const globalGX = gridX + (gx - halfRes);
                const worldX = globalGX * cellSize;
                const nx = worldX * sampleMultiplier + featureOffsetX;

                const [noiseVal, rawPow] = PerlinNoise.cachedNoise(globalGX, globalGY, nx, ny, nz);
                const h = noiseVal * 500;
                heights[gy][gx] = h;

                // Palette colour using pre-cached pow(noise, 1.3), clamped safe
                const nColor = rawPow < 0 ? 0 : rawPow > 1 ? 1 : rawPow;
                const scaled = nColor * 2;
                const pIdx = scaled | 0;   // fast floor for positive numbers
                let cf = ((scaled - pIdx - 0.5) * 2.6) + 0.5;
                if (cf < 0) cf = 0; else if (cf > 1) cf = 1;

                const c1 = threeRGB[pIdx < 2 ? pIdx : 2];
                const c2 = threeRGB[(pIdx + 1) < 2 ? (pIdx + 1) : 2];

                const idx = rowBase + gx;
                colorR[idx] = c1.r + (c2.r - c1.r) * cf;
                colorG[idx] = c1.g + (c2.g - c1.g) * cf;
                colorB[idx] = c1.b + (c2.b - c1.b) * cf;
            }
        }

        // 3. Render Quads — precompute everything possible outside the loops
        const cx = bufPx / 2;
        const cy = bufPx / 2;

        const sunDirX = Math.cos(sunAngle);
        const sunDirY = Math.sin(sunAngle);
        const extAngle = extrusionAngle !== undefined ? extrusionAngle : 0.5;
        const cosA = Math.cos(extAngle);
        const sinA = Math.sin(extAngle);

        // Combined scale factors (avoids multiplying per vertex)
        const sinAScaled = sinA * pixelScale;
        const cosAScaled = cosA * pixelScale;

        const baseOffsetX = -halfRes * cellSize;
        const baseOffsetY = -halfRes * cellSize;

        // Precompute column X positions once (resolution+1 values)
        const colPosX = new Float64Array(numPoints);
        for (let gx = 0; gx < numPoints; gx++) {
            colPosX[gx] = cx + (baseOffsetX + gx * cellSize) * pixelScale;
        }

        // Fill background
        const baseCol = threeRGB[1] || threeRGB[0];
        ctx.fillStyle = `rgb(${baseCol.r},${baseCol.g},${baseCol.b})`;
        ctx.fillRect(0, 0, bufPx, bufPx);

        // Iterate quads
        for (let gy = 0; gy < resolution; gy++) {
            const rowY0 = baseOffsetY + gy * cellSize;
            const rowY1 = baseOffsetY + (gy + 1) * cellSize;
            // Precompute row Y pixel positions
            const rowY0px = cy + rowY0 * pixelScale;
            const rowY1px = cy + rowY1 * pixelScale;

            const rowH0 = heights[gy];
            const rowH1 = heights[gy + 1];
            const rowBase0 = gy * numPoints;
            const rowBase1 = (gy + 1) * numPoints;

            for (let gx = 0; gx < resolution; gx++) {
                const h00 = rowH0[gx];
                const h10 = rowH0[gx + 1];
                const h01 = rowH1[gx];
                const h11 = rowH1[gx + 1];

                const idx = rowBase0 + gx;
                const cr = colorR[idx], cg = colorG[idx], cb = colorB[idx];

                // Lighting
                const slopeX = ((h10 - h00) + (h11 - h01)) * 0.5;
                const slopeY = ((h01 - h00) + (h11 - h01)) * 0.5;
                const sunIntensity = (slopeX * -sunDirX + slopeY * -sunDirY) * 0.015;
                const avgHeight = (h00 + h10 + h01 + h11) * 0.25;
                const heightLight = avgHeight * 0.0008;
                const steepness = Math.abs(slopeX) + Math.abs(slopeY);

                let shade = 0.65 + sunIntensity + heightLight - steepness * 0.005;
                if (shade < 0.25) shade = 0.25;
                else if (shade > 1.4) shade = 1.4;

                const r = (cr * shade) | 0;
                const g = (cg * shade) | 0;
                const b = (cb * shade) | 0;

                ctx.fillStyle = `rgb(${r},${g},${b})`;

                // Col positions from precomputed array
                const colX0px = colPosX[gx];
                const colX1px = colPosX[gx + 1];

                // Fast path: flat quads use fillRect (most terrain)
                const hMin = h00 < h10 ? (h00 < h01 ? (h00 < h11 ? h00 : h11) : (h01 < h11 ? h01 : h11))
                                     : (h10 < h01 ? (h10 < h11 ? h10 : h11) : (h01 < h11 ? h01 : h11));
                const hMax = h00 > h10 ? (h00 > h01 ? (h00 > h11 ? h00 : h11) : (h01 > h11 ? h01 : h11))
                                     : (h10 > h01 ? (h10 > h11 ? h10 : h11) : (h01 > h11 ? h01 : h11));

                if (hMax - hMin < 3) {
                    // Reuse avgHeight from lighting above
                    const rx = colX0px - avgHeight * sinAScaled;
                    const ry = rowY0px - avgHeight * cosAScaled;
                    const rw = colX1px - colX0px;
                    const rh = rowY1px - rowY0px;
                    ctx.fillRect(rx, ry, rw > 1 ? rw : 1, rh > 1 ? rh : 1);
                } else {
                    ctx.beginPath();
                    ctx.moveTo(colX0px - h00 * sinAScaled, rowY0px - h00 * cosAScaled);
                    ctx.lineTo(colX1px - h10 * sinAScaled, rowY0px - h10 * cosAScaled);
                    ctx.lineTo(colX1px - h11 * sinAScaled, rowY1px - h11 * cosAScaled);
                    ctx.lineTo(colX0px - h01 * sinAScaled, rowY1px - h01 * cosAScaled);
                    ctx.closePath();
                    ctx.fill();
                }
            }
        }

        // 4. Return Bitmap with scaling metadata
        const result = { bitmap: null, gridX, gridY, worldPerPixel };
        if (typeof off.transferToImageBitmap === 'function') {
            result.bitmap = off.transferToImageBitmap();
            self.postMessage(result, [result.bitmap]);
        } else {
            createImageBitmap(off).then(bitmap => {
                result.bitmap = bitmap;
                self.postMessage(result, [bitmap]);
            });
        }

    } catch (err) {
        console.error('Surface Worker Error:', err);
    }
};
