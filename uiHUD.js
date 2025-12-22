// ****** uiHUD.js ******
// Heads-Up Display rendering for in-flight gameplay.
// This file must be loaded BEFORE uiManager.js

/**
 * UIHUD - Handles all in-flight HUD rendering including health bars,
 * weapon selector, battle indicators, target overlay, and messages.
 */
class UIHUD {
    constructor() {
        // Battle indicators for off-screen combat events
        this.battleIndicators = [];
        this.battleIndicatorDuration = 1200;
        this.battleIndicatorLineLength = 25;
        this.battleIndicatorEdgeBuffer = 10;

        // Message system
        this.messages = [];
        this.messageDisplayTime = 4000;
        this.maxMessagesToShow = 4;

        // Communication messages (radio chatter)
        this.communicationMessages = [];
        this.communicationDisplayTime = 15000;
        this.maxCommunicationMessagesToShow = 5;
        this.communicationQueueLimit = 12;

        // Cached values for performance
        this._lastMessageBlockHeight = 0;

        // Persistent messages (top of screen)
        this.persistentMessages = [];
        // Event markers for location-based events (visible on HUD/minimap)
        this.eventMarkers = []; // { id, x, y, label, color, expires }

        // Mission display area for click detection
        this.missionBoxArea = null;
    }

    /**
     * Adds a persistent message to the top of the screen.
     * @param {string} id - Unique identifier for the message
     * @param {string} text - Message text
     * @param {string|Array} color - Message color
     */
    addPersistentMessage(id, text, color = [255, 255, 255]) {
        const existingIndex = this.persistentMessages.findIndex(m => m.id === id);
        if (existingIndex >= 0) {
            this.persistentMessages[existingIndex] = { id, text, color };
        } else {
            this.persistentMessages.push({ id, text, color });
        }
    }

    /**
     * Removes a persistent message by ID.
     * @param {string} id - Unique identifier for the message
     */
    removePersistentMessage(id) {
        this.persistentMessages = this.persistentMessages.filter(m => m.id !== id);
    }

    /**
     * Tracks a combat sound event that might be off-screen.
     * @param {number} x - World X coordinate
     * @param {number} y - World Y coordinate
     * @param {string} soundType - Type of sound event
     */
    trackCombatSound(x, y, soundType) {
        const combatSounds = ['laser', 'explosion', 'hit', 'shield', 'missileLaunch', 'beam', 'turret'];
        if (!combatSounds.includes(soundType)) return;

        this.battleIndicators.push({
            x: x,
            y: y,
            timestamp: millis(),
            type: soundType
        });

        this.cleanupBattleIndicators();
    }

    /**
     * Adds a persistent event marker to the HUD.
     * @param {string} id - Unique id for the marker
     * @param {number} x - World X
     * @param {number} y - World Y
     * @param {string} label - Short label to show
     * @param {string|Array} color - Color for marker
     * @param {number} durationMs - How long to show marker
     */
    addEventMarker(id, x, y, label, color = [255, 100, 255], durationMs = 180000) {
        const expires = millis() + durationMs;
        // Coalesce markers near the same world position to avoid duplicates
        const POSITION_TOLERANCE = 12; // world units
        for (let i = 0; i < this.eventMarkers.length; i++) {
            const m = this.eventMarkers[i];
            if (!m) continue;
            const dx = (m.x || 0) - x;
            const dy = (m.y || 0) - y;
            if ((dx * dx + dy * dy) <= POSITION_TOLERANCE * POSITION_TOLERANCE) {
                // Update existing marker rather than add a new one
                m.x = x; m.y = y; m.label = label; m.color = color; m.expires = Math.max(m.expires || 0, expires);
                // prefer a stable id if provided
                if (!m.id && id) m.id = id;
                return;
            }
        }

        // No nearby marker found -> add new
        this.eventMarkers.push({ id, x, y, label, color, expires });
    }

    removeEventMarker(id) {
        this.eventMarkers = this.eventMarkers.filter(m => m.id !== id);
    }

    clearEventMarkers() {
        this.eventMarkers = [];
    }

    _cleanupEventMarkers() {
        const now = millis();
        this.eventMarkers = this.eventMarkers.filter(m => now < m.expires);
    }

    /**
     * Draws event markers; on-screen as blips + label, off-screen as edge indicators.
     * @param {Player} player
     */
    drawEventMarkers(player) {
        if (!player || !player.pos || !this.eventMarkers || this.eventMarkers.length === 0) return;
        this._cleanupEventMarkers();
        if (this.eventMarkers.length === 0) return;

        push();
        textFont(font);
        textSize(STATION_TEXT_SIZE.HELPER + 4);
        textAlign(CENTER, CENTER);

        const screenCenterX = width / 2;
        const screenCenterY = height / 2;
        const edgeBuffer = 10;

        for (let i = 0; i < this.eventMarkers.length; i++) {
            const m = this.eventMarkers[i];
            const relX = m.x - player.pos.x;
            const relY = m.y - player.pos.y;

            const screenX = screenCenterX + relX;
            const screenY = screenCenterY + relY;

            const onScreen = (screenX >= 0 && screenX <= width && screenY >= 0 && screenY <= height);

            // Compute opacity based on remaining time
            const remaining = Math.max(1, m.expires - millis());
            const opacity = Math.min(255, Math.max(80, Math.round(map(remaining, 0, 180000, 0, 255))));

            if (onScreen) {
                // Draw pulsing blip
                noStroke();
                const pulse = 1 + 0.5 * sin(millis() / 200);
                const sz = 10 * pulse;
                if (Array.isArray(m.color)) {
                    fill(...m.color, opacity);
                } else {
                    try { const c = color(m.color); fill(red(c), green(c), blue(c), Math.min(opacity, alpha(c))); } catch (e) { fill(255, 255, 255, opacity); }
                }
                circle(screenX, screenY, sz);

                // Label above blip
                fill(255, 255, 255, opacity);
                text(m.label, screenX, screenY - 16);
            } else {
                // Off-screen edge indicator
                const dx = relX;
                const dy = relY;
                const angle = atan2(dy, dx);

                // Find intersection with screen edge (reuse logic similar to battle indicators)
                let edgeX, edgeY;
                const h = height - 2 * edgeBuffer;
                const w = width - 2 * edgeBuffer;

                let tVert = Infinity;
                if (abs(cos(angle)) > 1e-6) tVert = (cos(angle) > 0 ? w / 2 : -w / 2) / cos(angle);
                const yAtScreenVertEdge = screenCenterY + sin(angle) * tVert;

                let tHoriz = Infinity;
                if (abs(sin(angle)) > 1e-6) tHoriz = (sin(angle) > 0 ? h / 2 : -h / 2) / sin(angle);
                const xAtScreenHorizEdge = screenCenterX + cos(angle) * tHoriz;

                if (abs(yAtScreenVertEdge - screenCenterY) <= h / 2 && tVert < tHoriz) {
                    edgeX = cos(angle) > 0 ? width - edgeBuffer : edgeBuffer;
                    edgeY = constrain(yAtScreenVertEdge, edgeBuffer, height - edgeBuffer);
                } else if (abs(xAtScreenHorizEdge - screenCenterX) <= w / 2) {
                    edgeY = sin(angle) > 0 ? height - edgeBuffer : edgeBuffer;
                    edgeX = constrain(xAtScreenHorizEdge, edgeBuffer, width - edgeBuffer);
                } else {
                    if (abs(cos(angle)) > abs(sin(angle))) {
                        edgeX = cos(angle) > 0 ? width - edgeBuffer : edgeBuffer;
                        edgeY = constrain(screenCenterY + tan(angle) * (edgeX - screenCenterX), edgeBuffer, height - edgeBuffer);
                    } else {
                        edgeY = sin(angle) > 0 ? height - edgeBuffer : edgeBuffer;
                        edgeX = constrain(screenCenterX + (edgeY - screenCenterY) / tan(angle), edgeBuffer, width - edgeBuffer);
                    }
                }

                // Draw small arrow/triangle
                push();
                translate(edgeX, edgeY);
                rotate(angle);
                noStroke();
                if (Array.isArray(m.color)) {
                    fill(...m.color, opacity);
                } else {
                    try { const c = color(m.color); fill(red(c), green(c), blue(c), Math.min(opacity, alpha(c))); } catch (e) { fill(255, 255, 255, opacity); }
                }
                triangle(-8, -6, -8, 6, 8, 0);
                pop();

                // Label near edge
                fill(255, 255, 255, opacity);
                text(m.label, edgeX + (cos(angle) * 20), edgeY + (sin(angle) * 20));
            }
        }
        pop();
    }

