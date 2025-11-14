// ****** enemyTargeting.js ******
// Enemy Targeting Logic
// Handles target selection and evaluation for Enemy AI

/**
 * Enemy targeting methods as a mixin class
 * These methods handle target selection and scoring
 */
class EnemyTargeting {
    /**
     * Updates the enemy's targeting information
     * @param {Object} system - The current star system
     * @return {boolean} Whether a valid target was found
     */
    updateTargeting(system) {
        // --- BOUNTY HUNTER: Always target player ---
        if (this.role === AI_ROLE.BOUNTY_HUNTER) {
            const playerRef = system.player || this.target; // Ensure we have a reference to player
            if (playerRef instanceof Player && this.isTargetValid(playerRef)) {
                if (this.target !== playerRef) {
                    this.target = playerRef;
                }
                return true; // Player is the target
            } else {
                this.target = null; // Player is not valid (e.g., destroyed, not in system)
                return false;
            }
        }
        // --- END BOUNTY HUNTER ---

        // --- SNIPING: Lock onto current target, don't retarget ---
        if (this.currentState === AI_STATE.SNIPING) {
            if (this.isTargetValid(this.target)) {
                return true; // Keep current target locked during sniping
            } else {
                // Target became invalid, exit sniping state to appropriate default
                this.target = null;
                this.changeState(this._getDefaultStateForRole());
                return false;
            }
        }
        // --- END SNIPING ---

        // --- GUARD ENGAGEMENT LOCK: Maintain target during active engagement ---
        if (this.role === AI_ROLE.GUARD && this.guardEngagementLock > 0) {
            if (this.isTargetValid(this.target)) {
                // Keep current target locked during engagement lock period
                return true;
            }
            // If target becomes invalid during lock, allow retargeting but keep the lock active
            // The lock will naturally expire via the timer in enemy.js update()
        }
        // --- END GUARD ENGAGEMENT LOCK ---

        let bestScore = TARGET_SCORE_INVALID;
        let bestTarget = null;
        let currentTargetScore = TARGET_SCORE_INVALID;

        // Evaluate current target (no debug)
        if (this.isTargetValid(this.target)) {
            currentTargetScore = this.evaluateTargetScore(this.target, system);
            bestScore = currentTargetScore;
            bestTarget = this.target;
        } else {
            this.target = null;
        }

        // Evaluate lastAttacker (no debug)
        if (this.lastAttacker && this.lastAttacker !== bestTarget && this.isTargetValid(this.lastAttacker)) {
            const attackerScore = this.evaluateTargetScore(this.lastAttacker, system);
            if (attackerScore > bestScore) {
                bestScore = attackerScore;
                bestTarget = this.lastAttacker;
            }
        }

        // Evaluate Player (with debug)
        const playerRef = system.player || this.target;
        if (playerRef instanceof Player && playerRef !== bestTarget && this.isTargetValid(playerRef)) {
            const playerScore = this.evaluateTargetScore(playerRef, system);
            if (playerScore > bestScore) {
                bestScore = playerScore;
                bestTarget = playerRef;
            }
        }
        
        // Evaluate other enemies (no debug)
        const canTargetOtherEnemies = (this.role === AI_ROLE.PIRATE || this.role === AI_ROLE.ALIEN || this.role === AI_ROLE.COMBAT);
        if (canTargetOtherEnemies && system.enemies && system.enemies.length > 0) {
            const isAlien = this.role === AI_ROLE.ALIEN;
            const isCombat = this.role === AI_ROLE.COMBAT;
            
            for (let i = 0, len = system.enemies.length; i < len; i++) {
                const otherEnemy = system.enemies[i];
                if (otherEnemy === this || otherEnemy === bestTarget) {
                    continue;
                }
                // For Aliens, ensure they don't target other Aliens
                if (isAlien && otherEnemy.role === AI_ROLE.ALIEN) {
                    continue;
                }
                // Combat ships prioritize based on faction
                if (isCombat) {
                    // Skip allies (same faction)
                    const myFaction = this._getShipFaction(this);
                    const theirFaction = this._getShipFaction(otherEnemy);
                    if (myFaction === theirFaction && myFaction !== 'UNKNOWN') {
                        continue; // Don't target allies
                    }
                }
                if (!this.isTargetValid(otherEnemy)) {
                    continue;
                }
                const enemyScore = this.evaluateTargetScore(otherEnemy, system);
                if (enemyScore > bestScore) {
                    bestScore = enemyScore;
                    bestTarget = otherEnemy;
                }
            }
        }

        // NOTE: Do NOT evaluate cargo here. Pirates use dedicated cargo collection logic
        // in update() via detectCargo() and the COLLECTING_CARGO state. Including cargo
        // in combat targeting leads to unwanted behavior (shooting cargo). Intentionally omitted.

        // Final target decision
        if (bestTarget && bestScore > 0) {
            const scoreThresholdForChange = 25;
            
            if (bestTarget !== this.target) {
                // Switching to a different target
                // Allow immediate switch if we have no target, otherwise require cooldown + score threshold
                if (this.target === null) {
                    // No current target, immediate acquisition allowed
                    this.target = bestTarget;
                    this.targetSwitchCooldown = 2.0; // Set cooldown for future switches
                    if (typeof communicationSystem !== 'undefined' && communicationSystem?.handleTargetAcquired) {
                        communicationSystem.handleTargetAcquired(this, bestTarget, { reason: 'initial' });
                    }
                    
                    // Special handling for guards: set engagement lock when acquiring principal's attacker
                    if (this.role === AI_ROLE.GUARD && this.principal && 
                        bestTarget === this.principal.lastAttacker) {
                        this.guardEngagementLock = 3.0; // Lock for 3 seconds minimum
                    }
                    return true;
                } else if (this.targetSwitchCooldown <= 0 && bestScore > currentTargetScore + scoreThresholdForChange) {
                    // Have a target, cooldown expired, and new target is significantly better
                    this.target = bestTarget;
                    this.targetSwitchCooldown = 2.0;
                    if (typeof communicationSystem !== 'undefined' && communicationSystem?.handleTargetAcquired) {
                        communicationSystem.handleTargetAcquired(this, bestTarget, { reason: 'retarget' });
                    }
                    
                    // Special handling for guards: set engagement lock when acquiring principal's attacker
                    if (this.role === AI_ROLE.GUARD && this.principal && 
                        bestTarget === this.principal.lastAttacker) {
                        this.guardEngagementLock = 3.0; // Lock for 3 seconds minimum
                    }
                    return true;
                }
                // Else: cooldown active or score not good enough - keep current target
            }
            // Either keeping same target or couldn't switch yet
            return this.target !== null;
        } else {
            if (this.target instanceof Player) {
                //console.log(`%c🎯 PLAYER LOST: ${this.shipTypeName} stopped targeting player`, 'color:orange');
            }
            this.target = null;
            return false;
        }
    }

