// ****** uiComponents.js ******
// Shared UI drawing primitives and helpers used across all UI modules.
// This file must be loaded BEFORE uiManager.js

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
        if (options.alignH !== undefined || options.alignV !== undefined) {
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
}

// Also export as global for use in other files
if (typeof window !== 'undefined') {
    window.UIComponents = UIComponents;
}
