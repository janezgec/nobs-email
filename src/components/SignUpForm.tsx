import { useState } from 'preact/hooks';

interface SignUpFormProps {}

export default function SignUpForm({}: SignUpFormProps) {
  const [drowningEmail, setDrowningEmail] = useState('janez@gec.si');
  const [nobsUsername, setNobsUsername] = useState('');
  const [status, setStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');

  const validateEmail = (email: string) => {
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(email);
  };

  const handleSubmit = async (e: Event) => {
    e.preventDefault();
    
    if (!drowningEmail.trim() || !nobsUsername.trim()) {
      setStatus('error');
      return;
    }

    if (!validateEmail(drowningEmail)) {
      setStatus('error');
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
            We've sent a magic link to <span className="font-medium text-blue-600">{drowningEmail}</span>. 
            Check your inbox and click the link to sign in.
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="bg-gradient-to-br from-blue-50 to-purple-50 border-2 border-blue-300 shadow-2xl p-6 sm:p-8 w-full max-w-md mx-auto rounded-lg">
      <h2 className="text-xl font-semibold mb-6 text-gray-800">Gather data from emails</h2>

      <form onSubmit={handleSubmit} className="space-y-4">
        <div>
          <label className="block text-sm mb-2 font-medium text-gray-700">
            Email you are drowning in:
          </label>
          <input
            type="email"
            value={drowningEmail}
            onInput={(e) => {
              setDrowningEmail((e.target as HTMLInputElement).value);
              if (status === 'error') {
                setStatus('idle');
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
        </div>

        <div>
          <label className="block text-sm mb-2 font-medium text-gray-700">Email to set you free:</label>
          <div className="flex flex-col sm:flex-row">
            <input
              type="text"
              value={nobsUsername}
              onInput={(e) => {
                setNobsUsername((e.target as HTMLInputElement).value);
                if (status === 'error') {
                  setStatus('idle');
                }
              }}
              placeholder="NoBS username"
              className={`flex-1 px-4 py-3 border-2 bg-white focus:outline-none transition-colors rounded-lg sm:rounded-r-none ${
                status === 'error' 
                  ? 'border-red-300 focus:border-red-500' 
                  : 'border-blue-300 focus:border-blue-500'
              }`}
              disabled={status === 'loading'}
            />
            <div
              className="px-4 py-3 border-2 border-t-0 sm:border-t-2 sm:border-l-0 border-blue-300 rounded-lg sm:rounded-l-none bg-blue-50 text-blue-800 font-medium"
            >
              @nobs.email
            </div>
          </div>
        </div>

        {status === 'error' && (
          <p className="text-red-600 text-sm">Something went wrong, please try again later</p>
        )}

        <button
          type="submit"
          disabled={status === 'loading'}
          className="bg-gradient-to-r from-blue-600 to-purple-600 text-white border-2 border-blue-600 rounded-lg px-6 py-3 font-semibold hover:from-blue-700 hover:to-purple-700 hover:cursor-pointer transition-all transform hover:scale-105 disabled:opacity-50 disabled:transform-none disabled:cursor-not-allowed"
        >
          {status === 'loading' ? '🚀 Starting...' : '🚀 Start now'}
        </button>
      </form>
    </div>
  );
}