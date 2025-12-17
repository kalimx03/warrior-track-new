import { useState, useEffect, useRef } from "react";
import { Html5QrcodeScanner } from "html5-qrcode";
import * as faceapi from "face-api.js";
import { toast } from "sonner";
import { ScanLine, Camera, CheckCircle2, Loader2, AlertCircle, ShieldAlert, Eye, RefreshCw } from "lucide-react";
import { Button } from "@/components/ui/button";

interface QRScannerFlowProps {
  onScanSuccess: (code: string) => void;
  onComplete?: (code: string) => void;
  mode: "LAB" | "THEORY";
  storedFaceDescriptor?: number[];
}

export function QRScannerFlow({ 
  onScanSuccess, 
  onComplete,
  mode,
  storedFaceDescriptor
}: QRScannerFlowProps) {
  const [step, setStep] = useState<"SCAN" | "LIVENESS" | "FACE" | "DONE">("SCAN");
  const [scannedCode, setScannedCode] = useState("");
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isDetecting, setIsDetecting] = useState(false);
  const [matchScore, setMatchScore] = useState<number | null>(null);
  const [cameraError, setCameraError] = useState<string | null>(null);
  const scannerRef = useRef<Html5QrcodeScanner | null>(null);
  const videoRef = useRef<HTMLVideoElement>(null);
  const detectionIntervalRef = useRef<NodeJS.Timeout | null>(null);
  const streamRef = useRef<MediaStream | null>(null);

  // Load Face API models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const MODEL_URL = 'https://justadudewhohacks.github.io/face-api.js/models';
        await Promise.all([
          faceapi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
          faceapi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
          faceapi.nets.faceRecognitionNet.loadFromUri(MODEL_URL),
        ]);
        setModelsLoaded(true);
      } catch (error) {
        console.error("Error loading face-api models:", error);
        toast.error("Failed to load face detection models. Please refresh.");
      }
    };
    loadModels();
  }, []);

  // QR Scanner Logic
  useEffect(() => {
    let isMounted = true;
    if (step === "SCAN") {
      // Small delay to ensure DOM is ready
      const timer = setTimeout(() => {
        if (!isMounted) return;
        if (!document.getElementById("reader")) return;

        // Cleanup existing scanner if any
        if (scannerRef.current) {
          try {
            scannerRef.current.clear().catch(console.error);
          } catch (e) { console.error(e); }
        }

        const scanner = new Html5QrcodeScanner(
          "reader",
          { 
            fps: 10, 
            qrbox: { width: 250, height: 250 },
            aspectRatio: 1.0,
            showTorchButtonIfSupported: true,
            // Default to all formats or use 0 for QR_CODE if needed, but omitting is safer for imports
          },
          /* verbose= */ false
        );
        
        scannerRef.current = scanner;

        const handleScan = async (decodedText: string) => {
          if (!isMounted) return;
          
          // Pause scanning immediately
          try {
            scanner.pause(true);
          } catch (e) { console.error(e); }

          setScannedCode(decodedText);
          onScanSuccess(decodedText);
          
          // Clear scanner before changing step to avoid UI errors
          try {
            await scanner.clear();
            scannerRef.current = null;
          } catch (error) {
            console.error("Failed to clear scanner:", error);
          }
          
          if (isMounted) {
            if (mode === "LAB") {
              setStep("LIVENESS");
            } else {
              setStep("DONE");
            }
          }
        };

        scanner.render(handleScan, (error) => {
          // Ignore scan errors
        });
      }, 100);
      
      return () => {
        isMounted = false;
        clearTimeout(timer);
        if (scannerRef.current) {
          try {
            scannerRef.current.clear().catch(console.error);
          } catch (e) { console.error(e); }
          scannerRef.current = null;
        }
      };
    }
  }, [step, mode]); // Removed onScanSuccess from deps to prevent re-init

  // Face Verification Logic
  useEffect(() => {
    if ((step === "LIVENESS" || step === "FACE") && mode === "LAB") {
      const startCamera = async () => {
        try {
          setCameraError(null);
          const stream = await navigator.mediaDevices.getUserMedia({ 
            video: { 
              width: { ideal: 640 },
              height: { ideal: 480 },
              facingMode: "user"
            } 
          });
          
          streamRef.current = stream;
          
          if (videoRef.current) {
            videoRef.current.srcObject = stream;
          }
        } catch (err) {
          console.error("Error accessing camera for face verification:", err);
          setCameraError("Camera access denied or unavailable. Please allow camera access.");
          toast.error("Camera access required for face verification");
        }
      };

      startCamera();

      return () => {
        if (detectionIntervalRef.current) {
          clearInterval(detectionIntervalRef.current);
        }
        if (streamRef.current) {
          streamRef.current.getTracks().forEach(track => track.stop());
          streamRef.current = null;
        }
      };
    }
  }, [step, mode]);

  const calculateEAR = (landmarks: faceapi.FaceLandmarks68) => {
    const getEyeEAR = (points: faceapi.Point[]) => {
      const v1 = points[1].y - points[5].y;
      const v2 = points[2].y - points[4].y;
      const h = points[0].x - points[3].x;
      return (Math.abs(v1) + Math.abs(v2)) / (2 * Math.abs(h));
    };

    const leftEye = landmarks.getLeftEye();
    const rightEye = landmarks.getRightEye();
    
    return (getEyeEAR(leftEye) + getEyeEAR(rightEye)) / 2;
  };

  const handleVideoPlay = () => {
    if (!modelsLoaded || !videoRef.current) return;
    
    setIsDetecting(true);
    let blinkDetected = false;
    let consecutiveClosedEyes = 0;
    
    detectionIntervalRef.current = setInterval(async () => {
      if (videoRef.current && !videoRef.current.paused && !videoRef.current.ended) {
        try {
          const options = new faceapi.TinyFaceDetectorOptions({ inputSize: 224, scoreThreshold: 0.5 });
          const detection = await faceapi
            .detectSingleFace(videoRef.current, options)
            .withFaceLandmarks()
            .withFaceDescriptor();
          
          if (detection) {
            if (step === "LIVENESS") {
              const ear = calculateEAR(detection.landmarks);
              // EAR threshold for closed eyes is typically around 0.2 - 0.25
              if (ear < 0.25) {
                consecutiveClosedEyes++;
                if (consecutiveClosedEyes > 1) { // Require 2 frames of closed eyes
                   blinkDetected = true;
                }
              } else {
                consecutiveClosedEyes = 0;
                if (blinkDetected) {
                  // Eyes opened after being closed -> Blink complete
                  toast.success("Liveness Confirmed!");
                  setStep("FACE");
                  blinkDetected = false;
                }
              }
            } else if (step === "FACE") {
              // If we have a stored descriptor, compare it
              if (storedFaceDescriptor) {
                const storedDescriptorFloat32 = new Float32Array(storedFaceDescriptor);
                const distance = faceapi.euclideanDistance(detection.descriptor, storedDescriptorFloat32);
                
                // Distance < 0.6 is generally considered a match
                setMatchScore(distance);
                
                if (distance < 0.5) { // Stricter threshold for security
                  finishVerification();
                }
              } else {
                // Fallback if no descriptor stored
                finishVerification();
              }
            }
          }
        } catch (err) {
          console.error("Detection error:", err);
        }
      }
    }, 200); // Check every 200ms
  };

  const finishVerification = () => {
    if (detectionIntervalRef.current) {
      clearInterval(detectionIntervalRef.current);
    }
    setIsDetecting(false);
    toast.success("Identity Verified Successfully!");
    
    // Pass the scanned code back to the parent
    setTimeout(() => {
      if (onComplete) onComplete(scannedCode);
      setStep("DONE");
    }, 1000);
  };

  const retryCamera = () => {
    setCameraError(null);
    setStep(step); // Trigger re-render/re-effect
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
            <h3 className="font-semibold">Step 1: Scan Session QR</h3>
            <p className="text-sm text-muted-foreground">
              Scan the dynamic QR code displayed by your instructor.
            </p>
          </div>
          <div id="reader" className="overflow-hidden rounded-lg border bg-black/5 min-h-[300px]"></div>
        </div>
      )}

      {(step === "LIVENESS" || step === "FACE") && (
        <div className="space-y-4">
          <div className="text-center space-y-2">
            <div className="flex justify-center">
              <div className="p-3 bg-blue-100 rounded-full">
                {step === "LIVENESS" ? (
                  <Eye className="h-8 w-8 text-blue-600 animate-pulse" />
                ) : (
                  <Camera className="h-8 w-8 text-blue-600" />
                )}
              </div>
            </div>
            <h3 className="font-semibold">
              {step === "LIVENESS" ? "Step 2: Liveness Check" : "Step 3: Face Verification"}
            </h3>
            <p className="text-sm text-muted-foreground">
              {!modelsLoaded ? "Loading AI models..." : (step === "LIVENESS" ? "Please blink your eyes naturally" : "Align your face within the frame")}
            </p>
          </div>
          
          {cameraError ? (
            <div className="aspect-video bg-muted rounded-lg flex flex-col items-center justify-center p-6 text-center space-y-4 border-2 border-destructive/20">
              <AlertCircle className="h-10 w-10 text-destructive" />
              <div className="space-y-1">
                <h4 className="font-semibold text-destructive">Camera Access Failed</h4>
                <p className="text-sm text-muted-foreground">{cameraError}</p>
              </div>
              <Button onClick={retryCamera} variant="outline" size="sm">
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry Camera
              </Button>
            </div>
          ) : (
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
                    {step === "LIVENESS" ? (
                      <>
                        <Eye className="h-3 w-3" />
                        WAITING FOR BLINK...
                      </>
                    ) : (
                      <>
                        <div className={`h-2 w-2 rounded-full ${matchScore && matchScore < 0.5 ? 'bg-green-500' : 'bg-blue-500 animate-pulse'}`} />
                        VERIFYING IDENTITY...
                      </>
                    )}
                  </div>
                  {matchScore !== null && step === "FACE" && (
                    <div className="mt-2 text-xs text-white/80">
                      Match Score: {matchScore.toFixed(3)}
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}
          
          {!storedFaceDescriptor && step === "FACE" && (
            <div className="flex items-center gap-2 p-3 bg-yellow-500/10 text-yellow-600 rounded-lg text-sm">
              <ShieldAlert className="h-4 w-4 shrink-0" />
              Warning: No Face ID registered. Using basic detection.
            </div>
          )}
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