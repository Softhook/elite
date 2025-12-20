// ****** uiMinimap.js ******
// Minimap rendering and interaction for in-flight gameplay.
// This file must be loaded BEFORE uiManager.js

/**
 * UIMinimap - Handles all minimap rendering and interaction including
 * enemy tracking, hazard overlays, target indicators, and zoom control.
 */
class UIMinimap {
    constructor() {
        // Size configuration
        this.defaultSize = 200;
        this.expandedSize = 360;
        this.size = this.expandedSize; // Always use expanded size
        this.margin = 0;

        // Position (calculated during draw)
        this.x = 0;
        this.y = 0;
        this.scale = 1;

        // Zoom configuration
        this.worldViewRanges = [3000, 5000, 10000, 20000, 35000, 50000];
        this.zoomIndex = 2; // Start at widest view
        this.worldViewRange = this.worldViewRanges[this.zoomIndex];

        // Hazards buffer for performance
        this.hazardsBuffer = null;
        this._hazardsBufferSize = 0;
        // Track player position when buffer was last generated for smooth offset
        this._lastHazardsPlayerX = 0;
        this._lastHazardsPlayerY = 0;
        // Track scale to regenerate buffer on zoom
        this._lastHazardsScale = 0;

        // Minimap color mapping by AI role (using centralized color constants)
        this.roleColors = {};
        if (typeof AI_ROLE !== 'undefined' && typeof ROLE_COLORS !== 'undefined') {
            this.roleColors[AI_ROLE.PIRATE] = ROLE_COLORS.PIRATE;
            this.roleColors[AI_ROLE.POLICE] = ROLE_COLORS.POLICE;
            this.roleColors[AI_ROLE.HAULER] = ROLE_COLORS.HAULER;
            this.roleColors[AI_ROLE.TRANSPORT] = ROLE_COLORS.TRANSPORT;
            this.roleColors[AI_ROLE.MINER] = ROLE_COLORS.MINER;
            this.roleColors[AI_ROLE.ALIEN] = ROLE_COLORS.ALIEN;
            this.roleColors[AI_ROLE.BOUNTY_HUNTER] = ROLE_COLORS.BOUNTY_HUNTER;
            this.roleColors[AI_ROLE.GUARD] = ROLE_COLORS.GUARD;
            this.roleColors[AI_ROLE.COMBAT] = ROLE_COLORS.COMBAT;
        }

        // Active kill indicators
        this.killIndicators = [];
    }

    /**
     * Gets the current minimap render area.
     * @returns {Object} {x, y, size, margin}
     */
    getArea() {
        return {
            x: width - this.size - this.margin,
            y: height - this.size - this.margin,
            size: this.size,
            margin: this.margin
        };
    }

    /**
     * Checks if a click is within the minimap area.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @returns {boolean}
     */
    isClickInMinimap(mx, my) {
        const area = this.getArea();
        return mx >= area.x && mx <= area.x + area.size &&
            my >= area.y && my <= area.y + area.size;
    }

    /**
     * Adjusts the minimap zoom level and clamps at min/max (no cycling).
     * @param {number} direction - 1 for zoom out (increase index), -1 for zoom in (decrease index)
     */
    cycleZoom(direction) {
        const delta = direction > 0 ? 1 : -1;
        const maxIndex = this.worldViewRanges.length - 1;
        const newIndex = Math.max(0, Math.min(maxIndex, this.zoomIndex + delta));

        // If already at limit, do nothing
        if (newIndex === this.zoomIndex) return;

        this.zoomIndex = newIndex;
        this.worldViewRange = this.worldViewRanges[this.zoomIndex];
        this.scale = this.size / this.worldViewRange;
        if (typeof soundManager !== 'undefined' && soundManager.playSound) soundManager.playSound('click');
    }

