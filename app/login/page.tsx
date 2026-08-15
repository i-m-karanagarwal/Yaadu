import { Suspense } from "react";
import LoginForm from "./LoginForm";

export default function LoginPage() {
  return (
    <Suspense
      fallback={
        <main className="min-h-screen flex items-center justify-center bg-stone-50">
          <p className="text-sm text-stone-500">Loading…</p>
        </main>
      }
    >
      <LoginForm />
    </Suspense>
  );
}
