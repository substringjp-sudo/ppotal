const { getDefaultConfig } = require('expo/metro-config');
const path = require('path');

// Find the project and workspace directories
const projectRoot = __dirname;
const workspaceRoot = path.resolve(projectRoot, '../..');

const config = getDefaultConfig(projectRoot);

// 1. Watch all files within the monorepo
config.watchFolders = [workspaceRoot];

// 2. Let Metro know where to resolve packages and in what order
config.resolver.nodeModulesPaths = [
  path.resolve(projectRoot, 'node_modules'),
  path.resolve(workspaceRoot, 'node_modules'),
];

// 3. Force Metro to resolve queries from the project root
config.resolver.disableHierarchicalLookup = true;

// 4. WASM and SQL support
config.resolver.assetExts.push('wasm');

// 5. Custom Resolver to bypass problematic ESM versions in node_modules
config.resolver.resolveRequest = (context, moduleName, platform) => {
  // Force Zustand to use CommonJS versions to avoid import.meta errors on web
  if (moduleName === 'zustand/middleware') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(workspaceRoot, 'node_modules/zustand/middleware.js'),
    };
  }
  if (moduleName === 'zustand') {
    return {
      type: 'sourceFile',
      filePath: path.resolve(workspaceRoot, 'node_modules/zustand/index.js'),
    };
  }
  
  // Default resolution for everything else
  return context.resolveRequest(context, moduleName, platform);
};

// 6. Enable Cross-Origin Isolation for SharedArrayBuffer (required by expo-sqlite on web)
config.server = {
  ...config.server,
  enhanceMiddleware: (middleware) => {
    return (req, res, next) => {
      // Set COOP and COEP headers for SharedArrayBuffer
      res.setHeader('Cross-Origin-Opener-Policy', 'same-origin');
      res.setHeader('Cross-Origin-Embedder-Policy', 'credentialless'); // Try credentialless for better compatibility
      return middleware(req, res, next);
    };
  },
};

// 7. Alias libraries to mocks for web
config.resolver.extraNodeModules = {
    ...config.resolver.extraNodeModules,
    // Mock native maps
    'react-native-maps': path.resolve(projectRoot, 'src/lib/mocks/react-native-maps.web.js'),
};

module.exports = config;
