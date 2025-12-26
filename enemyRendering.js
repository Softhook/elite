// ****** enemyRendering.js ******
// Enemy Rendering Methods - Stage 10
// Contains draw methods and visual effects

/**
 * EnemyRendering class contains rendering methods for enemies.
 * These methods are mixed into the Enemy prototype via applyEnemyRenderingMethods().
 */
class EnemyRendering {

    /**
     * Draws a small turret on top of the ship.
     * The turret will track the target when the turret weapon is selected.
     * This method is called within the ship's rotated coordinate space.
     */
    drawTurret() {
        // Turret is drawn in ship-local coordinates (already rotated with ship)
        const turretSize = this.size * 0.2; // Small turret relative to ship size

        // Initialize turret definitions if not ready (Static cache on EnemyRendering)
        if (!EnemyRendering.TURRET_DEFS) {
            EnemyRendering.TURRET_DEFS = {
                base: {
                    vertexData: [],
                    fillColor: [80, 90, 100],
                    strokeColor: [120, 130, 140],
                    strokeW: 1
                },
                barrel: {
                    vertexData: [
                        { x: 0, y: -0.2 },
                        { x: 0.8, y: -0.2 },
                        { x: 0.8, y: 0.2 },
                        { x: 0, y: 0.2 }
                    ],
                    fillColor: [60, 70, 80],
                    strokeColor: [100, 110, 120],
                    strokeW: 1
                }
            };

            // Create octagon for base
            for (let i = 0; i < 8; i++) {
                let a = i * TWO_PI / 8;
                EnemyRendering.TURRET_DEFS.base.vertexData.push({ x: cos(a), y: sin(a) });
            }

            // Initialize caches using the global helper from ships.js
            if (typeof initShipCache === 'function') {
                initShipCache(EnemyRendering.TURRET_DEFS.base);
                initShipCache(EnemyRendering.TURRET_DEFS.barrel);
            }
        }

        // Calculate turret angle
        let turretAngle = 0; // Default: facing forward (ship's direction)

        // If this is the selected weapon and we have a target, track it
        if (this.currentWeapon && this.currentWeapon.type === WEAPON_TYPE.TURRET) {
            if (this.lastTurretFiringAngle !== null) {
                // Use the last firing angle to keep visual synced with bullets
                turretAngle = this.lastTurretFiringAngle - this.angle;
            } else {
                // Find nearest target for initial tracking
                const target = WeaponSystem.findNearestTarget(this, this.currentSystem);

                if (target && target.pos) {
                    // Calculate angle to target in world space
                    const dx = target.pos.x - this.pos.x;
                    const dy = target.pos.y - this.pos.y;
                    const angleToTarget = atan2(dy, dx);

                    // Convert to ship-local angle (subtract ship's angle since we're already rotated)
                    turretAngle = angleToTarget - this.angle;
                    // Set it for future use
                    this.lastTurretFiringAngle = angleToTarget;
                }
            }
        }

        // Check if we can use the 3D extrusion method
        if (typeof drawExtrudedPolyOptimized === 'function' && EnemyRendering.TURRET_DEFS.base._cache) {
            // Calculate depths
            const turretBaseDepth = turretSize * 0.4;
            const turretBarrelDepth = turretSize * 0.3;

            // Calculate sun angle for lighting
            const sunAngle = atan2(-this.pos.y, -this.pos.x);
            const localSunAngle = sunAngle - this.angle;

            // --- Draw Base ---
            // Calculate extrusion vector for base to offset it "up" (screen Y negative)
            // In local space (rotated by this.angle), "up" is (-sin(angle), -cos(angle))
            const baseDvx = turretBaseDepth * sin(this.angle);
            const baseDvy = turretBaseDepth * cos(this.angle);

            push(); // Save state before base translation
            translate(-baseDvx, -baseDvy); // Move "up" so bottom sits on ship

            // Draw Turret Base (Fixed to ship)
            // Create a local copy of the cached layer and boost its base color
            const baseLayer = EnemyRendering.TURRET_DEFS.base._cache.layers[0];
            const baseLayerBoost = Object.assign({}, baseLayer);
            const baseBoost = 1.5; // stronger contrast
            baseLayerBoost.fillRGB = {
                r: Math.min(255, Math.round((baseLayer.fillRGB.r || 100) * baseBoost)),
                g: Math.min(255, Math.round((baseLayer.fillRGB.g || 100) * baseBoost)),
                b: Math.min(255, Math.round((baseLayer.fillRGB.b || 100) * baseBoost))
            };

            drawExtrudedPolyOptimized(
                turretSize * 0.6, // radius
                baseLayerBoost,
                turretBaseDepth,
                this.angle,
                localSunAngle
            );

            // Add a subtle specular highlight on the top face toward the light
            try {
                const verts = baseLayer.vertexData || [];
                if (verts.length > 0) {
                    let sx = 0, sy = 0;
                    for (let v of verts) { sx += v.x; sy += v.y; }
                    sx /= verts.length; sy /= verts.length;
                    // scale by radius used above
                    const cx = sx * (turretSize * 0.6);
                    const cy = sy * (turretSize * 0.6);

                    const hOffset = turretSize * 0.08;
                    const hx = cx + cos(localSunAngle) * hOffset;
                    const hy = cy + sin(localSunAngle) * hOffset;

                    push();
                    noStroke();
                    fill(255, 255, 255, 90);
                    // small elliptical specular
                    ellipse(hx, hy, turretSize * 0.12, turretSize * 0.06);
                    pop();
                }
            } catch (e) { /* ignore highlight errors */ }

            // --- Draw Barrel ---
            // We want to stack the barrel ON TOP of the base.
            // So we translate "up" again by the barrel's depth.
            // We are still in the ship's coordinate system (rotated by this.angle).
            const barrelOffsetX = turretBarrelDepth * sin(this.angle);
            const barrelOffsetY = turretBarrelDepth * cos(this.angle);

            translate(-barrelOffsetX, -barrelOffsetY);

            push(); // Save state for rotation
            rotate(turretAngle);

            // Adjust angles for the barrel's rotation
            const barrelWorldAngle = this.angle + turretAngle;
            const barrelLocalSunAngle = sunAngle - barrelWorldAngle;

            // Boost barrel shading slightly less than base
            const barrelLayer = EnemyRendering.TURRET_DEFS.barrel._cache.layers[0];
            const barrelLayerBoost = Object.assign({}, barrelLayer);
            const barrelBoost = 1.35;
            barrelLayerBoost.fillRGB = {
                r: Math.min(255, Math.round((barrelLayer.fillRGB.r || 80) * barrelBoost)),
                g: Math.min(255, Math.round((barrelLayer.fillRGB.g || 80) * barrelBoost)),
                b: Math.min(255, Math.round((barrelLayer.fillRGB.b || 80) * barrelBoost))
            };

            drawExtrudedPolyOptimized(
                turretSize, // radius/scale
                barrelLayerBoost,
                turretBarrelDepth,
                barrelWorldAngle,
                barrelLocalSunAngle
            );

            // Barrel specular
            try {
                const verts = barrelLayer.vertexData || [];
                if (verts.length > 0) {
                    let sx = 0, sy = 0;
                    for (let v of verts) { sx += v.x; sy += v.y; }
                    sx /= verts.length; sy /= verts.length;
                    const cx = sx * turretSize;
                    const cy = sy * turretSize;
                    const hOffset = turretSize * 0.06;
                    const hx = cx + cos(barrelLocalSunAngle) * hOffset;
                    const hy = cy + sin(barrelLocalSunAngle) * hOffset;

                    push();
                    noStroke();
                    fill(255, 255, 255, 110);
                    ellipse(hx, hy, turretSize * 0.14, turretSize * 0.06);
                    pop();
                }
            } catch (e) { /* ignore */ }
            pop(); // Restore rotation

            pop(); // Restore translation (base + barrel)

        } else {
            // Fallback to 2D drawing if 3D helpers are missing
            push();
            fill(80, 90, 100);
            stroke(120, 130, 140);
            strokeWeight(1);
            ellipse(0, 0, turretSize * 1.2, turretSize * 1.2);

            rotate(turretAngle);
            fill(60, 70, 80);
            stroke(100, 110, 120);
            strokeWeight(1);
            rect(0, -turretSize * 0.2, turretSize * 0.8, turretSize * 0.4);

            fill(80, 90, 100);
            rect(turretSize * 0.8, -turretSize * 0.15, turretSize * 0.2, turretSize * 0.3);
            pop();
        }
    }

