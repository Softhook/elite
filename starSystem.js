// ****** StarSystem.js ******

class StarSystem {
    // Galaxy position is for the map screen, not world position within the system
    constructor(name, economyType, galaxyX, galaxyY) {
        this.name = name;
        this.economyType = economyType;
        this.galaxyPos = createVector(galaxyX, galaxyY); // Position on the galaxy map
        this.visited = false;

        // --- World Coordinates ---
        // Place station at a fixed point in the system's world space
        this.station = new Station(0, 0, economyType); // Example: Station at world origin (0,0)
        this.starColor = color(random(200, 255), random(150, 255), random(50, 150));
        this.starSize = random(50, 150); // Visual size only

        this.enemies = [];
        this.projectiles = [];

        // --- Spawning Config ---
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 5000; // ms
        this.maxEnemies = 5;

        // --- Despawn Config ---
        this.despawnRadius = max(width, height) * 2.0; // Example: 2x the largest screen dimension

        // --- Background Stars (World Coords) ---
        this.bgStars = [];
        let worldBounds = this.despawnRadius * 1.5;
        for (let i = 0; i < 300; i++) {
            this.bgStars.push({
                x: random(-worldBounds, worldBounds),
                y: random(-worldBounds, worldBounds),
                size: random(1, 3)
            });
        }
    }

    // Called when player enters the system
    enterSystem() {
        this.visited = true;
        this.enemies = [];
        this.projectiles = [];
        this.enemySpawnTimer = 0;
        if (player) { // Check if player exists before spawning
            this.trySpawnEnemy(player);
            this.trySpawnEnemy(player);
        } else {
            console.warn("enterSystem: Player object not available for initial spawn.");
        }
        console.log(`Entered system: ${this.name}`);
    }

    // Spawns an enemy relative to the player but off-screen
    trySpawnEnemy(player) { // Needs player position
        if (!player || !player.pos || this.enemies.length >= this.maxEnemies) { // Added check for player.pos
            return;
        }
        let angle = random(TWO_PI);
        let spawnDist = sqrt(sq(width / 2) + sq(height / 2)) + 100; // Ensure off-screen
        let spawnX = player.pos.x + cos(angle) * spawnDist;
        let spawnY = player.pos.y + sin(angle) * spawnDist;
        this.enemies.push(new Enemy(spawnX, spawnY, player));
        console.log(`Spawned enemy at (${spawnX.toFixed(0)}, ${spawnY.toFixed(0)})`);
    }

    // Update system objects (enemies, projectiles, spawning, despawning)
    update(player) { // Needs player for various logic
        if (!player) {
             console.warn("StarSystem update skipped: Player reference missing.");
             return;
        }

        // Update Enemies & Check Despawn
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy) { // Safety check for null/undefined entries
                this.enemies.splice(i, 1);
                continue;
            }
            enemy.update(this); // Pass system for firing

            // Check for destruction
            if (enemy.isDestroyed()) {
                console.log(`Enemy at (${enemy.pos.x.toFixed(0)}, ${enemy.pos.y.toFixed(0)}) destroyed.`); // Log destruction
                // --- Add Credit Logic Debug ---
                let creditsBefore = player.credits;
                console.log(`Player credits BEFORE kill: ${creditsBefore}`);
                player.addCredits(25); // Attempt to add kill reward
                console.log(`Called player.addCredits(25). Player credits AFTER call: ${player.credits}`);
                // --- End Credit Logic Debug ---
                this.enemies.splice(i, 1); // Remove destroyed enemy
                continue; // Move to next enemy
            }

            // Check for despawn distance
            let distToPlayer = dist(enemy.pos.x, enemy.pos.y, player.pos.x, player.pos.y);
            if (distToPlayer > this.despawnRadius) {
                // console.log("Despawning enemy (too far)"); // Optional log (can be noisy)
                this.enemies.splice(i, 1);
            }
        }

        // Update Projectiles & Check Despawn
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
             if (!proj) { // Safety check
                this.projectiles.splice(i, 1);
                continue;
            }
            proj.update();

            // Check lifespan or distance for despawn
            let distToPlayerProj = dist(proj.pos.x, proj.pos.y, player.pos.x, player.pos.y);
            if (proj.lifespan <= 0 || distToPlayerProj > this.despawnRadius) {
                this.projectiles.splice(i, 1);
            }
        }

        // Collision Detection
        this.checkCollisions(player); // Pass player ref

        // Enemy Spawning Timer
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.trySpawnEnemy(player); // Pass player ref
            this.enemySpawnTimer = 0; // Reset timer
        }
    }

    // Check collisions between projectiles and ships
    checkCollisions(player) { // Needs player ref
        if (!player) return;

        // Projectiles vs Player & Enemies
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
             if (!p) continue; // Safety check
            let projectileRemoved = false;

            // Check vs Player
            if (p.owner === 'ENEMY' && p.checkCollision(player)) {
                player.takeDamage(p.damage);
                this.projectiles.splice(i, 1);
                projectileRemoved = true;
            }

            // Check vs Enemies (only if projectile still exists)
            if (!projectileRemoved && p.owner === 'PLAYER') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                     const e = this.enemies[j];
                      if (!e) continue; // Safety check
                     if (p.checkCollision(e)) {
                         e.takeDamage(p.damage);
                         this.projectiles.splice(i, 1);
                         // projectileRemoved = true; // Set flag although loop will break
                         break; // Projectile hit one enemy, stop checking enemies for this projectile
                     }
                }
            }
        }
        // Add Player vs Enemy collision (ramming) here if desired
    }

    // Adds a projectile to the system's list
    addProjectile(proj) {
        if (proj) { // Basic check
            this.projectiles.push(proj);
        } else {
            console.warn("Attempted to add invalid projectile to system.");
        }
    }

    // Draws the scrolling background elements (stars)
    drawBackground() {
        // Assumes called AFTER the main translate() in draw()
        fill(255);
        noStroke();
        for (const star of this.bgStars) {
            ellipse(star.x, star.y, star.size, star.size);
        }
    }

    // Draws the entire system view, translated to center on the player
    draw(player) { // Needs player for translation calculation
        if (!player) return;

        // --- Central Translation Logic ---
        push(); // Save current drawing state
        let translateX = width / 2 - player.pos.x;
        let translateY = height / 2 - player.pos.y;
        translate(translateX, translateY); // Apply the translation

        // --- Draw World Elements (affected by translate) ---
        this.drawBackground(); // Draw background stars first

        if (this.station) { // Check if station exists
            this.station.draw();   // Draw the station at its world position
        }

        // Draw Enemies
        this.enemies.forEach(e => e.draw());

        // Draw Projectiles
        this.projectiles.forEach(p => p.draw());

        // Draw Player (player draws itself at its world position)
        player.draw();

        // --- End World Elements ---
        pop(); // Restore original drawing state (removes the translation)
    }

    // --- Save/Load --- (Only needs visited status, world state is dynamic)
    getSaveData() {
        return { visited: this.visited };
    }

    loadSaveData(data) {
        if (data && typeof data.visited !== 'undefined') {
            this.visited = data.visited;
        }
    }
} // End of StarSystem Class