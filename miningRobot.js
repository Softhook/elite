// ****** miningRobot.js ******

/**
 * Mining Robot - Autonomous vehicles that mine surface resources near player bases
 * Robots patrol around bases, mine random locations with ore seams, and return resources
 */

// ===== CONFIGURATION =====
// Easy tuning for mining speed, capacity, and behavior
const MINING_CONFIG = {
    // Robot Movement
    PATROL_RADIUS: 900,           // Maximum distance from base to mine
    MAX_SPEED: 30,                // Units per second (reduced from 80)
    ACCELERATION: 20,             // Acceleration rate (reduced from 40)
    ARRIVAL_RADIUS: 30,           // Distance to consider "arrived"

    // Mining Performance
    MINING_DURATION: 10.0,         // Seconds to mine one location (increased from 2.5)
    CARGO_CAPACITY: 6,           // Maximum minerals per robot
    MINERALS_PER_MINE: 2,         // Minerals extracted per mining cycle

    // Ore Seam System
    ORE_SEAM_INITIAL: 50,         // Starting ore amount at location
    ORE_SEAM_VARIANCE: 20,        // Random variance in ore amount
    ORE_SEAM_REGEN_RATE: 0.1,     // Ore regeneration per second (slow)
    ORE_SEAM_MAX: 80,             // Maximum ore at any location

    // Base Storage
    STORAGE_CAPACITY: 100,        // Base storage capacity

    // Visual
    ROBOT_SIZE: 14,               // Base size for rendering
    DRILL_SPEED: 0.35,            // Drill rotation speed when mining
    LIGHT_BLINK_SPEED: 0.05       // Status light animation speed
};

// Robot states
const ROBOT_STATE = {
    IDLE: 'idle',
    SEEKING: 'seeking',
    MOVING_TO_LOCATION: 'moving_to_location',
    MINING: 'mining',
    RETURNING: 'returning'
};

/**
 * OreSeam - Represents a mineable location with depleting resources
 * Simulates underground ore deposits that regenerate slowly over time
 */
class OreSeam {
    constructor(x, y, homeBase) {
        this.pos = createVector(x, y);
        this.homeBase = homeBase;
        this.oreAmount = MINING_CONFIG.ORE_SEAM_INITIAL +
            random(-MINING_CONFIG.ORE_SEAM_VARIANCE, MINING_CONFIG.ORE_SEAM_VARIANCE);
        this.maxOre = MINING_CONFIG.ORE_SEAM_MAX;
        this.lastMineTime = 0;
        this.depleted = false;
    }

    /**
     * Check if seam has mineable ore
     */
    hasOre() {
        return this.oreAmount > 0 && !this.depleted;
    }

    /**
     * Extract ore from this seam
     * @param {number} amount - Amount to extract
     * @returns {number} Actual amount extracted
     */
    extract(amount) {
        if (!this.hasOre()) return 0;

        const extracted = Math.min(amount, this.oreAmount);
        this.oreAmount -= extracted;
        this.lastMineTime = Date.now();

        if (this.oreAmount <= 0) {
            this.depleted = true;
        }

        return extracted;
    }

    /**
     * Slowly regenerate ore over time
     * @param {number} dt - Delta time in seconds
     */
    regenerate(dt) {
        if (this.oreAmount < this.maxOre && !this.depleted) {
            this.oreAmount = Math.min(this.maxOre, this.oreAmount + MINING_CONFIG.ORE_SEAM_REGEN_RATE * dt);
        }

        // Reactivate depleted seams after some regeneration
        if (this.depleted && this.oreAmount > MINING_CONFIG.MINERALS_PER_MINE) {
            this.depleted = false;
        }
    }
}

