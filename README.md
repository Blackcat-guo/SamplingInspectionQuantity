# 📦 抽检数量统计 (SamplingInspectionQuantity)

基于 **Svelte 5** 完全重构的抽检数量统计与多产品汇总工具。编译为**单文件 HTML**，完美适配手机 Chrome，支持完全离线使用，自动部署至 GitHub Pages。

> 💡 **核心优势**：Svelte 5 编译时框架，运行时开销极低，产物体积缩小 60%+；白屏风险极低；全部数据本地存储；识别工具（语音 / OCR）辅助录入；**v3.7 起采用"产品级抽检数量"模型，简化不良率计算**。

---

## ✨ 功能特性

### 📋 产品与分组
- **产品管理**：添加、重命名、复制、批量删除；样品标记；自然排序；快速搜索。
- **分组与分类**：
  - 「严重 / 主要 / 次要」一键标准分组
  - 支持 `5` / `3-7` / `1,3,5` / 自定义名称四种创建方式
  - 分类支持 ▲▼ 排序、`Alt+↑/↓` 快捷键、拖拽分组排序（长按 260ms）
  - 分组折叠/展开，折叠时显示分类预览
  - 键盘排序（聚焦 ⠿ → Enter → ↑↓ → Enter）

### 🧮 抽检数量（v3.7 重构）
- **产品级抽检数量**：每个产品只有一个抽检数量，所有分组共用。
- **AQL 自动计算**：根据来料数量自动计算参考抽检数（一般水平Ⅱ · AQL=1.0）。
- **快捷微调**：`[−] [数字] [+]` 一键调整。
- **智能联动**：
  - 手动修改抽检数量 → 所有分组同步
  - 修改来料数量 → 抽检数量**自动重置为 AQL 参考值**
  - 新增分组 → 自动使用当前抽检数量
- **不良率计算**：`组内数量之和 ÷ 抽检数量`，各组统一分母。

### 🔄 多产品汇总
- 支持**同供应商 + 同客户**的产品合并汇总。
- 两种输出格式：
  - **合并描述**：按分组名聚合，适合关联分析
  - **逐料号拆分**：每个产品独立一行，适合逐料号追溯
- 高度自定义汇总模板（`{customer}` / `{supplier}` / `{process}` / `{lotLines}` / `{samplingLine}` / `{summary}` / `{tempHandling}` / `{responsible}` 等占位符）。
- **本产品汇总**：单产品独立输出，支持前段 / 后段文本追加。

### 📚 数据预设
- **基础预设**：客户、供应商、来料数量、工序、临时处理方式。
- **负责人**：常规 / 特殊分组两类。
- **特殊分组**：命中任一分类即自动带出负责人；支持「仅样品触发」。
- **关联产品视图**：显示每个产品对特殊分组的命中 / 生效状态（三种过滤模式）。
- **共享预分类**：跨产品复用；支持生效范围三态（全部 / 部分 / 不生效）。
- **预分组**：一键新建包含预设分类的分组。
- **预分类**：网格布局 + 批量删除；分组内下拉三态显示（✓ / 其他组 / ＋）。

### 🎤 识别工具
- **语音输入**：基于 `SpeechRecognition`，实时转文本；含环境诊断卡。
- **图片 OCR**：基于 OCR.space API，支持多图上传、进度条、部分失败提示。
- **识别文本 → 候选列表**：
  - 三种拆分方式：智能 / 仅空格逗号 / 按行
  - 匹配已有分类自动 +1，未匹配落入指定分组或「识别新增」组
  - 支持全选 / 取消全选 / 应用选中项

### ⏱️ 工时计算
- 上下班时间、跨天处理、多段休息（最多 10 段，自动合并重叠）。
- 18:00 后计为加班；加班时长 = 实际工作 − 8 小时（不足按 0 计）。
- 一键复制：时间段 / 加班段 / 加班时长。

