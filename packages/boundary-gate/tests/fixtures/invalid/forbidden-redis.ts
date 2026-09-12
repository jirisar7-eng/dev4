/**
 * Testovací fixture: Zakázaný balíček Redis/BullMQ (ZAKÁZÁNO, ERR-ARCH-008)
 */
import { Queue } from "bullmq";
import Redis from "ioredis";

export const q = { Queue, Redis };
