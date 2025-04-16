// ****** StarSystem.js ******

const POLICE_SHIPS = ["CobraMkIII", "Viper",];
const PIRATE_SHIPS = ["Krait", "WaspAssault", "Sidewinder"]; // Ensure these names exist in SHIP_DEFINITIONS

// --- CORRECTED HAULER LIST ---
// Removed invalid "Hauler". Adjusted mix slightly. Ensure names match SHIP_DEFINITIONS keys.
const HAULER_SHIPS = [
    "Adder", // Common small hauler
    "Adder",
    "Type6Transporter", // Common medium hauler
    "Type6Transporter",
    "Keelback",         // Combat Trader variant
    "Python",           // Less common, powerful multi-role/hauler
    "Type9Heavy"        // Less common, heavy hauler
];

const TRANSPORT_SHIPS = ["ProspectorMiner", "MuleFreighter"]; // Ensure these names exist in SHIP_DEFINITIONS


class StarSystem {
    /**
     * Creates a Star System instance. Sets up basic properties.
     * Seeded elements (planets, bgStars) are generated later via initStaticElements().
     * @param {string} name - The name of the system.
     * @param {string} economy - The actual economy type (e.g., "Industrial").
     * @param {number} galaxyX - The X coordinate on the main galaxy map.
     * @param {number} galaxyY - The Y coordinate on the main galaxy map.
     * @param {number} systemIndex - The unique index of this system, used for seeding.
     * @param {number} [techLevel=5] - The technological level of the system (1-10).
     * @param {string} [securityLevel='Medium'] - The security level (e.g., 'High', 'Anarchy').
     */
    constructor(name, economy, galaxyX, galaxyY, systemIndex, techLevel = 5, securityLevel = 'Medium') {
        console.log("StarSystem constructor called for", name);
        this.name = name;
        this.actualEconomy = economy; // Store the actual randomly chosen economy internally.
        this.economyType = "Unknown"; // Visible economy remains "Unknown" until discovered.
        try { this.galaxyPos = createVector(galaxyX, galaxyY); } catch(e) { this.galaxyPos = {x: galaxyX, y: galaxyY}; } // Map position
        this.visited = false;
        this.systemIndex = systemIndex; // Used for seeding static elements
        this.connectedSystemIndices = []; // <-- ADD THIS LINE

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
        randomSeed(this.systemIndex);

        // --- Create Station (Pass a generated name) ---
        console.log("         Creating Station...");
        let stationName = `${this.name} Hub`; // Example name generation: "Solara Hub"
        try {
             this.station = new Station(0, 0, this.actualEconomy, stationName); // Pass name here
        } catch(e) {
             console.error("         Error creating Station:", e);
        }
        console.log(`         Station created (Name: ${this.station?.name || 'N/A'})`); // Log created station name

        // --- Calculate Despawn Radius based on screen size ---
        try {
            this.despawnRadius = max(width, height) * 2.0;
        } catch(e) {
            console.error("         Error getting width/height/max for despawnRadius:", e);
            this.despawnRadius = 2000; // Use default fallback
        }

        // --- Seeded Visual Background Elements ---
        try { this.starColor = color(random(200, 255), random(150, 255), random(50, 150)); } catch(e) { this.starColor = color(255, 255, 0);} // Fallback color yellow
        try { this.starSize = random(50, 150); } catch(e) { this.starSize = 100; } // Fallback size

        this.bgStars = []; let worldBounds = this.despawnRadius * 1.5; let numBgStars = 100; // Default star count
        try { numBgStars = floor(random(250, 400)); } catch(e) {} // Use default on error
        try { // Generate background stars using seeded random
            for (let i = 0; i < numBgStars; i++) {
                this.bgStars.push({
                    x: random(-worldBounds, worldBounds),
                    y: random(-worldBounds, worldBounds),
                    size: random(1, 3)
                });
            }
        } catch(e) { console.error("Error generating background stars:", e); }

        // --- Initialize Planets (Seeded) ---
        try { this.createRandomPlanets(); } // Call method that uses seeded random
        catch(e) { console.error("Error during createRandomPlanets call:", e); }

        // --- CRITICAL: Reset Seed AFTER generating all static seeded elements ---
        randomSeed(); // Reset to non-deterministic (time-based) random

        console.log(`      <<< ${this.name}: initStaticElements() Finished`); // Log completion
    }

