import { z } from "zod";
export declare const createVenueSchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zip_code: z.ZodString;
    capacity: z.ZodCoercedNumber<unknown>;
}, z.core.$strip>;
export declare const createVenueLayoutSchema: z.ZodObject<{
    name: z.ZodString;
    address: z.ZodString;
    city: z.ZodString;
    state: z.ZodString;
    zip_code: z.ZodString;
    capacity: z.ZodCoercedNumber<unknown>;
    sections: z.ZodArray<z.ZodObject<{
        name: z.ZodString;
        totalRows: z.ZodCoercedNumber<unknown>;
        seatsPerRow: z.ZodCoercedNumber<unknown>;
    }, z.core.$strip>>;
}, z.core.$strip>;
export declare const createEventSchema: z.ZodObject<{
    venue_id: z.ZodString;
    name: z.ZodString;
    description: z.ZodOptional<z.ZodString>;
    event_date: z.ZodString;
}, z.core.$strip>;
//# sourceMappingURL=admin.validator.d.ts.map