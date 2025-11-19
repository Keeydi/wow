import { useState } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Card } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useToast } from '@/hooks/use-toast';
import { Shield, Lock, Eye, FileText, AlertTriangle } from 'lucide-react';

const DataPrivacy = () => {
  const [dataEncryption, setDataEncryption] = useState(true);
  const [accessLogging, setAccessLogging] = useState(true);
  const [dataRetention, setDataRetention] = useState(true);
  const [anonymization, setAnonymization] = useState(false);
  const [gdprCompliance, setGdprCompliance] = useState(true);
  const [privacyPolicy, setPrivacyPolicy] = useState(
    'This HRMS system collects and processes employee data in accordance with applicable privacy laws...'
  );
  const { toast } = useToast();

  const handleSave = () => {
    toast({
      title: "Success",
      description: "Data privacy settings updated successfully",
    });
  };

  return (
    <DashboardLayoutNew>
      <div className="space-y-6">
        <div className="flex items-center gap-3">
          <Shield className="h-8 w-8 text-primary" />
          <h1 className="text-3xl font-bold">Data Privacy</h1>
        </div>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Lock className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Privacy Controls</h2>
          </div>

          <div className="space-y-6 max-w-3xl">
            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold">Data Encryption</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Encrypt sensitive data at rest and in transit using AES-256 encryption
                </p>
              </div>
              <Switch
                checked={dataEncryption}
                onCheckedChange={setDataEncryption}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold">Access Logging</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Track and log all access to employee personal data
                </p>
              </div>
              <Switch
                checked={accessLogging}
                onCheckedChange={setAccessLogging}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold">Data Retention Policy</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Automatically delete inactive employee data after 7 years
                </p>
              </div>
              <Switch
                checked={dataRetention}
                onCheckedChange={setDataRetention}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold">Data Anonymization</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Anonymize personal data for reporting and analytics
                </p>
              </div>
              <Switch
                checked={anonymization}
                onCheckedChange={setAnonymization}
              />
            </div>

            <div className="flex items-center justify-between p-4 border rounded-lg">
              <div className="flex-1">
                <Label className="text-base font-semibold">GDPR Compliance Mode</Label>
                <p className="text-sm text-muted-foreground mt-1">
                  Enable additional features for GDPR compliance (EU regulations)
                </p>
              </div>
              <Switch
                checked={gdprCompliance}
                onCheckedChange={setGdprCompliance}
              />
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <FileText className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Privacy Policy</h2>
          </div>

          <div className="space-y-4 max-w-3xl">
            <div className="space-y-2">
              <Label htmlFor="privacyPolicy">Privacy Policy Statement</Label>
              <Textarea
                id="privacyPolicy"
                value={privacyPolicy}
                onChange={(e) => setPrivacyPolicy(e.target.value)}
                rows={8}
                className="font-mono text-sm"
              />
              <p className="text-sm text-muted-foreground">
                This policy will be shown to users when they access the system
              </p>
            </div>
          </div>
        </Card>

        <Card className="p-6">
          <div className="flex items-center gap-2 mb-6">
            <Eye className="h-5 w-5 text-primary" />
            <h2 className="text-xl font-semibold">Data Access Requests</h2>
          </div>

          <div className="space-y-4 max-w-3xl">
            <p className="text-muted-foreground">
              Employees can request access to their personal data or request data deletion.
            </p>

            <div className="grid grid-cols-2 gap-4">
              <Button variant="outline" className="justify-start">
                <FileText className="mr-2 h-4 w-4" />
                Export User Data
              </Button>
              <Button variant="outline" className="justify-start text-red-600 hover:text-red-700">
                <AlertTriangle className="mr-2 h-4 w-4" />
                Delete User Data
              </Button>
            </div>
          </div>
        </Card>

        <Card className="p-6 bg-amber-50 dark:bg-amber-950 border-amber-200 dark:border-amber-800">
          <div className="flex gap-3">
            <AlertTriangle className="h-5 w-5 text-amber-600 flex-shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold text-amber-900 dark:text-amber-100 mb-2">
                Important Privacy Notice
              </h3>
              <p className="text-sm text-amber-800 dark:text-amber-200">
                Ensure all privacy settings comply with local data protection regulations. 
                Changes to these settings may have legal implications. Consult with your legal team 
                before making significant modifications.
              </p>
            </div>
          </div>
        </Card>

        <div className="flex gap-3">
          <Button onClick={handleSave} className="px-8">
            Save Privacy Settings
          </Button>
          <Button variant="outline">
            Reset to Defaults
          </Button>
        </div>
      </div>
    </DashboardLayoutNew>
  );
};

export default DataPrivacy;
