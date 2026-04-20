import ImageUploadField from '../../common/ImageUploadField'

export default function HeroBannerForm({ data, onChange, onImageUpload, uploading }) {
    const handleChange = (e) => {
        const { name, value, type, checked } = e.target
        onChange({ ...data, [name]: type === 'checkbox' ? checked : value })
    }

    return (
        <div className="l-form-stack">
            <div className="f-field c-form-media">
                <label>Image du banner *</label>
                <ImageUploadField
                    id="banner-image"
                    value={data.image_url}
                    placeholder="Cliquez pour ajouter l'image"
                    onChange={onImageUpload}
                    uploading={uploading}
                    aspectRatio="16/9"
                    maxHeight="200px"
                />
            </div>

            <div className="f-field">
                <label htmlFor="title">Titre (optionnel)</label>
                <input
                    type="text"
                    id="title"
                    name="title"
                    value={data.title || ''}
                    onChange={handleChange}
                    placeholder="Titre du banner"
                />
            </div>

            <div className="f-field">
                <label htmlFor="display_order">Ordre d'affichage</label>
                <input
                    type="number"
                    id="display_order"
                    name="display_order"
                    value={data.display_order || 0}
                    onChange={handleChange}
                    min="0"
                />
            </div>

            <div className="f-field" style={{
                display: 'flex',
                alignItems: 'center',
                gap: 'var(--spacing-sm)'
            }}>
                <input
                    type="checkbox"
                    id="is_active"
                    name="is_active"
                    checked={data.is_active || false}
                    onChange={handleChange}
                    style={{ width: 'auto' }}
                />
                <label htmlFor="is_active" style={{ margin: 0 }}>Actif</label>
            </div>
        </div>
    )
}
