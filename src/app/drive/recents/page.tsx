import { Clock } from "lucide-react";

export default function RecentsPage() {
  return (
    <div className="flex flex-col items-center justify-center h-full min-h-[60vh] text-center px-6">
      <div className="w-20 h-20 rounded-full bg-primary/10 flex items-center justify-center mb-5">
        <Clock className="w-10 h-10 text-primary" />
      </div>
      <h2 className="text-2xl font-bold mb-2">Recents</h2>
      <p className="text-muted-foreground text-sm max-w-xs leading-relaxed">
        Your recently accessed files will appear here.
      </p>
      <div className="mt-6 px-4 py-2 rounded-full bg-primary/10 border border-primary/20">
        <span className="text-xs font-semibold text-primary tracking-widest uppercase">Coming Soon</span>
      </div>
    </div>
  );
}
