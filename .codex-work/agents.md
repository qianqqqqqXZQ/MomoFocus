# MomoFocus 项目备忘

## 概述

MomoFocus（番茄小窝）是一个 React + Vite 前端、Electron 桌面壳的专注计时应用。

## 结构

- `src/App.tsx`：计时、待办、Todo/备忘录右侧面板和统计页面组件及状态逻辑
- `src/styles.css`：主题变量、布局和响应式样式
- `src/SortableList.tsx`：Todo 与备忘录共用的拖动 / 键盘排序组件
- `electron/main.cjs`：Electron 主进程
- `assets/`：应用图标资源

## 当前功能约定

- 右侧面板默认显示 `Todo`，可切换到 `备忘录`。
- 桌面端右侧工作区内部采用“列表在左、想法/编辑区在右”的双栏布局；Todo 列表和想法历史、备忘录列表分别有独立滚动边界。窗口宽度较窄时自动恢复为上下堆叠。
- Todo 支持点击选中并记录专属想法；想法保存在对应 Todo 的 `thoughts` 字段中，兼容没有该字段的旧数据。
- 备忘录支持标题、纯文本正文、多篇列表、自动保存和直接删除。
- Todo 和备忘录通过左侧把手纵向拖动排序，其他条目使用 220ms 缓动让位，长列表靠近边缘自动滚动；移动 6px 后才开始拖动。把手支持空格 / Enter 开始和保存、上下方向键移动、Escape 取消，并提供中文读屏提示和减少动画适配。
- 排序仅在拖动结束后调整现有数组并沿用 localStorage 自动保存，不引入额外排序字段；Todo 编辑时该条目的把手禁用，排序保留 ID、完成状态、专属想法和备忘录内容 / 时间，取消不修改数组。排序快捷键与全局计时快捷键隔离。
- 中间专注任务卡点击打开详情，右侧“开始”才启动计时；活动任务标题也可打开详情。
- 任务详情支持查看完成专注次数、累计时长、放弃次数，编辑名称/计时类型、选择浅色预设和应用内二次确认删除。
- 番茄钟任务保存 `focusMinutes` 和 `breakMinutes`；旧任务读取时默认补齐为 25/5。运行中的番茄钟固定按专注 -> 休息 -> 完成流转，休息结束才增加完成番茄数。
- 运行界面仅保留暂停/继续与放弃；暂停不写历史，放弃时专注累计不足 5 秒不写入历史并弹窗提示，休息阶段放弃记录为 `abandoned` 但不计完成。
- 专注任务可选浅绿、浅蓝、浅黄、浅粉、浅橙、浅棕、浅紫、薄荷色；旧任务无颜色时固定回退为浅绿。
- 新建专注任务表单可直接选择上述颜色，颜色会随任务保存；打开新建表单时默认选择浅绿，取消或创建后重置颜色和时长输入。
- 新专注记录包含 `taskId`；旧记录无 ID 时按任务名称匹配，改名时同步迁移匹配记录。
- `localStorage` keys：`momofocus.todos`、`momofocus.notes`、`momofocus.tasks`、`momofocus.sessions`、`momofocus.slogan`。
- localStorage 读取失败或数据结构异常时回退到默认数据；存储写入失败不会阻塞内存中的界面操作。

## 命令

- `npm run dev`：启动 Vite 与 Electron 开发环境
- `npm run build`：运行 TypeScript 项目构建并生成 Vite 产物
- `npm run electron:build`：构建桌面安装包
- 修改代码后用 `npm run dev` 加载当前源码；`release/` 中的 exe 是上次打包版本，不会随源码自动更新
- `git diff --check`：检查改动中的空白错误
- `npm run format`：使用 Prettier 格式化源码和配置
- `npm run format:check`：检查源码和配置是否符合统一格式
- `npm run git:session-check`：检查未提交改动、未设置 upstream，以及相对远程分支的待推送/落后提交；任一项需要处理时返回退出码 1

## Codex 会话结束检查

- `.codex/hooks.json` 注册 `SessionEnd` hook；真正结束 Codex 主会话时运行 `.codex/hooks/session_end_git_check.ps1`。
- hook 只报告状态，不自动 commit 或 push；`SessionEnd` 是提示性生命周期事件，不能阻止会话关闭。
- Codex CLI 中如提示新 hook 待信任，使用 `/hooks` 检查并信任仓库 hook；未信任时使用 `npm run git:session-check` 手动执行同一检查。

