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
        seed: function (val) {
            // Simple LCG seeding for the Perlin array
            let lcg = (val || 12345) >>> 0;
            perlin = new Float32Array(PERLIN_SIZE + 1);
            for (let i = 0; i < PERLIN_SIZE + 1; i++) {
                lcg = (lcg * 1664525 + 1013904223) >>> 0;
                perlin[i] = lcg / 4294967296.0;
            }
        }
    };
})();

// Re-map a number from one range to another
function map(n, start1, stop1, start2, stop2) {
    return (n - start1) / (stop1 - start1) * (stop2 - start2) + start2;
}

// Helper to get raw RGB from p5-like color array or hex
function parseColor(c) {
    // If it's passed as a levels array [r,g,b,a]
    if (Array.isArray(c)) {
        return { r: c[0], g: c[1], b: c[2] };
    }
    // Simple fallback
    return { r: 128, g: 128, b: 128 };
}

self.onmessage = function (e) {
    const data = e.data;
    if (!data || data.cmd !== 'generateMesh') return;

    const {
        gridX, gridY, // Grid coordinates of the center
        meshSize, resolution, // Configuration
        planetSeed, planetPalette, // Planet parameters
        sunAngle, extrusionAngle, // Visual parameters
        featureRand // Terrain random factor
    } = data;

    try {
        // 1. Setup Canvas
        // Determine buffer size
        // We need to cover meshSize * meshSize world units.
        // But we also need 'cullPadding' or similar?
        // Actually, the main thread draws the ImageBitmap. The buffer size should match the resolution
        // times the 'draw density', or just be large enough to hold the pixel-perfect result?
        // Wait, for 'generateMesh', we want to return a texture that covers the area.
        // Let's make the canvas size proportional to the mesh size, or fixed?
        // If we draw it 1:1 with world units, it might be huge (4200x4200).
        // Let's use the resolution * a scale factor, or just map exactly.
        // To keep it sharp, let's use a reasonable pixel density. 
        // 6000 units. If 1 unit = 1 pixel, that's a 6k texture. Adjust as needed.
        const canvasSize = Math.ceil(meshSize * 1.2); // Add 20% padding for extrusion overflow

        const bufferSide = 6600; // Fixed size covering the 6000 mesh + margin for edge safety
        const off = new OffscreenCanvas(bufferSide, bufferSide);
        const ctx = off.getContext('2d', { alpha: true }); // Alpha true for transparency edges

        // Seed noise
        PerlinNoise.seed(planetSeed || 12345);

        // 2. Generate Mesh Points
        const cellSize = meshSize / resolution; // e.g. 4200 / 120 = 35
        const halfRes = Math.floor(resolution / 2);

        const centerWX = gridX * cellSize;
        const centerWY = gridY * cellSize;

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

        // Generate height map array [resolution+1][resolution+1]
        // We need resolution+1 to form complete quads
        const heights = [];
        const colors = [];
        const numPoints = resolution + 1; // 121 points for 120 cells

        // Generate a slightly larger grid than requested to avoid edge glitches?
        // For now, exact grid.
        for (let gy = 0; gy < numPoints; gy++) {
            heights[gy] = [];
            colors[gy] = [];

            // Calculate world position relative to the grid center
            // gridY is the center index. 
            // The mesh goes from (gridY - halfRes) to (gridY + halfRes)
            const globalGY = gridY + (gy - halfRes);
            const worldY = globalGY * cellSize;
            const ny = worldY * sampleMultiplier + featureOffsetY;

            for (let gx = 0; gx < numPoints; gx++) {
                const globalGX = gridX + (gx - halfRes);
                const worldX = globalGX * cellSize;
                const nx = worldX * sampleMultiplier + featureOffsetX;

                // Noise 0..1 (Perlin is 0..1 by default roughly, mostly centered)
                const noiseVal = PerlinNoise.noise(nx, ny, nz);

                const h = noiseVal * 500; // 0-500 Height

                // Color calculation (same as surfaceTerrain.js)
                const nColor = Math.min(1, Math.max(0, Math.pow(noiseVal, 1.3)));
                const paletteLen = 3;
                const scaled = nColor * (paletteLen - 1);
                const paletteIdx = Math.floor(scaled);
                const lerpFactor = scaled - paletteIdx;

                const contrastBias = 2.6;
                let cf = ((lerpFactor - 0.5) * contrastBias) + 0.5;
                if (cf < 0) cf = 0; if (cf > 1) cf = 1;

                const col1 = threeRGB[Math.min(paletteIdx, 2)];
                const col2 = threeRGB[Math.min(paletteIdx + 1, 2)];

                const r = col1.r + (col2.r - col1.r) * cf;
                const g = col1.g + (col2.g - col1.g) * cf;
                const b = col1.b + (col2.b - col1.b) * cf;

                heights[gy][gx] = h;
                colors[gy][gx] = { r, g, b };
            }
        }

        // 3. Render Quads to Canvas
        // Center of canvas
        const cx = bufferSide / 2;
        const cy = bufferSide / 2;

        // Pre-calc sun & extrusion
        const sunDirX = Math.cos(sunAngle);
        const sunDirY = Math.sin(sunAngle);
        const extAngle = extrusionAngle !== undefined ? extrusionAngle : 0.5;
        const cosA = Math.cos(extAngle);
        const sinA = Math.sin(extAngle);

        // We draw quads relative to the center of the mesh
        // The mesh center is at (0,0) in local space, which maps to (cx, cy)
        // Local coord range: -halfRes*cellSize to +halfRes*cellSize

        const baseOffsetX = -halfRes * cellSize;
        const baseOffsetY = -halfRes * cellSize;

        // Iterate quads
        for (let gy = 0; gy < resolution; gy++) {
            // Row shared Y calc
            const rowY0 = baseOffsetY + gy * cellSize;
            const rowY1 = baseOffsetY + (gy + 1) * cellSize;

            for (let gx = 0; gx < resolution; gx++) {
                const h00 = heights[gy][gx];
                const h10 = heights[gy][gx + 1];
                const h01 = heights[gy + 1][gx];
                const h11 = heights[gy + 1][gx + 1];

                const c00 = colors[gy][gx];

                // Lighting (same as surfaceTerrain.js)
                const slopeX = ((h10 - h00) + (h11 - h01)) * 0.5;
                const slopeY = ((h01 - h00) + (h11 - h01)) * 0.5;
                const sunIntensity = (slopeX * -sunDirX + slopeY * -sunDirY) * 0.015;

                const avgHeight = (h00 + h10 + h01 + h11) * 0.25;
                const heightLight = avgHeight * 0.0008;
                const steepness = Math.abs(slopeX) + Math.abs(slopeY);
                const valleyDarken = steepness * 0.005;

                let shade = 0.65 + sunIntensity + heightLight - valleyDarken;
                if (shade < 0.25) shade = 0.25;
                if (shade > 1.4) shade = 1.4;

                const r = Math.floor(c00.r * shade);
                const g = Math.floor(c00.g * shade);
                const b = Math.floor(c00.b * shade);

                // Draw Quad using 2D path
                // Extrude: ScreenX = WorldX - height*sin, ScreenY = WorldY - height*cos
                const colX0 = baseOffsetX + gx * cellSize;
                const colX1 = baseOffsetX + (gx + 1) * cellSize;

                // Fix for "white line" artifact:
                // Sub-pixel gaps between quads can let the background show through.
                // We stroke the quad with the same color to seal these gaps.
                ctx.fillStyle = `rgb(${r},${g},${b})`;
                ctx.strokeStyle = `rgb(${r},${g},${b})`;
                ctx.lineWidth = 1;
                ctx.beginPath();
                ctx.moveTo(cx + colX0 - h00 * sinA, cy + rowY0 - h00 * cosA);
                ctx.lineTo(cx + colX1 - h10 * sinA, cy + rowY0 - h10 * cosA);
                ctx.lineTo(cx + colX1 - h11 * sinA, cy + rowY1 - h11 * cosA);
                ctx.lineTo(cx + colX0 - h01 * sinA, cy + rowY1 - h01 * cosA);
                ctx.closePath();
                ctx.fill();
                ctx.stroke();
            }
        }

        // 4. Return Bitmap
        if (typeof off.transferToImageBitmap === 'function') {
            const bitmap = off.transferToImageBitmap();
            self.postMessage({ bitmap, gridX, gridY }, [bitmap]);
        } else {
            createImageBitmap(off).then(bitmap => {
                self.postMessage({ bitmap, gridX, gridY }, [bitmap]);
            });
        }

    } catch (err) {
        console.error('Surface Worker Error:', err);
    }
};
