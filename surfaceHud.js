/**
 * SurfaceHUD handles all surface-specific HUD elements like the altitude bar and compass.
 */
class SurfaceHUD {
    constructor() {
        // No specific state needed for now, but could hold local UI state if needed
    }

    /**
     * Draw all surface HUD elements
     * @param {SurfaceMode} surfaceMode The current surface mode instance
     */
    draw(surfaceMode) {
        if (!surfaceMode || !surfaceMode.player) return;

        push();

        // 1. Performance stats (top left, only if debugMode is explicitly enabled)
        this._drawDebugStats(surfaceMode);

        // 2. Surface Controls Hint (Top Center)
        this._drawControlHints(surfaceMode.controlMode);

        // 3. Altitude bar (Right side)
        this._drawAltitudeBar(surfaceMode);

        // 4. Compass (Bottom Right)
        this._drawCompass(surfaceMode);

        pop();
    }

    /**
     * Draw debug rendering stats if enabled
     * @private
     */
    _drawDebugStats(surfaceMode) {
        if (!surfaceMode.debugMode) return;

        const terrainStats = surfaceMode.terrain?.lastCullStats;

        push();
        const DEBUG_PANEL_HEIGHT_BASIC = 95;
        const DEBUG_PANEL_HEIGHT_EXTENDED = 110;
        const panelHeight = surfaceMode.player ? DEBUG_PANEL_HEIGHT_EXTENDED : DEBUG_PANEL_HEIGHT_BASIC;

        fill(0, 0, 0, 180);
        stroke(80, 80, 80);
        strokeWeight(1);
        rect(10, 10, 200, panelHeight, 3);

        fill(100, 255, 100);
        noStroke();
        textSize(10);
        textAlign(LEFT, TOP);
        text('Surface Render Stats:', 15, 15);

        fill(200);
        if (terrainStats) {
            const total = terrainStats.drawn + terrainStats.culled;
            const cullPercent = total > 0 ? ((terrainStats.culled / total) * 100).toFixed(1) : 0;
            text(`Terrain: ${terrainStats.drawn}/${total} (${cullPercent}% culled)`, 15, 30);
        }

        if (surfaceMode._lastObjectCullStats) {
            const total = surfaceMode._lastObjectCullStats.drawn + surfaceMode._lastObjectCullStats.culled;
            const cullPercent = total > 0 ? ((surfaceMode._lastObjectCullStats.culled / total) * 100).toFixed(1) : 0;
            text(`Render: ${surfaceMode._lastObjectCullStats.drawn}/${total} (${cullPercent}% culled)`, 15, 45);
        }

        if (surfaceMode._lastUpdateCullStats) {
            const total = surfaceMode._lastUpdateCullStats.updated + surfaceMode._lastUpdateCullStats.culled;
            const cullPercent = total > 0 ? ((surfaceMode._lastUpdateCullStats.culled / total) * 100).toFixed(1) : 0;
            text(`Update: ${surfaceMode._lastUpdateCullStats.updated}/${total} (${cullPercent}% culled)`, 15, 60);
        }

        text(`FPS: ${Math.round(frameRate())}`, 15, 75);
        text(`R-ALT: ${Math.round(surfaceMode.altitude)}`, 15, 90);

        // Show terrain height and absolute altitude for debugging
        const activeEntity = (surfaceMode.controlMode === 'ASTRONAUT') ? surfaceMode.astronaut : surfaceMode.player;
        const groundH = surfaceMode._getTerrainHeightAt(surfaceMode.surfaceX, surfaceMode.surfaceY);
        const absAlt = activeEntity?.altitude || 0;
        text(`Ground: ${Math.round(groundH)}`, 15, 90);
        text(`Abs-ALT: ${Math.round(absAlt)}`, 15, 105);
        pop();
    }

    /**
     * Draw control reminders
     * @private
     */
    _drawControlHints(controlMode) {
        if (controlMode === 'ASTRONAUT') return;

        const hintY = 45 + 24 + 5;
        fill(40, 80, 120, 200);
        noStroke();
        rect(0, hintY, width, 20);

        textAlign(CENTER, CENTER);
        // Ensure consistent typeface
        if (typeof font !== 'undefined' && font) textFont(font);

        const textSizeToUse = (typeof STATION_TEXT_SIZE !== 'undefined') ? STATION_TEXT_SIZE.BODY : 12;
        textSize(textSizeToUse);
        fill(255, 255, 100);
        text("[Z] Ascend [X] Descend", width / 2, hintY + 10);
    }

