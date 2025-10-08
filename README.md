## Project Structure

```
api-capture-tool/
├── src/
│   ├── core/
│   │   ├── interfaces/
│   │   ├── entities/
│   │   └── exceptions/
│   ├── infrastructure/
│   │   ├── browser/
│   │   ├── file-system/
│   │   └── config/
│   ├── application/
│   │   ├── services/
│   │   ├── use-cases/
│   │   └── dtos/
│   └── main/
│       └── composition-root.ts
├── tests/
├── package.json
├── tsconfig.json
└── README.md
```

## Core Domain (Abstractions)

### 1. Interfaces (`src/core/interfaces/`)

```typescript
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
```

```typescript
// src/core/interfaces/file-system.interface.ts
export interface IFileSystem {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: any): void;
  writeFileSync(path: string, data: string): void;
  readFileSync(path: string, encoding: string): string;
}

export interface IUrlRepository {
  loadUrls(): Promise<UrlStructure[]>;
}

export interface IApiEndpointRepository {
  saveEndpoints(endpoints: OrganizedEndpoints): Promise<void>;
  saveModuleEndpoints(module: string, endpoints: any): Promise<void>;
}
```

```typescript
// src/core/interfaces/config.interface.ts
export interface IConfiguration {
  getUsername(): string;
  getPassword(): string;
  getFrontendBaseUrl(): string;
  getTargetApiPrefix(): string;
  getOutputDir(): string;
  getCaptureTimeout(): number;
  getNavigationTimeout(): number;
}
```

```typescript
// src/core/interfaces/services.interface.ts
export interface IApiCaptureService {
  captureApisFromUrls(urls: UrlStructure[]): Promise<ApiEndpoint[]>;
}

export interface IAuthenticationService {
  login(): Promise<void>;
  isAuthenticated(): boolean;
}

export interface IUrlCategorizationService {
  categorizeEndpoint(
    endpoint: ApiEndpoint,
    urls: UrlStructure[]
  ): CategorizedEndpoint;
}
```

### 2. Entities (`src/core/entities/`)

```typescript
// src/core/entities/url-structure.entity.ts
export class UrlStructure {
  constructor(
    public readonly module: string,
    public readonly section: string,
    public readonly subSection: string,
    public readonly url: string
  ) {}

  static create(
    module: string,
    section: string,
    subSection: string,
    url: string
  ): UrlStructure {
    return new UrlStructure(module, section, subSection, url);
  }
}
```

```typescript
// src/core/entities/api-endpoint.entity.ts
export class ApiEndpoint {
  constructor(
    public readonly url: string,
    public readonly method: string,
    public readonly sourceUrl: string,
    public readonly timestamp: Date
  ) {}

  static create(url: string, method: string, sourceUrl: string): ApiEndpoint {
    return new ApiEndpoint(url, method, sourceUrl, new Date());
  }

  getKey(): string {
    return `${this.method}-${this.url}`;
  }
}
```

```typescript
// src/core/entities/categorized-endpoint.entity.ts
export class CategorizedEndpoint {
  constructor(
    public readonly endpoint: ApiEndpoint,
    public readonly module: string,
    public readonly section: string,
    public readonly subSection: string
  ) {}

  static create(
    endpoint: ApiEndpoint,
    module: string,
    section: string,
    subSection: string
  ): CategorizedEndpoint {
    return new CategorizedEndpoint(endpoint, module, section, subSection);
  }
}
```

