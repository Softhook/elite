// ****** enemyUtils.js ******
// Enemy Utility Methods
// Common utility functions used by Enemy class

/**
 * Enemy utility methods as a mixin class
 * These methods can be added to the Enemy prototype
 */
class EnemyUtils {
    /**
     * Predicts future position of current target based on velocity
     * @return {p5.Vector|null} Predicted position or null if no valid target
     */
    predictTargetPosition() {
        if (!this.target?.pos || !this.target?.vel) return this.target?.pos || null;
        
        // Reuse the temp vector instead of creating new ones
        this.tempVector.set(this.target.vel.x, this.target.vel.y);
        let pf = this.predictionTime * (deltaTime ? (60 / (1000/deltaTime)) : 60);
        this.tempVector.mult(pf);
        this.tempVector.add(this.target.pos);
        return this.tempVector;
    }

    /** 
     * Normalizes an angle to the range [-PI, PI]
     * @param {number} angle - The angle to normalize
     * @return {number} The normalized angle
     */
    normalizeAngle(angle) {
        let normalized = ((angle % TWO_PI) + TWO_PI) % TWO_PI;
        if (normalized > PI) normalized -= TWO_PI;
        return normalized;
    }

    /** 
     * Gets the signed angle difference between target angle and current angle 
     * @param {number} targetAngle - The target angle to rotate towards
     * @return {number} The normalized angle difference in range [-PI, PI]
     */
    getAngleDifference(targetAngle) {
        let diff = targetAngle - this.angle;
        return this.normalizeAngle(diff);
    }

    /** 
     * Calculates distance to target entity
     * @param {Object} target - Entity with pos property
     * @return {number} Distance to target or Infinity if invalid
     */
    distanceTo(target) {
        if (!target?.pos) return Infinity;
        return dist(this.pos.x, this.pos.y, target.pos.x, target.pos.y);
    }

    /**
     * Checks if target is valid (exists, has position, positive hull, not destroyed)
     * @param {Object} target - The target to validate
     * @return {boolean} Whether target is valid
     */
    isTargetValid(target) {
        // Never allow cargo to be a combat target
        if (target && target.constructor && target.constructor.name === 'Cargo') {
            return false;
        }
        return target && target.pos && 
               ((target.hull !== undefined && target.hull > 0) || target.hull === undefined) && 
               (target.destroyed === undefined || !target.destroyed);
    }

    /**
     * Gets the current star system reference
     * @return {StarSystem|null} The current system or null if not available
     */
    getSystem() {
        return this.currentSystem;
    }

    /** 
     * Rotates towards target angle (radians). Returns remaining difference (radians).
     * @param {number} targetAngleRadians - The target angle to rotate towards
     * @return {number} The remaining angle difference
     */
    rotateTowards(targetAngleRadians) {
        if (isNaN(targetAngleRadians)) return 0;
        
        let diff = this.getAngleDifference(targetAngleRadians);
        
        const rotationThreshold = 0.02;
        if (abs(diff) > rotationThreshold) {
            // Use Math.sign for browser compatibility 
            const rotationAmount = Math.sign(diff) * 
                Math.min(Math.abs(diff), this.rotationSpeed * (deltaTime / 16.67));
            this.angle += rotationAmount;
        }
        return diff;
    }

    /** 
     * Applies forward thrust in current facing direction
     * @param {number} [multiplier=1.0] - Optional thrust multiplier
     * @param {boolean} [createParticles=true] - Whether to create visual thrust particles
     */
    thrustForward(multiplier = 1.0, createParticles = true) {
        // Skip negligible thrust and particle work
        if (!(multiplier > 0.01)) { return; }

        // Apply thrust in the direction we're facing
        if (!this.thrustVector) {
            // Fallback if constructor didn't create it for some reason
            this.thrustVector = createVector(0, 0);
        }
        this.thrustVector.set(cos(this.angle), sin(this.angle));
        this.thrustVector.mult(this.thrustForce * multiplier);
        this.vel.add(this.thrustVector);
        
        this.isThrusting = true;
        
        // Create visual thrust particles (using the pool via thrustManager)
        if (createParticles && this.thrustManager) {
            this.thrustManager.createThrust(this.pos, this.angle, this.size);
        }
    }

