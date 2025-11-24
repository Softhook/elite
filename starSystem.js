// ****** StarSystem.js ******
// Toggle for verbose diagnostics (kept off for performance)
const STAR_SYSTEM_DEBUG = false;

// Build ship role arrays from SHIP_DEFINITIONS
// Optimized: Single-pass iteration using Map for O(1) role lookups
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
    console.log("IMPERIAL_SHIPS:",IMPERIAL_SHIPS);
    console.log("SEPARATIST_SHIPS:", SEPARATIST_SHIPS);
    console.log("COMBAT_SHIPS:", COMBAT_SHIPS);
}

// --- Jump Zone Constants ---
const JUMP_ZONE_DEFAULT_RADIUS = 500;
const JUMP_ZONE_MIN_DIST_FROM_STATION = 2500;
const JUMP_ZONE_MAX_DIST_FACTOR = 0.8; // Multiplied by despawnRadius
const JUMP_ZONE_DRAW_RANGE_FACTOR = 8; // Multiplied by jumpZoneRadius
const JUMP_ZONE_MAX_ALPHA = 200;
const JUMP_ZONE_MIN_ALPHA = 20;
// ---

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
        if (STAR_SYSTEM_DEBUG) console.log("StarSystem constructor called for", name);
        this.name = name;
        // SINGLE SOURCE OF TRUTH for economy type
        this.economyType = economy;
        try { this.galaxyPos = createVector(galaxyX, galaxyY); } catch(e) { this.galaxyPos = {x: galaxyX, y: galaxyY}; } // Map position
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

        // --- Config (can be set here, despawnRadius updated later) ---
        this.enemySpawnTimer = 0; this.enemySpawnInterval = 5000; this.maxEnemies = 8;
        this.asteroidSpawnTimer = 0; 
        this.asteroidSpawnInterval = 3000; 
        this.maxTotalAsteroids = 45;
        this.despawnRadius = 5000; // Default, updated in initStaticElements based on screen size

        // --- Jump Zone Properties ---
        this.jumpZoneCenter = null; // p5.Vector, calculated in initStaticElements or loaded
        this.jumpZoneRadius = JUMP_ZONE_DEFAULT_RADIUS;
        // ---

        // --- Add flag for static elements ---
        this.staticElementsInitialized = false; // Track if initStaticElements has run

        // Add explicit player property initialization
        this.player = null;

        // Pre-allocate screenBounds to avoid creating object every frame
        this.screenBounds = { left: 0, right: 0, top: 0, bottom: 0 };

        // Add a system-specific player wanted status
        this.playerWanted = false;
        
        // Optionally track wanted level and expiration time
        this.playerWantedLevel = 0; // 0-5 scale
        this.playerWantedExpiry = null; // Timestamp when wanted status expires

        // Initialize new arrays for nebulae, cosmic storms, and asteroid fields
        this.nebulae = [];
        this.cosmicStorms = [];
        this.spaceObjects = []; // decorative satellites/telescopes

        // Cooldown to prevent spamming alien spawn sound during batch spawns
        this._lastAlienSpawnSoundTime = 0;

        // Cooldowns to prevent collision bump sound spam
        this._lastPlayerAsteroidBumpSoundTime = 0;
        this._lastPlayerShipBumpSoundTime = 0;
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
            this._cachedDiagonalDist = sqrt(sq(width/2) + sq(height/2));
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
     * @param {number} [sessionSeed] - An optional seed component from the current game session.
     */
    initStaticElements(sessionSeed) {
        // Don't skip initialization if already done
        if (this.staticElementsInitialized) {
            console.log(`      >>> ${this.name}: initStaticElements() skipped (already initialized)`);
            return;
        }

        const seedToUse = sessionSeed ? this.systemIndex + sessionSeed : this.systemIndex;
        console.log(`      >>> ${this.name}: initStaticElements() Start (Seed: ${seedToUse})`);

        // Check if p5 functions are available before using them
        if (typeof randomSeed !== 'function' || typeof random !== 'function' || typeof color !== 'function' || typeof max !== 'function' || typeof floor !== 'function' || typeof width === 'undefined' || typeof height === 'undefined') {
            console.error(`      !!! CRITICAL ERROR in ${this.name}.initStaticElements: p5 functions or globals not available! Aborting static init.`);
            if (typeof randomSeed === 'function') randomSeed(); // Attempt to reset seed anyway
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
            
        } catch(e) {
            console.error("Error creating station:", e);
        }
        console.log(`         Station created (Name: ${this.station?.name || 'N/A'})`);

        // --- Set a fixed large Despawn Radius ---
        try {
            this.despawnRadius = 10000; // Set a fixed large radius
            console.log(`         Despawn Radius set to fixed value: ${this.despawnRadius}`); // Add log
        } catch(e) {
            console.error("         Error setting fixed despawnRadius:", e);
            this.despawnRadius = 10000; // Use fixed fallback
        }

        // Note: Stars are now generated procedurally in drawBackground() - no need to pre-generate them

        // --- Initialize Planets (This will also position the station) ---
        try { this.createRandomPlanets(); }
        catch(e) { console.error("Error during createRandomPlanets call:", e); }

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
        if (this.jumpZoneCenter === null) { // Check if not already loaded from save data
            if (this.station && this.station.pos) {
                const maxJumpDist = this.despawnRadius * JUMP_ZONE_MAX_DIST_FACTOR;
                const distFromStation = random(JUMP_ZONE_MIN_DIST_FROM_STATION, maxJumpDist);
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
        } catch(e) { console.error("Error spawning space objects:", e); }

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
} catch(e) { console.error("Error generating nebulae:", e); }

        // --- Initialize Ambient Sounds ---
        try {
            if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                this.initAmbientSounds();
                console.log(`         Ambient sounds initialized`);
            }
        } catch(e) { console.error("Error initializing ambient sounds:", e); }

        // --- CRITICAL: Reset Seed AFTER generating all static seeded elements ---
        randomSeed(); // Reset to non-deterministic (time-based) random

        // --- Set initialization flag ---
        this.staticElementsInitialized = true;
        // ---

        console.log(`      <<< ${this.name}: initStaticElements() Finished`); // Log completion
    }

    /** Creates random planets using seeded random. Called by initStaticElements. */
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
        const maxDrawDist = this.jumpZoneRadius * JUMP_ZONE_DRAW_RANGE_FACTOR;
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
            let alpha = map(distToPlayer, this.jumpZoneRadius, maxDrawDist, JUMP_ZONE_MAX_ALPHA, JUMP_ZONE_MIN_ALPHA);
            alpha = constrain(alpha, JUMP_ZONE_MIN_ALPHA, JUMP_ZONE_MAX_ALPHA);
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

    /** Called when player enters system. Resets dynamic objects. */
    enterSystem(player) {
        this.discover();
        this.enemies = []; this.projectiles = []; this.mines = []; this.asteroids = []; this.harpoons = [];
        this.enemySpawnTimer = 0; this.asteroidSpawnTimer = 0;
        
        // CRITICAL FIX: Associate the player with this system
        this.player = player;
        
        // Set system-wide police alert immediately
        this.policeAlertSent = player?.isWanted || false;
        console.log(`Player entering ${this.name} system. Wanted status: ${player?.isWanted}`);
        
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
                    try { this.trySpawnNPC(); } catch(e) {}
                }
                for (let i = 0; i < 8; i++) {
                    try { this.trySpawnAsteroid(); } catch(e) {}
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
    trySpawnNPC() {
        if (!this.player?.pos || this.enemies.length >= this.maxEnemies) return;

        let chosenRole, chosenShipTypeName;
        const econ = (this.economyType || "").toLowerCase();
        const sec = (this.securityLevel || "").toLowerCase();

        // --- Special cases for economy ---
        if (econ === "military") {
            const rand = random();
            if (rand < 0.60 && MILITARY_SHIPS.length > 0) { // 60% military
                chosenRole = AI_ROLE.COMBAT;
                chosenShipTypeName = random(MILITARY_SHIPS);
            } else if (rand < 0.75 && HAULER_SHIPS.length > 0) { // 15% haulers
                chosenRole = AI_ROLE.HAULER;
                chosenShipTypeName = random(HAULER_SHIPS);
            } else if (rand < 0.85 && PIRATE_SHIPS.length > 0) { // 10% pirates
                chosenRole = AI_ROLE.PIRATE;
                chosenShipTypeName = random(PIRATE_SHIPS);
            } else if (rand < 0.92 && ALIEN_SHIPS.length > 0) { // 7% aliens
                chosenRole = AI_ROLE.ALIEN;
                chosenShipTypeName = random(ALIEN_SHIPS);
            } else { // 8% local transports (non-police)
                // Police are no longer launched based on system/economy type.
                // Use non-police transport/hauler options here; policing is determined
                // centrally by security level via getEnemyRoleProbabilities().
                if (random() < 0.6 && TRANSPORT_SHIPS.length > 0) {
                    chosenRole = AI_ROLE.TRANSPORT;
                    chosenShipTypeName = random(TRANSPORT_SHIPS);
                } else if (HAULER_SHIPS.length > 0) {
                    chosenRole = AI_ROLE.HAULER;
                    chosenShipTypeName = random(HAULER_SHIPS);
                } else {
                    chosenRole = AI_ROLE.COMBAT;
                    chosenShipTypeName = random(MILITARY_SHIPS.length > 0 ? MILITARY_SHIPS : COMBAT_SHIPS);
                }
            }

        } else if (econ === "alien") {
            // Mostly alien ships
            if (random() < 0.8 && ALIEN_SHIPS.length > 0) { // 80% chance for an Alien role ship
                chosenRole = AI_ROLE.ALIEN; 
                chosenShipTypeName = random(ALIEN_SHIPS);
            } else { // 20% chance for a different role
                const rolesToConsider = [];
                if (PIRATE_SHIPS.length > 0) {
                    rolesToConsider.push({ role: AI_ROLE.PIRATE, ships: PIRATE_SHIPS });
                }
                if (HAULER_SHIPS.length > 0) {
                    rolesToConsider.push({ role: AI_ROLE.HAULER, ships: HAULER_SHIPS });
                }
                // Police removed from alien-branch ad-hoc pools; police spawning is
                // governed by system security level instead of economy type.

                if (rolesToConsider.length > 0) {
                    const selectedPool = random(rolesToConsider);
                    chosenRole = selectedPool.role;
                    chosenShipTypeName = random(selectedPool.ships);
                } else {
                    chosenRole = AI_ROLE.HAULER;
                    chosenShipTypeName = "Krait"; 
                }
            }

        } else if (econ === "offworld") {
            const rand = random();
            if (rand < 0.30 && EXPLORER_SHIPS.length > 0) {
                chosenRole = AI_ROLE.HAULER; 
                chosenShipTypeName = random(EXPLORER_SHIPS);
            } else if (rand < 0.50 && COMBAT_SHIPS.length > 0) {
                chosenRole = AI_ROLE.COMBAT; 
                chosenShipTypeName = random(COMBAT_SHIPS);
            } else if (rand < 0.65 && PIRATE_SHIPS.length > 0) {
                chosenRole = AI_ROLE.PIRATE;
                chosenShipTypeName = random(PIRATE_SHIPS);
            } else if (HAULER_SHIPS.length > 0) {
                chosenRole = AI_ROLE.HAULER;
                chosenShipTypeName = random(HAULER_SHIPS);
            } else { 
                 chosenRole = AI_ROLE.HAULER;
                 chosenShipTypeName = "Krait";
            }

        } else if (econ === "separatist") {
            const rand = random();
            if (rand < 0.60 && SEPARATIST_SHIPS.length > 0) { // 60% separatist combat
                chosenRole = AI_ROLE.COMBAT;
                chosenShipTypeName = random(SEPARATIST_SHIPS);
            } else if (rand < 0.75 && HAULER_SHIPS.length > 0) { // 15% haulers
                chosenRole = AI_ROLE.HAULER;
                chosenShipTypeName = random(HAULER_SHIPS);
            } else if (rand < 0.85 && TRANSPORT_SHIPS.length > 0) { // 10% transports
                chosenRole = AI_ROLE.TRANSPORT;
                chosenShipTypeName = random(TRANSPORT_SHIPS);
            } else { // 15% imperial combat (cross-faction)
                chosenRole = AI_ROLE.COMBAT;
                chosenShipTypeName = random(IMPERIAL_SHIPS.length > 0 ? IMPERIAL_SHIPS : COMBAT_SHIPS);
            }
        } else if (econ === "imperial") {
            const rand = random();
            if (rand < 0.60 && IMPERIAL_SHIPS.length > 0) { // 60% imperial combat
                chosenRole = AI_ROLE.COMBAT;
                chosenShipTypeName = random(IMPERIAL_SHIPS);
            } else if (rand < 0.75 && HAULER_SHIPS.length > 0) { // 15% haulers
                chosenRole = AI_ROLE.HAULER;
                chosenShipTypeName = random(HAULER_SHIPS);
            } else if (rand < 0.85 && TRANSPORT_SHIPS.length > 0) { // 10% transports
                chosenRole = AI_ROLE.TRANSPORT;
                chosenShipTypeName = random(TRANSPORT_SHIPS);
            } else { // 15% separatist combat (cross-faction)
                chosenRole = AI_ROLE.COMBAT;
                chosenShipTypeName = random(SEPARATIST_SHIPS.length > 0 ? SEPARATIST_SHIPS : COMBAT_SHIPS);
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
                    chosenShipTypeName = random(PIRATE_SHIPS.length > 0 ? PIRATE_SHIPS : ["Krait"]);
                    break;
                case AI_ROLE.POLICE:
                    chosenShipTypeName = random(POLICE_SHIPS.length > 0 ? POLICE_SHIPS : ["Viper"]);
                    break;
                case AI_ROLE.HAULER:
                    chosenShipTypeName = random(HAULER_SHIPS.length > 0 ? HAULER_SHIPS : ["CobraMkIII"]);
                    break;
                default:
                    chosenShipTypeName = "Krait"; // Fallback
                    if (!chosenRole) chosenRole = AI_ROLE.HAULER; // Ensure role if not set
            }

            // --- Optional: Transport spawn branch ---
            if (random() < 0.25 && TRANSPORT_SHIPS.length > 0) {
                chosenRole = AI_ROLE.TRANSPORT;
                chosenShipTypeName = random(TRANSPORT_SHIPS);
            }
        }

        // --- Thargoid override only for non-alien systems ---
        if (econ !== "alien") {
            const specificAlienChance = 0.01; 
            if (random() < specificAlienChance && ALIEN_SHIPS.includes("Thargoid")) {
                chosenShipTypeName = "Thargoid";
                chosenRole = AI_ROLE.ALIEN; 
                if (uiManager) uiManager.addMessage(`Hostile Alien Detected: ${chosenShipTypeName}`);
                // Sound is played centrally in addEnemy() when an Alien is added
            }
        }
        
        if (!chosenShipTypeName) {
            console.warn("StarSystem: chosenShipTypeName was undefined after role selection, defaulting to Krait (Hauler). Role was:", chosenRole);
            chosenShipTypeName = "Krait";
            if (!chosenRole) chosenRole = AI_ROLE.HAULER;
        }


        // --- Spawn the ship ---
        let angle = random(TWO_PI);
        let spawnDist = this._getDiagonalDistance() + random(150, 400);
        let spawnX = this.player.pos.x + cos(angle) * spawnDist;
        let spawnY = this.player.pos.y + sin(angle) * spawnDist;
        try {
            let newEnemy = new Enemy(spawnX, spawnY, this.player, chosenShipTypeName, chosenRole);
            // newEnemy.currentSystem = this; // addEnemy will set this
            newEnemy.calculateRadianProperties();
            newEnemy.initializeColors();
            
            this.addEnemy(newEnemy); // Add the primary NPC



// --- START: GUARD SPAWN LOGIC FOR LARGE HAULERS ---
if (newEnemy.role === AI_ROLE.HAULER && newEnemy.size >= 60) {
    const slotsLeft = this.maxEnemies - this.enemies.length;
    if (newEnemy.size > 100 && slotsLeft > 0) {
        // Spawn two guards for very large haulers
        const numGuards = min(2, slotsLeft);
        for (let g = 0; g < numGuards; g++) {
            let guardShipTypeName;
            const defaultGuardShips = ["Viper", "GladiusFighter"];
            if (GUARD_SHIPS.length > 0)        guardShipTypeName = random(GUARD_SHIPS);
            else if (MILITARY_SHIPS.length > 0) guardShipTypeName = random(MILITARY_SHIPS);
            else                                 guardShipTypeName = random(defaultGuardShips);

            if (!guardShipTypeName) guardShipTypeName = "Viper";

            // Offset each guard at a different angle around the hauler
            const offsetAngle = TWO_PI * (g / numGuards);
            const spawnDist   = newEnemy.size/2 + 30;
            const guardX      = newEnemy.pos.x + cos(offsetAngle) * spawnDist;
            const guardY      = newEnemy.pos.y + sin(offsetAngle) * spawnDist;

            let guardNPC = new Enemy(guardX, guardY, this.player, guardShipTypeName, AI_ROLE.GUARD);
            guardNPC.calculateRadianProperties();
            guardNPC.initializeColors();
            guardNPC.principal = newEnemy;
            guardNPC.changeState(AI_STATE.GUARDING, { principal: newEnemy });

            this.addEnemy(guardNPC);
            HAULER_LOG(`Spawned ${guardNPC.shipTypeName} (Guard) for large hauler ${newEnemy.shipTypeName}`);
        }
    }
    else if (newEnemy.size <= 100 && slotsLeft > 0 && random() < 0.6) {
        // 60% chance to spawn a single guard for medium haulers
        let guardShipTypeName;
        const defaultGuardShips = ["Viper", "GladiusFighter"];
        if (GUARD_SHIPS.length > 0)        guardShipTypeName = random(GUARD_SHIPS);
        else if (MILITARY_SHIPS.length > 0) guardShipTypeName = random(MILITARY_SHIPS);
        else                                 guardShipTypeName = random(defaultGuardShips);

        if (!guardShipTypeName) guardShipTypeName = "Viper";

        const guardX = newEnemy.pos.x - (newEnemy.size/2 + 30);
        const guardY = newEnemy.pos.y;

        let guardNPC = new Enemy(guardX, guardY, this.player, guardShipTypeName, AI_ROLE.GUARD);
        guardNPC.calculateRadianProperties();
        guardNPC.initializeColors();
        guardNPC.principal = newEnemy;
        guardNPC.changeState(AI_STATE.GUARDING, { principal: newEnemy });

        this.addEnemy(guardNPC);
        HAULER_LOG(`Spawned ${guardNPC.shipTypeName} (Guard) for large hauler ${newEnemy.shipTypeName}`);
    }
}
// --- END: GUARD SPAWN LOGIC ---

            
            if (newEnemy.role === AI_ROLE.POLICE && 
                ((this.player && this.player.isWanted && !this.player.destroyed) || this.policeAlertSent)) {
                
                newEnemy.target = this.player;
                newEnemy.changeState(AI_STATE.APPROACHING); // Use changeState for consistency
                                
                if (newEnemy.pos && this.player.pos) {
                    let angleToPlayer = atan2(this.player.pos.y - newEnemy.pos.y, this.player.pos.x - newEnemy.pos.x);
                    newEnemy.angle = angleToPlayer; 
                }
                
                if (STAR_SYSTEM_DEBUG) console.log(`New police ${newEnemy.shipTypeName} immediately pursuing wanted player!`);
            }
            
        } catch(e) { 
            console.error("!!! ERROR during trySpawnNPC (Enemy creation/init):", e, "Chosen Ship:", chosenShipTypeName, "Role:", chosenRole); 
        }
    }



    /** Attempts to spawn an asteroid at regular intervals. */
    trySpawnAsteroid() {
        if (!this.player?.pos || this.asteroids.length >= this.maxTotalAsteroids) return;
        try {
            let angle = random(TWO_PI);
            let spawnDist = this._getDiagonalDistance() + random(200,500);
            let spawnX = this.player.pos.x + cos(angle) * spawnDist;
            let spawnY = this.player.pos.y + sin(angle) * spawnDist;
            let size = random(40, 90); // Use larger default size
            // Call the main addAsteroid method to respect maxTotalAsteroids and centralize creation
            this.addAsteroid(spawnX, spawnY, size);
        } catch(e) { console.error("!!! ERROR during trySpawnAsteroid:", e); }
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
     * Updates all system entities.
     * OPTIMIZED: Uses fast array removal and reduces object allocations.
     */
    update() {
        if (!this.player || !this.player.pos) return;
        const deltaSeconds = (typeof deltaTime === 'number' && Number.isFinite(deltaTime)) ? (deltaTime / 1000) : 0;
        if (deltaSeconds > 0) {
            if (this.station?.market?.updateDynamicStock) {
                this.station.market.updateDynamicStock(deltaSeconds);
            }
            if (Array.isArray(this.secretStations)) {
                for (const secretStation of this.secretStations) {
                    secretStation?.market?.updateDynamicStock?.(deltaSeconds);
                }
            }
        }
        
        // Update ambient sound volumes based on player position
        if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
            ambientSoundManager.updateSoundVolumes(this.player.pos);
        }
        
        try {
            // Calculate screen bounds for visibility checks - reuse pre-allocated object
            const tx = width / 2 - this.player.pos.x;
            const ty = height / 2 - this.player.pos.y;
            const bounds = this.screenBounds;
            bounds.left = -tx - 100;
            bounds.right = -tx + width + 100;
            bounds.top = -ty - 100;
            bounds.bottom = -ty + height + 100;

            // Update Enemies - OPTIMIZED with fast removal
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i];
                if (!enemy) {
                    this._fastRemove(this.enemies, i);
                    continue;
                }
                
                try { enemy.update(this); } catch(e) { console.error("Err updating Enemy:",e); }
                
                if (enemy.isDestroyed() || this.shouldDespawnEntity(enemy, 1.1)) {
                    this._fastRemove(this.enemies, i);
                }
            }

            // Update Asteroids - OPTIMIZED with fast removal
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.asteroids[i];
                if (!asteroid) {
                    this._fastRemove(this.asteroids, i);
                    continue;
                }
                
                try { asteroid.update(); } catch(e) { console.error("Err updating Asteroid:",e); }

                if (asteroid.isDestroyed()) {
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
                        
                        // Notify player of mineral collection
                        if (typeof uiManager !== 'undefined') {
                            uiManager.addMessage(`Mined ${quantity}t Minerals${asteroid.isRich ? ' (Rich Vein!)' : ''}`);
                        }
                        
                        if (STAR_SYSTEM_DEBUG) {
                            console.log(`Asteroid destroyed, dropped ${quantity}t Minerals${asteroid.isRich ? ' (Rich!)' : ''}`);
                        }
                    }

                    // On destruction, spawn a smaller asteroid in-place to simulate gradual whittling
                    // Only split if the asteroid was above a minimum size threshold
                    try {
                        const minSplitSize = 16; // don't create too tiny fragments
                        const splitFactor = 0.6; // 60% of the original size
                        const newSize = floor(asteroid.size * splitFactor);
                        if (newSize >= minSplitSize) {
                            // Respect maxTotalAsteroids via addAsteroid()
                            this.addAsteroid(asteroid.pos.x, asteroid.pos.y, newSize);
                        }
                    } catch (e) {
                        console.error("Error spawning split asteroid:", e);
                    }

                    this._fastRemove(this.asteroids, i);
                    continue;
                }

                if (this.shouldDespawnEntity(asteroid, 1.2)) {
                    this._fastRemove(this.asteroids, i);
                }
            }

            // --- Update Planets for rotation ---
            for (let i = 0; i < this.planets.length; i++) {
                const planet = this.planets[i];
                if (planet && typeof planet.update === 'function') {
                    // Update all planets regardless of visibility
                    try {
                        planet.update();
                    } catch(e) {
                        console.error("Error updating planet:", e, planet);
                    }
                }
            }

            // Update decorative space objects (satellites / telescopes)
            if (this.spaceObjects && this.spaceObjects.length) {
                for (let i = this.spaceObjects.length - 1; i >= 0; i--) {
                    const so = this.spaceObjects[i];
                    if (!so) { this._fastRemove(this.spaceObjects, i); continue; }
                    try { so.update(this); } catch (e) { console.error('SpaceObject.update error', e); }
                    // If destroyed, spawn a small metals cargo and remove
                    if (so.destroyed) {
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
                        this._fastRemove(this.spaceObjects, i);
                        continue;
                    }

                    if (this.shouldDespawnEntity(so, 1.2)) {
                        this._fastRemove(this.spaceObjects, i);
                    }
                }
            }

            // --- Update Projectiles (Ensure proj.update() is called) ---
            for (let i = this.projectiles.length - 1; i >= 0; i--) {
                let proj = this.projectiles[i];
                proj.update();
                
                if (proj.lifespan <= 0) {
                    //console.log("Projectile removed: lifespan expired");
                    this.removeProjectile(i); // USE NEW METHOD
                } 
                else if (proj.isOffScreen()) {
                    //console.log("Projectile removed: off-screen at", proj.pos.x.toFixed(0), proj.pos.y.toFixed(0));
                    this.removeProjectile(i); // USE NEW METHOD
                }
            }
            // --- End Projectile Loop ---

            // Update cargo - OPTIMIZED with fast removal
            if (this.cargo && this.cargo.length > 0) {
                // Clean up invalid/expired cargo
                for (let i = this.cargo.length - 1; i >= 0; i--) {
                    const cargo = this.cargo[i];
                    if (!cargo || !cargo.pos || cargo.collected || (cargo.isExpired && cargo.isExpired())) {
                        this._fastRemove(this.cargo, i);
                    }
                }
                // Update remaining cargo
                for (let i = 0; i < this.cargo.length; i++) {
                    const c = this.cargo[i];
                    if (c && typeof c.update === 'function') c.update();
                }
                // Check for player collection
                this.handleCargoCollection();
            }

            // Update Beams
            this.updateBeams && this.updateBeams();
            
            // Update Mines
            this.updateMines && this.updateMines();


            // Update and process force waves with batch processing
            for (let i = this.forceWaves.length - 1; i >= 0; i--) {
                const wave = this.forceWaves[i];
                
                // Expand the wave
                wave.radius += wave.growRate;
                
                // First time initialization - find all entities to process
                if (!wave.entitiesToProcess) {
                    wave.entitiesToProcess = [];
                    
                    // Add all relevant entities that might be affected
                    if (wave.owner === this.player) {
                        // Player's wave affects enemies and asteroids
                        wave.entitiesToProcess = [...this.enemies, ...this.asteroids];
                    } else {
                        // Enemy's wave affects player only
                        if (this.player) wave.entitiesToProcess.push(this.player);
                    }
                    
                    // Initialize tracking
                    wave.processedCount = 0;
                    wave.processed = {};
                }
                
                // Process entities in batches to prevent frame rate drops
                const batchSize = 50; // Process up to 50 entities per frame for better throughput
                const remainingEntities = wave.entitiesToProcess.length - wave.processedCount;
                const entitiesToProcessNow = Math.min(remainingEntities, batchSize);
                
                for (let j = 0; j < entitiesToProcessNow; j++) {
                    const entity = wave.entitiesToProcess[wave.processedCount + j];
                    
                    // Skip if entity is invalid or already processed
                    if (!entity || !entity.pos || wave.processed[entity.id || entity]) continue;
                    
                    // Fast distance check using squared distance
                    const dx = entity.pos.x - wave.pos.x;
                    const dy = entity.pos.y - wave.pos.y;
                    const distSq = dx * dx + dy * dy;
                    const radiusWithEntity = wave.radius + entity.size / 2;
                    const radiusWithEntitySq = radiusWithEntity * radiusWithEntity;

                    // If entity is within wave radius, apply damage
                    if (distSq < radiusWithEntitySq) {
                        const maxRadiusAdj = wave.maxRadius + entity.size / 2;
                        const dist = Math.sqrt(distSq);
                        const distRatio = dist / maxRadiusAdj;
                        
                        // More gradual falloff curve for better damage distribution across distance
                        // Using 0.5 exponent gives much more gradual falloff than 0.9
                        const falloff = Math.pow(1 - distRatio, 0.5);
                        
                        // Ensure meaningful minimum damage (at least 30% of max damage)
                        const minDamage = Math.max(40, Math.floor(wave.damage * 0.3));
                        const dmg = Math.max(minDamage, Math.floor(wave.damage * falloff));

                        // Apply damage and mark as processed (pass system for immediate targeting updates)
                        entity.takeDamage(dmg, wave.owner, this);
                        wave.processed[entity.id || entity] = true;
                        
                        // Apply knockback force without allocating vectors
                        if (entity.vel) {
                            const invLen = dist > 0 ? 1 / dist : 0;
                            const nx = dx * invLen;
                            const ny = dy * invLen;
                            const forceMagnitude = 15 - 10 * distRatio; // map(distRatio,0..1,15..5)
                            entity.vel.x += nx * forceMagnitude;
                            entity.vel.y += ny * forceMagnitude;
                        }
                    }
                }
                
                // Update processed count
                wave.processedCount += entitiesToProcessNow;
                
                // Remove wave if it reaches max size and all entities processed
                if (wave.radius >= wave.maxRadius && wave.processedCount >= wave.entitiesToProcess.length) {
                    this._fastRemove(this.forceWaves, i);
                }
            }

            // Update Harpoons
            if (this.harpoons && this.harpoons.length) {
                for (let i = this.harpoons.length - 1; i >= 0; i--) {
                    const h = this.harpoons[i];
                    try { h.update && h.update(deltaTime || 16); } catch(e) { console.error('Harpoon update error', e); h && h.break && h.break(); }
                    // Remove if broken or invalid
                    const targetDestroyed = !h || h.broken || !h.owner || !h.target || (typeof h.target.isDestroyed === 'function' && h.target.isDestroyed());
                    const done = (h && typeof h.isDone === 'function') ? h.isDone() : false;
                    if (targetDestroyed || done) {
                        this._fastRemove(this.harpoons, i);
                    }
                }
            }

            // Update explosions - OPTIMIZED with pooling and fast removal
            for (let i = this.explosions.length - 1; i >= 0; i--) {
                const exp = this.explosions[i];
                exp.update();
                if (exp.isDone()) {
                    if (typeof WeaponSystem !== 'undefined' && WeaponSystem.releaseExplosion) {
                        WeaponSystem.releaseExplosion(exp);
                    }
                    this._fastRemove(this.explosions, i);
                }
            }

            // Update nebulae
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

            // Update cosmic storms (they move)
            for (let i = this.cosmicStorms.length - 1; i >= 0; i--) {
                const storm = this.cosmicStorms[i];
                const keepStorm = storm.update(); // Get return value from update
                // Update corresponding ambient sound position if exists
                try {
                    if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                        const id = `${this.name}_storm_${i}_${storm.type}`;
                        const cfg = ambientSoundManager.activeSources.get(id);
                        if (cfg && storm.pos) cfg.position = storm.pos;
                    }
                } catch(_) {}
                
                // Remove the storm if it has dissipated
                if (!keepStorm) {
                    // Remove ambient sound layer
                    try {
                        if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                            const id = `${this.name}_storm_${i}_${storm.type}`;
                            ambientSoundManager.removeAmbientSound(id);
                        }
                    } catch(_) {}
                    this._fastRemove(this.cosmicStorms, i);
                    continue; // Skip the rest of this iteration
                }
                
                // Only apply effects and draw if the storm is still active
                if (this.player) {
                    storm.applyEffects(this.player);
                }
                
                for (let enemy of this.enemies) {
                    storm.applyEffects(enemy);
                }
            }

            // Move storm spawning OUTSIDE the loop with a small probability
            if (random() < 0.0002 && this.cosmicStorms.length < 1) { // Limit to 1 storms max
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
                try {
                    if (typeof ambientSoundManager !== 'undefined' && ambientSoundManager) {
                        const idx = this.cosmicStorms.length - 1;
                        const st = this.cosmicStorms[idx];
                        const profile = AmbientSoundManager.getSoundProfile('storm', { type: stormType });
                        const id = `${this.name}_storm_${idx}_${stormType}`;
                        const snd = ambientSoundManager.createAmbientSound(id, profile);
                        if (snd && st?.pos) snd.position = st.pos.copy();
                    }
                } catch(_) {}
            }


            // Collision Checks
            this.checkCollisions();
            this.checkProjectileCollisions(); // Added call to new method

            // Spawning Timers
            this.enemySpawnTimer += deltaTime; 
            if (this.enemySpawnTimer >= this.enemySpawnInterval) { 
                this.trySpawnNPC(); // CHANGE: Don't pass player 
                this.enemySpawnTimer = 0; 
            }

            this.asteroidSpawnTimer += deltaTime; 
            if (this.asteroidSpawnTimer >= this.asteroidSpawnInterval) { 
                this.trySpawnAsteroid(); // CHANGE: Don't pass player
                this.asteroidSpawnTimer = 0; 
            }
        } catch (e) { console.error(`Major ERROR in StarSystem ${this.name}.update:`, e); }

        //console.log(`[UPDATE] Projectiles remaining: ${this.projectiles.length}`);
    } // End update

    updateBeams() {
        // Remove expired beams (e.g., beams with .lifespan <= 0)
        for (let i = this.beams.length - 1; i >= 0; i--) {
            let beam = this.beams[i];
            beam.update && beam.update();
            if (beam.lifespan !== undefined && beam.lifespan <= 0) {
                this._fastRemove(this.beams, i);
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
        
        for (let i = this.mines.length - 1; i >= 0; i--) {
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
            if (mine.owner instanceof Player && this.enemies) {
                for (const enemy of this.enemies) {
                    if (mine.shouldExplode(enemy)) {
                        mine.explode(this);
                        this._removeMineFromSystem(mine, i);
                        break;
                    }
                }
            }
            
            // Check proximity to player (if enemy's mine)
            if (!(mine.owner instanceof Player) && this.player) {
                if (mine.shouldExplode(this.player)) {
                    mine.explode(this);
                    this._removeMineFromSystem(mine, i);
                    continue;
                }
            }

            // Also allow enemy mines to be triggered by other enemies (friendly-fire capable)
            if (!(mine.owner instanceof Player) && this.enemies && this.enemies.length) {
                for (let j = 0; j < this.enemies.length; j++) {
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
            //console.log(`Adding explosion at (${x.toFixed(1)},${y.toFixed(1)}) with size ${size}, using object pooling`);
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

    /** Handles all collision detection and responses in the system. */
    checkCollisions() {
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
                    // Pre-calculate velocities to avoid multiple property access
                    const playerVelMag = this.player.vel.mag();
                    const enemyVelMag = enemy.vel.mag();
                    
                    // Handle ship-to-ship collision
                    const collisionDamage = Math.floor(playerVelMag + enemyVelMag);
                    if (STAR_SYSTEM_DEBUG) console.log(`Ship collision! Damage: ${collisionDamage}`);
                    this.player.takeDamage(collisionDamage, enemy);
                    enemy.takeDamage(collisionDamage, this.player, this);

                    // Play a short bump/hit sound with simple cooldown (avoid audio spam)
                    try {
                        if (typeof soundManager !== 'undefined') {
                            const now = (typeof millis === 'function') ? millis() : Date.now();
                            if (!this._lastPlayerShipBumpSoundTime || (now - this._lastPlayerShipBumpSoundTime) > 250) {
                                soundManager.playWorldSound('bump', this.player.pos.x, this.player.pos.y, this.player.pos);
                                this._lastPlayerShipBumpSoundTime = now;
                            }
                        }
                    } catch (e) { /* ignore sound errors */ }
                    
                    // Apply physics push based on relative mass/size
                    const playerSize = this.player.size;
                    const enemySize = enemy.size;
                    const playerMass = playerSize * playerSize;
                    const enemyMass = enemySize * enemySize;
                    const totalMass = playerMass + enemyMass;

                    // Calculate impulse - smaller ships get pushed more
                    const playerImpulseFactor = 3 * (enemyMass / totalMass);
                    const enemyImpulseFactor = 3 * (playerMass / totalMass);

                    // Create normalized collision vector - optimized with fast inverse sqrt
                    const dx = enemy.pos.x - this.player.pos.x;
                    const dy = enemy.pos.y - this.player.pos.y;
                    const distSq = dx * dx + dy * dy;
                    const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
                    const normalizedX = dx * invDist;
                    const normalizedY = dy * invDist;

                    // Apply appropriate impulse to each ship without creating new vectors
                    this.player.vel.x -= normalizedX * playerImpulseFactor;
                    this.player.vel.y -= normalizedY * playerImpulseFactor;
                    enemy.vel.x += normalizedX * enemyImpulseFactor;
                    enemy.vel.y += normalizedY * enemyImpulseFactor;
                }
            }
            
            // Player vs Asteroids collision - cache lengths
            const asteroidCount = this.asteroids.length;
            for (let i = 0; i < asteroidCount; i++) {
                const asteroid = this.asteroids[i];
                if (!asteroid || !asteroid.pos || asteroid.isDestroyed()) continue;
                if (this.player.checkCollision(asteroid)) {
                    // Special comet collision: destroys ship outright
                    if (asteroid.isComet) {
                        this.player.takeDamage(999999, asteroid); // Instant destruction
                        asteroid.takeDamage(20, this.player, this); // Damage the comet too
                    } else {
                        // Handle normal player-asteroid collision
                        const collisionDamage = Math.floor(this.player.vel.mag());
                        if (STAR_SYSTEM_DEBUG) console.log(`Player hit asteroid! Damage: ${collisionDamage}`);
                        this.player.takeDamage(collisionDamage, asteroid);
                        asteroid.takeDamage(20, this.player, this); // Fixed damage to asteroid, pass system
                    }

                    // Play a subtle bump/hit sound with simple cooldown (avoid audio spam)
                    try {
                        if (typeof soundManager !== 'undefined') {
                            const now = (typeof millis === 'function') ? millis() : Date.now();
                            if (!this._lastPlayerAsteroidBumpSoundTime || (now - this._lastPlayerAsteroidBumpSoundTime) > 250) {
                                soundManager.playWorldSound('bump', this.player.pos.x, this.player.pos.y, this.player.pos);
                                this._lastPlayerAsteroidBumpSoundTime = now;
                            }
                        }
                    } catch (e) { /* ignore sound errors */ }
                    
                    // Apply physics push based on relative mass/size
                    const playerSize = this.player.size;
                    const asteroidSize = asteroid.size;
                    const playerMass = playerSize * playerSize;
                    const asteroidMass = asteroidSize * asteroidSize;
                    const totalMass = playerMass + asteroidMass;

                    // Calculate impulse factors
                    const playerImpulseFactor = 2 * (asteroidMass / totalMass);
                    const asteroidImpulseFactor = 2 * (playerMass / totalMass);

                    // Create normalized collision vector - optimized
                    const dx = asteroid.pos.x - this.player.pos.x;
                    const dy = asteroid.pos.y - this.player.pos.y;
                    const distSq = dx * dx + dy * dy;
                    const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
                    const normalizedX = dx * invDist;
                    const normalizedY = dy * invDist;

                    // Apply impulses directly
                    this.player.vel.x -= normalizedX * playerImpulseFactor;
                    this.player.vel.y -= normalizedY * playerImpulseFactor;
                    asteroid.vel.x += normalizedX * asteroidImpulseFactor;
                    asteroid.vel.y += normalizedY * asteroidImpulseFactor;
                }
            }

            // Player vs SpaceObjects collision
            const soCount = this.spaceObjects ? this.spaceObjects.length : 0;
            for (let i = 0; i < soCount; i++) {
                const so = this.spaceObjects[i];
                const soDestroyed = so && (typeof so.isDestroyed === 'function' ? so.isDestroyed() : !!so.destroyed);
                if (!so || !so.pos || soDestroyed) continue;
                if (this.player.checkCollision(so)) {
                    const collisionDamage = Math.floor(this.player.vel.mag());
                    if (STAR_SYSTEM_DEBUG) console.log(`Player hit spaceObject! Damage: ${collisionDamage}`);
                    this.player.takeDamage(collisionDamage, so);
                    try { so.takeDamage(20, this.player, this); } catch (e) { try { so.takeDamage(20); } catch(_) {} }

                    // Play bump sound
                    try {
                        if (typeof soundManager !== 'undefined') {
                            const now = (typeof millis === 'function') ? millis() : Date.now();
                            if (!this._lastPlayerAsteroidBumpSoundTime || (now - this._lastPlayerAsteroidBumpSoundTime) > 250) {
                                soundManager.playWorldSound('bump', this.player.pos.x, this.player.pos.y, this.player.pos);
                                this._lastPlayerAsteroidBumpSoundTime = now;
                            }
                        }
                    } catch (e) {}

                    // Apply impulse to player (space objects are mostly static/lightweight)
                    const dx = so.pos.x - this.player.pos.x;
                    const dy = so.pos.y - this.player.pos.y;
                    const distSq = dx * dx + dy * dy;
                    const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
                    const normalizedX = dx * invDist;
                    const normalizedY = dy * invDist;
                    const playerImpulseFactor = 2.0;
                    this.player.vel.x -= normalizedX * playerImpulseFactor;
                    this.player.vel.y -= normalizedY * playerImpulseFactor;
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
                        // Special comet collision: destroys ship outright
                        if (asteroid.isComet) {
                            enemy.takeDamage(999999, asteroid); // Instant destruction
                            asteroid.takeDamage(10);
                        } else {
                            // Handle enemy-asteroid collision
                            enemy.takeDamage(10);
                            asteroid.takeDamage(10);
                        }
                        
                        // Apply physics push - optimized
                        const dx = asteroid.pos.x - enemy.pos.x;
                        const dy = asteroid.pos.y - enemy.pos.y;
                        const distSq = dx * dx + dy * dy;
                        const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
                        const normalizedX = dx * invDist * 2;
                        const normalizedY = dy * invDist * 2;
                        
                        enemy.vel.x -= normalizedX;
                        enemy.vel.y -= normalizedY;
                        asteroid.vel.x += normalizedX * 0.5;
                        asteroid.vel.y += normalizedY * 0.5;
                    }
                }
                // Enemy vs SpaceObject collisions
                if (this.spaceObjects && this.spaceObjects.length) {
                    for (let j = 0; j < this.spaceObjects.length; j++) {
                        const so = this.spaceObjects[j];
                        const soDestroyed = so && (typeof so.isDestroyed === 'function' ? so.isDestroyed() : !!so.destroyed);
                        if (!so || !so.pos || soDestroyed) continue;
                        if (enemy.checkCollision(so)) {
                            enemy.takeDamage(10);
                            try { so.takeDamage(10); } catch (e) { try { so.takeDamage(10); } catch(_) {} }

                            // Apply a small push to enemy
                            const dx = so.pos.x - enemy.pos.x;
                            const dy = so.pos.y - enemy.pos.y;
                            const distSq = dx * dx + dy * dy;
                            const invDist = distSq > 0 ? 1 / Math.sqrt(distSq) : 0;
                            const normalizedX = dx * invDist * 2;
                            const normalizedY = dy * invDist * 2;
                            enemy.vel.x -= normalizedX;
                            enemy.vel.y -= normalizedY;
                            if (so.vel) { so.vel.x += normalizedX * 0.5; so.vel.y += normalizedY * 0.5; }
                        }
                    }
                }
            }
            
            
        } catch(e) {
            console.error("Error in checkCollisions:", e);
        }
    } // End checkCollisions

/** 
 * Specifically handles projectile collisions with targets.
 * OPTIMIZED: Uses squared distance checks and reusable vectors.
 */
checkProjectileCollisions() {
    // Lazy init of reusable vector to avoid object creation in the loop
    if (!this._distCheckVector) this._distCheckVector = createVector(0, 0);
    
    const distCheckVector = this._distCheckVector;
    
    // Process projectiles using optimized collision detection
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        if (!proj || !proj.pos) {
            console.warn(`Invalid projectile at index ${i}, removing`);
            this.removeProjectile(i);
            continue;
        }
        
        const projPos = proj.pos;
        const projSize = proj.size || 3;
        let hit = false;
        
        // Check against asteroids using broadphase filtering
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
            const asteroid = this.asteroids[j];
            if (!asteroid || asteroid.isDestroyed()) continue;
            
            // Fast distance check before expensive collision detection
            const combinedRadius = asteroid.size + projSize;
            const combinedRadiusSquared = combinedRadius * combinedRadius;
            distCheckVector.set(asteroid.pos.x - projPos.x, asteroid.pos.y - projPos.y);
            
            if (distCheckVector.magSq() <= combinedRadiusSquared) {
                // Only do precise collision check if objects are close enough
                if (asteroid.checkCollision(proj)) {
                    asteroid.takeDamage(proj.damage || 1);
                    this.removeProjectile(i);
                    const explosionColor = [255, 120, 20];
                    this.addExplosion(projPos.x, projPos.y, 10, explosionColor);
                    
                    hit = true;
                    break;
                }
            }
        }

            // Check against decorative space objects (satellites, telescopes)
            if (!hit && this.spaceObjects && this.spaceObjects.length) {
                for (let j = this.spaceObjects.length - 1; j >= 0; j--) {
                    const so = this.spaceObjects[j];
                    const soDestroyed = so && (typeof so.isDestroyed === 'function' ? so.isDestroyed() : !!so.destroyed);
                    if (!so || soDestroyed) continue;

                    const combinedRadius = (so.size || 24) + projSize;
                    const combinedRadiusSquared = combinedRadius * combinedRadius;
                    distCheckVector.set(so.pos.x - projPos.x, so.pos.y - projPos.y);

                    if (distCheckVector.magSq() <= combinedRadiusSquared) {
                        if (so.checkCollision && so.checkCollision(proj)) {
                            try { so.takeDamage(proj.damage || 1, proj.owner, this); } catch (e) { console.error('Error damaging spaceObject', e); }
                            this.removeProjectile(i);
                            this.addExplosion(projPos.x, projPos.y, 8, [200,100,255]);
                            hit = true;
                            break;
                        }
                    }
                }
            }
        
        // If already hit something, skip the rest of the checks
        if (hit) continue;
        
        // Check against mines
        for (let j = this.mines.length - 1; j >= 0; j--) {
            const mine = this.mines[j];
            if (!mine || mine.destroyed) continue;
            
            // Mines don't get hit by their owner's projectiles
            if (proj.owner === mine.owner) continue;
            
            // Fast distance check
            const combinedRadius = mine.size + projSize;
            const combinedRadiusSquared = combinedRadius * combinedRadius;
            distCheckVector.set(mine.pos.x - projPos.x, mine.pos.y - projPos.y);
            
            if (distCheckVector.magSq() <= combinedRadiusSquared) {
                // Mine takes damage and projectile is destroyed
                mine.takeDamage(proj.damage || 10, proj.owner, this);
                this.removeProjectile(i);
                
                // Small explosion visual for hitting mine
                const explosionColor = [200, 100, 0];
                this.addExplosion(projPos.x, projPos.y, 5, explosionColor);
                
                hit = true;
                break;
            }
        }
        
        // If already hit something, skip the rest of the checks
        if (hit) continue;

        // --- Check collisions against missiles (other projectiles) ---
        // Allow projectiles (e.g., lasers, bullets) to hit missiles and damage/destroy them
        if (this.projectiles && this.projectiles.length > 0) {
            for (let j = this.projectiles.length - 1; j >= 0; j--) {
                // Skip self
                if (j === i) continue;
                const other = this.projectiles[j];
                if (!other || !other.pos) continue;
                // Only consider destructible missiles (projectiles marked as missile)
                if (!other._isMissile) continue;
                // Prevent friendly-fire hitting own missiles
                if (other.owner === proj.owner) continue;

                const combinedRadius = (other.size || 3) + projSize;
                const combinedRadiusSquared = combinedRadius * combinedRadius;
                distCheckVector.set(other.pos.x - projPos.x, other.pos.y - projPos.y);
                if (distCheckVector.magSq() <= combinedRadiusSquared && proj.checkCollision(other)) {
                    try {
                        // Apply damage to the missile
                        if (typeof other.takeDamage === 'function') {
                            other.takeDamage(proj.damage || 1, proj.owner, this);
                        } else {
                            // Fallback: remove missile immediately
                            other.lifespan = 0;
                            other.destroyed = true;
                            this.addExplosion(other.pos.x, other.pos.y, 8, [255,150,0]);
                        }
                    } catch (e) { console.error('Error applying damage to missile:', e); }

                    // Remove the projectile that struck the missile
                    this.removeProjectile(i);
                    // Small hit effect
                    this.addExplosion(projPos.x, projPos.y, 5, [255,200,0]);
                    hit = true;
                    break;
                }
            }
        }

        // Check against cargo - allow harpoon projectiles to attach cargo and pull it to the owner
        if (this.cargo && this.cargo.length) {
            for (let j = this.cargo.length - 1; j >= 0; j--) {
                const cargoItem = this.cargo[j];
                if (!cargoItem || cargoItem.collected) continue;
                // Skip cargo already attached to a ship (being reeled in)
                if (cargoItem.attached) continue;

                let combinedRadius = (cargoItem.size || 8) + projSize;
                // Give harpoon projectiles a larger effective hit-area for easier grabs
                if (proj.type === 'harpoon' || proj.type === 'HARPOON') {
                    const extra = Math.max(8, (cargoItem.size || 8) * 0.6);
                    combinedRadius += extra;
                }
                const combinedRadiusSquared = combinedRadius * combinedRadius;
                distCheckVector.set(cargoItem.pos.x - projPos.x, cargoItem.pos.y - projPos.y);

                // For harpoons accept the expanded broadphase as a hit; otherwise fall back to precise check
                const collisionPass = (proj.type === 'harpoon' || proj.type === 'HARPOON') ? true : proj.checkCollision(cargoItem);
                if (distCheckVector.magSq() <= combinedRadiusSquared && collisionPass) {
                    // Harpoon special-case: attach cargo to the firing ship
                    if (proj.type === 'harpoon' || proj.type === 'HARPOON') {
                        try {
                            cargoItem.attached = true;
                            cargoItem.attachedTo = proj.owner || null;
                            cargoItem.attachedBy = 'harpoon';
                            if (cargoItem.vel) { cargoItem.vel.x = 0; cargoItem.vel.y = 0; }
                            // small impact visual and sound
                            this.addExplosion(projPos.x, projPos.y, 4, [180,220,255]);
                            try { if (typeof soundManager !== 'undefined') soundManager.playWorldSound && soundManager.playWorldSound('harpoonFire', projPos.x, projPos.y, this.player.pos); } catch(_) {}
                        } catch (e) { console.error('Error attaching cargo to harpoon:', e); }
                        this.removeProjectile(i);
                        hit = true;
                        break;
                    } else {
                        // Non-harpoon projectiles simply create a small explosion and are removed
                        this.addExplosion(projPos.x, projPos.y, 6, [255,160,0]);
                        this.removeProjectile(i);
                        hit = true;
                        break;
                    }
                }
            }
        }
        
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
                            const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                            if (!this.harpoons) this.harpoons = [];
                            this.harpoons.push(har);
                            if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                console.log('Harpoon spawned (enemy->player)', { owner: owner.constructor ? owner.constructor.name : owner, target: 'player' });
                            }
                        }
                        // small impact visual and sound
                        this.addExplosion(projPos.x, projPos.y, 6, [180,220,255]);
                    } catch(e) { console.error('Failed to create Harpoon', e); }
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
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
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
                                const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                if (!this.harpoons) this.harpoons = [];
                                this.harpoons.push(har);
                                if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                    console.log('Harpoon spawned (player->enemy)', { owner: owner.constructor ? owner.constructor.name : owner, target: target.constructor ? target.constructor.name : target });
                                }
                            }
                            // small impact visual and sound
                            this.addExplosion(projPos.x, projPos.y, 6, [180,220,255]);
                        } catch(e) { console.error('Failed to create Harpoon', e); }
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
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
                // Skip if the enemy is shooting itself
                if (enemy !== proj.owner && proj.checkCollision(enemy)) {
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
                                const har = new Harpoon(owner, target, this, { segmentCount: 8, breakTension: 900, lifetime: 9000 });
                                if (!this.harpoons) this.harpoons = [];
                                this.harpoons.push(har);
                                if (typeof window !== 'undefined' && window.HARPOON_DEBUG) {
                                    console.log('Harpoon spawned (enemy->enemy)', { owner: owner.constructor ? owner.constructor.name : owner, target: target.constructor ? target.constructor.name : target });
                                }
                            }
                            this.addExplosion(proj.pos.x, proj.pos.y, 6, [180,220,255]);
                        } catch(e) { console.error('Failed to create Harpoon (enemy->enemy)', e); }
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
                        // Since it's fully collected, we can remove it immediately
                        this._fastRemove(this.cargo, i);
                        //console.log(`  Full pickup: Removed ${cargoItem.type}x${cargoItem.quantity}`);
                    }
                } else {
                     // Log why adding failed (e.g., cargo full)
                     //console.log(`  Add failed. Player Cargo: ${this.player.getCargoAmount()}/${this.player.cargoCapacity}, Reason: ${addResult.reason}`);
                     // Add UI message for failure if needed
                     if (addResult.reason === 'CARGO_FULL' && typeof uiManager !== 'undefined') {
                         // Avoid spamming this message - maybe only show once per few seconds?
                         // Simple approach: just show it
                         uiManager.addMessage(`Cargo hold full!`, [255, 200, 0]);
                     }
                }
            }
            // Note: Expiry check moved outside collision block, handled at the start of the loop iteration
        }
    }

    /** Adds a projectile to the system's list. */
    addProjectile(proj) {
        if (proj) {
            // Add this line to set the system reference
            proj.system = this;
            
          //  console.log(`[ADD] Projectile added. Count: ${this.projectiles.length + 1}`);
            this.projectiles.push(proj);
        }
    }

        // Add this method after the addProjectile method:
    
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

    /** Draws background stars using optimal multi-layer noise-based rendering. */
    drawBackground() {
        // Clear background with dark space color
        fill(0, 0, 0); 
        noStroke();
        rect(-width * 2, -height * 2, width * 4, height * 4);
        
        this.drawOptimalStarfield();
    }
    
