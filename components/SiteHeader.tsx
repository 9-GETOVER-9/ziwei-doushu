'use client';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { useState } from 'react';
import { useTheme } from './ThemeProvider';

const links=[['/','首页'],['/chart','紫微命盘'],['/heming','合盘'],['/twins','命理双子'],['/academy','学术中心']];
export default function SiteHeader(){
  const pathname=usePathname();
  const {theme,toggle}=useTheme();
  const [open,setOpen]=useState(false);
  return <>
    <a href="#main-content" className="skip-link">跳转到主要内容</a>
    <header className="site-header">
      <Link href="/" className="site-wordmark" aria-label="紫微 · 返回首页"><img src="/reference/orbit.svg" width="28" height="28" alt=""/><span>紫微</span><span className="site-wordmark-note">知命 · 明心</span></Link>
      <nav className="site-nav" aria-label="主导航">{links.map(([href,label])=><Link key={href} href={href} aria-current={pathname===href?'page':undefined}>{label}</Link>)}</nav>
      <div className="site-header-actions">
        <button className="theme-button" onClick={toggle} aria-label={theme==='dark'?'切换到浅色模式':'切换到深色模式'}><img src="/reference/moon.svg" width="18" height="18" alt=""/></button>
        <Link className="header-archive" href="/chart#archives">我的命盘</Link>
        <button className="mobile-menu-toggle" aria-expanded={open} aria-controls="mobile-navigation" onClick={()=>setOpen(!open)}>{open?'收起':'菜单'}</button>
      </div>
    </header>
    {open&&<nav className="mobile-navigation" id="mobile-navigation" aria-label="移动导航">{links.map(([href,label])=><Link href={href} key={href} onClick={()=>setOpen(false)} aria-current={pathname===href?'page':undefined}>{label}</Link>)}<Link href="/sanjige" onClick={()=>setOpen(false)}>三纪研习</Link></nav>}
  </>;
}
