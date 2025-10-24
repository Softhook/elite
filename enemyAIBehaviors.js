// ****** enemyAIBehaviors.js ******
// Enemy AI Behavior Methods - Stage 7
// Contains role-specific AI update methods and forced combat logic

/**
 * EnemyAIBehaviors class contains AI behavior methods for different enemy roles.
 * These methods are mixed into the Enemy prototype via applyEnemyAIBehaviorMethods().
 */
class EnemyAIBehaviors {

    /**
     * Handles forced combat mode for Hauler role (retaliation override)
     * @param {Object} system - The current star system
     * @returns {boolean} True if currently in forced combat mode
     */
    _handleForcedCombat(system) {
        // Don't override fleeing with forced combat
        if (this.currentState === AI_STATE.FLEEING) {
            return false;
        }


        let isInForcedCombat = false;

        // Check if forced combat should be initiated (Hauler role, recently attacked)
        if (this.lastAttacker && this.role === AI_ROLE.HAULER && this.forcedCombatTimer <= 0) {
            this.forcedCombatTimer = 5.0; // 5 seconds of forced combat
            HAULER_LOG(`${this.shipTypeName} entering FORCED COMBAT MODE after attack`);
        }

        // Update and check the timer
        if (this.forcedCombatTimer > 0) {
            this.forcedCombatTimer -= deltaTime / 1000;
            isInForcedCombat = true;

            // Override target to the last attacker
            if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
                this.target = this.lastAttacker;
                // Ensure the state is appropriate for combat
                if (this.currentState === AI_STATE.IDLE || this.currentState === AI_STATE.PATROLLING) {
                    this.changeState(AI_STATE.APPROACHING);
                }
            } else {
                // Attacker became invalid, end forced combat early
                this.forcedCombatTimer = 0;
                isInForcedCombat = false;
                this.lastAttacker = null; // Clear invalid attacker
            }
        }

