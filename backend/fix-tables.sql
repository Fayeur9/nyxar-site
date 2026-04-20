-- Script pour corriger les tables avec des types incompatibles
-- Supprime et recrée les tables line_ups et line_up_players

SET FOREIGN_KEY_CHECKS = 0;
DROP TABLE IF EXISTS line_up_players;
DROP TABLE IF EXISTS line_ups;
SET FOREIGN_KEY_CHECKS = 1;
