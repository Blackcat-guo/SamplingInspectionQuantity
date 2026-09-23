// src/lib/stores/app.svelte.ts
import {
  SCHEMA_VERSION, AUTO_GROUP_NAME,
  uid, nameKey, clampInt, clonePlain, sortNatural, ncmp,
  DEFAULT_TPL, LEGACY_TPLS,
  normalizeProduct, cleanStringList, cleanNumberList,
  cleanCustomers, cleanResponsiblePersons, cleanShortcuts,
  cleanSpecialGroups, cleanPresetGroups, cleanGlobalPresets,
  parseGroupBulk, escapeHtml,
} from '../core/schema';
import type {
  Product, Group, DataPresets, Settings, Customer, Responsible,
  SpecialGroup, PresetGroup, GlobalPreset, Shortcut,
} from '../core/schema';
import { calcSampling } from '../core/sampling';
import { createHistory, CMD } from '../core/history.svelte';
import * as storage from '../core/storage';
import { renderTemplate } from '../core/template';

/* ============================================================
   状态
   ============================================================ */
export interface ToastItem {
  id: number; msg: string; type: 'success' | 'error' | 'info';
  action?: { label: string; fn: () => void } | null;
  timer?: ReturnType<typeof setTimeout>;
}

const defaultSettings = (): Settings => ({
  summaryTemplate: DEFAULT_TPL,
  showVoice: true, showImageOcr: true, showRecognizeTools: true,
  experienceLevel: 'auto', animationLevel: 'normal',
  showZeroQtyItems: true, mergeMultiProductSummary: true,
  confirmBeforeDelete: true, compactMode: false, fontSize: 'standard',
  autoBackup: true, showShortcutHints: true, showMainTips: true, showTopNavText: true,
  bulkAddConfirmThreshold: 5, tempHandling: '',
  responsiblePersons: [], collapsedGroups: [],
  comboVisibleItems: 4,
});

const defaultDataPresets = (): DataPresets => ({
  suppliers: [], customers: [], incomingQtyPresets: [], processes: [],
  tempHandlings: [], tempHandlingShortcuts: [], responsiblePersons: [],
  specialGroups: [], presetGroups: [],
});

export const app = $state({
  products: [] as Product[],
  currentProductId: '',
  globalPresets: [] as GlobalPreset[],
  mergeSelectedIds: [] as string[],
  dataPresets: defaultDataPresets(),
  settings: defaultSettings(),
  themeMode: 'auto' as 'auto' | 'light' | 'dark',
  toasts: [] as ToastItem[],
  sidebarOpen: false,
  operationLogs: [] as { id: string; text: string; at: number }[],
  lastSavedAt: 0,
});

const history = createHistory();

/* ============================================================
   自定义确认弹窗
   ============================================================ */
export interface ConfirmOptions {
  title: string; message: string;
  confirmText?: string; cancelText?: string;
  danger?: boolean; showDontAsk?: boolean;
  dontAskKey?: 'confirmBeforeDelete';
}

export const confirmState = $state<{
  show: boolean;
  options: ConfirmOptions;
  _resolve: ((v: boolean) => void) | null;
}>({ show: false, options: { title: '', message: '' }, _resolve: null });

export function askConfirm(options: ConfirmOptions): Promise<boolean> {
  if (options.showDontAsk && options.dontAskKey) {
    const cur = (app.settings as any)[options.dontAskKey];
    if (cur === false) return Promise.resolve(true);
  }
  return new Promise((resolve) => {
    confirmState.options = options;
    confirmState._resolve = resolve;
    confirmState.show = true;
  });
}

export function resolveConfirm(v: boolean, dontAskAgain = false): void {
  if (dontAskAgain && confirmState.options.dontAskKey) {
    (app.settings as any)[confirmState.options.dontAskKey] = false;
    scheduleSave();
  }
  confirmState.show = false;
  const r = confirmState._resolve;
  confirmState._resolve = null;
  if (r) r(v);
}

/* ============================================================
   保存节流
   ============================================================ */
let saveTimer: ReturnType<typeof setTimeout> | null = null;
let draftTimer: ReturnType<typeof setInterval> | null = null;
let autoBackupTimer: ReturnType<typeof setTimeout> | null = null;
let draftDirty = false;
let lastAutoBackupAt = 0;
const AUTO_BACKUP_MIN_INTERVAL_MS = 30_000;

function buildPayload() {
  return {
    products: app.products, globalPresets: app.globalPresets,
    mergeSelectedIds: app.mergeSelectedIds, currentProductId: app.currentProductId,
    dataPresets: app.dataPresets, settings: app.settings, savedAt: Date.now(),
  };
}

export function scheduleSave(): void {
  draftDirty = true;
  if (saveTimer) clearTimeout(saveTimer);
  saveTimer = setTimeout(() => { saveTimer = null; flushSave(); }, 500);
}

export function flushSave(): void {
  if (saveTimer) { clearTimeout(saveTimer); saveTimer = null; }
  const payload = buildPayload();
  const res = storage.savePayload(payload as any);
  if (res.ok) app.lastSavedAt = Date.now();
  if (!res.ok && res.quota) pushToast('存储空间紧张，已清理滚动备份', 'error', 3200);
  if (app.settings.autoBackup) {
    const now = Date.now();
    if (now - lastAutoBackupAt >= AUTO_BACKUP_MIN_INTERVAL_MS) {
      lastAutoBackupAt = now;
      storage.saveAutoBackup(payload as any);
    }
  }
}

/* ============================================================
   Toast / Log
   ============================================================ */
let toastSeq = 0;
export function pushToast(
  msg: string, type: 'success' | 'error' | 'info' = 'success',
  duration = 2200, action: ToastItem['action'] = null,
): number {
  const id = ++toastSeq;
  const item: ToastItem = { id, msg, type, action, timer: undefined };
  app.toasts.push(item);
  item.timer = setTimeout(() => dismissToast(id), duration);
  if (app.toasts.length > 5) {
    const removed = app.toasts.splice(0, app.toasts.length - 5);
    removed.forEach((t) => t.timer && clearTimeout(t.timer));
  }
  return id;
}

export function dismissToast(id: number): void {
  const i = app.toasts.findIndex((t) => t.id === id);
  if (i >= 0) {
    const t = app.toasts[i];
    if (t.timer) clearTimeout(t.timer);
    app.toasts.splice(i, 1);
  }
}

export function runToastAction(t: ToastItem): void {
  if (t.action?.fn) { try { t.action.fn(); } catch { /* ignore */ } }
  dismissToast(t.id);
}

export function logOperation(text: string): void {
  if (!text || typeof text !== 'string') return;
  app.operationLogs.unshift({ id: uid(), text: text.slice(0, 200), at: Date.now() });
  if (app.operationLogs.length > 50) app.operationLogs.length = 50;
  scheduleSave();
}

export function clearOperationLogs(): void {
  app.operationLogs.length = 0;
  pushToast('操作日志已清空');
  scheduleSave();
}

/* ============================================================
   计算属性
   ============================================================ */
export function currentProduct(): Product | null {
  return app.products.find((p) => p.id === app.currentProductId) || app.products[0] || null;
}
export function currentGroups(): Group[] { return currentProduct()?.groups ?? []; }
export function currentPresets(): string[] { return currentProduct()?.presets ?? []; }
export function normalResponsibles(): Responsible[] {
  return app.dataPresets.responsiblePersons.filter((r) => r.kind !== 'special');
}
export function specialResponsibles(): Responsible[] {
  return app.dataPresets.responsiblePersons.filter((r) => r.kind === 'special');
}

/* ============================================================
   体验等级
   ============================================================ */
export function autoLevel(): 'standard' | 'compat' {
  try {
    const cores = (navigator as any).hardwareConcurrency ?? 4;
    const mem = (navigator as any).deviceMemory ?? 4;
    return cores < 4 || mem < 4 ? 'compat' : 'standard';
  } catch { return 'standard'; }
}
export function effectiveLevel(): 'auto' | 'elegant' | 'standard' | 'compat' {
  const lv = app.settings.experienceLevel;
  if (lv === 'auto') return autoLevel();
  return lv;
}

/* ============================================================
   核心操作 · 分类数量
   ============================================================ */
export function realGroupIndex(g: Group): number { return currentGroups().indexOf(g); }

export function syncSamplingToGroups(product: Product): void {
  if (!product) return;
  const s = product.inspectionQty || calcSampling(product.incomingQty || 0);
  product.groups.forEach((g) => { if (g.totalIsAuto !== false) g.total = s; });
}

export function setQty(g: Group, itemIndex: number, qty: number): void {
  const p = currentProduct();
  if (!p) return;
  const it = g.items[itemIndex];
  if (!it) return;
  const n = clampInt(qty, 0);
  if (it.qty === n) return;
  const from = it.qty;
  it.qty = n;
  history.push({ t: CMD.QTY, pid: p.id, gid: g.id, key: nameKey(it.name), from, to: n, label: '修改分类数量' });
  scheduleSave();
}

export function commitQtyDraft(g: Group, itemName: string, raw: string): void {
  const p = currentProduct();
  if (!p) return;
  const item = g.items.find((x) => nameKey(x.name) === nameKey(itemName));
  if (!item) return;
  const v = Math.max(0, parseInt(raw, 10) || 0);
  if (item.qty === v) return;
  const from = item.qty;
  item.qty = v;
  history.push({ t: CMD.QTY, pid: p.id, gid: g.id, key: nameKey(item.name), from, to: v, label: '修改分类数量' });
  scheduleSave();
}

export function addItem(g: Group, name: string): boolean {
  const p = currentProduct();
  if (!p || !name.trim()) return false;
  const k = nameKey(name);
  if (g.items.some((it) => nameKey(it.name) === k)) return false;
  const used = p.groups.some((x) => x.id !== g.id && x.items.some((it) => nameKey(it.name) === k));
  if (used) {
    pushToast(`分类「${name}」已存在于本产品的其他分组`, 'error');
    return false;
  }
  history.pushSnapshot(app.products, p.id);
  g.items.push({ name: name.trim(), qty: 0 });
  scheduleSave();
  return true;
}

export function toggleItemByName(g: Group, name: string): void {
  const k = nameKey(name);
  const idx = g.items.findIndex((it) => nameKey(it.name) === k);
  if (idx >= 0) {
    const p = currentProduct();
    if (!p) return;
    history.pushSnapshot(app.products, p.id);
    g.items.splice(idx, 1);
    scheduleSave();
  } else addItem(g, name);
}

export function removeItem(g: Group, index: number): void {
  const p = currentProduct();
  if (!p) return;
  const item = g.items[index];
  if (!item) return;
  history.pushSnapshot(app.products, p.id);
  g.items.splice(index, 1);
  scheduleSave();
}

export function setGroupTotal(g: Group, total: number): void {
  const p = currentProduct();
  if (!p) return;
  const n = clampInt(total, 0);
  const from = g.total;
  const fromAuto = g.totalIsAuto !== false;
  if (from === n && !fromAuto) return;
  g.total = n;
  g.totalIsAuto = false;
  history.push({ t: CMD.TOTAL, pid: p.id, gid: g.id, from, to: n, fromAuto, toAuto: false, label: '修改分组总数量' });
  scheduleSave();
}

/* ============================================================
   来料数量 & 抽检数量
   ============================================================ */
export function setIncomingQty(qty: number): void {
  const p = currentProduct();
  if (!p) return;
  const n = clampInt(qty, 0);
  const from = p.incomingQty;
  if (from === n) return;
  history.pushSnapshot(app.products, p.id);
  p.incomingQty = n;
  const aql = calcSampling(n);
  p.inspectionQty = aql;
  p.groups.forEach((g) => { g.total = aql; g.totalIsAuto = true; });
  scheduleSave();
}

export function setInspectionQty(qty: number): void {
  const p = currentProduct();
  if (!p) return;
  const n = clampInt(qty, 0);
  if (p.inspectionQty === n) return;
  history.pushSnapshot(app.products, p.id);
  p.inspectionQty = n;
  p.groups.forEach((g) => { g.total = n; g.totalIsAuto = false; });
  scheduleSave();
}

/* ============================================================
   产品字段修改
   ============================================================ */
export function setProductField(field: string, value: string): void {
  const p = currentProduct();
  if (!p) return;
  const from = (p as any)[field];
  if (from === value) return;
  (p as any)[field] = value;
  history.push({ t: CMD.FIELD, pid: p.id, field, from, to: value, label: '修改' + field });
  scheduleSave();
  sanitizeMergeSelection();
}

export function setProductSupplier(pid: string, value: string): void {
  const p = app.products.find((x) => x.id === pid);
  if (!p || p.supplier === value) return;
  p.supplier = value;
  scheduleSave();
  sanitizeMergeSelection();
}
export function setProductCustomer(pid: string, value: string): void {
  const p = app.products.find((x) => x.id === pid);
  if (!p || p.customer === value) return;
  p.customer = value;
  scheduleSave();
  sanitizeMergeSelection();
}

export function toggleSample(on: boolean): void {
  const p = currentProduct();
  if (!p) return;
  const to = !!on, from = p.isSample;
  if (from === to) return;
  p.isSample = to;
  history.push({ t: CMD.FIELD, pid: p.id, field: 'isSample', from, to, label: '切换样品' });
  scheduleSave();
}