## 计时闭环状态

- 计时快照使用 `momofocus.timer`，按 `Date.now()` 真实时间恢复倒计时和正计时。
- 快速记录使用 `momofocus.quickNotes`；声音和系统通知设置使用 `momofocus.settings`。
- Electron 原生通知通过 `electron/preload.cjs` 暴露的受限 `momoFocusNative.notify` API 调用，主窗口保持隔离上下文。
- 计时开始时可通过 `momofocus.settings.floatingWindowOn` 自动打开 Electron 始终置顶浮窗；浮窗通过 `?floating=1` 路由读取 `momofocus.timer` 和任务数据，每 500ms 刷新，关闭浮窗不停止计时。
- 正计时启动后持续计时；番茄钟专注结束自动进入休息并开始计时，休息结束停止并完成本轮。快捷键为 `Space`（暂停/继续）、`S` 或 `Escape`（放弃）。
- 正计时（含养习惯正计时）的主界面和浮窗操作按钮显示“结束”，主界面读屏标签为“结束当前任务”；倒计时沿用原有文案，结束操作与历史记录规则沿用现有逻辑。
- 番茄钟专注结束自动播放提示音并开始任务自定义休息；休息结束再次播放提示音并停止。声音由 `momofocus.settings` 的 `soundOn` 控制。
- 计时快照额外保存 `sessionStartedAt`，用于暂停或重启后保持历史记录的原始日期归属。

## 最近验证

- 2026-09-28：修正首页右上角“今日专注”一直显示 0 的问题，首页与统计页统一按专注会话完成状态统计；兼容旧记录缺少 `status` 或 `date` 时使用默认完成状态和 `startedAt` 本地日期。`npm run format:check`、`npm run build`、`git diff --check` 通过；`npm run dev` 因 `5173` 已被占用未启动，改用 `5174` Vite 服务并确认页面返回 HTTP 200，完成计时生命周期与历史数据兼容性 code review。

- 2026-09-27：优化 Todo 列表文字层级，降低主任务字号、对比度和辅助文字存在感，并微调中文字体回退栈与字重；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。

