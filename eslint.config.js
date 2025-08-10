import antfu from "@antfu/eslint-config";
// Run this command to generate base config and vs code settings:
// pnpm dlx @antfu/eslint-config@latest

export default antfu({
    type: "lib",
    react: false,
    formatters: true,
    stylistic: {
        indent: 4,
        semi: true,
        quotes: "double",
        overrides: {
            "style/comma-dangle": [
                "error",
                "always-multiline",
            ],
            "style/array-bracket-newline": [
                "error",
                { multiline: true, minItems: 3 },
            ],
            "style/function-call-argument-newline": [
                "error",
                "consistent",
            ],
            "style/max-statements-per-line": [
                "error",
                { max: 2 },
            ],
            "style/brace-style": [
                "error",
                "1tbs",
                { allowSingleLine: true },
            ],
            "style/jsx-wrap-multilines": [
                "error",
                {
                    return: "parens-new-line",
                    declaration: "parens-new-line",
                    condition: "parens-new-line",
                    logical: "parens-new-line",
                    arrow: "parens-new-line",
                },
            ],
        },
    },
    typescript: {
        overrides: {
            "ts/naming-convention": [
                "error",
                {
                    selector: "variable",
                    format: [
                        "camelCase",
                        "UPPER_CASE",
                        "PascalCase",
                    ],
                },
                {
                    selector: "typeLike",
                    format: ["PascalCase"],
                },
                {
                    selector: "class",
                    format: ["PascalCase"],
                },
                {
                    selector: "interface",
                    format: ["PascalCase"],
                    custom: {
                        regex: "^I[A-Z]",
                        match: false,
                    },
                },
            ],
        },
    },
    ignores: [
        "./.generated/route-tree.gen.ts",
        "*.md",
    ],
}, {
    rules: {
        "ts/no-redeclare": "off",
        "ts/consistent-type-definitions": [
            "error",
            "interface",
        ],
        "no-console": [
            "warn",
            {
                allow: [
                    "warn",
                    "error",
                ],
            },
        ],
        "antfu/no-top-level-await": ["off"],
        "node/prefer-global/process": ["off"],
        "node/no-process-env": ["error"],
        "perfectionist/sort-imports": [
            "error",
            {
                tsconfigRootDir: ".",
            },
        ],
        // "unicorn/filename-case": [
        //     "error",
        //     {
        //         cases: { kebabCase: true, pascalCase: true },
        //     },

        // ],
    },
    ignores: ["./.generated/"],
}, {
    files: ["*.md"],
    rules: {
        "unicorn/filename-case": [
            "error",
            {
                cases: { pascalCase: true },
            },
        ],
    },
});
