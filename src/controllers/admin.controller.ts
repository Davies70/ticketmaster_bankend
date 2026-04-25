import { Request, Response } from "express";
import { createEvent } from "../services/events.service";
import { createVenue, createVenueWithLayout } from "../services/venues.service";
import {
  createEventSchema,
  createVenueLayoutSchema,
  createVenueSchema,
} from "../validators/admin.validator";

/**
 * Sends a validation error response with details.
 * @param res - The Express response object.
 * @param error - The validation error containing issues.
 * @returns The response with validation error details.
 */
function sendValidationError(res: Response, error: { issues: unknown }) {
  return res.status(400).json({
    error: "Validation failed",
    details: error.issues,
  });
}

/**
 * Creates a new venue via admin endpoint.
 * Validates the request body and creates a venue in the database.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @returns A JSON response with the created venue or an error.
 */
export const createAdminVenue = async (req: Request, res: Response) => {
  try {
    const parsed = createVenueSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const venue = await createVenue({
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
  } catch (error) {
    console.error("Create Venue Error:", error);
    return res.status(500).json({ error: "Failed to create venue" });
  }
};

/**
 * Creates a venue with its layout including sections and seats via admin endpoint.
 * Validates the request body and creates venue, sections, and generates seats in a transaction.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @returns A JSON response with the created venue layout or an error.
 */
export const createAdminVenueLayout = async (req: Request, res: Response) => {
  try {
    const parsed = createVenueLayoutSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const result = await createVenueWithLayout({
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
  } catch (error) {
    console.error("Create Venue Layout Error:", error);
    if (error instanceof Error) {
      return res.status(400).json({ error: error.message });
    }

    return res.status(500).json({ error: "Failed to create venue layout" });
  }
};

/**
 * Creates a new event via admin endpoint.
 * Validates the request body and creates an event in the database.
 * @param req - The Express request object.
 * @param res - The Express response object.
 * @returns A JSON response with the created event or an error.
 */
export const createAdminEvent = async (req: Request, res: Response) => {
  try {
    const parsed = createEventSchema.safeParse(req.body);
    if (!parsed.success) {
      return sendValidationError(res, parsed.error);
    }

    const event = await createEvent({
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
  } catch (error) {
    console.error("Admin Controller Error:", error);
    return res.status(500).json({ error: "Failed to create event" });
  }
};
