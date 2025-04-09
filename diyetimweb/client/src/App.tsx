import { BrowserRouter, Routes, Route } from 'react-router-dom';
import { Toaster } from 'react-hot-toast';
import { QueryClientProvider } from "@tanstack/react-query";
import { queryClient } from "./lib/queryClient";
import { AuthProvider } from './hooks/useAuth';

// Pages
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import NotFound from './pages/not-found';
import Clients from "@/pages/Clients";
import DietPlans from "@/pages/DietPlans";
import Appointments from "@/pages/Appointments";
import Measurements from "@/pages/Measurements";
import Settings from "@/pages/Settings";
import TelegramBot from "@/pages/TelegramBot";
import Activities from "@/pages/Activities";

// Components
import ProtectedRoute from './components/ProtectedRoute';
import { AppLayout } from "@/components/layout/AppLayout";

function App() {
  return (
    <QueryClientProvider client={queryClient}>
      <AuthProvider>
        <BrowserRouter>
          <Routes>
            <Route path="/login" element={<Login />} />
            <Route path="/register" element={<Register />} />
            
            {/* Protected routes with AppLayout */}
            <Route 
              path="/" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/dashboard" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Dashboard />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/clients/*" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Clients />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/diet-plans/*" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <DietPlans />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/appointments/*" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Appointments />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/measurements/*" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Measurements />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/activities/*" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Activities />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/settings/*" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <Settings />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route 
              path="/telegram-bot/*" 
              element={
                <ProtectedRoute>
                  <AppLayout>
                    <TelegramBot />
                  </AppLayout>
                </ProtectedRoute>
              } 
            />
            
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
        
        <Toaster
          position="top-right"
          toastOptions={{
            duration: 4000,
            style: {
              background: '#fff',
              color: '#333',
            },
            success: {
              style: {
                background: '#DFF2BF',
                color: '#4F8A10',
                border: '1px solid #4F8A10',
              },
            },
            error: {
              style: {
                background: '#FFBABA',
                color: '#D8000C',
                border: '1px solid #D8000C',
              },
            },
          }}
        />
      </AuthProvider>
    </QueryClientProvider>
  );
}

export default App;