    /**
     * Draws the minimap.
     * @param {Player} player - The player object
     * @param {StarSystem} system - The current star system
     * @param {UIManager} [uiManager] - Optional UIManager reference for state sync
     */
    draw(player, system, uiManager = null) {
        if (!player?.pos || !system) return;

        // Update size and scale
        this.size = this.expandedSize;
        this.worldViewRange = this.worldViewRanges[this.zoomIndex];

        // Calculate position and scale
        this.x = width - this.size - this.margin;
        this.y = height - this.size - this.margin;
        this.scale = this.size / this.worldViewRange;

        // Sync state back to UIManager for backward compatibility
        if (uiManager) {
            uiManager.minimapSize = this.size;
            uiManager.minimapX = this.x;
            uiManager.minimapY = this.y;
            uiManager.minimapScale = this.scale;
            uiManager.minimapWorldViewRange = this.worldViewRange;
            uiManager.minimapZoomIndex = this.zoomIndex;
        }

        if (isNaN(this.scale) || this.scale <= 0 || !isFinite(this.scale)) {
            this.scale = 0.01;
        }

        const mapCenterX = this.x + this.size / 2;
        const mapCenterY = this.y + this.size / 2;
        const mapLeft = this.x;
        const mapRight = this.x + this.size;
        const mapTop = this.y;
        const mapBottom = this.y + this.size;

        push();

        // Draw background/border - use star field background color if available
        try {
            // Default starfield fallback (matches starfield.js fallback)
            let bgCol = [10, 15, 40];
            if (typeof STARFIELD_CONFIG !== 'undefined' && STARFIELD_CONFIG.BACKGROUND_COLOR) {
                const bg = STARFIELD_CONFIG.BACKGROUND_COLOR;
                bgCol = [
                    (typeof bg.r === 'number') ? bg.r : 0,
                    (typeof bg.g === 'number') ? bg.g : 0,
                    (typeof bg.b === 'number') ? bg.b : 0
                ];
            }

            // Use semi-transparent fill to preserve minimap overlay look
            fill(bgCol[0], bgCol[1], bgCol[2], 180);
            stroke(0, 200, 0, 200);
            strokeWeight(1);
            rect(this.x, this.y, this.size, this.size);
        } catch (e) {
            console.error("Error drawing minimap rect:", e);
            pop();
            return;
        }

        const isFullyWithinBounds = (x, y, halfWidth, halfHeight) => {
            return (
                x - halfWidth >= mapLeft &&
                x + halfWidth <= mapRight &&
                y - halfHeight >= mapTop &&
                y + halfHeight <= mapBottom
            );
        };

        try {
            // Draw hazards buffer
            this._drawHazardsBuffer(player, system, mapCenterX, mapCenterY);

            // Draw event markers from HUD (so mission/event markers appear on minimap)
            this._drawEventMarkersFromHUD(player, system, uiManager, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom);

            // Draw station
            this._drawStation(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds);

            // Draw planets
            this._drawPlanets(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom);

            // Draw enemies
            this._drawEnemies(player, system, mapCenterX, mapCenterY, isFullyWithinBounds);

            // Draw space objects
            this._drawSpaceObjects(player, system, mapCenterX, mapCenterY, isFullyWithinBounds);

            // Draw comets (very visible long red lines pointing towards player)
            this._drawComets(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom);

            // Draw floating cargo
            this._drawCargo(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom);

            // Draw locked target indicator
            this._drawTargetIndicator(player, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds);

            // Draw autopilot lock marker (station / jumpzone / planet)
            this._drawAutopilotMarker(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds);

            // Draw player (always at center)
            push();
            fill(255);
            noStroke();
            ellipse(mapCenterX, mapCenterY, 5, 5);
            pop();

            // Draw detection radius
            this._drawDetectionRadius(system, mapCenterX, mapCenterY);

            // Draw jump zone
            this._drawJumpZone(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom);

            // Draw kill indicators
            // Draw kill indicators
            this._drawKillIndicators(player, mapCenterX, mapCenterY);

        } catch (e) {
            console.error("Error during minimap element drawing:", e);
        } finally {
            pop();
        }
    }

    /**
     * Registers a new kill indicator at the given world position.
     * @param {p5.Vector} pos - World position of the kill
     * @param {Array} [colorArr] - Optional RGB color array, defaults to red
     */
    addKillIndicator(pos, colorArr = null) {
        if (!pos) return;
        this.killIndicators.push({
            pos: pos.copy(),
            size: 0,
            alpha: 255,
            maxLife: 60, // 1 second at 60fps
            maxSize: 30,  // Max radius on minimap
            color: colorArr || [255, 80, 80] // Default to red-ish
        });
    }

