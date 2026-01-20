import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node', // Use node environment for server actions/services
        alias: {
            '@': path.resolve(__dirname, './'),
        },
    },
});
