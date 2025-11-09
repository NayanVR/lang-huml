import { ContextTracker, ExternalTokenizer } from "@lezer/lr";
import { BlockString, Dedent, FoldedString, Indent, Key, ListMark, Newline, Number as NumberToken, String as StringToken } from "./huml-parser.terms";

// --- Constants ---
const
    NEWLINE = 10, CR = 13, SPACE = 32, TAB = 9, HASH = 35,
    QUOTE = 34, BACKTICK = 96, BACKSLASH = 92, DASH = 45,
    UNDERSCORE = 95, PLUS = 43, DOT = 46,
    LOWER_A = 97, LOWER_Z = 122, UPPER_A = 65, UPPER_Z = 90,
    DIGIT_0 = 48, DIGIT_1 = 49, DIGIT_7 = 55, DIGIT_9 = 57,
    LOWER_E = 101, UPPER_E = 69, LOWER_X = 120, UPPER_X = 88,
    LOWER_B = 98, UPPER_B = 66, LOWER_O = 111, UPPER_O = 79,
    LOWER_U = 117;

// --- Helpers ---
const isAlpha = (c: number) => (c >= LOWER_A && c <= LOWER_Z) || (c >= UPPER_A && c <= UPPER_Z) || c === UNDERSCORE;
const isDigit = (c: number) => c >= DIGIT_0 && c <= DIGIT_9;
const isAlphaNum = (c: number) => isAlpha(c) || isDigit(c) || c === DASH;
const isHex = (c: number) => isDigit(c) || (c >= LOWER_A && c <= 102) || (c >= UPPER_A && c <= 70);

// --- Context Tracker ---
export const trackIndent: ContextTracker<number> = new ContextTracker({
    start: 0,
    shift(context, term) {
        return term == Indent ? context + 2 : term == Dedent ? context - 2 : context;
    },
    hash(context) { return context; }
});

// --- Tokenizers ---

export const indentation: ExternalTokenizer = new ExternalTokenizer((input, stack) => {
    const c = input.peek(0);

    // Handle EOF: if we have indentation, dedent to close blocks
    if (c === -1) {
        if (stack.context > 0) input.acceptToken(Dedent, 0);
        return;
    }

    if (c !== NEWLINE && c !== CR) return;

    let spaces = 0;
    let pos = 1;

    // Count indentation spaces immediately following the newline
    while (true) {
        const next = input.peek(pos);
        if (next === SPACE || next === TAB) {
            spaces++;
            pos++;
        } else {
            break;
        }
    }

    const next = input.peek(pos);

    // If the line is empty (just newline/EOF), emit Newline
    if (next === NEWLINE || next === CR || next === -1) {
        input.acceptToken(Newline, 1); // Consume only the first newline char
        return;
    }

    // Compare with current context
    if (spaces > stack.context) {
        input.acceptToken(Indent, pos);
    } else if (spaces < stack.context) {
        input.acceptToken(Dedent, 0); // Don't consume anything, just emit Dedent
    } else {
        input.acceptToken(Newline, pos);
    }
});

export const multilineStrings: ExternalTokenizer = new ExternalTokenizer((input, stack) => {
    const start = input.peek(0);
    if (start !== QUOTE && start !== BACKTICK) return;

    // Check for opening delimiter """ or ```
    if (input.peek(1) !== start || input.peek(2) !== start) return;

    const type = start === QUOTE ? BlockString : FoldedString;
    input.advance(3);

    // Enforce newline after delimiter
    const afterDelim = input.peek(0);
    if (afterDelim !== NEWLINE && afterDelim !== CR && afterDelim !== -1) return;

    const MAX_LENGTH = 1000000;
    let length = 0;

    while (length < MAX_LENGTH) {
        const next = input.peek(0);
        if (next === -1) return; // EOF without closing

        // Check for closing delimiter at start of line
        if (next === NEWLINE || next === CR) {
            input.advance();
            length++;

            // Check indentation
            let currentIndent = 0;
            while (true) {
                const c = input.peek(0);
                if (c === SPACE || c === TAB) {
                    currentIndent++;
                    input.advance();
                    length++;
                } else {
                    break;
                }
            }

            // Check for closing delimiter
            if (input.peek(0) === start && input.peek(1) === start && input.peek(2) === start) {
                if (currentIndent !== stack.context) return; // Invalid indentation
                input.advance(3);
                input.acceptToken(type);
                return;
            }
            continue;
        }

        if (next === BACKSLASH) {
            input.advance(2);
            length += 2;
            continue;
        }

        input.advance();
        length++;
    }

    // Fallback if too long
    input.acceptToken(type);
});

