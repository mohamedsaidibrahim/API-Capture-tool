// src/core/interfaces/browser.interface.ts
export interface IBrowserService {
    launch(): Promise<void>;
    close(): Promise<void>;
    navigateTo(url: string): Promise<void>;
    waitForTimeout(ms: number): Promise<void>;
    getCurrentUrl(): string;
}

// src/core/interfaces/browser.interface.ts
export interface IPage {
    // Existing methods
    onRequest(callback: (request: IRequest) => void): void;
    onResponse(callback: (response: IResponse) => void): void;
    goto(url: string, options?: any): Promise<any>;
    waitForSelector(selector: string, options?: any): Promise<void>;
    fill(selector: string, value: string): Promise<void>;
    click(selector: string): Promise<void>;
    url(): string;
    waitForTimeout(ms: number): Promise<void>;
    $$(selector: string): Promise<any[]>;
    keyboard: {
        press(key: string): Promise<void>;
    };

    // NEW METHODS - Add these to fix the errors
    $(selector: string): Promise<any | null>;
    waitForLoadState(state?: 'load' | 'domcontentloaded' | 'networkidle', options?: any): Promise<void>;
    isClosed(): boolean;
    reload(options?: any): Promise<any>;
    bringToFront(): Promise<void>;
    focus(selector: string): Promise<void>;
    hover(selector: string): Promise<void>;
    press(key: string): Promise<void>;
}

export interface IElementHandle {
    click(options?: any): Promise<void>;
    hover(): Promise<void>;
    fill(value: string): Promise<void>;
    press(key: string): Promise<void>;
    textContent(): Promise<string | null>;
    innerText(): Promise<string | null>;
    innerHTML(): Promise<string | null>;
    getAttribute(name: string): Promise<string | null>;
    waitForElementState(state: 'visible' | 'hidden' | 'stable' | 'enabled' | 'disabled', options?: any): Promise<void>;
    isVisible(): Promise<boolean>;
    isHidden(): Promise<boolean>;
    isEnabled(): Promise<boolean>;
    isDisabled(): Promise<boolean>;
    boundingBox(): Promise<{ x: number; y: number; width: number; height: number } | null>;
    screenshot(options?: any): Promise<Buffer>;
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