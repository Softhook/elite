# How to View Your New Objects

You have a built-in Space Objects Viewer! Here's how to see your new objects:

## 🎯 Quick Start

### Option 1: Use the Space Objects Viewer (EASIEST)

1. Open your browser
2. Navigate to: `file:///Users/softhook/Documents/GitHub/elite/test/space_objects_viewer.html`
3. Your 4 new objects will automatically appear in the grid!

**Look for these new ones:**
- `advancedResearchStation` - Will be in the grid
- `powerStation` - Will be in the grid
- `commHub` - Will be in the grid  
- `alienMonolith` - Will be in the grid

**Controls:**
- **Arrow Keys** - Navigate through objects fullscreen
- **Drag** - Rotate the focused object
- **Esc** - Exit fullscreen view
- **Scale dropdown** - Make objects bigger/smaller
- **Shuffle** - Random positions

---

## 🎮 Option 2: Spawn in Main Game

If you want to spawn them in your actual game (not the viewer):

### Step 1: Find your main game file
Look for `index.html` or your main game HTML file in:
```
/Users/softhook/Documents/GitHub/elite/
```

### Step 2: Load the game in browser
Open that HTML file in your browser

### Step 3: Open console (F12 or Cmd+Option+J on Mac)

### Step 4: Check if game is loaded:
```javascript
// Check what's available
console.log(typeof SpaceObject);  // Should say "function"
console.log(typeof sizeMap);      // Should say "object"
```

### Step 5: Spawn objects differently based on your game structure

**If you see a `game` object or `currentSystem`:**
```javascript
// Check what variables exist
console.log(Object.keys(window).filter(k => k.includes('system') || k.includes('game')));
```

**Common patterns - try these:**

```javascript
// Pattern 1: Using currentSystem
if (typeof currentSystem !== 'undefined') {
    currentSystem.spaceObjects.push(new SpaceObject(player.pos.x + 300, player.pos.y, 'advancedResearchStation'));
}

// Pattern 2: Using game.currentSystem
if (typeof game !== 'undefined' && game.currentSystem) {
    game.currentSystem.spaceObjects.push(new SpaceObject(player.pos.x + 300, player.pos.y, 'advancedResearchStation'));
}

// Pattern 3: Direct creation for testing (no system needed)
let testObj = new SpaceObject(400, 300, 'alienMonolith');
// Then you can manually call testObj.draw() in your game loop
```

---

## 🔍 Easiest Solution: Use the Viewer!

**Just open this URL in your browser:**

```
file:///Users/softhook/Documents/GitHub/elite/test/space_objects_viewer.html
```

This viewer automatically:
- ✅ Loads all objects from `sizeMap` (including your 4 new ones)
- ✅ Displays them in a grid
- ✅ Lets you rotate and inspect each object
- ✅ Shows sun-angle lighting correctly
- ✅ No game state needed!

---

## 📋 Quick Object Names Reference

When you see the viewer grid, look for these types (they're at the end):

| Object Type | What to Look For |
|-------------|------------------|
| `advancedResearchStation` | Spinning torus ring with domes |
| `powerStation` | Helical coils around reactor core |
| `commHub` | Tapered tower with antenna array |
| `alienMonolith` | Purple pulsing with floating rings |

---

## 🎨 What You'll See

The viewer will show ALL space objects including:
- Your 4 NEW advanced objects (at the end of the grid)
- All the existing objects (satellite, telescope, etc.)
- Real-time rendering with proper 3D lighting
- Ability to focus and rotate each one individually

**Total objects in viewer:** ~40+ including your 4 new ones!

---

## 💡 Pro Tip

Use **Arrow Keys** in the viewer to cycle through objects in fullscreen mode - this is the BEST way to see the detail and animation of each object!

**Press → until you see:**
1. The rotating torus ring (Advanced Research Station)
2. The helical coils (Power Station)  
3. The antenna array (Comm Hub)
4. The pulsing purple energy (Alien Monolith)

---

## ❓ Still Having Issues?

If the viewer doesn't work:
1. Make sure you opened the HTML file (not the JS file)
2. Check browser console for errors (F12)
3. Verify the file exists: `/Users/softhook/Documents/GitHub/elite/test/space_objects_viewer.html`
4. Try opening it in Chrome/Firefox if Safari has issues

The viewer loads:
- `../draw3d.js` (has your new primitives)
- `../spaceObjects.js` (has your new objects)

So as long as those files are in place, it will work automatically!
