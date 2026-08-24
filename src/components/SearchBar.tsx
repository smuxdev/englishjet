"use client";

import { useState } from "react";

export const SearchBar = () => {
  const [searchTerm, setSearchTerm] = useState("");

  return (
    <div className="mb-6 flex gap-2">
      <input
        type="text"
        placeholder="Buscar palabra o ejemplo..."
        value={searchTerm}
        onChange={(e) => setSearchTerm(e.target.value)}
        className="
          flex-1
          rounded-lg
          border
          border-input
          bg-background
          px-4
          py-2
          font-normal
          text-sm
          transition-colors
          focus:border-primary
          focus:ring-primary
          dark:bg-gray-700
          dark:text-gray-100
        "
        aria-label="Buscar palabras o ejemplos"
      />
      <div className="flex gap-2">
        <button
          onClick={() => {}}
          className="
            rounded-lg
            border
            border-input
            px-3
            py-1
            text-sm
            font-medium
            transition-colors
            duration-200
            bg-primary
            text-primary-foreground
          "
        >
          Todas
        </button>
        <button
          onClick={() => {}}
          className="
            rounded-lg
            border
            border-input
            px-3
            py-1
            text-sm
            font-medium
            transition-colors
            duration-200
          "
        >
          Aprendidas
        </button>
        <button
          onClick={() => {}}
          className="
            rounded-lg
            border
            border-input
            px-3
            py-1
            text-sm
            font-medium
            transition-colors
            duration-200
          "
        >
          Por aprender
        </button>
      </div>
    </div>
  );
};