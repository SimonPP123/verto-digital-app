import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "../contexts/AuthContext";
import Layout from "../components/Layout";

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
        <link rel="icon" href="/VertoDigital-symbol-color.png" type="image/png" />
        <link rel="shortcut icon" href="/VertoDigital-symbol-color.png" type="image/png" />
      </head>
      <body className={inter.className}>
        <AuthProvider>
          <Layout>
            {children}
          </Layout>
        </AuthProvider>
      </body>
    </html>
  );
}
