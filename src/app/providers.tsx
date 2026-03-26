"use client";

import { SonnerToaster } from "@/components/ui/sonner-toaster";
import { StompProvider } from "@/contexts/stomp-context";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { useState } from "react";

export function Providers({ children }: { children: React.ReactNode }) {
  const [queryClient] = useState(() => new QueryClient());

  return (
    <QueryClientProvider client={queryClient}>
      <StompProvider>
        {children}
        <SonnerToaster />
      </StompProvider>
    </QueryClientProvider>
  );
}
