import './globals.css';

export const metadata = {
  title: 'ShadowCoach — ApexCombat.AI',
  description: 'Real-time AI combat sports and fitness coaching in your browser.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body className="font-sans antialiased min-h-screen">{children}</body>
    </html>
  );
}
