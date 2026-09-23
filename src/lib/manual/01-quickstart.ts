const section = {
  id: 'quickstart',
  title: '第一章 · 快速开始',
  content: `
<h4>1.1 三步上手</h4>
<ol>
  <li>左上角「＋ 添加产品」录入产品名</li>
  <li>「添加分组」→ 输入 3 或 1-3 批量创建</li>
  <li>在分组内添加分类并录入数量</li>
</ol>
<blockquote>📘 <b>案例：产品1 完整录入</b><br>
① 添加产品输入 <code>产品1</code><br>
② 添加分组输入 <code>3</code> → 得到「分组1 / 分组2 / 分组3」<br>
③ 在分组1 输入 <code>分类A</code> 回车<br>
④ 数量 +1 至 5，抽检数量设为 20<br>
⑤ 下方「本产品汇总」自动生成：
<pre>客户：客户A
供应商来料：供应商A
发生工序：工序A
料号及来料批量：
产品1，来料1000PCS
问题描述：
抽检20PCS,
分组1：分类A5PCS，不良率25%</pre>
</blockquote>
<h4>1.2 保存位置</h4>
<p>数据自动保存在浏览器 <code>localStorage</code>，键名 <code>category_counts_v5</code>。关闭页面不会丢失。</p>
`,
};
export default section;