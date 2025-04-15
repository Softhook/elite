// ****** StarSystem.js ******

class StarSystem {
    /**
     * Creates a Star System instance. Sets up basic properties.
     * Seeded elements (planets, bgStars) are generated later via initStaticElements().
     * @param {string} name - The name of the system.
     * @param {string} economyType - The type of economy (e.g., "Industrial").
     * @param {number} galaxyX - The X coordinate on the main galaxy map.
     * @param {number} galaxyY - The Y coordinate on the main galaxy map.
     * @param {number} systemIndex - The unique index of this system, used for seeding.
     * @param {number} [techLevel=5] - The technological level of the system (1-10).
     * @param {string} [securityLevel='Medium'] - The security level (e.g., 'High', 'Anarchy').
     */
    constructor(name, economyType, galaxyX, galaxyY, systemIndex, techLevel = 5, securityLevel = 'Medium') {
        // console.log(`   >>> StarSystem Constructor Start: ${name} (Index ${systemIndex})`); // Verbose
        this.name = name;
        this.economyType = economyType;
        try { this.galaxyPos = createVector(galaxyX, galaxyY); } catch(e) { this.galaxyPos = {x: galaxyX, y: galaxyY}; } // Map position
        this.visited = false;
        this.systemIndex = systemIndex; // Used for seeding static elements

        // Assign tech and security levels, using defaults if not provided
        this.techLevel = techLevel || floor(random(1, 11)); // Default random 1-10 if not provided
        this.securityLevel = securityLevel || random(['Anarchy', 'Low', 'Medium', 'Medium', 'High', 'High']); // Default weighted random

        // --- Initialize empty arrays and default null/values ---
        this.station = null; // Created in initStaticElements
        this.planets = [];
        this.asteroids = [];
        this.enemies = [];
        this.projectiles = [];
        this.starColor = null; // Set in initStaticElements
        this.starSize = 100;   // Default size, set in initStaticElements
        this.bgStars = [];     // Populated in initStaticElements

        // --- Config (can be set here, despawnRadius updated later) ---
        this.enemySpawnTimer = 0; this.enemySpawnInterval = 5000; this.maxEnemies = 8;
        this.asteroidSpawnTimer = 0; this.asteroidSpawnInterval = 3000; this.maxAsteroids = 25;
        this.despawnRadius = 2000; // Default, updated in initStaticElements based on screen size

        // console.log(`   <<< StarSystem ${name} CONSTRUCTOR FINISHED (Minimal Init) <<<`); // Verbose
        // IMPORTANT: initStaticElements() must be called after p5 setup is complete.
    }

    /**
     * Initializes static, seeded elements (station, planets, background) using p5 functions.
     * MUST be called AFTER p5 setup is complete (e.g., from Galaxy.initGalaxySystems).
     */
    initStaticElements() {
        console.log(`      >>> ${this.name}: initStaticElements() Start (Seed: ${this.systemIndex})`);

        // Check if p5 functions are available before using them
        if (typeof randomSeed !== 'function' || typeof random !== 'function' || typeof color !== 'function' || typeof max !== 'function' || typeof floor !== 'function' || typeof width === 'undefined' || typeof height === 'undefined') {
            console.error(`      !!! CRITICAL ERROR in ${this.name}.initStaticElements: p5 functions or globals not available! Aborting static init.`);
            if (typeof randomSeed === 'function') randomSeed(); // Attempt to reset seed anyway
            return; // Cannot proceed without p5 functions
        }

        // --- Apply Seed for deterministic generation ---
        // console.log(`         Setting randomSeed(${this.systemIndex})`); // Verbose
        randomSeed(this.systemIndex);

        // --- Create Station (Pass a generated name) ---
        console.log("         Creating Station...");
        let stationName = `${this.name} Hub`; // Example name generation: "Solara Hub"
        try {
             this.station = new Station(0, 0, this.economyType, stationName); // Pass name here
        } catch(e) {
             console.error("         Error creating Station:", e);
             // Attempt to create a station without a name as fallback? Or leave as null?
             // this.station = new Station(0, 0, this.economyType); // Fallback without name?
        }
        console.log(`         Station created (Name: ${this.station?.name || 'N/A'})`); // Log created station name

        // --- Calculate Despawn Radius based on screen size ---
        try {
            this.despawnRadius = max(width, height) * 2.0;
        } catch(e) {
            console.error("         Error getting width/height/max for despawnRadius:", e);
            this.despawnRadius = 2000; // Use default fallback
        }
        // console.log(`         Despawn Radius set to: ${this.despawnRadius}`); // Verbose

        // --- Seeded Visual Background Elements ---
        // console.log("         Creating star color/size..."); // Verbose
        try { this.starColor = color(random(200, 255), random(150, 255), random(50, 150)); } catch(e) { this.starColor = color(255, 255, 0);} // Fallback color yellow
        try { this.starSize = random(50, 150); } catch(e) { this.starSize = 100; } // Fallback size
        // console.log(`         Star Color/Size created.`); // Verbose

        this.bgStars = []; let worldBounds = this.despawnRadius * 1.5; let numBgStars = 100; // Default star count
        try { numBgStars = floor(random(250, 400)); } catch(e) {} // Use default on error
        // console.log(`         Generating ${numBgStars} background stars...`); // Verbose
        try { // Generate background stars using seeded random
            for (let i = 0; i < numBgStars; i++) {
                this.bgStars.push({
                    x: random(-worldBounds, worldBounds),
                    y: random(-worldBounds, worldBounds),
                    size: random(1, 3)
                });
            }
        } catch(e) { console.error("Error generating background stars:", e); }
        // console.log(`         Background stars generated (count: ${this.bgStars.length}).`); // Verbose

        // --- Initialize Planets (Seeded) ---
        // console.log("         Calling createRandomPlanets..."); // Verbose
        try { this.createRandomPlanets(); } // Call method that uses seeded random
        catch(e) { console.error("Error during createRandomPlanets call:", e); }
        // console.log("         Finished createRandomPlanets call."); // Verbose

        // --- CRITICAL: Reset Seed AFTER generating all static seeded elements ---
        // console.log(`      ${this.name}: Resetting random seed.`); // Verbose
        randomSeed(); // Reset to non-deterministic (time-based) random
        // console.log("      Seed reset."); // Verbose

        console.log(`      <<< ${this.name}: initStaticElements() Finished`); // Log completion
    }
// --- End initStaticElements method ---

