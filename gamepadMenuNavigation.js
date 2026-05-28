// ****** gamepadMenuNavigation.js ******
// Gamepad-driven menu navigation for station screens.
// Extracted from sketch.js to reduce its size and isolate responsibilities.
// Depends on globals: uiManager, gameStateManager, player, galaxy, soundManager, constrain, millis

// Gamepad menu navigation state (persists across frames)
let _gpMenuIndex = 0;
let _gpMenuState = '';  // tracks which state the index belongs to
let _gpMissionPanel = 'list';   // 'list' | 'detail' — which panel is focused on the mission board
let _gpMissionDetailIndex = 0; // index within the detail-panel buttons
let _gpCargoSelectedIndex = -1; // selected cargo item in inventory (-1 = close button focused)

function _handleGamepadStationMenus(gp, state) {
    // Reset selection index when entering a new menu state
    if (state !== _gpMenuState) {
        _gpMenuState = state;
        _gpMissionPanel = 'list';
        _gpMissionDetailIndex = 0;
        if (uiManager?.stationMenus) {
            const smObj = uiManager.stationMenus;
            smObj.newsScrollOffset = 0;
            smObj.shipyardScrollOffset = 0;
            smObj.upgradeScrollOffset = 0;
            smObj.recordScrollOffset = 0;
        }
        if (state === 'VIEWING_NEWS') {
            _gpMenuIndex = 4;
        } else {
            _gpMenuIndex = 0;
        }
    }

    // Mission board uses dedicated two-panel navigation
    if (state === 'VIEWING_MISSIONS') {
        _handleGamepadMissions(gp);
        return;
    }

    // Get the button areas for the current state
    const buttons = _getButtonAreasForState(state);

    // ── B button = go back / escape ──
    if (gp.pressed('b')) {
        _gpMenuIndex = 0;
        if (state === 'DOCKED' || state === 'DOCKED_SPACE_OBJECT') {
            gameStateManager.setState('IN_FLIGHT');
            soundManager?.playSound('click_off');
        } else if (state === 'VIEWING_SHIP_DETAIL') {
            gameStateManager.setState('VIEWING_SHIPYARD');
            soundManager?.playSound('click');
        } else if (state === 'VIEWING_WEAPON_DETAIL') {
            gameStateManager.setState('VIEWING_UPGRADES');
            soundManager?.playSound('click');
        } else if (state === 'VIEWING_RECORD') {
            // Return to the correct docked state (space object or station)
            const returnState = gameStateManager?._returnFromRecordState || 'DOCKED';
            if (gameStateManager) gameStateManager._returnFromRecordState = null;
            if (gameStateManager) gameStateManager.setState(returnState);
            soundManager?.playSound('click_off');
        } else if (state === 'VIEWING_BASE') {
            const returnState = gameStateManager?._returnFromBaseState || 'SURFACE_MODE';
            if (gameStateManager) gameStateManager._returnFromBaseState = null;

            // If we're returning to surface, nudge the astronaut away from the base
            if (returnState === 'SURFACE_MODE' && uiManager && uiManager.currentBaseObject && typeof surfaceMode !== 'undefined' && surfaceMode && surfaceMode.astronaut) {
                try {
                    const base = uiManager.currentBaseObject;
                    const moveDistance = (base.size ? (base.size / 2) : 30) + 60; // safe clearance
                    surfaceMode.astronaut.pos.y = (base.pos && typeof base.pos.y === 'number') ? (base.pos.y - moveDistance) : (surfaceMode.astronaut.pos.y - moveDistance);
                    surfaceMode.surfaceX = surfaceMode.astronaut.pos.x;
                    surfaceMode.surfaceY = surfaceMode.astronaut.pos.y;
                    uiManager.currentBaseObject = null;
                } catch (e) {
                    // Non-fatal
                }
            }
            gameStateManager.setState(returnState);
            soundManager?.playSound('click_off');
        } else {
            const isSpaceObj = state.startsWith('VIEWING_SPACE_OBJECT');
            gameStateManager.setState(isSpaceObj ? 'DOCKED_SPACE_OBJECT' : 'DOCKED');
            soundManager?.playSound('click');
        }
        return;
    }

    const sm = uiManager?.stationMenus;
    const isMarket = state === 'VIEWING_MARKET' || state === 'VIEWING_SPACE_OBJECT_MARKET';
    const isHorizontalDetail = state === 'VIEWING_SHIP_DETAIL' || state === 'VIEWING_WEAPON_DETAIL';
    const isRecordView = state === 'VIEWING_RECORD';
    const isWeaponSlotPicker = state === 'VIEWING_WEAPON_DETAIL' && !!uiManager?.stationMenus?.showingSlotPicker;
    const slotPickerSlotCount = isWeaponSlotPicker
        ? Math.max(1, (uiManager?.stationMenus?.slotPickerButtons || []).filter(b => typeof b?.slotIndex === 'number').length)
        : 1;
    const rowSize = isMarket ? 4 : 1;

    const pressedUp = gp.pressed('dpad.up') || (gp.state.ls.y < -0.7 && gp.prevState && gp.prevState.ls.y >= -0.7);
    const pressedDown = gp.pressed('dpad.down') || (gp.state.ls.y > 0.7 && gp.prevState && gp.prevState.ls.y <= 0.7);

    // Personal log has a long scrollable list and usually only one actionable button.
    // Prioritize vertical D-pad/left-stick as list scroll so gamepad users can browse entries.
    if (isRecordView && (pressedUp || pressedDown)) {
        _handleGamepadListScroll(state, pressedDown ? 1 : -1);
        soundManager?.playSound('click');
    }

    // ── D-pad up/down = navigate selection ──
    if (buttons && buttons.length > 0) {
        if (pressedUp || pressedDown) {
            if (state === 'VIEWING_NEWS' && sm && !sm.selectedNewsItem) {
                if (buttons.length >= 6) { // At least one news item exists
                    const firstNewsIdx = 4;
                    const lastNewsIdx = buttons.length - 2;
                    const backBtnIdx = buttons.length - 1;

                    if (pressedDown) {
                        if (_gpMenuIndex === lastNewsIdx) {
                            if ((sm.newsScrollOffset || 0) < (sm.newsScrollMax || 0)) {
                                sm.newsScrollOffset = (sm.newsScrollOffset || 0) + 1;
                            } else {
                                _gpMenuIndex = backBtnIdx;
                            }
                        } else if (_gpMenuIndex === backBtnIdx) {
                            _gpMenuIndex = firstNewsIdx;
                            sm.newsScrollOffset = 0;
                        } else {
                            _gpMenuIndex++;
                        }
                    } else if (pressedUp) {
                        if (_gpMenuIndex === firstNewsIdx) {
                            if ((sm.newsScrollOffset || 0) > 0) {
                                sm.newsScrollOffset = (sm.newsScrollOffset || 0) - 1;
                            } else {
                                _gpMenuIndex = backBtnIdx;
                            }
                        } else if (_gpMenuIndex === backBtnIdx) {
                            _gpMenuIndex = lastNewsIdx;
                            sm.newsScrollOffset = sm.newsScrollMax || 0;
                        } else {
                            _gpMenuIndex--;
                        }
                    }
                } else if (buttons.length === 5) {
                    // Only back button is navigatable (index 4)
                    _gpMenuIndex = 4;
                }
            } else if ((state === 'VIEWING_SHIPYARD' || state === 'VIEWING_UPGRADES') && sm) {
                const isShipyard = state === 'VIEWING_SHIPYARD';
                const scrollOffsetKey = isShipyard ? 'shipyardScrollOffset' : 'upgradeScrollOffset';
                const scrollMaxKey = isShipyard ? 'shipyardScrollMax' : 'upgradeScrollMax';

                if (buttons.length >= 2) { // At least one list item exists
                    const firstItemIdx = 0;
                    const lastItemIdx = buttons.length - 2;
                    const backBtnIdx = buttons.length - 1;

                    if (pressedDown) {
                        if (_gpMenuIndex === lastItemIdx) {
                            if ((sm[scrollOffsetKey] || 0) < (sm[scrollMaxKey] || 0)) {
                                sm[scrollOffsetKey] = (sm[scrollOffsetKey] || 0) + 1;
                            } else {
                                _gpMenuIndex = backBtnIdx;
                            }
                        } else if (_gpMenuIndex === backBtnIdx) {
                            _gpMenuIndex = firstItemIdx;
                            sm[scrollOffsetKey] = 0;
                        } else {
                            _gpMenuIndex++;
                        }
                    } else if (pressedUp) {
                        if (_gpMenuIndex === firstItemIdx) {
                            if ((sm[scrollOffsetKey] || 0) > 0) {
                                sm[scrollOffsetKey] = (sm[scrollOffsetKey] || 0) - 1;
                            } else {
                                _gpMenuIndex = backBtnIdx;
                            }
                        } else if (_gpMenuIndex === backBtnIdx) {
                            _gpMenuIndex = lastItemIdx;
                            sm[scrollOffsetKey] = sm[scrollMaxKey] || 0;
                        } else {
                            _gpMenuIndex--;
                        }
                    }
                } else if (buttons.length === 1) {
                    _gpMenuIndex = 0;
                }
            } else if (isRecordView) {
                // Keep focus stable on Record view controls while list scrolling is handled above.
            } else if (isHorizontalDetail && !isWeaponSlotPicker) {
                _handleGamepadListScroll(state, pressedDown ? -1 : 1);
            } else if (isWeaponSlotPicker && buttons.length > slotPickerSlotCount) {
                const cancelIndex = buttons.length - 1;
                if (pressedDown) {
                    _gpMenuIndex = (_gpMenuIndex < slotPickerSlotCount) ? cancelIndex : 0;
                } else if (pressedUp) {
                    _gpMenuIndex = (_gpMenuIndex >= slotPickerSlotCount) ? 0 : cancelIndex;
                }
            } else {
                _gpMenuIndex = (_gpMenuIndex + (pressedDown ? rowSize : -rowSize) + buttons.length) % buttons.length;
            }
            if (!(isHorizontalDetail && !isWeaponSlotPicker)) {
                soundManager?.playSound('click');
            }
        }
    }

    // ── D-pad left/right = scroll or horizontal nav in lists ──
    if (gp.pressed('dpad.left') || gp.pressed('dpad.right')) {
        const dir = gp.pressed('dpad.right') ? 1 : -1;
        if ((isWeaponSlotPicker || isHorizontalDetail) && buttons && buttons.length > 0) {
            _gpMenuIndex = (_gpMenuIndex + dir + buttons.length) % buttons.length;
            soundManager?.playSound('click');
        } else if (isMarket && buttons && buttons.length > 0) {
            const baseRowIdx = Math.floor(_gpMenuIndex / 4) * 4;
            const subIdx = _gpMenuIndex % 4;
            const newSubIdx = (subIdx + dir + 4) % 4;
            _gpMenuIndex = baseRowIdx + newSubIdx;
            soundManager?.playSound('click');
        } else if (state === 'VIEWING_NEWS' && uiManager.stationMenus && !uiManager.stationMenus.selectedNewsItem) {
            const categories = ['ALL', 'The Core Echo', 'Freedom', 'The Freight Log'];
            let currentIdx = categories.indexOf(uiManager.stationMenus.newsSourceFilter || 'ALL');
            if (currentIdx === -1) currentIdx = 0;
            const newIdx = (currentIdx + dir + categories.length) % categories.length;
            uiManager.stationMenus.newsSourceFilter = categories[newIdx];
            uiManager.stationMenus.newsScrollOffset = 0; // Reset scroll
            soundManager?.playSound('click');
        } else {
            _handleGamepadListScroll(state, dir, true);
        }
    }

    // Clamp index to valid range
    if (buttons && buttons.length > 0) {
        if (state === 'VIEWING_NEWS' && uiManager.stationMenus && !uiManager.stationMenus.selectedNewsItem && buttons.length >= 5) {
            _gpMenuIndex = constrain(_gpMenuIndex, 4, buttons.length - 1);
        } else {
            _gpMenuIndex = constrain(_gpMenuIndex, 0, buttons.length - 1);
        }
    }

    // ── A button = click the selected button ──
    if (gp.pressed('a') && buttons && buttons.length > 0 && _gpMenuIndex < buttons.length) {
        const selectedBtn = buttons[_gpMenuIndex];
        if (selectedBtn && selectedBtn.w > 0 && selectedBtn.h > 0) {
            // Simulate a click at the center of the selected button
            const cx = selectedBtn.x + selectedBtn.w / 2;
            const cy = selectedBtn.y + selectedBtn.h / 2;

            if (uiManager) {
                uiManager.handleMouseClicks(
                    cx, cy, state, player,
                    player.currentSystem?.station?.getMarket?.() || galaxy?.getCurrentSystem()?.station?.getMarket?.(),
                    galaxy
                );
            }
        }
    }

    // ── A button released = trigger mouse release for held button handling ──
    if (gp.released('a')) {
        if (state === 'VIEWING_MARKET' || state === 'VIEWING_SPACE_OBJECT_MARKET') {
            if (uiManager) {
                uiManager.handleMarketMouseRelease();
            }
        }
    }
}

