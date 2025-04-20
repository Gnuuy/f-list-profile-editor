import { Node, ReactNodeViewRenderer } from "@tiptap/react"
import { CommandProps } from "@tiptap/react"
import Collapsible from "./Collapsible"

declare module '@tiptap/core' {
  interface Commands<ReturnType = any> {
    collapsible: {
        addCollapsible: () => ReturnType
    }
  }
}

export const CustomCollapsible = Node.create({
  name: 'collapsible',

  group: 'block',
  content: 'block+',
  defining: true,

  parseHTML() {
    return [{ tag: 'collapsible' }];
  },

  addNodeView() {
    return ReactNodeViewRenderer(Collapsible);
  },

  addCommands() {
    return {
    addCollapsible: () => ({chain}: CommandProps) => {
        return chain().wrapIn('collapsible').run();
      }
    };
  },
});