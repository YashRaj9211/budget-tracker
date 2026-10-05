import React, { useState, useEffect } from 'react';
import { ChevronLeft, ChevronRight, X, Check } from 'lucide-react';
import { usePWAInstall } from '../../hooks/usePWAInstall';
import BottomSheet from '../ui/BottomSheet';

const DISMISS_KEY = 'budget_ios_pwa_guide_dismissed';

interface IOSInstallGuideProps {
  /** If provided, overrides auto-popup logic (e.g. triggered manually from settings or a banner) */
  isOpen?: boolean;
  onClose?: () => void;
}

interface Step {
  title: string;
  subtitle: string;
  image: string;
  badge: string;
  objectPosition?: string;
}

const STEPS: Step[] = [
  {
    title: 'Tap the Share Button',
    subtitle: 'In Safari toolbar at the bottom (or top on iPad), tap the Share icon.',
    image: '/assets/ios_install_guide/ios%20step%201.jpeg',
    badge: 'Step 1 of 3',
    objectPosition: 'object-bottom',
  },
  {
    title: 'Select "Add to Home Screen"',
    subtitle: 'Scroll down the share menu options and choose "Add to Home Screen".',
    image: '/assets/ios_install_guide/ios%20step%202.jpeg',
    badge: 'Step 2 of 3',
    objectPosition: 'object-bottom',
  },
  {
    title: 'Confirm and Tap "Add"',
    subtitle: 'Make sure "Open as Web App" is turned on, then tap Add in the top-right corner.',
    image: '/assets/ios_install_guide/ios%20step%203.jpeg',
    badge: 'Step 3 of 3',
    objectPosition: 'object-top',
  },
];

