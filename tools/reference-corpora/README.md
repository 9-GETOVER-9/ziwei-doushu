# 三纪阁公开语料快照

本目录用于功能迁移与非商业学习研究，作为源码仓库中的固定快照按上游 CC BY-NC-SA 4.0 条件保留来源及许可。未取得商业使用授权，也不声称已获得原课程版权人的独立授权。

| 语料 | 上游 | 固定提交 | 条数 | 课程单元 |
| --- | --- | --- | ---: | ---: |
| 天纪 | [Renhuai123/nihai-tianji-corpus](https://github.com/Renhuai123/nihai-tianji-corpus) | `462faa4c70af40b8b87ad82ffa82a5823a485e94` | 4,886 | 112 |
| 人纪 | [Renhuai123/nihai-renji-corpus](https://github.com/Renhuai123/nihai-renji-corpus) | `fdafae1ea685756a92a59179fdfa2e6a01379100` | 19,294 | 117 |

每个子目录保留上游原始 `entries.jsonl`、`README.md`、`LICENSE.md`；字节未改。`manifest.json` 记录下载时间、固定提交、字节数与 SHA-256。原项目 `docs/tianji-ziwei/` 的 1,848 条精选语料没有被覆盖。

语料由 Renhuai123 整理，数据与文档许可为 **CC BY-NC-SA 4.0（署名—非商业性使用—相同方式共享）**。原课程内容著作权归倪海厦先生及其权利继承人所有；上游声明收到权利方异议将下架相应内容。复制、再分发与修改必须保留来源和许可，并遵守非商业、相同方式共享条件。上游 `tools/` 代码的 MIT 许可不替代语料许可。

本地仅提供原引文、分类、课程筛选与原视频回放链接，不生成医疗诊断或治疗建议，不搬运任何视听内容。页面通过 `lib/reference-corpora.ts` 服务端读取，每次只输出当前分页结果。

课程标识按真实来源分组：天纪使用 `bvid + part`（两个合集的分 P 会重号）；人纪使用 `book + ep`（每集有独立 BV，`part` 通常为 1）。回放链接保留各条原始 `bvid`、`part`、`t_hms`，不根据显示标题猜测出处。

校验命令：`npx tsx scripts/regression/reference-corpora.test.ts`。
