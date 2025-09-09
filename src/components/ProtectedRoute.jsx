import React from 'react';
import PocketbaseManager from '../services/PocketbaseManager';
import Login from './Login';

const ProtectedRoute = ({ children, user, onLogin }) => {
  if (!PocketbaseManager.isAuthenticated() || !user) {
    return <Login onLogin={onLogin} />;
  }

  return children;
};

export default ProtectedRoute;