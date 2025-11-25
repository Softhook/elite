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

    // Tone modifiers for backstory variety — expanded with more in-game telemetry flavored lines
    const toneModifiers = [
        'Commodity exchanges report a spike in palladium after a refinery fire in a neighboring system.',
        'Dockworkers staged a short strike at the main orbital yard; expect loading delays.',
        'Local militia recently claimed several derelict mining rigs as contested territory.',
        'An Imperial task force ran exercises near the outer routes; patrols are denser than usual.',
        'Smugglers use a mapped asteroid cluster as transfer points for contraband runs.',
        'Scientists reported anomalous subspace readings near the inner Lagrange point.',
        'Tourism is up following the opening of a new orbital casino and entertainment arcology.',
        'A rash of hull thefts has targeted small freighters at remote waystations.',
        'Rare fauna sightings on a cold moon have attracted xenobiologists and collectors.',
        'A temporary trade embargo caused shortages of refined fuel at local depots.',
        'Salvage crews are competing over a recently discovered wreck in the unclaimed belt.',
        'A recent meteor shower boosted yields for small prospecting operations.',
        'An unregistered AI probe has been transmitting from an abandoned comm relay.',
        'A memorial festival commemorates last year\'s orbital disaster; crowds swell the stations.',
        'Mercenary recruiters are offering above-market bounties for escort work.',
        'Hydroponic pests damaged several shipments, touching off higher food prices.',
        'A corporate auction for a rare drive core attracted bidders from three systems.',
        'A stealth pirate gang has been striking convoys on inner jump lanes.',
        'Long-range scans picked up an unmapped jump signature that vanished on approach.',
        'Insurance offices report a rise in fraudulent cargo-loss claims this cycle.',
        'A geologist\'s crew returned with samples of glowing crystalline formations.',
        'Quarantine protocols were briefly enforced after an unknown pathogen scare.',
        'Dockside gambling disputes escalated into low-orbit skirmishes last week.',
        'A new shipwright opened offering competitive prices for hull refits.',
        'An ascetic sect established a small settlement on a frozen moon.',
        'Cargo manifests show rising demand for medical supplies and precision electronics.',
        'A charity convoy from a neighboring system arrived to assist outlying colonies.',
        'A high-value corporate convoy transited under heavy escort this morning.',
        'Astrogation charts were revised after a recent re-survey of outer routes.',
        'Unlicensed refineries sell cheap fuel but with elevated contamination risk.',
        'A notorious bounty hunter has been seen at the local cantina.',
        'A technical symposium showcased experimental sensor arrays and drive tweaks.',
        'Telecom outages intermittently disrupt long-distance contract negotiations.',
        'A coalition of independent haulers is negotiating for lower docking fees.',
        'Local farmers are celebrating a bumper crop season with public markets.',
        'Hidden black market auctions for artifacts happen in abandoned stations.',
        'Cargo-skimming incidents suggest a new pirate modification is in widespread use.',
        'A starport expansion increased docking capacity but raised transit tariffs.',
        'An old navigation beacon reactivated and altered traffic patterns near the rim.',
        'Surveyors report volatile microstorm activity in nearby nebulae, hampering sensors.',
        'An excavation uncovered ruins that drew archaeologists and relic hunters.',
        'A small courier cartel controls preferred lanes between two trade hubs.',
        'Local rumor: a hidden cache of pre-collapse tech changed hands at auction.',
        'Veteran pilots warn newcomers about stronger pirate activity on the outer routes.',
        'A mysterious data-broker leaked schematics for an unlicensed sensor suite.',
        'Charter flights noted increased passenger bookings for a luxury orbital resort.',
        'A refugee flow from a nearby conflict has pressured local markets and services.',
        'An experimental drive test emitted atypical radiation signatures.',
        'Privateers recently received letters-of-marque for contested route patrols.',
        'A hull-modding convention brought dozens of independent engineers to the docks.',
        'Reports of drone-swarm harvesting failures closed several prospecting operations.',
        'A small cult reclaimed a derelict study dome to perform ritual data burns.',
        'Customs checkpoints increased inspections after altered cargo manifests were found.',
        'A seasonal fishing festival created unusual demand for preservation supplies.',
        'A rogue weather cell caused localized radiation spikes near the rimward stations.',
        'An art gala displayed recovered pre-collapse mosaics, drawing crowds and collectors.',
        'Automated salvage drones began returning corrupted logs to their owners.',
        'An orbital construction mishap delayed a new hangar by several cycles.',
        'A corporate espionage sting led to several arrests at the port authority.',
        'A secret meeting of independent captains negotiated an unofficial convoy tariff.',
        'A small astro-archaeology team published intriguing inscriptions from a moon site.',
        'Fuel tanker contamination prompted a temporary ban on long-haul departures.',
        'A charity regatta raised funds for underfunded outpost medical clinics.',
        'A trader cartel disguised shipments under humanitarian cover this cycle.',
        'Nav beacons briefly drifted off-grid after a solar flare impacted calibration.',
        'A new sensor patch improved scanning resolution for orbital surveyors.',
        'A smuggled prototype engine changed hands in an unsanctioned auction.',
        'A burst of pirate propaganda flooded local comms, raising tension at taverns.',
        'A newly mapped micro-void created a shortcut used by small craft.',
        'Tavern gossip mentions a lost navigator who found a hidden jump point.',
        'A minor riot followed a disputed election for the station council.',
        'An old researchers\' institute reopened with funding from a private benefactor.',
        'A secret salvage-rights auction drew bidders from three different factions.',
        'Reports indicate an uptick in forged insurance claims among small traders.',
        'A decommissioned relay was retrofitted into an illegal comm hub.'
    ];
    const mod = toneModifiers[(system.systemIndex || 0) % toneModifiers.length];

    // Assemble description
    const lines = [];
    lines.push(econSentence + ' ' + secSentence);

    // Combine missions and ship composition: keep ship sentence separate but on same paragraph
    if (missionSummary) {
        const ms = missionSummary.replace(/\.$/, '') + '.';
        if (shipSummary) {
            lines.push(ms + ' ' + `Ships in this area include ${shipSummary}.`);
        } else {
            lines.push(ms);
        }
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
