import { createRoot } from "react-dom/client";
import { forwardRef } from "react";
import App from "./App.tsx";
import "./index.css";
import { HelmetProvider } from "react-helmet-async";

const AppWrapper = forwardRef<HTMLDivElement>((_, ref) => (
  <div ref={ref} style={{ display: "contents" }}>
    <App />
  </div>
));

createRoot(document.getElementById("root")!).render(
  <HelmetProvider>
    <AppWrapper />
  </HelmetProvider>,
);
