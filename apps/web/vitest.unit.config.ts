import { defineConfig, mergeConfig } from 'vitest/config';
import sharedConfig from './vitest.config';

export default mergeConfig(
    sharedConfig,
    defineConfig({
        test: {
            include: ['src/**/*.spec.ts'],
            exclude: [
                'src/tests/integration/**',
                'e2e/**',
                'node_modules/**',
                'dist/**',
                '.next/**',
            ],
        },
    })
);