/* ============================================================
   分组操作
   ============================================================ */
export function addGroup(raw: string): void {
  const p = currentProduct();
  if (!p || !raw.trim()) return;
  const names = parseGroupBulk(raw);
  const initTotal = p.inspectionQty || calcSampling(p.incomingQty || 0);
  const isNumeric = names.length > 1 || /^分组\d+$/.test(names[0] || '');
  history.pushSnapshot(app.products, p.id);
  if (isNumeric && names.length) {
    const existing = new Set(p.groups.map((g) => g.name));
    let added = 0;
    names.forEach((name) => {
      if (existing.has(name)) return;
      p.groups.push({ id: uid(), name, total: initTotal, items: [] });
      existing.add(name);
      added++;
    });
    if (added === 0) { history.popPast(); return; }
    logOperation(`批量添加 ${added} 个分组`);
  } else {
    const name = names[0] || raw.trim();
    if (p.groups.some((g) => g.name === name)) { history.popPast(); return; }
    p.groups.push({ id: uid(), name, total: initTotal, items: [] });
    logOperation(`添加分组「${name}」`);
  }
  scheduleSave();
}

export function collapseAllGroups(): void {
  const p = currentProduct();
  if (!p || !p.groups.length) return;
  const arr = new Set(app.settings.collapsedGroups || []);
  p.groups.forEach((g) => arr.add(g.id));
  app.settings.collapsedGroups = Array.from(arr);
  scheduleSave();
}

export function expandAllGroups(): void {
  const p = currentProduct();
  if (!p || !p.groups.length) return;
  const ids = new Set(p.groups.map((g) => g.id));
  app.settings.collapsedGroups = (app.settings.collapsedGroups || []).filter((id) => !ids.has(id));
  scheduleSave();
}

export function addStandardGroups(): void {
  const p = currentProduct();
  if (!p) return;
  const standards = ['严重', '主要', '次要'];
  const missing = standards.filter((n) => !p.groups.some((g) => g.name === n));
  if (!missing.length) { pushToast('标准分组已全部存在', 'error'); return; }
  history.pushSnapshot(app.products, p.id);
  const initTotal = p.inspectionQty || calcSampling(p.incomingQty || 0);
  missing.forEach((name) => {
    p.groups.push({ id: uid(), name, total: initTotal, totalIsAuto: true, items: [] });
  });
  scheduleSave();
  pushToast(`已添加标准分组：${missing.join('、')}`);
}

export function removeGroup(index: number): void {
  const p = currentProduct();
  if (!p) return;
  const g = p.groups[index];
  if (!g) return;
  const raw = clonePlain(g);
  history.pushSnapshot(app.products, p.id);
  p.groups.splice(index, 1);
  scheduleSave();
  pushToast(`已删除分组「${g.name}」`, 'success', 5000, {
    label: '撤回',
    fn: () => {
      const prod = currentProduct();
      if (!prod) return;
      const at = Math.min(index, prod.groups.length);
      prod.groups.splice(at, 0, raw);
      scheduleSave();
    },
  });
}

export function resetGroup(index: number): void {
  const p = currentProduct();
  if (!p) return;
  const g = p.groups[index];
  if (!g) return;
  if (!confirm(`确定重置分组「${g.name || '未命名'}」吗？（各分类数量将清零）`)) return;
  history.pushSnapshot(app.products, p.id);
  g.total = p.inspectionQty || 0;
  g.totalIsAuto = true;
  g.items.forEach((it) => { it.qty = 0; });
  scheduleSave();
}

export function groupSum(g: Group): number { return g.items.reduce((s, it) => s + it.qty, 0); }

export function groupRate(g: Group): string {
  const p = currentProduct();
  if (!p) return '--';
  const sum = g.items.reduce((s, it) => s + (it.qty || 0), 0);
  const denom = p.inspectionQty > 0 ? p.inspectionQty : 0;
  if (!denom) return '--';
  return Math.round((sum / denom) * 100) + '%';
}

/* ============================================================
   撤回 / 恢复
   ============================================================ */
let applying = false;
export function undo(): void {
  if (applying) return;
  applying = true;
  try {
    const e = history.popPast();
    if (!e) return;
    applyCmd(e.cmd, 'undo');
    history.commitToFuture(e);
    reconcile();
    pushToast('已撤回：' + (e.cmd.label || '上一步操作'));
  } finally { queueMicrotask(() => { applying = false; }); }
}
export function redo(): void {
  if (applying) return;
  applying = true;
  try {
    const e = history.popFuture();
    if (!e) return;
    applyCmd(e.cmd, 'do');
    history.commitToPast(e);
    reconcile();
    pushToast('已恢复：' + (e.cmd.label || '下一步操作'));
  } finally { queueMicrotask(() => { applying = false; }); }
}
export const canUndo = () => history.canUndo;
export const canRedo = () => history.canRedo;

function applyCmd(cmd: any, dir: 'do' | 'undo'): void {
  if (cmd.t === CMD.SNAP) {
    if (cmd.pid === '__all__') {
      const restored = JSON.parse(cmd.data);
      app.products = restored.map(normalizeProduct);
      if (cmd.cur && app.products.some((p: Product) => p.id === cmd.cur)) app.currentProductId = cmd.cur;
      else if (!app.products.some((p) => p.id === app.currentProductId))
        app.currentProductId = app.products[0]?.id ?? '';
    } else {
      const idx = app.products.findIndex((p) => p.id === cmd.pid);
      if (idx >= 0) {
        const data = JSON.parse(cmd.data);
        data.id = cmd.pid;
        app.products[idx] = normalizeProduct(data);
      }
    }
    return;
  }
  if (cmd.t === CMD.GLOBAL) {
    const data = JSON.parse(cmd.data);
    app.products = (data.products || []).map(normalizeProduct);
    app.dataPresets = {
      suppliers: cleanStringList(data.dataPresets?.suppliers),
      customers: cleanCustomers(data.dataPresets?.customers),
      incomingQtyPresets: cleanNumberList(data.dataPresets?.incomingQtyPresets),
      processes: cleanStringList(data.dataPresets?.processes),
      tempHandlings: cleanStringList(data.dataPresets?.tempHandlings),
      tempHandlingShortcuts: cleanShortcuts(data.dataPresets?.tempHandlingShortcuts),
      responsiblePersons: cleanResponsiblePersons(data.dataPresets?.responsiblePersons),
      specialGroups: cleanSpecialGroups(data.dataPresets?.specialGroups),
      presetGroups: cleanPresetGroups(data.dataPresets?.presetGroups),
    };
    app.globalPresets = cleanGlobalPresets(data.globalPresets || []);
    Object.assign(app.settings, data.settings || {});
    return;
  }
  const p = app.products.find((x) => x.id === cmd.pid);
  if (!p) return;
  if (cmd.t === CMD.QTY) {
    const g = p.groups.find((x) => x.id === cmd.gid);
    const it = g?.items.find((x) => nameKey(x.name) === cmd.key);
    if (it) it.qty = dir === 'do' ? cmd.to : cmd.from;
  } else if (cmd.t === CMD.TOTAL) {
    const g = p.groups.find((x) => x.id === cmd.gid);
    if (g) {
      const auto = dir === 'do' ? cmd.toAuto : cmd.fromAuto;
      g.total = dir === 'do' ? cmd.to : cmd.from;
      g.totalIsAuto = auto === false ? false : undefined;
    }
  } else if (cmd.t === CMD.INC) p.incomingQty = dir === 'do' ? cmd.to : cmd.from;
  else if (cmd.t === CMD.FIELD) (p as any)[cmd.field!] = dir === 'do' ? cmd.to : cmd.from;
  else if (cmd.t === CMD.NAME) {
    const v = dir === 'do' ? cmd.to : cmd.from;
    if (cmd.kind === 'product') p.name = v;
    else if (cmd.kind === 'group' && cmd.gid) {
      const g = p.groups.find((x) => x.id === cmd.gid);
      if (g) g.name = v;
    } else if (cmd.kind === 'item' && cmd.gid && cmd.key) {
      const g = p.groups.find((x) => x.id === cmd.gid);
      const it = g?.items.find((x) => nameKey(x.name) === cmd.key);
      if (it) it.name = v;
    } else if (cmd.kind === 'preset' && cmd.key) {
      const i = p.presets.findIndex((x) => nameKey(x) === cmd.key);
      if (i >= 0) p.presets[i] = v;
    }
  }
  scheduleSave();
}

function reconcile(): void {
  if (!app.products.some((p) => p.id === app.currentProductId))
    app.currentProductId = app.products[0]?.id ?? '';
  sanitizeMergeSelection();
  sanitizeGlobalPresetProducts();
}

/* ============================================================
   产品
   ============================================================ */
export function switchProduct(id: string): void {
  if (app.currentProductId === id) { app.sidebarOpen = false; return; }
  app.currentProductId = id;
  app.sidebarOpen = false;
}

export function addProduct(name: string, opts: Partial<Product> = {}): Product {
  const p = normalizeProduct({ name, ...opts });
  app.products.push(p);
  scheduleSave();
  return p;
}

export function duplicateProduct(id: string): void {
  const p = app.products.find((x) => x.id === id);
  if (!p) return;
  history.pushAllSnapshot(app.products, app.currentProductId, '复制产品');
  const copy = clonePlain(p);
  copy.id = uid();
  const base = (p.name || '产品') + '-副本';
  let name = base, n = 2;
  while (app.products.some((x) => x.name === name)) { name = base + n; n++; }
  copy.name = name;
  copy.groups = copy.groups.map((g) => ({ ...g, id: uid(), items: g.items.map((it) => ({ ...it })) }));
  app.products.push(copy);
  app.currentProductId = copy.id;
  scheduleSave();
  pushToast(`已复制为「${name}」`);
}

export function removeProduct(id: string): void {
  const idx = app.products.findIndex((x) => x.id === id);
  if (idx < 0) return;
  const p = app.products[idx];
  if (app.settings.confirmBeforeDelete) {
    if (!confirm(`确定删除产品「${p.name}」吗？\n\n此操作可通过“撤回”恢复。`)) return;
  }
  const raw = clonePlain(p);
  history.pushAllSnapshot(app.products, app.currentProductId, '删除产品');
  app.products.splice(idx, 1);
  app.globalPresets.forEach((gp) => {
    if (Array.isArray(gp.productIds)) gp.productIds = gp.productIds.filter((x) => x !== id);
  });
  app.mergeSelectedIds = app.mergeSelectedIds.filter((x) => x !== id);
  if (app.currentProductId === id) app.currentProductId = app.products[0]?.id ?? '';
  scheduleSave();
  pushToast(`已删除产品「${p.name}」`, 'success', 5000, {
    label: '撤回',
    fn: () => {
      const at = Math.min(idx, app.products.length);
      app.products.splice(at, 0, normalizeProduct(raw));
      app.currentProductId = raw.id;
      scheduleSave();
    },
  });
}

/* ============================================================
   汇总选择
   ============================================================ */
export function sanitizeMergeSelection(): void {
  const out: string[] = [];
  for (const id of app.mergeSelectedIds) {
    const p = app.products.find((x) => x.id === id);
    if (!p || !(p.supplier || '').trim()) continue;
    if (!out.length) { out.push(id); continue; }
    const f = app.products.find((x) => x.id === out[0]);
    if (!f) { out.push(id); continue; }
    if ((p.supplier || '').trim() === (f.supplier || '').trim() &&
        (p.customer || '').trim() === (f.customer || '').trim()) out.push(id);
  }
  if (out.length !== app.mergeSelectedIds.length) app.mergeSelectedIds = out;
}

export function sanitizeGlobalPresetProducts(): void {
  const live = new Set(app.products.map((p) => p.id));
  app.globalPresets.forEach((gp) => {
    if (Array.isArray(gp.productIds)) {
      const f = gp.productIds.filter((id) => live.has(id));
      if (f.length !== gp.productIds.length) gp.productIds = f;
    }
  });
}

export function cleanupOrphanProductBindings(): void {
  const custNames = new Set(app.dataPresets.customers.map((c) => c.name));
  const supNames = new Set(app.dataPresets.suppliers);
  app.products.forEach((p) => {
    if (p.customer && !custNames.has(p.customer)) p.customer = '';
    if (p.supplier && !supNames.has(p.supplier)) p.supplier = '';
  });
}