    /** Creates random planets using seeded random. Called by initStaticElements. Includes position logging. */
    createRandomPlanets() {
         // Increase distances for planets
         let numPlanets = 1; try { numPlanets = floor(random(2, 7)); } catch(e) {}
         let minD = 1200; // Was 600, now doubled
         let maxD = this.despawnRadius * 1.8; // Was 0.9, now doubled
         let minSep = 600; // Was 300, now doubled
         this.planets = [];
         for (let i = 0; i < numPlanets; i++) {
             let validPos = false; let attemptPos; let attempts = 0; const maxAttempts = 100;
             let calculatedAngle = NaN, calculatedDist = NaN;
             while (!validPos && attempts < maxAttempts) {
                 attempts++;
                 try {
                     calculatedAngle = random(TWO_PI); calculatedDist = random(minD, maxD);
                     attemptPos = createVector(cos(calculatedAngle) * calculatedDist, sin(calculatedAngle) * calculatedDist);
                     validPos = true;
                     for (let p of this.planets) { if (p5.Vector.dist(attemptPos, p.pos) < minSep) { validPos = false; break; } }
                 } catch(e) { console.error("Error during planet placement calc:", e); validPos = false; break; }
             }
             if (validPos && attemptPos) {
                 try { 
                     let sz = random(60, 150) * 2; // Double the size
                     let c1 = color(random(50, 200), random(50, 200), random(50, 200)); 
                     let c2 = color(random(50, 200), random(50, 200), random(50, 200)); 
                     this.planets.push(new Planet(attemptPos.x, attemptPos.y, sz, c1, c2)); 
                 }
                 catch(e) { console.error("Error creating/pushing planet object:", e); }
             }
         }
    } // End createRandomPlanets

    /** Called when player enters system. Resets dynamic objects. */
    enterSystem(player) {
        // console.log(`>>> Entering enterSystem for ${this.name}...`); // Verbose
        this.visited = true; this.enemies = []; this.projectiles = []; this.asteroids = [];
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;
        if (player && player.pos) {
            // console.log("   enterSystem: Spawning initial NPCs..."); // Verbose
            for (let i = 0; i < 3; i++) { try { this.trySpawnNPC(player); } catch(e) {} }
            // console.log("   enterSystem: Spawning initial Asteroids..."); // Verbose
            for (let i = 0; i < 8; i++) { try { this.trySpawnAsteroid(player); } catch(e) {} }
        }
        // console.log(`<<< Exiting enterSystem... System: ${this.name}`); // Verbose
    }