```typescript
// src/core/entities/organized-endpoints.entity.ts
export class OrganizedEndpoints {
  private endpoints: Map<
    string,
    Map<string, Map<string, CategorizedEndpoint[]>>
  > = new Map();

  addEndpoint(categorized: CategorizedEndpoint): void {
    const { module, section, subSection, endpoint } = categorized;

    if (!this.endpoints.has(module)) {
      this.endpoints.set(module, new Map());
    }

    const moduleMap = this.endpoints.get(module)!;
    if (!moduleMap.has(section)) {
      moduleMap.set(section, new Map());
    }

    const sectionMap = moduleMap.get(section)!;
    if (!sectionMap.has(subSection)) {
      sectionMap.set(subSection, []);
    }

    sectionMap.get(subSection)!.push(categorized);
  }

  getModules(): string[] {
    return Array.from(this.endpoints.keys());
  }

  getSections(module: string): string[] {
    return Array.from(this.endpoints.get(module)?.keys() || []);
  }

  getSubSections(module: string, section: string): string[] {
    return Array.from(this.endpoints.get(module)?.get(section)?.keys() || []);
  }

  getEndpoints(
    module: string,
    section: string,
    subSection: string
  ): CategorizedEndpoint[] {
    return this.endpoints.get(module)?.get(section)?.get(subSection) || [];
  }

  toJSON(): any {
    const result: any = {};

    for (const [module, sections] of this.endpoints) {
      result[module] = {};

      for (const [section, subSections] of sections) {
        result[module][section] = {};

        for (const [subSection, endpoints] of subSections) {
          result[module][section][subSection] = endpoints.map((ep) => ({
            method: ep.endpoint.method,
            endpoint: ep.endpoint.url,
            sourcePage: ep.endpoint.sourceUrl,
            timestamp: ep.endpoint.timestamp.toISOString(),
          }));
        }
      }
    }

    return result;
  }
}
```

### 3. Exceptions (`src/core/exceptions/`)

```typescript
// src/core/exceptions/base.exception.ts
export abstract class BaseException extends Error {
  abstract readonly code: string;

  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}

export class ConfigurationException extends BaseException {
  readonly code = "CONFIG_ERROR";
}

export class BrowserException extends BaseException {
  readonly code = "BROWSER_ERROR";
}

export class FileSystemException extends BaseException {
  readonly code = "FILE_SYSTEM_ERROR";
}

export class AuthenticationException extends BaseException {
  readonly code = "AUTHENTICATION_ERROR";
}
```

## Infrastructure Layer

### 1. Configuration (`src/infrastructure/config/`)

```typescript
// src/infrastructure/config/configuration.service.ts
import { IConfiguration } from "../../core/interfaces/config.interface";
import { ConfigurationException } from "../../core/exceptions/base.exception";

export class ConfigurationService implements IConfiguration {
  private readonly config: Map<string, any> = new Map();

  constructor() {
    this.loadConfiguration();
  }

  private loadConfiguration(): void {
    try {
      this.config.set(
        "USERNAME",
        process.env.API_CAPTURE_USERNAME || "semob83188@maonyn.com"
      );
      this.config.set(
        "PASSWORD",
        process.env.API_CAPTURE_PASSWORD || "e01144778899A$*"
      );
      this.config.set(
        "TARGET_API_PREFIX",
        "https://microtecsaudi.com:2032/erp-apis"
      );
      this.config.set("OUTPUT_DIR", "08new_api_endpoints_output");
      this.config.set("CAPTURE_TIMEOUT", 15000);
      this.config.set("NAVIGATION_TIMEOUT", 60000);

      // FRONTEND_BASE_URL will be set from JSON file
    } catch (error) {
      throw new ConfigurationException(
        `Failed to load configuration: ${error.message}`
      );
    }
  }

  setFrontendBaseUrl(url: string): void {
    this.config.set("FRONTEND_BASE_URL", url);
  }

  getUsername(): string {
    return this.config.get("USERNAME");
  }

  getPassword(): string {
    return this.config.get("PASSWORD");
  }

  getFrontendBaseUrl(): string {
    return this.config.get("FRONTEND_BASE_URL");
  }

  getTargetApiPrefix(): string {
    return this.config.get("TARGET_API_PREFIX");
  }

  getOutputDir(): string {
    return this.config.get("OUTPUT_DIR");
  }

  getCaptureTimeout(): number {
    return this.config.get("CAPTURE_TIMEOUT");
  }

  getNavigationTimeout(): number {
    return this.config.get("NAVIGATION_TIMEOUT");
  }
}
```

### 2. File System (`src/infrastructure/file-system/`)

