import { useEffect, useState } from 'react';
import { Copy, Clock, Lock, AlertTriangle, FileText, Unlock, Download, Paperclip } from 'lucide-react';
import { getPaste, type Paste } from '../api';
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
    fetchPaste();
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
        const data = await getPaste(id, pass);
        // If protected and neither text nor files exist in response, it means we got metadata (locked)
        const isLocked = data.protected && data.text === null && data.files === null;
        
        if (isLocked) {
           setPaste(data);
           setIsProtected(true);
        } else {
           // Unlocked or unprotected
           setPaste(data);
           setIsProtected(false);
        }
     } catch (e: any) {
        console.error(e);
        if (e.message === "Unauthorized") {
             toast({
                title: "Error",
                description: "Incorrect password.",
                variant: "destructive"
             });
             // Keep protected state if we were already protected
        } else if (e.message === "NotFound") {
             setError('Paste not found or expired.');
        } else {
             setError('Failed to load paste.');
        }
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

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  if (loading && !paste) { // Show loading only if we have NO data yet
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

  if (isProtected && paste?.text === null && paste?.files === null) {
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

       {paste?.text && (
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
       )}

       {paste?.files && paste.files.length > 0 && (
         <div className="flex flex-col gap-2 mt-2">
           <h3 className="text-sm font-bold text-subtle-gray flex items-center gap-2 uppercase tracking-wider">
             <Paperclip size={14} /> Associated Files
           </h3>
           <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
             {paste.files.map((file, idx) => (
               <a 
                 key={idx} 
                 href={file.url} 
                 target="_blank" 
                 rel="noopener noreferrer"
                 className="flex items-center justify-between bg-surface-variant/30 hover:bg-surface-variant/50 p-3 rounded-lg border border-border-color transition-all group"
               >
                 <div className="flex items-center gap-3 truncate">
                   <div className="p-2 bg-primary/10 rounded group-hover:bg-primary/20 transition-colors">
                     <Download size={16} className="text-primary" />
                   </div>
                   <div className="flex flex-col truncate">
                     <span className="truncate text-sm font-medium">{file.name}</span>
                     <span className="text-[10px] text-subtle-gray">{formatFileSize(file.size)}</span>
                   </div>
                 </div>
                 <span className="text-xs text-primary opacity-0 group-hover:opacity-100 transition-opacity">Download</span>
               </a>
             ))}
           </div>
         </div>
       )}
       
       <button onClick={() => window.location.href = '/'} className="self-start text-primary hover:underline text-sm mt-4">
          &larr; Create New
       </button>
    </div>
  );
}