    /** Attempts to spawn an NPC ship. Calls init methods after creation. */
    trySpawnNPC(player) {
        if (!player?.pos || this.enemies.length >= this.maxEnemies) return;

        let chosenRole; let chosenShipTypeName;
        try { // Wrap random selection
            let roleRoll = random(); const pC=0.45, polC=0.25; if(roleRoll<pC)chosenRole=AI_ROLE.PIRATE;else if(roleRoll<pC+polC)chosenRole=AI_ROLE.POLICE;else chosenRole=AI_ROLE.HAULER;
            switch(chosenRole) { case AI_ROLE.PIRATE: chosenShipTypeName=random(["Krait","WaspAssault"]);break; case AI_ROLE.POLICE: chosenShipTypeName=random(["CobraMkIII"]);break; case AI_ROLE.HAULER: chosenShipTypeName=random(["Adder","Adder","Python"]);break; default: chosenShipTypeName="Krait"; }

            // --- Optional Thargoid Override ---
             const thargoidChance = 0.03; // Keep low
             if (random() < thargoidChance && chosenRole !== AI_ROLE.HAULER) {
                  // !!! USE THE CORRECT KEY FROM SHIP_DEFINITIONS !!!
                  chosenShipTypeName = "Thargoid"; // Use "Thargoid", not "Thargoid Interceptor"
                  // !!! ------------------------------------------ !!!
                  chosenRole = AI_ROLE.PIRATE; // Treat Thargoid as hostile for basic AI
                  console.warn("!!! Thargoid Spawn Triggered !!!");
             }
             // --- End Thargoid Override ---

        } catch (e) { console.error("Error during NPC role/type selection:", e); chosenShipTypeName = "Krait"; chosenRole = AI_ROLE.PIRATE; } // Fallback on error

        // console.log(`Attempting to spawn a ${chosenRole} (${chosenShipTypeName})...`); // Verbose log

        let angle = random(TWO_PI); let spawnDist = sqrt(sq(width/2)+sq(height/2))+random(150,400);
        let spawnX = player.pos.x + cos(angle)*spawnDist; let spawnY = player.pos.y + sin(angle)*spawnDist;
        try {
            let newEnemy = new Enemy(spawnX, spawnY, player, chosenShipTypeName, chosenRole);
            newEnemy.calculateRadianProperties(); // Calculate radians
            newEnemy.initializeColors(); // Initialize colors
            this.enemies.push(newEnemy);
        } catch(e) { console.error("!!! ERROR during trySpawnNPC (Enemy creation/init):", e); }
    }

    /** Attempts to spawn an asteroid. */
    trySpawnAsteroid(player) {
        if (!player?.pos || this.asteroids.length >= this.maxAsteroids) return;
        try {
            let angle = random(TWO_PI); let spawnDist = sqrt(sq(width/2)+sq(height/2))+random(200,500);
            let spawnX = player.pos.x + cos(angle)*spawnDist; let spawnY = player.pos.y + sin(angle)*spawnDist;
            let size = random(40, 90); // Use larger default size
            this.asteroids.push(new Asteroid(spawnX, spawnY, size));
        } catch(e) { console.error("!!! ERROR during trySpawnAsteroid:", e); }
    }

    /** Updates dynamic objects, handles spawning/despawning, checks collisions. */
    update(player) {
        if (!player || !player.pos) { console.warn("StarSystem update skipped: Invalid player object."); return; }
        try {
            // Update Enemies & Check Bounty Progress
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i]; if (!enemy) { this.enemies.splice(i, 1); continue; }
                try{ enemy.update(this); } catch(e){ console.error("Err updating Enemy:",e,enemy); }
                if (enemy.isDestroyed()) {
                    let reward = 0; if (enemy.role !== AI_ROLE.HAULER) reward = 25;
                    // --- Check Active Bounty Mission & AUTO-COMPLETE ---
                    // Check using safe access ?. and correct types
                    if (player.activeMission?.type === MISSION_TYPE.BOUNTY_PIRATE && enemy.role === AI_ROLE.PIRATE) {
                        player.activeMission.progressCount++;
                        console.log(`Bounty progress: ${player.activeMission.progressCount}/${player.activeMission.targetCount}`);
                        if (player.activeMission.progressCount >= player.activeMission.targetCount) {
                             console.log("Bounty mission target count met! Completing mission...");
                             // Call player.completeMission WITHOUT system/station args for auto-complete
                             player.completeMission(); // <<< Use simpler call for auto-complete
                             reward = 0; // Don't give base reward if mission completed
                        }
                    }
                    // --- End Bounty Check ---
                    if (reward > 0) player.addCredits(reward);
                    this.enemies.splice(i, 1); continue;
                }
                let dE = dist(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y); if (dE > this.despawnRadius * 1.1) this.enemies.splice(i, 1);
            }

