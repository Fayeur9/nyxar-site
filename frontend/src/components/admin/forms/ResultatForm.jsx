import ImageUploadField from '../../common/ImageUploadField'

export default function ResultatForm({ data, onChange, onImageUpload, uploading }) {
    const handleChange = (e) => {
        const { name, value } = e.target
        onChange({ ...data, [name]: value })
    }

    return (
        <div className="l-form-stack">
            <div className="f-field">
                <label htmlFor="title">Titre *</label>
                <input
                    id="title"
                    name="title"
                    type="text"
                    value={data.title || ''}
                    onChange={handleChange}
                    placeholder="Ex: LAN Trackmania Mars 2025"
                />
            </div>

            <div className="f-field">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    name="description"
                    rows={5}
                    value={data.description || ''}
                    onChange={handleChange}
                    placeholder="Description courte de l'événement..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="url_page">URL de la page (optionnel)</label>
                <input
                    id="url_page"
                    name="url_page"
                    type="text"
                    value={data.url_page || ''}
                    onChange={handleChange}
                    placeholder="lan-mars-2025"
                />
                <p className="c-form-help">Slug (ex: lan-mars-2025) ou URL complète pour générer un lien public.</p>
            </div>

            <div className="f-field">
                <label htmlFor="trackmania_exchange">Trackmania.exchange (URL)</label>
                <input
                    id="trackmania_exchange"
                    name="trackmania_exchange"
                    type="url"
                    value={data.trackmania_exchange || ''}
                    onChange={handleChange}
                    placeholder="https://trackmania.exchange/..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="trackmania_io">Trackmania.io (URL)</label>
                <input
                    id="trackmania_io"
                    name="trackmania_io"
                    type="url"
                    value={data.trackmania_io || ''}
                    onChange={handleChange}
                    placeholder="https://trackmania.io/..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="google_sheet">Google Sheet (URL)</label>
                <input
                    id="google_sheet"
                    name="google_sheet"
                    type="url"
                    value={data.google_sheet || ''}
                    onChange={handleChange}
                    placeholder="https://docs.google.com/spreadsheets/..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="e_circuit_mania">E-Circuit Mania (URL)</label>
                <input
                    id="e_circuit_mania"
                    name="e_circuit_mania"
                    type="url"
                    value={data.e_circuit_mania || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="rule_book">Rulebook (URL)</label>
                <input
                    id="rule_book"
                    name="rule_book"
                    type="url"
                    value={data.rule_book || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="website">Site web (URL)</label>
                <input
                    id="website"
                    name="website"
                    type="url"
                    value={data.website || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="tm_event">TM Event (URL)</label>
                <input
                    id="tm_event"
                    name="tm_event"
                    type="url"
                    value={data.tm_event || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                />
            </div>

            <div className="f-field">
                <label htmlFor="liquipedia">Liquipedia (URL)</label>
                <input
                    id="liquipedia"
                    name="liquipedia"
                    type="url"
                    value={data.liquipedia || ''}
                    onChange={handleChange}
                    placeholder="https://liquipedia.net/..."
                />
            </div>

            <div className="f-field">
                <label>Image</label>
                <ImageUploadField
                    id="image_url"
                    value={data.image_url}
                    placeholder="Cliquer pour téléverser une image"
                    onChange={onImageUpload}
                    uploading={uploading}
                />
            </div>
        </div>
    )
}
