// ****** weaponSystem.js ******

class WeaponSystem {
    static fireProjectile(owner, system, angle) {
        const weapon = owner.currentWeapon;
        // Use a larger offset to avoid spawning inside the ship
        const spawnOffset = p5.Vector.fromAngle(angle).mult(owner.size * 1.2);
        const spawnPos = p5.Vector.add(owner.pos, spawnOffset);
        const proj = new Projectile(
            spawnPos.x, spawnPos.y, angle, owner,
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
        // Beam: damage first enemy in line, store beam info for drawing
        const beamLength = 1200;
        const beamStart = owner.pos.copy();
        const beamEnd = p5.Vector.fromAngle(angle).mult(beamLength).add(owner.pos);

        // Find first enemy hit by the beam
        let hitEnemy = null;
        let minDist = Infinity;
        if (system && system.enemies) {
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
                            hitEnemy = enemy;
                        }
                    }
                }
            }
        }
        if (hitEnemy) {
            hitEnemy.takeDamage(owner.currentWeapon.damage);
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
        if (!system || !system.enemies) return;
        const radius = 200;
        for (let enemy of system.enemies) {
            if (enemy === owner) continue;
            let d = p5.Vector.dist(owner.pos, enemy.pos);
            if (d < radius) {
                let forceDir = p5.Vector.sub(enemy.pos, owner.pos).normalize();
                enemy.vel.add(forceDir.mult(8));
                enemy.takeDamage(owner.currentWeapon.damage);
            }
        }
        // Add a visual effect
        owner.lastForceWave = { pos: owner.pos.copy(), radius: 0, maxRadius: radius, time: millis() };
    }
}

console.log("WeaponSystem loaded", typeof WeaponSystem);