export function selectAllSameCombination(): void {
  const p = currentProduct();
  if (!p || !p.supplier.trim()) return;
  const sup = p.supplier, cus = p.customer || '';
  app.mergeSelectedIds = app.products
    .filter((x) => (x.supplier || '') === sup && (x.customer || '') === cus && x.supplier.trim())
    .map((x) => x.id);
}
export function clearMergeSelection(): void { app.mergeSelectedIds = []; }
export function toggleMergeSelect(id: string): void {
  const p = app.products.find((x) => x.id === id);
  if (!p || !canSelectProduct(p)) return;
  const i = app.mergeSelectedIds.indexOf(id);
  if (i >= 0) app.mergeSelectedIds.splice(i, 1);
  else app.mergeSelectedIds.push(id);
}
export function canSelectProduct(p: Product): boolean {
  if (!p.supplier || !p.supplier.trim()) return false;
  const list = app.products.filter((x) => app.mergeSelectedIds.includes(x.id));
  if (!list.length) return true;
  const first = list[0];
  return (p.supplier || '') === (first.supplier || '') && (p.customer || '') === (first.customer || '');
}
export function isMergeSelected(id: string): boolean { return app.mergeSelectedIds.includes(id); }
export function mergedProducts(): Product[] {
  return app.products.filter((p) => app.mergeSelectedIds.includes(p.id));
}
export function groupedProducts(): { supplier: string; customer: string; list: Product[] }[] {
  const map = new Map<string, { supplier: string; customer: string; list: Product[] }>();
  app.products.forEach((p) => {
    const sup = (p.supplier || '').trim();
    const cus = (p.customer || '').trim();
    const key = sup + '\u0000' + cus;
    if (!map.has(key)) map.set(key, { supplier: sup, customer: cus, list: [] });
    map.get(key)!.list.push(p);
  });
  const out = Array.from(map.values());
  out.forEach((g) => g.list.sort((a, b) => ncmp(a.name, b.name)));
  out.sort((a, b) => {
    const s = ncmp(a.supplier, b.supplier);
    if (s !== 0) return s;
    const ha = a.customer ? 0 : 1, hb = b.customer ? 0 : 1;
    if (ha !== hb) return ha - hb;
    return ncmp(a.customer, b.customer);
  });
  return out;
}

/* ============================================================
   输出文本
   ============================================================ */
export function buildOutputText(withLabels: boolean): string {
  const p = currentProduct();
  if (!p) return '';
  const showZero = app.settings.showZeroQtyItems !== false;
  const denom = p.inspectionQty || 0;
  const parts: string[] = [];
  p.groups.forEach((g) => {
    const items = g.items.filter((it) => showZero || it.qty > 0).map((it) => `${it.name}${it.qty}PCS`);
    if (!items.length) return;
    const sum = g.items.reduce((s, it) => s + it.qty, 0);
    const rate = denom > 0 ? `不良率${Math.round((sum / denom) * 100)}%` : sum > 0 ? '不良率--' : '不良率0%';
    parts.push(withLabels ? `${g.name}：${items.join('，')}，${rate}` : `${items.join('，')}，${rate}`);
  });
  const body = parts.join('，');
  const pre = (p.prefix || '').trim();
  const suf = (p.suffix || '').trim();
  // ★ v3.7.5 B1：直接用产品级 inspectionQty，避免分组 total 重复累加
  const totals = p.inspectionQty > 0 ? [p.inspectionQty] : [];
  const samplingText = buildSamplingLineFromTotals(totals, withLabels, p.incomingQty || 0);
  if (!body && !pre && !suf && !samplingText)
    return withLabels ? '暂无分类或数量，请先添加分组分类' : '';
  if (withLabels) {
    const lines: string[] = [];
    if (pre) lines.push(pre);
    if (samplingText) lines.push(samplingText);
    if (body) lines.push(body);
    if (suf) lines.push(suf);
    return lines.join('\n');
  }
  const segs: string[] = [];
  if (pre) segs.push(pre);
  if (samplingText) segs.push(samplingText.replace(/,$/, ''));
  if (body) segs.push(body);
  if (suf) segs.push(suf);
  return segs.join('，');
}

export function buildSamplingLineFromTotals(totals: number[], withLabels: boolean, incomingQty = 0): string {
  const valid = totals.filter((t) => t > 0);
  if (!valid.length) return '';
  const unique = [...new Set(valid)];
  const sum = valid.reduce((a, b) => a + b, 0);
  const isFull = incomingQty > 0 && sum === incomingQty;
  let text = '';
  if (unique.length === 1) {
    const qty = unique[0];
    if (isFull) text = withLabels ? `全检数量：${qty}PCS` : `全检${qty}PCS`;
    else text = withLabels ? `抽检数量：${qty}PCS` : `抽检${qty}PCS`;
  } else {
    if (isFull) text = withLabels ? `全检数量：${sum}PCS` : `全检${sum}PCS`;
    else text = withLabels ? `抽检数量：${sum}PCS` : `抽检${sum}PCS`;
  }
  return text + (text ? ',' : '');
}

// ★ v3.7.5 B1：直接返回产品级 inspectionQty
export function getProductSamplingDisplay(p: Product): number {
  return p.inspectionQty || 0;
}

function computeMergedSummary(list: Product[], shouldMerge: boolean, withLabels: boolean) {
  if (!list.length) return { samplingLine: '', summaryText: '' };
  const showZero = app.settings.showZeroQtyItems !== false;
  const denom = list[0]?.inspectionQty || 0;
  // ★ v3.7.5 B1：改用产品级 inspectionQty，避免分组 total 重复累加（13+15→127 修复）
  const allTotals = list.map((p) => p.inspectionQty || 0).filter((t) => t > 0);
  const uniqueTotals = [...new Set(allTotals)];
  const sameSampling = uniqueTotals.length <= 1;
  const isSingle = list.length === 1;
  const totalIncoming = list.reduce((s, p) => s + (p.incomingQty || 0), 0);
  const totalSampling = allTotals.reduce((a, b) => a + b, 0);
  const isFull = totalIncoming > 0 && totalSampling === totalIncoming;
  let samplingLine = '', summaryText = '';

  if (shouldMerge) {
    if (sameSampling) {
      const samp = uniqueTotals.length ? uniqueTotals[0] : 0;
      if (samp > 0) {
        if (isFull) samplingLine = isSingle ? `全检${samp}PCS,` : `各全检${samp}PCS,`;
        else samplingLine = isSingle ? `抽检${samp}PCS,` : `各抽检${samp}PCS,`;
      }
    } else {
      const sum = allTotals.reduce((a, b) => a + b, 0);
      if (sum > 0) samplingLine = isFull ? `全检${sum}PCS,` : `抽检${sum}PCS,`;
    }
    const groupMap = new Map<
      string,
      { totalSampling: number; items: Map<string, { name: string; qty: number }>; orderedKeys: string[] }
    >();
    const orderedNames: string[] = [];
    list.forEach((p) =>
      p.groups.forEach((g) => {
        const gname = g.name || '未命名分组';
        if (!groupMap.has(gname)) {
          groupMap.set(gname, { totalSampling: 0, items: new Map(), orderedKeys: [] });
          orderedNames.push(gname);
        }
        const ge = groupMap.get(gname)!;
        ge.totalSampling += g.total || 0;
        g.items.forEach((it) => {
          if (!showZero && it.qty <= 0) return;
          const k = nameKey(it.name);
          if (!ge.items.has(k)) {
            ge.items.set(k, { name: it.name, qty: 0 });
            ge.orderedKeys.push(k);
          }
          ge.items.get(k)!.qty += it.qty;
        });
      }),
    );
    const lines: string[] = [];
    orderedNames.forEach((gname) => {
      const ge = groupMap.get(gname)!;
      const parts: string[] = [];
      let totalBad = 0;
      ge.orderedKeys.forEach((k) => {
        const e = ge.items.get(k)!;
        if (showZero || e.qty > 0) {
          parts.push(`${e.name}${e.qty}PCS`);
          totalBad += e.qty;
        }
      });
      if (!parts.length) return;
      const rate = denom > 0
        ? `不良率${Math.round((totalBad / denom) * 100)}%`
        : totalBad > 0 ? '不良率--' : '不良率0%';
      lines.push(withLabels ? `${gname}：${parts.join('，')}，${rate}` : `${parts.join('，')}，${rate}`);
    });
    summaryText = lines.length
      ? lines.join(withLabels ? '\n' : '，')
      : (showZero ? '暂无分类数据' : '');
  } else {
    samplingLine = '';
    const lines: string[] = [];
    list.forEach((p) => {
      const pDenom = p.inspectionQty || 0;
      // ★ v3.7.5 B1：改用产品级 inspectionQty
      const pTotals = p.inspectionQty > 0 ? [p.inspectionQty] : [];
      const uniq = [...new Set(pTotals)];
      const pSum = pTotals.reduce((a, b) => a + b, 0);
      const pFull = (p.incomingQty || 0) > 0 && pSum === p.incomingQty && pSum > 0;
      let inspectText = '';
      if (uniq.length === 1) inspectText = pFull ? `全检${uniq[0]}PCS` : `抽检${uniq[0]}PCS`;
      else if (uniq.length === 0) inspectText = '抽检0PCS';
      else inspectText = pFull ? `全检${pSum}PCS` : `抽检${pSum}PCS`;
      const gp: string[] = [];
      p.groups.forEach((g) => {
        const items = g.items
          .filter((it) => showZero || it.qty > 0)
          .map((it) => `${it.name}${it.qty}PCS`);
        if (!items.length) return;
        const sum = g.items.reduce((s, it) => s + it.qty, 0);
        const rate = pDenom > 0
          ? `不良率${Math.round((sum / pDenom) * 100)}%`
          : sum > 0 ? '不良率--' : '不良率0%';
        gp.push(withLabels ? `${g.name}：${items.join('，')}，${rate}` : `${items.join('，')}，${rate}`);
      });
      lines.push(`${p.name}，${inspectText}，${gp.length ? gp.join('，') : '暂无分类数据'}`);
    });
    summaryText = lines.join(withLabels ? '\n' : '，');
  }
  return { samplingLine, summaryText };
}

export function buildMergedText(withLabels: boolean): string {
  const list = mergedProducts();
  if (!list.length) return '';
  const supplier = list[0].supplier || '';
  const customer = list[0].customer || '';
  const processes = [...new Set(list.map((p) => p.process || ''))].filter(Boolean);
  const process = processes.join('、');
  const lotLines = list.map((p) => `${p.name}，来料${p.incomingQty || 0}PCS`).join('\n');
  const shouldMerge = app.settings.mergeMultiProductSummary !== false;
  const { samplingLine, summaryText } = computeMergedSummary(list, shouldMerge, withLabels);
  const totalIncoming = list.reduce((s, p) => s + (p.incomingQty || 0), 0);
  // ★ v3.7.5 B1：改用产品级 inspectionQty
  const totalSampling = list.reduce((s, p) => s + (p.inspectionQty || 0), 0);
  const tempHandling = (app.settings.tempHandling || '').trim();
  const responsible = app.settings.responsiblePersons.map((n) => '@' + n).join(' ');
  const tpl = app.settings.summaryTemplate || DEFAULT_TPL;
  let out = renderTemplate(tpl, {
    customer, supplier, process, lotLines, samplingLine, summary: summaryText,
    totalIncoming: String(totalIncoming), totalSampling: String(totalSampling),
    tempHandling, responsible,
  });
  if (!samplingLine) out = out.replace(/\n[ \t]*\n/g, '\n');
  const dropIfEmpty = (text: string, re: RegExp) => text.split('\n').filter((l) => !re.test(l)).join('\n');
  if (!tempHandling) out = dropIfEmpty(out, /^\s*临时处理方式\s*[:：]?\s*$/);
  if (!responsible) out = dropIfEmpty(out, /^\s*负责人\s*[:：]?\s*$/);
  if (!customer) out = dropIfEmpty(out, /^\s*客户\s*[:：]?\s*$/);
  return out.replace(/\n{3,}/g, '\n\n');
}

export function templatePreviewHtml(): string {
  const tpl = String(app.settings.summaryTemplate || '');
  if (!tpl) return '';
  const list = mergedProducts();
  const target = list.length ? list : (currentProduct() ? [currentProduct()!] : []);
  const first = target[0];
  const customer = first?.customer || '';
  const supplier = first?.supplier || '';
  const process = [...new Set(target.map((p) => p.process || ''))].filter(Boolean).join('、');
  const tempHandling = (app.settings.tempHandling || '').trim();
  const responsible = app.settings.responsiblePersons.map((n) => '@' + n).join(' ');
  const lotLines = target.length ? target.map((p) => `${p.name}，来料${p.incomingQty || 0}PCS`).join('\n') : '';
  const shouldMerge = app.settings.mergeMultiProductSummary !== false;
  const { samplingLine, summaryText } = computeMergedSummary(target, shouldMerge, false);
  const totalIncoming = target.reduce((s, p) => s + (p.incomingQty || 0), 0);
  // ★ v3.7.5 B1：改用产品级 inspectionQty
  const totalSampling = target.reduce((s, p) => s + (p.inspectionQty || 0), 0);
  const vals: Record<string, string> = {
    customer, supplier, process, tempHandling, responsible, lotLines,
    samplingLine: samplingLine || '（无抽检数据）',
    summary: summaryText || '（暂无分组/分类数据，请先录入）',
    totalIncoming: String(totalIncoming), totalSampling: String(totalSampling),
  };
  const out: string[] = [];
  let i = 0;
  while (i < tpl.length) {
    const open = tpl.indexOf('{', i);
    if (open < 0) { out.push(escapeHtml(tpl.slice(i))); break; }
    const close = tpl.indexOf('}', open + 1);
    if (close < 0) { out.push(escapeHtml(tpl.slice(i))); break; }
    out.push(escapeHtml(tpl.slice(i, open)));
    const key = tpl.slice(open + 1, close);
    if (key in vals) {
      const v = vals[key];
      const cls = !v ? 'ph-empty' : 'ph-filled';
      out.push(`<span class="${cls}">${escapeHtml(v || '（空）')}</span>`);
    } else out.push(escapeHtml(tpl.slice(open, close + 1)));
    i = close + 1;
  }
  return out.join('');
}

