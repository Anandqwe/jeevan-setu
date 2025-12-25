import React, { useState, useRef } from 'react';
import { Camera, Upload, AlertTriangle, CheckCircle, Loader2, ArrowLeft } from 'lucide-react';
import { analyzeEmergencyImage } from '../services/geminiService';
import { AnalysisResult } from '../types';

interface BystanderViewProps {
  onBack: () => void;
  onReportSent: () => void;
}

export const BystanderView: React.FC<BystanderViewProps> = ({ onBack, onReportSent }) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisResult | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const handleFileChange = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Convert to Base64 for display and API
    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setImage(base64String);
      setReport(null);
      await performAnalysis(base64String);
    };
    reader.readAsDataURL(file);
  };

  const performAnalysis = async (base64Image: string) => {
    setAnalyzing(true);
    try {
      const jsonString = await analyzeEmergencyImage(base64Image);
      if (jsonString) {
        const result = JSON.parse(jsonString);
        setReport(result);
      }
    } catch (error) {
      console.error("Failed to parse analysis result", error);
    } finally {
      setAnalyzing(false);
    }
  };

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case 'high': return 'bg-red-100 text-red-800 border-red-200';
      case 'medium': return 'bg-orange-100 text-orange-800 border-orange-200';
      case 'low': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center p-4">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 pt-4">
        <button onClick={onBack} className="p-2 hover:bg-gray-200 rounded-full text-gray-600 touch-manipulation">
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">Report Incident</h1>
        <div className="w-10"></div> {/* Spacer */}
      </div>

      <div className="w-full max-w-md space-y-6 flex-1 overflow-y-auto pb-4">
        
        {/* Upload Card */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border border-gray-200">
          {!image ? (
            <div 
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed border-gray-300 rounded-xl p-10 flex flex-col items-center justify-center cursor-pointer hover:border-red-400 hover:bg-red-50 transition-colors"
            >
              <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4">
                <Camera size={32} />
              </div>
              <h3 className="font-semibold text-gray-700">Upload Accident Photo</h3>
              <p className="text-sm text-gray-400 mt-2 text-center">Take a photo or upload from gallery to analyze severity</p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden shadow-inner bg-black">
              <img src={image} alt="Accident Scene" className="w-full h-64 object-contain opacity-90" />
              {analyzing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white backdrop-blur-sm">
                  <Loader2 size={48} className="animate-spin mb-4 text-red-500" />
                  <p className="font-semibold animate-pulse">Gemini AI Analyzing Scene...</p>
                </div>
              )}
              {!analyzing && (
                <button 
                  onClick={() => { setImage(null); setReport(null); }}
                  className="absolute top-2 right-2 bg-black/50 hover:bg-black/70 text-white p-2 rounded-full touch-manipulation"
                >
                  <Upload size={16} />
                </button>
              )}
            </div>
          )}
          <input 
            type="file" 
            ref={fileInputRef} 
            className="hidden" 
            accept="image/*" 
            onChange={handleFileChange} 
          />
        </div>

        {/* Report Result Card */}
        {report && !analyzing && (
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-red-500 overflow-hidden animate-in slide-in-from-bottom-4 fade-in duration-500">
            <div className="p-6">
              <div className="flex justify-between items-start mb-4">
                <h2 className="text-xl font-bold text-gray-900 flex items-center gap-2">
                  <AlertTriangle className="text-red-500" size={24} />
                  AI Triage Report
                </h2>
                <span className={`px-3 py-1 rounded-full text-sm font-bold border ${getSeverityColor(report.severity)}`}>
                  {report.severity.toUpperCase()} SEVERITY
                </span>
              </div>
              
              <div className="space-y-4">
                <div>
                  <p className="text-xs text-gray-500 uppercase font-semibold">Incident Type</p>
                  <p className="font-medium text-gray-800">{report.type}</p>
                </div>
                
                <div className="bg-gray-50 p-4 rounded-lg border border-gray-100">
                  <p className="text-xs text-gray-500 uppercase font-bold mb-1">Recommended Action</p>
                  <p className="text-gray-900 font-semibold">{report.immediateAction}</p>
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-gray-100">
                <button 
                  onClick={onReportSent}
                  className="w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold text-lg shadow-md flex items-center justify-center gap-2 transition-transform active:scale-95 touch-manipulation"
                >
                  <CheckCircle size={20} />
                  Confirm & Request Help
                </button>
                <p className="text-xs text-center text-gray-400 mt-2">
                  By confirming, you agree to share location data with responders.
                </p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};