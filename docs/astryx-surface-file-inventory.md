# Astryx 界面文件清单（文件级）

由 `scripts/generate-astryx-surface-inventory.mjs` 生成。每行对应一个磁盘上的产品界面文件。重新生成的清单必须与磁盘保持同步（覆盖门控）。

Wiki 栏：设计约定 · API 使用系统 · 主题化 · 容器内边距。

**总计：** 218 个文件——blocker 0、polish 1、aligned 217。

## 排除项（显式）

### 范围规则

- 目录树：`vera-desktop/src/renderer/**`、`vera-ui/src/**`。
- 包含的扩展名：这些目录树下的 `.tsx`（组件/页面）和产品 `.css`。
- 跳过的目录：`__tests__`、`stories`、`locales`、`astryx-theme`、`computer-use-overlay`（引擎）。
- 基本名称规则见下；纯 `.ts` 钩子/辅助函数不在范围内（UI 在消费方 `.tsx` 处盘点）。

### 排除的路径

| 路径 | 原因 |
|------|-----|
| `vera-desktop/src/renderer/main.tsx` | 打包入口，非界面 |

## 文件

| 路径 | 角色 | 使用的 Astryx | 差距 / 备注 | 严重度 |
|------|------|-------------|------------|----------|
| `vera-desktop/src/renderer/agent-graph-panel.tsx` | 外壳 chrome 或面板 | Banner, Button, EmptyState, IconButton, Selector, Spinner | aligned —— 使用 Astryx（Banner, Button, EmptyState, IconButton, Selector, Spinner） | aligned |
| `vera-desktop/src/renderer/app-shell-chrome-actions.tsx` | 外壳 chrome 或面板 | IconButton, Tooltip | aligned —— 使用 Astryx（IconButton, Tooltip） | aligned |
| `vera-desktop/src/renderer/app-shell-detail-panel.tsx` | 外壳 chrome 或面板 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/app-shell-overlays.tsx` | 外壳 chrome 或面板 | Spinner | aligned —— 使用 Astryx（Spinner） | aligned |
| `vera-desktop/src/renderer/app-shell.tsx` | 外壳 chrome 或面板 | AppShell, Button | aligned —— 使用 Astryx（AppShell, Button） | aligned |
| `vera-desktop/src/renderer/app.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/cascade-layers.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/chat-composer-region.tsx` | 外壳 chrome 或面板 | Banner, Button | aligned —— 使用 Astryx（Banner, Button） | aligned |
| `vera-desktop/src/renderer/chat-message-surface.tsx` | 外壳 chrome 或面板 | Banner, Button | aligned —— 使用 Astryx（Banner, Button） | aligned |
| `vera-desktop/src/renderer/command-palette.tsx` | 对话框浮层 | EmptyState | aligned —— 使用 Astryx（EmptyState） | aligned |
| `vera-desktop/src/renderer/custom-pet-companion.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/error-boundary.tsx` | 其他 | Button, Card | aligned —— 使用 Astryx（Button, Card） | aligned |
| `vera-desktop/src/renderer/features/goals/services-context.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/goals/ui/goal-dialog.tsx` | 对话框浮层 | Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, Text, TextInput, VStack | aligned —— 使用 Astryx（Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, Text, TextInput） | aligned |
| `vera-desktop/src/renderer/features/goals/ui/goal-host.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/module-hub/services-context.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/module-hub/ui/module-hub-host.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/session-navigation/services-context.tsx` | 外壳 chrome 或面板 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/session-navigation/ui/session-navigation-host.tsx` | 外壳 chrome 或面板 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/task-entry/services-context.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/task-entry/ui/task-entry-host.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/workbar/services-context.tsx` | 外壳 chrome 或面板 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/artifacts/artifact-pane.tsx` | 外壳 chrome 或面板 | Badge, Banner, Button, EmptyState | aligned —— 使用 Astryx（Badge, Banner, Button, EmptyState） | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/artifacts/artifact-preview-registry-shell.tsx` | 外壳 chrome 或面板 | Banner, Button, Spinner | aligned —— 使用 Astryx（Banner, Button, Spinner） | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/artifacts/artifact-preview.tsx` | 外壳 chrome 或面板 | Banner, Button, Spinner | aligned —— 使用 Astryx（Banner, Button, Spinner） | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/browser/browser-panel.tsx` | 外壳 chrome 或面板 | EmptyState, IconButton, Toolbar, Tooltip | aligned —— 使用 Astryx（EmptyState, IconButton, Toolbar, Tooltip） | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/inspector/session-inspector-panel.tsx` | 外壳 chrome 或面板 | Banner, Button, EmptyState, Heading, Section, Text, VStack | aligned —— 使用 Astryx（Banner, Button, EmptyState, Heading, Section, Text, VStack） | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/review/session-review-panel.tsx` | 外壳 chrome 或面板 | Banner, Button, Collapsible, EmptyState, HStack, Section, Text, VStack | aligned —— 使用 Astryx（Banner, Button, Collapsible, EmptyState, HStack, Section, Text, VStack） | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/side-chat/quote-companion-panel.tsx` | 外壳 chrome 或面板 | Banner, Spinner | aligned —— 使用 Astryx（Banner, Spinner） | aligned |
| `vera-desktop/src/renderer/features/workbar/tools/terminal/session-terminal-panel.tsx` | 外壳 chrome 或面板 | Banner, EmptyState | aligned —— 使用 Astryx（Banner, EmptyState） | aligned |
| `vera-desktop/src/renderer/features/workbar/ui/side-chat-close-confirmation.tsx` | 外壳 chrome 或面板 | Button, CheckboxInput, Dialog, DialogHeader, HStack, Layout, LayoutContent, Text, VStack | aligned —— 使用 Astryx（Button, CheckboxInput, Dialog, DialogHeader, HStack, Layout, LayoutContent, Text） | aligned |
| `vera-desktop/src/renderer/features/workbar/ui/workbar-host.tsx` | 外壳 chrome 或面板 | Card, ResizeHandle, Spinner | aligned —— 使用 Astryx（Card, ResizeHandle, Spinner） | aligned |
| `vera-desktop/src/renderer/features/workbar/ui/workbar-surface.tsx` | 外壳 chrome 或面板 | Badge, Button, Card, ContextMenu, Heading, IconButton, List, ListItem, Section, Spinner, Tooltip | aligned —— 使用 Astryx（Badge, Button, Card, ContextMenu, Heading, IconButton, List, ListItem） | aligned |
| `vera-desktop/src/renderer/features/workbar/ui/workbar-toggle.tsx` | 外壳 chrome 或面板 | IconButton, Tooltip | aligned —— 使用 Astryx（IconButton, Tooltip） | aligned |
| `vera-desktop/src/renderer/keyboard-help.tsx` | 对话框浮层 | Dialog, DialogHeader, Heading, Layout, LayoutContent | aligned —— 使用 Astryx（Dialog, DialogHeader, Heading, Layout, LayoutContent） | aligned |
| `vera-desktop/src/renderer/live-turn-reconciler.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/vera-tokens.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/mcp-brand-marks.tsx` | 其他 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/mcp-page.tsx` | 模块中心 | Banner, Button, Collapsible, Dialog, DialogHeader, Divider, EmptyState, HStack, Heading, IconButton, Layout, LayoutContent, List, ListItem, MetadataList, MetadataListItem, SegmentedControl, SegmentedControlItem, Selector, Switch, Text, TextInput, Toolbar, VStack | aligned —— 使用 Astryx（Banner, Button, Collapsible, Dialog, DialogHeader, Divider, EmptyState, HStack） | aligned |
| `vera-desktop/src/renderer/onboarding-hero.tsx` | 对话框浮层 | Banner, Button, Card, HStack, Heading, List, ListItem, Text, VStack | aligned —— 使用 Astryx（Banner, Button, Card, HStack, Heading, List, ListItem, Text） | aligned |
| `vera-desktop/src/renderer/plan-mode-panel.tsx` | 外壳 chrome 或面板 | Badge, Banner, Button, Collapsible | aligned —— 使用 Astryx（Badge, Banner, Button, Collapsible） | aligned |
| `vera-desktop/src/renderer/reference-shell.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/remote-project-directory-dialog.tsx` | 对话框浮层 | Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, Text | aligned —— 使用 Astryx（Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, Text） | aligned |
| `vera-desktop/src/renderer/settings/about-settings-page.tsx` | 设置页 | Badge, Banner, Button, List, ListItem | aligned —— 使用 Astryx（Badge, Banner, Button, List, ListItem） | aligned |
| `vera-desktop/src/renderer/settings/appearance-settings-page.tsx` | 设置页 | Button, HStack, Text, VStack | aligned —— 使用 Astryx（Button, HStack, Text, VStack） | aligned |
| `vera-desktop/src/renderer/settings/bot-chat-detail.tsx` | 设置模块 | Banner, Button, Card, MetadataList, MetadataListItem, SegmentedControl, SegmentedControlItem, Selector, Text, VStack | aligned —— 使用 Astryx（Banner, Button, Card, MetadataList, MetadataListItem, SegmentedControl, SegmentedControlItem, Selector） | aligned |
| `vera-desktop/src/renderer/settings/bot-chat-overview.tsx` | 设置模块 | Banner, Button, EmptyState, Item | aligned —— 使用 Astryx（Banner, Button, EmptyState, Item） | aligned |
| `vera-desktop/src/renderer/settings/bot-chat-settings-page.tsx` | 设置页 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/bot-chat-shared.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/bot-onboarding-modal.tsx` | 设置页 | Button, Dialog, DialogHeader, Layout, LayoutContent, Spinner | aligned —— 使用 Astryx（Button, Dialog, DialogHeader, Layout, LayoutContent, Spinner） | aligned |
| `vera-desktop/src/renderer/settings/bot-wechat-login.tsx` | 设置模块 | Banner, Button, Collapsible, Dialog, DialogHeader, EmptyState, Layout, LayoutContent, Spinner | aligned —— 使用 Astryx（Banner, Button, Collapsible, Dialog, DialogHeader, EmptyState, Layout, LayoutContent） | aligned |
| `vera-desktop/src/renderer/settings/custom-pet-settings-section.tsx` | 设置模块 | Badge, Button, EmptyState | aligned —— 使用 Astryx（Badge, Button, EmptyState） | aligned |
| `vera-desktop/src/renderer/settings/daily-review-settings-page.tsx` | 设置页 | Banner, Selector | aligned —— 使用 Astryx（Banner, Selector） | aligned |
| `vera-desktop/src/renderer/settings/data-settings-page.tsx` | 设置页 | Banner, Button, Selector | aligned —— 使用 Astryx（Banner, Button, Selector） | aligned |
| `vera-desktop/src/renderer/settings/general-settings-page.tsx` | 设置页 | Banner, Button, Selector | aligned —— 使用 Astryx（Banner, Button, Selector） | aligned |
| `vera-desktop/src/renderer/settings/health-center-page.tsx` | 设置页 | Banner, Button, Text, VStack | aligned —— 使用 Astryx（Banner, Button, Text, VStack） | aligned |
| `vera-desktop/src/renderer/settings/import-tasks-settings-page.tsx` | 设置页 | Banner, Button, CheckboxInput, EmptyState, HStack, List, ListItem, SegmentedControl, SegmentedControlItem, Spinner, TextInput, VStack | aligned —— 使用 Astryx（Banner, Button, CheckboxInput, EmptyState, HStack, List, ListItem, SegmentedControl） | aligned |
| `vera-desktop/src/renderer/settings/memory-entry-list.tsx` | 设置模块 | Button, EmptyState | aligned —— 使用 Astryx（Button, EmptyState） | aligned |
| `vera-desktop/src/renderer/settings/memory-settings-page.tsx` | 设置页 | Banner, Button, EmptyState | aligned —— 使用 Astryx（Banner, Button, EmptyState） | aligned |
| `vera-desktop/src/renderer/settings/memory-settings-sections.tsx` | 设置模块 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-desktop/src/renderer/settings/password-input.tsx` | 设置模块 | IconButton | aligned —— 使用 Astryx（IconButton） | aligned |
| `vera-desktop/src/renderer/settings/permission-center-page.tsx` | 设置页 | Banner, Button, Collapsible, HStack, List, ListItem, MetadataList, MetadataListItem, Text, VStack | aligned —— 使用 Astryx（Banner, Button, Collapsible, HStack, List, ListItem, MetadataList, MetadataListItem） | aligned |
| `vera-desktop/src/renderer/settings/personalization-settings-section.tsx` | 设置模块 | SegmentedControl, SegmentedControlItem | aligned —— 使用 Astryx（SegmentedControl, SegmentedControlItem） | aligned |
| `vera-desktop/src/renderer/settings/projects-settings-page.tsx` | 设置页 | Badge, Banner, Button, EmptyState, HStack, List, ListItem | aligned —— 使用 Astryx（Badge, Banner, Button, EmptyState, HStack, List, ListItem） | aligned |
| `vera-desktop/src/renderer/settings/provider-add-form.tsx` | 设置模块 | Banner, Button, Collapsible, HStack, VStack | aligned —— 使用 Astryx（Banner, Button, Collapsible, HStack, VStack） | aligned |
| `vera-desktop/src/renderer/settings/provider-add-model-dialog.tsx` | 设置模块 | Button, Dialog, DialogHeader, Layout, LayoutContent | aligned —— 使用 Astryx（Button, Dialog, DialogHeader, Layout, LayoutContent） | aligned |
| `vera-desktop/src/renderer/settings/provider-brand-marks.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/provider-catalog-page.tsx` | 设置页 | Banner, Button, EmptyState, HStack, List, ListItem, Section, Selector, VStack | aligned —— 使用 Astryx（Banner, Button, EmptyState, HStack, List, ListItem, Section, Selector） | aligned |
| `vera-desktop/src/renderer/settings/provider-connection-detail.tsx` | 设置模块 | Banner, Button, Divider, HStack, Heading, Selector, Text, VStack | aligned —— 使用 Astryx（Banner, Button, Divider, HStack, Heading, Selector, Text, VStack） | aligned |
| `vera-desktop/src/renderer/settings/provider-display.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/provider-enabled-model-manager.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/provider-oauth-section.tsx` | 设置模块 | Banner, Button, HStack, Text, VStack | aligned —— 使用 Astryx（Banner, Button, HStack, Text, VStack） | aligned |
| `vera-desktop/src/renderer/settings/providers-panel.tsx` | 设置模块 | Badge, Banner, Button, EmptyState, HStack, Heading, List, ListItem, Text, VStack | aligned —— 使用 Astryx（Badge, Banner, Button, EmptyState, HStack, Heading, List, ListItem） | aligned |
| `vera-desktop/src/renderer/settings/request-customization-editor.tsx` | 设置模块 | Button, HStack, IconButton, Text, VStack | aligned —— 使用 Astryx（Button, HStack, IconButton, Text, VStack） | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-connection-code-dialog.tsx` | 设置模块 | Button, Dialog, DialogHeader, Layout, LayoutContent | aligned —— 使用 Astryx（Button, Dialog, DialogHeader, Layout, LayoutContent） | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-interaction-boundary.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-management-dialog.tsx` | 设置模块 | Badge, Banner, Button, Dialog, DialogHeader, Layout, LayoutContent, Selector, Spinner, Text | aligned —— 使用 Astryx（Badge, Banner, Button, Dialog, DialogHeader, Layout, LayoutContent, Selector） | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-onboarding-dialog.tsx` | 设置模块 | Banner, Button, Dialog, DialogHeader, Layout, LayoutContent, SegmentedControl, SegmentedControlItem, Selector, Spinner, Text | aligned —— 使用 Astryx（Banner, Button, Dialog, DialogHeader, Layout, LayoutContent, SegmentedControl, SegmentedControlItem） | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-profiles-section.tsx` | 设置模块 | Badge, Banner, Button, HStack, List, ListItem, SegmentedControl, SegmentedControlItem, Selector, Switch | aligned —— 使用 Astryx（Badge, Banner, Button, HStack, List, ListItem, SegmentedControl, SegmentedControlItem） | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-project-directory-editor.tsx` | 设置模块 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-settings-target.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/runtime-host-ssh-terminal-dialog.tsx` | 设置模块 | Banner, Button, Dialog, DialogHeader, Layout, LayoutContent | aligned —— 使用 Astryx（Banner, Button, Dialog, DialogHeader, Layout, LayoutContent） | aligned |
| `vera-desktop/src/renderer/settings/settings-expandable-row.tsx` | 设置模块 | Button, HStack, Text | aligned —— 使用 Astryx（Button, HStack, Text） | aligned |
| `vera-desktop/src/renderer/settings/settings-metric-card.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/settings-modal.tsx` | 设置页 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/settings-route-header.tsx` | 设置模块 | HStack, Heading, IconButton, Text, Toolbar, VStack | aligned —— 使用 Astryx（HStack, Heading, IconButton, Text, Toolbar, VStack） | aligned |
| `vera-desktop/src/renderer/settings/settings-rows.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/settings-section.tsx` | 设置模块 | Divider, HStack, Heading, Item, Text, VStack | aligned —— 使用 Astryx（Divider, HStack, Heading, Item, Text, VStack） | aligned |
| `vera-desktop/src/renderer/settings/settings-skeleton.tsx` | 设置模块 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-desktop/src/renderer/settings/settings-status-summary-filter.tsx` | 设置模块 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-desktop/src/renderer/settings/settings-surface.tsx` | 设置模块 | Badge, Banner, Button, IconButton, Layout, LayoutContent, LayoutHeader, LayoutPanel, Selector, SideNav | aligned —— 使用 Astryx（Badge, Banner, Button, IconButton, Layout, LayoutContent, LayoutHeader, LayoutPanel） | aligned |
| `vera-desktop/src/renderer/settings/subagent-settings-page.tsx` | 设置页 | Badge, Banner, Button, EmptyState, HStack, IconButton, Selector, VStack | aligned —— 使用 Astryx（Badge, Banner, Button, EmptyState, HStack, IconButton, Selector, VStack） | aligned |
| `vera-desktop/src/renderer/settings/tasks-settings-page.tsx` | 设置页 | Button, EmptyState, HStack, List, ListItem, TextInput | aligned —— 使用 Astryx（Button, EmptyState, HStack, List, ListItem, TextInput） | aligned |
| `vera-desktop/src/renderer/settings/usage-settings-page.tsx` | 设置页 | Banner, Button, Card, EmptyState, SegmentedControl, SegmentedControlItem, Selector, Tab, TabList | aligned —— 使用 Astryx（Banner, Button, Card, EmptyState, SegmentedControl, SegmentedControlItem, Selector, Tab） | aligned |
| `vera-desktop/src/renderer/settings/web-search-settings-page.tsx` | 设置页 | Banner, Button, EmptyState, Selector | aligned —— 使用 Astryx（Banner, Button, EmptyState, Selector） | aligned |
| `vera-desktop/src/renderer/styles.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/agent-graph.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/astryx-mount.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/base.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/chat-detail.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/chat-header.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/chat-message.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/composer-mention.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/composer.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/custom-pet-companion.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/daily-review.css` | 模块中心 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/deep-research.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/error.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/help.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/hero.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/interaction-prompts.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/model-switcher.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/module-pages.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/module-pages/capability-audit.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/module-pages/mcp.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/module-pages/module-shell.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/module-pages/scheduled-tasks.css` | 模块中心 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/module-pages/skills.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/native-cursor.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/onboarding.css` | 对话框浮层 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/palette.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/plan-mode.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/prompt-rail.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/prompt-suggestions.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/quote-side-panel.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/search-modal.css` | 对话框浮层 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/about.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/bot.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/connection.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/form.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/health.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/memory.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/models.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/nav-sidebar.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/permission.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/provider-editor.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/route.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/rows.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/runtime-host.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/select.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/theme-preview.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/usage.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/web-search.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/settings/wechat.css` | 设置模块 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/shell-layout.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/sidebar.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/task-ledger.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/theme-glass.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/work-board.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workbar/artifacts.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workbar/browser.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workbar/inspector.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workbar/review.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workbar/shell.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workbar/side-chat.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workbar/terminal.css` | 外壳 chrome 或面板 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/styles/workhub.css` | 样式 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-desktop/src/renderer/work-board-panel.tsx` | 外壳 chrome 或面板 | Banner, Button, EmptyState, Spinner, TextInput | aligned —— 使用 Astryx（Banner, Button, EmptyState, Spinner, TextInput） | aligned |
| `vera-desktop/src/renderer/workhub-surface.tsx` | 其他 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-ui/src/astryx-chat-reasoning.tsx` | 外壳 chrome 或面板 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/astryx-i18n.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/attachment-kinds.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/bot-brand-logo.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/capability-audit-strip.tsx` | UI 组合 | Banner | aligned —— 使用 Astryx（Banner） | aligned |
| `vera-ui/src/chat-empty-hero.tsx` | 外壳 chrome 或面板 | Item | aligned —— 使用 Astryx（Item） | aligned |
| `vera-ui/src/chat-model-switcher.tsx` | 外壳 chrome 或面板 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-ui/src/chat-surface-layout.tsx` | 外壳 chrome 或面板 | ChatLayout | aligned —— 使用 Astryx（ChatLayout） | aligned |
| `vera-ui/src/chat-turn.tsx` | 外壳 chrome 或面板 | Badge, Banner, Button, HStack, IconButton, Spinner, Token, Tooltip | aligned —— 使用 Astryx（Badge, Banner, Button, HStack, IconButton, Spinner, Token, Tooltip） | aligned |
| `vera-ui/src/chat-view.tsx` | 外壳 chrome 或面板 | Button, EmptyState, Spinner | aligned —— 使用 Astryx（Button, EmptyState, Spinner） | aligned |
| `vera-ui/src/components.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/composer-message-queue.tsx` | 外壳 chrome 或面板 | Button, IconButton, List, ListItem | raw `<textarea`（API Use-the-System） | polish |
| `vera-ui/src/composer.tsx` | 外壳 chrome 或面板 | Button, ChatComposer, IconButton, Lightbox, Token, Tooltip | aligned —— 使用 Astryx（Button, ChatComposer, IconButton, Lightbox, Token, Tooltip） | aligned |
| `vera-ui/src/daily-review-panel.tsx` | 模块中心 | Banner, Button, Divider, EmptyState, HStack, Heading, List, ListItem, SegmentedControl, SegmentedControlItem, Text, Toolbar, VStack | aligned —— 使用 Astryx（Banner, Button, Divider, EmptyState, HStack, Heading, List, ListItem） | aligned |
| `vera-ui/src/icons.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/inline-reference.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/inline-rename-input.tsx` | UI 组合 | TextInput | aligned —— 使用 Astryx（TextInput） | aligned |
| `vera-ui/src/locale-context.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/vera-wordmark.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/markdown-body.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/markdown-math.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/markdown.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/mermaid-diagram.tsx` | UI 组合 | Button, Collapsible, Dialog, IconButton, Toolbar | aligned —— 使用 Astryx（Button, Collapsible, Dialog, IconButton, Toolbar） | aligned |
| `vera-ui/src/model-picker.tsx` | UI 组合 | Selector | aligned —— 使用 Astryx（Selector） | aligned |
| `vera-ui/src/module-hub-selector.tsx` | UI 组合 | Tab, TabList | aligned —— 使用 Astryx（Tab, TabList） | aligned |
| `vera-ui/src/module-pages.tsx` | UI 组合 | EmptyState, Spinner | aligned —— 使用 Astryx（EmptyState, Spinner） | aligned |
| `vera-ui/src/permission-mode-menu.tsx` | UI 组合 | Selector | aligned —— 使用 Astryx（Selector） | aligned |
| `vera-ui/src/primitives/chat.tsx` | 原语 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/primitives/module-page.tsx` | 原语 | Dialog, DialogHeader, HStack, Heading, Layout, LayoutContent, LayoutHeader, LayoutPanel, ResizeHandle, Text, VStack | aligned —— 使用 Astryx（Dialog, DialogHeader, HStack, Heading, Layout, LayoutContent, LayoutHeader, LayoutPanel） | aligned |
| `vera-ui/src/primitives/page-header.tsx` | 原语 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/primitives/stat-tile.tsx` | 原语 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/prompt-anchor-rail.tsx` | UI 组合 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-ui/src/quote-ref-chip.tsx` | UI 组合 | Button, IconButton | aligned —— 使用 Astryx（Button, IconButton） | aligned |
| `vera-ui/src/relative-time.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/sandbox-boundary-prompt.tsx` | UI 组合 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-ui/src/scheduled-task-form-dialog.tsx` | 模块中心 | Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, Selector, Text, TextInput | aligned —— 使用 Astryx（Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, Selector, Text） | aligned |
| `vera-ui/src/scheduled-task-inspector.tsx` | 模块中心 | Button, Divider, HStack, Heading, List, ListItem, MetadataList, MetadataListItem, Switch, Text, VStack | aligned —— 使用 Astryx（Button, Divider, HStack, Heading, List, ListItem, MetadataList, MetadataListItem） | aligned |
| `vera-ui/src/scheduled-task-panel.tsx` | 模块中心 | Button, Divider, EmptyState, List, ListItem, SegmentedControl, SegmentedControlItem, Selector, Text, TextInput, Toolbar | aligned —— 使用 Astryx（Button, Divider, EmptyState, List, ListItem, SegmentedControl, SegmentedControlItem, Selector） | aligned |
| `vera-ui/src/search-modal.tsx` | 对话框浮层 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/session-context-layer.tsx` | 外壳 chrome 或面板 | BreadcrumbItem, Breadcrumbs, IconButton, LayoutHeader, Text, Token, Tooltip | aligned —— 使用 Astryx（BreadcrumbItem, Breadcrumbs, IconButton, LayoutHeader, Text, Token, Tooltip） | aligned |
| `vera-ui/src/session-history-list.tsx` | 外壳 chrome 或面板 | Badge, VStack | aligned —— 使用 Astryx（Badge, VStack） | aligned |
| `vera-ui/src/session-list-panel.tsx` | 外壳 chrome 或面板 | SegmentedControl, SegmentedControlItem, SideNav | aligned —— 使用 Astryx（SegmentedControl, SegmentedControlItem, SideNav） | aligned |
| `vera-ui/src/session-rename-dialog.tsx` | 对话框浮层 | Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, TextInput | aligned —— 使用 Astryx（Button, Dialog, DialogHeader, HStack, Layout, LayoutContent, TextInput） | aligned |
| `vera-ui/src/session-sidebar-nav.tsx` | 外壳 chrome 或面板 | IconButton, Tooltip | aligned —— 使用 Astryx（IconButton, Tooltip） | aligned |
| `vera-ui/src/skill-inspector.tsx` | 外壳 chrome 或面板 | Button, Divider, HStack, Heading, MetadataList, MetadataListItem, Switch, Text, VStack | aligned —— 使用 Astryx（Button, Divider, HStack, Heading, MetadataList, MetadataListItem, Switch, Text） | aligned |
| `vera-ui/src/skills-panel.tsx` | 模块中心 | Button, EmptyState, IconButton, List, ListItem, SegmentedControl, SegmentedControlItem, Selector, Text, TextInput, Toolbar | aligned —— 使用 Astryx（Button, EmptyState, IconButton, List, ListItem, SegmentedControl, SegmentedControlItem, Selector） | aligned |
| `vera-ui/src/styles.css` | UI 组合 | n/a (css) | aligned —— 未标记节奏失调的控件高度 | aligned |
| `vera-ui/src/task-ledger-panel.tsx` | 外壳 chrome 或面板 | Banner, Collapsible, EmptyState, IconButton, Spinner | aligned —— 使用 Astryx（Banner, Collapsible, EmptyState, IconButton, Spinner） | aligned |
| `vera-ui/src/titlebar-session-identity.tsx` | 外壳 chrome 或面板 | BreadcrumbItem, Breadcrumbs | aligned —— 使用 Astryx（BreadcrumbItem, Breadcrumbs） | aligned |
| `vera-ui/src/toast.tsx` | UI 组合 | Button, HStack, Text, VStack | aligned —— 使用 Astryx（Button, HStack, Text, VStack） | aligned |
| `vera-ui/src/tool-activity.tsx` | UI 组合 | Banner, Button, ChatToolCalls, List, ListItem, Text | aligned —— 使用 Astryx（Banner, Button, ChatToolCalls, List, ListItem, Text） | aligned |
| `vera-ui/src/tool-activity/agent-preview.tsx` | UI 组合 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-ui/src/tool-activity/diff-code-preview.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/tool-activity/tool-code-block.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/tool-activity/tool-result-preview.tsx` | UI 组合 | Button | aligned —— 使用 Astryx（Button） | aligned |
| `vera-ui/src/ui.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |
| `vera-ui/src/user-question-prompt.tsx` | UI 组合 | Button, TextInput | aligned —— 使用 Astryx（Button, TextInput） | aligned |
| `vera-ui/src/workspace-picker.tsx` | UI 组合 | none | aligned —— 无原始控件；无 Astryx JSX 使用 | aligned |

## 严重度图例

- **blocker** —— 存在 Astryx 对应组件（`button`/`input`/`select`）却使用原始交互控件。
- **polish** —— 节奏失调的控件高度或较轻微的问题；并非原语选错。
- **aligned** —— 未发现 blocker 类问题；存在 Astryx 使用时已注明。
