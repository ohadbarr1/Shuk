import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Shuk.io — מחקר מניות בורסה תל אביב",
  description: "פלטפורמת מחקר פונדמנטלי לבורסה בתל אביב. DCF, מכפילים, נתוני דוחות כספיים.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 font-sans antialiased">
        <nav className="border-b border-gray-800 px-6 py-3 flex items-center justify-between">
          <a href="/" className="text-xl font-bold text-brand-500 tracking-tight">
            shuk.io
          </a>
          <div className="flex gap-6 text-sm text-gray-400">
            <a href="/screener" className="hover:text-white transition-colors">סורק מניות</a>
            <a href="/company/TEVA" className="hover:text-white transition-colors">דוגמה</a>
          </div>
        </nav>
        <main>{children}</main>
      </body>
    </html>
  );
}