drawOptimalStarfield() {
        // Cache global values once per frame
        const currentMillis = millis();
        const _width = width;
        const _height = height;
        
        // Resolution-independent base sizing
        // Cache pixelDensity to avoid function call overhead
        const pixelRatio = pixelDensity();
        const baseStarSize = Math.max(1, pixelRatio * 0.6);
        
        // Viewport bounds
        // Reduced padding slightly - 100 is usually sufficient for stars
        const padding = 100;
        const playerX = this.player.pos.x;
        const playerY = this.player.pos.y;
        
        const left = playerX - _width/2 - padding;
        const right = playerX + _width/2 + padding;
        const top = playerY - _height/2 - padding;
        const bottom = playerY + _height/2 + padding;
        
        // Optimized 3-layer approach
        // Layer 1: Background stars
        this.drawStarLayer(left, right, top, bottom, {
            gridSize: 45,
            maxStarsPerCell: 3,
            sizeRange: [baseStarSize * 0.5, baseStarSize * 1.5],
            brightnessRange: [80, 160],
            colorTypes: ['white', 'white', 'white', 'blue', 'yellow']
        }, currentMillis);
        
        // Layer 2: Rare bright feature stars
        this.drawStarLayer(left, right, top, bottom, {
            gridSize: 200,
            maxStarsPerCell: 1,
            sizeRange: [baseStarSize * 2.0, baseStarSize * 4.0],
            brightnessRange: [180, 255],
            colorTypes: ['white', 'white', 'blue', 'yellow', 'red']
        }, currentMillis);
        
        // Layer 3: Spectacular phenomena
        this.drawSpectacularStars(left, right, top, bottom, baseStarSize, currentMillis);
    }
    
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
                        rect(worldX - size, worldY - twinkleSize/2, size * 2, twinkleSize);
                        rect(worldX - twinkleSize/2, worldY - size, twinkleSize, size * 2);
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

    /** Draws all system contents. */
    draw() {
        if (!this.player || !this.player.pos) return;

        push();
        // Calculate translation based on this.player position
        let tx = width / 2 - this.player.pos.x;
        let ty = height / 2 - this.player.pos.y;
        translate(tx, ty);

        // Calculate screen bounds once (with margin)
        const screenBounds = {
            left: -tx - 100,
            right: -tx + width + 100,
            top: -ty - 100,
            bottom: -ty + height + 100
        };

        // Draw background (always visible)
        this.drawBackground();

        // --- Draw Jump Zone ---
        // Call this early so other objects draw on top if needed
        this.drawJumpZone(this.player.pos);
        // ---

        // Draw nebulae (draw first for background effect)
        for (let nebula of this.nebulae) {
            nebula.draw(screenBounds);
        }

        // Draw cosmic storms (after nebulae but before ships)
        for (let storm of this.cosmicStorms) {
            storm.draw(screenBounds);
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

        // Determine sun position using the first planet if it exists
        let sunPos = this.planets.length > 0 ? this.planets[0].pos : createVector(0,0);

        // Draw only visible planets
        for (let i = 0; i < this.planets.length; i++) {
            const p = this.planets[i];
            if (this.isInView(p.pos.x, p.pos.y, p.size * 1.5, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                p.draw(sunPos);
            }
        }

        // Draw only visible asteroids
        for (let i = 0; i < this.asteroids.length; i++) {
            const a = this.asteroids[i];
            if (this.isInView(a.pos.x, a.pos.y, a.maxRadius * 2, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                a.draw();
            }
        }

        // Draw decorative space objects (satellites, telescopes)
        if (this.spaceObjects && this.spaceObjects.length) {
            for (let i = 0; i < this.spaceObjects.length; i++) {
                const so = this.spaceObjects[i];
                if (!so || !so.pos) continue;
                if (this.isInView(so.pos.x, so.pos.y, so.size * 1.5, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                    try { so.draw(); } catch(e) { console.error('SpaceObject.draw error', e); }
                }
            }
        }

        // Draw only visible cargo
        if (this.cargo && this.cargo.length > 0) {
            for (let i = 0; i < this.cargo.length; i++) {
                const c = this.cargo[i];
                // Use 1.5 instead of 4, matching other objects' visibility ranges
                if (this.isInView(c.pos.x, c.pos.y, c.size * 1.5, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                    c.draw();
                }
            }
        }

        // Draw only visible enemies
        for (let i = 0; i < this.enemies.length; i++) {
            const e = this.enemies[i];
            if (this.isInView(e.pos.x, e.pos.y, e.size * 2, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                e.draw();
            }
        }

        // Draw only visible projectiles
        for (let i = 0; i < this.projectiles.length; i++) {
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
                const b = h.segments && h.segments[h.segments.length-1] && h.segments[h.segments.length-1];
                if (!a || !b) continue;
                if (this.isInView(a.x, a.y, 4, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom) ||
                    this.isInView(b.x, b.y, 4, screenBounds.left, screenBounds.right, screenBounds.top, screenBounds.bottom)) {
                    try { h.draw && h.draw(); } catch(e) {}
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
        for (let i = 0; i < this.explosions.length; i++) {
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
            galaxyPos: { x: this.galaxyPos?.x || 0, y: this.galaxyPos?.y || 0 },
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
            secretStations: this.secretStations && this.secretStations.length > 0
                ? this.secretStations.map(s => s.toJSON())
                : [],
            // Save nebulae if present
            nebulae: Array.isArray(this.nebulae) && this.nebulae.length > 0
                ? this.nebulae.map(n => (typeof n.toJSON === 'function' ? n.toJSON() : null))
                : [],
            // Save decorative space objects (satellites, telescopes, etc.)
            spaceObjects: Array.isArray(this.spaceObjects) && this.spaceObjects.length > 0
                ? this.spaceObjects.map(so => (typeof so.toJSON === 'function' ? so.toJSON() : {
                    type: so.type || null,
                    x: so.pos ? (so.pos.x || 0) : null,
                    y: so.pos ? (so.pos.y || 0) : null,
                    size: so.size || null,
                    destroyed: !!so.destroyed,
                    state: so.state || null,
                    subtype: so.subtype || null
                }))
                : [],
            // --- Add Jump Zone Data ---
            jumpZoneCenterX: this.jumpZoneCenter ? this.jumpZoneCenter.x : null,
            jumpZoneCenterY: this.jumpZoneCenter ? this.jumpZoneCenter.y : null,
            jumpZoneRadius: this.jumpZoneRadius,
            // Add wanted status properties
            // Store a boolean and the remaining ms until expiry (portable across sessions)
            playerWanted: !!this.playerWanted,
            playerWantedLevel: this.playerWantedLevel ?? 0,
            playerWantedRemainingMs: (this.playerWantedExpiry ? Math.max(0, this.playerWantedExpiry - millis()) : null),
            policeAlertSent: !!this.policeAlertSent,
            // ---
            // Dynamic entities (serialized when possible)
            enemies: Array.isArray(this.enemies) && this.enemies.length > 0
                ? this.enemies.map(e => (typeof e.toJSON === 'function' ? e.toJSON() : {
                    shipType: e.shipTypeName || e.shipType || null,
                    role: e.role || null,
                    pos: e.pos ? { x: e.pos.x, y: e.pos.y } : null,
                    vel: e.vel ? { x: e.vel.x, y: e.vel.y } : null,
                    hp: e.hp ?? e.health ?? null,
                    angle: e.angle ?? null,
                    state: e.currentState ?? null,
                    id: e.id ?? null
                }))
                : [],
            projectiles: Array.isArray(this.projectiles) && this.projectiles.length > 0
                ? this.projectiles.map(p => (typeof p.toJSON === 'function' ? p.toJSON() : {
                    type: p.type || null,
                    pos: p.pos ? { x: p.pos.x, y: p.pos.y } : null,
                    vel: p.vel ? { x: p.vel.x, y: p.vel.y } : null,
                    lifespan: p.lifespan ?? null,
                    ownerId: p.owner ? (p.owner.id || p.owner.shipTypeName || null) : null
                }))
                : [],
            asteroids: Array.isArray(this.asteroids) && this.asteroids.length > 0
                ? this.asteroids.map(a => (typeof a.toJSON === 'function' ? a.toJSON() : {
                    pos: a.pos ? { x: a.pos.x, y: a.pos.y } : null,
                    size: a.size || null,
                    isComet: !!a.isComet
                }))
                : [],
            cargo: Array.isArray(this.cargo) && this.cargo.length > 0
                ? this.cargo.map(c => (typeof c.toJSON === 'function' ? c.toJSON() : c))
                : [],
            mines: Array.isArray(this.mines) && this.mines.length > 0
                ? this.mines.map(m => (typeof m.toJSON === 'function' ? m.toJSON() : {
                    pos: m.pos ? { x: m.pos.x, y: m.pos.y } : null,
                    size: m.size || null,
                    ownerId: m.owner ? (m.owner.id || m.owner.shipTypeName || null) : null
                }))
                : [],
            beams: Array.isArray(this.beams) && this.beams.length > 0
                ? this.beams.map(b => (typeof b.toJSON === 'function' ? b.toJSON() : b))
                : [],
            forceWaves: Array.isArray(this.forceWaves) && this.forceWaves.length > 0
                ? this.forceWaves.map(f => (typeof f.toJSON === 'function' ? f.toJSON() : f))
                : [],
            harpoons: Array.isArray(this.harpoons) && this.harpoons.length > 0
                ? this.harpoons.map(h => (typeof h.toJSON === 'function' ? h.toJSON() : h))
                : [],
            explosions: Array.isArray(this.explosions) && this.explosions.length > 0
                ? this.explosions.map(x => (typeof x.toJSON === 'function' ? x.toJSON() : x))
                : [],
            staticElementsInitialized: this.staticElementsInitialized // Save initialization state
        };
    }

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
        
        // Restore Nebulae if present
        if (data.nebulae && Array.isArray(data.nebulae)) {
            sys.nebulae = data.nebulae.map(nebulaData => Nebula.fromJSON(nebulaData));
        }

        // Restore Space Objects if present
        if (data.spaceObjects && Array.isArray(data.spaceObjects)) {
            sys.spaceObjects = [];
            for (const soData of data.spaceObjects) {
                try {
                    if (typeof SpaceObject !== 'undefined' && typeof SpaceObject.fromJSON === 'function') {
                        sys.spaceObjects.push(SpaceObject.fromJSON(soData));
                    } else if (typeof SpaceObject !== 'undefined') {
                        const x = soData.x ?? (soData.pos && soData.pos.x) ?? 0;
                        const y = soData.y ?? (soData.pos && soData.pos.y) ?? 0;
                        const type = soData.type || 'satellite';
                        const obj = new SpaceObject(x, y, type);
                        if (soData.size !== undefined && obj.size !== undefined) obj.size = soData.size;
                        if (soData.destroyed) obj.destroyed = true;
                        if (soData.state !== undefined) obj.state = soData.state;
                        if (soData.subtype !== undefined) obj.subtype = soData.subtype;
                        if (soData.planetIndex !== undefined && soData.planetIndex !== null) {
                            obj.planetIndex = soData.planetIndex;
                            if (Array.isArray(sys.planets) && sys.planets[soData.planetIndex]) obj.planet = sys.planets[soData.planetIndex];
                        }
                        if (soData.vel && obj.vel) { obj.vel.x = soData.vel.x || 0; obj.vel.y = soData.vel.y || 0; }
                        sys.spaceObjects.push(obj);
                    }
                } catch (e) {
                    console.error('Error restoring spaceObject', e, soData);
                }
            }
        }

        // --- Restore Jump Zone Data ---
        if (data.jumpZoneCenterX !== null && data.jumpZoneCenterY !== null && typeof createVector === 'function') {
            sys.jumpZoneCenter = createVector(data.jumpZoneCenterX, data.jumpZoneCenterY);
        } else {
            sys.jumpZoneCenter = null; // Ensure it's null if not saved properly or p5 not ready
        }
        sys.jumpZoneRadius = data.jumpZoneRadius ?? JUMP_ZONE_DEFAULT_RADIUS;
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

        // --- Restore dynamic entities (enemies, projectiles, etc.) ---
        // Enemies (ships)
        sys.enemies = [];
        if (Array.isArray(data.enemies)) {
            if (typeof Enemy !== 'undefined' && typeof Enemy.fromJSON === 'function') {
                try {
                    sys.enemies = data.enemies.map(ed => Enemy.fromJSON(ed));
                    for (const en of sys.enemies) { if (en) en.currentSystem = sys; }
                } catch (e) { console.error('Error restoring enemies via Enemy.fromJSON', e); }
            } else if (typeof Enemy !== 'undefined') {
                for (const ed of data.enemies) {
                    try {
                        const px = ed?.pos?.x ?? (ed.x ?? 0);
                        const py = ed?.pos?.y ?? (ed.y ?? 0);
                        const shipType = ed.shipType || ed.shipTypeName || 'Krait';
                        const role = ed.role || (typeof AI_ROLE !== 'undefined' ? AI_ROLE.HAULER : null);
                        const enemy = new Enemy(px, py, null, shipType, role);
                        if (ed.vel && enemy.vel) { enemy.vel.x = ed.vel.x || 0; enemy.vel.y = ed.vel.y || 0; }
                        if (ed.hp !== undefined) { enemy.hp = ed.hp; }
                        if (ed.angle !== undefined) { enemy.angle = ed.angle; }
                        if (ed.state !== undefined && typeof enemy.changeState === 'function') { enemy.changeState(ed.state); }
                        enemy.currentSystem = sys;
                        sys.enemies.push(enemy);
                    } catch (e) { console.error('Error restoring enemy (fallback)', e, ed); }
                }
            }
        }

        // Projectiles
        sys.projectiles = [];
        if (Array.isArray(data.projectiles)) {
            if (typeof Projectile !== 'undefined' && typeof Projectile.fromJSON === 'function') {
                try { sys.projectiles = data.projectiles.map(pd => Projectile.fromJSON(pd)); } catch (e) { console.error('Error restoring projectiles', e); }
            } else {
                console.warn('Projectile.fromJSON not available; skipping projectile restore');
            }
        }

        // Asteroids
        sys.asteroids = [];
        if (Array.isArray(data.asteroids)) {
            if (typeof Asteroid !== 'undefined' && typeof Asteroid.fromJSON === 'function') {
                try { sys.asteroids = data.asteroids.map(ad => Asteroid.fromJSON(ad)); } catch (e) { console.error('Error restoring asteroids', e); }
            } else {
                console.warn('Asteroid.fromJSON not available; skipping asteroid restore');
            }
        }

        // Cargo
        sys.cargo = [];
        if (Array.isArray(data.cargo)) {
            if (typeof Cargo !== 'undefined' && typeof Cargo.fromJSON === 'function') {
                try { sys.cargo = data.cargo.map(cd => Cargo.fromJSON(cd)); } catch (e) { console.error('Error restoring cargo', e); }
            } else {
                // Attempt minimal restoration
                for (const cd of data.cargo) {
                    try { sys.cargo.push(cd); } catch(e){}
                }
            }
        }

        // Mines
        sys.mines = [];
        if (Array.isArray(data.mines)) {
            if (typeof Mine !== 'undefined' && typeof Mine.fromJSON === 'function') {
                try { sys.mines = data.mines.map(md => Mine.fromJSON(md)); } catch (e) { console.error('Error restoring mines', e); }
            } else {
                console.warn('Mine.fromJSON not available; skipping mine restore');
            }
        }

        // Beams
        sys.beams = [];
        if (Array.isArray(data.beams)) {
            if (typeof Beam !== 'undefined' && typeof Beam.fromJSON === 'function') {
                try { sys.beams = data.beams.map(bd => Beam.fromJSON(bd)); } catch (e) { console.error('Error restoring beams', e); }
            } else {
                console.warn('Beam.fromJSON not available; skipping beam restore');
            }
        }

        // Force waves
        sys.forceWaves = [];
        if (Array.isArray(data.forceWaves)) {
            if (typeof ForceWave !== 'undefined' && typeof ForceWave.fromJSON === 'function') {
                try { sys.forceWaves = data.forceWaves.map(fd => ForceWave.fromJSON(fd)); } catch (e) { console.error('Error restoring forceWaves', e); }
            } else {
                console.warn('ForceWave.fromJSON not available; skipping restore');
            }
        }

        // Harpoons
        sys.harpoons = [];
        if (Array.isArray(data.harpoons)) {
            if (typeof Harpoon !== 'undefined' && typeof Harpoon.fromJSON === 'function') {
                try { sys.harpoons = data.harpoons.map(hd => Harpoon.fromJSON(hd)); } catch (e) { console.error('Error restoring harpoons', e); }
            } else {
                console.warn('Harpoon.fromJSON not available; skipping harpoon restore');
            }
        }

        // Explosions
        sys.explosions = [];
        if (Array.isArray(data.explosions)) {
            if (typeof Explosion !== 'undefined' && typeof Explosion.fromJSON === 'function') {
                try { sys.explosions = data.explosions.map(xd => Explosion.fromJSON(xd)); } catch (e) { console.error('Error restoring explosions', e); }
            } else {
                console.warn('Explosion.fromJSON not available; skipping explosion restore');
            }
        }

        // --- Post-load relinking helpers ---
        // Build id map and attempt to reconnect owner/target references
        sys._postLoadRelink = function() {
            const makeVector = (v) => {
                if (!v) return null;
                return (typeof createVector === 'function' && v && typeof v.x === 'number') ? createVector(v.x, v.y) : { x: (v.x || 0), y: (v.y || 0) };
            };

            const idMap = new Map();
            if (Array.isArray(this.enemies)) {
                for (const e of this.enemies) {
                    if (e && (e.id !== undefined && e.id !== null)) idMap.set(String(e.id), e);
                    try { e.currentSystem = this; } catch(_) {}
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
                                    try { if (typeof e.onStateEntry === 'function') e.onStateEntry(AI_STATE.GUARDING, { principal }); } catch(_) {}
                                } else {
                                    try { if (typeof e.changeState === 'function') e.changeState(AI_STATE.GUARDING, { principal }); } catch(_) {}
                                }
                            }
                        }
                        e.currentSystem = this;
                    } catch (err) { console.warn('enemy relink error', err); }
                }
            }
        };

        sys.relinkReferences = function(player) {
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
     * Checks if an entity should be despawned based on distance from player
     * @param {Object} entity - The entity to check (must have pos property)
     * @param {number} [factorMultiplier=1.1] - Optional multiplier for despawn radius
     * @return {boolean} Whether the entity should be despawned
     */
    shouldDespawnEntity(entity, factorMultiplier = 1.1) {
        if (!this.player || !entity || !entity.pos) return false;
        
        const distToPlayerSq = sq(entity.pos.x - this.player.pos.x) + sq(entity.pos.y - this.player.pos.y);
        const despawnDistanceSq = sq(this.despawnRadius * factorMultiplier);
        
        return distToPlayerSq > despawnDistanceSq;
    }
    
    /**
     * Fast array element removal - swap with last element then pop.
     * Much faster than splice() for large arrays (O(1) vs O(n)).
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
        if (!this.planets || this.planets.length === 0) return;
        if (typeof SpaceObject === 'undefined') return;

        // Define space object types by economy type
        const typesByEconomy = {
            'Industrial': ['miningPlatform', 'cargoCluster', 'engineArray', 'satellite', 'relay', 'debris', 'probe', 'asteroidMiner', 'fuelDepot', 'solarFarm', 'wreckage', 'weaponPlatform', 'shieldGenerator', 'energyCollector'],
            'Refinery': ['miningPlatform', 'cargoCluster', 'engineArray', 'satellite', 'relay', 'debris', 'probe', 'asteroidMiner', 'fuelDepot', 'solarFarm', 'wreckage', 'weaponPlatform', 'shieldGenerator', 'energyCollector'],
            'Mining': ['miningPlatform', 'cargoCluster', 'engineArray', 'satellite', 'relay', 'debris', 'probe', 'asteroidMiner', 'fuelDepot', 'solarFarm', 'wreckage', 'weaponPlatform', 'shieldGenerator', 'energyCollector'],
            'Agricultural': ['orbitalGarden', 'habitat', 'satellite', 'telescope', 'relay', 'probe', 'beacon', 'observatoryDome', 'hydroponicsBay'],
            'High Tech': ['researchArray', 'solarSail', 'ancientRelic', 'satellite', 'telescope', 'beacon', 'signalFlare', 'spaceStation', 'commDish', 'iceCrystal', 'nebulaFragment', 'alienArtifact', 'quantumGate']
        };

        // Default types for other economies
        const defaultTypes = ['satellite', 'telescope', 'relay', 'debris', 'probe', 'beacon', 'solarSail', 'cargoCluster', 'decoyBuoy', 'habitat', 'researchArray', 'orbitalGarden', 'ancientRelic', 'signalFlare', 'spaceStation', 'asteroidMiner', 'fuelDepot', 'commDish', 'solarFarm', 'iceCrystal', 'nebulaFragment', 'alienArtifact', 'wreckage', 'observatoryDome', 'hydroponicsBay', 'weaponPlatform', 'shieldGenerator', 'energyCollector', 'quantumGate'];

        const availableTypes = typesByEconomy[this.economyType] || defaultTypes;

        for (let i = 1; i < this.planets.length; i++) {
            const planet = this.planets[i];
            if (['Industrial', 'Refinery', 'Mining'].includes(this.economyType)) {
                // Always spawn at least one mining platform
                const angle = random(TWO_PI);
                const dist = random(planet.size * 0.2, planet.size * 0.6);
                const x = planet.pos.x + Math.cos(angle) * dist;
                const y = planet.pos.y + Math.sin(angle) * dist;
                try {
                    const obj = new SpaceObject(x, y, 'miningPlatform');
                        obj.planetIndex = planet.planetIndex || i;
                    this.spaceObjects.push(obj);
                } catch (e) {
                    console.error('Failed to create mining platform SpaceObject', e);
                }

                // Add 0-2 additional random objects
                const extra = Math.floor(random(0, 3)); // 0, 1, or 2
                for (let i = 0; i < extra; i++) {
                    const type = random(availableTypes);
                    const angle2 = random(TWO_PI);
                    const dist2 = random(planet.size * 0.2, planet.size * 0.6);
                    const x2 = planet.pos.x + Math.cos(angle2) * dist2;
                    const y2 = planet.pos.y + Math.sin(angle2) * dist2;
                    try {
                        const obj2 = new SpaceObject(x2, y2, type);
                        obj2.planetIndex = planet.planetIndex || i;
                        this.spaceObjects.push(obj2);
                    } catch (e) {
                        console.error('Failed to create additional SpaceObject', e);
                    }
                }
            } else {
                // For other systems, spawn 1-3 random objects
                const numObjects = Math.floor(random(1, 4)); // 1 to 3
                for (let i = 0; i < numObjects; i++) {
                    const type = random(availableTypes);
                    const angle = random(TWO_PI);
                    const dist = random(planet.size * 0.2, planet.size * 0.6);
                    const x = planet.pos.x + Math.cos(angle) * dist;
                    const y = planet.pos.y + Math.sin(angle) * dist;
                    try {
                        const obj = new SpaceObject(x, y, type);
                        obj.planetIndex = planet.planetIndex || i;
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
            for (let i = 0; i < numJumpObjects; i++) {
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
     * Adds an enemy to the system with proper references
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
