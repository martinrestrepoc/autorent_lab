import { useCallback, useEffect, useState } from "react";
import { useParams } from "react-router-dom";
import { extractErrorMessage } from "../api/error";
import { http } from "../api/http";
import { useTopbarAction } from "../layout/useTopbarAction";
import { formatAppDate } from "../utils/date";

type Client = {
  _id: string;
  fullName: string;
  email?: string;
};

type Rent = {
  _id: string;
  cliente: Client;
  vehiculo: string;
  fechaInicio: string;
  fechaFin: string;
  estado: string;
  diasExceso?: number;
};

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-white/10">
      <td className="p-3"><div className="h-3 w-28 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-24 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-24 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-20 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-10 rounded bg-white/10" /></td>
    </tr>
  );
}

export default function RentalsHistoryPage() {
  const { id } = useParams();
  useTopbarAction({ label: "Volver", to: "/vehicles" });

  const [rents, setRents] = useState<Rent[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadHistory = useCallback(async () => {
    try {
      setError("");
      setLoading(true);

      const { data } = await http.get(`/vehiculos/${id}/alquileres`);

      const list = data?.historial ?? [];
      setRents(list);

    } catch (error: unknown) {
      setError(extractErrorMessage(error, "Error cargando historial"));
      setRents([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadHistory();
  }, [loadHistory]);

  function formatDate(date: string) {
    return formatAppDate(date);
  }

  return (
    <div className="space-y-4">

      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Historial de alquileres
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Contratos asociados a este vehículo.
          </p>
        </div>

        <div className="flex gap-2">
          <button
            onClick={loadHistory}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
          >
            Refrescar
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {/* Tabla */}
      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">

        <div className="overflow-x-auto">
          <table className="min-w-[800px] w-full text-sm">

            <thead className="bg-black/20 text-slate-300">
              <tr>
                <th className="p-3 text-left font-medium">Cliente</th>
                <th className="p-3 text-left font-medium">Inicio</th>
                <th className="p-3 text-left font-medium">Fin</th>
                <th className="p-3 text-left font-medium">Estado</th>
                <th className="p-3 text-left font-medium">Días exceso</th>
              </tr>
            </thead>

            <tbody className="text-slate-200">

              {loading ? (
                <>
                  <SkeletonRow />
                  <SkeletonRow />
                  <SkeletonRow />
                </>
              ) : rents.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={5}>
                    Sin historial de alquileres
                  </td>
                </tr>
              ) : (
                rents.map((r) => (
                  <tr
                    key={r._id}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="p-3 font-semibold text-white">
                      {r.cliente?.fullName ?? "—"}
                    </td>

                    <td className="p-3">
                      {formatDate(r.fechaInicio)}
                    </td>

                    <td className="p-3">
                      {formatDate(r.fechaFin)}
                    </td>

                    <td className="p-3">
                      <span className="rounded-lg bg-white/10 px-2 py-1 text-xs ring-1 ring-white/15">
                        {r.estado}
                      </span>
                    </td>

                    <td className="p-3">
                      {r.diasExceso ?? 0}
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
