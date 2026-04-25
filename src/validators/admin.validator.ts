import { z } from "zod";

/**
 * Zod schema for validating non-empty strings after trimming whitespace.
 */
const nonEmptyString = z.string().trim().min(1);

/**
 * Zod schema for validating venue creation input.
 * Requires name, address, city, state, zip_code, and positive integer capacity.
 */
export const createVenueSchema = z.object({
  name: nonEmptyString,
  address: nonEmptyString,
  city: nonEmptyString,
  state: nonEmptyString,
  zip_code: nonEmptyString,
  capacity: z.coerce.number().int().positive(),
});

/**
 * Zod schema for validating section creation input.
 * Requires name, positive integer totalRows, and positive integer seatsPerRow.
 */
const createSectionSchema = z.object({
  name: nonEmptyString,
  totalRows: z.coerce.number().int().positive(),
  seatsPerRow: z.coerce.number().int().positive(),
});

/**
 * Zod schema for validating venue layout creation input.
 * Extends createVenueSchema with an array of at least one section.
 */
export const createVenueLayoutSchema = createVenueSchema.extend({
  sections: z.array(createSectionSchema).min(1),
});

/**
 * Zod schema for validating event creation input.
 * Requires venue_id (UUID), name, optional description, and valid ISO-8601 event_date.
 */
export const createEventSchema = z.object({
  venue_id: z.string().uuid(),
  name: nonEmptyString,
  description: z.string().trim().optional(),
  event_date: z.string().refine((value) => !Number.isNaN(Date.parse(value)), {
    message: "event_date must be a valid ISO-8601 date string",
  }),
});
