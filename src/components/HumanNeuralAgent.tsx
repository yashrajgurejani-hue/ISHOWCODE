import React, { useRef, useEffect, useState } from 'react';
import { DetectionResult } from '../types';
import { Sparkles, Heart, Eye, Volume2 } from 'lucide-react';

interface HumanNeuralAgentProps {
  latestDetection: DetectionResult | null;
  currentWord: string;
  isSpeaking?: boolean;
  onInteract?: () => void;
}

export const HumanNeuralAgent: React.FC<HumanNeuralAgentProps> = ({
  latestDetection,
  currentWord,
  isSpeaking = false,
  onInteract,
}) => {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [mood, setMood] = useState<'welcoming' | 'affirmative' | 'calm' | 'focused' | 'joyful'>('welcoming');
  const [greetingText, setGreetingText] = useState('Listening to your hands...');

  // Update mood based on current gesture
  useEffect(() => {
    if (!currentWord) {
      setMood('welcoming');
      setGreetingText('Awaiting next hand sign...');
      return;
    }

    const w = currentWord.toUpperCase();
    if (['YES', 'AGREED', 'CELEBRATE', 'APPLAUSE', 'LOVE', 'HEART', 'PROSPER', 'ROCK'].includes(w)) {
      setMood('joyful');
      setGreetingText(`Affirming: "${currentWord}"`);
    } else if (['NO', 'STOP', 'INSULT', 'NOPE', 'CANCEL', 'ANGER', 'CUT'].includes(w)) {
      setMood('focused');
      setGreetingText(`Acknowledged: "${currentWord}"`);
    } else if (['PEACE', 'CALM', 'NAMASTE', 'PLEDGE', 'SILENCE', 'CHILL'].includes(w)) {
      setMood('calm');
      setGreetingText(`Harmonizing: "${currentWord}"`);
    } else {
      setMood('affirmative');
      setGreetingText(`Recognized: "${currentWord}"`);
    }
  }, [currentWord]);

  // Organic Canvas Human Face & Neural Aura Render Loop
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    let animationFrameId: number;
    let blinkProgress = 0; // 0 = open, 1 = closed
    let isBlinking = false;
    let blinkTimer = 0;
    let breathTime = 0;
    let speechWave = 0;

    // Particles for neural aura
    const particles: Array<{ x: number; y: number; r: number; vx: number; vy: number; alpha: number }> = [];
    for (let i = 0; i < 24; i++) {
      particles.push({
        x: Math.random() * 240,
        y: Math.random() * 240,
        r: Math.random() * 2 + 1,
        vx: (Math.random() - 0.5) * 0.4,
        vy: (Math.random() - 0.5) * 0.4,
        alpha: Math.random() * 0.5 + 0.2,
      });
    }

    const render = () => {
      breathTime += 0.035;
      blinkTimer++;
      speechWave += 0.12;

      // Natural random human blinking every ~140-200 frames (approx 3 seconds)
      if (!isBlinking && blinkTimer > 150 + Math.random() * 80) {
        isBlinking = true;
        blinkTimer = 0;
      }

      if (isBlinking) {
        blinkProgress += 0.22;
        if (blinkProgress >= 1) {
          blinkProgress = 1;
          isBlinking = false;
        }
      } else if (blinkProgress > 0) {
        blinkProgress -= 0.18;
        if (blinkProgress < 0) blinkProgress = 0;
      }

      const w = canvas.width;
      const h = canvas.height;
      ctx.clearRect(0, 0, w, h);

      const centerX = w / 2;
      const breathingY = Math.sin(breathTime) * 2.5;
      const centerY = h / 2 - 4 + breathingY;

      // 1. Cinematic Radial Glow
      const glowColor =
        mood === 'joyful'
          ? 'rgba(229, 9, 20, 0.25)'
          : mood === 'focused'
          ? 'rgba(239, 68, 68, 0.22)'
          : mood === 'calm'
          ? 'rgba(59, 130, 246, 0.2)'
          : 'rgba(229, 9, 20, 0.15)';

      const grad = ctx.createRadialGradient(centerX, centerY, 15, centerX, centerY, 100);
      grad.addColorStop(0, glowColor);
      grad.addColorStop(1, 'rgba(0, 0, 0, 0)');
      ctx.fillStyle = grad;
      ctx.beginPath();
      ctx.arc(centerX, centerY, 100, 0, Math.PI * 2);
      ctx.fill();

      // 2. Synaptic Floating Particles (Human Neural Energy)
      particles.forEach((p) => {
        p.x += p.vx;
        p.y += p.vy;
        if (p.x < 10) p.x = w - 10;
        if (p.x > w - 10) p.x = 10;
        if (p.y < 10) p.y = h - 10;
        if (p.y > h - 10) p.y = 10;

        ctx.fillStyle = `rgba(255, 255, 255, ${p.alpha * 0.7})`;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.r, 0, Math.PI * 2);
        ctx.fill();
      });

      // 3. Stylized Human Head Silhouette Outline (Elegantly handcrafted curves)
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.22)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      // Jaw and temples
      ctx.ellipse(centerX, centerY, 52, 66, 0, 0, Math.PI * 2);
      ctx.stroke();

      // 4. Human Eyebrows
      const browOffset = mood === 'joyful' ? -2 : mood === 'focused' ? 2 : 0;
      ctx.strokeStyle = '#FFFFFF';
      ctx.lineWidth = 2.2;
      ctx.lineCap = 'round';

      // Left eyebrow
      ctx.beginPath();
      ctx.moveTo(centerX - 34, centerY - 20 + browOffset);
      ctx.quadraticCurveTo(centerX - 22, centerY - 24 + browOffset, centerX - 10, centerY - 18 + browOffset);
      ctx.stroke();

      // Right eyebrow
      ctx.beginPath();
      ctx.moveTo(centerX + 10, centerY - 18 + browOffset);
      ctx.quadraticCurveTo(centerX + 22, centerY - 24 + browOffset, centerX + 34, centerY - 20 + browOffset);
      ctx.stroke();

      // 5. Human Eyes with Natural Blinking & Iris Radiance
      const drawEye = (x: number, y: number, isRight: boolean) => {
        const eyeWidth = 16;
        const eyeHeight = 9 * (1 - blinkProgress * 0.92);

        // Eye Contour
        ctx.beginPath();
        ctx.ellipse(x, y, eyeWidth, Math.max(1, eyeHeight), 0, 0, Math.PI * 2);
        ctx.fillStyle = 'rgba(15, 15, 15, 0.9)';
        ctx.fill();
        ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
        ctx.lineWidth = 1.2;
        ctx.stroke();

        // If not fully closed, draw iris, pupil, and specular highlight
        if (eyeHeight > 2.5) {
          // Iris (Warm Netflix crimson/amber glow)
          const irisColor = mood === 'joyful' ? '#E50914' : mood === 'calm' ? '#38BDF8' : '#F43F5E';
          ctx.beginPath();
          ctx.arc(x, y, 4.8, 0, Math.PI * 2);
          ctx.fillStyle = irisColor;
          ctx.fill();

          // Pupil
          ctx.beginPath();
          ctx.arc(x, y, 2.5, 0, Math.PI * 2);
          ctx.fillStyle = '#000000';
          ctx.fill();

          // Human specular reflection catchlight (makes eye look warm and alive)
          ctx.beginPath();
          ctx.arc(x - 1.5, y - 1.5, 1.2, 0, Math.PI * 2);
          ctx.fillStyle = '#FFFFFF';
          ctx.fill();
        }

        // Eyelashes / subtle eyelid line
        ctx.beginPath();
        ctx.moveTo(x - eyeWidth, y);
        ctx.quadraticCurveTo(x, y - eyeHeight - 1, x + eyeWidth, y);
        ctx.strokeStyle = '#FFFFFF';
        ctx.lineWidth = 1.4;
        ctx.stroke();
      };

      drawEye(centerX - 21, centerY - 10, false);
      drawEye(centerX + 21, centerY - 10, true);

      // 6. Subtle Human Nose Bridge & Tip
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.28)';
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(centerX, centerY - 8);
      ctx.lineTo(centerX - 1.5, centerY + 8);
      ctx.quadraticCurveTo(centerX, centerY + 12, centerX + 2.5, centerY + 10);
      ctx.stroke();

      // 7. Human Lips / Mouth (Responsive to emotion & speech)
      const mouthY = centerY + 28;
      const smile = mood === 'joyful' ? 4 : mood === 'focused' ? -1 : 1.5;
      const speechOpen = isSpeaking ? Math.abs(Math.sin(speechWave)) * 5 : 0;

      ctx.beginPath();
      // Upper lip
      ctx.moveTo(centerX - 15, mouthY);
      ctx.quadraticCurveTo(centerX - 6, mouthY - 1.5, centerX, mouthY);
      ctx.quadraticCurveTo(centerX + 6, mouthY - 1.5, centerX + 15, mouthY);
      // Lower lip with smile & speech opening
      ctx.quadraticCurveTo(centerX, mouthY + smile + speechOpen + 3, centerX - 15, mouthY);
      ctx.fillStyle = mood === 'joyful' ? 'rgba(229, 9, 20, 0.6)' : 'rgba(244, 63, 94, 0.4)';
      ctx.fill();
      ctx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // 8. Dynamic Voice Audio Ring when speaking
      if (isSpeaking) {
        ctx.strokeStyle = '#E50914';
        ctx.lineWidth = 1.5;
        ctx.beginPath();
        const rVoice = 68 + Math.sin(speechWave * 2) * 5;
        ctx.arc(centerX, centerY, rVoice, 0, Math.PI * 2);
        ctx.stroke();
      }

      animationFrameId = requestAnimationFrame(render);
    };

    render();

    return () => {
      cancelAnimationFrame(animationFrameId);
    };
  }, [mood, isSpeaking]);

  return (
    <div
      onClick={onInteract}
      className="p-5 rounded-2xl bg-gradient-to-b from-[#1c1c1c] via-[#141414] to-black border border-neutral-800 shadow-[0_15px_35px_rgba(0,0,0,0.7)] flex flex-col items-center relative overflow-hidden transition-all duration-300 group cursor-pointer hover:border-neutral-700"
    >
      {/* Top Identity Tag */}
      <div className="w-full flex items-center justify-between mb-2">
        <div className="flex items-center gap-2">
          <span className="w-2 h-2 rounded-full bg-[#E50914] animate-ping" />
          <span className="text-[11px] font-black uppercase tracking-widest text-neutral-300 font-sans">
            Aura • Human AI
          </span>
        </div>
        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-black/60 border border-neutral-800 text-neutral-400 capitalize">
          {mood}
        </span>
      </div>

      {/* Living Human Neural Canvas */}
      <div className="relative my-2">
        <canvas
          ref={canvasRef}
          width={220}
          height={200}
          className="w-[200px] h-[180px] pointer-events-none drop-shadow-[0_0_20px_rgba(229,9,20,0.3)] transition-transform duration-300 group-hover:scale-105"
        />

        {/* Ambient Heart / Mood Badge */}
        <div className="absolute bottom-1 right-2 px-2 py-1 rounded-lg bg-black/80 backdrop-blur border border-neutral-800 text-[10px] font-semibold text-neutral-300 flex items-center gap-1.5 shadow">
          {mood === 'joyful' ? (
            <Heart className="w-3 h-3 text-[#E50914] fill-[#E50914]" />
          ) : isSpeaking ? (
            <Volume2 className="w-3 h-3 text-[#E50914] animate-pulse" />
          ) : (
            <Eye className="w-3 h-3 text-neutral-400" />
          )}
          <span>{isSpeaking ? 'Speaking' : currentWord ? 'Attentive' : 'Observing'}</span>
        </div>
      </div>

      {/* Human Generated Speech bubble / Status */}
      <div className="w-full mt-2 pt-3 border-t border-neutral-800/80 text-center">
        <p className="text-xs font-bold text-neutral-300 flex items-center justify-center gap-1.5 truncate">
          <Sparkles className="w-3.5 h-3.5 text-[#E50914] shrink-0" />
          <span>{greetingText}</span>
        </p>
        <p className="text-[10px] text-neutral-500 mt-0.5">
          Artistic Human Neural Agent • Visualizes gestures & emotional expressions
        </p>
      </div>
    </div>
  );
};