    /** Creates random planets using seeded random. Called by initStaticElements. */
    createRandomPlanets() {
        // Clear any previous planets and add the central star at (0,0)
        this.planets = [];
        this.planets.push(Planet.createSun());

        let numPlanets = floor(random(2, 7));
        let minOrbit = 1200;
        let maxOrbit = this.despawnRadius * 1.8;

        // Get a base rotation for the system (in radians)
        let baseAngle = random(TWO_PI);

        for (let i = 0; i < numPlanets; i++) {
            // Calculate the orbit angle in radians with a small random offset
            let angleRad = baseAngle + (TWO_PI / numPlanets) * i + random(-0.1, 0.1);
            // Determine a random orbit radius
            let orbitRadius = random(minOrbit, maxOrbit);
            // Because the global angleMode is DEGREES, convert the radian value to degrees
            let angleDeg = degrees(angleRad);
            let px = cos(angleDeg) * orbitRadius;
            let py = sin(angleDeg) * orbitRadius;

            let sz = random(60, 150) * 2;
            let c1 = color(random(50, 200), random(50, 200), random(50, 200));
            let c2 = color(random(50, 200), random(50, 200), random(50, 200));

            // Create the planet with the computed world coordinates
            let planet = new Planet(px, py, sz, c1, c2);
            this.planets.push(planet);

            console.log(`Planet ${i}: angleRad=${angleRad.toFixed(2)}, orbitRadius=${orbitRadius.toFixed(2)}, px=${px.toFixed(2)}, py=${py.toFixed(2)}`);
        }

        // Position the station near a random planet (do not use the star at index 0)
        if (this.station && this.planets.length > 1) {
            let randomIndex = floor(random(1, this.planets.length));
            let chosenPlanet = this.planets[randomIndex];
            // Use atan2 to determine the angle of the chosen planet relative to (0,0)
            let angleDeg = atan2(chosenPlanet.pos.y, chosenPlanet.pos.x);
            // Convert back to radians for the p5.Vector.fromAngle() function (which expects radians)
            let angleRad = radians(angleDeg);
            let offsetDistance = chosenPlanet.size * 1.5 + 80; // Ensure the station is offset a bit
            let offset = p5.Vector.fromAngle(angleRad).mult(offsetDistance);
            this.station.pos = p5.Vector.add(chosenPlanet.pos, offset);
        }
    } // End createRandomPlanets

    /** Called when player enters system. Resets dynamic objects. */
    enterSystem(player) {
        this.discover(); // Mark as visited and update the economy if needed.
        this.enemies = []; this.projectiles = []; this.asteroids = [];
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;
        if (player && player.pos) {
            for (let i = 0; i < 3; i++) { try { this.trySpawnNPC(player); } catch(e) {} }
            for (let i = 0; i < 8; i++) { try { this.trySpawnAsteroid(player); } catch(e) {} }
        }
    }

    /** Call this method when the system is discovered by the player. */
    discover() {
        if (!this.visited) {
            this.visited = true;
            this.economyType = this.actualEconomy;
            console.log(`${this.name} discovered! Economy set to ${this.economyType}`);
        }
    }

    /** Attempts to spawn an NPC ship. Calls init methods after creation. */
    trySpawnNPC(player) {
        if (!player?.pos || this.enemies.length >= this.maxEnemies) return;

        // Get probabilities based on security level
        const probs = this.getEnemyRoleProbabilities();
        let r = random();
        let chosenRole;
        if (r < probs.PIRATE) chosenRole = AI_ROLE.PIRATE;
        else if (r < probs.PIRATE + probs.POLICE) chosenRole = AI_ROLE.POLICE;
        else chosenRole = AI_ROLE.HAULER;

        let chosenShipTypeName;
        switch (chosenRole) {
            case AI_ROLE.PIRATE:
                chosenShipTypeName = random(PIRATE_SHIPS);
                break;
            case AI_ROLE.POLICE:
                chosenShipTypeName = random(POLICE_SHIPS);
                break;
            case AI_ROLE.HAULER:
                chosenShipTypeName = random(HAULER_SHIPS);
                break;
            default:
                chosenShipTypeName = "Krait";
        }

        // --- New transport spawn branch (15% chance) ---
        if (random() < 0.25) {
            chosenRole = AI_ROLE.TRANSPORT;
            chosenShipTypeName = random(TRANSPORT_SHIPS);
        }

        // --- Optional Thargoid Override ---
        const thargoidChance = 0.01;
        if (random() < thargoidChance && chosenRole !== AI_ROLE.HAULER) {
            chosenShipTypeName = "Thargoid";
            chosenRole = AI_ROLE.PIRATE;
            console.warn("!!! Thargoid Spawn Triggered !!!");
        }
        // --- End Thargoid Override ---

        let angle = random(TWO_PI);
        let spawnDist = sqrt(sq(width/2) + sq(height/2)) + random(150, 400);
        let spawnX = player.pos.x + cos(angle) * spawnDist;
        let spawnY = player.pos.y + sin(angle) * spawnDist;
        try {
            let newEnemy = new Enemy(spawnX, spawnY, player, chosenShipTypeName, chosenRole);
            newEnemy.calculateRadianProperties();
            newEnemy.initializeColors();
            this.enemies.push(newEnemy);
        } catch(e) { 
            console.error("!!! ERROR during trySpawnNPC (Enemy creation/init):", e); 
        }
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
        if (!player || !player.pos) return;
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
                let proj = this.projectiles[i];
                proj.update();
                if (proj.lifespan <= 0 || proj.isOffScreen()) {
                    this.projectiles.splice(i, 1);
                }
            }
            // --- End Projectile Loop ---

