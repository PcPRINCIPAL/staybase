# Staybase

Platform voor vakantieverhuur — eigenaars beheren hun panden zelf, Staybase doet het werk.
Dit is de werkende fase 1-app: een React-frontend met een echte API en database erachter.

## Structuur

```
├── frontend/   React + TypeScript + Vite · React Router · TanStack Query
├── backend/    Node + Express + TypeScript · Supabase Postgres (pg)
├── shared/     Gedeelde types tussen front- en backend
├── supabase/   Postgres-schema (migrations) voor het Supabase-project
└── staybase-demo.html   De oorspronkelijke klikbare demo (statisch, zelfstandig)
```

## Starten

Vereist Node 20+ en een Supabase-project (zie `backend/.env.example`).

```bash
npm install
npm run dev
```

- Frontend: http://localhost:5173 (proxyt `/api` door naar de backend)
- Backend: http://localhost:4000 (poort wijzigen kan via `API_PORT`)
- Inloggen (wachtwoord telkens **staybase2026**):
  - **julie@staybase.be** — beheerder: alles van een eigenaar, plus de Beheer-pagina (gebruikers & rollen, tijd per onboarding-stap, recente onboardings)
  - **maxime@staybase.be** — eigenaar: beheert panden en kan panden toevoegen; ziet de beheer-inzichten niet (ook de API geeft daar 403)

De backend draait volledig op **Supabase Postgres** — `SUPABASE_DB_URL` in
`backend/.env` is verplicht. Bij het opstarten maakt de app de eigen
auth-tabellen aan (users/auth_sessions) en de demo-accounts; de rest van het
schema komt uit `supabase/migrations/0002_volledig_schema.sql`. Panden en
boekingen komen binnen via de Guesty-koppeling; "vandaag" is de echte datum.
Het oude SQLite-bestand (`backend/data/staybase.db`) is enkel nog een backup
van vóór de migratie.

## Wat werkt er echt

Alle flows lopen via de API en worden bewaard in Supabase Postgres:

- **Vandaag (home)** — begroeting op dagdeel, actiebanner met het oudste onbeantwoorde bericht, vier KPI-tegels met sparklines en deltas t.o.v. vorige maand (bezetting, omzet, nachtprijs, nieuwe boekingen), vandaag/morgen-planning, pandkaarten met bezettingsbadge, en een rechterkolom met assistent-invoer, berekende inzichtkaarten en "Staybase werkte deze week" — alles live uit de boekingen en berichten.
- **Panden** — aparte pagina met tegel-, lijst- en kaartweergave. De kaart gebruikt de Mapbox-huisstijl (streets-v12 als raster-tegels via Leaflet — bewust geen mapbox-gl/WebGL, dat liep vast; `MAPBOX_TOKEN` in `backend/.env`, de frontend haalt hem op via `/api/client-config`). Coördinaten komen uit Guesty.
- **Kalender** — twee weergaven (switch rechtsboven): *Maand* met pandenlijst als kaartjes links en dagdetails rechts, en *Lijst* — een Guesty-achtige tijdlijn met één rij per pand, boekingsbalken in kanaal-kleuren en sortering op bezetting of naam (`GET /api/calendar-overview?month=`).
- **Inbox** — de echte gastenberichten uit Guesty (Airbnb & Booking.com): de sync haalt de 40 recentste gesprekken op (elke conversatie kost een extra API-call, Guesty limiteert op ±120/min). Onbeantwoorde gastberichten krijgen het label "Voor jou"; met een AI-key schrijft Staybase op verzoek een voorstel dat je goedkeurt of aanpast. ⚠️ Antwoorden worden lokaal bewaard maar nog **niet** teruggestuurd naar Guesty — dat is de volgende stap.
- **Prijzen** — voorstellen toepassen/afwijzen werkt door in kalender én prijsgrafiek.
- **Schoonmaak** — marktplaats-beurt bevestigen; watervalsysteem als uitleg.
- **Opbrengsten** — historiek (geseed) + lopende maand (live uit boekingen), per kanaal en per pand — alles telt kloppend op.
- **Onboarding-wizard** — maakt echt een pand aan (status "onboarding") dat overal verschijnt. Het adresveld checkt automatisch echte adressen (OpenStreetMap, gratis) met een dropdown; de tijd per stap wordt geregistreerd in `onboarding_events` voor de onboarding-analytics uit de analyse (`GET /api/onboarding/stats`).
- **Login, registratie & sessies** — echte authenticatie (scrypt-hashing, httpOnly-cookie); de hele API zit erachter. Registreren kan op `/registreer` (naam, e-mail, wachtwoord ≥ 8 tekens; nieuwe accounts krijgen rol `owner` en zijn meteen ingelogd) — alle "Gratis proberen"-knoppen op de website leiden erheen. ⚠️ Multi-tenancy komt pas met de Supabase-fase: elke gebruiker ziet nu nog dezelfde panden.
- **Insights** (alleen admin) — dashboard met échte cijfers uit de boekingen en gesprekken: bezetting komende 30 dagen, mediane reactietijd op gastberichten, gemiddelde verblijfsduur, boekingsvenster (boeking → check-in) en gemiddelde nachtprijs, plus grafieken voor bezetting per maand/pand, reactietijd-verdeling, verblijfsduur, boekingsvenster en kanaalmix (`GET /api/insights`).
- **Formules** — eigenaars hebben een `plan` (basic / premium / super) dat bepaalt welke schermen ze zien: Prijzen en Opbrengsten vragen **Premium**, Insights vraagt **Super**; vergrendelde items tonen een 🔒 in de sidebar en een upgrade-uitnodiging in plaats van de pagina. De API dwingt dit ook af (`requirePlan`). Admins zien alles en zetten formules om op de Beheer-pagina (`PATCH /api/admin/users/:id/plan`). Nieuwe registraties starten op basic.
- **Rollen** — `admin` en `owner` op de gebruiker; admin-endpoints (`/api/admin/*`, `/api/onboarding/stats`) zijn server-side afgeschermd met een aparte middleware, en de Beheer-pagina verschijnt alleen voor admins.
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

