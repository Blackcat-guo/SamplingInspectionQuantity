export function execCopyTextarea(text: string): boolean {
  const ta = document.createElement('textarea');
  ta.value = text;
  ta.setAttribute('aria-hidden', 'true');
  ta.tabIndex = -1;
  Object.assign(ta.style, {
    position: 'fixed', top: '50%', left: '50%',
    width: '2em', height: '2em', padding: '0', margin: '0',
    border: '0', outline: '0', boxShadow: 'none',
    background: 'transparent', color: 'transparent',
    caretColor: 'transparent',
    opacity: '1',
    pointerEvents: 'none',
    fontSize: '16px', lineHeight: '1', resize: 'none',
    zIndex: '2147483647', transform: 'translate(-50%, -50%)',
  });
  document.body.appendChild(ta);
  let ok = false;
  try {
    ta.focus();
    ta.select();
    ta.setSelectionRange(0, text.length);
    ok = document.execCommand('copy');
  } catch {
    ok = false;
  }
  try { document.body.removeChild(ta); } catch { /* ignore */ }
  return ok;
}

export async function copyText(text: string, compat: boolean): Promise<boolean> {
  if (!text) return false;
  // 同步尝试 execCommand（iOS Safari 要求必须在用户手势同步栈内）
  if (execCopyTextarea(text)) return true;
  if (compat) return false;
  if (navigator.clipboard?.writeText) {
    try { await navigator.clipboard.writeText(text); return true; }
    catch { return false; }
  }
  return false;
}
