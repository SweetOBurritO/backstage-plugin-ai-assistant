/**
 * Default path exclusion patterns for common build artifacts and dependencies
 * used by the Azure DevOps ingestor when no custom exclusions are specified
 */
export const DEFAULT_PATH_EXCLUSIONS = [
  '**/node_modules/**',
  '**/.git/**',
  '**/.github/workflows/**',
  '**/dist/**',
  '**/build/**',
  '**/target/**',
  '**/vendor/**',
  '**/.next/**',
  '**/.nuxt/**',
  '**/coverage/**',
  '**/.nyc_output/**',
  '**/out/**',
  '**/bin/**',
  '**/obj/**',
  '**/.vscode/**',
  '**/.idea/**',
  '**/*.min.js',
  '**/*.min.css',
  '**/.env',
  '**/.env.*',
  '**/*.log',
  '**/tmp/**',
  '**/temp/**',
  '**/.cache/**',
  '**/bower_components/**',
  '**/jspm_packages/**',
];
