// ****** StarSystem.js ******

// Build ship role arrays from SHIP_DEFINITIONS
const buildShipRoleArrays = () => {
    const POLICE_SHIPS = [];
    const PIRATE_SHIPS = [];
    const HAULER_SHIPS = [];
    const TRANSPORT_SHIPS = [];
    const MILITARY_SHIPS = [];
    const ALIEN_SHIPS = [];
    
    // Iterate through all ship definitions
    for (const [shipKey, shipData] of Object.entries(SHIP_DEFINITIONS)) {
        if (!shipData.aiRoles || !Array.isArray(shipData.aiRoles)) continue;
        
        // Add ship to appropriate role arrays based on its aiRoles
        if (shipData.aiRoles.includes("POLICE")) POLICE_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("PIRATE")) PIRATE_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("HAULER")) HAULER_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("TRANSPORT")) TRANSPORT_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("MILITARY")) MILITARY_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("ALIEN")) ALIEN_SHIPS.push(shipKey);
    }
    
    return {
        POLICE_SHIPS,
        PIRATE_SHIPS, 
        HAULER_SHIPS,
        TRANSPORT_SHIPS,
        MILITARY_SHIPS,
        ALIEN_SHIPS
    };
};

// Initialize the role arrays
const {
    POLICE_SHIPS,
    PIRATE_SHIPS,
    HAULER_SHIPS, 
    TRANSPORT_SHIPS,
    MILITARY_SHIPS,
    ALIEN_SHIPS
} = buildShipRoleArrays();

