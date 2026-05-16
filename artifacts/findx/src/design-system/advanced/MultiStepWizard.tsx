/**
 * FindX Design System — Multi-step Wizard Component
 * 
 * A step-by-step wizard for complex multi-step workflows.
 * Supports validation, progress tracking, and keyboard navigation.
 * 
 * Design Tokens Used:
 * - --findx-accent (active step, progress)
 * - --findx-accent-subtle (completed step background)
 * - --findx-text-primary/secondary/muted (text colors)
 * - --findx-border-default (inactive borders)
 * - --findx-feedback-success (completed steps)
 * - --findx-feedback-danger (error steps)
 * - --findx-radius-full (step circles)
 * - --findx-radius-lg (container radius)
 * - --findx-space-4/6 (spacing)
 * - --findx-duration-normal (transitions)
 */

import * as React from "react";
import { cn } from "@/lib/utils";

// ═══════════════════════════════════════════════════════════════════════════════
// TYPES & INTERFACES
// ═══════════════════════════════════════════════════════════════════════════════

export type StepStatus = "pending" | "active" | "completed" | "error";

export interface WizardStep {
  /** Unique step identifier */
  id: string;
  /** Step title */
  title: string;
  /** Optional step description */
  description?: string;
  /** Optional icon */
  icon?: React.ReactNode;
  /** Whether step is optional */
  optional?: boolean;
  /** Validation function (returns error message or null) */
  validate?: () => string | null | Promise<string | null>;
  /** Component to render for this step */
  content: React.ReactNode;
}

export interface MultiStepWizardProps {
  /** Wizard steps configuration */
  steps: WizardStep[];
  /** Initial step index */
  initialStep?: number;
  /** Step change handler */
  onStepChange?: (stepIndex: number, direction: "next" | "prev") => void;
  /** Wizard completion handler */
  onComplete?: (allValues: Record<string, any>) => Promise<void> | void;
  /** Back button text */
  backText?: string;
  /** Next button text */
  nextText?: string;
  /** Complete button text */
  completeText?: string;
  /** Show step numbers */
  showStepNumbers?: boolean;
  /** Show progress bar */
  showProgressBar?: boolean;
  /** Allow skipping optional steps */
  allowSkip?: boolean;
  /** Linear mode (can't go back) */
  linear?: boolean;
  /** Wizard class */
  className?: string;
}

// ═══════════════════════════════════════════════════════════════════════════════
// STEP INDICATOR COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StepIndicatorProps {
  step: WizardStep;
  index: number;
  status: StepStatus;
  isLast: boolean;
  showNumber: boolean;
}

