# Faction-Specific Mission Design Document

This document outlines ideas for advanced faction-specific missions that go beyond simple kill/delivery objectives.

---

## Overview

The current faction mission system includes:
- **Kill Missions**: Eliminate X enemy faction ships
- **Patrol Missions**: Scan X vessels
- **Supply Missions**: Deliver cargo to faction outposts
- **Sabotage Missions**: Destroy enemy infrastructure

This document proposes new mission types that introduce more strategic gameplay elements.

---

## 1. Reconnaissance & Intelligence Missions

### 1.1 Find Enemy Secret Base

**Concept**: Locate a hidden enemy faction base in a remote system.

**Flow**:
1. Accept mission at faction base
2. Receive intel about target system (2-4 jumps away)
3. Travel to specified system
4. Search the system - base is hidden until player flies within detection range (~2000 units)
5. Once discovered, base marker appears on minimap
6. Return to origin station for reward (or auto-complete on discovery)

**Implementation Notes**:
- Target system should have a `secretStation` with enemy faction subtype
- Station starts with `discovered: false`
- Proximity check triggers discovery
- Discovery persists across saves

**Rewards**:
- High credits (5,000-15,000)
- Faction prestige (+3-5)
- Permanently marks enemy base on galaxy map (strategic value)

**Variations**:
- **Imperial**: "Locate Separatist cell headquarters"
- **Separatist**: "Find Imperial black site"
- **Military**: "Discover alien staging ground"

---

### 1.2 Intel Gathering

**Concept**: Scan enemy faction ships to gather intelligence without destroying them.

**Flow**:
1. Accept mission
2. Travel to enemy-controlled space
3. Target-lock X enemy faction ships to "scan" them
4. Each scan provides intelligence (progress +1)
5. Complete when target count reached

**Implementation Notes**:
- Reuses patrol mission mechanics
- Only counts enemy faction ships, not all ships
- Scanned ships may become hostile if player is detected
- Stealth element: getting too close triggers combat

**Rewards**:
- Medium credits (2,000-5,000)
- Faction prestige (+2)

---

### 1.3 System Survey

**Concept**: Assess enemy strength across multiple systems.

**Flow**:
1. Accept mission with list of 3-5 target systems
2. Visit each system in any order
3. Stay in each system for 30 seconds to "survey"
4. Return to origin when all systems surveyed

**Implementation Notes**:
- Track visited systems in mission data
- Timer-based presence requirement
- Could trigger enemy patrols/ambushes

**Rewards**:
- Credits based on number of systems (1,500 per system)
- Faction prestige (+1 per system)

---

## 2. Assault & Combat Leadership Missions

### 2.1 Lead Attack Squadron

**Concept**: Command a group of allied ships in an assault on enemy territory.

**Flow**:
1. Accept mission at faction base
2. 3-5 wingmen spawn near player with `GUARD` role following player
3. Travel to target system together
4. Engage enemy faction ships
5. Destroy X enemy vessels (player + wingmen kills count toward objective)
6. Auto-complete when target count reached

**Implementation Notes**:
- Wingmen use existing `GUARD` AI role with player as principal
- Wingmen should be faction-appropriate ships
- Consider spawning replacement wingmen if originals die (optional)
- Track combined kill count for objective

**Rewards**:
- Very high credits (10,000-25,000)
- High faction prestige (+5-8)
- Bonus for wingmen survival

**Variations**:
- **Imperial**: "Lead strike force against Separatist convoy"
- **Separatist**: "Command raid on Imperial patrol"
- **Military**: "Lead extermination squad against alien hive"

---

### 2.2 Capital Ship Escort

**Concept**: Protect a slow-moving allied capital ship traveling through dangerous space.

**Flow**:
1. Accept mission
2. Allied capital ship spawns (large, slow, valuable)
3. Capital ship navigates toward jump zone
4. Enemy waves attack the capital ship
5. Protect capital ship until it jumps/reaches destination
6. Fail if capital ship is destroyed

**Implementation Notes**:
- Capital ship uses `HAULER` AI but with high health
- Enemy spawns in waves, targeting capital ship
- Player must intercept and destroy attackers
- Capital ship could have basic defensive weapons

