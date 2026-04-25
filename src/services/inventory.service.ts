import format from "pg-format";
import { PoolClient } from "pg";

/**
 * Configuration for generating seats in a section.
 */
export interface SeatGenerationConfig {
  totalRows: number;
  seatsPerRow: number;
}

/**
 * Represents a section with capacity configuration and a name.
 */
/**
 * Represents a section with capacity configuration and a name.
 */
interface SectionCapacityShape extends SeatGenerationConfig {
  name: string;
}

/**
 * Builds an array of seat values for insertion into the database.
 * @param sectionId - The ID of the section.
 * @param config - The seat generation configuration.
 * @returns An array of arrays, each containing [sectionId, row, seat].
 */
function buildSeatValues(sectionId: string, config: SeatGenerationConfig) {
  const seatValues: (string | number)[][] = [];

  for (let row = 1; row <= config.totalRows; row++) {
    for (let seat = 1; seat <= config.seatsPerRow; seat++) {
      seatValues.push([sectionId, row, seat]);
    }
  }

  return seatValues;
}

/**
 * Generates seats for a given section and inserts them into the database.
 * @param client - The PostgreSQL client to execute the query.
 * @param sectionId - The ID of the section to generate seats for.
 * @param config - The configuration for seat generation.
 * @returns The number of seats generated and inserted.
 */
export async function generateSeats(
  client: PoolClient,
  sectionId: string,
  config: SeatGenerationConfig,
) {
  const seatValues = buildSeatValues(sectionId, config);

  if (seatValues.length === 0) {
    return 0;
  }

  const sqlQuery = format(
    `INSERT INTO seats (section_id, row_number, seat_number) VALUES %L`,
    seatValues,
  );

  await client.query(sqlQuery);

  return seatValues.length;
}

/**
 * Calculates the total number of seats for a given configuration.
 * @param config - The seat generation configuration.
 * @returns The total number of seats.
 */
export function getSeatCount(config: SeatGenerationConfig) {
  return config.totalRows * config.seatsPerRow;
}

/**
 * Calculates the total number of seats across multiple sections.
 * @param sections - An array of seat generation configurations.
 * @returns The total number of seats.
 */
export function getTotalSeatCount(sections: SeatGenerationConfig[]) {
  return sections.reduce((total, section) => total + getSeatCount(section), 0);
}

/**
 * Validates that the total seats in sections do not exceed the venue capacity.
 * @param venueCapacity - The maximum capacity of the venue.
 * @param sections - An array of sections with their capacities.
 * @throws Error if the total seats exceed the venue capacity.
 */
export function validateSectionCapacity(
  venueCapacity: number,
  sections: SectionCapacityShape[],
) {
  const totalSeats = getTotalSeatCount(sections);

  if (totalSeats > venueCapacity) {
    throw new Error(
      `Venue capacity ${venueCapacity} is smaller than generated seats ${totalSeats}`,
    );
  }
}
