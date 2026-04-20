import ImageUploadField from '../../common/ImageUploadField'

export default function SponsorForm({ data, onChange, onImageUpload, uploading }) {
    const handleChange = (e) => {
        const { name, value } = e.target
        onChange({ ...data, [name]: value })
    }

    return (
        <div className="l-form-stack">
            <div className="f-field">
                <label htmlFor="name">Nom du sponsor *</label>
                <input
                    id="name"
                    name="name"
                    type="text"
                    value={data.name || ''}
                    onChange={handleChange}
                    placeholder="Nom du sponsor"
                />
            </div>

            <div className="f-field">
                <label htmlFor="display_order">Ordre d'affichage</label>
                <input
                    id="display_order"
                    name="display_order"
                    type="number"
                    value={data.display_order || 0}
                    onChange={handleChange}
                    min="0"
                />
            </div>

            <div className="f-field">
                <label>Logo du sponsor *</label>
                <ImageUploadField
                    id="sponsor-image"
                    value={data.image_url}
                    placeholder="Cliquez pour ajouter le logo"
                    onChange={onImageUpload}
                    uploading={uploading}
                />
            </div>
        </div>
    )
}
