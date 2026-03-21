import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import axios from "axios";
import { useAuth } from "../auth/useAuth";

type ApiError = { message?: string | string[] };

function normalizeMessage(msg: any) {
  if (Array.isArray(msg)) return msg.map(String);
  if (typeof msg === "string") return [msg];
  return ["Error al iniciar sesión"];
}

export default function LoginPage() {
  const { login } = useAuth();
  const nav = useNavigate();

  const [email, setEmail] = useState("admin@autorent.local");
  const [password, setPassword] = useState("Admin123");
  const [showPass, setShowPass] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  const canSubmit = useMemo(() => {
    return email.trim().length > 0 && password.trim().length > 0 && !busy;
  }, [email, password, busy]);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);

    if (!email.trim() || !password.trim()) {
      setError("Debes ingresar email y contraseña.");
      return;
    }

    setBusy(true);
    try {
      await login(email.trim(), password);
      nav("/", { replace: true });
    } catch (err: unknown) {
      let msg = "Error al iniciar sesión";

      if (axios.isAxiosError<ApiError>(err)) {
        const data = err.response?.data;
        msg = normalizeMessage(data?.message)[0] ?? msg;
      }

      setError(msg);
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="min-h-screen bg-slate-950 text-slate-100 flex items-center justify-center p-6">
      {/* background glow */}
      <div className="pointer-events-none fixed inset-0">
        <div className="absolute -top-40 left-1/2 h-[520px] w-[520px] -translate-x-1/2 rounded-full bg-blue-500/10 blur-3xl" />
        <div className="absolute -bottom-48 right-10 h-[520px] w-[520px] rounded-full bg-indigo-500/10 blur-3xl" />
      </div>

      <div className="relative w-full max-w-md">
        <div className="rounded-3xl border border-white/10 bg-white/5 shadow-2xl backdrop-blur-xl">
          <div className="p-8">
            {/* Header */}
            <div className="mb-6">
              <div className="flex items-center gap-3">
                <div className="grid h-11 w-11 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                  <span className="text-sm font-bold tracking-wide">AR</span>
                </div>
                <div>
                  <h1 className="text-2xl font-semibold tracking-tight text-white">
                    Autorent Admin
                  </h1>
                  <p className="mt-0.5 text-sm text-slate-400">
                    Inicia sesión para continuar
                  </p>
                </div>
              </div>
            </div>

            {/* Form */}
            <form onSubmit={onSubmit} className="space-y-4">
              <div>
                <label className="text-xs text-slate-300">Email</label>
                <input
                  className="mt-1 w-full rounded-xl border border-white/10 bg-black/20 px-4 py-2.5 text-sm text-white outline-none placeholder:text-slate-500 focus:border-white/20"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="admin@autorent.local"
                  autoComplete="username"
                />
              </div>

              <div>
                <label className="text-xs text-slate-300">Contraseña</label>
                <div className="mt-1 flex items-center gap-2 rounded-xl border border-white/10 bg-black/20 px-3 focus-within:border-white/20">
                  <input
                    className="w-full bg-transparent py-2.5 text-sm text-white outline-none placeholder:text-slate-500"
                    type={showPass ? "text" : "password"}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    autoComplete="current-password"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPass((p) => !p)}
                    className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10 transition"
                  >
                    {showPass ? "Ocultar" : "Ver"}
                  </button>
                </div>
              </div>

              {error && (
                <div className="rounded-2xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-200">
                  {error}
                </div>
              )}

              <button
                disabled={!canSubmit}
                className="w-full rounded-xl bg-white py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {busy ? "Entrando..." : "Entrar"}
              </button>
            </form>

            <div className="mt-6 flex items-center justify-between text-xs text-slate-500">
              <span>Autorent • MVP</span>
              <span className="text-slate-400/80">Solo Admin</span>
            </div>
          </div>
        </div>

        {/* small footer */}
        <p className="mt-4 text-center text-xs text-slate-500">
          Dashboard administrativo para gestión de flota, clientes y alquileres.
        </p>
      </div>
    </div>
  );
}