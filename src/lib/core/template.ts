export function renderTemplate(tpl: string, vars: Record<string, string | number | undefined>): string {
  const out: string[] = [];
  let i = 0;
  while (i < tpl.length) {
    const open = tpl.indexOf('{', i);
    if (open < 0) { out.push(tpl.slice(i)); break; }
    const close = tpl.indexOf('}', open + 1);
    if (close < 0) { out.push(tpl.slice(i)); break; }
    out.push(tpl.slice(i, open));
    const key = tpl.slice(open + 1, close);
    const v = vars[key];
    out.push(v == null ? tpl.slice(open, close + 1) : String(v));
    i = close + 1;
  }
  return out.join('');
}
