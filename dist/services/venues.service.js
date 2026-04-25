"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createVenueWithLayout = exports.createVenue = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const inventory_service_js_1 = require("./inventory.service.js");
const createVenue = async (input) => {
    const { name, address, city, state, zipCode, capacity } = input;
    const result = await db_js_1.default.query(`
      INSERT INTO venues (name, address, city, state, zip_code, capacity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, address, city, state, zip_code, capacity, created_at
    `, [name, address, city, state, zipCode, capacity]);
    return result.rows[0];
};
exports.createVenue = createVenue;
const createVenueWithLayout = async (input) => {
    (0, inventory_service_js_1.validateSectionCapacity)(input.capacity, input.sections);
    const client = await db_js_1.default.connect();
    try {
        await client.query("BEGIN");
        const venue = await createVenueRecord(client, input);
        const sections = [];
        let totalSeatsGenerated = 0;
        for (const section of input.sections) {
            const createdSection = await createSectionRecord(client, venue.id, section.name);
            const seatsCreated = await (0, inventory_service_js_1.generateSeats)(client, createdSection.id, {
                totalRows: section.totalRows,
                seatsPerRow: section.seatsPerRow,
            });
            totalSeatsGenerated += seatsCreated;
            sections.push({
                ...createdSection,
                totalRows: section.totalRows,
                seatsPerRow: section.seatsPerRow,
                seatsCreated,
            });
        }
        await client.query("COMMIT");
        return {
            venue,
            sections,
            totalSectionsCreated: sections.length,
            totalSeatsGenerated,
        };
    }
    catch (error) {
        await client.query("ROLLBACK");
        throw error;
    }
    finally {
        client.release();
    }
};
exports.createVenueWithLayout = createVenueWithLayout;
async function createVenueRecord(client, input) {
    const result = await client.query(`
      INSERT INTO venues (name, address, city, state, zip_code, capacity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, address, city, state, zip_code, capacity, created_at
    `, [
        input.name,
        input.address,
        input.city,
        input.state,
        input.zipCode,
        input.capacity,
    ]);
    return result.rows[0];
}
async function createSectionRecord(client, venueId, name) {
    const result = await client.query(`
      INSERT INTO sections (venue_id, name)
      VALUES ($1, $2)
      RETURNING id, venue_id, name, created_at
    `, [venueId, name]);
    return result.rows[0];
}
//# sourceMappingURL=venues.service.js.map