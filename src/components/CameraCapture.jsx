import React, { useRef, useState } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent } from '@/components/ui/card';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Camera, X, RotateCcw, Upload, MapPin } from 'lucide-react';
import { toast } from 'sonner';
import { base44 } from '@/api/base44Client';
import { captureLocation } from '@/components/useGeolocation';

export default function CameraCapture({ onPhotoCapture, buttonVariant = "outline", buttonSize = "default", buttonText = "Take Photo" }) {
  const [isOpen, setIsOpen] = useState(false);
  const [stream, setStream] = useState(null);
  const [capturedImage, setCapturedImage] = useState(null);
  const [isUploading, setIsUploading] = useState(false);
  const [gpsLocation, setGpsLocation] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const fileInputRef = useRef(null);

  const startCamera = async () => {
    try {
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment', width: { ideal: 1920 }, height: { ideal: 1080 } }
      });
      setStream(mediaStream);
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream;
      }
    } catch (error) {
      toast.error('Camera access denied or not available');
      console.error('Camera error:', error);
    }
  };

  const stopCamera = () => {
    if (stream) {
      stream.getTracks().forEach(track => track.stop());
      setStream(null);
    }
  };

  const capturePhoto = () => {
    if (!videoRef.current || !canvasRef.current) return;

    const video = videoRef.current;
    const canvas = canvasRef.current;
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;

    const context = canvas.getContext('2d');
    context.drawImage(video, 0, 0, canvas.width, canvas.height);

    canvas.toBlob((blob) => {
      const url = URL.createObjectURL(blob);
      setCapturedImage({ blob, url });
      stopCamera();
    }, 'image/jpeg', 0.9);
  };

  const retakePhoto = () => {
    setCapturedImage(null);
    startCamera();
  };

  const uploadPhoto = async () => {
    if (!capturedImage) return;

    setIsUploading(true);
    try {
      // Capture GPS location
      let location = null;
      try {
        location = await captureLocation();
      } catch (err) {
        console.log('GPS not available:', err);
      }

      const file = new File([capturedImage.blob], `photo_${Date.now()}.jpg`, { type: 'image/jpeg' });
      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      
      onPhotoCapture({ 
        url: file_url, 
        timestamp: Date.now(),
        gps: location
      });
      toast.success(location ? 'Photo captured with GPS location' : 'Photo captured');
      handleClose();
    } catch (error) {
      toast.error('Failed to upload photo');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleFileSelect = async (event) => {
    const file = event.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      // Capture GPS location
      let location = null;
      try {
        location = await captureLocation();
      } catch (err) {
        console.log('GPS not available:', err);
      }

      const { file_url } = await base44.integrations.Core.UploadFile({ file });
      onPhotoCapture({ 
        url: file_url, 
        timestamp: Date.now(),
        gps: location
      });
      toast.success(location ? 'Photo uploaded with GPS location' : 'Photo uploaded');
    } catch (error) {
      toast.error('Failed to upload photo');
      console.error('Upload error:', error);
    } finally {
      setIsUploading(false);
    }
  };

  const handleClose = () => {
    stopCamera();
    setCapturedImage(null);
    setIsOpen(false);
  };

  const handleOpen = async () => {
    setIsOpen(true);
    
    // Capture GPS on open
    try {
      const location = await captureLocation();
      setGpsLocation(location);
    } catch (err) {
      console.log('GPS not available:', err);
    }

    if (navigator.mediaDevices && navigator.mediaDevices.getUserMedia) {
      startCamera();
    }
  };

  React.useEffect(() => {
    return () => stopCamera();
  }, []);

  return (
    <>
      <Button
        variant={buttonVariant}
        size={buttonSize}
        onClick={handleOpen}
        className="gap-2"
      >
        <Camera className="h-4 w-4" />
        {buttonText}
      </Button>

      <Dialog open={isOpen} onOpenChange={handleClose}>
        <DialogContent className="max-w-2xl">
          <DialogHeader>
            <DialogTitle className="flex items-center justify-between">
              <span className="flex items-center gap-2">
                <Camera className="h-5 w-5" />
                Capture Photo
              </span>
              <Button
                variant="ghost"
                size="icon"
                onClick={handleClose}
                className="h-8 w-8"
              >
                <X className="h-4 w-4" />
              </Button>
            </DialogTitle>
          </DialogHeader>

          <div className="space-y-4">
            {!capturedImage ? (
              <>
                <Card className="bg-black">
                  <CardContent className="p-0 relative aspect-video">
                    <video
                      ref={videoRef}
                      autoPlay
                      playsInline
                      className="w-full h-full object-cover rounded-lg"
                    />
                    <canvas ref={canvasRef} className="hidden" />
                  </CardContent>
                </Card>

                <div className="space-y-2">
                  {gpsLocation && (
                    <div className="text-xs text-center text-green-600 dark:text-green-400 flex items-center justify-center gap-1">
                      <MapPin className="h-3 w-3" />
                      GPS: {gpsLocation.latitude.toFixed(6)}, {gpsLocation.longitude.toFixed(6)}
                    </div>
                  )}
                  <div className="flex gap-2">
                    <Button
                      onClick={capturePhoto}
                      disabled={!stream}
                      className="flex-1 bg-blue-600 hover:bg-blue-700"
                      size="lg"
                    >
                      <Camera className="h-5 w-5 mr-2" />
                      Capture
                    </Button>
                    <Button
                      variant="outline"
                      onClick={() => fileInputRef.current?.click()}
                      className="flex-1"
                      size="lg"
                    >
                      <Upload className="h-5 w-5 mr-2" />
                      Upload File
                    </Button>
                  </div>
                </div>
              </>
            ) : (
              <>
                <Card>
                  <CardContent className="p-0">
                    <img
                      src={capturedImage.url}
                      alt="Captured"
                      className="w-full h-auto rounded-lg"
                    />
                  </CardContent>
                </Card>

                <div className="flex gap-2">
                  <Button
                    variant="outline"
                    onClick={retakePhoto}
                    className="flex-1"
                    size="lg"
                  >
                    <RotateCcw className="h-5 w-5 mr-2" />
                    Retake
                  </Button>
                  <Button
                    onClick={uploadPhoto}
                    disabled={isUploading}
                    className="flex-1 bg-green-600 hover:bg-green-700"
                    size="lg"
                  >
                    <Upload className="h-5 w-5 mr-2" />
                    {isUploading ? 'Uploading...' : 'Use Photo'}
                  </Button>
                </div>
              </>
            )}
          </div>
        </DialogContent>
      </Dialog>

      <input
        ref={fileInputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={handleFileSelect}
      />
    </>
  );
}