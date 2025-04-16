// ****** missionGenerator.js ******

// --- Helper Data ---
// Define ALL legal commodities that can appear in missions/market
const LEGAL_CARGO = [
    'Food', 'Textiles', 'Machinery', 'Metals', 'Minerals',
    'Chemicals', 'Computers', 'Medicine', 'Adv Components', 'Luxury Goods'
];
const ILLEGAL_CARGO = ['Narcotics', 'Weapons', 'Slaves']; // Keep separate
const PIRATE_SHIP_TYPES = ['Krait', 'Adder', 'Viper', 'CobraMkIII'];

// --- Economy-Specific Cargo Biases ---
// Define preferred cargo *exports* (goods they produce/sell cheaply)
const ECONOMY_EXPORTS = {
    'Agricultural': ['Food', 'Textiles'],
    'Industrial': ['Machinery'],
    'Mining': ['Metals', 'Minerals'], // <-- changed from Extraction
    'Refinery': ['Metals', 'Chemicals'],
    'Tech': ['Computers', 'Medicine'],
    'High Tech': ['Computers', 'Medicine', 'Adv Components'],
    'Tourism': [],
    'Service': [],
    'Military': [], // <-- new
    'Offworld': ['Luxury Goods', 'Adv Components'],   // <-- new
    'Alien': ['Adv Components'],      // <-- new
    'Default': ['Food', 'Textiles', 'Machinery']
};
// Define preferred cargo *imports* (goods they need/buy dearly)
const ECONOMY_IMPORTS = {
    'Agricultural': ['Machinery', 'Chemicals', 'Medicine', 'Computers'],
    'Industrial': ['Food', 'Metals', 'Minerals', 'Chemicals', 'Adv Components'],
    'Mining': ['Food', 'Machinery', 'Medicine', 'Computers'], // <-- changed from Extraction
    'Refinery': ['Minerals', 'Machinery', 'Food', 'Medicine'],
    'Tech': ['Food', 'Metals', 'Chemicals', 'Machinery'],
    'High Tech': ['Food', 'Metals', 'Chemicals', 'Minerals', 'Luxury Goods'],
    'Tourism': ['Food', 'Luxury Goods', 'Medicine', 'Textiles'],
    'Service': ['Food', 'Computers', 'Machinery', 'Medicine', 'Textiles'],
    'Military': ['Food','Luxury Goods', 'Medicine'], // <-- new
    'Offworld': ['Food', 'Textiles', 'Metals'],           // <-- new
    'Alien': ['Food', 'Textiles', 'Machinery', 'Medicine'], // <-- new
    'Default': LEGAL_CARGO
};


class MissionGenerator {

