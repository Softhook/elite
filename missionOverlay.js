class MissionOverlay {
    constructor() {
        this.closeButton = {};
        this.scrollOffset = 0;
        this.maxScroll = 0;
        this.contentHeight = 0;
        this._lastDetails = "";
        this._cachedTextHeight = 0;
    }

    draw(player) {
        if (!player) return;

        // Use 80% of screen
        const pX = width * 0.1, pY = height * 0.1;
        const pW = width * 0.8, pH = height * 0.8;

        push();
        if (typeof font !== 'undefined') textFont(font);

        // Main background
        fill(30, 30, 50, 250);
        stroke(255, 180, 0); // Mission Gold
        strokeWeight(2);
        rect(pX, pY, pW, pH, 8);

        // Header
        textAlign(CENTER, TOP);
        fill(255, 200, 50);
        textSize(STATION_TEXT_SIZE.BIGHEADER);
        text("Mission Details", pX + pW / 2, pY + 25);

        // Close button geometry
        const cw = 160, ch = 40;
        const cx = pX + (pW - cw) / 2, cy = pY + pH - ch - 25;

        // Hover effect
        const mx = mouseX;
        const my = mouseY;
        const isHover = mx >= cx && mx <= cx + cw && my >= cy && my <= cy + ch;

        if (isHover) {
            fill(100, 100, 150);
            stroke(180, 180, 255);
        } else {
            fill(80, 80, 120);
            stroke(150, 150, 200);
        }
        strokeWeight(1);
        rect(cx, cy, cw, ch, 4);

        // Close label
        fill(255);
        textAlign(CENTER, CENTER);
        textSize(STATION_TEXT_SIZE.BODY);
        text("Close", cx + cw / 2, cy + ch / 2);
        this.closeButton = { x: cx, y: cy, w: cw, h: ch };

        if (!player.activeMission) {
            fill(200);
            textAlign(CENTER, CENTER);
            textSize(STATION_TEXT_SIZE.HEADER);
            text("No active mission.", pX + pW / 2, pY + pH / 2);
        } else {
            const m = player.activeMission;
            const contentStartX = pX + 50;
            const contentWidth = pW - 100;
            const contentStartY = pY + 80;
            const contentEndY = cy - 40;
            const visibleHeight = contentEndY - contentStartY;

            // Text sizes
            const titleSize = STATION_TEXT_SIZE.HEADER;
            const detailSize = STATION_TEXT_SIZE.BODY;
            const lineHeight = detailSize * 1.4;

            // Details text
            const details = typeof m.getDetails === 'function' ? m.getDetails() : (m.description || "No details available.");

            // Draw Title (Fixed)
            fill(255, 220, 100);
            textSize(titleSize);
            textAlign(LEFT, TOP);
            text(m.title || "Unknown Mission", contentStartX, contentStartY);

            const bodyStartY = contentStartY + 50;
            const bodyVisibleHeight = contentEndY - bodyStartY;

            // Accurate Content Height Calculation
            textSize(detailSize); // Ensure context has correct size for measurement
            if (this._lastDetails !== details || this._cachedTextHeight === 0) {
                this._cachedTextHeight = this._calculateTextHeight(details, contentWidth, lineHeight);
                this._lastDetails = details;
            }
            this.contentHeight = this._cachedTextHeight + 20; // +20 buffer

            // Only scroll if content is definitely larger than view
            this.maxScroll = Math.max(0, this.contentHeight - bodyVisibleHeight);

            // Clamp scroll
            this.scrollOffset = Math.min(Math.max(this.scrollOffset, 0), this.maxScroll);

            // Clip & Draw Body
            const ctx = drawingContext;
            ctx.save();
            ctx.beginPath();
            ctx.rect(pX, bodyStartY, pW, bodyVisibleHeight);
            ctx.clip();

            fill(220);
            textSize(detailSize);
            textLeading(lineHeight);
            textAlign(LEFT, TOP);

            // Draw text with scroll offset
            text(details, contentStartX, bodyStartY - this.scrollOffset, contentWidth, 10000);

            ctx.restore();

            // Draw Scrollbar ONLY if maxScroll > 0
            if (this.maxScroll > 0) {
                const scrollBarW = 8;
                const scrollBarH = bodyVisibleHeight;
                const scrollBarX = pX + pW - 20;
                const scrollBarY = bodyStartY;

                // Track
                fill(0, 0, 0, 100);
                noStroke();
                rect(scrollBarX, scrollBarY, scrollBarW, scrollBarH, 4);

                // Handle
                const handleRatio = Math.min(1, bodyVisibleHeight / this.contentHeight);
                const handleH = Math.max(30, scrollBarH * handleRatio);
                const handleY = scrollBarY + (this.scrollOffset / this.maxScroll) * (scrollBarH - handleH);

                fill(255, 180, 0, 150);
                rect(scrollBarX, handleY, scrollBarW, handleH, 4);
            }

            // Reward and Status area
            const statusY = cy - 50;
            strokeWeight(1);
            let statusColor = [200, 200, 200];
            if (m.status === 'Completed' || m.status === 'Completable') statusColor = [100, 255, 100];
            else if (m.status === 'Failed') statusColor = [255, 100, 100];

            fill(...statusColor);
            textSize(STATION_TEXT_SIZE.BODY);
            textAlign(LEFT, BASELINE);
            text(`Status: ${m.status}`, contentStartX, statusY + 20);

            if (m.rewardCredits) {
                fill(255, 255, 100);
                textAlign(RIGHT, BASELINE);
                text(`Reward: ${m.rewardCredits} CR`, pX + pW - 50, statusY + 20);
            }
        }

        pop();
    }

    /** Make text calculation explicit to avoid estimation errors */
    _calculateTextHeight(textStr, maxWidth, lineHeight) {
        if (!textStr) return 0;
        const paragraphs = textStr.split('\n');
        let totalLines = 0;

        for (const para of paragraphs) {
            if (para === "") {
                totalLines++;
                continue;
            }

            const words = para.split(' ');
            let currentLine = "";

            for (let i = 0; i < words.length; i++) {
                const word = words[i];
                const testLine = currentLine + word + " ";
                const testWidth = textWidth(testLine);

                if (testWidth > maxWidth && i > 0) {
                    totalLines++;
                    currentLine = word + " ";
                } else {
                    currentLine = testLine;
                }
            }
            totalLines++; // Count the last line of the paragraph
        }

        return totalLines * lineHeight;
    }

    handleClick(mx, my) {
        if (this._hit(mx, my, this.closeButton)) return 'close';
        return null;
    }

    handleWheel(event) {
        if (this.maxScroll > 0) {
            this.scrollOffset += event.deltaY;
            this.scrollOffset = Math.min(Math.max(this.scrollOffset, 0), this.maxScroll);
            return true;
        }
        return false;
    }

    _hit(x, y, r) {
        return x >= r.x && x <= r.x + r.w &&
            y >= r.y && y <= r.y + r.h;
    }
}
