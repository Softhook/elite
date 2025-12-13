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
