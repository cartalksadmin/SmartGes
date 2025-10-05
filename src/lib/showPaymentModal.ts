import Swal from 'sweetalert2';

type PaymentResult = { statut: 'PAYEE' | 'PARTIELLE' | 'NON_PAYEE'; montant: number } | null;

export default async function showPaymentModal(opts: { title?: string; total: number; alreadyPaid?: number; defaultStatut?: 'PAYEE' | 'PARTIELLE' }) : Promise<PaymentResult> {
  const total = Number(opts.total || 0);
  const alreadyPaid = Number(opts.alreadyPaid || 0);
  const remaining = Math.max(total - alreadyPaid, 0);
  const title = opts.title || `Enregistrer un paiement`;

  const res = await Swal.fire({
    title,
    html: `
      <div style="text-align:left">Total commande: <strong>${total.toFixed(2)} FCFA</strong></div>
      <div style="text-align:left">Montant déjà payé: <strong>${alreadyPaid.toFixed(2)} FCFA</strong></div>
      <div style="text-align:left">Montant restant: <strong>${remaining.toFixed(2)} FCFA</strong></div>
      <hr />
      <label style="display:block;text-align:left;margin-bottom:6px">Type de paiement</label>
      <select id="swal-statut" class="swal2-select">
        <option value="PAYEE">Paiement total</option>
        <option value="PARTIELLE">Paiement partiel</option>
      </select>
      <input id="swal-montant" class="swal2-input" placeholder="Montant (FCFA)" type="number" value="${remaining}" />
    `,
    focusConfirm: false,
    showCancelButton: true,
    didOpen: () => { const el = document.querySelector('.swal2-container'); if (el) (el as HTMLElement).style.zIndex = '9999'; },
    preConfirm: () => {
      const statutEl = document.getElementById('swal-statut') as HTMLSelectElement | null;
      const montantEl = document.getElementById('swal-montant') as HTMLInputElement | null;
      const statut = statutEl ? statutEl.value as ('PAYEE'|'PARTIELLE'|'NON_PAYEE') : (opts.defaultStatut || 'PARTIELLE');
      const montant = montantEl ? Number(montantEl.value || 0) : 0;
      // validations
      if (statut === 'PAYEE') {
        if (Math.abs(montant - remaining) > 0.0001) {
          Swal.showValidationMessage(`Pour un paiement total, le montant doit être égal au montant restant (${remaining.toFixed(2)})`);
          return null;
        }
      } else if (statut === 'PARTIELLE') {
        if (montant <= 0) {
          Swal.showValidationMessage('Veuillez saisir un montant valide (> 0)');
          return null;
        }
        if (montant > remaining) {
          Swal.showValidationMessage('Le montant payé ne peut pas dépasser le montant restant');
          return null;
        }
      }
      return { statut, montant };
    }
  });

  if (!res || !res.isConfirmed || !res.value) return null;
  return res.value as { statut: 'PAYEE' | 'PARTIELLE' | 'NON_PAYEE'; montant: number };
}
