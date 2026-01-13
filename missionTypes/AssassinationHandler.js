// ****** missionTypes/AssassinationHandler.js ******
// Handler for assassination missions with target spawning and guard management.

/**
 * Handler for ASSASSINATION mission type.
 */
class AssassinationHandler extends MissionTypeHandler {
    static types = [MISSION_TYPE.ASSASSINATION];
    static requiredFaction = null; // Public missions

    // Ship upgrade configuration for assassination targets
    // Each upgrade type has a base chance and reward bonus
    static UPGRADE_CONFIG = {
        armor: {
            chance: 0.35,        // 35% base chance
            rewardPerLevel: 300, // Extra credits per level
            names: ['Faulcon DeLacy Composite', 'Core Dynamics Reactive Plates', 'Vodel Military Grade'],
            warnings: ['reinforced hull', 'heavy armor plating', 'military-grade armor']
        },
        engine: {
            chance: 0.30,        // 30% base chance
            rewardPerLevel: 250,
            names: ['Sirius Efficiency Drive', 'Gutamaya Performance Thrusters', 'Achilles Overdrive Injectors'],
            warnings: ['enhanced engines', 'high-performance thrusters', 'experimental overdrive']
        },
        shield: {
            chance: 0.30,        // 30% base chance
            rewardPerLevel: 350,
            names: ['Supratech Shield Booster', 'Aegis Systems Deflector', 'Prismatic Shield Generator'],
            warnings: ['boosted shields', 'advanced deflectors', 'prismatic shielding']
        },
        cloak: {
            chance: 0.12,        // 12% base chance - rare and dangerous!
            rewardPerLevel: 800, // High reward for stealth targets
            names: ['Stealth Field Mark I', 'Shadow Matrix', 'Phantom Drive'],
            warnings: ['basic cloaking device', 'advanced stealth system', 'military-grade cloaking']
        },
        booster: {
            chance: 0.25,        // 25% base chance
            rewardPerLevel: 200,
            names: ['Pulse Drive Igniter', 'Turbocharged Injector', 'Nova Drive System'],
            warnings: ['afterburner system', 'enhanced speed burst', 'military boost system']
        }
    };

    /**
     * Select upgrades for an assassination target.
     * @returns {Object} { upgrades: string[], upgradeDetails: {type, level, name}[], totalBonusReward: number, warnings: string[] }
     */
    static _selectTargetUpgrades() {
        const upgrades = [];
        const upgradeDetails = [];
        const warnings = [];
        let totalBonusReward = 0;

        // Check each upgrade type
        for (const [type, config] of Object.entries(this.UPGRADE_CONFIG)) {
            if (Math.random() < config.chance) {
                // Weighted level selection: level 1 is most common, level 3 is rare
                const levelRoll = Math.random();
                let level;
                if (levelRoll < 0.55) {
                    level = 1; // 55% chance
                } else if (levelRoll < 0.85) {
                    level = 2; // 30% chance
                } else {
                    level = 3; // 15% chance
                }

                const upgradeName = config.names[level - 1];
                upgrades.push(upgradeName);
                upgradeDetails.push({ type, level, name: upgradeName });
                warnings.push(config.warnings[level - 1]);
                totalBonusReward += config.rewardPerLevel * level;
            }
        }

        return { upgrades, upgradeDetails, totalBonusReward, warnings };
    }

