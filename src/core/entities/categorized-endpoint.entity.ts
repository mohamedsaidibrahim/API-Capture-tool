import { ApiEndpoint } from "./api-endpoint.entity";

// src/core/entities/categorized-endpoint.entity.ts
export class CategorizedEndpoint {
    constructor(
        public readonly endpoint: ApiEndpoint,
        public readonly module: string,
        public readonly section: string,
        public readonly subSection: string
    ) { }

    static create(
        endpoint: ApiEndpoint,
        module: string,
        section: string,
        subSection: string
    ): CategorizedEndpoint {
        return new CategorizedEndpoint(endpoint, module, section, subSection);
    }
}