/**
 * Two-panel gamepad navigation for the mission board.
 * Left panel  (list)   – D-pad up/down selects a mission.
 * Right panel (detail) – D-pad left/right navigates Accept/Back/Abandon/Complete.
 * D-pad right from list → detail.  D-pad left from first detail button → list.
 */
function _handleGamepadMissions(gp) {
    const listButtons   = uiManager?.missionListButtonAreas || [];
    // Order detail buttons: action buttons (accept/complete/abandon) before back
    const detailButtonsObj = uiManager?.missionDetailButtonAreas || {};
    const detailButtons = Object.entries(detailButtonsObj)
        .sort(([key]) => key === 'back' ? 1 : -1) // action buttons first, back last
        .map(([, btn]) => btn)
        .filter(b => b && b.w > 0);

    // B = go back to station
    if (gp.pressed('b')) {
        _gpMenuIndex = 0;
        _gpMissionPanel = 'list';
        gameStateManager.setState('DOCKED');
        soundManager?.playSound('click_off');
        return;
    }

    const pressedUp    = gp.pressed('dpad.up')    || (gp.state?.ls?.y < -0.7 && gp.prevState?.ls?.y >= -0.7);
    const pressedDown  = gp.pressed('dpad.down')  || (gp.state?.ls?.y > 0.7  && gp.prevState?.ls?.y <= 0.7);
    const pressedLeft  = gp.pressed('dpad.left');
    const pressedRight = gp.pressed('dpad.right');

    if (_gpMissionPanel === 'list') {
        // ── Navigate the mission list ──
        if ((pressedUp || pressedDown) && listButtons.length > 0) {
            _gpMenuIndex = (_gpMenuIndex + (pressedDown ? 1 : -1) + listButtons.length) % listButtons.length;
            soundManager?.playSound('click');
        }

        // Clamp and sync selected mission index
        if (listButtons.length > 0) {
            _gpMenuIndex = constrain(_gpMenuIndex, 0, listButtons.length - 1);
            const sel = listButtons[_gpMenuIndex];
            if (Number.isInteger(sel?.index)) {
                gameStateManager.selectedMissionIndex = sel.index;
            }
        }

        // D-pad right → move to detail panel
        if (pressedRight && detailButtons.length > 0) {
            _gpMissionPanel = 'detail';
            _gpMissionDetailIndex = 0;
            soundManager?.playSound('click');
        }

        // A = confirm mission selection (click the list button)
        if (gp.pressed('a') && listButtons.length > 0 && _gpMenuIndex < listButtons.length) {
            const btn = listButtons[_gpMenuIndex];
            if (btn) {
                uiManager?.handleMouseClicks(
                    btn.x + btn.w / 2, btn.y + btn.h / 2, 'VIEWING_MISSIONS', player,
                    player.currentSystem?.station?.getMarket?.() || galaxy?.getCurrentSystem()?.station?.getMarket?.(),
                    galaxy
                );
            }
        }
    } else {
        // ── Navigate the detail panel (Accept / Back / etc.) ──
        if (pressedLeft) {
            if (_gpMissionDetailIndex === 0) {
                // Return to mission list
                _gpMissionPanel = 'list';
            } else {
                _gpMissionDetailIndex = (_gpMissionDetailIndex - 1 + detailButtons.length) % detailButtons.length;
            }
            soundManager?.playSound('click');
        } else if (pressedRight && detailButtons.length > 0) {
            _gpMissionDetailIndex = (_gpMissionDetailIndex + 1) % detailButtons.length;
            soundManager?.playSound('click');
        }

        // Clamp
        if (detailButtons.length > 0) {
            _gpMissionDetailIndex = constrain(_gpMissionDetailIndex, 0, detailButtons.length - 1);
        }

        // A = click the highlighted detail button
        if (gp.pressed('a') && detailButtons.length > 0 && _gpMissionDetailIndex < detailButtons.length) {
            const btn = detailButtons[_gpMissionDetailIndex];
            if (btn) {
                uiManager?.handleMouseClicks(
                    btn.x + btn.w / 2, btn.y + btn.h / 2, 'VIEWING_MISSIONS', player,
                    player.currentSystem?.station?.getMarket?.() || galaxy?.getCurrentSystem()?.station?.getMarket?.(),
                    galaxy
                );
                // After accepting/completing, return focus to the list
                _gpMissionPanel = 'list';
                _gpMissionDetailIndex = 0;
            }
        }
    }
}