### 📂 本地存储与备份
- 全部数据保存在浏览器 `localStorage`（键名以 `category_counts_v5` 开头）。
- **自动备份**：最近 3 个版本，可恢复。
- **导出 / 导入**：支持勾选模块、合并 / 覆盖两种模式；支持 `.json` 和 `.js` 格式。
- **草稿**：每 30 秒自动保存，异常关闭后提示恢复。
- **操作日志**：最近 50 条，可清空。
- **一键清理**：孤儿数据清理 / 本地缓存清理。
- **顶部保存提示**：显示「已自动保存 HH:MM:SS」。

### 📤 分享与复制
- 系统分享（Web Share API，移动端推荐）
- 微信 / 钉钉 / 飞书 / QQ / 邮件（复制文本 + 跳转 App，需手动粘贴）
- 一键复制到剪贴板

### 🎨 主题与体验
- **主题**：浅色 / 深色 / 跟随系统。
- **体验等级**：自动 / 优雅 / 标准 / 兼容（按设备能力自动匹配）。
- **动画强度**：标准 / 舒缓 / 关闭。
- **全局字体大小**：小 / 标准 / 大。
- **紧凑模式**：一屏显示更多内容。
- **自定义确认弹窗**：支持「不再提示」。
- **快捷键**：`Ctrl+Z` / `Ctrl+Shift+Z` / `Ctrl+[` / `Ctrl+]` / `Esc`。

---

## 🛠️ 技术栈

