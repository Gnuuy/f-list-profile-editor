import { Node } from '@tiptap/core';
import {
  NodeViewWrapper,
  ReactNodeViewRenderer,
} from '@tiptap/react';
import type { NodeViewProps } from '@tiptap/react';
import { useState } from 'react';

import { getFListEiconUrl } from '../../../models/Eicon';
import { REPLACE_ME_ICON_SRC } from '../../../models/ImagePlaceholders';

function EiconView({ node, selected }: NodeViewProps) {
  const name = String(node.attrs.name ?? '');
  const remoteSource = getFListEiconUrl(name);
  const [failedSource, setFailedSource] = useState<string | null>(null);
  const loadFailed = remoteSource === null || failedSource === remoteSource;

  const source = loadFailed || !remoteSource
    ? REPLACE_ME_ICON_SRC
    : remoteSource;
  const label = loadFailed
    ? `REPLACE ME WITH YOUR EICON: ${name || 'unknown eicon'}`
    : `Eicon: ${name}`;

  return (
    <NodeViewWrapper
      as="span"
      className={`eicon-node${selected ? ' is-selected' : ''}${loadFailed ? ' is-fallback' : ''}`}
      data-drag-handle=""
      data-eicon-name={name}
      data-eicon-load-state={loadFailed ? 'fallback' : 'loading-or-loaded'}
      aria-label={`Move eicon ${name || 'unknown eicon'}`}
      contentEditable={false}
    >
      <img
        className="eicon-image"
        src={source}
        width={50}
        height={50}
        alt={label}
        title={label}
        loading="lazy"
        decoding="async"
        referrerPolicy="no-referrer"
        draggable={false}
        onError={() => setFailedSource(remoteSource)}
      />
    </NodeViewWrapper>
  );
}

export const Eicon = Node.create({
  name: 'eicon',
  priority: 1000,
  group: 'inline',
  inline: true,
  atom: true,
  selectable: true,
  draggable: true,

  addAttributes() {
    return {
      name: {
        default: '',
        parseHTML: element => element.getAttribute('data-eicon-name') ?? '',
        renderHTML: attributes => ({ 'data-eicon-name': attributes.name }),
      },
    };
  },

  parseHTML() {
    return [{ tag: 'img[data-eicon-name]' }];
  },

  renderHTML({ HTMLAttributes }) {
    const name = String(HTMLAttributes['data-eicon-name'] ?? '');
    return ['img', {
      ...HTMLAttributes,
      src: getFListEiconUrl(name) ?? REPLACE_ME_ICON_SRC,
      alt: `Eicon: ${name}`,
      width: 50,
      height: 50,
      class: 'eicon-image',
    }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(EiconView, { as: 'span' });
  },
});
