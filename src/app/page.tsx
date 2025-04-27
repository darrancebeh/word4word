"use client"; // Add 'use client' because we are using hooks

import React, { useRef, useState, useEffect } from 'react';
import { motion } from 'framer-motion';
import { FiGithub, FiLinkedin, FiTwitter, FiMail } from 'react-icons/fi';

// Combined Home component containing LandingPage and Footer logic
export default function Home() {
  // --- State from LandingPage --- 
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false);
  const [feedbackCounts, setFeedbackCounts] = useState({ correct: 0, kinda: 0, wrong: 0 });
  type FeedbackKey = keyof typeof feedbackCounts;

  // --- Variables from Footer --- 
  const currentYear = new Date().getFullYear();

  // --- useEffect from LandingPage --- 
  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 800;
      canvas.height = 400;
      const context = canvas.getContext('2d');
      if (context) {
        context.fillStyle = 'white';
        context.fillRect(0, 0, canvas.width, canvas.height);
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 5;
        setCtx(context);
      }
    }
  }, []);

  // --- Helper functions from LandingPage --- 
  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx || isProcessing) return;
    setIsDrawing(true);
    const pos = getMousePos(event);
    ctx.beginPath();
    ctx.moveTo(pos.x, pos.y);
  };

  const draw = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!isDrawing || !ctx) return;
    const pos = getMousePos(event);
    ctx.lineTo(pos.x, pos.y);
    ctx.stroke();
  };

  const stopDrawing = () => {
    if (!ctx) return;
    ctx.closePath();
    setIsDrawing(false);
  };

  const getMousePos = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();
    let clientX, clientY;
    if (event.nativeEvent instanceof MouseEvent) {
      clientX = event.nativeEvent.clientX;
      clientY = event.nativeEvent.clientY;
    } else if (event.nativeEvent instanceof TouchEvent && event.nativeEvent.touches.length > 0) {
      clientX = event.nativeEvent.touches[0].clientX;
      clientY = event.nativeEvent.touches[0].clientY;
    } else {
      return { x: 0, y: 0 };
    }
    return {
      x: clientX - rect.left,
      y: clientY - rect.top
    };
  };

  const clearCanvas = () => {
    if (ctx && canvasRef.current) {
      ctx.fillStyle = 'white';
      ctx.fillRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setRecognizedText('');
    }
  };

  const processHandwriting = async () => {
    if (!canvasRef.current || isProcessing) return;
    setIsProcessing(true);
    setRecognizedText("Processing...");
    setFeedbackGiven(false);
    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');
      const response = await fetch('http://localhost:8000/api/recognize', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      if (!response.ok) {
        let errorDetail = 'Failed to process image';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || `API Error (${response.status})`;
        } catch (jsonError) { /* Ignore */ }
        throw new Error(errorDetail);
      }
      const result = await response.json();
      setRecognizedText(result.text || "No text recognized.");
    } catch (error) {
      setRecognizedText(`Error: ${error instanceof Error ? error.message : 'Failed to recognize handwriting.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleFeedback = (feedbackType: 'Correct' | 'Kinda' | 'Wrong') => {
    setFeedbackGiven(true);
    const key = feedbackType.toLowerCase() as FeedbackKey;
    setFeedbackCounts(prevCounts => ({ ...prevCounts, [key]: prevCounts[key] + 1 }));
  };

  const calculateAccuracy = () => {
    const { correct, kinda, wrong } = feedbackCounts;
    const totalFeedback = correct + kinda + wrong;
    if (totalFeedback === 0) return null;
    const weightedScore = (correct * 1) + (kinda * 0.5);
    const accuracy = (weightedScore / totalFeedback) * 100;
    return accuracy.toFixed(1);
  };

  const accuracyPercentage = calculateAccuracy();

  // --- Combined JSX --- 
  return (
    <main className="flex flex-col min-h-screen bg-gray-900 text-gray-300">
      {/* LandingPage Content Area (flex-grow) */}
      <div className="flex-grow flex flex-col items-center justify-center p-4 sm:p-6 md:p-8">
        <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">Word4Word</h1>
        <p className="text-gray-400 mb-4 sm:mb-6 text-center">Write some stuff with your cursor/touchscreen!</p>

        {isProcessing && <p className="text-yellow-400 mb-4 animate-pulse">Processing your handwriting...</p>}

        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mb-6">
          <canvas
            ref={canvasRef}
            className={`w-full aspect-[2/1] border-2 border-gray-700 bg-white rounded-lg shadow-lg cursor-crosshair ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
            onMouseDown={startDrawing}
            onMouseMove={draw}
            onMouseUp={stopDrawing}
            onMouseLeave={stopDrawing}
            onTouchStart={startDrawing}
            onTouchMove={draw}
            onTouchEnd={stopDrawing}
          />
        </div>

        <div className="flex flex-wrap justify-center gap-4 mb-6">
          <button
            onClick={clearCanvas}
            disabled={isProcessing}
            className={`px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Clear Canvas
          </button>
          <button
            onClick={processHandwriting}
            disabled={isProcessing}
            className={`px-5 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
          >
            Submit Drawing
          </button>
        </div>

        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl p-4 sm:p-5 border border-gray-700 bg-gray-800 rounded-lg shadow-md mb-6">
          <h2 className="text-lg font-semibold mb-3 text-white">Recognized Text:</h2>
          <div className="whitespace-pre-wrap bg-gray-700 text-gray-100 p-3 rounded min-h-[60px] break-words">
            {recognizedText || <span className="text-gray-500">Draw on the canvas above and click Submit...</span>}
          </div>
          {recognizedText && !isProcessing && !recognizedText.startsWith("Processing") && !recognizedText.startsWith("Error") && (
            <div className="mt-4 flex flex-wrap justify-center items-center gap-3">
              {!feedbackGiven ? (
                <>
                  <span className="text-gray-400 self-center mr-2">Was this accurate?</span>
                  <button onClick={() => handleFeedback('Correct')} className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50">Correct</button>
                  <button onClick={() => handleFeedback('Kinda')} className="px-4 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50">Kinda</button>
                  <button onClick={() => handleFeedback('Wrong')} className="px-4 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50">Wrong</button>
                </>
              ) : (
                <p className="text-green-400">Thanks for your feedback!</p>
              )}
            </div>
          )}
        </div>

        <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl p-3 border border-gray-700 bg-gray-800 rounded-lg shadow-md flex flex-wrap justify-around text-center text-sm">
          <div><span className="font-semibold text-green-500">Correct:</span> {feedbackCounts.correct}</div>
          <div><span className="font-semibold text-yellow-500">Kinda:</span> {feedbackCounts.kinda}</div>
          <div><span className="font-semibold text-red-500">Wrong:</span> {feedbackCounts.wrong}</div>
          {accuracyPercentage !== null && (
            <div className="w-full mt-2 pt-2 border-t border-gray-700">
              <span className="font-semibold text-blue-400">Session Accuracy:</span> {accuracyPercentage}%
            </div>
          )}
        </div>
      </div>

      {/* Footer Content Area */}
      <motion.footer
        className="w-full py-4 px-4 sm:px-8 bg-opacity-50 text-gray-400 text-sm font-[family-name:var(--font-geist-mono)] border-t border-gray-800"
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.5, delay: 0.2 }}
      >
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row justify-between items-center gap-6">
          <div className="flex gap-5">
            <motion.a href="https://github.com/darrancebeh" target="_blank" rel="noopener noreferrer" aria-label="GitHub Profile" className="transition-colors duration-300 hover:text-gray-200" whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.9 }}>
              <FiGithub className="w-5 h-5" />
            </motion.a>
            <motion.a href="https://linkedin.com/in/darrancebeh" target="_blank" rel="noopener noreferrer" aria-label="LinkedIn Profile" className="transition-colors duration-300 hover:text-gray-200" whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.9 }}>
              <FiLinkedin className="w-5 h-5" />
            </motion.a>
            <motion.a href="https://x.com/quant_in_my" target="_blank" rel="noopener noreferrer" aria-label="X Profile" className="transition-colors duration-300 hover:text-gray-200" whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.9 }}>
              <FiTwitter className="w-5 h-5" />
            </motion.a>
            <motion.a href="mailto:darrancebeh@gmail.com" aria-label="Send Email" className="transition-colors duration-300 hover:text-gray-200" whileHover={{ scale: 1.15, y: -2 }} whileTap={{ scale: 0.9 }}>
              <FiMail className="w-5 h-5" />
            </motion.a>
          </div>
          <div className="text-center sm:text-right">
            <p>&copy; {currentYear} Darrance Beh Heng Shek. All Rights Reserved.</p>
            <p className="text-xs text-gray-500 mt-1">Built with Next.js, React, FastAPI, PaddleOCR, and Pillow.</p>
          </div>
        </div>
      </motion.footer>
    </main>
  );
}
