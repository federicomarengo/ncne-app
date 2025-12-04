/**
 * Utilidades para gestionar la configuración del sistema
 * 
 * Funciones para leer y escribir en la tabla configuracion de Supabase
 */

import { Configuracion, ConfiguracionUpdate, CONFIGURACION_DEFAULTS } from '@/app/types/configuracion';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Obtiene la configuración del sistema desde la base de datos
 * Si no existe, crea un registro inicial con valores por defecto
 * @param supabase - Cliente de Supabase (debe ser pasado desde el componente)
 */
export async function obtenerConfiguracion(supabase: SupabaseClient): Promise<Configuracion> {
  // Intentar obtener la configuración existente
  const { data, error } = await supabase
    .from('configuracion')
    .select('*')
    .eq('id', 1)
    .single();

  // Si existe, retornarla
  if (data && !error) {
    return data as Configuracion;
  }

  // Si no existe, crear registro inicial con valores por defecto
  const configuracionInicial: Configuracion = {
    id: 1,
    ...CONFIGURACION_DEFAULTS,
    created_at: new Date().toISOString(),
    updated_at: new Date().toISOString(),
  };

  const { data: nuevaData, error: insertError } = await supabase
    .from('configuracion')
    .insert(configuracionInicial)
    .select()
    .single();

  if (insertError || !nuevaData) {
    // Si falla el insert, retornar valores por defecto en memoria
    console.error('Error al crear configuración inicial:', insertError);
    return configuracionInicial;
  }

  return nuevaData as Configuracion;
}

/**
 * Guarda los cambios en la configuración del sistema
 * @param config - Objeto de configuración a guardar
 * @param supabase - Cliente de Supabase (debe ser pasado desde el componente)
 */
export async function guardarConfiguracion(
  config: ConfiguracionUpdate,
  supabase: SupabaseClient
): Promise<{ success: boolean; error?: string }> {
  // Preparar datos para actualizar (agregar updated_at)
  const datosActualizacion = {
    ...config,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('configuracion')
    .update(datosActualizacion)
    .eq('id', 1);

  if (error) {
    console.error('Error al guardar configuración:', error);
    return {
      success: false,
      error: error.message || 'Error al guardar la configuración',
    };
  }

  return { success: true };
}

/**
 * Restaura los valores predeterminados de la configuración
 * Mantiene solo los valores numéricos y parámetros, borra datos del club y banco
 * @param supabase - Cliente de Supabase (debe ser pasado desde el componente)
 */
export async function restaurarValoresPredeterminados(supabase: SupabaseClient): Promise<{ success: boolean; error?: string }> {
  const valoresPredeterminados = {
    club_nombre: null,
    club_direccion: null,
    club_telefono1: null,
    club_telefono2: null,
    club_email1: null,
    club_email2: null,
    club_web: null,
    banco_cbu: null,
    banco_alias: null,
    banco_nombre: null,
    banco_titular: null,
    banco_tipo_cuenta: null,
    costo_visita: CONFIGURACION_DEFAULTS.costo_visita,
    cuota_social_base: CONFIGURACION_DEFAULTS.cuota_social_base,
    amarra_valor_por_pie: CONFIGURACION_DEFAULTS.amarra_valor_por_pie,
    guarderia_vela_ligera: CONFIGURACION_DEFAULTS.guarderia_vela_ligera,
    guarderia_windsurf: CONFIGURACION_DEFAULTS.guarderia_windsurf,
    guarderia_lancha: CONFIGURACION_DEFAULTS.guarderia_lancha,
    dia_vencimiento: CONFIGURACION_DEFAULTS.dia_vencimiento,
    dias_gracia: CONFIGURACION_DEFAULTS.dias_gracia,
    tasa_interes_mora: CONFIGURACION_DEFAULTS.tasa_interes_mora,
    generacion_automatica: CONFIGURACION_DEFAULTS.generacion_automatica,
    updated_at: new Date().toISOString(),
  };

  const { error } = await supabase
    .from('configuracion')
    .update(valoresPredeterminados)
    .eq('id', 1);

  if (error) {
    console.error('Error al restaurar valores predeterminados:', error);
    return {
      success: false,
      error: error.message || 'Error al restaurar los valores predeterminados',
    };
  }

  return { success: true };
}
