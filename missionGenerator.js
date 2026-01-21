// ****** missionGenerator.js ******

// ═══════════════════════════════════════════════════════════════════════════
// ECONOMY DATA CONSTANTS
// ═══════════════════════════════════════════════════════════════════════════

const LEGAL_CARGO = getLegalCommodities();
const ILLEGAL_CARGO = getIllegalCommodities();
const PIRATE_SHIP_TYPES = ['Krait', 'Adder', 'Sidewinder', 'CobraMkIII'];

// Economy-specific cargo exports (goods they produce/sell cheaply)
const ECONOMY_EXPORTS = {
    'Agricultural': ['Food', 'Textiles'],
    'Industrial': ['Machinery'],
    'Mining': ['Metals', 'Minerals'],
    'Refinery': ['Metals', 'Chemicals'],
    'Post Human': ['Computers', 'Medicine', 'Adv Components'],
    'Tourism': [],
    'Service': [],
    'Military': [],
    'Offworld': ['Luxury Goods', 'Adv Components'],
    'Alien': ['Adv Components'],
    'Separatist': ['Machinery', 'Chemicals'],
    'Imperial': ['Luxury Goods', 'Adv Components', 'Computers', 'Medicine'],
    'Default': ['Food', 'Textiles', 'Machinery']
};

// Economy-specific cargo imports (goods they need/buy dearly)
const ECONOMY_IMPORTS = {
    'Agricultural': ['Machinery', 'Chemicals', 'Medicine', 'Computers'],
    'Industrial': ['Food', 'Metals', 'Minerals', 'Chemicals', 'Adv Components'],
    'Mining': ['Food', 'Machinery', 'Medicine', 'Computers'],
    'Refinery': ['Minerals', 'Machinery', 'Food', 'Medicine'],
    'Post Human': ['Food', 'Metals', 'Chemicals', 'Minerals', 'Luxury Goods'],
    'Tourism': ['Food', 'Luxury Goods', 'Medicine', 'Textiles'],
    'Service': ['Food', 'Computers', 'Machinery', 'Medicine', 'Textiles'],
    'Military': ['Food', 'Luxury Goods', 'Medicine'],
    'Offworld': ['Food', 'Textiles', 'Metals'],
    'Alien': ['Food', 'Textiles', 'Machinery', 'Medicine'],
    'Separatist': ['Metals', 'Food', 'Medicine', 'Adv Components', 'Computers'],
    'Imperial': ['Food', 'Textiles', 'Metals', 'Machinery'],
    'Default': LEGAL_CARGO
};

// ═══════════════════════════════════════════════════════════════════════════
// MISSION GENERATOR CLASS
// ═══════════════════════════════════════════════════════════════════════════

class MissionGenerator {

    // ═══════════════════════════════════════════════════════════════════════
    // CORE HELPER METHODS (DRY)
    // ═══════════════════════════════════════════════════════════════════════

    /** Calculate jump distance between two systems safely */
    static getJumpDistance(originSystem, destSystem, galaxy) {
        const originIndex = originSystem?.systemIndex;
        const destIndex = destSystem?.systemIndex;
        if (typeof originIndex !== 'number' || typeof destIndex !== 'number') return Infinity;
        try {
            return galaxy.getJumpDistance(originIndex, destIndex);
        } catch (e) {
            console.error("Error calculating jump distance:", e);
            return Infinity;
        }
    }

    /** Format jump distance as human-readable string */
    static formatJumpText(jumpDistance) {
        return jumpDistance === 1 ? "1 jump" : `${jumpDistance} jumps`;
    }

    /** Get cargo base value from station market */
    static getCargoValue(station, cargoName, fallback = 50) {
        const cargoData = station?.market?.commodities?.find(c => c.name === cargoName);
        return cargoData?.baseSell || fallback;
    }

    /** Select combat ship type with fallbacks */
    static selectCombatShip() {
        if (typeof COMBAT_SHIPS !== 'undefined' && COMBAT_SHIPS.length > 0) return random(COMBAT_SHIPS);
        if (typeof PIRATE_SHIP_TYPES !== 'undefined' && PIRATE_SHIP_TYPES.length > 0) return random(PIRATE_SHIP_TYPES);
        return 'Krait';
    }

    /** Select guard/escort ship type with fallbacks */
    static selectGuardShip() {
        if (typeof POLICE_SHIPS !== 'undefined' && POLICE_SHIPS.length > 0) return random(POLICE_SHIPS);
        if (typeof COMBAT_SHIPS !== 'undefined' && COMBAT_SHIPS.length > 0) return random(COMBAT_SHIPS);
        if (typeof PIRATE_SHIP_TYPES !== 'undefined') return random(PIRATE_SHIP_TYPES);
        return 'Krait';
    }

    /** Extract common origin data from system/station */
    static getOriginData(originSystem, originStation) {
        return {
            originSystem: originSystem.name,
            originStation: originStation.name
        };
    }

    /** Calculate bounty-style reward with tech/security modifiers */
    static calculateBountyReward(targetCount, basePerTarget, originSystem, randomMin = 50, randomMax = 300) {
        const techBonus = (originSystem.techLevel || 5) * 10;
        const securityMod = originSystem.securityLevel === 'High' ? -50 :
            originSystem.securityLevel === 'Anarchy' ? 100 : 0;
        const reward = targetCount * basePerTarget + techBonus + securityMod + floor(random(randomMin, randomMax));
        return Math.max(100, Math.floor(reward));
    }

    /** Validate jump distance is usable */
    static isValidJumpDistance(jumpDistance) {
        return isFinite(jumpDistance) && jumpDistance > 0;
    }

    /** Create common mission data object */
    static createMissionData(type, title, description, originSystem, originStation, options = {}) {
        return {
            type,
            title,
            description,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: options.destinationSystem || null,
            destinationStation: options.destinationStation || null,
            targetDesc: options.targetDesc || null,
            targetCount: options.targetCount || 0,
            rewardCredits: options.rewardCredits || 0,
            prestigeReward: options.prestigeReward || 0,
            isIllegal: options.isIllegal || false,
            progressCount: 0,
            requiredFaction: options.requiredFaction || null,
            cargoType: options.cargoType || null,
            cargoQuantity: options.cargoQuantity || 0,
            targetObjectType: options.targetObjectType || null,
            spawnSystemIndex: options.spawnSystemIndex || null
        };
    }

