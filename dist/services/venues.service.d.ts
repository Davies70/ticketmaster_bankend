import { SeatGenerationConfig } from "./inventory.service.js";
export interface CreateVenueInput {
    name: string;
    address: string;
    city: string;
    state: string;
    zipCode: string;
    capacity: number;
}
export interface CreateSectionInput extends SeatGenerationConfig {
    name: string;
}
export interface CreateVenueLayoutInput extends CreateVenueInput {
    sections: CreateSectionInput[];
}
export declare const createVenue: (input: CreateVenueInput) => Promise<any>;
export declare const createVenueWithLayout: (input: CreateVenueLayoutInput) => Promise<{
    venue: any;
    sections: any[];
    totalSectionsCreated: number;
    totalSeatsGenerated: number;
}>;
//# sourceMappingURL=venues.service.d.ts.map