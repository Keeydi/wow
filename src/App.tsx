import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, Navigate } from "react-router-dom";
import { AuthProvider } from "./contexts/AuthContext";
import ProtectedRoute from "./components/ProtectedRoute";
import Login from "./pages/Login";
import ForgotPassword from "./pages/ForgotPassword";
import ResetPassword from "./pages/ResetPassword";
import Dashboard from "./pages/Dashboard";
import EmployeeDashboard from "./pages/EmployeeDashboard";
import Employees from "./pages/Employees";
import InactiveEmployees from "./pages/InactiveEmployees";
import DepartmentPage from "./pages/Department";
import DesignationPage from "./pages/Designation";
import AttendanceList from "./pages/AttendanceList";
import AddAttendance from "./pages/AddAttendance";
import AttendanceReport from "./pages/AttendanceReport";
import Documents from "./pages/Documents";
import EmployeeDocuments from "./pages/EmployeeDocuments";
import Templates from "./pages/Templates";
import Settings from "./pages/Settings";
import AuditLogs from "./pages/AuditLogs";
import DataPrivacy from "./pages/DataPrivacy";
import DataIntegrity from "./pages/DataIntegrity";
import NonRepudiation from "./pages/NonRepudiation";
import Profile from "./pages/Profile";
import NotFound from "./pages/NotFound";
import Index from "./pages/Index";

const queryClient = new QueryClient();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster />
        <Sonner />
        <BrowserRouter>
          <Routes>
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <Index />
                </ProtectedRoute>
              } 
            />
            <Route path="/login" element={<Login />} />
            <Route path="/forgot-password" element={<ForgotPassword />} />
            <Route path="/reset-password" element={<ResetPassword />} />
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Dashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employee/dashboard" 
              element={
                <ProtectedRoute allowedRoles={['employee']}>
                  <EmployeeDashboard />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employees" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Employees />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/employees/inactive" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <InactiveEmployees />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/organization/department" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DepartmentPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/organization/designation" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DesignationPage />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance/list" 
              element={
                <ProtectedRoute>
                  <AttendanceList />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance/add" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AddAttendance />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/attendance/report" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AttendanceReport />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Documents />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents/employee" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <EmployeeDocuments />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/documents/templates" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Templates />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <Settings />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/audit-logs" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <AuditLogs />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/data-privacy" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DataPrivacy />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/data-integrity" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <DataIntegrity />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/settings/non-repudiation" 
              element={
                <ProtectedRoute allowedRoles={['admin']}>
                  <NonRepudiation />
                </ProtectedRoute>
              } 
            />
            <Route 
              path="/profile" 
              element={
                <ProtectedRoute>
                  <Profile />
                </ProtectedRoute>
              } 
            />
            {/* ADD ALL CUSTOM ROUTES ABOVE THE CATCH-ALL "*" ROUTE */}
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
