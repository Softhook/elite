// Worker: generates a tile using OffscreenCanvas and returns an ImageBitmap
// Deep space dark blue background color
const STARFIELD_BG_COLOR = '#0a0f28';

// ── Module-level star-sprite cache ──────────────────────────────────────────
// Previously this was per-call, causing OffscreenCanvas + radial-gradient
// reallocation for every tile — one of the biggest perf drains in the worker.
// Now sprites are drawn once and reused across all tiles for the lifetime of the
// worker.  Key format: "size|r,g,b"
const _SPRITE_CACHE = new Map();

/**
 * Build a soft radial-gradient star sprite and cache it.
 * @param {number} size  - diameter in px
 * @param {number} r,g,b - colour channels (0-255)
 * @returns {{ canvas: OffscreenCanvas, half: number }}
 */
function _getStarSprite(size, r, g, b) {
    const s = Math.max(1, Math.round(size));
    const key = s + '|' + r + ',' + g + ',' + b;
    const cached = _SPRITE_CACHE.get(key);
    if (cached) return cached;

    const pad = 2;
    const dim = s + pad * 2;
    const c = new OffscreenCanvas(dim, dim);
    const cc = c.getContext('2d', { alpha: true });
    const cx = dim * 0.5;
    const radius = s * 0.5;
    const grad = cc.createRadialGradient(cx, cx, Math.max(0, radius * 0.1), cx, cx, radius);
    grad.addColorStop(0, 'rgba(' + r + ',' + g + ',' + b + ',1)');
    grad.addColorStop(0.6, 'rgba(' + r + ',' + g + ',' + b + ',0.6)');
    grad.addColorStop(1, 'rgba(' + r + ',' + g + ',' + b + ',0)');
    cc.fillStyle = grad;
    cc.beginPath();
    cc.arc(cx, cx, radius, 0, Math.PI * 2);
    cc.fill();

    const entry = { canvas: c, half: dim * 0.5 };
    _SPRITE_CACHE.set(key, entry);
    return entry;
}

// ── Pre-computed colour table ──────────────────────────────────────────────
// Colour-type name → [r,g,b]; avoids string-key lookup and Math.round per star.
const _COLOR_RGB = {
    white:  [255, 255, 255],
    blue:   [200, 220, 255],
    yellow: [255, 250, 200],
    red:    [255, 200, 180]
};

// Pre-flatten for array-indexed lookup: each colour has a numeric id.
const _COLOR_IDS = { white: 0, blue: 1, yellow: 2, red: 3 };
// Flat array: 4 colours × 3 channels = 12 floats
const _COLOR_FLAT = new Float32Array([
    255, 255, 255,   // white
    200, 220, 255,   // blue
    255, 250, 200,   // yellow
    255, 200, 180    // red
]);

// ── Message handler ────────────────────────────────────────────────────────

self.onmessage = function (e) {
    const data = e.data;
    if (!data || !data.cmd) return;

    if (data.cmd === 'generateTile') {
        const tx = data.tx, ty = data.ty, tileSize = data.tileSize, systemIndex = data.systemIndex;
        const bgColor = data.backgroundColor || STARFIELD_BG_COLOR;
        try {
            const off = new OffscreenCanvas(tileSize, tileSize);
            const ctx = off.getContext('2d', { alpha: false });
            // imageSmoothingEnabled is a) the default, and b) only relevant for
            // drawImage scaling — we use fillRect and pre-rendered sprites, so
            // we can skip setting it.
            ctx.fillStyle = bgColor;
            ctx.fillRect(0, 0, tileSize, tileSize);

            drawNebulaToCtx(ctx, tx, ty, tileSize, systemIndex);

            // Layer 0: dense, tiny field stars
            drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, {
                gridSize: 45, maxStarsPerCell: 3,
                sizeRange: [0.5, 1.5], brightnessRange: [80, 160],
                colorIds: [0, 0, 0, 1, 2]   // 3×white, 1×blue, 1×yellow
            });

            // Layer 1: sparse, bright feature stars
            drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, {
                gridSize: 200, maxStarsPerCell: 1,
                sizeRange: [2.0, 4.0], brightnessRange: [180, 255],
                colorIds: [0, 0, 1, 2, 3]   // 2×white, blue, yellow, red
            });

            if (typeof off.transferToImageBitmap === 'function') {
                const bitmap = off.transferToImageBitmap();
                self.postMessage({ key: tx + ',' + ty, bitmap: bitmap, systemIndex: systemIndex }, [bitmap]);
            } else {
                createImageBitmap(off).then(function (bitmap) {
                    self.postMessage({ key: tx + ',' + ty, bitmap: bitmap, systemIndex: systemIndex }, [bitmap]);
                }).catch(function (err) {
                    self.postMessage({ key: tx + ',' + ty, error: String(err), systemIndex: systemIndex });
                });
            }
        } catch (err) {
            self.postMessage({ key: tx + ',' + ty, error: String(err), systemIndex: systemIndex });
        }
    }
};

