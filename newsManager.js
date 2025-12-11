// ****** newsManager.js ******
// Handles the generation and storage of in-game news reports (The Galactic Echo)

class NewsManager {
    constructor() {
        this.newsItems = [];
        this.maxNewsItems = 20;
        
        // Factional biases for report generation
        this.factions = {
            IMPERIAL: {
                name: "The Core Echo",
                tone: "Formal, authoritative",
                bias: "Order, Efficiency, Imperial Control",
                color: [100, 150, 255]
            },
            SEPARATIST: {
                name: "Free Flow Channel",
                tone: "Agitative, populist",
                bias: "Resistance, Anti-Exploitation",
                color: [255, 100, 100]
            },
            INDEPENDENT: {
                name: "The Freight Log",
                tone: "Pragmatic, commodity-focused",
                bias: "Profit, Supply Chain, Risk",
                color: [200, 200, 200]
            }
        };

        // Initialize with some dummy news if empty
        this._addInitialNews();
    }

    _addInitialNews() {
        this.addNewsItem({
            type: "GENERAL",
            text: "Galactic Echo systems online. Monitoring resource flows.",
            timestamp: Date.now() - 10000000
        });
    }

    /**
     * Adds a new news item based on a game event
     * @param {Object} eventData - Data about the event
     * @param {string} eventData.type - Event type (e.g., 'PIRATE_RAID', 'MARKET_SHORTAGE')
     * @param {string} eventData.text - Raw event text
     * @param {string} eventData.systemName - System where it happened
     * @param {string} eventData.stationName - Station involved
     * @param {string} eventData.commodity - Commodity involved
     */
    addNewsItem(eventData) {
        const report = this._generateReport(eventData);
        
        this.newsItems.unshift({
            ...report,
            timestamp: Date.now(),
            read: false
        });

        if (this.newsItems.length > this.maxNewsItems) {
            this.newsItems.pop();
        }
    }

    /**
     * Generates a hermeneutic report based on the event
     * @param {Object} data 
     * @returns {Object} Report with title, body, and source
     */
    _generateReport(data) {
        // Select a random perspective for variety, or based on event type
        const perspectives = Object.keys(this.factions);
        const chosenFactionKey = perspectives[Math.floor(Math.random() * perspectives.length)];
        const faction = this.factions[chosenFactionKey];

        let title = "Breaking News";
        let body = data.text;

        // Hermeneutic transformation based on event type
        switch (data.type) {
            case 'PIRATE_SWARM':
            case 'PIRATE_RAID':
                if (chosenFactionKey === 'IMPERIAL') {
                    title = "Criminal Anarchy Threatens Supply Chain";
                    body = `Imperial command reports illegal seizure attempts in ${data.systemName}. Such disruption to the material flow constitutes a direct attack on the prosperity of the Core. Order will be restored.`;
                } else if (chosenFactionKey === 'SEPARATIST') {
                    title = "Resistance or Banditry?";
                    body = `Reports from ${data.systemName} indicate increased privateering. While the Empire calls them pirates, some see desperate acts of resource reclamation against a monopoly that starves the fringe.`;
                } else {
                    title = "Transit Risk Advisory: High";
                    body = `Haulers beware: ${data.systemName} is hot. Insurance premiums are spiking as local security fails to secure the lanes. Calculate your margins carefully before jumping in.`;
                }
                break;

            case 'MARKET_SHORTAGE':
                if (chosenFactionKey === 'IMPERIAL') {
                    title = "Production Quotas Missed";
                    body = `Inefficiency in ${data.stationName} has led to a temporary deficit of ${data.commodity}. Central planning assures that reallocation protocols are in effect to restore optimal stock levels.`;
                } else if (chosenFactionKey === 'SEPARATIST') {
                    title = "Artificial Scarcity?";
                    body = `The so-called 'shortage' of ${data.commodity} at ${data.stationName} is another example of Imperial resource hoarding. They starve us to keep prices high and control absolute.`;
                } else {
                    title = "Market Opportunity: High Demand";
                    body = `Supply crunch for ${data.commodity} at ${data.stationName}. Prices are climbing. If you're holding stock, now is the time to sell. Fast turnaround recommended.`;
                }
                break;

            case 'MARKET_SURPLUS':
            case 'MINING_BOOM':
                if (chosenFactionKey === 'IMPERIAL') {
                    title = "Production Efficiency Exceeds Targets";
                    body = `The ${data.stationName} facility reports a surplus of ${data.commodity || 'resources'}, demonstrating the superiority of Imperial extraction logistics. Stability is wealth.`;
                } else if (chosenFactionKey === 'SEPARATIST') {
                    title = "Resource Glut Devalues Labor";
                    body = `A massive influx of ${data.commodity || 'ore'} at ${data.stationName} is crashing local prices. Good for the buyers, but the miners are seeing their labor value extracted for pennies.`;
                } else {
                    title = "Price Crash Alert";
                    body = `Oversupply of ${data.commodity || 'materials'} at ${data.stationName}. Sell orders are flooding the board. Avoid offloading here unless you want to take a loss. Buy low if you have the hold space.`;
                }
                break;
            
            case 'POLICE_ACTION':
            case 'SMUGGLING_BUST':
                if (chosenFactionKey === 'IMPERIAL') {
                    title = "Law and Order Upheld";
                    body = `Security forces in ${data.systemName} have successfully interdicted illegal contraband flow. The state monopoly on regulated goods remains secure against criminal arbitrage.`;
                } else if (chosenFactionKey === 'SEPARATIST') {
                    title = "State Oppression Continues";
                    body = `Another crackdown in ${data.systemName}. What they call 'smuggling' is often just free trade without the Imperial tax stamp. The grip tightens.`;
                } else {
                    title = "Customs Checkpoints Active";
                    body = `Heavy police presence reported in ${data.systemName}. If you're running grey-market goods, steer clear. Delays and cargo seizures are impacting delivery schedules.`;
                }
                break;

            default:
                // Generic fallback using the raw text but framed
                title = `Report: ${data.type.replace(/_/g, ' ')}`;
                body = `${faction.name} reporting: ${data.text}`;
                break;
        }

        return {
            title: title,
            body: body,
            source: faction.name,
            sourceColor: faction.color
        };
    }

    getNewsItems() {
        return this.newsItems;
    }
}
