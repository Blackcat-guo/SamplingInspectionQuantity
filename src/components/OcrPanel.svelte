<script lang="ts">
  import { pushToast, logOperation, storage } from '../lib/stores/app.svelte';

  let { onFillText } = $props<{ onFillText: (text: string) => void }>();

  const SESSION_KEY = 'ocr_api_key_v1';
  const DEFAULT_KEY = 'helloworld'; // OCR.space demo key（次数受限）

  let apiKey = $state('');
  let files = $state<{ id: string; file: File; url: string; name: string }[]>([]);
  let busy = $state(false);
  let progress = $state(0);
  let status = $state('');

  $effect(() => {
    try {
      const saved = sessionStorage.getItem(SESSION_KEY);
      apiKey = saved || '';
    } catch { /* ignore */ }
  });

  function saveKey(v: string) {
    apiKey = v;
    try {
      if (v) sessionStorage.setItem(SESSION_KEY, v);
      else sessionStorage.removeItem(SESSION_KEY);
    } catch { /* ignore */ }
  }

  function onPick(e: Event) {
    const input = e.target as HTMLInputElement;
    const list = Array.from(input.files || []);
    list.forEach((f) => {
      if (f.size > 2_000_000) {
        pushToast(`${f.name} 超过 2MB，建议压缩后再上传`, 'error', 2600);
        return;
      }
      files = [
        ...files,
        {
          id: Date.now().toString(36) + Math.random().toString(36).slice(2, 6),
          file: f,
          url: URL.createObjectURL(f),
          name: f.name,
        },
      ];
    });
    input.value = '';
  }

  function removeFile(id: string) {
    const t = files.find((x) => x.id === id);
    if (t) URL.revokeObjectURL(t.url);
    files = files.filter((x) => x.id !== id);
  }

  function clearAll() {
    files.forEach((f) => URL.revokeObjectURL(f.url));
    files = [];
    progress = 0;
    status = '';
  }

  async function recognizeOne(entry: { file: File }): Promise<string> {
    const fd = new FormData();
    fd.append('file', entry.file);
    fd.append('language', 'chs');
    fd.append('isOverlayRequired', 'false');
    fd.append('OCREngine', '2');
    fd.append('scale', 'true');

    const res = await fetch('https://api.ocr.space/parse/image', {
      method: 'POST',
      headers: { apikey: apiKey || DEFAULT_KEY },
      body: fd,
    });
    const data: any = await res.json();
    if (data?.IsErroredOnProcessing) {
      throw new Error((data.ErrorMessage || []).join(' ') || 'OCR 失败');
    }
    const parsed = data?.ParsedResults || [];
    return parsed.map((p: any) => p.ParsedText || '').join('\n');
  }

  async function run() {
    if (!files.length) {
      pushToast('请先选择图片', 'error');
      return;
    }
    if (busy) return;
    busy = true;
    progress = 0;
    status = `识别中… 0/${files.length}`;

    let done = 0, ok = 0, fail = 0;
    const texts: string[] = [];

    await Promise.allSettled(
      files.map(async (f) => {
        try {
          const t = await recognizeOne(f);
          if (t.trim()) { texts.push(t.trim()); ok++; }
          else fail++;
        } catch {
          fail++;
        } finally {
          done++;
          progress = Math.round((done / files.length) * 100);
          status = `识别中… ${done}/${files.length}`;
        }
      }),
    );

    busy = false;
    status = `完成：成功 ${ok} / 失败 ${fail}`;
    if (texts.length) {
      onFillText(texts.join('\n'));
      logOperation(`OCR 识别 ${ok} 张图片`);
      pushToast(`已填入识别文本（成功 ${ok} 张）`);
    } else {
      pushToast('未识别到文本', 'error');
    }
  }
</script>

<section class="box">
  <div class="box-head">
    <span class="box-title">🖼️ 图片 OCR</span>
    <span class="box-badge">{files.length} 张</span>
  </div>

  <div class="info-field" style="margin-bottom:8px">
    <label>OCR.space API Key（可留空使用 demo key）</label>
    <input
      type="text"
      value={apiKey}
      placeholder="留空则使用 helloworld（次数受限）"
      oninput={(e) => saveKey((e.target as HTMLInputElement).value)}
    />
    <div style="font-size:11px;color:var(--c-text-3);margin-top:4px">
      仅存于 sessionStorage，关闭标签页即清除；请勿在公共设备使用。
    </div>
  </div>

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <label
      class="mini-batch-btn"
      style="cursor:pointer;flex:1;text-align:center;padding:10px"
    >
      ＋ 选择图片
      <input type="file" accept="image/*" multiple onchange={onPick} style="display:none" />
    </label>
    <button class="mini-batch-btn danger" onclick={clearAll} disabled={busy}>清空</button>
  </div>

  {#if files.length}
    <div
      style="display:grid;grid-template-columns:repeat(auto-fill,minmax(72px,1fr));gap:6px;margin-bottom:8px"
    >
      {#each files as f (f.id)}
        <div style="position:relative">
          <img
            src={f.url}
            alt={f.name}
            style="width:100%;height:72px;object-fit:cover;border-radius:8px;border:1.5px solid var(--c-border)"
          />
          <button
            onclick={() => removeFile(f.id)}
            disabled={busy}
            style="position:absolute;top:2px;right:2px;width:20px;height:20px;border:none;border-radius:50%;background:rgba(0,0,0,.55);color:#fff;font-size:11px;cursor:pointer;line-height:1"
          >✕</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if busy || progress > 0}
    <div
      style="height:6px;background:var(--c-bg-soft);border-radius:4px;overflow:hidden;margin-bottom:6px"
    >
      <div
        style="height:100%;background:linear-gradient(90deg,var(--c-primary),var(--c-primary-2));width:{progress}%;transition:width .3s"
      ></div>
    </div>
  {/if}

  {#if status}
    <div style="font-size:12px;color:var(--c-text-3);margin-bottom:6px">{status}</div>
  {/if}

  <button
    class="mini-batch-btn"
    disabled={busy || !files.length}
    onclick={run}
    style="width:100%;padding:10px;font-size:13px"
  >{busy ? '识别中…' : '开始识别'}</button>
</section>