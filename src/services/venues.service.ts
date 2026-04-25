import pool from "../config/db.js";
import { PoolClient } from "pg";
import {
  generateSeats,
  SeatGenerationConfig,
  validateSectionCapacity,
} from "./inventory.service.js";

/**
 * Input data required to create a new venue.
 */
export interface CreateVenueInput {
  name: string;
  address: string;
  city: string;
  state: string;
  zipCode: string;
  capacity: number;
}

/**
 * Input data for creating a section, extending seat generation configuration.
 */
export interface CreateSectionInput extends SeatGenerationConfig {
  name: string;
}

/**
 * Input data for creating a venue with its layout including sections.
 */
export interface CreateVenueLayoutInput extends CreateVenueInput {
  sections: CreateSectionInput[];
}

/**
 * Creates a new venue in the database.
 * @param input - The venue creation data.
 * @returns The created venue record.
 */
export const createVenue = async (input: CreateVenueInput) => {
  const { name, address, city, state, zipCode, capacity } = input;
  const result = await pool.query(
    `
      INSERT INTO venues (name, address, city, state, zip_code, capacity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, address, city, state, zip_code, capacity, created_at
    `,
    [name, address, city, state, zipCode, capacity],
  );

  return result.rows[0];
};

/**
 * Creates a venue along with its sections and generates seats for each section.
 * Validates that the total seats do not exceed venue capacity.
 * @param input - The venue and layout creation data.
 * @returns An object containing the created venue, sections, and statistics.
 */
export const createVenueWithLayout = async (input: CreateVenueLayoutInput) => {
  validateSectionCapacity(input.capacity, input.sections);

  const client = await pool.connect();

  try {
    await client.query("BEGIN");

    const venue = await createVenueRecord(client, input);
    const sections = [];
    let totalSeatsGenerated = 0;

    for (const section of input.sections) {
      const createdSection = await createSectionRecord(
        client,
        venue.id,
        section.name,
      );
      const seatsCreated = await generateSeats(client, createdSection.id, {
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
  } catch (error) {
    await client.query("ROLLBACK");
    throw error;
  } finally {
    client.release();
  }
};

/**
 * Creates a venue record in the database using a transaction client.
 * @param client - The PostgreSQL client for the transaction.
 * @param input - The venue creation data.
 * @returns The created venue record.
 */
async function createVenueRecord(client: PoolClient, input: CreateVenueInput) {
  const result = await client.query(
    `
      INSERT INTO venues (name, address, city, state, zip_code, capacity)
      VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, name, address, city, state, zip_code, capacity, created_at
    `,
    [
      input.name,
      input.address,
      input.city,
      input.state,
      input.zipCode,
      input.capacity,
    ],
  );

  return result.rows[0];
}

/**
 * Creates a section record in the database using a transaction client.
 * @param client - The PostgreSQL client for the transaction.
 * @param venueId - The ID of the venue this section belongs to.
 * @param name - The name of the section.
 * @returns The created section record.
 */
async function createSectionRecord(
  client: PoolClient,
  venueId: string,
  name: string,
) {
  const result = await client.query(
    `
      INSERT INTO sections (venue_id, name)
      VALUES ($1, $2)
      RETURNING id, venue_id, name, created_at
    `,
    [venueId, name],
  );

  return result.rows[0];
}
