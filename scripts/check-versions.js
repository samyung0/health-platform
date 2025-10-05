#!/usr/bin/env node

/**
 * Version consistency checker for shared dependencies
 * Ensures critical packages have the same version across frontend and backend
 */

import { readFileSync } from "fs";
import { join } from "path";

const CRITICAL_PACKAGES = ["hono", "better-auth"];

function getPackageVersions(packagePath) {
  try {
    const packageJson = JSON.parse(readFileSync(packagePath, "utf8"));
    return packageJson.dependencies || {};
  } catch (error) {
    console.error(`Error reading ${packagePath}:`, error.message);
    return {};
  }
}

function checkVersions() {
  const rootPackage = join(process.cwd(), "package.json");
  const backendPackage = join(process.cwd(), "backend", "package.json");
  const frontendPackage = join(process.cwd(), "frontend", "package.json");

  const rootVersions = getPackageVersions(rootPackage);
  const backendVersions = getPackageVersions(backendPackage);
  const frontendVersions = getPackageVersions(frontendPackage);

  let hasErrors = false;

  console.log("🔍 Checking version consistency...\n");

  for (const packageName of CRITICAL_PACKAGES) {
    const rootVersion = rootVersions[packageName];
    const backendVersion = backendVersions[packageName];
    const frontendVersion = frontendVersions[packageName];

    console.log(`📦 ${packageName}:`);
    console.log(`   Root: ${rootVersion || "not found"}`);
    console.log(`   Backend: ${backendVersion || "not found"}`);
    console.log(`   Frontend: ${frontendVersion || "not found"}`);

    // Check workspace setup
    if (rootVersion && !backendVersion && !frontendVersion) {
      console.log(`   ✅ Correctly managed at root level`);
    } else if (rootVersion && (backendVersion || frontendVersion)) {
      // Found in both root and sub-projects - this is an error
      if (backendVersion && backendVersion !== rootVersion) {
        console.log(`   ❌ Backend has different version: ${backendVersion}`);
        hasErrors = true;
      }
      if (frontendVersion && frontendVersion !== rootVersion) {
        console.log(`   ❌ Frontend has different version: ${frontendVersion}`);
        hasErrors = true;
      }
      if (backendVersion || frontendVersion) {
        console.log(`   ⚠️  Package should only be defined at root level`);
        hasErrors = true;
      }
    } else if (!rootVersion && (backendVersion || frontendVersion)) {
      console.log(`   ❌ Package found in sub-projects but not in root`);
      hasErrors = true;
    } else {
      console.log(`   ℹ️  Package not found anywhere`);
    }
    console.log("");
  }

  if (hasErrors) {
    console.log("❌ Version inconsistencies found!");
    console.log("💡 Fix by:");
    console.log("   1. Remove the package from backend/frontend package.json");
    console.log("   2. Ensure it's only defined in root package.json");
    console.log("   3. Run 'bun install' from the root directory");
    process.exit(1);
  } else {
    console.log("✅ All versions are consistent!");
  }
}

checkVersions();
