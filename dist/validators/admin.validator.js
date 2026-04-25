"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createEventSchema = exports.createVenueLayoutSchema = exports.createVenueSchema = void 0;
const zod_1 = require("zod");
const nonEmptyString = zod_1.z.string().trim().min(1);
exports.createVenueSchema = zod_1.z.object({
    name: nonEmptyString,
    address: nonEmptyString,
    city: nonEmptyString,
    state: nonEmptyString,
    zip_code: nonEmptyString,
    capacity: zod_1.z.coerce.number().int().positive(),
});
const createSectionSchema = zod_1.z.object({
    name: nonEmptyString,
    totalRows: zod_1.z.coerce.number().int().positive(),
    seatsPerRow: zod_1.z.coerce.number().int().positive(),
});
exports.createVenueLayoutSchema = exports.createVenueSchema.extend({
    sections: zod_1.z.array(createSectionSchema).min(1),
});
exports.createEventSchema = zod_1.z.object({
    venue_id: zod_1.z.string().uuid(),
    name: nonEmptyString,
    description: zod_1.z.string().trim().optional(),
    event_date: zod_1.z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
        message: "event_date must be a valid ISO-8601 date string",
    }),
});
//# sourceMappingURL=admin.validator.js.map