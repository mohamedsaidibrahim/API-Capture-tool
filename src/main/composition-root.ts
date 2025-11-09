// src/main/composition-root.ts
import { ConfigurationService } from '../infrastructure/config/configuration.service';
import { FileSystemService } from '../infrastructure/file-system/file-system.service';
import { UrlRepository } from '../infrastructure/file-system/url.repository';
import { ApiEndpointRepository } from '../infrastructure/file-system/api-endpoint.repository';
import { BrowserFactory } from '../infrastructure/browser/browser-factory.service';
import { ApiCaptureService } from '../application/services/api-capture.service';
import { AuthenticationService } from '../application/services/authentication.service';
import { UrlCategorizationService } from '../application/services/url-categorization.service';
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
    public apiCaptureService: ApiCaptureService;
    public authenticationService: AuthenticationService;
    public urlCategorizationService: UrlCategorizationService;

    // Use Cases
    public captureApiEndpointsUseCase!: CaptureApiEndpointsUseCase;

    private constructor() {
        // Infrastructure
        this.config = new ConfigurationService();
        this.fileSystem = new FileSystemService();
        this.urlRepository = new UrlRepository(this.fileSystem, this.config);
        this.apiEndpointRepository = new ApiEndpointRepository(this.fileSystem, this.config);
        this.browserFactory = new BrowserFactory();

        // Services (will be initialized after browser setup)
        this.apiCaptureService = null as any;
        this.authenticationService = null as any;
        this.urlCategorizationService = new UrlCategorizationService(this.config);

        // Use Cases (initialized after browser setup)
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
        (this.captureApiEndpointsUseCase as any).apiCaptureService = this.apiCaptureService;
        (this.captureApiEndpointsUseCase as any).authenticationService = this.authenticationService;
        // Initialize services that depend on browser/page
        this.apiCaptureService = new ApiCaptureService(this.config, page);
        this.authenticationService = new AuthenticationService(this.config, page);

        // Create the use case now that browser/page-dependent services and page are available
        this.captureApiEndpointsUseCase = new CaptureApiEndpointsUseCase(
            this.urlRepository,
            this.apiEndpointRepository,
            this.apiCaptureService,
            this.authenticationService,
            this.urlCategorizationService,
            page
        );
    }
}