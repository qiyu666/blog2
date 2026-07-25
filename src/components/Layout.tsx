import { ReactNode } from 'react';
import { BrowserRouter } from 'react-router-dom';
import Header from './Header';
import Footer from './Footer';
import { AuthProvider } from '../auth/AuthContext';

export default function Layout({ children }: { children: ReactNode }) {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Header />
        <main>{children}</main>
        <Footer />
      </BrowserRouter>
    </AuthProvider>
  );
}
