/**
 * Testovací fixture: Klientská aplikace importující přímo Prisma (ZAKÁZÁNO, ERR-ARCH-007)
 */
import { PrismaClient } from "@prisma/client";

export const db = new PrismaClient();
