// ****** StarSystem.js ******

class StarSystem {
    /**
     * Creates a Star System instance. Planets/BG Stars generated using seed.
     * @param {string} name - The name of the system.
     * @param {string} economyType - The type of economy (e.g., "Industrial").
     * @param {number} galaxyX - The X coordinate on the main galaxy map.
     * @param {number} galaxyY - The Y coordinate on the main galaxy map.
     * @param {number} systemIndex - The unique index of this system, used for seeding.
     */
    constructor(name, economyType, galaxyX, galaxyY, systemIndex) {
        console.log(`   >>> StarSystem Constructor Start: ${name} (Index ${systemIndex})`); // LOG START
        this.name = name;
        this.economyType = economyType;
        this.galaxyPos = createVector(galaxyX, galaxyY);
        this.visited = false;
        this.systemIndex = systemIndex;

        console.log(`      Setting randomSeed(${this.systemIndex})`);
        randomSeed(this.systemIndex); // Use the system's unique index as the seed

        // --- World Elements ---
        console.log("      Creating Station...");
        try { this.station = new Station(0, 0, economyType); } catch(e) { console.error("Error creating Station:", e); throw e; } // Catch errors here
        console.log("      Station created.");
        this.planets = []; this.asteroids = []; this.enemies = []; this.projectiles = [];

        // --- Config ---
        console.log("      Setting up config...");
        this.enemySpawnTimer = 0; this.enemySpawnInterval = 5000; this.maxEnemies = 8;
        this.asteroidSpawnTimer = 0; this.asteroidSpawnInterval = 3000; this.maxAsteroids = 25;
        // Use try-catch for functions that might not be ready
        try { this.despawnRadius = max(width, height) * 2.0; } catch(e) { console.error("Error getting width/height/max:", e); this.despawnRadius = 2000; } // Fallback value
        console.log(`      Despawn Radius: ${this.despawnRadius}`);

        // --- Background ---
        console.log("      Creating star color/size...");
        try { this.starColor = color(random(200, 255), random(150, 255), random(50, 150)); } catch(e) { console.error("Error creating starColor:", e); this.starColor = color(255, 255, 0); } // Fallback
        try { this.starSize = random(50, 150); } catch(e) { console.error("Error getting random starSize:", e); this.starSize = 100; } // Fallback
        console.log("      Star color/size created.");
        this.bgStars = []; let worldBounds = this.despawnRadius * 1.5; let numBgStars = 100; // Default count
        try { numBgStars = floor(random(250, 400)); } catch(e) { console.error("Error getting random numBgStars:", e); } // Use default if random fails
        console.log(`      Generating ${numBgStars} background stars...`);
        try {
            for (let i = 0; i < numBgStars; i++) { this.bgStars.push({ x: random(-worldBounds, worldBounds), y: random(-worldBounds, worldBounds), size: random(1, 3) }); }
        } catch(e) { console.error("Error generating background stars:", e); }
        console.log("      Background stars generated (count: " + this.bgStars.length + ").");

        // --- Planets ---
        console.log("      Calling createRandomPlanets...");
        try { this.createRandomPlanets(); } catch(e) { console.error("Error during createRandomPlanets:", e); }
        console.log("      Finished createRandomPlanets.");

        // --- Reset Seed ---
        console.log(`      Resetting random seed for ${this.name}...`);
        try { randomSeed(); } catch(e) { console.error("Error resetting random seed:", e); }
        console.log("      Seed reset.");

        // --- ADD FINAL LOG ---
        console.log(`   <<< StarSystem ${name} CONSTRUCTOR REALLY FINISHED <<<`);
        // --- END FINAL LOG ---
    } // End constructor

