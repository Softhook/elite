# Dynamic Living Galaxy – Design and Implementation Plan

This document outlines how to evolve the current Elite (p5.js) project into a living, dynamic simulation with named NPC pilots who travel between systems, trade goods, complete missions, and influence a real supply-and-demand economy across stations.

It’s grounded in the repo’s current architecture and constraints:
- No build/bundler, no modules; global scripts loaded via `index.htm` in a specific order.
- Core globals in `sketch.js`: `player`, `galaxy`, `uiManager`, `gameStateManager`, `soundManager`, `eventManager`, `titleScreen`, `saveSelectionScreen`.
- Ownership rules: `StarSystem` manages arrays like `enemies`, `projectiles`, `cargo` internally. Use methods on `StarSystem` to spawn/despawn; projectiles are pooled via `ObjectPool` and `WeaponSystem`.
- Save/load flows via `saveSelectionScreen.js`, `galaxy.js`, `player.js`, and `eventManager.initializeReferences()`.

The plan focuses on incremental, testable slices with performance and determinism in mind.

## Goals (what “living” means)

- Named NPC pilots with identity, roles, and persistence across sessions.
- Pilots move along the galaxy graph, dock at stations, trade based on prices, and accept missions.
- Stations have evolving stock levels and prices derived from supply/consumption and elastic demand.
- Events (shortages, surpluses, piracy, wars, storms) perturb the economy and AI behavior.
- Player actions (trading, piracy, combat) feed back into the world (prices, missions, law response, reputation).
- The simulation runs both when the player is present (active system) and when absent (background systems), using LOD and time-slicing.

## Guardrails from the existing codebase

- Keep script tag order in `index.htm` intact; add new files in safe positions (e.g., after managers, before composites, or within the “generators/managers” band if introducing new managers).
- Respect `StarSystem` ownership: never mutate its internal arrays directly from outside; expose methods when needed.
- Use `WeaponSystem.fire(...)` for all weapon effects and keep projectile pooling intact.
- Avoid updating player input/state while DOCKED; leverage `gameStateManager` transitions and `eventManager` for cross-system signaling.

## Pillars of the simulation

1) NPC Pilots (identity, roles, pathing, cargo, credits, behavior trees/state machines)
2) Economy (station production/consumption, stock, prices via supply/demand, events)
3) Missions (generated from world needs, accepted by NPCs and posted to the player)
4) Law, Factions, and Crime (police response, reputation, smuggling, piracy)
5) Time & Level of Detail (active vs background systems, time slicing, determinism)
6) Persistence & Save/Load (compact serialization, migration safety)
7) Observability & Debugging (HUD overlays, logs, inspectors, fast-forwards)

---

## World Graph, Time, and Determinism

- Galaxy graph: already defined via `Galaxy` with `connectedSystemIndices`. Use this as the routing graph; only allow jumps along these links.
- Time model:
  - Active system uses per-frame updates with p5 `deltaTime` (ms). Prefer seconds where relevant.
  - Background systems update on coarse ticks (e.g., every 2–10 seconds of real time) to summarize activity.
- Determinism:
  - Use seeded RNGs derived from session seed + IDs for reproducibility.
  - Deterministic updates simplify testing and save/load consistency.

### Background update cadence

- Use a global simulation stepper that executes a limited quota of background updates each frame (e.g., update N pilots and M stations from a round-robin queue).
- Systems not actively simulated accumulate “debt” time and are resolved in chunks when budget allows.

---

## NPC Pilots

### Identity and schema

Shape (JS object):

```js
{
  id: number,                // stable unique
  name: string,              // generated from seed
  factionId: string | null,  // optional factions
  role: 'trader' | 'smuggler' | 'miner' | 'courier' | 'bounty' | 'pirate' | 'police',
  shipTypeId: string,        // from ships.js
  hull: number, shields: number,  // simplified when offscreen
  currentSystemIndex: number,
  dockedStationId: string | null,
  pos?: {x:number,y:number}, // only populated in active system
  itinerary: number[],       // upcoming system indices (path)
  cargo: {[commodityId: string]: number},
  cargoCap: number,
  credits: number,
  legalStatus: 'clean' | 'wanted',
  riskTolerance: number,     // 0..1
  tradeFocus: string[] | null, // preferred commodities
  missionIds: number[],
  lastUpdateMs: number,
  alive: boolean
}
```