/* ============================================================
   数据预设 CRUD
   ============================================================ */
export function addDataPreset(kind: string, value: any): boolean {
  const dp = app.dataPresets;
  if (kind === 'supplier') {
    const v = String(value).trim();
    if (!v || dp.suppliers.some((x) => nameKey(x) === nameKey(v))) { if (v) pushToast('已存在同名供应商', 'error'); return false; }
    dp.suppliers.push(v); scheduleSave(); return true;
  }
  if (kind === 'customer') {
    const v = String(value).trim();
    if (!v || dp.customers.some((x) => nameKey(x.name) === nameKey(v))) { if (v) pushToast('已存在同名客户', 'error'); return false; }
    dp.customers.push({ id: uid(), name: v, responsibleIds: [] }); scheduleSave(); return true;
  }
  if (kind === 'incoming') {
    const n = clampInt(value, 0);
    if (n <= 0 || dp.incomingQtyPresets.includes(n)) { if (n > 0) pushToast('已存在相同数量', 'error'); return false; }
    dp.incomingQtyPresets.push(n); scheduleSave(); return true;
  }
  if (kind === 'process') {
    const v = String(value).trim();
    if (!v || dp.processes.some((x) => nameKey(x) === nameKey(v))) { if (v) pushToast('已存在同名工序', 'error'); return false; }
    dp.processes.push(v); scheduleSave(); return true;
  }
  if (kind === 'tempHandling') {
    const v = String(value).trim();
    if (!v || dp.tempHandlings.some((x) => nameKey(x) === nameKey(v))) { if (v) pushToast('已存在同名', 'error'); return false; }
    dp.tempHandlings.push(v); scheduleSave(); return true;
  }
  return false;
}

export function removeCustomerById(id: string): void {
  const idx = app.dataPresets.customers.findIndex((c) => c.id === id);
  if (idx < 0) return;
  const c = app.dataPresets.customers[idx];
  app.products.forEach((p) => { if (p.customer === c.name) p.customer = ''; });
  app.dataPresets.customers.splice(idx, 1);
  scheduleSave();
}
export function removeSupplierByName(name: string): void {
  const idx = app.dataPresets.suppliers.findIndex((x) => x === name);
  if (idx < 0) return;
  app.products.forEach((p) => { if (p.supplier === name) p.supplier = ''; });
  app.dataPresets.suppliers.splice(idx, 1);
  scheduleSave();
}
export function renameSupplier(idx: number, value: string): void {
  const old = app.dataPresets.suppliers[idx];
  if (old === undefined) return;
  const v = value.trim();
  if (!v) return;
  if (app.dataPresets.suppliers.some((x, i) => i !== idx && nameKey(x) === nameKey(v))) { pushToast('已存在同名供应商', 'error'); return; }
  if (old === v) return;
  app.products.forEach((p) => { if (p.supplier === old) p.supplier = v; });
  app.dataPresets.suppliers[idx] = v;
  scheduleSave();
  sanitizeMergeSelection();
}
export function renameCustomerById(id: string, value: string): void {
  const c = app.dataPresets.customers.find((x) => x.id === id);
  if (!c) return;
  const v = value.trim();
  if (!v) return;
  if (app.dataPresets.customers.some((x) => x.id !== id && nameKey(x.name) === nameKey(v))) { pushToast('已存在同名客户', 'error'); return; }
  if (c.name === v) return;
  app.products.forEach((p) => { if (p.customer === c.name) p.customer = v; });
  c.name = v;
  scheduleSave();
  sanitizeMergeSelection();
}
export function renameCustomer(id: string, value: string): void { renameCustomerById(id, value); }

/* ============================================================
   清理
   ============================================================ */
export function cleanupOrphanData(): void {
  cleanupOrphanProductBindings();
  const usedCust = new Set(app.products.map((p) => p.customer).filter(Boolean));
  const beforeCust = app.dataPresets.customers.length;
  app.dataPresets.customers = app.dataPresets.customers.filter(
    (c) => usedCust.has(c.name) || (c.responsibleIds && c.responsibleIds.length > 0),
  );
  const usedSup = new Set(app.products.map((p) => p.supplier).filter(Boolean));
  const beforeSup = app.dataPresets.suppliers.length;
  app.dataPresets.suppliers = app.dataPresets.suppliers.filter((s) => usedSup.has(s));
  const removed = beforeCust - app.dataPresets.customers.length + (beforeSup - app.dataPresets.suppliers.length);
  scheduleSave();
  pushToast(removed > 0 ? `已清理 ${removed} 项孤儿数据` : '没有可清理的孤儿数据');
}

export function clearLocalCache(): void {
  try {
    localStorage.removeItem(storage.BACKUP_KEY);
    localStorage.removeItem(storage.AUTO_BACKUP_KEY);
    localStorage.removeItem(storage.DRAFT_KEY);
    const liveIds = new Set(app.products.map((p) => p.id));
    const stale: string[] = [];
    for (let i = 0; i < localStorage.length; i++) {
      const k = localStorage.key(i);
      if (k && k.startsWith(storage.PRODUCT_PREFIX)) {
        const pid = k.slice(storage.PRODUCT_PREFIX.length);
        if (!liveIds.has(pid)) stale.push(k);
      }
    }
    stale.forEach((k) => { try { localStorage.removeItem(k); } catch { /* ignore */ } });
    scheduleSave();
    pushToast('已清理本地缓存');
  } catch { pushToast('清理失败', 'error'); }
}

/* ============================================================
   转移
   ============================================================ */
export function transferItemToGroup(fromG: Group, itemName: string, toG: Group): boolean {
  const p = currentProduct();
  if (!p) return false;
  if (fromG.id === toG.id) return false;
  const k = nameKey(itemName);
  if (toG.items.some((it) => nameKey(it.name) === k)) {
    pushToast(`目标分组「${toG.name}」已存在同名分类`, 'error');
    return false;
  }
  const idx = fromG.items.findIndex((it) => nameKey(it.name) === k);
  if (idx < 0) return false;
  history.pushSnapshot(app.products, p.id);
  const [item] = fromG.items.splice(idx, 1);
  toG.items.push(item);
  scheduleSave();
  return true;
}

/* ============================================================
   全局设置
   ============================================================ */
export function setSetting<K extends keyof Settings>(key: K, value: Settings[K]): void {
  app.settings[key] = value;
  scheduleSave();
}
export function setExperience(level: Settings['experienceLevel']): void {
  if (app.settings.experienceLevel === level) return;
  app.settings.experienceLevel = level;
  scheduleSave();
  pushToast('体验等级：' + (level === 'auto' ? '自动' : level === 'elegant' ? '优雅' : level === 'standard' ? '标准' : '兼容'));
}

export function setComboVisibleItems(n: number): void {
  const v = clampInt(n, 1, 20);
  if (app.settings.comboVisibleItems === v) return;
  app.settings.comboVisibleItems = v;
  scheduleSave();
}

/* ============================================================
   下拉定位工具（固定锚点下方，不做上翻）
   ============================================================ */
export interface DropdownPosition {
  x: number;
  y: number;
  maxHeight: number;
  width: number;
}

export function positionDropdownBelow(
  anchor: HTMLElement,
  options: {
    itemHeight?: number;
    hintHeight?: number;
    padding?: number;
    minWidth?: number;
    maxWidth?: number;
    naturalHeight?: number;
  } = {},
): DropdownPosition {
  const {
    itemHeight = 40,
    hintHeight = 24,
    padding = 8,
    minWidth = 200,
    maxWidth = 360,
  } = options;
  const rect = anchor.getBoundingClientRect();
  const vw = window.innerWidth;
  const vh = window.innerHeight;
  const MARGIN = 8;
  const GAP = 4;

  const width = Math.min(Math.max(rect.width, minWidth), maxWidth, vw - MARGIN * 2);
  let x = rect.left;
  if (x + width > vw - MARGIN) x = vw - width - MARGIN;
  if (x < MARGIN) x = MARGIN;

  const y = rect.bottom + GAP;

  const naturalHeight = options.naturalHeight
    ?? (hintHeight + app.settings.comboVisibleItems * itemHeight + padding);
  const spaceBelow = vh - y - MARGIN;
  const maxHeight = Math.min(naturalHeight, Math.max(spaceBelow, 100));

  return { x, y, maxHeight, width };
}

/* ============================================================
   主题 / 字体
   ============================================================ */
export function applyThemeEffective(): void {
  const effective: 'light' | 'dark' = app.themeMode === 'auto'
    ? (window.matchMedia('(prefers-color-scheme: dark)').matches ? 'dark' : 'light')
    : app.themeMode;
  document.documentElement.dataset.theme = effective;
}
export function setThemeMode(m: 'auto' | 'light' | 'dark'): void {
  app.themeMode = m;
  try { localStorage.setItem(storage.THEME_KEY, m); } catch { /* ignore */ }
  applyThemeEffective();
}
export function applyFontSize(): void {
  const map: Record<string, string> = { small: '13px', standard: '14px', large: '16px' };
  document.documentElement.style.setProperty('--font-size-base', map[app.settings.fontSize] || '14px');
}

/* ============================================================
   加载 / 初始化
   ============================================================ */
export function loadFromStorage(): void {
  const payload = storage.loadPayload();
  if (payload) { applyPayload(payload); return; }
  const p = normalizeProduct({ name: '默认产品' });
  app.products = [p];
  app.currentProductId = p.id;
  flushSave();
}

export function applyPayload(payload: any): void {
  app.products = (Array.isArray(payload?.products) ? payload.products : []).map(normalizeProduct);

  // ★ v3.7.5 B1 数据迁移：确保 inspectionQty 与 group.total 一致
  // 修复 v3.7 之前遗留数据：g.total 保留旧值（如 100+），导致合并汇总时重复累加成 127
  app.products.forEach((p) => {
    if (typeof p.inspectionQty !== 'number' || !Number.isFinite(p.inspectionQty) || p.inspectionQty < 0) {
      p.inspectionQty = p.groups?.[0]?.total || calcSampling(p.incomingQty || 0);
    }
    p.groups.forEach((g) => { g.total = p.inspectionQty; });
  });

  app.globalPresets = cleanGlobalPresets(payload?.globalPresets || []);
  app.mergeSelectedIds = Array.isArray(payload?.mergeSelectedIds)
    ? payload.mergeSelectedIds.filter((x: unknown) => typeof x === 'string') : [];
  const dp = (payload && typeof payload === 'object' && payload.dataPresets) ? payload.dataPresets : {};
  app.dataPresets = {
    suppliers: cleanStringList(dp.suppliers),
    customers: cleanCustomers(dp.customers),
    incomingQtyPresets: cleanNumberList(dp.incomingQtyPresets),
    processes: cleanStringList(dp.processes),
    tempHandlings: cleanStringList(dp.tempHandlings),
    tempHandlingShortcuts: cleanShortcuts(dp.tempHandlingShortcuts),
    responsiblePersons: cleanResponsiblePersons(dp.responsiblePersons),
    specialGroups: cleanSpecialGroups(dp.specialGroups || dp.specialCategories),
    presetGroups: cleanPresetGroups(dp.presetGroups),
  };
  const s = (payload && typeof payload === 'object' && payload.settings) ? payload.settings : {};
  const tpl = (typeof s.summaryTemplate === 'string' && s.summaryTemplate.trim())
    ? (LEGACY_TPLS.includes(s.summaryTemplate) ? DEFAULT_TPL : s.summaryTemplate) : DEFAULT_TPL;
  const migratedShowRecognizeTools: boolean = typeof s.showRecognizeTools === 'boolean'
    ? s.showRecognizeTools : (s.showVoice !== false || s.showImageOcr !== false);
  Object.assign(app.settings, {
    ...defaultSettings(), summaryTemplate: tpl,
    showVoice: s.showVoice !== false,
    showImageOcr: s.showImageOcr !== false,
    showRecognizeTools: migratedShowRecognizeTools,
    showZeroQtyItems: s.showZeroQtyItems !== false,
    mergeMultiProductSummary: s.mergeMultiProductSummary !== false,
    animationLevel: ['normal', 'reduced', 'none'].includes(s.animationLevel) ? s.animationLevel : 'normal',
    experienceLevel: ['auto', 'elegant', 'standard', 'compat'].includes(s.experienceLevel)
      ? s.experienceLevel : (s.compatMode === 'on' ? 'compat' : 'auto'),
    confirmBeforeDelete: s.confirmBeforeDelete !== false,
    compactMode: s.compactMode === true,
    fontSize: ['small', 'standard', 'large'].includes(s.fontSize) ? s.fontSize : 'standard',
    autoBackup: s.autoBackup !== false,
    showShortcutHints: s.showShortcutHints !== false,
    showMainTips: s.showMainTips !== false,
    showTopNavText: s.showTopNavText !== false,
    bulkAddConfirmThreshold: Number.isFinite(Number(s.bulkAddConfirmThreshold)) ? clampInt(s.bulkAddConfirmThreshold, 0, 9999) : 5,
    tempHandling: typeof s.tempHandling === 'string' ? s.tempHandling : '',
    responsiblePersons: Array.isArray(s.responsiblePersons) ? s.responsiblePersons.filter((x: unknown) => typeof x === 'string') : [],
    collapsedGroups: Array.isArray(s.collapsedGroups) ? s.collapsedGroups.filter((x: unknown) => typeof x === 'string') : [],
    comboVisibleItems: Number.isFinite(Number(s.comboVisibleItems))
      ? clampInt(s.comboVisibleItems, 1, 20)
      : 4,
  });
  const wantId = payload?.currentProductId;
  app.currentProductId = wantId && app.products.some((p) => p.id === wantId) ? wantId : app.products[0]?.id ?? '';
  sanitizeGlobalPresetProducts();
  cleanupOrphanProductBindings();
  sanitizeMergeSelection();
}

