import ImageUploadField from '../../common/ImageUploadField'

export default function CompetitionForm({ data, onChange, onImageUpload, uploading, games = [] }) {
    const handleChange = (e) => {
        const { name, value } = e.target
        onChange({ ...data, [name]: value })
    }

    return (
        <div className="l-form-stack">
            <div className="l-form-grid l-form-grid--media">
                <div className="f-field c-form-media">
                    <label>Image</label>
                    <ImageUploadField
                        id="competition-image"
                        value={data.image}
                        placeholder="Cliquez pour ajouter une image"
                        onChange={onImageUpload}
                        uploading={uploading}
                    />
                </div>

                <div className="l-form-stack--fields">
                    <div className="l-form-grid" style={{ gridTemplateColumns: '3fr 1fr' }}>
                        <div className="f-field">
                            <label htmlFor="title">Titre *</label>
                            <input
                                type="text"
                                id="title"
                                name="title"
                                value={data.title || ''}
                                onChange={handleChange}
                                placeholder="ex: NYXAR Tower"
                            />
                        </div>
                        <div className="f-field">
                            <label htmlFor="game">Jeu *</label>
                            <select
                                id="game"
                                name="game"
                                value={data.game || ''}
                                onChange={handleChange}
                            >
                                <option value="">Jeu</option>
                                {games.map(game => (
                                    <option key={game.id} value={game.name}>
                                        {game.name}
                                    </option>
                                ))}
                            </select>
                        </div>
                    </div>
                    <div className="l-form-grid" style={{ gridTemplateColumns: '3fr 1fr' }}>
                        <div className="f-field">
                            <label htmlFor="date">Date</label>
                            <input
                                type="text"
                                id="date"
                                name="date"
                                value={data.date || ''}
                                onChange={handleChange}
                                placeholder="ex: Avril 2026"
                            />
                        </div>
                        <div className="f-field">
                            <label htmlFor="prize">Prix</label>
                            <input
                                type="text"
                                id="prize"
                                name="prize"
                                value={data.prize || ''}
                                onChange={handleChange}
                                placeholder="ex: 500€"
                            />
                        </div>
                    </div>
                    <div className="f-field">
                        <label htmlFor="format">Format</label>
                        <input
                            type="text"
                            id="format"
                            name="format"
                            value={data.format || ''}
                            onChange={handleChange}
                            placeholder="ex: Solo endurance"
                        />
                    </div>
                </div>
            </div>

            <div className="f-field">
                <label htmlFor="description">Description</label>
                <textarea
                    id="description"
                    name="description"
                    value={data.description || ''}
                    onChange={handleChange}
                    rows="4"
                    placeholder="Description détaillée de la compétition"
                />
            </div>

            <div className="l-form-grid">
                <div className="f-field">
                    <label htmlFor="discord_link">Lien Discord</label>
                    <input
                        type="url"
                        id="discord_link"
                        name="discord_link"
                        value={data.discord_link || ''}
                        onChange={handleChange}
                        placeholder="https://discord.gg/..."
                    />
                </div>
                <div className="f-field">
                    <label htmlFor="rule_book">Lien Règlement (Google Doc)</label>
                    <input
                        type="url"
                        id="rule_book"
                        name="rule_book"
                        value={data.rule_book || ''}
                        onChange={handleChange}
                        placeholder="https://docs.google.com/..."
                    />
                </div>
            </div>
        </div>
    )
}
