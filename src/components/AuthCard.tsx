import React, { useState, useEffect } from 'react';
import { AuthService } from '../services/auth';
import { User } from '../types';
import { Mail, KeyRound, CheckCircle2, AlertCircle, ArrowRight, RefreshCw, ExternalLink } from 'lucide-react';

interface AuthCardProps {
  onSuccess: (user: User) => void;
  theme?: 'dark' | 'light';
}

export const AuthCard: React.FC<AuthCardProps> = ({ onSuccess }) => {
  const [email, setEmail] = useState('yashrajgurejani@gmail.com');
  const [userName, setUserName] = useState('Yashraj');
  const [emailError, setEmailError] = useState<string | null>(null);
  const [isOtpSent, setIsOtpSent] = useState(false);
  const [otpCode, setOtpCode] = useState('');
  const [demoCodeHint, setDemoCodeHint] = useState<string | null>(null);
  const [previewUrl, setPreviewUrl] = useState<string | null>(null);
  const [statusMessage, setStatusMessage] = useState<{ type: 'success' | 'error' | 'info'; text: string } | null>(null);

  // Timer & Attempts
  const [resendTimer, setResendTimer] = useState(60);
  const [isResendDisabled, setIsResendDisabled] = useState(true);
  const [remainingAttempts, setRemainingAttempts] = useState<number>(3);
  const [isSubmitting, setIsSubmitting] = useState(false);

  useEffect(() => {
    let interval: NodeJS.Timeout;
    if (isOtpSent && resendTimer > 0) {
      interval = setInterval(() => {
        setResendTimer((prev) => {
          if (prev <= 1) {
            setIsResendDisabled(false);
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }
    return () => clearInterval(interval);
  }, [isOtpSent, resendTimer]);

  const handleEmailChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    setEmail(val);
    if (!val) {
      setEmailError(null);
      return;
    }
    const check = AuthService.validateEmail(val);
    if (!check.isValid) {
      setEmailError(check.errorMessage || 'Please enter a valid email address.');
    } else {
      setEmailError(null);
    }
  };

  const handleSendOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    const check = AuthService.validateEmail(email);
    if (!check.isValid) {
      setEmailError('Please enter a valid email address.');
      return;
    }

    setIsSubmitting(true);
    setStatusMessage(null);

    const result = await AuthService.requestOtp(email, userName);
    setIsSubmitting(false);

    if (result.success) {
      setIsOtpSent(true);
      setDemoCodeHint(result.otpCode || null);
      setPreviewUrl(result.previewUrl || null);
      setResendTimer(60);
      setIsResendDisabled(true);
      setRemainingAttempts(3);
      setStatusMessage({
        type: 'info',
        text: result.message,
      });
    } else {
      setStatusMessage({
        type: 'error',
        text: result.message,
      });
    }
  };

  const handleVerifyOtp = async (e: React.FormEvent) => {
    e.preventDefault();
    if (otpCode.length !== 6) {
      setStatusMessage({
        type: 'error',
        text: 'Please enter a complete 6-digit code.',
      });
      return;
    }

    setIsSubmitting(true);
    const result = await AuthService.verifyOtp(email, otpCode, userName);
    setIsSubmitting(false);

    if (result.success && result.user) {
      setStatusMessage({
        type: 'success',
        text: 'Verified! Entering BridgeSpeak Studio...',
      });
      setTimeout(() => {
        onSuccess(result.user!);
      }, 400);
    } else {
      if (typeof result.remainingAttempts === 'number') {
        setRemainingAttempts(result.remainingAttempts);
      }
      setStatusMessage({
        type: 'error',
        text: result.message,
      });
    }
  };

  const handleResend = async () => {
    if (isResendDisabled) return;
    setIsSubmitting(true);
    const result = await AuthService.requestOtp(email, userName);
    setIsSubmitting(false);

    if (result.success) {
      setDemoCodeHint(result.otpCode || null);
      setPreviewUrl(result.previewUrl || null);
      setResendTimer(60);
      setIsResendDisabled(true);
      setRemainingAttempts(3);
      setOtpCode('');
      setStatusMessage({
        type: 'info',
        text: `New 6-digit code dispatched to your Gmail (${email})!`,
      });
    }
  };

  const isEmailValid = email.trim().length > 0 && emailError === null;

  return (
    <div className="w-full max-w-md mx-auto p-8 sm:p-10 rounded-xl bg-black/85 backdrop-blur-xl border border-neutral-800 shadow-[0_20px_60px_rgba(0,0,0,0.9)] text-white relative">
      {/* Netflix-style Red Accent Bar */}
      <div className="absolute top-0 left-8 right-8 h-1 bg-[#E50914] rounded-t-xl" />

      {/* Header */}
      <div className="mb-8">
        <div className="flex items-center gap-2 mb-2">
          <span className="text-[#E50914] font-black tracking-tighter text-3xl font-sans">
            BRIDGESPEAK
          </span>
          <span className="text-[10px] font-mono text-neutral-400 uppercase tracking-widest px-1.5 py-0.5 bg-neutral-900 rounded border border-neutral-700">
            CINEMA
          </span>
        </div>
        <h2 className="text-2xl font-bold tracking-tight text-white">
          Sign In
        </h2>
        <p className="text-xs text-neutral-400 mt-1">
          Enter your email to receive an instant 6-digit passcode in your Gmail inbox
        </p>
      </div>

      {/* Status banner */}
      {statusMessage && (
        <div
          className={`mb-6 p-4 rounded-lg text-xs flex items-start gap-3 ${
            statusMessage.type === 'error'
              ? 'bg-red-950/50 text-red-300 border border-red-800/60'
              : statusMessage.type === 'success'
              ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/60'
              : 'bg-neutral-900 text-neutral-200 border border-neutral-700'
          }`}
        >
          {statusMessage.type === 'error' ? (
            <AlertCircle className="w-4 h-4 shrink-0 mt-0.5 text-[#E50914]" />
          ) : statusMessage.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 shrink-0 mt-0.5 text-emerald-400" />
          ) : (
            <KeyRound className="w-4 h-4 shrink-0 mt-0.5 text-[#E50914]" />
          )}
          <div className="leading-relaxed">
            <span className="font-medium">{statusMessage.text}</span>
            {previewUrl && (
              <a
                href={previewUrl}
                target="_blank"
                rel="noreferrer"
                className="mt-1 block text-[#E50914] underline text-[11px] flex items-center gap-1 hover:text-red-400"
              >
                <span>View Delivered Gmail Preview</span>
                <ExternalLink className="w-3 h-3" />
              </a>
            )}
          </div>
        </div>
      )}

      {!isOtpSent ? (
        /* STEP 1: Enter Email */
        <form onSubmit={handleSendOtp} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Your Name (Optional)
            </label>
            <input
              type="text"
              value={userName}
              onChange={(e) => setUserName(e.target.value)}
              placeholder="e.g. Yashraj Gurejani"
              className="w-full px-4 py-3.5 rounded-lg bg-[#333333]/70 border border-neutral-700 text-white text-sm focus:outline-none focus:border-white focus:bg-[#454545] transition-all placeholder:text-neutral-500"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-neutral-400 uppercase tracking-wider mb-2">
              Email Address <span className="text-[#E50914]">*</span>
            </label>
            <div className="relative">
              <input
                type="email"
                value={email}
                onChange={handleEmailChange}
                placeholder="name@gmail.com"
                required
                className="w-full pl-11 pr-4 py-3.5 rounded-lg bg-[#333333]/70 border border-neutral-700 text-white text-sm focus:outline-none focus:border-white focus:bg-[#454545] transition-all placeholder:text-neutral-500"
              />
              <Mail className="w-4 h-4 absolute left-4 top-4 text-neutral-400 pointer-events-none" />
            </div>

            {emailError && (
              <p className="mt-2 text-xs text-[#E50914] font-medium flex items-center gap-1.5">
                <AlertCircle className="w-3.5 h-3.5 shrink-0" />
                {emailError}
              </p>
            )}
          </div>

          <button
            type="submit"
            disabled={!isEmailValid || isSubmitting}
            className={`w-full py-3.5 px-4 rounded-lg text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 text-white shadow-lg cursor-pointer ${
              !isEmailValid || isSubmitting
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-[#E50914] hover:bg-[#C10711] active:scale-[0.99] shadow-red-950/40'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <span>Send Passcode to Gmail</span>
                <ArrowRight className="w-4 h-4" />
              </>
            )}
          </button>
        </form>
      ) : (
        /* STEP 2: Verify 6-digit OTP */
        <form onSubmit={handleVerifyOtp} className="space-y-5">
          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs font-semibold text-neutral-400 uppercase tracking-wider">
                6-Digit Gmail Passcode
              </label>
              <button
                type="button"
                onClick={() => {
                  setIsOtpSent(false);
                  setStatusMessage(null);
                }}
                className="text-xs text-neutral-400 hover:text-white underline cursor-pointer"
              >
                Change email
              </button>
            </div>

            <input
              type="text"
              inputMode="numeric"
              pattern="[0-9]*"
              maxLength={6}
              value={otpCode}
              onChange={(e) => setOtpCode(e.target.value.replace(/\D/g, ''))}
              placeholder="123456"
              autoFocus
              required
              className="w-full tracking-[0.4em] text-center font-mono text-2xl py-3.5 rounded-lg bg-[#333333]/80 border-2 border-[#E50914] text-white focus:outline-none focus:bg-[#454545] font-black"
            />

            {demoCodeHint && (
              <div className="mt-3 flex items-center justify-between text-xs bg-neutral-900/80 p-2.5 rounded border border-neutral-800">
                <span className="text-neutral-400">
                  Inbox code: <strong className="font-mono text-white text-sm ml-1">{demoCodeHint}</strong>
                </span>
                <button
                  type="button"
                  onClick={() => setOtpCode(demoCodeHint)}
                  className="font-bold underline text-[#E50914] hover:text-red-400 cursor-pointer"
                >
                  Quick Fill
                </button>
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={otpCode.length !== 6 || isSubmitting || remainingAttempts <= 0}
            className={`w-full py-3.5 px-4 rounded-lg text-sm font-bold tracking-wide transition-all flex items-center justify-center gap-2 text-white shadow-lg cursor-pointer ${
              otpCode.length !== 6 || isSubmitting || remainingAttempts <= 0
                ? 'bg-neutral-800 text-neutral-500 cursor-not-allowed'
                : 'bg-[#E50914] hover:bg-[#C10711] active:scale-[0.99] shadow-red-950/40'
            }`}
          >
            {isSubmitting ? (
              <RefreshCw className="w-4 h-4 animate-spin" />
            ) : (
              <span>Sign In & Launch Studio</span>
            )}
          </button>

          <div className="pt-3 flex items-center justify-between text-xs text-neutral-400 border-t border-neutral-800">
            <span>
              Attempts left: <strong className="text-white font-mono">{remainingAttempts}</strong>/3
            </span>
            <button
              type="button"
              onClick={handleResend}
              disabled={isResendDisabled}
              className={`transition-colors cursor-pointer ${
                isResendDisabled ? 'opacity-40 cursor-not-allowed' : 'text-neutral-300 hover:text-white underline font-semibold'
              }`}
            >
              {isResendDisabled ? `Resend in ${resendTimer}s` : 'Resend Code'}
            </button>
          </div>
        </form>
      )}

      {/* Netflix-style footer note */}
      <div className="mt-8 text-neutral-500 text-[11px] leading-relaxed">
        This page is protected by Google MediaPipe Vision tasks and Node.js Gmail OTP verification to ensure secure real-time accessibility translation.
      </div>
    </div>
  );
};