// ── Nebula rendering ───────────────────────────────────────────────────────

/**
 * Draw procedural nebula clouds on the tile.
 *
 * PERF NOTES (v5):
 * - Moved noise sampling BEFORE the density threshold so we only sample
 *   colour-noise when we actually need it (was always sampling 3 calls/block).
 * - Inlined noise2D calls → avoids closure allocation per tile.
 * - Uses pre-computed scaled block offsets to save a multiply per iteration.
 * - The `persistence` variable was unused → removed.
 */
function drawNebulaToCtx(ctx, tx, ty, tileSize, systemIndex) {
    const SCALE = 0.002;
    const SCALE2 = SCALE * 2;
    const SCALE15 = SCALE * 1.5;
    const BLOCK = 8;            // must divide tileSize evenly (768 / 8 = 96)
    const WORLD_LEFT = tx * tileSize;
    const WORLD_TOP = ty * tileSize;
    const noise2D = SimplexNoise.noise2D;   // direct ref, no wrapper closure

    // Pre-scale the block-step so inner loop avoids worldX * SCALE multiply.
    const dxScaled = BLOCK * SCALE;
    const dyScaled = BLOCK * SCALE2;        // for n2 which uses 2× scale
    const dxScaled15 = BLOCK * SCALE15;

    const offsetX2 = WORLD_LEFT * SCALE2 + 100;
    const offsetY2 = WORLD_TOP * SCALE2 + 100;
    const offsetX15 = WORLD_LEFT * SCALE15 + 500;
    const offsetY15 = WORLD_TOP * SCALE15 + 500;

    for (let by = 0; by < tileSize; by += BLOCK) {
        const wy = WORLD_TOP + by;
        const ny1Base = wy * SCALE;
        const ny2 = wy * SCALE2 + 100;
        const ny15 = wy * SCALE15 + 500;

        for (let bx = 0; bx < tileSize; bx += BLOCK) {
            const wx = WORLD_LEFT + bx;

            // Density: only 2 noise calls; skip 3rd call if below threshold.
            const n1 = noise2D(wx * SCALE, ny1Base);
            const n2 = noise2D(wx * SCALE2 + 100, ny2) * 0.5;
            const density = n1 + n2;

            if (density <= 0.2) continue;   // ← most blocks skip here

            // Alpha: clamp in one expression.
            const alpha = density > 1.2 ? 0.15 : (density - 0.2) * 0.15;

            if (alpha <= 0) continue;

            // Colour noise (only sampled when we actually draw).
            const colorNoise = noise2D(wx * SCALE15 + 500, ny15);

            let r, g, b;
            if (colorNoise < -0.2)      { r = 80;  g = 10; b = 120; }  // purple
            else if (colorNoise > 0.2)  { r = 10;  g = 70; b = 40;  }  // green
            else                        { r = 45;  g = 40; b = 80;  }  // transition

            // Avoid string template — manual concat is slightly faster in workers.
            ctx.fillStyle = 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
            ctx.fillRect(bx, by, BLOCK, BLOCK);
        }
    }
}

// ── Simplex Noise 2D (optimised) ──────────────────────────────────────────
//
// Changes from original:
//  - grad3 is indexed as [gi*3] etc.  We pre-build gradX/gradY arrays so the
//    hot path is a direct indexed read, saving a multiply + addition per corner.
//  - The "corner contribution" computation is factored into a helper that the
//    JS engine can inline more easily than repeated inline blocks.
//  - Constants F2, G2 computed once at module scope.
const _F2 = 0.5 * (Math.sqrt(3.0) - 1.0);
const _G2 = (3.0 - Math.sqrt(3.0)) / 6.0;

