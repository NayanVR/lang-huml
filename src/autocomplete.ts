import { CompletionContext, type CompletionResult } from "@codemirror/autocomplete";
import { syntaxTree } from "@codemirror/language";

/**
 * Autocomplete provider for HUML
 * Provides context-aware completions based on the current position
 * Optionally uses schema for field suggestions
 */
export function humlAutocomplete(
    context: CompletionContext
): CompletionResult | null {
    const { state, pos } = context;
    const tree = syntaxTree(state);
    const node = tree.resolveInner(pos, -1);

    // Early exit: don't autocomplete inside strings or comments
    const nodeName = node.name;
    if (nodeName === "String" || nodeName === "BlockString" || nodeName === "FoldedString" || nodeName === "Comment") {
        return null;
    }

    // Check if we're at the start of a line or after certain tokens
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const beforeCursor = lineText.slice(0, pos - line.from).trim();

    // After "::" - suggest list item or collection
    if (beforeCursor.endsWith("::")) {
        // Calculate indentation: get the current line's leading whitespace + 2 spaces for the list item
        const leadingWhitespace = lineText.match(/^(\s*)/)?.[1] || "";
        const indentSpaces = leadingWhitespace + "  ";

        return {
            from: pos,
            options: [
                {
                    label: "-",
                    type: "keyword",
                    info: "List item",
                    apply: (view, completion, from, to) => {
                        // Insert newline, indentation, dash, and space
                        const insertText = `\n${indentSpaces}- `;
                        const newPos = from + insertText.length;
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: insertText,
                            },
                            selection: { anchor: newPos },
                        });
                    },
                },
                {
                    label: "[]",
                    type: "keyword",
                    info: "Empty list",
                    apply: (view, completion, from, to) => {
                        // Insert space before []
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " []",
                            },
                            selection: { anchor: from + 3 }, // Position after " []"
                        });
                    },
                },
                {
                    label: "{}",
                    type: "keyword",
                    info: "Empty dict",
                    apply: (view, completion, from, to) => {
                        // Insert space before {}
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " {}",
                            },
                            selection: { anchor: from + 3 }, // Position after " {}"
                        });
                    },
                },
            ]
        };
    }

    // After "-" - suggest common scalar values
    if (beforeCursor.endsWith("-")) {
        return {
            from: pos,
            options: [
                {
                    label: "true",
                    type: "keyword",
                    info: "Boolean true",
                    apply: (view, completion, from, to) => {
                        // Insert space before true
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " true",
                            },
                            selection: { anchor: from + 5 }, // Position after " true"
                        });
                    },
                },
                {
                    label: "false",
                    type: "keyword",
                    info: "Boolean false",
                    apply: (view, completion, from, to) => {
                        // Insert space before false
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " false",
                            },
                            selection: { anchor: from + 6 }, // Position after " false"
                        });
                    },
                },
                {
                    label: "null",
                    type: "keyword",
                    info: "Null value",
                    apply: (view, completion, from, to) => {
                        // Insert space before null
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " null",
                            },
                            selection: { anchor: from + 5 }, // Position after " null"
                        });
                    },
                },
                {
                    label: '"',
                    type: "text",
                    info: "String value",
                    apply: (view, completion, from, to) => {
                        // Insert space before "" and place cursor in middle
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: ' ""',
                            },
                            selection: { anchor: from + 2 }, // Position between the quotes
                        });
                    },
                },
            ]
        };
    }

    // After ":" - suggest common scalar values
    if (beforeCursor.endsWith(":")) {
        return {
            from: pos,
            options: [
                {
                    label: '"',
                    type: "text",
                    info: "String value",
                    apply: (view, completion, from, to) => {
                        // Insert space before "" and place cursor in middle
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: ' ""',
                            },
                            selection: { anchor: from + 2 }, // Position between the quotes
                        });
                    },
                },
                {
                    label: "true",
                    type: "keyword",
                    info: "Boolean true",
                    apply: (view, completion, from, to) => {
                        // Insert space before true
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " true",
                            },
                            selection: { anchor: from + 5 }, // Position after " true"
                        });
                    },
                },
                {
                    label: "false",
                    type: "keyword",
                    info: "Boolean false",
                    apply: (view, completion, from, to) => {
                        // Insert space before false
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " false",
                            },
                            selection: { anchor: from + 6 }, // Position after " false"
                        });
                    },
                },
                {
                    label: "null",
                    type: "keyword",
                    info: "Null value",
                    apply: (view, completion, from, to) => {
                        // Insert space before null
                        view.dispatch({
                            changes: {
                                from: from,
                                to: to,
                                insert: " null",
                            },
                            selection: { anchor: from + 5 }, // Position after " null"
                        });
                    },
                },
            ]
        };
    }

    // At start of line in a block - suggest key or list item
    if (beforeCursor === "" && pos > 0) {
        const prevChar = state.doc.sliceString(pos - 1, pos);
        if (prevChar === "\n" || prevChar === "") {
            const options: Array<{ label: string; type: string; info?: string }> = [
                { label: "-", type: "keyword", info: "List item" },
            ];
            return {
                from: pos,
                options,
            };
        }
    }

    return null;
}