    /**
     * Removes battle indicators that have exceeded their duration.
     */
    cleanupBattleIndicators() {
        const now = millis();
        this.battleIndicators = this.battleIndicators.filter(indicator =>
            now - indicator.timestamp < this.battleIndicatorDuration
        );
    }

    /**
     * Draws battle indicators for off-screen events.
     * @param {Player} player - The player object
     */
    drawBattleIndicators(player) {
        if (!player || !player.pos || this.battleIndicators.length === 0) return;

        this.cleanupBattleIndicators();
        if (this.battleIndicators.length === 0) return;

        push();
        const screenCenterX = width / 2;
        const screenCenterY = height / 2;
        const edgeBuffer = this.battleIndicatorEdgeBuffer;

        const viewRect = {
            left: player.pos.x - screenCenterX,
            right: player.pos.x + screenCenterX,
            top: player.pos.y - screenCenterY,
            bottom: player.pos.y + screenCenterY
        };

        for (let i = 0; i < this.battleIndicators.length; i++) {
            const indicator = this.battleIndicators[i];
            const isOffScreen = (
                indicator.x < viewRect.left ||
                indicator.x > viewRect.right ||
                indicator.y < viewRect.top ||
                indicator.y > viewRect.bottom
            );

            if (!isOffScreen) continue;

            const dx = indicator.x - player.pos.x;
            const dy = indicator.y - player.pos.y;
            const angleToEvent = atan2(dy, dx);

            let edgeX, edgeY;
            const h = height - 2 * edgeBuffer;
            const w = width - 2 * edgeBuffer;

            let tVert = Infinity;
            if (abs(cos(angleToEvent)) > 1e-6) {
                tVert = (cos(angleToEvent) > 0 ? w / 2 : -w / 2) / cos(angleToEvent);
            }
            const yAtScreenVertEdge = screenCenterY + sin(angleToEvent) * tVert;

            let tHoriz = Infinity;
            if (abs(sin(angleToEvent)) > 1e-6) {
                tHoriz = (sin(angleToEvent) > 0 ? h / 2 : -h / 2) / sin(angleToEvent);
            }
            const xAtScreenHorizEdge = screenCenterX + cos(angleToEvent) * tHoriz;

            if (abs(yAtScreenVertEdge - screenCenterY) <= h / 2 && tVert < tHoriz) {
                edgeX = (cos(angleToEvent) > 0 ? width - edgeBuffer : edgeBuffer);
                edgeY = constrain(yAtScreenVertEdge, edgeBuffer, height - edgeBuffer);
            } else if (abs(xAtScreenHorizEdge - screenCenterX) <= w / 2) {
                edgeY = (sin(angleToEvent) > 0 ? height - edgeBuffer : edgeBuffer);
                edgeX = constrain(xAtScreenHorizEdge, edgeBuffer, width - edgeBuffer);
            } else {
                if (abs(cos(angleToEvent)) > abs(sin(angleToEvent))) {
                    edgeX = (cos(angleToEvent) > 0 ? width - edgeBuffer : edgeBuffer);
                    edgeY = constrain(screenCenterY + tan(angleToEvent) * (edgeX - screenCenterX), edgeBuffer, height - edgeBuffer);
                } else {
                    edgeY = (sin(angleToEvent) > 0 ? height - edgeBuffer : edgeBuffer);
                    edgeX = constrain(screenCenterX + (edgeY - screenCenterY) / tan(angleToEvent), edgeBuffer, width - edgeBuffer);
                }
            }

            edgeX = constrain(edgeX, edgeBuffer, width - edgeBuffer);
            edgeY = constrain(edgeY, edgeBuffer, height - edgeBuffer);

            const age = millis() - indicator.timestamp;
            const opacity = map(age, 0, this.battleIndicatorDuration, 220, 0);

            if (opacity <= 0) continue;

            strokeWeight(2);
            stroke(255, 255, 255, opacity);

            const lineHalfLength = this.battleIndicatorLineLength / 2;

            if (edgeX <= edgeBuffer + 1 || edgeX >= width - edgeBuffer - 1) {
                line(edgeX, edgeY - lineHalfLength, edgeX, edgeY + lineHalfLength);
            } else if (edgeY <= edgeBuffer + 1 || edgeY >= height - edgeBuffer - 1) {
                line(edgeX - lineHalfLength, edgeY, edgeX + lineHalfLength, edgeY);
            }
        }
        pop();
    }

    /**
     * Draws persistent messages below the weapon indicator bar.
     * @param {Player} player - optional player to account for autopilot area
     */
    drawPersistentMessages(player) {
        if (this.persistentMessages.length === 0) return;

        push();
        textAlign(CENTER, TOP);
        textFont(font);
        textSize(STATION_TEXT_SIZE.BODY);
        noStroke();

        // Weapon bar defaults (kept in sync with drawWeaponSelector)
        const weaponBarY = 45;
        const weaponBarH = 24;
        // Autopilot area sits below the weapon bar when enabled
        const autopilotExtra = (player?.autopilotEnabled) ? 25 : 0;

        const startY = weaponBarY + weaponBarH + 6 + autopilotExtra;
        const lineHeight = 22;

        for (let i = 0; i < this.persistentMessages.length; i++) {
            const msg = this.persistentMessages[i];

            // Draw background for readability
            fill(0, 0, 0, 150);
            const textW = textWidth(msg.text);
            rect(width / 2 - textW / 2 - 10, startY + i * lineHeight, textW + 20, lineHeight);

            // Draw text
            if (Array.isArray(msg.color)) {
                fill(...msg.color);
            } else {
                fill(msg.color);
            }
            text(msg.text, width / 2, startY + i * lineHeight + 2);
        }
        pop();
    }