// Build perm tables (fixed seed for visual consistency).
const _p = new Uint8Array(256);
for (let i = 0; i < 256; i++) _p[i] = i;
let _seed = 12345;
for (let i = 255; i > 0; i--) {
    _seed = (_seed * 1664525 + 1013904223) >>> 0;
    const j = _seed % (i + 1);
    const t = _p[i]; _p[i] = _p[j]; _p[j] = t;
}
const _perm = new Uint8Array(512);
const _permMod12 = new Uint8Array(512);
for (let i = 0; i < 512; i++) {
    _perm[i] = _p[i & 255];
    _permMod12[i] = _perm[i] % 12;
}

// Pre-indexed gradient components: gradX[gi], gradY[gi] instead of grad3[gi*3+0/1].
const _GRAD3_SRC = [
    1,1,0, -1,1,0, 1,-1,0, -1,-1,0,
    1,0,1, -1,0,1, 1,0,-1, -1,0,-1,
    0,1,1, 0,-1,1, 0,1,-1, 0,-1,-1
];
const _gradX = new Float32Array(12);
const _gradY = new Float32Array(12);
for (let i = 0; i < 12; i++) {
    _gradX[i] = _GRAD3_SRC[i * 3];
    _gradY[i] = _GRAD3_SRC[i * 3 + 1];
}

/**
 * Corner contribution — factored out to reduce code-size and encourage inlining.
 * @returns {number} contribution value
 */
function _corner(t, gi, dx, dy) {
    if (t < 0) return 0;
    t *= t;
    return t * t * (_gradX[gi] * dx + _gradY[gi] * dy);
}

const SimplexNoise = {
    noise2D: function (xin, yin) {
        const s = (xin + yin) * _F2;
        const i = (xin + s) | 0;
        const j = (yin + s) | 0;
        const t = (i + j) * _G2;
        const X0 = i - t;
        const Y0 = j - t;
        const x0 = xin - X0;
        const y0 = yin - Y0;

        let i1, j1;
        if (x0 > y0) { i1 = 1; j1 = 0; }
        else         { i1 = 0; j1 = 1; }

        const x1 = x0 - i1 + _G2;
        const y1 = y0 - j1 + _G2;
        const x2 = x0 - 1.0 + 2.0 * _G2;
        const y2 = y0 - 1.0 + 2.0 * _G2;

        const ii = i & 255;
        const jj = j & 255;
        const gi0 = _permMod12[ii + _perm[jj]];
        const gi1 = _permMod12[ii + i1 + _perm[jj + j1]];
        const gi2 = _permMod12[ii + 1 + _perm[jj + 1]];

        const n0 = _corner(0.5 - x0 * x0 - y0 * y0, gi0, x0, y0);
        const n1 = _corner(0.5 - x1 * x1 - y1 * y1, gi1, x1, y1);
        const n2 = _corner(0.5 - x2 * x2 - y2 * y2, gi2, x2, y2);

        return 70.0 * (n0 + n1 + n2);
    }
};

// ── Star layer rendering (optimised) ──────────────────────────────────────

const _INV32 = 1 / 4294967296;

/**
 * Draw a single star layer onto the tile context.
 *
 * OPTIMISATIONS (v5):
 *  - Sprite cache is module-level (_getStarSprite), not recreated per tile.
 *  - colourIds is now an array of numeric ids mapped through _COLOR_FLAT, so
 *    index-lookup replaces string-key lookup + Math.round per channel.
 *  - Tiny stars (size ≤ 2) are batched by colour: we accumulate draw calls
 *    in a fillStyle bucket and flush at cell/star-count boundaries.
 *  - Math.floor → `|0` in grid-coord computation.
 *  - The LCG `nextFloat` is passed rng explicitly to avoid closure overhead.
 *
 * @param {CanvasRenderingContext2D} ctx
 * @param {number} tx, ty        - tile indices
 * @param {number} tileSize       - px
 * @param {number} systemIndex    - system seed
 * @param {{ gridSize: number, maxStarsPerCell: number,
 *          sizeRange: [number,number], brightnessRange: [number,number],
 *          colorIds: number[] }} config
 */
