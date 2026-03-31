import { WifiOff } from "lucide-react";

export default function OfflinePage() {
  return (
    <div className="min-h-screen bg-[#111] flex flex-col items-center justify-center text-center px-4">
      <WifiOff className="h-16 w-16 text-white/20 mb-6" />
      <h1 className="text-2xl font-bold text-white mb-2">You&apos;re offline</h1>
      <p className="text-white/40 max-w-sm">
        MeetScribe needs an internet connection for transcription and AI features.
        Your recordings will sync when you&apos;re back online.
      </p>
    </div>
  );
}
