// ****** newsManager.js ******
// Handles the generation and storage of in-game news reports (The Galactic Echo)
// Enhanced with player event tracking, environmental news, and galaxy-wide reports

// =============================================================================
// CONSTANTS
// =============================================================================

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

/**
 * Faction news sources with their perspectives
 */
const NEWS_FACTIONS = {
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

/**
 * Cached faction keys for fast random selection
 */
const NEWS_FACTION_KEYS = Object.keys(NEWS_FACTIONS);

/**
 * Commodities list for news generation
 */
const NEWS_COMMODITIES = [
    'Metals', 'Rare Ore', 'Medicine', 'Food', 'Luxury Goods',
    'Textiles', 'Adv Components', 'Narcotics', 'Weapons', 'Slaves'
];

// =============================================================================
// HEADLINE TEMPLATES
// =============================================================================

const HEADLINE_TEMPLATES = {
    // --- Player Action Headlines ---
    ASSASSINATION_SUCCESS: [
        "Notorious {TARGET} eliminated in daring strike",
        "Shadowy operative silences {TARGET}",
        "Contract fulfilled: {TARGET} meets violent end",
        "{TARGET} found dead amid debris field",
        "Bounty claimed on infamous {TARGET}"
    ],
    SABOTAGE_SUCCESS: [
        "Industrial sabotage rocks {LOCATION}",
        "Explosion destroys {TARGET} near {LOCATION}",
        "Infrastructure attack leaves {LOCATION} reeling",
        "Covert operation cripples {TARGET}",
        "Mysterious blast devastates {LOCATION} facility"
    ],
    BOUNTY_PIRATE: [
        "Freelancer claims bounty on {COUNT} pirates",
        "Pirate hunters celebrate {COUNT} kills",
        "Marauder wing decimated by lone pilot",
        "Piracy dealt major blow in {SYSTEM}",
        "{COUNT} raiders meet fiery end"
    ],
    BOUNTY_POLICE: [
        "Rogue cop killer strikes again",
        "Authorities mourn {COUNT} fallen officers",
        "Vigilante violence claims {COUNT} police",
        "Law enforcement under siege",
        "Cop killer on the loose in {SYSTEM}"
    ],
    BOUNTY_ALIEN: [
        "Xeno-hunter bags {COUNT} alien hostiles",
        "Alien menace pushed back in {SYSTEM}",
        "Otherworldly threat neutralized",
        "{COUNT} alien craft destroyed by human pilot",
        "Humanity strikes back against xeno incursion"
    ],
    POLICE_JOINED: [
        "New deputy joins {SYSTEM} patrol",
        "Authorities bolster ranks with new recruit",
        "Freelancer sworn in as law enforcement",
        "Police welcome combat veteran to force"
    ],
    FACTION_JOINED: [
        "New recruit swears allegiance to {FACTION}",
        "{FACTION} ranks swell with new blood",
        "Pilot pledges loyalty to {FACTION} cause"
    ],

    // --- Environmental Headlines ---
    PIRATE_HIGH: [
        "Pirate activity surges in {SYSTEM}",
        "Trade routes under siege by marauders",
        "Shipping lanes crawling with raiders",
        "Merchants warned: {SYSTEM} is hot",
        "Security firms overwhelmed by pirate wave"
    ],
    PIRATE_LOW: [
        "Trade flows freely in peaceful {SYSTEM}",
        "Piracy at record lows near {SYSTEM}",
        "Merchants celebrate quiet shipping lanes",
        "Security patrols report all clear"
    ],
    MARKET_BOOM: [
        "Prices soar at {STATION}",
        "Commodity shortage drives {COMMODITY} prices up",
        "Traders rush to {STATION} for high margins",
        "Demand surge hits {STATION} markets"
    ],
    MARKET_CRASH: [
        "Prices crash at {STATION}",
        "{COMMODITY} glut devastates local traders",
        "Oversupply tanks market at {STATION}",
        "Buying opportunity: {COMMODITY} dirt cheap"
    ],

    // --- Galaxy-Wide Headlines ---
    DISTANT_CONFLICT: [
        "War erupts in {SYSTEM} sector",
        "Imperial forces clash with rebels in {SYSTEM}",
        "Separatist uprising rocks {SYSTEM}",
        "Military buildup reported near {SYSTEM}",
        "Tensions escalate in {SYSTEM} quadrant"
    ],
    DISTANT_DISCOVERY: [
        "Explorers report anomaly near {SYSTEM}",
        "Mysterious signal detected from {SYSTEM}",
        "New hyperspace route found to {SYSTEM}",
        "Scientists baffled by {SYSTEM} phenomenon"
    ],
    DISTANT_TRADE: [
        "New trade agreement benefits {SYSTEM}",
        "{SYSTEM} opens markets to foreign traders",
        "Economic boom transforms {SYSTEM}",
        "Luxury goods flooding into {SYSTEM}"
    ],
    DISTANT_DISASTER: [
        "Catastrophe strikes {SYSTEM}",
        "Station disaster claims lives in {SYSTEM}",
        "Asteroid impact devastates {SYSTEM} colony",
        "Plague outbreak reported in {SYSTEM}"
    ],

    // --- War Event Headlines ---
    WAR_SKIRMISH: [
        "⚔️ Military skirmish erupts in {SYSTEM}",
        "⚔️ Armed conflict breaks out near {SYSTEM}",
        "⚔️ Faction forces clash in {SYSTEM} sector",
        "⚔️ Border skirmish reported in {SYSTEM}",
        "⚔️ Hostile engagement detected in {SYSTEM}"
    ],
    WAR_FULL: [
        "🔥 Full scale war erupts in {SYSTEM}",
        "🔥 All-out conflict engulfs {SYSTEM}",
        "🔥 Massive battle underway in {SYSTEM}",
        "🔥 War declared in {SYSTEM} sector",
        "🔥 Sector-wide hostilities begin in {SYSTEM}"
    ],

    // --- Crisis Event Headlines ---
    CRISIS_PLAGUE: [
        "☠️ Deadly plague outbreak in {SYSTEM}",
        "☠️ Contagion spreads across {SYSTEM}",
        "☠️ Medical emergency: Plague ravages {SYSTEM}",
        "☠️ Quarantine declared in {SYSTEM}",
        "☠️ Disease outbreak overwhelms {SYSTEM} hospitals"
    ],
    CRISIS_FAMINE: [
        "🍂 Severe famine grips {SYSTEM}",
        "🍂 Food crisis devastates {SYSTEM}",
        "🍂 Crop failures cause mass starvation in {SYSTEM}",
        "🍂 Food shortage emergency in {SYSTEM}",
        "🍂 Hunger crisis spreads across {SYSTEM}"
    ],
    CRISIS_PLAGUE_DISTANT: [
        "☠️ Plague outbreak spreads to {SYSTEM}",
        "☠️ Neighboring system {SYSTEM} affected by contagion",
        "☠️ Disease reaches {SYSTEM} from nearby outbreak"
    ],
    CRISIS_FAMINE_DISTANT: [
        "🍂 Famine conditions worsen in {SYSTEM}",
        "🍂 Food crisis spreads to {SYSTEM}",
        "🍂 {SYSTEM} suffers from regional crop failures"
    ],

    // --- Combat Report Headlines ---
    COMBAT_PIRATE_KILLS: [
        "Pirate fleet decimated in {SYSTEM}",
        "{COUNT} raiders destroyed in {SYSTEM} skirmish",
        "Major pirate losses in {SYSTEM}: {NAME} among the fallen"
    ],
    COMBAT_POLICE_CASUALTIES: [
        "Law enforcement takes casualties in {SYSTEM}",
        "Officer {NAME} killed in {SYSTEM} violence",
        "{COUNT} officers fall in line of duty"
    ],
    COMBAT_IMPERIAL_LOSSES: [
        "Imperial forces suffer setback in {SYSTEM}",
        "{COUNT} Imperial vessels lost in {SYSTEM}",
        "Military casualties mount in {SYSTEM}"
    ],
    COMBAT_SEPARATIST_LOSSES: [
        "Separatist cells crushed in {SYSTEM}",
        "Rebel forces take heavy losses in {SYSTEM}",
        "{COUNT} resistance fighters eliminated in {SYSTEM}"
    ],
    COMBAT_ALIEN_KILLS: [
        "Alien threat repelled in {SYSTEM}",
        "{COUNT} xeno hostiles neutralized in {SYSTEM}",
        "Humanity strikes back in {SYSTEM}"
    ],

    // --- Hero Headlines ---
    HERO_IMPERIAL: [
        "🏅 Hero of the Imperium: {NAME} claims {COUNT} kills in {SYSTEM}",
        "🏅 Imperial ace {NAME} devastates enemies in {SYSTEM}",
        "🏅 Decorated pilot {NAME} dominates {SYSTEM} skies"
    ],
    HERO_SEPARATIST: [
        "✊ Hero of the Resistance: {NAME} strikes back in {SYSTEM}",
        "✊ Freedom fighter {NAME} downs {COUNT} Imperial craft",
        "✊ Rebel ace {NAME} terrorizes Imperial forces"
    ],
    HERO_POLICE: [
        "🛡️ Police hero: Officer {NAME} neutralizes {COUNT} threats",
        "🛡️ Deputy {NAME} clears {SYSTEM} of pirate menace",
        "🛡️ Law enforcement ace {NAME} keeps the peace"
    ],
    HERO_MILITARY: [
        "⭐ Military ace {NAME} racks up {COUNT} victories",
        "⭐ Decorated pilot {NAME} dominates {SYSTEM}",
        "⭐ Combat legend {NAME} adds to kill count"
    ]
};

// =============================================================================
// BODY TEMPLATES
// =============================================================================

const BODY_TEMPLATES = {
    ASSASSINATION_SUCCESS: {
        IMPERIAL: "Imperial Security confirms the elimination of a designated threat to galactic stability. Local patrols have been increased as investigators sweep the area for accomplices.",
        SEPARATIST: "Another bootlicker silenced by the brave operatives of the resistance. Each tyrant removed brings us closer to freedom from corporate tyranny. The people remember.",
        INDEPENDENT: "Contract work pays well for those with steady aim and no questions asked. Premium rates currently available for experienced operatives with clean records."
    },
    SABOTAGE_SUCCESS: {
        IMPERIAL: "Terrorist attack disrupts critical infrastructure serving millions of loyal citizens. Security forces are conducting a sector-wide manhunt. Perpetrators will face Imperial justice.",
        SEPARATIST: "The chains of corporate oppression shatter as workers strike back against their exploiters. Solidarity actions reported across neighboring systems. The people will not be silenced!",
        INDEPENDENT: "Major disruption to regional supply chain will impact commodity prices for weeks. Traders should monitor market fluctuations closely—significant opportunities for profit."
    },
    BOUNTY_PIRATE: {
        IMPERIAL: "Criminal elements eliminated by authorized bounty hunters operating under Imperial contract. Shipping lanes are now secured for lawful commerce and trade flows resume.",
        SEPARATIST: "Free traders cut down by corporate mercenaries enforcing monopoly shipping rights. The struggle for economic freedom continues across the frontier systems.",
        INDEPENDENT: "Good hunting out there for those with combat-ready ships. Insurance premiums already dropping as patrol coverage increases. Check bounty boards for updated rates."
    },
    PIRATE_HIGH: {
        IMPERIAL: "Criminal anarchy threatens Imperial supply lines and endangers civilian traffic. Naval command has authorized enhanced patrol routes and deployed additional security assets.",
        SEPARATIST: "The desperate and dispossessed strike back against monopoly rule and corporate exploitation. When legitimate trade is criminalized, outlaws become revolutionaries.",
        INDEPENDENT: "High risk means high reward for traders willing to run the gauntlet. Triple-check your insurance coverage and consider hiring escort protection before departure."
    },
    WAR_SEPARATIST_VS_IMPERIAL: {
        IMPERIAL: "Separatist terrorists have initiated unprovoked aggression against lawful Imperial installations. Military command assures citizens that order will be restored swiftly.",
        SEPARATIST: "The revolution has begun! Brave freedom fighters rise up against decades of corporate exploitation. Death to the oppressors! Victory to the people!",
        INDEPENDENT: "Traders strongly advised to avoid active conflict zones until hostilities conclude. War profiteering opportunities abound for those with armored cargo holds."
    },
    WAR_ALIEN_VS_MILITARY: {
        IMPERIAL: "Xeno threat requires unified military response from all human factions. All reserve personnel mobilized. Civilian ships advised to shelter in secured stations.",
        SEPARATIST: "The aliens strike the heart of Imperial military power. While we oppose the Empire, this threat concerns all humanity. Interesting times ahead.",
        INDEPENDENT: "Alien technology salvage could be highly profitable for those brave or foolish enough to enter the combat zone. Proceed with extreme caution and heavy armament."
    }
};

// =============================================================================
// BACKGROUND STORY TEMPLATES
// =============================================================================

const BACKGROUND_STORY_TEMPLATES = [
    // Ship stories (0-3)
    ['{SHIP} production hits record numbers', 'Shipyards across the sector report unprecedented demand for the {ship} as buyers rush to secure delivery slots. Manufacturing facilities operating at maximum capacity with waitlists extending well into the next quarter.'],
    ['Celebrity pilot {PILOT} endorses {SHIP}', 'Pre-orders for the {ship} exceed all expectations after famous combat ace {pilot} publicly praised its handling characteristics and combat performance. Dealers report showroom traffic has tripled since the endorsement.'],
    ['{SHIP} recall issued', 'Manufacturer issues voluntary recall affecting recent {ship} production runs citing minor thruster calibration issues discovered during routine quality testing. Owners advised to visit authorized service centers for free inspection and adjustment.'],
    ['New {SHIP} variant unveiled', 'Prototype {ship} variant featuring enhanced cargo capacity and improved jump range impresses at industry showcase. Test pilots report exceptional performance metrics. Mass production expected to begin within months.'],
    // Pirate stories (4-7)
    ['{GANG} activity drops sharply', 'Intelligence analysts suggest internal power struggle within the {gang} has disrupted their operations significantly. Traders report quieter shipping lanes as the criminal organization deals with leadership disputes.'],
    ['{GANG} leader spotted', 'Unconfirmed reports place the notorious {gang} commander near frontier system outposts. Bounty hunters mobilizing to intercept. Authorities urge civilians to report any sightings immediately while avoiding direct contact.'],
    ['Bounty hunters target {GANG}', 'Coordinated multi-system bounty operation launches against {gang} cells with significant financial backing from shipping corporations. Premium rates offered for verified eliminations. Hunters gathering at staging areas.'],
    ['{GANG} demands protection fees', 'Station operators in outer systems report escalating extortion attempts by {gang} operatives threatening cargo interdiction. Security consultants recommend enhanced escort protocols for valuable shipments.'],
    // Commodity stories (8-11)
    ['{COMMODITY} prices stabilize', 'After weeks of dramatic price volatility driven by supply disruptions, {commodity} markets finally find equilibrium. Traders cautiously optimistic as futures contracts normalize across major exchanges.'],
    ['New {COMMODITY} trade route discovered', 'Explorers map highly efficient hyperspace corridor connecting previously isolated {commodity} producers to major markets. Transportation costs expected to drop significantly. Shipping volumes already increasing.'],
    ['{COMMODITY} shortage feared', 'Supply chain analysts warn of potential {commodity} deficit in coming months as production facilities struggle with aging infrastructure. Stockpiling reported by major distributors. Prices trending upward.'],
    ['{COMMODITY} smuggling ring exposed', 'Coordinated law enforcement operation dismantles sophisticated smuggling network moving illegal {commodity} shipments through frontier systems. Multiple arrests made. Seized cargo valued in millions.'],
    // NPC stories (12-15)
    ['{TITLED} announces retirement', 'After decades of distinguished service shaping interstellar policy, the decorated official steps down amid elaborate ceremony. Successor appointment expected within weeks. Legacy includes landmark trade agreements.'],
    ['{TITLED} calls for reform', 'Controversial speech delivered to packed assembly hall demands sweeping changes to outdated trade regulations. Reactions sharply divided along factional lines. Protests and counter-protests reported at government buildings.'],
    ['Pilot {PILOT} sets new record', 'Racing circuit achievement celebrated as {pilot} completes fastest hyperspace corridor run in sector history. Previous record stood for over a decade. Sponsors announce substantial bonus payments.'],
    ['{PILOT} survives alien encounter', 'Lone pilot {pilot} escapes Thargoid ambush against overwhelming odds in tale of survival inspiring bounty hunters and military pilots across human space. Interview requests flooding in from media outlets.'],
    // Static stories (16-23)
    ['Imperial Clipper luxury cruise departs', 'VIP passengers embark on exclusive multi-system tour aboard the prestigious vessel. Security detail exceeds standard protocols with military escort through less secure regions. Passenger manifest includes notable celebrities.'],
    ['Separatist rally draws thousands', 'Frontier colony hosts largest political gathering in years as supporters demand greater autonomy from core world governance. Imperial observers maintain careful distance while monitoring communications. Speeches broadcast widely.'],
    ['Military exercises begin near frontier', 'Combined naval forces conduct extensive training operations involving hundreds of vessels. Civilian traffic rerouted during maneuvers. Officials describe exercises as routine preparedness drills. Critics question timing.'],
    ['Thargoid activity monitoring station upgraded', 'New long-range sensors provide dramatically enhanced detection capabilities for alien vessel movements. Military officials express confidence in improved early warning systems. Defense contractors celebrate major contract.'],
    ['Starliner cruiser completes maiden voyage', 'Passengers disembarking from flagship tourism vessel report exceptional amenities and flawless service. Booking requests surge for upcoming voyages. Industry analysts predict tourism sector growth.'],
    ['Mining boom transforms asteroid belt', 'Independent prospectors and corporate operations flock to newly discovered Rare Ore deposits. Boom town atmosphere develops around makeshift stations. Environmental concerns raised about extraction pace.'],
    ['Police Viper squadron receives commendation', 'Officers formally recognized for exceptional service protecting vital trade lanes from pirate incursions. Ceremony attended by sector governor. Decorated pilots credited with dozens of criminal interdictions.'],
    ['Cobra Mk III remains best-selling multi-role', 'Venerable design continues to dominate versatility rankings across all sectors despite newer competition. Manufacturers attribute success to proven reliability and extensive modification options. Sales remain strong.']
];

/**
 * Galaxy news story types for procedural generation
 */
const GALAXY_STORY_TYPES = ['DISTANT_CONFLICT', 'DISTANT_DISCOVERY', 'DISTANT_TRADE', 'DISTANT_DISASTER'];


// =============================================================================
// NEWS MANAGER CLASS
// =============================================================================

class NewsManager {

    // -------------------------------------------------------------------------
    // CONSTRUCTOR & INITIALIZATION
    // -------------------------------------------------------------------------

    constructor() {
        // News storage
        this.newsItems = [];
        this.maxNewsItems = 50;

        // Timing controls
        this.lastGalaxyNewsTime = 0;
        this.galaxyNewsInterval = 60000; // 60 seconds

        // Combat news cooldowns
        this.lastCombatReportTime = 0;
        this.combatReportCooldown = 30000; // 30 seconds
        this.lastHeroReportTime = 0;
        this.heroReportCooldown = 45000; // 45 seconds

        // Deduplication tracking
        this.recentNewsHashes = new Set();
        this.maxRecentHashes = 50;

        // Cached data for background news (lazily populated)
        this._cachedShipNames = null;
        this._cachedPirateGangs = null;

        // Initialize with starter news
        this._addInitialNews();
    }

    _addInitialNews() {
        // No initial news - let actual news items fill the feed
    }

    // -------------------------------------------------------------------------
    // CORE UTILITY METHODS
    // -------------------------------------------------------------------------

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
     * Uses split/join instead of RegExp for faster string replacement
     */
    _fillTemplate(templates, replacements) {
        const template = templates[(Math.random() * templates.length) | 0];
        let result = template;
        for (const key in replacements) {
            result = result.split('{' + key + '}').join(replacements[key]);
        }
        return result;
    }

    /**
     * Get a random faction perspective for body text
     */
    _selectFaction() {
        const key = NEWS_FACTION_KEYS[(Math.random() * NEWS_FACTION_KEYS.length) | 0];
        const faction = NEWS_FACTIONS[key];
        return { key, name: faction.name, tone: faction.tone, bias: faction.bias, color: faction.color };
    }

    /**
     * Lazily cache ship names from SHIP_DEFINITIONS
     */
    _getShipNames() {
        if (!this._cachedShipNames) {
            this._cachedShipNames = (typeof SHIP_DEFINITIONS !== 'undefined')
                ? Object.values(SHIP_DEFINITIONS).map(s => s.name).filter(Boolean)
                : ['Sidewinder', 'Cobra Mk III', 'Viper', 'Python'];
        }
        return this._cachedShipNames;
    }

    /**
     * Lazily cache pirate gang names
     */
    _getPirateGangs() {
        if (!this._cachedPirateGangs) {
            this._cachedPirateGangs = (typeof PIRATE_GANG_NAMES !== 'undefined')
                ? PIRATE_GANG_NAMES
                : ['Void Reavers', 'Cygnus Marauders'];
        }
        return this._cachedPirateGangs;
    }

    // -------------------------------------------------------------------------
    // NEWS DEDUPLICATION
    // -------------------------------------------------------------------------

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

    // -------------------------------------------------------------------------
    // NEWS STORAGE (Binary Search Insertion)
    // -------------------------------------------------------------------------

    /**
     * Add a news item with priority sorting
     * Uses binary search insertion instead of sorting entire array
     */
    _addNews(newsItem) {
        const hash = this._hashNews(newsItem.category, newsItem.headline.substring(0, 20));
        if (this._isDuplicate(hash)) return;
        this._trackNews(hash);

        const newItem = {
            headline: newsItem.headline,
            body: newsItem.body,
            source: newsItem.source,
            sourceColor: newsItem.sourceColor,
            category: newsItem.category,
            priority: newsItem.priority,
            timestamp: Date.now(),
            read: false
        };

        // Binary search for insert position (sorted by priority desc, then timestamp desc)
        const items = this.newsItems;
        const len = items.length;
        if (len === 0) {
            items.push(newItem);
        } else {
            let low = 0, high = len;
            const newPri = newItem.priority;
            const newTime = newItem.timestamp;
            while (low < high) {
                const mid = (low + high) >>> 1;
                const midItem = items[mid];
                if (midItem.priority > newPri ||
                    (midItem.priority === newPri && midItem.timestamp >= newTime)) {
                    low = mid + 1;
                } else {
                    high = mid;
                }
            }
            items.splice(low, 0, newItem);
        }

        // Trim excess
        if (items.length > this.maxNewsItems) {
            items.length = this.maxNewsItems;
        }
    }

    // -------------------------------------------------------------------------
    // PLAYER ACTION NEWS
    // -------------------------------------------------------------------------

    /**
     * Report a successful assassination
     */
    addAssassinationNews(targetName, systemName) {
        const faction = this._selectFaction();
        const headline = this._fillTemplate(
            HEADLINE_TEMPLATES.ASSASSINATION_SUCCESS,
            { TARGET: targetName || this._generateTitledName(), SYSTEM: systemName || 'Unknown' }
        );
        const body = BODY_TEMPLATES.ASSASSINATION_SUCCESS[faction.key] ||
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
            HEADLINE_TEMPLATES.SABOTAGE_SUCCESS,
            { TARGET: targetType || 'facility', LOCATION: locationName || systemName || 'orbital', SYSTEM: systemName || 'Unknown' }
        );
        const body = BODY_TEMPLATES.SABOTAGE_SUCCESS[faction.key] ||
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
        const templates = HEADLINE_TEMPLATES[templateKey] || HEADLINE_TEMPLATES.BOUNTY_PIRATE;

        const faction = this._selectFaction();
        const headline = this._fillTemplate(templates, {
            COUNT: count.toString(),
            SYSTEM: systemName || 'Local Sector'
        });

        let body;
        if (bountyType.toUpperCase() === 'PIRATE') {
            body = BODY_TEMPLATES.BOUNTY_PIRATE[faction.key] || `${count} hostiles eliminated.`;
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
            HEADLINE_TEMPLATES.POLICE_JOINED,
            { SYSTEM: systemName || 'Local' }
        );

        this._addNews({
            headline,
            body: "The force welcomes a new member to serve and protect.",
            source: "The Core Echo",
            sourceColor: NEWS_FACTIONS.IMPERIAL.color,
            category: NEWS_CATEGORY.PLAYER_ACTION,
            priority: NEWS_PRIORITY.HIGH
        });
    }

    /**
     * Report player joining a faction
     */
    addFactionJoinedNews(factionName) {
        const headline = this._fillTemplate(
            HEADLINE_TEMPLATES.FACTION_JOINED,
            { FACTION: factionName || 'Unknown Faction' }
        );

        const isImperial = factionName?.toUpperCase().includes('IMPERIAL');
        const source = isImperial ? NEWS_FACTIONS.IMPERIAL : NEWS_FACTIONS.SEPARATIST;

        this._addNews({
            headline,
            body: `Recruitment drives continue across the sector.`,
            source: source.name,
            sourceColor: source.color,
            category: NEWS_CATEGORY.PLAYER_ACTION,
            priority: NEWS_PRIORITY.HIGH
        });
    }

    // -------------------------------------------------------------------------
    // WAR & CONFLICT NEWS
    // -------------------------------------------------------------------------

    /**
     * Report war/conflict events
     * @param {string} intensity - 'SKIRMISH' or 'FULL_WAR'
     * @param {string} factions - 'SEPARATIST_VS_IMPERIAL' or 'ALIEN_VS_MILITARY'
     * @param {string} systemName - System where war is occurring
     */
    addWarNews(intensity, factions, systemName) {
        const isFullWar = intensity === 'FULL_WAR';
        const templates = isFullWar ? HEADLINE_TEMPLATES.WAR_FULL : HEADLINE_TEMPLATES.WAR_SKIRMISH;

        const headline = this._fillTemplate(templates, {
            SYSTEM: systemName || 'Local Sector'
        });

        const bodyKey = `WAR_${factions}`;
        const faction = this._selectFaction();
        const body = (BODY_TEMPLATES[bodyKey] && BODY_TEMPLATES[bodyKey][faction.key]) ||
            `Armed conflict underway. All pilots advised to exercise extreme caution.`;

        let sourceColor = faction.color;
        if (factions === 'SEPARATIST_VS_IMPERIAL') {
            sourceColor = Math.random() < 0.5 ? NEWS_FACTIONS.IMPERIAL.color : NEWS_FACTIONS.SEPARATIST.color;
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

    // -------------------------------------------------------------------------
    // COMBAT REPORT NEWS
    // -------------------------------------------------------------------------

    /**
     * Report combat casualties for a faction in a system
     * @param {string} factionType - 'PIRATE', 'POLICE', 'IMPERIAL', 'SEPARATIST', 'ALIEN'
     * @param {number} count - Number of casualties
     * @param {string} systemName - System where combat occurred
     * @param {string} [notableName] - Optional name of a notable casualty
     */
    addCombatReportNews(factionType, count, systemName, notableName = null) {
        const now = Date.now();
        if (now - this.lastCombatReportTime < this.combatReportCooldown) return;

        const templateKey = `COMBAT_${factionType.toUpperCase()}_${factionType === 'POLICE' ? 'CASUALTIES' : factionType === 'PIRATE' ? 'KILLS' : 'LOSSES'}`;
        const templates = HEADLINE_TEMPLATES[templateKey] || HEADLINE_TEMPLATES.COMBAT_PIRATE_KILLS;
        if (!templates) return;

        const headline = this._fillTemplate(templates, {
            SYSTEM: systemName || 'Local Sector',
            COUNT: count.toString(),
            NAME: notableName || this._generateName()
        });

        let sourceFaction, body;
        switch (factionType.toUpperCase()) {
            case 'PIRATE':
                sourceFaction = NEWS_FACTIONS.IMPERIAL;
                body = `Criminal elements eliminated by coordinated patrol operations. ${count} pirate vessels confirmed destroyed with minimal collateral damage. Salvage teams moving in to secure debris fields.`;
                break;
            case 'POLICE':
                sourceFaction = NEWS_FACTIONS.IMPERIAL;
                body = `Authorities mourn the loss of dedicated officers who gave their lives in service to the community. Full investigation underway as colleagues vow to bring perpetrators to justice.`;
                break;
            case 'IMPERIAL':
            case 'MILITARY':
                sourceFaction = NEWS_FACTIONS.SEPARATIST;
                body = `Imperial forces suffer significant tactical losses as resistance operations prove devastatingly effective. The movement grows stronger with each victory against tyranny.`;
                break;
            case 'SEPARATIST':
                sourceFaction = NEWS_FACTIONS.IMPERIAL;
                body = `Rebel terrorists neutralized in decisive security operation. Order is maintained throughout the sector as loyal citizens report suspicious activity to authorities.`;
                break;
            case 'ALIEN':
                sourceFaction = NEWS_FACTIONS.INDEPENDENT;
                body = `Xeno threat substantially reduced following intense combat engagement. Humanity breathes a little easier as defense forces demonstrate their effectiveness against the alien menace.`;
                break;
            default:
                sourceFaction = this._selectFaction();
                body = `Combat operations conclude successfully with ${count} hostile vessels eliminated. Patrol forces returning to base for resupply and debriefing. Shipping lanes reopened.`;
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
     * @param {string} faction - Pilot's faction
     * @param {string} systemName - System where the heroics occurred
     */
    addHeroNews(pilotName, kills, faction, systemName) {
        const now = Date.now();
        if (now - this.lastHeroReportTime < this.heroReportCooldown) return;
        if (!pilotName || kills < 3) return;

        let templateKey = 'HERO_MILITARY';
        let sourceFaction = NEWS_FACTIONS.IMPERIAL;
        let body = `A new combat ace emerges in ${systemName} with a display of exceptional piloting skill and tactical brilliance. Military analysts are taking note of this rising talent.`;

        switch (faction?.toUpperCase()) {
            case 'IMPERIAL':
            case 'MILITARY':
                templateKey = 'HERO_IMPERIAL';
                sourceFaction = NEWS_FACTIONS.IMPERIAL;
                body = `${pilotName} exemplifies Imperial excellence with ${kills} confirmed kills in a single engagement. Command has recommended formal commendation. This is what dedication to the Empire looks like.`;
                break;
            case 'SEPARATIST':
                templateKey = 'HERO_SEPARATIST';
                sourceFaction = NEWS_FACTIONS.SEPARATIST;
                body = `${pilotName} strikes fear into Imperial hearts as the resistance celebrates ${kills} decisive victories. Songs are already being written about this fearless freedom fighter.`;
                break;
            case 'POLICE':
                templateKey = 'HERO_POLICE';
                sourceFaction = NEWS_FACTIONS.IMPERIAL;
                body = `Officer ${pilotName} honored for neutralizing ${kills} serious threats to public safety. The sector is measurably safer thanks to this officer's exceptional courage and skill.`;
                break;
        }

        const templates = HEADLINE_TEMPLATES[templateKey];
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

    // -------------------------------------------------------------------------
    // ENVIRONMENTAL NEWS
    // -------------------------------------------------------------------------

    /**
     * Report on pirate activity level in a system
     */
    addPirateActivityNews(systemName, activityLevel) {
        const hash = this._hashNews('pirate', systemName, activityLevel);
        if (this._isDuplicate(hash)) return;

        const isHigh = activityLevel === 'high' || activityLevel > 0.6;
        const templates = isHigh ? HEADLINE_TEMPLATES.PIRATE_HIGH : HEADLINE_TEMPLATES.PIRATE_LOW;
        const faction = this._selectFaction();

        const headline = this._fillTemplate(templates, { SYSTEM: systemName });
        const body = isHigh ?
            (BODY_TEMPLATES.PIRATE_HIGH[faction.key] || 'Increased hostile activity detected across multiple shipping corridors. Patrol forces stretched thin as attacks continue. Security firms offering premium escort rates.') :
            'Clear skies reported by traders completing transit through the region. Low risk conditions make this an ideal time for valuable cargo runs. Insurance rates favorable.';

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
        const templates = isBoom ? HEADLINE_TEMPLATES.MARKET_BOOM : HEADLINE_TEMPLATES.MARKET_CRASH;
        const faction = this._selectFaction();

        const headline = this._fillTemplate(templates, {
            STATION: stationName,
            COMMODITY: commodity || 'commodities'
        });

        const body = isBoom ?
            `Demand dramatically outstrips available supply as buyers compete for limited inventory. Sellers commanding premium prices with room for negotiation limited. Traders rushing to capitalize.` :
            `Oversupply crashes market prices as warehouses overflow with unsold inventory. Buyers rejoice at rock-bottom rates while sellers scramble to minimize losses. Excellent buying opportunity.`;

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
                ? `Medical emergency declared in ${systemName} with disease spreading rapidly through population centers. Medicine supplies critically low and running out fast. Traders urged to deliver medical aid for substantial rewards.`
                : `Quarantine measures in effect as health authorities struggle to contain the outbreak. Medicine prices soaring astronomically as available supplies dwindle to critical levels. Emergency haulers already inbound with relief shipments.`;
            sourceColor = [255, 0, 255];
        } else {
            templateKey = isDistant ? 'CRISIS_FAMINE_DISTANT' : 'CRISIS_FAMINE';
            body = isDistant
                ? `Food shortage crisis escalates dramatically in ${systemName} as stores empty and panic spreads. Traders from across the sector redirecting cargo ships to deliver emergency supplies. Premium prices offered.`
                : `Catastrophic crop failures devastate local population as food rationing begins. Prices skyrocketing beyond reach of ordinary citizens. Emergency relief efforts underway with humanitarian convoys forming at nearby stations.`;
            sourceColor = [255, 150, 0];
        }

        const templates = HEADLINE_TEMPLATES[templateKey];
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

    // -------------------------------------------------------------------------
    // GALAXY-WIDE NEWS (Procedural)
    // -------------------------------------------------------------------------

    /**
     * Generate news from other systems in the galaxy
     */
    generateGalaxyNews(galaxy) {
        if (!galaxy || !galaxy.systems || galaxy.systems.length < 2) return;

        const now = Date.now();
        if (now - this.lastGalaxyNewsTime < this.galaxyNewsInterval) return;
        this.lastGalaxyNewsTime = now;

        // Pick a random system that isn't the current one
        const currentIdx = galaxy.currentSystemIndex;
        const candidates = galaxy.systems.filter((s, i) => i !== currentIdx && s);
        if (candidates.length === 0) return;

        const targetSystem = candidates[(Math.random() * candidates.length) | 0];
        const systemName = targetSystem.name || 'Distant Sector';

        const storyType = GALAXY_STORY_TYPES[(Math.random() * GALAXY_STORY_TYPES.length) | 0];
        const templates = HEADLINE_TEMPLATES[storyType];
        if (!templates) return;

        const faction = this._selectFaction();
        const headline = this._fillTemplate(templates, { SYSTEM: systemName });

        let body;
        switch (storyType) {
            case 'DISTANT_CONFLICT':
                body = `Reports of significant military action near ${systemName} continue to develop. Travel advisories issued for the region as civilian traffic diverted around combat zones. Diplomatic efforts underway.`;
                break;
            case 'DISTANT_DISCOVERY':
                body = `Scientists and explorers from across human space flock to ${systemName} to investigate the remarkable findings. Research vessels already en route. Exclusive rights negotiations ongoing.`;
                break;
            case 'DISTANT_TRADE':
                body = `Economic indicators strongly positive as ${systemName} emerges as a major trading hub. Savvy traders already repositioning their operations to capitalize on new opportunities. Commodity futures active.`;
                break;
            case 'DISTANT_DISASTER':
                body = `Emergency response teams from multiple systems dispatched to assist with humanitarian crisis. Casualty reports still coming in as rescue operations continue around the clock. Aid convoys forming.`;
                break;
            default:
                body = `Developing story from ${systemName} continues to unfold as reporters gather additional details. Check back for updates as more information becomes available from our correspondents on scene.`;
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
     * Generate background/flavor news using real in-game elements
     */
    generateBackgroundNews() {
        const shipNames = this._getShipNames();
        const pirateGangs = this._getPirateGangs();
        const commodities = NEWS_COMMODITIES;

        const shipName = shipNames[(Math.random() * shipNames.length) | 0];
        const pirateGang = pirateGangs[(Math.random() * pirateGangs.length) | 0];
        const commodity = commodities[(Math.random() * commodities.length) | 0];
        const pilotName = this._generateName();
        const titledName = this._generateTitledName();

        const template = BACKGROUND_STORY_TEMPLATES[(Math.random() * BACKGROUND_STORY_TEMPLATES.length) | 0];

        let headline = template[0]
            .split('{SHIP}').join(shipName)
            .split('{GANG}').join(pirateGang)
            .split('{COMMODITY}').join(commodity)
            .split('{PILOT}').join(pilotName)
            .split('{TITLED}').join(titledName);

        let body = template[1]
            .split('{ship}').join(shipName)
            .split('{gang}').join(pirateGang)
            .split('{commodity}').join(commodity)
            .split('{pilot}').join(pilotName);

        const faction = this._selectFaction();

        this._addNews({
            headline,
            body,
            source: faction.name,
            sourceColor: faction.color,
            category: NEWS_CATEGORY.BACKGROUND,
            priority: NEWS_PRIORITY.LOW
        });
    }

    // -------------------------------------------------------------------------
    // LEGACY SUPPORT
    // -------------------------------------------------------------------------

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
        const chosenFactionKey = NEWS_FACTION_KEYS[(Math.random() * NEWS_FACTION_KEYS.length) | 0];
        const faction = NEWS_FACTIONS[chosenFactionKey];

        let title = "BREAKING: SECTOR UPDATE";
        let body = data.text || "Developing story...";

        switch (data.type) {
            case 'PIRATE_SWARM':
            case 'PIRATE_RAID':
                title = this._fillTemplate(HEADLINE_TEMPLATES.PIRATE_HIGH, { SYSTEM: data.systemName || 'Local Sector' });
                body = BODY_TEMPLATES.PIRATE_HIGH[chosenFactionKey] || body;
                break;

            case 'MARKET_SHORTAGE':
                title = this._fillTemplate(HEADLINE_TEMPLATES.MARKET_BOOM, {
                    STATION: data.stationName || 'Station',
                    COMMODITY: data.commodity || 'goods'
                });
                body = `Shortage of ${data.commodity || 'goods'} reported at ${data.stationName || 'local station'}.`;
                break;

            case 'MARKET_SURPLUS':
            case 'MINING_BOOM':
                title = this._fillTemplate(HEADLINE_TEMPLATES.MARKET_CRASH, {
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

    // -------------------------------------------------------------------------
    // PUBLIC API
    // -------------------------------------------------------------------------

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
        // Calculate timeScale for probability scaling.
        const timeScale = (typeof deltaTime === 'number') ? deltaTime / 16.67 : 1;

        if (galaxy && Math.random() < 0.01 * timeScale) {
            this.generateGalaxyNews(galaxy);
        }
        if (Math.random() < 0.002 * timeScale) {
            this.generateBackgroundNews();
        }
    }
}
