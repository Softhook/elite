// Handles contextual chatter between hostile NPCs and the player.
class CommunicationSystem {
    constructor() {
        this.uiManager = null;
        this.player = null;
        this.defaultChance = 0.55;
        this.defaultCooldownMs = 15000;
        this._enemyCooldowns = new Map();
        this._globalCooldownMs = 2000;
        this._lastGlobalMessageTime = -Infinity;
        this._playerTitle = "Commander";

        // Speech synthesis properties
        this._speechQueue = [];           // Queue of messages to speak
        this._isSpeaking = false;         // Lock to prevent overlapping speech
        this._voiceByEnemy = new Map();   // Cache voice profile per enemy for consistency
        this._speech = null;              // p5.Speech instance (initialized later)
        this._speechEnabled = true;       // Master toggle for speech

        // Cached voice pools by language/region (built when voices load)
        this._voicePools = null;          // { us: [], uk: [], ru: [], nonEnglish: [], all: [] }

        // Role-based voice profiles: pitch and rate ranges for different AI roles
        // Pitch: 0.01-2.0, Rate: 0.1-2.0 (browser limits)
        this._roleVoiceProfiles = {
            // Pirates: rougher, gruffer voices
            'Pirate': {
                male: { pitchMin: 0.6, pitchMax: 0.85, rateMin: 1.0, rateMax: 1.15 },
                female: { pitchMin: 0.85, pitchMax: 1.05, rateMin: 1.0, rateMax: 1.15 }
            },
            // Police: authoritative, clear
            'Police': {
                male: { pitchMin: 0.85, pitchMax: 1.0, rateMin: 0.9, rateMax: 1.0 },
                female: { pitchMin: 1.0, pitchMax: 1.2, rateMin: 0.9, rateMax: 1.0 }
            },
            // Imperial: deep, commanding, measured
            'IMPERIAL': {
                male: { pitchMin: 0.55, pitchMax: 0.75, rateMin: 0.8, rateMax: 0.95 },
                female: { pitchMin: 0.85, pitchMax: 1.0, rateMin: 0.8, rateMax: 0.95 }
            },
            // Separatist: passionate, faster
            'SEPARATIST': {
                male: { pitchMin: 0.9, pitchMax: 1.1, rateMin: 1.05, rateMax: 1.2 },
                female: { pitchMin: 1.05, pitchMax: 1.25, rateMin: 1.05, rateMax: 1.2 }
            },
            // Military: professional, calm
            'MILITARY': {
                male: { pitchMin: 0.8, pitchMax: 0.95, rateMin: 0.9, rateMax: 1.0 },
                female: { pitchMin: 1.0, pitchMax: 1.15, rateMin: 0.9, rateMax: 1.0 }
            },
            // Combat (generic): slightly aggressive
            'Combat': {
                male: { pitchMin: 0.75, pitchMax: 0.95, rateMin: 0.95, rateMax: 1.1 },
                female: { pitchMin: 0.95, pitchMax: 1.15, rateMin: 0.95, rateMax: 1.1 }
            },
            // Guard: protective, firm
            'Guard': {
                male: { pitchMin: 0.8, pitchMax: 0.95, rateMin: 0.9, rateMax: 1.0 },
                female: { pitchMin: 1.0, pitchMax: 1.15, rateMin: 0.9, rateMax: 1.0 }
            },
            // Hauler/Transport: casual, varied
            'Hauler': {
                male: { pitchMin: 0.9, pitchMax: 1.1, rateMin: 0.9, rateMax: 1.1 },
                female: { pitchMin: 1.0, pitchMax: 1.2, rateMin: 0.9, rateMax: 1.1 }
            },
            'Transport': {
                male: { pitchMin: 0.9, pitchMax: 1.1, rateMin: 0.9, rateMax: 1.1 },
                female: { pitchMin: 1.0, pitchMax: 1.2, rateMin: 0.9, rateMax: 1.1 }
            },
            // Repair: calm, patient, slightly exasperated
            'Repair': {
                male: { pitchMin: 0.9, pitchMax: 1.05, rateMin: 0.85, rateMax: 1.0 },
                female: { pitchMin: 1.0, pitchMax: 1.15, rateMin: 0.85, rateMax: 1.0 }
            },
            // Alien: very strange, extreme pitch modulation
            'Alien': {
                male: { pitchMin: 0.3, pitchMax: 2.0, rateMin: 0.5, rateMax: 1.8 },
                female: { pitchMin: 0.3, pitchMax: 2.0, rateMin: 0.5, rateMax: 1.8 }
            },
            // Default fallback
            'default': {
                male: { pitchMin: 0.85, pitchMax: 1.05, rateMin: 0.9, rateMax: 1.1 },
                female: { pitchMin: 1.0, pitchMax: 1.2, rateMin: 0.9, rateMax: 1.1 }
            }
        };

        this._cargoWords = ["cargo", "freight", "payload", "haul", "manifest", "containers", "stock"];
        // Use shared constant from enemyConstants.js for pirate gang names
        this._pirateGroups = (typeof PIRATE_GANG_NAMES !== 'undefined') ? PIRATE_GANG_NAMES : [
            "Black Arc", "Dust Jackals", "Red Shift", "Voidborn", "Broken Comet"
        ];
        this._pirateDemands = [
            "dump the hold",
            "open your bays",
            "jettison the {cargoWord}",
            "kill your engines and start a transfer",
            "vent every crate on three",
            "power down and hand over the manifest",
            "cut thrust and spool the cargo tethers"
        ];
        this._pirateInsults = [
            "drift rat", "amateur", "weekend pilot", "scrap jockey", "thruster monkey", "insurance liability"
        ];
        this._haulerFallbackCargo = [
            "medical supplies", "grain rations", "habitat parts", "terraforming kits", "replacement filters",
            "ore contracts", "spare drones", "research samples", "reactor fuel", "station hardware"
        ];
        this._haulerDestinations = [
            "Cassio Station", "Eridani Dock", "Lagrange Hub", "Outpost Vega", "Port Meridian",
            "Kovacs Terminal", "Dawson Anchorage", "Achenar Relay", "Hendrix Platform", "Farpoint Depot"
        ];
        this._haulerJobs = [
            "running relief crates", "hauling ore contracts", "making rent on courier work", "ferrying miners home",
            "pushing fuel cells", "moving station mail", "running colony tenders", "doing union backlog runs"
        ];
        this._haulerExcuses = [
            "The client audits every gram", "You crash this load and the whole station starves",
            "Insurance won't cover a firefight", "My crew has families planetside",
            "This ship barely holds pressure already", "Charter law says you owe me protection, not plasma",
            "Take the black box, just leave the hull", "I'm already late to docking"
        ];
        this._policeCharges = [
            "Sec-14.3", "Sec-07.8", "Code-91", "Article-12", "Article-4B", "Statute-19",
            "Directive-28", "Order-6F", "Warrant-02", "Protocol-3"
        ];

        this._guardPrincipals = [
            "the boss", "my principal", "my charge", "the VIP", "my client"
        ];

        this._militaryUnits = [
            "Echo Squadron", "Delta Wing", "Sword Flight", "Hammer Group", "Vanguard Unit",
            "Strike Force Alpha", "Patrol Beta", "Defense Grid Gamma"
        ];

        this._imperialRanks = [
            "His Majesty's Navy", "Imperial Command", "Crown Fleet", "Royal Squadron", "the Empire"
        ];

        this._separatistSlogans = [
            "Freedom over tyranny", "The Republic will fall", "Liberty or death", "Down with the Crown",
            "We fight for the people", "No more kings"
        ];

        this.templates = {
            pirateEngage: [
                "{enemyName}: Kill thrust. {pirateDemand}.",
                "{enemyName}: {pirateGroup} runs {systemName}. Pay up.",
                "{enemyName}: Nice {cargoWord}. Hand it over.",
                "{enemyName}: Heavy load. Open the bays.",
                "{enemyName}: Jettison or die. Simple.",
                "{enemyName}: Cargo. Now. Don't stall.",
                "{enemyName}: {pirateGroup} toll. {pirateDemand}.",
                "{enemyName}: Tagged you. Pay or bleed.",
                "{enemyName}: Engines off. Cargo out.",
                "{enemyName}: We got bills. You got cargo.",
                "{enemyName}: Missile lock. Cooperate.",
                "{enemyName}: Five seconds. Dump everything.",
                "{enemyName}: Wrong sector, {playerTitle}. Tribute.",
                "{enemyName}: Insurance up? Prove it.",
                "{enemyName}: Fragile stuff first. Toss it.",
                "{enemyName}: Already sold your {playerShip}. {pirateDemand}.",
                "{enemyName}: Just business. Drop cargo, live.",
                "{enemyName}: Goods or grave. Pick one.",
                "{enemyName}: Shields failing. Dump the {cargoWord}.",
                "{enemyName}: {pirateGroup} enforcement. {pirateDemand}.",
                "{enemyName}: Juicy heat sig. Start offloading.",
                "{enemyName}: {pirateInsult}. Bad call flying here.",
                "{enemyName}: Fancy paint, full hold. Empty it.",
                "{enemyName}: Hatches open. Tribute time.",
                "{enemyName}: Beacon live. {pirateDemand}.",
                "{enemyName}: Your route goes through us. Pay.",
                "{enemyName}: Cargo or caskets. Choose.",
                "{enemyName}: {pirateGroup} collections. Friendly visit.",
                "{enemyName}: Full hold. Empty it. Now.",
                "{enemyName}: Latching in ten. Don't move.",
                "{enemyName}: Donation time, {playerTitle}.",
                "{enemyName}: Fragile first. Toss gently.",
                "{enemyName}: Manifests out. Crates next.",
                "{enemyName}: Those dots? Us. This dot? You.",
                "{enemyName}: Collectors waiting. Don't waste time.",
                "{enemyName}: {systemName} toll overdue. Pay.",
                "{enemyName}: {cargoWord} out, wings stay on.",
                "{enemyName}: Easy talk or shrapnel. Pick.",
                "{enemyName}: Time, ammo, quota. Make it easy.",
                "{enemyName}: Gentle with cargo. Start venting.",
                "{enemyName}: Don't make us crack you open.",
                "{enemyName}: Transponder says payday. Comply.",
                "{enemyName}: Last offer. Toll or undertow.",
                "{enemyName}: Bored and broke. Fix both.",
                "{enemyName}: Love that paint? Pay up.",
                "{enemyName}: No trouble. Just your {cargoWord}.",
                "{enemyName}: {pirateGroup} wants a cut. Now.",
                "{enemyName}: Haul looks good. Share it.",
                "{enemyName}: Credits or combat. Your call.",
                "{enemyName}: Slow down. Open up. Live.",
                "{enemyName}: We see cargo. We want cargo.",
                "{enemyName}: Wrong place, wrong time, {pirateInsult}.",
                "{enemyName}: Full bays? Not for long.",
                "{enemyName}: Tribute or target. Decide fast.",
                "{enemyName}: {pirateGroup} tax. Everyone pays."
            ],
            pirateRetort: [
                "{enemyName}: Bold. Let's see how long.",
                "{enemyName}: Ouch. Triple for that.",
                "{enemyName}: One free hit. No more.",
                "{enemyName}: Hard way it is.",
                "{enemyName}: You shoot, we keep wreckage.",
                "{enemyName}: Cannons hot. Bye, {playerShip}.",
                "{enemyName}: Woke us up. Got friends?",
                "{enemyName}: Live ammo now, {playerTitle}.",
                "{enemyName}: Bounty list. Welcome.",
                "{enemyName}: That all? We brought more.",
                "{enemyName}: Shields spiked. Interested now.",
                "{enemyName}: Nicked paint. Now your hull.",
                "{enemyName}: Obituary's getting signed.",
                "{enemyName}: Oh good. Workout.",
                "{enemyName}: Spicy. Heating up.",
                "{enemyName}: Were polite. Past tense.",
                "{enemyName}: Tank this, hero.",
                "{enemyName}: Added to invoice.",
                "{enemyName}: Big mistake, {pirateInsult}.",
                "{enemyName}: You'll regret that.",
                "{enemyName}: Weapons hot. Your funeral.",
                "{enemyName}: Cute. Won't save you.",
                "{enemyName}: Now you die tired.",
                "{enemyName}: Wrong target, friend.",
                "{enemyName}: Price just went up.",
                "{enemyName}: Now I'm awake.",
                "{enemyName}: Lucky shot. Last one.",
                "{enemyName}: That tickled. My turn.",
                "{enemyName}: Rude. Very rude.",
                "{enemyName}: Should've paid.",
                "{enemyName}: Free lesson coming up.",
                "{enemyName}: Made it personal.",
                "{enemyName}: Alright, playtime.",
                "{enemyName}: Noted. Returning fire.",
                "{enemyName}: Worse than pirates? You.",
                "{enemyName}: Hull scuff. Minor.",
                "{enemyName}: You first. Cute.",
                "{enemyName}: Charging extra now.",
                "{enemyName}: That's gonna cost.",
                "{enemyName}: Funny. Here's funnier.",
                "{enemyName}: {pirateGroup} doesn't forget.",
                "{enemyName}: Fine. Hard way.",
                "{enemyName}: Mistake. Big one.",
                "{enemyName}: Wasted your shot.",
                "{enemyName}: Dead pilot flying.",
                "{enemyName}: Good aim. Not enough.",
                "{enemyName}: We don't miss twice.",
                "{enemyName}: Shields hold. Yours?",
                "{enemyName}: Nice try, {pirateInsult}.",
                "{enemyName}: Cargo's secondary now.",
                "{enemyName}: Blood price activated.",
                "{enemyName}: Could've been easy.",
                "{enemyName}: {pirateGroup} retaliates.",
                "{enemyName}: Paint job ruined.",
                "{enemyName}: Adding interest.",
                "{enemyName}: Armor took it. Barely.",
                "{enemyName}: Scratch? That's a scratch.",
                "{enemyName}: Return to sender.",
                "{enemyName}: You started this.",
                "{enemyName}: We finish things.",
                "{enemyName}: Error. Fatal error.",
                "{enemyName}: Priority changed. You're it.",
                "{enemyName}: Gloves off.",
                "{enemyName}: Combat protocol. Engage.",
                "{enemyName}: Feel that? That's anger.",
                "{enemyName}: Debt increased.",
                "{enemyName}: Stupid move.",
                "{enemyName}: {playerShip} debris incoming.",
                "{enemyName}: Hull kiss? Here's mine.",
                "{enemyName}: Damage noted. Returning.",
                "{enemyName}: Price of defiance.",
                "{enemyName}: Last mistake, {playerTitle}."
            ],
            alienEngage: [
                "⟟⟊⟒⋮⟟ ⊑⟟⟊⟟⟒ ✦ ☼", "⌬𐌰𐌿𐍄 ∴ ʘ͜ʖʘ", "∰⟴⟴⟁⟁⟁ ∰⟴⟴⟁⟁⟁", "⋇⋇⋇ ᚠᛇᚻ ᚾᚪᚾ", "◬⟁◬⟁◬",
                "╳╳╳ ⟟⟟⟟ ϟϟϟ", "ᚷᛟᚾᛖᚱ ᛚᛟᚾᚷ", "҉҉҉ ☍☌☍", "⟁⟊⟟⟒ :: ⌬⌬⌬", "彡彡 彗彗",
                "ζ≀ζ≀ζ", "ᛝᛝᛝ ∴ ∴", "₪₪₪ ᚺᚨᛚᛚ", "⟁⟁⟁ ⟟⟊⟒", "¤¤¤ ѪѪѪ",
                "⟟⟟⟟ ᚷᚷᚷ", "≀≀≀ ∿∿∿", "▣▢▣▢", "⟴⟴⟴", "****",
                "☼☼☼ ⟟⟊⟒", "✦✦✦ ⌬⌬⌬", "∴∴∴ ᛝᛝᛝ", "ᚠᛇᚻ ⟁⟁⟁", "彗彗彗 ☼",
                "ᛣᛣᛣ ⟟⟊⟒", "𓆣𓆣𓆣 ∴", "⊑⟟ ⊑⟟ ⊑⟟", "ƛƛƛ ☍☌☍", "◯◯◯ ⟴⟴⟴",
                "Ѫ Ѫ Ѫ ⟟⟊⟒", "ζ≀ζ ✦ ζ≀ζ", "∿∿∿ ⌬⌬⌬", "⋔⋇⋔ ⟁⟁⟁", "ᚺᚨᛚ ☼ ᚺᚨᛚ",
                "¤¤¤ ✦ ¤¤¤", "ϟϟϟ ⟟⟊⟒", "▣▢▣ ∴∴∴", "☍☌☍ ⟴⟴⟴", "∰⟴ ⟟⟊⟒ ∰⟴",
                "彡彡彡 ☼", "₪₪₪ ⟟⟟⟟", "⟊⟒⟊ ✦✦✦", "ᛝᛝᛝ ⌬⌬⌬", "⋇⋇⋇ ᚠᛇᚻ",
                "◬◬◬ ⟁⟁⟁", "ᚷᛟᚾ ☼ ᚷᛟᚾ", "∴∴∴ ⟟⟊⟒", "✦ ⌬⌬⌬ ✦", "彗彗 ᛣᛣᛣ",
                "☍☌☍ ⟟⟊⟒", "ζ≀ζ≀ζ ☼", "∿∿∿ ✦✦✦", "⟴⟴⟴ ⌬⌬⌬", "ᚠᛇᚻ ⟁⟁⟁ ᚠᛇᚻ"
            ],
            alienRetort: [
                "⋔⋇⋔⋇", "⟟⟒⟊⟟⟒", "ϞϟϞ", "ƛƛƛ", "彗彗彗", "ᛣᛣᛣ", "𓆣𓆣𓆣", "₪₪₪", "҉҉҉ ҉҉҉", "◯◯◯",
                "⟁⟁⟁ !", "⌬⌬⌬ ☼", "∿∿∿ ✦", "ᚠᛇᚻ !", "彡彡 !", "ζ≀ζ !", "∴∴∴ !", "☍☌ !", "⟴⟴ !", "▣▢ !",
                "✦✦ ⟟⟊⟒", "ᛝᛝ !", "ᚷᛟᚾ !", "Ѫ Ѫ !", "¤¤ ⟁⟁⟁", "◬◬ !", "ᚺᚨ !", "⊑⟟ !", "ƛ ⟟⟊⟒ ƛ", "∰ ✦ ∰"
            ],
            pirateDeath: [
                "{enemyName}: ugh—", "{enemyName}: Noooooo—", "{enemyName}: Ejecting—", "{enemyName}: …static…",
                "{enemyName}: engines— gone—", "{enemyName}: not like— this—", "{enemyName}: vents— open—",
                "{enemyName}: I'm… out—", "{enemyName}: hull… breaking—", "{enemyName}: you— win—",
                "{enemyName}: reactor— hot—", "{enemyName}: system— dead—", "{enemyName}: should've— run—",
                "{enemyName}: tell {pirateGroup}—", "{enemyName}: wasn't— worth it—", "{enemyName}: cargo— wasn't—",
                "{enemyName}: burning— up—", "{enemyName}: shields— gone—", "{enemyName}: {pirateGroup}— avenge—",
                "{enemyName}: lucky— shot—", "{enemyName}: hull— breached—", "{enemyName}: oxygen— failing—",
                "{enemyName}: core— critical—", "{enemyName}: fight's— over—", "{enemyName}: got— me—",
                "{enemyName}: no— escape—", "{enemyName}: life support—", "{enemyName}: going— down—",
                "{enemyName}: can't— hold—", "{enemyName}: mayday—", "{enemyName}: {pirateGroup}— remember—",
                "{enemyName}: debris— field—", "{enemyName}: blast— it—", "{enemyName}: spinning— out—"
            ],
            policeDeath: [
                "{enemyName}: Officer— down—", "{enemyName}: Mayday— systems failing—", "{enemyName}: Mayday— Mayday—",
                "{enemyName}: Control— we lost—", "{enemyName}: Power— critical—", "{enemyName}: Couldn't— hold—",
                "{enemyName}: Hull— breach—", "{enemyName}: Unit— offline—", "{enemyName}: Tell— HQ—",
                "{enemyName}: backup— needed—", "{enemyName}: patrol— down—", "{enemyName}: law— failed—",
                "{enemyName}: justice— denied—", "{enemyName}: {systemName}— remember—", "{enemyName}: badge— falls—",
                "{enemyName}: end of— watch—", "{enemyName}: serve— protect—", "{enemyName}: duty— done—",
                "{enemyName}: respond— code—", "{enemyName}: signal— lost—", "{enemyName}: static—",
                "{enemyName}: reactor— failing—", "{enemyName}: shields— critical—", "{enemyName}: weapons— offline—",
                "{enemyName}: evasion— failed—", "{enemyName}: hull— compromised—", "{enemyName}: going— down—",
                "{enemyName}: avenge— us—", "{enemyName}: backup— too late—", "{enemyName}: {policeWing}— lost—"
            ],
            haulerDeath: [
                "{enemyName}: I— can't—", "{enemyName}: Tell {haulerDestination}— sorry—", "{enemyName}: cargo— everywhere—",
                "{enemyName}: seals— blown—", "{enemyName}: ugh—", "{enemyName}: Losing— integrity—",
                "{enemyName}: hull— breach—", "{enemyName}: systems— gone—", "{enemyName}: not— like this—",
                "{enemyName}: manifest— incomplete—", "{enemyName}: delivery— failed—", "{enemyName}: freight— lost—",
                "{enemyName}: contract— broken—", "{enemyName}: engines— dead—", "{enemyName}: reactor— critical—",
                "{enemyName}: shields— failed—", "{enemyName}: just— cargo—", "{enemyName}: wasn't— armed—",
                "{enemyName}: family— waiting—", "{enemyName}: {haulerCargo}— burning—", "{enemyName}: bay doors—",
                "{enemyName}: decompressing—", "{enemyName}: life support— gone—", "{enemyName}: spinning— out—",
                "{enemyName}: mayday— mayday—", "{enemyName}: freighter— down—", "{enemyName}: never wanted— fight—",
                "{enemyName}: just— a job—", "{enemyName}: tell— them—", "{enemyName}: shipment— lost—"
            ],
            transporterDeath: [
                "{enemyName}: —static—", "{enemyName}: we're— hit—", "{enemyName}: passengers— oh no—",
                "{enemyName}: cabin— breach—", "{enemyName}: ugh—", "{enemyName}: mayday—",
                "{enemyName}: losing— pressure—", "{enemyName}: tell— the station—", "{enemyName}: souls— aboard—",
                "{enemyName}: evacuate— can't—", "{enemyName}: shuttle— down—", "{enemyName}: ferry— lost—",
                "{enemyName}: civilians— innocent—", "{enemyName}: not— our fault—", "{enemyName}: short hop— failed—",
                "{enemyName}: commuters— sorry—", "{enemyName}: docking— impossible—", "{enemyName}: station— we tried—",
                "{enemyName}: hull— gone—", "{enemyName}: emergency— pods—", "{enemyName}: passengers— first—",
                "{enemyName}: oxygen— failing—", "{enemyName}: never— combat ship—", "{enemyName}: just— taxi—",
                "{enemyName}: spinning— controls—", "{enemyName}: engines— dead—", "{enemyName}: rescue— needed—",
                "{enemyName}: transfer— incomplete—", "{enemyName}: crew— lost—", "{enemyName}: service— terminated—"
            ],
            alienDeath: [
                "⟟⟊⟒⟒— — —", "҉҉҉ …", "彗… 彗…", "∿∿∿", "◯◯…", "₪₪—", "ᛝᛝᛝ …", "⟁⟁⟁ …", "⌬⌬⌬ —", "◬◬◬ …",
                "ζ≀ζ…", "ᚠᛇᚻ—", "☍☌—", "ϟϟ…", "彡彡—", "ᚷᛟᚾ—", "∰⟴—", "⋇⋇…", "ᛣᛣ—", "𓆣𓆣…",
                "⟟⟟⟟—", "⟴⟴…", "▣▢—", "ƛƛ…", "☼—", "✦✦—", "⊑⟟—", "ᚺᚨ—", "¤¤…", "Ѫ—"
            ],
            haulerPleas: [
                "{enemyName}: I'm a freighter! Back off!",
                "{enemyName}: Civilian hauler here. Cease fire!",
                "{enemyName}: {haulerCargo} on board. Don't shoot!",
                "{enemyName}: Contract to {haulerDestination}. Let me pass!",
                "{enemyName}: We're unarmed! Stop!",
                "{enemyName}: Just {haulerJob}. Leave us alone!",
                "{enemyName}: Hit us again and we decompress!",
                "{enemyName}: {haulerExcuse}. Just go!",
                "{enemyName}: Medical cargo! Think about it!",
                "{enemyName}: Not your enemy. Pirates are out there!",
                "{enemyName}: This run barely pays fuel. Let me go!",
                "{enemyName}: Charter law protects us. Back off!",
                "{enemyName}: No weapons here. Find real targets!",
                "{enemyName}: Shoot us and someone starves!",
                "{enemyName}: We've got families waiting!",
                "{enemyName}: Take the cargo, spare the ship!",
                "{enemyName}: Hull won't take more! Stop!",
                "{enemyName}: Just hauling freight! Cease fire!",
                "{enemyName}: Insurance won't cover this!",
                "{enemyName}: Wrong target! We're civilians!",
                "{enemyName}: Cargo's not worth killing for!",
                "{enemyName}: Station expects us! They'll notice!",
                "{enemyName}: We reported your transponder!",
                "{enemyName}: Freighter rules! We surrender!",
                "{enemyName}: Take it all! Just stop shooting!",
                "{enemyName}: Engine's failing! We can't run!",
                "{enemyName}: Reactor's unstable! One more hit—",
                "{enemyName}: Crew begging you! Stand down!",
                "{enemyName}: Not worth the bounty! Let us go!",
                "{enemyName}: Food cargo! People need this!",
                "{enemyName}: Mining equipment! Not valuable!",
                "{enemyName}: Emergency beacon active! Back off!",
                "{enemyName}: {haulerDestination} will miss us!",
                "{enemyName}: Just doing our job! Please!",
                "{enemyName}: Shields gone! We're helpless!",
                "{enemyName}: Life pods prepped! Don't do this!",
                "{enemyName}: Manifest's open! Check cargo!",
                "{enemyName}: We're neutral! No faction!",
                "{enemyName}: Slow hauler! Can't evade!",
                "{enemyName}: Kids aboard! Crew families!",
                "{enemyName}: Fuel low! Can't escape anyway!",
                "{enemyName}: We'll dump cargo! Just back off!",
                "{enemyName}: Contract void! Take everything!",
                "{enemyName}: Old ship! Not worth salvage!",
                "{enemyName}: Registered civilian! Check records!",
                "{enemyName}: Please! We're just truckers!"
            ],
            transporterPleas: [
                "{enemyName}: Shuttle service! No hostiles here!",
                "{enemyName}: Passengers aboard! Hold fire!",
                "{enemyName}: Local ferry! We're civilians!",
                "{enemyName}: Just station runs. Back off!",
                "{enemyName}: Commuters on board! Stop shooting!",
                "{enemyName}: We're a taxi, not a target!",
                "{enemyName}: Short hop to dock. Let us pass!",
                "{enemyName}: Crew transfer in progress. Disengage!",
                "{enemyName}: No cargo worth taking here!",
                "{enemyName}: Fifty souls aboard. Think about it!",
                "{enemyName}: Station contract—we're protected!",
                "{enemyName}: Just moving workers. Calm down!",
                "{enemyName}: Shuttle service—we don't fight!",
                "{enemyName}: People on board. Not freight!",
                "{enemyName}: Short range only. No threat!",
                "{enemyName}: We're not armed. Just passengers!",
                "{enemyName}: Civilian transport! Stand down!",
                "{enemyName}: Kids on board! Please!",
                "{enemyName}: Emergency medical! Let us pass!",
                "{enemyName}: Doctor aboard! Needs delivery!",
                "{enemyName}: Workers heading home! Cease fire!",
                "{enemyName}: No weapons! Just seats!",
                "{enemyName}: Passenger manifest public! Check!",
                "{enemyName}: Station waiting for us!",
                "{enemyName}: Tourists! Just tourists!",
                "{enemyName}: Return flight! They're expected!",
                "{enemyName}: Crew rotation! Essential!",
                "{enemyName}: Life support critical! Stop!",
                "{enemyName}: Elderly aboard! Please!",
                "{enemyName}: Mining shift workers! Innocent!",
                "{enemyName}: Regular route! We're known!",
                "{enemyName}: No valuables! Just people!",
                "{enemyName}: Hull failing! Passengers panic!",
                "{enemyName}: Emergency pods limited! Stop!",
                "{enemyName}: Mayday broadcast active!",
                "{enemyName}: Rescue inbound! Stand down!",
                "{enemyName}: Children crying! Please stop!",
                "{enemyName}: Corporate shuttle! They'll trace you!",
                "{enemyName}: Just ferrying! No combat!",
                "{enemyName}: One more hit, we decompress!",
                "{enemyName}: Souls on board! Think!",
                "{enemyName}: Innocents! All civilians!",
                "{enemyName}: Station expects us! They're watching!",
                "{enemyName}: Passenger liner! Not military!",
                "{enemyName}: Please! They're just commuters!"
            ],
            policeWarnings: [
                "{enemyName}: Cease fire! Law enforcement!",
                "{enemyName}: Stand down, {playerTitle}!",
                "{enemyName}: Attacking police? Bad idea.",
                "{enemyName}: Last warning. Lethal force next.",
                "{enemyName}: Strike logged. Arrest pending.",
                "{enemyName}: Drop weapons. Now.",
                "{enemyName}: Shot recorded. Missiles next.",
                "{enemyName}: Violation {policeCharge}. Stand down.",
                "{enemyName}: Cross us again, we disable you.",
                "{enemyName}: Power down. Submit to scan.",
                "{enemyName}: This is law enforcement! Back off!",
                "{enemyName}: You're firing on police!",
                "{enemyName}: Aggression noted. Warranted.",
                "{enemyName}: Don't test us, {playerTitle}.",
                "{enemyName}: Authority of {systemName}. Cease!",
                "{enemyName}: Weapons down or we open up.",
                "{enemyName}: Final warning. Comply.",
                "{enemyName}: You're making a big mistake.",
                "{enemyName}: Badge on hull. Back off!",
                "{enemyName}: Licensed peace officer. Stand down!",
                "{enemyName}: That's assault on law enforcement!",
                "{enemyName}: Patrol unit under fire. All units!",
                "{enemyName}: You'll face {policeCharge} charges!",
                "{enemyName}: Weapons locked. Don't push it.",
                "{enemyName}: Backup en route. Last chance.",
                "{enemyName}: This ends one way for you.",
                "{enemyName}: Patrol records everything. Think!",
                "{enemyName}: Station notified. You're hunted.",
                "{enemyName}: Don't add to your charges!",
                "{enemyName}: Law of {systemName}. Submit!",
                "{enemyName}: You want a fight? You got one.",
                "{enemyName}: All weapons authorized. Submit!",
                "{enemyName}: Hostile action recorded. Warrant issued.",
                "{enemyName}: Crime in progress. Engaging.",
                "{enemyName}: Surrender or face consequences!",
                "{enemyName}: Police codes broken. Lethal response.",
                "{enemyName}: You just made yourself a fugitive.",
                "{enemyName}: Every patrol in sector coming.",
                "{enemyName}: Running makes it worse!",
                "{enemyName}: Bounty on your head now.",
                "{enemyName}: System-wide alert. You're marked.",
                "{enemyName}: Don't die for this, {playerTitle}.",
                "{enemyName}: We have your transponder logged.",
                "{enemyName}: Nowhere to run. Surrender.",
                "{enemyName}: Attacking police never ends well.",
                "{enemyName}: Order of {systemName}. Cease fire!",
                "{enemyName}: You're under arrest. Stand down!",
                "{enemyName}: This is your last warning!"
            ],
            guardEngage: [
                "{enemyName}: Stay away from {guardPrincipal}!",
                "{enemyName}: Threatening {guardPrincipal}. Back off!",
                "{enemyName}: Too close. Engaging.",
                "{enemyName}: Paid to protect. You're a threat.",
                "{enemyName}: Painted {guardPrincipal}. Mistake.",
                "{enemyName}: Security active. Disengage.",
                "{enemyName}: Only warning. Move away.",
                "{enemyName}: One job. Protect. Don't interfere.",
                "{enemyName}: Touch {guardPrincipal}, answer to me.",
                "{enemyName}: Zone breach. Stand down.",
                "{enemyName}: {guardPrincipal} protected. Stay back.",
                "{enemyName}: Don't want this fight, {playerTitle}.",
                "{enemyName}: Hard way or easy way. Choose.",
                "{enemyName}: Hostile intent. Engaging.",
                "{enemyName}: Wrong convoy to mess with.",
                "{enemyName}: {guardPrincipal} safe. You won't be.",
                "{enemyName}: Escort duty. You're the threat.",
                "{enemyName}: Back off. Final warning.",
                "{enemyName}: Protecting {guardPrincipal}. Don't test me.",
                "{enemyName}: Security escort. Weapons hot.",
                "{enemyName}: Perimeter breached. Engaging.",
                "{enemyName}: {guardPrincipal} under my watch.",
                "{enemyName}: Not another step closer.",
                "{enemyName}: Threat detected. Neutralizing.",
                "{enemyName}: Contract says protect. I protect.",
                "{enemyName}: {guardPrincipal} pays well. You die.",
                "{enemyName}: Security protocol active.",
                "{enemyName}: Wrong escort to challenge.",
                "{enemyName}: I see you. Weapons aimed.",
                "{enemyName}: Close enough. Leave.",
                "{enemyName}: My charge. My responsibility.",
                "{enemyName}: Step off. Now.",
                "{enemyName}: Not paid to ask twice.",
                "{enemyName}: Approach denied. Final.",
                "{enemyName}: {guardPrincipal} priority. You're noise.",
                "{enemyName}: Security zone. Turn around.",
                "{enemyName}: Contact {guardPrincipal}. Not happening.",
                "{enemyName}: Hostile proximity. Engaging.",
                "{enemyName}: Escort formation. Back away.",
                "{enemyName}: Guard contract active. Leave.",
                "{enemyName}: Target acquired. Standing by.",
                "{enemyName}: Don't make me earn my bonus.",
                "{enemyName}: {guardPrincipal} warned about hostiles.",
                "{enemyName}: Get clear or get wrecked.",
                "{enemyName}: Professional security. Move along."
            ],
            guardRetort: [
                "{enemyName}: Death warrant signed.",
                "{enemyName}: Mistake. I don't go easy.",
                "{enemyName}: That hurt? Just started.",
                "{enemyName}: Nice shot. My turn.",
                "{enemyName}: You'll regret that.",
                "{enemyName}: That all you got?",
                "{enemyName}: Worse from asteroids.",
                "{enemyName}: {guardPrincipal} won't forgive.",
                "{enemyName}: Wrong move. I'm trained.",
                "{enemyName}: Armor holding. Yours?",
                "{enemyName}: Hit back harder.",
                "{enemyName}: Good shot. Last one.",
                "{enemyName}: Now I'm angry.",
                "{enemyName}: Paid for this. Worth it.",
                "{enemyName}: Keep shooting. See what happens.",
                "{enemyName}: Hit me protecting {guardPrincipal}? Bad.",
                "{enemyName}: I'm the shield. Try again.",
                "{enemyName}: That scratch? Cute.",
                "{enemyName}: My turn to fire.",
                "{enemyName}: You woke the guard.",
                "{enemyName}: Contract just got personal.",
                "{enemyName}: Shield for {guardPrincipal}. Sword for you.",
                "{enemyName}: Mess with the escort, die.",
                "{enemyName}: Professional response incoming.",
                "{enemyName}: That hurt. You'll hurt more.",
                "{enemyName}: {guardPrincipal} safe. You're not.",
                "{enemyName}: One job. Can't fail.",
                "{enemyName}: Hit noted. Retaliation.",
                "{enemyName}: Guard training. Feel it.",
                "{enemyName}: Escort pays. This is free.",
                "{enemyName}: Dent in armor. Hole in you.",
                "{enemyName}: Security doesn't back down.",
                "{enemyName}: Damage taken. Rage unlocked.",
                "{enemyName}: {guardPrincipal} watching. Can't lose.",
                "{enemyName}: Nice try. Here's better.",
                "{enemyName}: Guard life. Worth it.",
                "{enemyName}: Shields offline. Fight on.",
                "{enemyName}: My ship, my duty, my kill.",
                "{enemyName}: Contract bonus for kills."
            ],
            guardDeath: [
                "{enemyName}: {guardPrincipal}— get clear—",
                "{enemyName}: Sorry— couldn't— protect—",
                "{enemyName}: Systems failing— run!",
                "{enemyName}: I— failed—",
                "{enemyName}: Tell {guardPrincipal}— I tried—",
                "{enemyName}: Hull breach— can't— continue—",
                "{enemyName}: Not— like this—",
                "{enemyName}: {guardPrincipal}— forgive me—",
                "{enemyName}: Guard— down—",
                "{enemyName}: Contract— incomplete—",
                "{enemyName}: Shield— broken—",
                "{enemyName}: Run {guardPrincipal}— please—",
                "{enemyName}: Duty— done—",
                "{enemyName}: Someone— protect them—",
                "{enemyName}: Escort— failed—",
                "{enemyName}: Dying— for duty—",
                "{enemyName}: Worth— the pay—",
                "{enemyName}: {guardPrincipal}— remember—",
                "{enemyName}: Get— backup—",
                "{enemyName}: Couldn't— hold—",
                "{enemyName}: Going— dark—",
                "{enemyName}: Final— report—",
                "{enemyName}: Guard— out—",
                "{enemyName}: Reactor— critical—"
            ],
            militaryEngage: [
                "{enemyName}: Hostile contact. Weapons hot.",
                "{enemyName}: Target acquired. Engaging.",
                "{enemyName}: {militaryUnit} hostile. Neutralizing.",
                "{enemyName}: {militaryUnit} engaging combatant.",
                "{enemyName}: Designated hostile. Firing.",
                "{enemyName}: Military sector. Stand down.",
                "{enemyName}: Defense grid active. Intercepting.",
                "{enemyName}: Restricted zone. Leave or die.",
                "{enemyName}: Threat assessed. Engaging.",
                "{enemyName}: Comply or be eliminated.",
                "{enemyName}: Fleet orders. Neutralize threats.",
                "{enemyName}: Target locked. Attack run.",
                "{enemyName}: Military space. You don't belong.",
                "{enemyName}: ROE satisfied. Firing.",
                "{enemyName}: Hostile identified. Weapons free.",
                "{enemyName}: {militaryUnit} on intercept.",
                "{enemyName}: Naval authority. Comply.",
                "{enemyName}: You picked a fight with the fleet.",
                "{enemyName}: Tango spotted. Engaging.",
                "{enemyName}: Military response. Incoming.",
                "{enemyName}: Contact confirmed. Engaging.",
                "{enemyName}: Fleet protocol alpha. Fire.",
                "{enemyName}: Bogey tagged. Intercepting.",
                "{enemyName}: This is {militaryUnit}. Surrender.",
                "{enemyName}: Patrol sector breached. Hostile.",
                "{enemyName}: Scramble! Hostile in zone.",
                "{enemyName}: Target painted. Weapons free.",
                "{enemyName}: Naval engagement rules. Met.",
                "{enemyName}: Defense code red. Engaging.",
                "{enemyName}: Unauthorized presence. Firing.",
                "{enemyName}: Vector locked. Attack imminent.",
                "{enemyName}: Fleet command approves. Fire.",
                "{enemyName}: Military doctrine engaged.",
                "{enemyName}: Hostile signature. Intercepting.",
                "{enemyName}: You're in a combat zone. Fight.",
                "{enemyName}: Tactical response. Engage.",
                "{enemyName}: Combat alert. All weapons.",
                "{enemyName}: Hostile action detected. Response.",
                "{enemyName}: {militaryUnit} weapons online.",
                "{enemyName}: This sector is defended.",
                "{enemyName}: Military engagement authorized.",
                "{enemyName}: Target designated. Prosecuting.",
                "{enemyName}: You've made a fatal error.",
                "{enemyName}: Fleet defends this space.",
                "{enemyName}: Naval superiority. Your end."
            ],
            militaryRetort: [
                "{enemyName}: Shields up. Returning fire.",
                "{enemyName}: Taking damage. Backup requested.",
                "{enemyName}: Attack on military. Death sentence.",
                "{enemyName}: Hit confirmed. Counter-attack.",
                "{enemyName}: Armor hit. Escalating.",
                "{enemyName}: Outgunned. You don't know it.",
                "{enemyName}: Act of war. Retaliation.",
                "{enemyName}: All units engage!",
                "{enemyName}: Lethal force authorized.",
                "{enemyName}: That scorch? Your last.",
                "{enemyName}: Fleet doesn't forget.",
                "{enemyName}: Big mistake, hostile.",
                "{enemyName}: Hull hit. Now you pay.",
                "{enemyName}: Weapons hot. Your funeral.",
                "{enemyName}: Bad move. Very bad.",
                "{enemyName}: Combat damage. Returning.",
                "{enemyName}: {militaryUnit} under fire!",
                "{enemyName}: Priority target. You.",
                "{enemyName}: Fleet responds. Hard.",
                "{enemyName}: Damage report. Minor. Fire!",
                "{enemyName}: Nice shot. Last one.",
                "{enemyName}: Military doesn't retreat.",
                "{enemyName}: Armor absorbing. Firing.",
                "{enemyName}: Combat alert escalated.",
                "{enemyName}: Hit logged. Returning tenfold.",
                "{enemyName}: Hostile aggression. Noted.",
                "{enemyName}: You just became priority.",
                "{enemyName}: Naval wrath incoming.",
                "{enemyName}: Damage? Barely. Your turn.",
                "{enemyName}: Fleet vengeance. Incoming.",
                "{enemyName}: Attack confirmed. Response active.",
                "{enemyName}: Military retaliation. Full.",
                "{enemyName}: You'll regret that shot.",
                "{enemyName}: Hostile confirmed. Weapons free.",
                "{enemyName}: That was a mistake.",
                "{enemyName}: Combat doctrine. Retaliate.",
                "{enemyName}: Fleet honor. Defended.",
                "{enemyName}: Engaging hostile with force.",
                "{enemyName}: Armor holding. Rage rising.",
                "{enemyName}: You want a war? You got one."
            ],
            militaryDeath: [
                "{enemyName}: {militaryUnit}— down—",
                "{enemyName}: We're hit— critical—",
                "{enemyName}: Command— not making it—",
                "{enemyName}: Hull— failing—",
                "{enemyName}: Ejecting—",
                "{enemyName}: Casualty—",
                "{enemyName}: Ship— lost—",
                "{enemyName}: Going— dark—",
                "{enemyName}: Tell— fleet—",
                "{enemyName}: Mayday— mayday—",
                "{enemyName}: Reactor— critical—",
                "{enemyName}: Combat— over—",
                "{enemyName}: Honor— served—",
                "{enemyName}: Fleet— remember—",
                "{enemyName}: Systems— offline—",
                "{enemyName}: Naval— casualty—",
                "{enemyName}: Served— well—",
                "{enemyName}: Going— down—",
                "{enemyName}: {militaryUnit}— lost—",
                "{enemyName}: Combat— complete—",
                "{enemyName}: Duty— done—",
                "{enemyName}: Fleet— avenged—",
                "{enemyName}: Fought— bravely—",
                "{enemyName}: Military— honor—",
                "{enemyName}: Final— report—"
            ],
            imperialEngage: [
                "{enemyName}: In the Emperor's name! Stand down!",
                "{enemyName}: Face the Empire. Surrender.",
                "{enemyName}: Glory to the Crown! Engaging.",
                "{enemyName}: {imperialRank} tolerates no defiance.",
                "{enemyName}: For the Empire! Weapons hot.",
                "{enemyName}: Challenge Imperial authority? Foolish.",
                "{enemyName}: Emperor's justice. Swift.",
                "{enemyName}: Long live the Empire! Fire!",
                "{enemyName}: Bow or burn. Your choice.",
                "{enemyName}: Traitors will be crushed.",
                "{enemyName}: {imperialRank} protects this sector.",
                "{enemyName}: For the Crown! Engaging.",
                "{enemyName}: Oppose us? Fatal mistake.",
                "{enemyName}: Imperial law is absolute.",
                "{enemyName}: The Crown commands. You die.",
                "{enemyName}: Empire's will. Your end.",
                "{enemyName}: No mercy for rebels.",
                "{enemyName}: Imperial wrath incoming.",
                "{enemyName}: You face {imperialRank}. Kneel.",
                "{enemyName}: Crown fleet. Weapons free.",
                "{enemyName}: Empire eternal! Engaging!",
                "{enemyName}: The Crown never forgives.",
                "{enemyName}: Imperial dominion. Submit!",
                "{enemyName}: Emperor watches. Prove worthy!",
                "{enemyName}: Glory awaits! Fire!",
                "{enemyName}: Crown sector. Hostiles die.",
                "{enemyName}: For His Majesty! Attack!",
                "{enemyName}: Defiance means death.",
                "{enemyName}: Imperial order. Surrender.",
                "{enemyName}: Crown authority. Absolute.",
                "{enemyName}: Rebel scum. Engaging.",
                "{enemyName}: Empire's might upon you.",
                "{enemyName}: By Imperial decree! Fire!",
                "{enemyName}: {imperialRank} demands compliance.",
                "{enemyName}: Loyalty to Crown. Death to traitors.",
                "{enemyName}: Imperial sector. Lethal response.",
                "{enemyName}: Emperor's glory! Engage!",
                "{enemyName}: Crown's enemies. Eliminated.",
                "{enemyName}: For the Throne! Weapons hot.",
                "{enemyName}: Imperial writ. Execution.",
                "{enemyName}: The Empire rises. You fall.",
                "{enemyName}: Crown commands. You obey.",
                "{enemyName}: His Majesty's vengeance!",
                "{enemyName}: Imperial navy. Fear us.",
                "{enemyName}: Empire's judgment. Final."
            ],
            imperialRetort: [
                "{enemyName}: Strike an Imperial?!",
                "{enemyName}: Treason! Empire remembers!",
                "{enemyName}: Crown doesn't fall easy.",
                "{enemyName}: Rebellion ends here!",
                "{enemyName}: Ten more for every one!",
                "{enemyName}: Empire's wrath upon you!",
                "{enemyName}: Powerful enemy made, rebel!",
                "{enemyName}: Imperial armor superior.",
                "{enemyName}: Emperor demands justice!",
                "{enemyName}: Attack Empire? Annihilation.",
                "{enemyName}: You'll regret that.",
                "{enemyName}: Crown retaliates.",
                "{enemyName}: Bad choice, rebel.",
                "{enemyName}: Imperial response incoming.",
                "{enemyName}: Now you face the fleet.",
                "{enemyName}: Hit Imperial? Die.",
                "{enemyName}: Crown's fury unleashed.",
                "{enemyName}: Empire strikes back. Hard.",
                "{enemyName}: Treason logged. Death.",
                "{enemyName}: Imperial vengeance. Incoming.",
                "{enemyName}: You dare? You die.",
                "{enemyName}: Crown armor holds. You won't.",
                "{enemyName}: Emperor's wrath. Swift.",
                "{enemyName}: Rebel aggression. Punished.",
                "{enemyName}: Imperial might. Feel it.",
                "{enemyName}: Hit noted. Returning hundredfold.",
                "{enemyName}: Crown doesn't forgive.",
                "{enemyName}: That scratch? Fatal for you.",
                "{enemyName}: Empire remembers everything.",
                "{enemyName}: Imperial hull. Superior.",
                "{enemyName}: Rebel violence. Crushed.",
                "{enemyName}: For that, you die slowly.",
                "{enemyName}: Crown's response. Overwhelming.",
                "{enemyName}: Hit Imperial? Unforgivable.",
                "{enemyName}: Emperor's justice. Merciless.",
                "{enemyName}: Treason price. Death.",
                "{enemyName}: Imperial retaliation. Total.",
                "{enemyName}: Crown fury. Unleashed.",
                "{enemyName}: Rebel fool. Die.",
                "{enemyName}: Empire avenges all wounds."
            ],
            imperialDeath: [
                "{enemyName}: Long live— Emperor—",
                "{enemyName}: For— Crown—",
                "{enemyName}: Empire— avenge me—",
                "{enemyName}: Emperor— protects—",
                "{enemyName}: Glory— fading—",
                "{enemyName}: Die for— Empire—",
                "{enemyName}: Fought— bravely—",
                "{enemyName}: Empire— endures—",
                "{enemyName}: For the— Crown—",
                "{enemyName}: Emperor— witness—",
                "{enemyName}: Imperial— duty—",
                "{enemyName}: Crown— eternal—",
                "{enemyName}: Serve— His Majesty—",
                "{enemyName}: Empire— remember—",
                "{enemyName}: Going— gloriously—",
                "{enemyName}: Imperial— honor—",
                "{enemyName}: {imperialRank}— falls—",
                "{enemyName}: Crown— vindicate—",
                "{enemyName}: Emperor's— light—",
                "{enemyName}: Loyal— to end—",
                "{enemyName}: Empire— avenge—",
                "{enemyName}: For— Throne—",
                "{enemyName}: Crown— never dies—",
                "{enemyName}: Imperial— to last—",
                "{enemyName}: His Majesty— forever—"
            ],
            separatistEngage: [
                "{enemyName}: {separatistSlogan}! Engaging!",
                "{enemyName}: With Empire? You're enemy!",
                "{enemyName}: For freedom! Never bow!",
                "{enemyName}: Republic rises! Fire!",
                "{enemyName}: Crown falls today!",
                "{enemyName}: Fight for the people!",
                "{enemyName}: {separatistSlogan}! Locked on.",
                "{enemyName}: Imperial detected. Attacking!",
                "{enemyName}: Chains broken! We fight!",
                "{enemyName}: Strike back! Engaging!",
                "{enemyName}: Just cause. Wrong side.",
                "{enemyName}: Freedom squadron! Weapons free!",
                "{enemyName}: Remember oppression. Deliver justice!",
                "{enemyName}: Republic not silenced!",
                "{enemyName}: Loyalists die today!",
                "{enemyName}: Liberty or death!",
                "{enemyName}: Down with tyrants!",
                "{enemyName}: People's will! Fire!",
                "{enemyName}: No more crowns!",
                "{enemyName}: Free systems unite!",
                "{enemyName}: Revolution continues! Engage!",
                "{enemyName}: Empire's puppet? Die!",
                "{enemyName}: Break the chains! Fire!",
                "{enemyName}: For our children! Attack!",
                "{enemyName}: Tyranny ends. Here.",
                "{enemyName}: People's justice. Delivered!",
                "{enemyName}: Crown sympathizer. Engaging.",
                "{enemyName}: Freedom fighters! Weapons hot!",
                "{enemyName}: Republic prevails! Fire!",
                "{enemyName}: Rebel blood. Pure!",
                "{enemyName}: Imperial collaborator. Eliminated.",
                "{enemyName}: No kings. No crowns. Fire!",
                "{enemyName}: {separatistSlogan}! Death to tyrants!",
                "{enemyName}: Self-determination! Engaging!",
                "{enemyName}: Empire burns today!",
                "{enemyName}: Loyalist scum. Targeted.",
                "{enemyName}: Our sector. Our rules!",
                "{enemyName}: The people fight back!",
                "{enemyName}: Independence! Fire!",
                "{enemyName}: Down with monarchists!",
                "{enemyName}: Free worlds! Engaging!",
                "{enemyName}: Republic stands. Empire falls!",
                "{enemyName}: Break their chains! Attack!",
                "{enemyName}: For the fallen! Weapons free!",
                "{enemyName}: Revolution! {separatistSlogan}!"
            ],
            separatistRetort: [
                "{enemyName}: Republic won't die!",
                "{enemyName}: Can't stop us! {separatistSlogan}!",
                "{enemyName}: Every hit strengthens us!",
                "{enemyName}: Endured worse, Imperial!",
                "{enemyName}: For freedom!",
                "{enemyName}: The People are with us!",
                "{enemyName}: Empire's best? Pathetic.",
                "{enemyName}: Survived bombardments. This?",
                "{enemyName}: Strike us, thousand rise!",
                "{enemyName}: Can't kill an idea!",
                "{enemyName}: Freedom burns bright!",
                "{enemyName}: Tyrant's shot? Weak.",
                "{enemyName}: Republic endures!",
                "{enemyName}: Not afraid to die free!",
                "{enemyName}: Your empire crumbles!",
                "{enemyName}: Hit rebel? Expect return!",
                "{enemyName}: Pain is freedom's price.",
                "{enemyName}: Revolution absorbs all!",
                "{enemyName}: That scratch? Nothing.",
                "{enemyName}: For every wound, ten more rise!",
                "{enemyName}: Crown's attack. Futile.",
                "{enemyName}: Freedom worth dying for!",
                "{enemyName}: Rebels don't retreat!",
                "{enemyName}: Tyrant's weapons. Inferior.",
                "{enemyName}: People's will. Unbreakable.",
                "{enemyName}: Hit us? We multiply!",
                "{enemyName}: Revolution unstoppable!",
                "{enemyName}: Empire can't win this!",
                "{enemyName}: Freedom feels no pain!",
                "{enemyName}: That all you got, loyalist?",
                "{enemyName}: Chains off. Fighting back!",
                "{enemyName}: Republic armor. Strong.",
                "{enemyName}: For the cause! Returning fire!",
                "{enemyName}: Rebels don't surrender!",
                "{enemyName}: Your tyranny ends. Soon.",
                "{enemyName}: {separatistSlogan}! We endure!",
                "{enemyName}: Hit noted. Ten returned.",
                "{enemyName}: Freedom fuels our fight!",
                "{enemyName}: Crown falls. We rise.",
                "{enemyName}: Revolution continues! Fire!"
            ],
            separatistDeath: [
                "{enemyName}: Republic— lives on—",
                "{enemyName}: Freedom!—",
                "{enemyName}: Fought for— freedom—",
                "{enemyName}: {separatistSlogan}— always—",
                "{enemyName}: Die— free—",
                "{enemyName}: Cause— endures—",
                "{enemyName}: Others— finish—",
                "{enemyName}: For Republic—",
                "{enemyName}: Not defeated— fallen—",
                "{enemyName}: Remember— us—",
                "{enemyName}: Liberty— eternal—",
                "{enemyName}: Revolution— continues—",
                "{enemyName}: Free— at last—",
                "{enemyName}: Chains— broken—",
                "{enemyName}: For the— people—",
                "{enemyName}: Tyrants— will fall—",
                "{enemyName}: Worth— the sacrifice—",
                "{enemyName}: Republic— remember—",
                "{enemyName}: Others— rise—",
                "{enemyName}: Freedom— never dies—",
                "{enemyName}: Cause— bigger than me—",
                "{enemyName}: For— the fallen—",
                "{enemyName}: {separatistSlogan}— forever—",
                "{enemyName}: Rebels— don't quit—",
                "{enemyName}: Die— defiant—"
            ],
            combatEngage: [
                "{enemyName}: Combat protocols. Weapons hot.",
                "{enemyName}: Target hostile. Engaging.",
                "{enemyName}: In my sights. Won't take long.",
                "{enemyName}: Let's see what you've got.",
                "{enemyName}: Hostile confirmed. Engaging.",
                "{enemyName}: Earning my pay. Target locked.",
                "{enemyName}: Hold it or lose it. Prove yourself.",
                "{enemyName}: Built for war. You're practice.",
                "{enemyName}: Threat detected. Eliminating.",
                "{enemyName}: Weapons primed. Shields won't last.",
                "{enemyName}: You want a fight? Got one.",
                "{enemyName}: Combat systems online.",
                "{enemyName}: Target lock. Opening fire.",
                "{enemyName}: Let's dance, {playerTitle}.",
                "{enemyName}: Another hostile. Weapons free.",
                "{enemyName}: Contact. Engaging.",
                "{enemyName}: Time to work.",
                "{enemyName}: Hostile in range. Firing.",
                "{enemyName}: Combat ship active.",
                "{enemyName}: Here for a fight. Found one.",
                "{enemyName}: Weapons armed. Engaging.",
                "{enemyName}: Target acquired. Fire.",
                "{enemyName}: Combat zone. You're in it.",
                "{enemyName}: Let's do this.",
                "{enemyName}: Hostile tagged. Engaging.",
                "{enemyName}: Ready for combat. Are you?",
                "{enemyName}: Fight's on. No quarter.",
                "{enemyName}: Combat engaged. Good luck.",
                "{enemyName}: Target locked. Here we go.",
                "{enemyName}: Threat in sector. Neutralizing.",
                "{enemyName}: Built for this. Weapons free.",
                "{enemyName}: Combat mode active.",
                "{enemyName}: You're the target. Move.",
                "{enemyName}: Hostile on scope. Engaging.",
                "{enemyName}: This won't take long.",
                "{enemyName}: Ready? Doesn't matter.",
                "{enemyName}: Combat vector. Locked.",
                "{enemyName}: Target painted. Firing.",
                "{enemyName}: Let's fight, {playerTitle}.",
                "{enemyName}: Hostile presence. Engaging.",
                "{enemyName}: Time for combat.",
                "{enemyName}: Weapons hot.",
                "{enemyName}: Target in range. Fire.",
                "{enemyName}: Combat ship. Combat time.",
                "{enemyName}: Let's see your skills."
            ],
            combatRetort: [
                "{enemyName}: That tickled. My turn.",
                "{enemyName}: Regret incoming.",
                "{enemyName}: Damage minimal. Returning fire.",
                "{enemyName}: Better armor than that.",
                "{enemyName}: Hit like a freighter. Watch this.",
                "{enemyName}: Shields holding. Yours?",
                "{enemyName}: That's it? Expected more.",
                "{enemyName}: Warning to kill. Upgraded.",
                "{enemyName}: Retaliating full force.",
                "{enemyName}: Combat ships don't go easy.",
                "{enemyName}: Nice try. My turn.",
                "{enemyName}: Felt that. You'll feel this.",
                "{enemyName}: Now you made me angry.",
                "{enemyName}: Good hit. Last one.",
                "{enemyName}: Armor took it. Returning fire.",
                "{enemyName}: Hit noted. Counter-strike.",
                "{enemyName}: That scratch? Cute.",
                "{enemyName}: Combat damage. Negligible.",
                "{enemyName}: Returning with interest.",
                "{enemyName}: My turn. Your problem.",
                "{enemyName}: Nice shot. Bad choice.",
                "{enemyName}: Damage? Barely. Watch this.",
                "{enemyName}: Combat response. Incoming.",
                "{enemyName}: You woke me up. Bad idea.",
                "{enemyName}: Hit hard? I hit harder.",
                "{enemyName}: That all? Disappointing.",
                "{enemyName}: Armor works. Yours won't.",
                "{enemyName}: Combat tested. You're not.",
                "{enemyName}: Scorch mark? Cute. Die.",
                "{enemyName}: Returning fire. Full force.",
                "{enemyName}: Hit me? Your funeral.",
                "{enemyName}: Combat retaliation. Active.",
                "{enemyName}: Damage absorbed. Your turn.",
                "{enemyName}: That was your chance.",
                "{enemyName}: Now I'm interested.",
                "{enemyName}: Nice try, {playerTitle}. Fail.",
                "{enemyName}: Combat response engaged.",
                "{enemyName}: Hit confirmed. Return confirmed.",
                "{enemyName}: Armor holding. Fight on.",
                "{enemyName}: You wanted a fight. Got one."
            ],
            combatDeath: [
                "{enemyName}: Systems— failing—",
                "{enemyName}: Hull breach— done—",
                "{enemyName}: Earned— this one—",
                "{enemyName}: Critical— ejecting—",
                "{enemyName}: Didn't— see that—",
                "{enemyName}: Reactor— overload—",
                "{enemyName}: Not bad— for a {playerShip}—",
                "{enemyName}: Isn't— over—",
                "{enemyName}: Good— fight—",
                "{enemyName}: Better— than expected—",
                "{enemyName}: Combat— over—",
                "{enemyName}: Well— fought—",
                "{enemyName}: Respectable— kill—",
                "{enemyName}: Going— down—",
                "{enemyName}: Fought— hard—",
                "{enemyName}: Systems— offline—",
                "{enemyName}: You— won—",
                "{enemyName}: Not— bad—",
                "{enemyName}: Combat— finished—",
                "{enemyName}: Good— shot—",
                "{enemyName}: Earned— it—",
                "{enemyName}: Hull— gone—",
                "{enemyName}: Final— combat—",
                "{enemyName}: Reactor— critical—",
                "{enemyName}: Well— played—"
            ],
            imperialMotivation: [
                "Imperial Command: {playerTitle}, exemplary service!",
                "Crown Fleet: Glory to Empire! Strong work.",
                "Imperial Dispatch: Emperor watches with pride.",
                "{imperialRank}: Unwavering loyalty. Press on!",
                "Imperial HQ: You embody Imperial spirit.",
                "Crown Intel: Serving Imperial unity well.",
                "Imperial Fleet: Flying true, {playerTitle}.",
                "{imperialRank}: Empire grows stronger.",
                "Imperial Command: Crown inspired by you.",
                "Crown Fleet: For the Emperor!",
                "Imperial Dispatch: Crown salutes you.",
                "{imperialRank}: Imperial excellence shown.",
                "Imperial HQ: Proud of your victories.",
                "Crown Fleet: Long may you serve!",
                "{imperialRank}: The Emperor approves.",
                "Imperial Command: Crown honors your valor.",
                "Crown Intel: Making the Empire proud.",
                "Imperial Fleet: True Imperial warrior.",
                "{imperialRank}: Emperor smiles upon you.",
                "Imperial HQ: Crown commends your service.",
                "Crown Fleet: Glory to the Crown!",
                "Imperial Dispatch: Imperial spirit burns bright.",
                "{imperialRank}: Worthy of Imperial honor.",
                "Imperial Command: Empire stronger with you.",
                "Crown Intel: Imperial excellence personified.",
                "Imperial Fleet: Crown fleet celebrates!",
                "{imperialRank}: Service beyond reproach.",
                "Imperial HQ: Emperor's chosen warrior.",
                "Crown Fleet: Long live the Empire!",
                "{imperialRank}: Imperial blood runs true.",
                "Imperial Command: Crown's finest, {playerTitle}.",
                "Crown Intel: Making history for Empire.",
                "Imperial Fleet: Imperial legend grows.",
                "{imperialRank}: Emperor's pride incarnate.",
                "Imperial HQ: The Crown remembers this.",
                "Crown Fleet: Imperial might displayed!",
                "{imperialRank}: Serving with distinction.",
                "Imperial Command: Crown's champion flies.",
                "Crown Intel: Empire celebrates you!",
                "Imperial Fleet: For Emperor and Crown!"
            ],
            militaryMotivation: [
                "Naval Command: Tactical prowess, {playerTitle}!",
                "{militaryUnit}: Outstanding performance!",
                "Military HQ: Defenses strengthened.",
                "Fleet Ops: Exemplary record. Continue.",
                "{militaryUnit}: Best of military discipline.",
                "Naval Intel: Borders secured.",
                "Military Command: Beacon of might.",
                "{militaryUnit}: Commendable duty. Press on!",
                "Fleet Command: Victories bolster security.",
                "Military Ops: Spirit of the fleet.",
                "Naval Command: Fleet proud of you.",
                "{militaryUnit}: Excellent work out there.",
                "Fleet Ops: Mission accomplished, {playerTitle}.",
                "Military HQ: Strong performance noted.",
                "{militaryUnit}: Keep up the good fight.",
                "Naval Command: Naval excellence displayed!",
                "Military Intel: Sector secured.",
                "Fleet Command: Outstanding combat record.",
                "{militaryUnit}: Military precision shown.",
                "Military HQ: Fleet commends you.",
                "Naval Ops: Tactical mastery evident.",
                "{militaryUnit}: Serving with honor.",
                "Fleet Command: Naval pride of the fleet.",
                "Military Command: Exceptional service.",
                "Naval Intel: Combat mastery confirmed.",
                "{militaryUnit}: Fleet backbone, {playerTitle}.",
                "Military HQ: Defending borders well.",
                "Fleet Ops: Military excellence shown.",
                "Naval Command: Pride of the navy.",
                "{militaryUnit}: Combat veteran material.",
                "Military Intel: Threat response perfect.",
                "Fleet Command: Naval legend in making.",
                "{militaryUnit}: Fleet's finest hour.",
                "Military HQ: Combat prowess noted.",
                "Naval Ops: Military honor upheld.",
                "Fleet Command: Outstanding work!",
                "{militaryUnit}: Naval discipline shown.",
                "Military Command: Fleet celebrates you!",
                "Naval Intel: Combat record exemplary.",
                "{militaryUnit}: Military pride of sector."
            ],
            separatistMotivation: [
                "Republic Council: Fight inspires the people!",
                "Freedom Forces: Closer to liberty!",
                "{separatistSlogan}! Courage strengthens us.",
                "Separatist Command: True champion, {playerTitle}!",
                "Freedom Fleet: Tyranny remembers defeat.",
                "Republic Intel: Dedication unwavering.",
                "{separatistSlogan}! Heart of a true rebel.",
                "Separatist HQ: Flying proudly for freedom.",
                "Republic Forces: Service is legendary.",
                "Freedom Command: Oppressors will fall!",
                "{separatistSlogan}! Victory is near.",
                "Republic Council: People stand with you.",
                "Freedom Fleet: Hope burns bright.",
                "Separatist Command: Keep fighting!",
                "{separatistSlogan}! Liberty endures.",
                "Republic Forces: Revolution grows stronger!",
                "Freedom Command: Tyrants tremble!",
                "{separatistSlogan}! People's champion!",
                "Separatist HQ: Freedom fighter supreme.",
                "Republic Intel: Courage inspires all.",
                "Freedom Fleet: Liberation near!",
                "{separatistSlogan}! Revolution unstoppable!",
                "Republic Council: Hero of the people!",
                "Separatist Command: Chains breaking!",
                "Freedom Forces: Tyranny crumbles!",
                "{separatistSlogan}! Hope lives on!",
                "Republic HQ: Freedom's champion.",
                "Freedom Intel: Revolution strengthened.",
                "{separatistSlogan}! People rejoice!",
                "Separatist Fleet: Rebel legend grows.",
                "Republic Forces: True revolutionary spirit!",
                "Freedom Command: Liberty prevails!",
                "{separatistSlogan}! Striking for freedom!",
                "Separatist HQ: Courage of the republic.",
                "Republic Council: People inspired!",
                "Freedom Fleet: Rebel pride!",
                "{separatistSlogan}! Fight continues!",
                "Separatist Command: Revolutionary excellence!",
                "Republic Intel: Freedom burns bright!",
                "Freedom Forces: {playerTitle} leads the way!"
            ],
            policeMotivation: [
                "Police HQ: Order maintained, {playerTitle}.",
                "Law Enforcement: Justice exemplified.",
                "Police Command: Sectors kept safe.",
                "Justice Division: Law upheld.",
                "Police Fleet: Guardian of peace.",
                "Law Enforcement HQ: Authority strengthened.",
                "Police Ops: Vigilance protects lives.",
                "Justice Command: Principles embodied.",
                "Police HQ: Service commendable.",
                "Law Division: Peace enforced.",
                "Police Command: Well done, {playerTitle}.",
                "Justice Division: Order preserved.",
                "Law Enforcement: Excellent patrol work.",
                "Police Fleet: Criminals beware.",
                "Police Ops: Keeping the peace.",
                "Police HQ: Justice served well.",
                "Law Enforcement: Law prevails.",
                "Police Command: Streets safer.",
                "Justice Division: Crime deterred.",
                "Police Fleet: Order maintained.",
                "Law Division: Peace keeping excellence.",
                "Police Ops: Vigilant guardian.",
                "Police HQ: Community protected.",
                "Law Enforcement: Justice champion.",
                "Police Command: Outstanding patrol.",
                "Justice Division: Law respected.",
                "Police Fleet: Safety ensured.",
                "Law Division: Order restored.",
                "Police Ops: Crime prevented.",
                "Police HQ: Duty fulfilled.",
                "Law Enforcement: Peace enforced well.",
                "Police Command: {playerTitle}, excellent work.",
                "Justice Division: Authority maintained.",
                "Police Fleet: Criminals flee.",
                "Law Division: Justice prevails.",
                "Police Ops: Guardian of law.",
                "Police HQ: Safety secured.",
                "Law Enforcement: Order champion.",
                "Police Command: Peace prevails.",
                "Justice Division: Law enforced."
            ],
            // Gloating messages when player is dying
            pirateGloat: [
                "{enemyName}: Going down, {playerTitle}!",
                "{enemyName}: Should've paid the toll!",
                "{enemyName}: All that cargo, ours now!",
                "{enemyName}: Easy pickings!",
                "{enemyName}: Bye bye, {playerShip}!",
                "{enemyName}: {pirateGroup} wins again!",
                "{enemyName}: That's what you get!",
                "{enemyName}: Another wreck for salvage!",
                "{enemyName}: Did you really think...?",
                "{enemyName}: Too slow, {pirateInsult}!",
                "{enemyName}: Burn, baby!",
                "{enemyName}: {pirateGroup} sends regards!",
                "{enemyName}: Hull's cracking! Love it!",
                "{enemyName}: Should've run when you could!",
                "{enemyName}: Payday!",
                "{enemyName}: Cargo's ours now!",
                "{enemyName}: Enjoy the void!",
                "{enemyName}: {playerShip} scrap incoming!",
                "{enemyName}: Too easy, {playerTitle}!",
                "{enemyName}: {pirateGroup} claims another!",
                "{enemyName}: Shouldn't have fought back!",
                "{enemyName}: Wreckage looks profitable!",
                "{enemyName}: Another victim!",
                "{enemyName}: Your mistake, our profit!",
                "{enemyName}: Burning nicely!",
                "{enemyName}: {pirateGroup} never loses!",
                "{enemyName}: Hull's gone! Love it!",
                "{enemyName}: Should've listened!",
                "{enemyName}: Big payday!",
                "{enemyName}: Cargo secured!",
                "{enemyName}: That's what defiance costs!",
                "{enemyName}: Another kill for {pirateGroup}!",
                "{enemyName}: Picked the wrong fight!",
                "{enemyName}: Salvage crew's gonna love this!",
                "{enemyName}: {playerTitle}'s done for!",
                "{enemyName}: Easy credits!",
                "{enemyName}: Should've just paid up!",
                "{enemyName}: {pirateGroup} strikes again!",
                "{enemyName}: Watch it burn!",
                "{enemyName}: Another notch on the hull!"
            ],
            imperialGloat: [
                "{enemyName}: The Empire prevails!",
                "{enemyName}: Bow before the Crown!",
                "{enemyName}: Imperial justice served!",
                "{enemyName}: Traitor falls!",
                "{enemyName}: The Emperor's will!",
                "{enemyName}: For the glory of the Empire!",
                "{enemyName}: No escape from Imperial wrath!",
                "{enemyName}: Rebel scum eliminated!",
                "{enemyName}: Crown victorious!",
                "{enemyName}: {imperialRank} claims another!",
                "{enemyName}: Kneel before you burn!",
                "{enemyName}: Empire eternal!",
                "{enemyName}: Crown never fails!",
                "{enemyName}: Imperial might triumphs!",
                "{enemyName}: Emperor's judgment!",
                "{enemyName}: Down with traitors!",
                "{enemyName}: Imperial supremacy!",
                "{enemyName}: Crown's vengeance!",
                "{enemyName}: For His Majesty!",
                "{enemyName}: Empire claims victory!",
                "{enemyName}: Rebellion crushed!",
                "{enemyName}: Imperial power!",
                "{enemyName}: Crown's justice swift!",
                "{enemyName}: Emperor smiles!",
                "{enemyName}: Traitor eliminated!",
                "{enemyName}: Long live the Empire!",
                "{enemyName}: Crown triumphant!",
                "{enemyName}: Imperial strike!",
                "{enemyName}: For the Crown!",
                "{enemyName}: Empire's glory!"
            ],
            separatistGloat: [
                "{enemyName}: Freedom wins!",
                "{enemyName}: Tyrant falls!",
                "{enemyName}: For the Republic!",
                "{enemyName}: {separatistSlogan}!",
                "{enemyName}: Down with oppressors!",
                "{enemyName}: People's victory!",
                "{enemyName}: Another crown dog gone!",
                "{enemyName}: Liberty triumphs!",
                "{enemyName}: This is revolution!",
                "{enemyName}: Empire crumbles!",
                "{enemyName}: Free systems prevail!",
                "{enemyName}: No more tyrants!",
                "{enemyName}: Revolution victorious!",
                "{enemyName}: Chains broken!",
                "{enemyName}: Freedom claims another!",
                "{enemyName}: People rejoice!",
                "{enemyName}: Tyranny ends!",
                "{enemyName}: Revolution unstoppable!",
                "{enemyName}: Crown falls!",
                "{enemyName}: {separatistSlogan} forever!",
                "{enemyName}: Liberty strikes!",
                "{enemyName}: People prevail!",
                "{enemyName}: Empire burns!",
                "{enemyName}: Freedom's fury!",
                "{enemyName}: Republic rises!",
                "{enemyName}: Tyrants tremble!",
                "{enemyName}: Rebel victory!",
                "{enemyName}: Crown crumbles!",
                "{enemyName}: Independence!",
                "{enemyName}: Free at last!"
            ],
            militaryGloat: [
                "{enemyName}: Target eliminated.",
                "{enemyName}: Hostile neutralized.",
                "{enemyName}: Mission accomplished.",
                "{enemyName}: {militaryUnit} confirms kill.",
                "{enemyName}: Threat removed.",
                "{enemyName}: Clean kill.",
                "{enemyName}: Target down. Moving on.",
                "{enemyName}: Hostile destroyed.",
                "{enemyName}: That's how it's done.",
                "{enemyName}: Fleet superiority confirmed.",
                "{enemyName}: No contest.",
                "{enemyName}: Superior firepower wins.",
                "{enemyName}: Combat objective achieved.",
                "{enemyName}: Hostile terminated.",
                "{enemyName}: {militaryUnit} victory.",
                "{enemyName}: Target neutralized.",
                "{enemyName}: Tactical success.",
                "{enemyName}: Mission complete.",
                "{enemyName}: {militaryUnit} claims kill.",
                "{enemyName}: Threat eliminated.",
                "{enemyName}: Precision strike.",
                "{enemyName}: Hostile down.",
                "{enemyName}: Military efficiency.",
                "{enemyName}: Fleet wins.",
                "{enemyName}: Target destroyed.",
                "{enemyName}: Naval superiority.",
                "{enemyName}: Combat complete.",
                "{enemyName}: {militaryUnit} prevails.",
                "{enemyName}: Threat down.",
                "{enemyName}: Military victory."
            ],
            combatGloat: [
                "{enemyName}: Too easy.",
                "{enemyName}: You call that a fight?",
                "{enemyName}: Should've stayed docked.",
                "{enemyName}: Another one down.",
                "{enemyName}: Not even close.",
                "{enemyName}: That all you had?",
                "{enemyName}: Better luck next life.",
                "{enemyName}: Outclassed.",
                "{enemyName}: Nice try, {playerTitle}.",
                "{enemyName}: Combat ship wins. Always.",
                "{enemyName}: Weak.",
                "{enemyName}: Over already?",
                "{enemyName}: Barely a challenge.",
                "{enemyName}: Expected more.",
                "{enemyName}: Practice target.",
                "{enemyName}: Easy kill.",
                "{enemyName}: Not your day.",
                "{enemyName}: Combat skill wins.",
                "{enemyName}: Another kill.",
                "{enemyName}: Too slow.",
                "{enemyName}: Didn't stand a chance.",
                "{enemyName}: Outgunned.",
                "{enemyName}: Should've run.",
                "{enemyName}: Amateur.",
                "{enemyName}: Combat over.",
                "{enemyName}: That was fast.",
                "{enemyName}: No challenge.",
                "{enemyName}: {playerShip} down.",
                "{enemyName}: Easy fight.",
                "{enemyName}: Next?"
            ],
            policeGloat: [
                "{enemyName}: Justice served!",
                "{enemyName}: That's what happens.",
                "{enemyName}: Should've surrendered.",
                "{enemyName}: Law wins.",
                "{enemyName}: Crime doesn't pay.",
                "{enemyName}: Resisting was foolish.",
                "{enemyName}: {policeCharge} enforced.",
                "{enemyName}: Order restored.",
                "{enemyName}: Don't break the law.",
                "{enemyName}: Threat neutralized.",
                "{enemyName}: You brought this on yourself.",
                "{enemyName}: Case closed.",
                "{enemyName}: Justice prevails!",
                "{enemyName}: Law enforced.",
                "{enemyName}: Criminal eliminated.",
                "{enemyName}: Peace restored.",
                "{enemyName}: Should've complied.",
                "{enemyName}: Authority wins.",
                "{enemyName}: Crime stopped.",
                "{enemyName}: Order maintained.",
                "{enemyName}: Fugitive down.",
                "{enemyName}: Justice complete.",
                "{enemyName}: Law triumphant.",
                "{enemyName}: Crime never wins.",
                "{enemyName}: Peace keeper wins.",
                "{enemyName}: {policeCharge} resolved.",
                "{enemyName}: Safety ensured.",
                "{enemyName}: Criminal stopped.",
                "{enemyName}: Justice done.",
                "{enemyName}: Law prevails."
            ],
            alienGloat: [
                "⟟⟊⟒ ✦✦✦!", "҉҉҉ ᚠᛇᚻ!", "彗彗彗 ∴!", "◬⟁◬!", "ᛝᛝᛝ ☼!",
                "⌬⌬⌬ ⟟⟊⟒!", "₪₪₪!", "∿∿∿ ✦!", "⟴⟴⟴!", "▣▢▣!",
                "ζ≀ζ ✦!", "ᚷᛟᚾ!", "☍☌☍!", "∰⟴ ⟟!", "彡彡彡!",
                "ᛣᛣᛣ ✦!", "𓆣𓆣𓆣!", "ƛƛƛ ∴!", "⊑⟟⊑!", "ᚺᚨᛚ!",
                "¤¤¤ ☼!", "Ѫ Ѫ Ѫ!", "ϟϟϟ ✦!", "⋇⋇⋇!", "⟁⟁⟁!",
                "ζ≀ζ≀ζ!", "∿∿ ✦!", "◯◯◯!", "₪ ᚺ ₪!", "彗 ✦ 彗!"
            ],
            guardGloat: [
                "{enemyName}: Threat to {guardPrincipal} eliminated.",
                "{enemyName}: {guardPrincipal} safe. You're not.",
                "{enemyName}: Should've walked away.",
                "{enemyName}: That's for threatening {guardPrincipal}.",
                "{enemyName}: Job done.",
                "{enemyName}: Don't mess with my charge.",
                "{enemyName}: Security protocol complete.",
                "{enemyName}: {guardPrincipal} sends regards.",
                "{enemyName}: Wrong target to pick.",
                "{enemyName}: Escort duty fulfilled.",
                "{enemyName}: Threat neutralized.",
                "{enemyName}: {guardPrincipal} protected.",
                "{enemyName}: Security complete.",
                "{enemyName}: Don't threaten my principal.",
                "{enemyName}: Contract fulfilled.",
                "{enemyName}: Guard wins.",
                "{enemyName}: {guardPrincipal} still breathing. You're not.",
                "{enemyName}: Security successful.",
                "{enemyName}: Bad choice, attacker.",
                "{enemyName}: Protection confirmed.",
                "{enemyName}: Escort wins.",
                "{enemyName}: {guardPrincipal} owes me a bonus.",
                "{enemyName}: Threat down.",
                "{enemyName}: Security professional.",
                "{enemyName}: Contract complete.",
                "{enemyName}: Don't target my charge.",
                "{enemyName}: Guard duty done.",
                "{enemyName}: {guardPrincipal} appreciates this.",
                "{enemyName}: Hostile eliminated.",
                "{enemyName}: That's my job."
            ],
            // Repair ships - wanting to be left alone
            repairPleas: [
                "{enemyName}: We're repair crew! Back off!",
                "{enemyName}: Non-combatant here! Cease fire!",
                "{enemyName}: Just doing maintenance! Leave us alone!",
                "{enemyName}: Repair tender! No weapons here!",
                "{enemyName}: We fix things, not fight them!",
                "{enemyName}: Service vessel! Stand down!",
                "{enemyName}: Field repairs only! Not a threat!",
                "{enemyName}: Maintenance crew! We're unarmed!",
                "{enemyName}: Emergency repairs in progress! Go away!",
                "{enemyName}: Hull patches don't stop lasers! Please!",
                "{enemyName}: We're support, not combat!",
                "{enemyName}: Repair drone carrier! No hostiles!",
                "{enemyName}: Just welding hulls here! Back off!",
                "{enemyName}: Station maintenance! Let us work!",
                "{enemyName}: Work order in progress! Leave!",
                "{enemyName}: Service contract active! Disengage!",
                "{enemyName}: We keep ships flying! Don't shoot!",
                "{enemyName}: Repair bay open! Not hostile!",
                "{enemyName}: Technical crew! Cease fire!",
                "{enemyName}: Field mechanic here! Stand down!",
                "{enemyName}: Patching hulls, not fighting!",
                "{enemyName}: Repair tender on duty! Back away!",
                "{enemyName}: We're the cleanup crew! Not targets!",
                "{enemyName}: Station sent us! We're authorized!",
                "{enemyName}: Support vessel! Leave us be!",
                "{enemyName}: Maintenance contract! Disengage!",
                "{enemyName}: We're here to help! Stop shooting!",
                "{enemyName}: Repair schedule tight! Don't delay us!",
                "{enemyName}: Service crew! We're neutral!",
                "{enemyName}: Field repairs! Not your enemy!",
                "{enemyName}: Hull integrity low enough! Please stop!",
                "{enemyName}: Repair drones active! Not weapons!",
                "{enemyName}: Maintenance vessel! Just leave!",
                "{enemyName}: We fix combat damage! Don't add to it!",
                "{enemyName}: Tender crew! We're non-combat!",
                "{enemyName}: Service bay active! Go find someone else!",
                "{enemyName}: Unarmed repair ship! Back off!",
                "{enemyName}: Just a support vessel! Please!",
                "{enemyName}: Fixing the station! Let us work!",
                "{enemyName}: Engineering crew! Cease fire!",
                "{enemyName}: We're not worth the ammo!",
                "{enemyName}: Repair manifest active! Leave!",
                "{enemyName}: Technical support only! Stand down!",
                "{enemyName}: Hull patchers, not fighters!",
                "{enemyName}: Service tender on contract! Go away!"
            ],
            repairDeath: [
                "{enemyName}: Hull— patches— failing—",
                "{enemyName}: Repair— bay— breached—",
                "{enemyName}: Service— crew— down—",
                "{enemyName}: Just— maintenance—",
                "{enemyName}: Work— order— incomplete—",
                "{enemyName}: Tender— lost—",
                "{enemyName}: We— weren't— armed—",
                "{enemyName}: Why— target— support—",
                "{enemyName}: Repair— drones— offline—",
                "{enemyName}: Station— we're down—",
                "{enemyName}: Service— terminated—",
                "{enemyName}: Maintenance— failed—",
                "{enemyName}: Hull— integrity— gone—",
                "{enemyName}: Crew— evacuating—",
                "{enemyName}: Repair— contract— void—",
                "{enemyName}: Engineering— critical—",
                "{enemyName}: Support— vessel— lost—",
                "{enemyName}: Just— wanted— to help—",
                "{enemyName}: Tender— crew— sorry—",
                "{enemyName}: Service— bay— destroyed—",
                "{enemyName}: We— weren't— combat—",
                "{enemyName}: Repair— systems— failing—",
                "{enemyName}: Maintenance— over—",
                "{enemyName}: What a— waste—",
                "{enemyName}: Just— a tender—"
            ]
        };
    }