    /**
     * Draw vertical altitude indicator
     * @private
     */
    _drawAltitudeBar(surfaceMode) {
        const barX = width - 50;
        const barY = height / 2 - 100;
        const barHeight = 200;
        const barWidth = 25;

        fill(0, 0, 0, 180);
        stroke(80, 80, 80);
        strokeWeight(1);
        rect(barX, barY, barWidth, barHeight, 3);

        const activeEntity = (surfaceMode.controlMode === 'ASTRONAUT') ? surfaceMode.astronaut : surfaceMode.player;
        const groundH = surfaceMode._getTerrainHeightAt(surfaceMode.surfaceX, surfaceMode.surfaceY);
        const absAlt = Math.max(0, activeEntity?.altitude || 0);
        const maxDisplayAlt = (typeof SURFACE_CONFIG !== 'undefined') ? SURFACE_CONFIG.MAX_ALTITUDE : 2000;

        // Find nearest threat for detection warning
        let maxEnemyAlt = 0;
        let nearbyEnemies = 0;
        const detectionRange = 800;

        if (surfaceMode.surfaceObjects) {
            for (const obj of surfaceMode.surfaceObjects) {
                if (obj && !obj.destroyed && (obj.constructor.name === 'Turret' || obj.constructor.name === 'DefenseDrone')) {
                    const dx = obj.pos.x - surfaceMode.surfaceX;
                    const dy = obj.pos.y - surfaceMode.surfaceY;
                    if (dx * dx + dy * dy < detectionRange * detectionRange) {
                        const enemyAlt = (obj.altitude !== undefined) ? obj.altitude : (obj.yOffset || 0);
                        const detectThreshold = (obj.constructor.name === 'Turret')
                            ? (obj.yOffset || 0) + (obj.detectionHeightThreshold || 0)
                            : enemyAlt;
                        maxEnemyAlt = Math.max(maxEnemyAlt, detectThreshold);
                        nearbyEnemies++;
                    }
                }
            }
        }

        const isDetected = nearbyEnemies > 0 && absAlt >= maxEnemyAlt;

        // Draw ground level line
        if (groundH >= 0 && groundH <= maxDisplayAlt) {
            const groundY = barY + barHeight - (barHeight * groundH / maxDisplayAlt);
            stroke(100, 200, 100);
            strokeWeight(2);
            line(barX, groundY, barX + barWidth, groundY);
            noStroke();
            fill(100, 200, 100);
            textSize(9);
            textAlign(LEFT, CENTER);
            text('GND', barX + barWidth + 5, groundY);
        }

        // Draw detection threshold zone
        if (nearbyEnemies > 0 && maxEnemyAlt <= maxDisplayAlt) {
            const detectionY = barY + barHeight - (barHeight * maxEnemyAlt / maxDisplayAlt);
            stroke(255, 200, 0);
            strokeWeight(2);
            drawingContext.setLineDash([5, 5]);
            line(barX, detectionY, barX + barWidth, detectionY);
            drawingContext.setLineDash([]);

            fill(255, 80, 80, 60);
            noStroke();
            const dangerZoneHeight = detectionY - barY;
            if (dangerZoneHeight > 0) rect(barX + 2, barY + 2, barWidth - 4, dangerZoneHeight);

            fill(255, 200, 0);
            textSize(9);
            textAlign(LEFT, CENTER);
            text('DET', barX + barWidth + 5, detectionY);
        }

        // Player marker
        const markerY = barY + barHeight - (barHeight * Math.min(absAlt, maxDisplayAlt) / maxDisplayAlt);
        if (isDetected) {
            stroke(255, 50, 50);
            fill(255, 50, 50);
        } else {
            stroke(50, 255, 50);
            fill(50, 255, 50);
        }
        strokeWeight(3);
        line(barX - 5, markerY, barX + barWidth + 5, markerY);
        noStroke();
        triangle(barX + barWidth + 8, markerY, barX + barWidth + 15, markerY - 4, barX + barWidth + 15, markerY + 4);

        // Labels
        fill(255);
        textSize(11);
        textAlign(CENTER, TOP);
        text('ALT', barX + barWidth / 2, barY - 18);
        if (isDetected) {
            fill(255, 100, 100);
            text(Math.floor(absAlt) + ' [!]', barX + barWidth / 2, barY + barHeight + 5);
        } else {
            fill(100, 255, 100);
            text(Math.floor(absAlt), barX + barWidth / 2, barY + barHeight + 5);
        }
    }

    /**
     * Draw circular compass with tactical markers
     * @private
     */
    _drawCompass(surfaceMode) {
        const compassSize = 250;
        const compassX = width - compassSize / 2;
        const compassY = height - compassSize / 2;
        const compassRadius = compassSize / 2 - 20;
        const markerMaxRadius = compassRadius - 5;

        push();
        translate(compassX, compassY);

        // UI Base
        fill(10, 15, 40, 180);
        stroke(0, 200, 0, 200);
        strokeWeight(1);
        ellipse(0, 0, compassSize, compassSize);
        noFill();
        stroke(100, 100, 100, 100);
        ellipse(0, 0, compassSize - 40, compassSize - 40);

        // Directions
        fill(200);
        noStroke();
        textSize(12);
        textAlign(CENTER, CENTER);
        text('N', 0, -compassRadius);
        text('S', 0, compassRadius);
        text('E', compassRadius, 0);
        text('W', -compassRadius, 0);

        // Heading
        push();
        rotate(surfaceMode.playerAngle);
        stroke(255, 50, 50);
        line(0, 0, markerMaxRadius, 0);
        pop();

        // Markers
        this._drawWaypointMarkers(surfaceMode, markerMaxRadius);
        this._drawTacticalMarkers(surfaceMode, markerMaxRadius);

        pop();
    }

