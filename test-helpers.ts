import { Tree } from "@lezer/common";
import { expect } from "bun:test";

/**
 * Helper function to check if a parse tree has parse errors
 * Only checks for parse errors (⚠ nodes), not validation errors
 */
export function hasParseErrors(tree: Tree, input?: string): boolean {
    // Check for parse errors (⚠ nodes) only
    let hasErrors = false;
    tree.cursor().iterate((node) => {
        if (node.name === "⚠") {
            hasErrors = true;
            return false; // Stop iteration
        }
    });

    return hasErrors;
}

/**
 * Helper function to get all parse errors from a tree
 */
export function getParseErrors(tree: Tree, input: string): Array<{ from: number; to: number; message: string }> {
    const errors: Array<{ from: number; to: number; message: string }> = [];
    tree.cursor().iterate((node) => {
        if (node.name === "⚠") {
            errors.push({
                from: node.from,
                to: node.to,
                message: input.slice(node.from, node.to),
            });
        }
    });
    return errors;
}

/**
 * Helper function to verify a tree parses successfully without errors
 */
export function expectSuccessfulParse(tree: Tree, input?: string) {
    expect(tree.topNode).toBeTruthy();
    expect(hasParseErrors(tree)).toBe(false);
}

/**
 * Helper function to get the text content of a specific node type
 */
export function getNodeText(tree: Tree, nodeName: string, input: string): string[] {
    const texts: string[] = [];
    tree.cursor().iterate((node) => {
        if (node.name === nodeName) {
            texts.push(input.slice(node.from, node.to));
        }
    });
    return texts;
}

/**
 * Helper function to count nodes of a specific type
 */
export function countNodes(tree: Tree, nodeName: string): number {
    let count = 0;
    tree.cursor().iterate((node) => {
        if (node.name === nodeName) {
            count++;
        }
    });
    return count;
}