```typescript
// src/infrastructure/file-system/file-system.service.ts
import { IFileSystem } from "../../core/interfaces/file-system.interface";
import { FileSystemException } from "../../core/exceptions/base.exception";
import fs from "fs";
import path from "path";

export class FileSystemService implements IFileSystem {
  existsSync(filePath: string): boolean {
    return fs.existsSync(filePath);
  }

  mkdirSync(dirPath: string, options?: any): void {
    try {
      fs.mkdirSync(dirPath, options);
    } catch (error) {
      throw new FileSystemException(
        `Failed to create directory ${dirPath}: ${error.message}`
      );
    }
  }

  writeFileSync(filePath: string, data: string): void {
    try {
      fs.writeFileSync(filePath, data);
    } catch (error) {
      throw new FileSystemException(
        `Failed to write file ${filePath}: ${error.message}`
      );
    }
  }

  readFileSync(filePath: string, encoding: string): string {
    try {
      return fs.readFileSync(filePath, encoding);
    } catch (error) {
      throw new FileSystemException(
        `Failed to read file ${filePath}: ${error.message}`
      );
    }
  }
}
```

```typescript
// src/infrastructure/file-system/url.repository.ts
import { IUrlRepository } from "../../core/interfaces/file-system.interface";
import { UrlStructure } from "../../core/entities/url-structure.entity";
import { IFileSystem } from "../../core/interfaces/file-system.interface";
import { IConfiguration } from "../../core/interfaces/config.interface";
import { FileSystemException } from "../../core/exceptions/base.exception";
import path from "path";

export class UrlRepository implements IUrlRepository {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly config: IConfiguration
  ) {}

  async loadUrls(): Promise<UrlStructure[]> {
    try {
      const jsonFile = "microtec_erp_urls.json";
      const filePath = path.join(process.cwd(), "Input", jsonFile);

      if (!this.fileSystem.existsSync(filePath)) {
        throw new FileSystemException(
          `ERP modules JSON file not found at: ${filePath}`
        );
      }

      const data = this.fileSystem.readFileSync(filePath, "utf8");
      const jsonData = JSON.parse(data);

      if (!jsonData.base_url || !jsonData.modules) {
        throw new FileSystemException(
          'Invalid JSON structure - missing "base_url" or "modules" property'
        );
      }

      this.config.setFrontendBaseUrl(jsonData.base_url);
      const structuredUrls: UrlStructure[] = [];

      const parseModule = (
        moduleName: string,
        moduleData: any,
        currentPath: string = ""
      ) => {
        for (const key in moduleData) {
          const value = moduleData[key];
          if (Array.isArray(value)) {
            value.forEach((urlSuffix) => {
              const fullUrl = `${jsonData.base_url}${urlSuffix}`.replace(
                /([^:]\/)\/+/g,
                "$1"
              );
              structuredUrls.push(
                UrlStructure.create(
                  moduleName,
                  key,
                  currentPath || key,
                  fullUrl
                )
              );
            });
          } else if (typeof value === "object" && value !== null) {
            parseModule(moduleName, value, key);
          }
        }
      };

      for (const moduleName in jsonData.modules) {
        const initialPath =
          moduleName === "General_Settings" ? "Dashboard" : "";
        parseModule(moduleName, jsonData.modules[moduleName], initialPath);
      }

      return structuredUrls.sort((a, b) => b.url.length - a.url.length);
    } catch (error) {
      if (error instanceof FileSystemException) {
        throw error;
      }
      throw new FileSystemException(`Failed to load URLs: ${error.message}`);
    }
  }
}
```

