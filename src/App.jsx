import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';
import Layout from './components/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import Leads from './pages/Leads';
import Pipeline from './pages/Pipeline';
import Tasks from './pages/Tasks';
import Notifications from './pages/Notifications';
import Users from './pages/Users';
import CNP from './pages/CNP';
import Verification from './pages/Verification';
import ReadyToShipment from './pages/ReadyToShipment';
import Shiprocket from './pages/Shiprocket';
import ShiprocketOrders from './pages/ShiprocketOrders';
import ShiprocketShipments from './pages/ShiprocketShipments';
import ShiprocketReturns from './pages/ShiprocketReturns';
import FollowUp from './pages/FollowUp';

export default function App() {
  return (
    <AuthProvider>
      <BrowserRouter>
        <Routes>
          <Route path="/login" element={<Login />} />
          <Route path="/" element={<ProtectedRoute><Layout /></ProtectedRoute>}>
            <Route index element={<Navigate to="/dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="leads" element={<Leads />} />
            <Route path="pipeline" element={<Pipeline />} />
            <Route path="cnp" element={<CNP />} />
            <Route path="tasks" element={<Tasks />} />
            <Route path="follow-up" element={<FollowUp />} />
            <Route path="verification" element={<Verification />} />
            <Route path="ready-to-shipment" element={<ReadyToShipment />} />
            <Route path="shiprocket" element={<Shiprocket />} />
            <Route path="shiprocket/orders" element={<ShiprocketOrders />} />
            <Route path="shiprocket/shipments" element={<ShiprocketShipments />} />
            <Route path="shiprocket/returns" element={<ShiprocketReturns />} />
            <Route path="notifications" element={<Notifications />} />
            <Route path="users" element={
              <ProtectedRoute roles={['admin', 'manager']}>
                <Users />
              </ProtectedRoute>
            } />
          </Route>
          <Route path="*" element={<Navigate to="/dashboard" replace />} />
        </Routes>
      </BrowserRouter>
    </AuthProvider>
  );
}
