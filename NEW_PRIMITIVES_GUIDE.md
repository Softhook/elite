# New 3D Drawing Primitives Guide

I've added **8 powerful new primitives** to enhance the visual quality of your space objects! Here's what's available:

## New Primitives

### 1. **drawDome** - Hemisphere/Dome
Creates smooth, rounded dome structures perfect for:
- Observatory domes
- Habitat bubbles
- Sensor arrays
- Protective shields

```javascript
Draw3D.drawDome(x, y, radius, segments, color, angle, sunAngle, inverted);
// inverted = true makes it point downward
```

**Example:**
```javascript
// Observatory dome
Draw3D.drawDome(0, bob - size * 0.2, size * 0.3, 12, color(180, 200, 220), obj.angle, sunAngle);
```

---

### 2. **drawCylinder** - Smooth Cylinder
High-quality cylinder with smooth edges:
- Structural supports
- Fuel tanks
- Hab modules
- Pipes and conduits

```javascript
Draw3D.drawCylinder(x, y, radius, height, segments, color, angle, sunAngle);
```

**Example:**
```javascript
// Vertical support column
Draw3D.drawCylinder(0, bob, size * 0.1, size * 0.6, 16, color(150, 150, 160), obj.angle, sunAngle);
```

---

### 3. **drawCone** - Cone/Pyramid
Tapered structures for:
- Antenna tips
- Rocket noses
- Warning beacons
- Decorative spires

```javascript
Draw3D.drawCone(x, y, baseRadius, height, segments, color, angle, sunAngle);
```

**Example:**
```javascript
// Communications spire
Draw3D.drawCone(0, bob - size * 0.4, size * 0.08, size * 0.2, 8, color(200, 180, 160), obj.angle, sunAngle);
```

---

### 4. **drawHelix** - Spiral/Helix
DNA-like spirals perfect for:
- Cooling coils
- Decorative elements
- Energy conduits
- Alien architecture

```javascript
Draw3D.drawHelix(x, y, radius, height, turns, segments, thickness, color, angle, sunAngle);
```

**Example:**
```javascript
// Cooling coil
Draw3D.drawHelix(size * 0.3, bob, size * 0.15, size * 0.5, 2, 8, 2, color(100, 180, 220), obj.angle, sunAngle);
```

---

### 5. **drawLattice** - Grid/Lattice Structure
Framework structures for:
- Solar panel frames
- Structural grids
- Cargo containers
- Communication arrays

```javascript
Draw3D.drawLattice(x, y, width, height, gridX, gridY, beamThickness, color, angle, sunAngle);
```

**Example:**
```javascript
// Solar panel frame
Draw3D.drawLattice(-size * 0.8, bob, size * 0.6, size * 0.4, 3, 2, 2, color(120, 120, 130), obj.angle, sunAngle);
```

---

### 6. **drawRod** - Antenna/Rod
Thin structural elements with optional tips:
- Antennas
- Sensor booms
- Support struts
- Communication arrays

```javascript
Draw3D.drawRod(x1, y1, x2, y2, thickness, color, angle, sunAngle, withTip);
// withTip = true adds a small sphere at the end
```

**Example:**
```javascript
// Antenna with tip
Draw3D.drawRod(0, bob - size * 0.3, size * 0.2, bob - size * 0.6, 2, color(180, 160, 140), obj.angle, sunAngle, true);
```

---

### 7. **drawGeodesicDome** - Faceted Dome
Angular, faceted dome structures:
- Futuristic habitats
- Shield generators
- Observatory domes
- Alien structures

```javascript
Draw3D.drawGeodesicDome(x, y, radius, subdivisions, color, angle, sunAngle);
// subdivisions: 1-3 (higher = more detail)
```

**Example:**
```javascript
// Protective shield dome
Draw3D.drawGeodesicDome(0, bob, size * 0.35, 2, color(100, 150, 200, 150), obj.angle, sunAngle);
```

---

### 8. **drawTorus** - Donut/Ring
Toroidal structures perfect for:
- Rotating habitats
- Power cores
- Decorative rings
- Warp drive rings

```javascript
Draw3D.drawTorus(x, y, majorRadius, minorRadius, segments, tubeSegments, color, angle, sunAngle);
```

**Example:**
```javascript
// Rotating habitat ring
Draw3D.drawTorus(0, bob, size * 0.4, size * 0.08, 16, 8, color(140, 150, 160), obj.angle, sunAngle);
```

