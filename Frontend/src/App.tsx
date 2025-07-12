import { Button } from "@/components/ui/button";
import { useState, useEffect } from 'react';
import api from './lib/api'; // Import the configured axios instance

function App() {
  const [backendMessage, setBackendMessage] = useState('Connecting to backend...');
  const [error, setError] = useState('');

  useEffect(() => {
    const testBackendConnection = async () => {
      try {
        // Note: The backend's root route is '/', not '/api'.
        // The `api` instance has a baseURL of 'http://localhost:8080/api'.
        // So, to hit 'http://localhost:8080/', we need to override the baseURL or use plain axios.
        // For this test, I'll use plain axios to hit the root.
        const response = await api.get('/'); // This will hit http://localhost:8080/api/
        setBackendMessage(response.data);
      } catch (err) {
        console.error('Error connecting to backend:', err);
        setError('Failed to connect to backend. Please ensure the backend server is running and accessible.');
        setBackendMessage('Backend connection failed.');
      }
    };

    testBackendConnection();
  }, []);

  return (
    <div className="flex min-h-svh flex-col items-center justify-center">
      <h1 className="text-2xl font-bold mb-4">ReWear Frontend</h1>
      <p className="mb-2">Backend Status: {backendMessage}</p>
      {error && <p className="text-red-500">{error}</p>}
      <Button>Click me</Button>
    </div>
  );
}

export default App;
