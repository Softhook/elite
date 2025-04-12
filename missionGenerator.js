// ****** missionGenerator.js ******

// --- Helper Data (Can be expanded) ---
const LEGAL_CARGO = ['Food', 'Machinery', 'Computers', 'Medicine', 'Textiles'];
const ILLEGAL_CARGO = ['Narcotics', 'Weapons', 'Slaves']; // Use with caution
const PIRATE_SHIP_TYPES = ['Krait', 'Adder', 'Viper', 'CobraMkIII']; // Ships pirates might fly

class MissionGenerator {

    /**
     * Generates a list of available missions for a given station/system.
     * @param {StarSystem} currentSystem - The system where missions are generated.
     * @param {Station} currentStation - The station offering the missions.
     * @param {Galaxy} galaxy - Reference to the galaxy for finding destinations.
     * @param {Player} player - Reference to the player (for potential scaling later).
     * @returns {Array<Mission>} A list of generated Mission objects.
     */
    static generateMissions(currentSystem, currentStation, galaxy, player) {
        let availableMissions = [];
        const maxMissions = floor(random(4, 9)); // Generate 4-8 missions
        const systemSecurity = currentSystem.securityLevel || 'Medium'; // Assume Medium if undefined
        const systemEconomy = currentSystem.economyType || 'Industrial';
        const systemTechLevel = currentSystem.techLevel || 5; // Assume 5 if undefined

        // Add system properties if they don't exist yet (PLACEHOLDER - add these to StarSystem constructor later)
         if (!currentSystem.securityLevel) currentSystem.securityLevel = systemSecurity;
         if (!currentSystem.techLevel) currentSystem.techLevel = systemTechLevel;
         // ---

        console.log(`Generating Missions for ${currentStation.name} (${currentSystem.name}), Sec: ${systemSecurity}, Econ: ${systemEconomy}, Tech: ${systemTechLevel}`);

        for (let i = 0; i < maxMissions; i++) {
            let mission = null;
            let missionTypeRoll = random(); // Roll for mission type

            // --- Define Probabilities based on Security ---
            let legalDeliveryChance = 0.4;
            let bountyChance = 0.3;
            let illegalDeliveryChance = 0.1; // Base chance

            if (systemSecurity === 'High') {
                legalDeliveryChance += 0.2;
                bountyChance += 0.1;
                illegalDeliveryChance = 0.01; // Very rare
            } else if (systemSecurity === 'Low') {
                legalDeliveryChance -= 0.15;
                bountyChance -= 0.1;
                illegalDeliveryChance += 0.2;
            } else if (systemSecurity === 'Anarchy') {
                legalDeliveryChance = 0.05;
                bountyChance = 0.1;
                illegalDeliveryChance += 0.4;
            }
            // Normalize probabilities roughly (doesn't have to be perfect)
            let totalChance = legalDeliveryChance + bountyChance + illegalDeliveryChance;
            legalDeliveryChance /= totalChance;
            bountyChance /= totalChance;
            illegalDeliveryChance /= totalChance;
            // ---

            // --- Generate Specific Mission ---
            if (missionTypeRoll < legalDeliveryChance) {
                mission = this.createLegalDelivery(currentSystem, currentStation, galaxy, player);
            } else if (missionTypeRoll < legalDeliveryChance + bountyChance) {
                mission = this.createBountyMission(currentSystem, currentStation, galaxy, player);
            } else if (missionTypeRoll < legalDeliveryChance + bountyChance + illegalDeliveryChance) {
                 mission = this.createIllegalDelivery(currentSystem, currentStation, galaxy, player);
            }
            // Add more mission types here with else if...

            if (mission) {
                availableMissions.push(mission);
            }
        }

        console.log(`Generated ${availableMissions.length} missions.`);
        return availableMissions;
    }