---

## Usage Examples

### Enhanced Satellite with New Primitives
```javascript
satellite: function (obj, size, anim, bob) {
    const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
    
    // Main bus using smooth cylinder
    Draw3D.drawCylinder(0, bob, size * 0.18, size * 0.28, 16, color(200, 200, 220), obj.angle, sunAngle);
    
    // Sensor dome on top
    Draw3D.drawDome(0, bob - size * 0.2, size * 0.15, 12, color(150, 180, 200), obj.angle, sunAngle);
    
    // Communication antenna with tip
    Draw3D.drawRod(0, bob - size * 0.3, 0, bob - size * 0.55, 2, color(180, 180, 190), obj.angle, sunAngle, true);
    
    // Solar panels with lattice frames
    Draw3D.drawLattice(-size * 1.2, bob, size * 0.7, size * 0.15, 4, 1, 1.5, color(100, 110, 120), obj.angle, sunAngle);
    Draw3D.drawLattice(size * 1.2, bob, size * 0.7, size * 0.15, 4, 1, 1.5, color(100, 110, 120), obj.angle, sunAngle);
}
```

### Station with Rotating Habitat Ring
```javascript
orbitalStation: function (obj, size, anim, bob) {
    const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
    
    // Central hub
    Draw3D.drawCylinder(0, bob, size * 0.15, size * 0.6, 16, color(180, 180, 190), obj.angle, sunAngle);
    
    // Rotating habitat torus
    Draw3D.drawTorus(0, bob, size * 0.5, size * 0.12, 24, 12, color(160, 165, 170), obj.angle, sunAngle);
    
    // Communication spire on top
    Draw3D.drawCone(0, bob - size * 0.35, size * 0.08, size * 0.18, 8, color(200, 180, 160), obj.angle, sunAngle);
    
    // Docking bay domes
    for (let i = 0; i < 4; i++) {
        const ang = i * (TWO_PI / 4);
        const dx = Math.cos(ang) * size * 0.5;
        const dy = Math.sin(ang) * size * 0.5;
        Draw3D.drawDome(dx, dy + bob, size * 0.08, 8, color(120, 140, 160, 180), obj.angle, sunAngle);
    }
}
```

### Advanced Observatory
```javascript
observatory: function (obj, size, anim, bob) {
    const sunAngle = Math.atan2(-obj.pos.y, -obj.pos.x) - (obj.angle || 0);
    
    // Base platform
    Draw3D.drawCylinder(0, bob + size * 0.2, size * 0.3, size * 0.1, 12, color(150, 150, 160), obj.angle, sunAngle);
    
    // Main building
    Draw3D.drawCylinder(0, bob, size * 0.25, size * 0.4, 12, color(170, 175, 180), obj.angle, sunAngle);
    
    // Geodesic dome on top
    Draw3D.drawGeodesicDome(0, bob - size * 0.25, size * 0.28, 2, color(100, 150, 220, 200), obj.angle, sunAngle);
    
    // Support rods
    for (let i = 0; i < 3; i++) {
        const ang = i * (TWO_PI / 3);
        const dx = Math.cos(ang) * size * 0.2;
        const dy = Math.sin(ang) * size * 0.2;
        Draw3D.drawRod(dx, dy + bob + size * 0.25, dx, dy + bob - size * 0.15, 2, color(140, 145, 150), obj.angle, sunAngle, false);
    }
    
    // Helical antenna
    Draw3D.drawHelix(size * 0.35, bob - size * 0.1, size * 0.08, size * 0.3, 2, 6, 2, color(180, 160, 140), obj.angle, sunAngle);
}
```

---

## Tips for Best Results

1. **Combine Primitives**: Mix different primitives to create complex, interesting structures
2. **Vary Segment Counts**: Higher segments = smoother but slower. Use 8-16 for most objects
3. **Layer Details**: Add smaller details on top of larger structures
4. **Use Transparency**: Alpha values make overlapping elements look better
5. **Lighting Matters**: The sunAngle parameter creates realistic shading
6. **Animation**: Rotate individual components for dynamic effects

---

## Performance Notes

- **Domes & Tori**: Most expensive (many triangles). Use sparingly or reduce segments
- **Cones & Cylinders**: Medium cost, good for common structures  
- **Rods & Lattices**: Lightweight, perfect for detail work
- **Helix**: Cost depends on turns × segments

For background objects, reduce segment counts by 25-50%!
