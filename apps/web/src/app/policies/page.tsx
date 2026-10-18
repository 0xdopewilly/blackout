import type { Metadata } from "next";
import { MyPolicies } from "@/components/my-policies";

export const metadata: Metadata = { title: "My policies" };

export default function PoliciesPage() {
  return (
    <main className="wrap page">
      <div className="section-head">
        <div>
          <h1 style={{ fontSize: "clamp(32px, 4.4vw, 46px)" }}>My policies</h1>
          <p>Policies you bought or that pay you. There is no claim button: a decided week settles itself, and payouts wait here to be withdrawn.</p>
        </div>
      </div>
      <MyPolicies />
    </main>
  );
}
