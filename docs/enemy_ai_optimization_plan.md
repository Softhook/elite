# Enemy AI Performance Optimization

**Core Strategy**: Off-screen enemies use drastically simplified AI while sound + visual cues maintain the sense of a battle happening.

---

## Off-Screen Simplifications

### What We Can Safely Simplify

| Feature | On-Screen | Off-Screen | Why Safe |
|---------|-----------|------------|----------|
| **Targeting** | Full O(n²) scoring | Basic: lastAttacker → player → nearest | Battle indicators show fights |
| **Cover behavior** | Full asteroid evaluation | **Disabled** | Invisible to player |
| **Weapon selection** | Score all weapons | **Just use current** | No visual difference |
| **Predictive aiming** | Calculate intercept | **Aim at current pos** | No visual difference |
| **Range stall detection** | Track movement | **Disabled** | Only matters when visible |
| **Clear shot LOS check** | Check all asteroids | **Disabled** | Invisible anyway |
| **Friendly fire check** | Check all allies | **Disabled** | Less critical off-screen |
| **Update frequency** | Every frame | Every 3rd frame | Physics interpolates |

### What Keeps Battle Ambiance

1. **Battle indicators** - Already show off-screen combat at screen edges (`uiHUD.drawBattleIndicators`)
2. **World sounds** - Firing sounds still play with distance attenuation (`soundManager.playWorldSound`)
3. **Damage still happens** - Ships take/deal damage, explosions occur
4. **State still changes** - Ships can flee, die, etc.

---

## Proposed Changes

### [MODIFY] [enemy.js](file:///Users/softhook/Documents/GitHub/elite/enemy.js)

**Calculate on-screen status once + skip frames for off-screen**
```javascript
// Line ~380, at start of update():
this._isOnScreen = system.player && 
    Math.abs(this.pos.x - system.player.pos.x) < width/2 + 200 &&
    Math.abs(this.pos.y - system.player.pos.y) < height/2 + 200;

// Skip full update every 3 frames for off-screen enemies  
if (!this._isOnScreen && !this.inCombat) {
    if (!this._offScreenOffset) this._offScreenOffset = Math.floor(Math.random() * 3);
    if ((frameCount + this._offScreenOffset) % 3 !== 0) {
        this.updatePhysics();
        return;
    }
}
```

---

### [MODIFY] [enemyAIBehaviors.js](file:///Users/softhook/Documents/GitHub/elite/enemyAIBehaviors.js)

**1. Simplified updateCombatAI for off-screen**
```javascript
// In updateCombatAI, near start:
if (!this._isOnScreen) {
    // Basic targeting only
    if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
        this.target = this.lastAttacker;
    } else if (!this.target || !this.isTargetValid(this.target)) {
        if (system.player && this.isTargetValid(system.player)) {
            this.target = system.player;
        }
    }
    
    // Basic movement + firing (generates battle sounds)
    if (this.target?.pos) {
        this.performSafeRotationAndThrust(system, this.target.pos);
        const dist = this.distanceTo(this.target);
        const angle = atan2(this.target.pos.y - this.pos.y, this.target.pos.x - this.pos.x);
        this.performFiring(system, true, dist, angle);
    }
    return; // Skip cover, range stall, ally penalties
}
```

**2. Skip asteroid avoidance/safe rotation for off-screen**
```javascript
// In performSafeRotationAndThrust:
if (!this._isOnScreen) {
    // Direct movement without avoidance
    this.performRotationAndThrust(desiredMovementTargetPos);
    return;
}
```

**3. Skip cover for off-screen**
```javascript
// In _updateCoverBehavior:
if (!this._isOnScreen) return false;
```

---

### [MODIFY] [enemyCombat.js](file:///Users/softhook/Documents/GitHub/elite/enemyCombat.js)

**Skip weapon optimization + LOS for off-screen**
```javascript
// In selectOptimalWeapon:
if (!this._isOnScreen) return this.currentWeapon;

// In _hasClearShotToTarget:
if (!this._isOnScreen) return true;
```

---

### [MODIFY] [enemyTargeting.js](file:///Users/softhook/Documents/GitHub/elite/enemyTargeting.js)

**Simplified targeting for off-screen**
```javascript
// In updateTargeting, early:
if (!this._isOnScreen) {
    if (this.lastAttacker && this.isTargetValid(this.lastAttacker)) {
        this.target = this.lastAttacker;
        return true;
    }
    if (this.target && this.isTargetValid(this.target)) return true;
    if (system.player && this.isTargetValid(system.player)) {
        this.target = system.player;
        return true;
    }
    this.target = null;
    return false;
}
```
