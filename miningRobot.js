// ****** miningRobot.js ******

/**
 * Mining Robot - Small autonomous vehicles that mine asteroids near secret bases
 * These robots patrol around the base, find asteroids, mine them, and return resources
 */

// Robot states
const ROBOT_STATE = {
    IDLE: 'idle',
    SEEKING: 'seeking',
    MOVING_TO_ASTEROID: 'moving_to_asteroid',
    MINING: 'mining',
    RETURNING: 'returning'
};

class MiningRobot {
    /**
     * Creates a mining robot
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {Station} homeBase - The station this robot belongs to
     */
    constructor(x, y, homeBase) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.angle = random(TWO_PI);
        this.size = 12; // Small size
        this.homeBase = homeBase;
        
        // Movement properties
        this.maxSpeed = 2.5;
        this.acceleration = 0.05;
        this.rotationSpeed = 0.04;
        this.arrivalRadius = 30; // How close to get to target
        
        // State machine
        this.state = ROBOT_STATE.IDLE;
        this.stateTimer = 0;
        this.targetAsteroid = null;
        this.targetPos = null;
        
        // Mining properties
        this.miningTime = 0;
        this.miningDuration = 120; // 2 seconds at 60fps
        this.cargoCapacity = 5;
        this.cargo = 0; // Current cargo count
        this.miningRange = 800; // How far from base to look for asteroids
        
        // Visual properties
        this.drillRotation = 0;
        this.drillSpeed = 0;
        this.lightTimer = random(TWO_PI);
        