### Roles and behaviors

- Trader: buys low/sells high, plans multi-hop routes toward profitable markets.
- Smuggler: similar to trader but targets illegal goods and avoids police-heavy systems.
- Miner: collects ore/ice from asteroids; sells at refineries/stations with demand.
- Courier: transports small, time-sensitive packages; accepts delivery missions.
- Bounty: hunts wanted targets in connected systems.
- Pirate: targets vulnerable cargo ships near profitable trade lanes.
- Police: patrols and responds to crimes, escalates presence based on security level.

### Behavior model

- High-level: finite state machine (FSM) with states like IDLE, PLANNING, TRAVELING, DOCKED, TRADING, ACCEPTING_MISSIONS, FIGHTING, FLEEING, DEAD.
- Low-level: utility scoring per tick to choose next action (e.g., profit potential, danger, deadlines).

### Routing

- Use Dijkstra (or A* with admissible heuristic like Euclidean distance in star map) on `Galaxy.connectedSystemIndices`.
- Route selection can be profit-informed: weight edges by expected profit or risk-adjusted travel time.

### Docking, jump, and presence

- Active system: spawn an `Enemy` or a lightweight `NPCShip` that uses `StarSystem` APIs to actually fly, dock, and fire.
- Background system: update position abstractly (arrival times on edges) without per-frame physics.

### Combat and risk

- Pirates choose targets based on cargo value and escort presence.
- Police spawn/warp-in near incidents depending on security level.
- Offscreen engagements are resolved probabilistically using ship stats, numbers, and environment modifiers; on-screen uses full combat.

### Persistence and lifecycle

- Pilots can die and be replaced by new entrants to maintain population. Death drops can generate cargo events.
- Keep population bounded (e.g., 200–1000 pilots) with LOD groups.

---

## Dynamic Economy

### Station economy model

Each station tracks per-commodity:

```js
{
  stationId: string,
  systemIndex: number,
  stock: {[commodityId: string]: number},
  basePrice: {[commodityId: string]: number}, // canonical price
  baseDemand: {[commodityId: string]: number}, // units per day desired
  productionRate: {[commodityId: string]: number},
  consumptionRate: {[commodityId: string]: number},
  elasticity: {[commodityId: string]: number}, // sensitivity exponent
  illegal: Set<string>, // commodities that are illegal here
  lastUpdateMs: number
}
```

Stocks evolve each tick:

- stock[c] += productionRate[c] * dt - consumptionRate[c] * dt
- Clamp to [0, capacity[c]]; include decay/rot for perishables.

### Price function (supply and demand)

Let p0 be base price, S stock on hand, D target stock (derived from demand and safety stock), and ε elasticity:

- Ratio: r = max(min(D / max(S, εs), rmax), rmin) where εs is a tiny floor to avoid division by zero.
- Price: p = p0 · r^ε
- Apply clamping and optional noise/jitter within a small band to avoid price staleness.

This produces high prices when stock is below desired level and low prices when overstocked. Different commodities can have different elasticities.

### Trade flows

- Traders compute expected profit for candidate routes: buy price at origin minus sell price at destination minus fuel/fees, constrained by cargo capacity and station legality.
- Emergent behavior: profitable imbalances attract traders; their deliveries reduce imbalance and normalize prices.

### Events and shocks

- Shortage/surplus events temporarily modify production/consumption.
- Conflict or piracy increases risk and insurance/fees.
- Cosmic storms/nebulae can slow travel or close lanes.

---

## Missions integrated with the world

- Stations post missions derived from their needs (e.g., “deliver 50 food within 8 minutes”) or security situation (“escort convoy”, “bounty on pirate X”, “scan anomalies”).
- NPCs can accept missions; unclaimed missions are visible to the player via `uiManager` while DOCKED.
- Mission generator uses current station deficits/excess as inputs (see `missionGenerator.js`).
- Completion and failures feed back: successful deliveries reduce deficits; failed escorts increase piracy.

Mission shape additions:

