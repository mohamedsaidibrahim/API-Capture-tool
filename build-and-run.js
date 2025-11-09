// build-and-run.js
const { spawn } = require("child_process");
const fs = require("fs");

console.log("🚀 Building and running API Capture Tool...");

// Check if TypeScript source exists
if (!fs.existsSync("src/main/main.ts")) {
  console.error("❌ Source file not found: src/main/main.ts");
  process.exit(1);
}

// Use ts-node to run directly
const tsNode = spawn("npx", ["ts-node", "src/main/main.ts"], {
  stdio: "inherit",
  shell: true,
});

tsNode.on("close", (code) => {
  process.exit(code);
});
