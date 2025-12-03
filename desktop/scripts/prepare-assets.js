const path = require("node:path");
const fs = require("fs-extra");

async function copyDir(source, destination) {
  await fs.remove(destination);
  if (await fs.pathExists(source)) {
    await fs.copy(source, destination, { dereference: true });
  }
}

async function prepare() {
  const rootDir = path.resolve(__dirname, "..", "..");
  const desktopRoot = path.resolve(__dirname, "..");

  const paths = {
    frontendDistSource: path.resolve(rootDir, "frontend", "dist"),
    frontendDistDest: path.resolve(desktopRoot, "build", "frontend", "dist"),
    backendDistSource: path.resolve(rootDir, "backend", "dist"),
    backendDistDest: path.resolve(desktopRoot, "build", "backend", "dist"),
    backendNodeModulesSource: path.resolve(rootDir, "backend", "node_modules"),
    backendNodeModulesDest: path.resolve(desktopRoot, "build", "backend", "node_modules"),
    backendTemplatesSource: path.resolve(rootDir, "backend", "src", "templates"),
    backendTemplatesDest: path.resolve(desktopRoot, "build", "backend", "templates"),
    backendPackageJsonSource: path.resolve(rootDir, "backend", "package.json"),
    backendPackageJsonDest: path.resolve(desktopRoot, "build", "backend", "package.json"),
  };

  await Promise.all([
    copyDir(paths.frontendDistSource, paths.frontendDistDest),
    copyDir(paths.backendDistSource, paths.backendDistDest),
    copyDir(paths.backendNodeModulesSource, paths.backendNodeModulesDest),
    copyDir(paths.backendTemplatesSource, paths.backendTemplatesDest),
    fs.copy(paths.backendPackageJsonSource, paths.backendPackageJsonDest),
  ]);
}

prepare().catch((error) => {
  console.error("Failed to prepare assets:", error);
  process.exit(1);
});