        return isInForcedCombat;
    }

    /**
    * Helper to check if the current ship has weapons suitable for sniping.
     * @returns {boolean} True if a sniping weapon is equipped.
     */
    hasGoodSnipingWeapon() {
        if (!this.currentWeapon) return false;
        // Define what constitutes a "good sniping weapon"
        // Example: Beams, non-spread projectiles, or missiles.
        const weaponType = this.currentWeapon.type;
        return weaponType === WEAPON_TYPE.BEAM ||
               weaponType === WEAPON_TYPE.MISSILE ||
               (weaponType.startsWith(WEAPON_TYPE.PROJECTILE_STRAIGHT)) || // e.g. PROJECTILE_STRAIGHT, PROJECTILE_STRAIGHT_FAST
               weaponType === WEAPON_TYPE.TURRET; // Turrets can be good if accurate
    }

    /**
     * Main combat AI implementation - now using smaller helper methods
     * @param {Object} system - The current star system
     */
    updateCombatAI(system) {
        // 1. Handle forced‐combat mode (e.g., Hauler retaliation override)
        const isInForcedCombat = this._handleForcedCombat(system);
    
        // 2. Update targeting (may be overridden by forced combat)
        let targetExists = this.updateTargeting(system);
        targetExists = this.isTargetValid(this.target);
    
        // 3. Compute distance to target and angle for firing
        let distanceToTarget = targetExists ? this.distanceTo(this.target) : Infinity;
        let shootingAngle = this.angle;
        if (targetExists) {
            shootingAngle = atan2(
                this.target.pos.y - this.pos.y,
                this.target.pos.x - this.pos.x
            );
        }
    
        // 4. Run state‐transition logic.
        //    REMOVED: if (!isInForcedCombat)
        //    Allow updateCombatState to run even if in forced combat,
        //    so Haulers can transition from APPROACHING to ATTACK_PASS.
        this.updateCombatState(targetExists, distanceToTarget);
    
        // 5. If just entered (or still in) FLEEING, perform flee logic and exit
        // ← NO MORE "if (FLEEING) updateFleeingAI" here!
        if (this.currentState === AI_STATE.FLEEING) {
            // state helper handles movement & exit
            return;
        }
    
        // 6. Otherwise, do normal combat movement & firing
        const desiredMovementTargetPos = this.getMovementTargetForState(distanceToTarget);
        this.performRotationAndThrust(desiredMovementTargetPos);
        this.performFiring(system, targetExists, distanceToTarget, shootingAngle);
    }

    /**
     * Police AI Logic - Patrols, switches to Combat AI if player is wanted
     * @param {Object} system - The current star system
     */
    updatePoliceAI(system) {

        // Update to check system wanted status instead of player
        if (system.player && system.isPlayerWanted()) {
            // Always set player as target when wanted
            this.target = system.player;
            
            // MODIFIED: Immediately pursue if system-wide alert is active
            if (system.policeAlertSent && 
                (this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.IDLE)) {
                this.changeState(AI_STATE.APPROACHING);
                
                // Force rotation toward player
                if (this.pos && system.player.pos) {
                    let angleToPlayer = atan2(system.player.pos.y - this.pos.y, 
                                            system.player.pos.x - this.pos.x);
                    this.angle = angleToPlayer;
                }
                
                if (!this.hasReportedWantedPlayer) {
                    console.log(`Police ${this.shipTypeName} responding to system-wide alert`);
                    this.hasReportedWantedPlayer = true;
                }
            }
            
            // Use combat AI when player is wanted
            this.updateCombatAI(system);
            return;
        } else {
            // Reset flags when player is no longer wanted
            this.hasReportedWantedPlayer = false;
            this.reportedWantedTarget = false;
            
            // Clear system alert flag if needed
            if (system.player && !system.player.isWanted && system.policeAlertSent) {
                system.policeAlertSent = false;
            }
        }
        
        // Check for wanted ships
        let wantedTarget = null;
        if (system.enemies && system.enemies.length > 0) {
            for (let e of system.enemies) {
                if (e !== this && e.hull > 0 && e.isWanted) {
                    wantedTarget = e;
                    break;
                }
            }
        }
        
        if (wantedTarget) {
            // Target any wanted ship
            this.target = wantedTarget;
            if (this.currentState === AI_STATE.PATROLLING || this.currentState === AI_STATE.IDLE) {
                this.changeState(AI_STATE.APPROACHING);
            }
            this.updateCombatAI(system);
        } else {
            // No wanted targets: Patrol
            if (this.currentState !== AI_STATE.PATROLLING) {
                this.changeState(AI_STATE.PATROLLING);
            }
            
            if (!this.patrolTargetPos) {
                this.patrolTargetPos = system?.station?.pos?.copy() || createVector(random(-500, 500), random(-500, 500));
            }
            
            let desiredMovementTargetPos = this.patrolTargetPos;
            let distToPatrolTarget = desiredMovementTargetPos
                ? dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y)
                : Infinity;
                
            if (distToPatrolTarget < 50) {
                // Select a new patrol target - sometimes station, sometimes elsewhere
                if (system?.station?.pos) {
                    if (random() < 0.2) { //20% chance to patrol back to station
                        this.patrolTargetPos = system.station.pos.copy();
                        //console.log(`Police ${this.shipTypeName} patrolling back to station`);
                    } else {
                        // 70% chance to patrol elsewhere in the system
                        const patrolRange = 2000; // Area to patrol within
                        const patrolAngle = random(TWO_PI);
                        const patrolDist = random(700, patrolRange);
                        
                        // Create patrol point relative to current position
                        this.patrolTargetPos = createVector(
                            this.pos.x + cos(patrolAngle) * patrolDist,
                            this.pos.y + sin(patrolAngle) * patrolDist
                        );
                        
                        //console.log(`Police ${this.shipTypeName} patrolling to new point at distance ${patrolDist.toFixed(0)}`);
                    }
                } else {
                    // No station, just patrol randomly
                    this.patrolTargetPos = createVector(random(-1000, 1000), random(-1000, 1000));
                }
                desiredMovementTargetPos = this.patrolTargetPos;
            }
            
            this.performRotationAndThrust(desiredMovementTargetPos);
        }
    }

    /** Hauler AI Logic - Moves between station and system edge. */
    updateHaulerAI(system) {
        // Check for attackers FIRST
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) &&
            this.currentState !== AI_STATE.FLEEING && // Don't interrupt fleeing
            this.currentState !== AI_STATE.APPROACHING && // Don't interrupt combat
            this.currentState !== AI_STATE.ATTACK_PASS &&
            this.currentState !== AI_STATE.REPOSITIONING &&
            this.currentState !== AI_STATE.SNIPING && // Don't interrupt sniping
            (!this.attackCooldown || this.attackCooldown <= 0)) {

            const attackerDistance = this.distanceTo(this.lastAttacker);
            if (attackerDistance < this.detectionRange * 1.2) {
                // Store current state before switching to combat/fleeing
                this.previousHaulerState = this.currentState;
                this.previousTargetPos = this.patrolTargetPos ? this.patrolTargetPos.copy() : null;

                // Decide whether to fight or flee based on hull
                if (this.hull < this.maxHull * 0.5) { // Flee if below 50% hull
                    console.log(`Hauler ${this.shipTypeName} fleeing from attack by ${this.lastAttacker.shipTypeName || 'Player'}`);
                    this.target = this.lastAttacker;
                    this.changeState(AI_STATE.FLEEING);
                    if (uiManager) uiManager.addMessage(`${this.shipTypeName} fleeing from attack`);
                    // Apply immediate velocity boost away
                    if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.8)); }
                    this.attackCooldown = 15.0; // Cooldown before being provoked again
                    return; // Skip normal logic
                } else { // Retaliate if hull is okay
                    AI_LOG(`Hauler ${this.shipTypeName} retaliating against attack from ${this.lastAttacker.shipTypeName || 'Player'}`);
                    this.target = this.lastAttacker;
                    this.changeState(AI_STATE.APPROACHING);
                    this.haulerCombatTimer = 10.0; // Timer to return to hauling
                    this.forcedCombatTimer = 5.0; // Force combat for 5 seconds
                    this.inCombat = true; // NEW FLAG: This explicitly marks the ship as in combat mode
                    this.attackCooldown = 3.0; // Prevent re-triggering this check for 3 seconds
                    //if (uiManager) uiManager.addMessage(`${this.shipTypeName} retaliating against attack`, null, true); // Only show once
                    
                    // IMPROVED FIX: Skip all normal hauler processing for this frame
                    this.updateCombatAI(system);
                    return;
                }
            }
        }

        // IMPROVED: Check explicit "in combat" flag first
        if (this.inCombat === true) {
            // Check combat timer
            if (this.haulerCombatTimer !== undefined) {
                this.haulerCombatTimer -= deltaTime / 1000;
                if (this.haulerCombatTimer <= 0) {
                    HAULER_LOG(`Hauler ${this.shipTypeName} disengaging from combat.`);
                    this.haulerCombatTimer = undefined; // Clear timer
                    this.lastAttacker = null; // Forget attacker
                    this.target = null; // Clear target
                    this.inCombat = false; // Clear combat flag
                    this.attackCooldown = 5.0; // Prevent immediate re-engagement
                    
                    // Return to previous state or default
                    this.changeState(this.previousHaulerState || AI_STATE.PATROLLING);
                    this.patrolTargetPos = this.previousTargetPos || system?.station?.pos?.copy(); // Restore patrol target
                    
                    // Don't run combat AI this frame if disengaging
                    this.performRotationAndThrust(this.patrolTargetPos); // Move towards patrol target
                    this.updatePhysics();
                    return;
                }
            }

            // Force reinstate combat state if needed (but don't spam if in hauler-specific states)
            if (this.currentState !== AI_STATE.APPROACHING && 
                this.currentState !== AI_STATE.ATTACK_PASS &&
                this.currentState !== AI_STATE.REPOSITIONING &&
                this.currentState !== AI_STATE.FLEEING &&
                this.currentState !== AI_STATE.SNIPING &&
                this.currentState !== AI_STATE.PATROLLING &&
                this.currentState !== AI_STATE.NEAR_STATION &&
                this.currentState !== AI_STATE.TRANSPORTING &&
                this.currentState !== AI_STATE.COLLECTING_CARGO) {
                AI_LOG(`Forcing hauler ${this.shipTypeName} back to APPROACHING state`);
                this.changeState(AI_STATE.APPROACHING);
            }

            // Check hull status - flee if heavily damaged during combat
            if (this.hull < this.maxHull * 0.4 && this.currentState !== AI_STATE.FLEEING) {
                console.log(`Damaged hauler ${this.shipTypeName} attempting to escape!`);
                this.target = this.lastAttacker || this.target; // Ensure we flee from *something*
                this.changeState(AI_STATE.FLEEING);
                if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.8)); }
            }


            this.updateCombatAI(system);
            this.updatePhysics();
            return; // Skip normal hauler logic
        }

        // Check the combat state flags as well (backup check)
        if (this.currentState === AI_STATE.FLEEING ||
            this.currentState === AI_STATE.APPROACHING ||
            this.currentState === AI_STATE.ATTACK_PASS ||
            this.currentState === AI_STATE.REPOSITIONING ||
            this.currentState === AI_STATE.SNIPING)  // Add sniping to combat states
        {
            // Set the inCombat flag if needed
            this.inCombat = true;
            

            this.updateCombatAI(system);
            this.updatePhysics();
            return; // Skip normal hauler logic
        }

        // Reset combat flag if not in combat state
        this.inCombat = false;

        // --- Normal Hauler Logic (Patrolling, Near Station, Leaving) ---
        let desiredMovementTargetPos = null;
        let shouldMove = true; // Flag to control movement at the end

        switch (this.currentState) {
            case AI_STATE.PATROLLING:
                this.target = null; // Ensure target is null when patrolling
                let isTargetingStation = false; // Flag to know if the station is the intended target

                if (!this.patrolTargetPos) {
                    // Default to station if available, otherwise prepare to leave
                    if (system?.station?.pos) {
                        this.patrolTargetPos = system.station.pos.copy();
                        isTargetingStation = true; // Mark that we are initially targeting the station
                    } else {
                        // No station, immediately try to leave
                        this.changeState(AI_STATE.LEAVING_SYSTEM);
                        shouldMove = false; // Don't move this frame, let LEAVING_SYSTEM entry handle it
                        break; // Exit switch
                    }
                } else {
                    // If patrolTargetPos already exists, check if it's the station
                    if (system?.station?.pos && this.patrolTargetPos.dist(system.station.pos) < 1) {
                         isTargetingStation = true;
                    }
                }

                desiredMovementTargetPos = this.patrolTargetPos;

                // Check distance to current patrol target using p5.dist() directly
                // FIX: Use p5.dist() instead of this.distanceTo()
                let dS = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y);

                if (dS < this.stationProximityThreshold) {
                    // If we are close AND our intended target was the station, transition
                    if (isTargetingStation) {
                         AI_LOG(`Hauler ${this.shipTypeName} arriving near station (Dist: ${dS.toFixed(1)}).`);
                         this.changeState(AI_STATE.NEAR_STATION);
                         shouldMove = false; // Stop moving this frame, let NEAR_STATION handle braking/waiting
                    } else {
                         // Reached a non-station patrol point.
                         // For now, just treat it like arriving at the station for simplicity.
                         // Could add logic here later to pick a new patrol point or head towards station.
                         AI_LOG(`Hauler ${this.shipTypeName} arriving near patrol point (Dist: ${dS.toFixed(1)}). Treating as station arrival.`);
                         this.changeState(AI_STATE.NEAR_STATION);
                         shouldMove = false;
                    }
                }
                break;

            case AI_STATE.NEAR_STATION:
                this.target = null; // Ensure target is null when near station
                this.vel.mult(0.8); // Apply braking continuously while near station
                shouldMove = false; // Don't actively thrust, just brake and wait

                if (this.nearStationTimer === undefined || this.nearStationTimer === null) {
                    this.nearStationTimer = this.stationPauseDuration; // Init timer if needed
                    HAULER_LOG(`Hauler ${this.shipTypeName} starting pause near station for ${this.nearStationTimer.toFixed(1)}s`);
                }

                this.nearStationTimer -= deltaTime / 1000;

                if (this.nearStationTimer <= 0) {
                    HAULER_LOG(`Hauler ${this.shipTypeName} finished pause, preparing to leave.`);
                    this.changeState(AI_STATE.LEAVING_SYSTEM);
                    // Movement target will be set by onStateEntry(LEAVING_SYSTEM) next frame
                }
                break;

            case AI_STATE.LEAVING_SYSTEM:
                this.target = null; // Ensure target is null when leaving
                desiredMovementTargetPos = this.patrolTargetPos;
                if (!desiredMovementTargetPos) {
                     console.warn(`Hauler ${this.shipTypeName} in LEAVING_SYSTEM state has no patrolTargetPos! Attempting recovery.`);
                     this.setLeavingSystemTarget(system);
                     desiredMovementTargetPos = this.patrolTargetPos;
                     if (!desiredMovementTargetPos) {
                         shouldMove = false;
                         break;
                     }
                }

                // --- DETAILED DEBUG LOGGING ---
              //  console.log(`--- Hauler Leaving Check: ${this.shipTypeName} ---`);
              //  console.log(`   Current Pos: (${this.pos.x.toFixed(1)}, ${this.pos.y.toFixed(1)})`);
              //  console.log(`   Target Pos (Jump Zone/Edge): (${desiredMovementTargetPos.x.toFixed(1)}, ${desiredMovementTargetPos.y.toFixed(1)})`);

                // Calculate distance to target (Jump Zone/Edge)
                let dE = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y);
              //  console.log(`   Distance to Target (dE): ${dE.toFixed(1)}`);


                // ---  Exit Condition ---
                // Exit if:
                // 1. Arrived at the jump zone target (dE < 150)
                if (dE < 150) {
                    if (this.role === AI_ROLE.GUARD && this.principal) {
                        // Guards follow their principal to the new system
                        const targetSystem = this.principal.currentSystem;
                        if (targetSystem && targetSystem !== this.currentSystem) {
                            // Remove from current system
                            const index = this.currentSystem.enemies.indexOf(this);
                            if (index !== -1) {
                                this.currentSystem.enemies.splice(index, 1);
                            }
                            // Add to target system
                            this.currentSystem = targetSystem;
                            targetSystem.addEnemy(this);
                            // Set position to jump zone in new system
                            if (targetSystem.jumpZoneCenter) {
                                this.pos.set(targetSystem.jumpZoneCenter.x, targetSystem.jumpZoneCenter.y);
                                this.vel.set(0, 0);
                            }
                            // Resume guarding
                            this.changeState(AI_STATE.GUARDING);
                            HAULER_LOG(`${this.shipTypeName} (Guard) followed principal to ${targetSystem.name}`);
                        } else {
                            // Can't follow, destroy
                            this.destroyed = true;
                            HAULER_LOG(`${this.shipTypeName} (Guard) could not follow principal, destroyed`);
                        }
                    } else {
                        // Normal hauler/transport leaving
                        this.inCombat = false;
                        this.haulerCombatTimer = undefined;
                        this.destroyed = true;
                        HAULER_LOG(`${this.role} ${this.shipTypeName} left the system.`);
                    }
                    shouldMove = false;
                }
                break; // End LEAVING_SYSTEM case

            default:
                this.target = null;
                HAULER_LOG(`Hauler ${this.shipTypeName} in unexpected state ${this.currentState}. Resetting.`);
                if(system?.station?.pos) {
                    this.patrolTargetPos = system.station.pos.copy();
                    this.changeState(AI_STATE.PATROLLING);
                } else {
                    this.changeState(AI_STATE.LEAVING_SYSTEM);
                }
                shouldMove = false;
                break;
        }

        if (shouldMove) {
            this.performRotationAndThrust(desiredMovementTargetPos);
        }
        this.updatePhysics();
    }

    /** Transport AI Logic - Moves between two endpoints. */
    updateTransportAI(system) {
        if (!system) return;

        // Check for attackers FIRST
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) &&
            this.currentState !== AI_STATE.FLEEING &&
            (!this.attackCooldown || this.attackCooldown <= 0)) {

            const attackerDistance = this.distanceTo(this.lastAttacker);
            if (attackerDistance < this.detectionRange * 1.5) {
                // Store current state before fleeing
                this.previousTransportState = this.currentState;
                this.previousRoutePoints = this.routePoints ? [...this.routePoints] : null;
                this.previousRouteIndex = this.currentRouteIndex;

                //console.log(`Transport ${this.shipTypeName} fleeing from attack by ${this.lastAttacker.shipTypeName || 'Player'}`);
                this.target = this.lastAttacker; // Set attacker as target to flee from
                this.changeState(AI_STATE.FLEEING);
                if (uiManager) uiManager.addMessage(`${this.shipTypeName} fleeing from attack`);
                if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.9)); }
                this.attackCooldown = 15.0;
                // Fleeing logic is handled below or in next frame's state check
            }
        }

        // Handle Fleeing state
        if (this.currentState === AI_STATE.FLEEING) {
            // Delegate to the new state helper (which does movement + exit)
            this.updateCombatAI(system);
            this.updatePhysics();
            return;
       }

        // --- Normal Transport Logic ---
        this.target = null; // Ensure target is null during normal transport

        // Define routePoints if not yet set:
        // ... (existing route point setup logic) ...
        if (!this.routePoints) {
            // ... (code to set this.routePoints, this.currentRouteIndex, this.waitTimer) ...
             let pts = [];
             // ... (logic to find two points, e.g., planets or station) ...
             // Example:
             if (system.planets && system.planets.length > 1) {
                 pts.push(system.planets[0].pos.copy()); // Assuming planet 0 exists
                 pts.push(system.planets[1].pos.copy()); // Assuming planet 1 exists
             } else if (system.station) {
                 pts.push(system.station.pos.copy());
                 pts.push(p5.Vector.add(system.station.pos, createVector(random(-500, 500), random(-500, 500)))); // Point near station
             } else { // Fallback
                 pts.push(createVector(0,0)); pts.push(createVector(500,0));
             }
             this.routePoints = pts;
             this.currentRouteIndex = 1; // Start moving towards the second point
             this.waitTimer = 0;
             AI_LOG(`Transporter ${this.shipTypeName} route set.`);
        }


        let destination = this.routePoints[this.currentRouteIndex];

        // ... (existing movement logic towards destination) ...
        this.tempVector.set(destination.x - this.pos.x, destination.y - this.pos.y);
        let distance = this.tempVector.mag();
        // ... (rest of movement, arrival check, wait timer, destination switching) ...

        // Arrival behavior:
        const arrivalThreshold = 30; // Increased threshold slightly
        const slowSpeedThreshold = 0.2;
        if (distance > arrivalThreshold) {
            // Move towards destination
            if (this.waitTimer !== 0) { this.waitTimer = 0; } // Reset timer if moving
            this.performRotationAndThrust(destination); // Use helper
        } else {
            // Arrival detected: apply braking.
            this.vel.mult(0.8);
            // If close enough AND moving very slowly, start/continue wait timer.
            if (this.vel.mag() < slowSpeedThreshold) {
                if (this.waitTimer === 0) {
                    this.waitTimer = random(1500, 4000); // Wait 1.5-4s
                    console.log(`Transporter ${this.shipTypeName} arrived. Waiting.`);
                } else {
                    this.waitTimer -= deltaTime;
                    if (this.waitTimer <= 0) {
                        // Switch destination.
                        this.currentRouteIndex = (this.currentRouteIndex + 1) % this.routePoints.length;
                        console.log(`Transporter ${this.shipTypeName} switching destination.`);
                        this.waitTimer = 0;
                        this.vel.set(0, 0); // Reset velocity
                    }
                }
            }
        }

        // Apply physics
        this.updatePhysics(); // Use centralized physics update
    }

    /** Handles cargo collection AI */
    updateCargoCollectionAI(system) {
        // If our target cargo disappeared or was collected, find a new one
        if (!this.cargoTarget || this.cargoTarget.collected) {
            this.cargoTarget = this.detectCargo(system);

            // If no cargo found, return to normal behavior
            if (!this.cargoTarget) {
                if (this.role === AI_ROLE.TRANSPORT) {
                    this.changeState(this.previousState || AI_STATE.TRANSPORTING);
                } else {
                    // Return pirates/others to IDLE or previous combat state if applicable
                    this.changeState(this.previousState || AI_STATE.IDLE);
                }
                return false; // No cargo to collect, resume normal behavior
            }
        }

        // Calculate distance and radii FIRST
        const distanceToCargo = dist(this.pos.x, this.pos.y, this.cargoTarget.pos.x, this.cargoTarget.pos.y);
        const collectionRadius = this.size / 2 + this.cargoTarget.size * 2; // Radius for successful pickup
        const brakingDistance = collectionRadius * 2.5; // Start braking when within 2.5x collection radius

        // --- Movement Logic ---
        // (Keep the existing role-specific movement logic here - performRotationAndThrust or Transport-specific movement)
        // Example placeholder for movement logic:
        const desiredMovementTargetPos = this.cargoTarget.pos;
        this.performRotationAndThrust(desiredMovementTargetPos); // Or the transport-specific movement
        // --- End Movement Logic ---


        // --- Apply Braking when close to cargo ---
        if (distanceToCargo < brakingDistance) {
            // Map distance to brake factor: stronger braking closer to target
            // Starts braking gently (~0.95) at brakingDistance, increases to strong braking (~0.75) near collectionRadius
            const brakeFactor = map(distanceToCargo, collectionRadius * 0.8, brakingDistance, 0.75, 0.95);
            this.vel.mult(constrain(brakeFactor, 0.75, 0.95)); // Apply constrained brake factor
            // Optional: Log braking
            // if (frameCount % 10 === 0) {
            //     console.log(`${this.shipTypeName} braking near cargo. Dist: ${distanceToCargo.toFixed(1)}, BrakeFactor: ${brakeFactor.toFixed(2)}`);
            // }
        }
        // --- End Braking ---


        // --- Check if we've reached the cargo for collection ---
        if (distanceToCargo < collectionRadius) {
            // Double-check cargo hasn't been collected already (race condition protection)
            if (this.cargoTarget.collected) {
                console.warn(`${this.shipTypeName} tried to collect already-collected cargo`);
                this.cargoTarget = null;
                this.cargoCollectionCooldown = 0.5;
                return false;
            }
            
            // Collection logic
            this.cargoTarget.collected = true; // Mark world cargo as collected

            // Remove from system array (important!)
            const cargoIndex = system.cargo.indexOf(this.cargoTarget);
            if (cargoIndex !== -1) {
                system.cargo.splice(cargoIndex, 1);
            } else {
                 console.warn(`${this.shipTypeName} collected cargo, but it wasn't found in system array?`);
            }

            CARGO_LOG(`${this.shipTypeName} collected cargo ${this.cargoTarget.type}`);
            this.cargoTarget = null; // Clear local target reference
            // Set cooldown before looking for more cargo
            this.cargoCollectionCooldown = this.role === AI_ROLE.TRANSPORT ? 0.5 : 1.0;

            // Apply full stop after collection to prevent overshoot
            this.vel.mult(0.1);

            // Return false to indicate collection state is finished for this frame
            return false;
        }

        // If we haven't collected yet, return true to stay in this state
        return true;
    }
}

/**
 * Apply EnemyAIBehaviors methods to Enemy prototype
 */
function applyEnemyAIBehaviorMethods() {
    // Get all method names from EnemyAIBehaviors prototype
    Object.getOwnPropertyNames(EnemyAIBehaviors.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyAIBehaviors.prototype[methodName];
        }
    });
}
