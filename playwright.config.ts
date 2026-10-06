import {defineConfig,devices} from '@playwright/test';
export default defineConfig({testDir:'./tests',testMatch:'e2e.spec.ts',use:{baseURL:process.env.TEST_BASE_URL??'http://127.0.0.1:4173'},projects:[{name:'desktop',use:{...devices['Desktop Chrome']}},{name:'mobile',use:{...devices['iPhone 13']}}]});
