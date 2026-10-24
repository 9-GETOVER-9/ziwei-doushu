# 本地 AI 解读接口

这层实现真实模型请求与流式传输，不包含 Metis 商业端的提示词、断语库或用户服务。未配置时明确返回 `503 AI_NOT_CONFIGURED`，不会以本地模板伪装 AI 输出，也不会生成匹配分数。

## 配置

将根目录 `.env.example` 复制为 `.env.local`，填写服务端变量后重启开发服务：

- `AI_PROVIDER`：`openai-compatible`（默认）、`openai`、`deepseek` 或 `anthropic`。
- `AI_API_KEY`：所选服务商密钥。也支持相应 `OPENAI_API_KEY`、`DEEPSEEK_API_KEY`、`ANTHROPIC_API_KEY`；`AI_API_KEY` 优先。
- `AI_MODEL`：服务商实际可用的模型 ID，必填，不预设某个付费模型。
- `AI_BASE_URL`：服务商 API 根地址。OpenAI 兼容协议追加 `/chat/completions`，Anthropic 追加 `/messages`。不要填网页聊天地址或已经含有该 endpoint 的地址。
- `AI_MAX_TOKENS`：输出上限，默认 4096。
- `AI_TIMEOUT_MS`：完整请求超时，默认 120000 毫秒。
- `AI_TOKEN_LIMIT_FIELD`：可选，`max_tokens` 或 `max_completion_tokens`。OpenAI 官方地址默认后者，其他兼容接口默认前者；Anthropic 固定使用 `max_tokens`。

密钥只由服务器访问。不要使用 `NEXT_PUBLIC_` 前缀、不要将 `.env.local` 提交到仓库。本次实现用于自用本地开发；未实现公开服务所需的账号鉴权、持久额度或计费体系。

## 接口约定

`POST /api/interpret`，JSON：

```ts
{
  chart: ZiweiChart,
  messages: Array<{ role: 'user' | 'assistant'; content: string }>
}
```

`POST /api/heming`，JSON：

```ts
{
  chartA: ZiweiChart,
  chartB: ZiweiChart,
  question?: string,
  relationship?: '未指定' | '恋人' | '夫妻' | '朋友' | '事业伙伴' | '上下级' | '亲子' | '恋爱' | '婚姻' | '合作',
  messages?: Array<{ role: 'user' | 'assistant'; content: string }>
}
```

合盘若提供 `messages`，它就是完整本轮对话并优先于 `question`，最后一条必须是用户本次问题。仅提供 `question` 时为单次合盘分析。

服务端只提取 `chart.birthInfo` 的年月日、时辰索引与性别，以本项目默认引擎重新排盘，不信任客户端传来的星曜、宫名或解读。年月日与时辰应已经过前端的真太阳时及晚子时换日归一化，不重复校正。姓名与地名不进入模型上下文。接口接受规范化排盘日 1899–2100 年、时辰索引 0–11；下限含 1899 是为了接受原始 1900 年初的真太阳时跨日校正。带 `birthInfo.unknownTime: true` 的示例盘会返回 `400 UNKNOWN_BIRTH_TIME`，不作为有效时辰解读。

若输入包含 `standardTime`，服务端严格校验并保留它，用于节气年/月柱的分钟级判断；未提供时沿用旧记录时辰中点并标明来源。该标准时刻是扣除可选DST后、真太阳时/晚子归日前的东八区时间，不重复扣减DST。

`POST /api/life-kline/interpret`，JSON为 `{ chart, year, theme }`，其中 `year` 是所选农历年，`theme` 为 `overall | career | wealth | relationship`。只接受这三个顶层字段；服务端重排命盘并重新生成该年的月段四化证据，不接受客户端评分、提示词或会话。返回与原接口相同的SSE协议。此接口解释公开方法 `sihua-month-segment-v1` 的相对变化，不重新打分；出生首年/截止尾年保留不完整标记，不编造流日流时、事件或缺失月份。

图表生成不依赖AI。此年度解读入口与原本命解读相互独立；仅在用户点击时调用已配置模型。切换年份/主题/命盘或离开K线视图会取消当前请求。测试命令 `npm run test:ai` 已覆盖两个原接口和新增年度接口，均使用模拟上游，不产生模型费用。

请求体限 256 KiB；历史最多 24 条、单条最多 16000 字符、总计最多 48000 字符。客户端问题限 4000 字符。拒绝客户端 system 消息，拒绝异源浏览器请求；浏览器来源与请求的实际 Host 和协议比较，不信任 X-Forwarded-Host。对话内容只用于当前请求，不在服务器记录或持久保存。

成功响应为 SSE：

```text
data: {"delta":{"text":"新增文字"}}

data: [DONE]

```

请求开始前失败为非 200 JSON：`{ "error": { "code": "AI_NOT_CONFIGURED", "message": "用户可理解的说明" } }`。

流式中途失败发送 `data: {"error":{"code":"AI_STREAM_FAILED","message":"…"}}`，不发送成功终止标记。已经收到的正文可保留，但不视为完整回答。上游错误正文、密钥和堆栈不会回传。

客户端共用 `streamAi(path, body, abortSignal, onText)`，`onText` 收到累计全文。它正确处理跨网络 chunk 的中文 UTF-8、JSON 与 SSE 边界，并在失败时抛出用户可理解的错误。取消请求会传递到上游；服务端另有完整请求超时。

## 验证

在项目根目录运行：

```powershell
node node_modules/tsx/dist/cli.mjs lib/ai/api.test.ts
npm run typecheck
```

2026-10-17 已通过这两项检查。测试使用合成命盘输入、进程内模拟 fetch 和假的测试密钥，不读取 `.env`，不请求真实模型，不产生 API 费用。覆盖未配置、两种协议、合盘追问、输入边界、命盘重建、UTF-8/SSE 拆包、脱敏错误、连接中断、取消、超时与客户端接收。

这验证传输与错误处理，不证明某个实际服务商账号或模型可用，也不验证模型生成内容的命理准确性。真实服务连通性需配置有效密钥和模型后，在页面主动选择一个主题验证。

## 实现依据

- OpenAI 官方 Chat Completions API 与流式消息：https://developers.openai.com/api/reference/resources/chat
- Anthropic 官方流式 Messages：https://platform.claude.com/docs/en/build-with-claude/streaming
- Next.js 官方 Route Handlers：https://nextjs.org/docs/app/api-reference/file-conventions/route
- 本机 Next.js 对应说明：`node_modules/next/dist/docs/01-app/01-getting-started/15-route-handlers.md`。

UI 不在打开命盘时自动调用付费模型；主题、选中宫位与追问都由用户主动触发。`ChatPanel` 复用 `InsightPanel`，避免再次引入两套流式解析和错误处理。
