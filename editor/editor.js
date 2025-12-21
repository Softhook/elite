// ****** editor.js ******
// Logic for the p5.js ship editor - ENHANCED with multi-shape, add vertex, color edit
// VERSION WITH relative scaling, grid, zoom, shape dragging, multi-vertex select, fixes
// +++ Added Axis-Constrained Dragging (Shift Key) +++
// +++ Added Straighten Symmetry Function +++
// +++ Added Undo Functionality (v3 - Correct Drag Undo Timing) +++

// --- Global Variables ---
let shipSelector;
let exportButton;
let addShapeButton;
let addVertexButton;
let fillColorPicker;

let instructionsDiv;
let thargoidWarningSpan;
let zoomInButton;
let zoomOutButton;
let descriptionDiv;
let straightenButton;
let centerDesignButton; // <-- Add this variable
let mirrorVButton;
let mirrorHButton;
let rotatePlus90Button;
let rotateMinus90Button;
let sizeIncreaseButton;
let sizeDecreaseButton;
let addCircleButton;
let addSquareButton;
let addHexButton;
let addStarButton;
let addShieldButton;
let addSkullButton;
let undoButton;
let combineShapesButton;
let compareShipsButton;
let shipComparer = null; // Instance of the comparer class
let compareWeaponsButton;
let weaponComparer = null; // Instance of the weapon comparer

let currentShipKey = null; // Key ("Sidewinder", "CobraMkIII", etc.) or "--- New Blank ---"
let currentShipDef = null; // The original definition object (if loaded)
let shapes = []; // Array of shape objects: { vertexData: [{x,y},...], fillColor: [r,g,b] }

// Layer stacking: shapes[0] = BOTTOM layer, shapes[shapes.length-1] = TOP layer
// Drawing order: bottom to top (i=0 to i=shapes.length-1)
// Selection order: top to bottom (i=shapes.length-1 to i=0)

// --- Undo History ---
let historyStack = [];
const maxHistorySize = 30; // Max number of undo steps

// --- Display & Scaling ---
let canvasWidth = 1000;
let canvasHeight = 650;
let baseDisplaySize = 450; // Initial Max drawing size (represents current zoom)
let maxDefinedShipSize = 1; // Will be calculated from definitions
let pixelsPerUnit = 1; // Scale factor: pixels / ship size unit
let gridSpacing = 25; // World units between grid lines (adjust for visual density)

// --- Zoom Control ---
const zoomFactor = 1.2; // How much to zoom per click
const minBaseDisplaySize = 50; // Min zoom out level (in pixels for largest ship)
const maxBaseDisplaySize = 2000; // Max zoom in level

// --- Interaction ---
let vertexHandleSize = 8;
let grabRadius = 10; // Screen pixels for clicking handle
let edgeClickMinDist = 15; // Screen pixels for clicking edge in add mode
const straightenThreshold = 0.2; // Tolerance for symmetry check (relative coords)

let selectedShapeIndices = []; // Array of selected shape layer indices (multi-select)
let selectedVertexIndices = []; // Array for multi-select vertex indices within primary shape
let draggingVertex = false; // Now means dragging selected vertices
let addingVertexMode = false;
let draggingShape = false; // Flag for shape dragging
let dragOccurred = false; // Flag to check if a drag actually moved something

// --- Dragging State ---
let dragVertexStartX = 0; // Screen X (relative to center) where vertex drag started
let dragVertexStartY = 0; // Screen Y (relative to center) where vertex drag started
let dragVertexInitialPositions = []; // Store initial RELATIVE positions [{index, x, y}]

let dragShapeStartX = 0; // ABSOLUTE Screen X where shape drag started
let dragShapeStartY = 0; // ABSOLUTE Screen Y where shape drag started
let dragConstrainedAxis = null; // 'x', 'y', or null

// --- Setup ---
function setup() {
    console.log("Setup running...");
    console.log("SHIP_DEFINITIONS available:", typeof SHIP_DEFINITIONS !== 'undefined');
    console.log("Ship count:", typeof SHIP_DEFINITIONS !== 'undefined' ?
        Object.keys(SHIP_DEFINITIONS).length : "N/A");

    let canvas = createCanvas(canvasWidth, canvasHeight);
    canvas.parent('main');
    ellipseMode(RADIUS); // Use RADIUS for handle size consistency
    angleMode(DEGREES); // Use DEGREES if needed

    // Calculate max size from definitions for scaling
    maxDefinedShipSize = 1; // Reset default
    for (let key in SHIP_DEFINITIONS) {
        if (SHIP_DEFINITIONS[key]?.size > maxDefinedShipSize) {
            maxDefinedShipSize = SHIP_DEFINITIONS[key].size;
        }
    }
    calculateScale(); // Initial scale calculation

    // --- Get References to UI Elements ---
    instructionsDiv = select('#instructions');
    thargoidWarningSpan = select('#thargoidWarning');
    shipSelector = select('#shipSelect');
    exportButton = select('#exportButton');
    addShapeButton = select('#addShapeButton');
    addVertexButton = select('#addVertexButton');
    addCircleButton = select('#addCircleButton');
    addSquareButton = select('#addSquareButton');
    addHexButton = select('#addHexButton');
    addStarButton = select('#addStarButton');
    addShieldButton = select('#addShieldButton');
    addSkullButton = select('#addSkullButton');
    fillColorPicker = select('#fillColorPicker');

    zoomInButton = select('#zoomInButton');
    zoomOutButton = select('#zoomOutButton');
    descriptionDiv = select('#shipDescriptionArea');
    straightenButton = select('#straightenButton');
    centerDesignButton = select('#centerDesignButton'); // <-- Get reference
    mirrorVButton = select('#vmirrorButton');
    mirrorHButton = select('#hmirrorButton');
    rotatePlus90Button = select('#rotatePlus90Button');
    rotateMinus90Button = select('#rotateMinus90Button');
    sizeIncreaseButton = select('#sizeIncreaseButton');
    sizeDecreaseButton = select('#sizeDecreaseButton');
    undoButton = select('#undoButton');
    combineShapesButton = select('#combineShapesButton');
    compareShipsButton = select('#compareShipsButton'); // Add this
    compareWeaponsButton = select('#compareWeaponsButton');

    // --- Populate Ship Dropdown ---
    shipSelector.option('Select a Ship...');
    shipSelector.option('--- New Blank ---');
    for (let key in SHIP_DEFINITIONS) { shipSelector.option(key); }

    // --- Attach Listeners (with null checks for safety) ---
    shipSelector.changed(handleShipSelection);
    if (exportButton) exportButton.mousePressed(exportDrawFunctionCode); else console.error("Export button not found");
    if (addShapeButton) addShapeButton.mousePressed(addNewShape); else console.error("Add Shape button not found");
    if (addCircleButton) addCircleButton.mousePressed(addCircleShape); else console.error("Add Circle button not found");
    if (addSquareButton) addSquareButton.mousePressed(addSquareShape); else console.error("Add Square button not found");
    if (addHexButton) addHexButton.mousePressed(addHexagonShape); else console.error("Add Hexagon button not found");
    if (addStarButton) addStarButton.mousePressed(addStarShape); else console.error("Add Star button not found");
    if (addShieldButton) addShieldButton.mousePressed(addShieldShape); else console.error("Add Shield button not found");
    if (addSkullButton) addSkullButton.mousePressed(addSkullShape); else console.error("Add Skull button not found");
    if (addVertexButton) addVertexButton.mousePressed(toggleAddVertexMode); else console.error("Add Vertex button not found");
    if (zoomInButton) zoomInButton.mousePressed(zoomIn); else console.error("Zoom In button not found");
    if (zoomOutButton) zoomOutButton.mousePressed(zoomOut); else console.error("Zoom Out button not found");
    if (fillColorPicker) fillColorPicker.input(updateSelectedShapeFill); else console.error("Fill picker not found");

    if (straightenButton) straightenButton.mousePressed(handleStraightenClick); else console.error("Straighten button not found");
    if (centerDesignButton) centerDesignButton.mousePressed(centerDesignByBoundingBox); else console.error("Center Design button not found"); // <-- Attach listener
    if (mirrorVButton) mirrorVButton.mousePressed(handleVMirrorClick); else console.error("V Mirror button not found");
    if (mirrorHButton) mirrorHButton.mousePressed(handleHMirrorClick); else console.error("H Mirror button not found");
    if (rotatePlus90Button) rotatePlus90Button.mousePressed(() => rotateSelectedByDegrees(45)); else console.error("Rotate +45 button not found");
    if (rotateMinus90Button) rotateMinus90Button.mousePressed(() => rotateSelectedByDegrees(-45)); else console.error("Rotate -45 button not found");
    if (sizeIncreaseButton) sizeIncreaseButton.mousePressed(() => scaleSelectedShapes(1.1)); else console.error("Size Increase button not found");
    if (sizeDecreaseButton) sizeDecreaseButton.mousePressed(() => scaleSelectedShapes(0.9)); else console.error("Size Decrease button not found");
    if (undoButton) undoButton.mousePressed(undoLastChange); else console.error("Undo button not found");
    if (combineShapesButton) combineShapesButton.mousePressed(combineSelectedShapes); else console.error("Combine Shapes button not found");
    if (compareShipsButton) compareShipsButton.mousePressed(toggleShipComparer); else console.error("Compare Ships button not found"); // Add this
    if (compareWeaponsButton) compareWeaponsButton.mousePressed(toggleWeaponComparer); else console.error("Compare Weapons button not found");
    if (descriptionDiv === null) { console.error("Description Div (#shipDescriptionArea) not found!"); }

    // --- Instantiate ShipComparer AFTER SHIP_DEFINITIONS is ready ---
    if (typeof SHIP_DEFINITIONS !== 'undefined' && Object.keys(SHIP_DEFINITIONS).length > 0) {
        try {
            shipComparer = new ShipComparer(SHIP_DEFINITIONS);
            shipComparer.init();
            console.log("ShipComparer initialized.");
        } catch (e) {
            console.error("Failed to initialize ShipComparer:", e);
            if (compareShipsButton?.elt) compareShipsButton.elt.disabled = true; // Disable button if init fails
        }
    } else {
        console.error("SHIP_DEFINITIONS not ready for ShipComparer initialization.");
        if (compareShipsButton?.elt) compareShipsButton.elt.disabled = true;
    }

    // --- Instantiate WeaponComparer AFTER WEAPON_UPGRADES is ready ---
    if (typeof WEAPON_UPGRADES !== 'undefined' && Array.isArray(WEAPON_UPGRADES) && WEAPON_UPGRADES.length > 0) {
        try {
            weaponComparer = new WeaponComparer(WEAPON_UPGRADES);
            weaponComparer.init();
            console.log("WeaponComparer initialized.");
        } catch (e) {
            console.error("Failed to initialize WeaponComparer:", e);
            if (compareWeaponsButton?.elt) compareWeaponsButton.elt.disabled = true;
        }
    } else {
        console.error("WEAPON_UPGRADES not ready for WeaponComparer initialization.");
        if (compareWeaponsButton?.elt) compareWeaponsButton.elt.disabled = true;
    }

    // --- Initialize State ---
    handleShipSelection(); // Load initial state (or blank)
    updateUIControls(); // Set initial button disabled states etc.

    // Add a direct event listener for Command+Z
    document.addEventListener('keydown', function (e) {
        // Check if this is Command+Z (metaKey is Command on Mac)
        if (e.key === 'z' && e.metaKey) {
            e.preventDefault(); // Prevent browser's default undo behavior
            undoLastChange();
        }
    });
}

