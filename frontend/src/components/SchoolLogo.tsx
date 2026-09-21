import React, { useState } from 'react';
import { School } from 'lucide-react';

interface SchoolLogoProps {
  className?: string;
  imageClassName?: string;
}

export const SchoolLogo: React.FC<SchoolLogoProps> = ({ className = '', imageClassName = '' }) => {
  const [failed, setFailed] = useState(false);

  return (
    <div className={`flex items-center justify-center ${className}`}>
      {failed ? (
        <School className="h-1/2 w-1/2 text-amber-500" aria-label="Logo sekolah" />
      ) : (
        <img
          src="/images/logo-smpn1-pangkalan-kerinci.png"
          alt="Logo SMP Negeri 1 Pangkalan Kerinci"
          className={`h-full w-full object-contain ${imageClassName}`}
          onError={() => setFailed(true)}
        />
      )}
    </div>
  );
};
