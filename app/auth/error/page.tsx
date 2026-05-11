import Link from "next/link";

export default async function AuthErrorPage({
  searchParams,
}: {
  searchParams: Promise<{ reason?: string }>;
}) {
  const { reason } = await searchParams;

  return (
    <div className="scene">
      <nav className="nav">
        <Link href="/" className="nav-logo" aria-label="back to start">
          <span className="nav-logo-text">
            <span className="nav-logo-miso">miso</span>{" "}
            <span className="nav-logo-healthy">healthy</span>
          </span>
        </Link>
      </nav>

      <main className="stage">
        <div className="error-card">
          <div className="error-card-title">that link didn&apos;t work.</div>
          <div className="error-card-desc">
            {reason
              ? reason
              : "It might be expired or already used. Try sending a new one."}
          </div>
          <div className="step-actions" style={{ marginTop: 8 }}>
            <Link href="/login" className="btn-primary">
              try again
            </Link>
          </div>
        </div>
      </main>
    </div>
  );
}
