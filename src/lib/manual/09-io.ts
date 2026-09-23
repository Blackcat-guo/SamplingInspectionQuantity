const section = {
  id: 'io',
  title: '第九章 · 导入导出',
  content: `
<h4>9.1 两种导出</h4>
<ul>
  <li><b>导出数据</b>：弹窗中勾选需要的模块（产品 / 预设 / 设置）</li>
  <li><b>导入数据</b>：选文件 → 自动检测模块 → 勾选 + 选择模式</li>
</ul>
<h4>9.2 支持的文件格式</h4>
<ul>
  <li><code>.json</code>：标准格式，推荐</li>
  <li><code>.js</code>：支持 <code>export default {...}</code> / <code>const data = {...}</code> / <code>window.data = {...}</code></li>
</ul>
<blockquote>📘 <b>案例：备份 + 恢复</b><br>
① 设置 → 备份与恢复 → 「💾 导出数据」<br>
② 保持三模块全勾选 → 点「导出选中内容」<br>
③ 下载 <code>抽检数量统计_部分数据_日期.json</code> 保存到网盘<br>
④ 换设备后 → 「📥 导入数据」→ 选文件<br>
⑤ 弹窗显示摘要「N 产品 · M 客户 · K 供应商 · J 特殊分组」<br>
⑥ 保持「合并」模式 → 点「确认导入」→ Toast 提示「导入完成」
</blockquote>
<h4>9.3 覆盖模式</h4>
<p>选择「覆盖」模式时会二次确认，且自动清理负责人 ID 悬空引用。</p>
`,
};
export default section;