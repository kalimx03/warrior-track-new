import { useState, useRef, useEffect } from "react";
import * as faceapi from "face-api.js";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { Camera, Loader2, CheckCircle2, RefreshCw } from "lucide-react";
import { useMutation } from "convex/react";
import { api } from "@/convex/_generated/api";

export function FaceRegistration({ onComplete }: { onComplete: () => void }) {
  const [isModelLoaded, setIsModelLoaded] = useState(false);
  const [isScanning, setIsScanning] = useState(false);
  const [isSuccess, setIsSuccess] = useState(false);
  const videoRef = useRef<HTMLVideoElement>(null);
  const registerFace = useMutation(api.users.registerFace);

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
  }, []);

  const startCamera = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      setIsScanning(true);
    } catch (err) {
      toast.error("Camera access required");
    }
  };

  const captureFace = async () => {
    if (!videoRef.current) return;

    const detections = await faceapi
      .detectSingleFace(videoRef.current, new faceapi.TinyFaceDetectorOptions())
      .withFaceLandmarks()
      .withFaceDescriptor();

    if (detections) {
      try {
        // Convert Float32Array to regular array for storage
        const descriptorArray = Array.from(detections.descriptor);
        await registerFace({ faceDescriptor: descriptorArray });
        setIsSuccess(true);
        toast.success("Face ID registered successfully!");
        
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
      <div className="relative w-full max-w-sm aspect-video bg-black rounded-lg overflow-hidden border-2 border-primary/20">
        {!isScanning && !isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center bg-muted/10">
            <Camera className="h-12 w-12 text-muted-foreground" />
          </div>
        )}
        <video
          ref={videoRef}
          autoPlay
          playsInline
          muted
          className={`w-full h-full object-cover transform scale-x-[-1] ${!isScanning ? 'hidden' : ''}`}
        />
        {isSuccess && (
          <div className="absolute inset-0 flex items-center justify-center bg-green-500/20 backdrop-blur-sm">
            <CheckCircle2 className="h-16 w-16 text-green-500" />
          </div>
        )}
      </div>

      <div className="flex gap-2">
        {!isScanning && !isSuccess && (
          <Button onClick={startCamera} disabled={!isModelLoaded}>
            {isModelLoaded ? "Start Camera" : "Loading Models..."}
          </Button>
        )}
        
        {isScanning && !isSuccess && (
          <Button onClick={captureFace}>
            Capture Face ID
          </Button>
        )}

        {isSuccess && (
          <Button variant="outline" onClick={onComplete}>
            Done
          </Button>
        )}
      </div>
      
      <p className="text-xs text-muted-foreground text-center max-w-xs">
        Ensure you are in a well-lit area and your face is clearly visible.
      </p>
    </div>
  );
}
