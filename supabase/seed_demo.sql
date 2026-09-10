-- ============================================================
-- Creative Solution — seed_demo.sql
--
-- DATI DI ESEMPIO — da eliminare in produzione; le immagini
-- reali si caricano dal pannello admin.
--
-- Questo file inserisce alcuni progetti dimostrativi (is_published = true)
-- così la galleria pubblica mostra la griglia, i filtri e il lightbox in
-- fase di sviluppo e demo. Ogni titolo porta il suffisso " (Esempio)" e
-- ogni descrizione dichiara esplicitamente di essere un segnaposto:
-- NESSUN contenuto reale è inventato qui.
--
-- Le gallery_images puntano a storage_path inesistenti ("esempi/..."):
-- la UI mostra quindi l'placeholder onesto "Immagine in attesa"
-- (fallback del componente ProjectImage), senza mai caricare
-- immagini casuali da fonti esterne.
--
-- Applicazione: SQL editor della dashboard Supabase oppure
-- `supabase db reset` / `supabase db push` con la CLI.
-- Rimozione: DELETE FROM gallery_images; DELETE FROM gallery_projects;
-- (oppure non applicare mai questo file in produzione).
--
-- Idempotente: UUID fissi + ON CONFLICT DO NOTHING.
-- ============================================================

-- ------------------------------------------------------------
-- Progetti demo
-- ------------------------------------------------------------
insert into public.gallery_projects (id, title, slug, description, service_type, material, sort_order, is_published)
values
  (
    'a0000000-0000-4000-8000-000000000001',
    'Vaso decorativo (Esempio)',
    'vaso-decorativo-esempio',
    'Progetto dimostrativo: questo testo è un segnaposto di esempio per mostrare come appare una scheda progetto nella galleria. Da sostituire con la descrizione reale del progetto.',
    'fdm_print',
    'PLA',
    1,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000002',
    'Statuetta in resina (Esempio)',
    'statuetta-resina-esempio',
    'Progetto dimostrativo: segnaposto di esempio che illustra una voce della categoria "Stampa in resina". Le foto e la descrizione reali verranno inserite dal pannello admin.',
    'resin_print',
    'Resina',
    2,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000003',
    'Supporto per smartphone (Esempio)',
    'supporto-smartphone-esempio',
    'Progetto dimostrativo: segnaposto di esempio per la categoria "Pezzi personalizzati". Nessun dato reale: descrizione e immagini vanno caricate dall''admin.',
    'custom_parts',
    'PETG',
    3,
    true
  ),
  (
    'a0000000-0000-4000-8000-000000000004',
    'Prototipo meccanico (Esempio)',
    'prototipo-meccanico-esempio',
    'Progetto dimostrativo: segnaposto di esempio per la categoria "Prototipi". Da sostituire con contenuti reali prima della messa in produzione.',
    'prototypes',
    'ABS',
    4,
    true
  )
on conflict (id) do nothing;

-- ------------------------------------------------------------
-- Immagini demo (storage_path inesistenti: la UI mostra
-- "Immagine in attesa" finché non vengono caricate foto reali)
-- ------------------------------------------------------------
insert into public.gallery_images (id, project_id, storage_path, alt_text, sort_order, is_published)
values
  ('b0000000-0000-4000-8000-000000000001', 'a0000000-0000-4000-8000-000000000001', 'esempi/vaso-decorativo-1.jpg', 'Foto di esempio (inesistente) — progetto vaso decorativo', 1, true),
  ('b0000000-0000-4000-8000-000000000002', 'a0000000-0000-4000-8000-000000000001', 'esempi/vaso-decorativo-2.jpg', 'Foto di esempio (inesistente) — dettaglio vaso', 2, true),
  ('b0000000-0000-4000-8000-000000000003', 'a0000000-0000-4000-8000-000000000002', 'esempi/statuetta-resina-1.jpg', 'Foto di esempio (inesistente) — statuetta in resina', 1, true),
  ('b0000000-0000-4000-8000-000000000004', 'a0000000-0000-4000-8000-000000000003', 'esempi/supporto-smartphone-1.jpg', 'Foto di esempio (inesistente) — supporto smartphone', 1, true),
  ('b0000000-0000-4000-8000-000000000005', 'a0000000-0000-4000-8000-000000000004', 'esempi/prototipo-meccanico-1.jpg', 'Foto di esempio (inesistente) — prototipo meccanico', 1, true)
on conflict (id) do nothing;