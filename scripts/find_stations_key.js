const fs = require('fs');
const readline = require('readline');

async function findStations() {
    const rl = readline.createInterface({
        input: fs.createReadStream('h:/jprail/public/systematic_railroad_network.json'),
        terminal: false
    });

    let lineNum = 0;
    for await (const line of rl) {
        lineNum++;
        if (line.includes('"stations": {')) {
            console.log(`Found stations at line ${lineNum}: ${line.substring(0, 100)}`);
            // Show a bit more context
            process.exit(0);
        }
    }
}

findStations();
