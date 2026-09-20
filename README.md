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
