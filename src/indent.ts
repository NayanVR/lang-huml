import { syntaxTree, TreeIndentContext } from "@codemirror/language";
import { EditorView } from "@codemirror/view";

/**
 * Custom indentation function for HUML
 * Handles smart indentation after :: and list items
 */
export function humlIndent(context: TreeIndentContext): number | null {
    const { state, pos, unit } = context;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const lineStart = line.from;

    // Get the text before the cursor on the current line
    const beforeCursor = lineText.slice(0, pos - lineStart);
    const trimmed = beforeCursor.trim();

    // After :: - indent by 2 spaces from the :: line
    if (trimmed.endsWith("::")) {
        const leadingWhitespace = lineText.match(/^(\s*)/)?.[1] || "";
        return leadingWhitespace.length + 2;
    }

    // After list item (-) - continue at same indentation
    if (trimmed.endsWith("-")) {
        const leadingWhitespace = lineText.match(/^(\s*)/)?.[1] || "";
        return leadingWhitespace.length;
    }

    // After list item with value (e.g., "- 1") - continue at same indentation
    const listItemMatch = lineText.match(/^(\s*)-/);
    if (listItemMatch && listItemMatch[1]) {
        return listItemMatch[1].length;
    }

    // Default: use continued indent for blocks
    const tree = syntaxTree(state);
    const node = tree.resolveInner(pos, -1);

    // If we're in a block, continue indentation
    let contextNode: typeof node | null = node;
    while (contextNode) {
        if (contextNode.name === "Block") {
            // Find the property or list item that started this block
            let parent: typeof contextNode | null = contextNode.parent;
            while (parent) {
                if (parent.name === "Property" || parent.name === "ListItem") {
                    // Get the indentation of the parent line
                    const parentLine = state.doc.lineAt(parent.from);
                    const parentIndent = parentLine.text.match(/^(\s*)/)?.[1]?.length || 0;
                    return parentIndent + 2; // Indent 2 spaces from parent
                }
                parent = parent.parent;
            }
            break;
        }
        contextNode = contextNode.parent;
    }

    // Default: no indentation
    return null;
}

/**
 * Handle Enter key to insert newline with smart indentation
 */
export function humlEnter(view: EditorView): boolean {
    const { state, dispatch } = view;
    const pos = state.selection.main.head;
    const line = state.doc.lineAt(pos);
    const lineText = line.text;
    const lineStart = line.from;
    const beforeCursor = lineText.slice(0, pos - lineStart);
    const trimmed = beforeCursor.trim();

    // Calculate indentation
    let indent = 0;

    // After :: - indent by 2 spaces
    if (trimmed.endsWith("::")) {
        const leadingWhitespace = lineText.match(/^(\s*)/)?.[1] || "";
        indent = leadingWhitespace.length + 2;
    }
    // After list item (-) or list item with value - continue at same indentation
    else if (trimmed.endsWith("-") || lineText.match(/^\s*-/)) {
        const leadingWhitespace = lineText.match(/^(\s*)/)?.[1] || "";
        indent = leadingWhitespace.length;
    }
    // Default: calculate indentation based on context
    else {
        // Use the same logic as humlIndent but without TreeIndentContext
        const tree = syntaxTree(state);
        const node = tree.resolveInner(pos, -1);

        // If we're in a block, continue indentation
        let contextNode: typeof node | null = node;
        while (contextNode) {
            if (contextNode.name === "Block") {
                // Find the property or list item that started this block
                let parent: typeof contextNode | null = contextNode.parent;
                while (parent) {
                    if (parent.name === "Property" || parent.name === "ListItem") {
                        // Get the indentation of the parent line
                        const parentLine = state.doc.lineAt(parent.from);
                        const parentIndent = parentLine.text.match(/^(\s*)/)?.[1]?.length || 0;
                        indent = parentIndent + 2; // Indent 2 spaces from parent
                        break;
                    }
                    parent = parent.parent;
                }
                break;
            }
            contextNode = contextNode.parent;
        }
    }

    const indentStr = "  ".repeat(Math.floor(indent / 2));
    const newline = "\n" + indentStr;

    dispatch({
        changes: {
            from: pos,
            insert: newline,
        },
        selection: { anchor: pos + newline.length },
    });

    return true;
}