    // ... (generateMissions function remains the same) ...
     static generateMissions(currentSystem, currentStation, galaxy, player) {
        let availableMissions = [];
        if (!currentSystem || !currentStation || !galaxy || !player) {
            console.error("MissionGenerator.generateMissions: Missing required arguments.");
            return [];
        }

        const maxMissions = floor(random(5, 10)); // Slightly more variance maybe?
        const systemSecurity = currentSystem.securityLevel || 'Medium';
        const systemEconomy = currentSystem.economyType || 'Industrial'; // Default if undefined
        const systemTechLevel = currentSystem.techLevel || 5;

        // Ensure properties exist (should be handled by StarSystem constructor)
        if (!currentSystem.securityLevel) currentSystem.securityLevel = systemSecurity;
        if (!currentSystem.economyType) currentSystem.economyType = systemEconomy;
        if (!currentSystem.techLevel) currentSystem.techLevel = systemTechLevel;

        console.log(`Generating Missions for ${currentStation.name} (${currentSystem.name}), Sec: ${systemSecurity}, Econ: ${systemEconomy}, Tech: ${systemTechLevel}`);

        // --- Base Probabilities ---
        // These will be modified based on security/economy
        // Make them add up to ~1.0 initially for easier reasoning
        let baseLegalDeliveryChance = 0.45;
        let baseBountyChance = 0.35;
        let baseIllegalDeliveryChance = 0.15;
        // Add placeholders for future types if needed
        // let baseMiningChance = 0.0;
        // let baseAssassinationChance = 0.0;
        let baseOtherChance = 0.05; // Small chance for 'other' or fallback

        // --- Apply Modifiers ---
        let adjustedLegal = baseLegalDeliveryChance;
        let adjustedBounty = baseBountyChance;
        let adjustedIllegal = baseIllegalDeliveryChance;
        let adjustedOther = baseOtherChance;

        // Security Modifiers
        switch (systemSecurity) {
            case 'High':
                adjustedBounty *= 0.1;       // Much les bounties
                adjustedIllegal *= 0.1;      // Drastically fewer illegal missions
                adjustedLegal *= 1.1;        // Slightly more legal trade
                break;
            case 'Medium':
                // Use base rates mostly, maybe slight bounty increase?
                adjustedBounty *= 1.1;
                adjustedIllegal *= 0.9;      // Slightly fewer illegal
                break;
            case 'Low':
                adjustedBounty *= 0.6;       // Fewer bounties
                adjustedIllegal *= 2.5;      // Significantly more illegal missions
                adjustedLegal *= 0.8;        // Slightly less legal trade emphasis
                break;
            case 'Anarchy':
                adjustedBounty *= 1.8;       // Lots of bounties
                adjustedIllegal *= 4.0;      // Lots of illegal missions
                adjustedLegal *= 0.3;        // Much less legal trade emphasis
                break;
        }

        // Economy Modifiers (more subtle, could affect subtypes more later)
        // For now, let's slightly adjust main types. e.g., Industrial might have slightly more delivery.
        switch (systemEconomy) {
             case 'Industrial':
             case 'Refinery':
             case 'Mining':
                  adjustedLegal *= 1.1; // Slightly more trade focus
                  adjustedBounty *= 0.9;
                  break;
             case 'Agricultural':
                  adjustedLegal *= 1.2; // More trade focus
                  adjustedBounty *= 0.8;
                  adjustedIllegal *= 0.9; // Less likely hotbed for crime? Maybe.
                  break;
             case 'High Tech':
             case 'Tech':
                  // Maybe slightly more bounties due to valuable assets?
                  adjustedBounty *= 1.1;
                  adjustedLegal *= 1.1;
                  break;
             case 'Tourism':
             case 'Service':
                  adjustedBounty *= 0.9; // Less focus on raw combat/trade
                  adjustedLegal *= 0.9;
                  // Could add specific 'passenger' or 'courier' missions later here
                  break;
        }

        // --- Normalize Probabilities ---
        // Ensure all adjusted probabilities are non-negative
        adjustedLegal = max(0, adjustedLegal);
        adjustedBounty = max(0, adjustedBounty);
        adjustedIllegal = max(0, adjustedIllegal);
        adjustedOther = max(0, adjustedOther); // Include any other types

        let totalAdjustedChance = adjustedLegal + adjustedBounty + adjustedIllegal + adjustedOther; // Sum of all chances

        if (totalAdjustedChance <= 0) {
            console.warn("Mission Gen: Total adjusted chance is zero! Defaulting probabilities.");
            // Fallback to base if something went wrong
            adjustedLegal = baseLegalDeliveryChance;
            adjustedBounty = baseBountyChance;
            adjustedIllegal = baseIllegalDeliveryChance;
            adjustedOther = baseOtherChance;
            totalAdjustedChance = adjustedLegal + adjustedBounty + adjustedIllegal + adjustedOther;
            if (totalAdjustedChance <= 0) totalAdjustedChance = 1; // Final fallback
        }

        // Normalize
        let normLegal = adjustedLegal / totalAdjustedChance;
        let normBounty = adjustedBounty / totalAdjustedChance;
        let normIllegal = adjustedIllegal / totalAdjustedChance;
        // let normOther = adjustedOther / totalAdjustedChance; // Normalize others if added

        // --- Generate Missions based on Normalized Probabilities ---
        for (let i = 0; i < maxMissions; i++) {
            let mission = null;
            let missionTypeRoll = random(); // Roll 0.0 to 1.0

            try {
                if (missionTypeRoll < normLegal) {
                    mission = this.createLegalDelivery(currentSystem, currentStation, galaxy, player);
                } else if (missionTypeRoll < normLegal + normBounty) {
                    mission = this.createBountyMission(currentSystem, currentStation, galaxy, player);
                } else if (missionTypeRoll < normLegal + normBounty + normIllegal) {
                     mission = this.createIllegalDelivery(currentSystem, currentStation, galaxy, player);
                } else {
                    // Fallback / 'Other' category if roll exceeds defined types
                    // For now, maybe generate another legal delivery as fallback?
                    console.log(`Mission Gen: Rolled into 'Other' category (${missionTypeRoll.toFixed(3)}), generating fallback Legal Delivery.`);
                    mission = this.createLegalDelivery(currentSystem, currentStation, galaxy, player);
                    if (!mission) { // If even fallback fails, try a bounty
                         mission = this.createBountyMission(currentSystem, currentStation, galaxy, player);
                    }
                }

                // Add the generated mission if it's not null
                // A mission function might return null if it can't find a destination, etc.
                if (mission) {
                    availableMissions.push(mission);
                }
            } catch (error) {
                 console.error(`Error creating mission (Roll: ${missionTypeRoll.toFixed(3)}, Type Slot: ${
                     missionTypeRoll < normLegal ? 'Legal' :
                     missionTypeRoll < normLegal + normBounty ? 'Bounty' :
                     missionTypeRoll < normLegal + normBounty + normIllegal ? 'Illegal' : 'Other'
                 }):`, error);
            }
        } // End mission generation loop

        console.log(`Generated ${availableMissions.length} missions (Sec: ${systemSecurity}, Econ: ${systemEconomy}).`);
        return availableMissions;
    } // --- End generateMissions ---

