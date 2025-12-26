import { useEffect, useState } from 'react';
import { Copy, Clock, Lock, AlertTriangle, FileText } from 'lucide-react';
import Swal from 'sweetalert2';
import { apiPost, type Paste } from '../api';

export default function ViewPaste({ id }: { id: string }) {
  const [paste, setPaste] = useState<Paste | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isProtected, setIsProtected] = useState(false);
  const [timeLeft, setTimeLeft] = useState('');

  useEffect(() => {
    checkStatus();
  }, [id]);

  useEffect(() => {
     if (paste?.timeoutUnix) {
        const timer = setInterval(() => {
           const diff = paste.timeoutUnix - Math.floor(Date.now() / 1000);
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
      const status = await apiPost('status', { id });
      if (status && status.id) {
         if (status.protected) {
            setIsProtected(true);
            setLoading(false);
            promptPassword();
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

  const promptPassword = async () => {
     const { value: pass } = await Swal.fire({
        title: 'Enter Password',
        input: 'password',
        inputLabel: 'This paste is protected',
        inputPlaceholder: 'Enter your password',
        background: 'var(--color-surface)',
        color: 'var(--color-on-surface)',
        confirmButtonColor: 'var(--color-primary)',
        allowOutsideClick: false
     });

     if (pass) {
        fetchPaste(pass);
     }
  };

  const fetchPaste = async (pass: string = '') => {
     setLoading(true);
     try {
        const data = await apiPost('read', { id, pass });
        if (data && data.text) {
           setPaste(data);
           setIsProtected(false);
        } else {
           Swal.fire('Error', 'Incorrect password or failed to decrypt.', 'error').then(() => {
              if (data.protected) promptPassword();
           });
        }
     } catch (e) {
        console.error(e);
        setError('Failed to load paste.');
     } finally {
        setLoading(false);
     }
  };

  const copyToClipboard = () => {
     if (paste?.text) {
        navigator.clipboard.writeText(paste.text);
        Swal.fire({
           icon: 'success',
           title: 'Copied!',
           toast: true,
           position: 'top-end',
           showConfirmButton: false,
           timer: 1500,
           background: 'var(--color-surface)',
           color: 'var(--color-on-surface)'
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
        <div className="text-center p-10 flex flex-col items-center gap-4">
           <Lock size={48} className="text-warning" />
           <p>Waiting for password...</p>
           <button onClick={promptPassword} className="text-primary hover:underline">Re-enter password</button>
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
