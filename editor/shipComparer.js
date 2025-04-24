class ShipComparer {
    constructor(shipDefinitions) {
        this.shipDefinitions = shipDefinitions;
        this.graphVisible = false;
        this.activeTab = 'performance'; // Default tab

        // DOM Elements
        this.container = document.getElementById('shipComparisonGraph');
        this.closeButton = document.getElementById('closeCompareGraphButton');
        this.tabContainer = document.getElementById('compareTabs');
        this.xAxisSelect = document.getElementById('xAxisSelect');
        this.yAxisSelect = document.getElementById('yAxisSelect');
        this.logScaleXCheckbox = document.getElementById('logScaleXCheckbox');
        this.logScaleYCheckbox = document.getElementById('logScaleYCheckbox');
        this.graphArea = document.getElementById('graphArea');
        this.canvas = document.getElementById('graphCanvas');
        this.tooltip = document.getElementById('graphTooltip');
        this.ctx = this.canvas.getContext('2d');

        this.numericProperties = this.getNumericProperties();
        this.shipDataPoints = []; // To store { x, y, screenX, screenY, shipName, data: {} }

        // Default axes per tab
        this.tabDefaults = {
            performance: { x: 'baseMaxSpeed', y: 'baseTurnRate', logX: false, logY: false },
            combat: { x: 'baseHull', y: 'baseShield', logX: false, logY: false },
            economy: { x: 'cargoCapacity', y: 'price', logX: false, logY: true },
            custom: { x: 'size', y: 'baseMaxSpeed', logX: false, logY: false }
        };

        // Graph drawing properties
        this.padding = { top: 20, right: 50, bottom: 50, left: 60 };
        this.pointRadius = 4;
        this.hoverRadiusSq = 10 * 10; // Squared radius for hover detection
    }

    init() {
        // Populate selectors
        this.numericProperties.forEach(prop => {
            const optionX = document.createElement('option');
            optionX.value = prop;
            optionX.textContent = prop;
            this.xAxisSelect.appendChild(optionX);

            const optionY = document.createElement('option');
            optionY.value = prop;
            optionY.textContent = prop;
            this.yAxisSelect.appendChild(optionY.cloneNode(true));
        });

        // Add Event Listeners
        this.closeButton.addEventListener('click', () => this.hide());
        this.xAxisSelect.addEventListener('change', () => this.drawGraph());
        this.yAxisSelect.addEventListener('change', () => this.drawGraph());
        this.logScaleXCheckbox.addEventListener('change', () => this.drawGraph());
        this.logScaleYCheckbox.addEventListener('change', () => this.drawGraph());

        this.tabContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tabButton')) {
                this.setActiveTab(e.target.dataset.tab);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => this.handleMouseMove(e));
        this.canvas.addEventListener('mouseout', () => this.hideTooltip()); // Hide tooltip when mouse leaves canvas

        // Resize observer for the graph area
        this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
        this.resizeObserver.observe(this.graphArea);

        this.setActiveTab(this.activeTab); // Set initial state
    }

    getNumericProperties() {
        const props = new Set();
        for (const shipKey in this.shipDefinitions) {
            const ship = this.shipDefinitions[shipKey];
            // Exclude non-numeric or problematic properties
            const exclude = ['vertexData', 'vertexLayers', 'drawFunction', 'name', 'role', 'sizeCategory', 'costCategory', 'description', 'armament', 'typicalCargo', 'aiRoles', 'fillColor', 'strokeColor'];
            for (const prop in ship) {
                if (!exclude.includes(prop) && typeof ship[prop] === 'number' && isFinite(ship[prop])) {
                    props.add(prop);
                }
            }
        }
        return Array.from(props).sort();
    }

    setActiveTab(tabName) {
        this.activeTab = tabName;

        // Update tab button styles
        this.tabContainer.querySelectorAll('.tabButton').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tabName);
        });

        // Set default axes for the tab
        const defaults = this.tabDefaults[tabName] || this.tabDefaults.custom;
        if (this.numericProperties.includes(defaults.x)) {
            this.xAxisSelect.value = defaults.x;
        }
        if (this.numericProperties.includes(defaults.y)) {
            this.yAxisSelect.value = defaults.y;
        }
        this.logScaleXCheckbox.checked = defaults.logX;
        this.logScaleYCheckbox.checked = defaults.logY;


        this.drawGraph();
    }

    resizeCanvas() {
        if (!this.graphVisible) return;
        this.canvas.width = this.graphArea.clientWidth;
        this.canvas.height = this.graphArea.clientHeight;
        this.drawGraph(); // Redraw after resizing
    }

    show() {
        this.container.style.display = 'block';
        this.graphVisible = true;
        this.resizeCanvas(); // Ensure canvas size is correct and draw
    }

    hide() {
        this.container.style.display = 'none';
        this.graphVisible = false;
        this.hideTooltip();
    }

    // --- Mapping Functions ---
    mapLinear(value, dataMin, dataMax, screenMin, screenMax) {
        if (dataMax === dataMin) return (screenMin + screenMax) / 2; // Avoid division by zero
        return screenMin + (screenMax - screenMin) * (value - dataMin) / (dataMax - dataMin);
    }

    mapLog(value, dataMin, dataMax, screenMin, screenMax) {
        if (value <= 0) return screenMin; // Log scale can't handle non-positive values well
        const logMin = Math.log10(Math.max(1, dataMin)); // Avoid log(0) or log(negative)
        const logMax = Math.log10(Math.max(1, dataMax));
        const logVal = Math.log10(value);
        if (logMax === logMin) return (screenMin + screenMax) / 2;
        return screenMin + (screenMax - screenMin) * (logVal - logMin) / (logMax - logMin);
    }

    unmapLinear(screenVal, dataMin, dataMax, screenMin, screenMax) {
        if (screenMax === screenMin) return (dataMin + dataMax) / 2;
        return dataMin + (dataMax - dataMin) * (screenVal - screenMin) / (screenMax - screenMin);
    }

    unmapLog(screenVal, dataMin, dataMax, screenMin, screenMax) {
        const logMin = Math.log10(Math.max(1, dataMin));
        const logMax = Math.log10(Math.max(1, dataMax));
        if (screenMax === screenMin || logMax === logMin) return (dataMin + dataMax) / 2;
        const logVal = logMin + (logMax - logMin) * (screenVal - screenMin) / (screenMax - screenMin);
        return Math.pow(10, logVal);
    }


    drawGraph() {
        if (!this.graphVisible) return;

        const xProp = this.xAxisSelect.value;
        const yProp = this.yAxisSelect.value;
        const useLogX = this.logScaleXCheckbox.checked;
        const useLogY = this.logScaleYCheckbox.checked;

        const mapX = useLogX ? this.mapLog : this.mapLinear;
        const mapY = useLogY ? this.mapLog : this.mapLinear;

        const ctx = this.ctx;
        const w = this.canvas.width;
        const h = this.canvas.height;

        // Clear canvas
        ctx.clearRect(0, 0, w, h);

        // Get data range
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        this.shipDataPoints = []; // Reset points

        for (const shipKey in this.shipDefinitions) {
            const ship = this.shipDefinitions[shipKey];
            const xVal = ship[xProp];
            const yVal = ship[yProp];

            if (typeof xVal === 'number' && isFinite(xVal) && typeof yVal === 'number' && isFinite(yVal)) {
                 // Adjust min for log scale if needed
                const effectiveXVal = (useLogX && xVal <= 0) ? 1 : xVal;
                const effectiveYVal = (useLogY && yVal <= 0) ? 1 : yVal;

                if (effectiveXVal < xMin) xMin = effectiveXVal;
                if (effectiveXVal > xMax) xMax = effectiveXVal;
                if (effectiveYVal < yMin) yMin = effectiveYVal;
                if (effectiveYVal > yMax) yMax = effectiveYVal;

                 this.shipDataPoints.push({
                    x: xVal, // Store original value
                    y: yVal, // Store original value
                    effectiveX: effectiveXVal, // Store value used for scaling
                    effectiveY: effectiveYVal, // Store value used for scaling
                    shipName: ship.name || shipKey,
                    data: ship // Store full ship data for tooltip
                });
            }
        }

        // Add padding to ranges
        const xRange = xMax - xMin;
        const yRange = yMax - yMin;
        if (!useLogX) {
            xMin -= xRange * 0.05;
            xMax += xRange * 0.05;
        } else { // Log scale padding needs care
             xMin = Math.max(1, xMin / 1.2); // Avoid going below 1
             xMax *= 1.2;
        }
         if (!useLogY) {
            yMin -= yRange * 0.05;
            yMax += yRange * 0.05;
        } else {
             yMin = Math.max(1, yMin / 1.2);
             yMax *= 1.2;
        }
        // Ensure min isn't negative if max is positive (and vice versa)
        if (xMin < 0 && xMax > 0 && !useLogX) xMin = 0;
        if (yMin < 0 && yMax > 0 && !useLogY) yMin = 0;
        // Ensure min isn't greater than max after padding
        if (xMin > xMax) xMin = xMax - (xRange * 0.1 || 1);
        if (yMin > yMax) yMin = yMax - (yRange * 0.1 || 1);


        const screenXMin = this.padding.left;
        const screenXMax = w - this.padding.right;
        const screenYMin = h - this.padding.bottom; // Y=0 is at top
        const screenYMax = this.padding.top;

        // --- Draw Axes ---
        ctx.strokeStyle = '#000';
        ctx.lineWidth = 1;
        ctx.beginPath();
        // X Axis
        ctx.moveTo(screenXMin, screenYMin);
        ctx.lineTo(screenXMax, screenYMin);
        // Y Axis
        ctx.moveTo(screenXMin, screenYMin);
        ctx.lineTo(screenXMin, screenYMax);
        ctx.stroke();

        // --- Draw Grid Lines & Labels ---
        ctx.strokeStyle = '#ddd';
        ctx.fillStyle = '#555';
        ctx.font = '10px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';

        const numTicks = 5;
        const unmapX = useLogX ? this.unmapLog : this.unmapLinear;
        const unmapY = useLogY ? this.unmapLog : this.unmapLinear;

        // X Ticks
        for (let i = 0; i <= numTicks; i++) {
            const screenX = screenXMin + (screenXMax - screenXMin) * i / numTicks;
            ctx.beginPath();
            ctx.moveTo(screenX, screenYMin);
            ctx.lineTo(screenX, screenYMax);
            ctx.stroke();
            const dataX = unmapX(screenX, xMin, xMax, screenXMin, screenXMax);
            ctx.fillText(dataX.toPrecision(2), screenX, screenYMin + 5);
        }
        // Y Ticks
        ctx.textAlign = 'right';
        ctx.textBaseline = 'middle';
        for (let i = 0; i <= numTicks; i++) {
            const screenY = screenYMin + (screenYMax - screenYMin) * i / numTicks;
            ctx.beginPath();
            ctx.moveTo(screenXMin, screenY);
            ctx.lineTo(screenXMax, screenY);
            ctx.stroke();
            const dataY = unmapY(screenY, yMin, yMax, screenYMin, screenYMax);
            ctx.fillText(dataY.toPrecision(2), screenXMin - 5, screenY);
        }

        // Axis Labels
        ctx.fillStyle = '#000';
        ctx.font = '12px sans-serif';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'top';
        ctx.fillText(`${xProp}${useLogX ? ' (log)' : ''}`, (screenXMin + screenXMax) / 2, screenYMin + 20);

        ctx.save();
        ctx.translate(screenXMin - 40, (screenYMin + screenYMax) / 2);
        ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center';
        ctx.textBaseline = 'bottom';
        ctx.fillText(`${yProp}${useLogY ? ' (log)' : ''}`, 0, 0);
        ctx.restore();


        // --- Draw Data Points ---
        ctx.fillStyle = 'rgba(0, 100, 200, 0.7)';
        this.shipDataPoints.forEach(point => {
            // Use effective values for plotting
            point.screenX = mapX(point.effectiveX, xMin, xMax, screenXMin, screenXMax);
            point.screenY = mapY(point.effectiveY, yMin, yMax, screenYMin, screenYMax); // Y=0 is top

            // Only draw if within bounds (or very close)
             if (point.screenX >= screenXMin - this.pointRadius && point.screenX <= screenXMax + this.pointRadius &&
                 point.screenY >= screenYMax - this.pointRadius && point.screenY <= screenYMin + this.pointRadius)
             {
                ctx.beginPath();
                ctx.arc(point.screenX, point.screenY, this.pointRadius, 0, Math.PI * 2);
                ctx.fill();
            } else {
                 // Store NaN or null to indicate it's off-screen for hover checks
                 point.screenX = NaN;
                 point.screenY = NaN;
             }
        });
    }

    handleMouseMove(event) {
        if (!this.graphVisible) return;

        const rect = this.canvas.getBoundingClientRect();
        const mouseX = event.clientX - rect.left;
        const mouseY = event.clientY - rect.top;

        let foundPoint = null;
        let minDistSq = this.hoverRadiusSq;

        this.shipDataPoints.forEach(point => {
            if (isNaN(point.screenX) || isNaN(point.screenY)) return; // Skip off-screen points

            const dx = mouseX - point.screenX;
            const dy = mouseY - point.screenY;
            const distSq = dx * dx + dy * dy;

            if (distSq < minDistSq) {
                minDistSq = distSq;
                foundPoint = point;
            }
        });

        if (foundPoint) {
            this.showTooltip(foundPoint, mouseX, mouseY);
        } else {
            this.hideTooltip();
        }
    }

    showTooltip(point, mouseX, mouseY) {
        const xProp = this.xAxisSelect.value;
        const yProp = this.yAxisSelect.value;
        this.tooltip.style.display = 'block';
        this.tooltip.innerHTML = `
            <strong>${point.shipName}</strong><br>
            ${xProp}: ${point.x.toFixed(2)}<br>
            ${yProp}: ${point.y.toFixed(2)}
        `;
        // Position tooltip near cursor, ensuring it stays within graph area bounds
        const tooltipRect = this.tooltip.getBoundingClientRect();
        const areaRect = this.graphArea.getBoundingClientRect();
        let left = mouseX + 15 + this.canvas.offsetLeft;
        let top = mouseY + 15 + this.canvas.offsetTop;

        if (left + tooltipRect.width > this.graphArea.clientWidth - 5) {
            left = mouseX - tooltipRect.width - 15 + this.canvas.offsetLeft;
        }
        if (top + tooltipRect.height > this.graphArea.clientHeight - 5) {
            top = mouseY - tooltipRect.height - 15 + this.canvas.offsetTop;
        }
        // Ensure it doesn't go off the top/left of the graph area either
        left = Math.max(this.canvas.offsetLeft + 5, left);
        top = Math.max(this.canvas.offsetTop + 5, top);


        this.tooltip.style.left = `${left}px`;
        this.tooltip.style.top = `${top}px`;
    }

    hideTooltip() {
        this.tooltip.style.display = 'none';
    }
}

console.log("shipComparer.js loaded");