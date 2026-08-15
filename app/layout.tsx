import type { Metadata } from 'next';
import './globals.css';
import { MidnightBoundary } from '../components/MidnightBoundary';
import { Navbar } from '../components/Navbar';
import { Footer } from '../components/Footer';

export const metadata: Metadata = {
  title: 'VeilDrop — Privacy-first whistleblowing on Midnight',
  description:
    'Submit a confidential whistleblower report. Your identity stays private on-chain via zero-knowledge proofs — never revealed to anyone.',
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en">
      <body>
        <MidnightBoundary>
          <div className="flex min-h-screen flex-col">
            <Navbar />
            <main className="flex-1">{children}</main>
            <Footer />
          </div>
        </MidnightBoundary>
      </body>
    </html>
  );
}
