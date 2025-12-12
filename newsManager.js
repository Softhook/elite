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
        this.maxNewsItems = 30;
        this.lastGalaxyNewsTime = 0;
        this.galaxyNewsInterval = 60000; // Generate galaxy news every 60 seconds

        // Track recent news to avoid duplicates
        this.recentNewsHashes = new Set();
        this.maxRecentHashes = 50;

        // Factional perspectives for report generation
        this.factions = {
            IMPERIAL: {
                name: "The Core Echo",
                tone: "formal",
                bias: "order",
                color: [100, 150, 255]
            },
            SEPARATIST: {
                name: "Free Flow Channel",
                tone: "agitative",
                bias: "resistance",
                color: [255, 100, 100]
            },
            INDEPENDENT: {
                name: "The Freight Log",
                tone: "pragmatic",
                bias: "profit",
                color: [200, 200, 200]
            }
        };

        // NPC name generators for flavor
        this.firstNames = [
            "Marcus", "Elena", "Viktor", "Zara", "Chen", "Astrid", "Dmitri", "Nadia",
            "Rashid", "Ingrid", "Kofi", "Yuki", "Aleksei", "Fatima", "Jorge", "Priya",
            "Sven", "Amara", "Nikolai", "Lena", "Dante", "Mei", "Oleg", "Ximena"
        ];
        this.lastNames = [
            "Vance", "Okonkwo", "Petrov", "Singh", "Nakamura", "Lindqvist", "Aziz",
            "Chen", "Volkov", "Dubois", "Kowalski", "Rahman", "Torres", "Ivanova",
            "Schmidt", "Yamamoto", "Fernandez", "Johansson", "Kim", "Andersen"
        ];
        this.titles = [
            "Commander", "Captain", "Admiral", "Director", "Chief", "Agent",
            "Warden", "Marshal", "Baron", "Minister", "Overseer", "Prefect"
        ];

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
     * Generate a random NPC name
     */
    _generateName() {
        const first = this.firstNames[Math.floor(Math.random() * this.firstNames.length)];
        const last = this.lastNames[Math.floor(Math.random() * this.lastNames.length)];
        return `${first} ${last}`;
    }

    /**
     * Generate a titled NPC name
     */
    _generateTitledName() {
        const title = this.titles[Math.floor(Math.random() * this.titles.length)];
        return `${title} ${this._generateName()}`;
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
