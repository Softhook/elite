# Refactor Priorities (Stability + Expandability)

Ordered by **importance first**, then **ease of fixing**.

1. **Fix broken default test command path resolution** *(High importance, Easy)* ✅  
   `npm test` failed because Jest could not resolve `setupFilesAfterEnv` from `package.json`.
2. **Reduce global-state coupling in runtime singletons** *(High, Hard)*  
   Core objects (`player`, `galaxy`, `uiManager`, `gameStateManager`, etc.) are shared globals, increasing hidden dependencies.
3. **Add guardrails for script-load-order dependencies** *(High, Medium)*  
   Runtime depends on strict `index.htm` script ordering; missing/late globals can fail silently.
4. **Split oversized managers into feature-focused modules** *(High, Hard)*  
   Large files (especially state/UI managers) make changes risky and hard to reason about.
5. **Centralize duplicated constants/config literals** *(Medium-High, Medium)*  
   Combat/event/spawn tuning values are spread across files, making balancing and refactors error-prone.
6. **Introduce explicit ownership APIs for StarSystem collections everywhere** *(Medium-High, Medium)*  
   Continue tightening array mutation boundaries to avoid external push/pop drift.
7. **Normalize time-step handling across gameplay systems** *(Medium, Medium)*  
   Ensure every delta-time path is consistently second-based where appropriate.
8. **Strengthen save/load schema validation and migration checks** *(Medium, Medium)*  
   Add stricter validation around persisted slot data and version tolerance.
9. **Consolidate repetitive UI state transition checks** *(Medium, Easy-Medium)*  
   Repeated state gating logic can be centralized for cleaner transitions and fewer edge-case bugs.
10. **Expand targeted regression coverage for fragile integration paths** *(Medium, Easy)*  
    Prioritize dock/undock, jump transitions, and save/load + mission continuity paths.

## Refactor Started

- Completed item **#1** by updating Jest setup path resolution in `package.json`.
