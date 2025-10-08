// src/core/entities/url-structure.entity.ts
export class UrlStructure {
    constructor(
        public readonly module: string,
        public readonly section: string,
        public readonly subSection: string,
        public readonly url: string
    ) { }

    static create(module: string, section: string, subSection: string, url: string): UrlStructure {
        return new UrlStructure(module, section, subSection, url);
    }
}