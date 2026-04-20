import ImageUploadField from '../../common/ImageUploadField'
import ColorPickerField from '../../common/ColorPickerField'

export default function GameForm({ data, onChange, onImageUpload, uploading }) {
    const handleChange = (e) => {
        const { name, value } = e.target
        onChange({ ...data, [name]: value })
    }

    const handleImageUpload = (field) => (e) => {
        onImageUpload(e, field)
    }

    return (
        <div className="l-form-stack">
            <div className="l-form-grid">
                <div className="f-field">
                    <label htmlFor="name">Nom du jeu *</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={data.name || ''}
                        onChange={handleChange}
                        placeholder="Nom du jeu"
                    />
                </div>
                <div className="f-field">
                    <label htmlFor="link">Lien externe</label>
                    <input
                        id="link"
                        name="link"
                        type="text"
                        value={data.link || ''}
                        onChange={handleChange}
                        placeholder="https://..."
                    />
                </div>
            </div>

            <ColorPickerField
                id="color"
                label="Couleur"
                value={data.color || '#667eea'}
                onChange={(e) => onChange({ ...data, color: e.target.value })}
                disabled={uploading}
            />

            <div className="l-form-grid">
                <div className="f-field">
                    <label>Image principale</label>
                    <ImageUploadField
                        id="image_url"
                        value={data.image_url}
                        placeholder="Cliquer pour téléverser"
                        onChange={handleImageUpload('image_url')}
                        uploading={uploading}
                    />
                </div>
                <div className="f-field">
                    <label>Image survol</label>
                    <ImageUploadField
                        id="image_hover"
                        value={data.image_hover}
                        placeholder="Cliquer pour téléverser"
                        onChange={handleImageUpload('image_hover')}
                        uploading={uploading}
                    />
                </div>
            </div>
        </div>
    )
}
