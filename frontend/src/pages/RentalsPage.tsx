import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/base-url";
import { getToken } from "../auth/token";

type Rental = {
  _id: string;
  cliente: {
    _id: string;
    email?: string;
  };
  vehiculo: {
    _id: string;
    plate: string;
  };
  fechaInicio: string;
  fechaFin: string;
  fechaFinReal?: string;
  fechaCancelacion?: string;
  motivoCancelacion?: string;
  diasExceso?: number;
  estado: string;
};

function Badge({ text }: { text: string }) {
  return (
    <span className="inline-flex items-center rounded-full bg-white/10 px-2.5 py-1 text-xs font-medium text-slate-200 ring-1 ring-white/15">
      {text}
    </span>
  );
}

function StatusPill({ status }: { status: string }) {
  const s = (status ?? "").toLowerCase();
  const ok =
    s.includes("activo") || s.includes("vigente") || s.includes("abierto");
  const done =
    s.includes("cerrado") || s.includes("final") || s.includes("termin");

  const cls = ok
    ? "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25"
    : done
    ? "bg-slate-500/10 text-slate-200 ring-slate-500/20"
    : "bg-amber-500/10 text-amber-200 ring-amber-500/25";

  return (
    <span className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${cls}`}>
      {status || "—"}
    </span>
  );
}

function SkeletonRow() {
  return (
    <tr className="animate-pulse border-t border-white/10">
      <td className="p-3"><div className="h-3 w-20 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-44 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-20 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-20 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-20 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-3 w-12 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-6 w-20 rounded-full bg-white/10" /></td>
      <td className="p-3"><div className="ml-auto h-7 w-20 rounded-lg bg-white/10" /></td>
    </tr>
  );
}

export default function RentalsPage() {
  const navigate = useNavigate();

  const [rentals, setRentals] = useState<Rental[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [query, setQuery] = useState("");
  const [finalizeModalOpen, setFinalizeModalOpen] = useState(false);
  const [selectedRental, setSelectedRental] = useState<Rental | null>(null);
  const [fechaFinReal, setFechaFinReal] = useState("");
  const [finalizeError, setFinalizeError] = useState<string | null>(null);
  const [finalizeLoading, setFinalizeLoading] = useState(false);
  const [deletingRentalId, setDeletingRentalId] = useState<string | null>(null);
  const [cancelingRentalId, setCancelingRentalId] = useState<string | null>(null);
  const [openActionsRentalId, setOpenActionsRentalId] = useState<string | null>(null);
  const [cancelModalOpen, setCancelModalOpen] = useState(false);
  const [cancelReason, setCancelReason] = useState("");
  const [cancelError, setCancelError] = useState<string | null>(null);
  const [cancelPreviewRental, setCancelPreviewRental] = useState<Rental | null>(null);
  const [viewCancelInfoOpen, setViewCancelInfoOpen] = useState(false);
  const [viewCancelInfoRental, setViewCancelInfoRental] = useState<Rental | null>(null);

  async function loadRentals() {
    try {
      setError(null);
      setLoading(true);

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/alquileres`, {
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data?.message || "No se pudo cargar alquileres");

      // soporta array directo o { alquileres: [] } / { rentals: [] }
      const list = Array.isArray(data)
        ? data
        : (data.alquileres ?? data.rentals ?? []);
      setRentals(Array.isArray(list) ? list : []);
    } catch (e) {
      setError("Error cargando alquileres: " + (e as Error).message);
      setRentals([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    loadRentals();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    function handleOutsideClick(event: MouseEvent) {
      const target = event.target as HTMLElement;
      if (!target.closest("[data-actions-menu]")) {
        setOpenActionsRentalId(null);
      }
    }

    document.addEventListener("mousedown", handleOutsideClick);
    return () => {
      document.removeEventListener("mousedown", handleOutsideClick);
    };
  }, []);

  function formatDate(dateString: string) {
    const d = new Date(dateString);
    if (Number.isNaN(d.getTime())) return "—";
    return d.toLocaleDateString("es-CO", { day: "2-digit", month: "2-digit", year: "2-digit" });
  }

  function normalizeStatus(status: string) {
    return (status ?? "").toUpperCase();
  }

  function isInProgress(rental: Rental) {
    const state = normalizeStatus(rental.estado);
    return state === "EN_CURSO" || state === "ACTIVO";
  }

  function canDelete(rental: Rental) {
    return !isInProgress(rental);
  }

  function canCancel(rental: Rental) {
    const state = normalizeStatus(rental.estado);
    return state === "PROGRAMADO" || state === "EN_CURSO" || state === "ACTIVO";
  }

  function isCancelled(rental: Rental) {
    return normalizeStatus(rental.estado) === "CANCELADO";
  }

  function openFinalizeModal(rental: Rental) {
    setSelectedRental(rental);
    setFechaFinReal("");
    setFinalizeError(null);
    setFinalizeModalOpen(true);
  }

  function closeFinalizeModal() {
    if (finalizeLoading) return;
    setFinalizeModalOpen(false);
    setSelectedRental(null);
    setFechaFinReal("");
    setFinalizeError(null);
  }

  function openCancelModal(rental: Rental) {
    setCancelPreviewRental(rental);
    setCancelReason("");
    setCancelError(null);
    setCancelModalOpen(true);
  }

  function closeCancelModal() {
    if (cancelingRentalId) return;
    setCancelModalOpen(false);
    setCancelReason("");
    setCancelError(null);
    setCancelPreviewRental(null);
  }

  function openCancelInfoModal(rental: Rental) {
    setViewCancelInfoRental(rental);
    setViewCancelInfoOpen(true);
  }

  function closeCancelInfoModal() {
    setViewCancelInfoOpen(false);
    setViewCancelInfoRental(null);
  }

  async function submitFinalize() {
    if (!selectedRental) return;

    setFinalizeError(null);

    if (!fechaFinReal) {
      setFinalizeError("Selecciona la fecha de fin real");
      return;
    }

    if (fechaFinReal < selectedRental.fechaInicio.slice(0, 10)) {
      setFinalizeError("La fecha de finalización no puede ser anterior a la fecha de inicio");
      return;
    }

    try {
      setFinalizeLoading(true);

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/alquileres/${selectedRental._id}/finalizar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ fechaFinReal }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo finalizar el contrato");
      }

      closeFinalizeModal();
      await loadRentals();
    } catch (e) {
      setFinalizeError((e as Error).message);
    } finally {
      setFinalizeLoading(false);
    }
  }

  async function removeRental(rental: Rental) {
    const accepted = window.confirm(
      `¿Seguro que quieres eliminar el contrato del vehículo ${rental.vehiculo?.plate ?? "—"}?`,
    );
    if (!accepted) return;

    try {
      setError(null);
      setDeletingRentalId(rental._id);

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/alquileres/${rental._id}`, {
        method: "DELETE",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo eliminar el contrato");
      }

      await loadRentals();
      setOpenActionsRentalId(null);
    } catch (e) {
      setError((e as Error).message);
    } finally {
      setDeletingRentalId(null);
    }
  }

  async function cancelRental() {
    if (!cancelPreviewRental || !canCancel(cancelPreviewRental)) return;
    setCancelError(null);

    if (!cancelReason.trim()) {
      setCancelError("Ingrese motivo de cancelación");
      return;
    }

    try {
      setError(null);
      setCancelingRentalId(cancelPreviewRental._id);

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/alquileres/${cancelPreviewRental._id}/cancelar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({ motivoCancelacion: cancelReason.trim() }),
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        throw new Error(data?.message || "No se pudo cancelar el contrato");
      }

      await loadRentals();
      setOpenActionsRentalId(null);
      closeCancelModal();
    } catch (e) {
      setCancelError((e as Error).message);
    } finally {
      setCancelingRentalId(null);
    }
  }

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return rentals;

    return rentals.filter((r) => {
      const hay = `${r.vehiculo?.plate ?? ""} ${r.cliente?.email ?? ""} ${r.estado ?? ""} ${r.fechaInicio ?? ""} ${r.fechaFin ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [rentals, query]);

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Alquileres
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Contratos activos y registrados en el sistema.
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            onClick={() => navigate("/rentals/new")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            + Nuevo alquiler
          </button>

          <button
            onClick={loadRentals}
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

      {/* Table card */}
      <section className="relative rounded-2xl border border-white/10 bg-white/5">
        {/* Toolbar */}
        <div className="flex flex-col gap-3 border-b border-white/10 p-4 md:flex-row md:items-center md:justify-between">
          <div className="flex items-center gap-2">
            <Badge text={`${filtered.length} alquileres`} />
            {query.trim() && <Badge text={`Filtro: "${query.trim()}"`} />}
          </div>

          <div className="w-full md:w-80">
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Buscar por placa, email o estado..."
              className="w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25"
            />
          </div>
        </div>

        <div className="w-full">
          <table className="w-full table-fixed text-sm">
            <thead className="bg-black/20 text-slate-300">
              <tr>
                <th className="w-[10%] text-left p-3 font-medium">Vehículo</th>
                <th className="w-[22%] text-left p-3 font-medium">Cliente</th>
                <th className="w-[10%] text-left p-3 font-medium">Inicio</th>
                <th className="w-[10%] text-left p-3 font-medium">Fin</th>
                <th className="w-[10%] text-left p-3 font-medium">Fin real</th>
                <th className="w-[10%] text-left p-3 font-medium">Días exceso</th>
                <th className="w-[12%] text-left p-3 font-medium">Estado</th>
                <th className="w-[16%] text-right p-3 font-medium">Acciones</th>
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
                  <td className="p-6 text-slate-400" colSpan={8}>
                    {rentals.length === 0
                      ? "No hay alquileres registrados todavía. Crea el primero con “+ Nuevo alquiler”."
                      : "No hay resultados con ese filtro."}
                  </td>
                </tr>
              ) : (
                filtered.map((r) => (
                  <tr
                    key={r._id}
                    className="border-t border-white/10 hover:bg-white/5 transition"
                  >
                    <td className="p-3 font-semibold text-white">
                      {r.vehiculo?.plate ?? "—"}
                    </td>
                    <td className="p-3 truncate">{r.cliente?.email ?? "—"}</td>
                    <td className="p-3">{formatDate(r.fechaInicio)}</td>
                    <td className="p-3">{formatDate(r.fechaFin)}</td>
                    <td className="p-3">{r.fechaFinReal ? formatDate(r.fechaFinReal) : "—"}</td>
                    <td className="p-3">{typeof r.diasExceso === "number" ? r.diasExceso : 0}</td>
                    <td className="p-3">
                      <StatusPill status={r.estado} />
                    </td>
                    <td className="p-3 text-right">
                      <div className="relative inline-block text-left" data-actions-menu>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenActionsRentalId((prev) =>
                              prev === r._id ? null : r._id,
                            )
                          }
                          className="rounded-lg border border-white/15 bg-white/5 px-3 py-1.5 text-xs font-medium text-white hover:bg-white/10"
                        >
                          Acciones
                        </button>

                        {openActionsRentalId === r._id && (
                          <div className="absolute bottom-full right-0 z-30 mb-2 w-44 rounded-xl border border-white/10 bg-slate-900/95 p-1 shadow-xl backdrop-blur">
                            <button
                              onClick={() => {
                                setOpenActionsRentalId(null);
                                openFinalizeModal(r);
                              }}
                              disabled={!isInProgress(r)}
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                            >
                              Finalizar contrato
                            </button>

                            <button
                              onClick={() => {
                                setOpenActionsRentalId(null);
                                openCancelModal(r);
                              }}
                              disabled={!canCancel(r) || cancelingRentalId === r._id}
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                            >
                              {cancelingRentalId === r._id
                                ? "Cancelando..."
                                : "Cancelar contrato"}
                            </button>

                            <button
                              onClick={() => removeRental(r)}
                              disabled={!canDelete(r) || deletingRentalId === r._id}
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-red-300 hover:bg-red-500/10 disabled:cursor-not-allowed disabled:opacity-50"
                            >
                              {deletingRentalId === r._id
                                ? "Eliminando..."
                                : "Eliminar contrato"}
                            </button>

                            {isCancelled(r) && (
                              <button
                                onClick={() => {
                                  setOpenActionsRentalId(null);
                                  openCancelInfoModal(r);
                                }}
                                className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10"
                              >
                                Ver motivo cancelación
                              </button>
                            )}
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

      {finalizeModalOpen && selectedRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Finalizar contrato</h2>
            <p className="mt-1 text-sm text-slate-400">
              Vehículo {selectedRental.vehiculo?.plate ?? "—"} • Inicio {formatDate(selectedRental.fechaInicio)}
            </p>

            {finalizeError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {finalizeError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs text-slate-300">Fecha de fin real</label>
              <input
                type="date"
                value={fechaFinReal}
                onChange={(e) => setFechaFinReal(e.target.value)}
                className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeFinalizeModal}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Cerrar
              </button>
              <button
                onClick={submitFinalize}
                disabled={finalizeLoading}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {finalizeLoading ? "Finalizando..." : "Confirmar finalización"}
              </button>
            </div>
          </div>
        </div>
      )}

      {cancelModalOpen && cancelPreviewRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Cancelar contrato</h2>
            <p className="mt-1 text-sm text-slate-400">
              Vehículo {cancelPreviewRental.vehiculo?.plate ?? "—"} • Inicio {formatDate(cancelPreviewRental.fechaInicio)}
            </p>

            {cancelError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {cancelError}
              </div>
            )}

            <div className="mt-4">
              <label className="block text-xs text-slate-300">Motivo de cancelación</label>
              <textarea
                value={cancelReason}
                onChange={(e) => setCancelReason(e.target.value)}
                rows={4}
                placeholder="Describe el motivo..."
                className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
              />
            </div>

            <div className="mt-5 flex justify-end gap-2">
              <button
                onClick={closeCancelModal}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
              >
                Cerrar
              </button>
              <button
                onClick={cancelRental}
                disabled={cancelingRentalId === cancelPreviewRental._id}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {cancelingRentalId === cancelPreviewRental._id
                  ? "Cancelando..."
                  : "Confirmar cancelación"}
              </button>
            </div>
          </div>
        </div>
      )}

      {viewCancelInfoOpen && viewCancelInfoRental && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
          <div className="w-full max-w-md rounded-2xl border border-white/15 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Motivo de cancelación</h2>
            <p className="mt-1 text-sm text-slate-400">
              Vehículo {viewCancelInfoRental.vehiculo?.plate ?? "—"}
            </p>

            <div className="mt-4 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">Fecha de cancelación</p>
              <p className="mt-1 text-sm text-slate-200">
                {viewCancelInfoRental.fechaCancelacion
                  ? formatDate(viewCancelInfoRental.fechaCancelacion)
                  : "—"}
              </p>
            </div>

            <div className="mt-3 rounded-xl border border-white/10 bg-black/20 p-3">
              <p className="text-xs text-slate-400">Motivo</p>
              <p className="mt-1 whitespace-pre-wrap text-sm text-slate-200">
                {viewCancelInfoRental.motivoCancelacion?.trim() || "No registrado"}
              </p>
            </div>

            <div className="mt-5 flex justify-end">
              <button
                onClick={closeCancelInfoModal}
                className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
              >
                Cerrar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