```js
{
  id: number,
  type: 'delivery' | 'courier' | 'escort' | 'bounty' | 'scan',
  originStationId: string,
  destStationId?: string,
  commodityId?: string,
  quantity?: number,
  deadlineMs?: number,
  rewardCredits: number,
  riskLevel: number,
  postedAtMs: number,
  acceptedByPilotId?: number,
  status: 'posted' | 'accepted' | 'completed' | 'failed'
}
```

---

## Factions, Law, and Crime

- Stations and systems belong to factions with security ratings.
- Illegal goods vary per faction; smuggling is profitable but risky.
- Crimes raise local wanted level; police spawn probability and strength scale with crime heat.
- Reputation affects prices, mission availability, and police leniency.

---

## Level of Detail (LOD) and Performance

- Active system (player present): full simulation for entities visible to the player; rely on existing `StarSystem` classes and pools.
- Nearby/connected systems: light simulation at coarse ticks (aggregate flows; no per-bullet physics).
- Distant systems: statistical resolution only (e.g., decay stocks, resolve queued arrivals/departures, roll probabilistic events).

### Time slicing and quotas

- Budget per frame (e.g., 1–2 ms) for background updates.
- Round-robin through:
  - K pilots
  - L stations
  - M missions events
- Spillover is handled next frame.

### Data structures

- Maintain global registries: `PilotRegistry`, `StationEconomyRegistry`, `MissionRegistry`.
- Keep indexes by system for quick active-system activation/deactivation.

---

## Integration points in the current codebase

- `galaxy.js`:
  - Ensure systems have unique IDs and station lists with economy attachments.
  - Provide adjacency for routing via `connectedSystemIndices`.
- `starSystem.js`:
  - Add methods to spawn/despawn lightweight `NPCShip` instances when the player enters/leaves a system.
  - Provide a gateway that converts background pilot state into active entities and back on exit.
- `missionGenerator.js`:
  - Extend to read station deficits/excess to seed delivery/courier missions.
- `gameStateManager.js`:
  - Hook into FADE_OUT/FADE_IN jumps to snapshot and restore active entities.
- `eventManager.js`:
  - Publish world events (shortages, pirate raids, police alerts) for both UI and AI.
- `saveSelectionScreen.js` / `player.js` / `galaxy.js`:
  - Extend save payload to include pilot registry and station economy deltas.
- `uiManager.js`:
  - Add panels for dynamic market trends, mission board with world-driven posts, and traffic activity.

---

## Data and API “contracts” (proposed)

- PilotRegistry
  - Inputs: dt, system activity, price snapshots
  - Outputs: departures/arrivals, trades, incidents, mission updates
  - Error modes: path not found, insufficient credits/cargo, death

- StationEconomy
  - Inputs: dt, production/consumption modifiers, deliveries/removals
  - Outputs: prices, shortages/surpluses, mission needs
  - Error modes: negative stock clamped, illegal trade attempts rejected

- MissionRegistry
  - Inputs: economy needs, faction events
  - Outputs: posted missions, assignments, completions
  - Error modes: expired deadlines, abandoned missions re-posted

---

## Algorithms and formulas

### Pricing (elastic demand)

- p = p0 * (D / max(S, εs))^ε with clamps.
- Optionally blend with moving average to avoid whiplash: pt = (1-α) * pt-1 + α * p.

### Route planning

- Dijkstra/A* over system graph. Edge weight = travel time + risk penalty; optionally subtract expected profit to bias toward lucrative paths.

### Mission generation

- For each station and commodity c: if Sc << Dc, create delivery missions proportional to deficit.
- Bounty/escort: spawn when piracy/crime exceeds thresholds in region.

### Offscreen combat resolution

- Simplified combat round: compute effective DPS and EHP for groups; roll outcome with variance. Record casualties and drops as events (affecting economy via lost cargo).

---

## Edge cases and pitfalls

- Save/load consistency: ensure background timers and itineraries survive reloads; reconstruct RNG streams from seeds.
- Player transitions: don’t double-spawn pilots when entering a system; handover must be atomic during FADE.
- Arrays ownership: never push/pop on `StarSystem` arrays directly from outside; use methods.
- Price exploits: cap price swings and add cooldowns on repeated trades.
- Deadlocks: avoid all traders pursuing the exact same route by adding noise and role diversity.

---

## Observability & Tools

