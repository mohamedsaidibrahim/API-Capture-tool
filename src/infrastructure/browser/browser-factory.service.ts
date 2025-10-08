// src/infrastructure/browser/browser-factory.service.ts
import { IBrowserFactory, IBrowserService, IPage } from '../../core/interfaces/browser.interface';
import { BrowserService } from './browser.service';
import { PageService } from './page.service';
import { chromium, Browser, BrowserContext } from 'playwright';

export class BrowserFactory implements IBrowserFactory {
    private browser: Browser | null = null;
    private context: BrowserContext | null = null;

    async createBrowser(): Promise<IBrowserService> {
        this.browser = await chromium.launch({ headless: false, devtools: true });
        this.context = await this.browser.newContext();
        return new BrowserService(this.browser, this.context);
    }

    async createPage(): Promise<IPage> {
        if (!this.context) {
            throw new Error('Browser context not initialized. Call createBrowser first.');
        }
        const page = await this.context.newPage();
        return new PageService(page);
    }

    async close(): Promise<void> {
        if (this.browser) {
            await this.browser.close();
        }
    }
}