        // Patrol properties
        this.patrolRadius = 600; // Stay within this radius of base
        this.idleWaitTime = 0;
        this.maxIdleTime = 60; // Wait 1 second before seeking
    }
    
    /**
     * Updates the robot's behavior and movement
     * @param {Array} asteroids - List of asteroids in the system
     * @param {number} deltaTime - Time elapsed since last frame (ms)
     */
    update(asteroids, deltaTime = 16.67) {
        const dt = deltaTime / 1000; // Convert to seconds
        this.stateTimer++;
        this.lightTimer += 0.05;
        
        // Update state machine
        switch (this.state) {
            case ROBOT_STATE.IDLE:
                this.updateIdle();
                break;
            case ROBOT_STATE.SEEKING:
                this.updateSeeking(asteroids);
                break;
            case ROBOT_STATE.MOVING_TO_ASTEROID:
                this.updateMovingToAsteroid();
                break;
            case ROBOT_STATE.MINING:
                this.updateMining(dt);
                break;
            case ROBOT_STATE.RETURNING:
                this.updateReturning();
                break;
        }
        
        // Apply physics
        this.pos.add(this.vel);
        
        // Slow drill when not mining
        if (this.state !== ROBOT_STATE.MINING) {
            this.drillSpeed *= 0.95;
        }
        this.drillRotation += this.drillSpeed;
    }
    
    /**
     * Idle state - wait then start seeking
     */
    updateIdle() {
        this.vel.mult(0.95); // Slow down
        this.idleWaitTime++;
        
        if (this.idleWaitTime >= this.maxIdleTime) {
            this.state = ROBOT_STATE.SEEKING;
            this.idleWaitTime = 0;
        }
    }
    
    /**
     * Seeking state - look for nearby asteroids
     * @param {Array} asteroids - List of asteroids to search
     */
    updateSeeking(asteroids) {
        // Find nearest asteroid within range
        let closestAsteroid = null;
        let closestDist = this.miningRange;
        
        for (const asteroid of asteroids) {
            if (!asteroid || asteroid.destroyed || asteroid.health <= 0) continue;
            
            const dist = p5.Vector.dist(this.pos, asteroid.pos);
            
            // Check if asteroid is within patrol range of base
            const distFromBase = p5.Vector.dist(asteroid.pos, this.homeBase.pos);
            if (distFromBase > this.patrolRadius) continue;
            
            if (dist < closestDist) {
                closestDist = dist;
                closestAsteroid = asteroid;
            }
        }
        
        if (closestAsteroid && this.cargo < this.cargoCapacity) {
            this.targetAsteroid = closestAsteroid;
            this.state = ROBOT_STATE.MOVING_TO_ASTEROID;
        } else if (this.cargo > 0) {
            // Return to base if we have cargo
            this.state = ROBOT_STATE.RETURNING;
        } else {
            // No asteroids found, idle for a bit
            this.state = ROBOT_STATE.IDLE;
        }
    }
    
    /**
     * Moving to asteroid state
     */
    updateMovingToAsteroid() {
        // Check if target still valid
        if (!this.targetAsteroid || this.targetAsteroid.destroyed || this.targetAsteroid.health <= 0) {
            this.targetAsteroid = null;
            this.state = ROBOT_STATE.SEEKING;
            return;
        }
        
        // Move towards asteroid
        const target = this.targetAsteroid.pos;
        this.moveTowards(target);
        
        // Check if arrived
        const dist = p5.Vector.dist(this.pos, target);
        if (dist < this.arrivalRadius) {
            this.state = ROBOT_STATE.MINING;
            this.miningTime = 0;
            this.vel.mult(0.5); // Slow down
        }
    }
    
    /**
     * Mining state - extract resources from asteroid
     * @param {number} dt - Delta time in seconds
     */
    updateMining(dt) {
        // Check if target still valid
        if (!this.targetAsteroid || this.targetAsteroid.destroyed || this.targetAsteroid.health <= 0) {
            this.targetAsteroid = null;
            this.state = ROBOT_STATE.SEEKING;
            return;
        }
        
        this.vel.mult(0.9); // Stay mostly still
        this.miningTime++;
        this.drillSpeed = 0.3; // Spin the drill
        
        // Face the asteroid
        const target = this.targetAsteroid.pos;
        const desired = p5.Vector.sub(target, this.pos);
        const targetAngle = desired.heading();
        this.angle = this.lerpAngle(this.angle, targetAngle, 0.1);
        
        // Mining complete
        if (this.miningTime >= this.miningDuration) {
            // Extract a small amount from asteroid
            if (this.targetAsteroid.health > 0) {
                const damage = min(10, this.targetAsteroid.health);
                this.targetAsteroid.health -= damage;
                
                // Add to cargo
                const extracted = Math.ceil(damage / 10);
                this.cargo = min(this.cargoCapacity, this.cargo + extracted);
            }
            
            this.targetAsteroid = null;
            
            // Decide next action
            if (this.cargo >= this.cargoCapacity) {
                this.state = ROBOT_STATE.RETURNING;
            } else {
                this.state = ROBOT_STATE.SEEKING;
            }
        }
    }
    
    /**
     * Returning to base state
     */
    updateReturning() {
        // Move towards base
        const target = this.homeBase.pos;
        this.moveTowards(target);
        
        // Check if arrived at base
        const dist = p5.Vector.dist(this.pos, target);
        if (dist < this.homeBase.dockingRadius * 0.5) {
            // Deposit cargo
            this.depositCargo();
            this.cargo = 0;
            this.state = ROBOT_STATE.IDLE;
        }
    }
    
    /**
     * Move towards a target position
     * @param {p5.Vector} target - Target position
     */
    moveTowards(target) {
        const desired = p5.Vector.sub(target, this.pos);
        const dist = desired.mag();
        
        // Calculate desired velocity
        desired.normalize();
        
        // Slow down when approaching
        if (dist < 100) {
            const speed = map(dist, 0, 100, 0, this.maxSpeed);
            desired.mult(speed);
        } else {
            desired.mult(this.maxSpeed);
        }
        
        // Steering = desired - current velocity
        const steer = p5.Vector.sub(desired, this.vel);
        steer.limit(this.acceleration);
        this.vel.add(steer);
        this.vel.limit(this.maxSpeed);
        
        // Face direction of movement
        if (this.vel.mag() > 0.1) {
            const targetAngle = this.vel.heading();
            this.angle = this.lerpAngle(this.angle, targetAngle, 0.1);
        }
    }
    
    /**
     * Deposit mined cargo to base storage
     */
    depositCargo() {
        if (!this.homeBase || !this.homeBase.miningStorage || this.cargo <= 0) return;
        
        // Add minerals to base storage
        const mineralsToAdd = this.cargo;
        
        // Check if storage has capacity
        if (!this.homeBase.miningStorageCapacity) {
            this.homeBase.miningStorageCapacity = 100; // Default capacity
        }
        
        const currentAmount = this.homeBase.miningStorage.find(item => item.name === 'Minerals')?.quantity || 0;
        const availableSpace = this.homeBase.miningStorageCapacity - currentAmount;
        const actuallyAdded = Math.min(mineralsToAdd, availableSpace);
        
        if (actuallyAdded > 0) {
            // Add to storage
            const existingEntry = this.homeBase.miningStorage.find(item => item.name === 'Minerals');
            if (existingEntry) {
                existingEntry.quantity += actuallyAdded;
            } else {
                this.homeBase.miningStorage.push({ name: 'Minerals', quantity: actuallyAdded });
            }
        }
    }
    
    /**
     * Lerp between two angles (handles wraparound)
     * @param {number} from - Starting angle
     * @param {number} to - Target angle
     * @param {number} amount - Interpolation amount (0-1)
     * @returns {number} Interpolated angle
     */
    lerpAngle(from, to, amount) {
        // Normalize angles to 0-2PI range
        from = (from % TWO_PI + TWO_PI) % TWO_PI;
        to = (to % TWO_PI + TWO_PI) % TWO_PI;
        
        // Calculate shortest path
        let diff = to - from;
        if (diff > PI) diff -= TWO_PI;
        if (diff < -PI) diff += TWO_PI;
        
        return from + diff * amount;
    }
    
    /**
     * Renders the mining robot using 3D primitives
     * @param {number} tx - Translation X (for camera offset)
     * @param {number} ty - Translation Y (for camera offset)
     */
    draw(tx, ty) {
        push();
        translate(this.pos.x + tx, this.pos.y + ty);
        rotate(this.angle);
        
        const s = this.size;
        const extrusionAngle = PI / 4; // 45-degree extrusion
        const sunAngle = 0; // Fixed sun angle
        
        // Body colors
        const bodyColor = color(140, 120, 100);
        const darkColor = color(80, 70, 60);
        const accentColor = color(200, 180, 50);
        
        // Main body - rover chassis (rectangular)
        Draw3D.drawBox3D(0, 0, s * 1.4, s * 0.9, s * 0.4, bodyColor, extrusionAngle, sunAngle);
        
        // Cabin/cockpit on top
        Draw3D.drawBox3D(0, -s * 0.15, s * 0.7, s * 0.6, s * 0.5, darkColor, extrusionAngle, sunAngle);
        
        // Window/viewport (glowing)
        const glowAmount = abs(sin(this.lightTimer)) * 0.5 + 0.5;
        const windowColor = color(100, 200, 255, 150 + glowAmount * 100);
        Draw3D.drawBox3D(0, -s * 0.15, s * 0.4, s * 0.3, s * 0.02, windowColor, extrusionAngle, sunAngle);
        
        // Wheels/treads (4 small cylinders)
        const wheelColor = color(50, 50, 50);
        const wheelRadius = s * 0.25;
        const wheelHeight = s * 0.2;
        
        // Front left wheel
        Draw3D.drawCylinder(-s * 0.5, s * 0.4, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);
        // Front right wheel
        Draw3D.drawCylinder(s * 0.5, s * 0.4, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);
        // Back left wheel
        Draw3D.drawCylinder(-s * 0.5, -s * 0.4, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);
        // Back right wheel
        Draw3D.drawCylinder(s * 0.5, -s * 0.4, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);
        
        // Mining drill assembly
        push();
        translate(s * 0.9, 0); // Mount point at front
        
        // Drill mount
        Draw3D.drawBox3D(0, 0, s * 0.3, s * 0.3, s * 0.2, darkColor, extrusionAngle, sunAngle);
        
        // Drill bit (spinning cylinder)
        push();
        rotate(this.drillRotation);
        const drillColor = color(120, 120, 130);
        Draw3D.drawCylinder(s * 0.3, 0, s * 0.15, s * 0.5, 6, drillColor, extrusionAngle, sunAngle);
        
        // Drill tip
        const tipColor = color(80, 80, 90);
        Draw3D.drawCylinder(s * 0.55, 0, s * 0.1, s * 0.1, 6, tipColor, extrusionAngle, sunAngle);
        pop();
        
        pop();
        
        // Status light on top
        const statusColor = this.getStatusColor();
        Draw3D.drawBox3D(0, -s * 0.6, s * 0.15, s * 0.15, s * 0.1, statusColor, extrusionAngle, sunAngle);
        
        // Cargo indicator (small boxes on back if carrying)
        if (this.cargo > 0) {
            const cargoBoxes = Math.min(3, Math.ceil(this.cargo / 2));
            for (let i = 0; i < cargoBoxes; i++) {
                const cargoColor = color(180, 140, 90);
                Draw3D.drawBox3D(-s * 0.6, -s * 0.2 + i * s * 0.2, s * 0.25, s * 0.25, s * 0.25, cargoColor, extrusionAngle, sunAngle);
            }
        }
        
        pop();
    }
    
    /**
     * Get color for status light based on state
     * @returns {p5.Color} Status light color
     */
    getStatusColor() {
        const brightness = abs(sin(this.lightTimer)) * 0.5 + 0.5;
        
        switch (this.state) {
            case ROBOT_STATE.IDLE:
                return color(100, 100, 255, 150 + brightness * 100); // Blue
            case ROBOT_STATE.SEEKING:
                return color(255, 255, 100, 150 + brightness * 100); // Yellow
            case ROBOT_STATE.MOVING_TO_ASTEROID:
                return color(255, 200, 100, 150 + brightness * 100); // Orange
            case ROBOT_STATE.MINING:
                return color(255, 100, 100, 200 + brightness * 50); // Red (active)
            case ROBOT_STATE.RETURNING:
                return color(100, 255, 100, 150 + brightness * 100); // Green
            default:
                return color(150, 150, 150, 150);
        }
    }
}
