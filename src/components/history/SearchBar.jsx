import React from 'react';

const SearchBar = ({ searchQuery, onSearchChange, activeFilter, onFilterChange }) => {
  const filters = [
    { id: 'all', label: 'All' },
    { id: 'ergo', label: 'エルゴ' },
    { id: 'strength', label: '筋トレ' },
    { id: 'nutrition', label: '食事' }
  ];

  return (
    <div className="search-bar" style={{ marginBottom: '1.5rem', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      <input
        type="text"
        placeholder="メモや種目を検索..."
        value={searchQuery}
        onChange={(e) => onSearchChange(e.target.value)}
        style={{
          width: '100%',
          padding: '0.8rem 1rem',
          backgroundColor: 'var(--color-surface-700)',
          border: '1px solid var(--color-surface-600)',
          borderRadius: '8px',
          color: 'var(--color-text-primary)',
          outline: 'none',
          boxSizing: 'border-box'
        }}
      />
      <div style={{ display: 'flex', gap: '0.5rem', overflowX: 'auto', paddingBottom: '4px' }}>
        {filters.map(filter => (
          <button
            key={filter.id}
            onClick={() => onFilterChange(filter.id)}
            style={{
              padding: '0.4rem 1rem',
              borderRadius: '20px',
              border: 'none',
              cursor: 'pointer',
              whiteSpace: 'nowrap',
              backgroundColor: activeFilter === filter.id ? 'var(--color-surface-600)' : 'var(--color-surface-700)',
              color: activeFilter === filter.id ? 'var(--color-text-primary)' : 'var(--color-text-muted)',
              fontWeight: activeFilter === filter.id ? 'bold' : 'normal'
            }}
          >
            {filter.label}
          </button>
        ))}
      </div>
    </div>
  );
};

export default SearchBar;
