import { useState } from 'react';
import axios from 'axios';
import './App.css'; // We'll create this file for styling

function App() {
  const [rawLog, setRawLog] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');

  // This function will hold the contents of log.txt
  const handleLogChange = (event) => {
    setRawLog(event.target.value);
  };

  // This function calls our backend
  const handleAnalyzeClick = async () => {
    setIsLoading(true);
    setError('');
    setAiResponse(null);

    try {
      // Make the API call to your Node.js server
      const response = await axios.post('http://localhost:3000/analyze', {
        rawLog: rawLog, // Send the text from the textarea
      });

      setAiResponse(response.data); // Save the JSON response

    } catch (err) {
      console.error('Error analyzing log:', err);
      setError('Failed to analyze log. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="container">
      <header>
        <h1>🫧 Bubble Smart Time Tracker</h1>
        <p>Paste your captured <code>log.txt</code> data below to analyze.</p>
      </header>

      <main>
        <h2>Step 1: Raw Agent Log</h2>
        <textarea
          className="log-textarea"
          placeholder="Paste the contents of log.txt here..."
          value={rawLog}
          onChange={handleLogChange}
        />
        <button 
          className="analyze-button" 
          onClick={handleAnalyzeClick} 
          disabled={isLoading || !rawLog}
        >
          {isLoading ? 'Analyzing...' : 'Analyze Log'}
        </button>

        {error && <div className="error-message">{error}</div>}

        {aiResponse && (
          <div className="dashboard-section">
            <h2>Step 2: Manager Dashboard (AI Analysis)</h2>
            <pre className="json-output">
              {JSON.stringify(aiResponse, null, 2)}
            </pre>
          </div>
        )}
      </main>
    </div>
  );
}

export default App;