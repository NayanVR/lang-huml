import { syntaxTree } from "@codemirror/language";
import type { Diagnostic } from "@codemirror/lint";
import { EditorState } from "@codemirror/state";

/**
 * Extract parse errors from the Lezer syntax tree and convert them to CodeMirror diagnostics
 * Optionally validates against schema if provided
 */
export function humlLinter(
    view: { state: EditorState }
): Diagnostic[] {
    const diagnostics: Diagnostic[] = [];
    const tree = syntaxTree(view.state);
    const doc = view.state.doc;

    // Optimized spacing violation check: only scan around colons instead of entire document
    // Use regex to find potential violations more efficiently
    const text = doc.toString();
    const length = text.length;

    // Find all colons and check spacing around them
    let i = 0;
    while (i < length - 1) {
        const char = text[i];

        // Check for :: without space after
        if (char === ":" && text[i + 1] === ":" && i + 2 < length) {
            const afterDoubleColon = text[i + 2];
            // :: must be followed by space, newline, or EOF, unless it's a comment
            if (afterDoubleColon && afterDoubleColon !== " " && afterDoubleColon !== "\n" && afterDoubleColon !== "\r" && afterDoubleColon !== "#") {
                // Check if it's a valid token like [] or {} (spec requires space)
                if (afterDoubleColon === "[" || afterDoubleColon === "{") {
                    diagnostics.push({
                        from: i + 2,
                        to: i + 2,
                        severity: "error",
                        message: "Expected space after ::",
                    });
                }
            }
            i += 2; // Skip both colons
            continue;
        }

        // Check for : without space after (but not ::)
        if (char === ":" && text[i + 1] !== ":") {
            const nextChar = text[i + 1];
            if (nextChar && nextChar !== " " && nextChar !== "\n" && nextChar !== "\r" && nextChar !== "#") {
                // Fast check for valid value start characters
                const code = nextChar.charCodeAt(0);
                const validValueStart =
                    (code >= 48 && code <= 57) || // 0-9
                    (code >= 65 && code <= 90) || // A-Z
                    (code >= 97 && code <= 122) || // a-z
                    nextChar === '"' || nextChar === '`' || nextChar === '[' || nextChar === '{' ||
                    nextChar === '+' || nextChar === '-';

                if (validValueStart) {
                    diagnostics.push({
                        from: i + 1,
                        to: i + 1,
                        severity: "error",
                        message: "Expected space after :",
                    });
                }
            }
        }

        i++;
    }

    // Iterate through the parse tree to find error nodes (⚠)
    tree.cursor().iterate((node) => {
        if (node.name === "⚠") {
            // Get the text at the error location for context
            const errorText = doc.sliceString(node.from, node.to);
            const line = doc.lineAt(node.from);

            // Generate a helpful error message based on context
            let message = "Parse error";

            // Try to provide more specific error messages
            if (errorText.trim().length === 0) {
                // Empty error node - likely a missing token
                // Optimized: only read context when needed, limit slice operations
                const beforeStart = Math.max(0, node.from - 20);
                const before = doc.sliceString(beforeStart, node.from);
                const afterEnd = Math.min(doc.length, node.to + 20);
                const after = doc.sliceString(node.to, afterEnd);
                const afterTrimmed = after.trim();

                // Use indexOf for faster checks instead of includes/startsWith
                const doubleColonIdx = before.lastIndexOf("::");
                const singleColonIdx = before.lastIndexOf(":");
                const dashIdx = before.lastIndexOf("-");

                if (doubleColonIdx >= 0 && !afterTrimmed.startsWith("-") && !afterTrimmed.startsWith("[")) {
                    message = "Expected list item (-) or collection after ::";
                } else if (singleColonIdx >= 0 && singleColonIdx > doubleColonIdx && afterTrimmed.length === 0) {
                    message = "Expected value after colon";
                } else if (dashIdx >= 0 && afterTrimmed.length === 0) {
                    message = "Expected value after list mark";
                } else {
                    message = "Unexpected syntax";
                }
            } else {
                // Limit error text length for performance
                const displayText = errorText.length > 50 ? errorText.slice(0, 50) + "..." : errorText;
                message = `Unexpected token: ${displayText}`;
            }

            diagnostics.push({
                from: node.from,
                to: node.to,
                severity: "error",
                message: message,
            });
        }
    });

    return diagnostics;
}