    /**
     * Draws and updates active kill indicators (expanding rings).
     * @private
     */
    _drawKillIndicators(player, mapCenterX, mapCenterY) {
        if (!player || !player.pos) return;

        for (let i = this.killIndicators.length - 1; i >= 0; i--) {
            const ind = this.killIndicators[i];

            // Update state
            ind.size += 0.5; // Expand speed
            ind.alpha = map(ind.size, 0, ind.maxSize, 255, 0);

            // Remove if expired or too big
            if (ind.alpha <= 0 || ind.size >= ind.maxSize) {
                // O(1) swap-and-pop removal (order doesn't matter for indicators)
                const lastIdx = this.killIndicators.length - 1;
                if (i !== lastIdx) this.killIndicators[i] = this.killIndicators[lastIdx];
                this.killIndicators.pop();
                continue;
            }

            // Calculate position on minimap
            const relX = ind.pos.x - player.pos.x;
            const relY = ind.pos.y - player.pos.y;
            const mapX = mapCenterX + relX * this.scale;
            const mapY = mapCenterY + relY * this.scale;

            // Draw
            // Check if roughly in bounds to avoid drawing far off-screen
            // We use a loose check since it's just a visual effect
            if (Math.abs(mapX - mapCenterX) < this.size && Math.abs(mapY - mapCenterY) < this.size) {
                push();
                noFill();
                // Use the stored color for this kill indicator
                const c = ind.color || [255, 80, 80];
                stroke(c[0], c[1], c[2], ind.alpha);
                strokeWeight(1.5);
                ellipse(mapX, mapY, ind.size * 2, ind.size * 2);
                pop();
            }
        }
        // End of _drawKillIndicators
    }

    _drawHazardsBuffer(player, system, mapCenterX, mapCenterY) {
        // Only regenerate buffer every 15 frames - hazards move slowly
        // Detect scale change
        const scaleChanged = Math.abs(this.scale - (this._lastHazardsScale || 0)) > 0.000001;

        // Only regenerate buffer every 250ms (was 15 frames) - hazards move slowly
        // BUT force regenerate if scale changed
        const now = millis();
        const updateInterval = 250;

        const shouldRegenerate = !this._lastHazardsTime ||
            (now - this._lastHazardsTime) >= updateInterval ||
            scaleChanged;

        if (!this.hazardsBuffer || this._hazardsBufferSize !== this.size) {
            this.hazardsBuffer = createGraphics(this.size, this.size);
            this._hazardsBufferSize = this.size;
            this._lastHazardsTime = 0; // Force redraw on size change
            this._lastHazardsPlayerX = player.pos.x;
            this._lastHazardsPlayerY = player.pos.y;
        }

        // Draw cached buffer with offset based on player movement since last generation
        // This prevents jerky updates by smoothly shifting the cached buffer
        if (!shouldRegenerate) {
            const deltaX = (this._lastHazardsPlayerX - player.pos.x) * this.scale;
            const deltaY = (this._lastHazardsPlayerY - player.pos.y) * this.scale;
            image(this.hazardsBuffer, this.x + deltaX, this.y + deltaY);
            return;
        }

        this._lastHazardsTime = now;
        // Store player position at time of buffer generation
        this._lastHazardsPlayerX = player.pos.x;
        this._lastHazardsPlayerY = player.pos.y;
        this._lastHazardsScale = this.scale;

        const hbuf = this.hazardsBuffer;
        hbuf.clear();
        hbuf.push();
        hbuf.colorMode(RGB, 255);
        hbuf.noFill();
        hbuf.noStroke();

        const bufCenter = this.size / 2;

        const nebulaStrokeColor = (neb) => {
            const t = (neb?.type || '').toString().toLowerCase().trim();
            switch (t) {
                case 'ion': return [100, 150, 255];
                case 'radiation': return [150, 255, 100];
                case 'emp': return [180, 100, 255];
                default: return [150, 150, 255];
            }
        };

        const stormStrokeColor = (st) => {
            const t = (st?.type || '').toString().toLowerCase().trim();
            switch (t) {
                case 'electromagnetic': return [80, 100, 255];
                case 'radiation': return [100, 255, 50];
                case 'gravitational': return [255, 200, 50];
                default: return [100, 150, 255];
            }
        };

        // Draw nebulae
        if (Array.isArray(system.nebulae)) {
            for (let i = 0; i < system.nebulae.length; i++) {
                const neb = system.nebulae[i];
                if (!neb || !neb.pos || !neb.radius) continue;
                const relX = neb.pos.x - player.pos.x;
                const relY = neb.pos.y - player.pos.y;
                const bx = bufCenter + relX * this.scale;
                const by = bufCenter + relY * this.scale;
                const br = Math.max(1, neb.radius * this.scale);
                const col = nebulaStrokeColor(neb);

                hbuf.push();
                hbuf.noFill();
                hbuf.stroke(col[0], col[1], col[2], 150);
                hbuf.strokeWeight(1);
                hbuf.ellipse(bx, by, br * 2, br * 2);
                hbuf.pop();
            }
        }

        // Draw storms
        if (Array.isArray(system.cosmicStorms)) {
            for (let i = 0; i < system.cosmicStorms.length; i++) {
                const st = system.cosmicStorms[i];
                if (!st || !st.pos || !st.radius) continue;
                const relX = st.pos.x - player.pos.x;
                const relY = st.pos.y - player.pos.y;
                const bx = bufCenter + relX * this.scale;
                const by = bufCenter + relY * this.scale;
                const br = Math.max(1, st.radius * this.scale);
                const col = stormStrokeColor(st);

                hbuf.push();
                hbuf.noFill();
                hbuf.stroke(col[0], col[1], col[2], 180);
                hbuf.strokeWeight(1);
                hbuf.ellipse(bx, by, br * 2, br * 2);
                hbuf.pop();
            }
        }

        hbuf.pop();
        image(hbuf, this.x, this.y);
    }