- Debug overlays: system traffic counts, price heat maps, pilot paths.
- Console inspectors: query pilot by id, print itinerary and cargo.
- Time controls: toggle fast-forward (increase background tick rate while DOCKED), pause.
- Logging: circular buffers per system for arrivals/departures and price changes.

---

## Persistence

- Save schema additions (stored in localStorage with existing keys):
  - `pilotRegistry`: compact array of pilots (omit transient on-screen fields)
  - `stationEconomyDeltas`: only deltas from seed-derived defaults to minimize size
  - `missionRegistry`: posted/active missions
- Migration: include `saveVersion` and up-migrate if fields change.

---

## Minimal incremental roadmap

1) Phase 0 – Scaffolding
   - Add registries and background tick manager (no UI exposure yet).
   - Seed N traders at major hubs; no on-screen spawning.

2) Phase 1 – Station economy
   - Implement per-commodity stock and price function; surface in market UI while DOCKED.
   - Add small random events to validate dynamics.

3) Phase 2 – Traders in background
   - Route computation and periodic trading cycles; see prices normalize between two stations.
   - Save/load for pilot/economy state.

4) Phase 3 – On-screen presence
   - When entering a system, instantiate a subset of nearby pilots as lightweight ships; on exit, serialize back.
   - Basic avoidance of the player; minimal combat.

5) Phase 4 – Missions integration
   - Generate delivery/courier missions from deficits; NPCs can accept; player sees shared board.

6) Phase 5 – Law and piracy
   - Crime heat map, pirate targeting, police response; smuggling with illegal goods.

7) Phase 6 – Balancing and UX
   - Trend charts, price tooltips, traffic indicators; tune elasticity, production/consumption.

---

## Sketches and pseudocode

### Background tick manager

```js
function updateWorld(dtMs) {
  // Budgeted updates per frame
  const budgetPilots = 25;
  const budgetStations = 10;
  PilotRegistry.updateSome(budgetPilots, dtMs);
  StationEconomyRegistry.updateSome(budgetStations, dtMs);
  MissionRegistry.update(dtMs);
}
```

### Price update

```js
function computePrice(base, desired, stock, elasticity, alpha=0.3) {
  const eps = 0.01;
  const r = Math.max(0.25, Math.min(4.0, desired / Math.max(stock, eps)));
  const target = base * Math.pow(r, elasticity);
  // EMA smoothing
  return (1 - alpha) * this.lastPrice + alpha * target;
}
```

### Pilot trade decision (simplified)

```js
function chooseTrade(pilot, origin, candidates) {
  let best = null, bestProfit = 0;
  for (const dest of candidates) {
    for (const c of tradableCommodities) {
      const buy = origin.price[c], sell = dest.price[c];
      const qty = Math.min(pilot.cargoCap, dest.demandGap(c));
      const profit = (sell - buy) * qty - travelCost(origin, dest);
      if (profit > bestProfit) { bestProfit = profit; best = {dest, c, qty}; }
    }
  }
  return best; // may be null
}
```

---

## Testing strategy

- Unit tests (where feasible in this codebase): pricing function, route planner, offscreen combat resolver.
- Simulation soak: run background-only for 10 minutes and assert invariants (no NaNs, bounded prices/stocks, population stable).
- Determinism: same seed -> same aggregate results over a fixed horizon.
- Gameplay: manual checks for dock/undock, jump, save/load with active background simulation.

---

## Risks and mitigations

- Performance: too many NPCs – use LOD, quotas, and aggregate flows; limit on-screen spawns.
- Complexity creep: keep phases small; ship minimal loops before adding features.
- Save bloat: store deltas and compress arrays; prune history.
- Player overshadowed by NPCs: constrain NPC throughput and prioritize posting missions for the player.

---

## Immediate next steps in this repo

- Add new registries as standalone files under the “generators/managers” band in `index.htm` load order:
  - `pilotRegistry.js`, `stationEconomyRegistry.js`, `missionRegistry.js`, `worldSimulation.js`.
- Wire a background tick from `draw()` in `sketch.js` guarded by game states (don’t tick during TITLE/LOAD FADE sequences).
- Extend `market.js` to read dynamic prices/stocks when DOCKED.
- Add a simple debug overlay in `uiManager.js` for prices and system traffic.

This document should be treated as a living spec; update it as implementation details evolve.
