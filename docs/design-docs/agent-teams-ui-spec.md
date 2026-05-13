# Agent Teams UI 集成 Spec

## Context

Mint 后端的 agent teams 数据链已完整：SDK system message → `teammate-handler.ts` → SSE 事件 (`teammate_started/progress/completed`, `team_waiting_resume`) → `use-stream-events.ts` → `useChatStream` 返回 `teammates: TeammateState[]` + `isWaitingResume: boolean`。

UI 层有 `TeamPanel`、`TeammateDetail` 组件但未接入主界面。需要设计一个完整的三层看板体系，参考 `claude-teams-view`（实时监控仪表盘）和 `claude-code` sourcemap（TUI 内联队友状态），让用户在不离开对话的情况下感知团队协作进度。

---

## 设计参考

| 参考 | 核心模式 | 我们取什么 |
|------|---------|-----------|
| claude-teams-view | 侧边栏成员列表 + 详情面板 + 统一时间线 | 抽屉内 teammate 卡片列表 + 全屏双栏详情 |
| claude-code TUI | `TeammateSpinnerTree` 内联在 spinner 区域 + `@name▸` 内联消息 + footer badge | `InlineTeamStatus` 聊天区内联状态条 |
| 已有 Mint 组件 | TeamPanel (sidebar/fullscreen)、TeammateDetail、shared 工具 | 提取 TeammateCard + TeamSummaryBar 复用 |

---

## 三层视图架构

```
┌─────────────────────────────────────────────────────────────┐
│ Header: [Agent pill] [desc]    [Users⑂badge] [PanelRight]  │  ← Teams 按钮
├──────────────────────────────┬──────────────────────────────┤
│ Chat Area                    │ File Tree                    │
│                              │                              │
│  [messages...]               │                              │
│                              │                              │
│  ┌─ InlineTeamStatus ─────┐ │                              │  ← Layer 1: 内联状态条
│  │ 🟢🟢 ⚫  2 running...  │ │                              │     (始终可见，轻量)
│  │          [View Team →]  │ │                              │
│  └─────────────────────────┘ │                              │
│                              │                              │
│  [StreamingIndicator]        │                              │
├──────────────────────────────┤                              │
│ [TodoList / AskQuestion]     │                              │
│ [MessageInput]               │                              │
└──────────────────────────────┴──────────────────────────────┘

点击 "View Team" 或 Header Users 按钮 → 打开抽屉:

┌──────────────────────┬──────┬──────────────────────────────┐
│ Chat Area            │ 320px│ TeamDrawer                   │  ← Layer 2: 侧边抽屉
│                      │      │ ┌─ Header: 团队看板 [⛶][✕] ─┐│
│                      │      │ │ Progress: ████░░ 3/5      ││
│                      │      │ │                            ││
│                      │      │ │ [TeammateCard] running     ││
│                      │      │ │ [TeammateCard] running     ││
│                      │      │ │ [TeammateCard] completed   ││
│                      │      │ │ [TeammateCard] completed   ││
│                      │      │ │ [TeammateCard] completed   ││
│                      │      │ └────────────────────────────┘│
└──────────────────────┴──────┴──────────────────────────────┘

点击 ⛶ 全屏按钮 → 覆盖主内容区的双栏布局:

┌─────────────────────────────────────────────────────────────┐
│ Agent 团队                                           [🗕]   │  ← Layer 3: 全屏详情
├──────────┬──────────────────────────────────────────────────┤
│ 列表 240px│ TeammateDetail                                  │
│          │                                                  │
│ ██ 进度   │ ┌─ Avatar + Name + Status ─────────────────┐   │
│ 3/5 (60%)│ │                                          │   │
│          │ │ 任务描述:                                  │   │
│ [card]①  │ │ "Fix auth bug in login..."               │   │
│ [card]②  │ │                                          │   │
│ [card]③  │ │ 执行进度:                                 │   │
│ [card]④  │ │ 🔵 正在使用 Read... 45s                   │   │
│ [card]⑤  │ │ 工具: [Bash][Read][Write]                │   │
│          │ │                                          │   │
│          │ │ Agent 通信:                                │   │
│          │ │ ┌─ 主→子: 启动任务 ─┐ ┌─ 子→主: 结果 ─┐  │   │
│          │ │ └──────────────────┘ └───────────────┘  │   │
│          │ │                                          │   │
│          │ │ 执行结果:                                 │   │
│          │ │ "Successfully fixed..."                  │   │
│          │ └──────────────────────────────────────────┘   │
└──────────┴──────────────────────────────────────────────────┘
```

---

## 组件清单

### 新建组件