    /**
     * Create an assassination mission.
     * @param {Object} context - Generation context
     * @returns {Mission|null}
     */
    static create(context) {
        const { originSystem, originStation, galaxy, player } = context;

        // Target name generation
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
        const baseName = (typeof generateHumanEnemyName === 'function')
            ? generateHumanEnemyName()
            : `${random(['Mr.', 'Capt.', 'Cmdr.', 'Dr.', 'Sen.'])} ${Math.floor(random(100, 9999))}`;
        const title = random(targetTitles);
        const targetName = `${title} ${baseName}`;
        const source = random(missionSources);
        const background = random(targetBackgrounds);

        // Pick ship type
        let shipType = null;
        if (typeof COMBAT_SHIPS !== 'undefined' && COMBAT_SHIPS.length > 0) {
            shipType = random(COMBAT_SHIPS);
        } else if (typeof PIRATE_SHIP_TYPES !== 'undefined' && PIRATE_SHIP_TYPES.length > 0) {
            shipType = random(PIRATE_SHIP_TYPES);
        } else {
            shipType = 'Krait';
        }

        // Select target upgrades
        const { upgrades, upgradeDetails, totalBonusReward, warnings } = this._selectTargetUpgrades();

        // Calculate reward (now includes upgrade bonus)
        const baseReward = 2500 + (originSystem.techLevel || 5) * 150;
        const securityBonus = originSystem.securityLevel === 'Anarchy' ? 400 : 0;
        const reward = Math.floor(baseReward + securityBonus + random(500, 2000) + totalBonusReward);

        // Determine legality
        const targetIsPirateShip = (typeof PIRATE_SHIP_TYPES !== 'undefined' &&
            Array.isArray(PIRATE_SHIP_TYPES) &&
            PIRATE_SHIP_TYPES.includes(shipType));
        const illegalFlag = !targetIsPirateShip;

        // Guard ship type
        let guardShipType = null;
        if (typeof POLICE_SHIPS !== 'undefined' && POLICE_SHIPS.length > 0) {
            guardShipType = random(POLICE_SHIPS);
        } else if (typeof COMBAT_SHIPS !== 'undefined' && COMBAT_SHIPS.length > 0) {
            guardShipType = random(COMBAT_SHIPS);
        } else {
            guardShipType = 'Krait';
        }

        // Build upgrade warning string for description
        let upgradeWarning = '';
        if (warnings.length > 0) {
            // Check for stealth upgrade (special warning)
            const hasCloak = upgradeDetails.some(u => u.type === 'cloak');
            if (hasCloak) {
                upgradeWarning = `\n\n⚠️ CAUTION: Target is equipped with ${warnings.join(', ')}. STEALTH CAPABILITY DETECTED - target may vanish from sensors!`;
            } else {
                upgradeWarning = `\n\nIntelligence reports the target's ship has ${warnings.join(', ')}.`;
            }
        }

        // Create flavorful description with upgrade warnings
        const descriptionTemplates = [
            `A contract has been issued by ${source} to eliminate ${targetName}, the ${background}. The target is known to pilot a ${shipType} and may be accompanied by security personnel. Complete the mission discreetly to avoid unwanted attention.${upgradeWarning}`,
            `${source} requires the permanent removal of ${targetName}, a ${background} whose activities threaten their interests. Intelligence indicates the target travels in a ${shipType}. The operation must be executed with precision.${upgradeWarning}`,
            `Eliminate ${targetName}, the ${background}, at the behest of ${source}. The target operates a ${shipType} and maintains a security detail. Success will be rewarded handsomely, but failure may have consequences.${upgradeWarning}`,
            `${source} seeks the assassination of ${targetName}, notorious as a ${background}. The target commands a ${shipType} and is rarely without protection. The target may attempt to flee the system if threatened.${upgradeWarning}`,
            `A high-priority contract from ${source} demands the death of ${targetName}, the ${background}. Expect heavy resistance from the target's ${shipType} and escort vessels. The mission cancels if the target escapes the system.${upgradeWarning}`
        ];

        // Build title with upgrade indicator
        let titleSuffix = '';
        if (upgradeDetails.length > 0) {
            const maxLevel = Math.max(...upgradeDetails.map(u => u.level));
            if (maxLevel >= 3 || upgradeDetails.some(u => u.type === 'cloak')) {
                titleSuffix = ' ⚠️'; // Dangerous target
            } else if (maxLevel >= 2 || upgradeDetails.length >= 2) {
                titleSuffix = ' ⚡'; // Upgraded target
            }
        }

        return new Mission({
            type: MISSION_TYPE.ASSASSINATION,
            title: `Assassinate ${targetName} (${shipType})${titleSuffix}`,
            description: random(descriptionTemplates),
            originSystem: originSystem.name,
            originStation: originStation.name,
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
            guardCount: 1,
            guardShipType: guardShipType,
            // Store upgrade data for spawning
            targetUpgrades: upgrades,
            targetUpgradeDetails: upgradeDetails
        });
    }

