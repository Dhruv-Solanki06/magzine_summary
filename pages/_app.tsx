import "@/styles/globals.css";
import type { AppProps } from "next/app";
import { Inter } from "next/font/google";

import { AuthProvider } from "@/components/auth/AuthProvider";
import { ToastProvider } from "@/components/common/Toast";
import { AuthGateProvider } from "@/components/auth/AuthGate";
import { LibraryProvider } from "@/lib/useLibrary";
import { ReadingTrackerProvider } from "@/lib/useReadingTracker";
import AppShell from "@/components/common/AppShell";
import RouteProgress from "@/components/common/RouteProgress";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

export default function App({ Component, pageProps }: AppProps) {
  return (
    <AuthProvider>
      <ToastProvider>
        <AuthGateProvider>
          <LibraryProvider>
            <ReadingTrackerProvider>
              <div className={`${inter.variable} font-sans`}>
                <RouteProgress />
                <AppShell>
                  <Component {...pageProps} />
                </AppShell>
              </div>
            </ReadingTrackerProvider>
          </LibraryProvider>
        </AuthGateProvider>
      </ToastProvider>
    </AuthProvider>
  );
}
