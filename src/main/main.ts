// src/main/main.ts
import { CompositionRoot } from './composition-root';

async function main() {
    const app = CompositionRoot.getInstance();

    try {
        console.log("🚀 Initializing API Capture Tool...");

        // Initialize browser-dependent services
        await app.initializeBrowserServices();

        // Execute the main use case
        await app.captureApiEndpointsUseCase.execute();

        console.log("✅ Application completed successfully");
    } catch (error:any) {
        console.error("❌ Application failed:", error);
        process.exit(1);
    } finally {
        await app.cleanup();
    }
}

// Handle uncaught exceptions
process.on('uncaughtException', (error:any) => {
    console.error('Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Run the application
if (require.main === module) {
    main();
}

export { main };