```typescript
// src/infrastructure/file-system/api-endpoint.repository.ts
import { IApiEndpointRepository } from "../../core/interfaces/file-system.interface";
import { OrganizedEndpoints } from "../../core/entities/organized-endpoints.entity";
import { IFileSystem } from "../../core/interfaces/file-system.interface";
import { IConfiguration } from "../../core/interfaces/config.interface";
import path from "path";

export class ApiEndpointRepository implements IApiEndpointRepository {
  constructor(
    private readonly fileSystem: IFileSystem,
    private readonly config: IConfiguration
  ) {}

  async saveEndpoints(endpoints: OrganizedEndpoints): Promise<void> {
    const outputDir = this.config.getOutputDir();
    this.ensureDirectoryExists(outputDir);

    const outputPath = path.join(outputDir, "all_endpoints.json");
    this.fileSystem.writeFileSync(
      outputPath,
      JSON.stringify(endpoints.toJSON(), null, 2)
    );
  }

  async saveModuleEndpoints(module: string, endpoints: any): Promise<void> {
    const outputDir = this.config.getOutputDir();
    const moduleDir = path.join(outputDir, module);
    this.ensureDirectoryExists(moduleDir);

    const moduleFilePath = path.join(moduleDir, `${module}_endpoints.json`);
    this.fileSystem.writeFileSync(
      moduleFilePath,
      JSON.stringify(endpoints, null, 2)
    );

    // Save section and subsection files
    for (const [sectionName, sectionData] of Object.entries(endpoints)) {
      const sectionDir = path.join(moduleDir, sectionName);
      this.ensureDirectoryExists(sectionDir);

      const sectionFilePath = path.join(
        sectionDir,
        `${sectionName}_endpoints.json`
      );
      this.fileSystem.writeFileSync(
        sectionFilePath,
        JSON.stringify(sectionData, null, 2)
      );
    }
  }

  private ensureDirectoryExists(dirPath: string): void {
    if (!this.fileSystem.existsSync(dirPath)) {
      this.fileSystem.mkdirSync(dirPath, { recursive: true });
    }
  }
}
```

### 3. Browser (`src/infrastructure/browser/`)

```typescript
// src/infrastructure/browser/browser-factory.service.ts
import {
  IBrowserFactory,
  IBrowserService,
  IPage,
} from "../../core/interfaces/browser.interface";
import { BrowserService } from "./browser.service";
import { PageService } from "./page.service";
import { chromium, Browser, BrowserContext } from "playwright";

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
      throw new Error(
        "Browser context not initialized. Call createBrowser first."
      );
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
```

```typescript
// src/infrastructure/browser/browser.service.ts
import {
  IBrowserService,
  IPage,
} from "../../core/interfaces/browser.interface";
import { Browser, BrowserContext } from "playwright";

export class BrowserService implements IBrowserService {
  constructor(
    private readonly browser: Browser,
    private readonly context: BrowserContext
  ) {}

  async launch(): Promise<void> {
    // Browser is already launched in factory
  }

  async close(): Promise<void> {
    await this.browser.close();
  }

  async navigateTo(url: string): Promise<void> {
    const page = this.context.pages()[0];
    if (page) {
      await page.goto(url, { waitUntil: "domcontentloaded", timeout: 60000 });
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
    return page?.url() || "";
  }
}
```

```typescript
// src/infrastructure/browser/page.service.ts
import {
  IPage,
  IRequest,
  IResponse,
} from "../../core/interfaces/browser.interface";
import { Page, Request, Response } from "playwright";

export class PageService implements IPage {
  constructor(private readonly page: Page) {}

  onRequest(callback: (request: IRequest) => void): void {
    this.page.on("request", (request: Request) => {
      callback({
        url: () => request.url(),
        method: () => request.method(),
        resourceType: () => request.resourceType(),
      });
    });
  }

  onResponse(callback: (response: IResponse) => void): void {
    this.page.on("response", (response: Response) => {
      callback({
        url: () => response.url(),
        status: () => response.status(),
        text: () => response.text(),
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
}
```

## Application Layer

### 1. Services (`src/application/services/`)

