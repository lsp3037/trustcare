export const DEFAULT_EQUIPMENT_CATEGORIES = [
  'Notebook',
  'Computador',
  'Servidor',
  'Monitor',
  'Impressora',
  'All-in-One',
  'Smartphone / Celular',
  'Tablet',
  'Nobreak / UPS',
  'Outro',
] as const;

export interface EquipmentCategoryItem {
  id: string;
  name: string;
}

/**
 * Busca as categorias da empresa e, caso ainda não existam no banco,
 * pré-cadastra (auto-seed) as categorias padrão para que fiquem salvas
 * definitivamente e vinculadas ao tenant.
 */
export async function fetchOrSeedEquipmentCategories(
  supabase: any,
  companyId?: string | null
): Promise<EquipmentCategoryItem[]> {
  try {
    if (!supabase?.from) return [];

    const query = supabase
      .from('equipment_categories')
      .select('id, name');

    const { data: existing, error } = typeof query?.order === 'function'
      ? await query.order('name')
      : await query;

    if (error) throw error;

    if (existing && existing.length > 0) {
      return existing;
    }

    // Se estiver vazio e tivermos o companyId autenticado, realiza o seed das opções padrão
    if (companyId) {
      const fromEq = supabase.from('equipment_categories');
      if (typeof fromEq?.insert === 'function') {
        const payload = DEFAULT_EQUIPMENT_CATEGORIES.map((name) => ({
          company_id: companyId,
          name,
        }));

        const insertQuery = fromEq.insert(payload);
        if (typeof insertQuery?.select === 'function') {
          const selectQuery = insertQuery.select('id, name');
          const { data: seeded, error: seedError } = typeof selectQuery?.order === 'function'
            ? await selectQuery.order('name')
            : await selectQuery;

          if (!seedError && seeded && seeded.length > 0) {
            return seeded;
          }
          if (seedError) {
            console.warn('Falha ao auto-semear categorias de equipamento:', seedError.message);
          }
        }
      }
    }

    return (existing || []).sort((a: EquipmentCategoryItem, b: EquipmentCategoryItem) =>
      a.name.localeCompare(b.name)
    );
  } catch (err) {
    console.warn('Erro ao carregar/semear categorias de equipamento:', err);
    return [];
  }
}
