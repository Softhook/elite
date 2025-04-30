Enemy AI Refactoring Plan
Stage 1: Constants & Configuration Cleanup
Goal: Establish clear, globally accessible constants and configuration

Organize Constants

Define all role and state constants with clear prefixes
Normalize naming conventions
Add comments for each constant
Create Role-Specific Configs

Define separate configuration objects for each ship role
Include parameters like detection ranges, engagement distances, etc.
Document the purpose of each configuration value
Add Debug Flag Constants

Create flags to enable/disable different levels of debugging
Make these toggleable in-game for real-time testing
Deliverable: Well-defined global constants that prevent naming conflicts

Stage 2: Centralized State Management
Goal: Create a single source of truth for state transitions

Improve State Change Method

Enhance changeState() with validation and logging
Add state entry/exit hooks
Implement state data validation
Create State Validation Rules

Define which states are valid for each role
Add transition rules between states (what state can change to what)
Add meaningful error logging for invalid transitions
Clean Up State References

Ensure all state changes go through the central method
Remove redundant state manipulation
Deliverable: Predictable state transitions with clear logging

Stage 3: Role-Based Behavior Separation
Goal: Separate AI logic by ship role for easier maintenance

Split Update Method

Create separate update methods for each role (updatePirate, updateHauler, etc.)
Move role-specific code into appropriate methods
Add an updateCommon method for shared functionality
Implement Role Configuration

Add methods to get role-specific settings
Ensure behavior methods use role-specific config values
Add role validation
Clean Up Conditional Logic

Replace complex role/state condition nesting with cleaner dispatching
Remove redundant checks
Deliverable: Clearly separated role behaviors with minimal code duplication

Stage 4: Combat and Targeting Improvements
Goal: Make combat behavior more predictable and easier to debug

Refine Targeting Logic

Create a dedicated targeting method
Clearly document target scoring
Add specific targeting override for retaliation
Refactor Combat Decision Making

Separate movement from combat decisions
Create explicit combat phases (approach, attack, reposition)
Add better cooldown and timer management
Fix Priority Issues

Ensure combat priorities and preferences are clearly defined
Fix the "flip-flopping" between states
Add forced combat timer for retaliation
Deliverable: Predictable combat with clear targeting decisions

Stage 5: Enhanced Debugging
Goal: Make AI behavior visible and debuggable in real-time

Add Visual Debugging

Display state information above ships
Show target relationships with lines
Visualize detection ranges and engagement distances
Improve Console Logging

Add consistent formatting for logs
Include timestamps and ship IDs
Create severity levels (info, warning, error)
Add In-Game Controls

Add ability to pause specific ships
Add controls to inspect ship state
Add debug overlay toggle
Deliverable: Real-time visibility into AI decision making

Stage 6: Common Helper Methods
Goal: Reduce code duplication and improve consistency

Extract Movement Helpers

Create dedicated methods for common movement patterns
Standardize rotation and thrust behavior
Add path following helpers
Create Decision Helpers

Add methods for evaluating threats
Create consistent distance checking
Standardize validity checking
Add Physics Consistency

Ensure all ships use the same physics calculations
Fix any inconsistencies in movement
Deliverable: Reliable helper methods for common AI tasks

Stage 7: Refine and Polish
Goal: Fine-tune behavior and fix edge cases

Implement Behavior Improvements

Add more intelligent evasion
Improve formation behavior
Create better attack patterns
Edge Case Handling

Fix behavior when target is destroyed
Handle crowded environments better
Add failsafes for stuck ships
Final Validation

Test all role/state combinations
Verify smooth transitions between behaviors
Ensure all ships follow expected patterns
Deliverable: Smooth, predictable AI behavior that's easy to debug and extend

Implementation Strategy
Implement each stage sequentially, testing thoroughly before moving to the next. Focus on maintaining existing functionality while improving organization and debuggability.

Each stage should be completed in a way that the game remains fully playable, with behavior becoming progressively more predictable and consistent as we proceed through the stages.