# Btw-advies → bouwregels voor de facturatiemodule (§9)

Samenvatting van het advies van Tim Van Sant (zelfstandig adviseur indirecte
belastingen, 20 juni 2026) over het toekomstige exploitatiemodel van Linnois,
vertaald naar wat het voor Staybase betekent. Het volledige advies (pdf van Tim Van Sant) staat bij Maxime lokaal; bij twijfel wint dat document.

## Het gekozen model in één zin

**De eigenaar is de logiesverstrekker richting de gast; Linnois is beheer-,
coördinatie- en bemiddelingspartner van de eigenaar.** De contractuele
relatie met de gast ligt bij de eigenaar — Linnois verricht zelf géén
logiesdienst. Elk document, elke schermtekst en elke factuur in Staybase
moet dat uitgangspunt consequent uitstralen (advies, punt 1 en 9).

## Regels per stroom

### Eigenaar → gast (§9a)

| Regel | Bron |
|---|---|
| Logiesprijs valt onder **12% btw** vanaf 1 maart 2026, mits btw-belast gemeubeld logies: verblijf < 3 maanden én minstens één samenhangende dienst (bv. huishoudlinnen met wekelijkse vervanging bij verblijven > 1 week). Overgangsregeling voorbehouden. | punt 2 |
| De btw-verplichtingen liggen **op het niveau van de eigenaar**: btw-identificatie, periodieke aangiften, btw-documenten aan de gast, recht op aftrek van kosten van de belaste logiesactiviteit. | punt 2 |
| Bij vertrek van de gast is een **rekening of ontvangstbewijs** verplicht; een factuur op dat moment vervangt die. **B2B is een factuur altijd verplicht.** | punt 6 |
| Alle gastdocumenten (verblijfsrekening, btw-bonnetje, factuur) staan **op naam van de eigenaar**. Staybase/Linnois mag ze opmaken en versturen, maar duidelijk als beheerder *voor rekening van de eigenaar*. | punt 6 |
| Templates mogen **niet de indruk wekken dat Linnois de logiesdienst verricht** — bestaande verblijfsrekening- en B2B-factuurtemplates moeten daarop worden aangepast. | punt 6, 9 |

**Datamodel dat hieruit volgt (onboarding-popup §9a):** per eigenaar
vastleggen — btw-statuut (particulier / btw-plichtige vennootschap /
niet-btw-plichtige vennootschap), btw-nummer, én **of hij periodieke
btw-aangiften indient** (dat laatste bepaalt de verleggingsregeling, zie
schoonmaak hieronder). Regels flexibel houden: het advies zegt "in principe"
en verwijst voor de concrete flow naar een volgende fase.

### Linnois → eigenaar (§9b)

| Regel | Bron |
|---|---|
| De factuur van Linnois betreft **enkel de eigen dienst** en is **21% btw**. Omschrijving moet duidelijk slaan op de **beheer-, coördinatie- en bemiddelingsdienst** — dus liever "beheer, coördinatie en bemiddeling" dan enkel "beheer en coördinatie". Nooit verwijzen naar de logiesdienst aan de gast. | punt 3, 7 |
| Het **owner statement is géén factuur** maar een administratief overzicht van bedragen die voor rekening van de eigenaar werden ontvangen, verrekend en doorgestort. De twee-documentenstructuur uit de meeting (statement + factuur apart) is dus exact wat het advies vraagt. | punt 7 |
| De vergoeding mag een **commissie, vaste beheersvergoeding, minimumvergoeding of combinatie** zijn — het commissieblok in Beheer past hierin. | punt 3 |

### Schoonmaak (§11-raakvlak)

| Regel | Bron |
|---|---|
| **Voorkeur: schoonmaak integreren in de globale dienstverlening** van Linnois — geen aparte schoonmaakkost op de factuur aan de eigenaar; alles in de globale vergoeding aan 21%. | punt 4, besluit |
| Wordt schoonmaak tóch apart doorgerekend: het is *werk in onroerende staat*. Eigenaar dient periodieke btw-aangiften in → **verleggingsregeling**, factureren zonder btw met vermelding **"btw verlegd"**. Geen periodieke aangiften → **21% btw**. | punt 4 |
| Doorrekenen **zonder btw als "voorgeschoten uitgave" kan niet** — daarvoor zou de eigenaar de echte afnemer van de schoonmaakfirma moeten zijn, en Linnois wil die leveranciersrelatie zelf houden. | punt 4 |

⚠️ Let op voor §8: de meeting-formule toont "− Schoonmaakkost" als aparte
lijn in de netto-uitbetaling. Dat mag als *rekenlijn in het owner statement*
(dat is geen factuur), maar op de **factuur** van Linnois hoort geen aparte
schoonmaaklijn als de kost geïntegreerd is in de globale vergoeding.

### Platformkosten

Rekent Linnois platformkosten (bv. Guesty/OTA-tooling) apart door aan de
eigenaar, dan is dat **21% btw** — géén verlegging (geen werk in onroerende
staat) en géén doorrekening zonder btw (punt 5).

### Toeristenbelasting

Per gemeente nagaan wie belastingplichtig is en hoe de doorrekening aan de
gast loopt. Ondersteunt Linnois de opvolging, dan opnieuw expliciet als
beheerder voor rekening van de eigenaar (punt 8).

## Wat dit betekent voor de §9-bouw (checklist)

- [x] Onboarding-popup eigenaarsgegevens: btw-statuut + btw-nummer + "dient periodieke btw-aangiften in" (plus vennootschapsnaam en facturatieadres voor de factuurkop). Statuut bepaalt het tarief op de gastfactuur: btw-plichtige vennootschap → 12%, particulier of niet-btw-plichtige vennootschap → btw-vrij met vermelding.
- [x] Gastfactuur: op naam van de eigenaar, 12%-logica (tarief per factuur opgeslagen), volledig white-label (klantfeedback 15/09: geen logo, nergens Staybase/Linnois).
- [ ] Rekening/ontvangstbewijs bij check-out als er geen factuur wordt uitgereikt; B2B altijd factuur.
- [x] Owner statement: administratief overzicht per boeking (gast betaalde − OTA − schoonmaak = Net Rental Income; ter info factuur + netto-uitbetaling), met expliciete "dit is GEEN factuur"-wenk.
- [x] Linnois-factuur: enkel de vergoeding, 21%, omschrijving "Beheer, coördinatie en bemiddeling", vervaldatum +30 dagen.
- [ ] Schoonmaak standaard niet als aparte factuurlijn; aparte doorrekening enkel met de verleggings-/21%-logica per eigenaar.
- [ ] De bestaande €0,88-edge case (één eigenaar, contract excl. btw) uit de meeting blijft een aparte statement-rekenlijn — geen factuurregel.

Het advies raadt een fysiek overleg aan om de concrete modus operandi vast
te leggen vóór templates en processen definitief worden — harde regels in
het platform dus pas na dat overleg bevriezen.