- 2026-09-27：修正番茄浮窗展开方向，保持收起和展开高度均为 78px，展开尺寸调整为 390×78，只向右显示状态、任务名和操作按钮；`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成 code review。

- 2026-09-27：增加仓库级 Codex `SessionEnd` Git 检查 hook 和 `npm run git:session-check`；验证 `hooks.json`、格式检查、`npm run build`、`git diff --check`，并验证未提交改动、无 upstream 和当前待推送状态均能返回退出码 1。hook 只提示，不自动 commit/push。

- 2026-09-27：增加首页专注历史逐条删除入口，删除后同步 `momofocus.sessions` 与统计数据；移除专注任务行右侧 ChevronDown 图标。`npm run format:check`、`npm run build`、`git diff --check` 通过，运行态页面加载成功并完成状态生命周期、兼容性、无障碍和响应式 code review。

- 2026-09-22：`npm run build` 通过。
- 2026-09-22：`git diff --check` 通过。
- 2026-09-22：Vite 开发页面启动成功，动态日期和首页交互入口可见。
- 2026-09-22：Todo 专属想法记录功能构建通过，`git diff --check` 通过；旧 Todo 数据兼容为空想法列表。
- 2026-09-22：图标路径、项目格式化和打包输出忽略规则已更新；`npm run format:check`、`npm run build`、`git diff --check` 通过。
- 2026-09-22：`npm run electron:build` 已完成前端构建、Electron 复制和解包阶段，但因下载 `winCodeSign` 时网络连接被重置而未完成安装器签名资源处理。
- 2026-09-23：首页标语可原位编辑并通过 `momofocus.slogan` 持久化，侧栏专注统计入口改为强调按钮；`npm run build`、`npm run format:check`、`git diff --check` 通过。
- 2026-09-23：任务卡详情与开始动作分离，增加任务统计、编辑、颜色预设、删除确认及会话任务 ID 兼容；`npm run build`、`npm run format:check`、`git diff --check` 通过，浏览器交互确认详情打开不会启动计时、明确开始可启动计时。
- 2026-09-24：固定番茄钟专注/休息状态机，增加任务独立时长、5 秒放弃阈值和暂停不落历史规则；`npm run format:check`、`npm run build`、`git diff --check` 通过，浏览器交互确认自定义任务创建、启动、暂停和放弃入口。
- 2026-09-24：统计页“时长分布”改为按任务汇总累计专注时长并显示任务占比，兼容带任务 ID 与旧记录按任务名聚合；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成代码复核。
- 2026-09-24：统计页重构为独立的专注时段分布、累计专注和今日专注区域；日 / 周 / 月 / 自定义只控制分布卡片，累计统计支持起始日期，时段柱状图改为圆滑胶囊柱并修复 22—02 跨午夜分组；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成代码复核。
- 2026-09-24：完成清新马卡龙视觉升级，统一主题变量和任务色板，优化首页、计时器、任务列表、Todo / 备忘录、统计页和任务详情弹窗；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成窄屏浏览器运行态检查与 code review。开发检查时发现 `5173` 已有 Vite 服务，因此复用现有 localhost 页面验证。
- 2026-09-25：修正任务入口配色，任务列表“开始”文字改为黑色，“新建专注任务”按钮移除绿色背景并改为透明底色；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-25：将首页“慢一点，也很好。”的悬停色改为深薄荷绿，并让两行同步变色；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-25：新建专注任务时增加颜色选择并保存所选预设；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-26：将备忘录列表选中指示条从薄荷绿调整为天空蓝，同时保持任务列表选中态不变；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成针对性 code review。
- 2026-09-26：扩大备忘录编辑器和正文输入区，桌面端使用可伸展编辑布局，窄屏保留 420px 编辑器和 320px 正文最小高度；`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成桌面/窄屏样式 code review。运行态窄屏检查确认正文区域约 338px 可见且页面可继续滚动。
- 2026-09-26：将 Todo 想法区和备忘录编辑区移到各自列表右侧，桌面端扩展右侧工作区宽度并设置列表独立滚动；中等及窄窗口自动堆叠。`npm run format:check`、`npm run build`、`git diff --check` 通过；运行态确认桌面双栏尺寸和 700px 窄窗口无横向溢出，并完成 code review。
- 2026-09-26：增加专注开始时自动显示的 Electron 始终置顶浮窗，浮窗可独立关闭；菜单增加“开始时显示浮窗”开关，设置兼容旧数据。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过；运行态因机器已有 `5173` 服务改用 `5174` 启动，Electron 输出缓存权限警告但无脚本加载错误，窗口自动化枚举未捕获窗口。
- 2026-09-27：Todo 新增区域增加“保存”按钮，保留回车新增；空输入时按钮禁用。`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成浏览器运行态检查和 code review。
- 2026-09-27：将任务浮窗升级为圆形番茄与绿色环形进度条，悬停向右展开显示时间和暂停/继续、关闭任务操作；增加 Electron 原生右键关闭菜单，浮窗控制复用主窗口 IPC，专注结束进入休息时保持显示，整轮完成或放弃后关闭。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成代码复核。
- 2026-09-27：修复圆形浮窗页面继承全局背景和 `min-width` 导致的外部矩形；浮窗页面现在使用透明 html/body/root 和 78px 收起尺寸，展开时同步调整页面与原生窗口宽度。浮窗控制改为受来源校验的 IPC invoke，主窗口监听只注册一次。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成代码复核。
- 2026-09-27：二次修复浮窗仍显示矩形的问题：在 React 挂载前应用透明 class，Electron 使用 content size、关闭原生阴影，并在重复打开时强制恢复 78px 收起尺寸。浏览器计算样式验证 html/body/root/shell 均为 78px、透明背景；`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成代码复核。
- 2026-09-27：优化浮窗展开排版与交互：展开宽度调整为 360px，使用温暖米白/粉色面板、清晰字号和按钮间距；离开浮窗延迟 280ms 收起，避免移动到右侧内容时误收起；番茄主体改为 Electron 原生拖动区域。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成代码复核。
- 2026-09-27：修复番茄主体使用 CSS 原生拖动导致 React 悬停事件失效的问题；番茄恢复普通鼠标事件，自定义拖动通过受来源校验的主进程 IPC 执行，按住可移动，未移动的点击仍暂停/继续。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成代码复核。

## 最近验证补充

- 2026-10-10：将普通和养习惯正计时的主界面、浮窗按钮统一为“结束”，同步主界面读屏标签。`npm run format:check`、`npm run build`、`git diff --check` 通过；独立 `5177` 来源运行态确认普通正计时运行/暂停均显示“结束”、结束按钮可正常结束任务、养习惯正计时显示“结束”、番茄钟主界面仍显示“放弃”、浮窗按类型显示“结束”或“关闭任务”，浏览器无 error/warn。完成条件渲染、无障碍和原有计时/持久化行为 code review；独立桌面包尚未重新打包。

