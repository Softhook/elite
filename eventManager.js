class EventManager {
    constructor() {
        this.starSystem = null; // Will be set by sketch.js
        this.player = null;     // Will be set by sketch.js
        this.uiManager = null;  // Will be set by sketch.js

        this.events = [
            {
                type: "ASTEROID_CLUSTER",
                // Probability: e.g., 0.005% chance per frame. (1/20000)
                // At 60 FPS, this is an average of one trigger attempt every ~333 seconds (5.5 minutes).
                //probabilityPerFrame: 0.00005,
                probabilityPerFrame: 0.05,
                //minCooldownFrames: 5 * 60 * 60, // 5 minutes cooldown after execution
                minCooldownFrames: 1 * 60 * 60, // 5 minutes cooldown after execution
                warningDurationFrames: 300,     // 5 seconds warning at 60 FPS
                lastTriggeredFrame: -Infinity,  // Frame count of last execution
                isWarningActive: false,
                eventTriggerFrame: 0,           // Frame count when the event should execute
                handler: this.initiateAsteroidClusterEvent.bind(this),
                execute: this.executeAsteroidClusterSpawn.bind(this)
            },
            // --- Example for a future event ---
            // {
            //     type: "PIRATE_SWARM",
            //     probabilityPerFrame: 0.00003,
            //     minCooldownFrames: 10 * 60 * 60, // 10 minutes
            //     warningDurationFrames: 450, // 7.5 seconds
            //     lastTriggeredFrame: -Infinity,
            //     isWarningActive: false,
            //     eventTriggerFrame: 0,
            //     handler: this.initiatePirateSwarmEvent.bind(this),
            //     execute: this.executePirateSwarm.bind(this)
            // }
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

    // --- Placeholder for Pirate Swarm Event ---
    // initiatePirateSwarmEvent() {
    //     const event = this.events.find(e => e.type === "PIRATE_SWARM");
    //     if (!event || event.isWarningActive) return;
    //     event.isWarningActive = true;
    //     event.eventTriggerFrame = frameCount + event.warningDurationFrames;
    //     if (this.uiManager) {
    //         this.uiManager.addMessage("DANGER: Pirate swarm inbound!", "red", (event.warningDurationFrames / 60) * 1000);
    //     }
    //     console.log("EventManager: Pirate swarm warning issued.");
    // }
    // executePirateSwarm() {
    //     if (!this.starSystem || !this.player) return;
    //     console.log("EventManager: Executing pirate swarm!");
    //     // Logic to spawn a group of pirates targeting the player
    //     // e.g., this.starSystem.spawnEnemyGroup(this.player.pos, 'PIRATE', floor(random(3,6)));
    // }
}