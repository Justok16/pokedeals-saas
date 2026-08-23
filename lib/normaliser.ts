// Port fidele de scraper/filtre_annonces.normaliser() (Python) -- doit
// rester en phase avec cette version : c'est cette normalisation qui sert
// de cle pour retrouver la cote marche d'une carte (table market_cotes).
export function normaliser(texte: string): string {
  return (texte ?? "")
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "") // supprime les accents (marques combinantes NFD)
    .replace(/[-_.]/g, " ");
}
