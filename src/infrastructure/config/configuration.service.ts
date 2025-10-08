// src/infrastructure/config/configuration.service.ts
import { IConfiguration } from '../../core/interfaces/config.interface';
import { ConfigurationException } from '../../core/exceptions/base.exception';

export class ConfigurationService implements IConfiguration {
    private readonly config: Map<string, any> = new Map();

    constructor() {
        this.loadConfiguration();
    }

    private loadConfiguration(): void {
        try {
            this.config.set('USERNAME', process.env.API_CAPTURE_USERNAME || 'semob83188@maonyn.com');
            this.config.set('PASSWORD', process.env.API_CAPTURE_PASSWORD || 'e01144778899A$*');
            this.config.set('TARGET_API_PREFIX', 'https://microtecsaudi.com:2032/erp-apis');
            this.config.set('OUTPUT_DIR', '08new_api_endpoints_output');
            this.config.set('CAPTURE_TIMEOUT', 15000);
            this.config.set('NAVIGATION_TIMEOUT', 60000);

            // FRONTEND_BASE_URL will be set from JSON file
        } catch (error:any) {
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