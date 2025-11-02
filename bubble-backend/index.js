// Import necessary packages
const express = require('express');
const cors = require('cors');
const { GoogleGenerativeAI } = require('@google/generative-ai');
require('dotenv').config();

// --- Configuration ---
const app = express();
const port = 3000;

// --- Middleware ---
app.use(cors());
app.use(express.json()); // Use express.json() to parse raw text as well
app.use(express.text()); // To handle plain text requests if needed

// --- Setup Google AI Client ---
const genAI = new GoogleGenerativeAI(process.env.API_KEY);
const model = genAI.getGenerativeModel({ model: 'gemini-2.5-flash' }); // Or 'gemini-pro'

// --- API Endpoint 1: Analyze Timestamps (UPGRADED) ---
app.post('/analyze', async (req, res) => {
  console.log('Received /analyze request...');

  try {
    // NOW we accept ticketId and clientName from the frontend
    const { rawLog, ticketId, clientName } = req.body;

    if (!rawLog || !ticketId || !clientName) {
      return res.status(400).json({ 
        error: 'Missing "rawLog", "ticketId", or "clientName" in request body' 
      });
    }

    // The prompt is now DYNAMIC
    const masterPrompt = `
You are an AI for an IT services company. Your job is to create a timesheet from a raw activity log. The technician is working on **Ticket ${ticketId} for ${clientName}**.

Analyze the following log. Group activities, assign them to the ticket, and estimate the time spent. Ignore non-work activity like "YouTube" or "Spotify".

Output **ONLY** a valid JSON object in the following structure:
{
  "ticket_id": "${ticketId}",
  "client_name": "${clientName}",
  "analyzed_activities": [
    { "description": "Short description of activity", "time_minutes": 2 },
    { "description": "Another activity", "time_minutes": 5 }
  ],
  "total_billable_time_minutes": 7
}

---
**Raw Log:**
${rawLog}
---

**Expected JSON Output:**
`;

    const result = await model.generateContent(masterPrompt);
    const response = await result.response;
    let aiResponseText = response.text();

    if (aiResponseText.startsWith('```json')) {
      aiResponseText = aiResponseText.substring(7, aiResponseText.length - 3).trim();
    }

    const jsonOutput = JSON.parse(aiResponseText);
    res.status(200).json(jsonOutput);

  } catch (error) {
    console.error('Error in /analyze endpoint:', error);
    res.status(500).json({ error: 'Failed to analyze log', details: error.message });
  }
});

// --- API Endpoint 2: Generate Report (NEW) ---
app.post('/generate-report', async (req, res) => {
  console.log('Received /generate-report request...');
  try {
    const { rawLog, ticketId, clientName } = req.body;

    if (!rawLog || !ticketId || !clientName) {
      return res.status(400).json({ 
        error: 'Missing "rawLog", "ticketId", or "clientName" in request body' 
      });
    }

    // This is a NEW prompt for a different purpose
    const reportPrompt = `
You are an IT technician for an MSP, writing a summary report for your manager about the work you just completed on **Ticket ${ticketId} for ${clientName}**.

Based on the provided raw activity log, write a professional, concise summary. 
- Start with the ticket and client.
- Briefly list the key actions you took (e.g., "SSH'd into server," "ran patch script," "emailed client").
- Conclude with the status (e.g., "The issue is now resolved.").
- Keep it in a single paragraph.

---
**Raw Log:**
${rawLog}
---

**Report Output:**
`;

    const result = await model.generateContent(reportPrompt);
    const response = await result.response;
    const reportText = response.text();

    // Send back the raw text
    res.status(200).json({ report: reportText });

  } catch (error) {
    console.error('Error in /generate-report endpoint:', error);
    res.status(500).json({ error: 'Failed to generate report', details: error.message });
  }
});


// --- Start the Server ---
app.listen(port, () => {
  console.log(`🚀 AI Brain server running at http://localhost:${port}`);
});