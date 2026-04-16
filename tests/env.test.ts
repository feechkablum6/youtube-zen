import { describe, expect, it } from 'vitest';

describe('test environment', () => {
  it('has document available (jsdom)', () => {
    const div = document.createElement('div');
    div.textContent = 'hi';
    expect(div.textContent).toBe('hi');
  });
});
