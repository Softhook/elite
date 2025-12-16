// ****** uiComponents.js ******
// Shared UI drawing primitives and helpers used across all UI modules.
// This file must be loaded BEFORE uiManager.js

// Standard panel background color - used for all menus to ensure consistent appearance
const STANDARD_PANEL_BG = [20, 20, 40, 220];

/**
 * UIComponents - Static utility class providing common UI drawing operations.
 * All methods are static to allow easy use throughout the UI system without
 * requiring an instance.
 */
class UIComponents {
    /**
     * Sets common text styling properties in one call.
     * @param {Object} options - Styling options
     * @param {Array|number} [options.fill] - Fill color (array or single value)
     * @param {number} [options.size] - Text size
     * @param {Array} [options.align] - Alignment as [horizontal, vertical] array
     * @param {string} [options.alignH] - Horizontal alignment (LEFT, CENTER, RIGHT)
     * @param {string} [options.alignV] - Vertical alignment (TOP, CENTER, BOTTOM)
     * @param {boolean} [options.noStroke=false] - If true, disable stroke
     */
    static setTextStyle(options = {}) {
        if (options.fill !== undefined) {
            if (Array.isArray(options.fill)) {
                fill(...options.fill);
            } else {
                fill(options.fill);
            }
        }
        if (options.size !== undefined) {
            textSize(options.size);
        }
        // Support both align: [H, V] array format and alignH/alignV separate properties
        if (options.align !== undefined && Array.isArray(options.align)) {
            textAlign(options.align[0] || LEFT, options.align[1] || TOP);
        } else if (options.alignH !== undefined || options.alignV !== undefined) {
            const h = options.alignH || LEFT;
            const v = options.alignV || TOP;
            textAlign(h, v);
        }
        if (options.noStroke) {
            noStroke();
        }
    }

    /**
     * Draws a semi-transparent section background box.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {Array|number} [fillColor=[0,0,0,100]] - Fill color
     * @param {number} [radius=0] - Corner radius
     */
    static drawSectionBG(x, y, w, h, fillColor = [0, 0, 0, 100], radius = 0) {
        if (Array.isArray(fillColor)) {
            fill(...fillColor);
        } else {
            fill(fillColor);
        }
        noStroke();
        if (radius > 0) {
            rect(x, y, w, h, radius);
        } else {
            rect(x, y, w, h);
        }
    }

    /**
     * Draws centered informational text (e.g., "No items available").
     * @param {string} message - The message to display
     * @param {number} x - Center X position
     * @param {number} y - Center Y position
     * @param {Object} [style={}] - Text styling options
     */
    static drawCenteredInfo(message, x, y, style = {}) {
        const defaultStyle = { fill: 180, size: 20, alignH: CENTER, alignV: CENTER };
        UIComponents.setTextStyle({ ...defaultStyle, ...style });
        text(message, x, y);
    }

    /**
     * Draws a standardized button and returns its clickable area object.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} label - Button text
     * @param {Array} fillCol - Fill color [r,g,b]
     * @param {Array} strokeCol - Stroke color [r,g,b]
     * @param {number} [radius=5] - Corner radius
     * @param {Object} [extra={}] - Extra properties to attach to the area object
     * @returns {Object} Area object with x, y, w, h, and any extra properties
     */
    static drawButton(x, y, w, h, label, fillCol, strokeCol, radius = 5, extra = {}) {
        // If this is a back button, force a consistent blue background
        if (typeof label === 'string' && label.trim().toLowerCase() === 'back') {
            fillCol = [0, 80, 180];
            strokeCol = [100, 150, 255];
        }
        fill(...fillCol);
        stroke(...strokeCol);
        strokeWeight(2);
        rect(x, y, w, h, radius);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(22);
        text(label, x + w / 2, y + h / 2);
        return Object.assign({ x, y, w, h }, extra);
    }