/**
 * Get the relevant button area array for the current game state.
 * Each station screen stores its clickable areas in uiManager/stationMenus.
 */
function _getButtonAreasForState(state) {
    if (!uiManager) return [];

    switch (state) {
        case 'DOCKED':
            return uiManager.stationMenuButtonAreas || [];
        case 'DOCKED_SPACE_OBJECT':
            return uiManager.spaceObjectMenuButtonAreas || [];
        case 'VIEWING_MARKET':
            return uiManager.marketButtonAreas || [];
        case 'VIEWING_SPACE_OBJECT_MARKET':
            return uiManager.spaceObjectMarketButtonAreas || [];
        case 'VIEWING_MISSIONS':
            return []; // Handled separately by _handleGamepadMissions
        case 'VIEWING_SHIPYARD':
            return (uiManager.stationMenus?.shipyardListAreas || []).concat(
                _objectToButtons(uiManager.stationMenus?.shipyardDetailButtons)
            );
        case 'VIEWING_SHIP_DETAIL':
            return _objectToButtons(uiManager.stationMenus?.shipDetailButtons);
        case 'VIEWING_UPGRADES':
            return (uiManager.stationMenus?.upgradeListAreas || []).concat(
                _objectToButtons(uiManager.stationMenus?.upgradeDetailButtons)
            );
        case 'VIEWING_WEAPON_DETAIL':
            if (uiManager.stationMenus?.showingSlotPicker && Array.isArray(uiManager.stationMenus?.slotPickerButtons)) {
                return uiManager.stationMenus.slotPickerButtons;
            }
            return _objectToButtons(uiManager.stationMenus?.weaponDetailButtons);
        case 'VIEWING_REPAIRS':
            return [
                uiManager.repairsFullButtonArea,
                uiManager.repairsHalfButtonArea,
                uiManager.repairsBodyguardsButtonArea,
                uiManager.repairsBackButtonArea
            ].filter(b => b && b.w > 0);
        case 'VIEWING_SPACE_OBJECT_REPAIRS':
            return [
                uiManager.spaceObjectRepairsFullButtonArea,
                uiManager.spaceObjectRepairsHalfButtonArea,
                uiManager.spaceObjectRepairsBodyguardsButtonArea,
                uiManager.spaceObjectRepairsBackButtonArea
            ].filter(b => b && b.w > 0);
        case 'VIEWING_PROTECTION':
            return uiManager.stationMenus?.protectionServicesButtons || [];
        case 'VIEWING_POLICE':
        case 'VIEWING_IMPERIAL_RECRUITMENT':
        case 'VIEWING_SEPARATIST_RECRUITMENT':
        case 'VIEWING_MILITARY_RECRUITMENT':
            return uiManager.factionRecruitmentButtonAreas || [];
        case 'VIEWING_STORAGE':
            return uiManager.stationMenus?.storageButtonAreas || uiManager.storageButtonAreas || [];
        case 'VIEWING_RECORD':
            return uiManager.stationMenus?.recordButtonAreas || uiManager.recordButtonAreas || [];
        case 'VIEWING_NEWS':
            return uiManager.stationMenus?.newsButtonAreas || uiManager.newsButtonAreas || [];
        case 'VIEWING_SERVICES':
            return [];
        case 'VIEWING_BASE':
            return [
                uiManager.baseRepairButtonArea,
                uiManager.stationMenus?.baseMiningStorageButtonArea,
                uiManager.baseBackButtonArea
            ].filter(b => b && b.w > 0);
        default:
            return [];
    }
}

