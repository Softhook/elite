// ****** uiGalaxyMap.js ******
// Galaxy map rendering, system selection, route display, and market overlay.
// This file must be loaded BEFORE uiManager.js

/**
 * UIGalaxyMap - Handles galaxy map rendering and interaction.
 */
class UIGalaxyMap {
    constructor() {
        // Clickable node areas
        this.galaxyMapNodeAreas = [];
        
        // Market button areas
        this.galaxyMapMarketButtonAreas = [];
        
        // Locked destination index for auto-jump
        this.lockedDestinationIndex = -1;
        
        // Market overlay state
        this.marketOverlaySystemIndex = -1;
        this.marketOverlayArea = null;
        
        // Cache for market overlay description
        this._marketOverlayCacheIndex = -1;
        this._marketOverlayDescText = '';
        this._marketOverlayDescSize = 15;
        this._marketOverlayDescPadding = 12;
        this._marketOverlayDescHeight = 110;
    }

    /**
     * Clears the locked destination.
     */
    clearLockedDestination() {
        this.lockedDestinationIndex = -1;
    }

    /**
     * Gets the locked destination index.
     * @returns {number}
     */
    getLockedDestination() {
        return this.lockedDestinationIndex;
    }

    /**
     * Closes the market overlay.
     */
    closeMarketOverlay() {
        this.marketOverlaySystemIndex = -1;
    }

