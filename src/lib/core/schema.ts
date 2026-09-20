export const SCHEMA_VERSION = 5;
export const AUTO_GROUP_NAME = '识别新增';

export interface Item { name: string; qty: number; }
export interface Group {
  id: string; name: string; total: number;
  totalIsAuto?: boolean; items: Item[];
}
export interface Product {
  id: string; name: string; prefix: string; suffix: string;
  supplier: string; customer: string; process: string;
  incomingQty: number; isSample: boolean;
  presets: string[]; groups: Group[];
}
export interface Customer { id: string; name: string; responsibleIds: string[]; }
export interface Responsible { id: string; name: string; kind: 'normal' | 'special'; }
export interface SpecialGroup {
  id: string; name: string; items: string[];
  responsibleIds: string[]; requireSample: boolean;
}
export interface PresetGroup { id: string; name: string; items: string[]; }
export interface GlobalPreset { id: string; name: string; productIds: string[] | null; }
export interface Shortcut { id: string; name: string; action: 'returnSupplier' | 'text'; text: string; }

export interface DataPresets {
  suppliers: string[];
  customers: Customer[];
  incomingQtyPresets: number[];
  processes: string[];
  tempHandlings: string[];
  tempHandlingShortcuts: Shortcut[];
  responsiblePersons: Responsible[];
  specialGroups: SpecialGroup[];
  presetGroups: PresetGroup[];
}

export interface Settings {
  summaryTemplate: string;
  showVoice: boolean; 
  showImageOcr: boolean;
  showRecognizeTools: boolean;
  experienceLevel: 'auto' | 'elegant' | 'standard' | 'compat';
  animationLevel: 'normal' | 'reduced' | 'none';
  showZeroQtyItems: boolean;
  mergeMultiProductSummary: boolean;
  confirmBeforeDelete: boolean;
  compactMode: boolean;
  fontSize: 'small' | 'standard' | 'large';
  autoBackup: boolean;
  showShortcutHints: boolean;
  showMainTips: boolean;
  showTopNavText: boolean;
  bulkAddConfirmThreshold: number;
  tempHandling: string;
  responsiblePersons: string[];
  collapsedGroups: string[];
}

export const uid = (): string =>
  Date.now().toString(36) + Math.random().toString(36).slice(2, 7);

export const nameKey = (s: unknown): string =>
  String(s ?? '').trim().toLowerCase();

export function clampInt(v: unknown, min = 0, max = Number.MAX_SAFE_INTEGER): number {
  const n = Math.floor(Number(v));
  if (!Number.isFinite(n)) return min;
  return Math.min(max, Math.max(min, n));
}

export function clonePlain<T>(obj: T): T {
  try {
    if (typeof structuredClone === 'function') return structuredClone(obj);
  } catch { /* ignore */ }
  return JSON.parse(JSON.stringify(obj));
}

const collator = new Intl.Collator('zh-Hans-CN', { sensitivity: 'base', numeric: true });
export const ncmp = (a: unknown, b: unknown): number =>
  collator.compare(String(a ?? ''), String(b ?? ''));
export function sortNatural<T>(arr: readonly T[], keyFn?: (x: T) => unknown): T[] {
  const copy = arr.slice();
  if (keyFn) copy.sort((a, b) => ncmp(keyFn(a), keyFn(b)));
  else copy.sort((a, b) => ncmp(a as unknown, b as unknown));
  return copy;
}

export const DEFAULT_TPL = [
  '客户：{customer}',
  '供应商来料：{supplier}',
  '发生工序：{process}',
  '料号及来料批量：',
  '{lotLines}',
  '问题描述：',
  '{samplingLine}',
  '{summary}',
  '临时处理方式：{tempHandling}',
  '负责人：{responsible}',
].join('\n');

