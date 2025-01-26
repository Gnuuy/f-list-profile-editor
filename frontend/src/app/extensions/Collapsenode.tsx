import { Node, mergeAttributes } from '@tiptap/core';

const CollapseNode = Node.create({
  name: 'collapse', // Node name

  group: 'block',
  content: 'block*', // The collapsible can contain other block elements
  defining: true,

  addAttributes() {
    return {
      title: {
        default: 'Click to expand...', // Default title for the collapsible dropdown
      },
    };
  },

  parseHTML() {
    return [
      {
        tag: 'div[data-type="collapse"]',
      },
    ];
  },

  renderHTML({ HTMLAttributes }) {
    return [
      'div',
      { 'data-type': 'collapse', ...HTMLAttributes },
      ['div', { class: 'collapse-title' }, HTMLAttributes.title],
      ['div', { class: 'collapse-content' }, 0], // "0" here means this is where nested content will be rendered
    ];
  },

  addNodeView() {
    return ({ node, getPos, editor }) => {
      const wrapper = document.createElement('div');
      wrapper.setAttribute('data-type', 'collapse');
      wrapper.style.border = '1px solid #ccc';
      wrapper.style.borderRadius = '8px';
      wrapper.style.padding = '10px';
      wrapper.style.marginBottom = '10px';

      const title = document.createElement('div');
      title.className = 'collapse-title';
      title.textContent = node.attrs.title;
      title.style.cursor = 'pointer';
      title.style.fontWeight = 'bold';
      title.style.marginBottom = '5px';

      const content = document.createElement('div');
      content.className = 'collapse-content';
      content.style.display = 'none'; // Hidden by default
      content.innerHTML = node.content.firstChild?.textContent || ''; // Render the block content

      title.addEventListener('click', () => {
        const isVisible = content.style.display === 'block';
        content.style.display = isVisible ? 'none' : 'block';
      });

      wrapper.appendChild(title);
      wrapper.appendChild(content);

      return {
        dom: wrapper,
        update: (updatedNode) => {
          if (updatedNode.type.name !== this.name) {
            return false;
          }
          title.textContent = updatedNode.attrs.title;
          content.innerHTML = updatedNode.content.firstChild?.textContent || '';
          return true;
        },
      };
    };
  },
});

export default CollapseNode;