export function initApp(): () => void {
  let saved = 'auto';
  try { saved = localStorage.getItem(storage.THEME_KEY) || 'auto'; } catch { /* ignore */ }
  if (!['auto', 'light', 'dark'].includes(saved)) saved = 'auto';
  app.themeMode = saved as any;
  applyThemeEffective();
  const mq = window.matchMedia('(prefers-color-scheme: dark)');
  const onChange = () => { if (app.themeMode === 'auto') applyThemeEffective(); };
  mq.addEventListener('change', onChange);
  loadFromStorage();
  applyFontSize();
  const draft = storage.readDraft();
  if (draft && draft.at > Date.now() - 1000 * 60 * 60 * 24 * 7) {
    if (confirm(`检测到上次未保存的草稿（共 ${(draft.products || []).length} 个产品），是否恢复？`)) applyPayload(draft);
    storage.clearDraft();
  }
  draftTimer = setInterval(() => {
    if (draftDirty) { draftDirty = false; storage.saveDraft({ ...buildPayload(), at: Date.now() } as any); }
  }, 30_000);
  history.reset(app.products);
  const onVis = () => { if (document.visibilityState === 'hidden') flushSave(); };
  window.addEventListener('visibilitychange', onVis);
  window.addEventListener('pagehide', flushSave);
  window.addEventListener('beforeunload', flushSave);
  return () => {
    mq.removeEventListener('change', onChange);
    window.removeEventListener('visibilitychange', onVis);
    window.removeEventListener('pagehide', flushSave);
    window.removeEventListener('beforeunload', flushSave);
    if (saveTimer) clearTimeout(saveTimer);
    if (draftTimer) clearInterval(draftTimer);
    if (autoBackupTimer) clearTimeout(autoBackupTimer);
    flushSave();
  };
}

export {
  history, CMD, uid, nameKey, clampInt, sortNatural, ncmp,
  calcSampling, parseGroupBulk, escapeHtml, storage, AUTO_GROUP_NAME,
};
export type {
  Product, Group, DataPresets, Settings, Customer, Responsible,
  SpecialGroup, PresetGroup, GlobalPreset, Shortcut,
};

export { MANUAL_SECTIONS } from '../manual';
export type { ManualSection } from '../manual';

/* ============================================================
   UI 状态
   ============================================================ */
export const uiState = $state({
  expandedCustomerProductsId: '', expandedSupplierProductsName: '',
  productPickerFilter: '', expandedCustomerId: '',
});
export function setProductPickerFilter(v: string): void { uiState.productPickerFilter = v; }
export function toggleCustomerProducts(id: string): void {
  uiState.expandedCustomerProductsId = uiState.expandedCustomerProductsId === id ? '' : id;
  uiState.expandedSupplierProductsName = '';
  uiState.productPickerFilter = '';
}
export function toggleSupplierProducts(name: string): void {
  uiState.expandedSupplierProductsName = uiState.expandedSupplierProductsName === name ? '' : name;
  uiState.expandedCustomerProductsId = '';
  uiState.productPickerFilter = '';
}
export function getFilteredProductsForPicker() {
  const q = uiState.productPickerFilter.trim().toLowerCase();
  let list = app.products;
  if (q) list = list.filter((p) => String(p.name).toLowerCase().includes(q));
  return sortNatural(list, (p) => p.name);
}
export function toggleCustomerProduct(c: any, pid: string, checked: boolean): void {
  const p = app.products.find((x) => x.id === pid);
  if (!p) return;
  if (checked) setProductCustomer(pid, c.name);
  else if ((p.customer || '') === c.name) setProductCustomer(pid, '');
  scheduleSave();
}
export function toggleSupplierProduct(name: string, pid: string, checked: boolean): void {
  const p = app.products.find((x) => x.id === pid);
  if (!p) return;
  if (checked) setProductSupplier(pid, name);
  else if ((p.supplier || '') === name) setProductSupplier(pid, '');
  scheduleSave();
}
export function selectAllProductsForCustomer(c: any, on: boolean): void {
  if (on) app.products.forEach((p) => setProductCustomer(p.id, c.name));
  else app.products.forEach((p) => { if ((p.customer || '') === c.name) setProductCustomer(p.id, ''); });
  scheduleSave();
}
export function selectAllProductsForSupplier(name: string, on: boolean): void {
  if (on) app.products.forEach((p) => setProductSupplier(p.id, name));
  else app.products.forEach((p) => { if ((p.supplier || '') === name) setProductSupplier(p.id, ''); });
  scheduleSave();
}
export function countSupplierProducts(name: string): number {
  return app.products.filter((p) => (p.supplier || '') === name).length;
}
export function countCustomerProducts(name: string): number {
  return app.products.filter((p) => (p.customer || '') === name).length;
}
export function toggleCustomerResp(id: string): void {
  uiState.expandedCustomerId = uiState.expandedCustomerId === id ? '' : id;
  uiState.expandedCustomerProductsId = '';
}
export function toggleCustomerRespFor(c: any, respId: string): void {
  const ids = c.responsibleIds.slice();
  const idx = ids.indexOf(respId);
  if (idx >= 0) ids.splice(idx, 1); else ids.push(respId);
  c.responsibleIds = ids;
  scheduleSave();
}

/* ============================================================
   分组批量管理
   ============================================================ */
export const groupSelection = $state<Record<string, string[]>>({});
export const batchGroupId = $state<{ value: string }>({ value: '' });
export function enterBatchItems(gid: string): void {
  batchGroupId.value = gid;
  groupSelection[gid] = [];
}
export function cancelBatchItems(): void {
  if (batchGroupId.value) groupSelection[batchGroupId.value] = [];
  batchGroupId.value = '';
}
export function toggleItemSelect(gid: string, itemName: string): void {
  if (!groupSelection[gid]) groupSelection[gid] = [];
  const arr = groupSelection[gid];
  const i = arr.indexOf(itemName);
  if (i >= 0) arr.splice(i, 1); else arr.push(itemName);
}
export function toggleAllItems(gid: string, checked: boolean, items: any[]): void {
  groupSelection[gid] = checked ? items.map((it) => it.name) : [];
}
export function batchDeleteItems(g: any): void {
  const sel = groupSelection[g.id] || [];
  if (!sel.length) return;
  const p = currentProduct();
  if (!p) return;
  const set = new Set(sel);
  const removedCount = g.items.filter((it: any) => set.has(it.name)).length;
  history.pushSnapshot(app.products, p.id);
  g.items = g.items.filter((it: any) => !set.has(it.name));
  groupSelection[g.id] = [];
  cancelBatchItems();
  scheduleSave();
  pushToast(`已删除 ${removedCount} 个分类`, 'success');
}

export const bulkQtyDialog = $state({
  show: false, gid: '', mode: 'multiply' as 'multiply' | 'set', value: '2',
});
export function openBulkQtyDialog(gid: string): void {
  const sel = groupSelection[gid] || [];
  if (!sel.length) { pushToast('请先勾选要修改的分类', 'error'); return; }
  bulkQtyDialog.gid = gid;
  bulkQtyDialog.mode = 'multiply';
  bulkQtyDialog.value = '2';
  bulkQtyDialog.show = true;
}
export function closeBulkQtyDialog(): void {
  bulkQtyDialog.show = false;
  bulkQtyDialog.gid = '';
}
export function applyBulkQty(): void {
  const p = currentProduct();
  const g = p?.groups.find((x) => x.id === bulkQtyDialog.gid);
  if (!p || !g) { closeBulkQtyDialog(); return; }
  const sel = groupSelection[bulkQtyDialog.gid] || [];
  if (!sel.length) { closeBulkQtyDialog(); return; }
  const n = Number(bulkQtyDialog.value);
  if (!bulkQtyDialog.value.trim() || !Number.isFinite(n) || n < 0) {
    pushToast('请输入有效的数值', 'error'); return;
  }
  const set = new Set(sel);
  const changes: { item: any; from: number; to: number }[] = [];
  g.items.forEach((it) => {
    if (!set.has(it.name)) return;
    const oldV = it.qty || 0;
    const nv = clampInt(bulkQtyDialog.mode === 'multiply' ? Math.round(oldV * n) : Math.round(n), 0);
    if (nv !== oldV) changes.push({ item: it, from: oldV, to: nv });
  });
  if (!changes.length) { closeBulkQtyDialog(); pushToast('数量没有变化'); return; }
  history.pushSnapshot(app.products, p.id);
  changes.forEach((c) => { c.item.qty = c.to; });
  scheduleSave();
  closeBulkQtyDialog();
  pushToast(`已修改 ${changes.length} 个分类的数量`);
}

/* ============================================================
   模块 R：拖拽
   ============================================================ */
export const dragState = $state({ activeId: '', dragging: false, overIndex: -1 });
export function moveGroupTo(fromIndex: number, toIndex: number): boolean {
  const p = currentProduct();
  if (!p) return false;
  const n = p.groups.length;
  if (fromIndex < 0 || fromIndex >= n) return false;
  if (toIndex < 0 || toIndex >= n) return false;
  if (fromIndex === toIndex) return false;
  history.pushSnapshot(app.products, p.id);
  const [g] = p.groups.splice(fromIndex, 1);
  p.groups.splice(toIndex, 0, g);
  scheduleSave();
  logOperation(`分组「${g.name}」移动到第 ${toIndex + 1} 位`);
  return true;
}

/* ============================================================
   模块 S-1：从预分组新建分组
   ============================================================ */
export async function createGroupFromPreset(presetGroupId: string): Promise<boolean> {
  const pg = app.dataPresets.presetGroups.find((x) => x.id === presetGroupId);
  if (!pg) return false;
  const p = currentProduct();
  if (!p) return false;
  if (p.groups.some((g) => nameKey(g.name) === nameKey(pg.name))) {
    pushToast(`已存在同名分组：${pg.name}`, 'error', 2600); return false;
  }
  const existing = new Set<string>();
  p.groups.forEach((g) => g.items.forEach((it) => existing.add(nameKey(it.name))));
  const seen = new Set<string>();
  const finalItems: string[] = [];
  for (const raw of pg.items) {
    const k = nameKey(raw);
    if (!k || seen.has(k) || existing.has(k)) continue;
    seen.add(k); finalItems.push(raw);
  }
  const threshold = app.settings.bulkAddConfirmThreshold || 5;
  if (finalItems.length > threshold) {
    const ok = await askConfirm({
      title: '创建新分组',
      message: `将从「${pg.name}」创建 ${finalItems.length} 个分类，是否继续？`,
      confirmText: '创建',
    });
    if (!ok) return false;
  }
  history.pushSnapshot(app.products, p.id);
  const initTotal = p.inspectionQty || calcSampling(p.incomingQty || 0);
  p.groups.push({
    id: uid(), name: pg.name, total: initTotal, totalIsAuto: true,
    items: finalItems.map((name) => ({ name, qty: 0 })),
  });
  scheduleSave();
  logOperation(`从预分组「${pg.name}」创建新分组（${finalItems.length} 个分类）`);
  if (finalItems.length === 0) pushToast(`已创建空分组「${pg.name}」`);
  else pushToast(`已创建「${pg.name}」（+${finalItems.length}）`);
  return true;
}

/* ============================================================
   模块 S-2：追加到现有分组
   ============================================================ */
export function applyPresetGroupToGroup(g: Group, presetGroupId: string): number {
  const pg = app.dataPresets.presetGroups.find((x) => x.id === presetGroupId);
  if (!pg) return 0;
  const p = currentProduct();
  if (!p) return 0;
  const seen = new Set(g.items.map((it) => nameKey(it.name)));
  const added: string[] = [];
  pg.items.forEach((name) => {
    const k = nameKey(name);
    if (seen.has(k)) return;
    const usedElsewhere = p.groups.some((x) => x.id !== g.id && x.items.some((it) => nameKey(it.name) === k));
    if (usedElsewhere) return;
    seen.add(k); added.push(name);
  });
  if (!added.length) return 0;
  history.pushSnapshot(app.products, p.id);
  added.forEach((name) => g.items.push({ name, qty: 0 }));
  scheduleSave();
  logOperation(`将预分组「${pg.name}」追加到「${g.name}」（+${added.length}）`);
  return added.length;
}

/* ============================================================
   模块 K：数据预设分页
   ============================================================ */
