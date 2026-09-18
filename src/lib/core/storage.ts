import type { Product, DataPresets, Settings, GlobalPreset } from './schema';
import { SCHEMA_VERSION, safeParse } from './schema-helper';

export const ROOT_KEY = 'category_counts_v5';
export const INDEX_KEY = ROOT_KEY + '__index';
export const PRODUCT_PREFIX = ROOT_KEY + '__p_';
export const BACKUP_KEY = ROOT_KEY + '__bak';
export const AUTO_BACKUP_KEY = ROOT_KEY + '__autobak';
export const DRAFT_KEY = ROOT_KEY + '__draft';
export const LOG_KEY = ROOT_KEY + '__logs';
export const THEME_KEY = 'theme_mode_v1';
export const WORK_TIME_KEY = 'work_time_v1';
export const API_KEY_KEY = 'ocr_api_key_v1';

export interface Payload {
  products: Product[];
  globalPresets: GlobalPreset[];
  mergeSelectedIds: string[];
  currentProductId: string;
  dataPresets: DataPresets;
  settings: Settings;
  savedAt?: number;
}

export function buildIndex(p: Payload) {
  return {
    version: SCHEMA_VERSION,
    savedAt: Date.now(),
    currentProductId: p.currentProductId,
    productIds: p.products.map(x => x.id),
    globalPresets: p.globalPresets,
    mergeSelectedIds: p.mergeSelectedIds,
    dataPresets: p.dataPresets,
    settings: p.settings,
  };
}

export function savePayload(p: Payload): { ok: boolean; quota?: boolean } {
  try {
    const indexStr = JSON.stringify(buildIndex(p));
    try {
      const prev = localStorage.getItem(INDEX_KEY);
      if (prev && prev !== indexStr) localStorage.setItem(BACKUP_KEY, prev);
    } catch { /* ignore */ }
    localStorage.setItem(INDEX_KEY, indexStr);
    for (const prod of p.products) {
      localStorage.setItem(PRODUCT_PREFIX + prod.id, JSON.stringify(prod));
    }
    const liveIds = new Set(p.products.map(x => x.id));
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(PRODUCT_PREFIX)) {
        const pid = k.slice(PRODUCT_PREFIX.length);
        if (!liveIds.has(pid)) stale.push(k);
      }
    }
    stale.forEach(k => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
    return { ok: true };
  } catch (e: any) {
    const quota = e && (e.name === 'QuotaExceededError' || e.name === 'NS_ERROR_DOM_QUOTA_REACHED' || e.code === 22);
    if (quota) {
      try { localStorage.removeItem(BACKUP_KEY); } catch { /* ignore */ }
      try { localStorage.removeItem(AUTO_BACKUP_KEY); } catch { /* ignore */ }
    }
    return { ok: false, quota };
  }
}

export function loadPayload(): Payload | null {
  let raw: string | null = null;
  try { raw = localStorage.getItem(INDEX_KEY); } catch { /* ignore */ }
  if (raw) {
    const idx: any = safeParse(raw);
    if (idx && idx.version === SCHEMA_VERSION && Array.isArray(idx.productIds)) {
      const products: Product[] = [];
      for (const pid of idx.productIds) {
        try {
          const s = localStorage.getItem(PRODUCT_PREFIX + pid);
          if (!s) continue;
          const p = safeParse(s);
          if (p) products.push(p);
        } catch { /* ignore */ }
      }
      return { ...idx, products } as Payload;
    }
  }
  try { raw = localStorage.getItem(BACKUP_KEY); } catch { /* ignore */ }
  if (raw) {
    const bak: any = safeParse(raw);
    if (bak && bak.version === SCHEMA_VERSION && Array.isArray(bak.productIds)) {
      const products: Product[] = [];
      for (const pid of bak.productIds) {
        try {
          const s = localStorage.getItem(PRODUCT_PREFIX + pid);
          if (!s) continue;
          const p = safeParse(s);
          if (p) products.push(p);
        } catch { /* ignore */ }
      }
      return { ...bak, products } as Payload;
    }
  }
  return null;
}

export function saveDraft(p: Payload): void {
  try { localStorage.setItem(DRAFT_KEY, JSON.stringify({ ...p, at: Date.now() })); }
  catch { /* ignore */ }
}

export function readDraft(): (Payload & { at: number }) | null {
  try {
    const raw = localStorage.getItem(DRAFT_KEY);
    if (!raw) return null;
    return safeParse(raw);
  } catch { return null; }
}

export function clearDraft(): void {
  try { localStorage.removeItem(DRAFT_KEY); } catch { /* ignore */ }
}

export function saveAutoBackup(p: Payload): void {
  try {
    const payload = JSON.stringify({ at: Date.now(), version: SCHEMA_VERSION, ...p });
    let list: string[] = [];
    try {
      const raw = localStorage.getItem(AUTO_BACKUP_KEY);
      const parsed = raw ? JSON.parse(raw) : [];
      list = Array.isArray(parsed) ? parsed : [];
    } catch { list = []; }
    list.unshift(payload);
    while (list.length > 3) list.pop();
    let saved = false;
    while (list.length && !saved) {
      try { localStorage.setItem(AUTO_BACKUP_KEY, JSON.stringify(list)); saved = true; }
      catch { list.pop(); }
    }
  } catch { /* ignore */ }
}

export function readAutoBackups(): { index: number; at: number; summary: string }[] {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    return list
      .map((s, i) => {
        const d = safeParse(s);
        if (!d) return null;
        return { index: i, at: d.at || 0, summary: `${(d.products || []).length} 个产品` };
      })
      .filter((x): x is { index: number; at: number; summary: string } => x !== null);
  } catch { return []; }
}

export function readAutoBackupAt(index: number): Payload | null {
  try {
    const raw = localStorage.getItem(AUTO_BACKUP_KEY);
    const list: string[] = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(list) || !list[index]) return null;
    return safeParse(list[index]);
  } catch { return null; }
}
