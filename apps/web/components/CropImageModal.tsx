"use client";

import { useState, useCallback, useEffect } from "react";
import { createPortal } from "react-dom";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { FiZoomIn, FiZoomOut, FiCheck, FiX } from "react-icons/fi";
import { useTranslation } from "@/src/i18n/client";
import { createLogger } from "@repo/observability";

const logger = createLogger("web.ui.crop-image-modal");

type Props = {
  isOpen: boolean;
  onClose: () => void;
  imageSrc: string;
  aspectRatio: number;
  onCropComplete: (croppedBlob: Blob) => void;
};

export default function CropImageModal({
  isOpen,
  onClose,
  imageSrc,
  aspectRatio,
  onCropComplete,
}: Props) {
  const { dict } = useTranslation();
  const [crop, setCrop] = useState({ x: 0, y: 0 });
  const [zoom, setZoom] = useState(1);
  const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
  const [isProcessing, setIsProcessing] = useState(false);
  const [currentAspect, setCurrentAspect] = useState(aspectRatio);
  const [mediaAspect, setMediaAspect] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);

  const isSquareDefault = Math.abs(aspectRatio - 1) < 0.01;
  const isOriginalSameAsDefault =
    mediaAspect !== null && Math.abs(mediaAspect - aspectRatio) < 0.01;
  const selectedPresetLabel =
    mediaAspect !== null && Math.abs(currentAspect - mediaAspect) < 0.01
      ? "Formato Original"
      : isSquareDefault
        ? "Formato Quadrado (1:1)"
        : currentAspect === 1
          ? "Formato Quadrado (1:1)"
          : "Formato Banner (16:9)";

  useEffect(() => {
    setMounted(true);
    return () => setMounted(false);
  }, []);

  const onCropChange = useCallback((nextCrop: { x: number; y: number }) => {
    setCrop(nextCrop);
  }, []);

  const onZoomChange = useCallback((nextZoom: number) => {
    setZoom(nextZoom);
  }, []);

  const onCropAreaChange = useCallback((_: Area, nextCroppedAreaPixels: Area) => {
    setCroppedAreaPixels(nextCroppedAreaPixels);
  }, []);

  const onMediaLoaded = useCallback(
    (mediaSize: { width: number; height: number; naturalWidth: number; naturalHeight: number }) => {
      const aspect = mediaSize.naturalWidth / mediaSize.naturalHeight;
      setMediaAspect(aspect);
    },
    []
  );

  const handleConfirm = async () => {
    if (!croppedAreaPixels) return;

    setIsProcessing(true);
    try {
      const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
      onCropComplete(croppedBlob);
      onClose();
    } catch (error) {
      logger.error("image.crop_failed", error, {
        hasCropArea: Boolean(croppedAreaPixels),
      });
    } finally {
      setIsProcessing(false);
    }
  };

  const handleClose = () => {
    setCrop({ x: 0, y: 0 });
    setZoom(1);
    setCroppedAreaPixels(null);
    setCurrentAspect(aspectRatio);
    onClose();
  };

  if (!isOpen || !mounted) return null;

  return createPortal(
    <div className="fixed inset-0 z-[300] flex items-end sm:items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
      <div className="bg-background w-full sm:w-[92vw] h-[88dvh] sm:h-[92vh] max-w-[1200px] max-h-[900px] rounded-t-[2rem] sm:rounded-2xl shadow-2xl overflow-hidden sm:m-4 animate-in slide-in-from-bottom-5 sm:zoom-in-95 grid grid-rows-[auto_minmax(0,1fr)_auto_auto] min-h-0">
        <div className="flex items-center justify-between px-4 sm:px-6 py-3 sm:py-4 border-b border-border shrink-0">
          <div className="flex flex-col gap-0.5">
            <h2 className="text-lg sm:text-xl font-semibold text-foreground leading-tight">
              {dict.profile.crop_modal.title}
            </h2>
            <p className="text-[10px] sm:text-xs text-muted-foreground flex items-center gap-1.5">
              {selectedPresetLabel}
            </p>
          </div>
          <button
            onClick={handleClose}
            className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
          >
            <FiX size={24} className="sm:hidden" />
            <FiX size={20} className="max-sm:hidden" />
          </button>
        </div>

        <div className="relative min-h-0 bg-[#121212] overflow-hidden">
          <Cropper
            image={imageSrc}
            crop={crop}
            zoom={zoom}
            minZoom={1}
            maxZoom={5}
            restrictPosition={true}
            aspect={currentAspect}
            onCropChange={onCropChange}
            onZoomChange={onZoomChange}
            onCropComplete={onCropAreaChange}
            onMediaLoaded={onMediaLoaded}
            showGrid={false}
            objectFit="contain"
            style={{
              containerStyle: {
                width: "100%",
                height: "100%",
              },
              cropAreaStyle: {
                border: "2px solid var(--primary)",
                borderRadius: "8px",
                boxShadow:
                  "0 0 0 1px rgba(5, 220, 127, 0.24), 0 0 18px rgba(5, 220, 127, 0.28), inset 0 0 0 1px rgba(255, 255, 255, 0.08)",
              },
            }}
          />
        </div>

        {/* Aspect Ratio & Zoom Controls */}
        <div className="flex flex-col bg-background border-t border-border shrink-0">
          {/* Zoom Control */}
          <div className="flex items-center justify-center gap-3 sm:gap-4 py-3 px-4 sm:px-6 border-b border-border/50">
            <button
              onClick={() => setZoom(Math.max(1, zoom - 0.1))}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <FiZoomOut size={20} className="sm:size-[18px]" />
            </button>
            <input
              type="range"
              min={1}
              max={5}
              step={0.05}
              value={zoom}
              onChange={(e) => setZoom(Number(e.target.value))}
              className={`flex-1 max-w-[240px] h-1.5 bg-border rounded-full appearance-none cursor-pointer
                [&::-webkit-slider-thumb]:appearance-none
                [&::-webkit-slider-thumb]:w-5
                [&::-webkit-slider-thumb]:h-5
                sm:[&::-webkit-slider-thumb]:w-4
                sm:[&::-webkit-slider-thumb]:h-4
                [&::-webkit-slider-thumb]:rounded-full
                [&::-webkit-slider-thumb]:bg-primary
                [&::-webkit-slider-thumb]:cursor-pointer
                [&::-webkit-slider-thumb]:shadow-md
                [&::-webkit-slider-thumb]:transition-transform
                [&::-webkit-slider-thumb]:hover:scale-110`}
            />
            <button
              onClick={() => setZoom(Math.min(5, zoom + 0.1))}
              className="w-10 h-10 sm:w-8 sm:h-8 flex items-center justify-center rounded-full hover:bg-muted text-muted-foreground transition-colors cursor-pointer"
            >
              <FiZoomIn size={20} className="sm:size-[18px]" />
            </button>
            <span className="text-[11px] font-medium text-muted-foreground ml-1 w-10 tabular-nums">
              {Math.round(zoom * 100)}%
            </span>
          </div>

          {/* Aspect Ratio Controls */}
          <div className="flex items-center sm:justify-center gap-2 px-3 py-2.5 overflow-x-auto no-scrollbar scroll-smooth">
            <Button
              variant={currentAspect === aspectRatio ? "secondary" : "ghost"}
              size="sm"
              onClick={() => {
                setCurrentAspect(aspectRatio);
                setZoom(1);
              }}
              className="h-9 sm:h-8 text-xs gap-2 px-4 sm:px-3 whitespace-nowrap rounded-lg"
            >
              <div className="w-4 h-2.5 border border-current opacity-70" />
              {isSquareDefault ? "Padrão" : "Banner"}
            </Button>
            {!isOriginalSameAsDefault && (
              <Button
                variant={mediaAspect && currentAspect === mediaAspect ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  if (mediaAspect) {
                    setCurrentAspect(mediaAspect);
                    setZoom(1);
                  }
                }}
                disabled={!mediaAspect}
                className="h-9 sm:h-8 text-xs gap-2 px-4 sm:px-3 whitespace-nowrap rounded-lg"
              >
                <div className="w-3.5 h-3.5 border border-dashed border-current opacity-70" />
                Original
              </Button>
            )}
            {!isSquareDefault && (
              <Button
                variant={currentAspect === 1 ? "secondary" : "ghost"}
                size="sm"
                onClick={() => {
                  setCurrentAspect(1);
                  setZoom(1);
                }}
                className="h-9 sm:h-8 text-xs gap-2 px-4 sm:px-3 whitespace-nowrap rounded-lg"
              >
                <div className="w-3.5 h-3.5 border border-current opacity-70" />
                Quadrado
              </Button>
            )}
          </div>
        </div>

        <div className="flex justify-end gap-3 px-4 sm:px-6 py-3.5 border-t border-border bg-background shrink-0 max-sm:grid max-sm:grid-cols-2">
          <Button
            variant="ghost"
            onClick={handleClose}
            className="text-muted-foreground hover:bg-muted cursor-pointer h-11 sm:h-10 px-5 rounded-xl sm:rounded-lg"
            disabled={isProcessing}
          >
            {dict.profile.crop_modal.cancel}
          </Button>
          <Button
            onClick={handleConfirm}
            disabled={isProcessing}
            className="bg-primary text-primary-foreground hover:bg-primary/90 cursor-pointer shadow-lg shadow-primary/20 h-11 sm:h-10 px-6 font-bold sm:font-semibold rounded-xl sm:rounded-lg"
          >
            {isProcessing ? (
              <span className="w-5 h-5 sm:w-4 sm:h-4 border-2 border-primary-foreground border-t-transparent rounded-full animate-spin mr-2" />
            ) : (
              <FiCheck className="mr-2 sm:size-4" size={18} />
            )}
            {dict.profile.crop_modal.apply}
          </Button>
        </div>
      </div>
      <style jsx>{`
        .no-scrollbar::-webkit-scrollbar {
          display: none;
        }
        .no-scrollbar {
          -ms-overflow-style: none;
          scrollbar-width: none;
        }
      `}</style>
    </div>,
    document.body
  );
}


async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
  const image = await createImage(imageSrc);
  const canvas = document.createElement("canvas");
  const ctx = canvas.getContext("2d");

  if (!ctx) {
    throw new Error("Failed to create canvas context");
  }

  canvas.width = pixelCrop.width;
  canvas.height = pixelCrop.height;

  ctx.drawImage(
    image,
    pixelCrop.x,
    pixelCrop.y,
    pixelCrop.width,
    pixelCrop.height,
    0,
    0,
    pixelCrop.width,
    pixelCrop.height
  );

  return new Promise((resolve, reject) => {
    canvas.toBlob(
      (blob) => {
        if (blob) {
          resolve(blob);
        } else {
          reject(new Error("Failed to create blob"));
        }
      },
      "image/webp",
      0.9
    );
  });
}

function createImage(url: string): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.addEventListener("load", () => resolve(image));
    image.addEventListener("error", (error) => reject(error));
    image.crossOrigin = "anonymous";
    image.src = url;
  });
}

