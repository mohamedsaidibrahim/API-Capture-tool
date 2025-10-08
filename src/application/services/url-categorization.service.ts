// src/application/services/url-categorization.service.ts
import { IUrlCategorizationService } from '../../core/interfaces/services.interface';
import { CategorizedEndpoint } from '../../core/entities/categorized-endpoint.entity';
import { ApiEndpoint } from '../../core/entities/api-endpoint.entity';
import { UrlStructure } from '../../core/entities/url-structure.entity';
import { IConfiguration } from '../../core/interfaces/config.interface';

export class UrlCategorizationService implements IUrlCategorizationService {
    constructor(private readonly config: IConfiguration) { }

    categorizeEndpoint(endpoint: ApiEndpoint, urls: UrlStructure[]): CategorizedEndpoint {
        const { sourceUrl } = endpoint;
        const frontendBaseUrl = this.config.getFrontendBaseUrl();
        const targetApiPrefix = this.config.getTargetApiPrefix();

        let module = "Uncategorized";
        let section = "Uncategorized";
        let subSection = "Uncategorized";

        // Find the most specific matching navigation entry
        const matchingNavigationEntry = urls.find(entry =>
            sourceUrl.startsWith(entry.url)
        );

        if (matchingNavigationEntry) {
            module = matchingNavigationEntry.module;
            section = matchingNavigationEntry.section;
            subSection = matchingNavigationEntry.subSection;
        } else {
            // Fallback inference logic
            const categorized = this.inferFromUrl(endpoint, frontendBaseUrl, targetApiPrefix);
            module = categorized.module;
            section = categorized.section;
            subSection = categorized.subSection;
        }

        return CategorizedEndpoint.create(endpoint, module, section, subSection);
    }

    private inferFromUrl(
        endpoint: ApiEndpoint,
        frontendBaseUrl: string,
        targetApiPrefix: string
    ): { module: string; section: string; subSection: string } {
        const relativeSourcePath = endpoint.sourceUrl.replace(frontendBaseUrl, "").split('?')[0];
        const pathParts = relativeSourcePath.split('/').filter(p => p.length > 0);

        let module = "Uncategorized";
        let section = "Uncategorized";
        let subSection = "Uncategorized";

        // Module inference
        if (pathParts.length > 0) {
            module = this.normalizeModuleName(pathParts[0]);
        }

        // Section and subsection inference
        if (pathParts.length > 1) {
            section = this.normalizeSectionName(pathParts[1]);
            subSection = pathParts.length > 2 ? this.capitalizeFirst(pathParts[2]) : "General";
        } else {
            section = "Dashboard";
            subSection = "General";
        }

        // API-specific refinements
        const apiRelativePath = endpoint.url.replace(targetApiPrefix, "").split('?')[0];
        if (apiRelativePath.includes("SideMenu") || apiRelativePath.includes("CurrentUserInfo") ||
            apiRelativePath.includes("workflows/GetRequestsCount")) {
            section = "Dashboard";
            if (apiRelativePath.includes("SideMenu")) subSection = "SideMenu";
            else if (apiRelativePath.includes("CurrentUserInfo")) subSection = "CurrentUserInfo";
            else if (apiRelativePath.includes("workflows")) subSection = "Workflows";
            else subSection = "GeneralDashboardAPI";
        }

        return { module, section, subSection };
    }

    private normalizeModuleName(module: string): string {
        const mappings: { [key: string]: string } = {
            "erp": "General_Settings",
            "accounting": "Accounting",
            "finance": "Finance",
            "purchase": "Purchase",
            "sales": "Sales",
            "inventory": "Inventory"
        };
        return mappings[module.toLowerCase()] || this.capitalizeFirst(module);
    }

    private normalizeSectionName(section: string): string {
        const mappings: { [key: string]: string } = {
            "masterdata": "Master_data",
            "admin": "Adminstration"
        };
        return mappings[section.toLowerCase()] || this.capitalizeFirst(section);
    }

    private capitalizeFirst(str: string): string {
        return str.charAt(0).toUpperCase() + str.slice(1);
    }
}