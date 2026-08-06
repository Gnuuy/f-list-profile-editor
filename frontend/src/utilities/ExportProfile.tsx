import type { Editor } from '@tiptap/react';
import { toBBCode } from './BBCodeParser';
import { copyToClipboard } from './Clipboard';
import { toast } from './Toast';

export async function exportProfile(getEditor: () => Editor | null) {
  try {
    const ed = getEditor();
    if (!ed) {
      toast('Failed to export', 'error');
      return false;
    }
    const bb = toBBCode(ed.state.doc);
    const ok = await copyToClipboard(bb);
    toast(ok ? 'Successfully exported to Clipboard' : 'Failed to export', ok ? 'success' : 'error');
    return ok;
  } catch (err) {
    console.error('Export failed:', err);
    toast('Failed to export', 'error');
    return false;
  }
}
