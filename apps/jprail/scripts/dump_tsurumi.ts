import fs from 'fs';
// We just want to extract the coordinates that they'd get in getBranchDirection.
const rawData = fs.readFileSync('/Users/yunhyeongseob/dev/jprail/public/rail/railroad_network.json', 'utf8');
const data = JSON.parse(rawData);
const nodes = data.nodes;

const station_ids = ['004531', '004522', '004547', '004564', '004540', '004517'];
for (const sid of station_ids) {
    if (nodes[sid]) {
        console.log(`Station ${sid}: lat=${nodes[sid].lat}, lon=${nodes[sid].lon}`);
    }
}