    /** Calculate faction mission reward with rank multiplier */
    static calculateFactionReward(baseReward, techLevel, rankMultiplier, randomMin, randomMax) {
        const techBonus = (techLevel || 5) * 100;
        return Math.floor((baseReward + techBonus + random(randomMin, randomMax)) * rankMultiplier);
    }

    /** Generate economy information text for mission descriptions (50% chance of being unknown) */
    static getEconomyInfoText(destSystem) {
        // Determine if economy is known (50% chance)
        // This should be called once during mission creation to avoid changing info on refresh
        if (random() < 0.5) {
            return null; // Return null to indicate unknown (caller should handle)
        }
        const economy = destSystem?.economyType || 'Unknown';
        return economy;
    }

    /** Calculate reward bonus for Alien systems (dangerous missions) */
    static getAlienSystemBonus(destSystem, baseReward) {
        if (!destSystem || !destSystem.economyType) return 0;
        if (destSystem.economyType === 'Alien') {
            return Math.floor(baseReward * 0.5); // 50% bonus for Alien systems
        }
        return 0;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // MAIN MISSION GENERATION
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Generate missions for a station's mission board.
     * @param {Object} currentSystem - The star system
     * @param {Object} currentStation - The station
     * @param {Object} galaxy - The galaxy reference
     * @param {Object} player - The player reference
     * @returns {Mission[]} Array of generated missions
     */
    static generateMissions(currentSystem, currentStation, galaxy, player) {
        if (!currentSystem || !currentStation || !galaxy || !player) {
            console.error("MissionGenerator.generateMissions: Missing required arguments.");
            return [];
        }

        MISSION_LOG("[MissionGenerator] Generating missions for", currentSystem?.name, currentStation?.name);

        // Handle secret faction bases first
        if (this._isSecretFactionStation(currentStation)) {
            return this._generateSecretBaseMissions(currentSystem, currentStation, galaxy, player);
        }

        // Generate standard missions
        return this._generateStandardMissions(currentSystem, currentStation, galaxy, player);
    }

    /** Check if station is a secret faction base */
    static _isSecretFactionStation(station) {
        return station.stationSubtype && station.stationSubtype.startsWith('secret_');
    }

    /** Generate missions for secret faction bases */
    static _generateSecretBaseMissions(currentSystem, currentStation, galaxy, player) {
        const stationFaction = this._getStationFaction(currentStation.stationSubtype);
        const playerFaction = player.isPolice ? 'POLICE' : player.playerFaction;

        console.log(`[MissionGenerator] SECRET BASE: ${currentStation.stationSubtype} -> Faction: ${stationFaction}, Player: ${playerFaction}`);

        if (!stationFaction || playerFaction !== stationFaction) {
            console.log(`[MissionGenerator] Access denied - not a member of ${stationFaction}`);
            return [];
        }

        const missionCount = floor(random(4, 7));
        console.log(`[MissionGenerator] FACTION MEMBER! Generating ${missionCount} exclusive ${stationFaction} missions`);

        const context = { originSystem: currentSystem, originStation: currentStation, galaxy, player };
        const missions = [];

        for (let i = 0; i < missionCount; i++) {
            try {
                const mission = this._generateFactionMission(stationFaction, context);
                if (mission) {
                    console.log(`[MissionGenerator] Created: ${mission.type} - ${mission.title}`);
                    missions.push(mission);
                }
            } catch (e) {
                console.error('Failed to create faction mission:', e);
            }
        }

        return missions;
    }

    /** Generate standard (non-faction) missions */
    static _generateStandardMissions(currentSystem, currentStation, galaxy, player) {
        const availableMissions = [];
        const systemData = this._getSystemData(currentSystem);
        const probabilities = this._calculateMissionProbabilities(systemData);

        // Special missions
        this._addSpecialMissions(availableMissions, currentSystem, currentStation, galaxy, player, systemData);

        // Standard mission count
        const maxMissions = floor(random(5, 10));
        const hasAssassination = availableMissions.some(m => m?.type === MISSION_TYPE.ASSASSINATION);
        const adjustedMax = hasAssassination ? Math.max(3, maxMissions - 1) : maxMissions;

        // Generate standard missions based on probabilities
        for (let i = 0; i < adjustedMax; i++) {
            const mission = this._generateMissionByProbability(
                probabilities,
                currentSystem,
                currentStation,
                galaxy,
                player
            );
            if (mission) availableMissions.push(mission);
        }

        this._logMissionCounts(availableMissions, systemData);
        return availableMissions;
    }

    /** Extract system data for mission generation */
    static _getSystemData(system) {
        return {
            security: system.securityLevel || 'Medium',
            economy: system.economyType || 'Industrial',
            techLevel: system.techLevel || 5
        };
    }

    /** Calculate mission type probabilities based on system properties */
    static _calculateMissionProbabilities(systemData) {
        // Base probabilities
        let probs = {
            legal: 0.45,
            bounty: 0.35,
            illegal: 0.15,
            alienBounty: 0.20,
            sabotage: 0.06,
            other: 0.05
        };

        // Apply security modifiers
        probs = this._applySecurityModifiers(probs, systemData.security);

        // Apply economy modifiers
        probs = this._applyEconomyModifiers(probs, systemData.economy);

        // Normalize
        return this._normalizeProbabilities(probs);
    }

    /** Apply security-based probability modifiers */
    static _applySecurityModifiers(probs, security) {
        const modifiers = {
            'High': { bounty: 0.1, illegal: 0.1, legal: 1.1, alienBounty: 0.5 },
            'Medium': { bounty: 1.1, illegal: 0.9 },
            'Low': { bounty: 0.6, illegal: 2.5, legal: 0.8 },
            'Anarchy': { bounty: 1.8, illegal: 4.0, legal: 0.3, alienBounty: 1.2 }
        };

        const mods = modifiers[security] || {};
        return {
            legal: probs.legal * (mods.legal || 1),
            bounty: probs.bounty * (mods.bounty || 1),
            illegal: probs.illegal * (mods.illegal || 1),
            alienBounty: probs.alienBounty * (mods.alienBounty || 1),
            sabotage: probs.sabotage,
            other: probs.other
        };
    }

    /** Apply economy-based probability modifiers */
    static _applyEconomyModifiers(probs, economy) {
        const modifiers = {
            'Industrial': { legal: 1.1, bounty: 0.9 },
            'Refinery': { legal: 1.1, bounty: 0.9 },
            'Mining': { legal: 1.1, bounty: 0.9 },
            'Military': { alienBounty: 3.0, bounty: 1.2, legal: 0.8 },
            'Agricultural': { legal: 1.2, bounty: 0.8, illegal: 0.9 },
            'Post Human': { bounty: 1.1, legal: 1.1 },
            'Tourism': { bounty: 0.9, legal: 0.9 },
            'Service': { bounty: 0.9, legal: 0.9 },
            'Separatist': { bounty: 1.5, illegal: 1.2, legal: 0.8 },
            'Imperial': { legal: 1.3, bounty: 0.8, sabotage: 0.3 }
        };

        const mods = modifiers[economy] || {};
        return {
            legal: probs.legal * (mods.legal || 1),
            bounty: probs.bounty * (mods.bounty || 1),
            illegal: probs.illegal * (mods.illegal || 1),
            alienBounty: probs.alienBounty * (mods.alienBounty || 1),
            sabotage: probs.sabotage * (mods.sabotage || 1),
            other: probs.other
        };
    }

    /** Normalize probabilities to sum to 1.0 */
    static _normalizeProbabilities(probs) {
        // Ensure non-negative
        Object.keys(probs).forEach(k => probs[k] = Math.max(0, probs[k]));

        const total = Object.values(probs).reduce((sum, v) => sum + v, 0);
        if (total <= 0) return { legal: 0.5, bounty: 0.3, illegal: 0.1, alienBounty: 0.05, sabotage: 0.03, other: 0.02 };

        Object.keys(probs).forEach(k => probs[k] /= total);
        return probs;
    }

    /** Add special missions (cop killer, assassination) based on conditions */
    static _addSpecialMissions(missions, system, station, galaxy, player, systemData) {
        // Cop killer mission for Anarchy/Separatist systems
        if ((systemData.security === 'Anarchy' || systemData.economy === 'Separatist') && random() < 0.3) {
            const copKiller = this.createCopKillerMission(system, station, galaxy, player);
            if (copKiller) missions.push(copKiller);
        }

        // Assassination mission (20% chance)
        if (random() < 0.20) {
            try {
                const assassination = this.createAssassinationMission(system, station, galaxy, player);
                if (assassination) missions.push(assassination);
            } catch (e) {
                console.error('Failed to create assassination mission:', e);
            }
        }
    }

    /** Generate a single mission based on probability distribution */
    static _generateMissionByProbability(probs, system, station, galaxy, player) {
        const roll = random();
        let cumulative = 0;

        const handlers = [
            { prob: probs.legal, create: () => this.createLegalDelivery(system, station, galaxy, player) },
            { prob: probs.bounty, create: () => this.createBountyMission(system, station, galaxy, player) },
            { prob: probs.illegal, create: () => this.createIllegalDelivery(system, station, galaxy, player) },
            { prob: probs.alienBounty, create: () => this.createAlienBountyMission(system, station, galaxy, player) },
            { prob: probs.sabotage, create: () => this.createSabotageMission(system, station, galaxy, player) }
        ];

        for (const handler of handlers) {
            cumulative += handler.prob;
            if (roll < cumulative) {
                try {
                    return handler.create();
                } catch (e) {
                    console.error('Mission creation failed:', e);
                    return null;
                }
            }
        }

        // Fallback
        return this.createLegalDelivery(system, station, galaxy, player) ||
            this.createBountyMission(system, station, galaxy, player);
    }

    /** Log mission generation summary */
    static _logMissionCounts(missions, systemData) {
        try {
            const counts = {};
            for (const m of missions) {
                const t = m?.type || 'Unknown';
                counts[t] = (counts[t] || 0) + 1;
            }
            console.log('[MissionGenerator] Mission type counts:', counts);
            console.log(`[MissionGenerator] Generated ${missions.length} missions (Sec: ${systemData.security}, Econ: ${systemData.economy})`);
        } catch (e) {
            console.warn('MissionGenerator: Failed to compute mission counts:', e);
        }
    }

    // ═══════════════════════════════════════════════════════════════════════
    // DESTINATION FINDING
    // ═══════════════════════════════════════════════════════════════════════

    /**
     * Find a nearby destination system.
     * @param {Object} originSystem - Starting system
     * @param {Object} galaxy - Galaxy reference
     * @param {boolean} requireStation - Whether destination must have a station
     * @param {number} maxJumps - Maximum jump distance
     * @returns {Object|null} Destination info or null
     */
    static findNearbyDestination(originSystem, galaxy, requireStation = true, maxJumps = 4) {
        if (!originSystem || !galaxy || !galaxy.systems || typeof originSystem.systemIndex !== 'number') {
            return null;
        }

        const originIndex = originSystem.systemIndex;
        const queue = [[originIndex, 0]];
        const visited = new Set([originIndex]);
        const potentialDestinations = [];
        let head = 0;

        while (head < queue.length) {
            const [currentIndex, currentJumps] = queue[head++];
            if (currentJumps >= maxJumps) continue;

            const currentSys = galaxy.systems[currentIndex];
            if (!currentSys || !Array.isArray(currentSys.connectedSystemIndices)) continue;

            for (const neighborIndex of currentSys.connectedSystemIndices) {
                if (neighborIndex >= 0 && neighborIndex < galaxy.systems.length && !visited.has(neighborIndex)) {
                    visited.add(neighborIndex);
                    const neighborSystem = galaxy.systems[neighborIndex];
                    if (neighborSystem) {
                        const meetsRequirement = !requireStation || (requireStation && neighborSystem.station);
                        if (meetsRequirement) {
                            potentialDestinations.push({
                                system: neighborSystem,
                                station: neighborSystem.station
                            });
                        }
                        queue.push([neighborIndex, currentJumps + 1]);
                    }
                }
            }
        }

        if (potentialDestinations.length > 0) {
            return random(potentialDestinations);
        }

        console.warn(`findNearbyDestination: No suitable destination found within ${maxJumps} jumps for ${originSystem.name}`);
        return null;
    }

    // ═══════════════════════════════════════════════════════════════════════
    // STANDARD MISSION CREATORS
    // ═══════════════════════════════════════════════════════════════════════

    /** Creates a Legal Delivery Mission */
    static createLegalDelivery(originSystem, originStation, galaxy, player) {
        const destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 4);
        if (!destinationInfo) return null;

        const cargo = this._selectDeliveryCargo(originSystem, destinationInfo.system, LEGAL_CARGO);
        if (!cargo) return null;

        const quantity = floor(random(5, 16));
        const jumpDistance = this.getJumpDistance(originSystem, destinationInfo.system, galaxy);
        if (!this.isValidJumpDistance(jumpDistance)) return null;

        const baseCargoValue = this.getCargoValue(originStation, cargo, 50);
        let reward = Math.floor(100 + jumpDistance * 250 + quantity * baseCargoValue * 0.15 + floor(random(50, 250)));

        // Apply Alien system bonus
        const alienBonus = this.getAlienSystemBonus(destinationInfo.system, reward);
        reward += alienBonus;

        const jumpText = this.formatJumpText(jumpDistance);
        const economyKnown = this.getEconomyInfoText(destinationInfo.system);
        const economyText = economyKnown ? `Destination economy: ${economyKnown}.` : 'Intelligence on the destination economy is unavailable.';

        return new Mission({
            type: MISSION_TYPE.DELIVERY_LEGAL,
            title: `Deliver ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Transport ${quantity}t of ${cargo} to ${destinationInfo.station.name} station in ${destinationInfo.system.name} (${jumpText} away). ${economyText} Standard contract. Payment upon delivery.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            isIllegal: false
        });
    }

    /** Select appropriate cargo for delivery mission based on economies */
    static _selectDeliveryCargo(originSystem, destSystem, legalCargoList) {
        const originEconomy = originSystem.economyType || 'Default';
        const destEconomy = destSystem.economyType || 'Default';

        const exports = (ECONOMY_EXPORTS[originEconomy] || ECONOMY_EXPORTS['Default']).filter(c => legalCargoList.includes(c));
        const imports = (ECONOMY_IMPORTS[destEconomy] || ECONOMY_IMPORTS['Default']).filter(c => legalCargoList.includes(c));

        // Priority 1: Goods dest imports that origin exports
        let candidates = imports.filter(c => exports.includes(c));

        // Priority 2: Goods dest imports
        if (candidates.length === 0) candidates = imports;

        // Priority 3: Goods origin exports
        if (candidates.length === 0) candidates = exports;

        // Priority 4: Fallback to full list
        if (candidates.length === 0) candidates = legalCargoList;

        return candidates.length > 0 ? random(candidates) : null;
    }

    /** Creates an Illegal Smuggling Mission */
    static createIllegalDelivery(originSystem, originStation, galaxy, player) {
        const destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 3);
        if (!destinationInfo) return null;
        if (destinationInfo.system.securityLevel === 'High' && random() < 0.85) return null;

        const cargo = random(ILLEGAL_CARGO);
        const quantity = floor(random(3, 10));
        const jumpDistance = this.getJumpDistance(originSystem, destinationInfo.system, galaxy);
        if (!this.isValidJumpDistance(jumpDistance)) return null;

        const baseCargoValue = this.getCargoValue(originStation, cargo, 100);
        let reward = Math.floor(300 + jumpDistance * 400 + quantity * baseCargoValue * 0.25 + floor(random(100, 500)));

        // Apply Alien system bonus
        const alienBonus = this.getAlienSystemBonus(destinationInfo.system, reward);
        reward += alienBonus;

        const jumpText = this.formatJumpText(jumpDistance);
        const economyKnown = this.getEconomyInfoText(destinationInfo.system);
        const economyText = economyKnown ? `Destination economy: ${economyKnown}.` : 'Intelligence on the destination economy is unavailable.';

        return new Mission({
            type: MISSION_TYPE.DELIVERY_ILLEGAL,
            title: `Smuggle ${quantity}t ${cargo} to ${destinationInfo.station.name} (${jumpText})`,
            description: `Discreet transport of ${quantity}t of restricted goods (${cargo}) to ${destinationInfo.station.name} in ${destinationInfo.system.name} (${jumpText} away). ${economyText} Avoid scans. High payment on delivery.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            isIllegal: true
        });
    }