    /** Creates random planets using seeded random. Called only by constructor. */
    createRandomPlanets() {
         console.log("         >>> Entering createRandomPlanets..."); // LOG ENTRY
         let numPlanets = 0; // Default
         try { numPlanets = floor(random(1, 6)); } catch(e) { console.error("Error getting random numPlanets:", e); numPlanets = 1; } // Fallback count
         let minD = 800; let maxD = this.despawnRadius * 0.8; let minSep = 400;
         console.log(`         Creating ${numPlanets} planets using seeded random...`);
         this.planets = []; // Ensure planet array is empty before creating

         for (let i = 0; i < numPlanets; i++) {
             let validPos = false; let attemptPos; let attempts = 0; const maxAttempts = 50;
             while (!validPos && attempts < maxAttempts) {
                 attempts++;
                 try {
                     let angle = random(TWO_PI); let dist = random(minD, maxD);
                     attemptPos = createVector(cos(angle) * dist, sin(angle) * dist);
                     validPos = true;
                     for (let p of this.planets) { if (dist(attemptPos.x, attemptPos.y, p.pos.x, p.pos.y) < minSep) { validPos = false; break; } }
                 } catch(e) {
                      console.error("Error during planet placement calculation:", e);
                      validPos = false; // Mark as invalid if calculation failed
                      break; // Exit inner loop on error
                 }
             }
             if (validPos && attemptPos) { // Ensure position is valid AND exists
                 try {
                     let sz = random(60, 150); let c1 = color(random(50, 200), random(50, 200), random(50, 200)); let c2 = color(random(50, 200), random(50, 200), random(50, 200));
                     this.planets.push(new Planet(attemptPos.x, attemptPos.y, sz, c1, c2));
                 } catch(e) {
                      console.error("Error creating/pushing planet object:", e);
                 }
             } else { console.log(`         -> Failed to place planet ${i + 1}.`); }
         }
         console.log("         <<< Exiting createRandomPlanets..."); // LOG EXIT
    } // End createRandomPlanets

    /** Called when player enters system. Resets dynamic objects. */
    enterSystem(player) {
        console.log(">>> Entering enterSystem..."); // Log Entry Point
        this.visited = true; this.enemies = []; this.projectiles = []; this.asteroids = [];
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;

        if (player && player.pos) {
            console.log("   enterSystem: Spawning initial NPCs...");
            for (let i = 0; i < 3; i++) {
                console.log(`   enterSystem: Calling trySpawnNPC ${i + 1}/3...`);
                try { this.trySpawnNPC(player); } catch(e) { console.error(`Error in trySpawnNPC loop ${i}:`, e); } // Catch errors in loop
            }
            console.log("   enterSystem: Spawning initial Asteroids...");
            for (let i = 0; i < 8; i++) {
                 console.log(`   enterSystem: Calling trySpawnAsteroid ${i + 1}/8...`);
                 try { this.trySpawnAsteroid(player); } catch(e) { console.error(`Error in trySpawnAsteroid loop ${i}:`, e); } // Catch errors in loop
            }
        } else { console.warn("enterSystem: Player object or player.pos missing for initial spawn."); }
        console.log(`<<< Exiting enterSystem... System: ${this.name}`); // Log Exit Point
    }

