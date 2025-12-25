import React, { useState, useRef } from "react";
import {
  Camera,
  Upload,
  AlertTriangle,
  CheckCircle,
  Loader2,
  ArrowLeft,
  Mic,
} from "lucide-react";
import { analyzeEmergencyImage } from "../services/geminiService";
import { AnalysisResult } from "../types";

interface BystanderViewProps {
  onBack: () => void;
  onReportSent: () => void;
}

export const BystanderView: React.FC<BystanderViewProps> = ({
  onBack,
  onReportSent,
}) => {
  const [image, setImage] = useState<string | null>(null);
  const [analyzing, setAnalyzing] = useState(false);
  const [report, setReport] = useState<AnalysisResult | null>(null);

  // 🎙️ Voice (optional)
  const [listening, setListening] = useState(false);
  const [voiceText, setVoiceText] = useState("");
  const [language, setLanguage] = useState<"en-IN" | "hi-IN" | "mr-IN">("en-IN");

  const fileInputRef = useRef<HTMLInputElement>(null);
  const recognitionRef = useRef<any>(null);

  /* ---------------- IMAGE UPLOAD ---------------- */

  const handleFileChange = async (
    e: React.ChangeEvent<HTMLInputElement>
  ) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = async () => {
      const base64String = reader.result as string;
      setImage(base64String);
      setReport(null);
      await performAnalysis(base64String);
    };
    reader.readAsDataURL(file);
  };

  /* ---------------- VOICE (OPTIONAL) ---------------- */

  const startListening = () => {
    const SpeechRecognition =
      (window as any).SpeechRecognition ||
      (window as any).webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert("Voice recognition not supported in this browser");
      return;
    }

    const recognition = new SpeechRecognition();
    recognition.lang = language;
    recognition.continuous = false;
    recognition.interimResults = false;

    recognition.onstart = () => setListening(true);

    recognition.onresult = (event: any) => {
      const transcript = event.results[0][0].transcript;
      setVoiceText(transcript);
    };

    recognition.onerror = () => setListening(false);
    recognition.onend = () => setListening(false);

    recognition.start();
    recognitionRef.current = recognition;
  };

  /* ---------------- GEMINI ANALYSIS ---------------- */

  const performAnalysis = async (base64Image: string) => {
    setAnalyzing(true);
    try {
      const jsonString = await analyzeEmergencyImage(
        base64Image,
        voiceText // optional context
      );
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

  /* ---------------- IMAGE VALIDATION RULE ---------------- */

  const isImageValid =
    report &&
    report.severity &&
    report.type &&
    report.severity.toLowerCase() !== "unknown";

  const getSeverityColor = (severity: string) => {
    switch (severity?.toLowerCase()) {
      case "high":
        return "bg-red-100 text-red-800 border-red-200";
      case "medium":
        return "bg-orange-100 text-orange-800 border-orange-200";
      case "low":
        return "bg-yellow-100 text-yellow-800 border-yellow-200";
      default:
        return "bg-gray-100 text-gray-800 border-gray-200";
    }
  };

  return (
    <div className="min-h-[100dvh] bg-gray-50 flex flex-col items-center p-4">
      {/* Header */}
      <div className="w-full max-w-md flex items-center justify-between mb-6 pt-4">
        <button
          onClick={onBack}
          className="p-2 hover:bg-gray-200 rounded-full text-gray-600"
        >
          <ArrowLeft size={24} />
        </button>
        <h1 className="text-xl font-bold text-gray-800">
          Report Incident
        </h1>
        <div className="w-10" />
      </div>

      <div className="w-full max-w-md space-y-6 flex-1 overflow-y-auto pb-4">
        {/* IMAGE UPLOAD */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border">
          {!image ? (
            <div
              onClick={() => fileInputRef.current?.click()}
              className="border-2 border-dashed rounded-xl p-10 flex flex-col items-center cursor-pointer hover:border-red-400 hover:bg-red-50"
            >
              <div className="bg-red-100 p-4 rounded-full text-red-500 mb-4">
                <Camera size={32} />
              </div>
              <h3 className="font-semibold">Upload Accident Photo</h3>
              <p className="text-sm text-gray-400 mt-2 text-center">
                Take or upload a clear accident photo
              </p>
            </div>
          ) : (
            <div className="relative rounded-xl overflow-hidden bg-black">
              <img
                src={image}
                alt="Accident"
                className="w-full h-64 object-contain"
              />
              {analyzing && (
                <div className="absolute inset-0 bg-black/60 flex flex-col items-center justify-center text-white">
                  <Loader2
                    size={48}
                    className="animate-spin mb-4 text-red-500"
                  />
                  <p>Analyzing Scene...</p>
                </div>
              )}
              {!analyzing && (
                <button
                  onClick={() => {
                    setImage(null);
                    setReport(null);
                  }}
                  className="absolute top-2 right-2 bg-black/50 text-white p-2 rounded-full"
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

        {/* VOICE (OPTIONAL INFO ONLY) */}
        <div className="bg-white p-6 rounded-2xl shadow-sm border space-y-4">
          <h3 className="font-semibold">
            Describe What Happened (Optional)
          </h3>

          <select
            value={language}
            onChange={(e) =>
              setLanguage(e.target.value as any)
            }
            className="w-full border rounded-lg px-3 py-2"
          >
            <option value="en-IN">English</option>
            <option value="hi-IN">Hindi (हिंदी)</option>
            <option value="mr-IN">Marathi (मराठी)</option>
          </select>

          <button
            onClick={startListening}
            className={`w-full flex items-center justify-center gap-2 py-3 rounded-xl font-bold ${
              listening
                ? "bg-red-600 text-white animate-pulse"
                : "bg-gray-100 hover:bg-gray-200"
            }`}
          >
            <Mic />
            {listening ? "Listening..." : "Tap to Speak"}
          </button>

          {voiceText && (
            <div className="bg-gray-50 border rounded-lg p-3 text-sm">
              <p className="text-xs font-semibold text-gray-500 mb-1">
                Captured Voice
              </p>
              {voiceText}
            </div>
          )}
        </div>

        {/* AI REPORT */}
        {report && !analyzing && (
          <div className="bg-white rounded-2xl shadow-lg border-l-4 border-red-500">
            <div className="p-6">
              <div className="flex justify-between mb-4">
                <h2 className="font-bold flex items-center gap-2">
                  <AlertTriangle className="text-red-500" />
                  AI Triage Report
                </h2>
                <span
                  className={`px-3 py-1 rounded-full border text-sm font-bold ${getSeverityColor(
                    report.severity
                  )}`}
                >
                  {report.severity.toUpperCase()}
                </span>
              </div>

              <p className="text-sm text-gray-500">Incident Type</p>
              <p className="font-medium mb-3">{report.type}</p>

              <p className="text-sm text-gray-500">
                Recommended Action
              </p>
              <p className="font-semibold">
                {report.immediateAction}
              </p>

              {/* ✅ SUBMIT ONLY IF IMAGE VALID */}
              {isImageValid ? (
                <button
                  onClick={onReportSent}
                  className="mt-6 w-full bg-red-600 hover:bg-red-700 text-white py-3 rounded-xl font-bold flex items-center justify-center gap-2"
                >
                  <CheckCircle size={20} />
                  Confirm & Request Help
                </button>
              ) : (
                <div className="mt-6 bg-yellow-50 border border-yellow-300 text-yellow-800 text-sm p-4 rounded-xl">
                  ⚠️ Image unclear or incident not detected.
                  <br />
                  Please upload a clearer accident photo to continue.
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};