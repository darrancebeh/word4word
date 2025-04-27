'use client';

import React, { useRef, useState, useEffect } from 'react';

function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      canvas.width = 500;
      canvas.height = 300;
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
    processHandwriting();
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
    if (!canvasRef.current || isProcessing) {
      return;
    }

    setIsProcessing(true);
    setRecognizedText("Processing...");

    try {
      const canvas = canvasRef.current;
      const imageDataUrl = canvas.toDataURL('image/png');

      // Send image data to the backend API (running on port 8000)
      const response = await fetch('http://localhost:8000/api/recognize', { // Explicitly target backend URL
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ image: imageDataUrl }),
      });

      if (!response.ok) {
        // Try to parse error detail from backend, provide fallback
        const errorData = await response.json().catch(() => ({ detail: 'Unknown processing error' }));
        throw new Error(`API Error (${response.status}): ${errorData.detail || 'Failed to process image'}`);
      }

      const result = await response.json();
      setRecognizedText(result.text || "No text recognized.");

    } catch (error) {
      console.error("Error processing handwriting:", error);
      // Display a user-friendly error message
      setRecognizedText(`Error: ${error instanceof Error ? error.message : 'Failed to recognize handwriting.'}`);
    } finally {
      setIsProcessing(false);
    }
  };

  const copyText = () => {
    if (recognizedText && !recognizedText.startsWith("Processing") && !recognizedText.startsWith("Error")) {
      navigator.clipboard.writeText(recognizedText)
        .then(() => {
          alert('Text copied to clipboard!');
        })
        .catch(err => {
          console.error('Failed to copy text: ', err);
          alert('Failed to copy text.');
        });
    }
  };

  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 text-gray-300">
      <h1 className="text-4xl font-bold mb-2 text-white">Word4Word</h1>
      <p className="text-gray-400 mb-6">Write some stuff with your cursor/touchscreen!</p>

      {isProcessing && <p className="text-yellow-400 mb-4 animate-pulse">Processing your handwriting...</p>}

      <canvas
        ref={canvasRef}
        className={`border-2 border-gray-700 bg-white rounded-lg shadow-lg mb-6 cursor-crosshair ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing}
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      <button
        onClick={clearCanvas}
        disabled={isProcessing}
        className={`mb-6 px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50 ${isProcessing ? 'opacity-50 cursor-not-allowed' : ''}`}
      >
        Clear Canvas
      </button>

      <div className="w-full max-w-md p-5 border border-gray-700 bg-gray-800 rounded-lg shadow-md">
        <h2 className="text-lg font-semibold mb-3 text-white">Recognized Text:</h2>
        <div className="whitespace-pre-wrap bg-gray-700 text-gray-100 p-3 rounded min-h-[60px] break-words">
          {recognizedText || <span className="text-gray-500">Draw on the canvas above...</span>}
        </div>
        {recognizedText && !recognizedText.startsWith("Processing") && !recognizedText.startsWith("Error") && (
          <button
            onClick={copyText}
            className="mt-4 px-5 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-opacity-50"
          >
            Copy Text
          </button>
        )}
      </div>
    </div>
  );
}

export default LandingPage;
