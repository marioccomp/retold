import { defineConfig } from 'vitest/config';
import path from 'path';
import dotenv from 'dotenv';

dotenv.config({
    path: path.resolve(__dirname, '../../.env'),
    override: true,
});

const sharedConfig = defineConfig({
    test: {
        environment: 'node', // Use node environment for server actions/services
        clearMocks: true,
        restoreMocks: true,
        unstubEnvs: true,
        exclude: ['e2e/**', 'node_modules/**', 'dist/**', '.next/**'],
        alias: {
            '@': path.resolve(__dirname, './'),
            'server-only': path.resolve(__dirname, './test-stubs/server-only.ts'),
        },
    },
});

export default sharedConfig;
