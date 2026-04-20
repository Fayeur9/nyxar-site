export default function AdminModal({
    isOpen,
    onClose,
    title,
    size = 'md',
    children,
    footer,
    scrollBody = false,
    error,
    onClearError
}) {
    if (!isOpen) return null

    const sizeClass = size !== 'md' ? ` c-modal-panel--${size}` : ''
    const bodyClass = `c-modal-panel__body${scrollBody ? ' c-modal-panel__body--scroll' : ''}`

    return (
        <div className="c-modal-overlay" onClick={onClose}>
            <div className={`c-modal-panel${sizeClass}`} onClick={(e) => e.stopPropagation()}>
                <div className="c-modal-panel__header">
                    <div className="c-modal-panel__header-content">
                        <h2 className="c-modal-panel__title">{title}</h2>
                    </div>
                    <button type="button" className="c-modal-panel__close" onClick={onClose}>
                        ✕
                    </button>
                </div>

                <div className={bodyClass}>
                    {error && (
                        <div
                            className="c-admin-alert c-admin-alert--error"
                            onClick={onClearError}
                            style={{ marginBottom: 'var(--spacing-md)' }}
                        >
                            {error}
                        </div>
                    )}
                    {children}
                </div>

                {footer && (
                    <div className="c-modal-panel__footer">
                        {footer}
                    </div>
                )}
            </div>
        </div>
    )
}
