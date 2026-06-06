"use client";

import { SessionProvider } from "next-auth/react";
import { Toaster } from "react-hot-toast";

export default function Providers({ children }: { children: React.ReactNode }) {
  return (
    <SessionProvider>
      {children}
      <Toaster
        position="top-center"
        toastOptions={{
          duration: 3500,
          style: {
            background: "var(--paper-2)",
            color: "var(--ink)",
            border: "1px solid var(--rule-2)",
            borderRadius: "2px",
            fontFamily: "var(--font-sans)",
            fontSize: "14px",
            padding: "12px 16px",
            boxShadow: "var(--shadow-lg)",
          },
          success: { iconTheme: { primary: "var(--olive)", secondary: "var(--paper-2)" } },
          error: { iconTheme: { primary: "var(--accent)", secondary: "var(--paper-2)" } },
        }}
      />
    </SessionProvider>
  );
}