export const IOSInstallGuide: React.FC<IOSInstallGuideProps> = ({
  isOpen: externalIsOpen,
  onClose: externalOnClose,
}) => {
  const { platform, isInstalled } = usePWAInstall();
  const [internalOpen, setInternalOpen] = useState(false);
  const [currentStep, setCurrentStep] = useState(0);

  // Auto-prompt first-time iOS visitors who haven't installed or dismissed yet
  useEffect(() => {
    if (externalIsOpen !== undefined) return;

    if (platform === 'ios' && !isInstalled) {
      const isDismissed = localStorage.getItem(DISMISS_KEY) === 'true';
      if (!isDismissed) {
        const timer = setTimeout(() => {
          setInternalOpen(true);
        }, 1500);
        return () => clearTimeout(timer);
      }
    }
  }, [platform, isInstalled, externalIsOpen]);

  const isOpen = externalIsOpen !== undefined ? externalIsOpen : internalOpen;

  const handleClose = () => {
    if (externalOnClose) {
      externalOnClose();
    } else {
      setInternalOpen(false);
      localStorage.setItem(DISMISS_KEY, 'true');
    }
  };

  const nextStep = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep((prev) => prev + 1);
    } else {
      handleClose();
    }
  };

  const prevStep = () => {
    if (currentStep > 0) {
      setCurrentStep((prev) => prev - 1);
    }
  };

  // Only render on iOS or when manually previewed via props
  if (platform !== 'ios' && externalIsOpen === undefined) {
    return null;
  }

  if (isInstalled && externalIsOpen === undefined) {
    return null;
  }

  const step = STEPS[currentStep];

  return (
    <BottomSheet isOpen={isOpen} onClose={handleClose} hideCloseButton hideHandle maxHeight="max-h-[92vh]">
      <div className="relative pt-1 pb-2 flex flex-col">
        {/* Header bar */}
        <div className="flex items-center justify-between pb-3 border-b border-black/5">
          <div className="flex items-center gap-2.5">
            <img
              src="/budget-tracker-icon.svg"
              alt="Budget Tracker App"
              className="w-8 h-8 rounded-xl shrink-0 shadow-xs"
            />
            <div>
              <h3 className="text-sm font-bold text-text leading-tight">Install on iPhone / iPad</h3>
              <p className="text-[11px] text-text-muted">Follow 3 quick steps in Safari</p>
            </div>
          </div>

          <button
            type="button"
            onClick={handleClose}
            className="w-8 h-8 rounded-full bg-surface flex items-center justify-center text-text-muted hover:text-text transition-colors cursor-pointer"
            aria-label="Dismiss iOS guide"
          >
            <X size={16} strokeWidth={2} />
          </button>
        </div>

        {/* Carousel Content */}
        <div className="py-3 flex flex-col items-center">
          {/* Step Pill */}
          <div className="mb-2">
            <span className="inline-block px-3 py-0.5 text-[11px] font-semibold tracking-wide bg-mint/40 text-mint-deep rounded-full">
              {step.badge}
            </span>
          </div>

          {/* Titles */}
          <h4 className="text-base font-bold text-text text-center">{step.title}</h4>
          <p className="text-xs text-text-muted text-center px-4 mt-1 mb-3.5 leading-relaxed min-h-[34px]">
            {step.subtitle}
          </p>

          {/* Screenshot Container with Device mockup feel */}
          <div className="relative w-full max-w-[270px] aspect-[9/16] max-h-[380px] rounded-3xl overflow-hidden shadow-xl border border-black/10 bg-black/5 flex items-center justify-center">
            <img
              src={step.image}
              alt={step.title}
              className={`w-full h-full object-cover select-none ${step.objectPosition || 'object-center'}`}
              loading="eager"
            />

            {/* Left navigation arrow on image */}
            {currentStep > 0 && (
              <button
                type="button"
                onClick={prevStep}
                aria-label="Previous step"
                className="absolute left-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/75 hover:bg-ink text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 cursor-pointer shadow-md"
              >
                <ChevronLeft size={18} />
              </button>
            )}

            {/* Right navigation arrow on image */}
            {currentStep < STEPS.length - 1 && (
              <button
                type="button"
                onClick={nextStep}
                aria-label="Next step"
                className="absolute right-2 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-ink/75 hover:bg-ink text-white flex items-center justify-center backdrop-blur-xs transition-transform active:scale-90 cursor-pointer shadow-md"
              >
                <ChevronRight size={18} />
              </button>
            )}
          </div>

          {/* Dot Indicators */}
          <div className="flex items-center gap-1.5 mt-3 mb-1">
            {STEPS.map((_, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => setCurrentStep(idx)}
                aria-label={`Go to step ${idx + 1}`}
                className={`h-2 rounded-full transition-all duration-300 cursor-pointer ${
                  idx === currentStep ? 'w-6 bg-ink' : 'w-2 bg-black/20 hover:bg-black/40'
                }`}
              />
            ))}
          </div>
        </div>

        {/* Carousel Action Buttons */}
        <div className="pt-2 flex items-center gap-2">
          {currentStep > 0 && (
            <button
              type="button"
              onClick={prevStep}
              className="py-3 px-4 rounded-2xl bg-surface hover:bg-black/5 text-text font-medium text-xs transition-colors cursor-pointer flex items-center justify-center gap-1"
            >
              <ChevronLeft size={16} />
              <span>Back</span>
            </button>
          )}

          <button
            type="button"
            onClick={nextStep}
            className="flex-1 py-3 px-4 rounded-2xl bg-ink text-white font-medium text-xs transition-transform active:scale-[0.98] cursor-pointer flex items-center justify-center gap-1.5 shadow-md hover:bg-ink-soft"
          >
            {currentStep < STEPS.length - 1 ? (
              <>
                <span>Next Step</span>
                <ChevronRight size={16} />
              </>
            ) : (
              <>
                <Check size={16} className="text-mint" />
                <span>Got it!</span>
              </>
            )}
          </button>
        </div>
      </div>
    </BottomSheet>
  );
};

export default IOSInstallGuide;
