class StarSystem {
    constructor(name, economyType, galaxyX, galaxyY) {
        this.name = name;
        this.economyType = economyType;
        this.galaxyPos = createVector(galaxyX, galaxyY); // Position on the galaxy map
        this.visited = false;

        // System contents - Positions relative to system center (0,0) for simplicity now
        // In a real game, these would orbit or be placed more dynamically
        this.station = new Station(width * 0.3, height * 0.3, economyType); // Example position
        this.starColor = color(random(200, 255), random(150, 255), random(50, 150));
        this.starSize = random(50, 150);

        this.enemies = [];
        this.projectiles = [];

        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = 5000; // Spawn an enemy every 5 seconds (adjust)
        this.maxEnemies = 3; // Max enemies in system at once for MVP

         // Pre-generate some background stars for parallax/depth
        this.bgStars = [];
        for(let i = 0; i < 100; i++) {
            this.bgStars.push({
                x: random(width),
                y: random(height),
                size: random(1, 3)
            });
        }
    }

    // Called when player enters the system
    enterSystem() {
        this.visited = true;
        this.enemies = []; // Clear old enemies
        this.projectiles = []; // Clear old projectiles
        this.enemySpawnTimer = 0; // Reset spawner
        // Potentially spawn initial set of enemies
        this.trySpawnEnemy();
        console.log(`Entered system: ${this.name}`);
    }

    trySpawnEnemy() {
        if (this.enemies.length < this.maxEnemies) {
             // Spawn away from the center/station and player
             let spawnPos = createVector(random(width), random(height));
             while(dist(spawnPos.x, spawnPos.y, this.station.pos.x, this.station.pos.y) < 200 ||
                   (player && dist(spawnPos.x, spawnPos.y, player.pos.x, player.pos.y) < 200) ) {
                 spawnPos = createVector(random(width), random(height));
             }
            this.enemies.push(new Enemy(spawnPos.x, spawnPos.y, player)); // Pass player reference
        }
    }

    update() {
        // Update Enemies
        for (let i = this.enemies.length - 1; i >= 0; i--) {
            this.enemies[i].update(this); // Pass system reference for adding projectiles
            if (this.enemies[i].isDestroyed()) {
                // Potential reward drop location: this.enemies[i].pos
                 player.addCredits(25); // Simple credit reward for MVP
                this.enemies.splice(i, 1);
            }
        }

        // Update Projectiles
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            this.projectiles[i].update();
            if (this.projectiles[i].isOffScreen() || this.projectiles[i].lifespan <= 0) {
                this.projectiles.splice(i, 1);
            }
        }

        // Collision Detection
        this.checkCollisions();

         // Enemy Spawning
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.trySpawnEnemy();
            this.enemySpawnTimer = 0; // Reset timer
        }
    }

     checkCollisions() {
        // Projectiles vs Player
        for (let i = this.projectiles.length - 1; i >= 0; i--) {
            const p = this.projectiles[i];
            if (p.owner === 'ENEMY' && p.checkCollision(player)) {
                player.takeDamage(p.damage);
                this.projectiles.splice(i, 1); // Remove projectile on hit
                continue; // Skip other checks for this projectile
            }

            // Projectiles vs Enemies
            if (p.owner === 'PLAYER') {
                for (let j = this.enemies.length - 1; j >= 0; j--) {
                     const e = this.enemies[j];
                     if (p.checkCollision(e)) {
                         e.takeDamage(p.damage);
                         this.projectiles.splice(i, 1); // Remove projectile
                         break; // Projectile hit one enemy, stop checking enemies for this projectile
                     }
                }
            }
        }
         // Add Player vs Enemy collision later if desired (ramming)
    }


    addProjectile(proj) {
        this.projectiles.push(proj);
    }

    // Only draws background elements
    drawBackground() {
         // Simple starfield
        fill(255);
        noStroke();
        for(const star of this.bgStars) {
            ellipse(star.x, star.y, star.size, star.size);
        }

        // Draw central star (visual only)
        fill(this.starColor);
        ellipse(width / 2, height / 2, this.starSize, this.starSize); // Center placement is arbitrary
    }

    draw() {
        this.drawBackground();

        // Draw Station
        this.station.draw();

        // Draw Enemies
        this.enemies.forEach(e => e.draw());

        // Draw Projectiles
        this.projectiles.forEach(p => p.draw());
    }

    getSaveData() {
        return { visited: this.visited };
    }

    loadSaveData(data) {
        if (data && typeof data.visited !== 'undefined') {
            this.visited = data.visited;
        }
    }
}