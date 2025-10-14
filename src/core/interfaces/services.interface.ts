// src/core/interfaces/services.interface.ts
import { ApiEndpoint } from '../entities/api-endpoint.entity';
import { UrlStructure } from '../entities/url-structure.entity';
import { CategorizedEndpoint } from '../entities/categorized-endpoint.entity';

export interface IApiCaptureService {
    captureApisFromUrls(urls: UrlStructure[]): Promise<ApiEndpoint[]>;
    getCapturedCount(): number;
    getNavigationFailures(): Map<string, string>;
    clearCaptured(): void;
}

export interface IAuthenticationService {
    login(): Promise<void>;
    isAuthenticated(): boolean;
}

export interface IUrlCategorizationService {
    categorizeEndpoint(endpoint: ApiEndpoint, urls: UrlStructure[]): CategorizedEndpoint;
}