    /**
     * Apply upgrades to an enemy based on upgrade names array.
     * @param {Enemy} enemy - The enemy to upgrade
     * @param {string[]} upgradeNames - Array of upgrade names to apply
     * @private
     */
    static _applyUpgradesToEnemy(enemy, upgradeNames) {
        if (!upgradeNames || !Array.isArray(upgradeNames) || upgradeNames.length === 0) return;
        if (typeof SHIP_UPGRADES === 'undefined') return;

        for (const upgradeName of upgradeNames) {
            const upgDef = SHIP_UPGRADES.find(u => u.name === upgradeName);
            if (!upgDef) continue;

            // Apply based on type (same logic as Enemy constructor)
            switch (upgDef.type) {
                case 'armor':
                    enemy.maxHull += (upgDef.hullBonus || 0);
                    enemy.hull = enemy.maxHull; // Heal to full
                    break;
                case 'engine':
                    if (upgDef.speedMultiplier) {
                        enemy.baseMaxSpeed *= upgDef.speedMultiplier;
                        enemy.maxSpeed = enemy.baseMaxSpeed;
                    }
                    if (upgDef.thrustMultiplier) {
                        enemy.baseThrust *= upgDef.thrustMultiplier;
                        enemy.thrustForce = enemy.baseThrust;
                    }
                    break;
                case 'shield':
                    enemy.maxShield += (upgDef.shieldBonus || 0);
                    enemy.shield = enemy.maxShield;
                    break;
                case 'cloak':
                    enemy.cloakMaxDuration = upgDef.cloakDuration;
                    enemy.cloakMaxCooldown = upgDef.cloakCooldown;
                    // Reset cloak state to ready
                    enemy.isCloaked = false;
                    enemy.cloakDurationTimer = 0;
                    enemy.cloakCooldownTimer = 0;
                    break;
                case 'booster':
                    enemy.boostMultiplier = upgDef.boostMultiplier;
                    enemy.boostMaxDuration = upgDef.boostDuration;
                    enemy.boostMaxCooldown = upgDef.boostCooldown;
                    // Reset booster state to ready
                    enemy.isSpeedBursting = false;
                    enemy.boostDurationTimer = 0;
                    enemy.boostCooldownTimer = 0;
                    break;
            }

            MISSION_LOG(`Applied upgrade "${upgradeName}" to assassination target`);
        }
    }

    /**
     * Activate assassination mission - spawn target and guards.
     */
    static activate(mission, player) {
        if (!player?.currentSystem) return true;
        if (mission._targetEnemyRef) return true; // Already spawned

        const sys = player.currentSystem;
        const angle = random(TWO_PI);
        const spawnDist = (sys._getDiagonalDistance?.() || 500) + random(150, 400);
        const spawnX = player.pos.x + cos(angle) * spawnDist;
        const spawnY = player.pos.y + sin(angle) * spawnDist;

        // Spawn main target
        const shipType = mission.targetShipType ||
            (typeof PIRATE_SHIP_TYPES !== 'undefined' ? random(PIRATE_SHIP_TYPES) : 'Krait');
        const role = AI_ROLE?.COMBAT ?? 'COMBAT';

        const newEnemy = new Enemy(spawnX, spawnY, player, shipType, role);
        newEnemy.calculateRadianProperties?.();
        newEnemy.initializeColors?.();
        if (mission.targetName) newEnemy.displayName = mission.targetName;
        newEnemy.isAssassinationTarget = true;

        // Apply upgrades from mission to the spawned target
        if (mission.targetUpgrades && mission.targetUpgrades.length > 0) {
            this._applyUpgradesToEnemy(newEnemy, mission.targetUpgrades);

            // Log upgrade summary
            const upgradeTypes = mission.targetUpgradeDetails?.map(u => u.type) || [];
            const hasCloak = upgradeTypes.includes('cloak');
            if (hasCloak) {
                MISSION_LOG(`⚠️ STEALTH target spawned with upgrades: ${mission.targetUpgrades.join(', ')}`);
            } else {
                MISSION_LOG(`Upgraded target spawned with: ${mission.targetUpgrades.join(', ')}`);
            }
        }

        sys.addEnemy(newEnemy);

        // Spawn guards
        this._spawnGuards(mission, newEnemy, sys, player, angle, spawnDist);

        // Store references
        mission._targetEnemyRef = newEnemy;
        mission._targetEnemyId = newEnemy.id;

        MISSION_LOG(`Assassination target spawned: ${newEnemy.displayName || newEnemy.shipTypeName}`);
        if (typeof uiManager !== 'undefined') {
            const upgradeWarning = (mission.targetUpgrades && mission.targetUpgrades.length > 0)
                ? ' (upgraded vessel!)'
                : '';
            uiManager.addMessage(`Target spotted: ${newEnemy.displayName || newEnemy.shipTypeName}${upgradeWarning}`);
        }
        return true;
    }

