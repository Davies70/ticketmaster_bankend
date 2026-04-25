"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEvent = void 0;
const db_js_1 = __importDefault(require("../config/db.js"));
const createEvent = async (input) => {
    const { venueId, name, eventDate, description } = input;
    const result = await db_js_1.default.query(`
      INSERT INTO events (venue_id, name, description, event_date)
      VALUES ($1, $2, $3, $4)
      RETURNING id, venue_id, name, description, event_date, created_at
    `, [venueId, name, description ?? null, eventDate]);
    return result.rows[0];
};
exports.createEvent = createEvent;
//# sourceMappingURL=events.service.js.map