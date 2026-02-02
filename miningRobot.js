// ****** miningRobot.js ******

/**
 * Mining Robot - Small autonomous vehicles that mine surface resources near player bases
 * These robots patrol around surface bases, find mineable rocks, extract resources, and return them
 */

// Robot states
const ROBOT_STATE = {
    IDLE: 'idle',
    SEEKING: 'seeking',
    MOVING_TO_RESOURCE: 'moving_to_resource',
    MINING: 'mining',
    RETURNING: 'returning'
};

class MiningRobot {
    /**
     * Creates a mining robot for surface operations
     * @param {number} x - X position (world coordinates)
     * @param {number} y - Y position (world coordinates)
     * @param {Object} homeBase - The surface base this robot belongs to (OffworldBuilding)
     */
    constructor(x, y, homeBase) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.angle = random(TWO_PI);
        this.size = 12; // Small size
        this.homeBase = homeBase;
        this.yOffset = 0; // Terrain height (set by surface mode)
        
        // Movement properties
        this.maxSpeed = 80; // Surface units per second
        this.acceleration = 40;
        this.rotationSpeed = 0.04;
        this.arrivalRadius = 30; // How close to get to target
        
        // State machine
        this.state = ROBOT_STATE.IDLE;
        this.stateTimer = 0;
        this.targetResource = null;
        this.targetPos = null;
        
        // Mining properties
        this.miningTime = 0;
        this.miningDuration = 3.0; // 3 seconds of mining
        this.cargoCapacity = 10;
        this.cargo = 0; // Current cargo count (minerals)
        this.miningRange = 500; // How far from base to look for resources
        
        // Visual properties
        this.drillRotation = 0;
        this.drillSpeed = 0;
        this.lightTimer = random(TWO_PI);
        
