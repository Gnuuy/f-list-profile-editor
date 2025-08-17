import { useEffect, useState } from 'react';
import { useEditorContext } from '../context/EditorContext';
import BubbleButton from './BubbleButton';


export default function FloatingToolbar() {
    const {
        editor,
        justifyLeft,
        justifyCenter,
        justifyRight,
        justifyFull,
        bold,
        underline,
        strikethrough,
        subscript,
        superscript,
        italic
    } = useEditorContext();
  const [visible, setVisible] = useState(true);


  return (
    <>
      <div className="floating-toolbar-toggle">
        <button onClick={() => setVisible(v => !v)}>
          {visible ? 'Hide' : 'Show'} Toolbar
        </button>
      </div>

      {visible && (
        <div className="floating-toolbar">
       <div>
        </div>
        </div>
      )}
    </>
  );
}
