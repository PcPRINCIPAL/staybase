# Staybase — changes uit evaluatiemeeting

Gedistilleerd uit de twee transcripten. Gegroepeerd per module, met per item wat er concreet moet gebeuren. Onderaan: openstaande vragen en wat er langs klantzijde moet komen.

**Naamgeving:** de transcriptie verhaspelt het beheerbedrijf (Linwa, Leanwa, Lino, Helinoë) — het is **Linnois**, hieronder overal zo geschreven. Linnois is het property-managementbedrijf zelf; **Staybase** is het platform dat ook aan externe eigenaars/property managers verkocht wordt. Dat onderscheid loopt door bijna elke feature heen.

---

## 1. Gebruikerstypes & rechten (raakt alles, eerst doen)

Er zijn twee assen die samen bepalen wat iemand ziet:

| As | Waarden | Effect |
|---|---|---|
| Herkomst | Staybase-gebruiker vs. Linnois-gebruiker | bepaalt zichtbaarheid van inbox, prijzen, schoonmaakdetails |
| Formule | Basic vs. Pro (+ modules) | bepaalt feature locks |

- [x] Veld/flag toevoegen in Beheer per gebruiker: **Staybase-gebruiker of Linnois-gebruiker**. Dashboard past zich automatisch aan.
- [x] Linnois-gebruiker krijgt de **huisstijl van Linnois**: hun logo in de zijbalk en #100551 als accentkleur in plaats van het Staybase-koraal. Kanaalkleuren (Airbnb rood, Booking blauw) blijven.
- [x] Linnois-gebruiker: **geen inbox-tab** (Linnois doet de gastcommunicatie voor hen), enkel "Chat met Julie".
- [x] Linnois-gebruiker: **geen prijzen, geen prijssetting, geen nachtprijzen** in kalender. Reden: ze gaan bellen over waarom een week zo geprijsd staat.
- [~] Linnois-gebruiker ziet **netto-uitbetaling**, niet de totale omzet. *(labels en framing staan er; de berekening zelf volgt met §8)*
- [ ] Rollen/formules nu Basic/Premium/Super → **hertekenen naar het 2-pakkettenmodel** (zie §2).
- [ ] Eigenaar-aan-pand koppelen: nu handmatig, moet automatisch op basis van e-mailadres.

---

## 2. Pakketten & feature locks

- Model: **Basic** (bewust laag geprijsd, instapmodel) + **Pro** (full option), met **modules** die je erbij hangt.
- [ ] Slotjes in de navigatiebalk voor features die niet in de formule zitten → klik toont **upgrade-scherm**. (Zit er al in, behouden en uitbreiden.)
- ⚠️ Feature-matrix en prijzen per pakket moeten nog van Staybase komen — zie §12.

---

## 3. Landingspagina

- [ ] **2 à 3 blokken schrappen**, een paar samenvoegen. Nu is het één lange scroll.
- [ ] Calculator/prijzenblok **kleiner en compacter**.
- [ ] Reviews: **bovenste variant behouden**, onderste weg.
- [ ] Hero/foto's: **AI-gegenereerde beelden vervangen door herkenbaar Belgisch vastgoed** (Belgische kust). Argument: eerste markt is België, Belgen zijn wantrouwig, het moet Belgisch ogen én mooi zijn.
- [ ] Kennishub-artikels: flow staat er, **echte content moet erin** (zie §12).

---

## 4. Navigatie & dashboards

- [x] Zijbalk i.p.v. topnav, inklapbaar tijdens werken — al gedaan, goedgekeurd.
- [ ] **Nieuwe tab in de linkerbalk: "Facturen" / "Financieel overzicht"** — aan zowel admin- als eigenaarszijde.
- Admin-dashboard (goedgekeurd zoals het is): insights, check-ins/check-outs, actions on the side, panden met bezettingsgraad per maand, AI-chat over de portfolio.
- Eigenaar-dashboard (goedgekeurd): volgende check-in, kalendertje met bezetting, inbox beperkt tot eigen panden.

---

## 5. Inbox & chat