    initialize({ uiManager, player } = {}) {
        if (uiManager) this.uiManager = uiManager;
        if (player) this.player = player;
    }

    setUIManager(uiManager) {
        this.uiManager = uiManager;
    }

    setPlayer(player) {
        this.player = player;
    }

    /**
     * Initialize speech synthesis with p5.Speech
     * Should be called after p5 is ready
     */
    initializeSpeech() {
        // Clean up any existing speech first
        this.cleanupSpeech();

        if (typeof p5 === 'undefined' || typeof p5.Speech === 'undefined') {
            console.warn('CommunicationSystem: p5.Speech not available');
            this._speechEnabled = false;
            return;
        }

        try {
            this._speech = new p5.Speech();
            this._speech.setVolume(0.45); // Background context volume
            this._speech.interrupt = false; // Queue mode

            // When speech ends, process next in queue
            this._speech.onEnd = () => {
                this._isSpeaking = false;
                this._processQueue();
            };

            // Voices load asynchronously - use onLoad to confirm ready
            this._speech.onLoad = () => {
                this._speechEnabled = true;
                this._buildVoicePools();
                console.log('CommunicationSystem: Speech voices loaded via onLoad callback');
            };

            // CRITICAL FIX: onvoiceschanged only fires ONCE per window lifetime.
            // If this is a second p5.Speech instance (after game reset), voices
            // are already available but onLoad will never be called.
            // Check if voices are already available and manually initialize.
            const existingVoices = window.speechSynthesis?.getVoices();
            if (existingVoices && existingVoices.length > 0) {
                // Voices already loaded from previous session
                this._speech.voices = existingVoices;
                this._speech.isLoaded = 1;
                this._speechEnabled = true;

                // ALSO bind utterance callbacks that p5.speech normally sets in onvoiceschanged
                // Without this, onEnd never fires and queue gets stuck
                const speech = this._speech;
                speech.utterance.onend = (e) => {
                    if (speech.onEnd) speech.onEnd(e);
                };
                speech.utterance.onstart = (e) => {
                    if (speech.onStart) speech.onStart(e);
                };

                console.log('CommunicationSystem: Speech voices already available (reused from previous session)');
                this._buildVoicePools();
            } else {
                // First load - wait for onLoad callback
                this._speechEnabled = true;
                console.log('CommunicationSystem: Speech synthesis initialized (waiting for voices)');
            }
        } catch (e) {
            console.warn('CommunicationSystem: Failed to initialize speech', e);
            this._speechEnabled = false;
        }
    }

