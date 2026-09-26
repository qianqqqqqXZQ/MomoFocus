# MomoFocus Agent 工作规则

## 项目概览

MomoFocus（番茄小窝）是一个基于 React、Vite、TypeScript 和 Electron 的 Windows 优先桌面番茄钟应用，包含专注计时、正计时、任务、Todo、备忘录和统计功能。

详细的项目结构、功能约定、历史验证和下一步工作记录在 `.codex-work/agents.md`；当前任务拆解记录在 `.codex-work/plans.md`。开始工作前应先阅读这两个文件和 `README.md`。

## 常用命令

```powershell
# 启动 Vite 与 Electron 开发环境
npm run dev

# TypeScript 检查并构建 Vite 产物
npm run build

# 检查 Prettier 格式
npm run format:check

# 格式化源码和配置
npm run format

# 构建 Windows Electron 安装包
npm run electron:build

# 检查 Git diff 中的空白错误
git diff --check
```

项目目前没有独立的 lint、unit test 或 e2e test 脚本。修改代码后至少运行 `npm run format:check`、`npm run build` 和 `git diff --check`；涉及计时、统计、响应式布局或 Electron 行为时，还要进行相应的运行态检查。

## 修改前规则

1. 先运行 `git status --short --branch` 和 `git diff`，确认工作区现状。
2. 不得覆盖、回退或删除用户已有的未提交修改。
3. 读取 `.codex-work/agents.md` 和 `.codex-work/plans.md`，明确当前功能约定和任务范围。
4. 重大代码修改、大规模重构、部署或大量文件变更前，先创建带清晰说明的 Git 备份提交。普通单文件文档更新不强制创建备份提交。
5. 不得使用 `git reset --hard`、`git checkout --` 或其他破坏性命令回退用户修改，除非用户明确授权。

## 修改后强制闭环

每次修改项目代码或配置后，必须完成以下流程；不要在验证完成前宣布任务完成：

1. 查看 `git diff`，确认变更只包含用户要求的内容。
2. 运行与改动范围匹配的检查，最低要求为：
   - `npm run format:check`
   - `npm run build`
   - `git diff --check`
3. 对本次变更自主进行一次 code review，重点检查：
   - 功能逻辑和状态生命周期
   - 类型安全和空值/异常处理
   - 计时、日期、时区和边界条件
   - 持久化数据兼容性
   - 键盘、无障碍和响应式交互
   - Electron 开发环境与生产构建行为
   - 是否有不必要的改动、调试代码或敏感信息
4. 如果检查失败或 review 发现问题，先修复，再从第 1 步重新执行。
5. 验证和 review 都通过后，更新 `.codex-work/agents.md` 的验证记录；任务有明确子步骤时同步更新 `.codex-work/plans.md`。
6. 创建清晰的 Git commit，例如：

   ```powershell
   git add <明确的文件路径>
   git commit -m "feat: describe the change"
   ```

7. commit 成功后执行 `git push`，并确认 push 结果。
8. 如果 push 失败，保留本地 commit，报告具体原因；不得为了绕过检查使用 `--force`。

## Push 安全边界

- 默认只 push 当前分支对应的远程分支。
- 不得执行 `git push --force`、`git push --force-with-lease` 或删除远程分支，除非用户在当前任务中明确授权。
- 涉及生产部署、数据库迁移、密钥、发布配置或大规模重构时，验证和 commit 后必须先向用户确认再 push。
- 如果工作区包含用户未提交修改，不能把这些修改加入 commit，也不能为了提交而清理它们。
- push 前确认没有密钥、个人数据、构建产物或临时文件被纳入提交。

## 文档维护

- `AGENT.md`：项目级工作规则，修改流程或项目命令变化时更新。
- `.codex-work/agents.md`：项目结构、功能约定、风险、验证记录和下一步工作，是持续更新的项目记忆。
- `.codex-work/plans.md`：当前任务和功能拆解，是活文档；完成一个可验证的小步骤后立即更新对应 checklist。
- 文档和代码中的命令、路径、功能描述必须与当前仓库实际状态一致。
- 不把密钥、用户数据或无关构建产物写入工作文档。