    /** Draws the enemy ship using its specific draw function and adds UI elements. */
    draw() {
        // Allow rendering while jump-fading even if `destroyed` is set so the visual
        // fade-back can complete after logical destruction.
        if ((this.destroyed && !this._isJumpFading) || isNaN(this.angle)) return;


        // Cache current time (avoid multiple millis() calls per frame)
        const now = millis();

        if (!this.p5FillColor || !this.p5StrokeColor) { this.initializeColors(); }
        if (!this.p5FillColor || !this.p5StrokeColor) { return; }

        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        const drawFunc = shipDef?.drawFunction;
        if (typeof drawFunc !== 'function') {
            console.error(`Enemy draw: No draw function for ${this.shipTypeName}`);
            push(); translate(this.pos.x, this.pos.y); fill(255, 0, 0, 150); noStroke(); ellipse(0, 0, this.size, this.size); pop();
            return;
        }

        // --- Start Ship Drawing Block ---
        push();
        translate(this.pos.x, this.pos.y);

        // --- Draw Info Label (BEFORE rotation) ---
        if (!this.destroyed) {
            push();
            textFont(font);
            textAlign(CENTER, BOTTOM);
            textSize(STATION_TEXT_SIZE.BODY);
            fill(255);
            noStroke();

            let stateKey = AI_STATE_NAME[this.currentState] || "UNKNOWN";
            let targetLabel = "None"; // Default

            // State-based target labeling for non-combat roles
            if (this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.NEAR_STATION) {
                // Check if patrol target is the station
                if (this.patrolTargetPos && this.currentSystem?.station?.pos &&
                    this.patrolTargetPos.dist(this.currentSystem.station.pos) < 50) {
                    targetLabel = "Station";
                } else {
                    targetLabel = "Patrol Point"; // Or just "Patrolling"
                }
            } else if (this.currentState === AI_STATE.LEAVING_SYSTEM) {
                // Check if patrol target is the jump zone
                if (this.patrolTargetPos && this.currentSystem?.jumpZoneCenter &&
                    this.patrolTargetPos.dist(this.currentSystem.jumpZoneCenter) < 50) {
                    targetLabel = "Jump Zone";
                } else {
                    targetLabel = "System Edge"; // Fallback if jump zone unknown/not targeted
                }
            } else if (this.currentState === AI_STATE.TRANSPORTING) {
                // Attempt to resolve the destination name (routePoints or patrolTargetPos)
                let destName = null;
                let destPos = null;
                if (this.routePoints && Number.isFinite(this.currentRouteIndex)) {
                    destPos = this.routePoints[this.currentRouteIndex];
                } else if (this.patrolTargetPos) {
                    destPos = this.patrolTargetPos;
                }

                if (destPos && this.currentSystem) {
                    // Check station first
                    if (this.currentSystem.station && this.currentSystem.station.pos && destPos.dist && destPos.dist(this.currentSystem.station.pos) < 60) {
                        destName = this.currentSystem.station.name || "Station";
                    } else if (Array.isArray(this.currentSystem.planets)) {
                        for (let p of this.currentSystem.planets) {
                            if (p && p.pos && destPos.dist && destPos.dist(p.pos) < 60) {
                                destName = p.name || "Planet";
                                break;
                            }
                        }
                    }
                }

                // If the transporter has an explicit destination object (SpaceObject), prefer that display
                if (!destName && this.destinationObject && typeof this.destinationObject.getDisplayName === 'function') {
                    let planetName = null;
                    try {
                        if (typeof this.destinationObject.planetIndex === 'number' && Array.isArray(this.currentSystem?.planets)) {
                            const p = this.currentSystem.planets[this.destinationObject.planetIndex];
                            if (p) planetName = p.name;
                        }
                    } catch (e) { /* ignore */ }
                    const soName = this.destinationObject.getDisplayName();
                    destName = planetName ? `${soName} @ ${planetName}` : soName;
                }

                if (destName) targetLabel = `Delivery to ${destName}`;
                else targetLabel = "Delivery";
            }
            // --- End State-Based Labeling ---

            // --- Fallback to this.target if no state-based label was set ---
            // (Or if in a combat/other state where this.target is relevant)
            else if (this.target) { // Check if target exists
                if (this.currentState === AI_STATE.COLLECTING_CARGO && this.target instanceof Cargo) {
                    targetLabel = `Cargo (${this.target.type})`;
                } else if (this.target instanceof Player) {
                    targetLabel = "Player";
                } else if (this.target instanceof Enemy && this.target.shipTypeName) {
                    targetLabel = this.target.shipTypeName;
                } else if (this.target instanceof Cargo) {
                    targetLabel = `Cargo (${this.target.type})`;
                } else {
                    // Check for Station/Planet if targeted directly (less common now)
                    if (this.target.constructor.name === 'Station') targetLabel = "Station";
                    else if (this.target.constructor.name === 'Planet') targetLabel = this.target.name || "Planet";
                    else targetLabel = this.target.name || this.target.constructor.name || "Unknown";
                }
            } // targetLabel remains "None" if this.target is null and no state-based label applied

            // DUAL-ENGAGE: Check for secondary target and add to label
            let secondaryTargetLabel = null;
            if (typeof this.canDualEngage === 'function' && this.canDualEngage() &&
                this.currentSystem && this.target &&
                typeof this.findSecondaryTarget === 'function') {
                const secondaryTarget = this.findSecondaryTarget(this.currentSystem, this.target);
                if (secondaryTarget) {
                    if (secondaryTarget instanceof Player) {
                        secondaryTargetLabel = "Player";
                    } else if (secondaryTarget instanceof Enemy && secondaryTarget.shipTypeName) {
                        secondaryTargetLabel = secondaryTarget.shipTypeName;
                    } else if (secondaryTarget.name) {
                        secondaryTargetLabel = secondaryTarget.name;
                    } else {
                        secondaryTargetLabel = "Target";
                    }
                }
            }

            // UPDATED: Add system name to label (unused system reference removed for perf)

            const baseShipName = shipDef?.name || this.shipTypeName;
            const namePrefix = this.displayName ? `${this.displayName} • ${baseShipName}` : baseShipName;

            // Build label with primary target (and secondary if applicable)
            let label;
            if (secondaryTargetLabel) {
                label = `${namePrefix}  Targets: ${targetLabel} + ${secondaryTargetLabel}`;
            } else {
                label = `${namePrefix}  Target: ${targetLabel}`;
            }
            text(label, 0, -this.size / 2 - 15);

            pop();
        }
        // --- End Info Label ---

        // Calculate sun angle relative to ship's rotation for 3D shading
        const sunAngle = atan2(-this.pos.y, -this.pos.x);
        const localSunAngle = sunAngle - this.angle;

        rotate(this.angle);

        fill(this.p5FillColor); stroke(this.p5StrokeColor);
        strokeWeight(1);
        let showThrust = (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION);
        try { drawFunc(this.size, showThrust, this.angle, localSunAngle); } // Call specific draw function
        catch (e) { console.error(`Error executing draw function ${drawFunc.name || '?'} for ${this.shipTypeName}:`, e); ellipse(0, 0, this.size, this.size); } // Fallback

        // Turret drawing removed - bullets fire without visible turret

        // Draw tangle effect if active
        if (this.dragMultiplier > 1.0) {
            // Simply check if we still have drag effect time remaining
            if (this.dragEffectTimer > 0) {
                // Calculate opacity - fade out during last second
                const opacity = this.dragEffectTimer < 1.0 ?
                    map(this.dragEffectTimer, 0, 1.0, 0, 180) :
                    180;

                // Draw energy tethers with proper opacity
                noFill();
                //stroke(30, 220, 120, opacity);
                stroke(200, 180);
                strokeWeight(2);

                for (let i = 0; i < 6; i++) {
                    let angle = now * 0.0018 + i * TWO_PI / 6; // 0.03 * 60 = 1.8 rad/s -> 0.0018
                    let innerRadius = this.size * 0.6;
                    let outerRadius = this.size * (1.2 + 0.2 * sin(now * 0.006 + i)); // 0.1 * 60 = 6 rad/s -> 0.006

                    beginShape();
                    for (let j = 0; j < 5; j++) {
                        let r = map(j % 2, 0, 1, innerRadius, outerRadius);
                        let jitterAmount = map(j, 0, 4, 0, 5);
                        let jitter = random(-jitterAmount, jitterAmount);
                        let x = cos(angle + j * 0.4) * r + jitter;
                        let y = sin(angle + j * 0.4) * r + jitter;
                        vertex(x, y);
                    }
                    endShape();
                }
            }
        }

        // --- NEW: Draw Player's Target Indicator ---
        // Check if THIS enemy instance is the player's current target.
        // Assumes 'player' is globally accessible (which it is in your sketch.js).
        if (typeof player !== 'undefined' && player.target === this) {
            push(); // Isolate transformations for this indicator

            // The canvas is already rotated to the enemy's angle.
            // Drawing here will make the indicator rotate with the enemy.
            noFill();
            stroke(0, 255, 0, 200); // Bright green, semi-transparent
            strokeWeight(2);

            // Example: A circle around the ship
            ellipse(0, 0, this.size * 1.6, this.size * 1.6); // Slightly larger than shield

            // Example: Corner brackets
            const bracketSize = this.size * 0.3;
            const offset = this.size * 0.7; // Adjust offset to position brackets correctly
            // Top-left
            line(-offset, -offset, -offset + bracketSize, -offset);
            line(-offset, -offset, -offset, -offset + bracketSize);
            // Top-right
            line(offset, -offset, offset - bracketSize, -offset);
            line(offset, -offset, offset, -offset + bracketSize);
            // Bottom-left
            line(-offset, offset, -offset + bracketSize, offset);
            line(-offset, offset, -offset, offset - bracketSize);
            // Bottom-right
            line(offset, offset, offset - bracketSize, offset);
            line(offset, offset, offset, offset - bracketSize);

            pop(); // Restore drawing state
        }
        // --- END NEW: Draw Player's Target Indicator ---

        // --- Draw Health Bar (AFTER rotation, relative to 0,0) ---
        if (!this.destroyed && this.hull < this.maxHull && this.maxHull > 0) {
            // Rotate canvas back temporarily to draw horizontal bar
            push();
            rotate(-this.angle); // Counter-rotate

            let healthPercent = this.hull / this.maxHull;
            let barW = this.size * 0.9;
            let barH = 6;
            // Position relative to the translated origin (0,0), offset below
            let barX = -barW / 2;
            let barY = this.size / 2 + 5;

            noStroke();
            fill(255, 0, 0); // Red background
            rect(barX, barY, barW, barH);
            fill(0, 255, 0); // Green health remaining
            rect(barX, barY, barW * healthPercent, barH);
            //stroke(0); strokeWeight(1); noFill(); // Black outline
            //rect(barX, barY, barW, barH);

            pop(); // Restore rotation state (ship is still rotated)
        }
        // --- End Health Bar ---

        pop(); // End Ship Drawing Block

        // Draw thrust particles ON TOP of the ship
        this.thrustManager.draw();

        // --- Draw Jump Fade Overlay (when ship is leaving via jump zone) ---
        if (this._isJumpFading && this._jumpFadeTimer > 0) {
            const phase = this._jumpFadePhase || 'out';
            const dur = (phase === 'out')
                ? ((this._jumpFadeOutDuration && this._jumpFadeOutDuration > 0) ? this._jumpFadeOutDuration : 0.35)
                : ((this._jumpFadeInDuration && this._jumpFadeInDuration > 0) ? this._jumpFadeInDuration : 1.2);
            let progress;
            if (phase === 'out') {
                // progress 0 -> 1 while fading TO white
                progress = 1 - (this._jumpFadeTimer / dur);
            } else {
                // 'in' phase: progress 1 -> 0 while fading BACK to transparent
                progress = (this._jumpFadeTimer / dur);
            }
            const alpha = constrain(progress * 255, 0, 255);
            push();
            translate(this.pos.x, this.pos.y);
            noStroke();
            fill(255, 255, 255, alpha);
            // Slightly larger than ship to cover shields/thrusters
            ellipse(0, 0, this.size * 1.4, this.size * 1.4);
            pop();
        }

        // --- Draw Shield Effect (Separate transformation) ---
        if (!this.destroyed && this.shield > 0 && !this.shieldsDisabled) {
            push(); // Isolate shield drawing
            translate(this.pos.x, this.pos.y); // Translate to ship center

            const shieldPercent = this.shield / this.maxShield;
            const shieldAlpha = map(shieldPercent, 0, 1, 40, 80);
            noFill(); stroke(100, 180, 255, shieldAlpha); strokeWeight(1.5);
            ellipse(0, 0, this.size * 1.3, this.size * 1.3);

            // Shield hit visual effect
            const sinceShieldHit = now - this.shieldHitTime;
            if (sinceShieldHit < 300) {
                const hitOpacity = map(sinceShieldHit, 0, 300, 200, 0);
                stroke(150, 220, 255, hitOpacity); strokeWeight(3);
                ellipse(0, 0, this.size * 1.4, this.size * 1.4);
            }
            pop(); // End shield drawing
        }
        // --- End Shield Effect ---

        // --- Draw Barrier Effect (Separate transformation) ---
        if (!this.destroyed && this.isBarrierActive) {
            push();
            translate(this.pos.x, this.pos.y);
            noFill();
            // Pulsating effect for the barrier (mirroring player.js)
            const barrierPulse = (sin(now * 0.006) + 1) / 2; // Ranges from 0 to 1
            const barrierBaseRadius = this.size * 1.7; // Consistent base size with player
            const barrierRadius = barrierBaseRadius + barrierPulse * this.size * 0.2; // Pulsating outer radius

            // Alpha fades as duration runs out
            const barrierDuration = this.currentWeapon?.duration || 5;
            const barrierAlpha = map(this.barrierDurationTimer, 0, barrierDuration, 50, 150);

            const activeBarrierColor = this.barrierColor || [100, 100, 255];

            strokeWeight(2 + barrierPulse * 1.5); // Thicker and pulsating stroke
            stroke(activeBarrierColor[0], activeBarrierColor[1], activeBarrierColor[2], barrierAlpha);
            ellipse(0, 0, barrierRadius * 2, barrierRadius * 2); // Diameter

            // Optional: Add a secondary, fainter pulsating ring (mirroring player.js)
            strokeWeight(1 + barrierPulse * 1);
            stroke(activeBarrierColor[0], activeBarrierColor[1], activeBarrierColor[2], barrierAlpha * 0.5);
            ellipse(0, 0, barrierRadius * 2 * 1.15, barrierRadius * 2 * 1.15); // Slightly larger diameter for second ring
            pop();
        }
        // --- End Barrier Effect ---

        // --- Draw Other Effects (Force Wave, Beam, Range) ---
        // These use absolute coordinates or manage their own transformations
        // NOTE: Targeting line is drawn separately via drawTargetingLine() BEFORE ships
        // to ensure it appears underneath ships, not on top

        this._handleTargetLockOnSound();
        // DEBUG LINE
        //if (this.target?.pos && this.role !== AI_ROLE.HAULER && (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS || this.role === AI_ROLE.ALIEN)) { 
        //     push(); let lineCol = this.p5StrokeColor; try { if (lineCol?.setAlpha) { lineCol.setAlpha(100); stroke(lineCol); } else { stroke(255, 0, 0, 100); } } catch(e) { stroke(255, 0, 0, 100); } strokeWeight(1); line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y); pop();
        //}

        // Force wave effect
        if (this.lastForceWave && now - this.lastForceWave.time < 300) {
            const timeSinceForce = now - this.lastForceWave.time;
            const alpha = map(timeSinceForce, 0, 300, 200, 0);
            push();
            translate(this.pos.x, this.pos.y); // Use absolute position
            noFill(); strokeWeight(3);
            stroke(this.lastForceWave.color[0], this.lastForceWave.color[1], this.lastForceWave.color[2], alpha);
            const radius = map(timeSinceForce, 0, 300, 10, 40);
            circle(0, 0, radius * 2);
            pop();
        }

        // Beam effect
        if (this.lastBeam && now - this.lastBeam.time < 150) {
            push();
            stroke(this.lastBeam.color); strokeWeight(3);
            line(this.lastBeam.start.x, this.lastBeam.start.y, this.lastBeam.end.x, this.lastBeam.end.y);
            stroke(this.lastBeam.color[0], this.lastBeam.color[1], this.lastBeam.color[2], 100); strokeWeight(6);
            line(this.lastBeam.start.x, this.lastBeam.start.y, this.lastBeam.end.x, this.lastBeam.end.y);
            pop();
        }

        // Weapon range indicator
        if (this.currentWeapon && this.target && this.isTargetValid(this.target) &&
            (this.currentState === AI_STATE.APPROACHING ||
                this.currentState === AI_STATE.ATTACK_PASS ||
                this.currentState === AI_STATE.REPOSITIONING)) {
            push();
            stroke(200, 200, 0, 100); noFill(); strokeWeight(1);
            circle(this.pos.x, this.pos.y, this.visualFiringRange * 2); // Use absolute position
            pop();
        }

        // --- Repair Beam Effect (REPAIR role) ---
        if (this.role === AI_ROLE.REPAIR && this.repairTarget && this.currentState === AI_STATE.IDLE) {
            const distToTarget = dist(this.pos.x, this.pos.y, this.repairTarget.pos.x, this.repairTarget.pos.y);

            if (distToTarget < 80) { // Within repair range
                push();

                // Draw pulsing repair beam
                const pulsePhase = (now * 0.003) % 1;
                const alpha = 100 + 100 * Math.sin(pulsePhase * TWO_PI);

                stroke(100, 255, 200, alpha);
                strokeWeight(2 + Math.sin(pulsePhase * TWO_PI) * 0.5);
                line(this.pos.x, this.pos.y, this.repairTarget.pos.x, this.repairTarget.pos.y);

                // Draw glow at endpoints
                noStroke();
                fill(100, 255, 200, alpha * 0.6);
                ellipse(this.pos.x, this.pos.y, 8, 8);
                ellipse(this.repairTarget.pos.x, this.repairTarget.pos.y, 12, 12);

                pop();
            }
        }

        // --- Reconstruction Ring Effect (REPAIR role) ---
        if (this.role === AI_ROLE.REPAIR && this._reconstructionTimer !== null && this._reconstructionTimer > 0) {
            push();
            translate(this.pos.x, this.pos.y);

            const progress = 1 - (this._reconstructionTimer / 5.0); // 5 seconds total
            const radius = this.size * (1 + progress * 2);
            const alpha = 150 * (1 - progress);

            noFill();
            stroke(255, 200, 100, alpha);
            strokeWeight(2);
            ellipse(0, 0, radius * 2, radius * 2);

            // Rotating construction indicators
            const rotation = (now * 0.002) % TWO_PI;
            for (let i = 0; i < 4; i++) {
                const angle = rotation + i * (TWO_PI / 4);
                const x = Math.cos(angle) * radius;
                const y = Math.sin(angle) * radius;

                fill(255, 200, 100, alpha);
                noStroke();
                ellipse(x, y, 6, 6);
            }

            pop();
        }
        // --- End Other Effects ---

    } // End draw()



