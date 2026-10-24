import Link from 'next/link';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
export default function Support(){return <><SiteHeader/><main className="studio-page" id="main-content"><header className="studio-heading"><span className="studio-label">慢慢开始</span><h1>使用帮助</h1><p>从出生信息，到读懂命盘上的每一个线索。</p></header><div className="help-list">
<details open><summary>第一次来，从哪里开始？</summary><p>进入<Link href="/chart">紫微命盘</Link>，选择公历或农历，填写出生日期、时间和地点。起盘后可查看概览、十二宫、格局，并切换本命、大限和流年。也可以先看<Link href="/chart?example=1">示例命盘</Link>。</p></details>
<details><summary>出生时间和真太阳时怎么填写？</summary><p>填写北京时间，选择出生地点后可启用真太阳时校正。跨日、晚子时与农历会由统一排盘流程处理。曾采用夏令时的出生日期可按实际记录勾选夏令时校正。不知道出生时辰时，可选择未知，结果会明确标注采用的占位时辰。</p></details>
<details><summary>我的命盘保存在哪里？</summary><p>命盘档案保存在当前浏览器的本地存储中，不会自动上传。更换浏览器或清理站点数据后记录不会保留；请通过工作台的导出功能自行留存。当前版本不提供云账号与跨设备同步。</p></details>
<details><summary>怎样使用 AI 解读和追问？</summary><p>在命盘工作台选择 AI 解读并点击生成，后续可围绕同一张命盘追问。只有配置了模型服务的实例才能生成；未配置时会显示明确提示。点击发送后，命盘计算数据和问题会发给该实例配置的模型服务。</p></details>
<details><summary>合盘和命理双子有什么区别？</summary><p><Link href="/heming">合盘</Link>用于比较两个人的命盘结构；<Link href="/twins">命理双子</Link>用于检索收录人物的相似配置。人物样本含估算时辰，结构相似不代表经历相同，也不等于关系匹配分数。</p></details>
<details><summary>想继续学习，在哪里查资料？</summary><p><Link href="/academy">学术中心</Link>汇集主星简介、古籍导读搜索与课程讲义。三纪研习收录天纪、人纪公开语料，保留讲次和原视频时间戳；古籍页面是项目整理节录与现代释义，并非校勘版古籍全文。</p></details>
</div></main><SiteFooter/></>;}