    _drawStation(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds) {
        if (!system.station?.pos) return;

        const relX = system.station.pos.x - player.pos.x;
        const relY = system.station.pos.y - player.pos.y;
        const mapX = mapCenterX + relX * this.scale;
        const mapY = mapCenterY + relY * this.scale;

        // Draw station to scale using its actual size property (slightly smaller for better fit)
        const stationSize = system.station.size || 1000;
        const stationRadius = (stationSize * 0.45) * this.scale; // Reduced from 0.5 to make it smaller
        const iconHalfSize = Math.max(3, stationRadius); // At least 3 pixels for visibility

        // Check if station is fully outside the minimap bounds
        const fullyOutside = (
            mapX + iconHalfSize < mapLeft ||
            mapX - iconHalfSize > mapRight ||
            mapY + iconHalfSize < mapTop ||
            mapY - iconHalfSize > mapBottom
        );

        if (fullyOutside) {
            // Off-screen: draw small indicator at edge
            push();
            const inset = 4;
            const drawX = constrain(mapX, mapLeft + inset, mapRight - inset);
            const drawY = constrain(mapY, mapTop + inset, mapBottom - inset);

            noStroke();
            fill(0, 200, 255); // Light blue for consistency
            // Small circle for off-screen indicator
            ellipse(drawX, drawY, 6, 6);
            pop();
        } else {
            // On-screen or partially on-screen: use clipping like jump zone
            const ctx = drawingContext;
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.clip();

            push();
            translate(mapX, mapY);
            // Rotate at same speed as station
            if (system.station.angle !== undefined) {
                rotate(system.station.angle);
            }

            // Draw circle outline
            noFill();
            stroke(0, 200, 255);
            strokeWeight(1.5);
            const diameter = iconHalfSize * 2;
            ellipse(0, 0, diameter, diameter);
            // Draw cardinal cross (+ shape) to match station's 4 arms
            // Station arms are at 0°, 90°, 180°, 270° (cardinal directions)
            const crossSize = iconHalfSize; // Full radius for cardinal cross
            stroke(0, 200, 255);
            strokeWeight(1);
            // Vertical and horizontal lines aligned with station arms
            line(0, -crossSize, 0, crossSize);  // Vertical
            line(-crossSize, 0, crossSize, 0);  // Horizontal

            // Add a small filled center dot for visibility
            noStroke();
            fill(0, 200, 255);
            ellipse(0, 0, 3, 3);
            pop();

            ctx.restore();
        }
    }

    _drawPlanets(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom) {
        const planets = system.planets || [];
        for (let i = 0; i < planets.length; i++) {
            const planet = planets[i];
            if (!planet?.pos) continue;

            const relX = planet.pos.x - player.pos.x;
            const relY = planet.pos.y - player.pos.y;
            const mapX = mapCenterX + relX * this.scale;
            const mapY = mapCenterY + relY * this.scale;
            const worldRadius = planet.radius || planet.size * 0.5 || 0;
            const mapRadius = max(1, worldRadius * this.scale);

            if (mapX + mapRadius < mapLeft || mapX - mapRadius > mapRight ||
                mapY + mapRadius < mapTop || mapY - mapRadius > mapBottom) continue;

            push();
            const ctx = drawingContext;
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.clip();

            noStroke();
            let planetColor = planet.baseColor;
            if (planet.palette && planet.palette.length > 1) {
                planetColor = planet.palette[1];
            }
            if (planetColor) {
                const r = red(planetColor);
                const g = green(planetColor);
                const b = blue(planetColor);
                fill(r, g, b, 200);
            } else {
                fill(150, 100, 50);
            }
            ellipse(mapX, mapY, mapRadius * 2, mapRadius * 2);

            ctx.restore();
            pop();
        }
    }