- [ ] **Inbox en "Chat met Julie" splitsen** in twee aparte items. Nu te verwarrend: gastberichten en berichten aan de beheerder lopen door elkaar.
- [x] **Vertaalknop op het gastbericht zelf** — bericht blijft eerst in originele taal staan, knop vertaalt ter plaatse.
- [x] **Vertaalknop ook op het AI-voorstel.**
- [x] **Filterbalk bovenaan de inbox: filter op één pand.** Zowel admin- als eigenaarszijde; "Alle panden" blijft de standaard.
- [ ] **Zoekfunctie in de inbox.**
- [~] **Semantisch zoeken** — dit was een uitgesproken pijnpunt met Guesty. *(eerste stap staat: de Panden-pagina heeft een zoekveld op naam, locatie en interne codenaam — genormaliseerd, dus "beduin" vindt BE.DUIN.ARC.4; de inbox-zoekfunctie en alias-matching volgen)* Panden hebben interne codenamen (`be.duinark.be` = "Duin Arka" = De Pagode) en het team praat in die codenamen. Zoeken op "Duin Arka" moet De Pagode opleveren. Fuzzy matching op codenaam, adres en alias.
- [ ] **Chat met Julie moet ook AI-antwoorden geven** voor eigenaars, net zoals de gastenchat.
- Later: AI-voorstellen **proactief klaarzetten** i.p.v. op knop drukken.

---

## 6. Kalender

- [ ] **Check-in en check-out uit elkaar trekken.** Check-in is 17u, check-out is 10u, daartussen zit de schoonmaak.
- [ ] **Schoonmaakblok tussen de boekingen** in plaats van het sponsicoontje op de boeking. Duidelijk of het ingepland is of niet.
- [ ] Zit er een week tussen twee boekingen: **schoonmaakblok op de dag dat het ingepland staat** (bv. dinsdag), zodat je ziet dat het pand pas vanaf woensdag weer beschikbaar is.
- [ ] Klik op schoonmaakblok → **uur van de schoonmaak** tonen.
- [ ] **Kleurtinten differentiëren** binnen hetzelfde kanaal (bordeaux/varianten van rood) zodat opeenvolgende Airbnb-boekingen niet als één blok van een hele maand lezen. Blauw = Booking.com, rood = Airbnb blijft.
- [ ] **Klusjes/taken kunnen ingeven** per pand, in de kalender — zowel uitgevoerd als nog te plannen (bv. toilet laten herstellen in Duinbergen).
- [ ] **Nudge als er nog geen kost aan een klusje hangt**, zodat het meeloopt naar de facturatie. Alles moet doorgerekend kunnen worden.

---

## 7. Commissie-instellingen (Beheer)

- [x] Een **slider voor het commissiepercentage** — in overleg **per gebruiker** gezet in plaats van per pand. Supersimpel aanpasbaar: slepen of het exacte cijfer typen (halve procenten).
- [x] Naast de slider een **dropdown bruto/netto**:
  - **bruto** = totale gastbetaling
  - **netto** = totale gastbetaling − OTA-commissie − schoonmaakkost
- Standaard is bruto; netto is een commerciële geste die klanten vaak vragen (ze willen geen commissie betalen over kosten die ze al afdragen).
- [x] **Geen nachtprijzen of prijsvoorbeelden** in dit scherm — expliciet afgevoerd, puur informatief houden.

---

## 8. Opbrengsten & berekeningen ⚠️ kern van de meeting

Guesty is onbetrouwbaar: berekent anders voor Airbnb dan voor Booking, en de bedragen die het toont zijn geen bruikbare bruto of netto.

**Regel: haal uit Guesty enkel de totale gastbetaling. Alle rest rekenen we zelf in Staybase.**

- [ ] Ophalen: **totale gastbetaling** (in het voorbeeld €1015 — wat de gast effectief van haar kaart betaalde, incl. OTA-commissie en schoonmaak).
- [ ] **Niet tonen**: het bedrag "jouw uitbetaling" van €857,67 (= 1015 − servicekost en host, dus de OTA-commissie), en niet wat er op de rekening van Linnois gestort is. Een eigenaar mag niet zien dat er €5038 bij Linnois binnenkomt terwijl er €4300 naar hem gaat.
- [ ] Berekening in het platform, oplijsten in deze volgorde:
  1. Gast betaalde
  2. − OTA-commissie (Airbnb/Booking fee)
  3. − Commissie Linnois
  4. − Schoonmaakkost
  5. = **Netto uitbetaling**
