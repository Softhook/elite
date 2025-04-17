// ****** weaponSystem.js ******

class WeaponSystem {
    static fireProjectile(owner, system, angle) {
        const weapon = owner.currentWeapon;
        // No offset here!
        const proj = new Projectile(
            owner.pos.x, owner.pos.y, angle, owner,
            8, weapon.damage, weapon.color
        );
        system.addProjectile(proj);
    }

    static fireSpread(owner, system, angle) {
        const spreadAngles = [-0.15, 0, 0.15];
        for (let offset of spreadAngles) {
            WeaponSystem.fireProjectile(owner, system, angle + offset);
        }
    }

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
                    if (distToBeam < enemy.size / 2) {
                        if (projLength < minDist) {
                            minDist = projLength;
                            hitTarget = enemy;
                        }
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
                console.log("system.player === player?", system.player === player); // should be true
                console.log("About to damage player:", system.player);
                player.takeDamage(owner.currentWeapon.damage);
                console.log("Player hit by beam! Damage:", owner.currentWeapon.damage);
            }
        }

        if (hitTarget) {
            hitTarget.takeDamage(owner.currentWeapon.damage);
            if (hitTarget instanceof Player) {
                console.log("Player hit by beam! Damage:", owner.currentWeapon.damage);
            }
        }
        // Store beam info for drawing (works for both player and enemy)
        owner.lastBeam = {
            start: beamStart,
            end: beamEnd,
            color: owner.currentWeapon.color,
            time: millis()
        };
    }

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

    static fireForce(owner, system) {
        if (!system) return;
        const radius = 200;

        // If owner is Enemy, affect the player
        if (owner instanceof Enemy && system.player) {
            let d = p5.Vector.dist(owner.pos, system.player.pos);
            if (d < radius) {
                let forceDir = p5.Vector.sub(system.player.pos, owner.pos).normalize();
                system.player.vel.add(forceDir.mult(8));
                system.player.takeDamage(owner.currentWeapon.damage);
                console.log("Player hit by force weapon! Damage:", owner.currentWeapon.damage);
            }
        }

        // If owner is Player, affect all enemies
        if (owner instanceof Player && system.enemies) {
            for (let enemy of system.enemies) {
                if (enemy === owner) continue;
                let d = p5.Vector.dist(owner.pos, enemy.pos);
                if (d < radius) {
                    let forceDir = p5.Vector.sub(enemy.pos, owner.pos).normalize();
                    enemy.vel.add(forceDir.mult(8));
                    enemy.takeDamage(owner.currentWeapon.damage);
                }
            }
        }

        // Visual effect
        owner.lastForceWave = { pos: owner.pos.copy(), radius: 0, maxRadius: radius, time: millis() };
    }
}

console.log("WeaponSystem loaded", typeof WeaponSystem);