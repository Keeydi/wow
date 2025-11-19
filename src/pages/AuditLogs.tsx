import { useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Card } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Search, Download, Filter } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

interface AuditLog {
  id: string;
  timestamp: string;
  user: string;
  action: string;
  resource: string;
  status: 'success' | 'failed' | 'warning';
  ipAddress?: string;
  details: string;
}

const AuditLogs = () => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filterAction, setFilterAction] = useState('all');
  const [filterStatus, setFilterStatus] = useState('all');
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const { toast } = useToast();

  // Fetch audit logs from API
  useEffect(() => {
    const fetchAuditLogs = async () => {
      try {
        setIsLoading(true);
        const params = new URLSearchParams();
        if (filterAction !== 'all') {
          params.append('actionType', filterAction);
        }
        if (filterStatus !== 'all') {
          params.append('status', filterStatus);
        }
        params.append('limit', '100');

        const response = await fetch(`${API_BASE_URL}/activity-logs?${params.toString()}`);
        if (!response.ok) {
          throw new Error('Failed to fetch audit logs');
        }
        const data = await response.json();
        
        const logs: AuditLog[] = data.data.map((log: any) => ({
          id: log.id,
          timestamp: log.createdAt,
          user: log.userName,
          action: log.actionType,
          resource: log.resourceType,
          status: log.status,
          ipAddress: log.ipAddress || undefined,
          details: log.description || `${log.actionType} ${log.resourceType}`,
        }));
        
        setAuditLogs(logs);
      } catch (error) {
        console.error('Error fetching audit logs', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchAuditLogs();
  }, [filterAction, filterStatus]);

  const filteredLogs = auditLogs.filter((log) => {
    const matchesSearch = 
      log.user.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.action.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.resource.toLowerCase().includes(searchTerm.toLowerCase()) ||
      log.details.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesAction = filterAction === 'all' || log.action === filterAction;
    const matchesStatus = filterStatus === 'all' || log.status === filterStatus;
    return matchesSearch && matchesAction && matchesStatus;
  });

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'success': return 'bg-green-500';
      case 'failed': return 'bg-red-500';
      case 'warning': return 'bg-yellow-500';
      default: return 'bg-gray-500';
    }
  };

  const handleExport = () => {
    try {
      // Check if there are logs to export
      if (filteredLogs.length === 0) {
        toast({
          variant: 'destructive',
          title: 'No Logs to Export',
          description: 'There are no audit logs to export with the current filters.',
        });
        return;
      }

      // Prepare CSV headers
      const headers = ['Timestamp', 'User', 'Action', 'Resource', 'Status', 'IP Address', 'Details'];
      
      // Convert logs to CSV rows
      const csvRows = [
        headers.join(','),
        ...filteredLogs.map((log) => {
          const row = [
            new Date(log.timestamp).toLocaleString(),
            `"${log.user}"`,
            `"${log.action}"`,
            `"${log.resource}"`,
            `"${log.status}"`,
            `"${log.ipAddress || 'N/A'}"`,
            `"${log.details.replace(/"/g, '""')}"`, // Escape quotes in details
          ];
          return row.join(',');
        }),
      ];
      
      // Create CSV content
      const csvContent = csvRows.join('\n');
      
      // Create blob and download
      const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
      const link = document.createElement('a');
      const url = URL.createObjectURL(blob);
      
      // Generate filename with current date
      const now = new Date();
      const dateStr = now.toISOString().split('T')[0];
      const timeStr = now.toTimeString().split(' ')[0].replace(/:/g, '-');
      const filename = `audit_logs_${dateStr}_${timeStr}.csv`;
      
      link.setAttribute('href', url);
      link.setAttribute('download', filename);
      link.style.visibility = 'hidden';
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      
      // Clean up
      URL.revokeObjectURL(url);
      
      // Show success toast
      toast({
        title: 'Export Successful',
        description: `Audit logs exported successfully. ${filteredLogs.length} log(s) exported.`,
      });
    } catch (error) {
      console.error('Error exporting audit logs', error);
      toast({
        variant: 'destructive',
        title: 'Export Failed',
        description: 'Failed to export audit logs. Please try again.',
      });
    }
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h1 className="text-3xl font-bold">Audit Logs</h1>
          <Button onClick={handleExport} className="gap-2">
            <Download className="h-4 w-4" />
            Export Logs
          </Button>
        </div>

        <Card className="p-6">
          <div className="flex flex-col md:flex-row gap-4 mb-6">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search logs..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-9"
              />
            </div>

            <div className="flex gap-3">
              <Select value={filterAction} onValueChange={setFilterAction}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Action" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Actions</SelectItem>
                  <SelectItem value="LOGIN">Login</SelectItem>
                  <SelectItem value="CREATE">Create</SelectItem>
                  <SelectItem value="UPDATE">Update</SelectItem>
                  <SelectItem value="DELETE">Delete</SelectItem>
                </SelectContent>
              </Select>

              <Select value={filterStatus} onValueChange={setFilterStatus}>
                <SelectTrigger className="w-40">
                  <SelectValue placeholder="Status" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="all">All Status</SelectItem>
                  <SelectItem value="success">Success</SelectItem>
                  <SelectItem value="failed">Failed</SelectItem>
                  <SelectItem value="warning">Warning</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="overflow-x-auto">
            {isLoading ? (
              <div className="text-center py-8 text-muted-foreground">Loading audit logs...</div>
            ) : (
              <table className="w-full">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                    <th className="text-left py-3 px-4 font-medium">User</th>
                    <th className="text-left py-3 px-4 font-medium">Action</th>
                    <th className="text-left py-3 px-4 font-medium">Resource</th>
                    <th className="text-left py-3 px-4 font-medium">Status</th>
                    <th className="text-left py-3 px-4 font-medium">IP Address</th>
                    <th className="text-left py-3 px-4 font-medium">Details</th>
                  </tr>
                </thead>
                <tbody>
                  {filteredLogs.length === 0 ? (
                    <tr>
                      <td colSpan={7} className="text-center py-8 text-muted-foreground">
                        No audit logs found
                      </td>
                    </tr>
                  ) : (
                    filteredLogs.map((log) => (
                      <tr key={log.id} className="border-b hover:bg-muted/50">
                        <td className="py-3 px-4 text-sm">
                          {new Date(log.timestamp).toLocaleString()}
                        </td>
                        <td className="py-3 px-4 font-medium">{log.user}</td>
                        <td className="py-3 px-4">
                          <Badge variant="outline">{log.action}</Badge>
                        </td>
                        <td className="py-3 px-4">{log.resource}</td>
                        <td className="py-3 px-4">
                          <Badge className={getStatusColor(log.status)}>
                            {log.status}
                          </Badge>
                        </td>
                        <td className="py-3 px-4 text-sm text-muted-foreground">
                          {log.ipAddress || 'N/A'}
                        </td>
                        <td className="py-3 px-4 text-sm">{log.details}</td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            )}
          </div>

          <div className="mt-4 text-sm text-muted-foreground">
            Showing {filteredLogs.length} of {auditLogs.length} logs
          </div>
        </Card>
      </div>
    </DashboardLayoutNew>
  );
};

export default AuditLogs;
