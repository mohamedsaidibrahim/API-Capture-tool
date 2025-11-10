// src/infrastructure/config/configuration.service.ts
import { IConfiguration } from '../../core/interfaces/config.interface';
import { ConfigurationException } from '../../core/exceptions/base.exception';
import dotenv from 'dotenv'
dotenv.config();

export class ConfigurationService implements IConfiguration {
    private readonly config: Map<string, any> = new Map();

    constructor() {
        this.loadConfiguration();
    }

    getExportPrintConfig() {
        return {
            maxRetries: parseInt(process.env.EXPORT_PRINT_MAX_RETRIES || '3'),
            interactionTimeout: parseInt(process.env.EXPORT_PRINT_TIMEOUT || '10000'),
            waitForNetworkIdle: process.env.EXPORT_PRINT_WAIT_NETWORK !== 'false'
        };
    }

    private loadConfiguration(): void {
        try {
            this.config.set('USERNAME', process.env.API_CAPTURE_USERNAME);
            this.config.set('PASSWORD', process.env.API_CAPTURE_PASSWORD);
            this.config.set('TARGET_API_PREFIX', process.env.TARGET_API_PREFIX);
            this.config.set('OUTPUT_DIR', process.env.OUTPUT_DIR);
            this.config.set('CAPTURE_TIMEOUT', process.env.CAPTURE_TIMEOUT);
            this.config.set('NAVIGATION_TIMEOUT', process.env.NAVIGATION_TIMEOUT);

            // FRONTEND_BASE_URL will be set from JSON file
        } catch (error: any) {
            throw new ConfigurationException(`Failed to load configuration: ${error.message}`);
        }
    }

    setFrontendBaseUrl(url: string): void {
        this.config.set('FRONTEND_BASE_URL', url);
    }

    getUsername(): string {
        return this.config.get('USERNAME');
    }

    getPassword(): string {
        return this.config.get('PASSWORD');
    }

    getFrontendBaseUrl(): string {
        return this.config.get('FRONTEND_BASE_URL');
    }

    getTargetApiPrefix(): string {
        return this.config.get('TARGET_API_PREFIX');
    }

    getOutputDir(): string {
        return this.config.get('OUTPUT_DIR');
    }

    getCaptureTimeout(): number {
        return this.config.get('CAPTURE_TIMEOUT');
    }

    getNavigationTimeout(): number {
        return this.config.get('NAVIGATION_TIMEOUT');
    }
}