    /** Finds a suitable nearby destination system/station */
    static findNearbyDestination(originSystem, galaxy, requireStation = true, maxJumps = 3, avoidOrigin = true) {
        if (!galaxy || !galaxy.systems || galaxy.systems.length <= 1) return null;

        let potentialDestinations = [];
        // Simple search: just look at adjacent systems for now
        let reachableIndices = galaxy.getReachableSystems(galaxy.systems.indexOf(originSystem)); // Need index lookup or pass index
         // Fallback: use galaxy.currentSystemIndex if origin index not easily found
         if (reachableIndices.length === 0) {
              reachableIndices = galaxy.getReachableSystems();
         }


        for (let index of reachableIndices) {
             if (index >= 0 && index < galaxy.systems.length) {
                let destSystem = galaxy.systems[index];
                if (destSystem && destSystem !== originSystem) { // Avoid self
                    if (requireStation && destSystem.station) {
                        potentialDestinations.push({ system: destSystem, station: destSystem.station });
                    } else if (!requireStation) {
                         potentialDestinations.push({ system: destSystem, station: null }); // Allow systems without stations if needed
                    }
                }
             }
        }

         // If no adjacent found, look further? (More complex - skip for now)

        if (potentialDestinations.length > 0) {
            return random(potentialDestinations); // Pick a random valid destination
        }
        return null; // No suitable destination found
    }


    /** Creates a Legal Delivery Mission */
    static createLegalDelivery(originSystem, originStation, galaxy, player) {
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, true);
        if (!destinationInfo) return null; // Cannot create mission without destination

        let cargo = random(LEGAL_CARGO);
        let quantity = floor(random(5, 16)); // 5-15 units
        // Simple reward based on distance (needs jump distance calculation later) and quantity
        let reward = 100 + quantity * floor(random(15, 40)) + floor(random(100, 300)); // Base + per unit + distance bonus placeholder

        return new Mission({
            type: MISSION_TYPE.DELIVERY_LEGAL,
            title: `Deliver ${quantity}t ${cargo} to ${destinationInfo.station.name}`,
            description: `Transport a shipment of ${quantity} tonnes of ${cargo} to the ${destinationInfo.station.name} station in the ${destinationInfo.system.name} system. Standard commercial contract. Payment upon delivery.`,
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
        // Often target low sec / anarchy
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, true); // Still needs a station usually
        if (!destinationInfo) return null;
        // Lower chance of picking high security destination
        if (destinationInfo.system.securityLevel === 'High' && random() < 0.7) return null;


        let cargo = random(ILLEGAL_CARGO);
        let quantity = floor(random(3, 10)); // Smaller quantities usually
        // Higher reward due to risk
        let reward = 500 + quantity * floor(random(100, 250)) + floor(random(300, 800));

        return new Mission({
            type: MISSION_TYPE.DELIVERY_ILLEGAL,
            title: `Smuggle ${quantity}t ${cargo} to ${destinationInfo.station.name}`,
            description: `A private client requires discreet transport of ${quantity} tonnes of restricted goods (${cargo}) to ${destinationInfo.station.name} in ${destinationInfo.system.name}. Avoid scans. Payment on successful delivery. No questions asked.`,
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
        // Target pirates in the current system
        let targetCount = floor(random(2, 6)); // Kill 2-5 pirates
        let targetShip = random(PIRATE_SHIP_TYPES); // Specify a common type? Or any pirate?
        let rewardPerKill = floor(random(150, 400)); // Reward per ship
        let totalReward = targetCount * rewardPerKill;

         return new Mission({
            type: MISSION_TYPE.BOUNTY_PIRATE,
            title: `Pirate Cull: Destroy ${targetCount} Pirates`,
            description: `Pirate activity in the ${originSystem.name} system has become unacceptable. Eliminate ${targetCount} vessels identified as pirate aggressors. Proof of destruction required (scan data automatically collected). Payment issued per confirmed kill upon return.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null, // Target is current system
            destinationStation: null,
            targetDesc: `${targetCount} Pirate vessels`,
            targetCount: targetCount,
            rewardCredits: totalReward, // Store total potential reward, pay per kill later
            isIllegal: false
        });
     }

} // End MissionGenerator Class