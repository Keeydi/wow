import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { AlertCircle, Eye, EyeOff } from 'lucide-react';
import loginBg from '../../images/background_image.png';
import logo from '../../images/logo.png';

const Login = () => {
  const [employeeId, setEmployeeId] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [errors, setErrors] = useState({
    employeeId: '',
    email: '',
    password: '',
  });
  const [submitting, setSubmitting] = useState(false);
  const { login } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  const validateForm = () => {
    const newErrors = {
      employeeId: employeeId.trim() ? '' : 'This field is required',
      email: email.trim() ? '' : 'This field is required',
      password: password.trim() ? '' : 'This field is required',
    };

    setErrors(newErrors);

    return !Object.values(newErrors).some(Boolean);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!validateForm()) return;

    setSubmitting(true);
    const result = await login(email || employeeId, password);
    setSubmitting(false);

    if (result.success) {
      // Check if password reset is required
      if (result.user?.passwordResetRequired) {
        toast({
          variant: "default",
          title: "Password Reset Required",
          description: "Please change your password to continue.",
        });
        navigate('/profile?changePassword=true');
        return;
      }
      
      const targetRoute = result.user?.role === 'admin' ? '/dashboard' : '/employee/dashboard';
      toast({
        title: "Login Successful",
        description: "Welcome to HRMS",
      });
      navigate(targetRoute);
    } else {
      toast({
        variant: "destructive",
        title: "Login Failed",
        description: result.message || "Invalid credentials",
      });
    }
  };

  useEffect(() => {
    if (!Object.values(errors).some(Boolean)) {
      return;
    }

    const timer = setTimeout(() => {
      setErrors({
        employeeId: '',
        email: '',
        password: '',
      });
    }, 5000);

    return () => clearTimeout(timer);
  }, [errors]);

  return (
    <div className="min-h-screen flex items-center justify-start p-4 lg:p-12" style={{ backgroundImage: `url(${loginBg})`, backgroundSize: 'cover', backgroundPosition: 'center' }}>
      <div className="w-full max-w-sm p-6 bg-card/95 backdrop-blur-sm rounded-xl shadow-2xl">
        <div className="text-center mb-8">
          <div className="w-20 h-20 mx-auto mb-4 rounded-full overflow-hidden border-4 border-primary/80 shadow-lg bg-card">
            <img src={logo} alt="The Great Plebeian College" className="w-full h-full object-cover" />
          </div>
          <h1 className="text-xl font-semibold text-foreground mb-2">The Great Plebeian College</h1>
          <h2 className="text-lg font-medium text-foreground">Sign In</h2>
        </div>

        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="employeeId" className="text-foreground">Employee ID</Label>
            <Input
              id="employeeId"
              type="text"
              placeholder="YY-GPC-XXXXX"
              value={employeeId}
              onChange={(e) => {
                setEmployeeId(e.target.value);
                if (errors.employeeId) {
                  setErrors((prev) => ({ ...prev, employeeId: '' }));
                }
              }}
              className="bg-card/50"
              aria-invalid={Boolean(errors.employeeId)}
              aria-describedby="employeeId-error"
            />
            {errors.employeeId && (
              <p id="employeeId-error" className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.employeeId}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="email" className="text-foreground">Email</Label>
            <Input
              id="email"
              type="email"
              placeholder="Enter your email"
              value={email}
              onChange={(e) => {
                setEmail(e.target.value);
                if (errors.email) {
                  setErrors((prev) => ({ ...prev, email: '' }));
                }
              }}
              className="bg-card/50"
              aria-invalid={Boolean(errors.email)}
              aria-describedby="email-error"
            />
            {errors.email && (
              <p id="email-error" className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.email}
              </p>
            )}
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-foreground">Password</Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                placeholder="Enter your password"
                value={password}
                onChange={(e) => {
                  setPassword(e.target.value);
                  if (errors.password) {
                    setErrors((prev) => ({ ...prev, password: '' }));
                  }
                }}
                className="bg-card/50 pr-10"
                aria-invalid={Boolean(errors.password)}
                aria-describedby="password-error"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground"
              >
                {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
            </div>
            {errors.password && (
              <p id="password-error" className="text-xs text-destructive flex items-center gap-1">
                <AlertCircle className="h-3.5 w-3.5" />
                {errors.password}
              </p>
            )}
          </div>

          <Button type="submit" className="w-full bg-primary hover:bg-primary/90" disabled={submitting}>
            {submitting ? 'Signing In...' : 'Sign In'}
          </Button>
        </form>

      </div>
    </div>
  );
};

export default Login;