```typescript
// src/application/services/api-capture.service.ts
import { IApiCaptureService } from "../../core/interfaces/services.interface";
import { ApiEndpoint } from "../../core/entities/api-endpoint.entity";
import { UrlStructure } from "../../core/entities/url-structure.entity";
import { IConfiguration } from "../../core/interfaces/config.interface";
import { IPage } from "../../core/interfaces/browser.interface";

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

    for (const urlEntry of urls) {
      console.log(`➡️ Navigating to: ${urlEntry.url}`);

      try {
        await this.page.goto(urlEntry.url, {
          waitUntil: "domcontentloaded",
          timeout: 60000,
        });

        await this.waitForApiCalls(captureTimeout);
        await this.page.waitForTimeout(2000); // Additional wait for async calls
      } catch (error) {
        console.error(
          `❌ Navigation failed for ${urlEntry.url}:`,
          error.message
        );
      }
    }

    return Array.from(this.capturedEndpoints.values());
  }

  private async waitForApiCalls(timeout: number): Promise<boolean> {
    const initialCount = this.capturedEndpoints.size;
    const apiPrefix = this.config.getTargetApiPrefix();

    return new Promise((resolve) => {
      const timeoutId = setTimeout(() => {
        this.page.onRequest(() => {}); // Remove listener
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
```

```typescript
// src/application/services/authentication.service.ts
import { IAuthenticationService } from "../../core/interfaces/services.interface";
import { IConfiguration } from "../../core/interfaces/config.interface";
import { IPage } from "../../core/interfaces/browser.interface";
import { AuthenticationException } from "../../core/exceptions/base.exception";

export class AuthenticationService implements IAuthenticationService {
  private authenticated: boolean = false;

  constructor(
    private readonly config: IConfiguration,
    private readonly page: IPage
  ) {}

  async login(): Promise<void> {
    console.log("🌍 Navigating to Login Page...");

    try {
      const baseUrl = this.config.getFrontendBaseUrl();
      console.log(`🔑 Logging in at: ${baseUrl}`);

      await this.page.goto(`${baseUrl}/erp`, {
        waitUntil: "networkidle",
        timeout: 60000,
      });

      const currentUrl = this.page.url();
      if (currentUrl.includes("/erp/dashboard") || currentUrl === baseUrl) {
        console.log(
          "Already logged in or redirected to dashboard. Skipping login steps."
        );
        this.authenticated = true;
        return;
      }

      console.log(`📧 Entering email: ${this.config.getUsername()}`);
      await this.page.fill("#Email", this.config.getUsername());

      console.log(`🔒 Entering password`);
      await this.page.fill("#Password", this.config.getPassword());
      await this.page.click('button[type="submit"]:first-of-type');

      // Wait for navigation to complete
      await this.page.waitForTimeout(5000);

      await this.page.waitForSelector("body", { timeout: 60000 });

      this.authenticated = true;
      console.log("✅ Authentication successful!");
    } catch (error) {
      throw new AuthenticationException(`Login failed: ${error.message}`);
    }
  }

  isAuthenticated(): boolean {
    return this.authenticated;
  }
}
```

