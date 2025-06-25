import { useState } from 'react';

export default function Login({ onLogin }) {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [isRegistering, setIsRegistering] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const endpoint = isRegistering ? '/api/register' : '/api/login';
      const response = await fetch(`http://localhost:3001${endpoint}`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username, password }),
      });

      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || (isRegistering ? 'Registration failed' : 'Login failed'));
      }

      if (isRegistering) {
        // Auto-login after successful registration
        const loginResponse = await fetch('http://localhost:3001/api/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password }),
        });
        const loginData = await loginResponse.json();
        if (!loginResponse.ok) throw new Error(loginData.error || 'Auto-login failed');
        localStorage.setItem('token', loginData.token);
        localStorage.setItem('username', loginData.username);
        onLogin(loginData.username);
      } else {
        localStorage.setItem('token', data.token);
        localStorage.setItem('username', data.username);
        onLogin(data.username);
      }
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50">
      <form onSubmit={handleSubmit} className="p-6 bg-white rounded-lg shadow-md w-80">
        <h2 className="text-2xl font-bold mb-4 text-center">
          {isRegistering ? 'Create Account' : 'Welcome'}
        </h2>
        
        {error && <div className="text-red-500 mb-4 text-center">{error}</div>}

        <input
          type="text"
          placeholder="Username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="w-full p-2 mb-4 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
        <input
          type="password"
          placeholder="Password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className="w-full p-2 mb-6 border rounded focus:outline-none focus:ring-2 focus:ring-blue-400"
          required
        />
        <button
          type="submit"
          className="w-full bg-blue-500 text-white p-2 rounded hover:bg-blue-600 transition-colors"
        >
          {isRegistering ? 'Register' : 'Login'}
        </button>
        
        <div className="mt-4 text-center text-sm">
          {isRegistering ? (
            <>
              Already have an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(false)}
                className="text-blue-500 hover:text-blue-700"
              >
                Login instead
              </button>
            </>
          ) : (
            <>
              Need an account?{' '}
              <button
                type="button"
                onClick={() => setIsRegistering(true)}
                className="text-blue-500 hover:text-blue-700"
              >
                Sign up instead?
              </button>
            </>
          )}
        </div>
      </form>
    </div>
  );
}
