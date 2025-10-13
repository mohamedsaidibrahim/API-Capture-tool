import { OrganizedEndpoints } from "../entities/organized-endpoints.entity";
import { UrlStructure } from "../entities/url-structure.entity";

// src/core/interfaces/file-system.interface.ts
export interface IFileSystem {
  existsSync(path: string): boolean;
  mkdirSync(path: string, options?: any): void;
  writeFileSync(path: string, data: string): void;
  readFileSync(path: string, encoding: BufferEncoding): string;
}

export interface IUrlRepository {
  loadUrls(): Promise<UrlStructure[]>;
}

export interface IApiEndpointRepository {
  saveEndpoints(endpoints: OrganizedEndpoints): Promise<void>;
  saveModuleEndpoints(module: string, endpoints: any): Promise<void>;
}