import { useEffect, useState, type ImgHTMLAttributes } from 'react';
import { apiBlob } from '../lib/api';

export function ApiImage({ path, ...props }: { path: string } & Omit<ImgHTMLAttributes<HTMLImageElement>, 'src'>) {
  const [source, setSource] = useState('');

  useEffect(() => {
    let objectUrl = '';
    void apiBlob(path).then((blob) => {
      objectUrl = URL.createObjectURL(blob);
      setSource(objectUrl);
    }).catch(() => setSource(''));
    return () => {
      if (objectUrl) URL.revokeObjectURL(objectUrl);
    };
  }, [path]);

  if (!source) return <span aria-hidden="true" className={`${props.className ?? ''} block animate-pulse bg-violet-100 dark:bg-violet-900`} />;
  return <img {...props} src={source} />;
}