/**
 * Convert a button-area object (keyed by action name) to an array
 */
function _objectToButtons(obj) {
    if (!obj || typeof obj !== 'object') return [];
    return Object.values(obj).filter(b => b && typeof b === 'object' && b.w > 0);
}

/**
 * Handle D-pad left/right for scrollable lists (market, shipyard, upgrades, news, record)
 */
function _handleGamepadListScroll(state, direction, isPageScroll = false) {
    if (!uiManager) return;
    const sm = uiManager.stationMenus;

    switch (state) {
        case 'VIEWING_MARKET':
        case 'VIEWING_SPACE_OBJECT_MARKET':
            // Market scrolling handled by existing keyboard bridge
            break;
        case 'VIEWING_SHIPYARD':
            if (sm) {
                const step = isPageScroll ? (sm.shipyardVisibleRows || 5) : 1;
                sm.shipyardScrollOffset = constrain(
                    (sm.shipyardScrollOffset || 0) + direction * step,
                    0, sm.shipyardScrollMax || 0
                );
            }
            break;
        case 'VIEWING_UPGRADES':
            if (sm) {
                const step = isPageScroll ? (sm.upgradeVisibleRows || 5) : 1;
                sm.upgradeScrollOffset = constrain(
                    (sm.upgradeScrollOffset || 0) + direction * step,
                    0, sm.upgradeScrollMax || 0
                );
            }
            break;
        case 'VIEWING_NEWS':
            if (sm) {
                const step = isPageScroll ? 5 : 1;
                sm.newsScrollOffset = constrain(
                    (sm.newsScrollOffset || 0) + direction * step,
                    0, sm.newsScrollMax || 0
                );
            }
            break;
        case 'VIEWING_RECORD':
            if (sm) {
                const step = isPageScroll ? (sm.recordVisibleRows || 10) : 1;
                sm.recordScrollOffset = constrain(
                    (sm.recordScrollOffset || 0) + direction * step,
                    0, sm.recordScrollMax || 0
                );
            }
            break;
        case 'VIEWING_SHIP_DETAIL':
            // Prev/next ship
            if (sm && sm.availableShipsList && sm.availableShipsList.length > 1) {
                const idx = sm.currentShipIndex + direction;
                if (idx >= 0 && idx < sm.availableShipsList.length) {
                    sm.currentShipIndex = idx;
                    sm.selectedShipForDetail = sm.availableShipsList[idx];
                    soundManager?.playSound('click');
                }
            }
            break;
        case 'VIEWING_WEAPON_DETAIL':
            // Prev/next weapon
            if (sm && sm.availableWeaponsList && sm.availableWeaponsList.length > 1) {
                const idx = sm.currentWeaponIndex + direction;
                if (idx >= 0 && idx < sm.availableWeaponsList.length) {
                    sm.currentWeaponIndex = idx;
                    sm.selectedWeaponForDetail = sm.availableWeaponsList[idx];
                    // Also reset the slot picker state so we don't carry it over
                    sm.showingSlotPicker = false;
                    sm.selectedSlotForUpgrade = -1;
                    soundManager?.playSound('click');
                }
            }
            break;
    }
}

