# 人生 K 线 GitHub 实现核查

核查日期：2026-10-17。目标：给现有紫微排盘网站增加可追溯的人生 K 线，借鉴已有项目的实际实现，避免把随机图形或模型输出冒称传统统一标准。使用 `xinghuo` 技能；本次为公开源码静态阅读，未安装、运行这些项目，未验证其线上服务、预测效果或生产安全性。

## 结论与当前项目选择

已有项目适合参考蜡烛图、悬浮详情、大限分段和年份选择交互，但本次核查没有发现可直接沿用的、经独立验证的“紫微传统标准分数”。八字项目主要由 AI 输出分数与 OHLC；紫微专用项目同时提供 AI 路径与包含随机扰动的规则路径。排盘事实确定，不代表其后附加的数值权重获得了传统或实证认证。

本项目建议独立实现四层结构：

1. **排盘事实**：沿用已核查的出生归一化与运限模块，保持虚岁、春节、闰月、童限等口径一致。
2. **透明规则指数**：固定版本、固定权重；每项加减能回溯到星曜、四化、宫位和运限层级。标明这是项目自定义可视化指数。不得使用 `Math.random`、伪随机哈希、平滑补点或强制起伏来装饰结果；缺失输入保持缺失。
3. **OHLC 聚合**：年度蜡烛由该农历年实际 12/13 个流月指数聚合，O 为首月、H 为最大值、L 为最小值、C 为末月。不要为了股票式连续效果强制本年 O 等于上年 C；图例清楚说明这里的数值是规则指数而非资产价格或人生事件发生率。闰月若按前后半月建模，应明确样本单位并保持详情与聚合相同。
4. **可选 AI 说明**：只解释已经生成的证据和指数，不让模型重写数值、制造年份事实或补出不存在的引用。未配置服务时，规则图表仍可使用。

这一路线可直接复用本项目已核查的紫微时间轴，不必引入其他仓库的八字排盘、账户、收费或浏览器密钥管理系统。以下“可借鉴”是设计建议，不表示已经复制其代码。

## 候选与固定版本

