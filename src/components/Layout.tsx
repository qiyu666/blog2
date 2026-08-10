import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MusicPlayer from './MusicPlayer';
import BackToTop from './BackToTop';

// 后台页面路径前缀列表（这些页面不显示页脚）
const ADMIN_PATHS = [
  '/admin',
  '/analytics', 
  '/settings',
  '/security',
  '/customize',
  '/drafts',
  '/mailbox',
  '/favorites',
  '/notifications',
  '/series/manage'
];

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // 判断是否为后台页面
  const isAdminPage = ADMIN_PATHS.some(path => 
    pathname === path || pathname.startsWith(path + '/')
  );

  return (
    <>
      <Header />
      <main>{children}</main>
      {!isAdminPage && <Footer />}
      <MusicPlayer />
      <BackToTop />
    </>
  );
}