/**
 * Handle gamepad navigation in the inventory screen.
 * Allows selecting cargo items and jettisoning them.
 */
function _handleGamepadInventory(gp, player, inventoryScreen) {
    const cargoCount = player?.cargo?.length || 0;
    
    // Initialize selection
    if (_gpCargoSelectedIndex === -1 && cargoCount > 0) {
        _gpCargoSelectedIndex = 0;
    }
    
    // Update inventory screen with selected index for highlighting
    if (inventoryScreen) {
        inventoryScreen.gamepadSelectedCargoIndex = _gpCargoSelectedIndex;
    }

    // B = close inventory
    if (gp.pressed('b')) {
        if (typeof gameStateManager !== 'undefined' && gameStateManager) {
            gameStateManager.showingInventory = false;
            if (typeof soundManager !== 'undefined' && soundManager) {
                soundManager.playSound('mapClose');
            }
        }
        return;
    }

    const pressedUp = gp.pressed('dpad.up') || (gp.state?.ls?.y < -0.7 && gp.prevState?.ls?.y >= -0.7);
    const pressedDown = gp.pressed('dpad.down') || (gp.state?.ls?.y > 0.7 && gp.prevState?.ls?.y <= 0.7);

    // D-pad up/down = navigate cargo list
    if (cargoCount > 0) {
        if (pressedDown) {
            _gpCargoSelectedIndex = (_gpCargoSelectedIndex + 1) % cargoCount;
            if (typeof soundManager !== 'undefined' && soundManager) {
                soundManager.playSound('click');
            }
        } else if (pressedUp) {
            _gpCargoSelectedIndex = (_gpCargoSelectedIndex - 1 + cargoCount) % cargoCount;
            if (typeof soundManager !== 'undefined' && soundManager) {
                soundManager.playSound('click');
            }
        }
        // Update inventory screen after navigation
        if (inventoryScreen) {
            inventoryScreen.gamepadSelectedCargoIndex = _gpCargoSelectedIndex;
        }
    }

    // A = jettison selected cargo
    if (gp.pressed('a') && cargoCount > 0 && _gpCargoSelectedIndex >= 0 && _gpCargoSelectedIndex < cargoCount) {
        if (typeof soundManager !== 'undefined' && soundManager) {
            soundManager.playSound('click');
        }
        if (typeof handleJettisonFromInventory !== 'undefined') {
            handleJettisonFromInventory(_gpCargoSelectedIndex);
        }
        // Reset selection if cargo was jettisoned
        if (player.cargo.length === 0) {
            _gpCargoSelectedIndex = -1;
        } else {
            _gpCargoSelectedIndex = Math.min(_gpCargoSelectedIndex, player.cargo.length - 1);
        }
        // Update inventory screen after jettison
        if (inventoryScreen) {
            inventoryScreen.gamepadSelectedCargoIndex = _gpCargoSelectedIndex;
        }
    }
}

/**
 * Draw a highlight rectangle around the gamepad-selected button.
 * Called at the end of each frame during station states.
 */
function _drawGamepadMenuHighlight(btn) {
    if (!btn || !btn.w || !btn.h) return;

    push();
    noFill();

    // Animated pulse for visibility
    const pulse = (Math.sin((typeof millis === 'function' ? millis() : 0) * 0.006) + 1) / 2;
    const alpha = 180 + pulse * 75;

    // Outer glow
    stroke(100, 200, 255, alpha * 0.4);
    strokeWeight(4);
    rect(btn.x - 3, btn.y - 3, btn.w + 6, btn.h + 6, 6);

    // Inner border
    stroke(100, 200, 255, alpha);
    strokeWeight(2);
    rect(btn.x - 1, btn.y - 1, btn.w + 2, btn.h + 2, 4);

    pop();
}