    /** Creates a Pirate Bounty Hunting Mission */
    static createBountyMission(originSystem, originStation, galaxy, player) {
        const targetCount = floor(random(2, 6));
        const reward = this.calculateBountyReward(targetCount, 300, originSystem);

        return new Mission({
            type: MISSION_TYPE.BOUNTY_PIRATE,
            title: `Pirate Cull: Destroy ${targetCount} Pirates`,
            description: `Pirate activity is a scourge across the galaxy. Eliminate ${targetCount} pirate vessels. Payment will be processed automatically upon fulfilling the contract.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Pirate vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false,
            progressCount: 0
        });
    }

    /** Creates a Cop Killer Mission */
    static createCopKillerMission(originSystem, originStation, galaxy, player) {
        let targetCount = floor(random(2, 5));
        if (originSystem.securityLevel === 'Anarchy') {
            targetCount = floor(random(3, 6));
        }

        const techBonus = (originSystem.techLevel || 5) * 15;
        const reward = Math.max(250, Math.floor(targetCount * 300 + techBonus + random(200, 600)));

        return new Mission({
            type: MISSION_TYPE.BOUNTY_POLICE,
            title: `Eliminate ${targetCount} Police Ships`,
            description: `Certain parties require the disruption of security operations. Eliminate ${targetCount} police vessels anywhere you can find them. Payment will be processed automatically upon completion. Warning: This action will result in WANTED status in multiple systems.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Police vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: true
        });
    }

