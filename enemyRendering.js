// ****** enemyRendering.js ******
// Enemy Rendering Methods - Stage 10
// Contains draw methods and visual effects

/**
 * EnemyRendering class contains rendering methods for enemies.
 * These methods are mixed into the Enemy prototype via applyEnemyRenderingMethods().
 */
class EnemyRendering {

    /** Draws the enemy ship using its specific draw function and adds UI elements. */
    draw() {
        if (this.destroyed || isNaN(this.angle)) return;


        if (!this.p5FillColor || !this.p5StrokeColor) { this.initializeColors(); }
        if (!this.p5FillColor || !this.p5StrokeColor) { return; }

        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        const drawFunc = shipDef?.drawFunction;
        if (typeof drawFunc !== 'function') {
            console.error(`Enemy draw: No draw function for ${this.shipTypeName}`);
            push(); translate(this.pos.x, this.pos.y); fill(255,0,0, 150); noStroke(); ellipse(0,0,this.size,this.size); pop();
            return;
        }

       
        this.thrustManager.draw();



        // --- Start Ship Drawing Block ---
        push();
        translate(this.pos.x, this.pos.y);

        // --- Draw Info Label (BEFORE rotation) ---
        if (!this.destroyed) {
            push();
            textFont(font);
            textAlign(CENTER, BOTTOM);
            textSize(20);
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
                 // Could add logic here to identify destination type (planet/station)
                 targetLabel = "Delivery"; // Simple label for now
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

            // UPDATED: Add system name to label
            const system = this.getSystem();

            
            //let label = `${this.shipTypeName} (${this.role}) | ${stateKey} | Target: ${targetLabel}`;
            let label = `${shipDef?.name}  Target: ${targetLabel}`;
            text(label, 0, -this.size / 2 - 15);

            pop();
        }
        // --- End Info Label ---

        rotate(this.angle);

        fill(this.p5FillColor); stroke(this.p5StrokeColor);
        strokeWeight(1);
        let showThrust = (this.currentState !== AI_STATE.IDLE && this.currentState !== AI_STATE.NEAR_STATION);
        try { drawFunc(this.size, showThrust); } // Call specific draw function
        catch (e) { console.error(`Error executing draw function ${drawFunc.name || '?'} for ${this.shipTypeName}:`, e); ellipse(0,0,this.size, this.size); } // Fallback

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
                    let angle = frameCount * 0.03 + i * TWO_PI / 6;
                    let innerRadius = this.size * 0.6;
                    let outerRadius = this.size * (1.2 + 0.2 * sin(frameCount * 0.1 + i));
                    
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

        // --- Draw Shield Effect (Separate transformation) ---
        if (!this.destroyed && this.shield > 0 && !this.shieldsDisabled) {
            push(); // Isolate shield drawing
            translate(this.pos.x, this.pos.y); // Translate to ship center

            const shieldPercent = this.shield / this.maxShield;
            const shieldAlpha = map(shieldPercent, 0, 1, 40, 80);
            noFill(); stroke(100, 180, 255, shieldAlpha); strokeWeight(1.5);
            ellipse(0, 0, this.size * 1.3, this.size * 1.3);

            // Shield hit visual effect
            if (millis() - this.shieldHitTime < 300) {
                const hitOpacity = map(millis() - this.shieldHitTime, 0, 300, 200, 0);
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
            const barrierPulse = (sin(frameCount * 0.1) + 1) / 2; // Ranges from 0 to 1
            const barrierBaseRadius = this.size * 1.7; // Consistent base size with player
            const barrierRadius = barrierBaseRadius + barrierPulse * this.size * 0.2; // Pulsating outer radius

            // Alpha fades as duration runs out
            const barrierAlpha = map(this.barrierDurationTimer, 0, this.currentWeapon?.duration || 5, 50, 150);
            
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

        // --- Draw Other Effects (Debug Line, Force Wave, Beam, Range) ---
        // These use absolute coordinates or manage their own transformations

        this._drawTargetLockOnEffect();
        // DEBUG LINE
        //if (this.target?.pos && this.role !== AI_ROLE.HAULER && (this.currentState === AI_STATE.APPROACHING || this.currentState === AI_STATE.ATTACK_PASS || this.role === AI_ROLE.ALIEN)) { 
        //     push(); let lineCol = this.p5StrokeColor; try { if (lineCol?.setAlpha) { lineCol.setAlpha(100); stroke(lineCol); } else { stroke(255, 0, 0, 100); } } catch(e) { stroke(255, 0, 0, 100); } strokeWeight(1); line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y); pop();
        //}

        // Force wave effect
        if (this.lastForceWave && millis() - this.lastForceWave.time < 300) {
            const timeSinceForce = millis() - this.lastForceWave.time;
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
        if (this.lastBeam && millis() - this.lastBeam.time < 150) {
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
        // --- End Other Effects ---

    } // End draw()



    /**
     * @private
     * Handles drawing the debug target line and playing the lock-on sound effect
     * when specific conditions are met.
     */
    _drawTargetLockOnEffect() {
        const conditionsMetForLine = this.isTargetValid(this.target) &&
                                     this.role !== AI_ROLE.HAULER &&
                                     (this.currentState === AI_STATE.APPROACHING ||
                                      this.currentState === AI_STATE.ATTACK_PASS ||
                                      this.role === AI_ROLE.ALIEN);

        if (conditionsMetForLine) {
            
        // --- Sound Logic: Play only when target is Player and sound hasn't been played for this lock ---
        if (this.target instanceof Player) { // Check if the current target is the player
            if (!this.hasPlayedLockOnSound) {
                if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                    soundManager.playSound('targetlock'); // Ensure 'targetlock' (or 'targetLock') sound is loaded
                }
                this.hasPlayedLockOnSound = true; // Mark sound as played for this player lock-on period
            }
        } else {
            // If target is not the player (or no target), reset the sound flag.
            // This allows the sound to play again if the player is re-acquired.
            this.hasPlayedLockOnSound = false;
        }

            // Always draw the line if conditions are met
            let lineCol = this.p5StrokeColor;
            try {
                if (lineCol?.setAlpha) {
                    lineCol.setAlpha(100);
                    stroke(lineCol);
                } else { // Fallback if not a p5.Color or setAlpha fails
                    stroke(this.strokeColorValue[0], this.strokeColorValue[1], this.strokeColorValue[2], 100);
                }
            } catch (e) { // Further fallback
                stroke(255, 0, 0, 100);
            }
            strokeWeight(1);
            line(this.pos.x, this.pos.y, this.target.pos.x, this.target.pos.y);
        } else {
            // If conditions are NOT met, reset the sound flag so it can play next time
            this.hasPlayedLockOnSound = false;
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
