// src/infrastructure/browser/page.service.ts
import { IPage, IRequest, IResponse } from '../../core/interfaces/browser.interface';
import { Page, Request, Response } from 'playwright';

export class PageService implements IPage {
    constructor(private readonly page: Page) { }

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
}