        // Patrol properties
        this.patrolRadius = 400; // Stay within this radius of base
        this.idleWaitTime = 0;
        this.maxIdleTime = 2.0; // Wait 2 seconds before seeking
    }
    
    /**
     * Updates the robot's behavior and movement
     * @param {Array} mineableRocks - List of mineable rocks in the area
     * @param {number} dt - Time elapsed since last frame (seconds)
     * @param {Object} surfaceMode - Reference to surface mode for terrain queries
     */
    update(mineableRocks, dt, surfaceMode) {
        this.stateTimer += dt;
        this.lightTimer += 0.05;
        
        // Update terrain height
        if (surfaceMode && typeof surfaceMode._getTerrainHeightAt === 'function') {
            this.yOffset = surfaceMode._getTerrainHeightAt(this.pos.x, this.pos.y);
        }
        
        // Update state machine
        switch (this.state) {
            case ROBOT_STATE.IDLE:
                this.updateIdle(dt);
                break;
            case ROBOT_STATE.SEEKING:
                this.updateSeeking(mineableRocks);
                break;
            case ROBOT_STATE.MOVING_TO_RESOURCE:
                this.updateMovingToResource(dt);
                break;
            case ROBOT_STATE.MINING:
                this.updateMining(dt);
                break;
            case ROBOT_STATE.RETURNING:
                this.updateReturning(dt);
                break;
        }
        
        // Apply physics
        const moveX = this.vel.x * dt;
        const moveY = this.vel.y * dt;
        this.pos.x += moveX;
        this.pos.y += moveY;
        
        // Slow drill when not mining
        if (this.state !== ROBOT_STATE.MINING) {
            this.drillSpeed *= 0.95;
        }
        this.drillRotation += this.drillSpeed;
    }
    
    /**
     * Idle state - wait then start seeking
     * @param {number} dt - Delta time in seconds
     */
    updateIdle(dt) {
        this.vel.mult(0.95); // Slow down
        this.idleWaitTime += dt;
        
        if (this.idleWaitTime >= this.maxIdleTime) {
            this.state = ROBOT_STATE.SEEKING;
            this.idleWaitTime = 0;
        }
    }
    
    /**
     * Seeking state - look for nearby mineable rocks
     * @param {Array} mineableRocks - List of rocks to search
     */
    updateSeeking(mineableRocks) {
        // Find nearest rock within range
        let closestRock = null;
        let closestDist = this.miningRange;
        
        for (const rock of mineableRocks) {
            if (!rock || rock.destroyed || rock.depleted) continue;
            
            const dist = p5.Vector.dist(this.pos, rock.pos);
            
            // Check if rock is within patrol range of base
            const distFromBase = p5.Vector.dist(rock.pos, this.homeBase.pos);
            if (distFromBase > this.patrolRadius) continue;
            
            if (dist < closestDist) {
                closestDist = dist;
                closestRock = rock;
            }
        }
        
        if (closestRock && this.cargo < this.cargoCapacity) {
            this.targetResource = closestRock;
            this.state = ROBOT_STATE.MOVING_TO_RESOURCE;
        } else if (this.cargo > 0) {
            // Return to base if we have cargo
            this.state = ROBOT_STATE.RETURNING;
        } else {
            // No rocks found, idle for a bit
            this.state = ROBOT_STATE.IDLE;
        }
    }
    
    /**
     * Moving to resource state
     * @param {number} dt - Delta time in seconds
     */
    updateMovingToResource(dt) {
        // Check if target still valid
        if (!this.targetResource || this.targetResource.destroyed || this.targetResource.depleted) {
            this.targetResource = null;
            this.state = ROBOT_STATE.SEEKING;
            return;
        }
        
        // Move towards resource
        const target = this.targetResource.pos;
        this.moveTowards(target, dt);
        
        // Check if arrived
        const dist = p5.Vector.dist(this.pos, target);
        if (dist < this.arrivalRadius) {
            this.state = ROBOT_STATE.MINING;
            this.miningTime = 0;
            this.vel.mult(0.5); // Slow down
        }
    }
    
    /**
     * Mining state - extract resources from rock
     * @param {number} dt - Delta time in seconds
     */
    updateMining(dt) {
        // Check if target still valid
        if (!this.targetResource || this.targetResource.destroyed || this.targetResource.depleted) {
            this.targetResource = null;
            this.state = ROBOT_STATE.SEEKING;
            return;
        }
        
        this.vel.mult(0.9); // Stay mostly still
        this.miningTime += dt;
        this.drillSpeed = 0.3; // Spin the drill
        
        // Face the resource
        const target = this.targetResource.pos;
        const desired = p5.Vector.sub(target, this.pos);
        const targetAngle = desired.heading();
        this.angle = this.lerpAngle(this.angle, targetAngle, 0.1);
        
        // Mining complete
        if (this.miningTime >= this.miningDuration) {
            // Extract minerals from rock
            if (this.targetResource.resourceAmount > 0) {
                const extracted = Math.min(3, this.targetResource.resourceAmount);
                this.targetResource.resourceAmount -= extracted;
                
                // Check if resource is depleted
                if (this.targetResource.resourceAmount <= 0) {
                    this.targetResource.depleted = true;
                }
                
                // Add to cargo
                this.cargo = Math.min(this.cargoCapacity, this.cargo + extracted);
            }
            
            this.targetResource = null;
            
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
     * @param {number} dt - Delta time in seconds
     */
    updateReturning(dt) {
        // Move towards base
        const target = this.homeBase.pos;
        this.moveTowards(target, dt);
        
        // Check if arrived at base
        const dist = p5.Vector.dist(this.pos, target);
        if (dist < this.homeBase.size) {
            // Deposit cargo
            this.depositCargo();
            this.cargo = 0;
            this.state = ROBOT_STATE.IDLE;
        }
    }
    
    /**
     * Move towards a target position
     * @param {p5.Vector} target - Target position
     * @param {number} dt - Delta time in seconds
     */
    moveTowards(target, dt) {
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
        steer.limit(this.acceleration * dt);
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
        if (!this.homeBase || this.cargo <= 0) return;
        
        // Get or initialize storage on home base
        if (!this.homeBase.miningStorage) {
            this.homeBase.miningStorage = [];
        }
        if (!this.homeBase.miningStorageCapacity) {
            this.homeBase.miningStorageCapacity = 100;
        }
        
        // Add minerals to base storage
        const mineralsToAdd = this.cargo;
        
        const existingMinerals = this.homeBase.miningStorage.find(item => item.name === 'Minerals');
        const currentAmount = existingMinerals ? existingMinerals.quantity : 0;
        const availableSpace = this.homeBase.miningStorageCapacity - currentAmount;
        const actuallyAdded = Math.min(mineralsToAdd, availableSpace);
        
        if (actuallyAdded > 0) {
            if (existingMinerals) {
                existingMinerals.quantity += actuallyAdded;
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
     * Renders the mining robot on the surface using 3D primitives
     * @param {Object} surfaceMode - Reference to surface mode for projection
     */
    draw(surfaceMode) {
        if (!surfaceMode) return;
        
        // Use surface projection helpers
        const alt = this.yOffset + 5; // Slightly above terrain
        const { extrusionAngle, baseX, baseY } = 
            typeof getProjectionHelpers === 'function' 
            ? getProjectionHelpers(this.pos.x, this.pos.y, alt)
            : { extrusionAngle: 0.5, baseX: this.pos.x, baseY: this.pos.y };
        
        const sunAngle = surfaceMode._getSunAngle ? surfaceMode._getSunAngle() : -Math.PI / 4;
        
        push();
        translate(baseX, baseY);
        rotate(this.angle);
        
        const s = this.size;
        
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
            const cargoBoxes = Math.min(3, Math.ceil(this.cargo / 4));
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
            case ROBOT_STATE.MOVING_TO_RESOURCE:
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

/**
 * MineableRock - Surface rocks that can be mined for resources
 */
class MineableRock {
    constructor(x, y, size = 20, seed = 0) {
        this.pos = createVector(x, y);
        this.size = size;
        this.seed = seed;
        this.yOffset = 0; // Terrain height
        this.resourceAmount = Math.floor(random(10, 30)); // Amount of minerals
        this.depleted = false;
        this.destroyed = false;
        this.color = color(120 + random(-20, 20), 100 + random(-20, 20), 80 + random(-20, 20));
    }
    
    /**
     * Draw the mineable rock
     * @param {Object} surfaceMode - Reference to surface mode for projection
     */
    draw(surfaceMode) {
        if (!surfaceMode || this.destroyed || this.depleted) return;
        
        const alt = this.yOffset;
        const { extrusionAngle, baseX, baseY} = 
            typeof getProjectionHelpers === 'function' 
            ? getProjectionHelpers(this.pos.x, this.pos.y, alt)
            : { extrusionAngle: 0.5, baseX: this.pos.x, baseY: this.pos.y };
        
        const sunAngle = surfaceMode._getSunAngle ? surfaceMode._getSunAngle() : -Math.PI / 4;
        
        push();
        translate(baseX, baseY);
        
        // Draw as irregular rock
        const s = this.size;
        const h = s * 0.6;
        
        // Main rock body
        Draw3D.drawBox3D(0, 0, s, s * 0.8, h, this.color, extrusionAngle, sunAngle);
        
        // Additional irregular chunks
        Draw3D.drawBox3D(s * 0.2, s * 0.2, s * 0.5, s * 0.5, h * 0.7, this.color, extrusionAngle, sunAngle);
        Draw3D.drawBox3D(-s * 0.2, -s * 0.1, s * 0.4, s * 0.6, h * 0.5, this.color, extrusionAngle, sunAngle);
        
        // Mineral vein indicator (if rich in resources)
        if (this.resourceAmount > 20) {
            const veinColor = color(180, 160, 100, 180);
            Draw3D.drawBox3D(s * 0.1, 0, s * 0.2, s * 0.3, h * 0.8, veinColor, extrusionAngle, sunAngle);
        }
        
        pop();
    }
}
