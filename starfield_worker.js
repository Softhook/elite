// Worker: generates a tile using OffscreenCanvas and returns an ImageBitmap
// Deep space dark blue background color
const STARFIELD_BG_COLOR = '#0a0f28';

self.onmessage = function (e) {
    const data = e.data;
    if (!data || !data.cmd) return;

    // Generate a single tile
    if (data.cmd === 'generateTile') {
        const tx = data.tx, ty = data.ty, tileSize = data.tileSize, systemIndex = data.systemIndex;
        // Accept optional background color, default to dark blue
        const bgColor = data.backgroundColor || STARFIELD_BG_COLOR;
        try {
            const off = new OffscreenCanvas(tileSize, tileSize);
            const ctx = off.getContext('2d', { alpha: false });
            ctx.imageSmoothingEnabled = true;
            // background - deep space dark blue
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, tileSize, tileSize);

            // Draw nebula clouds
            drawNebulaToCtx(ctx, tx, ty, tileSize, systemIndex);

            drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, {
                gridSize: 45, maxStarsPerCell: 3,
                sizeRange: [0.5, 1.5], brightnessRange: [80, 160],
                colorTypes: ['white', 'white', 'white', 'blue', 'yellow']
            });

            drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, {
                gridSize: 200, maxStarsPerCell: 1,
                sizeRange: [2.0, 4.0], brightnessRange: [180, 255],
                colorTypes: ['white', 'white', 'blue', 'yellow', 'red']
            });

            // create ImageBitmap and post back
            if (typeof off.transferToImageBitmap === 'function') {
                const bitmap = off.transferToImageBitmap();
                self.postMessage({ key: `${tx},${ty}`, bitmap, systemIndex }, [bitmap]);
            } else {
                createImageBitmap(off).then(bitmap => {
                    self.postMessage({ key: `${tx},${ty}`, bitmap, systemIndex }, [bitmap]);
                }).catch(err => {
                    self.postMessage({ key: `${tx},${ty}`, error: String(err), systemIndex });
                });
            }
        } catch (err) {
            self.postMessage({ key: `${tx},${ty}`, error: String(err), systemIndex });
        }
        return;
    }

    // (No buffer generation here) worker only supports 'generateTile'
};

