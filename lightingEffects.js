// ****** lightingEffects.js ******
// Dynamic lighting effects for dramatic weapon fire, impacts, and ambient glow.
// Uses additive blending to illuminate ships and the environment near weapon events.

const LightingEffects = (() => {
    // Event type identifiers
    const TYPE_MUZZLE = 0;
    const TYPE_IMPACT = 1;

    // Active world-space lighting events
    const _events = [];
    const MAX_EVENTS = 200;

    // Screen-space hit flash state (player takes damage)
    let _screenFlash = {
        active: false,
        color: [255, 50, 50],
        alpha: 0,
        startTime: 0,
        duration: 300
    };

    function _now() {
        return (typeof millis === 'function') ? millis() : Date.now();
    }

    function _purgeExpired(now = _now()) {
        for (let i = _events.length - 1; i >= 0; i--) {
            if (now - _events[i].startTime >= _events[i].duration) {
                _events.splice(i, 1);
            }
        }
    }

    function _pushEvent(event) {
        const now = _now();
        _purgeExpired(now);
        if (_events.length >= MAX_EVENTS) {
            _events.shift();
        }
        _events.push(event);
    }

    /**
     * Extract a plain [r, g, b] array from either a p5.Color or an array.
     * @param {p5.Color|number[]} c
     * @returns {number[]}
     */
    function _toRGB(c) {
        if (!c) return [255, 200, 100];
        if (Array.isArray(c)) return c;
        // p5.Color stores levels as .levels [r, g, b, a]
        if (c.levels) return [c.levels[0], c.levels[1], c.levels[2]];
        return [255, 200, 100];
    }

    /**
     * Add a muzzle flash at a world position. Short-lived bright burst.
     * @param {number} x  - World X
     * @param {number} y  - World Y
     * @param {p5.Color|number[]} colorIn - Weapon colour
     * @param {number} [size=22] - Glow radius in world units
     */
    function addMuzzleFlash(x, y, colorIn, size = 22) {
        if (!isFinite(x) || !isFinite(y)) return;
        _pushEvent({
            type: TYPE_MUZZLE,
            x, y,
            color: _toRGB(colorIn),
            size,
            startTime: _now(),
            duration: 85
        });
    }

    /**
     * Add an impact flash at a world position. Slightly slower fade than muzzle flash.
     * @param {number} x  - World X
     * @param {number} y  - World Y
     * @param {p5.Color|number[]} colorIn - Weapon or explosion colour
     * @param {number} [size=40] - Glow radius in world units
     * @param {?number} [impactAngle=null] - Optional incoming impact direction in radians
     */
    function addImpactFlash(x, y, colorIn, size = 40, impactAngle = null) {
        if (!isFinite(x) || !isFinite(y)) return;
        const impactDir = Number.isFinite(impactAngle) ? impactAngle : Math.random() * Math.PI * 2;
        const sparks = [];
        const debris = [];
        for (let i = 0; i < 6; i++) {
            sparks.push({
                angle: impactDir + (Math.random() - 0.5) * 0.9,
                speed: size * (0.18 + Math.random() * 0.32),
                len: 2 + Math.random() * 4
            });
        }
        for (let i = 0; i < 4; i++) {
            debris.push({
                angle: impactDir + (Math.random() - 0.5) * 1.2,
                speed: size * (0.1 + Math.random() * 0.24),
                radius: 0.8 + Math.random() * 1.6
            });
        }
        _pushEvent({
            type: TYPE_IMPACT,
            x, y,
            color: _toRGB(colorIn),
            size,
            impactDir,
            sparks,
            debris,
            startTime: _now(),
            duration: 260
        });
    }

    /**
     * Draw a layered additive beam glow.
     * @param {number} startX
     * @param {number} startY
     * @param {number} endX
     * @param {number} endY
     * @param {p5.Color|number[]} colorIn
     * @param {Object} [cfg]
     */
    function drawBeamGlow(startX, startY, endX, endY, colorIn, cfg = {}) {
        const rgb = _toRGB(colorIn);
        const br = rgb[0], bg = rgb[1], bb = rgb[2];
        const baseWidth = cfg.baseWidth ?? 2;
        const counterScale = cfg.counterScale ?? 1;
        const alphaScale = cfg.alphaScale ?? 1;
        const outerAlpha = (cfg.outerAlpha ?? 40) * alphaScale;
        const midAlpha = (cfg.midAlpha ?? 90) * alphaScale;
        const coreAlpha = (cfg.coreAlpha ?? 220) * alphaScale;
        const whiteAlpha = (cfg.whiteAlpha ?? 160) * alphaScale;

        push();
        blendMode(ADD);
        noFill();

        stroke(br, bg, bb, outerAlpha);
        strokeWeight(baseWidth * 5 * counterScale);
        line(startX, startY, endX, endY);

        stroke(br, bg, bb, midAlpha);
        strokeWeight(baseWidth * 2.5 * counterScale);
        line(startX, startY, endX, endY);

        stroke(br, bg, bb, coreAlpha);
        strokeWeight(baseWidth * counterScale);
        line(startX, startY, endX, endY);

        stroke(255, 255, 255, whiteAlpha);
        strokeWeight(Math.max(1, baseWidth * 0.4 * counterScale));
        line(startX, startY, endX, endY);

        pop();
    }

    /**
     * Trigger a brief full-screen colour wash (screen space) when the player is hit.
     * @param {number[]} [colorIn=[255,50,50]] - Flash colour
     * @param {number}   [maxAlpha=70]         - Peak opacity (0-255)
     */
    function addScreenFlash(colorIn, maxAlpha = 70) {
        _screenFlash.active    = true;
        _screenFlash.color     = _toRGB(colorIn) || [255, 50, 50];
        _screenFlash.alpha     = maxAlpha;
        _screenFlash.startTime = _now();
        _screenFlash.duration  = 320;
    }

    /**
     * Draw a radial glow blob using concentric filled ellipses.
     * Caller must have set blendMode(ADD) and noStroke() beforehand.
     * @param {number}   cx      - Center X (world)
     * @param {number}   cy      - Center Y (world)
     * @param {number}   innerR  - Bright-core radius
     * @param {number}   outerR  - Outer soft-glow radius
     * @param {number[]} rgb     - [r, g, b]
     * @param {number}   peakA   - Peak alpha (0-255) at center
     */
    function _drawGlow(cx, cy, innerR, outerR, rgb, peakA) {
        const steps = 5;
        const r = rgb[0], g = rgb[1], b = rgb[2];
        for (let i = 0; i <= steps; i++) {
            const t    = i / steps;           // 0 (outer edge) → 1 (center)
            const rad  = innerR + (outerR - innerR) * (1 - t);
            const alpha = peakA * t * t;      // Quadratic – bright only near core
            fill(r, g, b, alpha);
            ellipse(cx, cy, rad * 2, rad * 2);
        }
    }

    /**
     * Draw all active world-space lighting events.
     * Must be called inside the world-space push/translate block of starSystem.draw().
     */
    function draw() {
        const now = _now();
        _purgeExpired(now);

        if (_events.length === 0) return;

        push();
        blendMode(ADD);
        noStroke();

        for (let i = 0, len = _events.length; i < len; i++) {
            const ev   = _events[i];
            const t    = (now - ev.startTime) / ev.duration;  // 0 → 1
            const invT = 1 - t;

            if (ev.type === TYPE_MUZZLE) {
                // Quick bright flash that shrinks and fades
                const alpha  = 165 * invT * invT;
                const outerR = ev.size * (1 + t * 0.25);   // Slight expansion
                const innerR = outerR * 0.2;

                // White hot core
                fill(255, 255, 255, alpha * 0.7);
                ellipse(ev.x, ev.y, innerR * 2, innerR * 2);

                // Coloured halo
                _drawGlow(ev.x, ev.y, innerR, outerR, ev.color, alpha);

            } else if (ev.type === TYPE_IMPACT) {
                // Quick ramp-up then slower fade with expanding ring
                let alpha;
                if (t < 0.15) {
                    alpha = 255 * (t / 0.15);          // Fast ramp
                } else {
                    alpha = 255 * (1 - (t - 0.15) / 0.85); // Gentle fade
                }
                if (alpha < 0) alpha = 0;

                const outerR = ev.size * (0.6 + t * 1.0);  // Expands as it fades
                const innerR = outerR * 0.2;

                // White-hot centre
                fill(255, 255, 255, alpha * 0.7);
                ellipse(ev.x, ev.y, innerR * 2, innerR * 2);

                // Coloured corona
                _drawGlow(ev.x, ev.y, innerR * 0.5, outerR, ev.color, alpha * 0.85);

                // Tiny shock ring
                noFill();
                stroke(ev.color[0], ev.color[1], ev.color[2], alpha * 0.7);
                strokeWeight(1.4);
                const ringR = ev.size * (0.2 + t * 0.75);
                ellipse(ev.x, ev.y, ringR * 2, ringR * 2);
                noStroke();

                // Directional sparks
                const sparkAlpha = alpha * invT;
                stroke(255, 220, 150, sparkAlpha);
                for (let s = 0; s < ev.sparks.length; s++) {
                    const spark = ev.sparks[s];
                    const dist = spark.speed * t;
                    const sx = ev.x + Math.cos(spark.angle) * dist;
                    const sy = ev.y + Math.sin(spark.angle) * dist;
                    const ex = sx + Math.cos(spark.angle) * spark.len;
                    const ey = sy + Math.sin(spark.angle) * spark.len;
                    strokeWeight(0.8 + invT * 1.5);
                    line(sx, sy, ex, ey);
                }

                // Directional debris
                noStroke();
                for (let d = 0; d < ev.debris.length; d++) {
                    const piece = ev.debris[d];
                    const dd = piece.speed * t;
                    const dx = ev.x + Math.cos(piece.angle) * dd;
                    const dy = ev.y + Math.sin(piece.angle) * dd;
                    fill(255, 200, 120, alpha * 0.45);
                    ellipse(dx, dy, piece.radius * 2, piece.radius * 2);
                }

                // Emissive scorch fade
                const scorchAlpha = 90 * invT * invT;
                if (scorchAlpha > 1) {
                    fill(ev.color[0], ev.color[1], ev.color[2], scorchAlpha);
                    ellipse(ev.x, ev.y, ev.size * 0.45, ev.size * 0.45);
                    fill(0, 0, 0, scorchAlpha * 0.35);
                    ellipse(ev.x, ev.y, ev.size * 0.28, ev.size * 0.28);
                }
            }
        }

        pop();
    }

    /**
     * Draw screen-space effects (damage flash overlay).
     * Call in screen space (outside any world translate block), after renderGameState().
     */
    function drawScreenEffects() {
        if (!_screenFlash.active) return;

        const elapsed = _now() - _screenFlash.startTime;
        if (elapsed >= _screenFlash.duration) {
            _screenFlash.active = false;
            return;
        }

        const t     = elapsed / _screenFlash.duration;
        const alpha = _screenFlash.alpha * (1 - t * t);   // Quadratic ease-out

        push();
        blendMode(ADD);
        noStroke();
        fill(_screenFlash.color[0], _screenFlash.color[1], _screenFlash.color[2], alpha);
        rect(0, 0, width, height);
        pop();
    }

    // Public API
    return { addMuzzleFlash, addImpactFlash, addScreenFlash, draw, drawScreenEffects, drawBeamGlow };
})();
