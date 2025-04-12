// ****** StarSystem.js ******

class StarSystem {
    /**
     * Creates a Star System instance. Sets up basic properties.
     * Seeded elements are generated later via initStaticElements().
     */
    constructor(name, economyType, galaxyX, galaxyY, systemIndex) {
        // console.log(`   >>> StarSystem Constructor Start: ${name} (Index ${systemIndex})`); // Verbose
        this.name = name; this.economyType = economyType;
        try { this.galaxyPos = createVector(galaxyX, galaxyY); } catch(e) { this.galaxyPos = {x: galaxyX, y: galaxyY}; }
        this.visited = false; this.systemIndex = systemIndex;
        this.station = null; this.planets = []; this.asteroids = []; this.enemies = []; this.projectiles = [];
        this.starColor = null; this.starSize = 100; this.bgStars = [];
        this.enemySpawnTimer = 0; this.enemySpawnInterval = 5000; this.maxEnemies = 8;
        this.asteroidSpawnTimer = 0; this.asteroidSpawnInterval = 3000; this.maxAsteroids = 25;
        this.despawnRadius = 2000;
        // console.log(`   <<< StarSystem ${name} CONSTRUCTOR FINISHED (Minimal Init) <<<`); // Verbose
    }

    /** Initializes static, seeded elements using p5 functions. */
    initStaticElements() {
        // console.log(`      >>> ${this.name}: initStaticElements() Start (Seed: ${this.systemIndex})`); // Verbose
        if (typeof randomSeed !== 'function' /*... other checks ...*/) { return; } // Basic check
        randomSeed(this.systemIndex); // Apply Seed
        try { this.station = new Station(0, 0, this.economyType); } catch(e) { console.error("Error creating Station:", e); }
        try { this.despawnRadius = max(width, height) * 2.0; } catch(e) { this.despawnRadius = 2000; }
        try { this.starColor = color(random(200, 255), random(150, 255), random(50, 150)); } catch(e) { this.starColor = color(255, 255, 0);}
        try { this.starSize = random(50, 150); } catch(e) { this.starSize = 100; }
        this.bgStars = []; let worldBounds = this.despawnRadius * 1.5; let numBgStars = 100;
        try { numBgStars = floor(random(250, 400)); } catch(e) {}
        try { for (let i = 0; i < numBgStars; i++) { this.bgStars.push({ x: random(-worldBounds, worldBounds), y: random(-worldBounds, worldBounds), size: random(1, 3) }); } } catch(e) {}
        try { this.createRandomPlanets(); } catch(e) { console.error("Error during createRandomPlanets call:", e); }
        randomSeed(); // Reset Seed
        // console.log(`      <<< ${this.name}: initStaticElements() Finished`); // Verbose
    }


    /** Creates random planets using seeded random. Called by initStaticElements. */
    createRandomPlanets() {
         // console.log("            >>> Entering createRandomPlanets..."); // Verbose
         let numPlanets = 1; try { numPlanets = floor(random(2, 7)); } catch(e) {}
         let minD = 600; let maxD = this.despawnRadius * 0.9; let minSep = 300;
         // console.log(`            Creating ${numPlanets} planets (minD:${minD}, maxD:${maxD.toFixed(0)}, minSep:${minSep})...`); // Verbose
         this.planets = [];
         for (let i = 0; i < numPlanets; i++) {
             let validPos = false; let attemptPos; let attempts = 0; const maxAttempts = 100;
             while (!validPos && attempts < maxAttempts) {
                 attempts++;
                 try {
                     let angle = random(TWO_PI); let distVal = random(minD, maxD);
                     attemptPos = createVector(cos(angle) * distVal, sin(angle) * distVal);
                     validPos = true;
                     for (let p of this.planets) { if (p5.Vector.dist(attemptPos, p.pos) < minSep) { validPos = false; break; } }
                 } catch(e) { console.error("Error during planet placement calc:", e); validPos = false; break; }
             }
             if (validPos && attemptPos) {
                 // console.log(`            -> Placing planet ${i + 1} at (${attemptPos.x.toFixed(0)}, ${attemptPos.y.toFixed(0)})`); // Verbose
                 try { let sz = random(60, 150); let c1 = color(random(50, 200), random(50, 200), random(50, 200)); let c2 = color(random(50, 200), random(50, 200), random(50, 200)); this.planets.push(new Planet(attemptPos.x, attemptPos.y, sz, c1, c2)); }
                 catch(e) { console.error("Error creating/pushing planet object:", e); }
             } else { /* Log failure if verbose needed */ }
         }
         // console.log(`            <<< Exiting createRandomPlanets... Placed: ${this.planets.length}/${numPlanets}`); // Verbose
    } // End createRandomPlanets


