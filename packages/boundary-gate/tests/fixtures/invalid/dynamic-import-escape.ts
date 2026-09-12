/**
 * Testovací fixture: Dynamický import zakázaného balíčku (ZAKÁZÁNO, ERR-ARCH-001)
 */
export async function loadDynamically() {
  const mod = await import("@tmpr/project-tata-ma-pravo");
  return mod;
}