- [ ] Grafiek opbrengsten breder maken.
- [ ] Later: rapporten downloaden (nog niet gebouwd).

---

## 9. Facturatie

Twee volledig gescheiden stromen. Dit is het grootste nieuwe blok.

### 9a. Eigenaar → gast (eigenaarszijde)

De eigenaar blijft juridisch de exploitant en is verplicht een factuur naar de gast te sturen, op de dag van check-out.

- [x] **Knop per boeking** (in kalender/boekingsdetail, naast "stuur een bericht"): **factuur downloaden** — beschikbaar vanaf de uitcheckdag; vóór check-out toont het paneel vanaf wanneer het kan. *(versturen per mail volgt)*
- [x] **Nudge aan eigenaarszijde**: banner op het dashboard met alle uitgecheckte (of binnen 2 dagen aflopende) boekingen zonder factuur, met downloadknop per boeking.
- [x] **White-label factuur automatisch genereren**: sobere PDF op naam van de eigenaar (logiesverstrekker), zonder pandfoto's of betaalgegevens; nummering per eigenaar per jaar (F-2026-001), nummer en datum liggen vast bij de eerste download; voettekst "opgemaakt via …, in naam en voor rekening van de logiesverstrekker" per btw-advies. *(vennootschapsgegevens vullen aan zodra de onboarding-popup er is)*
- [ ] Onboarding-popup die de nodige gegevens ophaalt: **particulier / btw-plichtige vennootschap / niet-btw-plichtige vennootschap** (patrimoniumvennootschap e.d.) + vennootschapsgegevens. Bepaalt of er btw op de factuur mag/moet.
- [ ] Btw-vrije factuur mogelijk maken voor wie geen btw mag innen.
- ✅ De juridische kant is intussen uitgeklaard in het **btw-advies van 20 juni 2026** (bouwregels in `docs/btw-advies-bouwregels.md`). Kern: eigenaar = logiesverstrekker (logies 12% mits gemeubeld-logies-voorwaarden), alle gastdocumenten op naam van de eigenaar, per eigenaar bijhouden of hij periodieke btw-aangiften indient. Harde regels pas bevriezen na het fysieke overleg dat het advies aanraadt.

### 9b. Linnois → eigenaar (adminzijde)

Vervangt de huidige Excel. Per boeking, niet per maand.

- [ ] **Owner statement** genereren: totale gastbetaling, − schoonmaak, − OTA-commissie, = netto opbrengst, plus zichtbaar waarop de commissie berekend is.
- [ ] **Factuur** genereren: enkel de beheervergoeding, 21% btw. ⚠️ Het btw-advies vraagt dat de omschrijving duidelijk slaat op de **beheer-, coördinatie- en bemiddelingsdienst** — gebruik dus "beheer, coördinatie en bemiddeling", en verwijs nooit naar de logiesdienst aan de gast.
- [ ] Owner statement en factuur zijn **twee aparte documenten**.
- [ ] Automatisch een **nieuwe factuurdatum** per nieuwe periode.
- [ ] Ondersteun beide commissiemodellen (bruto-basis, standaard 15%; netto-basis voor bepaalde eigenaars).
- [ ] **Edge case, één eigenaar**: contract zegt excl. btw, dus daar komt een extra lijn — totale gastbetaling × 0,88 (12% eruit) vóór aftrek van schoonmaak/OTA en vóór de commissieberekening. Owner statement en factuur zelf blijven verder identiek.
- [ ] Layout in de stijl van het platform, niet de Guesty/Excel-look.

### 9c. Uitbetalingen

- [ ] **Tab "Uitbetalingen"**: alles wat op de 15e uitbetaald moet worden, vooraf uitgerekend en klaar.
- [ ] **Geen directe KBC-koppeling** — expliciet afgevoerd. In de plaats: **export van een CSV/Excel batchbestand** dat je in KBC inlaadt (zoals Billit doet).

---

## 10. Onboarding

