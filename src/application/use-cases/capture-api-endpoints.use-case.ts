// src/application/use-cases/capture-api-endpoints.use-case.ts
import { IUrlRepository } from '../../core/interfaces/file-system.interface';
import { IApiEndpointRepository } from '../../core/interfaces/file-system.interface';
import { IApiCaptureService } from '../../core/interfaces/services.interface';
import { IAuthenticationService } from '../../core/interfaces/services.interface';
import { IUrlCategorizationService } from '../../core/interfaces/services.interface';
import { OrganizedEndpoints } from '../../core/entities/organized-endpoints.entity';

export class CaptureApiEndpointsUseCase {
    constructor(
        private readonly urlRepository: IUrlRepository,
        private readonly apiEndpointRepository: IApiEndpointRepository,
        private readonly apiCaptureService: IApiCaptureService,
        private readonly authenticationService: IAuthenticationService,
        private readonly urlCategorizationService: IUrlCategorizationService
    ) { }

    async execute(): Promise<void> {
        console.log("🚀 Starting API Endpoint Capture Process...");

        // Step 1: Load URLs
        console.log("📥 Loading URLs from configuration...");
        const urls = await this.urlRepository.loadUrls();
        console.log(`ℹ️ Found ${urls.length} URLs to process`);

        // Step 2: Authenticate
        console.log("🔐 Authenticating...");
        await this.authenticationService.login();

        // Step 3: Capture APIs
        console.log("🎯 Capturing API endpoints...");
        const capturedEndpoints = await this.apiCaptureService.captureApisFromUrls(urls);
        console.log(`✅ Captured ${capturedEndpoints.length} unique API endpoints`);

        if (capturedEndpoints.length === 0) {
            console.warn("⚠️ No API endpoints were captured");
            return;
        }

        // Step 4: Categorize endpoints
        console.log("🏷️ Categorizing endpoints...");
        const organizedEndpoints = new OrganizedEndpoints();

        for (const endpoint of capturedEndpoints) {
            const categorized = this.urlCategorizationService.categorizeEndpoint(endpoint, urls);
            organizedEndpoints.addEndpoint(categorized);
        }

        // Step 5: Save results
        console.log("💾 Saving results...");
        await this.apiEndpointRepository.saveEndpoints(organizedEndpoints);

        // Save individual module files
        for (const module of organizedEndpoints.getModules()) {
            const moduleData: any = {};
            for (const section of organizedEndpoints.getSections(module)) {
                moduleData[section] = {};
                for (const subSection of organizedEndpoints.getSubSections(module, section)) {
                    const endpoints = organizedEndpoints.getEndpoints(module, section, subSection);
                    moduleData[section][subSection] = endpoints.map(ep => ({
                        method: ep.endpoint.method,
                        endpoint: ep.endpoint.url,
                        sourcePage: ep.endpoint.sourceUrl,
                        timestamp: ep.endpoint.timestamp.toISOString()
                    }));
                }
            }
            await this.apiEndpointRepository.saveModuleEndpoints(module, moduleData);
        }

        console.log("🎉 API Endpoint Capture Process Completed Successfully!");
    }
}