import { tanstackViteConfig } from "@tanstack/config/vite";
import { defineConfig, mergeConfig } from "vite";

const config = defineConfig({
    // Framework plugins, vitest config, etc.
    test: {
        globals: true,
        environment: "node",
        include: ["tests/**/*.test.ts"],
        exclude: ["node_modules", "dist"],
    },
});

export default mergeConfig(
    config,
    tanstackViteConfig({
        entry: "./src/index.ts",
        srcDir: "./src",
    }),
);