- [x] **Taalkeuze bij de start**: NL / FR / EN. Daarna volledig dashboard in die taal. *(website, platform en wizard volledig; kennishub-artikels en server-gegenereerde teksten volgen — zie README)*
- [ ] **Fotograaf**: eigenaar duidt zelf datums of een periode aan waarop de fotograaf mag langskomen. **Geen prijs tonen** (hoe minder prijzen, hoe minder frictie). **Mailmelding naar Linnois** wanneer een slot geselecteerd wordt.
- [ ] **Eigen foto's: directe upload** in die stap.
- [ ] **Voorzieningen/amenities**: lijst komt uit Guesty maar is enorm en gaf frictie. **Max 10-12 belangrijkste tonen**, rest achter een dropdown. Wie wil vult verder aan, de rest doen we achteraf.
- [ ] **Kanaalkeuze**: aanvinken op welke sites het pand mag komen (bv. wel Booking, niet Airbnb).
- [ ] **Brandveiligheidsattest uit de onboarding halen** → **pop-up ná afronding**. Blijft gelinkt aan het adres. Duidelijk communiceren dat **het pand niet live gaat zonder dat dit in orde is**, en makkelijk terug oppikbaar maken.
- [ ] **Beschrijving via spraak: voorlopig eruit**, komt later terug als losse stap na de onboarding.
- [ ] Algemeen principe: **onboarding kort houden**, basisinfo eerst, en een dag later een follow-up ("nog even voor je pand live gaat, we hebben nog wat info nodig").
- [x] Adres-autocomplete werkt en is goedgekeurd.

---

## 11. Schoonmaak

- [ ] **Breezeway-integratie** — daar plant het schoonmaakteam de cleanings in.
- [ ] **Adminzijde: alle info** uit Breezeway. **Linnois-eigenaarszijde: enkel de datum** — de rest is interne info die eigenaars niet moeten zien.
- [ ] Breezeway alleen koppelen voor Linnois-panden, of voor Staybase-klanten die Linnois-schoonmaak afnemen (dan loopt het toch via hen).
- Later, geen prioriteit: eigen dashboard voor de schoonmaakfirma waarin zij zelf dag en uur aanduiden.

---

## 12. Nog nodig van Staybase/Linnois

- Feature-set + prijzen van Basic en Pro.
- Content voor de kennishub-artikels (of 5 zinnen per artikel, dan vul ik aan met AI).
- Belgisch fotomateriaal voor de landingspagina.
- Toegang tot **One.com** (hosting) om de site live te zetten.
- De 7 HTML-files van de Linnois-site via WhatsApp.
- ~~Het document/onderzoek over de btw- en factuurplicht.~~ ✅ Ontvangen: btw-advies 20 juni 2026 — bouwregels in `docs/btw-advies-bouwregels.md`.

## 13. Openstaand / te onderzoeken

- [x] Kan de **totale gastbetaling** (de €1015) uit de Guesty API gehaald worden? **Ja**: logies + kosten + taksen uit het `money`-object (voor Booking.com exact gelijk aan wat de gast betaalde; commissie wordt daar apart aangerekend). Wordt sinds de sync bewaard als `bookings.guest_total` en is de basis van de gastfactuur — §8 kan hierop verder.
- [x] Kan de **interne codenaam** van een pand (`be.duinark.be`) uit Guesty opgehaald worden voor het semantisch zoeken? **Ja** — het is het veld `nickname` in de Open API (bv. `BE.DUIN.ARC.4` voor De Pagode). Wordt sinds de sync bewaard als `properties.code_name` en getoond in de pandenlijst, het panddetail en Beheer. Het semantisch zoeken zelf (§5) kan hierop verder bouwen.
- **Rechtstreeks boeken** op de Linnois-site: kan dat via Guesty? Nog te bekijken. Verder weg: white-label boekingssite voor property managers en makelaars — expliciet niet voor nu.
- **WhatsApp-integratie voor eigenaarsberichten: afgevoerd.** Eigenaars kunnen in het platform chatten, dus het probleem lost zichzelf op. Mocht het toch terugkomen: WhatsApp Business account nodig én een apart werknummer, want Julie gebruikt nu haar privénummer.

## 14. Beslist en afgesloten

- Rood als accentkleur voor Staybase blijft (Airbnb-referentie), maar niet knalrood. Linnois-branding blijft blauw — Staybase mag een eigen identiteit hebben.
- Geen prijsvisuals in het commissiescherm.
- Geen directe bankkoppeling.
- Alle views voor panden (tegels, lijst, kaart), de kalenderopzet en beide dashboards zijn goedgekeurd zoals ze zijn.
