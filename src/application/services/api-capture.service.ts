// src/application/services/api-capture.service.ts
import { IApiCaptureService } from '../../core/interfaces/services.interface';
import { ApiEndpoint } from '../../core/entities/api-endpoint.entity';
import { UrlStructure } from '../../core/entities/url-structure.entity';
import { IConfiguration } from '../../core/interfaces/config.interface';
import { IPage } from '../../core/interfaces/browser.interface';

export class ApiCaptureService implements IApiCaptureService {
    private capturedEndpoints: Map<string, ApiEndpoint> = new Map();
    private navigationFailures: Map<string, string> = new Map();

    constructor(
        private readonly config: IConfiguration,
        private readonly page: IPage
    ) {
        this.setupRequestListener();
    }

    private setupRequestListener(): void {
        const apiPrefix = this.config.getTargetApiPrefix();

        this.page.onRequest((request) => {
            const url = request.url();
            if (
                url.startsWith(apiPrefix) &&
                (request.resourceType() === "xhr" || request.resourceType() === "fetch")
            ) {
                const key = `${request.method()}-${url}`;
                if (!this.capturedEndpoints.has(key)) {
                    const endpoint = ApiEndpoint.create(
                        url,
                        request.method(),
                        this.page.url()
                    );
                    this.capturedEndpoints.set(key, endpoint);
                    console.log(`🎯 Captured API: ${request.method()} ${url}`);
                }
            }
        });
    }

    async captureApisFromUrls(urls: UrlStructure[]): Promise<ApiEndpoint[]> {
        const captureTimeout = this.config.getCaptureTimeout();
        let successfulNavigations = 0;

        for (const [index, urlEntry] of urls.entries()) {
            console.log(`\n📊 Progress: ${index + 1}/${urls.length}`);
            console.log(`➡️ Navigating to: ${urlEntry.url}`);

            const success = await this.navigateToUrlSafely(urlEntry.url, captureTimeout);

            if (success) {
                successfulNavigations++;
                await this.waitForApiCalls(captureTimeout);
                setTimeout(() => { }, 3000);

                // Add small delay between successful navigations to prevent overload
                if (index < urls.length - 1) {
                    setTimeout(() => { }, 1000);
                }
            } else {
                console.warn(`⏭️  Skipping URL due to navigation failure: ${urlEntry.url}`);
            }
        }

        console.log(`\n📈 Navigation Summary:`);
        console.log(`✅ Successful: ${successfulNavigations}/${urls.length}`);
        console.log(`❌ Failed: ${this.navigationFailures.size}/${urls.length}`);

        if (this.navigationFailures.size > 0) {
            console.log(`\n🔍 Failed URLs:`);
            this.navigationFailures.forEach((reason, url) => {
                console.log(`   • ${url}: ${reason}`);
            });
        }

        return Array.from(this.capturedEndpoints.values());
    }

    private async navigateToUrlSafely(url: string, timeout: number): Promise<boolean> {
        const maxRetries = 2;

        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                console.log(`   Attempt ${attempt}/${maxRetries}...`);

                // Use Promise.race to handle both navigation and timeouts
                const navigationPromise = this.page.goto(url, {
                    waitUntil: "domcontentloaded",
                    timeout: timeout,
                    referer: this.config.getFrontendBaseUrl()
                });

                const result = await Promise.race([
                    navigationPromise,
                    new Promise((_, reject) =>
                        setTimeout(() => reject(new Error('Navigation timeout')), timeout + 5000)
                    )
                ]);

                // Verify we reached the intended URL
                const currentUrl = this.page.url();
                if (currentUrl.includes('chrome-error') || currentUrl.includes('error')) {
                    throw new Error(`Navigated to error page: ${currentUrl}`);
                }

                console.log(`   ✅ Navigation successful`);
                return true;

            } catch (error) {
                const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
                console.warn(`   ❌ Navigation attempt ${attempt} failed:`, errorMessage);

                if (attempt === maxRetries) {
                    this.navigationFailures.set(url, errorMessage);
                    return false;
                }

                // Wait before retry
                setTimeout(() => { }, 2000);
            }
        }

        return false;
    }

    private async waitForApiCalls(timeout: number): Promise<boolean> {
        const initialCount = this.capturedEndpoints.size;
        const apiPrefix = this.config.getTargetApiPrefix();

        return new Promise((resolve) => {
            let apiDetected = false;

            const requestListener = (request: any) => {
                const url = request.url();
                if (url.startsWith(apiPrefix) &&
                    (request.resourceType() === "xhr" || request.resourceType() === "fetch")) {
                    apiDetected = true;
                }
            };

            // Add temporary listener
            this.page.onRequest(requestListener);

            setTimeout(() => {
                this.page.onRequest(() => { }); // Remove listener
                const newApisCaptured = this.capturedEndpoints.size > initialCount;
                resolve(apiDetected || newApisCaptured);
            }, timeout);
        });
    }

    getCapturedCount(): number {
        return this.capturedEndpoints.size;
    }

    getNavigationFailures(): Map<string, string> {
        return new Map(this.navigationFailures);
    }

    clearCaptured(): void {
        this.capturedEndpoints.clear();
        this.navigationFailures.clear();
    }
}