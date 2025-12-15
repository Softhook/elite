# Game Events System

This document catalogs all game events currently implemented in the Elite game, including their mechanics, associated systems, and how they interact with the war state system.

> [!NOTE]
> Events are managed by [`eventManager.js`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js) which handles probability, spawning, cooldowns, and execution. War state extends across multiple systems to affect NPC spawn distributions.

---

## Table of Contents

1. [Event Categories](#event-categories)
2. [Core Event Properties](#core-event-properties)
3. [Spawning Events](#spawning-events)
4. [Market & Economic Events](#market--economic-events)
5. [Social & Political Events](#social--political-events)
6. [War Events](#war-events)
7. [War State System](#war-state-system)
8. [System Relationships](#system-relationships)
9. [Adding New Events](#adding-new-events)

---

## Event Categories

Events are organized into four main categories:

| Category | Description | Example Events |
|----------|-------------|----------------|
| **Spawning Events** | Spawn entities (ships, asteroids, cargo) into the game world | Asteroid Cluster, Pirate Swarm, Alien Raid |
| **Market Events** | Affect station markets and commodity prices | Market Shortage, Market Surplus, Black Market Auction |
| **Social/Political Events** | Affect stations, systems, and NPC behavior | Blockade, Diplomatic Visit, Sabotage |
| **War Events** | Large-scale conflicts that affect spawn modifiers | Skirmish, Full War |

---

## Core Event Properties

All events share these core properties (defined in [`eventManager.js:_initializeEvents`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L81-L406)):

| Property | Type | Description |
|----------|------|-------------|
| `type` | String | Unique event identifier (e.g., `"ASTEROID_CLUSTER"`) |
| `probabilityPerFrame` | Number | Chance per frame that event triggers (e.g., `0.00005`) |
| `minCooldownFrames` | Number | Minimum frames between triggers (e.g., `5 * 60 * 60` = 5 minutes) |
| `warningDurationFrames` | Number | Frames between warning and actual spawn (e.g., `300` = 5 seconds) |
| `lastTriggeredFrame` | Number | Frame number when last triggered (initialized to `-Infinity`) |
| `isWarningActive` | Boolean | Whether warning is currently active |
| `eventTriggerFrame` | Number | Frame when event will execute |
| `warningConfig` | Object | Warning message, color, and console log |
| `spawnConfig` | Object | Configuration for spawning entities (optional) |

---

## Spawning Events

Events that spawn physical entities into the game world.

### ASTEROID_CLUSTER

Spawns a cluster of asteroids near the player.

**Location:** [`eventManager.js:83-107`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L83-L107)

**Properties:**
- **Probability:** `0.00005` per frame
- **Cooldown:** 5 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "WARNING: Asteroid cluster detected!" (orange)

**Spawn Config:**
- **Entity Type:** `asteroid`
- **Count:** 15-25 asteroids
- **Spawn Radius:** 1600-2000 units
- **Cluster Spread:** 500 units
- **Asteroid Size:** 25-75 units

---

### ALIEN_RAID

Spawns hostile alien vessels.

**Location:** [`eventManager.js:108-137`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L108-L137)

**Properties:**
- **Probability:** `0.00003` per frame
- **Cooldown:** 10 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "DANGER: Unidentified alien vessels detected!" (magenta)

**Spawn Config:**
- **Entity Type:** `enemy`
- **Count:** 2-5 ships (scales with player rank)
- **Ship Selection:** Random from `ALIEN` ship group (fallback: Thargoid)
- **AI Role:** `AI_ROLE.ALIEN`
- **Spawn Radius:** 1800-2200 units

**Related Systems:** `ships.js` (ALIEN aiRoles), `enemyStateMachine.js` (AI_ROLE.ALIEN)

---

### PIRATE_SWARM

Spawns a gang of hostile pirates with a randomly selected gang name.

**Location:** [`eventManager.js:138-171`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L138-L171)

**Properties:**
- **Probability:** `0.00005` per frame
- **Cooldown:** 8 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "DANGER: {Gang Name} pirates detected!" (red)
- **Gang Names:** Void Reavers, Cygnus Marauders, Nebula Nomads, Quantum Corsairs, Kygan Syndicate, Synapse Ghosts, Solar Scourge

**Spawn Config:**
- **Entity Type:** `enemy`
- **Count:** 3-10 ships (scales with player rank)
- **Ship Selection:** Random from `PIRATE` ship group (fallback: Sidewinder)
- **AI Role:** `AI_ROLE.PIRATE`
- **AI State:** `AI_STATE.APPROACHING` (immediately targets player)
- **Spawn Radius:** 1600-2000 units

**Related Systems:** `ships.js` (PIRATE aiRoles), `enemyStateMachine.js` (AI_STATE.APPROACHING)

---

### BOUNTY_HUNTER_AMBUSH

Spawns bounty hunters targeting the player.

**Location:** [`eventManager.js:172-201`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L172-L201)

**Properties:**
- **Probability:** `0.00002` per frame
- **Cooldown:** 12 minutes
- **Warning Duration:** 8.3 seconds
- **Warning Message:** "WARNING: Bounty hunter contracts activated!" (orange)

**Spawn Config:**
- **Entity Type:** `enemy`
- **Count:** 1-3 ships (scales with player rank)
- **Ship Selection:** Random from `BOUNTY_HUNTER` ship group (fallback: Viper)
- **AI Role:** `AI_ROLE.BOUNTY_HUNTER`
- **Spawn Radius:** 1700-2300 units

---

### COMET

Spawns a massive comet approaching from deep space.

**Location:** [`eventManager.js:202-228`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L202-L228)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 20 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "WARNING: Massive comet approaching!" (yellow)

**Spawn Config:**
- **Entity Type:** `asteroid`
- **Is Comet:** `true`
- **Count:** 1
- **Spawn Radius:** 8000-9000 units (far from player)
- **Size:** 150-200 units
- **Speed:** 8 units/frame

**Related Systems:** `asteroid.js` (comet rendering), `uiMinimap.js` (comet indicator)

---

### METEOR_SHOWER

Spawns many small, fast-moving meteoroids.

**Location:** [`eventManager.js:229-253`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L229-L253)

**Properties:**
- **Probability:** `0.00004` per frame
- **Cooldown:** 12 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "WARNING: Meteor shower detected!" (orange)

**Spawn Config:**
- **Entity Type:** `asteroid`
- **Count:** 20-40 meteors
- **Spawn Radius:** 1800-2200 units
- **Cluster Spread:** 800 units
- **Size:** 10-40 units

---

### COSMIC_STORM

Spawns an electromagnetic storm that disrupts ship systems.

**Location:** [`eventManager.js:254-277`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L254-L277)

**Properties:**
- **Probability:** `0.00002` per frame
- **Cooldown:** 25 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "ALERT: Cosmic storm forming!" (cyan)

**Spawn Config:**
- **Entity Type:** `cosmicStorm`
- **Count:** 1
- **Spawn Radius:** 1000-1500 units
- **Storm Radius:** 800 units
- **Type:** `electromagnetic`

**Related Systems:** `cosmicStorm.js` (storm effects and rendering), `player.js` (disruption effects)

---

### DISTRESS_SIGNAL

Spawns a damaged police ship requesting assistance.

**Location:** [`eventManager.js:278-311`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L278-L311)

**Properties:**
- **Probability:** `0.00003` per frame
- **Cooldown:** 15 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "DISTRESS: Ship in need of assistance!" (red)

**Spawn Config:**
- **Entity Type:** `enemy`
- **Count:** 1
- **Ship Selection:** Random from `POLICE` ship group (fallback: Viper)
- **AI Role:** `AI_ROLE.POLICE`
- **AI State:** `AI_STATE.IDLE`
- **Hull:** 30% of max hull (damaged)

---

### TRADER_CONVOY

Spawns a convoy of merchant ships.

**Location:** [`eventManager.js:312-344`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L312-L344)

**Properties:**
- **Probability:** `0.000025` per frame
- **Cooldown:** 18 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "TRADE: Merchant convoy approaching!" (green)

**Spawn Config:**
- **Entity Type:** `enemy`
- **Count:** 2-5 ships (fixed, doesn't scale with rank)
- **Ship Selection:** Random from `TRADER` ship group (fallback: Type6Transporter)
- **AI Role:** `AI_ROLE.HAULER`
- **AI State:** `AI_STATE.IDLE`
- **Spawn Radius:** 1800-2200 units

**Related Systems:** `ships.js` (HAULER/TRANSPORT/TRADER aiRoles), `enemyCargo.js` (cargo inventory)

---

### NAVAL_PATROL

Spawns military patrol ships.

**Location:** [`eventManager.js:345-377`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L345-L377)

**Properties:**
- **Probability:** `0.00002` per frame
- **Cooldown:** 20 minutes
- **Warning Duration:** 6.7 seconds
- **Warning Message:** "PATROL: Naval forces detected!" (blue)

**Spawn Config:**
- **Entity Type:** `enemy`
- **Count:** 3-6 ships (scales with player rank)
- **Ship Selection:** Random from `MILITARY` ship group (fallback: Viper)
- **AI Role:** `AI_ROLE.POLICE`
- **AI State:** `AI_STATE.PATROLLING`
- **Spawn Radius:** 1700-2100 units

---

### ALIEN_ARTIFACT

Spawns rare alien cargo floating in space.

**Location:** [`eventManager.js:378-401`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L378-L401)

**Properties:**
- **Probability:** `0.000005` per frame (rare!)
- **Cooldown:** 30 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "ANOMALY: Unknown artifact detected!" (magenta)

**Spawn Config:**
- **Entity Type:** `cargo`
- **Count:** 1
- **Spawn Radius:** 1500-2000 units
- **Cargo Type:** `'Alien Artifact'`
- **Quantity:** 1

**Related Systems:** `cargo.js`, station markets (if cargo trading enabled)

---

## Market & Economic Events

Events that affect station markets and commodity availability.

### MARKET_SHORTAGE

Reduces stock of a random commodity at a random station.

**Location:** [`eventManager.js:574-593`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L574-L593)

**Properties:**
- **Probability:** `0.00004` per frame
- **Cooldown:** 12 minutes
- **Warning Duration:** 4 seconds
- **Warning Message:** "MARKET ALERT: Local shortage detected!" (orange)

**Effects:**
- Consumes 55-90% of commodity's baseline stock
- Adds persistent event marker (3 minutes)
- Creates HUD marker at station location
- Increases buy/sell prices for that commodity

**Related Systems:** `market.js` (consumeStockForNPC), `uiMarket.js` (market display), `uiManager.js` (event markers)

---

### MARKET_SURPLUS

Increases stock of a random commodity at a random station.

**Location:** [`eventManager.js:594-613`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L594-L613)

**Properties:**
- **Probability:** `0.00003` per frame
- **Cooldown:** 12 minutes
- **Warning Duration:** 4 seconds
- **Warning Message:** "MARKET NOTICE: Oversupply affecting prices." (green)

**Effects:**
- Adds 60-110% of commodity's baseline stock
- Adds persistent event marker (3 minutes)
- Creates HUD marker at station location
- Decreases buy/sell prices for that commodity

**Related Systems:** `market.js` (addStockFromNPC)

---

### BLACK_MARKET_AUCTION

Spawns illegal cargo caches in space.

**Location:** [`eventManager.js:614-647`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L614-L647)

**Properties:**
- **Probability:** `0.00001` per frame (rare!)
- **Cooldown:** 30 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "UNDERTONE: Black market auction incoming." (purple)

**Effects:**
- Spawns 2-6 cargo containers with illegal goods
- **Cargo Types:** Narcotics, Weapons, Slaves
- **Quantity:** 1-4 units per cache (×10 with cargoQuantityMultiplier)
- Creates HUD markers for each cache (3 minutes)
- Markers removed when cargo collected

**Related Systems:** `cargo.js`, `market.js` (illegal commodity trading), `player.js` (cargo collection)

---

### RARE_COMMODITY

Spawns rare ore cargo in space.

**Location:** [`eventManager.js:425`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L425)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 50 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "DISCOVERY: Rare commodity located nearby." (gold)

**Spawn Config:**
- **Entity Type:** `cargo`
- **Count:** 1-2 units
- **Spawn Radius:** 1500-3000 units
- **Cargo Type:** `'Rare Ore'`
- **Quantity:** 1

---

### SALVAGE_OPPORTUNITY

Spawns salvageable metal cargo from wreckage.

**Location:** [`eventManager.js:427`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L427)

**Properties:**
- **Probability:** `0.00002` per frame
- **Cooldown:** 12 minutes
- **Warning Duration:** 4 seconds
- **Warning Message:** "SALVAGE: Wreckage detected — high-value salvage possible." (silver)

**Spawn Config:**
- **Entity Type:** `cargo`
- **Count:** 1-3 units
- **Spawn Radius:** 1600-3000 units
- **Cargo Type:** `'Metals'`
- **Quantity:** 2

---

## Social & Political Events

Events that affect stations, space infrastructure, and NPC behavior.

### BLOCKADE

Spawns military ships in a defensive formation around a station, restricting trade lanes.

**Location:** [`eventManager.js:682-710`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L682-L710)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 40 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "BLOCKADE: Trade lanes restricted by military." (blue)

**Effects:**
- Sets `starSystem.blockadeExpires` (60 seconds)
- Spawns 5-9 military gunships around station
- Ships set to `AI_STATE.GUARDING` with station as principal
- Creates persistent event message and HUD marker

**Related Systems:** `starSystem.js` (blockadeExpires), `enemyStateMachine.js` (GUARDING state)

---

### SMUGGLING_BUST

Law enforcement raid that seizes illegal goods and spawns patrol ships.

**Location:** [`eventManager.js:648-681`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L648-L681)

**Properties:**
- **Probability:** `0.00002` per frame
- **Cooldown:** 20 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "ENFORCEMENT: Smuggling interdiction underway." (red)

**Effects:**
- Seizes 50-80% of illegal commodity stock from station market
- Spawns 4-8 police ships around station in `AI_STATE.PATROLLING`
- Creates HUD marker (2 minutes)

**Related Systems:** `market.js` (illegal commodities), `enemyStateMachine.js` (PATROLLING state)

---

### DIPLOMATIC_VISIT

Diplomatic envoy delivers luxury goods to a station.

**Location:** [`eventManager.js:711-723`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L711-L723)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 45 minutes
- **Warning Duration:** 6.7 seconds
- **Warning Message:** "CIVIC: Diplomatic envoy arriving." (teal)

**Effects:**
- Adds 80-140% of current Luxury Goods stock to station market
- Creates HUD marker (2 minutes)

**Related Systems:** `market.js` (Luxury Goods commodity)

---

### TECH_BREAKTHROUGH

Research breakthrough increases advanced component availability.

**Location:** [`eventManager.js:724-735`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L724-L735)

**Properties:**
- **Probability:** `0.000008` per frame
- **Cooldown:** 60 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "RESEARCH: New tech prototype surfaced." (magenta)

**Effects:**
- Adds 8-16 units of Advanced Components to station market
- Creates HUD marker (2 minutes)

**Related Systems:** `market.js` (Adv Components commodity)

---

### STATION_STRIKE

Labor strike limits station services and consumes food supplies.

**Location:** [`eventManager.js:736-749`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L736-L749)

**Properties:**
- **Probability:** `0.000012` per frame
- **Cooldown:** 30 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "LABOR: Station strike in progress." (orange)

**Effects:**
- Consumes 60-100% of Food stock from station
- Adds persistent event marker (2 minutes)
- Creates HUD marker

**Related Systems:** `market.js` (Food commodity)

---

### POWER_OUTAGE

Power failure damages station systems and commodity stocks.

**Location:** [`eventManager.js:750-771`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L750-L771)

**Properties:**
- **Probability:** `0.000015` per frame
- **Cooldown:** 25 minutes
- **Warning Duration:** 4 seconds
- **Warning Message:** "ALERT: Station power outage reported." (yellow)

**Effects:**
- Sets `station.powerOutageExpires` (45 seconds)
- Drains Computers (35-60%), Machinery (30-50%), Adv Components (25-45%)
- Adds persistent event marker and HUD marker (45 seconds)

**Related Systems:** `station.js` (powerOutageExpires affects services)

---

### SABOTAGE

Infrastructure sabotage near space objects, spawns salvage.

**Location:** [`eventManager.js:772-789`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L772-L789)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 40 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "SABOTAGE: Infrastructure damage detected." (crimson)

**Effects:**
- Spawns 2-8 units of Metals near random space object (×10 with multiplier)
- No HUD marker by default

**Related Systems:** `spaceObjects.js` (mining platforms, research stations, etc.), `missionGenerator.js` (sabotage missions)

---

### MINING_BOOM

High-yield mineral discovery increases mining resource availability.

**Location:** [`eventManager.js:790-802`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L790-L802)

**Properties:**
- **Probability:** `0.00002` per frame
- **Cooldown:** 35 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "MINING: High-yield discovery announced." (olive)

**Effects:**
- Adds 20-40 units of Metals to station market
- Adds 20-40 units of Minerals to station market
- Creates persistent event marker (3 minutes) and HUD marker

**Related Systems:** `market.js` (Metals, Minerals commodities)

---

### MINE_ACCIDENT

Mining accident spawns salvage cargo from spilled ore.

**Location:** [`eventManager.js:421`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L421)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 30 minutes
- **Warning Duration:** 4 seconds
- **Warning Message:** "HAZARD: Mining accident - emergency response." (orange)

**Effects:**
- Spawns 1-6 units of Metals cargo (×10 with multiplier)
- Creates HUD marker for salvage location (3 minutes)
- Cargo appears 1200-2200 units from player

**Related Systems:** `cargo.js`, `uiManager.js` (event markers)

---

### SOLAR_FLARE

Solar flare damages player shields and spawns a solar storm.

**Location:** [`eventManager.js:422`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L422)

**Properties:**
- **Probability:** `0.000008` per frame
- **Cooldown:** 50 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "SPACE WEATHER: Solar flare activity detected." (yellow)

**Effects:**
- Damages player shields by 50-80% of max shield
- Spawns a solar-type cosmic storm (radius 400-700) 900-1600 units from player
- Adds persistent event message (30 seconds)

**Related Systems:** `player.js` (shield damage), `cosmicStorm.js` (solar storms)

---

### QUARANTINE

Quarantine disables all commodity trading at a station and consumes Food supplies.

**Location:** [`eventManager.js:881`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L881)

**Properties:**
- **Probability:** `0.000006` per frame (very rare!)
- **Cooldown:** 80 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "QUARANTINE: Contagion measures in effect." (purple)

**Effects:**
- Sets `station.quarantineExpires` to disable all commodity trading (3 minutes)
- Consumes 12-35 units of Food from station market
- Adds persistent event marker (3 minutes)
- Creates HUD marker at station location
- **CRITICAL:** Station market will reject all buy/sell transactions until quarantine expires

**Related Systems:** `market.js` (trading disabled check), `station.js` (quarantineExpires property), `uiManager.js` (event markers)

---

### REFUGEE_INFLUX

Refugee influx consumes Food and triples Food prices at the station.

**Location:** [`eventManager.js:895`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L895)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 40 minutes
- **Warning Duration:** 4 seconds
- **Warning Message:** "CIVIC: Refugee influx stresses local services." (brown)

**Effects:**
- Consumes 15-45 units of Food from station market
- Sets `station.refugeeInfluxExpires` and `station.refugeeInfluxFoodPriceMultiplier = 3.0`
- Food buy/sell prices tripled at this station (2 minutes)
- Adds persistent event marker (2 minutes)

**Related Systems:** `market.js` (Food commodity, price calculation), `station.js` (refugeeInfluxExpires property)

---

### BOUNTY_INCREASE

Increased bounties attract bounty hunters that patrol and hunt pirates.

**Location:** [`eventManager.js:946`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L946)

**Properties:**
- **Probability:** `0.000015` per frame
- **Cooldown:** 28 minutes
- **Warning Duration:** 5 seconds
- **Warning Message:** "NOTICE: Bounties increased on wanted criminals." (red)

**Effects:**
- Spawns 4-9 bounty hunter ships around jump zone
- Ships set to `AI_STATE.PATROLLING` to hunt pirates via their normal AI
- Bounty hunters will target any pirates they encounter
- Adds persistent event message (3 minutes)

**Related Systems:** `ships.js` (BOUNTY_HUNTER ships), `enemyStateMachine.js` (AI_STATE.PATROLLING, bounty hunter targeting)

---

### REPUTATION_SCANDAL

Corporate scandal causes market volatility in luxury goods and textiles.

**Location:** [`eventManager.js:429`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L429)

**Properties:**
- **Probability:** `0.000007` per frame
- **Cooldown:** 40 minutes
- **Warning Duration:** 6 seconds
- **Warning Message:** "SCANDAL: Reputation-shifting news is spreading." (pink)

**Effects:**
- Adds 45-75% of baseline Luxury Goods stock (dumped inventory)
- Removes 25-50% of Textiles stock (product recall)
- Adds persistent event marker (3 minutes)

**Related Systems:** `market.js` (Luxury Goods, Textiles commodities)

---

### HACKER_ATTACK

Cyber attack damages station systems and spawns hijacked pirate ships.

**Location:** [`eventManager.js:426`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L426)

**Properties:**
- **Probability:** `0.000009` per frame
- **Cooldown:** 36 minutes
- **Warning Duration:** 4 seconds
- **Warning Message:** "CYBER: Systems under hacker attack." (purple)

**Effects:**
- Drains 45-75% of Computers stock
- Drains 20-40% of Medicine stock
- Spawns 2-5 pirate ships (hijacked cutters) around station
- Pirates set to `AI_STATE.APPROACHING` targeting player
- Creates HUD marker (2 minutes)

**Related Systems:** `market.js` (Computers, Medicine), `enemyStateMachine.js` (AI_STATE.APPROACHING)

---

## War Events

Large-scale conflicts that fundamentally alter NPC spawn distributions and system dynamics.

### SKIRMISH_SEPARATIST_IMPERIAL

Localized conflict between Separatist and Imperial forces.

**Location:** [`eventManager.js:431`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L431)

**Properties:**
- **Probability:** `0.000015` per frame
- **Cooldown:** 30 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "⚔️ CONFLICT: Separatist and Imperial forces clashing!" (orange)

**Effects:**
- Triggers `_executeWarEvent('SKIRMISH', 'SEPARATIST_VS_IMPERIAL', durationMs)`
- See [War State System](#war-state-system) for details

**Related Systems:** `eventManager.js` (war state), `enemySpawner.js` (spawn distribution), `newsManager.js` (war news)

---

### SKIRMISH_ALIEN_MILITARY

Localized conflict between Alien and Military forces.

**Location:** [`eventManager.js:432`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L432)

**Properties:**
- **Probability:** `0.00001` per frame
- **Cooldown:** 35 minutes
- **Warning Duration:** 10 seconds
- **Warning Message:** "⚔️ INVASION: Alien forces engaging military!" (magenta)

**Effects:**
- Triggers `_executeWarEvent('SKIRMISH', 'ALIEN_VS_MILITARY', durationMs)`
- See [War State System](#war-state-system) for details

---

### WAR_SEPARATIST_IMPERIAL

Full-scale war between Separatist and Imperial factions.

**Location:** [`eventManager.js:433`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L433)

**Properties:**
- **Probability:** `0.000008` per frame (rare!)
- **Cooldown:** 60 minutes
- **Warning Duration:** 15 seconds
- **Warning Message:** "🔥 FULL SCALE WAR: Separatist vs Imperial forces!" (red)

**Effects:**
- Triggers `_executeWarEvent('FULL_WAR', 'SEPARATIST_VS_IMPERIAL', durationMs)`
- See [War State System](#war-state-system) for details

---

### WAR_ALIEN_MILITARY

Full-scale war between Alien and Military forces.

**Location:** [`eventManager.js:434`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L434)

**Properties:**
- **Probability:** `0.000006` per frame (very rare!)
- **Cooldown:** 70 minutes
- **Warning Duration:** 15 seconds
- **Warning Message:** "🔥 FULL SCALE WAR: Alien invasion vs Military!" (crimson)

**Effects:**
- Triggers `_executeWarEvent('FULL_WAR', 'ALIEN_VS_MILITARY', durationMs)`
- See [War State System](#war-state-system) for details

---

## War State System

War events activate a **global war state** that persists for a duration and affects all NPC spawning across the game.

### War State Properties

**Location:** [`eventManager.js:38-45`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L38-L45)

| Property | Type | Description |
|----------|------|-------------|
| `isActive` | Boolean | Whether a war is currently active |
| `intensity` | String | `'PEACE'`, `'SKIRMISH'`, or `'FULL_WAR'` |
| `factions` | String | `'SEPARATIST_VS_IMPERIAL'` or `'ALIEN_VS_MILITARY'` |
| `expires` | Number | Timestamp when war state ends |
| `spawnModifiers` | Object | Faction spawn percentage overrides |

### War Execution

**Location:** [`eventManager.js:964-1002`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L964-L1002)

When a war event triggers:

1. **Sets spawn modifiers** based on factions (see below)
2. **Updates activeWarState** with intensity, factions, and expiration
3. **Adds persistent UI message** showing war status
4. **Spawns initial combatants** (immediate wave of ships)
5. **Notifies news system** via `newsManager.addWarNews()`

### Spawn Modifiers

**Location:** [`eventManager.js:1008-1025`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L1008-L1025)

#### Separatist vs Imperial War

```javascript
{
    SEPARATIST: 0.35,  // 35% of spawns
    IMPERIAL: 0.35,    // 35% of spawns
    OTHER: 0.30        // Remaining 30% normal mix
}
```

#### Alien vs Military War

```javascript
{
    ALIEN: 0.40,       // 40% of spawns
    MILITARY: 0.40,    // 40% of spawns
    OTHER: 0.20        // Remaining 20% normal mix
}
```

### Initial Combatant Spawning

**Location:** [`eventManager.js:1031-1052`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L1031-L1052)

| Intensity | Base Count | Scaling | Total Ships |
|-----------|------------|---------|-------------|
| **SKIRMISH** | 3 per faction | +rankFactor×4 | 6-14 ships |
| **FULL_WAR** | 6 per faction | +rankFactor×4 | 12-20 ships |

Ships spawn from appropriate ship groups:
- **Separatist vs Imperial:** Uses `shipGroups.SEPARATIST` and `shipGroups.IMPERIAL`
- **Alien vs Military:** Uses `shipGroups.ALIEN` and `shipGroups.MILITARY`

All war ships spawn with `AI_ROLE.COMBAT` or `AI_ROLE.ALIEN`.

### War State Expiration

**Location:** [`eventManager.js:481-490`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L481-L490)

War state is checked each frame in `_updateActiveEvents()`. When expired:
- `isActive` set to `false`
- `intensity` reset to `'PEACE'`
- `factions` and `spawnModifiers` reset to `null`

---

## System Relationships

### Event Manager Dependencies

**Location:** [`eventManager.js:438-442`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L438-L442)

EventManager requires initialization with:
- **starSystem**: The current star system instance
- **player**: The player instance
- **uiManager**: UI manager for messages and markers

### Systems Affected by Events

| System | Files | How Events Interact |
|--------|-------|---------------------|
| **Star System** | `starSystem.js` | Event manager spawns enemies, cargo, asteroids into system; sets blockadeExpires, etc. |
| **Market System** | `market.js` | Events add/consume commodity stock via `addStockFromNPC()`, `consumeStockForNPC()` |
| **AI System** | `enemyStateMachine.js`, `enemy.js` | Events spawn enemies in specific AI states (APPROACHING, PATROLLING, GUARDING, IDLE) |
| **Spawning System** | `enemySpawner.js` | War state modifiers affect faction spawn distribution |
| **News System** | `newsManager.js` | Events generate news articles viewable at stations |
| **UI System** | `uiManager.js`, `uiMinimap.js` | Events create persistent messages, HUD markers, and minimap indicators |
| **Mission System** | `mission.js`, `missionGenerator.js` | Some events (e.g., SABOTAGE) relate to mission objectives |
| **Faction System** | `uiFactionRecruitment.js` | War events affect faction relationships and bounties |
| **Ship System** | `ships.js` | Events use ship groups defined by aiRoles in SHIP_DEFINITIONS |

### Ship Groups

**Location:** [`eventManager.js:16-26`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L16-L26), [`eventManager.js:48-79`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L48-L79)

EventManager organizes ships into groups based on their `aiRoles` in `SHIP_DEFINITIONS`:

| Group | AI Roles | Used By Events |
|-------|----------|----------------|
| `POLICE` | `POLICE` | DISTRESS_SIGNAL, NAVAL_PATROL, SMUGGLING_BUST |
| `PIRATE` | `PIRATE` | PIRATE_SWARM |
| `TRADER` | `HAULER`, `TRANSPORT`, `TRADER` | TRADER_CONVOY |
| `ALIEN` | `ALIEN` | ALIEN_RAID, ALIEN_VS_MILITARY war |
| `MINER` | `MINER` | (not currently used by events) |
| `MILITARY` | `MILITARY`, `COMBAT` | NAVAL_PATROL, ALIEN_VS_MILITARY war |
| `BOUNTY_HUNTER` | `BOUNTY_HUNTER` | BOUNTY_HUNTER_AMBUSH |
| `SEPARATIST` | `SEPARATIST` | SEPARATIST_VS_IMPERIAL war |
| `IMPERIAL` | `IMPERIAL` | SEPARATIST_VS_IMPERIAL war |

---

## Adding New Events

### Steps to Add a New Event

1. **Define the event** in [`eventManager.js:_initializeEvents()`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L81-L406)
   - Add to `this.events` array or `_addDynamicEvents()`
   - Set probability, cooldown, warning config

2. **Implement spawn/effect logic**
   - If spawning entities, define `spawnConfig` (uses existing logic)
   - If custom effects, add case to [`_executeCustomEvent()`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js#L572-L955)

3. **Add news support** (optional)
   - Add templates to [`newsManager.js`](file:///Users/softhook/Documents/GitHub/elite/newsManager.js)
   - Call appropriate `newsManager.add*News()` method

4. **Add UI support** (optional)
   - Event markers via `uiManager.addEventMarker()`
   - Persistent messages via `_addPersistentEvent()`

5. **Document the event** in this file

### Event Template Example

```javascript
{
    type: "NEW_EVENT_TYPE",
    probabilityPerFrame: 0.00003,
    minCooldownFrames: 15 * 60 * 60, // 15 minutes
    warningDurationFrames: 300,      // 5 seconds
    lastTriggeredFrame: -Infinity,
    isWarningActive: false,
    eventTriggerFrame: 0,
    warningConfig: {
        message: "WARNING: New event detected!",
        color: "yellow",
        consoleLog: "EventManager: New event warning issued."
    },
    spawnConfig: {
        // Define spawn parameters or omit for custom event
    }
}
```

### War Event Considerations

> [!IMPORTANT]
> War events are **system-wide** effects that alter the fundamental balance of NPC spawning. When designing war events:
> - Consider the duration carefully (wars should be impactful but not permanent)
> - Define clear spawn modifiers that make sense for the factions involved
> - Ensure ship groups have sufficient variety (see `ships.js` aiRoles definitions)
> - Add appropriate news coverage via `newsManager` for immersion
> - Test with different player ranks (war intensity scales with rank)

**War events should extend across multiple systems in the future.** Currently war state is local to the active system, but the architecture supports extending this:
- Store war state in `galaxy.js` or global state
- Have `eventManager` read from global war state
- Allow systems to have different war intensities
- Consider faction territories and border systems

---

## Future Enhancements

### Potential Event Ideas

- **Convoy Escorts:** Trader convoys with military protection
- **Faction Raids:** Faction-specific attack events based on player faction allegiance
- **Economic Cycles:** Long-term market trends affecting multiple commodities
- **Territory Control:** Systems controlled by factions affect event types
- **Player-Triggered Events:** Reputation/actions causing specific responses
- **Multi-System Wars:** War state propagates between connected systems
- **Faction Victories:** Permanent system changes after prolonged wars

### Architectural Improvements

- **Event Chains:** Events that trigger follow-up events
- **Event Prerequisites:** Events that only occur under specific conditions
- **System Memory:** Track event history per system
- **Dynamic Probabilities:** Event probabilities affected by system state
- **Event Factions:** More granular faction involvement in events

---

## Cross-References

### Related Files

- [`eventManager.js`](file:///Users/softhook/Documents/GitHub/elite/eventManager.js) - Event definitions and execution
- [`newsManager.js`](file:///Users/softhook/Documents/GitHub/elite/newsManager.js) - News generation for events
- [`starSystem.js`](file:///Users/softhook/Documents/GitHub/elite/starSystem.js) - System state affected by events
- [`market.js`](file:///Users/softhook/Documents/GitHub/elite/market.js) - Market manipulation by events
- [`ships.js`](file:///Users/softhook/Documents/GitHub/elite/ships.js) - Ship definitions and aiRoles
- [`enemySpawner.js`](file:///Users/softhook/Documents/GitHub/elite/enemySpawner.js) - Spawn distribution (war modifiers)
- [`uiManager.js`](file:///Users/softhook/Documents/GitHub/elite/uiManager.js) - Event messages and markers
- [`missionGenerator.js`](file:///Users/softhook/Documents/GitHub/elite/missionGenerator.js) - Mission generation

### Related Documentation

- `docs/todo.txt` - Current development tasks
- (Future: `docs/factions.md` - Faction system documentation)
- (Future: `docs/ai.md` - AI state machine documentation)
- (Future: `docs/market.md` - Market system documentation)

---

**Last Updated:** 2025-12-14
**Maintained by:** Development Team
**Version:** 1.0