| 项目 | 固定 commit / 提交时间（UTC） | 实际框架 | 许可核查 | 适合借鉴 |
|---|---|---|---|---|
| [miounet11/life-kline](https://github.com/miounet11/life-kline) | `7abf184df370452ee8279d72c8b45bc09e19913b` / 2025-12-22 07:37:04 | React 19、Vite 5、Recharts 2；Express、SQLite、lunar-javascript | 有 Apache-2.0 LICENSE 与 NOTICE | 图表缩放、分段、年份详情；许可资料相对完整 |
| [cellinlab/ziwei](https://github.com/cellinlab/ziwei) | `74eb62bb6ef7239b680f44e2bc40bcd9601eec43` / 2026-03-25 12:30:58 | package 实际为 React 19、Vite 7、Recharts 3、iztro 2.5 系列；README 的 React 18 描述落后 | README 写 MIT，但固定树中未找到独立 LICENSE，GitHub license 字段为 null；不据此直接复制 | 紫微命盘到 K 线的产品结构；评分不照搬 |
| [curionox/lifekline](https://github.com/curionox/lifekline) | `b9a27a71260a09f26a1e3757fbee2ba71f52773b` / 2025-12-14 13:08:55 | React 19、Vite 5、Recharts 2 | 固定树未见 LICENSE，GitHub license 字段为 null | Prompt → JSON → 图表的最简链路；不能视为已确认可复用代码许可 |

另对照了 [ruijayfeng/ziwei](https://github.com/ruijayfeng/ziwei) 的 `614d6e104ad4d559193667187806cbb5760037ec`（2026-09-20 15:48:39 UTC）。其 `fortune-score.ts` 与 cellinlab 对应文件的数值和随机生成核心相同，差异主要为知识上下文及函数签名。该固定版本的 [LICENSE](https://github.com/ruijayfeng/ziwei/blob/614d6e104ad4d559193667187806cbb5760037ec/LICENSE) 和 [README](https://github.com/ruijayfeng/ziwei/blob/614d6e104ad4d559193667187806cbb5760037ec/README.md) 明确 GPLv3 / v3 或更高版本。不能拿另一个仓库旧 README 的 MIT 字样替代当前版本许可；本项目没有复制其评分代码。

## 1. miounet11：模型生成，以及人为构造的降级蜡烛

- [统一分析器](https://github.com/miounet11/life-kline/blob/7abf184df370452ee8279d72c8b45bc09e19913b/server/unifiedAnalyzer.js) 调用模型（temperature 0.6），读取返回的 `chartPoints`。代码保留不足 50 点且有时间骨架时调用 `generateFallbackKLine` 的分支，同时存在不足 50 点返回校验失败的检查；静态阅读不能保证所有失败路径都会进入降级。模型请求失败另有明确失败返回。
- [提示词](https://github.com/miounet11/life-kline/blob/7abf184df370452ee8279d72c8b45bc09e19913b/constants.ts) 要求模型生成维度评分与年度 OHLC，并刻意要求曲线明显起伏。因此“看起来有牛熊周期”本身不是独立计算证据。
- [年度降级函数](https://github.com/miounet11/life-kline/blob/7abf184df370452ee8279d72c8b45bc09e19913b/server/baziCalculator.js#L121) 以 50 为底分，按日主与流年、大运的五行及支关系作固定加减，再增加干支字符编码推导的 −5 到 +5 扰动，裁剪到 20–95。之后从单个年度分数人工构造影线：`volatility = abs(score-50)/10+3`；high/low 为 score 加减此波动的倍率，close 为 score，open 按 score 是否达到 50 向两侧偏移。它没有用逐月真实指数取年度最高、最低。该年度分支是确定性合成，不应和同文件月/日分支的 `Math.random` 混称。
- [图表](https://github.com/miounet11/life-kline/blob/7abf184df370452ee8279d72c8b45bc09e19913b/components/LifeKLineChart.tsx) 使用自定义蜡烛形状、Brush 缩放、大运参考线、年份悬浮和点击。此处是最值得借鉴的交互。
- 复用前核对 [LICENSE](https://github.com/miounet11/life-kline/blob/7abf184df370452ee8279d72c8b45bc09e19913b/LICENSE) 与 [NOTICE](https://github.com/miounet11/life-kline/blob/7abf184df370452ee8279d72c8b45bc09e19913b/NOTICE)，保留适用的声明。没有把仓库声称的“完整源码”推断为当前线上服务与此快照完全一致。

## 2. 紫微专用仓库：规则外壳并不等于确定性评分

[cellinlab 评分源码](https://github.com/cellinlab/ziwei/blob/74eb62bb6ef7239b680f44e2bc40bcd9601eec43/app/src/lib/fortune-score.ts) 与 [对照版本](https://github.com/ruijayfeng/ziwei/blob/614d6e104ad4d559193667187806cbb5760037ec/app/src/lib/fortune-score.ts) 可读到：

- 有人工制定的星曜基础分、庙旺亮度系数、四化修正和事业/财帛等宫位组合；未见这些精确数值的原典出处或独立校准结果。
- 人生主图的本地生成路径先算大限基础与流年修正，但随后增加随机项：流年修正 ±7.5；close 向目标分随机移动 30%–70%，再加 ±7.5；high/low 由额外随机影线构造；四维分数也加入随机项。重复生成同一输入不保证同一图形。
- 模型路径要求模型直接返回 1–100 岁的 OHLC 和短评。解析后缺失年龄用 50 等默认数值补齐，四维分数仍含随机项；这不构成逐年证据验证。
- [实际页面](https://github.com/cellinlab/ziwei/blob/74eb62bb6ef7239b680f44e2bc40bcd9601eec43/app/src/components/kline/LifeKLine.tsx) 有 API key 时优先模型，无 key 或出错时调用本地生成函数。年度选择、十年分隔、详情卡和维度图可以作为交互参考；用户应能区分模型结果、规则结果与失败状态。

同一评分文件还有按月份样本聚合 OHLC 的辅助函数，但不能将它们的存在误当成当前人生主图已采用逐月聚合。也不能因为使用 iztro 排出了宫位，就替后续手工权重和随机扰动背书。

## 3. curionox：最简 AI JSON 导入模板

[固定 README](https://github.com/curionox/lifekline/blob/b9a27a71260a09f26a1e3757fbee2ba71f52773b/README.md) 描述手填四柱和大运、复制提示词到 AI、导入 JSON 的操作。[提示词](https://github.com/curionox/lifekline/blob/b9a27a71260a09f26a1e3757fbee2ba71f52773b/constants.ts) 要求模型输出 100 条年度点和 OHLC，同时要求明显起伏；维度评分的 0–10 与年度示例约 0–100 是两种量尺，不能混用。

[服务代码](https://github.com/curionox/lifekline/blob/b9a27a71260a09f26a1e3757fbee2ba71f52773b/services/geminiService.ts) 仍提供直接模型请求，temperature 0.7；当输入 key 为 `demo` 时读取预制的 `mock-data.json`。这是明确的演示模式，不是该用户的实际计算。图表只是展示输入/模型提供的数据，未发现独立的传统 OHLC 计算来源。

可借鉴“导入经过校验的数据，展示并保留来源”这一入口；本项目不需要照搬其完整提示词、币圈建议或 API key 输入方式。由于许可证未核清，本次只研究行为，不纳入源文件。

## 入口比较与证据边界

| 入口 | 本次最小核查 | 可用信息 | 边界 |
|---|---|---|---|
| GitHub API + 固定 commit raw 源码 | 成功获取 commit、目录树、相关源码、package 与存在的许可证 | 能追踪 OHLC 的真实生成函数、默认分支和依赖 | 仅静态分析；未证明部署状态、准确率和安全性 |
| 项目 README / 演示网站 | 作为产品线索，与源码交叉核对 | 功能与交互意图 | README 有滞后；线上可能已偏离固定 commit |
| 社交教程 / 视频 | 站点限定公开搜索及视频元数据读取 | 取得一个YouTube视频的作者、日期、说明，未观看或转写 | 元数据不等于视频正文；补充渠道记录见下方链接 |

检索词包括“人生 K 线 GitHub”“life kline OHLC scoring”“人生K线 MIT”“紫微 K线 fortune-score”。未安装或执行未知仓库，未调用付费模型、私有 API 或购买课程；未复制整仓代码或凭据到本项目。

## 星火渠道覆盖

| 必查渠道 | 实际状态 | 可复制的后续搜索词 |
|---|---|---|
| GitHub | 搜索后以 API/raw 源码核查上述固定版本；历史线索 `qfmytxdy/lifekline` 本次返回 404，未当作可用仓库 | `人生K线`、`life kline OHLC`、`ziwei fortune-score` |
| X | 已尝试 `site:x.com` 的相关公开网页搜索，未取得可用原帖全文 | `lifekline github`、`人生K线 开源 算法` |
| YouTube | 已读取 [TzFilm 视频](https://www.youtube.com/watch?v=PG179_RLytE)元数据（2026-01-06）及说明；未观看或转写，不以此验证算法 | `人生K线 开源`、`life kline AI github` |
| 小红书 | 已尝试 `site:xiaohongshu.com` 搜索，未取得可用原帖证据 | `人生K线 原理`、`人生K线 分数怎么算` |
| 知乎 | 已尝试 `site:zhihu.com` 搜索，未取得可用相关回答全文 | `人生K线 算法 AI 随机` |

各平台的补充尝试、失败原因和产品公开页面记录见[公开渠道核查](2026-10-17-life-kline-channels.md)。

Gemini 深度调研提示词（仅供手动执行，本次未运行）：

> 请调研 GitHub 人生 K 线和紫微 K 线实现。优先 miounet11/life-kline、cellinlab/ziwei、ruijayfeng/ziwei、curionox/lifekline，固定 commit 后追踪真实页面到分数/OHLC 生成函数。区分确定性排盘、作者自定权重、随机扰动、AI 生成和演示数据；核实每个版本 LICENSE/NOTICE。只引用实际阅读的原始源码与许可，不把演示图或 README 当准确性证据。给出可复现代码位置、限制及适合独立实现的交互，不下载付费或盗版资料。

ChatGPT 深度调研提示词（仅供手动执行，本次未运行）：

> 为已有紫微排盘网站审查“人生 K 线”设计。公开检索上述 GitHub 项目及原作者说明，核实 OHLC 是否从真实月份序列聚合，是否使用 Math.random、字符哈希、AI 或缺失值补 50；验证源码与 README 是否一致，报告固定 commit 与许可证。提出不复制不明许可代码的实现：真实运限时间轴、版本化透明规则指数、12/13 农历月聚合、逐项依据和可选 AI 叙述。区分已核实、推断与未验证，不宣称一种分数是传统通用标准或经过预测验证。