    _drawEnemies(player, system, mapCenterX, mapCenterY, isFullyWithinBounds) {
        const enemies = system.enemies || [];
        for (let i = 0; i < enemies.length; i++) {
            const enemy = enemies[i];
            if (!enemy?.pos || enemy.isDestroyed()) continue;

            const relX = enemy.pos.x - player.pos.x;
            const relY = enemy.pos.y - player.pos.y;
            const mapX = mapCenterX + relX * this.scale;
            const mapY = mapCenterY + relY * this.scale;
            const iconHalfExtent = 3;

            if (isFullyWithinBounds(mapX, mapY, iconHalfExtent, iconHalfExtent)) {
                // Prefer faction-based coloring when available (IMPERIAL / SEPARATIST / MILITARY)
                let colArr = null;
                if (typeof FACTION_COLORS !== 'undefined') {
                    if (enemy.faction === 'IMPERIAL') {
                        colArr = FACTION_COLORS.IMPERIAL;
                    } else if (enemy.faction === 'SEPARATIST') {
                        colArr = FACTION_COLORS.SEPARATIST;
                    } else if (enemy.faction === 'MILITARY') {
                        colArr = FACTION_COLORS.MILITARY;
                    }
                }
                if (!colArr) {
                    const roleKey = enemy.role || enemy.aiRole || (enemy.shipTypeName && SHIP_DEFINITIONS[enemy.shipTypeName]?.aiRoles?.[0]);
                    colArr = this.roleColors[roleKey] || [255, 0, 0];
                }

                push();
                noStroke();
                translate(mapX, mapY);
                rotate((typeof enemy.angle === 'number' ? enemy.angle : 0) + PI / 2);
                fill(...colArr);
                triangle(0, -iconHalfExtent, -iconHalfExtent * 0.8, iconHalfExtent * 0.8, iconHalfExtent * 0.8, iconHalfExtent * 0.8);
                pop();
            }
        }
    }

    _drawSpaceObjects(player, system, mapCenterX, mapCenterY, isFullyWithinBounds) {
        const spaceObjects = system.spaceObjects || [];
        for (let i = 0; i < spaceObjects.length; i++) {
            const obj = spaceObjects[i];
            if (!obj?.pos) continue;

            const relX = obj.pos.x - player.pos.x;
            const relY = obj.pos.y - player.pos.y;
            const mapX = mapCenterX + relX * this.scale;
            const mapY = mapCenterY + relY * this.scale;

            if (isFullyWithinBounds(mapX, mapY, 2, 2)) {
                noStroke();
                fill(255);
                ellipse(mapX, mapY, 2, 2);
            }
        }
    }

    _drawComets(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom) {
        const asteroids = system.asteroids || [];
        if (!asteroids || asteroids.length === 0) return;

        // Clip to minimap area so long trajectory lines don't draw over UI
        const ctx = drawingContext;
        ctx.save();
        ctx.beginPath();
        ctx.rect(this.x, this.y, this.size, this.size);
        ctx.clip();

        for (let i = 0; i < asteroids.length; i++) {
            const a = asteroids[i];
            if (!a || !a.pos || !a.isComet || (typeof a.isDestroyed === 'function' && a.isDestroyed())) continue;

            const relX = a.pos.x - player.pos.x;
            const relY = a.pos.y - player.pos.y;
            const mapStartX = mapCenterX + relX * this.scale;
            const mapStartY = mapCenterY + relY * this.scale;

            const vx = (a.vel && typeof a.vel.x === 'number') ? a.vel.x : 0;
            const vy = (a.vel && typeof a.vel.y === 'number') ? a.vel.y : 0;
            const speed = Math.sqrt(vx * vx + vy * vy);

            // Compute a simple target point along the velocity vector
            const vnx = speed > 0 ? vx / speed : 1;
            const vny = speed > 0 ? vy / speed : 0;
            const trajWorldLen = 8000; // draw a reasonably long segment
            const endWorldX = a.pos.x + vnx * trajWorldLen;
            const endWorldY = a.pos.y + vny * trajWorldLen;
            const mapEndX = mapCenterX + (endWorldX - player.pos.x) * this.scale;
            const mapEndY = mapCenterY + (endWorldY - player.pos.y) * this.scale;

            // Use unclamped coordinates and rely on the clip region so the
            // trajectory continues off-screen naturally instead of snapping.
            const sx = mapStartX;
            const sy = mapStartY;
            const ex = mapEndX;
            const ey = mapEndY;

            // Guard against invalid numbers
            if (![sx, sy, ex, ey].every(v => Number.isFinite(v))) continue;

            push();
            stroke(220, 40, 40, 230);
            strokeWeight(1.5);
            line(sx, sy, ex, ey);

            noStroke();
            fill(255, 80, 80, 255);
            // Small dot at the comet head (start)
            ellipse(sx, sy, 4, 4);
            pop();
        }

        ctx.restore();
    }

