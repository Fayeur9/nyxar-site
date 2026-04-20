-- Script pour réinitialiser la base de données en développement
-- ATTENTION : Ce script supprime TOUTES les données !

SET FOREIGN_KEY_CHECKS = 0;

DROP TABLE IF EXISTS line_up_players;
DROP TABLE IF EXISTS players;
DROP TABLE IF EXISTS line_ups;
DROP TABLE IF EXISTS voting_categories;
DROP TABLE IF EXISTS games;
DROP TABLE IF EXISTS users;

SET FOREIGN_KEY_CHECKS = 1;
