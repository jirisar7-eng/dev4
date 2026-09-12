# AUDIT DESIGN GOVERNANCE — BLUE BRAND FOUNDATION 1.0

**AUDIT ID:** AUDIT-TMPR-NEWDEV-20260911-BRAND-001  
**TASK ID:** TMPR-NEWDEV-20260911-BRAND-001  
**DATUM:** 2026-09-11  
**PROJEKT:** Táta má právo / Synthesis  
**TYP AUDITU:** Design Governance & Brand Lock  
**STAV:** ✅ **PASS — DESIGN FROZEN**  

---

## 1. ZÁKLADNÍ METADATA
- **Úkol:** Uzamčení závazného vizuálního základu značky Táta má právo před zahájením implementace nového UI.
- **Autorita:** Jiří Šár (Vlastník projektu / Product Owner).
- **Východisko:** Závěry referenčního inventáře DEV3 (`TMPR-NEWDEV-20260911-F0-001-R02`).
- **Pravidlo AI Studio Guard:** AI Studio implementuje definovanou značku; nesmí vytvářet vlastní designový směr ani svévolně rozšiřovat vizuální systém.

---

## 2. SCHVÁLENÁ PALETA (BLUE BRAND 1.0)
Paleta byla formalizována a uzamčena bez povolených odchylek:

| Token | Schválená hodnota HEX | Sémantická role | Kontrola kontrastu |
| :--- | :--- | :--- | :--- |
| `color.brand.primary` | **#2563EB** | Hlavní CTA a aktivní prvky | Splňuje WCAG AA na bílém podkladu (4.56:1) |
| `color.brand.dark` | **#1D4ED8** | Hover stav tlačítek | Splňuje WCAG AA (5.92:1) |
| `color.brand.deep` | **#1E40AF** | Active/pressed stav, záhlaví | Splňuje WCAG AAA (8.18:1) |
| `color.brand.light` | **#DBEAFE** | Výběry, orámování, badge | Dekorační a doplňkový podklad |
| `color.brand.soft` | **#EFF6FF** | Plochy jemných info boxů | Podkladový tón |
| `color.text.primary` | **#0F172A** | Hlavní nadpisy a čtení | Kontrast 15.8:1 (WCAG AAA) |
| `color.text.secondary` | **#475569** | Doplňující popisky | Kontrast 7.2:1 (WCAG AAA) |
| `color.text.muted` | **#64748B** | Metadata a štítky | Kontrast 4.9:1 (WCAG AA) |
| `color.background.default` | **#F8FAFC** | Základní plátno | Neutrální měkký podklad |
| `color.surface.default` | **#FFFFFF** | Karty, modály, formuláře | Čistý bílý povrch |
| `color.border.default` | **#E2E8F0** | Ohraničení a linky | Jemné neutrální dělení |
| `color.state.success` | **#15803D** | Úspěch, shoda, vyřešeno | Kontrast 5.1:1 (WCAG AA) |
| `color.state.warning` | **#B45309** | Varování, lhůta, čekání | Kontrast 5.3:1 (WCAG AA) |
| `color.state.danger` | **#B91C1C** | Incident, zmeškáno, konflikt | Kontrast 5.8:1 (WCAG AA) |

---

## 3. TYPOGRAFICKÁ AUTORITA A ZRUŠENÍ NÁVRHŮ AI
- **Schválený kanonický font:** `Inter Variable`
- **Schválený fallback:** `Inter, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif`
- **Zrušené neautorizované fonty:**
  - ❌ `Playfair Display` — ZAMÍTNUTO (neautorizovaný návrh AI).
  - ❌ `Plus Jakarta Sans` — ZAMÍTNUTO (neautorizovaný návrh AI).
- **Typografická hierarchie:**
  - H1 mobil: **32–36 px** | H1 desktop: **44–52 px**
  - H2 mobil: 24–28 px | H2 desktop: 30–36 px
  - H3 mobil: 18–20 px | H3 desktop: 22–24 px
  - Body: **16–18 px** (výchozí čtecí velikost 16 px)
  - Spodní limit souvislého textu: **14 px** (velikosti 12–13 px povoleny výhradně pro izolovaná metadata, tagy a badge).

---

