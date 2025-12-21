// ****** missionTypes/AssassinationHandler.js ******
// Handler for assassination missions with target spawning and guard management.

/**
 * Handler for ASSASSINATION mission type.
 */
class AssassinationHandler extends MissionTypeHandler {
    static types = [MISSION_TYPE.ASSASSINATION];
    static requiredFaction = null; // Public missions

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

        // Calculate reward
        const baseReward = 2500 + (originSystem.techLevel || 5) * 150;
        const securityBonus = originSystem.securityLevel === 'Anarchy' ? 400 : 0;
        const reward = Math.floor(baseReward + securityBonus + random(500, 2000));

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

        // Create flavorful description
        const descriptionTemplates = [
            `A contract has been issued by ${source} to eliminate ${targetName}, the ${background}. The target is known to pilot a ${shipType} and may be accompanied by security personnel. Complete the mission discreetly to avoid unwanted attention.`,
            `${source} requires the permanent removal of ${targetName}, a ${background} whose activities threaten their interests. Intelligence indicates the target travels in a ${shipType}. The operation must be executed with precision.`,
            `Eliminate ${targetName}, the ${background}, at the behest of ${source}. The target operates a ${shipType} and maintains a security detail. Success will be rewarded handsomely, but failure may have consequences.`,
            `${source} seeks the assassination of ${targetName}, notorious as a ${background}. The target commands a ${shipType} and is rarely without protection. The target may attempt to flee the system if threatened.`,
            `A high-priority contract from ${source} demands the death of ${targetName}, the ${background}. Expect heavy resistance from the target's ${shipType} and escort vessels. The mission cancels if the target escapes the system.`
        ];

        return new Mission({
            type: MISSION_TYPE.ASSASSINATION,
            title: `Assassinate ${targetName} (${shipType})`,
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
            guardShipType: guardShipType
        });
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
        sys.addEnemy(newEnemy);

        // Spawn guards
        this._spawnGuards(mission, newEnemy, sys, player, angle, spawnDist);

        // Store references
        mission._targetEnemyRef = newEnemy;
        mission._targetEnemyId = newEnemy.id;

        MISSION_LOG(`Assassination target spawned: ${newEnemy.displayName || newEnemy.shipTypeName}`);
        if (typeof uiManager !== 'undefined') {
            uiManager.addMessage(`Target spotted: ${newEnemy.displayName || newEnemy.shipTypeName}`);
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
