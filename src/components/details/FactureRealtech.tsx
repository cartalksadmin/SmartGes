import React from 'react';
import logo from '../../../assets/logo_realtech.png';
import cachet from '../../../assets/cachet_realtech.png';

export type FactureProps = {
  numero: string;
  date: string;
  client: {
    nom: string;
    prenom: string;
    telephone?: string;
    email?: string;
    adresse?: string;
  };
  items: Array<{
    nom: string;
    designation?: string;
    name?: string;
    product?: any;
    service?: any;
    quantite: number;
    prix_unitaire: number;
    unit_price?: number;
    price?: number;
    total: number;
    type?: string;
  }>;
  montant: number;
  entreprise?: {
    nom?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  };
  utilisateur?: {
    nom?: string;
    prenom?: string;
  };
};

const FactureRealtech: React.FC<FactureProps> = ({
  numero,
  date,
  client,
  items,
  montant,
  entreprise = {},
  utilisateur,
}) => {
  const tvaRate = 19.25; // TVA Cameroun
  const subtotal = items.reduce((s, it) => s + Number(it.total || (Number(it.quantite || 0) * Number(it.prix_unitaire || 0))), 0);
  const tva = +(subtotal * (tvaRate / 100));
  const computedTotal = +(subtotal + tva);
  // If a total montant was provided prefer it, otherwise use computedTotal
  const finalTotal = Number(montant || computedTotal);

  return (
    <div className="relative max-w-4xl mx-auto bg-white font-sans text-sm leading-relaxed pb-24">
      {/* En-tête avec logo + cercle décoratif */}
      <div className="relative border-b-2 border-gray-300 pb-8 mb-10">
        <div className="flex justify-between items-start">
          <div>
            <img src={logo} alt="Realtech" className="h-16" />
          </div>
          <div className="text-right">
            <h1 className="text-4xl font-bold text-gray-800">FACTURE</h1>
            <p className="text-gray-600 mt-2">
              Facture n°<span className="font-bold text-gray-900"> {numero}</span>
            </p>
            <p className="text-gray-600">
              Date : <span className="font-bold">{date}</span>
            </p>
          </div>
        </div>

        {/* Cercle décoratif */}
        <div className="absolute top-0 right-0 w-20 h-20 border-4 border-gray-300 rounded-full translate-x-10 -translate-y-10" />
      </div>

      {/* Client + Infos entreprise */}
      <div className="grid grid-cols-2 gap-16 mb-12">
        <div>
          <h3 className="font-bold text-gray-900 text-lg mb-3">{entreprise?.nom || 'REALTECH'}</h3>
          {entreprise?.adresse && <p>{entreprise.adresse}</p>}
          {entreprise?.email && <p>{entreprise.email}</p>}
          {entreprise?.telephone && <p>{entreprise.telephone}</p>}
        </div>

        <div className="text-right">
          <h3 className="font-bold text-gray-900 text-lg mb-3">À L'ATTENTION DE</h3>
          <p className="font-semibold">{client.prenom} {client.nom}</p>
          {client.telephone && <p>{client.telephone}</p>}
          {client.email && <p>{client.email}</p>}
          {client.adresse && <p>{client.adresse}</p>}
          {utilisateur && (
            <p className="mt-2 text-sm text-gray-700">Émise par : {utilisateur.prenom} {utilisateur.nom}</p>
          )}
        </div>
      </div>

      {/* Tableau */}
      <table className="w-full mb-10 text-left">
        <thead>
          <tr className="border-b-2 border-gray-900">
            <th className="pb-4 font-bold text-gray-900">Description</th>
            <th className="pb-4 text-center font-bold text-gray-900">Type</th>
            <th className="pb-4 text-center font-bold text-gray-900">Prix</th>
            <th className="pb-4 text-center font-bold text-gray-900">Quantité</th>
            <th className="pb-4 text-right font-bold text-gray-900">Total</th>
          </tr>
        </thead>
        <tbody>
          {items.map((item, i) => (
            <tr key={i} className="border-b border-gray-200">
              <td className="py-5 pr-4">
                <div className="font-medium text-gray-900">
                  {item.nom || item.designation || item.name || (item.product && (item.product.nom || item.product.name)) || (item.service && (item.service.nom || item.service.name)) || ''}
                </div>
              </td>
              <td className="py-5 text-center text-gray-700 text-sm">{item.type || ''}</td>
              <td className="py-5 text-center text-gray-700">
                {(Number(item.prix_unitaire || item.unit_price || item.price || (item.product && (item.product.prix_unitaire || item.product.price)) || (item.service && (item.service.prix_unitaire || item.service.price)) || 0)).toLocaleString()} FCFA
              </td>
              <td className="py-5 text-center text-gray-700">{Number(item.quantite || 0)}</td>
              <td className="py-5 text-right font-bold text-gray-900">
                {(Number(item.total || (Number(item.quantite || 0) * Number(item.prix_unitaire || 0)))).toLocaleString()} FCFA
              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {/* Totaux */}
      <div className="flex justify-end mb-16">
        <div className="w-80">
          <div className="flex justify-between py-3 border-b border-gray-300">
            <span className="text-gray-700">Sous-total</span>
            <span className="font-bold">{subtotal.toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between py-3 border-b border-gray-300">
            <span className="text-gray-700">TVA ({tvaRate}%)</span>
            <span className="font-bold">{Math.round(tva).toLocaleString()} FCFA</span>
          </div>
          <div className="flex justify-between py-5 text-xl">
            <span className="font-bold text-gray-900">TOTAL</span>
            <span className="font-bold text-gray-900">{finalTotal.toLocaleString()} FCFA</span>
          </div>
        </div>
      </div>

      {/* Pied de page */}
      <div className="grid grid-cols-2 gap-8 text-xs text-gray-600 border-t pt-8">
        <div>
          <p className="font-bold text-gray-900 mb-2">Paiement à l'ordre de Celia Marion</p>
          <p>N° de compte : 123 456 789 0012345</p>
        </div>
        <div className="text-right">
          <p className="font-bold text-gray-900 mb-2">Conditions de paiement</p>
          <p>Paiement sous 30 jours</p>
        </div>
      </div>

      <div className="text-center mt-12 font-bold text-gray-900 text-lg mb-8">
        MERCI DE VOTRE CONFIANCE
      </div>

      {/* Cachet centré en bas */}
      <img
        src={cachet}
        alt="Cachet"
        className="absolute bottom-6 left-1/2 transform -translate-x-1/2 w-40 opacity-80 pointer-events-none"
      />
    </div>
  );
};

export default FactureRealtech;