export function pageSizeFor(): number {
  try { const h = window.innerHeight; return Math.max(4, Math.floor((h - 380) / 54)); }
  catch { return 6; }
}
export const presetPages = $state<Record<string, number>>({
  customer: 1, supplier: 1, incoming: 1, process: 1,
  responsible: 1, special: 1, presetGroup: 1,
});
export function resetPresetPage(key: string): void { presetPages[key] = 1; }
export function setPresetPage(key: string, page: number): void { presetPages[key] = Math.max(1, page); }
export function getPresetPage(key: string, total: number): number {
  const size = pageSizeFor();
  const pages = Math.max(1, Math.ceil(total / size));
  const cur = presetPages[key] || 1;
  return Math.min(cur, pages);
}
export function getPresetPages(key: string, total: number): number {
  const size = pageSizeFor();
  return Math.max(1, Math.ceil(total / size));
}

/* ============================================================
   模块 E：负责人自动联动
   ============================================================ */
export const autoRespState = $state({
  rejected: [] as string[], manuallyAdded: [] as string[], lastSignature: '',
});
export function computeAutoResponsibles(): string[] {
  const list = mergedProducts();
  if (!list.length) return [];
  const rejected = new Set(autoRespState.rejected.map(nameKey));
  const out = new Set<string>();
  const custNames = new Set(list.map((p) => (p.customer || '').trim()).filter(Boolean));
  app.dataPresets.customers.forEach((c) => {
    if (!custNames.has(c.name)) return;
    c.responsibleIds.forEach((rid) => {
      const r = app.dataPresets.responsiblePersons.find((x) => x.id === rid);
      if (r && !rejected.has(nameKey(r.name))) out.add(r.name);
    });
  });
  app.dataPresets.specialGroups.forEach((sg) => {
    let hit = false;
    list.forEach((p) => {
      if (hit) return;
      if (sg.requireSample && !p.isSample) return;
      p.groups.forEach((g) => {
        if (hit) return;
        g.items.forEach((it) => {
          if (hit) return;
          if (sg.items.some((si) => nameKey(si) === nameKey(it.name))) hit = true;
        });
      });
    });
    if (hit) sg.responsibleIds.forEach((rid) => {
      const r = app.dataPresets.responsiblePersons.find((x) => x.id === rid);
      if (r && !rejected.has(nameKey(r.name))) out.add(r.name);
    });
  });
  return Array.from(out);
}
export function rejectAutoResponsible(name: string): void {
  const k = nameKey(name);
  if (!autoRespState.rejected.some((x) => nameKey(x) === k)) autoRespState.rejected.push(name);
  autoRespState.manuallyAdded = autoRespState.manuallyAdded.filter((n) => nameKey(n) !== k);
  app.settings.responsiblePersons = app.settings.responsiblePersons.filter((n) => nameKey(n) !== k);
  scheduleSave();
}
export function addManualResponsible(name: string): void {
  const v = String(name || '').trim().replace(/^@+/, '');
  if (!v) return;
  const k = nameKey(v);
  autoRespState.rejected = autoRespState.rejected.filter((x) => nameKey(x) !== k);
  if (!autoRespState.manuallyAdded.some((x) => nameKey(x) === k)) autoRespState.manuallyAdded.push(v);
  if (!app.settings.responsiblePersons.some((n) => nameKey(n) === k))
    app.settings.responsiblePersons = [...app.settings.responsiblePersons, v];
  scheduleSave();
  scheduleAutoRespSync();
}
let autoRespTimer: ReturnType<typeof setTimeout> | null = null;
export function scheduleAutoRespSync(): void {
  if (autoRespTimer) clearTimeout(autoRespTimer);
  autoRespTimer = setTimeout(() => {
    autoRespTimer = null;
    const sig = app.mergeSelectedIds.slice().sort().join('|');
    if (sig !== autoRespState.lastSignature) {
      autoRespState.lastSignature = sig;
      autoRespState.rejected = [];
    }
    const auto = computeAutoResponsibles();
    const merged = new Set<string>(auto);
    autoRespState.manuallyAdded.forEach((n) => merged.add(n));
    const seen = new Set<string>();
    const final: string[] = [];
    merged.forEach((n) => {
      const k = nameKey(n);
      if (seen.has(k)) return;
      seen.add(k); final.push(n);
    });
    app.settings.responsiblePersons = final;
    scheduleSave();
  }, 300);
}

/* ============================================================
   模块 G：特殊分组关联产品
   ============================================================ */
export function productMatchesSpecialGroup(p: Product, sg: SpecialGroup): boolean {
  return p.groups.some((g) =>
    g.items.some((it) => sg.items.some((si) => nameKey(si) === nameKey(it.name))),
  );
}
export function productEffectiveForSpecialGroup(p: Product, sg: SpecialGroup): boolean {
  if (!productMatchesSpecialGroup(p, sg)) return false;
  if (sg.requireSample && !p.isSample) return false;
  return true;
}
export function getSpecialGroupResponsibleNames(sg: SpecialGroup): string[] {
  return sg.responsibleIds.map((id) => app.dataPresets.responsiblePersons.find((r) => r.id === id)?.name || '').filter(Boolean);
}
export function addSpecialGroup(name: string): boolean {
  const v = String(name || '').trim();
  if (!v) return false;
  if (app.dataPresets.specialGroups.some((sg) => nameKey(sg.name) === nameKey(v))) {
    pushToast('已存在同名特殊分组', 'error'); return false;
  }
  app.dataPresets.specialGroups.push({ id: uid(), name: v, items: [v], responsibleIds: [], requireSample: false });
  scheduleSave();
  return true;
}
export function removeSpecialGroup(id: string): void {
  const idx = app.dataPresets.specialGroups.findIndex((sg) => sg.id === id);
  if (idx < 0) return;
  app.dataPresets.specialGroups.splice(idx, 1);
  scheduleSave();
}
export function renameSpecialGroup(id: string, name: string): void {
  const sg = app.dataPresets.specialGroups.find((x) => x.id === id);
  if (!sg) return;
  const v = String(name || '').trim();
  if (!v) return;
  sg.name = v; scheduleSave();
}
export function toggleSpecialGroupResp(sgId: string, respId: string): void {
  const sg = app.dataPresets.specialGroups.find((x) => x.id === sgId);
  if (!sg) return;
  const i = sg.responsibleIds.indexOf(respId);
  if (i >= 0) sg.responsibleIds.splice(i, 1);
  else sg.responsibleIds.push(respId);
  scheduleSave();
}
export function toggleSpecialGroupSample(sgId: string): void {
  const sg = app.dataPresets.specialGroups.find((x) => x.id === sgId);
  if (!sg) return;
  sg.requireSample = !sg.requireSample; scheduleSave();
}
export function setSpecialGroupItems(sgId: string, text: string): void {
  const sg = app.dataPresets.specialGroups.find((x) => x.id === sgId);
  if (!sg) return;
  sg.items = text.split(/[\n,，、;；]+/).map((s) => s.trim()).filter(Boolean);
  scheduleSave();
}
export const specialUIState = $state({
  expandedProductsId: '', filter: '',
  mode: 'all' as 'all' | 'hit' | 'effective', expandedRespId: '',
});
export function toggleSpecialGroupProducts(id: string): void {
  specialUIState.expandedProductsId = specialUIState.expandedProductsId === id ? '' : id;
  specialUIState.expandedRespId = '';
  specialUIState.filter = '';
}
export function toggleSpecialRespPanel(id: string): void {
  specialUIState.expandedRespId = specialUIState.expandedRespId === id ? '' : id;
  specialUIState.expandedProductsId = '';
}

/* ============================================================
   模块 L：部分导出 / 部分导入
   ============================================================ */
