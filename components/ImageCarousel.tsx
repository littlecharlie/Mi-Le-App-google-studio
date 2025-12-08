import React, { useState } from 'react';
import { ChevronLeft, ChevronRight } from 'lucide-react';

interface ImageCarouselProps {
  images: string[];
  alt: string;
}

export const ImageCarousel: React.FC<ImageCarouselProps> = ({ images, alt }) => {
  const [currentIndex, setCurrentIndex] = useState(0);

  const prev = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick (like opening modal)
    setCurrentIndex((curr) => (curr === 0 ? images.length - 1 : curr - 1));
  };

  const next = (e: React.MouseEvent) => {
    e.stopPropagation(); // Prevent triggering parent onClick
    setCurrentIndex((curr) => (curr === images.length - 1 ? 0 : curr + 1));
  };

  if (!images || images.length === 0) return null;

  return (
    <div className="relative w-full h-full group">
      <img
        src={images[currentIndex]}
        alt={alt}
        className="w-full h-full object-cover transition duration-700"
      />
      
      {images.length > 1 && (
        <>
          <button
            onClick={prev}
            className="absolute left-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          >
            <ChevronLeft size={18} />
          </button>
          <button
            onClick={next}
            className="absolute right-2 top-1/2 -translate-y-1/2 bg-white/80 hover:bg-white p-1.5 rounded-full text-gray-800 opacity-0 group-hover:opacity-100 transition-opacity duration-200 z-10"
          >
            <ChevronRight size={18} />
          </button>
          
          <div className="absolute bottom-3 left-1/2 -translate-x-1/2 flex gap-1.5 z-10">
             {images.map((_, idx) => (
               <div 
                 key={idx} 
                 className={`w-1.5 h-1.5 rounded-full shadow-sm transition-all duration-300 ${idx === currentIndex ? 'bg-white scale-125 w-2' : 'bg-white/50'}`}
               />
             ))}
          </div>
        </>
      )}
    </div>
  );
};
