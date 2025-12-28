# Standardizing Police as a Normal Faction

## Overview

Currently, police are treated specially compared to other factions (IMPERIAL, SEPARATIST, MILITARY). This document outlines what would need to change to standardize them, potential issues, and recommendations.

---

## Current Special Handling

### Player Tracking
- **Police**: Uses `isPolice` boolean flag
- **Other factions**: Use `playerFaction = "IMPERIAL"/"SEPARATIST"/"MILITARY"`

This creates scattered code like:
```javascript
const playerFaction = player.isPolice ? 'POLICE' : player.playerFaction;
```

Found in ~15 places across the codebase.

### Ship Identification
- **Police ships**: Identified by `aiRoles: ['POLICE']` in ship definition
- **Other faction ships**: Identified by `faction: 'IMPERIAL'` property

### Former Police Mechanic
- `hasBeenPolice` flag prevents rejoining police force
- Other factions have no such restriction

### Rank Progression
- **Police**: Kill-based (`usesPrestige: false`)
- **Other factions**: Prestige-based (`usesPrestige: true`)

---

## Key Issues to Address

### 1. Save Compatibility ⚠️

Existing saves have `isPolice: true/false` and `hasBeenPolice`. Migration code needed:

```javascript
// In loadSaveData():
if (data.isPolice) {
    this.playerFaction = 'POLICE';
}
// Ignore hasBeenPolice entirely (remove the mechanic)
```

### 2. Police Status Revocation

Currently `removePoliceStatus()` kicks player from police when committing crimes. 

**Question**: Should this apply to ALL factions or remain police-specific?

**Recommendation**: Keep it police-specific initially. Generalize later if desired. The behavior is thematically appropriate - police are law enforcement, other factions are political/military.

### 3. AI Role vs Faction Distinction

Important: `AI_ROLE.POLICE` should remain for AI behavior. This is separate from faction identity.

- `enemy.role = AI_ROLE.POLICE` → Determines AI behavior (patrol, target wanted ships)
- `enemy.faction = 'POLICE'` → Determines faction allegiance for targeting

These can coexist. A ship can be both role=POLICE and faction='POLICE'.

### 4. Wanted Status on Join

Joining police clears wanted status (perk of joining). This should stay.

### 5. Bounty Rewards

Police currently get 1,000 cr for killing pirates/aliens. MILITARY gets similar bounties. These should remain distinct but could share logic.

---

## Files Affected

| File | Changes Needed |
|------|----------------|
| `player.js` | Remove `isPolice`, `hasBeenPolice`; use `playerFaction` |
| `missionGenerator.js` | Simplify faction checks |
| `enemyDamageSystem.js` | Update `attacker.isPolice` checks |
| `uiFactionRecruitment.js` | Simplify `isPlayerInFaction()` |
| `uiStationMenus.js` | Update police UI checks |
| `uiHUD.js` | Update faction display |
| `saveSelectionScreen.js` | Update save display |
| `communicationSystem.js` | Update voice/dialogue checks |
| Ship definitions | Add `faction: 'POLICE'` to police ships |

---

## Recommendations

### Remove These
1. ✅ `hasBeenPolice` property and all references
2. ✅ `isPolice` boolean (replace with `playerFaction === 'POLICE'`)

### Keep These  
1. ✅ `AI_ROLE.POLICE` for AI behavior control
2. ✅ `removePoliceStatus()` logic (rename to be clearer)
3. ✅ Kill-based progression for police (thematically appropriate)
4. ✅ Wanted status clearing on police join

### Add These
1. ✅ `faction: 'POLICE'` to police ship definitions
2. ✅ Save migration for old `isPolice` saves

---

## Implementation Order

1. Add `faction: 'POLICE'` to ship definitions (non-breaking)
2. Add save migration code (non-breaking)
3. Remove `hasBeenPolice` mechanic
4. Convert `isPolice` → `playerFaction`
5. Update all scattered checks
6. Test thoroughly

---

## Decision Points Needed

1. **Crime behavior**: Should crimes revoke police membership only, or be a faction-agnostic system?
2. **Progression**: Keep kills for police, or standardize to prestige?
3. **Rejoining**: With `hasBeenPolice` removed, can players rejoin police indefinitely?
