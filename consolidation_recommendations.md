# Elite Redux UI Consolidation Recommendations

## 1. Button Action Handler Consolidation

### Current Problem
Repetitive button click handling patterns across all UI states (DOCKED, VIEWING_MARKET, VIEWING_MISSIONS, etc.)

### Recommended Solution
```javascript
// Add to UIManager class
_handleButtonAreaClicks(mx, my, buttonAreas, handlers) {
    for (const btn of buttonAreas) {
        if (this.isClickInArea(mx, my, btn)) {
            const handler = handlers[btn.action || btn.state];
            if (handler && typeof handler === 'function') {
                return handler(btn);
            }
            console.warn(`No handler for action: ${btn.action || btn.state}`);
            return true;
        }
    }
    return false;
}

// Usage example in handleMouseClicks:
if (currentState === "DOCKED") {
    const handlers = {
        "UNDOCK": () => gameStateManager?.setState("IN_FLIGHT"),
        "VIEWING_MARKET": () => gameStateManager?.setState("VIEWING_MARKET"),
        "VIEWING_MISSIONS": () => gameStateManager?.setState("VIEWING_MISSIONS"),
        // ... other handlers
    };
    return this._handleButtonAreaClicks(mx, my, this.stationMenuButtonAreas, handlers);
}
```

## 2. Purchase/Transaction Pattern Consolidation

### Current Problem
Similar purchase logic repeated in shipyard, upgrades, repairs, protection services:
- Credit checking
- Sound playing
- Message displaying
- Game saving
- Error handling

### Recommended Solution
```javascript
// Add to UIManager class
_performTransaction(cost, onSuccess, options = {}) {
    const {
        player,
        successMessage,
        failureMessage = "Not enough credits!",
        soundEffect = 'upgrade',
        autoSave = true
    } = options;

    if (player.credits >= cost) {
        player.spendCredits(cost);
        
        if (onSuccess && typeof onSuccess === 'function') {
            onSuccess();
        }
        
        if (successMessage) {
            this.addMessage(successMessage, [150, 255, 150]);
        }
        
        if (typeof soundManager !== 'undefined') {
            soundManager.playSound(soundEffect);
        }
        
        if (autoSave && typeof saveGame === 'function') {
            saveGame();
        }
        
        return true;
    } else {
        this.addMessage(failureMessage, [255, 100, 100]);
        return false;
    }
}

// Usage example:
// In shipyard click handler
const success = this._performTransaction(finalPrice, () => {
    player.applyShipDefinition(area.shipTypeKey);
}, {
    player,
    successMessage: `You bought a ${area.shipName}!`,
    soundEffect: 'upgrade'
});
```

## 3. List/Table Row Drawing Consolidation

### Current Problem
Similar row drawing patterns in market, shipyard, upgrades, missions with:
- Alternating backgrounds
- Text positioning
- Button creation
- Scrollbar handling

### Recommended Solution
```javascript
// Add to UIManager class
_drawScrollableList(config) {
    const {
        items,
        startY,
        rowHeight,
        visibleRows,
        scrollOffset = 0,
        onDrawRow,
        onDrawScrollbar,
        alternatingBg = true
    } = config;

    const {x: pX, w: pW} = this.getPanelRect();
    
    items.slice(scrollOffset, scrollOffset + visibleRows).forEach((item, index) => {
        const actualIndex = scrollOffset + index;
        const yPos = startY + index * rowHeight;
        
        // Alternating background
        if (alternatingBg && actualIndex % 2 === 0) {
            fill(0, 0, 0, 100);
            noStroke();
            rect(pX, yPos, pW, rowHeight);
        }
        
        // Call custom row drawing function
        if (onDrawRow) {
            onDrawRow(item, actualIndex, yPos, rowHeight);
        }
    });
    
    // Draw scrollbar if needed
    if (onDrawScrollbar && items.length > visibleRows) {
        onDrawScrollbar();
    }
}

// Usage example:
this._drawScrollableList({
    items: ships,
    startY: listStartY,
    rowHeight: 60,
    visibleRows: maxVisible,
    scrollOffset: this.shipyardScrollOffset,
    onDrawRow: (ship, index, yPos, height) => {
        // Ship-specific drawing logic
        this._drawShipRow(ship, index, yPos, height);
    },
    onDrawScrollbar: () => {
        this._drawScrollbar(/* scrollbar params */);
    }
});
```

## 4. Text Styling Pattern Consolidation

### Current Problem
Repetitive text styling sequences throughout UI drawing methods:
```javascript
fill(255);
textAlign(CENTER, CENTER);
textSize(20);
text("Some text", x, y);
```

### Recommended Solution
```javascript
// Add to UIManager class
_drawStyledText(text, x, y, style = {}) {
    const {
        size = 20,
        color = [255, 255, 255],
        align = CENTER,
        valign = CENTER,
        font: textFont
    } = style;

    push();
    if (textFont) textFont(textFont);
    textSize(size);
    fill(...(Array.isArray(color) ? color : [color]));
    textAlign(align, valign);
    noStroke();
    text(text, x, y);
    pop();
}

// Usage examples:
this._drawStyledText("Station Services", centerX, titleY, {
    size: 30,
    color: [255, 255, 100],
    align: CENTER
});

this._drawStyledText("Back", buttonX + buttonW/2, buttonY + buttonH/2, {
    size: 22,
    align: CENTER,
    valign: CENTER
});
```

