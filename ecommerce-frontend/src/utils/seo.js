import { useEffect } from "react";

/**
 * Custom hook to dynamically update document title and meta description.
 * @param {string} title - Page title
 * @param {string} description - Meta description for SEO
 */
export function useDocumentTitle(title, description = "") {
  useEffect(() => {
    // Set Document Title
    const suffix = "MarketAI E-Commerce";
    document.title = title ? `${title} | ${suffix}` : suffix;

    // Set Document Meta Description
    if (description) {
      let meta = document.querySelector('meta[name="description"]');
      if (!meta) {
        meta = document.createElement("meta");
        meta.name = "description";
        document.head.appendChild(meta);
      }
      meta.content = description;
    }
  }, [title, description]);
}
