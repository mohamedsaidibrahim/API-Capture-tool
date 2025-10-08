// src/infrastructure/file-system/api-endpoint.repository.ts
import { IApiEndpointRepository } from '../../core/interfaces/file-system.interface';
import { OrganizedEndpoints } from '../../core/entities/organized-endpoints.entity';
import { IFileSystem } from '../../core/interfaces/file-system.interface';
import { IConfiguration } from '../../core/interfaces/config.interface';
import path from 'path';

export class ApiEndpointRepository implements IApiEndpointRepository {
    constructor(
        private readonly fileSystem: IFileSystem,
        private readonly config: IConfiguration
    ) { }

    async saveEndpoints(endpoints: OrganizedEndpoints): Promise<void> {
        const outputDir = this.config.getOutputDir();
        this.ensureDirectoryExists(outputDir);

        const outputPath = path.join(outputDir, "all_endpoints.json");
        this.fileSystem.writeFileSync(outputPath, JSON.stringify(endpoints.toJSON(), null, 2));
    }

    async saveModuleEndpoints(module: string, endpoints: any): Promise<void> {
        const outputDir = this.config.getOutputDir();
        const moduleDir = path.join(outputDir, module);
        this.ensureDirectoryExists(moduleDir);

        const moduleFilePath = path.join(moduleDir, `${module}_endpoints.json`);
        this.fileSystem.writeFileSync(moduleFilePath, JSON.stringify(endpoints, null, 2));

        // Save section and subsection files
        for (const [sectionName, sectionData] of Object.entries(endpoints)) {
            const sectionDir = path.join(moduleDir, sectionName);
            this.ensureDirectoryExists(sectionDir);

            const sectionFilePath = path.join(sectionDir, `${sectionName}_endpoints.json`);
            this.fileSystem.writeFileSync(sectionFilePath, JSON.stringify(sectionData, null, 2));
        }
    }

    private ensureDirectoryExists(dirPath: string): void {
        if (!this.fileSystem.existsSync(dirPath)) {
            this.fileSystem.mkdirSync(dirPath, { recursive: true });
        }
    }
}