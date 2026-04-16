export type CardCallback = (card: Element) => void;

export function watchForCards(
  root: Node,
  selectors: readonly string[],
  callback: CardCallback
): () => void {
  const selector = selectors.join(',');

  const visit = (node: Node): void => {
    if (node.nodeType !== Node.ELEMENT_NODE) return;
    const el = node as Element;
    if (el.matches(selector)) callback(el);
    el.querySelectorAll(selector).forEach((child) => callback(child));
  };

  // Re-scan the nearest card ancestor of a mutation target. YouTube often
  // renders an empty card first, then injects the thumbnail overlay into
  // it later — we need a second pass in that case.
  const notifyOwningCard = (target: Node): void => {
    if (!(target instanceof Element)) return;
    const owner = target.closest(selector);
    if (owner) callback(owner);
  };

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(visit);
      if (m.addedNodes.length > 0) notifyOwningCard(m.target);
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
