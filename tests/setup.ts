import '@testing-library/jest-dom/vitest';
import { setLocale } from '../src/i18n';

// The page language is module state (set by App from the URL); never let it leak between tests.
afterEach(() => setLocale('en'));
