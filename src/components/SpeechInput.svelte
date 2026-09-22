<script lang="ts">
  import {
    recognizeState, startVoiceRecognition, stopVoiceRecognition,
    clearVoiceText, applyVoiceToRecognizeText, applyVoiceToCandidates,
    isSecureContext, hasMediaDevices, hasSpeechRecognition,
    pushToast,
  } from '../lib/stores/app.svelte';
  import { onMount } from 'svelte';

  let envSecure = $state(false);
  let envMic = $state(false);
  let envSR = $state(false);
  let envMicGranted = $state(false);

  function refreshEnv() {
    envSecure = isSecureContext();
    envMic = hasMediaDevices();
    envSR = hasSpeechRecognition();
  }

  onMount(() => {
    refreshEnv();
  });

  const canRender = $derived(envSecure && envSR);

  const badge = $derived.by(() => {
    if (!envSecure) return { text: '非安全环境', cls: 'error' };
    if (!envMic) return { text: 'API 不可用', cls: 'error' };
    if (!envSR) return { text: '不支持识别', cls: 'error' };
    if (!envMicGranted && !recognizeState.voiceRunning) return { text: '待授权', cls: 'warn' };
    if (recognizeState.voiceRunning) return { text: '识别中', cls: 'success' };
    return { text: '已就绪', cls: 'success' };
  });

  async function requestMic() {
    if (!envMic) {
      pushToast('当前浏览器不支持麦克风 API', 'error');
      return;
    }
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      stream.getTracks().forEach((t) => t.stop());
      envMicGranted = true;
      pushToast('麦克风已授权');
    } catch {
      envMicGranted = false;
      pushToast('麦克风授权被拒绝', 'error');
    }
  }

  async function copyUrl() {
    try {
      await navigator.clipboard.writeText(location.href);
      pushToast('已复制当前地址');
    } catch {
      pushToast('复制失败', 'error');
    }
  }

  const hasText = $derived(
    !!(recognizeState.voiceFinalText || recognizeState.voiceInterimText),
  );
</script>

{#if canRender}
  <section class="box">
    <div class="box-head">
      <span class="box-title">🎤 语音输入</span>
      <span class="box-badge recognize-badge-{badge.cls}">{badge.text}</span>
    </div>

    <div class="voice-env-card">
      <div class="voice-env-row">
        <span>安全上下文（HTTPS）</span>
        <span class="voice-env-val">{envSecure ? '✓' : '✗'}</span>
      </div>
      <div class="voice-env-row">
        <span>麦克风 API</span>
        <span class="voice-env-val">{envMic ? '✓' : '✗'}</span>
      </div>
      <div class="voice-env-row">
        <span>语音识别 API</span>
        <span class="voice-env-val">{envSR ? '✓' : '✗'}</span>
      </div>
      <div class="voice-env-actions">
        <button class="mini-batch-btn" onclick={refreshEnv}>🔄 重新检测</button>
        <button class="mini-batch-btn" onclick={copyUrl}>📋 复制地址</button>
        {#if envMic && !envMicGranted}
          <button class="mini-batch-btn" onclick={requestMic}>🎤 申请权限</button>
        {/if}
      </div>
    </div>

    <div class="voice-actions">
      {#if !recognizeState.voiceRunning}
        <button
          class="mini-batch-btn"
          style="flex:1;padding:10px"
          onclick={startVoiceRecognition}
        >🎤 开始语音</button>
      {:else}
        <button
          class="mini-batch-btn danger"
          style="flex:1;padding:10px"
          onclick={stopVoiceRecognition}
        >⏹ 停止语音</button>
      {/if}
      {#if hasText}
        <button class="mini-batch-btn" onclick={clearVoiceText}>清空</button>
      {/if}
    </div>

    <div class="voice-text-area">
      {#if hasText}
        <span class="recognize-voice-final">{recognizeState.voiceFinalText}</span>
        {#if recognizeState.voiceInterimText}
          <span class="recognize-voice-interim">{recognizeState.voiceInterimText}</span>
        {/if}
      {:else}
        <span style="color:var(--c-text-3);font-size:12.5px">
          点击「开始语音」并允许麦克风权限，然后开始说话…
        </span>
      {/if}
    </div>

    {#if recognizeState.voiceStatus}
      <div class="recognize-status {recognizeState.voiceStatusType}">
        {recognizeState.voiceStatus}
      </div>
    {/if}

    <div class="voice-apply-row">
      <button
        class="mini-batch-btn"
        disabled={!hasText}
        onclick={applyVoiceToRecognizeText}
      >填入识别文本</button>
      <button
        class="mini-batch-btn"
        disabled={!hasText}
        onclick={applyVoiceToCandidates}
      >生成候选列表</button>
    </div>
  </section>
{/if}