| 组件 | 文件 | 行数 | 职责 |
|------|------|------|------|
| `TeammateCard` | `team/teammate-card.tsx` | ~90 | 从 team-panel.tsx 提取，可复用的单卡片 |
| `TeamSummaryBar` | `team/team-summary-bar.tsx` | ~50 | 从 team-panel.tsx 提取，进度条 + 计数 |
| `InlineTeamStatus` | `team/inline-team-status.tsx` | ~100 | 聊天区内联状态条 (Layer 1) |
| `TeamDrawer` | `team/team-drawer.tsx` | ~120 | 侧边抽屉 (Layer 2) |
| `TeamDetailOverlay` | `team/team-detail-overlay.tsx` | ~100 | 全屏详情覆盖层 (Layer 3) |

### 修改文件

| 文件 | 修改 |
|------|------|
| `agent-view.tsx` | 删除内联 drawer/overlay JSX → 委托给 TeamDrawer/TeamDetailOverlay；传 teammates 给 MessageList |
| `message-list.tsx` | 新增 teammates/isWaitingResume/onViewTeam props；在 messages 末尾插入 InlineTeamStatus |
| `team-panel.tsx` | 删除 TeammateCard 定义（已提取）和 fullscreen 模式（已移至 overlay）；仅保留 sidebar 列表 |
| `teammate-shared.tsx` | 新增 `teammateName()` 工具函数 |

---

## 详细 Spec

### 1. InlineTeamStatus（内联状态条）

**文件**: `packages/mint/src/components/team/inline-team-status.tsx`

**Props**:
```ts
interface InlineTeamStatusProps {
  teammates: TeammateState[];
  isWaitingResume: boolean;
  onViewTeam: () => void;
}
```

**布局**: 48px 高，`max-w-[640px] mx-auto` 居中，`rounded-xl border bg-[#F5F5F7]/80`

**左区 — Avatar 行**:
- 最多 5 个 16px 圆形 avatar（颜色取自 `avatarColor(index)`）
- Running: 蓝色脉冲点 overlay
- Completed: 绿色对勾 overlay
- Failed: 红色叉 overlay
- 超出 5 个: `+N` overflow badge

**中区 — 状态文本**:
- 有 running: `"{N} agents 运行中..."` 蓝色
- isWaitingResume: `"正在收集结果..."` + spinner 蓝色
- 全部 completed: `"{N} agents 已完成"` 绿色

**右区 — 操作链接**:
- `"查看团队 →"` 文字按钮，点击调用 `onViewTeam()`

**渲染位置**: 在 `MessageList` 的 `AutoScrollArea` 内，所有 messages 之后、`StreamingIndicator` 之前。只在 `teammates.length > 0` 时渲染。

---

### 2. TeamDrawer（侧边抽屉）

**文件**: `packages/mint/src/components/team/team-drawer.tsx`

**Props**:
```ts
interface TeamDrawerProps {
  teammates: TeammateState[];
  isWaitingResume: boolean;
  onExpand: () => void;
  onClose: () => void;
}
```

**结构**:
```
w-[320px] shrink-0 border-l border-border overflow-hidden flex flex-col
├── DrawerHeader: "团队看板" + [⛶ maximize] + [✕ close]
├── TeamSummaryBar: progress bar + "3/5 已完成"
├── isWaitingResume? → WaitingResumeBanner
└── overflow-y-auto: TeammateCard[] (compact mode)
```

**交互**:
- 点击 teammate card → 调用 `onExpand()` 并传递选中的 taskId（通过 ref/callback）
- 点击 ⛶ → 调用 `onExpand()`
- 点击 ✕ → 调用 `onClose()`

**WaitingResumeBanner**（从 TeamPanel 移入）:
- `bg-[#007AFF]/10` 蓝色背景
- Spinner + "正在收集结果..."

---

### 3. TeamDetailOverlay（全屏详情）

**文件**: `packages/mint/src/components/team/team-detail-overlay.tsx`

**Props**:
```ts
interface TeamDetailOverlayProps {
  teammates: TeammateState[];
  isWaitingResume: boolean;
  onClose: () => void;
  initialSelectedId?: string | null;
}
```

**结构**:
```
absolute inset-0 z-50 bg-white flex flex-col
├── Header: "Agent 团队" + [🗕 minimize/close]
└── flex flex-1 min-h-0
    ├── LeftColumn w-[240px] border-r overflow-y-auto
    │   ├── TeamSummaryBar
    │   ├── isWaitingResume? → WaitingResumeBanner
    │   └── TeammateCard[] (可点击选中，selected 高亮)
    └── RightColumn flex-1 overflow-y-auto
        ├── selectedTeammate ? TeammateDetail : "点击左侧查看详情" 空状态
```

**内部 state**: `selectedTeammateId: string | null`

**点击 teammate card** → 设置 `selectedTeammateId` → 右侧渲染 `TeammateDetail`

---

### 4. TeammateCard（提取）

**文件**: `packages/mint/src/components/team/teammate-card.tsx`

从 `team-panel.tsx` 中提取 `TeammateCard` 函数，props 不变：

```ts
interface TeammateCardProps {
  teammate: TeammateState;
  now: number;
  compact?: boolean;
  selected?: boolean;
  onClick?: () => void;
}
```

---

### 5. TeamSummaryBar（提取）

