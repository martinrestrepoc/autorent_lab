import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/base-url";
import { getToken } from "../auth/token";
import VehicleStatusBadge from "../components/VehicleStatusBadge";

type Vehicle = {
  _id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  status?: string;
};

type Client = {
  _id: string;
  fullName?: string;
  email?: string;
  documentNumber?: string;
};

type Rental = {
  _id: string;
};

function StatCard({
  label,
  value,
  hint,
  onClick,
}: {
  label: string;
  value: string | number;
  hint: string;
  onClick?: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className="text-left rounded-2xl border border-white/10 bg-white/5 p-5 transition hover:bg-white/10 hover:border-white/15"
    >
      <p className="text-xs text-slate-400">{label}</p>
      <p className="mt-2 text-3xl font-semibold tracking-tight text-white">
        {value}
      </p>
      <p className="mt-2 text-sm text-slate-400">{hint}</p>
    </button>
  );
}

function SkeletonRow() {
  return (
    <div className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-4">
      <div className="h-3 w-32 rounded bg-white/10" />
      <div className="mt-3 h-3 w-48 rounded bg-white/10" />
    </div>
  );
}

export default function DashboardPage() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [clients, setClients] = useState<Client[]>([]);
  const [rentalsCount, setRentalsCount] = useState<number>(0); // ✅

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  async function fetchJSON(path: string) {
    const token = getToken();

    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) throw new Error(data?.message || `Error ${res.status} cargando ${path}`);
    return data;
  }

  async function loadDashboard() {
    try {
      setError(null);
      setLoading(true);

      // ✅ ahora también traemos alquileres
      const [vData, cData, rData] = await Promise.all([
        fetchJSON("/vehicles"),
        fetchJSON("/clients"),
        fetchJSON("/alquileres"),
      ]);

      // vehicles: normalmente array directo
      const vehiclesList = Array.isArray(vData) ? vData : (vData?.vehicles ?? []);
      setVehicles(Array.isArray(vehiclesList) ? vehiclesList : []);

      // ✅ clients: viene como { clients: [...] }
      const clientsList = Array.isArray(cData?.clients) ? cData.clients : (Array.isArray(cData) ? cData : []);
      setClients(clientsList);

      // ✅ alquileres: normalmente array directo (o { alquileres: [] } / { rentals: [] })
      const rentalsList: Rental[] = Array.isArray(rData)
        ? rData
        : (rData?.alquileres ?? rData?.rentals ?? []);
      setRentalsCount(Array.isArray(rentalsList) ? rentalsList.length : 0);

    } catch (e) {
      setError((e as Error).message);
      setVehicles([]);
      setClients([]);
      setRentalsCount(0);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadDashboard();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const totalVehicles = vehicles.length;
  const totalClients = clients.length;

  const vehiclesByStatus = useMemo(() => {
    const map = new Map<string, number>();
    for (const v of vehicles) {
      const key = (v.status || "SIN_ESTADO").toUpperCase();
      map.set(key, (map.get(key) || 0) + 1);
    }
    return Array.from(map.entries()).sort((a, b) => b[1] - a[1]);
  }, [vehicles]);

  const lastVehicles = useMemo(() => vehicles.slice(0, 5), [vehicles]);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Dashboard
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Resumen general del sistema: flota, clientes y alquileres.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/vehicles/new")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            + Nuevo vehículo
          </button>
          <button
            onClick={() => navigate("/clients/new")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            + Nuevo cliente
          </button>
          <button
            onClick={() => navigate("/rentals/new")}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-semibold text-white transition hover:bg-white/10"
          >
            + Nuevo alquiler
          </button>
          <button
            onClick={loadDashboard}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-slate-200 transition hover:bg-white/10"
          >
            Refrescar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-5">
          <p className="text-sm font-medium text-red-200">
            No se pudo cargar el dashboard
          </p>
          <p className="mt-1 text-sm text-red-200/80">{error}</p>
        </div>
      )}

      {/* KPIs */}
      <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
        <StatCard
          label="Vehículos registrados"
          value={loading ? "—" : totalVehicles}
          hint="Flota total disponible en el sistema."
          onClick={() => navigate("/vehicles")}
        />
        <StatCard
          label="Clientes registrados"
          value={loading ? "—" : totalClients}
          hint="Base total de clientes."
          onClick={() => navigate("/clients")}
        />
        {/* ✅ reemplazo: Estados de flota -> Alquileres */}
        <StatCard
          label="Alquileres"
          value={loading ? "—" : rentalsCount}
          hint="Contratos registrados en el sistema."
          onClick={() => navigate("/rentals")}
        />
      </div>

      {/* Panels */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        {/* Últimos vehículos */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-semibold text-white">
                Últimos vehículos
              </h2>
              <p className="mt-1 text-sm text-slate-400">
                Vista rápida de la flota más reciente.
              </p>
            </div>
            <button
              onClick={() => navigate("/vehicles")}
              className="rounded-xl border border-white/15 bg-white/5 px-3 py-2 text-sm font-medium text-white transition hover:bg-white/10"
            >
              Gestionar
            </button>
          </div>

          <div className="mt-5 space-y-3">
            {loading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}

            {!loading && lastVehicles.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-slate-300">No hay vehículos aún.</p>
                <p className="mt-1 text-sm text-slate-400">
                  Crea el primero para empezar a operar.
                </p>
                <button
                  onClick={() => navigate("/vehicles/new")}
                  className="mt-4 rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
                >
                  + Crear vehículo
                </button>
              </div>
            )}

            {!loading &&
              lastVehicles.map((v) => (
                <div
                  key={v._id}
                  className="rounded-xl border border-white/10 bg-black/20 p-4 transition hover:bg-black/30"
                >
                  <div className="flex items-center justify-between gap-3">
                    <div>
                      <p className="text-sm font-semibold text-white">
                        {v.plate} · {v.brand} {v.model} ({v.year})
                      </p>
                      <p className="mt-1 text-xs text-slate-400">
                        Estado:{" "}
                        <VehicleStatusBadge status={v.status} />
                      </p>
                    </div>

                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/vehicles/${v._id}/documents`)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                      >
                        Docs
                      </button>
                      <button
                        onClick={() => navigate(`/vehicles/${v._id}/edit`)}
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                      >
                        Editar
                      </button>
                    </div>
                  </div>
                </div>
              ))}
          </div>
        </section>

        {/* Distribución por estado */}
        <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
          <h2 className="text-base font-semibold text-white">
            Distribución por estado
          </h2>
          <p className="mt-1 text-sm text-slate-400">
            Resumen rápido de cómo está la flota.
          </p>

          <div className="mt-5 space-y-3">
            {loading && (
              <>
                <SkeletonRow />
                <SkeletonRow />
                <SkeletonRow />
              </>
            )}

            {!loading && vehiclesByStatus.length === 0 && (
              <div className="rounded-xl border border-white/10 bg-black/20 p-5">
                <p className="text-sm text-slate-300">
                  Sin datos de estado por ahora.
                </p>
                <p className="mt-1 text-sm text-slate-400">
                  Cuando registres vehículos, verás su estado aquí.
                </p>
              </div>
            )}

            {!loading &&
              vehiclesByStatus.map(([status, count]) => (
                <div
                  key={status}
                  className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 p-4"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <VehicleStatusBadge status={status} />
                    </div>
                    <p className="mt-1 text-xs text-slate-400">
                      Vehículos en este estado
                    </p>
                  </div>
                  <span className="rounded-xl bg-white/10 px-3 py-1 text-sm font-semibold text-white ring-1 ring-white/15">
                    {count}
                  </span>
                </div>
              ))}
          </div>
        </section>
      </div>
    </div>
  );
}
