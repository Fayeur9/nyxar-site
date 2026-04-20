-- Script pour corriger la table line_up_players
-- Supprime et recrée la table avec les bonnes contraintes

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS line_up_players;
SET FOREIGN_KEY_CHECKS = 1;
