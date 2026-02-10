"use client";

import { useState, useCallback } from "react";
import Cropper, { Area } from "react-easy-crop";
import { Button } from "@/components/ui/button";
import { FiZoomIn, FiZoomOut, FiCheck, FiX } from "react-icons/fi";
import { useTranslation } from "@/src/i18n/client";

type Props = {
    isOpen: boolean;
    onClose: () => void;
    imageSrc: string;
    aspectRatio: number;
    onCropComplete: (croppedBlob: Blob) => void;
};

export default function CropImageModal({ isOpen, onClose, imageSrc, aspectRatio, onCropComplete }: Props) {
    const { dict } = useTranslation();
    const [crop, setCrop] = useState({ x: 0, y: 0 });
    const [zoom, setZoom] = useState(1);
    const [croppedAreaPixels, setCroppedAreaPixels] = useState<Area | null>(null);
    const [isProcessing, setIsProcessing] = useState(false);

    const onCropChange = useCallback((crop: { x: number; y: number }) => {
        setCrop(crop);
    }, []);

    const onZoomChange = useCallback((zoom: number) => {
        setZoom(zoom);
    }, []);

    const onCropAreaChange = useCallback((_: Area, croppedAreaPixels: Area) => {
        setCroppedAreaPixels(croppedAreaPixels);
    }, []);

    const handleConfirm = async () => {
        if (!croppedAreaPixels) return;

        setIsProcessing(true);
        try {
            const croppedBlob = await getCroppedImg(imageSrc, croppedAreaPixels);
            onCropComplete(croppedBlob);
            onClose();
        } catch (error) {
            console.error("Error cropping image:", error);
        } finally {
            setIsProcessing(false);
        }
    };

    const handleClose = () => {
        setCrop({ x: 0, y: 0 });
        setZoom(1);
        setCroppedAreaPixels(null);
        onClose();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/80 backdrop-blur-sm animate-in fade-in">
            <div className="bg-white w-[90vw] h-[90vh] max-w-[1200px] rounded-2xl shadow-2xl overflow-hidden m-4 animate-in zoom-in-95 flex flex-col">
                {/* Header */}
                <div className="flex items-center justify-between px-6 py-4 border-b border-[#e7eae9] shrink-0">
                    <h2 className="text-xl font-semibold text-[#152e2b]">{dict.profile.crop_modal.title}</h2>
                    <button
                        onClick={handleClose}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#f3f6f5] text-[#6b7c7a] transition-colors cursor-pointer"
                    >
                        <FiX size={20} />
                    </button>
                </div>

                {/* Crop Area */}
                <div className="relative flex-1 bg-[#1a1a1a] overflow-hidden">
                    <Cropper
                        image={imageSrc}
                        crop={crop}
                        zoom={zoom}
                        aspect={aspectRatio}
                        onCropChange={onCropChange}
                        onZoomChange={onZoomChange}
                        onCropComplete={onCropAreaChange}
                        showGrid={true}
                        objectFit="contain"
                        style={{
                            containerStyle: {
                                width: '100%',
                                height: '100%',
                            },
                            cropAreaStyle: {
                                border: '3px solid #05dc7f',
                                borderRadius: '12px',
                            }
                        }}
                    />
                </div>

                {/* Zoom Controls */}
                <div className="flex items-center justify-center gap-4 py-4 bg-[#fafafa] border-t border-[#e7eae9] shrink-0">
                    <button
                        onClick={() => setZoom(Math.max(1, zoom - 0.1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#e7eae9] text-[#6b7c7a] transition-colors cursor-pointer"
                    >
                        <FiZoomOut size={18} />
                    </button>
                    <input
                        type="range"
                        min={1}
                        max={3}
                        step={0.05}
                        value={zoom}
                        onChange={(e) => setZoom(Number(e.target.value))}
                        className="w-48 h-2 bg-[#e7eae9] rounded-full appearance-none cursor-pointer
                            [&::-webkit-slider-thumb]:appearance-none
                            [&::-webkit-slider-thumb]:w-4
                            [&::-webkit-slider-thumb]:h-4
                            [&::-webkit-slider-thumb]:rounded-full
                            [&::-webkit-slider-thumb]:bg-[#05dc7f]
                            [&::-webkit-slider-thumb]:cursor-pointer
                            [&::-webkit-slider-thumb]:shadow-md
                            [&::-webkit-slider-thumb]:transition-transform
                            [&::-webkit-slider-thumb]:hover:scale-110
                        "
                    />
                    <button
                        onClick={() => setZoom(Math.min(3, zoom + 0.1))}
                        className="w-8 h-8 flex items-center justify-center rounded-full hover:bg-[#e7eae9] text-[#6b7c7a] transition-colors cursor-pointer"
                    >
                        <FiZoomIn size={18} />
                    </button>
                    <span className="text-xs text-[#6b7c7a] ml-2 w-12">{Math.round(zoom * 100)}%</span>
                </div>

                {/* Footer */}
                <div className="flex justify-end gap-3 px-6 py-4 border-t border-[#e7eae9] bg-white shrink-0">
                    <Button
                        variant="ghost"
                        onClick={handleClose}
                        className="text-[#6b7c7a] hover:bg-[#e7eae9] cursor-pointer"
                        disabled={isProcessing}
                    >
                        {dict.profile.crop_modal.cancel}
                    </Button>
                    <Button
                        onClick={handleConfirm}
                        disabled={isProcessing}
                        className="bg-[#05dc7f] text-[#0f2f28] hover:bg-[#03c56f] cursor-pointer shadow-[0_4px_12px_rgba(5,220,127,0.2)]"
                    >
                        {isProcessing ? (
                            <span className="w-4 h-4 border-2 border-[#0f2f28] border-t-transparent rounded-full animate-spin mr-2" />
                        ) : (
                            <FiCheck className="mr-2" size={16} />
                        )}
                        {dict.profile.crop_modal.apply}
                    </Button>
                </div>
            </div>
        </div>
    );
}

// Função utilitária para recortar a imagem
async function getCroppedImg(imageSrc: string, pixelCrop: Area): Promise<Blob> {
    const image = await createImage(imageSrc);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d")!;

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
        canvas.toBlob((blob) => {
            if (blob) {
                resolve(blob);
            } else {
                reject(new Error("Failed to create blob"));
            }
        }, "image/webp", 0.9);
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
