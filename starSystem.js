// ****** StarSystem.js ******

// Build ship role arrays from SHIP_DEFINITIONS
const buildShipRoleArrays = () => {
    const POLICE_SHIPS = [];
    const PIRATE_SHIPS = [];
    const HAULER_SHIPS = [];
    const TRANSPORT_SHIPS = [];
    const MILITARY_SHIPS = [];
    const ALIEN_SHIPS = [];
    const EXPLORER_SHIPS = [];
    const BOUNTY_HUNTER_SHIPS = [];
    const GUARD_SHIPS = [];
    const IMPERIAL_SHIPS = [];
    const SEPARATIST_SHIPS = [];
    
    // Iterate through all ship definitions
    for (const [shipKey, shipData] of Object.entries(SHIP_DEFINITIONS)) {
        if (!shipData.aiRoles || !Array.isArray(shipData.aiRoles)) continue;
        
        // Add ship to appropriate role arrays based on its aiRoles
        if (shipData.aiRoles.includes("POLICE")) POLICE_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("PIRATE")) PIRATE_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("HAULER")) HAULER_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("TRANSPORT")) TRANSPORT_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("MILITARY")) MILITARY_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("ALIEN")) ALIEN_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("EXPLORER")) EXPLORER_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("BOUNTY_HUNTER")) BOUNTY_HUNTER_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("GUARD")) GUARD_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("IMPERIAL")) IMPERIAL_SHIPS.push(shipKey);
        if (shipData.aiRoles.includes("SEPARATIST")) SEPARATIST_SHIPS.push(shipKey);
        
    }
    
    return {
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
        SEPARATIST_SHIPS
    };
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
    SEPARATIST_SHIPS
} = buildShipRoleArrays();

