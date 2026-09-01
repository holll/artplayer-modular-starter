# 项目约定

## Skill 调用流程

本项目涉及 UI/UX 设计、前端实现、代码审查的优化工作，**必须**遵循五阶段 skill 调用管线：

> 审查/评估 → 设计定案 → 实现 → 复核/验证 → 提交

完整规范见 `.claude/SKILL-PIPELINE.md`。要点：

- **阶段 1 审查**：无障碍/UX 合规用 `timeflow-web-design-guidelines`（先拉准则再比对，输出 `file:line`）；深度 UI 审查用 `ui-ux-pro-max`（`--domain ux`，每次只查一个关注点）；视觉风格核对用 `ui-ux-craft-kit`（glassmorphism 用 `--domain style`）。
- **阶段 2 设计**：多方案/影响大先 `brainstorming`；3 步以上任务先 `writing-plans`；重设计界面用 `frontend-design-3`。**改变外观/交互必须先对齐方案再动手。**
- **阶段 3 实现**：每完成一个 JS 文件立即 `node --check` 校验。
- **阶段 4 复核**：重跑阶段 1 检查确认发现已消除；每个发现要有「已修复 / 评估后不修（附理由）」结论；交付前跑最小冒烟测试。
- **阶段 5 提交**：遵循全局 CLAUDE.md 的 Git 规范（无 Co-Authored-By 署名，网络走代理）。

小改动可跳过阶段 2 正式计划，但**阶段 1 与阶段 4 不可省略**。

排除的 skill：`banner-design`/`slides`/`brand`、`ed2k-clean`/`hello_js_reverse_skill`/`model-test`/`pydoll-antibot-bypasser`、`simplify`（未安装）。

## 技术栈

- 原生 ES Modules + HTML + CSS，无框架、无打包器
- 播放器：ArtPlayer + HLS.js / flv.js / dash.js
- 不支持 Tailwind/shadcn；`ui-styling` 仅当决定引入时才会调用