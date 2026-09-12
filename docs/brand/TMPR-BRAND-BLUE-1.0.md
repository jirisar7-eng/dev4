# Táta má právo — Blue Brand Foundation 1.0

**DOKUMENT:** Specifikace vizuální identity a Design Systemu  
**VERZE:** 1.0 (Závazná / Frozen Baseline)  
**TASK ID:** TMPR-NEWDEV-20260911-BRAND-001  
**STAV:** SCHVÁLENO / ZÁVAZNÉ PRO VŠECHNY NOVÉ UI IMPLMENTACE  
**AUTORITA:** Jiří Šár (Vlastník projektu)  
**PROJEKT:** Táta má právo (`projectKey=tata-ma-pravo`) / Synthesis Platform  

---

## 1. POSLÁNÍ A CHARAKTER ZNAČKY

Značka **Táta má právo** je nezávislá platforma na podporu rovnocenného rodičovství, ochrany práv dětí a zdravých mezigeneračních vazeb po rozchodu či rozvodu.

### 1.1 Vizuální tón (Jak značka MUSÍ působit)
- **Klidně:** Nevyvolává paniku ani eskalaci konfliktů; tlumí emoce vyváženou kompozicí, čistým prostorem a chladivými tóny.
- **Důvěryhodně:** Každý prvek layoutu a textu působí stabilně, ověřitelně a srozumitelně.
- **Lidsky:** Odmítá chladný byrokratický odstup; oslovuje rodiče s empatií a porozuměním v jejich nejtěžších životních situacích.
- **Moderně:** Svěží, precizní evropský typografický a digitální standard (čistý white-space, přehledné hierarchie).
- **Bezpečně:** Dává jasně najevo ochranu citlivých údajů, rodinných spisů a komunikace.
- **Odborně, ale ne úřednicky:** Právní fakta, lhůty a metodiky jsou podány přesně, avšak jazykem a vizuální formou přístupnou pro každého rodiče.

### 1.2 Přísná zákazová pravidla (Jak značka NESMÍ působit)
- ❌ **NESMÍ působit agresivně ani útočně** (žádné křiklavé červené bannery, bojovná hesla ani útočná grafika).
- ❌ **NESMÍ působit aktivisticky** (žádný pouliční nátlakový styl, transparenty či protestní estetika).
- ❌ **NESMÍ působit proti ženám ani proti matkám** (cílem je dítě a spolupráce obou rodičů; vizuál nesmí být genderově polarizující).
- ❌ **NESMÍ působit proti soudům nebo OSPOD** (instituce jsou partneři v procesním řádu; platforma učí rodiče komunikovat věcně, kultivovaně a procesně správně).
- ❌ **NESMÍ působit jako advokátní kancelář** (žádné zlaté/bronzové serifové orámování, váhy spravedlnosti či pompézní právnické klišé).
- ❌ **NESMÍ působit jako nepřehledný státní úřední portál** (žádná rigidní šedivá byrokracie s labyrintem formulářů).
- ❌ **NESMÍ působit jako generický AI / SaaS template** (žádné fialovo-modré gradienty, glassmorphism, svítící neony v dark mode ani "AI Slop").

---

## 2. KANONICKÁ BAREVNÁ PALETA (BLUE PALETTE 1.0)

Barevná paleta je založena na uklidňující, hluboké a přístupné modré škále v kombinaci s neutrálními břidlicovými tóny (Slate).

### 2.1 Primární značková modř (Brand Blues)
| Token | HEX | Použití a kontrastní pravidlo |
| :--- | :--- | :--- |
| `color.brand.primary` | **#2563EB** | Hlavní interaktivní barva (CTA tlačítka, primární odkazy, aktivní stavy). |
| `color.brand.dark` | **#1D4ED8** | Hover stavy primárních tlačítek, zvýrazněné navigační prvky. |
| `color.brand.deep` | **#1E40AF** | Active / Pressed stavy tlačítek, hlavičky tabulek, hluboké akcenty. |
| `color.brand.light` | **#DBEAFE** | Podbarvení vybraných položek, badge akcenty, jemná orámování. |
| `color.brand.soft` | **#EFF6FF** | Plochy jemných informačních panelů, pozadí aktivních záložek. |

### 2.2 Neutrální tóny a text (Slate Neutrals)
| Token | HEX | Použití a kontrastní pravidlo |
| :--- | :--- | :--- |
| `color.text.primary` | **#0F172A** | Hlavní nadpisy, tělo textu, klíčové popisky (vysoký kontrast > 12:1). |
| `color.text.secondary` | **#475569** | Doplňkový text, popisy polí, sekundární navigace (kontrast > 7:1). |
| `color.text.muted` | **#64748B** | Metadata, placeholdery, časová razítka (kontrast > 4.5:1 dle WCAG AA). |
| `color.background.default` | **#F8FAFC** | Výchozí podklad aplikace a stránek (klidné, měkké plátno). |
| `color.surface.default` | **#FFFFFF** | Podklad karet, dialogů, tabulek a formulářových prvků. |
| `color.border.default` | **#E2E8F0** | Jemné dělící linie, ohraničení karet a vstupních polí. |

