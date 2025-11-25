// Generates a textual description for a StarSystem for use in overlays
function generateSystemDescription(system, env = {}) {
    if (!system) return '';

    const galaxy = env.galaxy || (typeof window !== 'undefined' ? window.galaxy : null);
    const player = env.player || (typeof window !== 'undefined' ? window.player : null);

    const econ = system.economyType || system.economy || 'Unknown';
    const sec = system.securityLevel || 'Unknown';
    const tech = Number.isFinite(system.techLevel) ? system.techLevel : '?';

    // (Planet list removed — summaries focus on system type and activity)

    // --- Include a short, high-level mission overview (no numbers or examples) ---
    let missionSummary = '';
    try {
        if (typeof system.getAvailableMissions === 'function' && galaxy && player) {
            const missions = system.getAvailableMissions(galaxy, player) || [];
            if (missions.length > 0) {
                const cats = new Set();
                for (const m of missions) {
                    const t = (m.type || m.typeName || '').toString().toLowerCase();
                    if (/assass|sabot|bounty|attack|kill/.test(t)) cats.add('combat');
                    else if (/trade|transport|delivery|haul|cargo/.test(t)) cats.add('trade/transport');
                    else if (/explor|survey|scan|probe|recon/.test(t)) cats.add('exploration');
                    else if (/salvag|recover|mining|collect|harvest/.test(t)) cats.add('salvage/mining');
                    else if (/escort|guard|protect/.test(t)) cats.add('escort');
                    else if (/research|science|investigat/.test(t)) cats.add('research');
                    else cats.add('miscellaneous');
                }
                const list = Array.from(cats).slice(0,3).join(', ');
                missionSummary = list ? `Available missions focus on ${list}.` : 'Available missions cover varied objectives.';
            } else {
                missionSummary = 'No missions currently posted.';
            }
        }
    } catch (e) {
        missionSummary = '';
    }

    // --- Focus on spawn composition (prefer system.spawn/probabilities) and produce a concise noun phrase ---
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

        const labelToNoun = (lbl) => {
            const mapping = {
                'Separatist forces': 'separatist militias',
                'Imperial forces': 'imperial patrols',
                'Police': 'a police presence',
                'Pirates': 'pirate skirmishers',
                'Aliens': 'alien scouts',
                'Haulers': 'freighters and haulers',
                'Transports': 'transport vessels',
                'Escorts/Guards': 'escort vessels',
                'Combat vessels': 'combat patrols',
                'Explorers': 'survey and exploration craft'
            };
            return mapping[lbl] || lbl.toString().toLowerCase();
        };

        // Prefer spawn composition data when available
        let labels = [];
        if (typeof system.getEnemyRoleProbabilities === 'function') {
            const probs = system.getEnemyRoleProbabilities() || {};
            const agg = {};
            for (const [k, v] of Object.entries(probs)) {
                const label = mapRoleToLabel(k);
                agg[label] = (agg[label] || 0) + (Number(v) || 0);
            }
            labels = Object.entries(agg).sort((a,b) => b[1] - a[1]).map(x => x[0]);
        }

        // If spawn probs not available or empty, fall back to currently present enemies
        if ((!labels || labels.length === 0) && Array.isArray(system.enemies) && system.enemies.length > 0) {
            const counts = {};
            for (const e of system.enemies) {
                if (!e) continue;
                const raw = (e.role || e.aiRole || e.shipFaction || e.faction || 'Unknown').toString();
                const label = mapRoleToLabel(raw);
                counts[label] = (counts[label] || 0) + 1;
            }
            labels = Object.entries(counts).sort((a,b) => b[1] - a[1]).map(x => x[0]);
        }

        if (labels && labels.length > 0) {
            // Convert top labels to readable noun phrases and join succinctly
            const phrases = labels.slice(0,3).map(l => labelToNoun(l));
            if (phrases.length === 1) shipSummary = phrases[0];
            else if (phrases.length === 2) shipSummary = phrases[0] + ' and ' + phrases[1];
            else shipSummary = phrases[0] + ', ' + phrases[1] + ', and others';
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

    // Combine missions and ship composition into a single grammatical sentence
    if (missionSummary) {
        let combined = missionSummary.replace(/\.$/, '');
        if (shipSummary) {
            combined = `${combined}, ships in this area include ${shipSummary}.`;
        } else {
            combined = combined + '.';
        }
        lines.push(combined);
    } else if (shipSummary) {
        lines.push(`Ships in this area include ${shipSummary}.`);
    }

    lines.push(mod);

    const desc = lines.join('\n\n');
    try { if (system && typeof system === 'object') system.cachedDescription = desc; } catch (e) { /* ignore */ }
    return desc;
}

// Expose for other modules (global function is fine for this project structure)
window.generateSystemDescription = generateSystemDescription;
