import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { api } from '@/lib/apiClient';
import { useToast } from '@/hooks/use-toast';

export default function Settings() {
  const [preview, setPreview] = useState<string | null>(null);
  const [file, setFile] = useState<File | null>(null);
  const { toast } = useToast();

  const handleFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0] || null;
    setFile(f);
    if (f) {
      const reader = new FileReader();
      reader.onload = () => setPreview(String(reader.result));
      reader.readAsDataURL(f);
    } else setPreview(null);
  };

  const handleUpload = async () => {
    if (!preview) return;
    try {
      await api.settings.uploadLogo({ base64: preview });
      toast({ title: 'Logo uploadé' });
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message, variant: 'destructive' });
    }
  };

  return (
    <div className="p-8">
      <h1 className="text-2xl font-bold mb-4">Paramètres</h1>
      <div className="space-y-4 max-w-md">
        <div>
          <label className="block text-sm mb-1">Logo de l'entreprise</label>
          <input type="file" accept="image/*" onChange={handleFileChange} />
        </div>
        {preview && (
          <div>
            <div className="mb-2">Aperçu:</div>
            <img src={preview} alt="Logo preview" className="h-20 object-contain" />
          </div>
        )}
        <div>
          <Button onClick={handleUpload} disabled={!preview}>Enregistrer le logo</Button>
        </div>
      </div>
    </div>
  );
}
