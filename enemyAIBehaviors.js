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

    /** Clear range stall tracking values. */
    _resetRangeStall() {
        this._rangeStallTimer = 0;
        this._lastRangeSample = null;
        this._rangeStallState = null;
        this._rangeStallTriggerTime = undefined; // Reset trigger time for next stall
    }

    /**
     * Detect prolonged lack of range change and force an aggressive state to break stalemates.
     * @param {number} distanceToTarget - Current distance to the active target.
     */
    _handleRangeStall(distanceToTarget) {
        if (!Number.isFinite(distanceToTarget)) {
            this._resetRangeStall();
            return;
        }

        // Only track stalls in combat approach states, not SNIPING (intentional standoff)
        const relevantState = this.currentState === AI_STATE.APPROACHING ||
            this.currentState === AI_STATE.REPOSITIONING;

        if (!relevantState) {
            this._resetRangeStall();
            return;
        }

        // Only detect stalls when ships are close enough for it to matter
        // (within effective firing range + some margin)
        const maxStallRange = this.visualFiringRange * 1.5;
        if (distanceToTarget > maxStallRange) {
            this._resetRangeStall();
            return;
        }

        const dtSeconds = (typeof deltaTime === 'number' && isFinite(deltaTime)) ? (deltaTime / 1000) : 0;
        if (dtSeconds <= 0) {
            return;
        }

        // Check cooldown - don't detect stalls immediately after forcing a state change
        if (this._rangeStallCooldown > 0) {
            this._rangeStallCooldown -= dtSeconds;
            return;
        }

        if (this._lastRangeSample === null || this._rangeStallState !== this.currentState) {
            this._lastRangeSample = distanceToTarget;
            this._rangeStallTimer = 0;
            this._rangeStallState = this.currentState;
            return;
        }

        const rangeDelta = Math.abs(distanceToTarget - this._lastRangeSample);
        const stallThreshold = Math.max(this.size * 0.15, 10);

        if (rangeDelta < stallThreshold) {
            this._rangeStallTimer += dtSeconds;
        } else {
            this._rangeStallTimer = 0;
        }

        this._lastRangeSample = distanceToTarget;

        // Randomize trigger time to desync multiple ships
        if (this._rangeStallTriggerTime === undefined) {
            this._rangeStallTriggerTime = 2.0 + random(0, 1.0); // 2-3 seconds
        }

        if (this._rangeStallTimer >= this._rangeStallTriggerTime) {
            const newState = (this.currentState === AI_STATE.REPOSITIONING)
                ? AI_STATE.APPROACHING
                : AI_STATE.ATTACK_PASS;
            const targetName = this.target?.shipTypeName || (this.target === this.currentSystem?.player ? 'Player' : 'Unknown');

            AI_LOG(`⚠️ RANGE STALL: ${this.shipTypeName} vs ${targetName} - stalled for ${this._rangeStallTimer.toFixed(1)}s at range ${distanceToTarget.toFixed(0)} -> forcing ${AI_STATE_NAME[newState]}`);

            this.changeState(newState);
            this._resetRangeStall();

            // Add cooldown to prevent immediate re-triggering
            this._rangeStallCooldown = 5.0; // 5 second cooldown after forcing state change
        }
    }

    /**
    * Helper to check if the current ship has weapons suitable for sniping.
     * @returns {boolean} True if a sniping weapon is equipped.
     */
    hasGoodSnipingWeapon() {
        const weapon = this.currentWeapon;
        if (!weapon) return false;

        const weaponType = weapon.type;
        if (!weaponType) return false;

        // Normalise complex weapon type strings (e.g. "straight3") to their base family when possible
        const baseType = (typeof getBaseWeaponType === 'function')
            ? getBaseWeaponType(weaponType)
            : weaponType;

        if (baseType === WEAPON_TYPE.BEAM ||
            baseType === WEAPON_TYPE.MISSILE ||
            baseType === WEAPON_TYPE.TURRET ||
            baseType === WEAPON_TYPE.PROJECTILE ||
            baseType === WEAPON_TYPE.STRAIGHT) {
            return true;
        }

        // Fallback: handle any straight/projectile variants if the helper above is unavailable
        if (typeof weaponType === 'string') {
            if (weaponType.startsWith(WEAPON_TYPE.STRAIGHT) || weaponType.startsWith(WEAPON_TYPE.PROJECTILE)) {
                return true;
            }
        }

        return false;
    }

    _shouldConsiderCover(distanceToTarget) {
        const lowHull = this.maxHull > 0 ? (this.hull / this.maxHull) < 0.80 : false;
        const lowShield = this.maxShield > 0 ? (this.shield / this.maxShield) < 0.50 : false;
        const stateWantsCover = this.currentState === AI_STATE.REPOSITIONING; // only actively look for cover while repositioning or when damaged
        const farEnough = typeof distanceToTarget === 'number' ? distanceToTarget > (this.size + 50) : true;
        return farEnough && (lowHull || lowShield || stateWantsCover);
    }

    _refreshCoverCandidates(system) {
        if (!system || !Array.isArray(system.asteroids) || !system.asteroids.length) return [];
        const now = (typeof millis === 'function') ? millis() : (performance?.now?.() || Date.now());
        const cacheValid = system._coverCandidateCacheTime && (now - system._coverCandidateCacheTime) < 500;
        if (cacheValid && Array.isArray(system.coverCandidates)) return system.coverCandidates;

        const minSize = 0; // consider all asteroids for cover, even tiny ones
        const maxSpeed = 1.2; // prefer static/slow
        system.coverCandidates = system.asteroids.filter(ast => {
            if (!ast || ast.destroyed) return false;
            if (!ast.pos || typeof ast.pos.x !== 'number' || typeof ast.pos.y !== 'number') return false;
            const size = ast.size || (ast.maxRadius ? ast.maxRadius * 2 : 0);
            if (!size || size < minSize) return false;
            const speed = (ast.vel && typeof ast.vel.mag === 'function') ? ast.vel.mag() : Math.hypot(ast.vel?.x || 0, ast.vel?.y || 0);
            return speed <= maxSpeed;
        });
        system._coverCandidateCacheTime = now;
        return system.coverCandidates;
    }

    _isLineBlockedByAsteroid(ast, p1, p2) {
        if (!ast || !p1 || !p2) return false;
        const r = ast.maxRadius || (ast.size ? ast.size * 0.5 : 0);
        if (!r || r <= 0) return false;
        const cx = ast.pos?.x; const cy = ast.pos?.y;
        if (cx === undefined || cy === undefined) return false;
        const dx = p2.x - p1.x;
        const dy = p2.y - p1.y;
        const lenSq = dx * dx + dy * dy;
        if (lenSq === 0) return false;
        const t = ((cx - p1.x) * dx + (cy - p1.y) * dy) / lenSq;
        const clampedT = Math.max(0, Math.min(1, t));
        const projX = p1.x + clampedT * dx;
        const projY = p1.y + clampedT * dy;
        const distSq = (projX - cx) * (projX - cx) + (projY - cy) * (projY - cy);
        return distSq <= r * r;
    }

    _computeCoverApproachPoint(ast, targetPos) {
        if (!ast?.pos) return null;
        const radius = ast.maxRadius || (ast.size ? ast.size * 0.5 : 0);
        const ref = targetPos || this.target?.pos || this.pos;
        const refX = ref?.x ?? ast.pos.x;
        const refY = ref?.y ?? ast.pos.y;

        // Calculate direction from asteroid to target (opposite of what we want for cover)
        let dirX = refX - ast.pos.x;
        let dirY = refY - ast.pos.y;
        let mag = Math.hypot(dirX, dirY);

        // Fallback to our own position if target/reference overlaps the asteroid center
        if (!isFinite(mag) || mag < 1e-3) {
            dirX = this.pos.x - ast.pos.x;
            dirY = this.pos.y - ast.pos.y;
            mag = Math.hypot(dirX, dirY);
        }

        if (!isFinite(mag) || mag < 1e-3) {
            dirX = 1; dirY = 0; mag = 1; // arbitrary but stable direction
        }

        const invMag = 1 / mag;
        const normX = dirX * invMag;
        const normY = dirY * invMag;
        const padding = Math.max(this.size * 0.7, 14);
        const offset = (radius || 0) + padding;

        // Place approach point on the far side of asteroid from target
        const px = ast.pos.x - normX * offset;
        const py = ast.pos.y - normY * offset;
        return createVector(px, py);
    }

    _scoreCoverCandidate(ast, targetPos) {
        if (!ast || !ast.pos) return -Infinity;
        const r = ast.maxRadius || (ast.size ? ast.size * 0.5 : 0);
        if (!r || r <= 0) return -Infinity;
        const dx = ast.pos.x - this.pos.x;
        const dy = ast.pos.y - this.pos.y;
        const dist = Math.hypot(dx, dy);
        const distFactor = 1 / (dist + 1);
        const sizeFactor = Math.max(0, Math.min(1, ((r * 2) - this.size) / Math.max(r * 2, 1)));
        const speed = (ast.vel && typeof ast.vel.mag === 'function') ? ast.vel.mag() : Math.hypot(ast.vel?.x || 0, ast.vel?.y || 0);
        const speedPenalty = Math.min(speed, 3) * 0.4;
        const blocksLOS = targetPos ? this._isLineBlockedByAsteroid(ast, this.pos, targetPos) : false;
        let score = sizeFactor * 1.1 + distFactor * 0.6 - speedPenalty;
        if (blocksLOS) score += 1.0; else score -= 0.5;
        return score;
    }

    _pickCoverTarget(system, targetPos) {
        const candidates = this._refreshCoverCandidates(system);
        if (!candidates.length) return null;
        // Take nearest N to bound cost
        const nearest = [];
        for (const ast of candidates) {
            if (!ast?.pos) continue;
            const dx = ast.pos.x - this.pos.x;
            const dy = ast.pos.y - this.pos.y;
            const d2 = dx * dx + dy * dy;
            nearest.push({ ast, d2 });
        }
        nearest.sort((a, b) => a.d2 - b.d2);
        const maxCoverDist = 500; // max distance for cover asteroids
        const limited = nearest.filter(entry => entry.d2 <= maxCoverDist * maxCoverDist).slice(0, 8);
        let best = null;
        let bestScore = -Infinity;
        for (const entry of limited) {
            const score = this._scoreCoverCandidate(entry.ast, targetPos);
            if (score > bestScore) {
                bestScore = score;
                best = entry.ast;
            }
        }
        return best;
    }

    _updateCoverPeek(dtSeconds) {
        if (!this.repositionTarget || !this.coverTarget) return;

        // Check distance to the base cover position
        const dx = this.repositionTarget.x - this.pos.x;
        const dy = this.repositionTarget.y - this.pos.y;
        const dist = Math.hypot(dx, dy);

        // Start peek cycle if at cover and timer is expired
        // Relaxed distance check (was 30) to ensure ships actually trigger the behavior
        const triggerDist = Math.max(50, this.size * 2);
        if (dist < triggerDist && (!this.coverPeekTimer || this.coverPeekTimer <= 0)) {
            this.coverPeekTimer = 4.0; // 2s out, 2s back
            this.peekSide = Math.random() < 0.5 ? 1 : -1;
        }

        if (this.coverPeekTimer > 0) {
            this.coverPeekTimer = Math.max(0, this.coverPeekTimer - dtSeconds);

            // If in first half of timer (peeking out), modify repositionTarget
            if (this.coverPeekTimer > 2.0) {
                const targetPos = this.target?.pos || this.pos;
                const ax = this.coverTarget.pos.x;
                const ay = this.coverTarget.pos.y;
                const tx = targetPos.x;
                const ty = targetPos.y;

                let dirX = tx - ax;
                let dirY = ty - ay;
                const len = Math.hypot(dirX, dirY);

                if (len > 0.001) {
                    dirX /= len;
                    dirY /= len;

                    // Perpendicular vector (sideways)
                    const perpX = -dirY * this.peekSide;
                    const perpY = dirX * this.peekSide;

                    // Calculate peek offset distance
                    const radius = this.coverTarget.maxRadius || (this.coverTarget.size ? this.coverTarget.size * 0.5 : 20);
                    const peekOffset = radius * 1.5 + this.size; // Increased from 1.2 for safety

                    // Push the peek point slightly further away from the asteroid to avoid clipping
                    // The 'dir' vector points from Asteroid to Target.
                    // We want to move opposite to 'dir' (away from target, which is also away from asteroid on this side)
                    const outwardPush = this.size * 2.0;

                    // Modify repositionTarget to be the peek position
                    this.repositionTarget = createVector(
                        this.repositionTarget.x + perpX * peekOffset - dirX * outwardPush,
                        this.repositionTarget.y + perpY * peekOffset - dirY * outwardPush
                    );
                }
            }
        }
    }

    _updateCoverBehavior(system, targetExists, distanceToTarget) {
        const dtSeconds = (typeof deltaTime === 'number' && isFinite(deltaTime)) ? (deltaTime / 1000) : 0.016;
        if (this.coverEvalTimer > 0 && dtSeconds > 0) {
            this.coverEvalTimer = Math.max(0, this.coverEvalTimer - dtSeconds);
        }

        if (!this._shouldConsiderCover(distanceToTarget)) {
            return false;
        }

        // Fast bail if system lacks usable cover
        if (!system || !Array.isArray(system.asteroids) || system.asteroids.length === 0) {
            return false;
        }

        const targetPos = (targetExists && this.target?.pos) ? this.target.pos : null;

        if (this.coverTarget && this.coverTarget.destroyed) {
            console.log(`${this.shipTypeName} cover target destroyed, clearing cover`);
            this.coverTarget = null;
            this.repositionTarget = null;
        }

        // Keep ships in REPOSITIONING while an intact cover target exists.
        if (this.coverTarget && !this.coverTarget.destroyed && this.currentState !== AI_STATE.REPOSITIONING) {
            this.changeState(AI_STATE.REPOSITIONING);
        }

        const refreshCoverApproachPoint = () => {
            if (!this.coverTarget) return;
            const coverPoint = this._computeCoverApproachPoint(this.coverTarget, targetPos);
            if (coverPoint) {
                this.repositionTarget = coverPoint;
            } else if (this.coverTarget.pos) {
                this.repositionTarget = this.coverTarget.pos;
            }
        };

        // Only pick a new cover target when timer expires
        if (this.coverEvalTimer <= 0 || !this.coverTarget) {
            const cover = this._pickCoverTarget(system, targetPos);
            this.coverEvalTimer = 1.6 + Math.random() * 0.3; // slower cadence to reduce churn
            if (cover) {
                const coverScore = this._scoreCoverCandidate(cover, targetPos);
                const blocksLOS = targetPos ? this._isLineBlockedByAsteroid(cover, this.pos, targetPos) : false;
                if (coverScore >= 0.35) {
                    // Compute detailed score components for logging
                    const r = cover.maxRadius || (cover.size ? cover.size * 0.5 : 0);
                    const dx = cover.pos.x - this.pos.x;
                    const dy = cover.pos.y - this.pos.y;
                    const distToAst = Math.hypot(dx, dy);
                    const distFactor = 1 / (distToAst + 1);
                    const sizeFactor = Math.max(0, Math.min(1, ((r * 2) - this.size) / Math.max(r * 2, 1)));
                    const speed = (cover.vel && typeof cover.vel.mag === 'function') ? cover.vel.mag() : Math.hypot(cover.vel?.x || 0, cover.vel?.y || 0);
                    const speedPenalty = Math.min(speed, 3) * 0.4;

                    console.log(`${this.shipTypeName} attempting cover at (${cover.pos.x.toFixed(0)}, ${cover.pos.y.toFixed(0)}) | score:${coverScore.toFixed(2)} dist_tgt:${distanceToTarget.toFixed(0)} hull:${(this.hull / this.maxHull * 100).toFixed(0)}% | ast_r:${r.toFixed(1)} dist_ast:${distToAst.toFixed(1)} sizeF:${sizeFactor.toFixed(2)} distF:${distFactor.toFixed(2)} speedP:${speedPenalty.toFixed(2)} LOS:${blocksLOS ? 'Y' : 'N'}`);
                    this.coverTarget = cover;
                    refreshCoverApproachPoint();
                    if (this.currentState !== AI_STATE.REPOSITIONING) {
                        console.log(`${this.shipTypeName} entering REPOSITIONING to reach cover at (${this.repositionTarget.x.toFixed(0)}, ${this.repositionTarget.y.toFixed(0)})`);
                        this.changeState(AI_STATE.REPOSITIONING);
                    }
                }
            } else {
                this.coverTarget = null;
                this.repositionTarget = null;
            }
        }

        refreshCoverApproachPoint();

        this._updateCoverPeek(dtSeconds);
        return !!this.coverTarget;
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

        // 3. Compute distance to target and angle for firing (with predictive aiming)
        let distanceToTarget = targetExists ? this.distanceTo(this.target) : Infinity;
        let shootingAngle = this.angle;
        if (targetExists) {
            // Use predictive aiming - aim where the target WILL BE, not where it IS
            const predictedPos = this.predictTargetPosition();
            if (predictedPos) {
                shootingAngle = atan2(
                    predictedPos.y - this.pos.y,
                    predictedPos.x - this.pos.x
                );
            } else {
                // Fallback to current position if prediction fails
                shootingAngle = atan2(
                    this.target.pos.y - this.pos.y,
                    this.target.pos.x - this.pos.x
                );
            }
            this._handleRangeStall(distanceToTarget);
        } else {
            this._resetRangeStall();
        }

        // 4. Run state‐transition logic.
        //    REMOVED: if (!isInForcedCombat)
        //    Allow updateCombatState to run even if in forced combat,
        //    so Haulers can transition from APPROACHING to ATTACK_PASS.
        this.updateCombatState(targetExists, distanceToTarget);

        // 4b. Cover behavior: pick cover and reposition if needed
        this._updateCoverBehavior(system, targetExists, distanceToTarget);

        // 5. If just entered (or still in) FLEEING, perform flee logic and exit
        // ← NO MORE "if (FLEEING) updateFleeingAI" here!
        if (this.currentState === AI_STATE.FLEEING) {
            // state helper handles movement & exit
            return;
        }

        // 6. Otherwise, do normal combat movement & firing
        const desiredMovementTargetPos = this.getMovementTargetForState(distanceToTarget);
        this.performSafeRotationAndThrust(system, desiredMovementTargetPos);
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
                    ENEMY_AI_LOG(`Police ${this.shipTypeName} responding to system-wide alert`);
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

            // Handle combat directly without calling updateCombatAI (which would reset targeting)
            const targetExists = this.isTargetValid(this.target);
            if (targetExists) {
                const distanceToTarget = this.distanceTo(this.target);

                // Calculate shooting angle with predictive aiming
                let shootingAngle = this.angle;
                const predictedPos = this.predictTargetPosition();
                if (predictedPos) {
                    shootingAngle = atan2(
                        predictedPos.y - this.pos.y,
                        predictedPos.x - this.pos.x
                    );
                } else {
                    shootingAngle = atan2(
                        this.target.pos.y - this.pos.y,
                        this.target.pos.x - this.pos.x
                    );
                }

                // Update combat state transitions
                this.updateCombatState(targetExists, distanceToTarget);

                // Move and fire
                const desiredMovementTargetPos = this.getMovementTargetForState(distanceToTarget);
                this.performSafeRotationAndThrust(system, desiredMovementTargetPos);
                this.performFiring(system, targetExists, distanceToTarget, shootingAngle);
            }
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
                    } else {
                        // 80% chance to patrol elsewhere in the system
                        const patrolRange = 2000; // Area to patrol within
                        const patrolAngle = random(TWO_PI);
                        const patrolDist = random(700, patrolRange);

                        // Create patrol point relative to current position
                        this.patrolTargetPos = createVector(
                            this.pos.x + cos(patrolAngle) * patrolDist,
                            this.pos.y + sin(patrolAngle) * patrolDist
                        );
                    }
                } else {
                    // No station, just patrol randomly
                    this.patrolTargetPos = createVector(random(-1000, 1000), random(-1000, 1000));
                }
                desiredMovementTargetPos = this.patrolTargetPos;
            }

            this.performSafeRotationAndThrust(system, desiredMovementTargetPos);
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
                    HAULER_LOG(`Hauler ${this.shipTypeName} fleeing from attack by ${this.lastAttacker.shipTypeName || 'Player'}`);
                    this.target = this.lastAttacker;
                    this.changeState(AI_STATE.FLEEING);
                    if (uiManager) uiManager.addMessage(`${this.shipTypeName} fleeing from attack`);
                    // Apply immediate velocity boost away
                    if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.8)); }
                    this.attackCooldown = 15.0; // Cooldown before being provoked again
                    return; // Skip normal logic
                } else { // Retaliate if hull is okay
                    // Unarmed haulers should not attempt to fight — flee instead
                    if (!this.isArmed()) {
                        HAULER_LOG(`Unarmed ${this.shipTypeName} fleeing instead of retaliating.`);
                        this.target = this.lastAttacker;
                        this.changeState(AI_STATE.FLEEING);
                        if (this.target?.pos) { let escapeDir = p5.Vector.sub(this.pos, this.target.pos).normalize(); this.vel.add(escapeDir.mult(this.maxSpeed * 0.8)); }
                        this.attackCooldown = 15.0;
                        return;
                    }

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
                    this.performSafeRotationAndThrust(system, this.patrolTargetPos); // Move towards patrol target
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
                HAULER_LOG(`Damaged hauler ${this.shipTypeName} attempting to escape!`);
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
                    HAULER_LOG(`WARN: Hauler ${this.shipTypeName} in LEAVING_SYSTEM state has no patrolTargetPos! Attempting recovery.`);
                    this.setLeavingSystemTarget(system);
                    desiredMovementTargetPos = this.patrolTargetPos;
                    if (!desiredMovementTargetPos) {
                        shouldMove = false;
                        break;
                    }
                }

                // --- DETAILED DEBUG LOGGING ---
                try {
                    const jz = system?.jumpZoneCenter;
                    HAULER_LOG(`[LEAVING] ${this.role} ${this.shipTypeName} pos=(${this.pos.x.toFixed(1)},${this.pos.y.toFixed(1)}) target=(${desiredMovementTargetPos.x.toFixed(1)},${desiredMovementTargetPos.y.toFixed(1)}) jumpZone=${jz ? `${jz.x.toFixed(1)},${jz.y.toFixed(1)}` : 'none'}`);
                } catch (e) { /* ignore logging errors */ }

                // Calculate distance to target (Jump Zone/Edge)
                let dE = dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y);
                HAULER_LOG(`[LEAVING] ${this.shipTypeName} distanceToTarget=${dE.toFixed(1)}`);


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
                            // Can't follow, initiate jump-fade to keep visual consistency
                            this.initiateJumpFade();
                            HAULER_LOG(`${this.shipTypeName} (Guard) could not follow principal, initiating jump fade`);
                        }
                    } else {
                        // Normal hauler/transport leaving
                        this.inCombat = false;
                        this.haulerCombatTimer = undefined;
                        HAULER_LOG(`[LEAVING] ${this.role} ${this.shipTypeName} reached jump zone (dE=${dE.toFixed(1)}). Initiating jump fade.`);
                        // Use centralized helper so all ships use the same visual fade behavior
                        this.initiateJumpFade(0.35, 1.2);
                        HAULER_LOG(`${this.role} ${this.shipTypeName} left the system (fade)`);
                    }
                    shouldMove = false;
                }
                break; // End LEAVING_SYSTEM case

            default:
                this.target = null;
                HAULER_LOG(`Hauler ${this.shipTypeName} in unexpected state ${this.currentState}. Resetting.`);
                if (system?.station?.pos) {
                    this.patrolTargetPos = system.station.pos.copy();
                    this.changeState(AI_STATE.PATROLLING);
                } else {
                    this.changeState(AI_STATE.LEAVING_SYSTEM);
                }
                shouldMove = false;
                break;
        }

        if (shouldMove) {
            this.performSafeRotationAndThrust(system, desiredMovementTargetPos);
        }
        this.updatePhysics();
    }

    /** Transport AI Logic - Moves between two endpoints. */
    updateTransportAI(system) {
        if (!system) return;

        const _resolveSpaceObjectCommodities = (obj) => {
            const defaultSet = { produces: ['Metals'], buys: [] };
            const mapping = (typeof SPACE_OBJECT_COMMODITIES !== 'undefined' && obj?.type)
                ? (SPACE_OBJECT_COMMODITIES[obj.type] || SPACE_OBJECT_COMMODITIES.default)
                : null;

            const produces = Array.isArray(obj?.produces) && obj.produces.length
                ? obj.produces.slice()
                : (mapping?.produces || defaultSet.produces);
            const buys = Array.isArray(obj?.buys) && obj.buys.length
                ? obj.buys.slice()
                : (mapping?.buys || defaultSet.buys);
            return { produces, buys };
        };

        const _sellCargoToSpaceObject = (buyList) => {
            const summary = { total: 0, items: [] };
            if (!Array.isArray(buyList) || buyList.length === 0 || !Array.isArray(this.cargoHold)) {
                return summary;
            }

            const shuffled = buyList.slice();
            for (let i = shuffled.length - 1; i > 0; i--) {
                const j = Math.floor(random() * (i + 1));
                [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
            }

            shuffled.forEach(name => {
                const entry = this.cargoHold.find(item => item && item.name === name && item.quantity > 0);
                if (!entry) { return; }
                const amount = Math.max(1, Math.floor(entry.quantity * random(0.35, 0.9)));
                const removed = (typeof this.removeCargo === 'function') ? this.removeCargo(name, amount) : 0;
                if (removed > 0) {
                    summary.items.push({ name, quantity: removed });
                    summary.total += removed;
                }
            });

            return summary;
        };

        const _buyFromSpaceObject = (produceList, targetLoad) => {
            if (!Array.isArray(produceList) || produceList.length === 0 || typeof this._loadCargoFromOptions !== 'function') {
                return 0;
            }
            const before = (typeof this.getCargoAmount === 'function') ? this.getCargoAmount() : 0;
            this._loadCargoFromOptions(produceList, targetLoad, null);
            const after = (typeof this.getCargoAmount === 'function') ? this.getCargoAmount() : before;
            return Math.max(0, after - before);
        };

        const _tradeAtSpaceObject = (obj) => {
            const { produces, buys } = _resolveSpaceObjectCommodities(obj);
            const sellSummary = _sellCargoToSpaceObject(buys);
            const afterSell = (typeof this.getCargoAmount === 'function') ? this.getCargoAmount() : 0;
            const targetLoad = Math.max(afterSell, Math.floor((this.cargoCapacity || 0) * random(0.35, 0.7)));
            const bought = _buyFromSpaceObject(produces, targetLoad);
            return { sold: sellSummary.total, bought, soldItems: sellSummary.items, produces, buys };
        };

        const _tradeAtStation = (activeSystem) => {
            if (!activeSystem?.station) { return { sold: 0, bought: 0 }; }
            const before = (typeof this.getCargoAmount === 'function') ? this.getCargoAmount() : 0;
            this._hasDockedThisPause = false;
            if (typeof this.handleStationDocking === 'function') {
                this.handleStationDocking(activeSystem);
            }
            const after = (typeof this.getCargoAmount === 'function') ? this.getCargoAmount() : before;
            return {
                sold: Math.max(0, before - after),
                bought: Math.max(0, after - before)
            };
        };

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
            // Build sensible local transporter routes using SpaceObjects near planets when possible.
            let pts = [];
            let objs = []; // parallel array storing SpaceObject references (or null)

            // Ensure space objects exist for planets if spawning helper is available
            if ((!Array.isArray(system.spaceObjects) || system.spaceObjects.length === 0) && typeof system.spawnSpaceObjectsForPlanets === 'function') {
                try { system.spawnSpaceObjectsForPlanets(); } catch (e) { /* non-fatal */ }
            }

            if (Array.isArray(system.spaceObjects) && system.spaceObjects.length > 0 && Array.isArray(system.planets) && system.planets.length > 0) {
                // Build a multi-point route that visits spaceObjects associated with planets.
                // Each transporter picks a random subset of available space objects
                // to create varied routes and prevent all ships from going to the same places.
                const availableSOs = [];
                const maxSoDistance = 900;

                // Collect all valid space objects near planets
                for (let p of system.planets) {
                    if (!p || !p.pos) continue;
                    for (let so of system.spaceObjects) {
                        if (!so || so.destroyed) continue;
                        const d = dist(so.pos.x, so.pos.y, p.pos.x, p.pos.y);
                        if (d < maxSoDistance && !availableSOs.includes(so)) {
                            availableSOs.push(so);
                        }
                    }
                }

                // Shuffle the available space objects using Fisher-Yates
                for (let i = availableSOs.length - 1; i > 0; i--) {
                    const j = Math.floor(random() * (i + 1));
                    [availableSOs[i], availableSOs[j]] = [availableSOs[j], availableSOs[i]];
                }

                // Pick a random subset of 2-4 space objects for this transporter's route
                const numStops = Math.min(availableSOs.length, Math.floor(random(2, 5)));
                const selectedSOs = availableSOs.slice(0, numStops);

                // If we found space objects, create a route
                if (selectedSOs.length > 0) {
                    // Randomly decide whether to start at the station (50% chance)
                    const startAtStation = random() < 0.5;
                    if (startAtStation && system.station && system.station.pos) {
                        pts.push(system.station.pos.copy()); objs.push(null);
                    }

                    // Add each selected spaceObject position to the route
                    for (let so of selectedSOs) {
                        // Add a small jitter to SO visit points so multiple transports
                        // don't converge exactly on the same coordinates.
                        const p = so.pos.copy();
                        const jitterAmt = 15; // pixels - increased for more spread
                        p.add(createVector(random(-jitterAmt, jitterAmt), random(-jitterAmt, jitterAmt)));
                        pts.push(p);
                        objs.push(so);
                    }

                    // If we didn't start at station, add station as final stop (50% chance)
                    if (!startAtStation && system.station && system.station.pos && random() < 0.5) {
                        pts.push(system.station.pos.copy()); objs.push(null);
                    }
                }
            }

            // Fallback to previous simple behavior
            if (pts.length === 0) {
                if (system.station) {
                    pts.push(system.station.pos.copy()); objs.push(null);
                    pts.push(p5.Vector.add(system.station.pos, createVector(random(-500, 500), random(-500, 500)))); objs.push(null);
                } else {
                    pts.push(createVector(0, 0)); objs.push(null);
                    pts.push(createVector(500, 0)); objs.push(null);
                }
            }

            this.routePoints = pts;
            this.routeObjects = objs;
            // Start at a random position in the route for varied transporter behavior
            this.currentRouteIndex = Math.floor(random() * pts.length);
            this.waitTimer = 0;
            // store the displayed destination object for rendering/UI
            this.destinationObject = this.routeObjects[this.currentRouteIndex] || null;
            AI_LOG(`Transporter ${this.shipTypeName} route set with ${pts.length} stops, starting at index ${this.currentRouteIndex}.`);
        }


        let destination = this.routePoints[this.currentRouteIndex];

        // Track corresponding space object (may be null)
        let destObj = (Array.isArray(this.routeObjects) && this.routeObjects[this.currentRouteIndex]) ? this.routeObjects[this.currentRouteIndex] : null;

        // Compute an approach target to avoid steering directly to the object's center.
        // This places the movement target outside the SO's collision radius along
        // the line from SO -> ship, with a small lateral jitter to reduce stacking.
        const approachMargin = 12;
        let soRadius = null;
        let dockDistance = null;
        // Stable per-stop lateral jitter so approach target does not move every frame
        if (this._routeApproachJitterIndex !== this.currentRouteIndex) {
            this._routeApproachJitter = random(-6, 6);
            this._routeApproachJitterIndex = this.currentRouteIndex;
        }
        const lateralJitter = this._routeApproachJitter || 0;
        let moveTarget = (destination && typeof destination.copy === 'function') ? destination.copy() : (destination ? createVector(destination.x, destination.y) : createVector(0, 0));
        if (destObj && destObj.pos) {
            try {
                const dir = p5.Vector.sub(this.pos, destObj.pos);
                if (dir.mag() < 1e-3) dir.set(1, 0); // avoid zero-length
                dir.normalize();
                // Use the authoritative collision radius when available, otherwise
                // derive an approximate radius from the object's size, falling
                // back to 30 if neither is present.
                soRadius = (typeof destObj.collisionRadius === 'number')
                    ? destObj.collisionRadius
                    : (typeof destObj.size === 'number' ? (destObj.size * 0.5) : 30);
                dockDistance = soRadius + (this.size * 0.6) + approachMargin;
                moveTarget = p5.Vector.add(destObj.pos, p5.Vector.mult(dir, dockDistance));
                // lateral jitter to spread ships around the object perimeter (stable per stop)
                const lateral = p5.Vector.fromAngle(atan2(dir.y, dir.x) + HALF_PI).mult(lateralJitter);
                moveTarget.add(lateral);
            } catch (e) {
                moveTarget = destination.copy ? destination.copy() : createVector(destination.x, destination.y);
            }
        }
        // If destination object has been destroyed, skip to next
        if (destObj && destObj.destroyed) {
            // try advance to next non-destroyed target
            const maxTries = this.routePoints ? this.routePoints.length : 1;
            for (let i = 0; i < maxTries; i++) {
                this.currentRouteIndex = (this.currentRouteIndex + 1) % (this.routePoints ? this.routePoints.length : 1);
                destObj = (Array.isArray(this.routeObjects) && this.routeObjects[this.currentRouteIndex]) ? this.routeObjects[this.currentRouteIndex] : null;
                if (!destObj || !destObj.destroyed) break;
            }
        }
        this.destinationObject = destObj || null;

        // Movement vector/distance (use moveTarget so ships aim for an exterior point)
        this.tempVector.set(moveTarget.x - this.pos.x, moveTarget.y - this.pos.y);
        const distanceToMoveTarget = this.tempVector.mag();

        // Also track distance to the actual destination object center so arrival uses the real proximity,
        // not the animated moveTarget ring (which can drift as the ship approaches).
        const distanceToDestination = (destObj && destObj.pos)
            ? dist(this.pos.x, this.pos.y, destObj.pos.x, destObj.pos.y)
            : distanceToMoveTarget;
        const distanceToStation = (system?.station?.pos)
            ? dist(this.pos.x, this.pos.y, system.station.pos.x, system.station.pos.y)
            : Infinity;

        // Determine arrival threshold: if destination is a SpaceObject, stop safely outside its collision radius
        let arrivalThreshold = 30;
        if (destObj) {
            const baseDockDistance = dockDistance !== null ? dockDistance : ((soRadius || 0) + (this.size * 0.6) + approachMargin);
            const settlePadding = Math.max(6, this.size * 0.2); // small buffer so we consider the ship "at" the ring
            arrivalThreshold = Math.max(30, baseDockDistance + settlePadding);
        }
        const slowSpeedThreshold = 0.3;

        // Arrival hysteresis: once latched, allow a small margin before resuming thrust
        if (this._arrivalLatchIndex !== this.currentRouteIndex) {
            this._arrivalLatched = false;
            this._arrivalLatchIndex = this.currentRouteIndex;
        }
        const arrivalReleaseMargin = 25;
        if (distanceToDestination <= arrivalThreshold) {
            this._arrivalLatched = true;
        }
        const holdArrival = this._arrivalLatched && distanceToDestination <= arrivalThreshold + arrivalReleaseMargin;

        if (!holdArrival) {
            // Move towards the computed exterior approach target instead of the center
            if (this.waitTimer !== 0) { this.waitTimer = 0; } // Reset timer if moving
            this.performSafeRotationAndThrust(system, moveTarget); // Use helper
            this._arrivalLatched = false;
        } else {
            // Arrival detected: brake and conduct trade if destination is a SpaceObject
            this.vel.mult(0.2);

            // If close enough AND moving very slowly, act as 'docked' at the object
            if (this.vel.mag() < slowSpeedThreshold) {
                if (this.waitTimer === 0 && !this._tradedAtCurrentStop) {
                    this.waitTimer = random(1500, 4000); // Wait 1.5-4s
                    this._tradedAtCurrentStop = true; // Prevent duplicate trade messages
                    ENEMY_AI_LOG(`Transporter ${this.shipTypeName} arrived at destination. Waiting.`);

                    // Perform trade/load when first stopping near a SpaceObject or station
                    try {
                        const nearStation = system?.station && system.station.pos
                            ? distanceToStation < Math.max(60, system.station.size * 1.2)
                            : false;

                        const tradeContext = destObj && !destObj.destroyed
                            ? { summary: _tradeAtSpaceObject(destObj), name: (typeof destObj.getDisplayName === 'function') ? destObj.getDisplayName() : (destObj.type || 'space object') }
                            : (nearStation ? { summary: _tradeAtStation(system), name: system?.station?.name || 'station' } : null);

                        if (tradeContext && (tradeContext.summary.sold > 0 || tradeContext.summary.bought > 0)) {
                            const playerRef = this.currentSystem?.player || (typeof player !== 'undefined' ? player : null);
                            const playerDist = playerRef && playerRef.pos && this.pos
                                ? dist(this.pos.x, this.pos.y, playerRef.pos.x, playerRef.pos.y)
                                : Infinity;
                            if (playerDist < 2000 && typeof uiManager !== 'undefined') {
                                const soldText = tradeContext.summary.sold > 0 ? `sold ${tradeContext.summary.sold}` : '';
                                const boughtText = tradeContext.summary.bought > 0 ? `bought ${tradeContext.summary.bought}` : '';
                                const details = [soldText, boughtText].filter(Boolean).join(' & ');
                                uiManager.addMessage(`${this.shipTypeName} traded at ${tradeContext.name}${details ? ` (${details})` : ''}`);
                            }
                        }
                    } catch (e) {
                        // defensive: ignore trading errors
                    }
                } else if (this.waitTimer > 0) {
                    this.waitTimer -= deltaTime;
                    if (this.waitTimer <= 0) {
                        // Switch destination.
                        this.currentRouteIndex = (this.currentRouteIndex + 1) % this.routePoints.length;
                        ENEMY_AI_LOG(`Transporter ${this.shipTypeName} switching destination.`);
                        this.waitTimer = 0;
                        this._tradedAtCurrentStop = false; // Reset for next stop
                        this.vel.set(0, 0); // Reset velocity
                        // Update destinationObject for next leg
                        this.destinationObject = (Array.isArray(this.routeObjects) && this.routeObjects[this.currentRouteIndex]) ? this.routeObjects[this.currentRouteIndex] : null;
                    }
                }
            }
        }

        // Apply physics
        this.updatePhysics(); // Use centralized physics update
    }

    /** Handles cargo collection AI */
    updateCargoCollectionAI(system) {
        const determineReturnState = () => {
            if (this.previousState !== null && this.previousState !== undefined) {
                return this.previousState;
            }
            return (this.role === AI_ROLE.TRANSPORT) ? AI_STATE.TRANSPORTING : AI_STATE.IDLE;
        };

        if (typeof this.getRemainingCargoCapacity === 'function' && this.getRemainingCargoCapacity() <= 0) {
            this.cargoTarget = null;
            this.cargoCollectionCooldown = this.role === AI_ROLE.TRANSPORT ? 0.5 : 1.0;
            this.changeState(determineReturnState());
            return false;
        }

        // If our target cargo disappeared or was collected, find a new one
        if (!this.cargoTarget || this.cargoTarget.collected) {
            this.cargoTarget = this.detectCargo(system);

            // If no cargo found, return to normal behavior
            if (!this.cargoTarget) {
                this.changeState(determineReturnState());
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
        this.performSafeRotationAndThrust(system, desiredMovementTargetPos); // Or the transport-specific movement
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

        // --- Attempt ranged harpoon if available ---
        // Quick guard: skip heavy firing calculations if we don't have a harpoon weapon
        try {
            const hasHarpoon = Array.isArray(this.weapons) && this.weapons.some(w => {
                try {
                    return (typeof getBaseWeaponType === 'function') ? getBaseWeaponType(w.type || '') === WEAPON_TYPE.HARPOON : (typeof (w.type) === 'string' && w.type.toLowerCase().includes('harpoon'));
                } catch (e) {
                    return (typeof (w.type) === 'string' && w.type.toLowerCase().includes('harpoon'));
                }
            });

            if (hasHarpoon && distanceToCargo >= collectionRadius && distanceToCargo <= (this.firingRange || 0)) {
                const harpoonIdx = (Array.isArray(this.weapons)) ? this.weapons.findIndex(w => {
                    try { return (typeof getBaseWeaponType === 'function') ? getBaseWeaponType(w.type || '') === WEAPON_TYPE.HARPOON : (typeof (w.type) === 'string' && w.type.toLowerCase().includes('harpoon')); } catch (e) { return (typeof (w.type) === 'string' && w.type.toLowerCase().includes('harpoon')); }
                }) : -1;
                if (harpoonIdx !== -1 && typeof this.isWeaponReady === 'function' && this.isWeaponReady()) {
                    // Prevent firing duplicate harpoons if owner or cargo already has a tether
                    const ownerHasHarpoon = !!((((this._harpoonCount || 0) + (this._harpoonPending || 0)) > 0));
                    const cargoHarpooned = !!(this.cargoTarget && (((this.cargoTarget._harpoonCount || 0) + (this.cargoTarget._harpoonPending || 0)) > 0));
                    if (ownerHasHarpoon || cargoHarpooned) {
                        // Skip firing if already tethered
                    } else {
                        // Temporarily activate the harpoon weapon with proper bookkeeping
                        const prevWeapon = this.currentWeapon;
                        const prevFireRate = this.fireRate;
                        const prevWeaponIndex = this.weaponIndex;

                        const harpoonWeapon = this.weapons[harpoonIdx];
                        this.weaponIndex = harpoonIdx;
                        this.currentWeapon = harpoonWeapon;
                        this.fireRate = harpoonWeapon.fireRate || this.fireRate;

                        // Leading calculation copied from fireWeapon for harpoon interception
                        let fireAngle = atan2(this.cargoTarget.pos.y - this.pos.y, this.cargoTarget.pos.x - this.pos.x);
                        try {
                            const tx = this.cargoTarget.pos.x - this.pos.x;
                            const ty = this.cargoTarget.pos.y - this.pos.y;
                            const tvx = (this.cargoTarget.vel && this.cargoTarget.vel.x) ? this.cargoTarget.vel.x : 0;
                            const tvy = (this.cargoTarget.vel && this.cargoTarget.vel.y) ? this.cargoTarget.vel.y : 0;
                            const s = (harpoonWeapon && harpoonWeapon.speed) ? harpoonWeapon.speed : 30;

                            const a = (tvx * tvx + tvy * tvy) - (s * s);
                            const b = 2 * (tx * tvx + ty * tvy);
                            const c = tx * tx + ty * ty;
                            let t = null;
                            if (Math.abs(a) < 1e-6) {
                                if (Math.abs(b) > 1e-6) {
                                    const tl = -c / b;
                                    if (tl > 0) t = tl;
                                }
                            } else {
                                const disc = b * b - 4 * a * c;
                                if (disc >= 0) {
                                    const sqrtD = Math.sqrt(disc);
                                    const t1 = (-b - sqrtD) / (2 * a);
                                    const t2 = (-b + sqrtD) / (2 * a);
                                    const candidates = [t1, t2].filter(v => v > 0).sort((A, B) => A - B);
                                    if (candidates.length) t = candidates[0];
                                }
                            }

                            if (t && isFinite(t) && t > 0) {
                                const aimX = this.cargoTarget.pos.x + tvx * t;
                                const aimY = this.cargoTarget.pos.y + tvy * t;
                                fireAngle = atan2(aimY - this.pos.y, aimX - this.pos.x);
                            }
                        } catch (e) {
                            // fall back to direct aim
                        }

                        // Fire via WeaponSystem directly (avoids fireWeapon's Cargo block)
                        try {
                            const fired = (typeof WeaponSystem !== 'undefined')
                                ? WeaponSystem.fire(this, system, fireAngle, harpoonWeapon.type, null)
                                : false;
                            if (fired) {
                                this.fireCooldown = this.computeCooldown(this.fireRate);
                            }
                        } catch (e) {
                            // ignore
                        }

                        // restore previous weapon state
                        this.weaponIndex = prevWeaponIndex;
                        this.currentWeapon = prevWeapon;
                        this.fireRate = prevFireRate;
                    }
                }
            }
        } catch (e) {
            // defensive: ignore any issues here
        }


        // --- Check if we've reached the cargo for collection ---
        if (distanceToCargo < collectionRadius) {
            // Double-check cargo hasn't been collected already (race condition protection)
            if (this.cargoTarget.collected) {
                CARGO_LOG(`WARN: ${this.shipTypeName} tried to collect already-collected cargo`);
                this.cargoTarget = null;
                this.cargoCollectionCooldown = 0.5;
                return false;
            }

            const pickupResult = (typeof this.collectCargoFromWorld === 'function')
                ? this.collectCargoFromWorld(this.cargoTarget)
                : { added: 0, fullyCollected: false };
            if (pickupResult.added > 0) {
                CARGO_LOG(`${this.shipTypeName} collected ${this.cargoTarget.type} x${pickupResult.added}`);
            } else {
                CARGO_LOG(`${this.shipTypeName} attempted to collect ${this.cargoTarget.type} but lacked capacity`);
            }

            if (pickupResult.fullyCollected || pickupResult.added <= 0 || pickupResult.capacityFull) {
                this.cargoTarget = null;
                this.changeState(determineReturnState());
            }

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

    /**
     * Combat Role AI Logic - For military, imperial, and separatist combat ships
     * These ships patrol, scan, dock at stations, and engage enemies with faction-specific bonuses.
     * Implements combat timer to allow ships to disengage and return to patrol after engagement.
     * @param {Object} system - The current star system
     */
    updateCombatRoleAI(system) {
        // Check for attackers FIRST - similar to hauler logic
        if (this.lastAttacker && this.isTargetValid(this.lastAttacker) &&
            this.currentState !== AI_STATE.FLEEING && // Don't interrupt fleeing
            this.currentState !== AI_STATE.APPROACHING && // Don't interrupt combat
            this.currentState !== AI_STATE.ATTACK_PASS &&
            this.currentState !== AI_STATE.REPOSITIONING &&
            this.currentState !== AI_STATE.SNIPING && // Don't interrupt sniping
            (!this.attackCooldown || this.attackCooldown <= 0)) {

            const attackerDistance = this.distanceTo(this.lastAttacker);
            if (attackerDistance < this.detectionRange * 1.5) {
                // Store current state before switching to combat
                this.previousCombatState = this.currentState;
                this.previousTargetPos = this.patrolTargetPos ? this.patrolTargetPos.copy() : null;

                AI_LOG(`Combat ship ${this.shipTypeName} engaging attacker ${this.lastAttacker.shipTypeName || 'Player'}`);
                this.target = this.lastAttacker;
                this.changeState(AI_STATE.APPROACHING);
                this.combatEngagementTimer = 15.0; // Engage for 15 seconds before disengaging
                this.inCombat = true; // Mark as in combat
                this.attackCooldown = 3.0; // Prevent re-triggering for 3 seconds

                // Continue with combat logic below
            }
        }

        // Check if currently in combat mode
        if (this.inCombat === true) {
            // Update combat timer
            if (this.combatEngagementTimer !== undefined) {
                this.combatEngagementTimer -= deltaTime / 1000;
                if (this.combatEngagementTimer <= 0) {
                    AI_LOG(`Combat ship ${this.shipTypeName} disengaging from combat.`);
                    this.combatEngagementTimer = undefined; // Clear timer
                    this.lastAttacker = null; // Forget attacker
                    this.target = null; // Clear target
                    this.inCombat = false; // Clear combat flag
                    this.attackCooldown = 10.0; // Prevent immediate re-engagement

                    // Return to patrol
                    this.changeState(AI_STATE.PATROLLING);
                    this.patrolTargetPos = this.previousTargetPos || system?.station?.pos?.copy();

                    // Move towards patrol target this frame
                    this.performSafeRotationAndThrust(system, this.patrolTargetPos);
                    this.updatePhysics();
                    return;
                }
            }

            // Force reinstate combat state if needed
            if (this.currentState !== AI_STATE.APPROACHING &&
                this.currentState !== AI_STATE.ATTACK_PASS &&
                this.currentState !== AI_STATE.REPOSITIONING &&
                this.currentState !== AI_STATE.FLEEING &&
                this.currentState !== AI_STATE.SNIPING &&
                this.currentState !== AI_STATE.PATROLLING) {
                AI_LOG(`Forcing combat ship ${this.shipTypeName} back to APPROACHING state`);
                this.changeState(AI_STATE.APPROACHING);
            }

            // Continue with normal combat AI below
        }

        // Check the combat state flags as well (backup check)
        if (this.currentState === AI_STATE.FLEEING ||
            this.currentState === AI_STATE.APPROACHING ||
            this.currentState === AI_STATE.ATTACK_PASS ||
            this.currentState === AI_STATE.REPOSITIONING ||
            this.currentState === AI_STATE.SNIPING) {
            // Set the inCombat flag if needed
            this.inCombat = true;
        } else {
            // Reset combat flag if not in combat state and timer expired
            if (!this.combatEngagementTimer || this.combatEngagementTimer <= 0) {
                this.inCombat = false;
            }
        }

        // Combat ships don't trade - just patrol and fight
        // Determine ship faction based on ship type
        const shipDef = SHIP_DEFINITIONS[this.shipTypeName];
        let faction = 'MILITARY'; // Default

        if (shipDef && shipDef.aiRoles) {
            if (shipDef.aiRoles.includes('IMPERIAL')) {
                faction = 'IMPERIAL';
            } else if (shipDef.aiRoles.includes('SEPARATIST')) {
                faction = 'SEPARATIST';
            } else if (shipDef.aiRoles.includes('MILITARY')) {
                faction = 'MILITARY';
            }
        }

        // Update targeting with faction-specific priorities
        let targetExists = this.updateTargeting(system);

        // Apply faction-specific AI bonuses when engaging
        if (targetExists && this.target) {
            const targetDef = this.target.shipTypeName ? SHIP_DEFINITIONS[this.target.shipTypeName] : null;
            const targetFaction = (this.target instanceof Player)
                ? (this.target.playerFaction || 'UNKNOWN')
                : (this._getShipFaction ? this._getShipFaction(this.target) : 'UNKNOWN');

            // Military ships get bonus against aliens
            if (faction === 'MILITARY' && this.target.role === AI_ROLE.ALIEN) {
                // Apply significant AI bonus: better aim, faster reactions
                this._applyMilitaryAlienBonus();
            }

            // Imperial and Separatist ships get bonus against each other
            if ((faction === 'IMPERIAL' && targetFaction === 'SEPARATIST') ||
                (faction === 'SEPARATIST' && targetFaction === 'IMPERIAL')) {
                this._applyFactionRivalryBonus();
            }
        }

        targetExists = this.isTargetValid(this.target);

        // Calculate distance and angle for combat (with predictive aiming)
        let distanceToTarget = targetExists ? this.distanceTo(this.target) : Infinity;
        let shootingAngle = this.angle;
        if (targetExists) {
            // Use predictive aiming - aim where the target WILL BE, not where it IS
            const predictedPos = this.predictTargetPosition();
            if (predictedPos) {
                shootingAngle = atan2(
                    predictedPos.y - this.pos.y,
                    predictedPos.x - this.pos.x
                );
            } else {
                // Fallback to current position if prediction fails
                shootingAngle = atan2(
                    this.target.pos.y - this.pos.y,
                    this.target.pos.x - this.pos.x
                );
            }
            this._handleRangeStall(distanceToTarget);
        } else {
            this._resetRangeStall();
        }

        // Run state-transition logic
        this.updateCombatState(targetExists, distanceToTarget);

        // If in patrol mode (no target), occasionally pause to scan or dock
        if (!targetExists || this.currentState === AI_STATE.PATROLLING) {
            this._updateCombatPatrolBehavior(system);
            return;
        }

        // Normal combat behavior
        const desiredMovementTargetPos = this.getMovementTargetForState(distanceToTarget);
        this.performSafeRotationAndThrust(system, desiredMovementTargetPos);
        this.performFiring(system, targetExists, distanceToTarget, shootingAngle);
    }

    /**
     * Apply AI bonus for military ships fighting aliens
     * Increases accuracy and turn rate temporarily
     */
    _applyMilitaryAlienBonus() {
        // Temporarily boost turn rate for better tracking
        if (!this._militaryBonusApplied) {
            this._baseTurnRateBackup = this.baseTurnRate;
            this.baseTurnRate *= 1.3; // 30% better turning
            this.rotationSpeed *= 1.3;
            this._militaryBonusApplied = true;
        }

        // Tighter angle tolerance for more accurate shots
        this.angleTolerance = 0.15; // ~8.5 degrees instead of ~15
    }

    /**
     * Apply AI bonus for imperial vs separatist rivalry
     * Increases aggression and combat effectiveness
     */
    _applyFactionRivalryBonus() {
        this.maxSpeed = this.baseMaxSpeed * COMBAT_RIVALRY_MAX_SPEED_MULT;
        this.engageDistance = (180 + this.size * 0.5) * COMBAT_RIVALRY_ENGAGE_DISTANCE_MULT;
        this.firingRange = (350 + this.size * 0.3) * COMBAT_RIVALRY_FIRING_RANGE_MULT;
        this.visualFiringRange = this.firingRange;
    }

    /**
     * Miner AI Logic - Targets asteroids, destroys them, collects cargo, and sells at station
     * @param {Object} system - The current star system
     */
    updateMinerAI(system) {
        // Apply initialization timing offset to prevent synchronized spawning behavior
        if (this._minerInitOffset !== undefined && this._minerElapsedTime !== undefined) {
            this._minerElapsedTime += (deltaTime / 1000);
            if (this._minerElapsedTime < this._minerInitOffset) {
                // Still in initialization delay - idle with gentle drift
                this.vel.mult(0.95);
                this.updatePhysics();
                return;
            } else if (this._minerElapsedTime >= this._minerInitOffset && this.currentState === AI_STATE.IDLE) {
                // Initialization complete - clear offset and start patrolling
                this._minerInitOffset = undefined;
                this._minerElapsedTime = undefined;
            }
        }

        // Handle cargo collection if currently collecting
        if (this.currentState === AI_STATE.COLLECTING_CARGO) {
            if (!this.updateCargoCollectionAI(system)) {
                // Done collecting, return to mining
                this.changeState(AI_STATE.IDLE);
                this.asteroidTarget = null;
            }
            this.updatePhysics();
            return;
        }

        // Check if cargo hold is full - if so, return to station
        const cargoAmount = (typeof this.getCargoAmount === 'function') ? this.getCargoAmount() : 0;
        const cargoCapacity = this.cargoCapacity || 0;
        const cargoFull = cargoCapacity > 0 && cargoAmount >= cargoCapacity;

        if (cargoFull || (cargoAmount > 0 && this.shouldReturnToStation)) {
            // Head to station to sell cargo
            if (!system?.station?.pos) {
                // No station in system, just idle
                this.changeState(AI_STATE.IDLE);
                this.vel.mult(0.95);
                this.updatePhysics();
                return;
            }

            const distToStation = dist(this.pos.x, this.pos.y, system.station.pos.x, system.station.pos.y);

            if (distToStation < this.stationProximityThreshold) {
                // At station - dock and sell cargo
                if (typeof this.handleStationDocking === 'function') {
                    this.handleStationDocking(system);
                }
                this.shouldReturnToStation = false;
                this.changeState(AI_STATE.IDLE);
                // Clean up asteroid targeting
                if (this.asteroidTarget && this.asteroidTarget._targetingCount > 0) {
                    this.asteroidTarget._targetingCount--;
                }
                this.asteroidTarget = null;
            } else {
                // Move toward station
                this.changeState(AI_STATE.PATROLLING);
                this.performSafeRotationAndThrust(system, system.station.pos);
            }
            this.updatePhysics();
            return;
        }

        // Look for cargo on the ground first (prioritize existing cargo)
        if (this.cargoCollectionCooldown <= 0) {
            const cargoTarget = this.detectCargo(system);
            if (cargoTarget) {
                this.cargoTarget = cargoTarget;
                this.changeState(AI_STATE.COLLECTING_CARGO);
                this.updatePhysics();
                return;
            }
        }

        // Clean up old asteroid target tracking
        if (this.asteroidTarget && this.asteroidTarget.destroyed && this.asteroidTarget._targetingCount > 0) {
            this.asteroidTarget._targetingCount--;
        }

        // Find and target nearest asteroid
        if (!this.asteroidTarget || this.asteroidTarget.destroyed) {
            this.asteroidTarget = this.findNearestAsteroid(system);

            if (!this.asteroidTarget) {
                // No asteroids available - patrol to search for asteroids instead of idling
                if (cargoAmount > 0) {
                    // Have cargo but no asteroids - return to station
                    this.shouldReturnToStation = true;
                } else {
                    // No cargo and no asteroids - patrol the system to search
                    if (this.currentState !== AI_STATE.PATROLLING) {
                        this.changeState(AI_STATE.PATROLLING);
                    }

                    // Initialize miner's patrol preference if not set
                    if (this._minerPatrolRange === undefined) {
                        this._minerPatrolRange = random(1000, 2500); // Individual patrol range
                        this._minerPatrolMinDist = random(600, 1200); // Individual minimum distance
                    }

                    // Initialize patrol target if not set
                    if (!this.patrolTargetPos) {
                        // Start patrol from a random point in the system
                        const patrolAngle = random(TWO_PI);
                        const patrolDist = random(this._minerPatrolMinDist, this._minerPatrolRange);
                        this.patrolTargetPos = createVector(
                            this.pos.x + cos(patrolAngle) * patrolDist,
                            this.pos.y + sin(patrolAngle) * patrolDist
                        );
                    }

                    // Check if reached patrol target
                    const distToPatrolTarget = dist(
                        this.pos.x, this.pos.y,
                        this.patrolTargetPos.x, this.patrolTargetPos.y
                    );

                    if (distToPatrolTarget < 100) {
                        // Reached patrol point - select new one with individual variation
                        const patrolAngle = random(TWO_PI);
                        const patrolDist = random(this._minerPatrolMinDist, this._minerPatrolRange);
                        this.patrolTargetPos = createVector(
                            this.pos.x + cos(patrolAngle) * patrolDist,
                            this.pos.y + sin(patrolAngle) * patrolDist
                        );
                    }

                    // Move toward patrol target
                    this.performSafeRotationAndThrust(system, this.patrolTargetPos);
                }
                this.updatePhysics();
                return;
            }
        }

        // Move toward and attack the asteroid
        const distanceToAsteroid = dist(
            this.pos.x, this.pos.y,
            this.asteroidTarget.pos.x, this.asteroidTarget.pos.y
        );

        // Set state to approaching if not already
        if (this.currentState === AI_STATE.IDLE) {
            this.changeState(AI_STATE.APPROACHING);
        }

        // Calculate ideal attack distance (not too close, not too far)
        const idealDistance = this.firingRange * 0.7; // Stay at 70% of firing range
        const stopDistance = idealDistance * 0.8; // Start slowing down earlier

        // Only thrust if we're far from the ideal position
        if (distanceToAsteroid > stopDistance) {
            // Move toward asteroid
            this.performSafeRotationAndThrust(system, this.asteroidTarget.pos);
        } else {
            // We're close enough - just rotate to face it and apply strong damping
            const angleToAsteroid = atan2(
                this.asteroidTarget.pos.y - this.pos.y,
                this.asteroidTarget.pos.x - this.pos.x
            );

            // Rotate to face target
            let angleDiff = angleToAsteroid - this.angle;
            while (angleDiff > PI) angleDiff -= TWO_PI;
            while (angleDiff < -PI) angleDiff += TWO_PI;

            if (Math.abs(angleDiff) > 0.05) {
                this.angle += angleDiff * 0.1; // Smooth rotation
            }

            // Apply strong damping when close - reduces jitter
            this.vel.mult(0.92);
        }

        // Fire at asteroid if in range
        if (distanceToAsteroid < this.firingRange && this.isArmed()) {
            const angleToAsteroid = atan2(
                this.asteroidTarget.pos.y - this.pos.y,
                this.asteroidTarget.pos.x - this.pos.x
            );

            // Calculate angle difference to see if we're aimed correctly
            let angleDiff = angleToAsteroid - this.angle;
            // Normalize angle difference to -PI to PI range
            while (angleDiff > PI) angleDiff -= TWO_PI;
            while (angleDiff < -PI) angleDiff += TWO_PI;

            // Fire if weapon is ready and we're roughly aimed at the asteroid (within 15 degrees)
            if (this.isWeaponReady() && Math.abs(angleDiff) < 0.26) { // 0.26 radians ~= 15 degrees
                this.fireWeapon(system, angleToAsteroid);
            }
        }

        this.updatePhysics();
    }

    /**
     * Find a suitable static asteroid to mine
     * Selects from top candidates with randomization to prevent all miners targeting the same asteroid
     * @param {Object} system - The current star system
     * @returns {Object|null} A selected asteroid or null if none found
     */
    findNearestAsteroid(system) {
        if (!system || !Array.isArray(system.asteroids) || system.asteroids.length === 0) {
            return null;
        }

        const MAX_ASTEROID_SPEED = 0.1; // Only target nearly-static asteroids
        const candidates = [];

        // Initialize miner's random offset if not set (for consistent individual preference)
        if (this._minerAsteroidPreference === undefined) {
            this._minerAsteroidPreference = random(-200, 200);
        }

        // Collect all valid asteroids with their distances
        for (const asteroid of system.asteroids) {
            if (!asteroid || asteroid.destroyed) continue;
            if (!asteroid.pos || typeof asteroid.pos.x !== 'number' || typeof asteroid.pos.y !== 'number') continue;

            // Skip fast-moving asteroids
            if (asteroid.vel) {
                const speed = Math.sqrt(asteroid.vel.x * asteroid.vel.x + asteroid.vel.y * asteroid.vel.y);
                if (speed > MAX_ASTEROID_SPEED) continue;
            }

            const distance = dist(this.pos.x, this.pos.y, asteroid.pos.x, asteroid.pos.y);

            // Apply individual miner preference to distance (gives each miner slight bias)
            const adjustedDistance = distance + (asteroid._targetingCount || 0) * 800 + this._minerAsteroidPreference;

            candidates.push({ asteroid, distance: adjustedDistance });
        }

        if (candidates.length === 0) return null;

        // Sort by adjusted distance
        candidates.sort((a, b) => a.distance - b.distance);

        // Select from top 3-5 candidates randomly (or fewer if not enough asteroids)
        const topCandidates = Math.min(5, candidates.length);
        const selectionPool = candidates.slice(0, topCandidates);

        // Weighted random selection - closer asteroids more likely but not guaranteed
        const weights = selectionPool.map((_, i) => topCandidates - i);
        const totalWeight = weights.reduce((sum, w) => sum + w, 0);
        let randomValue = random(totalWeight);

        let selectedIndex = 0;
        for (let i = 0; i < weights.length; i++) {
            randomValue -= weights[i];
            if (randomValue <= 0) {
                selectedIndex = i;
                break;
            }
        }

        const selected = selectionPool[selectedIndex].asteroid;

        // Track targeting count on the asteroid
        if (!selected._targetingCount) selected._targetingCount = 0;
        selected._targetingCount++;

        return selected;
    }

    /**
     * Update combat patrol behavior - pause to scan, dock occasionally
     * @param {Object} system - The current star system
     */
    _updateCombatPatrolBehavior(system) {
        if (this.currentState !== AI_STATE.PATROLLING) {
            this.changeState(AI_STATE.PATROLLING);
        }

        // Similar to police patrol but occasionally dock at station
        if (!this.patrolTargetPos) {
            // Random patrol behavior: sometimes station, sometimes random point
            if (system?.station?.pos && random() < 0.3) {
                this.patrolTargetPos = system.station.pos.copy();
            } else {
                const patrolRange = 2000;
                const patrolAngle = random(TWO_PI);
                const patrolDist = random(500, patrolRange);
                this.patrolTargetPos = createVector(
                    this.pos.x + cos(patrolAngle) * patrolDist,
                    this.pos.y + sin(patrolAngle) * patrolDist
                );
            }
        }

        let desiredMovementTargetPos = this.patrolTargetPos;
        let distToPatrolTarget = desiredMovementTargetPos
            ? dist(this.pos.x, this.pos.y, desiredMovementTargetPos.x, desiredMovementTargetPos.y)
            : Infinity;

        if (distToPatrolTarget < 50) {
            // Pause to "scan" occasionally
            if (random() < 0.2) {
                this.vel.mult(0.5); // Slow down
                // Wait a bit before selecting new patrol point
                if (!this._scanPauseTimer) {
                    this._scanPauseTimer = random(1, 3); // 1-3 seconds
                } else {
                    this._scanPauseTimer -= deltaTime / 1000;
                    if (this._scanPauseTimer <= 0) {
                        this._scanPauseTimer = null;
                        this.patrolTargetPos = null; // Will select new target next frame
                    }
                }
                return;
            }

            // Select new patrol target
            if (system?.station?.pos && random() < 0.25) {
                this.patrolTargetPos = system.station.pos.copy();
            } else {
                const patrolRange = 2000;
                const patrolAngle = random(TWO_PI);
                const patrolDist = random(500, patrolRange);
                this.patrolTargetPos = createVector(
                    this.pos.x + cos(patrolAngle) * patrolDist,
                    this.pos.y + sin(patrolAngle) * patrolDist
                );
            }
            desiredMovementTargetPos = this.patrolTargetPos;
        }

        this.performSafeRotationAndThrust(system, desiredMovementTargetPos);
    }

    /**
     * Lightweight obstacle avoidance: nudge movement target away from the nearest
     * asteroid, ship, or space object intersecting the current path, or slightly slow the ship for a short time.
     * Low CPU: only checks obstacles within the forward cone and a capped distance.
     * Note: Local transports (AI_ROLE.TRANSPORT) do not avoid space objects, only asteroids and ships.
     */
    _avoidObstaclesAndAdjustTarget(system, desiredMovementTargetPos) {
        if (!system || !desiredMovementTargetPos) return desiredMovementTargetPos;

        // Quick guards
        const toX = desiredMovementTargetPos.x - this.pos.x;
        const toY = desiredMovementTargetPos.y - this.pos.y;
        const toDist = Math.hypot(toX, toY);
        if (!isFinite(toDist) || toDist < 1) return desiredMovementTargetPos;

        // Direction vector towards target
        const dirX = toX / toDist;
        const dirY = toY / toDist;

        // Only consider obstacles within this forward distance
        const maxCheckDist = Math.min(600, toDist);

        let threat = null;
        let threatProj = Infinity;
        let threatRadius = 0;

        // Helper to check a single obstacle
        const checkObstacle = (obj) => {
            if (!obj || obj === this || obj.destroyed || !obj.pos) return;

            const dx = obj.pos.x - this.pos.x;
            const dy = obj.pos.y - this.pos.y;
            const proj = dx * dirX + dy * dirY; // distance along forward vector

            if (proj <= 0 || proj > maxCheckDist) return;

            // perpendicular squared distance from path
            const perpSq = dx * dx + dy * dy - proj * proj;

            // Determine radius based on object type
            let r = 0;
            if (obj.maxRadius) {
                r = obj.maxRadius; // Asteroid
            } else if (obj.size) {
                r = obj.size * 0.5; // Ship (size is usually diameter)
            } else {
                r = 20; // Fallback
            }

            const safety = Math.max(this.size, 16) + r + 12; // padding

            if (perpSq <= safety * safety) {
                if (proj < threatProj) {
                    threat = obj;
                    threatProj = proj;
                    threatRadius = r;
                }
            }
        };

        // Check asteroids
        if (Array.isArray(system.asteroids)) {
            for (const ast of system.asteroids) {
                checkObstacle(ast);
            }
        }

        // Check enemies
        if (Array.isArray(system.enemies)) {
            for (const enemy of system.enemies) {
                checkObstacle(enemy);
            }
        }

        // Check player
        if (system.player) {
            checkObstacle(system.player);
        }

        // Check space objects (satellites, platforms, debris, etc.)
        // Local transports and police do not avoid space objects (they operate around stations)
        if (this.role !== AI_ROLE.TRANSPORT && this.role !== AI_ROLE.POLICE && Array.isArray(system.spaceObjects)) {
            for (const spaceObj of system.spaceObjects) {
                checkObstacle(spaceObj);
            }
        }

        if (!threat) return desiredMovementTargetPos;

        // If threat is very close, prefer to slow briefly rather than sharp steering
        const closeThresh = Math.max(threatRadius, this.size) + 60;
        if (threatProj < closeThresh) {
            // Set a short avoidance timer so we damp velocity for a moment
            this._asteroidAvoidTimer = 0.6;
            return desiredMovementTargetPos; // keep target but slow ship in wrapper
        }

        // Nudge movement target laterally away from obstacle path
        // Perpendicular vector to forward dir
        let perpX = -dirY;
        let perpY = dirX;
        // choose side that increases distance from obstacle center
        const ax = threat.pos.x - this.pos.x;
        const ay = threat.pos.y - this.pos.y;
        const dot = ax * perpX + ay * perpY;
        if (dot < 0) { perpX = -perpX; perpY = -perpY; }

        const offset = Math.max(threatRadius, this.size) + 48;
        return createVector(desiredMovementTargetPos.x + perpX * offset, desiredMovementTargetPos.y + perpY * offset);
    }

    /**
     * Wrapper that applies lightweight avoidance then delegates to existing rotation/thrust.
     * Also applies gentle damping while avoidance timer is active.
     */
    performSafeRotationAndThrust(system, desiredMovementTargetPos) {
        const safeTarget = this._avoidObstaclesAndAdjustTarget(system, desiredMovementTargetPos);
        // Delegate to existing movement helper
        try {
            this.performRotationAndThrust(safeTarget);
        } catch (e) {
            // Defensive: if underlying method is missing, do nothing
        }

        // If an avoidance timer is set, gently reduce velocity to avoid collisions
        if (this._asteroidAvoidTimer === undefined) this._asteroidAvoidTimer = 0;
        if (this._asteroidAvoidTimer > 0) {
            this._asteroidAvoidTimer = Math.max(0, this._asteroidAvoidTimer - ((typeof deltaTime === 'number') ? (deltaTime / 1000) : 0.016));
            // Gentle damping (cheap): small multiplier to slow over avoidance window
            this.vel.mult(0.92);
        }
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
