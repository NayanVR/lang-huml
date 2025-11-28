# lang-huml

HUML language support for [CodeMirror 6](https://codemirror.net/).

This package provides a complete editing experience for the HUML configuration language, including syntax highlighting, error diagnostics, and autocompletion.

## Features

- **Syntax Highlighting**: Full colorization for keys, strings, numbers, booleans, and comments.
- **Error Diagnostics**: Real-time syntax error detection with helpful messages.
- **Autocompletion**: Context-aware suggestions for keys and values.
- **Smart Indentation**: Automatic indentation handling for blocks and lists.
- **High Performance**: Built on the Lezer parser system for incremental parsing.

## Installation

```bash
npm install lang-huml
# or
yarn add lang-huml
# or
bun add lang-huml
```

## Usage

Import the `huml` function and add it to your CodeMirror extensions:

```typescript
import { EditorState } from "@codemirror/state";
import { EditorView } from "@codemirror/view";
import { basicSetup } from "codemirror";
import { huml } from "lang-huml";

const state = EditorState.create({
  extensions: [
    basicSetup,
    huml() // Add HUML language support
  ]
});

const view = new EditorView({
  state,
  parent: document.body
});
```

## Development

This project uses [Bun](https://bun.sh) for development.

### Build

Generate the parser and build the TypeScript code:

```bash
bun run build
```

### Test

Run the official test suite:

```bash
bun test:official
```

## Grammar & Architecture

This project uses [Lezer](https://lezer.codemirror.net/), a resilient, incremental parser system designed for code editors. The grammar is defined in `src/huml.grammar` and compiled into a state machine.

### 1. High-Level Structure

The grammar is indentation-sensitive. The root of the parse tree is the `Document` node.

#### The `Document` Node
A valid HUML document can take one of three forms:
1.  **Properties**: A collection of key-value pairs (like a dictionary).
2.  **Root List Items**: A list of items starting with `-`.
3.  **Exclusive Root Value**: A single scalar or inline collection (e.g., just `123` or `[1, 2]`).

Optionally, a document can start with a **Version Directive**:
```huml
%HUML v1.0.0
```

### 2. Grammar Rules

#### Properties & Blocks
The core building block is the `Property`.
- **Inline**: `key: value`
- **Block**: `key::` followed by an indented block.

```huml
key: "value"      # Inline
section::         # Block start
  nested: true    # Indented content
```

#### Collections
Collections group values together:
- **Inline List**: `[1, 2, 3]` or `1, 2, 3` (comma-separated).
- **Inline Dict**: `{ a: 1, b: 2 }` or `a: 1, b: 2`.
- **Block List**: Items prefixed with `-`.
- **Block Dict**: Indented properties.

#### Scalars
Basic data types:
- **Strings**: Double-quoted `"hello"`.
- **Numbers**: Integers, Floats, Hex (`0x`), Octal (`0o`), Binary (`0b`).
- **Booleans**: `true`, `false`.
- **Null**: `null`.
- **Special Numbers**: `nan`, `inf`, `+inf`, `-inf`.

### 3. Tokenization Strategy

HUML requires context-sensitive tokenization to handle significant whitespace and complex literals. We use **External Tokenizers** defined in `src/tokens.ts`.

#### Indentation Tracking (`trackIndent`)
We use a `ContextTracker` to maintain the current indentation level.
- **Indent**: Emitted when the indentation increases relative to the parent context.
- **Dedent**: Emitted when indentation decreases.
- **Newline**: Emitted for line breaks that don't change indentation depth significantly enough to trigger a block change, or within blocks.

The tokenizer logic handles edge cases like:
- Empty lines (ignored).
- Comments (ignored for indentation purposes).
- EOF (automatically dedents to close open blocks).

#### Multiline Strings
HUML supports two types of multiline strings:
1.  **Block String (`"""`)**: Preserves newlines.
2.  **Folded String (` ``` `)**: Folds newlines into spaces (like YAML folded style).

**Tokenizer Logic**:
- Detects the opening delimiter (`"""` or ` ``` `).
- Enforces a newline immediately after the delimiter.
- Consumes lines until the closing delimiter is found.
- **Crucial**: Validates that the closing delimiter has the *same indentation* as the opening block.

#### Numbers
The `numberToken` tokenizer strictly validates formats:
- **Decimal**: `123`, `-10.5`, `1.2e-5`.
- **Hex**: `0x1A`, `0xFF`.
- **Octal**: `0o755`.
- **Binary**: `0b1011`.
- **Underscores**: Allowed as separators (e.g., `1_000`), but not at the start/end or adjacent to non-digits.

#### Keys
The `keyToken` tokenizer identifies valid keys:
- Must start with a letter or underscore.
- Can contain alphanumeric characters, underscores, and dashes.
- **Reserved Words**: `true`, `false`, `null`, `nan`, `inf` are *not* parsed as keys (unless quoted), preventing ambiguity.

#### Strings
The `stringToken` tokenizer handles standard double-quoted strings:
- Validates escape sequences (`\n`, `\t`, `\uXXXX`).
- Disallows unescaped newlines (strings must be single-line).

### 4. Parser Context

The grammar uses `@context` to link the tokenizer's state with the parser.

```grammar
@context trackIndent from "./tokens"
@external tokens indentation from "./tokens" { Indent, Dedent, Newline }
```

This ensures that the parser "knows" the current indentation level at any point, allowing it to correctly parse nested blocks.

## License

MIT