    /**
     * Draws the Galaxy Map screen.
     * @param {Galaxy} galaxy
     * @param {Player} player
     * @param {Function} isPlayerInJumpZoneFn - Function to check if player is in jump zone
     */
    drawGalaxyMap(galaxy, player, isPlayerInJumpZoneFn) {
        if (!galaxy || !player) return;
        
        this.galaxyMapNodeAreas = [];
        this.galaxyMapMarketButtonAreas = [];
        
        const systems = galaxy.getSystemDataForMap ? galaxy.getSystemDataForMap() : [];
        const currentIdx = galaxy.currentSystemIndex;
        const reachable = galaxy.getReachableSystems ? galaxy.getReachableSystems() : [];
        
        const currentSystem = galaxy.getCurrentSystem ? galaxy.getCurrentSystem() : null;
        const canJump = typeof isPlayerInJumpZoneFn === 'function' ? isPlayerInJumpZoneFn(player, currentSystem) : false;
        
        push();
        
        // Compute bounding box and transformation
        let minX = Infinity, maxX = -Infinity, minY = Infinity, maxY = -Infinity;
        for (let sys of systems) {
            minX = min(minX, sys.x);
            maxX = max(maxX, sys.x);
            minY = min(minY, sys.y);
            maxY = max(maxY, sys.y);
        }
        
        const margin = 100;
        const mapWidth = maxX - minX;
        const mapHeight = maxY - minY;
        if (mapWidth === 0 || mapHeight === 0) {
            pop();
            return;
        }
        
        const scaleX = (width - 2 * margin) / mapWidth;
        const scaleY = (height - 2 * margin) / mapHeight;
        const scale = min(scaleX, scaleY);
        const offsetX = width / 2 - (minX + mapWidth / 2) * scale;
        const offsetY = height / 2 - (minY + mapHeight / 2) * scale;
        
        // Draw Connections
        stroke(150, 150, 200, 200);
        strokeWeight(1);
        for (let i = 0; i < galaxy.systems.length; i++) {
            const systemA = galaxy.systems[i];
            if (!systemA?.galaxyPos || !systemA.connectedSystemIndices) continue;
            
            systemA.connectedSystemIndices.forEach(j => {
                if (j > i) {
                    const systemB = galaxy.systems[j];
                    if (systemB?.galaxyPos && galaxy.systems[i].connectedSystemIndices.includes(j)) {
                        let x1 = systemA.galaxyPos.x * scale + offsetX;
                        let y1 = systemA.galaxyPos.y * scale + offsetY;
                        let x2 = systemB.galaxyPos.x * scale + offsetX;
                        let y2 = systemB.galaxyPos.y * scale + offsetY;
                        line(x1, y1, x2, y2);
                    }
                }
            });
        }
        
        // Draw System Nodes
        const nodeR = 15;
        for (let i = 0, len = systems.length; i < len; i++) {
            const sysData = systems[i];
            if (!sysData) continue;
            
            let isCurrent = (i === currentIdx);
            let isSelected = (i === this.lockedDestinationIndex);
            let isReachable = reachable.includes(i);
            
            let nodeColor;
            let textColor = color(255);
            let nodeStrokeWeight = 1;
            let nodeStrokeColor = color(100, 80, 150);
            
            // Determine base fill color
            if (isCurrent) {
                const colorArray = typeof Galaxy !== 'undefined' && Galaxy.getEconomyColor ? Galaxy.getEconomyColor(sysData.type) : [100, 100, 200, 230];
                const opaqueColorArray = [...colorArray];
                opaqueColorArray[3] = 230;
                nodeColor = color(...opaqueColorArray);
                textColor = color(255);
            } else if (!sysData.visited) {
                nodeColor = color(80, 80, 80, 230);
                textColor = color(160);
            } else {
                const colorArray = typeof Galaxy !== 'undefined' && Galaxy.getEconomyColor ? Galaxy.getEconomyColor(sysData.type) : [100, 100, 200, 230];
                const opaqueColorArray = [...colorArray];
                opaqueColorArray[3] = 230;
                nodeColor = color(...opaqueColorArray);
            }
            
            // Adjust stroke based on jump readiness and reachability
            if (isCurrent) {
                nodeStrokeColor = color(255);
                nodeStrokeWeight = 3;
            } else if (canJump && isReachable) {
                nodeStrokeColor = color(255);
                nodeStrokeWeight = 1;
                if (sysData.visited) textColor = color(255);
            } else if (!canJump && isReachable) {
                nodeStrokeColor = color(150);
                nodeStrokeWeight = 1;
            } else {
                nodeStrokeColor = color(100, 80, 150);
                nodeStrokeWeight = 1;
            }
            
            // Highlight selected system
            if (isSelected && !isCurrent) {
                nodeStrokeColor = color(255, 255, 0);
                nodeStrokeWeight = 4;
            }
            
            // Compute transformed position
            const drawX = sysData.x * scale + offsetX;
            const drawY = sysData.y * scale + offsetY;
            
            // Draw the ellipse
            strokeWeight(nodeStrokeWeight);
            stroke(nodeStrokeColor);
            fill(nodeColor);
            ellipse(drawX, drawY, nodeR * 2, nodeR * 2);
            
            // Store clickable area
            this.galaxyMapNodeAreas.push({ x: drawX, y: drawY, radius: nodeR, index: i });
            
            // Draw Text Labels
            if (typeof font !== 'undefined') textFont(font);
            fill(textColor);
            noStroke();
            textAlign(CENTER, TOP);
            textSize(20);
            text(sysData.name, drawX, drawY + nodeR + 5);
            
            // Show type/security only if visited or current
            if (sysData.visited || isCurrent) {
                const system = galaxy.systems[i];
                const techLevel = system?.techLevel || "?";
                
                text(`(${sysData.type} - Tech ${techLevel})`, drawX, drawY + nodeR + 25);
                
                const secLevel = system?.securityLevel || "Unknown";
                fill(180, 200, 255);
                text(`Security: ${secLevel}`, drawX, drawY + nodeR + 45);
                
                if (system && system.playerWanted) {
                    fill(255, 0, 0);
                    text("Wanted", drawX, drawY + nodeR + 65);
                }
                
                // Market info button
                const btnSize = 20;
                const btnX = drawX + nodeR + 5;
                const btnY = drawY - btnSize / 2;
                
                fill(40, 100, 180, 200);
                stroke(100, 150, 255);
                strokeWeight(1);
                rect(btnX, btnY, btnSize, btnSize, 3);
                
                fill(255);
                noStroke();
                textAlign(CENTER, CENTER);
                textSize(14);
                text("M", btnX + btnSize / 2, btnY + btnSize / 2);
                
                this.galaxyMapMarketButtonAreas.push({
                    x: btnX,
                    y: btnY,
                    w: btnSize,
                    h: btnSize,
                    systemIndex: i
                });
            }
        }
        
        // Instructions
        UIComponents.setTextStyle({ fill: 255, size: 18, align: [CENTER, BOTTOM] });
        if (this.lockedDestinationIndex !== -1) {
            text("Destination locked. Enter jump zone to auto-jump.", width / 2, height - 70);
        } else {
            text("Click reachable system to lock as destination.", width / 2, height - 70);
        }
        
        // Draw Market Overlay if a system is selected
        if (this.marketOverlaySystemIndex !== -1 && this.marketOverlaySystemIndex < galaxy.systems.length) {
            this._drawMarketOverlay(galaxy, this.marketOverlaySystemIndex);
        }
        
        pop();
    }

