import React, { useCallback, useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { API_BASE_URL } from "../api/base-url";
import { normalizeMessage } from "../api/error";
import { getToken } from "../auth/token";
import { useTopbarAction } from "../layout/useTopbarAction";
import { getTodayDateInputValue } from "../utils/date";

type Client = {
  _id: string;
  email: string;
  fullName: string;
};

type Vehicle = {
  _id: string;
  plate: string;
  brand: string;
  status?: string;
};

export default function RentalsCreatePage() {
  const navigate = useNavigate();
  useTopbarAction({ label: "Volver", to: "/rentals" });
  const todayString = getTodayDateInputValue();

  const [clients, setClients] = useState<Client[]>([]);
  const [vehicles, setVehicles] = useState<Vehicle[]>([]);

  const [cliente, setCliente] = useState("");
  const [vehiculo, setVehiculo] = useState("");
  const [fechaInicio, setFechaInicio] = useState("");
  const [fechaFin, setFechaFin] = useState("");
  const [createStartReminder, setCreateStartReminder] = useState(false);
  const [startReminderDate, setStartReminderDate] = useState("");
  const [startReminderTitle, setStartReminderTitle] = useState("");
  const [startReminderDetail, setStartReminderDetail] = useState("");
  const [createReturnReminder, setCreateReturnReminder] = useState(false);
  const [returnReminderDate, setReturnReminderDate] = useState("");
  const [returnReminderTitle, setReturnReminderTitle] = useState("");
  const [returnReminderDetail, setReturnReminderDetail] = useState("");
  const [initialPhotos, setInitialPhotos] = useState<File[]>([]);

  const [loadingInit, setLoadingInit] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25";

  const formatFileSize = useCallback((size: number) => {
    if (!Number.isFinite(size) || size <= 0) return "0 B";
    const units = ["B", "KB", "MB", "GB"];
    const power = Math.min(Math.floor(Math.log(size) / Math.log(1024)), units.length - 1);
    const value = size / 1024 ** power;
    return `${value.toFixed(power === 0 ? 0 : 1)} ${units[power]}`;
  }, []);

  const fetchJSON = useCallback(async (path: string) => {
    const token = getToken();
    const res = await fetch(`${API_BASE_URL}${path}`, {
      headers: {
        "Content-Type": "application/json",
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    const data = await res.json().catch(() => ({}));
    if (!res.ok) {
      const msg = normalizeMessage(data?.message)[0] ?? `Error ${res.status} en ${path}`;
      throw new Error(msg);
    }
    return data;
  }, []);

  const loadInitialData = useCallback(async () => {
    setError(null);
    setLoadingInit(true);

    try {
      const [clientsData, vehiclesData] = await Promise.all([
        fetchJSON("/clients"),
        fetchJSON("/vehicles"),
      ]);

      setClients(Array.isArray(clientsData?.clients) ? clientsData.clients : []);

      const vehicleList = Array.isArray(vehiclesData)
        ? vehiclesData
        : (vehiclesData?.vehicles ?? []);
      setVehicles(Array.isArray(vehicleList) ? vehicleList : []);
    } catch (e) {
      setError((e as Error).message);
      setClients([]);
      setVehicles([]);
    } finally {
      setLoadingInit(false);
    }
  }, [fetchJSON]);

  useEffect(() => {
    void loadInitialData();
  }, [loadInitialData]);

  useEffect(() => {
    if (createStartReminder) {
      if (!startReminderDate) setStartReminderDate(fechaInicio);
      if (!startReminderTitle) setStartReminderTitle("Inicio de alquiler");
    }
  }, [createStartReminder, fechaInicio, startReminderDate, startReminderTitle]);

  useEffect(() => {
    if (createReturnReminder) {
      if (!returnReminderDate) setReturnReminderDate(fechaFin);
      if (!returnReminderTitle) setReturnReminderTitle("Devolución de alquiler");
    }
  }, [createReturnReminder, fechaFin, returnReminderDate, returnReminderTitle]);

  async function uploadInitialPhotos(rentalId: string, token: string | null) {
    for (const photo of initialPhotos) {
      const formData = new FormData();
      formData.append("file", photo);

      const res = await fetch(`${API_BASE_URL}/alquileres/${rentalId}/fotos-iniciales`, {
        method: "POST",
        headers: {
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: formData,
      });

      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        const msg =
          normalizeMessage(data?.message)[0] ?? `No se pudo subir la foto ${photo.name}`;
        throw new Error(msg);
      }
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSuccessMsg(null);

    if (!cliente || !vehiculo || !fechaInicio || !fechaFin) {
      setError("Todos los campos son obligatorios");
      return;
    }

    if (fechaFin <= fechaInicio) {
      setError("La fecha fin debe ser mayor a la fecha inicio");
      return;
    }

    if (fechaInicio < todayString) {
      setError("La fecha inicio no puede ser anterior a hoy");
      return;
    }

    try {
      setLoading(true);

      const selectedClient = clients.find((item) => item._id === cliente);
      const clientLabel =
        selectedClient?.fullName || selectedClient?.email || "cliente asignado";

      const token = getToken();
      const res = await fetch(`${API_BASE_URL}/alquileres`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          ...(token ? { Authorization: `Bearer ${token}` } : {}),
        },
        body: JSON.stringify({
          cliente,
          vehiculo,
          fechaInicio,
          fechaFin,
          createStartReminder,
          startReminderDate: startReminderDate || fechaInicio,
          startReminderTitle: startReminderTitle || "Inicio de alquiler",
          startReminderDetail:
            startReminderDetail || `Entrega programada para ${clientLabel}`,
          createReturnReminder,
          returnReminderDate: returnReminderDate || fechaFin,
          returnReminderTitle: returnReminderTitle || "Devolución de alquiler",
          returnReminderDetail:
            returnReminderDetail || `Recepción programada de ${clientLabel}`,
        }),
      });

      const data = await res.json().catch(() => ({}));

      if (!res.ok) {
        const msg = normalizeMessage(data?.message)[0] ?? "Error creando alquiler";
        throw new Error(msg);
      }

      const rentalId = data?._id ?? data?.alquiler?._id ?? data?.rent?._id;
      if (rentalId && initialPhotos.length > 0) {
        await uploadInitialPhotos(rentalId, token);
      }

      setSuccessMsg(data?.message ?? "Alquiler creado con éxito");
      navigate("/rentals");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      <div className="flex flex-col gap-3 md:flex-row md:items-end md:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-white">
            Crear nuevo alquiler
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Selecciona cliente, vehículo y rango de fechas para programar el contrato.
          </p>
        </div>
      </div>

      {error && (
        <div className="rounded-2xl border border-red-500/30 bg-red-500/10 p-4 text-sm text-red-200">
          {error}
        </div>
      )}

      {successMsg && (
        <div className="rounded-2xl border border-emerald-500/25 bg-emerald-500/10 p-4 text-sm text-emerald-200">
          {successMsg}
        </div>
      )}

      <section className="max-w-3xl rounded-2xl border border-white/10 bg-white/5 p-6">
        {loadingInit ? (
          <div className="animate-pulse space-y-4">
            <div className="h-10 w-full rounded-xl bg-white/10" />
            <div className="h-10 w-full rounded-xl bg-white/10" />
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div className="h-10 w-full rounded-xl bg-white/10" />
              <div className="h-10 w-full rounded-xl bg-white/10" />
            </div>
            <div className="h-11 w-44 rounded-xl bg-white/10" />
          </div>
        ) : (
          <form onSubmit={handleSubmit} className="space-y-5">
            <div>
              <label className="block text-xs text-slate-300">Cliente</label>
              <select
                value={cliente}
                onChange={(e) => setCliente(e.target.value)}
                className={inputBase}
              >
                <option value="">Seleccionar cliente</option>
                {clients.map((c) => (
                  <option key={c._id} value={c._id}>
                    {c.fullName} - {c.email}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-xs text-slate-300">Vehículo</label>
              <select
                value={vehiculo}
                onChange={(e) => setVehiculo(e.target.value)}
                className={inputBase}
              >
                <option value="">Seleccionar vehículo</option>
                {vehicles.map((v) => (
                  <option key={v._id} value={v._id}>
                    {v.plate} - {v.brand}
                    {v.status ? ` (${v.status})` : ""}
                  </option>
                ))}
              </select>
            </div>

            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              <div>
                <label className="block text-xs text-slate-300">Fecha inicio</label>
                <input
                  type="date"
                  value={fechaInicio}
                  onChange={(e) => setFechaInicio(e.target.value)}
                  min={todayString}
                  className={inputBase}
                />
              </div>

              <div>
                <label className="block text-xs text-slate-300">Fecha fin</label>
                <input
                  type="date"
                  value={fechaFin}
                  onChange={(e) => setFechaFin(e.target.value)}
                  min={fechaInicio || todayString}
                  className={inputBase}
                />
              </div>
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-white">
                  Evidencia del estado inicial
                </h2>
                <p className="text-xs text-slate-400">
                  Adjunta fotos del vehículo antes de la entrega. Si estás en móvil, puedes abrir la cámara desde aquí.
                </p>
              </div>

              <div>
                <label className="block text-xs text-slate-300">
                  Fotos iniciales (JPG/PNG/WEBP - máx 8MB por archivo)
                </label>
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  capture="environment"
                  multiple
                  onChange={(e) => setInitialPhotos(Array.from(e.target.files ?? []))}
                  className="mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2 text-sm text-white outline-none file:mr-3 file:rounded-lg file:border-0 file:bg-white file:px-3 file:py-2 file:text-slate-950"
                />
                <p className="mt-2 text-xs text-slate-500">
                  Sugerencia: toma frente, laterales, parte trasera, interior y cualquier detalle relevante.
                </p>
              </div>

              {initialPhotos.length > 0 && (
                <div className="rounded-2xl border border-white/10 bg-white/[0.03] p-4">
                  <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-400">
                    Archivos seleccionados
                  </p>
                  <div className="mt-3 space-y-2">
                    {initialPhotos.map((photo, index) => (
                      <div
                        key={`${photo.name}-${index}`}
                        className="flex items-center justify-between rounded-xl border border-white/10 bg-black/20 px-3 py-2 text-sm text-slate-200"
                      >
                        <span className="truncate pr-4">{photo.name}</span>
                        <span className="shrink-0 text-xs text-slate-400">
                          {formatFileSize(photo.size)}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>

            <div className="rounded-2xl border border-white/10 bg-black/10 p-4 space-y-4">
              <div className="space-y-1">
                <h2 className="text-sm font-semibold text-white">
                  Recordatorios opcionales
                </h2>
                <p className="text-xs text-slate-400">
                  Puedes dejar programado el aviso de inicio y/o devolución desde este mismo formulario.
                </p>
              </div>

              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={createStartReminder}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCreateStartReminder(checked);
                    if (checked) {
                      setStartReminderDate((current) => current || fechaInicio);
                      setStartReminderTitle((current) => current || "Inicio de alquiler");
                    }
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-black/20"
                />
                Agregar recordatorio de inicio
              </label>

              {createStartReminder && (
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs text-slate-300">Fecha</label>
                    <input
                      type="date"
                      value={startReminderDate}
                      onChange={(e) => setStartReminderDate(e.target.value)}
                      min={todayString}
                      className={inputBase}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-300">Título</label>
                    <input
                      type="text"
                      value={startReminderTitle}
                      onChange={(e) => setStartReminderTitle(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-300">Detalle</label>
                    <textarea
                      value={startReminderDetail}
                      onChange={(e) => setStartReminderDetail(e.target.value)}
                      rows={2}
                      className={`${inputBase} resize-none`}
                      placeholder="Detalle para el recordatorio de inicio"
                    />
                  </div>
                </div>
              )}

              <label className="flex items-center gap-3 text-sm text-slate-200">
                <input
                  type="checkbox"
                  checked={createReturnReminder}
                  onChange={(e) => {
                    const checked = e.target.checked;
                    setCreateReturnReminder(checked);
                    if (checked) {
                      setReturnReminderDate((current) => current || fechaFin);
                      setReturnReminderTitle((current) => current || "Devolución de alquiler");
                    }
                  }}
                  className="h-4 w-4 rounded border-white/20 bg-black/20"
                />
                Agregar recordatorio de devolución
              </label>

              {createReturnReminder && (
                <div className="grid grid-cols-1 gap-4 rounded-2xl border border-white/10 bg-white/[0.03] p-4 md:grid-cols-3">
                  <div>
                    <label className="block text-xs text-slate-300">Fecha</label>
                    <input
                      type="date"
                      value={returnReminderDate}
                      onChange={(e) => setReturnReminderDate(e.target.value)}
                      min={fechaInicio || todayString}
                      className={inputBase}
                    />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-xs text-slate-300">Título</label>
                    <input
                      type="text"
                      value={returnReminderTitle}
                      onChange={(e) => setReturnReminderTitle(e.target.value)}
                      className={inputBase}
                    />
                  </div>
                  <div className="md:col-span-3">
                    <label className="block text-xs text-slate-300">Detalle</label>
                    <textarea
                      value={returnReminderDetail}
                      onChange={(e) => setReturnReminderDetail(e.target.value)}
                      rows={2}
                      className={`${inputBase} resize-none`}
                      placeholder="Detalle para el recordatorio de devolución"
                    />
                  </div>
                </div>
              )}
            </div>

            <div className="flex flex-wrap gap-2 pt-2">
              <button
                type="submit"
                disabled={loading}
                className="rounded-xl bg-white px-4 py-2.5 text-sm font-semibold text-slate-950 transition hover:opacity-90 disabled:opacity-60"
              >
                {loading ? "Creando..." : "Crear alquiler"}
              </button>

              <button
                type="button"
                onClick={() => navigate("/rentals")}
                className="rounded-xl border border-white/15 bg-white/5 px-4 py-2.5 text-sm font-medium text-white transition hover:bg-white/10"
              >
                Cancelar
              </button>
            </div>
          </form>
        )}
      </section>
    </div>
  );
}
