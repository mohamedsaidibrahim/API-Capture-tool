// src/core/interfaces/browser.interface.ts
export interface IBrowserService {
    launch(): Promise<void>;
    close(): Promise<void>;
    navigateTo(url: string): Promise<void>;
    waitForTimeout(ms: number): Promise<void>;
    getCurrentUrl(): string;
}

export interface IPage {
    onRequest(callback: (request: IRequest) => void): void;
    onResponse(callback: (response: IResponse) => void): void;
    goto(url: string, options?: any): Promise<any>;
    waitForSelector(selector: string, options?: any): Promise<void>;
    fill(selector: string, value: string): Promise<void>;
    click(selector: string): Promise<void>;
    url(): string;
}

export interface IRequest {
    url(): string;
    method(): string;
    resourceType(): string;
}

export interface IResponse {
    url(): string;
    status(): number;
    text(): Promise<string>;
}

export interface IBrowserFactory {
    createBrowser(): Promise<IBrowserService>;
    createPage(): Promise<IPage>;
}