    // ... (findNearbyDestination remains the same) ...
     static findNearbyDestination(originSystem, galaxy, requireStation = true, maxJumps = 4) {
        if (!originSystem || !galaxy || !galaxy.systems || typeof originSystem.systemIndex !== 'number') return null;
        const originIndex = originSystem.systemIndex;
        let queue = [[originIndex, 0]]; let visited = new Set([originIndex]); let potentialDestinations = []; let head = 0;
        while (head < queue.length) {
            let [currentIndex, currentJumps] = queue[head++];
            if (currentJumps >= maxJumps) continue;
            const currentSys = galaxy.systems[currentIndex];
            if (!currentSys || !Array.isArray(currentSys.connectedSystemIndices)) continue;
            for (let neighborIndex of currentSys.connectedSystemIndices) {
                if (neighborIndex >= 0 && neighborIndex < galaxy.systems.length && !visited.has(neighborIndex)) {
                     visited.add(neighborIndex);
                    const neighborSystem = galaxy.systems[neighborIndex];
                    if (neighborSystem) {
                        let meetsRequirement = (!requireStation || (requireStation && neighborSystem.station));
                        if (meetsRequirement) { potentialDestinations.push({ system: neighborSystem, station: neighborSystem.station }); }
                        queue.push([neighborIndex, currentJumps + 1]);
                    }
                }
            }
        }
        if (potentialDestinations.length > 0) return random(potentialDestinations);
        console.warn(`findNearbyDestination: No suitable destination found within ${maxJumps} jumps for ${originSystem.name}`);
        return null;
    }

    /** Creates a Legal Delivery Mission - Uses updated economy biases */
    static createLegalDelivery(originSystem, originStation, galaxy, player) {
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 4);
        if (!destinationInfo) return null;

