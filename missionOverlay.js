class MissionOverlay {
    constructor() {
        this.closeButton = {};
    }

    draw(player) {
        if (!player) return;

        const pX = width * 0.2, pY = height * 0.2;
        const pW = width * 0.6, pH = height * 0.6;

        push();
        // Use global game font
        if (typeof font !== 'undefined') textFont(font);

        fill(30, 30, 50, 250);
        stroke(255, 180, 0); // Mission Gold
        strokeWeight(2);
        rect(pX, pY, pW, pH, 8);

        textAlign(CENTER, TOP);
        fill(255, 200, 50);
        textSize(STATION_TEXT_SIZE.HEADER);
        text("Mission Details", pX + pW / 2, pY + 20);

        // Close button - centered horizontally at bottom
        const cw = 120, ch = 36;
        const cx = pX + (pW - cw) / 2, cy = pY + pH - ch - 20;

        // Check if hover
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

        fill(255);
        textAlign(CENTER, CENTER);
        textSize(STATION_TEXT_SIZE.BODY);
        text("Close", cx + cw / 2, cy + ch / 2);
        this.closeButton = { x: cx, y: cy, w: cw, h: ch };

        if (!player.activeMission) {
            fill(200);
            textAlign(CENTER, CENTER);
            text("No active mission.", pX + pW / 2, pY + pH / 2);
        } else {
            const m = player.activeMission;

            let startY = pY + 80;
            textAlign(LEFT, TOP);

            // Title
            fill(255, 220, 100);
            textSize(STATION_TEXT_SIZE.SUBHEADER);
            text(m.title || "Unknown Mission", pX + 40, startY);

            // Description starts below title
            startY += 40;

            // Calculate available height for details to avoid overlap with bottom elements
            // Bottom area starts around cy (close buttons) - ~60px for status/rewards
            const bottomReservedY = cy - 50;
            const detailsMaxH = bottomReservedY - startY - 20; // 20px padding

            // Details
            fill(220);
            textSize(STATION_TEXT_SIZE.BODY);
            textLeading(28); // Increased leading for readability

            // Use getDetails if available, otherwise fallback
            const details = typeof m.getDetails === 'function' ? m.getDetails() : (m.description || "No details available.");

            text(details, pX + 40, startY, pW - 80, Math.max(50, detailsMaxH));

            // Reward and Status at bottom (above close button area)
            const statusY = cy - 40;

            // Status
            let statusColor = [200, 200, 200];
            if (m.status === 'Completed' || m.status === 'Completable') statusColor = [100, 255, 100];
            else if (m.status === 'Failed') statusColor = [255, 100, 100];

            fill(...statusColor);
            textSize(STATION_TEXT_SIZE.BODY);
            textAlign(LEFT, BASELINE);
            text(`Status: ${m.status}`, pX + 40, statusY);

            // Reward (if visible)
            if (m.reward) {
                fill(255, 255, 100);
                textAlign(RIGHT, BASELINE);
                text(`Reward: ${m.reward} CR`, pX + pW - 40, statusY);
            }
        }

        pop();
    }

    handleClick(mx, my) {
        if (this._hit(mx, my, this.closeButton)) return 'close';
        return null;
    }

    _hit(x, y, r) {
        return x >= r.x && x <= r.x + r.w &&
            y >= r.y && y <= r.y + r.h;
    }
}
