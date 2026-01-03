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
    // --- Player Action Headlines (Covert/Anonymous) ---
    ASSASSINATION_SUCCESS: [
        "Notorious {TARGET} eliminated in daring strike",
        "Shadowy operative silences {TARGET}",
        "Contract fulfilled: {TARGET} meets violent end",
        "{TARGET} found dead amid debris field",
        "Bounty claimed on infamous {TARGET}",
        "Unknown assailant terminates {TARGET}",
        "{TARGET} assassinated in precision attack",
        "Professional hit leaves {TARGET} dead",
        "Masked avenger claims {TARGET}",
        "{TARGET} dies in suspected contract killing",
        "Ghost pilot ends {TARGET}'s reign",
        "Untraceable strike eliminates {TARGET}",
        "{TARGET} vanishes in flash of light",
        "Anonymous hunter collects on {TARGET}",
        "Clean kill: {TARGET} erased from existence"
    ],
    SABOTAGE_SUCCESS: [
        "Industrial sabotage rocks {LOCATION}",
        "Explosion destroys {TARGET} near {LOCATION}",
        "Infrastructure attack leaves {LOCATION} reeling",
        "Covert operation cripples {TARGET}",
        "Mysterious blast devastates {LOCATION} facility",
        "Unknown agents demolish {TARGET}",
        "Terror attack strikes {LOCATION}",
        "{TARGET} reduced to debris in {LOCATION}",
        "Saboteurs wreak havoc at {LOCATION}",
        "Anonymous strike cripples {LOCATION} operations",
        "Shadow war escalates: {TARGET} destroyed",
        "Insurgent action levels {TARGET}",
        "{LOCATION} counts cost of covert attack",
        "Unexplained explosion obliterates {TARGET}",
        "Guerrilla tactics claim {TARGET} at {LOCATION}"
    ],
    // --- Player Action Headlines (Praiseworthy) ---
    BOUNTY_PIRATE: [
        "Commander Jameson claims bounty on {COUNT} pirates",
        "Commander Jameson celebrates {COUNT} pirate kills",
        "Commander Jameson decimates marauder wing",
        "Commander Jameson deals major blow to piracy in {SYSTEM}",
        "{COUNT} raiders eliminated by Commander Jameson",
        "Hero pilot Commander Jameson bags {COUNT} pirates",
        "Commander Jameson: scourge of {SYSTEM} pirates",
        "Pirate hunters salute Commander Jameson's {COUNT} kills",
        "Commander Jameson clears {SYSTEM} of {COUNT} raiders",
        "{COUNT} buccaneer ships fall to Commander Jameson",
        "Commander Jameson's crusade claims {COUNT} more pirates",
        "Legendary pilot Commander Jameson strikes again",
        "Commander Jameson racks up {COUNT} pirate victories",
        "Bounty boards light up after Commander Jameson's rampage",
        "Commander Jameson: {COUNT} pirates, zero mercy"
    ],
    BOUNTY_POLICE: [
        "Rogue cop killer strikes again",
        "Authorities mourn {COUNT} fallen officers",
        "Vigilante violence claims {COUNT} police",
        "Law enforcement under siege",
        "Cop killer on the loose in {SYSTEM}",
        "Massacre: {COUNT} officers slain in {SYSTEM}",
        "Unknown assailant guns down {COUNT} deputies",
        "Badge-killer terrorizes {SYSTEM}",
        "Police manhunt intensifies after {COUNT} deaths",
        "{COUNT} officers dead in ambush attack",
        "Outlaw menace claims {COUNT} police lives",
        "Patrol ships destroyed: {COUNT} officers lost",
        "Deadly fugitive evades capture in {SYSTEM}",
        "{SYSTEM} reels from law enforcement massacre",
        "Cold-blooded attack leaves {COUNT} deputies dead"
    ],
    BOUNTY_ALIEN: [
        "Commander Jameson bags {COUNT} alien hostiles",
        "Commander Jameson pushes back alien menace in {SYSTEM}",
        "Commander Jameson neutralizes otherworldly threat",
        "Commander Jameson destroys {COUNT} alien craft",
        "Commander Jameson strikes back against xeno incursion",
        "Humanity's champion Jameson claims {COUNT} xeno kills",
        "Commander Jameson: defender against the unknown",
        "Xeno-hunter Jameson scores {COUNT} confirmed kills",
        "Commander Jameson repels alien assault in {SYSTEM}",
        "{COUNT} extraterrestrial vessels fall to Jameson",
        "Commander Jameson's alien tally reaches {COUNT}",
        "Earth's finest: Jameson annihilates {COUNT} alien ships",
        "Commander Jameson stands firm against xeno horde",
        "Interstellar hero Jameson racks up {COUNT} alien victories",
        "Commander Jameson: humanity's shield against the stars"
    ],
    POLICE_JOINED: [
        "Commander Jameson joins {SYSTEM} patrol",
        "Authorities welcome Commander Jameson to the force",
        "Commander Jameson sworn in as law enforcement",
        "Police welcome Commander Jameson to force",
        "Decorated pilot Jameson takes up badge in {SYSTEM}",
        "Commander Jameson answers call to serve in {SYSTEM}",
        "{SYSTEM} patrol bolstered by Commander Jameson",
        "New deputy: Commander Jameson joins the thin blue line",
        "Commander Jameson trades freelancing for law enforcement",
        "Veteran ace Jameson honored with {SYSTEM} commission",
        "Commander Jameson pledges to protect and serve",
        "Police chief welcomes Commander Jameson aboard"
    ],
    FACTION_JOINED: [
        "Commander Jameson swears allegiance to {FACTION}",
        "Commander Jameson joins {FACTION} ranks",
        "Commander Jameson pledges loyalty to {FACTION} cause",
        "Renowned pilot Jameson enlists with {FACTION}",
        "{FACTION} celebrates Commander Jameson's arrival",
        "Commander Jameson throws weight behind {FACTION}",
        "Major recruit: Jameson signs on with {FACTION}",
        "Commander Jameson declares for {FACTION}",
        "{FACTION} gains legendary ace Commander Jameson",
        "Commander Jameson answers {FACTION}'s call to arms"
    ],

    // --- Environmental Headlines ---
    PIRATE_HIGH: [
        "Pirate activity surges in {SYSTEM}",
        "Trade routes under siege by marauders",
        "Shipping lanes crawling with raiders",
        "Merchants warned: {SYSTEM} is hot",
        "Security firms overwhelmed by pirate wave",
        "Raider gangs terrorize {SYSTEM} freighters",
        "Piracy epidemic sweeps through {SYSTEM}",
        "Convoy attacks spike in lawless {SYSTEM}",
        "{SYSTEM} declared red zone for cargo haulers",
        "Insurance rates skyrocket as pirates ravage {SYSTEM}",
        "Buccaneers run rampant in ungoverned {SYSTEM}",
        "Merchants flee {SYSTEM} amid raider onslaught",
        "Smuggler's paradise: {SYSTEM} overrun by outlaws",
        "Patrol forces stretched thin as piracy explodes",
        "Trade guilds issue stern warning about {SYSTEM}"
    ],
    PIRATE_LOW: [
        "Trade flows freely in peaceful {SYSTEM}",
        "Piracy at record lows near {SYSTEM}",
        "Merchants celebrate quiet shipping lanes",
        "Security patrols report all clear",
        "Golden age for traders in {SYSTEM}",
        "{SYSTEM} enjoys unprecedented security",
        "Cargo runs smooth in crime-free {SYSTEM}",
        "Raiders scarce in well-patrolled {SYSTEM}",
        "Shipping insurance drops in safe {SYSTEM}",
        "Peace dividend: {SYSTEM} trade booms",
        "Pirate gangs abandon {SYSTEM} territory",
        "Merchants flock to secure {SYSTEM} routes",
        "Law and order prevails in {SYSTEM}",
        "{SYSTEM} rated safest trade corridor"
    ],
    MARKET_BOOM: [
        "Prices soar at {STATION}",
        "Commodity shortage drives {COMMODITY} prices up",
        "Traders rush to {STATION} for high margins",
        "Demand surge hits {STATION} markets",
        "{COMMODITY} fever grips {STATION}",
        "Bidding war erupts for {COMMODITY} at {STATION}",
        "{STATION} traders see record {COMMODITY} profits",
        "Gold rush atmosphere at {STATION} exchange",
        "{COMMODITY} prices hit all-time highs at {STATION}",
        "Speculators flood {STATION} chasing {COMMODITY}",
        "Supply crunch sends {COMMODITY} soaring",
        "{STATION} becomes hotspot for {COMMODITY} deals",
        "Merchants strike it rich on {COMMODITY} at {STATION}",
        "Price surge attracts haulers to {STATION}"
    ],
    MARKET_CRASH: [
        "Prices crash at {STATION}",
        "{COMMODITY} glut devastates local traders",
        "Oversupply tanks market at {STATION}",
        "Buying opportunity: {COMMODITY} dirt cheap",
        "{STATION} drowning in unsold {COMMODITY}",
        "Fire sale: {COMMODITY} prices collapse",
        "Traders dump {COMMODITY} at {STATION}",
        "{COMMODITY} bubble bursts at {STATION}",
        "Market meltdown hits {STATION} exchange",
        "{STATION} warehouses overflow with {COMMODITY}",
        "Bargain hunters descend on {STATION}",
        "{COMMODITY} worthless at flooded {STATION}",
        "Economic crisis looms as {COMMODITY} crashes",
        "Panic selling grips {STATION} markets"
    ],

    // --- Galaxy-Wide Headlines ---
    DISTANT_CONFLICT: [
        "War erupts in {SYSTEM} sector",
        "Imperial forces clash with rebels in {SYSTEM}",
        "Separatist uprising rocks {SYSTEM}",
        "Military buildup reported near {SYSTEM}",
        "Tensions escalate in {SYSTEM} quadrant",
        "Armed confrontation in {SYSTEM} turns deadly",
        "Battle stations: {SYSTEM} on war footing",
        "Conflict zone expands toward {SYSTEM}",
        "Warships mass in {SYSTEM} staging grounds",
        "Firefight erupts between factions in {SYSTEM}",
        "Blood spilled as rivals clash in {SYSTEM}",
        "{SYSTEM} becomes flashpoint for factional war",
        "Fleet engagement reported in {SYSTEM} space",
        "Diplomatic breakdown leads to {SYSTEM} hostilities",
        "Violence flares in disputed {SYSTEM} territory"
    ],
    DISTANT_DISCOVERY: [
        "Explorers report anomaly near {SYSTEM}",
        "Mysterious signal detected from {SYSTEM}",
        "New hyperspace route found to {SYSTEM}",
        "Scientists baffled by {SYSTEM} phenomenon",
        "Strange readings emanate from {SYSTEM}",
        "Uncharted phenomenon discovered in {SYSTEM}",
        "Survey team finds oddity near {SYSTEM}",
        "Enigmatic object spotted in {SYSTEM} space",
        "{SYSTEM} yields startling new discovery",
        "Research vessel investigates {SYSTEM} anomaly",
        "Unexplained activity detected in {SYSTEM}",
        "Frontier scouts report breakthrough in {SYSTEM}",
        "Ancient artifact uncovered in {SYSTEM}",
        "Scientific community buzzing about {SYSTEM} find"
    ],
    DISTANT_TRADE: [
        "New trade agreement benefits {SYSTEM}",
        "{SYSTEM} opens markets to foreign traders",
        "Economic boom transforms {SYSTEM}",
        "Luxury goods flooding into {SYSTEM}",
        "Trade delegation arrives in {SYSTEM}",
        "{SYSTEM} economy surging with new deals",
        "Merchant guilds expand operations to {SYSTEM}",
        "Prosperity wave reaches {SYSTEM}",
        "{SYSTEM} becomes trade hub powerhouse",
        "Credits flowing freely in booming {SYSTEM}",
        "Commercial renaissance transforms {SYSTEM}",
        "Investment rush sweeps through {SYSTEM}",
        "{SYSTEM} signs lucrative export contracts",
        "New shipping lanes boost {SYSTEM} commerce"
    ],
    DISTANT_DISASTER: [
        "Catastrophe strikes {SYSTEM}",
        "Station disaster claims lives in {SYSTEM}",
        "Asteroid impact devastates {SYSTEM} colony",
        "Plague outbreak reported in {SYSTEM}",
        "Tragedy unfolds in {SYSTEM}",
        "Emergency declared after {SYSTEM} disaster",
        "Rescue teams rush to stricken {SYSTEM}",
        "{SYSTEM} reels from devastating accident",
        "Death toll rises in {SYSTEM} calamity",
        "Humanitarian crisis grips {SYSTEM}",
        "Survivors sought after {SYSTEM} catastrophe",
        "{SYSTEM} infrastructure crippled by disaster",
        "Relief efforts underway in {SYSTEM}",
        "Mourning across {SYSTEM} after tragedy"
    ],

    // --- War Event Headlines ---
    WAR_SKIRMISH: [
        "[SWORDS] Military skirmish erupts in {SYSTEM}",
        "[SWORDS] Armed conflict breaks out near {SYSTEM}",
        "[SWORDS] Faction forces clash in {SYSTEM} sector",
        "[SWORDS] Border skirmish reported in {SYSTEM}",
        "[SWORDS] Hostile engagement detected in {SYSTEM}",
        "[SWORDS] Patrol units exchange fire in {SYSTEM}",
        "[SWORDS] Tense standoff turns violent in {SYSTEM}",
        "[SWORDS] Minor battle flares up in {SYSTEM}",
        "[SWORDS] Shots fired in disputed {SYSTEM} space",
        "[SWORDS] Rival squadrons engage in {SYSTEM}",
        "[SWORDS] Limited combat reported in {SYSTEM}",
        "[SWORDS] Skirmish leaves casualties in {SYSTEM}",
        "[SWORDS] Frontier violence erupts in {SYSTEM}",
        "[SWORDS] Armed encounter in {SYSTEM} corridor",
        "[SWORDS] Flashpoint battle in {SYSTEM} territory"
    ],
    WAR_FULL: [
        "[FIRE] Full scale war erupts in {SYSTEM}",
        "[FIRE] All-out conflict engulfs {SYSTEM}",
        "[FIRE] Massive battle underway in {SYSTEM}",
        "[FIRE] War declared in {SYSTEM} sector",
        "[FIRE] Sector-wide hostilities begin in {SYSTEM}",
        "[FIRE] Total war consumes {SYSTEM}",
        "[FIRE] Fleets clash in epic {SYSTEM} battle",
        "[FIRE] {SYSTEM} becomes warzone",
        "[FIRE] Devastating offensive launched in {SYSTEM}",
        "[FIRE] Open warfare rages across {SYSTEM}",
        "[FIRE] Major military campaign begins in {SYSTEM}",
        "[FIRE] {SYSTEM} torn apart by factional war",
        "[FIRE] Armada deploys to {SYSTEM} theater",
        "[FIRE] Brutal combat escalates in {SYSTEM}",
        "[FIRE] {SYSTEM} ablaze with widespread conflict"
    ],

    // --- Crisis Event Headlines ---
    CRISIS_PLAGUE: [
        "[SKULL] Deadly plague outbreak in {SYSTEM}",
        "[SKULL] Contagion spreads across {SYSTEM}",
        "[SKULL] Medical emergency: Plague ravages {SYSTEM}",
        "[SKULL] Quarantine declared in {SYSTEM}",
        "[SKULL] Disease outbreak overwhelms {SYSTEM} hospitals",
        "[SKULL] Pandemic grips {SYSTEM} population",
        "[SKULL] Death toll mounts in {SYSTEM} plague",
        "[SKULL] Viral horror sweeps through {SYSTEM}",
        "[SKULL] {SYSTEM} stations locked down by disease",
        "[SKULL] Authorities scramble to contain {SYSTEM} outbreak",
        "[SKULL] Bodies pile up as plague consumes {SYSTEM}",
        "[SKULL] Medicine shortages worsen {SYSTEM} crisis",
        "[SKULL] Infected ships spread disease from {SYSTEM}",
        "[SKULL] {SYSTEM} becomes plague epicenter",
        "[SKULL] Desperate plea for medical aid from {SYSTEM}"
    ],
    CRISIS_FAMINE: [
        "[FAMINE] Severe famine grips {SYSTEM}",
        "[FAMINE] Food crisis devastates {SYSTEM}",
        "[FAMINE] Crop failures cause mass starvation in {SYSTEM}",
        "[FAMINE] Food shortage emergency in {SYSTEM}",
        "[FAMINE] Hunger crisis spreads across {SYSTEM}",
        "[FAMINE] Starvation stalks {SYSTEM} colonies",
        "[FAMINE] {SYSTEM} food reserves exhausted",
        "[FAMINE] Riots erupt over scarce food in {SYSTEM}",
        "[FAMINE] Mass exodus as {SYSTEM} faces starvation",
        "[FAMINE] Emergency rations deployed to {SYSTEM}",
        "[FAMINE] Children dying in {SYSTEM} famine",
        "[FAMINE] Agricultural collapse dooms {SYSTEM}",
        "[FAMINE] Desperate {SYSTEM} begs for food aid",
        "[FAMINE] Humanitarian disaster unfolds in {SYSTEM}",
        "[FAMINE] {SYSTEM} population faces extinction-level hunger"
    ],
    CRISIS_PLAGUE_DISTANT: [
        "[SKULL] Plague outbreak spreads to {SYSTEM}",
        "[SKULL] Neighboring system {SYSTEM} affected by contagion",
        "[SKULL] Disease reaches {SYSTEM} from nearby outbreak",
        "[SKULL] Quarantine fails: plague hits {SYSTEM}",
        "[SKULL] {SYSTEM} reports first plague cases",
        "[SKULL] Infection vector traced to {SYSTEM}",
        "[SKULL] Border closures fail to protect {SYSTEM}",
        "[SKULL] {SYSTEM} braces for incoming pandemic",
        "[SKULL] Secondary outbreak confirmed in {SYSTEM}",
        "[SKULL] Plague spreads despite {SYSTEM} precautions"
    ],
    CRISIS_FAMINE_DISTANT: [
        "[FAMINE] Famine conditions worsen in {SYSTEM}",
        "[FAMINE] Food crisis spreads to {SYSTEM}",
        "[FAMINE] {SYSTEM} suffers from regional crop failures",
        "[FAMINE] Hunger spills over into {SYSTEM}",
        "[FAMINE] {SYSTEM} food supplies dwindling fast",
        "[FAMINE] Refugees flood {SYSTEM} fleeing famine",
        "[FAMINE] {SYSTEM} stockpiles raided by starving mobs",
        "[FAMINE] Regional blight threatens {SYSTEM} harvests",
        "[FAMINE] {SYSTEM} drawn into widening food crisis",
        "[FAMINE] Shortages hit {SYSTEM} as crisis expands"
    ],

    // --- Combat Report Headlines ---
    COMBAT_PIRATE_KILLS: [
        "Pirate fleet decimated in {SYSTEM}",
        "{COUNT} raiders destroyed in {SYSTEM} skirmish",
        "Major pirate losses in {SYSTEM}: {NAME} among the fallen",
        "Raider gang obliterated in {SYSTEM} ambush",
        "Pirate armada shattered near {SYSTEM}",
        "{COUNT} buccaneer ships blown apart in {SYSTEM}",
        "Criminal fleet wiped out in {SYSTEM} engagement",
        "Marauders suffer crushing defeat in {SYSTEM}",
        "Pirate stronghold crumbles: {COUNT} killed in {SYSTEM}",
        "Outlaw {NAME} meets end in {SYSTEM} firefight",
        "Raider casualties mount in {SYSTEM} crackdown",
        "{COUNT} pirate vessels reduced to scrap in {SYSTEM}",
        "Major blow to piracy: {NAME} killed in {SYSTEM}"
    ],
    COMBAT_POLICE_CASUALTIES: [
        "Law enforcement takes casualties in {SYSTEM}",
        "Officer {NAME} killed in {SYSTEM} violence",
        "{COUNT} officers fall in line of duty",
        "Police patrol ambushed in {SYSTEM}",
        "Badge count rises: {COUNT} deputies dead in {SYSTEM}",
        "Officer {NAME} dies heroically in {SYSTEM}",
        "Law enforcement mourns {COUNT} lost in {SYSTEM}",
        "Police forces suffer heavy losses in {SYSTEM}",
        "{COUNT} patrol ships destroyed in {SYSTEM} attack",
        "Deputy {NAME} among {COUNT} casualties in {SYSTEM}",
        "Thin blue line broken: {COUNT} dead in {SYSTEM}",
        "Memorial service planned for {SYSTEM} officers",
        "Police sacrifice: {NAME} gives life protecting {SYSTEM}"
    ],
    COMBAT_IMPERIAL_LOSSES: [
        "Imperial forces suffer setback in {SYSTEM}",
        "{COUNT} Imperial vessels lost in {SYSTEM}",
        "Military casualties mount in {SYSTEM}",
        "Imperial fleet takes beating in {SYSTEM}",
        "{COUNT} Navy ships destroyed in {SYSTEM} action",
        "Imperial command mourns losses in {SYSTEM}",
        "Military operation goes wrong: {COUNT} lost in {SYSTEM}",
        "Empire bleeds in {SYSTEM}: {COUNT} casualties",
        "Imperial pilots fall in {SYSTEM} engagement",
        "{COUNT} warships downed in {SYSTEM} battle",
        "Navy suffers {COUNT} losses in {SYSTEM} offensive",
        "Imperial {NAME} among {COUNT} killed in {SYSTEM}",
        "Heavy toll for Empire in {SYSTEM} campaign"
    ],
    COMBAT_SEPARATIST_LOSSES: [
        "Separatist cells crushed in {SYSTEM}",
        "Rebel forces take heavy losses in {SYSTEM}",
        "{COUNT} resistance fighters eliminated in {SYSTEM}",
        "Insurgent base destroyed in {SYSTEM}",
        "Separatist casualties mount: {COUNT} dead in {SYSTEM}",
        "Rebel {NAME} among {COUNT} killed in {SYSTEM}",
        "Resistance crumbles in {SYSTEM}: {COUNT} losses",
        "{COUNT} insurgent ships destroyed in {SYSTEM}",
        "Separatist offensive stalls: heavy casualties in {SYSTEM}",
        "Rebel cell leadership decapitated in {SYSTEM}",
        "Revolutionary forces decimated in {SYSTEM}",
        "{COUNT} freedom fighters fall in {SYSTEM} battle",
        "Separatist dreams die in {SYSTEM}: {COUNT} casualties"
    ],
    COMBAT_ALIEN_KILLS: [
        "Alien threat repelled in {SYSTEM}",
        "{COUNT} xeno hostiles neutralized in {SYSTEM}",
        "Humanity strikes back in {SYSTEM}",
        "Alien incursion crushed in {SYSTEM}",
        "{COUNT} extraterrestrial vessels destroyed in {SYSTEM}",
        "Xeno menace pushed back from {SYSTEM}",
        "Alien armada shattered in {SYSTEM} defense",
        "{COUNT} otherworldly hostiles eliminated in {SYSTEM}",
        "Human forces triumph over aliens in {SYSTEM}",
        "Xeno casualties: {COUNT} craft destroyed in {SYSTEM}",
        "Alien invasion force annihilated in {SYSTEM}",
        "{COUNT} alien kills confirmed in {SYSTEM} battle",
        "Humanity's defenders destroy {COUNT} xenos in {SYSTEM}"
    ],

    // --- Hero Headlines ---
    HERO_IMPERIAL: [
        "[MEDAL] Hero of the Imperium: {NAME} claims {COUNT} kills in {SYSTEM}",
        "[MEDAL] Imperial ace {NAME} devastates enemies in {SYSTEM}",
        "[MEDAL] Decorated pilot {NAME} dominates {SYSTEM} skies",
        "[MEDAL] {NAME} awarded Imperial Cross after {COUNT} victories",
        "[MEDAL] Unstoppable {NAME} racks up {COUNT} kills for Empire",
        "[MEDAL] Imperial champion {NAME} crushes opposition in {SYSTEM}",
        "[MEDAL] {NAME} becomes legend after {COUNT} kills in {SYSTEM}",
        "[MEDAL] Navy ace {NAME} annihilates {COUNT} hostiles in {SYSTEM}",
        "[MEDAL] {NAME} honored for {COUNT} kills in defense of {SYSTEM}",
        "[MEDAL] Imperial hero {NAME} claims glory in {SYSTEM}",
        "[MEDAL] Ace pilot {NAME}: {COUNT} confirmed kills in {SYSTEM}",
        "[MEDAL] {NAME} earns highest honors after {SYSTEM} rampage"
    ],
    HERO_SEPARATIST: [
        "[FIST] Hero of the Resistance: {NAME} strikes back in {SYSTEM}",
        "[FIST] Freedom fighter {NAME} downs {COUNT} Imperial craft",
        "[FIST] Rebel ace {NAME} terrorizes Imperial forces",
        "[FIST] {NAME} becomes legend of the resistance in {SYSTEM}",
        "[FIST] Revolutionary hero {NAME} claims {COUNT} victories",
        "[FIST] {NAME} liberates {SYSTEM} skies with {COUNT} kills",
        "[FIST] Separatist champion {NAME} humiliates Empire in {SYSTEM}",
        "[FIST] {NAME} celebrated after {COUNT} kills against tyranny",
        "[FIST] Resistance icon {NAME} strikes fear in {SYSTEM}",
        "[FIST] Freedom's champion {NAME} racks up {COUNT} Imperial kills",
        "[FIST] Rebel legend {NAME} dominates {SYSTEM} battlefield",
        "[FIST] {NAME} hailed as hero after {COUNT} victories in {SYSTEM}"
    ],
    HERO_POLICE: [
        "[SHIELD] Police hero: Officer {NAME} neutralizes {COUNT} threats",
        "[SHIELD] Deputy {NAME} clears {SYSTEM} of pirate menace",
        "[SHIELD] Law enforcement ace {NAME} keeps the peace",
        "[SHIELD] Officer {NAME} honored for {COUNT} arrests in {SYSTEM}",
        "[SHIELD] {NAME} promoted after {COUNT} criminal takedowns",
        "[SHIELD] Deputy {NAME} becomes {SYSTEM}'s most decorated officer",
        "[SHIELD] Police legend {NAME} claims {COUNT} busts in {SYSTEM}",
        "[SHIELD] Officer {NAME}: {COUNT} criminals stopped in {SYSTEM}",
        "[SHIELD] Hero cop {NAME} single-handedly cleans up {SYSTEM}",
        "[SHIELD] Badge of honor: {NAME} racks up {COUNT} interdictions",
        "[SHIELD] {NAME} awarded Medal of Valor for {SYSTEM} heroics",
        "[SHIELD] Officer {NAME} restores order with {COUNT} arrests"
    ],
    HERO_MILITARY: [
        "[STAR] Military ace {NAME} racks up {COUNT} victories",
        "[STAR] Decorated pilot {NAME} dominates {SYSTEM}",
        "[STAR] Combat legend {NAME} adds to kill count",
        "[STAR] {NAME} becomes top ace with {COUNT} kills in {SYSTEM}",
        "[STAR] Military hero {NAME} earns {COUNT} confirmed victories",
        "[STAR] Ace {NAME} unstoppable in {SYSTEM}: {COUNT} kills",
        "[STAR] {NAME} awarded Distinguished Flying Cross for {SYSTEM}",
        "[STAR] Combat champion {NAME} devastates hostiles in {SYSTEM}",
        "[STAR] Pilot {NAME} enters hall of fame with {COUNT} victories",
        "[STAR] Military legend: {NAME} claims {COUNT} kills in {SYSTEM}",
        "[STAR] Top gun {NAME} dominates with {COUNT} confirmed kills",
        "[STAR] {NAME} becomes most feared pilot in {SYSTEM}"
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
    // Ship stories (0-9)
    ['{SHIP} production hits record numbers', 'Shipyards across the sector report unprecedented demand for the {ship} as buyers rush to secure delivery slots. Manufacturing facilities operating at maximum capacity with waitlists extending well into the next quarter.'],
    ['Celebrity pilot {PILOT} endorses {SHIP}', 'Pre-orders for the {ship} exceed all expectations after famous combat ace {pilot} publicly praised its handling characteristics and combat performance. Dealers report showroom traffic has tripled since the endorsement.'],
    ['{SHIP} recall issued', 'Manufacturer issues voluntary recall affecting recent {ship} production runs citing minor thruster calibration issues discovered during routine quality testing. Owners advised to visit authorized service centers for free inspection and adjustment.'],
    ['New {SHIP} variant unveiled', 'Prototype {ship} variant featuring enhanced cargo capacity and improved jump range impresses at industry showcase. Test pilots report exceptional performance metrics. Mass production expected to begin within months.'],
    ['{SHIP} wins combat trials', 'Fleet evaluation trials conclude with {ship} outperforming competitors in simulated combat scenarios. Military procurement officers impressed by weapon mount flexibility and shield recharge rates. Major contract expected.'],
    ['{SHIP} price drops after factory expansion', 'New manufacturing facility brings {ship} costs down significantly. Budget-conscious pilots celebrate access to previously premium vessel. Market analysts predict surge in sales across frontier systems.'],
    ['Legendary {SHIP} goes to auction', 'Famous ship with storied combat history attracts bidders from across the galaxy. Previous owner {pilot} retired after decades of service. Winning bid expected to shatter records for vintage vessels.'],
    ['{SHIP} modifications prove popular', 'Aftermarket upgrades for {ship} flying off dealer shelves. Performance enthusiasts swap tips on optimal configurations. Manufacturers struggle to keep pace with component demand.'],
    ['Racing champion switches to {SHIP}', 'Controversial decision by top racer to abandon previous vessel for {ship} sparks debate. Team engineers confident in speed potential. Rivals dismissive but clearly nervous.'],
    ['{SHIP} theft ring busted', 'Coordinated police action dismantles operation stealing {ship} vessels from station hangars. Dozens of stolen ships recovered. Owners urged to update security codes immediately.'],
    // Pirate stories (10-19)
    ['{GANG} activity drops sharply', 'Intelligence analysts suggest internal power struggle within the {gang} has disrupted their operations significantly. Traders report quieter shipping lanes as the criminal organization deals with leadership disputes.'],
    ['{GANG} leader spotted', 'Unconfirmed reports place the notorious {gang} commander near frontier system outposts. Bounty hunters mobilizing to intercept. Authorities urge civilians to report any sightings immediately while avoiding direct contact.'],
    ['Bounty hunters target {GANG}', 'Coordinated multi-system bounty operation launches against {gang} cells with significant financial backing from shipping corporations. Premium rates offered for verified eliminations. Hunters gathering at staging areas.'],
    ['{GANG} demands protection fees', 'Station operators in outer systems report escalating extortion attempts by {gang} operatives threatening cargo interdiction. Security consultants recommend enhanced escort protocols for valuable shipments.'],
    ['{GANG} splinters after leadership dispute', 'Criminal organization fractures as rival factions vie for control. Violence between former allies disrupts previously coordinated operations. Opportunistic arrests made during chaos.'],
    ['{GANG} recruits aggressively', 'Reports indicate {gang} expanding recruitment efforts among desperate populations. Economic downturn blamed for swelling pirate ranks. Authorities warn young pilots against criminal temptation.'],
    ['{GANG} hideout raided', 'Military strike force descends on suspected {gang} base. Casualties on both sides reported. Captured supplies include weapons and stolen cargo. Leaders escaped but are being pursued.'],
    ['{GANG} releases hostages', 'Kidnapping victims returned after ransom negotiations conclude. Negotiations mediated by neutral parties. Families express relief while authorities vow continued pursuit of perpetrators.'],
    ['{GANG} attacks convoy', 'Heavily defended cargo convoy ambushed by coordinated {gang} assault. Several escort ships destroyed before reinforcements arrived. Losses estimated in millions. Investigation underway.'],
    ['Former {GANG} member turns informant', 'Defector provides authorities with detailed intelligence on criminal operations. Arrests expected as information is verified. Protected witness location kept secret amid death threats.'],
    // Commodity stories (20-29)
    ['{COMMODITY} prices stabilize', 'After weeks of dramatic price volatility driven by supply disruptions, {commodity} markets finally find equilibrium. Traders cautiously optimistic as futures contracts normalize across major exchanges.'],
    ['New {COMMODITY} trade route discovered', 'Explorers map highly efficient hyperspace corridor connecting previously isolated {commodity} producers to major markets. Transportation costs expected to drop significantly. Shipping volumes already increasing.'],
    ['{COMMODITY} shortage feared', 'Supply chain analysts warn of potential {commodity} deficit in coming months as production facilities struggle with aging infrastructure. Stockpiling reported by major distributors. Prices trending upward.'],
    ['{COMMODITY} smuggling ring exposed', 'Coordinated law enforcement operation dismantles sophisticated smuggling network moving illegal {commodity} shipments through frontier systems. Multiple arrests made. Seized cargo valued in millions.'],
    ['{COMMODITY} demand surges unexpectedly', 'Market analysts scramble to explain sudden spike in {commodity} purchases. Speculation ranges from military stockpiling to new industrial applications. Traders rushing to capitalize before prices peak.'],
    ['{COMMODITY} quality concerns raised', 'Consumer advocacy groups warn of substandard {commodity} flooding markets from unregulated producers. Buyers urged to verify source authenticity. Legitimate suppliers report increased inquiries.'],
    ['New {COMMODITY} source discovered', 'Survey team locates rich {commodity} deposits in previously unexplored region. Rush of prospectors expected. Environmental impact assessments waived to accelerate development. Critics voice concerns.'],
    ['{COMMODITY} futures trading suspended', 'Exchange halts trading amid allegations of market manipulation. Investigation focuses on coordinated buying patterns. Traders left in limbo as prices frozen pending resolution.'],
    ['{COMMODITY} tariffs spark trade dispute', 'Import duties on {commodity} trigger retaliatory measures from affected systems. Diplomatic efforts underway to resolve escalating trade war. Consumers face higher prices in meantime.'],
    ['{COMMODITY} production revolutionized', 'Breakthrough manufacturing process promises to slash {commodity} costs dramatically. Traditional producers face obsolescence. Investors rush to back new technology while workers fear displacement.'],
    // NPC stories (30-39)
    ['{TITLED} announces retirement', 'After decades of distinguished service shaping interstellar policy, the decorated official steps down amid elaborate ceremony. Successor appointment expected within weeks. Legacy includes landmark trade agreements.'],
    ['{TITLED} calls for reform', 'Controversial speech delivered to packed assembly hall demands sweeping changes to outdated trade regulations. Reactions sharply divided along factional lines. Protests and counter-protests reported at government buildings.'],
    ['Pilot {PILOT} sets new record', 'Racing circuit achievement celebrated as {pilot} completes fastest hyperspace corridor run in sector history. Previous record stood for over a decade. Sponsors announce substantial bonus payments.'],
    ['{PILOT} survives alien encounter', 'Lone pilot {pilot} escapes Thargoid ambush against overwhelming odds in tale of survival inspiring bounty hunters and military pilots across human space. Interview requests flooding in from media outlets.'],
    ['{TITLED} under investigation', 'Allegations of corruption rock government as prominent figure faces scrutiny. Documents suggest improper financial dealings. Supporters cry political witch hunt while critics demand accountability.'],
    ['{PILOT} rescues stranded crew', 'Heroic pilot {pilot} braves hazardous conditions to save crew of disabled vessel. All hands recovered alive despite deteriorating life support. Dramatic footage circulating widely on social networks.'],
    ['{TITLED} announces ambitious initiative', 'Bold new program promises economic revitalization for struggling frontier communities. Critics question feasibility while supporters hail visionary leadership. Funding sources remain undisclosed.'],
    ['{PILOT} joins racing team', 'Rising star {pilot} signs with premier racing organization after impressive independent season. Team hopes fresh talent will reverse recent performance slump. Fans debate potential impact.'],
    ['{TITLED} visits disaster zone', 'High-profile official tours affected areas to assess damage and coordinate relief. Photo opportunities criticized by some as political theater. Emergency funds released following visit.'],
    ['{PILOT} writes bestselling memoir', 'Autobiography by legendary combat veteran {pilot} tops sales charts. Candid accounts of famous battles and personal struggles resonate with readers. Film adaptation rumored in development.'],
    // Static flavor stories (40-59)
    ['Imperial Clipper luxury cruise departs', 'VIP passengers embark on exclusive multi-system tour aboard the prestigious vessel. Security detail exceeds standard protocols with military escort through less secure regions. Passenger manifest includes notable celebrities.'],
    ['Separatist rally draws thousands', 'Frontier colony hosts largest political gathering in years as supporters demand greater autonomy from core world governance. Imperial observers maintain careful distance while monitoring communications. Speeches broadcast widely.'],
    ['Military exercises begin near frontier', 'Combined naval forces conduct extensive training operations involving hundreds of vessels. Civilian traffic rerouted during maneuvers. Officials describe exercises as routine preparedness drills. Critics question timing.'],
    ['Thargoid activity monitoring station upgraded', 'New long-range sensors provide dramatically enhanced detection capabilities for alien vessel movements. Military officials express confidence in improved early warning systems. Defense contractors celebrate major contract.'],
    ['Starliner cruiser completes maiden voyage', 'Passengers disembarking from flagship tourism vessel report exceptional amenities and flawless service. Booking requests surge for upcoming voyages. Industry analysts predict tourism sector growth.'],
    ['Mining boom transforms asteroid belt', 'Independent prospectors and corporate operations flock to newly discovered Rare Ore deposits. Boom town atmosphere develops around makeshift stations. Environmental concerns raised about extraction pace.'],
    ['Police Viper squadron receives commendation', 'Officers formally recognized for exceptional service protecting vital trade lanes from pirate incursions. Ceremony attended by sector governor. Decorated pilots credited with dozens of criminal interdictions.'],
    ['Cobra Mk III remains best-selling multi-role', 'Venerable design continues to dominate versatility rankings across all sectors despite newer competition. Manufacturers attribute success to proven reliability and extensive modification options. Sales remain strong.'],
    ['Refugee crisis strains border systems', 'Thousands flee conflict zones seeking safety in stable territories. Reception facilities overwhelmed as arrivals exceed capacity. Humanitarian organizations appeal for donations and volunteers.'],
    ['Ancient derelict discovered drifting', 'Survey expedition locates mysterious vessel of unknown origin. Initial scans suggest technology predating human spaceflight. Research teams dispatched to investigate while military maintains perimeter.'],
    ['Entertainment complex opens on station', 'Residents celebrate inauguration of massive leisure facility featuring gaming, dining, and recreation. Economic boost expected for local businesses. Opening night crowds exceed all projections.'],
    ['Labor shortage hits shipyard industry', 'Skilled workers in high demand as manufacturers struggle to meet order backlog. Wages rising across sector as companies compete for talent. Training programs expanding to address gap.'],
    ['Archaeological dig yields artifacts', 'Excavation uncovers evidence of ancient civilization on remote world. Academic community excited by implications for galactic history. Funding secured for expanded research operations.'],
    ['Weather satellite network expanded', 'New orbital platforms improve forecasting accuracy for agricultural worlds. Farmers express gratitude for reduced crop losses. Investment pays dividends in food security for millions.'],
    ['Veteran pilots association holds reunion', 'Former military aviators gather to honor fallen comrades and share stories. Emotional ceremony features memorial flights. Younger generation pilots attend to learn from legends.'],
    ['Deep space listening post goes online', 'Cutting-edge facility begins monitoring previously unexplored regions for signals of intelligence. Scientists cautiously optimistic about detection possibilities. First data transmissions eagerly awaited.'],
    ['Trade union threatens strike action', 'Dockworkers demand improved conditions and higher wages. Negotiations stalled as management refuses key concessions. Cargo delays possible if dispute not resolved quickly.'],
    ['Medical breakthrough announced', 'Research team develops treatment for previously incurable condition. Clinical trials show remarkable success rates. Pharmaceutical companies racing to secure production rights.'],
    ['Hyperspace route survey completed', 'Mapping expedition returns after months charting new corridors between systems. Data promises to cut travel times significantly. Shipping companies eagerly await official route certification.'],
    ['Station expansion project approved', 'Governing council authorizes major infrastructure investment. New docking bays and residential sections planned. Construction jobs will boost local economy for years.']
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

        // Binary search for insert position (sorted by timestamp desc - newest first)
        // Priority is kept for visual styling only (badges, colors), not sort order
        const items = this.newsItems;
        const len = items.length;
        if (len === 0) {
            items.push(newItem);
        } else {
            let low = 0, high = len;
            const newTime = newItem.timestamp;
            while (low < high) {
                const mid = (low + high) >>> 1;
                const midItem = items[mid];
                // Sort purely by timestamp (newest first)
                if (midItem.timestamp >= newTime) {
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
    // -------------------------------------------------------------------------
    // PERSISTENCE
    // -------------------------------------------------------------------------

    toJSON() {
        return {
            newsItems: this.newsItems,
            recentNewsHashes: Array.from(this.recentNewsHashes),
            lastGalaxyNewsTime: this.lastGalaxyNewsTime,
            lastCombatReportTime: this.lastCombatReportTime,
            lastHeroReportTime: this.lastHeroReportTime
        };
    }

    fromJSON(data) {
        if (!data) return;

        if (Array.isArray(data.newsItems)) {
            this.newsItems = data.newsItems;
        }

        if (Array.isArray(data.recentNewsHashes)) {
            this.recentNewsHashes = new Set(data.recentNewsHashes);
        }

        if (typeof data.lastGalaxyNewsTime === 'number') this.lastGalaxyNewsTime = data.lastGalaxyNewsTime;
        if (typeof data.lastCombatReportTime === 'number') this.lastCombatReportTime = data.lastCombatReportTime;
        if (typeof data.lastHeroReportTime === 'number') this.lastHeroReportTime = data.lastHeroReportTime;
    }
}
