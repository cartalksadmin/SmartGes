import React, { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import FactureRealtech from '@/components/details/FactureRealtech';
import { Button } from '@/components/ui/button';
import { Download } from 'lucide-react';
import { api } from '@/lib/apiClient';

interface InvoicePreviewModalProps {
  orderId: string | null;
  open: boolean;
  onClose: () => void;
  // optional full order data to render a client-side HTML preview
  orderData?: any | null;
  payments?: any[];
}

const InvoicePreviewModal: React.FC<InvoicePreviewModalProps> = ({ orderId, open, onClose, orderData, payments = [] }) => {
  const [downloading, setDownloading] = useState(false);
  if (!orderId && !orderData) return null;

  const invoiceUrl = orderId ? `${import.meta.env.VITE_API_BASE_URL}/api/commandes/${orderId}/invoice/download?inline=true` : null;

  return (
    <Dialog open={open} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl">
        <DialogHeader>
          <h3 className="text-lg font-semibold">Prévisualisation de la facture</h3>
        </DialogHeader>
        <div>
          {orderData ? (
            <div className="p-4 bg-white rounded border">
              <div className="flex items-center justify-end mb-3">
                {orderId && (
                  <Button size="sm" onClick={async () => {
                    try {
                      setDownloading(true);
                      await api.attemptDownloadInvoice(orderId);
                    } finally {
                      setDownloading(false);
                    }
                  }}>
                    <Download className="mr-2 h-4 w-4" />
                    {downloading ? 'Téléchargement...' : 'Télécharger (PDF)'}
                  </Button>
                )}
              </div>
              <FactureRealtech
                numero={orderData.numero || orderData.code}
                date={new Date(orderData.created_at || orderData.date || Date.now()).toLocaleDateString()}
                client={{
                  nom: orderData.client?.nom || orderData.client_nom || '',
                  prenom: orderData.client?.prenom || orderData.client_prenom || '',
                  telephone: orderData.client?.telephone || orderData.client_telephone || '',
                  email: orderData.client?.email || orderData.client_email || '',
                  adresse: orderData.client?.adresse || orderData.client_adresse || '',
                }}
                items={(orderData.items || []).map((it: any) => {
                  const rawType = it.type || it.item_type || it.type_label || it.itemType || '';
                  let detectedType = '';
                  if (rawType) {
                    const low = String(rawType).toLowerCase();
                    if (low.includes('serv')) detectedType = 'Service';
                    else if (low.includes('prod')) detectedType = 'Produit';
                    else detectedType = String(rawType);
                  } else if (it.service_id || it.service) {
                    detectedType = 'Service';
                  } else if (it.produit_id || it.produit || it.product_id || it.product) {
                    detectedType = 'Produit';
                  }

                  // Detect name from multiple possible shapes
                  const name = it.nom || it.designation || it.name || it.produit?.nom || it.produit_nom || it.service?.nom || it.service_nom || it.product?.name || '';

                  // Detect unit price from multiple possible shapes
                  const prixVal = Number(
                    it.prix_unitaire ?? it.unit_price ?? it.unitPrice ?? it.produit?.prix_unitaire ?? it.produit_prix_unitaire ?? it.service?.prix_unitaire ?? it.service_prix_unitaire ?? it.price ?? 0
                  );

                  const qty = Number(it.quantite ?? it.qty ?? it.quantity ?? it.qte ?? 1);
                  const totalVal = Number(it.total ?? it.montant ?? it.prix_total ?? (qty * prixVal));

                  return {
                    nom: name,
                    type: detectedType,
                    quantite: qty,
                    prix_unitaire: prixVal,
                    total: totalVal,
                  };
                })}
                montant={Number(orderData.total_cmd || orderData.total || 0)}
                utilisateur={orderData.utilisateur || (orderData.utilisateur_nom || orderData.utilisateur_prenom ? { nom: orderData.utilisateur_nom, prenom: orderData.utilisateur_prenom } : undefined)}
              />

              <div className="flex justify-end gap-6 mt-4">
                <div className="text-right">
                  <div>Total: <strong>{Number(orderData.total_cmd || orderData.total || 0).toLocaleString()} F CFA</strong></div>
                  <div>Montant payé: <strong>{Number(orderData.montant_paye || 0).toLocaleString()} F CFA</strong></div>
                  <div>Reste: <strong className={`${Number(orderData.total_cmd || orderData.total || 0) - Number(orderData.montant_paye || 0) > 0 ? 'text-red-600' : 'text-green-600'}`}>{(Number(orderData.total_cmd || orderData.total || 0) - Number(orderData.montant_paye || 0)).toLocaleString()} F CFA</strong></div>
                </div>
              </div>

              {payments && payments.length > 0 && (
                <div className="mt-4">
                  <h4 className="font-semibold">Historique des paiements</h4>
                  <ul className="list-disc ml-6">
                    {payments.map((p, i) => (
                      <li key={i}>{p.date_paiement || p.created_at || p.date} — {p.mode_paiement || p.mode} — {Number(p.montant || 0).toLocaleString()} F CFA</li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          ) : (
            // fallback to server PDF
            <iframe
              src={invoiceUrl || ''}
              title="Invoice Preview"
              className="w-full h-[80vh] border rounded"
            />
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default InvoicePreviewModal;