// Generates a textual description for a StarSystem for use in overlays
function generateSystemDescription(system, env = {}) {
    if (!system) return '';

    const galaxy = env.galaxy || (typeof window !== 'undefined' ? window.galaxy : null);
    const player = env.player || (typeof window !== 'undefined' ? window.player : null);

    const econ = system.economyType || system.economy || 'Unknown';
    const sec = system.securityLevel || 'Unknown';
    const tech = Number.isFinite(system.techLevel) ? system.techLevel : '?';

    // (Planet list removed — summaries focus on system type and activity)

    // --- Include a short, specific mission overview (mentions concrete types like assassination/sabotage) ---
    let missionSummary = '';
    try {
        if (typeof system.getAvailableMissions === 'function' && galaxy && player) {
            const missions = system.getAvailableMissions(galaxy, player) || [];
            if (missions.length === 0) {
                missionSummary = 'No missions currently posted.';
            } else {
                const types = new Set();
                let hasAssassination = false;
                let hasSabotage = false;
                let hasBounty = false;
                let pirateBountyCount = 0;
                let alienBountyCount = 0;
                let otherBountyCount = 0;

                for (const m of missions) {
                    // Only consider missions that are actually available
                    if (m && m.status && m.status !== 'Available') continue;

                    const t = ((m.type || m.typeName || m.name || m.title) || '').toString().toLowerCase();
                    const desc = ((m.description || m.details || m.notes || '') || '').toString().toLowerCase();

                    // Prefer using canonical mission enum values when available to avoid false positives
                    if (typeof MISSION_TYPE !== 'undefined') {
                        if (m.type === MISSION_TYPE.ASSASSINATION) hasAssassination = true;
                        if (m.type === MISSION_TYPE.SABOTAGE) hasSabotage = true;
                        if (BOUNTY_TYPES && BOUNTY_TYPES.has(m.type)) {
                            hasBounty = true;
                            // Count specific bounty types
                            if (m.type === MISSION_TYPE.BOUNTY_PIRATE) pirateBountyCount += 1;
                            else if (m.type === MISSION_TYPE.BOUNTY_ALIEN) alienBountyCount += 1;
                            else otherBountyCount += 1;
                        }
                    }

                    // Fallback: textual heuristics only if enum checks didn't mark anything
                    if (!hasAssassination && (/assass|kill/.test(t) || /assass|kill/.test(desc))) hasAssassination = true;
                    if (!hasSabotage && (/sabot|sabotage/.test(t) || /sabot|sabotage/.test(desc))) hasSabotage = true;
                    if (!hasBounty && (/bounty/.test(t) || /bounty/.test(desc) || /wanted/.test(desc))) hasBounty = true;

                    if (/(trade|transport|delivery|haul|cargo)/.test(t)) types.add('transport/delivery');
                    if (/escort|guard|protect/.test(t)) types.add('escort');
                    if (/(explor|survey|scan|probe|recon)/.test(t)) types.add('exploration');
                    if (/(salvag|recover|mining|collect|harvest)/.test(t)) types.add('salvage/mining');
                    if (/research|science|investigat/.test(t)) types.add('research');
                    if (/smuggl|contraband|black ?market/.test(t)) types.add('smuggling');
                    if (/recon|intel|investigat/.test(t)) types.add('reconnaissance');
                    if (/repair|refit|deliver|courier/.test(t)) types.add('logistics');

                    // Attempt to detect bounty targets from mission fields or description
                    if (/bounty|wanted/.test(t) || /bounty|wanted/.test(desc) || (BOUNTY_TYPES && BOUNTY_TYPES.has(m.type))) {
                        // Prefer explicit target fields when present
                        const targetText = ((m.targetFaction || (m.target && m.target.faction) || m.target || m.client || m.targetDesc || desc) || '').toString().toLowerCase();
                        if (/pirat/.test(targetText) || (m.type === MISSION_TYPE.BOUNTY_PIRATE)) pirateBountyCount += 1;
                        else if (/(alien|xeno)/.test(targetText) || (m.type === MISSION_TYPE.BOUNTY_ALIEN)) alienBountyCount += 1;
                        else otherBountyCount += 1;
                    }

                    if (types.size >= 10) break;
                }

                // Build a prioritized list of mission phrases
                const parts = [];
                if (hasAssassination) parts.push('assassination');
                if (hasSabotage) parts.push('sabotage');

                // Add other generic types from the types set (up to two shown)
                const others = Array.from(types).slice(0, 2);
                for (const o of others) parts.push(o);

                // Handle bounties with target specificity
                if (hasBounty) {
                    if (pirateBountyCount > alienBountyCount && pirateBountyCount > 0) parts.push('bounties targeting pirates');
                    else if (alienBountyCount > pirateBountyCount && alienBountyCount > 0) parts.push('bounties targeting aliens');
                    else parts.push('bounties');
                }

                if (parts.length > 0) {
                    const pretty = (arr) => {
                        if (arr.length === 1) return arr[0];
                        if (arr.length === 2) return arr[0] + ' and ' + arr[1];
                        return arr.slice(0, 2).join(', ') + ', and ' + (arr.length - 2) + ' others';
                    };
                    missionSummary = `Available missions include ${pretty(parts)}.`;
                } else {
                    missionSummary = 'Available missions cover varied objectives.';
                }
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

        // Prefer spawn composition data from centralized SpawnConfig
        let labels = [];
        if (typeof SpawnConfig !== 'undefined' && typeof SpawnConfig.getProbabilities === 'function') {
            const probs = SpawnConfig.getProbabilities(system.economyType || system.economy, system.securityLevel) || {};
            const agg = {};
            for (const [k, v] of Object.entries(probs)) {
                const label = mapRoleToLabel(k);
                agg[label] = (agg[label] || 0) + (Number(v) || 0);
            }
            labels = Object.entries(agg).sort((a, b) => b[1] - a[1]).map(x => x[0]);
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
            labels = Object.entries(counts).sort((a, b) => b[1] - a[1]).map(x => x[0]);
        }

        if (labels && labels.length > 0) {
            // Convert top labels to readable noun phrases and join succinctly
            const phrases = labels.slice(0, 3).map(l => labelToNoun(l));
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
        'Post Human': 'Unusual technologies and Post Human enclaves influence trade and culture.',
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

    // Attempt to derive two most attractively priced local goods and two most-sought goods
    // "Attractively priced" is computed by comparing local buy price to a galaxy-wide average when available,
    // otherwise falls back to local sell-buy margin.
    // Note: For "most sought-after", we exclude illegal goods in non-Anarchy systems.
    const describeLocalGoods = (sys, gal) => {
        // Check if this system allows illegal goods trading
        const secLevel = sys?.securityLevel || 'Unknown';
        const allowsIllegal = secLevel === 'Anarchy';
        try {
            let market = null;
            if (sys && sys.market) market = sys.market;
            else if (sys && sys.localMarket) market = sys.localMarket;
            else if (sys && sys.marketData) market = sys.marketData;
            else if (sys && sys.station && sys.station.market) market = sys.station.market;
            else if (Array.isArray(sys.stations)) {
                for (const s of sys.stations) if (s && s.market) { market = s.market; break; }
            } else if (gal && typeof gal.getMarketForSystem === 'function') market = gal.getMarketForSystem(sys) || null;

            let entries = [];
            if (market) {
                if (Array.isArray(market.goods)) entries = market.goods;
                else if (Array.isArray(market.prices)) entries = market.prices;
                else if (Array.isArray(market.items)) entries = market.items;
                else if (Array.isArray(market.listings)) entries = market.listings;
                else if (Array.isArray(market.tradeGoods)) entries = market.tradeGoods;
                else if (typeof market.getPrices === 'function') entries = market.getPrices() || [];
                else if (typeof market.toArray === 'function') entries = market.toArray() || [];
                else if (market && typeof market === 'object') entries = Object.values(market);
            }

            if ((!entries || entries.length === 0) && Array.isArray(sys.commodities)) entries = sys.commodities;
            if ((!entries || entries.length === 0) && Array.isArray(sys.tradeGoods)) entries = sys.tradeGoods;

            const parseNum = v => {
                if (v === null || v === undefined) return NaN;
                if (typeof v === 'string') v = v.replace(/,/g, '').trim();
                return parseFloat(v);
            };

            const parsed = entries.map(it => {
                if (!it) return null;
                let name = it.name || it.id || it.commodity || it.commodityName || (typeof it === 'string' ? it : null);
                let buyRaw = it.buyPrice ?? it.purchasePrice ?? it.priceBuy ?? it.price ?? it.buy ?? it.b;
                let sellRaw = it.sellPrice ?? it.priceSell ?? it.sell ?? it.s;
                let demandRaw = it.demand ?? it.demandLevel ?? it.want ?? it.demandScore ?? it.d;
                if (!name && it.commodity && typeof it.commodity === 'object') name = it.commodity.name || it.commodity.id;
                const buy = parseNum(buyRaw);
                const sell = parseNum(sellRaw);
                const demand = parseNum(demandRaw);
                return name ? { name, buy: Number.isFinite(buy) ? buy : null, sell: Number.isFinite(sell) ? sell : null, demand: Number.isFinite(demand) ? demand : 0 } : null;
            }).filter(Boolean);

            if (parsed.length === 0) return '';

            // Build galaxy averages for both buy and sell prices
            const galaxyAvgBuy = {};
            const galaxyAvgSell = {};
            try {
                if (gal && Array.isArray(gal.systems)) {
                    const collectorBuy = {};
                    const collectorSell = {};
                    for (const s of gal.systems) {
                        if (!s) continue;
                        let m = null;
                        if (s.market) m = s.market;
                        else if (s.localMarket) m = s.localMarket;
                        else if (s.marketData) m = s.marketData;
                        else if (s.station && s.station.market) m = s.station.market;
                        if (!m) continue;
                        let ents = [];
                        if (Array.isArray(m.goods)) ents = m.goods;
                        else if (Array.isArray(m.prices)) ents = m.prices;
                        else if (Array.isArray(m.items)) ents = m.items;
                        else if (typeof m.getPrices === 'function') ents = m.getPrices() || [];
                        else if (m && typeof m === 'object') ents = Object.values(m);
                        for (const it of ents || []) {
                            if (!it) continue;
                            const nm = it.name || it.id || it.commodity || (it.commodity && it.commodity.name) || (typeof it === 'string' ? it : null);
                            const b = parseNum(it.buyPrice ?? it.purchasePrice ?? it.priceBuy ?? it.price ?? it.buy ?? it.b);
                            const s = parseNum(it.sellPrice ?? it.priceSell ?? it.sell ?? it.s);
                            if (!nm) continue;
                            if (Number.isFinite(b)) {
                                collectorBuy[nm] = collectorBuy[nm] || { sum: 0, count: 0 };
                                collectorBuy[nm].sum += b;
                                collectorBuy[nm].count += 1;
                            }
                            if (Number.isFinite(s)) {
                                collectorSell[nm] = collectorSell[nm] || { sum: 0, count: 0 };
                                collectorSell[nm].sum += s;
                                collectorSell[nm].count += 1;
                            }
                        }
                    }
                    for (const [k, v] of Object.entries(collectorBuy)) galaxyAvgBuy[k] = v.sum / v.count;
                    for (const [k, v] of Object.entries(collectorSell)) galaxyAvgSell[k] = v.sum / v.count;
                }
            } catch (e) { /* ignore galaxy parse errors */ }

            // Attractively priced = local buy price BELOW galaxy average (good deals to buy here)
            const attractiveScored = parsed.map(p => {
                let discountPercent = 0;
                if (Number.isFinite(p.buy) && p.buy > 0 && galaxyAvgBuy[p.name] && galaxyAvgBuy[p.name] > 0) {
                    // Percentage discount: (average - local) / average
                    // Higher percentage = better deal
                    discountPercent = (galaxyAvgBuy[p.name] - p.buy) / galaxyAvgBuy[p.name];
                }
                return { ...p, discountPercent };
            });
            const attractive = attractiveScored.slice()
                .filter(p => p.discountPercent > 0)  // Only goods cheaper than galaxy average
                .sort((a, b) => b.discountPercent - a.discountPercent)  // Sort by biggest % discount first
                .slice(0, 2)
                .map(p => p.name);

            // For "most sought-after", exclude illegal goods in non-Anarchy systems
            const legalForSought = allowsIllegal
                ? parsed
                : parsed.filter(p => {
                    // Use isCommodityLegal if available, otherwise assume legal
                    if (typeof isCommodityLegal === 'function') {
                        return isCommodityLegal(p.name);
                    }
                    return true;
                });

            // Most sought-after = local sell price ABOVE galaxy average (what this system pays premium for)
            const soughtScored = legalForSought.map(p => {
                let premiumPercent = 0;
                if (Number.isFinite(p.sell) && p.sell > 0 && galaxyAvgSell[p.name] && galaxyAvgSell[p.name] > 0) {
                    // Percentage premium: (local - average) / average
                    // Higher percentage = better profit opportunity
                    premiumPercent = (p.sell - galaxyAvgSell[p.name]) / galaxyAvgSell[p.name];
                }
                return { ...p, premiumPercent };
            });
            const sought = soughtScored.slice()
                .filter(p => p.premiumPercent > 0)  // Only goods that pay more than galaxy average
                .sort((a, b) => b.premiumPercent - a.premiumPercent)  // Sort by biggest % premium first
                .slice(0, 2)
                .map(p => p.name);

            if ((attractive && attractive.length > 0) || (sought && sought.length > 0)) {
                const attractText = attractive.length === 2 ? `${attractive[0]} and ${attractive[1]}` : (attractive[0] || 'varied goods');
                const soughtText = sought.length === 2 ? `${sought[0]} and ${sought[1]}` : (sought[0] || 'varied items');
                return `Locally, the most attractively priced goods are ${attractText}; the most sought-after are ${soughtText}.`;
            }
        } catch (e) {
            // ignore and return nothing
        }
        return '';
    };

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
    const hashStr = (s) => {
        let h = 5381;
        for (let i = 0; i < s.length; i++) h = ((h << 5) + h) + s.charCodeAt(i);
        return h >>> 0;
    };
    // Rotate tone modifiers over time and vary by system so repeated calls show different lines
    const rotationWindowMinutes = 5; // change modifier every 5 minutes
    const rotation = Math.floor(Date.now() / (1000 * 60 * rotationWindowMinutes));
    const seed = (system.name || '') + '|' + (system.systemIndex || 0);
    const idx = toneModifiers.length ? (hashStr(seed) + rotation) % toneModifiers.length : 0;
    const mod = toneModifiers[idx];

    // Assemble description
    const lines = [];
    const goodsSentence = describeLocalGoods(system, galaxy);
    lines.push(econSentence + ' ' + secSentence + (goodsSentence ? ' ' + goodsSentence : ''));

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
