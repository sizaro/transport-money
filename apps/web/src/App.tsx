import { BrowserRouter } from "react-router-dom";

import { AppProvider } from "@/app/providers";
import { AppRouter } from "@/app/router";

export function App() {
  return (
    <BrowserRouter>
      <AppProvider>
        <AppRouter />
      </AppProvider>
    </BrowserRouter>
  );
}
