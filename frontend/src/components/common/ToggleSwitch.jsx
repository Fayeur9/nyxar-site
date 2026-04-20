export default function ToggleSwitch({
    checked,
    onChange,
    disabled = false,
    labelActive = 'Actif',
    labelInactive = 'Inactif'
}) {
    return (
        <div className="c-toggle-cell">
            <label className="c-toggle-switch">
                <input
                    type="checkbox"
                    checked={checked}
                    onChange={onChange}
                    disabled={disabled}
                />
                <span className="c-toggle-switch__slider"></span>
            </label>
            <span className={`c-toggle-text ${checked ? 'c-toggle-text--active' : 'c-toggle-text--inactive'}`}>
                {checked ? labelActive : labelInactive}
            </span>
        </div>
    )
}