    /** Called when player enters system. Resets dynamic objects. */
    enterSystem(player) {
        // console.log(">>> Entering enterSystem..."); // Verbose
        this.visited = true; this.enemies = []; this.projectiles = []; this.asteroids = [];
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;
        if (player && player.pos) {
            // console.log("   enterSystem: Spawning initial NPCs..."); // Verbose
            for (let i = 0; i < 3; i++) { try { this.trySpawnNPC(player); } catch(e) { /* Handle/log error */ } }
            // console.log("   enterSystem: Spawning initial Asteroids..."); // Verbose
            for (let i = 0; i < 8; i++) { try { this.trySpawnAsteroid(player); } catch(e) { /* Handle/log error */ } }
        } else { console.warn("enterSystem: Player/pos missing for initial spawn."); }
        // console.log(`<<< Exiting enterSystem... System: ${this.name}`); // Verbose
    }

    /** Attempts to spawn an NPC ship. Calls init methods after creation. */
    trySpawnNPC(player) {
        if (!player?.pos || this.enemies.length >= this.maxEnemies) return;
        let chosenRole; let chosenShipTypeName;
        try { // Wrap random selection
            let roleRoll = random(); const pirateChance = 0.45; const policeChance = 0.25;
            if (roleRoll < pirateChance) chosenRole = AI_ROLE.PIRATE; else if (roleRoll < pirateChance + policeChance) chosenRole = AI_ROLE.POLICE; else chosenRole = AI_ROLE.HAULER;
            switch(chosenRole) { case AI_ROLE.PIRATE: chosenShipTypeName = random(["Krait", "Adder", "Viper", "CobraMkIII"]); break; case AI_ROLE.POLICE: chosenShipTypeName = random(["Viper", "Viper", "CobraMkIII"]); break; case AI_ROLE.HAULER: chosenShipTypeName = random(["Adder", "Adder", "Adder", "Python"]); break; default: chosenShipTypeName = "Krait"; }
            const thargoidChance = 0.03; if (random() < thargoidChance && chosenRole !== AI_ROLE.HAULER) { chosenShipTypeName = "Thargoid"; chosenRole = AI_ROLE.PIRATE; console.warn("!!! Thargoid Spawn Triggered !!!"); }
        } catch (e) { console.error("Error during NPC role/type selection:", e); chosenShipTypeName = "Krait"; chosenRole = AI_ROLE.PIRATE; } // Fallback on error

        let angle = random(TWO_PI); let spawnDist = sqrt(sq(width / 2) + sq(height / 2)) + random(150, 400);
        let spawnX = player.pos.x + cos(angle) * spawnDist; let spawnY = player.pos.y + sin(angle) * spawnDist;
        try {
            let newEnemy = new Enemy(spawnX, spawnY, player, chosenShipTypeName, chosenRole);
            newEnemy.calculateRadianProperties(); // Calculate radians speed/tolerance
            newEnemy.initializeColors(); // Create p5.Color objects
            this.enemies.push(newEnemy);
        } catch(e) { console.error("!!! ERROR during trySpawnNPC (Enemy creation/init):", e); }
    }

    /** Attempts to spawn an asteroid. */
    trySpawnAsteroid(player) {
        if (!player?.pos || this.asteroids.length >= this.maxAsteroids) return;
        try {
            let angle = random(TWO_PI); let spawnDist = sqrt(sq(width / 2) + sq(height / 2)) + random(200, 500);
            let spawnX = player.pos.x + cos(angle) * spawnDist; let spawnY = player.pos.y + sin(angle) * spawnDist;
            let size = random(40, 90);
            this.asteroids.push(new Asteroid(spawnX, spawnY, size));
        } catch(e) { console.error("!!! ERROR during trySpawnAsteroid:", e); }
    }

