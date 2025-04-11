// ****** StarSystem.js ******

class StarSystem {
    /**
     * Creates a Star System instance.
     * @param {string} name - The name of the system.
     * @param {string} economyType - The type of economy (e.g., "Industrial").
     * @param {number} galaxyX - The X coordinate on the main galaxy map.
     * @param {number} galaxyY - The Y coordinate on the main galaxy map.
     * @param {number} systemIndex - The unique index of this system, used for seeding.
     */
    constructor(name, economyType, galaxyX, galaxyY, systemIndex) {
        this.name = name;
        this.economyType = economyType;
        this.galaxyPos = createVector(galaxyX, galaxyY); // Position on the main galaxy map screen
        this.visited = false;
        this.systemIndex = systemIndex; // Store the index, primarily for seeding

        // --- Apply Seed BEFORE Generating Random Elements ---
        console.log(`System ${this.name} (Index ${this.systemIndex}): Setting randomSeed(${this.systemIndex}) for generation.`);
        randomSeed(this.systemIndex); // Use the system's unique index as the seed

        // --- World Elements ---
        // Station is typically placed at the system's world origin (0,0) for reference
        this.station = new Station(0, 0, economyType);
        this.planets = []; // Array to hold Planet objects, populated by createRandomPlanets
        this.asteroids = []; // Array for dynamic Asteroid objects (spawned later)
        this.enemies = []; // Array for dynamic Enemy objects (spawned later)
        this.projectiles = []; // Array for dynamic Projectile objects (spawned later)

        // --- Spawning & Despawning Configuration (Not Seeded - uses runtime random) ---
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 5000; // Time (ms) between potential enemy spawns
        this.maxEnemies = 5; // Max concurrent enemies
        this.asteroidSpawnTimer = 0;
        this.asteroidSpawnInterval = 3000; // Time (ms) between potential asteroid spawns
        this.maxAsteroids = 25; // Max concurrent asteroids
        // Objects beyond this world distance from the player may be despawned
        this.despawnRadius = max(width, height) * 2.0;

        // --- Seeded Visual Background Elements ---
        this.starColor = color(random(200, 255), random(150, 255), random(50, 150)); // Now deterministic per system
        this.starSize = random(50, 150); // Now deterministic per system
        this.bgStars = []; // Array for background star points {x, y, size}
        let worldBounds = this.despawnRadius * 1.5; // Define the area over which background stars are spread
        let numBgStars = floor(random(250, 400)); // Use seeded random for count too
        console.log(`   Generating ${numBgStars} background stars using seeded random...`);
        for (let i = 0; i < numBgStars; i++) { // Create a number of stars
            this.bgStars.push({
                x: random(-worldBounds, worldBounds), // Seeded random position
                y: random(-worldBounds, worldBounds), // Seeded random position
                size: random(1, 3) // Seeded random visual size
            });
        }

        // --- Initialize Planets RANDOMLY (but deterministically based on seed) ---
        this.createRandomPlanets(); // Call the method which uses random() seeded above

        // --- CRITICAL: Reset Seed AFTER Generating Static Elements ---
        console.log(`System ${this.name}: Resetting random seed for dynamic gameplay.`);
        randomSeed(); // Reset to non-deterministic behavior (uses time) for gameplay randomness
        // -------------------------------------------------------------

    } // End constructor