    /**
     * Spawn guard NPCs around the assassination target.
     * @private
     */
    static _spawnGuards(mission, target, sys, player, baseAngle, baseDist) {
        const guardCount = mission.guardCount || 1;
        if (guardCount <= 0) return;

        mission._guardRefs = [];
        mission._guardIds = [];

        for (let g = 0; g < guardCount; g++) {
            const gAngle = baseAngle + (TWO_PI * (g + 1) / (guardCount + 1)) + random(-0.25, 0.25);
            const gDist = baseDist * 0.4 + random(80, 220);
            const gx = target.pos.x + cos(gAngle) * gDist;
            const gy = target.pos.y + sin(gAngle) * gDist;

            const gShip = mission.guardShipType ||
                (COMBAT_SHIPS?.length > 0 ? random(COMBAT_SHIPS) :
                    (typeof PIRATE_SHIP_TYPES !== 'undefined' ? random(PIRATE_SHIP_TYPES) : 'Krait'));

            const guardRole = AI_ROLE?.GUARD ?? 'GUARD';
            const guardNPC = new Enemy(gx, gy, player, gShip, guardRole);
            guardNPC.calculateRadianProperties?.();
            guardNPC.initializeColors?.();
            guardNPC.displayName = "Escort";
            guardNPC.isAssassinationGuard = true;
            guardNPC.principal = target;

            try {
                guardNPC.guardFormationOffset = createVector(cos(gAngle) * (80 + g * 30), sin(gAngle) * (80 + g * 30));
            } catch (e) { /* createVector may be unavailable */ }

            sys.addEnemy(guardNPC);
            mission._guardRefs.push(guardNPC);
            mission._guardIds.push(guardNPC.id);
        }

        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage(`${guardCount} escort(s) detected around the target.`);
        }
    }

    /**
     * Monitor assassination target state.
     */
    static update(mission, currentSystem) {
        const enemy = mission._targetEnemyRef;
        if (!enemy) return;

        if (enemy.destroyed) {
            if (typeof player !== 'undefined' && player?.activeMission === mission) {
                mission.progressCount = Math.max(1, mission.progressCount);
                mission.complete(player);
                this._cleanupRuntime(mission, currentSystem);
                if (player.activeMission === mission) player.activeMission = null;
            }
            return;
        }

        // Check if target left the system
        if (enemy.currentSystem && currentSystem && enemy.currentSystem !== currentSystem) {
            mission.fail();
            if (typeof uiManager !== 'undefined') {
                uiManager.addMessage(`Mission canceled: target ${enemy.displayName} left the system.`, [255, 120, 80]);
            }
            this._cleanupRuntime(mission, currentSystem);
            if (typeof player !== 'undefined' && player?.activeMission === mission) {
                player.activeMission = null;
            }
        }
    }

    /**
     * Cleanup runtime references.
     * @private
     */
    static _cleanupRuntime(mission, currentSystem) {
        if (Array.isArray(mission._guardRefs)) {
            for (const guard of mission._guardRefs) {
                if (guard) {
                    guard.principal = null;
                    guard.isAssassinationGuard = false;
                }
            }
        }
        mission._targetEnemyRef = null;
        mission._guardRefs = [];
        mission._targetEnemyId = null;
        mission._guardIds = [];
    }

    /**
     * Get objective string.
     */
    static getObjective(mission) {
        if (mission.targetName) {
            return `Objective: Eliminate ${mission.targetName}`;
        }
        return 'Objective: Eliminate designated target';
    }

    /**
     * Get supplemental details.
     */
    static getSupplementalDetails(mission) {
        let details = '';
        if (mission.targetName) details += `Named Target: ${mission.targetName}\n`;
        if (mission.targetShipType) details += `Target Ship: ${mission.targetShipType}\n`;

        // Show upgrade information
        if (mission.targetUpgradeDetails && mission.targetUpgradeDetails.length > 0) {
            const upgradeList = mission.targetUpgradeDetails.map(u => {
                const levelStr = u.level === 3 ? 'Mk III' : (u.level === 2 ? 'Mk II' : 'Mk I');
                const typeLabel = u.type.charAt(0).toUpperCase() + u.type.slice(1);
                return `${typeLabel} ${levelStr}`;
            });
            details += `\n⚡ Ship Upgrades:\n  • ${upgradeList.join('\n  • ')}\n`;

            // Special warning for cloaked targets
            if (mission.targetUpgradeDetails.some(u => u.type === 'cloak')) {
                details += `\n⚠️ STEALTH EQUIPPED - Target can vanish!\n`;
            }
        }

        return details;
    }

    /**
     * Generate news for assassination completion.
     */
    static generateNews(mission, player) {
        if (typeof GameGlobals === 'undefined' || !GameGlobals.newsManager) return;
        const systemName = player.currentSystem?.name || mission.originSystem || 'Unknown';
        try {
            GameGlobals.newsManager.addAssassinationNews(mission.targetName, systemName);
        } catch (e) {
            MISSION_LOG('Error generating assassination news:', e);
        }
    }

    static getDisplayColor() {
        return [180, 80, 180]; // Purple for assassination
    }

    static getIcon() {
        return '💀';
    }
}

// Register with the registry
if (typeof MissionTypeRegistry !== 'undefined') {
    MissionTypeRegistry.register(AssassinationHandler);
}

// Export for module systems
if (typeof module !== 'undefined' && module.exports) {
    module.exports = AssassinationHandler;
    global.AssassinationHandler = AssassinationHandler;
}
