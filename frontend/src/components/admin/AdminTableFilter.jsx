export default function AdminTableFilter({
    searchQuery,
    onSearchChange,
    filteredCount,
    totalCount,
    placeholder = 'Rechercher...',
    id = 'search',
    label = 'Rechercher',
    entityName = 'elements'
}) {
    return (
        <div className="c-admin-filters">
            <div className="f-field c-admin-filters__search">
                <label htmlFor={id}>{label}</label>
                <input
                    id={id}
                    type="text"
                    placeholder={placeholder}
                    value={searchQuery}
                    onChange={(e) => onSearchChange(e.target.value)}
                />
            </div>
            <div className="c-admin-filters__meta">
                {filteredCount} / {totalCount} {entityName}
            </div>
        </div>
    )
}
