import express from "express";
import cors from "cors";
import { routes } from "./routes";

const app = express();
const PORT = Number(process.env.API_PORT || 4000);

app.use(cors());
app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true, service: "staybase-api" });
});
app.use("/api", routes);

app.listen(PORT, () => {
  console.log(`Staybase API draait op http://localhost:${PORT}`);
});
