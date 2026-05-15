
const fs = require('fs');
const path = require('path');

const treePath = path.resolve(__dirname, '../../../web/public/data/region/tree.json');
const treeData = JSON.parse(fs.readFileSync(treePath, 'utf8'));

const countriesToFind = [
    'South Korea', 'Japan', 'Hong Kong', 'Taiwan', 'Thailand', 
    'Vietnam', 'Singapore', 'United Kingdom', 'France', 'United States'
];

const results = {};

countriesToFind.forEach(name => {
    const found = treeData.find(c => {
        const cName = c.name.toLowerCase();
        const n = name.toLowerCase();
        return cName === n || 
               (n === 'south korea' && cName === 'korea south') ||
               (n === 'united states' && cName === 'united states of america') ||
               (n === 'taiwan' && cName.includes('taiwan'));
    });
    if (found) {
        results[name] = found.id;
    }
});

console.log(JSON.stringify(results, null, 2));
