'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Get API base URL - Next.js client components need NEXT_PUBLIC_ prefix
const API_URL = typeof window !== 'undefined'
  ? (process.env.NEXT_PUBLIC_API_BASE_URL || process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000')
  : 'http://localhost:8000';
const cleanAPI_URL = API_URL.endsWith("/") ? API_URL.slice(0, -1) : API_URL;

export default function AuthPage() {
  const router = useRouter();
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [message, setMessage] = useState('');
  const [messageType, setMessageType] = useState<'success' | 'error' | ''>('');

  // Log API configuration on mount
  React.useEffect(() => {
    console.log('=== API Configuration ===');
    console.log('cleanAPI_URL:', cleanAPI_URL);
    console.log('NEXT_PUBLIC_API_BASE_URL:', process.env.NEXT_PUBLIC_API_BASE_URL);
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    console.log('========================');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setMessageType(''); // Clear message type
    const requestData = { email: email.trim(), password };
    const url = isLogin ? `${cleanAPI_URL}/api/auth/login` : `${cleanAPI_URL}/api/auth/register`;
    
    try {
      console.log('Making request to:', url);
      console.log('cleanAPI_URL:', cleanAPI_URL);
      console.log('Sending request data:', { email: requestData.email, passwordLength: requestData.password.length });
      
      if (isLogin) {
        const { data } = await axios.post(url, requestData, {
          headers: { 'Content-Type': 'application/json' }
        });
        localStorage.setItem('access_token', data.access_token);
        setMessage('Login successful!');
        setMessageType('success');
        // Clear any text selection before redirect
        if (typeof window !== 'undefined') {
          window.getSelection()?.removeAllRanges();
        }
        // Redirect to cashflow dashboard after successful login
        setTimeout(() => {
          router.push('/cashflow');
        }, 500);
      } else {
        const res = await axios.post(url, requestData, {
          headers: { 'Content-Type': 'application/json' }
        });
        console.log('Registration response:', res.data); // Debug log
        const successMsg = res.data?.message || 'User registered successfully! Please log in.';
        setMessage(successMsg);
        setMessageType('success');
        // Clear form fields
        setEmail('');
        setPassword('');
        // Switch to login after a short delay to show the message
        setTimeout(() => {
          setIsLogin(true);
        }, 2000);
      }
    } catch (e: any) {
      // Comprehensive error logging
      console.error('=== REQUEST ERROR ===');
      console.error('Error object:', e);
      console.error('Error message:', e.message);
      console.error('Error code:', e.code);
      console.error('Response status:', e.response?.status);
      console.error('Response data:', e.response?.data);
      console.error('Full response:', JSON.stringify(e.response?.data, null, 2));
      console.error('Request URL:', e.config?.url);
      console.error('Request data sent:', requestData);
      console.error('====================');
      
      let errorMsg = 'An error occurred.';
      if (e.code === 'ERR_NETWORK' || e.message === 'Network Error') {
              errorMsg = `Cannot connect to backend at ${cleanAPI_URL}. Please ensure the backend is running and reachable.`;
      } else if (e.response?.status === 422) {
        // FastAPI validation errors
        const detail = e.response?.data?.detail;
        console.error('422 Validation Error Detail:', detail);
        
        if (Array.isArray(detail)) {
          // Multiple validation errors - format them nicely
          const errors = detail.map((err: any) => {
            const field = err.loc?.slice(1).join('.') || 'field'; // Remove 'body' from path
            const msg = err.msg || 'Invalid value';
            return `${field}: ${msg}`;
          });
          errorMsg = `Validation error: ${errors.join(', ')}`;
        } else if (typeof detail === 'string') {
          errorMsg = detail;
        } else if (detail && typeof detail === 'object') {
          errorMsg = JSON.stringify(detail);
        } else {
          errorMsg = 'Invalid input. Please ensure:\n- Email is a valid email address\n- Password is at least 6 characters';
        }
      } else if (e.response?.data?.detail) {
        // Single error detail (string or object)
        const detail = e.response.data.detail;
        errorMsg = typeof detail === 'string' ? detail : JSON.stringify(detail);
      } else if (e.message) {
        errorMsg = e.message;
      }
      
      setMessage(errorMsg);
      setMessageType('error');
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gradient-to-br from-blue-50 via-white to-gray-50">
      <div className="bg-white p-8 shadow-2xl rounded-2xl w-full max-w-md border border-gray-100">
        <div className="text-center mb-6">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-blue-100 rounded-full mb-4">
            <svg className="w-8 h-8 text-blue-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 15v2m-6 4h12a2 2 0 002-2v-6a2 2 0 00-2-2H6a2 2 0 00-2 2v6a2 2 0 002 2zm10-10V7a4 4 0 00-8 0v4h8z" />
            </svg>
          </div>
          <h1 className="text-3xl font-bold mb-2 text-gray-800">
            {isLogin ? 'Welcome Back' : 'Create Account'}
          </h1>
          <p className="text-gray-500 text-sm">
            {isLogin ? 'Sign in to continue to your dashboard' : 'Get started with your account'}
          </p>
        </div>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-5">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Email</label>
            <input
              type="email"
              placeholder="Enter your email"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">Password</label>
            <input
              type="password"
              placeholder="Enter your password"
              className="w-full border border-gray-300 p-3 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button
            type="submit"
            className="w-full bg-blue-600 text-white py-3 rounded-lg hover:bg-blue-700 transition-all duration-200 font-semibold shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
          >
            {isLogin ? 'Sign In' : 'Create Account'}
          </button>
        </form>
        {message && (
          <div className={`mt-5 p-4 rounded-lg border ${
            messageType === 'success' 
              ? 'bg-green-50 border-green-200 text-green-700' 
              : messageType === 'error' 
              ? 'bg-red-50 border-red-200 text-red-700' 
              : 'bg-gray-50 border-gray-200 text-gray-700'
          }`}>
            <div className="flex items-center">
              {messageType === 'success' && (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              )}
              {messageType === 'error' && (
                <svg className="w-5 h-5 mr-2" fill="currentColor" viewBox="0 0 20 20">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                </svg>
              )}
              <p className="text-sm font-medium">{message}</p>
            </div>
          </div>
        )}
        <div className="mt-6 pt-6 border-t border-gray-200">
          <p className="text-sm text-gray-600 text-center">
            {isLogin ? "Don't have an account?" : 'Already have an account?'}{' '}
            <button
              onClick={() => {
                setIsLogin(!isLogin);
                setMessage('');
                setMessageType('');
              }}
              className="text-blue-600 hover:text-blue-700 font-semibold transition-colors"
            >
              {isLogin ? 'Sign up here' : 'Sign in here'}
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}