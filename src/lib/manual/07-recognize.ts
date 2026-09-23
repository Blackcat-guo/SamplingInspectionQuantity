const section = {
  id: 'recognize',
  title: '第七章 · 识别工具',
  content: `
<h4>7.1 语音输入</h4>
<p><b>环境要求</b>：HTTPS 或 localhost，且浏览器支持 <code>SpeechRecognition</code> API。不满足条件时语音面板自动隐藏。</p>
<ol>
  <li>点「🎤 开始语音」→ 首次会请求麦克风权限</li>
  <li>对着麦克风说话，实时文本区显示识别结果（灰色斜体为临时结果）</li>
  <li>点「停止语音」→ 点「填入识别文本」或「生成候选列表」</li>
</ol>
<blockquote>📘 <b>案例：语音录入分类A</b><br>
① 点「开始语音」，说「分类A 分类B 分类C」<br>
② 点「停止语音」<br>
③ 点「生成候选列表」→ 候选表出现 3 项<br>
④ 点「应用选中的 3 项」→ 落入「识别新增」组
</blockquote>
<h4>7.2 图片识别（OCR）</h4>
<p>调用 OCR.space 的 HTTPS 接口（无需后端）。API Key 存 sessionStorage，关闭标签页即清除。</p>
<ol>
  <li>在「OCR API Key」输入框填入 Key（可留空使用 demo key，次数受限）</li>
  <li>点「从相册选择图片」→ 可多选（建议 ≤ 2MB/张）</li>
  <li>点「开始识别」→ 进度条走完，识别文本自动追加到下方文本区</li>
</ol>
<h4>7.3 识别文本与候选列表</h4>
<p>文本来源：语音 / OCR / 手动粘贴。三种拆分方式：智能 / 仅空格和逗号 / 按行拆分。</p>
<blockquote>📘 <b>端到端流程</b><br>
① 微信收到不良品照片，保存到相册<br>
② 打开本应用 → 选中「产品1」<br>
③ 识别工具区 → 「从相册选择图片」→ 选 2 张<br>
④ 点「开始识别」→ 文本区自动填入「分类A 分类B 分类C」<br>
⑤ 点「生成候选列表」→ 3 项全部未命中<br>
⑥ 目标分组选「分组A」→ 点「应用选中的 3 项」<br>
⑦ 分组A 出现 3 个分类，数量均为 1<br>
⑧ 按 <kbd>Ctrl</kbd>+<kbd>Z</kbd> 可整体撤回
</blockquote>
`,
};
export default section;