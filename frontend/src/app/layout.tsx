import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import Layout from "../components/Layout";
import HotjarScript from "../components/HotjarScript";
import { GoogleTagManagerHead, GoogleTagManagerBody } from "../components/GoogleTagManager";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "VertoDigital Web App",
  description: "AI-powered tools for digital marketing",
  icons: {
    icon: '/VertoDigital-symbol-color.png',
    apple: '/VertoDigital-symbol-color.png',
  },
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en">
      <head>
        <GoogleTagManagerHead />
        <link rel="icon" href="/VertoDigital-symbol-color.png" type="image/png" />
        <link rel="shortcut icon" href="/VertoDigital-symbol-color.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <GoogleTagManagerBody />
        <AuthProvider>
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
        <HotjarScript />
      </body>
    </html>
  );
}
