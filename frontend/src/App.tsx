import { Routes, Route, Navigate } from "react-router-dom";
import LoginPage from "./pages/LoginPage";
import DashboardPage from "./pages/DashboardPage";

import VehiclesCreatePage from "./pages/VehiclesCreatePage";
import VehiclesEditPage from "./pages/VehiclesEditPage";
import VehiclesDocumentsPage from "./pages/VehiclesDocumentsPage";

import ClientsPage from "./pages/ClientsPage";
import ClientsCreatePage from "./pages/ClientsCreatePage";
import VehiclesPage from "./pages/VehiclesPage";

import RentalsCreatePage from "./pages/RentalsCreatePage";
import RentalsPage from "./pages/RentalsPage";
import RentalsHistoryPage from "./pages/RentalsHistoryPage";

// ↓ NUEVAS páginas de mantenimientos
import MaintenanceCreatePage from "./pages/MaintenanceCreatePage";
import MaintenanceHistoryPage from "./pages/MaintenanceHistoryPage";
import MaintenanceDetailPage from "./pages/MaintenanceDetailPage";
import NotificationsPage from "./pages/NotificationsPage";
import RemindersPage from "./pages/RemindersPage";
import ReminderCreatePage from "./pages/ReminderCreatePage";
import AgendaPage from "./pages/AgendaPage";

import { RequireAuth } from "./auth/RequireAuth";
import AdminLayout from "./layout/AdminLayout";

export default function App() {
  return (
    <Routes>
      {/* Public */}
      <Route path="/login" element={<LoginPage />} />

      {/* Protected area */}
      <Route
        element={
          <RequireAuth>
            <AdminLayout />
          </RequireAuth>
        }
      >
        <Route path="/" element={<DashboardPage />} />

        {/* Vehicles */}
        <Route path="/vehicles/new" element={<VehiclesCreatePage />} />
        <Route path="/vehicles/:id/edit" element={<VehiclesEditPage />} />
        <Route path="/vehicles/:id/documents" element={<VehiclesDocumentsPage />} />

        {/* Clients */}
        <Route path="/vehicles" element={<VehiclesPage />} />
        <Route path="/clients" element={<ClientsPage />} />
        <Route path="/clients/new" element={<ClientsCreatePage />} />

        {/* Rentals */}
        <Route path="/rentals" element={<RentalsPage />} />
        <Route path="/rentals/new" element={<RentalsCreatePage />} />
        <Route path="/vehicles/:id/rentals" element={<RentalsHistoryPage />} />
        <Route path="/agenda" element={<AgendaPage />} />
        <Route path="/notifications" element={<NotificationsPage />} />

        {/* ↓ Mantenimientos */}
        <Route path="/vehicles/:id/maintenances" element={<MaintenanceHistoryPage />} />
        <Route path="/vehicles/:id/maintenances/new" element={<MaintenanceCreatePage />} />
        <Route path="/maintenances/:id" element={<MaintenanceDetailPage />} />
        <Route path="/vehicles/:id/reminders" element={<RemindersPage />} />
        <Route path="/vehicles/:id/reminders/new" element={<ReminderCreatePage />} />
      </Route>

      {/* Fallback */}
      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  );
}
