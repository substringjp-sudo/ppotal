const fs = require('fs');
const path = require('path');

const jsonPath = path.join(__dirname, '../public/systematic_railroad_network.json');
const data = JSON.parse(fs.readFileSync(jsonPath, 'utf8'));

const testStations = [
    '西日本旅客鉄道::東海道線::京都',
    '東日本旅客鉄道::東北線::東京',
    '沖縄都市モノレール::沖縄都市モノレール線::那覇空港'
];

testStations.forEach(id => {
    console.log(`Station ${id}:`, JSON.stringify(data.stations[id], null, 2));
});