export const LEGACY_TPLS: string[] = [
  '供应商来料：{supplier}\n发生工序：{process}\n料号及来料批量：\n{lotLines}\n问题描述：\n{samplingLine}\n{summary}\n临时处理方式：{tempHandling}\n负责人：{responsible}',
  '供应商来料：{supplier}\n发生工序：{process}\n料号及来料批量：\n{lotLines}\n问题描述：\n{samplingLine}\n{summary}\n临时处理方式：{tempHandling}',
  '供应商来料：{supplier}\n发生工序：{process}\n料号及来料批量：\n{lotLines}\n问题描述：\n{samplingLine}\n{summary}',
];

/* ---------- 清洗 ---------- */
export function cleanStringList(arr: unknown): string[] {
  const seen = new Set<string>(), out: string[] = [];
  (Array.isArray(arr) ? arr : []).forEach(x => {
    if (typeof x !== 'string') return;
    const t = x.trim();
    if (!t) return;
    const k = nameKey(t);
    if (seen.has(k)) return;
    seen.add(k); out.push(t);
  });
  return out;
}

export function cleanNumberList(arr: unknown): number[] {
  const seen = new Set<number>(), out: number[] = [];
  (Array.isArray(arr) ? arr : []).forEach(x => {
    const n = clampInt(x, 0);
    if (n <= 0 || seen.has(n)) return;
    seen.add(n); out.push(n);
  });
  return out;
}

export function cleanItems(arr: unknown): Item[] {
  const seen = new Set<string>(), out: Item[] = [];
  (Array.isArray(arr) ? arr : []).forEach((it: any) => {
    if (!it || typeof it.name !== 'string') return;
    const name = it.name.trim();
    if (!name) return;
    const k = nameKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ name, qty: clampInt(it.qty, 0) });
  });
  return out;
}

export function cleanGroups(arr: unknown): Group[] {
  return (Array.isArray(arr) ? arr : [])
    .filter((g: any) => g && typeof g === 'object')
    .map((g: any) => {
      const out: Group = {
        id: g.id || uid(),
        name: typeof g.name === 'string' && g.name.trim() ? g.name.trim() : '未命名分组',
        total: clampInt(g.total, 0),
        items: cleanItems(g.items),
      };
      if (g.totalIsAuto === false) out.totalIsAuto = false;
      return out;
    });
}

export function normalizeProduct(p: any): Product {
  return {
    id: p?.id || uid(),
    name: typeof p?.name === 'string' && p.name.trim() ? p.name.trim() : '未命名产品',
    prefix: typeof p?.prefix === 'string' ? p.prefix : '',
    suffix: typeof p?.suffix === 'string' ? p.suffix : '',
    supplier: typeof p?.supplier === 'string' ? p.supplier : '',
    customer: typeof p?.customer === 'string' ? p.customer : '',
    process: typeof p?.process === 'string' ? p.process : '',
    incomingQty: clampInt(p?.incomingQty, 0),
    isSample: !!p?.isSample,
    presets: cleanStringList(p?.presets),
    groups: cleanGroups(p?.groups),
  };
}

export function cleanCustomers(arr: unknown): Customer[] {
  const seen = new Set<string>(), out: Customer[] = [];
  (Array.isArray(arr) ? arr : []).forEach((c: any) => {
    let name = '', id = '', responsibleIds: string[] = [];
    if (typeof c === 'string') name = c.trim();
    else if (c && typeof c === 'object') {
      name = String(c.name || '').trim();
      id = c.id || '';
      responsibleIds = Array.isArray(c.responsibleIds)
        ? c.responsibleIds.filter((x: unknown) => typeof x === 'string') : [];
    } else return;
    if (!name) return;
    const k = nameKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ id: id || uid(), name, responsibleIds });
  });
  return out;
}

