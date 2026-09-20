import type { Product, DataPresets, Settings } from './schema';

export const CMD = {
  QTY: 'qty', TOTAL: 'total', INC: 'inc', NAME: 'name',
  FIELD: 'field', GLOBAL: 'global', SNAP: 'snap',
} as const;
export type CmdType = typeof CMD[keyof typeof CMD];

export interface Cmd {
  t: CmdType;
  label?: string;
  pid?: string;
  gid?: string;
  key?: string;
  field?: string;
  kind?: string;
  from?: any; to?: any;
  fromAuto?: boolean; toAuto?: boolean;
  data?: string;
  cur?: string;
}

interface HistoryEntry { cmd: Cmd; at: number; size: number; }

const HISTORY_MERGE_WINDOW = 500;
const HISTORY_MAX_ENTRIES = 50;
const HISTORY_MAX_BYTES = 4 * 1024 * 1024;

export function createHistory() {
  let past = $state<HistoryEntry[]>([]);
  let future = $state<HistoryEntry[]>([]);
  let memBytes = $state(0);

  function cmdSize(cmd: Cmd): number {
    if (cmd.t === CMD.SNAP || cmd.t === CMD.GLOBAL) return (cmd.data ? cmd.data.length : 0) * 2;
    return 200;
  }

  function sameTarget(a: Cmd, b: Cmd): boolean {
    if (!a || !b || a.t !== b.t) return false;
    if (a.t === CMD.QTY) return a.pid === b.pid && a.gid === b.gid && a.key === b.key;
    if (a.t === CMD.TOTAL) return a.pid === b.pid && a.gid === b.gid;
    if (a.t === CMD.INC) return a.pid === b.pid;
    if (a.t === CMD.FIELD) return a.pid === b.pid && a.field === b.field;
    if (a.t === CMD.NAME) {
      if (a.pid !== b.pid || a.kind !== b.kind) return false;
      if (a.kind === 'group') return a.gid === b.gid;
      if (a.kind === 'item') return a.gid === b.gid && a.key === b.key;
      if (a.kind === 'preset') return a.key === b.key;
      return true;
    }
    return false;
  }

  function trim(): void {
    while (past.length > HISTORY_MAX_ENTRIES || memBytes > HISTORY_MAX_BYTES) {
      if (past.length <= 1) break;
      const dropped = past.shift();
      memBytes -= dropped?.size ?? 0;
    }
    if (memBytes < 0) memBytes = 0;
  }

  function push(cmd: Cmd, guard = false): void {
    if (guard) return;
    const now = Date.now();
    const last = past[past.length - 1];
    if (last && now - last.at < HISTORY_MERGE_WINDOW && sameTarget(last.cmd, cmd)) {
      last.cmd.to = cmd.to;
      if (cmd.t === CMD.TOTAL) last.cmd.toAuto = cmd.toAuto;
      last.at = now;
      return;
    }
    const size = cmdSize(cmd);
    past.push({ cmd, at: now, size });
    memBytes += size;
    trim();
    future.length = 0;
  }

  return {
    get past() { return past },
    get future() { return future },
    get canUndo() { return past.length > 0 },
    get canRedo() { return future.length > 0 },
    push,
    pushSnapshot(products: Product[], pid: string, guard = false) {
      const p = products.find(x => x.id === pid);
      if (!p) return;
      push({ t: CMD.SNAP, pid, data: JSON.stringify(p) }, guard);
    },
    pushAllSnapshot(products: Product[], cur: string, label: string, guard = false) {
      push({ t: CMD.SNAP, pid: '__all__', label, cur, data: JSON.stringify(products) }, guard);
    },
    pushGlobalSnapshot(
      products: Product[],
      dataPresets: DataPresets,
      globalPresets: any[],
      settings: Settings,
      label: string,
      guard = false,
    ) {
      push({
        t: CMD.GLOBAL, label,
        data: JSON.stringify({ products, dataPresets, globalPresets, settings }),
      }, guard);
    },
    popPast(): HistoryEntry | undefined {
      const e = past.pop();
      if (e) memBytes = Math.max(0, memBytes - e.size);
      return e;
    },
    popFuture(): HistoryEntry | undefined { return future.pop(); },
    commitToFuture(e: HistoryEntry) { future.push(e); },
    commitToPast(e: HistoryEntry) {
      past.push(e);
      memBytes += e.size;
      trim();
    },
    clear() {
      past.length = 0;
      future.length = 0;
      memBytes = 0;
    },
    reset(products: Product[]) {
      past.length = 0;
      future.length = 0;
      memBytes = 0;
      past.push({
        cmd: { t: CMD.SNAP, pid: '__all__', data: JSON.stringify(products) },
        at: Date.now(), size: 0,
      });
    },
  };
}
