import { useState, useRef } from 'react';
import { Lock, Clock, Send, Paperclip, X, File as FileIcon } from 'lucide-react';
import { createPaste, type CreatePasteRequest } from '../api';
import { useToast } from './ui/use-toast';
import { encryptFile, generateSalt, deriveKeys, encryptData, generateRandomKey, keyToBase64 } from '../lib/crypto';

export default function CreatePaste() {
  const [text, setText] = useState('');
  const [expiry, setExpiry] = useState(3600);
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

        {/* File Upload Section */}
        <div 
          className={`border-2 border-dashed rounded-lg p-4 transition-colors ${
            isDragging ? 'border-primary bg-primary/5' : 'border-border-color bg-input-bg/50'
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
          <div className="flex flex-col items-center gap-2">
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
                className="flex items-center gap-2 text-subtle-gray hover:text-primary transition-colors py-2"
              >
                <Paperclip size={18} />
                <span>Click or drag files to upload</span>
              </button>
            ) : (
              <div className="w-full space-y-2">
                <div className="flex justify-between items-center text-xs font-bold text-subtle-gray mb-1 uppercase tracking-wider">
                  <span>Attached Files ({selectedFiles.length})</span>
                  <button 
                    type="button" 
                    onClick={() => fileInputRef.current?.click()}
                    className="text-primary hover:underline"
                  >
                    Add More
                  </button>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                  {selectedFiles.map((file, idx) => (
                    <div key={idx} className="flex flex-col bg-surface-variant/50 p-2 rounded border border-border-color/50 text-sm gap-2">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-2 truncate">
                          <FileIcon size={14} className="text-primary flex-shrink-0" />
                          <span className="truncate text-on-surface">{file.name}</span>
                          <span className="text-[10px] text-subtle-gray">({formatFileSize(file.size)})</span>
                        </div>
                        <button 
                          type="button" 
                          onClick={() => removeFile(idx)}
                          className="text-subtle-gray hover:text-error transition-colors"
                          disabled={loading}
                        >
                          <X size={14} />
                        </button>
                      </div>
                      {loading && uploadProgress[idx] !== undefined && (
                        <div className="w-full bg-surface h-1.5 rounded-full overflow-hidden">
                          <div 
                            className="bg-primary h-full transition-all duration-300 ease-out" 
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
            {loading ? 'Processing...' : <>Create Klister <Send size={18} /></>}
          </button>
        </div>
      </form>
    </div>
  );
}