// --- Undo History Functions ---
function saveStateForUndo() {
    try {
        // Basic Validation before saving (optional but good practice)
        for (const shape of shapes) {
            if (!shape || !Array.isArray(shape.vertexData) || !Array.isArray(shape.fillColor) || shape.fillColor.length !== 3) {
                console.error("UNDO SAVE ERROR: Invalid shape structure detected before saving state.", shape);
                return;
            }
            for (const vert of shape.vertexData) {
                if (typeof vert?.x !== 'number' || typeof vert?.y !== 'number' || isNaN(vert.x) || isNaN(vert.y)) {
                    console.error("UNDO SAVE ERROR: Invalid vertex data detected before saving state.", vert);
                    return;
                }
            }
            if (shape.fillColor.some(isNaN)) {
                console.error("UNDO SAVE ERROR: NaN found in color data.", shape.fillColor);
                return;
            }
        }

        const stateCopy = JSON.parse(JSON.stringify(shapes)); // Deep copy
        const stateToSave = stateCopy;

        historyStack.push(stateToSave);

        // Limit history size
        if (historyStack.length > maxHistorySize) {
            historyStack.shift(); // Remove the oldest state
        }
        updateUIControls(); // Update button states (enable undo)
    } catch (e) {
        console.error("Error saving state for undo:", e);
        historyStack = []; // Clear history on catastrophic save failure
        updateUIControls();
    }
}

function undoLastChange() {
    if (historyStack.length === 0) {
        console.log("Nothing to undo.");
        return;
    }

    try {
        const previousState = historyStack.pop();
        let restoredShapes = JSON.parse(JSON.stringify(previousState)); // Deep copy

        // --- Validate restored state ---
        let isValidState = true;
        if (!Array.isArray(restoredShapes)) {
            isValidState = false; console.error("UNDO RESTORE ERROR: Restored state is not an array.");
        } else {
            for (let i = 0; i < restoredShapes.length; i++) {
                const shape = restoredShapes[i];
                let shapeValid = true;
                if (!shape) { shapeValid = false; console.error(`UNDO RESTORE ERROR: Shape at index ${i} is null/undefined.`); }
                else if (!Array.isArray(shape.vertexData)) { shapeValid = false; console.error(`UNDO RESTORE ERROR: vertexData missing or not array at index ${i}.`); }
                else if (!Array.isArray(shape.fillColor) || shape.fillColor.length !== 3) { shapeValid = false; console.error(`UNDO RESTORE ERROR: fillColor invalid at index ${i}.`, shape.fillColor); }
                else {
                    for (let j = 0; j < shape.vertexData.length; j++) {
                        const vert = shape.vertexData[j];
                        if (!vert || typeof vert.x !== 'number' || typeof vert.y !== 'number' || isNaN(vert.x) || isNaN(vert.y)) {
                            shapeValid = false; console.error(`UNDO RESTORE ERROR: Invalid vertex at shape[${i}], vertex[${j}]:`, vert); break;
                        }
                    }
                    if (shape.fillColor.some(isNaN)) {
                        shapeValid = false; console.error(`UNDO RESTORE ERROR: NaN found in color data at index ${i}.`, shape.fillColor);
                    }
                }
                if (!shapeValid) { isValidState = false; break; }
            }
        }

        if (!isValidState) {
            console.error("Undo failed: Restored state is invalid. History might be corrupted.");
            historyStack = []; // Clear corrupted history
            updateUIControls();
            return; // Stop the undo operation
        }

        // Apply the validated state
        shapes = restoredShapes;

        // Reset selections and interaction modes
        selectedShapeIndices = [];
        selectedVertexIndices = [];
        addingVertexMode = false;
        draggingVertex = false;
        draggingShape = false;
        dragOccurred = false;

        console.log("Undo successful. History size:", historyStack.length);
        updateUIControls(); // Update button states (disable undo if empty)
        updateColorPickersFromSelection(); // Update UI based on the now *deselected* state

    } catch (e) {
        console.error("Error during undo operation:", e);
        historyStack = []; // Clear history on error
        updateUIControls();
    }
}

// --- Helper Function to Calculate Scale ---
function calculateScale() {
    pixelsPerUnit = baseDisplaySize / maxDefinedShipSize;
}

// --- Zoom Functions ---
function zoomIn() {
    baseDisplaySize = min(baseDisplaySize * zoomFactor, maxBaseDisplaySize);
    calculateScale();
}
function zoomOut() {
    baseDisplaySize = max(baseDisplaySize / zoomFactor, minBaseDisplaySize);
    calculateScale();
}

// --- Main Drawing Loop ---
function draw() {
    background(240); // Clear background
    push(); // Isolate transformations
    translate(width / 2, height / 2); // Center origin

    // Draw Grid
    drawGrid(pixelsPerUnit, gridSpacing);

    // Determine the drawing size based on loaded definition or fallback
    let actualDrawSize_s = 0;
    if (currentShipDef) {
        actualDrawSize_s = (currentShipDef.size || 1) * pixelsPerUnit;
    } else if (shapes.length > 0 && currentShipKey === '--- New Blank ---') {
        // Use a fixed size for blank ships relative to max size for consistent initial editing
        actualDrawSize_s = baseDisplaySize * (50 / maxDefinedShipSize);
    }

    // Display placeholder text if nothing is loaded/created
    if (!currentShipDef && shapes.length === 0 && currentShipKey !== '--- New Blank ---') {
        pop(); // Revert translate
        textAlign(CENTER, CENTER); textSize(14); fill(150);
        text("Select a ship or 'New Blank'", width / 2, height / 2);
        return; // Don't draw anything else
    }

    // Proceed with drawing if we have a size or are editing a blank ship
    if (actualDrawSize_s > 0 || (currentShipKey === '--- New Blank ---')) {
        // Calculate radius for drawing (use fallback if size is 0 but drawing blank shapes)
        let scaled_r = actualDrawSize_s / 2;
        let drawing_r = scaled_r > 0 ? scaled_r : baseDisplaySize / (maxDefinedShipSize * 2); // Fallback radius for blank start

        // Draw Thargoid (non-editable) or Editable Shapes
        if (isThargoidSelected()) {
            SHIP_DEFINITIONS.Thargoid.drawFunction(actualDrawSize_s, false);
        } else {
            for (let i = 0; i < shapes.length; i++) { // Draw in order: shapes[0] at bottom, shapes[length-1] on top
                let shape = shapes[i];
                if (shape && shape.vertexData && shape.vertexData.length > 1) {
                    fill(shape.fillColor[0], shape.fillColor[1], shape.fillColor[2]);
                    // Highlight selected shape layers with stroke, otherwise no stroke
                    if (selectedShapeIndices.includes(i)) {
                        strokeWeight(3); stroke(0, 150, 255, 200);
                    } else {
                        noStroke();
                    }
                    beginShape();
                    // Support holes via `shape.holes` (array of vertex arrays) using beginContour()/endContour()
                    for (let v of shape.vertexData) {
                        if (typeof v?.x === 'number' && typeof v?.y === 'number') {
                            vertex(v.x * drawing_r, v.y * drawing_r); // Scale relative coords
                        }
                    }
                    if (Array.isArray(shape.holes)) {
                        for (let hole of shape.holes) {
                            try {
                                beginContour();
                                for (let hv of hole) {
                                    if (typeof hv?.x === 'number' && typeof hv?.y === 'number') {
                                        vertex(hv.x * drawing_r, hv.y * drawing_r);
                                    }
                                }
                                endContour();
                            } catch (e) {
                                // If beginContour/endContour are not supported, skip holes
                                console.warn('Contour not supported, skipping hole rendering', e);
                            }
                        }
                    }
                    endShape(CLOSE);
                }
            }
        }

        // Draw Vertex Handles for the primary selected shape (first in selectedShapeIndices)
        const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
        if (primaryShapeIndex !== -1 && primaryShapeIndex < shapes.length && !isThargoidSelected()) {
            let selectedShape = shapes[primaryShapeIndex];
            if (selectedShape && selectedShape.vertexData && drawing_r > 0) {
                for (let i = 0; i < selectedShape.vertexData.length; i++) {
                    let v = selectedShape.vertexData[i];
                    if (typeof v?.x === 'number' && typeof v?.y === 'number') {
                        let screenX = v.x * drawing_r; let screenY = v.y * drawing_r;
                        // Style handles based on selection state
                        if (selectedVertexIndices.includes(i)) { fill(255, 0, 0, 200); stroke(150, 0, 0); }
                        else { fill(0, 100, 200, 180); stroke(0, 50, 150); }
                        strokeWeight(1); // Fixed handle stroke
                        ellipse(screenX, screenY, vertexHandleSize / 2, vertexHandleSize / 2);
                    }
                }
            }
        }
    } else if (currentShipKey !== '--- New Blank ---') {
        pop(); textAlign(CENTER, CENTER); textSize(14); fill(150);
        text("Select a ship or 'New Blank'", width / 2, height / 2);
    }

    pop(); // Revert translate transformation
}

// --- Grid Drawing Function ---
function drawGrid(ppu, spacing) {
    let pixelSpacing = spacing * ppu; // Correct calculation
    if (pixelSpacing < 4) return; // Avoid overly dense grid

    stroke(200, 200, 200, 150); strokeWeight(0.5);
    let halfWidth = width / 2; let halfHeight = height / 2;
    // Draw lines outwards from the center
    for (let x = 0; x <= halfWidth + pixelSpacing; x += pixelSpacing) { line(x, -halfHeight, x, halfHeight); if (x !== 0) line(-x, -halfHeight, -x, halfHeight); }
    for (let y = 0; y <= halfHeight + pixelSpacing; y += pixelSpacing) { line(-halfWidth, y, halfWidth, y); if (y !== 0) line(-halfWidth, -y, halfWidth, -y); }
}

