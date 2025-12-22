class InventoryScreen {
  constructor() {
    this.jettisonButtons = [];
    this.closeButton = {};
  }

  draw(player) {
    if (!player) return;
    this.jettisonButtons = [];

    const pX = width * 0.2, pY = height * 0.2;
    const pW = width * 0.6, pH = height * 0.6;

    push();
    if (typeof font !== 'undefined') textFont(font);
    fill(30, 30, 50, 220);
    stroke(100, 150, 255);
    rect(pX, pY, pW, pH, 8);

    noStroke();
    textAlign(CENTER, TOP);
    fill(255); textSize(STATION_TEXT_SIZE.HEADER);
    text("Inventory", pX + pW / 2, pY + 10);

    // Ship info
    const infoY = pY + 50;
    noStroke();
    textAlign(LEFT, TOP); textSize(STATION_TEXT_SIZE.BODY);
    text(`Ship: ${player.shipTypeName}`, pX + 20, infoY);
    text(`Cargo: ${player.getCargoAmount()}/${player.cargoCapacity}`, pX + 20, infoY + 24);

    // Cargo list - REFACTORED FOR ALIGNMENT
    const startY = infoY + 100;
    const rowH = 30;      // Consistent row height
    const buttonW = 80;   // Button width
    const buttonH = 24;   // Button height
    const buttonX = pX + pW - buttonW - 20; // Consistent X position

    // Draw cargo items in a neatly aligned grid
    player.cargo.forEach((item, i) => {
      const rowY = startY + (i * rowH);

      // Check if mission cargo
      const isMissionCargo = player.activeMission && player.activeMission.cargoType === item.name;

      // Text alignment
      if (isMissionCargo) {
        fill(255, 200, 100); // Gold/Orange for mission items
      } else {
        fill(255);
      }
      noStroke();
      textAlign(LEFT, CENTER);
      textSize(STATION_TEXT_SIZE.BODY);

      let labelText = `${item.name}: ${item.quantity}`;
      if (isMissionCargo) {
        const req = player.activeMission.cargoQuantity || 0;
        const missionAmount = Math.min(item.quantity, req);
        const extraAmount = Math.max(0, item.quantity - req);

        if (extraAmount > 0) {
          labelText = `${item.name}: ${missionAmount} (Mission) + ${extraAmount} (Free)`;
        } else {
          labelText = `${item.name}: ${missionAmount} / ${req} (Mission)`;
        }
      }

      text(labelText, pX + 40, rowY + rowH / 2);

      // Mission Badge
      if (isMissionCargo) {
        push();
        // Adjust badge position based on longer text, or keep it fixed? 
        // Previous fixed pos was pX + 220. With longer text, we might overlap.
        // Let's measure text width or move it further right.
        // Or just leave it as an extra visual indicator.

        fill(200, 150, 0);
        noStroke();
        // Move badge further right to clear the longer text
        rect(pX + 350, rowY + rowH / 2 - 9, 60, 18, 4);
        fill(20);
        textSize(STATION_TEXT_SIZE.HELPER);
        textAlign(CENTER, CENTER);
        text("MISSION", pX + 380, rowY + rowH / 2 + 1);
        pop();
      }

      // Jettison button - centered vertically in the row
      const buttonY = rowY + (rowH - buttonH) / 2;
      fill(180, 50, 50);
      stroke(200, 100, 100);
      rect(buttonX, buttonY, buttonW, buttonH, 4);

      // Button text
      fill(255);
      noStroke();
      textAlign(CENTER, CENTER);
      textSize(STATION_TEXT_SIZE.BODY);
      text("Jettison", buttonX + buttonW / 2, buttonY + buttonH / 2);

      // Store button area for click detection
      this.jettisonButtons.push({
        x: buttonX,
        y: buttonY,
        w: buttonW,
        h: buttonH,
        index: i
      });
    });

    // Close button - centered horizontally
    const cw = 100, ch = 30;
    const cx = pX + (pW - cw) / 2, cy = pY + pH - ch - 15;
    fill(80, 80, 120);
    stroke(150, 150, 200);
    rect(cx, cy, cw, ch, 4);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(STATION_TEXT_SIZE.BODY);
    text("Close", cx + cw / 2, cy + ch / 2);
    this.closeButton = { x: cx, y: cy, w: cw, h: ch };

    pop();
  }

  handleClick(mx, my, player) {
    if (this._hit(mx, my, this.closeButton)) return 'close';
    for (const b of this.jettisonButtons) {
      if (this._hit(mx, my, b)) {
        return { action: 'jettison', idx: b.index };
      }
    }
    return null;
  }

  _hit(x, y, r) {
    return x >= r.x && x <= r.x + r.w &&
      y >= r.y && y <= r.y + r.h;
  }
}