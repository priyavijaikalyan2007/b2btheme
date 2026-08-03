import { defineConfig } from "vitest/config";

export default defineConfig({
    test: {
        environment: "jsdom",
        include: ["components/**/*.test.ts", "runtime/**/*.test.ts"],
        exclude: ["node_modules", "dist"],
        globals: true,
        setupFiles: ["./tests/setup.ts"],
        coverage: {
            provider: "v8",
            include: ["components/**/*.ts", "runtime/**/*.ts"],
            exclude: [
                "**/*.test.ts",
                "components/diagramengine/src/**",
            ],
            reporter: ["text", "html", "lcov"],
        },
    },
});