// --- Event Handlers ---
function handleShipSelection() {
    // Reset state variables
    currentShipKey = shipSelector.value(); shapes = []; selectedShapeIndices = []; selectedVertexIndices = [];
    addingVertexMode = false; draggingShape = false; draggingVertex = false;
    dragConstrainedAxis = null; dragOccurred = false;

    // Clear Undo History for new selection
    historyStack = [];

    let descriptionText = "Select a ship to view its description.";

    // Handle different selection types
    if (currentShipKey === '--- New Blank ---') {
        currentShipDef = null; thargoidWarningSpan.style('display', 'none');
        descriptionText = "Editing a new custom ship design.";
    } else if (SHIP_DEFINITIONS[currentShipKey]) {
        currentShipDef = SHIP_DEFINITIONS[currentShipKey];
        descriptionText = currentShipDef.description || "No description available.";
        // Check for multi-layer ship
        if (currentShipDef.vertexLayers && currentShipDef.vertexLayers.length > 0 && !isThargoidSelected()) {
            try {
                // Load all layers
                currentShipDef.vertexLayers.forEach(layer => {
                    shapes.push({
                        vertexData: JSON.parse(JSON.stringify(layer.vertexData)),
                        fillColor: [...(layer.fillColor || [180, 180, 180])]
                    });
                });
                selectedShapeIndices = [0]; // Select the first layer
            } catch (e) {
                console.error("ERROR processing vertexLayers for", currentShipKey, e);
            }
        }
        // Fallback to single vertexData if no vertexLayers or vertexLayers loading failed
        else if (currentShipDef.vertexData && currentShipDef.vertexData.length > 0 && !isThargoidSelected() && shapes.length === 0) {
            try {
                shapes.push({ // Create initial shape layer (deep copy)
                    vertexData: JSON.parse(JSON.stringify(currentShipDef.vertexData)),
                    fillColor: [...(currentShipDef.fillColor || [180, 180, 180])]
                });
                selectedShapeIndices = [0]; // Select the first layer
            } catch (e) {
                console.error("ERROR processing vertexData for", currentShipKey, e);
                selectedShapeIndices = []; currentShipDef = null; shapes = [];
                descriptionText = "Error loading ship data.";
            }
        }
        thargoidWarningSpan.style('display', isThargoidSelected() ? 'inline' : 'none');
    } else { // Handle "Select a Ship..."
        currentShipKey = null; currentShipDef = null;
        thargoidWarningSpan.style('display', 'none');
    }

    if (descriptionDiv) {
        let propertyDisplay = "";
        // If we have a valid ship definition, show its properties
        if (currentShipDef) {
            propertyDisplay = `<div style="text-align:left">
                <p><strong>Name:</strong> ${currentShipDef.name || currentShipKey}</p>
                <p><strong>Description:</strong> ${currentShipDef.description || "No description available."}</p>
                <p><strong>Role:</strong> ${currentShipDef.role || 'N/A'}</p>
                <p><strong>Hull:</strong> ${currentShipDef.baseHull || 'N/A'}</p>
                <p><strong>Shield:</strong> ${currentShipDef.baseShield || 'N/A'}</p>
                <p><strong>Shield Recharge:</strong> ${currentShipDef.shieldRecharge || 'N/A'}</p>
                <p><strong>Speed:</strong> ${currentShipDef.baseMaxSpeed || 'N/A'} | 
                   <strong>Thrust:</strong> ${currentShipDef.baseThrust || 'N/A'} | 
                   <strong>Turn Rate:</strong> ${currentShipDef.baseTurnRate?.toFixed(5) || 'N/A'} rad/frame</p>
                <p><strong>Cargo Capacity:</strong> ${currentShipDef.cargoCapacity || 'N/A'} units</p>
                <p><strong>Armament:</strong> ${Array.isArray(currentShipDef.armament) ? currentShipDef.armament.join(', ') : 'N/A'}</p>
                <p><strong>Price:</strong> ${currentShipDef.price ? currentShipDef.price.toLocaleString() : 'N/A'} cr</p>
                <p><strong>AI Roles:</strong> ${Array.isArray(currentShipDef.aiRoles) ? currentShipDef.aiRoles.join(', ') : 'N/A'}</p>
                <p><strong>Tech Level:</strong> ${currentShipDef.techLevel || 'N/A'}</p>
                <p><strong>Cost Category:</strong> ${currentShipDef.costCategory || 'N/A'}</p>
                <p><strong>Typical Cargo:</strong> ${Array.isArray(currentShipDef.typicalCargo) ? currentShipDef.typicalCargo.join(', ') : 'N/A'}</p>
                <p><strong>Size Category:</strong> ${currentShipDef.sizeCategory || 'N/A'} | <strong>Size:</strong> ${currentShipDef.size || 'N/A'}</p>
            </div>`;
        } else {
            propertyDisplay = descriptionText;
        }
        descriptionDiv.html(propertyDisplay);
    }
    updateUIControls(); // Update button states
    updateColorPickersFromSelection(); // Reset/set color pickers
}

function isThargoidSelected() {
    return currentShipKey === 'Thargoid' && currentShipDef?.name === 'Thargoid Interceptor';
}

function isEditable() {
    return (currentShipKey === '--- New Blank ---') ||
        (currentShipKey && currentShipKey !== 'Select a Ship...' && currentShipDef && !isThargoidSelected());
}

function mousePressed() {
    // Ignore clicks outside canvas or if Thargoid is displayed
    if (mouseX < 0 || mouseX > width || mouseY < 0 || mouseY > height || isThargoidSelected()) { return; }

    dragOccurred = false; // Reset drag flag

    // Calculate interaction radius and mouse positions
    let actualDrawSize_s = 0;
    if (currentShipDef) { actualDrawSize_s = (currentShipDef.size || 1) * pixelsPerUnit; }
    else if (shapes.length > 0 && currentShipKey === '--- New Blank ---') { actualDrawSize_s = baseDisplaySize * (50 / maxDefinedShipSize); }
    let interaction_r = actualDrawSize_s > 0 ? actualDrawSize_s / 2 : baseDisplaySize / (maxDefinedShipSize * 2);
    let mx_rel = mouseX - width / 2; let my_rel = mouseY - height / 2;
    let mx_shape_rel = mx_rel / interaction_r; let my_shape_rel = my_rel / interaction_r;

    // Reset interaction flags
    draggingVertex = false; draggingShape = false;
    dragVertexInitialPositions = []; dragConstrainedAxis = null;

    // Get primary selected shape (first in array)
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;

    // --- 1. Handle Add Vertex Mode ---
    if (addingVertexMode && isEditable() && interaction_r > 0) {
        if (primaryShapeIndex !== -1 && shapes[primaryShapeIndex]) {
            let shape = shapes[primaryShapeIndex];
            if (!shape || !shape.vertexData) { console.error("Add Vertex Failed: Invalid shape"); return; }
            let closestEdgeInfo = findClosestEdgeRelative(shape, mx_shape_rel, my_shape_rel);
            let screenEdgeDistSq = closestEdgeInfo ? distSqToSegment(mx_rel, my_rel,
                shape.vertexData[closestEdgeInfo.index].x * interaction_r, shape.vertexData[closestEdgeInfo.index].y * interaction_r,
                shape.vertexData[(closestEdgeInfo.index + 1) % shape.vertexData.length].x * interaction_r, shape.vertexData[(closestEdgeInfo.index + 1) % shape.vertexData.length].y * interaction_r
            ) : Infinity;

            if (closestEdgeInfo && screenEdgeDistSq < edgeClickMinDist ** 2) {
                saveStateForUndo(); // Save state BEFORE adding vertex
                let v1 = shape.vertexData[closestEdgeInfo.index];
                let v2 = shape.vertexData[(closestEdgeInfo.index + 1) % shape.vertexData.length];
                if (typeof v1?.x !== 'number' || typeof v1?.y !== 'number' || typeof v2?.x !== 'number' || typeof v2?.y !== 'number') { console.error("Add Vertex Failed: Invalid edge points"); return; }
                let newVertex = { x: (v1.x + v2.x) / 2, y: (v1.y + v2.y) / 2 };
                shape.vertexData.splice(closestEdgeInfo.index + 1, 0, newVertex);
                selectedVertexIndices = []; draggingVertex = false;
            }
        }
        updateUIControls(); return; // Stop processing
    }

    // --- 2. Check for Vertex Handle Click (only on primary selected shape) ---
    let clickedVertexHandleIndex = -1;
    if (isEditable() && primaryShapeIndex !== -1 && shapes[primaryShapeIndex]?.vertexData && interaction_r > 0) {
        let selectedShape = shapes[primaryShapeIndex];
        for (let i = 0; i < selectedShape.vertexData.length; i++) {
            let v = selectedShape.vertexData[i];
            if (typeof v?.x === 'number' && typeof v?.y === 'number') {
                let screenX = v.x * interaction_r; let screenY = v.y * interaction_r;
                if (distSq(mx_rel, my_rel, screenX, screenY) < grabRadius ** 2) {
                    clickedVertexHandleIndex = i; break;
                }
            }
        }
    }

    // --- Action if Vertex Handle Clicked ---
    if (clickedVertexHandleIndex !== -1) {
        let indexInSelection = selectedVertexIndices.indexOf(clickedVertexHandleIndex);
        let currentlySelected = indexInSelection !== -1;

        if (keyIsDown(SHIFT)) { // Toggle vertex selection (No state change needing undo)
            if (currentlySelected) { selectedVertexIndices.splice(indexInSelection, 1); }
            else { selectedVertexIndices.push(clickedVertexHandleIndex); }
        } else { // Prepare for drag
            if (!currentlySelected) { selectedVertexIndices = [clickedVertexHandleIndex]; }
            saveStateForUndo(); // SAVE STATE BEFORE starting vertex drag
            draggingVertex = true; // Set flag AFTER saving
            dragVertexStartX = mx_rel; dragVertexStartY = my_rel;
            dragVertexInitialPositions = [];
            let shape = shapes[primaryShapeIndex];
            if (shape?.vertexData) {
                selectedVertexIndices.forEach(idx => {
                    if (shape.vertexData[idx]) { dragVertexInitialPositions.push({ index: idx, x: shape.vertexData[idx].x, y: shape.vertexData[idx].y }); }
                });
            }
            draggingShape = false;
        }
        updateUIControls(); return; // Interaction handled
    }
    draggingVertex = false; // Ensure flag is false if no handle click

    // --- 3. Check for Shape Click (Selection / Drag Initiation) ---
    let clickedShapeIndex = -1;
    // Iterate from END to START to check top visual layer first
    for (let i = shapes.length - 1; i >= 0; i--) { // Check top layer first (highest index)
        let currentShape = shapes[i];
        if (currentShape?.vertexData?.length >= 3 && isPointInPolygon(mx_shape_rel, my_shape_rel, currentShape.vertexData)) {
            clickedShapeIndex = i;
            break; // Found topmost hit
        }
    }

    // --- Action based on Shape Click ---
    if (clickedShapeIndex !== -1) { // Clicked inside *some* shape
        const isClickedShapeSelected = selectedShapeIndices.includes(clickedShapeIndex);

        if (keyIsDown(SHIFT) && isEditable()) {
            // Shift+Click: Toggle shape in selection
            if (isClickedShapeSelected) {
                // Remove from selection
                selectedShapeIndices = selectedShapeIndices.filter(idx => idx !== clickedShapeIndex);
            } else {
                // Add to selection
                selectedShapeIndices.push(clickedShapeIndex);
            }
            selectedVertexIndices = []; // Clear vertex selection when changing shape selection
            updateColorPickersFromSelection();
        } else if (isClickedShapeSelected && isEditable()) {
            // Regular click on already selected shape: Start drag of ALL selected shapes
            saveStateForUndo(); // SAVE STATE BEFORE starting shape drag
            draggingShape = true; // Set flag AFTER saving
            dragShapeStartX = mouseX; dragShapeStartY = mouseY;

            // Save initial positions of ALL vertices in ALL selected shapes
            dragVertexInitialPositions = [];
            selectedShapeIndices.forEach(shapeIdx => {
                let shape = shapes[shapeIdx];
                if (shape?.vertexData) {
                    shape.vertexData.forEach((vertex, vertIdx) => {
                        if (typeof vertex?.x === 'number' && typeof vertex?.y === 'number') {
                            dragVertexInitialPositions.push({ shapeIndex: shapeIdx, index: vertIdx, x: vertex.x, y: vertex.y });
                        }
                    });
                }
            });

            selectedVertexIndices = []; // Deselect vertices when dragging shapes
        } else if (!isClickedShapeSelected && isEditable()) {
            // Clicked different (unselected) shape: Select only that shape
            selectedShapeIndices = [clickedShapeIndex];
            selectedVertexIndices = [];
            draggingShape = false;
            updateColorPickersFromSelection();
        }
    } else { // Clicked outside any shape: Deselect all (No undo needed)
        if (selectedShapeIndices.length > 0) {
            selectedShapeIndices = [];
            selectedVertexIndices = [];
            updateColorPickersFromSelection();
        }
        draggingShape = false;
    }
    updateUIControls();
}