class MiningRobot {
    /**
     * Creates a mining robot for surface operations
     * @param {number} x - X position (world coordinates)
     * @param {number} y - Y position (world coordinates)
     * @param {Object} homeBase - The surface base this robot belongs to (OffworldBuilding)
     * @param {Map<string, OreSeam>} oreSeams - Shared map of ore seams for this base
     */
    constructor(x, y, homeBase, oreSeams) {
        this.pos = createVector(x, y);
        this.vel = createVector(0, 0);
        this.angle = random(TWO_PI);
        this.size = MINING_CONFIG.ROBOT_SIZE;
        this.homeBase = homeBase;
        this.oreSeams = oreSeams; // Reference to shared ore seam map
        this.yOffset = 0; // Terrain height (set by surface mode)

        // Health and destruction
        this.destroyed = false;
        this.health = 50; // Robots can be destroyed by fauna

        // Movement properties (from config)
        this.maxSpeed = MINING_CONFIG.MAX_SPEED;
        this.acceleration = MINING_CONFIG.ACCELERATION;
        this.arrivalRadius = MINING_CONFIG.ARRIVAL_RADIUS;

        // State machine
        this.state = ROBOT_STATE.IDLE;
        this.stateTimer = 0;
        this.targetSeam = null;
        this.targetPos = null;

        // Mining properties (from config)
        this.miningTime = 0;
        this.miningDuration = MINING_CONFIG.MINING_DURATION;
        this.cargoCapacity = MINING_CONFIG.CARGO_CAPACITY;
        this.cargo = 0;

        // Visual properties
        this.drillRotation = 0;
        this.drillSpeed = 0;
        this.lightTimer = random(TWO_PI);

        // Patrol properties
        this.idleWaitTime = 0;
        this.maxIdleTime = 2.0;
    }

