// ****** asteroidField.js ******

class AsteroidField {
    constructor(x, y, radius, density = 1.0, type = 'normal') {
        this.center = createVector(x, y);
        this.radius = radius;
        this.density = constrain(density, 0.2, 2.0);
        this.type = type;
        
        // Asteroid storage
        this.asteroidData = [];  // Data for all asteroids
        this.activeAsteroids = []; // Currently instantiated asteroids
        
        // Field settings based on type
        this.settings = this.getFieldSettings();
        
        // Constants
        this.ACTIVATION_DISTANCE = 1500; // Distance from player to activate asteroids
        this.MAX_ACTIVE_ASTEROIDS = 40;  // Performance limit
        
        // Generate the asteroid field data
        this.generateFieldData();
    }
    
    getFieldSettings() {
        // Different settings for different asteroid field types
        switch(this.type) {
            case 'metal':
                return {
                    minSize: 50,
                    maxSize: 110,
                    color: color(180, 180, 200), // Metallic
                    resourceValue: 2.0,          // Higher value
                    damageModifier: 1.2          // More damage on collision
                };
            case 'ice':
                return {
                    minSize: 40,
                    maxSize: 120,
                    color: color(200, 220, 255), // Blue-white
                    resourceValue: 0.7,          // Lower value
                    damageModifier: 0.7          // Less damage on collision
                };
            case 'mineral':
                return {
                    minSize: 30,
                    maxSize: 90,
                    color: color(180, 120, 100), // Reddish-brown
                    resourceValue: 3.0,          // High value
                    damageModifier: 1.0          // Normal damage
                };
            default: // normal
                return {
                    minSize: 40,
                    maxSize: 90,
                    color: color(130, 130, 130), // Gray
                    resourceValue: 1.0,          // Standard value
                    damageModifier: 1.0          // Standard damage
                };
        }
    }
    
    generateFieldData() {
        // Calculate how many asteroids based on density and size
        const baseCount = this.radius / 50; // One asteroid per 50 units of radius
        const totalAsteroids = Math.floor(baseCount * this.density * random(0.8, 1.2));
        
        // Clear existing data
        this.asteroidData = [];
        
        // Generate asteroid data (not actual instances)
        for (let i = 0; i < totalAsteroids; i++) {
            // Position within field (using various patterns)
            let pos;
            
            if (random() < 0.7) {
                // Clustered distribution
                const angle = random(TWO_PI);
                const clusterRadius = random() * this.radius;
                pos = createVector(
                    this.center.x + cos(angle) * clusterRadius,
                    this.center.y + sin(angle) * clusterRadius
                );
            } else {
                // Ring distribution
                const angle = random(TWO_PI);
                const ringWidth = this.radius * 0.2;
                const ringRadius = this.radius - ringWidth/2 + random(-ringWidth/2, ringWidth/2);
                pos = createVector(
                    this.center.x + cos(angle) * ringRadius,
                    this.center.y + sin(angle) * ringRadius
                );
            }
            
            // Generate asteroid data object
            this.asteroidData.push({
                pos: pos,
                angle: random(TWO_PI),
                rotationSpeed: random(-0.02, 0.02),
                size: random(this.settings.minSize, this.settings.maxSize),
                initialVelocity: p5.Vector.random2D().mult(random(0.05, 0.3)),
                active: false,
                id: i
            });
        }
    }
    
    update(playerPos) {
        // Manage which asteroids are active based on player's position
        this.updateActiveAsteroids(playerPos);
        
        // Update active asteroids
        for (let asteroid of this.activeAsteroids) {
            if (asteroid.update) {
                asteroid.update();
            }
        }
    }
    
    updateActiveAsteroids(playerPos) {
        if (!playerPos) return;
        
        // Deactivate asteroids that are too far from player
        for (let i = this.activeAsteroids.length - 1; i >= 0; i--) {
            const asteroid = this.activeAsteroids[i];
            const data = this.asteroidData.find(a => a.id === asteroid.dataId);
            
            if (!data) continue;
            
            const distToPlayer = dist(data.pos.x, data.pos.y, playerPos.x, playerPos.y);
            
            if (distToPlayer > this.ACTIVATION_DISTANCE * 1.2) {
                // Mark as inactive in the data
                data.active = false;
                
                // Remove from active list
                this.activeAsteroids.splice(i, 1);
            }
        }
        
        // Activate new asteroids that are close to player
        if (this.activeAsteroids.length < this.MAX_ACTIVE_ASTEROIDS) {
            // Sort asteroid data by distance to player
            const sortedData = this.asteroidData
                .filter(data => !data.active)
                .map(data => ({
                    data: data,
                    dist: dist(data.pos.x, data.pos.y, playerPos.x, playerPos.y)
                }))
                .sort((a, b) => a.dist - b.dist);
            
            // Activate closest asteroids up to MAX_ACTIVE_ASTEROIDS
            const toActivate = Math.min(
                this.MAX_ACTIVE_ASTEROIDS - this.activeAsteroids.length,
                sortedData.length
            );
            
            for (let i = 0; i < toActivate; i++) {
                if (sortedData[i].dist <= this.ACTIVATION_DISTANCE) {
                    this.activateAsteroid(sortedData[i].data);
                }
            }
        }
    }
    
    activateAsteroid(data) {
        // Create actual asteroid instance
        const asteroid = new Asteroid(data.pos.x, data.pos.y, data.size);
        
        // Apply field-specific properties
        asteroid.color = this.settings.color;
        asteroid.vel = data.initialVelocity.copy();
        asteroid.angle = data.angle;
        asteroid.rotationSpeed = data.rotationSpeed;
        asteroid.resourceValue = this.settings.resourceValue;
        asteroid.damageModifier = this.settings.damageModifier;
        asteroid.fieldType = this.type;
        asteroid.dataId = data.id;
        
        // Mark as active
        data.active = true;
        
        // Add to active asteroids list
        this.activeAsteroids.push(asteroid);
    }
    
    draw(screenBounds) {
        // Draw active asteroids
        for (let asteroid of this.activeAsteroids) {
            if (asteroid.draw && this.isAsteroidInView(asteroid, screenBounds)) {
                asteroid.draw();
            }
        }
        
        // Optionally draw field boundary (for debugging)
        // this.drawBoundary(screenBounds);
    }
    
    drawBoundary(screenBounds) {
        const inView = (
            this.center.x + this.radius >= screenBounds.left &&
            this.center.x - this.radius <= screenBounds.right &&
            this.center.y + this.radius >= screenBounds.top &&
            this.center.y - this.radius <= screenBounds.bottom
        );
        
        if (inView) {
            push();
            noFill();
            stroke(255, 255, 0, 50);
            strokeWeight(2);
            ellipse(this.center.x, this.center.y, this.radius * 2);
            pop();
        }
    }
    
    isAsteroidInView(asteroid, screenBounds) {
        return (
            asteroid.pos.x + asteroid.size >= screenBounds.left &&
            asteroid.pos.x - asteroid.size <= screenBounds.right &&
            asteroid.pos.y + asteroid.size >= screenBounds.top &&
            asteroid.pos.y - asteroid.size <= screenBounds.bottom
        );
    }
    
    // Get all active asteroids (for collision detection, etc)
    getActiveAsteroids() {
        return this.activeAsteroids;
    }
}