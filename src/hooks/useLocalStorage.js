import { useCallback, useEffect, useState } from 'react';
import storage from '../services/storageService';

/**
 * Estado React sincronizado com o localStorage.
 * Também escuta alterações feitas em outras abas.
 *
 * const [valor, setValor, remover] = useLocalStorage('chave', valorInicial);
 */
export function useLocalStorage(key, initialValue) {
  const [value, setValue] = useState(() => storage.get(key, initialValue));

  const update = useCallback(
    (next) => {
      setValue((prev) => {
        const resolved = typeof next === 'function' ? next(prev) : next;
        try {
          storage.set(key, resolved);
        } catch (err) {
          console.error(err);
        }
        return resolved;
      });
    },
    [key]
  );

  const remove = useCallback(() => {
    storage.remove(key);
    setValue(initialValue);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  // Sincroniza entre abas do navegador
  useEffect(() => {
    const onStorage = (e) => {
      if (e.key === key) setValue(storage.get(key, initialValue));
    };
    window.addEventListener('storage', onStorage);
    return () => window.removeEventListener('storage', onStorage);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [key]);

  return [value, update, remove];
}

export default useLocalStorage;
