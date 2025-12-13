// ****** StarSystem.js ******

/**
 * =============================================================================
 * SYSTEM CONFIGURATION & CONSTANTS
 * =============================================================================
 * Centralized configuration for the StarSystem class.
 * All magic numbers and configuration values are defined here.
 */

// Toggle for verbose diagnostics (kept off for performance)
const STAR_SYSTEM_DEBUG = false;

// === Jump Zone Configuration ===
const JUMP_ZONE_CONFIG = {
    DEFAULT_RADIUS: 500,
    MIN_DIST_FROM_STATION: 2500,
    MAX_DIST_FACTOR: 0.8,      // Multiplied by despawnRadius
    DRAW_RANGE_FACTOR: 8,      // Multiplied by jumpZoneRadius
    MAX_ALPHA: 200,
    MIN_ALPHA: 20
};

// === Starfield Rendering Configuration ===
const STARFIELD_CONFIG = {
    TILE_SIZE: 768,
    MAX_TILES_PER_FRAME: 2,
    MAX_CACHED_TILES: 64,
    DIRECTION_BOOST: 500,
    PREDICTION_FRAMES: 30,
    CLEANUP_INTERVAL_MS: 5000,
    WORKER_ENABLED: (typeof Worker !== 'undefined') && (typeof OffscreenCanvas !== 'undefined'),
    // Deep space dark blue background (not pure black for visual depth)
    BACKGROUND_COLOR: { r: 10, g: 15, b: 40 },
    BACKGROUND_CSS: '#0a0f28'
};

// === Spawn Configuration ===
const SPAWN_CONFIG = {
    ENEMY_SPAWN_INTERVAL: 5000,    // ms
    ASTEROID_SPAWN_INTERVAL: 3000, // ms
    MAX_ENEMIES_BASE: 15,          // Normal peace-time limit
    MAX_ENEMIES_SKIRMISH: 22,      // During skirmishes
    MAX_ENEMIES_WAR: 30,           // During full war
    MAX_ASTEROIDS: 45,
    DEFAULT_DESPAWN_RADIUS: 5000,
    SPAWN_DISTANCE_MIN: 800,
    SPAWN_DISTANCE_MAX: 2000
};

// === Collision Configuration ===
const COLLISION_CONFIG = {
    BUMP_SOUND_COOLDOWN: 250,      // ms between bump sounds
    ALIEN_SPAWN_SOUND_COOLDOWN: 1000 // ms between alien spawn sounds
};

// === Planet Generation Configuration ===
const PLANET_CONFIG = {
    MIN_COUNT: 2,
    MAX_COUNT: 7,
    MIN_ORBIT: 1200,
    STATION_ORBIT_FACTOR: 1.5,
    STATION_OFFSET: 80
};

// === Star Layer Configuration ===
const STAR_LAYER_CONFIG = {
    BACKGROUND: {
        gridSize: 45,
        maxStarsPerCell: 3,
        sizeMultiplier: [0.5, 1.5],
        brightnessRange: [80, 160],
        colorTypes: ['white', 'white', 'white', 'blue', 'yellow']
    },
    FEATURE: {
        gridSize: 200,
        maxStarsPerCell: 1,
        sizeMultiplier: [2.0, 4.0],
        brightnessRange: [180, 255],
        colorTypes: ['white', 'white', 'blue', 'yellow', 'red']
    }
};

/**
 * Build ship role arrays from SHIP_DEFINITIONS
 * Optimized: Single-pass iteration using Map for O(1) role lookups
 */
const buildShipRoleArrays = () => {
    const roleArrays = {
        POLICE_SHIPS: [],
        PIRATE_SHIPS: [],
        HAULER_SHIPS: [],
        TRANSPORT_SHIPS: [],
        MILITARY_SHIPS: [],
        ALIEN_SHIPS: [],
        EXPLORER_SHIPS: [],
        BOUNTY_HUNTER_SHIPS: [],
        GUARD_SHIPS: [],
        IMPERIAL_SHIPS: [],
        SEPARATIST_SHIPS: [],
        COMBAT_SHIPS: []
    };

    // Single loop iteration - more efficient than 11 includes() checks per ship
    for (const [shipKey, shipData] of Object.entries(SHIP_DEFINITIONS)) {
        if (!shipData.aiRoles || !Array.isArray(shipData.aiRoles)) continue;

        // Loop through roles once instead of checking each role with includes()
        for (const role of shipData.aiRoles) {
            const arrayKey = `${role}_SHIPS`;
            if (roleArrays[arrayKey]) {
                roleArrays[arrayKey].push(shipKey);
            }
        }
    }

    return roleArrays;
};

// Initialize the role arrays
const {
    POLICE_SHIPS,
    PIRATE_SHIPS,
    HAULER_SHIPS,
    TRANSPORT_SHIPS,
    MILITARY_SHIPS,
    ALIEN_SHIPS,
    EXPLORER_SHIPS,
    BOUNTY_HUNTER_SHIPS,
    GUARD_SHIPS,
    IMPERIAL_SHIPS,
    SEPARATIST_SHIPS,
    COMBAT_SHIPS
} = buildShipRoleArrays();

// Log the generated arrays to verify (gated behind debug flag)
if (STAR_SYSTEM_DEBUG) {
    console.log("Ship role arrays generated from ship definitions:");
    console.log("POLICE_SHIPS:", POLICE_SHIPS);
    console.log("PIRATE_SHIPS:", PIRATE_SHIPS);
    console.log("HAULER_SHIPS:", HAULER_SHIPS);
    console.log("TRANSPORT_SHIPS:", TRANSPORT_SHIPS);
    console.log("MILITARY_SHIPS:", MILITARY_SHIPS);
    console.log("ALIEN_SHIPS:", ALIEN_SHIPS);
    console.log("EXPLORER_SHIPS:", EXPLORER_SHIPS);
    console.log("BOUNTY_HUNTER_SHIPS:", BOUNTY_HUNTER_SHIPS);
    console.log("GUARD_SHIPS:", GUARD_SHIPS);
    console.log("IMPERIAL_SHIPS:", IMPERIAL_SHIPS);
    console.log("SEPARATIST_SHIPS:", SEPARATIST_SHIPS);
    console.log("COMBAT_SHIPS:", COMBAT_SHIPS);
}

/**
 * =============================================================================
 * STARFIELD WORKER INITIALIZATION
 * =============================================================================
 * Sets up the Web Worker for offscreen starfield tile generation.
 */

// Worker + OffscreenCanvas support for tile generation
let STARFIELD_TILE_WORKER = null;
if (STARFIELD_CONFIG.WORKER_ENABLED) {
    try {
        // Added v2 to bust browser cache and ensure new background color is used
        STARFIELD_TILE_WORKER = new Worker('starfield_worker.js?v=2');
        STARFIELD_TILE_WORKER.onmessage = function (e) {
            const data = e.data;
            if (!data) return;
            const key = data.key;
            const sysIdx = data.systemIndex;
            const imgBitmap = data.bitmap;

            // Locate system
            let sys = null;
            try { if (typeof galaxy !== 'undefined' && galaxy && Array.isArray(galaxy.systems)) sys = galaxy.systems[sysIdx]; } catch (_) { sys = null; }

            // If system no longer exists, close the ImageBitmap (if any) and bail
            if (!sys) {
                try { if (imgBitmap && imgBitmap.close) imgBitmap.close(); } catch (_) { }
                return;
            }

            if (data.error) {
                // Handle worker error - cleanup and remove tile so it can be re-generated
                try {
                    try { if (imgBitmap && imgBitmap.close) imgBitmap.close(); } catch (_) { }
                    // Remove tile from cache so it can be re-queued for generation
                    sys._starfieldTiles.delete(key);
                } catch (_) { }
                return;
            }

            // Process tile ImageBitmap response from worker
            const parts = String(key).split(',');
            if (parts.length !== 2) {
                try { if (imgBitmap && imgBitmap.close) imgBitmap.close(); } catch (_) { }
                // Remove invalid tile from cache
                sys._starfieldTiles.delete(key);
                return;
            }

            // Verify we have a valid ImageBitmap
            if (!imgBitmap) {
                sys._starfieldTiles.delete(key);
                return;
            }

            const [tx, ty] = parts.map(Number);
            let buffer = null;
            let drawSuccess = false;

            try {
                buffer = createGraphics(sys._starfieldTileSize, sys._starfieldTileSize);
                const ctx = buffer.drawingContext;
                ctx.clearRect(0, 0, buffer.width, buffer.height);
                if (ctx.imageSmoothingEnabled !== undefined) ctx.imageSmoothingEnabled = false;
                ctx.drawImage(imgBitmap, 0, 0, buffer.width, buffer.height);
                drawSuccess = true;
            } catch (err) {
                // Drawing failed - cleanup and let tile be regenerated
                if (buffer) { try { buffer.remove(); } catch (_) { } }
                buffer = null;
            }

            try { if (imgBitmap && imgBitmap.close) imgBitmap.close(); } catch (e) { }

            if (drawSuccess && buffer) {
                sys._starfieldTiles.set(key, { buffer, lastUsed: millis() });
            } else {
                // Remove failed tile so it can be re-queued
                sys._starfieldTiles.delete(key);
            }
        };

        // Ensure the worker is terminated on page unload to free resources
        try {
            if (typeof window !== 'undefined' && window && STARFIELD_TILE_WORKER) {
                const _terminateStarfieldWorker = () => {
                    try { STARFIELD_TILE_WORKER.terminate(); } catch (e) { }
                    STARFIELD_TILE_WORKER = null;
                };
                window.addEventListener('beforeunload', _terminateStarfieldWorker);
                window.addEventListener('unload', _terminateStarfieldWorker);
            }
        } catch (e) { }
    } catch (e) { STARFIELD_TILE_WORKER = null; }
}

/**
 * =============================================================================
 * STARSYSTEM CLASS
 * =============================================================================
 * Manages a single star system including planets, stations, NPCs, and all
 * dynamic entities. Handles rendering, collision detection, spawning, and
 * serialization for save/load functionality.
 */

class StarSystem {
    /**
     * Creates a Star System instance. Sets up basic properties.
     * Seeded elements (planets, bgStars) are generated later via initStaticElements().
     * 
     * @param {string} name - The name of the system
     * @param {string} economy - The economy type (e.g., "Industrial", "Agricultural")
     * @param {number} galaxyX - The X coordinate on the galaxy map
     * @param {number} galaxyY - The Y coordinate on the galaxy map
     * @param {number} systemIndex - The unique index of this system, used for seeding
     * @param {number} [techLevel=5] - The technological level (1-10)
     * @param {string} [securityLevel='Medium'] - The security level ('High', 'Anarchy', etc.)
     */
    constructor(name, economy, galaxyX, galaxyY, systemIndex, techLevel = 5, securityLevel = 'Medium') {
        if (STAR_SYSTEM_DEBUG) console.log("StarSystem constructor called for", name);
        this.name = name;
        // SINGLE SOURCE OF TRUTH for economy type
        this.economyType = economy;
        try { this.galaxyPos = createVector(galaxyX, galaxyY); } catch (e) { this.galaxyPos = { x: galaxyX, y: galaxyY }; } // Map position
        this.visited = false;
        this.systemIndex = systemIndex; // Used for seeding static elements
        this.connectedSystemIndices = []; // <-- ADD THIS LINE

        // Assign tech and security levels, using defaults if not provided
        this.techLevel = techLevel || floor(random(1, 11)); // Default random 1-10 if not provided
        this.securityLevel = securityLevel || random(['Anarchy', 'Low', 'Medium', 'Medium', 'High', 'High']); // Default weighted random

        // --- Initialize empty arrays and default null/values ---
        this.station = null; // Created in initStaticElements
        this.secretStations = []; // <--- NEW
        this.planets = [];
        this.asteroids = [];
        this.enemies = [];

        // Cache diagonal distance for spawn calculations
        this._cachedDiagonalDist = null;
        this.projectiles = [];
        this.mines = []; // Proximity mines array
        this.beams = [];
        this.forceWaves = []; // Make sure this is initialized
        this.explosions = [];
        this.cargo = [];
        this.starColor = null; // Set in initStaticElements
        this.starSize = 100;   // Default size, set in initStaticElements
        this.bgStars = [];     // Populated in initStaticElements

        // === Spawn Configuration ===
        this.enemySpawnTimer = 0;
        this.enemySpawnInterval = SPAWN_CONFIG.ENEMY_SPAWN_INTERVAL;
        this.maxEnemies = SPAWN_CONFIG.MAX_ENEMIES_BASE; // Base limit, dynamically increased during war
        this.asteroidSpawnTimer = 0;
        this.asteroidSpawnInterval = SPAWN_CONFIG.ASTEROID_SPAWN_INTERVAL;
        this.maxTotalAsteroids = SPAWN_CONFIG.MAX_ASTEROIDS;
        this.despawnRadius = SPAWN_CONFIG.DEFAULT_DESPAWN_RADIUS;

        // === Jump Zone Properties ===
        this.jumpZoneCenter = null; // p5.Vector, calculated in initStaticElements or loaded
        this.jumpZoneRadius = JUMP_ZONE_CONFIG.DEFAULT_RADIUS;

        // --- Add flag for static elements ---
        this.staticElementsInitialized = false; // Track if initStaticElements has run

        // Add explicit player property initialization
        this.player = null;

        // Pre-allocate screenBounds to avoid creating object every frame
        this.screenBounds = { left: 0, right: 0, top: 0, bottom: 0 };

        // Pre-allocate reusable vector for distance checks (hot path optimization)
        this._distCheckVector = null; // Lazy init in checkProjectileCollisions

        // Add a system-specific player wanted status
        this.playerWanted = false;

        // Optionally track wanted level and expiration time
        this.playerWantedLevel = 0; // 0-5 scale
        this.playerWantedExpiry = null; // Timestamp when wanted status expires

        // Initialize new arrays for nebulae, cosmic storms, and asteroid fields
        this.nebulae = [];
        this.cosmicStorms = [];
        this.spaceObjects = []; // decorative satellites/telescopes

        // Cached human-readable description (can be persisted)
        this.cachedDescription = null;
        // Cooldown to prevent spamming alien spawn sound during batch spawns
        this._lastAlienSpawnSoundTime = 0;

        // Cooldowns to prevent collision bump sound spam
        this._lastPlayerAsteroidBumpSoundTime = 0;
        this._lastPlayerShipBumpSoundTime = 0;

        // === Progressive Starfield Rendering ===
        this._starfieldTileSize = STARFIELD_CONFIG.TILE_SIZE;
        this._starfieldTiles = new Map(); // Map of "x,y" -> { buffer, lastUsed }
        this._starfieldTileQueue = []; // Queue of tiles to generate
        this._starfieldMaxTilesPerFrame = STARFIELD_CONFIG.MAX_TILES_PER_FRAME;
        this._starfieldMaxCachedTiles = STARFIELD_CONFIG.MAX_CACHED_TILES;
        this._starfieldLastPlayerVelX = 0; // For predicting movement
        this._starfieldLastPlayerVelY = 0;
        this._starfieldRenderMode = 'progressive'; // 'progressive', 'buffered', 'legacy'
    }

    /**
     * Sets player wanted status in this system
     * @param {boolean} wanted - New wanted status
     * @param {number} level - Optional wanted level (1-5)
     * @param {number} duration - Optional duration in seconds before expiry
     */
    setPlayerWanted(wanted, level = 1, duration = null) {
        const isAnarchySystem = typeof this.securityLevel === 'string' && this.securityLevel.toLowerCase() === 'anarchy';

        if (isAnarchySystem && wanted) {
            // Anarchy systems never mark the player as wanted
            this.playerWanted = false;
            this.playerWantedLevel = 0;
            this.playerWantedExpiry = null;
            this.policeAlertSent = false;
            return;
        }

        // Track if wanted status is actually changing
        const previousWantedStatus = this.playerWanted;
        this.playerWanted = wanted;

        if (wanted && this.player && this.player.isPolice) {
            this.player.removePoliceStatus();
        }

        if (wanted) {
            this.playerWantedLevel = Math.min(5, Math.max(1, level));
            this.policeAlertSent = true;

            // Set expiry time if duration provided
            if (duration) {
                this.playerWantedExpiry = millis() + (duration * 1000);
            } else {
                this.playerWantedExpiry = null;
            }

            // Notify connected systems based on level
            if (this.playerWantedLevel >= 3 && galaxy && galaxy.systems) {
                this.notifyConnectedSystemsOfCriminal();
            }
        } else {
            this.playerWantedLevel = 0;
            this.playerWantedExpiry = null;
            this.policeAlertSent = false;
        }

        // Record wanted status change if it actually changed
        if (previousWantedStatus !== wanted && this.player) {
            this.player.recordWantedStatusChange(wanted, this.name);
        }
    }

    /**
     * Gets cached diagonal distance for spawn calculations
     * @return {number} Cached diagonal distance from screen center
     * @private
     */
    _getDiagonalDistance() {
        if (!this._cachedDiagonalDist) {
            this._cachedDiagonalDist = sqrt(sq(width / 2) + sq(height / 2));
        }
        return this._cachedDiagonalDist;
    }

    /**
     * Checks if player is wanted in this system
     * @return {boolean} Whether player is wanted here
     */
    isPlayerWanted() {
        // Check for expiry if set
        if (this.playerWantedExpiry && millis() > this.playerWantedExpiry) {
            this.playerWanted = false;
            this.playerWantedLevel = 0;
            this.playerWantedExpiry = null;
        }

        return this.playerWanted;
    }

    /**
     * Notifies connected systems of criminal activity
     */
    notifyConnectedSystemsOfCriminal() {
        if (!galaxy || !Array.isArray(this.connectedSystemIndices)) return;

        // Reduce wanted level for connected systems
        const connectedLevel = Math.max(1, this.playerWantedLevel - 1);

        this.connectedSystemIndices.forEach(sysIndex => {
            const system = galaxy.systems[sysIndex];
            if (system && !system.playerWanted) {
                system.setPlayerWanted(true, connectedLevel);
            }
        });
    }

    /**
     * Initializes static, seeded elements (station, planets, background) using p5 functions.
     * MUST be called AFTER p5 setup is complete (e.g., from Galaxy.initGalaxySystems).
     * 
     * This method:
     * - Creates the main station and optional secret stations
     * - Generates planets with deterministic seeding
     * - Positions the jump zone
     * - Spawns decorative space objects
     * - Generates nebulae (50% chance)
     * - Initializes ambient sounds
     * 
     * @param {number} [sessionSeed] - Optional seed component from the current game session
     */
    initStaticElements(sessionSeed) {
        // Check if initialization is truly complete by verifying planets exist
        // The flag alone isn't enough since planets aren't persisted in save data
        if (this.staticElementsInitialized && this.planets && this.planets.length > 0) {
            console.log(`      >>> ${this.name}: initStaticElements() skipped (already initialized with ${this.planets.length} planets)`);
            return;
        }

        // If flag is set but planets are missing, force reinitialize
        if (this.staticElementsInitialized && (!this.planets || this.planets.length === 0)) {
            console.warn(`      >>> ${this.name}: staticElementsInitialized flag was true but planets array is empty! Forcing reinitialization...`);
            this.staticElementsInitialized = false;
        }

        const seedToUse = sessionSeed ? this.systemIndex + sessionSeed : this.systemIndex;
        console.log(`      >>> ${this.name}: initStaticElements() Start (Seed: ${seedToUse})`);

        // Check if p5 functions are available before using them
        if (typeof randomSeed !== 'function' || typeof random !== 'function' || typeof color !== 'function' || typeof max !== 'function' || typeof floor !== 'function' || typeof width === 'undefined' || typeof height === 'undefined') {
            console.error(`      !!! CRITICAL ERROR in ${this.name}.initStaticElements: p5 functions or globals not available! Aborting static init.`);
            console.error(`      !!! Available: randomSeed=${typeof randomSeed}, random=${typeof random}, color=${typeof color}, width=${typeof width}, height=${typeof height}`);
            if (typeof randomSeed === 'function') randomSeed(); // Attempt to reset seed anyway
            // DO NOT set staticElementsInitialized = true here, allow retry later
            return; // Cannot proceed without p5 functions
        }

        // --- Apply Seed for deterministic generation ---
        randomSeed(seedToUse);

        // --- Create Station (Initial position might be temporary) ---
        console.log("         Creating Station...");
        let stationName = `${this.name} Hub`;
        try {
            const stationX = random(-this.despawnRadius * 0.6, this.despawnRadius * 0.6);
            const stationY = random(-this.despawnRadius * 0.6, this.despawnRadius * 0.6);

            // Pass the economy type from the system to the station
            this.station = new Station(stationX, stationY, this.economyType, stationName);

        } catch (e) {
            console.error("Error creating station:", e);
        }
        console.log(`         Station created (Name: ${this.station?.name || 'N/A'})`);

        // --- Set a fixed large Despawn Radius ---
        try {
            this.despawnRadius = 10000; // Set a fixed large radius
            console.log(`         Despawn Radius set to fixed value: ${this.despawnRadius}`); // Add log
        } catch (e) {
            console.error("         Error setting fixed despawnRadius:", e);
            this.despawnRadius = 10000; // Use fixed fallback
        }

        // Note: Stars are now generated procedurally in drawBackground() - no need to pre-generate them

        // --- Initialize Planets (This will also position the station) ---
        try { this.createRandomPlanets(); }
        catch (e) { console.error("Error during createRandomPlanets call:", e); }

        // --- Secret Station Generation ---
        this.secretStations = [];
        if (this.planets && this.planets.length > 2 && random() < 0.5) { // 50% chance and at least 3 planets (sun + main station planet + 1 more)
            try { // <<< ADD TRY HERE
                // We already know which planet the main station is near
                let mainStationPlanetIndex = this.mainStationPlanetIndex || -1;

                // If mainStationPlanetIndex is somehow not set, find it based on proximity
                if (mainStationPlanetIndex === -1 && this.station && this.station.pos) {
                    let closestDist = Infinity;
                    // Start from 1 to skip the sun
                    for (let i = 1; i < this.planets.length; i++) {
                        let d = p5.Vector.dist(this.station.pos, this.planets[i].pos);
                        if (d < closestDist) {
                            closestDist = d;
                            mainStationPlanetIndex = i;
                        }
                    }
                }

                // Generate list of eligible planets (excluding sun and main station planet)
                let eligiblePlanets = [];
                for (let i = 1; i < this.planets.length; i++) {
                    if (i !== mainStationPlanetIndex) {
                        eligiblePlanets.push(i);
                    }
                }

                // Only proceed if we have eligible planets
                if (eligiblePlanets.length > 0) {
                    // Pick a random eligible planet
                    let planetIdx = eligiblePlanets[floor(random(eligiblePlanets.length))];
                    let planet = this.planets[planetIdx];

                    let angle = atan2(planet.pos.y, planet.pos.x) + random(-0.5, 0.5); // Offset angle
                    let dist = planet.size * 1.8 + random(200, 600);
                    let pos = p5.Vector.add(planet.pos, p5.Vector.fromAngle(angle).mult(dist));

                    // Pick subtype based on system type
                    let subtype = null;
                    let sysType = (this.economyType || "").toLowerCase();
                    if (sysType.includes("military")) subtype = "secret_military";
                    else if (sysType.includes("alien")) subtype = "secret_alien";
                    else if (sysType.includes("separatist")) subtype = "secret_separatist";
                    else subtype = "secret_generic";

                    let secretName = `${this.name} Secret Base`;
                    let secretStation = new Station(pos.x, pos.y, this.economyType, secretName, true, subtype);
                    this.secretStations.push(secretStation);
                    console.log(`         Successfully created Secret Station: ${secretName} near planet index ${planetIdx}`);
                }
            } catch (e) { // <<< ADD CATCH HERE
                console.error(`Error creating Secret Station for ${this.name}:`, e);
            }
        }
        // --- End Secret Station Generation ---

        // --- Calculate Jump Zone Position (AFTER station position is set in createRandomPlanets) ---
        // This MUST happen before spawnSpaceObjectsForPlanets because some objects spawn near the jump zone
        if (this.jumpZoneCenter === null) { // Check if not already loaded from save data
            if (this.station && this.station.pos) {
                const maxJumpDist = this.despawnRadius * JUMP_ZONE_CONFIG.MAX_DIST_FACTOR;
                const distFromStation = random(JUMP_ZONE_CONFIG.MIN_DIST_FROM_STATION, maxJumpDist);
                const angleFromStation = random(TWO_PI); // Random direction from station

                this.jumpZoneCenter = p5.Vector.add(
                    this.station.pos,
                    p5.Vector.fromAngle(angleFromStation).mult(distFromStation)
                );
                console.log(`         Jump Zone for ${this.name} calculated at ${this.jumpZoneCenter.x.toFixed(0)}, ${this.jumpZoneCenter.y.toFixed(0)} (Radius: ${this.jumpZoneRadius})`);
            } else {
                console.warn(`         Could not calculate Jump Zone for ${this.name}: Station or station position not available.`);
                // Fallback: Place it far out at a random angle from origin (0,0)
                const fallbackDist = 10000;
                const fallbackAngle = random(TWO_PI);
                this.jumpZoneCenter = createVector(cos(fallbackAngle) * fallbackDist, sin(fallbackAngle) * fallbackDist);
            }
        } else {
            console.log(`         Jump Zone for ${this.name} loaded from save data.`);
        }
        // --- End Jump Zone Calculation ---

        // --- Spawn Space Objects for Planets and Jump Gate ---
        try {
            this.spawnSpaceObjectsForPlanets();
            console.log(`         Space objects spawned`);
        } catch (e) { console.error("Error spawning space objects:", e); }

        // --- Generate Nebulae ---
        try {
            // Skip nebula generation if we already have nebulae from saved data
            if (this.nebulae.length > 0) {
                console.log(`Skipping nebula generation: ${this.nebulae.length} nebulae loaded from save data`);
            }
            else if (random() < 0.5) { // 50% chance of having a nebula in the system
                const nebulaCount = floor(random(1, 3));
                const nebulaTypes = ['ion', 'radiation', 'emp'];

                // Only proceed if we have valid reference points
                if (this.station && this.station.pos && this.jumpZoneCenter) {
                    // Calculate midpoint between station and jump zone
                    const midX = (this.station.pos.x + this.jumpZoneCenter.x) / 2;
                    const midY = (this.station.pos.y + this.jumpZoneCenter.y) / 2;

                    // Define possible nebula positions with weighted distribution
                    const possiblePositions = [
                        { x: this.station.pos.x, y: this.station.pos.y, type: 'near_station', weight: 0.25 },
                        { x: this.jumpZoneCenter.x, y: this.jumpZoneCenter.y, type: 'near_jump', weight: 0.25 },
                        { x: midX, y: midY, type: 'midway', weight: 0.5 }
                    ];

                    for (let i = 0; i < nebulaCount; i++) {
                        // Choose position based on weights
                        const roll = random();
                        let targetPos;
                        let cumulativeWeight = 0;

                        for (const pos of possiblePositions) {
                            cumulativeWeight += pos.weight;
                            if (roll < cumulativeWeight) {
                                targetPos = pos;
                                break;
                            }
                        }

                        // If no position selected (shouldn't happen), use midway
                        if (!targetPos) targetPos = possiblePositions[2];

                        // Add randomness to exact position (avoid direct overlap)
                        const offsetDist = targetPos.type === 'midway' ? 800 : 1500;
                        const offsetAngle = random(TWO_PI);
                        const x = targetPos.x + cos(offsetAngle) * random(300, offsetDist);
                        const y = targetPos.y + sin(offsetAngle) * random(300, offsetDist);

                        // Choose nebula type
                        let nebulaType;
                        nebulaType = random(nebulaTypes);


                        // Size varies by position
                        const nebulaRadius = targetPos.type === 'midway'
                            ? random(1500, 3000)  // Larger in midway
                            : random(800, 2000);  // Smaller near facilities

                        this.nebulae.push(new Nebula(x, y, nebulaRadius, nebulaType));
                        console.log(`Nebula (${nebulaType}) positioned near ${targetPos.type}`);
                    }
                } else {
                    // Fallback to random placement if no reference points
                    for (let i = 0; i < nebulaCount; i++) {
                        const angle = random(TWO_PI);
                        const distance = random(3000, this.despawnRadius * 0.8);
                        this.nebulae.push(new Nebula(
                            cos(angle) * distance,
                            sin(angle) * distance,
                            random(1000, 3000),
                            random(nebulaTypes)
                        ));
                    }
                }
            }
        } catch (e) { console.error("Error generating nebulae:", e); }

        // --- Initialize Ambient Sounds ---
        try {
            if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                this.initAmbientSounds();
                console.log(`         Ambient sounds initialized`);
            }
        } catch (e) { console.error("Error initializing ambient sounds:", e); }

