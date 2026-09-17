# Staybase — changes 2.0 (evaluatiemeeting 16/09/2026)

Bronnen: meetingtranscripten `Staybase_2.1_nld.txt` en `Staybase_2.2_nld.txt`
(T-Base on-site) plus de notities van Maxime. De transcripten verhaspelen
"Linnois" tot Linkwa/Linwa/Lenua/Leanwa/Lenoir/Liéndois/LiTowards — overal
genormaliseerd naar **Linnois**. De vorige ronde staat in
`staybase-changes-evaluatiemeeting.md`; dit document bouwt daarop verder.

## Deadlines uit de meeting

- **Afkloppen Linnois-omgeving: de 29e.** Eigenaren krijgen hun login **de 30e**.
- Linnois-eigenaarsomgeving moet "over twee weken" volledig ready zijn
  (transcript zegt "1 september", context wijst op **1 oktober** — twee weken
  na de meeting van 16/09).
- **Volgende meeting: de 25e** — dan moet de kleurtest (#1278EB) zichtbaar zijn.

---

## Fase 1 — Quick wins & visuele fixes (vóór het afkloppen)

### 1.1 Owner statement (§9b-document)

- [x] De rode wenk **"Dit is GEEN factuur" helemaal onderaan** het document,
      zodat de styling van de rest niet verstoord wordt.
- [x] **"Omschrijving" en "Bedrag" bóven de blauwe lijn** in plaats van eronder.
- [x] **Haakjes rond bedragen weg** — afgehouden posten krijgen een **minteken**
      ervoor.
- [x] **Onderverdeling in de kosten**: structuur wordt *totale gastbetaling* →
      *kostenposten elk met een minnetje* → *netto*. "Dan zie je direct:
      pap, pap, pap." (Zelfde leeslogica als de §8-keten in het platform.)

### 1.2 Beheerfactuur (§9b-document)

- [x] De **Linnois-gegevens (Linnois BV, Stationsstraat 2, btw, IBAN) onder
      elkaar** in plaats van op één lijn — mag het logo niet raken.
- [x] **Linnois-logo 10% groter**, met voldoende witruimte errond zodat niets
      het logo raakt. Algemeen: "gewoon meer spatie".
- [x] De omschrijvingsteksten zelf zijn goedgekeurd ("de teksten die erop
      staan zijn goed") — niet aankomen.

### 1.3 Facturen-tab

- [x] **"Nog te factureren" bóven** de al uitgereikte facturen, zodat meteen
      duidelijk is wat er nog moet gebeuren.

### 1.4 Uitbetalingen / KBC

- [x] Mededeling **"Uitbetaling verhuur …" → "Eigenaarsinkomsten …"**.
      Harde regel uit de meeting: **het woord "verhuur" mag nérgens op het
      platform in uitbetalingscontext staan** — check ook de i18n-teksten
      (pay.*-sleutels) en de referentie in de KBC-CSV.

### 1.5 Login

- [x] **"Wachtwoord vergeten"-optie** op het inlogscherm van het platform.

### 1.6 Kleurtest landingspagina

- [x] Het rood/koraal op de **landingspagina vervangen door #1278EB** als
      test. Thema en layout blijven identiek — enkel de kleur. Het origineel
      blijft bewaard zodat we op de meeting van de 25e kunnen kiezen ("als we
      zeggen: nee, dan gaan we terug naar het rood"). Praktisch: als apart
      kleurthema/vlag bouwen, niet hard overschrijven.

### 1.7 Kleine fixes

- [x] KPI "Boekingen dit jaar: 17 × 92 nachten" is onduidelijk — herformuleren
      (bv. "17 boekingen · 92 nachten").

---

## Fase 2 — Admin brand-switch (drie werelden)

De grootste structurele change van deze ronde. Julie (admin) kan **switchen
tussen drie admin-views**:

| View | Ziet | Branding |
|---|---|---|
| **Linnois-admin** | enkel Linnois-panden | Linnois (diepblauw #100551) |
| **Staybase-admin** | enkel Staybase-panden | Staybase (koraal) |
| **Overall admin** (super) | alle panden | Staybase, met visueel onderscheid per pand |

- [x] **Switch in de admin-UI** — drie-standenswitch bovenaan de zijbalk; de keuze wordt bewaard (`users.admin_scope`). (idee uit de meeting: knop/switch bij het
      profiel of bovenaan de zijbalk) — "dat het voor je hersenen makkelijk is
      om te snappen: ik ben nu in Linnois aan het werken".
- [x] **Scoping**: in Linnois-view enkel Linnois-panden, in Staybase-view enkel
      Staybase-panden, overall alles. Momenteel zijn álle panden Linnois.
- [x] **Color coding / branding volgt de view**, inclusief een **visueel
      verschil tussen Linnois- en Staybase-panden** in lijsten (badge/kleur)
      voor de overall view. (De `ownerBrand`-infrastructuur bestaat al.)
- [x] **Beheer-pagina per herkomst**: bij een **Staybase-gebruiker verdwijnt
      het commissieblok** (die werkt nooit met commissie — "die fout mag niet
      gemaakt kúnnen worden") en komt er een blok **formules/abonnement/upsells**
      voor in de plaats. Bij een **Linnois-gebruiker** blijft commissie
      (pakketten: 15% en 20%) en verdwijnen de formules.
- [~] **Guesty-onderverdeling**: er komt een nieuw "Staybase"-account in
      Guesty naast Linnois (en een nieuw Airbnb-account voor Staybase).
      De sync moet de account-koppeling van elk pand meenemen zodat de
      brand-scoping automatisch klopt. Benoit komt terug op de exacte opzet.
      *(Tussentijds: het merk van een pand volgt de eigenaar, en zonder
      eigenaar de bron — uit Guesty = Linnois, via het platform = Staybase
      (`propertyBrand()` in backend/src/lib.ts). Zodra het Staybase-account in
      Guesty bestaat, vervangt de accountkoppeling die regel op één plek.)*

---

## Fase 3 — Breezeway-koppeling (schoonmaak, §11)

Startpunt van de integraties — "ik ga sowieso beginnen met die Breezeway".
Login beschikbaar (julie@linnois.be); toegang tot het platform is er.

⚠️ **Draait in demomodus** tot er API-keys zijn (BREEZEWAY_CLIENT_ID +
BREEZEWAY_CLIENT_SECRET in backend/.env, aan te maken onder Settings →
Integrations → API): de sync bouwt dan realistische poetsbeurten op uit de
boekingen, met dezelfde datastructuur — de echte API-client staat klaar en
neemt het over zodra de keys er zijn, zonder schermwijzigingen.

- [x] **Breezeway-data binnentrekken** en de boekingsdata in Staybase ermee
      **verrijken**: geplande poetsbeurten (datum/uur), status, check-in/
      check-out-inspecties.
- [x] **Exacte poetsmoment** tonen in de kalender (lost de vraag op: gat van
      tien dagen tussen boekingen → wanneer valt de poets echt).
- [x] **Inspectierapporten + foto's** ophalen per poetsbeurt (checklist, fototeller, inspectiefoto).
- [x] **Rapport-PDF met Linnois-branding** per boeking voor de eigenaar:
      samenvatting van de periode + foto's. **Zonder namen van de poetsploeg**
      (wel de gastperiode). Ter beschikking stellen aan de eigenaarszijde.
- [x] Scope: enkel voor Linnois-panden (of Staybase-klanten die
      Linnois-schoonmaak afnemen).
- Later/idee: AI op de inspectiefoto's (schadedetectie) en het aparte
  "Stay Clean"-poetspartnerdashboard — zie backlog.

---

## Fase 4 — Onboarding op punt (prio na de facturen)

- [~] **Onboarding-flow afwerken** — kanaalkeuze en poetscontract-flow staan (hieronder); de §10-restjes (brandveiligheidsattest als pop-up ná afronding, spraak-stap eruit, follow-up-mail een dag later) volgen apart.
- [x] **Kanaalkeuze als checkboxes**: het "koppel account"-scherm verdwijnt
      volledig; per kanaal (Airbnb / Booking / VRBO) gewoon aanvinken waar het
      pand mag komen. Niet iedereen wil op Booking. Eventueel variant per
      formule (premium).
- [x] **Poetscontract-flow**: bij "Staybase regelt het" komt een balk eronder
      met de aangeraden partner; het contract (via Staybase, niet rechtstreeks
      met de poetsfirma) wordt **achteraf** getekend — niet in de onboarding
      zelf (frictie). Contracttekst aan te leveren door Linnois.
- [x] **Guesty-API nakijken: gebruikers en panden aanmaken + eigenaar aan pand
      koppelen** vanuit Staybase, zodat er niets meer manueel in Guesty moet.
      Ook: eigenaar-aan-pand koppelen in Beheer moet doorstromen naar Guesty.
      *(Nagekeken en gebouwd: de Open API kan het — POST /owners, POST
      /listings, PUT /owners/{id} met listingIds. De functies staan in
      guesty.ts en zijn aangesloten op Beheer (eigenaar-koppeling) en de
      onboarding (nieuw pand → inactieve listing), maar schrijven staat
      achter GUESTY_PUSH_ENABLED in backend/.env: pas aanzetten zodra het
      aparte Staybase-account in Guesty bestaat, anders vervuilen we het
      productie-account van Linnois.)*

---

## Fase 5 — Duve & gastenportaal (research eerst)

Duve is het huidige gastenportaal (online check-in, huisregels, keybox-codes,
wifi, parking, automatische mails, taaldetectie, **security deposit via
Stripe**). Sentiment in de meeting: *"Duve hebben we niet meer nodig, daar
willen we vanaf stappen"* — maar de automatische mails/antwoorden zijn nu
ontregeld en dat is core business.

- [ ] **Toegang tot Duve** regelen (uitnodiging naar maxime@oblivionlabs.ai is
      verstuurd) en **functionaliteit in kaart brengen**: wat moet Staybase
      overnemen om Duve eruit te kunnen smijten?
- [ ] **Korte termijn**: nagaan waarom de automatische mails/antwoorden van
      Duve ontregeld zijn — dat moet dringend terug werken (of vervangen).
- [ ] **Lange termijn — eigen gastenportaal** (mobielgericht, minimale
      functionaliteit, zelfde data): online check-in (met taaldetectie, heel
      het proces in de taal van de gast), huisregels, betreed-instructies
      (keybox-code, foto's, verdieping), wifi, parking-info, mail bij boeking.
      Zo weinig mogelijk frictie bij het inchecken.
- [ ] **Admin-kant: infopagina per pand** — instelbaar welke info de gast bij
      check-in te zien krijgt (codes, instructies, wifi, parking).
- [ ] **Stripe-API** voor security deposits (loopt nu via Duve/Stripe).
- Dit is ook een **upsell/eigen product** ("dat kunnen we aan hotels
  verkopen") — apart houden van de kernflow.

---

## Fase 6 — Landingspagina 2.0

- [ ] **Korter**: nooit meer dan ±3 schermen scrollen; de coole dingen blijven,
      maar **achter doorklikpagina's** ("doorklikken is diepgaander, dat is
      vertrouwelijker") — goed voor SEO (echte pagina's achter "lees meer",
      bv. verhalen).
- [ ] Elementen kleiner, **betere subtitels**.
- [ ] Cijferclaim aanpassen: **"15 à 25%" in plaats van "20 tot 30%"**.
- [ ] **"Mijn dashboard"-knop** op de website (login voor bestaande klanten,
      ook voor Linnois-eigenaars).
- [ ] Doelgroepcheck: is voor iemand van midden 40 meteen duidelijk wat dit
      doet? Benoit & Julie printen de pagina en duiden aan wat blijft/weggaat
      — **input afwachten**, de rest is bijzaak deze sprint.
- [ ] Kleurtest #1278EB (zie 1.6) op deze pagina tonen op de meeting van de 25e.

---

## Backlog / ideeën (bewust nog niet inplannen)

- **Upsell-visual op het Staybase-eigenaarsdashboard**: rustig balkje onder
  schoonmaak — "liever alles uit handen geven?" Reverse upsell richting
  Linnois, zónder Linnois prominent te vermelden; eventueel getriggerd als
  het pand premium is en in de regio valt (lead gen). Eerst een voorstel
  uitwerken.
- **Stay Clean**: eigen poetspartner-app/dashboard (checklists, foto-upload
  met metadata, locatie-registratie aankomst/vertrek, geen uitbetaling zonder
  volledige checklist, poets op afroep, commissie per poets). Volgend project.
- **Guesty eruit**: rechtstreekse connector met Airbnb/Booking (mails
  verstuurd, moeilijk traject — beurzen als alternatief spoor). Guesty kost
  ±€20/pand/maand en snijdt van de abonnementen.
- **Maandbundel owner statements** (alles per pand per maand gegroepeerd zoals
  de Uptown-voorbeelden): niet nodig voor eigenaars ("als we er één per
  boeking hebben is dat in orde"), misschien later voor intern gebruik.
- **AI op inspectiefoto's**: schadedetectie, 3D-reconstructie uit een handvol
  foto's ("arrows: daar heb je nog geen foto van").

---

## Nog te checken met Benoit/Julie

- [ ] **Facturen backtesten**: voor ±10 boekingen nakijken of gastbetaling,
      schoonmaakkost en OTA-commissie exact kloppen (schoonmaak komt uit
      Guesty — "Guesty pusht altijd naar buiten", dus geen inconsistentie
      tussen Airbnb en Booking).
- [ ] Exacte opzet van het nieuwe Staybase-account in Guesty/Airbnb (Benoit
      komt erop terug).
- [ ] Landingspagina-input (geprinte annotaties) en de kleurkeuze op de 25e.
- [ ] URL-lijst voor de doorklikpagina's/SEO opnieuw doorsturen.

---

## Voorgestelde volgorde van aanpak

1. **Fase 1 volledig** (documentfixes, facturen-volgorde, KBC-wording,
   wachtwoord vergeten, kleurtest, KPI-fix) — klein, zichtbaar, en de
   documenten moeten juist staan vóór het backtesten.
2. **Fase 2 brand-switch** — structureel, raakt scoping/branding overal en
   moet er zijn vóór de Staybase-panden echt bestaan.
3. **Fase 3 Breezeway** — expliciet als eerste integratie genoemd.
4. **Fase 4 onboarding** — nodig zodra echte Staybase-gebruikers aanmelden.
5. **Fase 5 Duve-research** — parallel te starten (toegang + inventaris),
   bouw pas na de inventaris.
6. **Fase 6 landingspagina** — wacht op input van Benoit/Julie ("bijzaak"
   deze sprint, behalve de kleurtest van de 25e).
