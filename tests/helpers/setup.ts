/**
 * Vitest setup file.
 *
 * Mocks native modules that n8n-workflow pulls transitively but
 * aren't available (or needed) in a unit-test environment.
 */
import { vi } from 'vitest';

// isolated-vm is a native C++ addon used by n8n's expression runtime.
// It's not pre-built for all platforms and irrelevant for unit tests.
vi.mock('isolated-vm', () => ({}));
