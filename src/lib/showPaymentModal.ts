// src/lib/showPaymentModal.ts
import Swal from 'sweetalert2';

type PaymentResult =
  | { statut: 'PAYEE' | 'PARTIELLE'; montant: number; mode: string }
  | null;

interface PaymentModalOptions {
  title?: string;
  total: number;
  alreadyPaid?: number;
}

export default async function showPaymentModal(
  opts: PaymentModalOptions
): Promise<PaymentResult> {
  const total = Number(opts.total || 0);
  const alreadyPaid = Number(opts.alreadyPaid || 0);
  const remaining = Math.max(total - alreadyPaid, 0);

  const result = await Swal.fire({
    title: opts.title || 'Enregistrer un paiement',
    width: 620,
    showCancelButton: true,
    confirmButtonText: 'Valider le paiement',
    cancelButtonText: 'Annuler',
    reverseButtons: true,
    customClass: {
      confirmButton: 'btn btn-primary',
      cancelButton: 'btn btn-ghost',
    },
    html: `
      <div class="text-left space-y-5">

        <!-- Résumé -->
        <div class="bg-base-200 rounded-xl p-5 text-sm">
          <div class="flex justify-between"><span class="text-base-content/70">Total commande</span><strong>${total.toLocaleString()} FCFA</strong></div>
          <div class="flex justify-between"><span class="text-base-content/70">Déjà payé</span><strong class="text-success">${alreadyPaid.toLocaleString()} FCFA</strong></div>
          <div class="flex justify-between pt-3 border-t border-base-300 text-lg font-bold">
            <span>Reste à payer</span>
            <span class="text-primary">${remaining.toLocaleString()} FCFA</span>
          </div>
        </div>

        <!-- Type de paiement -->
        <div>
          <label class="block font-medium mb-2">Type de paiement</label>
          <select id="payment-type" class="select select-bordered w-full">
            <option value="PAYEE">Paiement total (régler toute la commande)</option>
            <option value="PARTIELLE" selected>Paiement partiel</option>
          </select>
        </div>

        <!-- Montant -->
        <div>
          <label for="payment-amount" class="block font-medium mb-2">Montant à encaisser</label>
          <input id="payment-amount" type="number" min="1" step="1" value="${remaining}" class="input input-bordered w-full" placeholder="15000" />
          <div class="text-xs text-base-content/60 mt-1">Maximum autorisé : ${remaining.toLocaleString()} FCFA</div>
        </div>

        <!-- Mode de paiement -->
        <div>
          <label class="block font-medium mb-3">Mode de paiement</label>
          <div class="grid grid-cols-2 gap-3">
            ${[
              { v: 'cash', l: 'Espèces', i: '💵' },
              { v: 'mobile_money', l: 'Mobile Money', i: '📱' },
              { v: 'carte', l: 'Carte bancaire', i: '💳' },
              { v: 'cheque', l: 'Chèque', i: '📄' },
              { v: 'virement', l: 'Virement', i: '🏦' },
            ]
              .map(
                (m, idx) => `
              <label class="flex items-center gap-3 p-4 border rounded-lg cursor-pointer hover:bg-base-200 transition has-[:checked]:bg-primary has-[:checked]:text-white">
                <input type="radio" name="payment-mode" value="${m.v}" class="radio radio-primary" ${idx === 0 ? 'checked' : ''} />
                <span><span class="text-2xl mr-2">${m.i}</span> ${m.l}</span>
              </label>`
              )
              .join('')}
          </div>
        </div>
      </div>
    `,
    focusConfirm: false,
    preConfirm: () => {
      const typeEl = document.getElementById('payment-type') as HTMLSelectElement;
      const amountEl = document.getElementById('payment-amount') as HTMLInputElement;
      const modeRadio = document.querySelector('input[name="payment-mode"]:checked') as HTMLInputElement;

      const statut = typeEl?.value as 'PAYEE' | 'PARTIELLE';
      const montant = Number(amountEl?.value || 0);
      const mode = modeRadio?.value || 'cash';

      // ──────── VALIDATIONS STRICTES ────────
      if (montant <= 0) {
        Swal.showValidationMessage('Veuillez saisir un montant supérieur à 0');
        return false;
      }

      if (montant > remaining) {
        Swal.showValidationMessage(`Le montant ne peut pas dépasser le reste à payer (${remaining.toLocaleString()} FCFA)`);
        return false;
      }

      if (statut === 'PAYEE') {
        if (montant !== remaining) {
          Swal.showValidationMessage(
            `Pour un <strong>paiement total</strong>, le montant doit être <strong>exactement ${remaining.toLocaleString()} FCFA</strong>`
          );
          return false;
        }
      }

      if (statut === 'PARTIELLE') {
        if (montant >= remaining) {
          Swal.showValidationMessage(
            `Pour un paiement partiel, le montant doit être <strong>strictement inférieur</strong> à ${remaining.toLocaleString()} FCFA`
          );
          return false;
        }
      }

      return { statut, montant, mode };
    },
  });

  if (!result.isConfirmed || !result.value) return null;
  return result.value as PaymentResult;
}