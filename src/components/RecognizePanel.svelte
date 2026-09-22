<script lang="ts">
  import { onMount } from 'svelte';
  import {
    app, currentProduct,
    recognizeState,
    initRecognizeTools, saveOcrApiKey,
    addOcrFiles, removeOcrFile, clearOcrFiles, startOcrRecognition,
    setRecognizeText, clearRecognizeText, requestGenerateCandidates,
    doGenerateCandidates,
    toggleCandidate, setCandidateGroup, toggleAllCandidates,
    applySelectedCandidates, applyAllRecognizedText,
    pushToast,
  } from '../lib/stores/app.svelte';

  let fileInputEl = $state<HTMLInputElement | null>(null);

  onMount(() => {
    initRecognizeTools();
  });

  // 组件卸载：清理 Object URL
  $effect(() => {
    return () => {
      clearOcrFiles();
    };
  });

  // 监听 generateSignal 计数器
  let lastSignal = 0;
  $effect(() => {
    const sig = recognizeState.generateSignal;
    if (sig === lastSignal) return;
    lastSignal = sig;
    doGenerateCandidates();
  });

  const selectedCount = $derived(
    recognizeState.candidates.filter((c) => c.checked).length,
  );
  const totalCount = $derived(recognizeState.candidates.length);

  function onFileChange(e: Event) {
    const input = e.target as HTMLInputElement;
    const files = Array.from(input.files || []);
    if (files.length) addOcrFiles(files);
    input.value = '';
  }

  function onPickFiles() {
    fileInputEl?.click();
  }

  const splitModeHint = $derived.by(() => {
    const m = recognizeState.splitMode;
    if (m === 'smart') return '智能：按换行 + 中文标点（，、；）+ 双空格切分；单个空格保留（避免切断"分类 数量"）。';
    if (m === 'comma') return '仅空格和逗号：按逗号 / 顿号 / 分号 / 双空格切分。';
    return '按行拆分：每行一个分类，不做标点切分。';
  });
</script>

<!-- ========== OCR Key ========== -->
<section class="box">
  <div class="box-head">
    <span class="box-title">🔑 OCR API Key</span>
  </div>
  <div class="info-field" style="margin-bottom:8px">
    <div class="field-label">OCR.space API Key（可留空使用 demo）</div>
    <div style="display:flex;gap:6px">
      <input
        type="text"
        value={recognizeState.ocrApiKey}
        placeholder="留空则使用 helloworld（次数受限）"
        oninput={(e) => (recognizeState.ocrApiKey = (e.target as HTMLInputElement).value)}
        style="flex:1"
      />
      <button class="mini-batch-btn" onclick={() => saveOcrApiKey(recognizeState.ocrApiKey)}>
        保存
      </button>
    </div>
  </div>
  <p class="backup-note">
    ⚠️ Key 会以请求头发送到 ocr.space；仅存 sessionStorage，关闭标签页即清除。
  </p>
</section>

