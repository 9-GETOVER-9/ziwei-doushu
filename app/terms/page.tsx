import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
export const metadata={title:'使用说明 · 紫微'};
export default function TermsPage(){return <><SiteHeader/><main id="main-content" className="studio-page"><header className="studio-heading"><span className="studio-label">文化研究与自我探索</span><h1>使用说明</h1><p>了解这张星图能做什么，以及它的边界。</p></header><div className="help-list">
<details open><summary>计算与解读</summary><p>本应用基于 MetisZiwei 开源项目的紫微斗数排盘引擎。星曜、宫位、四化与格局规则可以核对；传统命理解读是文化解释，不能视为已验证的个人事实。AI 回答由配置的模型生成，可能存在错误，不能替代医疗、法律或财务判断。</p></details>
<details open><summary>出生信息与时间口径</summary><p>请按实际记录选择历法、时刻和地点。真太阳时、夏令时与子时换日的选择会影响盘面。时辰未知时显示的命盘采用明确标注的占位时辰；人物样本中的估算时辰不代表已证实的出生记录。</p></details>
<details open><summary>资料来源与许可</summary><p>排盘代码和资料保留原项目的 LICENSE、DATASET-LICENSE 与各来源标注。古籍、现代导读、天纪讲义和模型生成内容的性质不同。界面参考千星已现的排版风格，本应用与参考站不存在账号或业务关联。</p></details>
<details><summary>当前可用范围</summary><p>本地版本提供排盘、双盘结构比较、人物样本检索、古籍和讲义研习、本地档案与可配置 AI 接口。当前没有商业会员、支付、真人同盘社交或云端档案功能。模型服务需配置后才能使用。</p></details>
</div></main><SiteFooter/></>;}