```typescript
// src/application/services/url-categorization.service.ts
import { IUrlCategorizationService } from "../../core/interfaces/services.interface";
import { CategorizedEndpoint } from "../../core/entities/categorized-endpoint.entity";
import { ApiEndpoint } from "../../core/entities/api-endpoint.entity";
import { UrlStructure } from "../../core/entities/url-structure.entity";
import { IConfiguration } from "../../core/interfaces/config.interface";

export class UrlCategorizationService implements IUrlCategorizationService {
  constructor(private readonly config: IConfiguration) {}

  categorizeEndpoint(
    endpoint: ApiEndpoint,
    urls: UrlStructure[]
  ): CategorizedEndpoint {
    const { sourceUrl } = endpoint;
    const frontendBaseUrl = this.config.getFrontendBaseUrl();
    const targetApiPrefix = this.config.getTargetApiPrefix();

    let module = "Uncategorized";
    let section = "Uncategorized";
    let subSection = "Uncategorized";

    // Find the most specific matching navigation entry
    const matchingNavigationEntry = urls.find((entry) =>
      sourceUrl.startsWith(entry.url)
    );

    if (matchingNavigationEntry) {
      module = matchingNavigationEntry.module;
      section = matchingNavigationEntry.section;
      subSection = matchingNavigationEntry.subSection;
    } else {
      // Fallback inference logic
      const categorized = this.inferFromUrl(
        endpoint,
        frontendBaseUrl,
        targetApiPrefix
      );
      module = categorized.module;
      section = categorized.section;
      subSection = categorized.subSection;
    }

    return CategorizedEndpoint.create(endpoint, module, section, subSection);
  }

  private inferFromUrl(
    endpoint: ApiEndpoint,
    frontendBaseUrl: string,
    targetApiPrefix: string
  ): { module: string; section: string; subSection: string } {
    const relativeSourcePath = endpoint.sourceUrl
      .replace(frontendBaseUrl, "")
      .split("?")[0];
    const pathParts = relativeSourcePath.split("/").filter((p) => p.length > 0);

    let module = "Uncategorized";
    let section = "Uncategorized";
    let subSection = "Uncategorized";

    // Module inference
    if (pathParts.length > 0) {
      module = this.normalizeModuleName(pathParts[0]);
    }

    // Section and subsection inference
    if (pathParts.length > 1) {
      section = this.normalizeSectionName(pathParts[1]);
      subSection =
        pathParts.length > 2 ? this.capitalizeFirst(pathParts[2]) : "General";
    } else {
      section = "Dashboard";
      subSection = "General";
    }

    // API-specific refinements
    const apiRelativePath = endpoint.url
      .replace(targetApiPrefix, "")
      .split("?")[0];
    if (
      apiRelativePath.includes("SideMenu") ||
      apiRelativePath.includes("CurrentUserInfo") ||
      apiRelativePath.includes("workflows/GetRequestsCount")
    ) {
      section = "Dashboard";
      if (apiRelativePath.includes("SideMenu")) subSection = "SideMenu";
      else if (apiRelativePath.includes("CurrentUserInfo"))
        subSection = "CurrentUserInfo";
      else if (apiRelativePath.includes("workflows")) subSection = "Workflows";
      else subSection = "GeneralDashboardAPI";
    }

    return { module, section, subSection };
  }

  private normalizeModuleName(module: string): string {
    const mappings: { [key: string]: string } = {
      erp: "General_Settings",
      accounting: "Accounting",
      finance: "Finance",
      purchase: "Purchase",
      sales: "Sales",
      inventory: "Inventory",
    };
    return mappings[module.toLowerCase()] || this.capitalizeFirst(module);
  }

  private normalizeSectionName(section: string): string {
    const mappings: { [key: string]: string } = {
      masterdata: "Master_data",
      admin: "Adminstration",
    };
    return mappings[section.toLowerCase()] || this.capitalizeFirst(section);
  }

  private capitalizeFirst(str: string): string {
    return str.charAt(0).toUpperCase() + str.slice(1);
  }
}
```

### 2. Use Cases (`src/application/use-cases/`)

