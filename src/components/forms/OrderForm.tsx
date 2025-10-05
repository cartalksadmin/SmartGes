import { useEffect, useState } from 'react';
import Swal from 'sweetalert2';
import 'sweetalert2/dist/sweetalert2.min.css';
// payment prompt will be handled inline by the button (no external modal)
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Input } from '@/components/ui/input';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { api, normalizeList } from '@/lib/apiClient';
import { Commande, Client, Product, Service, CommandeItem } from '@/types/api';
import { useToast } from '@/hooks/use-toast';
// ...existing imports

type Props = {
  open: boolean;
  onOpenChange: (v: boolean) => void;
  initial?: Commande | null;
  onSaved?: (c: Commande) => void;
};

export default function OrderForm({ open, onOpenChange, initial = null, onSaved }: Props) {
  const [clients, setClients] = useState<Client[]>([]);
  const [products, setProducts] = useState<Product[]>([]);
  const [services, setServices] = useState<Service[]>([]);
  const [clientId, setClientId] = useState<string | undefined>((initial as any)?.client_id);
  const [items, setItems] = useState<CommandeItem[]>((initial as any)?.items || []);
  const [initialQtyMap, setInitialQtyMap] = useState<Record<string, number>>({});
  const [isSaving, setIsSaving] = useState(false);
  const [isLocked, setIsLocked] = useState(false);
  const { toast } = useToast();

  // Helpers to normalize various backend shapes and compute prices
  const getItemProductId = (it: any) => (it.produit_id ?? it.produitid ?? it.produitId ?? it.produit) as any;
  const getItemServiceId = (it: any) => (it.service_id ?? it.serviceid ?? it.serviceId ?? it.service) as any;
  const computeUnitPrice = (it: any, prod?: Product | null, serv?: Service | null) => {
    const prodPrice = prod ? Number((prod as any).prix_unitaire ?? 0) : 0;
    const servPrice = serv ? Number((serv as any).prix_unitaire ?? 0) : 0;
    const itemUnit = it.prix_unitaire != null ? Number(it.prix_unitaire) : null;
    const qty = Number(it.quantite || 0);
    if (prod && prodPrice > 0) return prodPrice;
    if (serv && servPrice > 0) return servPrice;
    if (itemUnit != null && itemUnit > 0) return itemUnit;
    if (qty > 0 && Number(it.total || 0) > 0) return Number(it.total) / qty;
    return 0;
  };

  useEffect(() => {
    if (!open) return;
    const load = async () => {
      try {
        const clientsRes = await api.clients.list();
        setClients(normalizeList<Client>(clientsRes));
      } catch (e) { setClients([]); }
      try {
        const productsRes = await api.products.list();
        setProducts(normalizeList<Product>(productsRes));
      } catch (e) { setProducts([]); }
      try {
        const servicesRes = await api.services.list();
        setServices(normalizeList<Service>(servicesRes));
      } catch (e) { setServices([]); }

      if (initial) {
        setClientId((initial as any).client_id || (initial as any).clientId || undefined);
        const unified: any[] = [];
        const qtyMap: Record<string, number> = {};

        if (Array.isArray((initial as any).produits) && (initial as any).produits.length) {
          for (const p of (initial as any).produits) {
            const idKey = String(p.id ?? p.produitid ?? p.produit_id ?? '');
            qtyMap[idKey] = Number(p.quantite || p.qte || 0) || 0;
            unified.push({
              id: p.id ?? p.produitid ?? p.produit_id ?? idKey,
              commande_id: initial.id,
              produit_id: p.produitid ?? p.produit_id ?? null,
              service_id: null,
              nom: p.nom ?? p.produit_nom ?? '',
              quantite: Number(p.quantite || p.qte || 0),
              prix_unitaire: Number(p.prix_unitaire ?? p.produit_prix_unitaire ?? 0),
              total: Number(p.prix_total ?? p.total ?? 0),
            });
          }
        }

        if (Array.isArray((initial as any).services) && (initial as any).services.length) {
          for (const s of (initial as any).services) {
            const idKey = String(s.id ?? s.serviceid ?? s.service_id ?? '');
            qtyMap[idKey] = Number(s.quantite || s.qte || 0) || 0;
            unified.push({
              id: s.id ?? s.serviceid ?? s.service_id ?? idKey,
              commande_id: initial.id,
              produit_id: null,
              service_id: s.serviceid ?? s.service_id ?? null,
              nom: s.nom ?? s.service_nom ?? '',
              quantite: Number(s.quantite || s.qte || 0),
              prix_unitaire: Number(s.prix_unitaire ?? s.service_prix_unitaire ?? 0),
              total: Number(s.prix_total ?? s.total ?? 0),
            });
          }
        }

        if (unified.length === 0 && Array.isArray((initial as any).items)) {
          for (const it of (initial as any).items) {
            const idKey = String(it.id ?? '');
            qtyMap[idKey] = Number(it.quantite || 0) || 0;
            unified.push({
              id: it.id ?? idKey,
              commande_id: initial.id,
              produit_id: it.produit_id ?? it.produitid ?? null,
              service_id: it.service_id ?? it.serviceid ?? null,
              nom: it.nom ?? '',
              quantite: Number(it.quantite || 0),
              prix_unitaire: Number(it.prix_unitaire ?? 0),
              total: Number(it.total ?? 0),
            });
          }
        }

        setItems(unified);
        setInitialQtyMap(qtyMap);
      } else {
        setClientId(undefined);
        setItems([]);
      }
    };
    load();
  }, [open, initial]);

  useEffect(() => {
    // Determine if editing should be locked based on payment status, paid amount, or final statut
    const paiement = initial ? String(((initial as any).statut_paiement || '')).toUpperCase() : '';
    const alreadyPaid = initial ? Number((initial as any).montant_paye || 0) : 0;
    const statut = initial ? String(((initial as any).statut || '')).toUpperCase() : '';
    const finalStatuts = ['VALIDE','VALIDEE','CONFIRME','CONFIRMEE','TERMINE','TERMINEE','LIVREE','COMPLETED','FINISHED'];
    const locked = alreadyPaid > 0 || paiement === 'PAYEE' || paiement === 'PARTIELLE' || finalStatuts.includes(statut);
    setIsLocked(Boolean(locked));
  }, [initial]);

  // Inline payment helper (can be triggered when editing an existing commande)
  const handleInlinePayment = async () => {
    if (!initial || !initial.id) return;
    try {
      const total = Number((initial as any).total_cmd || 0);
      const paid = Number((initial as any).montant_paye || 0);
      const remaining = Math.max(total - paid, 0);
      const { value: form } = await Swal.fire({ title: `Règlement ${initial.code || initial.numero || ''}`, html: `<div style="text-align:left"><label>Montant</label><input id="swal-montant" type="number" min="0" step="0.01" class="swal2-input" value="${remaining}" /></div>`, focusConfirm: false, showCancelButton: true, preConfirm: () => {
        const m = (document.getElementById('swal-montant') as HTMLInputElement | null)?.value;
        const montant = m ? Number(m) : NaN;
        if (Number.isNaN(montant) || montant <= 0) { Swal.showValidationMessage('Montant invalide'); return null; }
        return { montant };
      } });
      if (!form) return;
      const { value: mode } = await Swal.fire({ title: 'Mode de paiement', input: 'select', inputOptions: { cash: 'Cash', mobile_money: 'Mobile Money', carte: 'Carte', cheque: 'Chèque', virement: 'Virement' }, inputValue: 'cash', showCancelButton: true });
      if (!mode) return;
      await api.commandes.pay(String(initial.id), { montant: Number(form.montant), mode_paiement: mode, statut_paiement: (Number(form.montant) >= remaining ? 'PAYEE' : 'PARTIELLE') });
      toast({ title: 'Paiement enregistré' });
      if (onSaved) {
        const fresh = await api.commandes.get(String(initial.id));
        onSaved(fresh?.data?.commande || fresh?.data || fresh);
      }
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || String(err), variant: 'destructive' });
    }
  };

  const addItemFromProduct = (p: Product) => {
    const stock = Number(p.stock_actuel || 0);
    if (stock <= 0) {
      Swal.fire({ icon: 'error', title: 'Stock épuisé', text: `Le produit ${p.nom} est en rupture de stock.` });
      return;
    }
    setItems((s) => {
      const copy = [...s];
      const idx = copy.findIndex(it => String(getItemProductId(it)) === String(p.id));
      if (idx !== -1) {
        const existing = { ...copy[idx] };
        const newQty = Math.min(Number(existing.quantite || 0) + 1, stock);
        existing.quantite = newQty;
        existing.prix_unitaire = Number(p.prix_unitaire || existing.prix_unitaire || 0);
        existing.total = existing.quantite * Number(existing.prix_unitaire || 0);
        copy[idx] = existing;
        return copy;
      }
      const item: CommandeItem = { id: `tmp-${Date.now()}`, commande_id: initial?.id || 'tmp', produit_id: p.id, nom: p.nom, quantite: 1, prix_unitaire: Number(p.prix_unitaire) || 0, total: Number(p.prix_unitaire) || 0 };
      return [...copy, item];
    });
  };

  const addItemFromService = (s: Service) => {
    setItems((it) => {
      const copy = [...it];
      const idx = copy.findIndex(row => String(row.service_id) === String(s.id));
      if (idx !== -1) {
        const existing = { ...copy[idx] };
        existing.quantite = Number(existing.quantite || 0) + 1;
        existing.total = existing.quantite * (Number(existing.prix_unitaire) || Number(s.prix_unitaire) || 0);
        copy[idx] = existing;
        return copy;
      }
      const item: CommandeItem = { id: `tmp-${Date.now()}`, commande_id: initial?.id || 'tmp', service_id: s.id, nom: s.nom, quantite: 1, prix_unitaire: Number(s.prix_unitaire) || 0, total: Number(s.prix_unitaire) || 0 };
      return [...copy, item];
    });
  };

  const updateItem = (idx: number, patch: Partial<CommandeItem>) => {
    setItems((it) => {
      const copy = [...it];
      const existing = { ...copy[idx], ...patch };
      if (patch.quantite != null && copy[idx].produit_id) {
        const prod = products.find(p => String(p.id) === String(getItemProductId(copy[idx])));
        const stock = prod ? Number(prod.stock_actuel || 0) : 0;
        let maxAllowed = Infinity;
        if (String(copy[idx].id).startsWith('tmp-')) maxAllowed = stock;
        else { const orig = initialQtyMap[String(copy[idx].id)] || 0; maxAllowed = stock + orig; }
        let desired = Number(patch.quantite || 0);
        if (desired < 1) desired = 1;
        if (!Number.isFinite(maxAllowed)) maxAllowed = desired;
        if (desired > maxAllowed) desired = maxAllowed;
        existing.quantite = desired;
      }
      // Recompute unit/total using authoritative prices when possible
      const prod = existing.produit_id ? products.find(p => String(p.id) === String(getItemProductId(existing))) : null;
      const serv = existing.service_id ? services.find(s => String(s.id) === String(getItemServiceId(existing))) : null;
      existing.prix_unitaire = computeUnitPrice(existing, prod ?? null, serv ?? null);
      existing.total = Number(existing.prix_unitaire || 0) * Number(existing.quantite || 0);
      copy[idx] = existing; return copy;
    });
  };

  const removeItem = (idx: number) => setItems((it) => it.filter((_, i) => i !== idx));
  const computeTotal = () => items.reduce((s, it) => {
    const prod = it.produit_id ? products.find(p => String(p.id) === String(getItemProductId(it))) : null;
    const serv = it.service_id ? services.find(s => String(s.id) === String(getItemServiceId(it))) : null;
    const unit = computeUnitPrice(it, prod ?? null, serv ?? null);
    const qty = Number(it.quantite || 0);
    return s + (unit * qty || 0);
  }, 0);

  const handleSubmit = async () => {
    if (isLocked) {
      await Swal.fire({ icon: 'error', title: 'Modification refusée', text: 'Impossible de modifier une commande sur laquelle un paiement a déjà été enregistré.' });
      return;
    }
    setIsSaving(true);
    try {
      const produitsList = items.filter(it => it.produit_id).map(it => ({ ...it }));
      const servicesList = items.filter(it => it.service_id).map(it => ({ ...it }));
      if (produitsList.length === 0 && servicesList.length === 0) {
        onOpenChange(false);
        await Swal.fire({ icon: 'error', title: 'Erreur', text: 'La commande doit contenir au moins un produit ou service', allowOutsideClick: false, didOpen: () => { const el = document.querySelector('.swal2-container'); if (el) (el as HTMLElement).style.zIndex = '9999'; } });
        setIsSaving(false); return;
      }

      if (!initial || !initial.id) {
        const produitsPayload: Array<{ id: string; quantite: number }> = [];
        const servicesPayload: Array<{ id: string; quantite: number }> = [];
        for (const it of produitsList) produitsPayload.push({ id: it.produit_id as string, quantite: Number(it.quantite) || 0 });
        for (const it of servicesList) servicesPayload.push({ id: it.service_id as string, quantite: Number(it.quantite) || 0 });
        const payload: any = { clientId: clientId ? (Number(clientId) || undefined) : undefined, produits: produitsPayload, services: servicesPayload };
        const res = await api.commandes.create(payload);
        const created = (res.data || res) as Commande;
        toast({ title: 'Commande créée' });
        try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
        onSaved && onSaved(created);
        onOpenChange(false);
        return;
      }

      // Editing existing commande: compute diffs
      const toAddProduits: Array<{ id: string; quantite: number }> = [];
      const toAddServices: Array<{ id: string; quantite: number }> = [];
      const toUpdateProduits: Array<{ itemId: string; quantite: number }> = [];
      const toUpdateServices: Array<{ itemId: string; quantite: number }> = [];
      const toDeleteProduitIds: string[] = [];
      const toDeleteServiceIds: string[] = [];

      const initialProduitMap = new Map<string, any>();
      const initialServiceMap = new Map<string, any>();
      const initialItems = (initial as any).produits || (initial as any).items || [];
      initialItems.forEach((it: any) => {
        if (it.produitid || it.produit_id || it.produit_id !== undefined) {
          const idKey = String(it.id || it.produitid || it.produit_id);
          initialProduitMap.set(idKey, it);
        }
        if (it.serviceid || it.service_id || it.service_id !== undefined) {
          const idKey = String(it.id || it.serviceid || it.service_id);
          initialServiceMap.set(idKey, it);
        }
      });

      const seenProduitIds = new Set<string>();
      const seenServiceIds = new Set<string>();

      for (const it of items) {
        if (it.id && String(it.id).startsWith('tmp-')) {
          if (it.produit_id) toAddProduits.push({ id: it.produit_id as string, quantite: Number(it.quantite) || 0 });
          if (it.service_id) toAddServices.push({ id: it.service_id as string, quantite: Number(it.quantite) || 0 });
        } else if (it.id) {
          const itemId = String(it.id);
          if (it.produit_id) {
            seenProduitIds.add(itemId);
            const orig = initialProduitMap.get(itemId);
            const origQty = orig ? Number(orig.quantite || orig.qte || 0) : null;
            if (origQty == null || Number(it.quantite) !== origQty) toUpdateProduits.push({ itemId, quantite: Number(it.quantite) || 0 });
          }
          if (it.service_id) {
            seenServiceIds.add(itemId);
            const orig = initialServiceMap.get(itemId);
            const origQty = orig ? Number(orig.quantite || orig.qte || 0) : null;
            if (origQty == null || Number(it.quantite) !== origQty) toUpdateServices.push({ itemId, quantite: Number(it.quantite) || 0 });
          }
        }
      }

      for (const [k] of initialProduitMap) if (!seenProduitIds.has(String(k))) toDeleteProduitIds.push(String(k));
      for (const [k] of initialServiceMap) if (!seenServiceIds.has(String(k))) toDeleteServiceIds.push(String(k));

      const summaryParts: string[] = [];
      if (toAddProduits.length) summaryParts.push(`${toAddProduits.length} produit(s) à ajouter`);
      if (toAddServices.length) summaryParts.push(`${toAddServices.length} service(s) à ajouter`);
      if (toUpdateProduits.length) summaryParts.push(`${toUpdateProduits.length} ligne(s) produit à mettre à jour`);
      if (toUpdateServices.length) summaryParts.push(`${toUpdateServices.length} ligne(s) service à mettre à jour`);
      if (toDeleteProduitIds.length) summaryParts.push(`${toDeleteProduitIds.length} ligne(s) produit à supprimer`);
      if (toDeleteServiceIds.length) summaryParts.push(`${toDeleteServiceIds.length} ligne(s) service à supprimer`);
      const clientChanged = ((initial as any).client_id || (initial as any).clientId) !== (clientId ? Number(clientId) : undefined);
      if (clientChanged) summaryParts.push('Client modifié');

      const summaryHtml = `<div>Vous êtes sur le point d'appliquer les modifications suivantes:</div><ul style="text-align:left">${summaryParts.map(p => `<li>${p}</li>`).join('')}</ul><div>Confirmer ?</div>`;
      onOpenChange(false);
      const result = await Swal.fire({
        title: 'Confirmer les modifications', html: summaryHtml, icon: 'warning', showCancelButton: true, confirmButtonText: 'Appliquer', cancelButtonText: 'Annuler', allowOutsideClick: false,
        didOpen: () => { const el = document.querySelector('.swal2-container'); if (el) (el as HTMLElement).style.zIndex = '9999'; }
      });
      if (!result.isConfirmed) { setIsSaving(false); return; }

      try {
        if (clientChanged) await api.commandes.update(initial.id, { client_id: clientId ? Number(clientId) : null });
        for (const iid of toDeleteProduitIds) await api.commandes.produits.delete(String(initial.id), String(iid));
        for (const iid of toDeleteServiceIds) await api.commandes.services.delete(String(initial.id), String(iid));
        for (const up of toUpdateProduits) await api.commandes.produits.update(String(initial.id), String(up.itemId), { quantite: up.quantite });
        for (const up of toUpdateServices) await api.commandes.services.update(String(initial.id), String(up.itemId), { quantite: up.quantite });
        for (const a of toAddProduits) await api.commandes.produits.add(String(initial.id), { produitId: a.id, quantite: a.quantite });
        for (const a of toAddServices) await api.commandes.services.add(String(initial.id), { serviceId: a.id, quantite: a.quantite });

        // Recalculate and persist commande total on the server so DB reflects current lines
        try {
          const totalValue = computeTotal();
          // update commande with recalculated total and client if changed
          const payload: any = { total_cmd: Number(totalValue) };
          if (clientChanged) payload.clientId = clientId ? Number(clientId) : null;
          await api.commandes.update(String(initial.id), payload);
          try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
        } catch (errTotal) {
          // non-fatal: log and continue to fetch fresh data
          console.warn('Impossible de mettre à jour le total de la commande:', errTotal);
        }

        const fresh: any = await api.commandes.get(String(initial.id));
        const created = (fresh.data || fresh) as Commande;
  try { window.dispatchEvent(new CustomEvent('notifications-updated')); } catch (e) {}
        await Swal.fire({ icon: 'success', title: 'Succès', text: 'Modifications appliquées', allowOutsideClick: false, didOpen: () => { const el = document.querySelector('.swal2-container'); if (el) (el as HTMLElement).style.zIndex = '9999'; } });
        onSaved && onSaved(created);
      } catch (errOps: any) { toast({ title: 'Erreur lors de l\'application des modifications', description: errOps.message || String(errOps), variant: 'destructive' }); }
      return;
    } catch (err: any) {
      toast({ title: 'Erreur', description: err.message || String(err), variant: 'destructive' });
    } finally { setIsSaving(false); }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>{initial ? 'Modifier la commande' : 'Nouvelle commande'}</DialogTitle>
        </DialogHeader>

        <div className="space-y-4">
          {isLocked && (
            <div className="p-3 bg-destructive/10 border border-destructive text-destructive-foreground rounded">
              Cette commande contient déjà un paiement et ne peut pas être modifiée.
            </div>
          )}
          <div>
            <label className="block text-sm mb-1">Client</label>
            <select className="w-full border rounded p-2" value={clientId || ''} onChange={(e) => setClientId(e.target.value || undefined)}>
              <option value="">Sélectionner un client</option>
              {clients.map(c => (
                <option value={c.id} key={c.id}>{c.prenom} {c.nom}</option>
              ))}
            </select>
          </div>

          <div>
            <label className="block text-sm mb-1">Produits</label>
            <div className="grid grid-cols-2 gap-2">
              {Array.isArray(products) && products.length > 0 ? (
                products.map(p => (
                  <div key={p.id} className="border rounded p-2 flex justify-between items-center">
                    <div>
                      <div className="font-medium">{p.nom}</div>
                      <div className="text-xs text-muted-foreground">{p.prix_unitaire} FCFA • Stock: {Number(p.stock_actuel || 0)}</div>
                    </div>
                    <Button size="sm" variant="outline" onClick={() => addItemFromProduct(p)} disabled={Number(p.stock_actuel || 0) <= 0}>Ajouter</Button>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-sm text-muted-foreground">Aucun produit</div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Services</label>
            <div className="grid grid-cols-2 gap-2">
              {Array.isArray(services) && services.length > 0 ? (
                services.map(s => (
                  <div key={s.id} className="border rounded p-2 flex justify-between items-center">
                    <div>{s.nom} — {s.prix_unitaire} FCFA</div>
                    <Button size="sm" variant="outline" onClick={() => addItemFromService(s)}>Ajouter</Button>
                  </div>
                ))
              ) : (
                <div className="col-span-2 text-sm text-muted-foreground">Aucun service</div>
              )}
            </div>
          </div>

          <div>
            <label className="block text-sm mb-1">Lignes</label>
            <div className="overflow-x-auto">
              <table className="w-full text-sm table-auto border-collapse">
                <thead>
                  <tr className="bg-gray-100">
                    <th className="text-left p-2">Description</th>
                    <th className="p-2">Type</th>
                    <th className="p-2">Qté</th>
                    <th className="p-2">Prix U.</th>
                    <th className="p-2">Total</th>
                    <th className="p-2">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {items.map((it, idx) => {
                    const prod = it.produit_id ? products.find(p => String(p.id) === String(getItemProductId(it))) : null;
                    const serv = it.service_id ? services.find(s => String(s.id) === String(getItemServiceId(it))) : null;
                    const name = it.nom || (prod ? prod.nom : serv ? serv.nom : (getItemProductId(it) ? `Produit #${getItemProductId(it)}` : getItemServiceId(it) ? `Service #${getItemServiceId(it)}` : 'Ligne'));
                    const typeLabel = getItemProductId(it) ? 'Produit' : getItemServiceId(it) ? 'Service' : 'Ligne';
                    return (
                      <tr key={it.id} className="border-b">
                        <td className="p-2 align-top"><div className="font-medium">{name}</div></td>
                        <td className="p-2 text-center align-top"><Badge variant="secondary">{typeLabel}</Badge></td>
                        <td className="p-2 text-center align-top">
                          {(() => {
                            let maxAllowed = undefined as number | undefined;
                            if (it.produit_id) {
                              const p = products.find(x => String(x.id) === String(it.produit_id));
                              const stock = p ? Number(p.stock_actuel || 0) : 0;
                              if (String(it.id).startsWith('tmp-')) maxAllowed = stock;
                              else { const orig = initialQtyMap[String(it.id)] || 0; maxAllowed = stock + orig; }
                              if (!Number.isFinite(maxAllowed)) maxAllowed = undefined;
                            }
                            return (
                              <div className="mx-auto w-20">
                                <Input type="number" min={1} step={1} max={maxAllowed} value={it.quantite} onChange={(e) => updateItem(idx, { quantite: Number(e.target.value) })} className="w-full" />
                                {typeof maxAllowed === 'number' && (<div className="text-xs text-right text-muted-foreground">Max: {maxAllowed}</div>)}
                              </div>
                            );
                          })()}
                        </td>
                        {(() => {
                          const unit = computeUnitPrice(it, prod ?? null, serv ?? null);
                          const totalCalc = unit * Number(it.quantite || 0);
                          return (<>
                            <td className="p-2 text-center align-top">{unit.toFixed(2)} FCFA</td>
                            <td className="p-2 text-right align-top">{totalCalc.toFixed(2)} FCFA</td>
                          </>);
                        })()}
                        <td className="p-2 text-center align-top"><Button size="sm" variant="ghost" onClick={() => removeItem(idx)}>Suppr</Button></td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>

          <div className="text-right font-bold">Total: {computeTotal().toFixed(2)} FCFA</div>

          <div className="flex justify-between items-center">
            <div>
              {/* Payments are handled from Orders list via the Règlement button; no inline payment here */}
            </div>
            <div className="flex gap-2">
              <Button variant="outline" onClick={() => onOpenChange(false)}>Annuler</Button>
              <Button onClick={handleSubmit} disabled={isSaving || items.length === 0} className="bg-gradient-primary">{isSaving ? 'Enregistrement...' : 'Sauvegarder'}</Button>
            </div>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
}
