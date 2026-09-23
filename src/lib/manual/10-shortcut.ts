const section = {
  id: 'shortcut',
  title: '第十章 · 快捷键',
  content: `
<h4>10.1 全局快捷键</h4>
<table style="width:100%;border-collapse:collapse">
  <tr><td><kbd>Ctrl</kbd>+<kbd>Z</kbd></td><td>撤回上一步操作</td></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>Shift</kbd>+<kbd>Z</kbd></td><td>恢复（重做）</td></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>[</kbd></td><td>折叠全部分组</td></tr>
  <tr><td><kbd>Ctrl</kbd>+<kbd>]</kbd></td><td>展开全部分组</td></tr>
  <tr><td><kbd>Esc</kbd></td><td>关闭当前弹窗 / 关闭下拉</td></tr>
</table>
<h4>10.2 分组内快捷键</h4>
<ul>
  <li>聚焦 ⠿ 按 <kbd>Enter</kbd> → 进入键盘排序</li>
  <li>排序中 <kbd>↑</kbd>/<kbd>↓</kbd> → 上/下移</li>
  <li>排序中 <kbd>Esc</kbd> → 退出排序</li>
</ul>
<blockquote>📘 <b>案例：撤回误删</b><br>
① 误删了「分组A」 → 立刻按 <kbd>Ctrl</kbd>+<kbd>Z</kbd><br>
② Toast 显示「已撤回：删除分组「分组A」」<br>
③ 分组恢复原位<br>
④ 撤回栈容量上限（50 步 / 4MB），超限自动丢弃最早记录
</blockquote>
`,
};
export default section;