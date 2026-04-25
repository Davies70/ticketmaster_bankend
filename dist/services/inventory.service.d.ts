import { PoolClient } from "pg";
export interface SeatGenerationConfig {
    totalRows: number;
    seatsPerRow: number;
}
interface SectionCapacityShape extends SeatGenerationConfig {
    name: string;
}
export declare function generateSeats(client: PoolClient, sectionId: string, config: SeatGenerationConfig): Promise<number>;
export declare function getSeatCount(config: SeatGenerationConfig): number;
export declare function getTotalSeatCount(sections: SeatGenerationConfig[]): number;
export declare function validateSectionCapacity(venueCapacity: number, sections: SectionCapacityShape[]): void;
export {};
//# sourceMappingURL=inventory.service.d.ts.map