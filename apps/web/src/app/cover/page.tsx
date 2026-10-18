import type { Metadata } from "next";
import { CoverForm } from "@/components/cover-form";
import { loadBook } from "@/lib/data";

export const metadata: Metadata = { title: "Buy cover" };
export const revalidate = 30;

export default async function CoverPage() {
  const book = await loadBook();
  return (
    <main className="wrap page">
      <div className="section-head">
        <div>
          <h1 style={{ fontSize: "clamp(32px, 4.4vw, 46px)" }}>Cover an upcoming week</h1>
          <p>
            Pick a country and a week at least 72 hours away. If validators rule that the authorities shut the internet down, each lost day
            pays the daily amount to your beneficiary, up to the cap. Nothing to claim.
          </p>
        </div>
      </div>
      <CoverForm terms={book.terms} />
    </main>
  );
}
