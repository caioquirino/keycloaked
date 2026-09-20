import type { StorybookConfig } from "@storybook/react-vite";

const config: StorybookConfig = {
    stories: ["../src/**/*.mdx", "../src/**/*.stories.@(js|jsx|mjs|ts|tsx)"],
    addons: [],
    framework: {
        name: "@storybook/react-vite",
        options: {}
    },
    staticDirs: ["../public"],
    async viteFinal(config) {
        const path = await import("path");
        config.resolve = config.resolve || {};
        config.resolve.alias = {
            ...config.resolve.alias,
            "@keycloaked/ui": path.resolve(__dirname, "../../packages/ui/src")
        };
        config.server = config.server || {};
        config.server.fs = config.server.fs || {};
        config.server.fs.allow = [
            ...(config.server.fs.allow || []),
            path.resolve(__dirname, "../..")
        ];
        return config;
    }
};
export default config;
