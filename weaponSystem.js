// ****** weaponSystem.js ******

class WeaponSystem {
    /** Handles force blast weapon (area effect damage) */
    static fireForce(owner, system, angle) {
        if (!owner || !system) return;
        
        // Get position to emit force wave from
        const forceWavePos = owner.pos.copy();
        
        // Get owner's current weapon for properties
        const weapon = owner.currentWeapon;
        const damage = weapon?.damage || 20; // Increased base damage
        const color = weapon?.color || [255, 0, 0];
        
        console.log(`Force wave fired by ${owner instanceof Player ? "player" : "enemy"} with damage ${damage}`);
        
        // Create force wave in the system
        system.forceWaves.push({
            pos: forceWavePos,
            owner: owner,
            startTime: millis(),
            radius: 50, // Starting radius
            maxRadius: 750, // Maximum radius
            growRate: 15, // How fast it grows per frame
            damage: damage,
            color: color,
            processed: {}, // Track which entities have been affected already
        });
        
        // Store reference for drawing effects
        owner.lastForceWave = {
            pos: forceWavePos.copy(),
            time: millis(),
            color: color
        };
    }

    /** Generic fire method that dispatches to specific weapon handlers */
    static fire(owner, system, angle, type = "projectile", target = null) {
        if (!owner || !system) return;
        
        // Handle different weapon types
        switch(type) {
            case "force":
                this.fireForce(owner, system, angle);
                break;
            case "beam":
                this.fireBeam(owner, system, angle);
                break;
            case "turret":
                this.fireTurret(owner, system, target || angle);
                break;
            // Other weapon types...
            default:
                // Default to various projectile types
                this.fireProjectile(owner, system, angle, type);
        }
    }

    // --- Single projectile ---
    static fireProjectile(owner, system, angle) {
        const weapon = owner.currentWeapon;
        const proj = new Projectile(
            owner.pos.x, owner.pos.y, angle, owner,
            8, weapon.damage, weapon.color
        );
        system.addProjectile(proj);
        //console.log("Projectile fired at angle", angle);
    }

    // --- N-way spread (angled) ---
    static fireSpread(owner, system, angle, count = 3) {
        // Centered spread, e.g. for 3: [-0.15, 0, 0.15]
        let spread = 0.3; // total spread in radians
        if (count === 2) spread = 0.18;
        if (count === 4) spread = 0.4;
        const start = -spread / 2;
        const step = count > 1 ? spread / (count - 1) : 0;
        for (let i = 0; i < count; i++) {
            WeaponSystem.fireProjectile(owner, system, angle + start + i * step);
        }
    }

    // --- N-way straight (parallel) ---
    static fireStraight(owner, system, angle, count = 3) {
        // Offset projectiles perpendicular to angle
        const spacing = 12; // pixels between projectiles
        const mid = (count - 1) / 2;
        for (let i = 0; i < count; i++) {
            let offset = (i - mid) * spacing;
            let perp = p5.Vector.fromAngle(angle + HALF_PI).mult(offset);
            let pos = p5.Vector.add(owner.pos, perp);
            const weapon = owner.currentWeapon;
            const proj = new Projectile(
                pos.x, pos.y, angle, owner,
                8, weapon.damage, weapon.color
            );
            system.addProjectile(proj);
        }
    }

    // --- Beam weapon ---
    static fireBeam(owner, system, angle) {
        const beamLength = 1200;
        const beamStart = owner.pos.copy();
        const beamEnd = p5.Vector.fromAngle(angle).mult(beamLength).add(owner.pos);

        let hitTarget = null;
        let minDist = Infinity;

        // If owner is Player, check enemies
        if (owner instanceof Player && system && system.enemies) {
            for (let enemy of system.enemies) {
                if (enemy === owner) continue;
                let toEnemy = p5.Vector.sub(enemy.pos, beamStart);
                let beamDir = p5.Vector.fromAngle(angle).normalize();
                let projLength = toEnemy.dot(beamDir);
                if (projLength > 0 && projLength < beamLength) {
                    let closestPoint = p5.Vector.add(beamStart, beamDir.copy().mult(projLength));
                    let distToBeam = p5.Vector.dist(enemy.pos, closestPoint);
                    if (distToBeam < enemy.size / 2 && projLength < minDist) {
                        minDist = projLength;
                        hitTarget = enemy;
                    }
                }
            }
        }

        // If owner is Enemy, check player
        if (owner instanceof Enemy && system && system.player) {
            let player = system.player;
            let toPlayer = p5.Vector.sub(player.pos, beamStart);
            let beamDir = p5.Vector.fromAngle(angle).normalize();
            let projLength = toPlayer.dot(beamDir);
            if (projLength > 0 && projLength < beamLength) {
                let closestPoint = p5.Vector.add(beamStart, beamDir.copy().mult(projLength));
                let distToBeam = p5.Vector.dist(player.pos, closestPoint);
                if (distToBeam < player.size / 2) {
                    hitTarget = player;
                }
            }
            if (hitTarget === player) {
                player.takeDamage(owner.currentWeapon.damage);
            }
        }

        if (hitTarget) {
            hitTarget.takeDamage(owner.currentWeapon.damage);
        }
        // Store beam info for drawing (works for both player and enemy)
        owner.lastBeam = {
            start: beamStart,
            end: beamEnd,
            color: owner.currentWeapon.color,
            time: millis()
        };
    }

    // --- Turret weapon (auto-aims at nearest target) ---
    static fireTurret(owner, system, target) {
        if (!target && system && system.enemies && system.enemies.length > 0) {
            // Find nearest enemy (or player if owner is enemy)
            let minDist = Infinity;
            for (let enemy of system.enemies) {
                if (enemy === owner) continue;
                let d = p5.Vector.dist(owner.pos, enemy.pos);
                if (d < minDist) {
                    minDist = d;
                    target = enemy;
                }
            }
        }
        if (!target) return;
        const angle = atan2(target.pos.y - owner.pos.y, target.pos.x - owner.pos.x);
        WeaponSystem.fireProjectile(owner, system, angle);
    }
}

console.log("WeaponSystem loaded", typeof WeaponSystem);