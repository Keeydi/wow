import { useState, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const ResetPassword = () => {
  const [searchParams] = useSearchParams();
  const token = searchParams.get('token');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();
  const navigate = useNavigate();

  useEffect(() => {
    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Invalid Link',
        description: 'No reset token found. Please request a new password reset.',
      });
      navigate('/forgot-password');
    }
  }, [token, navigate, toast]);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!newPassword.trim()) {
      toast({
        variant: 'destructive',
        title: 'Password required',
        description: 'Please enter a new password.',
      });
      return;
    }

    if (newPassword.length < 6) {
      toast({
        variant: 'destructive',
        title: 'Password too short',
        description: 'Password must be at least 6 characters long.',
      });
      return;
    }

    if (newPassword !== confirmPassword) {
      toast({
        variant: 'destructive',
        title: 'Passwords do not match',
        description: 'Please make sure both passwords match.',
      });
      return;
    }

    if (!token) {
      toast({
        variant: 'destructive',
        title: 'Invalid token',
        description: 'No reset token found. Please request a new password reset.',
      });
      return;
    }

    try {
      setIsSubmitting(true);
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ token, newPassword }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to reset password');
      }

      toast({
        title: 'Password Reset Successful',
        description: 'Your password has been reset. You can now login with your new password.',
      });

      setTimeout(() => {
        navigate('/login');
      }, 2000);
    } catch (error) {
      console.error('Reset password error', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to reset password. Please try again.',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#d7ecff] flex items-center justify-center p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#bcd7ff] px-6 py-16 lg:px-16">
        <div className="flex items-center justify-center gap-8 text-[#0a1f4d] font-semibold mb-10">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === 3 ? 'bg-[#001a5c] border-[#001a5c] text-white' : 'border-[#001a5c] text-[#001a5c]'
                }`}
              >
                {step}
              </div>
              {index < 2 && <div className="w-16 lg:w-24 h-0.5 bg-[#001a5c] opacity-60" />}
            </div>
          ))}
        </div>

        <div className="text-center space-y-3 mb-10">
          <h1 className="text-4xl font-bold text-[#001a5c]">Reset Password</h1>
          <p className="text-base text-[#1d2f5d]">
            Enter your new password below.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
          <div className="space-y-2">
            <Label htmlFor="newPassword" className="text-[#001a5c] font-semibold">
              New Password
            </Label>
            <Input
              id="newPassword"
              type="password"
              placeholder="Enter new password"
              value={newPassword}
              onChange={(e) => setNewPassword(e.target.value)}
              className="h-14 rounded-2xl border-[#9ab7e8] bg-white/80 text-lg placeholder:text-[#9ab0d6]"
              minLength={6}
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="confirmPassword" className="text-[#001a5c] font-semibold">
              Confirm Password
            </Label>
            <Input
              id="confirmPassword"
              type="password"
              placeholder="Confirm new password"
              value={confirmPassword}
              onChange={(e) => setConfirmPassword(e.target.value)}
              className="h-14 rounded-2xl border-[#9ab7e8] bg-white/80 text-lg placeholder:text-[#9ab0d6]"
              minLength={6}
              required
            />
          </div>

          <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => navigate('/login')}
              className="w-full sm:w-40 h-12 rounded-full border-2 border-[#9ab7e8] text-[#4b5f92] bg-transparent hover:bg-white"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting || !token}
              className="w-full sm:w-40 h-12 rounded-full bg-[#051a66] hover:bg-[#0b2987] text-white text-lg font-semibold disabled:opacity-50"
            >
              {isSubmitting ? 'Resetting...' : 'Reset Password'}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ResetPassword;