    /**
     * Draws the main Heads-Up Display during flight.
     * @param {Player} player - The player object
     */
    drawHUD(player) {
        if (!player) { console.warn("drawHUD: Player object missing"); return; }

        const csName = player.currentSystem?.name || 'N/A';
        const cargoAmt = player.getCargoAmount() ?? 0;
        const cargoCap = player.cargoCapacity ?? 0;
        const hull = player.hull ?? 0;
        const maxHull = player.maxHull || 1;
        const credits = player.credits ?? 0;
        const shipName = player.shipTypeName || "Unknown Ship";
        const eliteRating = player.getEliteRating();

        this.drawBattleIndicators(player);
        this.drawEventMarkers(player);

        push();
        fill(0, 180, 0, 150);
        noStroke();
        rect(0, 0, width, 40);

        // Left side - System name with additional info
        fill(255);
        textFont(font);
        textSize(STATION_TEXT_SIZE.BODY);
        textAlign(LEFT, CENTER);
        const systemType = player.currentSystem?.economyType || 'Unknown';
        const secLevel = player.currentSystem?.securityLevel || 'Unknown';
        const techLevel = player.currentSystem?.techLevel || '?';
        text(`${csName}            ${systemType}   Tech: ${techLevel}   Security: ${secLevel}`, 10, 20);

        const statusLineY = 20;

        // Center - LEGAL status (cached every 500ms for performance)
        const statusCacheIntervalMs = 500;
        const now = millis();
        const shouldRecalculateStatus = !this._cachedStatusText ||
            !this._statusTextCacheTime ||
            (now - this._statusTextCacheTime) >= statusCacheIntervalMs;

        if (shouldRecalculateStatus) {
            let factionDisplay = "";
            let factionRank = "";

            if (player.isPolice) {
                factionDisplay = "POLICE";
                factionRank = player.getFactionRank("POLICE");
            } else if (player.playerFaction === "MILITARY") {
                factionDisplay = "MILITARY";
                factionRank = player.getFactionRank("MILITARY");
            } else if (player.playerFaction === "IMPERIAL") {
                factionDisplay = "IMPERIAL";
                factionRank = player.getFactionRank("IMPERIAL");
            } else if (player.playerFaction === "SEPARATIST") {
                factionDisplay = "SEPARATIST";
                factionRank = player.getFactionRank("SEPARATIST");
            } else {
                factionDisplay = "LEGAL";
            }

            let statusText = `${eliteRating} - ${factionDisplay}`;
            if (factionRank) {
                statusText += ` (${factionRank})`;
            }

            this._cachedIsWanted = player.currentSystem?.isPlayerWanted() || false;
            if (this._cachedIsWanted) {
                statusText += " - Wanted";
            }

            this._cachedStatusText = statusText;
            this._statusTextCacheTime = now;
        }

        fill(this._cachedIsWanted ? color(255, 0, 0) : 255);
        textAlign(CENTER, CENTER);
        text(this._cachedStatusText, width / 2, statusLineY);

        // Right side - Ship info
        fill(255);
        textAlign(RIGHT, CENTER);
        text(`Cargo: ${cargoAmt}/${cargoCap}   Credits: ${credits}`, width - 300, statusLineY);

        // Shield and Hull bars
        const barWidth = 140;
        const barHeight = 14;
        const barX = width - 150;
        const barMiddleY = 20;

        if (player.maxShield > 0) {
            fill(20, 20, 60);
            rect(barX, barMiddleY - barHeight - 2, barWidth, barHeight);

            const shieldPercent = player.shield / player.maxShield;
            fill(50, 100, 255);
            rect(barX, barMiddleY - barHeight - 2, barWidth * shieldPercent, barHeight);

            stroke(100, 150, 255);
            noFill();
            rect(barX, barMiddleY - barHeight - 2, barWidth, barHeight);

            fill(255);
            noStroke();
            textFont(font);
            textAlign(RIGHT, CENTER);
            textSize(STATION_TEXT_SIZE.BODY);
            text(`Shield: ${Math.floor(player.shield)}/${player.maxShield}`, barX - 10, barMiddleY - barHeight / 2 - 2);
        }

        fill(60, 20, 20);
        rect(barX, barMiddleY + 2, barWidth, barHeight);

        const hullPercent = player.hull / player.maxHull;
        fill(255, 50, 50);
        rect(barX, barMiddleY + 2, barWidth * hullPercent, barHeight);

        stroke(255, 100, 100);
        noFill();
        rect(barX, barMiddleY + 2, barWidth, barHeight);

        fill(255);
        noStroke();
        textAlign(RIGHT, CENTER);
        textSize(STATION_TEXT_SIZE.BODY);
        text(`Hull: ${Math.floor(player.hull)}/${player.maxHull}`, barX - 10, barMiddleY + barHeight / 2 + 2);

        this.drawWeaponSelector(player);

        pop();
        // Draw persistent messages after weapon selector so they appear below it
        this.drawPersistentMessages(player);

        if (gameStateManager?.currentState !== "GALAXY_MAP") {
            this.drawTargetOverlay(player);
        }
    }

