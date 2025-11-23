import { useState, useEffect } from 'react';
import DashboardLayoutNew from '@/components/Layout/DashboardLayoutNew';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card } from '@/components/ui/card';
import { useToast } from '@/hooks/use-toast';

const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

const Settings = () => {
  const [siteTitle, setSiteTitle] = useState('Human Resource Management System');
  const [description, setDescription] = useState(
    'A web-based Human Resource Management System of The Great Plebeian College.'
  );
  const [copyright, setCopyright] = useState('© 2025 Human Resource Management System - The Great Plebeian College. All rights reserved.');
  const [contactNumber, setContactNumber] = useState('+63 9600323101');
  const [systemEmail, setSystemEmail] = useState('hrmsgpcalaminos@gmail.com');
  const [address, setAddress] = useState('Gen. Montemayor St, Alaminos City, Pangasinan');
  const [logoPreview, setLogoPreview] = useState<string | null>(null);
  const [logoFile, setLogoFile] = useState<File | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const { toast } = useToast();

  useEffect(() => {
    const fetchSettings = async () => {
      try {
        setIsLoading(true);
        const response = await fetch(`${API_BASE_URL}/settings`);
        if (response.ok) {
          const data = await response.json();
          const settings = data.data || {};
          if (settings.siteTitle) setSiteTitle(settings.siteTitle);
          if (settings.description) setDescription(settings.description);
          if (settings.copyright !== undefined) setCopyright(settings.copyright || '');
          if (settings.contactNumber) setContactNumber(settings.contactNumber);
          if (settings.systemEmail) setSystemEmail(settings.systemEmail);
          if (settings.address) setAddress(settings.address);
          if (settings.logoUrl) setLogoPreview(`${API_BASE_URL}${settings.logoUrl}`);
        }
      } catch (error) {
        console.error('Error fetching settings', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSettings();
  }, []);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const formData = new FormData();
      
      if (logoFile) {
        formData.append('logo', logoFile);
      }
      
      formData.append('siteTitle', siteTitle);
      formData.append('description', description);
      formData.append('copyright', copyright);
      formData.append('contactNumber', contactNumber);
      formData.append('systemEmail', systemEmail);
      formData.append('address', address);

      const response = await fetch(`${API_BASE_URL}/settings`, {
        method: 'PUT',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to save settings');
      }

      toast({
        title: 'Success',
        description: 'Settings saved successfully',
      });

      // Refresh settings to get updated logo URL
      const refreshResponse = await fetch(`${API_BASE_URL}/settings`);
      if (refreshResponse.ok) {
        const data = await refreshResponse.json();
        const settings = data.data || {};
        if (settings.logoUrl) {
          setLogoPreview(`${API_BASE_URL}${settings.logoUrl}`);
        }
      }
    } catch (error) {
      console.error('Error saving settings', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: 'Failed to save settings. Please try again.',
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <DashboardLayoutNew>
      <Card className="max-w-3xl p-6 shadow-sm border-border space-y-6">
        <div className="space-y-3">
          <Label className="text-sm font-semibold">Upload site logo</Label>
          <div className="flex flex-col items-start gap-3">
            <div className="w-24 h-24 rounded-full border border-border overflow-hidden flex items-center justify-center bg-muted">
              {logoPreview ? (
                <img src={logoPreview} alt="Site logo" className="w-full h-full object-cover" />
              ) : (
                <span className="text-xs text-muted-foreground">No logo</span>
              )}
            </div>
            <Input
              type="file"
              accept="image/*"
              onChange={(e) => {
                const file = e.target.files?.[0];
                if (file) {
                  setLogoFile(file);
                  const reader = new FileReader();
                  reader.onload = () => setLogoPreview(reader.result as string);
                  reader.readAsDataURL(file);
                }
              }}
            />
          </div>
        </div>

        <div className="space-y-4">
          <Field label="Site Title">
            <Input value={siteTitle} onChange={(e) => setSiteTitle(e.target.value)} />
          </Field>

          <Field label="Description">
            <Input value={description} onChange={(e) => setDescription(e.target.value)} />
          </Field>

          <Field label="Copyright">
            <Input value={copyright} onChange={(e) => setCopyright(e.target.value)} />
          </Field>

          <Field label="Contact Number">
            <Input value={contactNumber} onChange={(e) => setContactNumber(e.target.value)} />
          </Field>

          <Field label="System Email">
            <Input type="email" value={systemEmail} onChange={(e) => setSystemEmail(e.target.value)} />
          </Field>

          <Field label="Address">
            <Input value={address} onChange={(e) => setAddress(e.target.value)} />
          </Field>
        </div>

        <div className="flex justify-end gap-3 pt-2">
          <Button variant="destructive" className="px-6 rounded-full">
            Cancel
          </Button>
          <Button 
            onClick={handleSave} 
            className="px-6 rounded-full bg-green-600 hover:bg-green-700"
            disabled={isSaving || isLoading}
          >
            {isSaving ? 'Saving...' : 'Save'}
          </Button>
        </div>
      </Card>
    </DashboardLayoutNew>
  );
};

const Field = ({ label, children }: { label: string; children: React.ReactNode }) => (
  <div className="space-y-2">
    <Label className="text-sm font-semibold text-muted-foreground">{label}</Label>
    {children}
  </div>
);

export default Settings;