    /**
     * Creates a random number of planets using p5.js random(), which will be
     * deterministic because randomSeed() was called before this method executes in the constructor.
     */
    createRandomPlanets() {
        let numPlanets = floor(random(1, 6)); // Seeded random count (1-5)
        let minPlanetDistFromCenter = 800;
        let maxPlanetDistFromCenter = this.despawnRadius * 0.8;
        let minPlanetSeparation = 400;

        console.log(`   Creating ${numPlanets} planets using seeded random...`);
        this.planets = []; // Ensure planet array is empty before creating

        for (let i = 0; i < numPlanets; i++) {
            let validPosition = false;
            let attemptPos;
            let attempts = 0;
            const maxPlacementAttempts = 50;

            // Try finding a valid position
            while (!validPosition && attempts < maxPlacementAttempts) {
                attempts++;
                let angle = random(TWO_PI); // Seeded random angle
                let distFromCenter = random(minPlanetDistFromCenter, maxPlanetDistFromCenter); // Seeded random distance
                attemptPos = createVector(cos(angle) * distFromCenter, sin(angle) * distFromCenter);

                // Check distance from existing planets
                validPosition = true;
                for (let existingPlanet of this.planets) {
                    if (dist(attemptPos.x, attemptPos.y, existingPlanet.pos.x, existingPlanet.pos.y) < minPlanetSeparation) {
                        validPosition = false; break;
                    }
                }
            }

            // If a valid position was found
            if (validPosition) {
                let size = random(60, 150); // Seeded random size
                let c1 = color(random(50, 200), random(50, 200), random(50, 200)); // Seeded random color 1
                let c2 = color(random(50, 200), random(50, 200), random(50, 200)); // Seeded random color 2
                this.planets.push(new Planet(attemptPos.x, attemptPos.y, size, c1, c2));
                // console.log(`      -> Created planet ${i + 1} at (${attemptPos.x.toFixed(0)}, ${attemptPos.y.toFixed(0)})`); // Optional log
            } else {
                 console.log(`      -> Failed to find valid position for planet ${i + 1}.`);
            }
        } // End for loop creating planets
    } // --- End createRandomPlanets ---


    /**
     * Called when the player enters this star system (e.g., after a jump).
     * Resets dynamic objects (enemies, asteroids, projectiles) and timers.
     * Does NOT regenerate static seeded elements (planets, bgStars).
     * Uses the normal (non-seeded) random for initial spawns.
     * @param {Player} player - Reference to the player object for spawning relative positions.
     */
    enterSystem(player) {
        this.visited = true; // Mark system as visited

        // Clear dynamic objects ONLY
        this.enemies = [];
        this.projectiles = [];
        this.asteroids = [];

        // Reset dynamic timers
        this.enemySpawnTimer = 0;
        this.asteroidSpawnTimer = 0;

        // Initial spawns (using non-seeded random)
        if (player) {
            for (let i = 0; i < 2; i++) this.trySpawnEnemy(player);
            for (let i = 0; i < 8; i++) this.trySpawnAsteroid(player);
        } else {
             console.warn("enterSystem: Player object not available for initial spawn.");
        }
        console.log(`Entered system: ${this.name} (Dynamic elements reset)`);
    }

    /**
     * Attempts to spawn an enemy off-screen relative to the player. Uses non-seeded random.
     * @param {Player} player - Reference to the player object.
     */
    trySpawnEnemy(player) {
        if (!player || !player.pos || this.enemies.length >= this.maxEnemies) return;
        let angle = random(TWO_PI); // Non-seeded random
        let spawnDist = sqrt(sq(width / 2) + sq(height / 2)) + random(100, 300); // Non-seeded random
        let spawnX = player.pos.x + cos(angle) * spawnDist;
        let spawnY = player.pos.y + sin(angle) * spawnDist;
        this.enemies.push(new Enemy(spawnX, spawnY, player));
    }

    /**
     * Attempts to spawn an asteroid off-screen relative to the player. Uses non-seeded random.
     * @param {Player} player - Reference to the player object.
     */
    trySpawnAsteroid(player) {
        if (!player || !player.pos || this.asteroids.length >= this.maxAsteroids) return;
        let angle = random(TWO_PI); // Non-seeded random
        let spawnDist = sqrt(sq(width / 2) + sq(height / 2)) + random(150, 400); // Non-seeded random
        let spawnX = player.pos.x + cos(angle) * spawnDist;
        let spawnY = player.pos.y + sin(angle) * spawnDist;
        let size = random(20, 60); // Non-seeded random
        this.asteroids.push(new Asteroid(spawnX, spawnY, size));
    }

