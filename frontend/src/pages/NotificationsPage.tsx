import { useEffect, useState } from "react";
import { extractErrorMessage } from "../api/error";
import { http } from "../api/http";
import { formatAppDate } from "../utils/date";

type Notification = {
  _id: string;
  tipo: string;
  titulo: string;
  mensaje: string;
  fechaEvento: string;
  leida: boolean;
  readAt?: string | null;
  createdAt: string;
};

function StatusBadge({ read }: { read: boolean }) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${
        read
          ? "bg-slate-500/10 text-slate-200 ring-slate-500/20"
          : "bg-amber-500/10 text-amber-200 ring-amber-500/25"
      }`}
    >
      {read ? "Leída" : "Pendiente"}
    </span>
  );
}

export default function NotificationsPage() {
  const [notifications, setNotifications] = useState<Notification[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");
  const [markingId, setMarkingId] = useState<string | null>(null);

  async function loadNotifications() {
    try {
      setError("");
      setLoading(true);
      const { data } = await http.get("/notificaciones");
      const list = Array.isArray(data) ? data : data.notificaciones ?? [];
      setNotifications(list);
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "Error cargando notificaciones"));
      setNotifications([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadNotifications();
  }, []);

  async function markAsRead(notificationId: string) {
    try {
      setMarkingId(notificationId);
      await http.patch(`/notificaciones/${notificationId}/leida`);
      setNotifications((current) =>
        current.map((item) =>
          item._id === notificationId
            ? { ...item, leida: true, readAt: new Date().toISOString() }
            : item,
        ),
      );
    } catch (error: unknown) {
      setError(extractErrorMessage(error, "No se pudo marcar la notificación"));
    } finally {
      setMarkingId(null);
    }
  }

  function formatDate(dateString?: string | null) {
    return formatAppDate(dateString, "es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Notificaciones
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Eventos operativos activados para tu usuario.
          </p>
        </div>

        <button
          onClick={loadNotifications}
          className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
        >
          Refrescar
        </button>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-4 md:p-5">
        {loading ? (
          <div className="space-y-3">
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
            <div className="h-20 animate-pulse rounded-2xl bg-white/5" />
          </div>
        ) : notifications.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-6 text-sm text-slate-400">
            No tienes notificaciones activas por ahora.
          </div>
        ) : (
          <div className="space-y-3">
            {notifications.map((notification) => (
              <article
                key={notification._id}
                className="rounded-2xl border border-white/10 bg-black/10 p-4"
              >
                <div className="flex flex-col gap-3 md:flex-row md:items-start md:justify-between">
                  <div className="space-y-2">
                    <div className="flex flex-wrap items-center gap-2">
                      <StatusBadge read={notification.leida} />
                      <span className="text-xs uppercase tracking-wide text-slate-400">
                        {notification.tipo.replaceAll("_", " ")}
                      </span>
                    </div>
                    <h2 className="text-base font-semibold text-white">
                      {notification.titulo}
                    </h2>
                    <p className="text-sm text-slate-300">
                      {notification.mensaje}
                    </p>
                    <div className="flex flex-wrap gap-4 text-xs text-slate-400">
                      <span>Fecha evento: {formatDate(notification.fechaEvento)}</span>
                      <span>Creada: {formatDate(notification.createdAt)}</span>
                    </div>
                  </div>

                  {!notification.leida && (
                    <button
                      onClick={() => markAsRead(notification._id)}
                      disabled={markingId === notification._id}
                      className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10 disabled:opacity-50"
                    >
                      {markingId === notification._id
                        ? "Marcando..."
                        : "Marcar leída"}
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
