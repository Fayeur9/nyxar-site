import ImageUploadField from '../../common/ImageUploadField'

export default function SkinForm({ data, onChange, onImageUpload, uploading }) {
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
                    <label htmlFor="name">Nom du skin *</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={data.name || ''}
                        onChange={handleChange}
                        placeholder="Nom du skin"
                    />
                </div>
                <div className="f-field">
                    <label htmlFor="skin_maker">Auteur</label>
                    <input
                        id="skin_maker"
                        name="skin_maker"
                        type="text"
                        value={data.skin_maker || ''}
                        onChange={handleChange}
                        placeholder="Auteur"
                    />
                </div>
            </div>

            <div className="f-field">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    name="description"
                    value={data.description || ''}
                    onChange={handleChange}
                    placeholder="Description du skin"
                    rows={3}
                />
            </div>

            <div className="f-field">
                <label htmlFor="download_url">URL de téléchargement</label>
                <input
                    id="download_url"
                    name="download_url"
                    type="text"
                    value={data.download_url || ''}
                    onChange={handleChange}
                    placeholder="https://..."
                />
            </div>

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
                        id="image_url_hover"
                        value={data.image_url_hover}
                        placeholder="Cliquer pour téléverser"
                        onChange={handleImageUpload('image_url_hover')}
                        uploading={uploading}
                    />
                </div>
            </div>
        </div>
    )
}
