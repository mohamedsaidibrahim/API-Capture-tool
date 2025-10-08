// src/infrastructure/browser/browser.service.ts
import { IBrowserService, IPage } from '../../core/interfaces/browser.interface';
import { Browser, BrowserContext } from 'playwright';

export class BrowserService implements IBrowserService {
    constructor(
        private readonly browser: Browser,
        private readonly context: BrowserContext
    ) { }

    async launch(): Promise<void> {
        // Browser is already launched in factory
    }

    async close(): Promise<void> {
        await this.browser.close();
    }

    async navigateTo(url: string): Promise<void> {
        const page = this.context.pages()[0];
        if (page) {
            await page.goto(url, { waitUntil: 'domcontentloaded', timeout: 60000 });
        }
    }

    async waitForTimeout(ms: number): Promise<void> {
        const page = this.context.pages()[0];
        if (page) {
            await page.waitForTimeout(ms);
        }
    }

    getCurrentUrl(): string {
        const page = this.context.pages()[0];
        return page?.url() || '';
    }
}