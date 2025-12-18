// ****** newsManager.js ******
// Handles the generation and storage of in-game news reports (The Galactic Echo)
// Enhanced with player event tracking, environmental news, and galaxy-wide reports

/**
 * News priority levels
 */
const NEWS_PRIORITY = {
    BREAKING: 4,      // Player-caused major events
    HIGH: 3,          // Local urgent events
    MEDIUM: 2,        // Standard news
    LOW: 1            // Background/flavor
};

/**
 * News categories
 */
const NEWS_CATEGORY = {
    PLAYER_ACTION: 'PLAYER_ACTION',   // Assassinations, sabotage, bounties
    LOCAL_EVENT: 'LOCAL_EVENT',       // System-specific events
    GALAXY_NEWS: 'GALAXY_NEWS',       // News from other systems
    BACKGROUND: 'BACKGROUND'          // Flavor/atmosphere
};

class NewsManager {
    constructor() {
        this.newsItems = [];
        this.maxNewsItems = 50;
        this.lastGalaxyNewsTime = 0;
        this.galaxyNewsInterval = 60000; // Generate galaxy news every 60 seconds

        // Combat news cooldowns to prevent spam
        this.lastCombatReportTime = 0;
        this.combatReportCooldown = 30000; // 30 seconds between combat reports
        this.lastHeroReportTime = 0;
        this.heroReportCooldown = 45000; // 45 seconds between hero reports

        // Track recent news to avoid duplicates
        this.recentNewsHashes = new Set();
        this.maxRecentHashes = 50;

        // Factional perspectives for report generation (using centralized color constants)
        this.factions = {
            IMPERIAL: {
                name: "The Core Echo",
                tone: "formal",
                bias: "order",
                color: (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.IMPERIAL : [255, 235, 180]
            },
            SEPARATIST: {
                name: "Free Flow Channel",
                tone: "agitative",
                bias: "resistance",
                color: (typeof FACTION_COLORS !== 'undefined') ? FACTION_COLORS.SEPARATIST : [128, 128, 0]
            },
            INDEPENDENT: {
                name: "The Freight Log",
                tone: "pragmatic",
                bias: "profit",
                color: [200, 200, 200]
            }
        };

        // NPC name generators - use centralized constants from enemyConstants.js
        // (NPC_FIRST_NAMES, NPC_LAST_NAMES, NPC_TITLES are defined there)

        // Headline templates by event type
        this.headlineTemplates = {
            // Player action headlines
            ASSASSINATION_SUCCESS: [
                "NOTORIOUS {TARGET} ELIMINATED IN DARING STRIKE",
                "SHADOWY OPERATIVE SILENCES {TARGET}",
                "CONTRACT FULFILLED: {TARGET} MEETS VIOLENT END",
                "{TARGET} FOUND DEAD AMID DEBRIS FIELD",
                "BOUNTY CLAIMED ON INFAMOUS {TARGET}"
            ],
            SABOTAGE_SUCCESS: [
                "INDUSTRIAL SABOTAGE ROCKS {LOCATION}",
                "EXPLOSION DESTROYS {TARGET} NEAR {LOCATION}",
                "INFRASTRUCTURE ATTACK LEAVES {LOCATION} REELING",
                "COVERT OPERATION CRIPPLES {TARGET}",
                "MYSTERIOUS BLAST DEVASTATES {LOCATION} FACILITY"
            ],
            BOUNTY_PIRATE: [
                "FREELANCER CLAIMS BOUNTY ON {COUNT} PIRATES",
                "PIRATE HUNTERS CELEBRATE {COUNT} KILLS",
                "MARAUDER WING DECIMATED BY LONE PILOT",
                "PIRACY DEALT MAJOR BLOW IN {SYSTEM}",
                "{COUNT} RAIDERS MEET FIERY END"
            ],
            BOUNTY_POLICE: [
                "ROGUE COP KILLER STRIKES AGAIN",
                "AUTHORITIES MOURN {COUNT} FALLEN OFFICERS",
                "VIGILANTE VIOLENCE CLAIMS {COUNT} POLICE",
                "LAW ENFORCEMENT UNDER SIEGE",
                "COP KILLER ON THE LOOSE IN {SYSTEM}"
            ],
            BOUNTY_ALIEN: [
                "XENO-HUNTER BAGS {COUNT} ALIEN HOSTILES",
                "ALIEN MENACE PUSHED BACK IN {SYSTEM}",
                "OTHERWORLDLY THREAT NEUTRALIZED",
                "{COUNT} ALIEN CRAFT DESTROYED BY HUMAN PILOT",
                "HUMANITY STRIKES BACK AGAINST XENO INCURSION"
            ],
            POLICE_JOINED: [
                "NEW DEPUTY JOINS {SYSTEM} PATROL",
                "AUTHORITIES BOLSTER RANKS WITH NEW RECRUIT",
                "FREELANCER SWORN IN AS LAW ENFORCEMENT",
                "POLICE WELCOME COMBAT VETERAN TO FORCE"
            ],
            FACTION_JOINED: [
                "NEW RECRUIT SWEARS ALLEGIANCE TO {FACTION}",
                "{FACTION} RANKS SWELL WITH NEW BLOOD",
                "PILOT PLEDGES LOYALTY TO {FACTION} CAUSE"
            ],

            // Environmental headlines
            PIRATE_HIGH: [
                "PIRATE ACTIVITY SURGES IN {SYSTEM}",
                "TRADE ROUTES UNDER SIEGE BY MARAUDERS",
                "SHIPPING LANES CRAWLING WITH RAIDERS",
                "MERCHANTS WARNED: {SYSTEM} IS HOT",
                "SECURITY FIRMS OVERWHELMED BY PIRATE WAVE"
            ],
            PIRATE_LOW: [
                "TRADE FLOWS FREELY IN PEACEFUL {SYSTEM}",
                "PIRACY AT RECORD LOWS NEAR {SYSTEM}",
                "MERCHANTS CELEBRATE QUIET SHIPPING LANES",
                "SECURITY PATROLS REPORT ALL CLEAR"
            ],
            MARKET_BOOM: [
                "PRICES SOAR AT {STATION}",
                "COMMODITY SHORTAGE DRIVES {COMMODITY} PRICES UP",
                "TRADERS RUSH TO {STATION} FOR HIGH MARGINS",
                "DEMAND SURGE HITS {STATION} MARKETS"
            ],
            MARKET_CRASH: [
                "PRICES CRASH AT {STATION}",
                "{COMMODITY} GLUT DEVASTATES LOCAL TRADERS",
                "OVERSUPPLY TANKS MARKET AT {STATION}",
                "BUYING OPPORTUNITY: {COMMODITY} DIRT CHEAP"
            ],

            // Galaxy-wide headlines
            DISTANT_CONFLICT: [
                "WAR ERUPTS IN {SYSTEM} SECTOR",
                "IMPERIAL FORCES CLASH WITH REBELS IN {SYSTEM}",
                "SEPARATIST UPRISING ROCKS {SYSTEM}",
                "MILITARY BUILDUP REPORTED NEAR {SYSTEM}",
                "TENSIONS ESCALATE IN {SYSTEM} QUADRANT"
            ],
            DISTANT_DISCOVERY: [
                "EXPLORERS REPORT ANOMALY NEAR {SYSTEM}",
                "MYSTERIOUS SIGNAL DETECTED FROM {SYSTEM}",
                "NEW HYPERSPACE ROUTE FOUND TO {SYSTEM}",
                "SCIENTISTS BAFFLED BY {SYSTEM} PHENOMENON"
            ],
            DISTANT_TRADE: [
                "NEW TRADE AGREEMENT BENEFITS {SYSTEM}",
                "{SYSTEM} OPENS MARKETS TO FOREIGN TRADERS",
                "ECONOMIC BOOM TRANSFORMS {SYSTEM}",
                "LUXURY GOODS FLOODING INTO {SYSTEM}"
            ],
            DISTANT_DISASTER: [
                "CATASTROPHE STRIKES {SYSTEM}",
                "STATION DISASTER CLAIMS LIVES IN {SYSTEM}",
                "ASTEROID IMPACT DEVASTATES {SYSTEM} COLONY",
                "PLAGUE OUTBREAK REPORTED IN {SYSTEM}"
            ],

            // War event headlines
            WAR_SKIRMISH: [
                "⚔️ MILITARY SKIRMISH ERUPTS IN {SYSTEM}",
                "⚔️ ARMED CONFLICT BREAKS OUT NEAR {SYSTEM}",
                "⚔️ FACTION FORCES CLASH IN {SYSTEM} SECTOR",
                "⚔️ BORDER SKIRMISH REPORTED IN {SYSTEM}",
                "⚔️ HOSTILE ENGAGEMENT DETECTED IN {SYSTEM}"
            ],
            WAR_FULL: [
                "🔥 FULL SCALE WAR ERUPTS IN {SYSTEM}",
                "🔥 ALL-OUT CONFLICT ENGULFS {SYSTEM}",
                "🔥 MASSIVE BATTLE UNDERWAY IN {SYSTEM}",
                "🔥 WAR DECLARED IN {SYSTEM} SECTOR",
                "🔥 SECTOR-WIDE HOSTILITIES BEGIN IN {SYSTEM}"
            ],

            // Crisis event headlines (plague/famine)
            CRISIS_PLAGUE: [
                "☠️ DEADLY PLAGUE OUTBREAK IN {SYSTEM}",
                "☠️ CONTAGION SPREADS ACROSS {SYSTEM}",
                "☠️ MEDICAL EMERGENCY: PLAGUE RAVAGES {SYSTEM}",
                "☠️ QUARANTINE DECLARED IN {SYSTEM}",
                "☠️ DISEASE OUTBREAK OVERWHELMS {SYSTEM} HOSPITALS"
            ],
            CRISIS_FAMINE: [
                "🍂 SEVERE FAMINE GRIPS {SYSTEM}",
                "🍂 FOOD CRISIS DEVASTATES {SYSTEM}",
                "🍂 CROP FAILURES CAUSE MASS STARVATION IN {SYSTEM}",
                "🍂 FOOD SHORTAGE EMERGENCY IN {SYSTEM}",
                "🍂 HUNGER CRISIS SPREADS ACROSS {SYSTEM}"
            ],
            CRISIS_PLAGUE_DISTANT: [
                "☠️ PLAGUE OUTBREAK SPREADS TO {SYSTEM}",
                "☠️ NEIGHBORING SYSTEM {SYSTEM} AFFECTED BY CONTAGION",
                "☠️ DISEASE REACHES {SYSTEM} FROM NEARBY OUTBREAK"
            ],
            CRISIS_FAMINE_DISTANT: [
                "🍂 FAMINE CONDITIONS WORSEN IN {SYSTEM}",
                "🍂 FOOD CRISIS SPREADS TO {SYSTEM}",
                "🍂 {SYSTEM} SUFFERS FROM REGIONAL CROP FAILURES"
            ],

            // Combat report headlines (system-wide destruction)
            COMBAT_PIRATE_KILLS: [
                "PIRATE FLEET DECIMATED IN {SYSTEM}",
                "{COUNT} RAIDERS DESTROYED IN {SYSTEM} SKIRMISH",
                "MAJOR PIRATE LOSSES IN {SYSTEM}: {NAME} AMONG THE FALLEN"
            ],
            COMBAT_POLICE_CASUALTIES: [
                "LAW ENFORCEMENT TAKES CASUALTIES IN {SYSTEM}",
                "OFFICER {NAME} KILLED IN {SYSTEM} VIOLENCE",
                "{COUNT} OFFICERS FALL IN LINE OF DUTY"
            ],
            COMBAT_IMPERIAL_LOSSES: [
                "IMPERIAL FORCES SUFFER SETBACK IN {SYSTEM}",
                "{COUNT} IMPERIAL VESSELS LOST IN {SYSTEM}",
                "MILITARY CASUALTIES MOUNT IN {SYSTEM}"
            ],
            COMBAT_SEPARATIST_LOSSES: [
                "SEPARATIST CELLS CRUSHED IN {SYSTEM}",
                "REBEL FORCES TAKE HEAVY LOSSES IN {SYSTEM}",
                "{COUNT} RESISTANCE FIGHTERS ELIMINATED IN {SYSTEM}"
            ],
            COMBAT_ALIEN_KILLS: [
                "ALIEN THREAT REPELLED IN {SYSTEM}",
                "{COUNT} XENO HOSTILES NEUTRALIZED IN {SYSTEM}",
                "HUMANITY STRIKES BACK IN {SYSTEM}"
            ],

            // Hero headlines (pilots with multiple kills)
            HERO_IMPERIAL: [
                "🏅 HERO OF THE IMPERIUM: {NAME} CLAIMS {COUNT} KILLS IN {SYSTEM}",
                "🏅 IMPERIAL ACE {NAME} DEVASTATES ENEMIES IN {SYSTEM}",
                "🏅 DECORATED PILOT {NAME} DOMINATES {SYSTEM} SKIES"
            ],
            HERO_SEPARATIST: [
                "✊ HERO OF THE RESISTANCE: {NAME} STRIKES BACK IN {SYSTEM}",
                "✊ FREEDOM FIGHTER {NAME} DOWNS {COUNT} IMPERIAL CRAFT",
                "✊ REBEL ACE {NAME} TERRORIZES IMPERIAL FORCES"
            ],
            HERO_POLICE: [
                "🛡️ POLICE HERO: OFFICER {NAME} NEUTRALIZES {COUNT} THREATS",
                "🛡️ DEPUTY {NAME} CLEARS {SYSTEM} OF PIRATE MENACE",
                "🛡️ LAW ENFORCEMENT ACE {NAME} KEEPS THE PEACE"
            ],
            HERO_MILITARY: [
                "⭐ MILITARY ACE {NAME} RACKS UP {COUNT} VICTORIES",
                "⭐ DECORATED PILOT {NAME} DOMINATES {SYSTEM}",
                "⭐ COMBAT LEGEND {NAME} ADDS TO KILL COUNT"
            ]
        };

        // Body text templates
        this.bodyTemplates = {
            ASSASSINATION_SUCCESS: {
                IMPERIAL: "Imperial Security confirms the elimination of a designated threat. Order is maintained.",
                SEPARATIST: "Another bootlicker silenced. The resistance grows stronger with each tyrant removed.",
                INDEPENDENT: "Contract work pays well for those with steady aim. Premium rates available."
            },
            SABOTAGE_SUCCESS: {
                IMPERIAL: "Terrorist attack disrupts critical infrastructure. Perpetrators will face justice.",
                SEPARATIST: "The chains of corporate oppression shatter. The people will not be silenced!",
                INDEPENDENT: "Major disruption to supply chain. Expect price volatility in affected sectors."
            },
            BOUNTY_PIRATE: {
                IMPERIAL: "Criminal elements eliminated. Shipping lanes secured for lawful commerce.",
                SEPARATIST: "Free traders cut down by corporate mercenaries. The struggle continues.",
                INDEPENDENT: "Good hunting out there. Insurance premiums already dropping."
            },
            PIRATE_HIGH: {
                IMPERIAL: "Criminal anarchy threatens Imperial supply lines. Naval response authorized.",
                SEPARATIST: "The desperate strike back against monopoly rule. Who can blame them?",
                INDEPENDENT: "High risk means high reward—but triple-check your insurance."
            },
            WAR_SEPARATIST_VS_IMPERIAL: {
                IMPERIAL: "Separatist terrorists have initiated unprovoked aggression. Order will be restored.",
                SEPARATIST: "The revolution has begun! Death to the corporate oppressors!",
                INDEPENDENT: "Traders advised to avoid conflict zones. War profiteering opportunities abound."
            },
            WAR_ALIEN_VS_MILITARY: {
                IMPERIAL: "Xeno threat requires unified military response. All personnel mobilized.",
                SEPARATIST: "The aliens strike the heart of Imperial tyranny. Interesting times ahead.",
                INDEPENDENT: "Alien technology salvage could be highly profitable. Proceed with caution."
            }
        };

        // Initialize with some starter news
        this._addInitialNews();
    }

    _addInitialNews() {
        // Add a few background stories to start
        const starterNews = [
            {
                headline: "GALACTIC ECHO NETWORK ONLINE",
                body: "Your trusted source for news across the sectors. Stay informed, stay alive.",
                source: "The Galactic Echo",
                sourceColor: [255, 200, 100],
                category: NEWS_CATEGORY.BACKGROUND,
                priority: NEWS_PRIORITY.LOW,
                timestamp: Date.now() - 120000
            }
        ];

        starterNews.forEach(news => {
            this.newsItems.push({
                ...news,
                read: false
            });
        });
    }

    /**
     * Generate a random NPC name (uses centralized generator from enemyConstants.js)
     */
    _generateName() {
        return (typeof generateNPCName === 'function') ? generateNPCName() : 'Unknown';
    }

    /**
     * Generate a titled NPC name (uses centralized generator from enemyConstants.js)
     */
    _generateTitledName() {
        return (typeof generateTitledNPCName === 'function') ? generateTitledNPCName() : 'Unknown Official';
    }

    /**
     * Select a random template and fill in placeholders
     */
    _fillTemplate(templates, replacements) {
        const template = templates[Math.floor(Math.random() * templates.length)];
        let result = template;
        for (const [key, value] of Object.entries(replacements)) {
            result = result.replace(new RegExp(`\\{${key}\\}`, 'g'), value);
        }
        return result;
    }

    /**
     * Get faction perspective for body text
     */
    _selectFaction() {
        const keys = Object.keys(this.factions);
        const key = keys[Math.floor(Math.random() * keys.length)];
        return { key, ...this.factions[key] };
    }

    /**
     * Generate a simple hash for deduplication
     */
    _hashNews(type, key1, key2 = '') {
        return `${type}_${key1}_${key2}`;
    }

    /**
     * Check if similar news was recently added
     */
    _isDuplicate(hash) {
        return this.recentNewsHashes.has(hash);
    }

    /**
     * Track news to prevent duplicates
     */
    _trackNews(hash) {
        this.recentNewsHashes.add(hash);
        if (this.recentNewsHashes.size > this.maxRecentHashes) {
            const first = this.recentNewsHashes.values().next().value;
            this.recentNewsHashes.delete(first);
        }
    }

    /**
     * Add a news item with priority sorting
     */
    _addNews(newsItem) {
        const hash = this._hashNews(newsItem.category, newsItem.headline.substring(0, 20));
        if (this._isDuplicate(hash)) return;
        this._trackNews(hash);

        this.newsItems.unshift({
            ...newsItem,
            timestamp: Date.now(),
            read: false
        });

        // Sort by priority (higher first), then by timestamp (newer first)
        this.newsItems.sort((a, b) => {
            if (b.priority !== a.priority) return b.priority - a.priority;
            return b.timestamp - a.timestamp;
        });

        // Trim excess
        while (this.newsItems.length > this.maxNewsItems) {
            this.newsItems.pop();
        }
    }

    // =========================================================================
    // PLAYER EVENT NEWS
    // =========================================================================

    /**
     * Report a successful assassination
     */
    addAssassinationNews(targetName, systemName) {
        const faction = this._selectFaction();
        const headline = this._fillTemplate(
            this.headlineTemplates.ASSASSINATION_SUCCESS,
            { TARGET: targetName || this._generateTitledName(), SYSTEM: systemName || 'Unknown' }
        );
        const body = this.bodyTemplates.ASSASSINATION_SUCCESS[faction.key] ||
            `Target eliminated in ${systemName}. Payment processed.`;

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.PLAYER_ACTION,
            priority: NEWS_PRIORITY.BREAKING
        });
    }

    /**
     * Report a successful sabotage mission
     */
    addSabotageNews(targetType, locationName, systemName) {
        const faction = this._selectFaction();
        const headline = this._fillTemplate(
            this.headlineTemplates.SABOTAGE_SUCCESS,
            { TARGET: targetType || 'facility', LOCATION: locationName || systemName || 'orbital', SYSTEM: systemName || 'Unknown' }
        );
        const body = this.bodyTemplates.SABOTAGE_SUCCESS[faction.key] ||
            `Sabotage operation confirmed successful.`;

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.PLAYER_ACTION,
            priority: NEWS_PRIORITY.BREAKING
        });
    }

    /**
     * Report bounty completion (pirate, police, or alien kills)
     */
    addBountyNews(bountyType, count, systemName) {
        const templateKey = `BOUNTY_${bountyType.toUpperCase()}`;
        const templates = this.headlineTemplates[templateKey] || this.headlineTemplates.BOUNTY_PIRATE;

        const faction = this._selectFaction();
        const headline = this._fillTemplate(templates, {
            COUNT: count.toString(),
            SYSTEM: systemName || 'Local Sector'
        });

        let body;
        if (bountyType.toUpperCase() === 'PIRATE') {
            body = this.bodyTemplates.BOUNTY_PIRATE[faction.key] || `${count} hostiles eliminated.`;
        } else if (bountyType.toUpperCase() === 'POLICE') {
            body = `Authorities are on high alert. ${count} officers lost.`;
        } else {
            body = `Xeno threat reduced by ${count}. Humanity breathes easier.`;
        }

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.PLAYER_ACTION,
            priority: NEWS_PRIORITY.BREAKING
        });
    }

    /**
     * Report player joining police force
     */
    addPoliceJoinedNews(systemName) {
        const headline = this._fillTemplate(
            this.headlineTemplates.POLICE_JOINED,
            { SYSTEM: systemName || 'Local' }
        );

        this._addNews({
            headline,
            body: "The force welcomes a new member to serve and protect.",
            source: "The Core Echo",
            sourceColor: this.factions.IMPERIAL.color,
            category: NEWS_CATEGORY.PLAYER_ACTION,
            priority: NEWS_PRIORITY.HIGH
        });
    }

    /**
     * Report war/conflict events
     * @param {string} intensity - 'SKIRMISH' or 'FULL_WAR'
     * @param {string} factions - 'SEPARATIST_VS_IMPERIAL' or 'ALIEN_VS_MILITARY'
     * @param {string} systemName - System where war is occurring
     */
    addWarNews(intensity, factions, systemName) {
        const isFullWar = intensity === 'FULL_WAR';
        const templates = isFullWar ? this.headlineTemplates.WAR_FULL : this.headlineTemplates.WAR_SKIRMISH;

        const headline = this._fillTemplate(templates, {
            SYSTEM: systemName || 'Local Sector'
        });

        // Select body based on factions and random faction perspective
        const bodyKey = `WAR_${factions}`;
        const faction = this._selectFaction();
        const body = (this.bodyTemplates[bodyKey] && this.bodyTemplates[bodyKey][faction.key]) ||
            `Armed conflict underway. All pilots advised to exercise extreme caution.`;

        // War faction determines source color
        let sourceColor = faction.color;
        if (factions === 'SEPARATIST_VS_IMPERIAL') {
            sourceColor = Math.random() < 0.5 ? this.factions.IMPERIAL.color : this.factions.SEPARATIST.color;
        }

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: sourceColor,
            category: NEWS_CATEGORY.LOCAL_EVENT,
            priority: isFullWar ? NEWS_PRIORITY.BREAKING : NEWS_PRIORITY.HIGH
        });
    }

    /**
     * Report player joining a faction
     */
    addFactionJoinedNews(factionName) {
        const headline = this._fillTemplate(
            this.headlineTemplates.FACTION_JOINED,
            { FACTION: factionName || 'Unknown Faction' }
        );

        const isImperial = factionName?.toUpperCase().includes('IMPERIAL');
        const source = isImperial ? this.factions.IMPERIAL : this.factions.SEPARATIST;

        this._addNews({
            headline,
            body: `Recruitment drives continue across the sector.`,
            source: source.name,
            sourceColor: source.color,
            category: NEWS_CATEGORY.PLAYER_ACTION,
            priority: NEWS_PRIORITY.HIGH
        });
    }

    // =========================================================================
    // COMBAT REPORTS (system-wide destruction tracking)
    // =========================================================================

    /**
     * Report combat casualties for a faction in a system
     * @param {string} factionType - 'PIRATE', 'POLICE', 'IMPERIAL', 'SEPARATIST', 'ALIEN'
     * @param {number} count - Number of casualties
     * @param {string} systemName - System where combat occurred
     * @param {string} [notableName] - Optional name of a notable casualty
     */
    addCombatReportNews(factionType, count, systemName, notableName = null) {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastCombatReportTime < this.combatReportCooldown) return;

        const templateKey = `COMBAT_${factionType.toUpperCase()}_${factionType === 'POLICE' ? 'CASUALTIES' : factionType === 'PIRATE' ? 'KILLS' : 'LOSSES'}`;
        const templates = this.headlineTemplates[templateKey] || this.headlineTemplates.COMBAT_PIRATE_KILLS;
        if (!templates) return;

        const headline = this._fillTemplate(templates, {
            SYSTEM: systemName || 'Local Sector',
            COUNT: count.toString(),
            NAME: notableName || this._generateName()
        });

        // Select appropriate faction perspective for body text
        let sourceFaction, body;
        switch (factionType.toUpperCase()) {
            case 'PIRATE':
                sourceFaction = this.factions.IMPERIAL;
                body = `Criminal elements eliminated. ${count} pirate vessels confirmed destroyed.`;
                break;
            case 'POLICE':
                sourceFaction = this.factions.IMPERIAL;
                body = `Authorities mourn fallen officers. Investigation underway.`;
                break;
            case 'IMPERIAL':
            case 'MILITARY':
                sourceFaction = this.factions.SEPARATIST;
                body = `Imperial forces suffer losses. The resistance grows stronger.`;
                break;
            case 'SEPARATIST':
                sourceFaction = this.factions.IMPERIAL;
                body = `Rebel terrorists neutralized. Order is maintained.`;
                break;
            case 'ALIEN':
                sourceFaction = this.factions.INDEPENDENT;
                body = `Xeno threat reduced. Humanity breathes a little easier.`;
                break;
            default:
                sourceFaction = this._selectFaction();
                body = `Combat operations conclude. ${count} hostiles eliminated.`;
        }

        this._addNews({
            headline,
            body,
            source: sourceFaction.name,
            sourceColor: sourceFaction.color,
            category: NEWS_CATEGORY.LOCAL_EVENT,
            priority: NEWS_PRIORITY.HIGH
        });

        this.lastCombatReportTime = now;
    }

    /**
     * Report a hero pilot with multiple kills
     * @param {string} pilotName - Name of the hero pilot
     * @param {number} kills - Number of kills
     * @param {string} faction - Pilot's faction ('IMPERIAL', 'SEPARATIST', 'POLICE', 'MILITARY')
     * @param {string} systemName - System where the heroics occurred
     */
    addHeroNews(pilotName, kills, faction, systemName) {
        // Check cooldown
        const now = Date.now();
        if (now - this.lastHeroReportTime < this.heroReportCooldown) return;
        if (!pilotName || kills < 3) return; // Require 3+ kills for hero status

        // Map faction to template key
        let templateKey = 'HERO_MILITARY';
        let sourceFaction = this.factions.IMPERIAL;
        let body = `A new combat ace emerges in ${systemName}.`;

        switch (faction?.toUpperCase()) {
            case 'IMPERIAL':
            case 'MILITARY':
                templateKey = 'HERO_IMPERIAL';
                sourceFaction = this.factions.IMPERIAL;
                body = `${pilotName} exemplifies Imperial excellence. ${kills} confirmed kills in a single engagement.`;
                break;
            case 'SEPARATIST':
                templateKey = 'HERO_SEPARATIST';
                sourceFaction = this.factions.SEPARATIST;
                body = `${pilotName} strikes fear into Imperial hearts. The resistance celebrates ${kills} victories.`;
                break;
            case 'POLICE':
                templateKey = 'HERO_POLICE';
                sourceFaction = this.factions.IMPERIAL;
                body = `Officer ${pilotName} honored for neutralizing ${kills} threats. The sector is safer today.`;
                break;
        }

        const templates = this.headlineTemplates[templateKey];
        if (!templates) return;

        const headline = this._fillTemplate(templates, {
            NAME: pilotName,
            COUNT: kills.toString(),
            SYSTEM: systemName || 'Local Sector'
        });

        this._addNews({
            headline,
            body,
            source: sourceFaction.name,
            sourceColor: sourceFaction.color,
            category: NEWS_CATEGORY.LOCAL_EVENT,
            priority: NEWS_PRIORITY.BREAKING
        });

        this.lastHeroReportTime = now;
    }

    // =========================================================================
    // ENVIRONMENTAL NEWS (based on spawn levels and system conditions)
    // =========================================================================

    /**
     * Report on pirate activity level in a system
     */
    addPirateActivityNews(systemName, activityLevel) {
        const hash = this._hashNews('pirate', systemName, activityLevel);
        if (this._isDuplicate(hash)) return;

        const isHigh = activityLevel === 'high' || activityLevel > 0.6;
        const templates = isHigh ? this.headlineTemplates.PIRATE_HIGH : this.headlineTemplates.PIRATE_LOW;
        const faction = this._selectFaction();

        const headline = this._fillTemplate(templates, { SYSTEM: systemName });
        const body = isHigh ?
            (this.bodyTemplates.PIRATE_HIGH[faction.key] || 'Increased hostile activity detected.') :
            'Clear skies for traders. Low risk transit recommended.';

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.LOCAL_EVENT,
            priority: isHigh ? NEWS_PRIORITY.HIGH : NEWS_PRIORITY.LOW
        });
    }

    /**
     * Report market conditions
     */
    addMarketNews(stationName, commodity, isBoom) {
        const templates = isBoom ? this.headlineTemplates.MARKET_BOOM : this.headlineTemplates.MARKET_CRASH;
        const faction = this._selectFaction();

        const headline = this._fillTemplate(templates, {
            STATION: stationName,
            COMMODITY: commodity || 'commodities'
        });

        const body = isBoom ?
            `Demand outstrips supply. Sellers commanding premium prices.` :
            `Oversupply crashes prices. Buyers rejoice, sellers weep.`;

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.LOCAL_EVENT,
            priority: NEWS_PRIORITY.MEDIUM
        });
    }

    /**
     * Report crisis events (plague/famine)
     * @param {string} systemName - Name of the affected system
     * @param {string} crisisType - 'plague' or 'famine'
     * @param {boolean} isDistant - Whether the crisis is in a distant/connected system
     */
    addCrisisNews(systemName, crisisType, isDistant = false) {
        const isPlagueType = crisisType.toLowerCase() === 'plague';

        let templateKey, body, sourceColor;

        if (isPlagueType) {
            templateKey = isDistant ? 'CRISIS_PLAGUE_DISTANT' : 'CRISIS_PLAGUE';
            body = isDistant
                ? `Medical emergency declared in ${systemName}. Medicine supplies critically low. Traders urged to deliver medical aid.`
                : `Quarantine measures in effect. Medicine prices soaring as supplies dwindle. Emergency haulers inbound.`;
            sourceColor = [255, 0, 255]; // Magenta
        } else {
            templateKey = isDistant ? 'CRISIS_FAMINE_DISTANT' : 'CRISIS_FAMINE';
            body = isDistant
                ? `Food shortage crisis escalates in ${systemName}. Traders redirecting cargo ships to deliver emergency supplies.`
                : `Crop failures devastate local population. Food prices skyrocketing as emergency relief efforts begin.`;
            sourceColor = [255, 150, 0]; // Orange
        }

        const templates = this.headlineTemplates[templateKey];
        const headline = templates
            ? this._fillTemplate(templates, { SYSTEM: systemName || 'Unknown Sector' })
            : `CRISIS ALERT: ${crisisType.toUpperCase()} IN ${systemName}`;

        const faction = this._selectFaction();

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: sourceColor,
            category: isDistant ? NEWS_CATEGORY.GALAXY_NEWS : NEWS_CATEGORY.LOCAL_EVENT,
            priority: isDistant ? NEWS_PRIORITY.HIGH : NEWS_PRIORITY.BREAKING
        });
    }

    // =========================================================================
    // GALAXY-WIDE NEWS (procedural news from other systems)
    // =========================================================================

    /**
     * Generate news from other systems in the galaxy
     */
    generateGalaxyNews(galaxy) {
        if (!galaxy || !galaxy.systems || galaxy.systems.length < 2) return;

        // Throttle galaxy news generation
        const now = Date.now();
        if (now - this.lastGalaxyNewsTime < this.galaxyNewsInterval) return;
        this.lastGalaxyNewsTime = now;

        // Pick a random system that isn't the current one
        const currentIdx = galaxy.currentSystemIndex;
        const candidates = galaxy.systems.filter((s, i) => i !== currentIdx && s);
        if (candidates.length === 0) return;

        const targetSystem = candidates[Math.floor(Math.random() * candidates.length)];
        const systemName = targetSystem.name || 'Distant Sector';

        // Generate random story type
        const storyTypes = ['DISTANT_CONFLICT', 'DISTANT_DISCOVERY', 'DISTANT_TRADE', 'DISTANT_DISASTER'];
        const storyType = storyTypes[Math.floor(Math.random() * storyTypes.length)];

        const templates = this.headlineTemplates[storyType];
        if (!templates) return;

        const faction = this._selectFaction();
        const headline = this._fillTemplate(templates, { SYSTEM: systemName });

        // Generate appropriate body based on story type
        let body;
        switch (storyType) {
            case 'DISTANT_CONFLICT':
                body = `Reports of military action near ${systemName}. Travel advisories in effect.`;
                break;
            case 'DISTANT_DISCOVERY':
                body = `Scientists and explorers flock to ${systemName} to investigate.`;
                break;
            case 'DISTANT_TRADE':
                body = `Economic indicators positive. Traders seeking new opportunities.`;
                break;
            case 'DISTANT_DISASTER':
                body = `Emergency response teams dispatched. Casualty reports pending.`;
                break;
            default:
                body = `Developing story from ${systemName}.`;
        }

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.GALAXY_NEWS,
            priority: NEWS_PRIORITY.MEDIUM
        });
    }

    /**
     * Generate background/flavor news
     */
    generateBackgroundNews() {
        const backgroundStories = [
            { headline: "LUXURY LINER COMPLETES MAIDEN VOYAGE", body: "Passengers report exceptional experience aboard the ISS Magnificence." },
            { headline: "MINING CONSORTIUM REPORTS RECORD PROFITS", body: "Shareholders celebrate as ore prices remain stable." },
            { headline: "CELEBRITY PILOT ENDORSES NEW SHIP MODEL", body: "Pre-orders exceed expectations according to manufacturer." },
            { headline: "ANNUAL TRADE FAIR DRAWS RECORD CROWDS", body: "Merchants from across the sector showcase latest wares." },
            { headline: "RACING CIRCUIT ANNOUNCES NEW SEASON", body: "Pilots prepare for the most challenging course yet." },
            { headline: "CULINARY SENSATION SWEEPS STATION RESTAURANTS", body: "The new fusion cuisine has diners lining up." },
            { headline: "HOLOVID SERIES BREAKS VIEWERSHIP RECORDS", body: "Critics praise the drama's realistic space combat scenes." },
            { headline: "NEW TERRAFORMING PROJECT APPROVED", body: "Colony world expected to reach habitability within decades." }
        ];

        const story = backgroundStories[Math.floor(Math.random() * backgroundStories.length)];
        const faction = this._selectFaction();

        this._addNews({
            headline: story.headline,
            body: story.body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.BACKGROUND,
            priority: NEWS_PRIORITY.LOW
        });
    }

    // =========================================================================
    // LEGACY SUPPORT - Original addNewsItem for existing event integrations
    // =========================================================================

    /**
     * Adds a new news item based on a game event (legacy support)
     */
    addNewsItem(eventData) {
        const report = this._generateReport(eventData);

        this._addNews({
            headline: report.title,
            body: report.body,
            source: report.source,
            sourceColor: report.sourceColor,
            category: NEWS_CATEGORY.LOCAL_EVENT,
            priority: NEWS_PRIORITY.MEDIUM
        });
    }

    /**
     * Generates a hermeneutic report based on the event (legacy support)
     */
    _generateReport(data) {
        const perspectives = Object.keys(this.factions);
        const chosenFactionKey = perspectives[Math.floor(Math.random() * perspectives.length)];
        const faction = this.factions[chosenFactionKey];

        let title = "BREAKING: SECTOR UPDATE";
        let body = data.text || "Developing story...";

        switch (data.type) {
            case 'PIRATE_SWARM':
            case 'PIRATE_RAID':
                title = this._fillTemplate(this.headlineTemplates.PIRATE_HIGH, { SYSTEM: data.systemName || 'Local Sector' });
                body = this.bodyTemplates.PIRATE_HIGH[chosenFactionKey] || body;
                break;

            case 'MARKET_SHORTAGE':
                title = this._fillTemplate(this.headlineTemplates.MARKET_BOOM, {
                    STATION: data.stationName || 'Station',
                    COMMODITY: data.commodity || 'goods'
                });
                body = `Shortage of ${data.commodity || 'goods'} reported at ${data.stationName || 'local station'}.`;
                break;

            case 'MARKET_SURPLUS':
            case 'MINING_BOOM':
                title = this._fillTemplate(this.headlineTemplates.MARKET_CRASH, {
                    STATION: data.stationName || 'Station',
                    COMMODITY: data.commodity || 'ore'
                });
                body = `Surplus floods market. Prices plummeting.`;
                break;

            case 'POLICE_ACTION':
            case 'SMUGGLING_BUST':
                title = "LAW ENFORCEMENT OPERATION IN PROGRESS";
                body = `Security forces active in ${data.systemName || 'local sector'}. Expect delays.`;
                break;

            default:
                title = `SECTOR UPDATE: ${(data.type || 'EVENT').replace(/_/g, ' ')}`;
                break;
        }

        return {
            title,
            body,
            source: faction.name,
            sourceColor: faction.color
        };
    }

    /**
     * Get all news items (sorted by priority and time)
     */
    getNewsItems() {
        return this.newsItems;
    }

    /**
     * Update news manager - call periodically to generate galaxy news
     */
    update(galaxy) {
        // Periodically generate galaxy news
        if (galaxy && Math.random() < 0.01) { // ~1% chance per frame when called
            this.generateGalaxyNews(galaxy);
        }

        // Occasionally add background flavor
        if (Math.random() < 0.002) { // ~0.2% chance per frame
            this.generateBackgroundNews();
        }
    }
}