export interface ExportOptions { products: boolean; dataPresets: boolean; settings: boolean; }
export interface ImportOptions {
  products: boolean; dataPresets: boolean; settings: boolean; mode: 'merge' | 'overwrite';
}
export function buildPartialExport(opts: ExportOptions): string {
  const payload: any = {
    app: 'category-counts', version: 5,
    exportedAt: new Date().toISOString(), partial: true,
  };
  if (opts.products) {
    payload.products = app.products;
    payload.globalPresets = app.globalPresets;
    payload.mergeSelectedIds = app.mergeSelectedIds;
    payload.currentProductId = app.currentProductId;
  }
  if (opts.dataPresets) payload.dataPresets = app.dataPresets;
  if (opts.settings) payload.settings = app.settings;
  return JSON.stringify(payload, null, 2);
}
export function summarizeImport(raw: any): string {
  const parts: string[] = [];
  if (Array.isArray(raw?.products)) parts.push(`${raw.products.length} 产品`);
  const dp = raw?.dataPresets;
  if (dp) {
    parts.push(`${(dp.customers || []).length} 客户`);
    parts.push(`${(dp.suppliers || []).length} 供应商`);
    parts.push(`${(dp.specialGroups || []).length} 特殊分组`);
  }
  if (raw?.settings) parts.push('全局设置');
  return parts.join(' · ') || '空文件';
}
export function detectImportModules(raw: any): { products: boolean; dataPresets: boolean; settings: boolean } {
  return { products: Array.isArray(raw?.products), dataPresets: !!raw?.dataPresets, settings: !!raw?.settings };
}
function cleanupResponsibleIds(): void {
  const valid = new Set(app.dataPresets.responsiblePersons.map((r) => r.id));
  app.dataPresets.customers.forEach((c) => {
    const f = c.responsibleIds.filter((id) => valid.has(id));
    if (f.length !== c.responsibleIds.length) c.responsibleIds = f;
  });
  app.dataPresets.specialGroups.forEach((sg) => {
    const f = sg.responsibleIds.filter((id) => valid.has(id));
    if (f.length !== sg.responsibleIds.length) sg.responsibleIds = f;
  });
}
export function importPartialPayload(raw: any, opts: ImportOptions): { added: number; replaced: number } {
  let added = 0;
  let replaced = 0;
  if (opts.products && Array.isArray(raw?.products)) {
    const newProducts = raw.products.map(normalizeProduct);
    if (opts.mode === 'overwrite') {
      app.products = newProducts;
      app.globalPresets = cleanGlobalPresets(raw.globalPresets || []);
      app.mergeSelectedIds = Array.isArray(raw.mergeSelectedIds)
        ? raw.mergeSelectedIds.filter((x: unknown) => typeof x === 'string') : [];
      app.currentProductId = raw.currentProductId && newProducts.some((p: Product) => p.id === raw.currentProductId)
        ? raw.currentProductId : newProducts[0]?.id || '';
      replaced += newProducts.length;
    } else {
      const byName = new Map(app.products.map((p) => [nameKey(p.name), p]));
      newProducts.forEach((np: Product) => {
        const k = nameKey(np.name);
        if (byName.has(k)) replaced++;
        else { app.products.push(np); added++; }
      });
      if (Array.isArray(raw.globalPresets)) {
        const seen = new Set(app.globalPresets.map((g) => nameKey(g.name)));
        cleanGlobalPresets(raw.globalPresets).forEach((g) => {
          if (!seen.has(nameKey(g.name))) { app.globalPresets.push(g); added++; }
        });
      }
    }
    // ★ v3.7.5 B1：导入后同步 inspectionQty 与 group.total
    app.products.forEach((p) => {
      if (typeof p.inspectionQty !== 'number' || !Number.isFinite(p.inspectionQty) || p.inspectionQty < 0) {
        p.inspectionQty = p.groups?.[0]?.total || calcSampling(p.incomingQty || 0);
      }
      p.groups.forEach((g) => { g.total = p.inspectionQty; });
    });
  }
  if (opts.dataPresets && raw?.dataPresets) {
    const dp = raw.dataPresets;
    if (opts.mode === 'overwrite') {
      app.dataPresets = {
        suppliers: cleanStringList(dp.suppliers),
        customers: cleanCustomers(dp.customers),
        incomingQtyPresets: cleanNumberList(dp.incomingQtyPresets),
        processes: cleanStringList(dp.processes),
        tempHandlings: cleanStringList(dp.tempHandlings),
        tempHandlingShortcuts: cleanShortcuts(dp.tempHandlingShortcuts),
        responsiblePersons: cleanResponsiblePersons(dp.responsiblePersons),
        specialGroups: cleanSpecialGroups(dp.specialGroups),
        presetGroups: cleanPresetGroups(dp.presetGroups),
      };
      replaced += 1;
      cleanupResponsibleIds();
      cleanupOrphanProductBindings();
    } else {
      const sup = new Set(app.dataPresets.suppliers.map(nameKey));
      (dp.suppliers || []).forEach((s: string) => { if (!sup.has(nameKey(s))) { app.dataPresets.suppliers.push(s); added++; } });
      const cust = new Set(app.dataPresets.customers.map((c) => nameKey(c.name)));
      cleanCustomers(dp.customers).forEach((c) => { if (!cust.has(nameKey(c.name))) { app.dataPresets.customers.push(c); added++; } });
      const inq = new Set(app.dataPresets.incomingQtyPresets);
      cleanNumberList(dp.incomingQtyPresets).forEach((n) => { if (!inq.has(n)) { app.dataPresets.incomingQtyPresets.push(n); added++; } });
      const proc = new Set(app.dataPresets.processes.map(nameKey));
      (dp.processes || []).forEach((s: string) => { if (!proc.has(nameKey(s))) { app.dataPresets.processes.push(s); added++; } });
      const resp = new Set(app.dataPresets.responsiblePersons.map((r) => nameKey(r.name)));
      cleanResponsiblePersons(dp.responsiblePersons).forEach((r) => {
        if (!resp.has(nameKey(r.name))) { app.dataPresets.responsiblePersons.push(r); added++; }
      });
      const sg = new Set(app.dataPresets.specialGroups.map((s) => nameKey(s.name)));
      cleanSpecialGroups(dp.specialGroups).forEach((s) => {
        if (!sg.has(nameKey(s.name))) { app.dataPresets.specialGroups.push(s); added++; }
      });
      const pg = new Set(app.dataPresets.presetGroups.map((p) => nameKey(p.name)));
      cleanPresetGroups(dp.presetGroups).forEach((p) => {
        if (!pg.has(nameKey(p.name))) { app.dataPresets.presetGroups.push(p); added++; }
      });
      cleanupResponsibleIds();
    }
  }
  if (opts.settings && raw?.settings) {
    if (opts.mode === 'overwrite') Object.assign(app.settings, { ...defaultSettings(), ...raw.settings });
    else Object.keys(raw.settings).forEach((k) => {
      if ((app.settings as any)[k] === undefined) (app.settings as any)[k] = raw.settings[k];
    });
  }
  scheduleSave();
  return { added, replaced };
}
export function parseJsData(text: string): any {
  const trimmed = String(text || '').trim();
  if (!trimmed) throw new Error('空文件');
  const stripped = trimmed
    .replace(/'(?:[^'\\]|\\.)*'/g, "''")
    .replace(/"(?:[^"\\]|\\.)*"/g, '""')
    .replace(/`(?:[^`\\]|\\.)*`/g, '``');
  if (/\b(import|require|eval|Function|fetch|XMLHttpRequest|WebSocket)\b/.test(stripped))
    throw new Error('文件包含不安全的关键字，已拒绝');
  let jsonText = trimmed;
  jsonText = jsonText.replace(/^\s*export\s+default\s+/, '');
  jsonText = jsonText.replace(/^\s*(const|let|var)\s+\w+\s*=\s*/, '');
  jsonText = jsonText.replace(/^\s*window\.\w+\s*=\s*/, '');
  jsonText = jsonText.replace(/;?\s*$/, '');
  try { return JSON.parse(jsonText); } catch {
    const converted = jsonText
      .replace(/'/g, '"')
      .replace(/([{,]\s*)([a-zA-Z_$][\w$]*)\s*:/g, '$1"$2":')
      .replace(/,(\s*[}\]])/g, '$1');
    return JSON.parse(converted);
  }
}

/* ============================================================
   任务 A：本产品汇总
   ============================================================ */
export function outputText(): string { return buildOutputText(true); }
export function outputCopyText(): string { return buildOutputText(false); }

/* ============================================================
   任务 D：显示 Tab setter
   ============================================================ */
export function setShowTopNavText(v: boolean): void { app.settings.showTopNavText = v; scheduleSave(); }
export function setShowMainTips(v: boolean): void { app.settings.showMainTips = v; scheduleSave(); }
export function setShowZeroQty(v: boolean): void { app.settings.showZeroQtyItems = v; scheduleSave(); }
export function setMergeMultiProductSummary(v: boolean): void { app.settings.mergeMultiProductSummary = v; scheduleSave(); }
export function setShowVoice(v: boolean): void { app.settings.showVoice = v; scheduleSave(); }
export function setShowOcr(v: boolean): void { app.settings.showImageOcr = v; scheduleSave(); }
export function setShowRecognizeTools(v: boolean): void {
  app.settings.showRecognizeTools = v;
  app.settings.showVoice = v;
  app.settings.showImageOcr = v;
  scheduleSave();
}
export function setFontSize(key: 'small' | 'standard' | 'large'): void {
  app.settings.fontSize = key; applyFontSize(); scheduleSave();
}
export function setAnimationLevel(key: 'normal' | 'reduced' | 'none'): void {
  app.settings.animationLevel = key; scheduleSave();
}
export function fontSizeLabel(): string {
  const m: Record<string, string> = { small: '小', standard: '标准', large: '大' };
  return m[app.settings.fontSize] || '标准';
}
export function animationLevelLabel(): string {
  const m: Record<string, string> = { normal: '标准', reduced: '柔和', none: '关闭' };
  return m[app.settings.animationLevel] || '标准';
}
export function experienceLevelLabel(): string {
  const lv = app.settings.experienceLevel;
  return lv === 'auto' ? `自动（${autoLevel()}）` : lv === 'elegant' ? '优雅' : lv === 'standard' ? '标准' : '兼容';
}
export function experienceHint(): string {
  const lv = effectiveLevel();
  return lv === 'elegant' ? '全动画 + 毛玻璃，适合高端设备'
    : lv === 'compat' ? '关闭动画与毛玻璃，适合低端设备与老旧浏览器'
    : '平衡性能与观感（推荐）';
}

/* ============================================================
   任务 E：数据预设导航弹窗状态
   ============================================================ */
export const presetNavDialog = $state<{ show: boolean }>({ show: false });
export function openPresetNavDialog(): void { presetNavDialog.show = true; }
export function closePresetNavDialog(): void { presetNavDialog.show = false; }

/* ============================================================
   N2 · 预分类派生
   ============================================================ */
class PresetDerivedStore {
  visibleSharedPresets: GlobalPreset[] = $derived.by(() => {
    const pid = app.currentProductId;
    return app.globalPresets.filter((gp) => {
      if (gp.productIds === null) return true;
      if (Array.isArray(gp.productIds) && gp.productIds.length === 0) return false;
      return gp.productIds.includes(pid);
    });
  });
  globalPresetNameKeys: Set<string> = $derived(
    new Set(this.visibleSharedPresets.map((gp) => nameKey(gp.name))),
  );
  localOnlyPresets: string[] = $derived.by(() => {
    const p = currentProduct();
    if (!p) return [];
    const shared = this.globalPresetNameKeys;
    return p.presets.filter((x) => !shared.has(nameKey(x)));
  });
}
export const presetDerived = new PresetDerivedStore();

/* ============================================================
   N2 · 三态判定
   ============================================================ */
export type PresetItemState = 'in-current' | 'in-other' | 'fresh';
export function getPresetItemState(group: Group, itemName: string): PresetItemState {
  const p = currentProduct();
  if (!p) return 'fresh';
  const k = nameKey(itemName);
  if (group.items.some((it) => nameKey(it.name) === k)) return 'in-current';
  if (p.groups.some((g) => g.id !== group.id && g.items.some((it) => nameKey(it.name) === k))) return 'in-other';
  return 'fresh';
}

/* ============================================================
   N2 · 共享预分类 CRUD
   ============================================================ */
export function addGlobalPreset(name: string): boolean {
  const v = String(name || '').trim();
  if (!v) return false;
  if (app.globalPresets.some((gp) => nameKey(gp.name) === nameKey(v))) {
    pushToast('已存在同名共享预分类', 'error'); return false;
  }
  history.pushGlobalSnapshot(app.products, app.dataPresets, app.globalPresets, app.settings, '新增共享预分类');
  app.globalPresets.push({ id: uid(), name: v, productIds: null });
  scheduleSave();
  logOperation(`新增共享预分类「${v}」`);
  return true;
}
export function renameGlobalPreset(id: string, newName: string): boolean {
  const gp = app.globalPresets.find((x) => x.id === id);
  if (!gp) return false;
  const v = String(newName || '').trim();
  if (!v) return false;
  if (gp.name === v) return true;
  if (app.globalPresets.some((x) => x.id !== id && nameKey(x.name) === nameKey(v))) {
    pushToast('已存在同名共享预分类', 'error'); return false;
  }
  history.pushGlobalSnapshot(app.products, app.dataPresets, app.globalPresets, app.settings, '重命名共享预分类');
  gp.name = v;
  scheduleSave();
  return true;
}
export function removeGlobalPreset(id: string): void {
  const idx = app.globalPresets.findIndex((x) => x.id === id);
  if (idx < 0) return;
  history.pushGlobalSnapshot(app.products, app.dataPresets, app.globalPresets, app.settings, '删除共享预分类');
  app.globalPresets.splice(idx, 1);
  scheduleSave();
  logOperation('删除共享预分类');
}
export function toggleGpProduct(gp: GlobalPreset, pid: string): void {
  if (gp.productIds === null) {
    gp.productIds = app.products.map((p) => p.id).filter((x) => x !== pid);
  } else {
    const arr = gp.productIds.slice();
    const i = arr.indexOf(pid);
    if (i >= 0) arr.splice(i, 1); else arr.push(pid);
    gp.productIds = arr;
  }
  scheduleSave();
}
export function setAllGpProducts(gp: GlobalPreset): void {
  if (gp.productIds === null) return;
  history.pushGlobalSnapshot(app.products, app.dataPresets, app.globalPresets, app.settings, '共享预分类全部生效');
  gp.productIds = null;
  scheduleSave();
}
export function setNoneGpProducts(gp: GlobalPreset): void {
  if (Array.isArray(gp.productIds) && gp.productIds.length === 0) return;
  history.pushGlobalSnapshot(app.products, app.dataPresets, app.globalPresets, app.settings, '共享预分类全部不生效');
  gp.productIds = [];
  scheduleSave();
}

/* ============================================================
   5B-1 · 识别工具
   ============================================================ */
export interface Candidate {
  id: string; text: string; matched: boolean; groupId: string; checked: boolean;
}
export const recognizeState = $state({
  text: '', candidates: [] as Candidate[],
  candidatesSourcePid: '',
  generateSignal: 0,
  splitMode: 'smart' as 'smart' | 'comma' | 'line',
  ocrApiKey: '', ocrRunning: false, ocrProgress: 0,
  ocrStatus: '', ocrStatusType: '' as '' | 'success' | 'error' | 'warn',
  ocrFiles: [] as File[], ocrPreviews: [] as string[],
  voiceRunning: false, voiceFinalText: '', voiceInterimText: '',
  voiceStatus: '', voiceStatusType: '' as '' | 'success' | 'error',
});
export function setRecognizeText(text: string): void { recognizeState.text = String(text ?? ''); }
export function appendRecognizeText(text: string): void {
  const t = String(text ?? '').trim();
  if (!t) return;
  recognizeState.text = recognizeState.text ? recognizeState.text + '\n' + t : t;
}
export function clearRecognizeText(): void {
  recognizeState.text = '';
  recognizeState.candidates = [];
}
export function requestGenerateCandidates(): void { recognizeState.generateSignal++; }

export function splitRecognizeText(mode: 'smart' | 'comma' | 'line' = 'smart'): string[] {
  const raw = recognizeState.text || '';
  if (!raw.trim()) return [];
  let parts: string[];
  if (mode === 'line') parts = raw.split(/[\n\r]+/);
  else if (mode === 'comma') parts = raw.split(/[,，、;；]+|\s{2,}/);
  else parts = raw.split(/[\n\r]+/).flatMap((line) => line.split(/[,，、;；]+|\s{2,}/));
  const seen = new Set<string>();
  const out: string[] = [];
  for (const p of parts) {
    const v = p.trim();
    if (!v) continue;
    const k = nameKey(v);
    if (!k || seen.has(k)) continue;
    seen.add(k); out.push(v);
  }
  return out;
}

export function doGenerateCandidates(): void {
  const p = currentProduct();
  if (!p) { pushToast('请先选择产品', 'error'); return; }
  const parts = splitRecognizeText(recognizeState.splitMode);
  if (!parts.length) { pushToast('识别文本为空', 'error'); return; }
  const index = new Map<string, string>();
  p.groups.forEach((g) => {
    g.items.forEach((it) => {
      const k = nameKey(it.name);
      if (!index.has(k)) index.set(k, g.id);
    });
  });
  const candidates: Candidate[] = parts.map((text) => {
    const k = nameKey(text);
    const gid = index.get(k);
    return { id: k, text, matched: !!gid, groupId: gid || '__auto__', checked: true };
  });
  recognizeState.candidates = candidates;
  recognizeState.candidatesSourcePid = p.id;
  pushToast(`已生成 ${candidates.length} 个候选`);
}
export function toggleCandidate(id: string): void {
  recognizeState.candidates = recognizeState.candidates.map((c) =>
    c.id === id ? { ...c, checked: !c.checked } : c,
  );
}
export function setCandidateGroup(id: string, groupId: string): void {
  recognizeState.candidates = recognizeState.candidates.map((c) =>
    c.id === id ? { ...c, groupId } : c,
  );
}
export function toggleAllCandidates(checked: boolean): void {
  recognizeState.candidates = recognizeState.candidates.map((c) => ({ ...c, checked }));
}
function findOrCreateAutoGroup(): Group | null {
  const p = currentProduct();
  if (!p) return null;
  let g = p.groups.find((x) => x.name === AUTO_GROUP_NAME);
  if (!g) {
    g = { id: uid(), name: AUTO_GROUP_NAME, total: p.inspectionQty || 0, totalIsAuto: false, items: [] };
    p.groups.push(g);
  }
  return g;
}
function applyCandidatesImpl(list: Candidate[]): void {
  const p = currentProduct();
  if (!p || !list.length) return;
  if (recognizeState.candidatesSourcePid && recognizeState.candidatesSourcePid !== p.id) {
    pushToast('候选来自其他产品，请重新生成', 'error', 3000);
    return;
  }
  history.pushSnapshot(app.products, p.id);
  let hitCount = 0;
  let addCount = 0;
  for (const c of list) {
    const k = nameKey(c.text);
    if (c.matched) {
      const g = p.groups.find((x) => x.id === c.groupId);
      const it = g?.items.find((x) => nameKey(x.name) === k);
      if (it) { it.qty = (it.qty || 0) + 1; hitCount++; continue; }
    }
    let target: Group | null = null;
    if (c.groupId === '__auto__') target = findOrCreateAutoGroup();
    else {
      target = p.groups.find((x) => x.id === c.groupId) || null;
      if (!target) target = findOrCreateAutoGroup();
    }
    if (!target) continue;
    const exist = target.items.find((x) => nameKey(x.name) === k);
    if (exist) { exist.qty = (exist.qty || 0) + 1; hitCount++; }
    else { target.items.push({ name: c.text, qty: 1 }); addCount++; }
    if (!p.presets.some((x) => nameKey(x) === k)) p.presets.push(c.text);
  }
  scheduleSave();
  logOperation(`识别应用：命中 ${hitCount}，新增 ${addCount}`);
  pushToast(`应用完成：命中 ${hitCount}，新增 ${addCount}`);
}
export function applySelectedCandidates(): void {
  const list = recognizeState.candidates.filter((c) => c.checked);
  if (!list.length) { pushToast('未勾选任何候选', 'error'); return; }
  applyCandidatesImpl(list);
  const appliedIds = new Set(list.map((c) => c.id));
  recognizeState.candidates = recognizeState.candidates.filter((c) => !appliedIds.has(c.id));
}
export function applyAllRecognizedText(): void {
  const parts = splitRecognizeText(recognizeState.splitMode);
  if (!parts.length) { pushToast('识别文本为空', 'error'); return; }
  const p = currentProduct();
  if (!p) return;
  const index = new Map<string, string>();
  p.groups.forEach((g) => {
    g.items.forEach((it) => {
      const k = nameKey(it.name);
      if (!index.has(k)) index.set(k, g.id);
    });
  });
  const list: Candidate[] = parts.map((text) => {
    const k = nameKey(text);
    const gid = index.get(k);
    return { id: k, text, matched: !!gid, groupId: gid || '__auto__', checked: true };
  });
  recognizeState.candidatesSourcePid = p.id;
  applyCandidatesImpl(list);
  recognizeState.candidates = [];
}

/* ---- OCR ---- */
const OCR_KEY_STORE = 'ocr_api_key_v1';
export function saveOcrApiKey(key: string): void {
  recognizeState.ocrApiKey = String(key ?? '').trim();
  try {
    if (recognizeState.ocrApiKey) sessionStorage.setItem(OCR_KEY_STORE, recognizeState.ocrApiKey);
    else sessionStorage.removeItem(OCR_KEY_STORE);
  } catch { /* ignore */ }
  pushToast(recognizeState.ocrApiKey ? 'OCR Key 已保存' : 'OCR Key 已清除');
}
export function loadOcrApiKey(): void {
  try { recognizeState.ocrApiKey = sessionStorage.getItem(OCR_KEY_STORE) || ''; }
  catch { recognizeState.ocrApiKey = ''; }
}
const MAX_OCR_FILE_BYTES = 2_000_000;
export function addOcrFiles(files: File[]): void {
  const accepted: File[] = [];
  for (const f of files) {
    if (!f.type.startsWith('image/')) { pushToast(`${f.name} 不是图片`, 'error', 2400); continue; }
    if (f.size > MAX_OCR_FILE_BYTES) { pushToast(`${f.name} 超过 2MB，请压缩后再上传`, 'error', 2600); continue; }
    accepted.push(f);
  }
  if (!accepted.length) return;
  recognizeState.ocrFiles = [...recognizeState.ocrFiles, ...accepted];
  recognizeState.ocrPreviews = [...recognizeState.ocrPreviews, ...accepted.map((f) => URL.createObjectURL(f))];
}
export function removeOcrFile(index: number): void {
  if (index < 0 || index >= recognizeState.ocrFiles.length) return;
  const url = recognizeState.ocrPreviews[index];
  if (url) { try { URL.revokeObjectURL(url); } catch { /* ignore */ } }
  recognizeState.ocrFiles = recognizeState.ocrFiles.filter((_, i) => i !== index);
  recognizeState.ocrPreviews = recognizeState.ocrPreviews.filter((_, i) => i !== index);
}
export function clearOcrFiles(): void {
  recognizeState.ocrPreviews.forEach((url) => {
    try { URL.revokeObjectURL(url); } catch { /* ignore */ }
  });
  recognizeState.ocrFiles = [];
  recognizeState.ocrPreviews = [];
  recognizeState.ocrProgress = 0;
  recognizeState.ocrStatus = '';
  recognizeState.ocrStatusType = '';
}
async function recognizeOneImage(file: File): Promise<string> {
  const fd = new FormData();
  fd.append('file', file);
  fd.append('language', 'chs');
  fd.append('isOverlayRequired', 'false');
  fd.append('OCREngine', '2');
  fd.append('scale', 'true');
  const key = recognizeState.ocrApiKey || 'helloworld';
  const res = await fetch('https://api.ocr.space/parse/image', {
    method: 'POST', headers: { apikey: key }, body: fd,
  });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const data: any = await res.json();
  if (data?.IsErroredOnProcessing) {
    const msg = Array.isArray(data.ErrorMessage) ? data.ErrorMessage.join(' ') : (data.ErrorMessage || 'OCR 失败');
    throw new Error(msg);
  }
  const parsed = data?.ParsedResults || [];
  return parsed.map((p: any) => p.ParsedText || '').join('\n').trim();
}
export async function startOcrRecognition(): Promise<void> {
  if (recognizeState.ocrRunning) return;
  if (!recognizeState.ocrFiles.length) { pushToast('请先选择图片', 'error'); return; }
  recognizeState.ocrRunning = true;
  recognizeState.ocrProgress = 0;
  recognizeState.ocrStatus = `识别中… 0/${recognizeState.ocrFiles.length}`;
  recognizeState.ocrStatusType = '';
  const files = recognizeState.ocrFiles.slice();
  let done = 0, ok = 0, fail = 0;
  const texts: string[] = [];
  await Promise.allSettled(files.map(async (f) => {
    try {
      const t = await recognizeOneImage(f);
      if (t) { texts.push(t); ok++; } else fail++;
    } catch (e: any) { fail++; console.warn('OCR error:', e?.message || e); }
    finally {
      done++;
      recognizeState.ocrProgress = Math.round((done / files.length) * 100);
      recognizeState.ocrStatus = `识别中… ${done}/${files.length}`;
    }
  }));
  recognizeState.ocrRunning = false;
  if (texts.length) {
    appendRecognizeText(texts.join('\n'));
    const both = fail > 0;
    recognizeState.ocrStatus = both ? `完成：成功 ${ok} / 失败 ${fail}` : `完成：成功 ${ok} 张`;
    recognizeState.ocrStatusType = both ? 'warn' : 'success';
    logOperation(`OCR 识别完成，成功 ${ok} 张，失败 ${fail} 张`);
    pushToast(both ? `部分成功：成功 ${ok} / 失败 ${fail}` : `已识别 ${ok} 张`, both ? 'info' : 'success');
  } else {
    recognizeState.ocrStatus = `全部失败（${fail} 张）`;
    recognizeState.ocrStatusType = 'error';
    pushToast('未识别到文本', 'error');
  }
}

/* ---- 语音 ---- */
export function isSecureContext(): boolean { try { return !!window.isSecureContext; } catch { return false; } }
export function hasMediaDevices(): boolean { try { return !!(navigator.mediaDevices?.getUserMedia); } catch { return false; } }
export function hasSpeechRecognition(): boolean {
  try { return !!((window as any).SpeechRecognition || (window as any).webkitSpeechRecognition); }
  catch { return false; }
}
let voiceRec: any = null;
let voiceSessionActive = false;
let voiceRestartTimer: ReturnType<typeof setTimeout> | null = null;
export function startVoiceRecognition(): void {
  if (recognizeState.voiceRunning) return;
  if (!isSecureContext()) {
    recognizeState.voiceStatus = '非 HTTPS 环境，无法录音';
    recognizeState.voiceStatusType = 'error';
    pushToast('语音识别需在 HTTPS 或 localhost 下使用', 'error', 2600);
    return;
  }
  if (!hasSpeechRecognition()) {
    recognizeState.voiceStatus = '当前浏览器不支持语音识别';
    recognizeState.voiceStatusType = 'error';
    pushToast('当前浏览器不支持语音识别', 'error', 2600);
    return;
  }
  const SR = (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition;
  try {
    if (!voiceRec) {
      voiceRec = new SR();
      voiceRec.lang = 'zh-CN';
      voiceRec.continuous = true;
      voiceRec.interimResults = true;
      voiceRec.onresult = (event: any) => {
        let finalText = '';
        let interimText = '';
        for (let i = event.resultIndex; i < event.results.length; i++) {
          const r = event.results[i];
          const t = r[0]?.transcript || '';
          if (r.isFinal) finalText += t;
          else interimText += t;
        }
        if (finalText.trim()) {
          const clean = finalText.trim().replace(/[,，]+$/, '');
          if (clean) recognizeState.voiceFinalText += (recognizeState.voiceFinalText ? ' ' : '') + clean;
        }
        recognizeState.voiceInterimText = interimText.trim();
      };
      voiceRec.onerror = (e: any) => {
        const err = e?.error || '';
        if (err === 'not-allowed' || err === 'service-not-allowed') {
          recognizeState.voiceStatus = '语音识别被拒绝（请检查麦克风权限）';
          recognizeState.voiceStatusType = 'error';
        } else if (err === 'audio-capture') {
          recognizeState.voiceStatus = '无法访问麦克风';
          recognizeState.voiceStatusType = 'error';
        } else if (err === 'no-speech') {
          recognizeState.voiceStatus = '未检测到语音';
          recognizeState.voiceStatusType = '';
        } else {
          recognizeState.voiceStatus = `识别错误：${err || '未知'}`;
          recognizeState.voiceStatusType = 'error';
        }
        if (err === 'not-allowed' || err === 'service-not-allowed' || err === 'audio-capture') {
          voiceSessionActive = false;
          recognizeState.voiceRunning = false;
        }
      };
      voiceRec.onend = () => {
        recognizeState.voiceInterimText = '';
        if (!voiceSessionActive || !voiceRec) return;
        if (voiceRestartTimer) clearTimeout(voiceRestartTimer);
        voiceRestartTimer = setTimeout(() => {
          voiceRestartTimer = null;
          if (!voiceSessionActive || !voiceRec) return;
          try { voiceRec.start(); }
          catch {
            voiceSessionActive = false;
            recognizeState.voiceRunning = false;
            recognizeState.voiceStatus = '语音已停止';
            recognizeState.voiceStatusType = '';
          }
        }, 250);
      };
    }
    voiceSessionActive = true;
    recognizeState.voiceRunning = true;
    recognizeState.voiceStatus = '正在聆听…';
    recognizeState.voiceStatusType = '';
    try { voiceRec.start(); } catch { /* already started */ }
  } catch (e: any) {
    recognizeState.voiceRunning = false;
    recognizeState.voiceStatus = '启动失败：' + (e?.message || '未知错误');
    recognizeState.voiceStatusType = 'error';
    pushToast('语音启动失败', 'error');
  }
}
export function stopVoiceRecognition(): void {
  voiceSessionActive = false;
  if (voiceRestartTimer) { clearTimeout(voiceRestartTimer); voiceRestartTimer = null; }
  recognizeState.voiceRunning = false;
  recognizeState.voiceStatus = '已停止';
  recognizeState.voiceStatusType = '';
  try { voiceRec?.stop?.(); } catch { /* ignore */ }
}
export function clearVoiceText(): void {
  recognizeState.voiceFinalText = '';
  recognizeState.voiceInterimText = '';
  recognizeState.voiceStatus = '';
  recognizeState.voiceStatusType = '';
}
export function applyVoiceToRecognizeText(): void {
  const t = (recognizeState.voiceFinalText + ' ' + recognizeState.voiceInterimText).trim();
  if (!t) { pushToast('没有可填入的文本', 'error'); return; }
  appendRecognizeText(t);
  clearVoiceText();
  pushToast('已填入识别文本');
}
export function applyVoiceToCandidates(): void {
  const t = (recognizeState.voiceFinalText + ' ' + recognizeState.voiceInterimText).trim();
  if (!t) { pushToast('没有可生成的文本', 'error'); return; }
  setRecognizeText(t);
  clearVoiceText();
  requestGenerateCandidates();
}
export function initRecognizeTools(): void { loadOcrApiKey(); }
