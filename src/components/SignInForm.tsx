import { useState } from 'preact/hooks';

interface SignInFormProps {}

export default function SignInForm({}: SignInFormProps) {
  const [email, setEmail] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorMessage, setErrorMessage] = useState('');

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

    setStatus('loading');
    
    // Simulate API call
    setTimeout(() => {
      setStatus('success');
    }, 1000);
  };

  if (status === 'success') {
    return (
      <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto rounded-lg">
        <div className="text-center space-y-4">
          <div className="text-4xl">✨</div>
          <h2 className="text-xl font-semibold text-gray-800">Magic link sent!</h2>
          <p className="text-gray-600">
            We've sent a magic link to <span className="font-medium text-blue-600">{email}</span>. 
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
                : 'border-blue-300 focus:border-blue-500'
            }`}
            disabled={status === 'loading'}
          />
          {status === 'error' && (
            <p className="text-red-600 text-sm mt-2">{errorMessage}</p>
          )}
        </div>

        <button
          type="submit"
          disabled={status === 'loading'}
          className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white border-2 border-blue-600 rounded-lg px-6 py-3 font-semibold hover:from-blue-700 hover:to-purple-700 hover:cursor-pointer transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
        >
          {status === 'loading' ? '✨ Sending magic link...' : '✨ Send magic link'}
        </button>
      </form>
    </div>
  );
}