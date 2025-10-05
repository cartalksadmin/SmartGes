import pool from '../config/pg.js';

/**
 * Commande model (Postgres)
 * Tables assumed (adaptées) :
 * - commande (id, code, numero, total_cmd, statut, createdat, updatedat, clientid, utilisateurid, deletedat)
 * - commandeproduit (id, quantite, prix_total, produitid, commandeid, createdat, updatedat, deletedat)
 * - commandeservice (id, quantite, prix_total, serviceid, commandeid, createdat, updatedat, deletedat)
 */

async function createCommande({ code, numero, client_id, utilisateur_id = null, date_commande = new Date(), montant_total = 0, statut = 'PENDING', items = [] }) {
  // Insert commande
  const { rows: createdRows } = await pool.query(
    `INSERT INTO commande (code, numero, clientid, utilisateurid, total_cmd, statut, createdat,date_commande,actif)
     VALUES ($1, $2, $3, $4, $5, $6, CURRENT_TIMESTAMP, $7, $8)
     RETURNING *`,
    [code, numero, client_id, utilisateur_id, montant_total, statut, date_commande, true]
  );
  const commande = createdRows[0];

  // Insert items: distinguish produits and services by presence of produit_id / service_id on item
  if (items && items.length) {
    const prodInserts = [];
    const servInserts = [];

    for (const item of items) {
      if (item.produit_id != null) {
        prodInserts.push(pool.query(
          `INSERT INTO commandeproduit (quantite, prix_total, produitid, commandeid, createdat)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
          [item.quantite, item.total, item.produit_id, commande.id]
        ));
      } else if (item.service_id != null || item.produit_id === null && item.nom && item.isService) {
        // if service items use service_id if provided; otherwise rely on provided nom and treat as service
        servInserts.push(pool.query(
          `INSERT INTO commandeservice (quantite, prix_total, serviceid, commandeid, createdat)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
          [item.quantite, item.total, item.service_id || null, commande.id]
        ));
      } else {
        // fallback: if no explicit flags, treat item with produit_id null as service (store in commandeservice)
        servInserts.push(pool.query(
          `INSERT INTO commandeservice (quantite, prix_total, serviceid, commandeid, createdat)
           VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
          [item.quantite, item.total, null, commande.id]
        ));
      }
    }

    const results = await Promise.all([...prodInserts, ...servInserts]);
    // flatten returned rows
    commande.produits = results
      .filter(r => r.command === undefined || r.rows)
      .flatMap(r => r.rows)
      .filter(r => r); // ensure no undefined
  } else {
    commande.produits = [];
  }

  return commande;
}

async function getCommandeById(id) {
  const { rows } = await pool.query(
    `SELECT c.*, cl.nom AS client_nom, cl.prenom AS client_prenom, cl.email AS client_email, cl.telephone AS client_telephone
     FROM commande c
     LEFT JOIN client cl ON cl.id = c.clientid
     WHERE c.id = $1`,
    [id]
  );
  const commande = rows[0] || null;
  if (!commande) return null;

  const { rows: produits } = await pool.query(
    `SELECT * FROM commandeproduit WHERE commandeid = $1 AND (deletedat IS NULL) ORDER BY id`,
    [id]
  );

  const { rows: services } = await pool.query(
    `SELECT * FROM commandeservice WHERE commandeid = $1 AND (deletedat IS NULL) ORDER BY id`,
    [id]
  );

  commande.produits = produits;
  commande.services = services;
  return commande;
}

async function getCommandes({ page = 1, limit = 10, search, statut, client_id, minDate, maxDate, sortBy = 'createdat', sortOrder = 'desc' }) {
  const where = [];
  const values = [];
  let idx = 1;

  // only non-deleted by default
  where.push(`c.deletedat IS NULL`);

  // sanitize search (ignore empty string)
  if (search && String(search).trim() !== '') {
    where.push(`(c.numero ILIKE $${idx} OR CAST(c.total_cmd AS TEXT) ILIKE $${idx})`);
    values.push(`%${String(search).trim()}%`);
    idx++;
  }

  if (statut && String(statut).trim() !== '') {
    where.push(`c.statut = $${idx}`);
    values.push(String(statut).trim());
    idx++;
  }

  if (client_id !== undefined && client_id !== null && String(client_id).trim() !== '') {
    where.push(`c.clientid = $${idx}`);
    values.push(Number(client_id));
    idx++;
  }

  // Validate and format minDate / maxDate using createdat
  if (minDate && String(minDate).trim() !== '') {
    const d = new Date(minDate);
    if (!isNaN(d.getTime())) {
      where.push(`c.createdat::date >= $${idx}::date`);
      values.push(d.toISOString().slice(0, 10));
      idx++;
    }
  }

  if (maxDate && String(maxDate).trim() !== '') {
    const d2 = new Date(maxDate);
    if (!isNaN(d2.getTime())) {
      where.push(`c.createdat::date <= $${idx}::date`);
      values.push(d2.toISOString().slice(0, 10));
      idx++;
    }
  }

  // whitelist sort columns to avoid SQL injection
  const allowedSorts = ['id', 'code', 'numero', 'total_cmd', 'statut', 'createdat', 'updatedat'];
  const sortCol = allowedSorts.includes(String(sortBy).toLowerCase()) ? String(sortBy).toLowerCase() : 'createdat';
  const order = String(sortOrder).toLowerCase() === 'desc' ? 'DESC' : 'ASC';

  const whereClause = where.length ? `WHERE ${where.join(' AND ')}` : '';
  const offset = (Number(page) - 1) * Number(limit);

  const sql = `
    SELECT c.*, cl.nom AS client_nom, cl.prenom AS client_prenom, cl.email AS client_email, cl.telephone AS client_telephone,
           u.id AS utilisateur_id, u.nom AS utilisateur_nom, u.prenom AS utilisateur_prenom
    FROM commande c
    LEFT JOIN client cl ON cl.id = c.clientid
    LEFT JOIN utilisateur u ON u.id = c.utilisateurid
    ${whereClause}
    ORDER BY "${sortCol}" ${order}
    LIMIT $${idx} OFFSET $${idx + 1}
  `;
  values.push(Number(limit), Number(offset));

  const { rows } = await pool.query(sql, values);

  // total count
  const countSql = `SELECT COUNT(*) AS count FROM commande c ${whereClause}`;
  const countValues = values.slice(0, Math.max(0, idx - 1));
  const { rows: countRows } = await pool.query(countSql, countValues);
  const total = Number(countRows[0]?.count || 0);

  // attach utilisateur object if joined
  const commandes = rows.map(r => ({
    ...r,
    utilisateur: r.utilisateur_id ? { id: r.utilisateur_id, nom: r.utilisateur_nom, prenom: r.utilisateur_prenom } : null,
    client: r.client_nom ? { nom: r.client_nom, prenom: r.client_prenom, email: r.client_email, telephone: r.client_telephone } : null,
  }));

  return {
    commandes,
    total,
    totalPages: Math.ceil(total / limit),
    currentPage: Number(page),
  };
}

async function updateCommande(id, updateData) {
  // Map JS/API keys to actual DB column names to avoid "column does not exist" errors
  const columnMap = {
    client_id: 'clientid',
    clientId: 'clientid',
    utilisateur_id: 'utilisateurid',
    utilisateurId: 'utilisateurid',
    totalCmd: 'total_cmd',
    total_cmd: 'total_cmd',
    montant_paye: 'montant_paye',
    montant_restant: 'montant_restant',
    statut_paiement: 'statut_paiement',
    date_commande: 'date_commande',
    createdAt: 'createdat',
    updatedAt: 'updatedat',
    deletedAt: 'deletedat',
    actif: 'actif',
    statut: 'statut',
    code: 'code',
    numero: 'numero'
  };

  const fields = [];
  const values = [];
  let idx = 1;
  for (const rawKey in updateData) {
    if (!Object.prototype.hasOwnProperty.call(updateData, rawKey)) continue;
    const dbKey = columnMap[rawKey] || rawKey; // fallback to given key
    // ensure we use the exact column name (lowercase/no quotes issues handled by wrapping in double quotes)
    fields.push(`"${dbKey}" = $${idx}`);
    values.push(updateData[rawKey]);
    idx++;
  }
  values.push(id);
  const sql = `
    UPDATE commande SET ${fields.join(', ')}, updatedat = CURRENT_TIMESTAMP
    WHERE id = $${idx}
    RETURNING *
  `;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function addCommandeProduit(commande_id, { produit_id = null, nom = null, quantite, prix_unitaire = null, total }) {
  const { rows } = await pool.query(
    `INSERT INTO commandeproduit (quantite, prix_total, produitid, commandeid, createdat)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
    [quantite, total, produit_id, commande_id]
  );
  return rows[0];
}

async function addCommandeService(commande_id, { service_id = null, nom = null, quantite, prix_unitaire = null, total }) {
  const { rows } = await pool.query(
    `INSERT INTO commandeservice (quantite, prix_total, serviceid, commandeid, createdat)
     VALUES ($1, $2, $3, $4, CURRENT_TIMESTAMP) RETURNING *`,
    [quantite, total, service_id, commande_id]
  );
  return rows[0];
}

async function updateCommandeProduit(itemId, updateData) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key in updateData) {
    fields.push(`"${key}" = $${idx}`);
    values.push(updateData[key]);
    idx++;
  }
  values.push(itemId);
  const sql = `
    UPDATE commandeproduit SET ${fields.join(', ')}, updatedat = CURRENT_TIMESTAMP
    WHERE id = $${idx}
    RETURNING *
  `;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function updateCommandeService(itemId, updateData) {
  const fields = [];
  const values = [];
  let idx = 1;
  for (const key in updateData) {
    fields.push(`"${key}" = $${idx}`);
    values.push(updateData[key]);
    idx++;
  }
  values.push(itemId);
  const sql = `
    UPDATE commandeservice SET ${fields.join(', ')}, updatedat = CURRENT_TIMESTAMP
    WHERE id = $${idx}
    RETURNING *
  `;
  const { rows } = await pool.query(sql, values);
  return rows[0] || null;
}

async function removeCommandeProduit(itemId) {
  await pool.query(`DELETE FROM commandeproduit WHERE id = $1`, [itemId]);
  return true;
}

async function removeCommandeService(itemId) {
  await pool.query(`DELETE FROM commandeservice WHERE id = $1`, [itemId]);
  return true;
}

async function softDeleteCommande(id) {
  const { rows } = await pool.query(
    `UPDATE commande SET deletedat = CURRENT_TIMESTAMP, statut = 'CANCELLED' WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

async function restoreCommande(id) {
  const { rows } = await pool.query(
    `UPDATE commande SET deletedat = NULL WHERE id = $1 RETURNING *`,
    [id]
  );
  return rows[0] || null;
}

export default {
  createCommande,
  getCommandeById,
  getCommandes,
  updateCommande,
  addCommandeProduit,
  addCommandeService,
  updateCommandeProduit,
  updateCommandeService,
  removeCommandeProduit,
  removeCommandeService,
  softDeleteCommande,
  restoreCommande,
  // returns true if commande has any recorded payments (montant_paye > 0) or linked ventes/recu
  async hasPayments(id) {
    // Check paiement table for any rows or sum > 0
    try {
      const { rows } = await pool.query(`SELECT COUNT(*)::int AS count FROM paiement WHERE commande_id = $1`, [Number(id)]);
      const count = Number(rows[0]?.count || 0);
      if (count > 0) return true;
    } catch (e) {
      // If paiement table doesn't exist yet or query fails, fallback to existing heuristics
      try {
        const { rows: vrows } = await pool.query(`SELECT COUNT(*)::int AS count FROM vente WHERE commandeid = $1`, [Number(id)]);
        const vcount = Number(vrows[0]?.count || 0);
        if (vcount > 0) return true;
      } catch (err) {
        // ignore
      }
    }
    // fallback: check montant_paye field
    try {
      const { rows: r2 } = await pool.query(`SELECT montant_paye, statut_paiement FROM commande WHERE id = $1`, [Number(id)]);
      const row = r2[0] || {};
      const statutPaiement = row.statut_paiement ? String(row.statut_paiement).toUpperCase() : '';
      if (statutPaiement === 'PAYEE' || statutPaiement === 'PARTIELLE') return true;
      if (Number(row.montant_paye || 0) > 0) return true;
    } catch (e) {
      // ignore
    }
    return false;
  }
};