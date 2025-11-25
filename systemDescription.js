// Generates a textual description for a StarSystem for use in overlays
function generateSystemDescription(system, env = {}) {
    if (!system) return '';

    const galaxy = env.galaxy || (typeof window !== 'undefined' ? window.galaxy : null);
    const player = env.player || (typeof window !== 'undefined' ? window.player : null);

    const econ = system.economyType || system.economy || 'Unknown';
    const sec = system.securityLevel || 'Unknown';
    const tech = Number.isFinite(system.techLevel) ? system.techLevel : '?';

    // Planets list (skip sun at index 0 if present)
    let planetNames = [];
    if (Array.isArray(system.planets) && system.planets.length > 0) {
        for (let i = 0; i < system.planets.length; i++) {
            const p = system.planets[i];
            if (!p) continue;
            // Include name and a hint (sun marked)
            if (p.isSun) planetNames.push(`${p.name} (Star)`);
            else planetNames.push(p.name || `Planet ${p.planetIndex || i}`);
        }
    }

    const planetsLine = planetNames.length > 0 ? planetNames.join(', ') : 'No known planets.';

    // --- Include currently available missions if possible (higher-level analytical summary) ---
    let missionSummary = '';
    try {
        if (typeof system.getAvailableMissions === 'function' && galaxy && player) {
            const missions = system.getAvailableMissions(galaxy, player) || [];
            if (missions.length > 0) {
                const typeCounts = {};
                const titles = [];
                const commodityCounts = {};
                let highRiskFlag = false;

                for (let m of missions) {
                    const t = (m.type || m.typeName || 'Misc').toString();
                    typeCounts[t] = (typeCounts[t] || 0) + 1;
                    if (titles.length < 3) titles.push(m.title || m.getSummary?.() || t);

                    const c = m.commodity || m.product || (m.target && (m.target.commodity || m.target.name)) || m.payload?.commodity;
                    if (c) commodityCounts[c] = (commodityCounts[c] || 0) + 1;

                    const tl = t.toLowerCase();
                    if (tl.includes('assass') || tl.includes('sabot') || tl.includes('bounty') || tl.includes('attack') || tl.includes('kill')) {
                        highRiskFlag = true;
                    }
                }

                const total = missions.length;
                const sortedTypes = Object.entries(typeCounts).sort((a,b) => b[1] - a[1]);
                const top = sortedTypes[0];

                let typePhrase = '';
                if (top && top[1] / total >= 0.6) {
                    typePhrase = `Primarily ${top[0]} missions (${top[1]} of ${total}).`;
                } else if (sortedTypes.length > 0) {
                    typePhrase = `Mixed missions: ${sortedTypes.slice(0,3).map(([k,v]) => `${v} ${k}`).join(', ')}.`;
                }

                const topCommodities = Object.entries(commodityCounts).sort((a,b) => b[1] - a[1]).slice(0,3).map(([k]) => k);
                const commodityPhrase = topCommodities.length ? `Common targets/commodities: ${topCommodities.join(', ')}.` : '';

                const riskPhrase = highRiskFlag
                    ? 'Higher-risk jobs (assassination/sabotage) are present.'
                    : (typePhrase.toLowerCase().includes('trade') || typePhrase.toLowerCase().includes('transport') ? 'Mostly low-risk trade/transport work.' : 'Mission risk is mixed.');

                missionSummary = `${typePhrase} ${commodityPhrase} ${riskPhrase} Examples: ${titles.join('; ')}.`;
            } else {
                missionSummary = 'No missions currently posted.';
            }
        }
    } catch (e) {
        missionSummary = '';
    }

    // --- Include current enemy/spawn composition (high-level summary) ---
    let shipSummary = '';
    try {
        const mapRoleToLabel = (r) => {
            if (!r) return 'unknown';
            const s = r.toString().toLowerCase();
            if (s.includes('separat')) return 'Separatist forces';
            if (s.includes('imperial')) return 'Imperial forces';
            if (s.includes('police')) return 'Police';
            if (s.includes('pirate')) return 'Pirates';
            if (s.includes('alien') || s.includes('xeno')) return 'Aliens';
            if (s.includes('hauler') || s.includes('cargo')) return 'Haulers';
            if (s.includes('transport')) return 'Transports';
            if (s.includes('guard')) return 'Escorts/Guards';
            if (s.includes('combat') || s.includes('military')) return 'Combat vessels';
            if (s.includes('explorer')) return 'Explorers';
            return r.toString();
        };

        if (Array.isArray(system.enemies) && system.enemies.length > 0) {
            const counts = {};
            const examples = {}; // collect example ship type names per label
            for (const e of system.enemies) {
                if (!e) continue;
                const raw = (e.role || e.aiRole || e.shipFaction || e.faction || 'Unknown').toString();
                const label = mapRoleToLabel(raw);
                counts[label] = (counts[label] || 0) + 1;
                const sname = (e.shipTypeName || e.shipType || (e.shipDefinition && e.shipDefinition.name) || null);
                if (sname) {
                    examples[label] = examples[label] || {};
                    examples[label][sname] = (examples[label][sname] || 0) + 1;
                }
            }
            const sorted = Object.entries(counts).sort((a,b) => b[1] - a[1]);
            if (sorted.length > 0) {
                // Primary group
                const primary = sorted[0][0];
                // Secondary/others
                const others = sorted.slice(1).map(s => s[0]);

                // Build example lists (take up to 2 examples per group)
                const makeExamples = (lbl) => {
                    const eMap = examples[lbl] || {};
                    const arr = Object.entries(eMap).sort((a,b) => b[1]-a[1]).slice(0,2).map(x=>x[0]);
                    return arr.length ? ` e.g. ${arr.join(', ')}` : '';
                };

                if (others.length === 0) {
                    shipSummary = `Typical spawns: ${primary}.${makeExamples(primary)}`;
                } else {
                    const mainStr = `Main: ${primary}${makeExamples(primary)}`;
                    const minorStr = `Also: ${others.slice(0,4).map(lbl => lbl + makeExamples(lbl)).join(', ')}`;
                    shipSummary = `${mainStr}; ${minorStr}.`;
                }
            }
        } else if (typeof system.getEnemyRoleProbabilities === 'function') {
            const probs = system.getEnemyRoleProbabilities() || {};
            const agg = {};
            for (const [k, v] of Object.entries(probs)) {
                const label = mapRoleToLabel(k);
                agg[label] = (agg[label] || 0) + (Number(v) || 0);
            }
            const sorted = Object.entries(agg).sort((a,b) => b[1] - a[1]);
            if (sorted.length > 0) {
                const primary = sorted[0][0];
                const others = sorted.slice(1).map(s => s[0]);
                if (others.length === 0) shipSummary = `Typical spawns: ${primary}.`;
                else shipSummary = `Main: ${primary}; Also: ${others.slice(0,4).join(', ')}.`;
            }
        }
    } catch (e) {
        shipSummary = '';
    }

    // Build a short backstory based on economy + security
    const econBlurb = {
        'Agricultural': 'A breadbasket system, its farms and orbital harvesters keep nearby markets supplied.',
        'Industrial': 'Smokestacks and orbital foundries dominate; production drives the economy and streets hum with workers.',
        'Mining': 'Raw ores and minerals are the backbone here; miners and claim-jumpers shape local life.',
        'Military': 'Heavily regulated and well-defended; drill yards and barracks are common sights.',
        'Offworld': 'Exotic imports and niche industries give this system a cosmopolitan, high-end feel.',
        'Tourism': 'Pleasant resorts and entertainment hubs draw visitors from far and wide.',
        'Refinery': 'Processing plants break down raw asteroids into saleable commodities.',
        'Post Human': 'Unusual technologies and post-human enclaves influence trade and culture.',
        'Service': 'Service industries and logistics dominate, keeping other systems running smoothly.',
        'Separatist': 'Political tension simmers; independent militias and clandestine markets exist.',
        'Imperial': 'Imperial influence is visible in architecture and protocol; law is strict but orderly.'
    };

    const secBlurb = {
        'Anarchy': 'No formal law enforcement — disputes are settled by force or contract.',
        'Low': 'Light-handed security; opportunistic crime groups operate with some impunity.',
        'Medium': 'Balanced enforcement keeps most trouble at bay; expect checkpoints and patrols.',
        'High': 'Heavy policing and inspections are common; illegal trade is risky.'
    };

    const econSentence = econBlurb[econ] || `An economy oriented around ${econ.toLowerCase()}.`;
    const secSentence = secBlurb[sec] || `Security level: ${sec}.`;

    // Tone modifiers for backstory variety
    const toneModifiers = [
        'Local rumors mention a recent commodity shortage that drew opportunistic traders.',
        'A minor political scandal has locals talking at taverns and cantinas.',
        'Smuggling networks are rumored to use nearby asteroid belts as transfer points.',
        'Veteran pilots warn newcomers about increased pirate activity on the outer routes.'
    ];
    const mod = toneModifiers[(system.systemIndex || 0) % toneModifiers.length];

    // Assemble description
    const lines = [];
    lines.push(`${system.name || 'Unknown System'} — ${econ} economy · Security: ${sec} · Tech: ${tech}`);
    lines.push(econSentence + ' ' + secSentence);
    lines.push(`Planets: ${planetsLine}`);
    if (missionSummary) lines.push(missionSummary);
    if (shipSummary) lines.push(shipSummary);
    lines.push(mod);

    const desc = lines.join('\n\n');
    try { if (system && typeof system === 'object') system.cachedDescription = desc; } catch (e) { /* ignore */ }
    return desc;
}

// Expose for other modules (global function is fine for this project structure)
window.generateSystemDescription = generateSystemDescription;