    _drawCargo(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom) {
        const cargos = Array.isArray(system.cargo) ? system.cargo : [];
        for (let i = 0; i < cargos.length; i++) {
            const c = cargos[i];
            if (!c || !c.pos || c.collected) continue;

            const relX = c.pos.x - player.pos.x;
            const relY = c.pos.y - player.pos.y;
            const mapX = mapCenterX + relX * this.scale;
            const mapY = mapCenterY + relY * this.scale;

            if (mapX < mapLeft || mapX > mapRight || mapY < mapTop || mapY > mapBottom) continue;

            push();
            noStroke();
            let col = c.color || [220, 200, 80];
            if (Array.isArray(col)) fill(col[0], col[1], col[2], 220);
            else fill(col);
            const size = 2;
            rect(mapX - size / 2, mapY - size / 2, size, size, 1);
            pop();
        }
    }

    _drawTargetIndicator(player, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds) {
        if (!player.target || player.target.isDestroyed?.() || !player.target.pos) return;

        const tgt = player.target;
        const tRelX = tgt.pos.x - player.pos.x;
        const tRelY = tgt.pos.y - player.pos.y;
        let tMapX = mapCenterX + tRelX * this.scale;
        let tMapY = mapCenterY + tRelY * this.scale;

        const reticleSize = 4;

        if (isFullyWithinBounds(tMapX, tMapY, reticleSize, reticleSize)) {
            stroke(255);
            strokeWeight(1);
            noFill();
            line(tMapX - reticleSize, tMapY, tMapX + reticleSize, tMapY);
            line(tMapX, tMapY - reticleSize, tMapX, tMapY + reticleSize);
        } else {
            const inset = reticleSize + 1;
            const cX = constrain(tMapX, mapLeft + inset, mapRight - inset);
            const cY = constrain(tMapY, mapTop + inset, mapBottom - inset);
            stroke(255);
            strokeWeight(1);
            noFill();
            line(cX - reticleSize, cY, cX + reticleSize, cY);
            line(cX, cY - reticleSize, cX, cY + reticleSize);
        }
    }

    _drawDetectionRadius(system, mapCenterX, mapCenterY) {
        try {
            const spawnRadius = (typeof system._getDiagonalDistance === 'function')
                ? (system._getDiagonalDistance() + 400)
                : ((typeof system.despawnRadius === 'number' && system.despawnRadius > 0) ? system.despawnRadius : 5000);

            if (spawnRadius > 0) {
                const mapRadius = max(1, spawnRadius * this.scale);
                const maxVisibleRadius = this.size / 2 - 4;

                if (mapRadius <= maxVisibleRadius) {
                    const ctx = drawingContext;
                    ctx.save();
                    ctx.beginPath();
                    ctx.rect(this.x, this.y, this.size, this.size);
                    ctx.clip();

                    noFill();
                    stroke(255, 255, 255, 50);
                    strokeWeight(0.5);
                    const dashCount = 30;
                    const dashFrac = 0.55;
                    for (let i = 0; i < dashCount; i++) {
                        const a1 = (TWO_PI / dashCount) * i;
                        const a2 = a1 + (TWO_PI / dashCount) * dashFrac;
                        arc(mapCenterX, mapCenterY, mapRadius * 2, mapRadius * 2, a1, a2);
                    }

                    ctx.restore();
                } else {
                    const halfMap = maxVisibleRadius;
                    noFill();
                    stroke(255, 255, 255, 128);
                    strokeWeight(1);
                    const dashCount = 48;
                    const dashFrac = 0.55;
                    for (let i = 0; i < dashCount; i++) {
                        const a1 = (TWO_PI / dashCount) * i;
                        const a2 = a1 + (TWO_PI / dashCount) * dashFrac;
                        arc(mapCenterX, mapCenterY, halfMap * 2, halfMap * 2, a1, a2);
                    }
                }
            }
        } catch (e) {
            // Ignore drawing errors
        }
    }

