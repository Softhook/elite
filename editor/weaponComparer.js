class WeaponComparer {
    constructor(weaponList) {
        this.weaponList = Array.isArray(weaponList) ? weaponList : [];
        this.graphVisible = false;
        this.activeTab = 'performance';

        // DOM Elements
        this.container = document.getElementById('weaponComparisonGraph');
        this.closeButton = document.getElementById('closeCompareWeaponsGraphButton');
        this.tabContainer = document.getElementById('weaponCompareTabs');
        this.xAxisSelect = document.getElementById('weaponXAxisSelect');
        this.yAxisSelect = document.getElementById('weaponYAxisSelect');
        this.logScaleXCheckbox = document.getElementById('weaponLogScaleXCheckbox');
        this.logScaleYCheckbox = document.getElementById('weaponLogScaleYCheckbox');
        this.graphArea = document.getElementById('weaponGraphArea');
        this.canvas = document.getElementById('weaponGraphCanvas');
        this.tooltip = document.getElementById('weaponGraphTooltip');
        this.ctx = this.canvas.getContext('2d');

        // Normalize and augment data (add dps when possible)
        this.weapons = this.weaponList.map(w => {
            const copy = { ...w };
            if (typeof copy.damage === 'number' && typeof copy.fireRate === 'number' && copy.fireRate > 0 && isFinite(copy.damage) && isFinite(copy.fireRate)) {
                copy.dps = copy.damage / copy.fireRate; // shots/sec implied by fireRate being seconds per shot
            }
            return copy;
        });

        this.numericProperties = this.getNumericProperties();
        this.points = []; // { x, y, screenX, screenY, name, type, data }

        // Default axes per tab
        this.tabDefaults = {
            performance: { x: 'price', y: this.numericProperties.includes('dps') ? 'dps' : 'damage', logX: true, logY: false },
            economy: { x: 'price', y: 'damage', logX: true, logY: false },
            special: { x: 'fireRate', y: 'projectileSize', logX: false, logY: false },
            custom: { x: 'fireRate', y: 'damage', logX: false, logY: false }
        };

        // Graph drawing properties
        this.padding = { top: 20, right: 50, bottom: 50, left: 70 };
        this.pointRadius = 4;
        this.hoverRadiusSq = 10 * 10;

        // Colors by weapon type (fallback to gray)
        this.typeColors = {
            projectile: '#1f77b4',
            beam: '#ff7f0e',
            straight2: '#2ca02c',
            straight3: '#17becf',
            straight4: '#bcbd22',
            spread2: '#9467bd',
            spread3: '#8c564b',
            spread4: '#e377c2',
            spread5: '#7f7f7f',
            turret: '#d62728',
            force: '#e7969c',
            missile: '#aec7e8',
            tangle: '#98df8a',
            mine: '#ffbb78',
            barrier: '#c5b0d5'
        };
    }

    init() {
        // Populate selectors
        this.numericProperties.forEach(prop => {
            const optX = document.createElement('option');
            optX.value = prop; optX.textContent = prop;
            this.xAxisSelect.appendChild(optX);

            const optY = document.createElement('option');
            optY.value = prop; optY.textContent = prop;
            this.yAxisSelect.appendChild(optY.cloneNode(true));
        });

        // Listeners
        this.closeButton.addEventListener('click', () => this.hide());
        this.xAxisSelect.addEventListener('change', () => this.draw());
        this.yAxisSelect.addEventListener('change', () => this.draw());
        this.logScaleXCheckbox.addEventListener('change', () => this.draw());
        this.logScaleYCheckbox.addEventListener('change', () => this.draw());

        this.tabContainer.addEventListener('click', (e) => {
            if (e.target.classList.contains('tabButton')) {
                this.setActiveTab(e.target.dataset.tab);
            }
        });

        this.canvas.addEventListener('mousemove', (e) => this.onMouseMove(e));
        this.canvas.addEventListener('mouseout', () => this.hideTooltip());

        // Resize observer (fallback if unavailable)
        try {
            if (typeof ResizeObserver !== 'undefined') {
                this.resizeObserver = new ResizeObserver(() => this.resizeCanvas());
                this.resizeObserver.observe(this.graphArea);
            } else {
                // Fallback: listen to window resize
                this._onWindowResize = () => this.resizeCanvas();
                window.addEventListener('resize', this._onWindowResize);
            }
        } catch (e) {
            console.warn('WeaponComparer: Resize observer setup failed, using window resize fallback.', e);
            this._onWindowResize = () => this.resizeCanvas();
            window.addEventListener('resize', this._onWindowResize);
        }

        this.setActiveTab(this.activeTab);
    }

    getNumericProperties() {
        const exclude = new Set(['name', 'type', 'color', 'desc']);
        const props = new Set();
        for (const w of this.weapons) {
            for (const key in w) {
                const val = w[key];
                if (!exclude.has(key) && typeof val === 'number' && isFinite(val)) props.add(key);
            }
        }
        // Ensure dps listed first-ish if present
        const sorted = Array.from(props).sort();
        if (sorted.includes('dps')) {
            // Move dps to front
            const idx = sorted.indexOf('dps');
            sorted.splice(idx, 1);
            sorted.unshift('dps');
        }
        return sorted;
    }

    setActiveTab(tab) {
        this.activeTab = tab;
        // Update tab styles
        this.tabContainer.querySelectorAll('.tabButton').forEach(btn => {
            btn.classList.toggle('active', btn.dataset.tab === tab);
        });
        // Apply defaults
        const d = this.tabDefaults[tab] || this.tabDefaults.custom;
        if (this.numericProperties.includes(d.x)) this.xAxisSelect.value = d.x;
        if (this.numericProperties.includes(d.y)) this.yAxisSelect.value = d.y;
        this.logScaleXCheckbox.checked = !!d.logX;
        this.logScaleYCheckbox.checked = !!d.logY;
        this.draw();
    }

    resizeCanvas() {
        if (!this.graphVisible) return;
        this.canvas.width = this.graphArea.clientWidth;
        this.canvas.height = this.graphArea.clientHeight;
        this.draw();
    }

    show() {
        this.container.style.display = 'block';
        this.graphVisible = true;
        this.resizeCanvas();
    }

    hide() {
        this.container.style.display = 'none';
        this.graphVisible = false;
        this.hideTooltip();
    }

    // Mapping helpers
    mapLinear(v, dMin, dMax, sMin, sMax) {
        if (dMax === dMin) return (sMin + sMax) / 2;
        return sMin + (sMax - sMin) * (v - dMin) / (dMax - dMin);
    }
    mapLog(v, dMin, dMax, sMin, sMax) {
        if (v <= 0) return sMin;
        const lMin = Math.log10(Math.max(1, dMin));
        const lMax = Math.log10(Math.max(1, dMax));
        const lv = Math.log10(Math.max(1, v));
        if (lMax === lMin) return (sMin + sMax) / 2;
        return sMin + (sMax - sMin) * (lv - lMin) / (lMax - lMin);
    }
    unmapLinear(sv, dMin, dMax, sMin, sMax) {
        if (sMax === sMin) return (dMin + dMax) / 2;
        return dMin + (dMax - dMin) * (sv - sMin) / (sMax - sMin);
    }
    unmapLog(sv, dMin, dMax, sMin, sMax) {
        const lMin = Math.log10(Math.max(1, dMin));
        const lMax = Math.log10(Math.max(1, dMax));
        if (sMax === sMin || lMax === lMin) return (dMin + dMax) / 2;
        const lv = lMin + (lMax - lMin) * (sv - sMin) / (sMax - sMin);
        return Math.pow(10, lv);
    }

    draw() {
        if (!this.graphVisible) return;

        const xProp = this.xAxisSelect.value;
        const yProp = this.yAxisSelect.value;
        const logX = this.logScaleXCheckbox.checked;
        const logY = this.logScaleYCheckbox.checked;
        const mapX = logX ? this.mapLog : this.mapLinear;
        const mapY = logY ? this.mapLog : this.mapLinear;

        const ctx = this.ctx;
        const w = this.canvas.width, h = this.canvas.height;
        ctx.clearRect(0, 0, w, h);

        // Compute ranges
        let xMin = Infinity, xMax = -Infinity, yMin = Infinity, yMax = -Infinity;
        this.points = [];
        for (const weapon of this.weapons) {
            const xv = weapon[xProp];
            const yv = weapon[yProp];
            if (typeof xv === 'number' && isFinite(xv) && typeof yv === 'number' && isFinite(yv)) {
                const ex = (logX && xv <= 0) ? 1 : xv;
                const ey = (logY && yv <= 0) ? 1 : yv;
                if (ex < xMin) xMin = ex; if (ex > xMax) xMax = ex;
                if (ey < yMin) yMin = ey; if (ey > yMax) yMax = ey;
                this.points.push({
                    x: xv, y: yv, effectiveX: ex, effectiveY: ey,
                    name: weapon.name, type: weapon.type, data: weapon
                });
            }
        }
        const xRange = xMax - xMin; const yRange = yMax - yMin;
        if (!logX) { xMin -= xRange * 0.05; xMax += xRange * 0.05; } else { xMin = Math.max(1, xMin / 1.2); xMax *= 1.2; }
        if (!logY) { yMin -= yRange * 0.05; yMax += yRange * 0.05; } else { yMin = Math.max(1, yMin / 1.2); yMax *= 1.2; }
        if (xMin > xMax) xMin = xMax - (xRange * 0.1 || 1);
        if (yMin > yMax) yMin = yMax - (yRange * 0.1 || 1);

        const sXMin = this.padding.left;
        const sXMax = w - this.padding.right;
        const sYMin = h - this.padding.bottom;
        const sYMax = this.padding.top;

        // Axes
        ctx.strokeStyle = '#000'; ctx.lineWidth = 1; ctx.beginPath();
        ctx.moveTo(sXMin, sYMin); ctx.lineTo(sXMax, sYMin);
        ctx.moveTo(sXMin, sYMin); ctx.lineTo(sXMin, sYMax);
        ctx.stroke();

        // Grid + labels
        ctx.strokeStyle = '#ddd'; ctx.fillStyle = '#555'; ctx.font = '10px sans-serif';
        ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        const numTicks = 5; const unmapX = logX ? this.unmapLog : this.unmapLinear; const unmapY = logY ? this.unmapLog : this.unmapLinear;
        for (let i = 0; i <= numTicks; i++) {
            const sx = sXMin + (sXMax - sXMin) * i / numTicks;
            ctx.beginPath(); ctx.moveTo(sx, sYMin); ctx.lineTo(sx, sYMax); ctx.stroke();
            const dx = unmapX(sx, xMin, xMax, sXMin, sXMax); ctx.fillText(dx.toPrecision(2), sx, sYMin + 5);
        }
        ctx.textAlign = 'right'; ctx.textBaseline = 'middle';
        for (let i = 0; i <= numTicks; i++) {
            const sy = sYMin + (sYMax - sYMin) * i / numTicks;
            ctx.beginPath(); ctx.moveTo(sXMin, sy); ctx.lineTo(sXMax, sy); ctx.stroke();
            const dy = unmapY(sy, yMin, yMax, sYMin, sYMax); ctx.fillText(dy.toPrecision(2), sXMin - 5, sy);
        }

        // Axis labels
        ctx.fillStyle = '#000'; ctx.font = '12px sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'top';
        ctx.fillText(`${xProp}${logX ? ' (log)' : ''}`, (sXMin + sXMax) / 2, sYMin + 20);
        ctx.save(); ctx.translate(sXMin - 45, (sYMin + sYMax) / 2); ctx.rotate(-Math.PI / 2);
        ctx.textAlign = 'center'; ctx.textBaseline = 'bottom'; ctx.fillText(`${yProp}${logY ? ' (log)' : ''}`, 0, 0); ctx.restore();

        // Points
        for (const p of this.points) {
            p.screenX = mapX(p.effectiveX, xMin, xMax, sXMin, sXMax);
            p.screenY = mapY(p.effectiveY, yMin, yMax, sYMin, sYMax);
            if (isNaN(p.screenX) || isNaN(p.screenY)) continue;
            const color = this.typeColors[p.type] || '#666';
            ctx.fillStyle = color;
            ctx.beginPath(); ctx.arc(p.screenX, p.screenY, this.pointRadius, 0, Math.PI * 2); ctx.fill();
        }
    }

    onMouseMove(e) {
        if (!this.graphVisible) return;
        const rect = this.canvas.getBoundingClientRect();
        const mx = e.clientX - rect.left; const my = e.clientY - rect.top;
        let found = null; let best = this.hoverRadiusSq;
        for (const p of this.points) {
            if (isNaN(p.screenX) || isNaN(p.screenY)) continue;
            const dx = mx - p.screenX; const dy = my - p.screenY; const d2 = dx*dx + dy*dy;
            if (d2 < best) { best = d2; found = p; }
        }
        if (found) this.showTooltip(found, mx, my); else this.hideTooltip();
    }

    showTooltip(p, mx, my) {
        const xProp = this.xAxisSelect.value; const yProp = this.yAxisSelect.value;
        this.tooltip.style.display = 'block';
        const lines = [
            `<strong>${p.name}</strong> (${p.type})`,
            `${xProp}: ${this.fmt(p.x)}`,
            `${yProp}: ${this.fmt(p.y)}`
        ];
        if (typeof p.data.dps === 'number') lines.push(`dps: ${this.fmt(p.data.dps)}`);
        if (typeof p.data.price === 'number') lines.push(`price: ${this.fmt(p.data.price)}`);
        this.tooltip.innerHTML = lines.join('<br>');

        const tipRect = this.tooltip.getBoundingClientRect();
        const areaRect = this.graphArea.getBoundingClientRect();
        let left = mx + 15 + this.canvas.offsetLeft; let top = my + 15 + this.canvas.offsetTop;
        if (left + tipRect.width > this.graphArea.clientWidth - 5) left = mx - tipRect.width - 15 + this.canvas.offsetLeft;
        if (top + tipRect.height > this.graphArea.clientHeight - 5) top = my - tipRect.height - 15 + this.canvas.offsetTop;
        left = Math.max(this.canvas.offsetLeft + 5, left); top = Math.max(this.canvas.offsetTop + 5, top);
        this.tooltip.style.left = `${left}px`; this.tooltip.style.top = `${top}px`;
    }

    hideTooltip() { this.tooltip.style.display = 'none'; }

    fmt(n) { return (typeof n === 'number' && isFinite(n)) ? Number(n).toPrecision(3) : String(n); }
}

console.log('weaponComparer.js loaded');
