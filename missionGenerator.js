// ****** missionGenerator.js ******

// --- Helper Data ---
// Define ALL legal commodities that can appear in missions/market
const LEGAL_CARGO = getLegalCommodities();
const ILLEGAL_CARGO = getIllegalCommodities();
const PIRATE_SHIP_TYPES = ['Krait', 'Adder', 'Sidewinder', 'CobraMkIII'];

// --- Economy-Specific Cargo Biases ---
// Define preferred cargo *exports* (goods they produce/sell cheaply)
const ECONOMY_EXPORTS = {
    'Agricultural': ['Food', 'Textiles'],
    'Industrial': ['Machinery'],
    'Mining': ['Metals', 'Minerals'], // <-- changed from Extraction
    'Refinery': ['Metals', 'Chemicals'],
    'Post Human': ['Computers', 'Medicine', 'Adv Components'],
    'Tourism': [],
    'Service': [],
    'Military': [], // <-- new
    'Offworld': ['Luxury Goods', 'Adv Components'],   // <-- new
    'Alien': ['Adv Components'],      // <-- new
    'Separatist': ['Machinery', 'Chemicals'], // <-- new
    'Imperial': ['Luxury Goods', 'Adv Components', 'Computers', 'Medicine'], // <-- new
    'Default': ['Food', 'Textiles', 'Machinery']
};
// Define preferred cargo *imports* (goods they need/buy dearly)
const ECONOMY_IMPORTS = {
    'Agricultural': ['Machinery', 'Chemicals', 'Medicine', 'Computers'],
    'Industrial': ['Food', 'Metals', 'Minerals', 'Chemicals', 'Adv Components'],
    'Mining': ['Food', 'Machinery', 'Medicine', 'Computers'], // <-- changed from Extraction
    'Refinery': ['Minerals', 'Machinery', 'Food', 'Medicine'],
    'Post Human': ['Food', 'Metals', 'Chemicals', 'Minerals', 'Luxury Goods'],
    'Tourism': ['Food', 'Luxury Goods', 'Medicine', 'Textiles'],
    'Service': ['Food', 'Computers', 'Machinery', 'Medicine', 'Textiles'],
    'Military': ['Food', 'Luxury Goods', 'Medicine'], // <-- new
    'Offworld': ['Food', 'Textiles', 'Metals'],           // <-- new
    'Alien': ['Food', 'Textiles', 'Machinery', 'Medicine'], // <-- new
    'Separatist': ['Metals', 'Food', 'Medicine', 'Adv Components', 'Computers'], // <-- new
    'Imperial': ['Food', 'Textiles', 'Metals', 'Machinery'], // <-- new
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

        MISSION_LOG("[MissionGenerator] Called with:", currentSystem, currentStation, player);
        MISSION_LOG("[MissionGenerator] Generating missions for", currentSystem?.name, currentStation?.name, player?.shipTypeName);

        const maxMissions = floor(random(5, 10)); // Slightly more variance maybe?
        const systemSecurity = currentSystem.securityLevel || 'Medium';
        const systemEconomy = currentSystem.economyType || 'Industrial'; // Default if undefined
        const systemTechLevel = currentSystem.techLevel || 5;

        // Ensure properties exist (should be handled by StarSystem constructor)
        if (!currentSystem.securityLevel) currentSystem.securityLevel = systemSecurity;
        if (!currentSystem.economyType) currentSystem.economyType = systemEconomy;
        if (!currentSystem.techLevel) currentSystem.techLevel = systemTechLevel;

        MISSION_LOG(`Generating Missions for ${currentStation.name} (${currentSystem.name}), Sec: ${systemSecurity}, Econ: ${systemEconomy}, Tech: ${systemTechLevel}`);

        // --- Base Probabilities ---
        // These will be modified based on security/economy
        // Make them add up to ~1.0 initially for easier reasoning
        let baseLegalDeliveryChance = 0.45;
        let baseBountyChance = 0.35;
        let baseIllegalDeliveryChance = 0.15;
        let baseAlienBountyChance = 0.20;
        let baseSabotageChance = 0.6;
        //let baseSabotageChance = 0.06; // Small chance to offer high-risk sabotage missions
        // Add placeholders for future types if needed
        // let baseMiningChance = 0.0;
        // let baseAssassinationChance = 0.0;
        let baseOtherChance = 0.05; // Small chance for 'other' or fallback

        // --- Apply Modifiers ---
        let adjustedLegal = baseLegalDeliveryChance;
        let adjustedBounty = baseBountyChance;
        let adjustedIllegal = baseIllegalDeliveryChance;
        let adjustedAlienBounty = baseAlienBountyChance;
        let adjustedSabotage = baseSabotageChance;
        let adjustedOther = baseOtherChance;

        // Security Modifiers
        switch (systemSecurity) {
            case 'High':
                adjustedBounty *= 0.1;       // Much les bounties
                adjustedIllegal *= 0.1;      // Drastically fewer illegal missions
                adjustedLegal *= 1.1;
                adjustedAlienBounty *= 0.5;
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
                adjustedLegal *= 0.3;     // Less legal trade
                adjustedAlienBounty *= 1.2;
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
            case 'Military': // <-- Specific increase for Military systems
                adjustedAlienBounty *= 3.0; // Significantly more Alien Bounties
                adjustedBounty *= 1.2; // Also slightly more regular bounties
                adjustedLegal *= 0.8;
                break;
            case 'Agricultural':
                adjustedLegal *= 1.2; // More trade focus
                adjustedBounty *= 0.8;
                adjustedIllegal *= 0.9; // Less likely hotbed for crime? Maybe.
                break;
            case 'Post Human':
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
            case 'Separatist':
                adjustedBounty *= 1.5; // More bounty missions - militant society
                adjustedIllegal *= 1.2; // More black market activity
                adjustedLegal *= 0.8;  // Less standard trade
                break;
            case 'Imperial':
                adjustedLegal *= 1.3;  // More luxurious trade
                adjustedBounty *= 0.8; // Less bounty hunting - stable space
                adjustedSabotage *= 0.3; // Less likely to get sabotage offers here
                // Could have special high-value transport missions
                break;
        }

        // Special missions for specific economy/security combinations
        if ((systemSecurity === 'Anarchy' || systemEconomy === 'Separatist') && random() < 0.3) {
            // 30% chance to generate a cop killer mission in these systems
            let copKillerMission = this.createCopKillerMission(currentSystem, currentStation, galaxy, player);
            if (copKillerMission) {
                availableMissions.push(copKillerMission);
            }
        }

        // Small global chance to generate an assassination mission (named target)
        let hasAssassination = false;
        if (random() < 0.20) { // Increased chance from 0.08 to 0.20
            try {
                let assMission = this.createAssassinationMission(currentSystem, currentStation, galaxy, player);
                if (assMission) {
                    availableMissions.push(assMission);
                    hasAssassination = true;
                }
            } catch (e) { console.error('Failed to create assassination mission:', e); }
        }

        // --- Faction-Specific Missions at Secret Bases ---
        // SECRET BASES ONLY SHOW FACTION MISSIONS - no normal missions
        if (currentStation.stationSubtype && currentStation.stationSubtype.startsWith('secret_')) {
            const stationFaction = this._getStationFaction(currentStation.stationSubtype);
            const playerFaction = player.isPolice ? 'POLICE' : player.playerFaction;

            console.log(`[MissionGenerator] SECRET BASE: ${currentStation.stationSubtype} -> Faction: ${stationFaction}, Player faction: ${playerFaction}`);

            // If player is not in this faction, show empty mission board with message
            if (!stationFaction || playerFaction !== stationFaction) {
                console.log(`[MissionGenerator] Access denied - not a member of ${stationFaction}`);
                // Return empty array - UI should show "no missions available" or similar
                return [];
            }

            // Player IS a member - generate ONLY faction missions (4-6 missions)
            const factionMissionCount = floor(random(4, 7));
            console.log(`[MissionGenerator] FACTION MEMBER! Generating ${factionMissionCount} exclusive ${stationFaction} missions`);

            const context = {
                originSystem: currentSystem,
                originStation: currentStation,
                galaxy: galaxy,
                player: player
            };

            try {
                for (let f = 0; f < factionMissionCount; f++) {
                    const factionMission = this._generateFactionMission(stationFaction, context);
                    if (factionMission) {
                        console.log(`[MissionGenerator] Created: ${factionMission.type} - ${factionMission.title}`);
                        availableMissions.push(factionMission);
                    }
                }
            } catch (e) {
                console.error('Failed to create faction missions:', e);
            }

            // RETURN EARLY - secret bases ONLY show faction missions
            return availableMissions;
        }

        // Adjust maxMissions based on whether assassination was added
        let adjustedMaxMissions = hasAssassination ? Math.max(3, maxMissions - 1) : maxMissions;

        // --- Normalize Probabilities ---
        // Ensure all adjusted probabilities are non-negative
        adjustedLegal = max(0, adjustedLegal);
        adjustedBounty = max(0, adjustedBounty);
        adjustedIllegal = max(0, adjustedIllegal);
        adjustedAlienBounty = max(0, adjustedAlienBounty);
        adjustedOther = max(0, adjustedOther); // Include any other types

        let totalAdjustedChance = adjustedLegal + adjustedBounty + adjustedIllegal + adjustedAlienBounty + adjustedSabotage + adjustedOther; // Sum of all chances

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
        let normAlienBounty = adjustedAlienBounty / totalAdjustedChance;
        let normSabotage = adjustedSabotage / totalAdjustedChance;
        // let normOther = adjustedOther / totalAdjustedChance; // Normalize others if added

        // --- Generate Missions based on Normalized Probabilities ---
        for (let i = 0; i < adjustedMaxMissions; i++) {
            let mission = null;
            let missionTypeRoll = random(); // Roll 0.0 to 1.0

            try {
                if (missionTypeRoll < normLegal) {
                    mission = this.createLegalDelivery(currentSystem, currentStation, galaxy, player);
                } else if (missionTypeRoll < normLegal + normBounty) {
                    mission = this.createBountyMission(currentSystem, currentStation, galaxy, player); // Pirate Bounty
                } else if (missionTypeRoll < normLegal + normBounty + normIllegal) {
                    mission = this.createIllegalDelivery(currentSystem, currentStation, galaxy, player);
                } else if (missionTypeRoll < normLegal + normBounty + normIllegal + normAlienBounty) { // <-- Alien Bounty slot
                    mission = this.createAlienBountyMission(currentSystem, currentStation, galaxy, player);
                } else if (missionTypeRoll < normLegal + normBounty + normIllegal + normAlienBounty + normSabotage) {
                    mission = this.createSabotageMission(currentSystem, currentStation, galaxy, player);
                } else {
                    // Fallback / 'Other' category if roll exceeds defined types
                    // For now, maybe generate another legal delivery as fallback?
                    MISSION_LOG(`Mission Gen: Rolled into 'Other' category (${missionTypeRoll.toFixed(3)}), generating fallback Legal Delivery.`);
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
                console.error(`Error creating mission (Roll: ${missionTypeRoll.toFixed(3)}, Type Slot: ${missionTypeRoll < normLegal ? 'Legal' :
                    missionTypeRoll < normLegal + normBounty ? 'Bounty' :
                        missionTypeRoll < normLegal + normBounty + normIllegal ? 'Illegal' : 'Other'
                    }):`, error);
            }
        } // End mission generation loop

        MISSION_LOG("[MissionGenerator] Missions generated:", availableMissions);
        MISSION_LOG(`Generated ${availableMissions.length} missions (Sec: ${systemSecurity}, Econ: ${systemEconomy}).`);

        // Quick runtime summary for debugging: counts per mission type
        try {
            const counts = {};
            for (let m of availableMissions) {
                const t = m?.type || 'Unknown';
                counts[t] = (counts[t] || 0) + 1;
            }
            console.log('[MissionGenerator] Mission type counts:', counts);
            // Explicitly warn if no assassination missions were generated this call
            if (!counts[MISSION_TYPE.ASSASSINATION]) {
                console.log('[MissionGenerator] Note: No assassination missions generated in this pass.');
            }
        } catch (e) { console.warn('MissionGenerator: Failed to compute mission counts:', e); }
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
        let jumpDistance = Infinity;
        const jumpRewardFactor = 250; // Base reward per jump
        const originIndex = originSystem?.systemIndex;
        const destinationIndex = destinationInfo.system?.systemIndex;
        if (typeof originIndex === 'number' && typeof destinationIndex === 'number') {
            try { jumpDistance = galaxy.getJumpDistance(originIndex, destinationIndex); }
            catch (e) { console.error("Err getJumpDistance:", e); jumpDistance = Infinity; }
        }
        if (!isFinite(jumpDistance) || jumpDistance <= 0) return null; // Skip if unreachable

        // --- Calculate Reward (ensure integer) ---
        // Find the base price of the cargo to add a value bonus
        const market = originStation?.market;
        const cargoData = market?.commodities?.find(c => c.name === cargo);
        const baseCargoValue = cargoData?.baseSell || 50; // Fallback value

        // Calculate reward: base + jump bonus + cargo value bonus + random element
        let reward = 100 + // Base reward
            Math.floor(jumpDistance * jumpRewardFactor) + // Jump bonus (floored)
            Math.floor(quantity * baseCargoValue * 0.15) + // Cargo value bonus (floored)
            floor(random(50, 250)); // Random bonus (floored)

        reward = Math.floor(reward); // Final floor just in case

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

    /** Creates an Illegal Smuggling Mission */
    static createIllegalDelivery(originSystem, originStation, galaxy, player) {
        // Destination finding and security check remain the same
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 3);
        if (!destinationInfo) return null;
        if (destinationInfo.system.securityLevel === 'High' && random() < 0.85) return null; // Even less likely now

        // Cargo type remains random from illegal list
        let cargo = random(ILLEGAL_CARGO);
        let quantity = floor(random(3, 10));

        // --- Calculate Jumps Bonus ---
        let jumpDistance = Infinity;
        const jumpRewardFactor = 400; // Higher reward for illegal jumps
        const originIndex = originSystem?.systemIndex;
        const destinationIndex = destinationInfo.system?.systemIndex;
        if (typeof originIndex === 'number' && typeof destinationIndex === 'number') {
            try { jumpDistance = galaxy.getJumpDistance(originIndex, destinationIndex); }
            catch (e) { console.error("Err getJumpDistance (Illegal):", e); jumpDistance = Infinity; }
        }
        if (!isFinite(jumpDistance) || jumpDistance <= 0) return null;

        // --- Calculate Reward (ensure integer) ---
        const market = originStation?.market;
        const cargoData = market?.commodities?.find(c => c.name === cargo); // Find base value if possible
        const baseCargoValue = cargoData?.baseSell || 100; // Higher fallback for illegal goods

        let reward = 300 + // Higher base reward
            Math.floor(jumpDistance * jumpRewardFactor) + // Jump bonus (floored)
            Math.floor(quantity * baseCargoValue * 0.25) + // Higher cargo value bonus (floored)
            floor(random(100, 500)); // Higher random bonus (floored)

        reward = Math.floor(reward); // Final floor

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
        let targetCount = floor(random(2, 6));

        const baseBountyPerShip = 300;
        // Reward can still be influenced by the origin system's properties, as that's where the contract is given.
        const techLevelBonus = (originSystem.techLevel || 5) * 10;
        const securityPenalty = (originSystem.securityLevel === 'High' ? -50 : (originSystem.securityLevel === 'Anarchy' ? 100 : 0));

        let reward = Math.floor(targetCount * baseBountyPerShip + techLevelBonus + securityPenalty + random(50, 300));
        reward = Math.max(100, Math.floor(reward));

        return new Mission({
            type: MISSION_TYPE.BOUNTY_PIRATE,
            title: `Pirate Cull: Destroy ${targetCount} Pirates`,
            description: `Pirate activity is a scourge across the galaxy. Eliminate ${targetCount} pirate vessels. Payment will be processed automatically upon fulfilling the contract.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null, // No specific destination system
            destinationStation: null,
            targetDesc: `${targetCount} Pirate vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false,
            progressCount: 0
        });
    }

    /** 
     * Creates a Cop Killer Mission - Targets (Police) can be destroyed anywhere.
     * This mission is typically offered in Anarchy or Separatist systems.
     */
    static createCopKillerMission(originSystem, originStation, galaxy, player) {
        // Target count can be based on general difficulty or origin system's context
        let targetCount = floor(random(2, 5)); // e.g., 2-4 police ships
        if (originSystem.securityLevel === 'Anarchy') {
            targetCount = floor(random(3, 6)); // Slightly more for anarchy origin
        }

        const baseBountyPerCop = 300;
        const techLevelBonus = (originSystem.techLevel || 5) * 15; // Origin system's tech can influence perceived difficulty/reward

        let reward = Math.floor(targetCount * baseBountyPerCop + techLevelBonus + random(200, 600));
        reward = Math.max(250, Math.floor(reward));

        // The completion flag name should be generic if the target system is not specific.
        // Or, it could be tied to the origin system if that makes sense for your game's event tracking.
        // For now, let's make it more generic or tied to origin.
        const completionFlagName = `copKillerMission_${originSystem.name}_${targetCount}_${Date.now() % 10000}`;

        return new Mission({
            type: MISSION_TYPE.BOUNTY_POLICE,
            title: `Eliminate ${targetCount} Police Ships`,
            description: `Certain parties require the disruption of security operations. Eliminate ${targetCount} police vessels anywhere you can find them. Payment will be processed automatically upon completion. Warning: This action will result in WANTED status in multiple systems.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null, // No specific destination system
            destinationStation: null,
            targetDesc: `${targetCount} Police vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: true,
            completionFlagName: completionFlagName
        });
    }

    /** Creates a Named Assassination Mission (single target, named). */
    static createAssassinationMission(originSystem, originStation, galaxy, player) {
        // Enhanced target name generation with flavorful titles and roles
        const targetTitles = [
            'Senator', 'Governor', 'Ambassador', 'Chancellor', 'Director', 'Executive',
            'Warlord', 'Syndicate Boss', 'Clan Leader', 'Mercenary Captain', 'Smuggler King',
            'Corporate Baron', 'Pirate Lord', 'Rebel Commander', 'Imperial Prefect', 'Trade Magnate',
            'Military Commander', 'Intelligence Chief', 'Black Market Kingpin', 'Rogue Admiral'
        ];

        const missionSources = [
            'Shadowy corporate interests', 'rival political factions', 'underground syndicates',
            'Military intelligence', 'corporate espionage divisions', 'rebel cells',
            'Imperial security services', 'black market consortiums', 'pirate cartels',
            'separatist movements', 'industrial magnates', 'colonial governors',
            'trade guilds', 'mercenary guilds', 'intelligence agencies'
        ];

        const targetBackgrounds = [
            'corrupt politician embezzling funds', 'ruthless warlord terrorizing colonies',
            'syndicate boss controlling illegal trade', 'corporate executive suppressing workers',
            'pirate captain raiding shipping lanes', 'rebel leader inciting unrest',
            'imperial official abusing power', 'smuggler kingpin evading authorities',
            'military defector selling secrets', 'trade baron manipulating markets',
            'intelligence operative gone rogue', 'colonial administrator exploiting natives'
        ];

        // Generate target name with title
        const baseName = (typeof generateHumanEnemyName === 'function') ? generateHumanEnemyName() : (`${random(['Mr.', 'Capt.', 'Cmdr.', 'Dr.', 'Sen.'])} ${Math.floor(random(100, 9999))}`);
        const title = random(targetTitles);
        const targetName = `${title} ${baseName}`;

        // Select mission source and background
        const source = random(missionSources);
        const background = random(targetBackgrounds);

        // Pick a ship type to travel in (try combat ships, fall back to pirate list)
        let shipType = null;
        if (typeof COMBAT_SHIPS !== 'undefined' && COMBAT_SHIPS.length > 0) shipType = random(COMBAT_SHIPS);
        else if (typeof PIRATE_SHIP_TYPES !== 'undefined' && PIRATE_SHIP_TYPES.length > 0) shipType = random(PIRATE_SHIP_TYPES);
        else shipType = 'Krait';

        // Reward calculation: named target carries influence/value
        const baseReward = 2500 + (originSystem.techLevel || 5) * 150; // Increased base from 1500 to 2500, tech multiplier from 100 to 150
        const securityBonus = (originSystem.securityLevel === 'Anarchy') ? 400 : 0; // Increased security bonus from 250 to 400
        const reward = Math.floor(baseReward + securityBonus + random(500, 2000)); // Increased random range from 200-1200 to 500-2000

        // Determine whether the assassination would be considered 'legal' (e.g., sanctioned pirate kills)
        // If the chosen ship type is a known pirate ship, treat as legal bounty-style assassination.
        let targetIsPirateShip = false;
        if (typeof PIRATE_SHIP_TYPES !== 'undefined' && Array.isArray(PIRATE_SHIP_TYPES)) {
            targetIsPirateShip = PIRATE_SHIP_TYPES.includes(shipType);
        }
        // If the target is a hauler/transport (civilian), this is clearly illegal
        let targetIsHauler = false;
        if (typeof HAULER_SHIPS !== 'undefined' && Array.isArray(HAULER_SHIPS)) {
            targetIsHauler = HAULER_SHIPS.includes(shipType);
        }

        // Legality: pirate targets are typically legal to kill; others (haulers, combat VIPs) are illegal
        const illegalFlag = !targetIsPirateShip;

        // Compute guard count based on reward magnitude (higher reward -> more guards)
        let guardCount = 1; // Base 1 guard

        // Choose guard ship types - prefer combat/police ships if available
        let guardShipType = null;
        if (typeof POLICE_SHIPS !== 'undefined' && POLICE_SHIPS.length > 0) guardShipType = random(POLICE_SHIPS);
        else if (typeof COMBAT_SHIPS !== 'undefined' && COMBAT_SHIPS.length > 0) guardShipType = random(COMBAT_SHIPS);
        else guardShipType = (typeof PIRATE_SHIP_TYPES !== 'undefined' ? random(PIRATE_SHIP_TYPES) : 'Krait');

        // Create flavorful description
        const descriptionTemplates = [
            `A contract has been issued by ${source} to eliminate ${targetName}, the ${background}. The target is known to pilot a ${shipType} and may be accompanied by security personnel. Complete the mission discreetly to avoid unwanted attention.`,
            `${source} requires the permanent removal of ${targetName}, a ${background} whose activities threaten their interests. Intelligence indicates the target travels in a ${shipType}. The operation must be executed with precision.`,
            `Eliminate ${targetName}, the ${background}, at the behest of ${source}. The target operates a ${shipType} and maintains a security detail. Success will be rewarded handsomely, but failure may have consequences.`,
            `${source} seeks the assassination of ${targetName}, notorious as a ${background}. The target commands a ${shipType} and is rarely without protection. The target may attempt to flee the system if threatened.`,
            `A high-priority contract from ${source} demands the death of ${targetName}, the ${background}. Expect heavy resistance from the target's ${shipType} and escort vessels. The mission cancels if the target escapes the system.`
        ];

        const description = random(descriptionTemplates);

        return new Mission({
            type: MISSION_TYPE.ASSASSINATION,
            title: `Assassinate ${targetName} (${shipType})`,
            description: description,
            originSystem: originSystem.name, originStation: originStation.name,
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `Target: ${targetName} in a ${shipType}`,
            targetCount: 1,
            rewardCredits: reward,
            isIllegal: illegalFlag,
            progressCount: 0,
            targetName: targetName,
            targetShipType: shipType,
            canLeaveSystem: true,
            // Extra fields to drive guard spawning at activation (runtime-only semantics handled in Mission.activate)
            guardCount: guardCount,
            guardShipType: guardShipType
        });
    }

    /**
     * Creates a Sabotage Mission: travel to another system and destroy a specific space object
     * located near a named planet. Offered by opposing factions (Separatist, Imperial, Military).
     */
    static createSabotageMission(originSystem, originStation, galaxy, player) {
        // Find a destination within reasonable range but allow deeper jumps
        let destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 6);
        if (!destinationInfo || !destinationInfo.system) return null;
        const destSystem = destinationInfo.system;

        // Choose a specific planet (exclude the sun at index 0) if available; fallback to 'Outer Orbit'
        let planetName = 'Outer Orbit';
        try {
            if (Array.isArray(destSystem.planets) && destSystem.planets.length > 1) {
                // pick from 1..n-1 to avoid the central star at index 0
                const idx = Math.floor(random(1, destSystem.planets.length));
                const p = destSystem.planets[idx];
                if (p && p.name) planetName = p.name;
            }
        } catch (e) { /* ignore */ }

        // Offering faction heuristics: prefer station faction, fall back to system economy
        // Leave `targetFaction` null so `Mission` can derive an appropriate opposing faction/backstory.
        let offeringFaction = originStation?.faction || originSystem?.economyType || null;

        // Map economy types to proper faction/organization names for grammatically correct descriptions
        const economyToFaction = {
            'Agricultural': 'Agricultural Collective',
            'Industrial': 'Industrial Consortium',
            'Mining': 'Mining Syndicate',
            'Refinery': 'Refinery Corporation',
            'Post Human': 'Post Human Council',
            'Tourism': 'Tourism Board',
            'Service': 'Service Guild',
            'Military': 'Military Command',
            'Offworld': 'Offworld Trading Company',
            'Alien': 'Xenological Institute',
            'Separatist': 'Separatist Movement',
            'Imperial': 'Imperial Authority'
        };

        if (typeof offeringFaction === 'string' && economyToFaction[offeringFaction]) {
            offeringFaction = economyToFaction[offeringFaction];
        } else if (typeof offeringFaction !== 'string') {
            const pool = ['Separatist Movement', 'Imperial Authority', 'Military Command'];
            offeringFaction = pool[Math.floor(random(0, pool.length))];
        }

        // Candidate canonical sabotage types (sourced from `spaceObjects.js`).
        // Prefer real object display names when `SpaceObject` is available.
        const canonicalSoTypes = [
            'satellite', 'telescope', 'relay', 'habitat', 'debris', 'probe', 'beacon', 'solarSail', 'engineArray', 'cargoCluster',
            'researchArray', 'orbitalGarden', 'decoyBuoy', 'miningPlatform', 'ancientRelic', 'signalFlare', 'spaceStation', 'observatoryDome',
            'hydroponicsBay', 'weaponPlatform', 'shieldGenerator', 'energyCollector', 'quantumGate', 'fuelDepot', 'commDish', 'solarFarm',
            'iceCrystal', 'nebulaFragment', 'alienArtifact', 'wreckage', 'observatoryDome', 'asteroidMiner'
        ];

        // Attempt to bind this sabotage mission to an actual SpaceObject spawned near the chosen planet.
        // If a real object is found, use its display name and persist its id. Otherwise fall back to a generic sabotType.
        let targetObjectType = null;
        let targetObjectId = null;
        try {
            // Ensure decorative objects exist so we can bind (safe no-op if already spawned)
            if ((!Array.isArray(destSystem.spaceObjects) || destSystem.spaceObjects.length === 0) && typeof destSystem.spawnSpaceObjectsForPlanets === 'function') {
                try { destSystem.spawnSpaceObjectsForPlanets(); } catch (e) { /* non-fatal */ }
            }

            if (destSystem && Array.isArray(destSystem.spaceObjects) && destSystem.spaceObjects.length > 0 && Array.isArray(destSystem.planets)) {
                const planetObj = destSystem.planets.find(p => p && p.name === planetName);
                if (planetObj && planetObj.pos) {
                    let best = null;
                    let bestDist = Infinity;
                    const maxConsiderDist = Math.max((planetObj.size || 0) * 1.2, 600);
                    for (let so of destSystem.spaceObjects) {
                        if (!so || !so.pos) continue;
                        const dx = so.pos.x - planetObj.pos.x;
                        const dy = so.pos.y - planetObj.pos.y;
                        const d = Math.sqrt(dx * dx + dy * dy);
                        if (d <= maxConsiderDist && d < bestDist) {
                            best = so; bestDist = d;
                        }
                    }
                    if (best) {
                        targetObjectId = best.id || null;
                        try { targetObjectType = best.getDisplayName ? best.getDisplayName() : (best.type || null); } catch (e) { targetObjectType = best.type || null; }
                    }
                }
            }
        } catch (e) { console.warn('createSabotageMission: failed to bind to real space object', e); }

        // Fallback to a canonical space-object name if we couldn't find a real object.
        if (!targetObjectType) {
            try {
                // If the SpaceObject constructor is present, instantiate to get the human-friendly name.
                if (typeof SpaceObject === 'function') {
                    const namePool = canonicalSoTypes.map(t => {
                        try { return (new SpaceObject(0, 0, t)).getDisplayName(); } catch (e) { return t; }
                    }).filter(Boolean);
                    targetObjectType = namePool.length ? namePool[Math.floor(random(0, namePool.length))] : canonicalSoTypes[Math.floor(random(0, canonicalSoTypes.length))];
                } else {
                    targetObjectType = canonicalSoTypes[Math.floor(random(0, canonicalSoTypes.length))];
                }
            } catch (e) {
                targetObjectType = canonicalSoTypes[Math.floor(random(0, canonicalSoTypes.length))];
            }
        }

        // Calculate reward based on jump distance (use galaxy helper if available)
        let jumpDistance = Infinity;
        try { jumpDistance = galaxy.getJumpDistance(originSystem.systemIndex, destSystem.systemIndex); } catch (e) { jumpDistance = 3; }
        if (!isFinite(jumpDistance) || jumpDistance <= 0) jumpDistance = 3;

        const baseReward = 5000; // Very high base
        const jumpMultiplier = 2000; // Reward per jump
        let reward = Math.floor(baseReward + Math.floor(jumpDistance * jumpMultiplier) + Math.floor(random(1000, 5000)));

        // Build a terse title; detailed backstory will be generated by Mission if description left blank
        const jumpText = jumpDistance === 1 ? '1 jump' : `${jumpDistance} jumps`;
        const title = `Sabotage: Destroy ${targetObjectType} near ${planetName} (${jumpText})`;

        return new Mission({
            type: MISSION_TYPE.SABOTAGE,
            title: title,
            description: '', // Let Mission class generate full backstory using offered/target fields
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: destSystem.name,
            // Persist the destination system index so missions referencing a specific
            // space object can be resolved to the correct system even when the player
            // is not currently present in that system.
            spawnSystemIndex: typeof destSystem.systemIndex === 'number' ? destSystem.systemIndex : null,
            systemIndex: typeof destSystem.systemIndex === 'number' ? destSystem.systemIndex : null,
            destinationStation: null,
            targetObjectType: targetObjectType,
            targetObjectId: targetObjectId,
            targetPlanetName: planetName,
            offeringFaction: offeringFaction,
            rewardCredits: reward,
            isIllegal: true,
            progressCount: 0
        });
    }

    /** 
     * Creates an Alien Bounty Mission - Targets can be destroyed anywhere.
     * High rewards, more common in Military systems.
     */
    static createAlienBountyMission(originSystem, originStation, galaxy, player) {
        let targetCount = floor(random(1, 4)); // 1 to 3 alien targets (they are tough)

        const baseBountyPerAlien = 1250; // Significantly higher base bounty
        const techLevelBonus = (originSystem.techLevel || 5) * 50; // Tech level of origin influences perceived threat/reward

        let reward = Math.floor(targetCount * baseBountyPerAlien + techLevelBonus + random(500, 2000));
        reward = Math.max(1500, Math.floor(reward)); // Ensure a high minimum reward

        return new Mission({
            type: MISSION_TYPE.BOUNTY_ALIEN,
            title: `Xeno Threat: Neutralize ${targetCount} Alien Hostiles`,
            description: `Alien vessels have been threatening human systems and shipping. High command authorizes the neutralization of ${targetCount} such xeno-threats. Payment will be processed automatically upon confirmation of kills. Extreme caution advised.`,
            originSystem: originSystem.name,
            originStation: originStation.name,
            destinationSystem: null, // No specific destination system
            destinationStation: null,
            targetDesc: `${targetCount} Alien vessels (any system)`, // You'll need "Alien" ship types for tracking
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false, // Assuming these are sanctioned hunts
            progressCount: 0
        });
    }

    /**
     * Maps secret station subtypes to faction keys.
     * @param {string} stationSubtype - e.g., 'secret_military', 'secret_separatist'
     * @returns {string|null} Faction key or null
     */
    static _getStationFaction(stationSubtype) {
        if (!stationSubtype) return null;
        if (stationSubtype.includes('military')) return 'MILITARY';
        if (stationSubtype.includes('separatist')) return 'SEPARATIST';
        if (stationSubtype.includes('imperial')) return 'IMPERIAL';
        if (stationSubtype.includes('police')) return 'POLICE';
        return null; // 'secret_generic' or 'secret_alien' don't map to player factions
    }

    /**
     * Generates a faction-specific mission based on faction type.
     * Uses registered handlers if available, otherwise creates inline.
     * @param {string} factionKey - 'IMPERIAL', 'SEPARATIST', 'MILITARY', 'POLICE'
     * @param {Object} context - Generation context with originSystem, originStation, galaxy, player
     * @returns {Mission|null}
     */
    static _generateFactionMission(factionKey, context) {
        const { originSystem, originStation, galaxy, player } = context;

        // Try registered handlers first (if MissionTypeRegistry exists)
        if (typeof MissionTypeRegistry !== 'undefined') {
            const handlers = MissionTypeRegistry.getHandlersForFaction(factionKey);
            const factionHandlers = handlers.filter(h => h.requiredFaction === factionKey);
            if (factionHandlers.length > 0) {
                const handler = random(factionHandlers);
                if (handler.canGenerate(context)) {
                    try {
                        return handler.create(context);
                    } catch (e) {
                        console.warn(`Faction handler ${handler.name} failed:`, e);
                    }
                }
            }
        }

        // Fallback: Generate inline faction missions
        const playerRank = player.getFactionRank?.(factionKey) || 0;
        const rankMultiplier = 1.0 + (playerRank * 0.1); // 10% bonus per rank

        switch (factionKey) {
            case 'IMPERIAL':
                return this._createImperialMission(originSystem, originStation, galaxy, player, rankMultiplier);
            case 'SEPARATIST':
                return this._createSeparatistMission(originSystem, originStation, galaxy, player, rankMultiplier);
            case 'MILITARY':
                return this._createMilitaryMission(originSystem, originStation, galaxy, player, rankMultiplier);
            default:
                return null;
        }
    }

    /**
     * Creates an Imperial faction mission.
     * @private
     */
    static _createImperialMission(originSystem, originStation, galaxy, player, rankMultiplier) {
        const missionTypes = ['elimination', 'patrol', 'strike', 'sabotage'];
        const missionType = random(missionTypes);

        if (missionType === 'elimination') {
            const targetCount = floor(random(1, 4));
            const baseReward = 1500 + (originSystem.techLevel || 5) * 100;
            const reward = Math.floor((baseReward + random(500, 1500)) * rankMultiplier);

            return new Mission({
                type: MISSION_TYPE.IMPERIAL_ELIMINATION,
                title: `Imperial Order: Eliminate ${targetCount} Separatist Vessels`,
                description: `Intelligence reports Separatist activity in the region. Imperial Command authorizes lethal force against ${targetCount} rebel vessels. Glory to the Empire.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: null,
                destinationStation: null,
                targetDesc: `${targetCount} Separatist vessels`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 3,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'IMPERIAL'
            });
        } else if (missionType === 'patrol') {
            const targetCount = floor(random(2, 5));
            const baseReward = 800 + (originSystem.techLevel || 5) * 50;
            const reward = Math.floor((baseReward + random(200, 600)) * rankMultiplier);

            return new Mission({
                type: MISSION_TYPE.IMPERIAL_PATROL,
                title: `Imperial Patrol: Scan ${targetCount} Vessels`,
                description: `Imperial Command requires patrol duty in this sector. Scan ${targetCount} vessels to ensure compliance with Imperial regulations.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: null,
                destinationStation: null,
                targetDesc: `Scan ${targetCount} vessels`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 1,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'IMPERIAL'
            });
        } else if (missionType === 'strike') {
            // Strike mission: coordinated attack on multiple targets in a system
            const targetCount = floor(random(3, 6));
            const baseReward = 3000 + (originSystem.techLevel || 5) * 200;
            const reward = Math.floor((baseReward + random(1000, 3000)) * rankMultiplier);

            // Find a separatist or anarchy system to strike
            const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 5);
            const destName = destinationInfo?.system?.name || 'designated sector';

            return new Mission({
                type: MISSION_TYPE.IMPERIAL_STRIKE,
                title: `Imperial Strike: Assault ${destName}`,
                description: `High Command has authorized a strike operation against rebel forces in ${destName}. Destroy ${targetCount} enemy vessels and any infrastructure supporting the insurrection. Expect heavy resistance.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: destName,
                destinationStation: null,
                targetDesc: `${targetCount} hostiles in ${destName}`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 4,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'IMPERIAL'
            });
        } else {
            // Sabotage mission: destroy rebel infrastructure
            const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 6);
            if (!destinationInfo) return this._createImperialMission(originSystem, originStation, galaxy, player, rankMultiplier);

            const destSystem = destinationInfo.system;
            const targetTypes = ['Comm Relay', 'Supply Depot', 'Rebel Beacon', 'Sensor Array', 'Shield Generator'];
            const targetType = random(targetTypes);

            const baseReward = 4000 + (originSystem.techLevel || 5) * 150;
            const reward = Math.floor((baseReward + random(1500, 4000)) * rankMultiplier);

            const jumpDistance = galaxy.getJumpDistance?.(originSystem.systemIndex, destSystem.systemIndex) || 3;
            const jumpText = jumpDistance === 1 ? '1 jump' : `${jumpDistance} jumps`;

            return new Mission({
                type: MISSION_TYPE.IMPERIAL_SABOTAGE,
                title: `Imperial Sabotage: Destroy ${targetType} (${jumpText})`,
                description: `Intelligence has identified a critical rebel ${targetType} in ${destSystem.name}. Infiltrate the system and destroy this infrastructure to cripple Separatist operations in the region.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: destSystem.name,
                destinationStation: null,
                targetObjectType: targetType,
                targetDesc: `Destroy ${targetType} in ${destSystem.name}`,
                rewardCredits: reward,
                prestigeReward: 5,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'IMPERIAL'
            });
        }
    }

    /**
     * Creates a Separatist faction mission.
     * @private
     */
    static _createSeparatistMission(originSystem, originStation, galaxy, player, rankMultiplier) {
        const missionTypes = ['raid', 'supply', 'strike', 'sabotage'];
        const missionType = random(missionTypes);

        if (missionType === 'raid') {
            const targetCount = floor(random(1, 4));
            const baseReward = 1200 + (originSystem.techLevel || 5) * 80;
            const reward = Math.floor((baseReward + random(400, 1200)) * rankMultiplier);

            return new Mission({
                type: MISSION_TYPE.SEPARATIST_RAID,
                title: `Freedom Strike: Destroy ${targetCount} Imperial Ships`,
                description: `The cause requires action. Eliminate ${targetCount} Imperial vessels to weaken their grip on the sector. For freedom!`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: null,
                destinationStation: null,
                targetDesc: `${targetCount} Imperial vessels`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 3,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'SEPARATIST'
            });
        } else if (missionType === 'supply') {
            // Supply mission - find a destination
            const destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 4);
            if (!destinationInfo) return this._createSeparatistMission(originSystem, originStation, galaxy, player, rankMultiplier);

            const cargoTypes = ['Weapons', 'Medicine', 'Machinery'];
            const cargo = random(cargoTypes);
            const quantity = floor(random(5, 15));
            const baseReward = 600 + quantity * 50;
            const reward = Math.floor((baseReward + random(200, 500)) * rankMultiplier);

            const jumpDistance = galaxy.getJumpDistance?.(originSystem.systemIndex, destinationInfo.system.systemIndex) || 2;
            const jumpText = jumpDistance === 1 ? '1 jump' : `${jumpDistance} jumps`;

            return new Mission({
                type: MISSION_TYPE.SEPARATIST_SUPPLY,
                title: `Supply Run: ${quantity}t ${cargo} to Rebel Cell (${jumpText})`,
                description: `Our operatives need supplies. Deliver ${quantity}t of ${cargo} to resistance contacts at ${destinationInfo.station.name}. Discretion advised.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: destinationInfo.system.name,
                destinationStation: destinationInfo.station.name,
                cargoType: cargo,
                cargoQuantity: quantity,
                rewardCredits: reward,
                prestigeReward: 2,
                isIllegal: true,
                requiredFaction: 'SEPARATIST'
            });
        } else if (missionType === 'strike') {
            // Strike mission: coordinated assault on Imperial forces
            const targetCount = floor(random(3, 6));
            const baseReward = 2500 + (originSystem.techLevel || 5) * 150;
            const reward = Math.floor((baseReward + random(800, 2500)) * rankMultiplier);

            const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 5);
            const destName = destinationInfo?.system?.name || 'Imperial territory';

            return new Mission({
                type: MISSION_TYPE.SEPARATIST_STRIKE,
                title: `Liberation Strike: Attack ${destName}`,
                description: `Command has authorized a strike operation to liberate ${destName} from Imperial occupation. Destroy ${targetCount} enemy forces and disrupt their control. Strike hard, strike fast!`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: destName,
                destinationStation: null,
                targetDesc: `${targetCount} Imperial forces in ${destName}`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 4,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'SEPARATIST'
            });
        } else {
            // Sabotage mission: destroy Imperial infrastructure
            const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 6);
            if (!destinationInfo) return this._createSeparatistMission(originSystem, originStation, galaxy, player, rankMultiplier);

            const destSystem = destinationInfo.system;
            const targetTypes = ['Imperial Beacon', 'Surveillance Station', 'Propaganda Array', 'Tax Collection Hub', 'Naval Depot'];
            const targetType = random(targetTypes);

            const baseReward = 3500 + (originSystem.techLevel || 5) * 120;
            const reward = Math.floor((baseReward + random(1000, 3500)) * rankMultiplier);

            const jumpDistance = galaxy.getJumpDistance?.(originSystem.systemIndex, destSystem.systemIndex) || 3;
            const jumpText = jumpDistance === 1 ? '1 jump' : `${jumpDistance} jumps`;

            return new Mission({
                type: MISSION_TYPE.SEPARATIST_SABOTAGE,
                title: `Sabotage: Destroy ${targetType} (${jumpText})`,
                description: `The ${targetType} in ${destSystem.name} is a symbol of Imperial oppression. Destroy it to inspire resistance and disrupt enemy operations. The people are counting on you.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: destSystem.name,
                destinationStation: null,
                targetObjectType: targetType,
                targetDesc: `Destroy ${targetType} in ${destSystem.name}`,
                rewardCredits: reward,
                prestigeReward: 5,
                isIllegal: true,
                progressCount: 0,
                requiredFaction: 'SEPARATIST'
            });
        }
    }

    /**
     * Creates a Military faction mission.
     * @private
     */
    static _createMilitaryMission(originSystem, originStation, galaxy, player, rankMultiplier) {
        const missionTypes = ['extermination', 'defense', 'strike', 'sabotage'];
        const missionType = random(missionTypes);

        if (missionType === 'extermination') {
            const targetCount = floor(random(2, 5));
            const baseReward = 2000 + (originSystem.techLevel || 5) * 150;
            const reward = Math.floor((baseReward + random(500, 2000)) * rankMultiplier);

            return new Mission({
                type: MISSION_TYPE.MILITARY_EXTERMINATION,
                title: `Xeno Command: Exterminate ${targetCount} Alien Threats`,
                description: `Military Command has declared a xeno-purge operation. Eliminate ${targetCount} alien vessels with extreme prejudice. Humanity's survival depends on vigilance.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: null,
                destinationStation: null,
                targetDesc: `${targetCount} Alien hostiles`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 4,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'MILITARY'
            });
        } else if (missionType === 'defense') {
            const targetCount = floor(random(3, 7));
            const baseReward = 1000 + (originSystem.techLevel || 5) * 75;
            const reward = Math.floor((baseReward + random(300, 800)) * rankMultiplier);

            return new Mission({
                type: MISSION_TYPE.MILITARY_DEFENSE,
                title: `System Defense: Neutralize ${targetCount} Hostiles`,
                description: `This sector is under military protection. Eliminate ${targetCount} hostile vessels (pirates, aliens, or other threats) to maintain security.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: null,
                destinationStation: null,
                targetDesc: `${targetCount} hostile vessels`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 3,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'MILITARY'
            });
        } else if (missionType === 'strike') {
            // Strike mission: assault on alien hive or pirate stronghold
            const targetCount = floor(random(4, 8));
            const baseReward = 4000 + (originSystem.techLevel || 5) * 250;
            const reward = Math.floor((baseReward + random(1500, 4000)) * rankMultiplier);

            const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 5);
            const destName = destinationInfo?.system?.name || 'hostile territory';
            const targetTypes = ['Alien Hive', 'Pirate Stronghold', 'Xeno Nest', 'Raider Base'];
            const targetType = random(targetTypes);

            return new Mission({
                type: MISSION_TYPE.MILITARY_STRIKE,
                title: `Military Strike: Assault ${targetType}`,
                description: `Intelligence has located a ${targetType} in ${destName}. Deploy to the sector, neutralize ${targetCount} hostiles, and eliminate the threat. This is a high-priority operation.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: destName,
                destinationStation: null,
                targetDesc: `${targetCount} hostiles at ${targetType}`,
                targetCount: targetCount,
                rewardCredits: reward,
                prestigeReward: 5,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'MILITARY'
            });
        } else {
            // Sabotage mission: destroy alien tech or pirate infrastructure
            const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 6);
            if (!destinationInfo) return this._createMilitaryMission(originSystem, originStation, galaxy, player, rankMultiplier);

            const destSystem = destinationInfo.system;
            const targetTypes = ['Alien Artifact', 'Xeno Tech Cache', 'Pirate Comm Hub', 'Smuggler Depot', 'Contraband Storage'];
            const targetType = random(targetTypes);

            const baseReward = 3500 + (originSystem.techLevel || 5) * 180;
            const reward = Math.floor((baseReward + random(1200, 3500)) * rankMultiplier);

            const jumpDistance = galaxy.getJumpDistance?.(originSystem.systemIndex, destSystem.systemIndex) || 3;
            const jumpText = jumpDistance === 1 ? '1 jump' : `${jumpDistance} jumps`;

            return new Mission({
                type: MISSION_TYPE.MILITARY_SABOTAGE,
                title: `Tactical Sabotage: Destroy ${targetType} (${jumpText})`,
                description: `A ${targetType} has been identified in ${destSystem.name}. This asset poses a strategic threat and must be eliminated. Infiltrate the system and complete the objective with minimal collateral damage.`,
                originSystem: originSystem.name,
                originStation: originStation.name,
                destinationSystem: destSystem.name,
                destinationStation: null,
                targetObjectType: targetType,
                targetDesc: `Destroy ${targetType} in ${destSystem.name}`,
                rewardCredits: reward,
                prestigeReward: 4,
                isIllegal: false,
                progressCount: 0,
                requiredFaction: 'MILITARY'
            });
        }
    }

} // End MissionGenerator Class