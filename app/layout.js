import './globals.css';
import Nav from '../components/Nav';

export const metadata = {
  title: 'SearchKit',
  description: 'AI-powered job search assistant',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <div className="app-layout">
          <Nav />
          <main className="main-content">
            {children}
          </main>
        </div>
      </body>
    </html>
  );
}
