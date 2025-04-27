'use client';

import React, { useRef, useState, useEffect } from 'react';

function LandingPage() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [recognizedText, setRecognizedText] = useState('');
  const [isDrawing, setIsDrawing] = useState(false);
  const [ctx, setCtx] = useState<CanvasRenderingContext2D | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (canvas) {
      // Set canvas dimensions (adjust as needed)
      canvas.width = 500;
      canvas.height = 300;
      const context = canvas.getContext('2d');
      if (context) {
        context.lineCap = 'round';
        context.strokeStyle = 'black';
        context.lineWidth = 5;
        setCtx(context);
      }
    }
  }, []);

  const startDrawing = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    if (!ctx) return;
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
    // Trigger OCR processing here (to be implemented)
    processHandwriting();
  };

  const getMousePos = (event: React.MouseEvent<HTMLCanvasElement> | React.TouchEvent<HTMLCanvasElement>) => {
    const canvas = canvasRef.current;
    if (!canvas) return { x: 0, y: 0 };
    const rect = canvas.getBoundingClientRect();

    if (event.nativeEvent instanceof MouseEvent) {
      return {
        x: event.nativeEvent.clientX - rect.left,
        y: event.nativeEvent.clientY - rect.top
      };
    } else if (event.nativeEvent instanceof TouchEvent) {
      // Use the first touch point
      const touch = event.nativeEvent.touches[0];
      return {
        x: touch.clientX - rect.left,
        y: touch.clientY - rect.top
      };
    }
    return { x: 0, y: 0 };
  };

  const clearCanvas = () => {
    if (ctx && canvasRef.current) {
      ctx.clearRect(0, 0, canvasRef.current.width, canvasRef.current.height);
      setRecognizedText(''); 
    }
  };

  const processHandwriting = () => {
    // Placeholder for OCR processing logic with TensorFlow.js
    // This will involve getting image data from the canvas,
    // preprocessing it, and feeding it to a model.

    // Placeholder for recognized text
    console.log("Processing handwriting...");
    setRecognizedText("OCR result will appear here.");
  };

  const copyText = () => {
    navigator.clipboard.writeText(recognizedText)
      .then(() => {
        alert('Text copied to clipboard!'); // Copied notification
      })
      .catch(err => {
        console.error('Failed to copy text: ', err);
      });
  };


  return (
    <div className="flex flex-col items-center justify-center min-h-screen bg-gray-900 p-4 text-gray-300">
      <h1 className="text-4xl font-bold mb-2 text-white">Word4Word</h1>
      <p className="text-gray-400 mb-6">Write some stuff with your cursor/touchscreen!</p>

      <canvas
        ref={canvasRef}
        className="border-2 border-gray-700 bg-white rounded-lg shadow-lg mb-6 cursor-crosshair"
        onMouseDown={startDrawing}
        onMouseMove={draw}
        onMouseUp={stopDrawing}
        onMouseLeave={stopDrawing} // Stop drawing if cursor leaves canvas
        onTouchStart={startDrawing}
        onTouchMove={draw}
        onTouchEnd={stopDrawing}
      />

      <button
         onClick={clearCanvas}
         className="mb-6 px-5 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 focus:ring-opacity-50"
       >
         Clear Canvas
       </button>

      <div className="w-full max-w-md p-5 border border-gray-700 bg-gray-800 rounded-lg shadow-md"> {/* Darker output area bg */} 
        <h2 className="text-lg font-semibold mb-3 text-white">Recognized Text:</h2> {/* White heading */} 
        <pre className="whitespace-pre-wrap bg-gray-700 text-gray-100 p-3 rounded min-h-[60px]">{recognizedText}</pre> {/* Slightly darker pre bg, lighter text */} 
        {recognizedText && (
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
