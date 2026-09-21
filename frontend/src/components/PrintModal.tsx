import React from 'react';
import { Printer, X, Download } from 'lucide-react';

interface PrintModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  subtitle?: string;
  children: React.ReactNode;
  onExportCsv?: () => void;
}

export const PrintModal: React.FC<PrintModalProps> = ({
  isOpen,
  onClose,
  title,
  subtitle,
  children,
  onExportCsv,
}) => {
  if (!isOpen) return null;

  const handlePrint = () => {
    window.print();
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-2 sm:p-4 overflow-y-auto">
      <div className="relative w-full max-w-4xl bg-white rounded-xl shadow-2xl overflow-hidden flex flex-col max-h-[90vh]">
        {/* Modal Toolbar (hidden in print) */}
        <div className="flex items-center justify-between px-6 py-3.5 bg-gray-50 border-b border-gray-200 no-print">
          <div>
            <h3 className="text-sm font-bold text-gray-800">{title}</h3>
            {subtitle && <p className="text-xs text-gray-500">{subtitle}</p>}
          </div>
          <div className="flex items-center gap-2">
            {onExportCsv && (
              <button
                onClick={onExportCsv}
                className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-gray-300 bg-white hover:bg-gray-100 text-xs font-semibold text-gray-700 shadow-2xs transition-colors"
              >
                <Download className="w-3.5 h-3.5 text-gray-600" />
                Unduh CSV
              </button>
            )}
            <button
              onClick={handlePrint}
              className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-[#0B7725] hover:bg-[#09601e] text-white text-xs font-semibold shadow-2xs transition-colors"
            >
              <Printer className="w-3.5 h-3.5" />
              Cetak Dokumen
            </button>
            <button
              onClick={onClose}
              className="p-1.5 rounded-lg text-gray-500 hover:text-gray-800 hover:bg-gray-200 transition-colors ml-2"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>

        {/* Printable Paper Area */}
        <div className="p-6 sm:p-8 overflow-y-auto bg-white text-gray-900 print:p-0">
          {/* Official Letterhead (KOP SURAT) */}
          <div className="text-center border-b-2 border-black pb-3 mb-6">
            <h4 className="text-xs font-bold tracking-wider uppercase text-gray-700">
              PEMERINTAH KABUPATEN PELALAWAN
            </h4>
            <h3 className="text-sm font-bold uppercase tracking-wider text-gray-800">
              DINAS PENDIDIKAN DAN KEBUDAYAAN
            </h3>
            <h2 className="text-base sm:text-lg font-extrabold uppercase text-[#0B7725] tracking-tight">
              SMP NEGERI 1 PANGKALAN KERINCI
            </h2>
            <p className="text-[11px] text-gray-600 mt-0.5">
              Alamat: Jl. Lintas Timur No. 1, Pangkalan Kerinci Kota, Kec. Pangkalan Kerinci, Kab. Pelalawan, Riau
            </p>
            <p className="text-[10px] text-gray-500">
              NPSN: 10402685 • Surel: info@smpn1pklkerinci.sch.id • Laman: www.smpn1pklkerinci.sch.id
            </p>
            <div className="w-full border-t border-black mt-1.5 pt-0.5" />
          </div>

          {/* Document Content */}
          <div className="space-y-4">{children}</div>

          {/* Signatures Area */}
          <div className="mt-12 pt-4 grid grid-cols-2 text-xs text-center break-inside-avoid">
            <div>
              <p className="text-gray-600">Mengetahui,</p>
              <p className="font-semibold text-gray-900">Kepala SMPN 1 Pangkalan Kerinci</p>
              <div className="h-16" />
              <p className="font-bold underline text-gray-900">H. Abu Bakar, M.Pd.</p>
              <p className="text-gray-600 text-[11px]">NIP. 196808151994121002</p>
            </div>
            <div>
              <p className="text-gray-600">Pangkalan Kerinci, {new Date().toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' })}</p>
              <p className="font-semibold text-gray-900">Guru Pengampu / Wali Kelas</p>
              <div className="h-16" />
              <p className="font-bold underline text-gray-900">Dra. Hj. Nurhayati, M.Pd.</p>
              <p className="text-gray-600 text-[11px]">NIP. 197405121998022001</p>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
