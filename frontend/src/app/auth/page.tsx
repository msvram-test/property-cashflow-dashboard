'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import axios from 'axios';

// Get API base URL - Next.js client components need NEXT_PUBLIC_ prefix
const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:8000';

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
    console.log('API_URL:', API_URL);
    console.log('NEXT_PUBLIC_API_URL:', process.env.NEXT_PUBLIC_API_URL);
    console.log('Window location:', typeof window !== 'undefined' ? window.location.href : 'N/A');
    console.log('========================');
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(''); // Clear previous messages
    setMessageType(''); // Clear message type
    const requestData = { email: email.trim(), password };
    const url = isLogin ? `${API_URL}/api/auth/login` : `${API_URL}/api/auth/register`;
    
    try {
      console.log('Making request to:', url);
      console.log('API_URL:', API_URL);
      console.log('Sending request data:', { email: requestData.email, passwordLength: requestData.password.length });
      
      if (isLogin) {
        const { data } = await axios.post(url, requestData, {
          headers: { 'Content-Type': 'application/json' }
        });
        localStorage.setItem('access_token', data.access_token);
        setMessage('Login successful!');
        setMessageType('success');
        // Redirect to properties page after successful login
        setTimeout(() => {
          router.push('/properties');
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
              errorMsg = `Cannot connect to backend at ${API_URL}. Please ensure the backend is running and reachable.`;
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
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-50">
      <div className="bg-white p-8 shadow-lg rounded-md w-80">
        <h1 className="text-2xl font-semibold mb-4 text-center text-blue-600">
          {isLogin ? 'Login' : 'Register'}
        </h1>
        <form onSubmit={handleSubmit} className="flex flex-col space-y-4">
          <input
            type="email"
            placeholder="Email"
            className="border border-gray-300 p-2 rounded-lg focus:outline-blue-500"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <input
            type="password"
            placeholder="Password"
            className="border border-gray-300 p-2 rounded-lg focus:outline-blue-500"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <button
            type="submit"
            className="bg-blue-600 text-white py-2 rounded-lg hover:bg-blue-700 transition"
          >
            {isLogin ? 'Login' : 'Register'}
          </button>
        </form>
        {message && (
          <p 
            className={`mt-4 text-center ${
              messageType === 'success' 
                ? 'text-green-600 font-medium' 
                : messageType === 'error' 
                ? 'text-red-600 font-medium' 
                : 'text-gray-700'
            }`}
          >
            {message}
          </p>
        )}
        <p className="mt-4 text-sm text-gray-500 text-center">
          {isLogin ? 'Need an account?' : 'Already have an account?'}{' '}
          <button
            onClick={() => {
              setIsLogin(!isLogin);
              setMessage('');
              setMessageType('');
            }}
            className="text-blue-500 hover:underline"
          >
            {isLogin ? 'Register' : 'Login'}
          </button>
        </p>
      </div>
    </div>
  );
}