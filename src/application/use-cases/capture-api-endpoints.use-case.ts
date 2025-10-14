// src/application/use-cases/capture-api-endpoints.use-case.ts
import { IUrlRepository } from '../../core/interfaces/file-system.interface';
import { IApiEndpointRepository, NavigationFailure } from '../../core/interfaces/file-system.interface';
import { IApiCaptureService } from '../../core/interfaces/services.interface';
import { IAuthenticationService } from '../../core/interfaces/services.interface';
import { IUrlCategorizationService } from '../../core/interfaces/services.interface';
import { OrganizedEndpoints } from '../../core/entities/organized-endpoints.entity';

interface CaptureSummary {
    totalUrls: number;
    successfulNavigations: number;
    capturedEndpoints: number;
    failedUrls: number;
    startTime: Date;
    endTime: Date | null;
    duration: string | null;
}

export class CaptureApiEndpointsUseCase {
    constructor(
        private readonly urlRepository: IUrlRepository,
        private readonly apiEndpointRepository: IApiEndpointRepository,
        private readonly apiCaptureService: IApiCaptureService,
        private readonly authenticationService: IAuthenticationService,
        private readonly urlCategorizationService: IUrlCategorizationService
    ) { }

    async execute(): Promise<{ success: boolean; summary: CaptureSummary }> {
        console.log("🚀 Starting API Endpoint Capture Process...");

        const summary: CaptureSummary = {
            totalUrls: 0,
            successfulNavigations: 0,
            capturedEndpoints: 0,
            failedUrls: 0,
            startTime: new Date(),
            endTime: null,
            duration: null
        };

        try {
            // Step 1: Load URLs
            console.log("📥 Loading URLs from configuration...");
            const urls = await this.urlRepository.loadUrls();
            summary.totalUrls = urls.length;
            console.log(`ℹ️ Found ${urls.length} URLs to process`);

            if (urls.length === 0) {
                throw new Error("No URLs found to process");
            }

            // Step 2: Authenticate
            console.log("🔐 Authenticating...");
            await this.authenticationService.login();

            // Step 3: Capture APIs
            console.log("🎯 Capturing API endpoints...");
            const capturedEndpoints = await this.apiCaptureService.captureApisFromUrls(urls);
            summary.capturedEndpoints = capturedEndpoints.length;

            // Get navigation failures from the service
            const navigationFailures = this.apiCaptureService.getNavigationFailures();
            summary.failedUrls = navigationFailures.size;
            summary.successfulNavigations = urls.length - navigationFailures.size;

            console.log(`✅ Captured ${capturedEndpoints.length} unique API endpoints`);

            if (capturedEndpoints.length === 0) {
                console.warn("⚠️ No API endpoints were captured");
                return { success: false, summary };
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

            // Save navigation failures for analysis
            if (navigationFailures.size > 0) {
                const failuresData: NavigationFailure[] = Array.from(navigationFailures.entries()).map(
                    ([url, reason]: [string, string]) => ({
                        url,
                        reason
                    })
                );

                await this.apiEndpointRepository.saveNavigationFailures(failuresData);
            }

            summary.endTime = new Date();
            summary.duration = this.formatDuration(summary.startTime, summary.endTime);

            this.printSummary(summary);
            console.log("🎉 API Endpoint Capture Process Completed Successfully!");

            return { success: true, summary };

        } catch (error) {
            summary.endTime = new Date();
            summary.duration = this.formatDuration(summary.startTime, summary.endTime);

            // Proper error type handling
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error("❌ Process failed:", errorMessage);

            this.printSummary(summary);

            return { success: false, summary };
        }
    }

    private printSummary(summary: CaptureSummary): void {
        console.log("\n" + "=".repeat(50));
        console.log("📊 CAPTURE SUMMARY");
        console.log("=".repeat(50));
        console.log(`Total URLs: ${summary.totalUrls}`);
        console.log(`Successful Navigations: ${summary.successfulNavigations}`);
        console.log(`Failed Navigations: ${summary.failedUrls}`);
        console.log(`Captured Endpoints: ${summary.capturedEndpoints}`);

        const successRate = summary.totalUrls > 0
            ? ((summary.successfulNavigations / summary.totalUrls) * 100).toFixed(1)
            : '0.0';

        console.log(`Success Rate: ${successRate}%`);
        console.log(`Duration: ${summary.duration}`);
        console.log("=".repeat(50));
    }

    private formatDuration(start: Date, end: Date): string {
        const duration = end.getTime() - start.getTime();
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        return `${hours}h ${minutes}m ${seconds}s`;
    }
}