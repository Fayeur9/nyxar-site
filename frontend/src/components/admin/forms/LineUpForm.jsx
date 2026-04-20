import ImageUploadField from '../../common/ImageUploadField'
import ColorPickerField from '../../common/ColorPickerField'

export default function LineUpForm({ data, onChange, onImageUpload, uploading, games = [] }) {
    const handleChange = (e) => {
        const { name, value } = e.target
        onChange({ ...data, [name]: value })
    }

    return (
        <div className="l-form-stack">
            <div className="l-form-grid l-form-grid--media">
                <div className="f-field">
                    <label htmlFor="name">Nom *</label>
                    <input
                        id="name"
                        name="name"
                        type="text"
                        value={data.name || ''}
                        onChange={handleChange}
                        placeholder="Ex: NYXAR Main"
                    />
                </div>
                <div className="f-field">
                    <label htmlFor="game_id">Jeu</label>
                    <select
                        id="game_id"
                        name="game_id"
                        value={data.game_id || ''}
                        onChange={handleChange}
                    >
                        <option value="">Aucun jeu</option>
                        {games.map((game) => (
                            <option key={game.id} value={game.id}>{game.name}</option>
                        ))}
                    </select>
                </div>
            </div>

            <ColorPickerField
                id="color"
                label="Couleur"
                value={data.color || '#667eea'}
                onChange={(e) => onChange({ ...data, color: e.target.value })}
                disabled={uploading}
            />

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
