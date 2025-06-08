import { useState } from 'preact/hooks';
import { getPB } from '../lib/pb';

const pb = getPB();

interface SignInFormProps {}

export default function SignInForm({}: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');
  const [signInMethod, setSignInMethod] = useState<'magic-link' | 'password'>('magic-link');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!email.trim()) {
      setStatus('error');
      setErrorMessage('Please enter your email address');
      return;
    }

    if (!validateEmail(email)) {
      setStatus('error');
      setErrorMessage('Please enter a valid email address');
      return;
    }

    if (signInMethod === 'password' && !password.trim()) {
      setStatus('error');
      setErrorMessage('Please enter your password');
      return;
    }

    setStatus('loading');
    
    try {
      if (signInMethod === 'magic-link') {
        // Request OTP via email
        await pb.collection('users').requestOTP(email);
        setStatus('success');
      } else {
        // Sign in with email and password
        await pb.collection('users').authWithPassword(email, password);
        // Redirect to /app on successful authentication
        window.location.href = '/app';
      }
    } catch (error) {
      console.error('Error during authentication:', error);
      setStatus('error');
      if (signInMethod === 'magic-link') {
        setErrorMessage('Failed to send magic link. Please try again.');
      } else {
        setErrorMessage('Invalid email or password. Please try again.');
      }
    }
  };

  if (status === 'success') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto rounded-lg">
        <div className="text-center space-y-4">
          <div className="text-4xl">✨</div>
          <h2 className="text-xl font-semibold text-gray-800">Magic link sent!</h2>
          <p className="text-gray-600">
            We've sent a magic link to <span className="font-medium text-cyan-600">{email}</span>. 
            Check your inbox and click the link to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto rounded-lg">
      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-2 font-medium text-gray-700">
            Email address:
          </label>
          <input
            type="email"
            value={email}
            onInput={(e) => {
              setEmail((e.target as HTMLInputElement).value);
              if (status === 'error') {
                setStatus('idle');
                setErrorMessage('');
              }
            }}
            placeholder="Enter your email"
            className={`w-full px-4 py-3 border-2 rounded-lg bg-white focus:outline-none transition-colors ${
              status === 'error' 
                ? 'border-red-300 focus:border-red-500' 
                : 'border-blue-300 focus:border-cyan-500'
            }`}
            disabled={status === 'loading'}
          />
        </div>

        {signInMethod === 'password' && (
          <div>
            <label className="block text-sm mb-2 font-medium text-gray-700">
              Password:
            </label>
            <input
              type="password"
              value={password}
              onInput={(e) => {
                setPassword((e.target as HTMLInputElement).value);
                if (status === 'error') {
                  setStatus('idle');
                  setErrorMessage('');
                }
              }}
              placeholder="Enter your password"
              className={`w-full px-4 py-3 border-2 rounded-lg bg-white focus:outline-none transition-colors ${
                status === 'error' 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-blue-300 focus:border-cyan-500'
              }`}
              disabled={status === 'loading'}
            />
          </div>
        )}

        {status === 'error' && (
          <p className="text-red-600 text-sm">{errorMessage}</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-gradient-to-r from-cyan-600 to-sky-600 text-white border-2 border-cyan-600 rounded-lg px-6 py-3 font-semibold hover:from-cyan-700 hover:to-sky-700 hover:cursor-pointer transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
        >
          {status === 'loading' 
            ? (signInMethod === 'magic-link' ? '✨ Sending magic link...' : '🔐 Signing in...') 
            : (signInMethod === 'magic-link' ? '✨ Send magic link' : '🔐 Sign in with password')
          }
        </button>
      </form>

      <div className="mt-4 text-center">
        <button
          type="button"
          onClick={() => {
            setSignInMethod(signInMethod === 'magic-link' ? 'password' : 'magic-link');
            setStatus('idle');
            setErrorMessage('');
            setPassword('');
          }}
          className="text-cyan-600 hover:text-cyan-800 text-sm underline transition-colors"
        >
          {signInMethod === 'magic-link' 
            ? 'Click here to sign in with password' 
            : 'Click here to sign in with magic link'
          }
        </button>
      </div>
    </div>
  );
}