import { useEffect, useState, useContext } from 'react';
import { fetchScoreboard, resetScores } from '../../services/scores';
import { AuthContext } from '../../context/AuthContext';

// showAdminReset permet de contrôler si le bouton reset admin est affiché
export default function Scoreboard({ game, showAdminReset = true, order = 'desc' }) {
  const [scores, setScores] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const { user, token } = useContext(AuthContext);
  const [resetting, setResetting] = useState(false);
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    setLoading(true);
    fetchScoreboard(game, order)
      .then(setScores)
      .catch(setError)
      .finally(() => setLoading(false));
  }, [game, order, resetting]);

  const handleReset = async () => {
    setResetting(true);
    setConfirmReset(false);
    try {
      await resetScores(game, token);
      setScores([]);
    } catch (e) {
      setError(e.message);
    } finally {
      setResetting(false);
    }
  };

  if (loading) return <div>Chargement du classement...</div>;
  if (error) return <div>Erreur : {error.toString()}</div>;

  return (
    <div className="scoreboard-container">
      <h3>Classement {game}</h3>
      {showAdminReset && user && user.role === 'admin' && (
        confirmReset ? (
          <span style={{marginBottom:8, display:'inline-flex', gap:8}}>
            <span>Confirmer la remise à zéro ?</span>
            <button onClick={handleReset} disabled={resetting}>Oui</button>
            <button onClick={() => setConfirmReset(false)}>Annuler</button>
          </span>
        ) : (
          <button onClick={() => setConfirmReset(true)} disabled={resetting} style={{marginBottom:8}}>
            {resetting ? 'Reset en cours...' : 'Reset scores'}
          </button>
        )
      )}
      <table className="scoreboard-table">
        <thead>
          <tr>
            <th>Rang</th>
            <th>Joueur</th>
            <th>Score</th>
          </tr>
        </thead>
        <tbody>
          {scores.length === 0 && (
            <tr><td colSpan={3}>Aucun score pour ce jeu.</td></tr>
          )}
          {scores.map((row, i) => (
            <tr key={row.user_id}>
              <td>{i + 1}</td>
              <td>{row.username}</td>
              <td>{row.score}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
