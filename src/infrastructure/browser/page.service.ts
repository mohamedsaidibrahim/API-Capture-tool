// src/infrastructure/browser/page.service.ts
import { IPage, IRequest, IResponse, IElementHandle } from '../../core/interfaces/browser.interface';
import { Page, Request, Response, ElementHandle } from 'playwright';

export class PageService implements IPage {
    constructor(private readonly page: Page) { }

    // Existing methods
    onRequest(callback: (request: IRequest) => void): void {
        this.page.on('request', (request: Request) => {
            callback({
                url: () => request.url(),
                method: () => request.method(),
                resourceType: () => request.resourceType()
            });
        });
    }

    onResponse(callback: (response: IResponse) => void): void {
        this.page.on('response', (response: Response) => {
            callback({
                url: () => response.url(),
                status: () => response.status(),
                text: () => response.text()
            });
        });
    }

    async goto(url: string, options?: any): Promise<any> {
        return this.page.goto(url, options);
    }

    async waitForSelector(selector: string, options?: any): Promise<void> {
        await this.page.waitForSelector(selector, options);
    }

    async fill(selector: string, value: string): Promise<void> {
        await this.page.fill(selector, value);
    }

    async click(selector: string): Promise<void> {
        await this.page.click(selector);
    }

    url(): string {
        return this.page.url();
    }

    async waitForTimeout(ms: number): Promise<void> {
        await this.page.waitForTimeout(ms);
    }

    async $$(selector: string): Promise<any[]> {
        return this.page.$$(selector);
    }

    get keyboard() {
        return this.page.keyboard;
    }

    // NEW METHODS - Add these implementations
    async $(selector: string): Promise<any | null> {
        return this.page.$(selector);
    }

    async waitForLoadState(state?: 'load' | 'domcontentloaded' | 'networkidle', options?: any): Promise<void> {
        await this.page.waitForLoadState(state, options);
    }

    isClosed(): boolean {
        return this.page.isClosed();
    }

    async reload(options?: any): Promise<any> {
        return this.page.reload(options);
    }

    async bringToFront(): Promise<void> {
        await this.page.bringToFront();
    }

    async focus(selector: string): Promise<void> {
        await this.page.focus(selector);
    }

    async hover(selector: string): Promise<void> {
        await this.page.hover(selector);
    }

    async press(key: string): Promise<void> {
        await this.page.press('body', key);
    }
}