    /**
     * Draws button label text with standard centered styling.
     * @param {string} label - Button text
     * @param {number} x - Button X
     * @param {number} y - Button Y
     * @param {number} w - Button width
     * @param {number} h - Button height
     * @param {number|Array} fillColor - Fill color (number or [r,g,b])
     * @param {number} [size=20] - Text size
     */
    static drawButtonLabel(label, x, y, w, h, fillColor = 255, size = 20) {
        if (Array.isArray(fillColor)) {
            fill(...fillColor);
        } else {
            fill(fillColor);
        }
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(size);
        text(label, x + w / 2, y + h / 2);
    }

    /**
     * Draws alternating row background for table-like displays.
     * @param {number} index - Row index
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     */
    static drawAlternatingRow(index, x, y, w, h) {
        noStroke();
        if (index % 2 === 0) {
            fill(0, 0, 0, 100);
        } else {
            fill(80, 80, 80, 100);
        }
        rect(x, y, w, h);
    }

    /**
     * Draws a scrollbar and returns the area object for click detection.
     * @param {number} x - X position of panel right edge
     * @param {number} y - Y position (top of scroll area)
     * @param {number} h - Height of scroll area
     * @param {number} scrollOffset - Current scroll offset
     * @param {number} scrollMax - Maximum scroll offset
     * @param {number} visibleItems - Number of visible items
     * @param {number} totalItems - Total number of items
     * @param {Array} [bgColor=[60,60,100]] - Background color
     * @param {Array} [strokeColor=[150,150,200]] - Border color
     * @returns {Object|null} Area object or null if no scrolling needed
     */
    static drawScrollbar(x, y, h, scrollOffset, scrollMax, visibleItems, totalItems, bgColor = [60, 60, 100], strokeColor = [150, 150, 200]) {
        if (scrollMax <= 0) return null;

        const barW = 12;
        const barX = x - 18;

        fill(...bgColor);
        stroke(...strokeColor);
        rect(barX, y, barW, h, 6);

        const handleH = max(30, h * (visibleItems / totalItems));
        const handleY = y + (h - handleH) * (scrollOffset / scrollMax);

        fill(180, 180, 220);
        noStroke();
        rect(barX + 1, handleY, barW - 2, handleH, 6);

        return { x: barX, y, w: barW, h, handleY, handleH };
    }

    /**
     * Returns the appropriate fill color for a price deviation.
     * @param {number} deviation - The price deviation ratio
     * @param {boolean} isSellPrice - If true, inverts logic (positive = good for selling)
     * @returns {Array} RGB color array [r, g, b]
     */
    static getPriceDeviationColor(deviation, isSellPrice = false) {
        const threshold = 0.05;
        if (isSellPrice) {
            if (deviation > threshold) return [50, 255, 50];
            if (deviation < -threshold) return [255, 50, 50];
        } else {
            if (deviation < -threshold) return [50, 255, 50];
            if (deviation > threshold) return [255, 50, 50];
        }
        return [255, 255, 255];
    }

    /**
     * Draws a price indicator bar for market displays.
     * @param {number} x - X position
     * @param {number} y - Y position (top of row)
     * @param {number} rowH - Row height
     * @param {number} deviation - Price deviation ratio
     * @param {boolean} isSellPrice - Whether this is a sell price indicator
     * @param {number} maxDeviation - Maximum deviation for full bar height
     */
    static drawPriceIndicator(x, y, rowH, deviation, isSellPrice = false, maxDeviation = 0.8) {
        const indicatorMaxH = rowH * 0.6;
        const indicatorYOffset = (rowH - indicatorMaxH) / 2;
        const threshold = 0.05;

        let indicatorH = constrain(abs(deviation) / maxDeviation, 0, 1) * indicatorMaxH;
        let indicatorY = y + indicatorYOffset + (indicatorMaxH - indicatorH);

        const col = UIComponents.getPriceDeviationColor(deviation, isSellPrice);

        if (abs(deviation) <= threshold) {
            fill(120);
            indicatorH = 1;
            indicatorY = y + indicatorYOffset + indicatorMaxH - indicatorH;
        } else {
            fill(col[0], col[1], col[2]);
        }

        if (indicatorH > 0) {
            noStroke();
            rect(x, indicatorY, 3, indicatorH);
        }
    }