function drawLayerToCtx(ctx, tx, ty, tileSize, systemIndex, config) {
    const gridSize = config.gridSize;
    const systemSeed = (systemIndex * 1337) >>> 0;
    const worldLeft = tx * tileSize;
    const worldRight = worldLeft + tileSize;
    const worldTop = ty * tileSize;

    const startGX = (worldLeft / gridSize) | 0;
    const endGX = ((worldRight + gridSize - 1) / gridSize) | 0;
    const startGY = (worldTop / gridSize) | 0;
    const endGY = ((worldTop + tileSize + gridSize - 1) / gridSize) | 0;

    const maxStarsPerCell = config.maxStarsPerCell;
    const minSize = config.sizeRange[0];
    const sizeDiff = config.sizeRange[1] - minSize;
    const minBright = config.brightnessRange[0];
    const brightDiff = config.brightnessRange[1] - minBright;
    const colorIds = config.colorIds;

    // Skip-empty probability; tighter grids (smaller gridSize) have higher density.
    const skipChance = gridSize > 100 ? 0.85 : 0.7;

    // ── Tiny-star batching ──────────────────────────────────────────────
    // We accumulate { x, y, w, h } per unique fill-style string, then flush
    // in one pass after all cells are processed.  This avoids hundreds of
    // ctx.fillStyle = … + ctx.fillRect(…) calls that each allocate a string.
    const tinyBatches = Object.create(null);   // "r,g,b" → { x:[], y:[], w:[], h:[] }

    function _flushTinyBatch(key) {
        const b = tinyBatches[key];
        if (!b || b.x.length === 0) return;
        ctx.fillStyle = 'rgb(' + key + ')';
        const xa = b.x, ya = b.y, wa = b.w, ha = b.h;
        for (let i = 0, n = xa.length; i < n; i++) {
            ctx.fillRect(xa[i], ya[i], wa[i], ha[i]);
        }
        // Reset for reuse
        b.x.length = 0;
        b.y.length = 0;
        b.w.length = 0;
        b.h.length = 0;
    }

    // ── Per-cell star generation ────────────────────────────────────────
    for (let gx = startGX; gx <= endGX; gx++) {
        const gxSeed = (gx * 73856093) >>> 0;

        for (let gy = startGY; gy <= endGY; gy++) {
            let rng = (gxSeed ^ (gy * 19349663) ^ (systemSeed * 83492791)) >>> 0;

            function nextFloat() {
                rng = (rng * 1664525 + 1013904223) >>> 0;
                return rng * _INV32;
            }

            if (nextFloat() > skipChance) continue;

            const starCount = ((nextFloat() * maxStarsPerCell) | 0) + 1;

            // Pre-compute cell origin for reuse
            const cellOriginX = gx * gridSize - gridSize * 0.5;
            const cellOriginY = gy * gridSize - gridSize * 0.5;
            const cellSpan = gridSize * 2;  // nextFloat range is 0..1, so span = gridSize*2 for ±gridSize

            for (let si = 0; si < starCount; si++) {
                const worldX = cellOriginX + nextFloat() * cellSpan;
                const worldY = cellOriginY + nextFloat() * cellSpan;
                const bx = worldX - worldLeft;
                const by = worldY - worldTop;

                // Bounds clip with margin
                if (bx < -5 || bx > tileSize + 5 || by < -5 || by > tileSize + 5) continue;

                const size = minSize + nextFloat() * sizeDiff;
                let brightness = minBright + nextFloat() * brightDiff;
                // Boost brightness for dim tiny stars so they're visible
                if (size < 2) brightness = brightness * 1.4;
                if (brightness > 255) brightness = 255;

                // Colour: numeric id → flat-array lookup (no string keys, no Math.round)
                const cid = colorIds[(nextFloat() * colorIds.length) | 0];
                const ci = cid * 3;
                const bf = brightness / 255;
                const r = (_COLOR_FLAT[ci]     * bf + 0.5) | 0;
                const g = (_COLOR_FLAT[ci + 1] * bf + 0.5) | 0;
                const b = (_COLOR_FLAT[ci + 2] * bf + 0.5) | 0;

                if (size <= 2) {
                    // Batch tiny stars by colour string
                    const key = r + ',' + g + ',' + b;
                    let batch = tinyBatches[key];
                    if (!batch) {
                        batch = { x: [], y: [], w: [], h: [] };
                        tinyBatches[key] = batch;
                    }
                    batch.x.push(bx + 0.5);
                    batch.y.push(by + 0.5);
                    const sw = (size + 0.5) | 0;
                    batch.w.push(sw < 1 ? 1 : sw);
                    batch.h.push(sw < 1 ? 1 : sw);
                } else {
                    // Medium/large stars use the module-level sprite cache
                    const sprite = _getStarSprite(size, r, g, b);
                    ctx.drawImage(sprite.canvas, (bx - sprite.half + 0.5) | 0, (by - sprite.half + 0.5) | 0);
                }
            }
        }
    }

    // Flush all accumulated tiny-star batches
    for (const key in tinyBatches) {
        _flushTinyBatch(key);
    }
}
