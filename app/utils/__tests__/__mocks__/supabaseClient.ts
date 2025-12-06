/**
 * Mock del cliente Supabase para tests
 * 
 * Simula todas las operaciones de Supabase permitiendo configurar
 * respuestas específicas para cada test
 */

export interface MockSupabaseResponse<T = any> {
  data: T | null;
  error: any | null;
}

export class MockSupabaseClient {
  private responses: Map<string, any> = new Map();
  private callLog: Array<{ method: string; args: any[] }> = [];

  setResponse(table: string, response: any): void {
    this.responses.set(table, response);
  }

  getResponse(table: string): any {
    return this.responses.get(table) || { data: null, error: null };
  }

  clearResponses(): void {
    this.responses.clear();
    this.callLog = [];
  }

  getCallLog(): Array<{ method: string; args: any[] }> {
    return this.callLog;
  }

  from(table: string): any {
    this.callLog.push({ method: 'from', args: [table] });
    
    const response = this.getResponse(table);
    const baseData = Array.isArray(response.data) ? [...response.data] : (response.data ? [response.data] : []);
    const error = response.error || null;
    const filters: Array<{ type: string; column: string; value: any }> = [];
    let orderBy: { column: string; ascending: boolean } | null = null;
    let limitCount: number | null = null;

    // Helper para aplicar filtros
    const applyFilters = (data: any[]): any[] => {
      let result = [...data];
      for (const filter of filters) {
        if (filter.type === 'eq') {
          result = result.filter((item: any) => item[filter.column] === filter.value);
        } else if (filter.type === 'in') {
          result = result.filter((item: any) => filter.value.includes(item[filter.column]));
        } else if (filter.type === 'lt') {
          result = result.filter((item: any) => {
            const itemVal = new Date(item[filter.column]).getTime();
            const compareVal = new Date(filter.value).getTime();
            return itemVal < compareVal;
          });
        } else if (filter.type === 'lte') {
          result = result.filter((item: any) => {
            const itemVal = new Date(item[filter.column]).getTime();
            const compareVal = new Date(filter.value).getTime();
            return itemVal <= compareVal;
          });
        } else if (filter.type === 'gte') {
          result = result.filter((item: any) => {
            const itemVal = new Date(item[filter.column]).getTime();
            const compareVal = new Date(filter.value).getTime();
            return itemVal >= compareVal;
          });
        } else if (filter.type === 'gt') {
          result = result.filter((item: any) => {
            const itemVal = new Date(item[filter.column]).getTime();
            const compareVal = new Date(filter.value).getTime();
            return itemVal > compareVal;
          });
        } else if (filter.type === 'not') {
          result = result.filter((item: any) => item[filter.column] !== null);
        }
      }
      return result;
    };

    // Función para ejecutar la query y obtener los datos finales
    const executeQuery = (): { data: any; error: any } => {
      // 1. Aplicar filtros
      let result = applyFilters(baseData);
      
      // 2. Aplicar ordenamiento
      if (orderBy) {
        const { column, ascending } = orderBy;
        result.sort((a: any, b: any) => {
          const aVal = a[column];
          const bVal = b[column];
          if (ascending) {
            return aVal > bVal ? 1 : aVal < bVal ? -1 : 0;
          } else {
            return aVal < bVal ? 1 : aVal > bVal ? -1 : 0;
          }
        });
      }
      
      // 3. Aplicar límite
      if (limitCount !== null) {
        result = result.slice(0, limitCount);
      }
      
      return { data: result, error };
    };

    // Crear Promise que se resuelve con los datos
    const createPromise = (): Promise<{ data: any; error: any }> => {
      return Promise.resolve(executeQuery());
    };

    const query: any = {};

    query.select = (columns?: string) => {
      this.callLog.push({ method: 'select', args: [columns] });
      return query;
    };

    query.eq = (column: string, value: any) => {
      this.callLog.push({ method: 'eq', args: [column, value] });
      filters.push({ type: 'eq', column, value });
      return query;
    };

    query.in = (column: string, values: any[]) => {
      this.callLog.push({ method: 'in', args: [column, values] });
      filters.push({ type: 'in', column, value: values });
      return query;
    };

    query.lt = (column: string, value: any) => {
      this.callLog.push({ method: 'lt', args: [column, value] });
      filters.push({ type: 'lt', column, value });
      return query;
    };

    query.lte = (column: string, value: any) => {
      this.callLog.push({ method: 'lte', args: [column, value] });
      filters.push({ type: 'lte', column, value });
      return query;
    };

    query.gte = (column: string, value: any) => {
      this.callLog.push({ method: 'gte', args: [column, value] });
      filters.push({ type: 'gte', column, value });
      return query;
    };

    query.gt = (column: string, value: any) => {
      this.callLog.push({ method: 'gt', args: [column, value] });
      filters.push({ type: 'gt', column, value });
      return query;
    };

    query.not = (column: string, operator: string, value: any) => {
      this.callLog.push({ method: 'not', args: [column, operator, value] });
      filters.push({ type: 'not', column, value });
      return query;
    };

    query.order = (column: string, options?: { ascending: boolean }) => {
      this.callLog.push({ method: 'order', args: [column, options] });
      orderBy = { column, ascending: options?.ascending !== false };
      return query;
    };

    query.limit = (count: number) => {
      this.callLog.push({ method: 'limit', args: [count] });
      limitCount = count;
      return query;
    };

    query.single = async () => {
      this.callLog.push({ method: 'single', args: [] });
      const result = executeQuery();
      if (result.error) {
        return { data: null, error: result.error };
      }
      if (Array.isArray(result.data)) {
        if (result.data.length === 1) {
          return { data: result.data[0], error: null };
        }
        if (result.data.length === 0) {
          return { data: null, error: { message: 'No rows returned', code: 'PGRST116' } };
        }
        return { data: result.data[0], error: null };
      }
      return { data: result.data, error: null };
    };

    query.maybeSingle = async () => {
      this.callLog.push({ method: 'maybeSingle', args: [] });
      const result = executeQuery();
      if (result.error) {
        return { data: null, error: result.error };
      }
      if (Array.isArray(result.data)) {
        if (result.data.length === 0) {
          return { data: null, error: null };
        }
        if (result.data.length === 1) {
          return { data: result.data[0], error: null };
        }
        return { data: result.data[0], error: null };
      }
      return { data: result.data, error: null };
    };
    
    // Asegurar que maybeSingle esté disponible en el objeto query
    // (ya está definido arriba, pero lo dejamos explícito)

    query.insert = (values: any) => {
      this.callLog.push({ method: 'insert', args: [values] });
      const inserted = Array.isArray(values) ? values : [values];
      const insertedWithId = inserted.map((v: any, idx: number) => ({
        ...v,
        id: v.id || Math.floor(Math.random() * 1000000) + idx,
      }));

      const insertQuery: any = {
        select: (columns?: string) => {
          this.callLog.push({ method: 'insert.select', args: [columns] });
          // Retornar insertQuery para permitir encadenar .single()
          return insertQuery;
        },
        single: async () => {
          this.callLog.push({ method: 'insert.single', args: [] });
          if (error) {
            return { data: null, error };
          }
          return { data: insertedWithId[0], error: null };
        },
      };
      
      // Hacer insertQuery thenable (por si se usa directamente con await)
      const insertPromise = Promise.resolve({ data: insertedWithId, error: null });
      insertQuery.then = insertPromise.then.bind(insertPromise);
      insertQuery.catch = insertPromise.catch.bind(insertPromise);
      if (typeof Promise.prototype.finally === 'function') {
        insertQuery.finally = insertPromise.finally.bind(insertPromise);
      }
      
      return insertQuery;
    };

    query.update = (values: any) => {
      this.callLog.push({ method: 'update', args: [values] });
      
      const updateQuery: any = {
        eq: (column: string, value: any) => {
          this.callLog.push({ method: 'update.eq', args: [column, value] });
          let result = applyFilters(baseData);
          result = result.map((item: any) =>
            item[column] === value ? { ...item, ...values } : item
          );
          
          const updatePromise = Promise.resolve({ data: null, error: null });
          updateQuery.then = updatePromise.then.bind(updatePromise);
          updateQuery.catch = updatePromise.catch.bind(updatePromise);
          return updateQuery;
        },
        in: (column: string, valuesList: any[]) => {
          this.callLog.push({ method: 'update.in', args: [column, valuesList] });
          let result = applyFilters(baseData);
          result = result.map((item: any) =>
            valuesList.includes(item[column]) ? { ...item, ...values } : item
          );
          
          const updatePromise = Promise.resolve({ data: null, error: null });
          updateQuery.then = updatePromise.then.bind(updatePromise);
          updateQuery.catch = updatePromise.catch.bind(updatePromise);
          return updateQuery;
        },
        select: (columns?: string) => updateQuery,
      };
      
      return updateQuery;
    };

    query.delete = () => {
      this.callLog.push({ method: 'delete', args: [] });
      
      const deleteFilters: Array<{ type: string; column: string; value: any }> = [];
      
      const deleteQuery: any = {
        eq: (column: string, value: any) => {
          this.callLog.push({ method: 'delete.eq', args: [column, value] });
          deleteFilters.push({ type: 'eq', column, value });
          
          // Aplicar filtro y eliminar
          let result = applyFilters(baseData);
          result = result.filter((item: any) => item[column] !== value);
          
          // Hacer que el resultado sea thenable
          const deletePromise = Promise.resolve({ data: null, error: null });
          
          // Crear nuevo objeto con los métodos thenable
          const deleteResult: any = {};
          deleteResult.then = deletePromise.then.bind(deletePromise);
          deleteResult.catch = deletePromise.catch.bind(deletePromise);
          if (typeof Promise.prototype.finally === 'function') {
            deleteResult.finally = deletePromise.finally.bind(deletePromise);
          }
          
          return deleteResult;
        },
      };
      
      // Hacer deleteQuery thenable también (por si se usa directamente con await)
      const deletePromise = Promise.resolve({ data: null, error: null });
      deleteQuery.then = deletePromise.then.bind(deletePromise);
      deleteQuery.catch = deletePromise.catch.bind(deletePromise);
      
      return deleteQuery;
    };

    // Hacer query thenable para que funcione con await
    // Cuando se hace await sobre query, JavaScript busca el método .then()
    const queryPromise = createPromise();
    query.then = queryPromise.then.bind(queryPromise);
    query.catch = queryPromise.catch.bind(queryPromise);
    if (typeof Promise.prototype.finally === 'function') {
      query.finally = queryPromise.finally.bind(queryPromise);
    }

    return query;
  }
}

export function createMockSupabaseClient(): MockSupabaseClient {
  return new MockSupabaseClient();
}

export default createMockSupabaseClient;
