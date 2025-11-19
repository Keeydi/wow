import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';

const ForgotPassword = () => {
  const [email, setEmail] = useState('');
  const { toast } = useToast();
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!email.trim()) {
      toast({
        variant: 'destructive',
        title: 'Email required',
        description: 'Please enter the email associated with your account.',
      });
      return;
    }

    try {
      const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';
      const response = await fetch(`${API_BASE_URL}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ email }),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.message || 'Failed to send reset link');
      }

      toast({
        title: 'Check your inbox',
        description: data.message || 'If an account with that email exists, a password reset link has been sent.',
      });
    } catch (error) {
      console.error('Forgot password error', error);
      toast({
        variant: 'destructive',
        title: 'Error',
        description: error instanceof Error ? error.message : 'Unable to send reset link. Please try again.',
      });
    }
  };

  return (
    <div className="min-h-screen bg-[#d7ecff] flex items-center justify-center p-4">
      <div className="w-full max-w-3xl rounded-2xl bg-[#d7ecff] shadow-[0_10px_40px_rgba(0,0,0,0.05)] border border-[#bcd7ff] px-6 py-16 lg:px-16">
        <div className="flex items-center justify-center gap-8 text-[#0a1f4d] font-semibold mb-10">
          {[1, 2, 3].map((step, index) => (
            <div key={step} className="flex items-center gap-4">
              <div
                className={`w-10 h-10 rounded-full flex items-center justify-center border-2 ${
                  step === 1 ? 'bg-[#001a5c] border-[#001a5c] text-white' : 'border-[#001a5c] text-[#001a5c]'
                }`}
              >
                {step}
              </div>
              {index < 2 && <div className="w-16 lg:w-24 h-0.5 bg-[#001a5c] opacity-60" />}
            </div>
          ))}
        </div>

        <div className="text-center space-y-3 mb-10">
          <h1 className="text-4xl font-bold text-[#001a5c]">Forgot Password?</h1>
          <p className="text-base text-[#1d2f5d]">
            Enter the email address associated with your account to receive a verification code.
          </p>
        </div>

        <form onSubmit={handleSubmit} className="max-w-md mx-auto space-y-6">
          <div className="space-y-2">
            <Label htmlFor="email" className="text-[#001a5c] font-semibold">
              Email
            </Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              className="h-14 rounded-2xl border-[#9ab7e8] bg-white/80 text-lg placeholder:text-[#9ab0d6]"
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
              className="w-full sm:w-40 h-12 rounded-full bg-[#051a66] hover:bg-[#0b2987] text-white text-lg font-semibold"
            >
              Send
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ForgotPassword;

