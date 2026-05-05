import Link from "next/link";

export default function HomePage() {
  return (
    <main className="page-shell">
      <section className="panel">
        <h1>Split Bill Mini App</h1>
        <p>Local MVP for restaurant table bills.</p>
        <Link className="primary-link" href="/admin">
          Open admin
        </Link>
      </section>
    </main>
  );
}
