Z-Sorting Issue Resolution - Walkthrough
Problem
Space objects exhibited Z-sorting issues where elements that should be behind would "pop" in front during rotation. This was particularly noticeable with multi-component objects like fuel depot (3 tanks) and satellite (boxes on prisms).

Investigation
Root Cause Analysis
The issue is a fundamental limitation of 2.5D rendering:

Each Draw3D primitive renders in fixed order: bottom cap → sides → top cap
When multiple primitives overlap, their caps exist at different depths
Primitive A's bottom cap might be "behind" Primitive B, but Primitive A's top cap might be "in front"
No single draw order can resolve this conflict
Attempted Solutions
1. Adaptive Cap Ordering

Modified 
drawBox3D
 and 
drawPrism
 to swap cap order based on rotation
❌ Failed: Conflicted with primitive-level sorting
2. Deferred Rendering Queue

Implemented system to queue all Draw3D calls, sort by calculated depth, then execute
❌ Failed: Sorting entire primitives can't resolve cap-level depth conflicts
3. Improved Depth Calculations

Tried multiple formulas accounting for X, Y, rotation, depth vectors
❌ Failed: Mathematical impossibility - can't order overlapping depth ranges
Solution: Rotation Constraints
Approach
Instead of fixing the rendering (impossible without rewriting to face-level sorting), constrain rotation to minimize the problem.

Implementation
Changed space objects from continuous 360° rotation to ±30° oscillation:

// Before: Continuous rotation
this.angle += this.rotationSpeed * dt;
// After: Oscillation within safe range
const oscillationPhase = this.bobPhase * this.rotationSpeed * 8;
this.angle = Math.sin(oscillationPhase) * (Math.PI / 6); // ±30°
[MODIFIED] 
spaceObjects.js:3798-3808
 - SpaceObject.update()

Why This Works
Z-sorting conflicts are angle-dependent:

0° (top-down): Minimal depth ambiguity - safe
±30°: Slight tilt - still mostly safe
±45-90°: Maximum ambiguity - problematic
180°: Flipped but safe again
By keeping objects within ±30°, we stay in the "safe zone" where depth conflicts are minimal.

Benefits
✅ Eliminates most visual popping - Objects stay mostly top-down
✅ Still shows 3D form - Gentle rock/sway motion demonstrates depth
✅ No rendering complexity - Simple change to update logic
✅ Consistent with retro aesthetic - Original Elite had similar limitations

Trade-offs
❌ Objects don't fully spin (but they never needed to)
✅ More natural motion - looks like floating/drifting rather than spinning top

Testing
Reload 
test/space_objects_viewer.html
 and observe:

Objects now gently rock back and forth
No more elements popping in front/behind incorrectly
3D depth still visible through oscillation
Technical Details
The oscillation uses bobPhase (already used for vertical bob) to drive rotation:

Smooth sinusoidal motion
Each object has its own rotationSpeed affecting oscillation frequency
Range limited to Math.PI / 6 (30°) to stay in safe zone
Alternative Approaches Considered
Face-level sorting - Would truly fix it but requires major Draw3D rewrite
Discrete angle snapping - Jarring visual jumps
Rotation with slowdown zones - Overly complex
Oscillation is the best balance of simplicity and effectiveness.