    /**
     * Draw mission and infrastructure markers
     * @private
     */
    _drawWaypointMarkers(surfaceMode, maxRadius) {
        const player = surfaceMode.player;

        // 1. Mission Target
        if (surfaceMode.targetPos) {
            const dx = surfaceMode.targetPos.x - surfaceMode.surfaceX;
            const dy = surfaceMode.targetPos.y - surfaceMode.surfaceY;

            // Check if destroyed
            let targetDestroyed = false;
            if (surfaceMode.destroyedCells) {
                const cellSize = (typeof SURFACE_CONFIG !== 'undefined') ? (SURFACE_CONFIG.SPAWN_CELL_SIZE || 35) : 35;
                const tx = Math.round(surfaceMode.targetPos.x / cellSize);
                const ty = Math.round(surfaceMode.targetPos.y / cellSize);
                if (surfaceMode.destroyedCells.has(`${tx},${ty}`)) targetDestroyed = true;
            }

            if (!targetDestroyed) {
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                const mDist = (dist > 3000) ? maxRadius : map(dist, 0, 3000, 0, maxRadius, true);
                const pulse = (Math.sin(millis() * 0.01) + 1) * 0.5;

                push();
                rotate(angle);
                noStroke();
                fill(255, 0, 0, 200 + pulse * 55);
                ellipse(mDist, 0, 10 + pulse * 2, 10 + pulse * 2);
                pop();
            }
        }

        // 2. Player built infrastructure
        const planet = surfaceMode.planet;
        if (planet && planet.playerBuiltSurfaceObjects) {
            for (const desc of planet.playerBuiltSurfaceObjects) {
                if (desc.destroyed) continue;
                const dx = desc.x - surfaceMode.surfaceX;
                const dy = desc.y - surfaceMode.surfaceY;
                const dist = Math.sqrt(dx * dx + dy * dy);
                const angle = Math.atan2(dy, dx);
                const mDist = map(dist, 0, 3000, 0, maxRadius, true);

                push();
                rotate(angle);
                noStroke();
                fill(0, 255, 100, 220);
                ellipse(mDist, 0, 4, 4);
                pop();
            }
        }
    }

    /**
     * Draw local entity markers
     * @private
     */
    _drawTacticalMarkers(surfaceMode, maxRadius) {
        if (!surfaceMode.surfaceObjects) return;

        // Draw ship marker when controlling astronaut
        if (surfaceMode.controlMode === 'ASTRONAUT' && surfaceMode.player) {
            const dx = surfaceMode.player.pos.x - surfaceMode.surfaceX;
            const dy = surfaceMode.player.pos.y - surfaceMode.surfaceY;
            const dist = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);
            const mDist = map(dist, 0, 3000, 0, maxRadius, true);

            push();
            rotate(angle);
            noStroke();
            fill(0, 255, 255, 230); // Bright cyan for visibility
            ellipse(mDist, 0, 9, 9); // Slightly larger for easy identification
            pop();
        }

        const player = surfaceMode.player;
        for (const obj of surfaceMode.surfaceObjects) {
            if (obj.destroyed || obj.playerBuilt) continue;

            const dx = obj.pos.x - surfaceMode.surfaceX;
            const dy = obj.pos.y - surfaceMode.surfaceY;
            const dSq = dx * dx + dy * dy;

            if (dSq > 25000000) continue; // 5000m cull

            const name = obj.constructor ? obj.constructor.name : '';
            const isStation = name === 'SurfaceStation';
            const isTurret = name === 'Turret';
            const isDrone = name === 'DefenseDrone';
            const isCache = obj.isCache === true;

            if (!isStation && !isTurret && !isDrone && !isCache) continue;

            const dist = Math.sqrt(dSq);
            const angle = Math.atan2(dy, dx);
            const mDist = map(dist, 0, 3000, 0, maxRadius, true);

            push();
            rotate(angle);
            noStroke();

            if (isStation) {
                fill(50, 150, 255, 220);
                ellipse(mDist, 0, 7, 7);
            } else if (isTurret) {
                fill(255, 150, 0, 200);
                ellipse(mDist, 0, 5, 5);
            } else if (isDrone) {
                fill(255, 50, 50, 200);
                ellipse(mDist, 0, 4, 4);
            } else if (isCache) {
                fill(50, 255, 100, 220);
                ellipse(mDist, 0, 6, 6);
            }
            pop();
        }
    }
}

// Global instance
let surfaceHud = null;

function initSurfaceHud() {
    surfaceHud = new SurfaceHUD();
}

// Auto-init on load if in browser
if (typeof window !== 'undefined') {
    window.addEventListener('load', () => {
        if (!surfaceHud) initSurfaceHud();
    });
}

// Export for Node.js/Jest
if (typeof module !== 'undefined' && module.exports) {
    module.exports = { SurfaceHUD };
}
