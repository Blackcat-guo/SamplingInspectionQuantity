<script lang="ts">
  import Dialog from './Dialog.svelte';
  import { pushToast, storage } from '../lib/stores/app.svelte';
  import { copyText } from '../lib/utils/copy';
  import {
    parseTimeToMinutes, minutesToTime, formatTimeRange, formatDuration,
  } from '../lib/utils/time';

  let { open = $bindable(false) } = $props<{ open: boolean }>();

  let start = $state('09:00');
  let end = $state('18:00');
  let breaks = $state<{ start: string; end: string }[]>([]);

  const OVERTIME_START = 18 * 60;
  const STANDARD_WORK = 8 * 60;
  const MAX_BREAKS = 10;

  $effect(() => {
    try {
      const raw = localStorage.getItem(storage.WORK_TIME_KEY);
      if (!raw) return;
      const d = JSON.parse(raw);
      if (typeof d.start === 'string') start = d.start;
      if (typeof d.end === 'string') end = d.end;
      if (Array.isArray(d.breaks)) breaks = d.breaks.slice(0, MAX_BREAKS);
    } catch { /* ignore */ }
  });

  function persist() {
    try { localStorage.setItem(storage.WORK_TIME_KEY, JSON.stringify({ start, end, breaks })); }
    catch { /* ignore */ }
  }

  const result = $derived.by(() => {
    const s = parseTimeToMinutes(start);
    const rawEnd = parseTimeToMinutes(end);
    const empty = {
      valid: false, workRange: '—', overtimeRange: '—',
      totalDuration: '—', breakDuration: '—', actualDuration: '—', overtimeDuration: '—',
      hasOvertime: false,
    };
    if (s === null || rawEnd === null) return empty;
    let e = rawEnd;
    let crossDay = false;
    if (e < s) { e += 1440; crossDay = true; }
    const total = e - s;
    if (total <= 0) return empty;
    const rawIntervals: { start: number; end: number }[] = [];
    breaks.forEach((b) => {
      let bs = parseTimeToMinutes(b.start);
      let be = parseTimeToMinutes(b.end);
      if (bs === null || be === null) return;
      if (be < bs) be += 1440;
      const cands = [[bs, be], [bs + 1440, be + 1440]] as const;
      let best: { start: number; end: number; d: number } | null = null;
      cands.forEach(([a, b2]) => {
        const vs = Math.max(a, s), ve = Math.min(b2, e);
        const d = ve - vs;
        if (d > 0 && (!best || d > best.d)) best = { start: vs, end: ve, d };
      });
      if (best) rawIntervals.push({ start: best.start, end: best.end });
    });
    rawIntervals.sort((a, b) => a.start - b.start);
    const merged: { start: number; end: number }[] = [];
    rawIntervals.forEach((iv) => {
      const last = merged[merged.length - 1];
      if (last && iv.start <= last.end) { if (iv.end > last.end) last.end = iv.end; }
      else merged.push({ ...iv });
    });
    const totalBreak = merged.reduce((acc, iv) => acc + (iv.end - iv.start), 0);
    const actual = Math.max(0, total - totalBreak);
    const overtime = Math.max(0, actual - STANDARD_WORK);
    const otStart = Math.max(s, OVERTIME_START);
    const hasOt = overtime > 0 && e > otStart;
    return {
      valid: true, crossDay,
      workRange: formatTimeRange(s, e),
      overtimeRange: hasOt ? formatTimeRange(otStart, e) : '—',
      totalDuration: formatDuration(total),
      breakDuration: totalBreak > 0 ? formatDuration(totalBreak) : '无',
      actualDuration: formatDuration(actual),
      overtimeDuration: formatDuration(overtime),
      hasOvertime: overtime > 0,
    };
  });

  function addBreak() {
    if (breaks.length >= MAX_BREAKS) { pushToast(`最多 ${MAX_BREAKS} 段`, 'error'); return; }
    const last = breaks[breaks.length - 1];
    let s = '12:00', e = '13:00';
    if (last) {
      const le = parseTimeToMinutes(last.end);
      if (le !== null) { s = minutesToTime(le); e = minutesToTime(le + 60); }
    }
    breaks = [...breaks, { start: s, end: e }];
    persist();
  }
  function removeBreak(i: number) { breaks = breaks.filter((_, k) => k !== i); persist(); }
  async function copyOne(text: string, label: string) {
    const ok = await copyText(text, false);
    pushToast(ok ? `已复制${label}` : '复制失败', ok ? 'success' : 'error');
  }
</script>

<Dialog bind:open title="⏱️ 计算工时" subtitle="下班早于上班按跨天处理；18:00 之后计为加班。">
  <div class="dialog-list">
    <div class="info-grid">
      <div class="info-field">
        <div class="field-label">上班时间</div>
        <input type="time" bind:value={start} onchange={persist} />
      </div>
      <div class="info-field">
        <div class="field-label">下班时间</div>
        <input type="time" bind:value={end} onchange={persist} />
      </div>
    </div>

    <div class="break-section">
      <div class="break-title">
        <span>🍽️ 休息时间段</span>
        {#if breaks.length}<span style="font-size:11px;color:var(--c-text-3)">共 {breaks.length} 段</span>{/if}
      </div>
      {#each breaks as b, i (i)}
        <div class="break-row">
          <input type="time" bind:value={b.start} onchange={persist} />
          <span class="break-sep">~</span>
          <input type="time" bind:value={b.end} onchange={persist} />
          <button class="break-del" onclick={() => removeBreak(i)}>✕</button>
        </div>
      {/each}
      {#if !breaks.length}
        <div style="font-size:11.5px;color:var(--c-text-4);padding:6px 0">暂未设置休息时间。</div>
      {/if}
      <button class="break-add" disabled={breaks.length >= MAX_BREAKS} onclick={addBreak}>
        ＋ 添加休息时间段
      </button>
    </div>

    <div class="work-result">
      <div class="work-result-row"><span class="wr-label">工作时间段</span><span class="wr-value">{result.valid ? result.workRange : '—'}</span></div>
      <div class="work-result-row"><span class="wr-label">总上班时间</span><span class="wr-value">{result.valid ? result.totalDuration : '—'}</span></div>
      <div class="work-result-row"><span class="wr-label">休息扣除</span><span class="wr-value">{result.valid ? result.breakDuration : '—'}</span></div>
      <div class="work-result-row"><span class="wr-label">实际工作时长</span><span class="wr-value">{result.valid ? result.actualDuration : '—'}</span></div>
      <div class="work-result-row"><span class="wr-label">加班时间段</span><span class="wr-value">{result.valid ? result.overtimeRange : '—'}</span></div>
      <div class="work-result-row highlight"><span class="wr-label">加班时长</span><span class="wr-value">{result.valid ? result.overtimeDuration : '—'}</span></div>
    </div>

    <div class="work-copy-row">
      <button class="work-copy-btn" disabled={!result.valid}
              onclick={() => copyOne(result.workRange, '时间段')}>📋 复制时间段</button>
      <button class="work-copy-btn" disabled={!result.hasOvertime || result.overtimeRange === '—'}
              onclick={() => copyOne(result.overtimeRange, '加班段')}>📋 复制加班段</button>
      <button class="work-copy-btn primary" disabled={!result.valid}
              onclick={() => copyOne(result.overtimeDuration, '加班时长')}>📋 复制加班时长</button>
    </div>
  </div>

  <div class="dialog-actions" style="margin-top:12px">
    <button class="cancel" onclick={() => (open = false)}>关闭</button>
  </div>
</Dialog>
