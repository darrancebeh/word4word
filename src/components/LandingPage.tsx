'use client';

import React, { useRef, useState, useEffect } from 'react';

function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [feedbackGiven, setFeedbackGiven] = useState(false); // State to track if feedback was given
  const [feedbackCounts, setFeedbackCounts] = useState({ correct: 0, kinda: 0, wrong: 0 }); // State for feedback counts

  type FeedbackKey = keyof typeof feedbackCounts; // Define type for keys

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set a larger base size, but the actual display size will be controlled by CSS
      canvas.width = 800; // Larger base resolution
      canvas.height = 400; // Larger base resolution
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
      // Don't reset counts on clear, keep session stats
    }
  };

  const processHandwriting = async () => {
    if (!canvasRef.current || isProcessing) {
      return;
    }

    console.log("Starting handwriting processing..."); // Added log
    setIsProcessing(true);
    setRecognizedText("Processing...");
    setFeedbackGiven(false); // Reset feedback state on new submission
    // Don't reset counts on submit

    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');
      console.log("Canvas data URL obtained."); // Added log

      // Send image data to the backend API (running on port 8000)
      console.log("Sending request to backend..."); // Added log
      const response = await fetch('http://localhost:8000/api/recognize', { // Explicitly target backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageDataUrl }),
      });
      console.log("Received response from backend, status:", response.status); // Added log

      if (!response.ok) {
        // Try to parse error detail from backend, provide fallback
        let errorDetail = 'Failed to process image';
        try {
          const errorData = await response.json();
          errorDetail = errorData.detail || `Unknown processing error (status ${response.status})`;
          console.error("Backend error details:", errorData); // Added log
        } catch (jsonError) {
          console.error("Could not parse error JSON from backend:", jsonError); // Added log
          errorDetail = `API Error (${response.status}), could not parse error response.`;
        }
        throw new Error(errorDetail);
      }

      const result = await response.json();
      console.log("Backend result:", result); // Added log
      setRecognizedText(result.text || "No text recognized.");

    } catch (error) {
      console.error("Error processing handwriting:", error); // Existing log
      // Display a user-friendly error message
      setRecognizedText(`Error: ${error instanceof Error ? error.message : 'Failed to recognize handwriting.'}`);
    } finally {
      console.log("Finished processing, setting isProcessing to false."); // Added log
      setIsProcessing(false);
    }
  };

  // --- Feedback Handlers ---
  const handleFeedback = (feedbackType: 'Correct' | 'Kinda' | 'Wrong') => {
    console.log(`Feedback received: ${feedbackType}`);
    setFeedbackGiven(true);

    const key = feedbackType.toLowerCase() as FeedbackKey;

    // Update counts
    setFeedbackCounts(prevCounts => ({
      ...prevCounts,
      [key]: prevCounts[key] + 1 
    }));
  };

  // --- Calculate Accuracy ---
  const calculateAccuracy = () => {
    const { correct, kinda, wrong } = feedbackCounts;
    const totalFeedback = correct + kinda + wrong;
    if (totalFeedback === 0) {
      return null; 
    }
    const weightedScore = (correct * 1) + (kinda * 0.5);
    const accuracy = (weightedScore / totalFeedback) * 100;
    return accuracy.toFixed(1); // Return accuracy rounded to one decimal place
  };

  const accuracyPercentage = calculateAccuracy();

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 sm:p-6 md:p-8 text-gray-300">
      <h1 className="text-3xl sm:text-4xl font-bold mb-2 text-white">Word4Word</h1>
      <p className="text-gray-400 mb-4 sm:mb-6 text-center">Write some stuff with your cursor/touchscreen!</p>

      {isProcessing && <p className="text-yellow-400 mb-4 animate-pulse">Processing your handwriting...</p>}

      {/* Canvas Container for responsive sizing */}
      <div className="w-full max-w-sm sm:max-w-md md:max-w-lg lg:max-w-2xl xl:max-w-3xl mb-6">
        <canvas
          ref={canvasRef}
          // Use Tailwind for responsive width/height and aspect ratio
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

      {/* Group buttons together */}
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

      {/* Results container */}
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
                <button
                  onClick={() => handleFeedback('Correct')}
                  className="px-4 py-1 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors focus:outline-none focus:ring-2 focus:ring-green-500 focus:ring-opacity-50"
                >
                  Correct
                </button>
                <button
                  onClick={() => handleFeedback('Kinda')}
                  className="px-4 py-1 bg-yellow-600 text-white rounded-md hover:bg-yellow-700 transition-colors focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:ring-opacity-50"
                >
                  Kinda
                </button>
                <button
                  onClick={() => handleFeedback('Wrong')}
                  className="px-4 py-1 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
                >
                  Wrong
                </button>
              </>
            ) : (
              <p className="text-green-400">Thanks for your feedback!</p>
            )}
          </div>
        )}
      </div>

      {/* --- Session Stats --- */}
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
      {/* --- End Session Stats --- */}

    </div>
  );
}

export default LandingPage;
