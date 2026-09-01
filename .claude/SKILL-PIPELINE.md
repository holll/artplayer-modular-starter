# 本项目 Skill 调用流程规范

本文档定义在 `artplayer-modular-starter` 项目中调用用户级 skill 的标准流程。
所有涉及 UI/UX 设计、前端实现、代码审查的优化工作，**必须**按此管线执行。

> 适用 skill 清单见下方「可用 Skill 映射」。不在此清单的 skill 需先评估相关性再调用。

---

## 五阶段管线

```
[1 审查/评估] → [2 设计定案] → [3 实现] → [4 复核/验证] → [5 提交]
```

### 阶段 1：审查与评估（Understand）

**目标**：识别当前代码的优化空间，输出可定位的问题清单（`file:line` 格式）。

| 触发场景 | 调用 skill | 关键动作 |
|---|---|---|
| 检查无障碍/UX 合规 | `timeflow-web-design-guidelines` | 先 `WebFetch` 拉取最新准则 → 读取目标文件 → 逐条比对 → 输出 `file:line` 发现 |
| 深度 UI/UX 审查 | `ui-ux-pro-max` | 先探测技术栈（本项目=原生 HTML/CSS/JS，无框架）→ 用 `--domain ux` 查具体准则（如 `"icon button accessible label" --domain ux`）→ 每次只查一个明确关注点 |
| 视觉风格核对 | `ui-ux-craft-kit` | 用 `--domain style` 查 glassmorphism 规范；`--domain color` 查暗色模式调色板 |
| 代码质量/复用审查 | 无 skill（人工） | 人工检查死代码、冗余、竞态；结论记录在审查报告中 |

**验证规则**：
- 审查结论必须**逐条可回溯到具体文件/行号**，禁止空泛描述。
- 0 结果的 skill 搜索：**禁止编造**。重试一次更窄的 query，仍为空则明确标注"使用内置默认值"。

### 阶段 2：设计定案（Design）

**目标**：对阶段 1 的问题给出方案，并**先与用户对齐再动手**。

| 触发场景 | 调用 skill | 关键动作 |
|---|---|---|
| 多方案可选、影响范围大 | `brainstorming` | 探索需求与约束，产出 2-3 个方向 |
| 方案需多步实施 | `writing-plans` | 先写实施计划（步骤、依赖、验证点）再进入实现 |
| 想从零重设计界面 | `frontend-design-3` | 先定「大胆的美学方向」（基调/字体/色彩/差异化），再实现 |
| 想建立设计令牌体系 | `design-system` | 三层令牌（primitive→semantic→component）写入 CSS 变量 |

**验证规则**：
- 改变**外观/交互/视觉结构**的任务，必须先走本阶段，不得直接改代码。
- 计划产出后由用户确认；未经确认不进入实现。

### 阶段 3：实现（Implement）

**目标**：按阶段 2 的方案落地代码。

| 触发场景 | 调用 skill | 关键动作 |
|---|---|---|
| 实现 UI 组件/页面 | `frontend-design-3` / `ui-ux-pro-max` | 用查询结果指导设计决策；CSS 用变量统一 |
| 用 Tailwind/shadcn | `ui-styling` | **本项目不使用** Tailwind/shadcn，仅当决定引入时才调用 |

**验证规则**：
- 每完成一个文件立即做语法校验（JS：`node --check`；CSS：检查括号/缩进）。
- 不引入本任务之外的无关改动。

### 阶段 4：复核与验证（Review）

**目标**：确认实现无回归、符合阶段 1 的发现清单。

| 触发场景 | 调用 skill | 关键动作 |
|---|---|---|
| 复查 UI 是否合规 | `timeflow-web-design-guidelines` | 重跑审查，确认 `file:line` 发现已消除 |
| 复查视觉/UX 质量 | `ui-ux-pro-max` / `ui-ux-craft-kit` | 对改动处复查对比度、触控、动效 |
| 代码质量复核 | 无 skill（人工） | `node --check` + 冒烟测试 + grep 残留检查 |

**验证规则**：
- 阶段 1 的每个发现都必须有「已修复 / 评估后不修（附理由）」的明确结论。
- 交付前跑一次最小冒烟测试（核心路径：加载 URL → 播放 → 停止）。

### 阶段 5：提交（Commit）

**目标**：提交并推送改动。

| 触发场景 | 调用 skill | 关键动作 |
|---|---|---|
| 任何阶段后的提交 | 无 skill（人工） | 遵循全局 CLAUDE.md 的 Git 规范（无 Co-Authored-By 署名，网络走代理） |

**验证规则**：
- 提交信息聚焦「为什么」而非「改了什么」。
- 推送前 `git status` 确认无敏感文件。

---

## 可用 Skill 映射表

| Skill | 在本项目的作用 | 何时调用 | 何时跳过 |
|---|---|---|---|
| `timeflow-web-design-guidelines` | Web 界面准则合规审查 | 无障碍/UX 审查、布局/排版/对比度检查 | 纯逻辑改动 |
| `ui-ux-pro-max` | 深度 UI/UX 设计智能 | 设计新页面、审查交互/配色/动效、建设计系统 | 纯后端/逻辑 |
| `ui-ux-craft-kit` | 风格/配色/字体/UX 数据库 | 查 glassmorphism、配色、字体配对 | 纯逻辑改动 |
| `frontend-design-3` | 高辨识度前端视觉设计 | 重设计界面、避免"AI 味" | 只做小修小补 |
| `design-system` | 设计令牌架构 | 规范化 CSS 变量分层 | 规模过小不值得 |
| `brainstorming` | 创意/需求探索 | 多方案、需求不清、影响大 | 需求明确 |
| `writing-plans` | 多步实施计划 | 3 步以上任务 | 单步小任务 |
| `ui-styling` | Tailwind/shadcn | 引入该技术栈时 | 本项目的原生栈 |

### 明确排除

- `banner-design` / `slides` / `brand` — 面向营销/演示，非本项目用途
- `ed2k-clean` / `hello_js_reverse_skill` / `model-test` / `pydoll-antibot-bypasser` — 逆向/爬虫领域，不适用
- `agent-browser` / `agent-orchestrator` / `taskmaster` / `harness-engineering-pro` — 仅在需要多代理/大型工程时才评估
- `simplify` — 未安装（目录为空），不可用
- `claude-vision-skill` / `zhheo-session-errorreview` — 图片识别/报错回顾，按需使用

---

## 决策速查

当用户提出优化请求时，按以下顺序决策：

1. **是否改变外观/交互/视觉？**
   - 是 → 阶段 1 审查（`timeflow-web-design-guidelines` 或 `ui-ux-pro-max`）
   - 否 → 直接人工代码审查
2. **是否需要用户对齐方案？**
   - 多方案/影响大 → `brainstorming` + `writing-plans`
   - 单一明确 → 直接实现
3. **是否引入新技术栈（Tailwind 等）？**
   - 是 → 先确认，再调 `ui-styling`
4. **完成后** → 阶段 4 复核 → 阶段 5 提交

> 本流程是基线，可按任务规模裁剪：小改动可跳过阶段 2 的正式计划，但**阶段 1 和阶段 4 不可省略**。