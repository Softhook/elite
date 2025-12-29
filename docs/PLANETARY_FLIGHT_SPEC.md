# Planetary Surface Flight Specification

## 1. Overview
This feature extends the game world by allowing seamless transitions from interplanetary space to low-altitude planetary flight. It aims to deliver "Trench Run" style gameplay, emphasizing speed, terrain navigation, and visceral atmospheric combat.

## 2. Technical Architecture

### 2.1 The "Extreme Zoom" Transition (Top-Down Low Poly)
*   **Goal:** Seamlessly transition from a sprite-based Planet to a "Low Poly" 3D surface that matches the ship's aesthetic.
*   **Method:**
    1.  **Approach:** Planet Sprite scales up.
    2.  **Handover:** At the transition threshold, the sprite is replaced by a grid of **Draw3D Primitives**.
    3.  **Aesthetic:** The surface is NOT a flat texture. It is a procedural collection of `Draw3D.drawPrism` (buildings), `Draw3D.drawCone` (mountains), and `Draw3D.drawExtrudedShape` (terrain chunks).

### 2.2 Coordinate System (Local Grid)
*   **Reference Frame:** The player remains at (0,0) in screen space.
*   **Scrolling World:** The "Ground" is a logical grid of cells. As the player moves, we render the cells relative to the player's position.
*   **Z-Axis Depth:** We utilize the existing `Draw3D` depth vector logic.
    *   *Ground:* Drawn at `depth = 0`.
    *   *Mountains/Buildings:* Extruded with `depth > 0`.
    *   *Ships:* Drawn at `depth = altitude`.
*   **Shadows:** Essential for placing objects in this 2.5D space. Shadows are drawn at `depth = 0` (on the ground) while the object is drawn at `depth = altitude`.

## 3. Flight Mechanics (Low Poly 3D)

### 3.1 The View
*   Camera remains Orthographic Top-Down.
*   **Perspective Shift:** We use the `Draw3D` angle to create the "Faux 3D" look.
    *   Center of screen: Objects look "top down".
    *   Edges of screen: Objects "lean" away from the center (or uniformly lean if we use a fixed light/view vector).
*   **Result:** The ground looks like a populated 3D model board.

### 3.2 Visualizing Altitude
*   **Shadow Parallax:**
    *   The distance between the **Object Sprite** (Ship) and its **Shadow Sprite** (Ground) visualizes altitude.
    *   `ShadowOffset = Altitude * ViewAngleVector`.
*   **Scale:** Objects slightly scale up as they get "closer" (higher), though orthographic projection technically doesn't scale, adding a slight scale factor helps the "Zoom" feeling.

### 3.3 Terrain Generation (Unified Noise Field)

To ensure the "Red Spot" from space is a "Red Desert" on the ground, we must sample the **same 3D noise field** used in `planet.js`.

1.  **The "Anchored" Coordinate System:**
    *   When the player transitions to surface mode, we record the **Landing Vector** `V_land` (normalized vector from planet center to ship).
    *   The Surface World (x,y) is treated as a tangent plane at `V_land`.
2.  **Mapping Surface (x,y) to Noise (nx, ny, nz):**
    *   We use the same `noiseScale`, `featureRand`, and `palette` from the `Planet` instance.
    *   For a surface point `(sx, sy)`:
        *   Calculate the exact 3D point on the sphere surface: `P_sphere = Rotate(V_land, sx, sy)`.
        *   Convert to noise coordinates:
            ```javascript
            nx = P_sphere.x * planet.sampleMultiplier + planet.featureRand * 0.001;
            ny = P_sphere.y * planet.sampleMultiplier + planet.featureRand * 0.002;
            nz = P_sphere.z * planet.sampleMultiplier + planet.noiseZ;
            ```
    *   **Result:** A mountain range seen from orbit will exist as actual mountains on the surface.
3.  **Render Mesh:**
    *   Use `p5.noise(nx, ny, nz)` to get the height/color index.
    *   Construct the mesh grid using these coherent values.
    *   **Detail Layer:** We add a secondary "Micro-Noise" layer (high frequency, low amplitude) to add texture to the ground that is too small to be seen from orbit.


## 4. Environment & Procedural Generation

### 4.1 "Zelda-Style" Biomes
*   Top-down tilemaps or noise-generated textures.
*   **Biomes:**
    *   *Ice:* White/Blue noise textures, shiny frozen lakes.
    *   *Desert:* Orange dunes (using normal maps for shadows if possible, or just drawn textures).
    *   *City:* Grid-like patterns of roof sprites.

### 4.2 The "View"
*   The camera remains orthographic.
*   We can interpret "Surface Mode" as a hyper-detailed magnification of the map.

## 5. Gameplay Loops

### 5.1 "Strike Strike" (Helicopter Gameplay)
*   The gameplay shifts from "Jet Fighter" loop to "Attack Helicopter" loop.
*   Strafing circles around ground targets.
*   Using lateral thrusters to dodge incoming fire while keeping guns trained on a stationary turret.

### 5.2 Landing
*   Find a flat area (no collision sprites).
*   Lower altitude until `z_altitude` ~= 0.
*   "Docking" is just landing on a specific square marked with a "H" or Beacon.

### 5.3 Surface Missions
*   **Convoy Ambush:** Attacking a train or convoy of trucks moving along a road on the flat background.
*   **Installation Destruction:** Strafing a large multi-tile base complex.


## 7. Future Roadmaps
*   **Ground Vehicles:** Deploying a rover from the ship? (Out of scope for V1).
*   **Underwater:** Seamless transition from air to ocean? (Requires new physics).