    /**
     * Draws the weapon selector UI.
     * @param {Player} player - The player object
     */
    drawWeaponSelector(player) {
        if (!player?.weapons || player.weapons.length === 0) return;

        const weaponBarY = 45;
        const weaponBarH = 24;

        push();
        fill(0, 50, 80, 150);
        noStroke();
        rect(0, weaponBarY, width, weaponBarH);

        textAlign(LEFT, CENTER);
        textSize(STATION_TEXT_SIZE.BODY);
        let xPos = 10;

        const weaponIdx = player.weaponIndex;
        for (let index = 0; index < player.weapons.length; index++) {
            const weapon = player.weapons[index];
            const isSelected = (index === weaponIdx);
            const slotPadding = 10;
            const slotText = weapon ? `${index + 1}: ${weapon.name}` : `${index + 1}:`;
            const textW = textWidth(slotText);
            const slotW = textW + slotPadding * 2;

            if (isSelected) {
                fill(0, 100, 180, 200);
            } else {
                fill(0, 80, 120, 120);
            }
            rect(xPos, weaponBarY + 3, slotW, weaponBarH - 6, 5);

            if (isSelected) {
                fill(255, 255, 100);
            } else {
                fill(200);
            }
            text(slotText, xPos + slotPadding, weaponBarY + weaponBarH / 2);

            if (isSelected) {
                let indicatorRatio = 0;
                let indicatorColor = [255, 50, 50, 200];

                if (weapon.type === WEAPON_TYPE.BEAM && typeof WeaponSystem !== 'undefined') {
                    indicatorRatio = WeaponSystem.getHeatRatio(player, weapon);
                    if (indicatorRatio > 0) {
                        indicatorColor = WeaponSystem.isBeamOverheated(player, weapon)
                            ? [255, 120, 40, 230]
                            : [255, 200, 80, 200];
                    }
                } else if (player.fireCooldown > 0 && player.fireRate > 0) {
                    indicatorRatio = constrain(map(player.fireCooldown, player.fireRate, 0, 0, 1), 0, 1);
                }

                if (indicatorRatio > 0) {
                    fill(indicatorColor[0], indicatorColor[1], indicatorColor[2], indicatorColor[3]);
                    noStroke();
                    rect(xPos, weaponBarY + weaponBarH - 3, slotW * indicatorRatio, 3);
                }
            }

            xPos += slotW + 5;
        }

        // Active mission display on right side
        if (player.activeMission?.title) {
            const missionText = `Mission: ${player.activeMission.title}`;
            const missionPadding = 10;
            textSize(STATION_TEXT_SIZE.BODY);
            const missionTextW = textWidth(missionText);
            const missionBoxW = missionTextW + missionPadding * 2;
            const missionBoxX = width - missionBoxW - 10;

            fill(0, 80, 140, 200);
            stroke(0, 100, 180);
            strokeWeight(1);
            rect(missionBoxX, weaponBarY + 3, missionBoxW, weaponBarH - 6, 5);

            fill(255, 180, 0);
            noStroke();
            textAlign(LEFT, CENTER);
            text(missionText, missionBoxX + missionPadding, weaponBarY + weaponBarH / 2);

            fill(255, 200, 0);
            circle(missionBoxX + 6, weaponBarY + weaponBarH / 2, 5);

            // Store area for click handling
            this.missionBoxArea = {
                x: missionBoxX,
                y: weaponBarY + 3,
                w: missionBoxW,
                h: weaponBarH - 6
            };
        } else {
            this.missionBoxArea = null;
        }

        // Autopilot indicator
        if (player.autopilotEnabled) {
            let targetLabel = 'Unknown';
            let hint = '';
            try {
                if (player.autopilotTarget === 'station') {
                    targetLabel = 'Station';
                    hint = '[J to cycle targets | H to cycle planets]';
                } else if (player.autopilotTarget === 'jumpzone') {
                    targetLabel = 'Jump Zone';
                    hint = '[J to cycle targets | H to cycle planets]';
                } else if (player.autopilotTarget === 'secretbase') {
                    targetLabel = 'Secret Base';
                    hint = '[J to cycle targets | H to cycle planets]';
                } else if (player.autopilotTarget && typeof player.autopilotTarget === 'object' && player.autopilotTarget.type === 'planet') {
                    const idx = Number.isFinite(player.autopilotTarget.index) ? player.autopilotTarget.index : player.autopilotPlanetIndex;
                    const planet = player.currentSystem?.planets?.[idx];
                    const pname = planet?.name || (`Planet ${idx + 1}`);
                    targetLabel = `Planet: ${pname}`;
                    hint = '[H to cycle planets | J to toggle station/jump]';
                } else if (typeof player.autopilotTarget === 'object' && player.autopilotTarget?.type) {
                    targetLabel = String(player.autopilotTarget.type);
                }
            } catch (e) {
                targetLabel = 'Unknown';
            }

            const autopilotY = 45 + 24 + 5;
            fill(40, 80, 120, 200);
            noStroke();
            rect(0, autopilotY, width, 20);

            textAlign(CENTER, CENTER);
            textSize(STATION_TEXT_SIZE.BODY);
            fill(255, 255, 100);
            text(`Autopilot Engaged: ${targetLabel} ${hint}`, width / 2, autopilotY + 10);
        }

        // Secret Base indicator (when B key navigation is active)
        if (player.showSecretBaseNavigation) {
            const secretBaseY = player.autopilotEnabled ? (45 + 24 + 5 + 20 + 5) : (45 + 24 + 5);
            fill(0, 60, 80, 200);
            noStroke();
            rect(0, secretBaseY, width, 20);

            textAlign(CENTER, CENTER);
            textSize(STATION_TEXT_SIZE.BODY);
            fill(0, 255, 255);
            text('Secret Base', width / 2, secretBaseY + 10);
        }

        // Cloak status indicator (when cloak is installed)
        if (player.installedUpgrades?.cloak > 0) {
            const cloakBarWidth = 120;
            const cloakBarHeight = 16;
            const cloakBarX = 10;
            const cloakBarY = weaponBarY + weaponBarH + 8;

            // Calculate Y offset if autopilot or secret base is shown
            let yOffset = 0;
            if (player.autopilotEnabled) yOffset += 25;
            if (player.showSecretBaseNavigation) yOffset += 25;
            const adjustedY = cloakBarY + yOffset;

            // Background
            fill(20, 40, 60, 180);
            noStroke();
            rect(cloakBarX, adjustedY, cloakBarWidth, cloakBarHeight, 3);

            if (player.isCloaked) {
                // Active cloak - show remaining time with cyan bar
                const remainingPct = player.cloakDurationTimer / player.cloakMaxDuration;
                fill(50, 180, 220, 200);
                rect(cloakBarX, adjustedY, cloakBarWidth * remainingPct, cloakBarHeight, 3);

                // Flickering effect
                const flicker = sin(millis() * 0.02) * 30;
                fill(100 + flicker, 220 + flicker, 255, 220);
                textAlign(LEFT, CENTER);
                textSize(STATION_TEXT_SIZE.HELPER + 2);
                text(`CLOAKED ${player.cloakDurationTimer.toFixed(1)}s`, cloakBarX + 5, adjustedY + cloakBarHeight / 2);
            } else if (player.cloakCooldownTimer > 0) {
                // Cooldown - show recharge progress
                const rechargePct = 1 - (player.cloakCooldownTimer / player.cloakMaxCooldown);
                fill(60, 80, 100, 150);
                rect(cloakBarX, adjustedY, cloakBarWidth, cloakBarHeight, 3);
                fill(40, 100, 140, 200);
                rect(cloakBarX, adjustedY, cloakBarWidth * rechargePct, cloakBarHeight, 3);

                fill(150, 180, 200);
                textAlign(LEFT, CENTER);
                textSize(STATION_TEXT_SIZE.HELPER + 2);
                text(`CLOAK ${Math.ceil(player.cloakCooldownTimer)}s`, cloakBarX + 5, adjustedY + cloakBarHeight / 2);
            } else {
                // Ready
                fill(40, 120, 80, 200);
                rect(cloakBarX, adjustedY, cloakBarWidth, cloakBarHeight, 3);

                fill(100, 255, 150);
                textAlign(LEFT, CENTER);
                textSize(STATION_TEXT_SIZE.HELPER + 2);
                text("CLOAK [C]", cloakBarX + 5, adjustedY + cloakBarHeight / 2);
            }
        }

        pop();
    }

