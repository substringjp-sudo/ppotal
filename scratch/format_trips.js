function toFirestoreValue(val) {
    if (typeof val === 'string') return { stringValue: val };
    if (typeof val === 'number') {
        if (Number.isInteger(val)) return { integerValue: val.toString() };
        return { doubleValue: val };
    }
    if (typeof val === 'boolean') return { booleanValue: val };
    if (Array.isArray(val)) return { arrayValue: { values: val.map(toFirestoreValue) } };
    if (val === null) return { nullValue: null };
    if (typeof val === 'object') {
        const fields = {};
        for (const k in val) {
            fields[k] = toFirestoreValue(val[k]);
        }
        return { mapValue: { fields } };
    }
    return { stringValue: String(val) };
}

function toFirestoreDoc(obj) {
    const fields = {};
    for (const k in obj) {
        fields[k] = toFirestoreValue(obj[k]);
    }
    return { fields };
}

const kaseTrip1 = {
    date: "2026-04-26",
    id: "trip-1777178309288",
    metadata: {
        endStationId: "005685",
        source: "jprail_migration",
        startStationId: "006128",
        startCoord: [138.389675, 34.971742],
        endCoord: [139.078168, 35.104413]
    },
    segments: [{
        points: [[138.389675, 34.971742], [139.078168, 35.104413]],
        type: "publicTransport"
    }],
    title: "Shizuoka to Atami",
    userId: "wX87XDtCJIX759PdsraxrOnD7lO2"
};

const kaseTrip2 = {
    date: "2026-04-26",
    id: "trip-1777178411176",
    metadata: {
        endStationId: "005157",
        source: "jprail_migration",
        startStationId: "005689",
        startCoord: [138.860477, 35.10304],
        endCoord: [139.214955, 35.281395]
    },
    segments: [{
        points: [[138.860477, 35.10304], [139.214955, 35.281395]],
        type: "publicTransport"
    }],
    title: "Numazu to Kozu",
    userId: "wX87XDtCJIX759PdsraxrOnD7lO2"
};

console.log("KASE 1:");
console.log(JSON.stringify(toFirestoreDoc(kaseTrip1)));
console.log("\nKASE 2:");
console.log(JSON.stringify(toFirestoreDoc(kaseTrip2)));