// Log the generated arrays to verify
console.log("Ship role arrays generated from ship definitions:");
console.log("POLICE_SHIPS:", POLICE_SHIPS);
console.log("PIRATE_SHIPS:", PIRATE_SHIPS);
console.log("HAULER_SHIPS:", HAULER_SHIPS);
console.log("TRANSPORT_SHIPS:", TRANSPORT_SHIPS);
console.log("MILITARY_SHIPS:", MILITARY_SHIPS);
console.log("ALIEN_SHIPS:", ALIEN_SHIPS);

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
        this.beams = [];
        this.forceWaves = []; // Make sure this is initialized
        this.explosions = [];
        this.cargo = [];
        this.starColor = null; // Set in initStaticElements
        this.starSize = 100;   // Default size, set in initStaticElements
        this.bgStars = [];     // Populated in initStaticElements

        // --- Config (can be set here, despawnRadius updated later) ---
        this.enemySpawnTimer = 0; this.enemySpawnInterval = 5000; this.maxEnemies = 8;
        this.asteroidSpawnTimer = 0; this.asteroidSpawnInterval = 3000; this.maxAsteroids = 10;
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
            let angle = baseAngle + (TWO_PI / numPlanets) * i + random(-0.1, 0.1);
            // Determine a random orbit radius
            let orbitRadius = random(minOrbit, maxOrbit);
            let px = cos(angle) * orbitRadius;
            let py = sin(angle) * orbitRadius;

            let sz = random(60, 150) * 2;
            let c1 = color(random(50, 200), random(50, 200), random(50, 200));
            let c2 = color(random(50, 200), random(50, 200), random(50, 200));

            // Create the planet with the computed world coordinates
            let planet = new Planet(px, py, sz, c1, c2);
            this.planets.push(planet);

            console.log(`Planet ${i}: angle=${angle.toFixed(2)}, orbitRadius=${orbitRadius.toFixed(2)}, px=${px.toFixed(2)}, py=${py.toFixed(2)}`);
        }

        // Position the station near a random planet (do not use the star at index 0)
        if (this.station && this.planets.length > 1) {
            let randomIndex = floor(random(1, this.planets.length));
            let chosenPlanet = this.planets[randomIndex];
            // Use atan2 to determine the angle of the chosen planet relative to (0,0)
            let angle = atan2(chosenPlanet.pos.y, chosenPlanet.pos.x); // Already in radians
            let offsetDistance = chosenPlanet.size * 1.5 + 80; // Ensure the station is offset a bit
            let offset = p5.Vector.fromAngle(angle).mult(offsetDistance);
            this.station.pos = p5.Vector.add(chosenPlanet.pos, offset);
        }
    } // End createRandomPlanets

    /** Called when player enters system. Resets dynamic objects. */
    enterSystem(player) {
        this.discover(); // Mark as visited and update the economy if needed.
        this.enemies = []; this.projectiles = []; this.asteroids = [];
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;
        
        // Initial system population
        setTimeout(() => {
            if (player && player.pos) {
                console.log(`Player entering ${this.name} system. Wanted status: ${player.isWanted}`);
                
                // Spawn initial NPCs
                for (let i = 0; i < 3; i++) { try { this.trySpawnNPC(player); } catch(e) {} }
                for (let i = 0; i < 8; i++) { try { this.trySpawnAsteroid(player); } catch(e) {} }
                
                // CRITICAL FIX: Force police response on a slight delay after ships spawn
                setTimeout(() => {
                    // Check again if player exists and is wanted
                    if (player && player.isWanted) {
                        // Only log once per system entry, not for each police ship
                        console.log(`WANTED ALERT: Broadcasting player wanted status in ${this.name} system!`);
                        uiManager.addMessage(`WANTED ALERT: Player is wanted status in ${this.name} system!`);

                        // Force all police to respond
                        let policeCalled = false;
                        let policeCount = 0;
                        for (let enemy of this.enemies) {
                            if (enemy.role === AI_ROLE.POLICE) {
                                enemy.target = player;
                                enemy.currentState = AI_STATE.APPROACHING;
                                
                                // Force immediate rotation toward player
                                if (enemy.pos && player.pos) {
                                    let angleToPlayer = atan2(player.pos.y - enemy.pos.y, player.pos.x - enemy.pos.x);
                                    enemy.angle = angleToPlayer;
                                    enemy.desiredAngle = enemy.angle;
                                }
                                
                                policeCalled = true;
                                policeCount++;
                            }
                        }
                        
                        // Only log summary rather than per-ship messages
                        if (policeCalled) {
                            console.log(`System Alert: ${policeCount} police ships responding to wanted status`);
                            uiManager.addMessage(`System Alert: ${policeCount} police ships responding to wanted status`);
                        } else {
                            console.log("No police ships available to respond to wanted status!");
                            uiManager.addMessage(`No police ships available to respond to wanted status!`);

                        }
                    }
                }, 500); // 500ms delay after ships spawn to ensure AI is properly initialized
            }
        }, 100); // Initial 100ms delay
    }

    /** Call this method when the system is discovered by the player. */
    discover() {
        if (!this.visited) {
            this.visited = true;
        }
        // Always update economyType if it's still "Unknown"
        if (this.economyType === "Unknown" && this.actualEconomy) {
            this.economyType = this.actualEconomy;
            if (this.station && this.station.market) {
                this.station.market.systemType = this.economyType;
                this.station.market.updatePrices();
            }
        }
        // Optionally, update market even if already visited
    }

    /** Attempts to spawn an NPC ship. Calls init methods after creation. */
    trySpawnNPC(player) {
        if (!player?.pos || this.enemies.length >= this.maxEnemies) return;

        let chosenRole, chosenShipTypeName;
        const econ = (this.actualEconomy || this.economyType || "").toLowerCase();
        const sec = (this.securityLevel || "").toLowerCase();

        // --- Special cases for economy ---
        if (econ === "military") {
            chosenRole = AI_ROLE.HAULER;
            chosenShipTypeName = random(MILITARY_SHIPS);
        } else if (econ === "alien") {
            // Mostly alien ships, but allow a few Vipers as "observers"
            if (random() < 0.8) {
                chosenRole = AI_ROLE.PIRATE;
                chosenShipTypeName = random(ALIEN_SHIPS);
            } else {
                chosenRole = AI_ROLE.POLICE;
                chosenShipTypeName = "Viper";
            }
        } else {
            // --- Standard spawn logic based on security ---
            const probs = this.getEnemyRoleProbabilities();
            let r = random();
            if (r < probs.PIRATE) chosenRole = AI_ROLE.PIRATE;
            else if (r < probs.PIRATE + probs.POLICE) chosenRole = AI_ROLE.POLICE;
            else chosenRole = AI_ROLE.HAULER;

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

            // --- Optional: Transport spawn branch ---
            if (random() < 0.25) {
                chosenRole = AI_ROLE.TRANSPORT;
                chosenShipTypeName = random(TRANSPORT_SHIPS);
            }
        }

        // --- Thargoid override only for non-alien systems ---
        if (econ !== "alien") {
            const thargoidChance = 0.01;
            if (random() < thargoidChance && chosenRole !== AI_ROLE.HAULER) {
                chosenShipTypeName = "Thargoid";
                chosenRole = AI_ROLE.PIRATE;
                uiManager.addMessage(`Thargoid Spawn Detected`);
            }
        }

        // --- Spawn the ship ---
        let angle = random(TWO_PI);
        let spawnDist = sqrt(sq(width/2) + sq(height/2)) + random(150, 400);
        let spawnX = player.pos.x + cos(angle) * spawnDist;
        let spawnY = player.pos.y + sin(angle) * spawnDist;
        try {
            let newEnemy = new Enemy(spawnX, spawnY, player, chosenShipTypeName, chosenRole);
            newEnemy.currentSystem = this;
            newEnemy.calculateRadianProperties();
            newEnemy.initializeColors();
            
            // NEW CODE: Make police immediately target wanted player upon spawn
            if (newEnemy.role === AI_ROLE.POLICE && player && player.isWanted && !player.destroyed) {
                newEnemy.target = player;
                newEnemy.currentState = AI_STATE.APPROACHING;
                // Force initial rotation toward player
                if (newEnemy.pos && player.pos) {
                    let angle = atan2(player.pos.y - newEnemy.pos.y, player.pos.x - player.pos.x);
                    newEnemy.angle = angle; // Already in radians
                }
                console.log(`New police ${newEnemy.shipTypeName} immediately pursuing wanted player!`);
            }
            
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

    /** Updates all system entities. */
    update(playerRef) {
        if (!playerRef || !playerRef.pos) return;
        try {
            // Update Enemies & Check Bounty Progress
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i]; if (!enemy) { this.enemies.splice(i, 1); continue; }
                try{ enemy.update(this); } catch(e){ console.error("Err updating Enemy:",e,enemy); }
                if (enemy.isDestroyed()) {
                    let reward = 0; if (enemy.role !== AI_ROLE.HAULER) reward = 25;
                    // --- Check Active Bounty Mission & AUTO-COMPLETE ---
                    // Check using safe access ?. and correct types
                    if (playerRef.activeMission?.type === MISSION_TYPE.BOUNTY_PIRATE && enemy.role === AI_ROLE.PIRATE) {
                        playerRef.activeMission.progressCount++;
                        console.log(`Bounty progress: ${playerRef.activeMission.progressCount}/${playerRef.activeMission.targetCount}`);
                        if (playerRef.activeMission.progressCount >= playerRef.activeMission.targetCount) {
                             console.log("Bounty mission target count met! Completing mission...");
                             // Call player.completeMission WITHOUT system/station args for auto-complete
                             playerRef.completeMission(); // <<< Use simpler call for auto-complete
                             reward = 0; // Don't give base reward if mission completed
                        }
                    }
                    // --- End Bounty Check ---
                    if (reward > 0) playerRef.addCredits(reward);
                    this.enemies.splice(i, 1); continue;
                }
                let dE = dist(enemy.pos.x, enemy.pos.y, playerRef.pos.x, playerRef.pos.y); if (dE > this.despawnRadius * 1.1) this.enemies.splice(i, 1);
            }

            // --- Update Asteroids & Handle Destruction/Despawn ---
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.asteroids[i]; if (!asteroid) { this.asteroids.splice(i, 1); continue; }
                try{ asteroid.update(); } catch(e){ console.error("Err updating Asteroid:",e,asteroid); }
                if (asteroid.isDestroyed()) { playerRef.addCredits(floor(asteroid.size / 4)); this.asteroids.splice(i, 1); continue; }
                let dA = dist(asteroid.pos.x, asteroid.pos.y, playerRef.pos.x, playerRef.pos.y); if (dA > this.despawnRadius * 1.2) this.asteroids.splice(i, 1);
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

            // Update Beams
            this.updateBeams && this.updateBeams();

            // Update and process force waves
            for (let i = this.forceWaves.length - 1; i >= 0; i--) {
                const wave = this.forceWaves[i];
                
                // Expand the wave
                wave.radius += wave.growRate;
                
                // Check for collisions with enemies (if player's wave)
                if (wave.owner === playerRef) {
                    for (const enemy of this.enemies) {
                        // Skip if already processed this enemy
                        if (wave.processed[enemy.id]) continue;
                        
                        // Calculate distance from wave center to enemy
                        const dist = p5.Vector.dist(wave.pos, enemy.pos);
                        
                        // If enemy is within wave radius, apply damage
                        if (dist < wave.radius + enemy.size/2) {
                            // Calculate damage with much less aggressive falloff
                            const distRatio = dist / (wave.radius + enemy.size/2);
                            
                            // Use a gentler falloff curve (0.8 power instead of 1.5)
                            // This ensures the damage remains high even at medium distances
                            const falloff = Math.pow(1 - distRatio, 0.8);
                            
                            // Increase minimum damage and make it a percentage of base damage
                            const minDamage = Math.max(30, Math.floor(wave.damage * 0.1));
                            const dmg = Math.max(minDamage, Math.floor(wave.damage * falloff));
                            
                            // Apply damage and mark as processed
                            enemy.takeDamage(dmg);
                            wave.processed[enemy.id] = true;
                            console.log(`Force wave hit ${enemy.shipTypeName} for ${dmg} damage`);
                        }
                    }
                }
                
                // Check collision with player (if enemy's wave)
                if (wave.owner !== playerRef && playerRef && !wave.processed['player']) {
                    const dist = p5.Vector.dist(wave.pos, playerRef.pos);
                    if (dist < wave.radius + playerRef.size/2) {
                        const falloff = 1 - (dist / (wave.radius + playerRef.size/2));
                        const dmg = Math.max(1, Math.floor(wave.damage * falloff));
                        playerRef.takeDamage(dmg);
                        wave.processed['player'] = true;
                        console.log(`Enemy force wave hit player for ${dmg} damage`);
                    }
                }
                
                // Remove wave if it reaches max size
                if (wave.radius >= wave.maxRadius) {
                    this.forceWaves.splice(i, 1);
                }
            }

            // Update explosions
            for (let i = this.explosions.length - 1; i >= 0; i--) {
                this.explosions[i].update();
                if (this.explosions[i].isDone()) {
                    this.explosions.splice(i, 1);
                }
            }

            // Collision Checks
            this.checkCollisions(playerRef);
            this.checkProjectileCollisions(playerRef); // Added call to new method

            // Cargo collection and updates
            for (let i = this.cargo.length - 1; i >= 0; i--) {
                const cargo = this.cargo[i];
                if (!cargo) {
                    this.cargo.splice(i, 1);
                    continue;
                }

                // IMPORTANT: Call the update method on each cargo object
                cargo.update();

                // Check for player collection
                if (cargo.checkCollision(playerRef)) {
                    // Try to add cargo to player's inventory first
                    if (playerRef.getCargoAmount() < playerRef.cargoCapacity) {
                        const success = playerRef.addCargo(cargo.type, 1);
                        
                        if (success) {
                            // Cargo added to inventory
                            cargo.collected = true;
                            console.log(`Player collected ${cargo.type} cargo (${playerRef.getCargoAmount()}/${playerRef.cargoCapacity}t)`);
                            
                            // Optional visual/audio feedback
                            // You could add a brief flash or sound effect here
                            
                            this.cargo.splice(i, 1);
                            continue;
                        }
                    } else {
                        // Cargo hold is full - notify player
                        console.log("Cannot collect cargo: Cargo hold full");
                        // Maybe show a UI notification here
                    }
                }

                // Remove expired cargo
                if (cargo.isExpired()) {
                    this.cargo.splice(i, 1);
                }
            }

            // Spawning Timers
            this.enemySpawnTimer += deltaTime; if (this.enemySpawnTimer >= this.enemySpawnInterval) { this.trySpawnNPC(playerRef); this.enemySpawnTimer = 0; }
            this.asteroidSpawnTimer += deltaTime; if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval) { this.trySpawnAsteroid(playerRef); this.asteroidSpawnTimer = 0; }
        } catch (e) { console.error(`Major ERROR in StarSystem ${this.name}.update:`, e); }
    } // End update

    updateBeams() {
        // Remove expired beams (e.g., beams with .lifespan <= 0)
        for (let i = this.beams.length - 1; i >= 0; i--) {
            let beam = this.beams[i];
            beam.update && beam.update();
            if (beam.lifespan !== undefined && beam.lifespan <= 0) {
                this.beams.splice(i, 1);
            }
        }
    }

    drawBeams() {
        for (let beam of this.beams) {
            beam.draw && beam.draw();
        }
    }

    updateForceWaves() {
        for (let i = this.forceWaves.length - 1; i >= 0; i--) {
            let wave = this.forceWaves[i];
            wave.update && wave.update();
            if (wave.lifespan !== undefined && wave.lifespan <= 0) {
                this.forceWaves.splice(i, 1);
            }
        }
    }

    /** Draws force waves with proper transformation */
    drawForceWaves() {
        if (!this.forceWaves || this.forceWaves.length === 0) return;
        
        // No need for push/pop/translate here since we're already in the right coordinate system
        // from the parent draw() method
        
        for (const wave of this.forceWaves) {
            // Fade out as the wave expands
            const alpha = map(wave.radius, 0, wave.maxRadius, 220, 0);
            
            // Draw outer ring
            noFill();
            strokeWeight(6);
            stroke(wave.color[0], wave.color[1], wave.color[2], alpha);
            circle(wave.pos.x, wave.pos.y, wave.radius * 2);
            
            // Draw secondary ring
            strokeWeight(3);
            stroke(255, 255, 255, alpha * 0.7);
            circle(wave.pos.x, wave.pos.y, wave.radius * 1.9);
            
            // Draw inner glow
            strokeWeight(10);
            stroke(wave.color[0], wave.color[1], wave.color[2], alpha * 0.5);
            circle(wave.pos.x, wave.pos.y, wave.radius * 1.7);
            
            // Draw center pulse
            const pulseSize = (millis() - wave.startTime) % 300 / 300 * 50;
            fill(wave.color[0], wave.color[1], wave.color[2], alpha);
            noStroke();
            circle(wave.pos.x, wave.pos.y, pulseSize);
        }
    }

    /** Adds an explosion to the system's list. */
    addExplosion(x, y, size, color) {
        this.explosions.push(new Explosion(x, y, size, color));
    }

    /** Handles all collision detection and responses in the system. */
    checkCollisions(player) {
        if (!player) return;
        
        try {
            // --- PHYSICAL OBJECT COLLISIONS (Non-projectile) ---
            
            // Player vs Enemies
            for (let enemy of this.enemies) {
                if (enemy.isDestroyed()) continue;
                if (player.checkCollision(enemy)) {
                    // Handle ship-to-ship collision
                    let collisionDamage = Math.floor(
                        (player.vel.mag() + enemy.vel.mag())
                    );
                    console.log(`Ship collision! Damage: ${collisionDamage}`);
                    player.takeDamage(collisionDamage);
                    enemy.takeDamage(collisionDamage);
                    
                    // Apply physics push
                    let pushVector = p5.Vector.sub(enemy.pos, player.pos).normalize().mult(5);
                    player.vel.sub(pushVector);
                    enemy.vel.add(pushVector);
                }
            }
            
            // Player vs Asteroids
            for (let asteroid of this.asteroids) {
                if (asteroid.isDestroyed()) continue;
                if (player.checkCollision(asteroid)) {
                    // Handle player-asteroid collision
                    let collisionDamage = Math.floor(player.vel.mag());
                    console.log(`Player hit asteroid! Damage: ${collisionDamage}`);
                    player.takeDamage(collisionDamage);
                    asteroid.takeDamage(20); // Fixed damage to asteroid
                    
                    // Apply physics push
                    let pushVector = p5.Vector.sub(asteroid.pos, player.pos).normalize().mult(3);
                    player.vel.sub(pushVector);
                    asteroid.vel.add(pushVector.mult(0.5)); // Asteroids move less
                }
            }
            
            // Enemy vs Asteroid collisions (optional)
            for (let enemy of this.enemies) {
                if (enemy.isDestroyed()) continue;
                for (let asteroid of this.asteroids) {
                    if (asteroid.isDestroyed()) continue;
                    if (enemy.checkCollision(asteroid)) {
                        // Handle enemy-asteroid collision
                        enemy.takeDamage(10);
                        asteroid.takeDamage(10);
                        
                        // Apply physics push
                        let pushVector = p5.Vector.sub(asteroid.pos, enemy.pos).normalize().mult(2);
                        enemy.vel.sub(pushVector);
                        asteroid.vel.add(pushVector.mult(0.5));
                    }
                }
            }
            
            
        } catch(e) {
            console.error("Error in checkCollisions:", e);
        }
    } // End checkCollisions

    /** Specifically handles projectile collisions with targets. */
    checkProjectileCollisions(player) {
        // Loop backwards over projectiles so removals don't skip elements
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            let proj = this.projectiles[i];
            if (!proj) {
                this.projectiles.splice(i, 1);
                continue;
            }
            
            // Store attacker reference explicitly for clarity
            const attacker = proj.owner || null;
            let hitDetected = false;
            
            // Check collision against the player if the shooter is not the player
            if (player && attacker !== player && proj.checkCollision(player)) {
                console.log(`Projectile from ${attacker?.shipTypeName || 'Unknown'} hit player! Damage: ${proj.damage}`);
                player.takeDamage(proj.damage, attacker); // Pass attacker reference
                this.projectiles.splice(i, 1);
                continue; // Projectile is gone, move to the next one
            }
            
            // Check collision against each enemy ship
            for (let enemy of this.enemies) {
                // Do not let a ship be hit by its own projectile
                if (attacker === enemy) continue;
                if (enemy.isDestroyed()) continue;

                if (proj.checkCollision(enemy)) {
                    // Log collision with attacker information
                    const attackerName = attacker ? 
                        (attacker === player ? 'Player' : attacker.shipTypeName) : 
                        'Unknown';
                        
                    console.log(`Projectile from ${attackerName} hit ${enemy.shipTypeName}! Damage: ${proj.damage}`);
                    
                    // CRITICAL: Always pass attacker reference to properly track who's attacking
                    enemy.takeDamage(proj.damage, attacker);
                    
                    // Log special case of police attacking pirates
                    if (attacker?.role === AI_ROLE.POLICE && enemy.role === AI_ROLE.PIRATE) {
                        console.log(`Police ${attackerName} attacking Pirate ${enemy.shipTypeName}`);
                    }
                    
                    this.projectiles.splice(i, 1);
                    hitDetected = true;
                    break;
                }
            }
            
            if (hitDetected) continue;
            
            // Check collision against asteroids (no attacker attribution needed)
            for (let asteroid of this.asteroids) {
                if (asteroid.isDestroyed()) continue;
                
                if (proj.checkCollision(asteroid)) {
                    console.log(`Projectile hit asteroid! Damage: ${proj.damage}`);
                    asteroid.takeDamage(proj.damage);
                    this.projectiles.splice(i, 1);
                    hitDetected = true;
                    break;
                }
            }
            
            if (hitDetected) continue;
            
            // Remove expired projectiles
            if (proj.lifespan <= 0 || proj.isOffScreen()) {
                this.projectiles.splice(i, 1);
            }
        }
    } // End checkProjectileCollisions

    /** Adds a projectile to the system's list. */
    addProjectile(proj) {
        if (proj) {
            //console.log("Adding projectile", proj);
            this.projectiles.push(proj);
        }
    }

    /** Adds a beam to the system's list. */
    addBeam(beam) { if (beam) this.beams.push(beam); }

    /** Adds a force wave to the system's list. */
    addForceWave(wave) { if (wave) this.forceWaves.push(wave); }

    /** Adds a cargo item to the system's cargo array */
    addCargo(cargo) {
        // Ensure cargo array exists
        if (!this.cargo) this.cargo = [];
        
        if (cargo) {
            this.cargo.push(cargo);
            //console.log(`Cargo added: ${cargo.type}`);
            uiManager.addMessage(`Cargo picked up: ${cargo.type}`);
        }
    }

    /** Draws background stars. Assumes called within translated space. */
    drawBackground() {
        if (!this.bgStars) return; fill(255); noStroke();
        this.bgStars.forEach(s => ellipse(s.x, s.y, s.size, s.size));
    }

    /** Draws all system contents. */
    draw(playerRef) {
        if (!playerRef || !playerRef.pos) return;
        
        push();
        let tx = width / 2 - playerRef.pos.x;
        let ty = height / 2 - playerRef.pos.y;
        translate(tx, ty);
        
        // Draw background, station, etc.
        this.drawBackground();
        if (this.station) this.station.draw();
        
        // Determine sun position using the first planet if it exists.
        let sunPos = this.planets.length > 0 ? this.planets[0].pos : createVector(0,0);
        
        // Draw each planet passing the sunPos.
        this.planets.forEach(p => p.draw(sunPos));
        
        this.asteroids.forEach(a => a.draw());
        
        // Add these debug logs to track cargo
        //console.log(`Drawing ${this.cargo?.length || 0} cargo items`);
        
        // IMPORTANT: Draw cargo objects BEFORE enemies and player
        // Make sure cargo array exists before attempting to iterate
        if (this.cargo && this.cargo.length > 0) {
            this.cargo.forEach(cargo => {
                if (cargo && typeof cargo.draw === 'function') {
                    cargo.draw();
                }
            });
        }
        
        this.enemies.forEach(e => e.draw());
        this.projectiles.forEach(proj => proj.draw());
        this.drawBeams && this.drawBeams();
        this.drawForceWaves && this.drawForceWaves();
        this.explosions.forEach(exp => exp.draw());
        
        playerRef.draw();
        pop();
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
            actualEconomy: this.actualEconomy, // <-- Add this line
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
            data.actualEconomy || data.economyType, // <-- Use actualEconomy if present, fallback to economyType
            data.galaxyPos.x,
            data.galaxyPos.y,
            data.systemIndex,
            data.techLevel,
            data.securityLevel
        );
        sys.visited = data.visited;
        sys.economyType = data.economyType;
        sys.actualEconomy = data.actualEconomy || data.economyType; // <-- Ensure it's set
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

} // End of StarSystem Class