    /** Attempts to spawn an NPC ship with a role and appropriate type off-screen. */
    trySpawnNPC(player) {
        console.log("    >>> Entering trySpawnNPC...");
        if (!player?.pos || this.enemies.length >= this.maxEnemies) { console.log(`    trySpawnNPC: Condition not met. Exiting.`); return; }

        let chosenRole; let chosenShipTypeName;
        try {
            // --- Determine Role and Ship Type ---
            let roleRoll = random(); const pirateChance = 0.45; const policeChance = 0.25;
            if (roleRoll < pirateChance) chosenRole = AI_ROLE.PIRATE;
            else if (roleRoll < pirateChance + policeChance) chosenRole = AI_ROLE.POLICE;
            else chosenRole = AI_ROLE.HAULER;
            switch(chosenRole) {
                case AI_ROLE.PIRATE: chosenShipTypeName = random(["Krait", "Adder", "Viper", "CobraMkIII"]); break;
                case AI_ROLE.POLICE: chosenShipTypeName = random(["Viper", "Viper", "CobraMkIII"]); break;
                case AI_ROLE.HAULER: chosenShipTypeName = random(["Adder", "Adder", "Adder", "Python"]); break; // Added Python possibility
                 default: chosenShipTypeName = "Krait"; break;
            }
            const thargoidChance = 0.03; if (random() < thargoidChance && chosenRole !== AI_ROLE.HAULER) { chosenShipTypeName = "Thargoid"; chosenRole = AI_ROLE.PIRATE; console.warn("!!! Thargoid Spawn Triggered !!!"); }
            console.log(`    trySpawnNPC: Spawning a ${chosenRole} (${chosenShipTypeName})...`);

            // --- Calculate Spawn Position ---
            let angle = random(TWO_PI); let spawnDist = sqrt(sq(width / 2) + sq(height / 2)) + random(150, 400);
            let spawnX = player.pos.x + cos(angle) * spawnDist; let spawnY = player.pos.y + sin(angle) * spawnDist;
            console.log(`      Spawn Coords: (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);

            // --- Create Enemy and Calculate Radians ---
            console.log("      Creating Enemy object...");
            let newEnemy = new Enemy(spawnX, spawnY, player, chosenShipTypeName, chosenRole);
            console.log("      Enemy object created. Calculating radians...");
            newEnemy.calculateRadianProperties(); // !!! Crucial call !!!
            console.log("      Radians calculated. Pushing enemy.");
            this.enemies.push(newEnemy);

        } catch(e) {
             console.error("    !!! ERROR during trySpawnNPC:", e); // Catch any error during the process
        } finally {
             console.log("    <<< Exiting trySpawnNPC..."); // Ensure exit log always runs
        }
    }

    /** Attempts to spawn an asteroid off-screen relative to the player. */
    trySpawnAsteroid(player) {
         console.log("    >>> Entering trySpawnAsteroid...");
        if (!player?.pos || this.asteroids.length >= this.maxAsteroids) { console.log(`    trySpawnAsteroid: Condition not met. Exiting.`); return; }
        try {
            let angle = random(TWO_PI); let spawnDist = sqrt(sq(width / 2) + sq(height / 2)) + random(200, 500);
            let spawnX = player.pos.x + cos(angle) * spawnDist; let spawnY = player.pos.y + sin(angle) * spawnDist;
            let size = random(40, 90);
            console.log(`    trySpawnAsteroid: Spawning size ${size.toFixed(0)} at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
            console.log("      Creating Asteroid object...");
            this.asteroids.push(new Asteroid(spawnX, spawnY, size));
        } catch(e) {
             console.error("    !!! ERROR during trySpawnAsteroid:", e);
        } finally {
            console.log("    <<< Exiting trySpawnAsteroid...");
        }
    }

    /**
     * Updates dynamic objects, handles spawning/despawning, checks collisions.
     * @param {Player} player - Reference to the player object.
     */
    update(player) {
        if (!player) { return; }
        // Update Enemies & Despawn
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i]; if (!enemy) { this.enemies.splice(i, 1); continue; }
            enemy.update(this);
            if (enemy.isDestroyed()) { if (enemy.role !== AI_ROLE.HAULER) player.addCredits(25); this.enemies.splice(i, 1); continue; }
            let d = dist(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y);
            if (d > this.despawnRadius * 1.1) this.enemies.splice(i, 1);
        }
        // Update Asteroids & Despawn
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
             const asteroid = this.asteroids[i]; if (!asteroid) { this.asteroids.splice(i, 1); continue; }
             asteroid.update();
             if (asteroid.isDestroyed()) { player.addCredits(floor(asteroid.size / 4)); this.asteroids.splice(i, 1); continue; }
             let d = dist(asteroid.pos.x, asteroid.pos.y, player.pos.x, player.pos.y);
             if (d > this.despawnRadius * 1.2) this.asteroids.splice(i, 1);
        }
        // Update Projectiles & Despawn
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
             const proj = this.projectiles[i]; if (!proj) { this.projectiles.splice(i, 1); continue; }
             proj.update();
             let d = dist(proj.pos.x, proj.pos.y, player.pos.x, player.pos.y);
             if (proj.lifespan <= 0 || d > this.despawnRadius) this.projectiles.splice(i, 1);
        }
        // Collision Checks
        this.checkCollisions(player);
        // Spawning Timers (using non-seeded random)
        this.enemySpawnTimer += deltaTime; if (this.enemySpawnTimer >= this.enemySpawnInterval) { this.trySpawnNPC(player); this.enemySpawnTimer = 0; }
        this.asteroidSpawnTimer += deltaTime; if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval) { this.trySpawnAsteroid(player); this.asteroidSpawnTimer = 0; }
    }

    /**
     * Checks for collisions between all relevant dynamic objects.
     * NOW USES player.checkCollision().
     * @param {Player} player - Reference to the player object.
     */
    checkCollisions(player) {
        if (!player) return; // Safety check

        // --- Projectiles vs Ships & Asteroids ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i]; if (!p) continue;
            let projectileRemoved = false;
            // Vs Player
            if (p.owner === 'ENEMY' && p.checkCollision(player)) { // Projectile checks player
                player.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true;
            }
            if (projectileRemoved) continue;
            // Vs Enemies (Player shots)
            if (p.owner === 'PLAYER') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                    const e = this.enemies[j]; if (!e) continue;
                    if (p.checkCollision(e)) { // Projectile checks enemy
                        e.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; break;
                    }
                }
            }
            if (projectileRemoved) continue;
            // Vs Asteroids (All shots)
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                const a = this.asteroids[j]; if (!a) continue;
                if (p.checkCollision(a)) { // Projectile checks asteroid
                    a.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; break;
                }
            }
        } // End projectile loop

        // --- Player vs Asteroids (Ramming) ---
         for (let i = this.asteroids.length - 1; i >= 0; i--) {
              const a = this.asteroids[i]; if (!a || a.isDestroyed()) continue;
              // --- Use the NEW player.checkCollision method ---
              if (player.checkCollision(a)) { // Player checks asteroid
              // --- ----------------------------------------- ---
                  console.log("Player collided with asteroid!");
                  let ramDamage = 10 + floor(a.size / 4);
                  player.takeDamage(ramDamage);
                  a.takeDamage(ramDamage * 2); // Asteroid takes more damage
              }
         }
         // Player vs Enemy Ramming could be added here using player.checkCollision(enemy)
    } // End checkCollisions

    /** Adds a projectile to the system. */
    addProjectile(proj) { if (proj) this.projectiles.push(proj); }

    /** Draws background stars. */
    drawBackground() { fill(255); noStroke(); this.bgStars.forEach(s => ellipse(s.x, s.y, s.size, s.size)); }

    /** Draws the entire system centered on the player. */
    draw(player) {
        console.log(`      StarSystem.draw(${this.name}) starting...`); // Log entry
        if (!player || !player.pos) { console.warn("      StarSystem.draw: Invalid player object/pos."); return; } // Added pos check

        push();
        let tx = width / 2 - player.pos.x; let ty = height / 2 - player.pos.y;
        // Check for NaN translation values
        if(isNaN(tx) || isNaN(ty)) {
             console.error(`      !!! Invalid translation: tx=${tx}, ty=${ty}. PlayerPos=(${player.pos.x}, ${player.pos.y})`);
             tx = 0; ty = 0; // Fallback translation
        }
        // console.log(`         Applying translation: (${tx.toFixed(1)}, ${ty.toFixed(1)})`); // Noisy log
        translate(tx, ty);

        // --- Draw World Elements ---
        try { /* Add try/catch around drawing blocks */
            // console.log("         Drawing background..."); // Noisy
            this.drawBackground();
            // console.log("         Drawing station..."); // Noisy
            if (this.station) this.station.draw();
            // console.log("         Drawing planets..."); // Noisy
            this.planets.forEach(p => p.draw());
            // console.log("         Drawing asteroids..."); // Noisy
            this.asteroids.forEach(a => a.draw());
            // console.log("         Drawing enemies..."); // Noisy
            this.enemies.forEach(e => e.draw()); // Enemy draw now includes debug line
            // console.log("         Drawing projectiles..."); // Noisy
            this.projectiles.forEach(p => p.draw());
            // console.log("         Drawing player..."); // Noisy
            player.draw(); // Player drawn last in world space
        } catch (e) {
             console.error("      !!! ERROR during StarSystem world element drawing:", e);
        } finally {
             pop(); // Ensure pop() ALWAYS runs, even if error occurred
        }
        console.log(`      StarSystem.draw(${this.name}) finished.`); // Log exit
    }

    // --- Save/Load System State (Minimal: visited status) ---
    getSaveData() { return { visited: this.visited }; }
    loadSaveData(data) { if (data?.visited !== undefined) this.visited = data.visited; }

} // End of StarSystem Class