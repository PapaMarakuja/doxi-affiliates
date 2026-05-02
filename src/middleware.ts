import { NextResponse } from "next/server";
import type { NextRequest } from "next/server";

const PUBLIC_PAGE_PATHS = new Set<string>(["/login"]);
const PUBLIC_API_PREFIXES = ["/api/auth/login"];
const ADMIN_PAGE_PREFIXES = ["/afiliados", "/cupons", "/gerenciar-conquistas"];
const PROTECTED_PAGE_PREFIXES = [
  "/dashboard",
  "/afiliados",
  "/cupons",
  "/minhas-vendas",
  "/pagamentos",
  "/brindes",
  "/suporte",
  "/gerenciar-conquistas",
];

function hasSupabaseAuthCookie(request: NextRequest): boolean {
  return request.cookies
    .getAll()
    .some((cookie) => cookie.name.includes("sb-") && cookie.name.includes("-auth-token"));
}

function isPublicPath(pathname: string): boolean {
  if (PUBLIC_PAGE_PATHS.has(pathname)) return true;
  return PUBLIC_API_PREFIXES.some((prefix) => pathname.startsWith(prefix));
}

function isProtectedPagePath(pathname: string): boolean {
  return PROTECTED_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAdminPagePath(pathname: string): boolean {
  return ADMIN_PAGE_PREFIXES.some(
    (prefix) => pathname === prefix || pathname.startsWith(`${prefix}/`)
  );
}

function isAdminApiRoute(pathname: string, method: string): boolean {
  // Rotas explicitamente admin
  if (pathname.startsWith("/api/admin/")) return true;
  if (pathname.startsWith("/api/sync/")) return true;
  if (pathname.startsWith("/api/users/")) return true;
  if (pathname === "/api/users") return true;

  // Gestão de Afiliados e Perfis
  if (pathname.startsWith("/api/affiliates") && !pathname.startsWith("/api/affiliates/me")) return true;
  if (pathname.startsWith("/api/profiles")) return true;

  // Conquistas (Gestão é Admin, exceto Claim que é do Afiliado)
  if (pathname === "/api/achievements/affiliates") return true;
  if (pathname === "/api/achievements" && method !== "GET") return true;
  if (pathname.startsWith("/api/achievements/") && !pathname.includes("/claim") && method !== "GET") return true;

  // Cupons (Gestão é Admin, exceto stats/link/unlink que são do Afiliado)
  if (pathname === "/api/coupons") return true;
  const isAffiliateCouponRoute = pathname.includes("/stats") || pathname.includes("/link") || pathname.includes("/unlink");
  if (pathname.startsWith("/api/coupons/") && !isAffiliateCouponRoute) return true;


  return false;
}

function unauthorizedApiResponse() {
  return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
}

function forbiddenApiResponse() {
  return NextResponse.json({ error: "Forbidden: admin access required" }, { status: 403 });
}

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;
  if (isPublicPath(pathname)) return NextResponse.next();

  const isApiRoute = pathname.startsWith("/api/");
  const isProtectedPage = !isApiRoute && isProtectedPagePath(pathname);
  const isProtectedApi = isApiRoute;
  const requiresAuth = isProtectedPage || isProtectedApi;

  if (!requiresAuth) return NextResponse.next();

  const authenticated = hasSupabaseAuthCookie(request);
  if (!authenticated) {
    if (isApiRoute) return unauthorizedApiResponse();
    const loginUrl = new URL("/login", request.url);
    return NextResponse.redirect(loginUrl);
  }

  const requiresAdmin = isAdminPagePath(pathname) || isAdminApiRoute(pathname, request.method);
  if (!requiresAdmin) return NextResponse.next();

  // Pre-check de role no middleware para bloquear cedo quando disponível.
  // A verificação definitiva continua no server-side das rotas.
  const roleCookie = request.cookies.get("doxi-role")?.value;
  if (roleCookie && roleCookie !== "admin") {
    if (isApiRoute) return forbiddenApiResponse();
    const fallbackUrl = new URL("/dashboard", request.url);
    return NextResponse.redirect(fallbackUrl);
  }

  return NextResponse.next();
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|favicon.ico).*)"],
};
