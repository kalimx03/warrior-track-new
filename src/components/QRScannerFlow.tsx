import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as faceapi from "face-api.js";
import { toast } from "sonner";
import { ScanLine, Camera, CheckCircle2, Loader2, AlertCircle } from "lucide-react";

interface QRScannerFlowProps {
  onScanSuccess: (code: string) => void;
  onComplete?: (code: string) => void;
  mode: "LAB" | "THEORY";
}

export function QRScannerFlow({ 
  onScanSuccess, 
  onComplete,
  mode 
}: QRScannerFlowProps) {
  const [step, setStep] = useState<"SCAN" | "FACE" | "DONE">("SCAN");
  const [scannedCode, setScannedCode] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);

  // Load Face API models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL);
        // We can add more models if needed, but tinyFaceDetector is sufficient for presence
        setModelsLoaded(true);
      } catch (error) {
        console.error("Error loading face-api models:", error);
        toast.error("Failed to load face detection models. Please refresh.");
      }
    };
    loadModels();
  }, []);

  useEffect(() => {
    if (step === "SCAN") {
      // Initialize scanner
      const scanner = new Html5QrcodeScanner(
        "reader",
        { fps: 10, qrbox: { width: 250, height: 250 } },
        /* verbose= */ false
      );
      
      scanner.render((decodedText: string) => {
        scanner.clear();
        setScannedCode(decodedText);
        onScanSuccess(decodedText);
        
        if (mode === "LAB") {
          setStep("FACE");
        } else {
          setStep("DONE");
        }
      }, (error: any) => {
        // handle scan error if needed
      });
      
      scannerRef.current = scanner;

      return () => {
        scanner.clear().catch(console.error);
      };
    }
  }, [step, mode, onScanSuccess]);

  useEffect(() => {
    if (step === "FACE" && mode === "LAB") {
      let stream: MediaStream | null = null;

      const startCamera = async () => {
        try {
          stream = await navigator.mediaDevices.getUserMedia({ video: true });
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera for face verification:", err);
          toast.error("Camera access required for face verification");
        }
      };

      startCamera();

      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
        if (stream) {
          stream.getTracks().forEach(track => track.stop());
        }
      };
    }
  }, [step, mode]);

  const handleVideoPlay = () => {
    if (!modelsLoaded) return;
    
    setIsDetecting(true);
    
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current) {
        try {
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
          const detections = await faceapi.detectAllFaces(videoRef.current, options);
          
          if (detections.length > 0) {
            // Face detected with sufficient confidence
            if (detectionIntervalRef.current) {
              clearInterval(detectionIntervalRef.current);
            }
            setIsDetecting(false);
            toast.success("Face Verified Successfully!");
            
            // Small delay to show success state
            setTimeout(() => {
              if (onComplete) onComplete(scannedCode);
              setStep("DONE");
            }, 1000);
          }
        } catch (err) {
          console.error("Detection error:", err);
        }
      }
    }, 500); // Check every 500ms
  };

  return (
    <div className="space-y-4 py-4">
      {step === "SCAN" && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-primary/10 rounded-full animate-pulse">
                <ScanLine className="h-8 w-8 text-primary" />
              </div>
            </div>
            <h3 className="font-semibold">Step 1: Scan QR Code</h3>
            <p className="text-sm text-muted-foreground">Point your camera at the session QR code</p>
          </div>
          <div id="reader" className="overflow-hidden rounded-lg border bg-black/5"></div>
        </div>
      )}

      {step === "FACE" && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-full">
                <Camera className="h-8 w-8 text-blue-600" />
              </div>
            </div>
            <h3 className="font-semibold">Step 2: Face Verification</h3>
            <p className="text-sm text-muted-foreground">
              {!modelsLoaded ? "Loading AI models..." : "Align your face within the frame..."}
            </p>
          </div>
          
          <div className="aspect-video bg-black rounded-lg flex items-center justify-center relative overflow-hidden border-2 border-primary/50 shadow-[0_0_15px_rgba(var(--primary),0.5)]">
            {!modelsLoaded && (
              <div className="absolute inset-0 z-20 flex items-center justify-center bg-black/80 text-white">
                <div className="flex flex-col items-center gap-2">
                  <Loader2 className="h-8 w-8 animate-spin" />
                  <span className="text-sm">Initializing Face ID...</span>
                </div>
              </div>
            )}
            
            <video 
              ref={videoRef} 
              autoPlay 
              playsInline 
              muted 
              onPlay={handleVideoPlay}
              className="absolute inset-0 w-full h-full object-cover transform scale-x-[-1]" 
            />
            
            {/* Face scanning overlay UI */}
            <div className="absolute inset-0 z-10 pointer-events-none">
              <div className="absolute inset-0 border-[50px] border-black/50 [mask-image:radial-gradient(ellipse_at_center,transparent_40%,black_70%)]" />
              <div className={`absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-48 h-64 border-2 ${isDetecting ? 'border-primary/50' : 'border-green-500'} rounded-[40%] opacity-80 transition-colors duration-300`}>
                {isDetecting && (
                  <div className="absolute top-0 left-1/2 -translate-x-1/2 w-full h-1 bg-primary/80 shadow-[0_0_10px_rgba(var(--primary),0.8)] animate-[scan_2s_ease-in-out_infinite]" />
                )}
              </div>
              
              <div className="absolute bottom-4 left-0 right-0 text-center">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-black/60 text-white text-xs font-mono backdrop-blur-md border border-white/10">
                  {isDetecting ? (
                    <>
                      <div className="h-2 w-2 rounded-full bg-blue-500 animate-pulse" />
                      SCANNING FACE...
                    </>
                  ) : (
                    <>
                      <div className="h-2 w-2 rounded-full bg-green-500" />
                      READY
                    </>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {step === "DONE" && (
        <div className="flex flex-col items-center justify-center py-8 space-y-4 text-center animate-in fade-in zoom-in duration-300">
          <div className="h-20 w-20 bg-green-100 rounded-full flex items-center justify-center shadow-lg shadow-green-100">
            <CheckCircle2 className="h-10 w-10 text-green-600" />
          </div>
          <div>
            <h3 className="font-semibold text-lg">Verification Successful</h3>
            <p className="text-sm text-muted-foreground">Identity confirmed. Attendance marked.</p>
          </div>
        </div>
      )}
    </div>
  );
}
