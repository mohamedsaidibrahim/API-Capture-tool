// src/infrastructure/file-system/url.repository.ts
import { IUrlRepository } from '../../core/interfaces/file-system.interface';
import { UrlStructure } from '../../core/entities/url-structure.entity';
import { IFileSystem } from '../../core/interfaces/file-system.interface';
import { IConfiguration } from '../../core/interfaces/config.interface';
import { FileSystemException } from '../../core/exceptions/base.exception';
import path from 'path';

export class UrlRepository implements IUrlRepository {
    constructor(
        private readonly fileSystem: IFileSystem,
        private readonly config: IConfiguration
    ) { }

    async loadUrls(): Promise<UrlStructure[]> {
        try {
            const jsonFile = "microtec_erp_urls.json";
            const filePath = path.join(process.cwd(), "Input", jsonFile);

            if (!this.fileSystem.existsSync(filePath)) {
                throw new FileSystemException(`ERP modules JSON file not found at: ${filePath}`);
            }

            const data = this.fileSystem.readFileSync(filePath, "utf8");
            const jsonData = JSON.parse(data);

            if (!jsonData.base_url || !jsonData.modules) {
                throw new FileSystemException('Invalid JSON structure - missing "base_url" or "modules" property');
            }

            this.config.setFrontendBaseUrl(jsonData.base_url);
            const structuredUrls: UrlStructure[] = [];

            const parseModule = (moduleName: string, moduleData: any, currentPath: string = '') => {
                for (const key in moduleData) {
                    const value = moduleData[key];
                    if (Array.isArray(value)) {
                        value.forEach(urlSuffix => {
                            const normalizedUrl = this.normalizeUrl(jsonData.base_url, urlSuffix);
                            structuredUrls.push(
                                UrlStructure.create(moduleName, key, currentPath || key, normalizedUrl)
                            );
                        });
                    } else if (typeof value === 'object' && value !== null) {
                        parseModule(moduleName, value, key);
                    }
                }
            };

            for (const moduleName in jsonData.modules) {
                const initialPath = moduleName === "General_Settings" ? "Dashboard" : "";
                parseModule(moduleName, jsonData.modules[moduleName], initialPath);
            }

            const validatedUrls = this.validateAndDeduplicateUrls(structuredUrls);
            return validatedUrls.sort((a, b) => b.url.length - a.url.length);
        } catch (error: any) {
            if (error instanceof FileSystemException) {
                throw error;
            }
            throw new FileSystemException(`Failed to load URLs: ${error.message}`);
        }
    }

    private normalizeUrl(baseUrl: string, urlSuffix: string): string {
        // Remove trailing slash from baseUrl and leading slash from urlSuffix
        const cleanBaseUrl = baseUrl.replace(/\/$/, '');
        const cleanSuffix = urlSuffix.replace(/^\//, '');

        const fullUrl = `${cleanBaseUrl}/${cleanSuffix}`;

        // Validate URL format
        try {
            new URL(fullUrl);
            return fullUrl;
        } catch (error) {
            console.warn(`⚠️ Invalid URL constructed: ${fullUrl}`);
            throw new FileSystemException(`Invalid URL format: ${fullUrl}`);
        }
    }

    private validateAndDeduplicateUrls(urls: UrlStructure[]): UrlStructure[] {
        const seen = new Set<string>();
        const validated: UrlStructure[] = [];

        for (const urlStruct of urls) {
            if (!seen.has(urlStruct.url)) {
                seen.add(urlStruct.url);
                validated.push(urlStruct);
            } else {
                console.warn(`⚠️ Duplicate URL skipped: ${urlStruct.url}`);
            }
        }

        console.log(`✅ Validated ${validated.length} unique URLs from ${urls.length} total`);
        return validated;
    }
}