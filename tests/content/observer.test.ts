import { afterEach, describe, expect, it, vi } from 'vitest';

import { watchForCards } from '../../src/content/filters/observer';
import { homeCard, searchCard } from './fixtures';

afterEach(() => {
  document.body.innerHTML = '';
});

function tick(): Promise<void> {
  return new Promise((r) => setTimeout(r, 0));
}

describe('watchForCards', () => {
  it('calls callback for card directly added to DOM', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(document.body, ['ytd-video-renderer'], cb);
    const card = searchCard();
    document.body.appendChild(card);
    await tick();
    expect(cb).toHaveBeenCalledWith(card);
    dispose();
  });

  it('calls callback for cards nested in added subtree', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer'],
      cb
    );
    const container = document.createElement('div');
    const card = searchCard();
    container.appendChild(card);
    document.body.appendChild(container);
    await tick();
    expect(cb).toHaveBeenCalledWith(card);
    dispose();
  });

  it('ignores non-matching added nodes', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer'],
      cb
    );
    document.body.appendChild(document.createElement('div'));
    await tick();
    expect(cb).not.toHaveBeenCalled();
    dispose();
  });

  it('stops calling after dispose', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer'],
      cb
    );
    dispose();
    document.body.appendChild(searchCard());
    await tick();
    expect(cb).not.toHaveBeenCalled();
  });

  it('supports multiple selectors', async () => {
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer', 'ytd-rich-item-renderer'],
      cb
    );
    const a = searchCard();
    const b = homeCard();
    document.body.appendChild(a);
    document.body.appendChild(b);
    await tick();
    expect(cb).toHaveBeenCalledWith(a);
    expect(cb).toHaveBeenCalledWith(b);
    dispose();
  });

  it('re-scans an existing card when children are added to its subtree', async () => {
    // Regression: YouTube renders a grid card first, then injects the
    // thumbnail overlay inside it. The observer must notice the later
    // overlay insertion so the card is re-evaluated.
    const card = searchCard();
    document.body.appendChild(card);
    await tick();
    const cb = vi.fn();
    const dispose = watchForCards(
      document.body,
      ['ytd-video-renderer'],
      cb
    );
    const thumb = card.querySelector('ytd-thumbnail')!;
    const overlay = document.createElement(
      'ytd-thumbnail-overlay-resume-playback-renderer'
    );
    thumb.appendChild(overlay);
    await tick();
    expect(cb).toHaveBeenCalledWith(card);
    dispose();
  });
});