    /**
     * Gets the fill color for stock quantity based on availability.
     * @param {number} stockQty - Stock quantity
     * @param {boolean} outOfStock - Whether item is out of stock
     * @returns {Array} RGB color array [r, g, b]
     */
    static getStockColor(stockQty, outOfStock = false) {
        if (outOfStock) return [255, 120, 120];
        if (stockQty < 50) return [255, 180, 120];
        if (stockQty > 200) return [120, 200, 255];
        return [220, 220, 220];
    }

    /**
     * Draws a market button (Buy/Sell) with proper styling.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {string} label - Button text
     * @param {boolean} enabled - Whether button is clickable
     * @param {boolean} isBuy - True for buy buttons, false for sell
     * @param {string} [disabledReason] - Reason shown if disabled
     * @returns {Object|null} Button area object if enabled, null if disabled
     */
    static drawMarketButton(x, y, w, h, label, enabled, isBuy, disabledReason = null) {
        if (!enabled) {
            fill(disabledReason ? 100 : 40);
            stroke(disabledReason ? 120 : 0);
            if (disabledReason) strokeWeight(1); else noStroke();
            rect(x, y, w, h, 3);
            fill(disabledReason ? (isBuy ? [255, 150, 150] : 180) : 60);
            noStroke();
            textAlign(CENTER, CENTER);
            textSize(20);
            text(disabledReason || label, x + w / 2, y + h / 2);
            return null;
        }

        if (isBuy) {
            fill(label.includes('All') ? 0 : 0, label.includes('All') ? 180 : 150, 0);
            stroke(0, label.includes('All') ? 220 : 200, 0);
        } else {
            fill(label.includes('All') ? 180 : 150, 0, 0);
            stroke(label.includes('All') ? 220 : 200, 0, 0);
        }
        strokeWeight(1);
        rect(x, y, w, h, 3);
        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(20);
        text(label, x + w / 2, y + h / 2);

        return { x, y, w, h };
    }

    /**
     * Draws a stat bar (e.g., hull, shield) with color coding.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} width - Total width available
     * @param {string} label - Label text
     * @param {number} current - Current value
     * @param {number} max - Maximum value
     * @param {number} percent - Percentage (0-100)
     */
    static drawStatBar(x, y, width, label, current, max, percent) {
        const barHeight = 14;
        const barWidth = width * 0.7;
        const labelWidth = width * 0.3;

        push();
        textAlign(LEFT, TOP);
        fill(210);
        text(`${label}:`, x, y);

        const barX = x + labelWidth;
        fill(40, 40, 60, 200);
        noStroke();
        rect(barX, y, barWidth, barHeight, 2);

        const fillWidth = (percent / 100) * barWidth;
        let barColor;
        if (label === 'Shield') {
            if (percent > 66) barColor = [0, 200, 255];
            else if (percent > 33) barColor = [80, 150, 220];
            else barColor = [60, 100, 180];
        } else {
            if (percent > 66) barColor = [80, 255, 80];
            else if (percent > 33) barColor = [255, 220, 0];
            else barColor = [255, 80, 80];
        }

        fill(barColor[0], barColor[1], barColor[2]);
        rect(barX, y, fillWidth, barHeight, 2);
        pop();
    }

    /**
     * Checks if mouse coords are within a button area object.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Object} area - Area object {x, y, w, h}
     * @returns {boolean}
     */
    static isClickInArea(mx, my, area) {
        return area && area.w > 0 && area.h > 0 &&
            mx > area.x && mx < area.x + area.w &&
            my > area.y && my < area.y + area.h;
    }

    /**
     * Finds the first clicked button in an array and returns it.
     * @param {number} mx - Mouse X
     * @param {number} my - Mouse Y
     * @param {Array} buttonAreas - Array of button area objects
     * @returns {Object|null} The clicked button area or null
     */
    static findClickedButton(mx, my, buttonAreas) {
        if (!Array.isArray(buttonAreas)) return null;
        for (const btn of buttonAreas) {
            if (UIComponents.isClickInArea(mx, my, btn)) {
                return btn;
            }
        }
        return null;
    }