    /**
     * Updates dynamic objects, handles spawning/despawning, and checks collisions.
     * @param {Player} player - Reference to the player object.
     */
    update(player) {
        if (!player) { console.warn("StarSystem update skipped: Player missing."); return; }

        // --- Update & Despawn Enemies ---
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i]; if (!enemy) { this.enemies.splice(i, 1); continue; }
            enemy.update(this);
            if (enemy.isDestroyed()) {
                let creditsBefore = player.credits; // Log credit gain
                player.addCredits(25);
                console.log(`Enemy Kill: Credits ${creditsBefore} -> ${player.credits}`);
                this.enemies.splice(i, 1); continue;
            }
            let distToPlayerE = dist(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y);
            if (distToPlayerE > this.despawnRadius) this.enemies.splice(i, 1);
        }

        // --- Update & Despawn Asteroids ---
        for (let i = this.asteroids.length - 1; i >= 0; i--) {
             const asteroid = this.asteroids[i]; if (!asteroid) { this.asteroids.splice(i, 1); continue; }
             asteroid.update();
             if (asteroid.isDestroyed()) {
                 let reward = floor(asteroid.size / 4);
                 player.addCredits(reward);
                 console.log(`Asteroid Destroyed: +${reward} credits`);
                 this.asteroids.splice(i, 1); continue;
             }
             let distToPlayerA = dist(asteroid.pos.x, asteroid.pos.y, player.pos.x, player.pos.y);
             if (distToPlayerA > this.despawnRadius * 1.2) this.asteroids.splice(i, 1);
        }

        // --- Update & Despawn Projectiles ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
             const proj = this.projectiles[i]; if (!proj) { this.projectiles.splice(i, 1); continue; }
             proj.update();
             let distToPlayerP = dist(proj.pos.x, proj.pos.y, player.pos.x, player.pos.y);
             if (proj.lifespan <= 0 || distToPlayerP > this.despawnRadius) this.projectiles.splice(i, 1);
        }

        // --- Collision Detection ---
        this.checkCollisions(player);

        // --- Spawning Timers (using non-seeded random internally) ---
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) { this.trySpawnEnemy(player); this.enemySpawnTimer = 0; }
        this.asteroidSpawnTimer += deltaTime;
        if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval) { this.trySpawnAsteroid(player); this.asteroidSpawnTimer = 0; }
    }

    /**
     * Checks for collisions between projectiles, ships, and asteroids.
     * @param {Player} player - Reference to the player object.
     */
    checkCollisions(player) {
        if (!player) return;

        // --- Projectiles vs Ships & Asteroids ---
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i]; if (!p) continue;
            let projectileRemoved = false;
            // Vs Player
            if (p.owner === 'ENEMY' && p.checkCollision(player)) { player.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; }
            if (projectileRemoved) continue;
            // Vs Enemies (Player shots)
            if (p.owner === 'PLAYER') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                     const e = this.enemies[j]; if (!e) continue;
                     if (p.checkCollision(e)) { e.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; break; }
                }
            }
            if (projectileRemoved) continue;
            // Vs Asteroids (All shots)
            for (let j = this.asteroids.length - 1; j >= 0; j--) {
                 const a = this.asteroids[j]; if (!a) continue;
                 if (p.checkCollision(a)) { a.takeDamage(p.damage); this.projectiles.splice(i, 1); projectileRemoved = true; break; }
            }
        } // End projectile loop

        // --- Player vs Asteroids (Ramming) ---
         for (let i = this.asteroids.length - 1; i >= 0; i--) {
              const a = this.asteroids[i]; if (!a || a.isDestroyed()) continue;
              let d = dist(player.pos.x, player.pos.y, a.pos.x, a.pos.y);
              let collided = d < (player.size / 2) + (a.size / 2);
              if (collided) {
                  console.log("Player collided with asteroid!");
                  let ramDamage = 10 + floor(a.size / 4);
                  player.takeDamage(ramDamage);
                  a.takeDamage(ramDamage * 2);
              }
         }
    } // End checkCollisions

    // Adds a projectile to the system's list
    addProjectile(proj) { if (proj) this.projectiles.push(proj); }

    // Draws the scrolling background star points
    drawBackground() {
        fill(255); noStroke();
        for (const star of this.bgStars) ellipse(star.x, star.y, star.size, star.size);
    }

    /**
     * Draws the entire system view, translated to center on the player.
     * @param {Player} player - Reference to the player object for centering.
     */
    draw(player) {
        if (!player) return;
        push();
        let translateX = width / 2 - player.pos.x; let translateY = height / 2 - player.pos.y;
        translate(translateX, translateY);
        // Draw World Elements
        this.drawBackground();
        if (this.station) this.station.draw();
        this.planets.forEach(p => p.draw());
        this.asteroids.forEach(a => a.draw());
        this.enemies.forEach(e => e.draw());
        this.projectiles.forEach(p => p.draw());
        player.draw(); // Player draws itself last in world space
        pop();
    }

    // --- Save/Load System State (Minimal: visited status) ---
    getSaveData() { return { visited: this.visited }; }
    loadSaveData(data) { if (data && typeof data.visited !== 'undefined') this.visited = data.visited; }

} // End of StarSystem Class