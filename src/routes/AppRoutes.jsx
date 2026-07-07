import { lazy, Suspense } from 'react';
import { Routes, Route, Navigate } from 'react-router-dom';
import { useSelector } from 'react-redux';
import AppLayout from '../layouts/AppLayout';
import ProtectedRoute from '../components/layout/ProtectedRoute';
import PageLoader from '../components/ui/PageLoader';
import { selectIsAuthenticated } from '../store/slices/authSlice';

const Login          = lazy(() => import('../pages/auth/Login'));
const ForgotPassword = lazy(() => import('../pages/auth/ForgotPassword'));
const ResetPassword  = lazy(() => import('../pages/auth/ResetPassword'));

const Dashboard      = lazy(() => import('../pages/Dashboard'));
const HomeInfo       = lazy(() => import('../pages/HomeInfo'));
const AreasPage      = lazy(() => import('../pages/Areas'));
const AreaDetail     = lazy(() => import('../pages/Areas/AreaDetail'));
const AssetsPage     = lazy(() => import('../pages/Assets'));
const AssetDetail    = lazy(() => import('../pages/Assets/AssetDetail'));
const CarsPage       = lazy(() => import('../pages/Cars'));
const CarDetail      = lazy(() => import('../pages/Cars/CarDetail'));
const CompaniesPage  = lazy(() => import('../pages/Companies'));
const CompanyDetail  = lazy(() => import('../pages/Companies/CompanyDetail'));
const ContractsPage  = lazy(() => import('../pages/Contracts'));
const ContractDetail = lazy(() => import('../pages/Contracts/ContractDetail'));
const MaintenancePage  = lazy(() => import('../pages/Maintenance'));
const HistoryPage      = lazy(() => import('../pages/History'));
const WarrantiesPage   = lazy(() => import('../pages/Warranties'));
const ExpensesPage     = lazy(() => import('../pages/Expenses'));
const WalletPage       = lazy(() => import('../pages/Wallet'));
const WalletDetail     = lazy(() => import('../pages/Wallet/WalletDetail'));
const EmployeesPage    = lazy(() => import('../pages/Employees'));
const EmployeeDetail   = lazy(() => import('../pages/Employees/EmployeeDetail'));
const OwnersPage       = lazy(() => import('../pages/Owners'));
const OwnerDetail      = lazy(() => import('../pages/Owners/OwnerDetail'));
const DocumentsPage    = lazy(() => import('../pages/Documents'));
const CalendarPage     = lazy(() => import('../pages/CalendarPage'));
const NotificationsPage = lazy(() => import('../pages/Notifications'));
const EmergencyPage    = lazy(() => import('../pages/Emergency'));
const SettingsPage     = lazy(() => import('../pages/Settings'));

function PublicRoute({ children }) {
  const isAuth = useSelector(selectIsAuthenticated);
  return isAuth ? <Navigate to="/" replace /> : children;
}

export default function AppRoutes() {
  return (
    <Suspense fallback={<PageLoader />}>
      <Routes>
        {/* ── Public / Auth ── */}
        <Route path="/login"           element={<PublicRoute><Login /></PublicRoute>} />
        <Route path="/forgot-password" element={<PublicRoute><ForgotPassword /></PublicRoute>} />
        <Route path="/reset-password"  element={<PublicRoute><ResetPassword /></PublicRoute>} />

        {/* ── Protected App ── */}
        <Route element={<ProtectedRoute />}>
          <Route element={<AppLayout />}>
            <Route index element={<Dashboard />} />

            {/* Property */}
            <Route path="home-info"  element={<HomeInfo />}    />
            <Route path="areas"      element={<AreasPage />}   />
            <Route path="areas/:id"  element={<AreaDetail />}  />
            <Route path="assets"     element={<AssetsPage />}  />
            <Route path="assets/:id" element={<AssetDetail />} />
            <Route path="cars"       element={<CarsPage />}    />
            <Route path="cars/:id"   element={<CarDetail />}   />

            {/* Operations */}
            <Route path="companies"     element={<CompaniesPage />}  />
            <Route path="companies/:id" element={<CompanyDetail />}  />
            <Route path="contracts"     element={<ContractsPage />}  />
            <Route path="contracts/:id" element={<ContractDetail />} />
            <Route path="maintenance"   element={<MaintenancePage />} />
            <Route path="repairs"       element={<Navigate to="/maintenance" replace />} />

            {/* Records */}
            <Route path="history"    element={<HistoryPage />}    />
            <Route path="warranties" element={<WarrantiesPage />} />
            <Route path="wallet"            element={<WalletPage />}    />
            <Route path="wallet/:walletType" element={<WalletDetail />} />
            <Route path="employees"           element={<EmployeesPage />}  />
            <Route path="employees/:id"      element={<EmployeeDetail />} />
            <Route path="owners"             element={<OwnersPage />}     />
            <Route path="owners/:id"         element={<OwnerDetail />}    />
            <Route path="expenses"   element={<ExpensesPage />}   />
            <Route path="documents"  element={<DocumentsPage />}  />
            <Route path="calendar"   element={<CalendarPage />}   />

            {/* System */}
            <Route path="notifications" element={<NotificationsPage />} />
            <Route path="emergency"     element={<EmergencyPage />}     />
            <Route path="settings"      element={<SettingsPage />}      />
          </Route>
        </Route>

        <Route path="*" element={<Navigate to="/" replace />} />
      </Routes>
    </Suspense>
  );
}