    /**
     * Clean up speech synthesis - stop any active speech and clear queue
     * Should be called before game reset or when cleaning up resources
     */
    cleanupSpeech() {
        // Stop any active speech and null the reference
        if (this._speech) {
            try {
                this._speech.cancel();
            } catch (e) {
                // Ignore errors during cleanup
            }
            this._speech = null;
        }

        // Clear the queue and state
        this._speechQueue = [];
        this._isSpeaking = false;
        this._speechEnabled = false;

        // Clear voice cache if it exists
        if (this._voiceByEnemy) {
            this._voiceByEnemy.clear();
        }

        // Clear cached voice pools
        this._voicePools = null;

        console.log('CommunicationSystem: Speech cleaned up');
    }

    /**
     * Build cached voice pools by language/region
     * Called once when voices are loaded to avoid re-filtering on every voice selection
     */
    _buildVoicePools() {
        if (!this._speech || !this._speech.voices || this._speech.voices.length === 0) {
            this._voicePools = null;
            return;
        }

        const voices = this._speech.voices;

        // Build voice pools by language
        const usVoices = voices.filter(v => v.lang && v.lang.startsWith('en-US'));
        const ukVoices = voices.filter(v => v.lang && v.lang.startsWith('en-GB'));
        const ruVoices = voices.filter(v => v.lang && v.lang.startsWith('ru'));
        const anyEnglishVoices = voices.filter(v => v.lang && v.lang.startsWith('en'));
        const nonEnglishVoices = voices.filter(v =>
            v.lang && !v.lang.startsWith('en-') && v.lang !== 'en'
        );

        this._voicePools = {
            us: usVoices.length > 0 ? usVoices : anyEnglishVoices,
            uk: ukVoices.length > 0 ? ukVoices : anyEnglishVoices,
            ru: ruVoices.length > 0 ? ruVoices : voices,
            nonEnglish: nonEnglishVoices.length > 0 ? nonEnglishVoices : voices,
            all: voices
        };

        console.log(`CommunicationSystem: Voice pools built - US:${this._voicePools.us.length}, UK:${this._voicePools.uk.length}, RU:${this._voicePools.ru.length}, NonEng:${this._voicePools.nonEnglish.length}`);
    }

