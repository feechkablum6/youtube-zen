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

  const observer = new MutationObserver((mutations) => {
    for (const m of mutations) {
      m.addedNodes.forEach(visit);
    }
  });

  observer.observe(root, { childList: true, subtree: true });
  return () => observer.disconnect();
}