            // --- Update Asteroids & Handle Destruction/Despawn ---
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.asteroids[i]; if (!asteroid) { this.asteroids.splice(i, 1); continue; }
                try{ asteroid.update(); } catch(e){ console.error("Err updating Asteroid:",e,asteroid); }
                if (asteroid.isDestroyed()) { player.addCredits(floor(asteroid.size / 4)); this.asteroids.splice(i, 1); continue; }
                let dA = dist(asteroid.pos.x, asteroid.pos.y, player.pos.x, player.pos.y); if (dA > this.despawnRadius * 1.2) this.asteroids.splice(i, 1);
            }

            // --- Update Projectiles (Ensure proj.update() is called) ---
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                 const proj = this.projectiles[i]; if (!proj) { this.projectiles.splice(i, 1); continue; }
                 try { proj.update(); } catch(e) { console.error("Err updating Projectile:",e,proj); } // <<< Call update()
                 let dP = dist(proj.pos.x, proj.pos.y, player.pos.x, player.pos.y); if (proj.lifespan <= 0 || dP > this.despawnRadius) { this.projectiles.splice(i, 1); }
            }
            // --- End Projectile Loop ---

            // Collision Checks
            this.checkCollisions(player);
            // Spawning Timers
            this.enemySpawnTimer += deltaTime; if (this.enemySpawnTimer >= this.enemySpawnInterval) { this.trySpawnNPC(player); this.enemySpawnTimer = 0; }
            this.asteroidSpawnTimer += deltaTime; if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval) { this.trySpawnAsteroid(player); this.asteroidSpawnTimer = 0; }
        } catch (e) { console.error(`Major ERROR in StarSystem ${this.name}.update:`, e); }
    } // End update


    /** Checks collisions between all relevant dynamic objects. */
    checkCollisions(player) {
        if (!player) return;
        try { // Wrap collision logic
            // Projectiles vs Ships & Asteroids
            for (let i = this.projectiles.length - 1; i >= 0; i--) { const p = this.projectiles[i]; if (!p) continue; let pRemoved = false; if (p.owner === 'ENEMY' && p.checkCollision(player)) { player.takeDamage(p.damage); this.projectiles.splice(i, 1); pRemoved = true; } if (pRemoved) continue; if (p.owner === 'PLAYER') { for (let j = this.enemies.length - 1; j >= 0; j--) { const e = this.enemies[j]; if (!e) continue; if (p.checkCollision(e)) { e.takeDamage(p.damage); this.projectiles.splice(i, 1); pRemoved = true; break; } } } if (pRemoved) continue; for (let j = this.asteroids.length - 1; j >= 0; j--) { const a = this.asteroids[j]; if (!a) continue; if (p.checkCollision(a)) { a.takeDamage(p.damage); this.projectiles.splice(i, 1); pRemoved = true; break; } } }
            // Player vs Asteroids (Ramming)
            for (let i = this.asteroids.length - 1; i >= 0; i--) { const a = this.asteroids[i]; if (!a || a.isDestroyed()) continue; if (player.checkCollision(a)) { let ramDmg = 10 + floor(a.size / 4); player.takeDamage(ramDmg); a.takeDamage(ramDmg * 2); } }
        } catch(e) { console.error(`Error during checkCollisions in ${this.name}:`, e); }
    } // End checkCollisions

    /** Adds a projectile to the system's list. */
    addProjectile(proj) { if (proj) this.projectiles.push(proj); }

    /** Draws background stars. Assumes called within translated space. */
    drawBackground() {
        if (!this.bgStars) return; fill(255); noStroke();
        this.bgStars.forEach(s => ellipse(s.x, s.y, s.size, s.size));
    }

    /** Draws the entire system centered on the player. */
    draw(player) {
        if (!player || !player.pos || isNaN(player.pos.x) || isNaN(player.pos.y)) return;
        push(); let tx = width / 2 - player.pos.x; let ty = height / 2 - player.pos.y;
        if(isNaN(tx) || isNaN(ty)) { tx = 0; ty = 0;} translate(tx, ty);
        try { // Wrap drawing calls
            this.drawBackground();
            if (this.station) this.station.draw();
            this.planets.forEach(p => p?.draw()); this.asteroids.forEach(a => a?.draw());
            this.enemies.forEach(e => e?.draw()); this.projectiles.forEach(p => p?.draw());
            player.draw();
        } catch (e) { console.error(`Error during StarSystem ${this.name} world element drawing:`, e); }
        finally { pop(); } // Ensure pop() runs
    }

    // --- Save/Load System State ---
    getSaveData() { return { visited: this.visited }; }
    loadSaveData(data) { if (data?.visited !== undefined) this.visited = data.visited; }

    /** Generates or retrieves missions for the station in this system */
    getAvailableMissions(galaxy, player) {
         if (this.station && typeof MissionGenerator?.generateMissions === 'function' && galaxy && player) {
             try { this.availableMissions = MissionGenerator.generateMissions(this, this.station, galaxy, player); return this.availableMissions; }
             catch(e) { console.error("Error generating missions:", e); this.availableMissions = []; return [];}
         }
         console.warn(`Cannot get missions for ${this.name}: Missing station, MissionGenerator, galaxy, or player.`);
         return []; // Return empty if cannot generate
    }

} // End of StarSystem Class