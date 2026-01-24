// Worker: generates a tile using OffscreenCanvas and returns an ImageBitmap
// Deep space dark blue background color
const STARFIELD_BG_COLOR = '#0a0f28';

// Scientific spectral classification colors (O, B, A, F, G, K, M)
// Approximate RGB values for star temperatures
const SPECTRAL_COLORS = {
    O: [155, 176, 255], // Blue
    B: [170, 191, 255], // Blue-White
    A: [202, 215, 255], // White-Blue
    F: [248, 247, 255], // White
    G: [255, 244, 234], // White-Yellow (Sol)
    K: [255, 210, 161], // Orange
    M: [255, 204, 111], // Red-Orange
    // Rare types
    L: [255, 50, 50],   // Deep Red (Dwarfs/Giants)
    W: [100, 200, 255], // Wolf-Rayet (Intense Blue/Greenish)
    N: [50, 255, 255]   // Neutron (Cyan/Pulsar)
};

// Distribution of star types (Cumulative probability)
const STAR_DISTRIBUTION = [
    { type: 'M', p: 0.70 }, // Most common (Red dwarfs)
    { type: 'K', p: 0.85 },
    { type: 'G', p: 0.93 },
    { type: 'F', p: 0.97 },
    { type: 'A', p: 0.99 },
    { type: 'B', p: 0.998 },
    { type: 'O', p: 1.0 }   // Rarest main sequence
];

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

            // Draw tiny/distant stars (High density, faint)
            drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, {
                gridSize: 30, maxStarsPerCell: 5,
                sizeRange: [0.3, 1.2], brightnessRange: [60, 140],
                distribution: STAR_DISTRIBUTION,
                clustering: true
            });

            // Draw medium/main sequence stars
            drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, {
                gridSize: 120, maxStarsPerCell: 2,
                sizeRange: [1.5, 3.5], brightnessRange: [150, 230],
                distribution: STAR_DISTRIBUTION,
                clustering: false
            });

            // Draw "Rare Giants" and oddities (Very sparse, bright, unique colors)
            drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, {
                gridSize: 400, maxStarsPerCell: 1,
                sizeRange: [4.0, 7.0], brightnessRange: [220, 255],
                distribution: [
                    { type: 'B', p: 0.3 }, { type: 'O', p: 0.5 },
                    { type: 'L', p: 0.8 }, { type: 'W', p: 0.95 }, { type: 'N', p: 1.0 }
                ],
                clustering: false,
                rareLayer: true
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

    // Seed nebula palette based on system index
    // 0: default (purple/teal)
    // 1: fire (orange/red)
    // 2: ice (blue/cyan)
    // 3: venom (green/yellow)
    const nebulaType = systemIndex % 4;
    let colorsA, colorsB;

    switch (nebulaType) {
        case 1: // Fire
            colorsA = { r: 160, g: 40, b: 20 }; // Dark red
            colorsB = { r: 200, g: 120, b: 40 }; // Orange
            break;
        case 2: // Ice
            colorsA = { r: 20, g: 60, b: 140 }; // Deep blue
            colorsB = { r: 80, g: 200, b: 220 }; // Cyan
            break;
        case 3: // Venom
            colorsA = { r: 40, g: 100, b: 20 }; // Green
            colorsB = { r: 120, g: 160, b: 60 }; // Yellow-green
            break;
        default: // Standard Purple/Teal
            colorsA = { r: 80, g: 10, b: 120 }; // Purple
            colorsB = { r: 10, g: 70, b: 40 };  // Teal
            break;
    }

    // We can iterate over the tile in blocks
    for (let y = 0; y < tileSize; y += blockSize) {
        for (let x = 0; x < tileSize; x += blockSize) {
            const worldX = worldLeft + x;
            const worldY = worldTop + y;

            // 1. Density noise using systemIndex as offset
            const n1 = noise2D(worldX * scale + (systemIndex * 100), worldY * scale + (systemIndex * 100));
            const n2 = noise2D(worldX * scale * 2, worldY * scale * 2) * 0.5;
            const density = (n1 + n2);

            if (density > 0.2) {
                // 2. Color noise
                const colorNoise = noise2D(worldX * scale * 1.5 + 500, worldY * scale * 1.5 + 500);

                let alpha = (density - 0.2) * 0.15;
                if (alpha > 0.18) alpha = 0.18; // Slight boost to max alpha
                if (alpha < 0) alpha = 0;

                let r, g, b;

                if (colorNoise < -0.2) {
                    // Type A
                    r = colorsA.r; g = colorsA.g; b = colorsA.b;
                } else if (colorNoise > 0.2) {
                    // Type B
                    r = colorsB.r; g = colorsB.g; b = colorsB.b;
                } else {
                    // Mix
                    r = (colorsA.r + colorsB.r) * 0.5;
                    g = (colorsA.g + colorsB.g) * 0.5;
                    b = (colorsA.b + colorsB.b) * 0.5;
                }

                // Add varied star-light scatter within nebula
                if (Math.random() < 0.05) {
                    r = Math.min(255, r + 40);
                    g = Math.min(255, g + 40);
                    b = Math.min(255, b + 40);
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

    const worldLeft = tx * tileSize;
    const worldRight = worldLeft + tileSize;
    const worldTop = ty * tileSize;
    const worldBottom = worldTop + tileSize;

    const startGX = Math.floor(worldLeft / gridSize);
    const endGX = Math.ceil(worldRight / gridSize);
    const startGY = Math.floor(worldTop / gridSize);
    const endGY = Math.ceil(worldBottom / gridSize);

    const { maxStarsPerCell, sizeRange, brightnessRange } = config;
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

            // Clustering: Using noise to vary density
            // If clustering is on, use low-freq noise to skip some cells or boost others
            let localMultiplier = 1.0;
            if (config.clustering) {
                // Approximate noise using cell coords (cheaper than Simplex calls)
                const clusterNoise = Math.sin(gx * 0.1) * Math.cos(gy * 0.1);
                if (clusterNoise < -0.5) continue; // Empty voids
                if (clusterNoise > 0.6) localMultiplier = 2.0; // Clusters
            }

            if (nextFloat() > 0.8 / localMultiplier) continue; // Skip most cells

            const countRaw = Math.floor(nextFloat() * maxStarsPerCell * localMultiplier) + 1;
            const starCount = Math.min(countRaw, 10); // Cap per cell

            for (let i = 0; i < starCount; i++) {
                const worldX = gx * gridSize + (nextFloat() - 0.5) * gridSize * 2;
                const worldY = gy * gridSize + (nextFloat() - 0.5) * gridSize * 2;
                const bufferX = worldX - worldLeft;
                const bufferY = worldY - worldTop;

                // Allow drawing slightly outside for large sprites
                if (bufferX < -10 || bufferX > tileSize + 10 || bufferY < -10 || bufferY > tileSize + 10) continue;

                // Pick spectral type based on cumulative distribution
                const pType = nextFloat();
                let type = 'M';
                for (let d of config.distribution) {
                    if (pType <= d.p) {
                        type = d.type;
                        break;
                    }
                }
                const baseColor = SPECTRAL_COLORS[type] || [255, 255, 255];

                const size = minSize + nextFloat() * sizeDiff;

                // Brightness variation tied to size and randomness
                let brightness = minBright + nextFloat() * brightDiff;

                // Boost brightness for big/white/blue stars
                if (type === 'O' || type === 'B' || type === 'N' || size > 3) {
                    brightness = Math.min(255, brightness * 1.3);
                }

                // Apply color tint
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

                    // Add diffraction spike cross for very bright/large exotic stars
                    if (config.rareLayer && size > 4.5 && brightness > 230) {
                        ctx.strokeStyle = `rgba(${r},${g},${b},0.4)`;
                        ctx.lineWidth = 1;
                        ctx.beginPath();
                        // Horizontal
                        ctx.moveTo(bufferX - size * 1.5, bufferY);
                        ctx.lineTo(bufferX + size * 1.5, bufferY);
                        // Vertical
                        ctx.moveTo(bufferX, bufferY - size * 1.5);
                        ctx.lineTo(bufferX, bufferY + size * 1.5);
                        ctx.stroke();
                    }
                }
            }
        }
    }
}

// Buffer-generation removed — worker only generates tiles now.
