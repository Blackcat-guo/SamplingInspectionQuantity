<script lang="ts">
  import { pushToast, logOperation } from '../lib/stores/app.svelte';

  let { onFillText } = $props<{ onFillText: (text: string) => void }>();

  type SR = any;
  const SRClass: SR =
    typeof window !== 'undefined'
      ? (window as any).SpeechRecognition || (window as any).webkitSpeechRecognition
      : null;

  const secure = typeof window !== 'undefined' && window.isSecureContext;
  const supported = !!SRClass && secure;

  let listening = $state(false);
  let finalText = $state('');
  let interimText = $state('');
  let rec: SR = null;

  function start() {
    if (!supported) {
      pushToast('当前浏览器不支持语音识别', 'error');
      return;
    }
    try {
      rec = new SRClass();
      rec.lang = 'zh-CN';
      rec.continuous = true;
      rec.interimResults = true;

      rec.onresult = (e: any) => {
        let fin = '', inter = '';
        for (let i = e.resultIndex; i < e.results.length; i++) {
          const r = e.results[i];
          if (r.isFinal) fin += r[0].transcript;
          else inter += r[0].transcript;
        }
        if (fin) finalText += fin;
        interimText = inter;
      };
      rec.onerror = (e: any) => {
        if (e.error === 'not-allowed') pushToast('麦克风未授权', 'error');
        else if (e.error === 'no-speech') { /* ignore */ }
        else pushToast('语音识别出错：' + e.error, 'error');
      };
      rec.onend = () => {
        // continuous 模式下浏览器可能自动结束，需要重启
        if (listening) {
          try { rec.start(); } catch { /* ignore */ }
        }
      };

      rec.start();
      listening = true;
    } catch (e: any) {
      pushToast('无法启动语音识别：' + (e?.message || '未知错误'), 'error');
    }
  }

  function stop() {
    listening = false;
    try { rec?.stop(); } catch { /* ignore */ }
    rec = null;
  }

  function fill() {
    const t = (finalText + interimText).trim();
    if (!t) {
      pushToast('没有识别到文本', 'error');
      return;
    }
    onFillText(t);
    logOperation('语音填入识别文本');
    pushToast('已填入识别文本');
  }

  function clear() {
    finalText = '';
    interimText = '';
  }
</script>

{#if supported}
  <section class="box">
    <div class="box-head">
      <span class="box-title">🎤 语音输入</span>
      <span class="box-badge">{listening ? '识别中…' : '待机'}</span>
    </div>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:8px">
      {#if !listening}
        <button
          class="mini-batch-btn"
          onclick={start}
          style="flex:1;padding:10px;font-size:13px"
        >▶ 开始语音</button>
      {:else}
        <button
          class="mini-batch-btn danger"
          onclick={stop}
          style="flex:1;padding:10px;font-size:13px"
        >■ 停止语音</button>
      {/if}
      <button class="mini-batch-btn" onclick={clear}>清空</button>
    </div>

    {#if finalText || interimText}
      <div
        style="padding:10px;background:var(--c-surface);border:1.5px solid var(--c-border);border-radius:9px;font-size:13.5px;line-height:1.7;min-height:40px;max-height:180px;overflow-y:auto"
      >
        {finalText}<span style="color:var(--c-text-3);font-style:italic">{interimText}</span>
      </div>
    {:else}
      <div style="font-size:12px;color:var(--c-text-3);padding:6px 0">
        点击「开始语音」并允许麦克风权限。
      </div>
    {/if}

    <div style="display:flex;gap:8px;margin-top:8px">
      <button
        class="mini-batch-btn"
        disabled={!finalText && !interimText}
        onclick={fill}
        style="flex:1"
      >填入识别文本</button>
    </div>
  </section>
{/if}