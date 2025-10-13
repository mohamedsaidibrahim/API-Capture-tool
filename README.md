# API Capture Tool 🔍

A sophisticated, enterprise-grade tool for automatically capturing and categorizing backend API endpoints from web applications. Built with TypeScript and following SOLID principles for maximum maintainability and extensibility.

## 🎯 Project Objectives

### Primary Goals

- **Automated API Discovery**: Automatically navigate through web applications and capture all backend API calls
- **Intelligent Categorization**: Organize captured endpoints based on application structure and modules
- **Structured Output**: Generate hierarchical JSON files mirroring the application's URL structure
- **Enterprise Ready**: Robust error handling, configuration management, and extensible architecture

### Key Features

- 🚀 **Playwright-powered** browser automation
- 🏗️ **SOLID principles** architecture
- 📁 **Hierarchical file output** matching URL structure
- 🔐 **Authentication support** for secured applications
- 🎯 **Smart endpoint categorization** with fallback inference
- ⚡ **Configurable timeouts** and capture parameters
- 🛡️ **Comprehensive error handling** and logging

## 🚀 Installation

### Prerequisites

- Node.js 16.0 or higher
- npm or yarn package manager

### Step-by-Step Setup

1. **Clone and Install Dependencies**

```bash
git clone <repository-url>
cd api-capture-tool
npm install
```

2. **Install Playwright Browsers**

```bash
npx playwright install
```

3. **Environment Configuration**
   Create a `.env` file (optional):

```env
API_CAPTURE_USERNAME=your_username
API_CAPTURE_PASSWORD=your_password
```

4. **Input File Setup**
   Create the input structure:

```bash
mkdir -p Input
```

Place your `microtec_erp_urls.json` in the `Input` directory.

## 📖 Usage

### Basic Execution

```bash
# Development mode
npm run dev

# Production build and run
npm run build
npm start
```

### Configuration

The tool uses a hierarchical configuration system:

1. **Environment Variables** (Highest priority)
2. **Configuration Service** defaults
3. **Input JSON** structure for URLs

### Input JSON Format

```json
{
  "base_url": "https://your-app.com",
  "modules": {
    "Module_Name": {
      "Section_Name": ["/url/path/1", "/url/path/2"],
      "Nested_Section": {
        "SubSection": ["/nested/path"]
      }
    }
  }
}
```

## 🏗️ Project Structure

```
src/
├── core/                    # Domain Layer (SOLID Principles)
│   ├── interfaces/         # Abstraction contracts
│   ├── entities/          # Business objects
│   └── exceptions/        # Custom error types
├── infrastructure/        # Technical Implementation
│   ├── browser/          # Playwright wrappers
│   ├── file-system/      # File operations
│   └── config/           # Configuration management
├── application/          # Use Cases & Services
│   ├── services/        # Business logic
│   ├── use-cases/       # Application workflows
│   └── dtos/           # Data transfer objects
└── main/               # Composition & Entry Point
    └── composition-root.ts
```

## 🔄 Component Integration Flow

### Architecture Overview

```
Input JSON → Composition Root → Use Case → Services → Output
    ↓              ↓              ↓         ↓         ↓
URL Structure  Dependency     Business   Browser   JSON Files
               Injection      Logic      Automation
```

### Detailed Integration Flow

1. **Initialization Phase**

   ```
   main.ts → CompositionRoot → BrowserFactory → ConfigurationService
   ```

2. **URL Loading Phase**

   ```
   Use Case → UrlRepository → FileSystemService → JSON Parser → UrlStructure Entities
   ```

3. **Authentication Phase**

   ```
   Use Case → AuthenticationService → Browser Page → Login Flow
   ```

4. **API Capture Phase**

   ```
   Use Case → ApiCaptureService → Browser Events → ApiEndpoint Entities
   ```

5. **Categorization Phase**

   ```
   Use Case → UrlCategorizationService → UrlStructure Matching → CategorizedEndpoint Entities
   ```

6. **Output Phase**
   ```
   Use Case → ApiEndpointRepository → FileSystemService → OrganizedEndpoints → JSON Files
   ```

## 🎯 Key Functions Explained

### Core Business Logic

#### 1. `CaptureApiEndpointsUseCase.execute()`

**Purpose**: Orchestrates the entire API capture workflow

```typescript
async execute(): Promise<void> {
  1. Load URLs from repository
  2. Authenticate with application
  3. Capture APIs from all URLs
  4. Categorize endpoints by module/section
  5. Save organized results to file system
}
```

#### 2. `ApiCaptureService.captureApisFromUrls()`

**Purpose**: Navigates through URLs and captures API requests

