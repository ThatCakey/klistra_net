import { useEffect, useState } from 'react';
import { Copy, Clock, Lock, AlertTriangle, FileText, Unlock } from 'lucide-react';
import { apiPost, type Paste } from '../api';
import { useToast } from './ui/use-toast';

export default function ViewPaste({ id }: { id: string }) {
  const [paste, setPaste] = useState<Paste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [password, setPassword] = useState('');
  const [timeLeft, setTimeLeft] = useState('');
  const { toast } = useToast();

  useEffect(() => {
    checkStatus();
  }, [id]);

  useEffect(() => {
     if (paste?.timeoutUnix) {
        const timer = setInterval(() => {
           // We know timeoutUnix is defined here because of the check
           const diff = (paste.timeoutUnix as number) - Math.floor(Date.now() / 1000);
           if (diff <= 0) {
              setTimeLeft('Expired');
              clearInterval(timer);
              window.location.reload();
           } else {
              setTimeLeft(formatTime(diff));
           }
        }, 1000);
        return () => clearInterval(timer);
     }
  }, [paste]);

  const formatTime = (seconds: number) => {
      const days = Math.floor(seconds / (24 * 60 * 60));
      const hours = Math.floor((seconds % (24 * 60 * 60)) / (60 * 60));
      const minutes = Math.floor((seconds % (60 * 60)) / 60);
      const s = seconds % 60;
      
      let res = '';
      if (days > 0) res += `${days}d `;
      if (hours > 0) res += `${hours}h `;
      if (minutes > 0) res += `${minutes}m `;
      if (s > 0) res += `${s}s`;
      return res.trim();
  };

  const checkStatus = async () => {
    try {
      const status = await apiPost<{id: string, protected: boolean}>('status', { id });
      if (status && status.id) {
         if (status.protected) {
            setIsProtected(true);
            setLoading(false);
         } else {
            fetchPaste();
         }
      } else {
         setError('Paste not found or expired.');
         setLoading(false);
      }
    } catch (e) {
      setError('Paste not found or expired.');
      setLoading(false);
    }
  };

  const handleUnlock = async (e: React.FormEvent) => {
     e.preventDefault();
     if (!password) {
        toast({ title: "Password Required", variant: "destructive" });
        return;
     }
     fetchPaste(password);
  };

  const fetchPaste = async (pass: string = '') => {
     setLoading(true);
     try {
        const data = await apiPost<Paste>('read', { id, pass });
        if (data && data.text) {
           setPaste(data);
           setIsProtected(false);
        } else {
             // Should not happen if API returns 401/error, which throws
             toast({
                title: "Error",
                description: "Incorrect password or failed to decrypt.",
                variant: "destructive"
             });
        }
     } catch (e) {
        console.error(e);
        toast({
           title: "Error",
           description: "Incorrect password.", // Usually 401
           variant: "destructive"
        });
        setLoading(false); // Stop loading to let user try again if protected
     } finally {
        setLoading(false);
     }
  };

  const copyToClipboard = () => {
     if (paste?.text) {
        navigator.clipboard.writeText(paste.text);
        toast({
           title: "Copied!",
           description: "Copied to clipboard.",
        });
     }
  };

  if (loading && !isProtected) {
     return <div className="text-center p-10"><div className="animate-spin h-10 w-10 border-4 border-primary border-t-transparent rounded-full mx-auto"></div></div>;
  }

  if (error) {
     return (
        <div className="bg-surface/80 p-8 rounded-xl border border-error/50 flex flex-col items-center text-center gap-4">
           <AlertTriangle size={48} className="text-error" />
           <h2 className="text-xl font-bold text-error">Something went wrong</h2>
           <p>{error}</p>
           <button onClick={() => window.location.href = '/'} className="btn-primary mt-4">Go Home</button>
        </div>
     );
  }

  if (isProtected && !paste) {
     return (
        <div className="bg-surface/80 backdrop-blur-md rounded-xl p-8 border border-border-color shadow-xl max-w-md mx-auto">
           <div className="flex flex-col items-center gap-6 text-center">
              <div className="p-4 bg-surface-variant rounded-full">
                 <Lock size={48} className="text-warning" />
              </div>
              <div>
                 <h2 className="text-xl font-bold mb-2">Password Protected</h2>
                 <p className="text-subtle-gray">This paste is encrypted. Enter the password to view it.</p>
              </div>
              
              <form onSubmit={handleUnlock} className="w-full space-y-4">
                 <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                    className="w-full px-4 py-2 bg-input-bg border border-border-color rounded-lg focus:outline-none focus:ring-2 focus:ring-primary text-center"
                    autoFocus
                 />
                 <button 
                    type="submit"
                    disabled={loading}
                    className="w-full flex items-center justify-center gap-2 bg-primary hover:bg-primary-variant text-white px-4 py-2 rounded-lg font-medium transition-colors"
                 >
                    {loading ? <div className="animate-spin h-5 w-5 border-2 border-white border-t-transparent rounded-full"></div> : <>Unlock <Unlock size={18} /></>}
                 </button>
              </form>
           </div>
        </div>
     );
  }

  return (
    <div className="bg-surface/80 backdrop-blur-md rounded-xl p-6 border border-border-color shadow-xl flex flex-col gap-4">
       <div className="flex justify-between items-center border-b border-border-color pb-4">
          <div className="flex items-center gap-2 text-primary">
             <FileText size={20} />
             <span className="font-bold">Klister ID: {id}</span>
          </div>
          <div className="flex items-center gap-4 text-sm text-subtle-gray">
             {paste?.protected && <span className="flex items-center gap-1 text-warning"><Lock size={14} /> Protected</span>}
             <span className="flex items-center gap-1"><Clock size={14} /> {timeLeft}</span>
          </div>
       </div>

       <div className="relative">
          <textarea
             readOnly
             value={paste?.text || ''}
             className="w-full h-96 bg-input-bg border border-border-color rounded-lg p-4 text-on-surface focus:outline-none resize-none font-mono"
          />
          <button 
             onClick={copyToClipboard}
             className="absolute top-4 right-4 p-2 bg-surface hover:bg-surface-variant rounded-md border border-border-color transition-colors"
             title="Copy to Clipboard"
          >
             <Copy size={18} />
          </button>
       </div>
       
       <button onClick={() => window.location.href = '/'} className="self-start text-primary hover:underline text-sm">
          &larr; Create New
       </button>
    </div>
  );
}