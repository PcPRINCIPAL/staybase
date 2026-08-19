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

// De eerste verbinding met Supabase kan haperen (wifi net terug, laptop uit
// slaapstand) — dan proberen we het opnieuw i.p.v. dood te blijven liggen.
async function start(): Promise<void> {
  const wait = (ms: number) => new Promise((r) => setTimeout(r, ms));
  for (let attempt = 1; ; attempt++) {
    try {
      await bootstrap();
      break;
    } catch (err) {
      if (attempt >= 5) {
        console.error("Database-bootstrap bleef mislukken na 5 pogingen:", err);
        process.exit(1);
      }
      const delay = attempt * 3000;
      console.warn(`Database nog niet bereikbaar (poging ${attempt}/5), nieuwe poging over ${delay / 1000}s…`);
      await wait(delay);
    }
  }
  app.listen(PORT, () => {
    console.log(`Staybase API draait op http://localhost:${PORT} (Supabase Postgres)`);
  });
}

void start();
