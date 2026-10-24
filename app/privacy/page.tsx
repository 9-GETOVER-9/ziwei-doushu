import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
export const metadata={title:'隐私与数据 · 紫微'};
export default function PrivacyPage(){return <><SiteHeader/><main id="main-content" className="studio-page"><header className="studio-heading"><span className="studio-label">关于你的数据</span><h1>隐私与数据</h1><p>当前本地版本的数据处理说明 · 2026年10月17日</p></header><div className="help-list">
<details open><summary>排盘与本地档案</summary><p>排盘在浏览器中计算。点击保存后，姓名、出生日期、出生时间、性别与地点选项存入当前浏览器的本地存储。档案不会自动同步到其他设备。可在「我的命盘」删除记录，或导出 JSON 自行保管；清理浏览器站点数据也会移除本地记录。</p></details>
<details open><summary>AI 解读与追问</summary><p>仅在主动点击生成或发送问题时，命盘输入和本次对话会发送到本地服务器。服务器重新计算命盘，将必要的盘面结构与对话发送给实例所配置的模型服务，不主动发送姓名与地点。你在问题中自行输入的个人信息仍会随对话发送。模型服务的数据处理规则以该服务商为准。</p></details>
<details open><summary>页面偏好与记录</summary><p>浏览器保存明暗主题和命盘档案。本版本没有登录、支付、云数据库或分析统计脚本。开发服务器会输出访问路径等运行日志；通过链接打开含出生参数的命盘时，参数也可能留在地址栏和浏览历史中。</p></details>
<details><summary>外部资料与数据导出</summary><p>点击课程视频和外部来源后会进入对应第三方站点，其数据处理方式由该站点决定。下载的命盘文件含出生信息，分享前请自行检查内容。</p></details>
</div></main><SiteFooter/></>;}
