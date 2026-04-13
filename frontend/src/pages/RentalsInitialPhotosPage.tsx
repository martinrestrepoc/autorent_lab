import { useCallback, useEffect, useMemo, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";
import { API_BASE_URL } from "../api/base-url";
import { normalizeMessage } from "../api/error";
import { getToken } from "../auth/token";
import { useTopbarAction } from "../layout/useTopbarAction";
import { formatAppDate } from "../utils/date";

type RentalPhoto = {
  id: string;
  originalName: string;
  mimeType: string;
  size: number;
  uploadedAt: string;
};

type RentalSummary = {
  _id: string;
  estado?: string;
  vehiculo?: {
    plate?: string;
    brand?: string;
  };
  cliente?: {
    fullName?: string;
    email?: string;
  };
};

type PhotoPreview = RentalPhoto & {
  previewUrl: string | null;
};

function formatFileSize(size: number) {
  if (!Number.isFinite(size) || size <= 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
  const value = size / 1024 ** power;
  return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
}

export default function RentalsInitialPhotosPage() {
  const navigate = useNavigate();
  const { id } = useParams<{ id: string }>();
  useTopbarAction({ label: "Volver", to: "/rentals" });

  const [rental, setRental] = useState<RentalSummary | null>(null);
  const [photos, setPhotos] = useState<PhotoPreview[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchWithAuth = useCallback(async (path: string, init?: RequestInit) => {
    const token = getToken();
    return fetch(`${API_BASE_URL}${path}`, {
      ...init,
      headers: {
        ...(init?.headers ?? {}),
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });
  }, []);

  const revokePreviewUrls = useCallback((items: PhotoPreview[]) => {
    items.forEach((item) => {
      if (item.previewUrl) {
        URL.revokeObjectURL(item.previewUrl);
      }
    });
  }, []);

  const loadPhotos = useCallback(async (rentalId: string) => {
    setLoading(true);
    setError(null);

    try {
      const [rentalRes, photosRes] = await Promise.all([
        fetchWithAuth(`/alquileres/${rentalId}`),
        fetchWithAuth(`/alquileres/${rentalId}/fotos-iniciales`),
      ]);

      const rentalData = await rentalRes.json().catch(() => ({}));
      if (!rentalRes.ok) {
        const msg = normalizeMessage(rentalData?.message)[0] ?? "No se pudo cargar el alquiler";
        throw new Error(msg);
      }

      const photosData = await photosRes.json().catch(() => ({}));
      if (!photosRes.ok) {
        const msg = normalizeMessage(photosData?.message)[0] ?? "No se pudo cargar las fotos";
        throw new Error(msg);
      }

      const list = Array.isArray(photosData?.photos) ? (photosData.photos as RentalPhoto[]) : [];
      const nextPhotos = await Promise.all(
        list.map(async (photo) => {
          try {
            const downloadRes = await fetchWithAuth(
              `/alquileres/${rentalId}/fotos-iniciales/${photo.id}/descargar`,
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

      setRental(rentalData as RentalSummary);
      setPhotos((current) => {
        revokePreviewUrls(current);
        return nextPhotos;
      });
    } catch (err) {
      setError((err as Error).message);
      setRental(null);
      setPhotos((current) => {
        revokePreviewUrls(current);
        return [];
      });
    } finally {
      setLoading(false);
    }
  }, [fetchWithAuth, revokePreviewUrls]);

  useEffect(() => {
    if (!id) return;
    void loadPhotos(id);
  }, [id, loadPhotos]);

  useEffect(() => {
    return () => {
      revokePreviewUrls(photos);
    };
  }, [photos, revokePreviewUrls]);

  const rentalLabel = useMemo(() => {
    if (!rental) return "Alquiler";
    const plate = rental.vehiculo?.plate ?? "sin placa";
    const client = rental.cliente?.fullName || rental.cliente?.email || "cliente sin nombre";
    return `${plate} · ${client}`;
  }, [rental]);

  async function handleDownload(photo: RentalPhoto) {
    if (!id) return;

    try {
      const res = await fetchWithAuth(`/alquileres/${id}/fotos-iniciales/${photo.id}/descargar`);
      if (!res.ok) {
        const data = await res.json().catch(() => ({}));
        const msg = normalizeMessage(data?.message)[0] ?? "No se pudo descargar la foto";
        throw new Error(msg);
      }

      const blob = await res.blob();
      const url = window.URL.createObjectURL(blob);
      const link = window.document.createElement("a");
      link.href = url;
      link.download = photo.originalName;
      window.document.body.appendChild(link);
      link.click();
      window.document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (err) {
      setError((err as Error).message);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Evidencia del estado inicial
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            {rentalLabel}
          </p>
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => id && void loadPhotos(id)}
            className="rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
          >
            Refrescar
          </button>

          <button
            type="button"
            onClick={() => navigate("/rentals")}
            className="rounded-xl bg-white px-4 py-2 text-sm font-semibold text-slate-950 transition hover:opacity-90"
          >
            Ir a alquileres
          </button>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      <section className="rounded-2xl border border-white/10 bg-white/5 p-6">
        {loading ? (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {Array.from({ length: 3 }).map((_, index) => (
              <div key={index} className="animate-pulse rounded-2xl border border-white/10 bg-black/20 p-4">
                <div className="aspect-[4/3] rounded-xl bg-white/10" />
                <div className="mt-4 h-4 w-2/3 rounded bg-white/10" />
                <div className="mt-2 h-3 w-1/2 rounded bg-white/10" />
              </div>
            ))}
          </div>
        ) : photos.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-white/10 bg-black/10 p-8 text-center text-sm text-slate-400">
            Este alquiler todavía no tiene fotos iniciales cargadas.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-3">
            {photos.map((photo) => (
              <article
                key={photo.id}
                className="overflow-hidden rounded-2xl border border-white/10 bg-black/20"
              >
                <div className="aspect-[4/3] bg-black/30">
                  {photo.previewUrl ? (
                    <img
                      src={photo.previewUrl}
                      alt={photo.originalName}
                      className="h-full w-full object-cover"
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-sm text-slate-500">
                      Vista previa no disponible
                    </div>
                  )}
                </div>

                <div className="space-y-3 p-4">
                  <div>
                    <p className="truncate text-sm font-semibold text-white">
                      {photo.originalName}
                    </p>
                    <p className="mt-1 text-xs text-slate-400">
                      {formatAppDate(photo.uploadedAt)} · {formatFileSize(photo.size)}
                    </p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleDownload(photo)}
                    className="w-full rounded-xl border border-white/15 bg-white/5 px-4 py-2 text-sm font-medium text-white transition hover:bg-white/10"
                  >
                    Descargar foto
                  </button>
                </div>
              </article>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
