import { useState, useRef } from 'react';
import axios from 'axios';
import './index.css';

// --- Helper Components ---
const ActivityCard = ({ description, time }) => (
  <div className="activity-card">
    <p className="activity-description">{description}</p>
    <p className="activity-time">{time} min</p>
  </div>
);

const TotalTimeCard = ({ time }) => (
  <div className="total-time-card">
    <p className="total-time-label">Total Billable Time</p>
    <p className="total-time-value">{time} min</p>
  </div>
);

// --- Main App Component ---
function App() {
  const [ticketId, setTicketId] = useState('');
  const [clientName, setClientName] = useState('');
  const [rawLog, setRawLog] = useState('');
  const [aiResponse, setAiResponse] = useState(null);
  const [reportText, setReportText] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState('');
  const fileInputRef = useRef(null);

  const handleFileChange = (event) => {
    const file = event.target.files[0];
    if (file) {
      const reader = new FileReader();
      reader.onload = (e) => setRawLog(e.target.result);
      reader.readAsText(file);
    }
  };

  const handleUploadClick = () => fileInputRef.current.click();

  const handleAnalyzeClick = async () => {
    if (!rawLog || !ticketId || !clientName) {
      setError('Please fill in Ticket ID, Client Name, and upload a log.');
      return;
    }

    setIsLoading(true);
    setError('');
    setAiResponse(null);
    setReportText('');

    try {
      const analyzeRequest = axios.post('https://superhack-nw1s.onrender.com/analyze', {
        rawLog,
        ticketId,
        clientName,
      });

      const reportRequest = axios.post('https://superhack-nw1s.onrender.com/generate-report', {
        rawLog,
        ticketId,
        clientName,
      });

      const [analyzeResult, reportResult] = await Promise.all([
        analyzeRequest,
        reportRequest,
      ]);

      setAiResponse(analyzeResult.data);
      setReportText(reportResult.data.report);

    } catch (err) {
      console.error('Error analyzing log:', err);
      setError('Failed to analyze log. Is the backend server running?');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDownloadReport = () => {
    const element = document.createElement('a');
    const file = new Blob([reportText], { type: 'text/plain' });
    element.href = URL.createObjectURL(file);
    element.download = `Report-${ticketId}.txt`;
    document.body.appendChild(element);
    element.click();
    document.body.removeChild(element);
  };

  const handleClear = () => {
    setTicketId('');
    setClientName('');
    setRawLog('');
    setAiResponse(null);
    setReportText('');
    setError('');
  };

  return (
    <> {/* Use a React Fragment as the root element */}
      <nav className="navbar">
        <div className="navbar-left">
          {/* Logo from the public/images folder */}
          <img src="/SUPERHACK/images/superhack-logo.png" alt="SuperHack 2025" className="navbar-logo" />
        </div>
        <div className="navbar-center">
          <span className="navbar-title">AI-Powered Worklog Automation</span>
        </div>
        <div className="navbar-right">
          {/* You can add more links or buttons here if needed */}
        </div>
      </nav>

      {/* The main container remains the same, just removed the old h1/p */}
      <div className="container">
        <header>
          {/* The main title is now part of the Navbar, so this header can be simpler or removed */}
          <p>Turn raw activity logs into billable reports instantly.</p>
        </header>

        <main>
          <div className="input-section">
            <h2>Step 1: Provide Context & Log</h2>
            <div className="input-grid">
              <input
                type="text"
                className="text-input"
                placeholder="Enter Ticket ID (e.g., T-456)"
                value={ticketId}
                onChange={(e) => setTicketId(e.target.value)}
              />
              <input
                type="text"
                className="text-input"
                placeholder="Enter Client Name (e.g., Client-XYZ)"
                value={clientName}
                onChange={(e) => setClientName(e.target.value)}
              />
            </div>
            <input
              type="file"
              accept=".txt"
              ref={fileInputRef}
              onChange={handleFileChange}
              style={{ display: 'none' }}
            />
            <button className="upload-button" onClick={handleUploadClick}>
              {rawLog ? 'log.txt Uploaded!' : 'Upload log.txt'}
            </button>
            <button
              className="analyze-button"
              onClick={handleAnalyzeClick}
              disabled={isLoading || !rawLog || !ticketId || !clientName}
            >
              {isLoading ? 'Analyzing...' : 'Generate Report'}
            </button>
            <button className="clear-button" onClick={handleClear}>Clear All</button>
          </div>

          {error && <div className="error-message">{error}</div>}

          {aiResponse && (
            <div className="results-section">
              <h2>Step 2: AI Analysis Results</h2>
              <div className="card-grid">
                {aiResponse.analyzed_activities.map((activity, index) => (
                  <ActivityCard
                    key={index}
                    description={activity.description}
                    time={activity.time_minutes}
                  />
                ))}
                <TotalTimeCard time={aiResponse.total_billable_time_minutes} />
              </div>

              <div className="report-generator">
                <h3>Manager-Ready Summary</h3>
                <textarea
                  className="report-textarea"
                  value={reportText}
                  readOnly
                />
                <button className="download-button" onClick={handleDownloadReport}>
                  Download Report (.txt)
                </button>
              </div>

              <div className="json-debugger">
                <h3>Raw JSON Output (for debug)</h3>
                <pre className="json-output">
                  {JSON.stringify(aiResponse, null, 2)}
                </pre>
              </div>
            </div>
          )}
        </main>
      </div>
    </>
  );
}

export default App;