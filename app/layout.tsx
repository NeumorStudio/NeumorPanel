import type { Metadata, Viewport } from "next";
import { Geist } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { auth } from "@/auth";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "NeumorPanel",
  description: "Los proyectos de NeumorStudio, en un vistazo",
  // instalado en el iPhone (pantalla de inicio): icono, nombre y barra de estado
  icons: { apple: "/icons/apple-touch-icon.png" },
  appleWebApp: { capable: true, title: "NeumorPanel", statusBarStyle: "default" },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "#f6f7fa" },
    { media: "(prefers-color-scheme: dark)", color: "#171923" },
  ],
};

export default async function RootLayout({ children }: LayoutProps<"/">) {
  const session = await auth();
  return (
    <html lang="es" suppressHydrationWarning className={`${geistSans.variable} h-full antialiased`}>
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `try{var t=localStorage.getItem("neumorpanel-theme");if(!t)t=matchMedia("(prefers-color-scheme: dark)").matches?"dark":"light";document.documentElement.dataset.theme=t}catch(e){}`,
          }}
        />
      </head>
      <body className="min-h-full flex">
        {session?.login && <Sidebar />}
        <main className="flex-1 min-w-0 px-4 pt-6 pb-28 sm:px-10 sm:py-10 max-w-[1200px]">
          {children}
        </main>
      </body>
    </html>
  );
}