    /** Creates an Alien Bounty Mission */
    static createAlienBountyMission(originSystem, originStation, galaxy, player) {
        const targetCount = floor(random(1, 4));
        const baseBountyPerAlien = 1250;
        const techLevelBonus = (originSystem.techLevel || 5) * 50;
        const reward = Math.max(1500, Math.floor(targetCount * baseBountyPerAlien + techLevelBonus + random(500, 2000)));

        return new Mission({
            type: MISSION_TYPE.BOUNTY_ALIEN,
            title: `Xeno Threat: Neutralize ${targetCount} Alien Hostiles`,
            description: `Alien vessels have been threatening human systems and shipping. High command authorizes the neutralization of ${targetCount} such xeno-threats. Payment will be processed automatically upon confirmation of kills. Extreme caution advised.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} Alien vessels (any system)`,
            targetCount: targetCount,
            rewardCredits: reward,
            isIllegal: false,
            progressCount: 0
        });
    }

    /** Creates a Named Assassination Mission */
    static createAssassinationMission(originSystem, originStation, galaxy, player) {
        const targetData = this._generateAssassinationTarget();
        const shipType = this.selectCombatShip();
        const guardCount = 1;
        const guardShipType = this.selectGuardShip();

        const upgrades = this._generateTargetUpgrades(originSystem.techLevel || 5);
        const reward = this._calculateAssassinationReward(originSystem, shipType, upgrades.details);

        const illegalFlag = !this._isTargetPirateShip(shipType);
        const description = this._generateAssassinationDescription(targetData, shipType, upgrades.names);

        return new Mission({
            type: MISSION_TYPE.ASSASSINATION,
            title: `Assassinate ${targetData.name} (${shipType})`,
            description: description,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `Target: ${targetData.name} in a ${shipType}`,
            targetCount: 1,
            rewardCredits: reward,
            isIllegal: illegalFlag,
            progressCount: 0,
            targetName: targetData.name,
            targetPilotRank: targetData.pilotRank,
            targetShipType: shipType,
            targetUpgrades: upgrades.names,
            targetUpgradeDetails: upgrades.details,
            canLeaveSystem: true,
            guardCount: guardCount,
            guardShipType: guardShipType
        });
    }

