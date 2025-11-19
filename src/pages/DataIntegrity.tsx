import { useState } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Progress } from '@/components/ui/progress';
import { useToast } from '@/hooks/use-toast';
import { Database, CheckCircle, AlertCircle, RefreshCw, ShieldCheck, FileCheck } from 'lucide-react';

const DataIntegrity = () => {
  const [isScanning, setIsScanning] = useState(false);
  const [scanProgress, setScanProgress] = useState(0);
  const [lastScan, setLastScan] = useState(new Date().toISOString());
  const { toast } = useToast();

  const integrityChecks = [
    {
      id: 1,
      name: 'Database Consistency Check',
      status: 'passed',
      lastRun: new Date().toISOString(),
      description: 'Validates referential integrity and data consistency',
      issues: 0,
    },
    {
      id: 2,
      name: 'Data Duplication Check',
      status: 'passed',
      lastRun: new Date().toISOString(),
      description: 'Scans for duplicate employee records',
      issues: 0,
    },
    {
      id: 3,
      name: 'Data Format Validation',
      status: 'warning',
      lastRun: new Date().toISOString(),
      description: 'Validates data format compliance',
      issues: 2,
    },
    {
      id: 4,
      name: 'Foreign Key Integrity',
      status: 'passed',
      lastRun: new Date().toISOString(),
      description: 'Checks all foreign key relationships',
      issues: 0,
    },
    {
      id: 5,
      name: 'Orphaned Records Check',
      status: 'passed',
      lastRun: new Date().toISOString(),
      description: 'Identifies records without parent relationships',
      issues: 0,
    },
  ];

  const handleRunScan = () => {
    setIsScanning(true);
    setScanProgress(0);

    const interval = setInterval(() => {
      setScanProgress(prev => {
        if (prev >= 100) {
          clearInterval(interval);
          setIsScanning(false);
          setLastScan(new Date().toISOString());
          toast({
            title: "Scan Complete",
            description: "Data integrity scan completed successfully",
          });
          return 100;
        }
        return prev + 10;
      });
    }, 300);
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'passed': return 'bg-green-500';
      case 'warning': return 'bg-yellow-500';
      case 'failed': return 'bg-red-500';
      default: return 'bg-gray-500';
    }
  };

  const getStatusIcon = (status: string) => {
    switch (status) {
      case 'passed': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertCircle className="h-5 w-5 text-yellow-500" />;
      case 'failed': return <AlertCircle className="h-5 w-5 text-red-500" />;
      default: return null;
    }
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3">
            <ShieldCheck className="h-8 w-8 text-primary" />
            <h1 className="text-3xl font-bold">Data Integrity</h1>
          </div>
          <Button 
            onClick={handleRunScan} 
            disabled={isScanning}
            className="gap-2"
          >
            <RefreshCw className={`h-4 w-4 ${isScanning ? 'animate-spin' : ''}`} />
            {isScanning ? 'Scanning...' : 'Run Integrity Scan'}
          </Button>
        </div>

        {isScanning && (
          <Card className="p-6">
            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <span className="font-medium">Scanning data integrity...</span>
                <span className="text-sm text-muted-foreground">{scanProgress}%</span>
              </div>
              <Progress value={scanProgress} />
            </div>
          </Card>
        )}

        <Card className="p-6">
          <div className="flex items-center justify-between mb-6">
            <div>
              <h2 className="text-xl font-semibold">System Overview</h2>
              <p className="text-sm text-muted-foreground mt-1">
                Last scan: {new Date(lastScan).toLocaleString()}
              </p>
            </div>
            <div className="flex gap-4">
              <div className="text-center">
                <div className="text-3xl font-bold text-green-600">
                  {integrityChecks.filter(c => c.status === 'passed').length}
                </div>
                <div className="text-sm text-muted-foreground">Passed</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-yellow-600">
                  {integrityChecks.filter(c => c.status === 'warning').length}
                </div>
                <div className="text-sm text-muted-foreground">Warnings</div>
              </div>
              <div className="text-center">
                <div className="text-3xl font-bold text-red-600">
                  {integrityChecks.filter(c => c.status === 'failed').length}
                </div>
                <div className="text-sm text-muted-foreground">Failed</div>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            {integrityChecks.map((check) => (
              <div
                key={check.id}
                className="flex items-center gap-4 p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex-shrink-0">
                  {getStatusIcon(check.status)}
                </div>
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-1">
                    <h3 className="font-semibold">{check.name}</h3>
                    <Badge className={getStatusColor(check.status)}>
                      {check.status}
                    </Badge>
                  </div>
                  <p className="text-sm text-muted-foreground">{check.description}</p>
                  <p className="text-xs text-muted-foreground mt-1">
                    Last run: {new Date(check.lastRun).toLocaleString()}
                  </p>
                </div>
                <div className="flex-shrink-0 text-right">
                  {check.issues > 0 ? (
                    <div>
                      <div className="text-2xl font-bold text-yellow-600">{check.issues}</div>
                      <div className="text-xs text-muted-foreground">Issues Found</div>
                    </div>
                  ) : (
                    <CheckCircle className="h-8 w-8 text-green-500" />
                  )}
                </div>
              </div>
            ))}
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <FileCheck className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Integrity Actions</h2>
          </div>

          <div className="grid grid-cols-2 gap-4 max-w-2xl">
            <Button variant="outline" className="justify-start">
              <Database className="mr-2 h-4 w-4" />
              Repair Database
            </Button>
            <Button variant="outline" className="justify-start">
              <RefreshCw className="mr-2 h-4 w-4" />
              Rebuild Indexes
            </Button>
            <Button variant="outline" className="justify-start">
              <CheckCircle className="mr-2 h-4 w-4" />
              Validate All Records
            </Button>
            <Button variant="outline" className="justify-start">
              <FileCheck className="mr-2 h-4 w-4" />
              Export Integrity Report
            </Button>
          </div>
        </Card>

        <Card className="p-6 bg-blue-50 dark:bg-blue-950 border-blue-200 dark:border-blue-800">
          <div className="flex gap-3">
            <Database className="h-5 w-5 text-blue-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-blue-900 dark:text-blue-100 mb-2">
                About Data Integrity
              </h3>
              <p className="text-sm text-blue-800 dark:text-blue-200">
                Data integrity ensures the accuracy and consistency of data throughout its lifecycle. 
                Regular integrity checks help prevent data corruption, maintain system reliability, 
                and ensure compliance with data management policies.
              </p>
            </div>
          </div>
        </Card>
      </div>
    </DashboardLayoutNew>
  );
};

export default DataIntegrity;