    /**
     * Draws panel background with optional border.
     * @param {number} x - X position
     * @param {number} y - Y position
     * @param {number} w - Width
     * @param {number} h - Height
     * @param {Array} [fillCol=STANDARD_PANEL_BG] - Fill color
     * @param {Array} [strokeCol=[100,100,255]] - Stroke color
     * @param {number} [radius=10] - Corner radius
     */
    static drawPanelBG(x, y, w, h, fillCol = STANDARD_PANEL_BG, strokeCol = [100, 100, 255], radius = 10) {
        fill(...fillCol);
        stroke(...strokeCol);
        rect(x, y, w, h, radius);
    }

    /**
     * Draws a centered back button at the bottom of a panel.
     * Uses standard back button styling (blue background).
     * @param {number} panelX - Panel X position
     * @param {number} panelY - Panel Y position
     * @param {number} panelW - Panel width
     * @param {number} panelH - Panel height
     * @param {Object} [extra={}] - Extra properties to attach to the area object
     * @returns {Object} Area object for the back button
     */
    static drawCenteredBackButton(panelX, panelY, panelW, panelH, extra = {}) {
        const backW = 100, backH = 30;
        const backX = panelX + panelW / 2 - backW / 2;
        const backY = panelY + panelH - backH - 15;
        return UIComponents.drawButton(backX, backY, backW, backH, "Back", [0, 80, 180], [100, 150, 255], 5, extra);
    }

    /**
     * Draws the currently docked station or space object as a large background element.
     * The object is drawn scaled up and centered in the panel with low opacity.
     * @param {number} panelX - Panel X position
     * @param {number} panelY - Panel Y position
     * @param {number} panelW - Panel width
     * @param {number} panelH - Panel height
     * @param {Object} options - Options object
     * @param {Object} options.station - Station object (optional)
     * @param {Object} options.spaceObject - Space object (optional)
     * @param {string} options.currentState - Current game state
     * @param {string} options.returnFromRecordState - Return state for record screen (optional)
     */
    static drawDockedObjectBackground(panelX, panelY, panelW, panelH, options = {}) {
        const { station, spaceObject, currentState, returnFromRecordState } = options;
        if (!currentState) return;

        // Only draw for docked states
        const dockedStates = [
            'DOCKED', 'VIEWING_MARKET', 'VIEWING_MISSIONS', 'VIEWING_SHIPYARD',
            'VIEWING_UPGRADES', 'VIEWING_REPAIRS', 'VIEWING_PROTECTION', 'VIEWING_POLICE',
            'VIEWING_IMPERIAL_RECRUITMENT', 'VIEWING_SEPARATIST_RECRUITMENT', 'VIEWING_MILITARY_RECRUITMENT',
            'VIEWING_STORAGE', 'VIEWING_RECORD',
            'DOCKED_SPACE_OBJECT', 'VIEWING_SPACE_OBJECT_MARKET', 'VIEWING_SPACE_OBJECT_REPAIRS',
            'VIEWING_SPACE_OBJECT_SHIPYARD', 'VIEWING_SPACE_OBJECT_UPGRADES'
        ];

        if (!dockedStates.includes(currentState)) return;

        const centerX = panelX + panelW / 2;
        const centerY = panelY + panelH / 2;

        push();
        const ctx = drawingContext;
        ctx.save();

        // Draw the docked object across the full canvas so its edges reach screen bounds
        const drawCenterX = width / 2;
        const drawCenterY = height / 2;
        const drawW = width;
        const drawH = height;

        // Slightly stronger alpha so the rotation is visible in the border
        drawingContext.globalAlpha = 0.25;

        const isSpaceObjectState = currentState.includes('SPACE_OBJECT') ||
            currentState === 'DOCKED_SPACE_OBJECT' ||
            (currentState === 'VIEWING_RECORD' && returnFromRecordState === 'DOCKED_SPACE_OBJECT');

        if (isSpaceObjectState && spaceObject) {
            UIComponents._drawScaledObject(spaceObject, drawCenterX, drawCenterY, drawW, drawH, 0.9);
        } else if (station) {
            UIComponents._drawScaledObject(station, drawCenterX, drawCenterY, drawW, drawH, 0.85, 1.5);
        }

        //Mask the center by filling the panel rounded-rect
        drawingContext.globalAlpha = 0.9;
        noStroke();
        const bg = Array.isArray(STANDARD_PANEL_BG) ? STANDARD_PANEL_BG : [20, 20, 40, 220];
        // Fill the panel area (rounded corners) to hide the object inside the panel bounds
        fill(bg[0], bg[1], bg[2], 255);
        rect(panelX, panelY, panelW, panelH, 10);

        ctx.restore();
        pop();
    }