    /** Generate assassination target data */
    static _generateAssassinationTarget() {
        const titles = [
            'Senator', 'Governor', 'Ambassador', 'Chancellor', 'Director', 'Executive',
            'Warlord', 'Syndicate Boss', 'Clan Leader', 'Mercenary Captain', 'Smuggler King',
            'Corporate Baron', 'Pirate Lord', 'Rebel Commander', 'Imperial Prefect', 'Trade Magnate',
            'Military Commander', 'Intelligence Chief', 'Black Market Kingpin', 'Rogue Admiral'
        ];

        const sources = [
            'Shadowy corporate interests', 'rival political factions', 'underground syndicates',
            'Military intelligence', 'corporate espionage divisions', 'rebel cells',
            'Imperial security services', 'black market consortiums', 'pirate cartels'
        ];

        const backgrounds = [
            'corrupt politician embezzling funds', 'ruthless warlord terrorizing colonies',
            'syndicate boss controlling illegal trade', 'corporate executive suppressing workers',
            'pirate captain raiding shipping lanes', 'rebel leader inciting unrest'
        ];

        const baseName = (typeof generateHumanEnemyName === 'function') ?
            generateHumanEnemyName() :
            `${random(['Mr.', 'Capt.', 'Cmdr.', 'Dr.', 'Sen.'])} ${Math.floor(random(100, 9999))}`;

        return {
            name: `${random(titles)} ${baseName}`,
            source: random(sources),
            background: random(backgrounds),
            pilotRank: (typeof generatePilotRank === 'function')
                ? generatePilotRank((typeof AI_ROLE !== 'undefined' ? AI_ROLE.PIRATE : 'Pirate'), 'Anarchy', 5) // Use default pirate params for mission targets
                : 3
        };
    }

    /** Calculate assassination mission reward based on system and target toughness */
    static _calculateAssassinationReward(originSystem, shipType, upgradeDetails = []) {
        const baseReward = 2500 + (originSystem.techLevel || 5) * 150;

        // Bonus for target upgrades (Each level adds value)
        let upgradeBonus = 0;
        if (Array.isArray(upgradeDetails)) {
            upgradeDetails.forEach(u => {
                upgradeBonus += (u.level || 1) * 400;
            });
        }

        const securityBonus = (originSystem.securityLevel === 'Anarchy') ? 600 : 0;
        return Math.floor(baseReward + upgradeBonus + securityBonus + random(500, 2000));
    }

    /** Check if ship type is a pirate ship */
    static _isTargetPirateShip(shipType) {
        return typeof PIRATE_SHIP_TYPES !== 'undefined' &&
            Array.isArray(PIRATE_SHIP_TYPES) &&
            PIRATE_SHIP_TYPES.includes(shipType);
    }

    /** Generate assassination mission description */
    static _generateAssassinationDescription(targetData, shipType, upgradeNames = []) {
        let upgradeText = "";
        if (upgradeNames.length > 0) {
            upgradeText = ` Intel suggests the vessel is equipped with ${upgradeNames.join(', ')}.`;
        }

        // Get rank name
        let rankText = "";
        if (targetData.pilotRank && typeof getPilotRankName === 'function') {
            const rName = getPilotRankName(targetData.pilotRank);
            rankText = ` (${rName})`;
        }

        const templates = [
            `A contract has been issued by ${targetData.source} to eliminate ${targetData.name}${rankText}, the ${targetData.background}. The target is known to pilot a ${shipType} and may be accompanied by security personnel.${upgradeText}`,
            `${targetData.source} requires the permanent removal of ${targetData.name}${rankText}, a ${targetData.background} whose activities threaten their interests. Intelligence indicates the target travels in a ${shipType}.${upgradeText}`,
            `Eliminate ${targetData.name}${rankText}, the ${targetData.background}, at the behest of ${targetData.source}. The target operates a ${shipType} and maintains a security detail.${upgradeText}`
        ];
        return random(templates);
    }

    /** Generate random ship upgrades based on tech level */
    static _generateTargetUpgrades(techLevel = 5) {
        if (typeof SHIP_UPGRADES === 'undefined') return { names: [], details: [] };

        const possibleUpgrades = SHIP_UPGRADES;
        const upgradeCount = floor(random(1, 4)) + floor(techLevel / 4);
        const selectedNames = [];
        const selectedDetails = [];
        const usedTypes = new Set();

        // Group upgrades by type
        const byType = {};
        possibleUpgrades.forEach(u => {
            if (!byType[u.type]) byType[u.type] = [];
            byType[u.type].push(u);
        });

        const types = Object.keys(byType);
        for (let i = 0; i < upgradeCount; i++) {
            const type = random(types);
            if (usedTypes.has(type)) continue;

            // Pick an upgrade appropriate for the tech level
            // Tech Level 1-3: level 1 upgrades
            // Tech Level 4-6: level 1-2 upgrades
            // Tech Level 7-9: level 1-3 upgrades
            const maxLvl = Math.max(1, Math.min(3, Math.ceil(techLevel / 3)));
            const available = byType[type].filter(u => u.level <= maxLvl);
            if (available.length > 0) {
                const upgrade = random(available);
                selectedNames.push(upgrade.name);
                selectedDetails.push(upgrade);
                usedTypes.add(type);
            }
        }

        return { names: selectedNames, details: selectedDetails };
    }

