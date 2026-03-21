import { useMemo, useState } from "react";
import { NavLink, Outlet, useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../auth/useAuth";
import {
  TopbarActionContext,
  type TopbarAction,
} from "./topbarAction.context";

function cx(...classes: Array<string | false | undefined | null>) {
  return classes.filter(Boolean).join(" ");
}

export default function AdminLayout() {
  const location = useLocation();
  const navigate = useNavigate();
  const { user, logout } = useAuth();
  const [topbarAction, setTopbarAction] = useState<TopbarAction>(null);

  const onLogout = () => {
    logout?.(); // por si logout no existe aún, no revienta
    navigate("/login", { replace: true });
  };

  const linkClass = ({ isActive }: { isActive: boolean }) =>
    cx(
      "group flex items-center gap-3 rounded-xl px-3 py-2 text-sm transition",
      isActive
        ? "bg-white/10 text-white ring-1 ring-white/15"
        : "text-slate-300 hover:bg-white/5 hover:text-white"
    );

  const topbarContextValue = useMemo(
    () => ({
      action: topbarAction,
      setAction: setTopbarAction,
    }),
    [topbarAction],
  );

  const handleTopbarAction = () => {
    if (!topbarAction) return;

    if (topbarAction.onClick) {
      topbarAction.onClick();
      return;
    }

    if (topbarAction.to) {
      navigate(topbarAction.to);
    }
  };

  return (
    <TopbarActionContext.Provider value={topbarContextValue}>
      <div className="min-h-screen overflow-x-hidden bg-slate-950 text-white">
        {/* Background glow (se ve pro) */}
        <div className="pointer-events-none fixed inset-0">
          <div className="absolute -top-40 left-1/2 h-80 w-[700px] -translate-x-1/2 rounded-full bg-blue-600/20 blur-3xl" />
          <div className="absolute -bottom-40 right-0 h-80 w-[600px] rounded-full bg-indigo-500/10 blur-3xl" />
        </div>

        <div className="relative mx-auto flex min-h-screen w-full max-w-7xl">
          {/* Sidebar */}
          <aside className="hidden w-72 shrink-0 border-r border-white/10 bg-slate-950/60 p-5 backdrop-blur md:block">
            <div className="flex items-center gap-3">
              <div className="grid h-10 w-10 place-items-center rounded-2xl bg-white/10 ring-1 ring-white/15">
                <span className="font-bold">AR</span>
              </div>
              <div>
                <p className="text-sm text-slate-300">Panel</p>
                <h1 className="text-lg font-semibold tracking-tight">
                  Autorent Admin
                </h1>
              </div>
            </div>

            <nav className="mt-8 space-y-1">
              <NavLink to="/" className={linkClass} end>
                <span className="h-2 w-2 rounded-full bg-blue-400/80 opacity-0 group-hover:opacity-100 transition" />
                Dashboard
              </NavLink>

              <NavLink to="/vehicles" className={linkClass}>
                <span className="h-2 w-2 rounded-full bg-blue-400/80 opacity-0 group-hover:opacity-100 transition" />
                Vehículos
              </NavLink>

              <NavLink to="/clients" className={linkClass}>
                <span className="h-2 w-2 rounded-full bg-blue-400/80 opacity-0 group-hover:opacity-100 transition" />
                Clientes
              </NavLink>

              <NavLink to="/rentals" className={linkClass}>
                <span className="h-2 w-2 rounded-full bg-blue-400/80 opacity-0 group-hover:opacity-100 transition" />
                Alquileres
              </NavLink>

              <NavLink to="/agenda" className={linkClass}>
                <span className="h-2 w-2 rounded-full bg-blue-400/80 opacity-0 group-hover:opacity-100 transition" />
                Agenda
              </NavLink>

              <NavLink to="/notifications" className={linkClass}>
                <span className="h-2 w-2 rounded-full bg-blue-400/80 opacity-0 group-hover:opacity-100 transition" />
                Notificaciones
              </NavLink>
            </nav>

            <div className="mt-10 rounded-2xl border border-white/10 bg-white/5 p-4">
              <p className="text-xs text-slate-400">Sesión activa</p>
              <p className="mt-1 text-sm font-medium">
                {user?.email || "admin"}
              </p>
              <button
                onClick={onLogout}
                className="mt-4 w-full rounded-xl bg-white/10 px-3 py-2 text-sm font-medium text-white ring-1 ring-white/15 transition hover:bg-white/15"
              >
                Cerrar sesión
              </button>
            </div>

            <p className="mt-6 text-xs text-slate-500">
              © {new Date().getFullYear()} Autorent
            </p>
          </aside>

          {/* Main */}
          <main className="flex-1">
            {/* Topbar */}
            <header className="sticky top-0 z-30 border-b border-white/10 bg-slate-950/60 backdrop-blur">
              <div className="mx-auto flex max-w-7xl items-center justify-between px-4 py-4 md:px-6">
                <div>
                  <p className="text-xs text-slate-400">Bienvenido</p>
                  <h2 className="text-base font-semibold tracking-tight">
                    {user?.email || "admin@autorent.local"}
                  </h2>
                </div>

                {topbarAction && location.pathname !== "/" && (
                  <button
                    onClick={handleTopbarAction}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    {topbarAction.label}
                  </button>
                )}
              </div>
            </header>

            {/* Content */}
            <div className="mx-auto max-w-7xl px-4 py-6 md:px-6">
              <Outlet />
            </div>
          </main>
        </div>
      </div>
    </TopbarActionContext.Provider>
  );
}
