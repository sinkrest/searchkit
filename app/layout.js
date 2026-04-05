import './globals.css';
import AuthProvider from '../components/AuthProvider';
import AppShell from '../components/AppShell';

export const metadata = {
  title: 'SearchKit — AI Job Search Agent',
  description: 'Your AI job search agent. It screens jobs while you sleep, scores every role against your profile, and briefs you every morning.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body>
        <AuthProvider>
          <AppShell>{children}</AppShell>
        </AuthProvider>
      </body>
    </html>
  );
}
