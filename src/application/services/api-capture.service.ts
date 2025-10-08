// src/application/services/api-capture.service.ts
import { IApiCaptureService } from '../../core/interfaces/services.interface';
import { ApiEndpoint } from '../../core/entities/api-endpoint.entity';
import { UrlStructure } from '../../core/entities/url-structure.entity';
import { IConfiguration } from '../../core/interfaces/config.interface';
import { IPage } from '../../core/interfaces/browser.interface';

export class ApiCaptureService implements IApiCaptureService {
    private capturedEndpoints: Map<string, ApiEndpoint> = new Map();
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
                }
            }
        });
    }

    async captureApisFromUrls(urls: UrlStructure[]): Promise<ApiEndpoint[]> {
        const captureTimeout = this.config.getCaptureTimeout();
        const assertionSelector = 'p.date'; // Selector to wait for after navigation

        for (const urlEntry of urls) {
            console.log(`➡️ Navigating to: ${urlEntry.url}`);

            try {
                await this.page.goto(urlEntry.url, {
                    waitUntil: "domcontentloaded",
                    timeout: 60000,
                });

                await this.waitForApiCalls(captureTimeout);
                await this.page.waitForSelector(assertionSelector); // Additional wait for async calls
            } catch (error: any) {
                console.error(`❌ Navigation failed for ${urlEntry.url}:`, error.message);
            }
        }

        return Array.from(this.capturedEndpoints.values());
    }

    private async waitForApiCalls(timeout: number): Promise<boolean> {
        const initialCount = this.capturedEndpoints.size;
        const apiPrefix = this.config.getTargetApiPrefix();

        return new Promise((resolve) => {
            const timeoutId = setTimeout(() => {
                this.page.onRequest(() => { }); // Remove listener
                resolve(this.capturedEndpoints.size > initialCount);
            }, timeout);

            // We rely on the existing request listener to capture APIs
            // The timeout will resolve the promise after the specified time
        });
    }

    getCapturedCount(): number {
        return this.capturedEndpoints.size;
    }

    clearCaptured(): void {
        this.capturedEndpoints.clear();
    }
}