function drawNebulaToCtx(ctx, tx, ty, tileSize, systemIndex) {
    // Nebula configuration
    const scale = 0.002; // Controls the size of the noise features (smaller = larger clouds)
    const persistence = 4; // Detail level (higher = more jagged)

    // Resolution optimization: calculate noise for blocks of pixels instead of every single one
    // A block size of 4-8 gives a nice "misty" blur and runs much faster.
    const blockSize = 8;

    const worldLeft = tx * tileSize;
    const worldTop = ty * tileSize;

    // Initialize noise with system seed if needed, or just use a fixed seed for consistency
    // Simple noise wrapper for 2D
    const noise2D = (x, y) => {
        return SimplexNoise.noise2D(x, y);
    };

    // We can iterate over the tile in blocks
    for (let y = 0; y < tileSize; y += blockSize) {
        for (let x = 0; x < tileSize; x += blockSize) {
            const worldX = worldLeft + x;
            const worldY = worldTop + y;

            // 1. Density noise: determines where the nebulae are
            // Use slow moving offset based on systemIndex to vary per system slightly
            const n1 = noise2D(worldX * scale, worldY * scale);
            const n2 = noise2D(worldX * scale * 2 + 100, worldY * scale * 2 + 100) * 0.5;
            const density = (n1 + n2); // Range roughly -1.5 to 1.5

            // Threshold for drawing: only draw if density is above a certain value
            // "Subtle" interpretation: only appear in patches
            if (density > 0.2) {
                // 2. Color noise: determines purple vs green
                // Range -1 to 1. < 0 = purple, > 0 = green
                const colorNoise = noise2D(worldX * scale * 1.5 + 500, worldY * scale * 1.5 + 500);

                // Alpha calculation: fade out at edges of the density blob
                // Max alpha is low (e.g. 0.05 to 0.15) for subtlety
                let alpha = (density - 0.2) * 0.15;
                if (alpha > 0.15) alpha = 0.15;
                if (alpha < 0) alpha = 0;

                let r, g, b;

                // Interpolate colors
                if (colorNoise < -0.2) {
                    // Purple haze (more purple)
                    // r: 60-100, g: 0-20, b: 80-140
                    r = 80; g = 10; b = 120;
                } else if (colorNoise > 0.2) {
                    // Greenish mist
                    // r: 0-20, g: 50-80, b: 20-50
                    r = 10; g = 70; b = 40;
                } else {
                    // Transition zone - mix
                    r = 45; g = 40; b = 80;
                }

                ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha})`;
                ctx.fillRect(x, y, blockSize, blockSize);
            }
        }
    }
}

// Minimal Simplex Noise implementation (2D)
// Adapted for standalone worker usage
const SimplexNoise = (function () {
    const F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
    const G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

    // Permutation table
    const p = new Uint8Array(256);
    for (let i = 0; i < 256; i++) p[i] = i;
    // Shuffle (using a fixed seed for consistency across reloads/workers)
    // For a real procedural universe, we might want to seed this with systemIndex, 
    // but for now consistent background is good.
    let seed = 12345;
    for (let i = 255; i > 0; i--) {
        seed = (seed * 1664525 + 1013904223) >>> 0;
        const j = seed % (i + 1);
        const t = p[i]; p[i] = p[j]; p[j] = t;
    }
    const perm = new Uint8Array(512);
    const permMod12 = new Uint8Array(512);
    for (let i = 0; i < 512; i++) {
        perm[i] = p[i & 255];
        permMod12[i] = perm[i] % 12;
    }

    const grad3 = new Float32Array([1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1, 0,
        1, 0, 1, -1, 0, 1, 1, 0, -1, -1, 0, -1,
        0, 1, 1, 0, -1, 1, 0, 1, -1, 0, -1, -1]);

    return {
        noise2D: function (xin, yin) {
            let n0, n1, n2; // Noise contributions from the three corners
            // Skew the input space to determine which simplex cell we're in
            const s = (xin + yin) * F2; // Hairy factor for 2D
            const i = Math.floor(xin + s);
            const j = Math.floor(yin + s);
            const t = (i + j) * G2;
            const X0 = i - t; // Unskew the cell origin back to (x,y) space
            const Y0 = j - t;
            const x0 = xin - X0; // The x,y distances from the cell origin
            const y0 = yin - Y0;

            // For the 2D case, the simplex shape is an equilateral triangle.
            // Determine which simplex we are in.
            let i1, j1; // Offsets for second (middle) corner of simplex in (i,j) coords
            if (x0 > y0) { i1 = 1; j1 = 0; } // lower triangle, XY order: (0,0)->(1,0)->(1,1)
            else { i1 = 0; j1 = 1; }      // upper triangle, YX order: (0,0)->(0,1)->(1,1)

            // A step of (1,0) in (i,j) means a step of (1-c,-c) in (x,y), and
            // a step of (0,1) in (i,j) means a step of (-c,1-c) in (x,y), where
            // c = (3-sqrt(3))/6
            const x1 = x0 - i1 + G2; // Offsets for middle corner in (x,y) unskewed coords
            const y1 = y0 - j1 + G2;
            const x2 = x0 - 1.0 + 2.0 * G2; // Offsets for last corner in (x,y) unskewed coords
            const y2 = y0 - 1.0 + 2.0 * G2;

            // Work out the hashed gradient indices of the three simplex corners
            const ii = i & 255;
            const jj = j & 255;
            const gi0 = permMod12[ii + perm[jj]];
            const gi1 = permMod12[ii + i1 + perm[jj + j1]];
            const gi2 = permMod12[ii + 1 + perm[jj + 1]];

            // Calculate the contribution from the three corners
            let t0 = 0.5 - x0 * x0 - y0 * y0;
            if (t0 < 0) n0 = 0.0;
            else {
                t0 *= t0;
                n0 = t0 * t0 * (grad3[gi0 * 3] * x0 + grad3[gi0 * 3 + 1] * y0);
            }
            let t1 = 0.5 - x1 * x1 - y1 * y1;
            if (t1 < 0) n1 = 0.0;
            else {
                t1 *= t1;
                n1 = t1 * t1 * (grad3[gi1 * 3] * x1 + grad3[gi1 * 3 + 1] * y1);
            }
            let t2 = 0.5 - x2 * x2 - y2 * y2;
            if (t2 < 0) n2 = 0.0;
            else {
                t2 *= t2;
                n2 = t2 * t2 * (grad3[gi2 * 3] * x2 + grad3[gi2 * 3 + 1] * y2);
            }
            // Add contributions from each corner to get the final noise value.
            // The result is scaled to return values in the interval [-1,1].
            return 70.0 * (n0 + n1 + n2);
        }
    };
})();

function drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, config) {
    const gridSize = config.gridSize;
    const systemSeed = (systemIndex * 1337) >>> 0;
    const colors = {
        white: [255, 255, 255],
        blue: [200, 220, 255],
        yellow: [255, 250, 200],
        red: [255, 200, 180]
    };

    const worldLeft = tx * tileSize;
    const worldRight = worldLeft + tileSize;
    const worldTop = ty * tileSize;
    const worldBottom = worldTop + tileSize;

    const startGX = Math.floor(worldLeft / gridSize);
    const endGX = Math.ceil(worldRight / gridSize);
    const startGY = Math.floor(worldTop / gridSize);
    const endGY = Math.ceil(worldBottom / gridSize);

    const { maxStarsPerCell, sizeRange, brightnessRange, colorTypes } = config;
    const minSize = sizeRange[0];
    const sizeDiff = sizeRange[1] - minSize;
    const minBright = brightnessRange[0];
    const brightDiff = brightnessRange[1] - minBright;

    // Optimizations:
    // - use an LCG helper returning floats
    // - reuse inverse constant
    // - cache small pre-rendered star sprites (by size+color)
    const INV32 = 1 / 4294967296;
    const spriteCache = new Map();

    function makeSprite(size, r, g, b) {
        const s = Math.max(1, Math.round(size));
        const key = s + '|' + r + ',' + g + ',' + b;
        if (spriteCache.has(key)) return spriteCache.get(key);
        const pad = 2;
        const c = new OffscreenCanvas(s + pad * 2, s + pad * 2);
        const cc = c.getContext('2d', { alpha: true });
        const cx = (s + pad * 2) / 2;
        const cy = cx;
        const radius = s / 2;
        const grad = cc.createRadialGradient(cx, cy, Math.max(0, radius * 0.1), cx, cy, radius);
        grad.addColorStop(0, `rgba(${r},${g},${b},1)`);
        grad.addColorStop(0.6, `rgba(${r},${g},${b},0.6)`);
        grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
        cc.fillStyle = grad;
        cc.beginPath();
        cc.arc(cx, cy, radius, 0, Math.PI * 2);
        cc.fill();
        spriteCache.set(key, { canvas: c, half: (s + pad * 2) / 2 });
        return spriteCache.get(key);
    }

    for (let gx = startGX; gx <= endGX; gx++) {
        const gxSeed = (gx * 73856093) >>> 0;
        for (let gy = startGY; gy <= endGY; gy++) {
            let cellSeed = (gxSeed ^ (gy * 19349663) ^ (systemSeed * 83492791)) >>> 0;
            let rng = cellSeed;
            function nextFloat() { rng = (rng * 1664525 + 1013904223) >>> 0; return rng * INV32; }

            if (nextFloat() > ((gridSize > 100) ? 0.85 : 0.7)) continue;
            const starCount = Math.floor(nextFloat() * maxStarsPerCell) + 1;
            for (let i = 0; i < starCount; i++) {
                const worldX = gx * gridSize + (nextFloat() - 0.5) * gridSize * 2;
                const worldY = gy * gridSize + (nextFloat() - 0.5) * gridSize * 2;
                const bufferX = worldX - worldLeft;
                const bufferY = worldY - worldTop;
                if (bufferX < -5 || bufferX > tileSize + 5 || bufferY < -5 || bufferY > tileSize + 5) continue;
                const size = minSize + nextFloat() * sizeDiff;
                let brightness = minBright + nextFloat() * brightDiff;
                if (size < 2) brightness = Math.min(255, brightness * 1.4);
                const colorType = colorTypes[Math.floor(nextFloat() * colorTypes.length)];
                const baseColor = colors[colorType];
                const brightnessFactor = brightness / 255;
                const r = Math.round(baseColor[0] * brightnessFactor);
                const g = Math.round(baseColor[1] * brightnessFactor);
                const b = Math.round(baseColor[2] * brightnessFactor);

                if (size <= 2) {
                    // fast pixel for tiny stars
                    ctx.fillStyle = `rgb(${r},${g},${b})`;
                    ctx.fillRect((bufferX + 0.5) | 0, (bufferY + 0.5) | 0, Math.max(1, (size + 0.5) | 0), Math.max(1, (size + 0.5) | 0));
                } else {
                    // draw pre-rendered soft sprite for medium/large stars
                    const sprite = makeSprite(size, r, g, b);
                    ctx.drawImage(sprite.canvas, Math.round(bufferX - sprite.half), Math.round(bufferY - sprite.half));
                }
            }
        }
    }
}

// Buffer-generation removed — worker only generates tiles now.