- 2026-10-09：为右侧 Todo 与备忘录增加把手拖动排序、让位动画、边缘自动滚动和中文键盘 / 读屏支持。改动前检查点 `3bd5acd`；`npm run format:check`、`npm run build`、`git diff --check` 和排序组件独立严格 TypeScript 检查通过。独立 `5176` 测试来源运行态确认两类列表鼠标 / 键盘排序、刷新后顺序保存、Escape 取消、备忘录正文及选中状态保持、Todo 勾选 / 双击编辑 / 编辑时禁用把手；11 条 Todo 拖到底部时列表自动滚动 73px，1440px 桌面和 700px 窄窗口无横向溢出，浏览器无 error / warn。完成状态生命周期、旧数据兼容、快捷键隔离与依赖 / diff code review。额外完整源码严格类型检查仅发现改动前已存在的浮窗 `inert` React 类型声明错误（`src/App.tsx` 原第 517 行）；现有 `npm run build` 的 tsc 仅覆盖 Vite 配置，源码构建由 Vite 完成。Windows 独立桌面包尚未重新打包。

- 2026-10-08：修复番茄计时浮窗的卡顿和中间米白连接块。外层保持透明，圆形番茄与独立圆角详情卡之间保留 8px 透明间距，移除被 78px 窗口裁切的外阴影；详情显示任务名，悬停提示保留任务类型/时长。取消每 16ms 调整 Electron 尺寸/位置，改为展开时一次扩宽、180ms 内容淡出结束后一次收窄，重复悬停去重且重新进入取消收起；隐藏详情使用 inert 和 aria-hidden。`npm run format:check`、`npm run build`、`git diff --check`、主进程/preload 语法检查通过。浏览器运行态确认展开/收起、透明背景、78 + 8 + 292px 布局、内容无溢出和隐藏按钮不可访问；主进程模拟检查确认来源校验、重复请求、收起期间重新进入、关闭清理和重开。完成计时/持久化兼容、拖动与定时器生命周期 code review。浏览器无法验证 Windows 透明原生窗口合成效果，独立桌面包尚未重新打包。

- 2026-10-05：正计时主计时器与浮窗不再显示进度弧（仅保留中性轨道）；浮窗展开宽度统一为 378px，匹配 78px 圆形主体、8px 间距和 292px 详情区，修复右侧多余空白；Electron 原生窗口和页面同步使用 220ms 缓动展开/收起。`npm run format:check`、`npm run build`、`git diff --check`、`node --check electron/main.cjs` 通过；复核了计时类型分支、浮窗尺寸和重复触发时动画计时器清理。

- 2026-10-05：将 `npm run dev` 的 `http://127.0.0.1:5173` localStorage 数据迁移到桌面包的 `file://` 来源；`momofocus.sessions`、`quickNotes`、`timer`、`slogan`、`tasks`、`settings`、`notes`、`todos` 8 个键逐项写入并校验一致，桌面 exe 独立读取验证通过。

- 2026-10-05：确认桌面快捷方式原先指向 9 月旧版 `C:\Users\asus\AppData\Local\Programs\momofocus\番茄小窝.exe`，重新生成当前 `release/win-unpacked` 后更新桌面安装目录并重建快捷方式；保留 `AppData\Roaming\番茄小窝` 本地记录，避免误清空用户数据。

- 2026-10-05：修正创建任务选择正计时时仍显示专注/休息时长的问题；普通正计时创建表单隐藏两个时长输入，并将无关时长保存为默认值，养习惯任务仍保留目标时长。`npm run format:check`、`npm run build`、`git diff --check` 通过；独立来源浏览器运行态确认正计时切换后两个输入从无障碍树移除，且无 error/warn 日志，完成表单条件渲染与数据保存 code review。

- 2026-10-04：增加“养习惯”任务类别。创建/编辑任务可选择每天、每周或每月的目标分钟数、倒计时或正计时；习惯达到目标自动完成，每次点击放弃时临时选择是否保留未完成记录，旧普通番茄钟任务默认兼容。`npm run format:check`、`npm run build`、`git diff --check` 通过；浏览器运行态确认创建表单字段分支和普通番茄钟字段未受影响，完成计时边界、持久化兼容和交互状态 code review。

