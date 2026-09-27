import { mergeAttributes } from '@tiptap/core';
import Link, { isAllowedUri } from '@tiptap/extension-link';

/** Return the host label F-list appends to ordinary web links. */
export function getFListLinkHost(href: string): string | null {
  try {
    const url = new URL(href);
    return url.protocol === 'http:' || url.protocol === 'https:'
      ? url.host
      : null;
  } catch {
    return null;
  }
}

/**
 * F-list decorates profile links with a chain and the destination host. Keep
 * those details as rendered metadata so they never become part of the editor
 * document or the exported [url] label.
 */
export const FListLink = Link.extend({
  renderHTML({ HTMLAttributes }) {
    const href = String(HTMLAttributes.href ?? '');
    const allowed = this.options.isAllowedUri(href, {
      defaultValidate: candidate => Boolean(isAllowedUri(candidate, this.options.protocols)),
      protocols: this.options.protocols,
      defaultProtocol: this.options.defaultProtocol,
    });
    const renderedHref = allowed ? href : '';
    const host = getFListLinkHost(renderedHref);

    return [
      'a',
      mergeAttributes(
        this.options.HTMLAttributes,
        HTMLAttributes,
        { href: renderedHref },
        host ? { 'data-link-host': host } : {},
      ),
      0,
    ];
  },
});