// Log the generated arrays to verify
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
        console.log("StarSystem constructor called for", name);
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
        this.projectiles = [];
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

        // Add a system-specific player wanted status
        this.playerWanted = false;
        
        // Optionally track wanted level and expiration time
        this.playerWantedLevel = 0; // 0-5 scale
        this.playerWantedExpiry = null; // Timestamp when wanted status expires

        // Initialize new arrays for nebulae, cosmic storms, and asteroid fields
        this.nebulae = [];
        this.cosmicStorms = [];
    }

    /**
     * Sets player wanted status in this system
     * @param {boolean} wanted - New wanted status
     * @param {number} level - Optional wanted level (1-5)
     * @param {number} duration - Optional duration in seconds before expiry
     */
    setPlayerWanted(wanted, level = 1, duration = null) {
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
        // Don't skip initialization if stars are missing
        if (this.staticElementsInitialized && this.bgStars && this.bgStars.length > 0) {
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

        // --- Seeded Visual Background Elements ---
        try { this.starColor = color(random(200, 255), random(150, 255), random(50, 150)); } catch(e) { this.starColor = color(255, 255, 0);} // Fallback color yellow
        try { this.starSize = random(50, 150); } catch(e) { this.starSize = 100; } // Fallback size

        this.bgStars = []; let worldBounds = this.despawnRadius * 1.5; let numBgStars = 10000; // Default star count
        try { numBgStars = floor(random(1000, 10000)); } catch(e) {} // Use default on error
        try { // Generate background stars using seeded random
            for (let i = 0; i < numBgStars; i++) {
                this.bgStars.push({
                    x: random(-worldBounds, worldBounds),
                    y: random(-worldBounds, worldBounds),
                    size: random(1, 3)
                });
            }
        } catch(e) { console.error("Error generating background stars:", e); }

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
        this.planets.push(Planet.createSun());

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

            // Create the planet with the computed world coordinates
            let planet = new Planet(px, py, sz, c1, c2);
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

    /** Draws the Jump Zone marker if the player is close enough. Assumes called within translated space. */
    drawJumpZone(playerPos) {
        if (!this.jumpZoneCenter || this.jumpZoneRadius <= 0) return;

        // Only draw if player is relatively close
        const maxDrawDist = this.jumpZoneRadius * JUMP_ZONE_DRAW_RANGE_FACTOR;
        const distToPlayer = dist(playerPos.x, playerPos.y, this.jumpZoneCenter.x, this.jumpZoneCenter.y);

        if (distToPlayer < maxDrawDist) {
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
        this.enemies = []; this.projectiles = []; this.asteroids = [];
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
            chosenRole = AI_ROLE.HAULER; // Military systems might have military haulers
            chosenShipTypeName = random(MILITARY_SHIPS.length > 0 ? MILITARY_SHIPS : HAULER_SHIPS); // Prefer military ships if available

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
                if (POLICE_SHIPS.length > 0) { 
                    rolesToConsider.push({ role: AI_ROLE.POLICE, ships: POLICE_SHIPS });
                }

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
            } else if (rand < 0.50 && MILITARY_SHIPS.length > 0) {
                chosenRole = AI_ROLE.HAULER; 
                chosenShipTypeName = random(MILITARY_SHIPS);
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
                chosenRole = AI_ROLE.HAULER; // Or another role if you want
                chosenShipTypeName = random(SEPARATIST_SHIPS.length > 0 ? SEPARATIST_SHIPS : HAULER_SHIPS);
        } else if (econ === "imperial") {
                chosenRole = AI_ROLE.HAULER; // Or another role if you want
                chosenShipTypeName = random(IMPERIAL_SHIPS.length > 0 ? IMPERIAL_SHIPS : HAULER_SHIPS);

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
                if (typeof soundManager !== 'undefined') soundManager.playSound('thargoid');
            }
        }
        
        if (!chosenShipTypeName) {
            console.warn("StarSystem: chosenShipTypeName was undefined after role selection, defaulting to Krait (Hauler). Role was:", chosenRole);
            chosenShipTypeName = "Krait";
            if (!chosenRole) chosenRole = AI_ROLE.HAULER;
        }


        // --- Spawn the ship ---
        let angle = random(TWO_PI);
        let spawnDist = sqrt(sq(width/2) + sq(height/2)) + random(150, 400);
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
            console.log(`Spawned ${guardNPC.shipTypeName} (Guard) for large hauler ${newEnemy.shipTypeName}`);
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
        console.log(`Spawned ${guardNPC.shipTypeName} (Guard) for large hauler ${newEnemy.shipTypeName}`);
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
                
                console.log(`New police ${newEnemy.shipTypeName} immediately pursuing wanted player!`);
            }
            
        } catch(e) { 
            console.error("!!! ERROR during trySpawnNPC (Enemy creation/init):", e, "Chosen Ship:", chosenShipTypeName, "Role:", chosenRole); 
        }
    }



    /** Attempts to spawn an asteroid at regular intervals. */
    trySpawnAsteroid() {
        if (!this.player?.pos || this.asteroids.length >= this.maxTotalAsteroids) return;
        try {
            let angle = random(TWO_PI); let spawnDist = sqrt(sq(width/2)+sq(height/2))+random(200,500);
            let spawnX = this.player.pos.x + cos(angle)*spawnDist; let spawnY = this.player.pos.y + sin(angle)*spawnDist;
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

    /** Updates all system entities. */
    update() {
        if (!this.player || !this.player.pos) return;
        try {
            // Calculate screen bounds for visibility checks (used by asteroids and planets)
            // Store as instance variable to reuse in draw() method
            const tx = width / 2 - this.player.pos.x;
            const ty = height / 2 - this.player.pos.y;
            this.screenBounds = {
                left: -tx - 100,
                right: -tx + width + 100,
                top: -ty - 100,
                bottom: -ty + height + 100
            };

            // Update Enemies
            for (let i = this.enemies.length - 1; i >= 0; i--) {
                const enemy = this.enemies[i]; if (!enemy) { this.enemies.splice(i, 1); continue; }
                try{ enemy.update(this); } catch(e){ console.error("Err updating Enemy:",e,enemy); }
                
                if (enemy.isDestroyed()) {
                    this.enemies.splice(i, 1); continue;
                }

                if (this.shouldDespawnEntity(enemy, 1.1)) {
                    this.enemies.splice(i, 1);
                    continue;
                }
            }

            // --- Update Asteroids & Handle Destruction/Despawn ---
            for (let i = this.asteroids.length - 1; i >= 0; i--) {
                const asteroid = this.asteroids[i]; if (!asteroid) { this.asteroids.splice(i, 1); continue; }
                
                // Update all asteroids regardless of visibility
                try{ asteroid.update(); } catch(e){ console.error("Err updating Asteroid:",e,asteroid); }

                if (asteroid.isDestroyed()) {
                    // --- Spawn Mineral Cargo on Asteroid Destruction ---
                    if (random() < 0.75) { // 75% chance to drop minerals
                        const mineralType = "Minerals";
                        let quantity = floor(map(asteroid.size, 30, 90, 1, 5)); // Quantity based on size
                        quantity = max(1, quantity); // Ensure at least 1 unit

                        // Create cargo slightly offset to avoid instant pickup or overlap if multiple drop
                        const offsetX = random(-asteroid.size * 0.2, asteroid.size * 0.2);
                        const offsetY = random(-asteroid.size * 0.2, asteroid.size * 0.2);

                        const cargoDrop = new Cargo(asteroid.pos.x + offsetX, asteroid.pos.y + offsetY, mineralType, quantity);
                        this.addCargo(cargoDrop); // Use the existing addCargo method
                        console.log(`Asteroid destroyed, dropped ${quantity}t of ${mineralType}`);
                    }
                    // --- End Mineral Cargo Spawn ---

                    this.asteroids.splice(i, 1); 
                    continue; 
                }

                if (this.shouldDespawnEntity(asteroid, 1.2)) {
                    this.asteroids.splice(i, 1);
                    continue;
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

            // Improved cargo update and collection logic - place in StarSystem.update() method
            // Update cargo items and handle collection
            if (this.cargo && this.cargo.length > 0) {
                // FIRST: Remove any already collected or expired cargo
                this.cargo = this.cargo.filter(cargo => !cargo.collected && !cargo.isExpired());
                
                // THEN: Update remaining cargo
                for (let i = 0; i < this.cargo.length; i++) {
                    this.cargo[i].update();
                }
                
                // FINALLY: Check for player collection on valid cargo
                this.handleCargoCollection();
            }

            // Update Beams
            this.updateBeams && this.updateBeams();



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
                const batchSize = 20; // Process 5 entities per frame
                const remainingEntities = wave.entitiesToProcess.length - wave.processedCount;
                const entitiesToProcessNow = Math.min(remainingEntities, batchSize);
                
                for (let j = 0; j < entitiesToProcessNow; j++) {
                    const entity = wave.entitiesToProcess[wave.processedCount + j];
                    
                    // Skip if entity is invalid or already processed
                    if (!entity || !entity.pos || wave.processed[entity.id || entity]) continue;
                    
                    // Calculate distance from wave center to entity
                    const dist = p5.Vector.dist(wave.pos, entity.pos);
                    
                    // If entity is within wave radius, apply damage
                    if (dist < wave.radius + entity.size/2) {

                       // Use normalized distance ratio based on maximum radius
                        const distRatio = dist / (wave.maxRadius + entity.size/2);
                        
                        // Use a gentler falloff curve with reduced distance impact
                        const falloff = Math.pow(1 - distRatio, 0.9); // Increase the exponent to reduce falloff
                        
                        // Ensure meaningful minimum damage
                        const minDamage = Math.max(40, Math.floor(wave.damage * 0.5)); // Increase the minimum damage
                        const dmg = Math.max(minDamage, Math.floor(wave.damage * falloff));

                        // Apply damage and mark as processed
                        entity.takeDamage(dmg, wave.owner);
                        wave.processed[entity.id || entity] = true;

                        // Add this temporary debug line:
                        console.log(`Force wave hit ${entity.constructor.name} for ${dmg} damage (${entity.hull}/${entity.maxHull} hull)`);
                        
                        // Apply knockback force
                        if (entity.vel) {
                            // Create a NEW vector for knockback direction to avoid modifying the original
                            const knockbackDir = p5.Vector.sub(entity.pos, wave.pos).normalize();
                            
                            // Scale force based on how close the entity is to the center (stronger at center)
                            const forceMagnitude = map(distRatio, 0, 1, 15, 5);
                            
                            // Apply force without modifying the direction vector first
                            entity.vel.add(p5.Vector.mult(knockbackDir, forceMagnitude));
                            
                            // Debug output to verify knockback
                            console.log(`Applied knockback with magnitude ${forceMagnitude} to ${entity.constructor.name}`);
                        }
                    }
                }
                
                // Update processed count
                wave.processedCount += entitiesToProcessNow;
                
                // Remove wave if it reaches max size and all entities processed
                if (wave.radius >= wave.maxRadius && wave.processedCount >= wave.entitiesToProcess.length) {
                    this.forceWaves.splice(i, 1);
                }
            }

            // Update explosions
            for (let i = this.explosions.length - 1; i >= 0; i--) {
                this.explosions[i].update();
                if (this.explosions[i].isDone()) {
                    // Return to pool if WeaponSystem is available
                    if (typeof WeaponSystem !== 'undefined' && typeof WeaponSystem.releaseExplosion === 'function') {
                        WeaponSystem.releaseExplosion(this.explosions[i]);
                    }
                    
                    // Use fast removal technique - swap with last element then pop
                    const lastIndex = this.explosions.length - 1;
                    if (i !== lastIndex) {
                        this.explosions[i] = this.explosions[lastIndex]; 
                    }
                    this.explosions.pop(); // Much faster than splice for large arrays
                }
            }

            // Update nebulae
            for (let nebula of this.nebulae) {
                nebula.update();
                
                // Apply effects to player
                if (this.player) {
                    nebula.applyEffects(this.player);
                }
                
                // Apply effects to enemies
                for (let enemy of this.enemies) {
                    nebula.applyEffects(enemy);
                }
            }

            // Update cosmic storms (they move)
            for (let i = this.cosmicStorms.length - 1; i >= 0; i--) {
                const storm = this.cosmicStorms[i];
                const keepStorm = storm.update(); // Get return value from update
                
                // Remove the storm if it has dissipated
                if (!keepStorm) {
                    this.cosmicStorms.splice(i, 1);
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
                console.log(`New ${stormType} storm spawned naturally`);
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
                this.beams.splice(i, 1);
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
                this.forceWaves.splice(i, 1);
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

    /** Adds an explosion to the system's list. */
    addExplosion(x, y, size, color) {
        // Use object pooling if WeaponSystem is available
        if (typeof WeaponSystem !== 'undefined' && typeof WeaponSystem.getPooledObject === 'function') {
            //console.log(`Adding explosion at (${x.toFixed(1)},${y.toFixed(1)}) with size ${size}, using object pooling`);
            const explosion = WeaponSystem.getPooledObject('explosion', x, y, size, color);
            
            if (explosion) {
                this.explosions.push(explosion);
                console.log(`Successfully added pooled explosion, total explosions: ${this.explosions.length}`);
                return;
            } else {
                console.warn(`Failed to get pooled explosion object at (${x.toFixed(1)},${y.toFixed(1)})`);
            }
        }
        
        // Fall back to direct instantiation if pooling is unavailable or failed
        console.log(`Creating new explosion directly at (${x.toFixed(1)},${y.toFixed(1)})`);
        try {
            const explosion = new Explosion(x, y, size, color);
            this.explosions.push(explosion);
            console.log(`Successfully added direct explosion, total explosions: ${this.explosions.length}`);
        } catch (error) {
            console.error(`Error creating explosion:`, error);
        }
    }

    /** Handles all collision detection and responses in the system. */
    checkCollisions() {
        if (!this.player) return;
        
        try {
            // --- PHYSICAL OBJECT COLLISIONS (Non-projectile) ---
            
            // Player vs Enemies
            for (let enemy of this.enemies) {
                if (enemy.isDestroyed()) continue;
                
                // Skip collision detection for player's bodyguards
                if (enemy.role === AI_ROLE.GUARD && enemy.principal === this.player) {
                    continue; // This prevents collisions between player and their bodyguards
                }
                
                if (this.player.checkCollision(enemy)) {
                    // Handle ship-to-ship collision
                    let collisionDamage = Math.floor(
                        (this.player.vel.mag() + enemy.vel.mag())
                    );
                    console.log(`Ship collision! Damage: ${collisionDamage}`);
                    this.player.takeDamage(collisionDamage, enemy);
                    enemy.takeDamage(collisionDamage, this.player);
                    
                    // Apply physics push based on relative mass/size
                    const playerMass = this.player.size * this.player.size;
                    const enemyMass = enemy.size * enemy.size;
                    const totalMass = playerMass + enemyMass;

                    // Calculate impulse - smaller ships get pushed more
                    const playerImpulseFactor = 3 * (enemyMass / totalMass);
                    const enemyImpulseFactor = 3 * (playerMass / totalMass);

                    // Create normalized collision vector
                    let pushVector = p5.Vector.sub(enemy.pos, this.player.pos).normalize();

                    // Apply appropriate impulse to each ship
                    this.player.vel.sub(pushVector.copy().mult(playerImpulseFactor));
                    enemy.vel.add(pushVector.copy().mult(enemyImpulseFactor));
                }
            }
            
            // Player vs Asteroids collision
            for (let asteroid of this.asteroids) {
                if (asteroid.isDestroyed()) continue;
                if (this.player.checkCollision(asteroid)) {
                    // Handle player-asteroid collision
                    let collisionDamage = Math.floor(this.player.vel.mag());
                    console.log(`Player hit asteroid! Damage: ${collisionDamage}`);
                    this.player.takeDamage(collisionDamage, asteroid);
                    asteroid.takeDamage(20, this.player); // Fixed damage to asteroid
                    
                    // Apply physics push based on relative mass/size
                    const playerMass = this.player.size * this.player.size;
                    const asteroidMass = asteroid.size * asteroid.size;
                    const totalMass = playerMass + asteroidMass;

                    // Calculate impulse factors
                    const playerImpulseFactor = 2 * (asteroidMass / totalMass);
                    const asteroidImpulseFactor = 2 * (playerMass / totalMass);

                    // Create normalized collision vector
                    let pushVector = p5.Vector.sub(asteroid.pos, this.player.pos).normalize();

                    // Apply impulses
                    this.player.vel.sub(pushVector.copy().mult(playerImpulseFactor));
                    asteroid.vel.add(pushVector.copy().mult(asteroidImpulseFactor));
                }
            }
            
            // Enemy vs Asteroid collisions (optional)
            for (let enemy of this.enemies) {
                if (enemy.isDestroyed()) continue;
                for (let asteroid of this.asteroids) {
                    if (asteroid.isDestroyed()) continue;
                    if (enemy.checkCollision(asteroid)) {
                        // Handle enemy-asteroid collision
                        enemy.takeDamage(10);
                        asteroid.takeDamage(10);
                        
                        // Apply physics push
                        let pushVector = p5.Vector.sub(asteroid.pos, enemy.pos).normalize().mult(2);
                        enemy.vel.sub(pushVector);
                        asteroid.vel.add(pushVector.mult(0.5));
                    }
                }
            }
            
            
        } catch(e) {
            console.error("Error in checkCollisions:", e);
        }
    } // End checkCollisions

/** Specifically handles projectile collisions with targets. */
checkProjectileCollisions() {
    // Pre-allocate reusable distance vectors to avoid object creation in the loop
    if (!this._distCheckVector) this._distCheckVector = createVector(0, 0);
    
    // Process projectiles using optimized collision detection
    for (let i = this.projectiles.length - 1; i >= 0; i--) {
        const proj = this.projectiles[i];
        const projPos = proj.pos;
        const projSize = proj.size || 3;
        let hit = false;
        
        // Fast collision pre-check using distance squared (no sqrt calculation)
        // Only do full collision check if object is potentially within range
        const distCheckVector = this._distCheckVector;
        
        // Check against asteroids using broadphase filtering
        for (let j = this.asteroids.length - 1; j >= 0; j--) {
            const asteroid = this.asteroids[j];
            if (!asteroid || asteroid.isDestroyed()) continue;
            
            // Fast distance check before expensive collision detection
            const combinedRadiusSquared = Math.pow(asteroid.size + projSize, 2);
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
        
        // If already hit something, skip the rest of the checks
        if (hit) continue;
        
        // For player hits - use quick distance check first
        if (proj.owner instanceof Enemy) {
            const combinedRadiusSquared = Math.pow(this.player.size + projSize, 2);
            distCheckVector.set(this.player.pos.x - projPos.x, this.player.pos.y - projPos.y);
            
            if (distCheckVector.magSq() <= combinedRadiusSquared && proj.checkCollision(this.player)) {
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
                if (proj.type === "tangle" && typeof this.player.applyDragEffect === 'function') {
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
                
                this.removeProjectile(i);
                continue;
            }
        }
        
        // For enemy hits - use spatial partitioning approach
        if (proj.owner instanceof Player) {
            // Get only nearby enemies using pre-check with distance squared
            for (let j = 0; j < this.enemies.length; j++) {
                const enemy = this.enemies[j];
                const combinedRadiusSquared = Math.pow(enemy.size + projSize, 2);
                distCheckVector.set(enemy.pos.x - projPos.x, enemy.pos.y - projPos.y);
                
                if (distCheckVector.magSq() <= combinedRadiusSquared && proj.checkCollision(enemy)) {
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
                    if (proj.type === "tangle" && typeof enemy.applyDragEffect === 'function') {
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
                    // Use centralized hit handler from WeaponSystem
                    WeaponSystem.handleHitEffects(
                        enemy,
                        proj.pos,
                        proj.damage / 2, // Reduce damage for friendly fire
                        proj.owner,
                        this,
                        proj.color
                    );
                    
                    // Apply Tangle effect if it's a tangle projectile
                    if (proj.type === "tangle" && typeof enemy.applyDragEffect === 'function') {
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
        if (!this.player || !this.player.pos || !this.cargo || this.cargo.length === 0) return; // Added checks for player.pos and cargo array

        for (let i = this.cargo.length - 1; i >= 0; i--) {
            const cargoItem = this.cargo[i];

            // Skip if already collected, somehow invalid, or expired
            if (!cargoItem || cargoItem.collected || cargoItem.isExpired()) {
                 // If expired but not collected, remove it here
                 if (cargoItem && !cargoItem.collected && cargoItem.isExpired()) {
                     console.log(`[Cargo Expired] Removing ${cargoItem.type}x${cargoItem.quantity} during collection check`);
                     this.cargo.splice(i, 1);
                 }
                 continue;
            }

            // --- Add Detailed Logging ---
            const distance = dist(this.player.pos.x, this.player.pos.y, cargoItem.pos.x, cargoItem.pos.y);
            const collisionThreshold = (this.player.size / 2 + cargoItem.size * 2);
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
                        //uiManager.addMessage(`Collected ${addResult.added}t ${cargoItem.type}`);
                    }

                    // If the full quantity wasn't added (partial add), update the cargo item's quantity
                    if (addResult.added < cargoItem.quantity) {
                        cargoItem.quantity -= addResult.added;
                        cargoItem.collected = false; // Keep it in the world if partially collected
                        //console.log(`  Partial pickup: Remaining ${cargoItem.quantity}t of ${cargoItem.type}`);
                    } else {
                        // Only mark as fully collected if the entire quantity was added
                        cargoItem.collected = true;
                        // Since it's fully collected, we can remove it immediately
                        this.cargo.splice(i, 1);
                        //console.log(`  Full pickup: Removed ${cargoItem.type}x${cargoItem.quantity}`);
                    }
                } else {
                     // Log why adding failed (e.g., cargo full)
                     //console.log(`  Add failed. Player Cargo: ${this.player.getCargoAmount()}/${this.player.cargoCapacity}, Reason: ${addResult.reason}`);
                     // Add UI message for failure if needed
                     if (addResult.reason === 'CARGO_FULL' && typeof uiManager !== 'undefined') {
                         // Avoid spamming this message - maybe only show once per few seconds?
                         // Simple approach: just show it
                         //uiManager.addMessage(`Cargo hold full!`);
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

    /** Adds a force wave to the system's list. */
    addForceWave(wave) { if (wave) this.forceWaves.push(wave); }

    /** Adds a cargo item to the system's cargo array */
    addCargo(cargo) {
        if (!this.cargo) this.cargo = [];
        
        if (cargo) {
            this.cargo.push(cargo);
            console.log(`Cargo added to system ${this.name}: ${cargo.type} x${cargo.quantity}`);
            return true;
        }
        return false;
    }

    /** Draws background stars. Assumes called within translated space. */
    drawBackground() {
        if (!this.bgStars) {
            console.log(`No bgStars in ${this.name} system!`);
            return;
        }
        
        fill(255); 
        noStroke();
        
        // Slight glow effect
        strokeWeight(1);
        stroke(255, 255, 255, 100);
        this.bgStars.forEach(s => {
            ellipse(s.x, s.y, s.size, s.size);
        });
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

        // Special effects culling
        if (this.beams && this.beams.length > 0) {
            this.drawBeamsWithCulling(screenBounds);
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
                strokeWeight(2);
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
            // --- Add Jump Zone Data ---
            jumpZoneCenterX: this.jumpZoneCenter ? this.jumpZoneCenter.x : null,
            jumpZoneCenterY: this.jumpZoneCenter ? this.jumpZoneCenter.y : null,
            jumpZoneRadius: this.jumpZoneRadius,
            // Add wanted status properties
            playerWanted: this.playerWanted || false,
            playerWantedLevel: this.playerWantedLevel || 0,
            playerWantedExpiry: this.playerWantedExpiry,
            policeAlertSent: this.policeAlertSent || false,
            // ---
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

        // --- Restore Jump Zone Data ---
        if (data.jumpZoneCenterX !== null && data.jumpZoneCenterY !== null && typeof createVector === 'function') {
            sys.jumpZoneCenter = createVector(data.jumpZoneCenterX, data.jumpZoneCenterY);
        } else {
            sys.jumpZoneCenter = null; // Ensure it's null if not saved properly or p5 not ready
        }
        sys.jumpZoneRadius = data.jumpZoneRadius || JUMP_ZONE_DEFAULT_RADIUS;
        // ---

        // Restore wanted status
        sys.playerWanted = data.playerWanted || false;
        sys.playerWantedLevel = data.playerWantedLevel || 0;
        sys.playerWantedExpiry = data.playerWantedExpiry || null;
        sys.policeAlertSent = data.policeAlertSent || false;
        
        // --- Restore initialization state ---
        // This prevents initStaticElements from running again if it already ran before saving
        sys.staticElementsInitialized = data.staticElementsInitialized || false;
        // ---

        // NOTE: We do NOT call initStaticElements here because planets/station/jumpzone
        // are being restored directly from JSON data. If initStaticElements *needs* to run
        // on load for other reasons (like regenerating bgStars), the logic inside
        // initStaticElements needs to be adjusted to skip regeneration of loaded elements.
        // The current structure seems to load everything directly.

        return sys;
    }

    // Add this method to the StarSystem class - place it after constructor
    setEconomyType(economyType) {
        // Store the economy type in the system
        this.economyType = economyType;
        
        // CRITICAL: Update market's economy type when system's type changes
        if (this.station && this.station.market) {
            this.station.market.systemType = economyType;
            this.station.market.updatePrices();
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
        return true;
    }
    return false;
}

    
} // End of StarSystem Class