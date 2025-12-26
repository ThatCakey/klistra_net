import { useState, useRef } from 'react';
import { Lock, Clock, Send, Paperclip, X, File as FileIcon, Code } from 'lucide-react';
import { createPaste, type CreatePasteRequest } from '../api';
import { useToast } from './ui/use-toast';
import { encryptFile, generateSalt, deriveKeys, encryptData, generateRandomKey, keyToBase64 } from '../lib/crypto';
import { LANGUAGES } from '../lib/languages';

export default function CreatePaste() {
  const [text, setText] = useState('');
  const [expiry, setExpiry] = useState(604800);
  const [language, setLanguage] = useState('');
  const [password, setPassword] = useState('');
  const [loading, setLoading] = useState(false);
  const [selectedFiles, setSelectedFiles] = useState<File[]>([]);
  const [uploadProgress, setUploadProgress] = useState<Record<number, number>>({});
  const [isDragging, setIsDragging] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const filesArray = Array.from(e.target.files);
      setSelectedFiles(prev => [...prev, ...filesArray]);
    }
  };

  const removeFile = (index: number) => {
    setSelectedFiles(prev => prev.filter((_, i) => i !== index));
    const newProgress = { ...uploadProgress };
    delete newProgress[index];
    setUploadProgress(newProgress);
  };

  const formatFileSize = (bytes: number) => {
    if (bytes === 0) return '0 B';
    const k = 1024;
    const sizes = ['B', 'KB', 'MB', 'GB', 'TB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(1)) + ' ' + sizes[i];
  };

  const uploadFile = (blob: Blob, filename: string, onProgress: (percent: number) => void): Promise<string> => {
    return new Promise((resolve, reject) => {
      const xhr = new XMLHttpRequest();
      const formData = new FormData();
      formData.append('file', blob, filename);
      formData.append('expires', expiry.toString());

      xhr.upload.addEventListener('progress', (e) => {
        if (e.lengthComputable) {
          const percent = Math.round((e.loaded * 100) / e.total);
          onProgress(percent);
        }
      });

      xhr.onreadystatechange = () => {
        if (xhr.readyState === 4) {
          if (xhr.status >= 200 && xhr.status < 300) {
            resolve(xhr.responseText);
          } else {
            reject(new Error(`Failed to upload ${filename}`));
          }
        }
      };

      xhr.onerror = () => reject(new Error(`Network error during ${filename} upload`));
      
      xhr.open('POST', 'https://temp.low-stack.tech/');
      xhr.setRequestHeader('Accept', '*/*');
      xhr.send(formData);
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!text.trim() && selectedFiles.length === 0) {
      toast({
         title: "Empty Klister",
         description: "Add text or files to share!",
         variant: "destructive"
      });
      return;
    }

    setLoading(true);
    setUploadProgress({});
    try {
      const salt = generateSalt();
      let encryptionKey: Uint8Array;
      let passHash: string | undefined;

      if (password) {
        const keys = await deriveKeys(password, salt);
        encryptionKey = keys.encryptionKey;
        passHash = keys.accessHash;
      } else {
        encryptionKey = generateRandomKey();
        passHash = keyToBase64(encryptionKey);
      }

      // Encrypt text
      const encryptedText = await encryptData(text, encryptionKey);

      let filesMetadata: { name: string, size: number, url: string, key?: string }[] = [];
      if (selectedFiles.length > 0) {
        filesMetadata = await Promise.all(selectedFiles.map(async (file, index) => {
          // Use the same encryption key for files
          const { encryptedBlob } = await encryptFile(file, encryptionKey);

          const url = await uploadFile(encryptedBlob, file.name, (percent) => {
            setUploadProgress(prev => ({ ...prev, [index]: percent }));
          });
          return {
            name: file.name,
            size: file.size,
            url: url
          };
        }));
      }

      const req: CreatePasteRequest = {
        pasteText: encryptedText,
        expiry: expiry,
        passProtect: !!password,
        passHash: passHash,
        salt: salt,
        language: language || undefined,
        files: filesMetadata
      };

      const resp = await createPaste(req);
      if (resp && resp.id) {
        window.location.href = `/${resp.id}`;
      } else {
         throw new Error("Invalid response");
      }
    } catch (err: any) {
      console.error(err);
      toast({
         title: "Error",
         description: err.message || "Failed to create Klister.",
         variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="relative group">
      {/* Decorative Gradient Border */}
      <div className="absolute -inset-[1px] bg-gradient-to-r from-primary/20 to-primary-variant/20 rounded-2xl blur-[1px] group-focus-within:from-primary/40 group-focus-within:to-primary-variant/40"></div>
      
      <div className="relative bg-surface/80 backdrop-blur-xl rounded-2xl p-6 border border-white/5 shadow-2xl overflow-hidden">
        {/* Subtle inner glow */}
        <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-transparent via-primary/20 to-transparent"></div>

        <form onSubmit={handleSubmit} className="flex flex-col gap-5">
          <div className="relative group/textarea">
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              placeholder="Paste your text here..."
              className="w-full h-80 bg-input-bg/50 border border-border-color/50 rounded-xl p-5 text-on-surface focus:outline-none focus:ring-2 focus:ring-primary/50 transition-all resize-y font-mono backdrop-blur-sm"
            />
            <div className="absolute bottom-4 right-4 text-[10px] font-bold tracking-widest uppercase text-subtle-gray bg-surface/80 backdrop-blur-md px-2 py-1 rounded-md border border-border-color/50">
              {text.length} characters
            </div>
          </div>

          {/* File Upload Section */}
          <div 
            className={`relative border-2 border-dashed rounded-xl p-6 transition-all duration-300 ${
              isDragging ? 'border-primary bg-primary/10 scale-[1.01]' : 'border-border-color/50 bg-input-bg/30 hover:border-primary/30 hover:bg-primary/5'
            }`}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={(e) => {
              e.preventDefault();
              setIsDragging(false);
              if (e.dataTransfer.files) {
                const filesArray = Array.from(e.dataTransfer.files);
                setSelectedFiles(prev => [...prev, ...filesArray]);
              }
            }}
          >
            <div className="flex flex-col items-center gap-3">
              <input
                type="file"
                multiple
                onChange={handleFileChange}
                className="hidden"
                ref={fileInputRef}
              />
              {selectedFiles.length === 0 ? (
                <button
                  type="button"
                  onClick={() => fileInputRef.current?.click()}
                  className="flex flex-col items-center gap-2 text-subtle-gray hover:text-primary transition-all group/upload py-2"
                >
                  <div className="p-3 bg-surface-variant/50 rounded-full group-hover/upload:bg-primary/10 group-hover/upload:scale-110 transition-all">
                    <Paperclip size={24} className="group-hover/upload:text-primary transition-colors" />
                  </div>
                  <span className="text-sm font-medium">Click or drag files to secure and share</span>
                </button>
              ) : (
                <div className="w-full space-y-3">
                  <div className="flex justify-between items-center text-[10px] font-black text-subtle-gray mb-1 uppercase tracking-widest">
                    <span>Attached Files ({selectedFiles.length})</span>
                    <button 
                      type="button" 
                      onClick={() => fileInputRef.current?.click()}
                      className="text-primary hover:text-primary-variant transition-colors"
                    >
                      + Add More
                    </button>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                    {selectedFiles.map((file, idx) => (
                      <div key={idx} className="flex flex-col bg-surface-variant/30 p-3 rounded-lg border border-border-color/30 text-sm gap-2 backdrop-blur-md">
                        <div className="flex items-center justify-between">
                          <div className="flex items-center gap-3 truncate">
                            <div className="p-1.5 bg-primary/10 rounded">
                              <FileIcon size={14} className="text-primary flex-shrink-0" />
                            </div>
                            <div className="flex flex-col truncate">
                              <span className="truncate font-medium text-on-surface">{file.name}</span>
                              <span className="text-[10px] text-subtle-gray">{formatFileSize(file.size)}</span>
                            </div>
                          </div>
                          <button 
                            type="button" 
                            onClick={() => removeFile(idx)}
                            className="p-1.5 rounded-md hover:bg-error/10 text-subtle-gray hover:text-error transition-all"
                            disabled={loading}
                          >
                            <X size={14} />
                          </button>
                        </div>
                        {loading && uploadProgress[idx] !== undefined && (
                          <div className="w-full bg-surface h-1 rounded-full overflow-hidden">
                            <div 
                              className="bg-gradient-to-r from-primary to-primary-variant h-full transition-all duration-300 ease-out" 
                              style={{ width: `${uploadProgress[idx]}%` }}
                            />
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          </div>

          <div className="flex flex-wrap gap-4 items-center justify-between mt-2">
            <div className="flex flex-wrap gap-3 items-center w-full md:w-auto">
              {/* Expiry Select */}
              <div className="relative group/select">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-subtle-gray group-focus-within/select:text-primary transition-colors">
                    <Clock size={16} />
                 </div>
                 <select 
                    value={expiry} 
                    onChange={(e) => setExpiry(Number(e.target.value))}
                    className="pl-10 pr-8 py-2.5 bg-input-bg/50 border border-border-color/50 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-44 text-sm font-medium backdrop-blur-sm transition-all"
                 >
                    <option value={60}>1 Minute</option>
                    <option value={600}>10 Minutes</option>
                    <option value={3600}>1 Hour</option>
                    <option value={21600}>6 Hours</option>
                    <option value={43200}>12 Hours</option>
                    <option value={86400}>1 Day</option>
                    <option value={172800}>2 Days</option>
                    <option value={604800}>1 Week</option>
                    <option value={1209600}>2 Weeks</option>
                    <option value={2592000}>1 Month</option>
                 </select>
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-subtle-gray">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                 </div>
              </div>

              {/* Language Select */}
              <div className="relative group/select">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-subtle-gray group-focus-within/select:text-primary transition-colors">
                    <Code size={16} />
                 </div>
                 <select 
                    value={language} 
                    onChange={(e) => setLanguage(e.target.value)}
                    className="pl-10 pr-8 py-2.5 bg-input-bg/50 border border-border-color/50 rounded-xl appearance-none cursor-pointer focus:outline-none focus:ring-2 focus:ring-primary/50 w-full md:w-44 text-sm font-medium backdrop-blur-sm transition-all"
                 >
                    {LANGUAGES.map(lang => (
                      <option key={lang.value} value={lang.value}>{lang.label}</option>
                    ))}
                 </select>
                 <div className="absolute inset-y-0 right-0 pr-3 flex items-center pointer-events-none text-subtle-gray">
                    <svg className="h-4 w-4 fill-current" viewBox="0 0 20 20"><path d="M5.293 7.293a1 1 0 011.414 0L10 10.586l3.293-3.293a1 1 0 111.414 1.414l-4 4a1 1 0 01-1.414 0l-4-4a1 1 0 010-1.414z" /></svg>
                 </div>
              </div>

              {/* Password Input */}
              <div className="relative group/password flex-1 md:flex-none">
                 <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none text-subtle-gray group-focus-within/password:text-primary transition-colors">
                    <Lock size={16} />
                 </div>
                 <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Password (Optional)"
                    className="pl-10 pr-4 py-2.5 bg-input-bg/50 border border-border-color/50 rounded-xl w-full md:w-64 focus:outline-none focus:ring-2 focus:ring-primary/50 text-sm font-medium backdrop-blur-sm transition-all"
                 />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="relative group/btn flex items-center justify-center gap-2 overflow-hidden px-8 py-2.5 rounded-xl font-bold transition-all disabled:opacity-50 w-full md:w-auto"
            >
              <div className="absolute inset-0 bg-gradient-to-r from-primary to-primary-variant transition-all group-hover/btn:scale-110"></div>
              <span className="relative text-white flex items-center gap-2">
                {loading ? 'Processing...' : <>Create Klister <Send size={18} className="group-hover/btn:translate-x-1 group-hover/btn:-translate-y-1 transition-transform" /></>}
              </span>
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}