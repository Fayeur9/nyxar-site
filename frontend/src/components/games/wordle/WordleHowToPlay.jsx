export default function WordleHowToPlay({ onClose }) {
    return (
        <div className="modal-overlay" onClick={onClose}>
            <div className="modal-content modal-content--md wordle-help-modal" onClick={e => e.stopPropagation()}>
                <div className="modal-header">
                    <h2>Comment jouer</h2>
                    <button className="modal-close" onClick={onClose} aria-label="Fermer">×</button>
                </div>
                <div className="modal-body">
                    <p>Devinez le <strong>mot du jour</strong> en <strong>6 tentatives</strong>.</p>
                    <p>Chaque tentative doit être un mot valide. Après chaque essai, les cases changent de couleur :</p>

                    <div className="wordle-help-examples">
                        <div className="wordle-help-example">
                            <div className="wordle-help-tiles">
                                <div className="wordle-tile wordle-tile--filled wordle-tile--correct">C</div>
                                <div className="wordle-tile wordle-tile--filled">H</div>
                                <div className="wordle-tile wordle-tile--filled">A</div>
                                <div className="wordle-tile wordle-tile--filled">T</div>
                                <div className="wordle-tile wordle-tile--filled">S</div>
                            </div>
                            <p><strong>C</strong> est dans le mot, à la bonne position.</p>
                        </div>

                        <div className="wordle-help-example">
                            <div className="wordle-help-tiles">
                                <div className="wordle-tile wordle-tile--filled">P</div>
                                <div className="wordle-tile wordle-tile--filled wordle-tile--present">I</div>
                                <div className="wordle-tile wordle-tile--filled">A</div>
                                <div className="wordle-tile wordle-tile--filled">N</div>
                                <div className="wordle-tile wordle-tile--filled">O</div>
                            </div>
                            <p><strong>I</strong> est dans le mot, mais pas à cette position.</p>
                        </div>

                        <div className="wordle-help-example">
                            <div className="wordle-help-tiles">
                                <div className="wordle-tile wordle-tile--filled">T</div>
                                <div className="wordle-tile wordle-tile--filled">R</div>
                                <div className="wordle-tile wordle-tile--filled">U</div>
                                <div className="wordle-tile wordle-tile--filled wordle-tile--absent">C</div>
                                <div className="wordle-tile wordle-tile--filled">K</div>
                            </div>
                            <p><strong>C</strong> n'est pas dans le mot.</p>
                        </div>
                    </div>

                    <ul className="wordle-help-rules">
                        <li>Un seul mot par jour — revenez demain !</li>
                        <li>Le mot peut faire de 5 à 8 lettres.</li>
                        <li>Sans accents : tapez <strong>E</strong> pour <em>é</em>, <em>è</em>, <em>ê</em>…</li>
                    </ul>
                </div>
            </div>
        </div>
    )
}