### 2.3 Stavové barvy (Semantic Status)
| Token | HEX | Význam a užití |
| :--- | :--- | :--- |
| `color.state.success` | **#15803D** | Schváleno, v pořádku, úspěšné doručení, shoda rodičů. |
| `color.state.warning` | **#B45309** | Blížící se lhůta, neshoda k vyřešení, čeká na schválení. |
| `color.state.danger` | **#B91C1C** | Zmeškaná lhůta, kritický incident, odmítnutí, režim vysokého konfliktu. |

---

## 3. ZÁVAZNÁ TYPOGRAFIE

### 3.1 Zrušení neautorizovaných návrhů
> ⚠️ **DŮLEŽITÉ ROZHODNUTÍ O AUTORITĚ:**  
> Písma **Playfair Display** (serif) ani **Plus Jakarta Sans** (sans-serif) **NEBYLY SCHVÁLENY**. Šlo o čistě generativní návrhy AI v historickém DEV3. Tímto se oficiálně vyřazují z autority designu pro projekt Táta má právo.

### 3.2 Schválená písmová rodina
- **Kanonický font:** `Inter Variable`
- **Fallback stack:** `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif`
- **Důvod volby:** Maximální čitelnost na mobilních zařízeních, neutrální věcnost, vynikající podpora českých diakritických znaků (č, ř, ž, ť, ď, ů), optimalizované vykreslování v malých i velkých řezech.

### 3.3 Typografické měřítko a velikosti
| Prvek | Mobil (Viewport < 768px) | Desktop (Viewport ≥ 768px) | Line Height | Weight |
| :--- | :--- | :--- | :--- | :--- |
| **H1** (Hlavní titulek) | **32–36 px** | **44–52 px** | 1.15–1.2 | 700 (Bold) |
| **H2** (Sekční nadpis) | 24–28 px | 30–36 px | 1.25 | 600 (Semibold) |
| **H3** (Podnadpis/karta) | 18–20 px | 22–24 px | 1.3 | 600 (Semibold) |
| **H4** (Záhlaví bloku) | 16–18 px | 18–20 px | 1.35 | 600 (Semibold) |
| **Body Large** | 18 px | 18 px | 1.6 | 400 (Regular) |
| **Body Default** | **16 px** | **16 px** | 1.5–1.6 | 400 (Regular) |
| **Metadata / Captions** | **14 px** | **14 px** | 1.4 | 500 (Medium) |
| **Micro Labels** | 12–13 px | 12–13 px | 1.3 | 600 (Semibold) |

> ⛔ **Přísné pravidlo čitelnosti:** Žádný souvislý text nesmí mít velikost menší než **14 px**. Velikosti 12–13 px jsou povoleny výhradně pro specifická metadata (např. tagy stavu, časová razítka, badge indikátory).

---

## 4. DESIGN PRAVIDLA A KOMPOZICE

### 4.1 Systém zaoblení (Border Radius)
- `radius.xs`: **6 px** (mikro tagy, malé badge)
- `radius.sm`: **8 px** (standardní tlačítka, vstupní pole, checkboxy)
- `radius.md`: **12 px** (kompaktní karty, modální dialogy)
- `radius.lg`: **16 px** (výchozí standardní karty, panely)
- `radius.xl`: **20 px** (velké hero kontejnery, klientské přehledy)
- **Výchozí karta:** **12–16 px**
- **Výchozí tlačítko:** **8–12 px**

### 4.2 Zákaz gradientů (Gradient Ban)
- **VÝCHOZÍ STAV = ZAKÁZÁNY.**
- Žádná pozadí karet, tlačítek ani textů nesmí používat vícebarevné gradienty.
- Povoleny jsou výhradně čisté, ploché barvy se standardním kontrastním orámováním (`border.default`).

### 4.3 Stíny (Elevation & Shadows)
- Povoleny jsou výhradně **velmi jemné difúzní stíny**:
  - `shadow.sm`: `0 1px 2px 0 rgba(15, 23, 42, 0.05)` (tlačítka, karty na pozadí)
  - `shadow.md`: `0 4px 6px -1px rgba(15, 23, 42, 0.07), 0 2px 4px -2px rgba(15, 23, 42, 0.05)` (dropdowny, modály)
- Zákaz těžkých, černých a rozpitých vržených stínů.

### 4.4 Ikonografie
- **Standard:** Výhradně **Lucide Icons** (`lucide-react`).
- **Tloušťka tahů (Stroke):** 1.75–2.0 px.
- ⛔ **Zákaz emoji:** Žádné náhodné barevné emoji (🎉, 🚀, 🔥, 👨‍👦) jako náhrada za systémové ikony. Emoji mohou být použity pouze v textu zpráv, nikdy jako navigační nebo funkční symbolika UI.