function mouseDragged() {
    // Ignore if Thargoid selected or not currently dragging anything
    if (isThargoidSelected() || (!draggingVertex && !draggingShape)) return;

    // Set flag if actual movement occurs beyond a small threshold
    if (!dragOccurred) {
        let moved = false;
        if (draggingVertex) { moved = distSq(mouseX - width / 2, mouseY - height / 2, dragVertexStartX, dragVertexStartY) > 4; }
        else if (draggingShape) { moved = distSq(mouseX, mouseY, dragShapeStartX, dragShapeStartY) > 4; }
        if (moved) dragOccurred = true;
    }

    // Recalculate interaction radius
    let actualDrawSize_s = 0;
    if (currentShipDef) { actualDrawSize_s = (currentShipDef.size || 1) * pixelsPerUnit; }
    else if (shapes.length > 0 && currentShipKey === '--- New Blank ---') { actualDrawSize_s = baseDisplaySize * (50 / maxDefinedShipSize); }
    let interaction_r = actualDrawSize_s > 0 ? actualDrawSize_s / 2 : baseDisplaySize / (maxDefinedShipSize * 2);

    // Get primary selected shape
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;

    // --- Handle Multi-Vertex Dragging (on primary shape only) ---
    if (draggingVertex && primaryShapeIndex !== -1 && shapes[primaryShapeIndex]?.vertexData && isEditable()) {
        let shape = shapes[primaryShapeIndex];
        let currentMxRel = mouseX - width / 2; let currentMyRel = mouseY - height / 2;
        let deltaScreenX = currentMxRel - dragVertexStartX; let deltaScreenY = currentMyRel - dragVertexStartY;

        // Axis constraint with Shift key
        if (keyIsDown(SHIFT)) {
            // Determine constraint axis on first significant movement
            if (dragConstrainedAxis === null && (Math.abs(deltaScreenX) > 2 || Math.abs(deltaScreenY) > 2)) {
                dragConstrainedAxis = Math.abs(deltaScreenX) > Math.abs(deltaScreenY) ? 'x' : 'y';
            }
            // Apply constraint
            if (dragConstrainedAxis === 'x') {
                deltaScreenY = 0;
            } else if (dragConstrainedAxis === 'y') {
                deltaScreenX = 0;
            }
        } else {
            dragConstrainedAxis = null; // Reset if Shift is released
        }

        // Convert screen delta to relative delta and apply
        let deltaRelX = deltaScreenX / interaction_r; let deltaRelY = deltaScreenY / interaction_r;
        dragVertexInitialPositions.forEach(initialPos => {
            if (shape.vertexData[initialPos.index]) {
                shape.vertexData[initialPos.index].x = initialPos.x + deltaRelX;
                shape.vertexData[initialPos.index].y = initialPos.y + deltaRelY;
            }
        });
    }
    // --- Handle Multi-Shape Dragging ---
    else if (draggingShape && selectedShapeIndices.length > 0 && isEditable()) {
        let totalDx = mouseX - dragShapeStartX;
        let totalDy = mouseY - dragShapeStartY;

        // Axis constraint with Shift key
        if (keyIsDown(SHIFT)) {
            // Determine constraint axis on first significant movement
            if (dragConstrainedAxis === null && (Math.abs(totalDx) > 2 || Math.abs(totalDy) > 2)) {
                dragConstrainedAxis = Math.abs(totalDx) > Math.abs(totalDy) ? 'x' : 'y';
            }
            // Apply constraint
            if (dragConstrainedAxis === 'x') {
                totalDy = 0;
            } else if (dragConstrainedAxis === 'y') {
                totalDx = 0;
            }
        } else {
            dragConstrainedAxis = null; // Reset if Shift is released
        }

        // Calculate the current drawing radius
        let actualDrawSize_s_local = currentShipDef ?
            (currentShipDef.size || 1) * pixelsPerUnit :
            baseDisplaySize * (50 / maxDefinedShipSize);
        let drawing_r = actualDrawSize_s_local > 0 ?
            actualDrawSize_s_local / 2 :
            baseDisplaySize / (maxDefinedShipSize * 2);

        // Convert screen delta to relative delta
        let deltaRelX = totalDx / drawing_r;
        let deltaRelY = totalDy / drawing_r;

        // Apply the delta to all vertices from their saved initial positions
        // Each position has shapeIndex and vertexIndex stored
        dragVertexInitialPositions.forEach(initialPos => {
            const shapeIdx = initialPos.shapeIndex !== undefined ? initialPos.shapeIndex : primaryShapeIndex;
            const shape = shapes[shapeIdx];
            if (shape?.vertexData?.[initialPos.index]) {
                shape.vertexData[initialPos.index].x = initialPos.x + deltaRelX;
                shape.vertexData[initialPos.index].y = initialPos.y + deltaRelY;
            }
        });
    }
}

function mouseReleased() {
    // NOTE: State saving for drags is now done in mousePressed.
    // This function just resets flags.

    if (draggingVertex) draggingVertex = false;
    if (draggingShape) draggingShape = false;
    dragVertexInitialPositions = [];
    dragConstrainedAxis = null;
    dragOccurred = false; // Reset drag occurred flag
}

function keyPressed() {
    if (isThargoidSelected()) return; // Ignore keys if Thargoid selected

    // First check for Cmd+Z (as first priority)
    if (key === 'z' && (keyCode === 91 || keyCode === 93)) {
        undoLastChange();
        return false; // Prevent default browser behavior
    }

    // === NEW KEYBOARD SHORTCUTS ===

    // Zoom In: Period (.)
    if (key === '.') {
        zoomIn();
        return false;
    }

    // Zoom Out: Comma (,)
    if (key === ',') {
        zoomOut();
        return false;
    }

    // Add New Shape: A
    if (key === 'a' && isEditable()) {
        addNewShape();
        return false;
    }

    // Toggle Add Vertex Mode: V
    if (key === 'v' && selectedShapeIndices.length > 0 && isEditable()) {
        toggleAddVertexMode();
        return false;
    }

    // Straighten Symmetry: S
    if (key === 's' && selectedShapeIndices.length > 0 && isEditable()) {
        handleStraightenClick();
        return false;
    }

    // Export: E
    if (key === 'e' && (shapes.length > 0 || isThargoidSelected())) {
        exportDrawFunctionCode();
        return false;
    }

    // Arrow Keys: Move Selected Vertices or Shape(s)
    if (selectedShapeIndices.length > 0 && isEditable()) {
        const moveIncrement = 0.02; // Small movement increment in relative coordinates
        let dx = 0, dy = 0;

        if (keyCode === LEFT_ARROW) {
            dx = -moveIncrement;
        } else if (keyCode === RIGHT_ARROW) {
            dx = moveIncrement;
        } else if (keyCode === UP_ARROW) {
            dy = -moveIncrement;
        } else if (keyCode === DOWN_ARROW) {
            dy = moveIncrement;
        }

        // If an arrow key was pressed
        if (dx !== 0 || dy !== 0) {
            saveStateForUndo(); // Save state before moving

            // Get primary selected shape
            const primaryShapeIdx = selectedShapeIndices[0];

            // If vertices are selected, move only those vertices
            if (selectedVertexIndices.length > 0 && primaryShapeIdx !== -1) {
                const shape = shapes[primaryShapeIdx];
                if (shape && Array.isArray(shape.vertexData)) {
                    selectedVertexIndices.forEach(vIdx => {
                        const v = shape.vertexData[vIdx];
                        if (v && typeof v.x === 'number' && typeof v.y === 'number') {
                            v.x += dx;
                            v.y += dy;
                        }
                    });
                }
            }
            // Otherwise, move entire selected shape(s)
            else {
                selectedShapeIndices.forEach(shapeIdx => {
                    const shape = shapes[shapeIdx];
                    if (shape && Array.isArray(shape.vertexData)) {
                        // Move all vertices
                        shape.vertexData.forEach(v => {
                            if (typeof v?.x === 'number' && typeof v?.y === 'number') {
                                v.x += dx;
                                v.y += dy;
                            }
                        });

                        // Move holes if present
                        if (Array.isArray(shape.holes)) {
                            shape.holes.forEach(hole => {
                                hole.forEach(v => {
                                    if (typeof v?.x === 'number' && typeof v?.y === 'number') {
                                        v.x += dx;
                                        v.y += dy;
                                    }
                                });
                            });
                        }
                    }
                });
            }

            return false; // Prevent default arrow key behavior
        }
    }

    // Delete Selected Vertices (DELETE or BACKSPACE without Shift)
    const primaryShapeIdx = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    if ((keyCode === DELETE || keyCode === BACKSPACE) && !keyIsDown(SHIFT) && primaryShapeIdx !== -1 && selectedVertexIndices.length > 0 && isEditable()) {
        if (shapes[primaryShapeIdx]?.vertexData) {
            let shape = shapes[primaryShapeIdx];
            let remainingVertices = shape.vertexData.length - selectedVertexIndices.length;
            if (remainingVertices >= 3) { // Check if deletion is valid
                saveStateForUndo(); // Save state BEFORE deleting vertices
                shape.vertexData = shape.vertexData.filter((_, index) => !selectedVertexIndices.includes(index));
                selectedVertexIndices = []; draggingVertex = false; // Reset selection/interaction
            } else { console.warn(`Cannot delete vertices - must leave at least 3.`); }
        }
    }
    // Delete Selected Shape Layers (SHIFT + DELETE or BACKSPACE)
    else if ((keyCode === DELETE || keyCode === BACKSPACE) && keyIsDown(SHIFT) && selectedShapeIndices.length > 0 && isEditable()) {
        saveStateForUndo(); // Save state BEFORE deleting shape layers
        // Remove selected shapes from highest index to lowest to preserve indices
        const sortedIndices = [...selectedShapeIndices].sort((a, b) => b - a);
        sortedIndices.forEach(idx => {
            if (idx >= 0 && idx < shapes.length) {
                shapes.splice(idx, 1);
            }
        });
        selectedShapeIndices = []; selectedVertexIndices = []; // Reset selection
        draggingVertex = false; draggingShape = false;
        updateUIControls(); updateColorPickersFromSelection(); // Update UI
    }
    // Add Ctrl+Z / Cmd+Z for Undo
    else if (key === 'z' && (keyIsDown(CONTROL) || keyCode === 91 || keyCode === 93)) {
        undoLastChange();
    }
}