        // --- CRITICAL: Reset Seed AFTER generating all static seeded elements ---
        // NOTE: We intentionally DO NOT enqueue planet buffer creation here. Enqueuing
        // all system planet buffers at once causes large startup load (and the UI hang
        // you observed). Planet buffers are queued when the player actually enters a
        // system (`enterSystem`) so only current-system planets are prepared.

        randomSeed(); // Reset to non-deterministic (time-based) random

        // --- Set initialization flag ---
        this.staticElementsInitialized = true;
        // ---

        console.log(`      <<< ${this.name}: initStaticElements() Finished`); // Log completion
    }

    /**
     * Creates random planets using seeded random generation.
     * Called by initStaticElements.
     * 
     * Planets are:
     * - Arranged in an orbital pattern around the central star
     * - Given randomized sizes and colors
     * - Associated with the main station (station orbits one planet)
     * 
     * The first planet is always the central star at (0,0).
     */
    createRandomPlanets() {
        // Clear any previous planets and add the central star at (0,0)
        this.planets = [];
        this.planets.push(Planet.createSun(this.name));

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

            let sz = random(400, 800) * 2;
            let c1 = color(random(50, 200), random(50, 200), random(50, 200));
            let c2 = color(random(50, 200), random(50, 200), random(50, 200));

            // Create the planet with the computed world coordinates, system name, and planet index
            let planet = new Planet(px, py, sz, c1, c2, this.name, i + 1); // i+1 since 0 is sun
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

            // Store which planet the main station is associated with
            this.mainStationPlanetIndex = randomIndex;
            console.log(`         Main station positioned near planet index ${randomIndex}`);
        }
    } // End createRandomPlanets

    /**
     * Initialize ambient sounds for static objects in the system
     */
    initAmbientSounds() {
        if (typeof ambientSoundManager === 'undefined' || !ambientSoundManager) {
            return;
        }

        // Create ambient sound for the sun (at 0,0)
        if (this.planets && this.planets.length > 0 && this.planets[0].isSun) {
            const sunProfile = AmbientSoundManager.getSoundProfile('sun');
            const sunSound = ambientSoundManager.createAmbientSound(
                `${this.name}_sun`,
                sunProfile
            );
            if (sunSound) {
                sunSound.position = createVector(0, 0);
            }
        }

        // Create ambient sound for the main station
        if (this.station && this.station.pos) {
            const stationProfile = AmbientSoundManager.getSoundProfile('station', { type: this.station.stationType });
            const stationSound = ambientSoundManager.createAmbientSound(
                `${this.name}_station`,
                stationProfile
            );
            if (stationSound) {
                stationSound.position = this.station.pos.copy();
            }
        }

        // Create ambient sounds for secret stations
        if (this.secretStations && this.secretStations.length > 0) {
            for (let i = 0; i < this.secretStations.length; i++) {
                const secretStation = this.secretStations[i];
                if (secretStation && secretStation.pos) {
                    const secretProfile = AmbientSoundManager.getSoundProfile('station', { type: secretStation.stationType });
                    const secretSound = ambientSoundManager.createAmbientSound(
                        `${this.name}_secret_${i}`,
                        secretProfile
                    );
                    if (secretSound) {
                        secretSound.position = secretStation.pos.copy();
                    }
                }
            }
        }

        // Create ambient sound for the jump gate
        if (this.jumpZoneCenter) {
            const jumpProfile = AmbientSoundManager.getSoundProfile('jumpgate');
            const jumpSound = ambientSoundManager.createAmbientSound(
                `${this.name}_jumpgate`,
                jumpProfile
            );
            if (jumpSound) {
                jumpSound.position = this.jumpZoneCenter.copy();
            }
        }

        // Create ambient sounds for planets (excluding the sun)
        if (this.planets && this.planets.length > 1) {
            for (let i = 1; i < this.planets.length; i++) {
                const planet = this.planets[i];
                if (planet && planet.pos) {
                    // Get color value for frequency variation
                    const colorValue = planet.baseColor ?
                        (red(planet.baseColor) + green(planet.baseColor) + blue(planet.baseColor)) / 3 : 150;

                    const planetProfile = AmbientSoundManager.getSoundProfile('planet', {
                        hasRings: planet.hasRings || false,
                        colorValue: colorValue
                    });

                    const planetSound = ambientSoundManager.createAmbientSound(
                        `${this.name}_planet_${i}`,
                        planetProfile
                    );
                    if (planetSound) {
                        planetSound.position = planet.pos.copy();
                    }
                }
            }
        }

        // Create ambient sounds for nebulae
        if (Array.isArray(this.nebulae) && this.nebulae.length > 0) {
            for (let i = 0; i < this.nebulae.length; i++) {
                const neb = this.nebulae[i];
                if (!neb?.pos) continue;
                const nebProfile = AmbientSoundManager.getSoundProfile('nebula', { type: neb.type });
                const id = `${this.name}_nebula_${i}_${neb.type}`;
                const nebSound = ambientSoundManager.createAmbientSound(id, nebProfile);
                if (nebSound) nebSound.position = neb.pos.copy();
            }
        }

        // Create ambient sounds for active cosmic storms (if any at init)
        if (Array.isArray(this.cosmicStorms) && this.cosmicStorms.length > 0) {
            for (let i = 0; i < this.cosmicStorms.length; i++) {
                const st = this.cosmicStorms[i];
                if (!st?.pos) continue;
                const stProfile = AmbientSoundManager.getSoundProfile('storm', { type: st.type });
                const id = `${this.name}_storm_${i}_${st.type}`;
                const stSound = ambientSoundManager.createAmbientSound(id, stProfile);
                if (stSound) stSound.position = st.pos.copy();
            }
        }
    }

    /**
     * Clean up ambient sounds for this system
     */
    cleanupAmbientSounds() {
        if (typeof ambientSoundManager === 'undefined' || !ambientSoundManager) {
            return;
        }

        // Remove all sounds associated with this system
        const soundIds = Array.from(ambientSoundManager.activeSources.keys());
        for (let soundId of soundIds) {
            if (soundId.startsWith(this.name)) {
                ambientSoundManager.removeAmbientSound(soundId);
            }
        }
    }

    /**
     * Rebuilds this system's ambient audio layers without touching seeded data.
     * Useful after loading save data where static elements already exist.
     */
    rebuildAmbientSounds() {
        if (typeof ambientSoundManager === 'undefined' || !ambientSoundManager) {
            return;
        }
        this.cleanupAmbientSounds();
        this.initAmbientSounds();
    }

    /** Draws the Jump Zone marker if the player is close enough. Assumes called within translated space. */
    drawJumpZone(playerPos) {
        if (!this.jumpZoneCenter || this.jumpZoneRadius <= 0) return;

        // Only draw if player is relatively close
        const maxDrawDist = this.jumpZoneRadius * JUMP_ZONE_CONFIG.DRAW_RANGE_FACTOR;
        const maxDrawDistSq = maxDrawDist * maxDrawDist;
        const dx = playerPos.x - this.jumpZoneCenter.x;
        const dy = playerPos.y - this.jumpZoneCenter.y;
        const distToPlayerSq = dx * dx + dy * dy;

        if (distToPlayerSq < maxDrawDistSq) {
            const distToPlayer = Math.sqrt(distToPlayerSq);
            push();
            // Style for the jump zone marker
            noFill();
            strokeWeight(3); // Make it reasonably thick

            // Fade out as player gets further away
            let alpha = map(distToPlayer, this.jumpZoneRadius, maxDrawDist, JUMP_ZONE_CONFIG.MAX_ALPHA, JUMP_ZONE_CONFIG.MIN_ALPHA);
            alpha = constrain(alpha, JUMP_ZONE_CONFIG.MIN_ALPHA, JUMP_ZONE_CONFIG.MAX_ALPHA);
            stroke(255, 255, 0, alpha); // Yellow, semi-transparent

            // Draw the circle representing the zone boundary
            ellipse(this.jumpZoneCenter.x, this.jumpZoneCenter.y, this.jumpZoneRadius * 2);

            // Optional: Add a central marker or crosshair
            const crossSize = min(this.jumpZoneRadius * 0.1, 50); // Size of the central cross
            line(this.jumpZoneCenter.x - crossSize, this.jumpZoneCenter.y, this.jumpZoneCenter.x + crossSize, this.jumpZoneCenter.y);
            line(this.jumpZoneCenter.x, this.jumpZoneCenter.y - crossSize, this.jumpZoneCenter.x, this.jumpZoneCenter.y + crossSize);

            pop();
        }
    }

    /**
     * Called when player enters this system.
     * 
     * This method:
     * - Marks the system as discovered
     * - Resets dynamic objects (enemies, projectiles, asteroids, etc.)
     * - Associates the player with this system
     * - Resets starfield buffer
     * - Queues planet buffer creation
     * - Sets police alert status
     * - Spawns initial population (NPCs, asteroids, bodyguards)
     * - Updates the system's cached description
     * 
     * @param {Player} player - The player object entering the system
     */
    enterSystem(player) {
        this.discover();
        this.enemies = []; this.projectiles = []; this.mines = []; this.asteroids = []; this.harpoons = [];
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;

        // Note: Do NOT clear spaceObjects array - these are static decorative elements
        // that should persist across visits and are created during initStaticElements

        // CRITICAL FIX: Associate the player with this system
        this.player = player;

        // Reset starfield buffer to force regeneration with new player position
        this.resetStarfieldBuffer();

        // Queue planet buffer creation on enter to avoid hitches during arrival
        try {
            if (typeof window !== 'undefined') {
                // Reset queue so we only process planets for the current system
                window._planetBufferCreationQueue = [];
                window._planetBufferCreationTotal = 0;
                window._planetBufferCreationCompleted = 0;
                if (Array.isArray(this.planets)) {
                    for (let i = 0; i < this.planets.length; i++) {
                        const pl = this.planets[i];
                        if (pl && typeof pl.createBuffers === 'function' && !pl.buffersCreated) {
                            window._planetBufferCreationQueue.push({ system: this, planet: pl });
                            window._planetBufferCreationTotal++;
                        }
                    }
                }
            } else {
                // Non-browser fallback: create synchronously
                if (Array.isArray(this.planets)) {
                    for (let i = 0; i < this.planets.length; i++) {
                        const pl = this.planets[i];
                        if (pl && typeof pl.createBuffers === 'function' && !pl.buffersCreated) {
                            try { pl.createBuffers(); } catch (e) { console.warn('Planet.createBuffers failed on enterSystem for', pl, e); }
                        }
                    }
                }
            }
        } catch (e) { console.warn('Error queuing planet buffers on enterSystem:', e); }

        // Set system-wide police alert immediately
        this.policeAlertSent = player?.isWanted || false;
        console.log(`Player entering ${this.name} system. Wanted status: ${player?.isWanted}`);

        // Update cached, persisted description when player visits the system
        try {
            if (typeof generateSystemDescription === 'function') {
                this.cachedDescription = generateSystemDescription(this, { galaxy: (typeof galaxy !== 'undefined' ? galaxy : null), player: this.player });
            }
        } catch (e) {
            console.warn('Failed to generate cachedDescription on enterSystem:', e);
        }

        // Initial system population - use this.player consistently in timers
        setTimeout(() => {
            if (this.player && this.player.pos) {  // CHANGE: Use this.player instead of player
                console.log(`Populating ${this.name} system. Player wanted status: ${this.player.isWanted}`);

                // Spawn player's bodyguards if any
                if (this.player.activeBodyguards && this.player.activeBodyguards.length > 0) {
                    console.log(`Player has ${this.player.activeBodyguards.length} active bodyguards to spawn`);
                    this.player.spawnBodyguards(this);
                }

                // CHANGE: Use this.player in method calls
                for (let i = 0; i < 3; i++) {
                    try { this.trySpawnNPC(); } catch (e) { }
                }
                for (let i = 0; i < 8; i++) {
                    try { this.trySpawnAsteroid(); } catch (e) { }
                }

                // Use this.player in nested setTimeout too
                setTimeout(() => {
                    // Check again if player exists and is wanted
                    if (this.player && this.player.isWanted) {
                        // Only log once per system entry, not for each police ship
                        console.log(`WANTED ALERT: Broadcasting player wanted status in ${this.name} system!`);
                        uiManager.addMessage(`WANTED ALERT: Player is wanted status in ${this.name} system!`);

                        // Force all police to respond
                        let policeCalled = false;
                        let policeCount = 0;
                        for (let enemy of this.enemies) {
                            if (enemy.role === AI_ROLE.POLICE) {
                                enemy.target = this.player;
                                enemy.currentState = AI_STATE.APPROACHING;

                                // Force initial rotation toward player
                                if (enemy.pos && this.player.pos) {
                                    let angleToPlayer = atan2(this.player.pos.y - enemy.pos.y, this.player.pos.x - enemy.pos.x);
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

    /** 
     * Resets the starfield buffer cache, forcing regeneration on next draw.
     * Call this when entering a new system or when the buffer needs to be refreshed.
     */
    resetStarfieldBuffer() {
        // Clear progressive tile cache and generation queue
        if (this._starfieldTiles) {
            for (const tile of this._starfieldTiles.values()) {
                if (tile && tile.buffer) {
                    try { tile.buffer.remove(); } catch (e) { }
                }
            }
            this._starfieldTiles.clear();
        }
        this._starfieldTileQueue = [];
        // Clear any legacy last-player position markers (harmless if unused)
        this._starfieldLastPlayerX = null;
        this._starfieldLastPlayerY = null;
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


    /**
     * ==========================================================================
     * SHIP SPAWNING & SELECTION
     * ==========================================================================
     */

    /**
     * Selects appropriate ship type based on system economy and security level.
     * During active wars, spawn distribution shifts toward the conflicting factions.
     * 
     * @param {string} economy - System economy type
     * @param {string} security - System security level
     * @returns {{role: string, ship: string}} Selected ship role and type
     * @private
     */
    _selectShipForEconomy(economy, security) {
        // Check for active war state - influences spawn distribution
        const em = typeof eventManager !== 'undefined' ? eventManager : null;
        if (em && em.activeWarState && em.activeWarState.isActive && em.activeWarState.spawnModifiers) {
            const warSelection = this._selectWarInfluencedShip(em.activeWarState);
            if (warSelection) return warSelection;
        }

        const econ = (economy || "").toLowerCase();

        // Economy-specific spawn logic
        const economyHandlers = {
            military: () => this._selectMilitaryShip(),
            alien: () => this._selectAlienShip(),
            offworld: () => this._selectOffworldShip(),
            separatist: () => this._selectFactionShip(SEPARATIST_SHIPS, IMPERIAL_SHIPS),
            imperial: () => this._selectFactionShip(IMPERIAL_SHIPS, SEPARATIST_SHIPS)
        };

        const handler = economyHandlers[econ];
        if (handler) {
            return handler();
        }

        // Standard spawn logic based on security
        return this._selectStandardShip(security);
    }

    /**
     * Selects a ship based on active war state spawn modifiers.
     * @param {Object} warState - Active war state with spawnModifiers
     * @returns {{role: string, ship: string}|null} Selected ship or null for standard selection
     * @private
     */
    _selectWarInfluencedShip(warState) {
        const mods = warState.spawnModifiers;
        const rand = random();

        if (warState.factions === 'SEPARATIST_VS_IMPERIAL') {
            if (rand < mods.SEPARATIST && SEPARATIST_SHIPS.length > 0) {
                return { role: AI_ROLE.COMBAT, ship: random(SEPARATIST_SHIPS) };
            } else if (rand < mods.SEPARATIST + mods.IMPERIAL && IMPERIAL_SHIPS.length > 0) {
                return { role: AI_ROLE.COMBAT, ship: random(IMPERIAL_SHIPS) };
            }
            // Fall through to normal selection for 'OTHER' percentage
            return null;
        } else if (warState.factions === 'ALIEN_VS_MILITARY') {
            if (rand < mods.ALIEN && ALIEN_SHIPS.length > 0) {
                return { role: AI_ROLE.ALIEN, ship: random(ALIEN_SHIPS) };
            } else if (rand < mods.ALIEN + mods.MILITARY && MILITARY_SHIPS.length > 0) {
                return { role: AI_ROLE.COMBAT, ship: random(MILITARY_SHIPS) };
            }
            // Fall through to normal selection for 'OTHER' percentage
            return null;
        }

        return null;
    }

    /**
     * Helper methods for ship selection by economy type
     * @private
     */
    _selectMilitaryShip() {
        const rand = random();
        if (rand < 0.60 && MILITARY_SHIPS.length > 0) {
            return { role: AI_ROLE.COMBAT, ship: random(MILITARY_SHIPS) };
        } else if (rand < 0.75 && HAULER_SHIPS.length > 0) {
            return { role: AI_ROLE.HAULER, ship: random(HAULER_SHIPS) };
        } else if (rand < 0.85 && PIRATE_SHIPS.length > 0) {
            return { role: AI_ROLE.PIRATE, ship: random(PIRATE_SHIPS) };
        } else if (rand < 0.92 && ALIEN_SHIPS.length > 0) {
            return { role: AI_ROLE.ALIEN, ship: random(ALIEN_SHIPS) };
        } else {
            return random() < 0.6 && TRANSPORT_SHIPS.length > 0
                ? { role: AI_ROLE.TRANSPORT, ship: random(TRANSPORT_SHIPS) }
                : { role: AI_ROLE.HAULER, ship: random(HAULER_SHIPS.length > 0 ? HAULER_SHIPS : ["Krait"]) };
        }
    }

    _selectAlienShip() {
        if (random() < 0.8 && ALIEN_SHIPS.length > 0) {
            return { role: AI_ROLE.ALIEN, ship: random(ALIEN_SHIPS) };
        }

        const alternatives = [];
        if (PIRATE_SHIPS.length > 0) alternatives.push({ role: AI_ROLE.PIRATE, ships: PIRATE_SHIPS });
        if (HAULER_SHIPS.length > 0) alternatives.push({ role: AI_ROLE.HAULER, ships: HAULER_SHIPS });

        if (alternatives.length > 0) {
            const selected = random(alternatives);
            return { role: selected.role, ship: random(selected.ships) };
        }
        return { role: AI_ROLE.HAULER, ship: "Krait" };
    }

    _selectOffworldShip() {
        const rand = random();
        if (rand < 0.30 && EXPLORER_SHIPS.length > 0) {
            return { role: AI_ROLE.HAULER, ship: random(EXPLORER_SHIPS) };
        } else if (rand < 0.50 && COMBAT_SHIPS.length > 0) {
            return { role: AI_ROLE.COMBAT, ship: random(COMBAT_SHIPS) };
        } else if (rand < 0.65 && PIRATE_SHIPS.length > 0) {
            return { role: AI_ROLE.PIRATE, ship: random(PIRATE_SHIPS) };
        }
        return { role: AI_ROLE.HAULER, ship: random(HAULER_SHIPS.length > 0 ? HAULER_SHIPS : ["Krait"]) };
    }

    _selectFactionShip(primaryFaction, secondaryFaction) {
        const rand = random();
        if (rand < 0.60 && primaryFaction.length > 0) {
            return { role: AI_ROLE.COMBAT, ship: random(primaryFaction) };
        } else if (rand < 0.75 && HAULER_SHIPS.length > 0) {
            return { role: AI_ROLE.HAULER, ship: random(HAULER_SHIPS) };
        } else if (rand < 0.85 && TRANSPORT_SHIPS.length > 0) {
            return { role: AI_ROLE.TRANSPORT, ship: random(TRANSPORT_SHIPS) };
        }
        return {
            role: AI_ROLE.COMBAT,
            ship: random(secondaryFaction.length > 0 ? secondaryFaction : COMBAT_SHIPS)
        };
    }

    _selectStandardShip(security) {
        const probs = this.getEnemyRoleProbabilities();
        let r = random();
        let chosenRole;

        if (r < probs.PIRATE) chosenRole = AI_ROLE.PIRATE;
        else if (r < probs.PIRATE + probs.POLICE) chosenRole = AI_ROLE.POLICE;
        else chosenRole = AI_ROLE.HAULER;

        const roleToShip = {
            [AI_ROLE.PIRATE]: () => random(PIRATE_SHIPS.length > 0 ? PIRATE_SHIPS : ["Krait"]),
            [AI_ROLE.POLICE]: () => random(POLICE_SHIPS.length > 0 ? POLICE_SHIPS : ["Viper"]),
            [AI_ROLE.HAULER]: () => random(HAULER_SHIPS.length > 0 ? HAULER_SHIPS : ["CobraMkIII"])
        };

        let chosenShip = roleToShip[chosenRole] ? roleToShip[chosenRole]() : "Krait";

        // Optional transport override
        if (random() < 0.25 && TRANSPORT_SHIPS.length > 0) {
            chosenRole = AI_ROLE.TRANSPORT;
            chosenShip = random(TRANSPORT_SHIPS);
        }

        return { role: chosenRole, ship: chosenShip };
    }

    /**
     * Spawn guards for large haulers
     * @private
     */
    _spawnGuardsForHauler(hauler) {
        const slotsLeft = this.maxEnemies - this.enemies.length;
        if (slotsLeft <= 0) return;

        const defaultGuardShips = ["Viper", "GladiusFighter"];
        const numGuards = hauler.size > 100 ? min(2, slotsLeft) : (random() < 0.6 ? 1 : 0);

        for (let g = 0; g < numGuards; g++) {
            let guardShipTypeName;
            if (GUARD_SHIPS.length > 0) guardShipTypeName = random(GUARD_SHIPS);
            else if (MILITARY_SHIPS.length > 0) guardShipTypeName = random(MILITARY_SHIPS);
            else guardShipTypeName = random(defaultGuardShips);

            if (!guardShipTypeName) guardShipTypeName = "Viper";

            const offsetAngle = TWO_PI * (g / numGuards);
            const spawnDist = hauler.size / 2 + 30;
            const guardX = hauler.pos.x + cos(offsetAngle) * spawnDist;
            const guardY = hauler.pos.y + sin(offsetAngle) * spawnDist;

            let guardNPC = new Enemy(guardX, guardY, this.player, guardShipTypeName, AI_ROLE.GUARD);
            guardNPC.calculateRadianProperties();
            guardNPC.initializeColors();
            guardNPC.principal = hauler;
            guardNPC.changeState(AI_STATE.GUARDING, { principal: hauler });

            this.addEnemy(guardNPC);
            HAULER_LOG(`Spawned ${guardNPC.shipTypeName} (Guard) for hauler ${hauler.shipTypeName}`);
        }
    }

    /**
     * Attempts to spawn an NPC ship in the system.
     * 
     * Spawning logic:
     * - Checks if under max enemy limit
     * - Selects ship type based on economy and security level
     * - Spawns at diagonal distance + offset from player
     * - Initializes AI state and targeting
     * - Spawns bodyguards for large haulers
     * - Sets up police pursuit if player is wanted
     * 
     * Ship types are economy-dependent:
     * - Military: 60% military ships, 15% haulers, 10% pirates
     * - Alien: 80% alien ships, 10% pirates, 10% haulers
     * - Industrial/Refinery/Mining: Mining platforms and haulers
     * - Standard: Based on security level (pirates vs police ratio)
     */
    trySpawnNPC() {
        if (!this.player?.pos) return;

        // Calculate dynamic max enemies based on war state
        let maxEnemies = SPAWN_CONFIG.MAX_ENEMIES_BASE;
        const em = typeof eventManager !== 'undefined' ? eventManager : null;
        if (em && em.activeWarState && em.activeWarState.isActive) {
            maxEnemies = em.activeWarState.intensity === 'FULL_WAR'
                ? SPAWN_CONFIG.MAX_ENEMIES_WAR
                : SPAWN_CONFIG.MAX_ENEMIES_SKIRMISH;
        }

        if (this.enemies.length >= maxEnemies) return;

        // Select ship based on economy
        let selection = this._selectShipForEconomy(this.economyType, this.securityLevel);
        let chosenRole = selection.role;
        let chosenShipTypeName = selection.ship;


        // --- Thargoid override only for non-alien systems ---
        if (this.economyType !== "alien" && this.economyType !== "Alien") {
            if (random() < 0.01 && ALIEN_SHIPS.includes("Thargoid")) {
                chosenShipTypeName = "Thargoid";
                chosenRole = AI_ROLE.ALIEN;
                if (uiManager) uiManager.addMessage(`Hostile Alien Detected: ${chosenShipTypeName}`);
            }
        }

        if (!chosenShipTypeName) {
            console.warn("StarSystem: chosenShipTypeName was undefined after role selection, defaulting to Krait (Hauler). Role was:", chosenRole);
            chosenShipTypeName = "Krait";
            if (!chosenRole) chosenRole = AI_ROLE.HAULER;
        }

        // --- Spawn the ship ---
        let angle = random(TWO_PI);
        let spawnDist = this._getDiagonalDistance() + random(800, 2000);
        let spawnX = this.player.pos.x + cos(angle) * spawnDist;
        let spawnY = this.player.pos.y + sin(angle) * spawnDist;

        try {
            let newEnemy = new Enemy(spawnX, spawnY, this.player, chosenShipTypeName, chosenRole);
            newEnemy.calculateRadianProperties();
            newEnemy.initializeColors();

            this.addEnemy(newEnemy);

            // Spawn guards for large haulers
            if (newEnemy.role === AI_ROLE.HAULER && newEnemy.size >= 60) {
                this._spawnGuardsForHauler(newEnemy);
            }

            // Initialize police pursuit if player is wanted
            if (newEnemy.role === AI_ROLE.POLICE &&
                ((this.player && this.player.isWanted && !this.player.destroyed) || this.policeAlertSent)) {

                newEnemy.target = this.player;
                newEnemy.changeState(AI_STATE.APPROACHING);

                if (newEnemy.pos && this.player.pos) {
                    let angleToPlayer = atan2(this.player.pos.y - newEnemy.pos.y, this.player.pos.x - newEnemy.pos.x);
                    newEnemy.angle = angleToPlayer;
                }

                if (STAR_SYSTEM_DEBUG) console.log(`New police ${newEnemy.shipTypeName} immediately pursuing wanted player!`);
            }

        } catch (e) {
            console.error("!!! ERROR during trySpawnNPC (Enemy creation/init):", e, "Chosen Ship:", chosenShipTypeName, "Role:", chosenRole);
        }
    }



    /** Attempts to spawn an asteroid at regular intervals. */
    trySpawnAsteroid() {
        if (!this.player?.pos || this.asteroids.length >= this.maxTotalAsteroids) return;
        try {
            let angle = random(TWO_PI);
            let spawnDist = this._getDiagonalDistance() + random(200, 500);
            let spawnX = this.player.pos.x + cos(angle) * spawnDist;
            let spawnY = this.player.pos.y + sin(angle) * spawnDist;
            let size = random(40, 90); // Use larger default size
            // Call the main addAsteroid method to respect maxTotalAsteroids and centralize creation
            this.addAsteroid(spawnX, spawnY, size);
        } catch (e) { console.error("!!! ERROR during trySpawnAsteroid:", e); }
    }

    /** Adds a single asteroid to the system. Called by EventManager or trySpawnAsteroid. */
    addAsteroid(x, y, size) {
        if (this.asteroids.length >= this.maxTotalAsteroids) {
            // console.warn("Max total asteroids reached, cannot add more via addAsteroid.");
            return null; // Return null if asteroid can't be added
        }
        const asteroid = new Asteroid(x, y, size);
        this.asteroids.push(asteroid);
        return asteroid;
    }

    /**
     * ==========================================================================
     * ENTITY UPDATE & MANAGEMENT
     * ==========================================================================
     */

    /**
     * Generic entity update helper - reduces code duplication.
     * Handles update logic and cleanup for arrays of entities.
     * 
     * @param {Array} entityArray - Array of entities to update
     * @param {Function} updateFn - Function to call for each entity update
     * @param {Function} shouldRemove - Predicate function to determine if entity should be removed
     * @param {Function} [onDestroyFn] - Optional callback when entity is destroyed
     * @private
     */
    _updateEntities(entityArray, updateFn, shouldRemove, onDestroyFn = null) {
        const count = entityArray.length;
        if (count === 0) return;

        for (let i = count - 1; i >= 0; i--) {
            const entity = entityArray[i];
            if (!entity) {
                this._fastRemove(entityArray, i);
                continue;
            }

            try {
                updateFn(entity);
            } catch (e) {
                console.error(`Error updating entity:`, e);
            }

            if (shouldRemove(entity)) {
                if (onDestroyFn) {
                    try { onDestroyFn(entity, i); } catch (e) { console.error("Error in onDestroy callback:", e); }
                }
                this._fastRemove(entityArray, i);
            }
        }
    }

    /** 
     * Main update loop for all system entities.
     * Orchestrates updates for all dynamic objects, spawning, and collision detection.
     * OPTIMIZED: Uses fast array removal and reduces object allocations.
     */
    update() {
        if (!this.player || !this.player.pos) return;

        // Update dynamic stock for markets
        this._updateMarketStock();

        // Update ambient sound volumes
        this._updateAmbientSounds();

        // Calculate screen bounds once for visibility checks
        this._updateScreenBounds();

        try {
            // Update all entity categories
            this._updateEnemies();
            this._updateAsteroids();
            this._updatePlanets();
            this._updateSpaceObjects();
            this._updateProjectiles();
            this._updateCargo();
            this._updateBeams();
            this._updateMines();
            this._updateForceWaves();
            this._updateHarpoons();
            this._updateExplosions();
            this._updateNebulae();
            this._updateCosmicStorms();

            // Collision Checks
            this.checkCollisions();
            this.checkProjectileCollisions();

            // Spawning Timers
            this._updateSpawnTimers();
        } catch (e) {
            console.error(`Major ERROR in StarSystem ${this.name}.update:`, e);
        }
    }

    /**
     * Lightweight update for when player is docked or in station menus.
     * Simulates the world (AI movement, spawning, missions) WITHOUT:
     * - Damaging the player (no collision checks involving player)
     * - Processing projectiles that could hit the player
     * - Applying force waves or beams to the player
     * 
     * This allows enemies/mission targets to move realistically while the
     * player is safely docked.
     */
    updateWhileDocked() {
        if (!this.player || !this.player.pos) return;

        try {
            // Update markets (prices fluctuate even while docked)
            this._updateMarketStock();

            // Update enemies - they move, patrol, fight each other
            // But we'll make them ignore the docked player
            this._updateEnemiesWhileDocked();

            // Asteroids drift around
            this._updateAsteroids();

            // Planets rotate
            this._updatePlanets();

            // Space objects update (decorative)
            this._updateSpaceObjects();

            // Explosions fade out
            this._updateExplosions();

            // Nebulae visual update (but no player effects)
            for (let i = 0, nlen = this.nebulae.length; i < nlen; i++) {
                this.nebulae[i].update();
                // Apply effects to enemies only, not player
                for (let j = 0, elen = this.enemies.length; j < elen; j++) {
                    this.nebulae[i].applyEffects(this.enemies[j]);
                }
            }

            // Cosmic storms (affect enemies only)
            this._updateCosmicStormsWhileDocked();

            // NPC-only collisions (enemies vs asteroids, enemies vs enemies)
            this._checkNPCCollisions();

            // NPC-only projectile collisions (no player involvement)
            this._checkNPCProjectileCollisions();

            // Spawning continues
            this._updateSpawnTimers();

            // Clean up projectiles, beams, etc. that expire
            this._updateProjectiles();
            this._updateBeams();
            this._updateMines();
            this._updateForceWavesWhileDocked();
            this._updateHarpoons();
            this._updateCargo();

        } catch (e) {
            console.error(`Error in StarSystem.updateWhileDocked:`, e);
        }
    }

    /**
     * Updates enemies while player is docked.
     * Enemies move, patrol, and fight each other but cannot target the docked player
     * (player.isDockedAndInvulnerable makes isTargetValid() return false for them).
     * @private
     */
    _updateEnemiesWhileDocked() {
        const count = this.enemies.length;
        for (let i = count - 1; i >= 0; i--) {
            const enemy = this.enemies[i];
            if (!enemy) {
                this._fastRemove(this.enemies, i);
                continue;
            }

            try {
                // Update the enemy AI/movement
                // The enemy's isTargetValid() will reject the docked player automatically
                // since player.isDockedAndInvulnerable is true
                enemy.update(this);
            } catch (e) {
                console.error('Error updating enemy while docked:', e);
            }

            // Despawn check (but protect mission targets)
            if (enemy.isDestroyed() || this.shouldDespawnEntity(enemy, 1.1)) {
                this._fastRemove(this.enemies, i);
            }
        }
    }

    /**
     * Updates cosmic storms while docked (affects NPCs only, not player).
     * @private
     */
    _updateCosmicStormsWhileDocked() {
        for (let i = this.cosmicStorms.length - 1; i >= 0; i--) {
            const storm = this.cosmicStorms[i];
            const keepStorm = storm.update();

            this._updateStormAmbientSound(storm, i);

            if (!keepStorm) {
                this._removeStormAmbientSound(storm, i);
                this._fastRemove(this.cosmicStorms, i);
                continue;
            }

            // Apply effects to enemies only (player is safe while docked)
            for (let enemy of this.enemies) {
                storm.applyEffects(enemy);
            }
        }

        // Spawn new storms occasionally
        this._trySpawnCosmicStorm();
    }

    /**
     * Updates force waves while docked - affects NPCs only.
     * @private
     */
    _updateForceWavesWhileDocked() {
        for (let i = this.forceWaves.length - 1; i >= 0; i--) {
            const wave = this.forceWaves[i];

            wave.radius += wave.growRate;

            if (!wave.entitiesToProcess) {
                // Only include enemies and asteroids, NOT the player
                wave.entitiesToProcess = [...this.enemies, ...this.asteroids];
                wave.processedCount = 0;
                wave.processed = {};
            }

            this._processForceWaveBatch(wave);

            if (wave.radius >= wave.maxRadius && wave.processedCount >= wave.entitiesToProcess.length) {
                this._fastRemove(this.forceWaves, i);
            }
        }
    }

    /**
     * Checks collisions between NPCs only (no player involvement).
     * @private
     */
    _checkNPCCollisions() {
        try {
            const enemyCount = this.enemies.length;
            const asteroidCount = this.asteroids.length;

            // Enemy vs Asteroid collisions
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                if (!enemy || !enemy.pos || enemy.isDestroyed()) continue;
                for (let j = 0; j < asteroidCount; j++) {
                    const asteroid = this.asteroids[j];
                    if (!asteroid || !asteroid.pos || asteroid.isDestroyed()) continue;
                    if (enemy.checkCollision(asteroid)) {
                        this._handleAsteroidCollision(enemy, asteroid);
                    }
                }
            }

            // Enemy vs Enemy collisions (optional, can be costly)
            // Skipped for performance - enemies don't collide with each other normally
        } catch (e) {
            console.error('Error in _checkNPCCollisions:', e);
        }
    }

    /**
     * Checks projectile collisions excluding the player.
     * Enemies can still hit each other, asteroids, space objects, etc.
     * @private
     */
    _checkNPCProjectileCollisions() {
        const projCount = this.projectiles.length;
        if (projCount === 0) return;

        if (!this._distCheckVector) this._distCheckVector = createVector(0, 0);
        const distCheckVector = this._distCheckVector;
        const enemyCount = this.enemies.length;
        const asteroidCount = this.asteroids.length;

        for (let i = projCount - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj || !proj.pos) {
                this.removeProjectile(i);
                continue;
            }

            const projPos = proj.pos;
            const projSize = proj.size || 3;
            let hit = false;

            // Check asteroids
            if (this._checkProjectileAsteroidCollision(proj, i, distCheckVector, asteroidCount)) continue;

            // Check space objects
            if (this._checkProjectileSpaceObjectCollision(proj, i, distCheckVector)) continue;

            // Check mines
            if (this._checkProjectileMineCollision(proj, i, distCheckVector)) continue;

            // SKIP player collision check entirely - player is docked and invulnerable

            // Enemy-fired projectiles can hit OTHER enemies (friendly fire / combat)
            if (proj.owner instanceof Enemy) {
                for (let j = 0; j < enemyCount; j++) {
                    const enemy = this.enemies[j];
                    if (!enemy || !enemy.pos || enemy === proj.owner) continue;
                    if (typeof enemy.isDestroyed === 'function' && enemy.isDestroyed()) continue;

                    const combinedRadius = enemy.size + projSize;
                    const combinedRadiusSq = combinedRadius * combinedRadius;
                    distCheckVector.set(enemy.pos.x - projPos.x, enemy.pos.y - projPos.y);

                    if (distCheckVector.magSq() <= combinedRadiusSq && proj.checkCollision(enemy)) {
                        WeaponSystem.handleHitEffects(enemy, projPos, proj.damage, proj.owner, this, proj.color);
                        if (proj._isMissile) {
                            const explosionColor = Array.isArray(proj.color) ? proj.color : [255, 150, 0];
                            this.addExplosion(projPos.x, projPos.y, 15, explosionColor);
                        }
                        this.removeProjectile(i);
                        hit = true;
                        break;
                    }
                }
            }

            // Player-fired projectiles still hit enemies (in case player fired just before docking)
            if (!hit && proj.owner instanceof Player) {
                for (let j = 0; j < enemyCount; j++) {
                    const enemy = this.enemies[j];
                    if (!enemy || !enemy.pos) continue;
                    if (typeof enemy.isDestroyed === 'function' && enemy.isDestroyed()) continue;

                    const combinedRadius = enemy.size + projSize;
                    const combinedRadiusSq = combinedRadius * combinedRadius;
                    distCheckVector.set(enemy.pos.x - projPos.x, enemy.pos.y - projPos.y);

                    if (distCheckVector.magSq() <= combinedRadiusSq && proj.checkCollision(enemy)) {
                        WeaponSystem.handleHitEffects(enemy, projPos, proj.damage, proj.owner, this, proj.color);
                        if (proj._isMissile) {
                            const explosionColor = Array.isArray(proj.color) ? proj.color : [255, 150, 0];
                            this.addExplosion(projPos.x, projPos.y, 15, explosionColor);
                        }
                        this.removeProjectile(i);
                        hit = true;
                        break;
                    }
                }
            }
        }
    }

    /**
     * Updates market dynamic stock for all stations.
     * @private
     */
    _updateMarketStock() {
        const deltaSeconds = (typeof deltaTime === 'number' && Number.isFinite(deltaTime)) ? (deltaTime / 1000) : 0;
        if (deltaSeconds <= 0) return;

        if (this.station?.market?.updateDynamicStock) {
            this.station.market.updateDynamicStock(deltaSeconds);
        }

        if (Array.isArray(this.secretStations)) {
            for (const secretStation of this.secretStations) {
                secretStation?.market?.updateDynamicStock?.(deltaSeconds);
            }
        }
    }

    /**
     * Updates ambient sound volumes based on player position.
     * @private
     */
    _updateAmbientSounds() {
        if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
            ambientSoundManager.updateSoundVolumes(this.player.pos);
        }
    }

    /**
     * Updates cached screen bounds for visibility culling.
     * @private
     */
    _updateScreenBounds() {
        const tx = width / 2 - this.player.pos.x;
        const ty = height / 2 - this.player.pos.y;
        const bounds = this.screenBounds;
        bounds.left = -tx - 100;
        bounds.right = -tx + width + 100;
        bounds.top = -ty - 100;
        bounds.bottom = -ty + height + 100;
    }

    /**
     * Updates all enemy entities.
     * @private
     */
    _updateEnemies() {
        this._updateEntities(
            this.enemies,
            (enemy) => enemy.update(this),
            (enemy) => enemy.isDestroyed() || this.shouldDespawnEntity(enemy, 1.1)
        );
    }

    /**
     * Updates all asteroids with destruction and cargo drop handling.
     * @private
     */
    _updateAsteroids() {
        this._updateEntities(
            this.asteroids,
            (asteroid) => asteroid.update(),
            (asteroid) => asteroid.isDestroyed() || this.shouldDespawnEntity(asteroid, 1.2),
            (asteroid) => this._handleAsteroidDestruction(asteroid)
        );
    }

    /**
     * Handles asteroid destruction, including cargo drops and splitting.
     * @param {Asteroid} asteroid - The destroyed asteroid
     * @private
     */
    _handleAsteroidDestruction(asteroid) {
        if (!asteroid.isDestroyed()) return;

        // Spawn Mineral Cargo on Asteroid Destruction
        if (random() < 0.85) {
            const baseQuantity = max(1, floor(map(asteroid.size, 30, 350, 1, 15)));
            const mineralMultiplier = (asteroid.getMineralMultiplier &&
                typeof asteroid.getMineralMultiplier === 'function')
                ? asteroid.getMineralMultiplier()
                : 1.0;
            const quantity = max(1, floor(baseQuantity * mineralMultiplier));

            const offsetX = random(-asteroid.size * 0.2, asteroid.size * 0.2);
            const offsetY = random(-asteroid.size * 0.2, asteroid.size * 0.2);

            const cargoDrop = new Cargo(
                asteroid.pos.x + offsetX,
                asteroid.pos.y + offsetY,
                "Minerals",
                quantity
            );
            this.addCargo(cargoDrop);

            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Mined ${quantity}t Minerals${asteroid.isRich ? ' (Rich Vein!)' : ''}`);
            }

            if (STAR_SYSTEM_DEBUG) {
                console.log(`Asteroid destroyed, dropped ${quantity}t Minerals${asteroid.isRich ? ' (Rich!)' : ''}`);
            }
        }

        // Spawn smaller asteroid on destruction
        try {
            const minSplitSize = 16;
            const splitFactor = 0.6;
            const newSize = floor(asteroid.size * splitFactor);
            if (newSize >= minSplitSize) {
                this.addAsteroid(asteroid.pos.x, asteroid.pos.y, newSize);
            }
        } catch (e) {
            console.error("Error spawning split asteroid:", e);
        }
    }

    /**
     * Updates all planets (rotation and visuals).
     * @private
     */
    _updatePlanets() {
        for (let i = 0; i < this.planets.length; i++) {
            const planet = this.planets[i];
            if (planet && typeof planet.update === 'function') {
                try {
                    planet.update();
                } catch (e) {
                    console.error("Error updating planet:", e, planet);
                }
            }
        }
    }

    /**
     * Updates decorative space objects.
     * @private
     */
    _updateSpaceObjects() {
        if (!this.spaceObjects || !this.spaceObjects.length) return;

        this._updateEntities(
            this.spaceObjects,
            (so) => so.update(this),
            (so) => so.destroyed,
            (so) => this._handleSpaceObjectDestruction(so)
        );
    }

    /**
     * Handles space object destruction and cargo drops.
     * @param {SpaceObject} so - The destroyed space object
     * @private
     */
    _handleSpaceObjectDestruction(so) {
        // Notify sabotage missions
        try {
            if (this.player && this.player.activeMission) {
                const am = this.player.activeMission;
                const isSab = (typeof MISSION_TYPE !== 'undefined' && am && am.type === MISSION_TYPE.SABOTAGE) || (am && am.type === 'Sabotage');
                if (am && isSab && am.targetObjectId !== undefined && am.targetObjectId === so.id) {
                    try {
                        am.progressCount = Math.max(1, am.progressCount || 0);
                        if (typeof am.complete === 'function') {
                            am.complete(this.player);
                            if (this.player.activeMission === am) this.player.activeMission = null;
                        }
                    } catch (e) { console.warn('Error completing sabotage mission on object destroy', e); }
                }
            }
        } catch (e) { /* non-fatal */ }

        // Spawn metals cargo
        try {
            if (random() < 0.95) {
                const baseQuantity = max(1, floor(map(so.size, 28, 110, 1, 6)));
                const quantity = max(1, baseQuantity);
                const offsetX = random(-so.size * 0.2, so.size * 0.2);
                const offsetY = random(-so.size * 0.2, so.size * 0.2);
                const cargoDrop = new Cargo(so.pos.x + offsetX, so.pos.y + offsetY, "Metals", quantity);
                this.addCargo(cargoDrop);
                if (typeof uiManager !== 'undefined') {
                    const name = (so && typeof so.getDisplayName === 'function') ? so.getDisplayName() : (so.type || 'space object');
                    uiManager.addMessage(`Recovered ${quantity}t Metals from ${name} wreckage`);
                }
            }
        } catch (e) { console.error('Error spawning cargo from spaceObject:', e); }
    }

    /**
     * Updates all projectiles.
     * @private
     */
    _updateProjectiles() {
        const projCount = this.projectiles.length;
        if (projCount === 0) return;

        for (let i = projCount - 1; i >= 0; i--) {
            let proj = this.projectiles[i];
            proj.update();

            if (proj.lifespan <= 0 || proj.isOffScreen()) {
                this.removeProjectile(i);
            }
        }
    }

    /**
     * Updates cargo and handles player collection.
     * @private
     */
    _updateCargo() {
        if (!this.cargo || this.cargo.length === 0) return;

        // Clean up invalid/expired cargo - with marker cleanup callback
        this._updateEntities(
            this.cargo,
            (c) => { if (c && typeof c.update === 'function') c.update(); },
            (c) => !c || !c.pos || !c.type || c.collected || (c.isExpired && c.isExpired()),
            (cargoItem) => {
                // Remove HUD/minimap marker when cargo expires
                if (cargoItem && cargoItem.eventMarkerId &&
                    typeof uiManager !== 'undefined' &&
                    typeof uiManager.removeEventMarker === 'function') {
                    uiManager.removeEventMarker(cargoItem.eventMarkerId);
                }
            }
        );

        // Check for player collection
        this.handleCargoCollection();
    }


    /**
     * Updates beam weapons.
     * @private
     */
    _updateBeams() {
        if (!this.updateBeams) return;
        this.updateBeams();
    }

    /**
     * Updates proximity mines.
     * @private
     */
    _updateMines() {
        if (!this.updateMines) return;
        this.updateMines();
    }

    /**
     * Updates force waves with batch processing for performance.
     * @private
     */
    _updateForceWaves() {
        for (let i = this.forceWaves.length - 1; i >= 0; i--) {
            const wave = this.forceWaves[i];

            // Expand the wave
            wave.radius += wave.growRate;

            // First time initialization - find all entities to process
            if (!wave.entitiesToProcess) {
                this._initializeForceWaveTargets(wave);
            }

            // Process collisions for all tracked entities
            this._processForceWaveCollisions(wave);

            // Remove wave only when it has reached max size
            if (wave.radius >= wave.maxRadius) {
                this._fastRemove(this.forceWaves, i);
            }
        }
    }

    /**
     * Initializes force wave target list.
     * @param {Object} wave - The force wave to initialize
     * @private
     */
    _initializeForceWaveTargets(wave) {
        wave.entitiesToProcess = [];

        // Add all relevant entities that might be affected
        if (wave.owner === this.player) {
            // Player's wave affects enemies and asteroids
            wave.entitiesToProcess = [...this.enemies, ...this.asteroids];
        } else {
            // Enemy's wave affects player only
            if (this.player) wave.entitiesToProcess.push(this.player);
        }

        // Use a Set for reliable object tracking (handles entities without IDs correctly)
        wave.processed = new Set();
    }

    /**
     * Processes collisions for a force wave against its target list.
     * Checks all unprocessed entities every frame to ensure the expanding wave catches them.
     * @param {Object} wave - The force wave to process
     * @private
     */
    _processForceWaveCollisions(wave) {
        // Iterate through all tracked entities
        for (let i = 0; i < wave.entitiesToProcess.length; i++) {
            const entity = wave.entitiesToProcess[i];

            // Use the Set for existence check
            if (wave.processed.has(entity)) continue;

            // Skip if entity is invalid or destroyed
            if (!entity || !entity.pos || (typeof entity.isDestroyed === 'function' && entity.isDestroyed())) {
                wave.processed.add(entity);
                continue;
            }

            // Calculate distance
            const dx = entity.pos.x - wave.pos.x;
            const dy = entity.pos.y - wave.pos.y;
            const distSq = dx * dx + dy * dy;

            // Check if wave has reached the entity
            const radiusWithEntity = wave.radius + entity.size / 2;
            const radiusWithEntitySq = radiusWithEntity * radiusWithEntity;

            if (distSq < radiusWithEntitySq) {
                // Hit! Damage and mark processed
                this._applyForceWaveDamage(wave, entity, distSq, dx, dy);
            } else {
                // Not hit yet. Check if it's out of max range entirely (optimization)
                const maxReach = wave.maxRadius + entity.size / 2;
                if (distSq > maxReach * maxReach) {
                    wave.processed.add(entity); // Will never be hit
                }
            }
        }
    }

    /**
     * Applies force wave damage and knockback to an entity.
     * @param {Object} wave - The force wave
     * @param {Object} entity - The target entity
     * @param {number} distSq - Squared distance to entity
     * @param {number} dx - X distance component
     * @param {number} dy - Y distance component
     * @private
     */
    _applyForceWaveDamage(wave, entity, distSq, dx, dy) {
        // Safety check: if entity is player and is docked/invulnerable, do nothing
        if (entity === this.player && this.player.isDockedAndInvulnerable) return;

        const maxRadiusAdj = wave.maxRadius + entity.size / 2;
        const dist = Math.sqrt(distSq);
        const distRatio = Math.min(1.0, Math.max(0, dist / maxRadiusAdj));

        // Use Linear falloff for a more gradual, predictable drop-off
        const falloff = 1.0 - distRatio;

        // Ensure meaningful minimum damage at the edge
        const minDamage = Math.max(10, Math.floor(wave.damage * 0.1));
        const dmg = Math.max(minDamage, Math.floor(wave.damage * falloff));

        // Apply damage and mark as processed
        entity.takeDamage(dmg, wave.owner, this);
        wave.processed.add(entity);

        // Apply knockback force without allocating vectors
        if (entity.vel) {
            const invLen = dist > 0 ? 1 / dist : 0;
            const nx = dx * invLen;
            const ny = dy * invLen;
            // Knockback scales with proximity too
            const forceMagnitude = 25 * falloff;
            entity.vel.x += nx * forceMagnitude;
            entity.vel.y += ny * forceMagnitude;
        }
    }

    /**
     * Updates harpoon tethers.
     * @private
     */
    _updateHarpoons() {
        if (!this.harpoons || !this.harpoons.length) return;

        for (let i = this.harpoons.length - 1; i >= 0; i--) {
            const h = this.harpoons[i];
            try {
                h.update && h.update(deltaTime || 16);
            } catch (e) {
                console.error('Harpoon update error', e);
                h && h.break && h.break();
            }

            // Remove if broken or invalid
            const targetDestroyed = !h || h.broken || !h.owner || !h.target ||
                (typeof h.target.isDestroyed === 'function' && h.target.isDestroyed());
            const done = (h && typeof h.isDone === 'function') ? h.isDone() : false;

            if (targetDestroyed || done) {
                this._fastRemove(this.harpoons, i);
            }
        }
    }

    /**
     * Updates explosions with pooling.
     * @private
     */
    _updateExplosions() {
        this._updateEntities(
            this.explosions,
            (exp) => exp.update(),
            (exp) => exp.isDone(),
            (exp) => {
                if (typeof WeaponSystem !== 'undefined' && WeaponSystem.releaseExplosion) {
                    WeaponSystem.releaseExplosion(exp);
                }
            }
        );
    }

    /**
     * Updates nebulae and applies their effects.
     * @private
     */
    _updateNebulae() {
        for (let i = 0, nlen = this.nebulae.length; i < nlen; i++) {
            const nebula = this.nebulae[i];
            nebula.update();

            // Apply effects to player
            if (this.player) {
                nebula.applyEffects(this.player);
            }

            // Apply effects to enemies
            for (let j = 0, elen = this.enemies.length; j < elen; j++) {
                nebula.applyEffects(this.enemies[j]);
            }
        }
    }

    /**
     * Updates cosmic storms and handles spawning/cleanup.
     * @private
     */
    _updateCosmicStorms() {
        for (let i = this.cosmicStorms.length - 1; i >= 0; i--) {
            const storm = this.cosmicStorms[i];
            const keepStorm = storm.update();

            // Update corresponding ambient sound position
            this._updateStormAmbientSound(storm, i);

            // Remove the storm if it has dissipated
            if (!keepStorm) {
                this._removeStormAmbientSound(storm, i);
                this._fastRemove(this.cosmicStorms, i);
                continue;
            }

            // Apply effects to entities
            if (this.player) {
                storm.applyEffects(this.player);
            }

            for (let enemy of this.enemies) {
                storm.applyEffects(enemy);
            }
        }

        // Spawn new storms occasionally
        this._trySpawnCosmicStorm();
    }

    /**
     * Updates ambient sound position for a storm.
     * @param {CosmicStorm} storm - The storm
     * @param {number} index - Storm index
     * @private
     */
    _updateStormAmbientSound(storm, index) {
        try {
            if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                const id = `${this.name}_storm_${index}_${storm.type}`;
                const cfg = ambientSoundManager.activeSources.get(id);
                if (cfg && storm.pos) cfg.position = storm.pos;
            }
        } catch (_) { }
    }

    /**
     * Removes ambient sound for a dissipated storm.
     * @param {CosmicStorm} storm - The storm
     * @param {number} index - Storm index
     * @private
     */
    _removeStormAmbientSound(storm, index) {
        try {
            if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                const id = `${this.name}_storm_${index}_${storm.type}`;
                ambientSoundManager.removeAmbientSound(id);
            }
        } catch (_) { }
    }

    /**
     * Attempts to spawn a new cosmic storm.
     * @private
     */
    _trySpawnCosmicStorm() {
        if (random() < 0.0002 && this.cosmicStorms.length < 1) {
            const stormType = random(['electromagnetic', 'gravitational', 'radiation']);
            const angle = random(TWO_PI);
            const distance = this.despawnRadius * 0.15;

            this.cosmicStorms.push(new CosmicStorm(
                this.player.pos.x + cos(angle) * distance,
                this.player.pos.y + sin(angle) * distance,
                random(600, 1200),
                stormType
            ));

            if (STAR_SYSTEM_DEBUG) console.log(`New ${stormType} storm spawned naturally`);

            // Create ambient sound for the newly spawned storm
            this._createStormAmbientSound(this.cosmicStorms.length - 1, stormType);
        }
    }

    /**
     * Creates ambient sound for a new storm.
     * @param {number} index - Storm index
     * @param {string} stormType - Type of storm
     * @private
     */
    _createStormAmbientSound(index, stormType) {
        try {
            if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                const st = this.cosmicStorms[index];
                const profile = AmbientSoundManager.getSoundProfile('storm', { type: stormType });
                const id = `${this.name}_storm_${index}_${stormType}`;
                const snd = ambientSoundManager.createAmbientSound(id, profile);
                if (snd && st?.pos) snd.position = st.pos.copy();
            }
        } catch (_) { }
    }

    /**
     * Updates spawn timers and triggers spawning.
     * @private
     */
    _updateSpawnTimers() {
        this.enemySpawnTimer += deltaTime;
        if (this.enemySpawnTimer >= this.enemySpawnInterval) {
            this.trySpawnNPC();
            this.enemySpawnTimer = 0;
        }

        this.asteroidSpawnTimer += deltaTime;
        if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval) {
            this.trySpawnAsteroid();
            this.asteroidSpawnTimer = 0;
        }
    }

    /**
     * ==========================================================================
     * WEAPON SYSTEM UPDATES
     * ==========================================================================
     */

    updateBeams() {
        // Remove expired beams (e.g., beams with .lifespan <= 0)
        for (let i = this.beams.length - 1; i >= 0; i--) {
            const beam = this.beams[i];
            if (!beam) {
                this._fastRemove(this.beams, i);
                continue;
            }
            if (beam.update) beam.update();
            if (beam.lifespan !== undefined && beam.lifespan <= 0) {
                this._fastRemove(this.beams, i);
            }
        }
    }

    drawBeams() {
        const beamCount = this.beams.length;
        if (beamCount === 0) return; // Early exit
        for (let i = 0; i < beamCount; i++) {
            const beam = this.beams[i];
            if (beam && beam.draw) beam.draw();
        }
    }

    updateForceWaves() {
        for (let i = this.forceWaves.length - 1; i >= 0; i--) {
            const wave = this.forceWaves[i];
            if (!wave) {
                this._fastRemove(this.forceWaves, i);
                continue;
            }
            if (wave.update) wave.update();
            if (wave.lifespan !== undefined && wave.lifespan <= 0) {
                this._fastRemove(this.forceWaves, i);
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

    updateMines() {
        const dt = deltaTime / 1000; // Convert to seconds
        const mineCount = this.mines.length;
        if (mineCount === 0) return; // Early exit

        // Cache enemy count for inner loops
        const enemyCount = this.enemies ? this.enemies.length : 0;

        for (let i = mineCount - 1; i >= 0; i--) {
            const mine = this.mines[i];

            // Update mine
            mine.update(dt);

            // Check if mine is destroyed
            if (mine.destroyed) {
                this._removeMineFromSystem(mine, i);
                continue;
            }

            // Check if mine is too far from player (cleanup)
            if (this.player && mine.isOffScreen(this.player.pos, this.despawnRadius)) {
                this._removeMineFromSystem(mine, i);
                continue;
            }

            // Skip if mine is not armed yet
            if (!mine.armed) continue;

            // Check proximity to enemies (if player's mine)
            if (mine.owner instanceof Player && enemyCount > 0) {
                for (let j = 0; j < enemyCount; j++) {
                    const enemy = this.enemies[j];
                    if (!enemy) continue;
                    if (mine.shouldExplode(enemy)) {
                        mine.explode(this);
                        this._removeMineFromSystem(mine, i);
                        break;
                    }
                }
            }

            // Check proximity to player (if enemy's mine)
            if (!(mine.owner instanceof Player) && this.player && !this.player.isDockedAndInvulnerable) {
                if (mine.shouldExplode(this.player)) {
                    mine.explode(this);
                    this._removeMineFromSystem(mine, i);
                    continue;
                }
            }

            // Also allow enemy mines to be triggered by other enemies (friendly-fire capable)
            if (!(mine.owner instanceof Player) && enemyCount > 0) {
                for (let j = 0; j < enemyCount; j++) {
                    const e = this.enemies[j];
                    if (!e || e === mine.owner) continue; // Skip invalid or the owner
                    if (mine.shouldExplode(e)) {
                        mine.explode(this);
                        this._removeMineFromSystem(mine, i);
                        break;
                    }
                }
            }
        }
    }

    /**
     * Helper to remove mine from system and clean up owner's activeMines array
     * @param {Mine} mine - The mine to remove
     * @param {number} index - Index in this.mines array
     */
    _removeMineFromSystem(mine, index) {
        // Remove from system's mines array
        this._fastRemove(this.mines, index);

        // Remove from owner's activeMines tracking array
        if (mine.owner && mine.owner.activeMines) {
            const ownerIndex = mine.owner.activeMines.indexOf(mine);
            if (ownerIndex !== -1) {
                mine.owner.activeMines.splice(ownerIndex, 1);
            }
        }
    }

    drawMines() {
        for (const mine of this.mines) {
            if (!mine.destroyed) {
                mine.draw();
            }
        }
    }

    /** Adds an explosion to the system's list. */
    addExplosion(x, y, size, color) {
        // Use object pooling if WeaponSystem is available
        if (typeof WeaponSystem !== 'undefined' && typeof WeaponSystem.getPooledObject === 'function') {
            const explosion = WeaponSystem.getPooledObject('explosion', x, y, size, color);

            if (explosion) {
                this.explosions.push(explosion);
                if (STAR_SYSTEM_DEBUG) console.log(`Successfully added pooled explosion, total explosions: ${this.explosions.length}`);
                return;
            } else {
                if (STAR_SYSTEM_DEBUG) console.warn(`Failed to get pooled explosion object at (${x.toFixed(1)},${y.toFixed(1)})`);
            }
        }

        // Fall back to direct instantiation if pooling is unavailable or failed
        if (STAR_SYSTEM_DEBUG) console.log(`Creating new explosion directly at (${x.toFixed(1)},${y.toFixed(1)})`);
        try {
            const explosion = new Explosion(x, y, size, color);
            this.explosions.push(explosion);
            if (STAR_SYSTEM_DEBUG) console.log(`Successfully added direct explosion, total explosions: ${this.explosions.length}`);
        } catch (error) {
            console.error(`Error creating explosion:`, error);
        }
    }

    /**
     * ==========================================================================
     * COLLISION DETECTION & PHYSICS
     * ==========================================================================
     */

    /**
     * Calculates collision impulse for two entities based on their masses.
     * 
     * @param {Object} entity1 - First entity (must have size and vel properties)
     * @param {Object} entity2 - Second entity (must have size and vel properties)
     * @param {number} normalizedX - Normalized X component of collision vector
     * @param {number} normalizedY - Normalized Y component of collision vector
     * @private
     */
    _calculateCollisionImpulse(entity1, entity2, normalizedX, normalizedY) {
        const mass1 = entity1.size * entity1.size;
        const mass2 = entity2.size * entity2.size;
        const totalMass = mass1 + mass2;
        const impulse1 = 3 * (mass2 / totalMass);
        const impulse2 = 3 * (mass1 / totalMass);

        entity1.vel.x -= normalizedX * impulse1;
        entity1.vel.y -= normalizedY * impulse1;
        entity2.vel.x += normalizedX * impulse2;
        entity2.vel.y += normalizedY * impulse2;
    }

    /**
     * Applies physics-based collision response between two entities
     * @private
     */
    _applyCollisionPhysics(entity1, entity2) {
        const dx = entity2.pos.x - entity1.pos.x;
        const dy = entity2.pos.y - entity1.pos.y;
        const distSq = dx * dx + dy * dy;
        const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
        const normalizedX = dx * invDist;
        const normalizedY = dy * invDist;

        this._calculateCollisionImpulse(entity1, entity2, normalizedX, normalizedY);
    }

    /**
     * Handles ship-to-ship collision with damage and physics
     * @private
     */
    _handleShipCollision(ship1, ship2) {
        const collisionDamage = Math.floor((ship1.vel.mag() + ship2.vel.mag()) * 0.5);
        if (STAR_SYSTEM_DEBUG) console.log(`Ship collision! Damage: ${collisionDamage}`);

        ship1.takeDamage(collisionDamage, ship2);
        ship2.takeDamage(collisionDamage, ship1, this);

        // Play bump sound with cooldown
        if (ship1 === this.player) {
            try {
                if (typeof soundManager !== 'undefined') {
                    const now = (typeof millis === 'function') ? millis() : Date.now();
                    if (!this._lastPlayerShipBumpSoundTime || (now - this._lastPlayerShipBumpSoundTime) > 250) {
                        soundManager.playWorldSound('bump', this.player.pos.x, this.player.pos.y, this.player.pos);
                        this._lastPlayerShipBumpSoundTime = now;
                    }
                }
            } catch (e) { /* ignore sound errors */ }
        }

        this._applyCollisionPhysics(ship1, ship2);
    }

    /**
     * Handles ship-to-asteroid collision
     * @private
     */
    _handleAsteroidCollision(ship, asteroid) {
        // Special comet collision: destroys ship outright
        if (asteroid.isComet) {
            ship.takeDamage(999999, asteroid);
            asteroid.takeDamage(ship === this.player ? 20 : 10, ship, this);
        } else {
            const damage = ship === this.player ? Math.floor(ship.vel.mag() * 0.5) : 5;
            ship.takeDamage(damage, asteroid);
            asteroid.takeDamage(ship === this.player ? 20 : 10, ship, this);
        }

        // Play bump sound for player with cooldown
        if (ship === this.player) {
            try {
                if (typeof soundManager !== 'undefined') {
                    const now = (typeof millis === 'function') ? millis() : Date.now();
                    if (!this._lastPlayerAsteroidBumpSoundTime || (now - this._lastPlayerAsteroidBumpSoundTime) > 250) {
                        soundManager.playWorldSound('bump', this.player.pos.x, this.player.pos.y, this.player.pos);
                        this._lastPlayerAsteroidBumpSoundTime = now;
                    }
                }
            } catch (e) { /* ignore sound errors */ }
        }

        this._applyCollisionPhysics(ship, asteroid);
    }

    /**
     * Handles asteroid-to-asteroid collision (gentle physics, no damage)
     * @private
     */
    _handleAsteroidAsteroidCollision(asteroid1, asteroid2) {
        const dx = asteroid2.pos.x - asteroid1.pos.x;
        const dy = asteroid2.pos.y - asteroid1.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 0.001;

        // Calculate overlap
        const r1 = asteroid1.maxRadius || asteroid1.size / 2;
        const r2 = asteroid2.maxRadius || asteroid2.size / 2;
        const minDist = r1 + r2;
        const overlap = minDist - dist;

        if (overlap <= 0) return; // No actual overlap

        // Normalized collision vector
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate asteroids to prevent overlap (push each apart by half the overlap)
        const separationFactor = 0.5;
        asteroid1.pos.x -= nx * overlap * separationFactor;
        asteroid1.pos.y -= ny * overlap * separationFactor;
        asteroid2.pos.x += nx * overlap * separationFactor;
        asteroid2.pos.y += ny * overlap * separationFactor;

        // Apply very gentle impulse based on mass (much softer than ship collisions)
        const mass1 = asteroid1.size * asteroid1.size;
        const mass2 = asteroid2.size * asteroid2.size;
        const totalMass = mass1 + mass2;

        // Gentle impulse factor (0.3 instead of 3 used for ships)
        const impulseFactor = 0.3;
        const impulse1 = impulseFactor * (mass2 / totalMass);
        const impulse2 = impulseFactor * (mass1 / totalMass);

        asteroid1.vel.x -= nx * impulse1;
        asteroid1.vel.y -= ny * impulse1;
        asteroid2.vel.x += nx * impulse2;
        asteroid2.vel.y += ny * impulse2;
    }

    /** Handles all collision detection and responses in the system. */
    checkCollisions() {
        // Early exit if no player
        if (!this.player || !this.player.pos) return;
        if (!this.player) return;

        try {
            // --- PHYSICAL OBJECT COLLISIONS (Non-projectile) ---

            // Player vs Enemies - cache lengths for better performance
            const enemyCount = this.enemies.length;
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                if (!enemy || !enemy.pos || enemy.isDestroyed()) continue;

                // Skip collision detection for player's bodyguards
                if (enemy.role === AI_ROLE.GUARD && enemy.principal === this.player) {
                    continue; // This prevents collisions between player and their bodyguards
                }

                if (this.player.checkCollision(enemy)) {
                    this._handleShipCollision(this.player, enemy);
                }
            }

            // Player vs Asteroids collision - cache lengths
            const asteroidCount = this.asteroids.length;
            for (let i = 0; i < asteroidCount; i++) {
                const asteroid = this.asteroids[i];
                if (!asteroid || !asteroid.pos || asteroid.isDestroyed()) continue;
                if (this.player.checkCollision(asteroid)) {
                    this._handleAsteroidCollision(this.player, asteroid);
                }
            }

            // Enemy vs Asteroid collisions - optimized with cached lengths
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                if (!enemy || !enemy.pos || enemy.isDestroyed()) continue;
                for (let j = 0; j < asteroidCount; j++) {
                    const asteroid = this.asteroids[j];
                    if (!asteroid || !asteroid.pos || asteroid.isDestroyed()) continue;
                    if (enemy.checkCollision(asteroid)) {
                        this._handleAsteroidCollision(enemy, asteroid);
                    }
                }
            }

            // Asteroid vs Asteroid collisions - only check each pair once
            for (let i = 0; i < asteroidCount - 1; i++) {
                const asteroid1 = this.asteroids[i];
                if (!asteroid1 || !asteroid1.pos || asteroid1.isDestroyed()) continue;

                for (let j = i + 1; j < asteroidCount; j++) {
                    const asteroid2 = this.asteroids[j];
                    if (!asteroid2 || !asteroid2.pos || asteroid2.isDestroyed()) continue;

                    if (asteroid1.checkCollision(asteroid2)) {
                        this._handleAsteroidAsteroidCollision(asteroid1, asteroid2);
                    }
                }
            }


        } catch (e) {
            console.error("Error in checkCollisions:", e);
        }
    } // End checkCollisions

    /**
     * Broadphase distance check for projectile collisions
     * @private
     */
    _checkProjectileBroadphase(proj, target, distCheckVector) {
        const projSize = proj.size || 3;
        const targetSize = target.size || 24;
        const combinedRadius = targetSize + projSize;
        const combinedRadiusSquared = combinedRadius * combinedRadius;

        distCheckVector.set(target.pos.x - proj.pos.x, target.pos.y - proj.pos.y);
        return distCheckVector.magSq() <= combinedRadiusSquared;
    }

    /**
     * Check and handle projectile collision with asteroids
     * @private
     */
    _checkProjectileAsteroidCollision(proj, i, distCheckVector, asteroidCount) {
        for (let j = asteroidCount - 1; j >= 0; j--) {
            const asteroid = this.asteroids[j];
            if (!asteroid || asteroid.isDestroyed()) continue;

            if (this._checkProjectileBroadphase(proj, asteroid, distCheckVector) && asteroid.checkCollision(proj)) {
                asteroid.takeDamage(proj.damage || 1, proj.owner, this);
                this.removeProjectile(i);
                this.addExplosion(proj.pos.x, proj.pos.y, 10, [255, 120, 20]);
                return true;
            }
        }
        return false;
    }

    /**
     * Check and handle projectile collision with space objects
     * @private
     */
    _checkProjectileSpaceObjectCollision(proj, i, distCheckVector) {
        if (!this.spaceObjects || !this.spaceObjects.length) return false;

        for (let j = this.spaceObjects.length - 1; j >= 0; j--) {
            const so = this.spaceObjects[j];
            const soDestroyed = so && (typeof so.isDestroyed === 'function' ? so.isDestroyed() : !!so.destroyed);
            if (!so || soDestroyed) continue;

            if (this._checkProjectileBroadphase(proj, so, distCheckVector) && so.checkCollision && so.checkCollision(proj)) {
                try { so.takeDamage(proj.damage || 1, proj.owner, this); } catch (e) { console.error('Error damaging spaceObject', e); }
                this.removeProjectile(i);
                this.addExplosion(proj.pos.x, proj.pos.y, 8, [200, 100, 255]);
                return true;
            }
        }
        return false;
    }

    /**
     * Check and handle projectile collision with mines
     * @private
     */
    _checkProjectileMineCollision(proj, i, distCheckVector) {
        for (let j = this.mines.length - 1; j >= 0; j--) {
            const mine = this.mines[j];
            if (!mine || mine.destroyed || proj.owner === mine.owner) continue;

            if (this._checkProjectileBroadphase(proj, mine, distCheckVector)) {
                mine.takeDamage(proj.damage || 10, proj.owner, this);
                this.removeProjectile(i);
                this.addExplosion(proj.pos.x, proj.pos.y, 5, [200, 100, 0]);
                return true;
            }
        }
        return false;
    }

    /**
     * Check and handle harpoon collision with cargo
     * @private
     */
    _checkHarpoonCargoCollision(proj, i, distCheckVector) {
        if (!this.cargo || !this.cargo.length) return false;
        if (proj.type !== 'harpoon' && proj.type !== 'HARPOON') return false;

        for (let j = this.cargo.length - 1; j >= 0; j--) {
            const cargoItem = this.cargo[j];
            if (!cargoItem || cargoItem.collected || cargoItem.attached) continue;

            const projSize = proj.size || 3;
            const cargoSize = cargoItem.size || 8;
            const combinedRadius = cargoSize + projSize + Math.max(8, cargoSize * 0.6);
            const combinedRadiusSquared = combinedRadius * combinedRadius;

            distCheckVector.set(cargoItem.pos.x - proj.pos.x, cargoItem.pos.y - proj.pos.y);

            if (distCheckVector.magSq() <= combinedRadiusSquared) {
                try {
                    cargoItem.attached = true;
                    cargoItem.attachedTo = proj.owner || null;
                    cargoItem.attachedBy = 'harpoon';
                    if (cargoItem.vel) { cargoItem.vel.x = 0; cargoItem.vel.y = 0; }
                    this.addExplosion(proj.pos.x, proj.pos.y, 4, [180, 220, 255]);
                    try { if (typeof soundManager !== 'undefined' && soundManager.playWorldSound) soundManager.playWorldSound('harpoonFire', proj.pos.x, proj.pos.y, this.player.pos); } catch (_) { }
                } catch (e) { console.error('Error attaching cargo to harpoon:', e); }
                this.removeProjectile(i);
                return true;
            }
        }
        return false;
    }

    /** 
     * Specifically handles projectile collisions with targets.
     * OPTIMIZED: Uses squared distance checks, reusable vectors, and early exits.
     */
    checkProjectileCollisions() {
        const projCount = this.projectiles.length;
        if (projCount === 0) return; // Early exit if no projectiles

        // Lazy init of reusable vector to avoid object creation in the loop
        if (!this._distCheckVector) this._distCheckVector = createVector(0, 0);

        const distCheckVector = this._distCheckVector;
        // Cache counts to avoid repeated length lookups in hot loops
        const enemyCount = this.enemies.length;
        const asteroidCount = this.asteroids.length;
        const spaceObjectCount = this.spaceObjects ? this.spaceObjects.length : 0;
        const mineCount = this.mines.length;

        // Helper to determine if an active (not-broken) harpoon already links owner->target
        const harpoonExists = (owner, target) => Array.isArray(this.harpoons) && this.harpoons.some(h => h && !h.broken && h.owner === owner && h.target === target);

        // Process projectiles using optimized collision detection
        for (let i = projCount - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj || !proj.pos) {
                console.warn(`Invalid projectile at index ${i}, removing`);
                this.removeProjectile(i);
                continue;
            }

            const projPos = proj.pos;
            const projSize = proj.size || 3;
            let hit = false;

            // Check against various targets using helper methods
            if (this._checkProjectileAsteroidCollision(proj, i, distCheckVector, asteroidCount)) { hit = true; continue; }
            if (!hit && this._checkProjectileSpaceObjectCollision(proj, i, distCheckVector)) { hit = true; continue; }
            if (!hit && this._checkProjectileMineCollision(proj, i, distCheckVector)) { hit = true; continue; }

            // --- Check collisions against missiles (other projectiles) ---
            if (!hit && this.projectiles && this.projectiles.length > 0) {
                for (let j = this.projectiles.length - 1; j >= 0; j--) {
                    if (j === i) continue; // Skip self
                    const other = this.projectiles[j];
                    if (!other || !other.pos || !other._isMissile || other.owner === proj.owner) continue;

                    if (this._checkProjectileBroadphase(proj, other, distCheckVector) && proj.checkCollision(other)) {
                        try {
                            if (typeof other.takeDamage === 'function') {
                                other.takeDamage(proj.damage || 1, proj.owner, this);
                            } else {
                                other.lifespan = 0;
                                other.destroyed = true;
                                this.addExplosion(other.pos.x, other.pos.y, 8, [255, 150, 0]);
                            }
                        } catch (e) { console.error('Error applying damage to missile:', e); }

                        this.removeProjectile(i);
                        this.addExplosion(proj.pos.x, proj.pos.y, 5, [255, 200, 0]);
                        hit = true;
                        break;
                    }
                }
            }

            // Check harpoon-cargo collisions
            if (!hit && this._checkHarpoonCargoCollision(proj, i, distCheckVector)) { hit = true; continue; }
            // For player hits - use quick distance check first
            if (proj.owner instanceof Enemy) {
                const combinedRadius = this.player.size + projSize;
                const combinedRadiusSquared = combinedRadius * combinedRadius;
                distCheckVector.set(this.player.pos.x - projPos.x, this.player.pos.y - projPos.y);

                if (distCheckVector.magSq() <= combinedRadiusSquared && proj.checkCollision(this.player)) {
                    // Harpoon special-case: if an enemy fired a harpoon at the player, spawn a Harpoon tether
                    if (proj.type === 'harpoon' || proj.type === 'HARPOON') {
                        // Ensure owner and target have positions before creating tether
                        const owner = proj.owner;
                        const target = this.player;
                        const ownerHasPos = owner && owner.pos && Number.isFinite(owner.pos.x) && Number.isFinite(owner.pos.y);
                        const targetHasPos = target && target.pos && Number.isFinite(target.pos.x) && Number.isFinite(target.pos.y);

                        if (!ownerHasPos || !targetHasPos) {
                            if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                console.warn('Harpoon spawn skipped: missing anchor positions', {
                                    projType: proj.type,
                                    owner: owner && owner.constructor ? owner.constructor.name : owner,
                                    ownerPos: owner && owner.pos,
                                    targetPos: target && target.pos,
                                    projPos: projPos
                                });
                            }
                            // Remove projectile anyway to avoid lingering projectile
                            this.removeProjectile(i);
                            continue;
                        }

                        try {
                            if (typeof Harpoon !== 'undefined') {
                                if (!harpoonExists(owner, target)) {
                                    const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                    if (!this.harpoons) this.harpoons = [];
                                    this.harpoons.push(har);
                                    if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                        console.log('Harpoon spawned (enemy->player)', { owner: owner.constructor ? owner.constructor.name : owner, target: 'player' });
                                    }
                                } else {
                                    if (typeof window !== 'undefined' && window.HARPOON_DEBUG) console.log('Skipped duplicate harpoon (enemy->player)', { owner: owner && (owner.shipTypeName || owner.id), target: 'player' });
                                }
                            }
                            // small impact visual and sound
                            this.addExplosion(projPos.x, projPos.y, 6, [180, 220, 255]);
                        } catch (e) { console.error('Failed to create Harpoon', e); }
                        this.removeProjectile(i);
                        continue;
                    }

                    // Use centralized hit handler from WeaponSystem
                    WeaponSystem.handleHitEffects(
                        this.player,
                        projPos,
                        proj.damage,
                        proj.owner,
                        this,
                        proj.color
                    );

                    // Apply Tangle effect if it's a tangle projectile
                    if (proj._isTangle && typeof this.player.applyDragEffect === 'function') {
                        this.player.applyDragEffect(
                            proj.tangleDuration || 5.0,
                            proj.dragMultiplier || 10.0,
                            proj.rotationBlockMultiplier || 0.1
                        );

                        // Add visual feedback
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage("Ship caught in energy tangle!", "#30FFB4");
                        }
                    }

                    // Create explosion effect for missile hits
                    if (proj._isMissile) {
                        const explosionColor = Array.isArray(proj.color) ? proj.color :
                            (proj.color && proj.color.levels) ? [proj.color.levels[0], proj.color.levels[1], proj.color.levels[2]] :
                                [255, 150, 0];
                        this.addExplosion(projPos.x, projPos.y, 15, explosionColor);
                    }

                    this.removeProjectile(i);
                    continue;
                }
            }

            // For enemy hits - use spatial partitioning approach
            if (proj.owner instanceof Player) {
                // Get only nearby enemies using pre-check with distance squared
                for (let j = 0; j < enemyCount; j++) {
                    const enemy = this.enemies[j];
                    // Early bailout for invalid or destroyed enemies
                    if (!enemy || !enemy.pos || (typeof enemy.isDestroyed === 'function' && enemy.isDestroyed())) continue;
                    const combinedRadius = enemy.size + projSize;
                    const combinedRadiusSquared = combinedRadius * combinedRadius;
                    distCheckVector.set(enemy.pos.x - projPos.x, enemy.pos.y - projPos.y);

                    if (distCheckVector.magSq() <= combinedRadiusSquared && proj.checkCollision(enemy)) {
                        // Harpoon special-case: spawn a Harpoon tether instead of normal hit
                        if (proj.type === 'harpoon' || proj.type === 'HARPOON') {
                            // Ensure owner and target have positions before creating tether
                            const owner = proj.owner;
                            const target = enemy;
                            const ownerHasPos = owner && owner.pos && Number.isFinite(owner.pos.x) && Number.isFinite(owner.pos.y);
                            const targetHasPos = target && target.pos && Number.isFinite(target.pos.x) && Number.isFinite(target.pos.y);

                            if (!ownerHasPos || !targetHasPos) {
                                if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                    console.warn('Harpoon spawn skipped: missing anchor positions', {
                                        projType: proj.type,
                                        owner: owner && owner.constructor ? owner.constructor.name : owner,
                                        ownerPos: owner && owner.pos,
                                        targetPos: target && target.pos,
                                        projPos: projPos
                                    });
                                }
                                this.removeProjectile(i);
                                break;
                            }

                            try {
                                if (typeof Harpoon !== 'undefined') {
                                    if (!harpoonExists(owner, target)) {
                                        const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                        if (!this.harpoons) this.harpoons = [];
                                        this.harpoons.push(har);
                                        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                            console.log('Harpoon spawned (player->enemy)', { owner: owner.constructor ? owner.constructor.name : owner, target: target.constructor ? target.constructor.name : target });
                                        }
                                    } else {
                                        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) console.log('Skipped duplicate harpoon (player->enemy)', { owner: owner && (owner.shipTypeName || owner.id), target: target && (target.shipTypeName || target.id) });
                                    }
                                }
                                // small impact visual and sound
                                this.addExplosion(projPos.x, projPos.y, 6, [180, 220, 255]);
                            } catch (e) { console.error('Failed to create Harpoon', e); }
                            this.removeProjectile(i);
                            break;
                        }

                        // Use centralized hit handler from WeaponSystem
                        WeaponSystem.handleHitEffects(
                            enemy,
                            projPos,
                            proj.damage,
                            proj.owner,
                            this,
                            proj.color
                        );

                        // Apply Tangle effect if it's a tangle projectile
                        if (proj._isTangle && typeof enemy.applyDragEffect === 'function') {
                            enemy.applyDragEffect(
                                proj.tangleDuration || 5.0,
                                proj.dragMultiplier || 10.0,
                                proj.rotationBlockMultiplier || 0.1
                            );

                            // Add visual feedback for player
                            if (typeof uiManager !== 'undefined') {
                                uiManager.addMessage(`${enemy.shipTypeName} caught in energy tangle!`, "#30FFB4");
                            }
                        }

                        this.removeProjectile(i);
                        break;
                    }
                }
            }

            // For enemy-to-enemy hits (friendly fire)
            if (proj.owner instanceof Enemy) {
                for (let j = 0; j < enemyCount; j++) {
                    const enemy = this.enemies[j];
                    // Early bailout for invalid enemies or self-fire
                    if (!enemy || !enemy.pos || enemy === proj.owner || (typeof enemy.isDestroyed === 'function' && enemy.isDestroyed())) continue;
                    if (proj.checkCollision(enemy)) {
                        // Harpoon special-case: spawn a Harpoon tether between enemies
                        if (proj.type === 'harpoon' || proj.type === 'HARPOON') {
                            const owner = proj.owner;
                            const target = enemy;
                            const ownerHasPos = owner && owner.pos && Number.isFinite(owner.pos.x) && Number.isFinite(owner.pos.y);
                            const targetHasPos = target && target.pos && Number.isFinite(target.pos.x) && Number.isFinite(target.pos.y);

                            if (!ownerHasPos || !targetHasPos) {
                                if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                    console.warn('Harpoon spawn skipped (enemy->enemy): missing anchor positions', {
                                        projType: proj.type,
                                        owner: owner && owner.constructor ? owner.constructor.name : owner,
                                        ownerPos: owner && owner.pos,
                                        targetPos: target && target.pos,
                                        projPos: proj.pos
                                    });
                                }
                                this.removeProjectile(i);
                                break;
                            }

                            try {
                                if (typeof Harpoon !== 'undefined') {
                                    if (!harpoonExists(owner, target)) {
                                        const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                        if (!this.harpoons) this.harpoons = [];
                                        this.harpoons.push(har);
                                        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                            console.log('Harpoon spawned (enemy->enemy)', { owner: owner.constructor ? owner.constructor.name : owner, target: target.constructor ? target.constructor.name : target });
                                        }
                                    } else {
                                        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) console.log('Skipped duplicate harpoon (enemy->enemy)', { owner: owner && (owner.shipTypeName || owner.id), target: target && (target.shipTypeName || target.id) });
                                    }
                                }
                                this.addExplosion(proj.pos.x, proj.pos.y, 6, [180, 220, 255]);
                            } catch (e) { console.error('Failed to create Harpoon (enemy->enemy)', e); }
                            this.removeProjectile(i);
                            hit = true;
                            break;
                        }

                        // Use centralized hit handler from WeaponSystem for other projectile types
                        WeaponSystem.handleHitEffects(
                            enemy,
                            proj.pos,
                            proj.damage / 2, // Reduce damage for friendly fire
                            proj.owner,
                            this,
                            proj.color
                        );

                        // Apply Tangle effect if it's a tangle projectile
                        if (proj._isTangle && typeof enemy.applyDragEffect === 'function') {
                            enemy.applyDragEffect(
                                (proj.tangleDuration || 5.0),
                                (proj.dragMultiplier || 10.0),
                                (proj.rotationBlockMultiplier || 0.1)
                            );
                        }

                        this.removeProjectile(i);
                        hit = true;          // mark that we've handled this projectile
                        break;
                    }
                }
            }
        }
    } // End checkProjectileCollisions

    /**
     * Handles player collecting cargo in the system
     */
    handleCargoCollection() {
        if (!this.player || !this.player.pos || !this.cargo || this.cargo.length === 0) return;

        for (let i = this.cargo.length - 1; i >= 0; i--) {
            const cargoItem = this.cargo[i];

            // Skip if invalid, already collected, or expired
            if (!cargoItem || !cargoItem.pos || !cargoItem.type) {
                console.warn(`Invalid cargo item at index ${i}, removing`);
                this._fastRemove(this.cargo, i);
                continue;
            }

            if (cargoItem.collected) continue;

            if (cargoItem.isExpired && cargoItem.isExpired()) {
                CARGO_LOG(`[Cargo Expired] Removing ${cargoItem.type}x${cargoItem.quantity} during collection check`);
                // Remove any HUD/minimap marker associated with this cargo before removing
                try {
                    if (cargoItem.eventMarkerId && typeof uiManager !== 'undefined' && typeof uiManager.removeEventMarker === 'function') {
                        uiManager.removeEventMarker(cargoItem.eventMarkerId);
                    }
                } catch (e) { }
                this._fastRemove(this.cargo, i);
                continue;
            }

            // Check collision directly without unnecessary sqrt calculation
            const isColliding = cargoItem.checkCollision(this.player); // Use the cargo's collision check


            if (isColliding) {
                // Attempt to add cargo to player
                // Pass cargoItem.type (which holds the name string) to player.addCargo
                const addResult = this.player.addCargo(cargoItem.type, cargoItem.quantity, true); // Allow partial adds

                // --- Log Add Attempt ---
                //console.log(`  Add Attempt Result: Success=${addResult.success}, Added=${addResult.added}, Reason=${addResult.reason || 'N/A'}`);
                // ---

                if (addResult.success) {
                    // Play pickup sound
                    if (typeof soundManager !== 'undefined') {
                        soundManager.playSound('pickupCoin'); // Use a suitable sound
                    }
                    // Optional: Add UI message
                    if (typeof uiManager !== 'undefined') {
                        uiManager.addMessage(`Collected ${addResult.added}t ${cargoItem.type}`);
                    }

                    // Special: Alien Artifact grants credits on pickup
                    try {
                        if (cargoItem.type === 'Alien Artifact' && this.player && typeof this.player.addCredits === 'function') {
                            this.player.addCredits(5000);
                            if (typeof uiManager !== 'undefined') uiManager.addMessage('+5000cr (Alien Artifact)', 'magenta');
                            console.log('Alien Artifact collected: awarded 5000 credits to player');
                        }
                    } catch (e) { console.error('Error granting Alien Artifact reward:', e); }

                    // If the full quantity wasn't added (partial add), update the cargo item's quantity
                    if (addResult.added < cargoItem.quantity) {
                        cargoItem.quantity -= addResult.added;
                        cargoItem.collected = false; // Keep it in the world if partially collected
                        //console.log(`  Partial pickup: Remaining ${cargoItem.quantity}t of ${cargoItem.type}`);
                    } else {
                        // Only mark as fully collected if the entire quantity was added
                        cargoItem.collected = true;
                        // Remove HUD/minimap marker for this cargo
                        try {
                            if (cargoItem.eventMarkerId && typeof uiManager !== 'undefined' && typeof uiManager.removeEventMarker === 'function') {
                                uiManager.removeEventMarker(cargoItem.eventMarkerId);
                            }
                        } catch (e) { }
                        // Since it's fully collected, remove it immediately from the system
                        this._fastRemove(this.cargo, i);
                        //console.log(`  Full pickup: Removed ${cargoItem.type}x${cargoItem.quantity}`);
                    }
                } else {
                    // Show cargo full message if needed
                    if (addResult.reason === 'CARGO_FULL' && typeof uiManager !== 'undefined') {
                        uiManager.addMessage(`Cargo hold full!`, [255, 200, 0]);
                    }
                }
            }
        }
    }

    /** Adds a projectile to the system's list. */
    addProjectile(proj) {
        if (proj) {
            proj.system = this;
            this.projectiles.push(proj);
        }
    }

    /** Removes a projectile and returns it to the pool if possible */
    removeProjectile(i) {
        // Return projectile to pool before splicing if WeaponSystem is available
        if (this.projectiles[i] && typeof WeaponSystem !== 'undefined') {
            WeaponSystem.releaseProjectile(this.projectiles[i]);
        }
        // Use fast array removal technique - swap with last element then pop if not last element
        const lastIndex = this.projectiles.length - 1;
        if (i !== lastIndex) {
            this.projectiles[i] = this.projectiles[lastIndex];
        }
        this.projectiles.pop(); // Much faster than splice for large arrays
    }

    /** Adds a beam to the system's list. */
    addBeam(beam) { if (beam) this.beams.push(beam); }

    /** Adds a mine to the system's list. */
    addMine(mine) {
        if (mine) {
            mine.system = this;
            this.mines.push(mine);
        }
    }

    /** Adds a force wave to the system's list. */
    addForceWave(wave) { if (wave) this.forceWaves.push(wave); }

    /** Adds a cargo item to the system's cargo array */
    addCargo(cargo) {
        if (!this.cargo) this.cargo = [];

        if (cargo) {
            this.cargo.push(cargo);
            CARGO_LOG(`Cargo added to system ${this.name}: ${cargo.type} x${cargo.quantity}`);
            return true;
        }
        return false;
    }

    /**
     * ==========================================================================
     * RENDERING & DRAWING
     * ==========================================================================
     */

    /** 
     * Draws background stars using progressive tile-based rendering.
     * Supports worker-based offscreen generation for optimal performance.
     */
    drawBackground() {
        // Clear background with dark space color (deep dark blue, not pure black)
        const bg = STARFIELD_CONFIG.BACKGROUND_COLOR;
        fill(bg.r, bg.g, bg.b);
        noStroke();
        rect(-width * 2, -height * 2, width * 4, height * 4);

        // Always use progressive tile-based rendering (worker-driven)
        this._drawProgressiveStarfield();

        // Draw spectacular stars (animated phenomena) - these are rare and change over time
        // so they're drawn directly each frame, but only in visible area
        this._drawSpectacularStarsOverlay();
    }

    /**
     * Sets the starfield rendering mode.
     * @param {string} mode - 'progressive', 'buffered', or 'legacy'
     */
    setStarfieldRenderMode(mode) {
        // Progressive tile-based rendering is the only supported mode.
        this._starfieldRenderMode = 'progressive';
        this.resetStarfieldBuffer();
    }

    /**
     * Progressive starfield rendering - generates tiles incrementally over multiple frames.
     * Never shows black background by falling back to direct rendering for uncached tiles.
     * @private
     */
    _drawProgressiveStarfield() {
        if (!this.player || !this.player.pos) return;

        const tileSize = this._starfieldTileSize;
        const playerX = this.player.pos.x;
        const playerY = this.player.pos.y;

        // Track player velocity for predictive loading
        if (this.player.vel) {
            this._starfieldLastPlayerVelX = this.player.vel.x || 0;
            this._starfieldLastPlayerVelY = this.player.vel.y || 0;
        }

        // Calculate visible tile range with some padding
        const padding = tileSize; // One tile extra on each side
        const left = playerX - width / 2 - padding;
        const right = playerX + width / 2 + padding;
        const top = playerY - height / 2 - padding;
        const bottom = playerY + height / 2 + padding;

        const startTileX = Math.floor(left / tileSize);
        const endTileX = Math.ceil(right / tileSize);
        const startTileY = Math.floor(top / tileSize);
        const endTileY = Math.ceil(bottom / tileSize);

        // Update tile last-used timestamps and identify missing tiles
        const currentTime = millis();
        const missingTiles = [];

        for (let tx = startTileX; tx <= endTileX; tx++) {
            for (let ty = startTileY; ty <= endTileY; ty++) {
                const key = `${tx},${ty}`;
                const tile = this._starfieldTiles.get(key);

                if (tile && tile.buffer) {
                    // Update last used time
                    tile.lastUsed = currentTime;
                    // Draw the cached tile
                    image(tile.buffer, tx * tileSize, ty * tileSize);
                } else if (tile && tile.pending) {
                    // Tile is being generated by worker - draw directly for this frame
                    // but don't re-queue it
                    this._drawStarsDirectlyForTile(tx, ty, tileSize);
                } else {
                    // Tile is missing - draw directly for this frame and queue for generation
                    this._drawStarsDirectlyForTile(tx, ty, tileSize);
                    missingTiles.push({ tx, ty, key });
                }
            }
        }

        // Add missing tiles to queue (prioritize by proximity to player and direction of travel)
        this._queueTilesForGeneration(missingTiles, playerX, playerY);

        // Process tile generation queue (limited per frame for smoothness)
        this._processTileQueue();

        // Predictive loading: queue tiles ahead of player movement
        this._queuePredictiveTiles(playerX, playerY, startTileX, endTileX, startTileY, endTileY);

        // Cleanup old tiles to manage memory
        this._cleanupOldTiles(currentTime);
    }

    /**
     * Draws stars directly for a single tile area (fallback when tile not cached).
     * This prevents black backgrounds by rendering stars immediately when a tile
     * hasn't been pre-generated. The tile will be queued for background generation
     * and cached for future frames.
     * @param {number} tx - Tile X coordinate
     * @param {number} ty - Tile Y coordinate
     * @param {number} tileSize - Size of the tile
     * @private
     */
    _drawStarsDirectlyForTile(tx, ty, tileSize) {
        const left = tx * tileSize;
        const right = left + tileSize;
        const top = ty * tileSize;
        const bottom = top + tileSize;

        const currentMillis = millis();
        const pixelRatio = typeof pixelDensity === 'function' ? pixelDensity() : 1;
        const baseStarSize = Math.max(1, pixelRatio * 0.6);

        // Draw both star layers for this tile
        this.drawStarLayer(left, right, top, bottom, {
            gridSize: 45,
            maxStarsPerCell: 3,
            sizeRange: [baseStarSize * 0.5, baseStarSize * 1.5],
            brightnessRange: [80, 160],
            colorTypes: ['white', 'white', 'white', 'blue', 'yellow']
        }, currentMillis);

        this.drawStarLayer(left, right, top, bottom, {
            gridSize: 200,
            maxStarsPerCell: 1,
            sizeRange: [baseStarSize * 2.0, baseStarSize * 4.0],
            brightnessRange: [180, 255],
            colorTypes: ['white', 'white', 'blue', 'yellow', 'red']
        }, currentMillis);
    }

    /**
     * Queues tiles for background generation, prioritizing by distance and direction.
     * @param {Array} tiles - Array of {tx, ty, key} objects
     * @param {number} playerX - Player X position
     * @param {number} playerY - Player Y position
     * @private
     */
    _queueTilesForGeneration(tiles, playerX, playerY) {
        const tileSize = this._starfieldTileSize;
        const velX = this._starfieldLastPlayerVelX;
        const velY = this._starfieldLastPlayerVelY;

        // Calculate priority for each tile
        const tilesWithPriority = tiles.map(t => {
            const tileCenterX = (t.tx + 0.5) * tileSize;
            const tileCenterY = (t.ty + 0.5) * tileSize;

            // Base priority on distance from player
            const dx = tileCenterX - playerX;
            const dy = tileCenterY - playerY;
            const dist = Math.sqrt(dx * dx + dy * dy);

            // Boost priority for tiles in direction of travel
            let directionBoost = 0;
            if (velX !== 0 || velY !== 0) {
                const velMag = Math.sqrt(velX * velX + velY * velY);
                if (velMag > 0.1) {
                    const dotProduct = (dx * velX + dy * velY) / (dist * velMag);
                    directionBoost = dotProduct > 0 ? dotProduct * STARFIELD_CONFIG.DIRECTION_BOOST : 0;
                }
            }

            return {
                ...t,
                priority: dist - directionBoost // Lower is better
            };
        });

        // Sort by priority and add to queue (avoid duplicates)
        tilesWithPriority.sort((a, b) => a.priority - b.priority);

        for (const tile of tilesWithPriority) {
            // Check if already in queue or already cached (including pending tiles)
            const alreadyQueued = this._starfieldTileQueue.some(q => q.key === tile.key);
            const existingTile = this._starfieldTiles.get(tile.key);
            // Skip if already queued, already cached, or pending generation
            if (!alreadyQueued && !existingTile) {
                this._starfieldTileQueue.push(tile);
            }
        }

        // Limit queue size
        if (this._starfieldTileQueue.length > this._starfieldMaxCachedTiles * 2) {
            this._starfieldTileQueue.length = this._starfieldMaxCachedTiles * 2;
        }
    }

    /**
     * Queues tiles ahead of player movement for predictive loading.
     * @private
     */
    _queuePredictiveTiles(playerX, playerY, startTileX, endTileX, startTileY, endTileY) {
        const tileSize = this._starfieldTileSize;
        const velX = this._starfieldLastPlayerVelX;
        const velY = this._starfieldLastPlayerVelY;

        // Only predict if moving reasonably fast
        const velMag = Math.sqrt(velX * velX + velY * velY);
        if (velMag < 2) return;

        // Predict position ahead based on current velocity
        const predictX = playerX + velX * STARFIELD_CONFIG.PREDICTION_FRAMES;
        const predictY = playerY + velY * STARFIELD_CONFIG.PREDICTION_FRAMES;

        // Calculate predicted tile range
        const padding = tileSize;
        const predLeft = predictX - width / 2 - padding;
        const predRight = predictX + width / 2 + padding;
        const predTop = predictY - height / 2 - padding;
        const predBottom = predictY + height / 2 + padding;

        const predStartX = Math.floor(predLeft / tileSize);
        const predEndX = Math.ceil(predRight / tileSize);
        const predStartY = Math.floor(predTop / tileSize);
        const predEndY = Math.ceil(predBottom / tileSize);

        // Queue tiles that are in predicted range but not in current range
        const predictiveTiles = [];
        for (let tx = predStartX; tx <= predEndX; tx++) {
            for (let ty = predStartY; ty <= predEndY; ty++) {
                // Skip if already visible
                if (tx >= startTileX && tx <= endTileX && ty >= startTileY && ty <= endTileY) {
                    continue;
                }

                const key = `${tx},${ty}`;
                if (!this._starfieldTiles.has(key)) {
                    predictiveTiles.push({ tx, ty, key });
                }
            }
        }

        // Queue predictive tiles with low priority
        for (const tile of predictiveTiles) {
            const alreadyQueued = this._starfieldTileQueue.some(q => q.key === tile.key);
            if (!alreadyQueued) {
                this._starfieldTileQueue.push({ ...tile, priority: 10000 });
            }
        }
    }

    /**
     * Processes the tile generation queue, generating a limited number per frame.
     * @private
     */
    _processTileQueue() {
        const maxPerFrame = this._starfieldMaxTilesPerFrame;
        let generated = 0;

        while (this._starfieldTileQueue.length > 0 && generated < maxPerFrame) {
            const tile = this._starfieldTileQueue.shift();

            // Skip if already generated
            if (this._starfieldTiles.has(tile.key)) continue;

            // Generate the tile
            this._generateTile(tile.tx, tile.ty);
            generated++;
        }
    }

    /**
     * Generates a single starfield tile and caches it.
     * @param {number} tx - Tile X coordinate
     * @param {number} ty - Tile Y coordinate
     * @private
     */
    _generateTile(tx, ty) {
        const tileSize = this._starfieldTileSize;
        const key = `${tx},${ty}`;
        // Mark as pending to avoid duplicate requests
        this._starfieldTiles.set(key, { buffer: null, lastUsed: millis(), pending: true });

        // If worker available, request generation off-main-thread
        if (STARFIELD_TILE_WORKER) {
            try {
                STARFIELD_TILE_WORKER.postMessage({ cmd: 'generateTile', tx, ty, tileSize, systemIndex: this.systemIndex }, []);
                return;
            } catch (e) {
                // Fall through to main-thread generation on error
            }
        }

        // Fallback: main-thread generation (existing logic)
        const buffer = createGraphics(tileSize, tileSize);
        const bg = STARFIELD_CONFIG.BACKGROUND_COLOR;
        buffer.background(bg.r, bg.g, bg.b);
        buffer.noStroke();

        // Calculate world bounds for this tile
        const worldLeft = tx * tileSize;
        const worldRight = worldLeft + tileSize;
        const worldTop = ty * tileSize;
        const worldBottom = worldTop + tileSize;

        // Resolution-independent base sizing
        const pixelRatio = typeof pixelDensity === 'function' ? pixelDensity() : 1;
        const baseStarSize = Math.max(1, pixelRatio * 0.6);

        // Render Layer 1: Background stars
        this._drawStarLayerToTileBuffer(buffer, worldLeft, worldRight, worldTop, worldBottom, tx, ty, {
            gridSize: 45,
            maxStarsPerCell: 3,
            sizeRange: [baseStarSize * 0.5, baseStarSize * 1.5],
            brightnessRange: [80, 160],
            colorTypes: ['white', 'white', 'white', 'blue', 'yellow']
        });

        // Render Layer 2: Rare bright feature stars
        this._drawStarLayerToTileBuffer(buffer, worldLeft, worldRight, worldTop, worldBottom, tx, ty, {
            gridSize: 200,
            maxStarsPerCell: 1,
            sizeRange: [baseStarSize * 2.0, baseStarSize * 4.0],
            brightnessRange: [180, 255],
            colorTypes: ['white', 'white', 'blue', 'yellow', 'red']
        });

        // Store the tile
        this._starfieldTiles.set(key, {
            buffer: buffer,
            lastUsed: millis()
        });

        if (STAR_SYSTEM_DEBUG) {
            console.log(`Generated starfield tile at (${tx}, ${ty})`);
        }
    }

    /**
     * Draws a layer of stars to a tile buffer.
     * @private
     */
    _drawStarLayerToTileBuffer(buffer, worldLeft, worldRight, worldTop, worldBottom, tileX, tileY, config) {
        const tileSize = this._starfieldTileSize;
        const gridSize = config.gridSize;
        const systemSeed = this.systemIndex * 1337;

        // Pre-define colors
        const colors = {
            white: [255, 255, 255],
            blue: [200, 220, 255],
            yellow: [255, 250, 200],
            red: [255, 200, 180]
        };

        // Integer math for grid coordinates
        const startGX = Math.floor(worldLeft / gridSize);
        const endGX = Math.ceil(worldRight / gridSize);
        const startGY = Math.floor(worldTop / gridSize);
        const endGY = Math.ceil(worldBottom / gridSize);

        // Extract config values for faster access
        const { maxStarsPerCell, sizeRange, brightnessRange, colorTypes } = config;
        const minSize = sizeRange[0];
        const sizeDiff = sizeRange[1] - minSize;
        const minBright = brightnessRange[0];
        const brightDiff = brightnessRange[1] - minBright;
        const typesLen = colorTypes.length;

        // Calculate buffer offset
        const bufferOffsetX = worldLeft;
        const bufferOffsetY = worldTop;

        // Reuse variables
        let rng, cellSeed, starCount, worldX, worldY, bufferX, bufferY;
        let size, brightness, colorType, baseColor, r, g, b;

        for (let gx = startGX; gx <= endGX; gx++) {
            const gxSeed = (gx * 73856093) >>> 0;

            for (let gy = startGY; gy <= endGY; gy++) {
                cellSeed = (gxSeed ^ (gy * 19349663) ^ (systemSeed * 83492791)) >>> 0;
                rng = cellSeed;

                // Skip check
                rng = (rng * 1664525 + 1013904223) >>> 0;
                if ((rng / 4294967296) > ((gridSize > 100) ? 0.85 : 0.7)) continue;

                // Star count
                rng = (rng * 1664525 + 1013904223) >>> 0;
                starCount = Math.floor((rng / 4294967296) * maxStarsPerCell) + 1;

                for (let i = 0; i < starCount; i++) {
                    // World X
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    worldX = gx * gridSize + ((rng / 4294967296) - 0.5) * gridSize * 2;

                    // World Y
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    worldY = gy * gridSize + ((rng / 4294967296) - 0.5) * gridSize * 2;

                    // Convert world coords to buffer coords
                    bufferX = worldX - bufferOffsetX;
                    bufferY = worldY - bufferOffsetY;

                    // Skip if outside tile bounds (with small margin)
                    if (bufferX < -5 || bufferX > tileSize + 5 ||
                        bufferY < -5 || bufferY > tileSize + 5) {
                        continue;
                    }

                    // Size
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    size = minSize + (rng / 4294967296) * sizeDiff;

                    // Brightness
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    brightness = minBright + (rng / 4294967296) * brightDiff;

                    if (size < 2) {
                        brightness = (brightness * 1.4 > 255) ? 255 : brightness * 1.4;
                    }

                    // Color
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    colorType = colorTypes[Math.floor((rng / 4294967296) * typesLen)];
                    baseColor = colors[colorType];

                    // Apply brightness
                    const brightnessFactor = brightness / 255;
                    r = baseColor[0] * brightnessFactor;
                    g = baseColor[1] * brightnessFactor;
                    b = baseColor[2] * brightnessFactor;

                    buffer.fill(r, g, b);

                    if (size <= 2) {
                        buffer.square(bufferX, bufferY, (size < 1 ? 1 : Math.round(size)));
                    } else {
                        buffer.ellipse(bufferX, bufferY, size, size);

                        // Glow effect for large bright stars
                        if (brightness > 200 && size > 3) {
                            buffer.fill(r, g, b, 40);
                            buffer.ellipse(bufferX, bufferY, size * 1.5, size * 1.5);
                        }
                    }
                }
            }
        }
    }

    /**
     * Cleans up old tiles that haven't been used recently.
     * @param {number} currentTime - Current timestamp
     * @private
     */
    _cleanupOldTiles(currentTime) {
        // Only cleanup periodically
        if (!this._lastTileCleanup) this._lastTileCleanup = 0;
        if (currentTime - this._lastTileCleanup < STARFIELD_CONFIG.CLEANUP_INTERVAL_MS) return;
        this._lastTileCleanup = currentTime;

        // If we're under the limit, don't cleanup
        if (this._starfieldTiles.size <= this._starfieldMaxCachedTiles) return;

        // Build list of tiles with their age
        const tiles = [];
        for (const [key, tile] of this._starfieldTiles.entries()) {
            tiles.push({ key, age: currentTime - tile.lastUsed, buffer: tile.buffer });
        }

        // Sort by age (oldest first)
        tiles.sort((a, b) => b.age - a.age);

        // Remove oldest tiles until we're under the limit
        const toRemove = tiles.length - this._starfieldMaxCachedTiles;
        for (let i = 0; i < toRemove; i++) {
            const tile = tiles[i];
            try { tile.buffer.remove(); } catch (e) { }
            this._starfieldTiles.delete(tile.key);
        }

        if (STAR_SYSTEM_DEBUG && toRemove > 0) {
            console.log(`Cleaned up ${toRemove} old starfield tiles`);
        }
    }

    /**
     * Draws spectacular star phenomena as an overlay.
     * These are animated and drawn directly each frame in the visible area only.
     * Note: Starfield uses progressive tile-based rendering for performance.
     * Tiles are generated on-demand and cached for reuse.
     * @private
     */
    _drawSpectacularStarsOverlay() {
        // Safety check for player position
        if (!this.player || !this.player.pos) return;

        const currentMillis = millis();
        const padding = 100;
        const playerX = this.player.pos.x;
        const playerY = this.player.pos.y;

        const left = playerX - width / 2 - padding;
        const right = playerX + width / 2 + padding;
        const top = playerY - height / 2 - padding;
        const bottom = playerY + height / 2 + padding;

        const pixelRatio = typeof pixelDensity === 'function' ? pixelDensity() : 1;
        const baseStarSize = Math.max(1, pixelRatio * 0.6);

        this.drawSpectacularStars(left, right, top, bottom, baseStarSize, currentMillis);
    }

    /**
     * Draws a single star layer within the specified bounds.
     * Uses deterministic procedural generation based on grid cells.
     * Optimized with inlined random number generation and minimal object allocation.
     */
    drawStarLayer(left, right, top, bottom, config, currentMillis) {
        const gridSize = config.gridSize;
        const systemSeed = this.systemIndex * 1337;

        // Pre-define colors to avoid object creation inside loops
        // Using Int16Array or simple vars is faster, but object lookup is optimized enough in V8
        // providing we don't recreate the object every frame
        const colors = {
            white: [255, 255, 255],
            blue: [200, 220, 255],
            yellow: [255, 250, 200],
            red: [255, 200, 180]
        };

        // Integer math for grid coordinates is faster
        const startGX = Math.floor(left / gridSize);
        const endGX = Math.ceil(right / gridSize);
        const startGY = Math.floor(top / gridSize);
        const endGY = Math.ceil(bottom / gridSize);

        noStroke();

        // Extract config values to local variables for faster access inside loop
        const { maxStarsPerCell, sizeRange, brightnessRange, colorTypes } = config;
        const minSize = sizeRange[0];
        const sizeDiff = sizeRange[1] - minSize;
        const minBright = brightnessRange[0];
        const brightDiff = brightnessRange[1] - minBright;
        const typesLen = colorTypes.length;

        // Reuse variables to avoid GC
        let rng, cellSeed, starCount, worldX, worldY;
        let size, brightness, colorType, baseColor, r, g, b;

        for (let gx = startGX; gx <= endGX; gx++) {
            // Cache the X part of the seed calculation
            const gxSeed = (gx * 73856093) >>> 0;

            for (let gy = startGY; gy <= endGY; gy++) {

                // Deterministic random seed
                cellSeed = (gxSeed ^ (gy * 19349663) ^ (systemSeed * 83492791)) >>> 0;
                rng = cellSeed;

                // INLINED fastRandom() logic
                // 1. Skip Check
                rng = (rng * 1664525 + 1013904223) >>> 0;
                if ((rng / 4294967296) > ((gridSize > 100) ? 0.85 : 0.7)) continue;

                // 2. Star Count
                rng = (rng * 1664525 + 1013904223) >>> 0;
                starCount = Math.floor((rng / 4294967296) * maxStarsPerCell) + 1;

                for (let i = 0; i < starCount; i++) {
                    // 3. World X
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    worldX = gx * gridSize + ((rng / 4294967296) - 0.5) * gridSize * 2;

                    // 4. World Y
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    worldY = gy * gridSize + ((rng / 4294967296) - 0.5) * gridSize * 2;

                    // 5. Size
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    size = minSize + (rng / 4294967296) * sizeDiff;

                    // 6. Brightness
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    brightness = minBright + (rng / 4294967296) * brightDiff;

                    if (size < 2) {
                        brightness = (brightness * 1.4 > 255) ? 255 : brightness * 1.4;
                    }

                    // 7. Color
                    rng = (rng * 1664525 + 1013904223) >>> 0;
                    colorType = colorTypes[Math.floor((rng / 4294967296) * typesLen)];
                    baseColor = colors[colorType];

                    // Apply brightness
                    const brightnessFactor = brightness / 255;
                    r = baseColor[0] * brightnessFactor;
                    g = baseColor[1] * brightnessFactor;
                    b = baseColor[2] * brightnessFactor;

                    fill(r, g, b);

                    if (size <= 2) {
                        // Use square instead of rect for slight optimization
                        square(worldX, worldY, (size < 1 ? 1 : Math.round(size)));
                    } else {
                        ellipse(worldX, worldY, size, size);

                        // Glow effect - Only for stars that are large AND bright
                        if (brightness > 200 && size > 3) {
                            fill(r, g, b, 40);
                            ellipse(worldX, worldY, size * 1.5, size * 1.5);
                        }
                    }

                    // Twinkling effect
                    // Optimization: Pre-check logic before calculating sin/cos
                    if (size > 4 && brightness > 180) {
                        // Use cached currentMillis
                        const twinkle = 0.3 + 0.4 * Math.sin(currentMillis * 0.005 + worldX * 0.01 + worldY * 0.01);
                        fill(r, g, b, brightness * twinkle * 0.3);

                        const twinkleSize = size * 0.3;
                        rect(worldX - size, worldY - twinkleSize / 2, size * 2, twinkleSize);
                        rect(worldX - twinkleSize / 2, worldY - size, twinkleSize, size * 2);
                    }
                }
            }
        }
    }

    drawSpectacularStars(left, right, top, bottom, baseStarSize, currentMillis) {
        const gridSize = 400;
        const systemSeed = this.systemIndex * 1337;

        // Integer math
        const startGX = Math.floor(left / gridSize);
        const endGX = Math.ceil(right / gridSize);
        const startGY = Math.floor(top / gridSize);
        const endGY = Math.ceil(bottom / gridSize);

        // Helper for specific RNG needs inside phenomena
        // (We can't easily inline this in the sub-functions, so we pass a simple generator)
        // Using a shared object reduces allocation
        const rngState = { val: 0 };
        const nextRand = () => {
            rngState.val = (rngState.val * 1664525 + 1013904223) >>> 0;
            return (rngState.val >>> 0) / 4294967296;
        };

        for (let gx = startGX; gx <= endGX; gx++) {
            // Cache X seed
            const gxSeed = (gx * 73856093) >>> 0;

            for (let gy = startGY; gy <= endGY; gy++) {

                const cellSeed = (gxSeed ^ (gy * 19349663) ^ (systemSeed * 83492791)) >>> 0;
                rngState.val = cellSeed; // Reset RNG for this cell

                if (nextRand() > 0.05) continue;

                const worldX = gx * gridSize + (nextRand() - 0.5) * gridSize * 1.5;
                const worldY = gy * gridSize + (nextRand() - 0.5) * gridSize * 1.5;

                // Strict culling for expensive spectacular stars
                // We do this check here because the drawing functions are heavy
                if (worldX < left || worldX > right || worldY < top || worldY > bottom) continue;

                const phenomType = nextRand();

                // Pass cached currentMillis to avoid calling millis() inside sub-functions
                if (phenomType < 0.3) {
                    this.drawSupernova(worldX, worldY, baseStarSize, nextRand, currentMillis);
                } else if (phenomType < 0.5) {
                    this.drawNeutronStar(worldX, worldY, baseStarSize, nextRand, currentMillis);
                } else if (phenomType < 0.7) {
                    this.drawBinaryStar(worldX, worldY, baseStarSize, nextRand, currentMillis);
                } else if (phenomType < 0.85) {
                    this.drawNebulaStar(worldX, worldY, baseStarSize, nextRand, currentMillis);
                } else {
                    this.drawGiantStar(worldX, worldY, baseStarSize, nextRand, currentMillis);
                }
            }
        }
    }

    drawSupernova(x, y, baseSize, rng, timeMs) {
        const time = timeMs * 0.003;
        const phase = Math.sin(time + x * 0.01 + y * 0.01);

        const coreSize = baseSize * (3 + phase * 0.5);
        fill(255, 255, 255);
        ellipse(x, y, coreSize, coreSize);

        for (let ring = 1; ring <= 3; ring++) {
            const ringSize = coreSize * (1.5 + ring * 0.8 + phase * 0.3);
            const opacity = 80 / ring;

            if (ring === 1) fill(255, 200, 150, opacity);
            else if (ring === 2) fill(255, 100, 100, opacity);
            else fill(150, 50, 200, opacity);

            ellipse(x, y, ringSize, ringSize);
        }

        stroke(255, 150, 100, 60);
        strokeWeight(1);
        const baseLen = baseSize * (8 + phase * 2);
        for (let i = 0; i < 8; i++) {
            const angle = (i * 0.785) + time * 0.5; // 0.785 is PI/4
            line(x, y, x + Math.cos(angle) * baseLen, y + Math.sin(angle) * baseLen);
        }
        noStroke();
    }

    drawNeutronStar(x, y, baseSize, rng, timeMs) {
        const time = timeMs * 0.003;
        const pulse = 0.8 + 0.2 * Math.sin(time * 1.5 + x * 0.01);

        fill(180, 200, 230, 200 * pulse);
        const s = baseSize * 1.5 * pulse;
        ellipse(x, y, s, s);

        if (pulse > 0.9) {
            stroke(120, 150, 200, 60);
            strokeWeight(1);

            const beamLength = baseSize * 6;
            const beamAngle = time * 0.5 + x * 0.002;
            const cosA = Math.cos(beamAngle);
            const sinA = Math.sin(beamAngle);

            line(x + cosA * baseSize, y + sinA * baseSize,
                x + cosA * beamLength, y + sinA * beamLength);
            line(x - cosA * baseSize, y - sinA * baseSize,
                x - cosA * beamLength, y - sinA * beamLength);
        }
        noStroke();
    }

    drawBinaryStar(x, y, baseSize, rng, timeMs) {
        const time = timeMs * 0.002;
        const orbitRadius = baseSize * 4;
        const angle = time + x * 0.01 + y * 0.01;
        const cosA = Math.cos(angle);
        const sinA = Math.sin(angle);

        const star1X = x + cosA * orbitRadius * 0.6;
        const star1Y = y + sinA * orbitRadius * 0.6;
        fill(255, 240, 180);
        ellipse(star1X, star1Y, baseSize * 3, baseSize * 3);

        const star2X = x - cosA * orbitRadius * 0.4;
        const star2Y = y - sinA * orbitRadius * 0.4;
        fill(180, 200, 255);
        ellipse(star2X, star2Y, baseSize * 2, baseSize * 2);

        stroke(255, 150, 100, 100);
        strokeWeight(1);
        // Reduced steps from 10 to 6 for performance without visual loss
        const steps = 6;
        const invSteps = 1 / steps;
        for (let i = 0; i < steps; i++) {
            const t = i * invSteps;
            const streamX = lerp(star1X, star2X, t) + Math.sin(time * 2 + t * Math.PI) * baseSize * 0.5;
            const streamY = lerp(star1Y, star2Y, t) + Math.cos(time * 2 + t * Math.PI) * baseSize * 0.3;
            point(streamX, streamY);
        }
        noStroke();
    }

    drawNebulaStar(x, y, baseSize, rng, timeMs) {
        const time = timeMs * 0.001;

        for (let layer = 0; layer < 3; layer++) {
            const cloudSize = baseSize * (8 + layer * 3);
            const opacity = 25 / (layer + 1);
            const offset = Math.sin(time + layer) * baseSize * 0.5;

            if (layer === 0) fill(100, 50, 200, opacity);
            else if (layer === 1) fill(200, 50, 100, opacity);
            else fill(50, 100, 200, opacity);

            ellipse(x + offset, y - offset, cloudSize, cloudSize * 0.7);
        }

        fill(255, 255, 255);
        ellipse(x, y, baseSize * 2.5, baseSize * 2.5);

        fill(255, 255, 255, 60);
        ellipse(x, y, baseSize * 5, baseSize * 5);
    }

    drawGiantStar(x, y, baseSize, rng, timeMs) {
        const time = timeMs * 0.002;
        const breathe = 0.9 + 0.1 * Math.sin(time + x * 0.005);

        // Hardcoded halos to avoid array creation
        // Size 15
        let shimmer = 0.8 + 0.2 * Math.sin((time) * 2);
        fill(255, 100, 50, 15 * shimmer);
        ellipse(x, y, baseSize * 15 * breathe, baseSize * 15 * breathe);

        // Size 10
        shimmer = 0.8 + 0.2 * Math.sin((time + 0.5) * 2);
        fill(255, 150, 100, 25 * shimmer);
        ellipse(x, y, baseSize * 10 * breathe, baseSize * 10 * breathe);

        // Size 6
        shimmer = 0.8 + 0.2 * Math.sin((time + 1.0) * 2);
        fill(255, 200, 150, 40 * shimmer);
        ellipse(x, y, baseSize * 6 * breathe, baseSize * 6 * breathe);

        // Size 3
        shimmer = 0.8 + 0.2 * Math.sin((time + 1.5) * 2);
        fill(255, 220, 180, 80 * shimmer);
        ellipse(x, y, baseSize * 3 * breathe, baseSize * 3 * breathe);

        // Core
        fill(255, 200, 100);
        ellipse(x, y, baseSize * 4 * breathe, baseSize * 4 * breathe);

        stroke(255, 150, 50, 40);
        strokeWeight(1);
        for (let i = 0; i < 12; i++) {
            const angle = (i * 0.523) + time; // 0.523 is PI/6
            const length = baseSize * (8 + 2 * Math.sin(time * 3 + i));
            line(x, y, x + Math.cos(angle) * length, y + Math.sin(angle) * length);
        }
        noStroke();
    }

    /**
     * Draws all system contents with optimized visibility culling.
     * 
     * Rendering order (back to front):
     * 1. Background stars (progressive tile-based rendering)
     * 2. Jump zone marker
     * 3. Nebulae
     * 4. Cosmic storms
     * 5. Stations (main and secret)
     * 6. Planets
     * 7. Asteroids
     * 8. Decorative space objects
     * 9. Cargo
     * 10. Enemies
     * 11. Projectiles
     * 12. Harpoons
     * 13. Beams
     * 14. Mines
     * 15. Force waves
     * 16. Explosions
     * 17. Player (always on top)
     * 
     * Uses screen-space visibility culling for performance.
     */
    draw() {
        if (!this.player || !this.player.pos) return;

        push();
        // Calculate translation based on this.player position
        const tx = width / 2 - this.player.pos.x;
        const ty = height / 2 - this.player.pos.y;
        translate(tx, ty);

        // Calculate screen bounds once (with margin) - reuse pre-allocated object
        const screenBounds = this.screenBounds;
        screenBounds.left = -tx - 100;
        screenBounds.right = -tx + width + 100;
        screenBounds.top = -ty - 100;
        screenBounds.bottom = -ty + height + 100;

        // Cache array lengths for draw loops
        const planetCount = this.planets.length;
        const asteroidCount = this.asteroids.length;
        const enemyCount = this.enemies.length;
        const projCount = this.projectiles.length;

        // Draw background (always visible)
        this.drawBackground();

        // --- Draw Jump Zone ---
        // Call this early so other objects draw on top if needed
        this.drawJumpZone(this.player.pos);
        // ---

        // Draw nebulae (draw first for background effect)
        const nebulaCount = this.nebulae.length;
        for (let i = 0; i < nebulaCount; i++) {
            this.nebulae[i].draw(screenBounds);
        }

        // Draw cosmic storms (after nebulae but before ships)
        const stormCount = this.cosmicStorms.length;
        for (let i = 0; i < stormCount; i++) {
            this.cosmicStorms[i].draw(screenBounds);
        }
        // Draw station only if visible
        if (this.station &&
            this.isInView(this.station.pos.x, this.station.pos.y,
                this.station.size * 2, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
            this.station.draw();
        }
        // Draw discovered secret stations
        for (const s of this.secretStations) {
            if (s.discovered && this.isInView(s.pos.x, s.pos.y, s.size * 2, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                s.draw();
            }
        }

        // (Navigation overlay removed) Secret-base indicator is drawn by the
        // player drawing code to preserve original dashed-line + distance label
        // behavior and correct layering. See `player.draw()` for implementation.

        // Determine sun position using the first planet if it exists (cache to avoid repeated access)
        const sunPos = this.planets.length > 0 ? this.planets[0].pos : { x: 0, y: 0 };

        // Draw only visible planets
        for (let i = 0; i < planetCount; i++) {
            const p = this.planets[i];
            if (this.isInView(p.pos.x, p.pos.y, p.size * 1.5, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                p.draw(sunPos);
            }
        }

        // Draw only visible asteroids
        for (let i = 0; i < asteroidCount; i++) {
            const a = this.asteroids[i];
            if (this.isInView(a.pos.x, a.pos.y, a.maxRadius * 2, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                a.draw();
            }
        }

        // Draw decorative space objects (satellites, telescopes)
        if (this.spaceObjects && this.spaceObjects.length > 0) {
            const spaceObjCount = this.spaceObjects.length;
            let drawnCount = 0;
            for (let i = 0; i < spaceObjCount; i++) {
                const so = this.spaceObjects[i];
                if (!so || !so.pos) continue;
                if (this.isInView(so.pos.x, so.pos.y, so.size * 1.5, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                    try {
                        so.draw();
                        drawnCount++;
                    } catch (e) { console.error('SpaceObject.draw error', e); }
                }
            }
        }

        // Draw only visible cargo
        if (this.cargo && this.cargo.length > 0) {
            const cargoCount = this.cargo.length;
            for (let i = 0; i < cargoCount; i++) {
                const c = this.cargo[i];
                // Use 1.5 instead of 4, matching other objects' visibility ranges
                if (this.isInView(c.pos.x, c.pos.y, c.size * 1.5, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                    c.draw();
                }
            }
        }

        // Draw only visible enemies
        for (let i = 0; i < enemyCount; i++) {
            const e = this.enemies[i];
            if (this.isInView(e.pos.x, e.pos.y, e.size * 2, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                e.draw();
            }
        }

        // Draw only visible projectiles
        for (let i = 0; i < projCount; i++) {
            const proj = this.projectiles[i];
            if (this.isInView(proj.pos.x, proj.pos.y, proj.size * 3, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                proj.draw();
            }
        }

        // Draw harpoons (if any)
        if (this.harpoons && this.harpoons.length) {
            for (let h of this.harpoons) {
                if (!h || h.broken) continue;
                // cull by endpoints
                // Harpoon segments now use numeric {x,y,px,py} fields, not p5 vectors
                const a = h.segments && h.segments[0] && h.segments[0];
                const b = h.segments && h.segments[h.segments.length - 1] && h.segments[h.segments.length - 1];
                if (!a || !b) continue;
                if (this.isInView(a.x, a.y, 4, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom) ||
                    this.isInView(b.x, b.y, 4, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                    try { h.draw && h.draw(); } catch (e) { }
                }
            }
        }

        // Special effects culling
        if (this.beams && this.beams.length > 0) {
            this.drawBeamsWithCulling(screenBounds);
        }

        // Draw mines
        if (this.mines && this.mines.length > 0) {
            this.drawMines();
        }

        if (this.forceWaves && this.forceWaves.length > 0) {
            this.drawForceWavesWithCulling(screenBounds);
        }

        // Draw only visible explosions
        const explosionCount = this.explosions.length;
        for (let i = 0; i < explosionCount; i++) {
            const exp = this.explosions[i];
            if (this.isInView(exp.pos.x, exp.pos.y, exp.size * 3, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                exp.draw();
            }
        }

        // Player is always drawn (center of view)
        this.player.draw();

        pop();
    }

    /**
     * Faster check using primitive values instead of object parameter
     */
    /**
     * Check if an entity is within the cached screen bounds
     * @private
     */
    _isEntityVisible(x, y, size) {
        const bounds = this.screenBounds;
        return this.isInView(x, y, size, bounds.left, bounds.right, bounds.top, bounds.bottom);
    }

    isInView(x, y, size, left, right, top, bottom) {
        return (x + size >= left && x - size <= right && y + size >= top && y - size <= bottom);
    }

    /** Draw beams with visibility culling */
    drawBeamsWithCulling(screenBounds) {
        for (let i = 0; i < this.beams.length; i++) {
            const beam = this.beams[i];

            // Fast check if either beam endpoint is in view
            const startInView = this.isInView(beam.start.x, beam.start.y, 10, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom);
            const endInView = this.isInView(beam.end.x, beam.end.y, 10, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom);

            // If either end is visible, or beam crosses screen, draw it
            if (startInView || endInView || this.lineIntersectsScreen(beam.start, beam.end, screenBounds)) {
                stroke(beam.color);
                strokeWeight(beam.width || 2);
                line(beam.start.x, beam.start.y, beam.end.x, beam.end.y);
            }
        }
    }

    /** Draw force waves with visibility culling */
    drawForceWavesWithCulling(screenBounds) {
        for (let i = 0; i < this.forceWaves.length; i++) {
            const wave = this.forceWaves[i];

            // Only draw if wave intersects screen
            if (this.isInView(wave.pos.x, wave.pos.y, wave.radius, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                noFill();
                stroke(wave.color[0], wave.color[1], wave.color[2], 150);
                strokeWeight(1); // Thinner beams
                ellipse(wave.pos.x, wave.pos.y, wave.radius * 2);
            }
        }
    }

    /**
     * Checks if a line segment intersects the screen
     * Used for beams that might cross screen without endpoints being visible
     * @param {p5.Vector} p1 - Start point
     * @param {p5.Vector} p2 - End point
     * @param {Object} bounds - Screen boundaries
     * @return {boolean} Whether line intersects screen
     */
    lineIntersectsScreen(p1, p2, bounds) {
        // Simple check: if line is entirely left/right/above/below screen
        if ((p1.x < bounds.left && p2.x < bounds.left) ||
            (p1.x > bounds.right && p2.x > bounds.right) ||
            (p1.y < bounds.top && p2.y < bounds.top) ||
            (p1.y > bounds.bottom && p2.y > bounds.bottom)) {
            return false;
        }
        return true; // Line potentially intersects screen
    }

    // --- Save/Load System State ---
    getSaveData() { return { visited: this.visited }; }
    loadSaveData(data) { if (data?.visited !== undefined) this.visited = data.visited; }

    /** Generates or retrieves missions for the station in this system */
    getAvailableMissions(galaxy, player) {
        // Return cached missions if already generated for this session/visit
        if (Array.isArray(this.availableMissions) && this.availableMissions.length > 0) {
            return this.availableMissions;
        }

        if (this.station && typeof MissionGenerator?.generateMissions === 'function' && galaxy && player) {
            try {
                this.availableMissions = MissionGenerator.generateMissions(this, this.station, galaxy, player);
                return this.availableMissions;
            } catch (e) {
                console.error("Error generating missions:", e);
                this.availableMissions = [];
                return [];
            }
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

    /**
     * ==========================================================================
     * SERIALIZATION (SAVE/LOAD)
     * ==========================================================================
     */

    /**
     * Serializes an array of entities with fallback handling.
     * Attempts to use entity's toJSON method, falls back to custom serializer.
     * 
     * @param {Array} array - Array of entities to serialize
     * @param {Function} [fallbackSerializer] - Optional custom serializer function
     * @returns {Array} Array of serialized entities
     * @private
     */
    _serializeEntityArray(array, fallbackSerializer = null) {
        if (!Array.isArray(array) || array.length === 0) return [];

        return array.map(entity => {
            if (typeof entity.toJSON === 'function') {
                return entity.toJSON();
            } else if (fallbackSerializer) {
                return fallbackSerializer(entity);
            }
            return entity;
        });
    }

    /**
     * Serializes the system to JSON for saving.
     * 
     * Saved data includes:
     * - System properties (name, economy, tech level, security, etc.)
     * - Static elements (planets, station, jump zone)
     * - Dynamic entities (enemies, projectiles, asteroids, cargo)
     * - Wanted status and police alert state
     * - Nebulae and cosmic storms
     * - Space objects (satellites, telescopes, etc.)
     * 
     * @returns {Object} JSON-serializable object representing this system
     */
    toJSON() {
        return {
            name: this.name,
            economyType: this.economyType,
            galaxyPos: { x: this.galaxyPos?.x || 0, y: this.galaxyPos?.y || 0 },
            systemIndex: this.systemIndex,
            techLevel: this.techLevel,
            securityLevel: this.securityLevel,
            visited: this.visited,
            connectedSystemIndices: this.connectedSystemIndices ? [...this.connectedSystemIndices] : [],

            // Save planets if present
            planets: this._serializeEntityArray(this.planets),

            // Save station if present
            station: this.station && typeof this.station.toJSON === 'function'
                ? this.station.toJSON()
                : null,
            secretStations: this._serializeEntityArray(this.secretStations),

            // Save nebulae if present
            nebulae: this._serializeEntityArray(this.nebulae),

            // Save decorative space objects
            spaceObjects: this._serializeEntityArray(this.spaceObjects, (so) => ({
                type: so.type || null,
                x: so.pos ? (so.pos.x || 0) : null,
                y: so.pos ? (so.pos.y || 0) : null,
                size: so.size || null,
                destroyed: !!so.destroyed,
                state: so.state || null,
                subtype: so.subtype || null,
                planetIndex: so.planetIndex !== undefined ? so.planetIndex : null
            })),

            // Jump Zone Data
            jumpZoneCenterX: this.jumpZoneCenter ? this.jumpZoneCenter.x : null,
            jumpZoneCenterY: this.jumpZoneCenter ? this.jumpZoneCenter.y : null,
            jumpZoneRadius: this.jumpZoneRadius,

            // Wanted status properties
            playerWanted: !!this.playerWanted,
            playerWantedLevel: this.playerWantedLevel ?? 0,
            playerWantedRemainingMs: (this.playerWantedExpiry ? Math.max(0, this.playerWantedExpiry - millis()) : null),
            policeAlertSent: !!this.policeAlertSent,
            cachedDescription: this.cachedDescription ?? null,

            // Dynamic entities
            enemies: this._serializeEntityArray(this.enemies, (e) => ({
                shipType: e.shipTypeName || e.shipType || null,
                role: e.role || null,
                pos: e.pos ? { x: e.pos.x, y: e.pos.y } : null,
                vel: e.vel ? { x: e.vel.x, y: e.vel.y } : null,
                hp: e.hp ?? e.health ?? null,
                angle: e.angle ?? null,
                state: e.currentState ?? null,
                id: e.id ?? null
            })),
            projectiles: this._serializeEntityArray(this.projectiles, (p) => ({
                type: p.type || null,
                pos: p.pos ? { x: p.pos.x, y: p.pos.y } : null,
                vel: p.vel ? { x: p.vel.x, y: p.vel.y } : null,
                lifespan: p.lifespan ?? null,
                ownerId: p.owner ? (p.owner.id || p.owner.shipTypeName || null) : null
            })),
            asteroids: this._serializeEntityArray(this.asteroids, (a) => ({
                pos: a.pos ? { x: a.pos.x, y: a.pos.y } : null,
                size: a.size || null,
                isComet: !!a.isComet
            })),
            cargo: this._serializeEntityArray(this.cargo),
            mines: this._serializeEntityArray(this.mines, (m) => ({
                pos: m.pos ? { x: m.pos.x, y: m.pos.y } : null,
                size: m.size || null,
                ownerId: m.owner ? (m.owner.id || m.owner.shipTypeName || null) : null
            })),
            beams: [], // Transient
            forceWaves: [], // Transient
            harpoons: this._serializeEntityArray(this.harpoons),
            explosions: this._serializeEntityArray(this.explosions),
            staticElementsInitialized: this.staticElementsInitialized
        };
    }

    /**
     * Deserializes entity array with type checking.
     * Attempts to use EntityClass.fromJSON if available, otherwise uses fallback.
     * 
     * @param {Array} dataArray - Array of serialized entity data
     * @param {Function} EntityClass - The entity class constructor
     * @param {Function} [fallbackDeserializer] - Optional custom deserializer
     * @returns {Array} Array of deserialized entities
     * @private
     */
    static _deserializeEntityArray(dataArray, EntityClass, fallbackDeserializer = null) {
        if (!Array.isArray(dataArray) || dataArray.length === 0) return [];

        const result = [];
        for (const data of dataArray) {
            try {
                if (typeof EntityClass !== 'undefined' && typeof EntityClass.fromJSON === 'function') {
                    result.push(EntityClass.fromJSON(data));
                } else if (fallbackDeserializer) {
                    const entity = fallbackDeserializer(data);
                    if (entity) result.push(entity);
                } else {
                    result.push(data);
                }
            } catch (e) {
                console.error(`Error deserializing entity:`, e, data);
            }
        }
        return result;
    }

    /**
     * Deserializes a StarSystem from JSON data.
     * 
     * This static factory method reconstructs a complete StarSystem from saved data,
     * including all static elements, dynamic entities, and state information.
     * After deserialization, call relinkReferences(player) to restore object references.
     * 
     * @param {Object} data - Serialized system data from toJSON()
     * @returns {StarSystem} Reconstructed StarSystem instance
     * @static
     */
    static fromJSON(data) {
        const sys = new StarSystem(
            data.name,
            data.economyType, // <-- Use economyType directly
            data.galaxyPos.x,
            data.galaxyPos.y,
            data.systemIndex,
            data.techLevel,
            data.securityLevel
        );
        sys.visited = data.visited;
        sys.economyType = data.economyType;
        sys.connectedSystemIndices = Array.isArray(data.connectedSystemIndices) ? [...data.connectedSystemIndices] : [];

        // Restore planets
        sys.planets = this._deserializeEntityArray(data.planets, Planet);

        // Restore station
        if (data.station && typeof Station !== "undefined" && typeof Station.fromJSON === "function") {
            sys.station = Station.fromJSON(data.station);
        } else {
            sys.station = null;
        }

        // Restore Nebulae
        sys.nebulae = this._deserializeEntityArray(data.nebulae, Nebula);

        // Restore Space Objects with fallback
        sys.spaceObjects = this._deserializeEntityArray(data.spaceObjects, SpaceObject, (soData) => {
            if (typeof SpaceObject === 'undefined') return null;
            const x = soData.x ?? (soData.pos && soData.pos.x) ?? 0;
            const y = soData.y ?? (soData.pos && soData.pos.y) ?? 0;
            const type = soData.type || 'satellite';
            const obj = new SpaceObject(x, y, type);
            if (soData.size !== undefined) obj.size = soData.size;
            if (soData.destroyed) obj.destroyed = true;
            if (soData.state !== undefined) obj.state = soData.state;
            if (soData.subtype !== undefined) obj.subtype = soData.subtype;
            if (soData.planetIndex !== undefined && soData.planetIndex !== null) {
                obj.planetIndex = soData.planetIndex;
                if (Array.isArray(sys.planets) && sys.planets[soData.planetIndex]) obj.planet = sys.planets[soData.planetIndex];
            }
            if (soData.vel && obj.vel) { obj.vel.x = soData.vel.x || 0; obj.vel.y = soData.vel.y || 0; }
            return obj;
        });

        // --- Restore Jump Zone Data ---
        if (data.jumpZoneCenterX !== null && data.jumpZoneCenterY !== null && typeof createVector === 'function') {
            sys.jumpZoneCenter = createVector(data.jumpZoneCenterX, data.jumpZoneCenterY);
        } else {
            sys.jumpZoneCenter = null; // Ensure it's null if not saved properly or p5 not ready
        }
        sys.jumpZoneRadius = data.jumpZoneRadius ?? JUMP_ZONE_CONFIG.DEFAULT_RADIUS;
        // ---

        // Restore wanted status
        sys.playerWanted = !!(data.playerWanted);
        sys.playerWantedLevel = data.playerWantedLevel ?? 0;
        // Restore expiry using remaining ms if present so saves work across sessions
        if (data.playerWantedRemainingMs != null) {
            sys.playerWantedExpiry = (typeof millis === 'function') ? (millis() + Number(data.playerWantedRemainingMs)) : null;
        } else {
            sys.playerWantedExpiry = null;
        }
        sys.policeAlertSent = !!data.policeAlertSent;
        // Restore persisted generated description if present
        sys.cachedDescription = (typeof data.cachedDescription === 'string') ? data.cachedDescription : null;

        // --- Restore initialization state ---
        // This prevents initStaticElements from running again if it already ran before saving
        sys.staticElementsInitialized = data.staticElementsInitialized ?? false;
        // If the system was saved with planets/station but space objects were not serialized,
        // ensure decorative space objects exist so missions and rendering that rely on them work.
        // We only spawn here (not run full initStaticElements) to avoid duplicating planets/station.
        try {
            if ((!sys.spaceObjects || sys.spaceObjects.length === 0) && Array.isArray(sys.planets) && sys.planets.length > 0 && typeof sys.spawnSpaceObjectsForPlanets === 'function') {
                sys.spaceObjects = sys.spaceObjects || [];
                sys.spawnSpaceObjectsForPlanets();
                // Mark static elements initialized so we don't attempt to re-run full init later
                sys.staticElementsInitialized = true;
            }
        } catch (e) {
            console.error('Error respawning space objects on load:', e);
        }
        // ---

        // NOTE: We do NOT call initStaticElements here because planets/station/jumpzone
        // are being restored directly from JSON data. If initStaticElements *needs* to run
        // on load for other reasons (like regenerating bgStars), the logic inside
        // initStaticElements needs to be adjusted to skip regeneration of loaded elements.
        // The current structure seems to load everything directly.

        // --- Restore dynamic entities using helper methods ---
        sys.enemies = this._deserializeEntityArray(data.enemies, Enemy, (ed) => {
            if (typeof Enemy === 'undefined') return null;
            const px = ed?.pos?.x ?? (ed.x ?? 0);
            const py = ed?.pos?.y ?? (ed.y ?? 0);
            const shipType = ed.shipType || ed.shipTypeName || 'Krait';
            const role = ed.role || (typeof AI_ROLE !== 'undefined' ? AI_ROLE.HAULER : null);
            const enemy = new Enemy(px, py, null, shipType, role);
            if (ed.vel && enemy.vel) { enemy.vel.x = ed.vel.x || 0; enemy.vel.y = ed.vel.y || 0; }
            if (ed.hp !== undefined) enemy.hp = ed.hp;
            if (ed.angle !== undefined) enemy.angle = ed.angle;
            if (ed.state !== undefined && typeof enemy.changeState === 'function') enemy.changeState(ed.state);
            enemy.currentSystem = sys;
            return enemy;
        });

        sys.projectiles = this._deserializeEntityArray(data.projectiles, Projectile);
        sys.asteroids = this._deserializeEntityArray(data.asteroids, Asteroid);
        sys.cargo = this._deserializeEntityArray(data.cargo, Cargo);
        sys.mines = this._deserializeEntityArray(data.mines, Mine);
        sys.beams = []; // Transient
        sys.forceWaves = []; // Transient
        sys.harpoons = this._deserializeEntityArray(data.harpoons, Harpoon);
        sys.explosions = this._deserializeEntityArray(data.explosions, Explosion);

        // --- Post-load relinking helpers ---
        // Build id map and attempt to reconnect owner/target references
        sys._postLoadRelink = function () {
            const makeVector = (v) => {
                if (!v) return null;
                return (typeof createVector === 'function' && v && typeof v.x === 'number') ? createVector(v.x, v.y) : { x: (v.x || 0), y: (v.y || 0) };
            };

            const idMap = new Map();
            if (Array.isArray(this.enemies)) {
                for (const e of this.enemies) {
                    if (e && (e.id !== undefined && e.id !== null)) idMap.set(String(e.id), e);
                    try { e.currentSystem = this; } catch (_) { }
                }
            }
            if (this.player && this.player.id !== undefined && this.player.id !== null) idMap.set(String(this.player.id), this.player);

            const resolveOwnerRef = (ref) => {
                if (!ref) return null;
                const rid = String(ref);
                if (idMap.has(rid)) return idMap.get(rid);
                // fallback heuristics: match by type/name
                for (const ent of this.enemies) {
                    if (!ent) continue;
                    if ((ent.shipTypeName && ent.shipTypeName === ref) || (ent.shipType && ent.shipType === ref) || (ent.displayName && ent.displayName === ref)) return ent;
                }
                if ((rid === 'player' || rid === 'me') && this.player) return this.player;
                return null;
            };

            // Projectiles: restore vectors and owner references
            if (Array.isArray(this.projectiles)) {
                for (const p of this.projectiles) {
                    if (!p) continue;
                    try {
                        if (p.pos && p.pos.x !== undefined) p.pos = makeVector(p.pos);
                        if (p.vel && p.vel.x !== undefined) p.vel = makeVector(p.vel);
                        const oid = p.ownerId || p._ownerId || (p.owner && (p.owner.id || p.owner.shipTypeName)) || null;
                        if (oid) {
                            const owner = resolveOwnerRef(oid);
                            if (owner) {
                                p.owner = owner;
                                owner.activeProjectiles = owner.activeProjectiles || [];
                                owner.activeProjectiles.push(p);
                            }
                        }
                        p.system = this;
                    } catch (e) { console.warn('projectile relink error', e); }
                }
            }

            // Mines: restore owner and vectors
            if (Array.isArray(this.mines)) {
                for (const m of this.mines) {
                    if (!m) continue;
                    try {
                        if (m.pos && m.pos.x !== undefined) m.pos = makeVector(m.pos);
                        const oid = m.ownerId || m._ownerId || null;
                        if (oid) {
                            const owner = resolveOwnerRef(oid);
                            if (owner) {
                                m.owner = owner;
                                owner.activeMines = owner.activeMines || [];
                                owner.activeMines.push(m);
                            }
                        }
                        m.system = this;
                    } catch (e) { console.warn('mine relink error', e); }
                }
            }

            // Harpoons: restore anchors, segments, owner and target
            if (Array.isArray(this.harpoons)) {
                for (const h of this.harpoons) {
                    if (!h) continue;
                    try {
                        if (h.anchorA && h.anchorA.x !== undefined) h.anchorA = makeVector(h.anchorA);
                        if (h.anchorB && h.anchorB.x !== undefined) h.anchorB = makeVector(h.anchorB);
                        if (Array.isArray(h.segments)) {
                            h.segments = h.segments.map(s => (s && s.x !== undefined) ? makeVector(s) : s);
                        }
                        const oid = h.ownerId || h._ownerId || null;
                        const tid = h.targetId || h._targetId || null;
                        if (oid) {
                            const owner = resolveOwnerRef(oid);
                            if (owner) {
                                h.owner = owner;
                                owner.harpoons = owner.harpoons || [];
                                owner.harpoons.push(h);
                            }
                        }
                        if (tid) {
                            const target = resolveOwnerRef(tid);
                            if (target) {
                                h.target = target;
                            }
                        }
                        h.system = this;
                    } catch (e) { console.warn('harpoon relink error', e); }
                }
            }

            // Beams & ForceWaves: assign system and attempt owner resolution
            if (Array.isArray(this.beams)) for (const b of this.beams) {
                if (!b) continue;
                try { b.system = this; if (b.ownerId) b.owner = resolveOwnerRef(b.ownerId) || b.owner || null; } catch (e) { console.warn('beam relink error', e); }
            }
            if (Array.isArray(this.forceWaves)) for (const f of this.forceWaves) {
                if (!f) continue;
                try { f.system = this; } catch (e) { console.warn('forceWave relink error', e); }
            }

            // Cargo: restore positions and attached references
            if (Array.isArray(this.cargo)) {
                for (const c of this.cargo) {
                    if (!c) continue;
                    try {
                        if (c.pos && c.pos.x !== undefined) c.pos = makeVector(c.pos);
                        const attachedId = c.attachedById || c.attachedBy || c._attachedBy || null;
                        if (attachedId && !c.attachedTo) {
                            const owner = resolveOwnerRef(attachedId);
                            if (owner) {
                                c.attachedTo = owner;
                                c.attached = true;
                                owner.cargo = owner.cargo || [];
                                owner.cargo.push(c);
                            }
                        }
                    } catch (e) { console.warn('cargo relink error', e); }
                }
            }

            // Explosions: restore positions
            if (Array.isArray(this.explosions)) {
                for (const ex of this.explosions) {
                    if (!ex) continue;
                    try { if (ex.pos && ex.pos.x !== undefined) ex.pos = makeVector(ex.pos); ex.system = this; } catch (e) { console.warn('explosion relink error', e); }
                }
            }

            // Asteroids: restore vectors
            if (Array.isArray(this.asteroids)) {
                for (const a of this.asteroids) {
                    if (!a) continue;
                    try { if (a.pos && a.pos.x !== undefined) a.pos = makeVector(a.pos); if (a.vel && a.vel.x !== undefined) a.vel = makeVector(a.vel); } catch (e) { console.warn('asteroid relink error', e); }
                }
            }

            // Ensure enemy targets are restored and they point to the correct system
            if (Array.isArray(this.enemies)) {
                for (const e of this.enemies) {
                    if (!e) continue;
                    try {
                        if (e.targetId) e.target = resolveOwnerRef(e.targetId) || null;
                        // Restore guard principal linkage if present
                        if (e._principalId) {
                            const principal = resolveOwnerRef(e._principalId) || null;
                            if (principal) {
                                e.principal = principal;
                                // If the enemy was saved in GUARDING state, ensure entry logic runs
                                if (e.currentState === AI_STATE.GUARDING) {
                                    try { if (typeof e.onStateEntry === 'function') e.onStateEntry(AI_STATE.GUARDING, { principal }); } catch (_) { }
                                } else {
                                    try { if (typeof e.changeState === 'function') e.changeState(AI_STATE.GUARDING, { principal }); } catch (_) { }
                                }
                            }
                        }
                        e.currentSystem = this;
                        // After assigning currentSystem, run state entry logic so
                        // states that rely on system data (e.g., LEAVING_SYSTEM)
                        // can initialize correctly. Guard state with a principal
                        // was handled above, so skip re-calling for GUARDING.
                        try {
                            if (typeof e.onStateEntry === 'function' && e.currentState !== AI_STATE.GUARDING) {
                                try { e.onStateEntry(e.currentState, {}); } catch (_) { }
                            }
                        } catch (err) { /* non-fatal */ }
                    } catch (err) { console.warn('enemy relink error', err); }
                }
            }
        };

        sys.relinkReferences = function (player) {
            if (player) this.player = player;
            if (typeof this._postLoadRelink === 'function') this._postLoadRelink();
        };

        try { sys._postLoadRelink(); } catch (e) { console.warn('StarSystem.fromJSON: post-load relink failed', e); }

        return sys;
    }

    /**
     * Helper to relink all systems after a full galaxy load.
     * Call this once after `galaxy.systems` and `player` are instantiated.
     */
    static relinkAll(galaxy, player) {
        if (!galaxy || !Array.isArray(galaxy.systems)) return;
        for (const sys of galaxy.systems) {
            try { if (typeof sys._postLoadRelink === 'function') sys._postLoadRelink(); } catch (e) { console.warn('StarSystem.relinkAll _postLoadRelink error', sys && sys.name, e); }
        }
        for (const sys of galaxy.systems) {
            try { if (typeof sys.relinkReferences === 'function') sys.relinkReferences(player); } catch (e) { console.warn('StarSystem.relinkAll relinkReferences error', sys && sys.name, e); }
        }
    }

    // Add this method to the StarSystem class - place it after constructor
    setEconomyType(economyType) {
        // Store the economy type in the system
        this.economyType = economyType;

        // CRITICAL: Update all stations (main and secret) with the new economy type
        // This updates appearance, market type, and regenerates commodities
        if (this.station) {
            if (typeof this.station.updateEconomyType === 'function') {
                this.station.updateEconomyType(economyType);
            } else {
                // Fallback for older save files
                this.station.systemType = economyType;
                if (this.station.market) {
                    this.station.market.systemType = economyType;
                    this.station.market.updatePrices();
                }
            }
        }

        // Update secret stations as well
        if (this.secretStations && this.secretStations.length > 0) {
            for (const secretStation of this.secretStations) {
                if (typeof secretStation.updateEconomyType === 'function') {
                    secretStation.updateEconomyType(economyType);
                } else {
                    // Fallback for older save files
                    secretStation.systemType = economyType;
                    if (secretStation.market) {
                        secretStation.market.systemType = economyType;
                        secretStation.market.updatePrices();
                    }
                }
            }
        }
    }

    /**
     * Checks if an entity should be despawned based on distance from player.
     * Uses squared distance for performance (avoids sqrt).
     * 
     * @param {Object} entity - The entity to check (must have pos property)
     * @param {number} [factorMultiplier=1.1] - Optional multiplier for despawn radius
     * @returns {boolean} Whether the entity should be despawned
     */
    shouldDespawnEntity(entity, factorMultiplier = 1.1) {
        // If no runtime player or invalid entity, don't despawn by distance
        if (!this.player || !entity || !entity.pos) return false;

        // Protect mission-critical entities from being despawned.
        // Assassination targets/guards are explicitly flagged when spawned.
        if (entity.isAssassinationTarget || entity.isAssassinationGuard || entity.isMissionSpecific) return false;

        // Also protect any entity referenced by the player's active mission (if present)
        try {
            const am = this.player.activeMission;
            if (am && am._targetEnemyId && entity.id && am._targetEnemyId === entity.id) return false;
        } catch (e) { /* non-fatal */ }

        const distToPlayerSq = sq(entity.pos.x - this.player.pos.x) + sq(entity.pos.y - this.player.pos.y);
        const despawnDistanceSq = sq(this.despawnRadius * factorMultiplier);

        return distToPlayerSq > despawnDistanceSq;
    }

    /**
     * Fast array element removal - swap with last element then pop.
     * Much faster than splice() for large arrays (O(1) vs O(n)).
     * 
     * WARNING: This does not preserve array order!
     * 
     * @param {Array} array - The array to remove from
     * @param {number} index - The index to remove
     * @private
     */
    _fastRemove(array, index) {
        const lastIndex = array.length - 1;
        if (index !== lastIndex) {
            array[index] = array[lastIndex];
        }
        array.pop();
    }

    /**
     * Spawn space objects near planets based on system economy type.
     * Industrial/Refinery/Mining systems always have mining platforms near planets.
     * Other systems have random space objects.
     */
    spawnSpaceObjectsForPlanets() {
        console.log(`         >>> spawnSpaceObjectsForPlanets START for ${this.name}`);

        // GUARD: If space objects already exist, don't spawn more
        // This prevents on-demand spawning with non-deterministic seeds during gameplay
        if (this.spaceObjects && this.spaceObjects.length > 0) {
            console.log(`         >>> Space objects already exist (${this.spaceObjects.length}), skipping spawn`);
            return;
        }

        if (!this.planets || this.planets.length === 0) {
            console.warn(`         >>> No planets found in ${this.name}, skipping space objects`);
            return;
        }
        if (typeof SpaceObject === 'undefined') {
            console.error(`         >>> SpaceObject class not defined, skipping space objects`);
            return;
        }

        const initialCount = this.spaceObjects.length;
        console.log(`         >>> Initial spaceObjects count: ${initialCount}`);

        // Define space object types by economy type
        const typesByEconomy = {
            'Industrial': ['miningPlatform', 'cargoCluster', 'engineArray', 'satellite', 'relay', 'debris', 'probe', 'asteroidMiner', 'fuelDepot', 'solarFarm', 'wreckage', 'weaponPlatform', 'shieldGenerator', 'energyCollector', 'shipyard'],
            'Refinery': ['miningPlatform', 'cargoCluster', 'engineArray', 'satellite', 'relay', 'debris', 'probe', 'asteroidMiner', 'fuelDepot', 'solarFarm', 'wreckage', 'weaponPlatform', 'shieldGenerator', 'energyCollector', 'shipyard'],
            'Mining': ['miningPlatform', 'cargoCluster', 'engineArray', 'satellite', 'relay', 'debris', 'probe', 'asteroidMiner', 'fuelDepot', 'solarFarm', 'wreckage', 'weaponPlatform', 'shieldGenerator', 'energyCollector'],
            'Agricultural': ['orbitalGarden', 'habitat', 'satellite', 'telescope', 'relay', 'probe', 'beacon', 'observatoryDome', 'hydroponicsBay'],
            'High Tech': ['researchArray', 'solarSail', 'ancientRelic', 'satellite', 'telescope', 'beacon', 'signalFlare', 'outpost', 'commDish', 'iceCrystal', 'nebulaFragment', 'alienArtifact', 'quantumGate', 'shipyard']
        };

        // Default types for other economies (undergroundMarket handled conditionally below)
        const defaultTypes = ['satellite', 'telescope', 'relay', 'debris', 'probe', 'beacon', 'solarSail', 'cargoCluster', 'decoyBuoy', 'habitat', 'researchArray', 'orbitalGarden', 'ancientRelic', 'signalFlare', 'outpost', 'asteroidMiner', 'fuelDepot', 'commDish', 'solarFarm', 'iceCrystal', 'nebulaFragment', 'alienArtifact', 'wreckage', 'observatoryDome', 'hydroponicsBay', 'weaponPlatform', 'shieldGenerator', 'energyCollector', 'quantumGate', 'drugLab', 'labourColony', 'shipyard'];

        // Clone the selected array so we can modify it safely
        const availableTypes = (typesByEconomy[this.economyType] || defaultTypes).slice();

        // Only include underground market in systems where illegal goods CANNOT be traded
        // (i.e., non-Anarchy security levels)
        const isAnarchy = typeof this.securityLevel === 'string' && this.securityLevel.toLowerCase() === 'anarchy';
        if (!isAnarchy) {
            if (!availableTypes.includes('undergroundMarket')) {
                availableTypes.push('undergroundMarket');
            }
            if (!availableTypes.includes('prison')) {
                availableTypes.push('prison');
            }
        }

        for (let planetIdx = 1; planetIdx < this.planets.length; planetIdx++) {
            const planet = this.planets[planetIdx];
            // Store the correct planet index for space object association
            const correctPlanetIndex = planet.planetIndex || planetIdx;

            if (['Industrial', 'Refinery', 'Mining'].includes(this.economyType)) {
                // Always spawn at least one mining platform
                const angle = random(TWO_PI);
                const dist = random(planet.size * 0.2, planet.size * 0.6);
                const x = planet.pos.x + Math.cos(angle) * dist;
                const y = planet.pos.y + Math.sin(angle) * dist;
                try {
                    const obj = new SpaceObject(x, y, 'miningPlatform');
                    obj.planetIndex = correctPlanetIndex;
                    this.spaceObjects.push(obj);
                } catch (e) {
                    console.error('Failed to create mining platform SpaceObject', e);
                }

                // Add 0-2 additional random objects
                const extra = Math.floor(random(0, 3)); // 0, 1, or 2
                for (let j = 0; j < extra; j++) {
                    const type = random(availableTypes);
                    const angle2 = random(TWO_PI);
                    const dist2 = random(planet.size * 0.2, planet.size * 0.6);
                    const x2 = planet.pos.x + Math.cos(angle2) * dist2;
                    const y2 = planet.pos.y + Math.sin(angle2) * dist2;
                    try {
                        const obj2 = new SpaceObject(x2, y2, type);
                        obj2.planetIndex = correctPlanetIndex;
                        this.spaceObjects.push(obj2);
                    } catch (e) {
                        console.error('Failed to create additional SpaceObject', e);
                    }
                }
            } else {
                // For other systems, spawn 1-3 random objects
                const numObjects = Math.floor(random(1, 4)); // 1 to 3
                for (let j = 0; j < numObjects; j++) {
                    const type = random(availableTypes);
                    const angle = random(TWO_PI);
                    const dist = random(planet.size * 0.2, planet.size * 0.6);
                    const x = planet.pos.x + Math.cos(angle) * dist;
                    const y = planet.pos.y + Math.sin(angle) * dist;
                    try {
                        const obj = new SpaceObject(x, y, type);
                        obj.planetIndex = correctPlanetIndex;
                        this.spaceObjects.push(obj);
                    } catch (e) {
                        console.error('Failed to create SpaceObject', e);
                    }
                }
            }
        }

        // Spawn 1-3 objects near the jump gate
        if (this.jumpZoneCenter) {
            const jumpGateTypes = ['signalFlare', 'relay', 'satellite', 'decoyBuoy', 'probe', 'beacon', 'telescope', 'commDish', 'quantumGate'];
            const numJumpObjects = Math.floor(random(1, 4)); // 1 to 3
            for (let j = 0; j < numJumpObjects; j++) {
                const type = random(jumpGateTypes);
                const angle = random(TWO_PI);
                const dist = random(200, 600); // Fixed distance range for jump gate objects
                const x = this.jumpZoneCenter.x + Math.cos(angle) * dist;
                const y = this.jumpZoneCenter.y + Math.sin(angle) * dist;
                try {
                    const obj = new SpaceObject(x, y, type);
                    // Mark jump gate objects without planet index
                    obj.planetIndex = null;
                    this.spaceObjects.push(obj);
                } catch (e) {
                    console.error('Failed to create jump gate SpaceObject', e);
                }
            }
        }

        const finalCount = this.spaceObjects.length;
        const spawned = finalCount - initialCount;
        console.log(`         >>> spawnSpaceObjectsForPlanets END: spawned ${spawned} objects (total now ${finalCount})`);
    }

    /**
     * Fast inverse square root for normalization
     * Returns 1/sqrt(value) efficiently
     * @param {number} distSq - Squared distance
     * @returns {number} Inverse square root
     * @private
     */
    _fastInvSqrt(distSq) {
        return distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
    }

    /**
     * Adds an enemy to the system with proper references.
     * 
     * Also handles:
     * - Setting bidirectional enemy <-> system reference
     * - Playing alien spawn sound for Thargoids
     * - Adding UI message for alien detection
     * 
     * @param {Enemy} enemy - The enemy to add
     * @returns {boolean} Whether enemy was successfully added
     */
    addEnemy(enemy) {
        if (enemy) {
            // Set bidirectional reference
            enemy.currentSystem = this;
            window.currentSystem = this;
            this.enemies.push(enemy);

            // Centralized Thargoid/Alien spawn cue: plays once when aliens are added
            try {
                if (enemy.role === AI_ROLE.ALIEN && typeof soundManager !== 'undefined') {
                    const now = (typeof millis === 'function') ? millis() : Date.now();
                    // 1 second cooldown to avoid spam during multi-spawns
                    if (!this._lastAlienSpawnSoundTime || (now - this._lastAlienSpawnSoundTime) > 1000) {
                        if (enemy.pos && this.player && this.player.pos && typeof soundManager.playWorldSound === 'function') {
                            soundManager.playWorldSound('thargoid', enemy.pos.x, enemy.pos.y, this.player.pos);
                        } else if (typeof soundManager.playSound === 'function') {
                            soundManager.playSound('thargoid');
                        }
                        this._lastAlienSpawnSoundTime = now;

                        // Add UI message for alien detection
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage("Alien presence detected!", [255, 0, 255]);
                        }
                    }
                }
            } catch (e) {
                console.warn('Alien spawn sound failed:', e);
            }
            return true;
        }
        return false;
    }

} // End of StarSystem class
