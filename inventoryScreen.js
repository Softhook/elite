class InventoryScreen {
  constructor() {
    this.jettisonButtons = [];
    this.closeButton = {};
    this.gamepadSelectedCargoIndex = -1;  // Track gamepad selection
  }

  draw(player) {
    if (!player) return;
    this.jettisonButtons = [];

    // Use larger panel to fit all sections
    const pX = width * 0.1, pY = height * 0.08;
    const pW = width * 0.8, pH = height * 0.84;

    push();
    if (typeof font !== 'undefined') textFont(font);

    // Main panel background
    fill(20, 30, 50, 240);
    stroke(100, 150, 255);
    strokeWeight(1);
    rect(pX, pY, pW, pH, 10);

    // Title
    noStroke();
    textAlign(CENTER, TOP);
    fill(200, 220, 255);
    textSize(STATION_TEXT_SIZE.HEADER);
    text("Ship Status & Inventory", pX + pW / 2, pY + 12);

    // --- Layout: 2 columns, left for status/upgrades/weapons, right for cargo ---
    const colGap = 20;
    const leftColX = pX + 20;
    const leftColW = pW * 0.45;
    const rightColX = leftColX + leftColW + colGap;
    const rightColW = pW - leftColW - colGap - 40;
    const contentY = pY + 50;
    const sectionGap = 12;
    const rowH = 22;

    let curY = contentY;

    // ====== LEFT COLUMN ======

    // --- Ship Info Section ---
    curY = this._drawSectionHeader("Ship Information", leftColX, curY, leftColW);
    curY += 4;

    textAlign(LEFT, TOP);
    textSize(STATION_TEXT_SIZE.BODY);
    fill(180, 200, 255);
    text(`Ship: `, leftColX + 10, curY);
    fill(255);
    text(player.shipTypeName, leftColX + 60, curY);
    curY += rowH;

    fill(180, 200, 255);
    text(`Hull: `, leftColX + 10, curY);
    fill(this._getHealthColor(player.hull, player.maxHull));
    text(`${Math.ceil(player.hull)} / ${player.maxHull}`, leftColX + 60, curY);
    curY += rowH;

    fill(180, 200, 255);
    text(`Shield: `, leftColX + 10, curY);
    fill(100, 180, 255);
    text(`${Math.ceil(player.shield)} / ${player.maxShield}`, leftColX + 60, curY);
    curY += rowH;

    fill(180, 200, 255);
    text(`Credits: `, leftColX + 10, curY);
    fill(255, 220, 100);
    text(`${player.credits.toLocaleString()} CR`, leftColX + 70, curY);
    curY += rowH;

    fill(180, 200, 255);
    text(`Total Kills: `, leftColX + 10, curY);
    fill(255, 150, 150);
    text(`${player.kills || 0}`, leftColX + 90, curY);
    curY += rowH + sectionGap;

    // --- Faction Prestige Section ---
    curY = this._drawSectionHeader("Faction Standing", leftColX, curY, leftColW);
    curY += 4;

    const factionColors = {
      POLICE: [100, 150, 255],
      MILITARY: [100, 200, 100],
      IMPERIAL: [255, 215, 0],
      SEPARATIST: [255, 100, 100]
    };

    const factionNames = {
      POLICE: 'Police',
      MILITARY: 'Military',
      IMPERIAL: 'Imperial',
      SEPARATIST: 'Separatist'
    };

    for (const [faction, displayName] of Object.entries(factionNames)) {
      // Check membership
      let isMember = false;
      if (faction === 'POLICE') {
        isMember = player.isPolice;
      } else {
        isMember = (player.playerFaction === faction);
      }

      // Get accurate rank name (e.g. "Recruit", "Sergeant", "Knight") or "" if not member
      const rank = isMember && player.getFactionRank ? player.getFactionRank(faction) : '';

      // Get correct progress metric (Prestige vs Kills)
      let progress = 0;
      let unit = 'pts';

      if (player.getFactionKillsProgress) {
        const pData = player.getFactionKillsProgress(faction);
        progress = pData.progress;
        unit = pData.usesPrestige ? 'pts' : 'kills';
      } else {
        progress = player.factionPrestige?.[faction] || 0;
      }

      const color = factionColors[faction];

      textAlign(LEFT, TOP);
      textSize(STATION_TEXT_SIZE.BODY);
      fill(color[0], color[1], color[2]);
      text(`${displayName}:`, leftColX + 10, curY);

      fill(255);
      text(`${rank}`, leftColX + 100, curY);

      fill(150, 150, 150);
      textSize(STATION_TEXT_SIZE.HELPER);
      text(`(${progress} ${unit})`, leftColX + 220, curY + 2); // Adjusted X position slightly
      curY += rowH;
    }
    curY += sectionGap;

    // --- Ship Upgrades Section ---
    curY = this._drawSectionHeader("Ship Upgrades", leftColX, curY, leftColW);
    curY += 4;

    const upgradeTypes = ['armor', 'engine', 'cargo', 'hardpoints', 'shield', 'cloak', 'booster'];
    const upgradeLabels = {
      armor: 'Armor',
      engine: 'Engine',
      cargo: 'Cargo Bay',
      hardpoints: 'Hardpoints',
      shield: 'Shield',
      cloak: 'Cloak',
      booster: 'Afterburners'
    };

    for (const type of upgradeTypes) {
      const level = player.installedUpgrades?.[type] || 0;
      let upgradeName = 'None';

      if (level > 0 && typeof SHIP_UPGRADES !== 'undefined') {
        const upg = SHIP_UPGRADES.find(u => u.type === type && u.level === level);
        if (upg) upgradeName = upg.name;
      }

      textAlign(LEFT, TOP);
      textSize(STATION_TEXT_SIZE.BODY);
      fill(150, 180, 200);
      text(`${upgradeLabels[type]}:`, leftColX + 10, curY);

      if (level > 0) {
        fill(100, 255, 150);
      } else {
        fill(120, 120, 120);
      }
      text(upgradeName, leftColX + 100, curY);
      curY += rowH;
    }
    curY += sectionGap;

    // --- Weapons Section ---
    curY = this._drawSectionHeader("Weapons", leftColX, curY, leftColW);
    curY += 4;

    if (player.weapons && player.weapons.length > 0) {
      const validWeapons = player.weapons.filter(w => w !== null);
      if (validWeapons.length > 0) {
        for (let i = 0; i < player.weapons.length; i++) {
          const weapon = player.weapons[i];
          textAlign(LEFT, TOP);
          textSize(STATION_TEXT_SIZE.BODY);

          fill(100, 120, 150);
          text(`Slot ${i + 1}:`, leftColX + 10, curY);

          if (weapon) {
            const isCurrentWeapon = player.weaponIndex === i;
            if (isCurrentWeapon) {
              fill(255, 200, 100);
            } else {
              fill(200, 200, 255);
            }
            text(weapon.name, leftColX + 60, curY);

            // Show weapon tier if available
            if (weapon.tier) {
              fill(150, 150, 150);
              textSize(STATION_TEXT_SIZE.HELPER);
              text(`(T${weapon.tier})`, leftColX + 200, curY + 2);
            }
          } else {
            fill(80, 80, 80);
            text('Empty', leftColX + 60, curY);
          }
          curY += rowH;
        }
      } else {
        fill(120, 120, 120);
        textSize(STATION_TEXT_SIZE.BODY);
        text('No weapons installed', leftColX + 10, curY);
        curY += rowH;
      }
    } else {
      fill(120, 120, 120);
      textSize(STATION_TEXT_SIZE.BODY);
      text('No weapons installed', leftColX + 10, curY);
      curY += rowH;
    }

    // ====== RIGHT COLUMN ======
    let rightY = contentY;

    // --- Active Mission Section ---
    rightY = this._drawSectionHeader("Active Mission", rightColX, rightY, rightColW);
    rightY += 4;

    textAlign(LEFT, TOP);
    textSize(STATION_TEXT_SIZE.BODY);

    if (player.activeMission) {
      fill(255, 220, 150);
      text(player.activeMission.title || 'Unnamed Mission', rightColX + 10, rightY);
      rightY += rowH;

      fill(180, 180, 200);
      textSize(STATION_TEXT_SIZE.HELPER);
      const missionType = player.activeMission.type || 'Unknown';
      text(`Type: ${missionType}`, rightColX + 10, rightY);
      rightY += rowH - 4;

      if (player.activeMission.destinationSystem) {
        text(`Destination: ${player.activeMission.destinationSystem}`, rightColX + 10, rightY);
        rightY += rowH - 4;
      }

      // Show progress for multi-target missions
      const m = player.activeMission;
      const killTypes = ['Pirate Bounty', 'Police Bounty', 'Alien Bounty', 'Imperial Elimination', 'Imperial Strike', 'Separatist Raid', 'Separatist Strike', 'Military Extermination', 'Military Strike'];
      const patrolTypes = ['Imperial Patrol', 'Military Defense'];
      const targetTypes = [...killTypes, ...patrolTypes];

      if (targetTypes.includes(m.type) && m.targetCount > 0) {
        fill(150, 255, 150);
        text(`Progress: ${m.progressCount}/${m.targetCount}`, rightColX + 10, rightY);
        rightY += rowH - 4;
      }

      // Show progress for Sabotage missions
      if (m.type === 'Sabotage' || m.type === 'Imperial Sabotage' || m.type === 'Separatist Sabotage' || m.type === 'Military Sabotage') {
        if (m.status === 'Completable' || m.progressCount >= 1) {
          fill(100, 255, 100);
          text(`Objective: DESTROYED`, rightColX + 10, rightY);
        } else {
          fill(255, 150, 150);
          text(`Objective: Active`, rightColX + 10, rightY);
        }
        rightY += rowH - 4;
      }

      if (player.activeMission.rewardCredits) {
        fill(255, 220, 100);
        text(`Reward: ${player.activeMission.rewardCredits.toLocaleString()} CR`, rightColX + 10, rightY);
        rightY += rowH;
      }
    } else {
      fill(120, 120, 120);
      text('No active mission', rightColX + 10, rightY);
      rightY += rowH;
    }
    rightY += sectionGap;

    // --- Cargo Section ---
    rightY = this._drawSectionHeader(`Cargo (${player.getCargoAmount()}/${player.cargoCapacity})`, rightColX, rightY, rightColW);
    rightY += 4;

    const cargoRowH = 28;
    const buttonW = 70;
    const buttonH = 22;
    const buttonX = rightColX + rightColW - buttonW - 10;

    if (player.cargo.length === 0) {
      fill(120, 120, 120);
      textSize(STATION_TEXT_SIZE.BODY);
      textAlign(LEFT, TOP);
      text('Cargo hold empty', rightColX + 10, rightY);
      rightY += cargoRowH;
    } else {
      player.cargo.forEach((item, i) => {
        const rowY = rightY + (i * cargoRowH);

        // Check if this would overflow the panel
        if (rowY + cargoRowH > pY + pH - 60) return;

        // Check if mission cargo
        const isMissionCargo = player.activeMission && player.activeMission.cargoType === item.name;
        const isGamepadSelected = i === this.gamepadSelectedCargoIndex;

        textAlign(LEFT, CENTER);
        textSize(STATION_TEXT_SIZE.BODY);

        // Highlight background if gamepad-selected
        if (isGamepadSelected) {
          push();
          fill(100, 120, 180, 100);
          noStroke();
          rect(rightColX + 5, rowY + 2, rightColW - 10, cargoRowH - 4, 3);
          pop();
        }

        if (isMissionCargo) {
          fill(255, 200, 100);
        } else if (isGamepadSelected) {
          fill(255, 255, 200);
        } else {
          fill(220, 220, 255);
        }

        let labelText = `${item.name}: ${item.quantity}t`;
        if (isMissionCargo) {
          const req = player.activeMission.cargoQuantity || 0;
          const missionAmount = Math.min(item.quantity, req);
          labelText = `${item.name}: ${missionAmount}/${req}t`;

          // Mission badge
          push();
          fill(200, 150, 0, 180);
          noStroke();
          rect(rightColX + 160, rowY + cargoRowH / 2 - 8, 50, 16, 3);
          fill(20);
          textSize(STATION_TEXT_SIZE.HELPER);
          textAlign(CENTER, CENTER);
          text("MISSION", rightColX + 185, rowY + cargoRowH / 2);
          pop();
        }

        noStroke();
        text(labelText, rightColX + 10, rowY + cargoRowH / 2);

        // Jettison button
        const buttonY = rowY + (cargoRowH - buttonH) / 2;
        fill(140, 50, 50);
        stroke(180, 80, 80);
        strokeWeight(1);
        rect(buttonX, buttonY, buttonW, buttonH, 3);

        fill(255);
        noStroke();
        textAlign(CENTER, CENTER);
        textSize(STATION_TEXT_SIZE.HELPER);
        text("Jettison", buttonX + buttonW / 2, buttonY + buttonH / 2);

        this.jettisonButtons.push({
          x: buttonX,
          y: buttonY,
          w: buttonW,
          h: buttonH,
          index: i
        });
      });
      rightY += player.cargo.length * cargoRowH;
    }



    // Close button - centered at bottom
    const cw = 120, ch = 32;
    const cx = pX + (pW - cw) / 2, cy = pY + pH - ch - 12;

    fill(60, 70, 100);
    stroke(120, 140, 180);
    strokeWeight(2);
    rect(cx, cy, cw, ch, 5);

    fill(255);
    noStroke();
    textAlign(CENTER, CENTER);
    textSize(STATION_TEXT_SIZE.BODY);
    text("Close", cx + cw / 2, cy + ch / 2);
    this.closeButton = { x: cx, y: cy, w: cw, h: ch };

    pop();
  }

  _drawSectionHeader(title, x, y, w) {
    // Section header background
    fill(40, 50, 70);
    noStroke();
    rect(x, y, w, 22, 4);

    // Section title
    fill(180, 200, 255);
    textAlign(LEFT, CENTER);
    textSize(STATION_TEXT_SIZE.BODY);
    text(title, x + 8, y + 11);

    return y + 26;
  }

  _getHealthColor(current, max) {
    const ratio = current / max;
    if (ratio > 0.6) return color(100, 255, 100);
    if (ratio > 0.3) return color(255, 200, 100);
    return color(255, 100, 100);
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