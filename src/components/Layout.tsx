import { ReactNode, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import MusicPlayer from './MusicPlayer';
import BackToTop from './BackToTop';

export default function Layout({ children }: { children: ReactNode }) {
  const { pathname } = useLocation();

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [pathname]);

  return (
    <>
      <Header />
      <main>{children}</main>
      <Footer />
      <MusicPlayer />
      <BackToTop />
    </>
  );
}