    /**
     * Get the voice profile key for an enemy based on role and faction
     * @param {Object} enemy - The enemy to get profile for
     * @returns {string} Profile key (role or faction name)
     */
    _getVoiceProfileKey(enemy) {
        if (!enemy) return 'default';

        // For Combat role, use faction-specific profile if available
        if (enemy.role === 'Combat' && enemy.faction) {
            if (this._roleVoiceProfiles[enemy.faction]) {
                return enemy.faction;
            }
        }

        // Use role-based profile
        if (enemy.role && this._roleVoiceProfiles[enemy.role]) {
            return enemy.role;
        }

        return 'default';
    }

    /**
     * Find a suitable voice matching the desired gender and role
     * Uses role-specific language preferences:
     * - Military: American English (en-US)
     * - Police: British English (en-GB)
     * - Others: Non-English voices for sci-fi intercom feel
     * @param {string} gender - 'male' or 'female'
     * @param {string} role - The AI role (e.g., 'Police', 'Combat' with MILITARY faction)
     * @param {string} faction - The faction if applicable
     * @returns {number} Voice index to use
     */
    _selectVoiceForGender(gender, role, faction) {
        if (!this._speech || !this._speech.voices || this._speech.voices.length === 0) {
            return 0;
        }

        const voices = this._speech.voices;
        let voicesToSearch;

        // Use cached voice pools if available, otherwise fall back to all voices
        if (this._voicePools) {
            // Determine language preference based on role/faction
            const isMilitary = role === 'Combat' && faction === 'MILITARY';
            const isImperial = faction === 'IMPERIAL';
            const isSeparatist = faction === 'SEPARATIST';
            const isPolice = role === 'Police';

            if (isMilitary) {
                voicesToSearch = this._voicePools.us;
            } else if (isImperial || isPolice) {
                voicesToSearch = this._voicePools.uk;
            } else if (isSeparatist) {
                voicesToSearch = this._voicePools.ru;
            } else {
                voicesToSearch = this._voicePools.nonEnglish;
            }
        } else {
            // Fallback if pools not built yet
            voicesToSearch = voices;
        }

        // Fallback to all voices if pool is empty
        if (!voicesToSearch || voicesToSearch.length === 0) {
            voicesToSearch = this._voicePools?.all || voices;
        }

        // Try to find voices matching gender by name heuristics
        const genderMatched = voicesToSearch.filter(v => {
            const name = v.name.toLowerCase();
            if (gender === 'female') {
                // Female name patterns
                return name.includes('female') || name.includes('woman') ||
                    name.includes('anna') || name.includes('maria') ||
                    name.includes('elena') || name.includes('yuki') ||
                    name.includes('mei') || name.includes('sara') ||
                    name.includes('lucia') || name.includes('amélie') ||
                    name.includes('ingrid') || name.includes('karin') ||
                    name.includes('paulina') || name.includes('yelena') ||
                    name.includes('samantha') || name.includes('kate') ||
                    name.includes('victoria') || name.includes('emily') ||
                    name.includes('allison') || name.includes('susan');
            } else {
                // Male name patterns
                return name.includes('male') || name.includes('man') ||
                    name.includes('yuri') || name.includes('ivan') ||
                    name.includes('hans') || name.includes('jorge') ||
                    name.includes('thomas') || name.includes('diego') ||
                    name.includes('luca') || name.includes('henrik') ||
                    name.includes('carlos') || name.includes('nicolas') ||
                    name.includes('alex') || name.includes('daniel') ||
                    name.includes('david') || name.includes('james') ||
                    name.includes('tom') || name.includes('aaron');
            }
        });

        // Pick from gender-matched voices if available, otherwise any from language pool
        const candidates = genderMatched.length > 0 ? genderMatched : voicesToSearch;
        const selectedVoice = candidates[Math.floor(Math.random() * candidates.length)];

        // Return the index in the original voices array
        return voices.indexOf(selectedVoice);
    }

