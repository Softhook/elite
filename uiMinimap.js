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
        this.margin = 15;
        
        // Position (calculated during draw)
        this.x = 0;
        this.y = 0;
        this.scale = 1;
        
        // Zoom configuration
        this.worldViewRanges = [5000, 10000, 20000, 50000];
        this.zoomIndex = 2; // Start at widest view
        this.worldViewRange = this.worldViewRanges[this.zoomIndex];
        
        // Hazards buffer for performance
        this.hazardsBuffer = null;
        this._hazardsBufferSize = 0;
        
        // Minimap color mapping by AI role
        this.roleColors = {};
        if (typeof AI_ROLE !== 'undefined') {
            this.roleColors[AI_ROLE.POLICE] = [0, 120, 255];
            this.roleColors[AI_ROLE.TRANSPORT] = [255, 140, 0];
            this.roleColors[AI_ROLE.HAULER] = [255, 200, 0];
            this.roleColors[AI_ROLE.GUARD] = [255, 200, 0];
            this.roleColors[AI_ROLE.PIRATE] = [255, 0, 0];
            this.roleColors[AI_ROLE.ALIEN] = [0, 200, 0];
            this.roleColors[AI_ROLE.COMBAT] = [128, 0, 128];
        }
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
     * Cycles the minimap zoom level.
     * @param {number} direction - 1 for zoom out, -1 for zoom in
     */
    cycleZoom(direction) {
        const delta = direction > 0 ? 1 : -1;
        this.zoomIndex = (this.zoomIndex + delta + this.worldViewRanges.length) % this.worldViewRanges.length;
        this.worldViewRange = this.worldViewRanges[this.zoomIndex];
        this.scale = this.size / this.worldViewRange;
        if (typeof soundManager !== 'undefined') soundManager.playSound('click');
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

        // Draw background/border
        try {
            fill(0, 0, 0, 180);
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

            // Draw station
            this._drawStation(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds);

            // Draw planets
            this._drawPlanets(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom);

            // Draw enemies
            this._drawEnemies(player, system, mapCenterX, mapCenterY, isFullyWithinBounds);

            // Draw space objects
            this._drawSpaceObjects(player, system, mapCenterX, mapCenterY, isFullyWithinBounds);

            // Draw floating cargo
            this._drawCargo(player, system, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom);

            // Draw locked target indicator
            this._drawTargetIndicator(player, mapCenterX, mapCenterY, mapLeft, mapRight, mapTop, mapBottom, isFullyWithinBounds);

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

        } catch (e) {
            console.error("Error during minimap element drawing:", e);
        } finally {
            pop();
        }
    }

    _drawHazardsBuffer(player, system, mapCenterX, mapCenterY) {
        if (!this.hazardsBuffer || this._hazardsBufferSize !== this.size) {
            this.hazardsBuffer = createGraphics(this.size, this.size);
            this._hazardsBufferSize = this.size;
        }
        
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

        push();
        const relX = system.station.pos.x - player.pos.x;
        const relY = system.station.pos.y - player.pos.y;
        const mapX = mapCenterX + relX * this.scale;
        const mapY = mapCenterY + relY * this.scale;
        const iconHalfSize = 3;

        let drawX = mapX;
        let drawY = mapY;
        const isStationOnScreen = isFullyWithinBounds(mapX, mapY, iconHalfSize, iconHalfSize);

        noStroke();
        if (!isStationOnScreen) {
            const inset = iconHalfSize + 1;
            drawX = constrain(mapX, mapLeft + inset, mapRight - inset);
            drawY = constrain(mapY, mapTop + inset, mapBottom - inset);

            if (mapX < mapLeft || mapX > mapRight || mapY < mapTop || mapY > mapBottom) {
                fill(0, 100, 255);
            } else {
                fill(0, 0, 255);
            }
        } else {
            fill(0, 0, 255);
        }
        rect(drawX - iconHalfSize, drawY - iconHalfSize, iconHalfSize * 2, iconHalfSize * 2);
        pop();
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
                const roleKey = enemy.role || enemy.aiRole || (enemy.shipTypeName && SHIP_DEFINITIONS[enemy.shipTypeName]?.aiRoles?.[0]);
                const colArr = this.roleColors[roleKey] || [255, 0, 0];
                
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
            rect(mapX - size/2, mapY - size/2, size, size, 1);
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