    /**
     * Evaluates how attractive a target is for this enemy - with isolation from global scope
     * @param {Object} target - The target to evaluate
     * @param {Object} system - The current star system
     * @return {number} A score representing how attractive this target is
     */
    evaluateTargetScore(target, system) {
        // Use an immediately-invoked function expression (IIFE) for complete scope isolation
        return (function(enemy, target, system) {
            // Basic validity check
            if (!enemy.isTargetValid(target) || target === enemy) {
                return TARGET_SCORE_INVALID;
            }

            // --- GUARD: Prioritize Principal's Attacker (with friendly fire prevention) ---
            if (enemy.role === AI_ROLE.GUARD && enemy.principal && enemy.isTargetValid(enemy.principal)) {
                // FRIENDLY FIRE PREVENTION: Never target principal
                if (target === enemy.principal) {
                    return TARGET_SCORE_INVALID;
                }
                
                // FRIENDLY FIRE PREVENTION: Never target fellow guards protecting same principal
                if (target.role === AI_ROLE.GUARD && target.principal === enemy.principal) {
                    return TARGET_SCORE_INVALID;
                }
                
                // CRITICAL FIX: Check if we're currently locked onto THIS target
                // This prevents flickering when principal.lastAttacker changes or becomes invalid
                const isLockedOn = enemy.guardEngagementLock > 0 && target === enemy.target;
                if (isLockedOn) {
                    // Maintain lock with consistent high score regardless of lastAttacker status
                    // This keeps the guard committed to the threat even if principal's reference changes
                    return 2500; // Higher than initial engagement to prevent target loss/switching
                }
                
                // High priority for principal's attacker (initial engagement)
                const isPrincipalAttacker = target === enemy.principal.lastAttacker && 
                    enemy.isTargetValid(target) && 
                    (enemy.principal.lastAttackTime && millis() - enemy.principal.lastAttackTime < 5000);
                
                if (isPrincipalAttacker) {
                    //console.log(`${enemy.shipTypeName} (Guard) evaluating ${target.shipTypeName || 'Player'} as principal's attacker. HIGH SCORE.`);
                    return 2000; // Very high score to engage principal's attacker
                }
                
                // Self-defense: if this guard was attacked, can engage the attacker
                if (target === enemy.lastAttacker) {
                    return 1500; // High score for self-defense, but lower than principal defense
                }
                
                // Otherwise, guards don't pick fights - return invalid
                return TARGET_SCORE_INVALID;
            }

            // FRIENDLY FIRE PREVENTION: Principals never target their own guards
            if (target.role === AI_ROLE.GUARD && target.principal === enemy) {
                return TARGET_SCORE_INVALID;
            }
            // --- END GUARD ---

            // --- BOUNTY HUNTER: Only cares about the player ---
            if (enemy.role === AI_ROLE.BOUNTY_HUNTER) {
                if (target instanceof Player) {
                    return 1000; // Very high score for the player
                } else {
                    return TARGET_SCORE_INVALID; // Ignore all other targets
                }
            }
            // --- END BOUNTY HUNTER ---

            // Create completely private scoring variables
            let _score = 0; 
            let _interesting = false;
            const isPlayer = target instanceof Player;
            
            if (isPlayer) {
                //console.log(`%c🔍 DEBUG: ${enemy.shipTypeName} evaluating player - starting score calculation`, 'color:purple');
            }
            
            // Check if target is attacker
            let isAttacker = target === enemy.lastAttacker;
            if (!isAttacker && isPlayer && enemy.lastAttacker instanceof Player) {
                isAttacker = true;
                if (isPlayer) {
                    //console.log(`%c🔍 PLAYER MATCH: ${enemy.shipTypeName} identified Player as attacker`, 'color:blue; font-weight:bold');
                }
            }
            
            // Add attacker bonus
            if (isAttacker && isPlayer) {
                _score += TARGET_SCORE_RETALIATION_PIRATE;
                _interesting = true;
                //console.log(`%c🔍 PLAYER RETALIATION: ${enemy.shipTypeName} responding to player attack: +${TARGET_SCORE_RETALIATION_PIRATE}, score now ${_score}`, 'color:green; font-weight:bold');
            } else if (isAttacker) {
                _score += TARGET_SCORE_RETALIATION_PIRATE;
                _interesting = true;
            }
            
            // Role-specific scoring - add based on enemy role
            switch (enemy.role) {
                case AI_ROLE.PIRATE:
                    if (isPlayer) {
                        _interesting = true;
                        
                        // Add cargo bonus
                        const cargoAmount = target.getCargoAmount ? target.getCargoAmount() : (target.cargo?.length || 0);
                        if (cargoAmount > 5) {
                            const cargoBonus = TARGET_SCORE_PIRATE_CARGO_BASE + cargoAmount * TARGET_SCORE_PIRATE_CARGO_MULT;
                            _score += cargoBonus;
                        }
                    } else if (target.role === AI_ROLE.HAULER || target.role === AI_ROLE.TRANSPORT) {
                        _score += TARGET_SCORE_PIRATE_PREY_HAULER;
                        _interesting = true;
                    } else if (target && target.constructor?.name === 'Cargo') {
                        // Never treat Cargo as a hostile combat target; handled by cargo AI
                        return TARGET_SCORE_INVALID;
                    }
                    break;
                    
                case AI_ROLE.POLICE:
                    if (isPlayer && system?.isPlayerWanted()) {
                        _score += TARGET_SCORE_BASE_WANTED;
                        _interesting = true;
                        //console.log(`%c🔍 POLICE TARGETING WANTED PLAYER: ${enemy.shipTypeName} base score: +${TARGET_SCORE_BASE_WANTED}, score now ${_score}`, 'color:green');
                    } else if (target.isWanted) {
                        _score += TARGET_SCORE_BASE_WANTED;
                        _interesting = true;
                        if (target.role === AI_ROLE.PIRATE) {
                            _score += TARGET_SCORE_WANTED_PIRATE_BONUS;
                        }
                    }
                    break;
                
                    
                case AI_ROLE.ALIEN:
                    if (target.role !== AI_ROLE.ALIEN) { // Target anything that is not an Alien
                        _score += 50; // Base score for any non-alien target (human ships)
                        _interesting = true;
                        
                        // Bonus against military ships
                        const targetFaction = enemy._getShipFaction ? enemy._getShipFaction(target) : 'UNKNOWN';
                        if (targetFaction === 'MILITARY') {
                            _score += TARGET_SCORE_COMBAT_VS_ALIEN_BONUS; // Strong bonus for military targets
                        }
                    }
                    break;

                case AI_ROLE.HAULER:
                case AI_ROLE.TRANSPORT:
                    if (isPlayer && (isAttacker || enemy.forcedCombatTimer > 0)) {
                        //console.log(`%c🔍 HAULER TARGETING PLAYER: ${enemy.shipTypeName} evaluating player as attacker`, 'color:green');
                        _score += TARGET_SCORE_RETALIATION_HAULER;
                        _interesting = true;
                        
                        if (enemy.hull < enemy.maxHull * 0.5) {
                            _score -= 20;
                            //console.log(`%c🔍 HAULER TARGETING PLAYER: ${enemy.shipTypeName} damaged - may flee instead, score now ${_score}`, 'color:orange');
                        }
                    } else if (isAttacker && !isPlayer) {
                        _score += TARGET_SCORE_RETALIATION_HAULER;
                        _interesting = true;
                        if (enemy.hull < enemy.maxHull * 0.5) _score -= 20;
                    }
                    break;
                    
                case AI_ROLE.COMBAT:
                    // Combat ships prioritize based on faction
                    const myFaction = enemy._getShipFaction ? enemy._getShipFaction(enemy) : 'UNKNOWN';
                    const targetFaction = enemy._getShipFaction ? enemy._getShipFaction(target) : 'UNKNOWN';
                    
                    // Military ships prioritize aliens with significant bonus
                    if (myFaction === 'MILITARY' && target.role === AI_ROLE.ALIEN) {
                        _score += TARGET_SCORE_COMBAT_VS_ALIEN_BONUS; // Strong bonus for military vs aliens
                        _interesting = true;
                    }
                    // Imperial and Separatist ships prioritize each other with strong bonus
                    else if ((myFaction === 'IMPERIAL' && targetFaction === 'SEPARATIST') ||
                             (myFaction === 'SEPARATIST' && targetFaction === 'IMPERIAL')) {
                        _score += TARGET_SCORE_COMBAT_RIVALRY_BONUS; // Strong bonus for faction rivalry
                        _interesting = true;
                    }
                    // General combat engagement - only target pirates, not players
                    else if (target.role === AI_ROLE.PIRATE) {
                        _score += TARGET_SCORE_COMBAT_STANDARD_ENGAGE; // Standard combat priority
                        _interesting = true;
                    }
                    // Lower priority for other targets
                    else {
                        _score += TARGET_SCORE_COMBAT_LOW_PRIORITY; // Low priority for other ships
                        _interesting = true;
                    }
                    break;
            }
            
            // Log before distance penalties
            if (isPlayer) {
                //console.log(`%c🔍 DEBUG: Before distance penalties, score is ${_score}`, 'color:purple');
            }
            
            // Distance penalties - Only if interesting
            if (_interesting) {
                const distance = enemy.distanceTo(target);
                
                // Reduced penalty for important targets
                let distancePenaltyMult = TARGET_SCORE_DISTANCE_PENALTY_MULT;
                if (isAttacker || isPlayer) {
                    distancePenaltyMult *= 0.5;
                }
                
                // Calculate penalty with cap
                const distancePenalty = Math.min(40, distance * distancePenaltyMult);
                
                // Apply penalty with protection for important targets
                if ((isAttacker || isPlayer) && isPlayer) {
                    const minScoreAfterPenalty = 10;
                    const adjustedPenalty = Math.min(distancePenalty, Math.max(0, _score - minScoreAfterPenalty));
                    _score -= adjustedPenalty;
                    //console.log(`%c🔍 PLAYER DISTANCE PENALTY: ${adjustedPenalty.toFixed(1)} (capped from ${distancePenalty.toFixed(1)}), score now ${_score.toFixed(1)}`, 'color:blue');
                } else {
                    _score -= distancePenalty;
                }
                
                // Add hull damage bonus
                if (target.hull !== undefined && target.maxHull !== undefined) {
                    const damagePercent = 1 - (target.hull / target.maxHull);
                    const damageBonus = Math.min(TARGET_SCORE_HULL_DAMAGE_MAX_BONUS, damagePercent * TARGET_SCORE_HULL_DAMAGE_MULT);
                    _score += damageBonus;
                    
                    if (isPlayer && damageBonus > 0) {
                        //console.log(`%c🔍 DEBUG: Added damage bonus ${damageBonus.toFixed(1)}, score now ${_score.toFixed(1)}`, 'color:purple');
                    }
                }
            }
            
            // Safety check
            if (_score < -1000) {
                //console.error(`🚨 CORRUPT SCORE DETECTED: ${_score}, resetting to 10`);
                _score = 10;
            }
            
            // Mark uninteresting if score too low
            if (_interesting && _score <= 0) {
                if (isPlayer) {
                    //console.log(`%c🔍 PLAYER TARGET REJECTED: Score too low (${_score})`, 'color:orange');
                }
                _interesting = false;
            }
            
            // Final debug log
            if (isPlayer) {
                //console.log(`%c🔍 FINAL PLAYER SCORE: ${enemy.shipTypeName} rates player at ${_score.toFixed(1)} (interesting: ${_interesting})`, _interesting ? 'color:green; font-weight:bold' : 'color:orange');
            }
            
            // Return appropriate final score
            if (!_interesting) {
                return TARGET_SCORE_INVALID;
            }
            
            return _score;
        })(this, target, system); // Pass current context to IIFE
    }
}

// Apply targeting methods to Enemy prototype
// This will be called after Enemy class is defined
function applyEnemyTargetingMethods() {
    if (typeof Enemy === 'undefined') {
        console.error('Enemy class not found - cannot apply targeting methods');
        return;
    }
    
    // Copy all methods from EnemyTargeting to Enemy prototype
    Object.getOwnPropertyNames(EnemyTargeting.prototype).forEach(methodName => {
        if (methodName !== 'constructor') {
            Enemy.prototype[methodName] = EnemyTargeting.prototype[methodName];
        }
    });
}
