/**
 * Resolve the version of `expo` package in the project.
 */
export declare function resolveExpoVersion(projectRoot: string): string | null;
/**
 * Resolve the path to the `@expo/env` package in the project.
 */
export declare function resolveExpoEnvPath(projectRoot: string): string | null;
/**
 * Resolve the package root of `expo-modules-autolinking` package in the project.
 */
export declare function resolveExpoAutolinkingPackageRoot(projectRoot: string): string | null;
/**
 * Resolve the path to the `expo-modules-autolinking` CLI in the project.
 * @throws If the package is not found in the project.
 */
export declare function resolveExpoAutolinkingCliPath(projectRoot: string): string;
/**
 * Resolve the version of `expo-modules-autolinking` package in the project.
 */
export declare function resolveExpoAutolinkingVersion(projectRoot: string): string | null;
/**
 * Resolve the package root of `expo/config-plugins` package in the project.
 */
export declare function resolveExpoConfigPluginsPackagePath(projectRoot: string): string | null;
/**
 * Resolve the `expo` package version and check if it satisfies the provided semver range.
 * @returns `null` if the `expo` package is not found in the project.
 */
export declare function satisfyExpoVersion(projectRoot: string, range: string): boolean | null;
