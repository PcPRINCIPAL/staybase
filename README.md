# Staybase

Platform voor vakantieverhuur — eigenaars beheren hun panden zelf, Staybase doet het werk.
Dit is de werkende fase 1-app: een React-frontend met een echte API en database erachter.

## Structuur

```
├── frontend/   React + TypeScript + Vite · React Router · TanStack Query
├── backend/    Node + Express + TypeScript · SQLite (node:sqlite, ingebouwd in Node)
├── shared/     Gedeelde types tussen front- en backend
└── staybase-demo.html   De oorspronkelijke klikbare demo (statisch, zelfstandig)
```

## Starten

Vereist Node 22.5+ (gebruikt de ingebouwde `node:sqlite`).

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173 (proxyt `/api` door naar de backend)
- Backend: http://localhost:4000 (poort wijzigen kan via `API_PORT`)
- Inloggen: **julie@staybase.be** / **staybase2026** (demo-account, wordt mee geseed)

Bij de eerste start wordt `backend/data/staybase.db` aangemaakt en geseed met de
demodata (vaste "vandaag": vrijdag 17 juli 2026, zodat het verhaal altijd klopt).
Terug naar de beginstaat:

```bash
npm run db:reset
```

en herstart daarna de dev-server (de seed draait opnieuw bij het opstarten).

## Wat werkt er echt

Alle flows lopen via de API en worden bewaard in SQLite:

- **Vandaag** — KPI's (bezetting, omzet, gem. nachtprijs) worden live berekend uit de boekingen; de tijdlijn van vandaag wordt afgeleid uit check-outs, poetsbeurten en check-ins.
- **Kalender** — maandnavigatie, meerdere panden, kanaal-kleuren, prijzen voor vrije nachten (weekend/week + verwerkte prijsvoorstellen).
- **Inbox** — AI-voorstel goedkeuren verstuurt en bewaart het bericht, verhoogt de leerteller; kortingsvragen zijn afgeschermd (guardrail) en beantwoord je zelf.
- **Prijzen** — voorstellen toepassen/afwijzen werkt door in kalender én prijsgrafiek.
- **Schoonmaak** — marktplaats-beurt bevestigen; watervalsysteem als uitleg.
- **Opbrengsten** — historiek (geseed) + lopende maand (live uit boekingen), per kanaal en per pand — alles telt kloppend op.
- **Onboarding-wizard** — maakt echt een pand aan (status "onboarding") dat overal verschijnt.
- **Login & sessies** — echte authenticatie (scrypt-hashing, httpOnly-cookie); de hele API zit erachter.
- **Assistent** — beantwoordt ook vrij getypte vragen; regelgebaseerd, of via Claude als er een key is.

## AI aanzetten (optioneel)

Zonder configuratie draait de AI-laag op regels — alles blijft werken. Voor échte
AI-antwoorden (assistent) en het herschrijven van gast-drafts in de inbox:

```bash
cp backend/.env.example backend/.env
# vul ANTHROPIC_API_KEY in en herstart npm run dev
```

Guardrails blijven hard afgedwongen: vragen over kortingen of voorwaarden gaan
nooit naar het model — die komen altijd eerst bij de eigenaar. `STAYBASE_AI_BASE_URL`
is het koppelpunt voor de ORQ.AI-gateway uit de analyse.

## Volgende stappen (roadmap)

- Supabase (Postgres + auth) in plaats van lokale SQLite en de eigen sessielaag — schema en `requireAuth`-laag zijn erop voorzien
- ORQ.AI-gateway ertussen via `STAYBASE_AI_BASE_URL` (code blijft ongewijzigd)
- Guesty-koppeling (POC) voor echte boekingen en distributie
- Deploy: frontend op Vercel, backend op Railway (accounts + secrets nodig)
