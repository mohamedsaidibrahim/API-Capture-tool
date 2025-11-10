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

export interface ExportPrintOptions {
    maxRetries?: number;
    interactionTimeout?: number;
    waitForNetworkIdle?: boolean;
}

export class ExportPrintCaptureService {
    private exportPrintApis: Map<string, ExportPrintApis> = new Map();
    private capturedExportPrintEndpoints: ApiEndpoint[] = [];
    private options: ExportPrintOptions;

    constructor(
        private readonly config: IConfiguration,
        private readonly page: IPage,
        private readonly apiCaptureService: IApiCaptureService,
        options: ExportPrintOptions = {}
    ) {
        this.options = {
            maxRetries: 3,
            interactionTimeout: 10000,
            waitForNetworkIdle: true,
            ...options
        };
    }

    async captureExportPrintApis(urls: UrlStructure[]): Promise<Map<string, ExportPrintApis>> {
        console.log("📊 Starting Enhanced Export/Print API Capture Process...");
        console.log(`🔄 Processing ${urls.length} URLs for export/print capabilities`);

        let processedCount = 0;
        let successCount = 0;

        for (const [index, urlEntry] of urls.entries()) {
            processedCount++;
            console.log(`\n🔄 [${index + 1}/${urls.length}] Processing: ${urlEntry.url}`);

            try {
                const success = await this.captureForSingleUrl(urlEntry);

                if (success) {
                    successCount++;
                    console.log(`✅ Successfully captured export/print APIs`);
                } else {
                    console.log(`ℹ️ No export/print capabilities found or capture failed`);
                }
            } catch (error) {
                console.error(`❌ Error processing ${urlEntry.url}:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }

        console.log(`\n🎉 Export/Print API Capture Complete!`);
        console.log(`📈 Successfully captured from ${successCount}/${processedCount} URLs`);
        console.log(`📊 Total export/print APIs captured: ${this.capturedExportPrintEndpoints.length}`);

        return new Map(this.exportPrintApis);
    }

    private async captureForSingleUrl(urlEntry: UrlStructure): Promise<boolean> {
        const initialApiCount = this.capturedExportPrintEndpoints.length;

        try {
            // Navigate to the page with better error handling
            await this.navigateSafely(urlEntry.url);

            // Wait for page to stabilize
            await this.waitForPageStability();

            // Check for export/print capabilities
            const hasExportPrint = await this.detectExportPrintCapabilities();

            if (!hasExportPrint) {
                return false;
            }

            const urlApis: ExportPrintApis = {
                excel: [],
                pdf: [],
                print: []
            };

            // Capture export functionality
            const exportResults = await this.captureExportFunctionality();
            urlApis.excel = exportResults.excel;
            urlApis.pdf = exportResults.pdf;

            // Capture print functionality
            urlApis.print = await this.capturePrintFunctionality();

            // Only add if we captured any APIs
            if (urlApis.excel.length > 0 || urlApis.pdf.length > 0 || urlApis.print.length > 0) {
                this.exportPrintApis.set(urlEntry.url, urlApis);
                const newApisCount = this.capturedExportPrintEndpoints.length - initialApiCount;
                console.log(`   📊 Captured ${newApisCount} new export/print APIs`);
                return true;
            }

            return false;

        } catch (error) {
            console.error(`   ❌ Failed to capture export/print for ${urlEntry.url}:`,
                error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    private async navigateSafely(url: string): Promise<void> {
        for (let attempt = 1; attempt <= this.options.maxRetries!; attempt++) {
            try {
                console.log(`   🧭 Navigation attempt ${attempt}/${this.options.maxRetries}`);

                await this.page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: this.options.interactionTimeout
                });

                // Wait for critical elements to load
                await this.page.waitForTimeout(2000);

                // Verify we're on the right page
                const currentUrl = this.page.url();
                if (!currentUrl.includes(url.split('/').pop()!)) {
                    throw new Error(`Navigation verification failed. Expected ${url}, got ${currentUrl}`);
                }

                console.log(`   ✅ Navigation successful`);
                return;

            } catch (error) {
                console.warn(`   ⚠️ Navigation attempt ${attempt} failed:`,
                    error instanceof Error ? error.message : 'Unknown error');

                if (attempt === this.options.maxRetries) {
                    throw error;
                }

                await this.page.waitForTimeout(2000);
            }
        }
    }

    private async waitForPageStability(): Promise<void> {
        console.log(`   ⏳ Waiting for page stability...`);

        // Wait for initial load
        await this.page.waitForTimeout(3000);

        // Wait for network idle if enabled
        if (this.options.waitForNetworkIdle) {
            await this.waitForNetworkIdle();
        }

        // Additional wait for dynamic content
        await this.page.waitForTimeout(2000);
    }

    private async waitForNetworkIdle(): Promise<void> {
        return new Promise((resolve) => {
            let idleTimer: NodeJS.Timeout;
            let requestCount = 0;

            const requestListener = () => {
                requestCount++;
                clearTimeout(idleTimer);
                idleTimer = setTimeout(() => {
                    if (requestCount === 0) {
                        this.page.onRequest(() => { }); // Remove listener
                        resolve();
                    }
                }, 1000);
            };

            this.page.onRequest(requestListener);

            // Initial timer in case no requests are happening
            idleTimer = setTimeout(() => {
                this.page.onRequest(() => { });
                resolve();
            }, 2000);
        });
    }

    private async detectExportPrintCapabilities(): Promise<boolean> {
        console.log(`   🔍 Scanning for export/print capabilities...`);

        const capabilities = {
            hasExport: false,
            hasPrint: false
        };

        // Flexible selector strategy for export buttons
        const exportSelectors = [
            'button.btn.export',
            '[data-testid*="export"]',
            'button:has-text("Export")',
            '.export-button',
            '[class*="export"] button'
        ];

        // Flexible selector strategy for print buttons
        const printSelectors = [
            '[data-testid="table_button_print"]',
            'button[data-testid*="print"]',
            'button:has-text("Print")',
            '.print-button',
            '[class*="print"] button'
        ];

        // Check for export buttons - FIXED: Use page.$$ instead of page.$
        for (const selector of exportSelectors) {
            try {
                const elements = await this.page.$$(selector); // FIX: Changed from $ to $$
                if (elements.length > 0) {
                    capabilities.hasExport = true;
                    console.log(`   📥 Found export button with selector: ${selector}`);
                    break;
                }
            } catch (error) {
                // Continue to next selector
                console.log(`     ⚠️ Selector ${selector} failed:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }

        // Check for print buttons - FIXED: Use page.$$ instead of page.$
        for (const selector of printSelectors) {
            try {
                const elements = await this.page.$$(selector); // FIX: Changed from $ to $$
                if (elements.length > 0) {
                    capabilities.hasPrint = true;
                    console.log(`   🖨️ Found ${elements.length} print button(s) with selector: ${selector}`);
                    break;
                }
            } catch (error) {
                // Continue to next selector
                console.log(`     ⚠️ Selector ${selector} failed:`, error instanceof Error ? error.message : 'Unknown error');
            }
        }

        if (!capabilities.hasExport && !capabilities.hasPrint) {
            console.log(`   ℹ️ No export/print buttons detected on this page`);
            return false;
        }

        console.log(`   ✅ Detected capabilities:`, capabilities);
        return true;
    }

    private async clickExportButton(): Promise<boolean> {
        const exportSelectors = [
            'button.btn.export',
            '[data-testid*="export"]',
            'button:has-text("Export")'
        ];

        for (const selector of exportSelectors) {
            try {
                const elements = await this.page.$$(selector); // FIX: Use $$ to get all elements
                if (elements.length > 0) {
                    // Click the first available export button
                    await elements[0].click();
                    console.log(`     ✅ Clicked export button: ${selector}`);
                    await this.page.waitForTimeout(1000);
                    return true;
                }
            } catch (error) {
                console.log(`     ⚠️ Failed to click ${selector}:`,
                    error instanceof Error ? error.message : 'Unknown error');
            }
        }

        return false;
    }

    // FIXED: Corrected the click method call with proper parameters
    private async closeAnyOpenMenus(): Promise<void> {
        try {
            // Press Escape to close any open menus/dialogs
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);

            // Click on body to close any open dropdowns - FIXED: Remove the second parameter
            try {
                // Try to find and click on body element
                const bodyElement = await this.page.$('body');
                if (bodyElement) {
                    await bodyElement.click();
                }
            } catch (clickError) {
                // Fallback: use keyboard press if click fails
                await this.page.keyboard.press('Escape');
            }

            await this.page.waitForTimeout(500);

            // Press Escape again for good measure
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(500);
        } catch (error) {
            // Ignore errors when closing menus
            console.log(`     ℹ️ Menu cleanup completed with minor issues`);
        }
    }

    // Additional helper method for better element interaction
    private async safeClick(selector: string, index: number = 0): Promise<boolean> {
        try {
            const elements = await this.page.$$(selector);
            if (elements.length > index) {
                await elements[index].click();
                return true;
            }
            return false;
        } catch (error) {
            console.log(`     ⚠️ Safe click failed for ${selector}[${index}]:`,
                error instanceof Error ? error.message : 'Unknown error');
            return false;
        }
    }

    // Enhanced method to handle element visibility and interaction
    private async waitForElementVisible(selector: string, timeout: number = 5000): Promise<boolean> {
        try {
            await this.page.waitForSelector(selector, {
                timeout,
                state: 'visible'
            });
            return true;
        } catch (error) {
            return false;
        }
    }

    private async captureExportFunctionality(): Promise<{ excel: ApiEndpoint[]; pdf: ApiEndpoint[] }> {
        const initialApiCount = this.capturedExportPrintEndpoints.length;
        const results = { excel: [] as ApiEndpoint[], pdf: [] as ApiEndpoint[] };

        console.log(`   📥 Starting export functionality capture...`);

        try {
            // Find and click export button
            const exportClicked = await this.clickExportButton();

            if (!exportClicked) {
                console.log(`   ⚠️ Could not click export button`);
                return results;
            }

            // Wait for export menu to appear
            const menuVisible = await this.waitForExportMenu();

            if (!menuVisible) {
                console.log(`   ⚠️ Export menu did not appear`);
                await this.closeAnyOpenMenus();
                return results;
            }

            // Get export options
            const exportOptions = await this.getExportOptions();

            if (exportOptions.length === 0) {
                console.log(`   ⚠️ No export options found in menu`);
                await this.closeAnyOpenMenus();
                return results;
            }

            console.log(`   📊 Found ${exportOptions.length} export options`);

            // Capture Excel export
            if (exportOptions.length >= 1) {
                console.log(`   📈 Attempting Excel export...`);
                const excelApis = await this.captureSingleExportOption(exportOptions[0], 'Excel');
                results.excel = excelApis;
            }

            // Re-open menu for PDF export
            const pdfClicked = await this.clickExportButton();
            if (pdfClicked) {
                await this.waitForExportMenu();
                const refreshedOptions = await this.getExportOptions();

                // Capture PDF export (usually last option)
                if (refreshedOptions.length >= 2) {
                    console.log(`   📄 Attempting PDF export...`);
                    const pdfApis = await this.captureSingleExportOption(
                        refreshedOptions[refreshedOptions.length - 1],
                        'PDF'
                    );
                    results.pdf = pdfApis;
                }
            }

        } catch (error) {
            console.error(`   ❌ Error during export capture:`,
                error instanceof Error ? error.message : 'Unknown error');
        } finally {
            await this.closeAnyOpenMenus();
        }

        console.log(`   ✅ Export capture complete: ${results.excel.length} Excel, ${results.pdf.length} PDF APIs`);
        return results;
    }

    private async waitForExportMenu(): Promise<boolean> {
        const menuSelectors = [
            'div.p-menuitem-content',
            '.export-menu',
            '[role="menu"]',
            '.dropdown-menu',
            '.ant-dropdown-menu'
        ];

        for (const selector of menuSelectors) {
            try {
                await this.page.waitForSelector(selector, {
                    timeout: 5000
                });
                console.log(`     ✅ Export menu appeared: ${selector}`);
                return true;
            } catch (error) {
                // Continue to next selector
            }
        }

        return false;
    }

    private async getExportOptions(): Promise<any[]> {
        const optionSelectors = [
            'div.p-menuitem-content a',
            'div.p-menuitem-content button',
            '[role="menuitem"]',
            '.export-option',
            '.dropdown-item'
        ];

        for (const selector of optionSelectors) {
            try {
                const options = await this.page.$$(selector);
                if (options.length > 0) {
                    return options;
                }
            } catch (error) {
                // Continue to next selector
            }
        }

        return [];
    }

    private async captureSingleExportOption(optionElement: any, type: string): Promise<ApiEndpoint[]> {
        const initialApiCount = this.capturedExportPrintEndpoints.length;

        try {
            // Set up API capture before clicking
            const capturePromise = this.waitForExportApis(8000);

            // Click the export option
            await optionElement.click();
            console.log(`     🎯 Clicked ${type} export option`);

            // Wait for APIs to be captured
            await capturePromise;

        } catch (error) {
            console.warn(`     ⚠️ Error clicking ${type} export option:`,
                error instanceof Error ? error.message : 'Unknown error');
        }

        return this.getNewApisSince(initialApiCount);
    }

    private async capturePrintFunctionality(): Promise<ApiEndpoint[]> {
        const initialApiCount = this.capturedExportPrintEndpoints.length;
        const printApis: ApiEndpoint[] = [];

        console.log(`   🖨️ Starting print functionality capture...`);

        try {
            const printSelectors = [
                '[data-testid="table_button_print"]',
                'button[data-testid*="print"]',
                'button:has-text("Print")'
            ];

            let printButton = null;

            // Find a clickable print button
            for (const selector of printSelectors) {
                const buttons = await this.page.$$(selector);
                if (buttons.length > 0) {
                    printButton = buttons[buttons.length - 1]; // Use last button
                    console.log(`     ✅ Found print button with selector: ${selector}`);
                    break;
                }
            }

            if (!printButton) {
                console.log(`     ⚠️ No clickable print button found`);
                return printApis;
            }

            // Capture APIs when print is clicked
            const capturePromise = this.waitForExportApis(8000);
            await printButton.click();
            console.log(`     🎯 Clicked print button`);

            await capturePromise;

            // Handle print dialog (if any)
            await this.handlePrintDialog();

        } catch (error) {
            console.error(`     ❌ Error during print capture:`,
                error instanceof Error ? error.message : 'Unknown error');
        } finally {
            await this.closeAnyOpenMenus();
        }

        const newApis = this.getNewApisSince(initialApiCount);
        console.log(`     ✅ Print capture complete: ${newApis.length} APIs captured`);

        return newApis;
    }

    private async handlePrintDialog(): Promise<void> {
        // Wait a bit for print dialog to appear
        await this.page.waitForTimeout(2000);

        try {
            // Try to close print dialog by pressing Escape
            await this.page.keyboard.press('Escape');
            await this.page.waitForTimeout(1000);
        } catch (error) {
            // Ignore errors when handling print dialog
        }
    }

    private async waitForExportApis(timeout: number): Promise<void> {
        return new Promise((resolve) => {
            const apiPrefix = this.config.getTargetApiPrefix();
            let apiDetected = false;

            const requestListener = (request: any) => {
                const url = request.url();
                if (url.startsWith(apiPrefix) &&
                    (request.resourceType() === "xhr" || request.resourceType() === "fetch")) {

                    const key = `${request.method()}-${url}`;
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
                        apiDetected = true;
                        console.log(`     🎯 Captured export/print API: ${request.method()} ${url}`);
                    }
                }
            };

            // Add listener
            this.page.onRequest(requestListener);

            // Set timeout
            setTimeout(() => {
                this.page.onRequest(() => { }); // Remove listener
                resolve();
            }, timeout);
        });
    }

    private getNewApisSince(startCount: number): ApiEndpoint[] {
        return this.capturedExportPrintEndpoints.slice(startCount);
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