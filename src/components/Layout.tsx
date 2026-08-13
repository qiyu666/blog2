import { ReactNode, useEffect, useState, useRef } from 'react';
import { useLocation, useNavigate } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MusicPlayer from './MusicPlayer';
import BackToTop from './BackToTop';
import KeyboardShortcuts from './KeyboardShortcuts';

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();
  const navigate = useNavigate();
  const [kbdOpen, setKbdOpen] = useState(false);
  const keyBufferRef = useRef<{ key: string; time: number } | null>(null);

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  // 全局键盘快捷键
  useEffect(() => {
    const onKeyDown = (e: KeyboardEvent) => {
      const target = e.target as HTMLElement;
      const isInput = target.tagName === 'INPUT' || target.tagName === 'TEXTAREA' || target.isContentEditable

      // ? 键：切换快捷键说明
      if (e.key === '?' || (e.key === '/' && e.shiftKey)) {
        if (!isInput) {
          e.preventDefault();
          setKbdOpen((prev) => !prev);
        }
        return;
      }

      // Esc：关闭
      if (e.key === 'Escape' && kbdOpen) {
        setKbdOpen(false);
        return;
      }

      if (isInput) return;

      // g + key 组合快捷键
      const now = Date.now();
      const key = e.key.toLowerCase();

      if (key === 'g') {
        keyBufferRef.current = { key: 'g', time: now };
        return;
      }

      if (keyBufferRef.current && keyBufferRef.current.key === 'g' && now - keyBufferRef.current.time < 1500) {
        keyBufferRef.current = null;
        switch (key) {
          case 'h': navigate('/'); break;
          case 'n': navigate('/notifications'); break;
          case 'p': navigate('/settings'); break;
          case 'w': navigate('/new'); break;
          default: break;
        }
        return;
      }

      // / 键：聚焦搜索
      if (key === '/') {
        e.preventDefault();
        const searchInput = document.querySelector('input[type="search"], input[placeholder*="搜索"]') as HTMLInputElement | null;
        if (searchInput) searchInput.focus();
      }
    };

    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [kbdOpen, navigate]);

  return (
    <>
      <Header />
      <main>{children}</main>
      {pathname === '/' && <Footer />}
      <MusicPlayer />
      <BackToTop />
      <KeyboardShortcuts open={kbdOpen} onClose={() => setKbdOpen(false)} />
    </>
  );
}
