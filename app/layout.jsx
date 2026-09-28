import './globals.css';

export const metadata = {
  title: 'ShadowCoach — ApexCombat.AI',
  description: 'Real-time AI combat sports and fitness coaching in your browser.',
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <body className="bg-[#09090c] text-white font-sans antialiased">{children}</body>
    </html>
  );
}
