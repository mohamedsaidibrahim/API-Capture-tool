import { ApiEndpoint } from "../entities/api-endpoint.entity";
import { CategorizedEndpoint } from "../entities/categorized-endpoint.entity";
import { UrlStructure } from "../entities/url-structure.entity";

// src/core/interfaces/services.interface.ts
export interface IApiCaptureService {
    captureApisFromUrls(urls: UrlStructure[]): Promise<ApiEndpoint[]>;
}

export interface IAuthenticationService {
    login(): Promise<void>;
    isAuthenticated(): boolean;
}

export interface IUrlCategorizationService {
    categorizeEndpoint(endpoint: ApiEndpoint, urls: UrlStructure[]): CategorizedEndpoint;
}