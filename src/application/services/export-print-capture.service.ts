// src/application/services/export-print-capture.service.ts
import { IApiCaptureService } from '../../core/interfaces/services.interface';
import { ApiEndpoint } from '../../core/entities/api-endpoint.entity';
import { UrlStructure } from '../../core/entities/url-structure.entity';
import { IConfiguration } from '../../core/interfaces/config.interface';
import { IPage } from '../../core/interfaces/browser.interface';

export interface ExportPrintApis {
    excel: ApiEndpoint[];
    pdf: ApiEndpoint[];
    print: ApiEndpoint[];
}

export class ExportPrintCaptureService {
    private exportPrintApis: Map<string, ExportPrintApis> = new Map();
    private capturedExportPrintEndpoints: ApiEndpoint[] = [];

    constructor(
        private readonly config: IConfiguration,
        private readonly page: IPage,
        private readonly apiCaptureService: IApiCaptureService
    ) { }

    async captureExportPrintApis(urls: UrlStructure[]): Promise<Map<string, ExportPrintApis>> {
        console.log("📊 Starting Export/Print API Capture Process...");

        for (const [index, urlEntry] of urls.entries()) {
            console.log(`\n🔄 Processing ${index + 1}/${urls.length}: ${urlEntry.url}`);

            const success = await this.navigateAndCaptureForUrl(urlEntry);

            if (success) {
                console.log(`✅ Successfully captured export/print APIs for: ${urlEntry.url}`);
            } else {
                console.warn(`⚠️ Failed to capture export/print APIs for: ${urlEntry.url}`);
            }
        }

        console.log(`\n🎉 Export/Print API Capture Complete!`);
        console.log(`📈 Processed ${this.exportPrintApis.size} URLs with export/print capabilities`);

        return new Map(this.exportPrintApis);
    }

    private async navigateAndCaptureForUrl(urlEntry: UrlStructure): Promise<boolean> {
        try {
            // Navigate to the page first
            await this.page.goto(urlEntry.url, {
                waitUntil: 'domcontentloaded',
                timeout: 60000
            });

            // Wait for page to fully load
            await this.page.waitForTimeout(5000);

            // Check if export button exists
            const exportButtonExists = await this.page.waitForSelector('button.export', {
                timeout: 10000
            }).catch(() => false);

            // Check if print button exists
            const printButtonExists = await this.page.waitForSelector('[data-testid="table_button_print"]', {
                timeout: 10000
            }).catch(() => false);

            if (!exportButtonExists && !printButtonExists) {
                console.log(`   ℹ️ No export/print buttons found on this page`);
                return false;
            }

            const urlApis: ExportPrintApis = {
                excel: [],
                pdf: [],
                print: []
            };

            // Capture export APIs if export button exists
            if (exportButtonExists) {
                console.log(`   📥 Found export button, capturing export APIs...`);
                const exportApis = await this.captureExportApis();
                urlApis.excel = exportApis.excel;
                urlApis.pdf = exportApis.pdf;
            }

            // Capture print APIs if print button exists
            if (printButtonExists) {
                console.log(`   🖨️ Found print button, capturing print APIs...`);
                const printApis = await this.capturePrintApis();
                urlApis.print = printApis;
            }

            this.exportPrintApis.set(urlEntry.url, urlApis);
            return true;

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.error(`   ❌ Error capturing export/print APIs:`, errorMessage);
            return false;
        }
    }

