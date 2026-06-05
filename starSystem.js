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

// STARFIELD_CONFIG is now defined in starfieldConfig.js

// === Spawn Configuration ===
const SPAWN_CONFIG = {
    SPAWN_INTERVAL_MS: 5000,       // Combined NPC + repair tender spawn interval
    ENEMY_SPAWN_INTERVAL: 5000,    // ms
    ASTEROID_SPAWN_INTERVAL: 3000, // ms
    MAX_ENEMIES_BASE: 15,          // Normal peace-time limit
    MAX_ENEMIES_SKIRMISH: 22,      // During skirmishes
    MAX_ENEMIES_WAR: 30,           // During full war
    MAX_ASTEROIDS: 45,
    DEFAULT_DESPAWN_RADIUS: 5000,
    FIXED_LARGE_DESPAWN_RADIUS: 10000, // Used during generation and save/load to prevent entity culling
    SPAWN_DISTANCE_MIN: 800,
    SPAWN_DISTANCE_MAX: 2000,
    // NPC Spawn specifics
    THARGOID_SPAWN_CHANCE: 0.01,   // 1% chance for Thargoid in non-alien systems
    HAULER_GUARD_SIZE_THRESHOLD: 60 // Minimum hauler size to spawn guards
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

const PARALLAX_SEED_MULTIPLIER = 911;
const PARALLAX_HASH_SALTS = {
    COUNT: 3,
    POS_X: 5,
    POS_Y: 11,
    SIZE: 17,
    ALPHA: 29,
    COLOR: 41,
    DENSITY: 53
};
const PARALLAX_TWINKLE_BASE = 0.7;
const PARALLAX_TWINKLE_RANGE = 0.3;

// === Summon Ping Visual Configuration ===
const SUMMON_PING_CONFIG = {
    DEFAULT_DURATION_MS: 2800,
    INITIAL_RADIUS: 18,
    ECHO_DELAY_FRACTION: 0.24,
    ECHO_INITIAL_RADIUS: 12,
    ECHO_MAX_SCALE: 0.92,
    ECHO_ALPHA_MULTIPLIER: 0.55,
    CENTER_GLOW_MIN: 4,
    CENTER_GLOW_MAX: 16,
    ARC_SEGMENTS: 4,
    ARC_SPAN: Math.PI * 0.32,
    INNER_ARC_SPAN: Math.PI * 0.20,
    WAVE_OFFSETS: [0, 0.11, 0.23, 0.36, 0.50],
    ROTATION_SPEED: 1.5,
    RING_SEPARATION: 22,
    WAVE_ALPHA_DECAY: 0.55,
    WAVE_INDEX_ALPHA_FACTOR: 0.14,
    WAVE_ROTATION_OFFSET: 0.52,
    BASE_STROKE_WEIGHT: 2.4,
    STROKE_WEIGHT_DECAY: 0.28,
    INNER_ARC_ALPHA_MULTIPLIER: 0.72,
    INNER_ARC_OFFSET: 0.18,
    INNER_ARC_STROKE_WEIGHT: 1.15,
    MIN_INNER_RADIUS: 8,
    // Transmission pulse effect
    PULSE_LINE_COUNT: 6,
    PULSE_LINE_LENGTH: 18,
    PULSE_LINE_ALPHA_MULT: 0.55,
    CENTER_BLINK_RATE: 4.5,
    OUTER_DASH_SEGMENTS: 8,
    OUTER_DASH_SPAN: Math.PI * 0.08
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
        BOUNTY_HUNTER_SHIPS: [],
        GUARD_SHIPS: [],
        IMPERIAL_SHIPS: [],
        SEPARATIST_SHIPS: [],
        COMBAT_SHIPS: [],
        MINER_SHIPS: [],
        REPAIR_SHIPS: [],
        MISSIONARY_SHIPS: [],
        HEALER_SHIPS: [],
        // Faction-specific hauler arrays for economy spawning
        IMPERIAL_HAULERS: [],
        SEPARATIST_HAULERS: [],
        MILITARY_HAULERS: []
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

        // Additionally, populate faction-specific arrays based on the 'faction' property
        // This handles ships that use generic roles but belong to specific factions
        if (shipData.faction) {
            // Faction combat ships: aiRoles: ["COMBAT"] with faction property
            if (shipData.aiRoles.includes('COMBAT')) {
                if (shipData.faction === 'IMPERIAL' && !roleArrays.IMPERIAL_SHIPS.includes(shipKey)) {
                    roleArrays.IMPERIAL_SHIPS.push(shipKey);
                } else if (shipData.faction === 'SEPARATIST' && !roleArrays.SEPARATIST_SHIPS.includes(shipKey)) {
                    roleArrays.SEPARATIST_SHIPS.push(shipKey);
                } else if (shipData.faction === 'MILITARY' && !roleArrays.MILITARY_SHIPS.includes(shipKey)) {
                    roleArrays.MILITARY_SHIPS.push(shipKey);
                }
            }
            // Faction hauler ships: aiRoles: ["HAULER"] with faction property
            if (shipData.aiRoles.includes('HAULER')) {
                if (shipData.faction === 'IMPERIAL') {
                    roleArrays.IMPERIAL_HAULERS.push(shipKey);
                } else if (shipData.faction === 'SEPARATIST') {
                    roleArrays.SEPARATIST_HAULERS.push(shipKey);
                } else if (shipData.faction === 'MILITARY') {
                    roleArrays.MILITARY_HAULERS.push(shipKey);
                }
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
    BOUNTY_HUNTER_SHIPS,
    GUARD_SHIPS,
    IMPERIAL_SHIPS,
    SEPARATIST_SHIPS,
    COMBAT_SHIPS,
    MINER_SHIPS,
    REPAIR_SHIPS,
    MISSIONARY_SHIPS,
    HEALER_SHIPS,
    IMPERIAL_HAULERS,
    SEPARATIST_HAULERS,
    MILITARY_HAULERS
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
    console.log("BOUNTY_HUNTER_SHIPS:", BOUNTY_HUNTER_SHIPS);
    console.log("GUARD_SHIPS:", GUARD_SHIPS);
    console.log("IMPERIAL_SHIPS:", IMPERIAL_SHIPS);
    console.log("SEPARATIST_SHIPS:", SEPARATIST_SHIPS);
    console.log("COMBAT_SHIPS:", COMBAT_SHIPS);
    console.log("MINER_SHIPS:", MINER_SHIPS);
    console.log("REPAIR_SHIPS:", REPAIR_SHIPS);
    console.log("IMPERIAL_HAULERS:", IMPERIAL_HAULERS);
    console.log("SEPARATIST_HAULERS:", SEPARATIST_HAULERS);
    console.log("MILITARY_HAULERS:", MILITARY_HAULERS);
}

/**
 * =============================================================================
 * STARFIELD WORKER INITIALIZATION
 * =============================================================================
 * Sets up the Web Worker for offscreen starfield tile generation.
 * Uses deferred processing to prevent frame spikes from worker callbacks.
 */

// Worker + OffscreenCanvas support for tile generation
let STARFIELD_TILE_WORKER = null;

/**
 * Queue for pending ImageBitmaps from the worker.
 * Bitmaps are queued here and processed at a controlled rate during rendering
 * to prevent frame spikes when multiple worker messages arrive simultaneously.
 * @type {Array<{key: string, bitmap: ImageBitmap, systemIndex: number, receivedAt: number}>}
 */
const PENDING_STARFIELD_BITMAPS = [];

/**
 * Safely closes an ImageBitmap, handling missing close method or errors.
 * @param {ImageBitmap|null} bitmap - The bitmap to close
 */
function _safeCloseBitmap(bitmap) {
    try {
        if (bitmap && typeof bitmap.close === 'function') {
            bitmap.close();
        }
    } catch (_) { /* Ignore close errors */ }
}

/**
 * Processes pending starfield bitmaps into cached tile buffers.
 * Called during rendering to convert worker-generated ImageBitmaps into p5 graphics buffers.
 * Uses time-based limiting to prevent frame spikes.
 * 
 * @param {StarSystem} currentSystem - The current star system to process tiles for
 * @returns {number} Number of bitmaps processed this call
 */
function processPendingStarfieldBitmaps(currentSystem) {
    if (PENDING_STARFIELD_BITMAPS.length === 0) return 0;
    if (!currentSystem) return 0;

    const startTime = performance.now();
    const maxTimeMs = STARFIELD_CONFIG.BITMAP_PROCESS_TIME_MS || 8;
    const minCount = STARFIELD_CONFIG.BITMAP_PROCESS_MIN_COUNT || 1;
    let processed = 0;

    while (PENDING_STARFIELD_BITMAPS.length > 0) {
        // Time limit check (but always process at least minCount)
        if (processed >= minCount && (performance.now() - startTime) > maxTimeMs) {
            break;
        }

        const item = PENDING_STARFIELD_BITMAPS.shift();
        if (!item) continue;

        const { key, bitmap, systemIndex } = item;

        // Validate we have a bitmap
        if (!bitmap) {
            continue;
        }

        // Validate system still exists and is current
        let targetSystem = null;
        try {
            if (typeof galaxy !== 'undefined' && galaxy && Array.isArray(galaxy.systems)) {
                targetSystem = galaxy.systems[systemIndex];
            }
        } catch (_) { targetSystem = null; }

        // If system doesn't exist or isn't current, discard the bitmap
        if (!targetSystem) {
            _safeCloseBitmap(bitmap);
            continue;
        }

        // If this bitmap is for a different system than currentSystem, discard it immediately.
        // We used to re-queue, but that clogs the queue with stale data during system jumps,
        // triggering backpressure and blocking new generation for the new system.
        if (targetSystem !== currentSystem) {
            _safeCloseBitmap(bitmap);
            continue;
        }

        // Check if tile was already completed (race condition guard)
        const existing = targetSystem._starfieldTiles?.get(key);
        if (existing && existing.buffer) {
            _safeCloseBitmap(bitmap);
            processed++;
            continue;
        }

        // Parse tile coordinates from key
        const parts = String(key).split(',');
        if (parts.length !== 2) {
            _safeCloseBitmap(bitmap);
            targetSystem._starfieldTiles?.delete(key);
            processed++;
            continue;
        }

        // Now do the expensive work: create lightweight image buffer from ImageBitmap
        let buffer = null;
        let success = false;

        try {
            const tileSize = targetSystem._starfieldTileSize || STARFIELD_CONFIG.TILE_SIZE;
            
            // Check if we are in a browser context with canvas support to create a lightweight image
            if (typeof document !== 'undefined' && typeof document.createElement === 'function' && typeof p5 !== 'undefined') {
                const img = new p5.Image(tileSize, tileSize);
                const canvas = document.createElement('canvas');
                canvas.width = tileSize;
                canvas.height = tileSize;
                const ctx = canvas.getContext('2d');
                if (ctx) {
                    ctx.imageSmoothingEnabled = false;
                    ctx.drawImage(bitmap, 0, 0);
                }
                img.canvas = canvas;
                img.elt = canvas;
                img.width = tileSize;
                img.height = tileSize;
                img.modified = true;
                buffer = img;
                success = true;
            } else {
                // Fallback for Node.js / Jest headless environment
                buffer = createGraphics(tileSize, tileSize);
                const ctx = buffer.drawingContext;
                if (ctx && ctx.imageSmoothingEnabled !== undefined) {
                    ctx.imageSmoothingEnabled = false;
                }
                ctx.drawImage(bitmap, 0, 0, buffer.width, buffer.height);
                success = true;
            }
        } catch (err) {
            // Drawing failed - cleanup
            if (buffer && typeof buffer.remove === 'function') {
                try { buffer.remove(); } catch (_) { }
            }
            buffer = null;

            if (STAR_SYSTEM_DEBUG) {
                console.warn('Failed to create tile buffer:', key, err);
            }
        }

        // Always close the bitmap after use
        _safeCloseBitmap(bitmap);

        // Update the tile cache
        if (success && buffer && targetSystem._starfieldTiles) {
            targetSystem._starfieldTiles.set(key, {
                buffer,
                lastUsed: typeof millis === 'function' ? millis() : Date.now()
            });
        } else if (targetSystem._starfieldTiles) {
            // Remove failed tile so it can be re-queued for generation
            targetSystem._starfieldTiles.delete(key);
        }

        processed++;
    }

    return processed;
}

// Initialize worker if supported
if (STARFIELD_CONFIG.WORKER_ENABLED) {
    try {
        // Cache-busting version parameter
        STARFIELD_TILE_WORKER = new Worker('starfield_worker.js?v=3');

        /**
         * Worker message handler - queues bitmaps for deferred processing.
         * This handler is intentionally lightweight to minimize impact on frame timing.
         * The expensive buffer creation is deferred to processPendingStarfieldBitmaps().
         */
        STARFIELD_TILE_WORKER.onmessage = function (e) {
            const data = e.data;
            if (!data) return;

            const { key, bitmap, systemIndex, error } = data;

            // Handle worker errors
            if (error) {
                _safeCloseBitmap(bitmap);
                // Remove tile from pending state so it can be re-requested
                try {
                    if (typeof galaxy !== 'undefined' && galaxy?.systems?.[systemIndex]) {
                        galaxy.systems[systemIndex]._starfieldTiles?.delete(key);
                    }
                } catch (_) { }
                return;
            }

            // Validate we received a bitmap
            if (!bitmap) {
                try {
                    if (typeof galaxy !== 'undefined' && galaxy?.systems?.[systemIndex]) {
                        galaxy.systems[systemIndex]._starfieldTiles?.delete(key);
                    }
                } catch (_) { }
                return;
            }

            // Validate key format
            const parts = String(key).split(',');
            if (parts.length !== 2) {
                _safeCloseBitmap(bitmap);
                return;
            }

            // Queue overflow protection - drop oldest if at capacity
            const maxPending = STARFIELD_CONFIG.MAX_PENDING_BITMAPS || 20;
            while (PENDING_STARFIELD_BITMAPS.length >= maxPending) {
                const dropped = PENDING_STARFIELD_BITMAPS.shift();
                if (dropped) {
                    _safeCloseBitmap(dropped.bitmap);
                    // Mark tile as needing regeneration
                    try {
                        if (typeof galaxy !== 'undefined' && galaxy?.systems?.[dropped.systemIndex]) {
                            galaxy.systems[dropped.systemIndex]._starfieldTiles?.delete(dropped.key);
                        }
                    } catch (_) { }
                }
            }

            // Queue the bitmap for deferred processing
            PENDING_STARFIELD_BITMAPS.push({
                key,
                bitmap,
                systemIndex,
                receivedAt: performance.now()
            });
        };

        // Cleanup on page unload
        try {
            if (typeof window !== 'undefined' && window) {
                window.addEventListener('beforeunload', () => {
                    // Close any pending bitmaps
                    while (PENDING_STARFIELD_BITMAPS.length > 0) {
                        const item = PENDING_STARFIELD_BITMAPS.shift();
                        _safeCloseBitmap(item?.bitmap);
                    }
                    // Terminate worker
                    try {
                        if (STARFIELD_TILE_WORKER) {
                            STARFIELD_TILE_WORKER.terminate();
                        }
                    } catch (_) { }
                    STARFIELD_TILE_WORKER = null;
                });
            }
        } catch (_) { }

    } catch (e) {
        STARFIELD_TILE_WORKER = null;
        if (STAR_SYSTEM_DEBUG) {
            console.warn('Failed to initialize starfield worker:', e);
        }
    }
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
        this.enemiesById = new Map(); // Fast O(1) lookups by enemy ID

        // Cache diagonal distance for spawn calculations
        this._cachedDiagonalDist = null;
        this.projectiles = [];
        this.mines = []; // Proximity mines array
        this.beams = [];
        this.forceWaves = []; // Make sure this is initialized
        this.explosions = [];
        this.summonPings = [];
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
        this._spawnTimer = SPAWN_CONFIG.SPAWN_INTERVAL_MS || 5000; // NPC + repair tender spawn timer
        this.shouldSpawnNPCs = true; // Enable NPC spawning by default
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

        // Pre-allocate reusable Sets for collision pair deduplication (hot path optimization)
        // Clears and reuses instead of creating new Set each frame, reducing GC pressure
        this._checkedEnemyPairs = new Set();
        this._checkedAsteroidPairs = new Set();
        this._checkedForceWaveEnemyPairs = new Set();

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

        // === Combat Stats Tracking for News ===
        this.combatStats = {
            pirates: 0,
            police: 0,
            military: 0,
            separatists: 0,
            aliens: 0,
            total: 0,
            pilotKills: new Map(), // Map<pilotName, {kills, faction, shipType}>
            recentDeaths: [], // Recent death names for news headlines
            lastReportTime: 0
        };
        this._combatReportThreshold = 5; // Generate news after this many kills
        this._heroReportThreshold = 3; // Generate hero news after this many kills by one pilot
        this.residentNPCs = []; // Roster of recurring resident NPCs in this system
        this.factionInfluence = { Imperial: 0.10, Separatist: 0.10, Military: 0.10 };

        // === Ambient Environmental Effects ===
        this.ambientBackgroundEvents = [];
        this.microAsteroidHail = new MicroAsteroidHail(this);
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
            this.player.isWanted = wanted;
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
     * Dynamically adjusts faction influence in the system and triggers news if threshold met.
     * After adjusting the target faction, re-normalizes all factions so they sum to exactly 1.0.
     * @param {string} factionName - Name of the faction ('Imperial', 'Separatist', 'Military')
     * @param {number} amount - Amount to adjust (positive or negative)
     * @param {boolean} [silent=false] - If true, suppress news generation (used for background shifts)
     */
    adjustFactionInfluence(factionName, amount, silent = false) {
        if (!this.factionInfluence || this.factionInfluence[factionName] === undefined) return;

        const oldInfluence = this.factionInfluence[factionName];
        let newInfluence = Math.max(0, Math.min(1.0, oldInfluence + amount));
        
        // Round to 2 decimal places to avoid floating point issues
        newInfluence = Math.round(newInfluence * 100) / 100;
        
        if (newInfluence === oldInfluence) return;

        this.factionInfluence[factionName] = newInfluence;

        // Re-normalize other factions so the total stays at exactly 1.0
        const otherFactions = Object.keys(this.factionInfluence).filter(f => f !== factionName);
        const otherTotal = otherFactions.reduce((sum, f) => sum + this.factionInfluence[f], 0);
        const remainingBudget = Math.max(0, 1.0 - newInfluence);

        if (otherTotal > 0) {
            // Scale other factions proportionally to fill the remaining budget
            let allocated = 0;
            for (let i = 0; i < otherFactions.length - 1; i++) {
                const f = otherFactions[i];
                const val = Math.round((this.factionInfluence[f] / otherTotal) * remainingBudget * 100) / 100;
                this.factionInfluence[f] = val;
                allocated += val;
            }
            if (otherFactions.length > 0) {
                const finalFaction = otherFactions[otherFactions.length - 1];
                this.factionInfluence[finalFaction] = Math.max(0, Math.round((remainingBudget - allocated) * 100) / 100);
            }
        } else if (otherFactions.length > 0) {
            // All other factions are at 0; distribute remaining budget equally
            let allocated = 0;
            const share = Math.round((remainingBudget / otherFactions.length) * 100) / 100;
            for (let i = 0; i < otherFactions.length - 1; i++) {
                const f = otherFactions[i];
                this.factionInfluence[f] = share;
                allocated += share;
            }
            const finalFaction = otherFactions[otherFactions.length - 1];
            this.factionInfluence[finalFaction] = Math.max(0, Math.round((remainingBudget - allocated) * 100) / 100);
        }

        let diff = Math.abs(newInfluence - oldInfluence);
        diff = Math.round(diff * 100) / 100;

        // Check if the change is significant enough to report (>= 0.05 shift)
        if (!silent && diff >= 0.05) {
            const direction = amount > 0 ? 'increase' : 'decrease';
            if (typeof GameGlobals !== 'undefined' && GameGlobals.newsManager && typeof GameGlobals.newsManager.addFactionInfluenceNews === 'function') {
                GameGlobals.newsManager.addFactionInfluenceNews(this.name, factionName, direction, newInfluence);
            }
        }
    }

    /**
     * Batch adjusts faction influence values and normalizes them once.
     * @param {Object} adjustments - Map of faction keys ('Imperial', 'Separatist', 'Military') to delta amounts
     * @param {boolean} [silent=false] - If true, suppress news alerts
     */
    adjustFactionInfluenceBatch(adjustments, silent = false) {
        if (!this.factionInfluence) return;

        // Apply all deltas first and clamp values temporarily to [0, 1]
        const oldInfluences = { ...this.factionInfluence };
        const updatedFactions = [];

        for (const [factionName, amount] of Object.entries(adjustments)) {
            if (this.factionInfluence[factionName] !== undefined) {
                let val = this.factionInfluence[factionName] + amount;
                this.factionInfluence[factionName] = Math.max(0, Math.min(1.0, val));
                updatedFactions.push(factionName);
            }
        }

        // Renormalize so the total is exactly 1.0.
        const allFactions = Object.keys(this.factionInfluence);
        const nonUpdatedFactions = allFactions.filter(f => !updatedFactions.includes(f));

        const updatedSum = updatedFactions.reduce((sum, f) => sum + this.factionInfluence[f], 0);
        const remainingBudget = Math.max(0, 1.0 - updatedSum);

        if (nonUpdatedFactions.length > 0) {
            const nonUpdatedTotal = nonUpdatedFactions.reduce((sum, f) => sum + this.factionInfluence[f], 0);
            if (nonUpdatedTotal > 0) {
                // Distribute remainingBudget proportionally among non-updated factions
                let allocated = 0;
                for (let i = 0; i < nonUpdatedFactions.length - 1; i++) {
                    const f = nonUpdatedFactions[i];
                    const val = Math.round((this.factionInfluence[f] / nonUpdatedTotal) * remainingBudget * 100) / 100;
                    this.factionInfluence[f] = val;
                    allocated += val;
                }
                const finalF = nonUpdatedFactions[nonUpdatedFactions.length - 1];
                this.factionInfluence[finalF] = Math.max(0, Math.round((remainingBudget - allocated) * 100) / 100);
            } else {
                // Non-updated factions are 0; distribute remaining budget equally
                let allocated = 0;
                const share = Math.round((remainingBudget / nonUpdatedFactions.length) * 100) / 100;
                for (let i = 0; i < nonUpdatedFactions.length - 1; i++) {
                    const f = nonUpdatedFactions[i];
                    this.factionInfluence[f] = share;
                    allocated += share;
                }
                const finalF = nonUpdatedFactions[nonUpdatedFactions.length - 1];
                this.factionInfluence[finalF] = Math.max(0, Math.round((remainingBudget - allocated) * 100) / 100);
            }
        } else {
            // All factions were updated. Scale all of them so they sum to 1.0.
            const totalSum = allFactions.reduce((sum, f) => sum + this.factionInfluence[f], 0);
            if (totalSum > 0) {
                let allocated = 0;
                for (let i = 0; i < allFactions.length - 1; i++) {
                    const f = allFactions[i];
                    const val = Math.round((this.factionInfluence[f] / totalSum) * 100) / 100;
                    this.factionInfluence[f] = val;
                    allocated += val;
                }
                const finalF = allFactions[allFactions.length - 1];
                this.factionInfluence[finalF] = Math.max(0, Math.round((1.0 - allocated) * 100) / 100);
            } else {
                // Fallback: distribute equally
                const share = Math.round((1.0 / allFactions.length) * 100) / 100;
                let allocated = 0;
                for (let i = 0; i < allFactions.length - 1; i++) {
                    const f = allFactions[i];
                    this.factionInfluence[f] = share;
                    allocated += share;
                }
                const finalF = allFactions[allFactions.length - 1];
                this.factionInfluence[finalF] = Math.max(0, Math.round((1.0 - allocated) * 100) / 100);
            }
        }

        // Trigger news for any significant shifts (>= 0.05 shift) in the primary updated faction
        if (!silent) {
            for (const factionName of updatedFactions) {
                let diff = Math.abs(this.factionInfluence[factionName] - oldInfluences[factionName]);
                diff = Math.round(diff * 100) / 100;
                if (diff >= 0.05) {
                    const amount = adjustments[factionName];
                    const direction = amount > 0 ? 'increase' : 'decrease';
                    if (typeof GameGlobals !== 'undefined' && GameGlobals.newsManager && typeof GameGlobals.newsManager.addFactionInfluenceNews === 'function') {
                        GameGlobals.newsManager.addFactionInfluenceNews(this.name, factionName, direction, this.factionInfluence[factionName]);
                    }
                    break; // Just trigger one news alert per batch to avoid spam
                }
            }
        }
    }

    /**
     * Records the destruction of an NPC for combat news tracking.
     * Tracks deaths by faction and kills by attacker pilot.
     * Generates news when thresholds are met.
     * @param {Enemy} destroyedEnemy - The enemy that was destroyed
     * @param {Object} [attacker] - The entity that destroyed the enemy (optional)
     */
    recordDestruction(destroyedEnemy, attacker = null) {
        if (!destroyedEnemy || !this.combatStats) return;

        // Trigger minimap kill indicator with enemy's color
        if (typeof uiManager !== 'undefined' && uiManager.minimap && typeof uiManager.minimap.addKillIndicator === 'function') {
            // Determine enemy color based on faction or role (matching minimap enemy drawing logic)
            let killColor = null;
            if (typeof FACTION_COLORS !== 'undefined') {
                if (destroyedEnemy.faction === 'IMPERIAL') {
                    killColor = FACTION_COLORS.IMPERIAL;
                } else if (destroyedEnemy.faction === 'SEPARATIST') {
                    killColor = FACTION_COLORS.SEPARATIST;
                } else if (destroyedEnemy.faction === 'MILITARY') {
                    killColor = FACTION_COLORS.MILITARY;
                }
            }
            if (!killColor && typeof ROLE_COLORS !== 'undefined') {
                const role = destroyedEnemy.role || destroyedEnemy.aiRole;
                killColor = ROLE_COLORS[role] || [255, 80, 80];
            }
            uiManager.minimap.addKillIndicator(destroyedEnemy.pos, killColor);
        }

        const role = destroyedEnemy.originalRole || destroyedEnemy.role;
        const faction = destroyedEnemy.faction;
        const enemyName = destroyedEnemy.displayName || null;

        // Track death by role/faction
        if (typeof AI_ROLE !== 'undefined') {
            if (role === AI_ROLE.PIRATE) {
                this.combatStats.pirates++;
            } else if (role === AI_ROLE.POLICE) {
                this.combatStats.police++;
            } else if (role === AI_ROLE.ALIEN) {
                this.combatStats.aliens++;
            } else if (faction === 'IMPERIAL' || faction === 'MILITARY') {
                this.combatStats.military++;
            } else if (faction === 'SEPARATIST') {
                this.combatStats.separatists++;
            }
        }
        this.combatStats.total++;

        // Adjust faction influence based on destroyed ship
        const deltas = {};
        if (faction === 'IMPERIAL') {
            deltas.Imperial = -0.05;
            deltas.Separatist = 0.02;
        } else if (faction === 'SEPARATIST') {
            deltas.Separatist = -0.05;
            deltas.Imperial = 0.02;
        } else if (faction === 'MILITARY') {
            deltas.Military = -0.05;
            deltas.Separatist = 0.02;
        }

        // If the destroyed ship was a notorious pirate, reward dominant system faction
        if (destroyedEnemy.isNotoriousPirate) {
            const dominantFaction = this._getDominantFaction();
            deltas[dominantFaction] = (deltas[dominantFaction] || 0) + 0.05;
        }

        if (Object.keys(deltas).length > 0) {
            this.adjustFactionInfluenceBatch(deltas);
        }

        // Track recent death names for headlines
        if (enemyName) {
            this.combatStats.recentDeaths.push(enemyName);
            if (this.combatStats.recentDeaths.length > 10) {
                this.combatStats.recentDeaths.shift();
            }
        }

        // Track kills by attacker (for hero news)
        if (attacker && attacker.displayName && attacker !== this.player) {
            const attackerName = attacker.displayName;
            const attackerFaction = attacker.faction;
            const existing = this.combatStats.pilotKills.get(attackerName);
            if (existing) {
                existing.kills++;
            } else {
                this.combatStats.pilotKills.set(attackerName, {
                    kills: 1,
                    faction: attackerFaction,
                    shipType: attacker.shipTypeName
                });
            }

            // Check for hero threshold
            const stats = this.combatStats.pilotKills.get(attackerName);
            if (stats && stats.kills >= this._heroReportThreshold) {
                this._generateHeroNews(attackerName, stats.kills, stats.faction);
                // Reset after reporting
                stats.kills = 0;
            }
        }

        // Check if we should generate combat report news
        this._checkCombatReportThreshold();
    }

    /**
     * Checks if combat stats meet threshold for news generation
     * @private
     */
    _checkCombatReportThreshold() {
        if (!this.combatStats) return;
        const now = Date.now();

        // Rate limit: don't report more often than every 30 seconds
        if (now - this.combatStats.lastReportTime < 30000) return;

        // Check each faction for threshold
        const threshold = this._combatReportThreshold || 5;
        const systemName = this.name || 'Unknown System';

        if (this.combatStats.pirates >= threshold) {
            this._generateCombatNews('PIRATE', this.combatStats.pirates, systemName);
            this.combatStats.pirates = 0;
        } else if (this.combatStats.police >= threshold) {
            this._generateCombatNews('POLICE', this.combatStats.police, systemName);
            this.combatStats.police = 0;
        } else if (this.combatStats.military >= threshold) {
            this._generateCombatNews('IMPERIAL', this.combatStats.military, systemName);
            this.combatStats.military = 0;
        } else if (this.combatStats.separatists >= threshold) {
            this._generateCombatNews('SEPARATIST', this.combatStats.separatists, systemName);
            this.combatStats.separatists = 0;
        } else if (this.combatStats.aliens >= threshold) {
            this._generateCombatNews('ALIEN', this.combatStats.aliens, systemName);
            this.combatStats.aliens = 0;
        }
    }

    /**
     * Generates combat news via NewsManager
     * @private
     */
    _generateCombatNews(factionType, count, systemName) {
        if (typeof GameGlobals === 'undefined' || !GameGlobals.newsManager) return;

        const notableName = this.combatStats.recentDeaths.length > 0
            ? this.combatStats.recentDeaths[this.combatStats.recentDeaths.length - 1]
            : null;

        GameGlobals.newsManager.addCombatReportNews(factionType, count, systemName, notableName);
        this.combatStats.lastReportTime = Date.now();
        this.combatStats.recentDeaths = []; // Clear after reporting
    }

    /**
     * Generates hero news via NewsManager
     * @private
     */
    _generateHeroNews(pilotName, kills, faction) {
        if (typeof GameGlobals === 'undefined' || !GameGlobals.newsManager) return;

        const systemName = this.name || 'Unknown System';
        GameGlobals.newsManager.addHeroNews(pilotName, kills, faction, systemName);
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
            this.despawnRadius = SPAWN_CONFIG.FIXED_LARGE_DESPAWN_RADIUS;
            console.log(`         Despawn Radius set to fixed value: ${this.despawnRadius}`); // Add log
        } catch (e) {
            console.error("         Error setting fixed despawnRadius:", e);
            this.despawnRadius = SPAWN_CONFIG.FIXED_LARGE_DESPAWN_RADIUS; // Use fixed fallback
        }

        // Note: Stars are now generated procedurally in drawBackground() - no need to pre-generate them

        // --- Initialize Planets (This will also position the station) ---
        try { this.createRandomPlanets(); }
        catch (e) { console.error("Error during createRandomPlanets call:", e); }

        // --- Secret Station Generation ---
        // Secret stations only spawn in faction systems (Imperial, Separatist, Military)
        // and are guaranteed to spawn (100% rate) if the system has enough planets
        this.secretStations = [];
        const economyLower = (this.economyType || "").toLowerCase();
        const isFactionSystem = economyLower === "imperial" ||
            economyLower === "separatist" ||
            economyLower === "military";

        if (isFactionSystem && this.planets && this.planets.length > 2) { // Faction system with at least 3 planets (sun + main station planet + 1 more)
            try {
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
                    if (economyLower === "military") subtype = "secret_military";
                    else if (economyLower === "separatist") subtype = "secret_separatist";
                    else if (economyLower === "imperial") subtype = "secret_imperial";

                    let secretName = `${this.name} Secret Base`;
                    let secretStation = new Station(pos.x, pos.y, this.economyType, secretName, true, subtype);
                    this.secretStations.push(secretStation);
                    console.log(`         Successfully created Secret Station: ${secretName} (${subtype}) near planet index ${planetIdx}`);
                }
            } catch (e) {
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

        // Spawn space objects for planets now (after asteroids and planets)
        try {
            this.spawnSpaceObjectsForPlanets();
        } catch (e) {
            console.error(`!!! ERROR during spawnSpaceObjectsForPlanets():`, e);
        }

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

        // --- Deterministic Resident NPC Roster Generation ---
        this.residentNPCs = [];
        const createDeterministicRandom = (seedVal) => {
            let s = seedVal;
            return () => {
                s = Math.sin(s) * 10000;
                return s - Math.floor(s);
            };
        };
        const rng = createDeterministicRandom(seedToUse);

        const firstNamesList = (typeof NPC_FIRST_NAMES !== 'undefined') ? NPC_FIRST_NAMES : ["Alex", "River", "Jordan", "Gray", "Parker", "Taylor", "Morgan"];
        const lastNamesList = (typeof NPC_LAST_NAMES !== 'undefined') ? NPC_LAST_NAMES : ["Stone", "Reed", "Vale", "West", "Smith", "Nguyen", "Kim", "Patel"];

        // Use the same spawn ratios as normal system spawning, but with deterministic RNG.
        const spawnProbabilities = (typeof SpawnConfig !== 'undefined' && SpawnConfig && typeof SpawnConfig.getProbabilities === 'function')
            ? SpawnConfig.getProbabilities(this.economyType, this.securityLevel)
            : null;

        const weightedRoleEntries = spawnProbabilities
            ? Object.entries(spawnProbabilities).filter(([, weight]) => typeof weight === 'number' && weight > 0)
            : [];

        const pickByRng = (list, fallbackValue) => {
            if (Array.isArray(list) && list.length > 0) {
                return list[Math.floor(rng() * list.length)];
            }
            return fallbackValue;
        };

        const deterministicPicker = (list) => pickByRng(list, Array.isArray(list) && list.length > 0 ? list[0] : null);

        const getRoleAndShip = () => {
            if (weightedRoleEntries.length === 0) {
                // Fallback to normal selection path only when SpawnConfig is available.
                if (typeof SpawnConfig !== 'undefined' && SpawnConfig && typeof SpawnConfig.getProbabilities === 'function') {
                    const fallbackSelection = this._selectShipForEconomy(this.economyType, this.securityLevel);
                    if (fallbackSelection && fallbackSelection.role && fallbackSelection.ship) {
                        return { role: fallbackSelection.role, shipType: fallbackSelection.ship };
                    }
                }
                const fallbackResolved = this._resolveShipForRole('HAULER', this.economyType, deterministicPicker);
                return {
                    role: fallbackResolved?.role || 'HAULER',
                    shipType: fallbackResolved?.ship || pickByRng(HAULER_SHIPS, 'CobraMkIII')
                };
            }

            const roleProbabilityMap = Object.fromEntries(weightedRoleEntries);
            const fallbackRoleKey = weightedRoleEntries[weightedRoleEntries.length - 1][0] || 'HAULER';
            const selectedRoleKey = this._selectRoleFromProbabilities(roleProbabilityMap, rng);
            const roleKey = selectedRoleKey || fallbackRoleKey;

            const resolved = this._resolveShipForRole(roleKey, this.economyType, deterministicPicker);
            return {
                role: resolved?.role || 'HAULER',
                shipType: resolved?.ship || pickByRng(HAULER_SHIPS, 'CobraMkIII')
            };
        };

        for (let idx = 0; idx < 12; idx++) {
            const firstIdx = Math.floor(rng() * firstNamesList.length);
            const lastIdx = Math.floor(rng() * lastNamesList.length);
            const fullName = `${firstNamesList[firstIdx]} ${lastNamesList[lastIdx]}`;
            const { role, shipType } = getRoleAndShip();
            this.residentNPCs.push({
                name: fullName,
                role: role,
                shipType: shipType
            });
        }

        // --- Deterministic Faction Influence Generation ---
        this.factionInfluence = this._buildInitialFactionInfluence(rng);

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

            // Calculate properties BEFORE creation to ensure name generation is accurate
            // Tech Level & Economy Logic
            let techVal = (typeof this.techLevel === 'number') ? this.techLevel : 3;
            techVal = Math.max(1, Math.min(5, techVal)); // Clamp 1-5

            let inhabitedChance = map(techVal, 1, 5, 0.1, 0.75);
            let minDens = map(techVal, 1, 5, 0.3, 0.6);
            let maxDens = map(techVal, 1, 5, 0.5, 0.95);

            // Economy Overrides
            const eco = this.economyType || "Unknown";
            if (["Post Human", "Offworld"].includes(eco)) {
                // Post Human/Offworld: Full inhabited, high density
                inhabitedChance = 0.95;
                minDens = 0.7;
                maxDens = 1.0;
            } else if (["Mining", "Industrial", "Refinery"].includes(eco)) {
                // Industrial/Mining: Very sparse
                inhabitedChance *= 0.3;
                minDens = 0.2;
                maxDens = 0.5;
            }

            const isInhabited = random() < inhabitedChance;
            const cityLightsDensity = isInhabited ? random(minDens, maxDens) : 0;

            const planetOptions = {
                isInhabited: isInhabited,
                cityLightsDensity: cityLightsDensity,
                economyType: eco,
                techLevel: techVal
            };

            // Create the planet with options
            let planet = new Planet(px, py, sz, c1, c2, this.name, i + 1, planetOptions);

            this.planets.push(planet);

            console.log(`Planet ${i}: angle=${angle.toFixed(2)}, orbitRadius=${orbitRadius.toFixed(2)}, px=${px.toFixed(2)}, py=${py.toFixed(2)}, inhabited=${planet.isInhabited}, density=${planet.cityLightsDensity?.toFixed(2) || 0} (Eco: ${eco})`);
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

        // Simulate minor faction background shifts on entry (35% chance)
        // Silent=true to avoid spamming the news feed with routine background drift
        if (Math.random() < 0.35) {
            const factions = ['Imperial', 'Separatist', 'Military'];
            const faction = factions[Math.floor(Math.random() * factions.length)];
            const direction = Math.random() < 0.5 ? 0.05 : -0.05;
            this.adjustFactionInfluence(faction, direction, true);
        }

        this.enemies = []; this.enemiesById.clear(); // Clear both array and Map
        this.projectiles = []; this.mines = []; this.asteroids = []; this.harpoons = [];
        this.summonPings = [];
        if (this.spatialHash) this.spatialHash.clear(); // Clear spatial hash on entry to prevent stale queries
        // Reset timers when entering
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;

        // Initialize spawn timer if not set (prevents NaN)
        if (typeof this._spawnTimer !== 'number' || isNaN(this._spawnTimer)) {
            this._spawnTimer = SPAWN_CONFIG.SPAWN_INTERVAL_MS || 5000;
        }

        // Note: Do NOT clear spaceObjects array - these are static decorative elements
        // that should persist across visits and are created during initStaticElements

        // CRITICAL FIX: Associate the player with this system
        this.player = player;
        if (player) {
            player.isWanted = this.playerWanted;
        }

        // Reset starfield buffer to force regeneration with new player position
        this.resetStarfieldBuffer();

        // Pre-warm starfield tiles around player's arrival position
        // This queues a 5x5 grid of tiles for background worker generation
        if (player && player.pos) {
            this.prewarmStarfieldTiles(player.pos.x, player.pos.y);
        }

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

                // Create allied formation wing if player has joined a faction
                // Friendly faction combat ships will form up around the player.
                if (this.player.playerFaction && typeof wingManager !== 'undefined') {
                    const wingId = wingManager.getOrCreatePlayerWing(this.player, this.player.playerFaction);

                    // Re-spawn wing members that jumped with the player
                    if (Array.isArray(this.player._wingTransferData) && this.player._wingTransferData.length > 0) {
                        for (const wd of this.player._wingTransferData) {
                            const angle = random(TWO_PI);
                            const dist = 100 + random(100);
                            const sx = this.player.pos.x + cos(angle) * dist;
                            const sy = this.player.pos.y + sin(angle) * dist;

                            const follower = new Enemy(sx, sy, this.player, wd.shipType, AI_ROLE.COMBAT);
                            follower.calculateRadianProperties();
                            follower.initializeColors();
                            follower.faction = wd.faction || this.player.playerFaction;
                            if (wd.hull && wd.maxHull) {
                                follower.hull = wd.hull;
                                follower.maxHull = wd.maxHull;
                            }
                            if (wd.displayName) follower.displayName = wd.displayName;
                            if (wd.gender) follower.gender = wd.gender;

                            // Register in the new formation wing
                            const joined = wingManager.addMember(wingId, follower);
                            if (joined) {
                                follower.changeState(AI_STATE.WING_FLYING);
                                this.addEnemy(follower);
                            }
                        }
                        this.player._wingTransferData = null;
                    }
                }

                // CHANGE: Use this.player in method calls
                for (let i = 0; i < 3; i++) {
                    try { this.trySpawnNPC(); } catch (e) { }
                }

                // Also check if we need to spawn a repair tender
                try { this.spawnRepairTender(); } catch (e) { }

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

        // Clear pending bitmaps for this system to prevent stale tiles from being processed
        // after a system change (bitmaps for other systems will be handled by age timeout)
        if (typeof PENDING_STARFIELD_BITMAPS !== 'undefined' && Array.isArray(PENDING_STARFIELD_BITMAPS)) {
            for (let i = PENDING_STARFIELD_BITMAPS.length - 1; i >= 0; i--) {
                const item = PENDING_STARFIELD_BITMAPS[i];
                if (item && item.systemIndex === this.systemIndex) {
                    PENDING_STARFIELD_BITMAPS.splice(i, 1);
                    if (typeof _safeCloseBitmap === 'function') {
                        _safeCloseBitmap(item.bitmap);
                    } else {
                        try { item.bitmap?.close?.(); } catch (_) { }
                    }
                }
            }
        }
    }

    /**
     * Pre-warms starfield tiles around a given position.
     * Queues a grid of tiles for background generation, giving the worker a head start
     * before gameplay begins. This reduces stuttering on system entry.
     * @param {number} centerX - X coordinate to center the pre-warming around
     * @param {number} centerY - Y coordinate to center the pre-warming around
     * @param {number} [gridRadius=2] - Number of tiles to pre-warm in each direction (default 2 = 5x5 grid)
     */
    prewarmStarfieldTiles(centerX, centerY, gridRadius = 2) {
        const tileSize = this._starfieldTileSize;
        const centerTileX = Math.floor(centerX / tileSize);
        const centerTileY = Math.floor(centerY / tileSize);

        const tilesToQueue = [];

        // Build a grid of tiles around the center
        for (let dx = -gridRadius; dx <= gridRadius; dx++) {
            for (let dy = -gridRadius; dy <= gridRadius; dy++) {
                const tx = centerTileX + dx;
                const ty = centerTileY + dy;
                const key = `${tx},${ty}`;

                // Skip if already cached or pending
                if (!this._starfieldTiles.has(key)) {
                    // Calculate distance from center for priority (closer = higher priority)
                    const dist = Math.sqrt(dx * dx + dy * dy);
                    tilesToQueue.push({ tx, ty, key, priority: dist });
                }
            }
        }

        // Sort by distance (closest first)
        tilesToQueue.sort((a, b) => a.priority - b.priority);

        // Queue all tiles for generation
        for (const tile of tilesToQueue) {
            const alreadyQueued = this._starfieldTileQueue.some(q => q.key === tile.key);
            if (!alreadyQueued) {
                this._starfieldTileQueue.push(tile);
            }
        }

        // Immediately process some tiles to get things started
        // Process 9 tiles (covers the 3x3 center grid) since new games have no fade transition
        const burstCount = Math.min(tilesToQueue.length, 9);
        for (let i = 0; i < burstCount && this._starfieldTileQueue.length > 0; i++) {
            const tile = this._starfieldTileQueue.shift();
            if (tile && !this._starfieldTiles.has(tile.key)) {
                this._generateTile(tile.tx, tile.ty);
            }
        }

        if (STAR_SYSTEM_DEBUG) {
            console.log(`Prewarmed ${tilesToQueue.length} starfield tiles around (${centerX.toFixed(0)}, ${centerY.toFixed(0)})`);
        }
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
    /**
     * Selects appropriate ship type based on system economy and security level.
     * Uses centralized SpawnConfig for data-driven probabilities.
     * 
     * @param {string} economy - System economy type
     * @param {string} security - System security level
     * @returns {{role: string, ship: string, faction?: string}} Selected ship role and type
     * @private
     */
    _selectShipForEconomy(economy, security) {
        // Check for active war state - influences spawn distribution
        const em = typeof eventManager !== 'undefined' ? eventManager : null;
        if (em && em.activeWarState && em.activeWarState.isActive && em.activeWarState.spawnModifiers) {
            const warSelection = this._selectWarInfluencedShip(em.activeWarState);
            if (warSelection) return warSelection;
        }

        // Check for active crises (famine or plague) - adjusts spawn distribution
        if (em && em.activeCrisisState) {
            const systemIndex = this.systemIndex;
            // Check Famine
            if (em.activeCrisisState.famine && typeof em.getAffectedSystemsForCrisis === 'function') {
                const affected = em.getAffectedSystemsForCrisis('famine');
                if (affected.includes(systemIndex)) {
                    const r = random();
                    const roleKey = r < 0.45 ? 'HAULER' : (r < 0.80 ? 'PIRATE' : 'POLICE');
                    return this._resolveShipForRole(roleKey, economy);
                }
            }
            // Check Plague
            if (em.activeCrisisState.plague && typeof em.getAffectedSystemsForCrisis === 'function') {
                const affected = em.getAffectedSystemsForCrisis('plague');
                if (affected.includes(systemIndex)) {
                    const r = random();
                    const roleKey = r < 0.45 ? 'HAULER' : (r < 0.75 ? 'PIRATE' : 'HEALER');
                    return this._resolveShipForRole(roleKey, economy);
                }
            }
        }

        // Use centralized SpawnConfig for all spawn probabilities
        const probs = SpawnConfig.getProbabilities(economy, security);

        // Select role based on probabilities
        const chosenRoleKey = this._selectRoleFromProbabilities(probs);

        // Resolve role key to actual ship instance
        return this._resolveShipForRole(chosenRoleKey, economy);
    }

    /**
     * Helper to select a role key from a probability map.
     * @param {Object} probs - Map of role keys to probabilities (e.g., { COMBAT: 0.6, HAULER: 0.4 })
     * @returns {string} Selected role key
     * @private
     */
    _selectRoleFromProbabilities(probs, rollProvider = random) {
        // Validation for safety
        if (!probs) return 'HAULER';

        const getRoll = (typeof rollProvider === 'function') ? rollProvider : random;
        let r = getRoll();
        let cumulative = 0;

        for (const [key, chance] of Object.entries(probs)) {
            cumulative += chance;
            if (r < cumulative) return key;
        }

        // Fallback to last key or default
        return Object.keys(probs).pop() || 'HAULER';
    }

    /**
     * Returns the currently dominant faction in this system.
     * Ties default to Military for deterministic behavior.
     * @returns {'Imperial'|'Separatist'|'Military'}
     * @private
     */
    _getDominantFaction() {
        const influence = this.factionInfluence || { Imperial: 0, Separatist: 0, Military: 0 };
        if (influence.Imperial > influence.Military && influence.Imperial > influence.Separatist) {
            return 'Imperial';
        }
        if (influence.Separatist > influence.Imperial && influence.Separatist > influence.Military) {
            return 'Separatist';
        }
        return 'Military';
    }

    /**
     * Builds the initial faction influence map for this system.
     * @param {() => number} [rng] - Optional deterministic RNG used during static init
     * @returns {{Imperial:number, Separatist:number, Military:number}}
     * @private
     */
    _buildInitialFactionInfluence(rng = random) {
        const econLower = (this.economyType || '').toLowerCase();
        if (econLower === 'imperial') {
            return { Imperial: 0.70, Separatist: 0.10, Military: 0.20 };
        }
        if (econLower === 'separatist') {
            return { Imperial: 0.10, Separatist: 0.70, Military: 0.20 };
        }
        if (econLower === 'military') {
            return { Imperial: 0.20, Separatist: 0.10, Military: 0.70 };
        }

        // Independent systems still have full control distributed across factions.
        const getRoll = (typeof rng === 'function') ? rng : random;
        const w1 = getRoll() + 0.01;
        const w2 = getRoll() + 0.01;
        const w3 = getRoll() + 0.01;
        const total = w1 + w2 + w3;
        const imperial = Math.round((w1 / total) * 100) / 100;
        const separatist = Math.round((w2 / total) * 100) / 100;
        const military = Math.max(0, Math.round((1 - imperial - separatist) * 100) / 100);

        return { Imperial: imperial, Separatist: separatist, Military: military };
    }

    /**
     * Resolves a configuration role key to a concrete ship and AI role.
     * Maps abstract config roles (FACTION_COMBAT) to specific game data.
     * 
     * @param {string} roleKey - The selected role key from config
     * @param {string} economy - The current economy (context for specific arrays)
     * @param {(list: string[]) => string} [picker] - Optional ship picker (defaults to random)
     * @returns {{role: string, ship: string, faction?: string}}
     * @private
     */
    _resolveShipForRole(roleKey, economy, picker = random) {
        const econ = (economy || '').toUpperCase();

        const pickShip = (preferredList, fallbackListOrValue = null) => {
            const hasPreferred = Array.isArray(preferredList) && preferredList.length > 0;
            let pool = hasPreferred ? preferredList : null;

            if (!pool) {
                if (Array.isArray(fallbackListOrValue)) {
                    pool = fallbackListOrValue.length > 0 ? fallbackListOrValue : null;
                } else if (fallbackListOrValue) {
                    pool = [fallbackListOrValue];
                }
            }

            if (!pool || pool.length === 0) {
                return null;
            }

            if (typeof picker === 'function') {
                try {
                    const chosen = picker(pool);
                    if (chosen !== undefined && chosen !== null) {
                        return chosen;
                    }
                } catch (_) {
                    // Fall through to default random choice.
                }
            }

            return random(pool);
        };

        switch (roleKey) {
            case 'COMBAT':
                // Context-aware combat ships
                if (econ === 'MILITARY') return { role: AI_ROLE.COMBAT, ship: pickShip(MILITARY_SHIPS, COMBAT_SHIPS) };
                if (econ === 'POST HUMAN') return { role: AI_ROLE.COMBAT, ship: pickShip(COMBAT_SHIPS, 'Sidewinder') };
                if (econ === 'OFFWORLD') return { role: AI_ROLE.COMBAT, ship: pickShip(COMBAT_SHIPS, 'Sidewinder') };
                return { role: AI_ROLE.COMBAT, ship: pickShip(COMBAT_SHIPS, 'Sidewinder') };

            case 'FACTION_COMBAT':
                if (econ === 'SEPARATIST') return { role: AI_ROLE.COMBAT, ship: pickShip(SEPARATIST_SHIPS, COMBAT_SHIPS) };
                if (econ === 'IMPERIAL') return { role: AI_ROLE.COMBAT, ship: pickShip(IMPERIAL_SHIPS, COMBAT_SHIPS) };
                return { role: AI_ROLE.COMBAT, ship: pickShip(COMBAT_SHIPS, 'Sidewinder') };

            case 'RIVAL_COMBAT':
                if (econ === 'SEPARATIST') return { role: AI_ROLE.COMBAT, ship: pickShip(IMPERIAL_SHIPS, COMBAT_SHIPS) }; // Imperials invading Separatist
                if (econ === 'IMPERIAL') return { role: AI_ROLE.COMBAT, ship: pickShip(SEPARATIST_SHIPS, COMBAT_SHIPS) }; // Separatists invading Imperial
                return { role: AI_ROLE.PIRATE, ship: pickShip(PIRATE_SHIPS, 'Krait') };

            case 'PIRATE':
                return { role: AI_ROLE.PIRATE, ship: pickShip(PIRATE_SHIPS, 'Krait') };

            case 'POLICE':
                return { role: AI_ROLE.POLICE, ship: pickShip(POLICE_SHIPS, 'ViperPol') };

            case 'HAULER':
                // Context-aware haulers
                if (econ === 'MILITARY') return { role: AI_ROLE.HAULER, ship: pickShip(MILITARY_HAULERS, HAULER_SHIPS.length ? HAULER_SHIPS : ['CobraMkIII']) };
                return { role: AI_ROLE.HAULER, ship: pickShip(HAULER_SHIPS, 'CobraMkIII') };

            case 'FACTION_HAULER':
                if (econ === 'SEPARATIST') return { role: AI_ROLE.HAULER, ship: pickShip(SEPARATIST_HAULERS, HAULER_SHIPS.length ? HAULER_SHIPS : ['CobraMkIII']) };
                if (econ === 'IMPERIAL') return { role: AI_ROLE.HAULER, ship: pickShip(IMPERIAL_HAULERS, HAULER_SHIPS.length ? HAULER_SHIPS : ['CobraMkIII']) };
                return { role: AI_ROLE.HAULER, ship: pickShip(HAULER_SHIPS, 'CobraMkIII') };

            case 'MINER':
                return { role: AI_ROLE.MINER, ship: pickShip(MINER_SHIPS, 'Krait') };

            case 'TRANSPORT':
                return { role: AI_ROLE.TRANSPORT, ship: pickShip(TRANSPORT_SHIPS, 'Type6Transporter') };

            case 'ALIEN':
                return { role: AI_ROLE.ALIEN, ship: pickShip(ALIEN_SHIPS, 'Thargoid') };

            case 'HEALER':
                return { role: AI_ROLE.HEALER, ship: pickShip(HEALER_SHIPS, 'Krait'), faction: 'SEPARATIST' };

            case 'MISSIONARY':
                return { role: AI_ROLE.MISSIONARY, ship: pickShip(MISSIONARY_SHIPS, 'Krait'), faction: 'POSTHUMAN' };

            default:
                console.warn(`Unresolved role key: ${roleKey}, defaulting to Hauler`);
                return { role: AI_ROLE.HAULER, ship: pickShip(HAULER_SHIPS, 'CobraMkIII') };
        }
    }

    /**
     * Selects a ship based on active war state spawn modifiers.
     * @param {Object} warState - Active war state with spawnModifiers
     * @returns {{role: string, ship: string, faction?: string}|null} Selected ship or null for standard selection
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
     * Spawn guards for large haulers
     * @private
     */
    _spawnGuardsForHauler(hauler) {
        const slotsLeft = this.maxEnemies - this.enemies.length;
        if (slotsLeft <= 0) return;

        const defaultGuardShips = ["ViperGuard", "GladiusFighterGuard"];
        const numGuards = hauler.size > 100 ? min(2, slotsLeft) : (random() < 0.6 ? 1 : 0);

        if (numGuards <= 0) return;

        // Create a guard wing so guards spread into distinct formation slots
        const guardFaction = hauler.faction || 'MILITARY';
        const wingId = (typeof wingManager !== 'undefined')
            ? wingManager.createGuardWing(hauler, guardFaction)
            : null;

        for (let g = 0; g < numGuards; g++) {
            let guardShipTypeName;
            if (GUARD_SHIPS.length > 0) guardShipTypeName = random(GUARD_SHIPS);
            else if (MILITARY_SHIPS.length > 0) guardShipTypeName = random(MILITARY_SHIPS);
            else guardShipTypeName = random(defaultGuardShips);

            if (!guardShipTypeName) guardShipTypeName = "ViperGuard";

            const offsetAngle = TWO_PI * (g / numGuards);
            const spawnDist = hauler.size / 2 + 30;
            const guardX = hauler.pos.x + cos(offsetAngle) * spawnDist;
            const guardY = hauler.pos.y + sin(offsetAngle) * spawnDist;

            let guardNPC = new Enemy(guardX, guardY, this.player, guardShipTypeName, AI_ROLE.GUARD);
            guardNPC.calculateRadianProperties();
            guardNPC.initializeColors();
            guardNPC.principal = hauler;
            guardNPC.changeState(AI_STATE.GUARDING, { principal: hauler });

            // Register in shared guard formation wing so guards spread into distinct slots
            if (wingId && typeof wingManager !== 'undefined') {
                wingManager.addMember(wingId, guardNPC);
            }

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
        // === Validation ===
        if (!this.player?.pos) return;

        // === Check Spawn Limit ===
        const maxEnemies = this._getMaxEnemiesForWarState();
        if (this.enemies.length >= maxEnemies) return;

        // === Ship Selection ===
        const { role: chosenRole, ship: chosenShipTypeName } = this._selectAndValidateShip();
        if (!chosenShipTypeName) {
            console.warn("StarSystem: Unable to select valid ship for spawning");
            return;
        }

        // === Calculate Spawn Position ===
        const spawnPos = this._calculateSpawnPosition();

        // === Create and Initialize Enemy ===
        try {
            const newEnemy = this._createEnemy(spawnPos.x, spawnPos.y, chosenShipTypeName, chosenRole);

            // === Post-Spawn Setup ===
            this._setupNewlySpawnedEnemy(newEnemy);

        } catch (e) {
            console.error("ERROR during trySpawnNPC (Enemy creation/init):", e, "Ship:", chosenShipTypeName, "Role:", chosenRole);
        }
    }

    /**
     * Gets the maximum enemy count based on current war state.
     * @returns {number} Maximum enemy count
     * @private
     */
    _getMaxEnemiesForWarState() {
        const em = typeof eventManager !== 'undefined' ? eventManager : null;

        if (em?.activeWarState?.isActive) {
            return em.activeWarState.intensity === 'FULL_WAR'
                ? SPAWN_CONFIG.MAX_ENEMIES_WAR
                : SPAWN_CONFIG.MAX_ENEMIES_SKIRMISH;
        }

        return SPAWN_CONFIG.MAX_ENEMIES_BASE;
    }

    /**
     * Selects ship type and validates the selection.
     * Handles special cases like Thargoid spawns and fallback defaults.
     * @returns {{role: string, ship: string}} Selected ship role and type
     * @private
     */
    _selectAndValidateShip() {
        // Get economy-based selection
        let selection = this._selectShipForEconomy(this.economyType, this.securityLevel);
        let chosenRole = selection.role;
        let chosenShipTypeName = selection.ship;

        // Apply Thargoid override for non-alien systems (rare encounter)
        if (this._shouldSpawnThargoid()) {
            chosenShipTypeName = "Thargoid";
            chosenRole = AI_ROLE.ALIEN;
            if (uiManager) {
                uiManager.addMessage(`Hostile Alien Detected: ${chosenShipTypeName}`);
            }
        }

        // Fallback to default if selection failed
        if (!chosenShipTypeName) {
            console.warn("StarSystem: chosenShipTypeName undefined after role selection, defaulting to Krait (Hauler). Role:", chosenRole);
            chosenShipTypeName = "Krait";
            chosenRole = chosenRole || AI_ROLE.HAULER;
        }

        return { role: chosenRole, ship: chosenShipTypeName };
    }

    /**
     * Determines if a Thargoid should spawn (rare event in non-alien systems).
     * @returns {boolean} True if Thargoid should spawn
     * @private
     */
    _shouldSpawnThargoid() {
        const isNonAlienSystem = this.economyType !== "alien" && this.economyType !== "Alien";
        const thargoidExists = ALIEN_SHIPS.includes("Thargoid");
        const randomChance = random() < SPAWN_CONFIG.THARGOID_SPAWN_CHANCE;

        return isNonAlienSystem && thargoidExists && randomChance;
    }

    /**
     * Calculates spawn position around the player.
     * @returns {{x: number, y: number}} Spawn coordinates
     * @private
     */
    _calculateSpawnPosition() {
        const angle = random(TWO_PI);
        const spawnDist = this._getDiagonalDistance() +
            random(SPAWN_CONFIG.SPAWN_DISTANCE_MIN, SPAWN_CONFIG.SPAWN_DISTANCE_MAX);

        return {
            x: this.player.pos.x + cos(angle) * spawnDist,
            y: this.player.pos.y + sin(angle) * spawnDist
        };
    }

    /**
     * Creates and initializes a new enemy instance.
     * @param {number} x - Spawn X coordinate
     * @param {number} y - Spawn Y coordinate
     * @param {string} shipTypeName - Ship type to spawn
     * @param {string} role - AI role for the ship
     * @returns {Enemy} The created enemy instance
     * @private
     */
    _createEnemy(x, y, shipTypeName, role) {
        let residentName = null;
        if (this.residentNPCs && this.residentNPCs.length > 0 && Math.random() < 0.60) {
            // Find resident NPCs matching this role that are NOT currently active
            const activeNames = new Set(this.enemies.map(e => e.displayName).filter(Boolean));
            const availableResidents = this.residentNPCs.filter(r => r.role === role && !activeNames.has(r.name));
            if (availableResidents.length > 0) {
                // Pick a random available resident
                const resident = availableResidents[Math.floor(Math.random() * availableResidents.length)];
                shipTypeName = resident.shipType;
                residentName = resident.name;
            }
        }

        // Check if the ship definition has a specialized aiRole that should override the generic role
        // This ensures ships like SeparatistMedic (aiRoles: ["HEALER"]) get the correct AI_ROLE.HEALER
        let effectiveRole = role;
        const shipDef = SHIP_DEFINITIONS[shipTypeName];
        if (shipDef && Array.isArray(shipDef.aiRoles) && shipDef.aiRoles.length > 0) {
            const primaryRole = shipDef.aiRoles[0]; // Use first role as primary
            // Map string role names to AI_ROLE enum values for specialized roles
            const roleMapping = {
                'HEALER': AI_ROLE.HEALER,
                'REPAIR': AI_ROLE.REPAIR,
                'MISSIONARY': AI_ROLE.MISSIONARY
            };
            if (roleMapping[primaryRole]) {
                effectiveRole = roleMapping[primaryRole];
            }
        }

        const newEnemy = new Enemy(x, y, this.player, shipTypeName, effectiveRole);
        if (residentName) {
            newEnemy.displayName = residentName;
        }
        newEnemy.calculateRadianProperties();
        newEnemy.initializeColors();
        this.addEnemy(newEnemy);
        return newEnemy;
    }

    /**
     * Performs post-spawn setup for newly created enemies.
     * Spawns guards for large haulers and sets up police pursuit for wanted players.
     * @param {Enemy} enemy - The newly spawned enemy
     * @private
     */
    _setupNewlySpawnedEnemy(enemy) {
        // Spawn guards for large haulers
        if (enemy.role === AI_ROLE.HAULER && enemy.size >= SPAWN_CONFIG.HAULER_GUARD_SIZE_THRESHOLD) {
            this._spawnGuardsForHauler(enemy);
        }

        // Initialize police pursuit if player is wanted
        if (this._shouldPursueWantedPlayer(enemy)) {
            this._initializePoliceChase(enemy);
        }
    }

    /**
     * Checks if a police ship should pursue a wanted player.
     * @param {Enemy} enemy - The enemy to check
     * @returns {boolean} True if should pursue
     * @private
     */
    _shouldPursueWantedPlayer(enemy) {
        return enemy.role === AI_ROLE.POLICE &&
            ((this.player?.isWanted && !this.player.destroyed) || this.policeAlertSent);
    }

    /**
     * Initializes a police chase for a wanted player.
     * @param {Enemy} policeShip - The police ship
     * @private
     */
    _initializePoliceChase(policeShip) {
        policeShip.target = this.player;
        policeShip.changeState(AI_STATE.APPROACHING);

        // Point police ship toward player
        if (policeShip.pos && this.player.pos) {
            const angleToPlayer = atan2(
                this.player.pos.y - policeShip.pos.y,
                this.player.pos.x - policeShip.pos.x
            );
            policeShip.angle = angleToPlayer;
        }

        if (STAR_SYSTEM_DEBUG) {
            console.log(`New police ${policeShip.shipTypeName} immediately pursuing wanted player!`);
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
     * SPATIAL PARTITIONING
     * ==========================================================================
     * Grid-based spatial hash for efficient O(1) collision queries.
     * Transforms O(n²) collision detection into O(n).
     */

    /**
     * Rebuilds the spatial hash with all collidable entities.
     * Called at the start of each update frame.
     * @private
     */
    _rebuildSpatialHash() {
        // Lazy initialization of spatial hash
        // Cell size of 1000 is optimal based on benchmarks (matches largest query radius for targeting)
        if (!this.spatialHash) {
            this.spatialHash = new SpatialHash(1000);
        }

        // Clear previous frame's data
        this.spatialHash.clear();

        // Insert all collidable entities
        // Note: Player is not inserted - we query from player's position
        this.spatialHash.insertAll(this.enemies);
        this.spatialHash.insertAll(this.asteroids);
        this.spatialHash.insertAll(this.spaceObjects);
        this.spatialHash.insertAll(this.mines);

        // Projectiles are inserted for projectile-projectile collision (missile intercept)
        this.spatialHash.insertAll(this.projectiles);

        // Cargo is inserted for collection queries
        this.spatialHash.insertAll(this.cargo);
    }

    /**
     * Get nearby entities of a specific type from the spatial hash.
     * @param {number} x - Query center X
     * @param {number} y - Query center Y
     * @param {number} radius - Search radius
     * @param {string} [type] - Optional type filter: 'enemy', 'asteroid', 'spaceObject', 'mine', 'cargo'
     * @returns {Array} Nearby entities
     */
    getNearbyEntities(x, y, radius, type = null) {
        if (!this.spatialHash) return [];

        const nearby = this.spatialHash.getNearby(x, y, radius);

        if (!type) return nearby;

        // Filter by type if specified
        return nearby.filter(entity => {
            if (!entity) return false;
            switch (type) {
                case 'enemy': return entity instanceof Enemy;
                case 'asteroid': return entity instanceof Asteroid;
                case 'spaceObject': return entity instanceof SpaceObject;
                case 'mine': return entity.isMine === true;
                case 'cargo': return entity instanceof Cargo;
                case 'projectile': return entity instanceof Projectile;
                default: return true;
            }
        });
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

        // === SPATIAL HASH OPTIMIZATION ===
        // Rebuild spatial hash each frame for efficient O(1) collision queries
        // This transforms O(n²) collision detection into O(n)
        this._rebuildSpatialHash();

        // Update dynamic stock for markets
        this._updateMarketStock();

        // Update ambient sound volumes
        this._updateAmbientSounds();

        // Calculate screen bounds once for visibility checks
        this._updateScreenBounds();

        try {
            // 1. Reset Environment Flags (Player & Enemies)
            this._resetEntityEnvironmentFlags();

            // 2. Apply Environment Effects (Nebulae & Storms)
            this._updateNebulae();
            this._updateCosmicStorms();

            // 3. Update all entity categories (AI & Physics)
            this._updateEnemies();
            this._updateAsteroids();
            this._updatePlanets();
            this._updateSpaceObjects();
            this._checkQuantumGateProximity(); // Check if player touched a quantum gate
            this._updateProjectiles();
            this._updateCargo();
            this._updateBeams();
            this._updateMines();
            this._updateForceWaves();
            this._updateHarpoons();
            this._updateExplosions();
            this._updateSummonPings();

            // Update ambient environmental effects (background events + micro-asteroid hail)
            this._updateAmbientEffects();
 
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
     * Updates active ambient background events and micro-asteroid particle streams.
     * @private
     */
    _updateAmbientEffects() {
        const pVelX = this.player?.vel ? this.player.vel.x : 0;
        const pVelY = this.player?.vel ? this.player.vel.y : 0;

        // 1. Update background events
        for (let i = this.ambientBackgroundEvents.length - 1; i >= 0; i--) {
            const ev = this.ambientBackgroundEvents[i];
            ev.update(pVelX, pVelY);
            if (!ev.active) {
                this.ambientBackgroundEvents.splice(i, 1);
            }
        }

        // 2. Spawn new random background events
        const spawnChance = (typeof STARFIELD_CONFIG !== 'undefined' && STARFIELD_CONFIG.AMBIENT_EFFECTS && STARFIELD_CONFIG.AMBIENT_EFFECTS.EVENTS)
            ? STARFIELD_CONFIG.AMBIENT_EFFECTS.EVENTS.spawnChancePerFrame
            : 0.0018;

        if (random() < spawnChance && this.ambientBackgroundEvents.length < 3) {
            this._spawnRandomBackgroundEvent();
        }

        // 3. Update micro-asteroid hail
        if (this.microAsteroidHail) {
            this.microAsteroidHail.update();
        }
    }

    /**
     * Selects and spawns a new random cosmic phenomenon in the background.
     * @private
     */
    _spawnRandomBackgroundEvent() {
        const typesConfig = (typeof STARFIELD_CONFIG !== 'undefined' && STARFIELD_CONFIG.AMBIENT_EFFECTS && STARFIELD_CONFIG.AMBIENT_EFFECTS.EVENTS)
            ? STARFIELD_CONFIG.AMBIENT_EFFECTS.EVENTS.types
            : {
                supernova: 0.06,
                comet: 0.12,
                warp_flash: 0.15,
                nebula_lightning: 0.09,
                fleet_skirmish: 0.075,
                space_whale: 0.03,
                black_hole: 0.03,
                solar_flare: 0.03,
                space_rift: 0.06,
                pulsar_beacon: 0.06,
                wormhole: 0.045,
                ion_storm: 0.03,
                crystal_comet: 0.03,
                quasar_jet: 0.025,
                dark_matter_tide: 0.025,
                aurora_wave: 0.025,
                stellar_nursery: 0.025,
                graviton_lens: 0.02,
                temporal_echo: 0.02,
                plasma_rain: 0.025,
                void_bloom: 0.025
            };

        const r = random();
        let cumulative = 0;
        let selectedType = 'comet';

        for (const [type, weight] of Object.entries(typesConfig)) {
            cumulative += weight;
            if (r <= cumulative) {
                selectedType = type;
                break;
            }
        }

        const camX = (typeof cameraSystem !== 'undefined') ? cameraSystem.pos.x : (this.player ? this.player.pos.x : 0);
        const camY = (typeof cameraSystem !== 'undefined') ? cameraSystem.pos.y : (this.player ? this.player.pos.y : 0);

        const spawnX = camX + random(-width * 0.6, width * 0.6);
        const spawnY = camY + random(-height * 0.6, height * 0.6);

        this.ambientBackgroundEvents.push(new AmbientCosmicEvent(selectedType, spawnX, spawnY));
    }

    /**
     * Resets environment-related flags (nebula, storm effects) for Player and Enemies.
     * This must be called at the start of the frame before applying new effects.
     * @private
     */
    _resetEntityEnvironmentFlags() {
        // Reset Player
        if (this.player) {
            this.player.targetingDisruption = 0;
            this.player.shieldsDisabled = false;
            this.player.weaponsDisabled = false;
            this.player.inNebula = false;
        }

        // Reset Enemies
        const enemyCount = this.enemies.length;
        for (let i = 0; i < enemyCount; i++) {
            const enemy = this.enemies[i];
            if (enemy) {
                enemy.targetingDisruption = 0;
                enemy.shieldsDisabled = false;
                enemy.weaponsDisabled = false;
                enemy.inNebula = false;
            }
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

            // 1. Reset Environment Flags (Enemies only, player is safe docked)
            // Note: We use the shared helper which resets player too, but that's harmless/correct
            this._resetEntityEnvironmentFlags();

            // 2. Environment Effects (Nebulae & Storms)
            // Need to manually call update on nebulae since we don't use _updateNebulae here (which applies to player)
            for (let i = 0, nlen = this.nebulae.length; i < nlen; i++) {
                this.nebulae[i].update();
                // Apply effects to enemies only, not player
                for (let j = 0, elen = this.enemies.length; j < elen; j++) {
                    this.nebulae[i].applyEffects(this.enemies[j]);
                }
            }

            // Cosmic storms (modified to NOT affect player)
            this._updateCosmicStormsWhileDocked();

            // 3. Update enemies - they move, patrol, fight each other
            this._updateEnemiesWhileDocked();

            // Asteroids drift around
            this._updateAsteroids();

            // Planets rotate
            this._updatePlanets();

            // Space objects update (decorative)
            this._updateSpaceObjects();

            // Explosions fade out
            this._updateExplosions();
            this._updateSummonPings();

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
                // Mark as removed so any lingering target references are rejected by isTargetValid()
                enemy.removed = true;
                // Clean up enemiesById Map when enemy is removed
                if (enemy.id != null && this.enemiesById) {
                    this.enemiesById.delete(enemy.id);
                }
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

            this._processForceWaveCollisions(wave);

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

            // Enemy vs Enemy collisions - using spatial hash for O(n) performance
            // Reuse pre-allocated Set to reduce GC pressure
            const checkedEnemyPairs = this._checkedEnemyPairs;
            checkedEnemyPairs.clear();
            for (let i = 0; i < enemyCount; i++) {
                const enemy1 = this.enemies[i];
                if (!enemy1 || !enemy1.pos || enemy1.isDestroyed()) continue;

                const enemy1Size = enemy1.size || 30;
                // Query nearby enemies using spatial hash
                const nearbyEnemies = this.spatialHash ?
                    this.spatialHash.getNearby(enemy1.pos.x, enemy1.pos.y, enemy1Size + 60) : [];

                for (let j = 0, nearbyLen = nearbyEnemies.length; j < nearbyLen; j++) {
                    const enemy2 = nearbyEnemies[j];
                    if (!(enemy2 instanceof Enemy)) continue;
                    if (enemy2 === enemy1) continue;
                    if (!enemy2 || !enemy2.pos || enemy2.isDestroyed()) continue;

                    // Skip bodyguards colliding with their principal
                    if (enemy1.role === AI_ROLE.GUARD && enemy1.principal === enemy2) continue;
                    if (enemy2.role === AI_ROLE.GUARD && enemy2.principal === enemy1) continue;

                    // Skip guards belonging to the same principal (flying in formation)
                    if (enemy1.role === AI_ROLE.GUARD && enemy2.role === AI_ROLE.GUARD &&
                        enemy1.principal && enemy1.principal === enemy2.principal) continue;

                    // Skip any two ships in the same formation wing (COMBAT role player wing)
                    if (enemy1.wingId && enemy1.wingId === enemy2.wingId) continue;

                    // Prevent checking same pair twice using id-based key
                    const id1 = enemy1.id ?? i;
                    const id2 = enemy2.id ?? this.enemies.indexOf(enemy2);
                    const pairKey = id1 < id2 ? `${id1}-${id2}` : `${id2}-${id1}`;
                    if (checkedEnemyPairs.has(pairKey)) continue;
                    checkedEnemyPairs.add(pairKey);

                    if (enemy1.checkCollision(enemy2)) {
                        this._handleShipCollision(enemy1, enemy2);
                    }
                }
            }

            // Enemy vs Space Object collisions
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                if (!enemy || !enemy.pos || enemy.isDestroyed()) continue;

                const enemySize = enemy.size || 30;
                const nearbySpaceObjects = this.spatialHash ?
                    this.spatialHash.getNearby(enemy.pos.x, enemy.pos.y, enemySize + 100) : [];

                for (let j = 0, nearbyLen = nearbySpaceObjects.length; j < nearbyLen; j++) {
                    const spaceObject = nearbySpaceObjects[j];
                    if (!(spaceObject instanceof SpaceObject)) continue;
                    if (!spaceObject || !spaceObject.pos || spaceObject.destroyed) continue;
                    // Only transports and repair ships skip dockable objects (they need to dock/repair)
                    if (spaceObject.isDockable && (enemy.role === AI_ROLE.TRANSPORT || enemy.role === AI_ROLE.REPAIR)) continue;

                    if (enemy.checkCollision(spaceObject)) {
                        this._handleShipSpaceObjectCollision(enemy, spaceObject);
                    }
                }
            }
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

        // Helper to determine if an active (not-broken) harpoon already links owner->target
        const harpoonExists = (owner, target) => Array.isArray(this.harpoons) && this.harpoons.some(h => h && !h.broken && h.owner === owner && h.target === target);

        for (let i = projCount - 1; i >= 0; i--) {
            const proj = this.projectiles[i];
            if (!proj || !proj.pos) {
                this.removeProjectile(i);
                continue;
            }

            const projPos = proj.pos;
            const projSize = proj.size || 3;
            let hit = false;

            // Surface mode filter: surface projectiles should NOT hit space entities
            const isSurfaceProj = proj.isSurface || (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive() && proj.owner === this.player);

            if (!isSurfaceProj) {
                // Check asteroids
                if (this._checkProjectileAsteroidCollision(proj, i, distCheckVector, asteroidCount)) continue;

                // Check space objects
                if (this._checkProjectileSpaceObjectCollision(proj, i, distCheckVector)) continue;

                // Check mines
                if (this._checkProjectileMineCollision(proj, i, distCheckVector)) continue;
            }

            // Surface mode filter: check player collision in surface mode (normally skipped while docked)
            if (typeof surfaceMode !== 'undefined' && surfaceMode.isActive() && !this.player.destroyed && proj.owner !== this.player) {
                const combinedRadius = this.player.size + projSize;
                distCheckVector.set(this.player.pos.x - projPos.x, this.player.pos.y - projPos.y);

                // Only register hit if distance check passes AND altitude is low enough
                const hitAltitude = (this.player.altitude || 0) < 100;

                if (hitAltitude && distCheckVector.magSq() <= combinedRadius * combinedRadius && proj.checkCollision(this.player)) {
                    WeaponSystem.handleHitEffects(this.player, projPos, proj.damage, proj.owner, this, proj.color);

                    // Apply Tangle effect if available
                    if (proj._isTangle && typeof this.player.applyDragEffect === 'function') {
                        this.player.applyDragEffect(
                            proj.tangleDuration || DRAG_EFFECT_DEFAULT_DURATION,
                            proj.dragMultiplier || DRAG_EFFECT_DEFAULT_MULTIPLIER,
                            proj.rotationBlockMultiplier || 0.1
                        );
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage("Ship caught in energy tangle!", "#30FFB4");
                        }
                    }

                    this.removeProjectile(i);
                    continue;
                }
            }


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

                        // Harpoon special-case: spawn a Harpoon tether
                        if (proj.type === 'harpoon' || proj.type === 'HARPOON') {
                            const owner = proj.owner;
                            const target = enemy;
                            const ownerHasPos = owner && owner.pos && Number.isFinite(owner.pos.x) && Number.isFinite(owner.pos.y);
                            const targetHasPos = target && target.pos && Number.isFinite(target.pos.x) && Number.isFinite(target.pos.y);

                            if (!ownerHasPos || !targetHasPos) {
                                this.removeProjectile(i);
                                hit = true;
                                break;
                            }

                            try {
                                if (typeof Harpoon !== 'undefined') {
                                    if (!harpoonExists(owner, target)) {
                                        const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                        if (!this.harpoons) this.harpoons = [];
                                        this.harpoons.push(har);
                                    }
                                }
                                this.addExplosion(projPos.x, projPos.y, 6, [180, 220, 255]);
                            } catch (e) { }
                            this.removeProjectile(i);
                            hit = true;
                            break;
                        }

                        WeaponSystem.handleHitEffects(enemy, projPos, proj.damage, proj.owner, this, proj.color);
                        if (proj._isMissile) {
                            const explosionColor = Array.isArray(proj.color) ? proj.color : [255, 150, 0];
                            this.addExplosion(projPos.x, projPos.y, 15, explosionColor);
                        }

                        // Apply Tangle effect
                        if (proj._isTangle && typeof enemy.applyDragEffect === 'function') {
                            enemy.applyDragEffect(
                                (proj.tangleDuration || DRAG_EFFECT_DEFAULT_DURATION),
                                (proj.dragMultiplier || DRAG_EFFECT_DEFAULT_MULTIPLIER),
                                (proj.rotationBlockMultiplier || 0.1)
                            );
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

                    // Surface mode filter: prevent surface player projectiles from hitting space enemies
                    if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                        continue;
                    }

                    if (distCheckVector.magSq() <= combinedRadiusSq && proj.checkCollision(enemy)) {
                        // Harpoon special-case
                        if (proj.type === 'harpoon' || proj.type === 'HARPOON') {
                            const owner = proj.owner;
                            const target = enemy;
                            try {
                                if (typeof Harpoon !== 'undefined') {
                                    if (!harpoonExists(owner, target)) {
                                        const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                        if (!this.harpoons) this.harpoons = [];
                                        this.harpoons.push(har);
                                    }
                                }
                                this.addExplosion(projPos.x, projPos.y, 6, [180, 220, 255]);
                            } catch (e) { }
                            this.removeProjectile(i);
                            hit = true;
                            break;
                        }

                        WeaponSystem.handleHitEffects(enemy, projPos, proj.damage, proj.owner, this, proj.color);
                        if (proj._isMissile) {
                            const explosionColor = Array.isArray(proj.color) ? proj.color : [255, 150, 0];
                            this.addExplosion(projPos.x, projPos.y, 15, explosionColor);
                        }

                        // Apply Tangle effect
                        if (proj._isTangle && typeof enemy.applyDragEffect === 'function') {
                            enemy.applyDragEffect(
                                (proj.tangleDuration || DRAG_EFFECT_DEFAULT_DURATION),
                                (proj.dragMultiplier || DRAG_EFFECT_DEFAULT_MULTIPLIER),
                                (proj.rotationBlockMultiplier || 0.1)
                            );
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
        // Throttle market updates to every ~166ms for performance
        // Market prices don't need per-frame updates
        if (!this._marketUpdateTimer) this._marketUpdateTimer = 0;
        const now = millis();
        if (now - this._marketUpdateTimer < 166) return;
        this._marketUpdateTimer = now;

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
            (enemy) => enemy.isDestroyed() || this.shouldDespawnEntity(enemy, 1.1),
            (enemy) => {
                // Mark as removed so any lingering references (e.g. missionary targets) are
                // treated as invalid by isTargetValid() even if the entity is not yet destroyed.
                enemy.removed = true;
                // Clean up enemiesById Map when enemy is removed
                if (enemy.id != null && this.enemiesById) {
                    this.enemiesById.delete(enemy.id);
                }
                // Clear player hull reference when the hull drifts off-screen or is destroyed
                if (enemy.isPlayerHull && this.playerHull === enemy) {
                    this.playerHull = null;
                }
            }
        );
    }

    /**
     * Updates all asteroids with destruction and cargo drop handling.
     * OPTIMIZED: Distant asteroids (>2000px from player) only update every 5 frames.
     * @private
     */
    _updateAsteroids() {
        const count = this.asteroids.length;
        if (count === 0) return;

        // Cache player position for distance checks
        const playerX = this.player?.pos?.x ?? 0;
        const playerY = this.player?.pos?.y ?? 0;

        // Distance threshold for throttling (beyond screen + buffer)
        const THROTTLE_DISTANCE_SQ = 2000 * 2000; // 2000px squared
        const THROTTLE_INTERVAL = 10; // Update every 10th frame when distant

        for (let i = count - 1; i >= 0; i--) {
            const asteroid = this.asteroids[i];
            if (!asteroid) {
                this._fastRemove(this.asteroids, i);
                continue;
            }

            // Calculate squared distance to player (avoid sqrt for performance)
            const dx = asteroid.pos.x - playerX;
            const dy = asteroid.pos.y - playerY;
            const distSq = dx * dx + dy * dy;

            // Throttle updates for distant asteroids (but NEVER throttle comets - they're important events)
            if (distSq > THROTTLE_DISTANCE_SQ && !asteroid.isComet) {
                // Initialize timer if not set (stagger updates across asteroids)
                if (asteroid._throttleTimer === undefined) {
                    asteroid._throttleTimer = Math.random() * 166; // ~10 frames at 60fps in ms
                }
                // Skip update if not enough time has passed (~166ms)
                const now = millis();
                if (!asteroid._lastUpdateTime) asteroid._lastUpdateTime = 0;
                if (now - asteroid._lastUpdateTime < 166) {
                    continue; // Skip this asteroid's update
                }
                asteroid._lastUpdateTime = now;
            }

            // Normal update
            try {
                asteroid.update();
            } catch (e) {
                console.error(`Error updating asteroid:`, e);
            }

            // Check for removal (destroyed or despawned)
            // Comets are event entities spawned far outside normal asteroid ranges,
            // so they need a larger despawn window to cross through the play area.
            const despawnFactor = asteroid.isComet ? 3.0 : 1.2;
            if (asteroid.isDestroyed() || this.shouldDespawnEntity(asteroid, despawnFactor)) {
                this._handleAsteroidDestruction(asteroid);
                this._fastRemove(this.asteroids, i);
            }
        }
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

        // Run background activity for player bases when surfaceMode is not active
        this._updatePlanetBackgroundActivity();
    }

    /**
     * Updates background activity for player bases on all planets in the system.
     * This runs ONLY when surfaceMode is NOT active, to avoid double-updating.
     * Simulates mining, hazard damage, and base destruction for bases on all planets.
     * @private
     */
    _updatePlanetBackgroundActivity() {
        // Skip if surfaceMode is active - it handles its own background updates
        if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
            return;
        }

        const now = Date.now();
        const dt = (typeof deltaTime === 'number' && Number.isFinite(deltaTime))
            ? (deltaTime / 1000) : 0.016;

        for (const planet of this.planets) {
            if (!planet || planet.isSun) continue;
            if (!Array.isArray(planet.playerBuiltSurfaceObjects)) continue;
            if (planet.playerBuiltSurfaceObjects.length === 0) continue;

            // Process each player-built base on this planet
            for (const desc of planet.playerBuiltSurfaceObjects) {
                if (!desc || desc.destroyed) continue;

                // Only process Hab Units (Offworld Colony variant 1 or PlayerBase)
                if (desc.type !== 'PlayerBase' && (desc.type !== 'Offworld Colony' || desc.variant !== 1)) continue;

                // Initialize tick if missing
                if (!desc.lastBackgroundTick) {
                    desc.lastBackgroundTick = now - (dt * 1000);
                }

                const timeElapsed = (now - desc.lastBackgroundTick) / 1000;
                if (timeElapsed < 2.0) continue; // Min 2-second update frequency

                // Calculate robot count
                const robotCount = typeof desc.robotCount === 'number' ? desc.robotCount : 2;
                if (robotCount === 0) {
                    desc.lastBackgroundTick = now;
                    continue;
                }

                // Mining simulation using same rates as surfaceMode
                const MINERALS_PER_MINE = 2;
                const MINING_DURATION = 10;
                const mineRatePerRobot = MINERALS_PER_MINE / MINING_DURATION;
                const mineralsEarned = robotCount * mineRatePerRobot * timeElapsed;

                if (!desc.miningStorage) desc.miningStorage = [];
                let mineralStack = desc.miningStorage.find(item => item.name === 'Minerals');
                if (!mineralStack) {
                    mineralStack = { name: 'Minerals', quantity: 0 };
                    desc.miningStorage.push(mineralStack);
                }

                const capacity = desc.miningStorageCapacity || 100;
                mineralStack.quantity = Math.min(capacity, mineralStack.quantity + mineralsEarned);

                // Hazard damage (reduced for background simulation)
                const hazardLevel = planet.hazardLevel || 0.2;
                const damagePerSec = hazardLevel * 0.5;
                const damageTaken = damagePerSec * timeElapsed;

                if (desc.health === undefined) desc.health = 1000;
                desc.health -= damageTaken;

                if (desc.health <= 0) {
                    desc.destroyed = true;
                    console.log(`[Background] Base on ${planet.name} destroyed by hazards`);
                }

                desc.lastBackgroundTick = now;
            }
        }
    }


    /**
     * Updates decorative space objects.
     * Distance-based throttling: far objects update every 5 frames.
     * @private
     */
    _updateSpaceObjects() {
        if (!this.spaceObjects || !this.spaceObjects.length) return;

        const playerPos = this.player?.pos;
        const viewDistSq = playerPos ? (width + height) * (width + height) : 0;

        this._updateEntities(
            this.spaceObjects,
            (so) => {
                // Throttle updates for distant space objects
                if (playerPos && so.pos) {
                    const dx = so.pos.x - playerPos.x;
                    const dy = so.pos.y - playerPos.y;
                    const distSq = dx * dx + dy * dy;
                    // Only update distant objects every ~83ms (~5 frames at 60fps)
                    if (distSq > viewDistSq) {
                        const now = millis();
                        if (!so._lastUpdateTime) so._lastUpdateTime = Math.random() * 83;
                        if (now - so._lastUpdateTime < 83) {
                            return;
                        }
                        so._lastUpdateTime = now;
                    }
                }
                so.update(this);
            },
            (so) => so.destroyed,
            (so) => this._handleSpaceObjectDestruction(so)
        );
    }

    /**
     * Checks if the player is touching a quantum gate and triggers teleportation.
     * When the player touches a quantum gate, they are teleported to a random system!
     * @private
     */
    _checkQuantumGateProximity() {
        // Only check if player exists, is in flight, and has position
        if (!this.player || !this.player.pos) return;
        if (this.player.isDockedAndInvulnerable) return;

        // Cooldown to prevent rapid re-triggering
        const now = millis();
        if (this._lastQuantumTeleportTime && now - this._lastQuantumTeleportTime < 3000) return;

        // No space objects? Nothing to check
        if (!this.spaceObjects || this.spaceObjects.length === 0) return;

        // Check if player is touching any quantum gate
        for (let i = 0; i < this.spaceObjects.length; i++) {
            const so = this.spaceObjects[i];
            if (!so || !so.pos || so.destroyed) continue;
            if (so.type !== 'quantumGate') continue;

            // Calculate distance between player and quantum gate
            const dx = this.player.pos.x - so.pos.x;
            const dy = this.player.pos.y - so.pos.y;
            const distSq = dx * dx + dy * dy;

            // Touching distance - player must be within the gate's radius
            const gateRadius = so.size || 100;
            const playerRadius = this.player.size || 20;
            const touchDistSq = (gateRadius + playerRadius) * (gateRadius + playerRadius);

            if (distSq <= touchDistSq) {
                // Player is touching the quantum gate! Trigger teleportation!
                console.log(`QUANTUM GATE ACTIVATED! Player touched gate at (${so.pos.x.toFixed(0)}, ${so.pos.y.toFixed(0)})`);

                // Set cooldown
                this._lastQuantumTeleportTime = now;

                // Trigger the fade effect through gameStateManager (reuses jump fade)
                if (typeof gameStateManager !== 'undefined' && gameStateManager &&
                    typeof gameStateManager.startQuantumGateFade === 'function') {
                    gameStateManager.startQuantumGateFade();
                } else {
                    // Fallback: direct teleport if gameStateManager not available
                    console.warn('gameStateManager.startQuantumGateFade not available, using direct teleport');
                    if (typeof uiManager !== 'undefined') {
                        uiManager.addMessage('QUANTUM GATE ACTIVATED!', [200, 100, 255]);
                    }
                    if (typeof galaxy !== 'undefined' && galaxy && typeof galaxy.teleportToRandomSystem === 'function') {
                        setTimeout(() => {
                            try {
                                galaxy.teleportToRandomSystem();
                            } catch (e) {
                                console.error('Error during quantum teleportation:', e);
                            }
                        }, 100);
                    }
                }

                return; // Only trigger once per frame
            }
        }
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

            if (proj.lifespan <= 0) {
                // Check if this is a storm projectile - spawn mini-storm before removing
                if (proj._isStorm && proj.stormConfig) {
                    this._spawnWeaponStorm(proj);
                }
                this.removeProjectile(i);
            }
        }
    }

    /**
     * Spawns a miniature storm from a storm weapon projectile.
     * @param {Projectile} proj - The storm projectile that expired
     * @private
     */
    _spawnWeaponStorm(proj, attachTarget = null) {
        if (!proj?.stormConfig || typeof CosmicStorm === 'undefined') return;

        const config = proj.stormConfig;

        // Create the mini-storm
        const storm = new CosmicStorm(
            proj.pos.x,
            proj.pos.y,
            config.radius || 80,
            config.type || 'electromagnetic'
        );

        // Configure as weapon-spawned mini-storm
        storm.isWeaponSpawned = true;
        storm.owner = config.owner || proj.owner;
        storm.maxLifetime = config.duration || 8000;
        storm.lifetime = storm.maxLifetime;
        storm.intensity = 0.8;  // Slightly weaker than natural storms
        storm.velocity.mult(0);  // Stationary (unless attached)

        // Attach to hit entity if provided (storm follows target)
        // [MODIFIED] Gravitational storms (Gravity Well) do NOT attach; they act as stationary hazards
        if (attachTarget && attachTarget.pos && (config.type !== 'gravitational')) {
            storm.attachedTo = attachTarget;
            ENV_LOG(`Storm attached to ${attachTarget.shipTypeName || attachTarget.constructor?.name || 'entity'}`);
        }

        // Reduce particles for mini-storms (less visual clutter)
        storm.maxParticles = Math.min(storm.radius / 10, 30);
        // Reinitialize particles with reduced count
        storm.particles = [];
        storm.initParticles();

        // Add to cosmic storms array
        this.cosmicStorms.push(storm);

        // Create ambient sound for the storm if sound manager is available
        try {
            this._createStormAmbientSound(this.cosmicStorms.length - 1, config.type);
        } catch (e) {
            // Sound errors are non-fatal
        }

        // Add explosion effect at spawn point to indicate storm creation
        if (typeof this.addExplosion === 'function') {
            const col = storm.color || [100, 150, 255];
            this.addExplosion(proj.pos.x, proj.pos.y, config.radius * 0.3, col);
        }

        if (typeof ENV_LOG === 'function') {
            ENV_LOG(`Weapon-spawned ${config.type} mini-storm at (${proj.pos.x.toFixed(0)}, ${proj.pos.y.toFixed(0)})`);
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

            // Expand the wave (frame-rate independent)
            const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;
            wave.radius += wave.growRate * timeScale;

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

            // Surface mode filter: also target surface objects (turrets, buildings, drones)
            if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                const surfaceObjects = surfaceMode.surfaceObjects;
                if (surfaceObjects && surfaceObjects.length) {
                    wave.entitiesToProcess = wave.entitiesToProcess.concat(surfaceObjects);
                }
            }
        } else {
            // Enemy's wave affects everything too (Player, Asteroids, and potentially other Enemies if friendly fire is valid for this weapon)
            // We want force waves to be chaotic and affect the environment
            if (this.player) wave.entitiesToProcess.push(this.player);

            // Add asteroids
            wave.entitiesToProcess.push(...this.asteroids);

            // Add other enemies (excluding self will be handled in collision check or here)
            // Filter out the owner immediately to prevent self-damage
            for (const enemy of this.enemies) {
                if (enemy !== wave.owner) {
                    wave.entitiesToProcess.push(enemy);
                }
            }

            // Surface mode filter: target other surface objects (player structures, robots, etc.)
            if (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) {
                const surfaceObjects = surfaceMode.surfaceObjects;
                if (surfaceObjects && surfaceObjects.length) {
                    for (const obj of surfaceObjects) {
                        if (obj !== wave.owner) {
                            wave.entitiesToProcess.push(obj);
                        }
                    }
                }
            }
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
            let distSq = dx * dx + dy * dy;

            // Include altitude / 3D distance on the surface
            if (wave.isSurface) {
                const waveAlt = wave.altitude || 0;
                const entityAlt = (entity.altitude !== undefined) ? entity.altitude : (entity.yOffset || 0);
                const dz = entityAlt - waveAlt;
                distSq += dz * dz;
            }

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
     * Updates summon ping effects.
     * @private
     */
    _updateSummonPings() {
        if (!this.summonPings || this.summonPings.length === 0) return;
        const now = this._getCurrentTime();
        for (let i = this.summonPings.length - 1; i >= 0; i--) {
            const ping = this.summonPings[i];
            if ((now - ping.startTime) >= ping.durationMs) {
                this._fastRemove(this.summonPings, i);
            }
        }
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
            // OPTIMIZATION: Use spatial hash to find enemies within nebula radius
            const nearbyEnemies = this.spatialHash ?
                this.spatialHash.getNearby(nebula.pos.x, nebula.pos.y, nebula.radius || 1000) :
                this.enemies;

            for (let j = 0, len = nearbyEnemies.length; j < len; j++) {
                const enemy = nearbyEnemies[j];
                // Ensure it's actually an enemy (spatial hash might have other entities)
                if (enemy instanceof Enemy) {
                    nebula.applyEffects(enemy);
                }
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

            // OPTIMIZATION: Use spatial hash for enemies
            const nearbyEnemies = this.spatialHash ?
                this.spatialHash.getNearby(storm.pos.x, storm.pos.y, storm.radius || 1000) :
                this.enemies;

            for (let j = 0, len = nearbyEnemies.length; j < len; j++) {
                const enemy = nearbyEnemies[j];
                if (enemy instanceof Enemy) {
                    storm.applyEffects(enemy);
                }
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
        // Decrement spawn timer
        this._spawnTimer -= deltaTime;
        if (this._spawnTimer <= 0) {
            // Try to spawn an NPC
            if (this.shouldSpawnNPCs) {
                this.trySpawnNPC();
            }

            // Check if repair tender is needed
            try {
                this.spawnRepairTender();
            } catch (e) {
                console.error('Error in repair tender spawn:', e);
            }

            // Reset timer
            this._spawnTimer = SPAWN_CONFIG.SPAWN_INTERVAL_MS;
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

        const now = millis();

        for (const wave of this.forceWaves) {
            const cx = wave.pos.x;
            const cy = wave.pos.y;
            const progress = wave.radius / wave.maxRadius;
            const alpha = map(progress, 0, 1, 255, 0);
            const age = now - wave.startTime;
            const r = wave.color[0], g = wave.color[1], b = wave.color[2];

            push();

            // --- Additive glow layer ---
            blendMode(ADD);

            // Outer leading ring (bright, thin)
            noFill();
            strokeWeight(2.5);
            stroke(r, g, b, alpha * 0.9);
            circle(cx, cy, wave.radius * 2);

            // Secondary ring slightly behind
            strokeWeight(4);
            stroke(r, g, b, alpha * 0.5);
            circle(cx, cy, wave.radius * 1.85);

            // Hot white edge ring
            strokeWeight(1.5);
            stroke(255, 255, 255, alpha * 0.7);
            circle(cx, cy, wave.radius * 2.02);

            // Tertiary inner ring
            strokeWeight(6);
            stroke(r, g, b, alpha * 0.25);
            circle(cx, cy, wave.radius * 1.6);

            // Faint wide aura ring
            strokeWeight(12);
            stroke(r, g, b, alpha * 0.1);
            circle(cx, cy, wave.radius * 1.4);

            // --- Energy crackle lines radiating outward (~12) ---
            noFill();
            strokeWeight(1.2);
            const overallFlicker = sin(age * 0.015) * 0.25 + 0.75;
            stroke(r, g, b, alpha * 0.55 * overallFlicker);
            for (let i = 0; i < 12; i++) {
                const baseAngle = (i / 12) * TWO_PI + age * 0.002;
                const innerR = wave.radius * 0.5;
                const outerR = wave.radius * (0.92 + sin(age * 0.01 + i * 2.3) * 0.08);
                const jitter = sin(age * 0.025 + i * 3.1) * 8;

                const cosVal = cos(baseAngle);
                const sinVal = sin(baseAngle);

                const innerX = cx + cosVal * innerR;
                const innerY = cy + sinVal * innerR;
                const outerX = cx + cosVal * outerR;
                const outerY = cy + sinVal * outerR;

                const midX = (innerX + outerX) * 0.5 - sinVal * jitter;
                const midY = (innerY + outerY) * 0.5 + cosVal * jitter;

                line(innerX, innerY, midX, midY);
                line(midX, midY, outerX, outerY);
            }

            // --- Center flash (bright white that fades to weapon color) ---
            noStroke();
            const flashIntensity = max(0, 1 - progress * 2.5);
            if (flashIntensity > 0) {
                // White-hot center
                fill(255, 255, 255, flashIntensity * 200);
                circle(cx, cy, wave.radius * 0.3 * flashIntensity + 15);
                // Colored halo around center
                fill(r, g, b, flashIntensity * 120);
                circle(cx, cy, wave.radius * 0.5 * flashIntensity + 25);
            }

            // --- Pulsating inner energy ---
            const pulsePhase = (age % 200) / 200;
            const pulseRadius = pulsePhase * wave.radius * 0.6;
            const pulseAlpha = alpha * (1 - pulsePhase) * 0.5;
            noFill();
            strokeWeight(2);
            stroke(255, 255, 255, pulseAlpha);
            circle(cx, cy, pulseRadius * 2);
            stroke(r, g, b, pulseAlpha * 0.7);
            strokeWeight(3);
            circle(cx, cy, pulseRadius * 1.6);

            // --- Debris dots scattered along wavefront (~8) ---
            noStroke();
            fill(r, g, b, alpha * 0.5);
            for (let i = 0; i < 8; i++) {
                const dotAngle = (i / 8) * TWO_PI + age * 0.001 + i * 0.5;
                const dotR = wave.radius * (0.9 + sin(age * 0.008 + i * 4.1) * 0.12);
                const dotSize = 2 + sin(age * 0.02 + i * 2.7) * 1.5;
                circle(cx + cos(dotAngle) * dotR, cy + sin(dotAngle) * dotR, dotSize);
            }

            blendMode(BLEND);
            pop();
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
    /** Adds an explosion to the system's list. */
    addExplosion(x, y, size, color, isSurface = false, silent = false, altitude = 0) {
        // Use object pooling if WeaponSystem is available
        if (typeof WeaponSystem !== 'undefined' && typeof WeaponSystem.getPooledObject === 'function') {
            const explosion = WeaponSystem.getPooledObject('explosion', x, y, size, color, isSurface, silent, altitude);

            if (explosion) {
                this.explosions.push(explosion);
                return;
            }
        }

        // Fall back to direct instantiation if pooling is unavailable or failed
        try {
            const explosion = new Explosion(x, y, size, color, isSurface, silent, altitude);
            this.explosions.push(explosion);
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

        // Normalized collision vector (normal pointing from 1 to 2)
        const nx = dx / dist;
        const ny = dy / dist;

        // Separate asteroids to prevent overlap (push each apart by half the overlap)
        const separationFactor = 0.5;
        asteroid1.pos.x -= nx * overlap * separationFactor;
        asteroid1.pos.y -= ny * overlap * separationFactor;
        asteroid2.pos.x += nx * overlap * separationFactor;
        asteroid2.pos.y += ny * overlap * separationFactor;

        // --- Physics-based Impulse Resolution ---

        // Relative velocity
        const rvx = asteroid2.vel.x - asteroid1.vel.x;
        const rvy = asteroid2.vel.y - asteroid1.vel.y;

        // Velocity along the normal
        const velAlongNormal = rvx * nx + rvy * ny;

        // Do not resolve if velocities are separating
        if (velAlongNormal > 0) return;

        // Coefficient of restitution (bounciness)
        // 0.8 = somewhat bouncy rock
        const restitution = 0.8;

        // Mass (using size^2 as approximation for mass)
        const mass1 = asteroid1.size * asteroid1.size;
        const mass2 = asteroid2.size * asteroid2.size;

        // Inverse mass
        const invMass1 = 1 / mass1;
        const invMass2 = 1 / mass2;

        // Calculate impulse scalar
        let j = -(1 + restitution) * velAlongNormal;
        j /= (invMass1 + invMass2);

        // Apply impulse
        const impulseX = j * nx;
        const impulseY = j * ny;

        asteroid1.vel.x -= impulseX * invMass1;
        asteroid1.vel.y -= impulseY * invMass1;
        asteroid2.vel.x += impulseX * invMass2;
        asteroid2.vel.y += impulseY * invMass2;
    }

    /**
     * Handles asteroid-to-space object collision (elastic physics, no damage)
     * Space objects are treated as static/very massive, so asteroid bounces off
     * @private
     */
    _handleAsteroidSpaceObjectCollision(asteroid, spaceObject) {
        const dx = spaceObject.pos.x - asteroid.pos.x;
        const dy = spaceObject.pos.y - asteroid.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 0.001;

        // Calculate overlap
        const rAsteroid = asteroid.maxRadius || asteroid.size / 2;
        const rObject = (typeof spaceObject.collisionRadius === 'number')
            ? spaceObject.collisionRadius
            : spaceObject.size / 2;
        const minDist = rAsteroid + rObject;
        const overlap = minDist - dist;

        if (overlap <= 0) return; // No actual overlap

        // Normalized collision vector (normal pointing from asteroid to object)
        const nx = dx / dist;
        const ny = dy / dist;

        // Push asteroid away from space object (treat space object as immovable)
        asteroid.pos.x -= nx * overlap;
        asteroid.pos.y -= ny * overlap;

        // --- Physics-based Impulse Resolution ---

        // Velocity of asteroid along the normal
        const velAlongNormal = asteroid.vel.x * nx + asteroid.vel.y * ny;

        // Do not resolve if asteroid is moving away
        if (velAlongNormal > 0) return;

        // Coefficient of restitution (slightly less bouncy than asteroid-asteroid)
        const restitution = 0.7;

        // Reflect velocity along normal with restitution
        // Treat space object as infinite mass (doesn't move)
        const impulse = -(1 + restitution) * velAlongNormal;

        asteroid.vel.x += impulse * nx;
        asteroid.vel.y += impulse * ny;
    }

    /**
     * Handles ship-to-space object collision (bounce off with damage)
     * Space objects are treated as static/very massive, so ship bounces off
     * @private
     */
    _handleShipSpaceObjectCollision(ship, spaceObject) {
        const dx = spaceObject.pos.x - ship.pos.x;
        const dy = spaceObject.pos.y - ship.pos.y;
        const distSq = dx * dx + dy * dy;
        const dist = Math.sqrt(distSq) || 0.001;

        // Calculate overlap
        const rShip = ship.size / 2;
        const rObject = (typeof spaceObject.collisionRadius === 'number')
            ? spaceObject.collisionRadius
            : spaceObject.size / 2;
        const minDist = rShip + rObject;
        const overlap = minDist - dist;

        if (overlap <= 0) return; // No actual overlap

        // Normalized collision vector
        const nx = dx / dist;
        const ny = dy / dist;

        // Push ship away from space object
        ship.pos.x -= nx * overlap;
        ship.pos.y -= ny * overlap;

        // Calculate damage based on impact velocity
        const velAlongNormal = ship.vel.x * nx + ship.vel.y * ny;

        // Only apply damage/bounce if ship is moving toward the object
        if (velAlongNormal > 0) {
            const collisionDamage = Math.floor(Math.abs(velAlongNormal) * 0.3);
            if (collisionDamage > 0) {
                ship.takeDamage(collisionDamage, spaceObject);
            }

            // Bounce physics (treat space object as immovable)
            const restitution = 0.5; // Less bouncy than asteroids
            const impulse = -(1 + restitution) * velAlongNormal;
            ship.vel.x += impulse * nx;
            ship.vel.y += impulse * ny;

            // Play bump sound with cooldown
            if (ship === this.player) {
                try {
                    if (typeof soundManager !== 'undefined') {
                        const now = (typeof millis === 'function') ? millis() : Date.now();
                        if (!this._lastPlayerSpaceObjectBumpTime || (now - this._lastPlayerSpaceObjectBumpTime) > 250) {
                            soundManager.playWorldSound('bump', ship.pos.x, ship.pos.y, ship.pos);
                            this._lastPlayerSpaceObjectBumpTime = now;
                        }
                    }
                } catch (e) { /* ignore sound errors */ }
            }
        }
    }


    /** 
     * Handles all collision detection and responses in the system.
     * OPTIMIZED: Uses spatial hash for O(n) performance instead of O(n²)
     */
    checkCollisions() {
        // Early exit if no player
        if (!this.player || !this.player.pos) return;

        try {
            // --- PHYSICAL OBJECT COLLISIONS (Non-projectile) ---
            // Using spatial hash for efficient nearby entity queries

            const playerX = this.player.pos.x;
            const playerY = this.player.pos.y;
            const playerSize = this.player.size || 30;

            // Query radius: player size + max enemy/asteroid size + buffer
            const playerQueryRadius = playerSize + 100;

            // Get nearby entities for player collision checks
            const nearbyForPlayer = this.spatialHash ?
                this.spatialHash.getNearby(playerX, playerY, playerQueryRadius) : [];

            // Player vs Enemies & Asteroids - now using spatial hash query
            for (let i = 0, len = nearbyForPlayer.length; i < len; i++) {
                const entity = nearbyForPlayer[i];
                if (!entity || !entity.pos) continue;

                // Check if this is an enemy
                if (entity instanceof Enemy) {
                    if (entity.isDestroyed()) continue;

                    // Skip collision detection for player's bodyguards
                    if (entity.role === AI_ROLE.GUARD && entity.principal === this.player) {
                        continue;
                    }

                    if (this.player.checkCollision(entity)) {
                        this._handleShipCollision(this.player, entity);
                    }
                }
                // Check if this is an asteroid
                else if (entity instanceof Asteroid) {
                    if (entity.isDestroyed()) continue;
                    if (this.player.checkCollision(entity)) {
                        this._handleAsteroidCollision(this.player, entity);
                    }
                }
                // Check if this is a space object (station, platform, etc.)
                else if (entity instanceof SpaceObject) {
                    if (entity.destroyed) continue;
                    // Skip dockable objects - player needs to approach them to dock
                    if (entity.isDockable) continue;
                    if (this.player.checkCollision(entity)) {
                        this._handleShipSpaceObjectCollision(this.player, entity);
                    }
                }
            }

            // Enemy vs Asteroid collisions - using spatial hash per enemy
            const enemyCount = this.enemies.length;
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                if (!enemy || !enemy.pos || enemy.isDestroyed()) continue;

                // Query nearby asteroids for this enemy
                const enemySize = enemy.size || 30;
                const nearbyAsteroids = this.spatialHash ?
                    this.spatialHash.getNearby(enemy.pos.x, enemy.pos.y, enemySize + 60) : [];

                for (let j = 0, nearbyLen = nearbyAsteroids.length; j < nearbyLen; j++) {
                    const asteroid = nearbyAsteroids[j];
                    if (!(asteroid instanceof Asteroid)) continue;
                    if (!asteroid || !asteroid.pos || asteroid.isDestroyed()) continue;

                    if (enemy.checkCollision(asteroid)) {
                        this._handleAsteroidCollision(enemy, asteroid);
                    }
                }
            }

            // Enemy vs Enemy collisions - using spatial hash for O(n) performance
            // Reuse pre-allocated Set to reduce GC pressure
            const checkedEnemyPairs = this._checkedEnemyPairs;
            checkedEnemyPairs.clear();
            for (let i = 0; i < enemyCount; i++) {
                const enemy1 = this.enemies[i];
                if (!enemy1 || !enemy1.pos || enemy1.isDestroyed()) continue;

                const enemy1Size = enemy1.size || 30;
                const nearbyEnemies = this.spatialHash ?
                    this.spatialHash.getNearby(enemy1.pos.x, enemy1.pos.y, enemy1Size + 60) : [];

                for (let j = 0, nearbyLen = nearbyEnemies.length; j < nearbyLen; j++) {
                    const enemy2 = nearbyEnemies[j];
                    if (!(enemy2 instanceof Enemy)) continue;
                    if (enemy2 === enemy1) continue;
                    if (!enemy2 || !enemy2.pos || enemy2.isDestroyed()) continue;

                    // Skip bodyguards colliding with their principal
                    if (enemy1.role === AI_ROLE.GUARD && enemy1.principal === enemy2) continue;
                    if (enemy2.role === AI_ROLE.GUARD && enemy2.principal === enemy1) continue;

                    // Skip guards belonging to the same principal (flying in formation)
                    if (enemy1.role === AI_ROLE.GUARD && enemy2.role === AI_ROLE.GUARD &&
                        enemy1.principal && enemy1.principal === enemy2.principal) continue;

                    // Skip any two ships in the same formation wing (COMBAT role player wing)
                    if (enemy1.wingId && enemy1.wingId === enemy2.wingId) continue;

                    // Prevent checking same pair twice using numeric hash instead of string concatenation
                    const id1 = enemy1.id ?? i;
                    const id2 = enemy2.id ?? this.enemies.indexOf(enemy2);
                    // Use numeric pair key: smaller ID * large prime + larger ID
                    const pairKey = id1 < id2 ? (id1 * 100003 + id2) : (id2 * 100003 + id1);
                    if (checkedEnemyPairs.has(pairKey)) continue;
                    checkedEnemyPairs.add(pairKey);

                    if (enemy1.checkCollision(enemy2)) {
                        this._handleShipCollision(enemy1, enemy2);
                    }
                }
            }

            // Enemy vs Space Object collisions - using spatial hash per enemy
            for (let i = 0; i < enemyCount; i++) {
                const enemy = this.enemies[i];
                if (!enemy || !enemy.pos || enemy.isDestroyed()) continue;

                const enemySize = enemy.size || 30;
                const nearbySpaceObjects = this.spatialHash ?
                    this.spatialHash.getNearby(enemy.pos.x, enemy.pos.y, enemySize + 100) : [];

                for (let j = 0, nearbyLen = nearbySpaceObjects.length; j < nearbyLen; j++) {
                    const spaceObject = nearbySpaceObjects[j];
                    if (!(spaceObject instanceof SpaceObject)) continue;
                    if (!spaceObject || !spaceObject.pos || spaceObject.destroyed) continue;
                    // Only transports and repair ships skip dockable objects (they need to dock/repair)
                    if (spaceObject.isDockable && (enemy.role === AI_ROLE.TRANSPORT || enemy.role === AI_ROLE.REPAIR)) continue;

                    if (enemy.checkCollision(spaceObject)) {
                        this._handleShipSpaceObjectCollision(enemy, spaceObject);
                    }
                }
            }

            // Asteroid vs Asteroid collisions - check each asteroid against nearby asteroids
            const asteroidCount = this.asteroids.length;
            // Reuse pre-allocated Set to reduce GC pressure
            const checkedPairs = this._checkedAsteroidPairs;
            checkedPairs.clear();

            for (let i = 0; i < asteroidCount; i++) {
                const asteroid1 = this.asteroids[i];
                if (!asteroid1 || !asteroid1.pos || asteroid1.isDestroyed()) continue;

                const maxAsteroidRadius = asteroid1.maxRadius || 40;
                const nearbyAsteroids = this.spatialHash ?
                    this.spatialHash.getNearby(asteroid1.pos.x, asteroid1.pos.y, maxAsteroidRadius + 60) : [];

                for (let j = 0, nearbyLen = nearbyAsteroids.length; j < nearbyLen; j++) {
                    const asteroid2 = nearbyAsteroids[j];
                    if (!(asteroid2 instanceof Asteroid)) continue;
                    if (asteroid2 === asteroid1) continue;
                    if (!asteroid2 || !asteroid2.pos || asteroid2.isDestroyed()) continue;

                    // Create unique pair key using numeric hash to avoid checking same pair twice
                    const id1 = asteroid1.id || i;
                    const id2 = asteroid2.id || this.asteroids.indexOf(asteroid2);
                    // Use numeric pair key: smaller ID * large prime + larger ID
                    const pairKey = id1 < id2 ? (id1 * 100003 + id2) : (id2 * 100003 + id1);

                    if (checkedPairs.has(pairKey)) continue;
                    checkedPairs.add(pairKey);

                    if (asteroid1.checkCollision(asteroid2)) {
                        this._handleAsteroidAsteroidCollision(asteroid1, asteroid2);
                    }
                }
            }

            // Asteroid vs Space Object collisions - using spatial hash
            for (let i = 0; i < asteroidCount; i++) {
                const asteroid = this.asteroids[i];
                if (!asteroid || !asteroid.pos || asteroid.isDestroyed()) continue;

                const maxRadius = asteroid.maxRadius || 40;
                const nearbyObjects = this.spatialHash ?
                    this.spatialHash.getNearby(asteroid.pos.x, asteroid.pos.y, maxRadius + 80) : [];

                for (let j = 0, len = nearbyObjects.length; j < len; j++) {
                    const spaceObject = nearbyObjects[j];
                    if (!(spaceObject instanceof SpaceObject)) continue;
                    if (!spaceObject || !spaceObject.pos || spaceObject.isDestroyed()) continue;

                    if (asteroid.checkCollision(spaceObject)) {
                        this._handleAsteroidSpaceObjectCollision(asteroid, spaceObject);
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
     * OPTIMIZED: Uses spatial hash for nearby asteroid lookup
     * @private
     */
    _checkProjectileAsteroidCollision(proj, i, distCheckVector, asteroidCount) {
        // Use spatial hash if available for O(1) lookup
        const nearbyAsteroids = this.spatialHash ?
            this.spatialHash.getNearby(proj.pos.x, proj.pos.y, 80) : this.asteroids;

        for (let j = nearbyAsteroids.length - 1; j >= 0; j--) {
            const asteroid = nearbyAsteroids[j];
            if (!(asteroid instanceof Asteroid)) continue;
            if (!asteroid || asteroid.isDestroyed()) continue;

            if (this._checkProjectileBroadphase(proj, asteroid, distCheckVector) && asteroid.checkCollision(proj)) {
                // Storm projectiles don't damage asteroids - they spawn storms
                if (!proj._isStorm) {
                    asteroid.takeDamage(proj.damage || 1, proj.owner, this);
                    this.addExplosion(proj.pos.x, proj.pos.y, 10, [255, 120, 20]);
                }
                // Spawn storm on impact if this is a storm projectile
                if (proj._isStorm && proj.stormConfig) {
                    this._spawnWeaponStorm(proj);
                }
                this.removeProjectile(i);
                return true;
            }
        }
        return false;
    }

    /**
     * Check and handle projectile collision with space objects
     * OPTIMIZED: Uses spatial hash for nearby lookup
     * @private
     */
    _checkProjectileSpaceObjectCollision(proj, i, distCheckVector) {
        if (!this.spaceObjects || !this.spaceObjects.length) return false;

        // Use spatial hash if available
        const nearbyObjects = this.spatialHash ?
            this.spatialHash.getNearby(proj.pos.x, proj.pos.y, 100) : this.spaceObjects;

        for (let j = nearbyObjects.length - 1; j >= 0; j--) {
            const so = nearbyObjects[j];
            if (!(so instanceof SpaceObject)) continue;
            const soDestroyed = so && (typeof so.isDestroyed === 'function' ? so.isDestroyed() : !!so.destroyed);
            if (!so || soDestroyed) continue;

            if (this._checkProjectileBroadphase(proj, so, distCheckVector) && so.checkCollision && so.checkCollision(proj)) {
                // Storm projectiles don't damage space objects - they spawn storms
                if (!proj._isStorm) {
                    try { so.takeDamage(proj.damage || 1, proj.owner, this); } catch (e) { console.error('Error damaging spaceObject', e); }
                    this.addExplosion(proj.pos.x, proj.pos.y, 8, [200, 100, 255]);
                }
                // Spawn storm on impact if this is a storm projectile
                if (proj._isStorm && proj.stormConfig) {
                    this._spawnWeaponStorm(proj);
                }
                this.removeProjectile(i);
                return true;
            }
        }
        return false;
    }

    /**
     * Check and handle projectile collision with mines
     * OPTIMIZED: Uses spatial hash for nearby lookup
     * @private
     */
    _checkProjectileMineCollision(proj, i, distCheckVector) {
        // Use spatial hash if available
        const nearbyMines = this.spatialHash ?
            this.spatialHash.getNearby(proj.pos.x, proj.pos.y, 50) : this.mines;

        for (let j = nearbyMines.length - 1; j >= 0; j--) {
            const mine = nearbyMines[j];
            if (!mine || !mine.isMine) continue; // Filter to mines only
            if (mine.destroyed || proj.owner === mine.owner) continue;

            if (this._checkProjectileBroadphase(proj, mine, distCheckVector)) {
                // Storm projectiles don't damage mines - they spawn storms
                if (!proj._isStorm) {
                    mine.takeDamage(proj.damage || 10, proj.owner, this);
                    this.addExplosion(proj.pos.x, proj.pos.y, 5, [200, 100, 0]);
                }
                // Spawn storm on impact if this is a storm projectile
                if (proj._isStorm && proj.stormConfig) {
                    this._spawnWeaponStorm(proj);
                }
                this.removeProjectile(i);
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
                    try { if (typeof soundManager !== 'undefined' && soundManager.playWorldSound) soundManager.playWorldSound('harpoonFire', proj.pos.x, proj.pos.y, this.player.pos, proj.owner); } catch (_) { }
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

                    // Storm projectiles don't apply damage - they only spawn storms
                    if (proj._isStorm) {
                        // Spawn storm and exit (handled at end of this block)
                    } else {
                        // Use centralized hit handler from WeaponSystem
                        WeaponSystem.handleHitEffects(
                            this.player,
                            projPos,
                            proj.damage,
                            proj.owner,
                            this,
                            proj.color
                        );
                    }

                    // Apply Tangle effect if it's a tangle projectile
                    if (proj._isTangle && typeof this.player.applyDragEffect === 'function') {
                        this.player.applyDragEffect(
                            proj.tangleDuration || DRAG_EFFECT_DEFAULT_DURATION,
                            proj.dragMultiplier || DRAG_EFFECT_DEFAULT_MULTIPLIER,
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

                    // Spawn storm on impact if this is a storm projectile - attach to player
                    if (proj._isStorm && proj.stormConfig) {
                        this._spawnWeaponStorm(proj, this.player);
                    }

                    this.removeProjectile(i);
                    continue;
                }
            }

            // For enemy hits - use spatial partitioning approach
            if (proj.owner instanceof Player) {
                // OPTIMIZATED: Query spatial hash for nearby enemies instead of checking all
                const nearbyEnemies = this.spatialHash ?
                    this.spatialHash.getNearby(projPos.x, projPos.y, 300) : this.enemies;

                for (let j = 0, len = nearbyEnemies.length; j < len; j++) {
                    const enemy = nearbyEnemies[j];
                    // Early bailout for invalid entries, self-hits (though strict equality handles that), or non-Enemies
                    // Spatial hash contains projectiles too, so we MUST check type
                    if (!enemy || !enemy.pos || !(enemy instanceof Enemy)) continue;
                    if (typeof enemy.isDestroyed === 'function' && enemy.isDestroyed()) continue;
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
                                    // Check for existing harpoon and toggle it (destroy if exists)
                                    const existingHarpoon = Array.isArray(this.harpoons) ? this.harpoons.find(h => h && !h.broken && h.owner === owner && h.target === target) : null;

                                    if (existingHarpoon) {
                                        existingHarpoon.break();
                                        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) console.log('Harpoon toggle: broke existing tether (player->enemy)');
                                    } else {
                                        const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                        if (!this.harpoons) this.harpoons = [];
                                        this.harpoons.push(har);
                                        if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                            console.log('Harpoon spawned (player->enemy)', { owner: owner.constructor ? owner.constructor.name : owner, target: target.constructor ? target.constructor.name : target });
                                        }
                                    }
                                }
                                // small impact visual and sound
                                this.addExplosion(projPos.x, projPos.y, 6, [180, 220, 255]);
                            } catch (e) { console.error('Failed to create Harpoon', e); }
                            this.removeProjectile(i);
                            break;
                        }

                        // Storm projectiles don't apply damage - they only spawn storms
                        if (!proj._isStorm) {
                            // Use centralized hit handler from WeaponSystem
                            WeaponSystem.handleHitEffects(
                                enemy,
                                projPos,
                                proj.damage,
                                proj.owner,
                                this,
                                proj.color
                            );
                        }

                        // Apply Tangle effect if it's a tangle projectile
                        if (proj._isTangle && typeof enemy.applyDragEffect === 'function') {
                            enemy.applyDragEffect(
                                proj.tangleDuration || DRAG_EFFECT_DEFAULT_DURATION,
                                proj.dragMultiplier || DRAG_EFFECT_DEFAULT_MULTIPLIER,
                                proj.rotationBlockMultiplier || 0.1
                            );

                            // Add visual feedback for player
                            if (typeof uiManager !== 'undefined') {
                                uiManager.addMessage(`${enemy.shipTypeName} caught in energy tangle!`, "#30FFB4");
                            }
                        }

                        // Spawn storm on impact if this is a storm projectile - attach to enemy
                        if (proj._isStorm && proj.stormConfig) {
                            this._spawnWeaponStorm(proj, enemy);
                        }

                        this.removeProjectile(i);
                        break;
                    }
                }
            }

            // For enemy-to-enemy hits (friendly fire)
            if (proj.owner instanceof Enemy) {
                // OPTIMIZATED: Query spatial hash for nearby enemies instead of checking all
                const nearbyEnemies = this.spatialHash ?
                    this.spatialHash.getNearby(projPos.x, projPos.y, 300) : this.enemies;

                for (let j = 0, len = nearbyEnemies.length; j < len; j++) {
                    const enemy = nearbyEnemies[j];
                    // Early bailout for invalid enemies, self-fire, or non-Enemies
                    // Spatial hash contains projectiles too, so we MUST check type
                    if (!enemy || !enemy.pos || !(enemy instanceof Enemy)) continue;
                    if (enemy === proj.owner || (typeof enemy.isDestroyed === 'function' && enemy.isDestroyed())) continue;
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

                        // Storm projectiles don't apply damage - they only spawn storms
                        if (!proj._isStorm) {
                            // Use centralized hit handler from WeaponSystem for other projectile types
                            WeaponSystem.handleHitEffects(
                                enemy,
                                proj.pos,
                                proj.damage / 2, // Reduce damage for friendly fire
                                proj.owner,
                                this,
                                proj.color
                            );
                        }

                        // Apply Tangle effect if it's a tangle projectile
                        if (proj._isTangle && typeof enemy.applyDragEffect === 'function') {
                            enemy.applyDragEffect(
                                (proj.tangleDuration || DRAG_EFFECT_DEFAULT_DURATION),
                                (proj.dragMultiplier || DRAG_EFFECT_DEFAULT_MULTIPLIER),
                                (proj.rotationBlockMultiplier || 0.1)
                            );
                        }

                        // Spawn storm on impact if this is a storm projectile - attach to enemy
                        if (proj._isStorm && proj.stormConfig) {
                            this._spawnWeaponStorm(proj, enemy);
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

        // OPTIMIZATION: Use spatial hash to find nearby cargo only
        // This assumes cargo is inserted into spatial hash (it is, in _rebuildSpatialHash)
        // 200px radius is sufficient for collection range checks
        const nearbyCargo = this.spatialHash ?
            this.spatialHash.getNearby(this.player.pos.x, this.player.pos.y, 200) :
            this.cargo;

        // Create a temporary list for items to remove from the main cargo array
        const cargoToRemove = [];

        for (let i = 0, len = nearbyCargo.length; i < len; i++) {
            const cargoItem = nearbyCargo[i];

            // Spatial hash contains all entities, so we must filter for Cargo instances
            // or check for specific cargo properties
            if (!cargoItem || !cargoItem.type || typeof cargoItem.checkCollision !== 'function') continue;
            if (cargoItem instanceof SpaceObject || cargoItem instanceof Enemy || cargoItem instanceof Asteroid) continue;
            // FIX: Explicitly ignore Projectiles and ensure it is a Cargo instance if possible
            if (typeof Projectile !== 'undefined' && cargoItem instanceof Projectile) continue;
            if (typeof Cargo !== 'undefined' && !(cargoItem instanceof Cargo)) continue;

            // Basic validation (spatial hash might return items that were just fastRemoved from main list but not hash,
            // though hash is rebuilt every frame so it should be consistent)

            // Skip if invalid, already collected, or expired
            if (!cargoItem || !cargoItem.pos || !cargoItem.type) {
                console.warn(`Invalid cargo item found in nearbyCargo, removing`);
                // Mark for removal from the main cargo array
                cargoToRemove.push(cargoItem);
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
                cargoToRemove.push(cargoItem);
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
                        cargoToRemove.push(cargoItem);
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

        // Process removals safely from the main array
        // We must re-find the index for each item as _fastRemove swaps elements
        for (let i = 0; i < cargoToRemove.length; i++) {
            const item = cargoToRemove[i];
            const idx = this.cargo.indexOf(item);
            if (idx !== -1) {
                this._fastRemove(this.cargo, idx);
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

    /** Adds a summon ping effect at the caller's position. */
    addSummonPing(caller, options = {}) {
        if (!caller?.pos) return;
        const faction = options.faction || caller.faction || 'UNKNOWN';
        const factionColorMap = {
            IMPERIAL: [120, 180, 255],
            SEPARATIST: [255, 120, 120],
            MILITARY: [255, 220, 120],
            PIRATE: [255, 145, 105],
            POLICE: [140, 180, 255]
        };
        this.summonPings.push({
            x: caller.pos.x,
            y: caller.pos.y,
            color: factionColorMap[faction] || [210, 210, 255],
            startTime: this._getCurrentTime(),
            durationMs: options.durationMs || SUMMON_PING_CONFIG.DEFAULT_DURATION_MS,
            maxRadius: options.maxRadius || 360,
            arcOffset: random(TWO_PI)
        });
    }

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
        // Process pending worker bitmaps at a controlled rate to prevent frame spikes
        // This converts queued ImageBitmaps into drawable p5 graphics buffers
        if (typeof processPendingStarfieldBitmaps === 'function') {
            processPendingStarfieldBitmaps(this);
        }

        // Clear background with dark space color (deep dark blue, not pure black)
        const bg = STARFIELD_CONFIG.BACKGROUND_COLOR;
        fill(bg.r, bg.g, bg.b);
        noStroke();
        rect(-width * 2, -height * 2, width * 4, height * 4);

        // Always use progressive tile-based rendering (worker-driven)
        this._drawProgressiveStarfield();

        // Layered parallax overlays for additional depth (distant stars, nebula, dust, particles)
        this._drawLayeredParallaxBackground();

        // Draw ambient background events (supernovas, comets, warp flashes)
        this._drawAmbientBackgroundEvents();

        // Draw spectacular stars (animated phenomena) - these are rare and change over time
        // so they're drawn directly each frame, but only in visible area
        this._drawSpectacularStarsOverlay();
    }

    /**
     * Draws active ambient background events.
     * @private
     */
    _drawAmbientBackgroundEvents() {
        const len = this.ambientBackgroundEvents.length;
        for (let i = 0; i < len; i++) {
            this.ambientBackgroundEvents[i].draw();
        }
    }

    /**
     * Computes a parallax layer world position so it scrolls relative to player movement.
     * @param {number} baseCoord - Base coordinate in layer-space.
     * @param {number} playerCoord - Current player world coordinate.
     * @param {number} parallaxFactor - Layer movement multiplier (1.0 = baseline, >1.0 = foreground/faster, <1.0 = background/slower).
     * @returns {number}
     */
    static computeParallaxWorldPosition(baseCoord, playerCoord, parallaxFactor) {
        return baseCoord + playerCoord * (1 - parallaxFactor);
    }

    /**
     * Fast deterministic 2D noise/hash helper returning [0,1).
     * @private
     */
    _parallaxNoise2D(x, y, salt = 0) {
        let h = (Math.imul((x | 0), 374761393) ^ Math.imul((y | 0), 668265263) ^ Math.imul((salt | 0), 1442695041)) >>> 0;
        h ^= h >>> 13;
        h = Math.imul(h, 1274126177) >>> 0;
        return ((h ^ (h >>> 16)) >>> 0) / 4294967296;
    }

    /**
     * Draws layered deterministic parallax effects in world space.
     * @private
     */
    _drawLayeredParallaxBackground() {
        if (!this.player?.pos || !STARFIELD_CONFIG.PARALLAX_ENABLED) return;
        const layers = STARFIELD_CONFIG.PARALLAX_LAYERS;
        if (!Array.isArray(layers) || layers.length === 0) return;

        const playerX = this.player.pos.x;
        const playerY = this.player.pos.y;
        const now = millis();

        for (const layer of layers) {
            this._drawParallaxLayerCells(layer, playerX, playerY, now);
        }
    }

    /**
     * Draws one parallax layer by iterating deterministic cells around the viewport.
     * @private
     */
    _drawParallaxLayerCells(layer, playerX, playerY, now) {
        if (!layer || !layer.cellSize || typeof layer.parallax !== 'number') return;
        const cellSize = layer.cellSize;
        const maxPerCell = Math.max(1, layer.maxPerCell || 1);
        const maxVisibleItems = Number.isFinite(layer.maxVisibleItems)
            ? Math.max(1, layer.maxVisibleItems)
            : Number.POSITIVE_INFINITY;
        const hasVisibleItemCap = Number.isFinite(maxVisibleItems);
        const chance = Math.min(1, Math.max(0, layer.chance || 0.5));
        const densityVariation = layer.densityVariation;
        const hasDensityVariation = densityVariation && typeof densityVariation === 'object';
        const macroCellSpan = hasDensityVariation
            ? Math.max(1, Math.floor(densityVariation.macroCellSpan || 1))
            : 1;
        const chanceMultiplierMin = hasDensityVariation
            ? (densityVariation.chanceMultiplierRange?.[0] ?? 1)
            : 1;
        const chanceMultiplierMax = hasDensityVariation
            ? (densityVariation.chanceMultiplierRange?.[1] ?? chanceMultiplierMin)
            : chanceMultiplierMin;
        const sizeMin = layer.sizeRange?.[0] ?? 1;
        const sizeMax = layer.sizeRange?.[1] ?? sizeMin;
        const alphaMin = layer.alphaRange?.[0] ?? 80;
        const alphaMax = layer.alphaRange?.[1] ?? alphaMin;
        const twinkleSpeed = layer.twinkleSpeed || 0;
        const drift = layer.drift || [0, 0];
        const driftX = now * drift[0];
        const driftY = now * drift[1];
        const palette = Array.isArray(layer.colors) && layer.colors.length > 0 ? layer.colors : [[255, 255, 255]];
        const parallax = layer.parallax;

        const camX = playerX * parallax + driftX;
        const camY = playerY * parallax + driftY;
        const left = camX - width / 2 - cellSize;
        const right = camX + width / 2 + cellSize;
        const top = camY - height / 2 - cellSize;
        const bottom = camY + height / 2 + cellSize;
        const startCellX = Math.floor(left / cellSize);
        const endCellX = Math.ceil(right / cellSize);
        const startCellY = Math.floor(top / cellSize);
        const endCellY = Math.ceil(bottom / cellSize);
        const seed = (this.systemIndex + 1) * PARALLAX_SEED_MULTIPLIER;
        let drawnItems = 0;

        noStroke();

        layerLoop:
        for (let cx = startCellX; cx <= endCellX; cx++) {
            for (let cy = startCellY; cy <= endCellY; cy++) {
                let cellChance = chance;
                if (hasDensityVariation) {
                    const macroX = Math.floor(cx / macroCellSpan);
                    const macroY = Math.floor(cy / macroCellSpan);
                    const densityNoise = this._parallaxNoise2D(macroX, macroY, seed + PARALLAX_HASH_SALTS.DENSITY);
                    const chanceMultiplier = chanceMultiplierMin + densityNoise * (chanceMultiplierMax - chanceMultiplierMin);
                    cellChance = Math.min(1, Math.max(0, chance * chanceMultiplier));
                }
                if (this._parallaxNoise2D(cx, cy, seed) > cellChance) continue;

                const countNoise = this._parallaxNoise2D(cx, cy, seed + PARALLAX_HASH_SALTS.COUNT);
                const itemCount = 1 + Math.floor(countNoise * maxPerCell);

                for (let i = 0; i < itemCount; i++) {
                    const salt = seed + i * 23;
                    const rx = this._parallaxNoise2D(cx, cy, salt + PARALLAX_HASH_SALTS.POS_X);
                    const ry = this._parallaxNoise2D(cx, cy, salt + PARALLAX_HASH_SALTS.POS_Y);
                    const rs = this._parallaxNoise2D(cx, cy, salt + PARALLAX_HASH_SALTS.SIZE);
                    const ra = this._parallaxNoise2D(cx, cy, salt + PARALLAX_HASH_SALTS.ALPHA);
                    const rc = this._parallaxNoise2D(cx, cy, salt + PARALLAX_HASH_SALTS.COLOR);

                    const baseX = cx * cellSize + rx * cellSize - driftX;
                    const baseY = cy * cellSize + ry * cellSize - driftY;
                    const worldX = StarSystem.computeParallaxWorldPosition(baseX, playerX, parallax);
                    const worldY = StarSystem.computeParallaxWorldPosition(baseY, playerY, parallax);
                    let size = sizeMin + rs * (sizeMax - sizeMin);
                    let alpha = alphaMin + ra * (alphaMax - alphaMin);

                    if (twinkleSpeed > 0) {
                        alpha *= (PARALLAX_TWINKLE_BASE + PARALLAX_TWINKLE_RANGE * Math.sin(now * twinkleSpeed + rc * TWO_PI));
                    }

                    const color = palette[Math.floor(rc * palette.length) % palette.length];

                    if (layer.type === 'nebula') {
                        this._drawParallaxNebula(worldX, worldY, size, alpha, color);
                    } else if (layer.type === 'dust') {
                        // Soft dust motes (non-linear), avoids streak artifacts.
                        fill(color[0], color[1], color[2], alpha * 0.55);
                        circle(worldX, worldY, size * 2.1);
                        fill(color[0], color[1], color[2], alpha);
                        circle(worldX, worldY, size);
                    } else {
                        // All non-nebula/dust types render as plain crisp specks — no glow.
                        fill(color[0], color[1], color[2], alpha);
                        circle(worldX, worldY, size);
                    }
                    drawnItems++;
                    if (hasVisibleItemCap && drawnItems >= maxVisibleItems) {
                        break layerLoop;
                    }
                }
            }
        }
    }

    /**
     * Draws a soft nebula puff at world coordinates.
     * @private
     */
    _drawParallaxNebula(x, y, size, alpha, color) {
        const ctx = drawingContext;
        const grad = ctx.createRadialGradient(x, y, size * 0.1, x, y, size);
        grad.addColorStop(0, `rgba(${color[0]},${color[1]},${color[2]},${alpha})`);
        grad.addColorStop(1, `rgba(${color[0]},${color[1]},${color[2]},0)`);
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(x, y, size, 0, TWO_PI);
        ctx.fill();
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
        // Backpressure: Halt generation if the pending bitmap queue is 80% full.
        // This prevents the worker from flooding the main thread and wasting resources 
        // on tiles that would simply be dropped by the overflow protection.
        if (typeof PENDING_STARFIELD_BITMAPS !== 'undefined') {
            const maxPending = STARFIELD_CONFIG.MAX_PENDING_BITMAPS || 20;
            if (PENDING_STARFIELD_BITMAPS.length > maxPending * 0.8) {
                return;
            }
        }

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
     * @param {number} [zoomScale=1.0] - Optional zoom scale for death zoom effect
     */
    draw(zoomScale = 1.0) {
        if (!this.player || !this.player.pos) return;

        push();

        // Update camera system if available
        if (typeof cameraSystem !== 'undefined') {
            cameraSystem.update(this.player.pos, this.player.vel, this.player.angle, deltaTime);
            cameraSystem.applyTransform(zoomScale);
        } else {
            // Fallback translation
            const tx = width / 2 - this.player.pos.x;
            const ty = height / 2 - this.player.pos.y;
            translate(tx, ty);

            if (zoomScale > 1.0) {
                translate(this.player.pos.x, this.player.pos.y);
                scale(zoomScale);
                translate(-this.player.pos.x, -this.player.pos.y);
            }
        }

        // Calculate translation based on camera/player position for bounds culling
        const camX = (typeof cameraSystem !== 'undefined') ? cameraSystem.pos.x : this.player.pos.x;
        const camY = (typeof cameraSystem !== 'undefined') ? cameraSystem.pos.y : this.player.pos.y;
        const tx = width / 2 - camX;
        const ty = height / 2 - camY;


        // Calculate screen bounds once (with margin) - reuse pre-allocated object
        // When zoomed, the visible world area is smaller (divided by zoom)
        // so we need to adjust bounds accordingly for proper culling
        const invZoom = zoomScale > 1.0 ? 1.0 / zoomScale : 1.0;
        const marginBase = 100;
        // Expand margin proportionally to inverse zoom to prevent edge culling
        const margin = marginBase + (zoomScale > 1.0 ? (width * invZoom) : 0);

        const screenBounds = this.screenBounds;
        screenBounds.left = -tx - margin;
        screenBounds.right = -tx + width + margin;
        screenBounds.top = -ty - margin;
        screenBounds.bottom = -ty + height + margin;

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

        // Cache sun position for space object renderers (PERFORMANCE OPTIMIZATION)
        // This avoids 60+ Math.atan2 calls per frame in SpaceObjectRenderers
        this._cachedSunPos = sunPos;

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

        // Draw enemy targeting lines FIRST (so they appear underneath ships)
        for (let i = 0; i < enemyCount; i++) {
            const e = this.enemies[i];
            if (e.drawTargetingLine && this.isInView(e.pos.x, e.pos.y, e.size * 2, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                e.drawTargetingLine();
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
        // In surface mode, only draw surface projectiles
        const inSurfaceMode = (typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive());
        for (let i = 0; i < projCount; i++) {
            const proj = this.projectiles[i];

            // Skip space projectiles when in surface mode
            if (inSurfaceMode && !proj.isSurface) {
                continue;
            }

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

        if (this.summonPings && this.summonPings.length > 0) {
            this.drawSummonPingsWithCulling(screenBounds);
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

        // Draw micro-asteroid hail (space debris with shield hit ripples)
        if (this.microAsteroidHail) {
            this.microAsteroidHail.draw();
        }

        // Draw dynamic lighting effects (muzzle flashes, impact glows) in world space
        if (typeof LightingEffects !== 'undefined') {
            LightingEffects.draw();
        }

        pop();

        // Draw screen-space visual post-processing effects (EMP glitch, radiation static, speed lines)
        this.drawScreenSpaceEffects();
    }

    /**
     * Draws screen-space visual overlays representing environmental and flight states
     * (e.g. electromagnetic glitches, radiation geiger grain, warp speed lines).
     */
    drawScreenSpaceEffects() {
        if (!this.player || !this.player.pos) return;
        
        // Cache cosmic storm checks once per frame (optimize check)
        let inRadiationStorm = false;
        let radiationIntensity = 0;
        let emIntensity = 0;
        
        const now = millis();
        
        const px = this.player.pos.x;
        const py = this.player.pos.y;
        
        for (let i = 0; i < this.cosmicStorms.length; i++) {
            const storm = this.cosmicStorms[i];
            if (!storm || !storm.pos) continue;
            
            const dx = px - storm.pos.x;
            const dy = py - storm.pos.y;
            const distSq = dx * dx + dy * dy;
            const rSq = storm.effectRadius * storm.effectRadius;
            
            if (distSq < rSq) {
                const dist = Math.sqrt(distSq);
                const strength = (1 - dist / storm.effectRadius) * storm.intensity;
                if (storm.type === 'radiation') {
                    inRadiationStorm = true;
                    radiationIntensity = Math.max(radiationIntensity, strength);
                } else if (storm.type === 'electromagnetic') {
                    emIntensity = Math.max(emIntensity, strength);
                }
            }
        }
        
        // 1. EMP Signal Glitch (targeting disruption or electromagnetic interference)
        const td = Math.max(this.player.targetingDisruption || 0, emIntensity);
        if (td > 0.05 && random() < td * 0.22) {
            push();
            const ctx = drawingContext;
            
            // High-performance double-buffering to completely bypass GPU pipeline stalls/freezes
            let hasGlitchBuffer = false;
            if (typeof document !== 'undefined' && typeof document.createElement === 'function') {
                if (!this.glitchCanvas) {
                    this.glitchCanvas = document.createElement('canvas');
                    this.glitchCtx = this.glitchCanvas.getContext('2d');
                }
                if (this.glitchCanvas.width !== width || this.glitchCanvas.height !== height) {
                    this.glitchCanvas.width = width;
                    this.glitchCanvas.height = height;
                }
                hasGlitchBuffer = true;
            }
            
            if (hasGlitchBuffer && this.glitchCtx && ctx) {
                // Copy screen state once to offscreen buffer (zero feedback hazard copy)
                this.glitchCtx.drawImage(ctx.canvas, 0, 0);
                
                // Draw horizontal row-shifting slices from the offscreen canvas back to screen
                const numStrips = Math.floor(random(2, 2 + td * 5));
                for (let i = 0; i < numStrips; i++) {
                    const sy = random(0, height - 40);
                    const sh = random(10, 45);
                    const offset = random(-25, 25) * td;
                    ctx.drawImage(this.glitchCanvas, 0, sy, width, sh, offset, sy, width, sh);
                }
                
                // Overlay high-performance scanlines
                blendMode(ADD);
                stroke(80, 150 * td, 255, 60 * td);
                strokeWeight(1.0);
                const numScanlines = Math.floor(random(1, 4));
                for (let i = 0; i < numScanlines; i++) {
                    const sy = random(0, height);
                    line(0, sy, width, sy);
                }
            } else {
                // Fallback to high-performance scanline overlay if canvas buffering is unavailable
                blendMode(ADD);
                const numStrips = Math.floor(random(2, 2 + td * 6));
                stroke(80, 150 * td, 255, 120 * td);
                for (let i = 0; i < numStrips; i++) {
                    const sy = random(0, height);
                    strokeWeight(random(1.0, 3.5));
                    line(0, sy, width, sy);
                }
            }
            
            // Faint chromatic/glow overlay block for Cassette Futurism flavor
            noStroke();
            if (random() < 0.25) {
                fill(80, 140 * td, 255 * td, 20);
                const blockY = random(0, height - 60);
                const blockH = random(15, 55);
                rect(0, blockY, width, blockH);
            }
            pop();
        }
        
        // 2. Radiation Geiger Static Overlay
        if (inRadiationStorm && radiationIntensity > 0.05) {
            push();
            blendMode(ADD);
            noStroke();
            
            // Geiger sound frequency triggers ticks, let's render visual green static particles
            const numGrains = Math.floor(radiationIntensity * 30);
            fill(120, 255, 50, 45 * radiationIntensity); // Green glowing static
            for (let i = 0; i < numGrains; i++) {
                const gx = random(0, width);
                const gy = random(0, height);
                const gsize = random(1.5, 3.5);
                ellipse(gx, gy, gsize, gsize);
            }
            
            // Faint flickering line discharges across screen (visual radiation noise)
            if (random() < 0.25) {
                fill(120, 255, 50, 8 * radiationIntensity);
                const lineY = random(0, height);
                rect(0, lineY, width, random(1, 6));
            }
            pop();
        }
        
        // 3. Speed Burst Radial Motion Speed Lines
        if (this.player.isSpeedBursting) {
            push();
            blendMode(ADD);
            stroke(255, 255, 255, 30);
            strokeWeight(1.2);
            
            const numLines = 14;
            const cx = width / 2;
            const cy = height / 2;
            
            for (let i = 0; i < numLines; i++) {
                const angle = random(TWO_PI);
                const startR = random(width * 0.15, width * 0.45);
                const endR = startR + random(40, 100);
                
                const sx = cx + cos(angle) * startR;
                const sy = cy + sin(angle) * startR;
                const ex = cx + cos(angle) * endR;
                const ey = cy + sin(angle) * endR;
                
                line(sx, sy, ex, ey);
            }
            pop();
        }
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

    _getCurrentTime() {
        return (typeof millis === 'function') ? millis() : Date.now();
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
                const sx = beam.start.x, sy = beam.start.y;
                const ex = beam.end.x, ey = beam.end.y;
                const w = beam.width || 2;

                if (typeof LightingEffects !== 'undefined' && typeof LightingEffects.drawBeamGlow === 'function') {
                    LightingEffects.drawBeamGlow(sx, sy, ex, ey, beam.color, { baseWidth: w });
                }
            }
        }
    }


    /** Draw force waves with visibility culling */
    drawForceWavesWithCulling(screenBounds) {
        const now = millis();
        for (let i = 0; i < this.forceWaves.length; i++) {
            const wave = this.forceWaves[i];

            // Only draw if wave intersects screen
            if (this.isInView(wave.pos.x, wave.pos.y, wave.radius, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                const cx = wave.pos.x;
                const cy = wave.pos.y;
                const progress = wave.radius / wave.maxRadius;
                const alpha = map(progress, 0, 1, 255, 0);
                const age = now - wave.startTime;
                const r = wave.color[0], g = wave.color[1], b = wave.color[2];

                push();
                blendMode(ADD);

                // Outer leading ring (bright, thin)
                noFill();
                strokeWeight(2.5);
                stroke(r, g, b, alpha * 0.9);
                circle(cx, cy, wave.radius * 2);

                // Secondary ring slightly behind
                strokeWeight(4);
                stroke(r, g, b, alpha * 0.5);
                circle(cx, cy, wave.radius * 1.85);

                // Hot white edge ring
                strokeWeight(1.5);
                stroke(255, 255, 255, alpha * 0.7);
                circle(cx, cy, wave.radius * 2.02);

                // Tertiary inner ring
                strokeWeight(6);
                stroke(r, g, b, alpha * 0.25);
                circle(cx, cy, wave.radius * 1.6);

                // Faint wide aura ring
                strokeWeight(12);
                stroke(r, g, b, alpha * 0.1);
                circle(cx, cy, wave.radius * 1.4);

                // --- Energy crackle lines radiating outward (~12) ---
                noFill();
                strokeWeight(1.2);
                const overallFlicker = sin(age * 0.015) * 0.25 + 0.75;
                stroke(r, g, b, alpha * 0.55 * overallFlicker);
                for (let j = 0; j < 12; j++) {
                    const baseAngle = (j / 12) * TWO_PI + age * 0.002;
                    const innerR = wave.radius * 0.5;
                    const outerR = wave.radius * (0.92 + sin(age * 0.01 + j * 2.3) * 0.08);
                    const jitter = sin(age * 0.025 + j * 3.1) * 8;

                    const cosVal = cos(baseAngle);
                    const sinVal = sin(baseAngle);

                    const innerX = cx + cosVal * innerR;
                    const innerY = cy + sinVal * innerR;
                    const outerX = cx + cosVal * outerR;
                    const outerY = cy + sinVal * outerR;

                    const midX = (innerX + outerX) * 0.5 - sinVal * jitter;
                    const midY = (innerY + outerY) * 0.5 + cosVal * jitter;

                    line(innerX, innerY, midX, midY);
                    line(midX, midY, outerX, outerY);
                }

                // --- Center flash (bright white that fades to weapon color) ---
                noStroke();
                const flashIntensity = max(0, 1 - progress * 2.5);
                if (flashIntensity > 0) {
                    // White-hot center
                    fill(255, 255, 255, flashIntensity * 200);
                    circle(cx, cy, wave.radius * 0.3 * flashIntensity + 15);
                    // Colored halo around center
                    fill(r, g, b, flashIntensity * 120);
                    circle(cx, cy, wave.radius * 0.5 * flashIntensity + 25);
                }

                // --- Pulsating inner energy ---
                const pulsePhase = (age % 200) / 200;
                const pulseRadius = pulsePhase * wave.radius * 0.6;
                const pulseAlpha = alpha * (1 - pulsePhase) * 0.5;
                noFill();
                strokeWeight(2);
                stroke(255, 255, 255, pulseAlpha);
                circle(cx, cy, pulseRadius * 2);
                stroke(r, g, b, pulseAlpha * 0.7);
                strokeWeight(3);
                circle(cx, cy, pulseRadius * 1.6);

                // --- Debris dots scattered along wavefront (~8) ---
                noStroke();
                fill(r, g, b, alpha * 0.5);
                for (let j = 0; j < 8; j++) {
                    const dotAngle = (j / 8) * TWO_PI + age * 0.001 + j * 0.5;
                    const dotR = wave.radius * (0.9 + sin(age * 0.008 + j * 4.1) * 0.12);
                    const dotSize = 2 + sin(age * 0.02 + j * 2.7) * 1.5;
                    circle(cx + cos(dotAngle) * dotR, cy + sin(dotAngle) * dotR, dotSize);
                }

                blendMode(BLEND);
                pop();
            }
        }
    }

    drawSummonPingsWithCulling(screenBounds) {
        const now = this._getCurrentTime();
        for (let i = 0; i < this.summonPings.length; i++) {
            const ping = this.summonPings[i];
            const maxR = ping.maxRadius || 360;
            if (!this.isInView(ping.x, ping.y, maxR, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) continue;

            const t = constrain((now - ping.startTime) / Math.max(1, ping.durationMs || 1), 0, 1);
            const baseAlpha = Math.max(0, 205 * (1 - t));
            const col = ping.color || [210, 210, 255];
            const baseRotation = (ping.arcOffset || 0) + (t * SUMMON_PING_CONFIG.ROTATION_SPEED);
            // Time-based pulse for transmission flicker
            const elapsedMs = now - ping.startTime;
            const blinkPhase = Math.sin(elapsedMs * 0.001 * SUMMON_PING_CONFIG.CENTER_BLINK_RATE * TWO_PI);

            noFill();

            // --- Draw staggered transmission pulse waves ---
            for (let waveIndex = 0; waveIndex < SUMMON_PING_CONFIG.WAVE_OFFSETS.length; waveIndex++) {
                const waveT = t - SUMMON_PING_CONFIG.WAVE_OFFSETS[waveIndex];
                if (waveT < 0 || waveT > 1) continue;

                const waveRadius = lerp(SUMMON_PING_CONFIG.INITIAL_RADIUS, maxR, waveT);
                const waveAlpha = Math.max(
                    0,
                    baseAlpha
                    * (1 - waveT * SUMMON_PING_CONFIG.WAVE_ALPHA_DECAY)
                    * (1 - waveIndex * SUMMON_PING_CONFIG.WAVE_INDEX_ALPHA_FACTOR)
                );
                const waveRotation = baseRotation + waveIndex * SUMMON_PING_CONFIG.WAVE_ROTATION_OFFSET;

                // Main outer arc segments
                stroke(col[0], col[1], col[2], waveAlpha);
                strokeWeight(SUMMON_PING_CONFIG.BASE_STROKE_WEIGHT - waveIndex * SUMMON_PING_CONFIG.STROKE_WEIGHT_DECAY);
                for (let segment = 0; segment < SUMMON_PING_CONFIG.ARC_SEGMENTS; segment++) {
                    const segStart = waveRotation + segment * (TWO_PI / SUMMON_PING_CONFIG.ARC_SEGMENTS);
                    arc(
                        ping.x,
                        ping.y,
                        waveRadius * 2,
                        waveRadius * 2,
                        segStart,
                        segStart + SUMMON_PING_CONFIG.ARC_SPAN
                    );
                }

                // Inner arc segments (drawn in a separate loop to avoid stroke switches)
                const innerRadius = Math.max(SUMMON_PING_CONFIG.MIN_INNER_RADIUS, waveRadius - SUMMON_PING_CONFIG.RING_SEPARATION);
                stroke(col[0], col[1], col[2], waveAlpha * SUMMON_PING_CONFIG.INNER_ARC_ALPHA_MULTIPLIER);
                strokeWeight(SUMMON_PING_CONFIG.INNER_ARC_STROKE_WEIGHT);
                for (let segment = 0; segment < SUMMON_PING_CONFIG.ARC_SEGMENTS; segment++) {
                    const segStart = waveRotation + segment * (TWO_PI / SUMMON_PING_CONFIG.ARC_SEGMENTS);
                    arc(
                        ping.x,
                        ping.y,
                        innerRadius * 2,
                        innerRadius * 2,
                        segStart + SUMMON_PING_CONFIG.INNER_ARC_OFFSET,
                        segStart + SUMMON_PING_CONFIG.INNER_ARC_OFFSET + SUMMON_PING_CONFIG.INNER_ARC_SPAN
                    );
                }

                // Outer dashed ring - transmission signal look
                if (waveIndex < 2) {
                    const outerR = waveRadius + 8;
                    const dashAlpha = waveAlpha * 0.45;
                    stroke(col[0], col[1], col[2], dashAlpha);
                    strokeWeight(0.8);
                    const dashCount = SUMMON_PING_CONFIG.OUTER_DASH_SEGMENTS;
                    const dashSpan = SUMMON_PING_CONFIG.OUTER_DASH_SPAN;
                    const dashRotation = waveRotation * 1.3 + waveIndex * 0.7;
                    for (let d = 0; d < dashCount; d++) {
                        const dStart = dashRotation + d * (TWO_PI / dashCount);
                        arc(ping.x, ping.y, outerR * 2, outerR * 2, dStart, dStart + dashSpan);
                    }
                }
            }

            // --- Radial pulse lines emanating from center (transmission signal look) ---
            const pulseLineCount = SUMMON_PING_CONFIG.PULSE_LINE_COUNT;
            const pulseLineLen = SUMMON_PING_CONFIG.PULSE_LINE_LENGTH;
            const lineAlpha = baseAlpha * SUMMON_PING_CONFIG.PULSE_LINE_ALPHA_MULT * Math.max(0, 0.5 + blinkPhase * 0.5);
            if (lineAlpha > 2) {
                stroke(col[0], col[1], col[2], lineAlpha);
                strokeWeight(1.0);
                const lineBaseR = lerp(14, maxR * 0.15, t);
                const lineRot = baseRotation * 0.7;
                for (let li = 0; li < pulseLineCount; li++) {
                    const ang = lineRot + li * (TWO_PI / pulseLineCount);
                    const r1 = lineBaseR;
                    const r2 = lineBaseR + pulseLineLen * (1 - t * 0.6);
                    const cosAng = Math.cos(ang);
                    const sinAng = Math.sin(ang);
                    line(
                        ping.x + cosAng * r1,
                        ping.y + sinAng * r1,
                        ping.x + cosAng * r2,
                        ping.y + sinAng * r2
                    );
                }
            }

            // --- Blinking center glow (transmission beacon) ---
            noStroke();
            const centerBlink = Math.max(0, 0.4 + blinkPhase * 0.6);
            const centerAlpha = Math.max(0, 165 * (1 - t) * centerBlink);
            fill(col[0], col[1], col[2], centerAlpha);
            const centerSize = lerp(SUMMON_PING_CONFIG.CENTER_GLOW_MAX, SUMMON_PING_CONFIG.CENTER_GLOW_MIN, t);
            circle(ping.x, ping.y, centerSize);

            // Bright white core that blinks
            if (centerBlink > 0.7 && t < 0.6) {
                fill(255, 255, 255, centerAlpha * 0.7);
                circle(ping.x, ping.y, centerSize * 0.5);
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
            // Save cosmic storms
            cosmicStorms: this._serializeEntityArray(this.cosmicStorms),

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
            cachedDescription: this.cachedDescription,

            // Dynamic entities
            // Filter out player bodyguards (saved with player.activeBodyguards) and destroyed enemies
            enemies: this._serializeEntityArray(
                this.enemies.filter(e => e && !e.isPlayerBodyguard && !e.destroyed && e.hull > 0),
                (e) => ({
                    shipType: e.shipTypeName || e.shipType || null,
                    role: e.role || null,
                    pos: e.pos ? { x: e.pos.x, y: e.pos.y } : null,
                    vel: e.vel ? { x: e.vel.x, y: e.vel.y } : null,
                    hp: e.hp ?? e.health,
                    angle: e.angle,
                    state: e.currentState,
                    id: e.id
                })),
            projectiles: this._serializeEntityArray(this.projectiles, (p) => ({
                type: p.type || null,
                pos: p.pos ? { x: p.pos.x, y: p.pos.y } : null,
                vel: p.vel ? { x: p.vel.x, y: p.vel.y } : null,
                lifespan: p.lifespan,
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
            staticElementsInitialized: this.staticElementsInitialized,
            shouldSpawnNPCs: this.shouldSpawnNPCs // Preserve NPC spawning state
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

        // Initialize spawn timer (critical for saved games)
        sys._spawnTimer = SPAWN_CONFIG.SPAWN_INTERVAL_MS || 5000;

        // CRITICAL: Restore the large despawn radius used during initial generation
        // Since initStaticElements is skipped on load, this would otherwise default to ~3500, causing massive culling.
        sys.despawnRadius = SPAWN_CONFIG.FIXED_LARGE_DESPAWN_RADIUS;

        sys.visited = data.visited;
        sys.economyType = data.economyType;
        sys.connectedSystemIndices = Array.isArray(data.connectedSystemIndices) ? [...data.connectedSystemIndices] : [];

        // Restore NPC spawning state (defaults to true if not present for backward compatibility)
        sys.shouldSpawnNPCs = data.shouldSpawnNPCs !== undefined ? data.shouldSpawnNPCs : true;

        // Restore planets
        sys.planets = this._deserializeEntityArray(data.planets, Planet);

        // Restore station
        if (data.station && typeof Station !== "undefined" && typeof Station.fromJSON === "function") {
            sys.station = Station.fromJSON(data.station);
        } else {
            sys.station = null;
        }

        // Restore secret stations
        if (data.secretStations && Array.isArray(data.secretStations) && typeof Station !== "undefined" && typeof Station.fromJSON === "function") {
            sys.secretStations = data.secretStations.map(stationData => {
                try {
                    return Station.fromJSON(stationData);
                } catch (e) {
                    console.error('Error restoring secret station:', e);
                    return null;
                }
            }).filter(s => s !== null);
        } else {
            sys.secretStations = [];
        }

        // Restore Nebulae
        sys.nebulae = this._deserializeEntityArray(data.nebulae, Nebula);
        // Restore Cosmic Storms
        sys.cosmicStorms = this._deserializeEntityArray(data.cosmicStorms, CosmicStorm);

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

        // Populate enemiesById Map for O(1) lookups after restore
        if (Array.isArray(sys.enemies)) {
            for (const enemy of sys.enemies) {
                if (enemy && enemy.id != null) {
                    sys.enemiesById.set(enemy.id, enemy);
                }
            }
        }

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
                if (
                    typeof v.add === 'function' &&
                    typeof v.copy === 'function' &&
                    typeof v.mult === 'function' &&
                    typeof v.set === 'function'
                ) return v;

                const x = Number(v.x);
                const y = Number(v.y);
                const safeX = Number.isFinite(x) ? x : 0;
                const safeY = Number.isFinite(y) ? y : 0;

                if (typeof createVector === 'function') {
                    return createVector(safeX, safeY);
                }

                const createFallbackVector = (xValue, yValue) => ({
                    x: xValue,
                    y: yValue,
                    add(other) {
                        this.x += Number(other?.x) || 0;
                        this.y += Number(other?.y) || 0;
                        return this;
                    },
                    mult(scalar) {
                        const s = Number(scalar);
                        const safeScalar = Number.isFinite(s) ? s : 1;
                        this.x *= safeScalar;
                        this.y *= safeScalar;
                        return this;
                    },
                    set(nx, ny) {
                        const nextX = Number(nx);
                        const nextY = Number(ny);
                        this.x = Number.isFinite(nextX) ? nextX : this.x;
                        this.y = Number.isFinite(nextY) ? nextY : this.y;
                        return this;
                    },
                    copy() {
                        return createFallbackVector(this.x, this.y);
                    }
                });

                return createFallbackVector(safeX, safeY);
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

            // Restore persistent bounty targets for Event Hunters
            if (Array.isArray(this.enemies)) {
                for (const e of this.enemies) {
                    if (e && e._bountyTargetId) {
                        const target = resolveOwnerRef(e._bountyTargetId);
                        if (target) {
                            e.bountyTarget = target;
                        }
                        delete e._bountyTargetId; // Cleanup temporary ID
                    }
                }
            }

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
                        // Relink stormConfig owner
                        if (p.stormConfig && p.stormConfig.ownerId) {
                            const sOwner = resolveOwnerRef(p.stormConfig.ownerId);
                            if (sOwner) {
                                p.stormConfig.owner = sOwner;
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

            // Cosmic Storms: restore owner and attached references
            if (Array.isArray(this.cosmicStorms)) {
                for (const s of this.cosmicStorms) {
                    if (!s) continue;
                    try {
                        // Restore vectors if not already done by fromJSON/makeVector utils
                        if (s.pos && s.pos.x !== undefined) s.pos = makeVector(s.pos);
                        if (s.velocity && s.velocity.x !== undefined) s.velocity = makeVector(s.velocity);

                        // Relink owner
                        const oid = s.ownerId || s._ownerId || null;
                        if (oid) {
                            const owner = resolveOwnerRef(oid);
                            if (owner) {
                                s.owner = owner;
                            }
                        }

                        // Relink attachedTo
                        const attId = s.attachedToId || s._attachedToId || null;
                        if (attId) {
                            const target = resolveOwnerRef(attId);
                            if (target) {
                                s.attachedTo = target;
                            }
                        }
                    } catch (e) { console.warn('storm relink error', e); }
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

        // Sync all planets with the new economy type
        if (Array.isArray(this.planets)) {
            for (const planet of this.planets) {
                if (planet) planet.economyType = economyType;
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

        // Player-hired bodyguards are persistent escorts and should survive normal distance culling
        // while still assigned to the current runtime player. Orphaned guards are not protected.
        if (entity.isPlayerBodyguard) {
            const hasValidPrincipal = !!(entity.principal && !entity.principal.destroyed && entity.principal === this.player);
            if (hasValidPrincipal) return false;
        }

        // Protect mission-critical entities from being despawned.
        // Assassination targets/guards are explicitly flagged when spawned.
        // Event entities (Raids, Swarms) are also protected.
        if (entity.isAssassinationTarget || entity.isAssassinationGuard || entity.isMissionSpecific || entity.isEventEntity) return false;

        // Keep the player's abandoned hull persistent while the player is on a planet surface.
        // Surface mode moves the player into local terrain coordinates, so normal distance culling
        // would incorrectly remove the drifting hull in orbital space.
        if (entity.isPlayerHull && typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.isActive()) return false;

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
     * Spawns space objects (satellites, debris, etc.) near planets in this system
     * This method is SEEDED - it will generate the same objects for the same system seed
     * @param {boolean} skipJumpZoneObjects - If true, don't spawn objects near jump zone (used during reconstruction)
     */
    spawnSpaceObjectsForPlanets(skipJumpZoneObjects = false) {
        console.log(`         >>> spawnSpaceObjectsForPlanets START for ${this.name}`);

        // GUARD: Check if the planets we're about to spawn for already have alive objects
        // When reconstructing, this.planets is temporarily set to just the planet needing reconstruction
        // So we check if THOSE specific planets already have objects
        const planetsNeedingObjects = [];
        for (let i = 0; i < this.planets.length; i++) {
            const planet = this.planets[i];
            if (!planet) continue;

            // Get the actual planet index (could be different if planets array was modified)
            const planetIdx = planet.planetIndex !== undefined ? planet.planetIndex : i;

            // Check if this planet already has alive objects
            const hasAliveObjects = this.spaceObjects.some(obj => {
                if (!obj || obj.destroyed) return false;
                if (typeof obj.health === 'number' && obj.health <= 0) return false;
                return obj.planetIndex === planetIdx;
            });

            if (!hasAliveObjects) {
                planetsNeedingObjects.push(planet);
            }
        }

        if (planetsNeedingObjects.length === 0) {
            console.log(`         >>> All planets already have alive objects, skipping spawn`);
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
            'Post Human': ['researchArray', 'solarSail', 'satellite', 'telescope', 'beacon', 'signalFlare', 'outpost', 'commDish', 'iceCrystal', 'nebulaFragment', 'alienArtifact', 'quantumGate', 'shipyard', 'ancientRelic', 'advancedResearchStation'],
            'Offworld': ['habitat', 'outpost', 'solarSail', 'satellite', 'relay', 'beacon', 'commDish', 'quantumGate', 'shipyard', 'researchArray', 'cargoCluster', 'commHub'],
            'Tourism': ['orbitalGarden', 'habitat', 'satellite', 'telescope', 'observatoryDome', 'solarSail', 'beacon'],
            'Service': ['habitat', 'relay', 'satellite', 'fuelDepot', 'commDish', 'outpost', 'beacon', 'solarFarm', 'cargoCluster'],
            'Military': ['weaponPlatform', 'shieldGenerator', 'shipyard', 'satellite', 'relay', 'outpost', 'debris', 'fuelDepot', 'commDish', 'prison'],
            'Separatist': ['weaponPlatform', 'shieldGenerator', 'shipyard', 'satellite', 'relay', 'outpost', 'debris', 'wreckage', 'miningPlatform'],
            'Imperial': ['weaponPlatform', 'shieldGenerator', 'shipyard', 'satellite', 'relay', 'outpost', 'debris', 'orbitalGarden'],
            'Alien': ['alienArtifact', 'nebulaFragment', 'iceCrystal', 'debris', 'signalFlare', 'alienMonolith']
        };

        // Default types for other economies (undergroundMarket handled conditionally below)
        const defaultTypes = ['satellite', 'telescope', 'relay', 'debris', 'probe', 'beacon', 'solarSail', 'cargoCluster', 'decoyBuoy', 'habitat', 'researchArray', 'orbitalGarden', 'ancientRelic', 'signalFlare', 'outpost', 'asteroidMiner', 'fuelDepot', 'commDish', 'solarFarm', 'iceCrystal', 'nebulaFragment', 'alienArtifact', 'wreckage', 'observatoryDome', 'hydroponicsBay', 'weaponPlatform', 'shieldGenerator', 'energyCollector', 'quantumGate', 'drugLab', 'labourColony', 'shipyard'];

        // Clone the selected array so we can modify it safely
        const availableTypes = (typesByEconomy[this.economyType] || defaultTypes).slice();

        // Only include underground market in systems where illegal goods CANNOT be traded
        // (i.e., non-Anarchy security levels)
        const isAnarchy = typeof this.securityLevel === 'string' && this.securityLevel.toLowerCase() === 'anarchy';
        if (!isAnarchy && this.economyType !== 'Alien') {
            if (!availableTypes.includes('undergroundMarket')) {
                availableTypes.push('undergroundMarket');
            }
            if (!availableTypes.includes('prison')) {
                availableTypes.push('prison');
            }
        }

        // Loop through planets (check each planet to see if it's the sun, don't assume index 0)
        for (let planetIdx = 0; planetIdx < this.planets.length; planetIdx++) {
            const planet = this.planets[planetIdx];
            if (!planet) continue;

            // Skip the sun (check by properties, not index - during reconstruction planets array is modified)
            // Sun is always at (0,0) with no orbit radius
            const isSun = planet.isSun || (planet.pos && Math.abs(planet.pos.x) < 50 && Math.abs(planet.pos.y) < 50);
            if (isSun) continue;

            // CRITICAL: Use planet's stored planetIndex if it exists (for reconstruction)
            // During reconstruction, this.planets = [singlePlanet] so loop index would be 0
            const correctPlanetIndex = planet.planetIndex !== undefined ? planet.planetIndex : planetIdx;

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
            } else if (this.economyType === 'Post Human') {
                // Always spawn at least one research-themed object
                const type = random(['researchArray', 'advancedResearchStation', 'quantumGate']);
                const angle = random(TWO_PI);
                const dist = random(planet.size * 0.25, planet.size * 0.65);
                const x = planet.pos.x + Math.cos(angle) * dist;
                const y = planet.pos.y + Math.sin(angle) * dist;
                try {
                    const obj = new SpaceObject(x, y, type);
                    obj.planetIndex = correctPlanetIndex;
                    this.spaceObjects.push(obj);
                } catch (e) {
                    console.error('Failed to create Post Human SpaceObject', e);
                }
            } else if (this.economyType === 'Offworld') {
                // Always spawn a habitat or comm structure
                const type = random(['habitat', 'commHub', 'outpost']);
                const angle = random(TWO_PI);
                const dist = random(planet.size * 0.3, planet.size * 0.7);
                const x = planet.pos.x + Math.cos(angle) * dist;
                const y = planet.pos.y + Math.sin(angle) * dist;
                try {
                    const obj = new SpaceObject(x, y, type);
                    obj.planetIndex = correctPlanetIndex;
                    this.spaceObjects.push(obj);
                } catch (e) {
                    console.error('Failed to create Offworld SpaceObject', e);
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

        // Spawn 1-3 objects near the jump gate (skip during reconstruction)
        if (!skipJumpZoneObjects && this.jumpZoneCenter) {
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
     * Ensures exactly one FieldRepairTender exists in the system
     * Only spawns if there are damaged space objects or planets needing reconstruction
     */
    spawnRepairTender() {
        // Early return: check if repair tender already exists
        const existingTender = this.enemies.find(e =>
            e.role === AI_ROLE.REPAIR && !e.destroyed
        );
        if (existingTender) return;

        // Early return: check if there's work to do
        if (!this._hasRepairWork()) return;

        // Early return: check if repair ships are available
        if (!REPAIR_SHIPS || REPAIR_SHIPS.length === 0) return;

        // Calculate spawn position
        const spawnPos = this._getRepairTenderSpawnLocation();

        // Spawn the repair tender
        try {
            const shipType = random(REPAIR_SHIPS);
            const repairTender = new Enemy(spawnPos.x, spawnPos.y, this.player, shipType, AI_ROLE.REPAIR);
            repairTender.calculateRadianProperties();
            repairTender.initializeColors();

            this.addEnemy(repairTender);
        } catch (e) {
            console.error('Error spawning repair tender:', e);
        }
    }

    /**
     * Check if the system has any repair work available
     * @returns {boolean} True if damaged objects or reconstruction needed
     * @private
     */
    _hasRepairWork() {
        return this._hasDamagedSpaceObjects() || this._hasPlanetsNeedingReconstruction();
    }

    /**
     * Check if any space objects are damaged
     * @returns {boolean} True if damaged space objects exist
     * @private
     */
    _hasDamagedSpaceObjects() {
        if (!this.spaceObjects) return false;

        return this.spaceObjects.some(obj => {
            if (!obj || obj.destroyed) return false;
            if (typeof obj.health !== 'number' || typeof obj.maxHealth !== 'number') return false;
            if (obj.maxHealth <= 0) return false;
            return obj.health < obj.maxHealth;
        });
    }

    /**
     * Check if any planets need reconstruction
     * @returns {boolean} True if any planets lack space objects
     * @private
     */
    _hasPlanetsNeedingReconstruction() {
        if (!this.planets) return false;

        return this.planets.some((planet, planetIdx) => {
            if (!planet || !planet.pos) return false;
            if (planetIdx === 0) return false; // Skip sun

            // Check if this planet has any alive space objects
            const hasAliveObjects = this.spaceObjects.some(obj => {
                if (!obj || obj.destroyed) return false;
                if (typeof obj.health === 'number' && obj.health <= 0) return false;
                return obj.planetIndex === planetIdx;
            });

            // Planet needs reconstruction if it has no alive space objects
            return !hasAliveObjects;
        });
    }

    /**
     * Calculate spawn location for repair tender
     * Prioritizes station, then player, then random location
     * @returns {{x: number, y: number}} Spawn coordinates
     * @private
     */
    _getRepairTenderSpawnLocation() {
        // Prefer spawning near station
        if (this.station?.pos) {
            const angle = random(TWO_PI);
            const dist = 200 + random(100);
            return {
                x: this.station.pos.x + cos(angle) * dist,
                y: this.station.pos.y + sin(angle) * dist
            };
        }

        // Fall back to near player
        if (this.player?.pos) {
            const angle = random(TWO_PI);
            const dist = this._getDiagonalDistance() + random(500, 1000);
            return {
                x: this.player.pos.x + cos(angle) * dist,
                y: this.player.pos.y + sin(angle) * dist
            };
        }

        // Last resort: random location
        return {
            x: random(-2000, 2000),
            y: random(-2000, 2000)
        };
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
            // Maintain Map for O(1) lookups by ID
            if (enemy.id != null) this.enemiesById.set(enemy.id, enemy);

            // Centralized Thargoid/Alien spawn cue: plays once when aliens are added
            try {
                if (enemy.role === AI_ROLE.ALIEN && typeof soundManager !== 'undefined') {
                    const now = (typeof millis === 'function') ? millis() : Date.now();
                    // 1 second cooldown to avoid spam during multi-spawns
                    if (!this._lastAlienSpawnSoundTime || (now - this._lastAlienSpawnSoundTime) > 1000) {
                        if (enemy.pos && this.player && this.player.pos && typeof soundManager.playWorldSound === 'function') {
                            soundManager.playWorldSound('thargoid', enemy.pos.x, enemy.pos.y, this.player.pos, enemy);
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

// =========================================================================
class AmbientCosmicEvent {
    constructor(type, x, y) {
        this.type = type;
        this.x = x; // world X
        this.y = y; // world Y
        this.startTime = millis();
        this.particles = [];
        this.active = true;
        this.init();
    }

    init() {
        const localLerp = (a, b, t) => a + (b - a) * t;
        switch (this.type) {
            case 'supernova':
                this.duration = 15000;
                // Subtly colored expanding cloud particles
                for (let i = 0; i < 60; i++) {
                    const angle = random(TWO_PI);
                    const speed = random(0.3, 2.5);
                    this.particles.push({
                        vx: cos(angle) * speed,
                        vy: sin(angle) * speed,
                        x: 0,
                        y: 0,
                        size: random(2.0, 7.5),
                        color: random() > 0.6 ? [150, 100, 255] : (random() > 0.4 ? [255, 100, 180] : [100, 180, 255])
                    });
                }
                break;
            case 'comet':
                this.duration = 4500;
                const angle = random(-PI * 0.15, -PI * 0.35);
                this.vx = cos(angle) * 8.5;
                this.vy = sin(angle) * 8.5;
                this.curX = 0;
                this.curY = 0;
                this.color = random() > 0.5 ? [140, 220, 255] : [255, 200, 120];
                break;
            case 'warp_flash':
                this.duration = 3000;
                this.flashAngle = random(TWO_PI);
                break;
            case 'nebula_lightning':
                this.duration = 2500;
                this.color = random() > 0.6 ? [160, 90, 255] : (random() > 0.5 ? [90, 130, 255] : [255, 110, 160]);
                this.lightningRadius = random(200, 380);
                
                // Pre-generate lightning bolt segments for branching electric paths with staggered start timings
                this.bolts = [];
                const boltCount = floor(random(4, 7));
                for (let b = 0; b < boltCount; b++) {
                    const segments = [];
                    let curX = 0;
                    let curY = 0;
                    const boltAngle = random(TWO_PI);
                    const length = random(80, 200);
                    const stepCount = 6;
                    const startDelay = random(0, 1700);
                    const duration = random(150, 300);
                    for (let s = 0; s <= stepCount; s++) {
                        const t = s / stepCount;
                        const bx = cos(boltAngle) * length * t + random(-18, 18);
                        const by = sin(boltAngle) * length * t + random(-18, 18);
                        segments.push({ x: bx, y: by });
                    }
                    this.bolts.push({ segments, startDelay, duration });
                }
                break;
            case 'fleet_skirmish':
                this.duration = 25000;
                this.shots = [];
                this.explosions = [];
                this.shieldFlares = [];
                // Pre-generate silhouettes of ships in background
                this.ships = [];
                const colors = [[35, 35, 45], [45, 45, 55], [25, 30, 40]];
                for (let i = 0; i < 3; i++) {
                    this.ships.push({
                        x: random(-300, 300),
                        y: random(-180, 180),
                        size: random(40, 80),
                        angle: random(TWO_PI),
                        color: colors[i],
                        shieldColor: i % 2 === 0 ? [0, 225, 255] : [255, 40, 150]
                    });
                }
                break;
            case 'space_whale':
                this.duration = 22000;
                this.angle = random(TWO_PI);
                this.speed = 0.40;
                this.vx = cos(this.angle) * this.speed;
                this.vy = sin(this.angle) * this.speed;
                this.size = random(120, 180);
                break;
            case 'black_hole':
                this.duration = 20000;
                this.rotation = 0;
                this.rotSpeed = random(0.006, 0.012);
                this.size = random(60, 95);
                // Orbiting accretion disk particles
                for (let i = 0; i < 60; i++) {
                    const startRadius = random(this.size * 0.6, this.size * 2.5);
                    this.particles.push({
                        r: startRadius,
                        angle: random(TWO_PI),
                        speed: random(0.015, 0.04),
                        size: random(1.2, 3.8),
                        color: random() > 0.6 ? [255, 110, 20] : (random() > 0.4 ? [220, 50, 190] : [255, 220, 80])
                    });
                }
                break;
            case 'solar_flare':
                this.duration = 12000;
                this.angle = random(TWO_PI);
                this.size = random(100, 170);
                // Setup multiple overlapping flare loop paths
                this.flares = [];
                const flareCount = floor(random(2, 4));
                for (let f = 0; f < flareCount; f++) {
                    const path = [];
                    const baseAngle = this.angle + random(-0.6, 0.6);
                    const loopSize = this.size * random(0.6, 1.1);
                    const startDelay = random(0, 4000);
                    for (let i = 0; i <= 15; i++) {
                        path.push({
                            relAngle: (i / 15) * PI,
                            wiggle: random(-6, 6)
                        });
                    }
                    this.flares.push({ path, baseAngle, size: loopSize, startDelay });
                }
                // Ejected solar wind particles
                this.particles = [];
                for (let i = 0; i < 30; i++) {
                    this.particles.push({
                        x: 0,
                        y: 0,
                        vx: 0,
                        vy: 0,
                        size: random(2, 6),
                        startTime: millis() + random(0, 8000),
                        duration: random(1200, 2400)
                    });
                }
                break;
            case 'space_rift':
                this.duration = 11000;
                this.riftAngle = random(-PI * 0.12, PI * 0.12);
                this.size = random(160, 260);
                // Generate a jagged crack path
                this.riftPath = [];
                const steps = 12;
                const angleCos = cos(this.riftAngle);
                const angleSin = sin(this.riftAngle);
                
                for (let i = 0; i <= steps; i++) {
                    const t = i / steps;
                    const baseX = localLerp(-this.size / 2, this.size / 2, t);
                    const baseY = random(-12, 12);
                    this.riftPath.push({
                        x: baseX * angleCos - baseY * angleSin,
                        y: baseX * angleSin + baseY * angleCos
                    });
                }
                // Spark particles emanating from rift
                for (let i = 0; i < 40; i++) {
                    const pAngle = random(TWO_PI);
                    const pSpeed = random(0.6, 3.2);
                    this.particles.push({
                        x: random(-this.size * 0.4, this.size * 0.4),
                        y: random(-6, 6),
                        vx: cos(pAngle) * pSpeed,
                        vy: sin(pAngle) * pSpeed,
                        size: random(1.5, 4.5),
                        startTime: millis() + random(0, 6000),
                        duration: random(800, 1600)
                    });
                }
                break;
            case 'pulsar_beacon':
                this.duration = 24000;
                this.rotation = random(TWO_PI);
                this.rotSpeed = 0.055; // Fast spin for the neutron star sweep
                this.size = random(30, 50);
                break;
            case 'wormhole':
                this.duration = 18000;
                this.rotation = 0;
                this.rotSpeed = 0.014;
                this.size = random(90, 140);
                // Swirling particles spiraling in
                for (let i = 0; i < 75; i++) {
                    this.particles.push({
                        r: random(this.size * 0.35, this.size * 2.6),
                        angle: random(TWO_PI),
                        speed: random(0.015, 0.04),
                        size: random(1.2, 3.8),
                        color: random() > 0.5 ? [0, 240, 220] : (random() > 0.35 ? [150, 70, 255] : [100, 150, 255])
                    });
                }
                break;
            case 'ion_storm':
                this.duration = 9000;
                this.lightningRadius = random(180, 340);
                this.color = random() > 0.5 ? [110, 255, 240] : [140, 220, 255];
                this.bolts = [];
                for (let i = 0; i < floor(random(5, 10)); i++) {
                    const startA = random(TWO_PI);
                    const len = random(70, 160);
                    this.bolts.push({
                        startA,
                        len,
                        startDelay: random(0, 7000),
                        duration: random(220, 420)
                    });
                }
                break;
            case 'crystal_comet':
                this.duration = 6500;
                this.curX = 0;
                this.curY = 0;
                this.vx = random(-4.6, -2.8);
                this.vy = random(1.2, 2.4);
                this.color = [180, 245, 255];
                break;
            case 'quasar_jet':
                this.duration = 14000;
                this.rotation = random(TWO_PI);
                this.rotSpeed = random(0.01, 0.02);
                this.size = random(35, 55);
                this.jetLength = random(500, 760);
                break;
            case 'dark_matter_tide':
                this.duration = 12000;
                this.size = random(110, 180);
                break;
            case 'aurora_wave':
                this.duration = 10000;
                this.size = random(220, 330);
                this.wavePhase = random(TWO_PI);
                this.color = random() > 0.5 ? [80, 255, 180] : [90, 170, 255];
                break;
            case 'stellar_nursery':
                this.duration = 16000;
                this.size = random(170, 250);
                this.clouds = [];
                for (let i = 0; i < 42; i++) {
                    this.clouds.push({
                        x: random(-this.size, this.size),
                        y: random(-this.size * 0.55, this.size * 0.55),
                        vx: random(-0.18, 0.18),
                        vy: random(-0.12, 0.12),
                        size: random(14, 42),
                        color: random() > 0.5 ? [255, 110, 210] : [120, 160, 255]
                    });
                }
                break;
            case 'graviton_lens':
                this.duration = 13000;
                this.rotation = random(TWO_PI);
                this.rotSpeed = random(0.007, 0.013);
                this.size = random(80, 130);
                break;
            case 'temporal_echo':
                this.duration = 10500;
                this.echoes = [];
                this.lastEchoTime = millis();
                this.color = random() > 0.5 ? [255, 220, 130] : [170, 210, 255];
                break;
            case 'plasma_rain':
                this.duration = 11000;
                this.size = random(180, 280);
                this.particles = [];
                for (let i = 0; i < 45; i++) {
                    this.particles.push({
                        x: random(-this.size, this.size),
                        y: random(-this.size * 0.65, this.size * 0.65),
                        len: random(18, 42),
                        speed: random(1.6, 3.4),
                        alpha: random(110, 220)
                    });
                }
                break;
            case 'void_bloom':
                this.duration = 12500;
                this.rotation = random(TWO_PI);
                this.rotSpeed = random(0.005, 0.011);
                this.size = random(95, 150);
                break;
        }
    }

    update(playerVelX, playerVelY) {
        const elapsed = millis() - this.startTime;
        if (elapsed >= this.duration) {
            this.active = false;
            return;
        }

        const parallax = 1.03;
        this.x -= playerVelX * (1 - parallax);
        this.y -= playerVelY * (1 - parallax);

        const t = elapsed / this.duration;
        const now = millis();

        switch (this.type) {
            case 'supernova':
                for (let p of this.particles) {
                    p.x += p.vx;
                    p.y += p.vy;
                    p.vx *= 0.985;
                    p.vy *= 0.985;
                }
                break;
            case 'comet':
                this.curX += this.vx;
                this.curY += this.vy;
                if (random() < 0.6) {
                    this.particles.push({
                        x: this.curX,
                        y: this.curY,
                        vx: -this.vx * 0.22 + random(-0.8, 0.8),
                        vy: -this.vy * 0.22 + random(-0.8, 0.8),
                        size: random(1.2, 4.0),
                        startTime: now,
                        duration: random(600, 1100)
                    });
                }
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (now - p.startTime > p.duration) {
                        this.particles.splice(i, 1);
                    }
                }
                break;
            case 'fleet_skirmish':
                // Continuous trading of fire between the silhouettes
                if (random() < 0.20 && elapsed < this.duration - 2000) {
                    const sIndex = floor(random(this.ships.length));
                    const s1 = this.ships[sIndex];
                    let s2 = this.ships[(sIndex + 1) % this.ships.length];
                    if (this.ships.length > 2 && random() > 0.5) {
                        s2 = this.ships[(sIndex + 2) % this.ships.length];
                    }
                    
                    const sx = s1.x + random(-10, 10);
                    const sy = s1.y + random(-10, 10);
                    const ex = s2.x + random(-15, 15);
                    const ey = s2.y + random(-15, 15);
                    
                    this.shots.push({
                        sx, sy, ex, ey,
                        color: random() > 0.5 ? [255, 60, 60] : [60, 255, 120],
                        startTime: now,
                        duration: random(150, 280),
                        flared: false,
                        targetShip: s2
                    });
                }
                
                // Update shots
                for (let i = this.shots.length - 1; i >= 0; i--) {
                    const s = this.shots[i];
                    const shotElapsed = now - s.startTime;
                    if (shotElapsed > s.duration) {
                        this.shots.splice(i, 1);
                    } else if (shotElapsed > s.duration * 0.88 && !s.flared) {
                        s.flared = true;
                        // Trigger shield flaring shield arc
                        this.shieldFlares.push({
                            x: s.ex,
                            y: s.ey,
                            ship: s.targetShip,
                            color: s.targetShip.shieldColor,
                            startTime: now,
                            duration: random(250, 450)
                        });
                        // Trigger tiny ship hull explosion
                        if (random() < 0.42) {
                            this.explosions.push({
                                x: s.ex + random(-8, 8),
                                y: s.ey + random(-8, 8),
                                startTime: now,
                                duration: random(500, 1000),
                                maxSize: random(7, 18)
                            });
                        }
                    }
                }
                
                // Update shield flares
                for (let i = this.shieldFlares.length - 1; i >= 0; i--) {
                    const sf = this.shieldFlares[i];
                    if (now - sf.startTime > sf.duration) {
                        this.shieldFlares.splice(i, 1);
                    }
                }
                
                // Update explosions
                for (let i = this.explosions.length - 1; i >= 0; i--) {
                    const exp = this.explosions[i];
                    if (now - exp.startTime > exp.duration) {
                        this.explosions.splice(i, 1);
                    }
                }
                break;
            case 'space_whale':
                this.x += this.vx;
                this.y += this.vy;
                // Emit trailing bioluminescent dust particles
                if (random() < 0.25) {
                    const backX = -cos(this.angle) * (this.size * 0.45) + random(-15, 15);
                    const backY = -sin(this.angle) * (this.size * 0.45) + random(-15, 15);
                    this.particles.push({
                        x: backX,
                        y: backY,
                        vx: -cos(this.angle) * 0.4 + random(-0.2, 0.2),
                        vy: -sin(this.angle) * 0.4 + random(-0.2, 0.2),
                        size: random(1.5, 4.0),
                        startTime: now,
                        duration: random(1000, 2000)
                    });
                }
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (now - p.startTime > p.duration) {
                        this.particles.splice(i, 1);
                    }
                }
                break;
            case 'black_hole':
                this.rotation += this.rotSpeed;
                // Spiral accretion particles inward
                for (let p of this.particles) {
                    p.angle += p.speed;
                    p.r -= 0.16 * (this.size / p.r); // Pull faster closer to horizon
                    if (p.r < this.size * 0.25) {
                        p.r = random(this.size * 0.8, this.size * 2.5);
                        p.angle = random(TWO_PI);
                    }
                }
                break;
            case 'solar_flare':
                this.rotation = (this.rotation || 0) + 0.003;
                // Manage solar flare wind particles
                const flareNow = millis();
                for (let p of this.particles) {
                    if (flareNow > p.startTime) {
                        const pElapsed = flareNow - p.startTime;
                        const pt = pElapsed / p.duration;
                        if (pt >= 1.0) {
                            p.startTime = flareNow + random(500, 2500);
                            p.x = 0;
                            p.y = 0;
                            const pAngle = this.angle + random(-0.6, 0.6);
                            const pSpeed = random(1.8, 4.0);
                            p.vx = cos(pAngle) * pSpeed;
                            p.vy = sin(pAngle) * pSpeed;
                        } else {
                            p.x += p.vx;
                            p.y += p.vy;
                            p.vx += sin(pElapsed * 0.01) * 0.06;
                        }
                    }
                }
                break;
            case 'space_rift':
                const riftNow = millis();
                for (let p of this.particles) {
                    if (riftNow > p.startTime) {
                        const pElapsed = riftNow - p.startTime;
                        const pt = pElapsed / p.duration;
                        if (pt >= 1.0) {
                            p.startTime = riftNow + random(500, 3000);
                            p.x = random(-this.size * 0.4, this.size * 0.4);
                            p.y = random(-6, 6);
                            const pAngle = random(TWO_PI);
                            const pSpeed = random(0.8, 3.2);
                            p.vx = cos(pAngle) * pSpeed;
                            p.vy = sin(pAngle) * pSpeed;
                        } else {
                            p.x += p.vx;
                            p.y += p.vy;
                            p.vx *= 0.97;
                            p.vy *= 0.97;
                        }
                    }
                }
                break;
            case 'pulsar_beacon':
                this.rotation += this.rotSpeed;
                break;
            case 'wormhole':
                this.rotation += this.rotSpeed;
                // Spiral wormhole particles inward
                for (let p of this.particles) {
                    p.angle += p.speed;
                    p.r -= 0.18;
                    if (p.r < this.size * 0.22) {
                        p.r = random(this.size * 0.8, this.size * 2.6);
                        p.angle = random(TWO_PI);
                    }
                }
                break;
            case 'ion_storm':
                if (this.bolts) {
                    for (let bolt of this.bolts) {
                        if (elapsed > bolt.startDelay + bolt.duration) {
                            bolt.startDelay = elapsed + random(80, 900);
                            bolt.duration = random(180, 380);
                            bolt.startA = random(TWO_PI);
                            bolt.len = random(70, 160);
                        }
                    }
                }
                break;
            case 'crystal_comet':
                this.curX += this.vx;
                this.curY += this.vy;
                if (random() < 0.7) {
                    this.particles.push({
                        x: this.curX,
                        y: this.curY,
                        vx: -this.vx * 0.28 + random(-0.7, 0.7),
                        vy: -this.vy * 0.28 + random(-0.7, 0.7),
                        size: random(1.2, 3.2),
                        startTime: now,
                        duration: random(700, 1300)
                    });
                }
                for (let i = this.particles.length - 1; i >= 0; i--) {
                    const p = this.particles[i];
                    p.x += p.vx;
                    p.y += p.vy;
                    if (now - p.startTime > p.duration) {
                        this.particles.splice(i, 1);
                    }
                }
                break;
            case 'quasar_jet':
                this.rotation += this.rotSpeed;
                break;
            case 'dark_matter_tide':
                break;
            case 'aurora_wave':
                this.wavePhase += 0.02;
                break;
            case 'stellar_nursery':
                for (let c of this.clouds) {
                    c.x += c.vx;
                    c.y += c.vy;
                    if (c.x > this.size || c.x < -this.size) c.vx *= -1;
                    if (c.y > this.size * 0.55 || c.y < -this.size * 0.55) c.vy *= -1;
                }
                break;
            case 'graviton_lens':
                this.rotation += this.rotSpeed;
                break;
            case 'temporal_echo':
                if (now - this.lastEchoTime > 260) {
                    this.echoes.push({
                        radius: 8,
                        createdAt: now
                    });
                    this.lastEchoTime = now;
                }
                for (let i = this.echoes.length - 1; i >= 0; i--) {
                    const e = this.echoes[i];
                    e.radius += 1.7;
                    if (now - e.createdAt > 1800) this.echoes.splice(i, 1);
                }
                break;
            case 'plasma_rain':
                for (let p of this.particles) {
                    p.y += p.speed;
                    p.x += sin(now * 0.003 + p.y * 0.02) * 0.25;
                    if (p.y > this.size * 0.65) {
                        p.y = -this.size * 0.65;
                        p.x = random(-this.size, this.size);
                    }
                }
                break;
            case 'void_bloom':
                this.rotation += this.rotSpeed;
                break;
        }
    }

    draw() {
        const elapsed = millis() - this.startTime;
        const t = elapsed / this.duration;
        const localLerp = (a, b, t) => a + (b - a) * t;
        const now = millis();

        push();
        translate(this.x, this.y);
        blendMode(ADD);

        switch (this.type) {
            case 'supernova': {
                const coreAlpha = t < 0.1 ? localLerp(0, 75, t / 0.1) : localLerp(75, 0, (t - 0.1) / 0.9);
                const shockwaveSize = localLerp(10, 420, t);
                const ringAlpha = t < 0.12 ? localLerp(0, 45, t / 0.12) : localLerp(45, 0, (t - 0.12) / 0.88);

                // Phase 1 Core Flare charging up
                if (t < 0.45) {
                    const flareSize = localLerp(8, 85, t / 0.45) * (1.0 + 0.1 * sin(now * 0.05));
                    noStroke();
                    fill(255, 255, 255, coreAlpha);
                    circle(0, 0, flareSize * 0.85);
                    
                    const ctx = drawingContext;
                    const grad = ctx.createRadialGradient(0, 0, 1, 0, 0, flareSize * 2.8);
                    grad.addColorStop(0, `rgba(255, 200, 255, ${coreAlpha * 0.75 / 255})`);
                    grad.addColorStop(0.35, `rgba(200, 110, 255, ${coreAlpha * 0.4 / 255})`);
                    grad.addColorStop(1, 'rgba(100, 150, 255, 0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.arc(0, 0, flareSize * 2.8, 0, TWO_PI);
                    ctx.fill();
                }

                // Phase 2 & 3 Expansive multi-layered shockwave rings
                if (t > 0.02) {
                    noFill();
                    // Layer 1: Outermost Cyan ring
                    strokeWeight(1.5);
                    stroke(120, 220, 255, ringAlpha);
                    circle(0, 0, shockwaveSize);
                    
                    // Layer 2: Main Orange shockwave
                    strokeWeight(3.0);
                    stroke(255, 140, 60, ringAlpha * 0.85);
                    circle(0, 0, shockwaveSize * 0.84);

                    // Layer 3: Inner Purple gas bubble ring
                    strokeWeight(1.0);
                    stroke(190, 90, 255, ringAlpha * 0.5);
                    circle(0, 0, shockwaveSize * 1.12);
                }

                noStroke();
                for (let p of this.particles) {
                    fill(p.color[0], p.color[1], p.color[2], ringAlpha * 2.2);
                    circle(p.x, p.y, p.size * (1.2 - t * 0.5));
                }

                // Smooth Screen flash trigger at explosion frame
                if (t >= 0.18 && t < 0.35 && typeof LightingEffects !== 'undefined' && typeof LightingEffects.addScreenFlash === 'function') {
                    const flashVal = Math.floor(localLerp(0, 8, (t - 0.18) / 0.05) * (t < 0.23 ? 1 : localLerp(1, 0, (t - 0.23) / 0.12)));
                    if (flashVal > 0) {
                        LightingEffects.addScreenFlash([245, 235, 255], flashVal);
                    }
                }
                break;
            }
            case 'comet': {
                const headSize = localLerp(6.5, 2.0, t);
                const alpha = localLerp(200, 0, t);

                noStroke();
                // Draw trailing sparkle dust particles
                for (let p of this.particles) {
                    const pElapsed = now - p.startTime;
                    const pT = pElapsed / p.duration;
                    const pAlpha = localLerp(alpha * 0.55, 0, pT);
                    fill(this.color[0], this.color[1] * 0.85, this.color[2] * 0.65, pAlpha);
                    circle(p.x, p.y, p.size * (1 - pT * 0.8));
                }

                const ctx = drawingContext;
                // Tail 1: Curved golden-orange dust tail
                const gradDust = ctx.createLinearGradient(this.curX, this.curY, this.curX - this.vx * 5.0, this.curY - this.vy * 5.0 + 18);
                gradDust.addColorStop(0, `rgba(${this.color[0]}, ${this.color[1] * 0.9}, ${this.color[2] * 0.6}, ${alpha * 0.32 / 255})`);
                gradDust.addColorStop(1, 'rgba(255, 150, 50, 0)');
                ctx.strokeStyle = gradDust;
                ctx.lineWidth = headSize * 1.8;
                ctx.beginPath();
                ctx.moveTo(this.curX, this.curY);
                ctx.quadraticCurveTo(
                    this.curX - this.vx * 2.5, this.curY - this.vy * 2.5 + 10,
                    this.curX - this.vx * 5.0, this.curY - this.vy * 5.0 + 18
                );
                ctx.stroke();

                // Tail 2: Straight blue-white ion tail
                const gradIon = ctx.createLinearGradient(this.curX, this.curY, this.curX - this.vx * 6.2, this.curY - this.vy * 6.2);
                gradIon.addColorStop(0, `rgba(100, 210, 255, ${alpha * 0.5 / 255})`);
                gradIon.addColorStop(1, 'rgba(40, 80, 255, 0)');
                ctx.strokeStyle = gradIon;
                ctx.lineWidth = headSize * 1.0;
                ctx.beginPath();
                ctx.moveTo(this.curX, this.curY);
                ctx.lineTo(this.curX - this.vx * 6.2, this.curY - this.vy * 6.2);
                ctx.stroke();

                // Tail 3: Ultra-fine sodium tail (violet)
                const gradSodium = ctx.createLinearGradient(this.curX, this.curY, this.curX - this.vx * 4.0, this.curY - this.vy * 4.0 - 10);
                gradSodium.addColorStop(0, `rgba(180, 100, 255, ${alpha * 0.2 / 255})`);
                gradSodium.addColorStop(1, 'rgba(150, 50, 220, 0)');
                ctx.strokeStyle = gradSodium;
                ctx.lineWidth = headSize * 0.6;
                ctx.beginPath();
                ctx.moveTo(this.curX, this.curY);
                ctx.lineTo(this.curX - this.vx * 4.0, this.curY - this.vy * 4.0 - 10);
                ctx.stroke();

                // Nucleus head with slight transparency & coma envelope
                noStroke();
                fill(255, 255, 255, alpha * 0.9);
                circle(this.curX, this.curY, headSize);
                fill(this.color[0], this.color[1], this.color[2], alpha * 0.35);
                circle(this.curX, this.curY, headSize * 2.5);
                break;
            }
            case 'warp_flash': {
                const flashAlpha = t < 0.2 ? localLerp(0, 255, t / 0.2) : localLerp(255, 0, (t - 0.2) / 0.8);
                
                // Phase 1: Spacetime compression lines inward
                if (t < 0.5) {
                    stroke(130, 210, 255, flashAlpha * 0.5);
                    strokeWeight(1.0);
                    const compressionRadius = localLerp(80, 5, t / 0.5);
                    for (let i = 0; i < 12; i++) {
                        const ang = i * (TWO_PI / 12) + t * 2;
                        line(
                            cos(ang) * compressionRadius, sin(ang) * compressionRadius,
                            cos(ang) * (compressionRadius + 16), sin(ang) * (compressionRadius + 16)
                        );
                    }
                }

                // Phase 2: Charging flash contraction
                if (t < 0.35) {
                    const contract = localLerp(30, 2, t / 0.35);
                    noFill();
                    stroke(130, 210, 255, flashAlpha * 0.8);
                    strokeWeight(1.5);
                    circle(0, 0, contract);
                    stroke(100, 160, 255, flashAlpha * 0.4);
                    strokeWeight(3.0);
                    circle(0, 0, contract * 1.5);
                } else {
                    // Phase 3: Streaking forward & expansion Cherenkov rings
                    const warpT = (t - 0.35) / 0.65;
                    const streakAlpha = localLerp(220, 0, warpT);
                    const len = localLerp(8, 200, warpT) * (warpT < 0.38 ? 1.0 : localLerp(1.0, 0.05, (warpT - 0.38) / 0.62));
                    
                    // Main streak vector
                    stroke(180, 240, 255, streakAlpha);
                    strokeWeight(3.0);
                    line(
                        -cos(this.flashAngle) * (len * 0.5), -sin(this.flashAngle) * (len * 0.5),
                        cos(this.flashAngle) * (len * 0.5), sin(this.flashAngle) * (len * 0.5)
                    );
                    
                    // Side warp distortion lines
                    stroke(110, 170, 255, streakAlpha * 0.55);
                    strokeWeight(1.0);
                    line(
                        -cos(this.flashAngle + HALF_PI) * (len * 0.16), -sin(this.flashAngle + HALF_PI) * (len * 0.16),
                        cos(this.flashAngle + HALF_PI) * (len * 0.16), sin(this.flashAngle + HALF_PI) * (len * 0.16)
                    );

                    // Expanding circular space distortion rings
                    noFill();
                    stroke(100, 200, 255, streakAlpha * 0.6);
                    strokeWeight(1.5);
                    circle(0, 0, localLerp(4, 70, warpT));
                    stroke(150, 90, 255, streakAlpha * 0.3);
                    circle(0, 0, localLerp(4, 110, warpT));
                }
                break;
            }
            case 'nebula_lightning': {
                let pulseAlpha = 0;
                const subCycle = elapsed % 300;
                pulseAlpha = Math.sin((subCycle / 300) * PI) * 160 * (1 - t * 0.6);
                
                // Draw massive ambient glow cloud matching flash
                const ctx = drawingContext;
                const grad = ctx.createRadialGradient(0, 0, 10, 0, 0, this.lightningRadius);
                const r = this.color[0], g = this.color[1], b = this.color[2];
                grad.addColorStop(0, `rgba(${r},${g},${b},${pulseAlpha / 255 * 0.85})`);
                grad.addColorStop(0.5, `rgba(${r},${g},${b},${pulseAlpha * 0.4 / 255})`);
                grad.addColorStop(1, `rgba(${r},${g},${b},0)`);
                ctx.fillStyle = grad;
                ctx.beginPath();
                ctx.arc(0, 0, this.lightningRadius, 0, TWO_PI);
                ctx.fill();

                // Staggered sequential lightning strikes
                if (pulseAlpha > 45 && this.bolts) {
                    for (let bolt of this.bolts) {
                        const boltElapsed = elapsed;
                        if (boltElapsed > bolt.startDelay && boltElapsed < bolt.startDelay + bolt.duration) {
                            const boltT = (boltElapsed - bolt.startDelay) / bolt.duration;
                            const boltAlpha = Math.sin(boltT * PI) * 240;
                            stroke(255, 235, 255, boltAlpha);
                            strokeWeight(random(1.0, 3.2));
                            noFill();
                            beginShape();
                            for (let pt of bolt.segments) {
                                vertex(pt.x, pt.y);
                            }
                            endShape();

                            // Minor neon electrical halo around main bolt
                            stroke(r, g, b, boltAlpha * 0.45);
                            strokeWeight(5.0);
                            beginShape();
                            for (let pt of bolt.segments) {
                                vertex(pt.x + random(-2, 2), pt.y + random(-2, 2));
                            }
                            endShape();
                        }
                    }
                }
                break;
            }
            case 'fleet_skirmish': {
                const skirmishAlpha = t < 0.08 ? map(t, 0, 0.08, 0, 1) : (t > 0.9 ? map(t, 0.9, 1.0, 1, 0) : 1);
                
                // Draw background capital ships (subtle dark silhouettes)
                for (let s of this.ships) {
                    push();
                    translate(s.x, s.y);
                    rotate(s.angle);
                    fill(s.color[0], s.color[1], s.color[2], 120 * skirmishAlpha);
                    noStroke();
                    
                    // Wedge-shaped cruiser hull shape
                    beginShape();
                    vertex(s.size * 0.5, 0);
                    vertex(-s.size * 0.4, -s.size * 0.3);
                    vertex(-s.size * 0.28, -s.size * 0.08);
                    vertex(-s.size * 0.28, s.size * 0.08);
                    vertex(-s.size * 0.4, s.size * 0.3);
                    endShape(CLOSE);
                    
                    // Glowing engines
                    fill(255, 90, 30, 175 * skirmishAlpha);
                    circle(-s.size * 0.35, -s.size * 0.08, 3.5);
                    circle(-s.size * 0.35, s.size * 0.08, 3.5);
                    pop();
                }

                // Draw active beams
                for (let s of this.shots) {
                    const shotElapsed = now - s.startTime;
                    const shotT = shotElapsed / s.duration;
                    const alpha = localLerp(255, 0, shotT);
                    stroke(s.color[0], s.color[1], s.color[2], alpha * 0.75 * skirmishAlpha);
                    strokeWeight(1.5);
                    const lx = localLerp(s.sx, s.ex, shotT);
                    const ly = localLerp(s.sy, s.ey, shotT);
                    line(lx, ly, lx + (s.ex - s.sx) * 0.3, ly + (s.ey - s.sy) * 0.3);
                }

                // Draw shield flaring rings on hit
                for (let f of this.shieldFlares) {
                    const flareElapsed = now - f.startTime;
                    const flareT = flareElapsed / f.duration;
                    const fAlpha = map(flareT, 0, 1, 150, 0);
                    if (fAlpha > 0) {
                        push();
                        translate(f.ship.x, f.ship.y);
                        noFill();
                        stroke(f.color[0], f.color[1], f.color[2], fAlpha * skirmishAlpha);
                        strokeWeight(2.0);
                        // Arc indicating direction of shield flare
                        const angle = atan2(f.y - f.ship.y, f.x - f.ship.x);
                        arc(0, 0, f.ship.size * 1.15, f.ship.size * 1.15, angle - PI/3, angle + PI/3);
                        pop();
                    }
                }

                // Draw hull breaches (explosions)
                noStroke();
                for (let exp of this.explosions) {
                    const expElapsed = now - exp.startTime;
                    const expT = expElapsed / exp.duration;
                    const sz = localLerp(1.5, exp.maxSize, expT);
                    const alpha = localLerp(185, 0, expT);
                    fill(255, 205, 90, alpha * skirmishAlpha);
                    circle(exp.x, exp.y, sz);
                    fill(255, 90, 30, alpha * 0.6 * skirmishAlpha);
                    circle(exp.x, exp.y, sz * 1.7);
                }
                break;
            }
            case 'space_whale': {
                const whaleAlpha = Math.sin(t * PI) * 75;
                noStroke();
                fill(80, 185, 255, whaleAlpha);
                
                // Draw whale trailing bioluminescent particles
                for (let p of this.particles) {
                    const pElapsed = now - p.startTime;
                    const pT = pElapsed / p.duration;
                    const pAlpha = localLerp(whaleAlpha * 0.9, 0, pT);
                    fill(120, 220, 255, pAlpha);
                    circle(p.x, p.y, p.size * (1 - pT * 0.7));
                }

                fill(80, 185, 255, whaleAlpha);
                push();
                rotate(this.angle);
                
                const tailWiggle = sin(elapsed * 0.0035) * (this.size * 0.06);

                // Cinematic curved organic whale body
                beginShape();
                vertex(-this.size * 0.5, tailWiggle);
                bezierVertex(-this.size * 0.25, -this.size * 0.32, this.size * 0.2, -this.size * 0.28, this.size * 0.5, 0);
                bezierVertex(this.size * 0.32, this.size * 0.24, -this.size * 0.15, this.size * 0.22, -this.size * 0.5, tailWiggle);
                endShape(CLOSE);

                // Side glowing wings / fins waving
                fill(110, 225, 255, whaleAlpha * 1.3);
                beginShape();
                vertex(-this.size * 0.03, -this.size * 0.08);
                bezierVertex(this.size * 0.08, -this.size * 0.38, this.size * 0.20, -this.size * 0.36, this.size * 0.04, -this.size * 0.06);
                endShape(CLOSE);
                
                beginShape();
                vertex(-this.size * 0.03, this.size * 0.08);
                bezierVertex(this.size * 0.08, this.size * 0.38, this.size * 0.20, this.size * 0.36, this.size * 0.04, this.size * 0.06);
                endShape(CLOSE);

                // Glowing spots that throb in waves
                fill(255, 255, 255, whaleAlpha * 1.85 * (0.65 + 0.35 * sin(elapsed * 0.0045)));
                for (let k = 0; k < 6; k++) {
                    const spotX = localLerp(-this.size * 0.2, this.size * 0.28, k / 5);
                    const spotY = sin(k * 1.3 + elapsed * 0.003) * (this.size * 0.03) + (k < 3 ? tailWiggle * 0.45 : 0);
                    circle(spotX, spotY, 2.5);
                }
                pop();
                break;
            }
            case 'black_hole': {
                const size = this.size;
                const alpha = Math.sin(t * PI) * 205;
                if (alpha <= 0) break;

                push();
                rotate(this.rotation);

                // Layered Accretion Disk (Drawn behind event horizon core first)
                noFill();
                stroke(140, 90, 255, alpha * 0.22);
                strokeWeight(4.5);
                circle(0, 0, size * 2.2);
                
                stroke(100, 210, 255, alpha * 0.3);
                strokeWeight(1.5);
                circle(0, 0, size * 1.85);

                const segments = 4;
                for (let i = 0; i < segments; i++) {
                    const arcStart = i * HALF_PI + sin(elapsed * 0.001) * 0.6;
                    stroke(255, 255, 255, alpha * 0.42);
                    strokeWeight(1.5);
                    arc(0, 0, size * 1.55, size * 1.55, arcStart, arcStart + (38 * PI / 180));
                }

                // Einstein Ring of light right around the horizon
                stroke(255, 235, 170, alpha * 0.95);
                strokeWeight(2.5);
                circle(0, 0, size * 0.65);

                // Gravitational lensing bent gas arcs (over the top of core)
                stroke(255, 95, 20, alpha * 0.75);
                strokeWeight(size * 0.22);
                arc(0, -size * 0.08, size * 1.2, size * 0.6, PI + (15 * PI / 180), TWO_PI - (15 * PI / 180));
                
                stroke(230, 45, 180, alpha * 0.42);
                strokeWeight(size * 0.1);
                arc(0, -size * 0.08, size * 1.55, size * 0.8, PI + (15 * PI / 180), TWO_PI - (15 * PI / 180));

                // Clean, pitch black event horizon core
                blendMode(BLEND);
                fill(0, 0, 0, alpha);
                noStroke();
                circle(0, 0, size * 0.58);
                
                // Accretion Disk (Foreground part passing in front of core)
                blendMode(ADD);
                stroke(255, 125, 20, alpha * 0.98);
                strokeWeight(size * 0.2);
                arc(0, size * 0.05, size * 1.3, size * 0.44, -(15 * PI / 180), PI + (15 * PI / 180));

                stroke(255, 255, 240, alpha * 0.9);
                strokeWeight(2.0);
                arc(0, size * 0.05, size * 1.3, size * 0.44, (5 * PI / 180), PI - (5 * PI / 180));

                // Draw spiraling accretion disk dust particles
                noStroke();
                for (let p of this.particles) {
                    const px = cos(p.angle) * p.r;
                    const py = sin(p.angle) * p.r * 0.45;
                    const pAlpha = map(p.r, size * 0.5, size * 2.5, alpha * 0.85, alpha * 0.18);
                    fill(p.color[0], p.color[1], p.color[2], pAlpha);
                    circle(px, py, p.size * (1.25 - (p.r / (size * 2.5)) * 0.55));
                }

                pop();
                break;
            }
            case 'solar_flare': {
                const alpha = Math.sin(t * PI) * 155;
                if (alpha <= 0) break;
                
                noFill();
                push();
                
                // Draw multiple overlapping loop structures
                for (let f of this.flares) {
                    if (elapsed > f.startDelay) {
                        const fElapsed = elapsed - f.startDelay;
                        const flareSize = localLerp(12, f.size, Math.min(1.0, fElapsed / 4000));
                        const flareAlpha = alpha * (1.0 - Math.min(1.0, fElapsed / this.duration));
                        
                        rotate(f.baseAngle);
                        
                        // Primary loop
                        stroke(255, 110, 15, flareAlpha);
                        strokeWeight(3.5 * (1 - t * 0.45) + 0.6);
                        beginShape();
                        for (let i = 0; i < f.path.length; i++) {
                            const fp = f.path[i];
                            const loopAngle = fp.relAngle;
                            const r = flareSize * 0.52 * sin(loopAngle);
                            const lx = cos(loopAngle) * flareSize * 0.52 + fp.wiggle * sin(now * 0.005 + i);
                            const ly = -sin(loopAngle) * r;
                            vertex(lx, ly);
                        }
                        endShape();
                        
                        // Inner bright core loop
                        stroke(255, 235, 120, flareAlpha * 1.3);
                        strokeWeight(1.2);
                        beginShape();
                        for (let i = 0; i < f.path.length; i++) {
                            const fp = f.path[i];
                            const loopAngle = fp.relAngle;
                            const r = flareSize * 0.46 * sin(loopAngle);
                            const lx = cos(loopAngle) * flareSize * 0.46 + fp.wiggle * 0.6 * sin(now * 0.0055 + i);
                            const ly = -sin(loopAngle) * r;
                            vertex(lx, ly);
                        }
                        endShape();
                    }
                }
                pop();

                // Draw ejected solar wind particles
                noStroke();
                for (let p of this.particles) {
                    if (now > p.startTime) {
                        const pElapsed = now - p.startTime;
                        const pT = pElapsed / p.duration;
                        const pAlpha = map(pT, 0, 1, alpha * 0.85, 0);
                        if (pAlpha > 0) {
                            fill(255, 130, 25, pAlpha);
                            circle(p.x, p.y, p.size * (1.2 - pT * 0.55));
                            fill(255, 220, 80, pAlpha * 0.5);
                            circle(p.x, p.y, p.size * (1.85 - pT * 0.8));
                        }
                    }
                }
                break;
            }
            case 'space_rift': {
                const riftAlpha = t < 0.15 ? map(t, 0, 0.15, 0, 230) : (t > 0.85 ? map(t, 0.85, 1, 230, 0) : 230);
                if (riftAlpha <= 0) break;

                const openWidth = t < 0.25 ? map(t, 0, 0.25, 0.2, 10.0) : (t > 0.80 ? map(t, 0.80, 1, 10.0, 0.0) : 10.0);
                
                // Deep dark purple rift void fill
                if (openWidth > 1.0 && this.riftPath) {
                    noStroke();
                    fill(120, 40, 230, riftAlpha * 0.22);
                    beginShape();
                    for (let pt of this.riftPath) {
                        vertex(pt.x, pt.y - openWidth * 0.5);
                    }
                    for (let i = this.riftPath.length - 1; i >= 0; i--) {
                        const pt = this.riftPath[i];
                        vertex(pt.x, pt.y + openWidth * 0.5);
                    }
                    endShape(CLOSE);
                }

                // Electric neon rift boundaries
                noFill();
                stroke(255, 50, 210, riftAlpha * 0.75);
                strokeWeight(2.0);
                beginShape();
                for (let pt of this.riftPath) {
                    vertex(pt.x, pt.y - openWidth * 0.5);
                }
                endShape();
                beginShape();
                for (let pt of this.riftPath) {
                    vertex(pt.x, pt.y + openWidth * 0.5);
                }
                endShape();

                // Core electric filament lines
                stroke(100, 240, 255, riftAlpha * 0.85);
                strokeWeight(1.0);
                beginShape();
                for (let pt of this.riftPath) {
                    vertex(pt.x, pt.y + random(-1, 1));
                }
                endShape();

                // Rift particles
                noStroke();
                for (let p of this.particles) {
                    if (now > p.startTime) {
                        const pElapsed = now - p.startTime;
                        const pT = pElapsed / p.duration;
                        const pAlpha = map(pT, 0, 1, riftAlpha * 0.8, 0);
                        if (pAlpha > 0) {
                            fill(255, 100, 230, pAlpha);
                            circle(p.x, p.y, p.size * (1 - pT * 0.5));
                        }
                    }
                }
                break;
            }
            case 'pulsar_beacon': {
                const pulsarAlpha = Math.sin(t * PI) * 200;
                if (pulsarAlpha <= 0) break;

                const flashFreq = 0.055;
                const corePulse = sin(elapsed * flashFreq) * 0.28 + 1.0;
                const size = this.size;

                push();
                rotate(this.rotation);
                
                const beamLength = 650;
                const beamWidth = 85 + sin(now * 0.035) * 16;
                
                const ctx = drawingContext;
                
                // Cones of light at poles
                const gradRight = ctx.createLinearGradient(0, 0, beamLength, 0);
                gradRight.addColorStop(0, `rgba(100, 200, 255, ${pulsarAlpha / 255 * 0.8})`);
                gradRight.addColorStop(0.38, `rgba(160, 95, 255, ${pulsarAlpha / 255 * 0.4})`);
                gradRight.addColorStop(1, 'rgba(230, 80, 255, 0)');
                
                ctx.fillStyle = gradRight;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(beamLength, -beamWidth * 0.5);
                ctx.lineTo(beamLength, beamWidth * 0.5);
                ctx.closePath();
                ctx.fill();

                const gradLeft = ctx.createLinearGradient(0, 0, -beamLength, 0);
                gradLeft.addColorStop(0, `rgba(100, 200, 255, ${pulsarAlpha / 255 * 0.8})`);
                gradLeft.addColorStop(0.38, `rgba(160, 95, 255, ${pulsarAlpha / 255 * 0.4})`);
                gradLeft.addColorStop(1, 'rgba(230, 80, 255, 0)');
                
                ctx.fillStyle = gradLeft;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-beamLength, -beamWidth * 0.5);
                ctx.lineTo(-beamLength, beamWidth * 0.5);
                ctx.closePath();
                ctx.fill();
                
                // Pulsar accretion ring (ellipse around core)
                noFill();
                stroke(255, 255, 255, pulsarAlpha * 0.7);
                strokeWeight(1.8);
                ellipse(0, 0, size * 1.9, size * 0.5);
                pop();

                noStroke();
                // Layered core glow
                fill(80, 140, 255, pulsarAlpha * 0.3);
                circle(0, 0, size * 3.0 * corePulse);
                fill(120, 215, 255, pulsarAlpha * 0.6);
                circle(0, 0, size * 1.6 * corePulse);
                fill(255, 255, 255, pulsarAlpha);
                circle(0, 0, size * 0.7 * corePulse);
                break;
            }
            case 'wormhole': {
                const whAlpha = Math.sin(t * PI) * 190;
                if (whAlpha <= 0) break;

                const size = this.size;
                
                push();
                rotate(this.rotation);
                noFill();
                
                // Outer ring
                stroke(0, 255, 230, whAlpha * 0.7);
                strokeWeight(2.0);
                ellipse(0, 0, size * 1.65, size * 0.65);

                // Middle ring rotated
                rotate(PI * 0.22);
                stroke(150, 70, 255, whAlpha * 0.6);
                strokeWeight(1.5);
                ellipse(0, 0, size * 1.95, size * 0.52);

                // Inner ring rotated opposite
                rotate(-PI * 0.44);
                stroke(90, 160, 255, whAlpha * 0.5);
                strokeWeight(1.2);
                ellipse(0, 0, size * 1.3, size * 0.75);
                pop();

                // Dark vortex gravity center
                blendMode(BLEND);
                noStroke();
                const ctx = drawingContext;
                const gradCore = ctx.createRadialGradient(0, 0, 2, 0, 0, size * 0.52);
                gradCore.addColorStop(0, 'rgba(0, 0, 0, 1.0)');
                gradCore.addColorStop(0.75, `rgba(18, 6, 35, ${whAlpha / 255})`);
                gradCore.addColorStop(1.0, 'rgba(0, 0, 0, 0)');
                
                ctx.fillStyle = gradCore;
                ctx.beginPath();
                ctx.arc(0, 0, size * 0.58, 0, TWO_PI);
                ctx.fill();

                // Swirling spiral arm particles sucking in
                blendMode(ADD);
                noStroke();
                for (let p of this.particles) {
                    const px = cos(p.angle) * p.r;
                    const py = sin(p.angle) * p.r * 0.42;
                    
                    const pAlpha = map(p.r, size * 0.25, size * 2.6, 0, whAlpha);
                    const finalAlpha = p.r < size * 0.42 ? map(p.r, size * 0.25, size * 0.42, 0, pAlpha) : pAlpha;
                    
                    fill(p.color[0], p.color[1], p.color[2], finalAlpha * 1.35);
                    circle(px, py, p.size * map(p.r, size * 0.25, size * 2.6, 0.35, 1.2));
                }
                break;
            }
            case 'ion_storm': {
                const alpha = Math.sin(t * PI) * 220;
                if (alpha <= 0) break;
                noFill();
                stroke(this.color[0], this.color[1], this.color[2], alpha * 0.55);
                strokeWeight(2.5);
                circle(0, 0, this.lightningRadius * 0.45);
                strokeWeight(1.2);
                for (let bolt of this.bolts) {
                    if (elapsed > bolt.startDelay && elapsed < bolt.startDelay + bolt.duration) {
                        const boltT = (elapsed - bolt.startDelay) / bolt.duration;
                        const boltAlpha = sin(boltT * PI) * alpha;
                        const ex = cos(bolt.startA) * bolt.len;
                        const ey = sin(bolt.startA) * bolt.len;
                        stroke(210, 255, 255, boltAlpha);
                        line(0, 0, ex, ey);
                        stroke(this.color[0], this.color[1], this.color[2], boltAlpha * 0.45);
                        line(ex * 0.65, ey * 0.65, ex + random(-20, 20), ey + random(-20, 20));
                    }
                }
                break;
            }
            case 'crystal_comet': {
                const alpha = localLerp(210, 0, t);
                noStroke();
                for (let p of this.particles) {
                    const pElapsed = now - p.startTime;
                    const pT = pElapsed / p.duration;
                    fill(150, 245, 255, alpha * (1 - pT));
                    circle(p.x, p.y, p.size * (1.1 - pT * 0.6));
                }
                stroke(160, 240, 255, alpha * 0.8);
                strokeWeight(2.0);
                line(this.curX, this.curY, this.curX - this.vx * 5.0, this.curY - this.vy * 5.0);
                noStroke();
                fill(225, 255, 255, alpha);
                circle(this.curX, this.curY, 7.0);
                fill(150, 220, 255, alpha * 0.4);
                circle(this.curX, this.curY, 16.0);
                break;
            }
            case 'quasar_jet': {
                const alpha = Math.sin(t * PI) * 210;
                if (alpha <= 0) break;
                push();
                rotate(this.rotation);
                const ctx = drawingContext;
                const gradRight = ctx.createLinearGradient(0, 0, this.jetLength, 0);
                gradRight.addColorStop(0, `rgba(255,255,255,${alpha / 255})`);
                gradRight.addColorStop(0.25, `rgba(130,190,255,${alpha * 0.6 / 255})`);
                gradRight.addColorStop(1, 'rgba(90,40,255,0)');
                ctx.fillStyle = gradRight;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(this.jetLength, -26);
                ctx.lineTo(this.jetLength, 26);
                ctx.closePath();
                ctx.fill();
                const gradLeft = ctx.createLinearGradient(0, 0, -this.jetLength, 0);
                gradLeft.addColorStop(0, `rgba(255,255,255,${alpha / 255})`);
                gradLeft.addColorStop(0.25, `rgba(255,170,120,${alpha * 0.55 / 255})`);
                gradLeft.addColorStop(1, 'rgba(255,80,20,0)');
                ctx.fillStyle = gradLeft;
                ctx.beginPath();
                ctx.moveTo(0, 0);
                ctx.lineTo(-this.jetLength, -24);
                ctx.lineTo(-this.jetLength, 24);
                ctx.closePath();
                ctx.fill();
                noStroke();
                fill(255, 255, 255, alpha);
                circle(0, 0, this.size);
                pop();
                break;
            }
            case 'dark_matter_tide': {
                const alpha = Math.sin(t * PI) * 160;
                if (alpha <= 0) break;
                noFill();
                for (let i = 0; i < 4; i++) {
                    const ringT = (t + i * 0.22) % 1;
                    const r = localLerp(this.size * 0.25, this.size * 2.1, ringT);
                    stroke(110, 70, 180, alpha * (1 - ringT));
                    strokeWeight(2.0 - i * 0.3);
                    ellipse(0, 0, r * 1.4, r * 0.6);
                }
                break;
            }
            case 'aurora_wave': {
                const alpha = Math.sin(t * PI) * 180;
                if (alpha <= 0) break;

                const r = this.color[0], g = this.color[1], b = this.color[2];
                const halfW = this.size;
                const halfH = this.size * 0.55;

                // --- Soft organic radial glow behind the waves ---
                {
                    const ctx = drawingContext;
                    const grad = ctx.createRadialGradient(0, 0, halfW * 0.15, 0, 0, halfW * 1.05);
                    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.35 / 255})`);
                    grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.12 / 255})`);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, halfW * 2.1, halfH * 2.1, 0, 0, TWO_PI);
                    ctx.fill();
                }

                // --- Draw each wave ribbon with smooth edge falloff ---
                noFill();
                for (let l = 0; l < 3; l++) {
                    let prevX = null;
                    let prevY = null;
                    for (let x = -halfW; x <= halfW; x += 12) {
                        // Smooth falloff near edges using cosine easing
                        const distFromCenter = abs(x) / halfW;
                        let edgeFade = 1.0;
                        if (distFromCenter > 0.65) {
                            // Cosine ease-out from 0.65 to 1.0
                            const t = constrain((distFromCenter - 0.65) / 0.35, 0, 1);
                            edgeFade = 1.0 - (1.0 - cos(t * HALF_PI));
                        }
                        const y = sin((x * 0.03) + this.wavePhase + l * 0.9) * (20 + l * 8) + l * 14 - 14;
                        if (prevX !== null) {
                            const vertAlpha = alpha * edgeFade;
                            stroke(r, g, b, vertAlpha);
                            strokeWeight(2.2 * edgeFade + 0.4);
                            line(prevX, prevY, x, y);
                        }
                        prevX = x;
                        prevY = y;
                    }
                }
                break;
            }
            case 'stellar_nursery': {
                const alpha = Math.sin(t * PI) * 145;
                if (alpha <= 0) break;

                const halfW = this.size;
                const halfH = this.size * 0.55;

                // --- Soft organic radial glow behind the nursery ---
                {
                    const ctx = drawingContext;
                    const grad = ctx.createRadialGradient(0, 0, halfW * 0.15, 0, 0, halfW * 1.05);
                    grad.addColorStop(0, `rgba(255, 180, 220, ${alpha * 0.22 / 255})`);
                    grad.addColorStop(0.5, `rgba(140, 120, 220, ${alpha * 0.08 / 255})`);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, halfW * 2.1, halfH * 2.1, 0, 0, TWO_PI);
                    ctx.fill();
                }

                // --- Draw clouds with smooth edge falloff ---
                noStroke();
                for (let c of this.clouds) {
                    const dx = abs(c.x) / halfW;
                    const dy = abs(c.y) / halfH;
                    const maxDist = Math.max(dx, dy);
                    let edgeFade = 1.0;
                    if (maxDist > 0.55) {
                        const tt = constrain((maxDist - 0.55) / 0.45, 0, 1);
                        edgeFade = 1.0 - (1.0 - cos(tt * HALF_PI));
                    }
                    fill(c.color[0], c.color[1], c.color[2], alpha * 0.32 * edgeFade);
                    circle(c.x, c.y, c.size * (0.8 + 0.2 * edgeFade));
                }
                fill(255, 240, 255, alpha * 0.55);
                circle(0, 0, this.size * 0.38);
                break;
            }
            case 'graviton_lens': {
                const alpha = Math.sin(t * PI) * 205;
                if (alpha <= 0) break;
                push();
                rotate(this.rotation);
                noFill();
                stroke(180, 220, 255, alpha * 0.7);
                strokeWeight(2.4);
                ellipse(0, 0, this.size * 1.7, this.size * 0.55);
                rotate(PI * 0.28);
                stroke(255, 180, 110, alpha * 0.6);
                strokeWeight(1.6);
                ellipse(0, 0, this.size * 2.1, this.size * 0.42);
                pop();
                noStroke();
                fill(40, 40, 60, alpha * 0.65);
                circle(0, 0, this.size * 0.45);
                break;
            }
            case 'temporal_echo': {
                const alpha = Math.sin(t * PI) * 185;
                if (alpha <= 0) break;
                noFill();
                strokeWeight(1.6);
                for (let e of this.echoes) {
                    const age = (now - e.createdAt) / 1800;
                    stroke(this.color[0], this.color[1], this.color[2], alpha * (1 - age) * 0.5);
                    ellipse(0, 0, e.radius * 2.0, e.radius * 0.9);
                }
                fill(this.color[0], this.color[1], this.color[2], alpha * 0.45);
                noStroke();
                circle(0, 0, 16);
                break;
            }
            case 'plasma_rain': {
                const alpha = Math.sin(t * PI) * 205;
                if (alpha <= 0) break;

                const r = 110, g = 230, b = 255;
                const halfW = this.size;
                const halfH = this.size * 0.65;

                // --- Soft organic radial glow behind the rain ---
                {
                    const ctx = drawingContext;
                    const grad = ctx.createRadialGradient(0, 0, halfW * 0.12, 0, 0, halfW * 1.05);
                    grad.addColorStop(0, `rgba(${r},${g},${b},${alpha * 0.18 / 255})`);
                    grad.addColorStop(0.5, `rgba(${r},${g},${b},${alpha * 0.06 / 255})`);
                    grad.addColorStop(1, 'rgba(0,0,0,0)');
                    ctx.fillStyle = grad;
                    ctx.beginPath();
                    ctx.ellipse(0, 0, halfW * 2.1, halfH * 2.1, 0, 0, TWO_PI);
                    ctx.fill();
                }

                // --- Draw rain streaks with smooth edge falloff ---
                for (let p of this.particles) {
                    // Distance-based edge fade
                    const dx = abs(p.x) / halfW;
                    const dy = abs(p.y) / halfH;
                    const maxDist = Math.max(dx, dy);
                    let edgeFade = 1.0;
                    if (maxDist > 0.6) {
                        const tt = constrain((maxDist - 0.6) / 0.4, 0, 1);
                        edgeFade = 1.0 - (1.0 - cos(tt * HALF_PI));
                    }
                    const streakAlpha = alpha * 0.7 * edgeFade;
                    if (streakAlpha < 2) continue;
                    stroke(r, g, b, streakAlpha);
                    strokeWeight(1.4 * edgeFade + 0.3);
                    line(p.x, p.y, p.x - 4, p.y - p.len);
                }
                break;
            }
            case 'void_bloom': {
                const alpha = Math.sin(t * PI) * 200;
                if (alpha <= 0) break;
                push();
                rotate(this.rotation);
                noStroke();
                for (let i = 0; i < 10; i++) {
                    const a = i * (TWO_PI / 10);
                    const px = cos(a) * this.size * 0.42;
                    const py = sin(a) * this.size * 0.22;
                    fill(180, 80, 255, alpha * 0.28);
                    ellipse(px, py, this.size * 0.5, this.size * 0.18);
                }
                fill(20, 8, 35, alpha * 0.9);
                circle(0, 0, this.size * 0.42);
                pop();
                break;
            }
        }

        blendMode(BLEND);
        pop();
    }
}

class MicroAsteroidHail {
    constructor(system) {
        this.system = system;
        this.particles = [];
        this.sparks = [];
        
        // Base stream velocity (randomized per storm)
        this.streamVx = -1.8;
        this.streamVy = 1.2;
        
        // Intermittent storm state machine
        this.state = 'storming'; // 'storming' or 'calm'
        this.stateTimer = millis();
        this.stateDuration = random(6000, 15000); // Storm starts with 6-15 seconds

        const defConfig = {
            particleCount: 60,
            baseSpeed: 0.15,
            speedScale: 0.85,
            minDepth: 0.1,
            maxDepth: 1.0,
            minSize: 0.6,
            maxSize: 3.5,
            collisionRadiusMultiplier: 1.3,
            minOpacity: 35,
            maxOpacity: 190,
            sparkDuration: 250,
            sparkMaxRadius: 15,
            colors: [[160, 185, 230], [210, 225, 255], [255, 255, 255]]
        };
        this.config = (typeof STARFIELD_CONFIG !== 'undefined' && STARFIELD_CONFIG.AMBIENT_EFFECTS && STARFIELD_CONFIG.AMBIENT_EFFECTS.HAIL)
            ? STARFIELD_CONFIG.AMBIENT_EFFECTS.HAIL
            : defConfig;

        this.currentStormParticleCount = 0;
            
        this.init();
    }

    init() {
        this.particles = [];
        if (this.state === 'storming') {
            this.currentStormParticleCount = this._pickStormParticleCount();
            const count = this.currentStormParticleCount;
            for (let i = 0; i < count; i++) {
                this.particles.push(this.createParticle(true));
            }
        }
    }

    _pickStormParticleCount() {
        const baseCountRaw = Number(this.config.particleCount);
        const baseCount = Number.isFinite(baseCountRaw) && baseCountRaw > 0 ? baseCountRaw : 60;

        const minCfgRaw = Number(this.config.minParticleCount);
        const maxCfgRaw = Number(this.config.maxParticleCount);
        const hasConfiguredRange = Number.isFinite(minCfgRaw) && Number.isFinite(maxCfgRaw) && minCfgRaw > 0 && maxCfgRaw >= minCfgRaw;
        if (hasConfiguredRange) {
            return Math.max(2, Math.floor(random(minCfgRaw, maxCfgRaw + 1)));
        }

        // No explicit range configured: vary between sparse/normal/dense storm bands.
        const bandRoll = random();
        let factor;
        if (bandRoll < 0.30) {
            factor = random(0.15, 0.45); // Sparse storms
        } else if (bandRoll < 0.75) {
            factor = random(0.70, 1.15); // Typical storms
        } else {
            factor = random(1.60, 2.80); // Dense storms
        }

        const minCount = Math.max(4, Math.floor(baseCount * 0.15));
        const maxCount = Math.max(minCount, Math.floor(baseCount * 2.80));
        const scaledCount = Math.round(baseCount * factor);
        return Math.max(minCount, Math.min(maxCount, scaledCount));
    }

    startStorm() {
        this.state = 'storming';
        this.stateTimer = millis();
        this.stateDuration = random(8000, 18000); // Storm lasts 8-18 seconds

        // Randomize stream direction completely
        const angle = random(TWO_PI);
        const speed = random(1.0, 2.2);
        this.streamVx = cos(angle) * speed;
        this.streamVy = sin(angle) * speed;

        // Populate new screen particles
        this.currentStormParticleCount = this._pickStormParticleCount();
        const count = this.currentStormParticleCount;
        const currentLength = this.particles.length;

        // Mutate existing particles in-place up to the count
        for (let i = 0; i < Math.min(currentLength, count); i++) {
            this.createParticle(true, this.particles[i]);
        }
        // If we need more, add them
        if (currentLength < count) {
            for (let i = currentLength; i < count; i++) {
                this.particles.push(this.createParticle(true));
            }
        } else if (currentLength > count) {
            // Truncate if we have too many
            this.particles.length = count;
        }
    }

    startCalm() {
        this.state = 'calm';
        this.stateTimer = millis();
        this.stateDuration = random(15000, 65000); // Calm period lasts 15-65 seconds
    }

    _pickOrganicSpawnScreenPoint(halfW, halfH, margin, preferredAngle = null) {
        const outerRx = halfW + margin;
        const outerRy = halfH + margin;

        for (let attempt = 0; attempt < 5; attempt++) {
            const angle = (preferredAngle == null)
                ? random(TWO_PI)
                : preferredAngle + random(-PI * 0.55, PI * 0.55);

            const bulge = 1 + 0.18 * sin(angle * 3 + random(TWO_PI)) + 0.12 * sin(angle * 5 + random(TWO_PI));
            const radialJitter = random(0.9, 1.25);
            const radiusScale = Math.max(0.7, bulge * radialJitter);

            const sx = cos(angle) * outerRx * radiusScale;
            const sy = sin(angle) * outerRy * radiusScale;

            // Ensure particles spawn beyond the viewport bounds.
            if (abs(sx) > halfW + 2 || abs(sy) > halfH + 2) {
                return { x: sx, y: sy };
            }
        }

        const fallbackAngle = preferredAngle == null ? random(TWO_PI) : preferredAngle;
        return {
            x: cos(fallbackAngle) * (outerRx + margin),
            y: sin(fallbackAngle) * (outerRy + margin)
        };
    }

    createParticle(randomPos = false, p = null) {
        const minDepth = this.config.minDepth;
        const maxDepth = this.config.maxDepth;
        const depth = random(minDepth, maxDepth);
        const size = map(depth, minDepth, maxDepth, this.config.minSize, this.config.maxSize);
        const opacity = map(depth, minDepth, maxDepth, this.config.minOpacity, this.config.maxOpacity);
        
        const halfW = width / 2;
        const halfH = height / 2;
        const margin = 80;

        let relX, relY;
        const driftVx = this.streamVx + random(-0.4, 0.4);
        const driftVy = this.streamVy + random(-0.4, 0.4);

        if (randomPos) {
            const spawn = this._pickOrganicSpawnScreenPoint(halfW, halfH, margin);
            relX = spawn.x / depth;
            relY = spawn.y / depth;
        } else {
            const playerVel = this.system.player?.vel;
            const pvx = playerVel ? playerVel.x : 0;
            const pvy = playerVel ? playerVel.y : 0;
            
            // Particles move in screen-space relative to the camera at (driftVx - pvx) * depth.
            // Spawn them on the screen edge opposite to their screen-space movement vector.
            const rx = (driftVx - pvx) * depth;
            const ry = (driftVy - pvy) * depth;
            const speedSq = rx * rx + ry * ry;

            if (speedSq > 0.05) {
                const incomingAngle = atan2(-ry, -rx);
                const spawn = this._pickOrganicSpawnScreenPoint(halfW, halfH, margin, incomingAngle);
                relX = spawn.x / depth;
                relY = spawn.y / depth;
            } else {
                const spawn = this._pickOrganicSpawnScreenPoint(halfW, halfH, margin);
                relX = spawn.x / depth;
                relY = spawn.y / depth;
            }
        }

        const colors = this.config.colors;
        const color = colors[floor(random(colors.length))];

        if (p) {
            p.relX = relX;
            p.relY = relY;
            p.size = size;
            p.opacity = opacity;
            p.depth = depth;
            p.color = color;
            p.driftVx = driftVx;
            p.driftVy = driftVy;
            p.rotation = random(TWO_PI);
            p.rotSpeed = random(-0.02, 0.02);
            return p;
        }

        return {
            relX: relX,
            relY: relY,
            size: size,
            opacity: opacity,
            depth: depth,
            color: color,
            driftVx: driftVx,
            driftVy: driftVy,
            rotation: random(TWO_PI),
            rotSpeed: random(-0.02, 0.02)
        };
    }

    update() {
        if (!this.system.player) return;
        const player = this.system.player;
        const pVelX = player.vel ? player.vel.x : 0;
        const pVelY = player.vel ? player.vel.y : 0;

        const halfW = width / 2;
        const halfH = height / 2;
        const margin = 80;
        const now = millis();

        // State transition check
        if (now - this.stateTimer > this.stateDuration) {
            if (this.state === 'storming') {
                this.startCalm();
            } else {
                this.startStorm();
            }
        }

        for (let i = this.particles.length - 1; i >= 0; i--) {
            const p = this.particles[i];
            
            // Particles exist in the world, so their position relative to the camera shifts by exactly the player's movement.
            // This is scaled by depth in draw() to achieve parallax.
            p.relX += p.driftVx - pVelX;
            p.relY += p.driftVy - pVelY;
            p.rotation += p.rotSpeed;

            const screenX = p.relX * p.depth;
            const screenY = p.relY * p.depth;

            if (screenX < -halfW - margin || screenX > halfW + margin || screenY < -halfH - margin || screenY > halfH + margin) {
                if (this.state === 'storming') {
                    this.particles[i] = this.createParticle(false, p);
                } else {
                    this.particles.splice(i, 1);
                }
                continue;
            }

            if (p.depth >= 0.75) {
                const distSq = p.relX * p.relX + p.relY * p.relY;
                const sizeMult = this.config.collisionRadiusMultiplier;
                const playerColSize = (player.size || 30) * 0.65;
                const shieldRadius = playerColSize * sizeMult;
                const shieldRadiusSq = shieldRadius * shieldRadius;

                if (distSq < shieldRadiusSq) {
                    const hitAngle = atan2(p.relY, p.relX);
                    const hasShield = player.shield > 0 && !player.shieldsDisabled;
                    const sparkColor = hasShield ? [100, 200, 255] : [255, 140, 50];
                    
                    this.sparks.push({
                        relX: cos(hitAngle) * (hasShield ? shieldRadius : playerColSize * 0.6),
                        relY: sin(hitAngle) * (hasShield ? shieldRadius : playerColSize * 0.6),
                        color: sparkColor,
                        maxSize: random(8, 14),
                        startTime: millis(),
                        isShield: hasShield,
                        angle: hitAngle
                    });

                    if (this.state === 'storming') {
                        this.particles[i] = this.createParticle(false, p);
                    } else {
                        this.particles.splice(i, 1);
                    }
                }
            }
        }

        const duration = this.config.sparkDuration;
        for (let i = this.sparks.length - 1; i >= 0; i--) {
            const s = this.sparks[i];
            if (now - s.startTime > duration) {
                this.sparks.splice(i, 1);
            }
        }
    }

    draw() {
        if (!this.system.player) return;
        const player = this.system.player;
        const now = millis();
        const duration = this.config.sparkDuration;

        push();
        const px = player.pos.x;
        const py = player.pos.y;

        noStroke();
        for (let i = 0; i < this.particles.length; i++) {
            const p = this.particles[i];
            const wx = px + p.relX * p.depth;
            const wy = py + p.relY * p.depth;

            fill(p.color[0], p.color[1], p.color[2], p.opacity);
            
            push();
            translate(wx, wy);
            rotate(p.rotation);
            if (p.size > 2) {
                beginShape();
                vertex(-p.size * 0.5, -p.size * 0.2);
                vertex(0, -p.size * 0.6);
                vertex(p.size * 0.4, -p.size * 0.3);
                vertex(p.size * 0.5, p.size * 0.3);
                vertex(0, p.size * 0.5);
                vertex(-p.size * 0.4, p.size * 0.2);
                endShape(CLOSE);
            } else {
                circle(0, 0, p.size);
            }
            pop();
        }

        for (let i = 0; i < this.sparks.length; i++) {
            const s = this.sparks[i];
            const elapsed = now - s.startTime;
            const t = elapsed / duration;
            const alpha = map(t, 0, 1, 230, 0);
            
            const wx = px + s.relX;
            const wy = py + s.relY;

            push();
            translate(wx, wy);
            blendMode(ADD);
            
            if (s.isShield) {
                noFill();
                stroke(s.color[0], s.color[1], s.color[2], alpha);
                strokeWeight(2.5 * (1 - t) + 0.5);
                
                const arcLength = radians(60) * (1 - t * 0.5);
                arc(
                    -s.relX, -s.relY,
                    (player.size || 30) * 0.65 * this.config.collisionRadiusMultiplier * 2,
                    (player.size || 30) * 0.65 * this.config.collisionRadiusMultiplier * 2,
                    s.angle - arcLength / 2,
                    s.angle + arcLength / 2
                );

                noStroke();
                fill(255, 255, 255, alpha);
                circle(0, 0, s.maxSize * (0.8 - t * 0.5));
            } else {
                stroke(s.color[0], s.color[1], s.color[2], alpha);
                strokeWeight(1.5);
                noFill();
                const sparkDist = s.maxSize * 1.2 * t;
                
                for (let k = 0; k < 4; k++) {
                    const angle = s.angle + k * HALF_PI + random(-0.2, 0.2);
                    line(
                        cos(angle) * (sparkDist * 0.2), sin(angle) * (sparkDist * 0.2),
                        cos(angle) * sparkDist, sin(angle) * sparkDist
                    );
                }
            }
            pop();
        }
        pop();
    }
}

if (typeof module !== 'undefined') {
    module.exports = { StarSystem, AmbientCosmicEvent, MicroAsteroidHail };
}
