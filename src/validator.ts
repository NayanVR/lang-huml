import { Tree } from "@lezer/common";

export function validateTree(tree: Tree, input: string): string[] {
    const errors: string[] = [];

    tree.cursor().iterate((node) => {
        // Check for duplicate keys in dictionaries
        if (node.name === "DictBlockContent" || node.name === "InlineDict" || node.name === "RootInlineDict" || node.name === "Document" || node.name === "Properties") {
            const seenKeys = new Set<string>();

            // Iterate over children to find properties
            let child = node.node.firstChild;
            while (child) {
                if (child.name === "Property" || child.name === "DictPair") {
                    // The first child of Property/DictPair is the Key (or String acting as key)
                    const keyNode = child.firstChild;
                    if (keyNode && (keyNode.name === "Key" || keyNode.name === "String")) {
                        const keyText = input.slice(keyNode.from, keyNode.to);

                        if (seenKeys.has(keyText)) {
                            errors.push(`Duplicate key "${keyText}" found at position ${keyNode.from}`);
                        } else {
                            seenKeys.add(keyText);
                        }
                    }
                }
                child = child.nextSibling;
            }
        }
    });

    return errors;
}