**文件**: `packages/mint/src/components/team/team-summary-bar.tsx`

从 `TeamPanel` 提取进度条 + 计数逻辑：

```ts
interface TeamSummaryBarProps {
  teammates: TeammateState[];
  compact?: boolean;  // compact: 单行进度条; 非compact: 带文字的两行
}
```

显示: running/completed/failed 计数 + 百分比进度条

---

### 6. agent-view.tsx 修改

**当前状态**: 已有 team button + 内联 drawer/overlay JSX（上一轮实现）

**修改**:
1. 新增 state: `selectedTeammateId`
2. 删除内联 drawer JSX（~30 行）→ 替换为 `<TeamDrawer>`
3. 删除内联 overlay JSX（~20 行）→ 替换为 `<TeamDetailOverlay>`
4. 给 MessageList 传 `teammates`, `isWaitingResume`, `onViewTeam`
5. 新增 resize handle（`w-1 cursor-col-resize`）在 drawer 左侧

---

### 7. message-list.tsx 修改

**新增 props**:
```ts
teammates?: TeammateState[];
isWaitingResume?: boolean;
onViewTeam?: () => void;
```

**渲染位置**: 在 `{messages.map(...)}` 之后、`{isStreaming && <StreamingIndicator />}` 之前插入:
```tsx
{teammates && teammates.length > 0 && (
  <InlineTeamStatus
    teammates={teammates}
    isWaitingResume={isWaitingResume ?? false}
    onViewTeam={onViewTeam ?? (() => {})}
  />
)}
```

---

### 8. team-panel.tsx 简化

- 删除 `TeammateCard` 定义（→ `teammate-card.tsx`）
- 删除 fullscreen 模式（→ `team-detail-overlay.tsx`）
- 删除进度条逻辑（→ `team-summary-bar.tsx`）
- 保留 sidebar 列表模式的空壳，从新模块 import TeammateCard + TeamSummaryBar
- 文件从 ~267 行缩减到 ~60 行

---

### 9. teammate-shared.tsx 补充

```ts
export function teammateName(tm: TeammateState): string {
  return tm.description || `Agent ${tm.index + 1}`;
}
```

---

## 状态流转

```
State A: 无 teammates
  → 无 InlineTeamStatus, Users 按钮灰色

State B: 有 teammates, 抽屉关闭
  → InlineTeamStatus 可见, Users 按钮蓝色 + badge 数字

State C: 有 teammates, 抽屉打开
  → InlineTeamStatus + TeamDrawer(320px) 可见
  → 聊天区自动缩窄

State D: 全屏详情打开
  → InlineTeamStatus + TeamDetailOverlay 覆盖主内容区
  → 抽屉隐藏

State E: isWaitingResume = true
  → InlineTeamStatus: "正在收集结果..." + spinner
  → 抽屉/overlay: 蓝色 banner

State F: 所有 teammates completed
  → InlineTeamStatus: "3 agents 已完成" 绿色
  → 进度条 100%
```

---

## 实施顺序

### Phase 1: 提取复用组件（无行为变化）
1. 创建 `teammate-card.tsx` — 从 team-panel.tsx 提取 TeammateCard
2. 创建 `team-summary-bar.tsx` — 从 team-panel.tsx 提取进度条逻辑
3. 简化 `team-panel.tsx` — import 提取出的组件

### Phase 2: 创建新视图组件
4. 创建 `inline-team-status.tsx`
5. 创建 `team-drawer.tsx`
6. 创建 `team-detail-overlay.tsx`

### Phase 3: 接入主界面
7. 修改 `message-list.tsx` — 新增 props + 渲染 InlineTeamStatus
8. 修改 `agent-view.tsx` — 委托给新组件 + 传 teammates 给 MessageList
9. 补充 `teammate-shared.tsx` — teammateName()

### Phase 4: 验证
- `pnpm build` 通过
- 无 teammates 时界面无变化
- 有 teammates 时内联状态条自动出现
- 点击 Users 按钮 / "查看团队" 打开抽屉
- 抽屉内 teammate 卡片显示实时进度
- 点击全屏按钮切换为双栏布局
- 点击 teammate 卡片右侧显示详情
- isWaitingResume 时各层显示收集状态

---

## 验证清单

1. `pnpm build` 通过
2. 无 teammates 时: 无内联条, Users 按钮灰色
3. 触发 agent teams: 内联条自动出现显示 running 计数
4. Users 按钮: 蓝色高亮 + 数字 badge
5. 点击 "查看团队" / Users 按钮: 320px 抽屉打开
6. 抽屉内: 进度条 + teammate 卡片列表 + 实时工具名/耗时
7. 点击 teammate 卡片: 全屏 overlay 打开，右侧显示详情
8. 详情: 任务描述 + 进度 + 通信 + 结果 + 用量
9. isWaitingResume: 内联条/抽屉/overlay 均显示 "正在收集结果..."
10. 全部完成: 进度条 100%, 状态文本变绿
