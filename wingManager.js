// ****** wingManager.js ******
// Singleton registry for formation groups (wings and guard formations).
//
// Two wing types:
//   WING  — autonomous peer formation of same-faction COMBAT ships (WING_FLYING state).
//           leader is a peer Enemy ship.
//   GUARD — formation of GUARD ships around a protected principal (GUARDING state).
//           principalRef is the protected entity (player, station, Enemy VIP).
//           The principal is NOT a wing member; it is only referenced for position/heading.
//
// Wing data structure:
// {
//   id:             string,        // unique id e.g. "wing_3"
//   type:           'WING'|'GUARD',
//   leader:         Enemy|null,    // peer leader for WING; null for GUARD
//   principalRef:   object|null,   // protected entity for GUARD; null for WING
//   members:        Enemy[],       // followers (WING) or all guards (GUARD)
//   faction:        string,        // faction string for shape selection
//   formationShape: string,        // 'V' | 'ECHELON_RIGHT' | 'LINE_ABREAST'
// }

const wingManager = (() => {
    const _wings = new Map(); // Map<wingId: string, WingData>
    let _nextId = 1;

    // ── Private helpers ───────────────────────────────────────────────────────

    function _makeId() { return `wing_${_nextId++}`; }

    function _resolveShape(faction) {
        return (FACTION_FORMATION_SHAPE && FACTION_FORMATION_SHAPE[faction])
            || (FACTION_FORMATION_SHAPE && FACTION_FORMATION_SHAPE.default)
            || 'V';
    }

    function _maxFollowers(shape) {
        return (WING_FORMATION_SLOTS && WING_FORMATION_SLOTS[shape])
            ? WING_FORMATION_SLOTS[shape].length
            : 0;
    }

    function _clearShipWing(ship) {
        if (!ship) return;
        ship.wingId        = null;
        ship.wingRole      = null;
        ship.wingSlotIndex = -1;
    }

    function _reindexMembers(wing) {
        wing.members.forEach((m, i) => { m.wingSlotIndex = i; });
    }

    function _isPrincipalValid(p) {
        return p && !p.isDestroyed && !p.markedForRemoval;
    }

    // ── WING API (autonomous peer formation) ──────────────────────────────────

    /**
     * Create an autonomous peer wing. `leader` becomes the founding leader.
     * The leader is in the wing but NOT in the members array (slot index -1).
     * @param {Enemy} leader
     * @returns {string} wingId
     */
    function createWing(leader) {
        const shape = _resolveShape(leader.faction);
        const id    = _makeId();
        _wings.set(id, {
            id,
            type:           'WING',
            leader,
            principalRef:   null,
            members:        [],
            faction:        leader.faction,
            formationShape: shape,
        });
        leader.wingId        = id;
        leader.wingRole      = 'LEADER';
        leader.wingSlotIndex = -1;
        return id;
    }

    // ── GUARD API (guarded principal formation) ───────────────────────────────

    /**
     * Create a guard wing around `principal`. The principal is NOT an enemy member.
     * All spawned guards are added via addMember().
     * @param {object} principal — any entity with .pos, .angle, .vel (Player, station, Enemy VIP)
     * @param {string} faction   — faction of the guards (used to pick formation shape)
     * @returns {string} wingId
     */
    function createGuardWing(principal, faction) {
        const shape = _resolveShape(faction);
        const id    = _makeId();
        _wings.set(id, {
            id,
            type:           'GUARD',
            leader:         null,
            principalRef:   principal,
            members:        [],
            faction,
            formationShape: shape,
        });
        return id;
    }

    // ── Shared member management ──────────────────────────────────────────────

    /**
     * Add `ship` as a formation follower in an existing wing.
     * Assigns the lowest free slot index.
     * @param {string} wingId
     * @param {Enemy}  ship
     * @returns {boolean} true if successfully added
     */
    function addMember(wingId, ship) {
        const wing = _wings.get(wingId);
        if (!wing) return false;
        if (wing.members.length >= _maxFollowers(wing.formationShape)) return false;

        // Assign the lowest unoccupied slot index
        const usedSlots = new Set(wing.members.map(m => m.wingSlotIndex));
        let slot = 0;
        while (usedSlots.has(slot)) slot++;

        ship.wingId        = wingId;
        ship.wingRole      = 'FOLLOWER';
        ship.wingSlotIndex = slot;
        wing.members.push(ship);
        return true;
    }

    /**
     * Remove `ship` from its wing.
     * - WING leader removed → promote oldest follower, or dissolve if no followers remain.
     * - WING follower / GUARD member removed → remove from list; dissolve if empty.
     * @param {Enemy} ship
     */
    function removeMember(ship) {
        const wingId = ship.wingId;
        if (!wingId) return;

        const wing = _wings.get(wingId);
        if (!wing) { _clearShipWing(ship); return; }

        if (wing.type === 'WING' && ship.wingRole === 'LEADER') {
            // Promote oldest follower to leader
            if (wing.members.length > 0) {
                const newLeader = wing.members.shift();
                newLeader.wingRole      = 'LEADER';
                newLeader.wingSlotIndex = -1;
                wing.leader = newLeader;
                _reindexMembers(wing);
            } else {
                // No followers left — dissolve
                _wings.delete(wing.id);
            }
        } else {
            // Follower (WING) or guard (GUARD)
            wing.members = wing.members.filter(m => m !== ship);
            _reindexMembers(wing);

            if (wing.members.length === 0) {
                // Only solo leader remains (WING) or group empty (GUARD) — dissolve
                if (wing.leader) _clearShipWing(wing.leader);
                _wings.delete(wing.id);
            }
        }

        _clearShipWing(ship);
    }

    /**
     * Find the nearest WING (autonomous peer wing) of `faction` within `range`
     * that still has room for at least one more follower.
     * @param {string} faction
     * @param {number} x
     * @param {number} y
     * @param {number} range
     * @returns {WingData|null}
     */
    function findNearbyWing(faction, x, y, range) {
        let best = null, bestDist = Infinity;
        for (const wing of _wings.values()) {
            if (wing.type !== 'WING') continue;
            if (wing.faction !== faction) continue;
            if (wing.members.length >= _maxFollowers(wing.formationShape)) continue;
            const ldr = wing.leader;
            if (!ldr?.pos) continue;
            const d = dist(x, y, ldr.pos.x, ldr.pos.y);
            if (d < range && d < bestDist) { bestDist = d; best = wing; }
        }
        return best;
    }

    /**
     * Find the nearest GUARD-type player formation wing of matching faction within range.
     * Used by friendly COMBAT ships to form up with an allied player.
     * @param {string} faction
     * @param {number} x
     * @param {number} y
     * @param {number} range
     * @returns {WingData|null}
     */
    function findPlayerFormationWing(faction, x, y, range) {
        let best = null, bestDist = Infinity;
        for (const wing of _wings.values()) {
            if (wing.type !== 'GUARD') continue;
            if (!wing._isPlayerFormation) continue;  // only player formation wings
            if (wing.faction !== faction) continue;
            if (wing.members.length >= _maxFollowers(wing.formationShape)) continue;
            const pr = wing.principalRef;
            if (!pr?.pos) continue;
            const d = dist(x, y, pr.pos.x, pr.pos.y);
            if (d < range && d < bestDist) { bestDist = d; best = wing; }
        }
        return best;
    }

    /**
     * Create (or return existing) GUARD wing for the player's allied formation.
     * Tags the wing with _isPlayerFormation so findPlayerFormationWing can identify it.
     * @param {object} player — the player entity
     * @param {string} faction — player's faction
     * @returns {string} wingId
     */
    function getOrCreatePlayerWing(player, faction) {
        // Check if player already has an active formation wing
        for (const [id, wing] of _wings) {
            if (wing._isPlayerFormation && wing.principalRef === player) {
                return id;
            }
        }
        const shape = _resolveShape(faction);
        const id = _makeId();
        _wings.set(id, {
            id,
            type: 'GUARD',
            leader: null,
            principalRef: player,
            members: [],
            faction,
            formationShape: shape,
            _isPlayerFormation: true,  // marker for findPlayerFormationWing
        });
        return id;
    }

    /**
     * Find the player's allied formation wing ID (or null if none exists).
     * @param {object} player
     * @returns {string|null}
     */
    function findPlayerWing(player) {
        for (const [id, wing] of _wings) {
            if (wing._isPlayerFormation && wing.principalRef === player) {
                return id;
            }
        }
        return null;
    }

    /**
     * Dissolve the player's formation wing (called when player leaves system / loses faction).
     * @param {object} player
     */
    function dissolvePlayerWing(player) {
        for (const [id, wing] of _wings) {
            if (wing._isPlayerFormation && wing.principalRef === player) {
                for (const m of wing.members) _clearShipWing(m);
                _wings.delete(id);
                return;
            }
        }
    }

    /**
     * Alert all idle guards in a GUARD wing so they engage the same attacker.
     * Called when one guard breaks formation to APPROACHING.
     * Guards that already have a target, or are not in GUARDING state, are skipped.
     * @param {string} wingId
     * @param {object} attacker — the target to assign to alerted guards
     */
    function alertGuardSiblings(wingId, attacker) {
        const wing = _wings.get(wingId);
        if (!wing || wing.type !== 'GUARD') return;
        for (const member of wing.members) {
            if (member.currentState !== AI_STATE.GUARDING) continue;
            if (member.target) continue;
            if (typeof member.isTargetValid === 'function' && !member.isTargetValid(attacker)) continue;
            member.target = attacker;
            if (typeof GUARD_ENGAGEMENT_LOCK_DURATION !== 'undefined') {
                member.guardEngagementLock = GUARD_ENGAGEMENT_LOCK_DURATION;
            }
            if (typeof member.changeState === 'function') {
                member.changeState(AI_STATE.APPROACHING);
            }
        }
    }

    // ── Per-frame maintenance ─────────────────────────────────────────────────

    /**
     * Call once per frame from the main game loop (before enemy updates).
     * Cleans up wings whose leader/principal has been destroyed.
     */
    function update() {
        for (const [id, wing] of _wings) {
            if (wing.type === 'WING') {
                const leaderGone = !wing.leader ||
                    wing.leader.isDestroyed ||
                    wing.leader.markedForRemoval ||
                    !wing.leader.pos;

                if (leaderGone) {
                    if (wing.members.length > 0) {
                        const nl = wing.members.shift();
                        nl.wingRole      = 'LEADER';
                        nl.wingSlotIndex = -1;
                        wing.leader = nl;
                        _reindexMembers(wing);
                    } else {
                        // Solo leader died — clear its wingId before dissolving
                        _clearShipWing(wing.leader);
                        _wings.delete(id);
                    }
                }
            } else {
                // GUARD: dissolve if principal is gone
                if (!_isPrincipalValid(wing.principalRef)) {
                    for (const m of wing.members) _clearShipWing(m);
                    _wings.delete(id);
                }
            }
        }
    }

    // ── Accessors ─────────────────────────────────────────────────────────────

    /**
     * Retrieve a wing by ID.
     * @param {string} wingId
     * @returns {WingData|null}
     */
    function getWing(wingId) {
        return _wings.get(wingId) || null;
    }

    /** Returns the number of currently active wings (for debug/HUD). */
    function count() { return _wings.size; }

    // Public API
    return {
        createWing,
        createGuardWing,
        addMember,
        removeMember,
        findNearbyWing,
        findPlayerFormationWing,
        getOrCreatePlayerWing,
        findPlayerWing,
        dissolvePlayerWing,
        alertGuardSiblings,
        update,
        getWing,
        count,
    };
})();

// Expose for test environments (browser script tags already make this global)
if (typeof global !== 'undefined') global.wingManager = wingManager;
if (typeof module !== 'undefined' && module.exports) module.exports = wingManager;
