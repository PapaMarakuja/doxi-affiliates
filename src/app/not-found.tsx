import Link from "next/link";

export default function NotFound() {
  return (
    <div className="not-found-container min-h-screen">
      <div>
        <h1 className="not-found-title">404</h1>
        <p className="not-found-text">Página não encontrada</p>
        <Link href="/" className="not-found-link">
          Voltar ao início
        </Link>
      </div>
    </div>
  );
}
