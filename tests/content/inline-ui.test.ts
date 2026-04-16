import { afterEach, describe, expect, it } from 'vitest';

import {
  applyChipVisibility,
  CHIP_ID,
  createChip,
  isPathVisible,
  syncChipState,
} from '../../src/content/filters/inline-ui';

afterEach(() => {
  document.body.innerHTML = '';
});

describe('createChip', () => {
  it('creates button with correct id and initial inactive state', () => {
    const chip = createChip();
    expect(chip.id).toBe(CHIP_ID);
    expect(chip.getAttribute('aria-pressed')).toBe('false');
    expect(chip.dataset.active).toBe('false');
    expect(chip.type).toBe('button');
  });

  it('contains visible label text', () => {
    const chip = createChip();
    expect(chip.textContent).toContain('Просмотренные');
  });

  it('has accessible aria-label', () => {
    const chip = createChip();
    expect(chip.getAttribute('aria-label')).toMatch(/Просмотренные/i);
  });
});

describe('syncChipState', () => {
  it('sets data-active=true and aria-pressed=true when enabled', () => {
    const chip = createChip();
    syncChipState(chip, true);
    expect(chip.dataset.active).toBe('true');
    expect(chip.getAttribute('aria-pressed')).toBe('true');
  });

  it('resets to false when disabled', () => {
    const chip = createChip();
    syncChipState(chip, true);
    syncChipState(chip, false);
    expect(chip.dataset.active).toBe('false');
    expect(chip.getAttribute('aria-pressed')).toBe('false');
  });
});

describe('isPathVisible', () => {
  it.each([
    ['/', true],
    ['/results', true],
    ['/watch', true],
    ['/shorts/abcd', false],
    ['/channel/foo', false],
    ['/playlist', false],
    ['/feed/subscriptions', false],
  ])('%s → %s', (path, expected) => {
    expect(isPathVisible(path)).toBe(expected);
  });
});

describe('applyChipVisibility', () => {
  it('hides chip when path not in allowlist', () => {
    const chip = createChip();
    document.body.appendChild(chip);
    applyChipVisibility(chip, '/shorts/x');
    expect(chip.style.display).toBe('none');
  });

  it('restores chip when path in allowlist', () => {
    const chip = createChip();
    document.body.appendChild(chip);
    applyChipVisibility(chip, '/shorts/x');
    applyChipVisibility(chip, '/results');
    expect(chip.style.display).toBe('');
  });
});
