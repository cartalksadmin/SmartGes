import React from 'react';
import logo from '../../../assets/logo_realtech.png';
import cachet from '../../../assets/cachet_realtech.png';

export type RecuPaiementProps = {
  numero: string;
  date: string;
  client: {
    nom: string;
    prenom: string;
    telephone?: string;
    email?: string;
    adresse?: string;
  };
  commande: {
    numero: string;
    date: string;
    total: number;
    items: Array<{ nom: string; quantite: number; prix_unitaire: number; total: number; type?: string }>;
  };
  paiement: {
    montant: number;
    mode: string;
    date: string;
  };
  reste: number;
  entreprise?: {
    nom?: string;
    adresse?: string;
    telephone?: string;
    email?: string;
  };
  utilisateur?: {
    id?: number | string;
    prenom?: string;
    nom?: string;
  };
  paiements?: Array<{ montant: number; mode: string; date: string }>;
};

const RecuPaiementRealtech: React.FC<RecuPaiementProps> = ({ numero, date, client, commande, paiement, reste, entreprise, utilisateur, paiements = [] }) => {
  return (
    <div style={{ width: 800, margin: '0 auto', background: '#fff', border: '1px solid #eee', padding: 32, fontFamily: 'Arial, sans-serif', position: 'relative' }}>
      <img src={logo} alt="Logo Realtech" style={{ position: 'absolute', left: 32, top: 32, width: 120 }} />
      <img src={cachet} alt="Cachet Realtech" style={{ position: 'absolute', right: 32, bottom: 32, width: 120, opacity: 0.7 }} />
      <div style={{ textAlign: 'center', marginBottom: 16 }}>
        <h2 style={{ margin: 0, color: '#1a237e', fontWeight: 700 }}>REÇU DE PAIEMENT</h2>
        <div style={{ fontSize: 18, fontWeight: 600 }}>{entreprise?.nom || 'REALTECH'}</div>
        <div style={{ fontSize: 14 }}>{entreprise?.adresse || 'Adresse de l’entreprise'}</div>
        <div style={{ fontSize: 14 }}>{entreprise?.telephone || ''} {entreprise?.email || ''}</div>
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 24 }}>
        <div>
          <div><strong>Client :</strong> {client.prenom} {client.nom}</div>
          {client.telephone && <div><strong>Tél :</strong> {client.telephone}</div>}
          {client.email && <div><strong>Email :</strong> {client.email}</div>}
          {client.adresse && <div><strong>Adresse :</strong> {client.adresse}</div>}
        </div>
        <div style={{ textAlign: 'right' }}>
          <div><strong>Date :</strong> {date}</div>
          <div><strong>N° Reçu :</strong> {numero}</div>
          {utilisateur && (
            <div><strong>Émis par :</strong> {utilisateur.prenom || ''} {utilisateur.nom || ''}</div>
          )}
        </div>
      </div>
      <div style={{ marginBottom: 16 }}>
        <div><strong>Commande :</strong> {commande.numero} du {commande.date}</div>
        <div><strong>Montant total :</strong> {commande.total.toLocaleString()} F CFA</div>
      </div>
      <table style={{ width: '100%', borderCollapse: 'collapse', marginBottom: 24 }}>
        <thead>
          <tr style={{ background: '#e3eafc' }}>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Désignation</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Type</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Qté</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Prix Unitaire (F CFA)</th>
            <th style={{ border: '1px solid #ccc', padding: 8 }}>Total (F CFA)</th>
          </tr>
        </thead>
        <tbody>
          {commande.items.map((item, idx) => (
            <tr key={idx}>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.nom}</td>
              <td style={{ border: '1px solid #ccc', padding: 8 }}>{item.type || ''}</td>
              <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'center' }}>{item.quantite}</td>
              <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'right' }}>{item.prix_unitaire.toLocaleString()} F CFA</td>
              <td style={{ border: '1px solid #ccc', padding: 8, textAlign: 'right' }}>{item.total.toLocaleString()} F CFA</td>
            </tr>
          ))}
        </tbody>
      </table>
      <div style={{ marginBottom: 16, fontSize: 16 }}>
        <strong>Montant payé (ce paiement) :</strong> {paiement.montant.toLocaleString()} F CFA<br />
        <strong>Mode de paiement :</strong> {paiement.mode}<br />
        <strong>Date du paiement :</strong> {paiement.date}
      </div>
      {paiements && paiements.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <strong>Historique des paiements :</strong>
          <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: 8 }}>
            <thead>
              <tr style={{ background: '#f5f5f5' }}>
                <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'left' }}>Date</th>
                <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'left' }}>Mode</th>
                <th style={{ border: '1px solid #ccc', padding: 6, textAlign: 'right' }}>Montant (F CFA)</th>
              </tr>
            </thead>
            <tbody>
              {paiements.map((p, idx) => (
                <tr key={idx}>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>{p.date}</td>
                  <td style={{ border: '1px solid #ccc', padding: 6 }}>{p.mode}</td>
                  <td style={{ border: '1px solid #ccc', padding: 6, textAlign: 'right' }}>{p.montant.toLocaleString()}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
      <div style={{ textAlign: 'right', fontSize: 18, fontWeight: 700, marginBottom: 32 }}>
        {Number(reste) > 0 ? (
          <div style={{ color: '#dc2626' }}><strong>Reste à payer :</strong> {Number(reste).toLocaleString()} F CFA</div>
        ) : (
          <div style={{ color: '#059669' }}><strong>Tout est payé</strong></div>
        )}
      </div>
      <div style={{ fontSize: 13, color: '#555', marginTop: 24 }}>
        Ce reçu atteste du paiement partiel ou total de la commande. Merci pour votre confiance.<br />
        Ce reçu est généré par REALTECH et n’est valable qu’avec le cachet officiel.
      </div>
    </div>
  );
};

export default RecuPaiementRealtech;
