import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { extractErrorMessage } from "../api/error";
import { http } from "../api/http";
import { useTopbarAction } from "../layout/useTopbarAction";
import { formatAppDate } from "../utils/date";

type Maintenance = {
  _id: string;
  vehiculo_id: string;
  tipo: "preventivo" | "correctivo";
  descripcion: string;
  fechaInicio: string;
  fechaEntrega: string;
  costo: number;
  createdAt: string;
};

function SkeletonField() {
  return <div className="h-5 w-48 animate-pulse rounded bg-white/10" />;
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

export default function MaintenanceDetailPage() {
  const { id } = useParams<{ id: string }>();
  const [maintenance, setMaintenance] = useState<Maintenance | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  useTopbarAction({
    label: "Volver",
    to: maintenance?.vehiculo_id
      ? `/vehicles/${maintenance.vehiculo_id}/maintenances`
      : "/vehicles",
  });

  const load = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const { data } = await http.get(`/mantenimientos/${id}`);
      setMaintenance(data);
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "No se pudo cargar el mantenimiento"));
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void load();
  }, [load]);

  function formatDate(dateStr?: string) {
    return formatAppDate(dateStr);
  }

  function formatCurrency(value?: number) {
    if (value === undefined) return "—";
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
            Detalle de mantenimiento
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Información completa del registro.
          </p>
        </div>

      </div>

      {/* Error */}
      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Detail card */}
      <section className="max-w-2xl rounded-2xl border border-white/10 bg-white/5 p-6 space-y-5">
        {/* Tipo */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Tipo
          </p>
          {loading ? (
            <SkeletonField />
          ) : maintenance ? (
            <TipoBadge tipo={maintenance.tipo} />
          ) : null}
        </div>

        {/* Descripción */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Descripción
          </p>
          {loading ? (
            <SkeletonField />
          ) : (
            <p className="text-sm text-white">
              {maintenance?.descripcion ?? "—"}
            </p>
          )}
        </div>

        {/* Fecha inicio */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Fecha de inicio
          </p>
          {loading ? (
            <SkeletonField />
          ) : (
            <p className="text-sm text-white">
              {formatDate(maintenance?.fechaInicio)}
            </p>
          )}
        </div>

        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Fecha de entrega
          </p>
          {loading ? (
            <SkeletonField />
          ) : (
            <p className="text-sm text-white">
              {formatDate(maintenance?.fechaEntrega)}
            </p>
          )}
        </div>

        {/* Costo */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Costo
          </p>
          {loading ? (
            <SkeletonField />
          ) : (
            <p className="text-sm text-white">
              {formatCurrency(maintenance?.costo)}
            </p>
          )}
        </div>

        {/* Registrado el */}
        <div>
          <p className="text-xs text-slate-400 uppercase tracking-wide mb-1">
            Registrado el
          </p>
          {loading ? (
            <SkeletonField />
          ) : (
            <p className="text-sm text-white">
              {formatDate(maintenance?.createdAt)}
            </p>
          )}
        </div>
      </section>
    </div>
  );
}
