import { defineConfig } from 'vitest/config';
import path from 'path';

export default defineConfig({
    test: {
        environment: 'node', // Use node environment for server actions/services
        clearMocks: true,
        restoreMocks: true,
        unstubEnvs: true,
        alias: {
            '@': path.resolve(__dirname, './'),
            'server-only': path.resolve(__dirname, './test-stubs/server-only.ts'),
        },
    },
});
