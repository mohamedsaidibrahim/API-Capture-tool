// src/application/use-cases/capture-api-endpoints.use-case.ts
import { IUrlRepository } from '../../core/interfaces/file-system.interface';
import { IApiEndpointRepository, NavigationFailure } from '../../core/interfaces/file-system.interface';
import { IApiCaptureService } from '../../core/interfaces/services.interface';
import { IAuthenticationService } from '../../core/interfaces/services.interface';
import { IUrlCategorizationService } from '../../core/interfaces/services.interface';
import { OrganizedEndpoints, ExportPrintEndpoints } from '../../core/entities/organized-endpoints.entity';
import { ExportPrintCaptureService, ExportPrintApis } from '../services/export-print-capture.service';

interface CaptureSummary {
    totalUrls: number;
    successfulNavigations: number;
    capturedEndpoints: number;
    failedUrls: number;
    exportPrintUrls: number;
    startTime: Date;
    endTime: Date | null;
    duration: string | null;
}

export class CaptureApiEndpointsUseCase {
    private exportPrintCaptureService: ExportPrintCaptureService;

    constructor(
        private readonly urlRepository: IUrlRepository,
        private readonly apiEndpointRepository: IApiEndpointRepository,
        private readonly apiCaptureService: IApiCaptureService,
        private readonly authenticationService: IAuthenticationService,
        private readonly urlCategorizationService: IUrlCategorizationService,
        private readonly page: any // IPage interface
    ) {
        this.exportPrintCaptureService = new ExportPrintCaptureService(
            // Assuming we have access to configuration
            {} as any, // IConfiguration
            this.page,
            this.apiCaptureService
        );
    }

    async execute(): Promise<{ success: boolean; summary: CaptureSummary }> {
        console.log("🚀 Starting API Endpoint Capture Process...");

        const summary: CaptureSummary = {
            totalUrls: 0,
            successfulNavigations: 0,
            capturedEndpoints: 0,
            failedUrls: 0,
            exportPrintUrls: 0,
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

            // Step 3: Capture Regular APIs
            console.log("🎯 Capturing regular API endpoints...");
            const capturedEndpoints = await this.apiCaptureService.captureApisFromUrls(urls);
            summary.capturedEndpoints = capturedEndpoints.length;

            // Get navigation failures from the service
            const navigationFailures = this.apiCaptureService.getNavigationFailures();
            summary.failedUrls = navigationFailures.size;
            summary.successfulNavigations = urls.length - navigationFailures.size;

            console.log(`✅ Captured ${capturedEndpoints.length} regular API endpoints`);

            // Step 4: Capture Export/Print APIs
            console.log("\n📊 Starting Export/Print API Capture...");
            const exportPrintResults = await this.exportPrintCaptureService.captureExportPrintApis(urls);
            summary.exportPrintUrls = exportPrintResults.size;

            console.log(`✅ Captured export/print APIs from ${exportPrintResults.size} URLs`);

            // Step 5: Categorize endpoints
            console.log("🏷️ Categorizing endpoints...");
            const organizedEndpoints = new OrganizedEndpoints();

            // Categorize regular endpoints
            for (const endpoint of capturedEndpoints) {
                const categorized = this.urlCategorizationService.categorizeEndpoint(endpoint, urls);
                organizedEndpoints.addEndpoint(categorized);
            }

            // Add export/print endpoints
            exportPrintResults.forEach((apis, url) => {
                const exportPrintData: ExportPrintEndpoints = {
                    "Export-EXCEL": this.formatExportPrintApis(apis.excel),
                    "Export-PDF": this.formatExportPrintApis(apis.pdf),
                    "Print": this.formatExportPrintApis(apis.print)
                };
                organizedEndpoints.addExportPrintEndpoints(url, exportPrintData);
            });

            // Step 6: Save results
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

            // Save export/print summary
            await this.saveExportPrintSummary(exportPrintResults);

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




    private formatExportPrintApis(apis: any[]): any[] {
        return apis.map(api => ({
            method: api.method,
            endpoint: api.url,
            timestamp: api.timestamp?.toISOString() || new Date().toISOString()
        }));
    }

    private async saveExportPrintSummary(exportPrintResults: Map<string, ExportPrintApis>): Promise<void> {
        const summary: any = {
            totalUrlsWithExportPrint: exportPrintResults.size,
            urls: {}
        };

        exportPrintResults.forEach((apis, url) => {
            summary.urls[url] = {
                hasExcelExport: apis.excel.length > 0,
                hasPdfExport: apis.pdf.length > 0,
                hasPrint: apis.print.length > 0,
                excelApiCount: apis.excel.length,
                pdfApiCount: apis.pdf.length,
                printApiCount: apis.print.length
            };
        });

        // Save to a separate file for easy analysis
        // This would use the fileSystem service to write the summary
        console.log(`📝 Export/Print summary: ${exportPrintResults.size} URLs have export/print capabilities`);
    }

    private printSummary(summary: CaptureSummary): void {
        console.log("\n" + "=".repeat(60));
        console.log("📊 CAPTURE SUMMARY");
        console.log("=".repeat(60));
        console.log(`Total URLs Processed: ${summary.totalUrls}`);
        console.log(`Successful Navigations: ${summary.successfulNavigations}`);
        console.log(`Failed Navigations: ${summary.failedUrls}`);
        console.log(`URLs with Export/Print: ${summary.exportPrintUrls}`);
        console.log(`Regular APIs Captured: ${summary.capturedEndpoints}`);

        const successRate = summary.totalUrls > 0
            ? ((summary.successfulNavigations / summary.totalUrls) * 100).toFixed(1)
            : '0.0';

        const exportPrintRate = summary.totalUrls > 0
            ? ((summary.exportPrintUrls / summary.totalUrls) * 100).toFixed(1)
            : '0.0';

        console.log(`Navigation Success Rate: ${successRate}%`);
        console.log(`Export/Print Coverage: ${exportPrintRate}%`);
        console.log(`Duration: ${summary.duration}`);
        console.log("=".repeat(60));
    }

    private formatDuration(start: Date, end: Date): string {
        const duration = end.getTime() - start.getTime();
        const seconds = Math.floor((duration / 1000) % 60);
        const minutes = Math.floor((duration / (1000 * 60)) % 60);
        const hours = Math.floor((duration / (1000 * 60 * 60)) % 24);

        return `${hours}h ${minutes}m ${seconds}s`;
    }
}