    /**
     * Updates the robot's behavior and movement
     * @param {number} dt - Time elapsed since last frame (seconds)
     * @param {Object} surfaceMode - Reference to surface mode for terrain queries
     */
    update(dt, surfaceMode) {
        // Skip update if destroyed
        if (this.destroyed) return;

        this.stateTimer += dt;
        this.lightTimer += MINING_CONFIG.LIGHT_BLINK_SPEED;

        // Update terrain height
        if (surfaceMode && typeof surfaceMode._getTerrainHeightAt === 'function') {
            this.yOffset = surfaceMode._getTerrainHeightAt(this.pos.x, this.pos.y);
        }

        // Check collision with fauna
        this.checkFaunaCollisions(surfaceMode);
        if (this.destroyed) return; // Stop if just destroyed

        // Update state machine
        switch (this.state) {
            case ROBOT_STATE.IDLE:
                this.updateIdle(dt);
                break;
            case ROBOT_STATE.SEEKING:
                this.updateSeeking();
                break;
            case ROBOT_STATE.MOVING_TO_LOCATION:
                this.updateMovingToLocation(dt);
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
     * Check for collisions with surface fauna
     * @param {Object} surfaceMode - Reference to surface mode
     */
    checkFaunaCollisions(surfaceMode) {
        if (!surfaceMode || !surfaceMode.surfaceObjects) return;

        const collisionRadius = this.size * 0.7; // Collision detection radius

        // PERFORMANCE: Only check physical collisions if close to the player
        const distToPlayerSq = p5.Vector.dist(this.pos, surfaceMode.player.pos) ** 2;
        const activeRangeSq = (SURFACE_CONFIG.UPDATE_RANGE || 2000) ** 2;

        if (distToPlayerSq < activeRangeSq) {
            for (const obj of surfaceMode.surfaceObjects) {
                if (!obj || obj.destroyed) continue;

                // Fauna identification
                const isFauna = obj instanceof SurfaceFauna ||
                    (obj.constructor && obj.constructor.name &&
                        (obj.constructor.name.includes('Creature') ||
                            obj.constructor.name.includes('Fauna')));

                if (!isFauna) continue;

                // Check distance
                const dx = this.pos.x - obj.pos.x;
                const dy = this.pos.y - obj.pos.y;
                const distSq = dx * dx + dy * dy;
                const combinedRadius = collisionRadius + (obj.size || 20);

                if (distSq < combinedRadius * combinedRadius) {
                    // Collision! Robot is destroyed
                    this.takeDamage(100, surfaceMode);
                    break;
                }
            }
        }
    }

    /**
     * Apply damage to the robot
     * @param {number} amount - Damage amount
     * @param {Object} surfaceMode - Reference to surface mode for effects
     */
    takeDamage(amount, surfaceMode) {
        if (this.destroyed) return;

        this.health -= amount;
        if (this.health <= 0) {
            this.destroyed = true;
            this.health = 0;

            // Decrement robot count on homeBase and sync to descriptor
            if (this.homeBase) {
                if (typeof this.homeBase.robotCount === 'number' && this.homeBase.robotCount > 0) {
                    this.homeBase.robotCount--;
                }
                // Sync to descriptor for persistence
                if (surfaceMode && surfaceMode.playerBuiltMap && this.homeBase.cellKey) {
                    const desc = surfaceMode.playerBuiltMap.get(this.homeBase.cellKey);
                    if (desc && typeof desc.robotCount === 'number' && desc.robotCount > 0) {
                        desc.robotCount--;
                    }
                }
            }

            // Create small explosion effect if possible
            if (surfaceMode && surfaceMode._createSurfaceExplosion) {
                surfaceMode._createSurfaceExplosion(
                    this.pos.x,
                    this.pos.y,
                    this.yOffset,
                    this.size * 1.5,
                    [200, 150, 100]
                );
            }
        }
    }

    /**
     * Idle state - wait then start seeking
     * Only seeks if storage has space
     * @param {number} dt - Delta time in seconds
     */
    updateIdle(dt) {
        this.vel.mult(0.95); // Slow down
        this.idleWaitTime += dt;

        if (this.idleWaitTime >= this.maxIdleTime) {
            // Only start seeking if storage isn't full
            if (!this.isBaseStorageFull()) {
                this.state = ROBOT_STATE.SEEKING;
            }
            this.idleWaitTime = 0;
        }
    }

    /**
     * Check if base storage is full or nearly full
     * @returns {boolean} True if storage is full
     */
    isBaseStorageFull() {
        if (!this.homeBase || !this.homeBase.miningStorage) return false;

        const capacity = this.homeBase.miningStorageCapacity || MINING_CONFIG.STORAGE_CAPACITY;
        const existingMinerals = this.homeBase.miningStorage.find(item => item.name === 'Minerals');
        const currentAmount = existingMinerals ? existingMinerals.quantity : 0;

        // Consider full if less than one mining cycle worth of space
        return (capacity - currentAmount) < MINING_CONFIG.MINERALS_PER_MINE;
    }

    /**
     * Seeking state - find or create a mining location
     * Stops seeking if base storage is full
     */
    updateSeeking() {
        // Check if base storage is full - if so, go idle
        if (this.isBaseStorageFull()) {
            this.state = ROBOT_STATE.IDLE;
            return;
        }

        // Try to find existing ore seam with ore
        let bestSeam = null;
        let bestDist = MINING_CONFIG.PATROL_RADIUS;

        for (const [key, seam] of this.oreSeams) {
            if (!seam.hasOre()) continue;

            const dist = p5.Vector.dist(this.pos, seam.pos);
            const distFromBase = p5.Vector.dist(seam.pos, this.homeBase.pos);

            // Must be within patrol radius of base and closer than current best
            if (distFromBase <= MINING_CONFIG.PATROL_RADIUS && dist < bestDist) {
                bestDist = dist;
                bestSeam = seam;
            }
        }

        // If found a good seam, go mine it
        if (bestSeam && this.cargo < this.cargoCapacity) {
            this.targetSeam = bestSeam;
            this.state = ROBOT_STATE.MOVING_TO_LOCATION;
        }
        // If have cargo, return to base
        else if (this.cargo > 0) {
            this.state = ROBOT_STATE.RETURNING;
        }
        // Otherwise, find a new random location to mine
        else if (this.cargo < this.cargoCapacity) {
            // Pick a random location within patrol radius
            const angle = random(TWO_PI);
            const dist = random(200, MINING_CONFIG.PATROL_RADIUS);
            const mineX = this.homeBase.pos.x + Math.cos(angle) * dist;
            const mineY = this.homeBase.pos.y + Math.sin(angle) * dist;

            // Create new ore seam at this location
            const seam = new OreSeam(mineX, mineY, this.homeBase);
            const key = `${Math.floor(mineX / 50)}_${Math.floor(mineY / 50)}`;
            this.oreSeams.set(key, seam);

            this.targetSeam = seam;
            this.state = ROBOT_STATE.MOVING_TO_LOCATION;
        }
        else {
            // No options, go idle
            this.state = ROBOT_STATE.IDLE;
        }
    }

    /**
     * Moving to mining location state
     * @param {number} dt - Delta time in seconds
     */
    updateMovingToLocation(dt) {
        // Check if target still valid
        if (!this.targetSeam || !this.targetSeam.hasOre()) {
            this.targetSeam = null;
            this.state = ROBOT_STATE.SEEKING;
            return;
        }

        // Move towards location
        const target = this.targetSeam.pos;
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
     * Mining state - extract resources from ore seam
     * @param {number} dt - Delta time in seconds
     */
    updateMining(dt) {
        // Check if target still valid
        if (!this.targetSeam || !this.targetSeam.hasOre()) {
            this.targetSeam = null;
            this.state = ROBOT_STATE.SEEKING;
            return;
        }

        this.vel.mult(0.9); // Stay mostly still
        this.miningTime += dt;
        this.drillSpeed = MINING_CONFIG.DRILL_SPEED; // Spin the drill

        // Face the mining location
        const target = this.targetSeam.pos;
        const desired = p5.Vector.sub(target, this.pos);
        const targetAngle = desired.heading();
        this.angle = this.lerpAngle(this.angle, targetAngle, 0.1);

        // Mining complete
        if (this.miningTime >= this.miningDuration) {
            // Extract from ore seam
            const extracted = this.targetSeam.extract(MINING_CONFIG.MINERALS_PER_MINE);
            this.cargo = Math.min(this.cargoCapacity, this.cargo + extracted);

            this.targetSeam = null;

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
            this.homeBase.miningStorageCapacity = MINING_CONFIG.STORAGE_CAPACITY;
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
     * Enhanced design with more detail and character
     * @param {Object} surfaceMode - Reference to surface mode for projection
     */
    draw(surfaceMode) {
        if (!surfaceMode || this.destroyed) return;

        const s = this.size;
        const chassisDepth = s * 0.3;

        // Use surface projection helpers
        // To sit ON the ground, the top of the chassis must be at (ground + depth)
        const alt = this.yOffset + chassisDepth;
        const { extrusionAngle, baseX, baseY } =
            typeof getProjectionHelpers === 'function'
                ? getProjectionHelpers(this.pos.x, this.pos.y, alt)
                : { extrusionAngle: 0.5, baseX: this.pos.x, baseY: this.pos.y };

        const sunAngle = surfaceMode._getSunAngle ? surfaceMode._getSunAngle() : -Math.PI / 4;

        push();
        translate(baseX, baseY);
        rotate(this.angle);

        // Color scheme - industrial mining equipment
        const bodyColor = color(140, 130, 110);      // Dark tan body
        const chassisColor = color(100, 90, 75);     // Darker chassis
        const accentColor = color(200, 160, 40);     // Yellow/gold accents
        const drillColor = color(100, 100, 110);     // Metallic drill

        // ===== CHASSIS (Base Frame) =====
        // Main lower chassis - wider, more stable look
        Draw3D.drawBox3D(0, 0, s * 1.6, s * 1.0, s * 0.3, chassisColor, extrusionAngle, sunAngle);

        // Chassis support beams (industrial look)
        Draw3D.drawBox3D(-s * 0.6, 0, s * 0.15, s * 0.9, s * 0.25, bodyColor, extrusionAngle, sunAngle);
        Draw3D.drawBox3D(s * 0.6, 0, s * 0.15, s * 0.9, s * 0.25, bodyColor, extrusionAngle, sunAngle);

        // ===== BODY/CABIN =====
        // Main body compartment (offset back)
        Draw3D.drawBox3D(-s * 0.2, 0, s * 0.9, s * 0.8, s * 0.6, bodyColor, extrusionAngle, sunAngle);

        // Control cabin/sensor housing on top
        Draw3D.drawBox3D(-s * 0.25, -s * 0.1, s * 0.6, s * 0.5, s * 0.4, chassisColor, extrusionAngle, sunAngle);

        // Viewport/sensor window (animated glow)
        const glowAmount = abs(sin(this.lightTimer)) * 0.4 + 0.6;
        const windowColor = color(80, 180, 255, 120 + glowAmount * 135);
        Draw3D.drawBox3D(-s * 0.25, -s * 0.15, s * 0.35, s * 0.25, s * 0.05, windowColor, extrusionAngle, sunAngle);

        // ===== WHEELS/TREADS (4 wheels) =====
        const wheelColor = color(40, 40, 40);
        const wheelRadius = s * 0.3;
        const wheelHeight = s * 0.25;
        const wheelOffset = s * 0.55;

        // Front wheels
        Draw3D.drawCylinder(-wheelOffset, s * 0.45, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);
        Draw3D.drawCylinder(wheelOffset, s * 0.45, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);
        // Rear wheels
        Draw3D.drawCylinder(-wheelOffset, -s * 0.45, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);
        Draw3D.drawCylinder(wheelOffset, -s * 0.45, wheelRadius, wheelHeight, 8, wheelColor, extrusionAngle, sunAngle);

        // Wheel hubs (yellow accents)
        const hubSize = s * 0.12;
        Draw3D.drawCylinder(-wheelOffset, s * 0.45, hubSize, s * 0.08, 6, accentColor, extrusionAngle, sunAngle);
        Draw3D.drawCylinder(wheelOffset, s * 0.45, hubSize, s * 0.08, 6, accentColor, extrusionAngle, sunAngle);
        Draw3D.drawCylinder(-wheelOffset, -s * 0.45, hubSize, s * 0.08, 6, accentColor, extrusionAngle, sunAngle);
        Draw3D.drawCylinder(wheelOffset, -s * 0.45, hubSize, s * 0.08, 6, accentColor, extrusionAngle, sunAngle);

        // ===== MINING ARM & DRILL =====
        push();
        translate(s * 1.0, 0); // Front mount point

        // Arm base/mount
        Draw3D.drawBox3D(0, 0, s * 0.35, s * 0.35, s * 0.3, bodyColor, extrusionAngle, sunAngle);

        // Hydraulic arm sections
        Draw3D.drawBox3D(s * 0.2, 0, s * 0.3, s * 0.15, s * 0.15, accentColor, extrusionAngle, sunAngle);

        // Drill housing
        Draw3D.drawBox3D(s * 0.4, 0, s * 0.25, s * 0.25, s * 0.2, drillColor, extrusionAngle, sunAngle);

        // Rotating drill bit
        push();
        translate(s * 0.55, 0);
        rotate(this.drillRotation);

        // Main drill shaft
        Draw3D.drawCylinder(0, 0, s * 0.18, s * 0.5, 8, drillColor, extrusionAngle, sunAngle);

        // Drill tip (darker)
        const tipColor = color(70, 70, 80);
        Draw3D.drawCylinder(s * 0.25, 0, s * 0.12, s * 0.15, 6, tipColor, extrusionAngle, sunAngle);

        // Drill flutes/cutting edges
        for (let i = 0; i < 3; i++) {
            push();
            rotate((i * TWO_PI / 3));
            Draw3D.drawBox3D(s * 0.15, s * 0.12, s * 0.05, s * 0.2, s * 0.02, tipColor, extrusionAngle, sunAngle);
            pop();
        }

        pop(); // End drill rotation
        pop(); // End arm

        // ===== CARGO CONTAINERS (if carrying) =====
        if (this.cargo > 0) {
            const containerCount = Math.min(3, Math.ceil(this.cargo / 4));
            const containerColor = color(160, 120, 80);
            for (let i = 0; i < containerCount; i++) {
                const cy = -s * 0.5 - i * s * 0.22;
                Draw3D.drawBox3D(-s * 0.65, cy, s * 0.3, s * 0.3, s * 0.28, containerColor, extrusionAngle, sunAngle);
                // Container straps
                Draw3D.drawBox3D(-s * 0.65, cy, s * 0.32, s * 0.05, s * 0.3, accentColor, extrusionAngle, sunAngle);
            }
        }

        // ===== STATUS LIGHTS =====
        // Main status light on top
        const statusColor = this.getStatusColor();
        Draw3D.drawCylinder(-s * 0.25, -s * 0.45, s * 0.12, s * 0.08, 6, statusColor, extrusionAngle, sunAngle);

        // Side marker lights (small)
        const markerBrightness = abs(sin(this.lightTimer * 0.7)) * 0.3 + 0.7;
        const markerColor = color(255, 200, 0, 150 * markerBrightness);
        Draw3D.drawBox3D(-s * 0.75, 0, s * 0.08, s * 0.08, s * 0.06, markerColor, extrusionAngle, sunAngle);
        Draw3D.drawBox3D(s * 0.35, 0, s * 0.08, s * 0.08, s * 0.06, markerColor, extrusionAngle, sunAngle);

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
            case ROBOT_STATE.MOVING_TO_LOCATION:
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
