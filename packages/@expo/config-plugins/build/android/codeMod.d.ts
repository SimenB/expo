import { CodeBlock } from '../utils/commonCodeMod';
/**
 * Find java or kotlin new class instance code block
 *
 * @param contents source contents
 * @param classDeclaration class declaration or just a class name
 * @param language 'java' | 'kt'
 * @returns `CodeBlock` for start/end offset and code block contents
 */
export declare function findNewInstanceCodeBlock(contents: string, classDeclaration: string, language: 'java' | 'kt'): CodeBlock | null;
/**
 * Append contents to the end of code declaration block, support class or method declarations.
 *
 * @param srcContents source contents
 * @param declaration class declaration or method declaration
 * @param insertion code to append
 * @returns updated contents
 */
export declare function appendContentsInsideDeclarationBlock(srcContents: string, declaration: string, insertion: string): string;
export declare function addImports(source: string, imports: string[], isJava: boolean): string;
/**
 * Find code block of Gradle plugin block, will return only {} part
 *
 * @param contents source contents
 * @param plugin plugin declaration name, e.g. `plugins` or `pluginManagement`
 * @returns found CodeBlock, or null if not found.
 */
export declare function findGradlePluginCodeBlock(contents: string, plugin: string): CodeBlock | null;
/**
 * Append contents to the end of Gradle plugin block
 * @param srcContents source contents
 * @param plugin plugin declaration name, e.g. `plugins` or `pluginManagement`
 * @param insertion code to append
 * @returns updated contents
 */
export declare function appendContentsInsideGradlePluginBlock(srcContents: string, plugin: string, insertion: string): string;
