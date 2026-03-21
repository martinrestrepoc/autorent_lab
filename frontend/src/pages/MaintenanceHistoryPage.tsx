import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { http } from "../api/http";
import { useTopbarAction } from "../layout/useTopbarAction";

type Maintenance = {
  _id: string;
  tipo: "preventivo" | "correctivo";
  descripcion: string;
  fechaInicio: string;
  fechaEntrega: string;
  costo: number;
  createdAt: string;
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-white/10">
      <td className="p-3">
        <div className="h-3 w-20 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-40 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-24 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-24 rounded bg-white/10" />
      </td>
      <td className="p-3">
        <div className="h-3 w-16 rounded bg-white/10" />
      </td>
    </tr>
  );
}

function TipoBadge({ tipo }: { tipo: string }) {
  const isPreventivo = tipo === "preventivo";
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        isPreventivo
          ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25"
          : "bg-amber-500/10 text-amber-200 ring-amber-500/25"
      }`}
    >
      {isPreventivo ? "Preventivo" : "Correctivo"}
    </span>
  );
}

export default function MaintenanceHistoryPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useTopbarAction({ label: "Volver", to: "/vehicles" });

  const [mantenimientos, setMantenimientos] = useState<Maintenance[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  async function loadHistory() {
    try {
      setError("");
      setLoading(true);

      const { data } = await http.get(`/vehiculos/${id}/mantenimientos`);
      const list: Maintenance[] = data?.mantenimientos ?? [];
      setMantenimientos(list);
    } catch (e: any) {
      setError(
        e?.response?.data?.message ?? "Error cargando historial de mantenimientos"
      );
      setMantenimientos([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadHistory();
  }, [id]);

  function formatDate(dateStr: string) {
    const d = new Date(dateStr);
    if (isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CO");
  }

  function formatCurrency(value: number) {
    return new Intl.NumberFormat("es-CO", {
      style: "currency",
      currency: "COP",
      maximumFractionDigits: 0,
    }).format(value);
  }

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Historial de mantenimientos
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Revisiones y reparaciones asociadas a este vehículo, ordenadas por
            fecha.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate(`/vehicles/${id}/maintenances/new`)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            + Nuevo mantenimiento
          </button>
          <button
            onClick={loadHistory}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
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

      {/* Table */}
      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="min-w-[700px] w-full text-sm">
            <thead className="bg-black/20 text-slate-300">
              <tr>
                <th className="p-3 text-left font-medium">Tipo</th>
                <th className="p-3 text-left font-medium">Descripción</th>
                <th className="p-3 text-left font-medium">Inicio</th>
                <th className="p-3 text-left font-medium">Entrega</th>
                <th className="p-3 text-left font-medium">Costo</th>
                <th className="p-3 text-right font-medium">Detalle</th>
              </tr>
            </thead>

            <tbody className="text-slate-200">
              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : mantenimientos.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={6}>
                    Sin historial de mantenimientos. Registra el primero.
                  </td>
                </tr>
              ) : (
                mantenimientos.map((m) => (
                  <tr
                    key={m._id}
                    className="border-t border-white/10 hover:bg-white/5 transition"
                  >
                    <td className="p-3">
                      <TipoBadge tipo={m.tipo} />
                    </td>
                    <td className="p-3 max-w-xs truncate" title={m.descripcion}>
                      {m.descripcion}
                    </td>
                    <td className="p-3">{formatDate(m.fechaInicio)}</td>
                    <td className="p-3">{formatDate(m.fechaEntrega)}</td>
                    <td className="p-3">{formatCurrency(m.costo)}</td>
                    <td className="p-3 text-right">
                      <button
                        onClick={() =>
                          navigate(`/maintenances/${m._id}`)
                        }
                        className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-white/10"
                      >
                        Ver
                      </button>
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