```typescript
async captureApisFromUrls(urls: UrlStructure[]): Promise<ApiEndpoint[]> {
  for (const url of urls) {
    - Navigate to URL using Playwright
    - Wait for API calls with timeout
    - Capture unique endpoints via request listeners
    - Store in memory map to avoid duplicates
  }
  return Array.from(capturedEndpoints.values());
}
```

#### 3. `UrlCategorizationService.categorizeEndpoint()`

**Purpose**: Intelligently categorizes endpoints based on source URL

```typescript
categorizeEndpoint(endpoint: ApiEndpoint, urls: UrlStructure[]): CategorizedEndpoint {
  1. Find exact URL match in navigation structure
  2. If no match, infer from URL path segments
  3. Apply normalization rules (masterdata → Master_data)
  4. Handle special API patterns (SideMenu, CurrentUserInfo)
  5. Return categorized endpoint with module/section/subsection
}
```

### Infrastructure Services

#### 4. `BrowserFactory.createBrowser()`

**Purpose**: Initializes Playwright browser instance with proper configuration

```typescript
async createBrowser(): Promise<IBrowserService> {
  - Launch Chromium in non-headless mode with devtools
  - Create new browser context
  - Return wrapped browser service for abstraction
}
```

#### 5. `UrlRepository.loadUrls()`

**Purpose**: Parses input JSON and creates structured URL hierarchy

```typescript
async loadUrls(): Promise<UrlStructure[]> {
  - Read and validate JSON file
  - Recursively parse module structure
  - Create UrlStructure entities
  - Sort by URL length for specificity matching
}
```

### Entity Models

#### 6. `OrganizedEndpoints.toJSON()`

**Purpose**: Transforms internal data structure to serializable JSON

```typescript
toJSON(): any {
  - Convert Map-based structure to plain objects
  - Transform entities to DTOs
  - Maintain hierarchical module/section/subsection structure
  - Ensure proper JSON serialization
}
```

## 📊 Output Structure

The tool generates a hierarchical file structure:

```
08new_api_endpoints_output/
├── all_endpoints.json                    # Complete endpoint catalog
├── General_Settings/                     # Module directory
│   ├── General_Settings_endpoints.json   # Module-level endpoints
│   ├── Dashboard/                        # Section directory
│   │   ├── Dashboard_endpoints.json      # Section-level endpoints
│   │   └── SideMenu/                     # Subsection directory
│   └── Master_data/
├── Accounting/
└── ... (other modules)
```

### Output JSON Format

```json
{
  "General_Settings": {
    "Dashboard": {
      "SideMenu": [
        {
          "method": "GET",
          "endpoint": "/api/menu",
          "sourcePage": "/erp/dashboard",
          "timestamp": "2024-01-15T10:30:00.000Z"
        }
      ]
    }
  }
}
```

## 🔧 Advanced Configuration

### Timeout Settings

```typescript
// In ConfigurationService
CAPTURE_TIMEOUT: 15000,      // Wait for APIs per page
NAVIGATION_TIMEOUT: 60000,   // Page load timeout
```

### API Filtering

```typescript
// Only capture requests matching:
- URL starts with TARGET_API_PREFIX
- Resource type is "xhr" or "fetch"
- Unique method-URL combinations
```

## 🐛 Troubleshooting

### Common Issues

1. **Login Failures**

   - Verify credentials in configuration
   - Check network connectivity to target application
   - Update CSS selectors if login form changes

2. **No APIs Captured**

   - Verify TARGET_API_PREFIX matches backend domain
   - Check if APIs are triggered on page load
   - Increase CAPTURE_TIMEOUT for slower applications

3. **File System Errors**
   - Ensure write permissions in output directory
   - Verify input JSON file exists and is valid

### Debug Mode

Enable verbose logging by setting environment variable:

```bash
DEBUG_API_CAPTURE=true npm run dev
```

## 🚀 Performance Optimization

### Memory Management

- Uses Map for O(1) endpoint lookups
- Automatic browser resource cleanup
- Streamed file writing for large datasets

### Capture Efficiency

- Parallelizable URL processing
- Smart deduplication of endpoints
- Configurable timeouts per environment

## 🔮 Extension Points

The architecture supports easy extensions:

1. **New Browser Support**: Implement `IBrowserFactory`
2. **Additional Output Formats**: Implement `IApiEndpointRepository`
3. **Custom Categorization**: Extend `IUrlCategorizationService`
4. **Alternative Authentication**: Implement `IAuthenticationService`

## 📄 License

This project is designed for educational and legitimate testing purposes. Ensure you have proper authorization before using against any applications.

---

**Built with ❤️ following SOLID principles for enterprise-grade reliability and maintainability.**
