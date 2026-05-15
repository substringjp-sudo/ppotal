"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAccommodationSlice = void 0;
const common_1 = require("../../types/common");
const region_service_1 = require("../../lib/region-service");
const utils_1 = require("../utils");
const createAccommodationSlice = (set, get) => ({
    addAccommodation: async (data) => {
        const ids = await (0, region_service_1.resolveRegionIdsFromLocation)(data.location, data.lat, data.lng);
        (0, utils_1.updateTripState)(set, get, (draft) => {
            const newAcc = {
                id: (0, common_1.generateId)(),
                name: '',
                location: '',
                startDate: draft.dates.startDate,
                endDate: draft.dates.endDate,
                color: 'primary',
                status: 'tentative',
                type: 'hotel',
                ...data,
                ...ids
            };
            draft.accommodation.push(newAcc);
        });
    },
    updateAccommodation: async (id, updates) => {
        // Prepare resolved IDs if relevant fields updated
        const ids = (updates.location || (updates.lat !== undefined && updates.lng !== undefined))
            ? await (0, region_service_1.resolveRegionIdsFromLocation)(updates.location, updates.lat, updates.lng)
            : null;
        (0, utils_1.updateTripState)(set, get, (draft) => {
            const acc = draft.accommodation.find(a => a.id === id);
            if (!acc)
                return;
            Object.assign(acc, updates);
            if (ids) {
                Object.assign(acc, ids);
            }
        });
    },
    removeAccommodation: (id) => (0, utils_1.updateTripState)(set, get, (draft) => {
        draft.accommodation = draft.accommodation.filter(a => a.id !== id);
    })
});
exports.createAccommodationSlice = createAccommodationSlice;