    /**
     * Draws an information overlay for the currently targeted ship/object.
     * @param {Player} player - The player object
     */
    drawTargetOverlay(player) {
        const target = player?.target;
        if (!target || target === player) return;
        if (typeof target.isDestroyed === 'function' && target.isDestroyed()) return;

        const hasShipIdentity = typeof target.shipTypeName === 'string' || typeof target.shipDefinition === 'object';
        const isAsteroid = target && (target.constructor && target.constructor.name === 'Asteroid');
        const isSpaceObject = target && (target.constructor && target.constructor.name === 'SpaceObject');

        if (!hasShipIdentity && !isAsteroid && !isSpaceObject) return;

        const panelWidth = Math.min(320, Math.max(240, width * 0.22));
        const padding = 12;
        const lineHeight = 20;
        const sectionSpacing = 8;
        const autopilotOffset = player?.autopilotEnabled ? 35 : 0;
        const panelX = width - panelWidth - 20;
        const panelY = 80 + autopilotOffset;

        // Get uiManager for minimap reference
        const minimapSize = typeof uiManager !== 'undefined' ? uiManager.minimapSize : 200;
        const minimapMargin = typeof uiManager !== 'undefined' ? uiManager.minimapMargin : 15;
        const minimapTop = height - minimapSize - minimapMargin;
        const maxPanelHeight = Math.max(150, minimapTop - panelY - 10);

        let pilotName = this._getTargetPilotName(target);
        if (isAsteroid) {
            // More descriptive asteroid name based on properties
            if (target.isComet) {
                pilotName = 'Comet';
            } else if (target.isRich) {
                pilotName = 'Rich Asteroid';
            } else {
                pilotName = 'Asteroid';
            }
        } else if (isSpaceObject) {
            pilotName = (typeof target.getDisplayName === 'function') ? target.getDisplayName() : 'Space Object';
        }

        const shipName = this._getTargetShipName(target);
        const roleLabel = this._formatRoleLabel(target.role);
        const wantedLabel = (typeof target.isWanted === 'boolean') ? (target.isWanted ? 'Wanted' : null) : null;

        // Check if this target is a mission target
        let isMissionTarget = false;
        if (player.activeMission) {
            const mission = player.activeMission;
            // Assassination target - check enemy ID
            if (mission._targetEnemyId && target.id === mission._targetEnemyId) {
                isMissionTarget = true;
            }
            // Sabotage target - check space object ID
            if (mission.targetObjectId && target.id === mission.targetObjectId) {
                isMissionTarget = true;
            }
            // Bounty missions - check if target matches role criteria
            if ((mission.type === MISSION_TYPE?.BOUNTY_PIRATE && target.role === AI_ROLE?.PIRATE) ||
                (mission.type === MISSION_TYPE?.BOUNTY_POLICE && target.role === AI_ROLE?.POLICE) ||
                (mission.type === MISSION_TYPE?.BOUNTY_ALIEN && target.role === AI_ROLE?.ALIEN)) {
                isMissionTarget = true;
            }
        }

        const hullPercent = this._getStatPercent(target.hull, target.maxHull);
        const shieldPercent = this._getStatPercent(target.shield, target.maxShield);
        const shipDef = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[target.shipTypeName] : null;
        const rangeLine = this._formatRangeLine(player, target);
        const activityStatus = hasShipIdentity ? this._getActivityStatus(target) : null;
        const tacticalInfo = hasShipIdentity ? this._getTacticalInfo(target) : [];
        const weaponsList = hasShipIdentity ? this._getTargetWeapons(target) : [];

        const infoLines = [];
        if (hasShipIdentity) {
            infoLines.push(`${shipName}${roleLabel ? ` (${roleLabel})` : ''}`);
        }
        // Add mission target indicator prominently
        if (isMissionTarget) {
            infoLines.push('★ MISSION TARGET ★');
        }
        if (activityStatus) {
            infoLines.push(`Status: ${activityStatus}`);
        }
        if (rangeLine) {
            infoLines.push(rangeLine);
        }
        // Add tactical info lines
        for (const info of tacticalInfo) {
            infoLines.push(info);
        }

        // Add asteroid-specific info
        if (isAsteroid) {
            // Size category
            const size = target.size || 0;
            let sizeCategory = 'Small';
            if (size >= 200) {
                sizeCategory = 'Very Large';
            } else if (size >= 100) {
                sizeCategory = 'Large';
            } else if (size >= 50) {
                sizeCategory = 'Medium';
            }
            infoLines.push(`Size: ${sizeCategory}`);

            // Mineral richness
            if (target.isRich) {
                const multiplier = target.mineralMultiplier || 1;
                infoLines.push(`Ore Quality: Rich (${multiplier}x yield)`);
            } else {
                infoLines.push('Ore Quality: Standard');
            }
        }

        // Add space object-specific info
        if (isSpaceObject) {
            // Add description if available, with text wrapping for long descriptions
            if (target.description) {
                const maxCharsPerLine = Math.floor((panelWidth - padding * 2) / 8); // Approximate chars that fit
                const desc = target.description;
                if (desc.length > maxCharsPerLine) {
                    // Wrap text at word boundaries
                    const words = desc.split(' ');
                    let currentLine = '';
                    for (const word of words) {
                        if ((currentLine + ' ' + word).trim().length <= maxCharsPerLine) {
                            currentLine = (currentLine + ' ' + word).trim();
                        } else {
                            if (currentLine) infoLines.push(currentLine);
                            currentLine = word;
                        }
                    }
                    if (currentLine) infoLines.push(currentLine);
                } else {
                    infoLines.push(desc);
                }
            }
        }

        const cargoEntries = hasShipIdentity ? this._getCargoEntries(target) : [];
        let cargoLines = cargoEntries.length > 0
            ? cargoEntries.map(entry => `${entry.name}: ${entry.quantity}`)
            : [];

        // Calculate tradable commodities height for dockable space objects
        let tradableCommoditiesHeight = 0;
        let tradable = null;
        if (isSpaceObject && target.isDockable) {
            tradable = (typeof target.getTradableCommodities === 'function')
                ? target.getTradableCommodities()
                : { produces: [], buys: [] };
            if (tradable.produces && tradable.produces.length > 0) {
                tradableCommoditiesHeight += sectionSpacing + lineHeight + lineHeight; // heading + items
            }
            if (tradable.buys && tradable.buys.length > 0) {
                tradableCommoditiesHeight += sectionSpacing + lineHeight + lineHeight; // heading + items
            }
        }

        const statBarsHeight = (lineHeight + 4) * 2;
        const weaponsHeight = (weaponsList && weaponsList.length > 0)
            ? (sectionSpacing + lineHeight + weaponsList.length * lineHeight + sectionSpacing)
            : 0;

        const baseHeightWithoutCargo = padding * 2 + lineHeight + lineHeight + sectionSpacing + statBarsHeight + sectionSpacing + weaponsHeight + infoLines.length * lineHeight + tradableCommoditiesHeight;
        let showCargoSection = cargoLines.length > 0;
        let renderedCargoLines = cargoLines.slice();
        const cargoHeadingHeight = lineHeight;

        if (showCargoSection) {
            let spaceAfterBase = maxPanelHeight - baseHeightWithoutCargo;
            const minimumBlockHeight = sectionSpacing + cargoHeadingHeight + lineHeight;
            if (spaceAfterBase < minimumBlockHeight) {
                showCargoSection = false;
            } else {
                spaceAfterBase -= sectionSpacing + cargoHeadingHeight;
                const maxCargoLines = Math.floor(spaceAfterBase / lineHeight);
                if (maxCargoLines < renderedCargoLines.length) {
                    if (maxCargoLines < 1) {
                        showCargoSection = false;
                        renderedCargoLines = [];
                    } else {
                        renderedCargoLines = renderedCargoLines.slice(0, maxCargoLines);
                        const remaining = cargoLines.length - maxCargoLines;
                        if (remaining > 0) {
                            const lastIndex = renderedCargoLines.length - 1;
                            renderedCargoLines[lastIndex] = `${renderedCargoLines[lastIndex]} (+${remaining} more)`;
                        }
                    }
                }
            }
        }

        let panelHeight = baseHeightWithoutCargo;
        if (showCargoSection && renderedCargoLines.length > 0) {
            panelHeight += sectionSpacing + cargoHeadingHeight + renderedCargoLines.length * lineHeight;
        }
        panelHeight = Math.min(panelHeight, maxPanelHeight);

        push();
        rectMode(CORNER);
        textAlign(LEFT, TOP);
        textFont(font);

        fill(20, 30, 50, 240);
        stroke(100, 150, 255, 180);
        strokeWeight(2);
        rect(panelX, panelY, panelWidth, panelHeight, 8);
        noStroke();

        const ctx = drawingContext;
        ctx.save();
        ctx.beginPath();
        ctx.rect(panelX, panelY, panelWidth, panelHeight);
        ctx.clip();

        let cursorX = panelX + padding;
        let cursorY = panelY + padding;

        UIComponents.setTextStyle({ fill: 255, size: 18 });
        text(pilotName, cursorX, cursorY);
        if (wantedLabel) {
            fill(255, 0, 0);
            text(` (${wantedLabel})`, cursorX + textWidth(pilotName), cursorY);
            fill(255);
        }
        cursorY += lineHeight;
        cursorY += sectionSpacing;

        if (hasShipIdentity) {
            UIComponents.drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Shield', target.shield, target.maxShield, shieldPercent);
            cursorY += lineHeight + 4;
            UIComponents.drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Hull', target.hull, target.maxHull, hullPercent);
            cursorY += lineHeight;
        } else {
            const hp = (typeof target.health === 'number') ? target.health : (typeof target.hull === 'number' ? target.hull : 0);
            const hpMax = (typeof target.maxHealth === 'number') ? target.maxHealth : (typeof target.maxHull === 'number' ? target.maxHull : 0);
            const hpPercent = this._getStatPercent(hp, hpMax);
            UIComponents.drawStatBar(cursorX, cursorY, panelWidth - padding * 2, 'Health', hp, hpMax, hpPercent);
            cursorY += lineHeight;
        }

        cursorY += sectionSpacing;

        UIComponents.setTextStyle({ fill: 210, size: 18 });
        for (let i = 0; i < infoLines.length; i++) {
            text(infoLines[i], cursorX, cursorY);
            cursorY += lineHeight;
        }

        cursorY += sectionSpacing;

        if (weaponsList && weaponsList.length > 0) {
            fill(190, 220, 255);
            text('Weapons', cursorX, cursorY);
            cursorY += lineHeight;
            fill(210);
            for (let i = 0; i < weaponsList.length; i++) {
                const isCurrentWeapon = weaponsList[i] === target.currentWeapon?.name;
                // Check if actively firing (fireCooldown > 0 means recently fired)
                const isFiring = isCurrentWeapon && target.fireCooldown > 0 && target.fireRate > 0;

                if (isFiring) {
                    // Red when actively firing
                    fill(255, 80, 80);
                } else if (isCurrentWeapon) {
                    // Yellow for selected weapon
                    fill(255, 255, 0);
                } else {
                    fill(210);
                }
                text(weaponsList[i], cursorX, cursorY);
                cursorY += lineHeight;
            }
            fill(210);
            cursorY += sectionSpacing;
        }

        if (showCargoSection && renderedCargoLines.length > 0) {
            cursorY += sectionSpacing;
            fill(190, 220, 255);
            text('Cargo Manifest', cursorX, cursorY);
            cursorY += lineHeight;
            fill(210);
            for (let i = 0; i < renderedCargoLines.length; i++) {
                text(renderedCargoLines[i], cursorX, cursorY);
                cursorY += lineHeight;
            }
        }

        // Space object trade info
        if (isSpaceObject && target.isDockable && tradable) {
            if (tradable.produces && tradable.produces.length > 0) {
                cursorY += sectionSpacing;
                fill(100, 255, 100);
                text('Sells:', cursorX, cursorY);
                cursorY += lineHeight;
                fill(210);
                text(tradable.produces.join(', '), cursorX, cursorY);
                cursorY += lineHeight;
            }

            if (tradable.buys && tradable.buys.length > 0) {
                cursorY += sectionSpacing;
                fill(255, 200, 100);
                text('Buys:', cursorX, cursorY);
                cursorY += lineHeight;
                fill(210);
                text(tradable.buys.join(', '), cursorX, cursorY);
                cursorY += lineHeight;
            }
        }

        ctx.restore();
        pop();
    }