**Rewards**:
- High credits (8,000-18,000)
- Faction prestige (+4-6)
- Possible bonus cargo/upgrade reward

---

### 2.3 System Assault

**Concept**: Full-scale invasion of enemy-controlled system.

**Flow**:
1. Accept multi-objective mission
2. Phase 1: Destroy defensive platforms (0/3)
3. Phase 2: Eliminate enemy fighters (0/10)
4. Phase 3: (Optional) Destroy enemy station
5. Complete all phases for full reward

**Implementation Notes**:
- Uses existing sabotage mechanics for platforms
- Kill tracking for fighters
- Station destruction as bonus objective
- Could spawn allied reinforcements mid-mission

**Rewards**:
- Very high credits (15,000-40,000)
- Maximum faction prestige (+10)
- Bonus for completing optional objectives

---

## 3. Supply & Logistics Missions

### 3.1 Blockade Runner

**Concept**: Deliver critical supplies through enemy-controlled space to a besieged station.

**Flow**:
1. Accept mission, cargo is loaded
2. Destination is in enemy-controlled system
3. Enemy patrols are more frequent along route
4. Deliver cargo to destination station
5. Higher reward for faster delivery

**Implementation Notes**:
- Similar to illegal delivery but with faction context
- Increased enemy spawn rate in destination system
- Time bonus for quick completion

**Rewards**:
- High credits (5,000-12,000)
- Faction prestige (+3)
- Time bonus (+25% for fast delivery)

---

### 3.2 Refugee Extraction

**Concept**: Extract VIP passengers from hostile territory.

**Flow**:
1. Accept mission
2. Travel to hostile system
3. Rendezvous at specific coordinates (near planet/station)
4. "Passengers board" when player reaches location
5. Evade/fight through pursuit back to safety
6. Deliver passengers to origin station

**Implementation Notes**:
- Adds temporary "passengers" cargo type
- Triggers enemy spawn on pickup
- Pursuit mechanics: enemies follow/interdict

**Rewards**:
- High credits (6,000-15,000)
- Faction prestige (+4)
- Reputation with rescued faction

---

### 3.3 Arms Smuggling

**Concept**: Deliver weapons to resistance fighters in occupied territory.

**Flow**:
1. Accept mission, weapons cargo loaded
2. Destination is secret location in enemy system
3. Must avoid enemy patrols (scanning = mission failure)
4. Deliver to underground contacts

**Implementation Notes**:
- High-stakes version of illegal delivery
- Police/enemy scans cause mission failure
- Stealth-focused gameplay

**Rewards**:
- Medium-high credits (4,000-10,000)
- Faction prestige (+2)
- Risk of wanted status if caught

---

## 4. Sabotage & Covert Operations

### 4.1 Communication Blackout

**Concept**: Destroy communication relays to prevent enemy coordination.

**Flow**:
1. Accept mission
2. Travel to target system
3. Destroy 3 comm relay space objects
4. Relays are spread across system
5. Complete when all relays destroyed

**Implementation Notes**:
- Uses existing sabotage mechanics
- Multiple targets instead of one
- Relays could be guarded

**Rewards**:
- High credits (6,000-14,000)
- Faction prestige (+4)
- Temporary effect: reduced enemy spawns in system

---

### 4.2 Assassinate Commander

**Concept**: Eliminate high-value named target with heavy escort.

**Flow**:
1. Accept mission with target details
2. Target spawns in specified system
3. Target has 4-6 elite guards
4. Target attempts to flee if threatened
5. Must destroy target before they escape

**Implementation Notes**:
- Enhanced assassination mission
- Target has `ASSASSIN_TARGET` behavior: fight briefly, then flee to jump zone
- Guards are tougher than standard
- Time pressure element

**Rewards**:
- Very high credits (12,000-30,000)
- Faction prestige (+6-8)
- Major wanted status in enemy territory

---

### 4.3 Disable Defenses

**Concept**: Soften up enemy defenses before a larger faction assault.

**Flow**:
1. Accept mission to destroy defensive installations
2. Travel to target system
3. Destroy weapon platforms, shield generators, etc.
4. Retreat before reinforcements arrive
5. Success enables future assault mission availability

**Implementation Notes**:
- Precursor mission type
- Completing this mission could unlock "System Assault" mission
- Creates mission chains/progression

