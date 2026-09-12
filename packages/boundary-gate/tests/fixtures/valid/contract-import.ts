/**
 * Testovací fixture: Veřejný contract import mezi moduly (PASS)
 */
import type { AlimonyCalculatorContract } from "@tmpr/family-alimony/contract";
import { InstitutionLookupContract } from "@tmpr/institutions-registry/contract";

export const usage = {
  institution: InstitutionLookupContract,
};