    // Helper methods for target overlay
    _getTargetPilotName(target) {
        if (!target) return 'Unknown Pilot';
        if (typeof target.displayName === 'string' && target.displayName.trim().length > 0) {
            return target.displayName;
        }
        if (target.role === AI_ROLE?.ALIEN) return 'Unknown Lifeform';
        if (typeof target.captainName === 'string' && target.captainName.trim().length > 0) {
            return target.captainName;
        }
        return 'Unidentified Pilot';
    }

    _getTargetShipName(target) {
        if (!target) return 'Unknown Ship';
        const def = (typeof SHIP_DEFINITIONS !== 'undefined') ? SHIP_DEFINITIONS[target.shipTypeName] : null;
        if (def?.name) return def.name;
        if (typeof target.shipTypeName === 'string') return target.shipTypeName;
        return 'Unknown Ship';
    }

    _formatRoleLabel(role) {
        if (!role) return '';
        if (role === AI_ROLE?.BOUNTY_HUNTER) return 'Bounty Hunter';
        if (typeof role === 'string') return role.replace(/_/g, ' ');
        return '';
    }

    _formatRangeLine(player, target) {
        if (!player?.pos || !target?.pos) return null;
        const distance = dist(player.pos.x, player.pos.y, target.pos.x, target.pos.y);
        if (!Number.isFinite(distance)) return null;
        return `Range: ${Math.round(distance)} m`;
    }

