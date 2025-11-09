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
        this._pirateGroups = [
            "Black Arc", "Dust Jackals", "Red Shift", "Voidborn", "Broken Comet", "Stokey Krew", "Tottenham Turks", "Hackney Bombers", "Bombacilars",
            "Wraith Union", "Shard Syndicate", "Grav Cutters", "Nebula Wolves", "Crimson Vector", "Adkins Family"
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
                "⟟⟊⟒⋮⟟ ⊑⟟⟊⟟⟒ ✦ ☼", "⌬𐌰𐌿𐍄 ∴ ʘ͜ʖʘ", "∰⟴⟴⟁⟁⟁", "⋇⋇⋇ ᚠᛇᚻ ᚾᚪᚾ", "◬⟁◬⟁◬",
                "╳╳╳ ⟟⟟⟟ ϟϟϟ", "ᚷᛟᚾᛖᚱ ᛚᛟᚾᚷ", "҉҉҉ ☍☌☍", "⟁⟊⟟⟒ :: ⌬⌬⌬", "彡彡 彗彗",
                "ζ≀ζ≀ζ", "ᛝᛝᛝ ∴ ∴", "₪₪₪ ᚺᚨᛚᛚ", "⟁⟁⟁ ⟟⟊⟒", "¤¤¤ ѪѪѪ",
                "⟟⟟⟟ ᚷᚷᚷ", "≀≀≀ ∿∿∿", "▣▢▣▢", "⟴⟴⟴", "卐卐" 
            ],
            alienRetort: [
                "⋔⋇⋔⋇", "⟟⟒⟊⟟⟒", "ϞϟϞ", "ƛƛƛ", "彗彗彗", "ᛣᛣᛣ", "𓆣𓆣𓆣", "₪₪₪", "҉҉҉", "◯◯◯"
            ],
            pirateDeath: [
                "{enemyName}: ugh—", "{enemyName}: …static…", "{enemyName}: engines… gone—", "{enemyName}: not like—this—",
                "{enemyName}: vents—open—", "{enemyName}: I’m… out—", "{enemyName}: hull… breaking—", "{enemyName}: you— win—",
                "{enemyName}: reactor—hot—", "{enemyName}: system—dead—"
            ],
            policeDeath: [
                "Patrol {policeWing}: Officer down—", "{enemyName}: Mayday— systems failing—", "Control {systemName}: We lost a unit!",
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
                chance: 0.65,
                cooldown: 16000,
                color: [180, 100, 255]
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
                chance: 0.55,
                cooldown: 12000,
                color: [180, 100, 255]
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
            case AI_ROLE.PIRATE: templateList = this.templates.pirateDeath; color = [255,140,100]; break;
            case AI_ROLE.POLICE: templateList = this.templates.policeDeath; color = [140,180,255]; break;
            case AI_ROLE.HAULER:
            case AI_ROLE.TRANSPORT: templateList = this.templates.haulerDeath; color = [255,220,140]; break;
            case AI_ROLE.ALIEN: templateList = this.templates.alienDeath; color = [180,100,255]; break;
            default: return; // silent for other roles
        }
        if (!templateList || templateList.length === 0) return;
        this._maybeSend(enemy, 'death_line', templateList, {
            chance: 0.8,
            cooldown: 3000,
            color,
            duration: (this.uiManager?.communicationDisplayTime || 15000) * 0.6
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
}
