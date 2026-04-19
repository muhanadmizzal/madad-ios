import { createRoot } from "react-dom/client";
import App from "./App.tsx";
import "./index.css";
import { bootstrapCapacitorUi } from "@/lib/capacitorBootstrap";

bootstrapCapacitorUi();

createRoot(document.getElementById("root")!).render(<App />);
