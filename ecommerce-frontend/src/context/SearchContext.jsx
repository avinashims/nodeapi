import { createContext, useContext, useState } from "react";

const SearchContext = createContext(null);

export function SearchProvider({ children }) {
  const [search, setSearch] = useState("");
  const [categoryId, setCategoryId] = useState("");

  return (
    <SearchContext.Provider value={{ search, setSearch, categoryId, setCategoryId }}>
      {children}
    </SearchContext.Provider>
  );
}

export function useSearch() {
  const ctx = useContext(SearchContext);
  if (!ctx) {
    throw new Error("useSearch must be used inside SearchProvider");
  }
  return ctx;
}
