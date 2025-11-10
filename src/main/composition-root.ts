// src/main/composition-root.ts
import { ConfigurationService } from '../infrastructure/config/configuration.service';
import { FileSystemService } from '../infrastructure/file-system/file-system.service';
import { UrlRepository } from '../infrastructure/file-system/url.repository';
import { ApiEndpointRepository } from '../infrastructure/file-system/api-endpoint.repository';
import { BrowserFactory } from '../infrastructure/browser/browser-factory.service';
import { ApiCaptureService } from '../application/services/api-capture.service';
import { AuthenticationService } from '../application/services/authentication.service';
import { UrlCategorizationService } from '../application/services/url-categorization.service';
import { ExportPrintCaptureService } from '../application/services/export-print-capture.service';
import { CaptureApiEndpointsUseCase } from '../application/use-cases/capture-api-endpoints.use-case';

export class CompositionRoot {
    private static instance: CompositionRoot;

    // Infrastructure
    public readonly config: ConfigurationService;
    public readonly fileSystem: FileSystemService;
    public readonly urlRepository: UrlRepository;
    public readonly apiEndpointRepository: ApiEndpointRepository;
    public readonly browserFactory: BrowserFactory;

    // Services
    public apiCaptureService!: ApiCaptureService;
    public authenticationService!: AuthenticationService;
    public readonly urlCategorizationService: UrlCategorizationService;
    public exportPrintCaptureService!: ExportPrintCaptureService;

    // Use Cases
    public captureApiEndpointsUseCase!: CaptureApiEndpointsUseCase;

    private constructor() {
        // Infrastructure
        this.config = new ConfigurationService();
        this.fileSystem = new FileSystemService();
        this.urlRepository = new UrlRepository(this.fileSystem, this.config);
        this.apiEndpointRepository = new ApiEndpointRepository(this.fileSystem, this.config);
        this.browserFactory = new BrowserFactory();

        // Services
        this.urlCategorizationService = new UrlCategorizationService(this.config);

        console.log("✅ Composition Root initialized");
    }

    static getInstance(): CompositionRoot {
        if (!CompositionRoot.instance) {
            CompositionRoot.instance = new CompositionRoot();
        }
        return CompositionRoot.instance;
    }

    async initializeBrowserServices(): Promise<void> {
        console.log("🔄 Initializing browser services...");

        const browser = await this.browserFactory.createBrowser();
        const page = await this.browserFactory.createPage();

        // Initialize services that depend on browser/page
        this.apiCaptureService = new ApiCaptureService(this.config, page);
        this.authenticationService = new AuthenticationService(this.config, page);

        // Enhanced ExportPrintCaptureService with configuration
        this.exportPrintCaptureService = new ExportPrintCaptureService(
            this.config,
            page,
            this.apiCaptureService,
            this.config.getExportPrintConfig() // Pass configuration
        );

        // Update use case with the initialized services
        this.captureApiEndpointsUseCase = new CaptureApiEndpointsUseCase(
            this.urlRepository,
            this.apiEndpointRepository,
            this.apiCaptureService,
            this.authenticationService,
            this.urlCategorizationService,
            page
        );

        console.log("✅ Browser services initialized");
    }

    async cleanup(): Promise<void> {
        console.log("🧹 Cleaning up resources...");
        await this.browserFactory.close();
        console.log("✅ Cleanup completed");
    }
}