    /**
     * Helper to draw a scaled and rotated object for background display.
     * @private
     */
    static _drawScaledObject(obj, centerX, centerY, panelW, panelH, sizeRatio, extraScale = 1) {
        if (!obj || typeof obj.draw !== 'function') return;

        // Save object state
        const origX = obj.pos.x;
        const origY = obj.pos.y;
        const origAngle = obj.angle;
        const origBobPhase = obj.bobPhase;
        const origLightTimer = obj.lightTimer;

        push();
        translate(centerX, centerY);

        const targetSize = Math.min(panelW, panelH) * sizeRatio * extraScale;
        const currentSize = obj.size || 48;
        const scaleFactor = targetSize / currentSize;
        scale(scaleFactor);

        // Use consistent, slow rotation based on millis()
        const backgroundRotation = (typeof millis === 'function' ? millis() : 0) * 0.0001;
        rotate(backgroundRotation);

        // Temporarily set object to origin for drawing
        obj.pos.x = 0;
        obj.pos.y = 0;
        obj.angle = 0;

        // Animate bobPhase for space objects to keep them moving
        // Use millis() to ensure continuous animation independent of game loop
        if (obj.bobPhase !== undefined) {
            obj.bobPhase = (typeof millis === 'function' ? millis() : 0) * 0.0015;
        }

        obj.draw();

        // Restore original state
        obj.pos.x = origX;
        obj.pos.y = origY;
        obj.angle = origAngle;
        if (origBobPhase !== undefined) obj.bobPhase = origBobPhase;
        if (origLightTimer !== undefined) obj.lightTimer = origLightTimer;
        pop();
    }

    /**
     * Draws a standardized header for station/space object screens.
     * @param {Object} config - Header configuration
     * @param {string} config.title - Screen title (centered)
     * @param {string} config.locationName - Station or space object name
     * @param {string} config.systemName - System name
     * @param {string} config.economyType - Economy type
     * @param {number|string} config.techLevel - Tech level
     * @param {string} config.securityLevel - Security level
     * @param {Object} config.player - Player object for credits/cargo display
     * @param {number} config.panelX - Panel X position
     * @param {number} config.panelY - Panel Y position
     * @param {number} config.panelW - Panel width
     * @returns {number} Height of the header
     */
    static drawStandardHeader(config) {
        const { title, locationName, systemName, economyType, techLevel, securityLevel, player, panelX, panelY, panelW } = config;
        const headerHeight = 100;

        // Title (centered)
        fill(255);
        noStroke();
        if (typeof font !== 'undefined') textFont(font);
        textSize(30);
        textAlign(CENTER, TOP);
        text(title, panelX + panelW / 2, panelY + 20);

        // Location and system (left aligned)
        textSize(20);
        textAlign(LEFT, TOP);
        text(`${locationName} - ${systemName}`, panelX + 20, panelY + 20);

        // Economy, tech, security (left aligned)
        text(`${economyType}   |   Tech: ${techLevel}   |   Security: ${securityLevel}`, panelX + 20, panelY + 45);

        // Credits and cargo (right aligned)
        if (player) {
            textAlign(RIGHT, TOP);
            text(`Credits: ${Math.floor(player.credits)}`, panelX + panelW - 30, panelY + 20);
            text(`Cargo: ${Math.floor(player.getCargoAmount())}/${player.cargoCapacity}`, panelX + panelW - 30, panelY + 45);
        }

        return headerHeight;
    }

