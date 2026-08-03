import { loadEnv } from "./env";
loadEnv();

import express from "express";
import cors from "cors";
import { routes } from "./routes";
import { authRoutes, requireAuth } from "./auth";

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "staybase-api" });
});
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth, routes);

app.listen(PORT, () => {
  console.log(`Staybase API draait op http://localhost:${PORT}`);
});
