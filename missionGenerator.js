// ****** missionGenerator.js ******

// ... (Helper Data remains the same) ...
const LEGAL_CARGO = ['Food', 'Machinery', 'Computers', 'Medicine', 'Textiles'];
const ILLEGAL_CARGO = ['Narcotics', 'Weapons', 'Slaves'];
const PIRATE_SHIP_TYPES = ['Krait', 'Adder', 'Viper', 'CobraMkIII'];

class MissionGenerator {

    // ... (generateMissions remains largely the same, calls the new findNearbyDestination) ...
     static generateMissions(currentSystem, currentStation, galaxy, player) {
        let availableMissions = [];
        if (!currentSystem || !currentStation || !galaxy || !player) { console.error("Mission Gen: Missing args."); return []; }
        const maxMissions = floor(random(4, 9));
        const systemSecurity = currentSystem.securityLevel || 'Medium';
        const systemEconomy = currentSystem.economyType || 'Industrial';
        const systemTechLevel = currentSystem.techLevel || 5;
        if (!currentSystem.securityLevel) currentSystem.securityLevel = systemSecurity;
        if (!currentSystem.techLevel) currentSystem.techLevel = systemTechLevel;

        console.log(`Generating Missions for ${currentStation.name} (${currentSystem.name})...`);

        for (let i = 0; i < maxMissions; i++) {
            let mission = null;
            let missionTypeRoll = random();
            let legalDeliveryChance = 0.4; let bountyChance = 0.3; let illegalDeliveryChance = 0.1;
             if (systemSecurity === 'High') { legalDeliveryChance += 0.2; bountyChance += 0.1; illegalDeliveryChance = 0.01; }
             else if (systemSecurity === 'Low') { legalDeliveryChance -= 0.15; bountyChance -= 0.1; illegalDeliveryChance += 0.2; }
             else if (systemSecurity === 'Anarchy') { legalDeliveryChance = 0.05; bountyChance = 0.1; illegalDeliveryChance += 0.4; }
             let totalChance = legalDeliveryChance + bountyChance + illegalDeliveryChance;
             if (totalChance <= 0) totalChance = 1;
             legalDeliveryChance /= totalChance; bountyChance /= totalChance; illegalDeliveryChance /= totalChance;

            try {
                if (missionTypeRoll < legalDeliveryChance) {
                    mission = this.createLegalDelivery(currentSystem, currentStation, galaxy, player);
                } else if (missionTypeRoll < legalDeliveryChance + bountyChance) {
                    mission = this.createBountyMission(currentSystem, currentStation, galaxy, player);
                } else if (missionTypeRoll < legalDeliveryChance + bountyChance + illegalDeliveryChance) {
                     mission = this.createIllegalDelivery(currentSystem, currentStation, galaxy, player);
                }
                if (mission) { availableMissions.push(mission); }
            } catch (error) { console.error(`Error creating mission type:`, error); }
        }
        console.log(`Generated ${availableMissions.length} missions.`);
        return availableMissions;
    }


