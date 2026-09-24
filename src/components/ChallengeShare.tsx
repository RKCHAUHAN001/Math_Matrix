import React, { useState } from 'react';
import { Share2, Copy, Check, Instagram, MessageCircle } from 'lucide-react';
import sounds from '../utils/audio';

interface ChallengeShareProps {
  score: number;
  difficulty: 'easy' | 'medium' | 'hard' | 'insane';
  theme: any;
}

export const ChallengeShare: React.FC<ChallengeShareProps> = ({ score, difficulty, theme }) => {
  const [copied, setCopied] = useState<boolean>(false);

  const shareText = `🧩 I scored ${score} points on the INTENSE "${difficulty.toUpperCase()}" difficulty inside the Math Matrix Game! Can you beat my time-constrained grid solution speed? Play instantly at: ${window.location.origin}`;

  const handleCopy = () => {
    sounds.playClick();
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    sounds.playSuccess();
    setTimeout(() => {
      setCopied(false);
    }, 2000);
  };

  const shareInstagram = () => {
    sounds.playClick();
    // Copy the invitation text to clipboard automatically so user can paste it directly into Direct Messages
    navigator.clipboard.writeText(shareText);
    setCopied(true);
    sounds.playSuccess();
    setTimeout(() => {
      setCopied(false);
    }, 2000);
    // Redirect to Instagram inbox
    window.open('https://www.instagram.com/direct/inbox/', '_blank');
  };

  const shareWhatsApp = () => {
    sounds.playClick();
    const url = `https://api.whatsapp.com/send?text=${encodeURIComponent(shareText)}`;
    window.open(url, '_blank');
  };

  return (
    <div className={`rounded-xl border ${theme.border} ${theme.cardBg} p-5`}>
      <h3 className={`text-sm font-bold uppercase tracking-wider mb-2 ${theme.text} flex items-center gap-2`}>
        <Share2 className="w-4 h-4 text-pink-500" />
        Challenge a Friend
      </h3>
      <p className={`text-[10px] mb-4 leading-relaxed ${theme.textMuted}`}>
        Generate a mathematical combat invitation to challenge multiplayer rivals to top your records!
      </p>

      <div className="relative bg-black/50 border border-zinc-900 rounded p-3 mb-4">
        <p className={`text-[11px] font-mono select-all leading-normal text-zinc-300 break-words pr-8`}>
          {shareText}
        </p>
        <button
          onClick={handleCopy}
          className="absolute right-3 top-3 p-1.5 rounded border border-zinc-850 hover:bg-zinc-800 transition text-zinc-400 hover:text-white"
          title="Copy to Clipboard"
        >
          {copied ? <Check className="w-3.5 h-3.5 text-emerald-500" /> : <Copy className="w-3.5 h-3.5" />}
        </button>
      </div>

      <div className="flex gap-2 justify-end">
        <button
          onClick={shareInstagram}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 hover:text-pink-500 hover:border-pink-900 transition"
          title="Copy Invite & Open Instagram Inbox"
        >
          <Instagram className="w-3.5 h-3.5" />
          Instagram
        </button>
        <button
          onClick={shareWhatsApp}
          className="flex items-center gap-1.5 px-3 py-1.5 rounded border border-zinc-800 text-[10px] uppercase font-bold text-zinc-400 hover:text-emerald-500 hover:border-emerald-900 transition"
        >
          <MessageCircle className="w-3.5 h-3.5" />
          WhatsApp
        </button>
      </div>
    </div>
  );
};
