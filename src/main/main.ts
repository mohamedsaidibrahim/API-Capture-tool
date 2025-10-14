// src/main/main.ts
import { CompositionRoot } from './composition-root';

async function main() {
    const app = CompositionRoot.getInstance();

    try {
        console.log("🚀 Initializing API Capture Tool...");

        // Initialize browser-dependent services
        await app.initializeBrowserServices();

        // Execute the main use case
        const result = await app.captureApiEndpointsUseCase.execute();

        if (result.success) {
            console.log("✅ Application completed successfully");
            process.exit(0);
        } else {
            console.log("⚠️ Application completed with warnings");
            process.exit(1);
        }
    } catch (error) {
        console.error("❌ Application failed:", error);
        process.exit(1);
    } finally {
        await app.cleanup();
    }
}

// Enhanced error handling
process.on('uncaughtException', (error) => {
    console.error('💥 Uncaught Exception:', error);
    process.exit(1);
});

process.on('unhandledRejection', (reason, promise) => {
    console.error('💥 Unhandled Rejection at:', promise, 'reason:', reason);
    process.exit(1);
});

// Graceful shutdown
process.on('SIGINT', async () => {
    console.log('\n⚠️ Received SIGINT. Shutting down gracefully...');
    const app = CompositionRoot.getInstance();
    await app.cleanup();
    process.exit(0);
});

process.on('SIGTERM', async () => {
    console.log('\n⚠️ Received SIGTERM. Shutting down gracefully...');
    const app = CompositionRoot.getInstance();
    await app.cleanup();
    process.exit(0);
});

// Run the application
if (require.main === module) {
    main();
}

export { main };