    /** 
     * Sets a target position far away for Haulers leaving the system.
     * MODIFIED: Now targets the system's jump zone if available.
     * @param {Object} system - The current star system, expected to have jumpZoneCenter.
     */
    setLeavingSystemTarget(system) {
        if (system?.jumpZoneCenter) {
            // --- Target the Jump Zone ---
            this.patrolTargetPos = system.jumpZoneCenter.copy();
            AI_LOG(`Hauler ${this.shipTypeName} targeting Jump Zone at ${this.patrolTargetPos.x.toFixed(0)}, ${this.patrolTargetPos.y.toFixed(0)}`);
        } else {
            // --- Fallback: Target random point at edge ---
            console.warn(`Hauler ${this.shipTypeName}: Jump Zone not found in system ${system?.name}. Using fallback edge target.`);
            let angle = random(TWO_PI);
            // Use a large distance, slightly beyond despawn radius
            let dist = (system?.despawnRadius ?? 3000) * 1.5;
            this.patrolTargetPos = createVector(cos(angle) * dist, sin(angle) * dist);
        }

        // Ensure state is set correctly (might be redundant if called from changeState)
        if (this.currentState !== AI_STATE.LEAVING_SYSTEM) {
            this.changeState(AI_STATE.LEAVING_SYSTEM);
        }
        this.hasPausedNearStation = false; // Reset pause flag
    }

    /**
     * Offers player to follow this ship through a jump gate
     * @param {Object} system - Current star system
     * @param {Object} targetSystem - Destination system (null for random connected system)
     * @returns {boolean} True if player is following (ship should transfer to new system)
     */
    _offerPlayerFollowJump(system, targetSystem) {
        if (!system || !system.player) {
            console.log('[FollowJump] No system or player');
            return false;
        }
        
        // Access global galaxy variable
        const galaxyRef = (typeof galaxy !== 'undefined') ? galaxy : null;
        if (!galaxyRef) {
            console.log('[FollowJump] No galaxy reference');
            return false;
        }
        
        let destinationSystemIndex = null;
        let destinationSystem = null;
        let destinationName = 'Unknown';
        
        if (targetSystem) {
            // Guard following principal - we know the destination
            destinationSystemIndex = galaxyRef.systems.indexOf(targetSystem);
            destinationSystem = targetSystem;
            destinationName = targetSystem.name;
            console.log(`[FollowJump] Guard jumping to known system: ${destinationName} (index ${destinationSystemIndex})`);
        } else {
            // Regular ship leaving - pick a random connected system
            const currentSystemIndex = galaxyRef.currentSystemIndex;
            const currentSystem = galaxyRef.systems[currentSystemIndex];
            if (currentSystem?.connectedSystemIndices && currentSystem.connectedSystemIndices.length > 0) {
                destinationSystemIndex = currentSystem.connectedSystemIndices[Math.floor(Math.random() * currentSystem.connectedSystemIndices.length)];
                destinationSystem = galaxyRef.systems[destinationSystemIndex];
                destinationName = destinationSystem?.name || 'Unknown';
                console.log(`[FollowJump] Ship jumping to random system: ${destinationName} (index ${destinationSystemIndex})`);
            } else {
                console.log('[FollowJump] No connected systems available');
                return false;
            }
        }
        
        if (destinationSystemIndex !== null && destinationSystemIndex >= 0 && destinationSystem) {
            // Check if player is in jump zone
            const isInJumpZone = typeof isPlayerInJumpZone === 'function' ? 
                isPlayerInJumpZone(system.player, system) : false;
            
            console.log(`[FollowJump] Player in jump zone: ${isInJumpZone}`);
            console.log(`[FollowJump] Destination valid: ${destinationSystemIndex >= 0 && destinationSystemIndex < galaxyRef.systems.length}`);
            
            if (isInJumpZone) {
                // Transfer this ship to the destination system BEFORE player jumps
                console.log(`[FollowJump] Transferring ${this.shipTypeName} to ${destinationName} (index ${destinationSystemIndex})`);
                console.log(`[FollowJump] Current system: ${this.currentSystem?.name}, enemies count: ${this.currentSystem?.enemies.length}`);
                
                // Remove from current system
                const index = this.currentSystem.enemies.indexOf(this);
                if (index !== -1) {
                    this.currentSystem.enemies.splice(index, 1);
                    console.log(`[FollowJump] Removed from current system at index ${index}`);
                }
                
                // Add to destination system at jump zone
                this.currentSystem = destinationSystem;
                destinationSystem.addEnemy(this);
                console.log(`[FollowJump] Added to ${destinationSystem.name}, enemies count now: ${destinationSystem.enemies.length}`);
                
                if (destinationSystem.jumpZoneCenter) {
                    const jzX = destinationSystem.jumpZoneCenter.x;
                    const jzY = destinationSystem.jumpZoneCenter.y;
                    this.pos.set(jzX, jzY);
                    this.vel.set(0, 0);
                    console.log(`[FollowJump] Ship positioned at jump zone: (${jzX.toFixed(1)}, ${jzY.toFixed(1)})`);
                } else {
                    console.log(`[FollowJump] WARNING: Destination system has no jump zone center!`);
                }
                
                // Change state back to patrolling
                this.changeState(AI_STATE.PATROLLING);
                this.inCombat = false;
                this.haulerCombatTimer = undefined;
                
                console.log(`[FollowJump] Ship transferred successfully to system index ${destinationSystemIndex}`);
                
                // Now initiate player jump
                if (typeof uiManager !== 'undefined' && uiManager.addMessage) {
                    uiManager.addMessage(`${this.shipTypeName} jumped to ${destinationName}. Following...`, color(100, 200, 255));
                }
                
                if (typeof gameStateManager !== 'undefined' && gameStateManager.startJump) {
                    console.log(`[FollowJump] Calling gameStateManager.startJump(${destinationSystemIndex}) to ${destinationName}`);
                    gameStateManager.startJump(destinationSystemIndex);
                } else {
                    console.log('[FollowJump] gameStateManager not available');
                }
                
                return true; // Ship was transferred, don't destroy it
            } else {
                // Player not in jump zone - just notify
                console.log(`[FollowJump] Player not in jump zone, only notifying`);
                if (typeof uiManager !== 'undefined' && uiManager.addMessage) {
                    uiManager.addMessage(`${this.shipTypeName} jumped to ${destinationName}`, color(150, 150, 150));
                }
                return false;
            }
        } else {
            console.log(`[FollowJump] Invalid destination index: ${destinationSystemIndex}`);
            return false;
        }
    }

