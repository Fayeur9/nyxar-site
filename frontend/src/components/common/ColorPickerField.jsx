export default function ColorPickerField({
    id,
    label,
    value,
    onChange,
    disabled = false,
    defaultColor = '#667eea',
    inline = false
}) {
    const safeValue = value || defaultColor

    return (
        <div className="f-field">
            {label && <label htmlFor={id}>{label}</label>}
            <div className={`c-form-color-picker${inline ? ' c-form-color-picker--inline' : ''}`}>
                <input
                    id={id}
                    type="color"
                    className="c-form-color-picker__input"
                    value={safeValue}
                    onChange={onChange}
                    disabled={disabled}
                />
                <span className="c-form-color-picker__value">{safeValue}</span>
            </div>
        </div>
    )
}
