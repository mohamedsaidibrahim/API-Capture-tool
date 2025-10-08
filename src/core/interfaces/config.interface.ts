// src/core/interfaces/config.interface.ts
export interface IConfiguration {
    [x: string]: any;
    getUsername(): string;
    getPassword(): string;
    getFrontendBaseUrl(): string;
    getTargetApiPrefix(): string;
    getOutputDir(): string;
    getCaptureTimeout(): number;
    getNavigationTimeout(): number;
}