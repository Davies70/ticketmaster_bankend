import pool from "../config/db.js";

/**
 * Input data required to create a new event.
 */
export interface CreateEventInput {
  venueId: string;
  name: string;
  eventDate: string;
  description?: string;
}

/**
 * Creates a new event in the database.
 * @param input - The event creation data.
 * @returns The created event record with all fields.
 */
export const createEvent = async (input: CreateEventInput) => {
  const { venueId, name, eventDate, description } = input;
  const result = await pool.query(
    `
      INSERT INTO events (venue_id, name, description, event_date)
      VALUES ($1, $2, $3, $4)
      RETURNING id, venue_id, name, description, event_date, created_at
    `,
    [venueId, name, description ?? null, eventDate],
  );

  return result.rows[0];
};
