/**
 * FAQ items for /come-funziona.
 *
 * TODO(M2): make these configurable from the admin panel (e.g. a
 * `faq` JSON column in `site_settings` or a dedicated table). For now
 * they are a static, honest list: no invented prices, times or promises.
 */

export interface FaqItem {
  question: string;
  answer: string;
}

export const FAQ_ITEMS: FaqItem[] = [
  {
    question: "Che file posso inviare per un preventivo?",
    answer:
      "I formati più comuni per la stampa 3D sono STL, OBJ e 3MF. Se il tuo progetto è complesso o composto da più file, puoi inviarci un archivio ZIP: lo valutiamo e ti indichiamo noi come procedere.",
  },
  {
    question: "Non ho un file 3D. Posso comunque richiedere un preventivo?",
    answer:
      "Certo: puoi descriverci la tua idea nel form di preventivo e, se serve, ci occupiamo noi della progettazione e della modellazione 3D. Anche un semplice disegno o una foto possono essere un buon punto di partenza.",
  },
  {
    question: "Posso richiedere più copie dello stesso oggetto?",
    answer:
      "Sì, realizziamo anche piccole serie di pezzi identici. Le quantità, i tempi e le eventuali ottimizzazioni per la produzione vengono valutati insieme in fase di preventivo.",
  },
  {
    question: "Come ricevo il preventivo?",
    answer:
      "Dopo aver ricevuto la tua richiesta la analizziamo e ti mandiamo un preventivo personalizzato, scegliendo il canale di contatto che preferisci (email o WhatsApp) direttamente nel form.",
  },
  {
    question: "Come avviene la consegna?",
    answer:
      "Le modalità di consegna vengono concordate in fase di preventivo, in base al tipo di progetto e alla tua zona. Ti confermiamo tutto prima di iniziare la realizzazione.",
  },
  {
    question: "Quali materiali posso scegliere?",
    answer:
      "La lista dei materiali disponibili è configurabile dal pannello admin: al momento i materiali indicati sul sito sono PLA, PETG, ABS e resina. La disponibilità effettiva viene verificata in fase di preventivo.",
  },
];