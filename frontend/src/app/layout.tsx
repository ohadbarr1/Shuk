import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/ui/NavBar";

export const metadata: Metadata = {
  title: "Shuk.io — מחקר מניות בורסה תל אביב",
  description: "פלטפורמת מחקר פונדמנטלי לבורסה בתל אביב. DCF, מכפילים, נתוני דוחות כספיים.",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="he" dir="rtl" className="dark">
      <body className="min-h-screen bg-gray-950 text-gray-100 antialiased">
        <NavBar />
        <main>{children}</main>
      </body>
    </html>
  );
}
