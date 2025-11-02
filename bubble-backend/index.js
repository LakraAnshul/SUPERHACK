// Import necessary packages
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config(); // Load environment variables from .env file

// --- Configuration ---
const app = express();
const port = 3000; // You can change this port if needed

// --- Middleware ---
app.use(cors()); // Enable Cross-Origin Resource Sharing
app.use(express.json()); // Enable parsing of JSON request bodies

// --- Setup Google AI Client ---
// Make sure your .env file has API_KEY=...
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' });

// --- API Endpoint ---
app.post('/analyze', async (req, res) => {
  console.log('Received /analyze request...');

  try {
    // 1. Get the raw log text from the request body
    const { rawLog } = req.body;

    if (!rawLog) {
      return res.status(400).json({ error: 'Missing "rawLog" in request body' });
    }

    // 2. Define the "Master Prompt" (Task 4)
    // This is the prompt we designed. We insert the user's rawLog.
    const masterPrompt = `
You are an AI for an IT services company, and your job is to create a timesheet from a raw activity log. The technician is working on **Ticket T-456 for Client-XYZ**.

Analyze the following log, which contains window titles and timestamps. Group activities, assign them to the ticket, and estimate the time spent. Ignore non-work activity like "YouTube".

Output **ONLY** a valid JSON object in the following structure:
{
  "ticket_id": "T-456",
  "client_name": "Client-XYZ",
  "analyzed_activities": [
    { "description": "Working on SuperOps ticket", "time_minutes": 2 },
    { "description": "Development work in VSCode", "time_minutes": 1 },
    { "description": "Using Terminal", "time_minutes": 2 },
    { "description": "Writing email in Outlook", "time_minutes": 1 }
  ],
  "total_billable_time_minutes": 6
}

---
**Raw Log:**
${rawLog}
---

**Expected JSON Output:**
`;

    // 3. Call the AI
    const result = await model.generateContent(masterPrompt);
    const response = await result.response;
    let aiResponseText = response.text();

    console.log('AI Response (Raw):', aiResponseText);

    // 4. Clean and Parse the AI response
    // AI models often wrap JSON in ```json ... ```. This code removes it.
    if (aiResponseText.startsWith('```json')) {
      aiResponseText = aiResponseText.substring(7, aiResponseText.length - 3).trim();
    }

    // Convert the clean text string into a real JSON object
    const jsonOutput = JSON.parse(aiResponseText);

    // 5. Send the clean JSON back to the client
    res.status(200).json(jsonOutput);

  } catch (error) {
    console.error('Error in /analyze endpoint:', error);
    res.status(500).json({ error: 'Failed to analyze log', details: error.message });
  }
});

// --- Start the Server ---
app.listen(port, () => {
  console.log(`🚀 AI Brain server running at http://localhost:${port}`);
});