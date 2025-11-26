import { acceptCompletion, autocompletion } from "@codemirror/autocomplete";
import { indentLess, indentMore } from "@codemirror/commands";
import { LRLanguage, LanguageSupport, TreeIndentContext, foldInside, foldNodeProp, indentNodeProp, indentUnit } from "@codemirror/language";
import { linter } from "@codemirror/lint";
import { keymap } from "@codemirror/view";
import { styleTags, tags } from "@lezer/highlight";
import { LRParser } from "@lezer/lr";
import { humlAutocomplete } from "./autocomplete";
import { humlLinter } from "./diagnostics";
import { parser } from "./huml-parser-typed";
import { humlEnter, humlIndent } from "./indent";

// Ensure tags is available - this helps with module resolution issues
// This check is performed once at module load time for stability
if (!tags || typeof tags !== 'object') {
    throw new Error('Failed to import tags from @lezer/highlight');
}

const parserWithMetadata: LRParser = parser.configure({
    props: [
        styleTags({
            Key: tags.propertyName,    // Should be orange-ish in One Dark
            String: tags.string,       // Should be green
            BlockString: tags.string,  // Also green
            FoldedString: tags.string, // Also green
            Number: tags.number,       // Should be orange/yellow
            Boolean: tags.bool,        // Should be cyan
            Comment: tags.lineComment, // Should be grey italic
            ListMark: tags.punctuation,
            Block: tags.meta,
            ":": tags.punctuation,
            "::": tags.punctuation
        }),
        foldNodeProp.add({
            Block: foldInside
        }),
        indentNodeProp.add((type) => {
            // Use custom indentation function for smart indentation
            return (context: TreeIndentContext) => humlIndent(context);
        })
    ]
});

export const humlLanguage: LRLanguage = LRLanguage.define({
    parser: parserWithMetadata,
    languageData: {
        commentTokens: { line: "#" }
    }
});

/**
 * Create HUML language support with optional schema validation
 * @param schema - Optional schema for validation and autocomplete suggestions
 */
export function huml(): LanguageSupport {
    // Create autocomplete function
    const autocomplete = (context: any) => humlAutocomplete(context);

    // Create linter function
    const linterFunction = (view: any) => humlLinter(view);

    return new LanguageSupport(humlLanguage, [
        // Configure indentation to use 2 spaces
        indentUnit.of("  "),
        // Add linting support for parse errors with squiggly underlines
        // Includes schema validation if schema is provided
        linter(linterFunction),
        // Add autocomplete support with Tab key to accept suggestions
        // Includes schema-based suggestions if schema is provided
        autocompletion({ override: [autocomplete] }),
        // Keymap: Tab accepts autocomplete when active, otherwise indents
        // Enter key for smart indentation
        keymap.of([
            {
                key: "Tab",
                run: (view) => {
                    // Try to accept autocomplete first
                    if (acceptCompletion(view)) {
                        return true;
                    }
                    // Otherwise, indent with tab (2 spaces)
                    return indentMore(view);
                },
            },
            {
                key: "Shift-Tab",
                run: indentLess,
            },
            {
                key: "Enter",
                run: humlEnter,
            },
        ]),
    ]);
}