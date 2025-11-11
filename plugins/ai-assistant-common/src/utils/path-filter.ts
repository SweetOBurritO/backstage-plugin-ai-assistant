import { minimatch } from 'minimatch';

/**
 * Default path exclusion patterns for common build artifacts and dependencies
 */
export const DEFAULT_PATH_EXCLUSIONS = [
  'node_modules/**',
  '.git/**',
  '.github/workflows/**',
  'dist/**',
  'build/**',
  'target/**',
  'vendor/**',
  '.next/**',
  '.nuxt/**',
  'coverage/**',
  '.nyc_output/**',
  'out/**',
  'bin/**',
  'obj/**',
  '.vscode/**',
  '.idea/**',
  '*.min.js',
  '*.min.css',
  '.env',
  '.env.*',
  '*.log',
  'tmp/**',
  'temp/**',
  '.cache/**',
  'bower_components/**',
  'jspm_packages/**',
];

/**
 * Options for path filtering
 */
export interface PathFilterOptions {
  /** Array of glob patterns to exclude from processing */
  exclusionPatterns?: string[];
  /** Whether to use case-insensitive matching (default: true) */
  caseInsensitive?: boolean;
}

/**
 * Creates a path filter function that can determine if a file path should be excluded
 * based on configured glob patterns
 */
export function createPathFilter(options: PathFilterOptions = {}) {
  const {
    exclusionPatterns = DEFAULT_PATH_EXCLUSIONS,
    caseInsensitive = true,
  } = options;

  /**
   * Tests if a file path should be excluded based on configured patterns
   * @param filePath - The file path to test
   * @returns true if the path should be excluded, false otherwise
   */
  const shouldExcludePath = (filePath: string): boolean => {
    if (!filePath) return false;

    // Normalize path separators to forward slashes for consistent matching
    const normalizedPath = filePath.replace(/\\/g, '/');

    return exclusionPatterns.some(pattern =>
      minimatch(normalizedPath, pattern, {
        nocase: caseInsensitive,
        matchBase: true,
      }),
    );
  };

  /**
   * Filter an array of file paths, removing those that match exclusion patterns
   * @param filePaths - Array of file paths to filter
   * @returns Array of file paths that should not be excluded
   */
  const filterPaths = (filePaths: string[]): string[] => {
    return filePaths.filter(path => !shouldExcludePath(path));
  };

  /**
   * Filter an array of file objects with path property, removing those that match exclusion patterns
   * @param files - Array of file objects with path property
   * @returns Array of file objects that should not be excluded
   */
  const filterFiles = <T extends { path?: string }>(files: T[]): T[] => {
    return files.filter(file => !file.path || !shouldExcludePath(file.path));
  };

  return {
    shouldExcludePath,
    filterPaths,
    filterFiles,
    exclusionPatterns,
  };
}

/**
 * Validates an array of glob patterns for common issues
 * @param patterns - Array of glob patterns to validate
 * @returns Object with validation results
 */
export function validateExclusionPatterns(patterns: string[]): {
  isValid: boolean;
  errors: string[];
  warnings: string[];
} {
  const errors: string[] = [];
  const warnings: string[] = [];

  for (const pattern of patterns) {
    if (!pattern || typeof pattern !== 'string') {
      errors.push(`Invalid pattern: ${pattern} - must be a non-empty string`);
      continue;
    }

    if (pattern.trim() !== pattern) {
      warnings.push(`Pattern has leading/trailing whitespace: "${pattern}"`);
    }

    // Check for potentially problematic patterns
    if (pattern === '**' || pattern === '*') {
      warnings.push(
        `Very broad pattern "${pattern}" may exclude too many files`,
      );
    }

    // Check for Windows-style backslashes
    if (pattern.includes('\\')) {
      warnings.push(
        `Pattern "${pattern}" contains backslashes - consider using forward slashes for cross-platform compatibility`,
      );
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  };
}
