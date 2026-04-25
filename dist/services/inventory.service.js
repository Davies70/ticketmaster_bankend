"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.generateSeats = generateSeats;
exports.getSeatCount = getSeatCount;
exports.getTotalSeatCount = getTotalSeatCount;
exports.validateSectionCapacity = validateSectionCapacity;
const pg_format_1 = __importDefault(require("pg-format"));
async function generateSeats(client, sectionId, config) {
    const seatValues = buildSeatValues(sectionId, config);
    if (seatValues.length === 0) {
        return 0;
    }
    const sqlQuery = (0, pg_format_1.default)(`INSERT INTO seats (section_id, row_number, seat_number) VALUES %L`, seatValues);
    await client.query(sqlQuery);
    return seatValues.length;
}
function getSeatCount(config) {
    return config.totalRows * config.seatsPerRow;
}
function getTotalSeatCount(sections) {
    return sections.reduce((total, section) => total + getSeatCount(section), 0);
}
function validateSectionCapacity(venueCapacity, sections) {
    const totalSeats = getTotalSeatCount(sections);
    if (totalSeats > venueCapacity) {
        throw new Error(`Venue capacity ${venueCapacity} is smaller than generated seats ${totalSeats}`);
    }
}
function buildSeatValues(sectionId, config) {
    const seatValues = [];
    for (let row = 1; row <= config.totalRows; row++) {
        for (let seat = 1; seat <= config.seatsPerRow; seat++) {
            seatValues.push([sectionId, row, seat]);
        }
    }
    return seatValues;
}
//# sourceMappingURL=inventory.service.js.map