export function cleanResponsiblePersons(arr: unknown): Responsible[] {
  const seen = new Set<string>(), out: Responsible[] = [];
  (Array.isArray(arr) ? arr : []).forEach((it: any) => {
    let name = '', id = '', kind: 'normal' | 'special' = 'normal';
    if (typeof it === 'string') name = it.trim().replace(/^@+/, '');
    else if (it && typeof it === 'object') {
      name = String(it.name || '').trim().replace(/^@+/, '');
      id = it.id || '';
      kind = it.kind === 'special' ? 'special' : 'normal';
    } else return;
    if (!name) return;
    const k = nameKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ id: id || uid(), name, kind });
  });
  return out;
}

export function cleanShortcuts(arr: unknown): Shortcut[] {
  const seen = new Set<string>(), out: Shortcut[] = [];
  (Array.isArray(arr) ? arr : []).forEach((s: any) => {
    if (!s || typeof s !== 'object') return;
    const name = String(s.name || '').trim();
    if (!name) return;
    const k = nameKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    const action: Shortcut['action'] = s.action === 'text' ? 'text' : 'returnSupplier';
    out.push({ id: s.id || uid(), name, action, text: String(s.text || '').trim() });
  });
  return out;
}

export function cleanSpecialGroups(arr: unknown): SpecialGroup[] {
  const seen = new Set<string>(), out: SpecialGroup[] = [];
  (Array.isArray(arr) ? arr : []).forEach((s: any) => {
    if (!s || typeof s !== 'object') return;
    const name = String(s.name || '').trim();
    if (!name) return;
    const k = nameKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    const items = Array.isArray(s.items) ? cleanStringList(s.items) : [name];
    out.push({
      id: s.id || uid(),
      name,
      items,
      responsibleIds: Array.isArray(s.responsibleIds)
        ? s.responsibleIds.filter((x: unknown) => typeof x === 'string') : [],
      requireSample: !!s.requireSample,
    });
  });
  return out;
}

export function cleanPresetGroups(arr: unknown): PresetGroup[] {
  const seen = new Set<string>(), out: PresetGroup[] = [];
  (Array.isArray(arr) ? arr : []).forEach((it: any) => {
    if (!it || typeof it !== 'object') return;
    const name = String(it.name || '').trim();
    if (!name) return;
    const k = nameKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    out.push({ id: it.id || uid(), name, items: cleanStringList(it.items) });
  });
  return out;
}

export function cleanGlobalPresets(arr: unknown): GlobalPreset[] {
  const seen = new Set<string>(), out: GlobalPreset[] = [];
  (Array.isArray(arr) ? arr : []).forEach((it: any) => {
    if (!it || typeof it !== 'object') return;
    const name = String(it.name || '').trim();
    if (!name) return;
    const k = nameKey(name);
    if (seen.has(k)) return;
    seen.add(k);
    let productIds: string[] | null;
    if (it.scope === 'all') productIds = null;
    else if (Array.isArray(it.productIds))
      productIds = it.productIds.filter((x: unknown) => typeof x === 'string' && x);
    else productIds = null;
    out.push({ id: it.id || uid(), name, productIds });
  });
  return out;
}

export function parseGroupBulk(raw: unknown): string[] {
  const s = String(raw ?? '').trim();
  if (!s) return [];
  if (/^\d+$/.test(s)) {
    const n = Math.min(parseInt(s, 10), 100);
    return Array.from({ length: n }, (_, i) => `分组${i + 1}`);
  }
  const m = s.match(/^(\d+)\s*[-~—到至]\s*(\d+)$/);
  if (m) {
    let a = parseInt(m[1], 10), b = parseInt(m[2], 10);
    if (a > b) { const t = a; a = b; b = t; }
    if (b - a > 99) b = a + 99;
    return Array.from({ length: b - a + 1 }, (_, i) => `分组${a + i}`);
  }
  if (/^\d+(?:\s*[,，]\s*\d+)*$/.test(s)) {
    return s.split(/[,，]/).map(x => `分组${parseInt(x.trim(), 10)}`).slice(0, 100);
  }
  return [s];
}

export function escapeHtml(s: unknown): string {
  return String(s ?? '')
    .replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;').replace(/'/g, '&#39;');
}
