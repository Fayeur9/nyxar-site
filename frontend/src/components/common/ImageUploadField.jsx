export default function ImageUploadField({
    id,
    value,
    placeholder = "Cliquez pour ajouter l'image",
    onChange,
    disabled = false,
    uploading = false,
    aspectRatio,
    maxHeight,
    style = {}
}) {
    const combinedStyle = {
        ...style,
        ...(aspectRatio && { aspectRatio }),
        ...(maxHeight && { maxHeight })
    }

    return (
        <>
            <label
                htmlFor={id}
                className="c-form-image-upload"
                style={Object.keys(combinedStyle).length > 0 ? combinedStyle : undefined}
            >
                {value && !uploading ? (
                    <img
                        src={value}
                        alt="Apercu"
                        className="c-form-image-upload__preview"
                        style={{ objectFit: 'cover' }}
                    />
                ) : uploading ? (
                    <span className="c-form-uploading">Telechargement...</span>
                ) : (
                    <div className="c-form-image-placeholder">
                        <span className="c-form-image-placeholder__text">{placeholder}</span>
                    </div>
                )}
            </label>
            <input
                id={id}
                type="file"
                accept="image/*"
                onChange={onChange}
                disabled={disabled || uploading}
                style={{ display: 'none' }}
            />
        </>
    )
}
