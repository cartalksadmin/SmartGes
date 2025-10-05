import { createCanvas, loadImage } from 'canvas';
import fs from 'fs/promises';
import path from 'path';
import { createInvoiceFolder, createReceiptFolder } from '../utils/fileManager.js';
import { logger } from '../utils/logger.js';
import { config } from '../config/index.js';
import { PDFDocument } from 'pdf-lib';

export const generateInvoicePNG = async (invoiceData) => {
  try {
    const folderPath = await createInvoiceFolder(invoiceData.numero);
    const fileName = `facture-${invoiceData.numero}.png`;
    const filePath = path.join(folderPath, fileName);

    // A4-like canvas for better print/layout (px)
    const canvas = createCanvas(1000, 1400);
    const ctx = canvas.getContext('2d');

    // White background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvas.width, canvas.height);

    // Load company info if present
    let company = null;
    try {
      const companyRaw = await fs.readFile(path.join(config.UPLOAD_PATH, 'company.json'), 'utf-8');
      company = JSON.parse(companyRaw);
    } catch (e) {
      // ignore if not present
    }

    // Try to load logo
    let logoPath = null;
    try {
      const logoPathPng = path.join(config.UPLOAD_PATH, 'logo.png');
      const logoPathJpg = path.join(config.UPLOAD_PATH, 'logo.jpg');
      try {
        await fs.access(logoPathPng);
        logoPath = logoPathPng;
      } catch (e) {
        try {
          await fs.access(logoPathJpg);
          logoPath = logoPathJpg;
        } catch (e) {
          logoPath = null;
        }
      }
    } catch (e) {
      logoPath = null;
    }

    // Header area
    ctx.fillStyle = '#0f172a'; // dark header
    ctx.fillRect(0, 0, canvas.width, 140);

    // Draw logo (left)
    if (logoPath) {
      try {
        const img = await loadImage(logoPath);
        const h = 90;
        const ratio = img.width / img.height;
        const w = ratio * h;
        ctx.drawImage(img, 40, 25, w, h);
      } catch (e) {
        logger.warn('Unable to load logo image:', e);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 28px Arial';
      ctx.textAlign = 'left';
      ctx.fillText(company && company.nom ? company.nom : 'RealTech Holding', 40, 70);
    }

    // Invoice big title and meta (right)
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'right';
    ctx.font = 'bold 34px Arial';
    ctx.fillText('FACTURE', canvas.width - 40, 60);
    ctx.font = '16px Arial';
    ctx.fillText(`N° ${invoiceData.numero}`, canvas.width - 40, 90);
    ctx.fillText(`Date: ${new Date(invoiceData.date).toLocaleDateString('fr-FR')}`, canvas.width - 40, 112);

    // Company details under header (left column)
    ctx.textAlign = 'left';
    ctx.fillStyle = '#111827';
    ctx.font = '14px Arial';
    const leftStart = 40;
    let curY = 170;
    ctx.font = 'bold 16px Arial';
    ctx.fillText('Facturé par', leftStart, curY);
    curY += 22;
    ctx.font = '14px Arial';
    if (company && company.nom) {
      ctx.fillText(company.nom, leftStart, curY);
      curY += 18;
      if (company.adresse) {
        ctx.fillText(company.adresse, leftStart, curY);
        curY += 18;
      }
      if (company.telephone) {
        ctx.fillText(`Tél: ${company.telephone}`, leftStart, curY);
        curY += 18;
      }
      if (company.email) {
        ctx.fillText(company.email, leftStart, curY);
        curY += 18;
      }
      if (company.numero_fiscal || company.tax_number) {
        ctx.fillText(`N° TVA: ${company.numero_fiscal || company.tax_number}`, leftStart, curY);
        curY += 18;
      }
    } else {
      ctx.fillText('RealTech Holding - Boutique Informatique', leftStart, curY);
      curY += 18;
    }

    // Client block (right column)
    const clientX = canvas.width - 360;
    let clientY = 170;
    ctx.fillStyle = '#f3f4f6';
    ctx.fillRect(clientX, clientY - 18, 320, 110);
    ctx.fillStyle = '#111827';
    ctx.font = 'bold 14px Arial';
    ctx.fillText('Facturé à', clientX + 14, clientY);
    ctx.font = '14px Arial';
    clientY += 24;
    if (invoiceData.client) {
      ctx.fillText(`${invoiceData.client.prenom || ''} ${invoiceData.client.nom || ''}`.trim(), clientX + 14, clientY);
      clientY += 18;
      if (invoiceData.client.adresse) {
        ctx.fillText(invoiceData.client.adresse, clientX + 14, clientY);
        clientY += 18;
      }
      if (invoiceData.client.email) {
        ctx.fillText(invoiceData.client.email, clientX + 14, clientY);
        clientY += 18;
      }
      if (invoiceData.client.telephone) {
        ctx.fillText(invoiceData.client.telephone, clientX + 14, clientY);
        clientY += 18;
      }
    }

    // Items table header
    let tableY = 320;
    const tableX = 40;
    const tableW = canvas.width - 80;

    ctx.fillStyle = '#111827';
    ctx.font = 'bold 12px Arial';
    ctx.fillRect(tableX, tableY - 20, tableW, 28);
    ctx.fillStyle = '#ffffff';
    ctx.textAlign = 'left';
    ctx.fillText('Désignation', tableX + 10, tableY);
    ctx.textAlign = 'center';
    ctx.fillText('Qté', tableX + Math.floor(tableW * 0.45), tableY);
    ctx.fillText('PU (F CFA)', tableX + Math.floor(tableW * 0.6), tableY);
    ctx.fillText('TVA', tableX + Math.floor(tableW * 0.78), tableY);
    ctx.textAlign = 'right';
    ctx.fillText('Total (F CFA)', tableX + tableW - 10, tableY);

    // Table rows
    ctx.font = '14px Arial';
    ctx.fillStyle = '#000000';
    ctx.textAlign = 'left';
    tableY += 28;
    const rowHeight = 28;
    const items = invoiceData.items || [];
    items.forEach(item => {
      // name
      const name = (item.nom || item.description || '').toString();
      ctx.textAlign = 'left';
      ctx.fillText(name.substring(0, 60), tableX + 10, tableY + 18);
      // qty
      ctx.textAlign = 'center';
      ctx.fillText(String(item.quantite || 0), tableX + Math.floor(tableW * 0.45), tableY + 18);
      // unit price
      const unit = Number(item.prix_unitaire || item.unit_price || 0);
      ctx.fillText(unit.toFixed(2), tableX + Math.floor(tableW * 0.6), tableY + 18);
      // tva (percent)
      const tvaLabel = item.tva_percent != null ? `${Number(item.tva_percent).toFixed(0)}%` : (invoiceData.tax_rate ? `${Number(invoiceData.tax_rate).toFixed(0)}%` : '0%');
      ctx.fillText(tvaLabel, tableX + Math.floor(tableW * 0.78), tableY + 18);
      // total
      ctx.textAlign = 'right';
      const totalLine = Number(item.total || (unit * (item.quantite || 0)));
      ctx.fillText(totalLine.toFixed(2), tableX + tableW - 10, tableY + 18);

      tableY += rowHeight;
    });

    // Draw a separator line
    tableY += 8;
    ctx.strokeStyle = '#e5e7eb';
    ctx.beginPath();
    ctx.moveTo(tableX, tableY);
    ctx.lineTo(tableX + tableW, tableY);
    ctx.stroke();

    // Totals
    const subtotal = items.reduce((s, it) => s + Number(it.total || (Number(it.prix_unitaire || it.unit_price || 0) * (it.quantite || 0))), 0);
    const discount = Number(invoiceData.discount || 0);
    const taxRate = Number(invoiceData.tax_rate || 0);
    const tax = ((subtotal - discount) * taxRate) / 100;
    const total = Number(invoiceData.total || subtotal - discount + tax);
    const paid = Number(invoiceData.paid || invoiceData.montant_paye || 0);
    const amountDue = Math.max(total - paid, 0);

    // Totals box (right)
    const totalsBoxW = 360;
    const totalsBoxX = canvas.width - totalsBoxW - 40;
    let totalsY = tableY + 20;

    ctx.fillStyle = '#f8fafc';
    ctx.fillRect(totalsBoxX, totalsY - 10, totalsBoxW, 160);
    ctx.fillStyle = '#111827';
    ctx.font = '14px Arial';
    ctx.textAlign = 'right';
    ctx.fillText(`Sous-total: ${subtotal.toFixed(2)} F CFA`, totalsBoxX + totalsBoxW - 14, totalsY + 12);
    totalsY += 26;
    if (discount && discount > 0) {
      ctx.fillText(`Remise: -${discount.toFixed(2)} F CFA`, totalsBoxX + totalsBoxW - 14, totalsY + 12);
      totalsY += 26;
    }
    if (taxRate && taxRate > 0) {
      ctx.fillText(`TVA (${taxRate.toFixed(0)}%): ${tax.toFixed(2)} F CFA`, totalsBoxX + totalsBoxW - 14, totalsY + 12);
      totalsY += 26;
    }

    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = '#0f172a';
    ctx.fillText(`Total facture: ${total.toFixed(2)} F CFA`, totalsBoxX + totalsBoxW - 14, totalsY + 14);
    totalsY += 36;
    ctx.font = '14px Arial';
    ctx.fillStyle = '#111827';
    ctx.fillText(`Payé: ${paid.toFixed(2)} F CFA`, totalsBoxX + totalsBoxW - 14, totalsY + 12);
    totalsY += 26;
    ctx.font = 'bold 16px Arial';
    ctx.fillStyle = amountDue === 0 ? '#059669' : '#b91c1c';
    ctx.fillText(`${amountDue === 0 ? 'PAYÉ' : `Montant dû: ${amountDue.toFixed(2)} F CFA`}`, totalsBoxX + totalsBoxW - 14, totalsY + 14);

    // Payment status badge
    const badgeX = totalsBoxX + 10;
    const badgeY = tableY - 10;
    ctx.font = 'bold 12px Arial';
    if (amountDue === 0) {
      ctx.fillStyle = '#d1fae5';
      ctx.fillRect(badgeX, badgeY, 120, 28);
      ctx.fillStyle = '#065f46';
      ctx.textAlign = 'center';
      ctx.fillText('PAYÉ', badgeX + 60, badgeY + 20);
    } else {
      ctx.fillStyle = '#fee2e2';
      ctx.fillRect(badgeX, badgeY, 160, 28);
      ctx.fillStyle = '#991b1b';
      ctx.textAlign = 'center';
      ctx.fillText('MONTANT DÛ', badgeX + 80, badgeY + 20);
    }

    // Footer
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.textAlign = 'center';
    const footerText = company && company.nom ? `${company.nom}${company.email ? ' • ' + company.email : ''}${company.telephone ? ' • ' + company.telephone : ''}` : 'RealTech Holding - Boutique Informatique';
    ctx.fillText(footerText, canvas.width / 2, canvas.height - 60);
    ctx.fillText('Merci de votre confiance !', canvas.width / 2, canvas.height - 40);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(filePath, buffer);

    logger.info(`Invoice PNG generated: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('Error generating invoice PNG:', error);
    throw error;
  }
};

export const generateReceiptPNG = async (receiptData) => {
  try {
    const folderPath = await createReceiptFolder(receiptData.numero);
    const fileName = `recu-${receiptData.numero}.png`;
    const filePath = path.join(folderPath, fileName);

    const canvas = createCanvas(600, 400);
    const ctx = canvas.getContext('2d');

    // Background
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, 600, 400);

    // Header
    ctx.fillStyle = '#10b981';
    ctx.fillRect(0, 0, 600, 80);

    // Try to draw logo
    let logoPath = null;
    try {
      const logoPathPng = path.join(config.UPLOAD_PATH, 'logo.png');
      const logoPathJpg = path.join(config.UPLOAD_PATH, 'logo.jpg');
      try {
        await fs.access(logoPathPng);
        logoPath = logoPathPng;
      } catch (e) {
        try {
          await fs.access(logoPathJpg);
          logoPath = logoPathJpg;
        } catch (e) {
          logoPath = null;
        }
      }
    } catch (e) {
      logoPath = null;
    }

    if (logoPath) {
      try {
        const img = await loadImage(logoPath);
        const h = 50;
        const ratio = img.width / img.height;
        const w = ratio * h;
        ctx.drawImage(img, 20, 15, w, h);
      } catch (e) {
        logger.warn('Unable to load logo for receipt:', e);
      }
    } else {
      ctx.fillStyle = '#ffffff';
      ctx.font = 'bold 24px Arial';
      ctx.textAlign = 'center';
      ctx.fillText('RealTech Holding', 300, 50);
    }

    // Receipt title
    ctx.fillStyle = '#000000';
    ctx.font = 'bold 24px Arial';
    ctx.textAlign = 'center';
    ctx.fillText('REÇU DE PAIEMENT', 300, 120);

    // Receipt details
    ctx.font = '16px Arial';
    ctx.fillText(`Numéro: ${receiptData.numero}`, 300, 150);
    ctx.fillText(`Date: ${new Date(receiptData.date).toLocaleDateString('fr-FR')}`, 300, 170);

    // Amount
    ctx.fillStyle = '#10b981';
    ctx.fillRect(150, 200, 300, 60);
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 28px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`${(receiptData.montant || 0).toFixed(2)} F CFA`, 300, 240);

    // Order info
    ctx.fillStyle = '#000000';
    ctx.font = '14px Arial';
    ctx.textAlign = 'center';
    ctx.fillText(`Commande: ${receiptData.commande ? receiptData.commande.numero : ''}`, 300, 280);
    if (receiptData.commande && receiptData.commande.client) {
      ctx.fillText(
        `Client: ${receiptData.commande.client.prenom || ''} ${receiptData.commande.client.nom || ''}`,
        300,
        300
      );
    }

    // Footer
    ctx.fillStyle = '#6b7280';
    ctx.font = '12px Arial';
    ctx.fillText('Merci de votre paiement !', 300, 350);

    // Save to file
    const buffer = canvas.toBuffer('image/png');
    await fs.writeFile(filePath, buffer);

    logger.info(`Receipt PNG generated: ${filePath}`);
    return filePath;
  } catch (error) {
    logger.error('Error generating receipt PNG:', error);
    throw error;
  }
};

// Convert a generated PNG file to a one-page PDF and return the PDF path
export const pngToPdf = async (pngPath, outPdfPath) => {
  try {
    const pngBytes = await fs.readFile(pngPath);
    const pdfDoc = await PDFDocument.create();
    const pngImage = await pdfDoc.embedPng(pngBytes);
    const pngDims = pngImage.scale(1);

    const page = pdfDoc.addPage([pngDims.width, pngDims.height]);
    page.drawImage(pngImage, {
      x: 0,
      y: 0,
      width: pngDims.width,
      height: pngDims.height,
    });

    const pdfBytes = await pdfDoc.save();
    await fs.writeFile(outPdfPath, pdfBytes);
    return outPdfPath;
  } catch (err) {
    logger.error('pngToPdf error', err);
    throw err;
  }
};

export const generateInvoicePDF = async (invoiceData) => {
  // create PNG first
  const pngPath = await generateInvoicePNG(invoiceData);
  const pdfPath = pngPath.replace(/\.png$/i, '.pdf');
  await pngToPdf(pngPath, pdfPath);
  return { pngPath, pdfPath };
};

export const generateReceiptPDF = async (receiptData) => {
  const pngPath = await generateReceiptPNG(receiptData);
  const pdfPath = pngPath.replace(/\.png$/i, '.pdf');
  await pngToPdf(pngPath, pdfPath);
  return { pngPath, pdfPath };
};