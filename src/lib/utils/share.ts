import { copyText } from './copy';

export const APP_SCHEMES: Record<string, string> = {
  weixin: 'weixin://',
  dingtalk: 'dingtalk://',
  feishu: 'feishu://',
  qq: 'mqq://',
};

export const APP_LABELS: Record<string, string> = {
  weixin: '微信', dingtalk: '钉钉', feishu: '飞书', qq: 'QQ', mail: '邮件',
};

export function supportsSystemShare(): boolean {
  return typeof navigator !== 'undefined' && typeof navigator.share === 'function';
}

export async function shareSystem(text: string): Promise<'ok' | 'abort' | 'fail'> {
  if (!supportsSystemShare()) return 'fail';
  try {
    await navigator.share({ title: '抽检汇总', text });
    return 'ok';
  } catch (e: any) {
    if (e && e.name === 'AbortError') return 'abort';
    return 'fail';
  }
}

export async function shareToApp(
  app: string,
  text: string,
  compat: boolean,
): Promise<{ ok: boolean; message: string }> {
  const url = app === 'mail'
    ? 'mailto:?body=' + encodeURIComponent(text)
    : APP_SCHEMES[app];
  if (!url) return { ok: false, message: '不支持的目标应用' };
  const label = APP_LABELS[app] || app;
  const copied = await copyText(text, compat);
  if (!copied) return { ok: false, message: '复制失败，请手动复制' };
  try {
    window.location.href = url;
    return { ok: true, message: app === 'mail' ? '已复制并尝试打开邮件客户端' : `已复制并尝试打开 ${label}，请手动粘贴` };
  } catch {
    return { ok: false, message: `已复制，请手动打开 ${label} 并粘贴` };
  }
}
