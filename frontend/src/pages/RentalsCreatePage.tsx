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

  const [loadingInit, setLoadingInit] = useState(true);
  const [loading, setLoading] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [successMsg, setSuccessMsg] = useState<string | null>(null);

  const inputBase =
    "mt-1 w-full rounded-xl border border-white/15 bg-black/20 px-3 py-2.5 text-sm text-white placeholder:text-slate-500 outline-none focus:border-white/25";

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

      // clients: puede venir { clients: [] }
      setClients(Array.isArray(clientsData?.clients) ? clientsData.clients : []);

      // vehicles: puede venir array directo o { vehicles: [] }
      const vList = Array.isArray(vehiclesData) ? vehiclesData : (vehiclesData?.vehicles ?? []);
      setVehicles(Array.isArray(vList) ? vList : []);
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

      setSuccessMsg(data?.message ?? "Alquiler creado con éxito");
      // manda a la lista
      navigate("/rentals");
    } catch (err) {
      setError((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="space-y-4">
      {/* Header */}
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

      {/* Alerts */}
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

      {/* Card */}
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