    /**
     * Finds a suitable destination system/station within a specified jump range using BFS.
     * @param {StarSystem} originSystem - The starting system.
     * @param {Galaxy} galaxy - Reference to the galaxy object.
     * @param {boolean} requireStation - Must the destination system have a station?
     * @param {number} [maxJumps=4] - The maximum number of jumps to search outwards.
     * @returns {object|null} An object { system: StarSystem, station: Station|null } or null if no suitable destination found.
     */
    static findNearbyDestination(originSystem, galaxy, requireStation = true, maxJumps = 4) {
        if (!originSystem || !galaxy || !galaxy.systems || typeof originSystem.systemIndex !== 'number') {
             console.warn("findNearbyDestination: Invalid origin or galaxy.");
             return null;
        }
        const originIndex = originSystem.systemIndex;

        let queue = [];              // Stores [index, jumps]
        let visited = new Set();     // Stores visited indices
        let potentialDestinations = []; // Stores valid { system, station } objects found

        // Start BFS from the origin
        queue.push([originIndex, 0]);
        visited.add(originIndex);

        let head = 0; // Use index to manage queue instead of shift() for potentially better performance
        while (head < queue.length) {
            let [currentIndex, currentJumps] = queue[head++]; // Dequeue

            // Stop searching if we've exceeded the max jump range
            if (currentJumps >= maxJumps) continue;

            const currentSys = galaxy.systems[currentIndex];
            // Check if current system is valid and has connections
            if (!currentSys || !Array.isArray(currentSys.connectedSystemIndices)) {
                console.warn(`findNearbyDestination BFS: Invalid system or connections at index ${currentIndex}`);
                continue;
            }

            // Explore neighbors
            for (let neighborIndex of currentSys.connectedSystemIndices) {
                // Check if neighbor is valid and not visited
                if (neighborIndex >= 0 && neighborIndex < galaxy.systems.length && !visited.has(neighborIndex)) {
                     visited.add(neighborIndex); // Mark as visited
                    const neighborSystem = galaxy.systems[neighborIndex];

                    if (neighborSystem) { // Ensure neighbor system object exists
                        // Check station requirement
                        let meetsRequirement = false;
                        if (requireStation && neighborSystem.station) {
                            meetsRequirement = true;
                        } else if (!requireStation) {
                            meetsRequirement = true;
                        }

                        // If it meets requirements, add it as a potential destination
                        if (meetsRequirement) {
                            potentialDestinations.push({
                                system: neighborSystem,
                                station: neighborSystem.station // Will be null if station doesn't exist or isn't required
                            });
                        }

                        // Add neighbor to the queue for further exploration
                        queue.push([neighborIndex, currentJumps + 1]);
                    }
                }
            }
        } // End BFS while loop

        // Select a random destination from the valid list found
        if (potentialDestinations.length > 0) {
            let chosenDestination = random(potentialDestinations);
             // Optional: Log the chosen destination and its distance (can be calculated here or later)
             // let chosenJumps = galaxy.getJumpDistance(originIndex, chosenDestination.system.systemIndex);
             // console.log(`findNearbyDestination: Chose ${chosenDestination.system.name} (${chosenJumps} jumps away)`);
            return chosenDestination;
        } else {
            console.warn(`findNearbyDestination: No suitable destination found within ${maxJumps} jumps for ${originSystem.name} (ReqStation: ${requireStation})`);
            return null; // No suitable destination found within the range
        }
    } // --- End findNearbyDestination ---


    /** Creates a Legal Delivery Mission */
    static createLegalDelivery(originSystem, originStation, galaxy, player) {
        // Use the updated finder to get potentially farther destinations
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 4); // Search up to 4 jumps
        if (!destinationInfo) return null; // No suitable destination found in range

        let cargo = random(LEGAL_CARGO);
        let quantity = floor(random(5, 16));

        // --- Calculate Jumps Bonus ---
        let jumpDistance = Infinity;
        const jumpRewardFactor = 250; // Tune this: Credits per jump

        const originIndex = originSystem?.systemIndex;
        const destinationIndex = destinationInfo.system?.systemIndex;

        if (typeof originIndex === 'number' && typeof destinationIndex === 'number') {
             try { jumpDistance = galaxy.getJumpDistance(originIndex, destinationIndex); } // Recalculate accurately
             catch (e) { console.error("Error calling getJumpDistance:", e); jumpDistance = Infinity; }
        } else { console.warn(`Legal Delivery: Invalid indices. Origin: ${originIndex}, Dest: ${destinationIndex}`); }

        // Check if actually reachable (should be if findNearby worked, but good check)
        if (!isFinite(jumpDistance) || jumpDistance <= 0) {
             console.warn(`Legal Delivery mission destination (${destinationInfo.system.name}) calculated as unreachable or 0 jumps from ${originSystem.name}. Skipping.`);
             return null;
        }

