"use client";

import { useState, useEffect, useCallback } from 'react';

// A custom hook that synchronizes state with localStorage and across tabs/windows.
function useLocalStorage<T>(key: string, initialValue: T): [T, (value: T | ((val: T) => T)) => void] {
  
  // This function is only executed on the initial render.
  const [storedValue, setStoredValue] = useState<T>(() => {
    // We can't access window on the server, so we return the initial value.
    if (typeof window === 'undefined') {
      return initialValue;
    }
    try {
      // Get the value from localStorage.
      const item = window.localStorage.getItem(key);
      // If a value exists, parse it. Otherwise, return the initial value.
      return item ? JSON.parse(item) : initialValue;
    } catch (error) {
      // If there's an error (e.g., parsing fails), log it and return the initial value.
      console.error(`Error reading localStorage key "${key}":`, error);
      return initialValue;
    }
  });

  // This function updates the state and localStorage.
  // useCallback ensures this function's identity is stable across re-renders.
  const setValue = useCallback((value: T | ((val: T) => T)) => {
    try {
      // Allow value to be a function so we have the same API as useState
      const valueToStore = value instanceof Function ? value(storedValue) : value;
      // Update the state.
      setStoredValue(valueToStore);
      // Update localStorage.
      if (typeof window !== 'undefined') {
        window.localStorage.setItem(key, JSON.stringify(valueToStore));
        // Dispatch a storage event to notify other tabs/windows.
        window.dispatchEvent(new StorageEvent('storage', { key }));
      }
    } catch (error) {
      console.error(`Error setting localStorage key "${key}":`, error);
    }
  }, [key, storedValue]);

  // This effect listens for changes in localStorage from other tabs/windows.
  useEffect(() => {
    if (typeof window === 'undefined') return;

    const handleStorageChange = (e: StorageEvent) => {
      // When the key changes in another tab, update the state here.
      if (e.key === key || (e.key === null && key === 'breaks')) { // e.key is null when localStorage.clear() is called
        try {
          const item = window.localStorage.getItem(key);
          setStoredValue(item ? JSON.parse(item) : initialValue);
        } catch (error) {
          console.error(`Error parsing stored value for key "${key}":`, error);
          setStoredValue(initialValue);
        }
      }
    };

    window.addEventListener('storage', handleStorageChange);
    
    // Cleanup the event listener when the component unmounts.
    return () => {
      window.removeEventListener('storage', handleStorageChange);
    };
  }, [key, initialValue]);


  return [storedValue, setValue];
}

export default useLocalStorage;
