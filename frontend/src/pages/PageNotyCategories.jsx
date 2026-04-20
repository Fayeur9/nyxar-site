import { useContext, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { NotyCampaignContext } from '../context/NotyCampaignContext'
import VotingCategories from '../components/noty/VotingCategories/VotingCategories'
import '../styles/pages/NotyPage.css'

export default function PageNotyCategories() {
    const { currentActiveCampaign, hasActiveCampaign, hasPastCampaigns } = useContext(NotyCampaignContext)

    useEffect(() => {
        document.title = `${currentActiveCampaign?.title || 'NOTY'} — Catégories | Nyxar`
    }, [currentActiveCampaign?.title])

    if (!currentActiveCampaign && !hasActiveCampaign) {
        return (
            <div className="page-container">
                <div className="noty-header">
                    <Link to="/noty" className="noty-vote-back">&larr; Retour</Link>
                    <h1 className="page-title">Nyxar Of The Year</h1>
                </div>
                <div className="noty-content">
                    <p>Aucune campagne en cours.</p>
                    {hasPastCampaigns && (
                        <Link to="/noty/hall-of-fame" className="btn btn-primary">
                            Voir le Hall of Fame
                        </Link>
                    )}
                </div>
            </div>
        )
    }

    return (
        <div className="page-container">
            <div className="noty-header">
                <Link to="/noty" className="noty-vote-back">&larr; Retour</Link>
                <h1 className="page-title">{currentActiveCampaign?.title || 'Nyxar Of The Year'}</h1>
            </div>

            <div className="noty-content">
                <VotingCategories />
            </div>
        </div>
    )
}
