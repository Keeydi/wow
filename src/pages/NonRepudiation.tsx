import { useState } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Card } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { useToast } from '@/hooks/use-toast';
import { ShieldAlert, FileSignature, Lock, CheckCircle, Clock, User } from 'lucide-react';

const NonRepudiation = () => {
  const [digitalSignatures, setDigitalSignatures] = useState(true);
  const [timestamping, setTimestamping] = useState(true);
  const [transactionLogging, setTransactionLogging] = useState(true);
  const { toast } = useToast();

  const signedTransactions = [
    {
      id: '1',
      action: 'Employee Data Update',
      user: 'admin',
      timestamp: new Date().toISOString(),
      signature: '8A3F9D2E...4B7C1A6D',
      verified: true,
    },
    {
      id: '2',
      action: 'Salary Modification',
      user: 'hr_manager',
      timestamp: new Date(Date.now() - 3600000).toISOString(),
      signature: '5F2A8B9C...1E4D6A7B',
      verified: true,
    },
    {
      id: '3',
      action: 'Document Upload',
      user: 'admin',
      timestamp: new Date(Date.now() - 7200000).toISOString(),
      signature: '9D3E5A2F...7B8C4A1D',
      verified: true,
    },
  ];

  const handleSave = () => {
    toast({
      title: "Success",
      description: "Non-repudiation settings updated successfully",
    });
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <ShieldAlert className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Non-Repudiation</h1>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Security Features</h2>
          </div>

          <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <FileSignature className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Digital Signatures</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  All critical operations are digitally signed to ensure authenticity and prevent repudiation
                </p>
              </div>
              <Switch
                checked={digitalSignatures}
                onCheckedChange={setDigitalSignatures}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <Clock className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Trusted Timestamping</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Add cryptographically secure timestamps to all transactions
                </p>
              </div>
              <Switch
                checked={timestamping}
                onCheckedChange={setTimestamping}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <User className="h-4 w-4 text-primary" />
                  <Label className="text-base font-semibold">Transaction Logging</Label>
                </div>
                <p className="text-sm text-muted-foreground">
                  Maintain immutable logs of all user actions and system transactions
                </p>
              </div>
              <Switch
                checked={transactionLogging}
                onCheckedChange={setTransactionLogging}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileSignature className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Recent Signed Transactions</h2>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b">
                  <th className="text-left py-3 px-4 font-medium">Action</th>
                  <th className="text-left py-3 px-4 font-medium">User</th>
                  <th className="text-left py-3 px-4 font-medium">Timestamp</th>
                  <th className="text-left py-3 px-4 font-medium">Digital Signature</th>
                  <th className="text-left py-3 px-4 font-medium">Status</th>
                </tr>
              </thead>
              <tbody>
                {signedTransactions.map((transaction) => (
                  <tr key={transaction.id} className="border-b hover:bg-muted/50">
                    <td className="py-3 px-4 font-medium">{transaction.action}</td>
                    <td className="py-3 px-4">{transaction.user}</td>
                    <td className="py-3 px-4 text-sm">
                      {new Date(transaction.timestamp).toLocaleString()}
                    </td>
                    <td className="py-3 px-4">
                      <code className="text-xs bg-muted px-2 py-1 rounded font-mono">
                        {transaction.signature}
                      </code>
                    </td>
                    <td className="py-3 px-4">
                      {transaction.verified ? (
                        <Badge className="bg-green-500 gap-1">
                          <CheckCircle className="h-3 w-3" />
                          Verified
                        </Badge>
                      ) : (
                        <Badge variant="destructive">Unverified</Badge>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-4">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Certificate Management</h2>
          </div>

          <div className="space-y-4 max-w-2xl">
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label>Certificate Issuer</Label>
                <Input value="HRMS Certificate Authority" disabled />
              </div>
              <div className="space-y-2">
                <Label>Certificate Valid Until</Label>
                <Input value="2026-12-31" disabled />
              </div>
            </div>

            <div className="space-y-2">
              <Label>Certificate Fingerprint</Label>
              <Input 
                value="SHA256: A1:B2:C3:D4:E5:F6:07:08:09:10:11:12:13:14:15:16" 
                className="font-mono text-sm"
                disabled 
              />
            </div>

            <div className="flex gap-3 pt-2">
              <Button variant="outline">
                Renew Certificate
              </Button>
              <Button variant="outline">
                Export Certificate
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-purple-50 dark:bg-purple-950 border-purple-200 dark:border-purple-800">
          <div className="flex gap-3">
            <ShieldAlert className="h-5 w-5 text-purple-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-purple-900 dark:text-purple-100 mb-2">
                About Non-Repudiation
              </h3>
              <p className="text-sm text-purple-800 dark:text-purple-200">
                Non-repudiation ensures that a party cannot deny having performed an action. 
                This is achieved through digital signatures, timestamps, and immutable audit trails. 
                These mechanisms provide legal proof of data origin and integrity, essential for 
                compliance and security.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} className="px-8">
            Save Settings
          </Button>
          <Button variant="outline">
            View Security Report
          </Button>
        </div>
      </div>
    </DashboardLayoutNew>
  );
};

export default NonRepudiation;
