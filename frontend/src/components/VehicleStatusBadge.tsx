type VehicleStatusBadgeProps = {
  status?: string;
};

function getStatusLabel(status?: string) {
  const normalized = (status ?? "").toUpperCase();

  if (normalized === "AVAILABLE" || normalized === "DISPONIBLE") {
    return "DISPONIBLE";
  }

  if (normalized === "RENTED" || normalized === "ALQUILADO") {
    return "ALQUILADO";
  }

  if (normalized === "MAINTENANCE" || normalized === "MANTENIMIENTO") {
    return "MANTENIMIENTO";
  }

  return status ?? "—";
}

function getStatusClasses(status?: string) {
  const normalized = (status ?? "").toUpperCase();

  if (normalized === "AVAILABLE" || normalized === "DISPONIBLE") {
    return "bg-emerald-500/10 text-emerald-200 ring-emerald-500/25";
  }

  if (normalized === "RENTED" || normalized === "ALQUILADO") {
    return "bg-amber-500/10 text-amber-200 ring-amber-500/25";
  }

  if (normalized === "MAINTENANCE" || normalized === "MANTENIMIENTO") {
    return "bg-rose-500/10 text-rose-200 ring-rose-500/25";
  }

  return "bg-white/10 text-slate-200 ring-white/15";
}

export default function VehicleStatusBadge({
  status,
}: VehicleStatusBadgeProps) {
  return (
    <span
      className={`inline-flex items-center rounded-full px-2.5 py-1 text-xs font-medium ring-1 ${getStatusClasses(
        status,
      )}`}
    >
      {getStatusLabel(status)}
    </span>
  );
}