function keyReleased() {
    // Check for Command+Z specifically
    if (key === 'z' && keyIsDown(91)) {
        undoLastChange();
        return false; // Prevent default browser behavior
    }
    return true;
}

// --- UI Update Functions ---
function updateUIControls() {
    let editable = isEditable();
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    let shapeSelected = primaryShapeIndex !== -1 && editable && shapes[primaryShapeIndex];
    let hasShapes = shapes.length > 0 && editable; // Check if there are any editable shapes
    let multipleSelected = selectedShapeIndices.length >= 2; // For combine button

    // Enable/disable buttons based on state
    if (addShapeButton?.elt) addShapeButton.elt.disabled = !editable && currentShipKey !== '--- New Blank ---';
    if (exportButton?.elt) exportButton.elt.disabled = shapes.length === 0 && !isThargoidSelected();
    if (straightenButton?.elt) straightenButton.elt.disabled = !shapeSelected;
    if (centerDesignButton?.elt) centerDesignButton.elt.disabled = !hasShapes;
    if (mirrorVButton?.elt) mirrorVButton.elt.disabled = !shapeSelected;
    if (mirrorHButton?.elt) mirrorHButton.elt.disabled = !shapeSelected;
    if (rotatePlus90Button?.elt) rotatePlus90Button.elt.disabled = !shapeSelected;
    if (rotateMinus90Button?.elt) rotateMinus90Button.elt.disabled = !shapeSelected;
    if (addCircleButton?.elt) addCircleButton.elt.disabled = !editable;
    if (addHexButton?.elt) addHexButton.elt.disabled = !editable;
    if (addStarButton?.elt) addStarButton.elt.disabled = !editable;
    if (addSkullButton?.elt) addSkullButton.elt.disabled = !editable;
    if (undoButton?.elt) undoButton.elt.disabled = historyStack.length === 0;
    if (combineShapesButton?.elt) combineShapesButton.elt.disabled = !multipleSelected || !editable;

    // Disable editing tools if no editable shape is selected
    const shouldBeDisabled = !shapeSelected;
    if (addVertexButton?.elt) addVertexButton.elt.disabled = shouldBeDisabled;
    if (fillColorPicker?.elt) fillColorPicker.elt.disabled = shouldBeDisabled;

    // Handle 'Add Vertex Mode' button state
    if (shouldBeDisabled && addingVertexMode) addingVertexMode = false; // Turn off mode if disabled
    if (addVertexButton) {
        if (addingVertexMode && shapeSelected) { addVertexButton.addClass('active'); }
        else { addVertexButton.removeClass('active'); }
    }
    if (addingVertexMode && !shapeSelected) addingVertexMode = false; // Ensure mode variable matches
}

function updateColorPickersFromSelection() {
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    if (primaryShapeIndex !== -1 && primaryShapeIndex < shapes.length && shapes[primaryShapeIndex]) {
        let shape = shapes[primaryShapeIndex];
        // Validate shape data before updating pickers
        if (shape && Array.isArray(shape.fillColor) && shape.fillColor.length === 3 && !shape.fillColor.some(isNaN)) {
            if (fillColorPicker) fillColorPicker.value(rgbToHex(shape.fillColor));
        } else {
            console.warn("Selected shape has invalid color data. Resetting picker.", shape);
            // Reset picker to default if data is bad
            if (fillColorPicker) fillColorPicker.value('#cccccc');
        }
    } else {
        // Reset picker to default value if nothing is selected
        if (fillColorPicker) fillColorPicker.value('#cccccc');
    }
}

function updateSelectedShapeFill() {
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    if (primaryShapeIndex !== -1 && shapes[primaryShapeIndex] && isEditable()) {
        saveStateForUndo(); // Save state BEFORE change
        let col = color(fillColorPicker.value());
        // Apply fill color to ALL selected shapes
        selectedShapeIndices.forEach(idx => {
            if (shapes[idx]) {
                shapes[idx].fillColor = [red(col), green(col), blue(col)];
            }
        });
    }
}
/**
 * Computes the convex hull of a set of points using Graham scan algorithm.
 * @param {Array<{x:number, y:number}>} points - Array of points
 * @returns {Array<{x:number, y:number}>} - Points forming the convex hull in counter-clockwise order
 */
function computeConvexHull(points) {
    if (points.length < 3) return points.slice();

    // Find the point with lowest y (and leftmost if tied)
    let start = 0;
    for (let i = 1; i < points.length; i++) {
        if (points[i].y < points[start].y ||
            (points[i].y === points[start].y && points[i].x < points[start].x)) {
            start = i;
        }
    }

    const pivot = points[start];

    // Sort points by polar angle with respect to pivot
    const sorted = points.slice().sort((a, b) => {
        if (a === pivot) return -1;
        if (b === pivot) return 1;

        const angleA = Math.atan2(a.y - pivot.y, a.x - pivot.x);
        const angleB = Math.atan2(b.y - pivot.y, b.x - pivot.x);

        if (Math.abs(angleA - angleB) < 1e-10) {
            // Same angle, sort by distance (closer first)
            const distA = (a.x - pivot.x) ** 2 + (a.y - pivot.y) ** 2;
            const distB = (b.x - pivot.x) ** 2 + (b.y - pivot.y) ** 2;
            return distA - distB;
        }
        return angleA - angleB;
    });

    // Cross product to determine turn direction
    const cross = (o, a, b) => (a.x - o.x) * (b.y - o.y) - (a.y - o.y) * (b.x - o.x);

    const hull = [];
    for (const p of sorted) {
        // Remove points that make clockwise turns
        while (hull.length >= 2 && cross(hull[hull.length - 2], hull[hull.length - 1], p) <= 0) {
            hull.pop();
        }
        hull.push(p);
    }

    return hull;
}

/**
 * Checks if two line segments intersect and returns the intersection point.
 * @param {number} x1, y1, x2, y2 - First segment endpoints
 * @param {number} x3, y3, x4, y4 - Second segment endpoints
 * @returns {{x: number, y: number}|null} - Intersection point or null
 */
function getLineIntersection(x1, y1, x2, y2, x3, y3, x4, y4) {
    const denom = (x1 - x2) * (y3 - y4) - (y1 - y2) * (x3 - x4);
    if (Math.abs(denom) < 1e-10) return null; // Parallel or coincident

    const t = ((x1 - x3) * (y3 - y4) - (y1 - y3) * (x3 - x4)) / denom;
    const u = -((x1 - x2) * (y1 - y3) - (y1 - y2) * (x1 - x3)) / denom;

    // Check if intersection is within both segments (exclusive of endpoints to avoid duplicates)
    if (t > 0.001 && t < 0.999 && u > 0.001 && u < 0.999) {
        return {
            x: x1 + t * (x2 - x1),
            y: y1 + t * (y2 - y1)
        };
    }
    return null;
}

/**
 * Computes polygon union by tracing the outer boundary.
 * This creates a clean combined shape without internal edges while preserving concave details.
 * @param {Array<Array<{x:number, y:number}>>} polygons - Array of polygon vertex arrays
 * @returns {Array<{x:number, y:number}>} - Combined outer boundary vertices
 */
function computePolygonUnion(polygons) {
    // Collect all points from all polygons
    const allPoints = [];
    for (const poly of polygons) {
        if (poly && poly.length >= 3) {
            for (const p of poly) {
                allPoints.push({ x: p.x, y: p.y, polyIdx: polygons.indexOf(poly) });
            }
        }
    }

    if (allPoints.length < 3) return allPoints.map(p => ({ x: p.x, y: p.y }));

    // Find all intersection points between polygon edges and insert them
    const edgesWithIntersections = [];

    // Build edge list with intersection points inserted
    for (let i = 0; i < polygons.length; i++) {
        const poly = polygons[i];
        if (!poly || poly.length < 3) continue;

        for (let e = 0; e < poly.length; e++) {
            const p1 = poly[e];
            const p2 = poly[(e + 1) % poly.length];

            // Collect all intersections on this edge
            const edgeIntersections = [];

            for (let j = 0; j < polygons.length; j++) {
                if (i === j) continue;
                const otherPoly = polygons[j];
                if (!otherPoly || otherPoly.length < 3) continue;

                for (let f = 0; f < otherPoly.length; f++) {
                    const q1 = otherPoly[f];
                    const q2 = otherPoly[(f + 1) % otherPoly.length];

                    const intersection = getLineIntersection(
                        p1.x, p1.y, p2.x, p2.y,
                        q1.x, q1.y, q2.x, q2.y
                    );

                    if (intersection) {
                        // Calculate t parameter along edge
                        const dx = p2.x - p1.x;
                        const dy = p2.y - p1.y;
                        const t = Math.abs(dx) > Math.abs(dy)
                            ? (intersection.x - p1.x) / dx
                            : (intersection.y - p1.y) / dy;
                        edgeIntersections.push({ ...intersection, t });
                    }
                }
            }

            // Sort intersections by t parameter
            edgeIntersections.sort((a, b) => a.t - b.t);

            // Build segments along this edge
            let prev = { x: p1.x, y: p1.y };
            for (const inter of edgeIntersections) {
                edgesWithIntersections.push({
                    from: prev,
                    to: { x: inter.x, y: inter.y },
                    polyIdx: i
                });
                prev = { x: inter.x, y: inter.y };
            }
            edgesWithIntersections.push({
                from: prev,
                to: { x: p2.x, y: p2.y },
                polyIdx: i
            });
        }
    }

    // Filter segments: keep only those whose midpoint is not strictly inside another polygon
    const outerSegments = edgesWithIntersections.filter(seg => {
        const midX = (seg.from.x + seg.to.x) / 2;
        const midY = (seg.from.y + seg.to.y) / 2;

        for (let i = 0; i < polygons.length; i++) {
            if (i === seg.polyIdx) continue; // Don't check against own polygon
            const poly = polygons[i];
            if (!poly || poly.length < 3) continue;
            if (isPointStrictlyInside(midX, midY, poly)) {
                return false; // Midpoint is inside another polygon, exclude
            }
        }
        return true;
    });

    if (outerSegments.length < 3) {
        // Fall back to collecting outer boundary points and ordering them
        return orderBoundaryPoints(polygons, allPoints);
    }

    // Collect unique vertices from outer segments
    const uniquePoints = [];
    const seen = new Set();

    for (const seg of outerSegments) {
        const key1 = `${seg.from.x.toFixed(6)},${seg.from.y.toFixed(6)}`;
        const key2 = `${seg.to.x.toFixed(6)},${seg.to.y.toFixed(6)}`;

        if (!seen.has(key1)) {
            seen.add(key1);
            uniquePoints.push({ x: seg.from.x, y: seg.from.y });
        }
        if (!seen.has(key2)) {
            seen.add(key2);
            uniquePoints.push({ x: seg.to.x, y: seg.to.y });
        }
    }

    if (uniquePoints.length < 3) {
        return orderBoundaryPoints(polygons, allPoints);
    }

    // Order points by angle around centroid to form a clean perimeter
    return orderPointsByAngle(uniquePoints);
}