    /**
     * Draws the market overlay for a system.
     * @param {Galaxy} galaxy
     * @param {number} systemIndex
     */
    _drawMarketOverlay(galaxy, systemIndex) {
        const system = galaxy.systems[systemIndex];
        if (!system || !system.station || !system.station.market) return;
        
        const market = system.station.market;
        const commodities = market.getPrices ? market.getPrices() : [];
        
        // Calculate dynamic height
        const headerHeight = 45;
        const rowHeight = 28;
        const closeButtonPadding = 40;
        
        // Dynamic description sizing
        if (this._marketOverlayCacheIndex !== systemIndex) {
            this._marketOverlayCacheIndex = systemIndex;
            const descText = (typeof generateSystemDescription === 'function') 
                ? generateSystemDescription(system, { galaxy: galaxy, player: (typeof player !== 'undefined' ? player : null) }) 
                : '';
            const descSize = 15;
            const descPadding = 12;
            const descW = 360 - 24;
            
            let descHeight = 0;
            if (descText && typeof textWidth === 'function') {
                push();
                if (typeof font !== 'undefined') textFont(font);
                textSize(descSize);
                const paras = descText.split('\n');
                const leading = descSize * 1.35;
                for (let p of paras) {
                    if (!p) { descHeight += leading; continue; }
                    const w = textWidth(p);
                    const lines = Math.max(1, Math.ceil(w / descW));
                    descHeight += lines * leading;
                }
                pop();
                descHeight += descPadding * 2;
            } else {
                descHeight = 110;
            }
            
            this._marketOverlayDescText = descText;
            this._marketOverlayDescSize = descSize;
            this._marketOverlayDescPadding = descPadding;
            this._marketOverlayDescHeight = descHeight;
        }
        
        const overlayH = headerHeight + (commodities.length * rowHeight) + closeButtonPadding + (this._marketOverlayDescHeight || 110);
        const overlayW = 360;
        const overlayX = width - overlayW - 20;
        const autopilotOffset = (typeof player !== 'undefined' && player?.autopilotEnabled) ? 35 : 0;
        const overlayY = 80 + autopilotOffset;
        
        push();
        
        // Background
        fill(20, 30, 50, 240);
        stroke(100, 150, 255);
        strokeWeight(1);
        rect(overlayX, overlayY, overlayW, overlayH, 8);
        
        // Header
        UIComponents.setTextStyle({ fill: 255, size: 22, align: [CENTER, TOP] });
        if (typeof font !== 'undefined') textFont(font);
        text(`${system.name}`, overlayX + overlayW / 2, overlayY + 10);
        
        // Column headers
        const tableY = overlayY + 45;
        const col1X = overlayX + 15;
        const col2X = overlayX + 160;
        const col3X = overlayX + 240;
        const col4X = overlayX + 320;
        
        UIComponents.setTextStyle({ fill: [180, 200, 255], size: 15, align: [LEFT, TOP] });
        text("Commodity", col1X, tableY);
        textAlign(CENTER, TOP);
        text("Buy", col2X, tableY);
        text("Sell", col3X, tableY);
        text("Stock", col4X, tableY);
        
        // Draw commodities
        let yPos = tableY + 25;
        
        for (let i = 0; i < commodities.length; i++) {
            const comm = commodities[i];
            if (!comm) continue;
            
            // Alternate row background
            UIComponents.drawAlternatingRow(i, overlayX + 5, yPos - 2, overlayW - 10, rowHeight - 2);
            
            // Commodity name
            UIComponents.setTextStyle({ fill: 255, size: 15, align: [LEFT, TOP] });
            text(comm.name, col1X, yPos);
            
            // Buy price with color coding
            textAlign(CENTER, TOP);
            if (comm.baseBuy > 0) {
                const buyDeviation = (comm.buyPrice - comm.baseBuy) / comm.baseBuy;
                // For buying, lower prices are better (green = good deal)
                fill(...UIComponents.getPriceDeviationColor(buyDeviation, false));
            } else {
                fill(255);
            }
            text(comm.buyPrice, col2X, yPos);
            
            // Sell price with color coding
            if (comm.baseSell > 0) {
                let sellDeviation = (comm.sellPrice - comm.baseSell) / comm.baseSell;
                fill(...UIComponents.getPriceDeviationColor(sellDeviation, true));
            } else {
                fill(255);
            }
            text(comm.sellPrice, col3X, yPos);
            
            // Stock level
            fill(255);
            text(Math.floor(comm.stock || 0), col4X, yPos);
            
            yPos += rowHeight;
        }
        
        // System description
        const cachedDesc = this._marketOverlayDescText || '';
        const cachedDescSize = this._marketOverlayDescSize || 16;
        
        if (cachedDesc) {
            const descX = overlayX + 12;
            const descBoxW = overlayW - 24;
            const descY = yPos + 12;
            
            UIComponents.setTextStyle({ fill: 220, size: cachedDescSize, align: [LEFT, TOP] });
            if (typeof font !== 'undefined') textFont(font);
            textLeading(cachedDescSize * 1.35);
            text(cachedDesc, descX, descY, descBoxW);
        }
        
        // Store overlay area for click detection
        this.marketOverlayArea = {
            x: overlayX,
            y: overlayY,
            w: overlayW,
            h: overlayH
        };
        
        pop();
    }

