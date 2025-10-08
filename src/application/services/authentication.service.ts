// src/application/services/authentication.service.ts
import { IAuthenticationService } from '../../core/interfaces/services.interface';
import { IConfiguration } from '../../core/interfaces/config.interface';
import { IPage } from '../../core/interfaces/browser.interface';
import { AuthenticationException } from '../../core/exceptions/base.exception';

export class AuthenticationService implements IAuthenticationService {
    private authenticated: boolean = false;

    constructor(
        private readonly config: IConfiguration,
        private readonly page: IPage
    ) { }

    async login(): Promise<void> {
        console.log("🌍 Navigating to Login Page...");

        try {
            const baseUrl = this.config.getFrontendBaseUrl();
            console.log(`🔑 Logging in at: ${baseUrl}`);

            await this.page.goto(`${baseUrl}/erp`, {
                waitUntil: "networkidle",
                timeout: 60000,
            });

            const currentUrl = this.page.url();
            if (currentUrl.includes("/erp/dashboard") || currentUrl === baseUrl) {
                console.log("Already logged in or redirected to dashboard. Skipping login steps.");
                this.authenticated = true;
                return;
            }

            console.log(`📧 Entering email: ${this.config.getUsername()}`);
            await this.page.fill("#Email", this.config.getUsername());

            console.log(`🔒 Entering password`);
            await this.page.fill("#Password", this.config.getPassword());
            await this.page.click('button[type="submit"]:first-of-type');

            // Wait for navigation to complete
            await this.page.waitForSelector(assertionSelector); 

            await this.page.waitForSelector("body", { timeout: 60000 });

            this.authenticated = true;
            console.log("✅ Authentication successful!");
        } catch (error:any) {
            throw new AuthenticationException(`Login failed: ${error.message}`);
        }
    }

    isAuthenticated(): boolean {
        return this.authenticated;
    }
}