const StepIndicator: React.FC<StepIndicatorProps> = ({
  step,
  index,
  status,
  isLast,
  showNumber,
}) => {
  const getStatusStyles = () => {
    switch (status) {
      case "completed":
        return [
          "bg-[var(--findx-feedback-success)] text-white",
          "border-[var(--findx-feedback-success)]",
        ].join(" ");
      case "active":
        return [
          "bg-[var(--findx-accent)] text-[var(--findx-accent-foreground)]",
          "border-[var(--findx-accent)] ring-4 ring-[var(--findx-accent-subtle)]",
        ].join(" ");
      case "error":
        return [
          "bg-[var(--findx-feedback-danger)] text-white",
          "border-[var(--findx-feedback-danger)]",
        ].join(" ");
      default:
        return [
          "bg-[var(--findx-bg-subtle)] text-[var(--findx-text-muted)]",
          "border-[var(--findx-border-default)]",
        ].join(" ");
    }
  };

  return (
    <div className="flex items-center">
      {/* Step Circle */}
      <div
        className={cn(
          "relative w-10 h-10 rounded-full",
          "flex items-center justify-center",
          "border-2 font-semibold text-sm",
          "transition-all duration-[var(--findx-duration-normal)]",
          getStatusStyles()
        )}
        aria-current={status === "active" ? "step" : undefined}
      >
        {status === "completed" ? (
          <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-5" strokeWidth={3}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
          </svg>
        ) : showNumber ? (
          index + 1
        ) : step.icon ? (
          <span className="text-lg">{step.icon}</span>
        ) : (
          index + 1
        )}
      </div>

      {/* Connector Line */}
      {!isLast && (
        <div
          className={cn(
            "flex-1 h-0.5 mx-3 transition-colors duration-[var(--findx-duration-normal)]",
            status === "completed" || status === "active"
              ? "bg-[var(--findx-accent)]"
              : "bg-[var(--findx-border-default)]"
          )}
          aria-hidden="true"
        />
      )}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// STEP CONTENT COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

interface StepContentProps {
  step: WizardStep;
  index: number;
  isActive: boolean;
}

const StepContent: React.FC<StepContentProps> = ({ step, index, isActive }) => {
  return (
    <div
      className={cn(
        "animate-fade-in",
        !isActive && "hidden"
      )}
      role="tabpanel"
      id={`step-panel-${step.id}`}
      aria-labelledby={`step-tab-${step.id}`}
    >
      {step.content}
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// MAIN WIZARD COMPONENT
// ═══════════════════════════════════════════════════════════════════════════════

const MultiStepWizard: React.FC<MultiStepWizardProps> = ({
  steps,
  initialStep = 0,
  onStepChange,
  onComplete,
  backText = "Back",
  nextText = "Next",
  completeText = "Complete",
  showStepNumbers = true,
  showProgressBar = true,
  allowSkip = true,
  linear = false,
  className,
}) => {
  // State
  const [currentStep, setCurrentStep] = React.useState(initialStep);
  const [stepStatuses, setStepStatuses] = React.useState<Record<string, StepStatus>>({});
  const [isValidating, setIsValidating] = React.useState(false);
  const [direction, setDirection] = React.useState<"next" | "prev">("next");

  // Get step status
  const getStepStatus = (index: number): StepStatus => {
    if (stepStatuses[steps[index].id]) return stepStatuses[steps[index].id];
    if (index < currentStep) return "completed";
    if (index === currentStep) return "active";
    return "pending";
  };

  // Calculate progress
  const progress = ((currentStep) / (steps.length - 1)) * 100;

  // Validate current step
  const validateCurrentStep = async (): Promise<boolean> => {
    const step = steps[currentStep];
    if (!step.validate) return true;

    setIsValidating(true);
    try {
      const error = await step.validate();
      if (error) {
        setStepStatuses((prev) => ({ ...prev, [step.id]: "error" }));
        return false;
      }
      setStepStatuses((prev) => ({ ...prev, [step.id]: "completed" }));
      return true;
    } finally {
      setIsValidating(false);
    }
  };

  // Handle next
  const handleNext = async () => {
    const isValid = await validateCurrentStep();
    if (!isValid) return;

    if (currentStep === steps.length - 1) {
      // Complete wizard
      await onComplete?.({});
      return;
    }

    const nextStep = currentStep + 1;
    setDirection("next");
    setCurrentStep(nextStep);
    onStepChange?.(nextStep, "next");
  };

  // Handle back
  const handleBack = () => {
    if (currentStep === 0) return;
    
    const prevStep = currentStep - 1;
    setDirection("prev");
    setCurrentStep(prevStep);
    onStepChange?.(prevStep, "prev");
  };

  // Handle step click (for non-linear navigation)
  const handleStepClick = (index: number) => {
    if (linear) return; // Can't navigate freely in linear mode
    
    // Can only go to completed steps or current/next optional
    const status = getStepStatus(index);
    if (status === "completed" || status === "pending") {
      // Check if can navigate (all previous steps must be valid)
      const canNavigate = steps.slice(0, index).every(
        (s) => !s.validate || getStepStatus(steps.indexOf(s)) === "completed"
      );
      
      if (canNavigate || index <= currentStep) {
        setDirection(index > currentStep ? "next" : "prev");
        setCurrentStep(index);
        onStepChange?.(index, index > currentStep ? "next" : "prev");
      }
    }
  };

  // Keyboard navigation
  React.useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === "Escape" && currentStep > 0) {
        handleBack();
      }
    };

    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, [currentStep]);

  // Check if can proceed
  const canGoNext = () => {
    const step = steps[currentStep];
    if (step.optional && allowSkip) return true;
    return true; // Let validation handle it
  };

  const isLastStep = currentStep === steps.length - 1;
  const isFirstStep = currentStep === 0;

  return (
    <div
      className={cn(
        "w-full rounded-[var(--findx-radius-lg)]",
        "bg-[var(--findx-surface-glass)]",
        "border border-[var(--findx-surface-border)]",
        "shadow-[var(--findx-shadow-md)]",
        "overflow-hidden",
        className
      )}
    >
      {/* Progress Bar */}
      {showProgressBar && (
        <div className="h-1 bg-[var(--findx-bg-inset)]">
          <div
            className="h-full bg-[var(--findx-accent)] transition-all duration-[var(--findx-duration-slow)]"
            style={{ width: `${progress}%` }}
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label={`Step ${currentStep + 1} of ${steps.length}`}
          />
        </div>
      )}

      {/* Step Indicators */}
      <div className="px-6 pt-6 pb-4">
        <nav aria-label="Wizard steps" className="flex items-center">
          {steps.map((step, index) => (
            <div
              key={step.id}
              className={cn(
                !linear && "cursor-pointer",
                index < steps.length - 1 && "flex-1"
              )}
              onClick={() => handleStepClick(index)}
            >
              <StepIndicator
                step={step}
                index={index}
                status={getStepStatus(index)}
                isLast={index === steps.length - 1}
                showNumber={showStepNumbers}
              />
            </div>
          ))}
        </nav>

        {/* Current Step Info */}
        <div className="mt-4 text-center">
          <h2 className="text-lg font-semibold text-[var(--findx-text-primary)]">
            {steps[currentStep].title}
          </h2>
          {steps[currentStep].description && (
            <p className="mt-1 text-sm text-[var(--findx-text-secondary)]">
              {steps[currentStep].description}
            </p>
          )}
          {steps[currentStep].optional && (
            <span className="inline-block mt-2 px-2 py-0.5 text-xs font-medium rounded-full bg-[var(--findx-bg-inset)] text-[var(--findx-text-muted)]">
              Optional
            </span>
          )}
        </div>
      </div>

      {/* Step Content */}
      <div className="px-6 pb-6">
        <div className="min-h-[200px]">
          {steps.map((step, index) => (
            <StepContent
              key={step.id}
              step={step}
              index={index}
              isActive={index === currentStep}
            />
          ))}
        </div>

        {/* Navigation */}
        <div className="flex items-center justify-between pt-6 mt-6 border-t border-[var(--findx-border-default)]">
          {/* Back Button */}
          <button
            type="button"
            onClick={handleBack}
            disabled={isFirstStep || isValidating}
            className={cn(
              "h-[var(--findx-space-9)] px-[var(--findx-space-4)]",
              "flex items-center gap-2",
              "bg-[var(--findx-bg-subtle)] text-[var(--findx-text-secondary)]",
              "border border-[var(--findx-border-default)] rounded-[var(--findx-radius-md)]",
              "font-medium text-sm",
              "transition-colors duration-[var(--findx-duration-fast)]",
              "hover:bg-[var(--findx-bg-inset)] hover:border-[var(--findx-border-strong)]",
              "disabled:opacity-50 disabled:cursor-not-allowed"
            )}
          >
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
            </svg>
            {backText}
          </button>

          {/* Step Counter */}
          <span className="text-sm text-[var(--findx-text-muted)]">
            Step {currentStep + 1} of {steps.length}
          </span>

          {/* Next/Complete Button */}
          <button
            type="button"
            onClick={handleNext}
            disabled={isValidating}
            className={cn(
              "h-[var(--findx-space-9)] px-[var(--findx-space-4)]",
              "flex items-center gap-2",
              "bg-[var(--findx-accent)] text-[var(--findx-accent-foreground)]",
              "rounded-[var(--findx-radius-md)]",
              "font-medium text-sm",
              "transition-colors duration-[var(--findx-duration-fast)]",
              "hover:bg-[var(--findx-accent-hover)]",
              "disabled:opacity-50 disabled:cursor-not-allowed",
              isValidating && "cursor-wait"
            )}
          >
            {isValidating ? (
              <>
                <svg className="animate-spin w-4 h-4" viewBox="0 0 24 24" fill="none">
                  <circle cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" strokeOpacity="0.25" />
                  <path fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" opacity="0.75" />
                </svg>
                Validating...
              </>
            ) : (
              <>
                {isLastStep ? completeText : nextText}
                {!isLastStep && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                  </svg>
                )}
                {isLastStep && (
                  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" className="size-4">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════════════════════
// EXPORTS
// ═══════════════════════════════════════════════════════════════════════════════

export { MultiStepWizard };
export type {
  MultiStepWizardProps,
  WizardStep,
  StepStatus,
};