    /**
     * Queue a message to be spoken with a voice assigned to the enemy
     * Uses role-based voice profiles and gender-aware voice selection
     * @param {string} message - The message to speak
     * @param {Object} enemy - The enemy ship sending the message (for voice assignment)
     */
    _queueSpeech(message, enemy) {
        if (!this._speechEnabled || !this._speech || !this._speech.isLoaded) {
            return;
        }

        // Clean up extra whitespace but keep all characters (including alien symbols)
        // The speech synthesizer will attempt to speak them or skip unpronounceables
        let cleanMessage = message.replace(/\s+/g, ' ').trim();

        // Remove pilot/ship name prefix (e.g., "Viper:" or "Patrol P-42:" at the start)
        // This strips everything before the first colon if it looks like a name prefix
        cleanMessage = cleanMessage.replace(/^[^:]{1,40}:\s*/, '');

        if (!cleanMessage) {
            return;
        }

        // Get or create voice profile for this enemy
        let voiceProfile = null;
        if (enemy) {
            const enemyKey = this._getEnemyKey(enemy);
            if (enemyKey) {
                if (!this._voiceByEnemy.has(enemyKey)) {
                    // Determine profile based on role/faction
                    const profileKey = this._getVoiceProfileKey(enemy);
                    const profile = this._roleVoiceProfiles[profileKey] || this._roleVoiceProfiles['default'];

                    // Get gender-specific settings
                    const gender = enemy.gender || 'male';
                    const genderProfile = profile[gender] || profile['male'];

                    // Select a voice matching the gender and role
                    const voiceIndex = this._selectVoiceForGender(gender, enemy.role, enemy.faction);

                    // Generate fixed pitch/rate within profile range for this enemy
                    const pitch = genderProfile.pitchMin + Math.random() * (genderProfile.pitchMax - genderProfile.pitchMin);
                    const rate = genderProfile.rateMin + Math.random() * (genderProfile.rateMax - genderProfile.rateMin);

                    // Cache the complete voice profile for this enemy
                    this._voiceByEnemy.set(enemyKey, {
                        voiceIndex,
                        pitch,
                        rate,
                        role: enemy.role,
                        gender
                    });
                }
                voiceProfile = this._voiceByEnemy.get(enemyKey);
            }
        }

        // Fallback for non-enemy messages
        if (!voiceProfile) {
            const voiceCount = this._speech.voices?.length || 10;
            voiceProfile = {
                voiceIndex: Math.floor(Math.random() * voiceCount),
                pitch: 0.9 + Math.random() * 0.2,
                rate: 0.9 + Math.random() * 0.2,
                role: null,
                gender: 'male'
            };
        }

        // Add to queue with full voice profile
        this._speechQueue.push({
            message: cleanMessage,
            voiceIndex: voiceProfile.voiceIndex,
            pitch: voiceProfile.pitch,
            rate: voiceProfile.rate
        });

        // Start processing if not already speaking
        this._processQueue();
    }

