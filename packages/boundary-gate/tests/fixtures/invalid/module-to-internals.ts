/**
 * Testovací fixture: Module A -> internals modulu B (ZAKÁZÁNO, ERR-ARCH-005)
 */
import { internalDatabaseHelper } from "@tmpr/institutions-registry/src/internal/db";

export const test = internalDatabaseHelper;
