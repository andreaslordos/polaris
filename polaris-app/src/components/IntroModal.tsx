'use client';

import React, { useState } from 'react';

interface IntroModalProps {
  onClose: () => void;
}

const slides = [
  {
    title: 'Welcome to POLARIS',
    description: 'Your interactive guide to uncovering the secrets and stories of Harvard Yard. Explore, discover, and learn like never before!',
  },
  {
    title: 'Explorer Mode',
    description: 'Navigate the Yard and watch as landmarks appear on the map as you get closer. Uncover hidden gems and unlock their stories by approaching them. The closer you are, the clearer they become!',
  },
  {
    title: 'Atlas Mode',
    description: 'Switch to Atlas Mode to see all available landmarks at once. Perfect for getting an overview, planning your route, or revisiting places you\'ve already discovered.',
  },
];

const IntroModal: React.FC<IntroModalProps> = ({ onClose }) => {
  const [currentSlide, setCurrentSlide] = useState(0);

  const handleNext = () => {
    if (currentSlide < slides.length - 1) {
      setCurrentSlide(currentSlide + 1);
    } else {
      onClose(); // Close on the last slide
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-75 flex items-center justify-center z-[1000] p-4">
      <div className="bg-gray-800 text-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden">
        <div className="p-6 md:p-8 relative">
          {/* Close button (optional, as 'Next' on last slide closes it) */}
          {/* <button onClick={onClose} className="absolute top-4 right-4 text-gray-400 hover:text-white">&times;</button> */}
          
          <h2 className="text-2xl md:text-3xl font-bold mb-4 text-sky-400">{slides[currentSlide].title}</h2>
          <p className="text-sm md:text-base text-gray-300 mb-6 leading-relaxed min-h-[100px] md:min-h-[120px]">
            {slides[currentSlide].description}
          </p>

          <div className="flex justify-between items-center">
            <div className="flex space-x-2">
              {slides.map((_, index) => (
                <button
                  key={index}
                  onClick={() => setCurrentSlide(index)}
                  className={`w-3 h-3 rounded-full transition-colors duration-300 
                              ${currentSlide === index ? 'bg-sky-500' : 'bg-gray-600 hover:bg-gray-500'}`}
                  aria-label={`Go to slide ${index + 1}`}
                />
              ))}
            </div>
            <button
              onClick={handleNext}
              className="bg-sky-500 hover:bg-sky-600 text-white font-semibold py-2 px-4 rounded-lg transition-colors duration-300 text-sm md:text-base"
            >
              {currentSlide === slides.length - 1 ? 'Start Exploring!' : 'Next'}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default IntroModal; 