    /** Creates a Sabotage Mission */
    static createSabotageMission(originSystem, originStation, galaxy, player) {
        const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 6);
        if (!destinationInfo || !destinationInfo.system) return null;

        const destSystem = destinationInfo.system;
        const planetName = this._selectSabotagePlanet(destSystem);
        const offeringFaction = this._getOfferingFaction(originStation, originSystem);
        const targetData = this._findOrCreateSabotageTarget(destSystem, planetName);

        let jumpDistance = 3;
        try {
            jumpDistance = galaxy.getJumpDistance(originSystem.systemIndex, destSystem.systemIndex);
        } catch (e) { /* use default */ }
        if (!isFinite(jumpDistance) || jumpDistance <= 0) jumpDistance = 3;

        let reward = Math.floor(5000 + jumpDistance * 2000 + floor(random(1000, 5000)));

        // Apply Alien system bonus
        const alienBonus = this.getAlienSystemBonus(destSystem, reward);
        reward += alienBonus;

        const jumpText = this.formatJumpText(jumpDistance);

        return new Mission({
            type: MISSION_TYPE.SABOTAGE,
            title: `Sabotage: Destroy ${targetData.type} near ${planetName} (${jumpText})`,
            description: '', // Let Mission class generate backstory
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: destSystem.name,
            spawnSystemIndex: typeof destSystem.systemIndex === 'number' ? destSystem.systemIndex : null,
            destinationStation: null,
            targetObjectType: targetData.type,
            targetObjectId: targetData.id,
            targetPlanetName: planetName,
            offeringFaction: offeringFaction,
            rewardCredits: reward,
            isIllegal: true,
            progressCount: 0
        });
    }

    /** Select a planet for sabotage mission */
    static _selectSabotagePlanet(destSystem) {
        try {
            if (Array.isArray(destSystem.planets) && destSystem.planets.length > 1) {
                const idx = Math.floor(random(1, destSystem.planets.length));
                const planet = destSystem.planets[idx];
                if (planet?.name) return planet.name;
            }
        } catch (e) { /* ignore */ }
        return 'Outer Orbit';
    }

    /** Get offering faction for sabotage mission */
    static _getOfferingFaction(station, system) {
        let faction = station?.faction || system?.economyType || null;

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

        if (typeof faction === 'string' && economyToFaction[faction]) {
            return economyToFaction[faction];
        }

        if (typeof faction !== 'string') {
            const pool = ['Separatist Movement', 'Imperial Authority', 'Military Command'];
            return pool[Math.floor(random(0, pool.length))];
        }

        return faction;
    }

    /** Find or create sabotage target object */
    static _findOrCreateSabotageTarget(destSystem, planetName) {
        const canonicalTypes = [
            'satellite', 'telescope', 'relay', 'habitat', 'debris', 'probe', 'beacon',
            'solarSail', 'engineArray', 'cargoCluster', 'researchArray', 'orbitalGarden',
            'decoyBuoy', 'miningPlatform', 'ancientRelic', 'signalFlare', 'spaceStation'
        ];

        // Try to bind to existing space object
        try {
            if ((!Array.isArray(destSystem.spaceObjects) || destSystem.spaceObjects.length === 0) &&
                typeof destSystem.spawnSpaceObjectsForPlanets === 'function') {
                try { destSystem.spawnSpaceObjectsForPlanets(); } catch (e) { /* non-fatal */ }
            }

            if (destSystem && Array.isArray(destSystem.spaceObjects) && destSystem.spaceObjects.length > 0) {
                const planetObj = destSystem.planets?.find(p => p?.name === planetName);
                if (planetObj?.pos) {
                    const maxDist = Math.max((planetObj.size || 0) * 1.2, 600);
                    let best = null;
                    let bestDist = Infinity;

                    for (const so of destSystem.spaceObjects) {
                        if (!so?.pos) continue;
                        const dx = so.pos.x - planetObj.pos.x;
                        const dy = so.pos.y - planetObj.pos.y;
                        const d = Math.sqrt(dx * dx + dy * dy);
                        if (d <= maxDist && d < bestDist) {
                            best = so;
                            bestDist = d;
                        }
                    }

                    if (best) {
                        const typeName = best.getDisplayName ? best.getDisplayName() : (best.type || canonicalTypes[0]);
                        return { type: typeName, id: best.id || null };
                    }
                }
            }
        } catch (e) {
            console.warn('createSabotageMission: failed to bind to real space object', e);
        }

        // Fallback to random type
        let targetType = canonicalTypes[Math.floor(random(0, canonicalTypes.length))];
        if (typeof SpaceObject === 'function') {
            try {
                targetType = (new SpaceObject(0, 0, targetType)).getDisplayName();
            } catch (e) { /* use raw type */ }
        }

        return { type: targetType, id: null };
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FACTION MISSION GENERATION
    // ═══════════════════════════════════════════════════════════════════════

    /** Maps secret station subtypes to faction keys */
    static _getStationFaction(stationSubtype) {
        if (!stationSubtype) return null;
        if (stationSubtype.includes('military')) return 'MILITARY';
        if (stationSubtype.includes('separatist')) return 'SEPARATIST';
        if (stationSubtype.includes('imperial')) return 'IMPERIAL';
        if (stationSubtype.includes('police')) return 'POLICE';
        return null;
    }

    /** Generates a faction-specific mission */
    static _generateFactionMission(factionKey, context) {
        const { originSystem, originStation, galaxy, player } = context;

        // Try registered handlers first
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
        const rankMultiplier = 1.0 + (playerRank * 0.1);

        const creators = {
            'IMPERIAL': () => this._createImperialMission(originSystem, originStation, galaxy, player, rankMultiplier),
            'SEPARATIST': () => this._createSeparatistMission(originSystem, originStation, galaxy, player, rankMultiplier),
            'MILITARY': () => this._createMilitaryMission(originSystem, originStation, galaxy, player, rankMultiplier)
        };

        return creators[factionKey]?.() || null;
    }

    /** Creates an Imperial faction mission */
    static _createImperialMission(originSystem, originStation, galaxy, player, rankMultiplier) {
        const missionType = random(['elimination', 'patrol', 'strike', 'sabotage']);

        const creators = {
            'elimination': () => this._createFactionKillMission(
                MISSION_TYPE.IMPERIAL_ELIMINATION,
                'Imperial Order',
                'Separatist',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 1500, prestigeReward: 3, targetMin: 1, targetMax: 4 }
            ),
            'patrol': () => this._createFactionPatrolMission(
                MISSION_TYPE.IMPERIAL_PATROL,
                'Imperial Patrol',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 800, prestigeReward: 1, targetMin: 4, targetMax: 8 }
            ),
            'strike': () => this._createFactionStrikeMission(
                MISSION_TYPE.IMPERIAL_STRIKE,
                'Imperial Strike',
                'rebel forces',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 3000, prestigeReward: 4, targetMin: 3, targetMax: 6 }
            ),
            'sabotage': () => this._createFactionSabotageMission(
                MISSION_TYPE.IMPERIAL_SABOTAGE,
                'Imperial',
                ['Comm Relay', 'Supply Depot', 'Rebel Beacon', 'Sensor Array', 'Shield Generator'],
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 4000, prestigeReward: 5 }
            )
        };

        return creators[missionType]?.();
    }

    /** Creates a Separatist faction mission */
    static _createSeparatistMission(originSystem, originStation, galaxy, player, rankMultiplier) {
        const missionType = random(['raid', 'supply', 'strike', 'sabotage']);

        const creators = {
            'raid': () => this._createFactionKillMission(
                MISSION_TYPE.SEPARATIST_RAID,
                'Freedom Strike',
                'Imperial',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 1200, prestigeReward: 3, targetMin: 1, targetMax: 4 }
            ),
            'supply': () => this._createFactionSupplyMission(
                MISSION_TYPE.SEPARATIST_SUPPLY,
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 600, prestigeReward: 2 }
            ),
            'strike': () => this._createFactionStrikeMission(
                MISSION_TYPE.SEPARATIST_STRIKE,
                'Liberation Strike',
                'Imperial occupation',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 2500, prestigeReward: 4, targetMin: 3, targetMax: 6 }
            ),
            'sabotage': () => this._createFactionSabotageMission(
                MISSION_TYPE.SEPARATIST_SABOTAGE,
                'Separatist',
                ['Imperial Beacon', 'Surveillance Station', 'Propaganda Array', 'Tax Collection Hub', 'Naval Depot'],
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 3500, prestigeReward: 5, isIllegal: true }
            )
        };

        return creators[missionType]?.();
    }

    /** Creates a Military faction mission */
    static _createMilitaryMission(originSystem, originStation, galaxy, player, rankMultiplier) {
        const missionType = random(['extermination', 'defense', 'strike', 'sabotage']);

        const creators = {
            'extermination': () => this._createFactionKillMission(
                MISSION_TYPE.MILITARY_EXTERMINATION,
                'Xeno Command',
                'Alien',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 2000, prestigeReward: 4, targetMin: 2, targetMax: 5 }
            ),
            'defense': () => this._createFactionPatrolMission(
                MISSION_TYPE.MILITARY_DEFENSE,
                'System Defense',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 1000, prestigeReward: 1, targetMin: 5, targetMax: 10 }
            ),
            'strike': () => this._createMilitaryStrikeMission(
                originSystem, originStation, galaxy, rankMultiplier
            ),
            'sabotage': () => this._createFactionSabotageMission(
                MISSION_TYPE.MILITARY_SABOTAGE,
                'Military',
                ['Alien Artifact', 'Xeno Tech Cache', 'Pirate Comm Hub', 'Smuggler Depot', 'Contraband Storage'],
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 3500, prestigeReward: 4 }
            )
        };

        return creators[missionType]?.();
    }

    // ═══════════════════════════════════════════════════════════════════════
    // FACTION MISSION HELPER METHODS (DRY)
    // ═══════════════════════════════════════════════════════════════════════

    /** Create a faction kill mission */
    static _createFactionKillMission(type, titlePrefix, targetFaction, originSystem, originStation, galaxy, rankMultiplier, config) {
        const targetCount = floor(random(config.targetMin, config.targetMax + 1));
        const reward = this.calculateFactionReward(config.baseReward, originSystem.techLevel, rankMultiplier, 500, 1500);

        return new Mission({
            type,
            title: `${titlePrefix}: Eliminate ${targetCount} ${targetFaction} Vessels`,
            description: `Intel reports ${targetFaction} activity in the region. Eliminate ${targetCount} hostile vessels.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `${targetCount} ${targetFaction} vessels`,
            targetCount: targetCount,
            rewardCredits: reward,
            prestigeReward: config.prestigeReward,
            isIllegal: false,
            progressCount: 0,
            requiredFaction: type.split(' ')[0].toUpperCase()
        });
    }

    /** Create a faction patrol mission */
    static _createFactionPatrolMission(type, titlePrefix, originSystem, originStation, galaxy, rankMultiplier, config) {
        const targetCount = floor(random(config.targetMin, config.targetMax + 1));
        const reward = this.calculateFactionReward(config.baseReward, originSystem.techLevel, rankMultiplier, 200, 600);

        return new Mission({
            type,
            title: `${titlePrefix}: Scan ${targetCount} Vessels`,
            description: `Patrol duty requires scanning ${targetCount} vessels to ensure compliance with regulations.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: null,
            destinationStation: null,
            targetDesc: `Scan ${targetCount} vessels`,
            targetCount: targetCount,
            rewardCredits: reward,
            prestigeReward: config.prestigeReward,
            isIllegal: false,
            progressCount: 0,
            requiredFaction: type.split(' ')[0].toUpperCase()
        });
    }

    /** Create a faction strike mission */
    static _createFactionStrikeMission(type, titlePrefix, targetDescription, originSystem, originStation, galaxy, rankMultiplier, config) {
        const targetCount = floor(random(config.targetMin, config.targetMax + 1));
        const reward = this.calculateFactionReward(config.baseReward, originSystem.techLevel, rankMultiplier, 1000, 3000);

        const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 5);
        const destName = destinationInfo?.system?.name || 'designated sector';

        return new Mission({
            type,
            title: `${titlePrefix}: Assault ${destName}`,
            description: `Strike operation authorized against ${targetDescription} in ${destName}. Neutralize ${targetCount} hostiles.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: destName,
            destinationStation: null,
            targetDesc: `${targetCount} hostiles in ${destName}`,
            targetCount: targetCount,
            rewardCredits: reward,
            prestigeReward: config.prestigeReward,
            isIllegal: false,
            progressCount: 0,
            requiredFaction: type.split(' ')[0].toUpperCase()
        });
    }

    /** Create a military strike mission (special case with target types) */
    static _createMilitaryStrikeMission(originSystem, originStation, galaxy, rankMultiplier) {
        const targetCount = floor(random(4, 8));
        const reward = this.calculateFactionReward(4000, originSystem.techLevel, rankMultiplier, 1500, 4000);

        const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 5);
        const destName = destinationInfo?.system?.name || 'hostile territory';
        const targetTypes = ['Alien Hive', 'Pirate Stronghold', 'Xeno Nest', 'Raider Base'];
        const targetType = random(targetTypes);

        return new Mission({
            type: MISSION_TYPE.MILITARY_STRIKE,
            title: `Military Strike: Assault ${targetType}`,
            description: `Intelligence has located a ${targetType} in ${destName}. Neutralize ${targetCount} hostiles and eliminate the threat.`,
            ...this.getOriginData(originSystem, originStation),
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
    }

    /** Create a faction sabotage mission */
    static _createFactionSabotageMission(type, factionPrefix, targetTypes, originSystem, originStation, galaxy, rankMultiplier, config) {
        const destinationInfo = this.findNearbyDestination(originSystem, galaxy, false, 6);
        if (!destinationInfo) {
            // Fallback to a kill mission instead of recursion
            return this._createFactionKillMission(
                type.replace('Sabotage', 'Elimination'),
                factionPrefix,
                'hostiles',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 1500, prestigeReward: 3, targetMin: 2, targetMax: 4 }
            );
        }

        const destSystem = destinationInfo.system;
        const targetType = random(targetTypes);
        let reward = this.calculateFactionReward(config.baseReward, originSystem.techLevel, rankMultiplier, 1500, 4000);

        // Apply Alien system bonus
        const alienBonus = this.getAlienSystemBonus(destSystem, reward);
        reward += alienBonus;

        const jumpDistance = galaxy.getJumpDistance?.(originSystem.systemIndex, destSystem.systemIndex) || 3;
        const jumpText = this.formatJumpText(jumpDistance);
        const economyKnown = this.getEconomyInfoText(destSystem);
        const economyText = economyKnown ? `Destination economy: ${economyKnown}.` : 'Intelligence on the destination economy is unavailable.';

        return new Mission({
            type,
            title: `${factionPrefix} Sabotage: Destroy ${targetType} (${jumpText})`,
            description: `A critical ${targetType} has been identified in ${destSystem.name}. ${economyText} Infiltrate and destroy it to complete the operation.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: destSystem.name,
            destinationStation: null,
            targetObjectType: targetType,
            targetDesc: `Destroy ${targetType} in ${destSystem.name}`,
            rewardCredits: reward,
            prestigeReward: config.prestigeReward,
            isIllegal: config.isIllegal || false,
            progressCount: 0,
            requiredFaction: factionPrefix.toUpperCase()
        });
    }

    /** Create a faction supply mission */
    static _createFactionSupplyMission(type, originSystem, originStation, galaxy, rankMultiplier, config) {
        const destinationInfo = this.findNearbyDestination(originSystem, galaxy, true, 4);
        if (!destinationInfo) {
            // Fallback to raid mission
            return this._createFactionKillMission(
                MISSION_TYPE.SEPARATIST_RAID,
                'Freedom Strike',
                'Imperial',
                originSystem, originStation, galaxy, rankMultiplier,
                { baseReward: 1200, prestigeReward: 3, targetMin: 1, targetMax: 4 }
            );
        }

        const cargoTypes = ['Weapons', 'Medicine', 'Machinery'];
        const cargo = random(cargoTypes);
        const quantity = floor(random(5, 15));
        let reward = Math.floor((config.baseReward + quantity * 50 + random(200, 500)) * rankMultiplier);

        // Apply Alien system bonus
        const alienBonus = this.getAlienSystemBonus(destinationInfo.system, reward);
        reward += alienBonus;

        const jumpDistance = galaxy.getJumpDistance?.(originSystem.systemIndex, destinationInfo.system.systemIndex) || 2;
        const jumpText = this.formatJumpText(jumpDistance);
        const economyKnown = this.getEconomyInfoText(destinationInfo.system);
        const economyText = economyKnown ? `Destination economy: ${economyKnown}.` : 'Intelligence on the destination economy is unavailable.';

        return new Mission({
            type,
            title: `Supply Run: ${quantity}t ${cargo} to Rebel Cell (${jumpText})`,
            description: `Deliver ${quantity}t of ${cargo} to resistance contacts at ${destinationInfo.station.name}. ${economyText} Discretion advised.`,
            ...this.getOriginData(originSystem, originStation),
            destinationSystem: destinationInfo.system.name,
            destinationStation: destinationInfo.station.name,
            cargoType: cargo,
            cargoQuantity: quantity,
            rewardCredits: reward,
            prestigeReward: config.prestigeReward,
            isIllegal: true,
            requiredFaction: 'SEPARATIST'
        });
    }
}

// ═══════════════════════════════════════════════════════════════════════════
// MODULE EXPORTS
// ═══════════════════════════════════════════════════════════════════════════

if (typeof module !== 'undefined' && module.exports) {
    module.exports = {
        MissionGenerator,
        ECONOMY_EXPORTS,
        ECONOMY_IMPORTS,
        LEGAL_CARGO,
        ILLEGAL_CARGO,
        PIRATE_SHIP_TYPES
    };
    global.MissionGenerator = MissionGenerator;
}