    /**
     * Draws a vertical list of menu buttons and returns button areas.
     * @param {Array} options - Array of { text, state?, action? } objects
     * @param {number} startY - Y position to start drawing
     * @param {number} panelX - Panel X position
     * @param {number} panelW - Panel width
     * @param {number} btnW - Button width
     * @param {number} btnH - Button height
     * @param {number} btnSpacing - Spacing between buttons
     * @param {Array} fillCol - Button fill color [r,g,b]
     * @param {Array} strokeCol - Button stroke color [r,g,b]
     * @returns {Array} Array of button area objects
     */
    static drawMenuButtonList(options, startY, panelX, panelW, btnW, btnH, btnSpacing, fillCol, strokeCol) {
        const btnX = panelX + panelW / 2 - btnW / 2;
        const areas = [];

        for (let i = 0; i < options.length; i++) {
            const opt = options[i];
            const btnY = startY + i * btnSpacing;
            const area = UIComponents.drawButton(btnX, btnY, btnW, btnH, opt.text, fillCol, strokeCol);
            if (opt.state) area.state = opt.state;
            if (opt.action) area.action = opt.action;
            areas.push(area);
        }

        return areas;
    }

    /**
     * Computes scroll parameters for a list and clamps the offset.
     * @param {number} currentOffset - Current scroll offset
     * @param {number} totalItems - Total number of items in the list
     * @param {number} visibleItems - Number of items that fit in view
     * @returns {Object} { firstRow, lastRow, scrollOffset, scrollMax }
     */
    static computeScrollParams(currentOffset, totalItems, visibleItems) {
        const scrollMax = Math.max(0, totalItems - visibleItems);
        const scrollOffset = constrain(currentOffset || 0, 0, scrollMax);
        const firstRow = scrollOffset;
        const lastRow = Math.min(firstRow + visibleItems, totalItems);

        return { firstRow, lastRow, scrollOffset, scrollMax };
    }