/**
 * Orders boundary points by angle around their centroid.
 * @param {Array<{x:number, y:number}>} points - Points to order
 * @returns {Array<{x:number, y:number}>} - Ordered points
 */
function orderPointsByAngle(points) {
    if (points.length < 3) return points;

    // Calculate centroid
    let cx = 0, cy = 0;
    for (const p of points) {
        cx += p.x;
        cy += p.y;
    }
    cx /= points.length;
    cy /= points.length;

    // Sort by angle around centroid
    const sorted = points.slice().sort((a, b) => {
        const angleA = Math.atan2(a.y - cy, a.x - cx);
        const angleB = Math.atan2(b.y - cy, b.x - cx);
        return angleA - angleB;
    });

    return sorted;
}

/**
 * Fallback: orders points that are on the outer boundary of the union.
 * @param {Array<Array<{x:number, y:number}>>} polygons - Original polygons
 * @param {Array<{x:number, y:number}>} allPoints - All collected points
 * @returns {Array<{x:number, y:number}>} - Ordered boundary points
 */
function orderBoundaryPoints(polygons, allPoints) {
    // Filter to only points not strictly inside any other polygon
    const outerPoints = allPoints.filter(point => {
        for (const poly of polygons) {
            if (!poly || poly.length < 3) continue;
            if (isPointStrictlyInside(point.x, point.y, poly)) {
                return false;
            }
        }
        return true;
    });

    if (outerPoints.length < 3) {
        // Ultimate fallback: convex hull
        return computeConvexHull(allPoints.map(p => ({ x: p.x, y: p.y })));
    }

    // Order by angle around centroid
    return orderPointsByAngle(outerPoints.map(p => ({ x: p.x, y: p.y })));
}

/**
 * Checks if a point is strictly inside a polygon (not on the edge).
 * Uses ray casting with a margin to exclude edge points.
 */
function isPointStrictlyInside(px, py, polygon) {
    if (!polygon || polygon.length < 3) return false;

    // First check if point is very close to any edge - if so, not strictly inside
    const edgeThreshold = 0.005;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const vi = polygon[i], vj = polygon[j];
        if (typeof vi?.x !== 'number' || typeof vj?.x !== 'number') continue;

        const distSq = distSqToSegmentLocal(px, py, vi.x, vi.y, vj.x, vj.y);
        if (distSq < edgeThreshold * edgeThreshold) {
            return false; // Point is on or very close to edge
        }
    }

    // Standard ray casting
    let isInside = false;
    for (let i = 0, j = polygon.length - 1; i < polygon.length; j = i++) {
        const vi = polygon[i], vj = polygon[j];
        if (typeof vi?.x !== 'number' || typeof vj?.x !== 'number') continue;

        if (((vi.y > py) !== (vj.y > py)) &&
            (px < (vj.x - vi.x) * (py - vi.y) / (vj.y - vi.y) + vi.x)) {
            isInside = !isInside;
        }
    }
    return isInside;
}

/**
 * Calculates squared distance from point to line segment (local helper).
 */
function distSqToSegmentLocal(px, py, x1, y1, x2, y2) {
    const dx = x2 - x1, dy = y2 - y1;
    const lenSq = dx * dx + dy * dy;
    if (lenSq === 0) return (px - x1) ** 2 + (py - y1) ** 2;

    let t = ((px - x1) * dx + (py - y1) * dy) / lenSq;
    t = Math.max(0, Math.min(1, t));

    const projX = x1 + t * dx;
    const projY = y1 + t * dy;
    return (px - projX) ** 2 + (py - projY) ** 2;
}

/**
 * Combines multiple selected shapes into a single layer.
 * Computes the union (outer boundary) of all selected shapes,
 * removing internal vertices and extraneous edges.
 * The lowest-indexed selected shape's color is used.
 */
function combineSelectedShapes() {
    if (selectedShapeIndices.length < 2 || !isEditable()) {
        console.warn('Combine Shapes: Need at least 2 shapes selected.');
        return;
    }

    saveStateForUndo(); // Save state BEFORE combining

    // Sort indices to process in order (lowest first becomes the base)
    const sortedIndices = [...selectedShapeIndices].sort((a, b) => a - b);
    const baseIndex = sortedIndices[0];
    const baseShape = shapes[baseIndex];

    if (!baseShape || !Array.isArray(baseShape.vertexData)) {
        console.error('Combine Shapes: Base shape is invalid.');
        return;
    }

    // Collect all polygon vertex arrays
    const polygons = [];
    sortedIndices.forEach(idx => {
        const shape = shapes[idx];
        if (shape && Array.isArray(shape.vertexData) && shape.vertexData.length >= 3) {
            polygons.push(shape.vertexData);
        }
    });

    if (polygons.length < 2) {
        console.error('Combine Shapes: Need at least 2 valid polygons.');
        return;
    }

    // Compute the union of all polygons
    const combinedVertices = computePolygonUnion(polygons);

    if (combinedVertices.length < 3) {
        console.error('Combine Shapes: Not enough vertices to create combined shape.');
        return;
    }

    // Update base shape with combined vertices
    baseShape.vertexData = combinedVertices;
    baseShape.holes = []; // Clear any holes

    // Remove the merged shapes from highest index to lowest to preserve indices
    const shapesToRemove = sortedIndices.slice(1);
    for (let i = shapesToRemove.length - 1; i >= 0; i--) {
        shapes.splice(shapesToRemove[i], 1);
    }

    selectedShapeIndices = [baseIndex];
    selectedVertexIndices = [];

    console.log(`Combine Shapes: Merged ${sortedIndices.length} shapes into ${combinedVertices.length} vertices (clean union).`);
    updateUIControls();
    updateColorPickersFromSelection();
}

// --- Action Functions ---
function addNewShape() {
    if (!isEditable() && currentShipKey !== '--- New Blank ---') return;
    saveStateForUndo(); // Save state BEFORE adding
    let defaultShape = {
        vertexData: [{ x: -0.2, y: 0.2 }, { x: 0.2, y: 0.2 }, { x: 0, y: -0.2 }],
        fillColor: [150, 150, 180]
    };
    shapes.push(defaultShape); // Add to top (now the end of the array)
    selectedShapeIndices = [shapes.length - 1]; // Select newly added shape
    selectedVertexIndices = [];
    if (currentShipKey === null || currentShipKey === 'Select a Ship...') {
        currentShipKey = '--- New Blank ---'; currentShipDef = null;
    }
    updateUIControls(); updateColorPickersFromSelection();
}

function addCircleShape() {
    if (!isEditable()) return;
    saveStateForUndo();
    const segments = 24; // approximates a circle
    const radius = 0.22;
    const verts = [];
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        verts.push({ x: Math.cos(theta) * radius, y: Math.sin(theta) * radius });
    }
    const shape = { vertexData: verts, fillColor: [150, 150, 180] };
    shapes.push(shape);
    selectedShapeIndices = [shapes.length - 1];
    selectedVertexIndices = [];
    if (currentShipKey === null || currentShipKey === 'Select a Ship...') { currentShipKey = '--- New Blank ---'; currentShipDef = null; }
    updateUIControls(); updateColorPickersFromSelection();
}

function addSquareShape() {
    if (!isEditable()) return;
    saveStateForUndo();
    const size = 0.22; // half-width/height
    const verts = [
        { x: -size, y: -size },
        { x: size, y: -size },
        { x: size, y: size },
        { x: -size, y: size }
    ];
    const shape = { vertexData: verts, fillColor: [150, 150, 180] };
    shapes.push(shape);
    selectedShapeIndices = [shapes.length - 1];
    selectedVertexIndices = [];
    if (currentShipKey === null || currentShipKey === 'Select a Ship...') { currentShipKey = '--- New Blank ---'; currentShipDef = null; }
    updateUIControls(); updateColorPickersFromSelection();
}

function addHexagonShape() {
    if (!isEditable()) return;
    saveStateForUndo();
    const segments = 6;
    const radius = 0.22;
    const verts = [];
    for (let i = 0; i < segments; i++) {
        const theta = (i / segments) * Math.PI * 2;
        verts.push({ x: Math.cos(theta) * radius, y: Math.sin(theta) * radius });
    }
    const shape = { vertexData: verts, fillColor: [150, 150, 180] };
    shapes.push(shape);
    selectedShapeIndices = [shapes.length - 1];
    selectedVertexIndices = [];
    if (currentShipKey === null || currentShipKey === 'Select a Ship...') { currentShipKey = '--- New Blank ---'; currentShipDef = null; }
    updateUIControls(); updateColorPickersFromSelection();
}

function addStarShape() {
    if (!isEditable()) return;
    saveStateForUndo();
    const points = 5; // 5-point star
    const outer = 0.24;
    const inner = 0.10;
    const verts = [];
    const total = points * 2;
    for (let i = 0; i < total; i++) {
        const theta = i * Math.PI / points; // step = 180/points degrees in radians
        const r = (i % 2 === 0) ? outer : inner;
        verts.push({ x: Math.cos(theta) * r, y: Math.sin(theta) * r });
    }
    const shape = { vertexData: verts, fillColor: [220, 200, 80] };
    shapes.push(shape);
    selectedShapeIndices = [shapes.length - 1];
    selectedVertexIndices = [];
    if (currentShipKey === null || currentShipKey === 'Select a Ship...') { currentShipKey = '--- New Blank ---'; currentShipDef = null; }
    updateUIControls(); updateColorPickersFromSelection();
}

function addShieldShape() {
    if (!isEditable()) return;
    saveStateForUndo();

    // Simple shield shape
    const shield = [
        { x: -0.20, y: -0.25 },  // top-left
        { x: 0.20, y: -0.25 },   // top-right
        { x: 0.22, y: 0.00 },    // right middle
        { x: 0.12, y: 0.20 },    // right bottom
        { x: 0.00, y: 0.28 },    // bottom point
        { x: -0.12, y: 0.20 },   // left bottom
        { x: -0.22, y: 0.00 },   // left middle
    ];

    shapes.push({ vertexData: shield, fillColor: [100, 120, 180] });
    selectedShapeIndices = [shapes.length - 1];
    selectedVertexIndices = [];
    if (currentShipKey === null || currentShipKey === 'Select a Ship...') {
        currentShipKey = '--- New Blank ---';
        currentShipDef = null;
    }
    updateUIControls();
    updateColorPickersFromSelection();
}