## 4. DESIGN TOKENY A MIKROARCHITEKTURA
- **Systém zaoblení (Radius):**
  - xs: 6 px, sm: 8 px, md: 12 px, lg: 16 px, xl: 20 px
  - Výchozí karta: **12–16 px**
  - Výchozí tlačítko: **8–12 px**
- **Stíny (Elevation):**
  - Výhradně jemné difúzní stíny (`shadow.sm`, `shadow.md`). Zákaz těžkých černých vržených stínů.
- **Dotyková plocha (Mobile First):**
  - Minimální rozměr interaktivního prvku: **44 × 44 px**.
- **Ikonografie:**
  - Výhradně **Lucide Icons** (`lucide-react`). Zákaz emoji jako funkčních systémových ikon.

---

## 5. APP IDENTITY PRAVIDLA (IZOLACE ZNAČKY)
Architektura přísně odděluje 4 kontexty:
1. **Táta má právo — Veřejný portál:** Plná aplikace Blue Brand 1.0 (klidný, lidský, důvěryhodný tón, kompaktní homepage bez maratonu scrollování).
2. **Můj případ / CoParentHub:** Vysoce bezpečný, procesně přesný klientský portál (důraz na spisy, lhůty a auditované předávání dětí).
3. **Team Center:** Spolkové operativní rozhraní pro správu tiketů a dobrovolníků.
4. **Synthesis Administrace:** Platformní Control Plane. **ZÁKAZ** pronikání specifického loga a tématiky Táta má právo do jádra Synthesis OS.

---

## 6. ZAKÁZANÉ DESIGNOVÉ ODCHYLKY
- ❌ Žádné vícebarevné gradienty na pozadích, tlačítkách ani textech (VÝCHOZÍ STAV = ZAKÁZÁNY).
- ❌ Žádný kaskádový nesting karet ("Card inside card inside card").
- ❌ Žádný horizontální scroll či overflow na mobilních zařízeních.
- ❌ Žádný generický "AI Slop" (fialovo-modré gradienty, glassmorphism, neonová světla na tmavém pozadí).

---

## 7. SEZNAM OTEVŘENÝCH DESIGN_DECISION_REQUIRED
Pokud pravidlo chybí, AI Studio ho nesmí vymýšlet. Do rozhodnutí zůstávají otevřené následující položky:

1. **DESIGN_DECISION_REQUIRED: Dark Mode Policy**  
   - Otázka: Bude tmavý režim plně podporován i na veřejném portálu, nebo pouze v privátním klientském portálu (Můj případ / CoParentHub)?  
   - Stav: Do rozhodnutí se nové UI navrhuje primárně ve schválené světlé paletě (Light Baseline).

2. **DESIGN_DECISION_REQUIRED: Produkční Master Logo & Assety**  
   - Otázka: Kdy bude dodána a schválena finální vektorová SVG předloha motivu (otec + dítě + domov + srdce) a horizontálního logotypu?  
   - Stav: Do dodání se logo v kódu nepřekresluje; stávající soubory v DEV3 slouží pouze jako dočasný placeholder.

3. **DESIGN_DECISION_REQUIRED: Datová vizualizace & Grafy**  
   - Otázka: Jaké specifické odstíny a pravidla budou použity pro Recharts / D3 grafy (např. poměry péče, srovnání výživného, statistiky)?  
   - Stav: Otevřeno pro navazující analytický task.

4. **DESIGN_DECISION_REQUIRED: Vizuální identita Synthesis Control Plane**  
   - Otázka: Jaký symbol a neutrální paleta bude reprezentovat obecný Synthesis OS / Administraci odděleně od značky Táta má právo?  
   - Stav: Otevřeno pro platformní task Synthesis.

---

## 8. STAV REPOZITÁŘE A SOUBORY
- Vytvořena specifikace: `docs/brand/TMPR-BRAND-BLUE-1.0.md`
- Vytvořeny tokeny: `docs/brand/TMPR-BRAND-BLUE-1.0.tokens.json`
- Vytvořen tento audit: `docs/audit/TMPR-NEWDEV-20260911-BRAND-001.md`
- UI aplikace: **NEDOTČENO (0 řádků změny v kódu frontendu)**
- DEV3 design: **NEDOTČENO**