        // --- Select Cargo based on Economy ---
        const originEconomy = originSystem.economyType || 'Default';
        const destinationEconomy = destinationInfo.system.economyType || 'Default';

        // Get potential exports from origin and imports for destination
        const exports = ECONOMY_EXPORTS[originEconomy] || ECONOMY_EXPORTS['Default'];
        const imports = ECONOMY_IMPORTS[destinationEconomy] || ECONOMY_IMPORTS['Default'];

        // Filter exports/imports to only include LEGAL cargo defined at the top
        const legalExports = exports.filter(item => LEGAL_CARGO.includes(item));
        const legalImports = imports.filter(item => LEGAL_CARGO.includes(item));

        let possibleCargo = [];

        // --- Cargo Selection Logic ---
        // Priority 1: Goods the destination IMPORTS that the origin EXPORTS (ideal trade route)
        possibleCargo = legalImports.filter(item => legalExports.includes(item));

        // Priority 2: If no ideal route, consider goods the destination IMPORTS (even if origin doesn't specialize)
        if (possibleCargo.length === 0) {
            possibleCargo = legalImports;
        }

        // Priority 3: If destination has no specific imports, consider goods the origin EXPORTS
        if (possibleCargo.length === 0) {
             possibleCargo = legalExports;
        }

        // Priority 4: Final fallback if still nothing found (e.g., two Tourism systems)
        if (possibleCargo.length === 0) {
            console.warn(`MissionGen LegalDelivery: No suitable cargo found between ${originEconomy} and ${destinationEconomy}. Using general LEGAL_CARGO.`);
            possibleCargo = LEGAL_CARGO;
        }
        // --- End Cargo Selection Logic ---

        // Choose a random cargo item from the final list
        let cargo = random(possibleCargo);
        // Ensure cargo is not null/undefined (shouldn't happen with fallback, but good practice)
        if (!cargo) {
             console.error("MissionGen LegalDelivery: Failed to select a cargo type!");
             return null;
        }

        let quantity = floor(random(5, 16)); // Keep quantity range the same for now

        // --- Calculate Jumps Bonus (remains the same) ---
        let jumpDistance = Infinity; const jumpRewardFactor = 250;
        const originIndex = originSystem?.systemIndex; const destinationIndex = destinationInfo.system?.systemIndex;
        if (typeof originIndex === 'number' && typeof destinationIndex === 'number') {
             try { jumpDistance = galaxy.getJumpDistance(originIndex, destinationIndex); }
             catch (e) { console.error("Err getJumpDistance:", e); jumpDistance = Infinity; }
        }
        if (!isFinite(jumpDistance) || jumpDistance <= 0) return null; // Skip if unreachable

        // --- Calculate Reward (remains the same, based on jumps) ---
        // Find the base price of the cargo to add a value bonus
        const marketRef = new Market('Default'); // Create temporary market to get base prices
        const cargoData = marketRef.commodities.find(c => c.name === cargo);
        const baseCargoValue = cargoData ? (cargoData.baseBuy + cargoData.baseSell) / 2 : 50; // Estimate value

        let baseReward = 80;
        let cargoBonus = quantity * floor(random(0.8, 1.2) * baseCargoValue * 0.2); // Bonus based on value
        let jumpBonus = floor(jumpDistance * jumpRewardFactor * (1 + (jumpDistance - 1) * 0.2));
        let reward = baseReward + cargoBonus + jumpBonus;
        reward = max(150 + (jumpDistance * 50), floor(reward)); // Ensure minimum reward and integer

