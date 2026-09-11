# Synthesis Platform & Táta má právo (DEV4)

Čisté modulární monorepo platformy Synthesis a projektu Táta má právo.

## Autoritativní vrstvy systému
1. **Synthesis OS (Platform Core & Platform Services)** — jádro, moduly, audit, policy. Brandově neutrální.
2. **Synthesis CMS** — doménově agnostický obsahový engine.
3. **Project Package (`packages/project-tata-ma-pravo`)** — vlastník projektu a brandu (`TMPR-BRAND-BLUE-1.0`).
4. **Domain Modules (`modules/*`)** — autonomní doménové moduly s decentralizovaným vlastnictvím dat.

Závislosti smějí směřovat POUZE shora dolů (od konkrétních domén k obecné platformě).

## Správa balíčků
- **Node.js:** >= 22 LTS / 24 LTS
- **Package Manager:** pnpm (v9+)
- **Monorepo Engine:** Turborepo
- **Jazyk:** TypeScript (strict mode)