```typescript
// src/application/use-cases/capture-api-endpoints.use-case.ts
import { IUrlRepository } from "../../core/interfaces/file-system.interface";
import { IApiEndpointRepository } from "../../core/interfaces/file-system.interface";
import { IApiCaptureService } from "../../core/interfaces/services.interface";
import { IAuthenticationService } from "../../core/interfaces/services.interface";
import { IUrlCategorizationService } from "../../core/interfaces/services.interface";
import { OrganizedEndpoints } from "../../core/entities/organized-endpoints.entity";

export class CaptureApiEndpointsUseCase {
  constructor(
    private readonly urlRepository: IUrlRepository,
    private readonly apiEndpointRepository: IApiEndpointRepository,
    private readonly apiCaptureService: IApiCaptureService,
    private readonly authenticationService: IAuthenticationService,
    private readonly urlCategorizationService: IUrlCategorizationService
  ) {}

  async execute(): Promise<void> {
    console.log("🚀 Starting API Endpoint Capture Process...");

    // Step 1: Load URLs
    console.log("📥 Loading URLs from configuration...");
    const urls = await this.urlRepository.loadUrls();
    console.log(`ℹ️ Found ${urls.length} URLs to process`);

    // Step 2: Authenticate
    console.log("🔐 Authenticating...");
    await this.authenticationService.login();

    // Step 3: Capture APIs
    console.log("🎯 Capturing API endpoints...");
    const capturedEndpoints = await this.apiCaptureService.captureApisFromUrls(
      urls
    );
    console.log(`✅ Captured ${capturedEndpoints.length} unique API endpoints`);

    if (capturedEndpoints.length === 0) {
      console.warn("⚠️ No API endpoints were captured");
      return;
    }

    // Step 4: Categorize endpoints
    console.log("🏷️ Categorizing endpoints...");
    const organizedEndpoints = new OrganizedEndpoints();

    for (const endpoint of capturedEndpoints) {
      const categorized = this.urlCategorizationService.categorizeEndpoint(
        endpoint,
        urls
      );
      organizedEndpoints.addEndpoint(categorized);
    }

    // Step 5: Save results
    console.log("💾 Saving results...");
    await this.apiEndpointRepository.saveEndpoints(organizedEndpoints);

    // Save individual module files
    for (const module of organizedEndpoints.getModules()) {
      const moduleData: any = {};
      for (const section of organizedEndpoints.getSections(module)) {
        moduleData[section] = {};
        for (const subSection of organizedEndpoints.getSubSections(
          module,
          section
        )) {
          const endpoints = organizedEndpoints.getEndpoints(
            module,
            section,
            subSection
          );
          moduleData[section][subSection] = endpoints.map((ep) => ({
            method: ep.endpoint.method,
            endpoint: ep.endpoint.url,
            sourcePage: ep.endpoint.sourceUrl,
            timestamp: ep.endpoint.timestamp.toISOString(),
          }));
        }
      }
      await this.apiEndpointRepository.saveModuleEndpoints(module, moduleData);
    }

    console.log("🎉 API Endpoint Capture Process Completed Successfully!");
  }
}
```

## Main Application

### Composition Root (`src/main/composition-root.ts`)

```typescript
// src/main/composition-root.ts
import { ConfigurationService } from "../infrastructure/config/configuration.service";
import { FileSystemService } from "../infrastructure/file-system/file-system.service";
import { UrlRepository } from "../infrastructure/file-system/url.repository";
import { ApiEndpointRepository } from "../infrastructure/file-system/api-endpoint.repository";
import { BrowserFactory } from "../infrastructure/browser/browser-factory.service";
import { ApiCaptureService } from "../application/services/api-capture.service";
import { AuthenticationService } from "../application/services/authentication.service";
import { UrlCategorizationService } from "../application/services/url-categorization.service";
import { CaptureApiEndpointsUseCase } from "../application/use-cases/capture-api-endpoints.use-case";

export class CompositionRoot {
  private static instance: CompositionRoot;

  // Infrastructure
  public readonly config: ConfigurationService;
  public readonly fileSystem: FileSystemService;
  public readonly urlRepository: UrlRepository;
  public readonly apiEndpointRepository: ApiEndpointRepository;
  public readonly browserFactory: BrowserFactory;

  // Services
  public readonly apiCaptureService: ApiCaptureService;
  public readonly authenticationService: AuthenticationService;
  public readonly urlCategorizationService: UrlCategorizationService;

  // Use Cases
  public readonly captureApiEndpointsUseCase: CaptureApiEndpointsUseCase;

  private constructor() {
    // Infrastructure
    this.config = new ConfigurationService();
    this.fileSystem = new FileSystemService();
    this.urlRepository = new UrlRepository(this.fileSystem, this.config);
    this.apiEndpointRepository = new ApiEndpointRepository(
      this.fileSystem,
      this.config
    );
    this.browserFactory = new BrowserFactory();

    // Services (will be initialized after browser setup)
    this.apiCaptureService = null as any;
    this.authenticationService = null as any;
    this.urlCategorizationService = new UrlCategorizationService(this.config);

    // Use Cases
    this.captureApiEndpointsUseCase = new CaptureApiEndpointsUseCase(
      this.urlRepository,
      this.apiEndpointRepository,
      null as any, // Will be set after service initialization
      null as any, // Will be set after service initialization
      this.urlCategorizationService
    );
  }

  static getInstance(): CompositionRoot {
    if (!CompositionRoot.instance) {
      CompositionRoot.instance = new CompositionRoot();
    }
    return CompositionRoot.instance;
  }

  async initializeBrowserServices(): Promise<void> {
    const browser = await this.browserFactory.createBrowser();
    const page = await this.browserFactory.createPage();

    // Initialize services that depend on browser/page
    this.apiCaptureService = new ApiCaptureService(this.config, page);
    this.authenticationService = new AuthenticationService(this.config, page);

    // Update use case with the initialized services
    (this.captureApiEndpointsUseCase as any).apiCaptureService =
      this.apiCaptureService;
    (this.captureApiEndpointsUseCase as any).authenticationService =
      this.authenticationService;
  }

  async cleanup(): Promise<void> {
    await this.browserFactory.close();
  }
}
```