function addSkullShape() {
    if (!isEditable()) return;
    saveStateForUndo();
    const startIndex = shapes.length;

    // ANGULAR SKULL AND CROSSBONES LOGO
    // Multi-layer design: bones -> skull -> jaw -> eyes (black) -> nose (black)

    // === LAYER 1 & 2: CROSSED BONES (background) ===
    // Bone 1: Diagonal from bottom-left to top-right
    const bone1 = [
        { x: -0.35, y: 0.25 },   // bottom-left end (wider)
        { x: -0.30, y: 0.20 },   // inner bottom-left
        { x: 0.30, y: -0.20 },   // inner top-right
        { x: 0.35, y: -0.25 },   // top-right end (wider)
        { x: 0.30, y: -0.28 },   // top-right narrow point
        { x: -0.30, y: 0.28 },   // bottom-left narrow point
    ];

    // Bone 2: Diagonal from bottom-right to top-left
    const bone2 = [
        { x: 0.35, y: 0.25 },    // bottom-right end (wider)
        { x: 0.30, y: 0.20 },    // inner bottom-right
        { x: -0.30, y: -0.20 },  // inner top-left
        { x: -0.35, y: -0.25 },  // top-left end (wider)
        { x: -0.30, y: -0.28 },  // top-left narrow point
        { x: 0.30, y: 0.28 },    // bottom-right narrow point
    ];

    // === LAYER 3: MAIN SKULL OUTLINE (angular pentagon-like head) ===
    const skullOutline = [
        { x: -0.20, y: -0.25 },  // top-left corner
        { x: 0.20, y: -0.25 },   // top-right corner
        { x: 0.25, y: -0.05 },   // right temple
        { x: 0.20, y: 0.10 },    // right cheek
        { x: 0.10, y: 0.15 },    // right jaw
        { x: -0.10, y: 0.15 },   // left jaw
        { x: -0.20, y: 0.10 },   // left cheek
        { x: -0.25, y: -0.05 },  // left temple
    ];

    // === LAYER 4: JAW WITH ANGULAR TEETH (Rotated 180° and moved lower) ===
    const jaw = [
        { x: 0.15, y: 0.22 },    // left jaw connection (rotated)
        { x: 0.12, y: 0.17 },    // tooth 1 left (rotated)
        { x: 0.08, y: 0.19 },    // tooth 1 valley (rotated)
        { x: 0.04, y: 0.17 },    // tooth 2 left (rotated)
        { x: 0.00, y: 0.19 },    // tooth 2 valley (center, rotated)
        { x: -0.04, y: 0.17 },   // tooth 3 right (rotated)
        { x: -0.08, y: 0.19 },   // tooth 3 valley (rotated)
        { x: -0.12, y: 0.17 },   // tooth 4 right (rotated)
        { x: -0.15, y: 0.22 },   // right jaw connection (rotated)
        { x: -0.08, y: 0.25 },   // inner jaw right (rotated)
        { x: 0.08, y: 0.25 },    // inner jaw left (rotated)
    ];

    // === LAYER 5 & 6: EYE SOCKETS (black triangles) ===
    // Left eye - triangular socket pointing down
    const leftEye = [
        { x: -0.14, y: -0.10 },  // top-left
        { x: -0.08, y: -0.10 },  // top-right
        { x: -0.11, y: 0.00 },   // bottom point
    ];

    // Right eye - triangular socket pointing down
    const rightEye = [
        { x: 0.08, y: -0.10 },   // top-left
        { x: 0.14, y: -0.10 },   // top-right
        { x: 0.11, y: 0.00 },    // bottom point
    ];

    // === LAYER 7: NOSE HOLE (inverted black triangle) ===
    const nose = [
        { x: -0.04, y: 0.04 },   // top-left
        { x: 0.04, y: 0.04 },    // top-right
        { x: 0.00, y: 0.10 },    // bottom point (inverted)
    ];

    // Add all layers to shapes array
    shapes.push({ vertexData: bone1, fillColor: [180, 180, 180] });       // Bone 1 (gray)
    shapes.push({ vertexData: bone2, fillColor: [180, 180, 180] });       // Bone 2 (gray)
    shapes.push({ vertexData: skullOutline, fillColor: [230, 230, 230] }); // Skull (light gray/white)
    shapes.push({ vertexData: jaw, fillColor: [230, 230, 230] });         // Jaw (same as skull)
    shapes.push({ vertexData: leftEye, fillColor: [0, 0, 0] });           // Left eye (black)
    shapes.push({ vertexData: rightEye, fillColor: [0, 0, 0] });          // Right eye (black)
    shapes.push({ vertexData: nose, fillColor: [0, 0, 0] });              // Nose (black)

    // Select all skull layers for easy manipulation
    selectedShapeIndices = [
        startIndex,     // bone 1
        startIndex + 1, // bone 2
        startIndex + 2, // skull
        startIndex + 3, // jaw
        startIndex + 4, // left eye
        startIndex + 5, // right eye
        startIndex + 6  // nose
    ];
    selectedVertexIndices = [];
    if (currentShipKey === null || currentShipKey === 'Select a Ship...') {
        currentShipKey = '--- New Blank ---';
        currentShipDef = null;
    }
    updateUIControls();
    updateColorPickersFromSelection();
}

function toggleAddVertexMode() {
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    if (primaryShapeIndex !== -1 && isEditable() && shapes[primaryShapeIndex]) {
        addingVertexMode = !addingVertexMode;
        if (addingVertexMode) { // Reset interaction state when entering mode
            draggingVertex = false; selectedVertexIndices = []; draggingShape = false;
        }
        updateUIControls(); // Update button style
    } else { // Ensure mode is off if conditions not met
        if (addingVertexMode) { addingVertexMode = false; updateUIControls(); }
    }
}

function handleStraightenClick() {
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    if (primaryShapeIndex !== -1 && isEditable() && shapes[primaryShapeIndex]) {
        saveStateForUndo(); // Save state BEFORE modifying vertices
        straightenMirroredVertices(shapes[primaryShapeIndex], straightenThreshold);
    }
}

function straightenMirroredVertices(shape, threshold) {
    // Attempts to align vertices that appear mirrored across X or Y axes
    if (!shape?.vertexData || shape.vertexData.length < 2) { return; }
    let vertices = shape.vertexData; let numVertices = vertices.length;
    let processed = new Set(); let adjustmentsMade = 0;

    // 1. Snap points close to axes
    for (let i = 0; i < numVertices; i++) {
        let v = vertices[i]; let snapped = false;
        if (abs(v.x) < threshold / 2 && v.x !== 0) { v.x = 0; snapped = true; }
        if (abs(v.y) < threshold / 2 && v.y !== 0) { v.y = 0; snapped = true; }
        if (snapped) { adjustmentsMade++; }
    }

    // 2. Find and adjust mirrored pairs
    for (let i = 0; i < numVertices; i++) {
        if (processed.has(i)) continue;
        let v_i = vertices[i];
        for (let j = i + 1; j < numVertices; j++) {
            if (processed.has(j)) continue;
            let v_j = vertices[j];
            // Check X-mirror (x1≈x2, y1≈-y2), avoiding both near y=0
            if ((abs(v_i.y) > threshold / 4 || abs(v_j.y) > threshold / 4) && abs(v_i.x - v_j.x) < threshold && abs(v_i.y + v_j.y) < threshold) {
                let newX = (v_i.x + v_j.x) / 2; let newAbsY = (abs(v_i.y) + abs(v_j.y)) / 2;
                let sign_i = Math.sign(v_i.y) || (v_j.y === 0 ? 1 : -Math.sign(v_j.y)) || 1;
                v_i.x = newX; v_j.x = newX; v_i.y = newAbsY * sign_i; v_j.y = -newAbsY * sign_i;
                processed.add(i); processed.add(j); adjustmentsMade++; break;
            }
            // Check Y-mirror (x1≈-x2, y1≈y2), avoiding both near x=0
            else if ((abs(v_i.x) > threshold / 4 || abs(v_j.x) > threshold / 4) && abs(v_i.x + v_j.x) < threshold && abs(v_i.y - v_j.y) < threshold) {
                let newY = (v_i.y + v_j.y) / 2; let newAbsX = (abs(v_i.x) + abs(v_j.x)) / 2;
                let sign_i = Math.sign(v_i.x) || (v_j.x === 0 ? 1 : -Math.sign(v_j.x)) || 1;
                v_i.y = newY; v_j.y = newY; v_i.x = newAbsX * sign_i; v_j.x = -newAbsX * sign_i;
                processed.add(i); processed.add(j); adjustmentsMade++; break;
            }
        }
    }
    if (adjustmentsMade > 0) console.log(`Straighten Symmetry: Made ${adjustmentsMade} adjustments.`);
    else console.log("Straighten Symmetry: No adjustments needed.");
}

/**
 * Calculates the geometric center of all vertices across all shapes
 * and translates all vertices to make this center (0,0).
 */
function centerDesign() {
    if (!isEditable() || shapes.length === 0) {
        console.log("Center Design: No editable shapes to center.");
        return;
    }

    let totalX = 0;
    let totalY = 0;
    let vertexCount = 0;

    // Calculate the sum of all vertex coordinates
    for (const shape of shapes) {
        if (shape?.vertexData) {
            for (const vertex of shape.vertexData) {
                if (typeof vertex?.x === 'number' && typeof vertex?.y === 'number') {
                    totalX += vertex.x;
                    totalY += vertex.y;
                    vertexCount++;
                }
            }
        }
    }

    if (vertexCount === 0) {
        console.log("Center Design: No valid vertices found.");
        return;
    }

    // Calculate the average position (geometric center)
    const avgX = totalX / vertexCount;
    const avgY = totalY / vertexCount;

    // Check if centering is needed (avoid tiny adjustments)
    if (Math.abs(avgX) < 1e-6 && Math.abs(avgY) < 1e-6) {
        console.log("Center Design: Design is already centered.");
        return;
    }

    console.log(`Center Design: Shifting by (${-avgX.toFixed(4)}, ${-avgY.toFixed(4)})`);
    saveStateForUndo(); // Save state BEFORE applying the shift

    // Apply the translation to all vertices
    for (const shape of shapes) {
        if (shape?.vertexData) {
            for (const vertex of shape.vertexData) {
                if (typeof vertex?.x === 'number' && typeof vertex?.y === 'number') {
                    vertex.x -= avgX;
                    vertex.y -= avgY;
                }
            }
        }
    }
}

function centerDesignByBoundingBox() {
    if (!isEditable() || shapes.length === 0) {
        console.log("Center Design: No editable shapes to center.");
        return;
    }

    // Find min and max coordinates
    let minX = Infinity, minY = Infinity;
    let maxX = -Infinity, maxY = -Infinity;

    for (const shape of shapes) {
        if (shape?.vertexData) {
            for (const vertex of shape.vertexData) {
                if (typeof vertex?.x === 'number' && typeof vertex?.y === 'number') {
                    minX = Math.min(minX, vertex.x);
                    minY = Math.min(minY, vertex.y);
                    maxX = Math.max(maxX, vertex.x);
                    maxY = Math.max(maxY, vertex.y);
                }
            }
        }
    }

    // Center of bounding box
    const centerX = (minX + maxX) / 2;
    const centerY = (minY + maxY) / 2;

    // Check if centering is needed
    if (Math.abs(centerX) < 1e-6 && Math.abs(centerY) < 1e-6) {
        console.log("Center Design: Design is already centered.");
        return;
    }

    console.log(`Center Design: Shifting by (${-centerX.toFixed(4)}, ${-centerY.toFixed(4)})`);
    saveStateForUndo(); // Save state BEFORE applying the shift

    // Apply the translation to all vertices
    for (const shape of shapes) {
        if (shape?.vertexData) {
            for (const vertex of shape.vertexData) {
                vertex.x -= centerX;
                vertex.y -= centerY;
            }
        }
    }
}

