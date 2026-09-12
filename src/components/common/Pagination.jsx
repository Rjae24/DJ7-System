import React from 'react';
import { HiOutlineChevronLeft, HiOutlineChevronRight } from 'react-icons/hi2';

export default function Pagination({
  currentPage = 1,
  totalItems = 0,
  pageSize = 20,
  onPageChange,
}) {
  const totalPages = Math.ceil(totalItems / pageSize);

  if (totalItems <= pageSize || totalPages <= 1) {
    return null;
  }

  const startItem = (currentPage - 1) * pageSize + 1;
  const endItem = Math.min(currentPage * pageSize, totalItems);

  // Generate page numbers with ellipses
  const getPageNumbers = () => {
    const pages = [];
    const maxVisible = 5;

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i);
    } else {
      pages.push(1);
      if (currentPage > 3) pages.push('...');
      
      const start = Math.max(2, currentPage - 1);
      const end = Math.min(totalPages - 1, currentPage + 1);
      
      for (let i = start; i <= end; i++) {
        if (!pages.includes(i)) pages.push(i);
      }

      if (currentPage < totalPages - 2) pages.push('...');
      if (!pages.includes(totalPages)) pages.push(totalPages);
    }
    return pages;
  };

  return (
    <div className="pagination-bar no-print">
      <div className="pagination-bar__info">
        Mostrando <span>{startItem}</span> - <span>{endItem}</span> de <span>{totalItems}</span> registros
      </div>

      <div className="pagination-bar__controls">
        <button
          type="button"
          className="btn btn--ghost btn--xs"
          onClick={() => onPageChange(currentPage - 1)}
          disabled={currentPage === 1}
          title="Página anterior"
        >
          <HiOutlineChevronLeft /> Anterior
        </button>

        <div className="pagination-bar__pages">
          {getPageNumbers().map((page, index) => (
            page === '...' ? (
              <span key={`ellipsis-${index}`} className="pagination-bar__ellipsis">...</span>
            ) : (
              <button
                key={page}
                type="button"
                className={`pagination-bar__page-btn ${currentPage === page ? 'pagination-bar__page-btn--active' : ''}`}
                onClick={() => onPageChange(page)}
              >
                {page}
              </button>
            )
          ))}
        </div>

        <button
          type="button"
          className="btn btn--ghost btn--xs"
          onClick={() => onPageChange(currentPage + 1)}
          disabled={currentPage === totalPages}
          title="Página siguiente"
        >
          Siguiente <HiOutlineChevronRight />
        </button>
      </div>
    </div>
  );
}