    /**
     * Applies energy tangle effect to impair movement
     * @param {number} duration - How long drag lasts in seconds
     * @param {number} multiplier - How much drag is increased
     */
    applyDragEffect(duration = 5.0, multiplier = 10.0) {
        // Use higher value if already affected
        this.dragMultiplier = Math.max(this.dragMultiplier || 1.0, multiplier);
        
        // ENHANCED: Extend duration for consecutive hits
        this.dragEffectTimer = Math.max(this.dragEffectTimer || 0, duration) + 
                            (this.dragEffectTimer > 0 ? duration * 0.5 : 0);
        
        // Visual effect timestamp
        this.tangleEffectTime = millis();
    }

    /**
     * Checks if ship has been destroyed
     * @return {boolean} Whether ship is destroyed
     */
    isDestroyed() { 
        return this.destroyed; 
    }

    /**
     * Checks for collision with target entity
     * @param {Object} target - Entity to check collision with
     * @return {boolean} Whether collision occurred
     */
    checkCollision(target) { 
        if (!target?.pos || target.size === undefined) return false; 
        let dSq = sq(this.pos.x - target.pos.x) + sq(this.pos.y - target.pos.y); 
        let sumRadii = (target.size / 2) + (this.size / 2); 
        return dSq < sq(sumRadii);
    }
}

// Apply utility methods to Enemy prototype
// This will be called after Enemy class is defined
function applyEnemyUtilityMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('Enemy class not found - cannot apply utility methods');
        return;
    }
    
    // Copy all methods from EnemyUtils to Enemy prototype
    Object.getOwnPropertyNames(EnemyUtils.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyUtils.prototype[methodName];
        }
    });
}