    /** Updates dynamic objects, handles spawning/despawning, checks collisions. */
    update(player) {
        if (!player) return;
        try { // Wrap update logic
            // Update Enemies & Despawn
            for (let i = this.enemies.length - 1; i >= 0; i--) { const enemy = this.enemies[i]; if (!enemy) { this.enemies.splice(i, 1); continue; } try{enemy.update(this);}catch(e){console.error("Err updating Enemy:",e,enemy);} if (enemy.isDestroyed()) { if (enemy.role !== AI_ROLE.HAULER) player.addCredits(25); this.enemies.splice(i, 1); continue; } let dE = dist(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y); if (dE > this.despawnRadius * 1.1) this.enemies.splice(i, 1); }
            // Update Asteroids & Despawn
            for (let i = this.asteroids.length - 1; i >= 0; i--) { const asteroid = this.asteroids[i]; if (!asteroid) { this.asteroids.splice(i, 1); continue; } try{asteroid.update();}catch(e){console.error("Err updating Asteroid:",e,asteroid);} if (asteroid.isDestroyed()) { player.addCredits(floor(asteroid.size / 4)); this.asteroids.splice(i, 1); continue; } let dA = dist(asteroid.pos.x, asteroid.pos.y, player.pos.x, player.pos.y); if (dA > this.despawnRadius * 1.2) this.asteroids.splice(i, 1); }
            // Update Projectiles & Despawn
            for (let i = this.projectiles.length - 1; i >= 0; i--) { const proj = this.projectiles[i]; if (!proj) { this.projectiles.splice(i, 1); continue; } try{proj.update();}catch(e){console.error("Err updating Projectile:",e,proj);} let dP = dist(proj.pos.x, proj.pos.y, player.pos.x, player.pos.y); if (proj.lifespan <= 0 || dP > this.despawnRadius) this.projectiles.splice(i, 1); }
            // Collision Checks
            this.checkCollisions(player);
            // Spawning Timers
            this.enemySpawnTimer += deltaTime; if (this.enemySpawnTimer >= this.enemySpawnInterval) { this.trySpawnNPC(player); this.enemySpawnTimer = 0; }
            this.asteroidSpawnTimer += deltaTime; if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval) { this.trySpawnAsteroid(player); this.asteroidSpawnTimer = 0; }
        } catch (e) { console.error("Major ERROR in StarSystem.update:", e); }
    }

    /** Checks collisions between all relevant dynamic objects. */
    checkCollisions(player) {
        if (!player) return;
        try { // Wrap collision logic
            // Projectiles vs Ships & Asteroids
            for (let i = this.projectiles.length - 1; i >= 0; i--) { const p = this.projectiles[i]; if (!p) continue; let projectileRemoved = false; if (p.owner === 'ENEMY' && p.checkCollision(player)) { player.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; } if (projectileRemoved) continue; if (p.owner === 'PLAYER') { for (let j = this.enemies.length - 1; j >= 0; j--) { const e = this.enemies[j]; if (!e) continue; if (p.checkCollision(e)) { e.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; break; } } } if (projectileRemoved) continue; for (let j = this.asteroids.length - 1; j >= 0; j--) { const a = this.asteroids[j]; if (!a) continue; if (p.checkCollision(a)) { a.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; break; } } }
            // Player vs Asteroids (Ramming)
            for (let i = this.asteroids.length - 1; i >= 0; i--) { const a = this.asteroids[i]; if (!a || a.isDestroyed()) continue; if (player.checkCollision(a)) { let ramDmg = 10 + floor(a.size / 4); player.takeDamage(ramDmg); a.takeDamage(ramDmg * 2); } }
        } catch(e) { console.error("Error during checkCollisions:", e); }
    }

    /** Adds a projectile to the system. */
    addProjectile(proj) { if (proj) this.projectiles.push(proj); }

    /** Draws background stars. */
    drawBackground() { fill(255); noStroke(); this.bgStars.forEach(s => ellipse(s.x, s.y, s.size, s.size)); }

    /** Draws the entire system centered on the player. */
    draw(player) {
        if (!player || !player.pos || isNaN(player.pos.x) || isNaN(player.pos.y)) { return; } // More robust check
        push(); let tx = width / 2 - player.pos.x; let ty = height / 2 - player.pos.y;
        if(isNaN(tx) || isNaN(ty)) { tx = 0; ty = 0;} // Safety check
        translate(tx, ty);
        try { // Wrap drawing calls
            this.drawBackground();
            if (this.station) this.station.draw();
            this.planets.forEach(p => p?.draw()); // Safe access drawing
            this.asteroids.forEach(a => a?.draw());
            this.enemies.forEach(e => e?.draw());
            this.projectiles.forEach(p => p?.draw());
            player.draw();
        } catch (e) { console.error("Error during StarSystem world element drawing:", e); }
        finally { pop(); } // Ensure pop() runs
    }

    // --- Save/Load System State ---
    getSaveData() { return { visited: this.visited }; }
    loadSaveData(data) { if (data?.visited !== undefined) this.visited = data.visited; }

} // End of StarSystem Class