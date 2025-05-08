class EventManager {
    constructor() {
        this.starSystem = null; // Will be set by sketch.js
        this.player = null;     // Will be set by sketch.js
        this.uiManager = null;  // Will be set by sketch.js

        this.pirateGangNames = [
            "Void Reaver",
            "Cygnus Marauder",
            "Nebula Nomads",
            "Quantum Corsairs",
            "Kygan Syndicate",
            "Synapse Ghosts",
            "Solar Scourge"
        ];

        // Define a list of alien ship types that can appear in a raid
        // Ensure these ship types are defined in your SHIP_DEFINITIONS
        // and have AI_ROLE.ALIEN in their aiRoles array.
        this.alienShipTypes = ["Thargoid"]; // Example types

        this.events = [
            {
                type: "ASTEROID_CLUSTER",
                // Probability: e.g., 0.005% chance per frame. (1/20000)
                // At 60 FPS, this is an average of one trigger attempt every ~333 seconds (5.5 minutes).
                probabilityPerFrame: 0.00005,
                minCooldownFrames: 5 * 60 * 60, // 5 minutes cooldown after execution
                warningDurationFrames: 300,     // 5 seconds warning at 60 FPS
                lastTriggeredFrame: -Infinity,  // Frame count of last execution
                isWarningActive: false,
                eventTriggerFrame: 0,           // Frame count when the event should execute
                handler: this.initiateAsteroidClusterEvent.bind(this),
                execute: this.executeAsteroidClusterSpawn.bind(this)
            },
             {
                type: "ALIEN_RAID",
                probabilityPerFrame: 0.00003,
                minCooldownFrames: 10 * 60 * 60,
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                handler: this.initiateAlienRaidEvent.bind(this),
                execute: this.executeAlienRaidSpawn.bind(this)
            },
            {
                type: "PIRATE_SWARM",
                probabilityPerFrame: 0.00005,
                minCooldownFrames: 8 * 60 * 60,
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                handler: this.initiatePirateSwarmEvent.bind(this),
                execute: this.executePirateSwarmSpawn.bind(this)
            },
/*             {
                type: "BOUNTY_HUNTER_AMBUSH",
                probabilityPerFrame: 0.00004,
                minCooldownFrames: 12 * 60 * 60,
                warningDurationFrames: 300,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                handler: this.initiateBountyHunterAmbushEvent.bind(this),
                execute: this.executeBountyHunterAmbushSpawn.bind(this)
            }, */
/*             {
                type: "FAMINE_EVENT",
                probabilityPerFrame: 0.00002,
                minCooldownFrames: 20 * 60 * 60,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                handler: this.initiateFamineEvent.bind(this),
                execute: this.executeFamineEvent.bind(this)
            },
            {
                type: "RELIGIOUS_UPRISING_EVENT",
                probabilityPerFrame: 0.00002,
                minCooldownFrames: 20 * 60 * 60,
                lastTriggeredFrame: -Infinity,
                isWarningActive: false,
                eventTriggerFrame: 0,
                handler: this.initiateReligiousUprisingEvent.bind(this),
                execute: this.executeReligiousUprisingEvent.bind(this)
            } */
        ];
    }

    // Call this from sketch.js to provide necessary references
    initializeReferences(starSystem, player, uiManager) {
        this.starSystem = starSystem;
        this.player = player;
        this.uiManager = uiManager;
    }

    update() {
        if (!this.starSystem || !this.player || !this.uiManager || gameStateManager.currentState !== "IN_FLIGHT") {
            // Don't run events if system/player not ready, UI not ready, or not in active flight
            return;
        }

        for (const event of this.events) {
            if (event.isWarningActive) {
                // If a warning is active, check if it's time to execute
                if (frameCount >= event.eventTriggerFrame) {
                    event.execute();
                    event.isWarningActive = false;
                    event.lastTriggeredFrame = frameCount; // Mark execution time for cooldown
                }
            } else {
                // Check if event is on cooldown
                if (frameCount < event.lastTriggeredFrame + event.minCooldownFrames) {
                    continue;
                }

                // Check probability to initiate the event (start the warning phase)
                if (random() < event.probabilityPerFrame) {
                    event.handler(); // This will set up the warning
                }
            }
        }
    }

    // --- Asteroid Cluster Event Methods ---
    initiateAsteroidClusterEvent() {
        const event = this.events.find(e => e.type === "ASTEROID_CLUSTER");
        if (!event || event.isWarningActive) return; // Already warning or event not found

        event.isWarningActive = true;
        event.eventTriggerFrame = frameCount + event.warningDurationFrames;

        if (this.uiManager) {
            const warningDurationMillis = (event.warningDurationFrames / 60) * 1000;
            this.uiManager.addMessage("WARNING: Asteroid cluster detected!", "orange", warningDurationMillis);
        }
        console.log(`EventManager: Asteroid cluster warning issued. Spawn in ${event.warningDurationFrames} frames.`);
    }

    executeAsteroidClusterSpawn() {
        if (!this.starSystem || !this.player || !this.player.pos) {
            console.error("EventManager: Cannot execute asteroid cluster spawn - missing references.");
            return;
        }

        const numToSpawn = floor(random(15, 25)); // Number of asteroids in the cluster
        //const clusterSpawnRadiusFromPlayer = random(this.starSystem.despawnRadius * 0.25, this.starSystem.despawnRadius * 0.6);
        const clusterSpawnRadiusFromPlayer = random(1600, 2000); // Spawn much closer for testing
        const clusterAngleWithPlayer = random(TWO_PI); // Angle relative to player for spawning
        
        // Determine a base spawn point relative to the player
        const baseSpawnX = this.player.pos.x + cos(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;
        const baseSpawnY = this.player.pos.y + sin(clusterAngleWithPlayer) * clusterSpawnRadiusFromPlayer;
        
        const spreadRadius = 500; // How spread out the asteroids in the cluster are from the base point

        console.log(`EventManager: Spawning asteroid cluster: ${numToSpawn} asteroids near (${baseSpawnX.toFixed(0)}, ${baseSpawnY.toFixed(0)})`);

        for (let i = 0; i < numToSpawn; i++) {
            // StarSystem's addAsteroid method will handle the maxTotalAsteroids check
            const offsetX = random(-spreadRadius, spreadRadius);
            const offsetY = random(-spreadRadius, spreadRadius);
            this.starSystem.addAsteroid(baseSpawnX + offsetX, baseSpawnY + offsetY, random(25, 75));
        }
    }

    initiatePirateSwarmEvent() {
    const event = this.events.find(e => e.type === "PIRATE_SWARM");
    if (!event || event.isWarningActive) return; // Already warning or event not found

    event.isWarningActive = true;
    event.eventTriggerFrame = frameCount + event.warningDurationFrames;

    const randomGangIndex = floor(random(this.pirateGangNames.length));
    const gangName = this.pirateGangNames[randomGangIndex];

    if (this.uiManager) {
        const warningDurationMillis = (event.warningDurationFrames / 60) * 1000;
        this.uiManager.addMessage(`DANGER: ${gangName} pirates detected!`, "red", warningDurationMillis);
    }
    console.log(`EventManager: ${gangName} pirate swarm warning issued. Spawn in ${event.warningDurationFrames} frames.`);
}

executePirateSwarmSpawn() {
    if (!this.starSystem || !this.player || !this.player.pos) {
        console.error("EventManager: Cannot execute pirate swarm spawn - missing references.");
        return;
    }

    const event = this.events.find(e => e.type === "PIRATE_SWARM");
    if (!event) return;

    const eliteRankings = [
        "Harmless", "Mostly Harmless", "Poor", "Average", "Above Average",
        "Competent", "Dangerous", "Deadly", "Elite"
    ];
    const playerRank = eliteRankings.indexOf(this.player.getEliteRating());
    const maxRank = eliteRankings.length - 1;
    const rankFactor = Math.min(playerRank / maxRank, 1);

    const minPirates = 3;
    const maxPirates = 10;
    const numPirates = floor(lerp(minPirates, maxPirates, rankFactor));

    const pirateShipTypes = ["Sidewinder", "KraitMKI", "Viper", "GladiusFighter"];
    const shipTypeIndex = floor(rankFactor * (pirateShipTypes.length - 1));
    const pirateShipType = pirateShipTypes[shipTypeIndex];

    const spawnRadius = random(1600, 2000);
    const spawnAngle = random(TWO_PI);

    console.log(`EventManager: Spawning pirate swarm: ${numPirates} ${pirateShipType}s near the player.`);

    for (let i = 0; i < numPirates; i++) {
        const offsetX = cos(spawnAngle + random(-0.2, 0.2)) * spawnRadius;
        const offsetY = sin(spawnAngle + random(-0.2, 0.2)) * spawnRadius;
        const spawnX = this.player.pos.x + offsetX;
        const spawnY = this.player.pos.y + offsetY;

        // Use AI_ROLE.PIRATE
        const newEnemy = new Enemy(spawnX, spawnY, this.player, pirateShipType, AI_ROLE.PIRATE);

        // Additional initialization
        newEnemy.currentState = AI_STATE.APPROACHING;
        newEnemy.target = this.player;
        newEnemy.currentSystem = this.starSystem;
        newEnemy.calculateRadianProperties();
        newEnemy.initializeColors();

        this.starSystem.addEnemy(newEnemy);
    }
  }

    // --- Alien Raid Event Methods ---
    initiateAlienRaidEvent() {
        const event = this.events.find(e => e.type === "ALIEN_RAID");
        if (!event || event.isWarningActive) return; // Already warning or event not found

        event.isWarningActive = true;
        event.eventTriggerFrame = frameCount + event.warningDurationFrames;

        if (this.uiManager) {
            const warningDurationMillis = (event.warningDurationFrames / 60) * 1000;
            // You can make the message more specific if you have alien faction names
            this.uiManager.addMessage("DANGER: Unidentified alien vessels detected!", "magenta", warningDurationMillis);
        }
        console.log(`EventManager: Alien raid warning issued. Hostiles inbound in ${event.warningDurationFrames} frames.`);
    }

    executeAlienRaidSpawn() {
        if (!this.starSystem || !this.player || !this.player.pos) {
            console.error("EventManager: Cannot execute alien raid spawn - missing references.");
            return;
        }

        const event = this.events.find(e => e.type === "ALIEN_RAID");
        if (!event) return;

        // Determine number of aliens and their types
        // For simplicity, let's spawn a fixed number for now.
        // You can scale this based on player rank or other factors later.
        const numAliens = floor(random(3, 6)); // Spawn 3 to 5 aliens

        // Select alien ship types
        // Ensure this.alienShipTypes is populated in the constructor
        // and these ship types exist in SHIP_DEFINITIONS
        let availableAlienShips = this.alienShipTypes.filter(shipName => SHIP_DEFINITIONS[shipName]);
        if (availableAlienShips.length === 0) {
            console.error("EventManager: No valid alien ship types found for Alien Raid. Defaulting to 'Krait'.");
            // Fallback if no specific alien ships are defined or found
            availableAlienShips = ["BioFrigate"]; 
            if (!SHIP_DEFINITIONS["BioFrigate"]) {
                 console.error("EventManager: Fallback ship 'Krait' not found. Cannot spawn aliens.");
                 return;
            }
        }
        
        const alienShipTypeToSpawn = random(availableAlienShips);

        const spawnRadius = random(1800, 2200); // Spawn distance from player
        const spawnAngle = random(TWO_PI);    // Random angle around player

        console.log(`EventManager: Spawning alien raid: ${numAliens} ${alienShipTypeToSpawn}(s) near the player.`);

        for (let i = 0; i < numAliens; i++) {
            const offsetX = cos(spawnAngle + random(-0.3, 0.3)) * spawnRadius; // Slight spread
            const offsetY = sin(spawnAngle + random(-0.3, 0.3)) * spawnRadius;
            const spawnX = this.player.pos.x + offsetX;
            const spawnY = this.player.pos.y + offsetY;

            // Create the Alien Enemy
            const newAlien = new Enemy(
                spawnX,
                spawnY,
                this.player,      // Player reference for initial targeting or context
                alienShipTypeToSpawn,
                AI_ROLE.ALIEN     // Assign the ALIEN role
            );

            // --- Essential Initializations for the new Alien ---
            // The Enemy constructor should handle setting a default state for ALIEN role.
            // If not, you might need to set it here, e.g., newAlien.currentState = AI_STATE.APPROACHING;
            // Ensure the Alien targets something appropriate. By default, Aliens target non-Aliens.
            // The Enemy's updateTargeting should handle this if player is a valid target.
            // newAlien.target = this.player; // Or let the Alien AI decide its first target

            newAlien.currentSystem = this.starSystem;
            if (typeof newAlien.calculateRadianProperties === 'function') {
                newAlien.calculateRadianProperties();
            }
            if (typeof newAlien.initializeColors === 'function') {
                newAlien.initializeColors();
            }
            
            // If Aliens should immediately be aggressive towards the player:
            if (newAlien.role === AI_ROLE.ALIEN && newAlien.target !== this.player) {
                // Check if the alien AI picked a different initial target
                // If you want them to always prioritize player first in a raid:
                // newAlien.target = this.player;
                // newAlien.changeState(AI_STATE.APPROACHING); // Ensure they start moving
            }


            this.starSystem.addEnemy(newAlien);
        }
    }

}