// --- Vertical and Horizontal Mirror Functions ---
function handleVMirrorClick() {
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    if (primaryShapeIndex === -1 || !isEditable() || !shapes[primaryShapeIndex]) {
        console.warn('V Mirror: No selectable shape selected or editor not editable.');
        return;
    }
    mirrorSelectedAcrossVerticalLine();
}

function handleHMirrorClick() {
    const primaryShapeIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    if (primaryShapeIndex === -1 || !isEditable() || !shapes[primaryShapeIndex]) {
        console.warn('H Mirror: No selectable shape selected or editor not editable.');
        return;
    }
    mirrorSelectedAcrossHorizontalLine();
}

function mirrorSelectedAcrossVerticalLine() {
    const srcIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    const src = shapes[srcIndex];
    if (!src || !Array.isArray(src.vertexData) || src.vertexData.length < 3) {
        console.warn('V Mirror: Source shape invalid.');
        return;
    }
    saveStateForUndo(); // Save before creating new mirrored layer

    const newShape = JSON.parse(JSON.stringify(src));
    newShape.vertexData = newShape.vertexData.map(v => ({ x: (typeof v.x === 'number' ? -v.x : v.x), y: v.y }));

    shapes.push(newShape);
    selectedShapeIndices = [shapes.length - 1];
    selectedVertexIndices = [];
    updateUIControls(); updateColorPickersFromSelection();
    console.log('V Mirror: Created mirrored layer from shape', srcIndex, '->', shapes.length - 1);
}

function mirrorSelectedAcrossHorizontalLine() {
    const srcIndex = selectedShapeIndices.length > 0 ? selectedShapeIndices[0] : -1;
    const src = shapes[srcIndex];
    if (!src || !Array.isArray(src.vertexData) || src.vertexData.length < 3) {
        console.warn('H Mirror: Source shape invalid.');
        return;
    }
    saveStateForUndo(); // Save before creating new mirrored layer

    const newShape = JSON.parse(JSON.stringify(src));
    newShape.vertexData = newShape.vertexData.map(v => ({ x: v.x, y: (typeof v.y === 'number' ? -v.y : v.y) }));

    shapes.push(newShape);
    selectedShapeIndices = [shapes.length - 1];
    selectedVertexIndices = [];
    updateUIControls(); updateColorPickersFromSelection();
    console.log('H Mirror: Created mirrored layer from shape', srcIndex, '->', shapes.length - 1);
}

// --- Rotation Functions ---
function rotateSelectedByDegrees(angleDeg) {
    if (selectedShapeIndices.length === 0 || !isEditable()) {
        console.warn('Rotate: No selectable shape selected or editor not editable.');
        return;
    }
    saveStateForUndo(); // Save before rotating
    const rad = angleDeg * Math.PI / 180;
    const cosA = Math.cos(rad), sinA = Math.sin(rad);

    try {
        // Rotate ALL selected shapes
        selectedShapeIndices.forEach(shapeIdx => {
            const shape = shapes[shapeIdx];
            if (!shape || !Array.isArray(shape.vertexData) || shape.vertexData.length < 1) return;

            shape.vertexData = shape.vertexData.map(v => {
                if (typeof v?.x !== 'number' || typeof v?.y !== 'number') return v;
                const nx = v.x * cosA - v.y * sinA;
                const ny = v.x * sinA + v.y * cosA;
                return { x: nx, y: ny };
            });
            // Rotate holes if present
            if (Array.isArray(shape.holes)) {
                shape.holes = shape.holes.map(hole => hole.map(v => {
                    if (typeof v?.x !== 'number' || typeof v?.y !== 'number') return v;
                    const nx = v.x * cosA - v.y * sinA;
                    const ny = v.x * sinA + v.y * cosA;
                    return { x: nx, y: ny };
                }));
            }
        });
        console.log(`Rotate: Rotated ${selectedShapeIndices.length} shape(s) by ${angleDeg}°.`);
        updateUIControls(); updateColorPickersFromSelection();
    } catch (e) {
        console.error('Rotate failed:', e);
    }
}

function scaleSelectedShapes(scaleFactor) {
    if (selectedShapeIndices.length === 0 || !isEditable()) {
        console.warn('Scale: No selectable shape selected or editor not editable.');
        return;
    }
    if (typeof scaleFactor !== 'number' || scaleFactor <= 0) {
        console.error('Scale: Invalid scale factor:', scaleFactor);
        return;
    }
    saveStateForUndo(); // Save before scaling

    try {
        // Scale ALL selected shapes
        selectedShapeIndices.forEach(shapeIdx => {
            const shape = shapes[shapeIdx];
            if (!shape || !Array.isArray(shape.vertexData) || shape.vertexData.length < 1) return;

            // Scale main vertices
            shape.vertexData = shape.vertexData.map(v => {
                if (typeof v?.x !== 'number' || typeof v?.y !== 'number') return v;
                return { x: v.x * scaleFactor, y: v.y * scaleFactor };
            });

            // Scale holes if present
            if (Array.isArray(shape.holes)) {
                shape.holes = shape.holes.map(hole => hole.map(v => {
                    if (typeof v?.x !== 'number' || typeof v?.y !== 'number') return v;
                    return { x: v.x * scaleFactor, y: v.y * scaleFactor };
                }));
            }
        });
        console.log(`Scale: Scaled ${selectedShapeIndices.length} shape(s) by ${scaleFactor.toFixed(2)}x.`);
        updateUIControls(); updateColorPickersFromSelection();
    } catch (e) {
        console.error('Scale failed:', e);
    }
}

// Inside editor.js
function exportDrawFunctionCode() {
    // Get base name for the export
    let baseName = 'CustomShip';
    if (currentShipDef && currentShipKey !== '--- New Blank ---') {
        baseName = currentShipKey.replace(/\s+/g, '').replace('Mk', 'Mk');
    }

    let code = [];
    code.push(`// --- Generated Ship Layer Data for ${baseName} ---`);
    code.push(`// --- Contains ${shapes.length} shape layer(s) ---`);
    code.push(`// --- Export Date: ${new Date().toLocaleString()} ---`);
    code.push(``);

    // Export directly in vertexLayers format
    code.push(`        vertexLayers: [`);
    for (let i = 0; i < shapes.length; i++) {
        let shape = shapes[i];
        if (!shape?.vertexData || shape.vertexData.length < 2) continue;

        code.push(`            {`);
        code.push(`                vertexData: [ ${shape.vertexData.map(v => `{ x: ${v.x.toFixed(4)}, y: ${v.y.toFixed(4)} }`).join(', ')} ],`);
        code.push(`                fillColor: [${shape.fillColor ? shape.fillColor.map(c => Math.round(c)).join(', ') : '180, 180, 180'}]`);
        code.push(`            }${i < shapes.length - 1 ? ',' : ''}`);
    }
    code.push(`        ],`);

    // Save to file
    saveStrings(code, `${baseName}_vertexLayers.js`, 'js');
}

// --- Utility Functions ---
function isPointInPolygon(px, py, polygonVertices) {
    if (!polygonVertices || polygonVertices.length < 3) return false;
    let isInside = false;
    for (let i = 0, j = polygonVertices.length - 1; i < polygonVertices.length; j = i++) {
        let vi = polygonVertices[i]; let vj = polygonVertices[j];
        if (typeof vi?.x !== 'number' || typeof vi?.y !== 'number' || typeof vj?.x !== 'number' || typeof vj?.y !== 'number') { continue; }
        let xi = vi.x, yi = vi.y; let xj = vj.x, yj = vj.y;
        if (((yi > py) !== (yj > py)) && (px < (xj - xi) * (py - yi) / (yj - yi) + xi)) { isInside = !isInside; }
    } return isInside;
}

function findClosestEdgeRelative(shape, mx_rel_shape, my_rel_shape) {
    let minDistSq = Infinity; let closestEdgeIndex = -1;
    if (!shape?.vertexData || shape.vertexData.length < 2) return null;
    for (let i = 0; i < shape.vertexData.length; i++) {
        let v1 = shape.vertexData[i]; let v2 = shape.vertexData[(i + 1) % shape.vertexData.length];
        if (typeof v1?.x !== 'number' || typeof v1?.y !== 'number' || typeof v2?.x !== 'number' || typeof v2?.y !== 'number') continue;
        let distSq = distSqToSegment(mx_rel_shape, my_rel_shape, v1.x, v1.y, v2.x, v2.y);
        if (distSq < minDistSq) { minDistSq = distSq; closestEdgeIndex = i; }
    }
    if (closestEdgeIndex !== -1) { return { index: closestEdgeIndex, distSq: minDistSq }; }
    return null;
}

function distSqToSegment(px, py, x1, y1, x2, y2) {
    let l2 = distSq(x1, y1, x2, y2); if (l2 === 0) return distSq(px, py, x1, y1);
    let t = ((px - x1) * (x2 - x1) + (py - y1) * (y2 - y1)) / l2;
    t = Math.max(0, Math.min(1, t));
    let projX = x1 + t * (x2 - x1); let projY = y1 + t * (y2 - y1);
    return distSq(px, py, projX, projY);
}

function distSq(x1, y1, x2, y2) {
    let dx = x1 - x2; let dy = y1 - y2; return dx * dx + dy * dy;
}

function rgbToHex(rgb) {
    // Converts [r, g, b] array to hex "#rrggbb" string with validation
    if (!Array.isArray(rgb) || rgb.length !== 3 || rgb.some(val => typeof val !== 'number' || isNaN(val))) {
        console.error("Invalid input to rgbToHex:", rgb); return "#000000";
    }
    try {
        return '#' + rgb.map(x => {
            const hex = Math.round(constrain(x, 0, 255)).toString(16);
            return hex.length === 1 ? '0' + hex : hex;
        }).join('');
    } catch (e) { console.error("Error converting RGB to Hex:", rgb, e); return "#000000"; }
}

// --- Log successful load ---
console.log("editor.js loaded successfully with all features (v3 - Correct Drag Undo Timing).");

// --- Add this new function ---
function toggleShipComparer() {
    if (shipComparer) {
        if (shipComparer.graphVisible) {
            shipComparer.hide();
        } else {
            shipComparer.show();
        }
    } else {
        console.error("ShipComparer is not initialized.");
    }
}

function toggleWeaponComparer() {
    if (weaponComparer) {
        if (weaponComparer.graphVisible) {
            weaponComparer.hide();
        } else {
            weaponComparer.show();
        }
    } else {
        console.error("WeaponComparer is not initialized.");
    }
}