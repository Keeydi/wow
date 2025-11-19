import { Navigate } from 'react-router-dom';
import { useAuth } from '@/contexts/AuthContext';

const Index = () => {
  const { user, isAuthenticated } = useAuth();

  if (!isAuthenticated || !user) {
    return <Navigate to="/login" replace />;
  }

  return (
    <Navigate
      to={user.role === 'admin' ? '/dashboard' : '/employee/dashboard'}
      replace
    />
  );
};

export default Index;