- 2026-10-01：修复首页专注历史只显示前三条的问题，改为渲染全部已保存记录；保留记录计数和逐条删除行为。`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成显示范围、会话数据和删除回调 code review。

- 2026-09-30：调整番茄钟放弃流程，专注阶段放弃后进入休息，休息阶段放弃才结束并记录；右上角今日专注跟随当天历史记录；少于 5 秒提示改为页面顶部绿色临时通知，5 秒内自动收起。`npm run format:check`、`npm run build`、`git diff --check` 通过；5174 本地页面加载成功且无浏览器 error/warn 日志，完成计时生命周期 code review。

- 2026-09-29：修正 Todo 双击编辑时输入框继承行字体而放大的问题；右侧列表编辑框保持 12px，旧列表保持 13px。`npm run format:check`、`npm run build`、`git diff --check` 通过，并复核 CSS 作用范围。
- 2026-09-29：Todo 支持双击进入行内编辑，Enter/失焦保存、Escape 取消，首页与右侧列表行为一致；空草稿不会覆盖原内容，完成状态、想法和删除逻辑保持不变。`npm run format:check`、`npm run build`、`git diff --check` 通过，并完成编辑状态生命周期 code review。

- 2026-09-27：进一步修复浮窗悬停不展开：将进入监听直接绑定到番茄和展开详情区，并取消浮窗 body 的原生拖动区域；番茄仍通过自定义指针事件和主进程 IPC 拖动，点击暂停/继续保持不变。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过。Windows UI 自动化运行态检查因 `@oai/sky` RPC 未配置未执行。
- 2026-09-29：移除 Electron 浮窗的 `parent: mainWindow` 关系，使浮窗成为独立顶层窗口，主窗口最小化时浮窗继续显示；主窗口关闭时仍通过 `closeFloatingWindow()` 清理浮窗。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成窗口生命周期 code review。
- 2026-09-29：补充浮窗 `skipTaskbar` 和 `floating` 置顶层级，主窗口最小化时主动 `showInactive()` 恢复浮窗；暂停逻辑改为按当前时间计算并立即持久化最终快照，修复浮窗暂停显示 00:00 的 state/ref 竞态，并处理倒计时结束临界分支。`npm run format:check`、`npm run build`、`git diff --check`、Electron 主进程语法检查通过，并完成计时生命周期 code review。

## 打包与资源约定

- 2026-10-04：再次强化浮窗独立窗口语义，显式设置 `parent: null` 和 `modal: false`，并在主窗口 `minimize` / `hide` 时统一调用 `keepFloatingWindowVisible()`，保证主窗口最小化或隐藏后浮窗仍保持置顶可见；主窗口关闭仍会清理浮窗。`npm run build`、Electron 主进程语法检查和 `git diff --check` 通过，针对本次 Electron 文件的 Prettier 检查通过。全量 `npm run format:check` 因用户并行修改的 `src/App.tsx` 既有格式差异未通过。

- Windows 安装包、快捷方式、卸载器和 Electron 主窗口统一使用 `assets/tomato.ico`。
- Electron 主进程通过 `app.getAppPath()` 定位打包后的 `assets/tomato.ico`，避免依赖开发目录层级。
- `release/` 是唯一标准打包输出目录；`release-*` 目录均视为历史临时产物，不纳入版本控制。
- 只有 `npm run electron:build` 成功后，`release/` 中的桌面程序才包含最新修改。

## iOS 原生版

- `ios/MomoFocus.xcodeproj`：SwiftUI iOS 工程，Bundle ID 为 `com.momofocus.ios`，最低 iOS 16.1。
- `ios/MomoFocus/`：主应用、模型、本地存储、计时状态机和 SwiftUI 页面。
- `ios/MomoFocusLiveActivity/`：ActivityKit Widget Extension，负责锁屏实时活动和灵动岛布局。
- `ios/MomoFocusTests/`、`ios/MomoFocusUITests/`：单元测试和启动 UI 测试。
- `codemagic.yaml`：macOS 云构建和 App Store 分发导出配置。
- `generated/ios/INSTALL.md`：签名、构建、安装和 TestFlight 说明。
- iOS 本地数据使用 `UserDefaults` + Codable，存储键使用 `momofocus.ios.*`，不迁移桌面端 localStorage，不做云同步。
- Windows 不能执行 `xcodebuild` 或 Apple 签名；必须在 macOS/Xcode 或 Codemagic 上完成 IPA 构建。
