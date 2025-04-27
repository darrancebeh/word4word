from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel
import base64
import io
import numpy as np 
from PIL import Image 
from paddleocr import PaddleOCR
import traceback

# --- Initialize PaddleOCR ---
# Load the model once when the server starts
print("Initializing PaddleOCR...")
ocr_engine = PaddleOCR(use_angle_cls=True, lang='en', use_gpu=False)
print("PaddleOCR Initialized.")

app = FastAPI()

# --- CORS Configuration ---
# Allows requests from your frontend development server (adjust origin if needed)
origins = [
    "http://localhost:3000", # Default Next.js dev port
    "http://127.0.0.1:3000",
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
    print("--- Backend: Received /api/recognize request ---") # Log request start
    try:
        # 1. Decode Base64 Image Data
        print("Backend: Decoding base64 image...")
        if not payload.image or not payload.image.startswith("data:image/png;base64,"):
            raise HTTPException(status_code=400, detail="Invalid image format. Expected base64 PNG data URL.")
        
        base64_data = payload.image.split(',', 1)[1]
        image_data = base64.b64decode(base64_data)
        print("Backend: Base64 decoded successfully.")

        # 2. Convert to Image Object
        print("Backend: Opening image with PIL...")
        img = Image.open(io.BytesIO(image_data)).convert("RGB") # Text will always be RGB, no ned to convert to grayscale
        img_np = np.array(img)
        print("Backend: Image converted to NumPy array.")

        # 3. Perform OCR using PaddleOCR on Original RGB Image
        print("Backend: Running PaddleOCR on original RGB image...")
        result = ocr_engine.ocr(img_np, cls=True) # Pass original RGB numpy array
        print(f"Backend: PaddleOCR finished. Raw Result: {result}")

        # Process OCR Results
        print("Backend: Processing OCR results...")
        recognized_texts = []
        if result and result[0]:
            for line in result[0]:
                if line and len(line) >= 2:
                    text_info = line[1]
                    if isinstance(text_info, (tuple, list)) and len(text_info) >= 1:
                         recognized_texts.append(text_info[0])
        
        final_text = " ".join(recognized_texts)
        print(f"Backend: Processed Text: {final_text}")
        print("--- Backend: Sending response ---") # Log before sending response
        return {"text": final_text if final_text else "No text recognized."}

    except HTTPException as http_exc:
        print(f"Backend HTTP Exception: {http_exc.detail}") # Log HTTP exceptions
        raise http_exc
    except base64.binascii.Error:
        print("Backend Error: Invalid base64 data.") # Log specific errors
        raise HTTPException(status_code=400, detail="Invalid base64 data.")
    except Exception as e:
        print(f"Backend Unexpected Error: {e}") # Log general errors
        traceback.print_exc()
        raise HTTPException(status_code=500, detail=f"Internal server error during OCR: {e}")

# --- Root endpoint for testing ---
@app.get("/")
async def read_root():
    return {"message": "Word4Word Backend is running with PaddleOCR"}