"use client";

import { useState } from "react";
import Image from "next/image";
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  DragEndEvent,
  DragStartEvent,
  DragOverlay,
} from "@dnd-kit/core";
import {
  arrayMove,
  SortableContext,
  sortableKeyboardCoordinates,
  useSortable,
  horizontalListSortingStrategy,
} from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { FiEdit2, FiX, FiUpload } from "react-icons/fi";
import { cn } from "@/lib/utils";

export type SortableImage = {
  id: string;
  preview: string;
  file?: File;
  isNew?: boolean;
};

type SortableImageItemProps = {
  image: SortableImage;
  onRemove: (id: string) => void;
  isPrimary?: boolean;
  primaryLabel?: string;
  isDragging?: boolean;
};


function SortableImageItem({
  image,
  onRemove,
  isPrimary,
  primaryLabel,
  isDragging,
}: SortableImageItemProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging: isSorting,
  } = useSortable({ id: image.id });

  const style = {
    transform: CSS.Transform.toString(transform),
    transition,
  };

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "relative aspect-video rounded-lg overflow-hidden border border-border group bg-muted cursor-grab active:cursor-grabbing",
        isPrimary && "border-primary/40 shadow-[0_0_0_1px_hsl(var(--primary)/0.18)]",
        isSorting && "opacity-50 z-10",
        isDragging && "ring-2 ring-primary ring-offset-2"
      )}
      {...attributes}
      {...listeners}
    >
      <Image
        src={image.preview}
        alt="Project image"
        fill
        sizes="(max-width: 768px) 33vw, 180px"
        unoptimized
        className="object-cover pointer-events-none"
        draggable={false}
      />

      {isPrimary && primaryLabel && (
        <span className="absolute left-2 top-2 rounded-full bg-black/70 px-2.5 py-1 text-[10px] font-semibold uppercase tracking-[0.16em] text-white backdrop-blur-sm">
          {primaryLabel}
        </span>
      )}

      <button
        onClick={(e) => {
          e.stopPropagation();
          onRemove(image.id);
        }}
        onPointerDown={(e) => e.stopPropagation()}
        className="absolute top-1 right-1 p-1 bg-red-500/90 text-white rounded-full opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-600 focus:opacity-100 shadow-sm cursor-pointer"
        title="Remove image"
      >
        <FiX className="w-3 h-3" />
      </button>


      <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-transparent to-transparent opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none" />
    </div>
  );
}

type DragOverlayImageProps = {
  image: SortableImage;
};

function DragOverlayImage({ image }: DragOverlayImageProps) {
  return (
    <div className="relative aspect-video rounded-lg overflow-hidden border-2 border-primary bg-muted shadow-2xl cursor-grabbing w-[150px]">
      <Image
        src={image.preview}
        alt="Dragging"
        fill
        sizes="150px"
        unoptimized
        className="object-cover"
        draggable={false}
      />
    </div>
  );
}

type SortableImageGridProps = {
  images: SortableImage[];
  onReorder: (images: SortableImage[]) => void;
  onRemove: (id: string) => void;
  onAddClick: () => void;
  maxImages?: number;
  addLabel?: string;
  primaryLabel?: string;
};


export default function SortableImageGrid({
  images,
  onReorder,
  onRemove,
  onAddClick,
  maxImages = 3,
  addLabel = "Add",
  primaryLabel,
}: SortableImageGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null);

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5, // 5px movement required before drag starts
      },
    }),
    useSensor(KeyboardSensor, {
      coordinateGetter: sortableKeyboardCoordinates,
    })
  );

  const handleDragStart = (event: DragStartEvent) => {
    setActiveId(event.active.id as string);
  };

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    setActiveId(null);

    if (over && active.id !== over.id) {
      const oldIndex = images.findIndex((img) => img.id === active.id);
      const newIndex = images.findIndex((img) => img.id === over.id);
      const reordered = arrayMove(images, oldIndex, newIndex);
      onReorder(reordered);
    }
  };

  const activeImage = activeId ? images.find((img) => img.id === activeId) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="grid grid-cols-3 gap-3">
        <SortableContext
          items={images.map((img) => img.id)}
          strategy={horizontalListSortingStrategy}
        >
          {images.map((image) => (
            <SortableImageItem
              key={image.id}
              image={image}
              onRemove={onRemove}
              isPrimary={image.id === images[0]?.id}
              primaryLabel={primaryLabel}
              isDragging={activeId === image.id}
            />
          ))}
        </SortableContext>

        {images.length < maxImages && (
          <div
            onClick={onAddClick}
            className="relative aspect-video rounded-lg border-2 border-dashed border-border overflow-hidden cursor-pointer hover:border-primary transition-colors bg-muted/50 flex flex-col items-center justify-center text-muted-foreground hover:text-primary hover:bg-secondary/50"
          >
            <FiUpload className="w-6 h-6 mb-1" />
            <span className="text-[10px] font-medium uppercase tracking-wide">{addLabel}</span>
          </div>
        )}
      </div>

      <DragOverlay>{activeImage ? <DragOverlayImage image={activeImage} /> : null}</DragOverlay>
    </DndContext>
  );
}