    _drawJumpZone(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom) {
        if (!system.jumpZoneCenter || system.jumpZoneRadius <= 0) return;

        const relX = system.jumpZoneCenter.x - player.pos.x;
        const relY = system.jumpZoneCenter.y - player.pos.y;
        const mapX = mapCenterX + relX * this.scale;
        const mapY = mapCenterY + relY * this.scale;
        const mapRadius = max(1, system.jumpZoneRadius * this.scale);

        const fullyOutside = (
            mapX + mapRadius < mapLeft ||
            mapX - mapRadius > mapRight ||
            mapY + mapRadius < mapTop ||
            mapY - mapRadius > mapBottom
        );

        if (!fullyOutside) {
            const ctx = drawingContext;
            ctx.save();
            ctx.beginPath();
            ctx.rect(this.x, this.y, this.size, this.size);
            ctx.clip();

            noFill();
            stroke(255, 255, 0, 200);
            strokeWeight(1);
            ellipse(mapX, mapY, mapRadius * 2);

            stroke(255, 255, 0, 200);
            strokeWeight(1);
            const crossSize = 3;
            line(mapX - crossSize, mapY, mapX + crossSize, mapY);
            line(mapX, mapY - crossSize, mapX, mapY + crossSize);

            ctx.restore();
        } else {
            const indicatorSize = 4;
            const inset = indicatorSize / 2 + 1;
            const cX = constrain(mapX, mapLeft + inset, mapRight - inset);
            const cY = constrain(mapY, mapTop + inset, mapBottom - inset);
            noStroke();
            fill(255, 255, 0, 220);
            rectMode(CENTER);
            rect(cX, cY, indicatorSize, indicatorSize);
            rectMode(CORNER);
        }
    }

    /**
     * Draw event markers that were added to the HUD (so events are visible on minimap).
     */
    _drawEventMarkersFromHUD(player, system, uiManager, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom) {
        try {
            if (!uiManager || !uiManager.hud || !Array.isArray(uiManager.hud.eventMarkers)) return;
            const markers = uiManager.hud.eventMarkers;
            if (!markers || markers.length === 0) return;

            for (let i = 0; i < markers.length; i++) {
                const m = markers[i];
                if (!m || typeof m.x !== 'number' || typeof m.y !== 'number') continue;

                const relX = m.x - player.pos.x;
                const relY = m.y - player.pos.y;
                const mapX = mapCenterX + relX * this.scale;
                const mapY = mapCenterY + relY * this.scale;

                // Simple visibility check: skip if very far outside expanded bounds
                const pad = 6;
                const onMap = (mapX >= mapLeft - pad && mapX <= mapRight + pad && mapY >= mapTop - pad && mapY <= mapBottom + pad);

                // Choose color
                let col = [255, 100, 255];
                if (Array.isArray(m.color)) col = m.color;
                else if (typeof m.color === 'string') {
                    try { const cc = color(m.color); col = [red(cc), green(cc), blue(cc)]; } catch (e) { }
                }

                push();
                const size = 4;
                if (onMap && mapX >= mapLeft && mapX <= mapRight && mapY >= mapTop && mapY <= mapBottom) {
                    noStroke();
                    fill(col[0], col[1], col[2], 220);
                    rect(mapX - size / 2, mapY - size / 2, size, size, 2);

                    // Try to draw abbreviated label if space allows
                    if (m.label && typeof m.label === 'string') {
                        fill(255);
                        textSize(STATION_TEXT_SIZE.HELPER);
                        textAlign(LEFT, TOP);
                        const tx = mapX + 6;
                        const ty = mapY - 6;
                        text(m.label.substring(0, 18), tx, ty);
                    }
                } else {
                    // Clamp to edge
                    const inset = 6;
                    const cX = constrain(mapX, mapLeft + inset, mapRight - inset);
                    const cY = constrain(mapY, mapTop + inset, mapBottom - inset);
                    noStroke();
                    fill(col[0], col[1], col[2], 220);
                    triangle(cX - 3, cY - 3, cX - 3, cY + 3, cX + 4, cY);
                }
                pop();
            }
        } catch (e) {
            // non-fatal
        }
    }

