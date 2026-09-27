// extensions/quote-selection.ts
import { Extension } from '@tiptap/core';
import { TextSelection } from '@tiptap/pm/state';

declare module '@tiptap/core' {
  interface Commands<ReturnType> {
    quoteSelection: {
      /** Wrap ONLY the current selection in a single blockquote (no cascaded nesting). */
      quoteSelection: () => ReturnType;
    }
  }
}

export const QuoteSelection = Extension.create({
  name: 'quoteSelection',

  addCommands() {
    return {
      quoteSelection:
        () =>
        ({ state, dispatch }) => {
          const { selection, schema } = state;
          const blockquote = schema.nodes.blockquote;
          if (!blockquote) return false;

          // Caret only? Let caller handle caret/nesting case with setBlockquote().
          if (!(selection instanceof TextSelection) || selection.empty) return false;

          const { from, to } = selection;
          const $from = state.doc.resolve(from);
          const $to   = state.doc.resolve(to);

          // MULTI-BLOCK: wrap the block range once (normal behavior).
          if (!$from.sameParent($to) || !$from.parent.isTextblock) {
            const range = $from.blockRange($to);
            if (!range) return false;
            const tr = state.tr.wrap(range, [{ type: blockquote }]).scrollIntoView();
            dispatch?.(tr);
            return true;
          }

          // SINGLE TEXTBLOCK: split around selection, then wrap only the middle block.

          let tr = state.tr;

          // Split AFTER selection if not already at end of block
          const endOfBlock = $to.end();
          if (to < endOfBlock) {
            tr = tr.split(to);
          }

          // Map `from` through the split we just did,
          // then split BEFORE selection if not already at start of block
          let mappedFrom = tr.mapping.map(from, 1);
          const $mf = tr.doc.resolve(mappedFrom);
          const startOfBlock = $mf.start();
          if (mappedFrom > startOfBlock) {
            tr = tr.split(mappedFrom);
          }

          // After both splits, re-map `from` to land inside the middle block,
          // then compute that block's full [start, end] and wrap that range.
          mappedFrom = tr.mapping.map(from, 1);
          const $mid = tr.doc.resolve(mappedFrom);
          const midStart = $mid.start();
          const midEnd   = $mid.end();

          const $s = tr.doc.resolve(midStart);
          const $e = tr.doc.resolve(midEnd);
          const range = $s.blockRange($e);
          if (!range) {
            dispatch?.(tr);
            return true; // nothing to wrap, but we did valid splits
          }

          tr = tr.wrap(range, [{ type: blockquote }]).scrollIntoView();
          dispatch?.(tr);
          return true;
        },
    };
  },
});
