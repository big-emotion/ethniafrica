/**
 * Utilitaires d'authentification admin
 * Utilise des variables d'environnement pour les credentials
 */

import { cookies } from "next/headers";
import { logger } from "@/lib/api/logger";

const ADMIN_USERNAME = process.env.ADMIN_USERNAME;
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD;
const SESSION_COOKIE_NAME = "admin_session";
const SESSION_SECRET =
  process.env.ADMIN_SESSION_SECRET || "default-secret-change-in-production";

/**
 * Vérifier les credentials admin
 */
export function verifyAdminCredentials(
  username: string,
  password: string
): boolean {
  if (!ADMIN_USERNAME || !ADMIN_PASSWORD) {
    logger.error("Admin credentials not configured");
    return false;
  }

  // Comparaison timing-safe pour éviter les attaques par timing
  const usernameMatch = timingSafeEqual(username, ADMIN_USERNAME);
  const passwordMatch = timingSafeEqual(password, ADMIN_PASSWORD);

  return usernameMatch && passwordMatch;
}

/**
 * Comparaison timing-safe de chaînes
 */
function timingSafeEqual(a: string, b: string): boolean {
  if (a.length !== b.length) {
    return false;
  }

  let result = 0;
  for (let i = 0; i < a.length; i++) {
    result |= a.charCodeAt(i) ^ b.charCodeAt(i);
  }

  return result === 0;
}

/**
 * Générer un token de session sécurisé
 */
export function createAdminSessionToken(): string {
  const timestamp = Date.now();
  const random = Math.random().toString(36).substring(2, 15);
  const data = `${timestamp}:${random}:${SESSION_SECRET}`;

  // Simple hash (pour production, utiliser crypto.createHash)
  return Buffer.from(data).toString("base64");
}

/**
 * Vérifier un token de session
 */
export function verifyAdminSessionToken(token: string): boolean {
  try {
    const decoded = Buffer.from(token, "base64").toString("utf-8");
    const parts = decoded.split(":");

    if (parts.length !== 3) {
      return false;
    }

    const timestamp = parseInt(parts[0], 10);
    const secret = parts[2];

    // Vérifier le secret
    if (secret !== SESSION_SECRET) {
      return false;
    }

    // Vérifier l'expiration (24 heures)
    const SESSION_DURATION = 24 * 60 * 60 * 1000; // 24h en ms
    const now = Date.now();
    if (now - timestamp > SESSION_DURATION) {
      return false;
    }

    return true;
  } catch {
    return false;
  }
}

/**
 * Obtenir le token de session depuis les cookies
 */
export async function getAdminSessionToken(): Promise<string | null> {
  const cookieStore = await cookies();
  const sessionCookie = cookieStore.get(SESSION_COOKIE_NAME);
  return sessionCookie?.value || null;
}

/**
 * Vérifier si l'utilisateur est authentifié (via cookie)
 */
export async function isAdminAuthenticated(): Promise<boolean> {
  const token = await getAdminSessionToken();
  if (!token) {
    return false;
  }
  return verifyAdminSessionToken(token);
}

/**
 * Options pour le cookie de session
 */
export function getSessionCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";

  return {
    name: SESSION_COOKIE_NAME,
    httpOnly: true,
    secure: isProduction,
    sameSite: "strict" as const,
    maxAge: 24 * 60 * 60, // 24 heures en secondes
    path: "/",
  };
}