    /**
     * Handles clicks on the galaxy map.
     * @param {number} mx
     * @param {number} my
     * @param {Galaxy} galaxy
     * @param {Player} player
     * @param {Function} addMessageFn - Function to add UI messages
     * @returns {boolean} True if click was handled
     */
    handleGalaxyMapClicks(mx, my, galaxy, player, addMessageFn) {
        if (!galaxy || !player) return false;
        
        const currentSystem = galaxy.getCurrentSystem ? galaxy.getCurrentSystem() : null;
        const canJump = typeof isPlayerInJumpZone === 'function' ? isPlayerInJumpZone(player, currentSystem) : false;
        const reachable = galaxy.getReachableSystems ? galaxy.getReachableSystems() : [];
        
        // Check market buttons
        for (const btn of this.galaxyMapMarketButtonAreas) {
            if (UIComponents.isClickInArea(mx, my, btn)) {
                if (this.marketOverlaySystemIndex === btn.systemIndex) {
                    this.marketOverlaySystemIndex = -1;
                } else {
                    this.marketOverlaySystemIndex = btn.systemIndex;
                }
                if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                return true;
            }
        }
        
        // Check if click is inside market overlay (to close it)
        if (this.marketOverlaySystemIndex !== -1 && this.marketOverlayArea && UIComponents.isClickInArea(mx, my, this.marketOverlayArea)) {
            this.marketOverlaySystemIndex = -1;
            if (typeof soundManager !== 'undefined') soundManager.playSound('click_off');
            return true;
        }
        
        // Check system nodes for selection
        for (const area of this.galaxyMapNodeAreas) {
            let d = dist(mx, my, area.x, area.y);
            if (d < area.radius) {
                const clickedIndex = area.index;
                
                if (clickedIndex === galaxy.currentSystemIndex) {
                    // Clicking current system deselects destination
                    this.lockedDestinationIndex = -1;
                    if (typeof soundManager !== 'undefined') soundManager.playSound('click_off');
                    return true;
                }
                
                if (reachable.includes(clickedIndex)) {
                    // Reachable system - lock as destination
                    this.lockedDestinationIndex = clickedIndex;
                    if (typeof soundManager !== 'undefined') soundManager.playSound('click');
                } else {
                    // Not reachable - show error
                    if (typeof addMessageFn === 'function') {
                        addMessageFn("Route unavailable.", [255, 150, 150]);
                    }
                    if (typeof soundManager !== 'undefined') soundManager.playSound('error');
                }
                return true;
            }
        }
        
        return false;
    }
}

// Export for use
if (typeof window !== 'undefined') {
    window.UIGalaxyMap = UIGalaxyMap;
}