    /**
     * Draws a single commodity row for market screens (station or space object).
     * @param {Object} config - Row configuration
     * @param {string} config.name - Commodity name
     * @param {number} config.buyPrice - Price to buy (0 if not available)
     * @param {number} config.sellPrice - Price to sell (0 if not available)
     * @param {number} config.baseBuy - Base buy price for deviation calculation
     * @param {number} config.baseSell - Base sell price for deviation calculation
     * @param {number} config.stock - Available stock (-1 for unlimited/hidden)
     * @param {number} config.playerQty - Quantity in player cargo
     * @param {boolean} config.isAvailable - Whether commodity is tradeable here
     * @param {boolean} config.isMissionCargo - Whether this is mission cargo (can't sell)
     * @param {number} config.rowIndex - Row index for alternating colors
     * @param {number} config.x - X position
     * @param {number} config.y - Y position
     * @param {number} config.rowH - Row height
     * @param {Object} config.columns - Column positions { commodity, buy, sell, stock, cargo, buttonsStart, totalWidth }
     * @param {number} config.btnW - Button width
     * @param {number} config.btnH - Button height
     * @param {boolean} [config.showStock=true] - Whether to show stock column
     * @param {number} [config.maxDeviation=0.8] - Max deviation for price indicators
     * @returns {Array} Array of button area objects for this row
     */
    static drawMarketRow(config) {
        const { name, buyPrice, sellPrice, baseBuy, baseSell, stock, playerQty,
            isAvailable, isMissionCargo, rowIndex, x, y, rowH, columns, btnW, btnH,
            showStock = true, maxDeviation = 0.8 } = config;

        const buttonAreas = [];
        const tY = y + rowH / 2;
        const btnY = y + (rowH - btnH) / 2;
        const btnSpacing = 5;

        // Alternating row background
        fill(rowIndex % 2 === 0 ? color(0, 0, 0, 100) : color(80, 80, 80, 100));
        noStroke();
        rect(x, y, columns.totalWidth, rowH);

        // Commodity name
        textAlign(LEFT, CENTER);
        fill(isAvailable ? 255 : 100);
        text(name || '?', x + 10, tY);

        // Buy price with color coding
        textAlign(CENTER, CENTER);
        if (buyPrice > 0) {
            fill(UIComponents.getPriceDeviationColor((buyPrice - baseBuy) / baseBuy, false));
            text(buyPrice, columns.buy, tY);
        } else {
            fill(80);
            text("-", columns.buy, tY);
        }

        // Sell price with color coding  
        if (sellPrice > 0) {
            fill(UIComponents.getPriceDeviationColor((sellPrice - baseSell) / baseSell, true));
            text(sellPrice, columns.sell, tY);
        } else {
            fill(80);
            text("-", columns.sell, tY);
        }

        // Stock column (optional)
        if (showStock && stock >= 0) {
            fill(UIComponents.getStockColor(stock, stock <= 0));
            text(Math.floor(stock), columns.stock, tY);
        }

        // Cargo amount
        fill(playerQty > 0 ? 255 : 80);
        text(playerQty, columns.cargo, tY);

        // Price indicators
        if (baseBuy > 0 && buyPrice > 0) {
            const buyDeviation = (buyPrice - baseBuy) / baseBuy;
            UIComponents.drawPriceIndicator(columns.buy + 40, y, rowH, buyDeviation, false, maxDeviation);
        }
        if (baseSell > 0 && sellPrice > 0) {
            const sellDeviation = (sellPrice - baseSell) / baseSell;
            UIComponents.drawPriceIndicator(columns.sell + 40, y, rowH, sellDeviation, true, maxDeviation);
        }

        // Buttons
        let btnX = columns.buttonsStart;

        // Buy 1
        const canBuy = buyPrice > 0 && isAvailable;
        const buy1Area = UIComponents.drawMarketButton(btnX, btnY, btnW, btnH, "Buy 1", canBuy, true, !canBuy && stock === 0 ? "Out" : null);
        if (buy1Area) buttonAreas.push({ ...buy1Area, action: 'buy', quantity: 1, commodity: name });
        btnX += btnW + btnSpacing;

        // Buy All
        const buyAllArea = UIComponents.drawMarketButton(btnX, btnY, btnW, btnH, "Buy All", canBuy, true, !canBuy && stock === 0 ? "Out" : null);
        if (buyAllArea) buttonAreas.push({ ...buyAllArea, action: 'buyAll', commodity: name });
        btnX += btnW + 10; // Extra spacing before sell

        // Sell 1
        const canSell = sellPrice > 0 && isAvailable && !isMissionCargo;
        const sell1Area = UIComponents.drawMarketButton(btnX, btnY, btnW, btnH, "Sell 1", canSell, false);
        if (sell1Area) buttonAreas.push({ ...sell1Area, action: 'sell', quantity: 1, commodity: name });
        btnX += btnW + btnSpacing;

        // Sell All
        const sellAllArea = UIComponents.drawMarketButton(btnX, btnY, btnW, btnH, "Sell All", canSell, false);
        if (sellAllArea) buttonAreas.push({ ...sellAllArea, action: 'sellAll', commodity: name });

        return buttonAreas;
    }

    /**
     * Draws a rotating 3D ship preview for detail screens.
     * @param {Object} shipDef - Ship definition from SHIP_DEFINITIONS
     * @param {number} centerX - Center X position
     * @param {number} centerY - Center Y position
     * @param {number} size - Ship size to render
     * @param {number} [rotationSpeed=0.01] - Rotation speed multiplier
     * @returns {void}
     */
    static drawRotatingShip(shipDef, centerX, centerY, size, rotationSpeed = 0.002) {
        if (!shipDef) return;

        push();
        translate(centerX, centerY);

        // Calculate rotation angle based on time
        const rotationAngle = (typeof millis === 'function' ? millis() : frameCount * 16) * rotationSpeed;

        // Rotate the entire ship
        rotate(rotationAngle);

        // Calculate local sun angle for 3D lighting
        const localSunAngle = -0.785;

        // Draw the ship using its draw function
        // Pass angle=0 since we're already rotating the canvas, but draw function also needs it for extrusion
        if (typeof shipDef.drawFunction === 'function') {
            shipDef.drawFunction(size, false, rotationAngle, localSunAngle);
        } else {
            // Fallback to simple shape if no draw function
            fill(100, 150, 200);
            noStroke();
            ellipse(0, 0, size * 0.8);
        }

        pop();
    }
}

// Also export as global for use in other files
if (typeof window !== 'undefined') {
    window.UIComponents = UIComponents;
}
