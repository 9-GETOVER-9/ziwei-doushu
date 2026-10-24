# 网站风格迁移使用的克隆工作流

核查日期：2026-10-17。用户要求使用 `ai-website-cloner-template`，将 metisziwei 的功能迁入千星已现报告页的视觉风格。

## 已核验的工具

- 上游仓库：https://github.com/JCodesMore/ai-website-cloner-template
- 本地目录：`tools/ai-website-cloner-template/`
- 获取方式：只读上游并浅克隆至新工具目录，未覆盖现有应用。
- 固定核查提交：`ee3f5a2f31fd549b9593fa4f7cf6d2955ee593bb`
- `package.json`：版本 `0.6.1`，MIT，Node `>=24`。
- 本机已验证：Node `v25.9.0`、npm `11.12.1`。
- 已完整阅读本地 `README.md`、`AGENTS.md`、`.agents/skills/clone-website/SKILL.md`、`references/inspection-guide.md` 和 `references/framer-and-motion.md`。

这是 Agent 工作流和 Next.js 起始框架，不是独立截图或一键抓站程序。`scripts/` 只有 `.gitkeep`；依赖中没有 Playwright 或 Puppeteer。因此页面观察、截图、交互与样式测量使用本次会话提供的浏览器工具；构建继续在当前紫微项目内进行。没有为工具模板安装另一份应用依赖。

## 在本项目中的复用方式

本项目已有 `app/`、`components/`、`lib/ziwei/`，采用 Next.js 16、React 19 和 Tailwind CSS 3。克隆 Skill 明确要求遵循现有应用约定，故复用其观察、映射、构建、比较流程；不将模板的 `src/` 和 Tailwind CSS 4 配置覆盖到本项目。用户明确要把两个网站的功能与风格组合，属于该 Skill 允许的组合应用范围。

1. **映射**：记录参考 URL 对应的本地路由及文件归属；保留已有排盘、合盘、百科、古籍等功能路由。查询参数和锚点按页面状态处理。
2. **观察**：实看桌面与移动端，滚动全页；记录导航、折叠、选项、悬浮和主要入口的触发与结果。读取实际字体、颜色、宽度、间距等样式，不以单张截图推断所有响应式规则。记录无法访问的页面或状态。
3. **构建**：先完成页面宽度、字体、颜色、共享导航等，再迁移确定性排盘与可实现的交互。图片、字体等实际需要的资源记录来源和本地路径。可见控件必须有对应行为。
4. **比较**：源页与本地使用相同视口、滚动位置和状态对照；优先修复版式、缺失内容和字体，再处理间距与动画。检查移动端溢出、资源失败、运行错误和已有路由回归。

本项目完成验证应运行现有 `npm run typecheck`、`npm test` 和 `npm run build`，并保留渲染截图及实际工作流检查。工具模板自己的 `npm run check` 等于 lint、typecheck、build；本次未把该模板作为另一个运行应用。

## 交付证据与边界

应保留路由映射、页面观察简报、资源映射、代表性桌面/移动端参考与本地截图、实际验证结果和剩余差异。成功构建不能替代页面观察；不宣称未检查的页面达到逐像素一致。

当前开源紫微仓库提供排盘算法、命盘展示、合盘起盘、古籍及百科。其 README 明确：线上商业前端、用户/会员/支付系统、AI 提示词与 API、断语库不在开源范围。页面观察能够确认外观与公开交互，不能恢复未公开的服务端实现。

工具目录在本机保留为独立上游参考仓库，公开发布时不将嵌套 Git 目录打包为不完整 gitlink。需要复现工作流时，在项目根目录运行以下命令即可取得同一版本；应用运行不依赖此工具目录。

```powershell
git clone https://github.com/JCodesMore/ai-website-cloner-template.git tools/ai-website-cloner-template
git -C tools/ai-website-cloner-template checkout ee3f5a2f31fd549b9593fa4f7cf6d2955ee593bb
```

父项目 TypeScript 已排除 `tools/ai-website-cloner-template`，避免把另一套 scaffold 当成本项目源码。

来源：以上工具事实来自该固定提交的文件；当前紫微能力边界来自本项目 `README.md`。此文件不声称目标站已完成视觉还原，也不记录私人报告正文。
