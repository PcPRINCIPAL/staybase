/**
 * Kennisbank van Staybase — volledig uitgeschreven artikels.
 *
 * Staat bewust los van de API: dit is redactionele inhoud die zelden wijzigt.
 * Wil je later een CMS, dan vervang je enkel de bron van `ARTIKELEN`.
 */

export type Blok =
  | { type: "p"; tekst: string }
  | { type: "h2"; tekst: string }
  | { type: "lijst"; items: string[] }
  | { type: "tip"; titel: string; tekst: string }
  | { type: "quote"; tekst: string; bron?: string };

export interface Artikel {
  slug: string;
  categorie: string;
  titel: string;
  intro: string;
  afbeelding: string;
  leestijd: number;
  datum: string;
  blokken: Blok[];
}

export const ARTIKELEN: Artikel[] = [
  {
    slug: "perfecte-prijs-bepalen",
    categorie: "Prijzen",
    titel: "Zo bepaal je de perfecte prijs voor jouw vakantiewoning",
    intro: "Leer hoe je met data en timing je opbrengst maximaliseert.",
    afbeelding: "/villasun.png",
    leestijd: 7,
    datum: "2026-07-28",
    blokken: [
      { type: "p", tekst: "De meeste verhuurders zetten één keer een prijs en laten die staan. Begrijpelijk — je hebt wel wat anders te doen. Maar het is ook de duurste gewoonte in de vakantieverhuur. Wie het hele jaar hetzelfde tarief vraagt, laat op piekmomenten geld liggen en blijft in de stille weken met lege nachten zitten." },
      { type: "p", tekst: "Goed prijzen is geen kwestie van gokken. Het is een kwestie van een paar beslissingen goed nemen en die daarna consequent bijsturen. Hieronder loop je ze één voor één door." },

      { type: "h2", tekst: "Begin bij je ondergrens, niet bij de markt" },
      { type: "p", tekst: "Voor je naar de buren kijkt, moet je weten wat een nacht jou kost. Tel alles op wat per verblijf terugkomt: schoonmaak, linnen, verbruik, platformcommissie, en een reservering voor slijtage en herstel. Deel dat door het aantal nachten van een gemiddeld verblijf en je hebt je kostprijs per nacht." },
      { type: "p", tekst: "Die kostprijs is je bodem. Daar ga je nooit onder, hoe stil het ook is. Een nacht onder kostprijs verhuren is geen omzet — dat is betalen om te werken." },

      { type: "h2", tekst: "Vergelijk met de juiste woningen" },
      { type: "p", tekst: "De klassieke fout is vergelijken met alles in je gemeente. Wat je wil weten is: wat vragen woningen die dezelfde gast aantrekken? Filter op capaciteit, op afstand tot het strand of centrum, en op de voorzieningen die er echt toe doen — tuin, zwembad, parkeerplaats, huisdieren toegestaan." },
      { type: "lijst", items: [
        "Neem vijf tot tien woningen die écht op de jouwe lijken.",
        "Noteer hun prijs voor een gewoon weekend in het laagseizoen én voor een weekend in juli.",
        "Kijk niet alleen naar de vraagprijs, maar naar wat effectief geboekt raakt: een dure woning met een lege kalender is geen referentie.",
      ]},
      { type: "p", tekst: "Zit je structureel onderaan die lijst zonder dat je woning minder biedt, dan laat je waarschijnlijk 15 tot 20 procent liggen." },

      { type: "h2", tekst: "Denk in seizoenen, niet in maanden" },
      { type: "p", tekst: "Een kalendermaand zegt niets. Wat telt is de vraag. Aan de Belgische kust betekent dat grofweg vier niveaus: de piek (juli, augustus, kerst- en paasvakantie), de schouders (mei, juni, september), het laagseizoen, en de losse pieken daarbuiten." },
      { type: "p", tekst: "Die losse pieken zijn waar het meeste geld verdwijnt. Een lokaal evenement, een lang weekend, een festival of een wielerwedstrijd: dat zijn dagen waarop de hele markt volloopt en jij nog altijd je gewone tarief vraagt. Zet ze één keer per jaar in je kalender en verhoog ze bewust." },

      { type: "tip", titel: "Vuistregel voor weekends", tekst: "Vrijdag- en zaterdagnacht mogen in de meeste markten 15 tot 30 procent boven een doordeweekse nacht liggen. Voelt dat te scherp? Test het één maand op vier weekends en vergelijk je boekingsritme." },

      { type: "h2", tekst: "Gebruik je minimumverblijf als prijsinstrument" },
      { type: "p", tekst: "Prijs is niet je enige knop. Een minimumverblijf van drie nachten in het hoogseizoen voorkomt dat losse nachten je kalender aan flarden boeken. Omgekeerd: laat in het laagseizoen twee nachten toe, of zelfs één, want daar is bezetting belangrijker dan de gemiddelde nachtprijs." },
      { type: "p", tekst: "Let vooral op de gaten. Blijven er tussen twee boekingen twee losse nachten over, dan geraken die alleen weg als je ze aantrekkelijk maakt — met een lager tarief én een verlaagd minimum." },

      { type: "h2", tekst: "De laatste dertig dagen zijn een ander spel" },
      { type: "p", tekst: "Ver vooruit boeken mensen op zekerheid: ze willen die specifieke woning op die specifieke datum. Dichtbij boeken ze op gelegenheid. Een nacht die over vier dagen nog vrij is, verkoopt zichzelf niet meer aan de volle prijs." },
      { type: "p", tekst: "Verlaag dus gericht en gefaseerd — niet in paniek. Een verlaging van tien procent op veertien dagen en nog eens tien op vijf dagen doet meestal meer dan één grote duik. En een lege nacht die je niet verkoopt, brengt sowieso nul op." },

      { type: "quote", tekst: "Het model werkt op vraag, niet op leegstandsangst. Het stelt vaker verhogingen dan verlagingen voor.", bron: "Zo werkt de prijszetting in Staybase" },

      { type: "h2", tekst: "Verhoog na goede reviews" },
      { type: "p", tekst: "Een woning met dertig reviews en een 4,9 mag meer vragen dan diezelfde woning met vijf reviews. Dat is geen arrogantie, dat is hoe gasten kiezen: bij twijfel tussen twee panden wint de best beoordeelde, ook als die iets duurder is. Sociale bewijskracht is letterlijk geld waard." },
      { type: "p", tekst: "Herbekijk je basisprijs daarom elk kwartaal, niet elk jaar. Zeker in je eerste seizoen, wanneer je reviewscore het snelst groeit." },

      { type: "h2", tekst: "In het kort" },
      { type: "lijst", items: [
        "Bereken je kostprijs per nacht en gebruik die als bodem.",
        "Vergelijk met woningen die dezelfde gast aantrekken, niet met je hele gemeente.",
        "Werk met seizoensniveaus en zet losse pieken één keer per jaar vast.",
        "Stuur met je minimumverblijf, niet alleen met je prijs.",
        "Verlaag gefaseerd in de laatste dertig dagen.",
        "Herbekijk je basisprijs elk kwartaal, zeker als je reviews groeien.",
      ]},
      { type: "p", tekst: "Doe je dit met de hand, dan ben je er een halve dag per kwartaal mee zoet. Laat je het door Staybase opvolgen, dan krijg je gewoon een voorstel te zien wanneer het de moeite is — en beslis jij." },
    ],
  },

  {
    slug: "tijd-besparen-als-verhuurder",
    categorie: "Beheer",
    titel: "5 manieren om tijd te besparen als verhuurder",
    intro: "Slimme automatisaties en routines die jou uren per week opleveren.",
    afbeelding: "/linnois.webp",
    leestijd: 6,
    datum: "2026-07-21",
    blokken: [
      { type: "p", tekst: "Vraag een verhuurder hoeveel tijd het beheer kost en je krijgt zelden een eerlijk antwoord — niet uit onwil, maar omdat het werk verspreid zit. Vijf minuten hier, een telefoontje daar, een bericht om elf uur 's avonds. Opgeteld loopt dat bij één woning al snel op tot vier à zes uur per week." },
      { type: "p", tekst: "Het goede nieuws: het grootste deel van dat werk is voorspelbaar. En wat voorspelbaar is, kan je één keer regelen in plaats van elke keer opnieuw." },

      { type: "h2", tekst: "1. Beantwoord vragen voor ze gesteld worden" },
      { type: "p", tekst: "Hou een week lang bij welke vragen je krijgt. Je zal merken dat tachtig procent van je berichten over dezelfde tien dingen gaat: hoe laat kan ik inchecken, waar staat de vuilnis, is er wifi en wat is het paswoord, mag ik vroeger toekomen, waar parkeer ik." },
      { type: "p", tekst: "Zet die tien antwoorden één keer goed op papier en verwerk ze op drie plaatsen: in je listing, in een bericht dat automatisch drie dagen voor aankomst vertrekt, en in een korte huisgids in de woning zelf. Alleen dat al halveert je berichtenverkeer." },

      { type: "tip", titel: "Schrijf het zoals je het zou zeggen", tekst: "Standaardberichten voelen koud als ze als een handleiding klinken. Schrijf ze zoals je een vriend zou uitleggen waar de sleutel ligt — dat leest warmer en levert betere reviews op." },

      { type: "h2", tekst: "2. Werk met één kalender in plaats van drie" },
      { type: "p", tekst: "Wie op meerdere platformen staat en de kalenders met de hand bijhoudt, doet elke week hetzelfde nazicht: staat alles gelijk, is er niets dubbel geboekt. Dat is niet alleen tijdrovend, het is ook precies waar een dubbele boeking ontstaat — en die kost je veel meer dan tijd." },
      { type: "p", tekst: "Eén gesynchroniseerde kalender waar elke boeking meteen alle andere kanalen blokkeert, neemt die controle volledig weg. Je kijkt nog één keer per dag, en dan omdat je wil, niet omdat het moet." },

      { type: "h2", tekst: "3. Laat de schoonmaak zichzelf inplannen" },
      { type: "p", tekst: "De klassieke gang van zaken: er komt een boeking binnen, jij stuurt een bericht naar de poetshulp, die antwoordt een dag later, jij bevestigt. Drie handelingen per boeking, en elke keer het risico dat er eentje blijft liggen." },
      { type: "p", tekst: "Koppel de poetsbeurt in de plaats rechtstreeks aan de check-out. Bij elke uitcheck vertrekt de opdracht automatisch naar je vaste team. Antwoorden ze niet binnen een afgesproken termijn, dan gaat de vraag door naar een tweede optie. Jij hoort er enkel van als er echt een probleem is." },

      { type: "h2", tekst: "4. Maak van je check-in een zelfbediening" },
      { type: "p", tekst: "Sleutels persoonlijk overhandigen is gastvrij, maar het bindt je aan het uur van je gast — en dat schuift altijd op. Een sleutelkluis of een codeslot met een code die per verblijf verandert, geeft jou je avond terug en je gast de vrijheid om te komen wanneer het hem past." },
      { type: "p", tekst: "Wil je het persoonlijke niet kwijt: stuur een kort berichtje op de dag van aankomst met een tip over de buurt. Dat werkt vaak beter dan tien minuten aan de deur staan." },

      { type: "h2", tekst: "5. Blok je tijd, wees niet permanent bereikbaar" },
      { type: "p", tekst: "Dit is de moeilijkste, want ze gaat over gewoontes en niet over software. Als je elk bericht beantwoordt op het moment dat het binnenkomt, ben je nooit klaar en nooit echt vrij." },
      { type: "p", tekst: "Spreek met jezelf twee vaste momenten per dag af — bijvoorbeeld 's ochtends en na het avondeten. Voor echt dringende zaken zet je een aparte melding. Alles daartussen wacht. Gasten merken het verschil niet, jij wel." },

      { type: "h2", tekst: "Wat het oplevert" },
      { type: "p", tekst: "Verhuurders die deze vijf dingen doorvoeren, houden gemiddeld vier uur per week over. Bij één woning is dat een halve werkdag per maand. Bij drie woningen is het het verschil tussen een leuke bijverdienste en een tweede job die je nooit gesolliciteerd hebt." },
      { type: "quote", tekst: "Vroeger ging mijn zondagavond op aan berichten en paniek over mijn agenda. Nu kijk ik maandagmorgen even mee en ga ik door met mijn dag.", bron: "Nathalie D., 2 panden" },
    ],
  },

  {
    slug: "vijf-sterren-reviews",
    categorie: "Gastervaring",
    titel: "Zo krijg je 5-sterren reviews (én meer terugboekingen)",
    intro: "Kleine details, groot verschil in gasttevredenheid.",
    afbeelding: "/terras.png",
    leestijd: 6,
    datum: "2026-07-14",
    blokken: [
      { type: "p", tekst: "Een goede reviewscore is het enige onderdeel van je verhuur dat tegelijk je prijs, je bezetting én je zichtbaarheid omhoog duwt. Boekingsplatformen tonen hoger beoordeelde woningen eerder, gasten kiezen ze sneller, en ze zijn bereid er meer voor te betalen." },
      { type: "p", tekst: "Het verrassende is dat vijf sterren zelden over luxe gaan. Ze gaan over verwachtingen die uitkomen." },

      { type: "h2", tekst: "De verwachting bepaalt de score, niet de sterren" },
      { type: "p", tekst: "Een eenvoudig appartement dat exact levert wat de foto's beloven, scoort beter dan een duur pand dat net iets tegenvalt. Wie te mooi verkoopt, koopt zichzelf een probleem: de gast komt binnen met een beeld dat niet klopt en de rest van het verblijf wordt afgemeten aan dat verschil." },
      { type: "lijst", items: [
        "Fotografeer wat er is, niet wat er zou kunnen zijn: geen groothoek die een kamer verdubbelt.",
        "Benoem de nadelen zelf. Een steile trap, een drukke straat, geen lift — wie het vooraf leest, klaagt er achteraf niet over.",
        "Klopt de slaapcapaciteit echt? Vier slaapplaatsen waarvan twee op een slaapzetel is iets anders dan vier bedden.",
      ]},

      { type: "h2", tekst: "De eerste tien minuten wegen het zwaarst" },
      { type: "p", tekst: "De indruk die een gast in de eerste tien minuten opdoet, kleurt zijn hele verblijf en dus zijn review. Zorg dat die minuten vlekkeloos verlopen: de code werkt, het licht brandt, het is aangenaam warm of net koel, en er ligt iets op tafel dat duidelijk maakt dat je hen verwachtte." },
      { type: "tip", titel: "Het goedkoopste wat je kan doen", tekst: "Een handgeschreven kaartje met de naam van je gasten kost je twee minuten en één euro, en duikt opvallend vaak op in vijfsterrenreviews." },

      { type: "h2", tekst: "Los problemen op voor ze een review worden" },
      { type: "p", tekst: "Er gaat altijd iets mis. De vaatwas doet raar, de wifi hapert, een lamp is stuk. Wat je score bepaalt is niet óf het misgaat, maar hoe snel je reageert." },
      { type: "p", tekst: "Een gast die om tien uur 's avonds meldt dat de verwarming niet werkt en om half elf een antwoord krijgt met een oplossing, schrijft daar vaak lovend over. Dezelfde gast die pas de volgende middag iets hoort, zet drie sterren. Dezelfde storing, een ander verhaal." },
      { type: "p", tekst: "Stuur daarom halverwege het verblijf een kort bericht: alles naar wens? Dat is geen beleefdheidsformule — het is je laatste kans om een klacht te horen op een moment dat je er nog iets aan kan doen." },

      { type: "h2", tekst: "Vraag de review op het juiste moment" },
      { type: "p", tekst: "Vraag niet meteen bij het buitengaan, wanneer mensen in de file staan met een auto vol bagage. Wacht tot de dag erna, wanneer het verblijf een aangename herinnering is geworden. Hou het kort, bedank hen oprecht en maak duidelijk dat het je écht helpt." },
      { type: "p", tekst: "En antwoord op elke review, ook de goede. Toekomstige gasten lezen die antwoorden — het is vaak het eerste stukje echte communicatie dat ze van je zien." },

      { type: "h2", tekst: "Wat te doen bij een slechte review" },
      { type: "p", tekst: "Reageer nooit in het uur zelf. Wacht een dag, en antwoord dan kort, feitelijk en zonder je te verdedigen: erken wat klopte, leg uit wat je hebt aangepast, en laat het daarbij. Wie leest dat je een probleem hebt opgelost, ziet een verhuurder die zijn zaken ernstig neemt." },
      { type: "quote", tekst: "Eén slechte review met een rustig, correct antwoord doet minder schade dan tien goede reviews zonder enige reactie." },

      { type: "h2", tekst: "Van goede review naar terugboeking" },
      { type: "p", tekst: "Wie vijf sterren geeft, is je makkelijkste toekomstige klant. Toch wordt daar zelden iets mee gedaan. Zet gasten die uitstekend beoordeelden apart en stuur hen één keer per jaar — ruim voor het seizoen opengaat — een bericht dat hun favoriete periode weer vrij is." },
      { type: "p", tekst: "Een terugkerende gast kost je geen commissie op de eerste zoekopdracht, weet hoe alles werkt, en gaat zorgvuldiger om met je woning. Dat is de goedkoopste boeking die je kan maken." },

      { type: "h2", tekst: "In het kort" },
      { type: "lijst", items: [
        "Beloof niet meer dan je levert, en benoem je nadelen zelf.",
        "Investeer in de eerste tien minuten van het verblijf.",
        "Reageer snel bij problemen en check halverwege even in.",
        "Vraag de review een dag na vertrek, en antwoord op alle reviews.",
        "Beantwoord een slechte review rustig en feitelijk, na een dag.",
        "Nodig je beste gasten actief opnieuw uit.",
      ]},
    ],
  },
];

export const artikelBySlug = (slug: string) => ARTIKELEN.find((a) => a.slug === slug);

export const datumLabel = (iso: string) =>
  new Date(iso + "T00:00:00Z").toLocaleDateString("nl-BE", { day: "numeric", month: "long", year: "numeric" });
