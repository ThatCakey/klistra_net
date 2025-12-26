import { useState } from 'react';
import { Lock, Clock, Send } from 'lucide-react';
import { apiPost, type CreatePasteRequest } from '../api';
import { useToast } from './ui/use-toast';

export default function CreatePaste() {
  const [text, setText] = useState('');
  const [expiry, setExpiry] = useState(3600);
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim()) {
      toast({
         title: "Empty Klister",
         description: "Nothing to share? Add text!",
         variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const req: CreatePasteRequest = {
        pasteText: text,
        expiry: expiry,
        passProtect: !!password,
        pass: password
      };

      const id = await apiPost('submit', req);
      if (id && typeof id === 'string') {
        window.location.href = `/${id}`;
      } else {
         throw new Error("Invalid response");
      }
    } catch (err) {
      console.error(err);
      toast({
         title: "Error",
         description: "Failed to create Klister.",
         variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="bg-surface/80 backdrop-blur-md rounded-xl p-6 border border-border-color shadow-xl">
      <form onSubmit={handleSubmit} className="flex flex-col gap-4">
        <div className="relative">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Paste your text here..."
            className="w-full h-64 bg-input-bg border border-border-color rounded-lg p-4 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary transition-all resize-y font-mono"
          />
          <div className="absolute bottom-4 right-4 text-xs text-subtle-gray bg-surface/50 px-2 py-1 rounded">
            {text.length} chars
          </div>
        </div>

        <div className="flex flex-wrap gap-4 items-center justify-between">
          <div className="flex flex-wrap gap-4 items-center w-full md:w-auto">
            {/* Expiry Select */}
            <div className="relative group">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-subtle-gray">
                  <Clock size={16} />
               </div>
               <select 
                  value={expiry} 
                  onChange={(e) => setExpiry(Number(e.target.value))}
                  className="pl-10 pr-4 py-2 bg-input-bg border border-border-color rounded-lg appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary w-full md:w-40 text-sm"
               >
                  <option value={60}>1 Minute</option>
                  <option value={600}>10 Minutes</option>
                  <option value={3600}>1 Hour</option>
                  <option value={86400}>1 Day</option>
                  <option value={604800}>1 Week</option>
               </select>
            </div>

            {/* Password Input */}
            <div className="relative flex-1 md:flex-none">
               <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-subtle-gray">
                  <Lock size={16} />
               </div>
               <input
                  type="password"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="Password (Optional)"
                  className="pl-10 pr-4 py-2 bg-input-bg border border-border-color rounded-lg w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary text-sm"
               />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="flex items-center justify-center gap-2 bg-primary hover:bg-primary-variant text-white px-6 py-2 rounded-lg font-medium transition-colors disabled:opacity-50 w-full md:w-auto"
          >
            {loading ? 'Creating...' : <>Create Klister <Send size={18} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}