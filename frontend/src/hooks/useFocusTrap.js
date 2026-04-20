import { useEffect, useRef } from 'react'

const FOCUSABLE_SELECTOR = 'a[href], button:not([disabled]), input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'

/**
 * Piège le focus dans un élément modal (Tab/Shift+Tab circulaire, Escape pour fermer).
 * @param {boolean} isOpen - Le modal est-il ouvert ?
 * @param {Function} onClose - Callback appelé quand Escape est pressé.
 * @returns {import('react').RefObject} ref à attacher au conteneur du modal.
 */
export default function useFocusTrap(isOpen, onClose) {
    const ref = useRef(null)
    const previousFocusRef = useRef(null)

    useEffect(() => {
        if (!isOpen) return

        // Sauvegarder l'élément qui avait le focus avant l'ouverture
        previousFocusRef.current = document.activeElement

        const container = ref.current
        if (!container) return

        // Focus initial sur le premier élément focusable (ou le conteneur)
        const focusFirst = () => {
            const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR)
            if (focusable.length > 0) {
                focusable[0].focus()
            } else {
                container.focus()
            }
        }

        // Petit délai pour laisser le DOM se stabiliser après l'animation
        const timer = requestAnimationFrame(focusFirst)

        const handleKeyDown = (e) => {
            if (e.key === 'Escape') {
                e.stopPropagation()
                onClose()
                return
            }

            if (e.key !== 'Tab') return

            const focusable = container.querySelectorAll(FOCUSABLE_SELECTOR)
            if (focusable.length === 0) return

            const first = focusable[0]
            const last = focusable[focusable.length - 1]

            if (e.shiftKey) {
                if (document.activeElement === first) {
                    e.preventDefault()
                    last.focus()
                }
            } else {
                if (document.activeElement === last) {
                    e.preventDefault()
                    first.focus()
                }
            }
        }

        container.addEventListener('keydown', handleKeyDown)

        return () => {
            cancelAnimationFrame(timer)
            container.removeEventListener('keydown', handleKeyDown)
            // Restaurer le focus à la fermeture
            if (previousFocusRef.current && typeof previousFocusRef.current.focus === 'function') {
                previousFocusRef.current.focus()
            }
        }
    }, [isOpen, onClose])

    return ref
}