    _getStatPercent(current, max) {
        if (!Number.isFinite(current)) return 0;
        const safeCurrent = Math.max(0, current);
        if (Number.isFinite(max) && max > 0) {
            return constrain((safeCurrent / max) * 100, 0, 100);
        }
        return 0;
    }

    _getTargetWeapons(target) {
        if (!target || !Array.isArray(target.weapons) || target.weapons.length === 0) {
            return [];
        }
        return target.weapons
            .filter(weapon => weapon && weapon.name)
            .map(weapon => weapon.name);
    }

    _getCargoEntries(target) {
        if (!target) return [];
        const hold = Array.isArray(target.cargoHold) ? target.cargoHold : null;
        if (!hold || hold.length === 0) return [];
        const entries = hold
            .filter(entry => entry && entry.quantity > 0 && entry.name && typeof entry.name === 'string' && entry.name.trim().length > 0)
            .map(entry => ({ name: entry.name.trim(), quantity: entry.quantity }));
        entries.sort((a, b) => b.quantity - a.quantity);
        return entries;
    }

    _getActivityStatus(target) {
        if (!target || !target.currentState) return null;

        const state = target.currentState;
        const role = target.role;

        // Role-specific activity descriptions
        if (role === AI_ROLE.MINER) {
            if (target.asteroidTarget && !target.asteroidTarget.destroyed) {
                return 'Mining Asteroid';
            }
            if (state === AI_STATE.COLLECTING_CARGO) {
                return 'Collecting Ore';
            }
            if (target.shouldReturnToStation || (target.cargoCapacity > 0 && target.getCargoAmount && target.getCargoAmount() >= target.cargoCapacity)) {
                return 'Returning to Station';
            }
            if (state === AI_STATE.PATROLLING) {
                return 'Searching for Asteroids';
            }
        }

        // Repair ship status - check activity properties rather than state to avoid flickering
        if (role === AI_ROLE.REPAIR) {
            // Actively reconstructing a space object
            if (target._reconstructionTimer !== null && target._reconstructionTimer > 0) {
                return 'Reconstructing Structure';
            }
            // Actively repairing a target
            if (target.repairTarget && !target.repairTarget.destroyed) {
                const structureType = target.repairTarget.type || 'Structure';
                const typeName = structureType.charAt(0).toUpperCase() + structureType.slice(1);
                const distToTarget = target.pos && target.repairTarget.pos
                    ? dist(target.pos.x, target.pos.y, target.repairTarget.pos.x, target.repairTarget.pos.y)
                    : Infinity;
                if (distToTarget < 80) {
                    return `Repairing ${typeName}`;
                }
                return `En Route to ${typeName}`;
            }
            // Near station waiting
            if (state === AI_STATE.NEAR_STATION) {
                return 'Awaiting Deployment';
            }
            // Default for repair ships
            return 'On Patrol';
        }

        if (role === AI_ROLE.HAULER || role === AI_ROLE.TRANSPORT) {
            if (state === AI_STATE.COLLECTING_CARGO) {
                return 'Collecting Cargo';
            }
            if (state === AI_STATE.LEAVING_SYSTEM) {
                return 'Travelling to Jumpzone';
            }
            if (state === AI_STATE.TRANSPORTING) {
                return 'On Route';
            }
            if (state === AI_STATE.PATROLLING) {
                return 'On Route';
            }
            if (state === AI_STATE.FLEEING) {
                const hullPct = target.maxHull > 0 ? Math.round((target.hull / target.maxHull) * 100) : 0;
                return `Fleeing (${hullPct}% hull)`;
            }
        }

        if (role === AI_ROLE.POLICE) {
            if (state === AI_STATE.APPROACHING) {
                if (target.target) {
                    const tgtName = this._getShortTargetName(target.target);
                    return `Pursuing ${tgtName}`;
                }
                return 'Responding to Threat';
            }
            if (state === AI_STATE.ATTACK_PASS || state === AI_STATE.REPOSITIONING) {
                if (target.target) {
                    const tgtName = this._getShortTargetName(target.target);
                    return `Engaging ${tgtName}`;
                }
                return 'In Combat';
            }
            if (state === AI_STATE.PATROLLING) {
                return 'Patrolling';
            }
        }

        // General combat states with more detail
        if (state === AI_STATE.APPROACHING) {
            if (target.target) {
                const tgtName = this._getShortTargetName(target.target);
                return `Closing on ${tgtName}`;
            }
            return 'Closing In';
        }

        if (state === AI_STATE.ATTACK_PASS) {
            if (target.target) {
                const tgtName = this._getShortTargetName(target.target);
                return `Attack Run on ${tgtName}`;
            }
            return 'Attack Run';
        }

        if (state === AI_STATE.REPOSITIONING) {
            if (target.target) {
                const tgtName = this._getShortTargetName(target.target);
                return `Repositioning vs ${tgtName}`;
            }
            return 'Repositioning';
        }

        if (state === AI_STATE.SNIPING) {
            if (target.target) {
                const tgtName = this._getShortTargetName(target.target);
                return `Sniping ${tgtName}`;
            }
            return 'Sniping';
        }

        if (state === AI_STATE.FLEEING) {
            const hullPct = target.maxHull > 0 ? Math.round((target.hull / target.maxHull) * 100) : 0;
            return `Fleeing (${hullPct}% hull)`;
        }

        if (state === AI_STATE.COLLECTING_CARGO) {
            return 'Collecting Cargo';
        }

        if (state === AI_STATE.PATROLLING) {
            return 'Patrolling';
        }

        if (state === AI_STATE.GUARDING && target.principal) {
            const principalName = this._getShortTargetName(target.principal);
            return `Guarding ${principalName}`;
        }

        if (state === AI_STATE.GUARDING) {
            return 'On Guard Duty';
        }

        if (state === AI_STATE.IDLE) {
            // Check if stationary or drifting
            if (target.vel && target.vel.mag && target.vel.mag() > 10) {
                return 'Drifting';
            }
            return 'Idle';
        }

        if (state === AI_STATE.NEAR_STATION) {
            return 'Docked';
        }

        return null;
    }

    /**
     * Gets a shortened name for a target to display in status strings.
     * @param {Object} target - The target entity
     * @returns {string} Short display name (ship type)
     */
    _getShortTargetName(target) {
        if (!target) return 'Unknown';
        if (target instanceof Player) return 'You';
        // Prioritize ship type over pilot name
        if (typeof target.shipTypeName === 'string') {
            return target.shipTypeName;
        }
        if (target.constructor && target.constructor.name) {
            return target.constructor.name;
        }
        return 'Target';
    }

    /**
     * Gets additional tactical information about the target.
     * @param {Object} target - The target enemy ship
     * @returns {Array<string>} Array of tactical info strings
     */
    _getTacticalInfo(target) {
        if (!target) return [];
        const info = [];

        // Combat target info - show ship type
        if (target.target && !(target.target instanceof Player)) {
            const tgtShip = target.target.shipTypeName || 'Unknown';
            info.push(`Target: ${tgtShip}`);
        } else if (target.target instanceof Player) {
            info.push('Target: You');
        }

        return info;
    }

