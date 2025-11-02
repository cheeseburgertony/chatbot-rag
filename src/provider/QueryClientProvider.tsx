"use client";

import { QueryClient, QueryClientProvider } from "@tanstack/react-query";

const queryClient = new QueryClient();

function QueryClientProviderWrapper({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    // Provide the client to your App
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  );
}

export default QueryClientProviderWrapper;