## 5. Back Button Standardization

### Current Problem
Every screen has similar back button logic with slight variations in positioning and styling.

### Recommended Solution
```javascript
// Add to UIManager class
_drawStandardBackButton(customY = null) {
    const {x: pX, y: pY, w: pW, h: pH} = this.getPanelRect();
    const backW = 100, backH = 30;
    const backX = pX + pW/2 - backW/2;
    const backY = customY || (pY + pH - backH - 15);
    
    return this._drawButton(backX, backY, backW, backH, "Back", [180,0,0], [255,150,150]);
}

// Usage in all screen drawing methods:
this.backButtonArea = this._drawStandardBackButton();

// In click handlers:
if (this.isClickInArea(mx, my, this.backButtonArea)) {
    gameStateManager.setState("DOCKED");
    return true;
}
```

## 6. Price Indicator Drawing Consolidation

### Current Problem
Market screen has complex price deviation indicator logic that could be reused.

### Recommended Solution
```javascript
// Add to UIManager class
_drawPriceIndicator(x, y, deviation, maxHeight, options = {}) {
    const {
        width = 3,
        maxDeviation = 0.5,
        colors = {
            positive: [255, 50, 50],    // Red for expensive
            negative: [50, 255, 50],    // Green for cheap  
            neutral: [120, 120, 120]    // Gray for average
        }
    } = options;

    let indicatorH = constrain(abs(deviation) / maxDeviation, 0, 1) * maxHeight;
    let indicatorY = y + (maxHeight - indicatorH); // Bar grows upwards

    let color;
    if (deviation > 0.05) {
        color = colors.positive;
    } else if (deviation < -0.05) {
        color = colors.negative;
    } else {
        color = colors.neutral;
        indicatorH = 1; // Minimal dot
    }

    if (indicatorH > 0) {
        fill(...color);
        noStroke();
        rect(x, indicatorY, width, indicatorH);
    }
}

// Usage in market screen:
this._drawPriceIndicator(
    indicatorX, 
    yP + indicatorYOffset, 
    (comm.buyPrice - comm.baseBuy) / comm.baseBuy,
    indicatorMaxH
);
```

## 7. Sound and Message Helper Consolidation

### Current Problem
Repetitive sound playing and message showing patterns throughout click handlers.

### Recommended Solution
```javascript
// Add to UIManager class
_playSound(soundName) {
    if (typeof soundManager !== 'undefined') {
        soundManager.playSound(soundName);
    }
}

_showSuccessMessage(message, color = [150, 255, 150]) {
    this.addMessage(message, color);
    this._playSound('upgrade');
}

_showErrorMessage(message, color = [255, 100, 100]) {
    this.addMessage(message, color);
    this._playSound('error');
}

// Usage throughout handlers:
this._showSuccessMessage(`You bought a ${shipName}!`);
this._showErrorMessage("Not enough credits!");
```

## 8. Panel State Management Consolidation

### Current Problem
Each UI state manages its own button arrays and areas separately.

### Recommended Solution
```javascript
// Add to UIManager class
_clearUIState() {
    // Clear all button areas for the current screen
    this.marketButtonAreas = [];
    this.missionListButtonAreas = [];
    this.missionDetailButtonAreas = {};
    this.shipyardListAreas = [];
    this.upgradeListAreas = [];
    this.weaponSlotButtons = [];
    this.protectionServicesButtons = [];
    this.policeButtonAreas = [];
    // ... etc
}

_initializeUIState(stateName) {
    this._clearUIState();
    
    // State-specific initialization
    switch(stateName) {
        case "VIEWING_MARKET":
            this.marketButtonAreas = [];
            this.marketBackButtonArea = {};
            break;
        case "VIEWING_MISSIONS":
            this.missionListButtonAreas = [];
            this.missionDetailButtonAreas = {};
            break;
        // ... other states
    }
}

// Call at the beginning of each draw method:
// drawMarketScreen() {
//     this._initializeUIState("VIEWING_MARKET");
//     // ... rest of method
// }
```

## Implementation Priority

1. **High Priority**: Button action handler and back button standardization (affects all screens)
2. **Medium Priority**: Transaction pattern and text styling consolidation (major code reduction)
3. **Lower Priority**: List drawing and price indicator consolidation (screen-specific improvements)

## Estimated Impact

- **Code Reduction**: ~40% reduction in UI-related code
- **Maintainability**: Centralized styling and behavior patterns  
- **Consistency**: Uniform look and feel across all UI screens
- **Bug Reduction**: Single source of truth for common operations

## Next Steps

1. Implement the button action handler consolidation first
2. Standardize back button behavior across all screens
3. Consolidate transaction patterns in shipyard/upgrades/repairs
4. Create helper methods for text styling and drawing
5. Test thoroughly to ensure no regressions
