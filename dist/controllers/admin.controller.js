"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.createAdminEvent = exports.createAdminVenueLayout = exports.createAdminVenue = void 0;
const events_service_1 = require("../services/events.service");
const venues_service_1 = require("../services/venues.service");
const admin_validator_1 = require("../validators/admin.validator");
function sendValidationError(res, error) {
    return res.status(400).json({
        error: "Validation failed",
        details: error.issues,
    });
}
const createAdminVenue = async (req, res) => {
    try {
        const parsed = admin_validator_1.createVenueSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }
        const venue = await (0, venues_service_1.createVenue)({
            name: parsed.data.name,
            address: parsed.data.address,
            city: parsed.data.city,
            state: parsed.data.state,
            zipCode: parsed.data.zip_code,
            capacity: parsed.data.capacity,
        });
        return res.status(201).json({
            message: "Venue created successfully",
            data: venue,
        });
    }
    catch (error) {
        console.error("Create Venue Error:", error);
        return res.status(500).json({ error: "Failed to create venue" });
    }
};
exports.createAdminVenue = createAdminVenue;
const createAdminVenueLayout = async (req, res) => {
    try {
        const parsed = admin_validator_1.createVenueLayoutSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }
        const result = await (0, venues_service_1.createVenueWithLayout)({
            name: parsed.data.name,
            address: parsed.data.address,
            city: parsed.data.city,
            state: parsed.data.state,
            zipCode: parsed.data.zip_code,
            capacity: parsed.data.capacity,
            sections: parsed.data.sections,
        });
        return res.status(201).json({
            message: "Venue, sections, and seats created successfully",
            data: result,
        });
    }
    catch (error) {
        console.error("Create Venue Layout Error:", error);
        if (error instanceof Error) {
            return res.status(400).json({ error: error.message });
        }
        return res.status(500).json({ error: "Failed to create venue layout" });
    }
};
exports.createAdminVenueLayout = createAdminVenueLayout;
const createAdminEvent = async (req, res) => {
    try {
        const parsed = admin_validator_1.createEventSchema.safeParse(req.body);
        if (!parsed.success) {
            return sendValidationError(res, parsed.error);
        }
        const event = await (0, events_service_1.createEvent)({
            venueId: parsed.data.venue_id,
            name: parsed.data.name,
            eventDate: parsed.data.event_date,
            ...(parsed.data.description
                ? { description: parsed.data.description }
                : {}),
        });
        return res.status(201).json({
            message: "Event created successfully",
            data: event,
        });
    }
    catch (error) {
        console.error("Admin Controller Error:", error);
        return res.status(500).json({ error: "Failed to create event" });
    }
};
exports.createAdminEvent = createAdminEvent;
//# sourceMappingURL=admin.controller.js.map