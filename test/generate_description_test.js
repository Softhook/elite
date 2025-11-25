const fs = require('fs');
const vm = require('vm');

const file = fs.readFileSync(__dirname + '/../systemDescription.js', 'utf8');
const sandbox = { window: {}, console };
vm.createContext(sandbox);
vm.runInContext(file, sandbox);

const generate = sandbox.window.generateSystemDescription;
if (typeof generate !== 'function') {
  console.error('generateSystemDescription not found');
  process.exit(2);
}

const mockSystem = {
  economyType: 'Service',
  securityLevel: 'Medium',
  techLevel: 5,
  systemIndex: 7,
  market: {
    goods: [
      { name: 'Water', buyPrice: 10, sellPrice: 5, demand: 2 },
      { name: 'Food', buyPrice: 15, sellPrice: 8, demand: 3 },
      { name: 'Electronics', buyPrice: 200, sellPrice: 180, demand: 9 },
      { name: 'Medical Supplies', buyPrice: 120, sellPrice: 110, demand: 10 },
      { name: 'Ore', buyPrice: 5, sellPrice: 2, demand: 1 }
    ]
  }
};

const out = generate(mockSystem, { galaxy: null, player: null });
console.log('--- GENERATED DESCRIPTION ---');
console.log(out);
