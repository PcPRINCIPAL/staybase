# Staybase

Platform voor vakantieverhuur — eigenaars beheren hun panden zelf, Staybase doet het werk.
Dit is de werkende fase 1-app: een React-frontend met een echte API en database erachter.

## Structuur

```
├── frontend/   React + TypeScript + Vite · React Router · TanStack Query
├── backend/    Node + Express + TypeScript · Supabase Postgres (pg)
├── shared/     Gedeelde types tussen front- en backend
├── supabase/   Postgres-schema (migrations) voor het Supabase-project
├── docs/       Externe adviezen en de bouwregels die eruit volgen (o.a. btw-advies voor de facturatiemodule)
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
  - **bram@linnois.be** — eigenaar met herkomst *Linnois*: dezelfde app, maar zonder inbox, zonder prijzen en met netto-uitbetaling in plaats van omzet. Wijs hem eerst een pand toe via **Beheer → Panden per eigenaar**.

De backend draait volledig op **Supabase Postgres** — `SUPABASE_DB_URL` in
`backend/.env` is verplicht. Bij het opstarten maakt de app de eigen
auth-tabellen aan (users/auth_sessions) en de demo-accounts; de rest van het
schema komt uit `supabase/migrations/0002_volledig_schema.sql`. Panden en
boekingen komen binnen via de Guesty-koppeling (inclusief de interne
codenaam — de Guesty-`nickname`, bv. `BE.DUIN.ARC.4` — als `code_name`); "vandaag" is de echte datum.
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
- **Herkomst** — naast rol en formule heeft elke gebruiker een `origin`: **Staybase-gebruiker** (externe eigenaar/property manager die het platform zelf bedient) of **Linnois-gebruiker** (Linnois doet het volledige beheer voor hem). Die tweede krijgt een uitgeklede variant: geen inbox-tab maar **Chat met Julie**, geen prijzen/nachtprijzen in de kalender, geen schoonmaakdetails (enkel de datum) en **netto-uitbetaling** in plaats van totale omzet. Eén bron van waarheid: `viewFor(user)` in `shared/types.ts` — de frontend verbergt ermee (`useView`, `OriginGate`), de API dwingt hetzelfde af (`requireView`) en strippt prijzen en schoonmaakdetails ook uit de payloads. Admins zien altijd alles en zetten de herkomst om op de Beheer-pagina (`PATCH /api/admin/users/:id/origin`). Nieuwe registraties starten als Staybase-gebruiker.
- **Admin-views (changes 2.0, fase 2)** — een beheerder switcht bovenaan de zijbalk tussen drie werelden: **Linnois** (enkel Linnois-panden, volledig Linnois-gebrand), **Staybase** (enkel Staybase-panden) en **Alles** (overall admin: alle panden, met per pand een merkbadge in lijsten en tegels). De keuze staat op de gebruiker (`users.admin_scope`, `PATCH /api/admin/scope`) en stuurt server-side de scoping van élk endpoint via `scopedProperties` — dashboard, kalender, inbox, opbrengsten, facturen, uitbetalingen en Beheer volgen vanzelf. Het merk van een pand komt uit `propertyBrand()`: de omgeving van de eigenaar, of zonder eigenaar de bron (Guesty-sync = Linnois, platform-onboarding = Staybase) — tot de accountonderverdeling in Guesty bestaat. Op Beheer toont een **Staybase-gebruiker** de formule-keuze en een **Linnois-gebruiker** "via commissie" (en enkel Linnois-klanten staan in het commissieblok): de fout "commissie bij een Staybase-klant" kán niet meer.
- **Huisstijl** — een *eigenaar* met herkomst *Linnois* krijgt het platform in de branding van Linnois: hun logo in de zijbalk (`/linnois-logo.png`, ingeklapt `/linnois-mark.png`) en het diepblauw **#100551** in plaats van het Staybase-koraal. Technisch: `brandFor(user)` zet `data-brand` op de document-root en `[data-brand="linnois"]` in `styles.css` overschrijft de `--coral*`-tokens. De kanaalkleuren staan bewust in eigen tokens (`--airbnb`, `--booking`, `--vrbo`), zodat Airbnb rood en Booking.com blauw blijft in kalender en grafieken. Alleen de omgeving van een Linnois-*eigenaar* slaat om: de beheeromgeving is het gereedschap van het platform zelf en blijft altijd Staybase, net als de uitgelogde website.
- **Commissie** — per gebruiker een onderhandelde afspraak: `commission_pct` (0–40%, in stappen van 0,5) en `commission_basis` (**bruto** = de totale gastbetaling, **netto** = die betaling min OTA-commissie en schoonmaakkost). Nieuwe klanten starten op 15% bruto. Instelbaar op **Beheer → Commissie per gebruiker** (`PATCH /api/admin/users/:id/commission`); enkel eigenaars hebben een afspraak. Bewust géén prijsvoorbeelden op dat scherm — puur de afspraak.
- **Gastfacturen (§9a)** — vanaf de uitcheckdag kan per boeking een factuur-PDF gedownload worden: in het boekingsdetail van de kalender, en via de nudge op het eigenaar-dashboard (uitgecheckte boekingen zonder factuur). `GET /api/bookings/:id/invoice.pdf` genereert het document (pdfkit) op naam van de **eigenaar** als logiesverstrekker, conform het btw-advies (`docs/btw-advies-bouwregels.md`): volledig **white-label** (geen logo, nergens Staybase of Linnois — enkel de brandingkleuren van de omgeving van de eigenaar), geen pandfoto's of betaalgegevens, voettekst "opgemaakt door de beheerder … voor rekening van de logiesverstrekker". Het btw-statuut van de eigenaar bepaalt het tarief: btw-plichtige vennootschap → **12%**, particulier of niet-btw-plichtige vennootschap → **btw-vrij** met de vermelding "Btw niet van toepassing…"; het tarief wordt per factuur vastgeklikt. Eén factuur per boeking: nummer (F-jjjj-nnn, doorlopend per eigenaar per jaar) en datum liggen vast bij de eerste download. De basis is de **totale gastbetaling** (`bookings.guest_total`, uit Guesty: logies + kosten + taksen), met de uitbetaling als vangnet.
- **Facturatiegegevens (§9a-popup)** — eigenaars zien op het dashboard een banner zolang hun btw-statuut onbekend is; die opent een popup (BillingModal) met drie statuutkaarten (**particulier / btw-plichtige vennootschap / niet-btw-plichtige vennootschap**) plus vennootschapsnaam, facturatieadres, btw-nummer en "dient periodieke btw-aangiften in" (bepaalt straks de verleggingsregel voor apart doorgerekende schoonmaak). Opslaan via `PATCH /api/auth/me/billing` (`users.vat_status` e.a.); de gegevens vullen de kop van de gastfactuur en het klantblok van de beheerfactuur.
- **Opbrengstenketen (§8)** — Guesty-bedragen zijn onbetrouwbaar, dus geldt overal: **haal enkel de totale gastbetaling op, reken al de rest zelf**. `payout` is uit het client-datamodel verdwenen; alle omzetcijfers (dashboard-KPI's, Opbrengsten, kalender, pandpagina) tellen op `guest_total`, en het kalenderpaneel toont "Gast betaalde" — nooit "jouw uitbetaling". De Opbrengsten-pagina heeft een ketenblok in de meeting-volgorde (gast betaalde − OTA-commissie − commissie beheerder incl. btw − schoonmaakkost = **netto uitbetaling**), gerekend met `revenueChain()` in `shared/types.ts` — dezelfde formule als de §9b-documenten, met de commissieafspraak per eigenaar. De maandgrafiek staat op volle breedte en komt live uit de boekingen (jan t/m lopende maand, per kanaal). Voor Linnois-eigenaars is de netto-KPI op het dashboard dezelfde keten, toegepast op hun eigen boekingen.
- **Eigenaarsafrekening (§9b)** — per uitgecheckte boeking twee extra documenten, volgens de klant-templates van 15/09 (cent-exact gevalideerd op het Marijke-voorbeeld): het **owner statement** (gastbetaling − OTA-commissie − schoonmaak = Net Rental Income; ter info de beheerfactuur en de netto-uitbetaling; uitdrukkelijk géén factuur) en de **beheerfactuur** ("Beheer, coördinatie en bemiddeling", 21% btw, F{jaar}-{pandcode}-{nr}, vervaldatum +30 dagen, commissie-momentopname per afspraak bruto/netto). Daarvoor bewaart de sync nu ook `bookings.guest_cleaning` en `bookings.ota_fee` (Airbnb: gastbetaling − onafgeronde uitbetaling; Booking.com: het commission-veld). De gastfactuur is na klantfeedback volledig white-label: geen logo, nergens een merknaam — brandingkleuren blijven.
- **Facturen-tab** — nieuw scherm in de zijbalk (admin én eigenaar): alle gastfacturen gegroepeerd per pand met codenaam, aantal en totaal, en per groep of over alles heen een **gebundelde download** — één PDF met elke factuur op een eigen pagina, elk in de huisstijl van zijn eigen eigenaar (`GET /api/invoices/bundle.pdf?property=…`). Eigenaars zien via de scoping enkel hun eigen panden. Onderaan de werklijst "nog te factureren" (uitgecheckt, geen factuur) — downloaden maakt de factuur meteen aan.
- **Uitbetalingen (§9c)** — admin-tab die per uitcheckmaand één run klaarzet: alle afgeronde boekingen, per eigenaar via de §8-keten opgeteld tot één overschrijving die op de 15e van de maand erna vertrekt (`GET /api/payouts`, lopende maand = stand tot vandaag). Geen directe bankkoppeling (expliciet afgevoerd in de meeting) — wel **export van een KBC-batchbestand** (`GET /api/payouts/kbc.csv?month=…`): CSV met puntkomma's, Belgisch decimaalteken en de rundatum als uitvoeringsdatum, klaar om als groepsoverschrijving in te laden zoals Billit doet. Het IBAN van de eigenaar komt uit de §9a-popup (`users.iban`, ook in `PATCH /api/auth/me/billing`); eigenaars zonder IBAN staan met een wenk in het scherm en blijven uit het bestand.
- **Onboarding 2.0 (changes 2.0, fase 4)** — de kanalen-stap is een simpele **checkbox-lijst** (Airbnb / Booking.com / VRBO, minstens één aangevinkt): geen accountkoppeling meer in de wizard, en niet iedereen hoeft op Booking. De keuze wordt bewaard op het pand (`properties.channels`). Bij "Staybase regelt het" in de schoonmaak-stap verschijnt een **poetspartner-balk**: vaste partner, foto-inspectie, en het poetscontract wordt pas ná de onboarding digitaal ondertekend (bewust geen frictie in de wizard); het e-mailveld verschijnt alleen nog bij een eigen poetsteam. **Guesty-push voorbereid**: `guesty.ts` kan eigenaars aanmaken (POST /owners), panden aanmaken (POST /listings, inactief tot foto's/attest/prijzen) en eigenaars aan listings koppelen (PUT /owners/{id}) — aangesloten op Beheer en de onboarding, maar achter `GUESTY_PUSH_ENABLED` in backend/.env zodat het productie-account van Linnois onaangeroerd blijft tot het aparte Staybase-account bestaat.
- **Breezeway (changes 2.0, fase 3)** — het poetsteam van Linnois plant en inspecteert in Breezeway; de koppeling verrijkt de poetsbeurten met het **exacte poetsmoment** (bij een gat tussen boekingen valt de poets niet op de uitcheckdag — de kalender toont het echte moment), de checklist en de inspectiefoto's, en linkt elke beurt aan de boeking ervoor. Enkel voor Linnois-panden. Per afgewerkte beurt is er een **inspectierapport-PDF met Linnois-branding** (`GET /api/cleanings/:id/report.pdf`): gastperiode, checklist, fototeller en inspectiefoto — uitdrukkelijk zónder namen van de poetsploeg; het rapport is juist voor de eigenaar en blijft dus ook in de uitgeklede Linnois-variant downloadbaar. De Koppelingen-pagina heeft een Breezeway-kaart met test/sync/reset; zonder `BREEZEWAY_CLIENT_ID`/`BREEZEWAY_CLIENT_SECRET` draait de sync in **demomodus** (realistische beurten uit de boekingen, zelfde datastructuur) en met keys neemt de echte API (`backend/src/breezeway.ts`) het over zonder schermwijzigingen.
- **Talen** — NL / FR / EN, met NL als bron. De taalkiezer staat in de navigatiebalk van de website, op login/registratie en in het gebruikersmenu van de zijbalk. De keuze wordt bewaard per gebruiker (`users.language`, `PATCH /api/auth/me/language`) en valt uitgelogd terug op localStorage en dan de browsertaal. Vertalingen staan in `frontend/src/i18n/{nl,fr,en}.ts`; ontbreekt een sleutel in FR of EN, dan toont `t()` het Nederlands in plaats van een lege plek. Vertaald: de volledige website (incl. calculator en FAQ), alle platformschermen en de onboarding-wizard; ook maand- en dagnamen lopen mee (`monthName`/`shortDate`/`dowShort` lezen de actieve taal). ⚠️ Nog Nederlands: de kennishub-artikels zelf (content wordt vervangen, zie §12) en server-gegenereerde teksten in API-data (inzichtkaartjes, tijdlijn, statuslabels, AI-antwoorden) — die vergen taalbesef in de backend.
- **Berichten vertalen** — elk gastbericht én elk AI-voorstel in de inbox heeft een **Vertaal**-knop: het origineel blijft staan, de vertaling verschijnt eronder in de taal van de interface (`POST /api/translate`, via Claude). Zonder `ANTHROPIC_API_KEY` geeft de API 503 met een leesbare melding. Vertalingen worden per doeltaal onthouden binnen het scherm.
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

## Deploy

- **Frontend (Vercel)** — `vercel.json` in de root bouwt de frontend-workspace
  (`frontend/dist`) met een SPA-fallback. Werkt zodra het Vercel-project dit
  repo gebruikt zonder verdere instellingen.
- **Backend** — de Express-API draait niet op Vercel; host hem apart (Railway/
  Render/Fly) met de env-variabelen uit `backend/.env.example`. Voeg daarna in
  `vercel.json` een rewrite toe van `/api/(.*)` naar `https://<backend-host>/api/$1`
  zodat de frontend en API onder één domein werken. Tot die tijd werkt de
  gedeployde site als website (landing + kennisbank) maar kan je er niet inloggen.

## Volgende stappen (roadmap)

- Supabase Auth i.p.v. de eigen sessielaag (profiles-tabel + trigger staan klaar) en multi-tenancy via owner_id op panden
- ORQ.AI-gateway ertussen via `STAYBASE_AI_BASE_URL` (code blijft ongewijzigd)
- Guesty-koppeling uitbreiden: antwoorden uit de inbox terugsturen naar Guesty (POST op de conversation), webhooks voor realtime boekingen & berichten, kalender/prijzen terugschrijven (nu puur lezend), een eigen 'direct'-kanaal voor handmatige boekingen
- Deploy: frontend op Vercel, backend op Railway (accounts + secrets nodig)
