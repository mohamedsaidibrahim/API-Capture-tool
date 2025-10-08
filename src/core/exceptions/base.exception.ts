// src/core/exceptions/base.exception.ts
export abstract class BaseException extends Error {
    abstract readonly code: string;

    constructor(message: string) {
        super(message);
        this.name = this.constructor.name;
    }
}

export class ConfigurationException extends BaseException {
    readonly code = 'CONFIG_ERROR';
}

export class BrowserException extends BaseException {
    readonly code = 'BROWSER_ERROR';
}

export class FileSystemException extends BaseException {
    readonly code = 'FILE_SYSTEM_ERROR';
}

export class AuthenticationException extends BaseException {
    readonly code = 'AUTHENTICATION_ERROR';
}