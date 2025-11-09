import { describe, test } from "bun:test";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { join } from "node:path";
import { parser } from "./src/huml-parser";
import { validateTree } from "./src/validator";
import { hasParseErrors } from "./test-helpers";

describe("Official HUML Tests", () => {
    describe("Assertions", () => {
        const runAssertion = async (name: string, input: string, errorExpected: boolean) => {
            test(name, () => {
                const tree = parser.parse(input);
                // Check for parse errors (⚠ nodes)
                const hasSyntaxErrors = hasParseErrors(tree);

                // Check for validation errors (duplicate keys, etc.)
                const validationErrors = validateTree(tree, input);
                const hasValidationErrors = validationErrors.length > 0;

                const hasErrors = hasSyntaxErrors || hasValidationErrors;

                if (errorExpected && !hasErrors) {
                    throw new Error("expected error but got none");
                }

                if (!errorExpected && hasErrors) {
                    if (hasSyntaxErrors) throw new Error("unexpected parse error");
                    if (hasValidationErrors) throw new Error(`unexpected validation error: ${validationErrors.join(", ")}`);
                }
            });
        };

        // Walk the ./tests/assertions directory
        const assertionsDir = "./tests/assertions";

        try {
            const files = readdirSync(assertionsDir);

            for (const file of files) {
                const filePath = join(assertionsDir, file);
                const stats = statSync(filePath);

                // Skip directories and non-JSON files
                if (stats.isDirectory() || !file.endsWith(".json")) {
                    continue;
                }

                // Read the JSON test file
                const data = readFileSync(filePath, "utf8");
                const tests = JSON.parse(data);

                // Run each assertion
                for (let n = 0; n < tests.length; n++) {
                    const testCase = tests[n] as { name: string; input: string; error: boolean };
                    // +1 to account for the opening [ and the line break in the test file
                    const testName = `line ${n + 1}: ${testCase.name}`;
                    runAssertion(testName, testCase.input, testCase.error);
                }
            }
        } catch (err) {
            test("Assertions directory exists", () => {
                throw new Error(`Could not read assertions directory: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
    });

    describe("Documents", () => {
        // Read all files from tests/documents directory
        const dirPath = "tests/documents";

        try {
            const dirEntries = readdirSync(dirPath);

            // Filter for .huml files
            const files = dirEntries
                .filter((file) => file.endsWith(".huml"))
                .map((file) => join(dirPath, file));

            if (files.length < 1) {
                throw new Error("expected at least 1 huml file in tests/documents");
            }

            for (const filePath of files) {
                test(`testing ${filePath.split("/").pop()}`, () => {
                    // Read .huml file and parse it - just check if it parses without errors
                    // Note: We only check for parse errors (⚠ nodes), not validation errors
                    const humlContent = readFileSync(filePath, "utf8");
                    const tree = parser.parse(humlContent);

                    // Check for parse errors (⚠ nodes) only, not validation
                    let hasParseError = false;
                    tree.cursor().iterate((node) => {
                        if (node.name === "⚠") {
                            hasParseError = true;
                            return false; // Stop iteration
                        }
                    });

                    if (hasParseError) {
                        throw new Error(`Parse errors in ${filePath.split("/").pop()}`);
                    }

                    // Just verify the tree is valid
                    if (!tree.topNode) {
                        throw new Error(`Failed to parse ${filePath.split("/").pop()}`);
                    }
                });
            }
        } catch (err) {
            test("Documents directory exists", () => {
                throw new Error(`Could not read documents directory: ${err instanceof Error ? err.message : String(err)}`);
            });
        }
    });
});

