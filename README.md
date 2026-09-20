# 📦 抽检数量统计 (SamplingInspectionQuantity)

基于 **Svelte 5** 完全重构的抽检数量统计与多产品汇总工具。项目编译为**单文件 HTML**，完美适配手机 Chrome，支持完全离线使用，并自动部署至 GitHub Pages。

> 💡 **核心优势**：相比原有的 Vue 3 版本，本版本采用 Svelte 5 编译时框架，运行时开销极低，产物体积缩小 60%+，白屏风险大幅降低，且保留了所有原有功能与体验。

---

## ✨ 功能特性

- **📋 产品管理**：支持添加、重命名、复制、批量删除产品；支持标记“样品”。
- **📊 分组与分类**：
  - 支持“严重 / 主要 / 次要”一键标准分组。
  - 支持自定义分组、批量添加分类、拖拽排序、折叠/展开。
  - 分类数量支持加减、输入，并实时计算不良率。
- **🧮 AQL 抽检计算**：内置标准抽样表，根据来料数量自动计算参考抽检数。
- **🔄 多产品汇总**：
  - 支持同供应商 + 同客户的产品合并汇总。
  - 提供“合并描述”与“逐料号拆分”两种汇总格式。
  - 支持高度自定义的汇总模板（占位符替换）。
- **⚙️ 数据预设**：集中管理客户、供应商、来料数量、工序、负责人、特殊分组、预分类与预分组。
- **⏱️ 工时计算**：支持上下班时间、多段休息时间，自动计算实际工作时长与加班时长。
- **📂 本地存储与备份**：
  - 数据全部保存在浏览器 `localStorage` 中。
  - 支持导出/导入 JSON，自动备份最近 3 个版本，草稿定时保存。
  - 提供“一键清理孤儿数据”和“清理本地缓存”功能。
- **📤 分享与复制**：支持系统分享、微信/钉钉/飞书/邮件跳转分享及一键复制。
- **🎨 主题与体验**：支持浅色/深色/跟随系统；提供“优雅 / 标准 / 兼容”三档体验等级。

---

## 🛠️ 技术栈

- **框架**：[Svelte 5](https://svelte.dev/) (Runes 语法：`$state`, `$derived`, `$props`, `$effect`, `$bindable`)
- **构建工具**：[Vite 6](https://vitejs.dev/)
- **语言**：TypeScript
- **单文件打包**：[vite-plugin-singlefile](https://github.com/richardtallent/vite-plugin-singlefile)
- **部署环境**：GitHub Pages + GitHub Actions

---

## 📁 项目结构

```text
counts-svelte/
├── package.json
├── vite.config.ts
├── svelte.config.js
├── tsconfig.json
├── index.html
├── 404.html                 # GitHub Pages 兜底页面
└── src/
    ├── main.ts
    ├── app.css              # 全局样式与响应式布局
    ├── App.svelte           # 根组件
    ├── lib/
    │   ├── core/
    │   │   ├── schema.ts          # 数据定义、清洗与规范化
    │   │   ├── schema-helper.ts   # 安全的 JSON 解析
    │   │   ├── sampling.ts        # AQL 抽检计算逻辑
    │   │   ├── template.ts        # 模板渲染引擎
    │   │   ├── history.svelte.ts  # 撤回/重做历史栈
    │   │   └── storage.ts         # localStorage 读写与备份
    │   ├── utils/
    │   │   ├── copy.ts            # 复制文本兼容方案
    │   │   ├── share.ts           # 分享 API 封装
    │   │   └── time.ts            # 工时计算工具
    │   └── stores/
    │       └── app.svelte.ts      # 全局状态与核心业务逻辑
    └── components/
        ├── Sidebar.svelte         # 侧边栏产品列表
        ├── TopNav.svelte          # 顶部快捷导航
        ├── ProductInfo.svelte     # 产品信息与来料
        ├── GroupList.svelte       # 分组列表
        ├── GroupCard.svelte       # 单个分组与分类
        ├── MergePanel.svelte      # 多产品汇总与模板
        ├── PresetPanel.svelte     # 预分类管理
        ├── WorkTimeDialog.svelte  # 工时计算弹窗
        ├── SettingsDialog.svelte  # 设置弹窗（含说明书）
        ├── DataPresetsDialog.svelte # 数据预设弹窗
        ├── AddProductDialog.svelte  # 添加产品弹窗
        ├── ShareMenu.svelte       # 分享菜单
        ├── Toast.svelte           # 全局提示
        └── Dialog.svelte          # 通用弹窗壳
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

本项目已配置好 GitHub Actions 自动化部署，你只需要提交代码，它会自动构建并发布。

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
          node-version: 24
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

1. 进入仓库 Settings → Pages。
2. 将 Source 设置为 GitHub Actions。
3. 等待 Actions 跑完（大约 1-2 分钟），访问 https://你的用户名.github.io/SamplingInspectionQuantity/。

⚠️ 重要说明：404 兜底页面

由于 GitHub Pages 是纯静态托管，直接访问子路径（如 /xxx）会返回 404。请在项目根目录放置一个 404.html（内容与 index.html 完全一致），GitHub Pages 会自动用它作为兜底页面。

---

💾 数据存储与备份

· 存储位置：所有数据保存在浏览器本地 localStorage 中，键名以 category_counts_v5 开头。
· 数据隔离：数据是“跟着浏览器走”的，换设备或换浏览器不会自动同步。
· 自动备份：系统会自动保存最近 3 个版本，可在「设置 → 备份与恢复 → 恢复最近版本」中找回。
· 手动备份：强烈建议定期在「设置 → 备份与恢复」中点击「导出全部数据」，将 JSON 文件保存到云盘或微信收藏。
· 清理功能：
  · 一键清理孤儿数据：清理没有产品引用的客户/供应商、失效的负责人绑定等。
  · 清理本地缓存：删除历史滚动备份与孤儿产品数据，不影响当前正常数据。

---

📝 开发注意事项（针对 Svelte 5）

1. 严禁混用 Vue 语法：本项目已完全迁移至 Svelte 5，请勿在代码中使用 ref、reactive、v-if 等 Vue 语法。
2. Runes 语法要求：
   · 使用 $state 声明响应式状态。
   · 使用 $derived 声明派生状态。
   · 使用 $props 接收组件属性。
   · 使用 $bindable 实现双向绑定（如 bind:open）。
   · 使用 $effect 处理副作用。
3. .svelte.ts 文件：任何在 .ts 文件中使用 Runes 的情况，必须将文件命名为 xxx.svelte.ts，否则编译器会报错。
4. 移动端适配：
   · 交互元素的触控目标建议不小于 44×44px（已在 app.css 中针对 max-width: 768px 做了优化）。
   · 长列表使用了 content-visibility: auto 优化渲染性能。

---

📄 版本历史

· v3.1：修复白屏问题，新增分享功能，优化预分类重命名撤回。
· v3.0：引入体验等级架构，新增优雅模式，支持 .js 数据导入。
· v2.5：性能优化，新增设置导航弹窗。
· v2.4：修复全检展示逻辑与输入框布局。

---

👨‍💻 作者

· 作者：老鸹先生 / 黑猫郭
· 仓库：https://github.com/Blackcat-guo/SamplingInspectionQuantity

如果这个项目对你有帮助，欢迎给个 ⭐ Star 支持一下！

```

---
