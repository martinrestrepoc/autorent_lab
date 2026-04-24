import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/base-url";
import { getToken } from "../auth/token";
import { formatAppDate } from "../utils/date";

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
  fotosEstadoInicial?: Array<{ id?: string }>;
  fotosEstadoFinal?: Array<{ id?: string }>;
  reporteCierre?: {
    hayDanos: boolean;
    descripcion: string;
    fechaReporte: string;
  } | null;
};

type RentalPhoto = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

type PhotoPreview = RentalPhoto & {
  previewUrl: string | null;
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
      <td className="p-3"><div className="h-3 w-12 rounded bg-white/10" /></td>
      <td className="p-3"><div className="h-6 w-20 rounded-full bg-white/10" /></td>
      <td className="p-3"><div className="ml-auto h-7 w-20 rounded-lg bg-white/10" /></td>
    </tr>
  );
}

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** power;
  return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
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
  const [finalizePhotosLoading, setFinalizePhotosLoading] = useState(false);
  const [initialConditionPhotos, setInitialConditionPhotos] = useState<PhotoPreview[]>([]);
  const [finalConditionPhotos, setFinalConditionPhotos] = useState<PhotoPreview[]>([]);
  const [finalPhotosToUpload, setFinalPhotosToUpload] = useState<File[]>([]);
  const [hayDanos, setHayDanos] = useState(false);
  const [descripcionReporte, setDescripcionReporte] = useState("");
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

  async function fetchWithAuth(path: string, init?: RequestInit) {
    const token = getToken();
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }

  function revokePreviewUrls(items: PhotoPreview[]) {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }

  async function buildPhotoPreviews(rentalId: string, type: "iniciales" | "finales") {
    const listRes = await fetchWithAuth(`/alquileres/${rentalId}/fotos-${type}`);
    const listData = await listRes.json().catch(() => ({}));

    if (!listRes.ok) {
      throw new Error(listData?.message || `No se pudo cargar las fotos ${type}`);
    }

    const photos = Array.isArray(listData?.photos) ? (listData.photos as RentalPhoto[]) : [];

    return Promise.all(
      photos.map(async (photo) => {
        try {
          const downloadRes = await fetchWithAuth(
            `/alquileres/${rentalId}/fotos-${type}/${photo.id}/descargar`,
          );

          if (!downloadRes.ok) {
            return { ...photo, previewUrl: null };
          }

          const blob = await downloadRes.blob();
          return { ...photo, previewUrl: URL.createObjectURL(blob) };
        } catch {
          return { ...photo, previewUrl: null };
        }
      }),
    );
  }

  async function loadFinalizePhotos(rentalId: string) {
    setFinalizePhotosLoading(true);
    try {
      const [initialPhotos, finalPhotos] = await Promise.all([
        buildPhotoPreviews(rentalId, "iniciales"),
        buildPhotoPreviews(rentalId, "finales"),
      ]);

      setInitialConditionPhotos((current) => {
        revokePreviewUrls(current);
        return initialPhotos;
      });
      setFinalConditionPhotos((current) => {
        revokePreviewUrls(current);
        return finalPhotos;
      });
    } catch (e) {
      setFinalizeError((e as Error).message);
      setInitialConditionPhotos((current) => {
        revokePreviewUrls(current);
        return [];
      });
      setFinalConditionPhotos((current) => {
        revokePreviewUrls(current);
        return [];
      });
    } finally {
      setFinalizePhotosLoading(false);
    }
  }

  useEffect(() => {
    loadRentals();
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

  useEffect(() => {
    return () => {
      revokePreviewUrls(initialConditionPhotos);
      revokePreviewUrls(finalConditionPhotos);
    };
  }, [finalConditionPhotos, initialConditionPhotos]);

  function formatDate(dateString: string) {
    return formatAppDate(dateString, "es-CO", {
      day: "2-digit",
      month: "2-digit",
      year: "2-digit",
    });
  }

  function normalizeStatus(status: string) {
    return (status ?? "").toUpperCase();
  }

  function isInProgress(rental: Rental) {
    const state = normalizeStatus(rental.estado);
    return state === "EN_CURSO" || state === "ACTIVO";
  }

  function canManageFinalPhotos(rental: Rental) {
    const state = normalizeStatus(rental.estado);
    return (
      state === "EN_CURSO" ||
      state === "ACTIVO" ||
      state === "FINALIZADO" ||
      state === "CANCELADO"
    );
  }

  function canDelete(rental: Rental) {
    return !isInProgress(rental);
  }

  function isFinalized(rental: Rental) {
    return normalizeStatus(rental.estado) === "FINALIZADO";
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
    setFinalPhotosToUpload([]);
    setHayDanos(rental.reporteCierre?.hayDanos ?? false);
    setDescripcionReporte(rental.reporteCierre?.descripcion ?? "");
    setFinalizeModalOpen(true);
    void loadFinalizePhotos(rental._id);
  }

  function closeFinalizeModal() {
    if (finalizeLoading) return;
    setFinalizeModalOpen(false);
    setSelectedRental(null);
    setFechaFinReal("");
    setFinalizeError(null);
    setFinalizePhotosLoading(false);
    setFinalPhotosToUpload([]);
    setHayDanos(false);
    setDescripcionReporte("");
    setInitialConditionPhotos((current) => {
      revokePreviewUrls(current);
      return [];
    });
    setFinalConditionPhotos((current) => {
      revokePreviewUrls(current);
      return [];
    });
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

    if (isFinalized(selectedRental)) {
      closeFinalizeModal();
      return;
    }

    if (!isInProgress(selectedRental)) {
      if (finalPhotosToUpload.length === 0) {
        setFinalizeError("Selecciona al menos una foto final para cargar");
        return;
      }

      try {
        setFinalizeLoading(true);

        const token = getToken();

        for (const photo of finalPhotosToUpload) {
          const formData = new FormData();
          formData.append("file", photo);

          const uploadRes = await fetch(`${API_BASE_URL}/alquileres/${selectedRental._id}/fotos-finales`, {
            method: "POST",
            headers: {
              ...(token ? { Authorization: `Bearer ${token}` } : {}),
            },
            body: formData,
          });

          const uploadData = await uploadRes.json().catch(() => ({}));
          if (!uploadRes.ok) {
            throw new Error(uploadData?.message || `No se pudo subir la foto ${photo.name}`);
          }
        }

        closeFinalizeModal();
        await loadRentals();
      } catch (e) {
        setFinalizeError((e as Error).message);
      } finally {
        setFinalizeLoading(false);
      }

      return;
    }

    if (!fechaFinReal) {
      setFinalizeError("Selecciona la fecha de fin real");
      return;
    }

    if (fechaFinReal < selectedRental.fechaInicio.slice(0, 10)) {
      setFinalizeError("La fecha de finalización no puede ser anterior a la fecha de inicio");
      return;
    }

    const reporteNormalizado = descripcionReporte.trim();
    if (hayDanos && !reporteNormalizado) {
      setFinalizeError("Describe los daños detectados antes de finalizar");
      return;
    }

    try {
      setFinalizeLoading(true);

      const token = getToken();

      for (const photo of finalPhotosToUpload) {
        const formData = new FormData();
        formData.append("file", photo);

        const uploadRes = await fetch(`${API_BASE_URL}/alquileres/${selectedRental._id}/fotos-finales`, {
          method: "POST",
          headers: {
            ...(token ? { Authorization: `Bearer ${token}` } : {}),
          },
          body: formData,
        });

        const uploadData = await uploadRes.json().catch(() => ({}));
        if (!uploadRes.ok) {
          throw new Error(uploadData?.message || `No se pudo subir la foto ${photo.name}`);
        }
      }

      const res = await fetch(`${API_BASE_URL}/alquileres/${selectedRental._id}/finalizar`, {
        method: "PATCH",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          fechaFinReal,
          hayDanos,
          descripcionReporte: reporteNormalizado || "Sin daños reportados al cierre",
        }),
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

  function getCloseReportLabel(rental: Rental) {
    if (!isFinalized(rental)) return "—";
    if (!rental.reporteCierre) return "Sin reporte";
    return rental.reporteCierre.hayDanos ? "Con daños" : "Sin daños";
  }

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
                <th className="w-[10%] text-left p-3 font-medium">Fotos inicio</th>
                <th className="w-[10%] text-left p-3 font-medium">Fotos fin</th>
                <th className="w-[12%] text-left p-3 font-medium">Reporte cierre</th>
                <th className="w-[10%] text-left p-3 font-medium">Estado</th>
                <th className="w-[18%] text-right p-3 font-medium">Acciones</th>
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
                  <td className="p-6 text-slate-400" colSpan={11}>
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
                    <td className="p-3">{r.fotosEstadoInicial?.length ?? 0}</td>
                    <td className="p-3">{r.fotosEstadoFinal?.length ?? 0}</td>
                    <td className="p-3">{getCloseReportLabel(r)}</td>
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
                                navigate(`/rentals/${r._id}/initial-photos`);
                              }}
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-slate-300 hover:bg-white/10"
                            >
                              Ver fotos iniciales
                            </button>

                            <button
                              onClick={() => {
                                setOpenActionsRentalId(null);
                                openFinalizeModal(r);
                              }}
                              disabled={!canManageFinalPhotos(r)}
                              className="block w-full rounded-lg px-3 py-2 text-left text-xs text-white hover:bg-white/10 disabled:cursor-not-allowed disabled:text-slate-500"
                            >
                              Fotos y finalización
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
          <div className="w-full max-w-5xl rounded-2xl border border-white/15 bg-slate-900 p-5">
            <h2 className="text-lg font-semibold text-white">Comparar fotos y finalizar contrato</h2>
            <p className="mt-1 text-sm text-slate-400">
              Vehículo {selectedRental!.vehiculo?.plate ?? "—"} • Inicio {formatDate(selectedRental!.fechaInicio)}
            </p>

            {finalizeError && (
              <div className="mt-4 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-sm text-red-200">
                {finalizeError}
              </div>
            )}

            <div className="mt-4 grid gap-4 xl:grid-cols-[1fr_1fr_320px]">
              <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Estado inicial</h3>
                    <p className="text-xs text-slate-400">Fotos registradas al entregar el vehículo.</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                    {initialConditionPhotos.length}
                  </span>
                </div>

                {finalizePhotosLoading ? (
                  <div className="grid grid-cols-2 gap-3">
                    {Array.from({ length: 4 }).map((_, index) => (
                      <div key={index} className="animate-pulse rounded-xl border border-white/10 bg-white/5 p-2">
                        <div className="aspect-[4/3] rounded-lg bg-white/10" />
                      </div>
                    ))}
                  </div>
                ) : initialConditionPhotos.length === 0 ? (
                  <div className="rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-sm text-slate-500">
                    No hay fotos iniciales registradas.
                  </div>
                ) : (
                  <div className="grid grid-cols-2 gap-3">
                    {initialConditionPhotos.map((photo) => (
                      <article key={photo.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
                        <div className="aspect-[4/3] bg-black/30">
                          {photo.previewUrl ? (
                            <img
                              src={photo.previewUrl}
                              alt={photo.originalName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-500">
                              Vista previa no disponible
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-xs font-medium text-white">{photo.originalName}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatDate(photo.uploadedAt)} • {formatFileSize(photo.size)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="mb-3 flex items-center justify-between">
                  <div>
                    <h3 className="text-sm font-semibold text-white">Estado final</h3>
                    <p className="text-xs text-slate-400">Toma o sube fotos nuevas para compararlas con el estado inicial.</p>
                  </div>
                  <span className="rounded-full bg-white/10 px-2.5 py-1 text-xs text-slate-300">
                    {finalConditionPhotos.length + finalPhotosToUpload.length}
                  </span>
                </div>

                <label className="block text-xs text-slate-300">Fotos finales (JPG/PNG/WEBP)</label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  onChange={(e) => setFinalPhotosToUpload(Array.from(e.target.files ?? []))}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-slate-950"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Repite frente, laterales, parte trasera, interior y cualquier detalle relevante.
                </p>

                {finalPhotosToUpload.length > 0 && (
                  <div className="mt-4 rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-3">
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-emerald-200">
                      Nuevas fotos por subir
                    </p>
                    <div className="mt-3 space-y-2">
                      {finalPhotosToUpload.map((photo, index) => (
                        <div
                          key={`${photo.name}-${index}`}
                          className="flex items-center justify-between rounded-lg border border-white/10 bg-black/20 px-3 py-2 text-xs text-slate-200"
                        >
                          <span className="truncate pr-3">{photo.name}</span>
                          <span className="shrink-0 text-slate-400">{formatFileSize(photo.size)}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                )}

                {finalConditionPhotos.length > 0 && (
                  <div className="mt-4 grid grid-cols-2 gap-3">
                    {finalConditionPhotos.map((photo) => (
                      <article key={photo.id} className="overflow-hidden rounded-xl border border-white/10 bg-slate-950/70">
                        <div className="aspect-[4/3] bg-black/30">
                          {photo.previewUrl ? (
                            <img
                              src={photo.previewUrl}
                              alt={photo.originalName}
                              className="h-full w-full object-cover"
                            />
                          ) : (
                            <div className="flex h-full items-center justify-center text-xs text-slate-500">
                              Vista previa no disponible
                            </div>
                          )}
                        </div>
                        <div className="p-3">
                          <p className="truncate text-xs font-medium text-white">{photo.originalName}</p>
                          <p className="mt-1 text-[11px] text-slate-400">
                            {formatDate(photo.uploadedAt)} • {formatFileSize(photo.size)}
                          </p>
                        </div>
                      </article>
                    ))}
                  </div>
                )}

                {!finalizePhotosLoading &&
                  finalConditionPhotos.length === 0 &&
                  finalPhotosToUpload.length === 0 && (
                    <div className="mt-4 rounded-xl border border-dashed border-white/10 bg-black/10 p-6 text-center text-sm text-slate-500">
                      Aún no hay fotos finales cargadas.
                    </div>
                  )}
              </section>

              <section className="rounded-2xl border border-white/10 bg-black/20 p-4">
                {isFinalized(selectedRental) && selectedRental.reporteCierre && (
                  <div className="mb-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                    <p className="font-medium text-white">Reporte registrado</p>
                    <p className="mt-2">
                      Estado reportado:{" "}
                      <span className="font-semibold text-white">
                        {selectedRental.reporteCierre.hayDanos ? "Con daños" : "Sin daños"}
                      </span>
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-slate-300">
                      {selectedRental.reporteCierre.descripcion}
                    </p>
                    <p className="mt-2 text-slate-500">
                      Reportado el {formatDate(selectedRental.reporteCierre.fechaReporte)}
                    </p>
                  </div>
                )}

                <label className="block text-xs text-slate-300">Fecha de fin real</label>
                <input
                  type="date"
                  value={fechaFinReal}
                  onChange={(e) => setFechaFinReal(e.target.value)}
                  disabled={!isInProgress(selectedRental)}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25"
                />

                <div className="mt-4 space-y-3 rounded-xl border border-white/10 bg-white/[0.03] p-3">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                      Estado al cierre
                    </p>
                    <p className="mt-1 text-sm text-slate-300">
                      Registra si el vehículo presenta daños al compararlo con las fotos iniciales.
                    </p>
                  </div>

                  <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
                    <button
                      type="button"
                      onClick={() => isInProgress(selectedRental) && setHayDanos(false)}
                      disabled={!isInProgress(selectedRental)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        !hayDanos
                          ? "border-emerald-400/40 bg-emerald-500/10 text-emerald-200"
                          : "border-white/10 bg-black/20 text-slate-300"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      Sin daños
                    </button>
                    <button
                      type="button"
                      onClick={() => isInProgress(selectedRental) && setHayDanos(true)}
                      disabled={!isInProgress(selectedRental)}
                      className={`rounded-xl border px-3 py-2 text-sm font-medium transition ${
                        hayDanos
                          ? "border-amber-400/40 bg-amber-500/10 text-amber-200"
                          : "border-white/10 bg-black/20 text-slate-300"
                      } disabled:cursor-not-allowed disabled:opacity-70`}
                    >
                      Con daños
                    </button>
                  </div>

                  <div>
                    <label className="block text-xs text-slate-300">Reporte de estado</label>
                    <textarea
                      value={descripcionReporte}
                      onChange={(e) => setDescripcionReporte(e.target.value)}
                      disabled={!isInProgress(selectedRental)}
                      rows={5}
                      placeholder={
                        hayDanos
                          ? "Describe los daños detectados al cierre..."
                          : "Ejemplo: Sin daños reportados al cierre."
                      }
                      className="mt-1 w-full resize-none rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white outline-none focus:border-white/25 disabled:opacity-80"
                    />
                    <p className="mt-2 text-xs text-slate-500">
                      {hayDanos
                        ? "Este campo es obligatorio cuando se detectan daños."
                        : "Puedes dejar una observación breve o usar el texto por defecto."}
                    </p>
                  </div>
                </div>

                <div className="mt-4 rounded-xl border border-white/10 bg-white/[0.03] p-3 text-xs text-slate-300">
                  <p className="font-medium text-white">Antes de cerrar</p>
                  <p className="mt-2">
                    Verifica si hay diferencias entre las fotos iniciales y finales para dejar evidencia del estado del vehículo.
                  </p>
                </div>

                <div className="mt-5 flex flex-col gap-2">
                  <button
                    onClick={submitFinalize}
                    disabled={finalizeLoading || finalizePhotosLoading}
                    className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
                  >
                    {finalizeLoading
                      ? "Guardando..."
                      : isFinalized(selectedRental)
                      ? "Cerrar"
                      : isInProgress(selectedRental)
                      ? "Guardar fotos y finalizar"
                      : "Guardar fotos finales"}
                  </button>
                  <button
                    onClick={closeFinalizeModal}
                    className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white hover:bg-white/10"
                  >
                    Cerrar
                  </button>
                </div>
              </section>
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