    _drawAutopilotMarker(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds) {
        try {
            if (!player || !player.autopilotEnabled || !player.autopilotTarget) return;

            const target = player.autopilotTarget;
            let targetPos = null;
            let color = [0, 200, 255]; // default cyan for autopilot
            let label = 'AUTO';

            if (target === 'station') {
                if (!system.station || !system.station.pos) return;
                targetPos = system.station.pos;
                color = [0, 160, 255];
                label = 'STN';
            } else if (target === 'jumpzone') {
                if (!system.jumpZoneCenter) return;
                targetPos = system.jumpZoneCenter;
                color = [255, 220, 0];
                label = 'JMP';
            } else if (typeof target === 'object' && target.type === 'planet') {
                const idx = Number.isFinite(target.index) ? target.index : player.autopilotPlanetIndex;
                const planets = system.planets || [];
                if (!planets || idx < 0 || idx >= planets.length) return;
                const p = planets[idx];
                if (!p || !p.pos) return;
                targetPos = p.pos;
                // If target planet is the central star, use SUN label
                if (p.isSun) {
                    color = [255, 200, 30];
                    label = 'SUN';
                } else {
                    color = [0, 220, 120];
                    label = 'PLT';
                }
            } else {
                return;
            }

            // Map world pos to minimap coordinates
            const relX = targetPos.x - player.pos.x;
            const relY = targetPos.y - player.pos.y;
            const mapX = mapCenterX + relX * this.scale;
            const mapY = mapCenterY + relY * this.scale;

            const size = 8;

            // If on-screen draw pulsing ring + label
            if (isFullyWithinBounds(mapX, mapY, size, size)) {
                push();
                // 0.2 rad/frame * 60 fps = 12 rad/sec → 12/1000 = 0.012
                const pulse = 1 + 0.15 * sin(millis() * 0.012);
                noFill();
                stroke(color[0], color[1], color[2], 220);
                strokeWeight(1.5);
                ellipse(mapX, mapY, size * 2 * pulse, size * 2 * pulse);

                // Small filled center
                noStroke();
                fill(color[0], color[1], color[2], 220);
                ellipse(mapX, mapY, size * 0.9, size * 0.9);

                // Label above
                fill(255);
                textAlign(CENTER, BOTTOM);
                textSize(STATION_TEXT_SIZE.HELPER);
                text(label, mapX, mapY - size - 4);
                pop();
            } else {
                // Off-screen indicator: clamp to minimap edge — only draw 3-letter label
                const inset = 6;
                const cX = constrain(mapX, mapLeft + inset, mapRight - inset);
                const cY = constrain(mapY, mapTop + inset, mapBottom - inset);

                push();
                noStroke();
                fill(255); // white label for clarity
                textAlign(CENTER, CENTER);
                textSize(STATION_TEXT_SIZE.HELPER + 2);
                text(label, cX, cY);
                pop();
            }
        } catch (e) {
            // non-fatal
        }
    }

    /**
     * Handles minimap click for target locking.
     * @param {number} mx - Mouse X position
     * @param {number} my - Mouse Y position
     * @param {Player} player - The player object
     * @param {StarSystem} system - The current star system
     * @param {UIHUD} hud - HUD instance for messages
     * @returns {boolean} True if a target was locked/unlocked
     */
    handleClick(mx, my, player, system, hud) {
        if (!player || !player.pos || !system) return false;

        const area = this.getArea();
        const mapCenterX = area.x + area.size / 2;
        const mapCenterY = area.y + area.size / 2;

        const worldViewRange = this.worldViewRanges[this.zoomIndex];
        const scale = area.size / worldViewRange;

        const relativeX = (mx - mapCenterX) / scale;
        const relativeY = (my - mapCenterY) / scale;
        const worldX = player.pos.x + relativeX;
        const worldY = player.pos.y + relativeY;

        const baseClickRadius = 15;
        const worldClickRadius = baseClickRadius / scale;

        let closestEntity = null;
        let closestDistSq = worldClickRadius * worldClickRadius;

        const checkEntities = (entities) => {
            for (let i = 0; i < entities.length; i++) {
                const entity = entities[i];
                if (!entity || !entity.pos || entity.destroyed) continue;
                const dx = entity.pos.x - worldX;
                const dy = entity.pos.y - worldY;
                const distSq = dx * dx + dy * dy;
                if (distSq < closestDistSq) {
                    closestDistSq = distSq;
                    closestEntity = entity;
                }
            }
        };

        checkEntities(system.enemies || []);
        checkEntities(system.spaceObjects || []);

        if (closestEntity) {
            if (player.target === closestEntity) {
                player.target = null;
                if (hud) hud.addMessage('Target unlocked.', [255, 255, 0]);
                if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                    soundManager.playSound('click');
                }
            } else {
                player.target = closestEntity;
                const label = this._getEntityLabel(closestEntity);
                if (hud) hud.addMessage(`Target locked: ${label}`, [0, 255, 0]);
                if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                    soundManager.playSound('click');
                }
            }
            return true;
        }

        return false;
    }

    _getEntityLabel(entity) {
        if (!entity) return 'Target';
        if (entity.shipTypeName) return entity.shipTypeName;
        if (typeof entity.getDisplayName === 'function') return entity.getDisplayName();
        if (entity.maxRadius !== undefined) return 'Asteroid';
        return 'Target';
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIMinimap = UIMinimap;
}
