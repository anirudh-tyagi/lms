'use client';
import { useState, useRef, FormEvent } from 'react';
import { useRouter } from 'next/navigation';
import api from '@/lib/api';

const ACCEPTED = ['application/pdf', 'image/jpeg', 'image/png'];
const MAX_SIZE = 5 * 1024 * 1024; // 5 MB

export default function UploadPage() {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [file, setFile] = useState<File | null>(null);
  const [clientError, setClientError] = useState('');
  const [serverError, setServerError] = useState('');
  const [loading, setLoading] = useState(false);
  const [uploaded, setUploaded] = useState<{ filePath: string; originalName: string } | null>(null);

  function handleFileChange(f: File | null) {
    setClientError('');
    setServerError('');
    if (!f) return;
    if (!ACCEPTED.includes(f.type)) {
      setClientError('Only PDF, JPG, and PNG files are accepted');
      return;
    }
    if (f.size > MAX_SIZE) {
      setClientError('File size must not exceed 5 MB');
      return;
    }
    setFile(f);
  }

  async function handleUpload(e: FormEvent) {
    e.preventDefault();
    if (!file) {
      setClientError('Please select a file');
      return;
    }
    setServerError('');
    setLoading(true);
    try {
      const formData = new FormData();
      formData.append('salarySlip', file);
      const res = await api.post('/borrower/upload-salary-slip', formData);
      setUploaded({ filePath: res.data.filePath, originalName: res.data.originalName });
    } catch (err: unknown) {
      const msg = (err as { response?: { data?: { message?: string } } })?.response?.data?.message ?? 'Upload failed';
      setServerError(msg);
    } finally {
      setLoading(false);
    }
  }

  function handleContinue() {
    if (!uploaded) return;
    sessionStorage.setItem('salarySlip', JSON.stringify(uploaded));
    router.push('/loan-config');
  }

  return (
    <div className="bg-white rounded-2xl shadow-sm p-8">
      <h2 className="text-xl font-bold text-gray-900 mb-1">Upload Salary Slip</h2>
      <p className="text-sm text-gray-500 mb-6">Accepted formats: PDF, JPG, PNG — Max size: 5 MB</p>

      {!uploaded ? (
        <form onSubmit={handleUpload}>
          <div
            className="border-2 border-dashed border-gray-300 rounded-xl p-10 text-center cursor-pointer hover:border-brand-500 transition"
            onClick={() => inputRef.current?.click()}
            onDragOver={(e) => e.preventDefault()}
            onDrop={(e) => {
              e.preventDefault();
              handleFileChange(e.dataTransfer.files[0] ?? null);
            }}
          >
            <p className="text-gray-400 text-sm">
              {file ? (
                <span className="text-gray-800 font-medium">{file.name} ({(file.size / 1024).toFixed(0)} KB)</span>
              ) : (
                'Drag & drop or click to select a file'
              )}
            </p>
            <input
              ref={inputRef}
              type="file"
              accept=".pdf,.jpg,.jpeg,.png"
              className="hidden"
              onChange={(e) => handleFileChange(e.target.files?.[0] ?? null)}
            />
          </div>

          {clientError && <p className="mt-3 text-sm text-red-600">{clientError}</p>}
          {serverError && <p className="mt-3 text-sm text-red-600">{serverError}</p>}

          <button
            type="submit"
            disabled={loading || !file || !!clientError}
            className="mt-5 w-full bg-brand-600 text-white py-2 rounded-lg text-sm font-medium hover:bg-brand-700 disabled:opacity-50 transition"
          >
            {loading ? 'Uploading…' : 'Upload Salary Slip'}
          </button>
        </form>
      ) : (
        <div className="text-center">
          <div className="text-green-500 text-5xl mb-3">✓</div>
          <p className="font-medium text-gray-900">{uploaded.originalName}</p>
          <p className="text-sm text-gray-500 mt-1 mb-6">Uploaded successfully</p>
          <button
            onClick={handleContinue}
            className="bg-brand-600 text-white px-6 py-2 rounded-lg text-sm font-medium hover:bg-brand-700 transition"
          >
            Continue to Loan Details →
          </button>
        </div>
      )}
    </div>
  );
}