    /**
     * Process the speech queue - speak the next message if not already speaking
     */
    _processQueue() {
        if (this._isSpeaking || this._speechQueue.length === 0) {
            return;
        }

        if (!this._speech || !this._speech.isLoaded) {
            return;
        }

        const item = this._speechQueue.shift();
        this._isSpeaking = true;

        // Play radio static at start of transmission
        if (typeof soundManager !== 'undefined' && soundManager.playSound) {
            soundManager.playSound('radioStaticStart');
        }

        // Set voice and profile for this message
        try {
            this._speech.setVoice(item.voiceIndex);
            this._speech.setRate(item.rate);
            this._speech.setPitch(item.pitch);

            // Store reference to play end static when speech completes
            const originalOnEnd = this._speech.onEnd;
            const self = this;
            this._speech.onEnd = function () {
                // Play radio static at end of transmission
                if (typeof soundManager !== 'undefined' && soundManager.playSound) {
                    soundManager.playSound('radioStaticEnd');
                }

                self._isSpeaking = false;
                // Restore and call original onEnd handler
                self._speech.onEnd = originalOnEnd;
                self._processQueue();
            };

            // Speak the message
            this._speech.speak(item.message);
        } catch (e) {
            console.warn('CommunicationSystem: Speech error', e);
            this._isSpeaking = false;
            // Try next in queue
            setTimeout(() => this._processQueue(), 100);
        }
    }

