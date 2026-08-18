import { loadEnv } from "./env";
loadEnv();

import express from "express";
import cors from "cors";
import { routes } from "./routes";
import { bootstrap } from "./db";
import { authRoutes, requireAuth } from "./auth";

const app = express();
// Lokaal wint API_PORT (PORT botst met Vite); op Railway e.d. komt PORT binnen.
const PORT = Number(process.env.API_PORT || process.env.PORT || 4000);

// Express 4 vangt async fouten niet; zonder dit vangnet zou één mislukte
// query het hele proces neerhalen (Node stopt op unhandled rejections).
process.on("unhandledRejection", (err) => {
  console.error("Onafgehandelde fout in een request:", err);
});

app.use(cors({ origin: true, credentials: true }));
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "staybase-api" });
});
app.use("/api/auth", authRoutes);
app.use("/api", requireAuth, routes);

bootstrap()
  .then(() => {
    app.listen(PORT, () => {
      console.log(`Staybase API draait op http://localhost:${PORT} (Supabase Postgres)`);
    });
  })
  .catch((err) => {
    console.error("Database-bootstrap mislukte:", err);
    process.exit(1);
  });