export const keyToken: ExternalTokenizer = new ExternalTokenizer((input) => {
    const c = input.peek(0);
    if (!isAlpha(c)) return;

    let pos = 1;
    while (true) {
        const next = input.peek(pos);
        if (!isAlphaNum(next)) break;
        pos++;
    }

    // Check reserved words
    if (pos <= 5) {
        const first = input.peek(0);
        // true
        if (pos === 4 && first === 116 && input.peek(1) === 114 && input.peek(2) === 117 && input.peek(3) === 101) return;
        // false
        if (pos === 5 && first === 102 && input.peek(1) === 97 && input.peek(2) === 108 && input.peek(3) === 115 && input.peek(4) === 101) return;
        // null
        if (pos === 4 && first === 110 && input.peek(1) === 117 && input.peek(2) === 108 && input.peek(3) === 108) return;
        // nan
        if (pos === 3 && first === 110 && input.peek(1) === 97 && input.peek(2) === 110) return;
        // inf
        if (pos === 3 && first === 105 && input.peek(1) === 110 && input.peek(2) === 102) return;
    }

    input.acceptToken(Key, pos);
});

export const listMarkToken: ExternalTokenizer = new ExternalTokenizer((input) => {
    if (input.peek(0) !== DASH) return;
    if (isDigit(input.peek(1))) return; // Negative number
    input.acceptToken(ListMark, 1);
});

export const stringToken: ExternalTokenizer = new ExternalTokenizer((input) => {
    if (input.peek(0) !== QUOTE) return;

    let pos = 1;
    while (true) {
        const next = input.peek(pos);
        if (next === -1) return; // Unclosed
        if (next === NEWLINE || next === CR) return; // No newlines allowed

        if (next === QUOTE) {
            if (input.peek(pos - 1) !== BACKSLASH) {
                input.acceptToken(StringToken, pos + 1);
                return;
            }
        }

        if (next === BACKSLASH) {
            const esc = input.peek(pos + 1);
            if (esc === -1) return;

            // Unicode escape \uXXXX
            if (esc === LOWER_U) {
                for (let i = 0; i < 4; i++) {
                    if (!isHex(input.peek(pos + 2 + i))) return;
                }
                pos += 6;
                continue;
            }

            // Simple escapes
            if ([QUOTE, BACKSLASH, 47, 98, 102, 110, 114, 116].includes(esc)) {
                pos += 2;
                continue;
            }

            return; // Invalid escape
        }
        pos++;
    }
});

export const numberToken: ExternalTokenizer = new ExternalTokenizer((input) => {
    let pos = 0;
    let c = input.peek(0);

    // Sign
    if (c === PLUS || c === DASH) {
        pos++;
        c = input.peek(pos);
    }

    if (!isDigit(c)) return;

    // Hex/Octal/Binary
    if (c === DIGIT_0) {
        const next = input.peek(pos + 1);
        if (next === LOWER_X || next === UPPER_X) { // Hex
            pos += 2;
            if (!isHex(input.peek(pos))) return;
            while (isHex(input.peek(pos)) || input.peek(pos) === UNDERSCORE) pos++;
            input.acceptToken(NumberToken, pos);
            return;
        }
        if (next === LOWER_O || next === UPPER_O) { // Octal
            pos += 2;
            let valid = false;
            while (true) {
                const d = input.peek(pos);
                if (d >= DIGIT_0 && d <= DIGIT_7) { valid = true; pos++; }
                else if (d === UNDERSCORE) pos++;
                else if (isDigit(d)) return; // Invalid octal digit
                else break;
            }
            if (valid) input.acceptToken(NumberToken, pos);
            return;
        }
        if (next === LOWER_B || next === UPPER_B) { // Binary
            pos += 2;
            let valid = false;
            while (true) {
                const d = input.peek(pos);
                if (d === DIGIT_0 || d === DIGIT_1) { valid = true; pos++; }
                else if (d === UNDERSCORE) pos++;
                else if (isDigit(d)) return; // Invalid binary digit
                else break;
            }
            if (valid) input.acceptToken(NumberToken, pos);
            return;
        }
    }

    // Decimal
    let hasDigit = false;
    while (isDigit(input.peek(pos)) || input.peek(pos) === UNDERSCORE) {
        if (isDigit(input.peek(pos))) hasDigit = true;
        pos++;
    }

    // Fraction
    if (input.peek(pos) === DOT) {
        pos++;
        if (isDigit(input.peek(pos))) {
            hasDigit = true;
            while (isDigit(input.peek(pos)) || input.peek(pos) === UNDERSCORE) pos++;
        }
    }

    // Exponent
    const e = input.peek(pos);
    if (e === LOWER_E || e === UPPER_E) {
        if (!hasDigit) return;
        pos++;
        const sign = input.peek(pos);
        if (sign === PLUS || sign === DASH) pos++;
        if (!isDigit(input.peek(pos))) return;
        while (isDigit(input.peek(pos)) || input.peek(pos) === UNDERSCORE) pos++;
    }

    if (hasDigit) input.acceptToken(NumberToken, pos);
});
