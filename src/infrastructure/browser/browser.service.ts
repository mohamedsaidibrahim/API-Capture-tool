// src/infrastructure/browser/browser.service.ts
import { IBrowserService, IPage } from '../../core/interfaces/browser.interface';
import { Browser, BrowserContext } from 'playwright';
import { BrowserException } from '../../core/exceptions/base.exception';

export class BrowserService implements IBrowserService {
    private isClosed = false;

    constructor(
        private readonly browser: Browser,
        private readonly context: BrowserContext
    ) { }

    async launch(): Promise<void> {
        // Browser is already launched in factory
    }

    async close(): Promise<void> {
        if (!this.isClosed) {
            await this.browser.close();
            this.isClosed = true;
        }
    }

    async navigateTo(url: string): Promise<void> {
        if (this.isClosed) {
            throw new BrowserException('Browser is closed');
        }

        const page = this.context.pages()[0];
        if (page) {
            try {
                await page.goto(url, {
                    waitUntil: 'domcontentloaded',
                    timeout: 60000,
                    referer: undefined // Let Playwright handle referer
                });
            } catch (error: any) {
                throw new BrowserException(`Navigation failed: ${error.message}`);
            }
        }
    }

    async waitForTimeout(ms: number): Promise<void> {
        if (this.isClosed) {
            return;
        }

        const page = this.context.pages()[0];
        if (page) {
            await page.waitForTimeout(ms);
        }
    }

    async waitForNetworkIdle(): Promise<void> {
        if (this.isClosed) {
            return;
        }

        const page = this.context.pages()[0];
        if (page) {
            try {
                await page.waitForLoadState('networkidle', { timeout: 10000 });
            } catch (error) {
                // Ignore timeout for networkidle, it's not critical
                console.log('⚠️ Network idle timeout, continuing...');
            }
        }
    }

    getCurrentUrl(): string {
        if (this.isClosed) {
            return '';
        }

        const page = this.context.pages()[0];
        return page?.url() || '';
    }

    isBrowserClosed(): boolean {
        return this.isClosed;
    }
}