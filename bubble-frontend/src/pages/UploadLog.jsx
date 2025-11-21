import React, { useState, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { ticketApi } from '../services/ticketApi';
import {
  ArrowLeft,
  Upload,
  FileText,
  AlertCircle,
  CheckCircle,
  Download,
  Clock,
  DollarSign,
  Activity,
  Loader
} from 'lucide-react';
import toast from 'react-hot-toast';

const UploadLog = () => {
  const { ticketId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const fileInputRef = useRef(null);

  const [selectedFile, setSelectedFile] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadResult, setUploadResult] = useState(null);
  const [error, setError] = useState('');

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      // Validate file type
      if (!file.name.endsWith('.txt') && !file.name.endsWith('.log')) {
        toast.error('Please select a .txt or .log file');
        return;
      }

      // Validate file size (max 10MB)
      if (file.size > 10 * 1024 * 1024) {
        toast.error('File size must be less than 10MB');
        return;
      }

      setSelectedFile(file);
      setError('');
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      toast.error('Please select a log file');
      return;
    }

    try {
      setUploading(true);
      setError('');

      const result = await ticketApi.uploadLog(ticketId, selectedFile);

      if (result.success) {
        setUploadResult(result.data);
        toast.success('Log uploaded and report generated successfully!');
      } else {
        setError(result.error);
        toast.error(result.error || 'Failed to upload log');
      }
    } catch (err) {
      setError('An unexpected error occurred');
      toast.error('An unexpected error occurred');
    } finally {
      setUploading(false);
    }
  };

  const handleDownloadReport = () => {
    if (uploadResult?.ticket?.generatedReport) {
      ticketApi.downloadReport(
        uploadResult.ticket.generatedReport,
        uploadResult.ticket.ticketId,
        uploadResult.ticket.clientName
      );
    }
  };

  const handleBackToTicket = () => {
    navigate(`/tickets/${ticketId}`);
  };

  const resetUpload = () => {
    setSelectedFile(null);
    setUploadResult(null);
    setError('');
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center space-x-4">
          <button
            onClick={handleBackToTicket}
            className="inline-flex items-center text-gray-500 hover:text-gray-700 transition-colors"
          >
            <ArrowLeft className="h-5 w-5 mr-1" />
            Back to Ticket
          </button>
        </div>
      </div>

      <div className="bg-white rounded-lg shadow">
        <div className="px-6 py-4 border-b border-gray-200">
          <div className="flex items-center">
            <div className="flex items-center justify-center h-12 w-12 rounded-full bg-blue-100 mr-4">
              <Upload className="h-6 w-6 text-blue-600" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-gray-900">Upload Activity Log</h1>
              <p className="text-gray-600">Upload your activity log for ticket {ticketId}</p>
            </div>
          </div>
        </div>

        <div className="p-6">
          {!uploadResult ? (
            <div className="space-y-6">
              {/* Instructions */}
              <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <Activity className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-blue-800">
                      How to Upload Your Activity Log
                    </h3>
                    <div className="mt-2 text-sm text-blue-700">
                      <ol className="list-decimal list-inside space-y-1">
                        <li>Run the activity tracking agent on your computer while working on this ticket</li>
                        <li>Stop the agent when you're done (Ctrl+C)</li>
                        <li>Upload the generated log.txt file using the button below</li>
                        <li>Our AI will analyze your work and generate a professional report</li>
                      </ol>
                    </div>
                  </div>
                </div>
              </div>

              {/* File Upload Area */}
              <div className="border-2 border-dashed border-gray-300 rounded-lg p-6">
                <div className="text-center">
                  <FileText className="mx-auto h-12 w-12 text-gray-400" />
                  <div className="mt-4">
                    <h3 className="text-sm font-medium text-gray-900">
                      {selectedFile ? 'File Selected' : 'Select Activity Log File'}
                    </h3>
                    {selectedFile ? (
                      <div className="mt-2">
                        <p className="text-sm text-green-600 font-medium">{selectedFile.name}</p>
                        <p className="text-xs text-gray-500">
                          Size: {Math.round(selectedFile.size / 1024)} KB
                        </p>
                        <button
                          onClick={resetUpload}
                          className="mt-2 text-xs text-blue-600 hover:text-blue-800 underline"
                        >
                          Choose different file
                        </button>
                      </div>
                    ) : (
                      <p className="mt-1 text-sm text-gray-600">
                        Upload your .txt or .log file (max 10MB)
                      </p>
                    )}
                  </div>
                  <div className="mt-6">
                    <input
                      ref={fileInputRef}
                      type="file"
                      accept=".txt,.log"
                      onChange={handleFileSelect}
                      className="hidden"
                    />
                    {!selectedFile ? (
                      <button
                        type="button"
                        onClick={handleUploadClick}
                        className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Upload className="h-4 w-4 mr-2" />
                        Choose File
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={handleUpload}
                        disabled={uploading}
                        className="inline-flex items-center px-6 py-3 border border-transparent text-base font-medium rounded-md text-white bg-blue-600 hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                      >
                        {uploading ? (
                          <>
                            <Loader className="h-5 w-5 mr-2 animate-spin" />
                            Analyzing Log...
                          </>
                        ) : (
                          <>
                            <Upload className="h-5 w-5 mr-2" />
                            Upload & Analyze
                          </>
                        )}
                      </button>
                    )}
                  </div>
                </div>
              </div>

              {/* Error Display */}
              {error && (
                <div className="bg-red-50 border border-red-200 rounded-lg p-4">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <AlertCircle className="h-5 w-5 text-red-400" />
                    </div>
                    <div className="ml-3">
                      <h3 className="text-sm font-medium text-red-800">Upload Error</h3>
                      <div className="mt-2 text-sm text-red-700">
                        <p>{error}</p>
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* Agent Setup Info */}
              <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <FileText className="h-5 w-5 text-gray-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-gray-800">
                      Don't have an activity log?
                    </h3>
                    <div className="mt-2 text-sm text-gray-600">
                      <p>You need to run the activity tracking agent on your computer first.</p>
                      <p className="mt-1">
                        The agent captures your window activity and creates a log.txt file that can be uploaded here.
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            /* Results Display */
            <div className="space-y-6">
              {/* Success Message */}
              <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                <div className="flex">
                  <div className="flex-shrink-0">
                    <CheckCircle className="h-5 w-5 text-green-400" />
                  </div>
                  <div className="ml-3">
                    <h3 className="text-sm font-medium text-green-800">
                      Log Successfully Analyzed
                    </h3>
                    <div className="mt-2 text-sm text-green-700">
                      <p>Your activity log has been processed and a professional report has been generated.</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Summary Stats */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Activity className="h-8 w-8 text-blue-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-blue-900">Activities Found</p>
                      <p className="text-2xl font-bold text-blue-600">
                        {uploadResult.ticket.analyzedActivities?.length || 0}
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-green-50 border border-green-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <Clock className="h-8 w-8 text-green-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-green-900">Billable Time</p>
                      <p className="text-2xl font-bold text-green-600">
                        {Math.round((uploadResult.ticket.totalBillableTime || 0) / 60 * 100) / 100}h
                      </p>
                    </div>
                  </div>
                </div>

                <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <DollarSign className="h-8 w-8 text-yellow-600" />
                    </div>
                    <div className="ml-3">
                      <p className="text-sm font-medium text-yellow-900">Total Cost</p>
                      <p className="text-2xl font-bold text-yellow-600">
                        ${uploadResult.ticket.totalCost || 0}
                      </p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Analyzed Activities */}
              {uploadResult.ticket.analyzedActivities && uploadResult.ticket.analyzedActivities.length > 0 && (
                <div>
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Analyzed Activities</h3>
                  <div className="space-y-3">
                    {uploadResult.ticket.analyzedActivities.map((activity, index) => (
                      <div key={index} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-center justify-between">
                          <div className="flex-1">
                            <p className="text-gray-900">{activity.description}</p>
                            <div className="flex items-center space-x-4 mt-2 text-sm text-gray-500">
                              <div className="flex items-center">
                                <Clock className="h-4 w-4 mr-1" />
                                {activity.timeMinutes} minutes
                              </div>
                              <div className="flex items-center">
                                <DollarSign className="h-4 w-4 mr-1" />
                                {activity.isBillable ? (
                                  <span className="text-green-600 font-medium">Billable</span>
                                ) : (
                                  <span className="text-gray-500">Non-billable</span>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}

              {/* Generated Report */}
              {uploadResult.ticket.generatedReport && (
                <div>
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-900">Generated Report</h3>
                    <button
                      onClick={handleDownloadReport}
                      className="inline-flex items-center px-3 py-1.5 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                    >
                      <Download className="h-4 w-4 mr-1" />
                      Download
                    </button>
                  </div>
                  <div className="bg-gray-50 border border-gray-200 rounded-lg p-4">
                    <p className="text-gray-900 whitespace-pre-wrap">
                      {uploadResult.ticket.generatedReport}
                    </p>
                  </div>
                </div>
              )}

              {/* Actions */}
              <div className="flex items-center justify-between pt-6 border-t border-gray-200">
                <button
                  onClick={resetUpload}
                  className="inline-flex items-center px-4 py-2 border border-gray-300 rounded-md text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  Upload Another Log
                </button>
                <button
                  onClick={handleBackToTicket}
                  className="inline-flex items-center px-4 py-2 bg-blue-600 border border-transparent rounded-md text-sm font-medium text-white hover:bg-blue-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                >
                  View Ticket Details
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default UploadLog;