**Rewards**:
- High credits (7,000-16,000)
- Faction prestige (+5)
- Unlocks follow-up mission

---

## 5. Defense Missions

### 5.1 Station Defense

**Concept**: Protect your faction's station from an enemy attack.

**Flow**:
1. Mission triggers when player is near friendly station
2. Enemy attack wave incoming (warning message)
3. Survive X waves of attackers
4. Protect station from destruction
5. Bonus for station taking minimal damage

**Implementation Notes**:
- Could be event-triggered rather than accepted
- Waves spawn progressively harder enemies
- Station has defensive weapons that help
- Failure = station damaged/temporary closure

**Rewards**:
- High credits (5,000-15,000)
- Faction prestige (+4-6)
- Reputation bonus
- Possible store discount at defended station

---

### 5.2 Convoy Protection

**Concept**: Escort friendly hauler ships through dangerous space.

**Flow**:
1. Accept mission
2. 2-4 friendly haulers spawn
3. Haulers travel toward destination (jump zone or station)
4. Pirates/enemies attack convoy
5. Protect haulers until they reach destination
6. Reward scales with haulers survived

**Implementation Notes**:
- Haulers use existing `HAULER` AI
- Player must stay near convoy (range limit)
- Enemies prioritize haulers over player
- Partial success possible (1+ haulers survive)

**Rewards**:
- Base credits (3,000) + bonus per surviving hauler (2,000 each)
- Faction prestige (+2 base, +1 per survivor)

---

### 5.3 Intercept Raiders

**Concept**: Stop enemy raiders before they reach their target.

**Flow**:
1. Accept time-sensitive mission
2. Enemy raiders are heading toward friendly target
3. Intercept and destroy raiders before they reach destination
4. Timer shows remaining time
5. Fail if timer expires before all raiders destroyed

**Implementation Notes**:
- Raiders spawn and travel toward objective
- Player must reach and engage before arrival
- Time pressure creates urgency
- Could use existing enemy patrol mechanics

**Rewards**:
- High credits (6,000-12,000)
- Faction prestige (+3)
- Time bonus for quick completion

---

## Implementation Priority

Based on complexity vs. impact, recommended implementation order:

### Phase 1 (Low Complexity, High Value)
1. **Find Enemy Secret Base** - Uses existing exploration
2. **Intel Gathering** - Extends patrol mechanics
3. **Communication Blackout** - Extends sabotage mechanics

### Phase 2 (Medium Complexity)
4. **Lead Attack Squadron** - Requires wingman spawning
5. **Convoy Protection** - Requires hauler spawning + protection
6. **Assassinate Commander** - Enhanced assassination

### Phase 3 (Higher Complexity)
7. **Station Defense** - Event system + waves
8. **Capital Ship Escort** - New capital ship entity
9. **System Assault** - Multi-phase mission structure

---

## Technical Considerations

### New Mission Properties
```javascript
// Proposed additions to Mission class
{
    phases: [],              // For multi-phase missions
    wingmenCount: 0,         // For squadron missions
    targetSystems: [],       // For multi-system missions
    timeLimit: null,         // For time-sensitive missions
    survivalTarget: null,    // For escort/defense missions
    discoveryTarget: {},     // For reconnaissance missions
}
```

### New AI Behaviors Needed
- `WINGMAN`: Follow player, engage player's targets
- `CONVOY`: Travel to destination, no combat
- `RAIDER`: Travel to target, attack on arrival
- `FLEE_TO_JUMP`: Attempt to escape via jump zone

### Events/Triggers
- Proximity-based discovery
- Timed wave spawning
- Multi-objective tracking
- Mission chains (completing A unlocks B)

---

## Summary

These mission types would add significant depth to faction gameplay:

| Category | Mission Count | New Mechanics |
|----------|---------------|---------------|
| Recon | 3 | Discovery system |
| Assault | 3 | Wingmen, multi-phase |
| Supply | 3 | Pursuit, stealth |
| Sabotage | 3 | Chains, fleeing targets |
| Defense | 3 | Waves, escort |
| **Total** | **15** | |

The recommended starting point is **"Find Enemy Secret Base"** as it builds on existing mechanics and provides immediate strategic value to players.
