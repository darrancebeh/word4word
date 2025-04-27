from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
import numpy as np # PaddleOCR uses numpy arrays
from PIL import Image # To read image data
from paddleocr import PaddleOCR # Import PaddleOCR

# --- Initialize PaddleOCR ---
# Load the model once when the server starts
# Use use_gpu=False for CPU. Set to True if you have a compatible GPU and paddlepaddle-gpu installed.
print("Initializing PaddleOCR...")
ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
print("PaddleOCR Initialized.")

app = FastAPI()

# --- CORS Configuration ---
# Allows requests from your frontend development server (adjust origin if needed)
origins = [
    "http://localhost:3000", # Default Next.js dev port
    "http://127.0.0.1:3000",
    # Add your deployed frontend URL here if applicable
]

app.add_middleware(
    CORSMiddleware,
    allow_origins=origins,
    allow_credentials=True,
    allow_methods=["POST"], # Allow only POST for this endpoint
    allow_headers=["*"],
)

# --- Pydantic Model for Request Body ---
class ImagePayload(BaseModel):
    image: str # Expecting a base64 data URL string (e.g., "data:image/png;base64,...")

# --- API Endpoint ---
@app.post("/api/recognize")
async def recognize_image(payload: ImagePayload):
    try:
        # 1. Decode Base64 Image Data
        # Remove the header "data:image/png;base64,"
        if not payload.image or not payload.image.startswith("data:image/png;base64,"):
            raise HTTPException(status_code=400, detail="Invalid image format. Expected base64 PNG data URL.")
        
        base64_data = payload.image.split(',', 1)[1]
        image_data = base64.b64decode(base64_data)
        # image_stream = io.BytesIO(image_data) # No longer need stream for PaddleOCR directly

        # 2. Perform OCR using PaddleOCR
        print("Running PaddleOCR...")
        # PaddleOCR expects image data as bytes or a numpy array
        # Convert image bytes to numpy array
        img = Image.open(io.BytesIO(image_data)).convert("RGB") # Ensure image is RGB
        img_np = np.array(img)

        result = ocr_engine.ocr(img_np, cls=True) # Pass numpy array
        print(f"PaddleOCR Raw Result: {result}")

        # 3. Process Results
        recognized_texts = []
        if result and result[0]: # Check if result is not None and contains data
            for line in result[0]:
                # line is a list containing [[box_coords], (text, confidence)]
                if line and len(line) >= 2:
                    text_info = line[1]
                    if isinstance(text_info, (tuple, list)) and len(text_info) >= 1:
                         recognized_texts.append(text_info[0]) # Extract the text part
        
        final_text = " ".join(recognized_texts) # Join recognized lines/words with spaces

        print(f"Recognized Text: {final_text}")
        return {"text": final_text if final_text else "No text recognized."}

    except HTTPException as http_exc:
        raise http_exc
    except base64.binascii.Error:
        raise HTTPException(status_code=400, detail="Invalid base64 data.")
    except Exception as e:
        print(f"Unexpected error during recognition: {e}")
        # Consider logging the full traceback here for debugging
        # import traceback
        # traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error during OCR: {e}")

# --- Root endpoint for testing ---
@app.get("/")
async def read_root():
    return {"message": "Word4Word Backend is running with PaddleOCR"}

# --- Optional: Run directly with uvicorn for simple testing (though usually run from terminal) ---
# if __name__ == "__main__":
#     import uvicorn
#     uvicorn.run(app, host="0.0.0.0", port=8000)
