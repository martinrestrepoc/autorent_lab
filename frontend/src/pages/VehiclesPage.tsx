import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { http } from "../api/http";
import VehicleStatusBadge from "../components/VehicleStatusBadge";

type Vehicle = {
  _id: string;
  plate: string;
  brand: string;
  model: string;
  year: number;
  status?: string;
};

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15">
      {text}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-white/10">
      <td className="p-3">
        <div className="h-3 w-20 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-28 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-28 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-16 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-24 rounded bg-white/10" />
      </td>
      <td className="p-3 text-right">
        <div className="ml-auto h-8 w-44 rounded bg-white/10" />
      </td>
    </tr>
  );
}

export default function VehiclesPage() {
  const navigate = useNavigate();

  const [vehicles, setVehicles] = useState<Vehicle[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string>("");
  const [query, setQuery] = useState("");
  const [openActionsVehicleId, setOpenActionsVehicleId] = useState<string | null>(null);

  const loadVehicles = async () => {
    try {
      setError("");
      setLoading(true);

      const { data } = await http.get("/vehicles");
      // soporta array directo o { vehicles: [] }
      const list = Array.isArray(data) ? data : data.vehicles ?? [];
      setVehicles(list);
    } catch (e: any) {
      setError(e?.response?.data?.message || "Error cargando vehículos");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadVehicles();
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-actions-menu]")) {
        setOpenActionsVehicleId(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  const deleteVehicle = async (id: string, plate: string) => {
    const confirmed = window.confirm(
      `¿Seguro que deseas desactivar el vehículo ${plate}?`,
    );

    if (!confirmed) return;

    try {
      await http.delete(`/vehicles/${id}`);
      await loadVehicles();
    } catch (e: any) {
      alert(e?.response?.data?.message || "Error eliminando vehículo");
    }
  };

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return vehicles;

    return vehicles.filter((v) => {
      const full = `${v.plate} ${v.brand} ${v.model} ${v.year} ${v.status ?? ""}`.toLowerCase();
      return full.includes(q);
    });
  }, [vehicles, query]);

  const total = filtered.length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Vehículos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Consulta y gestiona la flota registrada.
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
            onClick={loadVehicles}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Refrescar
          </button>
        </div>
      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* List */}
      <section className="rounded-2xl border border-white/10 bg-white/5">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Badge text={`${total} vehículos`} />
            {query.trim() && <Badge text={`Filtro: "${query.trim()}"`} />}
          </div>

          <div className="w-full md:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por placa, marca, modelo, año o estado..."
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
            />
          </div>
        </div>

        {/* Table */}
        <div className="overflow-x-auto overflow-y-visible">
          <table className="min-w-[900px] w-full text-sm">
            <thead className="bg-black/20 text-slate-300">
              <tr>
                <th className="text-left p-3 font-medium">Placa</th>
                <th className="text-left p-3 font-medium">Marca</th>
                <th className="text-left p-3 font-medium">Modelo</th>
                <th className="text-left p-3 font-medium">Año</th>
                <th className="text-left p-3 font-medium">Estado</th>
                <th className="text-right p-3 font-medium">Acciones</th>
              </tr>
            </thead>

            <tbody className="text-slate-200">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : filtered.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={6}>
                    {vehicles.length === 0
                      ? "Aún no tienes vehículos. Crea el primero con “+ Nuevo vehículo”."
                      : "No hay resultados con ese filtro."}
                  </td>
                </tr>
              ) : (
                filtered.map((v) => (
                  <tr
                    key={v._id}
                    className="border-t border-white/10 transition hover:bg-white/5"
                  >
                    <td className="p-3 font-semibold text-white">{v.plate}</td>
                    <td className="p-3">{v.brand}</td>
                    <td className="p-3">{v.model}</td>
                    <td className="p-3">{v.year}</td>
                    <td className="p-3">
                      <VehicleStatusBadge status={v.status} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="relative inline-flex" data-actions-menu>
                        <button
                          onClick={() =>
                            setOpenActionsVehicleId((current) =>
                              current === v._id ? null : v._id,
                            )
                          }
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                        >
                          Acciones
                        </button>

                        {openActionsVehicleId === v._id && (
                          <div className="absolute right-0 top-full z-20 mt-2 min-w-52 overflow-hidden rounded-xl border border-white/10 bg-slate-950/95 text-left shadow-2xl backdrop-blur">
                            <button
                              onClick={() => {
                                setOpenActionsVehicleId(null);
                                navigate(`/vehicles/${v._id}/documents`);
                              }}
                              className="block w-full px-4 py-3 text-xs font-medium text-white transition hover:bg-white/5"
                            >
                              Documentos
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsVehicleId(null);
                                navigate(`/vehicles/${v._id}/maintenances`);
                              }}
                              className="block w-full border-t border-white/10 px-4 py-3 text-xs font-medium text-white transition hover:bg-white/5"
                            >
                              Mantenimientos
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsVehicleId(null);
                                navigate(`/vehicles/${v._id}/reminders`);
                              }}
                              className="block w-full border-t border-white/10 px-4 py-3 text-xs font-medium text-white transition hover:bg-white/5"
                            >
                              Recordatorios
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsVehicleId(null);
                                navigate(`/vehicles/${v._id}/edit`);
                              }}
                              className="block w-full border-t border-white/10 px-4 py-3 text-xs font-medium text-white transition hover:bg-white/5"
                            >
                              Editar vehículo
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsVehicleId(null);
                                navigate(`/vehicles/${v._id}/rentals`);
                              }}
                              className="block w-full border-t border-white/10 px-4 py-3 text-xs font-medium text-white transition hover:bg-white/5"
                            >
                              Historial de alquileres
                            </button>
                            <button
                              onClick={() => {
                                setOpenActionsVehicleId(null);
                                deleteVehicle(v._id, v.plate);
                              }}
                              className="block w-full border-t border-white/10 px-4 py-3 text-xs font-medium text-red-400 transition hover:bg-red-500/10"
                              >
                                Eliminar vehículo
                              </button>
                          </div>
                        )}
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}
