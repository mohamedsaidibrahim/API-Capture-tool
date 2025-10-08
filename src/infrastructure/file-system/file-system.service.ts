// src/infrastructure/file-system/file-system.service.ts
import { IFileSystem } from '../../core/interfaces/file-system.interface';
import { FileSystemException } from '../../core/exceptions/base.exception';
import fs from 'fs';
import path from 'path';

export class FileSystemService implements IFileSystem {
    existsSync(filePath: string): boolean {
        return fs.existsSync(filePath);
    }

    mkdirSync(dirPath: string, options?: any): void {
        try {
            fs.mkdirSync(dirPath, options);
        } catch (error: any) {
            throw new FileSystemException(`Failed to create directory ${dirPath}: ${error.message}`);
        }
    }

    writeFileSync(filePath: string, data: string): void {
        try {
            fs.writeFileSync(filePath, data);
        } catch (error: any) {
            throw new FileSystemException(`Failed to write file ${filePath}: ${error.message}`);
        }
    }

    readFileSync(filePath: string, encoding: string): any {
        try {
            return fs.readFileSync(filePath, { encoding: encoding, flag: 'r' });
        } catch (error: any) {
            throw new FileSystemException(`Failed to read file ${filePath}: ${error.message}`);
        }
    }
}