            // Collision Checks
            this.checkCollisions(player);
            this.checkProjectileCollisions(player); // Added call to new method
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
            this.enemies.forEach(e => e?.draw());
            this.projectiles.forEach(proj => proj.draw());
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

    getEnemyRoleProbabilities() {
        // Adjust these as needed for your game balance
        switch ((this.securityLevel || '').toLowerCase()) {
            case 'high':
                return { PIRATE: 0.15, POLICE: 0.55, HAULER: 0.3 };
            case 'medium':
                return { PIRATE: 0.35, POLICE: 0.35, HAULER: 0.3 };
            case 'low':
                return { PIRATE: 0.55, POLICE: 0.2, HAULER: 0.25 };
            case 'anarchy':
                return { PIRATE: 0.8, POLICE: 0.05, HAULER: 0.15 };
            default:
                return { PIRATE: 0.4, POLICE: 0.3, HAULER: 0.3 };
        }
    }

    toJSON() {
        return {
            name: this.name,
            economyType: this.economyType,
            galaxyPos: { x: this.galaxyPos.x, y: this.galaxyPos.y },
            systemIndex: this.systemIndex,
            techLevel: this.techLevel,
            securityLevel: this.securityLevel,
            visited: this.visited,
            connectedSystemIndices: this.connectedSystemIndices ? [...this.connectedSystemIndices] : [],
            // Save planets if present
            planets: Array.isArray(this.planets)
                ? this.planets.map(p => (typeof p.toJSON === 'function' ? p.toJSON() : null))
                : [],
            // Save station if present
            station: this.station && typeof this.station.toJSON === 'function'
                ? this.station.toJSON()
                : null,
        };
    }

    static fromJSON(data) {
        const sys = new StarSystem(
            data.name,
            data.economyType,  // Although if undiscovered, this might be "Unknown"
            data.galaxyPos.x,
            data.galaxyPos.y,
            data.systemIndex,
            data.techLevel,
            data.securityLevel
        );
        sys.visited = data.visited;
        sys.economyType = data.economyType;
        sys.connectedSystemIndices = Array.isArray(data.connectedSystemIndices) ? [...data.connectedSystemIndices] : [];

        // Restore planets if present
        if (Array.isArray(data.planets) && typeof Planet !== "undefined" && typeof Planet.fromJSON === "function") {
            sys.planets = data.planets.map(p => Planet.fromJSON(p));
        } else {
            sys.planets = [];
        }

        // Restore station if present
        if (data.station && typeof Station !== "undefined" && typeof Station.fromJSON === "function") {
            sys.station = Station.fromJSON(data.station);
        } else {
            sys.station = null;
        }

        return sys;
    }

    checkProjectileCollisions(player) {
        // Loop backwards over projectiles so removals don't skip elements
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i];

            // Check collision against the player if the shooter is not the player
            if (player && proj.owner !== player && proj.checkCollision(player)) {
                console.log(`Projectile hit player! Damage: ${proj.damage}`);
                player.takeDamage(proj.damage);
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Check collision against each enemy ship (allowing friendly fire)
            for (let enemy of this.enemies) {
                // Do not let a ship be hit by its own projectile
                if (proj.owner === enemy) continue;

                if (proj.checkCollision(enemy)) {
                    console.log(`Projectile hit ${enemy.shipTypeName}! Damage: ${proj.damage}`);
                    enemy.takeDamage(proj.damage);
                    this.projectiles.splice(i, 1);
                    break; // Break to avoid checking this projectile against other ships
                }
            }
        }
    }

} // End of StarSystem Class