### 4.5 Hierarchie a zákaz vnořených karet
- Ne každá informace má být uzavřena do rámečku s bílým pozadím.
- Přednost má hierarchie tvořená typografií, vertikálním odsazením a jemnými dělicími čarami.
- ⛔ **PŘÍSNĚ ZAKÁZÁNO:** "Card inside card inside card" (kaskáda vnořených karet v kartách).

---

## 5. VIZUÁLNÍ SYMBOL A LOGO ZNAČKY

### 5.1 Schválený motiv
- **Motiv:** **Otec + dítě + domov + srdce** v harmonickém, minimalistickém a organickém propojení.
- **Projektové vymezení:** Platí **VÝHRADNĚ pro projekt Táta má právo** (`projectKey=tata-ma-pravo`).

### 5.2 Zákaz kontaminace platformy Synthesis
- Logo Táta má právo **NESMÍ být použito** jako logo:
  - **Synthesis OS**,
  - **Synthesis CMS**,
  - obecné **Synthesis Administrace**,
  - jiných klientských projektů provozovaných na platformě Synthesis.

### 5.3 Pravidla pro produkční zpracování
- Současná existující obrazová předloha v DEV3 **není finálním produkčním masterem**.
- V tomto úkolu se logo nepřekresluje ani negeneruje.
- Cílové varianty loga budou specifikovány v samostatném asset master úkolu (Master SVG, horizontální, kompaktní, symbol, monochromatické, favicon, PWA, Apple touch, OG social).

---

## 6. ARCHITEKTURA APP IDENTITY

Design System sjednocuje technickou tokenizaci, ale rozlišuje 4 aplikační kontexty:

| Aplikační vrstva | Kontext | Primární uživatel | Vizuální specifika |
| :--- | :--- | :--- | :--- |
| **1. Veřejný portál** | `tata-ma-pravo-public` | Veřejnost, rodiče v tísni | Vstřícný, klidný, lidský, důraz na pomoc a orientaci. Kompaktní homepage bez maratonu scrollování. |
| **2. Můj případ & CoParentHub** | `tata-ma-pravo-portal` | Přihlášený rodič / expartneři | Maximálně bezpečný, přehledný, bez rušivých prvků, procesně striktní (lhůty, finance, předávání dětí). |
| **3. Team Center** | `synthesis-team-center` | Dobrovolníci a tým spolku | Funkční operativní nástroj pro řešení tiketů a koordinaci pomoci. |
| **4. Synthesis Administrace** | `synthesis-admin` | Správci systému / DevOps | Technický control plane zbavený specifického brandingu Táta má právo. |

---

## 7. PRINCIPY MOBILE-FIRST

- Každý návrh komponenty začíná na displeji šířky **360–390 px**.
- **Minimální dotyková plocha (Touch Target):** **44 × 44 px** pro všechna tlačítka, ikony a klikatelné ovládací prvky.
- **Nulový horizontální overflow:** Žádné tabulky ani panely nesmí rozbít horizontální šířku okna. Široké tabulky musí mít buď vyhrazený interní horizontální scroll kontejner, nebo se na mobilu transformovat do formy vertikálních karet.
- **Kompaktní homepage:** Úvodní strana nesmí být přehlídkou nekonečného textu a marketingových odstavců. Nabízí okamžité rozcestí: Rychlá pomoc (48h), Kalkulačka výživného, Znalostní báze, Přihlášení do spisu.
- **Kompaktní patička:** Informace o provozovateli, GDPR a kontakty strukturované bez obřích vertikálních bloků.

---

## 8. AI STUDIO DESIGN GUARD (BEZPEČNOSTNÍ ZÁMKY)

AI Studio agent **NESMÍ** bez explicitního písemného pokynu:
1. 🔒 Změnit primární modrou barvu (`#2563EB`).
2. 🔒 Změnit font z `Inter Variable` na jakýkoli jiný.
3. 🔒 Znovu zavést fonty `Playfair Display` nebo `Plus Jakarta Sans`.
4. 🔒 Zavést gradientové vizuální styly či skleněný efekt (glassmorphism).
5. 🔒 Změnit definovaný systém zaoblení (`radius` xs až xl).
6. 🔒 Vytvořit vlastní ikonovou sadu mimo `lucide-react` nebo zavést emoji ikony.
7. 🔒 Vytvořit alternativní dashboard design podle obecných AI šablon.
8. 🔒 Měnit nebo nahrazovat logo Táta má právo.

### 8.1 Postup při chybějícím pravidlu
Pokud pro zamýšlený prvek (např. animace, speciální data-viz grafy, audio přehrávač) neexistuje v této specifikaci pravidlo:  
**JE ZAKÁZÁNO SI PRAVIDLO DOMÝŠLET.**  
Prvek se označí značkou: **`DESIGN_DECISION_REQUIRED`** a předloží se k rozhodnutí.