### Main Entry Point (`src/main/main.ts`)

```typescript
// src/main/main.ts
import { CompositionRoot } from "./composition-root";

async function main() {
  const app = CompositionRoot.getInstance();

  try {
    console.log("🚀 Initializing API Capture Tool...");

    // Initialize browser-dependent services
    await app.initializeBrowserServices();

    // Execute the main use case
    await app.captureApiEndpointsUseCase.execute();

    console.log("✅ Application completed successfully");
  } catch (error) {
    console.error("❌ Application failed:", error);
    process.exit(1);
  } finally {
    await app.cleanup();
  }
}

// Handle uncaught exceptions
process.on("uncaughtException", (error) => {
  console.error("Uncaught Exception:", error);
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  console.error("Unhandled Rejection at:", promise, "reason:", reason);
  process.exit(1);
});

// Run the application
if (require.main === module) {
  main();
}

export { main };
```

## Package Configuration

### `package.json`

```json
{
  "name": "api-capture-tool",
  "version": "1.0.0",
  "description": "Advanced API endpoint capture tool following SOLID principles",
  "main": "dist/src/main/main.js",
  "scripts": {
    "build": "tsc",
    "start": "node dist/src/main/main.js",
    "dev": "ts-node src/main/main.ts",
    "test": "jest",
    "lint": "eslint src/**/*.ts"
  },
  "dependencies": {
    "playwright": "^1.40.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0",
    "@typescript-eslint/eslint-plugin": "^6.0.0",
    "@typescript-eslint/parser": "^6.0.0",
    "eslint": "^8.0.0",
    "jest": "^29.0.0",
    "ts-node": "^10.9.0",
    "typescript": "^5.0.0"
  }
}
```

### `tsconfig.json`

```json
{
  "compilerOptions": {
    "target": "ES2020",
    "module": "commonjs",
    "lib": ["ES2020", "DOM"],
    "outDir": "./dist",
    "rootDir": "./src",
    "strict": true,
    "esModuleInterop": true,
    "skipLibCheck": true,
    "forceConsistentCasingInFileNames": true,
    "resolveJsonModule": true,
    "declaration": true,
    "declarationMap": true,
    "sourceMap": true,
    "experimentalDecorators": true,
    "emitDecoratorMetadata": true
  },
  "include": ["src/**/*"],
  "exclude": ["node_modules", "dist", "tests"]
}
```

## Key SOLID Principles Applied

1. **Single Responsibility**: Each class has a single, well-defined responsibility
2. **Open/Closed**: Easy to extend with new browser implementations or file systems
3. **Liskov Substitution**: All implementations properly follow their interfaces
4. **Interface Segregation**: Small, focused interfaces
5. **Dependency Inversion**: Depend on abstractions, not concretions

This structure provides:

- **Testability**: Easy to mock dependencies
- **Maintainability**: Clear separation of concerns
- **Extensibility**: Easy to add new features
- **Scalability**: Well-organized codebase that can grow
- **Reusability**: Components can be reused in other projects
