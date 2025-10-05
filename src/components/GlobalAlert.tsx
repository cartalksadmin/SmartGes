import { useEffect, useState } from 'react';
import { useToast } from '@/hooks/use-toast';

type Alert = { id: number; level: string; message: string };

export default function GlobalAlert() {
  const { toast } = useToast();
  const [counter, setCounter] = useState(0);

  useEffect(() => {
    const handler = (e: any) => {
      const { level, message } = e.detail || {};
      if (!message) return;
      // Use toast for consistent UI
      toast({ title: level === 'error' ? 'Erreur serveur' : 'Info', description: message, variant: level === 'error' ? 'destructive' : 'default' });
      setCounter(c => c + 1);
    };

    window.addEventListener('global-alert', handler as any);
    return () => window.removeEventListener('global-alert', handler as any);
  }, [toast]);

  return null; // component only attaches listener and delegates to toast
}
