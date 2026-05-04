import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider, useAuth } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import StaffDashboard from './pages/StaffDashboard';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import Tasks from './pages/Tasks';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import CNP from './pages/CNP';
import Verification from './pages/Verification';
import ReadyToShipment from './pages/ReadyToShipment';
import Shiprocket from './pages/Shiprocket';
import NdrDetail from './pages/NdrDetail';
import FollowUp from './pages/FollowUp';
import CallAgain from './pages/CallAgain';
import Attendance from './pages/Attendance';
import OrderDetail from './pages/OrderDetail';

function AppRoutes() {
  const { user } = useAuth();
  return (
    <Routes>
      <Route path="/login" element={<Login />} />
      <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
        <Route index element={<Navigate to="/dashboard" replace />} />
        <Route path="dashboard" element={
          user?.role === 'sales'
            ? <StaffDashboard />
            : <ProtectedRoute roles={['admin', 'manager']}><Dashboard /></ProtectedRoute>
        } />
        <Route path="leads" element={<Leads />} />
        <Route path="pipeline" element={<Pipeline />} />
        <Route path="cnp" element={<CNP />} />
        <Route path="call-again" element={<CallAgain />} />
        <Route path="tasks" element={<Tasks />} />
        <Route path="attendance" element={<Attendance />} />
        <Route path="follow-up" element={<FollowUp />} />
        <Route path="verification" element={<Verification />} />
        <Route path="ready-to-shipment" element={<ReadyToShipment />} />
        <Route path="shiprocket" element={<Shiprocket />} />
        <Route path="shiprocket/orders" element={<Shiprocket initialSection="orders" />} />
        <Route path="shiprocket/shipments" element={<Shiprocket initialSection="shipments" />} />
        <Route path="shiprocket/returns" element={<Shiprocket initialSection="returns" initialReturnsTab="returns" />} />
        <Route path="shiprocket/ndr" element={<Shiprocket initialSection="returns" initialReturnsTab="ndr" />} />
        <Route path="shiprocket/ndr/detail" element={<NdrDetail />} />
        <Route path="orders/:id" element={<OrderDetail />} />
        <Route path="notifications" element={<Notifications />} />
        <Route path="users" element={
          <ProtectedRoute roles={['admin', 'manager']}>
            <Users />
          </ProtectedRoute>
        } />
      </Route>
      <Route path="*" element={<Navigate to="/dashboard" replace />} />
    </Routes>
  );
}

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <AppRoutes />
      </BrowserRouter>
    </AuthProvider>
  );
}
