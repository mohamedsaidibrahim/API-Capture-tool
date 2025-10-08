import { CategorizedEndpoint } from "./categorized-endpoint.entity";

// src/core/entities/organized-endpoints.entity.ts
export class OrganizedEndpoints {
    private endpoints: Map<string, Map<string, Map<string, CategorizedEndpoint[]>>> = new Map();

    addEndpoint(categorized: CategorizedEndpoint): void {
        const { module, section, subSection, endpoint } = categorized;

        if (!this.endpoints.has(module)) {
            this.endpoints.set(module, new Map());
        }

        const moduleMap = this.endpoints.get(module)!;
        if (!moduleMap.has(section)) {
            moduleMap.set(section, new Map());
        }

        const sectionMap = moduleMap.get(section)!;
        if (!sectionMap.has(subSection)) {
            sectionMap.set(subSection, []);
        }

        sectionMap.get(subSection)!.push(categorized);
    }

    getModules(): string[] {
        return Array.from(this.endpoints.keys());
    }

    getSections(module: string): string[] {
        return Array.from(this.endpoints.get(module)?.keys() || []);
    }

    getSubSections(module: string, section: string): string[] {
        return Array.from(this.endpoints.get(module)?.get(section)?.keys() || []);
    }

    getEndpoints(module: string, section: string, subSection: string): CategorizedEndpoint[] {
        return this.endpoints.get(module)?.get(section)?.get(subSection) || [];
    }

    toJSON(): any {
        const result: any = {};

        for (const [module, sections] of this.endpoints) {
            result[module] = {};

            for (const [section, subSections] of sections) {
                result[module][section] = {};

                for (const [subSection, endpoints] of subSections) {
                    result[module][section][subSection] = endpoints.map(ep => ({
                        method: ep.endpoint.method,
                        endpoint: ep.endpoint.url,
                        sourcePage: ep.endpoint.sourceUrl,
                        timestamp: ep.endpoint.timestamp.toISOString()
                    }));
                }
            }
        }

        return result;
    }
}