        // --- Create Mission Object ---
        let jumpText = jumpDistance === 1 ? "1 jump" : `${jumpDistance} jumps`;
        return new Mission({
            type: MISSION_TYPE.DELIVERY_LEGAL,
            title: `Deliver ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Transport ${quantity}t of ${cargo} to ${destinationInfo.station.name} station in ${destinationInfo.system.name} (${jumpText} away). Standard contract. Payment upon delivery.`,
            originSystem: originSystem.name, originStation: originStation.name,
            destinationSystem: destinationInfo.system.name, destinationStation: destinationInfo.station.name,
            cargoType: cargo, cargoQuantity: quantity, rewardCredits: reward, isIllegal: false
        });
    }

    // ... (createIllegalDelivery and createBountyMission remain the same) ...
    /** Creates an Illegal Smuggling Mission */
     static createIllegalDelivery(originSystem, originStation, galaxy, player) {
        // Destination finding and security check remain the same
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 3);
        if (!destinationInfo) return null;
        if (destinationInfo.system.securityLevel === 'High' && random() < 0.85) return null; // Even less likely now

        // Cargo type remains random from illegal list
        let cargo = random(ILLEGAL_CARGO);
        let quantity = floor(random(3, 10));

        // --- Calculate Jumps Bonus (remains the same) ---
        let jumpDistance = Infinity; const jumpRewardFactor = 600;
        const originIndex = originSystem?.systemIndex; const destinationIndex = destinationInfo.system?.systemIndex;
        if (typeof originIndex === 'number' && typeof destinationIndex === 'number') {
            try { jumpDistance = galaxy.getJumpDistance(originIndex, destinationIndex); }
            catch (e) { console.error("Err getJumpDistance (Illegal):", e); jumpDistance = Infinity; }
        }
        if (!isFinite(jumpDistance) || jumpDistance <= 0) return null;

        // --- Calculate Reward (remains the same, based on jumps) ---
        // Higher base value for illegal goods assumed
        let baseReward = 400; let cargoBonus = quantity * floor(random(150, 350)); // Increased bonus range
        let jumpBonus = floor(jumpDistance * jumpRewardFactor * (1 + (jumpDistance - 1) * 0.3));
        let reward = baseReward + cargoBonus + jumpBonus;
        reward = max(500 + (jumpDistance * 150), floor(reward)); // Ensure minimum reward and integer

        // --- Create Mission Object ---
        let jumpText = jumpDistance === 1 ? "1 jump" : `${jumpDistance} jumps`;
        return new Mission({
            type: MISSION_TYPE.DELIVERY_ILLEGAL,
            title: `Smuggle ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Discreet transport of ${quantity}t of restricted goods (${cargo}) to ${destinationInfo.station.name} in ${destinationInfo.system.name} (${jumpText} away). Avoid scans. High payment on delivery.`,
            originSystem: originSystem.name, originStation: originStation.name,
            destinationSystem: destinationInfo.system.name, destinationStation: destinationInfo.station.name,
            cargoType: cargo, cargoQuantity: quantity, rewardCredits: reward, isIllegal: true
        });
    }

    /** Creates a Bounty Hunting Mission - maybe target specific ship types? */
     static createBountyMission(originSystem, originStation, galaxy, player) {
        // Still local for now
        let targetCount = floor(random(2, 6));
        let rewardPerKill = floor(random(150, 400));
        // Slightly higher reward in High Sec maybe?
        if (originSystem.securityLevel === 'High') rewardPerKill *= 1.2;
        else if (originSystem.securityLevel === 'Low' || originSystem.securityLevel === 'Anarchy') rewardPerKill *= 0.8;

        let totalReward = targetCount * floor(rewardPerKill); // Ensure integer
        totalReward = max(400, floor(totalReward)); // Min bounty reward and integer

         return new Mission({
            type: MISSION_TYPE.BOUNTY_PIRATE,
            title: `Pirate Cull: Destroy ${targetCount} Pirates`,
            description: `Pirate activity in ${originSystem.name} requires intervention. Eliminate ${targetCount} pirate vessels operating within this system. Payment issued upon completion.`,
            originSystem: originSystem.name, originStation: originStation.name,
            destinationSystem: null, destinationStation: null, // Local mission
            targetDesc: `${targetCount} Pirate vessels`, targetCount: targetCount, rewardCredits: totalReward, isIllegal: false,
        });
     }

} // End MissionGenerator Class