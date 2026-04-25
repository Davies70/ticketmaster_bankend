export interface CreateEventInput {
    venueId: string;
    name: string;
    eventDate: string;
    description?: string;
}
export declare const createEvent: (input: CreateEventInput) => Promise<any>;
//# sourceMappingURL=events.service.d.ts.map