## Guesty koppelen (optioneel)

Guesty is in de POC de distributiehub (push naar Airbnb, Booking.com en VRBO).
De koppeling haalt listings en reservaties op en zet ze als panden en boekingen
in Staybase, naast de demodata. Aanzetten:

1. In Guesty: **Settings → Integrations → API** → maak een applicatie met scope
   **Open API** aan en kopieer de client-id + secret.
2. Zet ze in `backend/.env` als `GUESTY_CLIENT_ID` en `GUESTY_CLIENT_SECRET` en
   herstart `npm run dev`.
3. Log in als admin (julie@staybase.be) → avatar-menu → **Koppelingen** →
   *Test verbinding* en daarna *Synchroniseer nu*.

Opnieuw synchroniseren werkt bestaande rijen bij (geen dubbels, upsert op
`guesty_id`); geannuleerde reservaties worden lokaal opgeruimd. *Geïmporteerde
data verwijderen* haalt alles wat uit Guesty kwam weer weg — Guesty zelf wordt
nooit aangepast (de koppeling is puur lezend). Let op: Guesty geeft maar ± 5
OAuth-tokens per 24 uur; de app bewaart het token daarom in de database en
vraagt er nooit onnodig een aan.

## Supabase

De backend praat rechtstreeks met Supabase Postgres via `SUPABASE_DB_URL`.
Het volledige schema staat in `supabase/migrations/0002_volledig_schema.sql`
(idempotent; in de SQL Editor uitgevoerd). De `profiles`-tabel + signup-trigger
staan klaar voor de latere overstap naar Supabase Auth; tot dan gebruikt de app
haar eigen `users`/`auth_sessions`-tabellen (aangemaakt bij het opstarten).
De data uit de SQLite-fase (panden, boekingen, gesprekken, gebruikers met
formules) is op 18 aug 2026 gemigreerd.

## Volgende stappen (roadmap)

- Supabase Auth i.p.v. de eigen sessielaag (profiles-tabel + trigger staan klaar) en multi-tenancy via owner_id op panden
- ORQ.AI-gateway ertussen via `STAYBASE_AI_BASE_URL` (code blijft ongewijzigd)
- Guesty-koppeling uitbreiden: antwoorden uit de inbox terugsturen naar Guesty (POST op de conversation), webhooks voor realtime boekingen & berichten, kalender/prijzen terugschrijven (nu puur lezend), een eigen 'direct'-kanaal voor handmatige boekingen
- Deploy: frontend op Vercel, backend op Railway (accounts + secrets nodig)