<!-- ========== 图片识别 ========== -->
<section class="box">
  <div class="box-head">
    <span class="box-title">📷 图片识别</span>
    <span class="box-badge">{recognizeState.ocrFiles.length} 张</span>
  </div>

  <input
    bind:this={fileInputEl}
    type="file"
    accept="image/*"
    multiple
    onchange={onFileChange}
    style="display:none"
  />

  <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
    <button class="mini-batch-btn" style="flex:1" onclick={onPickFiles}>
      🖼️ 从相册选择图片
    </button>
    <button
      class="mini-batch-btn danger"
      disabled={!recognizeState.ocrFiles.length || recognizeState.ocrRunning}
      onclick={clearOcrFiles}
    >清空</button>
  </div>

  {#if recognizeState.ocrPreviews.length}
    <div class="recognize-preview-grid">
      {#each recognizeState.ocrPreviews as url, i (url)}
        <div class="recognize-preview-item">
          <img src={url} alt="预览 {i + 1}" />
          <button
            class="recognize-preview-del"
            aria-label="删除第 {i + 1} 张"
            disabled={recognizeState.ocrRunning}
            onclick={() => removeOcrFile(i)}
          >✕</button>
        </div>
      {/each}
    </div>
  {/if}

  {#if recognizeState.ocrRunning || recognizeState.ocrProgress > 0}
    <div class="recognize-progress">
      <div
        class="recognize-progress-inner"
        style="width: {recognizeState.ocrProgress}%"
      ></div>
    </div>
  {/if}

  {#if recognizeState.ocrStatus}
    <div class="recognize-status {recognizeState.ocrStatusType}">
      {recognizeState.ocrStatus}
    </div>
  {/if}

  <button
    class="mini-batch-btn"
    style="width:100%;padding:10px"
    disabled={recognizeState.ocrRunning || !recognizeState.ocrFiles.length}
    onclick={startOcrRecognition}
  >{recognizeState.ocrRunning ? '识别中…' : '开始识别'}</button>
</section>

<!-- ========== 识别文本 ========== -->
<section class="box">
  <div class="box-head">
    <span class="box-title">📝 识别文本</span>
  </div>

  <div class="info-field" style="margin-bottom:8px">
    <div class="field-label">拆分方式</div>
    <select
      aria-label="拆分方式"
      value={recognizeState.splitMode}
      onchange={(e) =>
        (recognizeState.splitMode = (e.target as HTMLSelectElement).value as any)}
    >
      <option value="smart">智能拆分</option>
      <option value="comma">仅空格和逗号</option>
      <option value="line">按行拆分</option>
    </select>
    <p class="backup-note" style="margin-top:6px">{splitModeHint}</p>
  </div>

  <textarea
    bind:value={recognizeState.text}
    placeholder="粘贴 OCR / 语音 / 手工文本…"
    style="width:100%;min-height:100px;padding:10px;font-size:13.5px;line-height:1.7;border:1.5px solid var(--c-border);border-radius:10px;background:var(--c-surface);color:var(--c-text);outline:none;resize:vertical;font-family:inherit;margin-bottom:8px"
  ></textarea>

  <div style="display:flex;gap:8px;flex-wrap:wrap">
    <button
      class="mini-batch-btn"
      style="flex:1"
      onclick={requestGenerateCandidates}
    >🔍 生成候选列表</button>
    <button
      class="mini-batch-btn"
      disabled={!recognizeState.text.trim()}
      onclick={applyAllRecognizedText}
    >全部应用</button>
    <button
      class="mini-batch-btn danger"
      disabled={!recognizeState.text && !recognizeState.candidates.length}
      onclick={clearRecognizeText}
    >清空</button>
  </div>
</section>

<!-- ========== 候选列表 ========== -->
{#if recognizeState.candidates.length}
  <section class="box">
    {#if recognizeState.candidatesSourcePid && recognizeState.candidatesSourcePid !== currentProduct()?.id}
      <div class="recognize-status warn">
        ⚠️ 候选生成于其他产品，请重新生成
      </div>
    {/if}
    <div class="recognize-candidate-list">
      <div class="recognize-candidate-head">
        <span>共 {totalCount} 项 · 已选 {selectedCount} 项</span>
        <div style="display:flex;gap:6px">
          <button class="mini-batch-btn" style="padding:3px 9px;font-size:11.5px"
                  onclick={() => toggleAllCandidates(true)}>全选</button>
          <button class="mini-batch-btn" style="padding:3px 9px;font-size:11.5px"
                  onclick={() => toggleAllCandidates(false)}>取消全选</button>
        </div>
      </div>

      {#each recognizeState.candidates as c (c.id)}
        <div class="recognize-candidate-row" class:matched={c.matched}>
          <label style="display:inline-flex;align-items:center;gap:8px;flex:1;min-width:0">
            <input
              type="checkbox"
              checked={c.checked}
              onchange={() => toggleCandidate(c.id)}
            />
            <span style="flex:1;min-width:0;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">
              {c.text}
            </span>
          </label>

          {#if c.matched}
            <span class="mini-batch-btn" style="cursor:default;pointer-events:none">
              已有：{currentProduct()?.groups.find((g) => g.id === c.groupId)?.name || '?'}
            </span>
          {:else}
            <select
              aria-label="目标分组"
              value={c.groupId}
              onchange={(e) => setCandidateGroup(c.id, (e.target as HTMLSelectElement).value)}
              style="font-size:12px;padding:3px 6px;border:1.5px solid var(--c-border);border-radius:6px;background:var(--c-surface);color:var(--c-text);max-width:130px"
            >
              <option value="__auto__">「识别新增」</option>
              {#each currentProduct()?.groups ?? [] as g (g.id)}
                <option value={g.id}>{g.name}</option>
              {/each}
            </select>
          {/if}
        </div>
      {/each}
    </div>

    <button
      class="mini-batch-btn"
      style="width:100%;padding:11px;margin-top:10px;font-size:13.5px;background:linear-gradient(135deg,var(--c-primary),var(--c-primary-2));color:#fff;border:none"
      disabled={!selectedCount}
      onclick={applySelectedCandidates}
    >应用选中的 {selectedCount} 项</button>
  </section>
{/if}
