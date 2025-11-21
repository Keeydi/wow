import { useNavigate, useLocation } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import {
  LayoutDashboard,
  Users,
  Building2,
  Clock,
  FileText,
  Settings,
  LogOut,
  ChevronDown,
  UserCircle,
  Briefcase,
  ListChecks,
  Upload,
  FileCheck,
  Shield,
  Lock,
  Database,
  AlertTriangle
} from 'lucide-react';
import {
  Sidebar,
  SidebarContent,
  SidebarGroup,
  SidebarGroupContent,
  SidebarGroupLabel,
  SidebarMenu,
  SidebarMenuButton,
  SidebarMenuItem,
  SidebarMenuSub,
  SidebarMenuSubItem,
  SidebarMenuSubButton,
  useSidebar,
} from '@/components/ui/sidebar';
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from '@/components/ui/collapsible';
import { cn } from '@/lib/utils';
import { useMemo, useState, useEffect } from 'react';
import logo from '../../../images/logo.png';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';

export function AdminSidebar() {
  const { state } = useSidebar();
  const navigate = useNavigate();
  const location = useLocation();
  const { user, logout } = useAuth();
  const collapsed = state === 'collapsed';

  const [openGroups, setOpenGroups] = useState<Record<string, boolean>>({
    employees: false,
    organization: false,
    attendance: false,
    documents: false,
    settings: false,
    logout: false,
  });
  const [logoutDialogOpen, setLogoutDialogOpen] = useState(false);
  const isAdmin = user?.role === 'admin';

  const toggleGroup = (group: string) => {
    setOpenGroups(prev => ({ ...prev, [group]: !prev[group] }));
  };

  const isActive = (path: string) => location.pathname === path;

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const isPathActive = (paths: string[]) =>
    paths.some((path) => location.pathname.startsWith(path));

  const iconClasses = (isActive?: boolean) =>
    cn(
      "flex items-center justify-center rounded-lg transition-all duration-200 p-2",
      collapsed
        ? "h-10 w-10 mx-auto bg-white/10 text-white"
        : "h-10 w-10 bg-white/10 text-white",
      isActive && "bg-white text-primary"
    );

  const employeesActive = isPathActive(['/employees']);
  const organizationActive = isPathActive(['/organization']);
  const attendanceActive = isPathActive(['/attendance']);
  const documentsActive = isPathActive(['/documents']);
  const settingsActive = isPathActive(['/settings']);

  // Auto-open drawer when path is active
  useEffect(() => {
    setOpenGroups(prev => ({
      ...prev,
      employees: employeesActive,
      organization: organizationActive,
      attendance: attendanceActive,
      documents: documentsActive,
      settings: settingsActive,
    }));
  }, [employeesActive, organizationActive, attendanceActive, documentsActive, settingsActive]);
  const employeeMenuItems = useMemo(
    () => [
      {
        id: 'dashboard',
        label: 'Dashboard',
        icon: LayoutDashboard,
        onClick: () => navigate('/employee/dashboard'),
        active: location.pathname === '/employee/dashboard',
      },
      {
        id: 'attendance',
        label: 'Attendance',
        icon: Clock,
        onClick: () => navigate('/attendance/list'),
        active: location.pathname.startsWith('/attendance'),
      },
      {
        id: 'profile',
        label: 'My Profile',
        icon: UserCircle,
        onClick: () => navigate('/profile'),
        active: location.pathname.startsWith('/profile'),
      },
      {
        id: 'logout',
        label: 'Logout',
        icon: LogOut,
        onClick: () => setLogoutDialogOpen(true),
        active: false,
      },
    ],
    [location.pathname, navigate],
  );

  return (
    <>
      <Sidebar
        collapsible="icon"
        className="border-r border-sidebar-border transition-all duration-300"
      >
        <SidebarContent className="bg-sidebar">
          {/* Header */}
          <div className="py-4 border-b border-sidebar-border">
            <div className="flex items-center justify-center">
              <div
                className={cn(
                  "flex items-center justify-center transition-all duration-300",
                  collapsed ? "h-14 w-14" : "h-20 w-32"
                )}
              >
                <img
                  src={logo}
                  alt="The Great Plebeian College"
                  className="object-contain h-full w-full"
                />
              </div>
            </div>
          </div>

          {isAdmin ? (
            <SidebarGroup className="px-2 py-4">
              <SidebarMenu>
                {/* Dashboard */}
                <SidebarMenuItem>
                  <SidebarMenuButton
                    onClick={() => navigate('/dashboard')}
                    isActive={isActive('/dashboard')}
                    className={cn(
                      "hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
                      isActive('/dashboard') && "bg-sidebar-accent text-sidebar-accent-foreground"
                    )}
                  >
                    <div className={iconClasses(isActive('/dashboard'))}>
                      <LayoutDashboard className={cn("w-5 h-5", isActive('/dashboard') ? "text-primary" : "text-white")} />
                    </div>
                    {!collapsed && <span>Dashboard</span>}
                  </SidebarMenuButton>
                </SidebarMenuItem>

                {/* Employees */}
                <Collapsible open={openGroups.employees} onOpenChange={() => toggleGroup('employees')}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        isActive={employeesActive}
                      >
                        <div className={iconClasses(employeesActive)}>
                          <Users className={cn("w-5 h-5", employeesActive ? "text-primary" : "text-white")} />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Employees</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              openGroups.employees && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/employees')}
                              isActive={isActive('/employees')}
                            >
                              <span>Employees</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/employees/inactive')}
                              isActive={isActive('/employees/inactive')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Inactive Employees</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>

                {/* Organization */}
                <Collapsible open={openGroups.organization} onOpenChange={() => toggleGroup('organization')}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        isActive={organizationActive}
                      >
                        <div className={iconClasses(organizationActive)}>
                          <Building2 className={cn("w-5 h-5", organizationActive ? "text-primary" : "text-white")} />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Organization</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              openGroups.organization && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/organization/department')}
                              isActive={isActive('/organization/department')}
                            >
                              <span>Department</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/organization/designation')}
                              isActive={isActive('/organization/designation')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Designation</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>

                {/* Attendance */}
                <Collapsible open={openGroups.attendance} onOpenChange={() => toggleGroup('attendance')}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        isActive={attendanceActive}
                      >
                        <div className={iconClasses(attendanceActive)}>
                          <Clock className={cn("w-5 h-5", attendanceActive ? "text-primary" : "text-white")} />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Attendance</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              openGroups.attendance && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/attendance/list')}
                              isActive={isActive('/attendance/list')}
                            >
                              <span>Attendance List</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/attendance/add')}
                              isActive={isActive('/attendance/add')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Add Attendance</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/attendance/report')}
                              isActive={isActive('/attendance/report')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Attendance Report</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>

                {/* Documents */}
                <Collapsible open={openGroups.documents} onOpenChange={() => toggleGroup('documents')}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        isActive={documentsActive}
                      >
                        <div className={iconClasses(documentsActive)}>
                          <FileText className={cn("w-5 h-5", documentsActive ? "text-primary" : "text-white")} />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Documents</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              openGroups.documents && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/documents/employee')}
                              isActive={isActive('/documents/employee')}
                            >
                              <span>Upload / Store Documents</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/documents/templates')}
                              isActive={isActive('/documents/templates')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Templates</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>

                {/* Settings */}
                <Collapsible open={openGroups.settings} onOpenChange={() => toggleGroup('settings')}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton
                        className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                        isActive={settingsActive}
                      >
                        <div className={iconClasses(settingsActive)}>
                          <Settings className={cn("w-5 h-5", settingsActive ? "text-primary" : "text-white")} />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Settings</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              openGroups.settings && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/settings')}
                              isActive={isActive('/settings')}
                            >
                              <span>Settings</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/settings/audit-logs')}
                              isActive={isActive('/settings/audit-logs')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Audit Logs</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/settings/data-privacy')}
                              isActive={isActive('/settings/data-privacy')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Data Privacy</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/settings/data-integrity')}
                              isActive={isActive('/settings/data-integrity')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Data Integrity</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/settings/non-repudiation')}
                              isActive={isActive('/settings/non-repudiation')}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Non-Repudiation</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>

                {/* Logout */}
                <Collapsible open={openGroups.logout} onOpenChange={() => toggleGroup('logout')}>
                  <SidebarMenuItem>
                    <CollapsibleTrigger asChild>
                      <SidebarMenuButton className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground">
                        <div className={iconClasses()}>
                          <LogOut className="w-5 h-5 text-white" />
                        </div>
                        {!collapsed && (
                          <>
                            <span className="flex-1 text-left">Logout</span>
                            <ChevronDown className={cn(
                              "w-4 h-4 transition-transform",
                              openGroups.logout && "rotate-180"
                            )} />
                          </>
                        )}
                      </SidebarMenuButton>
                    </CollapsibleTrigger>
                    {!collapsed && (
                      <CollapsibleContent>
                        <SidebarMenuSub>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => navigate('/profile')}
                              isActive={isActive('/profile')}
                            >
                              <span>My Profile</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                          <SidebarMenuSubItem>
                            <SidebarMenuSubButton
                              onClick={() => setLogoutDialogOpen(true)}
                              className="text-sidebar-foreground/50"
                            >
                              <span>Logout</span>
                            </SidebarMenuSubButton>
                          </SidebarMenuSubItem>
                        </SidebarMenuSub>
                      </CollapsibleContent>
                    )}
                  </SidebarMenuItem>
                </Collapsible>
              </SidebarMenu>
            </SidebarGroup>
          ) : (
            <SidebarGroup className="px-2 py-4">
              <SidebarMenu>
                {employeeMenuItems.map((item) => (
                  <SidebarMenuItem key={item.id}>
                    <SidebarMenuButton
                      onClick={item.onClick}
                      isActive={item.active}
                      className="hover:bg-sidebar-accent hover:text-sidebar-accent-foreground"
                    >
                      <div className={iconClasses(item.active)}>
                        <item.icon className={cn("w-5 h-5", item.active ? "text-primary" : "text-white")} />
                      </div>
                      {!collapsed && <span>{item.label}</span>}
                    </SidebarMenuButton>
                  </SidebarMenuItem>
                ))}
              </SidebarMenu>
            </SidebarGroup>
          )}
        </SidebarContent>
      </Sidebar>

      <AlertDialog open={logoutDialogOpen} onOpenChange={setLogoutDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Sign out of HR Hub?</AlertDialogTitle>
            <AlertDialogDescription>
              You’ll need to sign in again to access your dashboard. Any unsaved progress may be lost.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction onClick={handleLogout}>Log out</AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
