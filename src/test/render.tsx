import type { ReactElement } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { MemoryRouter } from "react-router-dom";
import { render as testingLibraryRender, type RenderOptions } from "@testing-library/react";

export function render(
  ui: ReactElement,
  options?: Omit<RenderOptions, "wrapper"> & { route?: string }
) {
  const client = new QueryClient({
    defaultOptions: { queries: { retry: false, gcTime: 0 }, mutations: { retry: false } },
  });
  const { route = "/", ...renderOptions } = options ?? {};

  return testingLibraryRender(
    <QueryClientProvider client={client}>
      <MemoryRouter initialEntries={[route]}>{ui}</MemoryRouter>
    </QueryClientProvider>,
    renderOptions
  );
}

export * from "@testing-library/react";
