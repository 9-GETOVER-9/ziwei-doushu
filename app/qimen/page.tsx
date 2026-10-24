import type { Metadata } from 'next';
import SiteHeader from '@/components/SiteHeader';
import SiteFooter from '@/components/SiteFooter';
import QimenWorkspace from '@/components/qimen/QimenWorkspace';

export const metadata: Metadata = {
  title: '奇门遁甲 · 紫微',
  description: '时家转盘·拆补法。九宫排盘、盘面复制、Markdown 与图片导出，以及浏览器本地盘库。',
  alternates: { canonical: '/qimen' },
};

export default function QimenPage() {
  return <><SiteHeader /><QimenWorkspace /><SiteFooter /></>;
}
