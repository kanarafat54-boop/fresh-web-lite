import { AuthForm } from "./AuthForm";

export default function AuthRoute() {
  return (
    <main className="auth-route" aria-label="Fresh ID sign in">
      <div className="auth-modal">
        <AuthForm />
      </div>
    </main>
  );
}
