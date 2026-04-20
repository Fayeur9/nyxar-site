import { useState, useMemo, useEffect } from 'react'

export default function AdminTable({
    data,
    loading,
    loadingMessage = 'Chargement...',
    emptyMessage = 'Aucun element',
    emptySearchMessage = 'Aucun element ne correspond a votre recherche.',
    searchQuery = '',
    renderRow,
    headers,
    onEmptyAction,
    emptyActionLabel = 'Ajouter',
    itemsPerPage = 0
}) {
    const [currentPage, setCurrentPage] = useState(1)

    // Reset page quand les données ou la recherche changent
    useEffect(() => {
        setCurrentPage(1)
    }, [data.length, searchQuery])

    const paginated = itemsPerPage > 0
    const totalPages = paginated ? Math.ceil(data.length / itemsPerPage) : 1

    const displayedData = useMemo(() => {
        if (!paginated) return data
        const start = (currentPage - 1) * itemsPerPage
        return data.slice(start, start + itemsPerPage)
    }, [data, currentPage, itemsPerPage, paginated])

    if (loading) {
        return <div className="c-admin-state loading">{loadingMessage}</div>
    }

    if (data.length === 0) {
        return (
            <div className="c-admin-state c-admin-state--empty">
                <p>{searchQuery ? emptySearchMessage : emptyMessage}</p>
                {!searchQuery && onEmptyAction && (
                    <button
                        className="c-admin-button c-admin-button--primary"
                        onClick={onEmptyAction}
                    >
                        {emptyActionLabel}
                    </button>
                )}
            </div>
        )
    }

    return (
        <>
            <div className="l-admin-table">
                <table className="c-admin-table">
                    <thead>
                        <tr>
                            {headers.map((header, index) => (
                                <th
                                    key={index}
                                    style={header.width ? { width: header.width } : undefined}
                                    className={header.className}
                                >
                                    {header.label}
                                </th>
                            ))}
                        </tr>
                    </thead>
                    <tbody>
                        {displayedData.map((item, index) => renderRow(item, index))}
                    </tbody>
                </table>
            </div>

            {paginated && totalPages > 1 && (
                <div className="c-pagination">
                    <button
                        className="c-pagination__btn"
                        onClick={() => setCurrentPage(p => p - 1)}
                        disabled={currentPage === 1}
                    >
                        &larr; Précédent
                    </button>
                    <div className="c-pagination__pages">
                        {Array.from({ length: totalPages }, (_, i) => i + 1).map(page => (
                            <button
                                key={page}
                                className={`c-pagination__page${page === currentPage ? ' c-pagination__page--active' : ''}`}
                                onClick={() => setCurrentPage(page)}
                            >
                                {page}
                            </button>
                        ))}
                    </div>
                    <button
                        className="c-pagination__btn"
                        onClick={() => setCurrentPage(p => p + 1)}
                        disabled={currentPage === totalPages}
                    >
                        Suivant &rarr;
                    </button>
                </div>
            )}
        </>
    )
}
