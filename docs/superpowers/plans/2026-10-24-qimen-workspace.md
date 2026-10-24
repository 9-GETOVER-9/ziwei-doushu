# 奇门排盘实施计划

1. 根代理：核查 GitHub 排盘规则与许可，编写 `lib/qimen/engine.ts` 和显式类型，添加有独立期望值的边界回归。
2. UI 代理：独占 `components/qimen/`、`app/qimen/`，实现白紫九宫页面、表单、复制/MD/PNG、档案与错误反馈；使用共享类型及纯函数。
3. 根代理：实现 `lib/qimen/export.ts`、`lib/qimen/archive.ts`，导航与 README / 命令 / CI 接线。
4. 研究代理：独占 `docs/research/2026-10-24-qimen-rules.md`，记录候选星数、commit、许可、实际对盘及关键差异。
5. 合流后类型检查、全量适用回归、生产构建；浏览器桌面和移动端验收；独立代码复核并修正发现。
6. 按 Git 上传规则核对固定账号和 origin 全部实际推送地址，明确暂存本次文件；中文提交、推送并建立至 dev 的 PR，核查最终 head CI；更新共享项目记忆。

工作区为独立受管 worktree，起点最新 origin/dev，合入已发布的白紫页面分支作为依赖；原工作区待提交的紫微排盘和私人批量导出改动不纳入。
