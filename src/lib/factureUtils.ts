// Génère le numéro de facture au format JJ-MM-AAAA-Numéro
// Le numéro repart à zéro chaque nouvelle année
export function generateFactureNumber(date: Date, lastNumber: number) {
  const day = String(date.getDate()).padStart(2, '0');
  const month = String(date.getMonth() + 1).padStart(2, '0');
  const year = date.getFullYear();
  const num = String(lastNumber + 1).padStart(4, '0');
  return `${day}-${month}-${year}-${num}`;
}

// Pour la gestion du numéro, il faut stocker le dernier numéro utilisé pour l'année courante
// Exemple d'utilisation :
// const numero = generateFactureNumber(new Date(), lastFactureNumberForYear);
