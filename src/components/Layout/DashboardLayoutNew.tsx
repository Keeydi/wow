import { ReactNode } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { SidebarProvider, SidebarTrigger } from '@/components/ui/sidebar';
import { AdminSidebar } from './AdminSidebar';

interface DashboardLayoutNewProps {
  children: ReactNode;
}

const DashboardLayoutNew = ({ children }: DashboardLayoutNewProps) => {
  const { user } = useAuth();

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-background">
        <AdminSidebar />
        
        <div className="flex-1 flex flex-col overflow-hidden">
          {/* Header */}
          <header className="sticky top-0 z-10 bg-card border-b border-border px-6 py-4 flex items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <SidebarTrigger className="hover:bg-accent" />
              <div>
                <h2 className="text-lg font-semibold text-foreground">{user?.fullName}</h2>
                <p className="text-sm text-muted-foreground capitalize">{user?.role}</p>
              </div>
            </div>
          </header>

          {/* Content */}
          <main className="flex-1 overflow-y-auto p-6">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
};

export default DashboardLayoutNew;
