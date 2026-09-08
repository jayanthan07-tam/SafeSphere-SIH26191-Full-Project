import { Navigate, Route, Routes } from 'react-router-dom';
import { ProtectedRoute } from './components/ProtectedRoute';
import { RoleProtectedRoute } from './components/RoleProtectedRoute';
import { AppLayout } from './components/AppLayout';
import { getRoleLandingPath, useAuth } from './context/AuthContext';

// Auth Pages
import Login from './pages/Login';
import Register from './pages/Register';
import EmergencyLoginless from './pages/EmergencyLoginless';
import NotFound from './pages/NotFound';

// Role Dashboards
import AdminDashboard from './pages/admin/AdminDashboard';
import UserManagement from './pages/admin/UserManagement';
import AuthorityDashboard from './pages/authority/AuthorityDashboard';
import DistrictDashboard from './pages/district/DistrictDashboard';
import FieldDashboard from './pages/field/FieldDashboard';
import CitizenHome from './pages/CitizenHome';
import CitizenFamilyPortal from './pages/citizen/CitizenFamilyPortal';
import FamilyMemberHome from './pages/family/FamilyMemberHome';

// Analytical, GIS & Decision Support Modules (Preserved)
import Dashboard from './pages/Dashboard';
import RiskMap from './pages/RiskMap';
import FutureRisk from './pages/FutureRisk';
import FutureRedZones from './pages/FutureRedZones';
import HabitationAnalysis from './pages/HabitationAnalysis';
import RelocationPriority from './pages/RelocationPriority';
import CarryingCapacity from './pages/CarryingCapacity';
import RelocationOptimizer from './pages/RelocationOptimizer';
import ScenarioSimulator from './pages/ScenarioSimulator';
import DigitalTwin from './pages/DigitalTwin';
import Infrastructure from './pages/Infrastructure';
import Evacuation from './pages/Evacuation';
import RelocationCost from './pages/RelocationCost';
import CostOfInaction from './pages/CostOfInaction';
import ExplainableAI from './pages/ExplainableAI';
import CitizenReports from './pages/CitizenReports';
import SatelliteAnalysis from './pages/SatelliteAnalysis';
import AIAssistant from './pages/AIAssistant';
import Reports from './pages/Reports';
import SOS from './pages/SOS';
import FamilySafety from './pages/FamilySafety';
import Alerts from './pages/Alerts';
import Settings from './pages/Settings';

function HomeRedirect() {
  const { user } = useAuth();
  if (!user) return <Navigate to="/login" replace />;
  return <Navigate to={getRoleLandingPath(user.role)} replace />;
}

export default function App() {
  return (
    <Routes>
      {/* Public Unauthenticated Routes */}
      <Route path="/login" element={<Login />} />
      <Route path="/register" element={<Register />} />
      <Route path="/emergency-loginless" element={<EmergencyLoginless />} />

      {/* Protected Application Routes */}
      <Route
        element={
          <ProtectedRoute>
            <AppLayout />
          </ProtectedRoute>
        }
      >
        <Route index element={<HomeRedirect />} />

        {/* Administrator Routes */}
        <Route
          path="admin/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['administrator']}>
              <AdminDashboard />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="admin/users"
          element={
            <RoleProtectedRoute allowedRoles={['administrator']}>
              <UserManagement />
            </RoleProtectedRoute>
          }
        />

        {/* Disaster Management Authority Routes */}
        <Route
          path="authority/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['authority', 'administrator']}>
              <AuthorityDashboard />
            </RoleProtectedRoute>
          }
        />

        {/* District Officer Routes */}
        <Route
          path="district/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['district_officer', 'administrator']}>
              <DistrictDashboard />
            </RoleProtectedRoute>
          }
        />

        {/* Field Officer Routes */}
        <Route
          path="field/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['field_officer', 'administrator']}>
              <FieldDashboard />
            </RoleProtectedRoute>
          }
        />

        {/* Citizen Routes */}
        <Route
          path="citizen/home"
          element={
            <RoleProtectedRoute allowedRoles={['citizen', 'administrator']}>
              <CitizenHome />
            </RoleProtectedRoute>
          }
        />
        <Route path="citizen-home" element={<Navigate to="/citizen/home" replace />} />

        <Route
          path="citizen/family"
          element={
            <RoleProtectedRoute allowedRoles={['citizen', 'administrator']}>
              <CitizenFamilyPortal />
            </RoleProtectedRoute>
          }
        />

        {/* Family Member Routes */}
        <Route
          path="family/dashboard"
          element={
            <RoleProtectedRoute allowedRoles={['family_member', 'admin', 'administrator']}>
              <FamilyMemberHome />
            </RoleProtectedRoute>
          }
        />
        <Route
          path="family/home"
          element={
            <RoleProtectedRoute allowedRoles={['family_member', 'admin', 'administrator']}>
              <FamilyMemberHome />
            </RoleProtectedRoute>
          }
        />
        <Route path="family-portal" element={<Navigate to="/family/dashboard" replace />} />

        {/* Shared & Decision Support Modules (Preserved) */}
        <Route path="dashboard" element={<Dashboard />} />
        <Route path="risk-map" element={<RiskMap />} />
        <Route path="future-risk" element={<FutureRisk />} />
        <Route path="future-red-zones" element={<FutureRedZones />} />
        <Route path="habitation-analysis" element={<HabitationAnalysis />} />
        <Route path="relocation-priority" element={<RelocationPriority />} />
        <Route path="carrying-capacity" element={<CarryingCapacity />} />
        <Route path="relocation-optimizer" element={<RelocationOptimizer />} />
        <Route path="scenario-simulator" element={<ScenarioSimulator />} />
        <Route path="digital-twin" element={<DigitalTwin />} />
        <Route path="infrastructure" element={<Infrastructure />} />
        <Route path="evacuation" element={<Evacuation />} />
        <Route path="relocation-cost" element={<RelocationCost />} />
        <Route path="cost-of-inaction" element={<CostOfInaction />} />
        <Route path="explainable-ai" element={<ExplainableAI />} />
        <Route path="citizen-reports" element={<CitizenReports />} />
        <Route path="satellite-analysis" element={<SatelliteAnalysis />} />
        <Route path="ai-assistant" element={<AIAssistant />} />
        <Route path="reports" element={<Reports />} />
        <Route path="sos" element={<SOS />} />
        <Route path="family" element={<FamilySafety />} />
        <Route path="alerts" element={<Alerts />} />
        <Route path="settings" element={<Settings />} />
      </Route>

      {/* Catch-all Not Found */}
      <Route path="*" element={<NotFound />} />
    </Routes>
  );
}