    // Message system methods
    addMessage(msg, color = [200, 200, 200], duration = this.messageDisplayTime) {
        this.messages.push({
            text: msg,
            time: millis(),
            color: color,
            duration: duration
        });
        if (this.messages.length > 10) this.messages.shift();
    }

    addCommunicationMessage(msg, color = [255, 190, 140], duration = this.communicationDisplayTime) {
        this.communicationMessages.push({
            text: msg,
            time: millis(),
            color: color,
            duration: duration
        });
        if (this.communicationMessages.length > this.communicationQueueLimit) {
            this.communicationMessages.shift();
        }
    }

    drawMessages() {
        const now = millis();
        const recent = this.messages.filter(m => now - m.time < (m.duration || this.messageDisplayTime));
        const toShow = recent.slice(-this.maxMessagesToShow);
        this._lastMessageBlockHeight = 0;

        push();
        textAlign(CENTER, BOTTOM);
        textFont(font);
        textSize(STATION_TEXT_SIZE.BODY);
        noStroke();
        for (let i = 0; i < toShow.length; i++) {
            const messageItem = toShow[i];
            const messageColor = messageItem.color || [200, 200, 200];

            if (typeof messageColor === 'string') {
                try {
                    fill(color(messageColor));
                } catch (e) {
                    fill(200, 200, 200);
                }
            } else if (Array.isArray(messageColor)) {
                fill(...messageColor);
            } else {
                fill(messageColor);
            }

            text(
                messageItem.text,
                width / 2,
                height - 10 - (toShow.length - 1 - i) * 22
            );
        }
        pop();

        if (toShow.length > 0) {
            this._lastMessageBlockHeight = toShow.length * 22 + 20;
        }

        this._drawCommunicationMessages();
    }

    _drawCommunicationMessages() {
        if (!this.communicationMessages || this.communicationMessages.length === 0) {
            return;
        }

        const now = millis();
        const recent = this.communicationMessages.filter(m => now - m.time < (m.duration || this.communicationDisplayTime));
        const toShow = recent.slice(-this.maxCommunicationMessagesToShow);

        if (toShow.length === 0) {
            this.communicationMessages = recent;
            return;
        }

        const boxPadding = 6;
        const lineHeight = 26;
        const boxWidth = Math.min(360, Math.max(300, width - 40));
        const baseX = 20;
        const autopilotOffset = (typeof player !== 'undefined' && player?.autopilotEnabled) ? 35 : 0;
        const baseY = 80 + autopilotOffset;

        push();
        textAlign(LEFT, TOP);
        textFont(font);
        textSize(STATION_TEXT_SIZE.BODY);

        for (let i = 0; i < toShow.length; i++) {
            const msg = toShow[i];
            const age = now - msg.time;
            const effectiveDuration = msg.duration || this.communicationDisplayTime;
            const fade = constrain(age / effectiveDuration, 0, 1);
            const easedFade = Math.pow(fade, 1.5);
            const alpha = 255 - (easedFade * 210);

            this._applyMessageFill(msg.color, alpha, [255, 190, 140, 255]);

            const textY = baseY + boxPadding + i * lineHeight;
            text(msg.text, baseX + boxPadding, textY);
        }
        pop();

        this.communicationMessages = recent;
    }

    _applyMessageFill(colorValue, alpha, fallback) {
        let applied = false;
        const targetAlpha = constrain(alpha, 0, 255);
        if (typeof colorValue === 'string') {
            try {
                const c = color(colorValue);
                fill(red(c), green(c), blue(c), Math.min(alpha(c), targetAlpha));
                applied = true;
            } catch (_) { }
        } else if (Array.isArray(colorValue)) {
            const [r = 200, g = 200, b = 200, a = 255] = colorValue;
            fill(r, g, b, Math.min(a, targetAlpha));
            applied = true;
        } else if (colorValue && typeof colorValue === 'object' && typeof colorValue.levels !== 'undefined') {
            const levels = colorValue.levels;
            if (Array.isArray(levels) && levels.length >= 3) {
                const existingAlpha = levels.length > 3 ? levels[3] : 255;
                fill(levels[0], levels[1], levels[2], Math.min(existingAlpha, targetAlpha));
                applied = true;
            }
        }

        if (!applied) {
            const [r = 200, g = 200, b = 200, a = 255] = fallback || [];
            fill(r, g, b, Math.min(a, targetAlpha));
        }
    }

    /**
     * Draws the current framerate.
     * @param {Array} fpsValues - Rolling FPS values array
     * @param {number} fpsAverage - Current average FPS
     */
    drawFramerate(fpsAverage) {
        push();
        noStroke();
        textAlign(LEFT, BOTTOM);
        textFont(font);
        textSize(STATION_TEXT_SIZE.HELPER);

        if (fpsAverage >= 50) {
            fill(0, 255, 0);
        } else if (fpsAverage >= 30) {
            fill(255, 255, 0);
        } else {
            fill(255, 0, 0);
        }

        text(`FPS: ${fpsAverage}`, 10, height - 10);
        pop();
    }

    /**
     * Draws the Game Over overlay screen.
     */
    drawGameOverScreen() {
        // Draw simple background starfield (shared singleton)
        if (typeof sharedStarfield !== 'undefined' && sharedStarfield && typeof sharedStarfield.draw === 'function') {
            sharedStarfield.draw();
        } else {
            // Use centralized starfield background color
            const bg = (typeof STARFIELD_CONFIG !== 'undefined') ? STARFIELD_CONFIG.BACKGROUND_COLOR : { r: 10, g: 15, b: 40 };
            background(bg.r, bg.g, bg.b);
        }

        push();

        textAlign(CENTER, CENTER);
        textFont(font);
        // Prefer the global extruded helper for the GAME OVER header
        if (typeof drawExtrudedText === 'function') {
            drawExtrudedText("GAME OVER", width / 2, height / 2 - 80, STATION_TEXT_SIZE.GAME_OVER, 12, 0, [255, 60, 60]);
        } else if (typeof titleScreen !== 'undefined' && typeof titleScreen.drawExtrudedText === 'function') {
            titleScreen.drawExtrudedText("GAME OVER", width / 2, height / 2 - 80, STATION_TEXT_SIZE.GAME_OVER, 12, 0, [255, 60, 60]);
        } else {
            fill(255, 60, 60);
            textSize(STATION_TEXT_SIZE.GAME_OVER);
            text("GAME OVER", width / 2, height / 2 - 80);
        }

        UIComponents.setTextStyle({ fill: 255, size: 30 });
        text("Click anywhere or press any key to start again", width / 2, height / 2 + 20);

        pop();
    }
    /**
     * Checks if a click occurred on the mission info box
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @returns {boolean} True if clicked
     */
    checkMissionClick(mx, my) {
        if (!this.missionBoxArea) return false;

        const b = this.missionBoxArea;
        return (mx >= b.x && mx <= b.x + b.w &&
            my >= b.y && my <= b.y + b.h);
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIHUD = UIHUD;
}