    /**
     * @private
     * Handles the lock-on sound effect when specific conditions are met.
     * The targeting LINE is drawn separately via drawTargetingLine().
     */
    _handleTargetLockOnSound() {
        const conditionsMetForLine = this.isTargetValid(this.target) &&
            this.role !== AI_ROLE.HAULER &&
            (this.currentState === AI_STATE.APPROACHING ||
                this.currentState === AI_STATE.ATTACK_PASS ||
                this.role === AI_ROLE.ALIEN);

        if (conditionsMetForLine) {
            // --- Sound Logic: Play only when target is Player with global and per-enemy cooldowns ---
            if (this.target instanceof Player) {
                const now = Date.now();
                const GLOBAL_LOCK_SOUND_COOLDOWN_MS = 3000;
                const PER_ENEMY_LOCK_SOUND_COOLDOWN_MS = 5000;

                if (typeof EnemyRendering._lastLockOnSoundTime !== 'number') {
                    EnemyRendering._lastLockOnSoundTime = 0;
                }
                if (typeof this._lastLockOnSoundTime !== 'number') {
                    this._lastLockOnSoundTime = 0;
                }

                const globalCooldownOk = (now - EnemyRendering._lastLockOnSoundTime) >= GLOBAL_LOCK_SOUND_COOLDOWN_MS;
                const perEnemyCooldownOk = (now - this._lastLockOnSoundTime) >= PER_ENEMY_LOCK_SOUND_COOLDOWN_MS;

                if (!this.hasPlayedLockOnSound && globalCooldownOk && perEnemyCooldownOk) {
                    if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                        soundManager.playSound('targetlock');
                    }
                    this.hasPlayedLockOnSound = true;
                    this._lastLockOnSoundTime = now;
                    EnemyRendering._lastLockOnSoundTime = now;
                }
            } else {
                this.hasPlayedLockOnSound = false;
            }
        } else {
            this.hasPlayedLockOnSound = false;
        }
    }

    /**
     * Draws the targeting line from this enemy to its target.
     * Called separately from draw() to allow proper layering (lines underneath ships).
     */
    drawTargetingLine() {
        const shouldDrawLine = this.isTargetValid(this.target) &&
            this.role !== AI_ROLE.HAULER &&
            (this.currentState === AI_STATE.APPROACHING ||
                this.currentState === AI_STATE.ATTACK_PASS ||
                this.role === AI_ROLE.ALIEN);

        if (!shouldDrawLine) return;

        try {
            const sc = this.strokeColorValue;
            push();
            if (Array.isArray(sc) && sc.length >= 3) {
                stroke(sc[0], sc[1], sc[2], 100);
            } else {
                stroke(255, 0, 0, 100);
            }
            strokeWeight(1);
            line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
            pop();
        } catch (e) {
            push(); stroke(255, 0, 0, 100); strokeWeight(1);
            line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y); pop();
        }
    }
}

/**
 * Apply EnemyRendering methods to Enemy prototype
 */
function applyEnemyRenderingMethods() {
    // Get all method names from EnemyRendering prototype
    Object.getOwnPropertyNames(EnemyRendering.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyRendering.prototype[methodName];
        }
    });
}