    handleStateChange(enemy, oldState, newState) {
        if (!enemy || !this._isPlayerTarget(enemy)) {
            return;
        }
        if (typeof AI_STATE !== "undefined" && typeof AI_ROLE !== "undefined") {
            const engages = newState === AI_STATE.APPROACHING ||
                newState === AI_STATE.ATTACK_PASS ||
                newState === AI_STATE.REPOSITIONING ||
                newState === AI_STATE.SNIPING;
            if (engages && enemy.role === AI_ROLE.PIRATE && enemy.isArmed?.()) {
                this._maybeSend(enemy, "pirate_engage", this.templates.pirateEngage, {
                    chance: 0.7,
                    cooldown: 16000,
                    color: [255, 140, 100]
                });
            } else if (engages && enemy.role === AI_ROLE.GUARD && enemy.isArmed?.()) {
                this._maybeSend(enemy, "guard_engage", this.templates.guardEngage, {
                    chance: 0.7,
                    cooldown: 18000,
                    color: [200, 160, 255]
                });
            } else if (engages && enemy.role === AI_ROLE.COMBAT && enemy.isArmed?.()) {
                // Determine faction for combat ships
                const faction = this._getShipFaction(enemy);
                let templateList, color;

                if (faction === 'IMPERIAL') {
                    templateList = this.templates.imperialEngage;
                    color = [255, 180, 100];
                } else if (faction === 'SEPARATIST') {
                    templateList = this.templates.separatistEngage;
                    color = [180, 220, 255];
                } else {
                    // Default to military
                    templateList = this.templates.militaryEngage;
                    color = [255, 100, 100];
                }

                this._maybeSend(enemy, "combat_engage", templateList, {
                    chance: 0.65,
                    cooldown: 16000,
                    color
                });
            }
        }
    }

    handleTargetAcquired(enemy, target, context = {}) {
        if (!enemy || !target) {
            return;
        }
        if (typeof AI_ROLE === "undefined") {
            return;
        }
        const isPlayer = this._isPlayerEntity(target);
        if (!isPlayer) {
            return;
        }
        if (enemy.role === AI_ROLE.PIRATE && enemy.isArmed?.()) {
            this._maybeSend(enemy, "pirate_engage", this.templates.pirateEngage, {
                chance: 0.6,
                cooldown: 16000,
                color: [255, 140, 100],
                tokens: { engageReason: context.reason || "lock" }
            });
            return;
        }
        if (enemy.role === AI_ROLE.ALIEN) {
            this._maybeSend(enemy, "alien_engage", this.templates.alienEngage, {
                chance: 0.8,
                cooldown: 16000,
                color: [180, 100, 255]
            });
            return;
        }
        if (enemy.role === AI_ROLE.GUARD && enemy.isArmed?.()) {
            this._maybeSend(enemy, "guard_engage", this.templates.guardEngage, {
                chance: 0.7,
                cooldown: 18000,
                color: [200, 160, 255]
            });
            return;
        }
        if (enemy.role === AI_ROLE.COMBAT && enemy.isArmed?.()) {
            // Determine faction for combat ships
            const faction = this._getShipFaction(enemy);
            let templateList, color;

            if (faction === 'IMPERIAL') {
                templateList = this.templates.imperialEngage;
                color = [255, 180, 100];
            } else if (faction === 'SEPARATIST') {
                templateList = this.templates.separatistEngage;
                color = [180, 220, 255];
            } else {
                // Default to military
                templateList = this.templates.militaryEngage;
                color = [255, 100, 100];
            }

            this._maybeSend(enemy, "combat_engage", templateList, {
                chance: 0.65,
                cooldown: 16000,
                color
            });
            return;
        }
    }

    handlePlayerDamageReaction(enemy, playerSource, damage = 0) {
        if (!enemy || !playerSource) {
            return;
        }
        if (typeof AI_ROLE === "undefined") {
            return;
        }
        if (enemy.role === AI_ROLE.HAULER) {
            this._maybeSend(enemy, "hauler_plea", this.templates.haulerPleas, {
                chance: 0.85,
                cooldown: 22000,
                color: [255, 220, 140],
                tokens: { damageAmount: Math.round(damage) }
            });
            return;
        }
        if (enemy.role === AI_ROLE.TRANSPORT) {
            this._maybeSend(enemy, "transporter_plea", this.templates.transporterPleas, {
                chance: 0.85,
                cooldown: 22000,
                color: [255, 180, 120],
                tokens: { damageAmount: Math.round(damage) }
            });
            return;
        }
        if (enemy.role === AI_ROLE.REPAIR) {
            this._maybeSend(enemy, "repair_plea", this.templates.repairPleas, {
                chance: 0.9,
                cooldown: 18000,
                color: [180, 220, 140],
                tokens: { damageAmount: Math.round(damage) }
            });
            return;
        }
        if (enemy.role === AI_ROLE.POLICE) {
            this._maybeSend(enemy, "police_warning", this.templates.policeWarnings, {
                chance: 0.95,
                cooldown: 20000,
                color: [140, 180, 255],
                tokens: { damageAmount: Math.round(damage) }
            });
            return;
        }
        if (enemy.role === AI_ROLE.PIRATE && enemy.isArmed?.()) {
            this._maybeSend(enemy, "pirate_retort", this.templates.pirateRetort, {
                chance: 0.45,
                cooldown: 14000,
                color: [255, 140, 100]
            });
            return;
        }
        if (enemy.role === AI_ROLE.ALIEN) {
            this._maybeSend(enemy, "alien_retort", this.templates.alienRetort, {
                chance: 0.8,
                cooldown: 12000,
                color: [180, 100, 255]
            });
            return;
        }
        if (enemy.role === AI_ROLE.GUARD && enemy.isArmed?.()) {
            this._maybeSend(enemy, "guard_retort", this.templates.guardRetort, {
                chance: 0.6,
                cooldown: 14000,
                color: [200, 160, 255]
            });
            return;
        }
        if (enemy.role === AI_ROLE.COMBAT && enemy.isArmed?.()) {
            // Determine faction for combat ships
            const faction = this._getShipFaction(enemy);
            let templateList, color;

            if (faction === 'IMPERIAL') {
                templateList = this.templates.imperialRetort;
                color = [255, 180, 100];
            } else if (faction === 'SEPARATIST') {
                templateList = this.templates.separatistRetort;
                color = [180, 220, 255];
            } else {
                // Default to military
                templateList = this.templates.militaryRetort;
                color = [255, 100, 100];
            }

            this._maybeSend(enemy, "combat_retort", templateList, {
                chance: 0.5,
                cooldown: 14000,
                color
            });
            return;
        }
    }


    handleEnemyDestroyed(enemy) {
        if (!enemy) return;
        if (typeof AI_ROLE === 'undefined') return;
        let templateList = null;
        let color = [255, 190, 140];
        switch (enemy.role) {
            case AI_ROLE.PIRATE: templateList = this.templates.pirateDeath; color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.PIRATE : [220, 20, 20]; break;
            case AI_ROLE.POLICE: templateList = this.templates.policeDeath; color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.POLICE : [30, 144, 255]; break;
            case AI_ROLE.HAULER: templateList = this.templates.haulerDeath; color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.HAULER : [204, 119, 34]; break;
            case AI_ROLE.TRANSPORT: templateList = this.templates.transporterDeath; color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.TRANSPORT : [255, 150, 80]; break;
            case AI_ROLE.ALIEN: templateList = this.templates.alienDeath; color = [180, 100, 255]; break;
            case AI_ROLE.GUARD: templateList = this.templates.guardDeath; color = [200, 160, 255]; break;
            case AI_ROLE.REPAIR: templateList = this.templates.repairDeath; color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.REPAIR : [180, 220, 140]; break;
            case AI_ROLE.COMBAT:
                // Determine faction for combat ships
                const faction = this._getShipFaction(enemy);
                if (faction === 'IMPERIAL') {
                    templateList = this.templates.imperialDeath;
                    color = [255, 180, 100];
                } else if (faction === 'SEPARATIST') {
                    templateList = this.templates.separatistDeath;
                    color = [180, 220, 255];
                } else {
                    templateList = this.templates.militaryDeath;
                    color = [255, 100, 100];
                }
                break;
            default: return; // silent for other roles
        }
        if (!templateList || templateList.length === 0) return;
        this._maybeSend(enemy, 'death_line', templateList, {
            chance: 0.8,
            cooldown: 3000,
            color,
            duration: (this.uiManager?.communicationDisplayTime || 15000) * 0.6
        });

        // Clean up cooldown entry for destroyed enemy to prevent memory leak
        this._cleanupEnemy(enemy);
    }

