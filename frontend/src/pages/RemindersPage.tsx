import { useCallback, useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { extractErrorMessage } from "../api/error";
import { http } from "../api/http";
import { useTopbarAction } from "../layout/useTopbarAction";
import { formatAppDate } from "../utils/date";

type Reminder = {
  _id: string;
  tipo: string;
  titulo: string;
  detalle?: string;
  fechaRecordatorio: string;
  estado: string;
  notifiedAt?: string | null;
  createdAt: string;
};

function StatusBadge({ status }: { status: string }) {
  const normalized = (status ?? "").toUpperCase();
  const classes =
    normalized === "ACTIVADO"
      ? "bg-amber-500/10 text-amber-200 ring-amber-500/25"
      : "bg-blue-500/10 text-blue-200 ring-blue-500/25";

  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${classes}`}
    >
      {normalized}
    </span>
  );
}

export default function RemindersPage() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  useTopbarAction({ label: "Volver", to: "/vehicles" });

  const [reminders, setReminders] = useState<Reminder[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const loadReminders = useCallback(async () => {
    try {
      setError("");
      setLoading(true);
      const { data } = await http.get(`/vehiculos/${id}/recordatorios`);
      const list = Array.isArray(data) ? data : data.recordatorios ?? [];
      setReminders(list);
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "Error cargando recordatorios"));
      setReminders([]);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    void loadReminders();
  }, [loadReminders]);

  function formatDate(dateString?: string | null) {
    return formatAppDate(dateString);
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Agenda de recordatorios
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Revisiones preventivas programadas para este vehículo.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate(`/vehicles/${id}/reminders/new`)}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            + Nuevo recordatorio
          </button>
          <button
            onClick={loadReminders}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
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

      <section className="rounded-2xl border border-white/10 bg-white/5 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[760px] text-sm">
            <thead className="bg-black/20 text-slate-300">
              <tr>
                <th className="p-3 text-left font-medium">Fecha</th>
                <th className="p-3 text-left font-medium">Título</th>
                <th className="p-3 text-left font-medium">Detalle</th>
                <th className="p-3 text-left font-medium">Estado</th>
                <th className="p-3 text-left font-medium">Notificado</th>
              </tr>
            </thead>
            <tbody className="text-slate-200">
              {loading ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={5}>
                    Cargando recordatorios...
                  </td>
                </tr>
              ) : reminders.length === 0 ? (
                <tr>
                  <td className="p-6 text-slate-400" colSpan={5}>
                    No hay recordatorios programados para este vehículo.
                  </td>
                </tr>
              ) : (
                reminders.map((reminder) => (
                  <tr
                    key={reminder._id}
                    className="border-t border-white/10 hover:bg-white/5"
                  >
                    <td className="p-3">{formatDate(reminder.fechaRecordatorio)}</td>
                    <td className="p-3 font-medium text-white">{reminder.titulo}</td>
                    <td className="p-3">{reminder.detalle?.trim() || "—"}</td>
                    <td className="p-3">
                      <StatusBadge status={reminder.estado} />
                    </td>
                    <td className="p-3">{formatDate(reminder.notifiedAt)}</td>
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
