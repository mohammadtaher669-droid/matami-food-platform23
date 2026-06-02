import { useState } from "react";
import { type ImagePreset, PLACEHOLDERS } from "@/lib/imageUtils";

interface Props {
  src?: string | null;
  alt?: string;
  className?: string;
  preset?: ImagePreset;
  fallbackEmoji?: string;
  style?: React.CSSProperties;
}

export default function ImageWithFallback({ src, alt = "", className = "", preset = "product", fallbackEmoji, style }: Props) {
  const [errored, setErrored] = useState(false);

  if (!src || errored) {
    if (fallbackEmoji) {
      return (
        <span className={`flex items-center justify-center text-2xl ${className}`} style={style} aria-label={alt}>
          {fallbackEmoji}
        </span>
      );
    }
    return (
      <img
        src={PLACEHOLDERS[preset]}
        alt={alt}
        className={className}
        style={style}
        loading="lazy"
      />
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      style={style}
      loading="lazy"
      onError={() => setErrored(true)}
    />
  );
}
