import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, CheckCircle2, RefreshCw, ScanFace } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function FaceRegistration({ onComplete }: { onComplete: () => void }) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const [feedback, setFeedback] = useState("Position your face in the oval");
  const videoRef = useRef<HTMLVideoElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const registerFace = useMutation(api.users.registerFace);
  const detectionInterval = useRef<NodeJS.Timeout | null>(null);

  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setIsModelLoaded(true);
      } catch (error) {
        console.error("Error loading models:", error);
        toast.error("Failed to load face detection models");
      }
    };
    loadModels();
    
    return () => {
      if (detectionInterval.current) clearInterval(detectionInterval.current);
    };
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScanning(true);
      startRealtimeFeedback();
    } catch (err) {
      toast.error("Camera access required");
    }
  };

  const startRealtimeFeedback = () => {
    detectionInterval.current = setInterval(async () => {
      if (!videoRef.current || !canvasRef.current) return;

      const displaySize = { width: videoRef.current.videoWidth, height: videoRef.current.videoHeight };
      faceapi.matchDimensions(canvasRef.current, displaySize);

      const detections = await faceapi
        .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
        .withFaceLandmarks();

      if (detections) {
        const box = detections.detection.box;
        const centerX = box.x + box.width / 2;
        const centerY = box.y + box.height / 2;
        const videoCenter = displaySize.width / 2;
        
        // Simple feedback logic
        if (box.width < 150) {
          setFeedback("Move Closer");
        } else if (Math.abs(centerX - videoCenter) > 50) {
          setFeedback("Center your face");
        } else {
          setFeedback("Perfect! Hold still...");
        }
      } else {
        setFeedback("Face not detected");
      }
    }, 200);
  };

  const captureFace = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections) {
      // Quality check
      if (detections.detection.score < 0.8) {
        toast.warning("Face not clear enough. Please adjust lighting.");
        return;
      }

      try {
        // Convert Float32Array to regular array for storage
        const descriptorArray = Array.from(detections.descriptor);
        await registerFace({ faceDescriptor: descriptorArray });
        setIsSuccess(true);
        toast.success("Face ID registered successfully!");
        
        if (detectionInterval.current) clearInterval(detectionInterval.current);
        
        // Stop camera
        const stream = videoRef.current.srcObject as MediaStream;
        stream?.getTracks().forEach(track => track.stop());
        
        setTimeout(onComplete, 1500);
      } catch (error) {
        toast.error("Failed to save face data");
      }
    } else {
      toast.error("No face detected. Please look at the camera.");
    }
  };

  return (
    <div className="flex flex-col items-center space-y-4 p-4">
      <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20 shadow-lg">
        {!isScanning && !isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
            <ScanFace className="h-16 w-16 text-muted-foreground/50" />
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform scale-x-[-1] ${!isScanning ? 'hidden' : ''}`}
        />
        <canvas ref={canvasRef} className="absolute inset-0 w-full h-full pointer-events-none" />
        
        {isScanning && !isSuccess && (
          <div className="absolute inset-0 pointer-events-none flex items-center justify-center">
            <div className="w-48 h-64 border-2 border-dashed border-primary/50 rounded-[50%] opacity-70"></div>
          </div>
        )}

        {isScanning && !isSuccess && (
          <div className="absolute bottom-4 left-0 right-0 text-center">
            <span className="bg-black/60 text-white px-3 py-1 rounded-full text-sm backdrop-blur-sm">
              {feedback}
            </span>
          </div>
        )}

        {isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm animate-in fade-in">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isScanning && !isSuccess && (
          <Button onClick={startCamera} disabled={!isModelLoaded} className="w-full">
            {isModelLoaded ? (
              <>
                <Camera className="mr-2 h-4 w-4" /> Start Registration
              </>
            ) : (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Loading AI...
              </>
            )}
          </Button>
        )}
        
        {isScanning && !isSuccess && (
          <Button onClick={captureFace} variant="default" className="w-full">
            Capture Face ID
          </Button>
        )}

        {isSuccess && (
          <Button variant="outline" onClick={onComplete} className="w-full">
            Done
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Ensure you are in a well-lit area. Remove glasses or masks for best results.
      </p>
    </div>
  );
}