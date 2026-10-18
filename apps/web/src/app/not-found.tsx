import Link from "next/link";

export default function NotFound() {
  return (
    <main className="wrap page">
      <div className="empty">
        Nothing here. <Link className="link" href="/">Back to the ledger</Link>.
      </div>
    </main>
  );
}
