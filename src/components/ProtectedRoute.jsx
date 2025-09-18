import SupabaseManager from '../services/SupabaseManager';
import Login from './Login';

const ProtectedRoute = ({ children, user, onLogin }) => {
  if (!SupabaseManager.isAuthenticated() || !user) {
    return <Login onLogin={onLogin} />;
  }

  return children;
};

export default ProtectedRoute;