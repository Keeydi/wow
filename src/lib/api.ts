/**
 * Centralized API configuration
 * 
 * The API base URL is configured via the VITE_API_URL environment variable.
 * If not set, it defaults to http://localhost:4000
 * 
 * To configure for different environments:
 * 1. Create a .env file in the project root
 * 2. Add: VITE_API_URL=http://your-server-url:port
 * 
 * For production, set this to your actual backend server URL.
 * For development, use http://localhost:4000 (or your local server URL)
 */

export const API_BASE_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

/**
 * Check if the API server is reachable
 */
export async function checkApiHealth(): Promise<boolean> {
  try {
    const response = await fetch(`${API_BASE_URL}/health`, {
      method: 'GET',
      headers: {
        'Content-Type': 'application/json',
      },
    });
    return response.ok;
  } catch {
    return false;
  }
}

/**
 * Get a user-friendly error message for API connection failures
 */
export function getConnectionErrorMessage(): string {
  const apiUrl = API_BASE_URL;
  
  if (apiUrl.includes('localhost') || apiUrl.includes('127.0.0.1')) {
    return `Cannot connect to the backend server at ${apiUrl}. Please ensure:
1. The backend server is running
2. The server is accessible at ${apiUrl}
3. Check your .env file and ensure VITE_API_URL is set correctly`;
  }
  
  return `Cannot connect to the backend server at ${apiUrl}. Please check:
1. The server is running and accessible
2. Your network connection
3. The VITE_API_URL in your .env file is correct`;
}

