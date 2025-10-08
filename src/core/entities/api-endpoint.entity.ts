// src/core/entities/api-endpoint.entity.ts
export class ApiEndpoint {
    constructor(
        public readonly url: string,
        public readonly method: string,
        public readonly sourceUrl: string,
        public readonly timestamp: Date
    ) { }

    static create(url: string, method: string, sourceUrl: string): ApiEndpoint {
        return new ApiEndpoint(url, method, sourceUrl, new Date());
    }

    getKey(): string {
        return `${this.method}-${this.url}`;
    }
}