        // --- Calculate Reward ---
        let baseReward = 80;
        let cargoBonus = quantity * floor(random(15, 40));
        // Increase bonus significantly for more jumps
        let jumpBonus = floor(jumpDistance * jumpRewardFactor * (1 + (jumpDistance - 1) * 0.2)); // Example: +20% reward per jump after the first
        let reward = baseReward + cargoBonus + jumpBonus;
        reward = max(150 + (jumpDistance * 50), reward); // Higher minimum reward for longer jumps

        // --- Create Mission Object ---
        let jumpText = jumpDistance === 1 ? "1 jump" : `${jumpDistance} jumps`;
        return new Mission({
            type: MISSION_TYPE.DELIVERY_LEGAL,
            title: `Deliver ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Transport ${quantity}t of ${cargo} to ${destinationInfo.station.name} station in the ${destinationInfo.system.name} system (${jumpText} away). Standard contract. Payment upon delivery.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            isIllegal: false
        });
    }

    /** Creates an Illegal Smuggling Mission */
     static createIllegalDelivery(originSystem, originStation, galaxy, player) {
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 3); // Maybe shorter range for illegal?
        if (!destinationInfo) return null;
        if (destinationInfo.system.securityLevel === 'High' && random() < 0.7) return null;

        let cargo = random(ILLEGAL_CARGO);
        let quantity = floor(random(3, 10));

        // --- Calculate Jumps Bonus ---
        let jumpDistance = Infinity;
        const jumpRewardFactor = 600; // Higher base per jump

        const originIndex = originSystem?.systemIndex;
        const destinationIndex = destinationInfo.system?.systemIndex;

        if (typeof originIndex === 'number' && typeof destinationIndex === 'number') {
            try { jumpDistance = galaxy.getJumpDistance(originIndex, destinationIndex); }
            catch (e) { console.error("Error calling getJumpDistance (Illegal):", e); jumpDistance = Infinity; }
        } else { console.warn(`Illegal Delivery: Invalid indices. Origin: ${originIndex}, Dest: ${destinationIndex}`); }

        if (!isFinite(jumpDistance) || jumpDistance <= 0) {
            console.warn(`Illegal Delivery mission destination (${destinationInfo.system.name}) unreachable/0 jumps from ${originSystem.name}. Skipping.`);
            return null;
        }

        // --- Calculate Reward ---
        let baseReward = 400;
        let cargoBonus = quantity * floor(random(100, 250));
        // Increase bonus significantly for more jumps
        let jumpBonus = floor(jumpDistance * jumpRewardFactor * (1 + (jumpDistance - 1) * 0.3)); // Example: +30% reward per jump after first
        let reward = baseReward + cargoBonus + jumpBonus;
        reward = max(500 + (jumpDistance * 150), reward); // Higher minimum for longer illegal jumps

        // --- Create Mission Object ---
        let jumpText = jumpDistance === 1 ? "1 jump" : `${jumpDistance} jumps`;
        return new Mission({
            type: MISSION_TYPE.DELIVERY_ILLEGAL,
            title: `Smuggle ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Discreet transport of ${quantity}t of restricted goods (${cargo}) to ${destinationInfo.station.name} in ${destinationInfo.system.name} (${jumpText} away). Avoid scans. High payment on delivery.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            isIllegal: true
        });
    }


     /** Creates a Bounty Hunting Mission (Kill X Pirates) */
     static createBountyMission(originSystem, originStation, galaxy, player) {
        // Still local for now
        let targetCount = floor(random(2, 6));
        let rewardPerKill = floor(random(150, 400));
        let totalReward = targetCount * rewardPerKill;
        totalReward = max(500, totalReward);

         return new Mission({
            type: MISSION_TYPE.BOUNTY_PIRATE,
            title: `Pirate Cull: Destroy ${targetCount} Pirates`,
            description: `Pirate activity in ${originSystem.name} requires intervention. Eliminate ${targetCount} pirate vessels operating within this system. Payment issued upon completion.`, // Simplified
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Pirate vessels`,
            targetCount: targetCount,
            rewardCredits: totalReward,
            isIllegal: false,
        });
     }

} // End MissionGenerator Class