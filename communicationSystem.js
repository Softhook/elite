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
                "{enemyName}: Wrong vector, {playerTitle}. Kill thrust and {pirateDemand} before we vent your {playerShip}.",
                "{enemyName}: {pirateGroup} patrol claims {systemName}. Tribute now or you leave in pieces.",
                "Channel open. {enemyName} here. We like your {cargoWord}. Hand it over and maybe you limp away.",
                "{enemyName}: That {playerShip} looks heavy. Flip the bays and give us the payload.",
                "Broadcast from {enemyShip}: You're trespassing. Jettison the goods or we core your reactor.",
                "{enemyName}: Cargo transfer. Now. Stall again and we start taking parts off your hull.",
                "This is {pirateGroup} lead. Congratulations, {playerTitle}, you're today's donation. {pirateDemand}.",
                "Heads up, {playerTitle}. We just tagged your transponder. Pay the toll or pay in blood.",
                "Still flying? Cute. Last chance: cut engines, dump cargo, live to regret it.",
                "{enemyName}: We have overdrafts to cover. Don't make us use the big guns.",
                "Eyes front. That ping was a missile lock. Cooperate and it becomes a warning shot.",
                "Message from {enemyShip}: You're about to have a very short commute unless we see cargo in five seconds.",
                "Broadcast // {pirateGroup}: You're on the wrong side of the frontier, {playerTitle}. Tribute or trouble.",
                "Hey {playerTitle}, your insurance paid up? Prove it by surviving the next minute.",
                "{enemyName}: We smell profit. Jettison everything labeled fragile and we might stay friendly.",
                "We already sold your {playerShip} for scrap. Make it easy: {pirateDemand}.",
                "{enemyName}: Relax, this is just business. The kind where you drop cargo and live.",
                "Incoming demand. Move the goods or move to the afterlife.",
                "You hearing that tone? That's your shield grid failing. Dump the {cargoWord} while it still matters.",
                "This is {pirateGroup} enforcement. We flag, you pay. Step one: eject your hold.",
                "{enemyName}: Copy your heat signature. That's one juicy freighter. Put it in neutral and start offloading.",
                "Broadcast intercept: {pirateGroup} needs new parts. Your {playerShip} will do nicely unless we see cargo streaming out now.",
                "{enemyName}: {pirateInsult}, you thought you could sneak through {systemName}? Bad call.",
                "{enemyName}: Look at that, a {pirateInsult} hiding behind fancy paint. Hand over the goods.",
                "{enemyName}: Throttle to idle and pop the hatches—tribute time.",
                "{enemyName}: Beacon’s live on you. Make this painless: {pirateDemand}.",
                "{enemyName}: {playerTitle}, your route goes through us now. Pay up.",
                "{enemyName}: Two options: cargo or caskets. Don’t make us pick.",
                "{enemyName}: We do collections for the {pirateGroup}. Consider this a friendly visit.",
                "{enemyName}: Nice heat signature. Must be a full hold. Empty it.",
                "{enemyName}: Drift and de-spin. We’re latching to your bays in ten.",
                "{enemyName}: Your {playerShip} is a donation bin today. Start donating.",
                "{enemyName}: We’ll take the fragile stuff first. Toss it gently.",
                "{enemyName}: Spool down. Toss manifests. Then toss the crates.",
                "{enemyName}: See those dots? That’s us. See this dot? That’s you.",
                "{enemyName}: We’ve got collectors on payroll. Don’t waste their time.",
                "{enemyName}: We run tolls on {systemName}. Yours is overdue.",
                "{enemyName}: Toss the {cargoWord} and you keep your wings attached.",
                "{enemyName}: This is the easy conversation. The hard one involves shrapnel.",
                "{enemyName}: We’ve got time, ammo, and a quota. Make it easy.",
                "{enemyName}: We’ll be gentle if your cargo is. Start venting.",
                "{enemyName}: Don’t make us open you like a tin—{pirateDemand}.",
                "{enemyName}: Your transponder just pinged a payday. Comply.",
                "{enemyName}: Last offer: pay the toll or pay the undertow.",
                "{enemyName}: We’re bored and broke. You can fix both.",
                "{enemyName}: If you loved that paint job, keep it safe and pay up.",
                "{enemyName}: We don’t want trouble. We want your {cargoWord}."
            ],
            pirateRetort: [
                "{enemyName}: Bold move, {playerTitle}. Let's see how long that bravado lasts.",
                "Ouch. You'll pay triple for that scorch mark.",
                "{enemyName}: Cute. You get one free punch. After that we stop playing.",
                "Guess we're doing this the hard way. Brace yourself.",
                "You shoot first, we keep the wreckage. Fair trade.",
                "{enemyName}: Cannons warming. Say goodbye to that {playerShip}.",
                "That sting woke us up. We hope you brought friends.",
                "Alright, {playerTitle}. Opening with live ammo now.",
                "{enemyName}: You just made the bounty list. Enjoy the notoriety while you can.",
                "{enemyName}: That the best you’ve got? We brought more.",
                "Shields spiked—now we’re interested.",
                "{enemyName}: You nicked the paint. Now we nick your hull.",
                "Shouldn’t have done that. Signing your obituary now.",
                "{enemyName}: Oh good, a workout.",
                "Spicy. Let’s turn up the heat.",
                "{enemyName}: We were being polite. Past tense.",
                "Alright, hero—let’s see if you can tank this.",
                "{enemyName}: We’ll add that to the invoice."
            ],
            alienEngage: [
                "⟟⟊⟒⋮⟟ ⊑⟟⟊⟟⟒ ✦ ☼", "⌬𐌰𐌿𐍄 ∴ ʘ͜ʖʘ", "∰⟴⟴⟁⟁⟁ ∰⟴⟴⟁⟁⟁", "⋇⋇⋇ ᚠᛇᚻ ᚾᚪᚾ", "◬⟁◬⟁◬",
                "╳╳╳ ⟟⟟⟟ ϟϟϟ", "ᚷᛟᚾᛖᚱ ᛚᛟᚾᚷ", "҉҉҉ ☍☌☍", "⟁⟊⟟⟒ :: ⌬⌬⌬", "彡彡 彗彗",
                "ζ≀ζ≀ζ", "ᛝᛝᛝ ∴ ∴", "₪₪₪ ᚺᚨᛚᛚ", "⟁⟁⟁ ⟟⟊⟒", "¤¤¤ ѪѪѪ",
                "⟟⟟⟟ ᚷᚷᚷ", "≀≀≀ ∿∿∿", "▣▢▣▢", "⟴⟴⟴", "****"
            ],
            alienRetort: [
                "⋔⋇⋔⋇", "⟟⟒⟊⟟⟒", "ϞϟϞ", "ƛƛƛ", "彗彗彗", "ᛣᛣᛣ", "𓆣𓆣𓆣", "₪₪₪", "҉҉҉ ҉҉҉", "◯◯◯"
            ],
            pirateDeath: [
                "{enemyName}: ugh—", "{enemyName}: Noooooo", "{enemyName}: Ejecting…", "{enemyName}: …static…", "{enemyName}: engines… gone—", "{enemyName}: not like—this—",
                "{enemyName}: vents—open—", "{enemyName}: I’m… out—", "{enemyName}: hull… breaking—", "{enemyName}: you— win—",
                "{enemyName}: reactor—hot—", "{enemyName}: system—dead—"
            ],
            policeDeath: [
                "Patrol {policeWing}: Officer down—", "{enemyName}: Mayday— systems failing—", "{enemyName}: Mayday—Mayday", "Control {systemName}: We lost a unit!",
                "{enemyName}: Power—critical—", "{enemyName}: Couldn’t—hold—", "{enemyName}: Hull breach—", "Patrol {policeWing}: Unit offline—"
            ],
            haulerDeath: [
                "{enemyName}: I—can’t—", "{enemyName}: Tell {haulerDestination}… sorry—", "{enemyName}: cargo—everywhere—",
                "{enemyName}: seals—blown—", "{enemyName}: ugh—", "Freighter {enemyShip}: Losing integrity— goodbye—"
            ],
            alienDeath: [
                "⟟⟊⟒⟒— — —", "҉҉҉ …", "彗… 彗…", "∿∿∿", "◯◯…", "₪₪—", "ᛝᛝᛝ …", "⟁⟁⟁ …", "⌬⌬⌬ —", "◬◬◬ …"
            ],
            haulerPleas: [
                "{enemyName}: Whoa! I'm a civilian hauler out of {haulerDestination}. Back off!",
                "Hauler {enemyShip}: I'm carrying {haulerCargo} for disaster relief. Go pick on pirates!",
                "{enemyName}: Easy! That shot almost punctured my tanks. Leave me alone, I'm just {haulerJob}!",
                "Freight ID {enemyShip}: I don't carry weapons. Let me go and nobody files paperwork.",
                "{enemyName}: Are you kidding me? I'm on a contract to {haulerDestination}. Stop shooting!",
                "{enemyName}: This run barely pays fuel. Take what's in the crate if you must, just stop firing!",
                "Listen, {playerTitle}. You punch another hole in this hull and we both decompress.",
                "{enemyName}: Okay, okay! {haulerExcuse}. Let me jump out and it's yours.",
                "Cargo pilot here. I'll broadcast my manifest if you cease fire!",
                "{enemyName}: I'm not your enemy. There's a pirate wing two sectors over—go bother them.",
                "Transport {enemyShip}: That was a warning ping? Felt real. Disengage, please!",
                "{enemyName}: Medical supplies on board. You want a plague on your hands?",
                "Freighter {enemyShip}: I'm chartered to {haulerDestination}. Hitting me is paperwork you do not want.",
                "{enemyName}: Come on! We're just {haulerJob}. Let us finish the run."
            ],
            policeWarnings: [
                "Patrol {policeWing}: Cease fire! You are engaging law enforcement.",
                "Patrol {policeWing}: {playerTitle}, stand down immediately or we will return fire.",
                "System Control {systemName}: You are attacking a deputy vessel. Power down now!",
                "Patrol {policeWing}: Another hit and we authorize lethal force. Last warning.",
                "Security {policeWing}: Weapon strike logged. Disengage or expect arrest on docking.",
                "Law enforcement broadcast: Drop your weapons and prepare for inspection.",
                "Patrol {policeWing}: That shot was recorded. Follow-up aggression will be met with missiles.",
                "Orbital Control {systemName}: Stand down, {playerTitle}. You violate security statute {policeCharge}.",
                "Patrol {policeWing}: You just crossed the line. Break off or we'll disable you.",
                "Enforcer {policeWing}: Final warning. Power down weapons and submit to scan."
            ],
            guardEngage: [
                "{enemyName}: Stay away from {guardPrincipal}!",
                "{enemyName}: You're threatening {guardPrincipal}. Back off now!",
                "Guard {enemyShip}: Protective detail engaged. You're too close to {guardPrincipal}.",
                "{enemyName}: I'm paid to keep {guardPrincipal} safe. You're a threat.",
                "Escort {enemyShip}: You just painted a target on {guardPrincipal}. Big mistake.",
                "{enemyName}: Security protocol active. Disengage from {guardPrincipal} immediately.",
                "{enemyName}: This is your only warning. Move away from {guardPrincipal}.",
                "Bodyguard {enemyShip}: My job is simple: keep {guardPrincipal} alive. You're making that complicated.",
                "{enemyName}: Touch {guardPrincipal} and you'll answer to me.",
                "{enemyName}: Protective zone breach detected. Stand down or be eliminated.",
                "Guard unit {enemyShip}: {guardPrincipal} is under my protection. You're not getting close.",
                "{enemyName}: You don't want this fight, {playerTitle}. Leave {guardPrincipal} alone.",
                "{enemyName}: I've got one job: protect {guardPrincipal}. Don't make me do it the hard way.",
                "Escort leader: Hostile intent detected toward {guardPrincipal}. Engaging.",
                "{enemyName}: You picked the wrong convoy to mess with.",
                "{enemyName}: Security detail here. {guardPrincipal} stays safe, you don't."
            ],
            guardRetort: [
                "{enemyName}: You just signed your death warrant!",
                "{enemyName}: That was a mistake. I don't go down easy.",
                "Guard {enemyShip}: You think that hurt? I'm just getting started.",
                "{enemyName}: Nice shot. Now let me return the favor.",
                "{enemyName}: You're going to regret that.",
                "Bodyguard {enemyShip}: Is that all you've got?",
                "{enemyName}: I've taken worse hits from asteroids.",
                "{enemyName}: You'll pay for that. {guardPrincipal} doesn't forgive threats.",
                "{enemyName}: Wrong move. I'm trained for this.",
                "Escort {enemyShip}: Armor holding. Can you say the same?"
            ],
            guardDeath: [
                "{enemyName}: {guardPrincipal}… get clear…",
                "{enemyName}: Sorry… couldn't… protect you…",
                "Guard {enemyShip}: Systems failing… {guardPrincipal}, run!",
                "{enemyName}: I… failed…",
                "{enemyName}: Tell {guardPrincipal}… I tried…",
                "Escort {enemyShip}: Hull breach… can't… continue…",
                "{enemyName}: Not… like this…",
                "{enemyName}: {guardPrincipal}… forgive me…"
            ],
            militaryEngage: [
                "{enemyName} ({militaryUnit}): Hostile contact. Weapons hot.",
                "Military vessel {enemyShip}: Target acquired. Engaging by authority of Naval Command.",
                "{enemyName}: {militaryUnit} reporting hostile in {systemName}. Neutralizing threat.",
                "Command, this is {militaryUnit}. Engaging enemy combatant.",
                "{enemyName}: Military protocol engaged. You are designated hostile.",
                "{enemyName}: This sector is under military protection. Stand down or be destroyed.",
                "Defense grid active. {militaryUnit} moving to intercept.",
                "{enemyName}: You've entered a restricted zone. Prepare to be boarded or destroyed.",
                "{enemyName} ({militaryUnit}): Threat assessment complete. Engaging.",
                "Military broadcast: Unauthorized vessel, you will comply or be eliminated.",
                "{enemyName}: Fleet orders are clear: neutralize all threats in {systemName}.",
                "{militaryUnit} leader: Target locked. Commencing attack run.",
                "{enemyName}: This is military space. You don't belong here.",
                "{enemyName}: Rules of engagement satisfied. Opening fire.",
                "Tactical {enemyShip}: Hostile vessel identified. Weapons free."
            ],
            militaryRetort: [
                "{enemyName}: Shields up. Returning fire!",
                "{militaryUnit}: Taking damage. Requesting backup.",
                "{enemyName}: You just attacked a military vessel. That's a death sentence.",
                "{enemyName}: Hit confirmed. Counter-attack authorized.",
                "Military vessel {enemyShip}: Armor compromised. Escalating response.",
                "{enemyName}: You're outgunned and you don't even know it.",
                "{enemyName} ({militaryUnit}): That's an act of war. Prepare for retaliation.",
                "{enemyName}: All units, we are taking fire. Engage at will!",
                "{enemyName}: Command, we have a hostile. Permission to use lethal force?",
                "{enemyName}: That scorch mark will be the last thing you see."
            ],
            militaryDeath: [
                "{enemyName}: {militaryUnit} down… Mayday…",
                "{militaryUnit} leader: We're hit… systems critical…",
                "{enemyName}: Command… we're not going to make it…",
                "Military vessel {enemyShip}: Hull failing… tell command…",
                "{enemyName}: Ejecting… shields gone…",
                "{enemyName}: {militaryUnit}… reporting… casualty…",
                "{enemyName}: Ship lost… crew… evacuating…",
                "{enemyName}: This is {militaryUnit}… going dark…"
            ],
            imperialEngage: [
                "{enemyName}: In the name of {imperialRank}, you will stand down!",
                "Imperial vessel {enemyShip}: You face the might of the Empire. Surrender now.",
                "{enemyName}: Glory to the Crown! Target identified, engaging.",
                "{enemyName}: {imperialRank} does not tolerate defiance. Prepare to be destroyed.",
                "For the Empire! {enemyName} engaging hostile contact.",
                "{enemyName}: You dare challenge Imperial authority in {systemName}?",
                "Imperial Command: Hostile vessel detected. Eliminating in the Emperor's name.",
                "{enemyName}: The Empire's justice is swift. Your time has come.",
                "{enemyName}: Long live the Empire! All guns, fire at will!",
                "Crown fleet {enemyShip}: You will bow before Imperial power or burn.",
                "{enemyName}: Traitors and rebels will be crushed. Engaging.",
                "{enemyName}: {imperialRank} protects this sector. You are not welcome.",
                "Imperial Squadron: Target acquired. For the glory of the Crown!",
                "{enemyName}: You oppose the Empire? Foolish. Weapons hot.",
                "{enemyName}: The Emperor's word is law. You violate it at your peril."
            ],
            imperialRetort: [
                "{enemyName}: You dare strike an Imperial vessel?!",
                "{enemyName}: That was treason. The Empire will remember this!",
                "Imperial {enemyShip}: Shields holding. The Crown does not fall so easily.",
                "{enemyName}: Your rebellion ends here!",
                "{enemyName}: For every Imperial you harm, ten more will hunt you down!",
                "{enemyName}: The Empire's wrath is upon you now!",
                "{enemyName}: You've made a powerful enemy today, rebel scum!",
                "{enemyName}: Imperial armor is superior. You'll see.",
                "{enemyName}: That shot seals your fate. The Emperor demands justice!",
                "{enemyName}: Attack the Empire and face annihilation!"
            ],
            imperialDeath: [
                "{enemyName}: Long… live… the Emperor…",
                "Imperial {enemyShip}: For… the Crown… ugh…",
                "{enemyName}: The Empire… will avenge… me…",
                "{enemyName}: The Emperor protects…",
                "{enemyName}: Glory to… {imperialRank}… fading…",
                "{enemyName}: I die… for the Empire…",
                "Crown vessel {enemyShip}: Systems… failing… Emperor…",
                "{enemyName}: Tell the Emperor… we fought… bravely…",
                "{enemyName}: The Empire… endures… even… as I fall…"
            ],
            separatistEngage: [
                "{enemyName}: {separatistSlogan}! Engaging Imperial oppressor!",
                "Separatist fighter {enemyShip}: You're with the Empire? Then you're the enemy!",
                "{enemyName}: For freedom! We'll never bow to tyrants!",
                "{enemyName}: The Republic rises! Death to Imperial dogs!",
                "Freedom fighter {enemyName}: You support the Crown? Then you fall with it!",
                "{enemyName}: We fight for the people! Engaging enemy of the Republic!",
                "{enemyName}: {separatistSlogan}! Target locked.",
                "Rebel {enemyShip}: Imperial scum detected in {systemName}. Attacking!",
                "{enemyName}: The chains are broken! We are free, and we fight!",
                "{enemyName}: For every world they've crushed, we strike back! Engaging!",
                "{enemyName}: The Separatist cause is just. You picked the wrong side!",
                "Freedom squadron: Imperial contact. All units, weapons free!",
                "{enemyName}: We remember the oppression. Now we deliver justice!",
                "{enemyName}: The Republic will not be silenced! Fire!",
                "{enemyName}: Crown loyalists die today. For the Republic!"
            ],
            separatistRetort: [
                "{enemyName}: The Republic does not yield!",
                "{enemyName}: You can't stop us! {separatistSlogan}!",
                "Separatist {enemyShip}: Every hit makes our cause stronger!",
                "{enemyName}: We've endured worse than you, Imperial!",
                "{enemyName}: For freedom! We will not fall!",
                "{enemyName}: The people stand with us. You fight alone!",
                "{enemyName}: That the best the Empire can do?",
                "{enemyName}: We've survived Imperial bombardments. This is nothing!",
                "{enemyName}: Strike us down and a thousand more will rise!",
                "{enemyName}: You can't kill an idea, oppressor!"
            ],
            separatistDeath: [
                "{enemyName}: The Republic… will live on…",
                "{enemyName}: Freedom!…",
                "Separatist {enemyShip}: Tell them… we fought… for freedom…",
                "{enemyName}: {separatistSlogan}… always…",
                "{enemyName}: I die… free…",
                "{enemyName}: The cause… endures…",
                "Freedom fighter: Others… will finish… what we started…",
                "{enemyName}: For… the Republic… ugh…",
                "{enemyName}: We… are… not defeated… only… fallen…"
            ],
            combatEngage: [
                "{enemyName}: Combat protocols engaged. Weapons hot.",
                "Warship {enemyShip}: Target designated hostile. Commencing attack.",
                "{enemyName}: You're in my sights. This won't take long.",
                "{enemyName}: Combat vessel ready. Let's see what you've got.",
                "Battle cruiser {enemyShip}: Hostile contact confirmed. Engaging.",
                "{enemyName}: Time to earn my pay. Target acquired.",
                "{enemyName}: This sector belongs to those who can hold it. Prove yourself.",
                "{enemyName}: I'm built for war. You're just target practice.",
                "Combat ship {enemyName}: Threat detected. Eliminating.",
                "{enemyName}: My weapons are primed. Your shields won't last.",
                "{enemyName}: You want a fight? You've got one.",
                "{enemyName}: Combat systems online. Engaging enemy.",
                "Tactical vessel {enemyShip}: Target lock achieved. Opening fire.",
                "{enemyName}: Let's dance, {playerTitle}. Hope you brought armor.",
                "{enemyName}: Another day, another hostile. Weapons free."
            ],
            combatRetort: [
                "{enemyName}: That tickled. My turn.",
                "{enemyName}: You're going to regret that shot.",
                "Combat vessel {enemyShip}: Damage minimal. Returning fire.",
                "{enemyName}: Nice try. I've got better armor than that.",
                "{enemyName}: You hit like a freighter. Let me show you real firepower.",
                "{enemyName}: Shields holding. Can you say the same?",
                "{enemyName}: That's it? I expected more from you.",
                "{enemyName}: You just upgraded this from a warning to a kill.",
                "Warship {enemyShip}: Taking fire. Retaliating with full force.",
                "{enemyName}: Bad move. Combat ships don't go down easy."
            ],
            combatDeath: [
                "{enemyName}: Systems… failing… well fought…",
                "Combat vessel {enemyShip}: Hull breach… I'm done…",
                "{enemyName}: You… earned this… one…",
                "{enemyName}: Ship… critical… ejecting…",
                "{enemyName}: Damn… didn't… see that coming…",
                "Warship {enemyShip}: Reactor… overload… goodbye…",
                "{enemyName}: Not bad… for a… {playerShip}…",
                "{enemyName}: This… isn't… over…"
            ],
            imperialMotivation: [
                "Imperial Command: {playerTitle}, your service to the Crown is exemplary. Continue the fight!",
                "Crown Fleet: Glory to the Empire! Your victories strengthen our cause.",
                "Imperial Dispatch: {playerTitle}, the Emperor watches your deeds with pride.",
                "{imperialRank}: Your loyalty to the Crown is unwavering. Press on!",
                "Imperial High Command: {playerTitle}, you embody the spirit of the Empire.",
                "Crown Intelligence: Your actions serve the greater good of Imperial unity.",
                "Imperial Fleet: {playerTitle}, your ship flies true under the Imperial banner.",
                "{imperialRank}: The Empire grows stronger with commanders like you.",
                "Imperial Command: {playerTitle}, your dedication to the Crown inspires us all.",
                "Crown Fleet: For the Emperor! Your service honors the Imperial legacy."
            ],
            militaryMotivation: [
                "Naval Command: {playerTitle}, your tactical prowess serves the fleet well.",
                "{militaryUnit}: Outstanding performance in the field. Keep it up!",
                "Military High Command: {playerTitle}, your service strengthens our defenses.",
                "Fleet Operations: Your combat record is exemplary. Continue the mission.",
                "{militaryUnit}: {playerTitle}, you represent the best of military discipline.",
                "Naval Intelligence: Your strategic decisions protect our borders.",
                "Military Command: {playerTitle}, your ship is a beacon of military might.",
                "{militaryUnit}: Your dedication to duty is commendable. Press on!",
                "Fleet Command: {playerTitle}, your victories bolster our security.",
                "Military Operations: {playerTitle}, you embody the spirit of the fleet."
            ],
            separatistMotivation: [
                "Republic Council: {playerTitle}, your fight for freedom inspires the people!",
                "Freedom Forces: {playerTitle}, your actions bring us closer to liberty.",
                "{separatistSlogan}! Your courage strengthens our cause.",
                "Separatist Command: {playerTitle}, you are a true champion of the Republic.",
                "Freedom Fleet: Your victories against tyranny will be remembered.",
                "Republic Intelligence: {playerTitle}, your dedication to the people is unwavering.",
                "{separatistSlogan}! {playerTitle}, you fight with the heart of a true rebel.",
                "Separatist High Command: Your ship flies proudly for freedom.",
                "Republic Forces: {playerTitle}, your service to the cause is legendary.",
                "Freedom Command: {playerTitle}, together we will overthrow the oppressors!"
            ],
            policeMotivation: [
                "Police Headquarters: {playerTitle}, your enforcement actions maintain order.",
                "Law Enforcement: {playerTitle}, your dedication to justice is exemplary.",
                "Police Command: Your patrols keep the sectors safe. Well done!",
                "Justice Division: {playerTitle}, your service upholds the rule of law.",
                "Police Fleet: {playerTitle}, you are a guardian of peace and order.",
                "Law Enforcement HQ: Your arrest record strengthens our authority.",
                "Police Operations: {playerTitle}, your vigilance protects innocent lives.",
                "Justice Command: {playerTitle}, you embody the principles of law enforcement.",
                "Police High Command: Your service to justice is commendable.",
                "Law Division: {playerTitle}, continue enforcing peace across the stars."
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
        if (enemy.role === AI_ROLE.HAULER || enemy.role === AI_ROLE.TRANSPORT) {
            this._maybeSend(enemy, "hauler_plea", this.templates.haulerPleas, {
                chance: 0.85,
                cooldown: 22000,
                color: [255, 220, 140],
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
            case AI_ROLE.HAULER:
            case AI_ROLE.TRANSPORT: templateList = this.templates.haulerDeath; color = (typeof ROLE_COLORS !== 'undefined') ? ROLE_COLORS.TRANSPORT : [204, 119, 34]; break;
            case AI_ROLE.ALIEN: templateList = this.templates.alienDeath; color = [180, 100, 255]; break;
            case AI_ROLE.GUARD: templateList = this.templates.guardDeath; color = [200, 160, 255]; break;
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
        // Determine ship faction based on ship type definition
        if (!ship || !ship.shipTypeName) {
            return 'MILITARY'; // Default
        }

        // Check if SHIP_DEFINITIONS is available
        if (typeof SHIP_DEFINITIONS === 'undefined') {
            return 'MILITARY';
        }

        const shipDef = SHIP_DEFINITIONS[ship.shipTypeName];
        if (!shipDef || !shipDef.aiRoles) {
            return 'MILITARY';
        }

        if (shipDef.aiRoles.includes('IMPERIAL')) {
            return 'IMPERIAL';
        } else if (shipDef.aiRoles.includes('SEPARATIST')) {
            return 'SEPARATIST';
        } else if (shipDef.aiRoles.includes('MILITARY')) {
            return 'MILITARY';
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
        // Remove cooldown entry for destroyed enemy to prevent memory leak
        const enemyKey = this._getEnemyKey(enemy);
        if (enemyKey) {
            this._enemyCooldowns.delete(enemyKey);
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
