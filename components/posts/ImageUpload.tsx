import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { ImagePlus, X } from 'lucide-react';

interface ImageUploadProps {
  onImageSelect: (file: File) => Promise<void>;
  onImageRemove: () => void;
  previewUrl?: string;
}

export default function ImageUpload({
  onImageSelect,
  onImageRemove,
  previewUrl,
}: ImageUploadProps) {
  const [isUploading, setIsUploading] = useState(false);

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setIsUploading(true);
    try {
      await onImageSelect(file);
    } finally {
      setIsUploading(false);
    }
  };

  return (
    <div>
      <Input
        type="file"
        accept="image/*"
        className="hidden"
        id="post-image"
        onChange={handleFileSelect}
        disabled={isUploading}
      />

      {previewUrl ? (
        <div className="relative">
          <img
            src={previewUrl}
            alt="Post preview"
            className="rounded-lg max-h-64 w-auto"
          />
          <Button
            variant="ghost"
            size="icon"
            className="absolute top-2 right-2"
            onClick={onImageRemove}
          >
            <X className="h-4 w-4" />
          </Button>
        </div>
      ) : (
        <Button
          type="button"
          variant="ghost"
          size="icon"
          onClick={() => document.getElementById('post-image')?.click()}
          disabled={isUploading}
        >
          <ImagePlus className="h-5 w-5" />
        </Button>
      )}
    </div>
  );
}