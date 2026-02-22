// src/components/auth/Login.jsx
import React, { useState } from 'react';
import { useAuth } from '../../contexts/AuthContext';

export default function Login() {
  const { signInWithGoogle } = useAuth();
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleLogin = async () => {
    setError('');
    setLoading(true);
    try {
      await signInWithGoogle();
    } catch (e) {
      setError('Sign-in failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col items-center justify-center px-4">

      {/* Card */}
      <div className="bg-white w-full max-w-sm rounded-2xl shadow-sm border border-gray-200 px-8 py-10">

        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 flex-shrink-0">
            <svg viewBox="0 0 40 40" fill="none" xmlns="http://www.w3.org/2000/svg" className="w-10 h-10">
              <rect x="2" y="2" width="26" height="19" rx="6" fill="#2563EB" />
              <path d="M6 21L4 28L14 22" fill="#2563EB" />
              <rect x="12" y="13" width="26" height="19" rx="6" fill="#1D4ED8" />
              <path d="M30 32L38 36L34 28" fill="#1D4ED8" />
              <circle cx="19" cy="22.5" r="1.8" fill="white" fillOpacity="0.9" />
              <circle cx="25" cy="22.5" r="1.8" fill="white" fillOpacity="0.9" />
              <circle cx="31" cy="22.5" r="1.8" fill="white" fillOpacity="0.9" />
            </svg>
          </div>
          <div>
            <p className="text-[18px] font-bold text-gray-900 leading-none tracking-tight">NearTalk</p>
            <p className="text-[11px] text-blue-600 font-medium tracking-widest uppercase mt-0.5">Local Groups</p>
          </div>
        </div>

        {/* Heading */}
        <h1 className="text-2xl font-bold text-gray-900 tracking-tight mb-1">
          Welcome!
        </h1>
        <p className="text-sm text-gray-500 mb-8 leading-relaxed">
          Sign in to discover and chat in anonymous groups near you.
        </p>

        {/* Error */}
        {error && (
          <div className="bg-red-50 border border-red-200 text-red-600 text-sm rounded-lg px-4 py-3 mb-5">
            {error}
          </div>
        )}

        {/* Google Button */}
        <button
          onClick={handleLogin}
          disabled={loading}
          className="w-full flex items-center justify-center gap-3 bg-white border border-gray-300 hover:border-gray-400 hover:shadow-md text-gray-700 font-semibold text-sm py-3 px-5 rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed"
        >
          {/* Google SVG */}
          <svg className="w-5 h-5 flex-shrink-0" viewBox="0 0 24 24">
            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" />
            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" />
            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" />
            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" />
          </svg>
          {loading ? 'Signing in...' : 'Continue with Google'}
        </button>

        {/* Divider */}
        <div className="flex items-center gap-3 my-6">
          <div className="flex-1 h-px bg-gray-100" />
          <span className="text-xs text-gray-400">Secure Sign-in</span>
          <div className="flex-1 h-px bg-gray-100" />
        </div>

        {/* Feature pills */}
        <div className="flex flex-wrap justify-center gap-2">
          {['📍 Location-based', '🎭 Anonymous', '⚡ Real-time'].map((f) => (
            <span key={f} className="text-xs text-gray-500 bg-gray-50 border border-gray-200 px-3 py-1 rounded-full">
              {f}
            </span>
          ))}
        </div>
      </div>

      {/* Bottom note */}
      <p className="text-xs text-gray-400 text-center mt-6 max-w-xs leading-relaxed">
        Your identity stays anonymous. Only your nickname is visible to others in each group.
      </p>

    </div>
  );
}