    /**
     * Handle enemy gloating when player is dying (health critical)
     * @param {Object} enemy - The enemy ship to gloat
     * @param {number} playerHealthPercent - Player's current health as percentage (0-100)
     */
    handlePlayerDying(enemy, playerHealthPercent = 0) {
        if (!enemy) return;
        if (typeof AI_ROLE === 'undefined') return;

        // Only gloat when player health is critical (below 15%)
        if (playerHealthPercent > 15) return;

        let templateList = null;
        let color = [255, 100, 100];

        switch (enemy.role) {
            case AI_ROLE.PIRATE:
                templateList = this.templates.pirateGloat;
                color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.PIRATE : [220, 20, 20];
                break;
            case AI_ROLE.POLICE:
                templateList = this.templates.policeGloat;
                color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.POLICE : [30, 144, 255];
                break;
            case AI_ROLE.ALIEN:
                templateList = this.templates.alienGloat;
                color = [180, 100, 255];
                break;
            case AI_ROLE.GUARD:
                templateList = this.templates.guardGloat;
                color = [200, 160, 255];
                break;
            case AI_ROLE.COMBAT:
                // Determine faction for combat ships
                const faction = this._getShipFaction(enemy);
                if (faction === 'IMPERIAL') {
                    templateList = this.templates.imperialGloat;
                    color = [255, 180, 100];
                } else if (faction === 'SEPARATIST') {
                    templateList = this.templates.separatistGloat;
                    color = [180, 220, 255];
                } else {
                    templateList = this.templates.militaryGloat;
                    color = [255, 100, 100];
                }
                break;
            default:
                // Generic combat gloat for other armed roles
                if (enemy.isArmed?.()) {
                    templateList = this.templates.combatGloat;
                }
                break;
        }

        if (!templateList || templateList.length === 0) return;

        this._maybeSend(enemy, 'player_dying_gloat', templateList, {
            chance: 0.7,
            cooldown: 8000,  // Can gloat again after 8 seconds
            color
        });
    }

    _maybeSend(enemy, category, templates, options = {}) {
        if (!this.uiManager || !Array.isArray(templates) || templates.length === 0) {
            return false;
        }
        const now = this._now();
        if (now - this._lastGlobalMessageTime < this._globalCooldownMs) {
            return false;
        }
        const chance = options.chance ?? this.defaultChance;
        const rand = this._random();
        if (rand > chance) {
            return false;
        }
        const enemyKey = this._getEnemyKey(enemy);
        if (!enemyKey) {
            return false;
        }
        const cooldown = options.cooldown ?? this.defaultCooldownMs;
        const enemyRecord = this._enemyCooldowns.get(enemyKey) || {};
        const lastTime = enemyRecord[category] ?? -Infinity;
        if (now - lastTime < cooldown) {
            return false;
        }
        const template = this._pickTemplate(templates);
        if (!template) {
            return false;
        }
        const tokens = this._buildTokenMap(enemy, options);
        const message = this._applyTokens(template, tokens).trim();
        if (!message) {
            return false;
        }
        const color = options.color || [255, 190, 140];
        const duration = options.duration || this.uiManager.communicationDisplayTime || this.uiManager.messageDisplayTime || 4000;
        const addFn = typeof this.uiManager.addCommunicationMessage === 'function'
            ? this.uiManager.addCommunicationMessage.bind(this.uiManager)
            : this.uiManager.addMessage.bind(this.uiManager);
        addFn(message, color, duration);

        // Queue speech for this message (after displaying text)
        this._queueSpeech(message, enemy);

        enemyRecord[category] = now;
        this._enemyCooldowns.set(enemyKey, enemyRecord);
        this._lastGlobalMessageTime = now;
        return true;
    }

    _buildTokenMap(enemy, options) {
        const tokens = Object.assign({}, options.tokens || {});
        tokens.enemyName = tokens.enemyName ?? this._getEnemyName(enemy);
        tokens.enemyShip = tokens.enemyShip ?? (enemy?.shipTypeName || "ship");
        tokens.playerShip = tokens.playerShip ?? (this.player?.shipTypeName || "ship");
        tokens.playerTitle = tokens.playerTitle ?? this._playerTitle;
        const systemName = enemy?.currentSystem?.name || this.player?.currentSystem?.name || "this sector";
        tokens.systemName = tokens.systemName ?? systemName;
        tokens.cargoWord = tokens.cargoWord ?? this._pick(this._cargoWords);
        tokens.pirateGroup = tokens.pirateGroup ?? this._pick(this._pirateGroups);
        tokens.pirateDemand = tokens.pirateDemand ?? this._pick(this._pirateDemands);
        tokens.pirateInsult = tokens.pirateInsult ?? this._pick(this._pirateInsults);
        tokens.haulerCargo = tokens.haulerCargo ?? this._describeHaulerCargo(enemy);
        tokens.haulerDestination = tokens.haulerDestination ?? this._pick(this._haulerDestinations);
        tokens.haulerJob = tokens.haulerJob ?? this._pick(this._haulerJobs);
        tokens.haulerExcuse = tokens.haulerExcuse ?? this._pick(this._haulerExcuses);
        tokens.policeWing = tokens.policeWing ?? this._generatePoliceWingId(enemy);
        tokens.policeCharge = tokens.policeCharge ?? this._pick(this._policeCharges);
        tokens.guardPrincipal = tokens.guardPrincipal ?? this._pick(this._guardPrincipals);
        tokens.militaryUnit = tokens.militaryUnit ?? this._pick(this._militaryUnits);
        tokens.imperialRank = tokens.imperialRank ?? this._pick(this._imperialRanks);
        tokens.separatistSlogan = tokens.separatistSlogan ?? this._pick(this._separatistSlogans);
        return this._resolveTokenEntries(tokens);
    }

    _resolveTokenEntries(tokens) {
        const keys = Object.keys(tokens);
        for (let pass = 0; pass < 3; pass++) {
            let changed = false;
            for (let i = 0; i < keys.length; i++) {
                const key = keys[i];
                let value = tokens[key];
                if (typeof value === "function") {
                    try {
                        value = value(tokens);
                    } catch (_) {
                        value = "";
                    }
                }
                if (typeof value === "string") {
                    const replaced = value.replace(/\{(\w+)\}/g, (match, name) => {
                        if (name === key) {
                            return "";
                        }
                        const tokenValue = tokens[name];
                        if (tokenValue === undefined || tokenValue === null) {
                            return "";
                        }
                        if (typeof tokenValue === "function") {
                            try {
                                return tokenValue(tokens) ?? "";
                            } catch (_) {
                                return "";
                            }
                        }
                        return String(tokenValue);
                    });
                    if (replaced !== value) {
                        changed = true;
                    }
                    tokens[key] = replaced;
                } else if (value !== undefined && value !== null) {
                    tokens[key] = value;
                } else {
                    tokens[key] = "";
                }
            }
            if (!changed) {
                break;
            }
        }
        return tokens;
    }

    _applyTokens(template, tokens) {
        if (typeof template !== "string") {
            return "";
        }
        return template.replace(/\{(\w+)\}/g, (match, key) => {
            const value = tokens[key];
            if (value === undefined || value === null) {
                return "";
            }
            return String(value);
        });
    }

    _pickTemplate(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return null;
        }
        let totalWeight = 0;
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            const weight = (entry && typeof entry === "object" && !Array.isArray(entry) && entry.weight) ? entry.weight : 1;
            totalWeight += weight;
        }
        let r = this._random() * totalWeight;
        for (let i = 0; i < list.length; i++) {
            const entry = list[i];
            const weight = (entry && typeof entry === "object" && !Array.isArray(entry) && entry.weight) ? entry.weight : 1;
            r -= weight;
            if (r <= 0) {
                return typeof entry === "object" && entry !== null && entry.text ? entry.text : entry;
            }
        }
        const fallback = list[list.length - 1];
        return typeof fallback === "object" && fallback !== null && fallback.text ? fallback.text : fallback;
    }

    _pick(list) {
        if (!Array.isArray(list) || list.length === 0) {
            return "";
        }
        const index = Math.floor(this._random() * list.length);
        return list[index];
    }

    _getEnemyName(enemy) {
        if (!enemy) {
            return "Unknown";
        }
        if (enemy.displayName) {
            return enemy.displayName;
        }
        if (enemy.shipTypeName) {
            return enemy.shipTypeName;
        }
        return "Unknown";
    }

    _describeHaulerCargo(enemy) {
        if (!enemy || !Array.isArray(enemy.cargoHold) || enemy.cargoHold.length === 0) {
            return this._pick(this._haulerFallbackCargo);
        }
        const sorted = enemy.cargoHold
            .filter(entry => entry && entry.name && entry.quantity > 0)
            .sort((a, b) => b.quantity - a.quantity);
        if (sorted.length === 0) {
            return this._pick(this._haulerFallbackCargo);
        }
        return sorted[0].name;
    }

    _generatePoliceWingId(enemy) {
        const prefix = enemy?.currentSystem?.securityLevel ? enemy.currentSystem.securityLevel.slice(0, 1).toUpperCase() : "P";
        const number = Math.floor(this._random() * 90) + 10;
        return `${prefix}-${number}`;
    }

    _getShipFaction(ship) {
        // Determine ship faction - prefer runtime faction, then ship definition faction
        if (!ship) {
            return 'MILITARY'; // Default
        }

        // Check runtime faction property first (set in Enemy constructor)
        // Note: Empty string "" is valid (neutral/civilian ships)
        if (ship.faction !== undefined && ship.faction !== null) {
            return ship.faction;
        }

        // Check ship definition faction property
        if (ship.shipTypeName && typeof SHIP_DEFINITIONS !== 'undefined') {
            const shipDef = SHIP_DEFINITIONS[ship.shipTypeName];
            if (shipDef && shipDef.faction !== undefined && shipDef.faction !== null) {
                return shipDef.faction;
            }
        }

        return 'MILITARY'; // Default
    }

    _getEnemyKey(enemy) {
        if (!enemy) {
            return null;
        }
        if (enemy.id) {
            return enemy.id;
        }
        if (!enemy.__communicationId) {
            enemy.__communicationId = `comm_${Date.now()}_${Math.floor(Math.random() * 1e6)}`;
        }
        return enemy.__communicationId;
    }

    _now() {
        if (typeof millis === "function") {
            try {
                return millis();
            } catch (_) {
                return Date.now();
            }
        }
        return Date.now();
    }

    _random() {
        if (typeof random === "function") {
            return random();
        }
        return Math.random();
    }

    _isPlayerTarget(enemy) {
        if (!enemy) {
            return false;
        }
        if (this.player && enemy.target === this.player) {
            return true;
        }
        if (typeof Player !== "undefined" && enemy.target instanceof Player) {
            return true;
        }
        return false;
    }

    _isPlayerEntity(entity) {
        if (!entity) {
            return false;
        }
        if (this.player && entity === this.player) {
            return true;
        }
        if (typeof Player !== "undefined" && entity instanceof Player) {
            return true;
        }
        return false;
    }

    _cleanupEnemy(enemy) {
        // Remove cooldown and voice profile entries for destroyed enemy to prevent memory leak
        const enemyKey = this._getEnemyKey(enemy);
        if (enemyKey) {
            this._enemyCooldowns.delete(enemyKey);
            // Also clean up cached voice profile
            if (this._voiceByEnemy) {
                this._voiceByEnemy.delete(enemyKey);
            }
        }
    }

    performPeriodicCleanup() {
        // Periodic cleanup to prevent memory leaks from stale cooldown entries
        // This should be called occasionally (e.g., every 60 seconds) from the main game loop
        const now = this._now();
        const staleThreshold = 120000; // 2 minutes - entries older than this are considered stale

        const keysToDelete = [];
        this._enemyCooldowns.forEach((record, key) => {
            // Check if any category has been updated recently
            const categoryTimes = Object.values(record);
            const mostRecent = Math.max(...categoryTimes);

            if (now - mostRecent > staleThreshold) {
                keysToDelete.push(key);
            }
        });

        keysToDelete.forEach(key => this._enemyCooldowns.delete(key));

        return keysToDelete.length; // Return count of cleaned up entries for debugging
    }

    /**
     * Sends occasional motivational messages based on player's faction membership
     * Should be called periodically from the game loop (e.g., every few minutes)
     */
    sendFactionMotivationMessage() {
        if (!this.player || !this.uiManager) {
            return false;
        }

        // Determine player's faction
        let faction = null;
        let templateList = null;
        let color = [255, 255, 255];

        if (this.player.isPolice) {
            faction = 'police';
            templateList = this.templates.policeMotivation;
            color = [140, 180, 255]; // Blue for police
        } else if (this.player.playerFaction === 'IMPERIAL') {
            faction = 'imperial';
            templateList = this.templates.imperialMotivation;
            color = [255, 180, 100]; // Gold for imperial
        } else if (this.player.playerFaction === 'MILITARY') {
            faction = 'military';
            templateList = this.templates.militaryMotivation;
            color = [255, 100, 100]; // Red for military
        } else if (this.player.playerFaction === 'SEPARATIST') {
            faction = 'separatist';
            templateList = this.templates.separatistMotivation;
            color = [120, 140, 120]; // Greeny gray for separatist
        }

        if (!faction || !templateList) {
            return false; // Player not in a faction
        }

        // Use a global cooldown for faction messages to prevent spam
        const now = this._now();
        const category = `faction_${faction}_motivation`;
        const lastTime = this._enemyCooldowns.get('player_faction')?.[category] ?? -Infinity;
        const cooldown = 300000; // 5 minutes between faction messages

        if (now - lastTime < cooldown) {
            return false;
        }

        // Low chance to send message (makes it occasional)
        const chance = 0.15; // 15% chance when called
        if (this._random() > chance) {
            return false;
        }

        // Send the message
        const template = this._pickTemplate(templateList);
        if (!template) {
            return false;
        }

        const tokens = this._buildTokenMap(null, {}); // Use null enemy for player messages
        const message = this._applyTokens(template, tokens).trim();
        if (!message) {
            return false;
        }

        const duration = this.uiManager.communicationDisplayTime || this.uiManager.messageDisplayTime || 6000;
        const addFn = typeof this.uiManager.addCommunicationMessage === 'function'
            ? this.uiManager.addCommunicationMessage.bind(this.uiManager)
            : this.uiManager.addMessage.bind(this.uiManager);

        addFn(message, color, duration);

        // Update cooldown
        const playerRecord = this._enemyCooldowns.get('player_faction') || {};
        playerRecord[category] = now;
        this._enemyCooldowns.set('player_faction', playerRecord);

        return true;
    }
}