    private async captureExportApis(): Promise<{ excel: ApiEndpoint[]; pdf: ApiEndpoint[] }> {
        const initialApiCount = this.capturedExportPrintEndpoints.length;
        const excelApis: ApiEndpoint[] = [];
        const pdfApis: ApiEndpoint[] = [];

        try {
            // Click the main export button
            await this.page.click('button.export');
            await this.page.waitForTimeout(1000);

            // Wait for export menu to appear
            await this.page.waitForSelector('div.p-menuitem-content a', { timeout: 5000 });

            // Get all export options
            const exportOptions = await this.page.$$('div.p-menuitem-content a');

            if (exportOptions.length >= 2) {
                // Capture Excel export APIs
                console.log(`     📊 Capturing Excel export APIs...`);
                await exportOptions[0].click();
                await this.waitForExportApis(5000);
                const newExcelApis = this.getNewApisSince(initialApiCount);
                excelApis.push(...newExcelApis);

                // Go back to export menu
                await this.page.click('button.export');
                await this.page.waitForTimeout(1000);
                await this.page.waitForSelector('div.p-menuitem-content a', { timeout: 5000 });

                // Capture PDF export APIs
                console.log(`     📄 Capturing PDF export APIs...`);
                const refreshedOptions = await this.page.$$('div.p-menuitem-content a');
                await refreshedOptions[refreshedOptions.length - 1].click(); // Last option for PDF
                await this.waitForExportApis(5000);
                const newPdfApis = this.getNewApisSince(initialApiCount + excelApis.length);
                pdfApis.push(...newPdfApis);

            } else {
                console.warn(`     ⚠️ Expected at least 2 export options, found ${exportOptions.length}`);
            }

            // Close any open dialogs or menus
            await this.closeAnyOpenMenus();

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.warn(`     ⚠️ Error during export capture:`, errorMessage);
        }

        console.log(`     ✅ Captured ${excelApis.length} Excel APIs and ${pdfApis.length} PDF APIs`);
        return { excel: excelApis, pdf: pdfApis };
    }

    private async capturePrintApis(): Promise<ApiEndpoint[]> {
        const initialApiCount = this.capturedExportPrintEndpoints.length;
        const printApis: ApiEndpoint[] = [];

        try {
            // Get all print buttons and click the last one
            const printButtons = await this.page.$$('[data-testid="table_button_print"]');

            if (printButtons.length > 0) {
                console.log(`     🖨️ Capturing print APIs (${printButtons.length} print buttons found)...`);

                // Click the last print button
                await printButtons[printButtons.length - 1].click();
                await this.waitForExportApis(5000);

                const newPrintApis = this.getNewApisSince(initialApiCount);
                printApis.push(...newPrintApis);

                // Close any print dialogs or previews
                await this.closeAnyOpenMenus();
            } else {
                console.warn(`     ⚠️ No print buttons found with selector`);
            }

        } catch (error) {
            const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
            console.warn(`     ⚠️ Error during print capture:`, errorMessage);
        }

        console.log(`     ✅ Captured ${printApis.length} print APIs`);
        return printApis;
    }

    private async waitForExportApis(timeout: number): Promise<void> {
        // Set up request listener for the duration
        const apiPrefix = this.config.getTargetApiPrefix();

        const requestListener = (request: any) => {
            const url = request.url();
            if (url.startsWith(apiPrefix) &&
                (request.resourceType() === "xhr" || request.resourceType() === "fetch")) {
                const key = `${request.method()}-${url}`;

                // Check if we already have this API
                const existingApi = this.capturedExportPrintEndpoints.find(ep =>
                    ep.method === request.method() && ep.url === url
                );

                if (!existingApi) {
                    const endpoint = ApiEndpoint.create(
                        url,
                        request.method(),
                        this.page.url()
                    );
                    this.capturedExportPrintEndpoints.push(endpoint);
                    console.log(`     🎯 Captured export/print API: ${request.method()} ${url}`);
                }
            }
        };

        // Add listener
        this.page.onRequest(requestListener);

        // Wait for the specified timeout
        await this.page.waitForTimeout(timeout);

        // Remove listener
        this.page.onRequest(() => { });
    }

    private getNewApisSince(startCount: number): ApiEndpoint[] {
        return this.capturedExportPrintEndpoints.slice(startCount);
    }

    private async closeAnyOpenMenus(): Promise<void> {
        try {
            // Try to close any open menus by clicking outside or pressing escape
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);

            // Click on body to close any open dropdowns
            await this.page.click('body');
            await this.page.waitForTimeout(500);
        } catch (error) {
            // Ignore errors when trying to close menus
        }
    }

    getExportPrintResults(): Map<string, ExportPrintApis> {
        return new Map(this.exportPrintApis);
    }

    getCapturedExportPrintCount(): number {
        return this.capturedExportPrintEndpoints.length;
    }

    clearResults(): void {
        this.exportPrintApis.clear();
        this.capturedExportPrintEndpoints = [];
    }
}