| 项 | 值 |
|----|-----|
| 框架 | [Svelte 5](https://svelte.dev/) (Runes: `$state`, `$derived`, `$props`, `$effect`, `$bindable`) |
| 构建工具 | [Vite 6](https://vitejs.dev/) |
| 语言 | TypeScript |
| 单文件打包 | [vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile) |
| 部署 | GitHub Pages + GitHub Actions（Node 24） |
| 外部依赖 | 无（OCR 功能可选调用 OCR.space） |

---

## 📁 项目结构

```text
SamplingInspectionQuantity/
├── index.html                          # 入口 + 启动降级提示
├── package.json
├── svelte.config.js
├── tsconfig.json
├── vite.config.ts
├── README.md
└── src/
    ├── main.ts
    ├── App.svelte                      # 根组件
    ├── app.css                         # 全局样式
    ├── lib/
    │   ├── core/
    │   │   ├── schema.ts               # 数据定义 + 规范化
    │   │   ├── schema-helper.ts        # 安全 JSON 解析
    │   │   ├── sampling.ts             # AQL 抽检计算
    │   │   ├── template.ts             # 模板渲染
    │   │   ├── history.svelte.ts       # 撤回/恢复历史栈
    │   │   └── storage.ts              # localStorage 读写与备份
    │   ├── utils/
    │   │   ├── copy.ts                 # 复制兼容方案
    │   │   ├── share.ts                # 分享 API 封装
    │   │   └── time.ts                 # 工时计算工具
    │   └── stores/
    │       └── app.svelte.ts           # 全局状态 + 核心业务
    └── components/
        ├── Sidebar.svelte              # 侧栏产品列表
        ├── TopNav.svelte               # 顶部快捷导航
        ├── ProductInfo.svelte          # 产品信息 + 抽检数量
        ├── PresetPanel.svelte          # 预分类管理（网格）
        ├── GroupList.svelte            # 分组列表容器
        ├── GroupCard.svelte            # 单个分组卡片
        ├── MergePanel.svelte           # 多产品汇总
        ├── OutputPanel.svelte          # 本产品汇总
        ├── SpeechInput.svelte          # 语音输入面板
        ├── RecognizePanel.svelte       # OCR + 识别候选
        ├── WorkTimeDialog.svelte       # 工时计算弹窗
        ├── SettingsDialog.svelte       # 设置弹窗（含说明书）
        ├── DataPresetsDialog.svelte    # 数据预设弹窗
        ├── AddProductDialog.svelte     # 添加产品弹窗
        ├── ExportDialog.svelte         # 导出选项弹窗
        ├── ImportDialog.svelte         # 导入选项弹窗
        ├── ChoiceDialog.svelte         # 通用选择弹窗
        ├── TextEditDialog.svelte       # 通用文本编辑弹窗
        ├── ConfirmDialog.svelte        # 通用确认弹窗
        ├── NavGridDialog.svelte        # 通用导航网格弹窗
        ├── ShareMenu.svelte            # 分享菜单
        ├── Dialog.svelte               # 通用弹窗壳
        └── Toast.svelte                # 全局提示
```

---

🚀 快速开始

环境要求

· Node.js 24.x 或更高版本
· npm 或 yarn

安装与开发

```bash
# 1. 克隆仓库
git clone https://github.com/Blackcat-guo/SamplingInspectionQuantity.git
cd SamplingInspectionQuantity

# 2. 安装依赖
npm install

# 3. 启动本地开发服务（热更新）
npm run dev

# 4. 构建单文件 HTML（产物在 dist/index.html）
npm run build

# 5. 本地预览构建产物
npm run preview
```

---

🌐 部署到 GitHub Pages

本项目已配置好 GitHub Actions 自动化部署。

自动化部署配置

在项目根目录创建 .github/workflows/deploy.yml：

```yaml
name: Deploy to GitHub Pages

on:
  push:
    branches: [main]
  workflow_dispatch:

permissions:
  contents: read
  pages: write
  id-token: write

concurrency:
  group: pages
  cancel-in-progress: true

jobs:
  build:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v5
      - uses: actions/setup-node@v5
        with:
          node-version: '24'
      - run: npm install
      - run: npm run build
      - uses: actions/upload-pages-artifact@v3
        with:
          path: dist

  deploy:
    needs: build
    runs-on: ubuntu-latest
    environment:
      name: github-pages
      url: ${{ steps.deployment.outputs.page_url }}
    steps:
      - id: deployment
        uses: actions/deploy-pages@v4
```

开启 GitHub Pages

1. 进入仓库 Settings → Pages
2. Source 设置为 GitHub Actions
3. 等待 Actions 跑完（约 1–2 分钟）

访问地址：

```
https://Blackcat-guo.github.io/SamplingInspectionQuantity/
```

⚠️ 404 兜底：GitHub Pages 是纯静态托管，直接访问子路径会返回 404。请在项目根目录放置一个 404.html（内容与 index.html 一致），GitHub Pages 会自动用它作为兜底。

---

💾 数据存储与备份

项 说明
存储位置 浏览器 localStorage，键名以 category_counts_v5 开头
数据隔离 数据跟着浏览器走，换设备 / 换浏览器不会自动同步
自动备份 保留最近 3 个版本，可在「设置 → 备份与恢复 → 恢复最近版本」中找回
草稿 每 30 秒自动保存，异常关闭后恢复
手动备份 「设置 → 备份与恢复 → 导出数据」保存 JSON 文件到云盘
清理功能 「一键清理孤儿数据」/「清理本地缓存」
OCR Key 仅存 sessionStorage，关闭标签页自动清除

强烈建议定期导出备份。

---

📖 使用说明（核心流程）

首次使用

1. 左侧点击「＋ 添加产品」→ 输入料号、供应商、客户、来料数量。
2. 抽检数量会自动填入（基于 AQL 表）；如需调整可手动修改。
3. 点击「📋 标准分组」→ 生成「严重 / 主要 / 次要」。
4. 在分组内输入分类名 → 回车添加 → 通过 [−] [+] 或输入框调整数量。
5. 底部「本产品汇总」实时生成文本 → 点「📋 复制」粘贴到群里。

多产品汇总

1. 在多产品汇总面板勾选同供应商 + 同客户的产品。
2. 选择输出格式（合并描述 / 逐料号拆分）。
3. 点击「📋 复制」或「📤 分享」。

识别工具（v3.5+）

1. 语音：主面板「🎤 语音输入」→ 开始语音 → 说话 → 「生成候选列表」。
2. OCR：主面板「📷 图片识别」→ 选图 → 开始识别 → 识别文本会追加。
3. 候选应用：识别文本区 → 「生成候选列表」→ 勾选 → 「应用选中的 N 项」。

预分类与共享预分类

· 预分类（本产品）：主面板「预分类管理」区块，可增删改，支持批量。
· 共享预分类（全局）：「数据预设 → 共享预分类」，可设置生效范围。
· 分组内使用：分组内「📦 预分类 ▾」下拉，显示共享 + 本产品两栏，每项带三态图标。

---

⌨️ 快捷键

键 功能
Ctrl + Z 撤回上一步
Ctrl + Shift + Z 恢复
Ctrl + [ 折叠全部分组
Ctrl + ] 展开全部分组
Alt + ↑ / ↓ 上移 / 下移当前分类
Enter 确认输入 / 添加
Esc 关闭弹窗 / 取消
? 显示快捷键帮助（v3.7+）

---

📝 版本历史

v3.7（当前版本）

· 🎯 抽检数量模型重构：产品级 inspectionQty，所有分组共用；不良率 = 组内数量 / 抽检数量
· 🔧 修改来料数量自动重置抽检数量为 AQL 参考值
· 📦 预分类网格布局：一屏显示 20+ 个；支持批量删除
· 🎨 动画提速（.35s → .25s）+ 焦点效果增强
· 🔗 导航栏自动滚动：点击 Tab 自动居中
· ⚙️ 设置入口统一：[≡] [📚] 图标按钮
· ✨ 新功能：抽检数量快捷加减 / Ctrl+[ / Ctrl+] 折叠快捷键 / 顶部保存提示

v3.6

· 🎯 ChoiceDialog + TextEditDialog 通用弹窗（替换所有 prompt）
· 🔀 设置 ⇄ 数据预设弹窗切换（互斥）
· 🏷️ .badge-* 重命名为 .recognize-badge-*

v3.5

· 🎤 语音输入面板（含环境诊断）
· 📷 OCR 图片识别（多图 + 进度条）
· 📝 识别文本 → 候选列表 → 批量应用
· ✅ 自定义确认弹窗

v3.4

· 🏷️ 预分类三态（本组 / 其他组 / 全新）
· 🌐 共享预分类（生效范围三态）
· 🔀 弹窗导航网格（NavGridDialog）

v3.3

· 🖱️ 分组拖拽排序（长按 260ms）
· ⌨️ 键盘排序（Enter / ↑↓ / Esc）
· 📊 特殊分组关联产品表

v3.2

· 🐛 修复 20+ 编译错误与 a11y 警告
· 🎨 主题 / 体验等级 / 动画强度 / 字号
· 📚 说明书重写（9 章）

v3.1

· 项目起点（Svelte 5 重构）

---

📝 开发注意事项（Svelte 5）

1. 严禁混用 Vue 语法：本项目已完全迁移至 Svelte 5，请勿使用 ref / reactive / v-if 等。
2. Runes 语法要求：
   · $state 声明响应式状态（对象封装，避免直接导出）
   · $derived 声明派生状态（跨模块通过 class 实例暴露）
   · $props 接收组件属性
   · $bindable 实现双向绑定
   · $effect 处理副作用（禁止用于常规数据流）
3. .svelte.ts 文件规则：
   · 任何在 .ts 中使用 Runes 的文件必须命名为 xxx.svelte.ts
   · 禁止导出可重新赋值的 $state 变量
   · 禁止直接导出 $derived（需 class 封装）
4. 数据模型：
   · product.inspectionQty 是抽检数量的唯一真实来源
   · group.total 保留但恒等于 product.inspectionQty
5. 移动端适配：
   · 触控目标 ≥ 44×44px（已在 app.css 中针对 max-width: 768px 优化）
   · 长列表使用 content-visibility: auto 优化渲染

---

🔒 隐私与安全

· 本工具不上传任何数据到服务器（OCR 功能除外，仅上传用户选择的图片到 OCR.space）。
· 所有数据保存在用户浏览器的 localStorage。
· OCR API Key 仅存 sessionStorage，关闭标签页自动清除。
· 分享功能仅将文本复制到剪贴板或调用系统分享，不涉及第三方服务。

---

👨‍💻 作者

· 作者：老鸹先生 / 黑猫郭
· 仓库：https://github.com/Blackcat-guo/SamplingInspectionQuantity

如果这个项目对你有帮助，欢迎给个 ⭐ Star 支持一下！

---
